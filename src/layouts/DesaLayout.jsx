import React, { useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  FiLogOut,
  FiMenu,
  FiSettings,
  FiX,
} from "react-icons/fi";

import { LuStore, LuFileText, LuUsers, LuUserCheck, LuWallpaper, LuLayoutDashboard, LuLandmark, LuBanknote, LuPanelLeftClose, LuPanelLeft } from "react-icons/lu";
import Footer from "../components/landingpage/Footer";
import InstallPWA from "../components/InstallPWA";

// Menu items configuration
const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/desa/dashboard",
    icon: LuLayoutDashboard,
  },
  {
    id: "profil-desa",
    label: "Profil Desa",
    path: "/desa/profil-desa",
    icon: LuWallpaper,
  },
  {
    id: "aparatur-desa",
    label: "Aparatur Desa",
    path: "/desa/aparatur-desa",
    icon: LuUserCheck,
  },
  {
    id: "produk-hukum",
    label: "Produk Hukum",
    path: "/desa/produk-hukum",
    icon: LuFileText,
  },
  {
    id: "bumdes",
    label: "BUMDES",
    path: "/desa/bumdes",
    icon: LuStore,
  },
  {
    id: "kelembagaan",
    label: "Kelembagaan",
    path: "/desa/kelembagaan",
    icon: LuLandmark,
  },
  {
    id: "bankeu",
    label: "Bantuan Keuangan",
    path: "/desa/bankeu",
    icon: LuBanknote,
  },
];

const DesaLayout = () => {
  const { logout } = useAuth();
  const user = useUserProfile();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const handleSettings = () => {
    navigate("/desa/settings");
  };

  const baseLinkClass = "flex items-center p-2 rounded-lg relative";
  const activeLinkClass = "text-blue-600 font-semibold border-r-4 border-blue-600";
  const inactiveLinkClass = "hover:bg-gray-100";

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      {/* Mobile Header with Hamburger */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 lg:hidden z-20 flex items-center justify-between px-4 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <FiMenu className="text-2xl" />
        </button>
        <img src="/logo-dpmd.png" alt="DPMD Logo" className="h-10" />
        <div className="w-10" />
      </div>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed m-4 top-0 left-0 h-[97vh] bg-white shadow-sm rounded-md border-r border-gray-100 transform transition-all duration-300 ease-in-out z-30 lg:relative lg:translate-x-0 flex flex-col ${
          sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 lg:w-20"
        }`}
      >
        {/* Logo Section + Mobile Close */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0 bg-gradient-to-r from-emerald-50 to-green-100">
          <div className="flex items-center justify-center flex-1">
            <img 
              src="/logo-dpmd.png" 
              alt="DPMD Logo" 
              className={`transition-all duration-300 ${sidebarOpen ? "h-20" : "h-14"}`} 
            />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Toggle Button - Desktop */}
        <div className="hidden lg:block px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all duration-300 border border-blue-200 group shadow-sm hover:shadow-md"
            title={sidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
          >
            {sidebarOpen ? (
              <>
                <LuPanelLeftClose className="text-xl text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-sm text-blue-700">Tutup Sidebar</span>
              </>
            ) : (
              <LuPanelLeft className="text-xl text-blue-600 group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>

        {/* Navigation Menu - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul>
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.id} className="mb-2">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `${baseLinkClass} ${
                        isActive ? activeLinkClass : inactiveLinkClass
                      }`
                    }
                    onClick={() =>
                      window.innerWidth < 1024 && setSidebarOpen(false)
                    }
                    title={item.label}
                  >
                    <IconComponent className="h-6 w-6" />
                    <span
                      className={`ml-3 whitespace-nowrap ${
                        !sidebarOpen && "lg:hidden"
                      }`}
                    >
                      {item.label}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Profile Section - Fixed at bottom */}
        <div className="border-t border-gray-100 p-4 flex-shrink-0">
          {/* User Profile Info - Expanded view */}
          <div className={`mb-3 ${!sidebarOpen && "lg:hidden"}`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[rgb(var(--color-primary))] to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-gray-800 truncate">
                  {user?.name}
                </span>
                <span className="text-xs text-gray-500 truncate">
                  {user?.desa?.status_pemerintahan === "desa" ? "Desa" : "Kelurahan"}{" "}
                  {user?.desa?.nama}
                </span>
              </div>
            </div>
          </div>

          

          {/* Settings Button */}
          <button
            onClick={handleSettings}
            className="flex items-center w-full p-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors mb-2"
            title="Pengaturan"
          >
            <FiSettings className="h-5 w-5" />
            <span className={`ml-3 ${!sidebarOpen && "lg:hidden"}`}>
              Pengaturan
            </span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-2 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            title="Logout"
          >
            <FiLogOut className="h-5 w-5" />
            <span className={`ml-3 ${!sidebarOpen && "lg:hidden"}`}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden mt-16 lg:mt-0">
        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DesaLayout;
