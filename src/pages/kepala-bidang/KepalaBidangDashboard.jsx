// src/pages/kepala-bidang/KepalaBidangDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';

const KepalaBidangDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statistik, setStatistik] = useState(null);
  const [recentDisposisi, setRecentDisposisi] = useState([]);

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-4 sm:p-6 text-white">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Selamat Datang, Kepala Bidang</h2>
        <p className="text-blue-100">DPMD Kabupaten Bogor</p>
        <p className="text-sm text-blue-200 mt-1">
          {new Date().toLocaleDateString('id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Disposisi Pending</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {statistik?.masuk?.pending || 0}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Sedang Diproses</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {(statistik?.masuk?.dibaca || 0) + (statistik?.masuk?.proses || 0)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Selesai</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {statistik?.masuk?.selesai || 0}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Disposisi</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {statistik?.masuk?.total || 0}
              </p>
            </div>
            <div className="bg-gray-100 p-3 rounded-full">
              <FileText className="text-gray-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <button
          onClick={() => navigate('/kepala-bidang/disposisi')}
          className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow text-left">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <FileText className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Lihat Disposisi</h3>
              <p className="text-sm text-gray-500">Kelola surat masuk</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/core-dashboard/dashboard')}
          className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow text-left">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Core Dashboard</h3>
              <p className="text-sm text-gray-500">Statistik & laporan</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/kepala-bidang/disposisi?filter=pending')}
          className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-4">
            <div className="bg-yellow-100 p-3 rounded-full">
              <AlertCircle className="text-yellow-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Pending Action</h3>
              <p className="text-sm text-gray-500">Butuh tindakan segera</p>
            </div>
          </div>
        </button>
      </div>

      {/* Recent Disposisi */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Disposisi Terbaru</h3>
            <button
              onClick={() => navigate('/kepala-bidang/disposisi')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Lihat Semua →
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {recentDisposisi.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500">Tidak ada disposisi terbaru</p>
            </div>
          ) : (
            recentDisposisi.map((disposisi) => (
              <div
                key={disposisi.id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/kepala-bidang/disposisi/${disposisi.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(disposisi.status)}`}>
                        {disposisi.status}
                      </span>
                      {disposisi.instruksi && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          {disposisi.instruksi}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {disposisi.surat?.perihal || 'Tanpa Perihal'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-1">
                      Dari: <span className="font-medium">{disposisi.dari_user?.name || 'Unknown'}</span>
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={14} />
                      {formatTanggal(disposisi.tanggal_disposisi)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default KepalaBidangDashboard;
