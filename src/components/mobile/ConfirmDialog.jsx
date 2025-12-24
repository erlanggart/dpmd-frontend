// src/components/mobile/ConfirmDialog.jsx
import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

/**
 * ConfirmDialog - GoJek Style Confirmation Dialog
 * Custom dialog untuk menggantikan window.confirm() default browser
 */
const ConfirmDialog = ({ 
  isOpen = false,
  onClose,
  onConfirm,
  title = "Konfirmasi",
  message = "Apakah Anda yakin?",
  confirmText = "OK",
  cancelText = "Batal",
  type = "warning", // 'warning', 'danger', 'success', 'info'
  confirmColor = "blue",
  showCancel = true
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    warning: {
      icon: AlertCircle,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      gradient: "from-yellow-500 to-orange-500"
    },
    danger: {
      icon: XCircle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      gradient: "from-red-500 to-red-600"
    },
    success: {
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      gradient: "from-green-500 to-green-600"
    },
    info: {
      icon: Info,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      gradient: "from-blue-500 to-blue-600"
    }
  };

  const config = typeConfig[type] || typeConfig.warning;
  const IconComponent = config.icon;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Icon */}
          <div className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
            <IconComponent className={`w-10 h-10 ${config.iconColor}`} />
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {message}
          </p>

          {/* Action Buttons */}
          <div className={`flex gap-3 ${showCancel ? 'flex-row' : 'flex-col'}`}>
            {showCancel && (
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 active:scale-95 transition-all"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-3 bg-gradient-to-r ${config.gradient} text-white rounded-xl font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
