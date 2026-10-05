const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const http = require('http');
const mongoose = require('mongoose');
const cron = require('node-cron');
const app = require('./app');
const socketHandler = require('./socket/socketHandler');
const {
  starvationJob,
  paymentRetryJob,
  tokenResetJob,
  lockCleanupJob,
  pacTimeoutJob,
  inventoryForecastJob,
  unacknowledgedReportReminderJob,
  guestSessionTimeoutJob,
  autoProcessingJob,
} = require('./services/cronJobs');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Creates an HTTP server from the Express app
const httpServer = http.createServer(app);

// 15. Global process error handlers to log and manage fatal errors
process.on('uncaughtException', (err) => {
  console.error('FATAL UNCAUGHT EXCEPTION:', err);
  // Log more details if needed, then exit to let nodemon/PM2 restart
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('FATAL UNHANDLED REJECTION:', reason);
  process.exit(1);
});

// Connects to MONGODB_URI from .env, logging success or throwing on failure
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    const io = socketHandler.init(httpServer);
    const { startShopScheduler } = require('./utils/shopScheduler');
    startShopScheduler(io);
    cron.schedule('*/10 * * * *', starvationJob);
    cron.schedule('* * * * *', paymentRetryJob);
    cron.schedule('* * * * *', lockCleanupJob);
    cron.schedule('0 * * * *', pacTimeoutJob);
    cron.schedule('0 0 * * *', tokenResetJob);
    cron.schedule('0 0 * * *', inventoryForecastJob);
    cron.schedule('*/30 * * * *', unacknowledgedReportReminderJob);
    cron.schedule('*/15 * * * *', guestSessionTimeoutJob);
    cron.schedule('* * * * *', autoProcessingJob);
    
    // Render spin-down mitigation
    const https = require('https');
    setInterval(() => {
      const url = process.env.RENDER_EXTERNAL_URL;
      if (url) {
        https.get(`${url}/api/health`).on('error', () => {});
      }
    }, 10 * 60 * 1000);

    // Starts listening on PORT from .env, defaulting to 5000
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });
