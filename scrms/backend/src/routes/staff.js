const express = require('express');
const staffController = require('../controllers/staffController');
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleGuard');

const router = express.Router();

const staffGuard = [verifyToken, allowRoles('Staff', 'Admin')];

router.get('/queue', staffGuard, staffController.getQueue);
router.get('/staff/orders/completed', staffGuard, staffController.getCompletedOrders);
router.patch('/orders/:id/lock', staffGuard, staffController.lockOrder);
router.patch('/orders/:id/unlock', staffGuard, staffController.unlockOrder);
router.post('/orders/:id/start-processing', staffGuard, staffController.startProcessing);
router.post('/orders/:id/ready-for-pickup', staffGuard, staffController.readyForPickup);
router.post('/orders/:id/collect-cash', staffGuard, staffController.collectCash);
router.post('/orders/:id/verify-otp', staffGuard, staffController.verifyOtp);
router.post('/orders/:id/partial', staffGuard, staffController.partialOrder);

router.get('/spae/auto-processing', staffGuard, adminController.getAutoProcessingConfig);
router.patch('/spae/auto-processing', staffGuard, adminController.updateAutoProcessingConfig);

module.exports = router;
