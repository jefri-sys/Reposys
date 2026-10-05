const mongoose = require('mongoose');
const Group = require('../models/Group');
const Message = require('../models/Message');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const socketHandler = require('../socket/socketHandler');
const { sendPushToUser } = require('../utils/pushService');
const { createNotification } = require('../services/notificationService');

exports.createGroup = async (req, res, next) => {
  try {
    const { name, memberIds } = req.body;
    
    if (!name || typeof name !== 'string' || name.length > 60) {
      return res.status(400).json({ success: false, message: 'Invalid group name. Max 60 characters.' });
    }
    
    if (!Array.isArray(memberIds) || memberIds.length < 2) {
      return res.status(400).json({ success: false, message: 'Group must have at least 2 members (excluding creator).' });
    }
    
    const uniqueMemberIds = [...new Set(memberIds)];
    if (uniqueMemberIds.length !== memberIds.length) {
      return res.status(400).json({ success: false, message: 'Duplicate user IDs provided.' });
    }
    
    const invalidFriends = [];
    for (const memberId of uniqueMemberIds) {
      try {
        const requesterId = new mongoose.Types.ObjectId(req.user._id);
        const recipientId = new mongoose.Types.ObjectId(memberId);
        
        const friendship = await Friendship.findOne({
          $or: [
            { requester: requesterId, recipient: recipientId },
            { requester: recipientId, recipient: requesterId }
          ],
          status: 'accepted'
        });
        if (!friendship) {
          invalidFriends.push(memberId);
        }
      } catch (castErr) {
        invalidFriends.push(memberId);
      }
    }
    
    if (invalidFriends.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'All members must be accepted friends.',
        invalidFriends 
      });
    }
    
    const members = [...uniqueMemberIds.map(id => new mongoose.Types.ObjectId(id)), new mongoose.Types.ObjectId(req.user._id)];
    
    const newGroup = await Group.create({
      name,
      createdBy: new mongoose.Types.ObjectId(req.user._id),
      members
    });
    
    const populatedGroup = await Group.findById(newGroup._id)
      .populate('members', 'name role')
      .populate('createdBy', 'name');
      
    // Send push notifications
    for (const memberId of uniqueMemberIds) {
      sendPushToUser(memberId.toString(), {
        title: 'Added to Group',
        body: `${req.user.name} added you to the group "${name}".`,
        url: '/chat',
        data: { url: '/chat' },
        trigger: 'addedToGroup'
      }).catch(() => {});
    }
    
    return res.status(201).json(populatedGroup);
  } catch (error) {
    return next(error);
  }
};

exports.getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ 
      members: req.user._id,
      deletedByUsers: { $ne: req.user._id }
    })
      .populate('createdBy', 'name')
      .populate('members', 'name role');
      
    const groupsWithLastMessage = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await Message.findOne({ groupId: group._id })
          .sort({ timestamp: -1 })
          .populate('senderId', 'name role');
          
        return {
          ...group.toObject(),
          lastMessage: lastMessage || null
        };
      })
    );
    
    groupsWithLastMessage.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
      
    return res.status(200).json(groupsWithLastMessage);
  } catch (error) {
    return next(error);
  }
};

exports.getGroupMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }
    
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    
    const messages = await Message.find({ groupId })
      .populate('senderId', 'name role')
      .sort({ timestamp: 1 });
      
    return res.status(200).json(messages);
  } catch (error) {
    return next(error);
  }
};

