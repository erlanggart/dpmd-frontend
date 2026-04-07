// Custom Push Notification Handler
// Loaded via importScripts() by Workbox-generated sw.js

const SW_CUSTOM_VERSION = '1.0.2';
console.log(`[SW-Custom] Version ${SW_CUSTOM_VERSION} loaded`);
console.log('[SW-Custom] Push notification handler initializing...');

// Clear old icon caches on activation to force icon refresh
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames.map(cacheName => {
					// Delete media/asset caches that may hold old icons
					if (cacheName.includes('media-cache') || cacheName.includes('workbox-precache')) {
						console.log('[SW-Custom] Clearing cache for icon refresh:', cacheName);
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
});

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
				icon: icon || '/logo-dpmd.png',
				badge: badge || '/logo-dpmd.png',
				data: data || {},
				tag: data?.id || 'notification-' + Date.now(),
				requireInteraction: true,
				renotify: false,
				silent: false,
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
						soundUrl: '/dpmd.mp3'
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
	const notificationType = notificationData.type || '';
	
	// Determine URL - default to '/' so App.jsx will smart-redirect to user's dashboard
	let urlToOpen = notificationData.url || '/';
	
	// For URLs without proper role prefix, use root and let App.jsx handle smart redirect
	// App.jsx will redirect to appropriate dashboard based on user's role:
	// - superadmin -> /superadmin/dashboard
	// - desa -> /desa/dashboard  
	// - kecamatan -> /kecamatan/dashboard
	// - DPMD staff -> /dpmd/dashboard
	// Fix URLs tanpa prefix yang benar
	if (urlToOpen === '/disposisi' || urlToOpen === '/admin/disposisi') {
		urlToOpen = '/'; // App will smart-redirect to user's dashboard
	}
	if (urlToOpen === '/jadwal-kegiatan') {
		urlToOpen = '/dpmd/jadwal-kegiatan';
	}
	// Tambah tanggal param untuk notifikasi jadwal
	if (notificationData.targetDate && urlToOpen.includes('jadwal-kegiatan')) {
		urlToOpen = `/dpmd/jadwal-kegiatan?tanggal=${notificationData.targetDate}`;
	}
	// Birthday notification → go to dashboard to show popup
	if (notificationType === 'birthday') {
		urlToOpen = '/dpmd/dashboard';
	}

	console.log('[SW-Custom] Opening URL:', urlToOpen, 'Type:', notificationType);

	// Open or focus window and send navigation message
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
			// If we have an active client, send message to navigate
			for (const client of clientList) {
				if ('focus' in client) {
					console.log('[SW-Custom] Focusing existing window and sending nav message');
					client.postMessage({
						type: 'NOTIFICATION_CLICK_NAVIGATE',
						url: urlToOpen,
						notificationData: notificationData
					});
					return client.focus();
				}
			}

			// No client open - open new window
			if (self.clients.openWindow) {
				console.log('[SW-Custom] Opening new window');
				return self.clients.openWindow(urlToOpen);
			}
		})
	);
});

console.log('[SW-Custom] ✅ Push notification listeners attached');
