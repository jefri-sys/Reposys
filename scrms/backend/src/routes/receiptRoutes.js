const express = require('express');
const receiptController = require('../controllers/receiptController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/:orderId', verifyToken, receiptController.downloadReceipt);

module.exports = router;
