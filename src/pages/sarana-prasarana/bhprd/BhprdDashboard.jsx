import React, { useState, useEffect } from 'react';
import { Upload, Users, TrendingUp, BarChart3, Activity, DollarSign, ChevronDown, ChevronUp, MapPin, X, Download } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import api from '../../../api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const BhprdDashboard = () => {
  const [activeTab, setActiveTab] = useState('tahap1');
  const [dataTahap1, setDataTahap1] = useState([]);
  const [dataTahap2, setDataTahap2] = useState([]);
  const [dataTahap3, setDataTahap3] = useState([]);
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
      
      // Fetch Tahap 1
      const response1 = await api.get('/bhprd-t1/data');
      setDataTahap1(response1.data.data || []);
      
      // Fetch Tahap 2
      const response2 = await api.get('/bhprd-t2/data');
      setDataTahap2(response2.data.data || []);
      
      // Fetch Tahap 3
      const response3 = await api.get('/bhprd-t3/data');
      setDataTahap3(response3.data.data || []);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching BHPRD data:', err);
      setError('Gagal memuat data BHPRD');
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

      const endpoint = activeTab === 'tahap1' ? '/bhprd-t1/upload' : 
                       activeTab === 'tahap2' ? '/bhprd-t2/upload' : '/bhprd-t3/upload';
      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const tahapLabel = activeTab === 'tahap1' ? '1' : activeTab === 'tahap2' ? '2' : '3';
      toast.success(`Data BHPRD Tahap ${tahapLabel} berhasil diupload`);
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
    const activeData = activeTab === 'tahap1' ? dataTahap1 : 
                       activeTab === 'tahap2' ? dataTahap2 : dataTahap3;
    const exportData = activeData.map(item => ({
      'Kecamatan': item.kecamatan,
      'Desa': item.desa,
      'Status': item.sts,
      'Realisasi (Rp)': item.Realisasi
    }));

    const tahapLabel = activeTab === 'tahap1' ? 'T1' : activeTab === 'tahap2' ? 'T2' : 'T3';
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `BHPRD ${tahapLabel}`);
    XLSX.writeFile(wb, `BHPRD_${tahapLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data berhasil diekspor ke Excel');
  };

  const getActiveData = () => {
    return activeTab === 'tahap1' ? dataTahap1 : 
           activeTab === 'tahap2' ? dataTahap2 : dataTahap3;
  };

  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      return {
        totalDesa: 0,
        totalRealisasi: 0,
        averageRealisasi: 0,
        desaCair: 0,
        desaBelum: 0
      };
    }

    const totalRealisasi = data.reduce((sum, item) => {
      const realisasi = typeof item.Realisasi === 'string' 
        ? parseInt(item.Realisasi.replace(/,/g, '')) 
        : item.Realisasi || 0;
      return sum + realisasi;
    }, 0);

    const desaCair = data.filter(item => item.sts === 'Dana Telah Dicairkan').length;
    const desaBelum = data.filter(item => item.sts !== 'Dana Telah Dicairkan').length;

    return {
      totalDesa: data.length,
      totalRealisasi,
      averageRealisasi: Math.round(totalRealisasi / data.length),
      desaCair,
      desaBelum
    };
  };

  const groupByKecamatan = (data) => {
    return data.reduce((acc, item) => {
      if (!acc[item.kecamatan]) {
        acc[item.kecamatan] = [];
      }
      acc[item.kecamatan].push(item);
      return acc;
    }, {});
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number);
  };

  const activeData = getActiveData();
  const stats = calculateStats(activeData);
  const groupedData = groupByKecamatan(activeData);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <DollarSign className="text-green-600" />
          BHPRD (Bagi Hasil Pajak & Retribusi Daerah) 2025
        </h1>
        <p className="text-gray-600 mt-2">
          Dashboard monitoring realisasi BHPRD per tahapan
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-1 flex gap-2">
        <button
          onClick={() => setActiveTab('tahap1')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'tahap1'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Tahap 1
        </button>
        <button
          onClick={() => setActiveTab('tahap2')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'tahap2'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Tahap 2
        </button>
        <button
          onClick={() => setActiveTab('tahap3')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'tahap3'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Tahap 3
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Desa</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalDesa}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Realisasi</p>
              <p className="text-2xl font-bold text-gray-800">{formatRupiah(stats.totalRealisasi)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Rata-rata per Desa</p>
              <p className="text-2xl font-bold text-gray-800">{formatRupiah(stats.averageRealisasi)}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Status Pencairan</p>
              <p className="text-lg font-bold text-green-600">{stats.desaCair} Cair</p>
              <p className="text-sm text-gray-500">{stats.desaBelum} Belum</p>
            </div>
            <Activity className="w-10 h-10 text-orange-500 opacity-80" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          <Upload className="w-5 h-5" />
          Upload Data
        </button>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          Export Excel
        </button>
      </div>

      {/* Data Table - Grouped by Kecamatan */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            Data per Kecamatan - {activeTab === 'tahap1' ? 'Tahap 1' : activeTab === 'tahap2' ? 'Tahap 2' : 'Tahap 3'}
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {Object.entries(groupedData).map(([kecamatan, desas]) => {
            const isExpanded = expandedKecamatan[kecamatan];
            const totalKecRealisasi = desas.reduce((sum, item) => {
              const realisasi = typeof item.Realisasi === 'string' 
                ? parseInt(item.Realisasi.replace(/,/g, '')) 
                : item.Realisasi || 0;
              return sum + realisasi;
            }, 0);

            return (
              <div key={kecamatan}>
                {/* Kecamatan Header */}
                <div
                  className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => setExpandedKecamatan(prev => ({
                    ...prev,
                    [kecamatan]: !prev[kecamatan]
                  }))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="font-bold text-gray-800">{kecamatan}</h3>
                        <p className="text-sm text-gray-600">{desas.length} desa</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Realisasi</p>
                        <p className="font-bold text-green-600">{formatRupiah(totalKecRealisasi)}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Desa List */}
                {isExpanded && (
                  <div className="bg-white">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Desa
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Realisasi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {desas.map((desa, idx) => {
                          const realisasi = typeof desa.Realisasi === 'string' 
                            ? parseInt(desa.Realisasi.replace(/,/g, '')) 
                            : desa.Realisasi || 0;

                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {desa.desa}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  desa.sts === 'Dana Telah Dicairkan'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {desa.sts}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                {formatRupiah(realisasi)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Upload Data BHPRD {activeTab === 'tahap1' ? 'Tahap 1' : activeTab === 'tahap2' ? 'Tahap 2' : 'Tahap 3'}
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih File JSON
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {uploadFile && (
                <p className="mt-2 text-sm text-gray-600">
                  File dipilih: {uploadFile.name}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
