// src/components/mobile/SectionHeader.jsx
import React from 'react';
import { ChevronRight, Zap } from 'lucide-react';

/**
 * SectionHeader - Modern Clean Section Header
 * Header dengan icon accent dan typography yang lebih baik
 */
const SectionHeader = ({ 
 
  actionText = "Lihat Semua",
  onActionClick,
  icon: Icon
}) => {
  return (
    <div className="flex items-center justify-between mb-5">
   
      
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
