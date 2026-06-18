// src/pages/dpmd/DPMDDashboard.jsx
// Dashboard Tunggal Terintegrasi untuk semua role DPMD
// Menggantikan: KepalaDinasDashboard, SekretarisDinasDashboard, KepalaBidangDashboard, KetuaTimDashboard, PegawaiDashboard

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Building2, Briefcase, FileText, TrendingUp, Users,
  MapPin, Calendar, BarChart3, PieChart, Activity, Bell, Info, X, ExternalLink,
  Clock, CheckCircle, Send, Mail, Inbox, ChevronRight, User, Phone, Award,
  FolderOpen, ClipboardList, Newspaper, Plus, Eye, Trash2,
  Image, Video, Type, Crop, RotateCw, ZoomIn, ChevronUp, SlidersHorizontal, Camera,
  SwitchCamera, Circle, Square
} from 'lucide-react';
import api from '../../api';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import MobileHeader from '../../components/mobile/MobileHeader';
import ServiceGrid from '../../components/mobile/ServiceGrid';
import FaceVerificationLottieIcon from '../../components/FaceVerificationLottieIcon';
import MessageLottieIcon from '../../components/MessageLottieIcon';
import ContactLottieIcon from '../../components/ContactLottieIcon';
import ScheduleLottieIcon from '../../components/ScheduleLottieIcon';
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
  const [error, setError] = useState(null);
  const [informasiList, setInformasiList] = useState([]);
  const [currentInformasiIndex, setCurrentInformasiIndex] = useState(0);
  const [showInformasiModal, setShowInformasiModal] = useState(false);
  const [selectedInformasi, setSelectedInformasi] = useState(null);

  // Status (story) states
  const [statusGroups, setStatusGroups] = useState([]);
  const [showStatusCreate, setShowStatusCreate] = useState(false);
  const [statusContent, setStatusContent] = useState('');
  const [statusColor, setStatusColor] = useState('#059669');
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [activeStatusGroup, setActiveStatusGroup] = useState(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [statusViewers, setStatusViewers] = useState([]);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [statusMediaFile, setStatusMediaFile] = useState(null);
  const [statusMediaPreview, setStatusMediaPreview] = useState(null);
  const [statusType, setStatusType] = useState('text'); // 'text' | 'media'
  const statusFileRef = useRef(null);
  const [statusReplyText, setStatusReplyText] = useState('');
  const [statusReplying, setStatusReplying] = useState(false);
  const statusReplyRef = useRef(null);
  // Auto-timer for status viewer
  const [statusProgress, setStatusProgress] = useState(0);
  const [statusPaused, setStatusPaused] = useState(false);
  const statusTimerRef = useRef(null);
  const statusVideoRef = useRef(null);
  const STATUS_DURATION = 10000; // 10 seconds for text/image
  // Crop states
  const [showCropper, setShowCropper] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [photoFilters, setPhotoFilters] = useState({ brightness: 100, contrast: 100, saturation: 100 });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showCameraMode, setShowCameraMode] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'user' | 'environment'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const cameraStreamRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

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
        setUnreadMessages(response.data.data?.unread_count || 0);
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

  // ==================== STATUS FEATURE ====================
  const STATUS_COLORS = ['#059669', '#2563eb', '#7c3aed', '#dc2626', '#d97706', '#0891b2', '#e11d48', '#4f46e5'];
  const FILTER_PRESETS = [
    { name: 'Normal',   brightness: 100, contrast: 100, saturation: 100 },
    { name: 'Cerah',    brightness: 115, contrast: 110, saturation: 125 },
    { name: 'Hangat',   brightness: 108, contrast: 108, saturation: 145 },
    { name: 'Kalem',    brightness:  95, contrast:  88, saturation:  65 },
    { name: 'Dramatis', brightness:  88, contrast: 138, saturation:  75 },
    { name: 'Fade',     brightness: 112, contrast:  82, saturation:  50 },
  ];

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await api.get('/status');
      if (res.data.success) setStatusGroups(res.data.data);
    } catch (err) { /* silent */ }
  }, []);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  const createStatus = async () => {
    if (!statusContent.trim() && !statusMediaFile) return;
    try {
      const fd = new FormData();
      if (statusContent.trim()) fd.append('content', statusContent.trim());
      fd.append('background_color', statusColor);
      // Bake CSS filters into the image before uploading
      let mediaToUpload = statusMediaFile;
      if (statusMediaFile && !statusMediaFile.type.startsWith('video/') && statusMediaPreview &&
          (photoFilters.brightness !== 100 || photoFilters.contrast !== 100 || photoFilters.saturation !== 100)) {
        try {
          const img = new window.Image();
          img.src = statusMediaPreview;
          await new Promise(resolve => { img.onload = resolve; });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.filter = `brightness(${photoFilters.brightness}%) contrast(${photoFilters.contrast}%) saturate(${photoFilters.saturation}%)`;
          ctx.drawImage(img, 0, 0);
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
          mediaToUpload = new File([blob], 'status-photo.jpg', { type: 'image/jpeg' });
        } catch (e) { /* fall back to original */ }
      }
      if (mediaToUpload) fd.append('media', mediaToUpload);
      await api.post('/status', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowStatusCreate(false);
      setStatusContent('');
      setStatusMediaFile(null);
      setStatusMediaPreview(null);
      setStatusType('text');
      fetchStatuses();
      toast.success('Status berhasil dibuat');
    } catch (err) {
      toast.error('Gagal membuat status');
    }
  };

  const handleStatusFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format file tidak didukung');
      return;
    }

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > 30) {
          toast.error('Video maksimal 30 detik');
          return;
        }
        setStatusMediaFile(file);
        setStatusMediaPreview(URL.createObjectURL(file));
        setStatusType('media');
      };
      video.src = URL.createObjectURL(file);
    } else {
      // For images: open inline cropper
      const url = URL.createObjectURL(file);
      setCropImage(url);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setCropZoom(1);
      setPhotoFilters({ brightness: 100, contrast: 100, saturation: 100 });
      setShowFilterPanel(false);
    }
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const applyCrop = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    try {
      const image = new window.Image();
      image.src = cropImage;
      await new Promise(resolve => { image.onload = resolve; });
      const canvas = document.createElement('canvas');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d');
      if (photoFilters.brightness !== 100 || photoFilters.contrast !== 100 || photoFilters.saturation !== 100) {
        ctx.filter = `brightness(${photoFilters.brightness}%) contrast(${photoFilters.contrast}%) saturate(${photoFilters.saturation}%)`;
      }
      ctx.drawImage(
        image,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0,
        croppedAreaPixels.width, croppedAreaPixels.height
      );
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      const croppedFile = new File([blob], 'status-photo.jpg', { type: 'image/jpeg' });
      URL.revokeObjectURL(cropImage);
      setStatusMediaFile(croppedFile);
      setStatusMediaPreview(URL.createObjectURL(blob));
      setStatusType('media');
      setShowCropper(false);
      setCropImage(null);
    } catch (err) {
      toast.error('Gagal memproses gambar');
    }
  };

  const cancelCrop = () => {
    if (cropImage) URL.revokeObjectURL(cropImage);
    setCropImage(null);
    setShowCropper(false);
    if (statusFileRef.current) statusFileRef.current.value = '';
  };

  const clearStatusMedia = () => {
    stopRecording();
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setShowCameraMode(false);
    setStatusMediaFile(null);
    if (statusMediaPreview) URL.revokeObjectURL(statusMediaPreview);
    setStatusMediaPreview(null);
    setStatusType('text');
    if (statusFileRef.current) statusFileRef.current.value = '';
    setPhotoFilters({ brightness: 100, contrast: 100, saturation: 100 });
    setShowFilterPanel(false);
  };

  const startCamera = async (facing) => {
    const useFacing = (typeof facing === 'string') ? facing : cameraFacing;
    try {
      // Stop existing stream first
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      let stream;
      try {
        // Try exact facingMode first (more reliable on mobile)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: useFacing }, width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: true
        });
      } catch {
        // Fallback to hint-based facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: useFacing, width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: true
        });
      }
      cameraStreamRef.current = stream;
      setCameraFacing(useFacing);
      setShowCameraMode(true);
      // Attach stream to video element if already rendered
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch {
      toast.error('Tidak bisa mengakses kamera');
    }
  };

  const switchCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    await startCamera(newFacing);
  };

  const stopCamera = () => {
    stopRecording();
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setShowCameraMode(false);
  };

  const capturePhoto = () => {
    const video = cameraVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d');
    // Mirror the photo if using front camera
    if (cameraFacing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      stopCamera();
      const url = URL.createObjectURL(blob);
      setCropImage(url);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setCropZoom(1);
      setPhotoFilters({ brightness: 100, contrast: 100, saturation: 100 });
      setShowFilterPanel(false);
    }, 'image/jpeg', 0.92);
  };

  const startRecording = () => {
    if (!cameraStreamRef.current) return;
    try {
      recordingChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : 'video/mp4';
      const recorder = new MediaRecorder(cameraStreamRef.current, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: mimeType.split(';')[0] });
        const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
        const file = new File([blob], `status-video.${ext}`, { type: blob.type });
        stopCamera();
        setStatusMediaFile(file);
        setStatusMediaPreview(URL.createObjectURL(blob));
        setStatusType('media');
      };
      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 29) { stopRecording(); return 30; }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('MediaRecorder error:', err);
      toast.error('Perangkat tidak mendukung perekaman video');
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  const handlePreviewDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedImageTypes.includes(file.type)) {
      toast.error('Hanya file gambar yang didukung');
      return;
    }
    const url = URL.createObjectURL(file);
    setCropImage(url);
    setShowCropper(true);
    setCrop({ x: 0, y: 0 });
    setCropZoom(1);
    setPhotoFilters({ brightness: 100, contrast: 100, saturation: 100 });
    setShowFilterPanel(false);
  };

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
    
    // Common actions for all roles - using unified /dpmd paths
    const commonActions = [
      {
        customIcon: <MessageLottieIcon className="relative z-10 h-full w-full" />,
        label: 'Pesan',
        color: 'indigo',
        badge: unreadMessages || null,
        onClick: () => navigate('/dpmd/pesan')
      },
      isAbsensiEligible
        ? {
            customIcon: <FaceVerificationLottieIcon className="relative z-10 h-full w-full" />,
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
        customIcon: <ScheduleLottieIcon className="relative z-10 h-full w-full" />,
        label: 'Jadwal',
        color: 'blue',
        onClick: () => navigate('/dpmd/jadwal-kegiatan')
      },
      {
        customIcon: <ContactLottieIcon className="relative z-10 h-full w-full" />,
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
          customIcon: <ContactLottieIcon className="relative z-10 h-full w-full" />,
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

        {/* Status Stories Section */}
        {statusGroups.length > 0 || true ? (
          <div className="mb-4 overflow-hidden">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
              {/* Add Status Button */}
              <button
                onClick={() => setShowStatusCreate(true)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-emerald-400 transition-colors">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <span className="text-[10px] text-gray-500 font-medium w-16 text-center truncate">Buat Status</span>
              </button>

              {/* Status Rings */}
              {statusGroups.map((group, i) => {
                const initial = group.user?.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?';
                const hasUnviewed = group.has_unviewed || group.is_own;
                return (
                  <button
                    key={group.user?.id || i}
                    onClick={() => openStatusViewer(group)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0"
                  >
                    <div className={`relative w-16 h-16 rounded-full p-[3px] ${
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
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                            {initial}
                          </div>
                        )}
                      </div>
                      {group.is_own && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                          <Plus className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-600 font-medium w-16 text-center truncate">
                      {group.is_own ? 'Status Saya' : group.user?.name?.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

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

                {/* Informasi Banner with Smooth Animation (hidden when status exists) */}
                {informasiList.length > 0 && statusGroups.length === 0 && (
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

      {/* Status Create Modal */}
      <AnimatePresence>
        {showStatusCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-[60]"
            onClick={() => { setShowStatusCreate(false); clearStatusMedia(); }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full sm:max-w-[400px] bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Hidden file input */}
              <input
                ref={statusFileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleStatusFileSelect}
              />

              {/* Drag handle (mobile) */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3">
                <button
                  onClick={() => { setShowStatusCreate(false); clearStatusMedia(); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-sm font-bold text-gray-800">Buat Status</h3>
                <button
                  onClick={createStatus}
                  disabled={showCropper || showCameraMode || (!statusContent.trim() && !statusMediaFile)}
                  className="px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full disabled:opacity-30 hover:bg-emerald-600 transition-all shadow-sm"
                >
                  Bagikan
                </button>
              </div>

              {/* Preview Area */}
              <div
                className={`relative mx-4 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-200 ${isDraggingOver ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}
                style={{
                  aspectRatio: '9/16',
                  maxHeight: 'min(48dvh, calc(100dvh - 230px))',
                  backgroundColor: showCropper ? '#000' : showCameraMode ? '#000' : statusType === 'text' ? statusColor : '#111'
                }}
                onDrop={handlePreviewDrop}
                onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
              >
                {showCameraMode ? (
                  /* ── Live Camera (mirrored for front camera) ── */
                  <>
                    <video
                      ref={el => {
                        cameraVideoRef.current = el;
                        if (el && cameraStreamRef.current) el.srcObject = cameraStreamRef.current;
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={cameraFacing === 'user' ? { transform: 'scaleX(-1)' } : undefined}
                    />
                    {/* Switch camera button */}
                    <button
                      onClick={switchCamera}
                      className="absolute top-3 right-3 p-2.5 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition z-20"
                    >
                      <SwitchCamera className="w-5 h-5" />
                    </button>
                    {/* Recording indicator */}
                    {isRecording && (
                      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-red-500/80 backdrop-blur-sm rounded-full z-20">
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-xs font-bold">{recordingTime}s / 30s</span>
                      </div>
                    )}
                  </>
                ) : showCropper && cropImage ? (
                  /* ── Inline Cropper ── */
                  <Cropper
                    image={cropImage}
                    crop={crop}
                    zoom={cropZoom}
                    aspect={9 / 16}
                    onCropChange={setCrop}
                    onZoomChange={setCropZoom}
                    onCropComplete={onCropComplete}
                    showGrid={false}
                    style={{
                      cropAreaStyle: { border: '2px solid rgba(255,255,255,0.9)', borderRadius: '12px' }
                    }}
                  />
                ) : statusType === 'media' && statusMediaPreview ? (
                  <>
                    {statusMediaFile?.type?.startsWith('video/') ? (
                      <video
                        src={statusMediaPreview}
                        className="w-full h-full object-cover"
                        autoPlay muted loop playsInline
                      />
                    ) : (
                      <img
                        src={statusMediaPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        style={{ filter: `brightness(${photoFilters.brightness}%) contrast(${photoFilters.contrast}%) saturate(${photoFilters.saturation}%)` }}
                      />
                    )}
                    <button
                      onClick={clearStatusMedia}
                      className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-xl text-white hover:bg-black/70 transition z-20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {/* Caption overlay on media */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-20">
                      <input
                        value={statusContent}
                        onChange={e => setStatusContent(e.target.value)}
                        placeholder="Tambahkan caption..."
                        maxLength={500}
                        className="w-full px-4 py-2.5 bg-white/15 backdrop-blur-md text-white text-sm rounded-2xl border border-white/20 outline-none placeholder-white/50 focus:bg-white/25 transition"
                      />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-6">
                    <textarea
                      value={statusContent}
                      onChange={e => setStatusContent(e.target.value)}
                      placeholder="Ketik sesuatu..."
                      maxLength={500}
                      className="w-full text-center text-white text-lg sm:text-xl font-bold bg-transparent border-none outline-none resize-none placeholder-white/40 leading-relaxed"
                      rows={5}
                      autoFocus
                    />
                  </div>
                )}
                {/* Drag-over overlay */}
                {isDraggingOver && (
                  <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/25 backdrop-blur-sm z-30 pointer-events-none">
                    <div className="flex flex-col items-center gap-2 text-white drop-shadow-lg">
                      <Image className="w-10 h-10" />
                      <span className="text-sm font-bold">Lepas foto di sini</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Controls */}
              <div className="px-5 pt-3 pb-3 space-y-3 flex-shrink-0 overflow-y-auto" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                {showCameraMode ? (
                  /* ── Camera Capture Mode ── */
                  <div className="flex gap-2">
                    <button
                      onClick={stopCamera}
                      className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                      Batal
                    </button>
                    {isRecording ? (
                      <button
                        onClick={stopRecording}
                        className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 animate-pulse"
                      >
                        <Square className="w-4 h-4" /> Stop ({recordingTime}s)
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={capturePhoto}
                          className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" /> Foto
                        </button>
                        <button
                          onClick={startRecording}
                          className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          <Circle className="w-4 h-4" /> Rekam
                        </button>
                      </>
                    )}
                  </div>
                ) : showCropper ? (
                  /* ── Crop Mode ── */
                  <>
                    <div className="flex items-center gap-3">
                      <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <input
                        type="range" min={1} max={3} step={0.05} value={cropZoom}
                        onChange={e => setCropZoom(Number(e.target.value))}
                        className="flex-1 accent-emerald-500 h-1.5 cursor-pointer"
                      />
                      <span className="text-gray-400 text-xs w-8 text-right">{cropZoom.toFixed(1)}x</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelCrop}
                        className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={applyCrop}
                        className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-sm"
                      >
                        ✓ Terapkan
                      </button>
                    </div>
                  </>
                ) : showFilterPanel ? (
                  /* ── Filter Panel ── */
                  <>
                    <div className="flex overflow-x-auto pb-1 gap-3 scrollbar-none -mx-1 px-1">
                      {FILTER_PRESETS.map(preset => {
                        const isActive = photoFilters.brightness === preset.brightness && photoFilters.contrast === preset.contrast && photoFilters.saturation === preset.saturation;
                        return (
                          <button
                            key={preset.name}
                            onClick={() => setPhotoFilters({ brightness: preset.brightness, contrast: preset.contrast, saturation: preset.saturation })}
                            className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all ${isActive ? 'opacity-100 scale-105' : 'opacity-65 hover:opacity-90'}`}
                          >
                            <div className={`w-14 h-20 rounded-xl overflow-hidden ring-2 transition-all ${isActive ? 'ring-emerald-500' : 'ring-transparent'}`}>
                              <img
                                src={statusMediaPreview}
                                alt={preset.name}
                                className="w-full h-full object-cover"
                                style={{ filter: `brightness(${preset.brightness}%) contrast(${preset.contrast}%) saturate(${preset.saturation}%)` }}
                              />
                            </div>
                            <span className={`text-[10px] font-semibold ${isActive ? 'text-emerald-600' : 'text-gray-500'}`}>{preset.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setShowFilterPanel(false)}
                      className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition bg-gray-50 hover:bg-gray-100 rounded-xl"
                    >
                      Selesai
                    </button>
                  </>
                ) : (
                  /* ── Normal Mode ── */
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { clearStatusMedia(); setStatusType('text'); }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                          statusType === 'text'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <Type className="w-3.5 h-3.5" /> Teks
                      </button>
                      <button
                        onClick={() => { if (statusFileRef.current) { statusFileRef.current.accept = 'image/jpeg,image/png,image/gif,image/webp'; statusFileRef.current.click(); } }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                          statusType === 'media' && !statusMediaFile?.type?.startsWith('video/')
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <Image className="w-3.5 h-3.5" /> Foto
                      </button>
                      <button
                        onClick={() => {
                          if (statusFileRef.current) {
                            statusFileRef.current.accept = 'video/mp4,video/webm,video/quicktime';
                            statusFileRef.current.click();
                            // Reset accept after a delay to avoid resetting before dialog opens
                            setTimeout(() => {
                              if (statusFileRef.current) statusFileRef.current.accept = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime';
                            }, 500);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                          statusType === 'media' && statusMediaFile?.type?.startsWith('video/')
                            ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" /> Video
                      </button>
                      <button
                        onClick={startCamera}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" /> Kamera
                      </button>
                      {statusType === 'media' && !statusMediaFile?.type?.startsWith('video/') && (
                        <button
                          onClick={() => setShowFilterPanel(true)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all ml-auto"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                        </button>
                      )}
                    </div>

                    {/* Color picker (text mode only) */}
                    {statusType === 'text' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400 font-medium">Warna</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {STATUS_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => setStatusColor(c)}
                              className={`w-7 h-7 rounded-full transition-all duration-200 ${
                                statusColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-center text-[11px] text-gray-400">
                      Hilang otomatis dalam 24 jam{statusType === 'media' && statusMediaFile?.type?.startsWith('video/') ? ' · Video maks 30 detik' : ''}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
