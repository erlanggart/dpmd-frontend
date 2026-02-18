/**
 * Push Notification Manager - Adapter
 * Wraps pushNotifications.js functions into an object-oriented API
 * Used by: PushNotificationInitializer, PushNotificationToggle, useDisposisiAutoReload
 */
import api from '../api';
import {
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushNotificationSupported,
  getNotificationPermissionStatus,
} from './pushNotifications';

const pushNotificationManager = {
  /**
   * Initialize push notification system (register SW + request permission)
   * @returns {{ success: boolean, error?: string }}
   */
  async initialize() {
    try {
      if (!isPushNotificationSupported()) {
        return { success: false, error: 'Push notifications tidak didukung browser ini' };
      }

      const registration = await registerServiceWorker();
      if (!registration) {
        return { success: false, error: 'Gagal mendaftarkan Service Worker' };
      }

      const permissionGranted = await requestNotificationPermission();
      if (!permissionGranted) {
        return { success: false, error: 'Izin notifikasi tidak diberikan' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get current subscription status
   * @returns {{ supported: boolean, subscribed: boolean, permission: string }}
   */
  async getSubscriptionStatus() {
    try {
      const supported = isPushNotificationSupported();
      const permission = getNotificationPermissionStatus();

      if (!supported) {
        return { supported: false, subscribed: false, permission };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      return {
        supported: true,
        subscribed: !!subscription,
        permission,
      };
    } catch {
      return { supported: false, subscribed: false, permission: 'default' };
    }
  },

  /**
   * Subscribe to push notifications
   * @returns {{ success: boolean, message?: string }}
   */
  async subscribe() {
    try {
      const subscription = await subscribeToPushNotifications();
      if (subscription) {
        return { success: true };
      }
      return { success: false, message: 'Gagal berlangganan notifikasi push' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Unsubscribe from push notifications
   * @returns {{ success: boolean, message?: string }}
   */
  async unsubscribe() {
    try {
      const result = await unsubscribeFromPushNotifications();
      if (result) {
        return { success: true };
      }
      return { success: false, message: 'Tidak ada subscription aktif' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Send test notification via backend API
   * @returns {{ success: boolean, error?: string }}
   */
  async sendTestNotification() {
    try {
      const response = await api.post('/push-notification/test');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Gagal mengirim test notifikasi',
      };
    }
  },

  /**
   * Setup listener for messages from Service Worker (push events, notification clicks)
   * @param {Function} handler - callback receiving message data
   */
  setupMessageListener(handler) {
    if (!('serviceWorker' in navigator)) return;

    const listener = (event) => {
      if (event.data) {
        handler(event.data);
      }
    };

    navigator.serviceWorker.addEventListener('message', listener);

    // Return cleanup function (not commonly used since the hook manages its own cleanup)
    return () => {
      navigator.serviceWorker.removeEventListener('message', listener);
    };
  },
};

export default pushNotificationManager;
