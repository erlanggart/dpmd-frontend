/**
 * PWA Detection Utilities
 * Mendeteksi apakah app berjalan sebagai PWA atau web browser biasa
 */

/**
 * Check if app is running as installed PWA
 * @returns {boolean}
 */
export const isPWA = () => {
  // Method 1: Check display mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Method 2: Check if launched from home screen (iOS)
  const isIOSStandalone = window.navigator.standalone === true;
  
  // Method 3: Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const isPWAParam = urlParams.get('source') === 'pwa';
  
  // Method 4: Check if installed via manifest
  const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  
  return isStandalone || isIOSStandalone || isPWAParam || isMinimalUI || isFullscreen;
};

/**
 * Get PWA install status
 * @returns {Object}
 */
export const getPWAStatus = () => {
  const pwaMode = isPWA();
  const canInstall = 'BeforeInstallPromptEvent' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasNotification = 'Notification' in window;
  const hasPushManager = 'PushManager' in window;
  
  return {
    isPWA: pwaMode,
    canInstall,
    hasServiceWorker,
    hasNotification,
    hasPushManager,
    platform: getPlatform(),
    notificationPermission: hasNotification ? Notification.permission : 'unsupported'
  };
};

/**
 * Detect platform (Android/iOS/Desktop)
 * @returns {string}
 */
export const getPlatform = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // iOS detection
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'iOS';
  }
  
  // Android detection
  if (/android/i.test(userAgent)) {
    return 'Android';
  }
  
  // Windows Phone detection
  if (/windows phone/i.test(userAgent)) {
    return 'Windows Phone';
  }
  
  // Desktop
  return 'Desktop';
};

/**
 * Check if browser supports native push notifications
 * @returns {boolean}
 */
export const supportsNativePush = () => {
  const status = getPWAStatus();
  const platform = status.platform;
  
  // iOS requires PWA mode (iOS 16.4+)
  if (platform === 'iOS') {
    return status.isPWA && status.hasNotification && status.hasPushManager;
  }
  
  // Android supports push in browser and PWA
  if (platform === 'Android') {
    return status.hasNotification && status.hasPushManager;
  }
  
  // Desktop supports push in browser
  return status.hasNotification && status.hasPushManager;
};

/**
 * Show install prompt for PWA
 * @returns {Promise<boolean>}
 */
export const promptPWAInstall = async () => {
  if (!window.deferredPrompt) {
    console.warn('PWA install prompt not available');
    return false;
  }
  
  try {
    // Show install prompt
    window.deferredPrompt.prompt();
    
    // Wait for user choice
    const { outcome } = await window.deferredPrompt.userChoice;
    
    console.log(`PWA install outcome: ${outcome}`);
    
    // Clear the deferred prompt
    window.deferredPrompt = null;
    
    return outcome === 'accepted';
  } catch (error) {
    console.error('Error showing PWA install prompt:', error);
    return false;
  }
};

/**
 * Log PWA status to console (for debugging)
 */
export const logPWAStatus = () => {
  const status = getPWAStatus();
  
  console.group('📱 PWA Status');
  console.log('Is PWA:', status.isPWA ? '✅' : '❌');
  console.log('Can Install:', status.canInstall ? '✅' : '❌');
  console.log('Service Worker:', status.hasServiceWorker ? '✅' : '❌');
  console.log('Notifications:', status.hasNotification ? '✅' : '❌');
  console.log('Push Manager:', status.hasPushManager ? '✅' : '❌');
  console.log('Platform:', status.platform);
  console.log('Notification Permission:', status.notificationPermission);
  console.log('Supports Native Push:', supportsNativePush() ? '✅' : '❌');
  console.groupEnd();
  
  return status;
};

// Listen for beforeinstallprompt event
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    
    // Stash the event so it can be triggered later
    window.deferredPrompt = e;
    
    console.log('💾 PWA install prompt available');
    
    // Dispatch custom event for app to listen
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });
  
  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installed successfully');
    window.deferredPrompt = null;
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

export default {
  isPWA,
  getPWAStatus,
  getPlatform,
  supportsNativePush,
  promptPWAInstall,
  logPWAStatus
};
