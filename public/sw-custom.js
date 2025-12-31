// Custom Push Notification Handler
// Loaded via importScripts() by Workbox-generated sw.js

const SW_CUSTOM_VERSION = '1.0.1';
console.log(`[SW-Custom] Version ${SW_CUSTOM_VERSION} loaded`);
console.log('[SW-Custom] Push notification handler initializing...');

// Push event handler
self.addEventListener('push', async (event) => {
	console.log('[SW-Custom] 📨 Push event received');
	
	if (!event.data) {
		console.warn('[SW-Custom] Push event tanpa data');
		return;
	}

	try {
		const notificationData = event.data.json();
		console.log('[SW-Custom] Notification data:', notificationData);

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
				silent: true,
				vibrate: [500, 200, 500, 200, 500],
				actions: notificationData.actions || []
			}).then(() => {
				console.log('[SW-Custom] ✅ Browser notification shown');

				// Broadcast message to all clients (untuk popup di app)
				return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			}).then(clients => {
				console.log(`[SW-Custom] Broadcasting to ${clients.length} clients`);
				
				clients.forEach(client => {
					client.postMessage({
						type: 'PUSH_NOTIFICATION_RECEIVED',
						payload: data || notificationData,
						timestamp: Date.now(),
						playSound: true,
						soundUrl: '/peraturan/dpmd.mp3'
					});
					console.log('[SW-Custom] Message sent to client:', client.url);
				});
			})
		);
	} catch (error) {
		console.error('[SW-Custom] Error handling push:', error);
	}
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
	console.log('[SW-Custom] Notification clicked:', event.notification);
	event.notification.close();

	const notificationData = event.notification.data || {};
	const urlToOpen = notificationData.url || '/admin/disposisi';

	console.log('[SW-Custom] Opening URL:', urlToOpen);

	// Open or focus window
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
			// Check if already open
			for (const client of clientList) {
				if (client.url.includes(urlToOpen.split('?')[0]) && 'focus' in client) {
					console.log('[SW-Custom] Focusing existing window');
					return client.focus();
				}
			}

			// Open new window
			if (self.clients.openWindow) {
				console.log('[SW-Custom] Opening new window');
				return self.clients.openWindow(urlToOpen);
			}
		})
	);
});

console.log('[SW-Custom] ✅ Push notification listeners attached');
