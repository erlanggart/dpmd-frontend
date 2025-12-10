// src/layouts/CoreDashboardLayout.jsx
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

const CoreDashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [expandedDd, setExpandedDd] = useState(false);
  const [expandedBhprd, setExpandedBhprd] = useState(false);
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

  const menuItems = useMemo(() => [
    {
      path: '/core-dashboard/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: 'Dashboard',
      end: true
    },
    {
      path: '/core-dashboard/statistik-bumdes',
      icon: <Users className="w-5 h-5" />,
      label: 'Statistik BUMDes'
    },
    {
      path: '/core-dashboard/statistik-perjadin',
      icon: <Briefcase className="w-5 h-5" />,
      label: 'Perjalanan Dinas'
    },
    {
      path: '/core-dashboard/statistik-bankeu',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Statistik Bankeu'
    },
    {
      path: '/core-dashboard/statistik-add',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Statistik ADD'
    },
    {
      path: '/core-dashboard/statistik-bhprd',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Statistik BHPRD',
      submenu: [
        { path: '/core-dashboard/statistik-bhprd-tahap1', label: 'BHPRD Tahap 1' },
        { path: '/core-dashboard/statistik-bhprd-tahap2', label: 'BHPRD Tahap 2' },
        { path: '/core-dashboard/statistik-bhprd-tahap3', label: 'BHPRD Tahap 3' }
      ]
    },
    {
      path: '/core-dashboard/statistik-dd',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Statistik DD',
      submenu: [
        { path: '/core-dashboard/statistik-dd-earmarked-tahap1', label: 'DD Earmarked Tahap 1' },
        { path: '/core-dashboard/statistik-dd-earmarked-tahap2', label: 'DD Earmarked Tahap 2' },
        { path: '/core-dashboard/statistik-dd-nonearmarked-tahap1', label: 'DD Non-Earmarked Tahap 1' },
        { path: '/core-dashboard/statistik-dd-nonearmarked-tahap2', label: 'DD Non-Earmarked Tahap 2' },
        { path: '/core-dashboard/statistik-insentif-dd', label: 'Insentif DD' }
      ]
    },
    {
      path: '/core-dashboard/trends',
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Analisis Trend'
    }
  ], []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
      {/* Overlay for mobile */}
      {sidebarOpen && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-50 h-full bg-white shadow-xl flex flex-col
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'w-64' : 'lg:w-20'}
        `}
        style={{ willChange: 'transform, width' }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          {sidebarOpen && (
            <div className="flex items-center gap-3 overflow-hidden animate-fade-in">
              <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-gray-800 truncate">Core Dashboard</h2>
                <p className="text-xs text-gray-500 truncate">DPMD Analytics</p>
              </div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 flex-shrink-0"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
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
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
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
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-all duration-300"
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

export default CoreDashboardLayout;
