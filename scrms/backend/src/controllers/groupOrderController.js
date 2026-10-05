const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const GroupOrder = require('../models/GroupOrder');
const SplitRequest = require('../models/SplitRequest');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const socketHandler = require('../socket/socketHandler');
const { sendPushToUser } = require('../utils/pushService');
const { createNotification } = require('../services/notificationService');

// Helper to check if a friendship exists and is accepted
const checkFriendship = async (userA, userB) => {
  const friendship = await Friendship.findOne({
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA }
    ],
    status: 'accepted'
  });
  return !!friendship;
};

// Helper to enrich group order with splitRequestIds
const getEnrichedSplitCardPayload = async (groupOrderId, groupChatId) => {
  const populatedOrder = await GroupOrder.findById(groupOrderId)
    .populate('participants.userId', 'name role');

  if (!populatedOrder) return null;

  const splitRequests = await SplitRequest.find({ groupOrderId: populatedOrder._id });
  const enrichedParticipants = populatedOrder.participants.map(p => {
    const sr = splitRequests.find(
      r => r.to.toString() === p.userId?._id?.toString() ||
           r.to.toString() === p.userId?.toString()
    );
    return {
      ...p.toObject(),
      splitRequestId: sr ? sr._id : null
    };
  });

  const orderObj = populatedOrder.toObject();
  if (orderObj.orderId) {
    const GroupOrderWithOrder = await GroupOrder.findById(groupOrderId).populate({
      path: 'orderId',
      populate: {
        path: 'documentIds',
        select: 'originalFilename'
      }
    });
    if (GroupOrderWithOrder && GroupOrderWithOrder.orderId) {
      orderObj.orderId = GroupOrderWithOrder.orderId.toObject();
      const o = orderObj.orderId;
      o.documentName = o.documentIds?.[0]?.originalFilename || 'Document';
      o.colorOption = o.printConfig?.colourMode || 'BlackAndWhite';
      o.doubleSided = o.printConfig?.sided === 'Double';
      o.finalCost = o.finalCost || o.estimatedCost || 0;
    }
  }

  return {
    ...orderObj,
    participants: enrichedParticipants,
    groupChatId
  };
};

// 1. Create Group Order (Internal Use)
exports.createGroupOrder = async ({ orderId, creatorId, totalAmount, participants }) => {
  if (!orderId || !creatorId || !totalAmount || !Array.isArray(participants)) {
    throw new Error('Missing required arguments to create group order.');
  }

  // Validate friendships
  for (const participant of participants) {
    const isFriend = await checkFriendship(creatorId, participant.userId);
    if (!isFriend) {
      throw new Error(`Participant ${participant.userId} is not a friend of the creator.`);
    }
  }

  const groupOrderParticipants = participants.map((p) => ({
    userId: p.userId,
    amount: p.amount,
    walletStatus: 'pending',
    paidAt: null
  }));

  const groupOrder = await GroupOrder.create({
    orderId,
    createdBy: creatorId,
    totalAmount,
    participants: groupOrderParticipants,
    status: 'active'
  });

  return groupOrder;
};

// 2. Get Group Order
exports.getGroupOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid orderId.' });
    }

    const groupOrder = await GroupOrder.findOne({ orderId })
      .populate('participants.userId', 'name role');

    if (!groupOrder) {
      return res.status(404).json({ success: false, message: 'Group order not found.' });
    }

    const userIdStr = req.user._id.toString();
    const isCreator = groupOrder.createdBy.toString() === userIdStr;
    const isParticipant = groupOrder.participants.some(
      (p) => p.userId && p.userId._id.toString() === userIdStr
    );

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.status(200).json(groupOrder);
  } catch (error) {
    return next(error);
  }
};

