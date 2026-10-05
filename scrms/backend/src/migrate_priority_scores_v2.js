require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Order = require('./models/Order');
const ActivityLog = require('./models/ActivityLog');
const User = require('./models/User');
const { calculatePriorityScore } = require('./services/pricingService');

const VISIBLE_QUEUE_STATUSES = ['In_Queue', 'Processing', 'ReadyForPickup'];
const MIGRATION_VERSION = 'v2_priority_fix_001';

async function calculateMigration(order, isDryRun = true) {
  const report = {
    orderId: order._id.toString(),
    tokenNumber: order.tokenNumber,
    createdAt: order.createdAt,
    storedAgingScore: Number(order.agingScore) || 0,
    status: 'UNKNOWN',
    reason: '',
  };

  const now = Date.now();
  const createdAtTime = new Date(order.createdAt).getTime();
  
  if (isNaN(createdAtTime)) {
    report.status = 'EXCLUDED';
    report.reason = 'INVALID_CREATED_AT';
    return report;
  }

  const minutesSinceCreation = (now - createdAtTime) / (1000 * 60);
  const activeAgeDays = minutesSinceCreation / (60 * 24);
  
  // 1. Correct Historical Aging: Adjustment occurs AFTER 60 minutes strictly elapses
  const adjustments = Math.max(0, Math.floor((minutesSinceCreation - 1) / 60));
  const expectedHistoricalAgingScore = adjustments * 20;
  
  report.calculatedElapsedHours = (minutesSinceCreation / 60).toFixed(2);
  report.expectedHistoricalAgingScore = expectedHistoricalAgingScore;
  report.difference = report.storedAgingScore - expectedHistoricalAgingScore;

  // 2. Protect Admin Reordering
  if (order.get('migrationVersion') === MIGRATION_VERSION) {
    report.status = 'EXCLUDED';
    report.reason = 'ALREADY_MIGRATED';
    return report;
  }

  const reorderLog = await ActivityLog.findOne({
    actionType: 'QUEUE_REORDER',
    affectedRecordId: order._id
  }).lean();

  if (reorderLog) {
    report.status = 'EXCLUDED';
    report.reason = 'CONFIRMED_ADMIN_REORDER';
    return report;
  }

  if (activeAgeDays > 30) {
    report.status = 'EXCLUDED';
    report.reason = 'UNVERIFIABLE_ADMIN_REORDER_TTL_EXCEEDED';
    return report;
  }

  // 3. Recalculate Base Score
  const userRole = order.userRole || (order.userId && order.userId.role) || (order.isGuest ? 'Guest' : 'Student');
  const correctBaseScore = calculatePriorityScore(
    userRole,
    order.preferredPickupSlot,
    order.createdAt,
    order.estimatedDuration
  );

  // The final mathematically consistent score
  const newPriorityScore = correctBaseScore - expectedHistoricalAgingScore;
  
  report.oldScore = order.priorityScore;
  report.proposedScore = newPriorityScore;
  
  if (Number(order.priorityScore) === newPriorityScore && Number(order.agingScore) === expectedHistoricalAgingScore) {
    report.status = 'EXCLUDED';
    report.reason = 'ALREADY_CORRECT';
    return report;
  }

  report.status = 'ELIGIBLE';
  report.reason = 'NEEDS_UPDATE';

  // Apply Changes (if not dry run)
  if (!isDryRun && report.status === 'ELIGIBLE') {
    // 4. Reliable Backup
    if (order.get('legacyPriorityScore') === undefined) {
      order.set('legacyPriorityScore', order.priorityScore, { strict: false });
      order.set('legacyAgingScore', order.agingScore, { strict: false });
      order.set('legacyUpdatedAt', order.updatedAt, { strict: false });
    }
    
    order.priorityScore = newPriorityScore;
    order.agingScore = expectedHistoricalAgingScore;
    order.set('migrationVersion', MIGRATION_VERSION, { strict: false });
    order.set('migrationTimestamp', new Date(), { strict: false });
    
    await order.save();
  }

  return report;
}

async function executeMigration(isDryRun = true) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const activeOrders = await Order.find({ status: { $in: VISIBLE_QUEUE_STATUSES } }).populate('userId');
    
    const summary = {
      totalFound: activeOrders.length,
      totalEligible: 0,
      totalExcluded: 0,
      confirmedAdminReorder: 0,
      unverifiableAdminReorder: 0,
      invalidTimestamps: 0,
      corruptedAgingValues: 0,
      alreadyMigrated: 0,
      alreadyCorrect: 0,
      details: []
    };

    for (const order of activeOrders) {
      // The calculateMigration function actually applies the change if isDryRun is false
      const result = await calculateMigration(order, isDryRun);
      
      if (result.status === 'ELIGIBLE') {
        summary.totalEligible++;
      } else {
        summary.totalExcluded++;
        if (result.reason === 'CONFIRMED_ADMIN_REORDER') summary.confirmedAdminReorder++;
        if (result.reason === 'UNVERIFIABLE_ADMIN_REORDER_TTL_EXCEEDED') summary.unverifiableAdminReorder++;
        if (result.reason === 'INVALID_CREATED_AT') summary.invalidTimestamps++;
        if (result.reason === 'ALREADY_MIGRATED') summary.alreadyMigrated++;
        if (result.reason === 'ALREADY_CORRECT') summary.alreadyCorrect++;
      }
      
      if (result.difference !== 0 && result.difference !== undefined) {
        summary.corruptedAgingValues++;
      }

      summary.details.push(result);
    }

    console.log(`[MIGRATION ${isDryRun ? 'DRY-RUN' : 'EXECUTION'}] Complete.`);
    console.log(JSON.stringify(summary, null, 2));

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  const isExecute = process.argv.includes('--execute');
  executeMigration(!isExecute);
}

module.exports = { calculateMigration, MIGRATION_VERSION };