exports.sendGroupMessage = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { content, mediaUrl, mediaType } = req.body;
    
    if (!content && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Message content or media is required.' });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }
    
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (group.isDisbanded) {
      return res.status(400).json({ success: false, message: 'This group has been disbanded/deleted by the creator.' });
    }
    
    const message = await Message.create({
      senderId: req.user._id,
      groupId,
      recipientId: null,
      content,
      mediaUrl,
      mediaType: mediaType || 'none'
    });
    
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name role');
      
    try {
      const io = socketHandler.getIO();
      io.to(`group_${groupId}`).emit('newGroupMessage', populatedMessage);
    } catch (_) {}
    
    for (const memberId of group.members) {
      if (memberId.toString() !== req.user._id.toString()) {
        sendPushToUser(memberId.toString(), {
          title: `New message in ${group.name}`,
          body: `${req.user.name}: ${content || 'Attachment'}`,
          url: '/chat',
          data: { url: '/chat' },
          trigger: 'newGroupMessage'
        }).catch(() => {});
      }
    }
    
    return res.status(201).json(populatedMessage);
  } catch (error) {
    return next(error);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }
    
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only creator can add members.' });
    }
    
    if (group.members.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User is already a member.' });
    }
    
    const friendship = await Friendship.findOne({
      $or: [
        { requester: req.user._id, recipient: userId },
        { requester: userId, recipient: req.user._id }
      ],
      status: 'accepted'
    });
    
    if (!friendship) {
      return res.status(400).json({ success: false, message: 'User is not an accepted friend.' });
    }
    
    group.members.push(userId);
    await group.save();
    
    const updatedGroup = await Group.findById(groupId)
      .populate('members', 'name role')
      .populate('createdBy', 'name');
      
    const addedUser = await User.findById(userId).select('name role');
      
    // Create system message
    const systemMsg = await Message.create({
      senderId: req.user._id,
      groupId,
      recipientId: null,
      content: `${addedUser ? addedUser.name : 'A member'} was added by ${req.user.name}`,
      mediaType: 'none',
      isSystem: true
    });

    const populatedMsg = await Message.findById(systemMsg._id)
      .populate('senderId', 'name role');

    try {
      const io = socketHandler.getIO();
      io.to(`group_${groupId}`).emit('newGroupMessage', populatedMsg);
      io.to(`group_${groupId}`).emit('groupMemberAdded', {
        _id: addedUser._id,
        name: addedUser.name,
        role: addedUser.role
      });
    } catch (_) {}
    
    sendPushToUser(userId.toString(), {
      title: 'Added to Group',
      body: `${req.user.name} added you to the group "${group.name}".`,
      url: '/chat',
      data: { url: '/chat' },
      trigger: 'addedToGroup'
    }).catch(() => {});
    
    return res.status(200).json(updatedGroup);
  } catch (error) {
    return next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }
    
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only creator can remove members.' });
    }
    
    if (userId.toString() === group.createdBy.toString()) {
      return res.status(400).json({ success: false, message: 'Creator cannot remove themselves — use leave group instead' });
    }
    
    if (!group.members.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User is not a member.' });
    }
    
    const removedUser = await User.findById(userId);
    group.members.pull(userId);
    await group.save();
    
    const updatedGroup = await Group.findById(groupId)
      .populate('members', 'name role')
      .populate('createdBy', 'name');
      
    // Create system message
    const systemMsg = await Message.create({
      senderId: req.user._id,
      groupId,
      recipientId: null,
      content: `${removedUser ? removedUser.name : 'A member'} was removed by ${req.user.name}`,
      mediaType: 'none',
      isSystem: true
    });

    const populatedMsg = await Message.findById(systemMsg._id)
      .populate('senderId', 'name role');

    try {
      const io = socketHandler.getIO();
      io.to(`group_${groupId}`).emit('newGroupMessage', populatedMsg);
      io.to(`group_${groupId}`).emit('groupMemberRemoved', { removedUserId: userId });
    } catch (_) {}
    
    sendPushToUser(userId.toString(), {
      title: 'Removed from Group',
      body: `You were removed from the group "${group.name}".`,
      url: '/chat',
      data: { url: '/chat' },
      trigger: 'removedFromGroup'
    }).catch(() => {});
    
    return res.status(200).json(updatedGroup);
  } catch (error) {
    return next(error);
  }
};

