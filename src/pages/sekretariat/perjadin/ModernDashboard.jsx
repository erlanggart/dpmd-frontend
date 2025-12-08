import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiCalendar, 
  FiUsers, 
  FiMapPin, 
  FiTrendingUp, 
  FiActivity,
  FiBarChart2,
  FiPieChart,
  FiClock,
  FiBriefcase
} from 'react-icons/fi';
import api from '../../../api';
import Swal from 'sweetalert2';
import StatCard from '../../../components/perjadin/StatCard';
import ActivityCard from '../../../components/perjadin/ActivityCard';
import ChartCard from '../../../components/perjadin/ChartCard';
import { generateSafeDataHash } from '../../../utils/hashUtils';

const ModernDashboard = ({ onFilterClick }) => {
  const [data, setData] = useState({
    mingguan: 0,
    bulanan: 0,
    per_bidang: [],
    tahunan: 0,
    rata_rata_harian: 0
  });
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(0);
  const [dataHash, setDataHash] = useState('');

  // Cache duration: 5 minutes for dashboard data
  const CACHE_DURATION = 5 * 60 * 1000;

  const generateDataHash = (data) => {
    return generateSafeDataHash(data);
  };

  const shouldFetchData = () => {
    return (Date.now() - lastFetch) > CACHE_DURATION;
  };

  useEffect(() => {
    const fetchDashboardData = async (forceRefresh = false) => {
      // Skip fetch if data is still fresh and not forcing refresh
      if (!forceRefresh && !shouldFetchData()) {
        console.log('📋 Dashboard: Using cached data, skipping fetch');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔄 Dashboard: Fetching fresh dashboard data...');
        
        const response = await api.get('/perjadin/dashboard');
        const newData = {
          ...response.data,
          tahunan: response.data.mingguan * 52, // Estimasi tahunan
          rata_rata_harian: Math.round(response.data.mingguan / 7) // Rata-rata harian
        };

        // Check if data actually changed
        const newHash = generateDataHash(newData);
        if (dataHash === newHash && !forceRefresh) {
          console.log('📋 Dashboard: Data unchanged, skipping update');
          setLoading(false);
          return;
        }

        console.log('✅ Dashboard: Setting new dashboard data');
        setData(newData);
        setDataHash(newHash);
        setLastFetch(Date.now());
      } catch (error) {
        console.error('❌ Dashboard: Failed to fetch dashboard data:', error);
        
        // Only set empty data if we don't have any cached data
        if (!data.mingguan && !data.bulanan) {
          setData({
            mingguan: 0,
            bulanan: 0,
            per_bidang: [],
            tahunan: 0,
            rata_rata_harian: 0
          });
        }
        
        if (error.code !== 'ECONNABORTED') {
          Swal.fire('Error', 'Gagal memuat data dashboard.', 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchWeeklySchedule = async (forceRefresh = false) => {
      try {
        console.log('🔄 Dashboard: Fetching weekly schedule...');
        const response = await api.get('/perjadin/dashboard/weekly-schedule');
        setWeeklySchedule(response.data || []);
      } catch (error) {
        console.error('❌ Dashboard: Failed to fetch weekly schedule:', error);
        setWeeklySchedule([]);
      }
    };

    // Initial load
    fetchDashboardData();
    fetchWeeklySchedule();

    // Set up periodic refresh every 10 minutes if page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData();
        fetchWeeklySchedule();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Memuat Dashboard</h3>
          <p className="text-gray-500">Loading data perjalanan dinas...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Perjalanan Dinas</h2>
        <p className="text-gray-600">Ringkasan aktivitas dan statistik terkini</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          title="Mingguan"
          value={data.mingguan}
          icon={FiCalendar}
          trend="up"
          trendValue="+12%"
          gradient="from-blue-500 to-cyan-500"
          delay={0}
          onClick={() => onFilterClick && onFilterClick('week', '')}
        />
        <StatCard
          title="Bulanan"
          value={data.bulanan}
          icon={FiBarChart2}
          trend="up"
          trendValue="+8%"
          gradient="from-green-500 to-emerald-500"
          delay={0.1}
          onClick={() => onFilterClick && onFilterClick('month', '')}
        />
        <StatCard
          title="Tahunan"
          value={data.tahunan}
          icon={FiTrendingUp}
          trend="up"
          trendValue="+15%"
          gradient="from-purple-500 to-pink-500"
          delay={0.2}
        />
        <StatCard
          title="Rata-rata Harian"
          value={data.rata_rata_harian}
          icon={FiActivity}
          trend="stable"
          trendValue="0%"
          gradient="from-orange-500 to-red-500"
          delay={0.3}
        />
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Per Bidang Chart */}
        <motion.div variants={itemVariants}>
          <ChartCard
            title="Kegiatan per Bidang"
            subtitle="Distribusi kegiatan berdasarkan bidang kerja"
            delay={0.4}
          >
            <div className="space-y-4">
              {data.per_bidang.map((bidang, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => onFilterClick && onFilterClick('bidang', bidang.bidang)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-green-500' :
                      index === 2 ? 'bg-purple-500' :
                      index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="font-medium text-gray-900">{bidang.bidang}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-gray-900">{bidang.total}</span>
                    <span className="text-sm text-gray-500">kegiatan</span>
                  </div>
                </motion.div>
              ))}
              {data.per_bidang.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FiBriefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada data kegiatan per bidang</p>
                </div>
              )}
            </div>
          </ChartCard>
        </motion.div>

        {/* Weekly Schedule */}
        <motion.div variants={itemVariants}>
          <ChartCard
            title="Jadwal Minggu Ini"
            subtitle="Kegiatan yang dijadwalkan dalam 7 hari ke depan"
            delay={0.5}
          >
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {weeklySchedule.map((activity, index) => (
                <ActivityCard
                  key={index}
                  title={activity.nama_kegiatan}
                  subtitle={activity.nomor_sp}
                  date={activity.tanggal_mulai}
                  status={activity.status}
                  bidang={activity.bidang}
                  location={activity.lokasi}
                  participants={activity.total_pegawai}
                  delay={0.6 + index * 0.05}
                  onClick={() => onFilterClick && onFilterClick('activity', activity.id)}
                />
              ))}
              {weeklySchedule.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FiClock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada kegiatan yang dijadwalkan</p>
                </div>
              )}
            </div>
          </ChartCard>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div 
        variants={itemVariants}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100"
      >
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aksi Cepat</h3>
            <p className="text-gray-600">Kelola kegiatan perjalanan dinas dengan mudah</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              onClick={() => onFilterClick && onFilterClick('', '')}
            >
              <FiBarChart2 className="w-5 h-5 mr-2" />
              Lihat Semua
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              <FiUsers className="w-5 h-5 mr-2" />
              Buat Kegiatan Baru
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModernDashboard;
