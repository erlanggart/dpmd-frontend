import React, { useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

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
      
      {/* Modal - touch-friendly sizing */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-update-scale-in mx-4">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5 sm:p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold">Pembaruan Tersedia</h3>
                <p className="text-blue-100 text-sm mt-1">Versi terbaru aplikasi telah tersedia</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                Versi terbaru aplikasi <strong>DPMD Kabupaten Bogor</strong> telah tersedia dengan 
                perbaikan dan fitur baru. Untuk pengalaman terbaik, silakan perbarui sekarang.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <div className="text-amber-600 mt-0.5 text-base">ℹ️</div>
              <p className="text-amber-800 text-xs leading-relaxed">
                Proses pembaruan akan me-refresh aplikasi dan menerapkan semua perubahan terbaru.
                Data login Anda akan tetap tersimpan.
              </p>
            </div>
          </div>

          {/* Actions - large touch targets for tablet */}
          <div className="mt-5 flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-3.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors text-sm sm:text-base min-h-[48px]"
            >
              Nanti Saja
            </button>
            <button
              onClick={onUpdate}
              className="flex-1 px-4 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base min-h-[48px]"
            >
              <RefreshCw className="w-5 h-5" />
              Perbarui Sekarang
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-gray-50 px-5 sm:px-6 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Pembaruan memastikan Anda mendapatkan fitur dan perbaikan terbaru
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotificationModal;
