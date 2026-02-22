import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { LuWifi, LuWifiOff, LuSignal, LuTriangleAlert } from 'react-icons/lu';
import { useState } from 'react';

/**
 * Komponen indikator jaringan yang ditampilkan di pojok kanan bawah.
 * 3 warna: hijau (bagus), orange (sedang), merah (lemah/offline)
 */
const NetworkStatusIndicator = () => {
  const network = useNetworkStatus();
  const [expanded, setExpanded] = useState(false);

  const getConfig = () => {
    switch (network.speed) {
      case 'fast':
        return {
          color: 'bg-green-500',
          border: 'border-green-400',
          text: 'text-green-700',
          bg: 'bg-green-50',
          ringColor: 'ring-green-400/30',
          label: 'Bagus',
          icon: LuWifi,
          pulse: false,
        };
      case 'medium':
        return {
          color: 'bg-orange-500',
          border: 'border-orange-400',
          text: 'text-orange-700',
          bg: 'bg-orange-50',
          ringColor: 'ring-orange-400/30',
          label: 'Sedang',
          icon: LuSignal,
          pulse: false,
        };
      case 'slow':
        return {
          color: 'bg-red-500',
          border: 'border-red-400',
          text: 'text-red-700',
          bg: 'bg-red-50',
          ringColor: 'ring-red-400/30',
          label: 'Lemah',
          icon: LuTriangleAlert,
          pulse: true,
        };
      case 'offline':
        return {
          color: 'bg-red-600',
          border: 'border-red-500',
          text: 'text-red-800',
          bg: 'bg-red-100',
          ringColor: 'ring-red-500/30',
          label: 'Offline',
          icon: LuWifiOff,
          pulse: true,
        };
      default: // checking
        return {
          color: 'bg-gray-400',
          border: 'border-gray-300',
          text: 'text-gray-600',
          bg: 'bg-gray-50',
          ringColor: 'ring-gray-300/30',
          label: 'Memeriksa...',
          icon: LuWifi,
          pulse: true,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {/* Expanded Detail Panel */}
      {expanded && (
        <div 
          className={`mb-2 ${config.bg} border ${config.border} rounded-xl shadow-lg p-3 min-w-[200px] animate-in fade-in slide-in-from-bottom-2`}
          onClick={() => setExpanded(false)}
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-4 h-4 ${config.text}`} />
            <span className={`text-sm font-bold ${config.text}`}>
              Jaringan {config.label}
            </span>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            {network.latency !== null && (
              <div className="flex justify-between">
                <span>Latency</span>
                <span className="font-semibold">{network.latency}ms</span>
              </div>
            )}
            {network.effectiveType && (
              <div className="flex justify-between">
                <span>Tipe</span>
                <span className="font-semibold uppercase">{network.effectiveType}</span>
              </div>
            )}
            {network.downlink && (
              <div className="flex justify-between">
                <span>Kecepatan</span>
                <span className="font-semibold">{network.downlink} Mbps</span>
              </div>
            )}
            {(network.speed === 'slow' || network.speed === 'offline') && (
              <div className="mt-2 pt-2 border-t border-red-200">
                <p className="text-red-600 font-semibold text-[10px]">
                  ⚠️ Pengiriman data dinonaktifkan saat jaringan lemah
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact Badge */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border ${config.border} ${config.bg} ring-2 ${config.ringColor} transition-all duration-300 hover:scale-105 active:scale-95`}
        title={`Jaringan: ${config.label}${network.latency ? ` (${network.latency}ms)` : ''}`}
      >
        <div className="relative">
          <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
          {config.pulse && (
            <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.color} animate-ping opacity-75`}></div>
          )}
        </div>
        <span className={`text-xs font-bold ${config.text} hidden sm:inline`}>
          {config.label}
        </span>
        {network.latency !== null && (
          <span className={`text-[10px] ${config.text} opacity-75 hidden sm:inline`}>
            {network.latency}ms
          </span>
        )}
      </button>
    </div>
  );
};

export default NetworkStatusIndicator;
