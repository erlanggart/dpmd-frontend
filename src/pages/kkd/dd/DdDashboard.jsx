// DD Dashboard dengan Tab Navigation (5 Tabs)
import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiMapPin, FiUsers, FiTrendingUp, FiDownload, FiUpload, FiChevronDown, FiChevronUp, FiX, FiSearch, FiFilter } from 'react-icons/fi';
import { Activity } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../../api';
import { useDataCache } from '../../../context/DataCacheContext';
import { isVpnUser } from '../../../utils/vpnHelper';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CACHE_KEY = 'dd-dashboard';

const DdDashboard = () => {
  const [activeTab, setActiveTab] = useState('earmarked-t1');
  const [loading, setLoading] = useState(true);
  const [dataEarmarkedT1, setDataEarmarkedT1] = useState([]);
  const [dataEarmarkedT2, setDataEarmarkedT2] = useState([]);
  const [dataNonEarmarkedT1, setDataNonEarmarkedT1] = useState([]);
  const [dataNonEarmarkedT2, setDataNonEarmarkedT2] = useState([]);
  const [dataInsentif, setDataInsentif] = useState([]);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null); // Filter status dari card
  const { getCachedData, setCachedData, isCached } = useDataCache();

  useEffect(() => {
    if (isCached(CACHE_KEY)) {
      const cachedData = getCachedData(CACHE_KEY);
      setDataEarmarkedT1(cachedData.data.earmarkedT1);
      setDataEarmarkedT2(cachedData.data.earmarkedT2);
      setDataNonEarmarkedT1(cachedData.data.nonEarmarkedT1);
      setDataNonEarmarkedT2(cachedData.data.nonEarmarkedT2);
      setDataInsentif(cachedData.data.insentif);
      setLoading(false);
    } else {
      fetchAllData();
    }
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    
    let et1Data = [], et2Data = [], net1Data = [], net2Data = [], insData = [];
    
    // Helper untuk generate endpoint VPN-aware
    const getEndpoint = (path) => isVpnUser() ? `/vpn-core${path}` : path;
    
    // Fetch Earmarked T1
    try {
      const response1 = await api.get(getEndpoint('/dd-earmarked-t1/data'));
      et1Data = response1.data.data || [];
      setDataEarmarkedT1(et1Data);
    } catch (err) {
      console.warn('Error loading DD Earmarked T1:', err);
      setDataEarmarkedT1([]);
    }

    // Fetch Earmarked T2
    try {
      const response2 = await api.get(getEndpoint('/dd-earmarked-t2/data'));
      et2Data = response2.data.data || [];
      setDataEarmarkedT2(et2Data);
    } catch (err) {
      console.warn('Error loading DD Earmarked T2:', err);
      setDataEarmarkedT2([]);
    }

    // Fetch Non-Earmarked T1
    try {
      const response3 = await api.get(getEndpoint('/dd-nonearmarked-t1/data'));
      net1Data = response3.data.data || [];
      setDataNonEarmarkedT1(net1Data);
    } catch (err) {
      console.warn('Error loading DD Non-Earmarked T1:', err);
      setDataNonEarmarkedT1([]);
    }

    // Fetch Non-Earmarked T2
    try {
      const response4 = await api.get(getEndpoint('/dd-nonearmarked-t2/data'));
      net2Data = response4.data.data || [];
      setDataNonEarmarkedT2(net2Data);
    } catch (err) {
      console.warn('Error loading DD Non-Earmarked T2:', err);
      setDataNonEarmarkedT2([]);
    }

    // Fetch Insentif DD
    try {
      const response5 = await api.get(getEndpoint('/insentif-dd/data'));
      insData = response5.data.data || [];
      setDataInsentif(insData);
    } catch (err) {
      console.warn('Error loading Insentif DD:', err);
      setDataInsentif([]);
    }

    // Save to cache
    setCachedData(CACHE_KEY, {
      earmarkedT1: et1Data,
      earmarkedT2: et2Data,
      nonEarmarkedT1: net1Data,
      nonEarmarkedT2: net2Data,
      insentif: insData
    });

    setLoading(false);
  };

  const getActiveData = () => {
    switch (activeTab) {
      case 'earmarked-t1': return dataEarmarkedT1;
      case 'earmarked-t2': return dataEarmarkedT2;
      case 'nonearmarked-t1': return dataNonEarmarkedT1;
      case 'nonearmarked-t2': return dataNonEarmarkedT2;
      case 'insentif': return dataInsentif;
      default: return [];
    }
  };

  const processData = (rawData) => {
    return rawData.map(item => ({
      kecamatan: item.kecamatan,
      desa: item.desa || item.nama_desa,
      status: item.sts || item.status,
      realisasi: parseInt(String(item.Realisasi || item.realisasi || '0').replace(/,/g, ''))
    }));
  };

  const calculateStats = (processedData) => {
    const uniqueDesa = [...new Set(processedData.map(item => `${item.kecamatan}_${item.desa}`))];
    const totalDesa = uniqueDesa.length;
    const totalRealisasi = processedData.reduce((sum, d) => sum + (d.realisasi || 0), 0);

    return {
      totalKecamatan: [...new Set(processedData.map(d => d.kecamatan))].length,
      totalDesa,
      totalRealisasi,
      avgPerDesa: totalDesa > 0 ? totalRealisasi / totalDesa : 0
    };
  };

  const rawActiveData = processData(getActiveData());
  
  // Apply filters and search
  const activeData = rawActiveData.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.desa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kecamatan?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesKecamatan = filterKecamatan === '' || item.kecamatan === filterKecamatan;
    const matchesStatus = filterStatus === '' || item.status === filterStatus;
    
    return matchesSearch && matchesKecamatan && matchesStatus;
  });
  
  const stats = calculateStats(activeData);
  
  // Status statistics - dari semua data (untuk card)
  const statusStats = rawActiveData.reduce((acc, item) => {
    if (!acc[item.status]) {
      acc[item.status] = { count: 0, total: 0 };
    }
    acc[item.status].count += 1;
    acc[item.status].total += item.realisasi;
    return acc;
  }, {});

  // Convert to array and sort by total (descending)
  const statusArray = Object.entries(statusStats).map(([status, data]) => ({
    name: status,
    count: data.count,
    total: data.total
  })).sort((a, b) => b.total - a.total);
  
  // Get unique values for filters
  const uniqueKecamatan = [...new Set(rawActiveData.map(d => d.kecamatan))].sort();
  const uniqueStatus = [...new Set(rawActiveData.map(d => d.status))].filter(s => s).sort();

  const groupByKecamatanData = () => {
    const grouped = {};
    activeData.forEach(item => {
      if (!grouped[item.kecamatan]) {
        grouped[item.kecamatan] = [];
      }
      grouped[item.kecamatan].push(item);
    });
    return grouped;
  };

  const toggleKecamatan = (kecamatan) => {
    setExpandedKecamatan(prev => ({
      ...prev,
      [kecamatan]: !prev[kecamatan]
    }));
  };

  // Handler untuk klik card status
  const handleStatusClick = (statusName) => {
    if (selectedStatus === statusName) {
      setSelectedStatus(null);
      setFilterStatus('');
    } else {
      setSelectedStatus(statusName);
      setFilterStatus(statusName);
    }
  };

  // Fungsi untuk mendapatkan warna card berdasarkan status (DINAMIS)
  const getStatusColor = (status, index) => {
    const colors = [
      { bg: 'from-green-50 to-green-100', border: 'border-green-300', text: 'text-green-800', textBold: 'text-green-700', textMuted: 'text-green-600', dot: 'bg-green-500', borderTop: 'border-green-300' },
      { bg: 'from-blue-50 to-blue-100', border: 'border-blue-300', text: 'text-blue-800', textBold: 'text-blue-700', textMuted: 'text-blue-600', dot: 'bg-blue-500', borderTop: 'border-blue-300' },
      { bg: 'from-yellow-50 to-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', textBold: 'text-yellow-700', textMuted: 'text-yellow-600', dot: 'bg-yellow-500', borderTop: 'border-yellow-300' },
      { bg: 'from-purple-50 to-purple-100', border: 'border-purple-300', text: 'text-purple-800', textBold: 'text-purple-700', textMuted: 'text-purple-600', dot: 'bg-purple-500', borderTop: 'border-purple-300' },
      { bg: 'from-red-50 to-red-100', border: 'border-red-300', text: 'text-red-800', textBold: 'text-red-700', textMuted: 'text-red-600', dot: 'bg-red-500', borderTop: 'border-red-300' },
      { bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', textBold: 'text-indigo-700', textMuted: 'text-indigo-600', dot: 'bg-indigo-500', borderTop: 'border-indigo-300' },
      { bg: 'from-pink-50 to-pink-100', border: 'border-pink-300', text: 'text-pink-800', textBold: 'text-pink-700', textMuted: 'text-pink-600', dot: 'bg-pink-500', borderTop: 'border-pink-300' },
      { bg: 'from-cyan-50 to-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', textBold: 'text-cyan-700', textMuted: 'text-cyan-600', dot: 'bg-cyan-500', borderTop: 'border-cyan-300' },
      { bg: 'from-orange-50 to-orange-100', border: 'border-orange-300', text: 'text-orange-800', textBold: 'text-orange-700', textMuted: 'text-orange-600', dot: 'bg-orange-500', borderTop: 'border-orange-300' },
      { bg: 'from-gray-50 to-gray-100', border: 'border-gray-300', text: 'text-gray-800', textBold: 'text-gray-700', textMuted: 'text-gray-600', dot: 'bg-gray-500', borderTop: 'border-gray-300' },
    ];
    
    return colors[index % colors.length];
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    setUploading(true);
    try {
      const endpoints = {
        'earmarked-t1': '/dd-earmarked-t1/upload',
        'earmarked-t2': '/dd-earmarked-t2/upload',
        'nonearmarked-t1': '/dd-nonearmarked-t1/upload',
        'nonearmarked-t2': '/dd-nonearmarked-t2/upload',
        'insentif': '/insentif-dd/upload'
      };

      await api.post(endpoints[activeTab], formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Data berhasil diupload!');
      setShowUploadModal(false);
      setUploadFile(null);
      fetchAllData();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Gagal upload data');
    } finally {
      setUploading(false);
    }
  };

  const exportToExcel = () => {
    const tabNames = {
      'earmarked-t1': 'DD Earmarked Tahap 1',
      'earmarked-t2': 'DD Earmarked Tahap 2',
      'nonearmarked-t1': 'DD Non-Earmarked Tahap 1',
      'nonearmarked-t2': 'DD Non-Earmarked Tahap 2',
      'insentif': 'Insentif DD'
    };

    const exportData = activeData.map((item, index) => ({
      No: index + 1,
      Kecamatan: item.kecamatan,
      Desa: item.desa,
      Status: item.status,
      Realisasi: item.realisasi
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    
    const fileName = `${tabNames[activeTab]}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Data berhasil diexport!');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const groupedData = groupByKecamatanData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Welcome Banner dengan Gradient Modern */}
        <div className="relative bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 rounded-3xl shadow-2xl p-8 mb-8 overflow-hidden">
          {/* Animated Background Patterns */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
          
          <div className="relative z-10">
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                📊 Statistik Dana Desa
              </h1>
              <p className="text-white text-opacity-90 text-base md:text-lg">
                Monitoring dan Manajemen Dana Desa (DD) Earmarked, Non-Earmarked, dan Insentif
              </p>
            </div>
            
            {/* Quick Stats in Hero */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-cyan-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-cyan-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs md:text-sm mb-1 font-medium">Total Kecamatan</p>
                <p className="text-white text-xl md:text-2xl font-bold">{stats.totalKecamatan}</p>
              </div>
              <div className="bg-blue-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-blue-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs md:text-sm mb-1 font-medium">Total Desa</p>
                <p className="text-white text-xl md:text-2xl font-bold">{stats.totalDesa}</p>
              </div>
              <div className="bg-indigo-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-indigo-400 border-opacity-40 shadow-lg overflow-hidden">
                <p className="text-white text-opacity-90 text-xs md:text-sm mb-1 font-medium">Total Alokasi</p>
                <p className="text-white text-[10px] md:text-xs font-bold break-words leading-tight">{formatCurrency(stats.totalRealisasi)}</p>
              </div>
              <div className="bg-purple-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-purple-400 border-opacity-40 shadow-lg overflow-hidden">
                <p className="text-white text-opacity-90 text-xs md:text-sm mb-1 font-medium">Rata-rata/Desa</p>
                <p className="text-white text-[10px] md:text-xs font-bold break-words leading-tight">{formatCurrency(stats.avgPerDesa)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 p-1 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg w-fit min-w-full">
            <button
              onClick={() => setActiveTab('earmarked-t1')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                activeTab === 'earmarked-t1'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              DD Earmarked T1
            </button>
            <button
              onClick={() => setActiveTab('earmarked-t2')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                activeTab === 'earmarked-t2'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              DD Earmarked T2
            </button>
            <button
              onClick={() => setActiveTab('nonearmarked-t1')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                activeTab === 'nonearmarked-t1'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              DD Non-Earmarked T1
            </button>
            <button
              onClick={() => setActiveTab('nonearmarked-t2')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                activeTab === 'nonearmarked-t2'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              DD Non-Earmarked T2
            </button>
            <button
              onClick={() => setActiveTab('insentif')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                activeTab === 'insentif'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Insentif DD
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <button
            onClick={() => setShowUploadModal(true)}
            className="group px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <FiUpload className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-medium">Update Data</span>
          </button>
          <button
            onClick={exportToExcel}
            className="group px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <FiDownload className="w-5 h-5 group-hover:translate-y-1 transition-transform duration-300" />
            <span className="font-medium">Export Excel</span>
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Bar */}
            <div className="md:col-span-2">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari desa atau kecamatan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
            </div>

            {/* Filter Kecamatan */}
            <div className="relative">
              <FiFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <select
                value={filterKecamatan}
                onChange={(e) => setFilterKecamatan(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
              >
                <option value="">Semua Kecamatan</option>
                {uniqueKecamatan.map(kec => (
                  <option key={kec} value={kec}>{kec}</option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div className="relative">
              <FiFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
              >
                <option value="">Semua Status</option>
                {uniqueStatus.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || filterKecamatan || filterStatus) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Filter Aktif:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 text-cyan-700 rounded-lg text-sm">
                  <FiSearch className="w-3 h-3" />
                  {searchTerm}
                  <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-cyan-900">
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterKecamatan && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm">
                  <FiMapPin className="w-3 h-3" />
                  {filterKecamatan}
                  <button onClick={() => setFilterKecamatan('')} className="ml-1 hover:text-purple-900">
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterStatus && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm">
                  <Activity className="w-3 h-3" />
                  {filterStatus}
                  <button onClick={() => setFilterStatus('')} className="ml-1 hover:text-green-900">
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterKecamatan('');
                  setFilterStatus('');
                }}
                className="text-sm text-red-600 hover:text-red-700 font-medium underline"
              >
                Reset Semua
              </button>
            </div>
          )}
        </div>

        {/* Nominal per Status Cards - DINAMIS */}
        <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiDollarSign className="w-5 h-5 text-cyan-600" />
              Nominal Dana per Status ({statusArray.length} Status)
            </h3>
            {selectedStatus && (
              <button
                onClick={() => handleStatusClick(null)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                ✕ Reset Filter
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {statusArray.map((status, index) => {
              const color = getStatusColor(status.name, index);
              const isSelected = selectedStatus === status.name;
              return (
                <div 
                  key={status.name}
                  onClick={() => handleStatusClick(status.name)}
                  className={`bg-gradient-to-br ${color.bg} border-2 ${
                    isSelected ? color.border + ' ring-4 ring-offset-2 ring-cyan-400' : color.border
                  } rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer transform hover:scale-105 ${
                    isSelected ? 'scale-105 shadow-xl' : ''
                  }`}
                  title={`Klik untuk filter data ${status.name}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 ${color.dot} rounded-full animate-pulse`}></div>
                    <p className={`text-xs font-semibold ${color.text} line-clamp-2`} title={status.name}>
                      {status.name}
                    </p>
                  </div>
                  <p className={`text-xl font-bold ${color.textBold} mb-2`}>
                    {formatCurrency(status.total)}
                  </p>
                  <div className={`flex items-center justify-between pt-2 border-t ${color.borderTop}`}>
                    <p className={`text-xs ${color.textMuted}`}>Total Desa:</p>
                    <p className={`text-sm font-bold ${color.textBold}`}>{status.count}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {statusArray.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Tidak ada data status</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <button
            onClick={() => setShowUploadModal(true)}
            className="group px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <FiUpload className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-medium">Update Data</span>
          </button>
          <button
            onClick={exportToExcel}
            className="group px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <FiDownload className="w-5 h-5 group-hover:translate-y-1 transition-transform duration-300" />
            <span className="font-medium">Export Excel</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-default">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <FiMapPin className="w-7 h-7 text-cyan-600" />
              </div>
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Kecamatan</h3>
            <p className="text-3xl font-bold text-white animate-fade-in">{stats.totalKecamatan}</p>
          </div>

          <div className="group bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-default">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <FiUsers className="w-7 h-7 text-purple-600" />
              </div>
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Desa</h3>
            <p className="text-3xl font-bold text-white animate-fade-in">{stats.totalDesa}</p>
          </div>

          <div className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-default">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <FiDollarSign className="w-7 h-7 text-green-600" />
              </div>
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Alokasi</h3>
            <p className="text-2xl font-bold text-white animate-fade-in">{formatCurrency(stats.totalRealisasi)}</p>
          </div>

          <div className="group bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-default">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <FiTrendingUp className="w-7 h-7 text-orange-600" />
              </div>
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Rata-rata per Desa</h3>
            <p className="text-2xl font-bold text-white animate-fade-in">{formatCurrency(stats.avgPerDesa)}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6 mb-8">
          {/* Bar Chart - Kecamatan */}
          <div className="group bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 p-8 border border-gray-100/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Semua Kecamatan
                </h3>
                <p className="text-sm text-gray-500">Berdasarkan Total Alokasi</p>
              </div>
            </div>
            <div className="h-96 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 rounded-2xl"></div>
              <div className="relative h-full p-4">
                <Bar
                  data={{
                    labels: Object.keys(groupedData),
                    datasets: [{
                      label: 'Total Alokasi',
                      data: Object.entries(groupedData).map(([_, desas]) => 
                        desas.reduce((sum, d) => sum + d.realisasi, 0)
                      ),
                      backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 350);
                        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.9)');
                        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.7)');
                        return gradient;
                      },
                      borderColor: 'rgba(6, 182, 212, 1)',
                      borderWidth: 2,
                      borderRadius: 10,
                      hoverBackgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 350);
                        gradient.addColorStop(0, 'rgba(6, 182, 212, 1)');
                        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.9)');
                        return gradient;
                      },
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleColor: '#fff',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyColor: '#fff',
                        bodyFont: { size: 13 },
                        displayColors: false,
                        callbacks: {
                          label: (context) => formatCurrency(context.raw)
                        }
                      }
                    },
                    scales: {
                      x: {
                        grid: {
                          display: false
                        },
                        ticks: {
                          font: { size: 11, weight: '500' },
                          color: '#64748b'
                        }
                      },
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)',
                          drawBorder: false
                        },
                        ticks: {
                          font: { size: 11, weight: '500' },
                          color: '#64748b',
                          callback: (value) => {
                            if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'M';
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'Jt';
                            return value;
                          }
                        }
                      }
                    },
                    animation: {
                      duration: 1500,
                      easing: 'easeInOutQuart'
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Pie Chart - Status Distribution */}
          <div className="group bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 p-8 border border-gray-100/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Distribusi Status
                </h3>
                <p className="text-sm text-gray-500">Status Pencairan Dana</p>
              </div>
            </div>
            <div className="h-96 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-2xl"></div>
              <div className="relative w-full h-full flex items-center justify-center">
              <Pie
                data={{
                  labels: (() => {
                    const statusCounts = {};
                    activeData.forEach(d => {
                      const status = d.status || 'Tidak Ada Status';
                      statusCounts[status] = (statusCounts[status] || 0) + 1;
                    });
                    return Object.keys(statusCounts);
                  })(),
                  datasets: [{
                    data: (() => {
                      const statusCounts = {};
                      activeData.forEach(d => {
                        const status = d.status || 'Tidak Ada Status';
                        statusCounts[status] = (statusCounts[status] || 0) + 1;
                      });
                      return Object.values(statusCounts);
                    })(),
                    backgroundColor: [
                      'rgba(34, 197, 94, 0.8)',
                      'rgba(251, 191, 36, 0.8)',
                      'rgba(168, 85, 247, 0.8)',
                      'rgba(59, 130, 246, 0.8)',
                      'rgba(239, 68, 68, 0.8)',
                    ],
                    borderColor: [
                      'rgba(34, 197, 94, 1)',
                      'rgba(251, 191, 36, 1)',
                      'rgba(168, 85, 247, 1)',
                      'rgba(59, 130, 246, 1)',
                      'rgba(239, 68, 68, 1)',
                    ],
                    borderWidth: 2,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        padding: 20,
                        font: { size: 13, weight: '600' },
                        color: '#475569',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 12,
                        boxHeight: 12
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      cornerRadius: 8,
                      titleColor: '#fff',
                      titleFont: { size: 14, weight: 'bold' },
                      bodyColor: '#fff',
                      bodyFont: { size: 13 },
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${label}: ${value} desa (${percentage}%)`;
                        }
                      }
                    }
                  },
                  animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1500,
                    easing: 'easeInOutQuart'
                  }
                }}
              />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Data per Kecamatan</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Kecamatan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Jumlah Desa</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Total Realisasi</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(groupedData).map(([kecamatan, desas]) => {
                  const totalRealisasi = desas.reduce((sum, d) => sum + d.realisasi, 0);
                  const isExpanded = expandedKecamatan[kecamatan];

                  return (
                    <React.Fragment key={kecamatan}>
                      <tr className="hover:bg-cyan-50 transition-colors duration-200">
                        <td className="px-6 py-4 font-medium text-gray-900">{kecamatan}</td>
                        <td className="px-6 py-4 text-gray-700">{desas.length} Desa</td>
                        <td className="px-6 py-4 text-gray-700 font-semibold">{formatCurrency(totalRealisasi)}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleKecamatan(kecamatan)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors duration-200"
                          >
                            {isExpanded ? (
                              <>
                                <FiChevronUp className="w-4 h-4" />
                                <span className="text-sm font-medium">Sembunyikan</span>
                              </>
                            ) : (
                              <>
                                <FiChevronDown className="w-4 h-4" />
                                <span className="text-sm font-medium">Lihat Detail</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="4" className="px-6 py-4 bg-gray-50">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">No</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Nama Desa</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Realisasi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {desas.map((desa, idx) => (
                                    <tr key={idx} className="hover:bg-gray-100 transition-colors duration-150">
                                      <td className="px-4 py-2 text-sm text-gray-700">{idx + 1}</td>
                                      <td className="px-4 py-2 text-sm text-gray-900">{desa.desa}</td>
                                      <td className="px-4 py-2">
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                          {desa.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">{formatCurrency(desa.realisasi)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Upload Data</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih File JSON
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              {uploadFile && (
                <p className="mt-2 text-sm text-gray-600">
                  File dipilih: {uploadFile.name}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Mengupload...' : 'Upload'}
              </button>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DdDashboard;
