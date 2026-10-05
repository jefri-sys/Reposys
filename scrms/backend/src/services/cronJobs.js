const Order = require('../models/Order');
const SystemConfig = require('../models/SystemConfig');
const { getShopStatusDetails } = require('../utils/shopStatus');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const DailyCounter = require('../models/DailyCounter');
const InventoryItem = require('../models/InventoryItem');
const User = require('../models/User');
const StaffReport = require('../models/StaffReport');
const GuestSession = require('../models/GuestSession');
const { broadcastQueueUpdate } = require('./queueService');
const { createNotification, createAdminNotification } = require('./notificationService');
const {
  sendEmail,
  buildOrderCancelledEmail,
  buildGuestSessionExpiringEmail,
} = require('../config/nodemailer');

const starvationThresholdMinutes = 60;
const starvationBoost = 20;
const paymentReminderWindowMinutes = 13;
const paymentTimeoutMinutes = 15;
const lockTimeoutMinutes = 5;
const pacReminderHours = 24;
const pacExpiryHours = 48;
const uncollectedSecondReminderHours = 48;
const uncollectedTimeoutHours = 72;

const getWaitMinutesSince = (dateValue) => (
  (Date.now() - new Date(dateValue).getTime()) / 60000
);

const getHoursSince = (dateValue) => (
  (Date.now() - new Date(dateValue).getTime()) / (60 * 60 * 1000)
);

const getLatestStatusTimestamp = (order, status) => {
  const matchingEntry = [...(order.statusHistory || [])]
    .filter((entry) => entry.status === status)
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0];

  return matchingEntry?.timestamp || null;
};

const createNotificationOnce = async (payload) => {
  if (!payload.recipientId && !payload.recipientRole) {
    return null;
  }

  const existingNotification = await Notification.findOne({
    recipientId: payload.recipientId || null,
    recipientRole: payload.recipientRole || null,
    title: payload.title,
    message: payload.message,
    type: payload.type,
  });

  if (existingNotification) {
    return existingNotification;
  }

  return createNotification(payload);
};

async function starvationJob() {
  const queuedOrders = await Order.find({ status: 'In_Queue' });
  const affectedServiceTypes = new Set();
  let boostedOrders = 0;

  for (const order of queuedOrders) {
    // Dynamic aging is now calculated on-the-fly in queueService.js using createdAt.
    // The cron job is only responsible for broadcasting updates so connected clients 
    // receive the newly calculated scores.
    const waitMinutes = getWaitMinutesSince(order.createdAt);
    
    // Broadcast if order is aged past the threshold. We broadcast for the service type
    // to keep all clients in sync.
    if (waitMinutes > starvationThresholdMinutes) {
      affectedServiceTypes.add(order.serviceType);
    }
  }

  for (const serviceType of affectedServiceTypes) {
    await broadcastQueueUpdate(serviceType);
  }

  console.log(`Starvation check: boosted ${boostedOrders} orders`);
}

async function paymentRetryJob() {
  const pendingOrders = await Order.find({
    status: 'Pending',
    paymentStatus: 'Pending',
  });

  for (const order of pendingOrders) {
    const orderAgeMinutes = getWaitMinutesSince(order.createdAt);

    if (orderAgeMinutes >= paymentReminderWindowMinutes && orderAgeMinutes < paymentTimeoutMinutes) {
      if (order.userId) {
        await createNotification({
          recipientId: order.userId,
          title: 'Payment Reminder',
          message: 'Your order will be cancelled in 2 minutes if payment is not completed.',
          type: 'payment',
        });
      }
      continue;
    }

    if (orderAgeMinutes < paymentTimeoutMinutes) {
      continue;
    }

    order.status = 'Cancelled';
    order.statusHistory.push({
      status: 'Cancelled',
      actorRole: 'System',
      timestamp: new Date(),
      note: 'Order cancelled due to incomplete payment timeout.',
    });
    await order.save();

    if (order.userId) {
      await createNotification({
        recipientId: order.userId,
        title: 'Order Cancelled',
        message: 'Your order was cancelled due to incomplete payment.',
        type: 'order_update',
      });

      const user = await User.findById(order.userId).select('name email');
      if (user?.email) {
        try {
          await sendEmail(
            user.email,
            'Reposys - Order Cancelled',
            buildOrderCancelledEmail({
              name: user.name,
              tokenNumber: order.tokenNumber,
              reason: 'Payment was not completed in time.',
            })
          );
        } catch (emailError) {
          console.error('Failed to send timeout cancellation email:', emailError);
        }
      }
    }
  }
}

async function tokenResetJob() {
  const now = new Date();
  const today = String(now.getDate()).padStart(2, '0')
    + String(now.getMonth() + 1).padStart(2, '0')
    + now.getFullYear();
  await DailyCounter.deleteMany({ date: { $ne: today } });
  console.log('Token counter reset: cleared old daily counters');
}

async function lockCleanupJob() {
  const lockCutoff = new Date(Date.now() - (lockTimeoutMinutes * 60 * 1000));
  const result = await Order.updateMany(
    {
      lockedBy: { $ne: null },
      lockedAt: { $lt: lockCutoff },
    },
    {
      $set: {
        lockedBy: null,
        lockedAt: null,
      },
    }
  );

  console.log(`Lock cleanup: cleared ${result.modifiedCount || 0} stale locks`);
}

async function pacTimeoutJob() {
  const readyOrders = await Order.find({ status: 'ReadyForPickup' });

  for (const order of readyOrders) {
    const readyAt = getLatestStatusTimestamp(order, 'ReadyForPickup') || order.updatedAt || order.createdAt;
    const readyHours = getHoursSince(readyAt);

    if (order.paymentStatus === 'Cash_Pending') {
      if (readyHours >= pacReminderHours && readyHours < pacExpiryHours) {
        if (order.userId) {
          await createNotificationOnce({
            recipientId: order.userId,
            title: 'Payment Reminder',
            message: `Your order ${order.tokenNumber} is ready for pickup and will expire if payment is not completed within 24 hours.`,
            type: 'payment',
          });
        }
      } else if (readyHours >= pacExpiryHours) {
        order.status = 'Expired';
        order.statusHistory.push({
          status: 'Expired',
          actorRole: 'System',
          timestamp: new Date(),
          note: 'Order expired unpaid after the pickup grace period.',
        });
        await order.save();
        await createNotificationOnce({
          recipientRole: 'Admin',
          title: 'Order Expired',
          message: `Order ${order.tokenNumber} has expired unpaid.`,
          type: 'order_update',
        });
      }

      continue;
    }

    if (readyHours >= pacReminderHours && readyHours < uncollectedSecondReminderHours) {
      if (order.userId) {
        await createNotificationOnce({
          recipientId: order.userId,
          title: 'Pickup Reminder',
          message: `Your order ${order.tokenNumber} is ready for pickup. Please collect it within the next 48 hours.`,
          type: 'order_update',
        });
      }
      continue;
    }

    if (readyHours >= uncollectedSecondReminderHours && readyHours < uncollectedTimeoutHours) {
      if (order.userId) {
        await createNotificationOnce({
          recipientId: order.userId,
          title: 'Second Pickup Reminder',
          message: `Your order ${order.tokenNumber} is still awaiting pickup. Please collect it soon to avoid closure.`,
          type: 'order_update',
        });
      }
      continue;
    }

    if (readyHours >= uncollectedTimeoutHours) {
      order.status = 'Uncollected';
      order.statusHistory.push({
        status: 'Uncollected',
        actorRole: 'System',
        timestamp: new Date(),
        note: 'Order marked uncollected after 72 hours without pickup.',
      });
      await order.save();
      await createNotificationOnce({
        recipientRole: 'Admin',
        title: 'Order Uncollected',
        message: `Order ${order.tokenNumber} was marked uncollected after 72 hours.`,
        type: 'order_update',
      });
    }
  }
}

async function inventoryForecastJob() {
  const items = await InventoryItem.find({});
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  void thirtyDaysAgo;

  for (const item of items) {
    // Placeholder approximation until order-based consumption tracking is added.
    const usageRate = Math.max(1, Math.round(item.currentStock * 0.05));
    const daysOfStockRemaining = Math.round(item.currentStock / usageRate);

    await InventoryItem.findByIdAndUpdate(item._id, { usageRate, daysOfStockRemaining });
  }

  console.log('Inventory forecast updated for', items.length, 'items');
}

async function unacknowledgedReportReminderJob() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const reports = await StaffReport.find({
    status: 'Pending',
    createdAt: { $lt: twoHoursAgo }
  }).populate('raisedBy', 'name');
  
  for (const report of reports) {
    await createAdminNotification({
      title: 'Unacknowledged Report Reminder',
      message: `${report.reportRef} has not been acknowledged for over 2 hours`,
      relatedEntity: report.reportRef,
      urgency: 'Normal'
    });
  }
  if (reports.length > 0) console.log('Sent reminders for', reports.length, 'unacknowledged reports');
}

async function guestSessionTimeoutJob() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const fiveMinutesAgo = new Date(Date.now() - 25 * 60 * 1000);

  const activeSessions = await GuestSession.find({ isActive: true });

  for (const session of activeSessions) {
    const activeOrder = await Order.findOne({
      guestSessionId: session.sessionId,
      status: { $in: ['In_Queue', 'Processing', 'ReadyForPickup'] }
    });
    if (activeOrder) continue;

    const recentOrder = await Order.findOne({
      guestSessionId: session.sessionId,
      'statusHistory.timestamp': { $gt: thirtyMinutesAgo },
    });

    if (!recentOrder) {
      if (session.createdAt < fiveMinutesAgo) {
        try {
          await sendEmail(
            session.email,
            'Reposys Guest Session Expiring',
            buildGuestSessionExpiringEmail()
          );
        } catch (emailError) {
          console.error('Failed to send guest session expiry warning:', emailError);
        }
      }

      if (session.createdAt < thirtyMinutesAgo) {
        session.isActive = false;
        session.sessionToken = null;
        await session.save();
      }
    }
  }
}

