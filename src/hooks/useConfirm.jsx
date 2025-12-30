import { useState, useCallback } from 'react';

/**
 * useConfirm Hook
 * Custom hook untuk confirmation dialog yang menggantikan window.confirm()
 */
export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({});
  const [resolvePromise, setResolvePromise] = useState(null);

  const showConfirm = useCallback((options = {}) => {
    const dialogConfig = {
      title: options.title || 'Konfirmasi',
      message: options.message || 'Apakah Anda yakin?',
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Batal',
      type: options.type || 'warning',
      showCancel: options.showCancel !== false
    };

    setConfig(dialogConfig);
    setIsOpen(true);

    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(true);
    }
    setIsOpen(false);
    setResolvePromise(null);
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(false);
    }
    setIsOpen(false);
    setResolvePromise(null);
  }, [resolvePromise]);

  const confirmDialog = isOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
          {config.title}
        </h3>
        <p className="text-gray-600 text-sm text-center mb-6">
          {config.message}
        </p>
        <div className="flex gap-3">
          {config.showCancel && (
            <button
              onClick={handleCancel}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
            >
              {config.cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg"
          >
            {config.confirmText}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { 
    confirmDialog, 
    showConfirm, 
    isConfirmOpen: isOpen 
  };
};

export default useConfirm;
