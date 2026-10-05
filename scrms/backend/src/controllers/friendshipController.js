const Friendship = require('../models/Friendship');
const User = require('../models/User');
const socketHandler = require('../socket/socketHandler');
const { sendPushToUser } = require('../utils/pushService');
const { createNotification } = require('../services/notificationService');

// 1. Search Users
exports.searchUsers = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (!q) {
      return res.status(200).json([]);
    }

    const regex = new RegExp(q, 'i');
    const users = await User.find({
      $or: [
        { name: regex },
        { collegeId: regex },
        { registerNumber: regex }
      ],
      role: { $in: ['Student', 'Faculty'] },
      _id: { $ne: req.user._id }
    }).limit(20);

    const formattedUsers = users.map((user) => ({
      _id: user._id,
      name: user.name,
      registerNumber: user.collegeId || user.registerNumber,
      role: user.role
    }));

    return res.status(200).json(formattedUsers);
  } catch (error) {
    return next(error);
  }
};

// 2. Send Friend Request
exports.sendRequest = async (req, res, next) => {
  console.log('[sendRequest] reached — body:', JSON.stringify(req.body));

  const { recipientId } = req.body;
  if (!recipientId) {
    return res.status(400).json({ success: false, message: 'recipientId is required.' });
  }

  // Step A — find recipient
  let recipient;
  try {
    recipient = await User.findById(recipientId);
    console.log('[sendRequest] A: recipient =', recipient ? recipient._id.toString() : 'null');
  } catch (e) {
    console.error('[sendRequest] A FAIL:', e.name, e.message);
    return res.status(500).json({ success: false, step: 'findRecipient', message: e.message, name: e.name });
  }

  if (!recipient) {
    return res.status(404).json({ success: false, message: 'Recipient user not found.' });
  }

  if (!['Student', 'Faculty'].includes(recipient.role)) {
    return res.status(403).json({ success: false, message: 'Recipient must be a Student or Faculty.' });
  }

  // Step B — check existing
  let existingFriendship;
  try {
    existingFriendship = await Friendship.findOne({
      $or: [
        { requester: req.user._id, recipient: recipient._id },
        { requester: recipient._id, recipient: req.user._id }
      ]
    });
    console.log('[sendRequest] B: existing =', existingFriendship ? existingFriendship._id.toString() : 'none');
  } catch (e) {
    console.error('[sendRequest] B FAIL:', e.name, e.message);
    return res.status(500).json({ success: false, step: 'findExisting', message: e.message, name: e.name });
  }

  let friendship;
  if (existingFriendship) {
    if (existingFriendship.status === 'accepted' || existingFriendship.status === 'pending') {
      return res.status(400).json({ success: false, message: 'Friend request already exists.' });
    }

    // Reset declined request to pending (keep original requester/recipient — don't swap direction)
    try {
      existingFriendship.status = 'pending';
      await existingFriendship.save();
      friendship = existingFriendship;
      console.log('[sendRequest] C: reset declined request =', friendship._id.toString());
    } catch (e) {
      console.error('[sendRequest] C Update FAIL:', e.name, e.code, e.message);
      return res.status(500).json({ success: false, step: 'update', message: e.message, name: e.name, code: e.code });
    }
  } else {
    // Step C — create
    try {
      friendship = await Friendship.create({
        requester: req.user._id,
        recipient: recipient._id,
        status: 'pending'
      });
      console.log('[sendRequest] C: created =', friendship._id.toString());
    } catch (e) {
      console.error('[sendRequest] C FAIL:', e.name, e.code, e.message);
      if ((e.name === 'MongoServerError' || e.name === 'MongoError') && e.code === 11000) {
        return res.status(400).json({ success: false, message: 'Friend request already exists.' });
      }
      return res.status(500).json({ success: false, step: 'create', message: e.message, name: e.name, code: e.code });
    }
  }

  // Push (fire and forget)
  sendPushToUser(recipient._id.toString(), {
    title: 'New Friend Request',
    body: `${req.user.name} sent you a friend request.`,
    url: '/friends/pending',
    trigger: 'friendRequestReceived'
  }).catch(() => {});

  // Create database notification
  try {
    await createNotification({
      recipientId: recipient._id,
      recipientType: 'User',
      relatedEntity: friendship._id,
      title: 'New Friend Request',
      message: `${req.user.name} sent you a friend request.`,
      type: 'friend_request',
      urgency: 'Normal'
    });
  } catch (notifErr) {
    console.error('Failed to create friend request notification:', notifErr);
  }

  // Socket
  try {
    const io = socketHandler.getIO();
    io.to(recipient._id.toString()).emit('friendRequest', {
      friendshipId: friendship._id.toString(),
      requester: {
        _id: req.user._id.toString(),
        name: req.user.name,
        role: req.user.role
      }
    });
    console.log('[sendRequest] D: socket emitted');
  } catch (_) {
    console.log('[sendRequest] D: socket not available');
  }

  return res.status(201).json(friendship);
};

