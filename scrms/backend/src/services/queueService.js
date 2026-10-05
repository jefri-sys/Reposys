// Queue priority: lower score = higher priority. Sort ASC.
const Order = require('../models/Order');
const socketHandler = require('../socket/socketHandler');

const VISIBLE_QUEUE_STATUSES = ['In_Queue', 'Processing', 'ReadyForPickup'];
const BLOCKING_QUEUE_STATUSES = ['In_Queue', 'Processing'];

const { calculateEffectivePriority, calculateAgingDeduction } = require('./pricingService');

const resolvePriorityScore = (order) => {
  const storedPriorityScore = Number(order.priorityScore);
  return Number.isFinite(storedPriorityScore) ? storedPriorityScore : 200;
};

const toQueueItem = (order, position) => {
  const baseScore = resolvePriorityScore(order);
  const effectivePriorityScore = calculateEffectivePriority(baseScore, order.createdAt);
  
  return {
    ...order.toObject(),
    priorityScore: effectivePriorityScore, // dynamically computed effective score
    basePriority: baseScore, // preserve the DB score for reference
    agingDeduction: calculateAgingDeduction(order.createdAt),
    position,
  };
};

async function getQueue(serviceType) {
  const orders = await Order.find({
    serviceType,
    status: { $in: VISIBLE_QUEUE_STATUSES },
  })
    .populate('userId', 'name role department')
    .sort({ createdAt: 1 });

  const queue = orders
    .map((order) => toQueueItem(order, 0))
    .sort((left, right) => {
      if (left.priorityScore !== right.priorityScore) {
        return left.priorityScore - right.priorityScore;
      }

      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    })
    .map((order, index) => ({
      ...order,
      position: index + 1,
    }));

  return queue;
}

async function getWaitTime(orderId) {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found.');
  }

  const queue = await getQueue(order.serviceType);
  const queueIndex = queue.findIndex((queueOrder) => String(queueOrder._id) === String(order._id));

  if (queueIndex === -1) {
    throw new Error('Order is not in the active queue.');
  }

  const ordersAhead = queue
    .filter((queueOrder, index) => (
      index < queueIndex && BLOCKING_QUEUE_STATUSES.includes(queueOrder.status)
    ));

  const waitMinutes = ordersAhead
    .reduce((total, queueOrder) => total + (Number(queueOrder.estimatedDuration) || 0), 0);

  return {
    position: queue[queueIndex].position,
    waitMinutes,
  };
}

async function broadcastQueueUpdate(serviceType) {
  const queue = await getQueue(serviceType);
  const io = socketHandler.getIO();

  io.to(`queue:${serviceType}`).emit('queue_update', {
    type: 'queue_update',
    serviceType,
    queue,
  });

  for (const order of queue) {
    if (!BLOCKING_QUEUE_STATUSES.includes(order.status)) {
      continue;
    }

    const waitMinutes = queue
      .filter((queueOrder, index) => (
        index < order.position - 1 && BLOCKING_QUEUE_STATUSES.includes(queueOrder.status)
      ))
      .reduce((total, queueOrder) => total + (Number(queueOrder.estimatedDuration) || 0), 0);

    const payload = {
      type: 'queue_update',
      orderId: order._id,
      serviceType,
      position: order.position,
      waitMinutes,
    };

    if (order.isGuest === true && order.guestSessionId) {
      io.to(`guest:${order.guestSessionId}`).emit('queue_update', payload);
      continue;
    }

    if (order.isGuest === false && order.userId?._id) {
      io.to(`user:${order.userId._id}`).emit('queue_update', payload);
    }
  }
}

module.exports = {
  getQueue,
  getWaitTime,
  broadcastQueueUpdate,
};
