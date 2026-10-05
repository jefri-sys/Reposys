const express = require('express');
const mongoose = require('mongoose');
const orderController = require('../controllers/orderController');
const Order = require('../models/Order');
const { verifyToken } = require('../middleware/auth');
const { getWaitTime } = require('../services/queueService');

const router = express.Router();

router.post('/estimate', orderController.estimateCost);
router.get('/track/:orderId', orderController.trackOrder);

router.use(verifyToken);

router.get('/my-orders', orderController.getMyOrders);
router.post('/create', orderController.createOrder);
router.post('/:id/reorder', verifyToken, orderController.reorderOrder);
router.get('/:id', orderController.getOrderById);
router.get('/:id/wait', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isOwner = String(order.userId) === String(req.user.id);
    const hasAccess = isOwner || req.user.role === 'Staff' || req.user.role === 'Admin';

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const waitData = await getWaitTime(req.params.id);
    return res.status(200).json(waitData);
  } catch (error) {
    if (error.message === 'Order not found.') {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (error.message === 'Order is not in the active queue.') {
      return res.status(400).json({ success: false, message: error.message });
    }

    return next(error);
  }
});
router.get('/:id/receipt', verifyToken, orderController.downloadReceipt);
router.patch('/:id/cancel', orderController.cancelOrder);

module.exports = router;
