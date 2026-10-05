const getPrimaryFrontendUrl = () => {
  const url = process.env.FRONTEND_URL;
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    return url;
  }
  return 'https://reposyson.vercel.app';
};

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (origin === 'null') return true;

  const allowed = [
    'https://reposyson.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://localhost:5000'
  ];

  if (allowed.includes(origin)) return true;

  // Allow all Vercel domains
  if (origin.endsWith('.vercel.app')) return true;

  // Allow env variable if set
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;

  return false;
};

module.exports = {
  getPrimaryFrontendUrl,
  isOriginAllowed,
};
