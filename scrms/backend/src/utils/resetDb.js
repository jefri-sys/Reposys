require('dotenv').config();
const mongoose = require('mongoose');

const COLLECTIONS_TO_CLEAR = [
  'users',
  'orders',
  'payments',
  'notifications',
  'documents',
  'dailycounters',
  'activitylogs',
  'complaints',
  'ratings',
  'staffreports',
  'guestsessions',
  'wallets',
  'wallettransactions',
  'friendships',
  'messages',
  'groups',
  'grouporders',
  'splitrequests',
  'agenttokens',
  'automationlogs',
  'inquiries',
  'printagentregistries',
  'printjobs'
];

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    const db = mongoose.connection.db;

    for (const name of COLLECTIONS_TO_CLEAR) {
      try {
        await db.collection(name).deleteMany({});
        console.log(`  ✓ Cleared: ${name}`);
      } catch (err) {
        // Collection may not exist yet — that's fine
        console.log(`  - Skipped (not found): ${name}`);
      }
    }

    console.log('\nAll user data cleared successfully');
    console.log('SystemConfig and Inventory preserved');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
