const express = require('express');
const router = express.Router();
const groupOrderController = require('../controllers/groupOrderController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, groupOrderController.getGroupOrders);
router.get('/my-active', verifyToken, groupOrderController.getMyActiveGroupOrders);
router.get('/group-chat/:groupId', verifyToken, groupOrderController.getGroupChatActiveOrders);
router.post('/custom-split', verifyToken, groupOrderController.createCustomSplit);
router.post('/split/custom', verifyToken, groupOrderController.createCustomSplit);
router.post('/split/send', verifyToken, groupOrderController.sendSplitRequests);
router.post('/split/respond', verifyToken, groupOrderController.respondToSplitRequest);
router.get('/split/pending', verifyToken, groupOrderController.getPendingSplitRequests);
router.get('/:orderId', verifyToken, groupOrderController.getGroupOrder);
router.get('/:groupOrderId/split-status', verifyToken, groupOrderController.getSplitStatus);

module.exports = router;
