import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  FiLogOut,
  FiMenu,
  FiSettings,
  FiX,
  FiUser,
} from "react-icons/fi";
import { ChevronLeft, Menu } from "lucide-react";

import { LuStore, LuFileText, LuUsers, LuUserCheck, LuWallpaper, LuLayoutDashboard, LuLandmark, LuBanknote, LuPanelLeftClose, LuPanelLeft, LuDatabase } from "react-icons/lu";
import AnimatedIcon from "../components/AnimatedIcon";
import InstallPWA from "../components/InstallPWA";

// Menu items configuration
const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/desa/dashboard",
    icon: "dashboard",
    color: "text-blue-600",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    id: "profil-desa",
    label: "Profil Desa",
    path: "/desa/profil-desa",
    icon: "image",
    color: "text-emerald-600",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "produk-hukum",
    label: "Produk Hukum",
    path: "/desa/produk-hukum",
    icon: "file",
    color: "text-amber-600",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "bumdes",
    label: "BUMDES",
    path: "/desa/bumdes",
    icon: "store",
    color: "text-purple-600",
    gradient: "from-purple-500 to-indigo-600",
  },
  {
    id: "kelembagaan",
    label: "Kelembagaan",
    path: "/desa/kelembagaan",
    icon: "landmark",
    color: "text-cyan-600",
    gradient: "from-cyan-500 to-teal-600",
  },
  {
    id: "aparatur-desa",
    label: "Aparatur Desa",
    path: "/desa/aparatur-desa",
    icon: "users",
    color: "text-teal-600",
    gradient: "from-teal-500 to-emerald-600",
  },
  {
    id: "bankeu",
    label: "Bantuan Keuangan",
    path: "/desa/bankeu",
    icon: "banknote",
    color: "text-rose-600",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    id: "pesan",
    label: "Pesan",
    path: "/desa/pesan",
    icon: "mail",
    color: "text-indigo-600",
    gradient: "from-indigo-500 to-purple-600",
  },
];

// Responsive hook
const useResponsive = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isDesktop, isSidebarCollapsed, setIsSidebarCollapsed };
};

