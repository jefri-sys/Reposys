const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

// Public route for submitting inquiries
router.post('/', contactController.submitInquiry);

// Admin only routes
router.get('/', verifyToken, roleGuard('Admin'), contactController.getInquiries);
router.patch('/:id/status', verifyToken, roleGuard('Admin'), contactController.updateInquiryStatus);
router.patch('/:id/respond', verifyToken, roleGuard('Admin'), contactController.respondToInquiry);
router.delete('/:id', verifyToken, roleGuard('Admin'), contactController.deleteInquiry);

module.exports = router;
