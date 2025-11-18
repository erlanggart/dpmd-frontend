// src/pages/core-dashboard/DashboardOverview.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, TrendingUp, ArrowRight, BarChart3, Activity, Calendar, MapPin, DollarSign, Building2 } from 'lucide-react';
import DashboardHeader from './components/DashboardHeader';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [bankeuData, setBankeuData] = useState(null);
  const [addData, setAddData] = useState(null);
  const [ddData, setDdData] = useState(null);
  const [bhprdData, setBhprdData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchBankeuData();
    fetchAddData();
    fetchDdData();
    fetchBhprdData();
  }, []);

  const fetchBankeuData = async () => {
    try {
      const response = await fetch('/bankeu2025.json');
      const data = await response.json();
      
      // Filter hanya data yang ada nominalnya (Realisasi > 0)
      const validData = data.filter(item => parseInt(item.Realisasi.replace(/,/g, '')) > 0);
      
      // Group data by kecamatan + desa untuk mendapatkan desa unik
      const desaMap = {};
      validData.forEach(item => {
        const key = `${item.kecamatan}|${item.desa}`;
        if (!desaMap[key]) {
          desaMap[key] = {
            kecamatan: item.kecamatan,
            desa: item.desa,
            tahap1: null,
            tahap2: null
          };
        }
        
        // Tahap 1 = Dana Telah Dicairkan
        if (item.sts === 'Dana Telah Dicairkan') {
          desaMap[key].tahap1 = {
            sts: item.sts,
            realisasi: parseInt(item.Realisasi.replace(/,/g, ''))
          };
        } else {
          // Tahap 2 = status lainnya (Review, Proses, dll)
          desaMap[key].tahap2 = {
            sts: item.sts,
            realisasi: parseInt(item.Realisasi.replace(/,/g, ''))
          };
        }
      });

      const desaList = Object.values(desaMap);
      
      // Hitung statistik berdasarkan desa unik
      const stats = {
        total_desa: desaList.length,
        dana_cair: desaList.filter(d => d.tahap1 !== null).length,
        tahap2_proses: desaList.filter(d => d.tahap2 !== null).length,
        total_realisasi_tahap1: desaList.reduce((sum, d) => sum + (d.tahap1?.realisasi || 0), 0),
        total_realisasi_tahap2: desaList.reduce((sum, d) => sum + (d.tahap2?.realisasi || 0), 0)
      };
      
      setBankeuData(stats);
    } catch (err) {
      console.error('Error loading bankeu data:', err);
    }
  };

  const fetchAddData = async () => {
    try {
      const token = localStorage.getItem('expressToken');
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/add/data`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const data = response.data.data;
      
      // ADD workflow: Simple 1 record per desa, status "Belum Mengajukan"
      const totalDesa = data.length;
      const totalAlokasi = data.reduce((sum, item) => sum + parseInt(item.Realisasi.replace(/,/g, '')), 0);
      
      // Status breakdown
      const statusCount = {};
      data.forEach(item => {
        statusCount[item.sts] = (statusCount[item.sts] || 0) + 1;
      });
      
      setAddData({
        total_desa: totalDesa,
        total_alokasi: totalAlokasi,
        belum_mengajukan: statusCount['Belum Mengajukan'] || 0,
        sudah_mengajukan: statusCount['Sudah Mengajukan'] || 0,
        dana_cair: statusCount['Dana Telah Dicairkan'] || 0
      });
    } catch (err) {
      console.error('Error loading ADD data:', err);
    }
  };

  const fetchDdData = async () => {
    try {
      const token = localStorage.getItem('expressToken');
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/dd/data`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const data = response.data.data;
      
      // DD workflow: Simple 1 record per desa, mostly realisasi = 0
      const totalDesa = data.length;
      const totalRealisasi = data.reduce((sum, item) => sum + parseInt(item.Realisasi.replace(/,/g, '')), 0);
      
      // Status breakdown
      const statusCount = {};
      data.forEach(item => {
        statusCount[item.sts] = (statusCount[item.sts] || 0) + 1;
      });
      
      setDdData({
        total_desa: totalDesa,
        total_realisasi: totalRealisasi,
        belum_mengajukan: statusCount['Belum Mengajukan'] || 0,
        sudah_mengajukan: statusCount['Sudah Mengajukan'] || 0,
        dana_cair: statusCount['Dana Telah Dicairkan'] || 0
      });
    } catch (err) {
      console.error('Error loading DD data:', err);
    }
  };

  const fetchBhprdData = async () => {
    try {
      const token = localStorage.getItem('expressToken');
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/bhprd/data`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const data = response.data.data;
      
      // BHPRD workflow: Simple 1 record per desa, mixed status
      const totalDesa = data.length;
      const totalRealisasi = data.reduce((sum, item) => sum + parseInt(item.Realisasi.replace(/,/g, '')), 0);
      
      // Status breakdown
      const statusCount = {};
      data.forEach(item => {
        statusCount[item.sts] = (statusCount[item.sts] || 0) + 1;
      });
      
      setBhprdData({
        total_desa: totalDesa,
        total_realisasi: totalRealisasi,
        dana_cair: statusCount['Dana Telah Dicairkan'] || 0,
        belum_cair: statusCount['Belum Mengajukan'] || 0
      });
    } catch (err) {
      console.error('Error loading BHPRD data:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('expressToken');
      
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/kepala-dinas/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Dashboard API Response:', response.data);
      setDashboardData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Memuat Dashboard...</p>
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
              onClick={fetchDashboardData}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-xl">Tidak ada data</div>
        </div>
      </div>
    );
  }

  const { summary } = dashboardData;

  const moduleCards = [
    {
      title: 'Statistik BUMDes',
      description: 'Lihat statistik lengkap BUMDes, chart per kecamatan, status, dan data keuangan',
      icon: <Users className="w-12 h-12" />,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      shadowColor: 'shadow-blue-500/50',
      bgPattern: 'bg-blue-50',
      value: summary?.total_bumdes || 0,
      label: 'Total BUMDes',
      path: '/core-dashboard/statistik-bumdes',
      stats: [
        { icon: <BarChart3 className="w-4 h-4" />, label: 'Data Lengkap' },
        { icon: <Activity className="w-4 h-4" />, label: 'Real-time' }
      ]
    },
    {
      title: 'Statistik Perjalanan Dinas',
      description: 'Lihat statistik perjalanan dinas, peserta, lokasi tujuan, dan jadwal mendatang',
      icon: <Briefcase className="w-12 h-12" />,
      gradient: 'from-orange-500 via-orange-600 to-red-600',
      shadowColor: 'shadow-orange-500/50',
      bgPattern: 'bg-orange-50',
      value: summary?.total_perjalanan_dinas || 0,
      label: 'Total Perjalanan Dinas',
      path: '/core-dashboard/statistik-perjadin',
      stats: [
        { icon: <Calendar className="w-4 h-4" />, label: 'Jadwal' },
        { icon: <MapPin className="w-4 h-4" />, label: 'Lokasi' }
      ]
    },
    {
      title: 'Bantuan Keuangan Infrastruktur 2025',
      description: 'Lihat progress pencairan dana bantuan keuangan infrastruktur desa tahun 2025',
      icon: <DollarSign className="w-12 h-12" />,
      gradient: 'from-green-500 via-emerald-600 to-teal-600',
      shadowColor: 'shadow-green-500/50',
      bgPattern: 'bg-green-50',
      value: bankeuData?.total_desa || 0,
      label: 'Total Desa Penerima',
      path: '/core-dashboard/statistik-bankeu',
      stats: [
        { icon: <Building2 className="w-4 h-4" />, label: `${bankeuData?.dana_cair || 0} Cair` },
        { icon: <Activity className="w-4 h-4" />, label: 'Live Update' }
      ]
    },
    {
      title: 'Alokasi Dana Desa (ADD)',
      description: 'Lihat alokasi dana desa untuk pembangunan dan pemberdayaan masyarakat',
      icon: <DollarSign className="w-12 h-12" />,
      gradient: 'from-purple-500 via-purple-600 to-pink-600',
      shadowColor: 'shadow-purple-500/50',
      bgPattern: 'bg-purple-50',
      value: addData?.total_desa || 0,
      label: 'Total Desa',
      path: '/core-dashboard/statistik-add',
      stats: [
        { icon: <Building2 className="w-4 h-4" />, label: `${addData?.belum_mengajukan || 0} Belum` },
        { icon: <Activity className="w-4 h-4" />, label: 'Live Update' }
      ]
    },
    {
      title: 'Dana Desa (DD)',
      description: 'Lihat realisasi dana desa untuk infrastruktur dan pemberdayaan masyarakat',
      icon: <DollarSign className="w-12 h-12" />,
      gradient: 'from-cyan-500 via-blue-600 to-indigo-600',
      shadowColor: 'shadow-cyan-500/50',
      bgPattern: 'bg-cyan-50',
      value: ddData?.total_desa || 0,
      label: 'Total Desa',
      path: '/core-dashboard/statistik-dd',
      stats: [
        { icon: <Building2 className="w-4 h-4" />, label: `${ddData?.belum_mengajukan || 0} Belum` },
        { icon: <Activity className="w-4 h-4" />, label: 'Live Update' }
      ]
    },
    {
      title: 'Bagi Hasil Pajak Retribusi (BHPRD)',
      description: 'Lihat realisasi bagi hasil pajak dan retribusi daerah untuk desa',
      icon: <DollarSign className="w-12 h-12" />,
      gradient: 'from-emerald-500 via-green-600 to-teal-600',
      shadowColor: 'shadow-emerald-500/50',
      bgPattern: 'bg-emerald-50',
      value: bhprdData?.total_desa || 0,
      label: 'Total Desa',
      path: '/core-dashboard/statistik-bhprd',
      stats: [
        { icon: <Building2 className="w-4 h-4" />, label: `${bhprdData?.dana_cair || 0} Cair` },
        { icon: <Activity className="w-4 h-4" />, label: 'Live Update' }
      ]
    },
    {
      title: 'Analisis Trend',
      description: 'Lihat trend perkembangan BUMDes dan Perjalanan Dinas dalam 6 bulan terakhir',
      icon: <TrendingUp className="w-12 h-12" />,
      gradient: 'from-pink-500 via-rose-600 to-red-600',
      shadowColor: 'shadow-pink-500/50',
      bgPattern: 'bg-pink-50',
      value: '6 Bulan',
      label: 'Data Historis',
      path: '/core-dashboard/trends',
      stats: [
        { icon: <TrendingUp className="w-4 h-4" />, label: 'Growth' },
        { icon: <BarChart3 className="w-4 h-4" />, label: 'Analytics' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader />

        {/* Hero Welcome Card dengan Gradient Modern */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 mb-8 overflow-hidden">
          {/* Animated Background Patterns */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 drop-shadow-lg">
              🎯 Selamat Datang di Core Dashboard
            </h2>
            <p className="text-white text-opacity-90 text-lg max-w-3xl leading-relaxed">
              Pilih modul statistik untuk mendapatkan informasi detail dan visualisasi data yang komprehensif
            </p>
            
            {/* Quick Stats in Hero */}
            <div className="mt-6 grid grid-cols-2 gap-4 max-w-md">
              <div className="bg-blue-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-blue-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-sm mb-1 font-medium">Total BUMDes</p>
                <p className="text-white text-3xl font-bold">
                  {(summary?.total_bumdes || 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="bg-purple-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-purple-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-sm mb-1 font-medium">Total Perjadin</p>
                <p className="text-white text-3xl font-bold">
                  {(summary?.total_perjalanan_dinas || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Module Cards dengan Design Modern */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {moduleCards.map((card, index) => (
            <div
              key={index}
              onClick={() => navigate(card.path)}
              className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl ${card.shadowColor} transition-all duration-500 cursor-pointer transform hover:-translate-y-2 overflow-hidden`}
            >
              {/* Animated Border Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl`}></div>
              
              {/* Card Content */}
              <div className="relative">
                {/* Header dengan Icon */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`bg-gradient-to-br ${card.gradient} p-4 rounded-2xl shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                      <div className="text-white animate-bounce">{card.icon}</div>
                    </div>
                    <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
                      LIVE
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-800 mb-2 transition-all duration-300">
                    {card.title}
                  </h3>
                  
                  {/* Value Display */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-4xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                      {typeof card.value === 'number' 
                        ? card.value.toLocaleString('id-ID') 
                        : card.value}
                    </span>
                    <span className="text-gray-500 text-sm font-medium">
                      {card.label}
                    </span>
                  </div>

                  {/* Stats Pills */}
                  <div className="flex gap-2 mb-3">
                    {card.stats.map((stat, idx) => (
                      <div key={idx} className={`flex items-center gap-1 ${card.bgPattern} px-3 py-1 rounded-full`}>
                        <span className="text-gray-600">{stat.icon}</span>
                        <span className="text-xs font-medium text-gray-700">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="px-6 pb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Footer dengan Hover Effect */}
                <div className={`relative bg-gradient-to-r ${card.gradient} px-6 py-4 flex items-center justify-between overflow-hidden group-hover:px-8 transition-all duration-300`}>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <span className="relative text-white font-semibold text-sm flex items-center gap-2">
                    Lihat Detail
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                  <div className="relative w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-opacity-30 transition-all duration-300">
                    <ArrowRight className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Corner Decoration */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.gradient} opacity-10 rounded-bl-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-700`}></div>
            </div>
          ))}
        </div>

        {/* Enhanced Quick Stats Summary - KKD Programs */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                KKD (Kekayaan & Keuangan Desa)
              </h3>
              <p className="text-gray-500 text-sm">Statistik ADD, DD, dan BHPRD</p>
            </div>
            <div className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-sm font-semibold">Live Data</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ADD Card */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-100 hover:border-purple-300 transition-all duration-300 hover:shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 opacity-20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs font-medium">Alokasi Dana Desa</p>
                    <p className="text-lg font-bold text-purple-600">ADD 2025</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Desa</span>
                    <span className="text-xl font-bold text-purple-600">{(addData?.total_desa || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Alokasi</span>
                    <span className="text-xs font-semibold text-purple-600">
                      {((addData?.total_alokasi || 0) / 1000000000).toFixed(2)}M
                    </span>
                  </div>
                  <div className="pt-2 border-t border-purple-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Belum Mengajukan</span>
                      <span className="font-semibold text-gray-700">{addData?.belum_mengajukan || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DD Card */}
            <div className="group relative bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 border-2 border-cyan-100 hover:border-cyan-300 transition-all duration-300 hover:shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-200 opacity-20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-xl shadow-lg">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs font-medium">Dana Desa</p>
                    <p className="text-lg font-bold text-cyan-600">DD 2025</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Desa</span>
                    <span className="text-xl font-bold text-cyan-600">{(ddData?.total_desa || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Realisasi</span>
                    <span className="text-xs font-semibold text-cyan-600">
                      {((ddData?.total_realisasi || 0) / 1000000000).toFixed(2)}M
                    </span>
                  </div>
                  <div className="pt-2 border-t border-cyan-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Belum Mengajukan</span>
                      <span className="font-semibold text-gray-700">{ddData?.belum_mengajukan || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BHPRD Card */}
            <div className="group relative bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border-2 border-emerald-100 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200 opacity-20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-3 rounded-xl shadow-lg">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs font-medium">Bagi Hasil Pajak</p>
                    <p className="text-lg font-bold text-emerald-600">BHPRD 2025</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Desa</span>
                    <span className="text-xl font-bold text-emerald-600">{(bhprdData?.total_desa || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Realisasi</span>
                    <span className="text-xs font-semibold text-emerald-600">
                      {((bhprdData?.total_realisasi || 0) / 1000000000).toFixed(2)}M
                    </span>
                  </div>
                  <div className="pt-2 border-t border-emerald-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-green-600">Dana Cair</span>
                      <span className="font-semibold text-green-700">{bhprdData?.dana_cair || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-500">Belum Cair</span>
                      <span className="font-semibold text-gray-700">{bhprdData?.belum_cair || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Quick Stats Summary - General */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-1">
                Ringkasan Statistik Umum
              </h3>
              <p className="text-gray-500 text-sm">Data terupdate secara real-time</p>
            </div>
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-sm font-semibold">Live Data</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* BUMDes Card */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 hover:shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 opacity-20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-center gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-600 text-sm font-medium mb-1">Total BUMDes Terdaftar</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {(summary?.total_bumdes || 0).toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Unit usaha milik desa</p>
                </div>
              </div>
            </div>

            {/* Perjalanan Dinas Card */}
            <div className="group relative bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-100 hover:border-orange-300 transition-all duration-300 hover:shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200 opacity-20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-center gap-4">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Briefcase className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-600 text-sm font-medium mb-1">Total Perjalanan Dinas</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    {(summary?.total_perjalanan_dinas || 0).toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Kegiatan perjalanan dinas</p>
                </div>
              </div>
            </div>

            {/* Bantuan Keuangan Card */}
            <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-100 hover:border-green-300 transition-all duration-300 hover:shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-200 opacity-20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-center gap-4">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-600 text-sm font-medium mb-1">Bantuan Keuangan Infrastruktur</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {(bankeuData?.dana_cair || 0).toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Dana telah dicairkan dari {bankeuData?.total_desa || 0} desa</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm font-medium">
              Dashboard diperbarui secara real-time dari database DPMD
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
