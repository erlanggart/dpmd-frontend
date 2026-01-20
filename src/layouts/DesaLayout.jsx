import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  FiLogOut,
  FiGrid,
  FiMenu,
  FiUser,
  FiSettings,
  FiChevronDown,
  FiSearch,
  FiMapPin,
} from "react-icons/fi";

import { LuStore, LuFileText, LuUsers, LuUserCheck, LuWallpaper, LuLayoutDashboard, LuLandmark } from "react-icons/lu";
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
];

const DesaLayout = () => {
  const { logout } = useAuth();
  const user = useUserProfile(); // Fetch and update profile with desa data
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to closed on mobile
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
    navigate("/desa/settings");
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

    // Filter menu items based on search query
    const filtered = menuItems.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  const handleSearchItemClick = (path) => {
    navigate(path);
    setSearchQuery("");
    setSearchResults([]);
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

  const baseLinkClass = "flex items-center p-2 rounded-lg relative";
  const activeLinkClass = "text-blue-600 font-semibold border-r-4 border-blue-600";
  const inactiveLinkClass = "hover:bg-gray-100";

  return (
    <div className="h-screen flex overflow-hidden bg-blue-200">
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed m-4 top-0 left-0 h-[97vh] bg-white shadow-xl rounded-md border-r border-slate-200 transform transition-all duration-300 ease-in-out z-30 lg:relative lg:translate-x-0 flex flex-col ${
          sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 lg:w-20"
        }`}
      >
        {/* Logo Section */}
        <div className={`flex items-center ${!sidebarOpen && "justify-center"} p-4 border-b border-slate-200 flex-shrink-0`}>
          <img src="/logo-bogor.png" alt="Logo" className="h-10" />
          <div className={`flex flex-col ml-3 ${!sidebarOpen && "lg:hidden"}`}>
            <span className="font-semibold text-gray-800">DPMD</span>
            <span className="text-xs text-gray-600">Kabupaten Bogor</span>
          </div>
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
        <div className="border-t border-slate-200 p-4 flex-shrink-0">
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
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="p-4 flex-shrink-0">
          <div className="mx-auto flex items-center justify-between">
            {/* Left side: Hamburger + Search */}
            <div className="flex items-center space-x-4 flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-primary"
              >
                <FiMenu className="h-6 w-6" />
              </button>

              {/* Search Box */}
              <div className="relative flex-1 max-w-md" ref={searchRef}>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Cari ..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full bg-white pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-64 overflow-y-auto">
                    {searchResults.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSearchItemClick(item.path)}
                          className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                        >
                          <IconComponent className="h-5 w-5 mr-3 text-gray-600" />
                          <span className="text-gray-700">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* No Results */}
                {showSearchResults && searchResults.length === 0 && searchQuery.trim() !== "" && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-4 z-50">
                    <p className="text-center text-gray-500 text-sm">Tidak ada hasil ditemukan</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: User Profile + Dropdown */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {/* User Icon */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[rgb(var(--color-primary))] to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>

                  {/* User Info */}
                  <div className="hidden md:flex flex-col">
                    <span className="text-sm font-semibold text-gray-800">
                      {user?.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {user?.desa?.status_pemerintahan === "desa" ? "Desa" : "Kelurahan"}{" "}
                      {user?.desa?.nama} • Kec. {user?.desa?.kecamatan?.nama}
                    </span>
                  </div>
                </div>

                {/* Dropdown Button */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Menu User"
                  >
                    <FiChevronDown
                      className={`h-4 w-4 transition-transform ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={handleSettings}
                        className="flex items-center w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <FiSettings className="h-5 w-5 mr-3" />
                        <span>Pengaturan</span>
                      </button>
                      <hr className="my-1 border-gray-200" />
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <FiLogOut className="h-5 w-5 mr-3" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>

        {/* Footer */}
        {/* <Footer /> */}
      </div>
    </div>
  );
};

export default DesaLayout;
