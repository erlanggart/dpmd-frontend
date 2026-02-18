// src/pages/kepala-dinas/StatistikPerjadinDashboard.jsx
// Dashboard Statistik Perjalanan Dinas dengan Light Theme Modern
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiRefreshCw, FiDownload, FiChevronDown, FiMapPin, FiUsers, FiCalendar, FiTrendingUp
} from 'react-icons/fi';
import { 
  BarChart3, Calendar, Briefcase, Users, Clock, MapPin as MapPinLucide, 
  FileText, Building2, ArrowRight, Activity, CheckCircle, Target,
  Play, Pause
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend, 
  Filler
} from 'chart.js';
import * as XLSX from 'xlsx';
import perjadinService from '../../services/perjadinService';
import toast from 'react-hot-toast';
import { useDataCache } from '../../context/DataCacheContext';

// Register ChartJS modules
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler);

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'jt';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'rb';
  return num?.toString() || '0';
};

const StatistikPerjadinDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [allKegiatan, setAllKegiatan] = useState([]);
  const [selectedBidang, setSelectedBidang] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [expandedBidang, setExpandedBidang] = useState({});
  
  // Calendar states
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isAutoTransition, setIsAutoTransition] = useState(true);
  const [animating, setAnimating] = useState(false);
  const autoTransitionRef = useRef(null);
  const { getCachedData, setCachedData, isCached, clearCache } = useDataCache();

  useEffect(() => {
    if (isCached('statistik-perjadin')) {
      const cached = getCachedData('statistik-perjadin').data;
      setDashboardData(cached.dashboardData);
      setAllKegiatan(cached.allKegiatan);
      setLoading(false);
    } else {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard statistics
      const dashboardRes = await perjadinService.getDashboard();
      let dashData = null;
      let kegiatanData = [];
      if (dashboardRes.data.success) {
        dashData = dashboardRes.data.data;
        setDashboardData(dashData);
      }

      // Fetch all kegiatan for detailed statistics
      const kegiatanRes = await perjadinService.getAllKegiatan({ limit: 1000 });
      if (kegiatanRes.data.success) {
        kegiatanData = kegiatanRes.data.data.kegiatan || [];
        setAllKegiatan(kegiatanData);
      }

      setCachedData('statistik-perjadin', { dashboardData: dashData, allKegiatan: kegiatanData });
    } catch (err) {
      console.error('Error fetching perjadin data:', err);
      setError(err.message || 'Gagal memuat data perjalanan dinas');
      toast.error('Gagal memuat data perjalanan dinas');
    } finally {
      setLoading(false);
    }
  };

  // Auto-transition effect for calendar
  useEffect(() => {
    if (isAutoTransition && dashboardData) {
      autoTransitionRef.current = setInterval(() => {
        setAnimating(true);
        setTimeout(() => {
          setSelectedDayIndex(prev => (prev + 1) % 7);
          setAnimating(false);
        }, 300);
      }, 4000);
    }

    return () => {
      if (autoTransitionRef.current) {
        clearInterval(autoTransitionRef.current);
      }
    };
  }, [isAutoTransition, dashboardData]);

  const handleDayClick = useCallback((index) => {
    setIsAutoTransition(false);
    setAnimating(true);
    setTimeout(() => {
      setSelectedDayIndex(index);
      setAnimating(false);
    }, 150);
  }, []);

  // Format upcoming kegiatan by date for calendar
  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const getKegiatanForDate = (date) => {
    if (!dashboardData?.upcoming_kegiatan) return [];

    return dashboardData.upcoming_kegiatan.filter(k => {
      const kegiatanDate = new Date(k.tanggal_mulai);
      return kegiatanDate.toDateString() === date.toDateString();
    });
  };

  const formatDateCalendar = (date) => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return {
      day: days[date.getDay()],
      dayFull: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date.getDay()],
      date: date.getDate(),
      month: date.getMonth() + 1,
      monthName: months[date.getMonth()],
      year: date.getFullYear()
    };
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const selectedDay = weekDays[selectedDayIndex];
  const selectedDayFormatted = selectedDay ? formatDateCalendar(selectedDay) : null;
  const selectedDayKegiatan = selectedDay ? getKegiatanForDate(selectedDay) : [];

  // Process kegiatan data for statistics
  const processedStats = useMemo(() => {
    if (!allKegiatan.length) return null;

    // Group by bidang
    const bidangMap = {};
    allKegiatan.forEach(kegiatan => {
      // Each kegiatan can have multiple bidang
      const bidangList = kegiatan.kegiatan_bidang || [];
      bidangList.forEach(kb => {
        const bidangId = kb.id_bidang || kb.bidangs?.id;
        const bidangNama = kb.bidangs?.nama || 'Unknown';
        
        if (!bidangMap[bidangId]) {
          bidangMap[bidangId] = {
            id: bidangId,
            nama: bidangNama,
            count: 0,
            kegiatan: []
          };
        }
        bidangMap[bidangId].count++;
        bidangMap[bidangId].kegiatan.push({
          id: kegiatan.id_kegiatan,
          nama: kegiatan.nama_kegiatan,
          tanggal_mulai: kegiatan.tanggal_mulai,
          tanggal_selesai: kegiatan.tanggal_selesai,
          lokasi: kegiatan.lokasi,
          nomor_sp: kegiatan.nomor_sp
        });
      });
    });

    // Group by month for trend chart
    const monthlyStats = {};
    allKegiatan.forEach(kegiatan => {
      const date = new Date(kegiatan.tanggal_mulai);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = 0;
      }
      monthlyStats[monthKey]++;
    });

    // Group by lokasi
    const lokasiStats = {};
    allKegiatan.forEach(kegiatan => {
      const lokasi = kegiatan.lokasi || 'Tidak Diketahui';
      if (!lokasiStats[lokasi]) {
        lokasiStats[lokasi] = 0;
      }
      lokasiStats[lokasi]++;
    });

    return {
      bidangMap,
      monthlyStats,
      lokasiStats,
      totalKegiatan: allKegiatan.length
    };
  }, [allKegiatan]);

  // Filter kegiatan by selected bidang
  const filteredKegiatan = useMemo(() => {
    if (!selectedBidang || !processedStats) return allKegiatan;
    return processedStats.bidangMap[selectedBidang]?.kegiatan || [];
  }, [selectedBidang, processedStats, allKegiatan]);

  // Chart data for bidang distribution - use dashboard data directly
  const bidangChartData = useMemo(() => {
    // Use dashboardData.breakdown_per_bidang directly instead of processedStats
    const bidangList = dashboardData?.breakdown_per_bidang || [];
    if (!bidangList.length) return { labels: [], datasets: [] };
    
    const sortedBidang = [...bidangList]
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 10);

    return {
      labels: sortedBidang.map(b => {
        const name = b.bidang || b.nama || 'Unknown';
        return name.length > 15 ? name.substring(0, 15) + '...' : name;
      }),
      datasets: [{
        label: 'Jumlah Kegiatan',
        data: sortedBidang.map(b => b.total || b.jumlah || 0),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(14, 165, 233, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(20, 184, 166, 0.8)',
          'rgba(234, 179, 8, 0.8)'
        ],
        borderRadius: 8,
        borderSkipped: false
      }]
    };
  }, [dashboardData]);

  // Chart data for monthly trend - use allKegiatan if available, otherwise show summary stats
  const monthlyChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    if (processedStats?.monthlyStats && Object.keys(processedStats.monthlyStats).length > 0) {
      const sortedMonths = Object.entries(processedStats.monthlyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12);

      return {
        labels: sortedMonths.map(([key]) => {
          const [year, month] = key.split('-');
          return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
        }),
        datasets: [{
          label: 'Kegiatan per Bulan',
          data: sortedMonths.map(([, count]) => count),
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false
        }]
      };
    }

    // Fallback: show summary statistics as bar chart
    if (dashboardData) {      
      return {
        labels: ['Minggu Ini', 'Bulan Ini', 'Total'],
        datasets: [{
          label: 'Jumlah Kegiatan',
          data: [dashboardData.minggu_ini || 0, dashboardData.bulan_ini || 0, dashboardData.total || 0],
          backgroundColor: ['rgba(236, 72, 153, 0.8)', 'rgba(249, 115, 22, 0.8)', 'rgba(99, 102, 241, 0.8)'],
          borderRadius: 6,
          borderSkipped: false
        }]
      };
    }

    return { labels: [], datasets: [] };
  }, [processedStats, dashboardData]);

  const toggleBidang = (bidangId) => {
    setExpandedBidang(prev => ({
      ...prev,
      [bidangId]: !prev[bidangId]
    }));
  };

  const handleExportExcel = () => {
    if (!allKegiatan.length) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }

    const exportData = allKegiatan.map((k, index) => ({
      'No': index + 1,
      'Nama Kegiatan': k.nama_kegiatan,
      'Nomor SP': k.nomor_sp || '-',
      'Tanggal Mulai': new Date(k.tanggal_mulai).toLocaleDateString('id-ID'),
      'Tanggal Selesai': new Date(k.tanggal_selesai).toLocaleDateString('id-ID'),
      'Lokasi': k.lokasi || '-',
      'Bidang': k.kegiatan_bidang?.map(kb => kb.bidangs?.nama).filter(Boolean).join(', ') || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Perjalanan Dinas');
    XLSX.writeFile(wb, `statistik-perjalanan-dinas-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data berhasil diexport!');
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
            <Briefcase className="absolute inset-0 m-auto w-10 h-10 text-indigo-600" />
          </div>
          <p className="text-gray-600 font-medium">Memuat Data Perjalanan Dinas...</p>
        </motion.div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Gagal Memuat Data</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => { clearCache('statistik-perjadin'); fetchData(); }}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/30 transition-all"
          >
            Coba Lagi
          </button>
        </motion.div>
      </div>
    );
  }

  const stats = dashboardData || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-8 mb-8 shadow-2xl"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-200/30 rounded-full -ml-24 -mb-24"></div>
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-yellow-300/30 rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/50 rounded-xl backdrop-blur-sm shadow-lg">
                    <Briefcase className="w-8 h-8 text-orange-700" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      Statistik Perjalanan Dinas
                    </h1>
                    <p className="text-white/90 mt-1">DPMD Kabupaten Bogor</p>
                  </div>
                </div>
              </div>
              
              {/* Refresh & Export Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/30 hover:bg-white/50 rounded-xl transition-all border border-white/50 shadow-lg text-white font-medium text-sm"
                >
                  <FiDownload className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => { clearCache('statistik-perjadin'); fetchData(); }}
                  disabled={loading}
                  className="p-3 bg-white/30 hover:bg-white/50 rounded-xl transition-all border border-white/50 shadow-lg"
                >
                  <FiRefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Kegiatan', value: stats.total || 0, icon: FileText, color: 'from-cyan-400 to-blue-500' },
                { label: 'Minggu Ini', value: stats.minggu_ini || 0, icon: Calendar, color: 'from-pink-400 to-rose-500' },
                { label: 'Bulan Ini', value: stats.bulan_ini || 0, icon: Clock, color: 'from-amber-400 to-orange-500' },
                { label: 'Total Pegawai', value: stats.total_pegawai || 0, icon: Users, color: 'from-emerald-400 to-green-500' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-white/50 hover:shadow-lg transition-all group shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs font-medium">{stat.label}</p>
                      <p className="text-gray-800 text-xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bidang Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl p-6 mb-8 border border-gray-200 shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Kegiatan per Bidang</h3>
            </div>
            {selectedBidang && (
              <button
                onClick={() => setSelectedBidang(null)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors border border-gray-300"
              >
                ✕ Reset Filter
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(stats.breakdown_per_bidang || []).map((bidang, index) => {
              const isSelected = selectedBidang === bidang.id_bidang;
              const colors = [
                { gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600' },
                { gradient: 'from-purple-500 to-pink-600', bg: 'bg-purple-50', text: 'text-purple-600' },
                { gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
                { gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600' },
                { gradient: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', text: 'text-rose-600' },
                { gradient: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50', text: 'text-cyan-600' },
              ];
              const color = colors[index % colors.length];

              return (
                <motion.div 
                  key={bidang.id_bidang}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.03, y: -3 }}
                  onClick={() => setSelectedBidang(isSelected ? null : bidang.id_bidang)}
                  onMouseEnter={() => setHoveredCard(bidang.id_bidang)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all duration-300 bg-white border ${
                    isSelected ? 'ring-4 ring-orange-300 shadow-2xl border-orange-400' : 'border-gray-200 hover:shadow-lg'
                  }`}
                >
                  {/* Hover Gradient */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-br ${color.gradient} opacity-0 transition-opacity duration-300 ${
                      hoveredCard === bidang.id_bidang || isSelected ? 'opacity-100' : ''
                    }`}
                  ></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        hoveredCard === bidang.id_bidang || isSelected ? 'bg-white/30' : color.bg
                      }`}>
                        <Briefcase className={`w-5 h-5 transition-colors ${
                          hoveredCard === bidang.id_bidang || isSelected ? 'text-white' : color.text
                        }`} />
                      </div>
                    </div>
                    <p className={`text-sm font-medium mb-1 transition-colors ${
                      hoveredCard === bidang.id_bidang || isSelected ? 'text-white' : 'text-gray-600'
                    }`}>{bidang.nama}</p>
                    <p className={`text-3xl font-bold mb-1 transition-colors ${
                      hoveredCard === bidang.id_bidang || isSelected ? 'text-white' : 'text-gray-800'
                    }`}>{bidang.jumlah}</p>
                    <p className={`text-xs transition-colors ${
                      hoveredCard === bidang.id_bidang || isSelected ? 'text-white/80' : 'text-gray-500'
                    }`}>Kegiatan</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Kalender Mingguan with Auto-Transition */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-3xl p-6 mb-8 border border-gray-200 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Kalender Mingguan</h3>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setIsAutoTransition(!isAutoTransition)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isAutoTransition
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isAutoTransition ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isAutoTransition ? 'Auto' : 'Manual'}</span>
              </button>
            </div>
          </div>

          {/* Week Days Grid with Selection */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map((day, index) => {
              const formatted = formatDateCalendar(day);
              const kegiatanList = getKegiatanForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected = index === selectedDayIndex;

              return (
                <button
                  key={index}
                  onClick={() => handleDayClick(index)}
                  className={`relative text-center p-3 rounded-xl transition-all duration-300 transform ${
                    isSelected
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white scale-105 shadow-lg'
                      : isToday
                      ? 'bg-green-100 border-2 border-green-500 hover:scale-102'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:scale-102'
                  }`}
                >
                  <p className={`text-xs font-medium ${
                    isSelected ? 'text-white/80' : isToday ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {formatted.day}
                  </p>
                  <p className={`text-lg font-bold mt-1 ${
                    isSelected ? 'text-white' : isToday ? 'text-green-700' : 'text-gray-800'
                  }`}>
                    {formatted.date}
                  </p>
                  <p className={`text-xs ${
                    isSelected ? 'text-white/70' : isToday ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {formatted.monthName}
                  </p>
                  {/* Kegiatan indicator */}
                  {kegiatanList.length > 0 && (
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-green-400 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      {kegiatanList.length}
                    </div>
                  )}
                  {/* Today indicator dot */}
                  {isToday && !isSelected && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Auto-transition progress bar */}
          {isAutoTransition && (
            <div className="mb-4">
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-100"
                  style={{
                    width: '100%',
                    animation: 'shrink 4s linear infinite'
                  }}
                />
              </div>
              <style>{`
                @keyframes shrink {
                  from { width: 100%; }
                  to { width: 0%; }
                }
              `}</style>
            </div>
          )}

          {/* Selected Day's Events */}
          <div className={`border-t pt-4 transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                <p className="text-sm font-semibold text-gray-700">
                  {selectedDayFormatted?.dayFull}, {selectedDayFormatted?.date} {selectedDayFormatted?.monthName} {selectedDayFormatted?.year}
                </p>
              </div>
              <div className="flex gap-1">
                {weekDays.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i === selectedDayIndex ? 'bg-blue-600 scale-125' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Kegiatan List for Selected Day */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {selectedDayKegiatan.length > 0 ? (
                selectedDayKegiatan.map((kegiatan, idx) => (
                  <motion.div
                    key={kegiatan.id_kegiatan || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 text-sm truncate">
                          {kegiatan.nama_kegiatan}
                        </h4>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPinLucide className="w-3 h-3" />
                            <span className="truncate">{kegiatan.lokasi || 'Lokasi TBD'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(kegiatan.tanggal_mulai)}</span>
                          </div>
                        </div>
                      </div>
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Aktif
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Calendar className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-semibold text-gray-600">Tidak Ada Kegiatan</p>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Belum ada kegiatan yang dijadwalkan<br />untuk tanggal ini
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Charts Section */}
        <div className="mb-8">
          {/* Bar Chart - Bidang */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Kegiatan per Bidang</h3>
                <p className="text-gray-500 text-sm">10 bidang teratas</p>
              </div>
            </div>
            <div className="h-80">
              {bidangChartData.labels?.length > 0 ? (
                <Bar
                  data={bidangChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1f2937',
                        bodyColor: '#4b5563',
                        padding: 16,
                        borderColor: 'rgba(0,0,0,0.1)',
                        borderWidth: 1,
                        cornerRadius: 12
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { color: 'rgba(100,116,139,0.8)', font: { size: 10 } }
                      },
                      x: {
                        grid: { display: false },
                        ticks: { 
                          color: 'rgba(100,116,139,0.8)', 
                          font: { size: 9 },
                          maxRotation: 45,
                          minRotation: 45
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <BarChart3 className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="font-medium text-gray-500">Belum ada data bidang</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Trend Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-3xl p-6 mb-8 border border-gray-200 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
              <FiTrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Statistik Kegiatan</h3>
              <p className="text-gray-500 text-sm">Ringkasan jumlah kegiatan perjalanan dinas</p>
            </div>
          </div>
          <div className="h-64">
            {monthlyChartData.labels?.length > 0 ? (
              <Bar
                data={monthlyChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      titleColor: '#1f2937',
                      bodyColor: '#4b5563',
                      padding: 16,
                      borderColor: 'rgba(0,0,0,0.1)',
                      borderWidth: 1,
                      cornerRadius: 12
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0,0,0,0.05)' },
                      ticks: { color: 'rgba(100,116,139,0.8)' }
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: 'rgba(100,116,139,0.8)' }
                    }
                  }
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <FiTrendingUp className="w-12 h-12 text-gray-300 mb-3" />
                <p className="font-medium text-gray-500">Belum ada data statistik</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Kegiatan */}
        {stats.upcoming_kegiatan?.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Kegiatan Mendatang</h3>
                <p className="text-gray-500 text-sm">7 hari ke depan</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.upcoming_kegiatan.map((kegiatan, index) => (
                <motion.div
                  key={kegiatan.id_kegiatan}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
                      <Briefcase className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 text-sm truncate">{kegiatan.nama_kegiatan}</h4>
                      <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(kegiatan.tanggal_mulai)}</span>
                      </div>
                      {kegiatan.lokasi && (
                        <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs">
                          <MapPinLucide className="w-3 h-3" />
                          <span className="truncate">{kegiatan.lokasi}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default StatistikPerjadinDashboard;
