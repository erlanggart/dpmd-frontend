import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { FiBarChart2, FiCalendar, FiTrendingUp, FiUsers, FiFilter } from 'react-icons/fi';
import api from '../../../api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Statistik = ({ refreshTrigger }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('minggu');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [dashboardData, setDashboardData] = useState({
    mingguan: 0,
    bulanan: 0,
    per_bidang: []
  });
  const [statistikData, setStatistikData] = useState({
    totalPerjalanan: 0,
    totalBidang: 0,
    totalPersonil: 0,
    grafikData: [],
    topBidang: [],
    personilPerBidang: [],
    trendData: [],
    monthlyComparison: [],
    performanceMetrics: {}
  });

  // Performance optimization - Cache system
  const [dataCache, setDataCache] = useState({
    dashboard: { data: null, hash: null, timestamp: null },
    statistik: { data: null, hash: null, timestamp: null }
  });
  const [lastRefreshTrigger, setLastRefreshTrigger] = useState(0);

  // Cache utility functions
  const generateDataHash = (data) => {
    try {
      return btoa(JSON.stringify(data)).slice(0, 16);
    } catch {
      return Date.now().toString();
    }
  };

  const isCacheValid = (cacheKey, maxAge = 120000) => { // 2 minutes default
    const cache = dataCache[cacheKey];
    if (!cache.timestamp) return false;
    return (Date.now() - cache.timestamp) < maxAge;
  };

  const updateCache = (cacheKey, data) => {
    setDataCache(prev => ({
      ...prev,
      [cacheKey]: {
        data,
        hash: generateDataHash(data),
        timestamp: Date.now()
      }
    }));
  };

  const shouldFetchData = (cacheKey, maxAge = 120000) => {
    const cache = dataCache[cacheKey];
    return !cache.data || !isCacheValid(cacheKey, maxAge) || refreshTrigger > lastRefreshTrigger;
  };

  // Fetch data dashboard
  const fetchDashboardData = async (forceRefresh = false) => {
    try {
      // Check if we should fetch dashboard data
      if (!forceRefresh && !shouldFetchData('dashboard', 90000)) { // 1.5 minutes cache
        console.log('� Statistik: Using cached dashboard data');
        const cachedData = dataCache.dashboard.data;
        if (cachedData) {
          setDashboardData(cachedData);
          return;
        }
      }

      console.log('�🔄 Statistik: Fetching fresh dashboard data...');
      const response = await api.get('/perjadin/dashboard');
      
      console.log('📥 Statistik Dashboard: Received data:', response.data);
      
      if (response.data.success) {
        const dashData = response.data.data || {
          mingguan: 0,
          bulanan: 0,
          per_bidang: []
        };

        // Check if dashboard data actually changed
        const cachedHash = dataCache.dashboard.hash;
        const newHash = generateDataHash(dashData);
        
        if (cachedHash === newHash && !forceRefresh) {
          console.log('📋 Statistik: Dashboard data unchanged, skipping update');
          return;
        }
        
        console.log('✅ Statistik Dashboard: Setting new data:', dashData);
        setDashboardData(dashData);
        updateCache('dashboard', dashData);
      }
    } catch (error) {
      console.error('❌ Statistik Dashboard: Error fetching data:', error);
      
      // Try to use cached data on error
      if (dataCache.dashboard.data) {
        console.log('🔄 Statistik: Using cached dashboard data due to error');
        setDashboardData(dataCache.dashboard.data);
      } else {
        setDashboardData({
          mingguan: 0,
          bulanan: 0,
          per_bidang: []
        });
      }
    }
  };

  // Enhanced fetch statistik data with multiple data sources
  const fetchStatistikData = async (forceRefresh = false) => {
    const cacheKey = `statistik_${selectedPeriod}_${selectedYear}_${selectedMonth}`;
    
    try {
      // Check if we should fetch statistik data
      if (!forceRefresh && !shouldFetchData('statistik', 90000)) { // 1.5 minutes cache
        const cachedData = dataCache.statistik.data;
        if (cachedData && cachedData.params === `${selectedPeriod}_${selectedYear}_${selectedMonth}`) {
          console.log('📋 Statistik: Using cached statistik data');
          setStatistikData(cachedData.data);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      const params = {
        periode: selectedPeriod,
        tahun: selectedYear,
        ...(selectedPeriod === 'minggu' && { bulan: selectedMonth })
      };
      
      console.log('🔄 Statistik: Fetching fresh enhanced statistik data with params:', params);
      
      // Fetch multiple data sources for comprehensive statistics
      const [statistikResponse, kegiatanResponse] = await Promise.all([
        api.get('/perjadin/statistik', { params }),
        api.get('/perjadin/kegiatan', { params: { limit: 1000 } }) // Get all data for analysis
      ]);
      
      console.log('📊 Statistik: Received statistik data:', statistikResponse.data);
      console.log('📋 Statistik: Received kegiatan data:', kegiatanResponse.data);
      
      if (statistikResponse.data.success) {
        const statData = statistikResponse.data.data;
        
        // Enhance data with kegiatan analysis if available
        if (kegiatanResponse.data.success && kegiatanResponse.data.data) {
          const kegiatanData = kegiatanResponse.data.data;
          statData.enhancedAnalysis = analyzeKegiatanData(kegiatanData);
        }
        
        // Check if statistik data actually changed
        const cachedHash = dataCache.statistik.hash;
        const newHash = generateDataHash({ data: statData, params: `${selectedPeriod}_${selectedYear}_${selectedMonth}` });
        
        if (cachedHash === newHash && !forceRefresh) {
          console.log('📋 Statistik: Statistik data unchanged, skipping update');
          setIsLoading(false);
          return;
        }

        console.log('✅ Statistik: Setting new enhanced statistik data:', statData);
        setStatistikData(statData);
        
        // Update cache
        updateCache('statistik', { 
          data: statData, 
          params: `${selectedPeriod}_${selectedYear}_${selectedMonth}` 
        });
      }
    } catch (error) {
      console.error('❌ Statistik: Error fetching statistik data:', error);
      
      // Try to use cached data on error
      if (dataCache.statistik.data) {
        console.log('🔄 Statistik: Using cached statistik data due to error');
        setStatistikData(dataCache.statistik.data.data);
      } else {
        setStatistikData({
          totalPerjalanan: 0,
          totalBidang: 0,
          totalPersonil: 0,
          grafikData: [],
          topBidang: [],
          personilPerBidang: [],
          trendData: [],
          monthlyComparison: [],
          performanceMetrics: {}
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze kegiatan data for enhanced insights
  const analyzeKegiatanData = (kegiatanData) => {
    if (!Array.isArray(kegiatanData) || kegiatanData.length === 0) {
      return { locationAnalysis: [], timeAnalysis: [], statusAnalysis: [] };
    }

    // Location analysis
    const locationMap = {};
    const timeMap = {};
    
    kegiatanData.forEach(kegiatan => {
      // Location analysis
      if (kegiatan.lokasi) {
        locationMap[kegiatan.lokasi] = (locationMap[kegiatan.lokasi] || 0) + 1;
      }
      
      // Time analysis (by month)
      if (kegiatan.tanggal_mulai) {
        const month = new Date(kegiatan.tanggal_mulai).getMonth();
        const monthName = new Date(kegiatan.tanggal_mulai).toLocaleDateString('id-ID', { month: 'long' });
        timeMap[monthName] = (timeMap[monthName] || 0) + 1;
      }
    });

    return {
      locationAnalysis: Object.entries(locationMap)
        .map(([lokasi, count]) => ({ lokasi, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      timeAnalysis: Object.entries(timeMap)
        .map(([bulan, count]) => ({ bulan, count }))
        .sort((a, b) => b.count - a.count),
      totalAnalyzed: kegiatanData.length
    };
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchStatistikData();
  }, [selectedPeriod, selectedYear, selectedMonth]);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > lastRefreshTrigger) {
      console.log('🔄 Statistik: Refresh triggered, forcing fresh data fetch...');
      setLastRefreshTrigger(refreshTrigger);
      fetchDashboardData(true); // Force refresh
      fetchStatistikData(true); // Force refresh
    }
  }, [refreshTrigger, lastRefreshTrigger]);

  // Enhanced Chart data for Bar Chart with dynamic data
  const barChartData = {
    labels: statistikData.grafikData?.length > 0 
      ? statistikData.grafikData.map(item => item.label || item.bulan || item.tahun || 'Unknown')
      : (statistikData.enhancedAnalysis?.timeAnalysis?.map(item => item.bulan) || ['Tidak ada data']),
    datasets: [
      {
        label: 'Jumlah Kegiatan',
        data: statistikData.grafikData?.length > 0 
          ? statistikData.grafikData.map(item => item.total || 0)
          : (statistikData.enhancedAnalysis?.timeAnalysis?.map(item => item.count) || [0]),
        backgroundColor: (ctx) => {
          const canvas = ctx.chart.ctx;
          const gradient = canvas.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(71, 85, 105, 0.9)');
          gradient.addColorStop(1, 'rgba(71, 85, 105, 0.3)');
          return gradient;
        },
        borderColor: 'rgba(71, 85, 105, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: 'rgba(51, 65, 85, 0.9)',
        hoverBorderColor: 'rgba(51, 65, 85, 1)',
        hoverBorderWidth: 3,
      }
    ]
  };

  // Enhanced Chart data for Doughnut Chart with better colors and data
  const doughnutChartData = {
    labels: statistikData.topBidang?.length > 0 
      ? statistikData.topBidang.map(item => item.nama_bidang || item.nama || 'Unknown')
      : ['Tidak ada data'],
    datasets: [
      {
        data: statistikData.topBidang?.length > 0 
          ? statistikData.topBidang.map(item => item.total || item.jumlah || 0)
          : [1],
        backgroundColor: statistikData.topBidang?.length > 0 ? [
          'rgba(71, 85, 105, 0.8)',
          'rgba(100, 116, 139, 0.8)',
          'rgba(148, 163, 184, 0.8)',
          'rgba(203, 213, 225, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ] : ['rgba(203, 213, 225, 0.5)'],
        borderColor: statistikData.topBidang?.length > 0 ? [
          'rgba(71, 85, 105, 1)',
          'rgba(100, 116, 139, 1)',
          'rgba(148, 163, 184, 1)',
          'rgba(203, 213, 225, 1)',
          'rgba(16, 185, 129, 1)',
        ] : ['rgba(203, 213, 225, 1)'],
        hoverBackgroundColor: statistikData.topBidang?.length > 0 ? [
          'rgba(51, 65, 85, 0.9)',
          'rgba(71, 85, 105, 0.9)',
          'rgba(100, 116, 139, 0.9)',
          'rgba(148, 163, 184, 0.9)',
          'rgba(16, 185, 129, 0.9)',
        ] : ['rgba(148, 163, 184, 0.7)'],
        borderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    animation: {
      duration: 800,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 13,
            weight: 'bold'
          },
          color: '#334155',
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: true,
        text: `Statistik Perjalanan Dinas - ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} ${selectedYear}`,
        color: '#1e293b',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(71, 85, 105, 0.8)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 12
        },
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y} kegiatan`;
          },
          afterLabel: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
            return `Persentase: ${percentage}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.2)',
          borderDash: [2, 2]
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 11,
            weight: '500'
          },
          padding: 8,
          callback: function(value) {
            return value + ' kegiatan';
          }
        },
        title: {
          display: true,
          text: 'Jumlah Kegiatan',
          color: '#475569',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          borderDash: [2, 2]
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 11,
            weight: '500'
          },
          padding: 8,
          maxRotation: 45
        },
        title: {
          display: true,
          text: selectedPeriod === 'minggu' ? 'Minggu' : selectedPeriod === 'bulan' ? 'Bulan' : 'Tahun',
          color: '#475569',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-700 mx-auto"></div>
          <p className="text-slate-600 font-medium">Memuat statistik...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-2xl">
          <FiBarChart2 className="text-3xl text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
            Statistik Perjalanan Dinas
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Analisis data dan statistik perjalanan dinas berdasarkan periode dan bidang kerja
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 mx-auto rounded-full mt-4"></div>
        </div>
      </div>

      {/* Enhanced Filter Controls */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FiFilter className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Filter Data</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Periode Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Periode Analisis</label>
              <select 
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent font-medium text-slate-800"
              >
                <option value="minggu">📅 Per Minggu</option>
                <option value="bulan">📊 Per Bulan</option>
                <option value="tahun">📈 Per Tahun</option>
              </select>
            </div>

            {/* Tahun Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Tahun</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent font-medium text-slate-800"
              >
                {[2021, 2022, 2023, 2024, 2025].map(year => (
                  <option key={year} value={year}>🗓️ {year}</option>
                ))}
              </select>
            </div>

            {/* Bulan Filter (hanya untuk periode minggu) */}
            {selectedPeriod === 'minggu' && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Bulan</label>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent font-medium text-slate-800"
                >
                  {[
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                  ].map((month, index) => (
                    <option key={index + 1} value={index + 1}>📅 {month}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Kegiatan Minggu Ini */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FiCalendar className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{dashboardData.mingguan}</div>
                <div className="text-slate-300 text-sm">Minggu</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Kegiatan Mingguan</h3>
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
                <div className="text-3xl font-bold">{dashboardData.bulanan}</div>
                <div className="text-slate-300 text-sm">Bulan</div>
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

        {/* Total Bidang */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FiBarChart2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{dashboardData.per_bidang.length}</div>
                <div className="text-emerald-200 text-sm">Bidang</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Bidang</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-emerald-200 text-sm">Bidang aktif</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Personil */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FiUsers className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{statistikData.totalPersonil}</div>
                <div className="text-indigo-200 text-sm">Personil</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Personil</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-indigo-200 text-sm">Personil terlibat</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiBarChart2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Grafik Perjalanan Dinas</h3>
                <p className="text-slate-300 text-sm">
                  {selectedPeriod === 'minggu' ? 'Mingguan' : 
                   selectedPeriod === 'bulan' ? 'Bulanan' : 'Tahunan'}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div style={{ height: '350px' }}>
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Doughnut Chart - Top Bidang */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiTrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Top 5 Bidang</h3>
                <p className="text-slate-300 text-sm">Distribusi kegiatan per bidang</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div style={{ height: '350px' }}>
              <Doughnut 
                data={doughnutChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        font: {
                          size: 12,
                          weight: 'bold'
                        },
                        color: '#334155',
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(30, 41, 59, 0.95)',
                      titleColor: '#f8fafc',
                      bodyColor: '#e2e8f0',
                      borderColor: 'rgba(71, 85, 105, 0.8)',
                      borderWidth: 1,
                      cornerRadius: 8,
                      titleFont: {
                        size: 14,
                        weight: 'bold'
                      },
                      bodyFont: {
                        size: 12
                      },
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                          return `${label}: ${value} kegiatan (${percentage}%)`;
                        }
                      }
                    },
                    title: {
                      display: true,
                      text: 'Distribusi Kegiatan per Bidang',
                      color: '#1e293b',
                      font: {
                        size: 14,
                        weight: 'bold'
                      },
                      padding: 10
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Analytics Section */}
      {statistikData.enhancedAnalysis && (
        <div className="mt-8 space-y-6">
          {/* Location Analytics */}
          {statistikData.enhancedAnalysis.locationAnalysis?.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FiUsers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Analisis Lokasi Kegiatan</h3>
                    <p className="text-slate-300 text-sm">Top 5 lokasi dengan kegiatan terbanyak</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {statistikData.enhancedAnalysis.locationAnalysis.slice(0, 5).map((location, index) => (
                    <div key={index} className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 text-sm truncate" title={location.lokasi}>
                            {location.lokasi}
                          </h4>
                          <p className="text-slate-600 text-xs mt-1">
                            {location.count} kegiatan
                          </p>
                        </div>
                        <div className="ml-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">#{index + 1}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-slate-600 to-slate-800 h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${(location.count / Math.max(...statistikData.enhancedAnalysis.locationAnalysis.map(l => l.count))) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FiTrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Insight & Metrics</h3>
                  <p className="text-slate-300 text-sm">Ringkasan performa kegiatan</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiTrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-lg">
                    {Math.round((statistikData.totalPerjalanan / (statistikData.totalBidang || 1)) * 10) / 10}
                  </h4>
                  <p className="text-slate-600 text-sm">Rata-rata kegiatan per bidang</p>
                </div>
                
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiUsers className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-lg">
                    {Math.round((statistikData.totalPersonil / (statistikData.totalPerjalanan || 1)) * 10) / 10}
                  </h4>
                  <p className="text-slate-600 text-sm">Rata-rata personil per kegiatan</p>
                </div>
                
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiBarChart2 className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-lg">
                    {statistikData.enhancedAnalysis?.totalAnalyzed || statistikData.totalPerjalanan}
                  </h4>
                  <p className="text-slate-600 text-sm">Total data dianalisis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(Statistik);