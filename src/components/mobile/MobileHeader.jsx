// src/components/mobile/MobileHeader.jsx
import React from 'react';
import { Bell } from 'lucide-react';

/**
 * MobileHeader - GoJek Style Mobile Header
 * Header dengan gradient, user info, dan action buttons
 */
const MobileHeader = ({ 
  userName = "User", 
  userRole = "Role",
  greeting = "Selamat Datang",
  gradient = "from-green-600 via-green-700 to-green-800",
  notificationCount = 0,
  onNotificationClick,
  onSettingsClick,
  avatar
}) => {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-b-[32px] shadow-xl`}>
      {/* Safe area spacer for PWA standalone mode */}
      <div className="h-[env(safe-area-inset-top,0px)]"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white rounded-full flex items-center justify-center shadow-lg ring-4 ring-white/20 flex-shrink-0">
              {avatar ? (
                <img src={avatar} alt={userName} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="text-xl sm:text-2xl font-bold text-green-600">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs font-medium">{greeting}</p>
              <h2 className="text-white text-base sm:text-xl font-bold tracking-wide truncate">{userName}</h2>
              <p className="text-white/70 text-xs mt-0.5 truncate">{userRole}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification */}
            <button 
              onClick={onNotificationClick}
              className="relative h-10 w-10 sm:h-11 sm:w-11 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
            >
              <Bell className="h-5 w-5 text-white" />
              {notificationCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-md">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Date */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 sm:py-3">
          <p className="text-white/90 text-xs sm:text-sm font-medium text-center">
            {new Date().toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileHeader;
