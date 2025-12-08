// src/pages/public/CoreDashboardPublic.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiHome, FiBarChart2, FiTrendingUp, FiActivity } from 'react-icons/fi';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const CoreDashboardPublic = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPublicDashboardData();
  }, []);

  const fetchPublicDashboardData = async () => {
    try {
      setLoading(true);
      // Public endpoint - no authentication needed
      const response = await axios.get(`${API_CONFIG.BASE_URL}/public/dashboard`);
      
      console.log('Public Dashboard API Response:', response.data);
      setDashboardData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching public dashboard data:', err);
      setError(err.response?.data?.message || 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchPublicDashboardData}
              className="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* Header Navigation */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiActivity className="text-3xl text-slate-700" />
              <h1 className="text-2xl font-bold text-slate-800">Core Dashboard DPMD</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                <FiHome />
                Beranda
              </Link>
              <Link
                to="/login"
                className="bg-slate-700 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <FiBarChart2 className="text-5xl" />
            <div>
              <h2 className="text-3xl font-bold mb-2">Dashboard Statistik Publik</h2>
              <p className="text-slate-300 text-lg">
                Data dan statistik terkini dari Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 uppercase">Total Desa</h3>
              <div className="bg-blue-100 p-2 rounded-lg">
                <FiHome className="text-blue-600 text-xl" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">
              {dashboardData?.total_desa || '417'}
            </p>
            <p className="text-sm text-slate-500 mt-2">Desa se-Kabupaten Bogor</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 uppercase">BUMDes Aktif</h3>
              <div className="bg-green-100 p-2 rounded-lg">
                <FiTrendingUp className="text-green-600 text-xl" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">
              {dashboardData?.bumdes_aktif || '350+'}
            </p>
            <p className="text-sm text-slate-500 mt-2">Badan Usaha Milik Desa</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 uppercase">Kelembagaan Desa</h3>
              <div className="bg-purple-100 p-2 rounded-lg">
                <FiActivity className="text-purple-600 text-xl" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">
              {dashboardData?.kelembagaan || '2000+'}
            </p>
            <p className="text-sm text-slate-500 mt-2">RW, RT, LPM, PKK, dll</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 uppercase">Anggaran Tahun Ini</h3>
              <div className="bg-amber-100 p-2 rounded-lg">
                <FiBarChart2 className="text-amber-600 text-xl" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">
              {dashboardData?.anggaran || '1.5T'}
            </p>
            <p className="text-sm text-slate-500 mt-2">Dana Desa & ADD</p>
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
          <h3 className="text-2xl font-bold text-slate-800 mb-4">Tentang Dashboard</h3>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Core Dashboard DPMD Kabupaten Bogor menyediakan akses publik terhadap statistik dan 
            data pemberdayaan masyarakat dan desa. Dashboard ini menampilkan informasi terkini 
            mengenai BUMDes, kelembagaan desa, bantuan keuangan, dan program-program pemberdayaan 
            masyarakat.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="border-l-4 border-slate-600 pl-4">
              <h4 className="font-semibold text-slate-800 mb-2">Data Real-Time</h4>
              <p className="text-sm text-slate-600">
                Dashboard diperbarui secara berkala dengan data langsung dari sistem DPMD
              </p>
            </div>
            <div className="border-l-4 border-slate-600 pl-4">
              <h4 className="font-semibold text-slate-800 mb-2">Akses Publik</h4>
              <p className="text-sm text-slate-600">
                Informasi tersedia untuk umum tanpa perlu login atau registrasi
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-8 bg-gradient-to-r from-slate-600 to-slate-800 rounded-xl shadow-lg p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-3">Butuh Akses Lebih Lengkap?</h3>
          <p className="text-slate-200 mb-6 max-w-2xl mx-auto">
            Login untuk mengakses dashboard lengkap dengan fitur manajemen data, 
            disposisi surat, dan laporan detail
          </p>
          <Link
            to="/login"
            className="inline-block bg-white text-slate-800 px-8 py-3 rounded-lg hover:bg-slate-100 transition-colors font-semibold shadow-lg"
          >
            Login Sekarang
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-600 text-sm">
          <p>© 2025 Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor</p>
          <p className="mt-2">Data diperbarui: {new Date().toLocaleDateString('id-ID')}</p>
        </div>
      </div>
    </div>
  );
};

export default CoreDashboardPublic;
