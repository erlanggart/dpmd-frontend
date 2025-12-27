// Service Worker for Development Mode
// This file is used in development. In production, sw-custom.js is injected into the built sw.js

const SW_VERSION = '1.0.3-dev';
console.log(`[SW] Version ${SW_VERSION} loaded`);

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[SW] Claimed all clients');
    })
  );
});

// Basic fetch handler
self.addEventListener('fetch', (event) => {
  // Let all requests pass through
  event.respondWith(fetch(event.request));
});

// ============================================
// PUSH NOTIFICATION HANDLER
// ============================================

console.log('[SW] Push notification handler initializing...');

// Push event handler
self.addEventListener('push', async (event) => {
	console.log('[SW] 📨 Push event received');
	
	if (!event.data) {
		console.warn('[SW] Push event tanpa data');
		return;
	}

	try {
		const notificationData = event.data.json();
		console.log('[SW] Notification data:', notificationData);

		const { title, body, data, icon, badge } = notificationData;

		// Show notification popup with proper options
		event.waitUntil(
			self.registration.showNotification(title || 'Notifikasi Baru', {
				body: body || 'Anda memiliki notifikasi baru',
				icon: icon || '/logo-bogor.png',
				badge: badge || '/logo-bogor.png',
				data: data || {},
				tag: data?.id || 'notification-' + Date.now(),
				requireInteraction: true,
				renotify: true,
				silent: false,
				vibrate: [500, 200, 500, 200, 500],
				actions: notificationData.actions || []
			}).then(() => {
				console.log('[SW] ✅ Browser notification shown');

				// Broadcast message to all clients (untuk popup di app)
				return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			}).then(clients => {
				console.log(`[SW] Found ${clients.length} clients`);
				
				// Cari client yang focused/aktif, jika tidak ada kirim ke semua
				const focusedClient = clients.find(client => client.focused);
				const targetClients = focusedClient ? [focusedClient] : clients.slice(0, 1);
				
				console.log(`[SW] Sending message to ${targetClients.length} client(s)`);
				
				targetClients.forEach(client => {
					client.postMessage({
						type: 'PUSH_NOTIFICATION_RECEIVED',
						payload: data || notificationData,
						timestamp: Date.now()
					});
					console.log('[SW] Message sent to client:', client.url);
				});
			})
		);
	} catch (error) {
		console.error('[SW] Error handling push:', error);
	}
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
	console.log('[SW] Notification clicked:', event.notification);
	event.notification.close();

	const notificationData = event.notification.data || {};
	const urlToOpen = notificationData.url || '/admin/disposisi';

	console.log('[SW] Opening URL:', urlToOpen);

	// Open or focus window
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
			// Check if already open
			for (const client of clientList) {
				if (client.url.includes(urlToOpen.split('?')[0]) && 'focus' in client) {
					console.log('[SW] Focusing existing window');
					return client.focus();
				}
			}

			// Open new window
			if (self.clients.openWindow) {
				console.log('[SW] Opening new window');
				return self.clients.openWindow(urlToOpen);
			}
		})
	);
});

console.log('[SW] ✅ Push notification listeners attached');
console.log('[SW] ✅ Service Worker ready');
