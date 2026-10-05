// SECTION 1: CONSTANTS
const CACHE_NAME = 'reposys-v2';
const OFFLINE_URL = '/offline.html';
const STATIC_ASSETS = ['/offline.html', '/pwa-icon-192.png', '/pwa-icon-512.png', '/manifest.json'];

// SECTION 2: INSTALL EVENT
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );

  self.skipWaiting();
});

// SECTION 3: ACTIVATE EVENT
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );

  self.clients.claim();
});

// SECTION 4: FETCH EVENT (offline fallback)
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});

// SECTION 5: PUSH EVENT (placeholder will be filled in Week 2)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;

  try {
    data = event.data.json();
  } catch {
    data = { title: 'Reposys', body: event.data.text(), url: '/' };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-icon-192.png',
    badge: data.badge || '/pwa-icon-192.png',
    data: { url: data.url || '/', ...data.data },
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Reposys', options)
  );
});

// SECTION 6: NOTIFICATIONCLICK EVENT (placeholder will be filled in Week 2)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let urlToOpen = data.url || '/';

  // For split payment notifications, build the full URL with state
  // passed as query params since service workers cannot use
  // React Router navigation state
  if (data.type === 'splitRequestReceived' && data.splitRequestId) {
    const params = new URLSearchParams({
      splitRequestId: data.splitRequestId,
      groupOrderId: data.groupOrderId || '',
      amount: data.amount || '',
      groupChatId: data.groupChatId || ''
    });
    urlToOpen = `/wallet/split-pay?${params.toString()}`;
  }

  // Ensure absolute URL is used for opening/matching
  const absoluteUrl = urlToOpen.startsWith('http') ? urlToOpen : `${self.location.origin}${urlToOpen}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If Reposys is already open in a tab, focus it and navigate
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if ('navigate' in client) {
              client.navigate(absoluteUrl);
            }
            return;
          }
        }
        // If not open, open a new window at the target URL
        if (clients.openWindow) {
          return clients.openWindow(absoluteUrl);
        }
      })
  );
});
