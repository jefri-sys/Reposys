const BROWSER_PATTERNS = [
  { pattern: /edg/i, label: 'Edge' },
  { pattern: /chrome|crios/i, label: 'Chrome' },
  { pattern: /firefox|fxios/i, label: 'Firefox' },
  { pattern: /safari/i, label: 'Safari' },
];

const PLATFORM_PATTERNS = [
  { pattern: /iphone|android.+mobile|mobile/i, label: 'Mobile' },
  { pattern: /ipad|tablet/i, label: 'Tablet' },
  { pattern: /windows/i, label: 'Windows' },
  { pattern: /macintosh|mac os x/i, label: 'macOS' },
  { pattern: /linux/i, label: 'Linux' },
];

const resolvePatternLabel = (patterns, userAgent) => {
  const match = patterns.find(({ pattern }) => pattern.test(userAgent));
  return match?.label || '';
};

const resolveSessionDeviceLabel = (userAgent = '') => {
  if (!userAgent) {
    return 'Unknown device';
  }

  const browser = resolvePatternLabel(BROWSER_PATTERNS, userAgent);
  const platform = resolvePatternLabel(PLATFORM_PATTERNS, userAgent);

  if (browser && platform) {
    return `${browser} on ${platform}`;
  }

  return browser || platform || 'Browser session';
};

module.exports = {
  resolveSessionDeviceLabel,
};
