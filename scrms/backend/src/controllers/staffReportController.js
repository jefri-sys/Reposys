const StaffReport = require('../models/StaffReport');
const InventoryItem = require('../models/InventoryItem');
const { createNotification, createAdminNotification } = require('../services/notificationService');
const { generateTokenNumber } = require('../utils/orderHelpers');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.createStaffReport = async (req, res, next) => {
  try {
    const { category, specificItem, description, urgency, linkedInventoryItemId } = req.body;

    const reportRef = await generateTokenNumber('StaffReport');

    const staffReport = await StaffReport.create({
      reportRef,
      raisedBy: req.user.id,
      category,
      specificItem,
      description,
      urgency,
      linkedInventoryItemId,
    });

    await createAdminNotification({
      title: urgency === 'Urgent' ? '🔴 Urgent Staff Report' : 'New Staff Report',
      message: `${reportRef} — ${category}${specificItem ? `: ${specificItem}` : ''}`,
      relatedEntity: reportRef,
      urgency,
    });

    res.status(201).json(staffReport);
  } catch (error) {
    next(error);
  }
};

exports.acknowledgeReport = async (req, res, next) => {
  try {
    const report = await StaffReport.findById(req.params.id);

    if (!report) {
      const error = new Error('Staff report not found');
      error.statusCode = 404;
      throw error;
    }

    report.status = 'Acknowledged';
    report.acknowledgedAt = new Date();
    await report.save();

    await createNotification({
      recipientId: report.raisedBy,
      recipientType: 'Staff',
      title: 'Report Acknowledged',
      message: `Your report ${report.reportRef} has been seen by the admin`,
      relatedEntity: report.reportRef,
      type: 'system',
      urgency: 'Normal',
    });

    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};

exports.resolveReport = async (req, res, next) => {
  try {
    const report = await StaffReport.findById(req.params.id);

    if (!report) {
      const error = new Error('Staff report not found');
      error.statusCode = 404;
      throw error;
    }

    const { resolutionNote } = req.body;

    report.status = 'Resolved';
    report.resolvedAt = new Date();
    report.resolutionNote = resolutionNote || '';

    if (report.linkedInventoryItemId) {
      const item = await InventoryItem.findById(report.linkedInventoryItemId);
      if (item) {
        report.resolutionNote += ` | Current stock: ${item.currentStock} ${item.unit}`;
      }
    }

    await report.save();

    const noteText = report.resolutionNote ? ` Note: ${report.resolutionNote}` : '';
    await createNotification({
      recipientId: report.raisedBy,
      recipientType: 'Staff',
      title: 'Report Resolved',
      message: `Your report ${report.reportRef} has been resolved.${noteText}`,
      relatedEntity: report.reportRef,
      type: 'system',
      urgency: 'Normal',
    });

    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};

exports.getStaffReports = async (req, res, next) => {
  try {
    const { status, urgency, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (req.user.role === 'Staff') {
      query.raisedBy = req.user.id;
    }

    if (status) query.status = status;
    if (urgency) query.urgency = urgency;
    if (search?.trim()) {
      const searchRegex = new RegExp(escapeRegExp(search.trim()), 'i');
      query.$or = [
        { reportRef: searchRegex },
        { category: searchRegex },
        { specificItem: searchRegex },
        { description: searchRegex },
        { resolutionNote: searchRegex },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await StaffReport.countDocuments(query);

    const reports = await StaffReport.find(query)
      .sort({ urgency: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('raisedBy', 'name');

    res.status(200).json({
      reports,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};
