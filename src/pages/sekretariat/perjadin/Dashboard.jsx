import React, { useState, useEffect } from 'react';
import { 
  FiCalendar, 
  FiUsers, 
  FiMapPin, 
  FiTrendingUp, 
  FiActivity,
  FiBarChart2,
  FiClock,
  FiArrowRight,
  FiInfo
} from 'react-icons/fi';
import api from '../../../api';
import Swal from 'sweetalert2';
import { generateSafeDataHashLong } from '../../../utils/hashUtils';

// Enhanced animations and transitions
const enhancedStyles = `
  @keyframes smoothFadeInUp {
    0% {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes slideInFromRight {
    0% {
      opacity: 0;
      transform: translateX(20px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOutToLeft {
    0% {
      opacity: 1;
      transform: translateX(0);
    }
    100% {
      opacity: 0;
      transform: translateX(-20px);
    }
  }

  .smooth-fade-in-up {
    animation: smoothFadeInUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .slide-in-right {
    animation: slideInFromRight 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .slide-out-left {
    animation: slideOutToLeft 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .day-transition {
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
`;

// Inject enhanced styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = enhancedStyles;
  document.head.appendChild(styleSheet);
}



// Activity Card Component
const ActivityCard = ({ activity }) => {
  if (!activity) return null;

  const getBidangData = (details) => {
    if (!details || details.length === 0) return [];
    
    return details.map(detail => ({
      bidang: detail.bidang?.nama || 'Unknown',
      pegawai: detail.pegawai || 'Tidak ada pegawai'
    }));
  };

  const bidangData = getBidangData(activity.details);

  return (
    <div 
      className="rounded-xl p-5 shadow-lg hover:shadow-2xl transition-all duration-700 smooth-fade-in-up border border-slate-600/30 hover:border-slate-500/50 transform hover:-translate-y-2 hover:scale-[1.03]" 
      style={{
        background: 'linear-gradient(135deg, #334155 0%, #475569 35%, #1e293b 100%)',
        boxShadow: '0 10px 25px -5px rgba(51, 65, 85, 0.3), 0 10px 10px -5px rgba(71, 85, 105, 0.04)',
        animationDelay: '0.1s'
      }}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h5 className="font-bold text-white text-lg mb-2 leading-tight">{activity.nama_kegiatan}</h5>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
            <p className="text-slate-200 text-sm font-medium">SP: {activity.nomor_sp}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1.5 bg-slate-700/50 text-slate-100 text-xs font-semibold rounded-lg backdrop-blur-sm border border-slate-600/30">
            {new Date(activity.tanggal_mulai).toLocaleDateString('id-ID')}
          </span>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="space-y-3">
        {/* Lokasi */}
        <div className="flex items-center gap-3 p-2 bg-slate-800/30 rounded-lg backdrop-blur-sm">
          <div className="p-1.5 bg-slate-700/50 rounded-md">
            <FiMapPin className="w-4 h-4 text-slate-200" />
          </div>
          <span className="text-slate-100 font-medium">{activity.lokasi}</span>
        </div>
        
        {/* Bidang dan Pegawai */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-700/50 rounded-md">
              <FiUsers className="w-4 h-4 text-slate-200" />
            </div>
            <span className="text-slate-200 text-sm font-semibold tracking-wide">Bidang & Pegawai</span>
          </div>
          
          <div className="space-y-2.5 ml-1">
            {bidangData.map((item, index) => (
              <div key={index} className="bg-slate-800/40 rounded-lg p-3.5 backdrop-blur-sm border border-slate-700/20 hover:bg-slate-800/50 transition-colors duration-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 bg-slate-400 rounded-full shadow-sm"></div>
                    <span className="text-slate-100 font-semibold text-sm tracking-wide">{item.bidang}</span>
                  </div>
                  <div className="ml-4.5 pl-1">
                    <span className="text-slate-200 text-xs leading-relaxed font-medium">{item.pegawai}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Keterangan */}
        {activity.keterangan && (
          <div className="flex items-start gap-3 p-2 bg-slate-800/30 rounded-lg backdrop-blur-sm">
            <div className="p-1.5 bg-slate-700/50 rounded-md">
              <FiInfo className="w-4 h-4 text-slate-200" />
            </div>
            <span className="text-slate-200 text-xs leading-relaxed">{activity.keterangan}</span>
          </div>
        )}
      </div>
      
      {/* Footer Section */}
      <div className="mt-4 pt-4 border-t border-slate-700/30">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-xs font-medium">
            {new Date(activity.tanggal_mulai).toLocaleDateString('id-ID')} - {new Date(activity.tanggal_selesai).toLocaleDateString('id-ID')}
          </span>
          <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-400/30">
            ● Aktif
          </span>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ refreshTrigger, onFilterClick }) => {
  // Cache utility functions
  const generateDataHash = (data) => {
    return generateSafeDataHashLong(data);
  };

  const isCacheValid = (cacheKey, maxAge = 30000) => { // 30 seconds default
    const cache = dataCache[cacheKey];
    if (!cache.data || !cache.timestamp) return false;
    
    const now = Date.now();
    const age = now - cache.timestamp;
    return age < maxAge;
  };

  const updateCache = (cacheKey, data) => {
    const hash = generateDataHash(data);
    const timestamp = Date.now();
    
    setDataCache(prev => ({
      ...prev,
      [cacheKey]: { data, timestamp, hash }
    }));
    
    return { data, hash, timestamp };
  };

  const shouldFetchData = (cacheKey, maxAge = 30000) => {
    // Always fetch on initial load
    if (loading) return true;
    
    // Always fetch if refreshTrigger changed
    if (refreshTrigger !== lastRefreshTrigger) return true;
    
    // Check cache validity
    return !isCacheValid(cacheKey, maxAge);
  };

  // Smooth day selection handler
  const handleDaySelection = (dayIndex) => {
    if (dayIndex !== selectedDayIndex) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedDayIndex(dayIndex);
        setIsTransitioning(false);
      }, 200);
    }
  };
  const [data, setData] = useState({
    total: 0,
    mingguan: 0,
    bulanan: 0,
    per_bidang: []
  });
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentActivityIndex, setCurrentActivityIndex] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Cache and optimization states
  const [dataCache, setDataCache] = useState({
    dashboard: { data: null, timestamp: null, hash: null },
    weeklySchedule: { data: null, timestamp: null, hash: null }
  });
  const [lastRefreshTrigger, setLastRefreshTrigger] = useState(0);

  const weeklyStats = { total: data.mingguan || 0 };
  const monthlyStats = { total: data.bulanan || 0 };

  useEffect(() => {
    fetchDashboardData();
    fetchWeeklySchedule();
  }, []);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Dashboard: Refresh triggered, forcing fresh data fetch...');
      fetchDashboardData(true); // Force refresh
      fetchWeeklySchedule(true); // Force refresh
    }
  }, [refreshTrigger]);

  // Auto transition between days
  useEffect(() => {
    const dayInterval = setInterval(() => {
      if (weeklySchedule.length > 0) {
        setIsTransitioning(true);
        setTimeout(() => {
          setSelectedDayIndex(prev => (prev + 1) % weeklySchedule.length);
          setIsTransitioning(false);
        }, 200); // Short transition delay
      }
    }, 8000); // Change day every 8 seconds

    return () => clearInterval(dayInterval);
  }, [weeklySchedule]);

  // Rotating cards for multiple activities
  useEffect(() => {
    const activityInterval = setInterval(() => {
      setCurrentActivityIndex(prev => {
        const newIndexes = { ...prev };
        weeklySchedule.forEach((day, dayIndex) => {
          if (day.activities && day.activities.length > 1) {
            const currentIndex = prev[dayIndex] || 0;
            newIndexes[dayIndex] = (currentIndex + 1) % day.activities.length;
          }
        });
        return newIndexes;
      });
    }, 4000); // Rotate every 4 seconds (slower for smoother experience)

    return () => clearInterval(activityInterval);
  }, [weeklySchedule]);

  const fetchDashboardData = async (forceRefresh = false) => {
    try {
      // Check if we should fetch data
      if (!forceRefresh && !shouldFetchData('dashboard', 30000)) {
        console.log('📱 Dashboard: Using cached data');
        const cachedData = dataCache.dashboard.data;
        if (cachedData) {
          setData(cachedData);
          return;
        }
      }

      setLoading(true);
      console.log('🔄 Dashboard: Fetching fresh dashboard data...');
      
      const response = await api.get('/perjadin/dashboard');
      
      if (response.data.status === 'success') {
        const dashData = response.data.data || {
          total: 0,
          mingguan: 0,
          bulanan: 0,
          per_bidang: []
        };
        
        // Check if data actually changed
        const cachedHash = dataCache.dashboard.hash;
        const newHash = generateDataHash(dashData);
        
        if (cachedHash === newHash && !forceRefresh) {
          console.log('📋 Dashboard: Data unchanged, skipping update');
          setLoading(false);
          return;
        }
        
        console.log('✅ Dashboard: Setting new data:', dashData);
        setData(dashData);
        updateCache('dashboard', dashData);
      }
    } catch (error) {
      console.error('❌ Dashboard: Error fetching data:', error);
      
      // Try to use cached data on error
      if (dataCache.dashboard.data) {
        console.log('🔄 Dashboard: Using cached data due to error');
        setData(dataCache.dashboard.data);
      } else {
        // Set default empty data only if no cache available
        setData({
          total: 0,
          mingguan: 0,
          bulanan: 0,
          per_bidang: []
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklySchedule = async (forceRefresh = false) => {
    try {
      // Check if we should fetch weekly schedule data
      if (!forceRefresh && !shouldFetchData('weeklySchedule', 60000)) { // 1 minute cache for schedule
        console.log('� Dashboard: Using cached weekly schedule');
        const cachedData = dataCache.weeklySchedule.data;
        if (cachedData) {
          setWeeklySchedule(cachedData);
          return;
        }
      }

      console.log('�🔄 Dashboard: Fetching fresh weekly schedule...');
      const response = await api.get('/perjadin/dashboard/weekly-schedule');
      
      console.log('📅 Dashboard: Weekly schedule data:', response.data);
      
      if (response.data.status === 'success' && response.data.data && Array.isArray(response.data.data)) {
        const today = new Date();
        const processedSchedule = response.data.data.map(day => ({
          date: new Date(day.tanggal),
          dayName: day.hari,
          dateNum: new Date(day.tanggal).getDate(),
          month: new Date(day.tanggal).toLocaleDateString('id-ID', { month: 'short' }),
          isToday: new Date(day.tanggal).toDateString() === today.toDateString(),
          activities: day.kegiatan || [],
          tanggal: day.tanggal
        }));
        
        // Check if schedule data actually changed
        const cachedHash = dataCache.weeklySchedule.hash;
        const newHash = generateDataHash(processedSchedule);
        
        if (cachedHash === newHash && !forceRefresh) {
          console.log('📋 Dashboard: Weekly schedule unchanged, skipping update');
          return;
        }
        
        console.log('✅ Dashboard: Setting new weekly schedule:', processedSchedule);
        setWeeklySchedule(processedSchedule);
        updateCache('weeklySchedule', processedSchedule);
      }
    } catch (error) {
      console.error('❌ Dashboard: Error fetching weekly schedule:', error);
      
      // Try to use cached data on error
      if (dataCache.weeklySchedule.data) {
        console.log('🔄 Dashboard: Using cached weekly schedule due to error');
        setWeeklySchedule(dataCache.weeklySchedule.data);
      } else {
        // Fallback to generate empty schedule
        generateEmptyWeeklySchedule();
      }
    }
  };

  const generateEmptyWeeklySchedule = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const schedule = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      schedule.push({
        date: date,
        dayName: date.toLocaleDateString('id-ID', { weekday: 'long' }),
        dateNum: date.getDate(),
        month: date.toLocaleDateString('id-ID', { month: 'short' }),
        isToday: date.toDateString() === today.toDateString(),
        activities: [],
        tanggal: date.toISOString().split('T')[0]
      });
    }
    setWeeklySchedule(schedule);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-700 mx-auto"></div>
          <p className="text-slate-600 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Kegiatan Card */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FiActivity className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{data.total}</div>
                <div className="text-slate-300 text-sm">Total</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Kegiatan</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-slate-300 text-sm">Semua periode</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kegiatan Minggu Ini */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FiCalendar className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{weeklyStats.total}</div>
                <div className="text-slate-300 text-sm">Minggu Ini</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Kegiatan Minggu</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-slate-300 text-sm">7 hari terakhir</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kegiatan Bulan Ini */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FiTrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{monthlyStats.total}</div>
                <div className="text-slate-300 text-sm">Bulan Ini</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Kegiatan Bulanan</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-slate-300 text-sm">30 hari terakhir</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Pegawai Terlibat */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FiUsers className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{data.total_pegawai_terlibat || 0}</div>
                <div className="text-emerald-200 text-sm">Pegawai</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Pegawai</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-emerald-200 text-sm">Yang terlibat</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Per Bidang Statistics */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FiMapPin className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Kegiatan Per Bidang</h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{data.per_bidang.length}</div>
                <div className="text-slate-300 text-sm">Bidang Terlibat</div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.per_bidang.map((b, index) => (
                <div 
                  key={b.id_bidang} 
                  className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all duration-300 cursor-pointer border border-slate-200 hover:border-slate-300 hover:shadow-lg transform hover:-translate-y-1"
                  onClick={() => onFilterClick('', b.id_bidang)}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl shadow-lg">
                      <FiBarChart2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-lg group-hover:text-slate-900 transition-colors duration-300">
                        {b.nama_bidang}
                      </span>
                      <span className="text-sm text-slate-600 mt-1">
                        Bidang Kerja • {b.total || 0} Kegiatan
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white px-4 py-2 rounded-xl font-bold shadow-lg group-hover:shadow-xl transition-all duration-300 flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-lg">{b.total}</span>
                    </div>
                    <div className="p-2 bg-slate-200 group-hover:bg-slate-300 rounded-lg transition-all duration-300">
                      <FiArrowRight className="w-4 h-4 text-slate-600" />
                    </div>  
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Weekly Calendar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiCalendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Kalender Mingguan</h3>
                <p className="text-slate-300 text-sm">Jadwal 7 Hari</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {/* Week Navigation */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {weeklySchedule.map((day, index) => (
                <button
                  key={index}
                  onClick={() => handleDaySelection(index)}
                  className={`group relative p-3 rounded-xl text-center day-transition ${
                    selectedDayIndex === index
                      ? 'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg transform scale-105 ring-2 ring-slate-500/30'
                      : day.isToday
                      ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-102'
                  }`}
                >
                  <div className="text-xs font-semibold mb-1">{day.dayName.substring(0, 3)}</div>
                  <div className="text-lg font-bold">{day.dateNum}</div>
                  <div className="text-xs opacity-75">{day.month}</div>
                  {day.isToday && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full"></div>
                  )}
                  {day.activities && day.activities.length > 0 && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(day.activities.length, 3) }).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 bg-slate-600 rounded-full shadow-sm"></div>
                        ))}
                        {day.activities.length > 3 && (
                          <div className="w-1.5 h-1.5 bg-slate-700 rounded-full shadow-sm"></div>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Selected Day Activities */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">
                    {weeklySchedule[selectedDayIndex]?.dayName}, {weeklySchedule[selectedDayIndex]?.dateNum} {weeklySchedule[selectedDayIndex]?.month}
                  </h4>
                  {weeklySchedule[selectedDayIndex]?.activities?.length > 0 && (
                    <p className="text-slate-600 text-sm mt-1">
                      {weeklySchedule[selectedDayIndex].activities.length} kegiatan dijadwalkan
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse"></div>
                    <span className="text-slate-600 text-sm font-medium">Auto-transition</span>
                  </div>
                  <div className="flex gap-1">
                    {weeklySchedule.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full transition-all duration-300 ${
                          i === selectedDayIndex ? 'bg-slate-600' : 'bg-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Activities for selected day */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative overflow-hidden">
                <div className={`transition-all duration-400 ${isTransitioning ? 'slide-out-left opacity-0' : 'slide-in-right opacity-100'}`}>
                  {weeklySchedule[selectedDayIndex]?.activities?.length > 0 ? (
                    <div className="space-y-4">
                      {weeklySchedule[selectedDayIndex].activities.length === 1 ? (
                        // Single activity - show directly
                        <div key={`single-${selectedDayIndex}`}>
                          <ActivityCard activity={weeklySchedule[selectedDayIndex].activities[0]} />
                        </div>
                      ) : (
                        // Multiple activities - show rotating card
                        <div className="relative">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                              <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse"></div>
                              {weeklySchedule[selectedDayIndex].activities.length} Kegiatan
                            </span>
                            <div className="flex gap-1">
                              {weeklySchedule[selectedDayIndex].activities.map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full transition-all duration-500 ${
                                    i === (currentActivityIndex[selectedDayIndex] || 0)
                                      ? 'bg-slate-600 shadow-md scale-125'
                                      : 'bg-slate-300 hover:bg-slate-400'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div key={`multi-${selectedDayIndex}-${currentActivityIndex[selectedDayIndex] || 0}`}>
                            <ActivityCard 
                              activity={weeklySchedule[selectedDayIndex].activities[currentActivityIndex[selectedDayIndex] || 0]} 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 smooth-fade-in-up" style={{animationDelay: '0.2s'}}>
                      <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl flex items-center justify-center mb-4 mx-auto transform hover:scale-110 transition-transform duration-300">
                        <FiClock className="w-8 h-8 text-slate-600" />
                      </div>
                      <h6 className="text-lg font-bold text-slate-800 mb-2">Tidak Ada Kegiatan</h6>
                      <p className="text-slate-600 text-sm">Belum ada kegiatan yang dijadwalkan untuk hari ini</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(Dashboard);