// 3. Respond to Request
exports.respondToRequest = async (req, res, next) => {
  try {
    const { friendshipId, action } = req.body;
    if (!friendshipId || !action) {
      return res.status(400).json({ success: false, message: 'friendshipId and action are required.' });
    }

    if (!['accepted', 'declined'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be accepted or declined.' });
    }

    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Friendship request not found.' });
    }

    if (friendship.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Friend request has already been resolved.' });
    }

    friendship.status = action;
    friendship.updatedAt = Date.now();
    await friendship.save();

    if (action === 'accepted') {
      sendPushToUser(friendship.requester.toString(), {
        title: 'Friend Request Accepted',
        body: `${req.user.name} accepted your friend request.`,
        url: '/friends',
        trigger: 'friendRequestAccepted'
      }).catch(() => {});

      // Create database notification
      try {
        await createNotification({
          recipientId: friendship.requester,
          recipientType: 'User',
          relatedEntity: friendship._id,
          title: 'Friend Request Accepted',
          message: `${req.user.name} accepted your friend request.`,
          type: 'friend_accepted',
          urgency: 'Normal'
        });
      } catch (notifErr) {
        console.error('Failed to create friend acceptance notification:', notifErr);
      }
    }

    return res.status(200).json(friendship);
  } catch (error) {
    return next(error);
  }
};

// 4. Get Friends
exports.getFriends = async (req, res, next) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { requester: req.user._id },
        { recipient: req.user._id }
      ],
      status: 'accepted'
    })
    .populate('requester', 'name role _id')
    .populate('recipient', 'name role _id');

    const friends = friendships
      .map((f) => {
        if (!f.requester || !f.recipient) {
          return null;
        }
        const isRequesterCurrentUser = f.requester._id.toString() === req.user._id.toString();
        const friend = isRequesterCurrentUser ? f.recipient : f.requester;
        return {
          friendshipId: f._id,
          _id: friend._id,
          name: friend.name,
          role: friend.role
        };
      })
      .filter(Boolean);

    return res.status(200).json(friends);
  } catch (error) {
    return next(error);
  }
};

// 5. Get Pending Requests
exports.getPendingRequests = async (req, res, next) => {
  try {
    const requests = await Friendship.find({
      recipient: req.user._id,
      status: 'pending'
    }).populate('requester', 'name role _id');

    return res.status(200).json(requests);
  } catch (error) {
    return next(error);
  }
};

// 6. Remove Friend
exports.removeFriend = async (req, res, next) => {
  try {
    const { friendshipId } = req.params;
    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Friendship not found.' });
    }

    const userIdStr = req.user._id.toString();
    const requesterId = friendship.requester.toString();
    const recipientId = friendship.recipient.toString();

    if (requesterId !== userIdStr && recipientId !== userIdStr) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await Friendship.findByIdAndDelete(friendshipId);

    try {
      const io = socketHandler.getIO();
      io.to(requesterId).emit('friendRemoved', { friendId: recipientId });
      io.to(`user:${requesterId}`).emit('friendRemoved', { friendId: recipientId });
      io.to(recipientId).emit('friendRemoved', { friendId: requesterId });
      io.to(`user:${recipientId}`).emit('friendRemoved', { friendId: requesterId });
    } catch (_) {}

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};
