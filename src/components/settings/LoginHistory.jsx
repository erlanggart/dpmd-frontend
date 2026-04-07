import { useState, useEffect } from 'react';
import { FiMonitor, FiSmartphone, FiTablet, FiGlobe, FiClock, FiRefreshCw, FiChevronLeft, FiChevronRight, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import api from '../../api';

const deviceIcons = {
  desktop: FiMonitor,
  mobile: FiSmartphone,
  tablet: FiTablet,
  unknown: FiGlobe
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 30) return `${diffDay} hari lalu`;
  return formatDate(dateStr);
};

export default function LoginHistory() {
  const [histories, setHistories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchHistory = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/settings/login-history?page=${p}&limit=10`);
      if (res.data.success) {
        setHistories(res.data.data.histories);
        setPagination(res.data.data.pagination);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Riwayat Login</h2>
            <p className="text-sm text-gray-500 mt-1">
              {pagination.total > 0 ? `${pagination.total} catatan login` : 'Belum ada catatan login'}
            </p>
          </div>
          <button
            onClick={() => fetchHistory(page)}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={`text-lg ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && histories.length === 0 ? (
        <div className="p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-3 bg-gray-200 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : histories.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <FiGlobe className="text-4xl mx-auto mb-3 text-gray-300" />
          <p>Belum ada catatan login</p>
          <p className="text-sm mt-1">Riwayat login akan muncul setelah login berikutnya</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {histories.map((h, idx) => {
              const DeviceIcon = deviceIcons[h.device_type] || FiGlobe;
              const isFirst = idx === 0 && page === 1;
              
              return (
                <div
                  key={h.id}
                  className={`p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${
                    isFirst ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {/* Device Icon */}
                  <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                    h.status === 'success'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    <DeviceIcon className="text-lg" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">
                        {h.browser || 'Unknown'} di {h.os || 'Unknown'}
                      </span>
                      {isFirst && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          Sesi terakhir
                        </span>
                      )}
                      {h.status === 'failed' && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <FiXCircle className="text-xs" /> Gagal
                        </span>
                      )}
                      {h.status === 'success' && !isFirst && (
                        <FiCheckCircle className="text-green-500 text-sm" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <FiGlobe className="text-xs" />
                        {h.ip_address || '-'}
                      </span>
                      <span className="hidden sm:inline text-gray-300">•</span>
                      <span className="capitalize">{h.device_type || '-'}</span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm text-gray-500 flex items-center gap-1 justify-end">
                      <FiClock className="text-xs" />
                      {timeAgo(h.created_at)}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                      {formatDate(h.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Halaman {pagination.page} dari {pagination.total_pages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                  disabled={page >= pagination.total_pages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
