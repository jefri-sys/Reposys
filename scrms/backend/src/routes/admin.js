const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const adminController = require('../controllers/adminController');
const ratingController = require('../controllers/ratingController');
const contactController = require('../controllers/contactController');

// All admin routes require authentication and Admin role
router.use(verifyToken);
router.use(roleGuard('Admin'));
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/pricing', adminController.getPricing);
router.patch('/pricing', adminController.updatePricing);
router.patch('/shop/toggle', adminController.toggleShopStatus);
router.post('/follow-schedule', adminController.followSchedule);
router.patch('/queue/reorder', adminController.reorderQueue);
router.get('/activity-logs', adminController.getActivityLogs);
router.delete('/activity-logs', (req, res) => res.status(405).json({
  success: false,
  message: 'Method Not Allowed',
}));
router.get('/users', adminController.getUsers);
router.post('/users/create-staff', adminController.createStaff);
router.patch('/users/:id/toggle-active', adminController.toggleUserActive);
router.patch('/users/:id/limit-override', adminController.setLimitOverride);
router.get('/users/:id', adminController.getUserById);
router.get('/transactions', verifyToken, roleGuard('Admin'), adminController.getTransactions);
router.get('/group-orders/:orderId/breakdown', adminController.getAdminGroupOrderBreakdown);
router.get('/ratings/summary', ratingController.getRatingsSummary);
router.get('/inquiries', contactController.getInquiries);
router.patch('/inquiries/:id/status', contactController.updateInquiryStatus);
router.patch('/inquiries/:id/respond', contactController.respondToInquiry);
router.delete('/inquiries/:id', contactController.deleteInquiry);

/**
 * User Management Routes
 */
router.post('/staff', adminController.createStaff);
router.delete('/staff/:id', adminController.deleteStaff);
router.patch('/users/:id/approve-role', adminController.approveFacultyRole);
router.patch('/users/:id/reject-role', adminController.rejectFacultyRole);

// Queue Assignment routes
router.get('/spae/auto-processing', adminController.getAutoProcessingConfig);
router.patch('/spae/auto-processing', adminController.updateAutoProcessingConfig);

router.get('/staff/assignments', adminController.getStaffAssignments);
router.patch('/users/:id/queue-assignment', adminController.updateQueueAssignment);


// Phase 6 TODO: Add other user management routes (edit, delete, deactivate)
// router.get('/users/:id', adminController.getUserById);
// router.put('/users/:id', adminController.updateUser);
// router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
