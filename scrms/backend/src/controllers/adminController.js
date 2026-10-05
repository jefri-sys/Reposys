const mongoose = require('mongoose');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const GroupOrder = require('../models/GroupOrder');
const SystemConfig = require('../models/SystemConfig');
const {
  sendEmail,
  isSandboxMail,
  buildStaffWelcomeEmail,
  buildShopClosedEmail,
} = require('../config/nodemailer');
const { createNotification } = require('../services/notificationService');
const { getQueue, broadcastQueueUpdate } = require('../services/queueService');
const socketHandler = require('../socket/socketHandler');
const { log: logActivity } = require('../utils/activityLogger');
const { getPrimaryFrontendUrl } = require('../config/origins');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
const TEMP_PASSWORD_SPECIALS = '!@#$%^&*()_+-=[]{};:,.<>/?';

const getOptionalModelCount = async (modelName, filter) => {
  try {
    const model = mongoose.model(modelName);
    return await model.countDocuments(filter);
  } catch (error) {
    if (
      error?.name === 'MissingSchemaError'
      || error?.codeName === 'NamespaceNotFound'
      || error?.message?.includes('ns does not exist')
    ) {
      return 0;
    }

    throw error;
  }
};

const buildTempPassword = () => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const allChars = `${uppercase}${lowercase}${numbers}${TEMP_PASSWORD_SPECIALS}`;

  const pick = (chars) => chars[crypto.randomInt(0, chars.length)];

  const passwordChars = [
    pick(uppercase),
    pick(numbers),
    pick(TEMP_PASSWORD_SPECIALS),
  ];

  while (passwordChars.length < 10) {
    passwordChars.push(pick(allChars));
  }

  for (let index = passwordChars.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    [passwordChars[index], passwordChars[swapIndex]] = [passwordChars[swapIndex], passwordChars[index]];
  }

  return passwordChars.join('');
};

const parsePositiveInteger = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const parseDateFilter = (value, endOfDay = false) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  if (endOfDay) {
    parsedDate.setHours(23, 59, 59, 999);
  } else {
    parsedDate.setHours(0, 0, 0, 0);
  }

  return parsedDate;
};

const getSafeUserProjection = () => '-password';

const normalizePaymentStatus = (payment) => {
  if (payment?.method === 'Cash' && payment?.orderId?.paymentStatus === 'Cash_Collected') {
    return 'Paid';
  }

  return payment?.status;
};

const buildSyntheticCashPayment = (order) => ({
  _id: `synthetic-cash-${order._id}`,
  orderId: {
    _id: order._id,
    tokenNumber: order.tokenNumber,
    serviceType: order.serviceType,
    estimatedCost: order.estimatedCost,
    status: order.status,
    paymentStatus: order.paymentStatus,
  },
  userId: order.userId,
  amount: order.finalCost || order.estimatedCost || 0,
  currency: 'INR',
  status: order.paymentStatus === 'Cash_Collected' ? 'Paid' : 'Created',
  displayStatus: order.paymentStatus === 'Cash_Collected' ? 'Paid' : 'Created',
  method: 'Cash',
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  isSynthetic: true,
});

