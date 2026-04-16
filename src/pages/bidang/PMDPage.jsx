import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useBidangPath } from "../../hooks/useBidangPath";
import {
  Users,
  Activity,
  ArrowLeft,
  Clock,
  UserCheck,
  RefreshCw,
  Info,
  ChevronRight,
  FileText,
  Scale,
  Building2,
} from "lucide-react";
import api from "../../api";
import toast from "react-hot-toast";
import DaftarPegawaiBidang from "../../components/bidang/DaftarPegawaiBidang";

const PMDPage = () => {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const [loading, setLoading] = useState(true);
  const [_data, setData] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState("");

  // Menu configuration - single source of truth
  const menus = [
    {
      id: 'lkd',
      title: 'Lembaga Kemasyarakatan Desa',
      shortTitle: 'LKD',
      description: 'RW, RT, Posyandu, Karang Taruna, LPM, PKK, Satlinmas',
      icon: Building2,
      route: getPath('/bidang/pmd/kelembagaan'),
      gradient: 'from-purple-500 to-indigo-600',
      bgLight: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      iconBg: 'bg-purple-500',
      textColor: 'text-purple-700',
      descColor: 'text-purple-500',
    },
    {
      id: 'lainnya',
      title: 'Kelembagaan Lainnya',
      shortTitle: 'Lainnya',
      description: 'Kelembagaan dan organisasi lainnya di desa',
      icon: Users,
      route: getPath('/bidang/pmd/kelembagaan/lainnya'),
      gradient: 'from-blue-500 to-cyan-600',
      bgLight: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      iconBg: 'bg-blue-500',
      textColor: 'text-blue-700',
      descColor: 'text-blue-500',
    },
    {
      id: 'pengurus',
      title: 'Pengurus Kelembagaan',
      shortTitle: 'Pengurus',
      description: 'Kelola data pengurus dan anggota kelembagaan',
      icon: UserCheck,
      route: getPath('/bidang/pmd/pengurus'),
      gradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
      iconBg: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      descColor: 'text-emerald-500',
    },
    {
      id: 'produk-hukum',
      title: 'Produk Hukum Desa',
      shortTitle: 'Produk Hukum',
      description: 'Perdes, Perkades, dan Keputusan Kepala Desa',
      icon: Scale,
      route: getPath('/bidang/pmd/produk-hukum'),
      gradient: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
      iconBg: 'bg-amber-500',
      textColor: 'text-amber-700',
      descColor: 'text-amber-500',
    },
    {
      id: 'posyandu-comparison',
      title: 'Perbandingan Posyandu',
      shortTitle: 'Posyandu',
      description: 'Perbandingan data Posyandu antara Gema dan ADD',
      icon: FileText,
      route: getPath('/bidang/pmd/kelembagaan/posyandu-comparison'),
      gradient: 'from-red-500 to-orange-600',
      bgLight: 'bg-red-50 border-red-200 hover:bg-red-100',
      iconBg: 'bg-red-500',
      textColor: 'text-red-700',
      descColor: 'text-red-500',
    }
  ];

  const fetchActivityLogs = useCallback(async () => {
    try {
      setActivityLoading(true);
      const params = activityFilter ? { module: activityFilter } : {};
      const response = await api.get("/bidang/5/activity-logs", { params });
      if (response.data.success) {
        setActivityLogs(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      toast.error("Gagal memuat log aktivitas");
    } finally {
      setActivityLoading(false);
    }
  }, [activityFilter]);

  useEffect(() => {
    fetchDashboard();
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get("/bidang/5/dashboard");
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      toast.error("Gagal memuat data bidang");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  const getActionColor = (action) => {
    const colors = {
      create: "text-green-600 bg-green-50",
      update: "text-blue-600 bg-blue-50",
      delete: "text-red-600 bg-red-50",
      approve: "text-purple-600 bg-purple-50",
      reject: "text-orange-600 bg-orange-50",
      upload: "text-teal-600 bg-teal-50",
      download: "text-gray-600 bg-gray-50",
    };
    return colors[action] || "text-gray-600 bg-gray-50";
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari yang lalu`;

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => navigate(-1)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Kembali"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    Bidang PMD
                  </h1>
                  <p className="hidden sm:block text-xs sm:text-sm text-gray-500">
                    Pemberdayaan Masyarakat Desa
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Menu Grid */}
            {/* Mobile: 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              {menus.map((menu) => {
                const Icon = menu.icon;
                return (
                  <button
                    key={menu.id}
                    onClick={() => navigate(menu.route)}
                    className={`flex flex-col items-center gap-2 bg-gradient-to-br ${menu.gradient} rounded-xl shadow-lg p-4 active:scale-95 transition-transform`}
                  >
                    <div className="h-11 w-11 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white text-center leading-tight">
                      {menu.shortTitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Desktop: Card Grid */}
            <div className="hidden sm:grid sm:grid-cols-2 gap-4">
              {menus.map((menu) => {
                const Icon = menu.icon;
                return (
                  <button
                    key={menu.id}
                    onClick={() => navigate(menu.route)}
                    className={`group relative bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 p-5 transition-all duration-300 text-left overflow-hidden hover:-translate-y-0.5`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 ${menu.iconBg} rounded-xl flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-gray-800 text-base mb-1 group-hover:${menu.textColor} transition-colors`}>
                          {menu.title}
                        </h3>
                        <p className="text-sm text-gray-500 leading-snug">
                          {menu.description}
                        </p>
                      </div>
                    </div>
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${menu.gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl`}></div>
                  </button>
                );
              })}
            </div>

            {/* Daftar Pegawai Bidang */}
            <DaftarPegawaiBidang bidangId={5} bidangName="Bidang PMD" />
          </div>

          {/* Right Column - Activity Log */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Activity className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-800">Log Aktivitas</h3>
                  </div>
                  <button
                    onClick={fetchActivityLogs}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-600" />
                  </button>
                </div>

                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-gray-50"
                >
                  <option value="">Semua Modul</option>
                  <option value="kelembagaan">Kelembagaan</option>
                  <option value="produk_hukum">Produk Hukum</option>
                </select>
              </div>

              {/* Activity List */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-h-[calc(100vh-280px)] overflow-y-auto">
                {activityLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Belum ada aktivitas</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div
                              className={`h-8 w-8 rounded-lg ${getActionColor(log.action)} flex items-center justify-center font-bold text-xs uppercase shadow-sm`}
                            >
                              {log.action.substring(0, 2)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-800 font-medium mb-1 leading-relaxed">
                              {log.description}
                            </p>
                            <div className="flex flex-col gap-1 text-xs text-gray-500">
                              <span className="font-medium truncate">
                                {log.userName}
                              </span>
                              <div className="flex items-center gap-1 text-xs">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {formatTime(log.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PMDPage;