// 3. Send Split Requests
exports.sendSplitRequests = async (req, res, next) => {
  try {
    const { groupOrderId, triggeredFrom, groupChatId } = req.body;

    if (!mongoose.isValidObjectId(groupOrderId)) {
      return res.status(400).json({ success: false, message: 'Invalid groupOrderId.' });
    }

    if (!['order_detail', 'group_chat'].includes(triggeredFrom)) {
      return res.status(400).json({ success: false, message: 'Invalid triggeredFrom value.' });
    }

    const groupOrder = await GroupOrder.findById(groupOrderId);
    if (!groupOrder) {
      return res.status(404).json({ success: false, message: 'Group order not found.' });
    }

    if (groupOrder.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const createdRequests = [];

    let didUpdateStatus = false;
    for (const participant of groupOrder.participants) {
      if (participant.walletStatus === 'pending' || participant.walletStatus === 'declined') {
        // Delete any existing pending or declined split requests for this user in this group order
        await SplitRequest.deleteMany({
          groupOrderId,
          to: participant.userId
        });

        // Set status to pending
        if (participant.walletStatus === 'declined') {
          participant.walletStatus = 'pending';
          didUpdateStatus = true;
        }

        const splitRequest = await SplitRequest.create({
          groupOrderId,
          from: req.user._id,
          to: participant.userId,
          amount: participant.amount,
          status: 'pending',
          triggeredFrom,
          groupChatId: groupChatId || null
        });

        createdRequests.push(splitRequest);

        await createNotification({
          recipientId: participant.userId,
          title: 'Split Payment Request',
          message: `${req.user.name} requested ₹${participant.amount} for a group order.`,
          type: 'payment',
          relatedEntity: groupOrder.orderId
        }).catch(() => {});

        // Fire push notification
        sendPushToUser(participant.userId.toString(), {
          title: 'Split Payment Request',
          body: `${req.user.name} requested ₹${participant.amount} from you`,
          url: '/wallet/split-pay',
          data: {
            url: '/wallet/split-pay',
            type: 'splitRequestReceived',
            splitRequestId: splitRequest._id.toString(),
            groupOrderId: splitRequest.groupOrderId.toString(),
            amount: splitRequest.amount,
            groupChatId: splitRequest.groupChatId?.toString() || ''
          },
          trigger: 'splitRequestReceived'
        }).catch(() => {});

        // Emit Socket.io event to participant
        try {
          const io = socketHandler.getIO();
          io.to(`user:${participant.userId.toString()}`).emit('splitRequestSent', splitRequest);
        } catch (_) {}
      }
    }

    if (didUpdateStatus) {
      await GroupOrder.updateOne(
        { _id: groupOrder._id },
        { $set: { participants: groupOrder.participants } }
      );
    }

    // Emit groupChat card update if applicable
    if (triggeredFrom === 'group_chat') {
      try {
        const groupOrderPopulated = await GroupOrder.findById(groupOrderId)
          .populate('participants.userId', 'name role');

        const rebuiltSplitCardData = {
          groupOrderId: groupOrderPopulated._id,
          totalAmount: groupOrderPopulated.totalAmount,
          createdBy: groupOrderPopulated.createdBy,
          participants: groupOrderPopulated.participants.map(p => ({
            userId: p.userId._id,
            name: p.userId.name,
            amount: p.amount,
            walletStatus: p.walletStatus,
            splitRequestId: createdRequests.find(
              sr => sr.to.toString() === p.userId._id.toString()
            )?._id
          }))
        };

        const Message = require('../models/Message');
        const groupOrderIdStr = groupOrderPopulated._id.toString();

        if (groupChatId) {
          // Use findOneAndUpdate with upsert so this is atomic and never hits a race condition
          const message = await Message.findOneAndUpdate(
            {
              groupId: groupChatId,
              'splitCardData.groupOrderId': { $in: [groupOrderPopulated._id, groupOrderIdStr] }
            },
            {
              $set: {
                splitCardData: rebuiltSplitCardData,
                senderId: req.user._id,
                groupId: groupChatId,
                content: 'SPLIT REQUEST',
                read: false
              },
              $setOnInsert: { timestamp: new Date() }
            },
            { upsert: true, new: true }
          );

          const io = socketHandler.getIO();
          io.to(`group_${groupChatId}`).emit('splitCardUpdate', {
            messageId: message._id,
            splitCardData: rebuiltSplitCardData
          });
        } else {
          // One-to-one message update
          const message = await Message.findOneAndUpdate(
            {
              'splitCardData.groupOrderId': { $in: [groupOrderPopulated._id, groupOrderIdStr] }
            },
            {
              $set: {
                splitCardData: rebuiltSplitCardData,
                read: false
              }
            },
            { new: true }
          );

          if (message) {
            const io = socketHandler.getIO();
            io.to(`user:${message.senderId.toString()}`).emit('splitCardUpdate', rebuiltSplitCardData);
            io.to(`user:${message.recipientId.toString()}`).emit('splitCardUpdate', rebuiltSplitCardData);
          }
        }
      } catch (err) {
        console.error('Error updating splitCardData message:', err);
      }
    }

    return res.status(201).json(createdRequests);
  } catch (error) {
    return next(error);
  }
};

// 4. Respond to Split Request
exports.respondToSplitRequest = async (req, res, next) => {
  try {
    const { splitRequestId, action } = req.body;

    if (!splitRequestId || !action) {
      return res.status(400).json({ success: false, message: 'splitRequestId and action are required.' });
    }

    if (!['accepted', 'declined'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be accepted or declined.' });
    }

    const splitRequest = await SplitRequest.findById(splitRequestId);
    if (!splitRequest) {
      return res.status(404).json({ success: false, message: 'Split request not found.' });
    }

    if (splitRequest.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (splitRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This split request has already been resolved' });
    }

    const groupOrder = await GroupOrder.findById(splitRequest.groupOrderId);
    if (!groupOrder) {
      return res.status(404).json({ success: false, message: 'Associated group order not found.' });
    }

    if (action === 'declined') {
      splitRequest.status = 'declined';
      splitRequest.resolvedAt = new Date();
      await splitRequest.save();

      const participant = groupOrder.participants.find(
        (p) => p.userId.toString() === req.user._id.toString()
      );
      if (participant) {
        participant.walletStatus = 'declined';
      }
      await GroupOrder.updateOne(
        { _id: groupOrder._id },
        { $set: { participants: groupOrder.participants } }
      );

      // Fire notifications
      await createNotification({
        recipientId: splitRequest.from,
        title: 'Split Request Declined',
        message: `${req.user.name} declined your split request of ₹${splitRequest.amount}.`,
        type: 'order_update',
        relatedEntity: groupOrder.orderId
      }).catch(() => {});

      sendPushToUser(splitRequest.from.toString(), {
        title: 'Split Request Declined',
        body: `${req.user.name} declined your split request of ₹${splitRequest.amount}`,
        url: `/orders/${groupOrder.orderId}`,
        data: {
          url: `/orders/${groupOrder.orderId}`
        },
        trigger: 'splitDeclined'
      }).catch(() => {});

      try {
        const io = socketHandler.getIO();
        io.to(`user:${splitRequest.from.toString()}`).emit('splitStatusUpdate', {
          splitRequestId,
          status: 'declined'
        });

        const splitCardPayload = await getEnrichedSplitCardPayload(groupOrder._id, splitRequest.groupChatId || null);
        if (splitCardPayload) {
          if (splitRequest.groupChatId) {
            io.to(`group_${splitRequest.groupChatId}`).emit('splitCardUpdate', splitCardPayload);
          } else {
            io.to(`user:${splitRequest.from.toString()}`).emit('splitCardUpdate', splitCardPayload);
            io.to(`user:${splitRequest.to.toString()}`).emit('splitCardUpdate', splitCardPayload);
          }
        }
      } catch (_) {}

      return res.status(200).json(splitRequest);
    }

    // Action is ACCEPTED - Check wallet balance first
    const responderWallet = await Wallet.findOne({ userId: req.user._id });
    if (!responderWallet || responderWallet.balance < splitRequest.amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        currentBalance: responderWallet?.balance ?? 0
      });
    }

    // Start MongoDB transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Debit responder
      responderWallet.balance -= splitRequest.amount;
      await responderWallet.save({ session });

      // Credit creator
      const creatorWallet = await Wallet.findOne({ userId: splitRequest.from }).session(session);
      if (!creatorWallet) {
        throw new Error('Creator wallet not found');
      }
      creatorWallet.balance += splitRequest.amount;
      await creatorWallet.save({ session });

      // WalletTransaction for responder
      await WalletTransaction.create([{
        walletId: responderWallet._id,
        type: 'split_debit',
        amount: splitRequest.amount,
        description: 'Split payment sent',
        status: 'success'
      }], { session });

      // WalletTransaction for creator
      await WalletTransaction.create([{
        walletId: creatorWallet._id,
        type: 'split_credit',
        amount: splitRequest.amount,
        description: 'Split payment received',
        status: 'success'
      }], { session });

      // Update SplitRequest
      splitRequest.status = 'accepted';
      splitRequest.resolvedAt = new Date();
      await splitRequest.save({ session });

      // Update GroupOrder participant
      const tGroupOrder = await GroupOrder.findById(splitRequest.groupOrderId).session(session);
      const participant = tGroupOrder.participants.find(
        (p) => p.userId.toString() === req.user._id.toString()
      );
      if (participant) {
        participant.walletStatus = 'paid';
        participant.paidAt = new Date();
      }

      // Check if all paid
      const allPaid = tGroupOrder.participants.every(
        (p) => p.walletStatus === 'paid'
      );
      if (allPaid) {
        tGroupOrder.status = 'completed';
      }

      await GroupOrder.updateOne(
        { _id: tGroupOrder._id },
        { $set: { participants: tGroupOrder.participants, status: tGroupOrder.status } },
        { session }
      );

      await session.commitTransaction();

      // Post-commit notifications
      await createNotification({
        recipientId: splitRequest.from,
        title: 'Split Payment Received',
        message: `${req.user.name} paid their split of ₹${splitRequest.amount} for your group order.`,
        type: 'payment',
        relatedEntity: groupOrder.orderId
      }).catch(() => {});

      await createNotification({
        recipientId: req.user._id,
        title: 'Wallet Debited',
        message: `Your wallet was debited by ₹${splitRequest.amount} for group order split payment.`,
        type: 'payment',
        relatedEntity: groupOrder.orderId
      }).catch(() => {});

      if (allPaid) {
        await createNotification({
          recipientId: tGroupOrder.createdBy,
          title: 'Group Order Fully Settled',
          message: `All participants have paid their splits. Your group order is fully settled!`,
          type: 'order_update',
          relatedEntity: groupOrder.orderId
        }).catch(() => {});
      }

      sendPushToUser(splitRequest.from.toString(), {
        title: 'Split Request Accepted',
        body: `${req.user.name} accepted your split request.`,
        url: `/orders/${groupOrder.orderId}`,
        data: {
          url: `/orders/${groupOrder.orderId}`
        },
        trigger: 'splitAccepted'
      }).catch(() => {});

      sendPushToUser(req.user._id.toString(), {
        title: 'Wallet Debited',
        body: `Your wallet was debited by ₹${splitRequest.amount} for split payment.`,
        url: `/orders/${groupOrder.orderId}`,
        data: {
          url: `/orders/${groupOrder.orderId}`
        },
        trigger: 'walletDebited'
      }).catch(() => {});

      sendPushToUser(splitRequest.from.toString(), {
        title: 'Wallet Credited',
        body: `Your wallet was credited ₹${splitRequest.amount} from ${req.user.name}.`,
        url: `/orders/${groupOrder.orderId}`,
        data: {
          url: `/orders/${groupOrder.orderId}`
        },
        trigger: 'walletCredited'
      }).catch(() => {});

      try {
        const io = socketHandler.getIO();
        io.to(`user:${splitRequest.from.toString()}`).emit('splitStatusUpdate', {
          splitRequestId,
          status: 'accepted'
        });

        const splitCardPayload = await getEnrichedSplitCardPayload(groupOrder._id, splitRequest.groupChatId || null);
        if (splitCardPayload) {
          if (splitRequest.groupChatId) {
            io.to(`group_${splitRequest.groupChatId}`).emit('splitCardUpdate', splitCardPayload);
          } else {
            io.to(`user:${splitRequest.from.toString()}`).emit('splitCardUpdate', splitCardPayload);
            io.to(`user:${splitRequest.to.toString()}`).emit('splitCardUpdate', splitCardPayload);
          }
        }

        if (allPaid) {
          // Emit to all participants and creator
          const rooms = [
            `user:${tGroupOrder.createdBy.toString()}`,
            ...tGroupOrder.participants.map((p) => `user:${p.userId.toString()}`)
          ];
          rooms.forEach((room) => {
            io.to(room).emit('splitAllComplete', { groupOrderId: tGroupOrder._id });
          });
        }
      } catch (_) {}

      return res.status(200).json({
        success: true,
        splitRequest,
        newBalance: responderWallet.balance
      });

    } catch (err) {
      await session.abortTransaction();
      console.error('Split transaction failed:', err);
      return res.status(500).json({
        success: false,
        message: 'Split payment failed. No money was moved.',
        error: err.message
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    return next(error);
  }
};

// 5. Get Split Status
exports.getSplitStatus = async (req, res, next) => {
  try {
    const { groupOrderId } = req.params;

    if (!mongoose.isValidObjectId(groupOrderId)) {
      return res.status(400).json({ success: false, message: 'Invalid groupOrderId.' });
    }

    const groupOrder = await GroupOrder.findById(groupOrderId)
      .populate('participants.userId', 'name role');

    if (!groupOrder) {
      return res.status(404).json({ success: false, message: 'Group order not found.' });
    }

    const userIdStr = req.user._id.toString();
    const isCreator = groupOrder.createdBy.toString() === userIdStr;
    const isParticipant = groupOrder.participants.some(
      (p) => p.userId && p.userId._id.toString() === userIdStr
    );

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const splitRequests = await SplitRequest.find({ groupOrderId });

    let totalRecovered = 0;
    let totalRemaining = 0;

    groupOrder.participants.forEach((p) => {
      if (p.walletStatus === 'paid') {
        totalRecovered += p.amount;
      } else if (p.walletStatus === 'pending') {
        totalRemaining += p.amount;
      }
    });

    return res.status(200).json({
      groupOrder,
      splitRequests,
      totalRecovered,
      totalRemaining
    });
  } catch (error) {
    return next(error);
  }
};

// 6. Get Pending Split Requests
exports.getPendingSplitRequests = async (req, res, next) => {
  try {
    const splitRequests = await SplitRequest.find({
      to: req.user._id,
      status: 'pending'
    })
    .populate('from', 'name')
    .populate({
      path: 'groupOrderId',
      populate: {
        path: 'orderId',
        populate: {
          path: 'documentIds',
          select: 'originalFilename'
        }
      }
    })
    .sort({ createdAt: -1 });

    const formattedRequests = splitRequests.map((request) => {
      const reqObj = request.toObject();
      if (reqObj.groupOrderId && reqObj.groupOrderId.orderId) {
        const order = reqObj.groupOrderId.orderId;
        order.documentName = order.documentIds?.[0]?.originalFilename || 'Document';
        order.colorOption = order.printConfig?.colourMode || 'BlackAndWhite';
        order.doubleSided = order.printConfig?.sided === 'Double';
        order.finalCost = order.finalCost || order.estimatedCost || 0;
      }
      return reqObj;
    });

    return res.status(200).json(formattedRequests);
  } catch (error) {
    return next(error);
  }
};

// 7. Get All Group Orders Created By User
exports.getGroupOrders = async (req, res, next) => {
  try {
    const groupOrders = await GroupOrder.find({
      createdBy: req.user._id,
      status: 'active'
    }).populate('participants.userId', 'name role').populate('orderId', 'tokenNumber serviceType');
    
    return res.status(200).json(groupOrders);
  } catch (error) {
    return next(error);
  }
};

// 8. Get Active Group Orders Created by User (with populated detail fields)
exports.getMyActiveGroupOrders = async (req, res, next) => {
  try {
    const groupOrders = await GroupOrder.find({
      createdBy: req.user._id,
      status: 'active'
    })
    .populate({
      path: 'orderId',
      populate: {
        path: 'documentIds',
        select: 'originalFilename'
      }
    })
    .populate('participants.userId', 'name')
    .sort({ createdAt: -1 });

    const formattedOrders = groupOrders.map((groupOrder) => {
      const orderObj = groupOrder.toObject();
      if (orderObj.orderId) {
        const order = orderObj.orderId;
        order.documentName = order.documentIds?.[0]?.originalFilename || 'Document';
        order.colorOption = order.printConfig?.colourMode || 'BlackAndWhite';
        order.doubleSided = order.printConfig?.sided === 'Double';
        order.finalCost = order.finalCost || order.estimatedCost || 0;
      }
      return orderObj;
    });

    return res.status(200).json(formattedOrders);
  } catch (error) {
    return next(error);
  }
};

// 9. Create Custom Split Request (before placing order)
exports.createCustomSplit = async (req, res, next) => {
  try {
    const { totalAmount, description, participants, groupChatId } = req.body;

    if (!totalAmount || isNaN(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid total amount.' });
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ success: false, message: 'Participants are required.' });
    }

    // Validate friendships (skip creator themselves)
    for (const p of participants) {
      if (p.userId.toString() === req.user._id.toString()) continue;
      const isFriend = await checkFriendship(req.user._id, p.userId);
      if (!isFriend) {
        return res.status(400).json({ success: false, message: `Participant is not a friend.` });
      }
    }

    const groupOrderParticipants = participants.map((p) => ({
      userId: p.userId,
      amount: p.amount,
      walletStatus: p.userId.toString() === req.user._id.toString() ? 'paid' : 'pending',
      paidAt: p.userId.toString() === req.user._id.toString() ? new Date() : null
    }));

    const groupOrder = await GroupOrder.create({
      orderId: null,
      createdBy: req.user._id,
      totalAmount,
      participants: groupOrderParticipants,
      description: description || 'Custom Split Request',
      status: 'active'
    });

    const createdRequests = [];
    for (const participant of groupOrder.participants) {
      if (participant.userId.toString() === req.user._id.toString()) {
        continue;
      }

      const splitRequest = await SplitRequest.create({
        groupOrderId: groupOrder._id,
        from: req.user._id,
        to: participant.userId,
        amount: participant.amount,
        status: 'pending',
        triggeredFrom: 'group_chat',
        groupChatId: groupChatId || null
      });

      createdRequests.push(splitRequest);

      await createNotification({
        recipientId: participant.userId,
        title: 'Custom Split Request',
        message: `${req.user.name} requested ₹${participant.amount} for: ${description || 'Custom Split Request'}.`,
        type: 'payment'
      }).catch(() => {});

      sendPushToUser(participant.userId.toString(), {
        title: 'Custom Split Request',
        body: `${req.user.name} requested ₹${participant.amount} from you`,
        url: '/wallet/split-pay',
        data: {
          url: '/wallet/split-pay',
          type: 'splitRequestReceived',
          splitRequestId: splitRequest._id.toString(),
          groupOrderId: splitRequest.groupOrderId.toString(),
          amount: splitRequest.amount,
          groupChatId: splitRequest.groupChatId?.toString() || ''
        },
        trigger: 'splitRequestReceived'
      }).catch(() => {});

      try {
        const io = socketHandler.getIO();
        io.to(`user:${participant.userId.toString()}`).emit('splitRequestSent', splitRequest);
      } catch (_) {}
    }

    // Emit groupChat card update if applicable
    const rebuiltSplitCardData = await getEnrichedSplitCardPayload(groupOrder._id, groupChatId || null);

    if (rebuiltSplitCardData) {
      const Message = require('../models/Message');
      if (groupChatId) {
        try {
          const message = await Message.create({
            senderId: req.user._id,
            groupId: groupChatId,
            content: 'SPLIT REQUEST',
            type: 'text',
            splitCardData: rebuiltSplitCardData
          });

          const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name role');

          const io = socketHandler.getIO();
          io.to(`group_${groupChatId}`).emit('newMessage', populatedMessage);
        } catch (err) {
          console.error('Error creating group chat split request message:', err);
        }
      } else {
        // One-on-one split
        // One-on-one split: find the participant who is not the sender
        const friendParticipant = participants.find(p => p.userId.toString() !== req.user._id.toString());
        const friendId = friendParticipant ? friendParticipant.userId : participants[0].userId;
        try {
          const message = await Message.create({
            senderId: req.user._id,
            recipientId: friendId,
            content: 'SPLIT REQUEST',
            type: 'text',
            splitCardData: rebuiltSplitCardData
          });

          const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name role')
            .populate('recipientId', 'name role');

          const io = socketHandler.getIO();
          io.to(`user:${req.user._id.toString()}`).emit('newMessage', populatedMessage);
          io.to(`user:${friendId.toString()}`).emit('newMessage', populatedMessage);
        } catch (err) {
          console.error('Error creating one-on-one split request message:', err);
        }
      }
    }

    return res.status(201).json(groupOrder);
  } catch (error) {
    return next(error);
  }
};

// 10. Get Active Group Orders for Group Chat (with populated detail & splitRequestId fields)
exports.getGroupChatActiveOrders = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // Find all distinct groupOrderId for this groupChatId
    const splitRequests = await SplitRequest.find({ groupChatId: groupId });
    const groupOrderIds = [...new Set(splitRequests.map(r => r.groupOrderId?.toString()))].filter(Boolean);

    const activeOrders = [];
    for (const groupOrderId of groupOrderIds) {
      const enriched = await getEnrichedSplitCardPayload(groupOrderId, groupId);
      if (enriched && enriched.status === 'active') {
        activeOrders.push(enriched);
      }
    }

    return res.status(200).json(activeOrders);
  } catch (error) {
    return next(error);
  }
};
