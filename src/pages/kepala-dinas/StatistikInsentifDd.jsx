import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp, BarChart3, Activity, DollarSign, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import api from '../../api';
import * as XLSX from 'xlsx';
import { isVpnUser } from '../../utils/vpnHelper';
import { useDataCache } from '../../context/DataCacheContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CACHE_KEY = 'statistik-insentif-dd';

const StatistikInsentifDd = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const { getCachedData, setCachedData, isCached } = useDataCache();

  useEffect(() => {
    if (isCached(CACHE_KEY)) {
      setData(getCachedData(CACHE_KEY).data);
      setLoading(false);
    } else {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const endpoint = isVpnUser() ? '/vpn-core/insentif-dd/data' : '/insentif-dd/data';
      const response = await api.get(endpoint);
      const result = response.data.data || [];
      setData(result);
      setCachedData(CACHE_KEY, result);
      setError(null);
    } catch (err) {
      console.error('Error fetching Insentif DD data:', err);
      setError('Gagal memuat data Insentif DD');
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

  // Status counts
  const statusCount = processedData.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

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

  // Top 10 kecamatan by total alokasi
  const topKecamatan = Object.entries(kecamatanStats)
    .map(([name, stats]) => ({ name, total: stats.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Chart data - Status Distribution
  const statusChartData = {
    labels: Object.keys(statusCount),
    datasets: [{
      data: Object.values(statusCount),
      backgroundColor: [
        'rgba(147, 51, 234, 0.8)',  // emerald
        'rgba(236, 72, 153, 0.8)',  // green
        'rgba(168, 85, 247, 0.8)',  // violet
        'rgba(219, 39, 119, 0.8)',  // fuchsia
        'rgba(192, 132, 252, 0.8)', // emerald light
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
  };

  // Chart data - Top Kecamatan
  const kecamatanChartData = {
    labels: topKecamatan.map(k => k.name),
    datasets: [{
      label: 'Total Alokasi (Rp)',
      data: topKecamatan.map(k => k.total),
      backgroundColor: 'rgba(147, 51, 234, 0.8)',
      borderColor: 'rgba(147, 51, 234, 1)',
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
      }
    }
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `Rp ${(value / 1000000).toFixed(0)}jt`
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Tersampaikan': { bg: 'bg-green-100', text: 'text-green-800', label: 'Tersampaikan' },
      'Belum Tersampaikan': { bg: 'bg-red-100', text: 'text-red-800', label: 'Belum Tersampaikan' },
      'Proses': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Proses' },
    };
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
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
      'Realisasi': formatRupiah(item.realisasi)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statistik Insentif DD');
    XLSX.writeFile(wb, `Statistik_Insentif DD_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-lg text-gray-600 font-medium">Memuat data Insentif DD...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-green-50 flex items-center justify-center p-4">
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
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-green-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/core-dashboard/dashboard')}
          className="group flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-6 transition-all duration-300 bg-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="font-semibold">Kembali ke Dashboard</span>
        </button>

        {/* Hero Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-emerald-700 to-green-700 rounded-3xl shadow-2xl p-8 mb-8 overflow-hidden">
          {/* Animated decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-green-400 opacity-20 rounded-full blur-3xl"></div>

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                  Statistik Insentif DD
                </h1>
                <p className="text-emerald-100 mt-1">Dana Desa</p>
              </div>
            </div>

            {/* Quick Stats Pills */}
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="bg-emerald-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-emerald-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <Activity className="w-4 h-4 text-white animate-pulse" />
                <span className="text-sm font-semibold text-white">{totalDesa} Desa</span>
              </div>
              <div className="bg-emerald-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-emerald-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <BarChart3 className="w-4 h-4 text-white animate-pulse" />
                <span className="text-sm font-semibold text-white">{totalKecamatan} Kecamatan</span>
              </div>
              <div className="bg-emerald-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 border border-emerald-400 border-opacity-50 flex items-center gap-2 shadow-lg">
                <TrendingUp className="w-4 h-4 text-white animate-pulse" />
                <span className="text-sm font-semibold text-white">{formatRupiah(totalAlokasi)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card with Live Badge */}
        <div className="relative bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 overflow-hidden border border-gray-100">
          {/* Gradient decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100 to-green-100 opacity-30 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-50 to-green-50 opacity-50 rounded-full -ml-24 -mb-24"></div>

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
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-emerald-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Desa</p>
                    <p className="text-2xl md:text-3xl font-bold text-emerald-600">{totalDesa}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 font-medium">Total Alokasi</p>
                    <p className="text-base md:text-lg font-bold text-purple-600 break-words">{formatRupiah(totalAlokasi)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-emerald-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 font-medium">Rata-rata/Desa</p>
                    <p className="text-base md:text-lg font-bold text-emerald-600 break-words">{formatRupiah(avgPerDesa)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleExport}
                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Status Distribution Chart */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full"></div>
              Distribusi Status
            </h3>
            <div className="h-80">
              <Pie data={statusChartData} options={chartOptions} />
            </div>
          </div>

          {/* Top Kecamatan Chart */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full"></div>
              Top 10 Kecamatan
            </h3>
            <div className="h-80">
              <Bar data={kecamatanChartData} options={barChartOptions} />
            </div>
          </div>
        </div>

        {/* Detail Data per Kecamatan */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="p-6 md:p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full"></div>
              Detail Data per Kecamatan
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-emerald-600 to-green-600 text-white">
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
                      <tr className="bg-emerald-50 hover:bg-emerald-100 transition-colors">
                        <td className="px-6 py-4" colSpan="4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <MapPin className="w-5 h-5 text-emerald-600" />
                              <span className="font-semibold text-gray-800">{kecamatan}</span>
                              <span className="text-sm text-gray-600">({items.length} desa)</span>
                              <span className="text-sm font-semibold text-emerald-700">{formatRupiah(totalKecamatan)}</span>
                            </div>
                            <button
                              onClick={() => setExpandedKecamatan(prev => ({
                                ...prev,
                                [kecamatan]: !prev[kecamatan]
                              }))}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
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
                          <td className="px-6 py-4 text-gray-400">↳ {kecamatan}</td>
                          <td className="px-6 py-4 font-medium text-gray-800">{item.desa}</td>
                          <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                          <td className="px-6 py-4 text-right font-semibold text-emerald-700">
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

export default StatistikInsentifDd;
