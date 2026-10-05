const path = require('path');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const Document = require('../models/Document');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const { sendPushToUser } = require('../utils/pushService');
const { findCloudinaryResource } = require('../config/cloudinary');
const { calculateCost, calculatePriorityScore } = require('../services/pricingService');
const { broadcastQueueUpdate } = require('../services/queueService');
const { createNotification, createTargetedStaffNotification } = require('../services/notificationService');
const { sendEmail, buildOrderCancelledEmail } = require('../config/nodemailer');
const { generateTokenNumber, calculateEstimatedDuration } = require('../utils/orderHelpers');
const { getPrimaryFrontendUrl } = require('../config/origins');

const ALLOWED_SERVICE_TYPES = ['Printing', 'Photocopying', 'Scanning', 'Binding', 'Conversion'];

const isPrivilegedRole = (role) => role === 'Staff' || role === 'Admin';
const resolveInitialPaymentStatus = (paymentMethod) => (
  paymentMethod === 'Cash' ? 'Cash_Pending' : 'Pending'
);

const buildOwnerQuery = (userId) => (
  mongoose.isValidObjectId(userId)
    ? { userId }
    : { userId: null }
);

const buildPricingInput = ({
  serviceType,
  printConfig = {},
  pageCount,
  documentCount,
}) => ({
  serviceType,
  pageCount,
  copies: Number(printConfig.copies) || 1,
  colourMode: printConfig.colourMode,
  sided: printConfig.sided,
  binding: printConfig.binding,
  documentCount,
});

const buildDraftDocument = (document) => ({
  documentId: document._id,
  originalFilename: document.originalFilename,
  pageCount: document.pageCount || 0,
  fileType: document.fileType,
  cloudinaryUrl: document.cloudinaryUrl,
  blankPages: Array.isArray(document.analysisResults?.blankPages)
    ? document.analysisResults.blankPages
    : [],
  qualityIssues: Array.isArray(document.analysisResults?.qualityIssues)
    ? document.analysisResults.qualityIssues
    : [],
  colourHeavyPages: Array.isArray(document.analysisResults?.colourHeavyPages)
    ? document.analysisResults.colourHeavyPages
    : [],
});

const getCompletedTimestamp = (statusHistory = []) => {
  for (let index = statusHistory.length - 1; index >= 0; index -= 1) {
    if (statusHistory[index]?.status === 'Completed') {
      return statusHistory[index].timestamp || null;
    }
  }

  return null;
};

const formatReceiptValue = (value, fallback = 'N/A') => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value);
};

const formatReceiptCurrency = (value) => `₹${Number(value || 0).toFixed(2)}`;

