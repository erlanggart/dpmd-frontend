import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuActivity,
  LuRefreshCw,
  LuClock,
  LuPlus,
  LuPencil,
  LuRefreshCcw,
  LuCircleCheck,
  LuUserPlus,
  LuUserCheck,
  LuMapPin,
  LuChevronRight,
} from "react-icons/lu";
import { getAllActivityLogs } from "../../services/activityLogs";

const KelembagaanActivityList = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const logsContainerRef = React.useRef(null);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchLogs(1, true); // Initial load
  }, []);

  // Infinite scroll handler
  useEffect(() => {
    const container = logsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Check if scrolled to bottom (with 50px threshold)
      if (scrollHeight - scrollTop - clientHeight < 50) {
        if (!loadingMore && hasMore && !loading) {
          fetchLogs(page + 1, false);
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [page, loadingMore, hasMore, loading]);

  const fetchLogs = async (pageNum, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setPage(1);
        setLogs([]);
      } else {
        setLoadingMore(true);
      }

      // Fetch from kelembagaan_activity_logs table with pagination
      const offset = (pageNum - 1) * ITEMS_PER_PAGE;
      const response = await getAllActivityLogs({ 
        limit: ITEMS_PER_PAGE,
        offset: offset 
      });
      
      const newLogs = response?.data?.logs || [];
      
      if (isInitial) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }

      // Check if there are more items
      if (newLogs.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      } else {
        setHasMore(true);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      if (isInitial) {
        setLogs([]);
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const handleLogClick = (log) => {
    // Navigate based on entity_type
    if (log.entity_type === 'lembaga' && log.kelembagaan_type && log.kelembagaan_id) {
      // Navigate to kelembagaan detail page
      navigate(`/bidang/pmd/kelembagaan/${log.kelembagaan_type}/${log.kelembagaan_id}`);
    } else if (log.entity_type === 'pengurus' && log.entity_id) {
      // Navigate to pengurus detail page
      navigate(`/bidang/pmd/pengurus/${log.entity_id}`);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getActivityIcon = (activityType) => {
    const iconProps = "w-4 h-4";
    switch (activityType) {
      case "create":
        return <LuPlus className={`${iconProps} text-green-600`} />;
      case "update":
        return <LuPencil className={`${iconProps} text-blue-600`} />;
      case "toggle_status":
        return <LuRefreshCcw className={`${iconProps} text-orange-600`} />;
      case "verify":
        return <LuCircleCheck className={`${iconProps} text-purple-600`} />;
      case "add_pengurus":
        return <LuUserPlus className={`${iconProps} text-teal-600`} />;
      case "update_pengurus":
        return <LuPencil className={`${iconProps} text-indigo-600`} />;
      case "toggle_pengurus_status":
        return <LuRefreshCcw className={`${iconProps} text-amber-600`} />;
      case "verify_pengurus":
        return <LuUserCheck className={`${iconProps} text-emerald-600`} />;
      default:
        return <LuActivity className={`${iconProps} text-gray-600`} />;
    }
  };

  const getActionColor = (activityType) => {
    switch (activityType) {
      case "create":
        return "bg-green-100 text-green-700";
      case "update":
        return "bg-blue-100 text-blue-700";
      case "toggle_status":
        return "bg-orange-100 text-orange-700";
      case "verify":
        return "bg-purple-100 text-purple-700";
      case "add_pengurus":
        return "bg-teal-100 text-teal-700";
      case "update_pengurus":
        return "bg-indigo-100 text-indigo-700";
      case "toggle_pengurus_status":
        return "bg-amber-100 text-amber-700";
      case "verify_pengurus":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <LuActivity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Log Aktivitas</h3>
              <p className="text-xs text-purple-100">
                Riwayat aktivitas kelembagaan
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchLogs(1, true)}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <LuRefreshCw
              className={`h-4 w-4 text-white ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div 
        ref={logsContainerRef}
        className="max-h-[80vh] overflow-y-auto"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-3"></div>
            <p className="text-sm text-gray-500">Memuat riwayat aktivitas...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <LuActivity className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-600 mb-2">
              Belum ada aktivitas
            </h4>
            <p className="text-sm text-gray-500">
              Riwayat aktivitas akan tampil di sini
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div
                key={log.id}
                onClick={() => handleLogClick(log)}
                className="p-4 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
                title="Klik untuk lihat detail"
              >
                <div className="flex gap-3">
                  {/* Icon Badge */}
                  <div className="flex-shrink-0">
                    <div
                      className={`h-9 w-9 rounded-lg ${getActionColor(
                        log.activity_type
                      )} flex items-center justify-center shadow-sm`}
                    >
                      {getActivityIcon(log.activity_type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Description */}
                    <p className="text-sm text-gray-800 font-medium mb-1.5 leading-relaxed">
                      {log.action_description}
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-col gap-1.5">
                      {/* Kelembagaan Name - tampilkan jika bukan UUID */}
                      {(() => {
                        // Check if kelembagaan_nama is UUID pattern (8-4-4-4-12 hex chars)
                        const isUUID = log.kelembagaan_nama && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(log.kelembagaan_nama);
                        
                        if (log.kelembagaan_nama && !isUUID) {
                          return (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <LuActivity className="h-3 w-3 flex-shrink-0" />
                              <span className="font-medium truncate">
                                {log.kelembagaan_nama}
                              </span>
                              {log.kelembagaan_type && (
                                <span className="text-gray-400">
                                  ({log.kelembagaan_type.toUpperCase()})
                                </span>
                              )}
                            </div>
                          );
                        } else if (log.kelembagaan_type) {
                          // Fallback: hanya tampilkan type jika nama adalah UUID
                          return (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <LuActivity className="h-3 w-3 flex-shrink-0" />
                              <span className="font-medium">
                                {log.kelembagaan_type.toUpperCase()}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Desa Name */}
                      {log.desas?.nama && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <LuMapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            Desa {log.desas.nama}
                            {log.desas.kecamatans?.nama &&
                              `, Kec. ${log.desas.kecamatans.nama}`}
                          </span>
                        </div>
                      )}

                      {/* User & Time */}
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                        <span className="font-medium truncate">
                          {log.users?.name || log.user_name || "System"}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <LuClock className="h-3 w-3" />
                          <span>{formatTime(log.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chevron indicator */}
                  <div className="flex-shrink-0 self-center">
                    <LuChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </div>
            ))}

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="p-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span>Memuat lebih banyak...</span>
              </div>
            )}

            {/* No More Data Indicator */}
            {!hasMore && logs.length > 0 && (
              <div className="p-4 text-center text-xs text-gray-400">
                Semua aktivitas telah ditampilkan
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {!loading && logs.length > 0 && (
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Menampilkan {logs.length} aktivitas {hasMore && '• Scroll untuk memuat lebih banyak'}
          </p>
        </div>
      )}
    </div>
  );
};

export default KelembagaanActivityList;
