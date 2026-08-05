import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { FiLogOut, FiSettings } from "react-icons/fi";
import { ChevronLeft, Menu } from "lucide-react";

import AnimatedIcon from "../components/AnimatedIcon";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import { useDesaPermissions } from "../hooks/useDesaPermissions";

// Menu items configuration.
// `permission` = key hak akses yang diberikan Admin Desa; menu tanpa `permission`
// selalu tampil (Dashboard & Pengaturan).
// `section` dipakai untuk mengelompokkan item di sidebar desktop.
const menuItems = [
  {
    id: "dashboard",
    section: "Utama",
    label: "Dashboard",
    path: "/desa/dashboard",
    icon: "dashboard",
  },
  {
    id: "profil-desa",
    section: "Data Desa",
    permission: "profil-desa",
    label: "Profil Desa",
    path: "/desa/profil-desa",
    icon: "image",
  },
  {
    id: "produk-hukum",
    section: "Data Desa",
    permission: "produk-hukum",
    label: "Produk Hukum",
    path: "/desa/produk-hukum",
    icon: "file",
  },
  {
    id: "aparatur-desa",
    section: "Data Desa",
    permission: "aparatur-desa",
    label: "Aparatur Desa",
    path: "/desa/aparatur-desa",
    icon: "users",
  },
  {
    id: "kelembagaan",
    section: "Data Desa",
    permission: "kelembagaan",
    label: "Kelembagaan",
    path: "/desa/kelembagaan",
    icon: "landmark",
  },
  {
    id: "bumdes",
    section: "Data Desa",
    permission: "bumdes",
    label: "BUMDES",
    path: "/desa/bumdes",
    icon: "store",
  },
  {
    id: "bankeu",
    section: "Bantuan Keuangan",
    permission: "bankeu",
    label: "Bantuan Keuangan",
    path: "/desa/bankeu",
    icon: "banknote",
  },
  {
    id: "bankeu-perubahan",
    section: "Bantuan Keuangan",
    permission: "bankeu-perubahan",
    label: "Bankeu Perubahan",
    path: "/desa/bankeu-perubahan",
    icon: "coins",
  },
  {
    id: "bantuan-provinsi-lpj",
    section: "Bantuan Keuangan",
    permission: "bantuan-provinsi-lpj",
    label: "LPJ Bantuan Provinsi",
    path: "/desa/bantuan-provinsi-lpj",
    icon: "wallet",
  },
  {
    id: "pesan",
    section: "Lainnya",
    permission: "pesan",
    label: "Pesan",
    path: "/desa/pesan",
    icon: "chatbot",
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
  const { unreadMessages } = useUnreadMessages('/desa/pesan');
  const { hasPermission } = useDesaPermissions();

  // Menu yang tidak diizinkan Admin Desa tidak ditampilkan sama sekali.
  const visibleMenuItems = menuItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

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
    ...visibleMenuItems,
    { id: "settings", section: "Lainnya", label: "Pengaturan", path: "/desa/settings", icon: "settings" },
  ];

  // Kelompokkan per section sambil mempertahankan urutan kemunculan.
  const sidebarSections = sidebarNavItems.reduce((sections, item) => {
    const name = item.section || "Lainnya";
    const existing = sections.find((section) => section.name === name);

    if (existing) {
      existing.items.push(item);
    } else {
      sections.push({ name, items: [item] });
    }

    return sections;
  }, []);

  const desaLabel = user?.desa?.status_pemerintahan === "desa" ? "Desa" : "Kelurahan";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      {isDesktop && (
        <aside
          className={`fixed top-0 left-0 z-40 flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Sidebar Header */}
          <div className={`flex h-16 flex-shrink-0 items-center border-b border-slate-200 px-3 ${isSidebarCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
            {!isSidebarCollapsed && (
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 p-1.5 ring-1 ring-brand-500/40">
                  <img
                    src="/logo-dpmd.png"
                    alt="Logo DPMD"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight text-slate-900">DPMD</p>
                  <p className="truncate text-[11px] leading-tight text-slate-400">Kabupaten Bogor</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="flex-shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label={isSidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}
            >
              {!isSidebarCollapsed ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {sidebarSections.map((section) => (
              <div key={section.name} className="space-y-1">
                {!isSidebarCollapsed && (
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
                    {section.name}
                  </p>
                )}
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      onMouseEnter={() => setHoveredItem(item.label)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`group relative flex w-full items-center overflow-hidden rounded-lg px-3 py-2.5 transition-colors duration-150 ${
                        isSidebarCollapsed ? 'justify-center' : 'gap-3'
                      } ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      title={isSidebarCollapsed ? item.label : ''}
                    >
                      {isActive && (
                        <span className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-brand-500" />
                      )}
                      <div className={`relative ${isSidebarCollapsed ? 'mx-auto' : 'flex-shrink-0'}`}>
                        <AnimatedIcon
                          type={item.icon}
                          isActive={isActive}
                          isHovered={hoveredItem === item.label}
                          className="w-5 h-5"
                        />
                        {item.id === 'pesan' && unreadMessages > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold leading-none text-white">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="truncate text-sm font-medium">{item.label}</span>
                      )}
                      {!isSidebarCollapsed && item.id === 'pesan' && unreadMessages > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User Profile & Logout at bottom */}
          <div className="flex-shrink-0 border-t border-slate-200 p-3">
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 ring-1 ring-brand-500/40">
                <span className="text-sm font-semibold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-slate-900">{user?.name}</h3>
                  <p className="truncate text-xs text-slate-500">
                    {desaLabel} {user?.desa?.nama}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className={`mt-3 flex w-full items-center rounded-lg px-3 py-2.5 text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 ${
                isSidebarCollapsed ? 'justify-center' : 'gap-3'
              }`}
              title={isSidebarCollapsed ? 'Keluar' : ''}
            >
              <FiLogOut className="h-5 w-5 flex-shrink-0" />
              {!isSidebarCollapsed && <span className="text-sm font-medium">Keluar</span>}
            </button>
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
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      {!isDesktop && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
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
                      <div className={`flex items-center justify-center h-14 w-14 rounded-full bg-slate-900 text-white shadow-lg transition-transform duration-200 ${
                        isActive ? 'scale-110' : 'hover:scale-105'
                      }`}>
                        <AnimatedIcon type={item.icon} isActive={isActive} className="w-7 h-7" />
                      </div>
                      <span className={`text-[11px] mt-1 font-semibold ${
                        isActive ? 'text-slate-900' : 'text-slate-500'
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
                        ? 'text-slate-900'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                      <div className="relative">
                        <AnimatedIcon type={item.icon} isActive={isActive} className="w-6 h-6" />
                        {item.action === 'menu' && unreadMessages > 0 && (
                          <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white leading-none">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
                      </div>
                    <span className={`text-[11px] mt-1 font-medium ${
                      isActive ? 'text-slate-900' : 'text-slate-400'
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
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
              </div>

              {/* Menu Header */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900">
                    <span className="text-lg font-semibold text-white">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-slate-900">{user?.name}</h3>
                    <p className="truncate text-sm text-slate-500">{user?.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {desaLabel} {user?.desa?.nama}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="max-h-96 space-y-1 overflow-y-auto px-5 py-4">
                {visibleMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setShowMenu(false);
                      navigate(item.path);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <AnimatedIcon type={item.icon} isActive={false} className="w-5 h-5" />
                      {item.id === 'pesan' && unreadMessages > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-slate-900">{item.label}</h4>
                    </div>
                    {item.id === 'pesan' && unreadMessages > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </button>
                ))}

                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleSettings();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <FiSettings className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-medium text-slate-900">Pengaturan</h4>
                </button>

                <div className="my-2 border-t border-slate-100"></div>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-rose-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                    <FiLogOut className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-rose-600">Keluar</h4>
                    <p className="text-xs text-slate-500">Logout dari sistem</p>
                  </div>
                </button>
              </div>

              {/* Close Button */}
              <div className="border-t border-slate-100 px-5 py-4">
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full rounded-lg bg-slate-100 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
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
