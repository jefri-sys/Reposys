const express = require('express');
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

const router = express.Router();

router.use(verifyToken);
router.use(roleGuard('Admin'));

router.get('/daily-orders', reportController.getDailyOrders);
router.get('/revenue', reportController.getRevenue);
router.get('/service-breakdown', reportController.getServiceBreakdown);
router.get('/peak-hours', reportController.getPeakHours);
router.get('/staff-performance', reportController.getStaffPerformance);
router.get('/payment-breakdown', reportController.getPaymentBreakdown);
router.get('/export', reportController.exportReport);

module.exports = router;