exports.getUsers = async (req, res, next) => {
  try {
    const {
      search,
      role,
      department,
      isActive,
    } = req.query;

    const page = parsePositiveInteger(req.query.page, 1);
    const limit = Math.min(parsePositiveInteger(req.query.limit, 20), 100);
    const query = {};

    const normalizedSearch = search?.trim();

    if (normalizedSearch) {
      const searchRegex = new RegExp(escapeRegExp(normalizedSearch), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { collegeId: searchRegex },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (department) {
      query.department = department;
    }

    if (typeof isActive !== 'undefined') {
      query.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select(getSafeUserProjection())
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [user, orders] = await Promise.all([
      User.findById(req.params.id).select(getSafeUserProjection()),
      Order.find({ userId: req.params.id }).sort({ createdAt: -1 }),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      user,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const [
      totalOrdersToday,
      ordersInQueue,
      ordersProcessing,
      ordersReadyForPickup,
      revenueAggregation,
      openComplaints,
      itemsBelowThreshold,
      uncollectedOrders,
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: todayMidnight } }),
      Order.countDocuments({ status: 'In_Queue' }),
      Order.countDocuments({ status: 'Processing' }),
      Order.countDocuments({ status: 'ReadyForPickup' }),
      Order.aggregate([
        {
          $match: {
            paymentStatus: 'Paid',
            createdAt: { $gte: todayMidnight },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$estimatedCost' },
          },
        },
      ]),
      getOptionalModelCount('Complaint', {
        status: { $in: ['Open', 'In_Progress'] },
      }),
      getOptionalModelCount('InventoryItem', {
        $expr: { $lte: ['$currentStock', '$minimumThreshold'] },
      }),
      Order.countDocuments({ status: 'Uncollected' }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalOrdersToday,
        ordersInQueue,
        ordersProcessing,
        ordersReadyForPickup,
        revenueToday: revenueAggregation[0]?.total || 0,
        openComplaints,
        itemsBelowThreshold,
        uncollectedOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getPricing = async (req, res, next) => {
  try {
    const config = await SystemConfig.getInstance();

    return res.status(200).json({
      pricing: config.pricing,
      orderLimits: config.orderLimits,
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePricing = async (req, res, next) => {
  try {
    const config = await SystemConfig.getInstance();
    const updates = {};
    const pricingUpdates = req.body?.pricing || {};
    const orderLimitUpdates = req.body?.orderLimits || {};

    for (const [field, nextValue] of Object.entries(pricingUpdates)) {
      if (typeof nextValue === 'undefined') {
        continue;
      }

      if (config.pricing?.[field] !== nextValue) {
        await logActivity({
          actionType: 'UPDATE_PRICING',
          performedBy: req.user.id,
          description: `Admin updated pricing.${field}`,
          affectedRecordId: config._id,
          metadata: {
            field: `pricing.${field}`,
            oldValue: config.pricing?.[field],
            newValue: nextValue,
          },
        });
      }

      updates[`pricing.${field}`] = nextValue;
    }

    for (const [field, nextValue] of Object.entries(orderLimitUpdates)) {
      if (typeof nextValue !== 'undefined') {
        updates[`orderLimits.${field}`] = nextValue;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(200).json(config);
    }

    const updatedConfig = await SystemConfig.findByIdAndUpdate(
      config._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json(updatedConfig);
  } catch (error) {
    next(error);
  }
};

exports.toggleShopStatus = async (req, res, next) => {
  try {
    const config = await SystemConfig.getInstance();
    const requestedState = Object.prototype.hasOwnProperty.call(req.body || {}, 'isManuallyOpen')
      ? req.body.isManuallyOpen
      : undefined;
    const nextState = typeof requestedState === 'undefined'
      ? (
        config.isManuallyOpen === null
          ? true
          : config.isManuallyOpen === true
            ? false
            : null
      )
      : requestedState;

    config.isManuallyOpen = nextState;
    if (nextState === true) config.shopMode = 'manual_open';
    else if (nextState === false) config.shopMode = 'manual_close';
    else config.shopMode = 'schedule';

    let message = 'Shop status now follows the configured schedule.';

    if (nextState === false) {
      message = 'Shop has been manually closed.';

      try {
        socketHandler.getIO().emit('shop_closed', {
          type: 'shop_closed',
        });
      } catch (socketError) {
        // Socket server may not be initialized during isolated tests.
      }

      const queuedOrders = await Order.find({ status: 'In_Queue' })
        .select('userId tokenNumber serviceType')
        .populate('userId', 'name email');
      const recipientIds = [...new Set(
        queuedOrders
          .map((order) => order.userId?._id?.toString())
          .filter(Boolean)
      )];

      await Promise.all(
        recipientIds.map((recipientId) => createNotification({
          recipientId,
          title: 'Shop Closed',
          message: 'The reprography centre has closed. Your order will be processed when it reopens.',
          type: 'system',
        }))
      );

      const emailResults = await Promise.allSettled(
        queuedOrders
          .filter((order) => order.userId?.email)
          .map((order) => sendEmail(
            order.userId.email,
            'Reposys - Reprography Centre Closed',
            buildShopClosedEmail({
              name: order.userId.name,
              tokenNumber: order.tokenNumber,
            })
          ))
      );

      const failedShopClosedEmails = emailResults.filter((result) => result.status === 'rejected');
      if (failedShopClosedEmails.length > 0) {
        console.error(`Failed to send ${failedShopClosedEmails.length} shop closed email(s).`);
      }
    }

    if (nextState === true) {
      message = 'Shop has been manually opened.';

      try {
        socketHandler.getIO().emit('shop_opened', {
          type: 'shop_opened',
        });
      } catch (socketError) {
        // Socket server may not be initialized during isolated tests.
      }
    }

    await config.save();

    return res.status(200).json({
      isManuallyOpen: config.isManuallyOpen,
      message,
    });
  } catch (error) {
    next(error);
  }
};

exports.followSchedule = async (req, res) => {
  try {
    // Get current IST time without any timezone library
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const day = istTime.getUTCDay(); // 0 = Sunday, 6 = Saturday

    // Determine if shop should be open right now based on schedule
    // Monday-Saturday (day 1-6), 9:00am to 5:00pm IST
    const currentMinutes = hours * 60 + minutes;
    const openMinutes = 9 * 60;   // 9:00 AM
    const closeMinutes = 17 * 60; // 5:00 PM

    const shouldBeOpen = day !== 0 &&
                         currentMinutes >= openMinutes &&
                         currentMinutes < closeMinutes;

    // Update SystemConfig
    // Use the exact same SystemConfig query pattern as Force Open/Close
    const config = await SystemConfig.getInstance();

    config.shopMode = 'schedule';
    // Set the isOpen field using the exact same field name as
    // Force Open and Force Close use
    config.isManuallyOpen = shouldBeOpen;
    await config.save();

    // Emit Socket.io event using the exact same event name and
    // payload structure as Force Open and Force Close
    // Use the exact same io access pattern already in this controller
    try {
      const ioEvent = shouldBeOpen ? 'shop_opened' : 'shop_closed';
      socketHandler.getIO().emit(ioEvent, {
        type: ioEvent,
      });
    } catch (socketError) {
      // Socket server may not be initialized during isolated tests.
    }

    return res.status(200).json({
      success: true,
      isOpen: shouldBeOpen,
      shopMode: 'schedule',
      message: shouldBeOpen
        ? 'Now following schedule — shop is currently open'
        : 'Now following schedule — shop is currently closed'
    });

  } catch (err) {
    console.error('followSchedule error:', err);
    return res.status(500).json({ message: 'Failed to set schedule mode' });
  }
};

exports.reorderQueue = async (req, res, next) => {
  try {
    const reason = req.body?.reason?.trim();
    const requestedPosition = Number.parseInt(req.body?.newPosition, 10);

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Reason is required for queue reorder' });
    }

    if (!mongoose.isValidObjectId(req.body?.orderId)) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = await Order.findById(req.body.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const queue = await getQueue(order.serviceType);
    const currentIndex = queue.findIndex((queueOrder) => String(queueOrder._id) === String(order._id));

    if (currentIndex === -1) {
      return res.status(400).json({ success: false, message: 'Order is not currently in the queue.' });
    }

    if (!Number.isFinite(requestedPosition) || requestedPosition < 1 || requestedPosition > queue.length) {
      return res.status(400).json({ success: false, message: 'newPosition must be between 1 and the queue length.' });
    }

    const currentPosition = currentIndex + 1;
    const reorderedQueue = [...queue];
    reorderedQueue.splice(currentIndex, 1);
    reorderedQueue.splice(requestedPosition - 1, 0, queue[currentIndex]);

    let newScore;
    if (requestedPosition === 1) {
      newScore = reorderedQueue[1]
        ? reorderedQueue[1].priorityScore - 10
        : queue[0].priorityScore - 10;
    } else if (requestedPosition === reorderedQueue.length) {
      newScore = reorderedQueue[reorderedQueue.length - 2]
        ? reorderedQueue[reorderedQueue.length - 2].priorityScore + 10
        : queue[queue.length - 1].priorityScore + 10;
    } else {
      newScore = Math.floor(
        (reorderedQueue[requestedPosition - 2].priorityScore + reorderedQueue[requestedPosition].priorityScore) / 2
      );
    }

    order.priorityScore = newScore;
    await order.save();

    await logActivity({
      actionType: 'QUEUE_REORDER',
      performedBy: req.user.id,
      description: `Admin repositioned ${order.tokenNumber} from position ${currentPosition} to ${requestedPosition}. Reason: ${reason}`,
      affectedRecordId: order._id,
      metadata: {
        serviceType: order.serviceType,
        reason,
        previousPosition: currentPosition,
        newPosition: requestedPosition,
      },
    });

    await broadcastQueueUpdate(order.serviceType);

    return res.status(200).json({
      success: true,
      order,
      newPosition: requestedPosition,
    });
  } catch (error) {
    next(error);
  }
};

exports.getActivityLogs = async (req, res, next) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = Math.min(parsePositiveInteger(req.query.limit, 20), 100);
    const query = {};
    const normalizedSearch = req.query.search?.trim();
    const startDate = parseDateFilter(req.query.startDate);
    const endDate = parseDateFilter(req.query.endDate, true);

    if (req.query.actionType) {
      query.actionType = req.query.actionType;
    }

    if (normalizedSearch) {
      query.description = { $regex: escapeRegExp(normalizedSearch), $options: 'i' };
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = startDate;
      }
      if (endDate) {
        query.timestamp.$lte = endDate;
      }
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .populate('performedBy', 'name role')
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ActivityLog.countDocuments(query),
    ]);

    return res.status(200).json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

exports.createStaff = async (req, res, next) => {
  try {
    const normalizedEmail = req.body.email?.trim().toLowerCase();
    const trimmedDepartment = req.body.department?.trim();
    const trimmedName = req.body.name?.trim() || 'Counter Staff';
    const trimmedPhone = req.body.phone?.trim();

    if (!normalizedEmail || !trimmedDepartment) {
      return res.status(400).json({ success: false, message: 'Email and department are required.' });
    }

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const tempPassword = buildTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const staffCollegeId = `STAFF-${Date.now()}`;

    const staffUser = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      collegeId: staffCollegeId,
      department: trimmedDepartment,
      phone: trimmedPhone,
      role: 'Staff',
      pendingRole: null,
      pendingRoleApproval: false,
      verified: true,
      isActive: true,
    });

    const loginUrl = `${getPrimaryFrontendUrl()}/login`;

    try {
      await sendEmail(
        normalizedEmail,
        'Your Reposys Staff Account',
        buildStaffWelcomeEmail({
          name: trimmedName,
          email: normalizedEmail,
          tempPassword,
          loginUrl,
        })
      );
    } catch (error) {
      await User.deleteOne({ _id: staffUser._id });
      throw error;
    }

    await logActivity({
      actionType: 'CREATE_STAFF',
      performedBy: req.user.id,
      description: `Admin created Counter Staff account for ${normalizedEmail}`,
      affectedRecordId: staffUser._id,
      metadata: { role: 'Staff' },
    });

    return res.status(201).json({
      message: 'Staff account created',
      email: normalizedEmail,
      mailMode: isSandboxMail() ? 'sandbox' : 'smtp',
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleUserActive = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = !user.isActive;
    if (!user.isActive) {
      user.sessionInvalidatedAt = new Date();
    }

    await user.save();

    await logActivity({
      actionType: 'TOGGLE_USER_ACTIVE',
      performedBy: req.user.id,
      description: `Admin ${user.isActive ? 'activated' : 'deactivated'} account for ${user.email}`,
      affectedRecordId: user._id,
      metadata: { isActive: user.isActive },
    });

    const sanitizedUser = await User.findById(user._id).select(getSafeUserProjection());

    return res.status(200).json({
      user: sanitizedUser,
    });
  } catch (error) {
    next(error);
  }
};

exports.setLimitOverride = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { service, maxPages, validUntil } = req.body;
    const parsedMaxPages = Number(maxPages);
    const parsedValidUntil = new Date(validUntil);

    if (!service || !Number.isFinite(parsedMaxPages) || parsedMaxPages <= 0 || Number.isNaN(parsedValidUntil.getTime())) {
      return res.status(400).json({ success: false, message: 'service, maxPages, and validUntil are required.' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.limitOverrides.push({
      service,
      maxPages: parsedMaxPages,
      validUntil: parsedValidUntil,
    });

    await user.save();

    await logActivity({
      actionType: 'SET_LIMIT_OVERRIDE',
      performedBy: req.user.id,
      description: `Admin set limit override for ${user.email} on ${service}`,
      affectedRecordId: user._id,
      metadata: {
        service,
        maxPages: parsedMaxPages,
        validUntil: parsedValidUntil,
      },
    });

    const sanitizedUser = await User.findById(user._id).select(getSafeUserProjection());

    return res.status(200).json({
      user: sanitizedUser,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = Math.min(parsePositiveInteger(req.query.limit, 20), 100);
    const query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.method) {
      query.method = req.query.method;
    }

    const payments = await Payment.find(query)
      .populate('userId', 'name email role')
      .populate('orderId', 'tokenNumber serviceType estimatedCost status paymentStatus isGroupOrder groupOrderId')
      .sort({ createdAt: -1 });

    const normalizedPayments = payments.map((payment) => {
      const paymentObject = payment.toObject();
      paymentObject.displayStatus = normalizePaymentStatus(paymentObject);
      return paymentObject;
    });

    let mergedPayments = normalizedPayments;

    if (!req.query.method || req.query.method === 'Cash') {
      const paymentOrderIds = normalizedPayments
        .map((payment) => payment.orderId?._id?.toString())
        .filter(Boolean);

      const legacyCashOrders = await Order.find({
        paymentMethod: 'Cash',
        paymentStatus: { $in: ['Cash_Pending', 'Cash_Collected'] },
        _id: { $nin: paymentOrderIds },
      })
        .populate('userId', 'name email role')
        .select('tokenNumber serviceType estimatedCost finalCost status paymentStatus userId createdAt updatedAt');

      const syntheticCashPayments = legacyCashOrders.map((order) => buildSyntheticCashPayment(order.toObject()));
      mergedPayments = [...normalizedPayments, ...syntheticCashPayments];
    }

    const normalizedSearch = req.query.search?.trim().toLowerCase();
    let filteredPayments = req.query.status
      ? mergedPayments.filter((payment) => payment.displayStatus === req.query.status)
      : mergedPayments;

    if (normalizedSearch) {
      filteredPayments = filteredPayments.filter((payment) => [
        payment.orderId?.tokenNumber,
        payment.orderId?.serviceType,
        payment.orderId?.status,
        payment.userId?.name,
        payment.userId?.email,
        payment.userId?.role,
        payment.method,
        payment.displayStatus,
        payment.status,
        payment.amount,
      ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch)));
    }

    filteredPayments.sort((left, right) => (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    ));

    const total = filteredPayments.length;
    const paginatedPayments = filteredPayments.slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      payments: paginatedPayments,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = exports.getUsers;

/**
 * Approve a pending Faculty role request.
 */
exports.approveFacultyRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.pendingRoleApproval || !user.pendingRole) {
      return res.status(400).json({ success: false, message: 'No pending role approval for this user' });
    }

    const approvedRole = user.pendingRole;
    user.role = approvedRole;
    user.pendingRole = null;
    user.pendingRoleApproval = false;
    await user.save();

    // Notify User
    await createNotification({
      recipientId: user._id,
      title: 'Faculty Role Approved',
      message: 'Your Faculty role has been approved. You now have Faculty priority in the queue.',
      type: 'system'
    });

    // Log Activity
    await ActivityLog.create({
      actionType: 'user_management',
      performedBy: req.user.id,
      description: `Admin approved Faculty role for ${user.email}`,
      affectedRecordId: user._id.toString()
    });

    return res.status(200).json({ success: true, message: 'Faculty role approved' });

  } catch (error) {
    next(error);
  }
};

/**
 * Reject a pending Faculty role request.
 */
exports.rejectFacultyRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.pendingRoleApproval) {
      return res.status(400).json({ success: false, message: 'No pending approval' });
    }

    // Compose notification before clearing pending data
    const notificationData = {
      recipientId: user._id,
      title: 'Faculty Role Request Not Approved',
      message: 'Your Faculty role request could not be verified. You are registered as a Student. Contact admin if this is an error.',
      type: 'system'
    };

    user.pendingRole = null;
    user.pendingRoleApproval = false;
    // Role stays 'Student'
    await user.save();

    // Send Notification
    await createNotification(notificationData);

    // Log Activity
    await ActivityLog.create({
      actionType: 'user_management',
      performedBy: req.user.id,
      description: `Admin rejected Faculty role request for ${user.email}`,
      affectedRecordId: user._id.toString()
    });

    return res.status(200).json({ success: true, message: 'Faculty role request rejected' });

  } catch (error) {
    next(error);
  }
};

exports.deleteStaff = async (req, res, next) => {
  try {
    const staffUser = await User.findById(req.params.id);

    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }

    if (staffUser.role !== 'Staff') {
      return res.status(400).json({ success: false, message: 'Only staff accounts can be deleted from this action.' });
    }

    await User.deleteOne({ _id: staffUser._id });

    await ActivityLog.create({
      actionType: 'user_management',
      performedBy: req.user.id,
      description: `Admin deleted staff account for ${staffUser.email}`,
      affectedRecordId: staffUser._id.toString(),
      metadata: {
        role: staffUser.role,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Staff account deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

const VALID_QUEUE_ASSIGNMENTS = ['All', 'Guest', 'Student', 'Faculty'];

exports.updateQueueAssignment = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { queueAssignment } = req.body;

    if (!VALID_QUEUE_ASSIGNMENTS.includes(queueAssignment)) {
      return res.status(400).json({
        success: false,
        message: `Invalid queue assignment. Must be one of: ${VALID_QUEUE_ASSIGNMENTS.join(', ')}.`,
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role !== 'Staff') {
      return res.status(400).json({ success: false, message: 'Queue assignment can only be set for Staff accounts.' });
    }

    const previousAssignment = user.queueAssignment || 'All';
    user.queueAssignment = queueAssignment;
    await user.save();

    await logActivity({
      actionType: 'UPDATE_QUEUE_ASSIGNMENT',
      performedBy: req.user.id,
      description: `Admin updated queue assignment for ${user.name} from ${previousAssignment} to ${queueAssignment}`,
      affectedRecordId: user._id,
      metadata: {
        previousAssignment,
        newAssignment: queueAssignment,
        staffEmail: user.email,
      },
    });

    const sanitizedUser = await User.findById(user._id).select(getSafeUserProjection());

    return res.status(200).json({
      success: true,
      user: sanitizedUser,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStaffAssignments = async (req, res, next) => {
  try {
    const staffUsers = await User.find({ role: 'Staff' })
      .select('-password')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      staff: staffUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin-only group order breakdown — no creator/participant restriction.
 * GET /api/admin/group-orders/:orderId/breakdown
 */
exports.getAdminGroupOrderBreakdown = async (req, res, next) => {
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

    return res.status(200).json(groupOrder);
  } catch (error) {
    return next(error);
  }
};

exports.updateAutoProcessingConfig = async (req, res, next) => {
  try {
    const { autoProcessingEnabled, autoProcessingDelay } = req.body;
    const systemConfig = await SystemConfig.getInstance();

    if (typeof autoProcessingEnabled === 'boolean') {
      systemConfig.spae.autoProcessingEnabled = autoProcessingEnabled;
    }

    if (autoProcessingDelay !== undefined) {
      if (![1, 2].includes(Number(autoProcessingDelay))) {
        return res.status(400).json({ success: false, message: 'autoProcessingDelay must be 1 or 2 minutes.' });
      }
      systemConfig.spae.autoProcessingDelay = Number(autoProcessingDelay);
    }

    await systemConfig.save();

    await logActivity({
      actionType: 'UPDATE_AUTO_PROCESSING_CONFIG',
      performedBy: req.user.id,
      description: `Auto processing config updated: enabled=${systemConfig.spae.autoProcessingEnabled}, delay=${systemConfig.spae.autoProcessingDelay}min`,
      metadata: {
        autoProcessingEnabled: systemConfig.spae.autoProcessingEnabled,
        autoProcessingDelay: systemConfig.spae.autoProcessingDelay,
      },
    });

    return res.status(200).json({
      success: true,
      spae: systemConfig.spae,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAutoProcessingConfig = async (req, res, next) => {
  try {
    const systemConfig = await SystemConfig.getInstance();
    return res.status(200).json({
      success: true,
      spae: systemConfig.spae,
    });
  } catch (error) {
    return next(error);
  }
};
