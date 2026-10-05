const SystemConfig = require('../models/SystemConfig');
const DailyCounter = require('../models/DailyCounter');

const generateTokenNumber = async (prefix = 'Order') => {
  const now = new Date();
  const date = String(now.getDate()).padStart(2, '0')
    + String(now.getMonth() + 1).padStart(2, '0')
    + now.getFullYear();
  const counter = await DailyCounter.findOneAndUpdate(
    { date, prefix },
    { $inc: { count: 1 } },
    { upsert: true, new: true, returnDocument: 'after' }
  );

  return `${date}-${String(counter.count).padStart(4, '0')}`;
};

const calculateEstimatedDuration = async ({ serviceType, pageCount, copies, documentCount, binding }) => {
  const config = await SystemConfig.getInstance();
  const pricing = config.pricing || {};
  const safePageCount = Number(pageCount) || 0;
  const safeCopies = Number(copies) || 1;
  const safeDocumentCount = Number(documentCount) || 0;

  switch (serviceType) {
    case 'Printing':
      return safePageCount > 0
        ? Math.max(1, Math.ceil((safePageCount * safeCopies * (pricing.printTimePerPage || 2)) / 60))
        : 0;
    case 'Photocopying':
      return safePageCount > 0
        ? Math.max(1, Math.ceil((safePageCount * safeCopies * (pricing.photocopyTimePerPage || 1)) / 60))
        : 0;
    case 'Scanning':
      return safePageCount > 0
        ? Math.max(1, Math.ceil((safePageCount * (pricing.scanTimePerPage || 2)) / 60))
        : 0;
    case 'Binding':
      return safeDocumentCount > 0
        ? Math.ceil(safeDocumentCount * (binding === 'Staple'
          ? (pricing.bindingStapleDuration || 5)
          : (pricing.bindingSpiralDuration || 10)))
        : 0;
    case 'Conversion':
      return safeDocumentCount > 0
        ? Math.ceil(safeDocumentCount * (pricing.conversionDuration || 5))
        : 0;
    default:
      return 0;
  }
};

module.exports = {
  generateTokenNumber,
  calculateEstimatedDuration,
};
