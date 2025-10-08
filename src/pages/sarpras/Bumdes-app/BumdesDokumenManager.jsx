import React, { useState, useEffect } from 'react';
import { 
  FiDownload, 
  FiEye, 
  FiSearch, 
  FiFilter, 
  FiRefreshCw,
  FiFileText,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiBarChart2,
  FiFile
} from 'react-icons/fi';
import API_CONFIG from '../../../config/api';

const BumdesDokumenManager = () => {
  const [activeTab, setActiveTab] = useState('badan-hukum');
  const [dokumenBadanHukum, setDokumenBadanHukum] = useState([]);
  const [laporanKeuangan, setLaporanKeuangan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Location filters
  const [filterKecamatan, setFilterKecamatan] = useState('all');
  const [filterDesa, setFilterDesa] = useState('all');
  const [availableKecamatan, setAvailableKecamatan] = useState([]);
  const [availableDesa, setAvailableDesa] = useState([]);

  const fetchDokumenBadanHukum = async () => {
    try {
      console.log('Fetching dokumen badan hukum...');
      const response = await fetch(`${API_CONFIG.BASE_URL}/bumdes/dokumen-badan-hukum`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      
      console.log('Response received:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Data parsed:', { status: result.status, count: result.data?.length });
      
      if (result.status === 'success') {
        console.log('Setting dokumen badan hukum data:', result.data?.length, 'items');
        setDokumenBadanHukum(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch dokumen badan hukum');
      }
    } catch (error) {
      console.error('Error fetching dokumen badan hukum:', error);
      setError(error.message);
    }
  };

  const fetchLaporanKeuangan = async () => {
    try {
      console.log('Fetching laporan keuangan...');
      const response = await fetch(`${API_CONFIG.BASE_URL}/bumdes/laporan-keuangan`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      
      console.log('Response received:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Data parsed:', { status: result.status, count: result.data?.length });
      
      if (result.status === 'success') {
        console.log('Setting laporan keuangan data:', result.data?.length, 'items');
        setLaporanKeuangan(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch laporan keuangan');
      }
    } catch (error) {
      console.error('Error fetching laporan keuangan:', error);
      setError(error.message);
    }
  };

  const parseDesaInfo = (desaString) => {
    if (!desaString) return { namaDesa: '' };
    const parts = desaString.split(',').map(part => part.trim());
    return { namaDesa: parts[0] };
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    // Fetch data secara berurutan untuk debugging yang lebih baik
    try {
      console.log('Starting data fetch...');
      
      // Fetch dokumen badan hukum
      await fetchDokumenBadanHukum();
      console.log('Dokumen badan hukum fetched');
      
      // Fetch laporan keuangan
      await fetchLaporanKeuangan();
      console.log('Laporan keuangan fetched');
      
      console.log('All data fetched successfully');
      
      // Location data will be extracted via useEffect when states change
    } catch (error) {
      console.error('Error in fetchAllData:', error);
      setError(`Failed to fetch data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const extractLocationData = (dokumenData, laporanData) => {
    const kecamatanSet = new Set();
    const desaSet = new Set();
    
    // Combine all data
    const allData = [...(dokumenData || []), ...(laporanData || [])];
    
    allData.forEach(item => {
      if (item.kecamatan) kecamatanSet.add(item.kecamatan);
      if (item.desa) {
        const desaInfo = parseDesaInfo(item.desa);
        if (desaInfo.namaDesa) desaSet.add(desaInfo.namaDesa);
      }
    });
    
    setAvailableKecamatan([...kecamatanSet].sort());
    setAvailableDesa([...desaSet].sort());
  };

  useEffect(() => {
    console.log('BumdesDokumenManager mounting, fetching data...');
    fetchAllData();
  }, []);

  // Update location data when documents change
  useEffect(() => {
    if (dokumenBadanHukum.length > 0 || laporanKeuangan.length > 0) {
      extractLocationData(dokumenBadanHukum, laporanKeuangan);
    }
  }, [dokumenBadanHukum, laporanKeuangan]);

  const getCurrentData = () => {
    return activeTab === 'badan-hukum' ? dokumenBadanHukum : laporanKeuangan;
  };

  const filteredData = getCurrentData().filter(item => {
    const matchesSearch = 
      item.bumdes_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kecamatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.filename?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || item.document_type === filterType;
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'available' && item.file_exists) ||
      (filterStatus === 'missing' && !item.file_exists) ||
      (filterStatus === 'unlinked' && item.document_type === 'unlinked');

    const matchesKecamatan = filterKecamatan === 'all' || item.kecamatan === filterKecamatan;
    
    const matchesDesa = filterDesa === 'all' || (() => {
      if (!item.desa) return false;
      const desaInfo = parseDesaInfo(item.desa);
      return desaInfo.namaDesa === filterDesa;
    })();

    return matchesSearch && matchesType && matchesStatus && matchesKecamatan && matchesDesa;
  });

  const getDocumentTypeLabel = (type) => {
    if (activeTab === 'badan-hukum') {
      const labels = {
        Perdes: 'Peraturan Desa',
        ProfilBUMDesa: 'Profil BUMDes',
        BeritaAcara: 'Berita Acara',
        AnggaranDasar: 'Anggaran Dasar',
        AnggaranRumahTangga: 'Anggaran RT',
        ProgramKerja: 'Program Kerja',
        SK_BUM_Desa: 'SK BUMDes',
        unlinked: 'Tidak Terhubung'
      };
      return labels[type] || type;
    } else {
      const labels = {
        LaporanKeuangan2021: '2021',
        LaporanKeuangan2022: '2022',
        LaporanKeuangan2023: '2023',
        LaporanKeuangan2024: '2024',
        unlinked: 'Tidak Terhubung'
      };
      return labels[type] || type;
    }
  };

  const getStatusBadge = (item) => {
    if (item.document_type === 'unlinked') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          <FiAlertCircle className="w-3 h-3" />
          Tidak Terhubung
        </span>
      );
    }
    
    if (item.file_exists) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          <FiCheck className="w-3 h-3" />
          Tersedia
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
          <FiX className="w-3 h-3" />
          Hilang
        </span>
      );
    }
  };

  const getFilterOptions = () => {
    if (activeTab === 'badan-hukum') {
      return [
        { value: 'all', label: 'Semua Dokumen' },
        { value: 'Perdes', label: 'Peraturan Desa' },
        { value: 'ProfilBUMDesa', label: 'Profil BUMDes' },
        { value: 'BeritaAcara', label: 'Berita Acara' },
        { value: 'AnggaranDasar', label: 'Anggaran Dasar' },
        { value: 'AnggaranRumahTangga', label: 'Anggaran RT' },
        { value: 'ProgramKerja', label: 'Program Kerja' },
        { value: 'SK_BUM_Desa', label: 'SK BUMDes' },
        { value: 'unlinked', label: 'Tidak Terhubung' }
      ];
    } else {
      return [
        { value: 'all', label: 'Semua Tahun' },
        { value: 'LaporanKeuangan2021', label: '2021' },
        { value: 'LaporanKeuangan2022', label: '2022' },
        { value: 'LaporanKeuangan2023', label: '2023' },
        { value: 'LaporanKeuangan2024', label: '2024' },
        { value: 'unlinked', label: 'Tidak Terhubung' }
      ];
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <FiRefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
        <p className="text-gray-600">Memuat data dokumen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <FiAlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchAllData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiFileText className="text-blue-600" />
            Kelola Dokumen BUMDes
          </h1>
          <p className="text-gray-600 mt-1">
            Kelola dokumen badan hukum dan laporan keuangan dari semua BUMDes
          </p>
        </div>
        <button
          onClick={fetchAllData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh Data
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('badan-hukum');
              setFilterType('all');
              setSearchTerm('');
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'badan-hukum'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiFileText className="w-4 h-4" />
              Dokumen Badan Hukum
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                {dokumenBadanHukum.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('laporan-keuangan');
              setFilterType('all');
              setSearchTerm('');
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'laporan-keuangan'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiBarChart2 className="w-4 h-4" />
              Laporan Keuangan
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                {laporanKeuangan.length}
              </span>
            </div>
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FiSearch className="inline w-4 h-4 mr-1" />
              Cari
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama BUMDes, desa, atau file..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter by Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FiFilter className="inline w-4 h-4 mr-1" />
              Filter Jenis
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {getFilterOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Kecamatan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kecamatan
            </label>
            <select
              value={filterKecamatan}
              onChange={(e) => {
                setFilterKecamatan(e.target.value);
                setFilterDesa('all'); // Reset desa when kecamatan changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Kecamatan</option>
              {availableKecamatan.map(kec => (
                <option key={kec} value={kec}>{kec}</option>
              ))}
            </select>
          </div>

          {/* Filter by Desa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Desa
            </label>
            <select
              value={filterDesa}
              onChange={(e) => setFilterDesa(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={filterKecamatan === 'all'}
            >
              <option value="all">Semua Desa</option>
              {availableDesa
                .filter(desa => {
                  if (filterKecamatan === 'all') return true;
                  // Filter desa based on selected kecamatan
                  const allData = [...dokumenBadanHukum, ...laporanKeuangan];
                  const matchingItems = allData.filter(item => 
                    item.kecamatan === filterKecamatan &&
                    parseDesaInfo(item.desa).namaDesa === desa
                  );
                  return matchingItems.length > 0;
                })
                .map(desa => (
                  <option key={desa} value={desa}>{desa}</option>
                ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status File
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="available">Tersedia</option>
              <option value="missing">Hilang</option>
              <option value="unlinked">Tidak Terhubung</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-white rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredData.length}</div>
            <div className="text-sm text-gray-600">Total File</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredData.filter(item => item.file_exists).length}
            </div>
            <div className="text-sm text-gray-600">Tersedia</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredData.filter(item => !item.file_exists).length}
            </div>
            <div className="text-sm text-gray-600">Hilang</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredData.filter(item => item.document_type === 'unlinked').length}
            </div>
            <div className="text-sm text-gray-600">Tidak Terhubung</div>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BUMDes
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'badan-hukum' ? 'Jenis Dokumen' : 'Tahun'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.bumdes_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.desa && item.kecamatan ? `${item.desa}, ${item.kecamatan}` : 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getDocumentTypeLabel(item.document_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={item.filename}>
                        {item.filename}
                      </div>
                      {item.file_size_formatted && (
                        <div className="text-sm text-gray-500">
                          {item.file_size_formatted} • {item.last_modified}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {item.file_exists && item.download_url && (
                        <>
                          <button
                            onClick={() => window.open(item.download_url, '_blank')}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg transition-colors"
                            title="Lihat file"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = item.download_url;
                              link.download = item.filename;
                              link.click();
                            }}
                            className="bg-green-50 hover:bg-green-100 text-green-600 p-2 rounded-lg transition-colors"
                            title="Download file"
                          >
                            <FiDownload className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {!item.file_exists && (
                        <span className="text-gray-400 text-sm">File tidak tersedia</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="p-8 text-center">
            <FiFileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
            <p className="text-gray-500">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Tidak ditemukan data sesuai filter'
                : `Belum ada ${activeTab === 'badan-hukum' ? 'dokumen badan hukum' : 'laporan keuangan'} yang tersedia`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BumdesDokumenManager;
