import { useEffect, useCallback, useRef } from 'react';
import pushNotificationManager from '../utils/pushNotificationManager';

/**
 * useDisposisiAutoReload Hook
 * Automatically reload disposisi data when push notification received
 * 
 * @param {Function} reloadCallback - Function to call when reload is needed
 * @param {Object} options - Configuration options
 * @returns {Object} - Hook state and methods
 */
const useDisposisiAutoReload = (reloadCallback, options = {}) => {
  const {
    enabled = true,
    debounceMs = 1000,
    notificationTypes = ['new_disposisi', 'disposisi_update']
  } = options;

  const reloadTimeoutRef = useRef(null);
  const lastReloadRef = useRef(0);

  // Debounced reload function
  const debouncedReload = useCallback(() => {
    // Clear existing timeout
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }

    // Set new timeout
    reloadTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      // Prevent multiple reloads in quick succession
      if (now - lastReloadRef.current > debounceMs) {
        console.log('🔄 Auto-reloading disposisi data...');
        reloadCallback();
        lastReloadRef.current = now;
      }
    }, debounceMs);
  }, [reloadCallback, debounceMs]);

  useEffect(() => {
    if (!enabled) {
      console.log('⏸️ Disposisi auto-reload disabled');
      return;
    }

    console.log('✅ Disposisi auto-reload enabled');

    // Setup message listener from service worker
    const messageHandler = (data) => {
      console.log('📨 Push notification message received:', data);

      // Check if it's a notification we care about
      if (data.type === 'PUSH_NOTIFICATION_RECEIVED') {
        const payload = data.payload || {};
        
        if (notificationTypes.includes(payload.type)) {
          console.log(`🔔 ${payload.type} notification received, triggering reload...`);
          debouncedReload();
        }
      }

      // Handle navigation from notification click
      if (data.type === 'NOTIFICATION_CLICK_NAVIGATE') {
        console.log('👆 Notification clicked, user navigating to:', data.url);
        debouncedReload();
      }
    };

    pushNotificationManager.setupMessageListener(messageHandler);

    // Cleanup
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [enabled, debouncedReload, notificationTypes]);

  return {
    manualReload: debouncedReload
  };
};

export default useDisposisiAutoReload;
