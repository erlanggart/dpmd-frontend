// BHPRD Dashboard dengan Tab Navigation (3 Tabs)
import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiMapPin, FiUsers, FiTrendingUp, FiDownload, FiUpload, FiChevronDown, FiChevronUp, FiX, FiSearch, FiFilter, FiActivity, FiBarChart2 } from 'react-icons/fi';
import { Activity } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const BhprdDashboard = () => {
  const [activeTab, setActiveTab] = useState('tahap1');
  const [loading, setLoading] = useState(true);
  const [dataTahap1, setDataTahap1] = useState([]);
  const [dataTahap2, setDataTahap2] = useState([]);
  const [dataTahap3, setDataTahap3] = useState([]);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    
    // Fetch Tahap 1
    try {
      const response1 = await api.get('/bhprd-t1/data');
      setDataTahap1(response1.data.data || []);
    } catch (err) {
      console.warn('Error loading BHPRD Tahap 1:', err);
      setDataTahap1([]);
    }

    // Fetch Tahap 2
    try {
      const response2 = await api.get('/bhprd-t2/data');
      setDataTahap2(response2.data.data || []);
    } catch (err) {
      console.warn('Error loading BHPRD Tahap 2:', err);
      setDataTahap2([]);
    }

    // Fetch Tahap 3
    try {
      const response3 = await api.get('/bhprd-t3/data');
      setDataTahap3(response3.data.data || []);
    } catch (err) {
      console.warn('Error loading BHPRD Tahap 3:', err);
      setDataTahap3([]);
    }

    setLoading(false);
  };

  const getActiveData = () => {
    switch (activeTab) {
      case 'tahap1': return dataTahap1;
      case 'tahap2': return dataTahap2;
      case 'tahap3': return dataTahap3;
      default: return [];
    }
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const processData = (rawData) => {
    return rawData.map(item => ({
      kecamatan: item.kecamatan,
      desa: item.desa || item.nama_desa,
      status: item.sts || item.status,
      realisasi: parseInt(String(item.Realisasi || item.realisasi || '0').replace(/,/g, ''))
    }));
  };

  const activeData = getActiveData();
  const processedData = processData(activeData);

  // Apply filters
  const filteredData = processedData.filter(item => {
    const matchSearch = !searchTerm || 
      item.desa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kecamatan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchKecamatan = !filterKecamatan || item.kecamatan === filterKecamatan;
    const matchStatus = !filterStatus || item.status === filterStatus;
    return matchSearch && matchKecamatan && matchStatus;
  });

  // Group by kecamatan
  const groupedData = filteredData.reduce((acc, item) => {
    if (!acc[item.kecamatan]) {
      acc[item.kecamatan] = [];
    }
    acc[item.kecamatan].push(item);
    return acc;
  }, {});

  // Statistics
  const totalDesa = processedData.length;
  const totalRealisasi = processedData.reduce((sum, item) => sum + item.realisasi, 0);
  const avgPerDesa = totalDesa > 0 ? totalRealisasi / totalDesa : 0;

  const uniqueKecamatans = [...new Set(processedData.map(item => item.kecamatan))];
  const uniqueStatuses = [...new Set(processedData.map(item => item.status))];

  // Charts data
  const statusCounts = processedData.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = {
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(239, 68, 68, 0.8)',
      ],
      borderWidth: 0,
    }],
  };

  const kecamatanRealisasi = Object.entries(groupedData).map(([kecamatan, desas]) => ({
    kecamatan,
    total: desas.reduce((sum, d) => sum + d.realisasi, 0)
  })).sort((a, b) => b.total - a.total).slice(0, 10);

  const kecamatanChartData = {
    labels: kecamatanRealisasi.map(k => k.kecamatan),
    datasets: [{
      label: 'Realisasi (Rp)',
      data: kecamatanRealisasi.map(k => k.total),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
    }],
  };

  const handleExportExcel = () => {
    const exportData = filteredData.map((item, index) => ({
      No: index + 1,
      Kecamatan: item.kecamatan,
      Desa: item.desa,
      Status: item.status,
      'Realisasi (Rp)': item.realisasi.toLocaleString('id-ID')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `BHPRD ${activeTab}`);
    XLSX.writeFile(wb, `BHPRD_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data berhasil diexport');
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Pilih file JSON terlebih dahulu');
      return;
    }

    const endpoints = {
      'tahap1': '/bhprd-t1/upload',
      'tahap2': '/bhprd-t2/upload',
      'tahap3': '/bhprd-t3/upload',
    };

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await api.post(endpoints[activeTab], formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowUploadModal(false);
        setUploadFile(null);
        fetchAllData();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Gagal mengupload file');
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: 'tahap1', label: 'Tahap 1', color: 'blue' },
    { id: 'tahap2', label: 'Tahap 2', color: 'green' },
    { id: 'tahap3', label: 'Tahap 3', color: 'purple' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FiDollarSign className="text-green-600" />
          BHPRD (Bagi Hasil Pajak Retribusi Daerah) 2025
        </h1>
        <p className="text-gray-600 mt-2">
          Data realisasi bagi hasil pajak dan retribusi daerah untuk desa
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-1 mb-6 flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? `bg-${tab.color}-600 text-white shadow-md`
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Desa */}
        <div className="group bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-90 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <FiMapPin className="w-6 h-6 text-blue-600" />
            </div>
            <FiTrendingUp className="w-8 h-8 text-white opacity-50" />
          </div>
          <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Desa</h3>
          <p className="text-3xl font-bold text-white">{totalDesa}</p>
          <p className="text-white text-xs mt-2 opacity-75">Desa terdaftar</p>
        </div>

        {/* Total Realisasi */}
        <div className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-90 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <FiDollarSign className="w-6 h-6 text-green-600" />
            </div>
            <FiBarChart2 className="w-8 h-8 text-white opacity-50" />
          </div>
          <h3 className="text-white text-sm font-medium mb-1 opacity-90">Total Realisasi</h3>
          <p className="text-xl md:text-2xl font-bold text-white break-words">{formatRupiah(totalRealisasi)}</p>
          <p className="text-white text-xs mt-2 opacity-75">Total dana BHPRD</p>
        </div>

        {/* Rata-rata per Desa */}
        <div className="group bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-90 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <FiTrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <FiActivity className="w-8 h-8 text-white opacity-50" />
          </div>
          <h3 className="text-white text-sm font-medium mb-1 opacity-90">Rata-rata per Desa</h3>
          <p className="text-xl md:text-2xl font-bold text-white break-words">{formatRupiah(avgPerDesa)}</p>
          <p className="text-white text-xs mt-2 opacity-75">Realisasi rata-rata</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-6 mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 relative z-10">Distribusi Status</h3>
            <div className="relative z-10 h-64 flex items-center justify-center">
              <Pie data={statusChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 relative z-10">Top 10 Kecamatan</h3>
            <div className="relative z-10 h-64">
              <Bar 
                data={kecamatanChartData} 
                options={{ 
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  scales: { 
                    x: { 
                      ticks: { 
                        callback: (value) => formatRupiah(value)
                      } 
                    } 
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context) => formatRupiah(context.parsed.x)
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari desa atau kecamatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={filterKecamatan}
            onChange={(e) => setFilterKecamatan(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Kecamatan</option>
            {uniqueKecamatans.map(kec => (
              <option key={kec} value={kec}>{kec}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Status</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FiDownload /> Export Excel
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FiUpload /> Upload Data
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kecamatan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(groupedData).map(([kecamatan, desas]) => (
                <React.Fragment key={kecamatan}>
                  <tr
                    className="bg-blue-50 cursor-pointer hover:bg-blue-100"
                    onClick={() => setExpandedKecamatan(prev => ({ ...prev, [kecamatan]: !prev[kecamatan] }))}
                  >
                    <td colSpan="3" className="px-6 py-3 font-semibold text-gray-800 flex items-center gap-2">
                      {expandedKecamatan[kecamatan] ? <FiChevronUp /> : <FiChevronDown />}
                      {kecamatan} ({desas.length} desa)
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-800" colSpan="2">
                      {formatRupiah(desas.reduce((sum, d) => sum + d.realisasi, 0))}
                    </td>
                  </tr>
                  {expandedKecamatan[kecamatan] && desas.map((item, idx) => (
                    <tr key={`${kecamatan}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">{idx + 1}</td>
                      <td className="px-6 py-3 text-sm text-gray-500"></td>
                      <td className="px-6 py-3 text-sm text-gray-900">{item.desa}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status?.toLowerCase().includes('cair') || item.status?.toLowerCase().includes('selesai')
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-gray-900 break-words">
                        {formatRupiah(item.realisasi)}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Upload Data BHPRD {tabs.find(t => t.id === activeTab)?.label}</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih File JSON
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Format: JSON dengan struktur yang sesuai</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default BhprdDashboard;
