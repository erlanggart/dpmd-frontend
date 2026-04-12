import { useEffect } from 'react';
import pushNotificationManager from '../utils/pushNotificationManager';

/**
 * PushNotificationInitializer
 * Auto-initialize dan auto-subscribe push notifications
 * Letakkan di App.jsx atau main layout
 */
const PushNotificationInitializer = () => {
  useEffect(() => {
    const initPushNotifications = async () => {
      try {
        // Check if supported
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          return;
        }

        // Check current permission
        if (Notification.permission === 'denied') {
          return;
        }

        // Initialize push notification manager
        const initResult = await pushNotificationManager.initialize();
        
        if (!initResult.success) {
          return;
        }

        // Check if already subscribed
        const status = await pushNotificationManager.getSubscriptionStatus();
        
        if (status.subscribed) {
          return;
        }

        // Auto-subscribe if permission is default (first time)
        if (Notification.permission === 'default') {
          await pushNotificationManager.subscribe();
        }
      } catch (error) {
        // Silent fail - push notifications are non-critical
      }
    };

    // Run initialization after a short delay to ensure service worker is ready
    const timer = setTimeout(() => {
      initPushNotifications();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // This component doesn't render anything
  return null;
};

export default PushNotificationInitializer;
