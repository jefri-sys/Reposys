const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const AutomationLog = require('../models/AutomationLog');
const PrintJob = require('../models/PrintJob');
const SystemConfig = require('../models/SystemConfig');

router.use(verifyToken);

// Route 1: GET /logs — Admin only
router.get('/logs', roleGuard('Admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.result) query.result = req.query.result;
    if (req.query.event) query.event = req.query.event;

    const logs = await AutomationLog.find(query)
      .populate('orderId', 'tokenNumber serviceType')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await AutomationLog.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return res.json({ logs, total, page, totalPages });
  } catch (error) {
    next(error);
  }
});

// Route 1.5: DELETE /logs — Admin only, Clear All SPAE Audit Logs
router.delete('/logs', roleGuard('Admin'), async (req, res, next) => {
  try {
    // Use .collection.deleteMany to bypass Mongoose's immutable pre-hooks
    await AutomationLog.collection.deleteMany({});
    
    // Log this action
    const ActivityLog = require('../models/ActivityLog');
    ActivityLog.create({
      actionType: 'SPAE_LOGS_CLEARED',
      performedBy: req.user.id,
      description: `All SPAE audit logs were cleared manually by Admin ${req.user.email}`
    }).catch(() => {});

    return res.json({ success: true, message: 'SPAE audit logs cleared successfully.' });
  } catch (error) {
    next(error);
  }
});

// Route 2: GET /logs/:orderId — Staff and Admin
router.get('/logs/:orderId', roleGuard('Admin', 'Staff'), async (req, res, next) => {
  try {
    const logs = await AutomationLog.find({ orderId: req.params.orderId })
      .sort({ timestamp: 1 });
    return res.json({ logs });
  } catch (error) {
    next(error);
  }
});

// Route 3: GET /printjobs — Staff and Admin
router.get('/printjobs', roleGuard('Admin', 'Staff'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;

    const jobs = await PrintJob.find(query)
      .populate('orderId', 'tokenNumber serviceType userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await PrintJob.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return res.json({ jobs, total, page, totalPages });
  } catch (error) {
    next(error);
  }
});

// Route 4: GET /printjobs/:orderId — Staff and Admin
router.get('/printjobs/:orderId', roleGuard('Admin', 'Staff'), async (req, res, next) => {
  try {
    const job = await PrintJob.findOne({ orderId: req.params.orderId });
    if (!job) {
      return res.status(200).json({ message: 'No Print Job Legacy Order', job: null });
    }
    return res.json({ job });
  } catch (error) {
    next(error);
  }
});

// Route 5: PATCH /printjobs/:id/cancel — Admin only
router.patch('/printjobs/:id/cancel', roleGuard('Admin'), async (req, res, next) => {
  try {
    const job = await PrintJob.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Print job not found' });
    }

    if (job.status === 'Printing' || job.status === 'Completed') {
      return res.status(400).json({ message: 'Cannot cancel a job that is already printing or completed' });
    }

    job.status = 'Cancelled';
    await job.save();

    return res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
});

// Route 6: GET /status — Admin only
router.get('/status', roleGuard('Admin'), async (req, res, next) => {
  try {
    const config = await SystemConfig.getInstance();
    const activeJobs = await PrintJob.countDocuments({ status: { $in: ['Pending', 'Assigned', 'Printing'] } });
    const lastLog = await AutomationLog.findOne().sort({ timestamp: -1 });

    return res.json({
      spae: { enabled: config.spae.enabled, maxQueueSize: config.spae.maxQueueSize },
      activeJobs,
      printers: config.printers,
      lastLog
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
