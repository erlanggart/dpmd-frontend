import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  FiLogOut,
  FiMenu,
  FiUser,
  FiSettings,
  FiChevronDown,
  FiSearch,
  FiMapPin,
  FiX,
} from "react-icons/fi";
import { 
  LuLayoutDashboard, 
  LuBanknote, 
  LuBuilding2,
  LuClipboardCheck 
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
  {
    id: "data-desa",
    label: "Data Desa",
    path: "/kecamatan/data-desa",
    icon: LuBuilding2,
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-violet-600 to-violet-800 text-white transition-all duration-300 z-40 ${
          sidebarOpen ? "w-72" : "w-0 lg:w-20"
        } overflow-hidden shadow-2xl`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-violet-500/30">
            <div className={`flex items-center gap-3 ${!sidebarOpen && "lg:justify-center"}`}>
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
                <FiMapPin className="text-violet-600 text-xl" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-lg font-bold">DPMD Bogor</h1>
                  <p className="text-xs text-violet-200">Admin Kecamatan</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-white hover:bg-violet-500/30 p-2 rounded-lg transition-colors"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          {/* User Info Card */}
          {sidebarOpen && user && (
            <div className="mx-4 my-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-violet-600 rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{user.name}</p>
                  <p className="text-xs text-violet-200 truncate">
                    {user.kecamatan?.nama || "Kecamatan"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin scrollbar-thumb-violet-500 scrollbar-track-transparent">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? "bg-white text-violet-600 shadow-lg"
                        : "text-white hover:bg-white/10 hover:translate-x-1"
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
          <div className="p-4 border-t border-violet-500/30">
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl text-white hover:bg-red-500/20 transition-all duration-200 group ${
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
        {/* Top Bar */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiMenu className="text-xl text-gray-700" />
              </button>

              {/* Search Bar */}
              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari menu..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 py-2 max-h-96 overflow-y-auto">
                    {searchResults.map((result) => {
                      const Icon = result.icon;
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSearchResultClick(result.path)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <Icon className="text-violet-600" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {result.label}
                            </p>
                            <p className="text-xs text-gray-500">{result.path}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-violet-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-700">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.kecamatan?.nama}
                  </p>
                </div>
                <FiChevronDown
                  className={`text-gray-400 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                    <p className="text-xs text-violet-600 mt-1 font-medium">
                      {user?.kecamatan?.nama}
                    </p>
                  </div>

                  <button
                    onClick={handleSettings}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <FiSettings className="text-gray-400" />
                    <span className="text-sm text-gray-700">Pengaturan</span>
                  </button>

                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-50 transition-colors text-left text-red-600"
                    >
                      <FiLogOut className="text-red-500" />
                      <span className="text-sm font-medium">Keluar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

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
