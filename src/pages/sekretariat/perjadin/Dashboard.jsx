import React, { useState, useEffect } from 'react';
import { 
  FiCalendar, 
  FiUsers, 
  FiMapPin, 
  FiTrendingUp, 
  FiActivity,
  FiBarChart2,
  FiClock,
  FiArrowRight
} from 'react-icons/fi';
import api from '../../../api';
import Swal from 'sweetalert2';

const Dashboard = ({ onFilterClick, refreshTrigger }) => {
  const [data, setData] = useState({
    total: 0,
    mingguan: 0,
    bulanan: 0,
    per_bidang: []
  });
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const weeklyStats = { total: data.mingguan || 0 };
  const monthlyStats = { total: data.bulanan || 0 };

  useEffect(() => {
    fetchDashboardData();
    generateWeeklySchedule();
  }, []);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchDashboardData();
    }
  }, [refreshTrigger]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Dashboard: Fetching dashboard data...');
      const response = await api.get('/perjadin/dashboard');
      if (response.data.success) {
        console.log('✅ Dashboard: Data received:', response.data.data);
        setData(response.data.data || {
          total: 0,
          mingguan: 0,
          bulanan: 0,
          per_bidang: []
        });
      }
    } catch (error) {
      console.error('❌ Dashboard: Error fetching data:', error);
      // Set default empty data instead of showing error for first time users
      setData({
        total: 0,
        mingguan: 0,
        bulanan: 0,
        per_bidang: []
      });
    } finally {
      setLoading(false);
    }
  };

  const generateWeeklySchedule = () => {
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
        activities: [] // This would be populated with real data
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

        {/* Status Aktif */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FiUsers className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{data.per_bidang.length}</div>
                <div className="text-emerald-200 text-sm">Bidang</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Bidang Aktif</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-emerald-200 text-sm">Total bidang</span>
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
                <div className="text-slate-300 text-sm">Bidang Aktif</div>
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
                        Bidang Kerja • {b.total_kegiatan || 0} Kegiatan
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
                  onClick={() => setSelectedDayIndex(index)}
                  className={`group relative p-3 rounded-xl text-center transition-all duration-300 ${
                    selectedDayIndex === index
                      ? 'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg transform scale-105'
                      : day.isToday
                      ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold mb-1">{day.dayName.substring(0, 3)}</div>
                  <div className="text-lg font-bold">{day.dateNum}</div>
                  <div className="text-xs opacity-75">{day.month}</div>
                  {day.isToday && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Selected Day Activities */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-lg">
                  {weeklySchedule[selectedDayIndex]?.dayName}, {weeklySchedule[selectedDayIndex]?.dateNum} {weeklySchedule[selectedDayIndex]?.month}
                </h4>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse"></div>
                  <span className="text-slate-600 text-sm font-medium">Real-time</span>
                </div>
              </div>
              
              {/* Activities for selected day */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <FiClock className="w-8 h-8 text-slate-600" />
                  </div>
                  <h6 className="text-lg font-bold text-slate-800 mb-2">Tidak Ada Kegiatan</h6>
                  <p className="text-slate-600 text-sm">Belum ada kegiatan yang dijadwalkan untuk hari ini</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;