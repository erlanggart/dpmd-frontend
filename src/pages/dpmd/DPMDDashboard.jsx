// src/pages/dpmd/DPMDDashboard.jsx
// Dashboard Tunggal Terintegrasi untuk semua role DPMD
// Menggantikan: KepalaDinasDashboard, SekretarisDinasDashboard, KepalaBidangDashboard, KetuaTimDashboard, PegawaiDashboard

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Briefcase, FileText, TrendingUp, Users,
  MapPin, Calendar, BarChart3, PieChart, Activity, Bell, Info, X,
  Clock, CheckCircle, Send, Mail, Inbox, ChevronRight, User, Phone, Award,
  FolderOpen, ClipboardList
} from 'lucide-react';
import api from '../../api';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import MobileHeader from '../../components/mobile/MobileHeader';
import ServiceGrid from '../../components/mobile/ServiceGrid';
import InfoCard from '../../components/mobile/InfoCard';
import SectionHeader from '../../components/mobile/SectionHeader';
import ActivityCard from '../../components/mobile/ActivityCard';
import { getUserAvatarUrl } from '../../utils/avatarUtils';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

// ==================== ROLE CONFIGURATION ====================
const ROLE_CONFIG = {
  kepala_dinas: {
    gradient: 'from-blue-600 via-blue-700 to-blue-800',
    notifGradient: 'from-blue-500 to-blue-600',
    notifBg: 'from-blue-50 to-blue-100',
    notifIconColor: 'text-blue-400',
    roleTitle: 'Kepala Dinas DPMD',
    primaryColor: 'blue',
    dashboardEndpoint: '/kepala-dinas/dashboard',
    showExecutiveStats: true,
    showDisposisi: false,
    showPegawaiInfo: false,
  },
  sekretaris_dinas: {
    gradient: 'from-purple-600 via-purple-700 to-purple-800',
    notifGradient: 'from-purple-500 to-violet-600',
    notifBg: 'from-purple-50 to-violet-100',
    notifIconColor: 'text-purple-400',
    roleTitle: 'Sekretaris Dinas DPMD',
    primaryColor: 'purple',
    dashboardEndpoint: null, // Uses disposisi
    showExecutiveStats: false,
    showDisposisi: true,
    showPegawaiInfo: false,
  },
  kepala_bidang: {
    gradient: 'from-indigo-600 via-indigo-700 to-indigo-800',
    notifGradient: 'from-indigo-500 to-indigo-600',
    notifBg: 'from-indigo-50 to-indigo-100',
    notifIconColor: 'text-indigo-400',
    roleTitle: 'Kepala Bidang',
    primaryColor: 'indigo',
    dashboardEndpoint: null,
    showExecutiveStats: false,
    showDisposisi: true,
    showPegawaiInfo: false,
  },
  ketua_tim: {
    gradient: 'from-teal-600 via-cyan-600 to-blue-600',
    notifGradient: 'from-teal-500 to-cyan-600',
    notifBg: 'from-teal-50 to-cyan-100',
    notifIconColor: 'text-teal-400',
    roleTitle: 'Ketua Tim',
    primaryColor: 'teal',
    dashboardEndpoint: null,
    showExecutiveStats: false,
    showDisposisi: true,
    showPegawaiInfo: false,
  },
  pegawai: {
    gradient: 'from-green-600 via-green-700 to-green-800',
    notifGradient: 'from-green-500 to-emerald-600',
    notifBg: 'from-green-50 to-emerald-100',
    notifIconColor: 'text-green-400',
    roleTitle: 'Pegawai DPMD',
    primaryColor: 'green',
    dashboardEndpoint: null,
    showExecutiveStats: false,
    showDisposisi: false,
    showPegawaiInfo: true,
  }
};

// Bidang name mapping
const BIDANG_MAP = {
  2: 'Sekretariat',
  3: 'SPKED',
  4: 'Kekayaan dan Keuangan Desa',
  5: 'Pemberdayaan Masyarakat Desa',
  6: 'Pemerintahan Desa',
  7: 'Tenaga Alih Daya',
  8: 'Tenaga Keamanan',
  9: 'Tenaga Kebersihan'
};

// Bidang path mapping
const BIDANG_PATH_MAP = {
  2: '/bidang/sekretariat',
  3: '/bidang/spked',
  4: '/bidang/kkd',
  5: '/bidang/pmd',
  6: '/bidang/pemdes',
  7: '/bidang/sekretariat',
  8: '/bidang/sekretariat',
  9: '/bidang/sekretariat'
};

