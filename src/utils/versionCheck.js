// Version Check Utility for PWA
// Detects when new version is available and prompts user to update
//
// How it works:
// 1. Each build generates a unique buildHash in version.json + <meta name="build-hash"> in index.html
// 2. The app reads its own build hash from the <meta> tag (baked at build time)
// 3. Periodically fetches /version.json (with cache-busting) from the server
// 4. If server's buildHash differs from the local one → new deployment detected → show modal

const BUILD_HASH_KEY = 'app_build_hash';
const LAST_UPDATE_KEY = 'app_last_update';
const DISMISS_KEY = 'app_update_dismissed';
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const DISMISS_DURATION = 4 * 60 * 60 * 1000;  // Don't re-show for 4 hours after dismiss

/**
 * Get the build hash that was injected into index.html at build time
 */
export const getLocalBuildHash = () => {
  const meta = document.querySelector('meta[name="build-hash"]');
  return meta?.getAttribute('content') || null;
};

/**
 * Get stored build hash from localStorage
 */
export const getStoredBuildHash = () => {
  return localStorage.getItem(BUILD_HASH_KEY);
};

/**
 * Store build hash to localStorage with timestamp
 */
export const storeBuildHash = (hash) => {
  localStorage.setItem(BUILD_HASH_KEY, hash);
  localStorage.setItem(LAST_UPDATE_KEY, Date.now().toString());
  console.log(`[Version] Stored build hash: ${hash}`);
};

/**
 * Get current app version from package.json (injected at build time)
 */
export const getCurrentVersion = () => {
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
};

/**
 * Force hard refresh and update service worker
 */
export const forceUpdate = async () => {
  try {
    console.log('[Version] Forcing app update...');
    
    // Store server's build hash so after reload we won't re-trigger
    const serverHash = sessionStorage.getItem('_pending_server_hash');
    if (serverHash) {
      storeBuildHash(serverHash);
      sessionStorage.removeItem('_pending_server_hash');
    }
    
    // Clear dismiss flag
    localStorage.removeItem(DISMISS_KEY);
    
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
    window.location.reload(true);
  }
};

/**
 * Dismiss the update notification for DISMISS_DURATION
 */
export const dismissUpdate = () => {
  localStorage.setItem(DISMISS_KEY, Date.now().toString());
  console.log('[Version] Update dismissed for 4 hours');
};

/**
 * Check if update was recently dismissed
 */
const isDismissed = () => {
  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  if (!dismissedAt) return false;
  const elapsed = Date.now() - parseInt(dismissedAt, 10);
  return elapsed < DISMISS_DURATION;
};

/**
 * Compare local build hash with server's version.json
 * Returns true if server has a different (newer) build
 */
export const checkForServerUpdate = async () => {
  try {
    // Don't check if recently dismissed
    if (isDismissed()) {
      return false;
    }

    // Don't check if just updated (within 30s grace period)
    const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
    if (lastUpdate) {
      const elapsed = Date.now() - parseInt(lastUpdate, 10);
      if (elapsed < 30000) {
        return false;
      }
    }

    // Get our local build hash from <meta> tag
    const localHash = getLocalBuildHash();
    
    // Initialize stored hash on first visit
    if (!getStoredBuildHash() && localHash) {
      storeBuildHash(localHash);
      console.log('[Version] Initialized build hash on first visit');
      return false;
    }

    // Fetch version.json with aggressive cache-busting
    const response = await fetch(`/version.json?_=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Might get HTML (e.g. SPA fallback) - not a valid version.json
      const text = await response.text();
      if (text.trim().startsWith('<')) {
        return false;
      }
      try {
        const data = JSON.parse(text);
        return processVersionData(data, localHash);
      } catch {
        return false;
      }
    }
    
    const data = await response.json();
    return processVersionData(data, localHash);
  } catch (error) {
    if (error.name !== 'SyntaxError') {
      console.warn('[Version] Could not check for updates:', error.message);
    }
    return false;
  }
};

/**
 * Process version data from server
 */
function processVersionData(data, localHash) {
  const serverHash = data.buildHash;
  
  if (!serverHash) {
    // Old format version.json without buildHash - skip
    return false;
  }
  
  const storedHash = getStoredBuildHash();
  
  console.log('[Version] Server hash:', serverHash);
  console.log('[Version] Local hash:', localHash);
  console.log('[Version] Stored hash:', storedHash);
  
  // If server hash matches our local hash, we're up to date
  if (serverHash === localHash) {
    // Also update stored hash to match
    if (storedHash !== localHash) {
      storeBuildHash(localHash);
    }
    console.log('[Version] ✅ App is up to date');
    return false;
  }
  
  // Server has a DIFFERENT hash than our local build → new version deployed!
  console.log('[Version] 🆕 New version detected! Server has different build.');
  
  // Store the pending server hash so forceUpdate can save it
  sessionStorage.setItem('_pending_server_hash', serverHash);
  
  return true;
}

/**
 * Setup periodic version check
 */
export const setupPeriodicVersionCheck = (onUpdateAvailable) => {
  // Check on visibility change (when user returns to app / switches tab)
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
  
  // Initial check after 3 seconds
  const initialTimeout = setTimeout(async () => {
    const updateAvailable = await checkForServerUpdate();
    if (updateAvailable && onUpdateAvailable) {
      onUpdateAvailable();
    }
  }, 3000);
  
  // Also check on focus (better for tablet/mobile)
  const handleFocus = async () => {
    const updateAvailable = await checkForServerUpdate();
    if (updateAvailable && onUpdateAvailable) {
      onUpdateAvailable();
    }
  };
  window.addEventListener('focus', handleFocus);
  
  // Cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    clearInterval(intervalId);
    clearTimeout(initialTimeout);
  };
};

/**
 * Get version info for display
 */
export const getVersionInfo = () => {
  const currentVersion = getCurrentVersion();
  const buildHash = getLocalBuildHash();
  const buildDate = import.meta.env.VITE_BUILD_DATE || 'Unknown';
  
  return {
    current: currentVersion,
    buildHash,
    buildDate
  };
};
