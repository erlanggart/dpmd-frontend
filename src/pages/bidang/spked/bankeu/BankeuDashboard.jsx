import React, { useState, useEffect } from 'react';
import { Upload, Users, TrendingUp, BarChart3, Activity, DollarSign, ChevronDown, ChevronUp, MapPin, X, Download } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import api from '../../../../api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const BankeuDashboard = () => {
  const [activeTab, setActiveTab] = useState('tahap1');
  const [dataTahap1, setDataTahap1] = useState([]);
  const [dataTahap2, setDataTahap2] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null); // Filter status dari card

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Tahap 1
      const response1 = await api.get('/bankeu-t1/data');
      setDataTahap1(response1.data.data || []);
      
      // Fetch Tahap 2
      const response2 = await api.get('/bankeu-t2/data');
      setDataTahap2(response2.data.data || []);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching Bantuan Keuangan data:', err);
      setError('Gagal memuat data Bantuan Keuangan');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast.error('File harus berformat JSON');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);

      const endpoint = activeTab === 'tahap1' ? '/bankeu-t1/upload' : '/bankeu-t2/upload';
      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(`Data Tahap ${activeTab === 'tahap1' ? '1' : '2'} berhasil diupload`);
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

  const handleExportExcel = () => {
    const activeData = activeTab === 'tahap1' ? dataTahap1 : dataTahap2;
    const exportData = activeData.map(item => ({
      'Kecamatan': item.kecamatan,
      'Desa': item.desa,
      'Status': item.sts,
      'Realisasi (Rp)': item.Realisasi
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Bankeu ${activeTab === 'tahap1' ? 'T1' : 'T2'}`);
    XLSX.writeFile(wb, `Bantuan_Keuangan_${activeTab === 'tahap1' ? 'Tahap_1' : 'Tahap_2'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data berhasil diekspor ke Excel');
  };

  // Handler untuk klik card status
  const handleStatusClick = (statusName) => {
    if (selectedStatus === statusName) {
      // Jika klik status yang sama, reset filter (tampilkan semua)
      setSelectedStatus(null);
    } else {
      // Set filter ke status yang diklik
      setSelectedStatus(statusName);
    }
  };

  // Get active data based on selected tab
  const activeData = activeTab === 'tahap1' ? dataTahap1 : dataTahap2;

  // Process data
  const processedData = activeData.map(item => ({
    kecamatan: item.kecamatan,
    desa: item.desa,
    status: item.sts,
    realisasi: parseInt(item.Realisasi?.replace(/,/g, '') || '0')
  }));

  // Filter data berdasarkan status yang dipilih
  const filteredData = selectedStatus 
    ? processedData.filter(item => item.status === selectedStatus)
    : processedData;

  // Statistics from filtered data
  const totalDesa = filteredData.length;
  const totalAlokasi = filteredData.reduce((sum, item) => sum + item.realisasi, 0);

  // Status statistics - nominal per status (DINAMIS) - dari semua data
  const statusStats = processedData.reduce((acc, item) => {
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

  // Kecamatan statistics - dari filtered data
  const kecamatanStats = filteredData.reduce((acc, item) => {
    if (!acc[item.kecamatan]) {
      acc[item.kecamatan] = { total: 0, count: 0, desas: [] };
    }
    acc[item.kecamatan].total += item.realisasi;
    acc[item.kecamatan].count += 1;
    acc[item.kecamatan].desas.push(item);
    return acc;
  }, {});

  const totalKecamatan = Object.keys(kecamatanStats).length;

  // All kecamatan sorted by total alokasi
  const allKecamatan = Object.entries(kecamatanStats)
    .map(([name, stats]) => ({ name, total: stats.total }))
    .sort((a, b) => b.total - a.total);

  // Status distribution
  const statusDistribution = processedData.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  // Chart data - Kecamatan
  const kecamatanChartData = {
    labels: allKecamatan.map(k => k.name),
    datasets: [{
      label: 'Total Alokasi (Rp)',
      data: allKecamatan.map(k => k.total),
      backgroundColor: 'rgba(6, 182, 212, 0.8)',
      borderColor: 'rgba(6, 182, 212, 1)',
      borderWidth: 2,
    }]
  };

  // Chart data - Status
  const statusChartData = {
    labels: Object.keys(statusDistribution),
    datasets: [{
      data: Object.values(statusDistribution),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(168, 85, 247, 0.8)',
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)',
        'rgba(251, 191, 36, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(168, 85, 247, 1)',
      ],
      borderWidth: 2,
    }]
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const toggleKecamatan = (kecamatanName) => {
    setExpandedKecamatan(prev => ({
      ...prev,
      [kecamatanName]: !prev[kecamatanName]
    }));
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Dana Telah Dicairkan': 'bg-green-100 text-green-800 border-green-200',
      'Dana Dikembalikan': 'bg-red-100 text-red-800 border-red-200',
      'Sedang Diproses': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Menunggu Pencairan': 'bg-blue-100 text-blue-800 border-blue-200',
      'Ditolak': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return statusConfig[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {/* Header - Responsive */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Bantuan Keuangan Infrastruktur Desa
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Monitoring dan pengelolaan bantuan keuangan infrastruktur desa tahun 2025</p>
        </div>

        {/* Tab Navigation - Responsive */}
        <div className="mb-6 flex gap-2 p-1 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg w-full sm:w-fit">
          <button
            onClick={() => {
              setActiveTab('tahap1');
              setSelectedStatus(null); // Reset filter saat ganti tab
            }}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
              activeTab === 'tahap1'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Tahap 1
          </button>
          <button
            onClick={() => {
              setActiveTab('tahap2');
              setSelectedStatus(null); // Reset filter saat ganti tab
            }}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
              activeTab === 'tahap2'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Tahap 2
          </button>
        </div>

        {/* Action Buttons - Responsive */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-4 mb-6">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 text-sm sm:text-base"
          >
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Update Data</span>
            <span className="sm:hidden">Update</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-white border-2 border-cyan-600 text-cyan-600 rounded-xl hover:bg-cyan-50 transition-all duration-300 hover:scale-105 text-sm sm:text-base"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>

        {/* Summary Cards - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {/* Total Kecamatan */}
          <div className="group bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <MapPin className="w-6 h-6 text-cyan-600" />
              </div>
              <Activity className="w-8 h-8 text-white opacity-50" />
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Kecamatan</h3>
            <p className="text-3xl font-bold text-white">{totalKecamatan}</p>
            <p className="text-white text-xs mt-2 opacity-75">Kecamatan terdaftar</p>
          </div>

          {/* Total Desa */}
          <div className="group bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-8 h-8 text-white opacity-50" />
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Desa</h3>
            <p className="text-3xl font-bold text-white">{totalDesa}</p>
            <p className="text-white text-xs mt-2 opacity-75">Desa penerima bantuan</p>
          </div>

          {/* Total Alokasi */}
          <div className="group bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-6 h-6 text-indigo-600" />
              </div>
              <BarChart3 className="w-8 h-8 text-white opacity-50" />
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Alokasi</h3>
            <p className="text-2xl font-bold text-white">{formatRupiah(totalAlokasi)}</p>
            <p className="text-white text-xs mt-2 opacity-75">Total dana infrastruktur</p>
          </div>
        </div>

        {/* Nominal per Status Cards - DINAMIS - Responsive */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />
              <span className="hidden sm:inline">Nominal Dana per Status ({statusArray.length} Status)</span>
              <span className="sm:hidden">Dana per Status ({statusArray.length})</span>
            </h3>
            {selectedStatus && (
              <button
                onClick={() => setSelectedStatus(null)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                Reset Filter
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
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
                    {formatRupiah(status.total)}
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

        {/* Charts - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Bar Chart */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-4 sm:p-6 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 relative z-10">
                Alokasi per Kecamatan
              </h3>
              <div className="relative z-10" style={{ height: '250px' }}>
                <Bar
                  data={kecamatanChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => formatRupiah(context.parsed.y)
                        }
                      }
                    },
                    scales: {
                      y: {
                        ticks: {
                          font: { size: window.innerWidth < 640 ? 9 : 11 },
                          callback: (value) => {
                            if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'M';
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'jt';
                            return value;
                          }
                        }
                      },
                      x: {
                        ticks: {
                          font: { size: window.innerWidth < 640 ? 8 : 10 },
                          maxRotation: 45,
                          minRotation: 45
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 sm:p-6 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 relative z-10">
                Distribusi Status
              </h3>
              <div className="relative z-10" style={{ height: '250px' }}>
                <Pie
                  data={statusChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { 
                        position: 'bottom',
                        labels: {
                          font: { size: window.innerWidth < 640 ? 9 : 11 },
                          padding: window.innerWidth < 640 ? 8 : 12,
                          boxWidth: window.innerWidth < 640 ? 12 : 15
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Detail Table by Kecamatan - Responsive */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Detail per Kecamatan</h3>
            {selectedStatus && (
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-cyan-50 border border-cyan-200 rounded-lg text-xs sm:text-sm">
                <span className="text-cyan-700">Filter aktif:</span>
                <span className="font-bold text-cyan-900">{selectedStatus}</span>
                <span className="text-cyan-600">({totalDesa} desa)</span>
              </div>
            )}
          </div>
          <div className="space-y-3 sm:space-y-4">
            {Object.entries(kecamatanStats)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([kecamatanName, stats]) => (
                <div key={kecamatanName} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Kecamatan Header - Responsive */}
                  <button
                    onClick={() => toggleKecamatan(kecamatanName)}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-4">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 flex-shrink-0" />
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">{kecamatanName}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">{stats.count} Desa</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <span className="text-sm sm:text-lg font-bold text-cyan-600 whitespace-nowrap">
                        {formatRupiah(stats.total)}
                      </span>
                      {expandedKecamatan[kecamatanName] ? (
                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* Desa List - Responsive Table/Cards */}
                  {expandedKecamatan[kecamatanName] && (
                    <div className="border-t border-gray-200">
                      {/* Desktop Table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desa</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Realisasi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {stats.desas.map((desa, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-800">{desa.desa}</td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadge(desa.status)}`}>
                                    {desa.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-800">
                                  {formatRupiah(desa.realisasi)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Mobile Cards */}
                      <div className="sm:hidden divide-y divide-gray-200">
                        {stats.desas.map((desa, idx) => (
                          <div key={idx} className="p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-semibold text-gray-800 text-sm">{desa.desa}</h5>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(desa.status)}`}>
                                {desa.status}
                              </span>
                              <span className="text-sm font-bold text-cyan-600">
                                {formatRupiah(desa.realisasi)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Upload Modal - Modern Design - Responsive */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto animate-fadeIn">
          <div className="min-h-screen flex items-start justify-center p-2 sm:p-4 pt-8 sm:pt-16">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all animate-slideUp my-4 sm:my-8">
            {/* Header with Gradient - Responsive */}
            <div className="relative bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 px-4 sm:px-8 py-4 sm:py-6 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="h-10 w-10 sm:h-14 sm:w-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Upload className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-2xl font-bold text-white truncate">
                      Update Data Bantuan Keuangan
                    </h3>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1">
                      {activeTab === 'tahap1' ? 'Tahap 1' : 'Tahap 2'} - Upload file JSON terbaru
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                  }}
                  className="h-8 w-8 sm:h-10 sm:w-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content - Responsive */}
            <div className="p-4 sm:p-8">
              {/* File Upload Section */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  📁 Pilih File JSON
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload-bankeu"
                  />
                  <label
                    htmlFor="file-upload-bankeu"
                    className="flex items-center justify-center gap-3 w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-2xl hover:border-cyan-500 hover:bg-cyan-50/50 transition-all cursor-pointer group"
                  >
                    <div className="text-center">
                      <div className="inline-flex h-16 w-16 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-cyan-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Klik untuk pilih file atau drag & drop
                      </p>
                      <p className="text-xs text-gray-500">
                        Format: JSON • Max: 10MB
                      </p>
                    </div>
                  </label>
                </div>
                
                {uploadFile && (
                  <div className="mt-4 flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {uploadFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(uploadFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setUploadFile(null)}
                      className="h-8 w-8 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 border-2 border-blue-200/50 rounded-2xl p-5 mb-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      ℹ️ Informasi Penting
                    </h4>
                    <ul className="space-y-1.5 text-sm text-blue-800">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>File harus berformat <strong>JSON (.json)</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Data harus sesuai dengan struktur Bantuan Keuangan</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Upload file akan <strong>menggantikan</strong> data lama</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Pastikan data sudah dicek sebelum upload</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                  }}
                  className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold"
                  disabled={uploading}
                >
                  Batal
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="flex-1 px-6 py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 hover:scale-105 disabled:hover:scale-100"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Mengupload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload Sekarang
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankeuDashboard;
