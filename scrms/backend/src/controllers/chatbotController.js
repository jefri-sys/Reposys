const Groq = require('groq-sdk');
const Order = require('../models/Order');
const SystemConfig = require('../models/SystemConfig');
const { getQueue, getWaitTime } = require('../services/queueService');
const { calculateCost } = require('../services/pricingService');
const { getShopStatusDetails } = require('../utils/shopStatus');

const MAX_MESSAGE_LENGTH = 500;
const FALLBACK_REPLY = 'I am having trouble connecting right now. Please try again shortly.';
const OFF_TOPIC_REPLY = 'I can only help with Reposys reprography services. Try asking me about pricing, services, queue status, or how to place an order.';
const PRICING_KEYWORDS = [
  'price',
  'pricing',
  'cost',
  'charge',
  'how much',
  'rate',
  'fee',
  'fees',
  'rs',
  'rupee',
  '₹',
  'b&w',
  'black',
  'colour',
  'color',
];
const IN_SCOPE_KEYWORDS = [
  ...PRICING_KEYWORDS,
  'reposys',
  'print',
  'printing',
  'photocopy',
  'copy',
  'scan',
  'scanning',
  'binding',
  'spiral',
  'staple',
  'conversion',
  'convert',
  'document',
  'file',
  'upload',
  'pdf',
  'doc',
  'docx',
  'jpg',
  'jpeg',
  'png',
  'queue',
  'wait',
  'busy',
  'position',
  'order',
  'token',
  'receipt',
  'pickup',
  'collect',
  'ready',
  'otp',
  'payment',
  'pay',
  'cash',
  'online',
  'complaint',
  'problem',
  'issue',
  'cancel',
  'priority',
  'faculty',
  'student',
  'guest',
  'register',
  'account',
  'sign up',
  'double',
  'sided',
  'duplex',
  'resize',
  'compress',
  'reprography',
  'shop',
  'centre',
  'center',
  'hours',
  'timing',
  'working',
  'campus',
  'help',
  'service',
  'services',
  'offer',
  'available',
  'history',
  'recent',
  'previous',
];
const OFF_TOPIC_KEYWORDS = ['weather', 'news', 'cricket', 'movie', 'food', 'joke'];

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const formatPrice = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '0';
  }

  return Number.parseFloat(numericValue.toFixed(2)).toString();
};

const formatCurrency = (value) => `₹${formatPrice(value)}`;

const includesKeyword = (message, keywords) => keywords.some((keyword) => message.includes(keyword));

const isPricingQuestion = (message) => includesKeyword(message, PRICING_KEYWORDS);

const isInScopeQuestion = (message) => includesKeyword(message, IN_SCOPE_KEYWORDS);

const buildPricingReply = (pricing = {}) => [
  `Current pricing: B&W printing ${formatCurrency(pricing.printBW)}/page`,
  `Colour printing ${formatCurrency(pricing.printColour)}/page`,
  `Photocopying ${formatCurrency(pricing.photocopy)}/page`,
  `Scanning ${formatCurrency(pricing.scanning)}/page`,
  `Spiral binding ${formatCurrency(pricing.bindingSpiral)} flat`,
  `Staple binding ${formatCurrency(pricing.bindingStaple)} flat`,
  'Conversion free',
].join(', ') + '.';

const buildShopStatusLabel = (config, shopStatus) => {
  if (config?.isManuallyOpen === false) {
    return 'closed';
  }

  if (config?.isManuallyOpen === true) {
    return 'open';
  }

  if (shopStatus?.isOpen === true) {
    return 'open and following schedule';
  }

  if (shopStatus?.isOpen === false) {
    return 'closed and following schedule';
  }

  return 'following schedule';
};

const buildUserContextLines = ({
  userActiveOrder,
  userRecentOrders,
  userQueuePosition,
  userWaitMinutes,
  specificOrder,
}) => {
  const lines = ['USER-SPECIFIC LIVE DATA:'];

  if (specificOrder) {
    lines.push(
      `- User query refers to specific order: ${specificOrder.tokenNumber} — Status: ${specificOrder.status} — Service: ${specificOrder.serviceType} — Cost: ${formatCurrency(specificOrder.estimatedCost)}`
    );
  }

  if (userActiveOrder) {
    lines.push(
      `- Active order: ${userActiveOrder.tokenNumber} — Status: ${userActiveOrder.status} — Service: ${userActiveOrder.serviceType}`
    );

    if (userActiveOrder.status === 'In_Queue') {
      lines.push(`  Queue position: ${userQueuePosition ?? 'unknown'}, Estimated wait: ${userWaitMinutes ?? 'unknown'} minutes`);
    } else if (userActiveOrder.status === 'Processing') {
      lines.push('  Currently being processed by staff');
    } else if (userActiveOrder.status === 'ReadyForPickup') {
      lines.push('  Ready for collection — check email for OTP');
    }
  } else {
    lines.push('- No active order: User has no current active order');
  }

  if (Array.isArray(userRecentOrders) && userRecentOrders.length > 0) {
    const recentOrders = userRecentOrders
      .map((order) => `${order.tokenNumber} (${order.serviceType}, ${order.status}, ${formatCurrency(order.estimatedCost)})`)
      .join('; ');
    lines.push(`- Recent orders: ${recentOrders}`);
  } else {
    lines.push('- Recent orders: none');
  }

  return lines;
};

