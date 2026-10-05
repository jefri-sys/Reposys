const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, walletController.getWallet);
router.get('/transactions', verifyToken, walletController.getTransactions);
router.post('/topup/create-order', verifyToken, walletController.createTopupOrder);
router.post('/topup/verify', verifyToken, walletController.verifyTopup);
router.post('/complete-onboarding', verifyToken, walletController.completeOnboarding);

module.exports = router;
