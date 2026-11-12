import { useLocation } from 'react-router-dom';
import { useNetwork } from '../../context/NetworkContext';

/**
 * Indikator jaringan di pojok kanan atas: batang sinyal ala ponsel (0–4) dan
 * kecepatan di sebelahnya.
 *
 * Jumlah batang dihitung dari latensi ping ke server, bukan dari
 * `navigator.connection` — yang terakhir hanya ada di Chrome/Edge/Android.
 * Kecepatan memakai `downlink` (Mbps) bila browser menyediakannya; di Safari
 * dan Firefox yang ditampilkan latensinya (ms).
 */

// Latensi (ms) -> jumlah batang menyala.
const hitungBatang = ({ speed, latency }) => {
  if (speed === 'offline') return 0;
  if (latency === null || latency === undefined) {
    // Belum ada ping: pakai tebakan dari Network Information API.
    return { fast: 4, medium: 2, slow: 1 }[speed] ?? 0;
  }
  if (latency < 100) return 4;
  if (latency < 200) return 3;
  if (latency < 400) return 2;
  return 1;
};

const WARNA = {
  4: { isi: 'bg-gradient-to-t from-emerald-600 to-emerald-400', titik: 'bg-emerald-500', teks: 'text-emerald-700', label: 'Sangat bagus' },
  3: { isi: 'bg-gradient-to-t from-emerald-600 to-emerald-400', titik: 'bg-emerald-500', teks: 'text-emerald-700', label: 'Bagus' },
  2: { isi: 'bg-gradient-to-t from-amber-500 to-amber-300', titik: 'bg-amber-500', teks: 'text-amber-700', label: 'Sedang' },
  1: { isi: 'bg-gradient-to-t from-rose-600 to-rose-400', titik: 'bg-rose-500', teks: 'text-rose-600', label: 'Lemah' },
  0: { isi: 'bg-gradient-to-t from-rose-600 to-rose-400', titik: 'bg-rose-500', teks: 'text-rose-600', label: 'Offline' },
};

const formatKecepatan = ({ speed, downlink, latency }) => {
  if (speed === 'offline') return 'Offline';
  if (downlink) {
    // Chrome membatasi perkiraan downlink di 10 Mbps.
    if (downlink >= 10) return '≥10 Mbps';
    return downlink < 1 ? `${Math.round(downlink * 1000)} Kbps` : `${downlink.toFixed(1)} Mbps`;
  }
  if (latency !== null && latency !== undefined) return `${latency} ms`;
  return '…';
};

const NetworkStatusIndicator = () => {
  const network = useNetwork();
  const { pathname } = useLocation();
  // game Jelajah di HP: layar untuk pemain, lencana ini menutupi baris HUD
  if (pathname.startsWith('/jelajah') && window.matchMedia?.('(pointer: coarse)').matches) return null;
  const memeriksa = network.speed === 'checking';
  const batang = hitungBatang(network);
  const warna = memeriksa
    ? { isi: 'bg-slate-400', titik: 'bg-slate-400', teks: 'text-slate-500', label: 'Memeriksa…' }
    : WARNA[batang];

  const rincian = [
    `Jaringan: ${warna.label}`,
    network.latency !== null && network.latency !== undefined ? `ping ${network.latency} ms` : null,
    network.downlink ? `±${network.downlink} Mbps` : null,
    network.effectiveType ? network.effectiveType.toUpperCase() : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      className="pointer-events-none fixed top-1.5 right-1.5 z-[9999] flex select-none items-center gap-1.5 rounded-full bg-white/75 py-1 pl-1.5 pr-2 shadow-[0_2px_12px_-3px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/[0.06] backdrop-blur-md"
      role="status"
      aria-label={rincian}
    >
      {/* Titik live: berdenyut selama terhubung, diam saat offline */}
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        {batang > 0 && !memeriksa && (
          <span className={`absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping ${warna.titik}`} />
        )}
        <span className={`relative h-1.5 w-1.5 rounded-full ${warna.titik}`} />
      </span>

      {/* Batang sinyal: tinggi & warna berganti halus; saat memeriksa bergelombang berurutan */}
      <div className="relative flex h-3 items-end gap-[2px]" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`w-[3px] rounded-full transition-all duration-500 ease-out ${
              !memeriksa && i <= batang ? warna.isi : 'bg-slate-300/80'
            } ${memeriksa ? 'motion-safe:animate-pulse' : ''}`}
            style={{ height: `${i * 25}%`, animationDelay: memeriksa ? `${i * 120}ms` : undefined }}
          />
        ))}
        {batang === 0 && !memeriksa && (
          // Tanda silang kecil saat offline, seperti di ponsel
          <span className="absolute -right-1 -top-1 text-[9px] font-bold leading-none text-rose-600">×</span>
        )}
      </div>
      <span className={`text-[10px] font-semibold leading-none tracking-tight tabular-nums transition-colors duration-500 ${warna.teks}`}>
        {formatKecepatan(network)}
      </span>
    </div>
  );
};

export default NetworkStatusIndicator;
