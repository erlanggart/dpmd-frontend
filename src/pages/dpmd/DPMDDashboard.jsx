// src/pages/dpmd/DPMDDashboard.jsx
// Dashboard Tunggal Terintegrasi untuk semua role DPMD
// Menggantikan: KepalaDinasDashboard, SekretarisDinasDashboard, KepalaBidangDashboard, KetuaTimDashboard, PegawaiDashboard

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Building2, Briefcase, FileText, TrendingUp, Users,
  MapPin, Calendar, BarChart3, PieChart, Activity, Bell, X,
  Clock, CheckCircle, Send, Mail, Inbox, ChevronRight, User, Phone, Award,
  FolderOpen, ClipboardList, Newspaper, Eye, Trash2, ChevronUp
} from 'lucide-react';
import api from '../../api';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import ServiceGrid from '../../components/mobile/ServiceGrid';
import LottieIcon from '../../components/mobile/LottieIcon';
// Ikon Lottie animatif — HANYA dipakai di grid Aksi Cepat dashboard ini.
// LottieIcon memakai renderer canvas + auto-pause saat di luar layar/tab lain,
// jadi ringan (apalagi digabung keep-alive: ikut pause saat pindah tab).
import chatbotAnimation from '../../assets/lottie/chatbot.json';
import bellAnimation from '../../assets/lottie/bell.json';
import contactAnimation from '../../assets/lottie/contact.json';
import briefcaseAnimation from '../../assets/lottie/briefcase.json';
import documentAnimation from '../../assets/lottie/document.json';
import InfoCard from '../../components/mobile/InfoCard';
import SectionHeader from '../../components/mobile/SectionHeader';
import ActivityCard from '../../components/mobile/ActivityCard';
import { getUserAvatarUrl } from '../../utils/avatarUtils';
import BirthdayPopup from '../../components/BirthdayPopup';
import WeeklyAttendanceAwardPopup from '../../components/WeeklyAttendanceAwardPopup';
import { hasPageCache, getPageCache, setPageCache } from '../../utils/pageCache';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const DASHBOARD_REQUEST_TIMEOUT = 8000;

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
    showDisposisi: true,
    showPegawaiInfo: true,
  },
  sekretaris_dinas: {
    gradient: 'from-purple-600 via-purple-700 to-purple-800',
    notifGradient: 'from-purple-500 to-violet-600',
    notifBg: 'from-purple-50 to-violet-100',
    notifIconColor: 'text-purple-400',
    roleTitle: 'Sekretaris Dinas DPMD',
    primaryColor: 'purple',
    dashboardEndpoint: null,
    showExecutiveStats: false,
    showDisposisi: true,
    showPegawaiInfo: true,
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
    showPegawaiInfo: true,
  },
  ketua_tim: {
    gradient: 'from-green-600 via-green-700 to-green-800',
    notifGradient: 'from-green-500 to-emerald-600',
    notifBg: 'from-green-50 to-emerald-100',
    notifIconColor: 'text-green-400',
    roleTitle: 'Ketua Tim',
    primaryColor: 'green',
    dashboardEndpoint: null,
    showExecutiveStats: false,
    showDisposisi: false,
    showPegawaiInfo: true,
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
  },
  bendahara: {
    gradient: 'from-teal-600 via-teal-700 to-emerald-800',
    notifGradient: 'from-teal-500 to-emerald-600',
    notifBg: 'from-teal-50 to-emerald-100',
    notifIconColor: 'text-teal-400',
    roleTitle: 'Bendahara DPMD',
    primaryColor: 'teal',
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
  // Key cache halaman ini (per role + pegawai) — dipakai agar saat kembali ke tab
  // Dashboard yang sudah pernah dibuka tidak loading blocking lagi.
  const dashCacheKey = `dpmd-dashboard:${user?.role || 'pegawai'}:${user?.pegawai_id || ''}`;
  // Loading blocking hanya saat pertama kali (belum ada cache).
  const [loading, setLoading] = useState(() => !hasPageCache(dashCacheKey));
  // Kalimat motivasi dipilih acak sekali saat halaman dibuka (stabil selama sesi ini).
  const [motivasi] = useState(() => {
    const list = [
      'Sekecil apa pun peranmu hari ini, ia menggerakkan desa menjadi lebih baik.',
      'Layani dengan hati, kerja dengan tuntas — hasil baik akan mengikuti.',
      'Hari baru, semangat baru. Mari berikan yang terbaik untuk masyarakat.',
      'Konsistensi kecil setiap hari mengalahkan usaha besar yang sesekali.',
      'Dedikasimu hari ini adalah kemajuan desa di hari esok.',
      'Bekerja bukan sekadar tugas, tapi cara kita berarti bagi orang lain.',
    ];
    return list[Math.floor(Math.random() * list.length)];
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Data States — seed dari cache sesi bila tab ini sudah pernah dibuka.
  const [dashboardData, setDashboardData] = useState(() => getPageCache(dashCacheKey)?.dashboardData ?? null);
  const [statistik, setStatistik] = useState(() => getPageCache(dashCacheKey)?.statistik ?? null);
  const [recentDisposisi, setRecentDisposisi] = useState(() => getPageCache(dashCacheKey)?.recentDisposisi ?? []);
  const [pegawaiData, setPegawaiData] = useState(() => getPageCache(dashCacheKey)?.pegawaiData ?? null);
  const [sekretariatData, setSekretariatData] = useState(() => getPageCache(dashCacheKey)?.sekretariatData ?? null);
  const [error, setError] = useState(null);

  // Status (story) states
  const [statusGroups, setStatusGroups] = useState([]);
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [activeStatusGroup, setActiveStatusGroup] = useState(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [statusViewers, setStatusViewers] = useState([]);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [statusReplyText, setStatusReplyText] = useState('');
  const [statusReplying, setStatusReplying] = useState(false);
  const statusReplyRef = useRef(null);
  // Auto-timer for status viewer
  const [statusProgress, setStatusProgress] = useState(0);
  const [statusPaused, setStatusPaused] = useState(false);
  const statusTimerRef = useRef(null);
  const statusVideoRef = useRef(null);
  const notificationsFetchRef = useRef(false);
  const unreadMessagesFetchRef = useRef(false);
  const STATUS_DURATION = 10000; // 10 seconds for text/image

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
    if (document.hidden || notificationsFetchRef.current) return;
    notificationsFetchRef.current = true;
    try {
      const response = await api.get('/push-notification/notifications?limit=20', { timeout: DASHBOARD_REQUEST_TIMEOUT });
      if (response.data.success) {
        setNotifications(response.data.data || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      notificationsFetchRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    const handleNewNotification = () => fetchNotifications();
    window.addEventListener('newNotification', handleNewNotification);
    return () => {
      clearInterval(interval);
      window.removeEventListener('newNotification', handleNewNotification);
    };
  }, [fetchNotifications]);

  // ==================== UNREAD MESSAGES ====================
  const fetchUnreadMessages = useCallback(async () => {
    if (document.hidden || unreadMessagesFetchRef.current) return;
    unreadMessagesFetchRef.current = true;
    try {
      const response = await api.get('/messaging/unread-count', { timeout: DASHBOARD_REQUEST_TIMEOUT });
      if (response.data.success) {
        setUnreadMessages(response.data.data?.unread_count || 0);
      }
    } catch (error) {
      // Silent fail
    } finally {
      unreadMessagesFetchRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 60000);
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
      // Spinner blocking hanya bila belum ada data cache; kalau sudah, refresh diam-diam.
      if (!hasPageCache(dashCacheKey)) setLoading(true);
      setError(null);

      const promises = [];

      // Fetch executive dashboard for kepala_dinas
      if (config.dashboardEndpoint) {
        const token = localStorage.getItem('expressToken');
        promises.push(
          axios.get(`${API_CONFIG.BASE_URL}${config.dashboardEndpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: DASHBOARD_REQUEST_TIMEOUT
          }).then(res => ({ type: 'dashboard', data: res.data.data }))
          .catch(() => ({ type: 'dashboard', data: null }))
        );
      }

      // Fetch disposisi stats for sekretaris, kepala_bidang, ketua_tim
      if (config.showDisposisi) {
        promises.push(
          Promise.all([
            api.get('/disposisi/statistik', { timeout: DASHBOARD_REQUEST_TIMEOUT }),
            api.get('/disposisi/masuk?limit=5', { timeout: DASHBOARD_REQUEST_TIMEOUT })
          ]).then(([statsRes, disposisiRes]) => ({
            type: 'disposisi',
            data: { statistik: statsRes.data.data, recentDisposisi: disposisiRes.data.data || [] }
          })).catch(() => ({ type: 'disposisi', data: { statistik: null, recentDisposisi: [] } }))
        );
      }

      // Fetch pegawai info for pegawai role
      if (config.showPegawaiInfo && user.pegawai_id) {
        promises.push(
          api.get(`/pegawai/${user.pegawai_id}`, { timeout: DASHBOARD_REQUEST_TIMEOUT })
            .then(res => ({ type: 'pegawai', data: res.data.data }))
            .catch(() => ({ type: 'pegawai', data: null }))
        );
      }

      // Fetch sekretariat info for all roles (individual endpoints)
      promises.push(
        Promise.all([
          api.get('/disposisi/statistik', { timeout: DASHBOARD_REQUEST_TIMEOUT }).catch(() => ({ data: { data: null } })),
          api.get('/perjadin/dashboard', { timeout: DASHBOARD_REQUEST_TIMEOUT }).catch(() => ({ data: { data: null } })),
          api.get('/pegawai', { timeout: DASHBOARD_REQUEST_TIMEOUT }).catch(() => ({ data: { data: [] } }))
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

      // Await all promises
      const results = await Promise.all(promises);

      // Process results — kumpulkan juga ke bundle untuk disimpan ke cache sesi.
      const bundle = { ...(getPageCache(dashCacheKey) || {}) };
      results.forEach(result => {
        switch (result.type) {
          case 'dashboard':
            setDashboardData(result.data);
            bundle.dashboardData = result.data;
            break;
          case 'disposisi':
            setStatistik(result.data.statistik);
            setRecentDisposisi(result.data.recentDisposisi);
            bundle.statistik = result.data.statistik;
            bundle.recentDisposisi = result.data.recentDisposisi;
            break;
          case 'pegawai':
            setPegawaiData(result.data);
            bundle.pegawaiData = result.data;
            break;
          case 'sekretariat':
            setSekretariatData(result.data);
            bundle.sekretariatData = result.data;
            break;
        }
      });
      setPageCache(dashCacheKey, bundle);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      // Kalau sudah ada data cache, jangan tampilkan layar error — cukup diam
      // (data lama tetap tampil). Error blocking hanya saat load pertama.
      if (!hasPageCache(dashCacheKey)) {
        setError(err.response?.data?.message || 'Gagal memuat data dashboard');
        toast.error('Gagal memuat data dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [config, user.pegawai_id, role, dashCacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==================== STATUS FEATURE ====================
  const fetchStatuses = useCallback(async () => {
    try {
      const res = await api.get('/status', { timeout: DASHBOARD_REQUEST_TIMEOUT });
      if (res.data.success) setStatusGroups(res.data.data);
    } catch (err) { /* silent */ }
  }, []);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  const openStatusViewer = (group, index = 0) => {
    // Smart start: jump to first unviewed status in the group
    let startIndex = index;
    if (!group.is_own && index === 0) {
      const firstUnviewed = group.statuses.findIndex(s => !s.viewed);
      if (firstUnviewed > 0) startIndex = firstUnviewed;
    }
    setActiveStatusGroup(group);
    setActiveStatusIndex(startIndex);
    setShowStatusViewer(true);
    setStatusViewers([]);
    setShowViewersSheet(false);
    setStatusProgress(0);
    if (group.is_own && group.statuses[startIndex]) {
      loadStatusViewers(group.statuses[startIndex].id);
    } else if (group.statuses[startIndex]) {
      api.post(`/status/${group.statuses[startIndex].id}/view`).then(() => fetchStatuses()).catch(() => {});
    }
  };

  const nextStatus = () => {
    if (!activeStatusGroup) return;
    if (statusTimerRef.current) { clearInterval(statusTimerRef.current); clearTimeout(statusTimerRef.current); }
    const next = activeStatusIndex + 1;
    if (next < activeStatusGroup.statuses.length) {
      setActiveStatusIndex(next);
      setShowViewersSheet(false);
      setStatusProgress(0);
      if (activeStatusGroup.is_own) {
        loadStatusViewers(activeStatusGroup.statuses[next].id);
      } else {
        api.post(`/status/${activeStatusGroup.statuses[next].id}/view`).then(() => fetchStatuses()).catch(() => {});
      }
    } else {
      // Auto-advance: find next group with unviewed statuses (skip own & already-viewed groups)
      const currentGroupIndex = statusGroups.findIndex(g => g.user?.id === activeStatusGroup.user?.id);
      const nextGroup = statusGroups.slice(currentGroupIndex + 1).find(g => !g.is_own && g.has_unviewed);
      if (nextGroup) {
        openStatusViewer(nextGroup, 0);
      } else {
        // No more unviewed - stop
        setShowStatusViewer(false);
      }
    }
  };

  const prevStatus = () => {
    if (statusTimerRef.current) { clearInterval(statusTimerRef.current); clearTimeout(statusTimerRef.current); }
    if (activeStatusIndex > 0) {
      const prev = activeStatusIndex - 1;
      setActiveStatusIndex(prev);
      setShowViewersSheet(false);
      if (activeStatusGroup?.is_own) {
        loadStatusViewers(activeStatusGroup.statuses[prev].id);
      }
    }
  };

  const loadStatusViewers = async (statusId) => {
    try {
      const res = await api.get(`/status/${statusId}/viewers`);
      if (res.data.success) setStatusViewers(res.data.data);
    } catch (err) { /* silent */ }
  };

  const deleteStatus = async (statusId) => {
    try {
      await api.delete(`/status/${statusId}`);
      setShowStatusViewer(false);
      fetchStatuses();
      toast.success('Status dihapus');
    } catch (err) {
      toast.error('Gagal menghapus status');
    }
  };

  const replyToStatus = async (statusId, content, type = 'reply') => {
    if (!content?.trim()) return;
    try {
      setStatusReplying(true);
      await api.post(`/status/${statusId}/reply`, { content: content.trim(), type });
      setStatusReplyText('');
      toast.success(type === 'reaction' ? 'Reaksi terkirim' : 'Balasan terkirim');
    } catch (err) {
      toast.error('Gagal mengirim');
    } finally {
      setStatusReplying(false);
    }
  };

  const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👏'];

  // Auto-timer for status viewer - progress bar animation + auto-advance
  useEffect(() => {
    if (!showStatusViewer || !activeStatusGroup) return;
    const currentStatus = activeStatusGroup.statuses[activeStatusIndex];
    if (!currentStatus) return;

    const isVideo = currentStatus.media_path && 
      (currentStatus.media_path.endsWith('.mp4') || currentStatus.media_path.endsWith('.webm') || currentStatus.media_path.endsWith('.mov'));

    // For own statuses, don't auto-advance (user is checking viewers)
    if (activeStatusGroup.is_own) {
      setStatusProgress(100);
      return;
    }

    // For video: progress follows video playback, advance on ended
    if (isVideo) {
      setStatusProgress(0);
      const video = statusVideoRef.current;
      if (!video) return;
      
      const onTimeUpdate = () => {
        if (video.duration && !statusPaused) {
          setStatusProgress((video.currentTime / video.duration) * 100);
        }
      };
      const onEnded = () => {
        setStatusProgress(100);
        // Small delay before advancing
        statusTimerRef.current = setTimeout(() => nextStatus(), 300);
      };
      
      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('ended', onEnded);
      
      return () => {
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('ended', onEnded);
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      };
    }

    // For text/image: 10 second timer with smooth progress
    setStatusProgress(0);
    const interval = 50; // update every 50ms for smooth animation
    const steps = STATUS_DURATION / interval;
    let step = 0;

    const tick = () => {
      if (statusPaused) return;
      step++;
      setStatusProgress((step / steps) * 100);
      if (step >= steps) {
        clearInterval(statusTimerRef.current);
        setTimeout(() => nextStatus(), 200);
      }
    };

    statusTimerRef.current = setInterval(tick, interval);
    return () => { if (statusTimerRef.current) clearInterval(statusTimerRef.current); };
  }, [showStatusViewer, activeStatusGroup, activeStatusIndex, statusPaused]);

  // ==================== QUICK ACTIONS ====================
  const ABSENSI_ELIGIBLE_STATUS = ['PPPK Paruh Waktu', 'Tenaga Alih Daya', 'Tenaga Keamanan', 'Tenaga Kebersihan'];
  const isAbsensiEligible = ABSENSI_ELIGIBLE_STATUS.includes(user.status_kepegawaian);

  const quickActions = useMemo(() => {
    const basePath = getBidangPath();
    const qaIconClass = 'w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12';

    // Common actions for all roles - using unified /dpmd paths
    const commonActions = [
      {
        icon: Mail,
        customIcon: <LottieIcon animationData={chatbotAnimation} className={qaIconClass} />,
        label: 'Pesan',
        color: 'white',
        badge: unreadMessages || null,
        onClick: () => navigate('/dpmd/pesan')
      },
      isAbsensiEligible
        ? {
            icon: CheckCircle,
            customIcon: <LottieIcon animationData={bellAnimation} className={qaIconClass} />,
            label: 'Presensi',
            color: 'rose',
            onClick: () => navigate('/dpmd/absensi')
          }
        : {
            icon: Briefcase,
            customIcon: <LottieIcon animationData={briefcaseAnimation} className={qaIconClass} />,
            label: 'Perjadin',
            color: config.primaryColor,
            onClick: () => navigate('/dpmd/perjadin')
          },
      {
        icon: Calendar,
        // Jadwal: pakai emoji kalender, bukan Lottie.
        customIcon: <span className="leading-none text-[30px] sm:text-4xl lg:text-5xl" role="img" aria-label="Jadwal">📅</span>,
        label: 'Jadwal',
        color: 'blue',
        onClick: () => navigate('/dpmd/jadwal-kegiatan')
      },
      {
        icon: FileText,
        customIcon: <LottieIcon animationData={contactAnimation} className={qaIconClass} />,
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
          icon: FileText,
          customIcon: <LottieIcon animationData={contactAnimation} className={qaIconClass} />,
          label: 'Disposisi',
          color: config.primaryColor,
          onClick: () => navigate('/dpmd/disposisi')
        },
        ...commonActions.slice(0, 2),
        {
          icon: FolderOpen,
          customIcon: <LottieIcon animationData={documentAnimation} className={qaIconClass} />,
          label: 'Produk Hukum',
          color: 'cyan',
          onClick: () => navigate(`${basePath}/produk-hukum`)
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
      <div className="min-h-screen bg-[linear-gradient(180deg,#0f172a_0%,#115e59_36%,#dbeafe_74%,#f8fafc_100%)] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/20" />
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-500 animate-spin" />
          </div>
          <p className="text-slate-400 font-medium text-sm">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  // ==================== ERROR STATE ====================
  if (error && !dashboardData && !statistik && !pegawaiData) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#0f172a_0%,#115e59_36%,#dbeafe_74%,#f8fafc_100%)] p-4 flex items-center justify-center">
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 max-w-md w-full">
          <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-center font-bold text-slate-800 text-xl mb-2">Oops!</h3>
          <p className="text-center text-slate-500 text-sm mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl active:scale-95 transition-all"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ==================== RENDER ====================
  const avatarUrl = getUserAvatarUrl(user);
  const displayName = pegawaiData?.nama_pegawai || user.name || 'Pengguna';
  const jabatanText = pegawaiData?.jabatan || getRoleTitle;
  const bidangText = pegawaiData?.bidang?.nama_bidang || pegawaiData?.bidangs?.nama
    || BIDANG_MAP[user.bidang_id] || user.bidang_name || '';
  const nipText = pegawaiData?.nip;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0f172a_0%,#115e59_36%,#dbeafe_74%,#f8fafc_100%)] pb-20 lg:pb-4">
      {/* Birthday Popup */}
      <BirthdayPopup />
      <WeeklyAttendanceAwardPopup />

      {/* Safe area top spacer (PWA standalone) */}
      <div className="h-[env(safe-area-inset-top,0px)]"></div>

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">

        {/* Identitas (kiri) + Foto besar (kanan) */}
        <div className="flex items-end justify-between gap-3">
          {/* Kiri: nama, jabatan, bidang, NIP */}
          <div className="min-w-0 flex-1 pb-6">
            <h1 className="text-3xl sm:text-4xl font-black uppercase leading-[1.05] tracking-tight text-white break-words drop-shadow-sm">
              {displayName}
            </h1>
            {jabatanText && <p className="mt-2 text-sm font-semibold text-slate-200">{jabatanText}</p>}
            {bidangText && <p className="text-xs text-emerald-100/80">{bidangText}</p>}
            {nipText && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-slate-100 ring-1 ring-white/15 backdrop-blur">
                <User className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[11px] font-semibold tracking-wide tabular-nums">{nipText}</span>
              </div>
            )}
          </div>

          {/* Kanan: foto besar */}
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-56 w-auto max-w-[42vw] object-contain object-bottom"
              />
            ) : (
              <div className="h-56 flex items-center justify-center px-4">
                <span className="text-7xl font-extrabold text-emerald-100 drop-shadow-sm">{displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Section — card ada, tapi tombol tanpa background (ikon langsung) */}
        <div className="relative z-10 -mt-4 bg-slate-800/60 backdrop-blur-md rounded-[22px] sm:rounded-[24px] shadow-lg shadow-slate-900/25 p-4 sm:p-5 mb-4 border border-white/10">
          <ServiceGrid
            services={quickActions}
            columns={quickActions.length > 3 ? 4 : 3}
            buttonColor="none"
            labelClassName="text-white"
            compact
          />
        </div>

        {/* Status Stories Section */}
        {statusGroups.length > 0 ? (
          <div className="mb-3 overflow-hidden">
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-hide px-1">
              {/* Status Rings */}
              {statusGroups.map((group, i) => {
                const initial = group.user?.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?';
                const hasUnviewed = group.has_unviewed || group.is_own;
                return (
                  <button
                    key={group.user?.id || i}
                    onClick={() => openStatusViewer(group)}
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                  >
                    <div className={`relative w-12 h-12 rounded-full p-[2px] ${
                      hasUnviewed
                        ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500'
                        : 'bg-gray-300'
                    }`}>
                      <div className="w-full h-full rounded-full bg-white p-[2px]">
                        {group.user?.avatar ? (
                          <img
                            src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}${group.user.avatar}`}
                            alt="" className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold">
                            {initial}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-600 font-medium w-14 text-center truncate">
                      {group.is_own ? 'Status Saya' : group.user?.name?.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

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
                  color="emerald"
                  onClick={() => navigate('/core-dashboard/laporan-desa')}
                />
                <InfoCard
                  icon={Users}
                  title="Pegawai"
                  value={dashboardData.summary.total_pegawai || 0}
                  color="teal"
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
                  className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white cursor-pointer active:scale-95 transition-transform shadow-lg shadow-emerald-500/25"
                >
                  <PieChart className="w-8 h-8 mb-3" />
                  <h4 className="font-bold text-sm mb-1">Statistik Bankeu</h4>
                  <p className="text-xs text-emerald-100">Lihat detail</p>
                </div>
                <div
                  onClick={() => navigate('/core-dashboard/statistik-add')}
                  className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-5 text-white cursor-pointer active:scale-95 transition-transform shadow-lg shadow-teal-500/25"
                >
                  <BarChart3 className="w-8 h-8 mb-3" />
                  <h4 className="font-bold text-sm mb-1">Statistik ADD</h4>
                  <p className="text-xs text-teal-100">Lihat detail</p>
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
                  color="emerald"
                  badge={statistik?.masuk?.pending > 5 ? '!' : null}
                  onClick={() => navigate('/dpmd/disposisi?filter=pending')}
                />
                <InfoCard
                  icon={TrendingUp}
                  title="Diproses"
                  value={(statistik?.masuk?.dibaca || 0) + (statistik?.masuk?.proses || 0)}
                  color="teal"
                />
                <InfoCard
                  icon={CheckCircle}
                  title="Selesai"
                  value={statistik?.masuk?.selesai || 0}
                  color="emerald"
                />
                <InfoCard
                  icon={Send}
                  title="Diteruskan"
                  value={statistik?.keluar?.total || 0}
                  color="teal"
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
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-emerald-600 font-medium mb-0.5">Bidang</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{pegawaiData.bidang.nama_bidang}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Unit Kerja</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phone */}
                {pegawaiData?.no_hp && (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-2xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-emerald-600 font-medium mb-0.5">No. HP</p>
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
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-3">
                          <Award className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-xs text-emerald-600 font-medium mb-1">Pangkat</p>
                        <p className="text-sm font-bold text-gray-900 break-words">{pegawaiData.pangkat}</p>
                      </div>
                    </div>
                  )}
                  {pegawaiData?.golongan && (
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-4 border border-teal-200">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mb-3">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-xs text-teal-600 font-medium mb-1">Golongan</p>
                        <p className="text-sm font-bold text-gray-900">{pegawaiData.golongan}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Sambutan + Motivasi — tint emerald/teal (senada tema) agar teks terbaca */}
        <div className="mb-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/90 to-teal-600/90 backdrop-blur-sm border border-white/15 p-5 sm:p-6 text-white shadow-lg shadow-emerald-900/20">
          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="text-sm font-medium text-emerald-50/90">Selamat datang kembali,</p>
            <h3 className="mt-0.5 text-xl sm:text-2xl font-extrabold leading-tight">
              {displayName} <span className="align-middle">👋</span>
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-emerald-50/95">
              “{motivasi}”
            </p>
          </div>
        </div>

      </div>

      {/* Status Viewer (Fullscreen) */}
      <AnimatePresence>
        {showStatusViewer && activeStatusGroup && activeStatusGroup.statuses[activeStatusIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[60] flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            {/* Progress bars */}
            <div className="flex gap-1 px-4 pt-2 pb-1">
              {activeStatusGroup.statuses.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-white"
                    style={{
                      width: i < activeStatusIndex ? '100%' : i === activeStatusIndex ? `${statusProgress}%` : '0%',
                      transition: i === activeStatusIndex ? 'width 100ms linear' : 'none'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                {activeStatusGroup.user?.avatar ? (
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}${activeStatusGroup.user.avatar}`}
                    alt="" className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  activeStatusGroup.user?.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{activeStatusGroup.user?.name}</p>
                <p className="text-white/50 text-xs">
                  {activeStatusGroup.statuses[activeStatusIndex]?.created_at
                    ? new Date(activeStatusGroup.statuses[activeStatusIndex].created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                {activeStatusGroup.is_own && (
                    <button
                      onClick={() => deleteStatus(activeStatusGroup.statuses[activeStatusIndex].id)}
                      className="p-2 text-white/60 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                )}
                <button
                  onClick={() => setShowStatusViewer(false)}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Status Content */}
            {(() => {
              const currentStatus = activeStatusGroup.statuses[activeStatusIndex];
              const hasMedia = currentStatus?.media_path;
              const mediaUrl = hasMedia
                ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}/${currentStatus.media_path}`
                : null;
              const isVideo = hasMedia && (currentStatus.media_path.endsWith('.mp4') || currentStatus.media_path.endsWith('.webm') || currentStatus.media_path.endsWith('.mov'));

              return (
                <div
                  className="flex-1 flex flex-col items-center justify-center relative overflow-hidden min-h-0"
                  style={{ backgroundColor: hasMedia ? '#000' : (currentStatus?.background_color || '#059669') }}
                >
                  {/* Tap zones */}
                  <button onClick={prevStatus} className="absolute left-0 top-0 w-1/3 h-full z-10" />
                  <div 
                    className="absolute left-1/3 top-0 w-1/3 h-full z-10"
                    onTouchStart={() => setStatusPaused(true)}
                    onTouchEnd={() => setStatusPaused(false)}
                    onMouseDown={() => setStatusPaused(true)}
                    onMouseUp={() => setStatusPaused(false)}
                  />
                  <button onClick={nextStatus} className="absolute right-0 top-0 w-1/3 h-full z-10" />

                  {hasMedia ? (
                    <>
                      {isVideo ? (
                        <video
                          key={currentStatus.id}
                          ref={statusVideoRef}
                          src={mediaUrl}
                          className="w-full h-full object-contain"
                          autoPlay playsInline
                        />
                      ) : (
                        <img
                          src={mediaUrl}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      )}
                      {currentStatus.content && (
                        <div className="absolute bottom-0 left-0 right-0 z-20 px-4" style={{ paddingBottom: activeStatusGroup?.is_own ? 'max(1.5rem, env(safe-area-inset-bottom))' : '1.5rem' }}>
                          <div className="bg-black/50 backdrop-blur-md rounded-2xl px-5 py-3 max-w-md mx-auto">
                            <p className="text-white text-sm sm:text-base font-medium text-center leading-relaxed">
                              {currentStatus.content}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="px-8 py-4">
                      <p className="text-white text-xl sm:text-2xl font-bold text-center leading-relaxed max-w-md break-words drop-shadow-lg">
                        {currentStatus?.content}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Reply & Reaction bar (for other people's statuses) */}
            {!activeStatusGroup.is_own && (
              <div className="flex-shrink-0 bg-black/90 backdrop-blur-md border-t border-white/10" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                {/* Quick emoji reactions */}
                <div className="flex items-center justify-center gap-3 px-4 pt-3 pb-1">
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => replyToStatus(activeStatusGroup.statuses[activeStatusIndex].id, emoji, 'reaction')}
                      disabled={statusReplying}
                      className="text-2xl hover:scale-125 active:scale-90 transition-transform disabled:opacity-50"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {/* Text reply input */}
                <div className="flex items-center gap-2 px-4 pb-3 pt-1">
                  <input
                    ref={statusReplyRef}
                    type="text"
                    placeholder="Balas status..."
                    value={statusReplyText}
                    onChange={(e) => setStatusReplyText(e.target.value)}
                    onFocus={() => setStatusPaused(true)}
                    onBlur={() => setStatusPaused(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); replyToStatus(activeStatusGroup.statuses[activeStatusIndex].id, statusReplyText, 'reply'); } }}
                    className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/40 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30"
                  />
                  <button
                    onClick={() => replyToStatus(activeStatusGroup.statuses[activeStatusIndex].id, statusReplyText, 'reply')}
                    disabled={!statusReplyText.trim() || statusReplying}
                    className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-white/10 disabled:text-white/30 text-white rounded-full transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Swipe-up viewers handle (for own statuses) */}
            {activeStatusGroup.is_own && (
              <div className="flex-shrink-0">
                {/* Collapsed handle - tap or swipe up to expand */}
                <button
                  onClick={() => setShowViewersSheet(!showViewersSheet)}
                  className="w-full bg-black/80 backdrop-blur-md border-t border-white/10 flex flex-col items-center py-2 active:bg-black/90 transition-colors"
                  style={{ paddingBottom: showViewersSheet ? 0 : 'max(0.5rem, env(safe-area-inset-bottom))' }}
                >
                  <div className="w-10 h-1 rounded-full bg-white/30 mb-2" />
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-white/60 text-xs font-medium">
                      {statusViewers.length > 0 ? `Dilihat oleh ${statusViewers.length} orang` : 'Belum ada yang melihat'}
                    </span>
                    <ChevronUp className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${showViewersSheet ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded viewers list */}
                <AnimatePresence>
                  {showViewersSheet && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden bg-black/90 backdrop-blur-md"
                      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                      <div className="max-h-52 overflow-y-auto">
                        {statusViewers.length > 0 ? statusViewers.map(v => (
                          <div key={v.id} className="px-4 py-2.5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-[10px] font-bold">
                              {v.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{v.name}</p>
                              <p className="text-white/40 text-[10px]">{v.viewed_at ? new Date(v.viewed_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                            </div>
                          </div>
                        )) : (
                          <div className="px-4 py-6 text-center">
                            <Eye className="w-6 h-6 text-white/20 mx-auto mb-2" />
                            <p className="text-white/40 text-xs">Belum ada yang melihat status ini</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DPMDDashboard;
