// src/pages/kepala-dinas/KepalaDinasDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Building2, 
  Briefcase, 
  FileText,
  TrendingUp,
  Users,
  MapPin,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import MobileHeader from '../../components/mobile/MobileHeader';
import ServiceGrid from '../../components/mobile/ServiceGrid';
import InfoCard from '../../components/mobile/InfoCard';
import SectionHeader from '../../components/mobile/SectionHeader';
import ActivityCard from '../../components/mobile/ActivityCard';
import { getUserAvatarUrl } from '../../utils/avatarUtils';

// Import Lottie animations
// Using Lottie CDN URLs instead of local imports

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const KepalaDinasDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  useEffect(() => {
    const handleProfileUpdate = () => {
      const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(updatedUser);
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []);

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
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white font-semibold text-lg">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-red-600 text-3xl">⚠️</div>
          </div>
          <h3 className="text-center font-bold text-gray-800 text-xl mb-2">Oops!</h3>
          <p className="text-center text-gray-600 text-sm mb-6">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg active:scale-95 transition-all"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { summary } = dashboardData;

  // Quick Actions Menu - Simplified
  const quickActions = [
    {
      icon: FileText,
      label: 'Laporan Desa',
      color: 'blue',
      onClick: () => navigate('/kepala-dinas/laporan-desa')
    },
    {
      icon: BarChart3,
      label: 'Dashboard Overview',
      color: 'orange',
      onClick: () => navigate('/kepala-dinas/overview')
    },
    {
      icon: TrendingUp,
      label: 'Statistik',
      color: 'green',
      onClick: () => navigate('/core-dashboard/dashboard')
    },
    {
      icon: Activity,
      label: 'Disposisi',
      color: 'purple',
      onClick: () => navigate('/kepala-dinas/disposisi')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header - GoJek Style */}
      <MobileHeader
        userName={user.name || 'Kepala Dinas'}
        userRole="Kepala Dinas DPMD"
        greeting="Selamat Datang"
        gradient="from-blue-600 via-blue-700 to-blue-800"
        notificationCount={0}
        onNotificationClick={() => navigate('/kepala-dinas/notifikasi')}
        onSettingsClick={() => navigate('/kepala-dinas/profil')}
        avatar={getUserAvatarUrl(user)}
      />

      {/* Main Content */}
      <div className="px-4 -mt-4">
        {/* Quick Actions Section */}
        <div className="bg-white rounded-3xl shadow-lg p-5 mb-5">
          <SectionHeader 
            title="Menu Utama" 
            subtitle="Akses cepat ke fitur utama"
            icon={LayoutDashboard}
          />
          <ServiceGrid services={quickActions} columns={4} />
        </div>

        {/* Summary Stats Section */}
        <div className="mb-5">
          <SectionHeader 
            title="Ringkasan" 
            subtitle="Data keseluruhan sistem"
            icon={Activity}
          />
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon={MapPin}
              title="Total Desa"
              value={summary?.total_desa || 0}
              color="blue"
              onClick={() => navigate('/kepala-dinas/laporan-desa')}
            />
            <InfoCard
              icon={Users}
              title="Pegawai"
              value={summary?.total_pegawai || 0}
              color="purple"
            />
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mb-5">
          <SectionHeader 
            title="Aktivitas Terkini" 
            subtitle="Update terbaru sistem"
            icon={Activity}
          />
          <div className="space-y-3">
            <ActivityCard
              icon={FileText}
              title="Laporan Desa Diperbarui"
              subtitle="Data desa telah diperbarui"
              time="2 jam lalu"
              status="info"
            />
            <ActivityCard
              icon={Users}
              title="Data Pegawai"
              subtitle="Informasi pegawai terkini"
              time="5 jam lalu"
              status="success"
            />
            <ActivityCard
              icon={Activity}
              title="Sistem Aktif"
              subtitle="Semua layanan berjalan normal"
              time="1 hari lalu"
              status="success"
            />
          </div>
        </div>

        {/* Data Visualization Cards */}
        <div className="mb-5">
          <SectionHeader 
            title="Visualisasi Data" 
            subtitle="Grafik dan analisis"
            icon={PieChart}
          />
          <div className="grid grid-cols-2 gap-3">
            <div 
              onClick={() => navigate('/core-dashboard/statistik-bankeu')}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white cursor-pointer active:scale-95 transition-transform shadow-lg"
            >
              <PieChart className="w-8 h-8 mb-3" />
              <h4 className="font-bold text-sm mb-1">Statistik Bankeu</h4>
              <p className="text-xs text-green-100">Lihat detail</p>
            </div>
            <div 
              onClick={() => navigate('/core-dashboard/statistik-add')}
              className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white cursor-pointer active:scale-95 transition-transform shadow-lg"
            >
              <BarChart3 className="w-8 h-8 mb-3" />
              <h4 className="font-bold text-sm mb-1">Statistik ADD</h4>
              <p className="text-xs text-purple-100">Lihat detail</p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center py-6">
          <p className="text-gray-400 text-xs">
            Dashboard diperbarui secara real-time
          </p>
          <p className="text-gray-400 text-xs mt-1">
            DPMD Kabupaten Bogor © 2025
          </p>
        </div>
      </div>
    </div>
  );
};

export default KepalaDinasDashboard;
