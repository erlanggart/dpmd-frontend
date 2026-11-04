import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

// Halaman yang sedang dipakai penuh (game dengan joystick, rapat video): banner
// ditahan sampai pengguna keluar dari sana, karena memuat ulang akan memutus kegiatannya.
const HALAMAN_TANPA_BANNER = /^\/jelajah|meeting/i;

const UpdateNotificationModal = ({ isOpen, onUpdate, onDismiss }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    const styleId = 'update-banner-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes update-banner-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-update-banner-in { animation: update-banner-in 0.25s ease-out; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (!isOpen || HALAMAN_TANPA_BANNER.test(pathname)) return null;

  // Di bawah lg, naik di atas navigasi bawah (setinggi kira-kira 5 rem) tiap layout.
  // Pembungkus tidak menangkap klik; hanya kartunya yang bisa diklik.
  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] flex justify-center lg:bottom-6"
      style={{ zIndex: 99999 }}
    >
      <div
        role="status"
        aria-live="polite"
        className="animate-update-banner-in pointer-events-auto flex w-full max-w-md flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl ring-1 ring-white/10"
      >
        <RefreshCw className="h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
        <div className="min-w-0 flex-1 basis-44">
          <p className="m-0 text-sm font-bold leading-snug">Versi baru tersedia</p>
          <p className="m-0 text-xs leading-snug text-slate-300">Halaman dimuat ulang saat Anda menekan Update.</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
          >
            Nanti saja
          </button>
          <button
            type="button"
            onClick={onUpdate}
            className="rounded-xl bg-sky-500 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-400"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotificationModal;
