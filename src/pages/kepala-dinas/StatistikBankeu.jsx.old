// src/pages/kepala-dinas/StatistikBankeu.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiDollarSign, FiMapPin, FiUsers, FiCheckCircle, 
  FiClock, FiTrendingUp, FiFilter, FiDownload,
  FiSearch, FiPieChart, FiBarChart2, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const StatistikBankeu = () => {
  const [loading, setLoading] = useState(true);
  const [kegiatanData, setKegiatanData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [stats, setStats] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('kecamatan');
  const [groupByKecamatan, setGroupByKecamatan] = useState(true);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchBankeuData();
  }, []);

  useEffect(() => {
    filterAndSortData();
    setCurrentPage(1);
  }, [kegiatanData, filterStatus, searchTerm, sortBy]);

  const fetchBankeuData = async () => {
    try {
      setLoading(true);
      // Fetch from backend API endpoint
      const response = await api.get('/bankeu/data');
      const data = response.data.data;
      
      // Filter hanya data yang ada nominalnya (Realisasi > 0)
      const validData = data.filter(item => parseInt(item.Realisasi.replace(/,/g, '')) > 0);
      
      // Group data by kecamatan + desa untuk mendapatkan Tahap 1 dan Tahap 2
      const desaMap = {};
      validData.forEach(item => {
        const key = `${item.kecamatan}|${item.desa}`;
        if (!desaMap[key]) {
          desaMap[key] = {
            kecamatan: item.kecamatan,
            desa: item.desa,
            tahap1: null,
            tahap2: null
          };
        }
        
        // Tahap 1 = Dana Telah Dicairkan
        if (item.sts === 'Dana Telah Dicairkan') {
          desaMap[key].tahap1 = {
            sts: item.sts,
            realisasi: parseInt(item.Realisasi.replace(/,/g, ''))
          };
        } else {
          // Tahap 2 = status lainnya (Review, Proses, dll)
          desaMap[key].tahap2 = {
            sts: item.sts,
            realisasi: parseInt(item.Realisasi.replace(/,/g, ''))
          };
        }
      });

      const desaList = Object.values(desaMap);
      const uniqueKecamatans = [...new Set(desaList.map(d => d.kecamatan))];
      const totalDesa = desaList.length;

      const desaTahap1Selesai = desaList.filter(d => d.tahap1 !== null).length;
      const desaTahap2Proses = desaList.filter(d => d.tahap2 !== null).length;
      
      const totalRealisasiTahap1 = desaList.reduce((sum, d) => sum + (d.tahap1?.realisasi || 0), 0);
      const totalRealisasiTahap2 = desaList.reduce((sum, d) => sum + (d.tahap2?.realisasi || 0), 0);
      const totalRealisasi = totalRealisasiTahap1 + totalRealisasiTahap2;

      // Status breakdown
      const statusCount = {};
      validData.forEach(item => {
        statusCount[item.sts] = (statusCount[item.sts] || 0) + 1;
      });

      setStats({
        totalKecamatan: uniqueKecamatans.length,
        totalDesa,
        desaTahap1Selesai,
        desaTahap2Proses,
        totalRealisasiTahap1,
        totalRealisasiTahap2,
        totalRealisasi,
        percentageTahap1: (desaTahap1Selesai / totalDesa) * 100,
        percentageTahap2: (desaTahap2Proses / totalDesa) * 100,
        statusCount
      });
      
      setKegiatanData(desaList);
      setLoading(false);
    } catch (error) {
      console.error('Error loading bankeu data:', error);
      setLoading(false);
    }
  };

  const filterAndSortData = () => {
    let filtered = [...kegiatanData];

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.desa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kecamatan.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => {
        switch (filterStatus) {
          case 'tahap1-selesai':
            return item.tahap1 !== null;
          case 'tahap2-proses':
            return item.tahap2 !== null;
          case 'kedua-tahap':
            return item.tahap1 !== null && item.tahap2 !== null;
          default:
            return true;
        }
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'kecamatan':
          return a.kecamatan.localeCompare(b.kecamatan) || a.desa.localeCompare(b.desa);
        case 'desa':
          return a.desa.localeCompare(b.desa);
        case 'realisasi':
          const totalA = (a.tahap1?.realisasi || 0) + (a.tahap2?.realisasi || 0);
          const totalB = (b.tahap1?.realisasi || 0) + (b.tahap2?.realisasi || 0);
          return totalB - totalA;
        default:
          return 0;
      }
    });

    setFilteredData(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Dana Telah Dicairkan': 'bg-green-100 text-green-800 border-green-200',
      'Belum Mengajukan': 'bg-gray-100 text-gray-800 border-gray-200',
      'Dikembalikan ke Desa': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Dikembalikan ke Kecamatan': 'bg-orange-100 text-orange-800 border-orange-200',
      'Proses Pencairan Dana Oleh Bank': 'bg-blue-100 text-blue-800 border-blue-200',
      'Proses SPP,SPM,SP2D di BPKAD': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Review BPKAD': 'bg-purple-100 text-purple-800 border-purple-200',
      'Review DPMD': 'bg-pink-100 text-pink-800 border-pink-200',
      'Sedang di Proses oleh Kecamatan': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'default': 'bg-blue-100 text-blue-800 border-blue-200'
    };

    const style = styles[status] || styles.default;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${style}`}>
        {status}
      </span>
    );
  };

  const exportToExcel = () => {
    // Prepare data for Excel with formatted values
    const excelData = filteredData.map((item, index) => ({
      'No': index + 1,
      'Kecamatan': item.kecamatan,
      'Desa': item.desa,
      'Status Tahap 1': item.tahap1?.sts || '-',
      'Realisasi Tahap 1': item.tahap1?.realisasi || 0,
      'Status Tahap 2': item.tahap2?.sts || '-',
      'Realisasi Tahap 2': item.tahap2?.realisasi || 0,
      'Total Realisasi': (item.tahap1?.realisasi || 0) + (item.tahap2?.realisasi || 0)
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 5 },  // No
      { wch: 20 }, // Kecamatan
      { wch: 20 }, // Desa
      { wch: 35 }, // Status Tahap 1
      { wch: 18 }, // Realisasi Tahap 1
      { wch: 35 }, // Status Tahap 2
      { wch: 18 }, // Realisasi Tahap 2
      { wch: 18 }  // Total Realisasi
    ];
    ws['!cols'] = colWidths;

    // Add summary at the top
    const summaryData = [
      ['LAPORAN BANTUAN KEUANGAN INFRASTRUKTUR DESA 2025'],
      ['Dinas Pemberdayaan Masyarakat dan Desa - Kabupaten Bogor'],
      [],
      ['Total Kecamatan', stats.totalKecamatan],
      ['Total Desa', stats.totalDesa],
      ['Tahap 1 Selesai (Dana Dicairkan)', stats.desaTahap1Selesai + ' desa'],
      ['Tahap 2 Proses', stats.desaTahap2Proses + ' desa'],
      ['Total Realisasi Tahap 1', formatCurrency(stats.totalRealisasiTahap1)],
      ['Total Realisasi Tahap 2', formatCurrency(stats.totalRealisasiTahap2)],
      ['Total Realisasi Keseluruhan', formatCurrency(stats.totalRealisasi)],
      ['Tanggal Export', new Date().toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })],
      [],
      ['DETAIL DATA PER DESA']
    ];

    // Insert summary before data
    XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: 'A1' });
    
    // Adjust data position
    const dataStartRow = summaryData.length + 1;
    XLSX.utils.sheet_add_json(ws, excelData, { 
      origin: `A${dataStartRow}`,
      skipHeader: false 
    });

    // Style header row (bold)
    const headerRow = dataStartRow;
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Merge cells for title
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }  // Subtitle
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Bantuan Keuangan 2025');

    // Generate filename with timestamp
    const fileName = `Laporan_Bantuan_Keuangan_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, fileName);
    
    toast.success('File Excel berhasil didownload!');
  };

  const getGroupedData = () => {
    const grouped = {};
    filteredData.forEach(desaData => {
      if (!grouped[desaData.kecamatan]) {
        grouped[desaData.kecamatan] = [];
      }
      grouped[desaData.kecamatan].push(desaData);
    });
    return grouped;
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Chart Data
  const statusChartData = {
    labels: Object.keys(stats.statusCount || {}),
    datasets: [
      {
        label: 'Jumlah Desa',
        data: Object.values(stats.statusCount || {}),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(6, 182, 212, 0.8)',
          'rgba(249, 115, 22, 0.8)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 11 },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-600"></div>
      </div>
    );
  }

  const groupedData = groupByKecamatan ? getGroupedData() : null;

  return (
    <div className="p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white shadow-xl mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
              <FiDollarSign className="text-4xl" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Bantuan Keuangan Infrastruktur Desa 2025</h1>
              <p className="text-green-100 mt-2">Monitoring dan statistik program bantuan keuangan infrastruktur desa</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FiMapPin className="text-xl" />
                <span className="text-sm">Kecamatan</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalKecamatan}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FiUsers className="text-xl" />
                <span className="text-sm">Total Desa</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalDesa}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FiCheckCircle className="text-xl" />
                <span className="text-sm">Tahap 1 Selesai</span>
              </div>
              <p className="text-3xl font-bold text-green-300">{stats.desaTahap1Selesai}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FiClock className="text-xl" />
                <span className="text-sm">Tahap 2 Proses</span>
              </div>
              <p className="text-3xl font-bold text-yellow-300">{stats.desaTahap2Proses}</p>
            </div>
          </div>

          {/* Total Realisasi */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-2">
                <FiDollarSign className="text-2xl" />
                <span className="text-sm font-semibold">Realisasi Tahap 1 (Dicairkan)</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">{formatCurrency(stats.totalRealisasiTahap1)}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-2">
                <FiTrendingUp className="text-2xl" />
                <span className="text-sm font-semibold">Realisasi Tahap 2 (Proses)</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">{formatCurrency(stats.totalRealisasiTahap2)}</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pie Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiPieChart className="text-green-600" />
              Distribusi Status
            </h3>
            <div className="h-80">
              <Pie data={statusChartData} options={chartOptions} />
            </div>
          </div>

          {/* Progress Bars */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FiBarChart2 className="text-green-600" />
              Progress Pencairan
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Tahap 1 (Dana Dicairkan)</span>
                  <span className="text-lg font-bold text-green-600">{stats.percentageTahap1?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500 flex items-center justify-end px-2"
                    style={{ width: `${stats.percentageTahap1}%` }}
                  >
                    <span className="text-xs font-bold text-white">{stats.desaTahap1Selesai}/{stats.totalDesa}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Tahap 2 (Dalam Proses)</span>
                  <span className="text-lg font-bold text-yellow-600">{stats.percentageTahap2?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-600 transition-all duration-500 flex items-center justify-end px-2"
                    style={{ width: `${stats.percentageTahap2}%` }}
                  >
                    <span className="text-xs font-bold text-white">{stats.desaTahap2Proses}/{stats.totalDesa}</span>
                  </div>
                </div>
              </div>

              {/* Total Realisasi Card */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white mt-6">
                <p className="text-sm font-semibold mb-2">Total Realisasi Keseluruhan</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.totalRealisasi)}</p>
                <p className="text-xs text-green-100 mt-2">Dari {stats.totalDesa} desa penerima</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari kecamatan atau desa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setGroupByKecamatan(!groupByKecamatan)}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-colors ${
                  groupByKecamatan 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {groupByKecamatan ? 'Per Kecamatan' : 'Semua Desa'}
              </button>

              <div className="flex items-center space-x-2">
                <FiFilter className="text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="all">Semua Data</option>
                  <option value="tahap1-selesai">Tahap 1 Selesai</option>
                  <option value="tahap2-proses">Tahap 2 Proses</option>
                  <option value="kedua-tahap">Kedua Tahap Ada</option>
                </select>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="kecamatan">Urutkan: Kecamatan</option>
                <option value="desa">Urutkan: Desa A-Z</option>
                <option value="realisasi">Urutkan: Realisasi</option>
              </select>

              <button
                onClick={exportToExcel}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-sm hover:shadow-md"
              >
                <FiDownload />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Menampilkan <span className="font-semibold text-gray-800">{filteredData.length}</span> dari <span className="font-semibold text-gray-800">{kegiatanData.length}</span> desa
          </div>
        </div>

        {/* Data Table */}
        {groupByKecamatan ? (
          // Grouped View
          <div className="space-y-6">
            {Object.keys(groupedData).map((kecamatan, index) => {
              const kecDesaList = groupedData[kecamatan];
              const kecTotal = kecDesaList.length;
              const kecTahap1 = kecDesaList.filter(d => d.tahap1).length;
              const kecTahap2 = kecDesaList.filter(d => d.tahap2).length;
              const kecPercentage = (kecTahap1 / kecTotal) * 100;
              
              const kecRealisasiT1 = kecDesaList.reduce((sum, d) => sum + (d.tahap1?.realisasi || 0), 0);
              const kecRealisasiT2 = kecDesaList.reduce((sum, d) => sum + (d.tahap2?.realisasi || 0), 0);
              const kecRealisasiTotal = kecRealisasiT1 + kecRealisasiT2;

              const isExpanded = expandedKecamatan[kecamatan] ?? false;
              
              return (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 p-6 cursor-pointer hover:from-green-100 hover:to-emerald-100 transition-colors"
                    onClick={() => setExpandedKecamatan(prev => ({ ...prev, [kecamatan]: !isExpanded }))}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="bg-green-600 text-white p-3 rounded-lg">
                            <FiMapPin className="text-xl" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">{kecamatan}</h3>
                            <p className="text-sm text-gray-600 mt-1">{kecTotal} Desa</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <span className="text-2xl font-bold text-green-600">{kecPercentage.toFixed(1)}%</span>
                            <p className="text-xs text-gray-600">Tahap 1 Selesai</p>
                          </div>
                          <div className="bg-green-600 text-white p-2 rounded-lg">
                            {isExpanded ? <FiChevronUp className="text-xl" /> : <FiChevronDown className="text-xl" />}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Tahap 1 Selesai</p>
                          <p className="text-lg font-bold text-green-600">{kecTahap1} Desa</p>
                          <p className="text-xs text-gray-500 mt-1">{formatCurrency(kecRealisasiT1)}</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Tahap 2 Proses</p>
                          <p className="text-lg font-bold text-yellow-600">{kecTahap2} Desa</p>
                          <p className="text-xs text-gray-500 mt-1">{formatCurrency(kecRealisasiT2)}</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Total Realisasi</p>
                          <p className="text-lg font-bold text-gray-800">{formatCurrency(kecRealisasiTotal)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b-2 border-gray-200">
                              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">No</th>
                              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Nama Desa</th>
                              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Status Tahap 1</th>
                              <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Realisasi Tahap 1</th>
                              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Status Tahap 2</th>
                              <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Realisasi Tahap 2</th>
                              <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {kecDesaList.map((desa, idx) => (
                              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{desa.desa}</td>
                                <td className="px-4 py-3">
                                  {desa.tahap1 ? getStatusBadge(desa.tahap1.sts) : <span className="text-xs text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                                  {desa.tahap1 ? formatCurrency(desa.tahap1.realisasi) : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  {desa.tahap2 ? getStatusBadge(desa.tahap2.sts) : <span className="text-xs text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-semibold text-yellow-600">
                                  {desa.tahap2 ? formatCurrency(desa.tahap2.realisasi) : '-'}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">
                                  {formatCurrency((desa.tahap1?.realisasi || 0) + (desa.tahap2?.realisasi || 0))}
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
        ) : (
          // Flat Table View with Pagination
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">No</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Kecamatan</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Desa</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status Tahap 1</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">Realisasi Tahap 1</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status Tahap 2</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">Realisasi Tahap 2</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((desa, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{indexOfFirstItem + index + 1}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{desa.kecamatan}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">{desa.desa}</td>
                      <td className="px-6 py-4">
                        {desa.tahap1 ? getStatusBadge(desa.tahap1.sts) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">
                        {desa.tahap1 ? formatCurrency(desa.tahap1.realisasi) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {desa.tahap2 ? getStatusBadge(desa.tahap2.sts) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-yellow-600">
                        {desa.tahap2 ? formatCurrency(desa.tahap2.realisasi) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-800">
                        {formatCurrency((desa.tahap1?.realisasi || 0) + (desa.tahap2?.realisasi || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!groupByKecamatan && filteredData.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Items per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, idx) => (
                        page === '...' ? (
                          <span key={idx} className="px-3 py-1.5 text-gray-500">...</span>
                        ) : (
                          <button
                            key={idx}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                              currentPage === page
                                ? 'bg-green-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>

                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatistikBankeu;
