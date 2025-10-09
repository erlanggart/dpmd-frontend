import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  ChartBarIcon,
  ArrowLeftIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  HomeIcon,
  BuildingOfficeIcon,
  FolderIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../api';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import AdminLoginModal from '../components/AdminLoginModal';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const MusdesusStatsPage = () => {
  const [stats, setStats] = useState(null);
  const [filesList, setFilesList] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [selectedDesa, setSelectedDesa] = useState('');
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    fileId: null,
    fileName: '',
    loading: false
  });
  const [adminModal, setAdminModal] = useState({
    isOpen: false,
    pendingDeleteId: null,
    pendingDeleteName: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterFiles();
  }, [filesList, selectedKecamatan, selectedDesa]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load statistics, file list, dan kecamatan bersamaan
      const [statsResponse, filesResponse, kecamatanResponse] = await Promise.all([
        api.get('/public/musdesus/stats'),
        api.get('/public/musdesus/files'),
        api.get('/musdesus/kecamatan')
      ]);
      
      setStats(statsResponse.data.data);
      setFilesList(filesResponse.data.data || []);
      setKecamatanList(kecamatanResponse.data.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data musdesus');
      setStats(null);
      setFilesList([]);
      setKecamatanList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDesa = async (kecamatanId) => {
    if (!kecamatanId) {
      setDesaList([]);
      return;
    }
    
    try {
      const response = await api.get(`/musdesus/desa/${kecamatanId}`);
      setDesaList(response.data.data || []);
    } catch (error) {
      console.error('Error loading desa:', error);
      setDesaList([]);
    }
  };

  const filterFiles = () => {
    let filtered = filesList;
    
    if (selectedKecamatan) {
      filtered = filtered.filter(file => file.kecamatan_id == selectedKecamatan);
    }
    
    if (selectedDesa) {
      filtered = filtered.filter(file => file.desa_id == selectedDesa);
    }
    
    setFilteredFiles(filtered);
  };

  const handleKecamatanChange = async (kecamatanId) => {
    setSelectedKecamatan(kecamatanId);
    setSelectedDesa('');
    if (kecamatanId) {
      await loadDesa(kecamatanId);
    } else {
      setDesaList([]);
    }
  };

  const handleDownload = async (filename) => {
    try {
      window.open(`${api.defaults.baseURL.replace('/api', '')}/storage/musdesus/${filename}`, '_blank');
      toast.success('File dibuka di tab baru');
    } catch (error) {
      console.error('Error opening file:', error);
      toast.error('Gagal membuka file');
    }
  };

  const handleDelete = (fileId, fileName) => {
    // Check admin verification first
    if (!checkAdminVerification()) {
      setAdminModal({
        isOpen: true,
        pendingDeleteId: fileId,
        pendingDeleteName: fileName
      });
      return;
    }

    // Show delete confirmation
    setDeleteModal({
      isOpen: true,
      fileId: fileId,
      fileName: fileName,
      loading: false
    });
  };

  const checkAdminVerification = () => {
    const adminVerified = sessionStorage.getItem('admin_verified');
    const verificationTime = sessionStorage.getItem('admin_verification_time');
    
    if (!adminVerified || !verificationTime) {
      return false;
    }

    // Check if verification is still valid (15 minutes)
    const now = Date.now();
    const timeDiff = now - parseInt(verificationTime);
    const fifteenMinutes = 15 * 60 * 1000;

    if (timeDiff > fifteenMinutes) {
      // Clear expired verification
      sessionStorage.removeItem('admin_verified');
      sessionStorage.removeItem('admin_verification_time');
      return false;
    }

    return true;
  };

  const handleAdminLoginSuccess = (data) => {
    toast.success('Verifikasi admin berhasil!');
    // Proceed with delete
    setDeleteModal({
      isOpen: true,
      fileId: adminModal.pendingDeleteId,
      fileName: adminModal.pendingDeleteName,
      loading: false
    });
  };

  const handleConfirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, loading: true }));

    try {
      const response = await api.delete(`/public/musdesus/${deleteModal.fileId}`);
      
      if (response.data.success) {
        toast.success(response.data.message || 'File berhasil dihapus');
        // Reload data untuk update tampilan
        loadData();
        setDeleteModal({ isOpen: false, fileId: null, fileName: '', loading: false });
      } else {
        toast.error(response.data.message || 'Gagal menghapus file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      if (error.response?.status === 401) {
        toast.error('Sesi admin telah berakhir. Silakan verifikasi ulang.');
        sessionStorage.removeItem('admin_verified');
        sessionStorage.removeItem('admin_verification_time');
        setDeleteModal({ isOpen: false, fileId: null, fileName: '', loading: false });
        setAdminModal({
          isOpen: true,
          pendingDeleteId: deleteModal.fileId,
          pendingDeleteName: deleteModal.fileName
        });
      } else if (error.response?.status === 403) {
        toast.error('Akses ditolak. Anda tidak memiliki hak admin.');
      } else {
        toast.error('Gagal menghapus file');
      }
    } finally {
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Chart options dengan warna gelap dan label yang jelas
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#1f2937',
          font: {
            size: 14,
            weight: 'bold'
          },
          padding: 20
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#e5e7eb',
        borderColor: '#374151',
        borderWidth: 2,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 12 }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold'
          },
          maxRotation: 45
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.3)',
          lineWidth: 1
        }
      },
      y: {
        ticks: {
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.3)',
          lineWidth: 1
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#1f2937',
          font: {
            size: 14,
            weight: 'bold'
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#e5e7eb',
        borderColor: '#374151',
        borderWidth: 2,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 12 }
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-800 text-xl">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <p className="text-gray-800 text-xl mb-4">Gagal memuat data</p>
          <button
            onClick={loadData}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data dengan warna gelap dan informasi yang jelas
  const kecamatanUploadData = {
    labels: stats.kecamatan_stats.slice(0, 10).map(item => 
      item.nama.length > 15 ? item.nama.substring(0, 15) + '...' : item.nama
    ),
    datasets: [
      {
        label: 'Desa yang Upload',
        data: stats.kecamatan_stats.slice(0, 10).map(item => item.desa_upload),
        backgroundColor: '#1f2937',
        borderColor: '#111827',
        borderWidth: 2
      }
    ]
  };

  const fileTypeData = {
    labels: stats.file_type_stats.map(item => item.file_type),
    datasets: [
      {
        data: stats.file_type_stats.map(item => item.count),
        backgroundColor: [
          '#1f2937', // Gray-800
          '#374151', // Gray-700
          '#4b5563', // Gray-600
          '#6b7280'  // Gray-500
        ],
        borderColor: [
          '#111827', // Gray-900
          '#1f2937', // Gray-800
          '#374151', // Gray-700
          '#4b5563'  // Gray-600
        ],
        borderWidth: 3
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors mb-4"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Data Upload Musdesus
            </h1>
            <p className="text-gray-600 text-lg">
              Kabupaten Bogor
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-gray-600 text-sm">Total File</div>
              <div className="text-2xl lg:text-3xl font-bold text-gray-900">{stats.summary.total_files}</div>
              <div className="text-gray-500 text-xs mt-1">
                {stats.summary.total_size_mb} MB
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
          <h3 className="text-gray-900 text-lg font-semibold mb-4">Filter Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kecamatan Filter */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                <BuildingOfficeIcon className="w-4 h-4 inline mr-2" />
                Pilih Kecamatan
              </label>
              <select
                value={selectedKecamatan}
                onChange={(e) => handleKecamatanChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="">Semua Kecamatan</option>
                {kecamatanList.map((kec) => (
                  <option key={kec.id} value={kec.id}>
                    {kec.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Desa Filter */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                <HomeIcon className="w-4 h-4 inline mr-2" />
                Pilih Desa/Kelurahan
              </label>
              <select
                value={selectedDesa}
                onChange={(e) => setSelectedDesa(e.target.value)}
                disabled={!selectedKecamatan}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">Semua Desa</option>
                {desaList.map((desa) => (
                  <option key={desa.id} value={desa.id}>
                    {desa.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {(selectedKecamatan || selectedDesa) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>Filter Aktif:</strong> Menampilkan {filteredFiles.length} file
                {selectedKecamatan && ` dari ${kecamatanList.find(k => k.id == selectedKecamatan)?.nama}`}
                {selectedDesa && ` - ${desaList.find(d => d.id == selectedDesa)?.nama}`}
              </p>
            </div>
          )}
        </div>

        {/* Charts - Responsive Grid */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          {/* Kecamatan Upload Table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-gray-900 text-xl font-bold mb-4 flex items-center gap-2">
              <ChartBarIcon className="w-6 h-6" />
              Data Upload per Kecamatan
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Daftar kecamatan yang sudah mengupload
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Kecamatan</th>
                    <th className="px-6 py-3 text-center font-medium text-gray-700">Desa Upload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.kecamatan_stats.filter(item => item.desa_upload > 0).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.nama}</td>
                      <td className="px-6 py-4 text-center text-blue-600 font-bold text-lg">{item.desa_upload}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Desa Upload Chart */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-gray-900 text-xl font-bold mb-4 flex items-center gap-2">
                <ChartBarIcon className="w-6 h-6" />
                Top 10 Kecamatan yang Upload
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Kecamatan dengan desa upload terbanyak
              </p>
              <div className="h-80 lg:h-96">
                <Bar data={kecamatanUploadData} options={chartOptions} />
              </div>
            </div>

            {/* File Type Distribution Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-gray-900 text-xl font-bold mb-4 flex items-center gap-2">
                <ChartBarIcon className="w-6 h-6" />
                Jenis File
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Distribusi berdasarkan tipe file
              </p>
              <div className="h-80 lg:h-96">
                <Doughnut data={fileTypeData} options={doughnutOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Files List */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h3 className="text-gray-900 text-xl font-bold">
              Daftar File Upload
              {(selectedKecamatan || selectedDesa) && (
                <span className="text-base font-normal text-gray-600 ml-2">
                  ({filteredFiles.length} file)
                </span>
              )}
            </h3>
            {(selectedKecamatan || selectedDesa) && (
              <button
                onClick={() => {
                  setSelectedKecamatan('');
                  setSelectedDesa('');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>

          {filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">
                {(selectedKecamatan || selectedDesa) 
                  ? 'Tidak ada file yang sesuai dengan filter'
                  : 'Belum ada file yang diupload'
                }
              </p>
              {(selectedKecamatan || selectedDesa) && (
                <p className="text-gray-500 text-sm">
                  Coba ubah filter atau reset untuk melihat semua file
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kecamatan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desa</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="text-2xl mr-3">
                              {file.nama_file.toLowerCase().includes('.pdf') ? '📄' : '📋'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {file.nama_file.length > 40 ? file.nama_file.substring(0, 40) + '...' : file.nama_file}
                              </div>
                              <div className="text-sm text-gray-500">{file.nama_pengupload}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {file.kecamatan?.nama || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {file.desa?.nama || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(file.tanggal_musdesus || file.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => handleDownload(file.nama_file)}
                              className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                              title="Lihat File"
                            >
                              <EyeIcon className="w-4 h-4" />
                              Lihat
                            </button>
                            <button
                              onClick={() => handleDelete(file.id, file.nama_file)}
                              className="inline-flex items-center gap-1 text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                              title="Hapus File"
                            >
                              <TrashIcon className="w-4 h-4" />
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredFiles.map((file) => (
                  <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="text-2xl">
                        {file.nama_file.toLowerCase().includes('.pdf') ? '📄' : '📋'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm leading-tight mb-1">
                          {file.nama_file}
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">{file.nama_pengupload}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Kecamatan:</span><br />
                            {file.kecamatan?.nama || '-'}
                          </div>
                          <div>
                            <span className="font-medium">Desa:</span><br />
                            {file.desa?.nama || '-'}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {formatDate(file.tanggal_musdesus || file.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(file.nama_file)}
                        className="flex-1 inline-flex items-center justify-center gap-2 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-md transition-colors text-sm"
                      >
                        <EyeIcon className="w-4 h-4" />
                        Lihat
                      </button>
                      <button
                        onClick={() => handleDelete(file.id, file.nama_file)}
                        className="flex-1 inline-flex items-center justify-center gap-2 text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-md transition-colors text-sm"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusdesusStatsPage;