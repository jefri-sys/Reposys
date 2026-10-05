require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');

const MONGODB_URI = process.env.MONGODB_URI;

const runMigration = async () => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set.');
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB for order phase 4/5 migration');

  const confirmedStatusResult = await Order.updateMany(
    { status: 'Confirmed' },
    { $set: { status: 'In_Queue' } }
  );

  const statusHistoryResult = await Order.updateMany(
    { 'statusHistory.status': 'Confirmed' },
    { $set: { 'statusHistory.$[entry].status': 'In_Queue' } },
    { arrayFilters: [{ 'entry.status': 'Confirmed' }] }
  );

  const cashPendingResult = await Order.updateMany(
    {
      paymentMethod: 'Cash',
      paymentStatus: 'Pending',
    },
    { $set: { paymentStatus: 'Cash_Pending' } }
  );

  const otpAttemptsResult = await Order.updateMany(
    { otpAttempts: { $exists: false } },
    { $set: { otpAttempts: 0 } }
  );

  const otpLockedResult = await Order.updateMany(
    { otpLocked: { $exists: false } },
    { $set: { otpLocked: false } }
  );

  const partialPagesResult = await Order.updateMany(
    { partialPagesCompleted: { $exists: false } },
    { $set: { partialPagesCompleted: 0 } }
  );

  const lockedByResult = await Order.updateMany(
    { lockedBy: { $exists: false } },
    { $set: { lockedBy: null } }
  );

  const lockedAtResult = await Order.updateMany(
    { lockedAt: { $exists: false } },
    { $set: { lockedAt: null } }
  );

  const followUpOrderResult = await Order.updateMany(
    { followUpOrderId: { $exists: false } },
    { $set: { followUpOrderId: null } }
  );

  const internalNotesResult = await Order.updateMany(
    { internalNotes: { $exists: false } },
    { $set: { internalNotes: '' } }
  );

  console.log('Migration summary:');
  console.log(`- status Confirmed -> In_Queue: ${confirmedStatusResult.modifiedCount}`);
  console.log(`- statusHistory Confirmed -> In_Queue: ${statusHistoryResult.modifiedCount}`);
  console.log(`- cash paymentStatus Pending -> Cash_Pending: ${cashPendingResult.modifiedCount}`);
  console.log(`- otpAttempts backfilled: ${otpAttemptsResult.modifiedCount}`);
  console.log(`- otpLocked backfilled: ${otpLockedResult.modifiedCount}`);
  console.log(`- partialPagesCompleted backfilled: ${partialPagesResult.modifiedCount}`);
  console.log(`- lockedBy backfilled: ${lockedByResult.modifiedCount}`);
  console.log(`- lockedAt backfilled: ${lockedAtResult.modifiedCount}`);
  console.log(`- followUpOrderId backfilled: ${followUpOrderResult.modifiedCount}`);
  console.log(`- internalNotes backfilled: ${internalNotesResult.modifiedCount}`);
};

if (require.main === module) {
  runMigration()
    .then(async () => {
      await mongoose.disconnect();
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Order phase 4/5 migration failed:', error);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}

module.exports = {
  runMigration,
};
