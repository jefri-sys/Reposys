const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');
const { sendEmail, buildOrderReadyEmail } = require('../config/nodemailer');
const socketHandler = require('../socket/socketHandler');
const { getQueue, broadcastQueueUpdate } = require('../services/queueService');
const { createNotification } = require('../services/notificationService');
const { sendPushToUser } = require('../utils/pushService');
const { calculateCost } = require('../services/pricingService');
const { generateTokenNumber, calculateEstimatedDuration } = require('../utils/orderHelpers');
const { getShopStatusDetails } = require('../utils/shopStatus');

const QUEUE_SERVICE_TYPES = ['Printing', 'Photocopying', 'Scanning', 'Binding'];
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const PICKUP_OTP_VALIDITY_MS = 24 * 60 * 60 * 1000;
const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const buildStatusHistoryEntry = (status, user, note) => ({
  status,
  actorId: user?.id || null,
  actorRole: user?.role || 'System',
  timestamp: new Date(),
  ...(note ? { note } : {}),
});

const buildOrderCostConfig = (order, pageCount = order.pageCount) => ({
  serviceType: order.serviceType,
  pageCount,
  copies: order.printConfig?.copies || 1,
  colourMode: order.printConfig?.colourMode,
  sided: order.printConfig?.sided,
  binding: order.printConfig?.binding,
  documentCount: Array.isArray(order.documentIds) ? order.documentIds.length : 0,
});

const loadOrderById = async (orderId) => {
  if (!mongoose.isValidObjectId(orderId)) {
    return null;
  }

  return Order.findById(orderId);
};

const syncCashPaymentRecord = async (order) => {
  if (!order?._id || order.paymentMethod !== 'Cash') {
    return null;
  }

  const amount = order.finalCost || order.estimatedCost || 0;
  let payment = await Payment.findOne({ orderId: order._id, method: 'Cash' }).sort({ createdAt: -1 });

  if (!payment) {
    payment = new Payment({
      orderId: order._id,
      userId: order.userId || null,
      amount,
      currency: 'INR',
      status: 'Paid',
      method: 'Cash',
    });
  } else {
    payment.amount = amount;
    payment.status = 'Paid';
  }

  await payment.save();
  return payment;
};

const resolveOrderContact = async (order) => {
  if (order.isGuest === true) {
    return {
      email: order.guestEmail || '',
      user: null,
    };
  }

  if (!order.userId) {
    return {
      email: '',
      user: null,
    };
  }

  const user = await User.findById(order.userId).select('email name');
  return {
    email: user?.email || '',
    user,
  };
};

const emitOrderUpdate = (order) => {
  try {
    const io = socketHandler.getIO();
    const payload = {
      type: 'order_update',
      orderId: order._id,
      order: order.toObject(),
    };

    io.to('public-track:' + order._id.toString()).emit('order_status_update', {
      status: order.status,
      updatedAt: new Date(),
    });

    if (order.isGuest === true && order.guestSessionId) {
      io.to(`guest:${order.guestSessionId}`).emit('order_update', payload);
      return;
    }

    if (order.userId) {
      io.to(`user:${order.userId}`).emit('order_update', payload);
    }
  } catch (socketError) {
    // Socket.io may not be initialized during isolated tests.
  }
};

const computeIsPrimary = (order, staffAssignment) => {
  if (staffAssignment === 'All') {
    return true;
  }

  // Map assignment to the matching order field
  if (staffAssignment === 'Guest') {
    return order.isGuest === true;
  }

  // Student or Faculty — match the order's userRole field
  return order.userRole === staffAssignment || order.userId?.role === staffAssignment;
};

exports.getQueue = async (req, res, next) => {
  try {
    // Fetch this staff member's current assignment fresh every request
    const staffUser = await User.findById(req.user.id).select('queueAssignment');
    const staffAssignment = staffUser?.queueAssignment || 'All';

    const { serviceType } = req.query;

    if (serviceType) {
      if (!QUEUE_SERVICE_TYPES.includes(serviceType)) {
        return res.status(400).json({ success: false, message: 'Invalid service type.' });
      }

      const queue = await getQueue(serviceType);
      const annotatedQueue = queue.map((order) => ({
        ...order,
        isPrimary: computeIsPrimary(order, staffAssignment),
      }));

      return res.status(200).json({
        success: true,
        staffAssignment,
        queue: annotatedQueue,
      });
    }

    const [Printing, Photocopying, Scanning, Binding] = await Promise.all(
      QUEUE_SERVICE_TYPES.map((type) => getQueue(type))
    );

    const annotate = (queue) => queue.map((order) => ({
      ...order,
      isPrimary: computeIsPrimary(order, staffAssignment),
    }));

    return res.status(200).json({
      success: true,
      staffAssignment,
      Printing: annotate(Printing),
      Photocopying: annotate(Photocopying),
      Scanning: annotate(Scanning),
      Binding: annotate(Binding),
    });
  } catch (error) {
    return next(error);
  }
};

