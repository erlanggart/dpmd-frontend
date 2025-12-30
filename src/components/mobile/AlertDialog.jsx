// src/components/mobile/AlertDialog.jsx
import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

/**
 * AlertDialog - GoJek Style Alert Dialog
 * Custom dialog untuk menggantikan window.alert() default browser
 */
const AlertDialog = ({ 
  isOpen = false,
  onClose,
  title = "Pemberitahuan",
  message = "",
  buttonText = "OK",
  type = "info" // 'info', 'success', 'warning', 'error'
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    info: {
      icon: Info,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      gradient: "from-blue-500 to-blue-600"
    },
    success: {
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      gradient: "from-green-500 to-green-600"
    },
    warning: {
      icon: AlertCircle,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      gradient: "from-yellow-500 to-orange-500"
    },
    error: {
      icon: XCircle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      gradient: "from-red-500 to-red-600"
    }
  };

  const config = typeConfig[type] || typeConfig.info;
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

          {/* OK Button */}
          <button
            onClick={onClose}
            className={`w-full px-6 py-3 bg-gradient-to-r ${config.gradient} text-white rounded-xl font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all`}
          >
            {buttonText}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

export default AlertDialog;
