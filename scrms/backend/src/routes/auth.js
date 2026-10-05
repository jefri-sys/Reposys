const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Importing strict middleware
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { allowRoles } = require('../middleware/roleGuard');

router.post('/register', authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', authLimiter, authController.login);
router.post('/resend-verification', authLimiter, authController.resendVerification);
router.post('/logout', verifyToken, authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', verifyToken, authController.getMe);
router.get('/admin-test', verifyToken, allowRoles('Admin'), (req, res) => res.json({ success: true }));

module.exports = router;
