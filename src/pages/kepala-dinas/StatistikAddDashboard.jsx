// Statistik ADD Dashboard untuk Core Dashboard (Kepala Dinas) - View Only
import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiMapPin, FiUsers, FiTrendingUp, FiDownload, FiChevronDown, FiChevronUp, FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { Activity } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const StatistikAddDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/add/data');
      setData(response.data.data || []);
    } catch (err) {
      console.warn('Error loading ADD:', err);
      setData([]);
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
    
    return matchesSearch && matchesKecamatan && matchesStatus;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Welcome Banner dengan Gradient Modern */}
        <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-3xl shadow-2xl p-8 mb-8 overflow-hidden">
          {/* Animated Background Patterns */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
          
          <div className="relative z-10">
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                📊 Statistik Alokasi Dana Desa (ADD)
              </h1>
              <p className="text-white text-opacity-90 text-base md:text-lg">
                Monitoring Alokasi Dana Desa
              </p>
            </div>
            
            {/* Quick Stats in Hero */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-purple-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-purple-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs md:text-sm mb-1 font-medium">Total Kecamatan</p>
                <p className="text-white text-xl md:text-2xl font-bold">{stats.totalKecamatan}</p>
              </div>
              <div className="bg-pink-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-pink-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs md:text-sm mb-1 font-medium">Total Desa</p>
                <p className="text-white text-xl md:text-2xl font-bold">{stats.totalDesa}</p>
              </div>
              <div className="bg-indigo-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-indigo-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs md:text-sm mb-1 font-medium">Total Alokasi</p>
                <p className="text-white text-base md:text-lg font-bold truncate">{formatCurrency(stats.totalRealisasi)}</p>
              </div>
              <div className="bg-fuchsia-700 bg-opacity-70 backdrop-blur-md rounded-xl p-4 border border-fuchsia-400 border-opacity-40 shadow-lg">
                <p className="text-white text-opacity-90 text-xs md:text-sm mb-1 font-medium">Rata-rata/Desa</p>
                <p className="text-white text-base md:text-lg font-bold truncate">{formatCurrency(stats.avgPerDesa)}</p>
              </div>
            </div>
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
            <p className="text-2xl sm:text-3xl font-bold text-white animate-fade-in">{stats.totalKecamatan}</p>
          </div>

          <div className="group bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-default">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <FiUsers className="w-7 h-7 text-purple-600" />
              </div>
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Desa</h3>
            <p className="text-2xl sm:text-3xl font-bold text-white animate-fade-in">{stats.totalDesa}</p>
          </div>

          <div className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-default">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <FiDollarSign className="w-7 h-7 text-green-600" />
              </div>
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Alokasi</h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-white animate-fade-in break-words">{formatCurrency(stats.totalRealisasi)}</p>
          </div>

          <div className="group bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-default">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <FiTrendingUp className="w-7 h-7 text-orange-600" />
              </div>
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Rata-rata per Desa</h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-white animate-fade-in break-words">{formatCurrency(stats.avgPerDesa)}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6 mb-8">
          {/* Bar Chart - Kecamatan */}
          <div className="bg-gradient-to-br from-white via-cyan-50 to-blue-50 rounded-3xl shadow-2xl overflow-hidden border border-cyan-100 hover:shadow-3xl transition-all duration-300">
            <div className="bg-white bg-opacity-80 backdrop-blur-sm px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-10 bg-gradient-to-b from-cyan-500 via-blue-500 to-indigo-500 rounded-full shadow-lg"></div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    Alokasi per Kecamatan
                  </h3>
                </div>
                <span className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-sm font-semibold shadow-lg">
                  {Object.keys(groupedData).length} Kecamatan
                </span>
              </div>
            </div>
            <div className="p-8 bg-white">
              <div className="h-96 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-2xl"></div>
                <div className="relative h-full">
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
                      legend: {
                        display: true,
                        position: 'top'
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                          label: (context) => `Total: ${formatCurrency(context.parsed.y)}`
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => {
                            if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)} M`;
                            if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)} Jt`;
                            return `Rp ${value.toLocaleString('id-ID')}`;
                          },
                          font: { size: 11 }
                        },
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      },
                      x: {
                        ticks: {
                          font: { size: 10 },
                          maxRotation: 45,
                          minRotation: 45,
                          autoSkip: false
                        },
                        grid: {
                          display: false
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

          {/* Pie Chart */}
          <div className="bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-3xl shadow-2xl overflow-hidden border border-purple-100 hover:shadow-3xl transition-all duration-300">
            <div className="bg-white bg-opacity-80 backdrop-blur-sm px-8 py-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-3 h-10 bg-gradient-to-b from-purple-500 via-pink-500 to-rose-500 rounded-full shadow-lg"></div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Distribusi Status
                </h3>
              </div>
            </div>
            <div className="p-8 bg-white flex justify-center">
              <div className="w-full max-w-2xl h-96 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl"></div>
                <div className="relative h-full">
                  <Pie
                    data={{
                      labels: (() => {
                        const statusCounts = {};
                        activeData.forEach(d => {
                          statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
                        });
                        return Object.keys(statusCounts);
                      })(),
                      datasets: [{
                        data: (() => {
                          const statusCounts = {};
                          activeData.forEach(d => {
                            statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
                          });
                          return Object.values(statusCounts);
                        })(),
                        backgroundColor: [
                          'rgba(147, 51, 234, 0.8)',
                          'rgba(236, 72, 153, 0.8)',
                          'rgba(168, 85, 247, 0.8)',
                          'rgba(219, 39, 119, 0.8)',
                          'rgba(192, 132, 252, 0.8)',
                        ],
                        borderColor: [
                          'rgba(147, 51, 234, 1)',
                          'rgba(236, 72, 153, 1)',
                          'rgba(168, 85, 247, 1)',
                          'rgba(219, 39, 119, 1)',
                          'rgba(192, 132, 252, 1)',
                        ],
                        borderWidth: 2,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 15,
                            font: { size: 12 }
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: 12,
                          cornerRadius: 8
                        }
                      }
                    }}
                  />
                </div>
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
                                  {desas.map((desa, index) => (
                                    <tr key={index} className="hover:bg-gray-100 transition-colors">
                                      <td className="px-4 py-2 text-sm text-gray-700">{index + 1}</td>
                                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">{desa.desa}</td>
                                      <td className="px-4 py-2 text-sm">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          {desa.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-700 font-semibold">{formatCurrency(desa.realisasi)}</td>
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

export default StatistikAddDashboard;
