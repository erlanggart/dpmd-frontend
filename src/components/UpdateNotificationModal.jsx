import React from 'react';
import { RefreshCw, X } from 'lucide-react';

const UpdateNotificationModal = ({ isOpen, onUpdate, onDismiss }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onDismiss}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Pembaruan Tersedia</h3>
                <p className="text-blue-100 text-sm mt-1">Versi terbaru aplikasi telah tersedia</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                Versi terbaru aplikasi <strong>DPMD Kabupaten Bogor</strong> telah tersedia dengan 
                perbaikan dan fitur baru. Untuk pengalaman terbaik, silakan perbarui sekarang.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <div className="text-amber-600 mt-0.5">ℹ️</div>
              <p className="text-amber-800 text-xs leading-relaxed">
                Proses pembaruan akan me-refresh aplikasi dan menerapkan semua perubahan terbaru.
                Data login Anda akan tetap tersimpan.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Nanti Saja
            </button>
            <button
              onClick={onUpdate}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Perbarui Sekarang
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Pembaruan memastikan Anda mendapatkan fitur dan perbaikan terbaru
          </p>
        </div>
      </div>
    </div>
  );
};

// Animation keyframes (add to your global CSS or Tailwind config)
const styles = `
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}
`;

export default UpdateNotificationModal;
