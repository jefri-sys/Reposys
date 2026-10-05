const express = require('express');
const guestController = require('../controllers/guestController');
const { verifyToken } = require('../middleware/auth');
const { guestOtpLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/request-otp', guestOtpLimiter, guestController.requestOtp);
router.post('/verify-otp', guestController.verifyOtp);
router.post('/end-session', verifyToken, guestController.endSession);

module.exports = router;
