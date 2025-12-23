import api from '../api';
import { isPWA, supportsNativePush, logPWAStatus } from './pwaDetection';

/**
 * Push Notification Manager - PWA-First
 * Handles subscription, permission, and push notification logic
 * Works best when installed as PWA for native WhatsApp-style notifications
 */

class PushNotificationManager {
  constructor() {
    this.vapidPublicKey = null;
    this.subscription = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.isPWAMode = isPWA();
    
    // Log PWA status
    console.group('🚀 Push Notification Manager');
    console.log('PWA Mode:', this.isPWAMode ? '✅' : '❌');
    console.log('Supports Push:', this.isSupported ? '✅' : '❌');
    console.log('Native Push Support:', supportsNativePush() ? '✅' : '❌');
    logPWAStatus();
    console.groupEnd();
    
    if (!this.isPWAMode) {
      console.info('💡 Install sebagai PWA untuk notifikasi seperti WhatsApp:');
      console.info('   📱 Android: Menu (⋮) → Install app / Add to Home screen');
      console.info('   📱 iOS: Share → Add to Home Screen');
    }
  }

  /**
   * Initialize push notifications
   */
  async initialize() {
    if (!this.isSupported) {
      console.warn('❌ Push notifications not supported in this browser');
      return { success: false, message: 'Push notifications not supported' };
    }

    try {
      // Get VAPID public key
      const { data } = await api.get('/push-notification/vapid-public-key');
      this.vapidPublicKey = data.publicKey;
      console.log('✅ VAPID public key retrieved');

      // Check existing subscription
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        this.subscription = existingSubscription;
        console.log('✅ Existing push subscription found');
        return { success: true, subscription: existingSubscription };
      }

      return { success: true, message: 'Ready to subscribe' };
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request permission and subscribe to push notifications
   */
  async subscribe() {
    if (!this.isSupported) {
      return { success: false, message: 'Push notifications not supported' };
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('⚠️ Push notification permission denied');
        return { success: false, message: 'Permission denied' };
      }

      console.log('✅ Push notification permission granted');

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push notifications
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
        console.log('✅ New push subscription created');
      }

      this.subscription = subscription;

      // Send subscription to backend
      const subscriptionJSON = subscription.toJSON();
      await api.post('/push-notification/subscribe', {
        subscription: subscriptionJSON
      });

      console.log('✅ Push subscription saved to backend');

      return { 
        success: true, 
        subscription,
        message: 'Push notifications enabled successfully' 
      };
    } catch (error) {
      console.error('❌ Error subscribing to push notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    if (!this.subscription) {
      return { success: false, message: 'No active subscription' };
    }

    try {
      // Unsubscribe from browser
      await this.subscription.unsubscribe();
      console.log('✅ Push subscription removed from browser');

      // Remove from backend
      await api.post('/push-notification/unsubscribe', {
        endpoint: this.subscription.endpoint
      });
      console.log('✅ Push subscription removed from backend');

      this.subscription = null;

      return { 
        success: true, 
        message: 'Push notifications disabled successfully' 
      };
    } catch (error) {
      console.error('❌ Error unsubscribing from push notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check subscription status
   */
  async getSubscriptionStatus() {
    try {
      if (!this.isSupported) {
        return { supported: false, subscribed: false, permission: 'default' };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      return {
        supported: true,
        subscribed: !!subscription,
        permission: Notification.permission,
        subscription: subscription
      };
    } catch (error) {
      console.error('❌ Error getting subscription status:', error);
      return { supported: false, subscribed: false, permission: 'default', error: error.message };
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification() {
    try {
      const response = await api.post('/push-notification/test');
      console.log('✅ Test notification sent:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup message listener for push notifications
   */
  setupMessageListener(callback) {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('📨 Message from service worker:', event.data);
      
      if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
        callback(event.data);
      }

      if (event.data && event.data.type === 'NOTIFICATION_CLICK_NAVIGATE') {
        callback(event.data);
      }
    });

    console.log('✅ Service worker message listener setup');
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
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
}

// Export singleton instance
const pushNotificationManager = new PushNotificationManager();
export default pushNotificationManager;
