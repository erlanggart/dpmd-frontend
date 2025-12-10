import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp, BarChart3, Activity, DollarSign, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import api from '../../api';
import * as XLSX from 'xlsx';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const StatistikBankeuT2 = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const endpoint = isVpnUser() ? '/vpn-core/bankeu-t2/data' : '/bankeu-t2/data';
      const response = await api.get(endpoint);
      setData(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching Bantuan Keuangan Tahap 2 data:', err);
      setError('Gagal memuat data Bantuan Keuangan Tahap 2');
    } finally {
      setLoading(false);
    }
  };

  // Process data
  const processedData = data.map(item => ({
    kecamatan: item.kecamatan,
    desa: item.desa,
    status: item.sts,
    realisasi: parseInt(item.Realisasi?.replace(/,/g, '') || '0')
  }));

  // Statistics
  const totalDesa = processedData.length;
  const totalAlokasi = processedData.reduce((sum, item) => sum + item.realisasi, 0);
  const avgPerDesa = totalDesa > 0 ? Math.round(totalAlokasi / totalDesa) : 0;

  // Kecamatan statistics
  const kecamatanStats = processedData.reduce((acc, item) => {
    if (!acc[item.kecamatan]) {
      acc[item.kecamatan] = { total: 0, count: 0 };
    }
    acc[item.kecamatan].total += item.realisasi;
    acc[item.kecamatan].count += 1;
    return acc;
  }, {});

  const totalKecamatan = Object.keys(kecamatanStats).length;

  // All kecamatan sorted by total alokasi
  const allKecamatan = Object.entries(kecamatanStats)
    .map(([name, stats]) => ({ name, total: stats.total }))
    .sort((a, b) => b.total - a.total);

  // Chart data - All Kecamatan
  const kecamatanChartData = {
    labels: allKecamatan.map(k => k.name),
    datasets: [{
      label: 'Total Alokasi (Rp)',
      data: allKecamatan.map(k => k.total),
      backgroundColor: allKecamatan.map((_, index) => {
        const colors = [
          'rgba(37, 99, 235, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(96, 165, 250, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(129, 140, 248, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(192, 132, 252, 0.8)',
          'rgba(217, 70, 239, 0.8)',
          'rgba(232, 121, 249, 0.8)',
        ];
        return colors[index % colors.length];
      }),
      borderColor: allKecamatan.map((_, index) => {
        const colors = [
          'rgba(37, 99, 235, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(96, 165, 250, 1)',
          'rgba(99, 102, 241, 1)',
          'rgba(129, 140, 248, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(192, 132, 252, 1)',
          'rgba(217, 70, 239, 1)',
          'rgba(232, 121, 249, 1)',
        ];
        return colors[index % colors.length];
      }),
      borderWidth: 3,
      borderRadius: 12,
      borderSkipped: false,
    }]
  };

  // Status distribution
  const statusCounts = processedData.reduce((acc, item) => {
    const status = item.status || 'Tidak Ada Status';
    if (!acc[status]) {
      acc[status] = 0;
    }
    acc[status]++;
    return acc;
  }, {});

  const statusChartData = {
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',   // green - Dana Telah Dicairkan
        'rgba(234, 179, 8, 0.8)',   // yellow - Proses SPP,SPM,SP2D
        'rgba(59, 130, 246, 0.8)',  // blue - Dikembalikan ke Desa
        'rgba(168, 85, 247, 0.8)',  // purple - Dikembalikan ke Kecamatan
        'rgba(249, 115, 22, 0.8)',  // orange - Review BPKAD
        'rgba(236, 72, 153, 0.8)',  // pink - Review DPMD
        'rgba(99, 102, 241, 0.8)',  // indigo - Sedang di Proses
        'rgba(156, 163, 175, 0.8)', // gray - Belum Mengajukan
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)',
        'rgba(234, 179, 8, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(168, 85, 247, 1)',
        'rgba(249, 115, 22, 1)',
        'rgba(236, 72, 153, 1)',
        'rgba(99, 102, 241, 1)',
        'rgba(156, 163, 175, 1)',
      ],
      borderWidth: 2,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let value = context.parsed.y;
            if (value >= 1000000000) {
              return `Total Alokasi: Rp ${(value / 1000000000).toFixed(2)} Miliar`;
            } else if (value >= 1000000) {
              return `Total Alokasi: Rp ${(value / 1000000).toFixed(2)} Juta`;
            }
            return `Total Alokasi: Rp ${value.toLocaleString('id-ID')}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            if (value >= 1000000000) {
              return `Rp ${(value / 1000000000).toFixed(1)} M`;
            } else if (value >= 1000000) {
              return `Rp ${(value / 1000000).toFixed(0)} Jt`;
            }
            return `Rp ${value.toLocaleString('id-ID')}`;
          }
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Group data by kecamatan
  const groupedByKecamatan = processedData.reduce((acc, item) => {
    if (!acc[item.kecamatan]) {
      acc[item.kecamatan] = [];
    }
    acc[item.kecamatan].push(item);
    return acc;
  }, {});

  const handleExport = () => {
    const exportData = processedData.map(item => ({
      'Kecamatan': item.kecamatan,
      'Desa': item.desa,
      'Status': item.status,
      'Alokasi': formatRupiah(item.realisasi)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statistik Bantuan Keuangan Tahap 2');
    XLSX.writeFile(wb, `Statistik_Bantuan Keuangan Tahap 2_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-lg text-gray-600 font-medium">Memuat data Bantuan Keuangan Tahap 2...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border-l-4 border-red-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Error</h3>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-blue-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/core-dashboard/dashboard')}
          className="group flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition-all duration-300 bg-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="font-semibold">Kembali ke Dashboard</span>
        </button>

        {/* Hero Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 rounded-3xl shadow-2xl p-8 mb-8 overflow-hidden">
          {/* Animated decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-blue-400 opacity-20 rounded-full blur-3xl"></div>

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                  Statistik Bantuan Keuangan Tahap 2
                </h1>
                <p className="text-blue-100 mt-1">Dana Desa</p>
              </div>
            </div>

            {/* Quick Stats Pills */}
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="bg-blue-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-cyan-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <Activity className="w-4 h-4 text-white animate-pulse" />
                <span className="text-sm font-semibold text-white">{totalDesa} Desa</span>
              </div>
              <div className="bg-blue-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-cyan-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <BarChart3 className="w-4 h-4 text-white animate-pulse" />
                <span className="text-sm font-semibold text-white">{totalKecamatan} Kecamatan</span>
              </div>
              <div className="bg-blue-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-cyan-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <TrendingUp className="w-4 h-4 text-white animate-pulse" />
                <span className="text-sm font-semibold text-white">{formatRupiah(totalAlokasi)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card with Live Badge */}
        <div className="relative bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 overflow-hidden border border-gray-100">
          {/* Gradient decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100 to-blue-100 opacity-30 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-50 to-blue-50 opacity-50 rounded-full -ml-24 -mb-24"></div>

          <div className="relative z-10">
            {/* Live Badge */}
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Ringkasan Data</h2>
              <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-sm font-semibold">Live Data</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-6 border border-blue-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Desa</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-600">{totalDesa}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-6 border border-blue-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 font-medium">Total Alokasi</p>
                    <p className="text-base md:text-lg font-bold text-purple-600 break-words">{formatRupiah(totalAlokasi)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-6 border border-blue-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 font-medium">Rata-rata/Desa</p>
                    <p className="text-base md:text-lg font-bold text-blue-600 break-words">{formatRupiah(avgPerDesa)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleExport}
                className="bg-gradient-to-r from-blue-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6 md:space-y-8">
          {/* Top Kecamatan Chart - Full Width */}
          <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-3xl shadow-2xl p-6 md:p-8 border border-blue-100 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                <div className="w-3 h-10 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-lg"></div>
                Semua Kecamatan - Total Alokasi
              </h3>
              <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full text-sm font-semibold shadow-lg">
                {allKecamatan.length} Kecamatan
              </div>
            </div>
            <div className="h-96 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-2xl"></div>
              <div className="relative h-full p-4">
                <Bar data={kecamatanChartData} options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      display: false
                    }
                  }
                }} />
              </div>
            </div>
          </div>

          {/* Status Distribution Chart - Centered with better spacing */}
          <div className="bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-3xl shadow-2xl p-6 md:p-8 border border-purple-100 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
                <div className="w-3 h-10 bg-gradient-to-b from-purple-500 via-pink-500 to-rose-500 rounded-full shadow-lg"></div>
                Distribusi Status Desa
              </h3>
              <div className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-semibold shadow-lg">
                {Object.keys(statusCounts).length} Status
              </div>
            </div>
            <div className="flex justify-center items-center">
              <div className="w-full max-w-2xl">
                <div className="h-96 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl"></div>
                  <div className="relative h-full p-4">
                    <Pie data={statusChartData} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            padding: 20,
                            font: { size: 12, weight: '600' },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            generateLabels: (chart) => {
                              const data = chart.data;
                              if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                  const value = data.datasets[0].data[i];
                                  return {
                                    text: `${label}: ${value} desa`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    hidden: false,
                                    index: i
                                  };
                                });
                              }
                              return [];
                            }
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: 12,
                          titleFont: { size: 14, weight: 'bold' },
                          bodyFont: { size: 13 },
                          cornerRadius: 8,
                          callbacks: {
                            label: function(context) {
                              const label = context.label || '';
                              const value = context.parsed || 0;
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = ((value / total) * 100).toFixed(1);
                              return `${label}: ${value} desa (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Data per Kecamatan */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="p-6 md:p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-blue-500 rounded-full"></div>
              Detail Data per Kecamatan
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Kecamatan</th>
                  <th className="px-6 py-4 text-left">Desa</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Alokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(groupedByKecamatan).map(([kecamatan, items]) => {
                  const isExpanded = expandedKecamatan[kecamatan];
                  const totalKecamatan = items.reduce((sum, item) => sum + item.realisasi, 0);
                  return (
                    <React.Fragment key={kecamatan}>
                      <tr className="bg-blue-50 hover:bg-blue-100 transition-colors">
                        <td className="px-6 py-4" colSpan="4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <MapPin className="w-5 h-5 text-blue-600" />
                              <span className="font-semibold text-gray-800">{kecamatan}</span>
                              <span className="text-sm text-gray-600">({items.length} desa)</span>
                              <span className="text-sm font-semibold text-blue-700">{formatRupiah(totalKecamatan)}</span>
                            </div>
                            <button
                              onClick={() => setExpandedKecamatan(prev => ({
                                ...prev,
                                [kecamatan]: !prev[kecamatan]
                              }))}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  Tutup Detail
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  Lihat Detail
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && items.map((item, index) => (
                        <tr key={`${item.desa}-${index}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-gray-400">? {kecamatan}</td>
                          <td className="px-6 py-4 font-medium text-gray-800">{item.desa}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              item.status === 'Dana Telah Dicairkan' ? 'bg-green-100 text-green-800' :
                              item.status === 'Proses SPP,SPM,SP2D di  BPKAD' ? 'bg-yellow-100 text-yellow-800' :
                              item.status === 'Dikembalikan ke Desa' ? 'bg-blue-100 text-blue-800' :
                              item.status === 'Dikembalikan ke Kecamatan' ? 'bg-purple-100 text-purple-800' :
                              item.status === 'Review BPKAD' ? 'bg-orange-100 text-orange-800' :
                              item.status === 'Review DPMD' ? 'bg-pink-100 text-pink-800' :
                              item.status === 'Sedang di Proses oleh Kecamatan' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-blue-700">
                            {formatRupiah(item.realisasi)}
                          </td>
                        </tr>
                      ))}
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

export default StatistikBankeuT2;