exports.getCompletedOrders = async (req, res, next) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 12;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [orders, completedToday] = await Promise.all([
      Order.find({ status: 'Completed' })
        .populate('userId', 'name role department')
        .populate('assignedStaffId', 'name role')
        .populate('documentIds')
        .sort({ updatedAt: -1 })
        .limit(limit),
      Order.countDocuments({
        status: 'Completed',
        updatedAt: { $gte: todayStart },
      }),
    ]);

    return res.status(200).json({
      success: true,
      orders,
      completedToday,
    });
  } catch (error) {
    return next(error);
  }
};

exports.lockOrder = async (req, res, next) => {
  try {
    const order = await loadOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const lockCutoff = Date.now() - LOCK_TIMEOUT_MS;
    const isLockedByAnotherStaff = Boolean(
      order.lockedBy
      && order.lockedAt
      && order.lockedAt.getTime() > lockCutoff
      && String(order.lockedBy) !== String(req.user.id)
    );

    if (isLockedByAnotherStaff) {
      return res.status(409).json({
        success: false,
        message: 'Order is being reviewed by another staff member',
      });
    }

    order.lockedBy = req.user.id;
    order.lockedAt = new Date();
    await order.save();

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(error);
  }
};

exports.unlockOrder = async (req, res, next) => {
  try {
    const order = await loadOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.otpLocked === true && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'OTP collection lock requires admin unlock.' });
    }

    order.lockedBy = null;
    order.lockedAt = null;
    if (req.user.role === 'Admin') {
      order.otpLocked = false;
      order.otpAttempts = 0;
    }
    await order.save();

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(error);
  }
};

exports.startProcessing = async (req, res, next) => {
  try {
    const systemConfig = await SystemConfig.getInstance();
    const { isOpen } = getShopStatusDetails(systemConfig, new Date());
    const isShopClosed = !isOpen;

    if (isShopClosed) {
      return res.status(403).json({
        success: false,
        message: 'Shop is currently closed. Cannot start processing.',
      });
    }

    const order = await loadOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.status !== 'In_Queue') {
      return res.status(400).json({ success: false, message: 'Order is not in queue.' });
    }

    order.status = 'Processing';
    order.assignedStaffId = req.user.id;
    order.lockedBy = null;
    order.lockedAt = null;
    order.statusHistory.push(
      buildStatusHistoryEntry('Processing', req.user, 'Order moved into active processing.')
    );
    await order.save();

    try {
      const PrintJob = require('../models/PrintJob');
      const { createPrintJobForOrder, dispatchPrintJob, assignPrinter } = require('../services/automationService');
      let printJob = await PrintJob.findOne({ orderId: order._id });

      if (systemConfig.spae?.enabled) {
        if (!printJob) {
          // Create it now if missing
          const result = await createPrintJobForOrder(order, systemConfig);
          if (result && result.success) {
            printJob = result.job;
          }
        } else if (printJob.printerId === 'MANUAL' || printJob.status === 'Manual Required') {
          // Retry printer assignment now that staff is starting processing (maybe a printer is online now!)
          const assigned = await assignPrinter(order);
          if (assigned) {
            printJob.printerId = assigned.printerId;
            printJob.printerName = assigned.printerName;
            printJob.agentId = assigned.agentId;
            printJob.windowsPrinterName = assigned.windowsPrinterName;
            printJob.status = 'Assigned';
            await printJob.save();
          }
        }
      }

      if (printJob) {
        if (['Pending', 'Queued', 'Assigned'].includes(printJob.status)) {
          printJob.status = 'Dispatching';
          printJob.startedAt = new Date();
          await printJob.save();
        }

        if (systemConfig.spae?.enabled && printJob.printerId && printJob.printerId !== 'MANUAL') {
          // Dispatch it to the Print Agent
          await dispatchPrintJob(printJob);
        }
      }
    } catch (printJobErr) {
      console.warn('[staffController] PrintJob status update failed in startProcessing:', printJobErr.message);
    }

    if (order.userId) {
      await createNotification({
        recipientId: order.userId,
        title: 'Order Being Processed',
        message: `Your order ${order.tokenNumber} is now being processed.`,
        type: 'order_update',
      });
    }

    emitOrderUpdate(order);
    await broadcastQueueUpdate(order.serviceType);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(error);
  }
};

