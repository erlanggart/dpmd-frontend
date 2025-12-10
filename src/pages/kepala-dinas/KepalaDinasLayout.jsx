// src/pages/kepala-dinas/KepalaDinasLayout.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  TrendingUp, 
  Menu, 
  X,
  LogOut,
  ChevronLeft,
  ChevronDown,
  DollarSign
} from 'lucide-react';

const KepalaDinasLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [expandedDd, setExpandedDd] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle resize with debounce
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

  // Menu items untuk Kepala Dinas (berbeda dari Core Dashboard)
  const menuItems = useMemo(() => [
    {
      path: '/kepala-dinas/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: 'Dashboard Executive',
      end: true
    },
    {
      path: '/kepala-dinas/statistik-bumdes',
      icon: <Users className="w-5 h-5" />,
      label: 'BUMDes'
    },
    {
      path: '/kepala-dinas/statistik-perjadin',
      icon: <Briefcase className="w-5 h-5" />,
      label: 'Perjalanan Dinas'
    },
    {
      path: '/kepala-dinas/statistik-bankeu',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Bantuan Keuangan'
    },
    {
      path: '/kepala-dinas/statistik-add',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'ADD'
    },
    {
      path: '/kepala-dinas/statistik-bhprd',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'BHPRD'
    },
    {
      path: '/kepala-dinas/statistik-dd',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Dana Desa'
    },
    {
      path: '/kepala-dinas/trends',
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Trends & Analytics'
    }
  ], []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 overflow-hidden">
      {/* Overlay for mobile */}
      {sidebarOpen && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar - Kepala Dinas Theme (Slate/Gray) */}
      <aside
        className={`fixed lg:relative z-50 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl flex flex-col
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'w-64' : 'lg:w-20'}
        `}
        style={{ willChange: 'transform, width' }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          {sidebarOpen && (
            <div className="flex items-center gap-3 overflow-hidden animate-fade-in">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex-shrink-0 shadow-lg">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-white truncate">Kepala Dinas</h2>
                <p className="text-xs text-slate-300 truncate">Executive Dashboard</p>
              </div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-slate-700 rounded-lg transition-all duration-300 flex-shrink-0"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-slate-300" />
            ) : (
              <Menu className="w-5 h-5 text-slate-300" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
          {menuItems.map((item, index) => {
            // Handle menu with submenu (DD, BHPRD)
            if (item.submenu) {
              const isSubmenuActive = item.submenu.some(sub => 
                location.pathname === sub.path
              );

              // Determine which state to use based on label
              const isExpanded = item.label === 'Statistik DD' ? expandedDd : 
                                 item.label === 'Statistik BHPRD' ? expandedBhprd : false;
              const setExpanded = item.label === 'Statistik DD' ? setExpandedDd : 
                                   item.label === 'Statistik BHPRD' ? setExpandedBhprd : () => {};

              return (
                <div key={index}>
                  <button
                    onClick={() => sidebarOpen && setExpanded(!isExpanded)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full
                      transition-colors duration-150
                      ${isSubmenuActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <div className={sidebarOpen ? '' : 'mx-auto'}>
                      {item.icon}
                    </div>
                    {sidebarOpen && (
                      <>
                        <span className="font-medium flex-1 text-left truncate animate-fade-in">{item.label}</span>
                        <ChevronDown 
                          className={`w-4 h-4 transition-transform duration-200 flex-shrink-0
                            ${isExpanded ? 'rotate-180' : ''}
                          `}
                        />
                      </>
                    )}
                  </button>
                  {sidebarOpen && isExpanded && (
                    <div className="ml-8 mt-2 space-y-1">
                      {item.submenu.map((subitem, subindex) => (
                        <NavLink
                          key={subindex}
                          to={subitem.path}
                          className={({ isActive }) =>
                            `flex items-center px-4 py-2 rounded-lg text-sm transition-colors duration-150 ${
                              isActive
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`
                          }
                        >
                          <span className="truncate">{subitem.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Regular menu item
            return (
              <NavLink
                key={index}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/50'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
                title={!sidebarOpen ? item.label : ''}
              >
                <div className={sidebarOpen ? 'flex-shrink-0' : 'mx-auto'}>
                  {item.icon}
                </div>
                {sidebarOpen && (
                  <span className="font-medium truncate animate-fade-in">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300"
            title={!sidebarOpen ? 'Logout' : ''}
          >
            <div className={sidebarOpen ? 'flex-shrink-0' : 'mx-auto'}>
              <LogOut className="w-5 h-5" />
            </div>
            {sidebarOpen && <span className="font-medium truncate animate-fade-in">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Menu Button */}
        {!sidebarOpen && (
          <div className="lg:hidden fixed top-4 left-4 z-30">
            <button
              onClick={toggleSidebar}
              className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        )}
        
        <Outlet />
      </main>
    </div>
  );
};

export default KepalaDinasLayout;
