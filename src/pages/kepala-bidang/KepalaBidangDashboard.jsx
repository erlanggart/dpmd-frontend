// src/pages/kepala-bidang/KepalaBidangDashboard.jsx
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
  Activity,
  Briefcase,
  Users,
  Bell,
  Info,
  X,
  ChevronRight,
  Calendar
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
import userAnim from '../../assets/lottie/user.json';

const KepalaBidangDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statistik, setStatistik] = useState(null);
  const [recentDisposisi, setRecentDisposisi] = useState([]);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white font-semibold text-lg">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

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
      onClick: () => navigate('/dashboard/informasi')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-4">
      {/* Mobile Header - GoJek Style */}
      <MobileHeader
        userName={user.name || 'Kepala Bidang'}
        userRole="Kepala Bidang DPMD"
        greeting="Selamat Datang"
        gradient="from-blue-600 via-blue-700 to-blue-800"
        notificationCount={statistik?.masuk?.pending || 0}
        onNotificationClick={() => setShowNotifications(!showNotifications)}
        avatar={getUserAvatarUrl(user)}
      />

      {/* Notification Popup - Modern Design */}
      {showNotifications && (
        <>
          {/* Backdrop with blur effect */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowNotifications(false)}
          ></div>
          
          {/* Notification Panel */}
          <div className="fixed top-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100 animate-slideDown">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Notifikasi</h3>
                    <p className="text-xs text-blue-50">
                      {statistik?.masuk?.pending > 0 ? `${statistik.masuk.pending} notifikasi baru` : 'Tidak ada notifikasi baru'}
                    </p>
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
              {statistik?.masuk?.pending > 0 ? (
                <div className="p-4">
                  {/* Notification Item */}
                  <div 
                    className="group relative bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100 hover:border-blue-300 cursor-pointer transition-all hover:shadow-md"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/kepala-bidang/disposisi');
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-gray-800 text-sm">Disposisi Pending</h4>
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {statistik.masuk.pending}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Anda memiliki {statistik.masuk.pending} disposisi yang menunggu persetujuan
                        </p>
                        <div className="flex items-center gap-2 text-xs text-blue-600 font-medium group-hover:text-blue-700">
                          <span>Klik untuk melihat detail</span>
                          <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto mb-4 h-20 w-20 bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl flex items-center justify-center">
                    <Bell className="h-10 w-10 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-gray-700 mb-1">Belum Ada Notifikasi</h4>
                  <p className="text-sm text-gray-500">Notifikasi penting akan muncul di sini</p>
                </div>
              )}
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
            icon={Mail}
          />
          <ServiceGrid services={quickActions} columns={3} />
        </div>

        {/* Summary Stats Section */}
        <div className="mb-5">
          <SectionHeader 
            title="Statistik Disposisi" 
            subtitle="Ringkasan surat masuk"
            icon={Activity}
          />
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon={Clock}
              title="Pending"
              value={statistik?.masuk?.pending || 0}
              color="yellow"
              badge={statistik?.masuk?.pending > 5 ? '!' : null}
              onClick={() => navigate('/kepala-bidang/disposisi?filter=pending')}
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
              trendValue="+18%"
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
            onActionClick={() => navigate('/kepala-bidang/disposisi')}
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
                  onClick={() => navigate(`/kepala-bidang/disposisi/${disposisi.id}`)}
                  badge={disposisi.status === 'pending' ? 1 : null}
                  rightContent={
                    disposisi.instruksi && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
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
              color="blue"
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

export default KepalaBidangDashboard;
