const { log } = require('./activityLogger');

async function scheduleAutoProcessingIfEnabled(order, systemConfig) {
  try {
    if (!systemConfig.spae?.autoProcessingEnabled) {
      return;
    }
    if (order.status !== 'In_Queue') {
      return;
    }
    if (order.paymentStatus !== 'Paid' && order.paymentStatus !== 'Cash_Collected') {
      return;
    }
    if (order.autoProcessAt !== null && order.autoProcessAt !== undefined) {
      return;
    }

    const autoProcessAt = new Date(Date.now() + systemConfig.spae.autoProcessingDelay * 60 * 1000);
    order.autoProcessAt = autoProcessAt;
    await order.save();

    await log({
      actionType: 'AUTO_PROCESSING_SCHEDULED',
      description: `Auto processing scheduled for order ${order.tokenNumber} at ${autoProcessAt.toISOString()} (${systemConfig.spae.autoProcessingDelay} minute delay)`,
      affectedRecordId: order._id,
      metadata: { tokenNumber: order.tokenNumber, autoProcessAt, delayMinutes: systemConfig.spae.autoProcessingDelay }
    });

    return order;
  } catch (error) {
    console.error('Error in scheduleAutoProcessingIfEnabled:', error);
    throw error;
  }
}

module.exports = { scheduleAutoProcessingIfEnabled };
