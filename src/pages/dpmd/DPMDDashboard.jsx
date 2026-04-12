// src/pages/dpmd/DPMDDashboard.jsx
// Dashboard Tunggal Terintegrasi untuk semua role DPMD
// Menggantikan: KepalaDinasDashboard, SekretarisDinasDashboard, KepalaBidangDashboard, KetuaTimDashboard, PegawaiDashboard

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Building2, Briefcase, FileText, TrendingUp, Users,
  MapPin, Calendar, BarChart3, PieChart, Activity, Bell, Info, X, ExternalLink,
  Clock, CheckCircle, Send, Mail, Inbox, ChevronRight, User, Phone, Award,
  FolderOpen, ClipboardList, Newspaper, Fingerprint, MessageSquare
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
import BirthdayPopup from '../../components/BirthdayPopup';

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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [statistik, setStatistik] = useState(null);
  const [recentDisposisi, setRecentDisposisi] = useState([]);
  const [pegawaiData, setPegawaiData] = useState(null);
  const [sekretariatData, setSekretariatData] = useState(null);
  const [jadwalStats, setJadwalStats] = useState({
    totalJadwal: 0,
    jadwalHariIni: 0,
    jadwalMendatang: 0
  });
  const [upcomingJadwal, setUpcomingJadwal] = useState([]);
  const [error, setError] = useState(null);
  const [informasiList, setInformasiList] = useState([]);
  const [currentInformasiIndex, setCurrentInformasiIndex] = useState(0);
  const [showInformasiModal, setShowInformasiModal] = useState(false);
  const [selectedInformasi, setSelectedInformasi] = useState(null);

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

  // ==================== NOTIFICATIONS ====================
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/push-notification/notifications?limit=20');
      if (response.data.success) {
        setNotifications(response.data.data || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    const handleNewNotification = () => fetchNotifications();
    window.addEventListener('newNotification', handleNewNotification);
    return () => {
      clearInterval(interval);
      window.removeEventListener('newNotification', handleNewNotification);
    };
  }, [fetchNotifications]);

  // ==================== UNREAD MESSAGES ====================
  const fetchUnreadMessages = useCallback(async () => {
    try {
      const response = await api.get('/messaging/unread-count');
      if (response.data.success) {
        setUnreadMessages(response.data.data?.count || 0);
      }
    } catch (error) {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadMessages]);

  // Listen for push notifications from Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handlePushMessage = (event) => {
      if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
        const { payload } = event.data;
        setUnreadCount(prev => prev + 1);
        setNotifications(prev => [{
          id: Date.now(),
          title: payload.title || 'Notifikasi Baru',
          message: payload.body || payload.message || 'Anda memiliki notifikasi baru',
          timestamp: new Date().toISOString(),
          read: false,
          type: payload.data?.type || 'general',
          data: payload.data
        }, ...prev]);
      }
    };
    navigator.serviceWorker.addEventListener('message', handlePushMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handlePushMessage);
  }, []);

  const handleNotificationClick = useCallback(async () => {
    setShowNotifications(prev => {
      const willOpen = !prev;
      if (willOpen) {
        // Mark all as read when opening
        api.post('/push-notification/notifications/mark-read', { all: true })
          .then(() => {
            setNotifications(n => n.map(item => ({ ...item, read: true })));
            setUnreadCount(0);
          })
          .catch(() => {});
      }
      return willOpen;
    });
  }, []);

  const handleNotificationItemClick = async (notification) => {
    if (!notification.read) {
      try {
        await api.post('/push-notification/notifications/mark-read', { ids: [notification.id] });
        setNotifications(prev => prev.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    const notifType = notification.data?.type || notification.type || '';
    if (notifType === 'today_schedule' || notifType === 'tomorrow_schedule') {
      const targetDate = notification.data?.targetDate || '';
      const dateParam = targetDate ? `?tanggal=${targetDate}` : '';
      navigate(`/dpmd/jadwal-kegiatan${dateParam}`);
    } else if (notification.data?.url) {
      navigate(notification.data.url);
    } else if (notifType === 'disposisi' || notifType === 'new_disposisi' || notifType === 'disposisi_update') {
      navigate('/dpmd/disposisi');
    } else if (notifType === 'kegiatan') {
      navigate('/dpmd/jadwal-kegiatan');
    }
    setShowNotifications(false);
  };

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

      // Fetch sekretariat info for all roles (individual endpoints)
      promises.push(
        Promise.all([
          api.get('/disposisi/statistik').catch(() => ({ data: { data: null } })),
          api.get('/perjadin/dashboard').catch(() => ({ data: { data: null } })),
          api.get('/pegawai').catch(() => ({ data: { data: [] } }))
        ]).then(([disposisiRes, perjadinRes, pegawaiRes]) => ({
          type: 'sekretariat',
          data: {
            stats: {
              disposisi_pending: disposisiRes.data?.data?.masuk?.pending ?? 0,
              perjadin_bulan_ini: perjadinRes.data?.data?.bulan_ini ?? 0,
              total_pegawai: Array.isArray(pegawaiRes.data?.data) ? pegawaiRes.data.data.length : 0
            }
          }
        })).catch(() => ({ type: 'sekretariat', data: null }))
      );

      // Fetch informasi banners
      promises.push(
        api.get('/informasi/public')
          .then(res => ({
            type: 'informasi',
            data: res.data.success && res.data.data?.length > 0 ? res.data.data : []
          }))
          .catch(() => ({ type: 'informasi', data: [] }))
      );

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
          case 'sekretariat':
            setSekretariatData(result.data);
            break;
          case 'jadwal':
            setJadwalStats(result.data.stats);
            setUpcomingJadwal(result.data.upcoming);
            break;
          case 'informasi':
            setInformasiList(result.data);
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

  // Rotate informasi every 5 seconds
  useEffect(() => {
    if (informasiList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentInformasiIndex(prev => (prev + 1) % informasiList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [informasiList.length]);

  // ==================== QUICK ACTIONS ====================
  const ABSENSI_ELIGIBLE_STATUS = ['PPPK Paruh Waktu', 'Tenaga Alih Daya', 'Tenaga Keamanan', 'Tenaga Kebersihan'];
  const isAbsensiEligible = ABSENSI_ELIGIBLE_STATUS.includes(user.status_kepegawaian);

  const quickActions = useMemo(() => {
    const basePath = getBidangPath();
    
    // Common actions for all roles - using unified /dpmd paths
    const commonActions = [
      {
        icon: MessageSquare,
        label: 'Pesan',
        color: 'indigo',
        badge: unreadMessages || null,
        onClick: () => navigate('/dpmd/pesan')
      },
      isAbsensiEligible
        ? {
            icon: Fingerprint,
            label: 'Presensi',
            color: 'rose',
            onClick: () => navigate('/dpmd/absensi')
          }
        : {
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
        icon: Mail,
        label: 'Disposisi',
        color: 'orange',
        onClick: () => navigate('/dpmd/disposisi')
      }
    ];

    // Role-specific actions
    if (role === 'kepala_dinas') {
      return commonActions;
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
  }, [role, config.primaryColor, navigate, getBidangPath, isAbsensiEligible, unreadMessages]);

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

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-4">
      {/* Birthday Popup */}
      <BirthdayPopup />

      {/* Mobile Header */}
      <MobileHeader
        userName={user.name || pegawaiData?.nama_pegawai?.split(' ')[0] || 'User'}
        userRole={getRoleTitle}
        bidangName={role === 'pegawai' ? getBidangName() : undefined}
        greeting="Selamat Datang"
        gradient={config.gradient}
        notificationCount={unreadCount}
        onNotificationClick={handleNotificationClick}
        avatar={getUserAvatarUrl(user)}
      />

      {/* Notification Panel */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed top-0 left-0 right-0 lg:top-4 lg:right-4 lg:left-auto lg:w-96 bg-white lg:rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100 animate-slideDown max-h-[80vh] lg:max-h-[32rem]">
            <div className={`bg-gradient-to-r ${config.notifGradient} px-5 py-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Notifikasi</h3>
                    <p className="text-xs text-white/80">
                      {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua dibaca'}
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
            <div className="divide-y divide-gray-100 overflow-y-auto max-h-[calc(80vh-72px)] lg:max-h-[28rem]">
              {notifications.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className={`mx-auto mb-4 h-20 w-20 bg-gradient-to-br ${config.notifBg} rounded-2xl flex items-center justify-center`}>
                    <Bell className={`h-10 w-10 ${config.notifIconColor}`} />
                  </div>
                  <h4 className="font-semibold text-gray-700 mb-1">Tidak ada notifikasi</h4>
                  <p className="text-sm text-gray-500">Notifikasi penting akan muncul di sini</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationItemClick(notification)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        (notification.type === 'disposisi' || notification.data?.type === 'new_disposisi') ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        {(notification.type === 'disposisi' || notification.data?.type === 'new_disposisi') ? (
                          <Mail className="h-5 w-5 text-orange-600" />
                        ) : (
                          <Bell className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 text-sm">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                        <span className="text-xs text-gray-400 mt-1 inline-block">{notification.time}</span>
                      </div>
                      {!notification.read && (
                        <div className={`h-2 w-2 bg-${config.primaryColor}-500 rounded-full flex-shrink-0 mt-2`}></div>
                      )}
                    </div>
                  </button>
                ))
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

                {/* Informasi Banner with Smooth Animation */}
                {informasiList.length > 0 && (
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-lg group">
                    <AnimatePresence mode="wait">
                      <motion.button
                        key={currentInformasiIndex}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                        onClick={() => {
                          setSelectedInformasi(informasiList[currentInformasiIndex]);
                          setShowInformasiModal(true);
                        }}
                        className="absolute inset-0 w-full h-full cursor-pointer"
                      >
                        <img
                          src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}/${informasiList[currentInformasiIndex].gambar}`}
                          alt={informasiList[currentInformasiIndex].judul}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <motion.div 
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
                          className="absolute bottom-0 left-0 right-0 p-3 text-left"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-[10px] font-semibold rounded-full shadow-lg">
                              <Info className="h-2.5 w-2.5 mr-0.5" />
                              Informasi
                            </span>
                            {informasiList.length > 1 && (
                              <span className="text-white/80 text-[10px] font-medium bg-black/30 px-1.5 py-0.5 rounded-full">
                                {currentInformasiIndex + 1}/{informasiList.length}
                              </span>
                            )}
                          </div>
                          <p className="text-white font-bold text-sm line-clamp-1 drop-shadow-lg">{informasiList[currentInformasiIndex].judul}</p>
                        </motion.div>
                      </motion.button>
                    </AnimatePresence>
                  </div>
                )}

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

        {/* Informasi Bidang Sekretariat */}
        <div className="mb-5">
          <SectionHeader 
            title="Informasi Sekretariat" 
            subtitle="Data terkini bidang sekretariat"
            icon={Building2}
          />
          <div className="space-y-3">
            {/* Disposisi Pending */}
            <div 
              onClick={() => navigate('/dpmd/disposisi')}
              className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900">Disposisi Pending</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Surat masuk menunggu disposisi</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-2xl font-bold text-blue-600">
                    {sekretariatData?.stats?.disposisi_pending ?? '-'}
                  </span>
                  <p className="text-[10px] text-gray-400">surat</p>
                </div>
              </div>
            </div>

            {/* Perjadin Bulan Ini */}
            <div 
              onClick={() => navigate('/dpmd/perjadin')}
              className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900">Perjalanan Dinas</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Kegiatan perjadin bulan ini</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-2xl font-bold text-green-600">
                    {sekretariatData?.stats?.perjadin_bulan_ini ?? '-'}
                  </span>
                  <p className="text-[10px] text-gray-400">kegiatan</p>
                </div>
              </div>
            </div>

            {/* Total Pegawai */}
            <div 
              className="bg-white rounded-2xl p-4 border border-gray-200 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900">Total Pegawai</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Jumlah pegawai aktif DPMD</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-2xl font-bold text-purple-600">
                    {sekretariatData?.stats?.total_pegawai ?? '-'}
                  </span>
                  <p className="text-[10px] text-gray-400">orang</p>
                </div>
              </div>
            </div>
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

      {/* Modal Detail Informasi */}
      <AnimatePresence>
        {showInformasiModal && selectedInformasi && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={() => setShowInformasiModal(false)}
          >
            <motion.div 
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle for mobile */}
              <div className="sm:hidden flex justify-center py-3">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Image */}
              <div className="relative h-52 sm:h-64 overflow-hidden">
                <img
                  src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}/${selectedInformasi.gambar}`}
                  alt={selectedInformasi.judul}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <button
                  onClick={() => setShowInformasiModal(false)}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-xs font-semibold rounded-full shadow-lg mb-2">
                    <Info className="h-3 w-3 mr-1" />
                    Informasi DPMD
                  </span>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 max-h-[40vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4 leading-tight">
                  {selectedInformasi.judul}
                </h2>
                
                {selectedInformasi.deskripsi ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {selectedInformasi.deskripsi}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-sm">Tidak ada detail informasi tambahan.</p>
                )}
                
                {selectedInformasi.link && (
                  <a
                    href={selectedInformasi.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Buka Link
                  </a>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setShowInformasiModal(false)}
                  className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DPMDDashboard;
