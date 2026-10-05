const SystemConfig = require('../models/SystemConfig');
const Order = require('../models/Order');
const { getShopStatusDetails } = require('../utils/shopStatus');

exports.getShopStatus = async (req, res, next) => {
  try {
    const systemConfig = await SystemConfig.getInstance();
    const { isOpen, source, nextOpenTime } = getShopStatusDetails(systemConfig, new Date());

    // Calculate real-time wait time based on In_Queue and Processing orders
    const activeOrders = await Order.find({
      status: { $in: ['In_Queue', 'Processing'] },
    }).select('estimatedDuration');

    const waitTime = activeOrders.reduce((total, order) => total + (order.estimatedDuration || 0), 0);

    return res.status(200).json({
      isOpen,
      source,
      nextOpenTime,
      waitTime: Math.max(0, waitTime),
      activeOrders: activeOrders.length,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getLimits = async (req, res, next) => {
  try {
    const systemConfig = await SystemConfig.getInstance();

    return res.status(200).json(systemConfig.orderLimits);
  } catch (error) {
    return next(error);
  }
};

exports.getPushConfig = async (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';

  return res.status(200).json({
    enabled: Boolean(publicKey),
    publicKey,
  });
};
