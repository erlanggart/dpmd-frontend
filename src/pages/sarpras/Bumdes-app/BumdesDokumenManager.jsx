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
  FiX,
  FiBarChart2,
  FiFile,
  FiTrash2,
  FiGrid,
  FiList,
  FiPackage,
  FiArchive,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiStar,
  FiInfo,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight
} from 'react-icons/fi';
import API_CONFIG from '../../../config/api';

const BumdesDokumenManager = () => {
  const [activeTab, setActiveTab] = useState('badan-hukum');
  const [dokumenBadanHukum, setDokumenBadanHukum] = useState([]);
  const [laporanKeuangan, setLaporanKeuangan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5); // Default 5 items per page
  
  // Location filters
  const [filterKecamatan, setFilterKecamatan] = useState('all');
  const [filterDesa, setFilterDesa] = useState('all');
  const [availableKecamatan, setAvailableKecamatan] = useState([]);
  const [availableDesa, setAvailableDesa] = useState([]);

  const fetchDokumenBadanHukum = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/bumdes/dokumen-badan-hukum`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setDokumenBadanHukum(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch dokumen badan hukum');
      }
    } catch (error) {
      console.error('Error fetching dokumen badan hukum:', error);
      setError(error.message);
    }
  };

  const fetchLaporanKeuangan = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/bumdes/laporan-keuangan`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setLaporanKeuangan(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch laporan keuangan');
      }
    } catch (error) {
      console.error('Error fetching laporan keuangan:', error);
      setError(error.message);
    }
  };

  const parseDesaInfo = (desaString) => {
    if (!desaString) return { namaDesa: '' };
    const parts = desaString.split(',').map(part => part.trim());
    return { namaDesa: parts[0] };
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch dokumen badan hukum
      await fetchDokumenBadanHukum();
      
      // Fetch laporan keuangan
      await fetchLaporanKeuangan();
      
    } catch (error) {
      console.error('Error in fetchAllData:', error);
      setError(`Failed to fetch data: ${error.message}`);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const extractLocationData = (dokumenData, laporanData) => {
    const kecamatanSet = new Set();
    const desaSet = new Set();
    
    // Combine all data
    const allData = [...(dokumenData || []), ...(laporanData || [])];
    
    allData.forEach(item => {
      if (item.kecamatan) kecamatanSet.add(item.kecamatan);
      if (item.desa) {
        const desaInfo = parseDesaInfo(item.desa);
        if (desaInfo.namaDesa) desaSet.add(desaInfo.namaDesa);
      }
    });
    
    setAvailableKecamatan([...kecamatanSet].sort());
    setAvailableDesa([...desaSet].sort());
  };

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Delete file function
  const handleDeleteFile = async (filename, folder, bumdesId = null) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus file "${filename}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/bumdes/delete-file`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          folder,
          bumdes_id: bumdesId
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showNotification(result.message, 'success');
        // Refresh data
        await fetchAllData();
      } else {
        showNotification(result.message || 'Gagal menghapus file', 'error');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      showNotification('Terjadi kesalahan saat menghapus file', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Smart loading - only fetch if needed
  useEffect(() => {
    console.log('📱 BumdesDokumenManager mounting...');
    
    // Initial data load
    fetchAllData();
  }, []);

  // Update location data when documents change
  useEffect(() => {
    if (dokumenBadanHukum.length > 0 || laporanKeuangan.length > 0) {
      extractLocationData(dokumenBadanHukum, laporanKeuangan);
    }
  }, [dokumenBadanHukum, laporanKeuangan]);

  const getCurrentData = () => {
    return activeTab === 'badan-hukum' ? dokumenBadanHukum : laporanKeuangan;
  };

  const filteredData = getCurrentData().filter(item => {
    const matchesSearch = 
      item.bumdes_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kecamatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.filename?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || item.document_type === filterType;
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'available' && item.file_exists) ||
      (filterStatus === 'unlinked' && item.document_type === 'unlinked');

    const matchesKecamatan = filterKecamatan === 'all' || item.kecamatan === filterKecamatan;
    
    const matchesDesa = filterDesa === 'all' || (() => {
      if (!item.desa) return false;
      const desaInfo = parseDesaInfo(item.desa);
      return desaInfo.namaDesa === filterDesa;
    })();

    return matchesSearch && matchesType && matchesStatus && matchesKecamatan && matchesDesa;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus, filterKecamatan, filterDesa, activeTab, itemsPerPage]);

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const getDocumentTypeLabel = (type) => {
    if (activeTab === 'badan-hukum') {
      const labels = {
        Perdes: 'Peraturan Desa',
        ProfilBUMDesa: 'Profil BUMDes',
        BeritaAcara: 'Berita Acara',
        AnggaranDasar: 'Anggaran Dasar',
        AnggaranRumahTangga: 'Anggaran RT',
        ProgramKerja: 'Program Kerja',
        SK_BUM_Desa: 'SK BUMDes',
        unlinked: 'Tidak Terhubung'
      };
      return labels[type] || type;
    } else {
      const labels = {
        LaporanKeuangan2021: '2021',
        LaporanKeuangan2022: '2022',
        LaporanKeuangan2023: '2023',
        LaporanKeuangan2024: '2024',
        unlinked: 'Tidak Terhubung'
      };
      return labels[type] || type;
    }
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

  const getFilterOptions = () => {
    if (activeTab === 'badan-hukum') {
      return [
        { value: 'all', label: 'Semua Dokumen' },
        { value: 'Perdes', label: 'Peraturan Desa' },
        { value: 'ProfilBUMDesa', label: 'Profil BUMDes' },
        { value: 'BeritaAcara', label: 'Berita Acara' },
        { value: 'AnggaranDasar', label: 'Anggaran Dasar' },
        { value: 'AnggaranRumahTangga', label: 'Anggaran RT' },
        { value: 'ProgramKerja', label: 'Program Kerja' },
        { value: 'SK_BUM_Desa', label: 'SK BUMDes' },
        { value: 'unlinked', label: 'Tidak Terhubung' }
      ];
    } else {
      return [
        { value: 'all', label: 'Semua Tahun' },
        { value: 'LaporanKeuangan2021', label: '2021' },
        { value: 'LaporanKeuangan2022', label: '2022' },
        { value: 'LaporanKeuangan2023', label: '2023' },
        { value: 'LaporanKeuangan2024', label: '2024' },
        { value: 'unlinked', label: 'Tidak Terhubung' }
      ];
    }
  };

  // Show initial loading only on first load
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-12 border border-white/30">
            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center">
                <FiRefreshCw className="w-8 h-8 text-white animate-spin" />
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-slate-600/20 to-slate-800/20 rounded-full blur-xl animate-pulse"></div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Memuat Dokumen</h3>
            <p className="text-slate-600">Mengambil data dokumen BUMDes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-12 border border-white/30">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
              <FiAlertCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h3>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={() => fetchAllData()}
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl"
            >
              <FiRefreshCw className="w-4 h-4" />
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 relative">
      {/* Background Loading Overlay */}
      {loading && !initialLoading && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 px-6 py-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <FiRefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-slate-700">Memperbarui data...</span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl border animate-fade-in backdrop-blur-sm ${
          notification.type === 'success' 
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' 
            : notification.type === 'warning'
            ? 'bg-amber-50/90 border-amber-200 text-amber-800'
            : 'bg-red-50/90 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <div className="p-1 bg-emerald-500 rounded-full">
                <FiCheck className="w-4 h-4 text-white" />
              </div>
            ) : notification.type === 'warning' ? (
              <div className="p-1 bg-amber-500 rounded-full">
                <FiAlertCircle className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="p-1 bg-red-500 rounded-full">
                <FiAlertCircle className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="font-semibold">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 hover:opacity-70 transition-opacity"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Modern Header - Dashboard Style */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl shadow-2xl overflow-hidden">
          <div className="relative p-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <FiPackage className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">
                        Kelola Dokumen BUMDes
                      </h1>
                      <p className="text-slate-300 mt-2 text-lg">
                        Kelola dokumen badan hukum dan laporan keuangan dari semua BUMDes di Kabupaten Bogor
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Items per Page Selector */}
                  <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                    <label className="text-sm font-medium text-white">Tampilkan:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="px-3 py-1 bg-white/20 border border-white/30 rounded-lg text-sm text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 backdrop-blur-sm"
                    >
                      <option value={5} className="text-slate-800">5</option>
                      <option value={10} className="text-slate-800">10</option>
                      <option value={25} className="text-slate-800">25</option>
                      <option value={50} className="text-slate-800">50</option>
                      <option value={100} className="text-slate-800">100</option>
                    </select>
                    <span className="text-sm text-slate-300">per halaman</span>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-white/10 rounded-xl p-1 backdrop-blur-sm">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-3 rounded-lg transition-all ${
                        viewMode === 'list' 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-white hover:bg-white/20'
                      }`}
                      title="List View"
                    >
                      <FiList className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-3 rounded-lg transition-all ${
                        viewMode === 'grid' 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-white hover:bg-white/20'
                      }`}
                      title="Grid View"
                    >
                      <FiGrid className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => fetchAllData()}
                    disabled={loading}
                    className="bg-gradient-to-r from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 backdrop-blur-sm border border-white/20"
                  >
                    <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    <span className="font-medium">{loading ? 'Memuat...' : 'Refresh Data'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Tab Navigation - Dashboard Style */}
          <div className="bg-white/10 backdrop-blur-sm">
            <div className="px-8">
              <nav className="flex space-x-6">
                <button
                  onClick={() => {
                    setActiveTab('badan-hukum');
                    setFilterType('all');
                    setSearchTerm('');
                  }}
                  className={`relative py-6 px-4 font-semibold text-lg transition-all duration-300 ${
                    activeTab === 'badan-hukum'
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-all ${
                      activeTab === 'badan-hukum' 
                        ? 'bg-white text-slate-800 shadow-lg' 
                        : 'bg-white/10 text-white'
                    }`}>
                      <FiFileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Dokumen Badan Hukum</div>
                      <div className="text-sm opacity-80">
                        {dokumenBadanHukum.length} dokumen
                      </div>
                    </div>
                  </div>
                  {activeTab === 'badan-hukum' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full shadow-lg" />
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setActiveTab('laporan-keuangan');
                    setFilterType('all');
                    setSearchTerm('');
                  }}
                  className={`relative py-6 px-4 font-semibold text-lg transition-all duration-300 ${
                    activeTab === 'laporan-keuangan'
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-all ${
                      activeTab === 'laporan-keuangan' 
                        ? 'bg-white text-slate-800 shadow-lg' 
                        : 'bg-white/10 text-white'
                    }`}>
                      <FiBarChart2 className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Laporan Keuangan</div>
                      <div className="text-sm opacity-80">
                        {laporanKeuangan.length} laporan
                      </div>
                    </div>
                  </div>
                  {activeTab === 'laporan-keuangan' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full shadow-lg" />
                  )}
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Enhanced Filters - Dashboard Style */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white">
                <FiFilter className="w-5 h-5" />
              </div>
              Filter & Pencarian
            </h3>
            <p className="text-slate-600 mt-1">Gunakan filter di bawah untuk mempersempit pencarian dokumen</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <FiSearch className="w-4 h-4 text-blue-600" />
                Pencarian
              </label>
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama BUMDes, desa, atau file..."
                  className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400 bg-white/80 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Filter by Document Type */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <FiFile className="w-4 h-4 text-blue-600" />
                Jenis Dokumen
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm"
              >
                {getFilterOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Kecamatan */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <FiMapPin className="w-4 h-4 text-blue-600" />
                Kecamatan
              </label>
              <select
                value={filterKecamatan}
                onChange={(e) => {
                  setFilterKecamatan(e.target.value);
                  setFilterDesa('all');
                }}
                className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm"
              >
                <option value="all">Semua Kecamatan</option>
                {availableKecamatan.map(kec => (
                  <option key={kec} value={kec}>{kec}</option>
                ))}
              </select>
            </div>

            {/* Filter by Desa */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <FiUser className="w-4 h-4 text-blue-600" />
                Desa
              </label>
              <select
                value={filterDesa}
                onChange={(e) => setFilterDesa(e.target.value)}
                className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm disabled:opacity-50 disabled:bg-slate-100"
                disabled={filterKecamatan === 'all'}
              >
                <option value="all">Semua Desa</option>
                {availableDesa
                  .filter(desa => {
                    if (filterKecamatan === 'all') return true;
                    const allData = [...dokumenBadanHukum, ...laporanKeuangan];
                    const matchingItems = allData.filter(item => 
                      item.kecamatan === filterKecamatan &&
                      parseDesaInfo(item.desa).namaDesa === desa
                    );
                    return matchingItems.length > 0;
                  })
                  .map(desa => (
                    <option key={desa} value={desa}>{desa}</option>
                  ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <FiInfo className="w-4 h-4 text-blue-600" />
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm"
              >
                <option value="all">Semua Status</option>
                <option value="available">Tersedia</option>
                <option value="unlinked">Tidak Terhubung</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Cards - Dashboard Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Files Card */}
          <div className="relative overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-lg border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-medium">Total File</p>
                  <p className="text-3xl font-bold text-white mt-1">{filteredData.length}</p>
                  <p className="text-xs text-slate-400 mt-2">Halaman {currentPage} dari {totalPages}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <FiFile className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10"></div>
            </div>
          </div>
          
          {/* Available Files Card */}
          <div className="relative overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 shadow-lg border border-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">File Tersedia</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {filteredData.filter(item => item.file_exists).length}
                  </p>
                  <p className="text-xs text-emerald-200 mt-2">
                    {filteredData.length > 0 ? Math.round((filteredData.filter(item => item.file_exists).length / filteredData.length) * 100) : 0}% dari total
                  </p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <FiCheck className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>
          </div>
          
          {/* Unlinked Files Card */}
          <div className="relative overflow-hidden">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 shadow-lg border border-amber-400">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Tidak Terhubung</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {filteredData.filter(item => item.document_type === 'unlinked').length}
                  </p>
                  <p className="text-xs text-amber-200 mt-2">Perlu ditindaklanjuti</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <FiAlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            </div>
          </div>
        </div>

        {/* Documents Display */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          {viewMode === 'list' ? (
            /* List View */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      BUMDes
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {activeTab === 'badan-hukum' ? 'Jenis Dokumen' : 'Tahun'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentData.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FiUser className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {item.bumdes_name}
                            </div>
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <FiMapPin className="w-3 h-3" />
                              {item.desa && item.kecamatan ? `${item.desa}, ${item.kecamatan}` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getDocumentTypeLabel(item.document_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium text-slate-900 truncate" title={item.filename}>
                            <div className="flex items-center gap-2">
                              <FiFile className="w-4 h-4 text-slate-400" />
                              {item.filename}
                            </div>
                          </div>
                          {item.file_size_formatted && (
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <FiCalendar className="w-3 h-3" />
                              {item.file_size_formatted} • {item.last_modified}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(item)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.file_exists && item.download_url && (
                            <>
                              <button
                                onClick={() => window.open(item.download_url, '_blank')}
                                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
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
                                className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                                title="Download file"
                              >
                                <FiDownload className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(
                                  item.filename, 
                                  activeTab === 'badan-hukum' ? 'bumdes_dokumen_badanhukum' : 'bumdes_laporan_keuangan',
                                  item.id
                                )}
                                disabled={deleteLoading}
                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                                title="Hapus file"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {!item.file_exists && (
                            <span className="text-slate-400 text-sm">File tidak tersedia</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentData.map((item, index) => (
                  <div 
                    key={index} 
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className={`p-4 ${
                      item.file_exists 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50' 
                        : 'bg-gradient-to-r from-red-50 to-red-100'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-lg ${
                          item.file_exists ? 'bg-blue-100' : 'bg-red-100'
                        }`}>
                          <FiFile className={`w-5 h-5 ${
                            item.file_exists ? 'text-blue-600' : 'text-red-600'
                          }`} />
                        </div>
                        {getStatusBadge(item)}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm truncate" title={item.bumdes_name}>
                          {item.bumdes_name}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <FiMapPin className="w-3 h-3" />
                          {item.desa && item.kecamatan ? `${item.desa}, ${item.kecamatan}` : 'N/A'}
                        </p>
                      </div>

                      <div>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                          {getDocumentTypeLabel(item.document_type)}
                        </span>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-900 truncate" title={item.filename}>
                          {item.filename}
                        </p>
                        {item.file_size_formatted && (
                          <p className="text-xs text-slate-500">
                            {item.file_size_formatted}
                          </p>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          {item.file_exists && item.download_url && (
                            <>
                              <button
                                onClick={() => window.open(item.download_url, '_blank')}
                                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors"
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
                                className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-md transition-colors"
                                title="Download file"
                              >
                                <FiDownload className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                        
                        {item.file_exists && (
                          <button
                            onClick={() => handleDeleteFile(
                              item.filename, 
                              activeTab === 'badan-hukum' ? 'bumdes_dokumen_badanhukum' : 'bumdes_laporan_keuangan',
                              item.id
                            )}
                            disabled={deleteLoading}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors disabled:opacity-50"
                            title="Hapus file"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {filteredData.length > 0 && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
              {/* Desktop Pagination */}
              <div className="hidden md:flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  <span className="font-medium">
                    Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredData.length)} 
                  </span> dari <span className="font-medium">{filteredData.length}</span> file
                  {filteredData.length !== getCurrentData().length && (
                    <span className="text-slate-500"> (total: {getCurrentData().length} file)</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* First Page */}
                  <button
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Halaman Pertama"
                  >
                    <FiChevronsLeft className="w-4 h-4" />
                  </button>
                  
                  {/* Previous Page */}
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Halaman Sebelumnya"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1 mx-2">
                    {totalPages <= 7 ? (
                      // Show all pages if 7 or fewer
                      Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => goToPage(i + 1)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            currentPage === i + 1
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'text-slate-600 hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))
                    ) : (
                      // Show ellipsis logic for many pages
                      <>
                        {currentPage > 3 && (
                          <>
                            <button
                              onClick={() => goToPage(1)}
                              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:shadow-sm transition-all"
                            >
                              1
                            </button>
                            {currentPage > 4 && (
                              <span className="px-2 text-slate-400">...</span>
                            )}
                          </>
                        )}
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNumber;
                          if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }
                          
                          if (pageNumber < 1 || pageNumber > totalPages) return null;
                          
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => goToPage(pageNumber)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                currentPage === pageNumber
                                  ? 'bg-blue-600 text-white shadow-lg'
                                  : 'text-slate-600 hover:bg-white hover:shadow-sm'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}
                        
                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && (
                              <span className="px-2 text-slate-400">...</span>
                            )}
                            <button
                              onClick={() => goToPage(totalPages)}
                              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:shadow-sm transition-all"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Next Page */}
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Halaman Selanjutnya"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                  
                  {/* Last Page */}
                  <button
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Halaman Terakhir"
                  >
                    <FiChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mobile Pagination */}
              <div className="md:hidden space-y-3">
                <div className="text-sm text-slate-600 text-center">
                  Halaman {currentPage} dari {totalPages} ({filteredData.length} file)
                </div>
                
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                    <span className="text-sm">Sebelumnya</span>
                  </button>
                  
                  <div className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                    {currentPage}
                  </div>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span className="text-sm">Selanjutnya</span>
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {currentData.length === 0 && filteredData.length === 0 && (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-slate-100 rounded-2xl">
                  <FiArchive className="w-12 h-12 text-slate-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">Tidak ada data</h3>
                  <p className="text-slate-500 max-w-sm">
                    {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                      ? 'Tidak ditemukan data sesuai filter yang dipilih'
                      : `Belum ada ${activeTab === 'badan-hukum' ? 'dokumen badan hukum' : 'laporan keuangan'} yang tersedia`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* No Data on Current Page */}
          {currentData.length === 0 && filteredData.length > 0 && (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-blue-100 rounded-2xl">
                  <FiFile className="w-12 h-12 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">Halaman kosong</h3>
                  <p className="text-slate-500 max-w-sm">
                    Tidak ada data di halaman ini. Silakan kembali ke halaman sebelumnya.
                  </p>
                  <button
                    onClick={() => goToPage(1)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Kembali ke Halaman 1
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BumdesDokumenManager;
