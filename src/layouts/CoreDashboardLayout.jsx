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
import AnimatedIcon from '../components/AnimatedIcon';

const CoreDashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedDd, setExpandedDd] = useState(false);
  const [expandedBhprd, setExpandedBhprd] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
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
      icon: 'dashboard',
      label: 'Dashboard',
      end: true,
      gradient: 'from-cyan-500 to-blue-600',
      color: 'text-cyan-600'
    },
    
    {
      path: '/core-dashboard/statistik-bumdes',
      icon: 'users',
      label: 'Statistik BUMDes',
      gradient: 'from-purple-500 to-indigo-600',
      color: 'text-purple-600'
    },
    {
      path: '/core-dashboard/statistik-perjadin',
      icon: 'briefcase',
      label: 'Perjalanan Dinas',
      gradient: 'from-amber-500 to-orange-600',
      color: 'text-amber-600'
    },
    {
      path: '/core-dashboard/statistik-bankeu',
      icon: 'dollar',
      label: 'Statistik Bankeu',
      gradient: 'from-emerald-500 to-teal-600',
      color: 'text-emerald-600'
    },
    {
      path: '/core-dashboard/statistik-add',
      icon: 'dollar',
      label: 'Statistik ADD',
      gradient: 'from-blue-500 to-indigo-600',
      color: 'text-blue-600'
    },
    {
      path: '/core-dashboard/statistik-bhprd',
      icon: 'dollar',
      label: 'Statistik BHPRD',
      gradient: 'from-pink-500 to-rose-600',
      color: 'text-pink-600',
      submenu: [
        { path: '/core-dashboard/statistik-bhprd-tahap1', label: 'BHPRD Tahap 1' },
        { path: '/core-dashboard/statistik-bhprd-tahap2', label: 'BHPRD Tahap 2' },
        { path: '/core-dashboard/statistik-bhprd-tahap3', label: 'BHPRD Tahap 3' }
      ]
    },
    {
      path: '/core-dashboard/statistik-dd',
      icon: 'dollar',
      label: 'Statistik DD',
      gradient: 'from-violet-500 to-purple-600',
      color: 'text-violet-600',
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
      icon: 'trending',
      label: 'Analisis Trend',
      gradient: 'from-red-500 to-pink-600',
      color: 'text-red-600'
    },{
      path: '/core-dashboard/laporan-desa',
      icon: 'briefcase',
      label: 'Laporan Desa',
      gradient: 'from-teal-500 to-cyan-600',
      color: 'text-teal-600'
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
        className={`fixed lg:relative z-50 h-full bg-white shadow-2xl flex flex-col border-r border-gray-100
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'w-64' : 'lg:w-20'}
        `}
        style={{ willChange: 'transform, width' }}
      >
        {/* Gradient Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500"></div>

        {/* Sidebar Header */}
        <div className="relative p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50">
          {sidebarOpen && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex-shrink-0 shadow-lg">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-gray-800 truncate text-sm">Core Dashboard</h2>
                <p className="text-xs text-blue-600 truncate font-medium">DPMD Analytics</p>
              </div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all duration-200 flex-shrink-0 group"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            ) : (
              <Menu className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="relative flex-1 p-3 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
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
                    onMouseEnter={() => setHoveredItem(item.label)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl w-full
                      transition-all duration-200
                      ${isSubmenuActive
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-md`
                        : `${item.color} hover:bg-gradient-to-r ${item.gradient} hover:text-white hover:shadow-md`
                      }`}
                  >
                    <div className={`relative ${sidebarOpen ? '' : 'mx-auto'}`}>
                      <AnimatedIcon 
                        type={item.icon} 
                        isActive={isSubmenuActive} 
                        isHovered={hoveredItem === item.label}
                        className="w-5 h-5"
                      />
                    </div>
                    {sidebarOpen && (
                      <>
                        <span className="relative font-semibold flex-1 text-left truncate text-sm">{item.label}</span>
                        <ChevronDown 
                          className={`relative w-4 h-4 transition-all duration-200 flex-shrink-0
                            ${isExpanded ? 'rotate-180' : ''}
                          `}
                        />
                      </>
                    )}
                  </button>
                  {sidebarOpen && isExpanded && (
                    <div className="ml-8 mt-1.5 space-y-1">
                      {item.submenu.map((subitem, subindex) => (
                        <NavLink
                          key={subindex}
                          to={subitem.path}
                          className={({ isActive }) =>
                            `flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                              isActive
                                ? `bg-gradient-to-r ${item.gradient} text-white font-semibold shadow-sm`
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                          }
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-current mr-2"></div>
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
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-md`
                      : `${item.color} hover:bg-gradient-to-r ${item.gradient} hover:text-white hover:shadow-md`
                  }`
                }
                title={!sidebarOpen ? item.label : ''}
              >
                <div className={`relative ${sidebarOpen ? 'flex-shrink-0' : 'mx-auto'}`}>
                  <AnimatedIcon 
                    type={item.icon} 
                    isActive={location.pathname === item.path} 
                    isHovered={hoveredItem === item.label}
                    className="w-5 h-5"
                  />
                </div>
                {sidebarOpen && (
                  <span className="relative font-semibold truncate text-sm">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>


        {/* Logout Button */}
        <div className="relative p-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleLogout}
            onMouseEnter={() => setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
            className="group relative flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200"
            title={!sidebarOpen ? 'Logout' : ''}
          >
            <div className={`relative ${sidebarOpen ? 'flex-shrink-0' : 'mx-auto'}`}>
              <AnimatedIcon 
                type="logout" 
                isActive={false} 
                isHovered={hoveredItem === 'logout'}
                className="w-5 h-5"
              />
            </div>
            {sidebarOpen && <span className="relative font-semibold truncate text-sm">Logout</span>}
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
