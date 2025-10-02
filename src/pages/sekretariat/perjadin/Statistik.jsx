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
    personilPerBidang: []
  });

  // Fetch data dashboard
  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Statistik: Fetching dashboard data...');
      const response = await api.get('/perjadin/dashboard');
      
      console.log('📥 Statistik Dashboard: Received data:', response.data);
      
      if (response.data.success) {
        const dashData = response.data.data || {
          mingguan: 0,
          bulanan: 0,
          per_bidang: []
        };
        
        console.log('✅ Statistik Dashboard: Setting data:', dashData);
        setDashboardData(dashData);
      }
    } catch (error) {
      console.error('❌ Statistik Dashboard: Error fetching data:', error);
      setDashboardData({
        mingguan: 0,
        bulanan: 0,
        per_bidang: []
      });
    }
  };

  // Fetch statistik data
  const fetchStatistikData = async () => {
    try {
      setIsLoading(true);
      const params = {
        periode: selectedPeriod,
        tahun: selectedYear,
        ...(selectedPeriod === 'minggu' && { bulan: selectedMonth })
      };
      
      console.log('🔄 Statistik: Fetching statistik data with params:', params);
      const response = await api.get('/perjadin/statistik', { params });
      
      console.log('📊 Statistik: Received statistik data:', response.data);
      
      if (response.data.success) {
        const statData = response.data.data;
        console.log('✅ Statistik: Setting statistik data:', statData);
        setStatistikData(statData);
      }
    } catch (error) {
      console.error('❌ Statistik: Error fetching statistik data:', error);
      setStatistikData({
        totalPerjalanan: 0,
        totalBidang: 0,
        totalPersonil: 0,
        grafikData: [],
        topBidang: [],
        personilPerBidang: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchStatistikData();
  }, [selectedPeriod, selectedYear, selectedMonth]);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchDashboardData();
      fetchStatistikData();
    }
  }, [refreshTrigger]);

  // Chart data for Bar Chart
  const barChartData = {
    labels: statistikData.grafikData.map(item => item.label || item.bulan || item.tahun || 'Unknown'),
    datasets: [
      {
        label: 'Jumlah Kegiatan',
        data: statistikData.grafikData.map(item => item.total || 0),
        backgroundColor: 'rgba(71, 85, 105, 0.8)',
        borderColor: 'rgba(71, 85, 105, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };

  // Chart data for Doughnut Chart
  const doughnutChartData = {
    labels: statistikData.topBidang.map(item => item.nama_bidang || 'Unknown'),
    datasets: [
      {
        data: statistikData.topBidang.map(item => item.total || 0),
        backgroundColor: [
          'rgba(71, 85, 105, 0.8)',
          'rgba(100, 116, 139, 0.8)',
          'rgba(148, 163, 184, 0.8)',
          'rgba(203, 213, 225, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderColor: [
          'rgba(71, 85, 105, 1)',
          'rgba(100, 116, 139, 1)',
          'rgba(148, 163, 184, 1)',
          'rgba(203, 213, 225, 1)',
          'rgba(16, 185, 129, 1)',
        ],
        borderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 12,
            weight: 'bold'
          },
          color: '#334155'
        }
      },
      title: {
        display: true,
        text: `Statistik Perjalanan Dinas`,
        color: '#1e293b',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.3)'
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 11
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.3)'
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 11
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
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'bottom',
                      labels: {
                        font: {
                          size: 12,
                          weight: 'bold'
                        },
                        color: '#334155',
                        padding: 15
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistik;