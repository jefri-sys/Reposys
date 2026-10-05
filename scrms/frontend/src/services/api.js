import axios from 'axios';

const FALLBACK_API_URL = 'https://scrms-ready.onrender.com/api';
const configuredApiUrl = import.meta.env.VITE_API_URL;
const isVercelApp = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
const hasConfiguredApiUrl = configuredApiUrl
  && !configuredApiUrl.includes('onrender.com');
const apiBaseUrl = isVercelApp ? '/api' : (hasConfiguredApiUrl ? configuredApiUrl : FALLBACK_API_URL);

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

export default api;
