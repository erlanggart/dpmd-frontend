import { useState, useEffect, useCallback } from 'react';
import api from '../api.js';
import { generateSafeDataHash } from '../utils/hashUtils.js';

export const useBumdesData = (initialData = null) => {
  const [bumdesData, setBumdesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [lastFetch, setLastFetch] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [dataHash, setDataHash] = useState('');
  
  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  const generateDataHash = useCallback((data) => {
    return generateSafeDataHash(data);
  }, []);

  const shouldFetchData = useCallback(() => {
    return (Date.now() - lastFetch) > CACHE_DURATION;
  }, [lastFetch, CACHE_DURATION]);

  // Fetch data dari API with smart caching
  const fetchBumdesData = useCallback(async (forceRefresh = false) => {
    // Skip fetch if data is still fresh and not forcing refresh
    if (!forceRefresh && !shouldFetchData() && bumdesData.length > 0) {
      console.log('📋 BUMDes Hook: Using cached data, skipping fetch');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 BUMDes Hook: Fetching fresh data...');
      console.log('🔄 BUMDes Hook: API Base URL:', api.defaults.baseURL);
      
      const response = await api.get('/bumdes', {
        timeout: 60000 // 60 seconds timeout for BUMDes data (187 records)
      });
      console.log('📊 BUMDes Hook: Raw response:', response);
      
      const apiData = response.data && Array.isArray(response.data.data) ? response.data.data : [];
      console.log('📊 BUMDes Hook: Processed data length:', apiData.length);
      
      // Check if data actually changed
      const newHash = generateDataHash(apiData);
      if (dataHash === newHash && !forceRefresh) {
        console.log('📋 BUMDes Hook: Data unchanged, skipping update');
        setLoading(false);
        return;
      }
      
      console.log('✅ BUMDes Hook: Setting new data');
      setBumdesData(apiData);
      setDataHash(newHash);
      setLastFetch(Date.now());
      setDataVersion(prev => prev + 1);
      
      // Extract unique kecamatan
      const uniqueKecamatan = [...new Set(apiData.map(item => item.kecamatan).filter(Boolean))];
      setKecamatanList(uniqueKecamatan.sort());
      
    } catch (err) {
      console.error('❌ BUMDes Hook: Failed to fetch data:', err);
      console.error('❌ BUMDes Hook: Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url,
        baseURL: err.config?.baseURL,
        timeout: err.config?.timeout,
        code: err.code,
        name: err.name
      });
      
      // Only set empty data if we don't have any cached data
      if (bumdesData.length === 0) {
        setError('Gagal memuat data BUMDes');
        setBumdesData([]);
      }
      
      if (err.code !== 'ECONNABORTED') {
        setError('Gagal memuat data BUMDes');
      }
    } finally {
      setLoading(false);
    }
  }, [shouldFetchData, bumdesData.length, dataHash, generateDataHash]);

  // Add new BUMDes data
  const addBumdesData = useCallback(async (newData) => {
    try {
      const response = await api.post('/bumdes', newData);
      if (response.data.success) {
        setBumdesData(prev => [...prev, response.data.data]);
        return { success: true, data: response.data.data };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      console.error('Error adding BUMDes:', err);
      return { success: false, message: 'Gagal menambah data BUMDes' };
    }
  }, []);

  // Update BUMDes data
  const updateBumdesData = useCallback(async (id, updatedData) => {
    try {
      const response = await api.put(`/bumdes/${id}`, updatedData);
      if (response.data.success) {
        setBumdesData(prev => 
          prev.map(item => item.id === id ? response.data.data : item)
        );
        return { success: true, data: response.data.data };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      console.error('Error updating BUMDes:', err);
      return { success: false, message: 'Gagal mengupdate data BUMDes' };
    }
  }, []);

  // Delete BUMDes data
  const deleteBumdesData = useCallback(async (id) => {
    try {
      const response = await api.delete(`/bumdes/${id}`);
      // Check both status and success field from response
      if (response.status === 200 && response.data.success) {
        setBumdesData(prev => prev.filter(item => item.id !== id));
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message || 'Terjadi kesalahan' };
    } catch (err) {
      console.error('Error deleting BUMDes:', err);
      // Handle error response
      const errorMessage = err.response?.data?.message || err.message || 'Gagal menghapus data BUMDes';
      return { success: false, message: errorMessage };
    }
  }, []);

  // Refresh data (force refresh)
  const refreshData = useCallback(() => {
    fetchBumdesData(true);
  }, [fetchBumdesData]);
  
  // Check if data needs refresh
  const isDataStale = useCallback(() => {
    const now = Date.now();
    return !lastFetch || (now - lastFetch) > CACHE_DURATION;
  }, [lastFetch, CACHE_DURATION]);

  // Initialize data and periodic refresh
  useEffect(() => {
    if (initialData && Array.isArray(initialData)) {
      setBumdesData(initialData);
      const uniqueKecamatan = [...new Set(initialData.map(item => item.kecamatan).filter(Boolean))];
      setKecamatanList(uniqueKecamatan.sort());
      setLastFetch(Date.now());
      setLoading(false);
    } else {
      // Initial load
      fetchBumdesData();
    }

    // Set up periodic refresh every 10 minutes if page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchBumdesData();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []); // Empty dependency array for initial setup only

  return {
    bumdesData,
    loading,
    error,
    kecamatanList,
    addBumdesData,
    updateBumdesData,
    deleteBumdesData,
    refreshData,
    isDataStale,
    lastFetch,
    dataVersion
  };
};

// Hook untuk filtering dan pagination
export const useBumdesFilter = (bumdesData) => {
  const [selectedPeriod, setSelectedPeriod] = useState('semua');
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredData, setFilteredData] = useState([]);
  
  const itemsPerPage = 9;

  // Apply filters
  useEffect(() => {
    let filtered = [...bumdesData];

    // Filter by kecamatan
    if (selectedKecamatan) {
      filtered = filtered.filter(item => item.kecamatan === selectedKecamatan);
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    // Filter by period (could be extended based on date fields)
    if (selectedPeriod !== 'semua') {
      // Add period filtering logic here based on your date fields
      // Example: filter by creation date, last update, etc.
    }

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [bumdesData, selectedPeriod, selectedKecamatan, selectedStatus]);

  // Get paginated data
  const getPaginatedData = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  // Get statistics - BASIS: 416 DESA (JUMLAH BAKU BUMDES KABUPATEN BOGOR)
  const getStatistics = useCallback(() => {
    const TOTAL_DESA_BOGOR = 416; // Jumlah baku BUMDes di Kabupaten Bogor
    const totalBumdesUploaded = filteredData.length; // BUMDes yang sudah mengupload
    const totalBumdesBelumUpload = TOTAL_DESA_BOGOR - bumdesData.length; // BUMDes belum mengupload dari total data
    const activeBumdes = filteredData.filter(item => item.status === 'aktif').length;
    const inactiveBumdes = filteredData.filter(item => item.status === 'tidak aktif').length;
    const totalKecamatan = [...new Set(filteredData.map(item => item.kecamatan).filter(Boolean))].length;
    
    // Persentase berdasarkan 416 desa sebagai 100%
    const persentaseUpload = ((bumdesData.length / TOTAL_DESA_BOGOR) * 100).toFixed(1);
    const persentaseBelumUpload = ((totalBumdesBelumUpload / TOTAL_DESA_BOGOR) * 100).toFixed(1);
    
    // Statistik per kecamatan
    const kecamatanStats = bumdesData.reduce((acc, item) => {
      const key = item.kecamatan || 'Tidak diketahui';
      if (!acc[key]) {
        acc[key] = { uploaded: 0, aktif: 0, nonAktif: 0 };
      }
      acc[key].uploaded++;
      if (item.status === 'aktif') acc[key].aktif++;
      if (item.status === 'tidak aktif') acc[key].nonAktif++;
      return acc;
    }, {});

    const kecamatanData = Object.entries(kecamatanStats).map(([name, stats]) => ({
      name,
      uploaded: stats.uploaded,
      aktif: stats.aktif,
      nonAktif: stats.nonAktif,
      belumUpload: 0 // Akan dihitung berdasarkan data master desa per kecamatan
    }));

    return {
      totalBumdes: totalBumdesUploaded, // BUMDes yang sudah upload (filtered)
      totalBumdesUploaded: bumdesData.length, // Total BUMDes yang sudah upload (dari semua data)
      totalBumdesBelumUpload, // BUMDes yang belum upload
      totalDesaBogor: TOTAL_DESA_BOGOR, // Total desa di Kabupaten Bogor
      activeBumdes,
      inactiveBumdes,
      totalKecamatan,
      persentaseUpload,
      persentaseBelumUpload,
      kecamatanData
    };
  }, [filteredData, bumdesData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return {
    selectedPeriod,
    setSelectedPeriod,
    selectedKecamatan,
    setSelectedKecamatan,
    selectedStatus,
    setSelectedStatus,
    currentPage,
    setCurrentPage,
    filteredData,
    getPaginatedData,
    getStatistics,
    totalPages,
    itemsPerPage
  };
};