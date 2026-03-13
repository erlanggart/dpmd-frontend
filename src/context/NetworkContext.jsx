import { createContext, useContext } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const NetworkContext = createContext(null);

/**
 * Provider untuk network status yang bisa diakses dari halaman mana pun.
 * Wrap di App.jsx agar semua halaman bisa menggunakan useNetwork().
 */
export function NetworkProvider({ children }) {
  const network = useNetworkStatus();
  return (
    <NetworkContext.Provider value={network}>
      {children}
    </NetworkContext.Provider>
  );
}

/**
 * Hook untuk mengakses status jaringan dari halaman mana pun.
 * 
 * Contoh penggunaan:
 *   const network = useNetwork();
 *   const isSlowNetwork = network.speed === 'slow' || network.speed === 'offline';
 */
export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    // Fallback jika di luar provider (return safe defaults)
    return {
      online: true,
      speed: 'checking',
      latency: null,
      effectiveType: null,
      downlink: null,
      rtt: null,
      saveData: false,
    };
  }
  return context;
}
