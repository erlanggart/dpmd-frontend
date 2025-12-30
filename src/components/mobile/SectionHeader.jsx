// src/components/mobile/SectionHeader.jsx
import React from 'react';
import { ChevronRight, Zap } from 'lucide-react';

/**
 * SectionHeader - Modern Clean Section Header
 * Header dengan icon accent dan typography yang lebih baik
 */
const SectionHeader = ({ 
  title, 
  subtitle,
  actionText = "Lihat Semua",
  onActionClick,
  icon: Icon
}) => {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[18px] flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">{title}</h3>
            <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>
      </div>
      
      {onActionClick && (
        <button
          onClick={onActionClick}
          className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 active:scale-95 transition-all"
        >
          <span>{actionText}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SectionHeader;
