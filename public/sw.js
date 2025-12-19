// =====================================================
// Cannect Service Worker v3.0 - ABSOLUTE GOLD STANDARD
// Atomic Versioning + Cache Purging + Network Resilience
// =====================================================

// 💎 ATOMIC VERSIONING - INCREMENT THIS ON EVERY DEPLOY
const CACHE_VERSION = 'v1.0.5';
const CACHE_NAME = `cannect-atomic-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// 💎 Versions that require immediate force update (breaking changes)
const FORCE_UPDATE_VERSIONS = [];

// Core assets required for the app shell
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/icon-192.png',
  '/icon-512.png',
  '/badge-72.png',
];

// 💎 Domains to NEVER cache (APIs, external media)
const CACHE_BYPASS_PATTERNS = [
  '/functions/',
  'supabase.co',
  '/rest/',
  'cloudflare',
  'imagedelivery.net',
  'videodelivery.net',
  'customer-',
  '/api/',
  '.m3u8',        // HLS video manifests
  '.ts',          // HLS video segments (TypeScript files are fine, these are in /src)
  'blob:',
];

// =====================================================
// Install Event - Build Atomic Cache
// =====================================================
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing version ${CACHE_VERSION}`);
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('[SW] Pre-caching atomic assets');
        
        // 💎 Cache assets individually for graceful degradation
        const results = await Promise.allSettled(
          PRECACHE_ASSETS.map(async (url) => {
            try {
              // Force network fetch to avoid caching stale versions
              const response = await fetch(url, { cache: 'reload' });
              if (response.ok) {
                await cache.put(url, response);
                console.log(`[SW] Cached: ${url}`);
                return { url, success: true };
              }
              console.warn(`[SW] Failed to fetch ${url}: ${response.status}`);
              return { url, success: false };
            } catch (error) {
              console.warn(`[SW] Failed to fetch ${url}:`, error.message);
              return { url, success: false };
            }
          })
        );
        
        const successCount = results.filter(r => 
          r.status === 'fulfilled' && r.value?.success
        ).length;
        console.log(`[SW] Pre-cached ${successCount}/${PRECACHE_ASSETS.length} assets`);
        
      } catch (error) {
        console.error('[SW] Pre-cache failed:', error);
      }
    })()
  );
  
  // 💎 Don't skipWaiting here - let PWAUpdater control this
  // This prevents the "surprise reload" problem
});

// =====================================================
// Activate Event - ATOMIC SLEDGEHAMMER CLEANUP
// =====================================================
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating version ${CACHE_VERSION}`);
  
  event.waitUntil(
    (async () => {
      // 💎 ATOMIC PURGE: Delete ALL caches that aren't current version
      const cacheNames = await caches.keys();
      const deletionPromises = cacheNames
        .filter((name) => {
          // Delete any cache that:
          // 1. Starts with 'cannect-' but isn't current version
          // 2. Is an old cache from previous naming schemes
          const isOldCannectCache = name.startsWith('cannect-') && name !== CACHE_NAME;
          const isLegacyCache = name.includes('workbox') || name.includes('runtime');
          return isOldCannectCache || isLegacyCache;
        })
        .map((name) => {
          console.log(`[SW] 🔥 Atomic Purge: ${name}`);
          return caches.delete(name);
        });
      
      await Promise.all(deletionPromises);
      console.log(`[SW] Purged ${deletionPromises.length} old caches`);
      
      // 💎 Take control of ALL open tabs immediately
      await self.clients.claim();
      console.log('[SW] Now controlling all clients');
      
      // 💎 Notify all clients that a new version is active
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        client.postMessage({
          type: 'SW_ACTIVATED',
          version: CACHE_VERSION,
        });
      });
    })()
  );
});

// =====================================================
// Fetch Event - Smart Caching Strategy
// =====================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip non-http(s) requests
  if (!url.startsWith('http')) return;
  
  // 💎 BYPASS: Never cache these patterns
  const shouldBypass = CACHE_BYPASS_PATTERNS.some(pattern => url.includes(pattern));
  if (shouldBypass) {
    return; // Let browser handle normally
  }
  
  // 💎 NAVIGATION: Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Always try network first for navigation
          const networkResponse = await fetch(request);
          
          // Cache successful responses for offline fallback
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          
          return networkResponse;
        } catch (error) {
          // Network failed - try cache, then offline page
          console.log('[SW] Navigation failed, trying cache');
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Last resort: offline page
          const offlineResponse = await caches.match(OFFLINE_URL);
          return offlineResponse || new Response('Offline', { 
            status: 503,
            statusText: 'Service Unavailable' 
          });
        }
      })()
    );
    return;
  }
  
  // 💎 STATIC ASSETS: Stale-while-revalidate with network preference
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      // Start network fetch immediately
      const networkPromise = fetch(request)
        .then((response) => {
          // Only cache successful, same-origin responses
          if (response.ok && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);
      
      // Return cached immediately if available, but update in background
      if (cachedResponse) {
        // Fire-and-forget background update
        networkPromise.catch(() => {});
        return cachedResponse;
      }
      
      // No cache - wait for network
      const networkResponse = await networkPromise;
      if (networkResponse) {
        return networkResponse;
      }
      
      // Both failed
      return new Response('Resource unavailable', { status: 404 });
    })()
  );
});

// =====================================================
// Message Event - Update Control & Version Queries
// =====================================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('[SW] Skip waiting triggered - activating immediately');
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports?.[0]?.postMessage({ version: CACHE_VERSION });
      break;
      
    case 'CHECK_FORCE_UPDATE':
      const shouldForce = FORCE_UPDATE_VERSIONS.includes(CACHE_VERSION);
      event.source?.postMessage({ 
        type: 'FORCE_UPDATE_RESULT', 
        shouldForce,
        version: CACHE_VERSION 
      });
      break;
      
    case 'CLEAR_CACHE':
      // Emergency cache clear
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
        console.log('[SW] All caches cleared');
      });
      break;
  }
});

// =====================================================
// Push Notification Handling
// =====================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
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
  console.log('[SW] Notification clicked');
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const data = event.notification.data;
  let url = '/';

  if (data?.type === 'follow' && data?.actorUsername) {
    url = `/user/${data.actorUsername}`;
  } else if (data?.postId) {
    url = `/post/${data.postId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window
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
  console.log('[SW] Notification closed');
});

console.log(`[SW] Service Worker loaded - Version ${CACHE_VERSION}`);
