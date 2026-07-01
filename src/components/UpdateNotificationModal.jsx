import React, { useEffect } from 'react';
import { RefreshCw, X, ShieldCheck } from 'lucide-react';
import OptimizedLottie from './OptimizedLottie';
import updateAnimation from '../assets/lottie/update.json';

const UpdateNotificationModal = ({ isOpen, onUpdate, onDismiss }) => {
  // Inject animation keyframes on mount
  useEffect(() => {
    const styleId = 'update-modal-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes update-scale-in {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-update-scale-in {
          animation: update-scale-in 0.3s ease-out;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="animate-update-scale-in relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Animasi Lottie */}
        <div className="flex justify-center bg-gradient-to-b from-blue-50 to-white pt-7">
          <OptimizedLottie animationData={updateAnimation} className="h-32 w-32" />
        </div>

        {/* Isi */}
        <div className="px-6 pb-6 pt-2 text-center">
          <h3 className="text-xl font-extrabold text-gray-900">
            Ada Update Baru! 🎉
          </h3>
          <p className="mx-auto mt-2 max-w-[19rem] text-sm leading-relaxed text-gray-500">
            Aplikasi <strong className="text-gray-700">DPMD Kabupaten Bogor</strong> makin
            kece nih — ada fitur baru &amp; perbaikan. Yuk update biar makin lancar!
          </p>

          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            Tenang, data login kamu tetap aman
          </span>

          {/* Tombol */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 rounded-2xl bg-gray-100 px-4 py-3.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300"
            >
              Nanti Aja
            </button>
            <button
              onClick={onUpdate}
              className="flex flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-600 hover:to-blue-700 active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" />
              Update Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotificationModal;
