const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');

const SERVICE_TYPES = ['Printing', 'Photocopying', 'Scanning', 'Binding', 'Conversion'];

const normalizePaymentStatus = (payment) => {
  if (payment?.method === 'Cash' && payment?.orderId?.paymentStatus === 'Cash_Collected') {
    return 'Paid';
  }

  return payment?.status;
};

const createDateRange = (query = {}) => {
  const endDate = query.endDate ? new Date(query.endDate) : new Date();
  const startDate = query.startDate ? new Date(query.startDate) : new Date(endDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    const error = new Error('Invalid date range.');
    error.statusCode = 400;
    throw error;
  }

  if (!query.startDate) {
    startDate.setDate(startDate.getDate() - 30);
  }

  return {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };
};

const getReportDateLabel = () => new Date().toISOString().slice(0, 10);

const getDailyOrdersData = async (query) => {
  const dateFilter = createDateRange(query);
  const rows = await Order.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          serviceType: '$serviceType',
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        '_id.date': 1,
        '_id.serviceType': 1,
      },
    },
  ]);

  const groupedByDate = new Map();

  rows.forEach(({ _id, count }) => {
    if (!groupedByDate.has(_id.date)) {
      groupedByDate.set(_id.date, {
        date: _id.date,
        Printing: 0,
        Photocopying: 0,
        Scanning: 0,
        Binding: 0,
        Conversion: 0,
        total: 0,
      });
    }

    const entry = groupedByDate.get(_id.date);
    entry[_id.serviceType] = count;
    entry.total += count;
  });

  return Array.from(groupedByDate.values());
};

const getRevenueData = async (query) => Payment.aggregate([
  {
    $match: {
      ...createDateRange(query),
      status: 'Paid',
    },
  },
  {
    $group: {
      _id: {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$createdAt',
        },
      },
      revenue: { $sum: '$amount' },
    },
  },
  { $sort: { _id: 1 } },
  {
    $project: {
      _id: 0,
      date: '$_id',
      revenue: 1,
    },
  },
]);

const getServiceBreakdownData = async (query) => {
  const rows = await Order.aggregate([
    { $match: createDateRange(query) },
    {
      $group: {
        _id: '$serviceType',
        count: { $sum: 1 },
      },
    },
  ]);

  return rows.reduce((accumulator, row) => {
    accumulator[row._id] = row.count;
    return accumulator;
  }, {
    Printing: 0,
    Photocopying: 0,
    Scanning: 0,
    Binding: 0,
    Conversion: 0,
  });
};

const getPeakHoursData = async (query) => {
  const rows = await Order.aggregate([
    { $match: createDateRange(query) },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const countsByHour = new Map(rows.map((row) => [row._id, row.count]));

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: countsByHour.get(hour) || 0,
  }));
};

const getStaffPerformanceData = async (query) => {
  const orders = await Order.find(createDateRange(query)).select('statusHistory');
  const performanceByActor = new Map();

  orders.forEach((order) => {
    if (!Array.isArray(order.statusHistory) || order.statusHistory.length === 0) {
      return;
    }

    const processingEntry = order.statusHistory.find((entry) => entry.status === 'Processing' && entry.actorId && entry.timestamp);
    const readyEntry = order.statusHistory.find((entry) => (
      entry.status === 'ReadyForPickup'
      && entry.timestamp
      && processingEntry
      && new Date(entry.timestamp).getTime() >= new Date(processingEntry.timestamp).getTime()
    ));

    if (!processingEntry || !readyEntry) {
      return;
    }

    const actorId = String(processingEntry.actorId);
    const durationMinutes = (
      new Date(readyEntry.timestamp).getTime() - new Date(processingEntry.timestamp).getTime()
    ) / (1000 * 60);

    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
      return;
    }

    const current = performanceByActor.get(actorId) || { orderCount: 0, totalMinutes: 0 };
    current.orderCount += 1;
    current.totalMinutes += durationMinutes;
    performanceByActor.set(actorId, current);
  });

  const actorIds = Array.from(performanceByActor.keys());
  const staffUsers = await User.find({ _id: { $in: actorIds } }).select('name');
  const namesById = new Map(staffUsers.map((user) => [String(user._id), user.name]));

  return actorIds
    .map((actorId) => {
      const performance = performanceByActor.get(actorId);
      return {
        staffName: namesById.get(actorId) || 'Unknown Staff',
        orderCount: performance.orderCount,
        avgMinutes: Number((performance.totalMinutes / performance.orderCount).toFixed(2)),
      };
    })
    .sort((left, right) => right.orderCount - left.orderCount || left.staffName.localeCompare(right.staffName));
};

const getPaymentBreakdownData = async (query) => {
  const breakdown = {
    online: {
      paid: 0,
      failed: 0,
      refunded: 0,
    },
    cash: {
      paid: 0,
      pending: 0,
    },
    wallet: {
      paid: 0,
      refunded: 0,
    },
  };

  const payments = await Payment.find(createDateRange(query))
    .populate('orderId', 'paymentStatus');

  payments.forEach((payment) => {
    const status = normalizePaymentStatus(payment);

    if (payment.method === 'Online') {
      if (status === 'Paid') breakdown.online.paid += 1;
      if (status === 'Failed') breakdown.online.failed += 1;
      if (status === 'Refunded') breakdown.online.refunded += 1;
    }

    if (payment.method === 'Cash') {
      if (status === 'Paid') breakdown.cash.paid += 1;
      if (status === 'Created') breakdown.cash.pending += 1;
    }

    if (payment.method === 'wallet') {
      if (status === 'Paid') breakdown.wallet.paid += 1;
      if (status === 'Refunded') breakdown.wallet.refunded += 1;
    }
  });

  return breakdown;
};

const REPORT_BUILDERS = {
  'daily-orders': getDailyOrdersData,
  revenue: getRevenueData,
  'service-breakdown': getServiceBreakdownData,
  'peak-hours': getPeakHoursData,
  'staff-performance': getStaffPerformanceData,
  'payment-breakdown': getPaymentBreakdownData,
};

const normalizeExportRows = (type, data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (type === 'service-breakdown') {
    return SERVICE_TYPES.map((serviceType) => ({
      serviceType,
      count: data[serviceType] || 0,
    }));
  }

  if (type === 'payment-breakdown') {
    return [
      { method: 'Online', status: 'Paid', count: data.online.paid },
      { method: 'Online', status: 'Failed', count: data.online.failed },
      { method: 'Online', status: 'Refunded', count: data.online.refunded },
      { method: 'Cash', status: 'Paid', count: data.cash.paid },
      { method: 'Cash', status: 'Pending', count: data.cash.pending },
      { method: 'Wallet', status: 'Paid', count: data.wallet.paid },
      { method: 'Wallet', status: 'Refunded', count: data.wallet.refunded },
    ];
  }

  return [];
};

const sendPdfReport = (res, type, rows) => {
  const reportDate = getReportDateLabel();
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : ['message'];
  const printableRows = rows.length > 0 ? rows : [{ message: 'No data available for the selected range.' }];
  const columnWidth = Math.floor((doc.page.width - doc.page.margins.left - doc.page.margins.right) / headers.length);
  let currentY = 110;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reposys-${type}-${reportDate}.pdf"`);

  doc.pipe(res);
  doc.fontSize(18).text(`Reposys Report - ${type} - ${reportDate}`);
  doc.moveDown();

  headers.forEach((header, index) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(header, doc.page.margins.left + (index * columnWidth), currentY, { width: columnWidth });
  });

  currentY += 20;

  printableRows.forEach((row) => {
    if (currentY > doc.page.height - 60) {
      doc.addPage();
      currentY = 50;
    }

    headers.forEach((header, index) => {
      const value = row[header];
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(String(value ?? ''), doc.page.margins.left + (index * columnWidth), currentY, { width: columnWidth });
    });

    currentY += 18;
  });

  doc.end();
};

exports.getDailyOrders = async (req, res, next) => {
  try {
    const data = await getDailyOrdersData(req.query);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.getRevenue = async (req, res, next) => {
  try {
    const data = await getRevenueData(req.query);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.getServiceBreakdown = async (req, res, next) => {
  try {
    const data = await getServiceBreakdownData(req.query);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.getPeakHours = async (req, res, next) => {
  try {
    const data = await getPeakHoursData(req.query);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.getStaffPerformance = async (req, res, next) => {
  try {
    const data = await getStaffPerformanceData(req.query);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.getPaymentBreakdown = async (req, res, next) => {
  try {
    const data = await getPaymentBreakdownData(req.query);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    const { type, format = 'csv' } = req.query;
    const builder = REPORT_BUILDERS[type];

    if (!builder) {
      return res.status(400).json({ success: false, message: 'Invalid report type.' });
    }

    const data = await builder(req.query);
    const rows = normalizeExportRows(type, data);
    const reportDate = getReportDateLabel();

    if (format === 'csv') {
      const parser = new Parser({ fields: rows.length > 0 ? Object.keys(rows[0]) : ['message'] });
      const csv = parser.parse(rows.length > 0 ? rows : [{ message: 'No data available for the selected range.' }]);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="reposys-${type}-${reportDate}.csv"`);
      return res.status(200).send(csv);
    }

    if (format === 'pdf') {
      sendPdfReport(res, type, rows);
      return null;
    }

    return res.status(400).json({ success: false, message: 'Invalid export format.' });
  } catch (error) {
    next(error);
  }
};
