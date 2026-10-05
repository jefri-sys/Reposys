const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatTime = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const findNextOpenTime = (operatingHours = {}, referenceDate = new Date()) => {
  for (let offset = 0; offset < 7; offset += 1) {
    const candidateDate = new Date(referenceDate);
    candidateDate.setDate(referenceDate.getDate() + offset);
    const dayName = DAY_NAMES[candidateDate.getDay()];
    const schedule = operatingHours?.[dayName];

    if (!schedule?.open) {
      continue;
    }

    const currentTime = formatTime(referenceDate);
    if (offset === 0 && schedule.close && currentTime < schedule.open) {
      return `${dayName} ${schedule.open}`;
    }

    if (offset > 0) {
      return `${dayName} ${schedule.open}`;
    }
  }

  return null;
};

const getShopStatusDetails = (config, referenceDate = new Date()) => {
  if (config?.isManuallyOpen === true) {
    return {
      isOpen: true,
      source: 'manual',
      nextOpenTime: null,
    };
  }

  if (config?.isManuallyOpen === false) {
    return {
      isOpen: false,
      source: 'manual',
      nextOpenTime: null,
    };
  }

  const dayName = DAY_NAMES[referenceDate.getDay()];
  const schedule = config?.operatingHours?.[dayName];
  const currentTime = formatTime(referenceDate);
  const isOpen = Boolean(schedule?.open && schedule?.close && currentTime >= schedule.open && currentTime < schedule.close);

  return {
    isOpen,
    source: 'schedule',
    nextOpenTime: isOpen ? null : findNextOpenTime(config?.operatingHours, referenceDate),
  };
};

module.exports = {
  getShopStatusDetails,
};
