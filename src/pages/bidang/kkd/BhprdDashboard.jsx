// BHPRD Dashboard dengan Tab Navigation (3 Tabs)
import React, { useState, useEffect, useCallback } from 'react';
import { FiDollarSign, FiMapPin, FiUsers, FiTrendingUp, FiDownload, FiUpload, FiChevronDown, FiChevronUp, FiX, FiSearch, FiFilter, FiActivity, FiBarChart2 } from 'react-icons/fi';
import { Activity } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from "../../../api";
import { isVpnUser } from "../../../utils/vpnHelper';
import { useDataCache } from '../../context/DataCacheContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CACHE_KEY = 'bhprd-dashboard';

const BhprdDashboard = () => {
  const [activeTab, setActiveTab] = useState('tahap1');
  const [loading, setLoading] = useState(true);
  const [dataTahap1, setDataTahap1] = useState([]);
  const [dataTahap2, setDataTahap2] = useState([]);
  const [dataTahap3, setDataTahap3] = useState([]);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedStatusFromCard, setSelectedStatusFromCard] = useState('');
  const [activeTabView, setActiveTabView] = useState('statistic'); // 'statistic' or 'table'
  const { getCachedData, setCachedData, isCached } = useDataCache();

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    
    let t1Data = [], t2Data = [], t3Data = [];
    
    const getEndpoint = (path) => isVpnUser() ? `/vpn-core${path}` : path;
    
    // Fetch BHPRD Tahap 1
    try {
      const response1 = await api.get(getEndpoint('/bhprd-t1/data'));
      t1Data = response1.data.data || [];
      setDataTahap1(t1Data);
    } catch (err) {
      console.warn('Error loading BHPRD Tahap 1:', err);
      setDataTahap1([]);
    }

    // Fetch Tahap 2
    try {
      const response2 = await api.get('/bhprd-t2/data');
      t2Data = response2.data.data || [];
      setDataTahap2(t2Data);
    } catch (err) {
      console.warn('Error loading BHPRD Tahap 2:', err);
      setDataTahap2([]);
    }

    // Fetch Tahap 3
    try {
      const response3 = await api.get('/bhprd-t3/data');
      t3Data = response3.data.data || [];
      setDataTahap3(t3Data);
    } catch (err) {
      console.warn('Error loading BHPRD Tahap 3:', err);
      setDataTahap3([]);
    }

    // Save to cache
    setCachedData(CACHE_KEY, {
      tahap1: t1Data,
      tahap2: t2Data,
      tahap3: t3Data
    });

    setLoading(false);
  }, [setCachedData]);

  useEffect(() => {
    if (isCached(CACHE_KEY)) {
      const cachedData = getCachedData(CACHE_KEY);
      setDataTahap1(cachedData.data.tahap1);
      setDataTahap2(cachedData.data.tahap2);
      setDataTahap3(cachedData.data.tahap3);
      setLoading(false);
    } else {
      fetchAllData();
    }
  }, [isCached, getCachedData, fetchAllData]);

  const getActiveData = () => {
    switch (activeTab) {
      case 'tahap1': return dataTahap1;
      case 'tahap2': return dataTahap2;
      case 'tahap3': return dataTahap3;
      default: return [];
    }
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const processData = (rawData) => {
    return rawData.map(item => ({
      kecamatan: item.kecamatan,
      desa: item.desa || item.nama_desa,
      status: item.sts || item.status,
      realisasi: parseInt(String(item.Realisasi || item.realisasi || '0').replace(/,/g, ''))
    }));
  };

  const activeData = getActiveData();
  const processedData = processData(activeData);

  // Apply filters
  const filteredData = processedData.filter(item => {
    const matchSearch = !searchTerm || 
      item.desa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kecamatan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchKecamatan = !filterKecamatan || item.kecamatan === filterKecamatan;
    const matchStatus = !filterStatus || item.status === filterStatus;
    const matchCardStatus = !selectedStatusFromCard || item.status === selectedStatusFromCard;
    return matchSearch && matchKecamatan && matchStatus && matchCardStatus;
  });

  // Group by kecamatan
  const groupedData = filteredData.reduce((acc, item) => {
    if (!acc[item.kecamatan]) {
      acc[item.kecamatan] = [];
    }
    acc[item.kecamatan].push(item);
    return acc;
  }, {});

  // Statistics
  const totalDesa = processedData.length;
  const totalRealisasi = processedData.reduce((sum, item) => sum + item.realisasi, 0);
  const avgPerDesa = totalDesa > 0 ? totalRealisasi / totalDesa : 0;

  const uniqueKecamatans = [...new Set(processedData.map(item => item.kecamatan))];
  const uniqueStatuses = [...new Set(processedData.map(item => item.status))];

  // Dynamic Status Detection - Group by unique status (untuk Table tab - terpengaruh filter)
  const statusSummary = filteredData.reduce((acc, item) => {
    const status = item.status || 'Tidak Ada Status';
    if (!acc[status]) {
      acc[status] = {
        count: 0,
        total: 0,
        items: []
      };
    }
    acc[status].count += 1;
    acc[status].total += item.realisasi;
    acc[status].items.push(item);
    return acc;
  }, {});

  // Get status configuration for colors and icons
  const getStatusConfig = (status) => {
    const statusLower = status.toLowerCase();
    
    // Check for keywords to determine color scheme
    if (statusLower.includes('dicairkan') || statusLower.includes('selesai') || statusLower.includes('cair')) {
      return {
        color: 'green',
        bgClass: 'bg-green-100',
        textClass: 'text-green-600',
        borderClass: 'border-green-200',
        hoverBorderClass: 'hover:border-green-400',
        badgeBg: 'bg-green-500',
        badgeBorder: 'border-green-300',
        gradient: 'from-green-500 to-emerald-600'
      };
    } else if (statusLower.includes('proses') || statusLower.includes('spp') || statusLower.includes('pending')) {
      return {
        color: 'yellow',
        bgClass: 'bg-yellow-100',
        textClass: 'text-yellow-600',
        borderClass: 'border-yellow-200',
        hoverBorderClass: 'hover:border-yellow-400',
        badgeBg: 'bg-yellow-500',
        badgeBorder: 'border-yellow-300',
        gradient: 'from-yellow-500 to-amber-600'
      };
    } else if (statusLower.includes('kembali') || statusLower.includes('tolak') || statusLower.includes('batal')) {
      return {
        color: 'red',
        bgClass: 'bg-red-100',
        textClass: 'text-red-600',
        borderClass: 'border-red-200',
        hoverBorderClass: 'hover:border-red-400',
        badgeBg: 'bg-red-500',
        badgeBorder: 'border-red-300',
        gradient: 'from-red-500 to-rose-600'
      };
    } else if (statusLower.includes('belum') || statusLower.includes('tidak')) {
      return {
        color: 'gray',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-600',
        borderClass: 'border-gray-200',
        hoverBorderClass: 'hover:border-gray-400',
        badgeBg: 'bg-gray-500',
        badgeBorder: 'border-gray-300',
        gradient: 'from-gray-500 to-slate-600'
      };
    } else {
      // Default blue for unknown status
      return {
        color: 'blue',
        bgClass: 'bg-blue-100',
        textClass: 'text-blue-600',
        borderClass: 'border-blue-200',
        hoverBorderClass: 'hover:border-blue-400',
        badgeBg: 'bg-blue-500',
        badgeBorder: 'border-blue-300',
        gradient: 'from-blue-500 to-indigo-600'
      };
    }
  };

  // Charts data
  const statusCounts = processedData.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = {
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(239, 68, 68, 0.8)',
      ],
      borderWidth: 0,
    }],
  };

  const kecamatanRealisasi = Object.entries(groupedData).map(([kecamatan, desas]) => ({
    kecamatan,
    total: desas.reduce((sum, d) => sum + d.realisasi, 0)
  })).sort((a, b) => b.total - a.total);

  const handleExportExcel = () => {
    const exportData = filteredData.map((item, index) => ({
      No: index + 1,
      Kecamatan: item.kecamatan,
      Desa: item.desa,
      Status: item.status,
      'Realisasi (Rp)': item.realisasi.toLocaleString('id-ID')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `BHPRD ${activeTab}`);
    XLSX.writeFile(wb, `BHPRD_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data berhasil diexport');
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Pilih file JSON terlebih dahulu');
      return;
    }

    const endpoints = {
      'tahap1': '/bhprd-t1/upload',
      'tahap2': '/bhprd-t2/upload',
      'tahap3': '/bhprd-t3/upload',
    };

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await api.post(endpoints[activeTab], formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowUploadModal(false);
        setUploadFile(null);
        fetchAllData();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Gagal mengupload file');
    } finally {
      setUploading(false);
    }
  };

  // Handle tab view switch and clear table filters when switching to Table view
  const handleSetActiveTabView = (view) => {
    if (view === 'table') {
      // clear any active filters so Table starts unfiltered when coming from Statistic
      setSearchTerm('');
      setFilterKecamatan('');
      setFilterStatus('');
      setSelectedStatusFromCard('');
    }
    setActiveTabView(view);
  };

  const tabs = [
    { id: 'tahap1', label: 'Tahap 1', color: 'blue' },
    { id: 'tahap2', label: 'Tahap 2', color: 'green' },
    { id: 'tahap3', label: 'Tahap 3', color: 'purple' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="mx-auto">
        {/* Hero Welcome Banner dengan Gradient Modern */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 rounded-3xl shadow-2xl p-8 mb-8 overflow-hidden">
          {/* Animated Background Patterns */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
          
          <div className="relative z-10">
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                BHPRD (Bagi Hasil Pajak Retribusi Daerah) 2025
              </h1>
              <p className="text-white text-opacity-90 text-base md:text-lg">
                Data realisasi bagi hasil pajak dan retribusi daerah untuk desa
              </p>
            </div>
            
            {/* Quick Stats in Hero */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-emerald-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-emerald-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs md:text-sm mb-1 font-medium">Total Desa</p>
                <p className="text-white text-xl md:text-2xl font-bold">{totalDesa}</p>
              </div>
              <div className="bg-green-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-green-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs md:text-sm mb-1 font-medium">Total Realisasi</p>
                <p className="text-white text-base md:text-lg font-bold truncate">{formatRupiah(totalRealisasi)}</p>
              </div>
              <div className="bg-teal-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-teal-400 border-opacity-40 shadow-lg col-span-2 md:col-span-1">
                <p className="text-white text-opacity-90 text-xs md:text-sm mb-1 font-medium">Rata-rata/Desa</p>
                <p className="text-white text-base md:text-lg font-bold truncate">{formatRupiah(avgPerDesa)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 p-1 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg w-fit min-w-full">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <button
            onClick={() => setShowUploadModal(true)}
            className="group px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <FiUpload className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-medium">Update Data</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="group px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <FiDownload className="w-5 h-5 group-hover:translate-y-1 transition-transform duration-300" />
            <span className="font-medium">Export Excel</span>
          </button>
        </div>

        {/* Tab View Navigation (Statistik vs Tabel) */}
        <div className="mb-8 mx-4">
          <div className="flex gap-2 bg-white/90 backdrop-blur-sm rounded-2xl p-2 shadow-lg">
            <button
              onClick={() => handleSetActiveTabView('statistic')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTabView === 'statistic'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiBarChart2 className="w-5 h-5" />
              <span>Statistik</span>
            </button>
            <button
              onClick={() => handleSetActiveTabView('table')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTabView === 'table'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiUsers className="w-5 h-5" />
              <span>Tabel Data</span>
            </button>
          </div>
        </div>

      {/* Tab Content - Statistic */}
      {activeTabView === 'statistic' && (
        <div className="space-y-6 mb-8">
      {/* Charts Section */}
      <div className="space-y-6 mb-8">
        {/* Bar Chart - Kecamatan */}
        <div className="group bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 p-8 border border-gray-100/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                Semua Kecamatan
              </h3>
              <p className="text-sm text-gray-500">Realisasi Tahap {activeTab === 'tahap1' ? '1' : activeTab === 'tahap2' ? '2' : '3'}</p>
            </div>
          </div>
          <div className="h-96 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-green-50/50 rounded-2xl"></div>
            <div className="relative h-full p-4">
              <Bar 
                data={{
                  labels: kecamatanRealisasi.map(k => k.kecamatan),
                  datasets: [{
                    label: 'Total Realisasi',
                    data: kecamatanRealisasi.map(k => k.total),
                    backgroundColor: (context) => {
                      const ctx = context.chart.ctx;
                      const gradient = ctx.createLinearGradient(0, 0, 0, 350);
                      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
                      gradient.addColorStop(1, 'rgba(5, 150, 105, 0.7)');
                      return gradient;
                    },
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2,
                    borderRadius: 10,
                    hoverBackgroundColor: (context) => {
                      const ctx = context.chart.ctx;
                      const gradient = ctx.createLinearGradient(0, 0, 0, 350);
                      gradient.addColorStop(0, 'rgba(16, 185, 129, 1)');
                      gradient.addColorStop(1, 'rgba(5, 150, 105, 0.9)');
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
                        label: (context) => formatRupiah(context.raw)
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
                        color: '#64748b',
                        maxRotation: 45,
                        minRotation: 45
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
                  data={statusChartData}
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
        </div>
      )}

      {/* Tab Content - Table */}
      {activeTabView === 'table' && (
        <div className="space-y-6">
          {/* Status Summary Cards - Dynamic */}
          {Object.keys(statusSummary).length > 0 && (
            <div className={`grid grid-cols-1 ${Object.keys(statusSummary).length === 2 ? 'md:grid-cols-2' : Object.keys(statusSummary).length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' : 'md:grid-cols-3'} gap-6 mb-8`}>
              {Object.entries(statusSummary).map(([status, data]) => {
                const config = getStatusConfig(status);
                const percentage = totalDesa > 0 ? ((data.count / totalDesa) * 100).toFixed(1) : 0;
                const isSelected = selectedStatusFromCard === status;
                
                return (
                  <div 
                    key={status}
                    onClick={() => {
                      if (selectedStatusFromCard === status) {
                        setSelectedStatusFromCard('');
                        setFilterStatus('');
                      } else {
                        setSelectedStatusFromCard(status);
                        setFilterStatus('');
                      }
                    }}
                    className={`group bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 cursor-pointer ${
                      isSelected 
                        ? `${config.borderClass.replace('200', '500')} ring-4 ring-opacity-50 ${config.borderClass.replace('border-', 'ring-').replace('200', '300')}` 
                        : `${config.borderClass} ${config.hoverBorderClass}`
                    }`}
                    title={`Klik untuk filter data dengan status: ${status}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 ${config.bgClass} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`}>
                        <Activity className={`w-6 h-6 ${config.textClass}`} />
                      </div>
                      <div className="text-right flex-1 ml-3">
                        <p className="text-sm text-gray-600 font-medium break-words" title={status}>
                          {status}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {percentage}%
                        </p>
                      </div>
                    </div>
                    <p className={`text-4xl font-bold ${config.textClass} mb-2`}>{data.count}</p>
                    <p className="text-sm text-gray-600 mb-2">
                      {isSelected ? '✓ Filter Aktif' : 'Desa dengan status ini'}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Total Nominal</p>
                      <p className={`text-lg font-bold ${config.textClass.replace('600', '700')}`}>
                        {formatRupiah(data.total)}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="mt-3 pt-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
                          <span>🔍</span> Klik lagi untuk hapus filter
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

      {/* Filters & Search */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-6 mb-6 border border-gray-100/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari desa atau kecamatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            />
          </div>

          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterKecamatan}
              onChange={(e) => setFilterKecamatan(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white transition-all duration-200"
            >
              <option value="">Semua Kecamatan</option>
              {uniqueKecamatans.map(kec => (
                <option key={kec} value={kec}>{kec}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FiActivity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white transition-all duration-200"
            >
              <option value="">Semua Status</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || filterKecamatan || filterStatus || selectedStatusFromCard) && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-sm text-gray-600 font-medium">Filter Aktif:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm">
                <FiSearch className="w-3 h-3" />
                {searchTerm}
                <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-emerald-900">
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
            {selectedStatusFromCard && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold border-2 border-indigo-300">
                <span>🔍</span>
                Card: {selectedStatusFromCard}
                <button 
                  onClick={() => setSelectedStatusFromCard('')} 
                  className="ml-1 hover:text-indigo-900"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterKecamatan('');
                setFilterStatus('');
                setSelectedStatusFromCard('');
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium underline"
            >
              Reset Semua
            </button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Data per Kecamatan</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">No</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Kecamatan</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Desa</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(groupedData).map(([kecamatan, desas]) => {
                const isExpanded = expandedKecamatan[kecamatan];

                return (
                  <React.Fragment key={kecamatan}>
                    <tr
                      className="bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors duration-200"
                      onClick={() => setExpandedKecamatan(prev => ({ ...prev, [kecamatan]: !prev[kecamatan] }))}
                    >
                      <td colSpan="3" className="px-6 py-4 font-semibold text-gray-800">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
                          <span>{kecamatan}</span>
                          <span className="ml-2 px-2 py-1 bg-emerald-200 text-emerald-800 text-xs rounded-full">
                            {desas.length} desa
                          </span>
                        </div>
                      </td>
                      <td colSpan="2" className="px-6 py-4 text-right font-semibold text-gray-800">
                        {formatRupiah(desas.reduce((sum, d) => sum + d.realisasi, 0))}
                      </td>
                    </tr>
                    {isExpanded && desas.map((item, idx) => {
                      const config = getStatusConfig(item.status);
                      const badgeClasses = `${config.bgClass} ${config.textClass.replace('600', '800')} ${config.borderClass}`;

                      return (
                        <tr key={`${kecamatan}-${idx}`} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-3 text-sm text-gray-900">{idx + 1}</td>
                          <td className="px-6 py-3 text-sm text-gray-500"></td>
                          <td className="px-6 py-3 text-sm text-gray-900 font-medium">{item.desa}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClasses}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-right text-gray-900 font-medium">
                            {formatRupiah(item.realisasi)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Upload Data BHPRD {tabs.find(t => t.id === activeTab)?.label}</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-gray-700">
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
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Format: JSON dengan struktur yang sesuai</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default BhprdDashboard;
