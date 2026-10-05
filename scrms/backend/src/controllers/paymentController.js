const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const { v4: uuid } = require('uuid');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const { broadcastQueueUpdate } = require('../services/queueService');
const { createTargetedStaffNotification, createNotification } = require('../services/notificationService');
const { calculateCost } = require('../services/pricingService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const isPlaceholderValue = (value) => !value || /^your_/i.test(value);

const isRazorpayConfigured = () => (
  !isPlaceholderValue(process.env.RAZORPAY_KEY_ID)
  && !isPlaceholderValue(process.env.RAZORPAY_KEY_SECRET)
);

const getOrderAmount = (order) => Number(order.finalCost || order.estimatedCost || 0);

const getOrderAmountInPaise = (order) => Math.round(getOrderAmount(order) * 100);

const isOrderOwnedByAuthUser = (order, authUser) => {
  if (authUser?.isGuest === true) {
    return order.isGuest === true && order.guestSessionId === authUser.sessionId;
  }

  return Boolean(order.userId) && String(order.userId) === String(authUser?._id);
};

const loadOwnedOrder = async (orderId, authUser) => {
  if (!mongoose.isValidObjectId(orderId)) {
    return { error: { status: 404, message: 'Order not found.' } };
  }

  const order = await Order.findById(orderId);

  if (!order) {
    return { error: { status: 404, message: 'Order not found.' } };
  }

  if (!isOrderOwnedByAuthUser(order, authUser)) {
    return { error: { status: 403, message: 'Forbidden' } };
  }

  return { order };
};

const notifyStaffAboutPaidOrder = async (order) => {
  await createTargetedStaffNotification({
    order,
    title: 'New Order in Queue',
    message: `${order.tokenNumber} - ${order.serviceType}, ${order.pageCount || 0} pages`,
  });
};

const hasValidRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !process.env.RAZORPAY_KEY_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(String(razorpaySignature));

  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const hasVerifiedCapturedPayment = async ({ razorpayOrderId, razorpayPaymentId, order }) => {
  if (!isRazorpayConfigured() || !razorpayOrderId || !razorpayPaymentId) {
    return false;
  }

  try {
    const payment = await razorpay.payments.fetch(razorpayPaymentId);

    return (
      payment?.order_id === razorpayOrderId
      && payment?.status === 'captured'
      && Number(payment?.amount) === getOrderAmountInPaise(order)
      && String(payment?.currency || '').toUpperCase() === 'INR'
    );
  } catch (error) {
    console.error('Failed to verify Razorpay payment through API:', error);
    return false;
  }
};

const markOrderPaid = async ({ order, razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  if (order.paymentStatus === 'Paid') {
    return order;
  }

  order.paymentStatus = 'Paid';
  order.status = 'In_Queue';
  order.razorpayOrderId = razorpayOrderId || order.razorpayOrderId;
  order.razorpayPaymentId = razorpayPaymentId;
  order.statusHistory.push({ status: 'In_Queue', timestamp: new Date(), note: 'Payment verified' });
  await order.save();

  const { scheduleAutoProcessingIfEnabled } = require('../utils/autoProcessingScheduler');
  const systemConfig = await SystemConfig.getInstance();
  await scheduleAutoProcessingIfEnabled(order, systemConfig);

  await Payment.findOneAndUpdate(
    { orderId: order._id },
    {
      $set: {
        userId: order.userId || null,
        amount: getOrderAmount(order),
        currency: 'INR',
        status: 'Paid',
        method: 'Online',
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (order.userId) {
    await User.findByIdAndUpdate(order.userId, {
      $inc: { totalOrders: 1, totalSpend: getOrderAmount(order) }
    });

    await createNotification({
      recipientId: order.userId,
      title: 'Payment Successful',
      message: 'Payment confirmed for order ' + order.tokenNumber + '. Your order is now in the queue.',
      type: 'payment'
    });
  }

  await notifyStaffAboutPaidOrder(order);
  await broadcastQueueUpdate(order.serviceType);

  try {
    const eventDispatcher = require('../services/eventDispatcher');
    eventDispatcher.emit('PAYMENT_VERIFIED', { orderId: order._id, order, paymentMethod: 'Online' });
  } catch (dispatchErr) {
    console.warn('[paymentController] EventDispatcher emit failed:', dispatchErr.message);
  }

  return order;
};

exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body
    const { order, error } = await loadOwnedOrder(orderId, req.user);

    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    if (!isRazorpayConfigured()) {
      return res.status(503).json({ success: false, message: 'Online payment is not configured.' });
    }

    if (order.paymentMethod !== 'Online') {
      return res.status(400).json({ success: false, message: 'This order is not an online payment order.' });
    }

    if (order.paymentStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'Already paid' });
    }

    // Recalculate cost server-side — never trust frontend amount
    const config = await SystemConfig.getInstance()
    const costResult = calculateCost({
      serviceType: order.serviceType,
      pageCount: order.pageCount,
      copies: order.printConfig.copies,
      colourMode: order.printConfig.colourMode,
      sided: order.printConfig.sided,
      binding: order.printConfig.binding,
      documentCount: order.documentIds.length
    }, config.pricing)

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(costResult.estimatedCost * 100), // paise
      currency: 'INR',
      receipt: order.tokenNumber
    })

    order.finalCost = costResult.estimatedCost
    order.razorpayOrderId = razorpayOrder.id
    await order.save()

    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        $set: {
          userId: order.userId || null,
          status: 'Created',
          method: 'Online',
          amount: costResult.estimatedCost,
          currency: 'INR',
          razorpayOrderId: razorpayOrder.id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return res.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    })
  } catch (error) {
    next(error)
  }
}

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body

    if (!razorpayOrderId || !razorpayPaymentId || !orderId) {
      return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
    }

    const { order, error } = await loadOwnedOrder(orderId, req.user);

    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    if (order.paymentMethod !== 'Online') {
      return res.status(400).json({ success: false, message: 'This order is not an online payment order.' });
    }

    if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ success: false, message: 'Payment order mismatch. Please retry payment.' });
    }

    const verifiedBySignature = hasValidRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    const verifiedByApi = verifiedBySignature
      ? false
      : await hasVerifiedCapturedPayment({ razorpayOrderId, razorpayPaymentId, order });

    if (!verifiedBySignature && !verifiedByApi) {
      await Payment.findOneAndUpdate(
        { orderId: order._id },
        {
          $set: {
            userId: order.userId || null,
            amount: getOrderAmount(order),
            currency: 'INR',
            status: 'Failed',
            method: 'Online',
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. If money was deducted, please wait a moment and check My Orders.',
      });
    }

    const paidOrder = await markOrderPaid({
      order,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return res.json({ success: true, order: paidOrder })
  } catch (error) {
    next(error)
  }
}

exports.cashConfirm = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const { order, error } = await loadOwnedOrder(orderId, req.user);

    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    if (order.paymentMethod !== 'Cash') {
      return res.status(400).json({ success: false, message: 'This order is not a cash order.' });
    }

    order.paymentStatus = 'Cash_Pending';
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      note: 'Cash order registered. Awaiting counter staff approval.',
    });
    await order.save();

    await notifyStaffAboutPaidOrder(order);

    await Payment.findOneAndUpdate(
      { orderId: order._id, method: 'Cash' },
      {
        $set: {
          userId: order.userId || null,
          amount: getOrderAmount(order),
          currency: 'INR',
          status: 'Created',
          method: 'Cash',
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(error);
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature']
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')

    if (expectedSignature !== webhookSignature) {
      return res.status(400).json({ message: 'Invalid webhook signature' })
    }

    const webhookBody = Buffer.isBuffer(req.body)
      ? JSON.parse(req.body.toString('utf8'))
      : req.body;
    const event = webhookBody.event
    const payment = webhookBody.payload.payment.entity

    if (event === 'payment.captured') {
      const order = await Order.findOne({ razorpayOrderId: payment.order_id })
      if (order && order.paymentStatus !== 'Paid') {
        await markOrderPaid({
          order,
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id,
          razorpaySignature: webhookSignature,
        });
      }
    }

    if (event === 'payment.failed') {
      const order = await Order.findOne({ razorpayOrderId: payment.order_id })
      if (order) {
        order.paymentStatus = 'Failed'
        await order.save()
        await Payment.findOneAndUpdate({ orderId: order._id }, { status: 'Failed' })
      }
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    return res.status(200).json({ received: true }) // Always return 200 to Razorpay
  }
}
