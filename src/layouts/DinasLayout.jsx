import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import api from "../services/api";
import {
  FiLogOut,
  FiMenu,
  FiSettings,
  FiChevronDown,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { 
  LuLayoutDashboard, 
  LuClipboardCheck,
  LuBuilding2,
  LuSettings,
  LuUsers,
  LuUser,
  LuKeyRound,
  LuPanelLeftClose,
  LuPanelLeft
} from "react-icons/lu";

// Menu items configuration for Dinas
const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dinas/dashboard",
    icon: LuLayoutDashboard,
  },
  {
    id: "bankeu",
    label: "Verifikasi Bankeu",
    path: "/dinas/bankeu",
    icon: LuClipboardCheck,
  },
  {
    id: "profil",
    label: "Profil Saya",
    path: "/dinas/profil",
    icon: LuUser,
    // Only for verifikator_dinas role
    forVerifikatorOnly: true,
  },
  {
    id: "verifikator",
    label: "Kelola Verifikator",
    path: "/dinas/verifikator",
    icon: LuUsers,
  },
  {
    id: "konfigurasi",
    label: "Konfigurasi",
    path: "/dinas/konfigurasi",
    icon: LuSettings,
  },
  {
    id: "ganti-password",
    label: "Ganti Password",
    path: "/dinas/ganti-password",
    icon: LuKeyRound,
  },
];

const DinasLayout = () => {
  const { logout } = useAuth();
  const userFromHook = useUserProfile();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [dinasName, setDinasName] = useState(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Fallback to localStorage if hook hasn't loaded yet
  const user = userFromHook || JSON.parse(localStorage.getItem('user') || '{}');

  // Roles yang bisa mengelola verifikator dan konfigurasi
  const managerRoles = ['dinas_terkait', 'superadmin', 'kepala_dinas', 'sekretaris_dinas'];
  const isVerifikator = user?.role === 'verifikator_dinas';

  // Fetch dinas name for verifikator
  useEffect(() => {
    const fetchDinasName = async () => {
      if (isVerifikator && user.dinas_id && !user.dinas) {
        try {
          const response = await api.get('/verifikator/profile');
          if (response.data.success) {
            setDinasName(response.data.data.nama_dinas);
          }
        } catch (error) {
          // Ignore 403 errors - user may not have verifikator profile
          if (error.response?.status !== 403) {
            console.error('Error fetching dinas name:', error);
          }
        }
      }
    };
    fetchDinasName();
  }, [isVerifikator, user.dinas_id]);

  // Filter menu items based on user's role and dinas_id
  const filteredMenuItems = menuItems.filter(item => {
    // Profil Saya hanya untuk verifikator_dinas
    if (item.forVerifikatorOnly) {
      return isVerifikator;
    }
    // Konfigurasi & Kelola Verifikator hanya untuk manager roles
    if (item.id === 'konfigurasi' || item.id === 'verifikator') {
      return user?.dinas_id != null && managerRoles.includes(user?.role);
    }
    return true;
  });

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const handleSettings = () => {
    setDropdownOpen(false);
    navigate("/dinas/settings");
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

    const results = filteredMenuItems.filter(
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
      {/* Mobile Header with Hamburger */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 lg:hidden z-30 flex items-center justify-between px-4 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
        >
          <FiMenu className="text-2xl" />
        </button>
        <img src="/logo-dpmd.png" alt="DPMD Logo" className="h-10" />
        <div className="w-10"></div>
      </div>

      {/* Sidebar - White - Responsive */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white text-gray-800 transition-all duration-300 z-40 border-r border-gray-200 ${
          sidebarOpen ? "w-64 sm:w-72 translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-20"
        } overflow-hidden shadow-lg`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-100">
            <div className="flex items-center justify-center flex-1">
              <img 
                src="/logo-dpmd.png" 
                alt="DPMD Logo" 
                className={`transition-all duration-300 ${sidebarOpen ? "h-16 sm:h-20" : "h-14"}`} 
              />
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          {/* Toggle Button - Desktop */}
          <div className="hidden lg:block px-4 py-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl transition-all duration-300 border border-amber-200 group shadow-sm hover:shadow-md"
              title={sidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
            >
              {sidebarOpen ? (
                <>
                  <LuPanelLeftClose className="text-xl text-amber-600 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm text-amber-700">Tutup Sidebar</span>
                </>
              ) : (
                <LuPanelLeft className="text-xl text-amber-600 group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>

          {/* User Info Card */}
          {sidebarOpen && user && (
            <div className="mx-4 my-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-600 truncate">
                    {isVerifikator 
                      ? (dinasName || "Verifikator Dinas")
                      : (user.dinas?.nama_dinas || user.dinas?.singkatan || "Dinas Terkait")
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
                        : "text-gray-700 hover:bg-gray-100 hover:translate-x-1"
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
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group ${
                !sidebarOpen && "lg:justify-center lg:px-2"
              }`}
            >
              <FiLogOut className="text-xl" />
              {sidebarOpen && <span className="font-medium">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content - Responsive */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "lg:ml-72" : "ml-0 lg:ml-20"
        } mt-16 lg:mt-0`}
      >
        {/* Page Content - Responsive */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Overlay - Only show on mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DinasLayout;
