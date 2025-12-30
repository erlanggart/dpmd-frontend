// src/components/mobile/QuickActionCard.jsx
import React from 'react';

/**
 * QuickActionCard - GoJek Style Quick Action Button
 * Mobile-first card untuk quick actions di dashboard
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
      className="relative flex flex-col items-center justify-center cursor-pointer group active:scale-95 transition-transform duration-150"
    >
      {/* Icon Container with Gradient */}
      <div className={`relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${selectedGradient} rounded-2xl shadow-md group-hover:shadow-lg transition-all group-hover:scale-110 flex items-center justify-center mb-2 overflow-hidden`}>
        {Icon && <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
        
        {/* Badge */}
        {badge && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-md">
            {badge > 99 ? '99+' : badge}
          </div>
        )}
      </div>
      
      {/* Label */}
      <p className="text-xs sm:text-sm text-gray-700 font-medium text-center max-w-[80px] leading-tight">
        {label}
      </p>
    </div>
  );
};

export default QuickActionCard;
