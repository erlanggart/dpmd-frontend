// src/components/mobile/ActivityCard.jsx
import React from 'react';
import { Clock } from 'lucide-react';

/**
 * ActivityCard - GoJek Style Activity/Item Card
 * Card untuk menampilkan list item atau activity recent
 */
const ActivityCard = ({ 
  title, 
  subtitle,
  time,
  icon: Icon,
  status,
  onClick,
  badge,
  rightContent
}) => {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-orange-100 text-orange-800 border-orange-200",
    error: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200"
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 border border-gray-200 ${onClick ? 'cursor-pointer hover:shadow-md active:scale-98' : ''} transition-all duration-200`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {Icon && (
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-gray-700" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{title}</h4>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{subtitle}</p>
              )}
            </div>
            
            {/* Badge */}
            {badge && (
              <div className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                {badge}
              </div>
            )}
          </div>

          {/* Time and Status Row */}
          <div className="flex items-center gap-2 mt-2">
            {time && (
              <div className="flex items-center gap-1 text-gray-400">
                <Clock className="w-3 h-3" />
                <span className="text-xs">{time}</span>
              </div>
            )}
            
            {status && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[status] || statusColors.info}`}>
                {status}
              </span>
            )}
            
            {rightContent && (
              <div className="ml-auto">
                {rightContent}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;
