// src/pages/core-dashboard/TrendsPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TrendChart from './components/TrendChart';
import { TrendingUp, ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const TrendsPage = () => {
  const [loading, setLoading] = useState(true);
  const [trendsData, setTrendsData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrendsData();
  }, []);

  const fetchTrendsData = async () => {
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

      setTrendsData(response.data.data.trends);
      setError(null);
    } catch (err) {
      console.error('Error fetching trends data:', err);
      setError(err.response?.data?.message || 'Gagal memuat data Trend');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Memuat Data Trend...</p>
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
              onClick={fetchTrendsData}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics from trends data
  const calculateStats = () => {
    if (!trendsData || trendsData.length === 0) {
      return { totalBumdes: 0, totalPerjadin: 0, avgBumdes: 0, avgPerjadin: 0 };
    }

    const totalBumdes = trendsData.reduce((sum, item) => sum + (item.bumdes_count || 0), 0);
    const totalPerjadin = trendsData.reduce((sum, item) => sum + (item.perjadin_count || 0), 0);

    return {
      totalBumdes,
      totalPerjadin,
      avgBumdes: Math.round(totalBumdes / trendsData.length),
      avgPerjadin: Math.round(totalPerjadin / trendsData.length),
      months: trendsData.length
    };
  };

  const stats = calculateStats();

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/core-dashboard/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali ke Dashboard</span>
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white rounded-lg shadow-md">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Analisis Trend
              </h1>
              <p className="text-gray-600">Perkembangan Data 6 Bulan Terakhir</p>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-white text-opacity-90 text-lg font-medium mb-2">
                Periode Analisis
              </p>
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                <p className="text-2xl font-bold">
                  {stats.months} Bulan Terakhir
                </p>
              </div>
            </div>
            <TrendingUp className="w-24 h-24 text-white opacity-20" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white border-opacity-20 pt-6">
            <div>
              <p className="text-white text-opacity-75 text-sm">Total BUMDes (6 bulan)</p>
              <p className="text-2xl font-bold">{stats.totalBumdes}</p>
            </div>
            <div>
              <p className="text-white text-opacity-75 text-sm">Rata-rata BUMDes/bulan</p>
              <p className="text-2xl font-bold">{stats.avgBumdes}</p>
            </div>
            <div>
              <p className="text-white text-opacity-75 text-sm">Total Perjadin (6 bulan)</p>
              <p className="text-2xl font-bold">{stats.totalPerjadin}</p>
            </div>
            <div>
              <p className="text-white text-opacity-75 text-sm">Rata-rata Perjadin/bulan</p>
              <p className="text-2xl font-bold">{stats.avgPerjadin}</p>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <TrendChart trends={trendsData} />

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Insight BUMDes</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Data menunjukkan perkembangan jumlah BUMDes dalam 6 bulan terakhir. 
              Rata-rata {stats.avgBumdes} BUMDes per bulan menunjukkan pertumbuhan yang stabil.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Insight Perjalanan Dinas</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Perjalanan dinas menunjukkan tren dengan rata-rata {stats.avgPerjadin} kegiatan per bulan. 
              Data ini membantu dalam perencanaan anggaran dan koordinasi kegiatan.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Data trend dianalisis dari database DPMD</p>
        </div>
      </div>
    </div>
  );
};

export default TrendsPage;
