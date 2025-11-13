// src/pages/core-dashboard/DashboardOverview.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, TrendingUp, ArrowRight, BarChart3, Activity, Calendar, MapPin } from 'lucide-react';
import DashboardHeader from './components/DashboardHeader';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
      title: 'Analisis Trend',
      description: 'Lihat trend perkembangan BUMDes dan Perjalanan Dinas dalam 6 bulan terakhir',
      icon: <TrendingUp className="w-12 h-12" />,
      gradient: 'from-purple-500 via-purple-600 to-pink-600',
      shadowColor: 'shadow-purple-500/50',
      bgPattern: 'bg-purple-50',
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

        {/* Enhanced Quick Stats Summary */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-1">
                Ringkasan Statistik
              </h3>
              <p className="text-gray-500 text-sm">Data terupdate secara real-time</p>
            </div>
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-sm font-semibold">Live Data</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
