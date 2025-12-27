// src/pages/kepala-dinas/DashboardOverview.jsx
// Dashboard Eksklusif untuk Kepala Dinas - Executive Summary & KPI Dashboard
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Briefcase, TrendingUp, ArrowRight, BarChart3, Activity, 
  Calendar, MapPin, DollarSign, Building2, CheckCircle2, Clock, 
  AlertCircle, FileText, Target, Award, Zap, Eye
} from 'lucide-react';
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
            records: []
          };
        }
        desaMap[key].records.push({
          sts: item.sts,
          realisasi: parseInt(item.Realisasi.replace(/,/g, ''))
        });
      });

      const desaList = Object.values(desaMap);
      
      // Hitung statistik per status (DINAMIS)
      const statusStats = {};
      validData.forEach(item => {
        if (!statusStats[item.sts]) {
          statusStats[item.sts] = {
            count: 0,
            total: 0
          };
        }
        statusStats[item.sts].count += 1;
        statusStats[item.sts].total += parseInt(item.Realisasi.replace(/,/g, ''));
      });
      
      // Hitung total realisasi
      const total_realisasi = validData.reduce((sum, item) => 
        sum + parseInt(item.Realisasi.replace(/,/g, '')), 0
      );
      
      const stats = {
        total_desa: desaList.length,
        total_records: validData.length,
        total_realisasi: total_realisasi,
        statusStats: statusStats // Objek dinamis berisi semua status
      };
      
      setBankeuData(stats);
    } catch (err) {
      console.error('Error loading bankeu data:', err?.message || String(err));
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

  // KPI Summary Cards untuk Kepala Dinas
  const kpiCards = [
    {
      title: 'Total BUMDes',
      value: summary?.total_bumdes || 0,
      subtitle: 'Badan Usaha Milik Desa',
      icon: <Building2 className="w-8 h-8" />,
      gradient: 'from-blue-500 to-blue-700',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      change: '+12%',
      trend: 'up'
    },
    {
      title: 'Total Perjalanan Dinas',
      value: summary?.total_perjalanan_dinas || 0,
      subtitle: 'Kegiatan Bulan Ini',
      icon: <Briefcase className="w-8 h-8" />,
      gradient: 'from-emerald-500 to-emerald-700',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      change: '+8%',
      trend: 'up'
    },
    {
      title: 'Dana Bantuan',
      value: `${bankeuData?.total_desa || 0} Desa`,
      subtitle: 'Bantuan Keuangan 2025',
      icon: <DollarSign className="w-8 h-8" />,
      gradient: 'from-amber-500 to-amber-700',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      change: `${bankeuData?.total_records || 0} Records`,
      trend: 'neutral'
    },
    {
      title: 'Total Program',
      value: '6',
      subtitle: 'ADD, DD, BHPRD, Bankeu',
      icon: <Target className="w-8 h-8" />,
      gradient: 'from-purple-500 to-purple-700',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      change: 'Aktif',
      trend: 'up'
    }
  ];

  // Quick Access untuk Kepala Dinas
  const quickAccess = [
    {
      title: 'BUMDes',
      path: '/kepala-dinas/statistik-bumdes',
      icon: <Users className="w-6 h-6" />,
      color: 'blue',
      description: 'Statistik BUMDes'
    },
    {
      title: 'Perjadin',
      path: '/kepala-dinas/statistik-perjadin',
      icon: <Briefcase className="w-6 h-6" />,
      color: 'orange',
      description: 'Perjalanan Dinas'
    },
    {
      title: 'Bankeu',
      path: '/kepala-dinas/statistik-bankeu',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'green',
      description: 'Bantuan Keuangan'
    },
    {
      title: 'ADD',
      path: '/kepala-dinas/statistik-add',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'purple',
      description: 'Alokasi Dana Desa'
    },
    {
      title: 'DD',
      path: '/kepala-dinas/statistik-dd',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'cyan',
      description: 'Dana Desa'
    },
    {
      title: 'BHPRD',
      path: '/kepala-dinas/statistik-bhprd',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'teal',
      description: 'Bagi Hasil Pajak'
    },
    {
      title: 'Trends',
      path: '/kepala-dinas/trends',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'pink',
      description: 'Analisis Trend'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Executive Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 opacity-10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Dashboard Kepala Dinas</h1>
                  <p className="text-blue-200 text-sm">Executive Summary & Key Performance Indicators</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2 text-white">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Live Data</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((kpi, index) => (
            <div 
              key={index}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              <div className={`bg-gradient-to-br ${kpi.gradient} p-6`}>
                <div className={`${kpi.bgColor} w-14 h-14 rounded-xl flex items-center justify-center shadow-lg`}>
                  <div className={kpi.textColor}>{kpi.icon}</div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-gray-600 text-sm font-medium mb-2">{kpi.title}</h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-gray-900">{kpi.value}</span>
                  {kpi.trend === 'up' && (
                    <span className="text-green-600 text-sm font-semibold bg-green-50 px-2 py-1 rounded-lg">
                      {kpi.change}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm">{kpi.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Access Grid */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Quick Access</h2>
                <p className="text-gray-500 text-sm">Akses cepat ke modul statistik</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {quickAccess.map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`group bg-gradient-to-br from-${item.color}-50 to-${item.color}-100 hover:from-${item.color}-100 hover:to-${item.color}-200 rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-xl hover:scale-105 border border-${item.color}-200`}
              >
                <div className={`w-14 h-14 bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <div className="text-white">{item.icon}</div>
                </div>
                <h3 className={`font-bold text-${item.color}-900 mb-1`}>{item.title}</h3>
                <p className={`text-${item.color}-600 text-xs`}>{item.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Feed */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Program Status</h3>
                <p className="text-gray-500 text-sm">Status program terkini</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Bankeu 2025</p>
                    <p className="text-sm text-gray-600">{bankeuData?.total_records || 0} Total Records</p>
                  </div>
                </div>
                <span className="text-green-700 font-bold">{bankeuData?.total_desa || 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-gray-900">ADD</p>
                    <p className="text-sm text-gray-600">{addData?.belum_mengajukan || 0} Belum Mengajukan</p>
                  </div>
                </div>
                <span className="text-amber-700 font-bold">{addData?.total_desa || 0}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Dana Desa</p>
                    <p className="text-sm text-gray-600">{ddData?.belum_mengajukan || 0} Belum Mengajukan</p>
                  </div>
                </div>
                <span className="text-blue-700 font-bold">{ddData?.total_desa || 0}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-semibold text-gray-900">BHPRD</p>
                    <p className="text-sm text-gray-600">{bhprdData?.dana_cair || 0} Desa Cair</p>
                  </div>
                </div>
                <span className="text-purple-700 font-bold">{bhprdData?.total_desa || 0}</span>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Performance Overview</h3>
                <p className="text-gray-500 text-sm">Ringkasan performa program</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* BUMDes Performance */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">BUMDes</span>
                  <span className="text-sm font-bold text-blue-600">{summary?.total_bumdes || 0} Unit</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              {/* Perjadin Performance */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Perjalanan Dinas</span>
                  <span className="text-sm font-bold text-emerald-600">{summary?.total_perjalanan_dinas || 0} Kegiatan</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>

              {/* Bankeu Performance */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Bankeu Records</span>
                  <span className="text-sm font-bold text-green-600">{bankeuData?.total_records || 0} / {bankeuData?.total_desa || 0} Desa</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" 
                    style={{ width: `${bankeuData?.total_desa ? (bankeuData.total_records / bankeuData.total_desa * 100) : 0}%` }}>
                  </div>
                </div>
              </div>

              {/* Overall Progress */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">87%</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-4">
                  <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 h-4 rounded-full shadow-lg" style={{ width: '87%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-white font-medium">
                Dashboard diperbarui secara real-time dari database DPMD
              </p>
            </div>
            <button
              onClick={() => navigate('/core-dashboard/trends')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Lihat Detail Analisis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardOverview;