const buildSystemPrompt = ({
  config,
  shopStatus,
  queueLengths,
  userActiveOrder,
  userRecentOrders,
  userQueuePosition,
  userWaitMinutes,
  specificOrder,
  calculatedCostContext = null,
  waitTimes = null,
  userName = null,
  quietHours = null,
  peakHours = null,
}) => {
  const pricing = config?.pricing || {};
  const orderLimits = config?.orderLimits || {};
  const userContextLines = buildUserContextLines({
    userActiveOrder,
    userRecentOrders,
    userQueuePosition,
    userWaitMinutes,
    specificOrder,
  });

  const waitTimesLine = waitTimes
    ? `Exact wait times: Printing ${waitTimes.Printing}min, Photocopying ${waitTimes.Photocopying}min, Scanning ${waitTimes.Scanning}min, Binding ${waitTimes.Binding}min`
    : null;

  const userNameLine = userName ? `User's name is ${userName}. Address them by name naturally.` : null;

  return [
    'You are the Reposys assistant for a college campus reprography centre at Saintgits College of Engineering.',
    userNameLine,
    'You help students, faculty, and staff with questions about printing services, pricing, queue status, their own orders, and how to use the system.',
    '',
    'CURRENT LIVE DATA:',
    `- Shop status: ${buildShopStatusLabel(config, shopStatus)}`,
    `- ${buildPricingReply(pricing)}`,
    `- Current queue lengths: Printing: ${queueLengths.Printing} orders, Photocopying: ${queueLengths.Photocopying}, Scanning: ${queueLengths.Scanning}, Binding: ${queueLengths.Binding}`,
    waitTimesLine,
    quietHours ? `- Historical quietest hours (best time to order): ${quietHours.join(', ')}` : null,
    peakHours ? `- Historical peak/busiest hours (avoid if possible): ${peakHours.join(', ')}` : null,
    '- Accepted file formats: PDF, DOC, DOCX, JPG, PNG (max 25MB)',
    '- Available services: Printing, Photocopying, Scanning, Binding, Document Conversion',
    `- Order limits: max ${orderLimits.maxPagesPerOrder || 0} pages per order, max ${orderLimits.maxCopies || 0} copies, max ${orderLimits.maxDocumentsPerOrder || 10} documents per order`,
    calculatedCostContext,
    '',
    ...userContextLines,
    '',
    'RULES:',
    '- Only answer questions related to Reposys, reprography services, campus printing, or the authenticated user order data above',
    '- If asked about pricing, always use the CURRENT LIVE DATA above',
    '- If asked about queue or order status, use the current queue and user-specific data above',
    '- If the user mentions a specific token number (format: 8 digits - 4 digits, e.g. 30042026-0004), \n  look it up in their recent orders list provided above and give its specific status.\n  If not in the recent orders list, tell them to check My Orders page.',
    '- If asked something unrelated to reprography or Reposys, use the exact off-topic reply',
    '- Keep responses concise and helpful - max 3 sentences unless more detail is needed',
    '- Do not make up information not provided above',
    '- Always be friendly and professional',
    '- FORMATTING: Never use any markdown syntax. Do not use **, *, #, -, backticks, bullet points, numbered lists, or any other markdown characters. Write in plain, clean, natural sentences only.',
    '',
    `OFF-TOPIC REPLY: ${OFF_TOPIC_REPLY}`,
  ].filter(Boolean).join('\n');
};

const getOrderId = (order) => order?._id || order?.id;

