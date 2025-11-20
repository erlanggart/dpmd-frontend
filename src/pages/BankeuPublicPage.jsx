// src/pages/BankeuPublicPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiMapPin, FiUsers, FiDollarSign,
  FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { Activity } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import Footer from '../components/landingpage/Footer';
import { API_ENDPOINTS } from '../config/apiConfig';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const BankeuPublicPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tahap1'); // 'tahap1' or 'tahap2'
  const [dataTahap1, setDataTahap1] = useState([]);
  const [dataTahap2, setDataTahap2] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Tahap 1 from public API (no auth required)
      try {
        const response1 = await fetch(`${API_ENDPOINTS.EXPRESS_BASE}/bankeu-t1/data`);
        if (response1.ok) {
          const json1 = await response1.json();
          setDataTahap1(json1.data || []);
        } else {
          console.warn('Failed to load tahap1 data');
          setDataTahap1([]);
        }
      } catch (err) {
        console.warn('Error loading tahap1:', err);
        setDataTahap1([]);
      }

      // Fetch Tahap 2 from public API (no auth required)
      try {
        const response2 = await fetch(`${API_ENDPOINTS.EXPRESS_BASE}/bankeu-t2/data`);
        if (response2.ok) {
          const json2 = await response2.json();
          setDataTahap2(json2.data || []);
        } else {
          console.warn('Failed to load tahap2 data');
          setDataTahap2([]);
        }
      } catch (err) {
        console.warn('Error loading tahap2:', err);
        setDataTahap2([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading bankeu data:', error);
      setDataTahap1([]);
      setDataTahap2([]);
      setLoading(false);
    }
  };

  // Get active data based on tab
  const activeData = activeTab === 'tahap1' ? dataTahap1 : dataTahap2;

  // Process data
  const processedData = activeData.map(item => ({
    kecamatan: item.kecamatan,
    desa: item.desa,
    status: item.sts,
    realisasi: parseInt(item.Realisasi?.replace(/,/g, '') || '0')
  }));

  // Calculate statistics
  const totalDesa = processedData.length;
  const totalAlokasi = processedData.reduce((sum, item) => sum + item.realisasi, 0);
  const avgPerDesa = totalDesa > 0 ? totalAlokasi / totalDesa : 0;

  // Group by kecamatan
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

  // All kecamatan for bar chart
  const allKecamatan = Object.entries(kecamatanStats)
    .map(([name, stats]) => ({ name, total: stats.total }))
    .sort((a, b) => b.total - a.total);

  // Status distribution for pie chart
  const statusCounts = processedData.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  // Chart colors based on active tab
  const chartColors = activeTab === 'tahap1' 
    ? {
        primary: 'rgba(6, 182, 212, 0.8)',
        barColors: [
          'rgba(6, 182, 212, 0.8)',
          'rgba(14, 165, 233, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(192, 132, 252, 0.8)',
          'rgba(217, 70, 239, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(244, 114, 182, 0.8)'
        ],
        gradient: 'from-cyan-600 to-blue-600'
      }
    : {
        primary: 'rgba(37, 99, 235, 0.8)',
        barColors: [
          'rgba(37, 99, 235, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(96, 165, 250, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(129, 140, 248, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(192, 132, 252, 0.8)',
          'rgba(217, 70, 239, 0.8)',
          'rgba(232, 121, 249, 0.8)'
        ],
        gradient: 'from-blue-600 to-indigo-600'
      };

  // Bar Chart Data
  const kecamatanChartData = {
    labels: allKecamatan.map(k => k.name),
    datasets: [{
      label: 'Total Alokasi',
      data: allKecamatan.map(k => k.total),
      backgroundColor: allKecamatan.map((_, index) => 
        chartColors.barColors[index % chartColors.barColors.length]
      ),
      borderRadius: 8,
      borderWidth: 0
    }]
  };

  // Pie Chart Data
  const statusChartData = {
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(148, 163, 184, 0.8)'
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y || context.parsed;
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
            if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)} M`;
            if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)} Jt`;
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

  const pieChartOptions = {
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
  };

  const formatRupiah = (amount) => {
    if (amount >= 1000000000) {
      return `Rp ${(amount / 1000000000).toFixed(2)} Miliar`;
    } else if (amount >= 1000000) {
      return `Rp ${(amount / 1000000).toFixed(2)} Juta`;
    }
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const groupedByKecamatan = processedData.reduce((acc, item) => {
    if (!acc[item.kecamatan]) acc[item.kecamatan] = [];
    acc[item.kecamatan].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="group inline-flex items-center space-x-2 mb-6 px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold transition-all"
        >
          <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Beranda</span>
        </button>

        {/* Hero Header with Tabs */}
        <div className={`bg-gradient-to-r ${chartColors.gradient} rounded-3xl shadow-2xl overflow-hidden mb-8`}>
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                <Activity className="w-8 h-8 text-yellow-300" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Program Bantuan Keuangan Desa
                </h1>
                <p className="text-white text-opacity-90 mt-1">
                  Monitoring dan Statistik Realisasi Bantuan Keuangan
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-3 bg-gradient-to-r from-white/30 to-white/20 backdrop-blur-xl rounded-2xl p-2 max-w-md shadow-lg border border-white/40">
              <button
                onClick={() => setActiveTab('tahap1')}
                className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                  activeTab === 'tahap1'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl scale-105'
                    : 'text-gray-700 bg-white/40 hover:bg-white/60 hover:scale-102'
                }`}
              >
                Tahap 1
              </button>
              <button
                onClick={() => setActiveTab('tahap2')}
                className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                  activeTab === 'tahap2'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl scale-105'
                    : 'text-gray-700 bg-white/40 hover:bg-white/60 hover:scale-102'
                }`}
              >
                Tahap 2
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="group bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-cyan-400 border-opacity-30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white bg-opacity-90 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FiMapPin className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-white text-opacity-90 text-sm font-semibold">Total Kecamatan</p>
                    <p className="text-3xl font-bold text-white drop-shadow-md">{totalKecamatan}</p>
                  </div>
                </div>
              </div>

              <div className="group bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-blue-400 border-opacity-30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white bg-opacity-90 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FiUsers className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-white text-opacity-90 text-sm font-semibold">Total Desa</p>
                    <p className="text-3xl font-bold text-white drop-shadow-md">{totalDesa}</p>
                  </div>
                </div>
              </div>

              <div className="group bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-indigo-400 border-opacity-30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-16 h-16 bg-white bg-opacity-90 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FiDollarSign className={`w-8 h-8 ${activeTab === 'tahap1' ? 'text-cyan-600' : 'text-indigo-600'}`} />
                  </div>
                  <div>
                    <p className="text-white text-opacity-90 text-sm font-semibold">Total Alokasi</p>
                    <p className="text-2xl font-bold text-white drop-shadow-md">{formatRupiah(totalAlokasi)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6 mb-8">
          {/* Bar Chart */}
          <div className="bg-gradient-to-br from-white via-cyan-50 to-blue-50 rounded-3xl shadow-2xl overflow-hidden border border-cyan-100 hover:shadow-3xl transition-all duration-300">
            <div className="bg-white bg-opacity-80 backdrop-blur-sm px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-10 bg-gradient-to-b from-cyan-500 via-blue-500 to-indigo-500 rounded-full shadow-lg"></div>
                  <h3 className={`text-2xl font-bold bg-gradient-to-r ${chartColors.gradient} bg-clip-text text-transparent`}>
                    Alokasi per Kecamatan - {activeTab === 'tahap1' ? 'Tahap 1' : 'Tahap 2'}
                  </h3>
                </div>
                <span className={`px-4 py-2 bg-gradient-to-r ${chartColors.gradient} text-white rounded-full text-sm font-semibold shadow-lg`}>
                  {allKecamatan.length} Kecamatan
                </span>
              </div>
            </div>
            <div className="p-8 bg-white">
              <div className="h-96 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-2xl"></div>
                <div className="relative h-full">
                  <Bar data={kecamatanChartData} options={chartOptions} />
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
                  Distribusi Status - {activeTab === 'tahap1' ? 'Tahap 1' : 'Tahap 2'}
                </h3>
              </div>
            </div>
            <div className="p-8 bg-white flex justify-center">
              <div className="w-full max-w-2xl h-96 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl"></div>
                <div className="relative h-full">
                  <Pie data={statusChartData} options={pieChartOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Table */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          <div className={`bg-gradient-to-r ${chartColors.gradient} px-8 py-6`}>
            <h3 className="text-2xl font-bold text-white">
              Detail Data per Kecamatan - {activeTab === 'tahap1' ? 'Tahap 1' : 'Tahap 2'}
            </h3>
            <p className="text-white text-opacity-90 mt-1">
              Menampilkan {totalDesa} desa dari {totalKecamatan} kecamatan
            </p>
          </div>

          <div className="p-8 space-y-4">
            {Object.entries(groupedByKecamatan)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([kecamatan, desas]) => {
                const isExpanded = expandedKecamatan[kecamatan];
                const totalKec = desas.reduce((sum, d) => sum + d.realisasi, 0);

                return (
                  <div key={kecamatan} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <button
                      onClick={() => setExpandedKecamatan(prev => ({ ...prev, [kecamatan]: !isExpanded }))}
                      className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-200 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${chartColors.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                          <FiMapPin className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-lg font-bold text-gray-900">{kecamatan}</h4>
                          <p className="text-sm text-gray-600">{desas.length} Desa • {formatRupiah(totalKec)}</p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <FiChevronUp className="w-6 h-6 text-gray-600" />
                      ) : (
                        <FiChevronDown className="w-6 h-6 text-gray-600" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="bg-white border-t border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">No</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Desa</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Realisasi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {desas.map((desa, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 text-sm text-gray-900">{idx + 1}</td>
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{desa.desa}</td>
                                  <td className="px-6 py-4">
                                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                                      desa.status === 'Dana Telah Dicairkan' ? 'bg-green-100 text-green-800' :
                                      desa.status === 'Proses SPP,SPM,SP2D di  BPKAD' ? 'bg-yellow-100 text-yellow-800' :
                                      desa.status === 'Dikembalikan ke Desa' ? 'bg-red-100 text-red-800' :
                                      desa.status === 'Dikembalikan ke Kecamatan' ? 'bg-orange-100 text-orange-800' :
                                      desa.status === 'Review BPKAD' ? 'bg-purple-100 text-purple-800' :
                                      desa.status === 'Review DPMD' ? 'bg-blue-100 text-blue-800' :
                                      desa.status === 'Sedang di Proses oleh Kecamatan' ? 'bg-indigo-100 text-indigo-800' :
                                      desa.status === 'Belum Mengajukan' ? 'bg-gray-100 text-gray-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {desa.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                                    {formatRupiah(desa.realisasi)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BankeuPublicPage;
