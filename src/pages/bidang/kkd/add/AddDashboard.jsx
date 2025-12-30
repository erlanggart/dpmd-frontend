// ADD Dashboard dengan Modern Design
import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiMapPin, FiUsers, FiTrendingUp, FiDownload, FiUpload, FiChevronDown, FiChevronUp, FiX, FiSearch, FiFilter } from 'react-icons/fi';
import { Activity } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from "../../../../api";
import { isVpnUser } from "../../../../utils/vpnHelper";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const AddDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedStatusFromCard, setSelectedStatusFromCard] = useState('');
  const [activeTabView, setActiveTabView] = useState('statistic'); // 'statistic' or 'table'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // VPN users use /vpn-core/add/data, normal users use /add/data
      const endpoint = isVpnUser() ? '/vpn-core/add/data' : '/add/data';
      const response = await api.get(endpoint);
      setData(response.data.data || []);
    } catch (err) {
      console.warn('Error loading ADD:', err);
      setData([]);
      toast.error('Gagal memuat data ADD');
    } finally {
      setLoading(false);
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

  const rawActiveData = processData(data);
  
  // Apply filters and search
  const activeData = rawActiveData.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.desa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kecamatan?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesKecamatan = filterKecamatan === '' || item.kecamatan === filterKecamatan;
    const matchesStatus = filterStatus === '' || item.status === filterStatus;
    const matchesCardStatus = selectedStatusFromCard === '' || item.status === selectedStatusFromCard;
    
    return matchesSearch && matchesKecamatan && matchesStatus && matchesCardStatus;
  });

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

  // (Previously had unfiltered stats here; removed to simplify behavior)
  
  // Stats dan status summary untuk Tab Table (terpengaruh filter)
  const stats = calculateStats(activeData);
  
  const statusSummary = activeData.reduce((acc, item) => {
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

  // Handle tab switch and clear table filters when switching to Table view
  const handleSetActiveTab = (view) => {
    if (view === 'table') {
      // clear any active filters so Table starts unfiltered when coming from Statistic
      setSearchTerm('');
      setFilterKecamatan('');
      setFilterStatus('');
      setSelectedStatusFromCard('');
    }
    setActiveTabView(view);
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
      await api.post('/add/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Data berhasil diupload!');
      setShowUploadModal(false);
      setUploadFile(null);
      fetchData();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Gagal upload data');
    } finally {
      setUploading(false);
    }
  };

  const exportToExcel = () => {
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
    
    const fileName = `ADD_${new Date().toISOString().split('T')[0]}.xlsx`;
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
    <div className="min-h-screen ">
      <div className="mx-auto">
        {/* Hero Welcome Banner dengan Gradient Modern */}
        <div className="relative bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 rounded-md shadow-md p-8 mb-8 overflow-hidden">
          {/* Animated Background Patterns */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
          
          <div className="relative z-10">
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              ADD (Alokasi Dana Desa)
              </h1>
              <p className="text-white text-opacity-90 text-base md:text-lg">
                Monitoring dan manajemen Alokasi Dana Desa (ADD)
              </p>
            </div>
            
            {/* Quick Stats in Hero */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-cyan-700 bg-opacity-70 backdrop-blur-md rounded-xl p-3 md:p-4 border border-cyan-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs mb-1 font-medium">Total Kecamatan</p>
                <p className="text-white text-lg md:text-xl font-bold">{stats.totalKecamatan}</p>
              </div>
              <div className="bg-blue-700 bg-opacity-70 backdrop-blur-md rounded-xl p-3 md:p-4 border border-blue-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs mb-1 font-medium">Total Desa</p>
                <p className="text-white text-lg md:text-xl font-bold">{stats.totalDesa}</p>
              </div>
              <div className="bg-indigo-700 bg-opacity-70 backdrop-blur-md rounded-xl p-3 md:p-4 border border-indigo-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs mb-1 font-medium truncate">Total Alokasi</p>
                <p className="text-white text-[10px] md:text-xs font-bold break-all leading-tight">{formatCurrency(stats.totalRealisasi)}</p>
              </div>
              <div className="bg-purple-700 bg-opacity-70 backdrop-blur-md rounded-xl p-3 md:p-4 border border-purple-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs mb-1 font-medium truncate">Rata-rata/Desa</p>
                <p className="text-white text-[10px] md:text-xs font-bold break-all leading-tight">{formatCurrency(stats.avgPerDesa)}</p>
              </div>
            </div>
            
            {/* Status Badges - Dynamic */}
            {Object.keys(statusSummary).length > 0 && (
              <div className="mt-6 pt-6 border-t border-white border-opacity-20">
                <div className="flex flex-wrap gap-3">
                  {Object.entries(statusSummary).map(([status, data]) => {
                    const config = getStatusConfig(status);
                    return (
                      <div 
                        key={status}
                        className={`inline-flex items-center gap-2 px-4 py-2 ${config.badgeBg} bg-opacity-30 backdrop-blur-sm border ${config.badgeBorder} border-opacity-40 rounded-lg`}
                      >
                        <div className={`w-2 h-2 ${config.badgeBg} bg-opacity-70 rounded-full animate-pulse`}></div>
                        <span className="text-sm font-medium text-white">
                          {status}: {data.count} desa
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex gap-2 bg-white/90 backdrop-blur-sm rounded-2xl p-2 shadow-lg mx-4">
            <button
              onClick={() => handleSetActiveTab('statistic')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTabView === 'statistic'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>Statistik</span>
            </button>
            <button
              onClick={() => handleSetActiveTab('table')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTabView === 'table'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
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
          <div className="group bg-white/90 backdrop-blur-md rounded-xl shadow-md hover:shadow-3xl transition-all duration-500 p-8 border border-gray-100/50">
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
                      data: Object.entries(groupedData).map(([, desas]) => 
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
          <div className="group bg-white/90 backdrop-blur-md rounded-xl shadow-md hover:shadow-3xl transition-all duration-500 p-8 border border-gray-100/50">
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
                  const percentage = stats.totalDesa > 0 ? ((data.count / stats.totalDesa) * 100).toFixed(1) : 0;
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
                          {formatCurrency(data.total)}
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
              {(searchTerm || filterKecamatan || filterStatus || selectedStatusFromCard) && (
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
                                  {desas.map((desa, index) => {
                                    const config = getStatusConfig(desa.status);
                                    const badgeClasses = `${config.bgClass} ${config.textClass.replace('600', '800')} ${config.borderClass}`;

                                    return (
                                      <tr key={index} className="hover:bg-gray-100 transition-colors">
                                        <td className="px-4 py-2 text-sm text-gray-700">{index + 1}</td>
                                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">{desa.desa}</td>
                                        <td className="px-4 py-2 text-sm">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClasses}`}>
                                            {desa.status}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-700 font-semibold">{formatCurrency(desa.realisasi)}</td>
                                      </tr>
                                    );
                                  })}
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
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Update Data ADD</h3>
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
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer hover:border-cyan-400"
              />
              {uploadFile && (
                <p className="mt-2 text-sm text-gray-600">
                  File terpilih: <span className="font-medium">{uploadFile.name}</span>
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddDashboard;
