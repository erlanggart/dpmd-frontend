// src/pages/KegiatanDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiMapPin, FiUsers, FiDollarSign, FiTrendingUp, 
  FiCheckCircle, FiClock, FiAlertCircle, FiFilter, FiDownload,
  FiSearch, FiPieChart, FiBarChart2, FiActivity, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import Footer from '../components/landingpage/Footer';

const KegiatanDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [programData, setProgramData] = useState(null);
  const [kegiatanData, setKegiatanData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('kecamatan');
  const [groupByKecamatan, setGroupByKecamatan] = useState(true);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Define programs (should match KegiatanSection)
  const programs = {
    'bantuan-keuangan-infrastruktur-2025': {
      title: 'Program Bantuan Keuangan Infrastruktur Desa 2025',
      description: 'Program bantuan keuangan untuk pembangunan dan perbaikan infrastruktur desa di seluruh Kabupaten Bogor tahun 2025.',
      year: '2025',
      dataFile: 'bankeu2025.json'
    },
    'bimtek-bumdes-2025': {
      title: 'Bimbingan Teknis Pengelolaan BUMDes',
      description: 'Program pelatihan dan pendampingan teknis untuk meningkatkan kapasitas pengelola BUMDes.',
      year: '2025',
      dataFile: null
    },
    'pelatihan-aparatur-desa-2025': {
      title: 'Pelatihan Aparatur Desa',
      description: 'Program peningkatan kompetensi aparatur desa melalui pelatihan administrasi pemerintahan.',
      year: '2025',
      dataFile: null
    },
    'pengembangan-produk-unggulan-desa': {
      title: 'Program Pengembangan Produk Unggulan Desa',
      description: 'Pendampingan dan pembinaan pengembangan produk unggulan desa.',
      year: '2025',
      dataFile: null
    }
  };

  useEffect(() => {
    const program = programs[slug];
    if (program) {
      setProgramData(program);
      if (program.dataFile) {
        fetchKegiatanData(program.dataFile);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    filterAndSortData();
    setCurrentPage(1); // Reset to page 1 when filter changes
  }, [kegiatanData, filterStatus, searchTerm, sortBy]);

  const fetchKegiatanData = async (dataFile) => {
    try {
      const response = await fetch(`/${dataFile}`);
      const data = await response.json();
      
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

      // Convert to array
      const desaList = Object.values(desaMap);

      // Count unique kecamatans and desas
      const uniqueKecamatans = [...new Set(desaList.map(d => d.kecamatan))];
      const totalDesa = desaList.length;

      // Calculate stats
      const desaTahap1Selesai = desaList.filter(d => d.tahap1 !== null).length;
      const desaTahap2Proses = desaList.filter(d => d.tahap2 !== null).length;
      
      const totalRealisasiTahap1 = desaList.reduce((sum, d) => sum + (d.tahap1?.realisasi || 0), 0);
      const totalRealisasiTahap2 = desaList.reduce((sum, d) => sum + (d.tahap2?.realisasi || 0), 0);
      const totalRealisasi = totalRealisasiTahap1 + totalRealisasiTahap2;

      setStats({
        totalKecamatan: uniqueKecamatans.length,
        totalDesa,
        desaTahap1Selesai,
        desaTahap2Proses,
        totalRealisasiTahap1,
        totalRealisasiTahap2,
        totalRealisasi,
        percentageTahap1: (desaTahap1Selesai / totalDesa) * 100
      });
      
      setKegiatanData(desaList);
      setLoading(false);
    } catch (error) {
      console.error('Error loading kegiatan data:', error);
      setLoading(false);
    }
  };

  const filterAndSortData = () => {
    let filtered = [...kegiatanData];

    // Filter by search (search in kecamatan and desa names)
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.desa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kecamatan.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
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

    // Sort
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

  const getStatusIcon = (status) => {
    if (status === 'Dana Telah Dicairkan') return <FiCheckCircle className="text-green-600" />;
    if (status === 'Belum Mengajukan') return <FiAlertCircle className="text-gray-600" />;
    return <FiClock className="text-slate-600" />;
  };

  const exportToCSV = () => {
    const headers = ['No', 'Kecamatan', 'Desa', 'Status Tahap 1', 'Realisasi Tahap 1', 'Status Tahap 2', 'Realisasi Tahap 2', 'Total Realisasi'];
    const rows = filteredData.map((item, index) => [
      index + 1,
      item.kecamatan,
      item.desa,
      item.tahap1?.sts || '-',
      item.tahap1?.realisasi || 0,
      item.tahap2?.sts || '-',
      item.tahap2?.realisasi || 0,
      (item.tahap1?.realisasi || 0) + (item.tahap2?.realisasi || 0)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${slug}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Group data by kecamatan for grouped view
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Generate page numbers with ellipsis
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-slate-700"></div>
        </div>
      </div>
    );
  }

  if (!programData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container max-w-7xl mx-auto px-4 md:px-6 py-20 text-center">
          <FiAlertCircle className="text-6xl text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Program Tidak Ditemukan</h1>
          <p className="text-gray-600 mb-8">Program yang Anda cari tidak tersedia.</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold"
          >
            <FiArrowLeft />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!programData.dataFile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container max-w-7xl mx-auto px-4 md:px-6 py-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 text-slate-700 hover:text-slate-900 font-semibold mb-4 group"
          >
            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            <span>Kembali ke Beranda</span>
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <FiActivity className="text-6xl text-slate-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{programData.title}</h1>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">{programData.description}</p>
            <div className="inline-flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-6 py-3 rounded-lg">
              <FiClock />
              <span className="font-semibold">Data belum tersedia</span>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const groupedData = groupByKecamatan ? getGroupedData() : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 text-slate-700 hover:text-slate-900 font-semibold mb-4 group"
          >
            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            <span>Kembali ke Beranda</span>
          </button>

          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                <FiActivity className="text-3xl" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{programData.title}</h1>
                <p className="text-slate-200 mt-2">{programData.description}</p>
              </div>
            </div>

            {/* Stats Cards */}
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

            {/* Total Realisasi & Progress */}
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

            <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <FiDollarSign className="text-2xl" />
                    <span className="text-sm font-semibold">Total Realisasi Keseluruhan</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold">{formatCurrency(stats.totalRealisasi)}</p>
                </div>
                
                <div className="flex-1 max-w-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Progress Tahap 1</span>
                    <span className="text-2xl font-bold">{stats.percentageTahap1?.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                      style={{ width: `${stats.percentageTahap1}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari kecamatan atau desa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* View Toggle */}
              <button
                onClick={() => setGroupByKecamatan(!groupByKecamatan)}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-colors ${
                  groupByKecamatan 
                    ? 'bg-slate-700 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {groupByKecamatan ? 'Tampilan: Per Kecamatan' : 'Tampilan: Semua Desa'}
              </button>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <FiFilter className="text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                >
                  <option value="all">Semua Data</option>
                  <option value="tahap1-selesai">Tahap 1 Selesai</option>
                  <option value="tahap2-proses">Tahap 2 Proses</option>
                  <option value="kedua-tahap">Kedua Tahap Ada</option>
                </select>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="kecamatan">Urutkan: Kecamatan</option>
                <option value="desa">Urutkan: Desa A-Z</option>
                <option value="realisasi">Urutkan: Realisasi</option>
              </select>

              {/* Export */}
              <button
                onClick={exportToCSV}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                <FiDownload />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Menampilkan <span className="font-semibold text-gray-800">{filteredData.length}</span> dari <span className="font-semibold text-gray-800">{kegiatanData.length}</span> desa
          </div>
        </div>

        {/* Data Display */}
        {groupByKecamatan ? (
          // Grouped by Kecamatan View
          <div className="space-y-6">
            {Object.keys(groupedData).map((kecamatan, index) => {
              const kecDesaList = groupedData[kecamatan];
              
              // Hitung stats berdasarkan desa unik
              const kecTotal = kecDesaList.length;
              const kecTahap1 = kecDesaList.filter(d => d.tahap1).length;
              const kecTahap2 = kecDesaList.filter(d => d.tahap2).length;
              const kecPercentage = (kecTahap1 / kecTotal) * 100;
              
              // Total realisasi
              const kecRealisasiT1 = kecDesaList.reduce((sum, d) => sum + (d.tahap1?.realisasi || 0), 0);
              const kecRealisasiT2 = kecDesaList.reduce((sum, d) => sum + (d.tahap2?.realisasi || 0), 0);
              const kecRealisasiTotal = kecRealisasiT1 + kecRealisasiT2;

              const isExpanded = expandedKecamatan[kecamatan] ?? false; // Default tertutup
              
              return (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                  {/* Kecamatan Header - Clickable */}
                  <div 
                    className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200 p-6 cursor-pointer hover:from-slate-100 hover:to-slate-200 transition-colors duration-200"
                    onClick={() => setExpandedKecamatan(prev => ({ ...prev, [kecamatan]: !isExpanded }))}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="bg-slate-700 text-white p-3 rounded-lg">
                            <FiMapPin className="text-xl" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">{kecamatan}</h3>
                            <p className="text-sm text-gray-600 mt-1">{kecTotal} Desa</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <span className="text-2xl font-bold text-slate-700">{kecPercentage.toFixed(1)}%</span>
                            <p className="text-xs text-gray-600">Tahap 1 Selesai</p>
                          </div>
                          <div className="bg-slate-700 text-white p-2 rounded-lg transition-transform duration-200">
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
                          <p className="text-lg font-bold text-slate-700">{formatCurrency(kecRealisasiTotal)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desa Table - Collapsible */}
                  <div 
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${
                      isExpanded ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-12">No</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nama Desa</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Tahap 1</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Realisasi</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Tahap 2</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Realisasi</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {kecDesaList.map((desaData, desaIndex) => (
                          <tr key={desaIndex} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 text-sm text-gray-500">{desaIndex + 1}</td>
                            <td className="px-4 py-4">
                              <span className="text-sm font-medium text-gray-900">{desaData.desa}</span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              {desaData.tahap1 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                                  <FiCheckCircle className="mr-1" /> Selesai
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className={`text-sm font-semibold ${desaData.tahap1 ? 'text-green-600' : 'text-gray-400'}`}>
                                {desaData.tahap1 ? formatCurrency(desaData.tahap1.realisasi) : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              {desaData.tahap2 ? (
                                getStatusBadge(desaData.tahap2.sts)
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className={`text-sm font-semibold ${desaData.tahap2 ? 'text-yellow-600' : 'text-gray-400'}`}>
                                {desaData.tahap2 ? formatCurrency(desaData.tahap2.realisasi) : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className="text-sm font-bold text-slate-700">
                                {formatCurrency((desaData.tahap1?.realisasi || 0) + (desaData.tahap2?.realisasi || 0))}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Flat Table View
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase w-12">No</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Kecamatan</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Desa</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Tahap 1</th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Realisasi</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Tahap 2</th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Realisasi</th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentItems.map((desaData, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{indexOfFirstItem + index + 1}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{desaData.kecamatan}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{desaData.desa}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {desaData.tahap1 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                            <FiCheckCircle className="mr-1" /> Selesai
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold ${desaData.tahap1 ? 'text-green-600' : 'text-gray-400'}`}>
                          {desaData.tahap1 ? formatCurrency(desaData.tahap1.realisasi) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {desaData.tahap2 ? (
                          getStatusBadge(desaData.tahap2.sts)
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold ${desaData.tahap2 ? 'text-yellow-600' : 'text-gray-400'}`}>
                          {desaData.tahap2 ? formatCurrency(desaData.tahap2.realisasi) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-slate-700">
                          {formatCurrency((desaData.tahap1?.realisasi || 0) + (desaData.tahap2?.realisasi || 0))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredData.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Tidak ada data ditemukan</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination - Only for flat table view */}
        {!groupByKecamatan && filteredData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items per page */}
              <div className="flex items-center space-x-2">
                <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
                  Tampilkan:
                </label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600">
                  data per halaman
                </span>
              </div>

              {/* Page info */}
              <div className="text-sm text-gray-600">
                Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredData.length)} dari {filteredData.length} data
              </div>

              {/* Pagination buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium">← Sebelumnya</span>
                </button>

                <div className="flex items-center space-x-1">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-slate-700 text-white border-slate-700'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>

                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium">Selanjutnya →</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default KegiatanDetailPage;
