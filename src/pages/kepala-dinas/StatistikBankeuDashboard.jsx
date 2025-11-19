import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiMapPin, FiUsers, FiDollarSign,
  FiChevronDown, FiChevronUp, FiDownload
} from 'react-icons/fi';
import { Activity } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import api from '../../api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const StatistikBankeuDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tahap1');
  const [dataTahap1, setDataTahap1] = useState([]);
  const [dataTahap2, setDataTahap2] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Tahap 1
      try {
        const response1 = await api.get('/bankeu-t1/data');
        setDataTahap1(response1.data.data || []);
      } catch (err) {
        console.warn('Error loading tahap1:', err);
        setDataTahap1([]);
      }
      
      // Fetch Tahap 2
      try {
        const response2 = await api.get('/bankeu-t2/data');
        setDataTahap2(response2.data.data || []);
      } catch (err) {
        console.warn('Error loading tahap2:', err);
        setDataTahap2([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching Bantuan Keuangan data:', err);
      setError('Gagal memuat data Bantuan Keuangan');
    } finally {
      setLoading(false);
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

  // Get active data based on selected tab
  const activeData = activeTab === 'tahap1' ? dataTahap1 : dataTahap2;

  // Process data
  const processedData = activeData.map(item => ({
    kecamatan: item.kecamatan,
    desa: item.desa,
    status: item.sts,
    realisasi: parseInt(item.Realisasi?.replace(/,/g, '') || '0')
  }));

  // Statistics
  const totalDesa = processedData.length;
  const totalAlokasi = processedData.reduce((sum, item) => sum + item.realisasi, 0);

  // Kecamatan statistics
  const kecamatanStats = processedData.reduce((acc, item) => {
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Sudah Mengajukan': 'bg-green-100 text-green-800 border-green-200',
      'Belum Mengajukan': 'bg-red-100 text-red-800 border-red-200',
      'Sedang Diproses': 'bg-yellow-100 text-yellow-800 border-yellow-200',
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
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/core-dashboard')}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Statistik Bantuan Keuangan Infrastruktur Desa
            </h1>
            <p className="text-gray-600">Monitoring bantuan keuangan infrastruktur desa tahun 2025</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 p-1 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg w-fit">
          <button
            onClick={() => setActiveTab('tahap1')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'tahap1'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Tahap 1
          </button>
          <button
            onClick={() => setActiveTab('tahap2')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'tahap2'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Tahap 2
          </button>
        </div>

        {/* Export Button */}
        <div className="mb-6">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            <FiDownload className="w-5 h-5" />
            Export Excel
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Kecamatan */}
          <div className="group bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FiMapPin className="w-6 h-6 text-cyan-600" />
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
                <FiUsers className="w-6 h-6 text-blue-600" />
              </div>
              <Activity className="w-8 h-8 text-white opacity-50" />
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Desa</h3>
            <p className="text-3xl font-bold text-white">{totalDesa}</p>
            <p className="text-white text-xs mt-2 opacity-75">Desa terdaftar</p>
          </div>

          {/* Total Alokasi */}
          <div className="group bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FiDollarSign className="w-6 h-6 text-indigo-600" />
              </div>
              <Activity className="w-8 h-8 text-white opacity-50" />
            </div>
            <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Alokasi</h3>
            <p className="text-2xl font-bold text-white">{formatRupiah(totalAlokasi)}</p>
            <p className="text-white text-xs mt-2 opacity-75">Total dana infrastruktur</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-6 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 relative z-10">Alokasi per Kecamatan</h3>
              <div className="relative z-10" style={{ height: '300px' }}>
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
                          callback: (value) => {
                            if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'M';
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'jt';
                            return value;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 relative z-10">Distribusi Status</h3>
              <div className="relative z-10" style={{ height: '300px' }}>
                <Pie
                  data={statusChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Detail Table by Kecamatan */}
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Detail per Kecamatan</h3>
          <div className="space-y-4">
            {Object.entries(kecamatanStats)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([kecamatanName, stats]) => (
                <div key={kecamatanName} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Kecamatan Header */}
                  <button
                    onClick={() => toggleKecamatan(kecamatanName)}
                    className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <FiMapPin className="w-5 h-5 text-cyan-600" />
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-800">{kecamatanName}</h4>
                        <p className="text-sm text-gray-600">{stats.count} Desa</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-cyan-600">{formatRupiah(stats.total)}</span>
                      {expandedKecamatan[kecamatanName] ? (
                        <FiChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <FiChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                  </button>

                  {/* Desa List */}
                  {expandedKecamatan[kecamatanName] && (
                    <div className="border-t border-gray-200">
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
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatistikBankeuDashboard;
