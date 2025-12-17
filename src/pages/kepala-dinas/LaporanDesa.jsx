import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiSearch, FiFilter, FiDownload, FiFileText, FiCalendar, FiMapPin, FiCheckCircle, FiAlertCircle, FiX, FiEye, FiUser, FiClock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const LaporanDesa = () => {
  const [laporan, setLaporan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0
  });

  // Filter states
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 20,
    id_kelurahan: '',
    id_jenis_laporan: '',
    tahun_kegiatan: new Date().getFullYear(),
    status_laporan: '',
    transparansi_laporan: '',
    q: ''
  });

  // Master data
  const [jenisLaporan, setJenisLaporan] = useState([]);
  const [kelurahan, setKelurahan] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Detail modal
  const [selectedLaporan, setSelectedLaporan] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const API_BASE_URL = 'https://dpmd.bogorkab.go.id/laporan_kab_bogor/api';
  const API_KEY = import.meta.env.VITE_LAPORAN_API_KEY || 'SECRET-KEY';

  const fetchJenisLaporan = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/jenis-laporan`, {
        headers: { 'X-API-KEY': API_KEY }
      });
      if (response.data.status) {
        setJenisLaporan(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching jenis laporan:', error);
    }
  };

  const fetchKelurahan = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/kelurahan`, {
        headers: { 'X-API-KEY': API_KEY }
      });
      if (response.data.status) {
        setKelurahan(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching kelurahan:', error);
    }
  };

  // Fetch master data on mount
  useEffect(() => {
    fetchJenisLaporan();
    fetchKelurahan();
    fetchLaporan(); // Load data on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLaporan = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== '' && filters[key] !== null) {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`${API_BASE_URL}/laporan?${params.toString()}`, {
        headers: { 'X-API-KEY': API_KEY }
      });

      if (response.data.status) {
        setLaporan(response.data.data || []);
        setPagination(response.data.pagination || {});
      } else {
        toast.error(response.data.message || 'Gagal mengambil data laporan');
      }
    } catch (error) {
      console.error('Error fetching laporan:', error);
      toast.error('Gagal mengambil data laporan');
    } finally {
      setLoading(false);
    }
  };

  // Fetch laporan when filters change
  useEffect(() => {
    fetchLaporan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filter changes
    }));
  };

  const handleSearch = () => {
    fetchLaporan();
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      per_page: 20,
      id_kelurahan: '',
      id_jenis_laporan: '',
      tahun_kegiatan: new Date().getFullYear(),
      status_laporan: '',
      transparansi_laporan: '',
      q: ''
    });
    setTimeout(() => fetchLaporan(), 100);
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const fetchLaporanDetail = async (idLaporan) => {
    setLoadingDetail(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/laporan/${idLaporan}`, {
        headers: { 'X-API-KEY': API_KEY }
      });

      if (response.data.status) {
        setSelectedLaporan(response.data.data);
        setShowDetailModal(true);
      } else {
        toast.error(response.data.message || 'Gagal mengambil detail laporan');
      }
    } catch (error) {
      console.error('Error fetching detail laporan:', error);
      toast.error('Gagal mengambil detail laporan');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedLaporan(null);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Terverifikasi': { bg: 'bg-green-100', text: 'text-green-800', icon: FiCheckCircle },
      'Belum Terverifikasi': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FiAlertCircle },
      'Ditolak': { bg: 'bg-red-100', text: 'text-red-800', icon: FiAlertCircle }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: FiAlertCircle };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  return (
    <>
      {/* Detail Modal */}
      {showDetailModal && selectedLaporan ? (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={handleCloseDetail}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full relative z-[10000]">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiFileText className="w-6 h-6" />
                    Detail Laporan
                  </h3>
                  <button
                    onClick={handleCloseDetail}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                {loadingDetail ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : selectedLaporan ? (
                  <div className="space-y-6">
                    {/* Judul & Status */}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        {selectedLaporan?.judul_laporan || 'Judul tidak tersedia'}
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {getStatusBadge(selectedLaporan?.status_laporan || 'Belum Diverifikasi')}
                        {selectedLaporan.transparansi_laporan && (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedLaporan.transparansi_laporan === 'Terbuka' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedLaporan.transparansi_laporan}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Uraian */}
                    {selectedLaporan.uraian_laporan && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Uraian Laporan</h4>
                        <p className="text-gray-700 leading-relaxed">
                          {selectedLaporan.uraian_laporan}
                        </p>
                      </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <FiMapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Desa/Kelurahan</p>
                          <p className="font-semibold text-gray-900">{selectedLaporan.nama_kelurahan}</p>
                          {selectedLaporan.nama_kecamatan && (
                            <p className="text-sm text-gray-600">Kec. {selectedLaporan.nama_kecamatan}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <FiCalendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Tahun Kegiatan</p>
                          <p className="font-semibold text-gray-900">{selectedLaporan.tahun_kegiatan}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <FiFileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Jenis Laporan</p>
                          <p className="font-semibold text-gray-900">{selectedLaporan.jenis_laporan}</p>
                        </div>
                      </div>

                      {selectedLaporan.nama_bidang && (
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                          <FiUser className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-600">Bidang</p>
                            <p className="font-semibold text-gray-900">{selectedLaporan.nama_bidang}</p>
                          </div>
                        </div>
                      )}

                      {selectedLaporan.created_at && (
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                          <FiClock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-600">Tanggal Upload</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(selectedLaporan.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Files */}
                    {selectedLaporan.files && selectedLaporan.files.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FiDownload className="w-5 h-5" />
                          File Lampiran ({selectedLaporan.files.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedLaporan.files.map((file) => (
                            <a
                              key={file.id_file_laporan}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-md transition-all group"
                            >
                              <div className="p-2 bg-blue-600 rounded-lg">
                                <FiFileText className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                                  {file.nama_file}
                                </p>
                                <p className="text-xs text-gray-500">Klik untuk download</p>
                              </div>
                              <FiDownload className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Tidak ada data laporan</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={handleCloseDetail}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Laporan Desa</h1>
          <p className="mt-2 text-sm text-gray-600">
            Data laporan desa Kabupaten Bogor
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiFilter className="w-5 h-5" />
              Filter & Pencarian
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showFilters ? 'Sembunyikan' : 'Tampilkan'} Filter
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari judul atau uraian laporan..."
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Cari
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              {/* Jenis Laporan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Laporan
                </label>
                <select
                  value={filters.id_jenis_laporan}
                  onChange={(e) => handleFilterChange('id_jenis_laporan', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Semua Jenis</option>
                  {jenisLaporan.map((jenis) => (
                    <option key={jenis.id_jenis_laporan} value={jenis.id_jenis_laporan}>
                      {jenis.nama_jenis_laporan}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kelurahan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desa/Kelurahan
                </label>
                <select
                  value={filters.id_kelurahan}
                  onChange={(e) => handleFilterChange('id_kelurahan', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Semua Desa</option>
                  {kelurahan.map((desa) => (
                    <option key={desa.id_kelurahan} value={desa.id_kelurahan}>
                      {desa.nama_kelurahan} - {desa.nama_kecamatan}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tahun Kegiatan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tahun Kegiatan
                </label>
                <select
                  value={filters.tahun_kegiatan}
                  onChange={(e) => handleFilterChange('tahun_kegiatan', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[2025, 2024, 2023, 2022, 2021, 2020].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Status Laporan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Verifikasi
                </label>
                <select
                  value={filters.status_laporan}
                  onChange={(e) => handleFilterChange('status_laporan', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Semua Status</option>
                  <option value="Terverifikasi">Terverifikasi</option>
                  <option value="Belum Terverifikasi">Belum Terverifikasi</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>

              {/* Reset Button */}
              <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-2">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Reset Filter
                </button>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            Menampilkan <span className="font-semibold">{laporan.length}</span> dari{' '}
            <span className="font-semibold">{pagination.total}</span> laporan
          </p>
          <select
            value={filters.per_page}
            onChange={(e) => handleFilterChange('per_page', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="10">10 per halaman</option>
            <option value="20">20 per halaman</option>
            <option value="50">50 per halaman</option>
            <option value="100">100 per halaman</option>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Laporan List */}
        {!loading && laporan.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FiFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada laporan</h3>
            <p className="text-gray-600">Coba ubah filter atau kata kunci pencarian Anda</p>
          </div>
        )}

        {!loading && laporan.length > 0 && (
          <div className="space-y-4">
            {laporan.map((item) => (
              <div
                key={item.id_laporan}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <FiFileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {item.judul_laporan}
                        </h3>
                        {item.uraian_laporan && (
                          <p className="text-sm text-gray-600 mb-3">{item.uraian_laporan}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <FiMapPin className="w-4 h-4" />
                            <span>{item.nama_kelurahan}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FiCalendar className="w-4 h-4" />
                            <span>{item.tahun_kegiatan}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{item.jenis_laporan}</span>
                          </div>
                          {item.nama_bidang && (
                            <div className="flex items-center gap-1">
                              <span className="text-blue-600">{item.nama_bidang}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(item.status_laporan)}
                      {item.transparansi_laporan && (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.transparansi_laporan === 'Terbuka' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.transparansi_laporan}
                        </span>
                      )}
                      <button
                        onClick={() => fetchLaporanDetail(item.id_laporan)}
                        className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <FiEye className="w-4 h-4" />
                        Lihat Detail
                      </button>
                    </div>
                  </div>

                  {/* Files */}
                  {item.files && item.files.length > 0 && (
                    <div className="lg:w-64">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        File Lampiran ({item.files.length})
                      </p>
                      <div className="space-y-2">
                        {item.files.map((file) => (
                          <a
                            key={file.id_file_laporan}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                          >
                            <FiDownload className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                            <span className="text-sm text-gray-700 group-hover:text-blue-600 truncate flex-1">
                              {file.nama_file.substring(0, 30)}...
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.last_page > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <span className="text-sm text-gray-600">
              Halaman {pagination.current_page} dari {pagination.last_page}
            </span>
            <button
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default LaporanDesa;
