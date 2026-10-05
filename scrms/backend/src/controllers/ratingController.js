const Rating = require('../models/Rating');
const Order = require('../models/Order');

exports.createRating = async (req, res, next) => {
  try {
    const { orderId, stars, comment } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (String(order.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only rate your own orders' });
    }

    if (order.status !== 'Completed') {
      return res.status(400).json({ message: 'Only completed orders can be rated' });
    }

    const existingRating = await Rating.findOne({ orderId });
    if (existingRating) {
      return res.status(400).json({ message: 'You have already rated this order' });
    }

    const rating = await Rating.create({
      orderId,
      userId: req.user.id,
      serviceType: order.serviceType,
      stars,
      comment,
    });

    res.status(201).json({ rating });
  } catch (error) {
    next(error);
  }
};

exports.getRatingsSummary = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [serviceAverages, overallStats, flaggedRatings, trendData] = await Promise.all([
      Rating.aggregate([
        {
          $group: {
            _id: '$serviceType',
            averageStars: { $avg: '$stars' },
            count: { $sum: 1 },
          },
        },
      ]),
      Rating.aggregate([
        {
          $group: {
            _id: null,
            averageStars: { $avg: '$stars' },
            totalRatings: { $sum: 1 },
          },
        },
      ]),
      Rating.find({ stars: { $lt: 3 } })
        .populate('orderId', 'tokenNumber serviceType')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(50),
      Rating.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            averageStars: { $avg: '$stars' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.status(200).json({
      serviceAverages,
      overall: overallStats[0] || { averageStars: 0, totalRatings: 0 },
      flaggedRatings,
      trendData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyRatings = async (req, res, next) => {
  try {
    const ratings = await Rating.find({ userId: req.user.id })
      .populate('orderId', 'tokenNumber serviceType')
      .sort({ createdAt: -1 });
    res.status(200).json({ ratings });
  } catch (error) {
    next(error);
  }
};
