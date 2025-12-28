// src/pages/ketua-tim/KetuaTimDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  LuCalendar, 
  LuClipboardList, 
  LuTrendingUp,
  LuBell,
  LuClock,
  LuArrowRight,
  LuFileText,
  LuFolderOpen,
  LuActivity,
  LuLayoutGrid
} from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const KetuaTimDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [stats, setStats] = useState({
    totalJadwal: 0,
    jadwalHariIni: 0,
    jadwalMendatang: 0,
    disposisiMenunggu: 0
  });
  const [upcomingJadwal, setUpcomingJadwal] = useState([]);
  const [loading, setLoading] = useState(true);

  // Debug: Log user data on mount
  useEffect(() => {
    console.log('🔍 KetuaTimDashboard - User Data:', user);
    console.log('🔍 bidang_id:', user.bidang_id);
    console.log('🔍 bidang_id type:', typeof user.bidang_id);
  }, []);

  // Get bidang name based on bidang_id (ACTUAL DATABASE IDs)
  const getBidangName = () => {
    const bidangNameMap = {
      2: 'Sekretariat',
      3: 'Sarana Prasarana Kewilayahan dan Ekonomi Desa',
      4: 'Kekayaan dan Keuangan Desa',
      5: 'Pemberdayaan Masyarakat Desa',
      6: 'Pemerintahan Desa',
      7: 'Tenaga Alih Daya',
      8: 'Tenaga Keamanan',
      9: 'Tenaga Kebersihan'
    };
    return bidangNameMap[user.bidang_id] || user.bidang_name || 'Bidang tidak tersedia';
  };

  // Get bidang path based on bidang_id (ACTUAL DATABASE IDs)
  const getBidangPath = () => {
    const bidangMap = {
      2: '/bidang/sekretariat',
      3: '/bidang/spked',
      4: '/bidang/kkd',
      5: '/bidang/pmd',
      6: '/bidang/pemdes',
      7: '/bidang/sekretariat', // Tenaga Alih Daya → default to Sekretariat
      8: '/bidang/sekretariat', // Tenaga Keamanan → default to Sekretariat
      9: '/bidang/sekretariat'  // Tenaga Kebersihan → default to Sekretariat
    };
    console.log('🔍 getBidangPath - user.bidang_id:', user.bidang_id);
    console.log('🔍 getBidangPath - resolved path:', bidangMap[user.bidang_id]);
    return bidangMap[user.bidang_id] || '/bidang/sekretariat';
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch jadwal kegiatan
      const jadwalResponse = await api.get('/jadwal-kegiatan?limit=100');
      const jadwals = jadwalResponse.data.data || [];

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const jadwalHariIni = jadwals.filter(j => {
        const jadwalDate = new Date(j.tanggal_mulai);
        jadwalDate.setHours(0, 0, 0, 0);
        return jadwalDate.getTime() === today.getTime();
      });

      const jadwalMendatang = jadwals.filter(j => {
        const jadwalDate = new Date(j.tanggal_mulai);
        return jadwalDate >= tomorrow;
      });

      setStats({
        totalJadwal: jadwals.length,
        jadwalHariIni: jadwalHariIni.length,
        jadwalMendatang: jadwalMendatang.length,
        disposisiMenunggu: 0 // TODO: implement disposisi count
      });

      // Get upcoming jadwal (next 5)
      const upcoming = jadwals
        .filter(j => new Date(j.tanggal_mulai) >= today)
        .sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai))
        .slice(0, 5);

      setUpcomingJadwal(upcoming);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Kegiatan',
      value: stats.totalJadwal,
      icon: LuCalendar,
      gradient: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-100'
    },
    {
      title: 'Hari Ini',
      value: stats.jadwalHariIni,
      icon: LuClock,
      gradient: 'from-green-500 to-green-600',
      shadow: 'shadow-green-100'
    },
    {
      title: 'Mendatang',
      value: stats.jadwalMendatang,
      icon: LuTrendingUp,
      gradient: 'from-purple-500 to-purple-600',
      shadow: 'shadow-purple-100'
    },
    {
      title: 'Disposisi',
      value: stats.disposisiMenunggu,
      icon: LuBell,
      gradient: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-100'
    }
  ];

  // Bidang-specific menus based on bidang_id
  const getBidangMenus = () => {
    const basePath = getBidangPath();
    
    // Common menus for all bidangs
    const commonMenus = [
      {
        title: 'Dashboard Bidang',
        description: 'Halaman utama bidang',
        icon: LuActivity,
        path: basePath, // Navigate to main bidang page
        gradient: 'from-indigo-500 to-purple-600',
        borderColor: 'border-indigo-200',
        hoverColor: 'hover:border-indigo-400'
      },
      {
        title: 'Jadwal Kegiatan',
        description: 'Kelola jadwal & agenda',
        icon: LuCalendar,
        path: `${basePath}/jadwal-kegiatan`,
        gradient: 'from-purple-500 to-pink-600',
        borderColor: 'border-purple-200',
        hoverColor: 'hover:border-purple-400'
      },
      {
        title: 'Produk Hukum',
        description: 'Kelola dokumen hukum',
        icon: LuFileText,
        path: `${basePath}/produk-hukum`,
        gradient: 'from-blue-500 to-cyan-600',
        borderColor: 'border-blue-200',
        hoverColor: 'hover:border-blue-400'
      },
      {
        title: 'Disposisi Surat',
        description: 'Kelola surat masuk',
        icon: LuFolderOpen,
        path: `${basePath}/disposisi`,
        gradient: 'from-teal-500 to-green-600',
        borderColor: 'border-teal-200',
        hoverColor: 'hover:border-teal-400'
      }
    ];

    // Bidang-specific additional menus
    const bidangSpecificMenus = {
      2: [ // Sekretariat
        {
          title: 'Perjalanan Dinas',
          description: 'Kelola perjadin',
          icon: LuTrendingUp,
          path: `${basePath}/perjadin`,
          gradient: 'from-green-500 to-emerald-600',
          borderColor: 'border-green-200',
          hoverColor: 'hover:border-green-400'
        }
      ],
      3: [ // SPKED
        {
          title: 'BUMDes',
          description: 'Kelola BUMDes',
          icon: LuTrendingUp,
          path: `${basePath}/bumdes`,
          gradient: 'from-amber-500 to-orange-600',
          borderColor: 'border-amber-200',
          hoverColor: 'hover:border-amber-400'
        }
      ],
      5: [ // PMD
        {
          title: 'Kelembagaan',
          description: 'Data kelembagaan desa',
          icon: LuTrendingUp,
          path: `${basePath}/kelembagaan`,
          gradient: 'from-violet-500 to-purple-600',
          borderColor: 'border-violet-200',
          hoverColor: 'hover:border-violet-400'
        }
      ]
    };

    // Merge common menus with bidang-specific menus
    const specificMenus = bidangSpecificMenus[user.bidang_id] || [];
    return [...commonMenus, ...specificMenus];
  };

  const bidangMenus = getBidangMenus();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const getPriorityColor = (prioritas) => {
    const colors = {
      urgent: 'bg-red-500',
      tinggi: 'bg-orange-500',
      sedang: 'bg-yellow-500',
      rendah: 'bg-green-500'
    };
    return colors[prioritas] || colors.sedang;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-24">
      {/* Header dengan Gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600"></div>
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)'
        }}></div>
        
        <div className="relative px-4 sm:px-6 py-8 sm:py-10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              {/* Avatar with Image or Initials */}
              {user.avatar ? (
                <img 
                  src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}${user.avatar}`}
                  alt={user.name}
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl object-cover shadow-lg border-2 border-white/50"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white/50 ${user.avatar ? 'hidden' : ''}`}>
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  {user.name?.charAt(0) || 'K'}
                </span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {user.name || 'Ketua Tim'}
                </h1>
                <p className="text-teal-100 text-sm">
                  {getBidangName()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-4">
        {/* Stats Cards - Modern Design */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`relative bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${stat.shadow}`}
              >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-bl-full`}></div>
                <Icon className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${stat.gradient} text-white p-2 rounded-xl sm:rounded-2xl mb-3`} />
                <p className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">{stat.value}</p>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">{stat.title}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          <button
            onClick={() => navigate('/ketua-tim/jadwal-kegiatan')}
            className="group relative overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full"></div>
            <LuCalendar className="w-10 h-10 sm:w-12 sm:h-12 mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="font-bold text-base sm:text-lg mb-1">Jadwal Kegiatan</h3>
            <p className="text-xs sm:text-sm text-teal-100">Kelola jadwal tim</p>
          </button>

          <button
            onClick={() => navigate('/ketua-tim/disposisi')}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full"></div>
            <LuClipboardList className="w-10 h-10 sm:w-12 sm:h-12 mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="font-bold text-base sm:text-lg mb-1">Disposisi</h3>
            <p className="text-xs sm:text-sm text-blue-100">Lihat disposisi surat</p>
          </button>
        </div>

        {/* Kegiatan Mendatang */}
        <div className="bg-white rounded-3xl shadow-lg p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Kegiatan Mendatang</h2>
              <p className="text-sm text-gray-500 mt-0.5">Jadwal kegiatan dalam waktu dekat</p>
            </div>
            <button
              onClick={() => navigate('/ketua-tim/jadwal-kegiatan')}
              className="text-teal-600 hover:text-teal-700 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all"
            >
              Semua
              <LuArrowRight className="w-4 h-4" />
            </button>
          </div>

          {upcomingJadwal.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LuCalendar className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Tidak ada kegiatan mendatang</p>
              <p className="text-sm text-gray-400 mt-1">Jadwal kegiatan akan muncul di sini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingJadwal.map((jadwal) => (
                <div
                  key={jadwal.id}
                  onClick={() => navigate('/ketua-tim/jadwal-kegiatan')}
                  className="group relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all duration-300 cursor-pointer"
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <LuCalendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm sm:text-base mb-1 group-hover:text-teal-600 transition-colors">
                        {jadwal.judul}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-1">
                        📍 {jadwal.lokasi || 'Lokasi belum ditentukan'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                          <LuClock className="w-3 h-3" />
                          {formatDate(jadwal.tanggal_mulai)}
                        </span>
                        <span className={`inline-block w-2 h-2 rounded-full ${getPriorityColor(jadwal.prioritas)}`}></span>
                        <span className="text-xs font-medium text-gray-700 capitalize">
                          {jadwal.prioritas}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KetuaTimDashboard;
