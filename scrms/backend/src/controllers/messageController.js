const Message = require('../models/Message');
const Friendship = require('../models/Friendship');
const socketHandler = require('../socket/socketHandler');
const pushService = require('../utils/pushService');

exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content, mediaUrl, mediaType } = req.body;

    if (!content && !mediaUrl) {
      return res.status(400).json({ message: 'Content or media is required' });
    }

    const friendship = await Friendship.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId, status: 'accepted' },
        { requester: recipientId, recipient: req.user._id, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(403).json({ message: 'You can only message friends' });
    }

    let message = new Message({
      senderId: req.user._id,
      recipientId,
      groupId: null,
      content: content || '',
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || 'none'
    });

    await message.save();
    message = await message.populate('senderId recipientId', 'name role');

    try {
      const io = socketHandler.getIO();
      // Emitting to the exact string format as in socketHandler.js: decoded.role Student -> `user:${id}`
      io.to(`user:${recipientId}`).emit('newMessage', message);
      io.to(`user:${req.user._id}`).emit('newMessage', message);
    } catch (ioErr) {
      console.warn('Socket.io error or not initialized:', ioErr.message);
    }

    const preview = content ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : 'Sent an attachment';
    await pushService.sendPushToUser(recipientId, {
      title: `New message from ${req.user.name}`,
      body: preview,
      url: `/chat/${req.user._id}`,
      data: { type: 'newChatMessage' }
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const friendId = req.params.friendId;
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: userId, recipientId: friendId },
        { senderId: friendId, recipientId: userId }
      ],
      groupId: null
    }).sort({ timestamp: 1 }).populate('senderId', 'name role');

    await Message.updateMany(
      { recipientId: userId, senderId: friendId, read: false },
      { $set: { read: true } }
    );

    try {
      const io = socketHandler.getIO();
      io.to(`user:${friendId}`).emit('messagesRead', { readBy: userId });
    } catch (ioErr) {
      console.warn('Socket.io error or not initialized:', ioErr.message);
    }

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getConversationList = async (req, res) => {
  try {
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { recipientId: userId }],
      groupId: null
    }).sort({ timestamp: -1 }).populate('senderId recipientId', 'name role');

    const conversationsMap = new Map();

    messages.forEach(msg => {
      const isSender = msg.senderId._id.toString() === userId.toString();
      const partner = isSender ? msg.recipientId : msg.senderId;

      if (!partner) return;

      const partnerId = partner._id.toString();

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          partner,
          mostRecentMessage: msg,
          unreadCount: 0
        });
      }

      if (!isSender && !msg.read) {
        conversationsMap.get(partnerId).unreadCount += 1;
      }
    });

    res.json(Array.from(conversationsMap.values()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const friendId = req.params.friendId;
    const userId = req.user._id;

    const result = await Message.updateMany(
      { recipientId: userId, senderId: friendId, read: false },
      { $set: { read: true } }
    );

    try {
      const io = socketHandler.getIO();
      io.to(`user:${friendId}`).emit('messagesRead', { readBy: userId });
    } catch (ioErr) {
      console.warn('Socket.io error or not initialized:', ioErr.message);
    }

    res.json({ success: true, markedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await Message.countDocuments({
      recipientId: userId,
      read: false,
      groupId: null
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendVoiceMessage = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const { audioDuration } = req.body;
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required' });
    }

    const friendship = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: receiverId, status: 'accepted' },
        { requester: receiverId, recipient: userId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(403).json({ message: 'You can only message friends' });
    }

    let message = new Message({
      senderId: userId,
      recipientId: receiverId,
      groupId: null,
      type: 'voice',
      audioUrl: req.file.path,
      audioDuration: parseFloat(audioDuration) || 0
    });

    await message.save();
    message = await message.populate('senderId recipientId', 'name role');

    try {
      const io = socketHandler.getIO();
      io.to(`user:${receiverId}`).emit('newMessage', message);
      io.to(`user:${userId}`).emit('newMessage', message);
    } catch (ioErr) {
      console.warn('Socket.io error or not initialized:', ioErr.message);
    }

    await pushService.sendPushToUser(receiverId, {
      title: `Voice message from ${req.user.name}`,
      body: 'Sent a voice message',
      url: `/chat/${req.user._id}`,
      data: { type: 'newChatMessage' }
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this message' });
    }

    message.isDeleted = true;
    message.content = '';
    message.mediaUrl = null;
    message.audioUrl = null;
    message.splitCardData = null;
    await message.save();

    try {
      const io = socketHandler.getIO();
      if (message.groupId) {
        io.to(`group_${message.groupId}`).emit('messageDeleted', { messageId, groupId: message.groupId });
      } else {
        io.to(`user:${message.recipientId}`).emit('messageDeleted', { messageId });
        io.to(`user:${message.senderId}`).emit('messageDeleted', { messageId });
      }
    } catch (ioErr) {
      console.warn('Socket.io error or not initialized:', ioErr.message);
    }

    res.json({ success: true, messageId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
