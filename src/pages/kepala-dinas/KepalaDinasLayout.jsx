// src/pages/kepala-dinas/KepalaDinasLayout.jsx
import React, { useState, useEffect } from 'react';
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

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('expressToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    {
      path: '/core-dashboard/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: 'Dashboard Overview',
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
      label: 'Statistik Perjalanan Dinas'
    },
    {
      path: '/core-dashboard/statistik-bankeu',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Statistik Bantuan Keuangan'
    },
    {
      path: '/core-dashboard/statistik-add',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Statistik ADD'
    },
    {
      path: '/core-dashboard/statistik-bhprd',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Statistik BHPRD'
    },
    {
      path: '/core-dashboard/statistik-dd',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Statistik DD'
    },
    {
      path: '/core-dashboard/trends',
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Analisis Trend'
    }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${
          sidebarOpen ? 'w-64' : 'lg:w-20'
        } fixed lg:relative z-50 bg-white shadow-xl transition-all duration-300 flex flex-col h-full`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">Core Dashboard</h2>
                <p className="text-xs text-gray-500">DPMD Analytics</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full ${
                      isSubmenuActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className={sidebarOpen ? '' : 'mx-auto'}>
                      {item.icon}
                    </div>
                    {sidebarOpen && (
                      <>
                        <span className="font-medium flex-1 text-left">{item.label}</span>
                        <ChevronDown 
                          className={`w-4 h-4 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
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
                            `flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                              isActive
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`
                          }
                        >
                          {subitem.label}
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
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
                title={!sidebarOpen ? item.label : ''}
              >
                <div className={sidebarOpen ? '' : 'mx-auto'}>
                  {item.icon}
                </div>
                {sidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            title={!sidebarOpen ? 'Logout' : ''}
          >
            <div className={sidebarOpen ? '' : 'mx-auto'}>
              <LogOut className="w-5 h-5" />
            </div>
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed top-4 left-4 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
        </div>
        
        <Outlet />
      </main>
    </div>
  );
};

export default KepalaDinasLayout;
