const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const buildScopeFilter = (user) => {
  if (user.role === 'Admin') {
    return { recipientType: 'Admin' };
  }
  if (user.role === 'Staff') {
    return {
      $or: [
        { recipientType: 'Staff' },
        { recipientId: user.id }
      ]
    };
  }
  // Fallback for Student, Faculty, Guest
  return { recipientId: user.id };
};

router.use(verifyToken);

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.max(1, Number.parseInt(req.query.limit, 10) || 5);
    const filter = buildScopeFilter(req.user);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    return res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    return next(error);
  }
});

router.get('/all', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Number.parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;
    
    const filter = buildScopeFilter(req.user);

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      notifications,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    const scopeFilter = buildScopeFilter(req.user);
    const filter = { ...scopeFilter, isRead: false };

    const count = await Notification.countDocuments(filter);

    return res.status(200).json({ count });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    const scopeFilter = buildScopeFilter(req.user);
    const filter = { _id: req.params.id, ...scopeFilter };

    const notification = await Notification.findOneAndUpdate(
      filter,
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found or access denied.' });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    const scopeFilter = buildScopeFilter(req.user);
    const filter = { ...scopeFilter, isRead: false };

    const result = await Notification.updateMany(
      filter,
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    const scopeFilter = buildScopeFilter(req.user);
    const filter = { _id: req.params.id, ...scopeFilter };

    const notification = await Notification.findOneAndDelete(filter);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found or access denied.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.',
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
