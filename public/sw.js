// =====================================================
// Cannect Service Worker v2.0
// Handles: Push Notifications + Cache Management + Updates
// =====================================================

// Cache versioning - INCREMENT THIS ON EVERY DEPLOY
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `cannect-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Assets to precache (shell of the app)
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/icon-192.png',
  '/icon-512.png',
  '/badge-72.png',
];

// =====================================================
// Install Event - Precache Core Assets
// =====================================================
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing version ${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Precache complete');
      })
  );
  
  // Don't call skipWaiting here - we want to control this from the UI
  // The PWAUpdater component will send SKIP_WAITING message when user clicks "Update"
});

// =====================================================
// Activate Event - Clean Old Caches
// =====================================================
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating version ${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('cannect-') && name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Old caches cleared, claiming clients');
      return self.clients.claim();
    })
  );
});

// =====================================================
// Fetch Event - Network First, Cache Fallback
// =====================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip non-http(s) requests
  if (!request.url.startsWith('http')) return;
  
  // Skip API requests (always fetch fresh)
  if (request.url.includes('/functions/') || 
      request.url.includes('supabase.co') ||
      request.url.includes('/rest/') ||
      request.url.includes('cloudflare')) {
    return;
  }
  
  // For navigation requests (HTML pages) - Network first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful HTML responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline - return cached version or offline page
          return caches.match(request).then((cached) => {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }
  
  // For static assets - Stale-while-revalidate strategy
  event.respondWith(
    caches.match(request).then((cached) => {
      // Return cached immediately, but update in background
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => cached);
      
      return cached || fetchPromise;
    })
  );
});

// =====================================================
// Message Event - Handle Skip Waiting & Version Query
// =====================================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting triggered - activating new version');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

// =====================================================
// Push Notification Handling
// =====================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = { title: 'Cannect', body: 'New notification' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: data.data?.notificationId || 'cannect-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// =====================================================
// Notification Click Handling
// =====================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const data = event.notification.data;
  let url = '/';

  // Navigate based on notification type
  if (data?.type === 'follow' && data?.actorUsername) {
    url = `/user/${data.actorUsername}`;
  } else if (data?.postId) {
    url = `/post/${data.postId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// =====================================================
// Notification Close Handling
// =====================================================
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

console.log(`[SW] Service Worker loaded - Version ${CACHE_VERSION}`);
