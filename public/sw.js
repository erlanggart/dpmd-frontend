// Service Worker untuk PWA dengan Modern Push Notifications
// PWA-First: Notification bekerja seperti native app (WhatsApp-style)

// Detect if running in PWA mode (installed to homescreen)
const isPWAMode = () => {
  return self.clients.matchAll({ type: 'window' }).then(clients => {
    return clients.some(client => {
      return client.url.includes('?source=pwa') || 
             client.frameType === 'top-level';
    });
  });
};

const CACHE_NAME = 'dpmd-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-bogor.png',
  '/logo-192.png',
  '/logo-96.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('✨ Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cache untuk API requests
  if (event.request.url.includes('/api/')) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
      .catch(() => {
        return caches.match('/index.html');
      })
  );
});

// Push notification event - WhatsApp-style Native Notification for PWA
self.addEventListener('push', async (event) => {
  console.log('🔔 [SW] Push notification received');
  console.log('🔔 [SW] Notification permission:', Notification.permission);
  console.log('🔔 [SW] Event data:', event.data ? event.data.text() : 'No data');
  
  // Check if running in PWA mode
  const inPWA = await isPWAMode();
  console.log('📱 [SW] Running in PWA mode:', inPWA);
  
  // Default notification - WhatsApp/Telegram style for mobile
  let notificationData = {
    title: '📨 DPMD Bogor',
    body: 'Anda memiliki notifikasi baru',
    icon: '/logo-192.png',
    badge: '/logo-96.png',
    // Android WhatsApp vibration pattern
    vibrate: [300, 100, 300, 100, 300, 100, 300],
    tag: `dpmd-${Date.now()}`, // Unique tag for each notification
    requireInteraction: true, // Stay visible until clicked
    renotify: true, // Alert even with same tag
    silent: false, // MUST make sound + vibrate
    timestamp: Date.now(),
    // PWA-specific: Show on lock screen
    visibility: 1, // VISIBILITY_PUBLIC
    timestamp: Date.now(),
    urgency: 'high',
    // Show on lock screen
    visibility: 1, // VISIBILITY_PUBLIC
    data: {
      url: '/dashboard',
      type: 'general'
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('📨 [SW] Payload received:', payload);
      
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        image: payload.image,
        vibrate: payload.vibrate || notificationData.vibrate,
        tag: payload.tag || notificationData.tag,
        requireInteraction: payload.requireInteraction !== undefined ? payload.requireInteraction : true,
        renotify: true,
        silent: false,
        timestamp: payload.timestamp || Date.now(),
        data: payload.data || notificationData.data,
        actions: payload.actions || [
          { action: 'open', title: '📖 Buka', icon: '/logo-96.png' },
          { action: 'close', title: '✖️ Tutup' }
        ]
      };
    } catch (e) {
      console.error('❌ [SW] Error parsing push payload:', e);
      if (event.data) {
        notificationData.body = event.data.text();
      }
    }
  }

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
      actions: notificationData.actions,
      // Android-specific options
      dir: 'ltr',
      lang: 'id-ID'
    }
  ).then(() => {
    console.log('✅ [SW] Notification shown successfully');
    console.log('📱 [SW] Notification akan muncul di notification drawer Android/iOS');
    console.log('🔊 [SW] Dengan sound + vibration + pop-up di layar');
    
    // Broadcast ke semua active tabs untuk trigger refresh
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        console.log(`📢 [SW] Broadcasting to ${clients.length} client(s)`);
        clients.forEach(client => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            payload: notificationData.data,
            timestamp: Date.now()
          });
        });
      });
  }).catch(err => {
    console.error('❌ [SW] Error showing notification:', err);
  });

  event.waitUntil(promiseChain);
});

// Notification click event - Navigate to relevant page
self.addEventListener('notificationclick', (event) => {
  console.log('👆 [SW] Notification clicked');
  console.log('Action:', event.action);
  console.log('Data:', event.notification.data);
  
  event.notification.close();

  // Handle specific actions
  if (event.action === 'close') {
    console.log('🚫 [SW] Close action - notification dismissed');
    return;
  }

  // Get URL from notification data
  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/dashboard';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;
  
  console.log('🔗 [SW] Opening URL:', fullUrl);
  console.log('📋 [SW] Notification type:', notificationData.type);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log(`🪟 [SW] Found ${clientList.length} client(s)`);
        
        // Find existing window with our app
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            console.log('✨ [SW] Focusing existing client');
            return client.focus().then(() => {
              // Broadcast navigation request to client
              client.postMessage({
                type: 'NOTIFICATION_CLICK_NAVIGATE',
                url: urlToOpen,
                data: notificationData
              });
              return client;
            });
          }
        }
        
        // No window open, create new one
        console.log('🆕 [SW] Opening new window');
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
      .catch(err => {
        console.error('❌ [SW] Error handling notification click:', err);
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
