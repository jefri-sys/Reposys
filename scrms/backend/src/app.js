const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const { getPrimaryFrontendUrl, isOriginAllowed } = require('./config/origins');
const eventDispatcher = require('./services/eventDispatcher');
const automationService = require('./services/automationService');

// Environment configuration reload trigger
const app = express();

app.set('trust proxy', 1);

// 1. helmet() for security headers
app.use(helmet());

// 2. cors() with credentials
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// 3. express.json() for request body parsing, skipping webhook
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// 4. morgan('dev') for HTTP request logging
app.use(morgan('dev'));

// 5. cookie-parser middleware for reading cookies
app.use(cookieParser());

// SPAE Phase 1 — Event Handler Registration
eventDispatcher.on('PAYMENT_VERIFIED', automationService.handlePaymentVerified);
eventDispatcher.on('CASH_CONFIRMED', automationService.handleCashConfirmed);
eventDispatcher.on('ORDER_CANCELLED', automationService.handleOrderCancelled);

// 6. Import and mount all route files under /api prefix
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const documentRoutes = require('./routes/documents');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const staffRoutes = require('./routes/staff');
const configRoutes = require('./routes/config');
const complaintRoutes = require('./routes/complaints');
const inventoryRoutes = require('./routes/inventory');
const staffReportRoutes = require('./routes/staffReports');
const ratingRoutes = require('./routes/ratings');
const toolsRoutes = require('./routes/tools');
const chatbotRoutes = require('./routes/chatbot');
const userRoutes = require('./routes/users');
const guestRoutes = require('./routes/guest');
const contactRoutes = require('./routes/contact');
const contactController = require('./controllers/contactController');
const printerRoutes = require('./routes/printers');

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'reposys-backend',
    release: 'contact-public-2026-05-17',
    hasTestPush: true
  });
});

app.get('/api/config/push', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';

  res.status(200).json({
    enabled: Boolean(publicKey),
    publicKey,
  });
});

app.get('/api/config/push/debug', (req, res) => {
  try {
    const webPush = require('web-push');
    const vapidEmail = process.env.VAPID_EMAIL;
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    let error = null;
    let pushConfigured = false;

    if (vapidEmail && vapidPublicKey && vapidPrivateKey) {
      try {
        const resolveVapidSubject = (value) => {
          if (!value) return '';
          if (value.startsWith('mailto:') || value.startsWith('https://') || value.startsWith('http://')) return value;
          return `mailto:${value}`;
        };
        webPush.setVapidDetails(
          resolveVapidSubject(vapidEmail),
          vapidPublicKey,
          vapidPrivateKey
        );
        pushConfigured = true;
      } catch (err) {
        error = err.message;
      }
    }

    res.status(200).json({
      vapidEmail: Boolean(vapidEmail),
      vapidPublicKey: Boolean(vapidPublicKey),
      vapidPrivateKey: Boolean(vapidPrivateKey),
      pushConfigured,
      error,
      envEmailLength: vapidEmail ? vapidEmail.length : 0,
      envPublicKeyLength: vapidPublicKey ? vapidPublicKey.length : 0,
      envPrivateKeyLength: vapidPrivateKey ? vapidPrivateKey.length : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contact', contactController.submitInquiry);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/receipt', require('./routes/receiptRoutes'));
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/config', configRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/friends', require('./routes/friendshipRoutes'));
app.use('/api/group-orders', require('./routes/groupOrderRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/group-chat', require('./routes/groupChatRoutes'));
app.use('/api/convert', require('./routes/convertRoutes'));
app.use('/api/automation', require('./routes/automation'));
app.use('/api/printers', printerRoutes);
app.use('/api/admin/print-agent', require('./routes/printAgentRoutes'));

app.use('/api/staff-reports', staffReportRoutes);
app.use('/api/admin/staff-reports', staffReportRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/users', userRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api', staffRoutes);

// 7. Import and mount the global errorHandler middleware LAST
app.use(errorHandler);

module.exports = app;
