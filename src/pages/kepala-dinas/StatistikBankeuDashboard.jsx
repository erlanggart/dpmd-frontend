import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMapPin, FiChevronDown, FiChevronUp, FiDownload, FiRefreshCw, FiTrendingUp
} from 'react-icons/fi';
import { 
  Building2, Shield, CheckCircle, MapPin, AlertCircle, FileText, 
  Sparkles, BarChart3, PieChart, Layers, Calendar, ArrowRight
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import api from '../../api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const StatistikBankeuDashboard = () => {
  const [tahunAnggaran, setTahunAnggaran] = useState(2027);
  const [proposals, setProposals] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    fetchData();
  }, [tahunAnggaran]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dpmd/bankeu/tracking?tahun_anggaran=${tahunAnggaran}`);
      if (response.data.success) {
        setProposals(response.data.data || []);
        setSummary(response.data.summary || {});
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching Bantuan Keuangan data:', err);
      setError('Gagal memuat data Bantuan Keuangan');
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  const getProposalStage = (proposal) => {
    if (proposal.dpmd_status === 'approved') return 'selesai';
    if (proposal.submitted_to_dpmd) return 'di_dpmd';
    if (proposal.kecamatan_status === 'approved') return 'di_dpmd';
    if (proposal.submitted_to_kecamatan && proposal.dinas_status === 'approved') return 'di_kecamatan';
    if (proposal.dinas_status === 'approved') return 'di_kecamatan';
    if (proposal.submitted_to_dinas_at) return 'di_dinas';
    return 'di_desa';
  };

  const handleExportExcel = () => {
    const exportData = proposals.map(item => ({
      'Kecamatan': item.desas?.kecamatans?.nama || '-',
      'Desa': item.desas?.nama || '-',
      'Kegiatan': item.bankeu_master_kegiatan?.nama_kegiatan || '-',
      'Dinas Terkait': item.bankeu_master_kegiatan?.dinas_terkait || '-',
      'Anggaran Usulan': item.anggaran_usulan || 0,
      'Status Dinas': item.dinas_status || 'pending',
      'Status Kecamatan': item.kecamatan_status || 'pending',
      'Status DPMD': item.dpmd_status || 'pending',
      'Tahap': getStageName(getProposalStage(item))
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Bankeu ${tahunAnggaran}`);
    XLSX.writeFile(wb, `Bantuan_Keuangan_${tahunAnggaran}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data berhasil diekspor ke Excel');
  };

  const processedData = useMemo(() => {
    return proposals.map(item => ({
      ...item,
      kecamatan: item.desas?.kecamatans?.nama || 'Tidak Diketahui',
      desa: item.desas?.nama || 'Tidak Diketahui',
      kegiatan: item.bankeu_master_kegiatan?.nama_kegiatan || '-',
      dinas: item.bankeu_master_kegiatan?.dinas_terkait || '-',
      anggaran: Number(item.anggaran_usulan) || 0,
      stage: getProposalStage(item)
    }));
  }, [proposals]);

  const filteredData = selectedStatus 
    ? processedData.filter(item => item.stage === selectedStatus)
    : processedData;

  const totalDesa = [...new Set(filteredData.map(p => p.desa_id))].length;
  const totalProposal = filteredData.length;
  const totalAnggaran = filteredData.reduce((sum, item) => sum + item.anggaran, 0);

  const statusStats = useMemo(() => {
    const stats = {
      di_desa: { count: 0, total: 0, label: 'Di Desa', icon: MapPin, color: '#64748b', gradient: 'from-slate-500 to-gray-600' },
      di_dinas: { count: 0, total: 0, label: 'Di Dinas', icon: Building2, color: '#f97316', gradient: 'from-orange-500 to-amber-500' },
      di_kecamatan: { count: 0, total: 0, label: 'Di Kecamatan', icon: Building2, color: '#3b82f6', gradient: 'from-blue-500 to-indigo-500' },
      di_dpmd: { count: 0, total: 0, label: 'Di DPMD', icon: Shield, color: '#8b5cf6', gradient: 'from-purple-500 to-violet-600' },
      selesai: { count: 0, total: 0, label: 'Selesai', icon: CheckCircle, color: '#22c55e', gradient: 'from-emerald-500 to-green-500' },
    };
    
    processedData.forEach(item => {
      if (stats[item.stage]) {
        stats[item.stage].count += 1;
        stats[item.stage].total += item.anggaran;
      }
    });
    
    return stats;
  }, [processedData]);

  const kecamatanStats = useMemo(() => {
    return filteredData.reduce((acc, item) => {
      if (!acc[item.kecamatan]) {
        acc[item.kecamatan] = { total: 0, count: 0, desas: [] };
      }
      acc[item.kecamatan].total += item.anggaran;
      acc[item.kecamatan].count += 1;
      acc[item.kecamatan].desas.push(item);
      return acc;
    }, {});
  }, [filteredData]);

  const totalKecamatan = Object.keys(kecamatanStats).length;

  const allKecamatan = Object.entries(kecamatanStats)
    .map(([name, stats]) => ({ name, total: stats.total }))
    .sort((a, b) => b.total - a.total);

  const kecamatanChartData = {
    labels: allKecamatan.slice(0, 10).map(k => k.name),
    datasets: [{
      label: 'Total Anggaran (Rp)',
      data: allKecamatan.slice(0, 10).map(k => k.total),
      backgroundColor: [
        'rgba(34, 211, 238, 0.85)',
        'rgba(59, 130, 246, 0.85)',
        'rgba(99, 102, 241, 0.85)',
        'rgba(139, 92, 246, 0.85)',
        'rgba(168, 85, 247, 0.85)',
        'rgba(217, 70, 239, 0.85)',
        'rgba(236, 72, 153, 0.85)',
        'rgba(244, 63, 94, 0.85)',
        'rgba(251, 146, 60, 0.85)',
        'rgba(250, 204, 21, 0.85)',
      ],
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 2,
      borderRadius: 8,
    }]
  };

  const statusChartData = {
    labels: Object.values(statusStats).map(s => s.label),
    datasets: [{
      data: Object.values(statusStats).map(s => s.count),
      backgroundColor: Object.values(statusStats).map(s => s.color),
      borderColor: 'rgba(255, 255, 255, 0.9)',
      borderWidth: 3,
      hoverOffset: 10,
    }]
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatShortRupiah = (value) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}M`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)}Jt`;
    return formatRupiah(value);
  };

  const toggleKecamatan = (kecamatanName) => {
    setExpandedKecamatan(prev => ({
      ...prev,
      [kecamatanName]: !prev[kecamatanName]
    }));
  };

  const getStatusBadge = (stage) => {
    const config = {
      'di_desa': 'bg-slate-100 text-slate-700 border-slate-300',
      'di_dinas': 'bg-orange-100 text-orange-700 border-orange-300',
      'di_kecamatan': 'bg-blue-100 text-blue-700 border-blue-300',
      'di_dpmd': 'bg-purple-100 text-purple-700 border-purple-300',
      'selesai': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    };
    return config[stage] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getStageName = (stage) => {
    const names = {
      'di_desa': 'Di Desa',
      'di_dinas': 'Di Dinas',
      'di_kecamatan': 'Di Kecamatan',
      'di_dpmd': 'Di DPMD',
      'selesai': 'Selesai',
    };
    return names[stage] || stage;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 mx-auto"></div>
            <Sparkles className="w-8 h-8 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="mt-6 text-gray-600 font-medium">Memuat data...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-slate-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center bg-white rounded-3xl p-8 border border-gray-200 shadow-xl"
        >
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button 
            onClick={fetchData} 
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/30 transition-all"
          >
            Coba Lagi
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6 lg:p-8">
      {/* Subtle Background Patterns */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 mb-8 shadow-2xl shadow-purple-500/20"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-200/30 rounded-full -ml-24 -mb-24"></div>
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-cyan-300/30 rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/50 rounded-xl backdrop-blur-sm shadow-lg">
                    <BarChart3 className="w-8 h-8 text-purple-700" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      Statistik Bantuan Keuangan
                    </h1>
                    <p className="text-white/90 mt-1">Infrastruktur Desa Kabupaten Bogor</p>
                  </div>
                </div>
              </div>
              
              {/* Year Selector & Refresh */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/30 backdrop-blur-sm rounded-2xl p-1.5 shadow-lg">
                  {[2026, 2027].map(year => (
                    <button
                      key={year}
                      onClick={() => setTahunAnggaran(year)}
                      className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                        tahunAnggaran === year 
                          ? 'bg-white text-purple-700 shadow-lg' 
                          : 'text-white hover:bg-white/30'
                      }`}
                    >
                      <Calendar className="w-4 h-4 inline mr-2" />
                      {year}
                    </button>
                  ))}
                </div>
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="p-3 bg-white/30 hover:bg-white/50 rounded-xl transition-all border border-white/50 shadow-lg"
                >
                  <FiRefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Proposal', value: totalProposal, icon: FileText, color: 'from-cyan-400 to-blue-500' },
                { label: 'Total Desa', value: totalDesa, icon: MapPin, color: 'from-pink-400 to-rose-500' },
                { label: 'Total Kecamatan', value: totalKecamatan, icon: Building2, color: 'from-amber-400 to-orange-500' },
                { label: 'Total Anggaran', value: formatShortRupiah(totalAnggaran), icon: FiTrendingUp, color: 'from-emerald-400 to-green-500' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-white/50 hover:shadow-lg transition-all group shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs font-medium">{stat.label}</p>
                      <p className="text-gray-800 text-xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Export Button */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <button
            onClick={handleExportExcel}
            className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-105"
          >
            <FiDownload className="w-5 h-5 group-hover:animate-bounce" />
            <span className="font-semibold">Export Excel</span>
            <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
          </button>
        </motion.div>

        {/* Status Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl p-6 mb-8 border border-gray-200 shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Status Proposal per Tahap</h3>
            </div>
            {selectedStatus && (
              <button
                onClick={() => setSelectedStatus(null)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors border border-gray-300"
              >
                ✕ Reset Filter
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(statusStats).map(([key, stat], index) => {
              const isSelected = selectedStatus === key;
              const IconComponent = stat.icon;
              
              return (
                <motion.div 
                  key={key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  onClick={() => setSelectedStatus(isSelected ? null : key)}
                  onMouseEnter={() => setHoveredCard(key)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all duration-300 bg-white border ${
                    isSelected ? 'ring-4 ring-purple-300 shadow-2xl border-purple-400' : 'border-gray-200 hover:shadow-lg'
                  }`}
                >
                  {/* Glow Effect */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 transition-opacity duration-300 ${
                      hoveredCard === key || isSelected ? 'opacity-100' : ''
                    }`}
                  ></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                        hoveredCard === key || isSelected ? 'bg-white/30' : 'bg-gray-100'
                      }`}>
                        <IconComponent className={`w-5 h-5 transition-colors ${
                          hoveredCard === key || isSelected ? 'text-white' : 'text-gray-600'
                        }`} style={{ color: hoveredCard === key || isSelected ? 'white' : stat.color }} />
                      </div>
                      <div className={`w-3 h-3 rounded-full animate-pulse`} style={{ backgroundColor: stat.color }}></div>
                    </div>
                    <p className={`text-sm font-medium mb-1 transition-colors ${
                      hoveredCard === key || isSelected ? 'text-white' : 'text-gray-600'
                    }`}>{stat.label}</p>
                    <p className={`text-3xl font-bold mb-2 transition-colors ${
                      hoveredCard === key || isSelected ? 'text-white' : 'text-gray-800'
                    }`}>{stat.count}</p>
                    <p className={`text-xs transition-colors ${
                      hoveredCard === key || isSelected ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      {formatShortRupiah(stat.total)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Top 10 Kecamatan</h3>
                <p className="text-gray-500 text-sm">Berdasarkan total anggaran</p>
              </div>
            </div>
            <div className="h-80">
              <Bar
                data={kecamatanChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      titleColor: '#1f2937',
                      bodyColor: '#4b5563',
                      padding: 16,
                      borderColor: 'rgba(0,0,0,0.1)',
                      borderWidth: 1,
                      cornerRadius: 12,
                      callbacks: {
                        label: (context) => `Total: ${formatRupiah(context.parsed.y)}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0,0,0,0.05)' },
                      ticks: {
                        color: 'rgba(100,116,139,0.8)',
                        callback: (value) => formatShortRupiah(value),
                        font: { size: 10 }
                      }
                    },
                    x: {
                      grid: { display: false },
                      ticks: {
                        color: 'rgba(100,116,139,0.8)',
                        font: { size: 9 },
                        maxRotation: 45,
                        minRotation: 45
                      }
                    }
                  }
                }}
              />
            </div>
          </motion.div>

          {/* Doughnut Chart */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <PieChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Distribusi Status</h3>
                <p className="text-gray-500 text-sm">Jumlah proposal per tahap</p>
              </div>
            </div>
            <div className="h-80 flex items-center justify-center">
              <Doughnut
                data={statusChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '60%',
                  plugins: {
                    legend: { 
                      position: 'right',
                      labels: {
                        color: 'rgba(55,65,81,0.9)',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: { size: 12 }
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      titleColor: '#1f2937',
                      bodyColor: '#4b5563',
                      padding: 16,
                      borderColor: 'rgba(0,0,0,0.1)',
                      borderWidth: 1,
                      cornerRadius: 12,
                    }
                  }
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Data Tables */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                <FiMapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Detail per Kecamatan</h3>
                <p className="text-gray-500 text-sm">Klik untuk melihat detail desa</p>
              </div>
            </div>
            {selectedStatus && (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 border border-purple-300 rounded-xl">
                <span className="text-sm text-purple-600">Filter:</span>
                <span className="text-sm font-bold text-purple-800">{getStageName(selectedStatus)}</span>
              </div>
            )}
          </div>
          
          {Object.keys(kecamatanStats).length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">Tidak ada data proposal untuk tahun {tahunAnggaran}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {Object.entries(kecamatanStats)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([kecamatanName, stats], index) => (
                    <motion.div 
                      key={kecamatanName}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-2xl overflow-hidden border border-gray-200 hover:border-purple-300 transition-all hover:shadow-lg"
                    >
                      <button
                        onClick={() => toggleKecamatan(kecamatanName)}
                        className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            <FiMapPin className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-semibold text-gray-800">{kecamatanName}</h4>
                            <p className="text-sm text-gray-500">{stats.count} Proposal</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-cyan-600">{formatRupiah(stats.total)}</span>
                          <motion.div
                            animate={{ rotate: expandedKecamatan[kecamatanName] ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <FiChevronDown className="w-5 h-5 text-gray-400" />
                          </motion.div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedKecamatan[kecamatanName] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-gray-200 bg-white">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desa</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kegiatan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Anggaran</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {stats.desas.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 text-sm text-gray-800">{item.desa}</td>
                                      <td className="px-6 py-4 text-sm text-gray-600">{item.kegiatan}</td>
                                      <td className="px-6 py-4">
                                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadge(item.stage)}`}>
                                          {getStageName(item.stage)}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-right font-semibold text-cyan-600">
                                        {formatRupiah(item.anggaran)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default StatistikBankeuDashboard;
