// src/pages/sekretaris-dinas/SekretarisDinasDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Send,
  Mail,
  Inbox,
  TrendingUp,
  Activity
} from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import MobileHeader from '../../components/mobile/MobileHeader';
import ServiceGrid from '../../components/mobile/ServiceGrid';
import InfoCard from '../../components/mobile/InfoCard';
import SectionHeader from '../../components/mobile/SectionHeader';
import ActivityCard from '../../components/mobile/ActivityCard';
import { getUserAvatarUrl } from '../../utils/avatarUtils';

// Import Lottie animations
import inboxAnim from '../../assets/lottie/inbox.json';
import chartAnim from '../../assets/lottie/chart.json';

const SekretarisDinasDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statistik, setStatistik] = useState(null);
  const [recentDisposisi, setRecentDisposisi] = useState([]);
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
      const [statsRes, disposisiRes] = await Promise.all([
        api.get('/disposisi/statistik'),
        api.get('/disposisi/masuk?limit=5')
      ]);

      setStatistik(statsRes.data.data);
      setRecentDisposisi(disposisiRes.data.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatTanggal = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      dibaca: 'bg-blue-100 text-blue-800',
      proses: 'bg-indigo-100 text-indigo-800',
      selesai: 'bg-green-100 text-green-800',
      teruskan: 'bg-purple-100 text-purple-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white font-semibold text-lg">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  // Quick Actions Menu
  const quickActions = [
    {
      lottieAnimation: inboxAnim,
      label: 'Disposisi Masuk',
      color: 'purple',
      badge: statistik?.masuk?.pending || 0,
      onClick: () => navigate('/sekretaris-dinas/disposisi')
    },
    {
      icon: Send,
      label: 'Disposisi Keluar',
      color: 'blue',
      onClick: () => navigate('/sekretaris-dinas/disposisi?tab=keluar')
    },
    {
      lottieAnimation: chartAnim,
      label: 'Dashboard Utama',
      color: 'green',
      onClick: () => navigate('/core-dashboard/dashboard')
    },
    {
      icon: FileText,
      label: 'Laporan',
      color: 'orange',
      onClick: () => navigate('/sekretaris-dinas/laporan')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header - GoJek Style */}
      <MobileHeader
        userName={user.name || 'Sekretaris Dinas'}
        userRole="Sekretaris Dinas DPMD"
        greeting="Selamat Datang"
        gradient="from-purple-600 via-purple-700 to-purple-800"
        notificationCount={statistik?.masuk?.pending || 0}
        onNotificationClick={() => navigate('/sekretaris-dinas/notifikasi')}
        onSettingsClick={() => navigate('/sekretaris-dinas/profil')}
        avatar={getUserAvatarUrl(user)}
      />

      {/* Main Content */}
      <div className="px-4 -mt-4">
        {/* Quick Actions Section */}
        <div className="bg-white rounded-3xl shadow-lg p-5 mb-5">
          <SectionHeader 
            title="Menu Utama" 
            subtitle="Akses cepat disposisi & laporan"
            icon={Mail}
          />
          <ServiceGrid services={quickActions} columns={4} />
        </div>

        {/* Summary Stats Section */}
        <div className="mb-5">
          <SectionHeader 
            title="Statistik Disposisi" 
            subtitle="Ringkasan surat masuk & keluar"
            icon={Activity}
          />
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon={Clock}
              title="Pending"
              value={statistik?.masuk?.pending || 0}
              color="yellow"
              badge={statistik?.masuk?.pending > 5 ? '!' : null}
              onClick={() => navigate('/sekretaris-dinas/disposisi?filter=pending')}
            />
            <InfoCard
              icon={TrendingUp}
              title="Diproses"
              value={(statistik?.masuk?.dibaca || 0) + (statistik?.masuk?.proses || 0)}
              color="blue"
            />
            <InfoCard
              icon={CheckCircle}
              title="Selesai"
              value={statistik?.masuk?.selesai || 0}
              color="green"
              trend="up"
              trendValue="+15%"
            />
            <InfoCard
              icon={Send}
              title="Diteruskan"
              value={statistik?.keluar?.total || 0}
              color="purple"
            />
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mb-5">
          <SectionHeader 
            title="Disposisi Terbaru" 
            subtitle="Surat yang perlu ditindaklanjuti"
            icon={FileText}
            actionText="Lihat Semua"
            onActionClick={() => navigate('/sekretaris-dinas/disposisi')}
          />
          
          {recentDisposisi.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <FileText className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-400 font-medium">Tidak ada disposisi terbaru</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDisposisi.slice(0, 5).map((disposisi) => (
                <ActivityCard
                  key={disposisi.id}
                  icon={Mail}
                  title={disposisi.surat?.perihal || 'Tanpa Perihal'}
                  subtitle={`Dari: ${disposisi.dari_user?.name || 'Unknown'}`}
                  time={formatTanggal(disposisi.tanggal_disposisi)}
                  status={disposisi.status === 'pending' ? 'pending' : 
                          disposisi.status === 'selesai' ? 'success' : 'info'}
                  onClick={() => navigate(`/sekretaris-dinas/disposisi/${disposisi.id}`)}
                  badge={disposisi.status === 'pending' ? 1 : null}
                  rightContent={
                    disposisi.instruksi && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                        {disposisi.instruksi}
                      </span>
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats Cards */}
        <div className="mb-5">
          <SectionHeader 
            title="Statistik Bulanan" 
            subtitle="Kinerja bulan ini"
            icon={TrendingUp}
          />
          <div className="space-y-3">
            <InfoCard
              icon={Inbox}
              title="Total Masuk Bulan Ini"
              value={statistik?.masuk?.total || 0}
              subtitle="Semua status disposisi masuk"
              color="indigo"
            />
            <InfoCard
              icon={Send}
              title="Total Keluar Bulan Ini"
              value={statistik?.keluar?.total || 0}
              subtitle="Disposisi yang diteruskan"
              color="purple"
            />
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

export default SekretarisDinasDashboard;
