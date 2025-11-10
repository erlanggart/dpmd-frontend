import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';
import { generateSafeDataHash } from '../utils/hashUtils.js';

export const useBumdesStatistics = () => {
  const [statistics, setStatistics] = useState({
    total: 0,
    target_total: 416,
    aktif: 0,
    tidak_aktif: 0,
    terbit_sertifikat: 0,
    nama_terverifikasi: 0,
    perbaikan_dokumen: 0,
    belum_proses: 0,
    percentage_aktif: 0,
    percentage_sertifikat: 0,
    progress_to_target: {
      current: 0,
      target: 416,
      remaining: 416,
      percentage: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [statsVersion, setStatsVersion] = useState(0);
  const [dataHash, setDataHash] = useState('');
  
  // Cache duration: 3 minutes for statistics
  const CACHE_DURATION = 3 * 60 * 1000;

  const generateDataHash = useCallback((data) => {
    return generateSafeDataHash(data);
  }, []);

  const shouldFetchData = useCallback(() => {
    return (Date.now() - lastFetch) > CACHE_DURATION;
  }, [lastFetch, CACHE_DURATION]);

  const fetchStatistics = useCallback(async (forceRefresh = false) => {
    // Skip fetch if data is still fresh and not forcing refresh
    if (!forceRefresh && !shouldFetchData() && statistics.total > 0) {
      console.log('📋 BUMDes Stats: Using cached data, skipping fetch');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 BUMDes Stats: Fetching fresh statistics...');
      console.log('🔄 BUMDes Stats: API Base URL:', api.defaults.baseURL);
      
      const response = await api.get('/bumdes/statistics', {
        timeout: 45000 // 45 seconds timeout for statistics
      });
      console.log('📊 BUMDes Stats: Raw response:', response);
      
      if (response.data.success) {
        // Check if data actually changed
        const newHash = generateDataHash(response.data.data);
        if (dataHash === newHash && !forceRefresh) {
          console.log('📋 BUMDes Stats: Data unchanged, skipping update');
          setLoading(false);
          return;
        }
        
        console.log('✅ BUMDes Stats: Setting new statistics data:', response.data.data);
        
        // Transform new backend structure to match frontend expectations
        const apiData = response.data.data;
        const transformedStats = {
          // Overview data
          total: apiData.overview?.total || 0,
          target_total: apiData.overview?.progress_to_target?.target || 416,
          aktif: apiData.overview?.aktif || 0,
          tidak_aktif: apiData.overview?.tidak_aktif || 0,
          
          // Progress to target
          progress_to_target: {
            current: apiData.overview?.total || 0,
            target: apiData.overview?.progress_to_target?.target || 416,
            remaining: apiData.overview?.progress_to_target?.remaining || 416,
            percentage: apiData.overview?.progress_to_target?.percentage || 0
          },
          
          // Additional statistics
          percentage_aktif: apiData.overview?.total > 0 
            ? Math.round((apiData.overview?.aktif / apiData.overview?.total) * 100) 
            : 0,
          
          // Data for charts
          by_kecamatan: apiData.by_kecamatan || [],
          by_jenis_usaha: apiData.by_jenis_usaha || [],
          by_tahun: apiData.by_tahun || [],
          financial: apiData.financial || {},
          workforce: apiData.workforce || {},
          
          // Badan Hukum statistics (now from backend)
          terbit_sertifikat: apiData.badan_hukum?.terbit_sertifikat || 0,
          nama_terverifikasi: apiData.badan_hukum?.nama_terverifikasi || 0,
          perbaikan_dokumen: apiData.badan_hukum?.perbaikan_dokumen || 0,
          belum_proses: apiData.badan_hukum?.belum_proses || 0,
          percentage_sertifikat: apiData.badan_hukum?.percentage_sertifikat || 0
        };
        
        setStatistics(transformedStats);
        setDataHash(newHash);
        setLastFetch(Date.now());
        setStatsVersion(prev => prev + 1);
      } else {
        setError('Failed to fetch statistics');
      }
    } catch (err) {
      console.error('❌ BUMDes Stats: Failed to fetch statistics:', err);
      console.error('❌ BUMDes Stats: Error details:', {
        message: err.message,
        status: err.response?.status,
        url: err.config?.url,
        baseURL: err.config?.baseURL
      });
      
      // Only set error if we don't have any cached data
      if (statistics.total === 0) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch statistics');
      }
      
      if (err.code !== 'ECONNABORTED') {
        setError(err.response?.data?.message || err.message || 'Failed to fetch statistics');
      }
    } finally {
      setLoading(false);
    }
  }, [shouldFetchData, statistics.total, dataHash, generateDataHash]);

  useEffect(() => {
    // Initial load
    fetchStatistics();

    // Set up periodic refresh every 10 minutes if page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStatistics();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []); // Empty dependency array for initial setup only

  // Check if statistics data is stale
  const isStatsStale = useCallback(() => {
    const now = Date.now();
    return !lastFetch || (now - lastFetch) > CACHE_DURATION;
  }, [lastFetch, CACHE_DURATION]);

  // Refresh statistics (force refresh)
  const refreshStatistics = useCallback(() => {
    fetchStatistics(true);
  }, [fetchStatistics]);

  // Transform statistics for compatibility with existing UI
  const getCompatibleStatistics = useCallback(() => {
    return {
      // Existing format for compatibility
      totalDesaBogor: statistics.target_total,
      totalBumdesUploaded: statistics.total,
      totalBumdesBelumUpload: statistics.progress_to_target.remaining,
      persentaseUpload: statistics.progress_to_target.percentage,
      persentaseBelumUpload: Math.round(100 - statistics.progress_to_target.percentage),
      activeBumdes: statistics.aktif,
      inactiveBumdes: statistics.tidak_aktif,
      totalKecamatan: statistics.by_kecamatan?.length || 40,
      
      // New statistics from API
      terbitSertifikat: statistics.terbit_sertifikat,
      namaTermerifikasi: statistics.nama_terverifikasi,
      perbaikanDokumen: statistics.perbaikan_dokumen,
      belumProses: statistics.belum_proses,
      percentageAktif: statistics.percentage_aktif,
      percentageSertifikat: statistics.percentage_sertifikat,
      targetBumdes: statistics.target_total,
      
      // Chart data
      chartData: {
        byKecamatan: statistics.by_kecamatan || [],
        byJenisUsaha: statistics.by_jenis_usaha || [],
        byTahun: statistics.by_tahun || [],
        financial: statistics.financial || {},
        workforce: statistics.workforce || {},
        status: {
          aktif: statistics.aktif || 0,
          tidak_aktif: statistics.tidak_aktif || 0
        }
      },
      
      // Kecamatan data for UI
      kecamatanData: (statistics.by_kecamatan || []).map(kec => ({
        name: kec.kecamatan,
        uploaded: kec.total,
        aktif: kec.aktif,
        nonAktif: kec.tidak_aktif,
        belumUpload: 0 // This needs separate calculation
      }))
    };
  }, [statistics]);

  return {
    statistics,
    compatibleStatistics: getCompatibleStatistics(),
    loading,
    error,
    refreshStatistics,
    lastFetch,
    statsVersion,
    isStatsStale
  };
};