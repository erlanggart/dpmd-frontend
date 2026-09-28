import React, { useState, useRef, useEffect, useMemo } from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  LayoutDashboard,
  Banknote,
  Coins,
  Building2,
  Store,
  Users,
  MessageCircle,
  Settings,
  Lock,
  LogOut,
  Search,
  Menu,
  X,
  MapPin,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  CornerDownLeft,
} from "lucide-react";

// Menu dikelompokkan menurut sifat pekerjaannya: yang harus diputuskan
// kecamatan (verifikasi) dipisah dari yang hanya dipantau (BUMDes).
const menuGroups = [
  {
    label: "Utama",
    items: [
      { id: "dashboard", label: "Dashboard", path: "/kecamatan/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Verifikasi",
    items: [
      { id: "bankeu", label: "Bantuan Keuangan", path: "/kecamatan/bankeu", icon: Banknote },
      { id: "bankeu-perubahan", label: "Bankeu Perubahan", path: "/kecamatan/bankeu-perubahan", icon: Coins },
      { id: "kelembagaan", label: "Kelembagaan", path: "/kecamatan/kelembagaan", icon: Building2 },
    ],
  },
  {
    label: "Pemantauan",
    items: [
      { id: "aparatur-desa", label: "Aparatur Desa", path: "/kecamatan/aparatur-desa", icon: Users, tag: "Lihat" },
      { id: "bumdes", label: "BUMDes", path: "/kecamatan/bumdes", icon: Store, tag: "Lihat" },
    ],
  },
  {
    label: "Komunikasi",
    items: [
      { id: "pesan", label: "Pesan", path: "/kecamatan/pesan", icon: MessageCircle },
    ],
  },
  {
    label: "Akun",
    items: [
      { id: "settings", label: "Pengaturan", path: "/kecamatan/settings", icon: Settings },
      { id: "change-password", label: "Ganti Password", path: "/kecamatan/change-password", icon: Lock },
    ],
  },
];

const menuItems = menuGroups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label })));

const KUNCI_CIUT = "kecamatan-sidebar-ciut";

const bacaCiut = () => {
  try {
    return localStorage.getItem(KUNCI_CIUT) === "1";
  } catch {
    return false;
  }
};