exports.leaveGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }
    
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    
    const isCreator = group.createdBy.toString() === req.user._id.toString();
    
    if (isCreator) {
      const otherMembers = group.members.filter(id => id.toString() !== req.user._id.toString());
      if (otherMembers.length > 0) {
        group.createdBy = otherMembers[0];
        group.members.pull(req.user._id);
        await group.save();
      } else {
        await Group.findByIdAndDelete(groupId);
        return res.status(200).json({ success: true, groupDeleted: true });
      }
    } else {
      group.members.pull(req.user._id);
      await group.save();
    }
    
    // Create system message
    const systemMsg = await Message.create({
      senderId: req.user._id,
      groupId,
      recipientId: null,
      content: `${req.user.name} left`,
      mediaType: 'none',
      isSystem: true
    });

    const populatedMsg = await Message.findById(systemMsg._id)
      .populate('senderId', 'name role');

    try {
      const io = socketHandler.getIO();
      io.to(`group_${groupId}`).emit('newGroupMessage', populatedMsg);
      io.to(`group_${groupId}`).emit('groupMemberLeft', { leftUserId: req.user._id });
    } catch (_) {}
    
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

exports.disbandGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the creator can disband/delete the group.' });
    }

    group.isDisbanded = true;
    await group.save();

    // Create system message
    const systemMsg = await Message.create({
      senderId: req.user._id,
      groupId,
      recipientId: null,
      content: `${req.user.name} deleted/disbanded this group.`,
      mediaType: 'none',
      isSystem: true
    });

    const populatedMsg = await Message.findById(systemMsg._id)
      .populate('senderId', 'name role');

    try {
      const io = socketHandler.getIO();
      io.to(`group_${groupId}`).emit('newGroupMessage', populatedMsg);
      io.to(`group_${groupId}`).emit('groupDisbanded', { groupId });
    } catch (_) {}

    return res.status(200).json({ success: true, message: 'Group disbanded successfully. Chat history is preserved.' });
  } catch (error) {
    return next(error);
  }
};

exports.deleteGroupChat = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    // Pull from members
    group.members.pull(req.user._id);

    // Add to deletedByUsers
    if (!group.deletedByUsers.includes(req.user._id)) {
      group.deletedByUsers.push(req.user._id);
    }

    await group.save();

    // Notify other members
    try {
      const io = socketHandler.getIO();
      io.to(`group_${groupId}`).emit('groupMemberLeft', { leftUserId: req.user._id });
    } catch (_) {}

    // Clean up if no members left
    const allMembersDeleted = group.members.length === 0 || group.members.every(m => group.deletedByUsers.includes(m));
    if (allMembersDeleted) {
      await Group.findByIdAndDelete(groupId);
      await Message.deleteMany({ groupId });
    }

    return res.status(200).json({ success: true, message: 'Group and chats deleted successfully for you.' });
  } catch (error) {
    return next(error);
  }
};

exports.sendGroupVoiceMessage = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { audioDuration } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required.' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (group.isDisbanded) {
      return res.status(400).json({ success: false, message: 'This group has been disbanded/deleted by the creator.' });
    }

    const message = await Message.create({
      senderId: req.user._id,
      groupId,
      recipientId: null,
      type: 'voice',
      audioUrl: req.file.path || req.file.secure_url,
      audioDuration: Number(audioDuration) || 0
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name role');

    try {
      const io = socketHandler.getIO();
      io.to(`group_${groupId}`).emit('newGroupMessage', populatedMessage);
    } catch (_) {}

    for (const memberId of group.members) {
      if (memberId.toString() !== req.user._id.toString()) {
        sendPushToUser(memberId.toString(), {
          title: `New voice message in ${group.name}`,
          body: `${req.user.name} sent a voice note`,
          url: '/chat',
          data: { url: '/chat' },
          trigger: 'newGroupMessage'
        }).catch(() => {});
      }
    }

    return res.status(201).json(populatedMessage);
  } catch (error) {
    return next(error);
  }
};
