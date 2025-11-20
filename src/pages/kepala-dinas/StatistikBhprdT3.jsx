import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp, BarChart3, Activity, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import api from '../../api';
import * as XLSX from 'xlsx';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const StatistikBhprd = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bhprd/data');
      setData(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching BHPRD data:', err);
      setError('Gagal memuat data BHPRD');
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

  // Statistics - BHPRD punya 3 tahap per desa, jadi hitung unique desa
  const uniqueDesa = [...new Set(processedData.map(item => `${item.kecamatan}_${item.desa}`))];
  const totalDesa = uniqueDesa.length;
  const totalRealisasi = processedData.reduce((sum, item) => sum + item.realisasi, 0);
  const avgPerDesa = totalDesa > 0 ? Math.round(totalRealisasi / totalDesa) : 0;

  // Dana cair vs belum cair
  const danaCair = processedData.filter(item => 
    item.status?.toLowerCase().includes('cair') || 
    item.status?.toLowerCase().includes('selesai')
  ).reduce((sum, item) => sum + item.realisasi, 0);
  const belumCair = totalRealisasi - danaCair;

  // Status counts
  const statusCount = processedData.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  // Kecamatan statistics - group by kecamatan dan hitung unique desa per kecamatan
  const kecamatanStats = processedData.reduce((acc, item) => {
    if (!acc[item.kecamatan]) {
      acc[item.kecamatan] = { total: 0, desaSet: new Set() };
    }
    acc[item.kecamatan].total += item.realisasi;
    acc[item.kecamatan].desaSet.add(item.desa);
    return acc;
  }, {});

  const totalKecamatan = Object.keys(kecamatanStats).length;

  // Top 10 kecamatan by total realisasi
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
        'rgba(16, 185, 129, 0.8)',  // emerald
        'rgba(34, 197, 94, 0.8)',   // green
        'rgba(20, 184, 166, 0.8)',  // teal
        'rgba(5, 150, 105, 0.8)',   // emerald dark
        'rgba(52, 211, 153, 0.8)',  // emerald light
      ],
      borderColor: [
        'rgba(16, 185, 129, 1)',
        'rgba(34, 197, 94, 1)',
        'rgba(20, 184, 166, 1)',
        'rgba(5, 150, 105, 1)',
        'rgba(52, 211, 153, 1)',
      ],
      borderWidth: 2,
    }]
  };

  // Chart data - Top Kecamatan
  const kecamatanChartData = {
    labels: topKecamatan.map(k => k.name),
    datasets: [{
      label: 'Total Realisasi (Rp)',
      data: topKecamatan.map(k => k.total),
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderColor: 'rgba(16, 185, 129, 1)',
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

  const handleExport = () => {
    const exportData = processedData.map(item => ({
      'Kecamatan': item.kecamatan,
      'Desa': item.desa,
      'Status': item.status,
      'Realisasi': formatRupiah(item.realisasi)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statistik BHPRD');
    XLSX.writeFile(wb, `Statistik_BHPRD_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-lg text-gray-600 font-medium">Memuat data BHPRD...</p>
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
        <div className="relative bg-gradient-to-r from-emerald-600 via-green-700 to-teal-700 rounded-3xl shadow-2xl p-8 mb-8 overflow-hidden">
          {/* Animated decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-green-400 opacity-20 rounded-full blur-3xl"></div>

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                  📊 Statistik BHPRD
                </h1>
                <p className="text-emerald-100 mt-1">Bagi Hasil Pajak Retribusi Daerah</p>
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
                <span className="text-sm font-semibold text-white">{formatRupiah(totalRealisasi)}</span>
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

            {/* Stats Grid - 5 columns for BHPRD */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-emerald-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Desa</p>
                    <p className="text-3xl font-bold text-emerald-600">{totalDesa}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Realisasi</p>
                    <p className="text-xl font-bold text-green-600">{formatRupiah(totalRealisasi)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-emerald-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Dana Cair</p>
                    <p className="text-xl font-bold text-emerald-600">{formatRupiah(danaCair)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-orange-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Belum Cair</p>
                    <p className="text-xl font-bold text-orange-600">{formatRupiah(belumCair)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-teal-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Rata-rata/Desa</p>
                    <p className="text-xl font-bold text-teal-600">{formatRupiah(avgPerDesa)}</p>
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
      </div>
    </div>
  );
};

export default StatistikBhprd;
