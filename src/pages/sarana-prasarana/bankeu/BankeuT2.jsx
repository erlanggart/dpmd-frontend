import React, { useState, useEffect } from 'react';
import { Upload, Users, TrendingUp, BarChart3, Activity, DollarSign, ChevronDown, ChevronUp, MapPin, X } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import api from '../../../api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const BankeuT2 = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bankeu-T2/data');
      setData(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching Bantuan Keuangan Tahap 2 data:', err);
      setError('Gagal memuat data Bantuan Keuangan Tahap 2');
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

      const response = await api.post('/bankeu-T2/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Data berhasil diupload');
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
          'rgba(6, 182, 212, 0.8)', 'rgba(14, 165, 233, 0.8)', 'rgba(59, 130, 246, 0.8)',
          'rgba(99, 102, 241, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(168, 85, 247, 0.8)',
          'rgba(192, 132, 252, 0.8)', 'rgba(217, 70, 239, 0.8)', 'rgba(236, 72, 153, 0.8)',
          'rgba(244, 114, 182, 0.8)',
        ];
        return colors[index % colors.length];
      }),
      borderColor: allKecamatan.map((_, index) => {
        const colors = [
          'rgba(6, 182, 212, 1)', 'rgba(14, 165, 233, 1)', 'rgba(59, 130, 246, 1)',
          'rgba(99, 102, 241, 1)', 'rgba(139, 92, 246, 1)', 'rgba(168, 85, 247, 1)',
          'rgba(192, 132, 252, 1)', 'rgba(217, 70, 239, 1)', 'rgba(236, 72, 153, 1)',
          'rgba(244, 114, 182, 1)',
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
    if (!acc[status]) acc[status] = 0;
    acc[status]++;
    return acc;
  }, {});

  const statusChartData = {
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)', 'rgba(234, 179, 8, 0.8)', 'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)', 'rgba(249, 115, 22, 0.8)', 'rgba(236, 72, 153, 0.8)',
        'rgba(99, 102, 241, 0.8)', 'rgba(156, 163, 175, 0.8)',
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)', 'rgba(234, 179, 8, 1)', 'rgba(59, 130, 246, 1)',
        'rgba(168, 85, 247, 1)', 'rgba(249, 115, 22, 1)', 'rgba(236, 72, 153, 1)',
        'rgba(99, 102, 241, 1)', 'rgba(156, 163, 175, 1)',
      ],
      borderWidth: 2,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: function(context) {
            let value = context.parsed.y;
            if (value >= 1000000000) return `Total Alokasi: Rp ${(value / 1000000000).toFixed(2)} Miliar`;
            if (value >= 1000000) return `Total Alokasi: Rp ${(value / 1000000).toFixed(2)} Juta`;
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
            if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)} M`;
            if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)} Jt`;
            return `Rp ${value.toLocaleString('id-ID')}`;
          }
        }
      },
      x: { ticks: { maxRotation: 45, minRotation: 45 } }
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
    if (!acc[item.kecamatan]) acc[item.kecamatan] = [];
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
    XLSX.utils.book_append_sheet(wb, ws, 'Bantuan Keuangan Tahap 2');
    XLSX.writeFile(wb, `Bantuan_Keuangan_T2_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data berhasil diekspor');
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
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={fetchData} className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 font-semibold">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-blue-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 rounded-3xl shadow-2xl p-8 mb-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32 animate-pulse"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">Bantuan Keuangan Tahap 2</h1>
                <p className="text-blue-100 mt-1">Dana Desa</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="bg-blue-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
                <Activity className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">{totalDesa} Desa</span>
              </div>
              <div className="bg-blue-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
                <BarChart3 className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">{totalKecamatan} Kecamatan</span>
              </div>
              <div className="bg-blue-600 bg-opacity-80 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">{formatRupiah(totalAlokasi)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="relative bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 overflow-hidden border border-gray-100">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Ringkasan Data</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-600 text-white px-4 py-2 rounded-xl hover:from-blue-700 hover:to-blue-700 font-semibold shadow-lg flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Update Data
                </button>
                <button
                  onClick={handleExport}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-6 border border-blue-100 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Desa</p>
                    <p className="text-3xl font-bold text-blue-600">{totalDesa}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-6 border border-blue-100 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 font-medium">Total Alokasi</p>
                    <p className="text-lg font-bold text-purple-600 break-words">{formatRupiah(totalAlokasi)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-6 border border-blue-100 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 font-medium">Rata-rata/Desa</p>
                    <p className="text-lg font-bold text-blue-600 break-words">{formatRupiah(avgPerDesa)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-6 md:space-y-8">
          {/* Bar Chart */}
          <div className="bg-gradient-to-br from-white via-blue-50 to-blue-50 rounded-3xl shadow-2xl p-6 md:p-8 border border-blue-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                <div className="w-3 h-10 bg-gradient-to-b from-blue-500 via-blue-500 to-indigo-500 rounded-full shadow-lg"></div>
                Semua Kecamatan - Total Alokasi
              </h3>
              <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-500 text-white rounded-full text-sm font-semibold shadow-lg">
                {allKecamatan.length} Kecamatan
              </div>
            </div>
            <div className="h-96 relative">
              <div className="relative h-full p-4">
                <Bar data={kecamatanChartData} options={{...chartOptions, plugins: {...chartOptions.plugins, legend: {display: false}}}} />
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-3xl shadow-2xl p-6 md:p-8 border border-purple-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
                <div className="w-3 h-10 bg-gradient-to-b from-purple-500 via-pink-500 to-rose-500 rounded-full shadow-lg"></div>
                Distribusi Status Desa
              </h3>
              <div className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-semibold shadow-lg">
                {Object.keys(statusCounts).length} Status
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-2xl h-96 relative">
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
                              return data.labels.map((label, i) => ({
                                text: `${label}: ${data.datasets[0].data[i]} desa`,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                hidden: false,
                                index: i
                              }));
                            }
                            return [];
                          }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
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

          {/* Detail Table */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="p-6 md:p-8 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-blue-500 rounded-full"></div>
                Detail Data per Kecamatan
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-600 text-white">
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
                        <tr className="bg-blue-50 hover:bg-blue-100">
                          <td className="px-6 py-4" colSpan="4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-gray-800">{kecamatan}</span>
                                <span className="text-sm text-gray-600">({items.length} desa)</span>
                                <span className="text-sm font-semibold text-blue-700">{formatRupiah(totalKecamatan)}</span>
                              </div>
                              <button
                                onClick={() => setExpandedKecamatan(prev => ({...prev, [kecamatan]: !prev[kecamatan]}))}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                              >
                                {isExpanded ? <><ChevronUp className="w-4 h-4" /> Tutup</> : <><ChevronDown className="w-4 h-4" /> Lihat</>}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && items.map((item, index) => (
                          <tr key={`${item.desa}-${index}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-gray-400">â†³ {kecamatan}</td>
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
                            <td className="px-6 py-4 text-right font-semibold text-blue-700">{formatRupiah(item.realisasi)}</td>
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Update Data Bankeu T2</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pilih File JSON</label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {uploadFile && <p className="mt-2 text-sm text-gray-600">File: {uploadFile.name}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
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

export default BankeuT2;

