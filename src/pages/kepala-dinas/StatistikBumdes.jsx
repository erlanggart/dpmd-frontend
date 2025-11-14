// src/pages/core-dashboard/StatistikBumdes.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BumdesCharts from './components/BumdesCharts';
import BumdesStatsCards from './components/BumdesStatsCards';
import { Users, ArrowLeft, TrendingUp, Building2, BarChart3, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const StatistikBumdes = () => {
  const [loading, setLoading] = useState(true);
  const [bumdesData, setBumdesData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBumdesData();
  }, []);

  const fetchBumdesData = async () => {
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

      setBumdesData(response.data.data.bumdes);
      setError(null);
    } catch (err) {
      console.error('Error fetching bumdes data:', err);
      setError(err.response?.data?.message || 'Gagal memuat data BUMDes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Memuat Data BUMDes...</p>
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
              onClick={fetchBumdesData}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/core-dashboard/dashboard')}
            className="group flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-4 transition-all duration-300 bg-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="font-medium">Kembali ke Dashboard</span>
          </button>
        </div>

        {/* Hero Header Card */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-3xl shadow-2xl p-8 mb-8 overflow-hidden">
          {/* Animated Background Patterns */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-white opacity-5 rounded-full animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                📊 Statistik BUMDes
              </h1>
              <p className="text-white text-opacity-90 text-lg">
                Data BUMDes Kabupaten Bogor
              </p>
            </div>

            {/* Quick Stats Pills */}
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="bg-blue-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-blue-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <Activity className="w-4 h-4 text-white animate-pulse" />
                <span className="text-white text-sm font-semibold">Real-time Data</span>
              </div>
              <div className="bg-indigo-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-indigo-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <BarChart3 className="w-4 h-4 text-white animate-pulse" />
                <span className="text-white text-sm font-semibold">Visualisasi Lengkap</span>
              </div>
              <div className="bg-purple-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-purple-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <TrendingUp className="w-4 h-4 text-white animate-pulse" />
                <span className="text-white text-sm font-semibold">Analisis Mendalam</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card - Modern Design */}
        <div className="relative bg-white rounded-2xl shadow-xl p-8 mb-8 overflow-hidden border border-gray-100">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100 to-indigo-100 opacity-30 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-50 to-indigo-50 opacity-40 rounded-full -ml-48 -mb-48"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Total BUMDes Terdaftar</h2>
                <p className="text-gray-600">Kabupaten Bogor</p>
              </div>
              <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-sm font-semibold">Live Data</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total BUMDes */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-lg text-white">
                <div className="flex items-center justify-between mb-4">
                  <Building2 className="w-10 h-10 text-white opacity-90 animate-pulse" />
                  <div className="bg-blue-700 bg-opacity-60 backdrop-blur-sm rounded-lg px-3 py-1 border border-blue-300 border-opacity-30">
                    <span className="text-xs font-bold text-white">TOTAL</span>
                  </div>
                </div>
                <p className="text-white text-opacity-90 text-sm mb-2 font-medium">Total BUMDes</p>
                <p className="text-5xl font-bold mb-2">
                  {(bumdesData?.total || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-white text-opacity-80 text-sm">Unit Usaha</p>
              </div>

              {/* BUMDes Aktif */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-lg text-white">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-10 h-10 text-white opacity-90 animate-bounce" />
                  <div className="bg-green-700 bg-opacity-60 backdrop-blur-sm rounded-lg px-3 py-1 border border-green-300 border-opacity-30">
                    <span className="text-xs font-bold text-white">AKTIF</span>
                  </div>
                </div>
                <p className="text-white text-opacity-90 text-sm mb-2 font-medium">BUMDes Aktif</p>
                <p className="text-5xl font-bold mb-2">
                  {(bumdesData?.aktif || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-white text-opacity-80 text-sm">
                  {bumdesData?.total > 0 
                    ? `${((bumdesData?.aktif / bumdesData?.total) * 100).toFixed(1)}% dari total`
                    : '0% dari total'}
                </p>
              </div>

              {/* BUMDes Non-Aktif */}
              <div className="bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl p-6 shadow-lg text-white">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-10 h-10 text-white opacity-90 animate-pulse" />
                  <div className="bg-gray-800 bg-opacity-60 backdrop-blur-sm rounded-lg px-3 py-1 border border-gray-400 border-opacity-30">
                    <span className="text-xs font-bold text-white">NON-AKTIF</span>
                  </div>
                </div>
                <p className="text-white text-opacity-90 text-sm mb-2 font-medium">BUMDes Non-Aktif</p>
                <p className="text-5xl font-bold mb-2">
                  {(bumdesData?.non_aktif || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-white text-opacity-80 text-sm">
                  {bumdesData?.total > 0 
                    ? `${((bumdesData?.non_aktif / bumdesData?.total) * 100).toFixed(1)}% dari total`
                    : '0% dari total'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <BumdesCharts bumdes={bumdesData} />

        {/* Stats Cards */}
        <BumdesStatsCards bumdes={bumdesData} />

        {/* Footer */}
        <div className="mt-8 text-center bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm font-medium">
              Data diperbarui secara real-time dari database DPMD
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatistikBumdes;
