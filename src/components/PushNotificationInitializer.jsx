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
        console.log('🔔 [PushNotificationInitializer] Initializing...');
        
        // Check if supported
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.warn('⚠️ Push notifications not supported');
          return;
        }

        // Check current permission
        if (Notification.permission === 'denied') {
          console.warn('⚠️ Push notification permission denied by user');
          return;
        }

        // Initialize push notification manager
        const initResult = await pushNotificationManager.initialize();
        
        if (!initResult.success) {
          console.error('❌ Failed to initialize push notifications:', initResult.error);
          return;
        }

        console.log('✅ Push notification manager initialized');

        // Check if already subscribed
        const status = await pushNotificationManager.getSubscriptionStatus();
        
        if (status.subscribed) {
          console.log('✅ Already subscribed to push notifications');
          return;
        }

        // Auto-subscribe if permission is default (first time)
        if (Notification.permission === 'default') {
          console.log('🔔 Requesting push notification permission...');
          
          const subscribeResult = await pushNotificationManager.subscribe();
          
          if (subscribeResult.success) {
            console.log('✅ Auto-subscribed to push notifications');
          } else {
            console.log('ℹ️ User needs to manually enable notifications');
          }
        }
      } catch (error) {
        console.error('❌ Error initializing push notifications:', error);
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