exports.estimateCost = async (req, res, next) => {
  try {
    const systemConfig = await SystemConfig.getInstance();
    const {
      serviceType,
      pageCount,
      copies,
      colourMode,
      sided,
      binding,
      documentCount,
    } = req.body;

    if (!ALLOWED_SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({ success: false, message: 'Invalid service type.' });
    }

    const { estimatedCost, breakdown } = calculateCost({
      serviceType,
      pageCount,
      copies,
      colourMode,
      sided,
      binding,
      documentCount,
    }, systemConfig.pricing);

    return res.status(200).json({
      estimatedCost,
      breakdown,
    });
  } catch (error) {
    return next(error);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const systemConfig = await SystemConfig.getInstance();
    
    // Strict backend role authorization (Task F)
    const allowedCustomerRoles = ['Faculty', 'Student', 'Guest'];
    const currentRole = req.user?.role;
    
    if (!currentRole || !allowedCustomerRoles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Staff and Admin accounts are not permitted to place customer orders.'
      });
    }

    const {
      documentIds,
      serviceType,
      printConfig = {},
      preferredPickupSlot,
      paymentMethod,
    } = req.body;

    if (!ALLOWED_SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({ success: false, message: 'Invalid service type.' });
    }

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one document is required.' });
    }

    if (!['Online', 'Cash', 'wallet'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }

    const uniqueDocumentIds = [...new Set(documentIds)];
    const hasInvalidId = uniqueDocumentIds.some((id) => !mongoose.isValidObjectId(id));

    if (hasInvalidId) {
      return res.status(400).json({ success: false, message: 'One or more document IDs are invalid.' });
    }

    const documents = await Document.find({ _id: { $in: uniqueDocumentIds } });

    if (documents.length !== uniqueDocumentIds.length) {
      return res.status(404).json({ success: false, message: 'One or more documents were not found.' });
    }

    const isGuest = req.user?.isGuest === true;
    const hasOwnershipMismatch = documents.some((document) => {
      if (isGuest) {
        return document.isGuest !== true || document.guestSessionId !== req.user.sessionId;
      }

      return String(document.ownerId) !== String(req.user._id);
    });

    if (hasOwnershipMismatch) {
      return res.status(403).json({ success: false, message: 'You can only create orders for your own documents.' });
    }

    const totalPageCount = documents.reduce((sum, document) => sum + (document.pageCount || 0), 0);
    const copies = Number(printConfig.copies) || 1;

    const pricing = calculateCost({
      serviceType,
      pageCount: totalPageCount,
      copies,
      colourMode: printConfig.colourMode,
      sided: printConfig.sided,
      binding: printConfig.binding,
      documentCount: uniqueDocumentIds.length,
    }, systemConfig.pricing);
    const estimatedDuration = await calculateEstimatedDuration({
      serviceType,
      pageCount: totalPageCount,
      copies,
      documentCount: uniqueDocumentIds.length,
      binding: printConfig.binding,
    });

    const priorityScore = calculatePriorityScore(req.user.role, preferredPickupSlot, new Date(), estimatedDuration);
    const tokenNumber = await generateTokenNumber();
    if (paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ userId: req.user._id });
      if (!wallet) {
        return res.status(400).json({ message: 'Wallet not found' });
      }
      if (wallet.balance < pricing.estimatedCost) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }

      const session = await mongoose.startSession();
      session.startTransaction();
      let order;
      try {
        wallet.balance -= pricing.estimatedCost;
        await wallet.save({ session });

        const statusHistory = [{
          status: 'In_Queue',
          timestamp: new Date(),
          note: 'Order created and paid via wallet.',
        }];

        order = new Order({
          userId: isGuest ? undefined : req.user._id,
          isGuest,
          guestEmail: isGuest ? req.user.email : undefined,
          guestSessionId: isGuest ? req.user.sessionId : undefined,
          documentIds: uniqueDocumentIds,
          serviceType,
          userRole: req.user.role,
          printConfig,
          pageCount: totalPageCount,
          estimatedCost: pricing.estimatedCost,
          finalCost: pricing.estimatedCost,
          paymentMethod: 'wallet',
          paymentStatus: 'Paid',
          status: 'In_Queue',
          statusHistory,
          tokenNumber,
          priorityScore,
          agingScore: 0,
          preferredPickupSlot,
          otpAttempts: 0,
          otpLocked: false,
          lockedBy: null,
          lockedAt: null,
          partialPagesCompleted: 0,
          followUpOrderId: null,
          internalNotes: '',
          estimatedDuration,
        });

        await order.save({ session });

        if (req.body.isGroupOrder === true &&
          Array.isArray(req.body.participants) &&
          req.body.participants.length > 0) {
          try {
            const GroupOrder = require('../models/GroupOrder');
            const SplitRequest = require('../models/SplitRequest');
            const socketHandler = require('../socket/socketHandler');

            const groupOrder = new GroupOrder({
              orderId: order._id,
              createdBy: req.user._id,
              totalAmount: order.finalCost || order.estimatedCost || 0,
              participants: req.body.participants.map(p => ({
                userId: p.userId,
                amount: p.amount,
                walletStatus: 'pending'
              })),
              status: 'active'
            });
            await groupOrder.save({ session });
            order.isGroupOrder = true;
            order.groupOrderId = groupOrder._id;
            await order.save({ session });

            for (const participant of groupOrder.participants) {
              const splitReq = new SplitRequest({
                groupOrderId: groupOrder._id,
                from: req.user._id,
                to: participant.userId,
                amount: participant.amount,
                status: 'pending',
                triggeredFrom: 'order_detail',
                groupChatId: null
              });
              await splitReq.save({ session });

              await createNotification({
                recipientId: participant.userId,
                title: 'Split Payment Request',
                message: `${req.user.name} requested ₹${participant.amount} for a group order.`,
                type: 'payment',
                relatedEntity: order._id
              }).catch(() => { });

              sendPushToUser(participant.userId.toString(), {
                title: 'Split Payment Request',
                body: `${req.user.name} requested ₹${participant.amount} from you`,
                url: '/wallet/split-pay',
                data: {
                  url: '/wallet/split-pay',
                  type: 'splitRequestReceived',
                  splitRequestId: splitReq._id.toString(),
                  groupOrderId: splitReq.groupOrderId.toString(),
                  amount: splitReq.amount,
                  groupChatId: splitReq.groupChatId?.toString() || ''
                },
                trigger: 'splitRequestReceived'
              }).catch(() => { });

              sendPushToUser(participant.userId.toString(), {
                title: 'Added to Group Order',
                body: `${req.user.name} placed a group order and included you. Tap to track the order status.`,
                data: {
                  url: `/orders/${order._id}`
                }
              }).catch(() => { });

              try {
                const io = socketHandler.getIO();
                io.to(`user:${participant.userId.toString()}`).emit('splitRequestSent', {
                  _id: splitReq._id,
                  groupOrderId: {
                    _id: groupOrder._id,
                    orderId: {
                      _id: order._id,
                      documentName: documents?.[0]?.originalFilename || 'Document',
                      pageCount: totalPageCount,
                      colorOption: printConfig.colourMode || 'BlackAndWhite',
                      doubleSided: printConfig.sided === 'Double',
                      finalCost: order.finalCost || order.estimatedCost || 0
                    }
                  },
                  from: {
                    _id: req.user._id,
                    name: req.user.name
                  },
                  amount: participant.amount,
                  status: 'pending',
                  createdAt: splitReq.createdAt
                });
              } catch (_) { }
            }
          } catch (groupErr) {
            console.error('GroupOrder creation failed for order', order._id, groupErr);
          }
        }

        await WalletTransaction.create([{
          walletId: wallet._id,
          type: 'order_debit',
          amount: pricing.estimatedCost,
          orderId: order._id,
          description: 'Order payment via wallet',
          status: 'success'
        }], { session });

        await Payment.create([{
          orderId: order._id,
          userId: isGuest ? null : req.user._id,
          amount: pricing.estimatedCost,
          currency: 'INR',
          status: 'Paid',
          method: 'wallet',
        }], { session });

        await session.commitTransaction();

        try {
          const eventDispatcher = require('../services/eventDispatcher');
          eventDispatcher.emit('PAYMENT_VERIFIED', { orderId: order._id, order, paymentMethod: 'wallet' });
        } catch (dispatchErr) {
          console.warn('[orderController] EventDispatcher emit failed:', dispatchErr.message);
        }
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }

      const systemConfigObj = await SystemConfig.getInstance();
      const { scheduleAutoProcessingIfEnabled } = require('../utils/autoProcessingScheduler');
      await scheduleAutoProcessingIfEnabled(order, systemConfigObj);

      await sendPushToUser(req.user._id, {
        title: 'Wallet Debited',
        body: `₹${pricing.estimatedCost} was deducted for order ${order.tokenNumber}.`,
        url: `/orders/track/${order._id}`
      });

      await broadcastQueueUpdate(order.serviceType);

      await createTargetedStaffNotification({
        order,
        title: 'New Order in Queue',
        message: `${order.tokenNumber} — ${order.serviceType}, ${order.pageCount || 0} pages`,
        relatedOrderId: order._id,
        relatedServiceType: order.serviceType,
      });

      if (!isGuest) {
        await createNotification({
          recipientId: req.user.id,
          title: 'Order Placed Successfully',
          message: `Your order ${order.tokenNumber} has been placed. Estimated wait: ${order.estimatedDuration} mins.`,
          type: 'order_update',
        });
      }

      let qrCodeDataUrl;
      let trackingUrl;
      if (isGuest) {
        const QRCode = require('qrcode');
        trackingUrl = `${getPrimaryFrontendUrl()}/guest/track/${order._id}`;
        qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 300
        });
      }

      return res.status(201).json({
        success: true,
        order,
        requiresPayment: false,
        trackingUrl,
        qrCodeDataUrl,
      });
    }

    const initialStatus = paymentMethod === 'Cash' ? 'In_Queue' : 'Pending';
    const paymentStatus = resolveInitialPaymentStatus(paymentMethod);
    const statusHistory = [{
      status: initialStatus,
      timestamp: new Date(),
      note: paymentMethod === 'Cash'
        ? 'Order created. Cash payment pending collection at the counter.'
        : 'Order created',
    }];

    const order = new Order({
      userId: isGuest ? undefined : req.user._id,
      isGuest,
      guestEmail: isGuest ? req.user.email : undefined,
      guestSessionId: isGuest ? req.user.sessionId : undefined,
      documentIds: uniqueDocumentIds,
      serviceType,
      userRole: req.user.role,
      printConfig,
      pageCount: totalPageCount,
      estimatedCost: pricing.estimatedCost,
      finalCost: pricing.estimatedCost,
      paymentMethod,
      paymentStatus,
      status: initialStatus,
      statusHistory,
      tokenNumber,
      priorityScore,
      agingScore: 0,
      preferredPickupSlot,
      otpAttempts: 0,
      otpLocked: false,
      lockedBy: null,
      lockedAt: null,
      partialPagesCompleted: 0,
      followUpOrderId: null,
      internalNotes: '',
      estimatedDuration,
    });

    await order.save();

    if (paymentMethod === 'Cash') {
      try {
        const eventDispatcher = require('../services/eventDispatcher');
        eventDispatcher.emit('PAYMENT_VERIFIED', {
          orderId: order._id,
          order,
          paymentMethod: 'Cash'
        });
      } catch (dispatchErr) {
        console.warn('[orderController] EventDispatcher emit failed for cash order:', dispatchErr.message);
      }
    }

    if (req.body.isGroupOrder === true &&
      Array.isArray(req.body.participants) &&
      req.body.participants.length > 0) {
      try {
        const GroupOrder = require('../models/GroupOrder');
        const SplitRequest = require('../models/SplitRequest');
        const socketHandler = require('../socket/socketHandler');

        const groupOrder = new GroupOrder({
          orderId: order._id,
          createdBy: req.user._id,
          totalAmount: order.finalCost || order.estimatedCost || 0,
          participants: req.body.participants.map(p => ({
            userId: p.userId,
            amount: p.amount,
            walletStatus: 'pending'
          })),
          status: 'active'
        });
        await groupOrder.save();
        order.isGroupOrder = true;
        order.groupOrderId = groupOrder._id;
        await order.save();

        for (const participant of groupOrder.participants) {
          const splitReq = new SplitRequest({
            groupOrderId: groupOrder._id,
            from: req.user._id,
            to: participant.userId,
            amount: participant.amount,
            status: 'pending',
            triggeredFrom: 'order_detail',
            groupChatId: null
          });
          await splitReq.save();

          await createNotification({
            recipientId: participant.userId,
            title: 'Split Payment Request',
            message: `${req.user.name} requested ₹${participant.amount} for a group order.`,
            type: 'payment',
            relatedEntity: order._id
          }).catch(() => { });

          sendPushToUser(participant.userId.toString(), {
            title: 'Split Payment Request',
            body: `${req.user.name} requested ₹${participant.amount} from you`,
            url: '/wallet/split-pay',
            data: {
              url: '/wallet/split-pay',
              type: 'splitRequestReceived',
              splitRequestId: splitReq._id.toString(),
              groupOrderId: splitReq.groupOrderId.toString(),
              amount: splitReq.amount,
              groupChatId: splitReq.groupChatId?.toString() || ''
            },
            trigger: 'splitRequestReceived'
          }).catch(() => { });

          sendPushToUser(participant.userId.toString(), {
            title: 'Added to Group Order',
            body: `${req.user.name} placed a group order and included you. Tap to track the order status.`,
            data: {
              url: `/orders/${order._id}`
            }
          }).catch(() => { });

          try {
            const io = socketHandler.getIO();
            io.to(`user:${participant.userId.toString()}`).emit('splitRequestSent', {
              _id: splitReq._id,
              groupOrderId: {
                _id: groupOrder._id,
                orderId: {
                  _id: order._id,
                  documentName: documents?.[0]?.originalFilename || 'Document',
                  pageCount: totalPageCount,
                  colorOption: printConfig.colourMode || 'BlackAndWhite',
                  doubleSided: printConfig.sided === 'Double',
                  finalCost: order.finalCost || order.estimatedCost || 0
                }
              },
              from: {
                _id: req.user._id,
                name: req.user.name
              },
              amount: participant.amount,
              status: 'pending',
              createdAt: splitReq.createdAt
            });
          } catch (_) { }
        }
      } catch (groupErr) {
        console.error('GroupOrder creation failed for order', order._id, groupErr);
      }
    }

    if (paymentMethod === 'Cash') {
      await Payment.findOneAndUpdate(
        { orderId: order._id, method: 'Cash' },
        {
          $set: {
            userId: isGuest ? null : order.userId,
            amount: order.finalCost || order.estimatedCost || 0,
            currency: 'INR',
            status: 'Created',
            method: 'Cash',
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    await broadcastQueueUpdate(order.serviceType);

    // Notify targeted staff for cash orders (they enter the queue immediately)
    if (paymentMethod === 'Cash') {
      await createTargetedStaffNotification({
        order,
        title: 'New Order in Queue',
        message: `${order.tokenNumber} — ${order.serviceType}, ${order.pageCount || 0} pages`,
        relatedOrderId: order._id,
        relatedServiceType: order.serviceType,
      });
    }

    if (!isGuest) {
      await createNotification({
        recipientId: req.user.id,
        title: 'Order Placed Successfully',
        message: `Your order ${order.tokenNumber} has been placed. Estimated wait: ${order.estimatedDuration} mins.`,
        type: 'order_update',
      });
    }

    let qrCodeDataUrl;
    let trackingUrl;
    if (isGuest) {
      const QRCode = require('qrcode');
      trackingUrl = `${getPrimaryFrontendUrl()}/guest/track/${order._id}`;
      qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300
      });
    }

    return res.status(201).json({
      success: true,
      order,
      requiresPayment: paymentMethod === 'Online',
      trackingUrl,
      qrCodeDataUrl,
    });
  } catch (error) {
    return next(error);
  }
};

exports.reorderOrder = async (req, res, next) => {
  try {
    const allowedCustomerRoles = ['Faculty', 'Student', 'Guest'];
    const currentRole = req.user?.role;
    
    if (!currentRole || !allowedCustomerRoles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Staff and Admin accounts are not permitted to place customer orders.'
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const originalOrder = await Order.findById(req.params.id).populate('documentIds');

    if (!originalOrder) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (String(originalOrder.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (originalOrder.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'Only completed orders can be reordered.' });
    }

    const originalDocuments = Array.isArray(originalOrder.documentIds) ? originalOrder.documentIds : [];
    const hasMissingDocument = !originalDocuments.length
      || originalDocuments.some((document) => !document?._id);

    if (hasMissingDocument) {
      return res.status(400).json({
        success: false,
        message: 'One or more documents from the original order are no longer available. Please upload them again.',
      });
    }

    try {
      await Promise.all(originalDocuments.map(async (document) => {
        if (!document?.publicId) {
          throw new Error('Missing Cloudinary public ID');
        }

        await findCloudinaryResource(document.publicId);
      }));
    } catch (verificationError) {
      return res.status(400).json({
        success: false,
        message: 'One or more documents from the original order are no longer available. Please upload them again.',
      });
    }

    const systemConfig = await SystemConfig.getInstance();
    const totalPageCount = originalDocuments.reduce((sum, document) => sum + (document.pageCount || 0), 0);
    const pricing = calculateCost(
      buildPricingInput({
        serviceType: originalOrder.serviceType,
        printConfig: originalOrder.printConfig,
        pageCount: totalPageCount,
        documentCount: originalDocuments.length,
      }),
      systemConfig.pricing
    );

    return res.status(200).json({
      isDraft: true,
      documentIds: originalDocuments.map((document) => document._id),
      uploadedDocuments: originalDocuments.map(buildDraftDocument),
      serviceType: originalOrder.serviceType,
      printConfig: originalOrder.printConfig || {},
      preferredPickupSlot: originalOrder.preferredPickupSlot || 'Morning',
      paymentMethod: originalOrder.paymentMethod || 'Online',
      estimatedCost: pricing.estimatedCost,
      breakdown: pricing.breakdown,
      originalTokenNumber: originalOrder.tokenNumber,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.max(1, parsedLimit)
      : null;

    const ownedOrders = await Order.find(buildOwnerQuery(req.user._id))
      .populate('documentIds')
      .sort({ createdAt: -1 });

    const annotatedOwnedOrders = ownedOrders.map((order) => ({
      ...order.toObject(),
      orderAccessRole: order.isGroupOrder ? 'creator' : 'owner',
    }));

    let participantOrders = [];
    if (req.user?._id && req.user?.isGuest !== true) {
      const GroupOrder = require('../models/GroupOrder');
      const participantGroupOrders = await GroupOrder.find({ 'participants.userId': req.user._id })
        .populate('createdBy', 'name')
        .select('orderId createdBy participants');

      if (participantGroupOrders.length > 0) {
        const groupOrdersByOrderId = new Map(
          participantGroupOrders.map((groupOrder) => [String(groupOrder.orderId), groupOrder])
        );
        const participantOrderDocs = await Order.find({ _id: { $in: participantGroupOrders.map((groupOrder) => groupOrder.orderId) } })
          .populate('documentIds')
          .populate('userId', 'name')
          .sort({ createdAt: -1 });

        participantOrders = participantOrderDocs.map((order) => {
          const groupOrder = groupOrdersByOrderId.get(String(order._id));
          const participant = groupOrder?.participants?.find(
            (entry) => String(entry.userId) === String(req.user._id)
          );

          return {
            ...order.toObject(),
            orderAccessRole: 'participant',
            groupCreatorName: groupOrder?.createdBy?.name || order.userId?.name || 'Creator',
            participantSplit: participant ? {
              amount: participant.amount,
              walletStatus: participant.walletStatus,
            } : null,
            pickupOtp: undefined,
            pickupOtpExpiry: undefined,
          };
        });
      }
    }

    const ordersById = new Map();
    [...annotatedOwnedOrders, ...participantOrders].forEach((order) => {
      ordersById.set(String(order._id), order);
    });

    let orders = [...ordersById.values()]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    if (limit) {
      orders = orders.slice(0, limit);
    }

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    return next(error);
  }
};

exports.downloadReceipt = async (req, res, next) => {
  try {
    const receiptOrderId = req.params.id || req.params.orderId;
    const order = await Order.findById(receiptOrderId)
      .populate('userId', 'name email collegeId department role')
      .populate('documentIds');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // ── Access control ──────────────────────────────────────
    const requestUserId = (req.user?._id || req.user?.id)?.toString();
    const requestUserRole = String(req.user?.role || '').toLowerCase();
    const isOwner = order.userId?._id?.toString() === requestUserId;
    const isGuest = order.isGuest && order.guestSessionId === req.headers['x-guest-session'];
    const isAdmin = requestUserRole === 'admin';
    const isStaff = requestUserRole === 'staff';
    const isStaffOrAdmin = isStaff || isAdmin;
    let groupOrder = null;
    let isGroupParticipant = false;

    if (order.isGroupOrder && order.groupOrderId) {
      const GroupOrder = require('../models/GroupOrder');
      groupOrder = await GroupOrder.findById(order.groupOrderId)
        .populate('participants.userId', 'name role');
      isGroupParticipant = Boolean(groupOrder?.participants?.some(
        (participant) => participant.userId?._id?.toString() === requestUserId
          || participant.userId?.toString() === requestUserId
      ));
    }

    if (!isOwner && !isGuest && !isStaffOrAdmin && !isGroupParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (order.status !== 'Completed') {
      return res.status(400).json({ message: 'Receipt is only available for completed orders' });
    }

    // ── Resolve user details ─────────────────────────────────
    const userName = order.isGuest ? 'Guest User' : (order.userId?.name || 'N/A');
    const userEmail = order.isGuest ? (order.guestEmail || '') : (order.userId?.email || 'N/A');
    const userCollegeId = order.isGuest ? 'Guest' : (order.userId?.collegeId || 'N/A');
    const userDepartment = order.isGuest ? 'N/A' : (order.userId?.department || 'N/A');

    // ── Completion date ──────────────────────────────────────
    const completedEntry = [...(order.statusHistory || [])]
      .reverse()
      .find(h => h.status === 'Completed');
    const completedAt = completedEntry?.timestamp
      ? new Date(completedEntry.timestamp)
      : new Date();
    const dateStr = completedAt.toLocaleString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

    // ── Currency helper ──────────────────────────────────────
    const fmt = (v) => `Rs. ${Number(v || 0).toFixed(2)}`;
    const documentNames = Array.isArray(order.documentIds) && order.documentIds.length > 0
      ? order.documentIds.map((document) => document.originalFilename).filter(Boolean).join(', ')
      : 'N/A';
    const formatSplitStatus = (status) => {
      if (status === 'paid') return 'Paid via Wallet';
      if (status === 'declined') return 'Declined';
      return 'Pending';
    };

    // ── Generate HTML PDF with Puppeteer ─────────────────────
    const QRCode = require('qrcode');

    // Prepare data
    const createdAt = new Date(order.createdAt);
    const day = String(createdAt.getDate()).padStart(2, '0');
    const month = String(createdAt.getMonth() + 1).padStart(2, '0');
    const year = createdAt.getFullYear();
    const receiptId = `#${day}${month}${year}-${order.tokenNumber}`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dDay = String(completedAt.getDate()).padStart(2, '0');
    const dMonth = months[completedAt.getMonth()];
    const dYear = completedAt.getFullYear();
    let dHour = completedAt.getHours();
    const dMin = String(completedAt.getMinutes()).padStart(2, '0');
    const dAmPm = dHour >= 12 ? 'PM' : 'AM';
    dHour = dHour % 12 || 12;
    const dHourStr = String(dHour).padStart(2, '0');
    const dateStrFormatted = `${dDay} ${dMonth} ${dYear} &middot; ${dHourStr}:${dMin} ${dAmPm}`;

    let docNameStr = 'N/A';
    if (Array.isArray(order.documentIds) && order.documentIds.length > 0) {
      docNameStr = order.documentIds[0].originalFilename || 'Document';
      if (order.documentIds.length > 1) {
        docNameStr += ` +${order.documentIds.length - 1} more`;
      }
    }

    const pages = order.printConfig?.pageCount || order.pageCount || 'N/A';
    const copies = order.printConfig?.copies || '1';
    const colourMode = order.printConfig?.colourMode || 'N/A';
    const paperSize = order.printConfig?.paperSize || 'A4';
    const binding = order.printConfig?.binding || 'None';
    const orderSummary = `${pages} pages &middot; ${copies} copies &middot; ${colourMode} &middot; ${paperSize} &middot; ${binding}`;

    const totalStr = Number(order.finalCost || order.estimatedCost || 0).toFixed(2);

    const qrJson = JSON.stringify({
      receipt_id: receiptId,
      customer_name: userName,
      college_id: userCollegeId,
      department: userDepartment,
      document: docNameStr,
      service: order.serviceType,
      pages: pages,
      copies: copies,
      colour: colourMode,
      paper: paperSize,
      binding: binding,
      payment_method: order.paymentMethod,
      total: totalStr,
      date: dateStrFormatted.replace(/&middot;/g, '·'),
      status: order.status
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrJson, { margin: 1, width: 120 });

    let groupOrderHtml = '';
    if (order.isGroupOrder && groupOrder) {
      groupOrderHtml = `
        <hr>
        <div class="section-title">PAYMENT BREAKDOWN</div>
      `;
      (groupOrder.participants || []).forEach(p => {
        groupOrderHtml += `
          <div class="row">
            <span>${p.userId?.name || 'Participant'}</span>
            <span>Rs. ${Number(p.amount || 0).toFixed(2)}</span>
          </div>
        `;
      });
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; }
        body {
          font-family: sans-serif;
          margin: 0;
          padding: 40px;
          background: white;
          color: #000;
          font-size: 12px;
          line-height: 1.5;
        }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-family: 'Courier New', monospace; font-size: 28px; letter-spacing: 6px; margin: 0; font-weight: bold; }
        .header p { font-size: 11px; letter-spacing: 3px; color: #000; margin: 5px 0 0; }
        
        hr { border: none; border-top: 1px solid #ccc; margin: 15px 0; }
        
        .meta-row { display: flex; justify-content: space-between; font-family: 'Courier New', monospace; font-size: 11px; margin-bottom: 15px; }
        
        .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; margin-top: 20px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        
        .order-summary { font-size: 11px; color: #555; margin-top: 5px; }
        .pill { border: 1px solid #ccc; background: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        
        .qr-section { text-align: center; margin-top: 30px; margin-bottom: 20px; }
        .qr-img { width: 120px; height: 120px; }
        .qr-id { font-family: 'Courier New', monospace; font-size: 11px; margin-top: 5px; }
        
        .footer { text-align: center; margin-top: 30px; }
        .footer p.thanks { font-weight: bold; margin-bottom: 5px; font-size: 14px; }
        .footer p.muted { font-size: 10px; color: #777; font-variant: small-caps; }
        
        .bold { font-weight: bold; }
        .muted { color: #555; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>R E P O S Y S</h1>
      </div>
      
      <div class="meta-row">
        <span>${receiptId}</span>
        <span>${dateStrFormatted}</span>
      </div>
      
      <hr>
      
      <div class="section-title">CUSTOMER</div>
      <div class="row">
        <span class="bold">${userName} &middot; ${userCollegeId}</span>
        <span>${userDepartment}</span>
      </div>
      <div class="muted">${userEmail}</div>
      
      <hr>
      
      <div class="section-title">ORDER</div>
      <div class="row">
        <span class="bold">${docNameStr}</span>
        <span class="pill">${order.serviceType || 'PRINTING'}</span>
      </div>
      <div class="order-summary">${orderSummary}</div>
      
      <hr>
      
      <div class="section-title">PAYMENT</div>
      <div class="row">
        <span>Method</span>
        <span class="bold" style="text-transform: capitalize;">${order.paymentMethod || 'N/A'}</span>
      </div>
      
      ${groupOrderHtml}
      
      <hr>
      
      <div class="row" style="font-size: 14px; margin-top: 10px;">
        <span class="bold">Total</span>
        <span class="bold">Rs. ${totalStr}</span>
      </div>
      
      <div class="qr-section">
        <img src="${qrCodeDataUrl}" class="qr-img" />
        <div class="qr-id">${receiptId}</div>
      </div>
      
      <div class="footer">
        <p class="thanks">Thank you, ${userName.split(' ')[0]}. Your document is ready.</p>
        <p class="muted">SHOW THIS RECEIPT TO COLLECT YOUR PRINTOUT</p>
      </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="receipt-${order.tokenNumber}.pdf"`
    );

    let browser;
    try {
      if (process.env.NODE_ENV === 'production') {
        const puppeteer = require('puppeteer-core');
        const chromiumModule = require('@sparticuz/chromium');
        const chromium = chromiumModule.default || chromiumModule;
        browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
      } else {
        const puppeteer = require('puppeteer');
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      }

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const pdfUint8Array = await page.pdf({ format: 'A5', printBackground: true });
      res.end(Buffer.from(pdfUint8Array));
    } finally {
      if (browser) {
        await browser.close();
      }
    }

  } catch (error) {
    return next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email role')
      .populate('documentIds')
      .populate('assignedStaffId');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isGuestOwner = order.isGuest === true && req.user?.isGuest === true && order.guestSessionId === req.user?.sessionId;
    const isOwner = isGuestOwner || (order.userId && String(order.userId._id || order.userId) === String(req.user?._id));
    let isGroupParticipant = false;

    if (!isOwner && order.isGroupOrder && order.groupOrderId) {
      const GroupOrder = require('../models/GroupOrder');
      const groupOrder = await GroupOrder.findById(order.groupOrderId).select('participants.userId');
      isGroupParticipant = Boolean(groupOrder?.participants?.some(
        (participant) => String(participant.userId) === String(req.user?._id)
      ));
    }

    const hasAccess = isOwner || isGroupParticipant || isPrivilegedRole(req.user?.role);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let qrCodeDataUrl;
    let trackingUrl;
    if (isGuestOwner) {
      const QRCode = require('qrcode');
      trackingUrl = `${getPrimaryFrontendUrl()}/guest/track/${order._id}`;
      qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300
      });
    }

    const responseOrder = order.toObject();
    if (isGroupParticipant && !isOwner && !isPrivilegedRole(req.user?.role)) {
      delete responseOrder.pickupOtp;
      delete responseOrder.pickupOtpExpiry;
    }

    return res.status(200).json({
      success: true,
      order: responseOrder,
      trackingUrl,
      qrCodeDataUrl,
    });
  } catch (error) {
    return next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isGuestOwner = order.isGuest === true && req.user?.isGuest === true && order.guestSessionId === req.user?.sessionId;
    const isOwner = isGuestOwner || (order.userId && String(order.userId) === String(req.user?._id));

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (order.status !== 'In_Queue') {
      return res.status(400).json({ success: false, message: 'Only in-queue orders can be cancelled.' });
    }

    const cancelReason = req.body?.cancelReason?.trim() || 'Cancelled by user.';

    const shouldBroadcastQueueUpdate = order.status === 'In_Queue';

    order.status = 'Cancelled';
    order.cancelReason = cancelReason;
    order.statusHistory.push({
      status: 'Cancelled',
      timestamp: new Date(),
      note: cancelReason,
    });

    await order.save();

    if (order.paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ userId: order.userId });
      if (wallet) {
        const amountToRefund = order.finalCost || order.estimatedCost || 0;
        wallet.balance += amountToRefund;
        await wallet.save();

        await WalletTransaction.create({
          walletId: wallet._id,
          type: 'refund',
          amount: amountToRefund,
          orderId: order._id,
          description: 'Refund for cancelled order',
          status: 'success'
        });

        // Set order paymentStatus to Refunded
        order.paymentStatus = 'Refunded';
        await order.save();

        // Update Payment document status to Refunded
        await Payment.findOneAndUpdate(
          { orderId: order._id },
          { status: 'Refunded' }
        );

        await sendPushToUser(order.userId, {
          title: 'Wallet Refunded',
          body: `₹${amountToRefund} was refunded for cancelled order ${order.tokenNumber}.`,
          url: '/wallet'
        });
      }
    }

    if (shouldBroadcastQueueUpdate) {
      await broadcastQueueUpdate(order.serviceType);
    }

    await createTargetedStaffNotification({
      order,
      title: 'Order Cancelled',
      message: `Order ${order.tokenNumber} has been cancelled by the user`,
      relatedOrderId: order._id,
      relatedServiceType: order.serviceType,
    });

    try {
      const io = require('../socket/socketHandler').getIO();
      io.to('public-track:' + order._id.toString()).emit('order_status_update', {
        status: order.status,
        updatedAt: new Date()
      });
    } catch (e) {
      // Ignore if socket not ready
    }

    const notifyEmail = order.isGuest ? order.guestEmail : req.user?.email;

    if (notifyEmail) {
      try {
        await sendEmail(
          notifyEmail,
          'Reposys - Order Cancelled',
          buildOrderCancelledEmail({
            name: order.isGuest ? 'Guest' : req.user?.name,
            tokenNumber: order.tokenNumber,
            reason: cancelReason,
          })
        );
      } catch (emailError) {
        console.error('Failed to send order cancellation email:', emailError);
      }
    }

    try {
      const eventDispatcher = require('../services/eventDispatcher');
      eventDispatcher.emit('ORDER_CANCELLED', { orderId: order._id });
    } catch (dispatchErr) {
      console.warn('[orderController] EventDispatcher emit failed:', dispatchErr.message);
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(error);
  }
};

exports.trackOrder = async (req, res, next) => {
  try {
    const queryId = req.params.orderId;
    let order;

    if (mongoose.isValidObjectId(queryId)) {
      order = await Order.findById(queryId);
    } else {
      // Allow tracking by token number
      order = await Order.findOne({ tokenNumber: queryId.toUpperCase() });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Compute live queue position and estimated wait for active orders
    let queuePosition = null;
    let estimatedWait = null;

    if (['In_Queue', 'Processing'].includes(order.status)) {
      try {
        const { getWaitTime } = require('../services/queueService');
        const waitData = await getWaitTime(order._id);
        queuePosition = waitData.position;
        estimatedWait = waitData.waitMinutes;
      } catch {
        // Not in active queue — leave null
      }
    }

    const publicOrder = {
      _id: order._id,
      tokenNumber: order.tokenNumber,
      serviceType: order.serviceType,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      isGuest: order.isGuest,
      estimatedDuration: order.estimatedDuration,
      createdAt: order.createdAt,
      queuePosition,
      estimatedWait,
      // Only expose OTP when the order is actually ready for collection
      pickupOtp: order.status === 'ReadyForPickup' ? order.pickupOtp : null,
      statusHistory: (order.statusHistory || []).map((history) => ({
        status: history.status,
        timestamp: history.timestamp,
        note: history.note,
      })),
    };

    return res.status(200).json({
      success: true,
      order: publicOrder,
    });
  } catch (error) {
    return next(error);
  }
};
