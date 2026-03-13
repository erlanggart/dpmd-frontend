import { useNetworkStatus } from '../../hooks/useNetworkStatus';

/**
 * Komponen indikator jaringan - titik warna saja di pojok kanan atas.
 * Hijau (bagus), orange (sedang), merah (lemah/offline), pulse jika bermasalah.
 */
const NetworkStatusIndicator = () => {
  const network = useNetworkStatus();

  const getConfig = () => {
    switch (network.speed) {
      case 'fast':
        return { color: 'bg-green-500', label: 'Bagus', pulse: false };
      case 'medium':
        return { color: 'bg-orange-500', label: 'Sedang', pulse: false };
      case 'slow':
        return { color: 'bg-red-500', label: 'Lemah', pulse: true };
      case 'offline':
        return { color: 'bg-red-600', label: 'Offline', pulse: true };
      default:
        return { color: 'bg-gray-400', label: 'Memeriksa...', pulse: true };
    }
  };

  const config = getConfig();

  return (
    <div
      className="fixed top-4 right-4 z-[9999]"
      title={`Jaringan: ${config.label}${network.latency ? ` (${network.latency}ms)` : ''}`}
    >
      {/* Dot indicator only */}
      <div className="relative w-3 h-3">
        <div className={`w-3 h-3 rounded-full ${config.color} shadow-md`}></div>
        {config.pulse && (
          <div className={`absolute inset-0 w-3 h-3 rounded-full ${config.color} animate-ping opacity-75`}></div>
        )}
      </div>
    </div>
  );
};

export default NetworkStatusIndicator;
