import { useState, useEffect, useCallback } from 'react';
import api from '../api';

export const useBumdesData = (initialData = null) => {
  const [bumdesData, setBumdesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kecamatanList, setKecamatanList] = useState([]);

  // Fetch data dari API
  const fetchBumdesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/bumdes');
      const apiData = response.data && Array.isArray(response.data.data) ? response.data.data : [];
      
      setBumdesData(apiData);
      
      // Extract unique kecamatan
      const uniqueKecamatan = [...new Set(apiData.map(item => item.kecamatan).filter(Boolean))];
      setKecamatanList(uniqueKecamatan.sort());
      
    } catch (err) {
      console.error('Error fetching BUMDes data:', err);
      setError('Gagal memuat data BUMDes');
      setBumdesData([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
      if (response.data.success) {
        setBumdesData(prev => prev.filter(item => item.id !== id));
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      console.error('Error deleting BUMDes:', err);
      return { success: false, message: 'Gagal menghapus data BUMDes' };
    }
  }, []);

  // Refresh data
  const refreshData = useCallback(() => {
    fetchBumdesData();
  }, [fetchBumdesData]);

  // Initialize data
  useEffect(() => {
    if (initialData && Array.isArray(initialData)) {
      setBumdesData(initialData);
      const uniqueKecamatan = [...new Set(initialData.map(item => item.kecamatan).filter(Boolean))];
      setKecamatanList(uniqueKecamatan.sort());
      setLoading(false);
    } else {
      fetchBumdesData();
    }
  }, [initialData, fetchBumdesData]);

  return {
    bumdesData,
    loading,
    error,
    kecamatanList,
    addBumdesData,
    updateBumdesData,
    deleteBumdesData,
    refreshData
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

  // Get statistics
  const getStatistics = useCallback(() => {
    const totalBumdes = filteredData.length;
    const activeBumdes = filteredData.filter(item => item.status === 'aktif').length;
    const inactiveBumdes = filteredData.filter(item => item.status === 'tidak aktif').length;
    const totalKecamatan = [...new Set(filteredData.map(item => item.kecamatan).filter(Boolean))].length;

    return {
      totalBumdes,
      activeBumdes,
      inactiveBumdes,
      totalKecamatan
    };
  }, [filteredData]);

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