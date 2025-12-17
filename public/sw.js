// Service Worker untuk PWA dengan Push Notifications
const CACHE_NAME = 'dpmd-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-bogor.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
      .catch(() => {
        // Return offline page if available
        return caches.match('/index.html');
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  console.log('[SW] Push data:', event.data ? event.data.text() : 'No data');
  
  let notificationData = {
    title: 'DPMD Bogor',
    body: 'Anda memiliki notifikasi baru',
    icon: '/logo-bogor.png',
    badge: '/logo-bogor.png',
    image: '/logo-bogor.png',
    vibrate: [500, 200, 500, 200, 500, 200, 500], // Vibration pattern kuat seperti WhatsApp
    tag: 'dpmd-notification',
    requireInteraction: true, // Notifikasi tetap sampai user klik
    renotify: true, // Vibrate lagi jika ada notifikasi baru dengan tag sama
    silent: false, // WAJIB false untuk heads-up notification
    timestamp: Date.now(),
    data: {
      url: '/dashboard',
      timestamp: Date.now()
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Parsed payload:', payload);
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        image: payload.image || payload.icon || notificationData.image,
        vibrate: payload.vibrate || notificationData.vibrate,
        tag: payload.tag || notificationData.tag,
        requireInteraction: payload.requireInteraction !== undefined ? payload.requireInteraction : true,
        renotify: true,
        silent: false,
        timestamp: payload.timestamp || Date.now(),
        data: payload.data || notificationData.data,
        actions: payload.actions || [
          { action: 'open', title: 'BUKA DISPOSISI' },
          { action: 'mark_read', title: 'TANDAI DIBACA' }
        ]
      };
    } catch (e) {
      console.error('[SW] Error parsing push payload:', e);
      // Fallback: show simple notification with text data
      if (event.data) {
        notificationData.body = event.data.text();
      }
    }
  }

  console.log('[SW] Showing notification:', notificationData);

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      vibrate: notificationData.vibrate,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      renotify: notificationData.renotify,
      silent: notificationData.silent,
      timestamp: notificationData.timestamp,
      data: notificationData.data,
      actions: notificationData.actions
    }
  ).then(() => {
    console.log('[SW] Notification shown successfully');
    
    // Broadcast message to all clients to refresh data tanpa reload page
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'NEW_NOTIFICATION',
            payload: notificationData.data
          });
        });
      });
  }).catch(err => {
    console.error('[SW] Error showing notification:', err);
  });

  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  console.log('[SW] Notification data:', event.notification.data);
  console.log('[SW] Action:', event.action);
  
  event.notification.close();

  // Handle mark_read action
  if (event.action === 'mark_read') {
    console.log('[SW] Mark read action clicked');
    // Broadcast to app to mark as read without opening
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'MARK_DISPOSISI_READ',
              disposisi_id: event.notification.data?.disposisi_id
            });
          });
        })
    );
    return;
  }

  // Get URL from notification data
  const urlToOpen = event.notification.data?.url || '/dashboard';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;
  
  console.log('[SW] Opening URL:', fullUrl);
  console.log('[SW] Notification type:', event.notification.data?.type);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log('[SW] Found', clientList.length, 'client(s)');
        
        // Check if there's already a window open with our app
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          console.log('[SW] Client URL:', client.url);
          
          // If same origin, navigate to the URL
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            console.log('[SW] Focusing existing client and navigating');
            return client.focus().then(() => {
              // Navigate the client to the disposisi detail
              return client.navigate(fullUrl);
            });
          }
        }
        
        // If no window is open, open a new one
        console.log('[SW] No existing client, opening new window');
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
      .catch(err => {
        console.error('[SW] Error handling notification click:', err);
      })
  );
});

// Background sync event (untuk offline support)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event);
  
  if (event.tag === 'sync-disposisi') {
    event.waitUntil(
      // Sync logic here
      Promise.resolve()
    );
  }
});

// Message event (untuk komunikasi dengan client)
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