const DesaLayout = () => {
  const { logout } = useAuth();
  const user = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDesktop, isSidebarCollapsed, setIsSidebarCollapsed } = useResponsive();
  const [showMenu, setShowMenu] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const handleSettings = () => {
    navigate("/desa/settings");
  };

  // Bottom nav items for mobile
  const bottomNavItems = [
    { label: "Menu", icon: "menu", action: "menu" },
    { path: "/desa/dashboard", label: "Dashboard", icon: "dashboard", isMain: true },
    { path: "/desa/settings", label: "Pengaturan", icon: "settings" },
  ];

  // Sidebar items = menu + settings + profile
  const sidebarNavItems = [
    ...menuItems,
    { id: "settings", label: "Pengaturan", path: "/desa/settings", icon: "settings", color: "text-gray-600", gradient: "from-gray-500 to-slate-600" },
  ];

  const desaLabel = user?.desa?.status_pemerintahan === "desa" ? "Desa" : "Kelurahan";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Desktop Sidebar */}
      {isDesktop && (
        <aside
          className={`fixed top-0 left-0 h-full bg-white shadow-2xl z-40 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-r border-gray-100 ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Gradient Accent Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-600"></div>

          {/* Sidebar Header */}
          <div className="relative p-4 h-20 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-emerald-50 to-green-100">
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-center flex-1">
                <img
                  src="/logo-dpmd.png"
                  alt="DPMD Logo"
                  className="h-20 transition-opacity duration-300"
                />
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-2 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors duration-200 flex-shrink-0 group ${!isSidebarCollapsed ? '' : 'mx-auto'}`}
              aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            >
              {!isSidebarCollapsed ? (
                <ChevronLeft className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition-transform" />
              ) : (
                <Menu className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="relative p-3 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent" style={{ height: 'calc(100vh - 280px)' }}>
            {sidebarNavItems.map((item, index) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

              return (
                <button
                  key={index}
                  onClick={() => navigate(item.path)}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`group relative w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-md`
                      : `${item.color} hover:bg-gradient-to-r ${item.gradient} hover:text-white hover:shadow-md`
                  }`}
                  title={isSidebarCollapsed ? item.label : ''}
                >
                  <div className={`relative ${isSidebarCollapsed ? 'mx-auto' : 'flex-shrink-0'}`}>
                    <AnimatedIcon
                      type={item.icon}
                      isActive={isActive}
                      isHovered={hoveredItem === item.label}
                      className="w-5 h-5"
                    />
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="relative font-semibold truncate text-sm">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout at bottom */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100">
            {/* User Profile Section */}
            <div className="p-3 border-b border-gray-100">
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <div className={`${isSidebarCollapsed ? 'h-12 w-12' : 'h-10 w-10'} bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-md`}>
                  <span className="text-white font-bold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm truncate">{user?.name}</h3>
                    <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium mt-1">
                      {desaLabel} {user?.desa?.nama}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <div className="p-3">
              <button
                onClick={handleLogout}
                className={`group relative w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 text-red-600 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:text-white hover:shadow-md`}
                title={isSidebarCollapsed ? 'Keluar' : ''}
              >
                <div className={`relative ${isSidebarCollapsed ? 'mx-auto' : 'flex-shrink-0'}`}>
                  <FiLogOut className="h-5 w-5" />
                </div>
                {!isSidebarCollapsed && (
                  <span className="relative font-semibold text-sm">Keluar</span>
                )}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          isDesktop
            ? isSidebarCollapsed ? 'ml-20' : 'ml-64'
            : 'pb-20'
        }`}
      >
        <div className="p-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      {!isDesktop && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-emerald-200 shadow-lg z-50">
          <div className="max-w-lg mx-auto px-4">
            <div className="flex items-end justify-around py-2">
              {bottomNavItems.map((item, index) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

                if (item.isMain) {
                  return (
                    <button
                      key={index}
                      onClick={() => navigate(item.path)}
                      className="relative flex flex-col items-center -mt-5"
                    >
                      <div className={`flex items-center justify-center h-14 w-14 rounded-full shadow-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white scale-110'
                          : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:scale-105'
                      }`}>
                        <AnimatedIcon type={item.icon} isActive={isActive} className="w-7 h-7" />
                      </div>
                      <span className={`text-[11px] mt-1 font-semibold ${
                        isActive ? 'text-emerald-700' : 'text-gray-500'
                      }`}>{item.label}</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (item.action === "menu") {
                        setShowMenu(true);
                      } else {
                        navigate(item.path);
                      }
                    }}
                    className={`relative flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'text-emerald-700'
                        : 'text-gray-400 hover:text-emerald-600'
                    }`}
                  >
                    <AnimatedIcon type={item.icon} isActive={isActive} className="w-6 h-6" />
                    <span className={`text-[11px] mt-1 font-medium ${
                      isActive ? 'text-emerald-700' : 'text-gray-400'
                    }`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* Menu Modal - Mobile Only */}
      {showMenu && !isDesktop && (
        <>
          <div
            className="fixed inset-0 bg-black/75 z-50 animate-fadeIn"
            onClick={() => setShowMenu(false)}
          ></div>
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 animate-slideUp">
            <div className="max-w-lg mx-auto">
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>

              {/* Menu Header */}
              <div className="px-6 py-4 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-xl">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg">{user?.name}</h3>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      {desaLabel} {user?.desa?.nama}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="px-6 py-4 space-y-2 max-h-96 overflow-y-auto">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setShowMenu(false);
                      navigate(item.path);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-emerald-50 transition-colors text-left"
                  >
                    <div className={`h-12 w-12 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center`}>
                      <AnimatedIcon type={item.icon} isActive={false} className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{item.label}</h4>
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleSettings();
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="h-12 w-12 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl flex items-center justify-center">
                    <FiSettings className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Pengaturan</h4>
                  </div>
                </button>

                <div className="border-t border-gray-200 my-2"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-50 transition-colors text-left"
                >
                  <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <FiLogOut className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-600">Keluar</h4>
                    <p className="text-sm text-gray-500">Logout dari sistem</p>
                  </div>
                </button>
              </div>

              {/* Close Button */}
              <div className="px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default DesaLayout;
