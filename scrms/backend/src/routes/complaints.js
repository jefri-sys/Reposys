const express = require('express');
const complaintController = require('../controllers/complaintController');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

const router = express.Router();

router.use(verifyToken);

router.post('/', complaintController.createComplaint);
router.post('/:id/messages', complaintController.addMessage);
router.patch('/:id/status', roleGuard('Staff', 'Admin'), complaintController.updateStatus);
router.get('/', complaintController.getComplaints);
router.get('/:id', complaintController.getComplaintById);

module.exports = router;
