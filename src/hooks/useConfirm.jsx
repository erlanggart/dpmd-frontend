import { useState, useCallback, useEffect } from 'react';

const ICON_MAP = {
  warning: (
    <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  danger: (
    <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  ),
  info: (
    <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
};

const THEME = {
  warning: {
    iconBg: 'bg-amber-50',
    iconRing: 'ring-amber-100',
    confirmBtn: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-300',
  },
  danger: {
    iconBg: 'bg-red-50',
    iconRing: 'ring-red-100',
    confirmBtn: 'bg-red-500 hover:bg-red-600 focus:ring-red-300',
  },
  info: {
    iconBg: 'bg-blue-50',
    iconRing: 'ring-blue-100',
    confirmBtn: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300',
  },
};

/**
 * useConfirm Hook
 * Custom hook untuk confirmation dialog yang menggantikan window.confirm()
 */
export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
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
    requestAnimationFrame(() => setAnimating(true));

    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const close = useCallback((result) => {
    setAnimating(false);
    setTimeout(() => {
      if (resolvePromise) resolvePromise(result);
      setIsOpen(false);
      setResolvePromise(null);
    }, 200);
  }, [resolvePromise]);

  const handleConfirm = useCallback(() => close(true), [close]);
  const handleCancel = useCallback(() => close(false), [close]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleCancel]);

  const theme = THEME[config.type] || THEME.warning;
  const icon = ICON_MAP[config.type] || ICON_MAP.warning;

  const confirmDialog = isOpen ? (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-200 ${
        animating ? 'bg-black/40 backdrop-blur-[2px]' : 'bg-black/0'
      }`}
      onClick={handleCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] max-w-[360px] w-full overflow-hidden transition-all duration-200 ${
          animating ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2'
        }`}
      >
        {/* Content */}
        <div className="px-6 pt-7 pb-2 text-center">
          <div className={`w-14 h-14 rounded-full ${theme.iconBg} ring-8 ${theme.iconRing} flex items-center justify-center mx-auto mb-4`}>
            {icon}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1.5">
            {config.title}
          </h3>
          <p className="text-[13.5px] text-gray-500 leading-relaxed">
            {config.message}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-5 flex gap-3">
          {config.showCancel && (
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 active:scale-[0.97] transition-all focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              {config.cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-semibold active:scale-[0.97] transition-all focus:outline-none focus:ring-2 ${theme.confirmBtn}`}
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