const KecamatanLayout = () => {
  const { logout } = useAuth();
  const user = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();

  // Desktop: lebar/ciut (diingat). Seluler: laci yang tertutup secara bawaan.
  const [ciut, setCiut] = useState(bacaCiut);
  const [laciTerbuka, setLaciTerbuka] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [sorotan, setSorotan] = useState(0);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const namaKecamatan = user?.kecamatan_name || user?.kecamatan?.nama || "Kecamatan";
  const namaUser = user?.name || "Admin Kecamatan";
  const inisial = namaKecamatan.charAt(0).toUpperCase();

  const halamanAktif = useMemo(
    () => menuItems.find((m) => location.pathname.startsWith(m.path)),
    [location.pathname]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return menuItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const toggleCiut = () => {
    setCiut((v) => {
      try {
        localStorage.setItem(KUNCI_CIUT, v ? "0" : "1");
      } catch {
        // Penyimpanan diblokir — cukup berlaku untuk sesi ini.
      }
      return !v;
    });
  };

  const bukaHasil = (path) => {
    navigate(path);
    setSearchQuery("");
    setShowSearchResults(false);
    searchInputRef.current?.blur();
  };

  const onKeySearch = (e) => {
    if (!searchResults.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSorotan((i) => (i + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSorotan((i) => (i - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      bukaHasil(searchResults[sorotan]?.path || searchResults[0].path);
    } else if (e.key === "Escape") {
      setShowSearchResults(false);
      searchInputRef.current?.blur();
    }
  };

  // Laci seluler ditutup setiap pindah halaman.
  useEffect(() => {
    setLaciTerbuka(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Ctrl/⌘ + K membuka pencarian menu.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  // Di seluler sidebar selalu tampil lebar (di dalam laci).
  const lebar = !ciut || laciTerbuka;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* ------------------------------------------------------- sidebar -- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-950 text-slate-300 transition-all duration-300 ease-out
          ${laciTerbuka ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          ${lebar ? "w-[17rem]" : "w-[4.75rem]"}`}
      >
        {/* Sorot merah bata tipis di pojok, sama dengan kepala Core Dashboard */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56"
          style={{ background: "radial-gradient(90% 100% at 0% 0%, rgba(185,28,28,0.18) 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        {/* Identitas */}
        <div className={`relative flex h-16 flex-shrink-0 items-center gap-3 ${lebar ? "px-5" : "justify-center px-0"}`}>
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            <img src="/logo-dpmd.png" alt="DPMD" className="h-full w-full object-contain" />
          </span>
          {lebar && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-white">DPMD Kab. Bogor</p>
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-brand-400">
                Akun Kecamatan
              </p>
            </div>
          )}
          <button
            onClick={() => setLaciTerbuka(false)}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Wilayah */}
        <div className={`relative ${lebar ? "px-4" : "px-3"} pb-2 pt-1`}>
          <div
            className={`flex items-center gap-3 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] ${lebar ? "p-3" : "justify-center p-2"}`}
            title={!lebar ? `Kecamatan ${namaKecamatan}` : undefined}
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white">
              {inisial}
            </span>
            {lebar && (
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Wilayah</p>
                <p className="truncate text-sm font-semibold text-white">{namaKecamatan}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigasi */}
        <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
          {menuGroups.map((group, gi) => (
            <div key={group.label} className={gi ? "mt-5" : ""}>
              {lebar ? (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {group.label}
                </p>
              ) : (
                gi > 0 && <div className="mx-3 mb-3 h-px bg-white/[0.06]" />
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.path}
                        title={!lebar ? item.label : undefined}
                        className={({ isActive }) =>
                          `group relative flex items-center gap-3 rounded-lg py-2 text-sm transition-colors duration-150 ${
                            lebar ? "px-3" : "justify-center px-0"
                          } ${
                            isActive
                              ? "bg-white/[0.08] font-medium text-white"
                              : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400" />
                            )}
                            <Icon
                              className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                                isActive ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300"
                              }`}
                              strokeWidth={isActive ? 2.2 : 1.8}
                            />
                            {lebar && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                            {lebar && item.tag && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-white/[0.08]">
                                <Eye className="h-3 w-3" />
                                {item.tag}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Kaki: ciutkan + keluar */}
        <div className="relative flex-shrink-0 space-y-0.5 border-t border-white/[0.06] p-3">
          <button
            onClick={toggleCiut}
            className={`hidden w-full items-center gap-3 rounded-lg py-2 text-sm text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-100 lg:flex ${
              lebar ? "px-3" : "justify-center px-0"
            }`}
            title={ciut ? "Lebarkan sidebar" : "Ciutkan sidebar"}
          >
            {ciut ? <ChevronsRight className="h-[18px] w-[18px]" /> : <ChevronsLeft className="h-[18px] w-[18px]" />}
            {lebar && <span>Ciutkan</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-lg py-2 text-sm text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 ${
              lebar ? "px-3" : "justify-center px-0"
            }`}
            title={!lebar ? "Keluar" : undefined}
          >
            <LogOut className="h-[18px] w-[18px]" />
            {lebar && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Latar laci seluler */}
      {laciTerbuka && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setLaciTerbuka(false)}
        />
      )}

      {/* --------------------------------------------------------- konten -- */}
      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ease-out ${
          ciut ? "lg:ml-[4.75rem]" : "lg:ml-[17rem]"
        }`}
      >
        {/* Bilah atas */}
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setLaciTerbuka(true)}
            className="-ml-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Remah roti */}
          <div className="min-w-0 flex-1">
            <p className="hidden text-[11px] font-medium text-slate-400 sm:block">
              Kecamatan {namaKecamatan}
              {halamanAktif && <span className="text-slate-300"> / {halamanAktif.group}</span>}
            </p>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
              {halamanAktif?.label || "Kecamatan"}
            </h1>
          </div>

          {/* Pencarian menu */}
          <div ref={searchRef} className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSorotan(0);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              onKeyDown={onKeySearch}
              placeholder="Cari menu…"
              className="w-60 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-14 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:w-72 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400">
              Ctrl K
            </kbd>

            {showSearchResults && searchQuery.trim() && (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                {searchResults.length ? (
                  <ul className="max-h-80 overflow-y-auto p-1.5">
                    {searchResults.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            onMouseEnter={() => setSorotan(i)}
                            onClick={() => bukaHasil(item.path)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                              i === sorotan ? "bg-slate-100 text-slate-900" : "text-slate-600"
                            }`}
                          >
                            <Icon className="h-4 w-4 text-slate-400" />
                            <span className="flex-1">{item.label}</span>
                            <span className="text-[11px] text-slate-400">{item.group}</span>
                            {i === sorotan && <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">Menu tidak ditemukan</p>
                )}
              </div>
            )}
          </div>

          {/* Profil */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 transition-colors hover:bg-slate-100"
              aria-expanded={dropdownOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
                {inisial}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[10rem] truncate text-[13px] font-semibold leading-tight text-slate-900">
                  {namaUser}
                </span>
                <span className="block text-[11px] leading-tight text-slate-500">Admin Kecamatan</span>
              </span>
              <ChevronDown
                className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{namaUser}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                    <MapPin className="h-3 w-3" />
                    Kecamatan {namaKecamatan}
                  </p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => navigate("/kecamatan/settings")}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    Pengaturan
                  </button>
                  <button
                    onClick={() => navigate("/kecamatan/change-password")}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Lock className="h-4 w-4 text-slate-400" />
                    Ganti Password
                  </button>
                </div>
                <div className="border-t border-slate-100 p-1.5">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[96rem] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default KecamatanLayout;
