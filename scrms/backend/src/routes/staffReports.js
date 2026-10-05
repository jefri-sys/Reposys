const express = require('express');
const router = express.Router();
const staffReportController = require('../controllers/staffReportController');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

// Staff + Admin endpoints
router.post(
  '/',
  verifyToken,
  roleGuard('Staff', 'Admin'),
  staffReportController.createStaffReport
);

router.get(
  '/',
  verifyToken,
  roleGuard('Staff', 'Admin'),
  staffReportController.getStaffReports
);

// Admin-only endpoints - mounted at /api/admin/staff-reports in app.js
router.patch(
  '/:id/acknowledge',
  verifyToken,
  roleGuard('Admin'),
  staffReportController.acknowledgeReport
);

router.patch(
  '/:id/resolve',
  verifyToken,
  roleGuard('Admin'),
  staffReportController.resolveReport
);

module.exports = router;
