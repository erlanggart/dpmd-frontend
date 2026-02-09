// Session Persistence Utility for PWA
// Ensures user session persists across app closes and device restarts

// Debounce timer to prevent excessive backups
let backupTimer = null;
const BACKUP_DEBOUNCE_MS = 2000; // Wait 2 seconds before backing up

// Logout flag key - prevents IndexedDB from restoring after explicit logout
const LOGOUT_FLAG_KEY = 'dpmd_logged_out';

/**
 * Set logout flag so IndexedDB restore is skipped on next load
 */
export const setLogoutFlag = () => {
  try {
    localStorage.setItem(LOGOUT_FLAG_KEY, 'true');
  } catch (e) { /* ignore */ }
};

/**
 * Check and clear logout flag. Returns true if flag was set.
 */
export const checkAndClearLogoutFlag = () => {
  try {
    const flag = localStorage.getItem(LOGOUT_FLAG_KEY);
    if (flag) {
      localStorage.removeItem(LOGOUT_FLAG_KEY);
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
};

/**
 * Perform a complete logout - clears localStorage, IndexedDB, and sets flag
 * Use this instead of manually removing localStorage items
 */
export const performFullLogout = async () => {
  console.log('[Session] 🚪 Performing full logout...');
  
  // Set flag FIRST so restore doesn't kick in on reload
  setLogoutFlag();
  
  // Clear localStorage
  localStorage.removeItem('authSession');
  localStorage.removeItem('user');
  localStorage.removeItem('expressToken');
  
  // Clear IndexedDB
  try {
    const db = await openSessionDB();
    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    store.delete('current');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    console.log('[Session] ✅ IndexedDB session cleared');
  } catch (error) {
    console.error('[Session] Error clearing IndexedDB:', error);
  }
  
  console.log('[Session] ✅ Full logout complete');
};

/**
 * Initialize session persistence
 * Call this once when the app starts
 */
export const initSessionPersistence = () => {
  if (!('indexedDB' in window)) {
    console.warn('[Session] IndexedDB not supported, using localStorage only');
    return;
  }

  // Open IndexedDB for session backup
  const request = indexedDB.open('DPMD_SessionDB', 1);

  request.onerror = () => {
    console.error('[Session] IndexedDB initialization failed');
  };

  request.onsuccess = () => {
    // Silent success
  };

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('sessions')) {
      db.createObjectStore('sessions', { keyPath: 'id' });
      console.log('[Session] Created sessions object store');
    }
  };
};

/**
 * Backup session to IndexedDB with debouncing
 * This provides an additional layer of persistence
 * SYNCHRONOUSLY waits for completion
 */
export const backupSessionToIndexedDB = async () => {
  // Clear existing timer
  if (backupTimer) {
    clearTimeout(backupTimer);
  }

  // Debounce: wait before actually backing up
  return new Promise((resolve) => {
    backupTimer = setTimeout(async () => {
      try {
        const sessionStr = localStorage.getItem('authSession');
        if (!sessionStr) {
          // Silently skip if no session
          resolve(false);
          return;
        }

        const session = JSON.parse(sessionStr);
        
        // Validate session data before backing up (NO expiresAt required - permanent session)
        if (!session.user || !session.token) {
          console.warn('[Session] Invalid session data, skipping backup');
          resolve(false);
          return;
        }

        const db = await openSessionDB();
        
        // Use Promise to wait for transaction to complete
        const result = await new Promise((resolveDB, rejectDB) => {
          const tx = db.transaction('sessions', 'readwrite');
          const store = tx.objectStore('sessions');

          const backupData = {
            id: 'current',
            ...session,
            backedUpAt: Date.now()
          };
          
          store.put(backupData);

          tx.oncomplete = () => {
            // Only log occasionally (every 10th backup) to reduce console spam
            const shouldLog = Math.random() < 0.1; // 10% chance
            if (shouldLog) {
              console.log('[Session] ✅ Session backed up to IndexedDB:', {
                user: session.user?.name || session.user?.nama || 'unknown',
                lastActivity: new Date(session.lastActivity).toLocaleString('id-ID'),
                backedUpAt: new Date(backupData.backedUpAt).toLocaleString('id-ID')
              });
            }
            resolveDB(true);
          };

          tx.onerror = () => {
            console.error('[Session] ❌ Failed to backup:', tx.error);
            rejectDB(tx.error);
          };
        });

        resolve(result);
      } catch (error) {
        console.error('[Session] ❌ Failed to backup to IndexedDB:', error);
        resolve(false);
      }
    }, BACKUP_DEBOUNCE_MS);
  });
};

