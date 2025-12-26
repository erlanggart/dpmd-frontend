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

  const { summary, bumdes, perjalanan_dinas } = dashboardData;

  // Quick Actions Menu
  const quickActions = [
    {
      icon: FileText,
      label: 'Laporan Desa',
      color: 'blue',
      onClick: () => navigate('/kepala-dinas/laporan-desa')
    },
    {
      icon: Building2,
      label: 'Statistik BUMDes',
      color: 'green',
      onClick: () => navigate('/kepala-dinas/statistik-bumdes')
    },
    {
      icon: Briefcase,
      label: 'Perjalanan Dinas',
      color: 'purple',
      onClick: () => navigate('/kepala-dinas/statistik-perjadin')
    },
    {
      icon: BarChart3,
      label: 'Dashboard Overview',
      color: 'orange',
      onClick: () => navigate('/kepala-dinas/overview')
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
              icon={Building2}
              title="BUMDes"
              value={summary?.total_bumdes || 0}
              color="green"
              onClick={() => navigate('/kepala-dinas/statistik-bumdes')}
            />
            <InfoCard
              icon={Users}
              title="Pegawai"
              value={summary?.total_pegawai || 0}
              color="purple"
            />
            <InfoCard
              icon={Briefcase}
              title="Kegiatan"
              value={summary?.total_kegiatan || 0}
              color="orange"
            />
          </div>
        </div>

        {/* BUMDes Statistics */}
        <div className="mb-5">
          <SectionHeader 
            title="Statistik BUMDes" 
            subtitle="Data BUMDes per status"
            icon={Building2}
            actionText="Detail"
            onActionClick={() => navigate('/kepala-dinas/statistik-bumdes')}
          />
          <div className="space-y-3">
            <InfoCard
              icon={Building2}
              title="BUMDes Aktif"
              value={bumdes?.stats?.aktif || 0}
              subtitle="Beroperasi dengan baik"
              color="green"
              trend="up"
              trendValue="+12%"
            />
            <InfoCard
              icon={Building2}
              title="BUMDes Tidak Aktif"
              value={bumdes?.stats?.tidak_aktif || 0}
              subtitle="Memerlukan perhatian"
              color="red"
            />
            <InfoCard
              icon={Building2}
              title="BUMDes Baru Dibentuk"
              value={bumdes?.stats?.baru_dibentuk || 0}
              subtitle="Dalam tahap awal"
              color="yellow"
            />
          </div>
        </div>

        {/* Perjalanan Dinas Statistics */}
        <div className="mb-5">
          <SectionHeader 
            title="Perjalanan Dinas" 
            subtitle="Statistik perjalanan dinas"
            icon={Briefcase}
            actionText="Detail"
            onActionClick={() => navigate('/kepala-dinas/statistik-perjadin')}
          />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <InfoCard
              icon={Calendar}
              title="Minggu Ini"
              value={perjalanan_dinas?.stats?.minggu_ini || 0}
              color="blue"
            />
            <InfoCard
              icon={Calendar}
              title="Bulan Ini"
              value={perjalanan_dinas?.stats?.bulan_ini || 0}
              color="indigo"
            />
          </div>
          <InfoCard
            icon={TrendingUp}
            title="Total Tahun Ini"
            value={perjalanan_dinas?.stats?.tahun_ini || 0}
            subtitle="Perjalanan dinas 2025"
            color="purple"
          />
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
              subtitle="3 desa telah mengirim laporan baru"
              time="2 jam lalu"
              status="info"
            />
            <ActivityCard
              icon={Building2}
              title="BUMDes Baru Terdaftar"
              subtitle="BUMDes Makmur Jaya - Desa Ciawi"
              time="5 jam lalu"
              status="success"
            />
            <ActivityCard
              icon={Briefcase}
              title="Perjalanan Dinas Selesai"
              subtitle="Kunjungan ke Desa Dramaga"
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
              onClick={() => navigate('/kepala-dinas/statistik-bumdes')}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white cursor-pointer active:scale-95 transition-transform shadow-lg"
            >
              <PieChart className="w-8 h-8 mb-3" />
              <h4 className="font-bold text-sm mb-1">Grafik BUMDes</h4>
              <p className="text-xs text-green-100">Lihat detail</p>
            </div>
            <div 
              onClick={() => navigate('/kepala-dinas/statistik-perjadin')}
              className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white cursor-pointer active:scale-95 transition-transform shadow-lg"
            >
              <BarChart3 className="w-8 h-8 mb-3" />
              <h4 className="font-bold text-sm mb-1">Grafik Perjadin</h4>
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
