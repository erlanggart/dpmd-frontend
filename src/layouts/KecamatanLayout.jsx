import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  FiLogOut,
  FiUser,
  FiSettings,
  FiChevronDown,
  FiSearch,
  FiMapPin,
} from "react-icons/fi";
import { 
  LuLayoutDashboard, 
  LuBanknote, 
  LuBuilding2,
  LuClipboardCheck,
  LuPanelLeftClose,
  LuPanelLeft
} from "react-icons/lu";
import InstallPWA from "../components/InstallPWA";

// Menu items configuration
const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/kecamatan/dashboard",
    icon: LuLayoutDashboard,
  },
  {
    id: "bankeu",
    label: "Verifikasi Bankeu",
    path: "/kecamatan/bankeu",
    icon: LuBanknote,
  },
];

const KecamatanLayout = () => {
  const { logout } = useAuth();
  const user = useUserProfile();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSettings = () => {
    setDropdownOpen(false);
    navigate("/kecamatan/settings");
  };

  // Handle search
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const results = menuItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.path.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(results);
    setShowSearchResults(true);
  };

  const handleSearchResultClick = (path) => {
    navigate(path);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-100 transition-all duration-300 z-40 ${
          sidebarOpen ? "w-72" : "w-0 lg:w-20"
        } overflow-hidden shadow-sm`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center px-6 py-6 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-100">
            <img 
              src="/logo-dpmd.png" 
              alt="DPMD Logo" 
              className={`transition-all duration-300 ${sidebarOpen ? "h-20" : "h-14"}`} 
            />
          </div>

          {/* Toggle Button - Floating di Sidebar */}
          <div className="px-4 py-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 rounded-xl transition-all duration-300 border border-violet-200 group shadow-sm hover:shadow-md"
              title={sidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
            >
              {sidebarOpen ? (
                <>
                  <LuPanelLeftClose className="text-xl text-violet-600 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm text-violet-700">Tutup Sidebar</span>
                </>
              ) : (
                <LuPanelLeft className="text-xl text-violet-600 group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>

          {/* User Info Card */}
          {sidebarOpen && user && (
            <div className="mx-4 my-4 p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md">
                  {(user.kecamatan_name || user.kecamatan?.nama || 'K')?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">
                    {user.kecamatan_name || user.kecamatan?.nama || 'Kecamatan'}
                  </p>
                  <p className="text-xs text-gray-600 truncate">Kecamatan</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-50 hover:translate-x-1"
                    } ${!sidebarOpen && "lg:justify-center lg:px-2"}`
                  }
                >
                  <Icon className="text-xl flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 group ${
                !sidebarOpen && "lg:justify-center lg:px-2"
              }`}
            >
              <FiLogOut className="text-xl" />
              {sidebarOpen && <span className="font-medium">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "lg:ml-72" : "lg:ml-20"
        }`}
      >
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>

        <InstallPWA />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default KecamatanLayout;
