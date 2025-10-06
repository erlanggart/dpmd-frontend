import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiList, FiPlus, FiFileText, FiEdit, FiTrash2, FiEye, FiSearch, FiFilter, FiDownload } from 'react-icons/fi';
import api from '../../../api';
import Swal from 'sweetalert2';
import KegiatanForm from './KegiatanForm';
import { exportToPDF, exportToExcel, formatDataForExport, exportWithProgress } from '../../../utils/exportUtils';

const KegiatanList = ({ initialDateFilter, initialBidangFilter, onAddNew, refreshTrigger }) => {
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
  const limit = 10;

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
    try {
      return btoa(JSON.stringify(data)).slice(0, 16);
    } catch {
      return Date.now().toString();
    }
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

  // Debounced effect for search to reduce API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchKegiatan();
    }, searchTerm ? 500 : 0); // 500ms debounce for search, immediate for other changes

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchTerm, selectedBidang]);

  // Fetch bidang data only once on component mount
  useEffect(() => {
    fetchBidang();
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
      console.log('KegiatanList: Refresh triggered, forcing fresh data fetch...');
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
          console.log('📋 KegiatanList: Using cached kegiatan data');
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
        bidang: selectedBidang,
      };

      console.log('KegiatanList: Fetching fresh kegiatan data with params:', params);
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
          console.log('📋 KegiatanList: Kegiatan data unchanged, skipping update');
          setLoading(false);
          return;
        }

        console.log('✅ KegiatanList: Setting new kegiatan data:', newData);
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
        console.log('KegiatanList: Using cached kegiatan data due to error');
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
        console.log('📋 KegiatanList: Using cached bidang data');
        const cachedData = dataCache.bidang.data;
        if (cachedData) {
          setBidangList(cachedData);
          return;
        }
      }

      console.log('KegiatanList: Fetching fresh bidang data...');
      const response = await api.get('/perjadin/bidang');
      if (response.data.success) {
        const newBidangData = response.data.data || [];

        // Check if bidang data actually changed
        const cachedHash = dataCache.bidang.hash;
        const newHash = generateDataHash(newBidangData);
        
        if (cachedHash === newHash && !forceRefresh) {
          console.log('📋 KegiatanList: Bidang data unchanged, skipping update');
          return;
        }

        console.log('✅ KegiatanList: Setting new bidang data:', newBidangData);
        setBidangList(newBidangData);
        updateCache('bidang', newBidangData);
      }
    } catch (error) {
      console.error('KegiatanList: Error fetching bidang data:', error);
      
      // Try to use cached data on error
      if (dataCache.bidang.data) {
        console.log('KegiatanList: Using cached bidang data due to error');
        setBidangList(dataCache.bidang.data);
      }
    }
  };

  const handleEdit = useCallback((kegiatan) => {
    setEditingKegiatan(kegiatan);
    setShowForm(true);
  }, []);

  const handleDelete = async (id) => {
    console.log('🔍 KegiatanList: handleDelete called with ID:', id, 'Type:', typeof id);
    
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
        console.log('🔍 KegiatanList: Delete response received:', response.data);
        
        if (response.data && response.data.status === 'success') {
          console.log('✅ KegiatanList: Delete successful, clearing caches...');
          
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
          console.error('KegiatanList: Unexpected response format:', response.data);
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

      console.log('Starting Excel export...', { searchTerm, selectedBidang });

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

  const formatPersonil = useCallback((kegiatanData) => {
    // Handle kegiatan.details from backend response
    const details = kegiatanData?.details || kegiatanData?.personil_bidang_list || [];
    
    if (!details || details.length === 0) return '-';
    
    return details.map(detail => {
      let personilNames = '';
      
      // Backend sends: { id_bidang: 1, personil: "nama1, nama2", bidang: { nama: "..." } }
      if (detail.personil && typeof detail.personil === 'string') {
        personilNames = detail.personil;
      } else if (detail.personil && Array.isArray(detail.personil)) {
        personilNames = detail.personil.filter(p => p && p.trim()).join(', ');
      }
      
      const bidangName = detail.bidang?.nama || detail.nama_bidang || 'Unknown';
      
      return `${bidangName}: ${personilNames || 'Tidak ada personil'}`;
    }).join(' | ');
  }, []);

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
          <FiList className="text-3xl text-white" />
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
              <FiFileText className="text-lg" />
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
              <FiDownload className="text-lg" />
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
                <FiList className="w-5 h-5 text-white" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                <FiSearch className="inline w-4 h-4 mr-2" />
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
                <FiFilter className="inline w-4 h-4 mr-2" />
                Filter Bidang
              </label>
              <select
                value={selectedBidang}
                onChange={(e) => setSelectedBidang(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="">Semua Bidang</option>
                {bidangList.map(bidang => (
                  <option key={bidang.id_bidang} value={bidang.id_bidang}>
                    {bidang.nama_bidang}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Enhanced Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300">No</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300">Nomor SP</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300">Nama Kegiatan</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300">Lokasi</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300">Personil</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {kegiatanList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto">
                        <FiList className="w-8 h-8 text-slate-500" />
                      </div>
                      <div>
                        <h6 className="text-lg font-bold text-slate-800">Belum Ada Kegiatan</h6>
                        <p className="text-slate-600 text-sm mt-1">Mulai dengan menambahkan kegiatan perjalanan dinas baru</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                kegiatanList.map((kegiatan, index) => (
                  <tr key={kegiatan.id_kegiatan || kegiatan.id_perjadin} className="hover:bg-slate-50/70 transition-colors duration-200 border-b border-slate-100">
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                      {(currentPage - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                      <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs">
                        {kegiatan.nomor_sp || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <p className="text-sm font-semibold text-slate-800 truncate" title={kegiatan.nama_kegiatan}>
                          {kegiatan.nama_kegiatan}
                        </p>
                        {kegiatan.keterangan && (
                          <p className="text-xs text-slate-600 mt-1 truncate" title={kegiatan.keterangan}>
                            {kegiatan.keterangan}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-800">{formatDate(kegiatan.tanggal_mulai)}</div>
                        {kegiatan.tanggal_selesai && kegiatan.tanggal_selesai !== kegiatan.tanggal_mulai && (
                          <div className="text-xs text-slate-500">s/d {formatDate(kegiatan.tanggal_selesai)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="max-w-xs truncate" title={kegiatan.lokasi}>
                        <span className="inline-flex px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                          {kegiatan.lokasi || 'Belum ditentukan'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="max-w-xs truncate" title={formatPersonil(kegiatan)}>
                        {formatPersonil(kegiatan)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(kegiatan)}
                          className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Edit Kegiatan"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const id = kegiatan.id_kegiatan || kegiatan.id_perjadin || kegiatan.id;
                            handleDelete(id);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all duration-200 hover:scale-110"
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

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Menampilkan</span>
                <span className="px-2 py-1 bg-slate-200 text-slate-800 rounded-md font-bold text-xs">
                  {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalRecords)}
                </span>
                <span>dari</span>
                <span className="px-2 py-1 bg-slate-200 text-slate-800 rounded-md font-bold text-xs">{totalRecords}</span>
                <span>data</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ←
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
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        currentPage === page
                          ? 'bg-slate-700 text-white shadow-lg scale-110'
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
                  className="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(KegiatanList);