/**
 * Restore session from IndexedDB if localStorage is empty
 * Useful when browser clears localStorage but IndexedDB persists
 */
export const restoreSessionFromIndexedDB = async () => {
  try {
    console.log('[Session] 🔍 Checking for session restore...');
    
    // Check logout flag - if user explicitly logged out, do NOT restore
    if (checkAndClearLogoutFlag()) {
      console.log('[Session] 🚫 Logout flag detected, skipping restore');
      return false;
    }
    
    // Check if session already exists in localStorage
    const existingSession = localStorage.getItem('authSession');
    if (existingSession) {
      console.log('[Session] ✅ Session already exists in localStorage, no restore needed');
      return true; // Session already exists
    }
    
    console.log('[Session] 📦 localStorage empty, checking IndexedDB...');

    const db = await openSessionDB();
    const tx = db.transaction('sessions', 'readonly');
    const store = tx.objectStore('sessions');
    const request = store.get('current');

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const session = request.result;
        if (session) {
          console.log('[Session] 📦 Found session in IndexedDB:', {
            user: session.user?.nama || 'unknown',
            backedUpAt: session.backedUpAt ? new Date(session.backedUpAt).toLocaleString('id-ID') : 'unknown'
          });
          
          // NO EXPIRY CHECK - session is always valid!
          // Restore to localStorage
          const sessionData = {
            user: session.user,
            token: session.token,
            lastActivity: Date.now(),
            // NO expiresAt or rememberMe
          };
          
          localStorage.setItem('authSession', JSON.stringify(sessionData));
          localStorage.setItem('user', JSON.stringify(session.user));
          localStorage.setItem('expressToken', session.token);
          
          console.log('[Session] ✅ Session restored from IndexedDB (PERMANENT - no expiry check)');
          
          // Dispatch event to notify AuthContext
          window.dispatchEvent(new CustomEvent('session-restored', { 
            detail: sessionData 
          }));
          
          resolve(true);
        } else {
          console.log('[Session] ℹ️ No session found in IndexedDB');
          resolve(false);
        }
      };

      request.onerror = () => {
        console.error('[Session] ❌ Failed to read from IndexedDB');
        resolve(false);
      };
    });
  } catch (error) {
    console.error('[Session] ❌ Error restoring session:', error);
    return false;
  }
};

/**
 * Helper to open IndexedDB connection
 */
const openSessionDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DPMD_SessionDB', 1);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
    };
  });
};

/**
 * Sync session between tabs
 * Ensures all tabs have the same session state
 */
export const syncSessionAcrossTabs = () => {
  window.addEventListener('storage', (event) => {
    if (event.key === 'authSession' && event.newValue) {
      console.log('[Session] Session updated in another tab');
      // Trigger a custom event to notify the app
      window.dispatchEvent(new CustomEvent('sessionUpdated', {
        detail: JSON.parse(event.newValue)
      }));
    } else if (event.key === 'authSession' && !event.newValue) {
      console.log('[Session] Session cleared in another tab');
      window.dispatchEvent(new CustomEvent('sessionCleared'));
    }
  });
};

/**
 * Setup periodic session backup
 * Backs up session to IndexedDB every minute and on critical events
 */
export const setupPeriodicBackup = () => {
  // Initial backup
  backupSessionToIndexedDB();
  
  // Frequent backup every 1 minute (was 5 minutes)
  const backupInterval = setInterval(() => {
    backupSessionToIndexedDB();
  }, 60 * 1000); // Every 1 minute
  
  // Backup when app goes to background (CRITICAL for mobile)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      backupSessionToIndexedDB();
    } else if (document.visibilityState === 'visible') {
      backupSessionToIndexedDB();
    }
  });
  
  // Backup before page unload (desktop browsers)
  window.addEventListener('beforeunload', () => {
    backupSessionToIndexedDB();
  });
  
  // Backup on pagehide (better for mobile/PWA than beforeunload)
  window.addEventListener('pagehide', () => {
    backupSessionToIndexedDB();
  });
  
  // Backup on freeze event (iOS Safari specific)
  window.addEventListener('freeze', () => {
    backupSessionToIndexedDB();
  });
  
  return () => {
    clearInterval(backupInterval);
  };
};

/**
 * Clear all session data
 * Use this on explicit logout
 */
export const clearAllSessionData = async () => {
  try {
    // Clear localStorage
    localStorage.removeItem('authSession');
    localStorage.removeItem('user');
    localStorage.removeItem('expressToken');
    
    // Clear IndexedDB
    const db = await openSessionDB();
    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    await store.delete('current');
    
    console.log('[Session] All session data cleared');
  } catch (error) {
    console.error('[Session] Error clearing session data:', error);
  }
};
