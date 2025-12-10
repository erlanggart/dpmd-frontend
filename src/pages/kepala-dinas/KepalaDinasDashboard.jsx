// src/pages/kepala-dinas/KepalaDinasDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardHeader from './components/DashboardHeader';
import SummaryCards from './components/SummaryCards';
import BackButton from './components/BackButton';
import BumdesCharts from './components/BumdesCharts';
import PerjadinCharts from './components/PerjadinCharts';
import TrendChart from './components/TrendChart';
import BumdesStatsCards from './components/BumdesStatsCards';
import PerjadinStatsCards from './components/PerjadinStatsCards';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const KepalaDinasDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [activeModule, setActiveModule] = useState('overview'); // 'overview', 'bumdes', 'perjadin'

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
      setDashboardData(response.data.data); // Access the nested data object
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
      <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white font-semibold">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-red-600 text-3xl">⚠️</div>
          </div>
          <h3 className="text-center font-bold text-gray-800 mb-2">Oops!</h3>
          <p className="text-center text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="w-full bg-slate-700 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // Check if data is loaded
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl">Tidak ada data</div>
        </div>
      </div>
    );
  }

  const { summary, bumdes, perjalanan_dinas, trends } = dashboardData;

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Component */}
        <DashboardHeader />

        {/* Summary Cards Component */}
        <SummaryCards
          summary={summary}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
        />

        {/* Back Button Component */}
        {activeModule !== 'overview' && (
          <BackButton onClick={() => setActiveModule('overview')} />
        )}

        {/* BUMDes Charts Component */}
        {(activeModule === 'overview' || activeModule === 'bumdes') && (
          <BumdesCharts bumdes={bumdes} />
        )}

        {/* Perjalanan Dinas Charts Component */}
        {(activeModule === 'overview' || activeModule === 'perjadin') && (
          <PerjadinCharts perjalanan_dinas={perjalanan_dinas} />
        )}

        {/* Trends Chart Component - Show only on overview */}
        {activeModule === 'overview' && (
          <TrendChart trends={trends} />
        )}

        {/* BUMDes Stats Cards Component */}
        {(activeModule === 'overview' || activeModule === 'bumdes') && (
          <BumdesStatsCards bumdes={bumdes} />
        )}

        {/* Perjalanan Dinas Stats Cards Component */}
        {(activeModule === 'overview' || activeModule === 'perjadin') && (
          <PerjadinStatsCards perjalanan_dinas={perjalanan_dinas} />
        )}

        {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center text-gray-500 text-xs sm:text-sm px-4">
          <p>Dashboard diperbarui secara real-time dari database DPMD</p>
        </div>
      </div>
    </div>
  );
};

export default KepalaDinasDashboard;
