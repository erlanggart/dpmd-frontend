// DD Non-Earmarked Tahap 2
import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiMapPin, FiUsers, FiTrendingUp, FiDownload, FiSearch, FiUpload, FiRefreshCw, FiInfo, FiX, FiChevronDown, FiChevronUp, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../../api';

const DdNonEarmarkedT2 = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [stats, setStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [groupByKecamatan, setGroupByKecamatan] = useState(true);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [data, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dd-nonearmarked-t2/data');
      const rawData = response.data.data;
      
      const processed = rawData.map(item => ({
        kecamatan: item.kecamatan,
        desa: item.desa,
        status: item.sts,
        realisasi: parseInt(item.Realisasi?.replace(/,/g, '') || '0')
      }));

      const uniqueDesa = [...new Set(processed.map(item => `${item.kecamatan}_${item.desa}`))];
      const totalDesa = uniqueDesa.length;
      const totalRealisasi = processed.reduce((sum, d) => sum + d.realisasi, 0);

      setStats({
        totalKecamatan: [...new Set(processed.map(d => d.kecamatan))].length,
        totalDesa,
        totalRealisasi,
        avgPerDesa: totalDesa > 0 ? totalRealisasi / totalDesa : 0
      });
      
      setData(processed);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal memuat data DD Non-Earmarked Tahap 2');
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...data];
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.desa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kecamatan.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredData(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const exportToExcel = () => {
    try {
      const exportData = filteredData.map((item, index) => ({
        'No': index + 1,
        'Kecamatan': item.kecamatan,
        'Desa': item.desa,
        'Status': item.status,
        'Realisasi': item.realisasi
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'DD Earmarked T2');
      XLSX.writeFile(wb, `DD_Earmarked_T2_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Data berhasil diekspor');
    } catch (error) {
      toast.error('Gagal mengekspor data');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return toast.error('Pilih file terlebih dahulu');
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      const response = await api.post('/dd-nonearmarked-t2/upload', formData);
      
      if (response.data.success) {
        toast.success('Data berhasil diupdate');
        setShowUploadModal(false);
        setUploadFile(null);
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal upload');
    } finally {
      setUploading(false);
    }
  };

  const groupedData = groupByKecamatan
    ? filteredData.reduce((acc, item) => {
        if (!acc[item.kecamatan]) acc[item.kecamatan] = [];
        acc[item.kecamatan].push(item);
        return acc;
      }, {})
    : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FiDollarSign className="text-violet-600" />
          DD Non-Earmarked Tahap 2
        </h1>
        <p className="text-gray-600 mt-2">Dana Desa Non-Earmarked Tahap 2 Tahun 2025</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-violet-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Desa</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalDesa}</p>
            </div>
            <FiMapPin className="text-4xl text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Realisasi</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalRealisasi)}</p>
            </div>
            <FiDollarSign className="text-4xl text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rata-rata/Desa</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.avgPerDesa)}</p>
            </div>
            <FiTrendingUp className="text-4xl text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Kecamatan</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalKecamatan}</p>
            </div>
            <FiUsers className="text-4xl text-gray-400" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-wrap gap-3 justify-between">
        <div className="flex gap-3">
          <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            <FiUpload /> Update Data
          </button>
          <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <FiDownload /> Export Excel
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Cari desa atau kecamatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <button
            onClick={() => setGroupByKecamatan(!groupByKecamatan)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
              groupByKecamatan ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-gray-300'
            }`}
          >
            <FiFilter /> {groupByKecamatan ? 'Group' : 'List'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-violet-600 to-blue-700 text-white">
            <tr>
              <th className="px-6 py-4 text-left">No</th>
              <th className="px-6 py-4 text-left">Kecamatan</th>
              <th className="px-6 py-4 text-left">Desa</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-right">Realisasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {groupByKecamatan ? (
              Object.entries(groupedData || {}).map(([kecamatan, items]) => {
                const isExpanded = expandedKecamatan[kecamatan];
                return (
                  <React.Fragment key={kecamatan}>
                    <tr className="bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => setExpandedKecamatan(prev => ({ ...prev, [kecamatan]: !prev[kecamatan] }))}>
                      <td className="px-6 py-4 font-semibold" colSpan="5">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                          <FiMapPin className="text-violet-600" />
                          <span>{kecamatan}</span>
                          <span className="text-sm text-gray-600">({items.length} desa)</span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4">{idx + 1}</td>
                        <td className="px-6 py-4 text-gray-500">â†³ {kecamatan}</td>
                        <td className="px-6 py-4 font-medium">{item.desa}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs rounded-full border bg-gray-100 text-gray-800">{item.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-violet-600">{formatCurrency(item.realisasi)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })
            ) : (
              filteredData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{index + 1}</td>
                  <td className="px-6 py-4">{item.kecamatan}</td>
                  <td className="px-6 py-4 font-medium">{item.desa}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded-full border bg-gray-100 text-gray-800">{item.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-violet-600">{formatCurrency(item.realisasi)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Update Data</h3>
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleUpload} disabled={!uploadFile || uploading} className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {uploading ? <><FiRefreshCw className="animate-spin" /> Uploading...</> : <><FiUpload /> Upload</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DdNonEarmarkedT2;
