import React, { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  FiLogOut,
  FiChevronDown,
  FiMenu,
  FiX,
} from "react-icons/fi";
import {
  LuLayoutDashboard,
  LuGitCompare,
  LuShieldCheck,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext";

const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/bpjs/dashboard",
    icon: LuLayoutDashboard,
  },
  {
    id: "rtrw",
    label: "RT/RW Comparison",
    path: "/bpjs/rtrw-comparison",
    icon: LuGitCompare,
  },
];

const BpjsLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 lg:hidden z-30 flex items-center justify-between px-4 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          aria-label="Buka menu"
        >
          <FiMenu className="text-2xl" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
            <LuShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-800">BPJS Portal</span>
        </div>
        <div className="w-10" />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white text-slate-800 transition-all duration-300 z-40 border-r border-slate-200 ${
          sidebarOpen
            ? "w-64 sm:w-72 translate-x-0"
            : "-translate-x-full lg:translate-x-0 lg:w-20"
        } overflow-hidden shadow-lg`}
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="flex items-center justify-between px-4 py-5 border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-md flex items-center justify-center flex-shrink-0">
                <LuShieldCheck className="w-6 h-6 text-white" />
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 leading-tight">BPJS Portal</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    DPMD Kab. Bogor
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Tutup menu"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          {/* User card */}
          {sidebarOpen && user?.name && (
            <div className="mx-4 my-4 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-emerald-700 truncate font-medium">
                    BPJS Ketenagakerjaan
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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

          {/* Footer / logout */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ${
                !sidebarOpen && "lg:justify-center lg:px-2"
              }`}
            >
              <FiLogOut className="text-xl flex-shrink-0" />
              {sidebarOpen && <span className="font-medium text-sm">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "lg:ml-72" : "ml-0 lg:ml-20"
        } mt-16 lg:mt-0`}
      >
        {/* Desktop top bar with user dropdown */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <FiMenu className="text-xl" />
            </button>
            <span className="text-sm text-slate-500">Portal BPJS</span>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold flex items-center justify-center">
                {(user?.name || "B").charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700 max-w-[160px] truncate">
                {user?.name || "BPJS"}
              </span>
              <FiChevronDown
                className={`text-slate-400 transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {user?.name || "BPJS"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {user?.email || "bpjs@dpmd.bogorkab.go.id"}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <FiLogOut className="text-base" />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default BpjsLayout;
