// src/layouts/CoreDashboardLayout.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Landmark,
  MapPin,
  Scale,
  Users,
  Briefcase,
  HandCoins,
  Wallet,
  TrendingUp,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  AudioLines,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_BASE_PATH = {
  superadmin: '/superadmin/dashboard',
  admin: '/superadmin/dashboard',
  kepala_dinas: '/dpmd',
  sekretaris_dinas: '/dpmd',
  kepala_bidang: '/dpmd',
  ketua_tim: '/dpmd',
  pegawai: '/dpmd',
};

const MENU_ITEMS = [
  { path: '/core-dashboard/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/core-dashboard/gema', icon: AudioLines, label: 'Gema' },
  { path: '/core-dashboard/statistik-bumdes', icon: Store, label: 'Statistik BUMDes' },
  { path: '/core-dashboard/statistik-kelembagaan', icon: Landmark, label: 'Statistik Kelembagaan' },
  { path: '/core-dashboard/statistik-profil-desa', icon: MapPin, label: 'Statistik Profil Desa' },
  { path: '/core-dashboard/statistik-produk-hukum', icon: Scale, label: 'Produk Hukum' },
  { path: '/core-dashboard/statistik-aparatur-desa', icon: Users, label: 'Aparatur Desa' },
  { path: '/core-dashboard/statistik-perjadin', icon: Briefcase, label: 'Perjalanan Dinas' },
  { path: '/core-dashboard/statistik-bankeu', icon: HandCoins, label: 'Statistik Bankeu' },
  { path: '/core-dashboard/statistik-kkd', icon: Wallet, label: 'Keuangan Desa' },
  { path: '/core-dashboard/trends', icon: TrendingUp, label: 'Analisis Trend' },
];

const isDesktop = () =>
  typeof window === 'undefined' ? true : window.innerWidth >= 1024;

const CoreDashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const basePath = ROLE_BASE_PATH[user?.role] || '/dpmd';

  // Sidebar mengikuti lebar layar
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setSidebarOpen(isDesktop()), 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Di mobile, tutup sidebar setiap kali pindah halaman
  useEffect(() => {
    if (!isDesktop()) setSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const menuItems = useMemo(() => MENU_ITEMS, []);
  const roleLabel = user?.role?.replace(/_/g, ' ') || 'Pengguna';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-50 flex h-full flex-col border-r border-slate-200 bg-white
          transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:relative
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'w-64' : 'lg:w-[76px]'}
        `}
      >
        {/* Header */}
        <div
          className={`flex h-16 flex-shrink-0 items-center border-b border-slate-200 px-3 ${
            sidebarOpen ? 'justify-between' : 'lg:justify-center'
          }`}
        >
          {sidebarOpen && (
            <div className="flex min-w-0 items-center gap-2.5">
              {/* Kotak gelap hanya di balik logo — huruf "MD" pada logo berwarna
                  putih sehingga tidak terbaca di atas latar putih. */}
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-950">
                <img src="/logo-dpmd.png" alt="Logo DPMD" className="h-7 w-7 object-contain" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
                  Core Dashboard
                </p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
                  DPMD
                </p>
              </div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="flex-shrink-0 rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
            aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
            title={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {sidebarOpen && (
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Modul
            </p>
          )}
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                title={!sidebarOpen ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-lg py-2.5 text-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 ${
                    sidebarOpen ? 'px-3' : 'px-3 lg:justify-center lg:px-0'
                  } ${
                    isActive
                      ? 'bg-slate-900 font-semibold text-white shadow-sm shadow-slate-900/20'
                      : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.9} />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer: identitas + kembali */}
        <div className="flex-shrink-0 border-t border-slate-200 p-3">
          {sidebarOpen && (
            <div className="mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-brand-700 ring-1 ring-slate-200">
                {(user?.nama || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-900">
                  {user?.nama || 'Pengguna'}
                </p>
                <p className="truncate text-[11px] capitalize text-slate-500">{roleLabel}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => navigate(basePath)}
            title={!sidebarOpen ? 'Kembali ke beranda' : undefined}
            className={`flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 ${
              sidebarOpen ? 'px-3' : 'px-3 lg:justify-center lg:px-0'
            }`}
          >
            <Home className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.9} />
            {sidebarOpen && <span className="truncate">Kembali ke beranda</span>}
          </button>
        </div>
      </aside>

      {/* Konten */}
      <main className="flex-1 overflow-y-auto">
        {/* Tombol menu mobile */}
        {!sidebarOpen && (
          <div className="fixed left-4 top-4 z-30 lg:hidden">
            <button
              onClick={toggleSidebar}
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-lg shadow-slate-900/5 transition-colors hover:bg-slate-50"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
};

export default CoreDashboardLayout;
