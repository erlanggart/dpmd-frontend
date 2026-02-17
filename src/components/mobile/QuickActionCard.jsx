// src/components/mobile/QuickActionCard.jsx
import React from 'react';

/**
 * QuickActionCard - Modern Rounded Style Quick Action Button
 * Elegant card dengan rounded design dan smooth animations
 */
const QuickActionCard = ({ 
  icon: Icon, 
  label, 
  badge, 
  onClick, 
  color = "blue",
  gradient = "from-blue-500 to-blue-600"
}) => {
  
  const colorVariants = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
    indigo: "from-indigo-500 to-indigo-600",
    pink: "from-pink-500 to-pink-600",
    teal: "from-teal-500 to-teal-600",
    yellow: "from-yellow-500 to-yellow-600",
    cyan: "from-cyan-500 to-cyan-600"
  };

  const selectedGradient = colorVariants[color] || gradient;

  return (
    <div 
      onClick={onClick}
      className="relative flex flex-col items-center cursor-pointer group active:scale-95 transition-all duration-200"
    >
      {/* Icon Container with Modern Rounded Design */}
      <div className={`
        relative w-12 h-12 sm:w-14 sm:h-14 lg:w-20 lg:h-20 flex-shrink-0
        bg-gradient-to-br ${selectedGradient} 
        rounded-[20px] sm:rounded-[24px] lg:rounded-[32px]
        shadow-lg shadow-${color}-500/30
        group-hover:shadow-xl group-hover:shadow-${color}-500/40
        transition-all duration-300
        group-hover:scale-105
        flex items-center justify-center 
        overflow-hidden
      `}>
        {/* Subtle Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {Icon && <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-10 lg:h-10 text-white relative z-10 drop-shadow-md" />}
        
        {/* Badge */}
        {badge && (
          <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 bg-red-500 text-white text-[9px] lg:text-[10px] font-bold rounded-full min-w-[18px] h-[18px] lg:min-w-[22px] lg:h-[22px] flex items-center justify-center px-1 lg:px-1.5 shadow-lg ring-2 ring-white">
            {badge > 99 ? '99+' : badge}
          </div>
        )}
      </div>
      
      {/* Label - fixed height container for alignment */}
      <div className="mt-2 lg:mt-3 h-8 flex items-start justify-center">
        <p className="text-[10px] sm:text-xs lg:text-sm text-slate-700 lg:text-slate-800 font-semibold text-center max-w-[70px] lg:max-w-[85px] leading-tight lg:leading-snug">
          {label}
        </p>
      </div>
    </div>
  );
};

export default QuickActionCard;