const buildMockReply = async ({
  message,
  historyContext,
  config,
  queueLengths,
  userActiveOrder,
  userRecentOrders,
  userQueuePosition,
  userWaitMinutes,
  req,
  res,
}) => {
  const msg = message.toLowerCase().trim();
  const hist = (historyContext || '').toLowerCase();

  // Helper: Reliable Service Type Extractor (Prioritize current message)
  const extractService = (text) => {
    if (text.includes('photocopy') || text.includes('xerox')) return 'Photocopying';
    if (text.includes('scan')) return 'Scanning';
    if (text.includes('bind')) return 'Binding';
    if (text.includes('print')) return 'Printing';
    return null;
  };

  // Helper: Context-Aware Intent Detection
  const hasWaitKeywords = (text) => ['wait', 'how long', 'queue time', 'when will'].some((k) => text.includes(k));
  const hasCostKeywords = (text) => ['how much', 'cost', 'price', 'estimate', 'calculate', 'charge', '₹'].some((k) => text.includes(k));
  const hasBestTimeKeywords = (text) => ['best time', 'when should', 'least busy', 'off peak', 'optimal time', 'quiet time', 'peak', 'busy time', 'busiest'].some((k) => text.includes(k));
  const hasQueueKeywords = (text) => ['queue', 'busy', 'position', 'status'].some((k) => text.includes(k));

  const hasAnyIntentResult =
    hasWaitKeywords(msg) ||
    hasCostKeywords(msg) ||
    hasBestTimeKeywords(msg) ||
    hasQueueKeywords(msg) ||
    [...PRICING_KEYWORDS, 'order', 'status', 'token', 'recent', 'history', 'payment', 'complaint', 'cancel', 'format', 'service', 'timing', 'open', 'how to', 'otp', 'pickup', 'pay', 'tool', 'ok', 'thanks', 'thank you'].some((k) => msg.includes(k));

  const isFollowUp = msg.length < 35 && !hasAnyIntentResult;

  // Determine current service and intent with proper priority
  const currentService = extractService(msg);
  const serviceType = currentService || extractService(hist) || 'Printing';

  const currentWaitIntent = hasWaitKeywords(msg);
  const currentCostIntent = hasCostKeywords(msg);
  const currentBestTimeIntent = hasBestTimeKeywords(msg);
  const currentQueueIntent = hasQueueKeywords(msg);

  // Intent Finalization (Priority: Wait > Best Time > Queue > Cost)
  let intent = '';
  if (currentWaitIntent) intent = 'wait';
  else if (currentBestTimeIntent) intent = 'best_time';
  else if (currentQueueIntent) intent = 'queue';
  else if (currentCostIntent) intent = 'cost';
  else if (isFollowUp) {
    // Only check history for follow-ups that don't have their own intent
    if (hasWaitKeywords(hist)) intent = 'wait';
    else if (hasBestTimeKeywords(hist)) intent = 'best_time';
    else if (hasQueueKeywords(hist)) intent = 'queue';
    else if (hasCostKeywords(hist)) intent = 'cost';
  }

  const pricing = config?.pricing || {};
  const shopStatus =
    config?.isManuallyOpen === false
      ? 'closed'
      : config?.isManuallyOpen === true
        ? 'open'
        : 'following schedule';
  const totalQueue =
    queueLengths.Printing + queueLengths.Photocopying + queueLengths.Scanning + queueLengths.Binding;

  let reply = '';

  // Feature 1 — Cost Estimation (Must NOT catch Wait Time queries)
  if (intent === 'cost') {
    // Detect cost-specific parameters
    const pageMatch = msg.match(/(\d+)\s*page/i);
    const copyMatch = msg.match(/(\d+)\s*cop/i);
    const pages = pageMatch ? parseInt(pageMatch[1]) : (hist.match(/(\d+)\s*page/i) ? parseInt(hist.match(/(\d+)\s*page/i)[1]) : null);
    const copies = copyMatch ? parseInt(copyMatch[1]) : 1;

    const combinedCombined = (msg + ' ' + hist);
    const isColour = combinedCombined.includes('colour') || combinedCombined.includes('color');
    const isDouble = combinedCombined.includes('double') || combinedCombined.includes('duplex');
    const hasSpiral = combinedCombined.includes('spiral');
    const hasStaple = combinedCombined.includes('staple');

    if (pages) {
      const costResult = calculateCost(
        {
          serviceType,
          pageCount: pages,
          copies,
          colourMode: isColour ? 'Colour' : 'BlackAndWhite',
          sided: isDouble ? 'Double' : 'Single',
          binding: hasSpiral ? 'Spiral' : hasStaple ? 'Staple' : 'None',
          documentCount: 1,
        },
        config.pricing
      );

      reply = `Estimated cost for ${pages} pages ${isColour ? 'colour' : 'B&W'} ${isDouble ? 'double-sided' : 'single-sided'
        } ${serviceType.toLowerCase()}${copies > 1 ? ` (${copies} copies)` : ''}${hasSpiral ? ' with spiral binding' : hasStaple ? ' with staple binding' : ''
        }: ₹${costResult.estimatedCost}. Breakdown — Base: ₹${costResult.breakdown.baseRate
        }/page${hasSpiral ? `, Binding: ₹${costResult.breakdown.bindingCharge}` : ''}. Place your order at /orders/new.`;
      return res.json({ reply, isMock: true });
    } else {
      reply = `To estimate your cost, tell me the number of pages. For example: "How much for 20 pages colour printing?"`;
      return res.json({ reply, isMock: true });
    }
  }

  // Feature 2 — Wait Time Estimation
  if (intent === 'wait' && !msg.includes('my order')) {
    const queue = await getQueue(serviceType);
    const totalWait = queue
      .filter((o) => ['In_Queue', 'Processing'].includes(o.status))
      .reduce((sum, o) => sum + (o.estimatedDuration || 0), 0);
    const queueCount = queue.filter((o) => o.status === 'In_Queue').length;

    if (totalWait === 0) {
      reply = `The ${serviceType} queue is empty right now — if you place an order now it will be processed almost immediately.`;
    } else if (totalWait < 15) {
      reply = `The ${serviceType} queue has ${queueCount} orders. Estimated wait if you order now: ${totalWait} minutes. Great time to place an order!`;
    } else if (totalWait < 45) {
      reply = `The ${serviceType} queue has ${queueCount} orders. Estimated wait if you order now: ${totalWait} minutes. Moderate wait time.`;
    } else {
      reply = `The ${serviceType} queue has ${queueCount} orders. Estimated wait if you order now: ${totalWait} minutes. Queue is busy — consider ordering later.`;
    }
    return res.json({ reply, isMock: true });
  }

  // Feature 3 — Best Time to Order
  if (intent === 'best_time') {
    // Query peak hours from orders collection
    const hourlyData = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
    ]);

    // Get current queue load
    const totalQueueNow =
      queueLengths.Printing +
      queueLengths.Photocopying +
      queueLengths.Scanning +
      queueLengths.Binding;

    // Define operating hours (9 AM to 5 PM)
    const operatingHours = Array.from({ length: 9 }, (_, i) => i + 9);
    const countsByHour = new Map(hourlyData.map(h => [h._id, h.count]));

    // Find 3 quietest hours across operating hours (including 0 order hours)
    const quietHours = operatingHours
      .map(hour => ({ hour, count: countsByHour.get(hour) || 0 }))
      .sort((a, b) => a.count - b.count)
      .slice(0, 3)
      .map(({ hour }) => {
        const period = hour < 12 ? 'AM' : 'PM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${period}`;
      });

    // Find 3 peak hours
    const peakHours = operatingHours
      .map(hour => ({ hour, count: countsByHour.get(hour) || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(({ hour }) => {
        const period = hour < 12 ? 'AM' : 'PM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${period}`;
      });

    // Current load assessment
    let currentLoad = 'low';
    if (totalQueueNow > 10) currentLoad = 'high';
    else if (totalQueueNow > 5) currentLoad = 'moderate';

    reply = `Based on the last 30 days of order data, the quietest times are: ${quietHours.join(', ')}. The peak busiest hours are: ${peakHours.join(', ')}. Current queue load is ${currentLoad} (${totalQueueNow} orders). ${currentLoad === 'low'
      ? 'Now is a great time to place your order!'
      : currentLoad === 'moderate'
        ? 'Moderate wait expected if you order now.'
        : 'Queue is busy — ordering during the quiet hours above will give you faster service.'
      }`;
    return res.json({ reply, isMock: true });
  }

  // Feature 4 — Queue Status (Enhanced with context)
  if (intent === 'queue') {
    if (serviceType === 'Printing') {
      reply = `The printing queue currently has ${queueLengths.Printing} orders waiting.`;
    } else if (serviceType === 'Scanning') {
      reply = `The scanning queue currently has ${queueLengths.Scanning} orders waiting.`;
    } else if (serviceType === 'Photocopying') {
      reply = `The photocopying queue currently has ${queueLengths.Photocopying} orders waiting.`;
    } else if (serviceType === 'Binding') {
      reply = `The binding queue currently has ${queueLengths.Binding} orders waiting.`;
    } else {
      reply = `Current queue: Printing ${queueLengths.Printing} orders, Photocopying ${queueLengths.Photocopying}, Scanning ${queueLengths.Scanning}, Binding ${queueLengths.Binding}. Total ${totalQueue} orders waiting.`;
    }
    return res.json({ reply, isMock: true });
  }

  const combinedContext = (msg + ' ' + hist).trim();
  const hasHistoryIntent = (keywords) => keywords.some(k => hist.includes(k));
  const hasCurrentIntent = (keywords) => keywords.some(k => msg.includes(k));
  const resolveIntent = (keywords) => hasCurrentIntent(keywords) || (isFollowUp && hasHistoryIntent(keywords));

  // Detect if user mentioned a specific token number (format: DDMMYYYY-NNNN) - Use last match for context awareness
  const allTokenMatches = combinedContext.match(/\b(\d{8}-\d{4})\b/g);
  const tokenMatch = allTokenMatches ? [allTokenMatches[allTokenMatches.length - 1]] : null;

  if (tokenMatch) {
    const requestedToken = tokenMatch[0];
    // Find this specific order belonging to the user
    const specificOrder = await Order.findOne({
      userId: req.user.id,
      tokenNumber: requestedToken
    }).select('tokenNumber status serviceType estimatedCost pageCount createdAt statusHistory');

    if (specificOrder) {
      const statusMessages = {
        'Pending': 'is pending payment confirmation',
        'In_Queue': `is in the queue`,
        'Processing': 'is currently being processed by staff',
        'ReadyForPickup': 'is ready for pickup — check your email for the OTP',
        'Completed': 'has been completed and collected',
        'Cancelled': 'was cancelled',
        'Partial': 'was partially completed — a follow-up order was created',
        'Expired': 'has expired due to non-collection',
        'Uncollected': 'was marked as uncollected'
      };
      const statusMsg = statusMessages[specificOrder.status] || `has status: ${specificOrder.status}`;
      reply = `Order ${specificOrder.tokenNumber} (${specificOrder.serviceType}, ${specificOrder.pageCount} pages, ₹${specificOrder.estimatedCost}) ${statusMsg}.`;
    } else {
      reply = `I could not find order ${requestedToken} in your account. Please check the token number or visit My Orders for your full history.`;
    }
    return reply;
  } else if (
    resolveIntent(['my order', 'where is', 'order status', 'what happened', 'current order', 'active order', 'waiting', 'my queue', 'position'])
  ) {
    if (userActiveOrder) {
      if (userActiveOrder.status === 'In_Queue') {
        reply = `Your order ${userActiveOrder.tokenNumber} is in the queue at position ${userQueuePosition}. Estimated wait: ${userWaitMinutes} minutes.`;
      } else if (userActiveOrder.status === 'Processing') {
        reply = `Your order ${userActiveOrder.tokenNumber} is currently being processed by staff. You will be notified when ready for pickup.`;
      } else if (userActiveOrder.status === 'ReadyForPickup') {
        reply = `Your order ${userActiveOrder.tokenNumber} is ready for collection! Check your email for the 4-digit OTP and bring it to the counter.`;
      }
    } else {
      reply = `You have no active orders right now. Your last orders are shown in My Orders page.`;
    }
  } else if (
    resolveIntent(['recent', 'history', 'last order', 'previous', 'past order', 'my orders', 'order history', 'what did i order', 'completed order'])
  ) {
    if (userRecentOrders && userRecentOrders.length > 0) {
      const orderList = userRecentOrders.map(o =>
        `${o.tokenNumber} (${o.serviceType} — ${o.status} — ₹${o.estimatedCost})`
      ).join(', ');
      reply = `Your recent orders: ${orderList}. View full details in My Orders.`;
    } else {
      reply = `You have no previous orders yet. Place your first order from the dashboard.`;
    }
  } else if (resolveIntent(['queue', 'wait', 'how long', 'position', 'busy'])) {
    const requestedService = extractService(msg); // Prioritize current message

    if (requestedService === 'Printing') {
      reply = `The printing queue currently has ${queueLengths.Printing} orders waiting.`;
    } else if (requestedService === 'Scanning') {
      reply = `The scanning queue currently has ${queueLengths.Scanning} orders waiting.`;
    } else if (requestedService === 'Photocopying') {
      reply = `The photocopying queue currently has ${queueLengths.Photocopying} orders waiting.`;
    } else if (requestedService === 'Binding') {
      reply = `The binding queue currently has ${queueLengths.Binding} orders waiting.`;
    } else {
      // Fallback to history only if message is very short/ambiguous
      const historyService = isFollowUp ? extractService(hist) : null;
      if (historyService === 'Printing') reply = `The printing queue has ${queueLengths.Printing} orders.`;
      else if (historyService === 'Scanning') reply = `The scanning queue has ${queueLengths.Scanning} orders.`;
      else if (historyService === 'Photocopying') reply = `The photocopying queue has ${queueLengths.Photocopying} orders.`;
      else if (historyService === 'Binding') reply = `The binding queue has ${queueLengths.Binding} orders.`;
      else {
        reply = `Current queue: Printing ${queueLengths.Printing} orders, Photocopying ${queueLengths.Photocopying}, Scanning ${queueLengths.Scanning}, Binding ${queueLengths.Binding}. Total ${totalQueue} orders waiting.`;
      }
    }
  } else if (resolveIntent(PRICING_KEYWORDS)) {
    if (msg.includes('colour') || msg.includes('color')) {
      reply = `Colour printing is ${formatCurrency(pricing.printColour)}/page. For B&W printing it is ${formatCurrency(pricing.printBW)}/page.`;
    } else if (msg.includes('photocopy')) {
      reply = `Photocopying costs ${formatCurrency(pricing.photocopy)}/page.`;
    } else if (msg.includes('scan')) {
      reply = `Scanning costs ${formatCurrency(pricing.scanning)}/page.`;
    } else if (msg.includes('bind') || msg.includes('spiral') || msg.includes('staple')) {
      reply = `Spiral binding is ${formatCurrency(pricing.bindingSpiral)} flat charge plus printing cost. Staple binding is ${formatCurrency(pricing.bindingStaple)} flat plus printing cost.`;
    } else if (msg.includes('convert') || msg.includes('conversion')) {
      reply = 'Document conversion is completely free — PDF to Word, Word to PDF, instantly.';
    } else {
      // Fallback to history context only if it's a follow-up
      if (isFollowUp && hist.includes('photocopy')) reply = `Photocopying costs ${formatCurrency(pricing.photocopy)}/page.`;
      else if (isFollowUp && hist.includes('scan')) reply = `Scanning costs ${formatCurrency(pricing.scanning)}/page.`;
      else if (isFollowUp && (hist.includes('colour') || hist.includes('color'))) reply = `Colour printing is ${formatCurrency(pricing.printColour)}/page.`;
      else {
        reply = buildPricingReply(pricing);
      }
    }
  } else if (resolveIntent(['open', 'close', 'timing', 'hours', 'working'])) {
    reply = `The reprography centre is currently ${shopStatus}. Operating hours are Monday to Friday, 9 AM to 5 PM.`;
  } else if (resolveIntent(['format', 'file type', 'upload', 'docx', 'pdf', 'jpg', 'png'])) {
    reply = 'You can upload PDF, DOC, DOCX, JPG, and PNG files. Maximum file size is 25MB per file. Up to 10 documents per order.';
  } else if (resolveIntent(['service', 'offer', 'what can', 'available'])) {
    reply = 'Reposys offers: Printing, Photocopying, Scanning, Binding, and free Document Conversion. All paid services go through a 3-step order wizard with real-time cost estimation.';
  } else if (resolveIntent(['how to']) && (combinedContext.includes('order') || combinedContext.includes('place') || combinedContext.includes('print'))) {
    reply = 'To place an order: 1) Click "New Order", 2) Upload your document — AI analyses it automatically, 3) Choose your service and configure settings, 4) Review the cost and confirm. Your order enters the queue immediately after payment.';
  } else if (resolveIntent(['otp', 'pickup', 'collect', 'ready'])) {
    reply = 'When your order is ready, you will receive a 4-digit OTP via email and app notification. Show this OTP to the counter staff to collect your printout. The OTP is valid for 24 hours.';
  } else if (resolveIntent(['pay', 'payment', 'cash', 'online'])) {
    reply = 'You can pay online via the payment gateway or choose Pay at Counter to pay with cash when you collect. If online payment fails, you have 15 minutes to retry before the order is automatically cancelled.';
  } else if (resolveIntent(['complaint', 'problem', 'issue', 'wrong'])) {
    reply = 'To raise a complaint, go to your order detail page and click "Raise Complaint". Choose a category, describe the issue, and optionally attach a photo. You will get a complaint token and can chat with staff in real time.';
  } else if (resolveIntent(['cancel'])) {
    reply = 'You can cancel an order while it is In Queue. Once staff starts processing your order, cancellation is no longer available. Go to your order detail page and click the Cancel button.';
  } else if (resolveIntent(['priority', 'faculty', 'student', 'first'])) {
    reply = 'Faculty orders receive higher priority in the queue than student orders. An aging system also ensures no order waits indefinitely — orders waiting too long automatically get a priority boost.';
  } else if (resolveIntent(['guest', 'register', 'account', 'sign up'])) {
    reply = 'You can use Reposys as a guest with just your email address. Click "Use as Guest" on the homepage, enter your email, verify with an OTP, and place your order. Guest orders are Pay at Counter only.';
  } else if (resolveIntent(['double', 'sided', 'duplex'])) {
    reply = `Double-sided printing applies a 15% discount to the printing cost. For example, 10 pages double-sided B&W costs ${formatCurrency((10 * Number(pricing.printBW || 0) * 0.85).toFixed(2))} instead of ${formatCurrency((10 * Number(pricing.printBW || 0)).toFixed(2))}.`;
  } else if (resolveIntent(['tool', 'convert', 'resize', 'compress'])) {
    reply = 'Free document tools are available under "Document Tools": PDF to Word conversion, Word to PDF, Image Resize, Image Compress, and PDF Page Resize. No payment or queue needed — instant download.';
  } else if (hasCurrentIntent(OFF_TOPIC_KEYWORDS)) {
    reply = OFF_TOPIC_REPLY;
  } else {
    reply = 'I have identified your message as general Reposys inquiry. I can help you with: pricing, queue status, services offered, how to place orders, OTP pickup, payment options, complaints, and document tools. What would you like to know?';
  }

  return reply;
};

exports.askChatbot = async (req, res, next) => {
  try {
    const { message: rawMessage, history = [] } = req.body;
    const message = String(rawMessage || '').trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required.',
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: 'Message must be 500 characters or fewer.',
      });
    }

    const [
      config,
      printingQueue,
      photocopyQueue,
      scanningQueue,
      bindingQueue,
      userActiveOrder,
      userRecentOrders,
    ] = await Promise.all([
      SystemConfig.getInstance(),
      getQueue('Printing'),
      getQueue('Photocopying'),
      getQueue('Scanning'),
      getQueue('Binding'),
      Order.findOne({
        userId: req.user.id,
        status: { $in: ['In_Queue', 'Processing', 'ReadyForPickup'] },
      }).select('tokenNumber status serviceType estimatedDuration priorityScore'),
      Order.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('tokenNumber status serviceType estimatedCost createdAt'),
    ]);
    const queueLengths = {
      Printing: printingQueue.length,
      Photocopying: photocopyQueue.length,
      Scanning: scanningQueue.length,
      Binding: bindingQueue.length,
    };
    let userQueuePosition = null;
    let userWaitMinutes = null;

    if (userActiveOrder && userActiveOrder.status === 'In_Queue') {
      try {
        const waitData = await getWaitTime(getOrderId(userActiveOrder));
        userQueuePosition = waitData.position;
        userWaitMinutes = waitData.waitMinutes;
      } catch (waitError) {
        console.warn('Could not load user queue position for chatbot:', waitError.message);
      }
    }

    const historyContext = history.map((m) => `${m.role}: ${m.text}`).join('\n');
    const fullContextMessage = historyContext ? `${historyContext}\nuser: ${message}` : message;
    const normalizedMessage = fullContextMessage.toLowerCase();
    const tokenMatch = message.match(/\b(\d{8}-\d{4})\b/);
    let specificOrder = null;
    if (tokenMatch) {
      specificOrder = await Order.findOne({
        userId: req.user.id,
        tokenNumber: tokenMatch[1],
      }).select('tokenNumber status serviceType estimatedCost');
    }

    const shopStatus = getShopStatusDetails(config, new Date());

    // Enhancement 1: Cost Calculation Injection
    const pageMatch = message.match(/(\d+)\s*page/i);
    const costKeywords = ['how much', 'cost', 'price', 'estimate', 'calculate', 'charge', 'rate'];
    const hasCostQuery = costKeywords.some((k) => message.toLowerCase().includes(k)) && pageMatch;
    let calculatedCostContext = null;

    if (hasCostQuery) {
      const pages = parseInt(pageMatch[1], 10);
      const isColour = message.toLowerCase().includes('colour') || message.toLowerCase().includes('color');
      const isDouble = message.toLowerCase().includes('double') || message.toLowerCase().includes('duplex');
      const hasSpiral = message.toLowerCase().includes('spiral');
      const hasStaple = message.toLowerCase().includes('staple');
      let serviceType = 'Printing';
      if (message.toLowerCase().includes('photocopy')) serviceType = 'Photocopying';
      else if (message.toLowerCase().includes('scan')) serviceType = 'Scanning';
      else if (message.toLowerCase().includes('bind')) serviceType = 'Binding';

      const costResult = calculateCost(
        {
          serviceType,
          pageCount: pages,
          copies: 1,
          colourMode: isColour ? 'Colour' : 'BlackAndWhite',
          sided: isDouble ? 'Double' : 'Single',
          binding: hasSpiral ? 'Spiral' : hasStaple ? 'Staple' : 'None',
          documentCount: 1,
        },
        config.pricing
      );

      calculatedCostContext = `\nCALCULATED COST FOR USER QUERY: ${pages} pages ${isColour ? 'Colour' : 'B&W'} ${isDouble ? 'double-sided' : 'single-sided'
        } ${serviceType}${hasSpiral ? ' with Spiral binding' : hasStaple ? ' with Staple binding' : ''} = ₹${costResult.estimatedCost
        }. Breakdown: Base ₹${costResult.breakdown.baseRate}/page${hasSpiral || hasStaple ? `, Binding ₹${costResult.breakdown.bindingCharge}` : ''
        }. Use this exact figure in your response.`;
    }

    // Enhancement 2: Exact Wait Time Injection
    const waitTimes = {};
    for (const service of ['Printing', 'Photocopying', 'Scanning', 'Binding']) {
      const queue = await getQueue(service);
      const totalWait = queue
        .filter((o) => ['In_Queue', 'Processing'].includes(o.status))
        .reduce((sum, o) => sum + (o.estimatedDuration || 0), 0);
      waitTimes[service] = totalWait;
    }

    // Enhancement 3: User Name Personalization
    const userName = req.user?.name || null;

    // Enhancement 4: Peak Hours / Best Time
    const hourlyData = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
    ]);

    // Operating hours 9 AM to 5 PM (9 to 17)
    const operatingHours = Array.from({ length: 9 }, (_, i) => i + 9);
    const countsByHour = new Map(hourlyData.map(h => [h._id, h.count]));

    const quietHours = operatingHours
      .map(hour => ({ hour, count: countsByHour.get(hour) || 0 }))
      .sort((a, b) => a.count - b.count)
      .slice(0, 3)
      .map(({ hour }) => {
        const period = hour < 12 ? 'AM' : 'PM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${period}`;
      });

    const peakHours = operatingHours
      .map(hour => ({ hour, count: countsByHour.get(hour) || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(({ hour }) => {
        const period = hour < 12 ? 'AM' : 'PM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${period}`;
      });

    const systemPrompt = buildSystemPrompt({
      config,
      shopStatus,
      queueLengths,
      userActiveOrder,
      userRecentOrders,
      userQueuePosition,
      userWaitMinutes,
      specificOrder,
      calculatedCostContext,
      waitTimes,
      userName,
      quietHours,
      peakHours,
    });

    if (process.env.CHATBOT_MOCK === 'true') {
      const reply = await buildMockReply({
        message: message.toLowerCase(), // Use current message for intent
        historyContext: historyContext.toLowerCase(), // Use history for context fallback
        config,
        queueLengths,
        userActiveOrder,
        userRecentOrders,
        userQueuePosition,
        userWaitMinutes,
        req,
        res,
      });

      if (res.headersSent) return;
      return res.status(200).json({ reply, isMock: true });
    }

    if (!groqClient) {
      return res.status(200).json({ reply: FALLBACK_REPLY });
    }

    try {
      const completion = await groqClient.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullContextMessage }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });
      let reply = (completion.choices[0]?.message?.content || '').trim();
      // Strip <think> reasoning blocks from reasoning models
      reply = reply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (reply.includes('<think>')) {
        reply = reply.split('<think>')[0].trim();
      }
      // Strip markdown formatting characters so the UI renders plain text
      reply = reply
        .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
        .replace(/\*(.+?)\*/g, '$1')         // *italic* → italic
        .replace(/`(.+?)`/g, '$1')           // `code` → code
        .replace(/^#{1,6}\s+/gm, '')         // # Heading → Heading
        .replace(/^[-*+]\s+/gm, '')          // - bullet → bullet
        .replace(/^\d+\.\s+/gm, '')          // 1. item → item
        .trim();

      return res.status(200).json({
        reply: reply || FALLBACK_REPLY,
      });
    } catch (error) {
      console.error('Groq API error:', error.message);
      return res.status(200).json({ reply: FALLBACK_REPLY });
    }
  } catch (error) {
    return next(error);
  }
};

exports.OFF_TOPIC_REPLY = OFF_TOPIC_REPLY;
exports.buildPricingReply = buildPricingReply;
