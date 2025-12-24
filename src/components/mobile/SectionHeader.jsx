// src/components/mobile/SectionHeader.jsx
import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * SectionHeader - GoJek Style Section Header
 * Header untuk section dengan title dan optional action button
 */
const SectionHeader = ({ 
  title, 
  subtitle,
  actionText = "Lihat Semua",
  onActionClick,
  icon: Icon
}) => {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-gray-700" />
          </div>
        )}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
      
      {onActionClick && (
        <button
          onClick={onActionClick}
          className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 active:scale-95 transition-all"
        >
          <span>{actionText}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SectionHeader;
