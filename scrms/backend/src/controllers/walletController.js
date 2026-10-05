const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { sendPushToUser } = require('../utils/pushService');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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

const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId });
  }
  return wallet;
};

exports.getWallet = async (req, res, next) => {
  try {
    const wallet = await getOrCreateWallet(req.user._id);
    const isNewWallet = !wallet.hasSeenOnboarding;
    return res.status(200).json({ success: true, balance: wallet.balance, walletId: wallet._id, isNewWallet });
  } catch (error) {
    return next(error);
  }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      // Wallet may not exist yet (first visit) — return empty safely
      return res.status(200).json({ success: true, transactions: [] });
    }
    const transactions = await WalletTransaction.find({ walletId: wallet._id }).sort({ timestamp: -1 });
    return res.status(200).json({ success: true, transactions });
  } catch (error) {
    return next(error);
  }
};

exports.createTopupOrder = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 10) {
      return res.status(400).json({ success: false, message: 'Invalid amount. Minimum topup is 10.' });
    }

    const wallet = await getOrCreateWallet(req.user._id);

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      notes: {
        type: 'wallet_topup',
        userId: req.user._id.toString()
      }
    });

    return res.status(200).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    return next(error);
  }
};

exports.verifyTopup = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing payment details.' });
    }

    const isValidSignature = hasValidRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    if (!isValidSignature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
    }

    const razorpayOrder = await razorpayInstance.orders.fetch(razorpayOrderId);
    const amount = razorpayOrder.amount / 100;

    if (razorpayOrder.status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Payment not completed.' });
    }

    if (razorpayOrder.notes.type !== 'wallet_topup') {
      return res.status(400).json({ success: false, message: 'Invalid payment type.' });
    }

    if (razorpayOrder.notes.userId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Payment does not belong to user.' });
    }

    const wallet = await getOrCreateWallet(req.user._id);

    wallet.balance += amount;
    await wallet.save();

    const transaction = new WalletTransaction({
      walletId: wallet._id,
      type: 'topup',
      amount: amount,
      razorpayOrderId: razorpayOrderId,
      description: 'Wallet top up',
      status: 'success'
    });
    await transaction.save();

    await sendPushToUser(req.user._id, {
      title: 'Wallet Top Up Successful',
      body: `Your wallet has been credited with ₹${amount}. New balance: ₹${wallet.balance}`,
      url: '/wallet'
    });

    return res.status(200).json({ success: true, newBalance: wallet.balance });
  } catch (error) {
    return next(error);
  }
};

exports.completeOnboarding = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (wallet) {
      wallet.hasSeenOnboarding = true;
      await wallet.save();
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};
