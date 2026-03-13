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
  Activity,
  Bell,
  Info,
  X
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
  const [showNotifications, setShowNotifications] = useState(false);

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

  // Quick Actions Menu - Simplified to 3 items
  const quickActions = [
    {
      icon: Briefcase,
      label: 'Perjadin',
      color: 'blue',
      onClick: () => navigate('/dashboard/perjalanan-dinas')
    },
    {
      icon: Calendar,
      label: 'Jadwal',
      color: 'green',
      onClick: () => navigate('/dashboard/jadwal')
    },
    {
      icon: Info,
      label: 'Informasi',
      color: 'orange',
      onClick: () => navigate('/dpmd/informasi')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-4">
      {/* Mobile Header - GoJek Style */}
      <MobileHeader
        userName={user.name || 'Kepala Dinas'}
        userRole="Kepala Dinas DPMD"
        greeting="Selamat Datang"
        gradient="from-blue-600 via-blue-700 to-blue-800"
        notificationCount={0}
        onNotificationClick={() => setShowNotifications(!showNotifications)}
        avatar={getUserAvatarUrl(user)}
      />

      {/* Notification Popup */}
      {showNotifications && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowNotifications(false)}
          ></div>
          
          {/* Notification Panel */}
          <div className="fixed top-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100 animate-slideDown">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Notifikasi</h3>
                    <p className="text-xs text-blue-50">Tidak ada notifikasi baru</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
              {/* Empty State */}
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-4 h-20 w-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center">
                  <Bell className="h-10 w-10 text-blue-400" />
                </div>
                <h4 className="font-semibold text-gray-700 mb-1">Belum Ada Notifikasi</h4>
                <p className="text-sm text-gray-500">Notifikasi penting akan muncul di sini</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        {/* Quick Actions Section */}
        <div className="bg-white rounded-[24px] sm:rounded-[28px] shadow-lg shadow-gray-200/60 p-5 sm:p-6 mb-5 border border-gray-100">
          <SectionHeader 
            title="Menu Utama" 
            subtitle="Akses cepat fitur pegawai"
            icon={LayoutDashboard}
          />
          <ServiceGrid services={quickActions} columns={3} />
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
