// Push Notification Utility Functions
import api from '../api';

// Request notification permission
export const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('Browser tidak support notifikasi');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Browser tidak support service worker');
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    
    if (permission === 'granted') {
      return true;
    } else if (permission === 'denied') {
      console.warn('Notifikasi ditolak oleh user');
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Register service worker
export const registerServiceWorker = async () => {
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker tidak didukung browser');
      return null;
    }

    // Vite PWA generates sw.js automatically in dist/
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

// Subscribe to push notifications
let isSubscribing = false; // Flag to prevent duplicate subscriptions

export const subscribeToPushNotifications = async () => {
  if (isSubscribing) {
    console.log('[Push] ⏭️ Subscription already in progress, skipping...');
    return null;
  }
  
  try {
    isSubscribing = true;
    console.log('[Push] Starting subscription process...');
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Service Worker ready');

    // VAPID public key (harus sama dengan backend)
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BCEEJBfb05GAzlnpuzfPJszt054iCSOhqPVkmAMyTcUGZ8VrNluqShCQ2PVmwcMU0WuXJC35P5_XCXJNaQczX-U';
    console.log('[Push] VAPID Public Key:', vapidPublicKey.substring(0, 30) + '...');

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('[Push] Found existing subscription');
      
      // Check if subscription uses the same VAPID key
      const currentKey = subscription.options?.applicationServerKey;
      const newKey = urlBase64ToUint8Array(vapidPublicKey);
      
      // Compare keys - if different, unsubscribe and re-subscribe
      let needsResubscribe = false;
      if (currentKey && newKey) {
        const currentKeyStr = btoa(String.fromCharCode(...new Uint8Array(currentKey)));
        const newKeyStr = btoa(String.fromCharCode(...new Uint8Array(newKey)));
        if (currentKeyStr !== newKeyStr) {
          console.warn('[Push] ⚠️ VAPID key mismatch detected!');
          needsResubscribe = true;
        }
      }
      
      if (needsResubscribe) {
        console.log('[Push] 🔄 Unsubscribing from old subscription...');
        await subscription.unsubscribe();
        console.log('[Push] ✅ Unsubscribed from old subscription');
        subscription = null;
      } else {
        console.log('[Push] ✅ Subscription valid, updating server...');
        // Still send to server in case it's not in DB
        try {
          await sendSubscriptionToServer(subscription);
        } catch (err) {
          console.warn('[Push] Could not update subscription on server:', err);
        }
        return subscription;
      }
    }

    // Convert VAPID key to Uint8Array
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe
    console.log('[Push] Requesting push subscription from browser...');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    console.log('[Push] ✅ Push subscription created!');

    // Send subscription to server
    await sendSubscriptionToServer(subscription);
    console.log('[Push] ✅ Subscription sent to server successfully!');

    return subscription;
  } catch (error) {
    console.error('[Push] ❌ Error subscribing to push notifications:', error);
    return null;
  } finally {
    isSubscribing = false;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
      
      // Remove from server
      await removeSubscriptionFromServer(subscription);
      
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
};

// Send subscription to server
const sendSubscriptionToServer = async (subscription) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    const payload = {
      user_id: user.id,
      subscription: subscription
    };
    
    const response = await api.post('/push-notification/subscribe', payload);
    return response.data;
  } catch (error) {
    console.error('[Push] ❌ Error sending subscription to server:', error);
    throw error;
  }
};

// Remove subscription from server
const removeSubscriptionFromServer = async (subscription) => {
  try {
    const response = await api.post('/push-notification/unsubscribe', {
      subscription: JSON.stringify(subscription)
    });

    console.log('Subscription removed from server:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error removing subscription from server:', error);
    throw error;
  }
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Show local notification (untuk testing)
export const showLocalNotification = async (title, options = {}) => {
  try {
    if (!('Notification' in window)) {
      console.warn('Browser tidak support notifikasi');
      return;
    }

    if (Notification.permission !== 'granted') {
      await requestNotificationPermission();
    }

    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(title, {
        body: options.body || 'Notifikasi dari DPMD',
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-192x192.png',
        vibrate: options.vibrate || [200, 100, 200],
        tag: options.tag || 'default-notification',
        requireInteraction: options.requireInteraction || false,
        data: options.data || {},
        actions: options.actions || [
          { action: 'open', title: 'Buka' },
          { action: 'close', title: 'Tutup' }
        ]
      });

      console.log('Local notification shown');
    }
  } catch (error) {
    console.error('Error showing local notification:', error);
  }
};

// Check notification permission status
export const getNotificationPermissionStatus = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

// Check if push notifications are supported
export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Initialize PWA notifications
export const initializePWANotifications = async () => {
  try {
    console.log('Initializing PWA notifications...');

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      console.warn('Service Worker registration failed');
      return false;
    }

    // Request notification permission
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      console.warn('Notification permission not granted');
      return false;
    }

    // Subscribe to push notifications
    const subscription = await subscribeToPushNotifications();
    if (!subscription) {
      console.warn('Push notification subscription failed');
      return false;
    }

    console.log('PWA notifications initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing PWA notifications:', error);
    return false;
  }
};
