// src/pages/core-dashboard/StatistikPerjadin.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Briefcase, 
  Calendar, 
  MapPin, 
  Users, 
  Activity,
  TrendingUp,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataCache } from '../../context/DataCacheContext';
import { isVpnUser } from '../../utils/vpnHelper';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api',
  getEndpoint: (path) => {
    // VPN users use /vpn-core/perjadin, normal users use /perjadin
    if (isVpnUser()) {
      return `${API_CONFIG.BASE_URL}/vpn-core/perjadin${path}`;
    }
    return `${API_CONFIG.BASE_URL}/perjadin${path}`;
  }
};

const CACHE_KEY = 'statistik-perjadin';

const StatistikPerjadin = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [kegiatanList, setKegiatanList] = useState([]);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBidang, setSelectedBidang] = useState('');
  const [expandedKegiatan, setExpandedKegiatan] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, -1 = previous, +1 = next
  const [calendarView, setCalendarView] = useState('weekly'); // 'weekly' or 'monthly'
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isUpdatingCalendar, setIsUpdatingCalendar] = useState(false); // For calendar-only updates
  const itemsPerPage = 5;
  const navigate = useNavigate();
  const { getCachedData, setCachedData, isCached } = useDataCache();

  useEffect(() => {
    // Check if data is already cached
    if (isCached(CACHE_KEY)) {
      const cachedData = getCachedData(CACHE_KEY);
      setDashboardData(cachedData.data.dashboardData);
      setKegiatanList(cachedData.data.kegiatanList);
      setWeeklySchedule(cachedData.data.weeklySchedule);
      setLoading(false);
    } else {
      fetchData();
    }
  }, []); // Only fetch once on mount

  // Update calendar when week offset changes (without full page reload)
  useEffect(() => {
    if (currentWeekOffset !== 0 || weeklySchedule.length > 0) {
      updateWeeklyCalendar();
    }
  }, [currentWeekOffset]);

  // Auto transition between days in calendar
  useEffect(() => {
    const dayInterval = setInterval(() => {
      if (weeklySchedule.length > 0) {
        setIsTransitioning(true);
        setTimeout(() => {
          setSelectedDayIndex(prev => (prev + 1) % weeklySchedule.length);
          setIsTransitioning(false);
        }, 200);
      }
    }, 5000); // Change day every 5 seconds

    return () => clearInterval(dayInterval);
  }, [weeklySchedule]);

  // Update only the weekly calendar (lazy update)
  const updateWeeklyCalendar = async () => {
    setIsUpdatingCalendar(true);
    try {
      const processedSchedule = generateWeekSchedule(currentWeekOffset, kegiatanList);
      setWeeklySchedule(processedSchedule);
      console.log('📅 Weekly calendar updated:', processedSchedule);
    } catch (err) {
      console.error('Error updating calendar:', err);
    } finally {
      setIsUpdatingCalendar(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('expressToken');
      
      const config = {};
      if (token !== 'VPN_ACCESS_TOKEN') {
        config.headers = {
          Authorization: `Bearer ${token}`
        };
      }
      
      // Fetch dashboard statistics
      const dashResponse = await axios.get(
        API_CONFIG.getEndpoint('/dashboard'),
        config
      );

      // Fetch kegiatan list with date filter
      const kegiatanResponse = await axios.get(
        API_CONFIG.getEndpoint('/kegiatan?limit=100'),
        config
      );

      setDashboardData(dashResponse.data.data);
      const allKegiatan = kegiatanResponse.data.data || [];
      setKegiatanList(allKegiatan);
      
      // Generate initial weekly schedule (current week)
      const processedSchedule = generateWeekSchedule(0, allKegiatan);
      console.log('📅 Initial weekly schedule loaded:', processedSchedule);
      setWeeklySchedule(processedSchedule);
      
      // Save to cache
      setCachedData(CACHE_KEY, {
        dashboardData: dashResponse.data.data,
        kegiatanList: allKegiatan,
        weeklySchedule: processedSchedule
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  // Generate week schedule with kegiatan mapping
  const generateWeekSchedule = (weekOffset, kegiatanData) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter kegiatan for this specific date
      const dayKegiatan = kegiatanData.filter(k => {
        const mulai = new Date(k.tanggal_mulai);
        const selesai = new Date(k.tanggal_selesai);
        const currentDate = new Date(dateStr);
        return currentDate >= mulai && currentDate <= selesai;
      });
      
      return {
        date: dateStr,
        day: date.toLocaleDateString('id-ID', { weekday: 'short' }),
        kegiatan: dayKegiatan
      };
    });
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    setCurrentWeekOffset(prev => prev - 1);
    setSelectedDayIndex(0);
  };

  const goToNextWeek = () => {
    setCurrentWeekOffset(prev => prev + 1);
    setSelectedDayIndex(0);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekOffset(0);
    setSelectedDayIndex(0);
  };

  // Generate monthly calendar
  const generateMonthCalendar = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    
    const calendar = [];
    let currentDate = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayKegiatan = kegiatanList.filter(k => {
          const mulai = new Date(k.tanggal_mulai);
          const selesai = new Date(k.tanggal_selesai);
          const checkDate = new Date(dateStr);
          return checkDate >= mulai && checkDate <= selesai;
        });
        
        weekDays.push({
          date: new Date(currentDate),
          dateStr: dateStr,
          isCurrentMonth: currentDate.getMonth() === month,
          isToday: currentDate.toDateString() === new Date().toDateString(),
          kegiatan: dayKegiatan
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      calendar.push(weekDays);
      
      // Stop if we've passed the last day of the month
      if (currentDate > lastDay && weekDays[weekDays.length - 1].date > lastDay) break;
    }
    
    return calendar;
  };

  // Filter kegiatan
  const filteredKegiatan = kegiatanList.filter(kegiatan => {
    const matchSearch = !searchTerm || 
      kegiatan.nama_kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kegiatan.lokasi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kegiatan.nomor_sp?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchBidang = !selectedBidang || 
      kegiatan.details?.some(d => d.id_bidang === parseInt(selectedBidang));
    
    return matchSearch && matchBidang;
  });

  // Pagination
  const totalPages = Math.ceil(filteredKegiatan.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedKegiatan = filteredKegiatan.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBidang]);

  const toggleExpand = (id) => {
    setExpandedKegiatan(expandedKegiatan === id ? null : id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (error) {
      return '-';
    }
  };

  const getDayName = (dateString) => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return days[date.getDay()];
    } catch (error) {
      return '-';
    }
  };

  // Count kegiatan per day for weekly calendar
  const getKegiatanCountForDate = (dateString) => {
    if (!weeklySchedule || weeklySchedule.length === 0) return 0;
    
    try {
      // Find the day in weeklySchedule
      const dayData = weeklySchedule.find(day => day.date === dateString);
      
      if (dayData && dayData.kegiatan && Array.isArray(dayData.kegiatan)) {
        return dayData.kegiatan.length;
      }
      
      return 0;
    } catch (error) {
      console.error('Error counting kegiatan:', error);
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Memuat Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-red-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header Card */}
        <div className="relative bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-3xl shadow-2xl p-8 mb-8 overflow-hidden">
          {/* Animated Background Patterns */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-white opacity-5 rounded-full animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                ✈️ Statistik Perjalanan Dinas
              </h1>
              <p className="text-white text-opacity-90 text-lg">
                Data Perjalanan Dinas DPMD Kabupaten Bogor
              </p>
            </div>

            {/* Quick Stats Pills */}
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="bg-orange-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-orange-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <Activity className="w-4 h-4 text-white animate-pulse" />
                <span className="text-white text-sm font-semibold">Real-time Data</span>
              </div>
              <div className="bg-red-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-red-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <Calendar className="w-4 h-4 text-white animate-pulse" />
                <span className="text-white text-sm font-semibold">Kalender Mingguan</span>
              </div>
              <div className="bg-pink-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-pink-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <MapPin className="w-4 h-4 text-white animate-bounce" />
                <span className="text-white text-sm font-semibold">Tracking Lokasi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards - Enhanced Colorful Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Kegiatan - Blue Gradient */}
          <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Activity className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <TrendingUp className="w-4 h-4 text-white animate-bounce" />
                </div>
              </div>
              <h3 className="text-blue-100 text-sm font-semibold mb-2">Total Kegiatan</h3>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">{dashboardData?.total_kegiatan || 0}</p>
              <p className="text-xs text-blue-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></span>
                Semua periode
              </p>
            </div>
          </div>

          {/* Kegiatan Minggu Ini - Green Gradient */}
          <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Calendar className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Activity className="w-4 h-4 text-white animate-bounce" />
                </div>
              </div>
              <h3 className="text-emerald-100 text-sm font-semibold mb-2">Kegiatan Minggu Ini</h3>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">{dashboardData?.kegiatan_minggu_ini || 0}</p>
              <p className="text-xs text-emerald-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></span>
                7 hari terakhir
              </p>
            </div>
          </div>

          {/* Kegiatan Bulan Ini - Purple Gradient */}
          <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-violet-600 to-purple-700"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white animate-bounce" />
                </div>
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Clock className="w-4 h-4 text-white animate-spin" />
                </div>
              </div>
              <h3 className="text-purple-100 text-sm font-semibold mb-2">Kegiatan Bulan Ini</h3>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">{dashboardData?.kegiatan_bulan_ini || 0}</p>
              <p className="text-xs text-purple-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-300 rounded-full animate-pulse"></span>
                30 hari terakhir
              </p>
            </div>
          </div>

          {/* Total Pegawai - Orange Gradient */}
          <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-600 to-orange-700"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Users className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Activity className="w-4 h-4 text-white animate-bounce" />
                </div>
              </div>
              <h3 className="text-orange-100 text-sm font-semibold mb-2">Total Pegawai</h3>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">{dashboardData?.total_pegawai || 0}</p>
              <p className="text-xs text-orange-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-300 rounded-full animate-pulse"></span>
                Yang terlibat
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Section - Weekly or Monthly */}
        {weeklySchedule.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-orange-600" />
                <h2 className="text-2xl font-bold text-gray-800">
                  {calendarView === 'weekly' ? 'Kalender Mingguan' : 'Kalender Bulanan'}
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setCalendarView('weekly')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      calendarView === 'weekly'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Mingguan
                  </button>
                  <button
                    onClick={() => setCalendarView('monthly')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      calendarView === 'monthly'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Bulanan
                  </button>
                </div>
              </div>
            </div>

            {/* Weekly Calendar View */}
            {calendarView === 'weekly' && (
              <>
                {/* Week Navigation */}
                <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3">
                  <button
                    onClick={goToPreviousWeek}
                    disabled={isUpdatingCalendar}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg shadow-sm transition-all hover:shadow-md group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-orange-600 group-hover:-translate-x-1 transition-all" />
                    <span className="text-sm font-medium text-gray-700">Minggu Sebelumnya</span>
                  </button>
                  
                  <div className="flex flex-col items-center">
                    {isUpdatingCalendar ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                        <span className="text-sm font-medium text-gray-600">Memuat...</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-gray-600">
                          {weeklySchedule[0] && (() => {
                            const startDate = new Date(weeklySchedule[0].date);
                            const endDate = new Date(weeklySchedule[6].date);
                            return `${startDate.getDate()} ${startDate.toLocaleDateString('id-ID', { month: 'short' })} - ${endDate.getDate()} ${endDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`;
                          })()}
                        </span>
                        {currentWeekOffset !== 0 && (
                          <button
                            onClick={goToCurrentWeek}
                            className="mt-1 text-xs text-orange-600 hover:text-orange-700 font-medium hover:underline"
                          >
                            Kembali ke Minggu Ini
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={goToNextWeek}
                    disabled={isUpdatingCalendar}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg shadow-sm transition-all hover:shadow-md group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-sm font-medium text-gray-700">Minggu Berikutnya</span>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>

                {/* Weekly Calendar Grid */}
                <div className={`grid grid-cols-7 gap-3 transition-opacity duration-300 ${isUpdatingCalendar ? 'opacity-50' : 'opacity-100'}`}>
                  {weeklySchedule.map((day, index) => {
                    const isToday = new Date(day.date).toDateString() === new Date().toDateString();
                    const isSelected = index === selectedDayIndex;
                    const kegiatanCount = day.kegiatan?.length || 0;
                    
                    return (
                      <div 
                        key={index}
                        onClick={() => setSelectedDayIndex(index)}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer transform ${
                          isSelected
                            ? 'border-transparent bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl scale-110 -translate-y-1'
                            : isToday 
                            ? 'border-transparent bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg hover:shadow-xl hover:scale-105' 
                            : 'border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-orange-300 hover:shadow-lg hover:scale-105'
                        } ${isTransitioning && isSelected ? 'animate-pulse' : ''}`}
                      >
                        <div className="text-center relative z-10">
                          <div className={`text-xs font-bold mb-1 uppercase tracking-wide ${
                            isSelected ? 'text-white' : isToday ? 'text-white' : 'text-gray-600'
                          }`}>
                            {day.day}
                          </div>
                          <div className={`text-3xl font-extrabold mb-2 ${
                            isSelected ? 'text-white' : isToday ? 'text-white' : 'text-gray-800'
                          }`}>
                            {(() => {
                              const date = new Date(day.date);
                              return isNaN(date.getTime()) ? '-' : date.getDate();
                            })()}
                          </div>
                          <div className={`text-xs font-semibold mb-1 ${
                            kegiatanCount > 0 
                              ? isSelected || isToday ? 'text-white' : 'text-emerald-600' 
                              : isSelected || isToday ? 'text-white/80' : 'text-gray-400'
                          }`}>
                            {kegiatanCount > 0 ? `${kegiatanCount} kegiatan` : 'Tidak ada'}
                          </div>
                        </div>
                        {isSelected && (
                          <>
                            <div className="absolute inset-0 bg-white/10 rounded-xl animate-pulse"></div>
                            <div className="mt-1 text-center relative z-10">
                              <span className="inline-block px-2 py-0.5 bg-white/30 backdrop-blur-sm text-white text-xs rounded-full font-bold animate-pulse">
                                Dipilih
                              </span>
                            </div>
                          </>
                        )}
                        {isToday && !isSelected && (
                          <div className="mt-1 text-center relative z-10">
                            <span className="inline-block px-2 py-0.5 bg-white/30 backdrop-blur-sm text-white text-xs rounded-full font-bold">
                              Hari ini
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Monthly Calendar View */}
            {calendarView === 'monthly' && (
              <>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3">
                  <button
                    onClick={() => {
                      const newMonth = new Date(selectedMonth);
                      newMonth.setMonth(newMonth.getMonth() - 1);
                      setSelectedMonth(newMonth);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg shadow-sm transition-all hover:shadow-md group"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-orange-600 group-hover:-translate-x-1 transition-all" />
                    <span className="text-sm font-medium text-gray-700">Bulan Sebelumnya</span>
                  </button>
                  
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-gray-800">
                      {selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                    {selectedMonth.getMonth() !== new Date().getMonth() && (
                      <button
                        onClick={() => setSelectedMonth(new Date())}
                        className="mt-1 text-xs text-orange-600 hover:text-orange-700 font-medium hover:underline"
                      >
                        Kembali ke Bulan Ini
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      const newMonth = new Date(selectedMonth);
                      newMonth.setMonth(newMonth.getMonth() + 1);
                      setSelectedMonth(newMonth);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg shadow-sm transition-all hover:shadow-md group"
                  >
                    <span className="text-sm font-medium text-gray-700">Bulan Berikutnya</span>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>

                {/* Monthly Calendar Grid */}
                <div className="space-y-2">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-2">
                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                      <div key={day} className="text-center text-sm font-bold text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Days */}
                  {generateMonthCalendar().map((week, weekIdx) => (
                    <div key={weekIdx} className="grid grid-cols-7 gap-2">
                      {week.map((day, dayIdx) => {
                        const kegiatanCount = day.kegiatan?.length || 0;
                        return (
                          <div
                            key={dayIdx}
                            className={`relative p-3 rounded-lg border transition-all cursor-pointer min-h-[80px] ${
                              !day.isCurrentMonth
                                ? 'bg-gray-50 border-gray-100 opacity-50'
                                : day.isToday
                                ? 'bg-gradient-to-br from-orange-100 to-amber-100 border-orange-300 shadow-md hover:shadow-lg'
                                : kegiatanCount > 0
                                ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 hover:shadow-md'
                                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }`}
                          >
                            <div className={`text-sm font-semibold mb-1 ${
                              day.isToday ? 'text-orange-700' : !day.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                            }`}>
                              {day.date.getDate()}
                            </div>
                            {kegiatanCount > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs font-medium text-emerald-700">
                                    {kegiatanCount} kegiatan
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 line-clamp-2">
                                  {day.kegiatan[0]?.nama_kegiatan}
                                </div>
                              </div>
                            )}
                            {day.isToday && (
                              <div className="absolute top-1 right-1">
                                <span className="inline-block px-1.5 py-0.5 bg-orange-600 text-white text-xs rounded-full font-bold">
                                  Hari ini
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Kegiatan Hari Yang Dipilih */}
        {weeklySchedule.length > 0 && weeklySchedule[selectedDayIndex] && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-800">
                  Kegiatan {getDayName(weeklySchedule[selectedDayIndex].date)}, {(() => {
                    const date = new Date(weeklySchedule[selectedDayIndex].date);
                    return !isNaN(date.getTime()) ? date.getDate() : '-';
                  })()} {(() => {
                    const date = new Date(weeklySchedule[selectedDayIndex].date);
                    return !isNaN(date.getTime()) ? date.toLocaleDateString('id-ID', { month: 'long' }) : '-';
                  })()}
                </h2>
              </div>
              <span className="text-sm text-gray-500">
                {weeklySchedule[selectedDayIndex].kegiatan?.length || 0} kegiatan
              </span>
            </div>
            
            {weeklySchedule[selectedDayIndex].kegiatan && weeklySchedule[selectedDayIndex].kegiatan.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {weeklySchedule[selectedDayIndex].kegiatan.map((kegiatan, idx) => (
                  <div 
                    key={idx}
                    className={`bg-gradient-to-r from-gray-50 to-white rounded-lg p-4 border-l-4 border-green-500 hover:shadow-md transition-all ${
                      isTransitioning ? 'opacity-50' : 'opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {kegiatan.nama_kegiatan}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {kegiatan.nomor_sp}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(kegiatan.tanggal_mulai)} - {formatDate(kegiatan.tanggal_selesai)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{kegiatan.lokasi}</span>
                          </div>
                          {kegiatan.details && kegiatan.details.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{kegiatan.details.length} bidang terlibat</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Terjadwal
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada kegiatan pada hari ini</p>
              </div>
            )}
          </div>
        )}

        {/* Kegiatan Per Bidang */}
        {dashboardData?.kegiatan_per_bidang && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-800">Kegiatan Per Bidang</h2>
              <span className="text-sm text-gray-500 ml-auto">
                {dashboardData.kegiatan_per_bidang.length} Bidang Terlibat
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardData.kegiatan_per_bidang.map((bidang, index) => {
                // Array warna gradient untuk setiap bidang
                const colors = [
                  'from-blue-500 to-cyan-600',
                  'from-purple-500 to-pink-600',
                  'from-orange-500 to-red-600',
                  'from-green-500 to-emerald-600',
                  'from-indigo-500 to-purple-600',
                  'from-yellow-500 to-orange-600',
                  'from-teal-500 to-green-600',
                  'from-rose-500 to-pink-600'
                ];
                const colorClass = colors[index % colors.length];
                
                return (
                  <div 
                    key={index}
                    className={`relative overflow-hidden p-5 rounded-2xl border-2 border-transparent bg-gradient-to-br ${colorClass} hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group`}
                    onClick={() => setSelectedBidang(selectedBidang === bidang.id_bidang.toString() ? '' : bidang.id_bidang.toString())}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform">
                          <Activity className="w-6 h-6 text-white animate-pulse" />
                        </div>
                        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                          <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                      <p className="text-white/90 text-sm font-semibold mb-2">
                        {bidang.nama_bidang || 'Bidang'}
                      </p>
                      <p className="text-4xl font-extrabold text-white mb-1">
                        {bidang.total_kegiatan}
                      </p>
                      <p className="text-xs text-white/80 flex items-center gap-1">
                        <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></span>
                        Kegiatan terdaftar
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Daftar Kegiatan */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-800">Daftar Kegiatan</h2>
            </div>
            <div className="text-sm text-gray-600">
              Total: <span className="font-bold">{filteredKegiatan.length}</span> kegiatan
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari nama kegiatan, lokasi, atau nomor SP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedBidang}
                onChange={(e) => setSelectedBidang(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
              >
                <option value="">Semua Bidang</option>
                {dashboardData?.kegiatan_per_bidang?.map((bidang) => (
                  <option key={bidang.id_bidang} value={bidang.id_bidang}>
                    {bidang.nama_bidang}
                  </option>
                ))}
              </select>
            </div>

            {(searchTerm || selectedBidang) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBidang('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Kegiatan List */}
          {paginatedKegiatan.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada kegiatan yang ditemukan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedKegiatan.map((kegiatan, index) => {
                const isExpanded = expandedKegiatan === kegiatan.id_kegiatan;
                return (
                  <div 
                    key={kegiatan.id_kegiatan}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Kegiatan Header */}
                    <div 
                      onClick={() => toggleExpand(kegiatan.id_kegiatan)}
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                              {startIndex + index + 1}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800 mb-2">
                                {kegiatan.nama_kegiatan}
                              </h3>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <FileText className="w-4 h-4" />
                                  <span>{kegiatan.nomor_sp}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <MapPin className="w-4 h-4" />
                                  <span>{kegiatan.lokasi}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    {formatDate(kegiatan.tanggal_mulai)} - {formatDate(kegiatan.tanggal_selesai)}
                                  </span>
                                </div>
                                {kegiatan.details && kegiatan.details.length > 0 && (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Building2 className="w-4 h-4" />
                                    <span>{kegiatan.details.length} Bidang</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <button className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Kegiatan Details (Expanded) */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        {kegiatan.keterangan && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Keterangan:</p>
                            <p className="text-sm text-gray-600">{kegiatan.keterangan}</p>
                          </div>
                        )}
                        
                        {kegiatan.details && kegiatan.details.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-3">
                              Bidang & Pegawai:
                            </p>
                            <div className="space-y-3">
                              {kegiatan.details.map((detail, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="w-4 h-4 text-orange-600" />
                                    <span className="font-medium text-gray-800">
                                      {detail.nama_bidang || 'Bidang'}
                                    </span>
                                  </div>
                                  {detail.pegawai_list && detail.pegawai_list.length > 0 && (
                                    <div className="ml-6">
                                      <p className="text-xs text-gray-500 mb-1">Pegawai:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {detail.pegawai_list.map((pegawai, pIdx) => (
                                          <span 
                                            key={pIdx}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                          >
                                            <Users className="w-3 h-3" />
                                            {pegawai.nama_pegawai}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredKegiatan.length)} dari {filteredKegiatan.length} kegiatan
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    // Show first, last, current, and adjacent pages
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-orange-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === currentPage - 2 ||
                      pageNum === currentPage + 2
                    ) {
                      return <span key={pageNum} className="px-2">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatistikPerjadin;
