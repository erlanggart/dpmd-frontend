// Version Check Utility for PWA
// Detects when new version is available and prompts user to update

const VERSION_KEY = 'app_version';
const VERSION_CHECK_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes

/**
 * Get current app version from package.json (injected at build time)
 */
export const getCurrentVersion = () => {
  // Version will be injected by Vite during build
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
};

/**
 * Get stored version from localStorage
 */
export const getStoredVersion = () => {
  return localStorage.getItem(VERSION_KEY);
};

/**
 * Store current version to localStorage
 */
export const storeVersion = (version) => {
  localStorage.setItem(VERSION_KEY, version);
};

/**
 * Check if app needs update
 * Returns true if stored version is different from current version
 */
export const needsUpdate = () => {
  const currentVersion = getCurrentVersion();
  const storedVersion = getStoredVersion();
  
  // First time user
  if (!storedVersion) {
    storeVersion(currentVersion);
    return false;
  }
  
  // Compare versions
  const isOutdated = currentVersion !== storedVersion;
  
  if (isOutdated) {
    console.log(`[Version] Update available: ${storedVersion} → ${currentVersion}`);
  }
  
  return isOutdated;
};

/**
 * Force hard refresh and update service worker
 * This clears all caches and reloads the app
 */
export const forceUpdate = async () => {
  try {
    console.log('[Version] Forcing app update...');
    
    // Update stored version
    storeVersion(getCurrentVersion());
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[Version] Service worker unregistered');
      }
    }
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log(`[Version] Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }
    
    // Hard reload
    console.log('[Version] Reloading app...');
    window.location.reload(true);
  } catch (error) {
    console.error('[Version] Error during force update:', error);
    // Fallback: just reload
    window.location.reload(true);
  }
};

/**
 * Check for updates from server
 * Fetches version.json from server to compare
 */
export const checkForServerUpdate = async () => {
  try {
    // Fetch version.json with cache-busting
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.warn('[Version] Could not fetch version.json');
      return false;
    }
    
    const data = await response.json();
    const serverVersion = data.version;
    const currentVersion = getCurrentVersion();
    const storedVersion = getStoredVersion();
    
    console.log('[Version] Server version:', serverVersion);
    console.log('[Version] Current version:', currentVersion);
    console.log('[Version] Stored version:', storedVersion);
    
    // Check if server has newer version than what's stored
    if (serverVersion !== storedVersion) {
      console.log('[Version] 🆕 New version available from server!');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Version] Error checking server version:', error);
    return false;
  }
};

/**
 * Setup periodic version check
 * Checks for updates every 30 minutes
 */
export const setupPeriodicVersionCheck = (onUpdateAvailable) => {
  // Check on visibility change (when user returns to app)
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      const updateAvailable = await checkForServerUpdate();
      if (updateAvailable && onUpdateAvailable) {
        onUpdateAvailable();
      }
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Periodic check
  const intervalId = setInterval(async () => {
    const updateAvailable = await checkForServerUpdate();
    if (updateAvailable && onUpdateAvailable) {
      onUpdateAvailable();
    }
  }, VERSION_CHECK_INTERVAL);
  
  // Initial check
  setTimeout(async () => {
    const updateAvailable = await checkForServerUpdate();
    if (updateAvailable && onUpdateAvailable) {
      onUpdateAvailable();
    }
  }, 5000); // Check 5 seconds after app loads
  
  // Cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(intervalId);
  };
};

/**
 * Compare version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export const compareVersions = (v1, v2) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
};

/**
 * Get version info for display
 */
export const getVersionInfo = () => {
  const currentVersion = getCurrentVersion();
  const storedVersion = getStoredVersion();
  const buildDate = import.meta.env.VITE_BUILD_DATE || 'Unknown';
  
  return {
    current: currentVersion,
    stored: storedVersion,
    buildDate,
    needsUpdate: needsUpdate()
  };
};
