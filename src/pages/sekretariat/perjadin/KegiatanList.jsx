import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiX } from 'react-icons/fi';
import api from '../../../api';
import Swal from 'sweetalert2';
import KegiatanForm from './KegiatanForm';
import { exportToPDF, exportToExcel, formatDataForExport, exportWithProgress } from '../../../utils/exportUtils';
import { generateSafeDataHashLong } from '../../../utils/hashUtils';

const KegiatanList = ({ initialDateFilter, initialBidangFilter, onAddNew, onDetailView, refreshTrigger }) => {
  const [kegiatanList, setKegiatanList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingKegiatan, setEditingKegiatan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBidang, setSelectedBidang] = useState('');
  const [bidangList, setBidangList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 4;

  // Export functionality states
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Performance optimization - Cache system
  const [dataCache, setDataCache] = useState({
    kegiatan: { data: null, hash: null, timestamp: null },
    bidang: { data: null, hash: null, timestamp: null }
  });
  const [lastRefreshTrigger, setLastRefreshTrigger] = useState(0);

  // Cache utility functions
  const generateDataHash = (data) => {
    return generateSafeDataHashLong(data);
  };

  const isCacheValid = (cacheKey, maxAge = 120000) => { // 2 minutes default
    const cache = dataCache[cacheKey];
    if (!cache.timestamp) return false;
    return (Date.now() - cache.timestamp) < maxAge;
  };

  const updateCache = (cacheKey, data) => {
    setDataCache(prev => ({
      ...prev,
      [cacheKey]: {
        data,
        hash: generateDataHash(data),
        timestamp: Date.now()
      }
    }));
  };

  const clearCache = (cacheKey) => {
    setDataCache(prev => ({
      ...prev,
      [cacheKey]: {
        data: null,
        hash: null,
        timestamp: 0
      }
    }));
  };

  const shouldFetchData = (cacheKey, maxAge = 120000) => {
    const cache = dataCache[cacheKey];
    return !cache.data || !isCacheValid(cacheKey, maxAge) || refreshTrigger > lastRefreshTrigger;
  };

  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, selectedBidang]);

  // Debounced effect for search to reduce API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchKegiatan();
    }, searchTerm ? 500 : 0); // 500ms debounce for search, immediate for other changes

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchTerm, selectedBidang]);

  // Fetch bidang data only once on component mount
  useEffect(() => {
    console.log('KegiatanList: Component mounted, fetching bidang data...');
    fetchBidang(true); // Force refresh on first load
  }, []);

  useEffect(() => {
    if (initialDateFilter || initialBidangFilter) {
      setSelectedBidang(initialBidangFilter || '');
      // Use timeout to prevent immediate fetch after filter change
      setTimeout(() => fetchKegiatan(), 100);
    }
  }, [initialDateFilter, initialBidangFilter]);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > lastRefreshTrigger) {
      setLastRefreshTrigger(refreshTrigger);
      fetchKegiatan(true); // Force refresh
      fetchBidang(true); // Force refresh
    }
  }, [refreshTrigger, lastRefreshTrigger]);

  const fetchKegiatan = async (forceRefresh = false) => {
    const cacheKey = `kegiatan_${currentPage}_${searchTerm}_${selectedBidang}`;
    
    try {
      // Check if we should fetch kegiatan data
      if (!forceRefresh && !shouldFetchData('kegiatan', 90000)) { // 1.5 minutes cache
        const cachedData = dataCache.kegiatan.data;
        if (cachedData && cachedData.params === `${currentPage}_${searchTerm}_${selectedBidang}`) {
          console.log('KegiatanList: Using cached kegiatan data');
          setKegiatanList(cachedData.data);
          setTotalPages(cachedData.totalPages);
          setTotalRecords(cachedData.totalRecords);
          return;
        }
      }

      setLoading(true);
      const params = {
        page: currentPage,
        limit: limit,
        search: searchTerm,
        id_bidang: selectedBidang, // Perbaikan: gunakan id_bidang sesuai dengan backend
      };

      const response = await api.get('/perjadin/kegiatan', { params });
      
      if (response.data.success) {
        const newData = response.data.data || [];
        const newMeta = {
          totalPages: response.data.last_page || 1,
          totalRecords: response.data.total || 0
        };

        // Check if data actually changed
        const cachedHash = dataCache.kegiatan.hash;
        const newHash = generateDataHash({ data: newData, ...newMeta, params: `${currentPage}_${searchTerm}_${selectedBidang}` });
        
        if (cachedHash === newHash && !forceRefresh) {
          setLoading(false);
          return;
        }

        // Debug: Log data untuk melihat struktur
        console.log('KegiatanList: Received data:', newData);
        if (newData.length > 0) {
          console.log('KegiatanList: First item details:', newData[0].details);
        }

        setKegiatanList(newData);
        setTotalPages(newMeta.totalPages);
        setTotalRecords(newMeta.totalRecords);
        
        // Update cache
        updateCache('kegiatan', { 
          data: newData, 
          ...newMeta, 
          params: `${currentPage}_${searchTerm}_${selectedBidang}` 
        });
      }
    } catch (error) {
      console.error('KegiatanList: Error fetching kegiatan data:', error);
      
      // Try to use cached data on error
      if (dataCache.kegiatan.data) {
        const cachedData = dataCache.kegiatan.data;
        setKegiatanList(cachedData.data);
        setTotalPages(cachedData.totalPages);
        setTotalRecords(cachedData.totalRecords);
      } else {
        // Set empty data for new users
        setKegiatanList([]);
        setTotalPages(1);
        setTotalRecords(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBidang = async (forceRefresh = false) => {
    try {
      // Check if we should fetch bidang data
      if (!forceRefresh && !shouldFetchData('bidang', 300000)) { // 5 minutes cache for bidang (rarely changes)
        const cachedData = dataCache.bidang.data;
        if (cachedData) {
          // Ensure cached data is filtered for active bidang only
          const activeCachedData = cachedData.filter(bidang => 
            bidang.status === 'aktif' || bidang.status === 'active' || bidang.status === 1
          );
          setBidangList(activeCachedData);
          return;
        }
      }
      
      const response = await api.get('/bidangs');
      
      // Handle both API response formats
      const isWrappedResponse = response.data.success !== undefined;
      let allBidangData = [];
      
      if (isWrappedResponse && response.data.success) {
        allBidangData = response.data.data || [];
      } else if (!isWrappedResponse && Array.isArray(response.data)) {
        // Direct array response from /bidangs endpoint
        allBidangData = response.data.map(bidang => ({
          id_bidang: bidang.id,
          nama_bidang: bidang.nama,
          status: 'aktif' // Assume all bidang from this endpoint are active
        }));
      }
      
      if (allBidangData.length > 0) {
        // Filter only active bidang
        const activeBidangData = allBidangData.filter(bidang => 
          bidang.status === 'aktif' || bidang.status === 'active' || bidang.status === 1
        );

        // Check if bidang data actually changed
        const cachedHash = dataCache.bidang.hash;
        const newHash = generateDataHash(activeBidangData);
        
        if (cachedHash === newHash && !forceRefresh) {
          return;
        }

        setBidangList(activeBidangData);
        updateCache('bidang', activeBidangData);
      }
    } catch (error) {
      console.error('Error fetching bidang:', error);
      
      // Try to use cached data on error
      if (dataCache.bidang.data) {
        // Ensure cached data is also filtered for active bidang only
        const activeCachedData = dataCache.bidang.data.filter(bidang => 
          bidang.status === 'aktif' || bidang.status === 'active' || bidang.status === 1
        );
        setBidangList(activeCachedData);
      }
    }
  };

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedBidang('');
    setCurrentPage(1);
    // Clear cache to force fresh data
    clearCache('kegiatan');
  }, []);

  const handleEdit = useCallback((kegiatan) => {
    setEditingKegiatan(kegiatan);
    setShowForm(true);
  }, []);

  const handleDelete = async (id) => {
    if (!id) {
      console.error('KegiatanList: ID is undefined or null!');
      Swal.fire({
        title: 'Error!', 
        text: 'ID kegiatan tidak valid. Tidak dapat menghapus data.', 
        icon: 'error'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Konfirmasi Hapus',
      text: 'Apakah Anda yakin ingin menghapus kegiatan ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      // Show loading indicator while deleting
      Swal.fire({
        title: 'Menghapus...',
        text: 'Sedang menghapus kegiatan, mohon tunggu...',
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const response = await api.delete(`/perjadin/kegiatan/${id}`);
        
        // Check if deletion was successful
        if (response.data && response.data.status === 'success') {
          // Clear relevant caches to force refresh
          clearCache('kegiatan');
          clearCache('dashboard');
          clearCache('statistik');
          
          // Force refresh data to ensure UI reflects deletion
          await fetchKegiatan(true);
          
          Swal.fire({
            title: 'Berhasil!', 
            text: response.data.message || 'Kegiatan berhasil dihapus.', 
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          throw new Error(response.data?.message || 'Response tidak valid dari server');
        }
      } catch (error) {
        console.error('Error deleting kegiatan:', error);
        Swal.fire({
          title: 'Error!', 
          text: error.response?.data?.message || 'Gagal menghapus kegiatan.', 
          icon: 'error'
        });
      }
    }
  };

  const handleExportExcel = useCallback(async () => {
    try {
      setIsExportingExcel(true);
      
      // Show loading alert
      Swal.fire({
        title: 'Mengekspor ke Excel...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Fetch all data for export (without pagination)
      const response = await api.get('/perjadin/kegiatan', {
        params: {
          limit: 1000, // Get all data
          search: searchTerm,
          bidang: selectedBidang
        }
      });

      if (response.data.success) {
        const exportData = response.data.data || [];
        
        if (exportData.length === 0) {
          Swal.close();
          Swal.fire({
            icon: 'info',
            title: 'Tidak Ada Data',
            text: 'Tidak ada data kegiatan untuk diekspor.',
            confirmButtonColor: '#1e293b'
          });
          return;
        }
        
        const formattedData = formatDataForExport(exportData);
        const result = await exportWithProgress(exportToExcel, formattedData, 'Data Kegiatan Perjalanan Dinas');
        
        Swal.close();
        
        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Export Berhasil!',
            text: `File Excel dengan ${exportData.length} data berhasil diunduh`,
            confirmButtonColor: '#1e293b'
          });
        } else {
          throw new Error(result.message);
        }
      }
    } catch (error) {
      console.error('Export Excel Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Export Gagal',
        text: error.message || 'Terjadi kesalahan saat mengekspor ke Excel',
        confirmButtonColor: '#dc2626'
      });
    } finally {
      setIsExportingExcel(false);
    }
  }, [searchTerm, selectedBidang]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };



  // Export to PDF Handler  
  const handleExportPDF = useCallback(async () => {
    try {
      setIsExportingPDF(true);
      
      // Show loading alert
      Swal.fire({
        title: 'Mengekspor ke PDF...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Fetch all data for export (without pagination)
      const response = await api.get('/perjadin/kegiatan', {
        params: {
          limit: 1000, // Get all data
          search: searchTerm,
          bidang: selectedBidang
        }
      });

      if (response.data.success) {
        const exportData = response.data.data || [];
        
        if (exportData.length === 0) {
          Swal.close();
          Swal.fire({
            icon: 'info',
            title: 'Tidak Ada Data',
            text: 'Tidak ada data kegiatan untuk diekspor.',
            confirmButtonColor: '#1e293b'
          });
          return;
        }
        
        const formattedData = formatDataForExport(exportData);
        const result = await exportWithProgress(exportToPDF, formattedData, 'Data Kegiatan Perjalanan Dinas');
        
        Swal.close();
        
        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Export Berhasil!',
            text: `File PDF dengan ${exportData.length} data berhasil diunduh`,
            confirmButtonColor: '#1e293b'
          });
        } else {
          throw new Error(result.message);
        }
      }
    } catch (error) {
      console.error('Export PDF Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Export Gagal',
        text: error.message || 'Terjadi kesalahan saat mengekspor ke PDF',
        confirmButtonColor: '#dc2626'
      });
    } finally {
      setIsExportingPDF(false);
    }
  }, [searchTerm, selectedBidang]);



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-700 mx-auto"></div>
          <p className="text-slate-600 font-medium">Memuat data kegiatan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header Section */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-2xl">
          <span className="text-3xl font-bold text-white">📋</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
            Manajemen Kegiatan
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Kelola dan pantau semua kegiatan perjalanan dinas dengan mudah dan efisien
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 mx-auto rounded-full mt-4"></div>
        </div>
      </div>

      {/* Enhanced Action Buttons with Export Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {/* Add New Button */}
        <button 
          onClick={() => onAddNew ? onAddNew() : setShowForm(true)} 
          className="group flex items-center justify-center gap-3 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-all duration-300">
            <FiPlus className="text-lg" />
          </div>
          <span className="hidden sm:inline">Tambah Kegiatan</span>
          <span className="sm:hidden">Tambah</span>
        </button>
        

        
        {/* Export PDF Button */}
        <button 
          onClick={handleExportPDF}
          disabled={isExportingPDF}
          className="group flex items-center justify-center gap-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 disabled:from-gray-400 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100 transition-all duration-300"
        >
          <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-all duration-300">
            {isExportingPDF ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <span className="text-lg">📄</span>
            )}
          </div>
          <span className="hidden sm:inline">{isExportingPDF ? 'Mengekspor...' : 'Export PDF'}</span>
          <span className="sm:hidden">{isExportingPDF ? '...' : 'PDF'}</span>
        </button>
        
        {/* Export Excel Button */}
        <button 
          onClick={handleExportExcel}
          disabled={isExportingExcel}
          className="group flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 disabled:from-gray-400 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100 transition-all duration-300"
        >
          <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-all duration-300">
            {isExportingExcel ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <span className="text-lg">📊</span>
            )}
          </div>
          <span className="hidden sm:inline">{isExportingExcel ? 'Mengekspor...' : 'Export Excel'}</span>
          <span className="sm:hidden">{isExportingExcel ? '...' : 'Excel'}</span>
        </button>
      </div>

      {/* Enhanced Form Container */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full max-h-[95vh] overflow-auto">
            <KegiatanForm
              kegiatan={editingKegiatan}
              onClose={() => {setShowForm(false); setEditingKegiatan(null);}}
              onSuccess={() => {setShowForm(false); setEditingKegiatan(null); fetchKegiatan();}}
            />
          </div>
        </div>
      )}

      {/* Enhanced Main Content Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <span className="text-white text-lg">📝</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Daftar Kegiatan</h3>
                <p className="text-slate-300 text-sm">Perjalanan Dinas Terdaftar</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{totalRecords}</div>
              <div className="text-slate-300 text-sm">Total Kegiatan</div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                <span className="mr-2">🔍</span>
                Pencarian
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama kegiatan, lokasi, atau nomor SP..."
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>

            {/* Bidang Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                <span className="mr-2">⚡</span>
                Filter Bidang ({bidangList.length} bidang tersedia)
              </label>
              <select
                value={selectedBidang}
                onChange={(e) => {
                  setSelectedBidang(e.target.value);
                }}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="">Semua Bidang</option>
                {bidangList.map((bidang, index) => (
                  <option key={bidang.id_bidang || index} value={bidang.id_bidang}>
                    {bidang.nama_bidang || 'Nama tidak tersedia'}
                  </option>
                ))}
              </select>
              {bidangList.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  Tidak ada data bidang tersedia. Periksa koneksi atau data bidang.
                </p>
              )}
            </div>

            {/* Filter Actions */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 opacity-0">
                Actions
              </label>
              <div className="flex gap-3">
                <button
                  onClick={handleClearFilters}
                  disabled={!searchTerm && !selectedBidang}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg transform hover:scale-105 disabled:hover:scale-100"
                >
                  <FiX className="w-4 h-4" />
                  Reset Filter
                </button>
                <button
                  onClick={() => fetchKegiatan(true)}
                  className="px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-105"
                  title="Refresh Data"
                >
                  <span className="text-lg">🔄</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filter Status */}
          {(searchTerm || selectedBidang) && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span>⚡</span>
                  <span>Filter aktif:</span>
                  {searchTerm && <span className="bg-slate-200 px-2 py-1 rounded">"{searchTerm}"</span>}
                  {selectedBidang && (
                    <span className="bg-slate-200 px-2 py-1 rounded">
                      {bidangList.find(b => b.id_bidang.toString() === selectedBidang)?.nama_bidang || 'Bidang dipilih'}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleClearFilters}
                  className="text-slate-700 hover:text-slate-900 text-sm flex items-center gap-1"
                >
                  <FiX className="w-3 h-3" />
                  Hapus semua filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modern Enhanced Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-center w-20">
                    <div className="flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-700">No</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left w-44">
                    <div className="flex items-center text-gray-700 font-semibold">
                      <span className="text-sm font-medium">Nomor SP</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left w-64">
                    <div className="flex items-center text-gray-700 font-semibold">
                      <span className="text-sm font-medium">Nama Kegiatan</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left w-40">
                    <div className="flex items-center text-gray-700 font-semibold">
                      <span className="text-sm font-medium">Tanggal</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left w-44">
                    <div className="flex items-center space-x-2 text-gray-700 font-semibold">
                      <span className="text-sm font-medium">Lokasi</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center w-32">
                    <div className="flex items-center justify-center space-x-2 text-gray-700 font-semibold">
                      <span className="text-sm font-medium">Aksi</span>
                    </div>
                  </th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-200">
              {kegiatanList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h6 className="text-lg font-semibold text-gray-800">Belum Ada Data Kegiatan</h6>
                        <p className="text-gray-600 text-sm mt-1">Tambahkan kegiatan perjalanan dinas untuk melihat daftar</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                kegiatanList.map((kegiatan, index) => (
                  <tr key={kegiatan.id_kegiatan || kegiatan.id_perjadin} className="hover:bg-slate-50/50 transition-all duration-200 group">
                    {/* Nomor */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">
                        {(currentPage - 1) * limit + index + 1}
                      </span>
                    </td>

                    {/* Nomor SP */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {kegiatan.nomor_sp || 'Belum ada nomor'}
                        </div>
                        <div className="text-xs text-gray-500">Surat Perintah</div>
                      </div>
                    </td>

                    {/* Nama Kegiatan */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-gray-900 leading-5">
                          {kegiatan.nama_kegiatan}
                        </div>
                        {kegiatan.keterangan && (
                          <div className="text-xs text-gray-600 leading-4">
                            <span className="truncate max-w-sm block" title={kegiatan.keterangan}>
                              {kegiatan.keterangan}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Tanggal */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(kegiatan.tanggal_mulai)}
                        </div>
                        {kegiatan.tanggal_selesai && kegiatan.tanggal_selesai !== kegiatan.tanggal_mulai && (
                          <div className="text-xs text-gray-600">
                            s/d {formatDate(kegiatan.tanggal_selesai)}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Lokasi */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        <span className="block truncate" title={kegiatan.lokasi}>
                          {kegiatan.lokasi || 'Belum ditentukan'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            const id = kegiatan.id_kegiatan || kegiatan.id_perjadin || kegiatan.id;
                            onDetailView && onDetailView(id);
                          }}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors duration-200"
                          title="Lihat Detail"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => handleEdit(kegiatan)}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors duration-200"
                          title="Edit Kegiatan"
                        >
                          <FiEdit className="w-3 h-3 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            const id = kegiatan.id_kegiatan || kegiatan.id_perjadin || kegiatan.id;
                            handleDelete(id);
                          }}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-md transition-colors duration-200"
                          title="Hapus Kegiatan"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enhanced Pagination with Info */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Data Info - Always show */}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Menampilkan</span>
              <span className="px-2 py-1 bg-slate-200 text-slate-800 rounded-md font-bold text-xs">
                {totalRecords > 0 ? (currentPage - 1) * limit + 1 : 0} - {Math.min(currentPage * limit, totalRecords)}
              </span>
              <span>dari</span>
              <span className="px-2 py-1 bg-slate-200 text-slate-800 rounded-md font-bold text-xs">{totalRecords}</span>
              <span>data</span>
              {totalPages > 1 && (
                <>
                  <span>•</span>
                  <span className="text-xs">
                    Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                  </span>
                </>
              )}
            </div>

            {/* Pagination Controls - Show only if more than 1 page */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* First Page */}
                {currentPage > 3 && totalPages > 5 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 hover:scale-105"
                    >
                      1
                    </button>
                    {currentPage > 4 && <span className="px-2 text-slate-400">...</span>}
                  </>
                )}

                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>←</span>
                  <span className="hidden sm:inline">Prev</span>
                </button>
                
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        currentPage === page
                          ? 'bg-slate-700 text-white shadow-lg ring-2 ring-slate-400'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 hover:scale-105'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span>→</span>
                </button>

                {/* Last Page */}
                {currentPage < totalPages - 2 && totalPages > 5 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="px-2 text-slate-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 hover:scale-105"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(KegiatanList);