exports.collectCash = async (req, res, next) => {
  try {
    const order = await loadOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.paymentMethod !== 'Cash' || order.paymentStatus !== 'Cash_Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only cash orders with pending collection can be marked as collected.',
      });
    }

    if (order.status !== 'ReadyForPickup') {
      return res.status(400).json({
        success: false,
        message: 'Cash can only be collected when the order is ready for pickup.',
      });
    }

    order.paymentStatus = 'Cash_Collected';
    order.statusHistory.push(
      buildStatusHistoryEntry('ReadyForPickup', req.user, 'Cash payment collected at the counter.')
    );
    await order.save();

    const systemConfig = await SystemConfig.getInstance();
    const { scheduleAutoProcessingIfEnabled } = require('../utils/autoProcessingScheduler');
    await scheduleAutoProcessingIfEnabled(order, systemConfig);

    await syncCashPaymentRecord(order);

    try {
      const eventDispatcher = require('../services/eventDispatcher');
      eventDispatcher.emit('CASH_CONFIRMED', { orderId: order._id, order });
    } catch (dispatchErr) {
      console.warn('[staffController] EventDispatcher emit failed:', dispatchErr.message);
    }

    emitOrderUpdate(order);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(error);
  }
};

exports.readyForPickup = async (req, res, next) => {
  try {
    const order = await loadOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.status !== 'Processing') {
      return res.status(400).json({ success: false, message: 'Order is not being processed.' });
    }

    const { email, user } = await resolveOrderContact(order);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Order does not have a valid email address for pickup notification.',
      });
    }

    const pickupOtp = Math.floor(1000 + (Math.random() * 9000)).toString();
    order.pickupOtp = pickupOtp;
    order.pickupOtpExpiry = new Date(Date.now() + PICKUP_OTP_VALIDITY_MS);
    order.pickupOtpVerified = false;
    order.otpAttempts = 0;
    order.otpLocked = false;
    order.status = 'ReadyForPickup';
    order.lockedBy = null;
    order.lockedAt = null;
    order.statusHistory.push(
      buildStatusHistoryEntry('ReadyForPickup', req.user, 'Pickup OTP generated and sent to the user.')
    );
    await order.save();

    try {
      const PrintJob = require('../models/PrintJob');
      const printJob = await PrintJob.findOne({ orderId: order._id });
      if (printJob && !['Completed', 'Cancelled', 'Failed'].includes(printJob.status)) {
        printJob.status = 'Completed';
        printJob.completedAt = new Date();
        await printJob.save();
      }
    } catch (printJobErr) {
      console.warn('[staffController] PrintJob status update failed in readyForPickup:', printJobErr.message);
    }

    await sendEmail(
      email,
      'Your order is ready for pickup',
      buildOrderReadyEmail({
        name: user?.name,
        tokenNumber: order.tokenNumber,
        serviceType: order.serviceType,
        otp: pickupOtp,
      })
    );

    if (!order.isGuest && order.userId) {
      await createNotification({
        recipientId: order.userId,
        title: 'Order Ready for Pickup',
        message: `Your order ${order.tokenNumber} is ready. Check your email for the pickup OTP.`,
        type: 'order_update',
      });

      sendPushToUser(order.userId.toString(), {
        title: 'Order Ready for Pickup',
        body: `Your order ${order.tokenNumber} is ready. OTP: ${order.pickupOtp}`,
        url: `/orders/${order._id}`,
      }).catch(() => {});
    }

    // Notify group order participants that order is ready
    if (order.isGroupOrder && order.groupOrderId) {
      try {
        const GroupOrder = require('../models/GroupOrder');
        const groupOrder = await GroupOrder.findById(order.groupOrderId);
        if (groupOrder) {
          for (const participant of groupOrder.participants) {
            sendPushToUser(participant.userId.toString(), {
              title: 'Group Order Ready',
              body: `Your group order is ready for pickup. ${user?.name || 'The creator'} will collect it and distribute.`,
              data: {
                url: `/orders/${order._id}`
              }
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Failed to notify group order participants:', err);
      }
    }

    emitOrderUpdate(order);
    await broadcastQueueUpdate(order.serviceType);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const order = await loadOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.status !== 'ReadyForPickup') {
      return res.status(400).json({ success: false, message: 'Order is not ready for pickup.' });
    }

    const otp = String(req.body?.otp || '').trim();
    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required.' });
    }

    if (order.otpLocked === true) {
      return res.status(403).json({ success: false, message: 'Collection locked. Contact admin to unlock.' });
    }

    if (!order.pickupOtpExpiry || order.pickupOtpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP expired. User must request a new one.' });
    }

    if (otp !== order.pickupOtp) {
      order.otpAttempts = (Number(order.otpAttempts) || 0) + 1;
      if (order.otpAttempts >= 3) {
        order.otpLocked = true;
        await order.save();

        return res.status(403).json({
          success: false,
          message: 'Collection locked. Admin unlock required.',
          attemptsRemaining: 0,
        });
      }
      await order.save();

      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP',
        attemptsRemaining: Math.max(0, 3 - order.otpAttempts),
      });
    }

    order.status = 'Completed';
    order.pickupOtpVerified = true;
    order.pickupOtp = null;
    order.pickupOtpExpiry = null;
    order.otpAttempts = 0;
    order.otpLocked = false;
    order.lockedBy = null;
    order.lockedAt = null;
    if (order.paymentMethod === 'Cash' && order.paymentStatus === 'Cash_Pending') {
      order.paymentStatus = 'Cash_Collected';
    }
    order.statusHistory.push(
      buildStatusHistoryEntry('Completed', req.user, 'Pickup OTP verified and order completed.')
    );
    await order.save();

    if (order.paymentMethod === 'Cash' && order.paymentStatus === 'Cash_Collected') {
      await syncCashPaymentRecord(order);
    }

    if (order.userId) {
      await User.findByIdAndUpdate(order.userId, {
        $inc: {
          totalOrders: 1,
          totalSpend: order.finalCost || order.estimatedCost || 0,
        },
      });
      await createNotification({
        recipientId: order.userId,
        title: 'Order Completed',
        message: `Your order ${order.tokenNumber} is complete. Thank you!`,
        type: 'order_update',
      });
      await createNotification({
        recipientId: order.userId,
        title: 'Rate Your Experience',
        message: `How was your experience with order ${order.tokenNumber}? Tap to rate.`,
        type: 'rating_prompt',
        relatedOrderId: order._id,
      });
    }

    emitOrderUpdate(order);
    await broadcastQueueUpdate(order.serviceType);

    // Auto-deduct inventory — non-blocking, order completion takes priority
    try {
      const { deductInventory } = require('../services/inventoryService')
      await deductInventory(order)
    } catch (inventoryError) {
      console.error('Inventory deduction error (non-blocking):', inventoryError.message)
    }

    return res.status(200).json({
      success: true,
      message: 'Order completed successfully',
    });
  } catch (error) {
    return next(error);
  }
};

