import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LuWifi,
  LuChevronLeft,
  LuChevronRight,
  LuRefreshCw,
  LuMonitor,
  LuSmartphone,
  LuTablet,
  LuGlobe,
  LuClock,
  LuShield,
  LuUser,
  LuHouse,
  LuMapPin,
  LuBuilding2,
} from 'react-icons/lu';
import api from '../../api';
import { getAvatarUrl } from '../../utils/avatarUtils';

const ROLE_COLORS = {
  superadmin: 'bg-rose-100 text-rose-700',
  kepala_dinas: 'bg-blue-100 text-blue-700',
  sekretaris_dinas: 'bg-indigo-100 text-indigo-700',
  kepala_bidang: 'bg-emerald-100 text-emerald-700',
  ketua_tim: 'bg-teal-100 text-teal-700',
  pegawai: 'bg-slate-100 text-slate-700',
  desa: 'bg-green-100 text-green-700',
  kecamatan: 'bg-violet-100 text-violet-700',
  dinas_terkait: 'bg-amber-100 text-amber-700',
  verifikator_dinas: 'bg-orange-100 text-orange-700',
};

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  kepala_dinas: 'Kepala Dinas',
  sekretaris_dinas: 'Sekretaris',
  kepala_bidang: 'Kabid',
  ketua_tim: 'Ketua Tim',
  pegawai: 'Pegawai',
  desa: 'Desa',
  kecamatan: 'Kecamatan',
  dinas_terkait: 'Dinas',
  verifikator_dinas: 'Verifikator',
};

const deviceIcons = {
  desktop: LuMonitor,
  mobile: LuSmartphone,
  tablet: LuTablet,
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}j lalu`;
};

const ITEMS_PER_PAGE = 15;

export default function OnlineUsersSidebar() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef(null);

  const abortRef = useRef(null);

  const fetchOnline = useCallback(async (p = 1, append = false) => {
    // Cancel previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await api.get(`/settings/online-users?page=${p}&limit=${ITEMS_PER_PAGE}&minutes=5`, {
        signal: controller.signal,
      });
      if (res.data.success) {
        if (append) {
          setUsers(prev => [...prev, ...res.data.data.users]);
        } else {
          setUsers(res.data.data.users);
        }
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      // silently fail other errors
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load + auto-refresh (resets to page 1)
  useEffect(() => {
    setPage(1);
    fetchOnline(1);
    const interval = setInterval(() => {
      setPage(1);
      fetchOnline(1);
    }, 300000);
    return () => {
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchOnline]);

  // Load more when page increments
  useEffect(() => {
    if (page > 1) {
      fetchOnline(page, true);
    }
  }, [page, fetchOnline]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 80) {
      if (page < pagination.total_pages) {
        setPage(prev => prev + 1);
      }
    }
  }, [loadingMore, loading, page, pagination.total_pages]);

  if (collapsed) {
    return (
      <div className="flex-shrink-0 w-12">
        <div className="sticky top-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-2 flex flex-col items-center gap-3">
          <button
            onClick={() => setCollapsed(false)}
            className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
            title="Tampilkan user online"
          >
            <LuChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
            {pagination.total}
          </div>
          <LuWifi className="w-4 h-4 text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-72 xl:w-80">
      <div className="sticky top-4 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <LuWifi className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-300 rounded-full animate-ping" />
              </div>
              <div>
                <h3 className="font-bold text-sm">User Online</h3>
                <p className="text-[11px] text-white/70">{pagination.total} pengguna aktif</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setPage(1); fetchOnline(1); }}
                disabled={loading}
                className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                title="Refresh"
              >
                <LuRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                title="Sembunyikan"
              >
                <LuChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto min-h-0" ref={scrollRef} onScroll={handleScroll}>
          {loading && users.length === 0 ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 bg-gray-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-200 rounded w-28" />
                    <div className="h-2.5 bg-gray-100 rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <LuUser className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Tidak ada user online</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {users.map((user, idx) => {
                const avatarUrl = getAvatarUrl(user.avatar);
                const DeviceIcon = deviceIcons[user.last_login?.device_type] || LuGlobe;
                const roleColor = ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700';
                const roleLabel = ROLE_LABELS[user.role] || user.role;

                return (
                  <div key={`${user.id}-${idx}`} className="px-4 py-2.5 hover:bg-gray-50/80 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0 mt-0.5">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={user.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center ${avatarUrl ? 'hidden' : ''}`}>
                            <span className="text-white font-bold text-sm">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        {/* Online dot */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-gray-900 leading-snug break-words" title={user.name}>
                          {user.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded ${roleColor}`}>
                            {roleLabel}
                          </span>
                          {user.last_login && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <DeviceIcon className="w-2.5 h-2.5" />
                              {user.last_login.browser}
                            </span>
                          )}
                        </div>
                        {/* Desa / Kecamatan / Dinas info */}
                        {(user.desa || user.kecamatan || user.dinas) && (
                          <div className="mt-1 space-y-0.5">
                            {user.desa && (
                              <p className="text-[10px] text-gray-500 flex items-center gap-1 leading-tight">
                                <LuHouse className="w-2.5 h-2.5 flex-shrink-0 text-green-500" />
                                <span className="truncate" title={user.desa.nama}>{user.desa.nama}</span>
                              </p>
                            )}
                            {user.kecamatan && (
                              <p className="text-[10px] text-gray-500 flex items-center gap-1 leading-tight">
                                <LuMapPin className="w-2.5 h-2.5 flex-shrink-0 text-violet-500" />
                                <span className="truncate" title={user.kecamatan.nama}>{user.kecamatan.nama}</span>
                              </p>
                            )}
                            {user.dinas && (
                              <p className="text-[10px] text-gray-500 flex items-center gap-1 leading-tight">
                                <LuBuilding2 className="w-2.5 h-2.5 flex-shrink-0 text-amber-500" />
                                <span className="truncate" title={user.dinas.nama_dinas || user.dinas.nama}>{user.dinas.nama_dinas || user.dinas.nama}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Time */}
                      <div className="flex-shrink-0 text-right mt-0.5">
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <LuClock className="w-2.5 h-2.5" />
                          {timeAgo(user.last_active_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Loading more indicator */}
          {loadingMore && (
            <div className="p-3 flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
              <span className="text-[11px] text-gray-400">Memuat lainnya...</span>
            </div>
          )}
          {/* End indicator */}
          {!loadingMore && page >= pagination.total_pages && users.length > ITEMS_PER_PAGE && (
            <div className="p-2 text-center">
              <span className="text-[10px] text-gray-300">Semua user ditampilkan</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
