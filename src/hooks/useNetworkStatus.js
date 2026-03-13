import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook untuk memantau kondisi dan kecepatan jaringan secara real-time.
 * Menggunakan Navigator.onLine + Network Information API + latency ping.
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState(() => ({
    online: navigator.onLine,
    effectiveType: navigator.connection?.effectiveType || null, // '4g', '3g', '2g', 'slow-2g'
    downlink: navigator.connection?.downlink || null, // Mbps
    rtt: navigator.connection?.rtt || null, // ms round-trip time
    saveData: navigator.connection?.saveData || false,
    latency: null, // ms - actual ping ke server
    speed: 'checking', // 'fast' | 'medium' | 'slow' | 'offline' | 'checking'
  }));

  const pingIntervalRef = useRef(null);
  const mountedRef = useRef(true);

  // Determine speed label from latency & connection info
  const getSpeedLabel = useCallback((latency, effectiveType, online) => {
    if (!online) return 'offline';
    if (latency === null && !effectiveType) return 'checking';

    // Prioritas: gunakan latency aktual jika ada
    if (latency !== null) {
      if (latency < 150) return 'fast';
      if (latency < 400) return 'medium';
      return 'slow';
    }

    // Fallback ke Network Information API
    if (effectiveType === '4g') return 'fast';
    if (effectiveType === '3g') return 'medium';
    return 'slow';
  }, []);

  // Ping server untuk mengukur latency
  const measureLatency = useCallback(async () => {
    if (!navigator.onLine) {
      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          online: false,
          latency: null,
          speed: 'offline',
        }));
      }
      return;
    }

    try {
      const start = performance.now();
      // Ping ke favicon atau endpoint kecil (cache-bust dengan timestamp)
      await fetch(`/robots.txt?_t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      const latency = Math.round(performance.now() - start);

      if (mountedRef.current) {
        const conn = navigator.connection;
        setStatus(prev => ({
          ...prev,
          online: true,
          latency,
          effectiveType: conn?.effectiveType || prev.effectiveType,
          downlink: conn?.downlink || prev.downlink,
          rtt: conn?.rtt || prev.rtt,
          speed: getSpeedLabel(latency, conn?.effectiveType, true),
        }));
      }
    } catch {
      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          latency: null,
          speed: navigator.onLine ? 'slow' : 'offline',
        }));
      }
    }
  }, [getSpeedLabel]);

  useEffect(() => {
    mountedRef.current = true;

    const handleOnline = () => {
      setStatus(prev => ({ ...prev, online: true, speed: 'checking' }));
      measureLatency();
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        online: false,
        latency: null,
        speed: 'offline',
      }));
    };

    const handleConnectionChange = () => {
      const conn = navigator.connection;
      if (conn && mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData,
        }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.connection) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    // Initial ping
    measureLatency();

    // Periodic ping setiap 30 detik
    pingIntervalRef.current = setInterval(measureLatency, 30000);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [measureLatency]);

  return status;
}
