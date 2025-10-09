import React, { useState, useEffect } from 'react';
import { 
  FiDownload, 
  FiEye, 
  FiSearch, 
  FiFilter, 
  FiRefreshCw,
  FiFileText,
  FiAlertCircle,
  FiCheck,
  FiX
} from 'react-icons/fi';

const LaporanKeuanganDashboard = () => {
  const [laporanData, setLaporanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchLaporanKeuangan = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/bumdes/laporan-keuangan');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      if (result.status === 'success') {
        setLaporanData(result.data);
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching laporan keuangan:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaporanKeuangan();
  }, []);

  const filteredData = laporanData.filter(item => {
    const matchesSearch = 
      item.bumdes_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kecamatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.filename?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || item.document_type === filterType;
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'available' && item.file_exists) ||
      (filterStatus === 'missing' && !item.file_exists) ||
      (filterStatus === 'unlinked' && item.document_type === 'unlinked');

    return matchesSearch && matchesType && matchesStatus;
  });

  const getDocumentTypeLabel = (type) => {
    const labels = {
      LaporanKeuangan2021: '2021',
      LaporanKeuangan2022: '2022',
      LaporanKeuangan2023: '2023',
      LaporanKeuangan2024: '2024',
      unlinked: 'Tidak Terhubung'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (item) => {
    if (item.document_type === 'unlinked') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          <FiAlertCircle className="w-3 h-3" />
          Tidak Terhubung
        </span>
      );
    }
    
    if (item.file_exists) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          <FiCheck className="w-3 h-3" />
          Tersedia
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
          <FiX className="w-3 h-3" />
          Hilang
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl p-8 text-center">
            <FiRefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="text-gray-600">Memuat data laporan keuangan...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl p-8 text-center">
            <FiAlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchLaporanKeuangan}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FiFileText className="text-blue-600" />
                Laporan Keuangan BUMDes
              </h1>
              <p className="text-gray-600 mt-1">
                Kelola dan pantau file laporan keuangan dari semua BUMDes
              </p>
            </div>
            <button
              onClick={fetchLaporanKeuangan}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiSearch className="inline w-4 h-4 mr-1" />
                Cari
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama BUMDes, desa, atau file..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter by Document Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiFilter className="inline w-4 h-4 mr-1" />
                Filter Tahun
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Semua Tahun</option>
                <option value="LaporanKeuangan2021">2021</option>
                <option value="LaporanKeuangan2022">2022</option>
                <option value="LaporanKeuangan2023">2023</option>
                <option value="LaporanKeuangan2024">2024</option>
                <option value="unlinked">Tidak Terhubung</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status File
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Semua Status</option>
                <option value="available">Tersedia</option>
                <option value="missing">Hilang</option>
                <option value="unlinked">Tidak Terhubung</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-2xl p-6 border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredData.length}</div>
              <div className="text-sm text-gray-600">Total File</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredData.filter(item => item.file_exists).length}
              </div>
              <div className="text-sm text-gray-600">Tersedia</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredData.filter(item => !item.file_exists).length}
              </div>
              <div className="text-sm text-gray-600">Hilang</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredData.filter(item => item.document_type === 'unlinked').length}
              </div>
              <div className="text-sm text-gray-600">Tidak Terhubung</div>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BUMDes
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tahun
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.bumdes_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.desa && item.kecamatan ? `${item.desa}, ${item.kecamatan}` : 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getDocumentTypeLabel(item.document_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={item.filename}>
                          {item.filename}
                        </div>
                        {item.file_size_formatted && (
                          <div className="text-sm text-gray-500">
                            {item.file_size_formatted} • {item.last_modified}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {item.file_exists && item.download_url && (
                          <>
                            <button
                              onClick={() => window.open(item.download_url, '_blank')}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg transition-colors"
                              title="Lihat file"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = item.download_url;
                                link.download = item.filename;
                                link.click();
                              }}
                              className="bg-green-50 hover:bg-green-100 text-green-600 p-2 rounded-lg transition-colors"
                              title="Download file"
                            >
                              <FiDownload className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {!item.file_exists && (
                          <span className="text-gray-400 text-sm">File tidak tersedia</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="p-8 text-center">
              <FiFileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
              <p className="text-gray-500">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Tidak ditemukan data sesuai filter'
                  : 'Belum ada laporan keuangan yang tersedia'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaporanKeuanganDashboard;