exports.partialOrder = async (req, res, next) => {
  try {
    const order = await loadOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.status !== 'Processing') {
      return res.status(400).json({ success: false, message: 'Only processing orders can be partially completed.' });
    }

    const pagesCompleted = Number(req.body?.pagesCompleted);
    if (!Number.isFinite(pagesCompleted) || pagesCompleted <= 0 || pagesCompleted > Number(order.pageCount || 0)) {
      return res.status(400).json({
        success: false,
        message: `pagesCompleted must be between 1 and ${order.pageCount || 0}.`,
      });
    }

    order.partialPagesCompleted = pagesCompleted;
    order.otpAttempts = 0;
    order.otpLocked = false;
    order.lockedBy = null;
    order.lockedAt = null;

    order.statusHistory.push(
      buildStatusHistoryEntry(
        'Processing',
        req.user,
        `Recorded partial completion: ${pagesCompleted} of ${order.pageCount} pages.`
      )
    );

    await order.save();

    if (order.userId) {
      await createNotification({
        recipientId: order.userId,
        title: 'Order Progress Update',
        message: `Your order ${order.tokenNumber} has been updated: ${pagesCompleted} of ${order.pageCount} pages are ready.`,
        type: 'order_update',
      });
    }

    emitOrderUpdate(order);
    await broadcastQueueUpdate(order.serviceType);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(error);
  }
};
