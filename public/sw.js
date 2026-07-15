// Service Worker for Development Mode
// This file is used in development. In production, sw-custom.js is injected into the built sw.js

const SW_VERSION = '1.1.0-dev';
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

// Semua disposisi berbagi satu tag supaya beberapa disposisi yang datang
// beruntun menimpa satu sama lain, bukan menumpuk jadi banyak pop-up.
const DISPOSISI_TAG = 'dpmd-disposisi';
const DISPOSISI_URL = '/dpmd/disposisi';

function isDisposisiType(type) {
	return typeof type === 'string' && type.includes('disposisi');
}

// Disposisi ke-2 dan seterusnya diringkas jadi "N Disposisi Baru" tanpa
// disposisi_id, supaya klik mengarah ke halaman daftar disposisi.
async function buildDisposisiNotification(notificationData) {
	const { title, body, data, icon, badge } = notificationData;
	const existing = await self.registration.getNotifications({ tag: DISPOSISI_TAG });
	const count = existing.reduce((total, notif) => total + (notif.data?.count || 1), 0) + 1;

	if (count === 1) {
		return {
			title: title || 'Disposisi Baru',
			options: {
				body: body || 'Anda menerima disposisi baru',
				icon: icon || '/logo-dpmd.png',
				badge: badge || '/logo-dpmd.png',
				data: { ...(data || {}), count: 1 },
				tag: DISPOSISI_TAG,
				requireInteraction: true,
				renotify: false,
				silent: false,
				actions: notificationData.actions || []
			},
			playSound: true
		};
	}

	return {
		title: `📨 ${count} Disposisi Baru`,
		options: {
			body: 'Ketuk untuk melihat semua disposisi masuk Anda',
			icon: icon || '/logo-dpmd.png',
			badge: badge || '/logo-dpmd.png',
			data: {
				type: data?.type || 'new_disposisi',
				count,
				url: DISPOSISI_URL,
				timestamp: Date.now()
			},
			tag: DISPOSISI_TAG,
			requireInteraction: true,
			// renotify + silent: perbarui diam-diam, jangan bunyi/getar berulang
			renotify: false,
			silent: true,
			actions: []
		},
		playSound: false
	};
}

async function handlePushNotification(notificationData) {
	const { title, body, data, icon, badge } = notificationData;

	const notification = isDisposisiType(data?.type)
		? await buildDisposisiNotification(notificationData)
		: {
			title: title || 'Notifikasi Baru',
			options: {
				body: body || 'Anda memiliki notifikasi baru',
				icon: icon || '/logo-dpmd.png',
				badge: badge || '/logo-dpmd.png',
				data: data || {},
				tag: data?.id || 'notification-' + Date.now(),
				requireInteraction: true,
				renotify: false,
				silent: false,
				actions: notificationData.actions || []
			},
			playSound: true
		};

	await self.registration.showNotification(notification.title, notification.options);
	console.log('[SW] ✅ Browser notification shown:', notification.title);

	// Broadcast message to all clients (untuk popup di app)
	const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
	console.log(`[SW] Broadcasting to ${clients.length} clients`);

	clients.forEach(client => {
		client.postMessage({
			type: 'PUSH_NOTIFICATION_RECEIVED',
			payload: data || notificationData,
			timestamp: Date.now(),
			playSound: notification.playSound,
			soundUrl: '/dpmd.mp3'
		});
		console.log('[SW] Message sent to client:', client.url);
	});
}

// Push event handler
self.addEventListener('push', (event) => {
	console.log('[SW] 📨 Push event received');

	if (!event.data) {
		console.warn('[SW] Push event tanpa data');
		return;
	}

	let notificationData;
	try {
		notificationData = event.data.json();
		console.log('[SW] Notification data:', notificationData);
	} catch (error) {
		console.error('[SW] Error parsing push data:', error);
		return;
	}

	event.waitUntil(
		handlePushNotification(notificationData).catch(error => {
			console.error('[SW] Error handling push:', error);
		})
	);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
	console.log('[SW] Notification clicked:', event.notification);
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
	if (isDisposisiType(notificationType)) {
		// Notifikasi ringkasan tidak punya disposisi_id → buka daftar disposisi
		urlToOpen = notificationData.disposisi_id
			? `${DISPOSISI_URL}/${notificationData.disposisi_id}`
			: DISPOSISI_URL;
	} else if (urlToOpen === '/disposisi' || urlToOpen === '/admin/disposisi') {
		urlToOpen = '/'; // App will smart-redirect to user's dashboard
	}
	if (urlToOpen === '/jadwal-kegiatan') {
		urlToOpen = '/dpmd/jadwal-kegiatan';
	}
	// Tambah tanggal param untuk notifikasi jadwal
	if (notificationData.targetDate && urlToOpen.includes('jadwal-kegiatan')) {
		urlToOpen = `/dpmd/jadwal-kegiatan?tanggal=${notificationData.targetDate}`;
	}

	console.log('[SW] Opening URL:', urlToOpen, 'Type:', notificationType);

	// Open or focus window and send navigation message
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
			// If we have an active client, send message to navigate
			for (const client of clientList) {
				if ('focus' in client) {
					console.log('[SW] Focusing existing window and sending nav message');
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
				console.log('[SW] Opening new window');
				return self.clients.openWindow(urlToOpen);
			}
		})
	);
});

console.log('[SW] ✅ Push notification listeners attached');
console.log('[SW] ✅ Service Worker ready');
