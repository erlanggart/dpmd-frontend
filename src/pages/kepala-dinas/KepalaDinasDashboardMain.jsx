// src/pages/kepala-dinas/KepalaDinasDashboardMain.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiFileText, FiBarChart2, FiUsers, FiTrendingUp, FiClock } from 'react-icons/fi';
import api from '../../api';
import { toast } from 'react-hot-toast';

const KepalaDinasDashboardMain = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    disposisi_pending: 0,
    surat_masuk_bulan_ini: 0,
    total_bumdes: 0,
    total_desa: 417
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // Fetch disposisi statistik
      const disposisiRes = await api.get('/disposisi/statistik');
      
      setStats(prev => ({
        ...prev,
        disposisi_pending: disposisiRes.data.data.masuk.pending || 0,
        disposisi_total: disposisiRes.data.data.masuk.total || 0
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Disposisi Surat',
      description: 'Lihat dan kelola disposisi surat masuk',
      icon: FiMail,
      link: '/kepala-dinas/disposisi',
      color: 'blue',
      badge: stats.disposisi_pending
    },
    {
      title: 'Core Dashboard',
      description: 'Lihat analitik dan statistik lengkap',
      icon: FiBarChart2,
      link: '/core-dashboard/dashboard',
      color: 'green'
    },
    {
      title: 'Manajemen User',
      description: 'Kelola pengguna sistem',
      icon: FiUsers,
      link: '/dashboard/user',
      color: 'purple'
    },
    {
      title: 'Berita & Informasi',
      description: 'Kelola konten landing page',
      icon: FiTrendingUp,
      link: '/dashboard/berita',
      color: 'amber'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
      purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
      amber: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg">
              <FiFileText className="text-white text-4xl" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Dashboard Kepala Dinas
              </h1>
              <p className="text-gray-600 text-lg mt-1">
                Selamat datang, {user.name || 'Kepala Dinas'}
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 mb-2">Dinas Pemberdayaan Masyarakat dan Desa</p>
                <h2 className="text-2xl font-bold">Kabupaten Bogor</h2>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-sm">Hari ini</p>
                <p className="text-xl font-semibold">
                  {new Date().toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 uppercase">
                Disposisi Pending
              </h3>
              <FiClock className="text-blue-500 text-2xl" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? '...' : stats.disposisi_pending}
            </p>
            <p className="text-xs text-gray-500 mt-2">Menunggu tindakan</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 uppercase">
                Total Disposisi
              </h3>
              <FiMail className="text-green-500 text-2xl" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? '...' : stats.disposisi_total}
            </p>
            <p className="text-xs text-gray-500 mt-2">Semua disposisi</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 uppercase">
                BUMDes Aktif
              </h3>
              <FiBarChart2 className="text-purple-500 text-2xl" />
            </div>
            <p className="text-3xl font-bold text-gray-900">350+</p>
            <p className="text-xs text-gray-500 mt-2">Di seluruh Kabupaten Bogor</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 uppercase">
                Total Desa
              </h3>
              <FiUsers className="text-amber-500 text-2xl" />
            </div>
            <p className="text-3xl font-bold text-gray-900">417</p>
            <p className="text-xs text-gray-500 mt-2">Desa/Kelurahan</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu Utama</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                className={`relative bg-gradient-to-r ${getColorClasses(action.color)} text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <action.icon className="text-4xl" />
                      <h3 className="text-xl font-bold">{action.title}</h3>
                    </div>
                    <p className="text-white/90 text-sm">{action.description}</p>
                  </div>
                  {action.badge > 0 && (
                    <div className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                      {action.badge}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Additional Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/kepala-dinas/statistik-add"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h3 className="font-semibold text-gray-900 mb-2">Statistik ADD</h3>
            <p className="text-sm text-gray-600">Alokasi Dana Desa</p>
          </Link>

          <Link
            to="/kepala-dinas/statistik-bhprd"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h3 className="font-semibold text-gray-900 mb-2">Statistik BHPRD</h3>
            <p className="text-sm text-gray-600">Bagi Hasil Pajak dan Retribusi</p>
          </Link>

          <Link
            to="/kepala-dinas/statistik-dd"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h3 className="font-semibold text-gray-900 mb-2">Statistik DD</h3>
            <p className="text-sm text-gray-600">Dana Desa</p>
          </Link>
        </div>

        {/* Info Footer */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FiFileText className="text-blue-600 text-2xl" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                Informasi Dashboard
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Dashboard ini menampilkan ringkasan aktivitas dan statistik terkini dari 
                Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor. Gunakan menu di atas 
                untuk mengakses informasi detail dan laporan lengkap.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KepalaDinasDashboardMain;
