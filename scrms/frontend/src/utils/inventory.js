export const INVENTORY_CATEGORIES = ['Paper', 'Toner', 'Binding'];

export const getInventoryStockLevel = (item) => {
  const currentStock = Number(item?.currentStock) || 0;
  const minimumThreshold = Number(item?.minimumThreshold) || 0;

  if (currentStock <= minimumThreshold) {
    return 'red';
  }

  if (currentStock <= minimumThreshold * 2) {
    return 'amber';
  }

  return 'green';
};

export const getInventoryStockClass = (item) => {
  const level = getInventoryStockLevel(item);

  if (level === 'red') {
    return 'border-rose-200 bg-rose-100 text-rose-700';
  }

  if (level === 'amber') {
    return 'border-amber-200 bg-amber-100 text-amber-800';
  }

  return 'border-emerald-200 bg-emerald-100 text-emerald-700';
};

export const getInventoryStatusLabel = (item) => {
  const level = getInventoryStockLevel(item);

  if (level === 'red') {
    return 'Below Threshold';
  }

  if (level === 'amber') {
    return 'Getting Low';
  }

  return 'Healthy';
};

export const formatInventoryDateTime = (value) => {
  const parsedDate = value ? new Date(value) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return 'Not updated';
  }

  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const getInventoryUpdaterName = (item) => (
  item?.lastUpdatedBy?.name
  || 'System'
);

export const mergeInventorySummaryItems = (itemsBelowThreshold = [], itemsGettingLow = []) => {
  const merged = [...itemsBelowThreshold];

  itemsGettingLow.forEach((item) => {
    const exists = merged.some((current) => String(current._id) === String(item._id));
    if (!exists) {
      merged.push(item);
    }
  });

  return merged.sort((left, right) => {
    if (left.category !== right.category) {
      return left.category.localeCompare(right.category);
    }

    return left.name.localeCompare(right.name);
  });
};