async function autoProcessingJob() {
  try {
    // 1. Load system config
    const systemConfig = await SystemConfig.getInstance();

    // 2. If auto-processing is disabled globally, do nothing
    if (!systemConfig.spae?.autoProcessingEnabled) {
      return;
    }

    // 3. Check if shop is open
    const { isOpen } = getShopStatusDetails(systemConfig, new Date());
    if (!isOpen) {
      console.log('[autoProcessingJob] Shop is closed. Skipping auto-processing.');
      return;
    }

    // 4. Find all In_Queue orders where autoProcessAt has passed and is not null
    const now = new Date();
    const eligibleOrders = await Order.find({
      status: 'In_Queue',
      autoProcessAt: { $lte: now, $ne: null },
    });

    if (eligibleOrders.length === 0) {
      return;
    }

    // 5. Process each eligible order
    for (const order of eligibleOrders) {
      try {
        // Re-fetch order with a fresh read to prevent race conditions
        const freshOrder = await Order.findById(order._id);

        // Guard: if order is no longer In_Queue (staff may have acted manually), skip
        if (!freshOrder || freshOrder.status !== 'In_Queue') {
          await ActivityLog.create({
            actionType: 'AUTO_PROCESSING_SKIPPED',
            description: `Auto processing skipped for ${order.tokenNumber}: order status is ${freshOrder?.status || 'not found'} (expected In_Queue)`,
            affectedRecordId: order._id,
            metadata: { tokenNumber: order.tokenNumber, reason: 'status_changed' },
          });
          continue;
        }

        // Guard: payment must be confirmed
        const validPaymentStatuses = ['Paid', 'Cash_Collected'];
        if (!validPaymentStatuses.includes(freshOrder.paymentStatus)) {
          await ActivityLog.create({
            actionType: 'AUTO_PROCESSING_SKIPPED',
            description: `Auto processing skipped for ${freshOrder.tokenNumber}: payment status is ${freshOrder.paymentStatus}`,
            affectedRecordId: freshOrder._id,
            metadata: { tokenNumber: freshOrder.tokenNumber, reason: 'payment_not_confirmed', paymentStatus: freshOrder.paymentStatus },
          });
          continue;
        }

        // Transition the order to Processing
        freshOrder.status = 'Processing';
        freshOrder.assignedStaffId = null;
        freshOrder.lockedBy = null;
        freshOrder.lockedAt = null;
        freshOrder.autoProcessAt = null; // Clear the schedule to prevent re-triggering
        freshOrder.statusHistory.push({
          status: 'Processing',
          actorId: null,
          actorRole: 'System',
          timestamp: new Date(),
          note: 'Automatically started by Smart Auto Processing Engine.',
        });
        await freshOrder.save();

        // Log the successful auto-processing start
        await ActivityLog.create({
          actionType: 'AUTO_PROCESSING_STARTED',
          description: `Auto processing started for order ${freshOrder.tokenNumber}`,
          affectedRecordId: freshOrder._id,
          metadata: { tokenNumber: freshOrder.tokenNumber, serviceType: freshOrder.serviceType },
        });

        // Handle print job creation and dispatch (mirrors startProcessing logic)
        try {
          const PrintJob = require('../models/PrintJob');
          const { createPrintJobForOrder, dispatchPrintJob } = require('./automationService');

          let printJob = await PrintJob.findOne({ orderId: freshOrder._id });
          if (!printJob && systemConfig.spae?.enabled) {
            const result = await createPrintJobForOrder(freshOrder, systemConfig);
            if (result && result.success) {
              printJob = result.job;
            }
          }
          if (printJob) {
            if (['Pending', 'Queued', 'Assigned'].includes(printJob.status)) {
              printJob.status = 'Dispatching';
              printJob.startedAt = new Date();
              await printJob.save();
            }
            if (systemConfig.spae?.enabled && printJob.printerId && printJob.printerId !== 'MANUAL') {
              await dispatchPrintJob(printJob);
            }
          }
        } catch (printJobErr) {
          console.warn(`[autoProcessingJob] PrintJob dispatch failed for ${freshOrder.tokenNumber}:`, printJobErr.message);
          await ActivityLog.create({
            actionType: 'AUTO_PROCESSING_FAILED',
            description: `Auto processing print job dispatch failed for ${freshOrder.tokenNumber}: ${printJobErr.message}`,
            affectedRecordId: freshOrder._id,
            metadata: { tokenNumber: freshOrder.tokenNumber, error: printJobErr.message },
          });
        }

        // Notify the user
        if (freshOrder.userId) {
          const { createNotification } = require('./notificationService');
          await createNotification({
            recipientId: freshOrder.userId,
            title: 'Order Being Processed',
            message: `Your order ${freshOrder.tokenNumber} is now being processed.`,
            type: 'order_update',
          });
        }

        // Broadcast queue update
        await broadcastQueueUpdate(freshOrder.serviceType);

      } catch (orderErr) {
        console.error(`[autoProcessingJob] Error processing order ${order.tokenNumber}:`, orderErr.message);
        await ActivityLog.create({
          actionType: 'AUTO_PROCESSING_FAILED',
          description: `Auto processing failed for order ${order.tokenNumber}: ${orderErr.message}`,
          affectedRecordId: order._id,
          metadata: { tokenNumber: order.tokenNumber, error: orderErr.message },
        });
      }
    }

  } catch (err) {
    console.error('[autoProcessingJob] Fatal cron error:', err.message);
  }
}

module.exports = {
  starvationJob,
  paymentRetryJob,
  tokenResetJob,
  lockCleanupJob,
  pacTimeoutJob,
  inventoryForecastJob,
  unacknowledgedReportReminderJob,
  guestSessionTimeoutJob,
  autoProcessingJob,
};
