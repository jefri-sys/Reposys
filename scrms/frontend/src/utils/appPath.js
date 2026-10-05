export const toAppPath = (url, fallbackPath = '/') => {
  if (!url) return fallbackPath;

  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return url.startsWith('/') ? url : fallbackPath;
  }
};
