const express = require('express');
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

router.use(verifyToken);

router.post('/create-order', paymentController.createPaymentOrder);
router.post('/verify', paymentController.verifyPayment);
router.post('/cash-confirm', paymentController.cashConfirm);

module.exports = router;
