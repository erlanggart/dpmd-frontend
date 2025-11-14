import React, { useState, useEffect } from 'react';
import { 
  DocumentIcon, 
  EyeIcon, 
  ArrowDownTrayIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  HomeIcon,
  UserIcon 
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../api';

const MusdesusView = () => {
  const [musdesusList, setMusdesusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [selectedDesa, setSelectedDesa] = useState('');
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);

  // Load data musdesus
  const loadMusdesusData = async (kecamatanId = '', desaId = '') => {
    try {
      setLoading(true);
      let url = '/musdesus';
      const params = new URLSearchParams();
      
      if (kecamatanId) params.append('kecamatan_id', kecamatanId);
      if (desaId) params.append('desa_id', desaId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      setMusdesusList(response.data.data || []);
    } catch (error) {
      console.error('Error loading musdesus:', error);
      toast.error('Gagal memuat data musdesus');
      setMusdesusList([]);
    } finally {
      setLoading(false);
    }
  };

  // Load kecamatan list
  const loadKecamatan = async () => {
    try {
      const response = await api.get('/musdesus/kecamatan');
      setKecamatanList(response.data.data || []);
    } catch (error) {
      console.error('Error loading kecamatan:', error);
    }
  };

  // Load desa list berdasarkan kecamatan
  const loadDesa = async (kecamatanId) => {
    if (!kecamatanId) {
      setDesaList([]);
      return;
    }
    
    try {
      const response = await api.get(`/musdesus/desa/${kecamatanId}`);
      setDesaList(response.data.data || []);
    } catch (error) {
      console.error('Error loading desa:', error);
      setDesaList([]);
    }
  };

  useEffect(() => {
    loadMusdesusData();
    loadKecamatan();
  }, []);

  useEffect(() => {
    if (selectedKecamatan) {
      loadDesa(selectedKecamatan);
      setSelectedDesa('');
    } else {
      setDesaList([]);
      setSelectedDesa('');
    }
  }, [selectedKecamatan]);

  useEffect(() => {
    loadMusdesusData(selectedKecamatan, selectedDesa);
  }, [selectedKecamatan, selectedDesa]);

  const handleDownload = async (filename) => {
    try {
      const response = await api.get(`/musdesus/download-file/${filename}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('File berhasil diunduh');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Gagal mengunduh file');
    }
  };

  const handlePreview = (filename) => {
    // Gunakan path yang benar untuk preview file musdesus
    const fileUrl = `${api.defaults.baseURL}/uploads/musdesus/${filename}`;
    window.open(fileUrl, '_blank');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(ext)) {
      return '🖼️';
    } else if (ext === 'pdf') {
      return '📄';
    } else {
      return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Daftar File Hasil Musdesus
          </h1>
          <p className="text-blue-200 text-lg">
            Lihat dan unduh file hasil Musrenbangdes yang telah diupload
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
          <h3 className="text-white text-lg font-semibold mb-4">Filter Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kecamatan Filter */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                <BuildingOfficeIcon className="w-4 h-4 inline mr-2" />
                Kecamatan
              </label>
              <select
                value={selectedKecamatan}
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="" className="bg-gray-800">Semua Kecamatan</option>
                {kecamatanList.map((kec) => (
                  <option key={kec.id} value={kec.id} className="bg-gray-800">
                    {kec.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Desa Filter */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                <HomeIcon className="w-4 h-4 inline mr-2" />
                Desa/Kelurahan
              </label>
              <select
                value={selectedDesa}
                onChange={(e) => setSelectedDesa(e.target.value)}
                disabled={!selectedKecamatan}
                className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-gray-800">Semua Desa</option>
                {desaList.map((desa) => (
                  <option key={desa.id} value={desa.id} className="bg-gray-800">
                    {desa.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Memuat data...</p>
          </div>
        )}

        {/* Data Display */}
        {!loading && (
          <>
            {musdesusList.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
                <DocumentIcon className="w-16 h-16 text-white/50 mx-auto mb-4" />
                <p className="text-white text-lg">Belum ada file musdesus yang diupload</p>
                <p className="text-blue-200 mt-2">
                  {selectedKecamatan || selectedDesa 
                    ? 'Coba ubah filter atau pilih wilayah lain' 
                    : 'Upload file pertama melalui tombol "Upload Hasil Musdesus" di halaman utama'
                  }
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {musdesusList.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Info Section */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">{getFileIcon(item.nama_file)}</span>
                          <h3 className="text-white font-semibold text-lg">
                            {item.nama_file}
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center text-blue-200">
                            <BuildingOfficeIcon className="w-4 h-4 mr-2" />
                            {item.kecamatan?.nama || 'N/A'}
                          </div>
                          <div className="flex items-center text-blue-200">
                            <HomeIcon className="w-4 h-4 mr-2" />
                            {item.desa?.nama || 'N/A'}
                          </div>
                          <div className="flex items-center text-blue-200">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {formatDate(item.tanggal_musdesus)}
                          </div>
                        </div>

                        {item.keterangan && (
                          <p className="text-blue-100 mt-3 text-sm">
                            <strong>Keterangan:</strong> {item.keterangan}
                          </p>
                        )}

                        <div className="flex items-center text-blue-300 text-xs mt-2">
                          <UserIcon className="w-3 h-3 mr-1" />
                          Diupload: {formatDate(item.created_at)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePreview(item.nama_file)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-300"
                        >
                          <EyeIcon className="w-4 h-4" />
                          Lihat
                        </button>
                        <button
                          onClick={() => handleDownload(item.nama_file)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          Unduh
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MusdesusView;