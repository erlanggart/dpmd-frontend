import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Users, Briefcase, TrendingUp, DollarSign, Menu, X, 
  Building2, Shield, LogOut, ChevronDown, ChevronRight 
} from 'lucide-react';
import axios from 'axios';
import InstallPWA from '../components/InstallPWA';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const VPNDashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [clientIP, setClientIP] = useState('');
  const [bantuanKeuanganOpen, setBantuanKeuanganOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkVPNAccess();
  }, []);

  const checkVPNAccess = useCallback(async () => {
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/vpn-dashboard/check-access`);
      if (response.data.allowed) {
        setHasAccess(true);
        setClientIP(response.data.clientIP);
      } else {
        setHasAccess(false);
        navigate('/vpn-dashboard/access-denied', { 
          state: { 
            message: response.data.message, 
            clientIP: response.data.clientIP 
          } 
        });
      }
    } catch (error) {
      console.error('Error checking VPN access:', error);
      setHasAccess(false);
      navigate('/vpn-dashboard/access-denied', { 
        state: { 
          message: 'Gagal memeriksa akses VPN. Pastikan Anda terhubung ke VPN kantor.', 
          clientIP: 'Unknown' 
        } 
      });
    } finally {
      setIsCheckingAccess(false);
    }
  }, [navigate]);

  const navigationItems = useMemo(() => [
    {
      name: 'Dashboard',
      path: '/vpn-dashboard',
      icon: <Home className="w-5 h-5" />,
      exact: true
    },
    {
      name: 'Statistik BUMDes',
      path: '/vpn-dashboard/bumdes',
      icon: <Building2 className="w-5 h-5" />
    },
    {
      name: 'Statistik Perjalanan Dinas',
      path: '/vpn-dashboard/perjadin',
      icon: <Briefcase className="w-5 h-5" />
    },
    {
      name: 'Bantuan Keuangan',
      icon: <DollarSign className="w-5 h-5" />,
      isSubmenu: true,
      submenu: [
        { name: 'Bantuan Keuangan 2025', path: '/vpn-dashboard/bankeu' },
        { name: 'Alokasi Dana Desa (ADD)', path: '/vpn-dashboard/add' },
        { name: 'Dana Desa (DD)', path: '/vpn-dashboard/dd' },
        { name: 'BHPRD', path: '/vpn-dashboard/bhprd' }
      ]
    },
    {
      name: 'Analisis Trend',
      path: '/vpn-dashboard/trends',
      icon: <TrendingUp className="w-5 h-5" />
    }
  ], []);

  const handleLogout = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const toggleBantuanKeuangan = useCallback(() => {
    setBantuanKeuanganOpen(prev => !prev);
  }, []);

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Memeriksa akses VPN...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect to access denied page
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-b from-indigo-600 to-indigo-800 text-white flex flex-col shadow-2xl
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-72' : 'w-20'}
        `}
        style={{ willChange: 'width' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-indigo-500 flex-shrink-0">
          <div className="flex items-center justify-between">
            {sidebarOpen ? (
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <Shield className="w-8 h-8 flex-shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-bold text-lg truncate">VPN Dashboard</h2>
                  <p className="text-xs text-indigo-200 truncate">Internal Access</p>
                </div>
              </div>
            ) : (
              <Shield className="w-8 h-8 mx-auto" />
            )}
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-indigo-700 rounded-lg transition-colors flex-shrink-0"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* VPN Status */}
        {sidebarOpen && (
          <div className="px-4 py-3 bg-green-600 bg-opacity-30 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div>
              <span className="text-green-100 truncate">VPN Connected</span>
            </div>
            <p className="text-xs text-indigo-200 mt-1 ml-4 truncate">IP: {clientIP}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin scrollbar-thumb-indigo-700">
          <ul className="space-y-2">
            {navigationItems.map((item, index) => (
              <li key={index}>
                {item.isSubmenu ? (
                  <>
                    <button
                      onClick={toggleBantuanKeuangan}
                      className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-150 ${
                        sidebarOpen ? '' : 'justify-center'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0">{item.icon}</div>
                        {sidebarOpen && <span className="truncate">{item.name}</span>}
                      </div>
                      {sidebarOpen && (
                        <div className="flex-shrink-0">
                          {bantuanKeuanganOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      )}
                    </button>
                    {sidebarOpen && bantuanKeuanganOpen && (
                      <ul className="ml-4 mt-2 space-y-1">
                        {item.submenu.map((subItem, subIndex) => (
                          <li key={subIndex}>
                            <NavLink
                              to={subItem.path}
                              className={({ isActive }) =>
                                `flex items-center gap-3 p-2 pl-4 rounded-lg transition-colors duration-150 text-sm ${
                                  isActive
                                    ? 'bg-indigo-900 text-white font-semibold'
                                    : 'hover:bg-indigo-700'
                                }`
                              }
                            >
                              <span className="truncate">{subItem.name}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 ${
                        isActive
                          ? 'bg-indigo-900 text-white font-semibold shadow-lg'
                          : 'hover:bg-indigo-700'
                      } ${sidebarOpen ? '' : 'justify-center'}`
                    }
                  >
                    <div className="flex-shrink-0">{item.icon}</div>
                    {sidebarOpen && <span className="truncate">{item.name}</span>}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Install PWA Button */}
        {sidebarOpen && (
          <div className="p-4 border-t border-indigo-500 flex-shrink-0">
            <InstallPWA />
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-indigo-500 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-150 ${
              sidebarOpen ? '' : 'justify-center'
            }`}
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="truncate">Kembali ke Landing</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default VPNDashboardLayout;
