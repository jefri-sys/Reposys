const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Order = require('../models/Order');
const { createNotification, createStaffNotification } = require('../services/notificationService');
const socketHandler = require('../socket/socketHandler');
const { generateTokenNumber } = require('../utils/orderHelpers');

const ALLOWED_COMPLAINT_CATEGORIES = [
  'Print_Quality',
  'Binding_Quality',
  'Wrong_Output',
  'Delay',
  'Payment_Issue',
  'Other',
];

const ALLOWED_COMPLAINT_STATUSES = ['Open', 'In_Progress', 'Resolved', 'Closed'];
const COMPLAINT_ELIGIBLE_ORDER_STATUSES = ['Processing', 'ReadyForPickup', 'Completed', 'Partial'];
const PRIVILEGED_ROLES = ['Staff', 'Admin'];
const REOPEN_WINDOW_MS = 48 * 60 * 60 * 1000;

const isPrivilegedRole = (role) => PRIVILEGED_ROLES.includes(role);

const normalizeAttachmentUrls = (attachmentUrls) => {
  if (attachmentUrls === undefined) {
    return [];
  }

  if (!Array.isArray(attachmentUrls)) {
    return null;
  }

  return attachmentUrls
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
};

const normalizeStatusFilter = (statusValue) => {
  if (statusValue === undefined) {
    return [];
  }

  const rawValues = Array.isArray(statusValue) ? statusValue : [statusValue];

  return rawValues
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
};

const emitComplaintMessage = (complaint, message) => {
  try {
    const io = socketHandler.getIO();
    const payload = {
      type: 'complaint_message',
      complaintId: complaint._id,
      message,
    };

    io.to(`user:${complaint.raisedBy}`).emit('complaint_message', payload);
    io.to('staff').emit('complaint_message', payload);
    io.to('admin').emit('complaint_message', payload);
  } catch (socketError) {
    // Socket.io may not be initialized during isolated tests.
  }
};

const createComplaint = async (req, res, next) => {
  try {
    const { orderId, category, description, attachmentUrls } = req.body;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!ALLOWED_COMPLAINT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint category.' });
    }

    const sanitizedDescription = typeof description === 'string' ? description.trim() : '';
    if (!sanitizedDescription) {
      return res.status(400).json({ success: false, message: 'Description is required.' });
    }

    const normalizedAttachmentUrls = normalizeAttachmentUrls(attachmentUrls);
    if (normalizedAttachmentUrls === null) {
      return res.status(400).json({ success: false, message: 'attachmentUrls must be an array of strings.' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (String(order.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!COMPLAINT_ELIGIBLE_ORDER_STATUSES.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Complaints can only be raised for processing, pickup-ready, completed, or partial orders.',
      });
    }

    const complaintToken = await generateTokenNumber('Complaint');
    const complaint = await Complaint.create({
      complaintToken,
      orderId: order._id,
      raisedBy: req.user._id,
      category,
      description: sanitizedDescription,
      status: 'Open',
      statusHistory: [{
        status: 'Open',
        timestamp: new Date(),
        actorId: req.user._id,
        actorRole: req.user.role,
        note: 'Complaint raised.',
      }],
      attachmentUrls: normalizedAttachmentUrls,
    });

    const notificationMessage = `Complaint ${complaintToken} raised for order ${order.tokenNumber}`;
    await Promise.all([
      createStaffNotification({
        title: 'New Complaint Raised',
        message: `${complaintToken} raised by ${req.user.name}`,
        relatedEntity: complaintToken,
        type: 'complaint'
      }),
      createNotification({
        recipientRole: 'Admin',
        title: 'New Complaint',
        message: notificationMessage,
        type: 'complaint',
      }),
    ]);

    return res.status(201).json({
      success: true,
      complaint,
    });
  } catch (error) {
    return next(error);
  }
};

const addMessage = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const isRaisedByUser = String(complaint.raisedBy) === String(req.user.id);
    const hasAccess = isRaisedByUser || isPrivilegedRole(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    const attachmentUrl = typeof req.body?.attachmentUrl === 'string'
      ? req.body.attachmentUrl.trim()
      : '';
    const newMessage = {
      senderId: req.user._id,
      senderRole: req.user.role,
      text,
      attachmentUrl,
      timestamp: new Date(),
    };

    complaint.messages.push(newMessage);
    await complaint.save();

    emitComplaintMessage(complaint, complaint.messages[complaint.messages.length - 1]);

    return res.status(200).json({
      success: true,
      complaint,
    });
  } catch (error) {
    return next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const { status, note } = req.body;
    if (!ALLOWED_COMPLAINT_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint status.' });
    }

    const sanitizedNote = typeof note === 'string' ? note.trim() : '';
    const isUserReopenAttempt = complaint.status === 'Resolved'
      && ['User', 'Student', 'Faculty'].includes(req.user.role)
      && status === 'In_Progress';

    if (isUserReopenAttempt) {
      const resolvedAt = complaint.resolvedAt ? new Date(complaint.resolvedAt) : null;
      if (!resolvedAt || (Date.now() - resolvedAt.getTime()) > REOPEN_WINDOW_MS) {
        return res.status(400).json({ success: false, message: 'Reopen window has expired' });
      }
    }

    complaint.status = status;
    complaint.resolvedAt = status === 'Resolved' ? new Date() : complaint.resolvedAt;
    complaint.statusHistory.push({
      status,
      timestamp: new Date(),
      actorId: req.user._id,
      actorRole: req.user.role,
      note: sanitizedNote,
    });
    await complaint.save();

    await createNotification({
      recipientId: complaint.raisedBy,
      title: 'Complaint Updated',
      message: `Your complaint ${complaint.complaintToken} status changed to ${status}`,
      type: 'complaint',
    });

    return res.status(200).json({
      success: true,
      complaint,
    });
  } catch (error) {
    return next(error);
  }
};

const getComplaints = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const filter = {};

    if (!isPrivilegedRole(req.user.role)) {
      filter.raisedBy = req.user._id;
    }

    const statusFilters = normalizeStatusFilter(req.query.status);

    if (statusFilters.length > 0) {
      const hasInvalidStatusFilter = statusFilters.some(
        (status) => !ALLOWED_COMPLAINT_STATUSES.includes(status)
      );

      if (hasInvalidStatusFilter) {
        return res.status(400).json({ success: false, message: 'Invalid complaint status filter.' });
      }

      filter.status = statusFilters.length === 1
        ? statusFilters[0]
        : { $in: statusFilters };
    }

    if (req.query.category) {
      if (!ALLOWED_COMPLAINT_CATEGORIES.includes(req.query.category)) {
        return res.status(400).json({ success: false, message: 'Invalid complaint category filter.' });
      }
      filter.category = req.query.category;
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('orderId', 'tokenNumber')
        .populate('raisedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      complaints,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    return next(error);
  }
};

const getComplaintById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const complaint = await Complaint.findById(req.params.id)
      .populate('orderId', 'tokenNumber')
      .populate('raisedBy', 'name role')
      .populate('messages.senderId', 'name');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const isRaisedByUser = String(complaint.raisedBy?._id || complaint.raisedBy) === String(req.user.id);
    const hasAccess = isRaisedByUser || isPrivilegedRole(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return res.status(200).json({
      success: true,
      complaint,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createComplaint,
  addMessage,
  updateStatus,
  getComplaints,
  getComplaintById,
};
