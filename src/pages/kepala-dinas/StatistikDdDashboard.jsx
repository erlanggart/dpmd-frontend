// Statistik DD Dashboard untuk Core Dashboard (Kepala Dinas) - View Only
import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiDollarSign, FiMapPin, FiUsers, FiTrendingUp, FiDownload, FiChevronDown, FiChevronUp, FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { Activity } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const StatistikDdDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('earmarked-t1');
  const [loading, setLoading] = useState(true);
  const [dataEarmarkedT1, setDataEarmarkedT1] = useState([]);
  const [dataEarmarkedT2, setDataEarmarkedT2] = useState([]);
  const [dataNonEarmarkedT1, setDataNonEarmarkedT1] = useState([]);
  const [dataNonEarmarkedT2, setDataNonEarmarkedT2] = useState([]);
  const [dataInsentif, setDataInsentif] = useState([]);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    
    // Fetch Earmarked T1
    try {
      const response1 = await api.get('/dd-earmarked-t1/data');
      setDataEarmarkedT1(response1.data.data || []);
    } catch (err) {
      console.warn('Error loading DD Earmarked T1:', err);
      setDataEarmarkedT1([]);
    }

    // Fetch Earmarked T2
    try {
      const response2 = await api.get('/dd-earmarked-t2/data');
      setDataEarmarkedT2(response2.data.data || []);
    } catch (err) {
      console.warn('Error loading DD Earmarked T2:', err);
      setDataEarmarkedT2([]);
    }

    // Fetch Non-Earmarked T1
    try {
      const response3 = await api.get('/dd-nonearmarked-t1/data');
      setDataNonEarmarkedT1(response3.data.data || []);
    } catch (err) {
      console.warn('Error loading DD Non-Earmarked T1:', err);
      setDataNonEarmarkedT1([]);
    }

    // Fetch Non-Earmarked T2
    try {
      const response4 = await api.get('/dd-nonearmarked-t2/data');
      setDataNonEarmarkedT2(response4.data.data || []);
    } catch (err) {
      console.warn('Error loading DD Non-Earmarked T2:', err);
      setDataNonEarmarkedT2([]);
    }

    // Fetch Insentif DD
    try {
      const response5 = await api.get('/insentif-dd/data');
      setDataInsentif(response5.data.data || []);
    } catch (err) {
      console.warn('Error loading Insentif DD:', err);
      setDataInsentif([]);
    }

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
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/core-dashboard')}
            className="group flex items-center gap-2 text-gray-600 hover:text-cyan-600 transition-colors duration-200 mb-4"
          >
            <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Kembali ke Dashboard</span>
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Statistik Dana Desa
          </h1>
          <p className="text-gray-600">
            Monitoring Dana Desa (DD) Earmarked, Non-Earmarked, dan Insentif
          </p>
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

        {/* Export Button */}
        <div className="flex gap-3 mb-8">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart - Kecamatan */}
          <div className="group bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 p-8 border border-gray-100/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Top 10 Kecamatan
                </h3>
                <p className="text-sm text-gray-500">Berdasarkan Total Alokasi</p>
              </div>
            </div>
            <div className="h-[350px] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 rounded-2xl"></div>
              <div className="relative h-full p-4">
                <Bar
                  data={{
                    labels: Object.keys(groupedData).slice(0, 10),
                    datasets: [{
                      label: 'Total Alokasi',
                      data: Object.entries(groupedData).slice(0, 10).map(([_, desas]) => 
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
            <div className="h-[350px] flex items-center justify-center relative">
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
    </div>
  );
};

export default StatistikDdDashboard;