// ==================== MAIN COMPONENT ====================
const DPMDDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [statistik, setStatistik] = useState(null);
  const [recentDisposisi, setRecentDisposisi] = useState([]);
  const [pegawaiData, setPegawaiData] = useState(null);
  const [jadwalStats, setJadwalStats] = useState({
    totalJadwal: 0,
    jadwalHariIni: 0,
    jadwalMendatang: 0
  });
  const [upcomingJadwal, setUpcomingJadwal] = useState([]);
  const [error, setError] = useState(null);

  // Get role config
  const role = user?.role || 'pegawai';
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.pegawai;

  // Get bidang name for kepala_bidang and ketua_tim
  const getBidangName = useCallback(() => {
    return BIDANG_MAP[user.bidang_id] || user.bidang_name || 'Bidang';
  }, [user.bidang_id, user.bidang_name]);

  const getBidangPath = useCallback(() => {
    return BIDANG_PATH_MAP[user.bidang_id] || '/bidang/sekretariat';
  }, [user.bidang_id]);

  // Get role title with bidang info
  const getRoleTitle = useMemo(() => {
    if (role === 'kepala_bidang') {
      return `Kepala Bidang ${getBidangName()}`;
    }
    if (role === 'ketua_tim') {
      return `Ketua Tim - ${getBidangName()}`;
    }
    return config.roleTitle;
  }, [role, config.roleTitle, getBidangName]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(updatedUser);
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []);

  // ==================== DATA FETCHING ====================
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const promises = [];

      // Fetch executive dashboard for kepala_dinas
      if (config.dashboardEndpoint) {
        const token = localStorage.getItem('expressToken');
        promises.push(
          axios.get(`${API_CONFIG.BASE_URL}${config.dashboardEndpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => ({ type: 'dashboard', data: res.data.data }))
          .catch(() => ({ type: 'dashboard', data: null }))
        );
      }

      // Fetch disposisi stats for sekretaris, kepala_bidang, ketua_tim
      if (config.showDisposisi) {
        promises.push(
          Promise.all([
            api.get('/disposisi/statistik'),
            api.get('/disposisi/masuk?limit=5')
          ]).then(([statsRes, disposisiRes]) => ({
            type: 'disposisi',
            data: { statistik: statsRes.data.data, recentDisposisi: disposisiRes.data.data || [] }
          })).catch(() => ({ type: 'disposisi', data: { statistik: null, recentDisposisi: [] } }))
        );
      }

      // Fetch pegawai info for pegawai role
      if (config.showPegawaiInfo && user.pegawai_id) {
        promises.push(
          api.get(`/pegawai/${user.pegawai_id}`)
            .then(res => ({ type: 'pegawai', data: res.data.data }))
            .catch(() => ({ type: 'pegawai', data: null }))
        );
      }

      // Fetch jadwal kegiatan for ketua_tim
      if (role === 'ketua_tim') {
        promises.push(
          api.get('/jadwal-kegiatan?limit=100')
            .then(res => {
              const jadwals = res.data.data || [];
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);

              const jadwalHariIni = jadwals.filter(j => {
                const jadwalDate = new Date(j.tanggal_mulai);
                jadwalDate.setHours(0, 0, 0, 0);
                return jadwalDate.getTime() === today.getTime();
              });

              const jadwalMendatang = jadwals.filter(j => {
                const jadwalDate = new Date(j.tanggal_mulai);
                return jadwalDate >= tomorrow;
              });

              const upcoming = jadwals
                .filter(j => new Date(j.tanggal_mulai) >= today)
                .sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai))
                .slice(0, 5);

              return {
                type: 'jadwal',
                data: {
                  stats: {
                    totalJadwal: jadwals.length,
                    jadwalHariIni: jadwalHariIni.length,
                    jadwalMendatang: jadwalMendatang.length
                  },
                  upcoming
                }
              };
            })
            .catch(() => ({ type: 'jadwal', data: { stats: {}, upcoming: [] } }))
        );
      }

      // Await all promises
      const results = await Promise.all(promises);

      // Process results
      results.forEach(result => {
        switch (result.type) {
          case 'dashboard':
            setDashboardData(result.data);
            break;
          case 'disposisi':
            setStatistik(result.data.statistik);
            setRecentDisposisi(result.data.recentDisposisi);
            break;
          case 'pegawai':
            setPegawaiData(result.data);
            break;
          case 'jadwal':
            setJadwalStats(result.data.stats);
            setUpcomingJadwal(result.data.upcoming);
            break;
        }
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Gagal memuat data dashboard');
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [config, user.pegawai_id, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==================== QUICK ACTIONS ====================
  const quickActions = useMemo(() => {
    const basePath = getBidangPath();
    
    // Common actions for all roles - using unified /dpmd paths
    const commonActions = [
      {
        icon: Briefcase,
        label: 'Perjadin',
        color: config.primaryColor,
        onClick: () => navigate('/dpmd/perjadin')
      },
      {
        icon: Calendar,
        label: 'Jadwal',
        color: 'blue',
        onClick: () => navigate('/dpmd/jadwal-kegiatan')
      },
      {
        icon: Info,
        label: 'Informasi',
        color: 'orange',
        onClick: () => navigate('/core-dashboard/informasi')
      }
    ];

    // Role-specific actions
    if (role === 'kepala_dinas') {
      return [
        ...commonActions,
        {
          icon: BarChart3,
          label: 'Statistik',
          color: 'purple',
          onClick: () => navigate('/core-dashboard/dashboard')
        }
      ];
    }

    if (role === 'sekretaris_dinas' || role === 'kepala_bidang') {
      return [
        {
          icon: Mail,
          label: 'Disposisi',
          color: config.primaryColor,
          onClick: () => navigate('/dpmd/disposisi')
        },
        ...commonActions.slice(0, 2),
        {
          icon: FolderOpen,
          label: 'Produk Hukum',
          color: 'cyan',
          onClick: () => navigate(`${basePath}/produk-hukum`)
        }
      ];
    }

    if (role === 'ketua_tim') {
      return [
        {
          icon: Calendar,
          label: 'Jadwal',
          color: 'teal',
          onClick: () => navigate('/dpmd/jadwal-kegiatan')
        },
        {
          icon: ClipboardList,
          label: 'Disposisi',
          color: 'blue',
          onClick: () => navigate('/dpmd/disposisi')
        },
        {
          icon: FolderOpen,
          label: 'Bidang',
          color: 'indigo',
          onClick: () => navigate(basePath)
        }
      ];
    }

    return commonActions;
  }, [role, config.primaryColor, navigate, getBidangPath]);

  // ==================== HELPERS ====================
  const formatTanggal = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white font-semibold text-lg">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  // ==================== ERROR STATE ====================
  if (error && !dashboardData && !statistik && !pegawaiData) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${config.gradient} p-4 flex items-center justify-center`}>
        <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-center font-bold text-gray-800 text-xl mb-2">Oops!</h3>
          <p className="text-center text-gray-600 text-sm mb-6">{error}</p>
          <button
            onClick={fetchData}
            className={`w-full bg-gradient-to-r ${config.gradient} text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg active:scale-95 transition-all`}
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const notifCount = statistik?.masuk?.pending || 0;

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-4">
      {/* Mobile Header */}
      <MobileHeader
        userName={user.name || pegawaiData?.nama_pegawai?.split(' ')[0] || 'User'}
        userRole={getRoleTitle}
        greeting="Selamat Datang"
        gradient={config.gradient}
        notificationCount={notifCount}
        onNotificationClick={() => setShowNotifications(!showNotifications)}
        avatar={getUserAvatarUrl(user)}
      />

      {/* Notification Popup */}
      {showNotifications && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowNotifications(false)}
          />
          
          <div className="fixed top-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100 animate-slideDown">
            {/* Header */}
            <div className={`relative bg-gradient-to-r ${config.notifGradient} px-5 py-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Notifikasi</h3>
                    <p className="text-xs text-white/80">
                      {notifCount > 0 ? `${notifCount} notifikasi baru` : 'Tidak ada notifikasi baru'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
              {notifCount > 0 ? (
                <div className="p-4">
                  <div 
                    className={`group relative bg-gradient-to-br ${config.notifBg} rounded-xl p-4 border border-${config.primaryColor}-100 hover:border-${config.primaryColor}-300 cursor-pointer transition-all hover:shadow-md`}
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/dpmd/disposisi');
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 bg-gradient-to-br ${config.notifGradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-gray-800 text-sm">Disposisi Pending</h4>
                          <span className={`px-2 py-1 bg-${config.primaryColor}-600 text-white text-xs font-bold rounded-full`}>
                            {notifCount}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Anda memiliki {notifCount} disposisi yang menunggu tindakan
                        </p>
                        <div className={`flex items-center gap-2 text-xs text-${config.primaryColor}-600 font-medium group-hover:text-${config.primaryColor}-700`}>
                          <span>Klik untuk melihat detail</span>
                          <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className={`mx-auto mb-4 h-20 w-20 bg-gradient-to-br ${config.notifBg} rounded-2xl flex items-center justify-center`}>
                    <Bell className={`h-10 w-10 ${config.notifIconColor}`} />
                  </div>
                  <h4 className="font-semibold text-gray-700 mb-1">Belum Ada Notifikasi</h4>
                  <p className="text-sm text-gray-500">Notifikasi penting akan muncul di sini</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        {/* Quick Actions Section */}
        <div className="bg-white rounded-[24px] sm:rounded-[28px] shadow-lg shadow-gray-200/60 p-5 sm:p-6 mb-5 border border-gray-100">
         
          <ServiceGrid services={quickActions} columns={quickActions.length > 3 ? 4 : 3} />
        </div>

        {/* KEPALA DINAS: Executive Stats */}
        {config.showExecutiveStats && dashboardData?.summary && (
          <>
            <div className="mb-5">
              <SectionHeader 
                title="Ringkasan" 
                subtitle="Data keseluruhan sistem"
                icon={Activity}
              />
              <div className="grid grid-cols-2 gap-3">
                <InfoCard
                  icon={MapPin}
                  title="Total Desa"
                  value={dashboardData.summary.total_desa || 0}
                  color="blue"
                  onClick={() => navigate('/core-dashboard/laporan-desa')}
                />
                <InfoCard
                  icon={Users}
                  title="Pegawai"
                  value={dashboardData.summary.total_pegawai || 0}
                  color="purple"
                />
              </div>
            </div>

            {/* Data Visualization Cards */}
            <div className="mb-5">
              <SectionHeader 
                title="Visualisasi Data" 
                subtitle="Grafik dan analisis"
                icon={PieChart}
              />
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => navigate('/core-dashboard/statistik-bankeu')}
                  className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white cursor-pointer active:scale-95 transition-transform shadow-lg"
                >
                  <PieChart className="w-8 h-8 mb-3" />
                  <h4 className="font-bold text-sm mb-1">Statistik Bankeu</h4>
                  <p className="text-xs text-green-100">Lihat detail</p>
                </div>
                <div 
                  onClick={() => navigate('/core-dashboard/statistik-add')}
                  className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white cursor-pointer active:scale-95 transition-transform shadow-lg"
                >
                  <BarChart3 className="w-8 h-8 mb-3" />
                  <h4 className="font-bold text-sm mb-1">Statistik ADD</h4>
                  <p className="text-xs text-purple-100">Lihat detail</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* SEKRETARIS/KEPALA_BIDANG: Disposisi Stats */}
        {config.showDisposisi && statistik && (
          <>
            <div className="mb-5">
              <SectionHeader 
                title="Statistik Disposisi" 
                subtitle="Ringkasan surat masuk & keluar"
                icon={Activity}
              />
              <div className="grid grid-cols-2 gap-3">
                <InfoCard
                  icon={Clock}
                  title="Pending"
                  value={statistik?.masuk?.pending || 0}
                  color="yellow"
                  badge={statistik?.masuk?.pending > 5 ? '!' : null}
                  onClick={() => navigate('/dpmd/disposisi?filter=pending')}
                />
                <InfoCard
                  icon={TrendingUp}
                  title="Diproses"
                  value={(statistik?.masuk?.dibaca || 0) + (statistik?.masuk?.proses || 0)}
                  color="blue"
                />
                <InfoCard
                  icon={CheckCircle}
                  title="Selesai"
                  value={statistik?.masuk?.selesai || 0}
                  color="green"
                />
                <InfoCard
                  icon={Send}
                  title="Diteruskan"
                  value={statistik?.keluar?.total || 0}
                  color="purple"
                />
              </div>
            </div>

            {/* Recent Disposisi */}
            <div className="mb-5">
              <SectionHeader 
                title="Disposisi Terbaru" 
                subtitle="Surat yang perlu ditindaklanjuti"
                icon={FileText}
                actionText="Lihat Semua"
                onActionClick={() => navigate('/dpmd/disposisi')}
              />
              
              {recentDisposisi.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                  <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-400 font-medium">Tidak ada disposisi terbaru</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDisposisi.slice(0, 5).map((disposisi) => (
                    <ActivityCard
                      key={disposisi.id}
                      icon={Mail}
                      title={disposisi.surat?.perihal || 'Tanpa Perihal'}
                      subtitle={`Dari: ${disposisi.dari_user?.name || 'Unknown'}`}
                      time={formatTanggal(disposisi.tanggal_disposisi)}
                      status={disposisi.status === 'pending' ? 'pending' : 
                              disposisi.status === 'selesai' ? 'success' : 'info'}
                      onClick={() => navigate(`/dpmd/disposisi/${disposisi.id}`)}
                      badge={disposisi.status === 'pending' ? 1 : null}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* KETUA_TIM: Jadwal Stats */}
        {role === 'ketua_tim' && (
          <>
            <div className="mb-5">
              <SectionHeader 
                title="Statistik Kegiatan" 
                subtitle="Ringkasan jadwal"
                icon={Activity}
              />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <InfoCard
                  icon={Calendar}
                  title="Total Kegiatan"
                  value={jadwalStats.totalJadwal}
                  color="blue"
                />
                <InfoCard
                  icon={Clock}
                  title="Hari Ini"
                  value={jadwalStats.jadwalHariIni}
                  color="green"
                />
                <InfoCard
                  icon={TrendingUp}
                  title="Mendatang"
                  value={jadwalStats.jadwalMendatang}
                  color="purple"
                />
                <InfoCard
                  icon={Bell}
                  title="Disposisi"
                  value={statistik?.masuk?.pending || 0}
                  color="orange"
                  onClick={() => navigate('/ketua-tim/disposisi')}
                />
              </div>
            </div>

            {/* Upcoming Jadwal */}
            <div className="mb-5">
              <SectionHeader 
                title="Kegiatan Mendatang" 
                subtitle="Jadwal dalam waktu dekat"
                icon={Calendar}
                actionText="Lihat Semua"
                onActionClick={() => navigate('/ketua-tim/jadwal-kegiatan')}
              />
              
              {upcomingJadwal.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                  <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500 font-medium">Tidak ada kegiatan mendatang</p>
                  <p className="text-sm text-gray-400 mt-1">Jadwal kegiatan akan muncul di sini</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingJadwal.map((jadwal) => (
                    <ActivityCard
                      key={jadwal.id}
                      icon={Calendar}
                      title={jadwal.judul}
                      subtitle={`📍 ${jadwal.lokasi || 'Lokasi belum ditentukan'}`}
                      time={formatTanggal(jadwal.tanggal_mulai)}
                      status="info"
                      onClick={() => navigate('/ketua-tim/jadwal-kegiatan')}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* PEGAWAI: Profile Info */}
        {config.showPegawaiInfo && pegawaiData && (
          <>
            <div className="mb-5">
              <SectionHeader 
                title="Informasi Pegawai" 
                subtitle="Data profil dan kontak"
                icon={User}
              />
              <div className="space-y-3">
                {/* Bidang */}
                {pegawaiData?.bidang?.nama_bidang && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-blue-600 font-medium mb-0.5">Bidang</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{pegawaiData.bidang.nama_bidang}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Unit Kerja</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-purple-600 font-medium mb-0.5">Email</p>
                      <p className="text-sm font-bold text-gray-900 truncate break-all">{pegawaiData?.users?.[0]?.email || user.email || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* NIP */}
                {pegawaiData?.nip && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-green-600 font-medium mb-0.5">NIP</p>
                        <p className="text-sm font-bold text-gray-900">{pegawaiData.nip}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phone */}
                {pegawaiData?.no_hp && (
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-orange-600 font-medium mb-0.5">No. HP</p>
                        <p className="text-sm font-bold text-gray-900">{pegawaiData.no_hp}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info */}
            {(pegawaiData?.pangkat || pegawaiData?.golongan) && (
              <div className="mb-5">
                <SectionHeader 
                  title="Informasi Tambahan" 
                  subtitle="Detail pegawai"
                  icon={FileText}
                />
                <div className="grid grid-cols-2 gap-3">
                  {pegawaiData?.pangkat && (
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 border border-indigo-200">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-3">
                          <Award className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-xs text-indigo-600 font-medium mb-1">Pangkat</p>
                        <p className="text-sm font-bold text-gray-900 break-words">{pegawaiData.pangkat}</p>
                      </div>
                    </div>
                  )}
                  {pegawaiData?.golongan && (
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-3">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-xs text-orange-600 font-medium mb-1">Golongan</p>
                        <p className="text-sm font-bold text-gray-900">{pegawaiData.golongan}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Activity Summary for all roles */}
        <div className="mb-5">
          <SectionHeader 
            title="Aktivitas Terkini" 
            subtitle="Update terbaru sistem"
            icon={Activity}
          />
          <div className="space-y-3">
            <ActivityCard
              icon={FileText}
              title="Dashboard Aktif"
              subtitle="Semua data loaded dengan sukses"
              time="Baru saja"
              status="success"
            />
            <ActivityCard
              icon={Activity}
              title="Sistem Berjalan Normal"
              subtitle="Semua layanan aktif"
              time="Live"
              status="success"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-gray-400 text-xs">
            Dashboard diperbarui secara real-time
          </p>
          <p className="text-gray-400 text-xs mt-1">
            DPMD Kabupaten Bogor © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DPMDDashboard;
