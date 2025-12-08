// src/pages/sekretaris-dinas/SekretarisDinasLayout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText,
  Menu, 
  X,
  LogOut,
  Globe
} from 'lucide-react';

const SekretarisDinasLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const navigate = useNavigate();

  // Handle resize
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (window.innerWidth >= 1024) {
          setSidebarOpen(true);
        } else {
          setSidebarOpen(false);
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('expressToken');
    localStorage.removeItem('user');
    navigate('/login');
  }, [navigate]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/sekretaris-dinas/dashboard'
    },
    {
      name: 'Disposisi Surat',
      icon: FileText,
      path: '/sekretaris-dinas/disposisi'
    },
    {
      name: 'Core Dashboard',
      icon: Globe,
      path: '/core-dashboard/dashboard',
      isExternal: true
    }
  ];

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-700 to-purple-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-purple-700 font-bold text-lg">SD</span>
            </div>
            <div>
              <h2 className="font-bold text-sm">Sekretaris Dinas</h2>
              <p className="text-xs text-purple-200">DPMD Kabupaten Bogor</p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-white hover:bg-purple-600 p-2 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 bg-purple-800/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.name || user.email}</p>
              <p className="text-xs text-purple-200 truncate capitalize">
                Sekretaris Dinas
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive && !item.isExternal
                        ? 'bg-white text-purple-700 font-medium'
                        : 'text-purple-100 hover:bg-purple-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={20} />
                  <span className="text-sm">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-purple-600">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-purple-100 hover:bg-red-600 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded hover:bg-gray-100"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard Sekretaris Dinas</h1>
                <p className="text-sm text-gray-500">DPMD Kabupaten Bogor</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Overlay untuk mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default SekretarisDinasLayout;
