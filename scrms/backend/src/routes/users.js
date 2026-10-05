const express = require('express');
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.use(verifyToken);

const validatePushSubscription = (subscription) => {
  return Boolean(
    subscription
    && typeof subscription.endpoint === 'string'
    && subscription.endpoint.trim()
    && typeof subscription.keys?.p256dh === 'string'
    && subscription.keys.p256dh.trim()
    && typeof subscription.keys?.auth === 'string'
    && subscription.keys.auth.trim()
  );
};

const rejectGuests = (req, res) => {
  if (req.user?.isGuest === true || req.user?.role === 'Guest') {
    res.status(403).json({
      success: false,
      message: 'Guest users cannot manage push subscriptions.'
    });
    return true;
  }

  return false;
};

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);
router.patch('/me/change-password', userController.changePassword);
router.post('/me/logout-all-devices', userController.logoutAllDevices);
router.get('/me/usage-summary', userController.getUsageSummary);
router.post('/push-subscription', async (req, res, next) => {
  if (rejectGuests(req, res)) {
    return;
  }

  const { subscription } = req.body;

  if (!validatePushSubscription(subscription)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid push subscription object'
    });
  }

  try {
    await User.findByIdAndUpdate(
      req.user.id,
      { pushSubscription: subscription },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Push subscription saved'
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/test-push', async (req, res, next) => {
  if (rejectGuests(req, res)) {
    return;
  }

  try {
    const user = await User.findById(req.user.id).select('pushSubscription').lean();
    
    if (!user || !user.pushSubscription) {
      return res.status(400).json({
        success: false,
        message: 'No push subscription found in the database for this user.',
        hasSubscription: false
      });
    }

    const { sendPushToUser } = require('../utils/pushService');
    await sendPushToUser(req.user.id, {
      title: 'Reposys Test Push',
      body: 'If you see this, push notifications are working perfectly!',
      url: '/dashboard'
    });

    return res.status(200).json({
      success: true,
      message: 'Test push dispatched to your subscription',
      hasSubscription: true,
      subscriptionEndpoint: user.pushSubscription.endpoint
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/push-subscription', async (req, res, next) => {
  if (rejectGuests(req, res)) {
    return;
  }

  try {
    await User.findByIdAndUpdate(
      req.user.id,
      { pushSubscription: null },
      { new: true }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
