import { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContextObject';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const FALLBACK_VAPID_PUBLIC_KEY = 'BAkk25YiXfLkbbnkk8tXHE0-5j18vQHbDCw_HtN8au1FLVscnNbMzSp512o1bCr5b_qkjFuPSmnAuVE3hB2ooTg';
let cachedVapidPublicKey = VAPID_PUBLIC_KEY || FALLBACK_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function arrayBufferToUrlBase64(buffer) {
  const bytes = new Uint8Array(buffer || []);
  const binary = String.fromCharCode(...bytes);

  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function usePush() {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  useEffect(() => {
    const publicPaths = new Set([
      '/',
      '/login',
      '/register',
      '/verify-email',
      '/forgot-password',
      '/reset-password',
      '/guest',
      '/contact',
      '/about',
      '/privacy',
      '/terms',
      '/cookies',
      '/help',
    ]);
    const isGuestPath = location.pathname.startsWith('/guest/');
    const isPublicPath = publicPaths.has(location.pathname) || isGuestPath;
    const isRegisteredUser = Boolean(user) && user.isGuest !== true;

    if (
      loading
      || isPublicPath
      || !isRegisteredUser
      || !('serviceWorker' in navigator)
      || !('PushManager' in window)
      || !('Notification' in window)
    ) {
      return undefined;
    }

    let isCancelled = false;

    async function subscribeToPush() {
      try {
        if (!cachedVapidPublicKey) {
          try {
            const response = await api.get('/config/push');
            cachedVapidPublicKey = response.data?.publicKey || FALLBACK_VAPID_PUBLIC_KEY;
          } catch (configError) {
            cachedVapidPublicKey = FALLBACK_VAPID_PUBLIC_KEY;
          }
        }

        if (!cachedVapidPublicKey) {
          console.warn('[Reposys PWA] Push is not configured on the server.');
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted' || isCancelled) {
          return;
        }

        await navigator.serviceWorker.register('/sw.js');
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const existingKey = existing?.options?.applicationServerKey
          ? arrayBufferToUrlBase64(existing.options.applicationServerKey)
          : '';

        if (existing && (!existingKey || existingKey === cachedVapidPublicKey)) {
          await api.post('/users/push-subscription', {
            subscription: existing.toJSON(),
          });
          return;
        }

        if (existing) {
          await existing.unsubscribe();
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cachedVapidPublicKey),
        });

        await api.post('/users/push-subscription', {
          subscription: subscription.toJSON(),
        });

        console.log('[Reposys PWA] Push subscription saved');
      } catch (err) {
        console.warn('[Reposys PWA] Push subscription failed:', err?.message);
      }
    }

    const timer = window.setTimeout(subscribeToPush, 3000);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [loading, location.pathname, user]);
}
