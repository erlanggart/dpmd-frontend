// src/pages/kkd/bhprd/BhprdT2.jsx - BHPRD Tahap 2
import React, { useState, useEffect } from 'react';
import { 
  FiDollarSign, FiMapPin, FiUsers, FiCheckCircle, 
  FiClock, FiTrendingUp, FiFilter, FiDownload,
  FiSearch, FiChevronDown, FiChevronUp,
  FiUpload, FiRefreshCw, FiInfo, FiX
} from 'react-icons/fi';
import { Activity } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../../api';
import { isVpnUser } from '../../../utils/vpnHelper';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const BhprdT2 = () => {
  const [loading, setLoading] = useState(true);
  const [kegiatanData, setKegiatanData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [stats, setStats] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('kecamatan');
  const [groupByKecamatan, setGroupByKecamatan] = useState(true);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);

  useEffect(() => {
    fetchBhprdData();
    fetchFileInfo();
  }, []);

  useEffect(() => {
    filterAndSortData();
    setCurrentPage(1);
  }, [kegiatanData, filterStatus, searchTerm, sortBy]);

  const fetchFileInfo = async () => {
    try {
      const endpoint = isVpnUser() ? '/vpn-core/bhprd-t2/info' : '/bhprd-t2/info';
      const response = await api.get(endpoint);
      if (response.data.success) {
        setFileInfo(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching file info:', error);
    }
  };

  const fetchBhprdData = async () => {
    try {
      setLoading(true);
      const endpoint = isVpnUser() ? '/vpn-core/bhprd-t2/data' : '/bhprd-t2/data';
      const response = await api.get(endpoint);
      const data = response.data.data;
      
      // BHPRD workflow: 1 record per desa, mixed status (Dana Telah Dicairkan / Belum Mengajukan)
      const processedData = data.map(item => ({
        kecamatan: item.kecamatan,
        desa: item.desa,
        status: item.sts,
        realisasi: parseInt(item.Realisasi.replace(/,/g, ''))
      }));

      const uniqueKecamatans = [...new Set(processedData.map(d => d.kecamatan))];
      const totalDesa = processedData.length;
      const totalRealisasi = processedData.reduce((sum, d) => sum + d.realisasi, 0);

      // Status breakdown
      const statusCount = {};
      processedData.forEach(item => {
        statusCount[item.status] = (statusCount[item.status] || 0) + 1;
      });

      setStats({
        totalKecamatan: uniqueKecamatans.length,
        totalDesa,
        totalRealisasi,
        statusCount,
        avgRealisasiPerDesa: totalRealisasi / totalDesa,
        desaCair: statusCount['Dana Telah Dicairkan'] || 0,
        desaBelumCair: statusCount['Belum Mengajukan'] || 0
      });
      
      setKegiatanData(processedData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading BHPRD data:', error);
      toast.error('Gagal memuat data BHPRD');
      setLoading(false);
    }
  };

  const filterAndSortData = () => {
    let filtered = [...kegiatanData];

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.desa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kecamatan.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'kecamatan':
          return a.kecamatan.localeCompare(b.kecamatan) || a.desa.localeCompare(b.desa);
        case 'desa':
          return a.desa.localeCompare(b.desa);
        case 'realisasi':
          return b.realisasi - a.realisasi;
        default:
          return 0;
      }
    });

    setFilteredData(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Belum Mengajukan': 'bg-gray-100 text-gray-800 border-gray-200',
      'Sudah Mengajukan': 'bg-blue-100 text-blue-800 border-blue-200',
      'Dana Telah Dicairkan': 'bg-green-100 text-green-800 border-green-200',
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${styles[status] || styles['Belum Mengajukan']}`}>
        {status}
      </span>
    );
  };

  const exportToExcel = () => {
    try {
      const summaryData = [
        ['LAPORAN BAGI HASIL PAJAK RETRIBUSI DAERAH (BHPRD) 2025'],
        ['Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor'],
        [''],
        ['Ringkasan Statistik:'],
        ['Total Kecamatan', stats.totalKecamatan],
        ['Total Desa', stats.totalDesa],
        ['Total Realisasi', formatCurrency(stats.totalRealisasi)],
        ['Rata-rata per Desa', formatCurrency(stats.avgRealisasiPerDesa)],
        ['Desa Sudah Cair', stats.desaCair],
        ['Desa Belum Cair', stats.desaBelumCair],
        [''],
        ['Detail Data per Desa:'],
        ['No', 'Kecamatan', 'Desa', 'Status', 'Realisasi Dana']
      ];

      const dataRows = filteredData.map((item, index) => [
        index + 1,
        item.kecamatan,
        item.desa,
        item.status,
        item.realisasi
      ]);

      const finalData = [...summaryData, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(finalData);

      ws['!cols'] = [
        { wch: 5 },
        { wch: 20 },
        { wch: 25 },
        { wch: 25 },
        { wch: 18 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan BHPRD 2025');
      
      const fileName = `Laporan_BHPRD_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('Data berhasil diekspor ke Excel');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/json') {
        toast.error('File harus berformat JSON');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await api.post('/bhprd-t2/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowUploadModal(false);
        setUploadFile(null);
        fetchBhprdData();
        fetchFileInfo();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Gagal mengupload file');
    } finally {
      setUploading(false);
    }
  };

  const groupedData = groupByKecamatan
    ? filteredData.reduce((acc, item) => {
        if (!acc[item.kecamatan]) {
          acc[item.kecamatan] = [];
        }
        acc[item.kecamatan].push(item);
        return acc;
      }, {})
    : null;

  const paginatedData = groupByKecamatan
    ? Object.entries(groupedData || {}).slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  const totalPages = Math.ceil(
    (groupByKecamatan ? Object.keys(groupedData || {}).length : filteredData.length) / itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FiDollarSign className="text-green-600" />
          BHPRD Tahap 2
        </h1>
        <p className="text-gray-600 mt-2">
          Data realisasi BHPRD Tahap 2 untuk desa
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Desa</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalDesa}</p>
            </div>
            <FiMapPin className="text-4xl text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Realisasi</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(stats.totalRealisasi)}
              </p>
            </div>
            <FiDollarSign className="text-4xl text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Dana Sudah Cair</p>
              <p className="text-3xl font-bold text-green-600">{stats.desaCair}</p>
              <p className="text-xs text-gray-500">desa</p>
            </div>
            <FiCheckCircle className="text-4xl text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Belum Dicairkan</p>
              <p className="text-3xl font-bold text-gray-600">{stats.desaBelumCair}</p>
              <p className="text-xs text-gray-500">desa</p>
            </div>
            <FiClock className="text-4xl text-gray-500" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FiUpload /> Update Data
          </button>
          
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiDownload /> Export Excel
          </button>
        </div>

        {fileInfo && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FiInfo className="text-green-500" />
            <span>
              Terakhir diupdate: {new Date(fileInfo.lastModified).toLocaleDateString('id-ID')}
            </span>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Cari desa atau kecamatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">Semua Status</option>
            <option value="Dana Telah Dicairkan">Dana Telah Dicairkan</option>
            <option value="Belum Mengajukan">Belum Mengajukan</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="kecamatan">Urutkan: Kecamatan</option>
            <option value="desa">Urutkan: Desa</option>
            <option value="realisasi">Urutkan: Realisasi Terbesar</option>
          </select>

          <button
            onClick={() => setGroupByKecamatan(!groupByKecamatan)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              groupByKecamatan
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiFilter />
            {groupByKecamatan ? 'Tampilan: Group' : 'Tampilan: List'}
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-600 to-green-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left">No</th>
                <th className="px-6 py-4 text-left">Kecamatan</th>
                <th className="px-6 py-4 text-left">Desa</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-right">Realisasi Dana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {groupByKecamatan ? (
                paginatedData.map(([kecamatan, items], kecIndex) => {
                  const isExpanded = expandedKecamatan[kecamatan];
                  return (
                    <React.Fragment key={kecamatan}>
                      <tr 
                        className="bg-gray-50 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setExpandedKecamatan(prev => ({
                          ...prev,
                          [kecamatan]: !prev[kecamatan]
                        }))}
                      >
                        <td className="px-6 py-4 font-semibold" colSpan="5">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                            <FiMapPin className="text-green-600" />
                            <span>{kecamatan}</span>
                            <span className="text-sm text-gray-600">({items.length} desa)</span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && items.map((item, index) => (
                        <tr key={`${item.desa}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4">{index + 1}</td>
                          <td className="px-6 py-4 text-gray-500">↳ {kecamatan}</td>
                          <td className="px-6 py-4 font-medium">{item.desa}</td>
                          <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                          <td className="px-6 py-4 text-right font-semibold text-green-600">
                            {formatCurrency(item.realisasi)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              ) : (
                paginatedData.map((item, index) => (
                  <tr key={`${item.desa}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-6 py-4">{item.kecamatan}</td>
                    <td className="px-6 py-4 font-medium">{item.desa}</td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">
                      {formatCurrency(item.realisasi)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
            <div className="text-sm text-gray-600">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Update Data BHPRD</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih File JSON
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              {uploadFile && (
                <p className="mt-2 text-sm text-gray-600">
                  File dipilih: {uploadFile.name}
                </p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Perhatian:</strong> File lama akan dibackup otomatis sebelum diganti.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FiUpload />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BhprdT2;
