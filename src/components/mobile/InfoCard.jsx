// src/components/mobile/InfoCard.jsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * InfoCard - GoJek Style Info/Stats Card
 * Card untuk menampilkan informasi atau statistik
 */
const InfoCard = ({ 
  icon: Icon, 
  title, 
  value, 
  subtitle,
  trend,
  trendValue,
  color = "blue",
  onClick,
  badge
}) => {
  const colorVariants = {
    blue: {
      bg: "bg-blue-50",
      icon: "bg-blue-500",
      text: "text-blue-600",
      border: "border-blue-200"
    },
    green: {
      bg: "bg-green-50",
      icon: "bg-green-500",
      text: "text-green-600",
      border: "border-green-200"
    },
    purple: {
      bg: "bg-purple-50",
      icon: "bg-purple-500",
      text: "text-purple-600",
      border: "border-purple-200"
    },
    orange: {
      bg: "bg-orange-50",
      icon: "bg-orange-500",
      text: "text-orange-600",
      border: "border-orange-200"
    },
    red: {
      bg: "bg-red-50",
      icon: "bg-red-500",
      text: "text-red-600",
      border: "border-red-200"
    },
    yellow: {
      bg: "bg-yellow-50",
      icon: "bg-yellow-500",
      text: "text-yellow-600",
      border: "border-yellow-200"
    },
    indigo: {
      bg: "bg-indigo-50",
      icon: "bg-indigo-500",
      text: "text-indigo-600",
      border: "border-indigo-200"
    }
  };

  const colors = colorVariants[color] || colorVariants.blue;

  return (
    <div 
      onClick={onClick}
      className={`relative ${colors.bg} rounded-2xl p-4 border-2 ${colors.border} ${onClick ? 'cursor-pointer hover:shadow-lg active:scale-98' : ''} transition-all duration-200`}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-2 shadow-md">
          {badge}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <p className="text-gray-600 text-xs font-medium mb-1">{title}</p>
          
          {/* Value */}
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</h3>
            
            {/* Trend */}
            {trend && (
              <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-xs font-semibold">{trendValue}</span>
              </div>
            )}
          </div>
          
          {/* Subtitle */}
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div className={`${colors.icon} rounded-xl p-3 shadow-sm`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoCard;
