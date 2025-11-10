import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Filter, Search, Download, Eye, Plus, Trash2, Edit } from 'lucide-react';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor untuk menambahkan token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('expressToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const LaporanDesa = () => {
  const [laporan, setLaporan] = useState([]);
  const [jenisLaporan, setJenisLaporan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    id_jenis_laporan: '',
    status_laporan: '',
    tahun_kegiatan: '',
    transparansi_laporan: ''
  });

  useEffect(() => {
    fetchJenisLaporan();
    fetchLaporan();
  }, [pagination.page, filters]);

  const fetchJenisLaporan = async () => {
    try {
      const response = await apiClient.get('/laporan-desa/jenis-laporan');
      setJenisLaporan(response.data.data);
    } catch (error) {
      console.error('Error fetching jenis laporan:', error);
    }
  };

  const fetchLaporan = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      };

      const response = await apiClient.get('/laporan-desa', { params });
      setLaporan(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching laporan:', error);
      alert('Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchLaporan();
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Valid': 'bg-green-100 text-green-800',
      'Belum Divalidasi': 'bg-yellow-100 text-yellow-800',
      'Tidak Valid': 'bg-red-100 text-red-800',
      'Tidak Perlu Validasi': 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-600" />
          Laporan Desa
        </h1>
        <p className="text-gray-600 mt-2">Sistem Pelaporan dan Dokumentasi Desa</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-700">Filter & Pencarian</h3>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Laporan</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari judul atau uraian..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Jenis Laporan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Laporan</label>
            <select
              value={filters.id_jenis_laporan}
              onChange={(e) => handleFilterChange('id_jenis_laporan', e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Semua Jenis</option>
              {jenisLaporan.map((jenis) => (
                <option key={jenis.id_jenis_laporan} value={jenis.id_jenis_laporan}>
                  {jenis.jenis_laporan}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status_laporan}
              onChange={(e) => handleFilterChange('status_laporan', e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="Valid">Valid</option>
              <option value="Belum Divalidasi">Belum Divalidasi</option>
              <option value="Tidak Valid">Tidak Valid</option>
              <option value="Tidak Perlu Validasi">Tidak Perlu Validasi</option>
            </select>
          </div>

          {/* Tahun */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Kegiatan</label>
            <input
              type="number"
              placeholder="2025"
              value={filters.tahun_kegiatan}
              onChange={(e) => handleFilterChange('tahun_kegiatan', e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Transparansi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transparansi</label>
            <select
              value={filters.transparansi_laporan}
              onChange={(e) => handleFilterChange('transparansi_laporan', e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Semua</option>
              <option value="Terbuka">Terbuka</option>
              <option value="Tertutup">Tertutup</option>
            </select>
          </div>

          {/* Submit */}
          <div className="md:col-span-2 flex items-end gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Cari
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters({
                  search: '',
                  id_jenis_laporan: '',
                  status_laporan: '',
                  tahun_kegiatan: '',
                  transparansi_laporan: ''
                });
                setPagination({ ...pagination, page: 1 });
              }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat data...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Judul Laporan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Jenis</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tahun</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">File</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {laporan.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                        Tidak ada data laporan
                      </td>
                    </tr>
                  ) : (
                    laporan.map((item, index) => (
                      <tr key={item.id_laporan} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {(pagination.page - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{item.judul_laporan}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{item.uraian_laporan}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="font-medium">{item.jenisLaporan?.jenis_laporan}</div>
                          <div className="text-xs text-gray-500">{item.jenisLaporan?.bidang?.nama}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.tahun_kegiatan}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(item.tgl_laporan).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(item.status_laporan)}</td>
                        <td className="px-4 py-3 text-sm">
                          {item.files?.length > 0 ? (
                            <span className="text-blue-600 font-medium">{item.files.length} file</span>
                          ) : (
                            <span className="text-gray-400">Tidak ada</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-800 transition"
                              title="Lihat Detail"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            {item.files?.length > 0 && (
                              <button
                                className="text-green-600 hover:text-green-800 transition"
                                title="Download"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Menampilkan <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> -{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  dari <span className="font-medium">{pagination.total}</span> data
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LaporanDesa;
