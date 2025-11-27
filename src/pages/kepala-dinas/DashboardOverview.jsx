// src/pages/core-dashboard/DashboardOverview.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, TrendingUp, ArrowRight, BarChart3, Activity, Calendar, MapPin, DollarSign, Building2 } from 'lucide-react';
import DashboardHeader from './components/DashboardHeader';
import { isVpnUser } from '../../utils/vpnHelper';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api',
  getEndpoint: (path) => {
    const vpnMode = isVpnUser();
    if (vpnMode) {
      // VPN mode: use /vpn-core prefix
      return `${API_CONFIG.BASE_URL}/vpn-core${path}`;
    } else {
      // Normal mode: use /kepala-dinas prefix for dashboard
      if (path === '/dashboard') {
        return `${API_CONFIG.BASE_URL}/kepala-dinas/dashboard`;
      }
      return `${API_CONFIG.BASE_URL}${path}`;
    }
  }
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
      const headers = {};
      
      // Only add Authorization header for non-VPN users
      if (token && token !== 'VPN_ACCESS_TOKEN') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.get(
        API_CONFIG.getEndpoint('/add/data'),
        { headers }
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
      const headers = {};
      
      // Only add Authorization header for non-VPN users
      if (token && token !== 'VPN_ACCESS_TOKEN') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.get(
        API_CONFIG.getEndpoint('/dd/data'),
        { headers }
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
      const headers = {};
      
      // Only add Authorization header for non-VPN users
      if (token && token !== 'VPN_ACCESS_TOKEN') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.get(
        API_CONFIG.getEndpoint('/bhprd/data'),
        { headers }
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
      const headers = {};
      
      // Only add Authorization header for non-VPN users
      if (token && token !== 'VPN_ACCESS_TOKEN') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.get(
        API_CONFIG.getEndpoint('/dashboard'),
        { headers }
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
      <div className="max-w-full mx-auto px-4">
        <DashboardHeader />

        {/* Hero Welcome Card dengan Gradient Modern */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-16 md:p-20 lg:p-24 mb-8 overflow-hidden">
          {/* Animated Background Patterns */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
          
          <div className="relative z-10 text-center">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-lg">
              🎯 Selamat Datang di Core Dashboard
            </h2>
            <p className="text-white text-opacity-90 text-2xl md:text-3xl max-w-5xl mx-auto leading-relaxed">
              Pilih modul statistik untuk mendapatkan informasi detail dan visualisasi data yang komprehensif
            </p>
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
