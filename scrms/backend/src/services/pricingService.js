const DEFAULT_PRICING = Object.freeze({
  printBW: 1.5,
  printColour: 8.0,
  doubleSidedMultiplier: 0.85,
  photocopy: 1.0,
  scanning: 2.0,
  bindingSpiral: 100.0,
  bindingStaple: 80.0,
  conversion: 10.0,
});

const ROLE_PRIORITY = {
  Faculty: 100,
  Staff: 150,
  Student: 200,
  Guest: 200,
};

const QUEUE_PRIORITY_SORT = Object.freeze({
  priorityScore: -1,
  createdAt: 1,
});

const roundCurrency = (value) => Number(value.toFixed(2));

const parsePreferredPickupDate = (preferredPickupSlot, referenceDate) => {
  if (!preferredPickupSlot) {
    return null;
  }

  if (preferredPickupSlot instanceof Date && !Number.isNaN(preferredPickupSlot.getTime())) {
    return preferredPickupSlot;
  }

  const parsedDate = new Date(preferredPickupSlot);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  if (typeof preferredPickupSlot !== 'string') {
    return null;
  }

  const normalizedSlot = preferredPickupSlot.trim();
  const timeMatch = normalizedSlot.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);

  if (!timeMatch) {
    return null;
  }

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const meridiem = timeMatch[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  }

  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  const slotDate = new Date(referenceDate);
  slotDate.setHours(hours, minutes, 0, 0);

  return slotDate;
};

const calculateCost = (orderConfig = {}, pricing = DEFAULT_PRICING) => {
  const {
    serviceType,
    pageCount = 0,
    copies = 1,
    colourMode = 'BlackAndWhite',
    sided = 'Single',
    binding = 'None',
    documentCount = 1,
  } = orderConfig;
  const resolvedBinding = serviceType === 'Binding' && (!binding || binding === 'None')
    ? 'Spiral'
    : binding;
  const effectivePricing = {
    ...DEFAULT_PRICING,
    ...(pricing || {}),
  };
  const printRate = colourMode === 'Colour'
    ? effectivePricing.printColour
    : effectivePricing.printBW;
  const sidedMultiplier = sided === 'Double' ? effectivePricing.doubleSidedMultiplier : 1;
  const printSubtotal = printRate * pageCount * copies;
  const discountedPrintTotal = printSubtotal * sidedMultiplier;
  const doubleSidedDiscount = sided === 'Double' ? printSubtotal - discountedPrintTotal : 0;
  const bindingCharge = resolvedBinding === 'Staple'
    ? effectivePricing.bindingStaple
    : resolvedBinding !== 'None'
      ? effectivePricing.bindingSpiral
      : 0;

  let baseRate = 0;
  let total = 0;

  if (bindingCharge > 0) {
    baseRate = printRate;
    total = discountedPrintTotal + bindingCharge;
  } else {
    switch (serviceType) {
      case 'Printing':
        baseRate = printRate;
        total = discountedPrintTotal;
        break;
      case 'Photocopying':
        baseRate = effectivePricing.photocopy;
        total = baseRate * pageCount * copies;
        break;
      case 'Scanning':
        baseRate = effectivePricing.scanning;
        total = baseRate * pageCount;
        break;
      case 'Binding':
        baseRate = printRate;
        total = discountedPrintTotal + bindingCharge;
        break;
      case 'Conversion':
        baseRate = effectivePricing.conversion;
        total = baseRate * documentCount;
        break;
      default:
        total = 0;
    }
  }

  const estimatedCost = roundCurrency(total);

  return {
    estimatedCost,
    breakdown: {
      baseRate: roundCurrency(baseRate),
      pages: pageCount,
      copies,
      doubleSidedDiscount: roundCurrency(doubleSidedDiscount),
      bindingCharge: roundCurrency(bindingCharge),
      total: estimatedCost,
    },
  };
};

const calculatePriorityScore = (userRole, preferredPickupSlot, orderCreatedAt = new Date(), estimatedDuration = 0) => {
  const complexityWeight = Math.floor(Number(estimatedDuration) || 0);
  const baseScore = (ROLE_PRIORITY[userRole] ?? 200) + complexityWeight;
  const createdAt = new Date(orderCreatedAt);
  const validCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
  const pickupDate = parsePreferredPickupDate(preferredPickupSlot, validCreatedAt);

  if (!pickupDate) {
    return baseScore;
  }

  const differenceMs = pickupDate.getTime() - validCreatedAt.getTime();
  const isWithinNextTwoHours = differenceMs >= 0 && differenceMs <= (2 * 60 * 60 * 1000);

  return isWithinNextTwoHours ? baseScore - 100 : baseScore;
};

const calculateAgingDeduction = (orderCreatedAt) => {
  const createdAt = new Date(orderCreatedAt);
  const validCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
  const minutesSinceCreation = Math.floor((Date.now() - validCreatedAt.getTime()) / (60 * 1000));
  
  return Math.max(0, Math.floor((minutesSinceCreation - 1) / 60)) * 20;
};

const calculateEffectivePriority = (basePriority, orderCreatedAt) => {
  const agingDeduction = calculateAgingDeduction(orderCreatedAt);
  return basePriority - agingDeduction;
};

module.exports = {
  calculateCost,
  calculatePriorityScore,
  calculateAgingDeduction,
  calculateEffectivePriority,
  QUEUE_PRIORITY_SORT,
};
