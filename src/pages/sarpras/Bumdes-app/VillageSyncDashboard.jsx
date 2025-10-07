import React, { useState, useEffect } from 'react';
import { 
  FiRefreshCw, 
  FiCheck, 
  FiAlertCircle, 
  FiDatabase,
  FiEye,
  FiPlay,
  FiInfo,
  FiMapPin,
  FiHome
} from 'react-icons/fi';
import api from '../../../api';

const VillageSyncDashboard = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch preview data on component mount
  useEffect(() => {
    fetchPreview();
  }, []);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/desas/sync-preview');
      if (response.data.success) {
        setPreviewData(response.data);
      } else {
        setError(response.data.message || 'Failed to fetch preview');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error fetching preview');
    } finally {
      setLoading(false);
    }
  };

  const performSync = async () => {
    if (!confirm('Apakah Anda yakin akan melakukan sinkronisasi kode desa? Tindakan ini akan mengupdate data BUMDes.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSyncStatus(null);
      
      const response = await api.post('/desas/sync-bumdes');
      if (response.data.success) {
        setSyncStatus(response.data);
        // Refresh preview after sync
        await fetchPreview();
      } else {
        setError(response.data.message || 'Synchronization failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error during synchronization');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, description }) => (
    <div className={`${color} rounded-2xl p-6 text-white shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <Icon className="text-3xl opacity-80" />
        <div className="text-right">
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-sm opacity-90">{title}</div>
        </div>
      </div>
      {description && (
        <div className="text-sm opacity-80 mt-3">{description}</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <FiDatabase className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Sinkronisasi Kode Desa BUMDes
                </h1>
                <p className="text-gray-600 mt-1">
                  Kelola dan sinkronkan kode desa untuk data BUMDes yang sudah terupload
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={fetchPreview}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors duration-200 disabled:opacity-50"
              >
                <FiRefreshCw className={`text-lg ${loading ? 'animate-spin' : ''}`} />
                Refresh Preview
              </button>
              
              <button
                onClick={performSync}
                disabled={loading || !previewData}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors duration-200 disabled:opacity-50"
              >
                <FiPlay className="text-lg" />
                Jalankan Sinkronisasi
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3">
              <FiAlertCircle className="text-red-600 text-xl" />
              <div>
                <h3 className="text-red-800 font-semibold">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Preview Statistics */}
        {previewData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total BUMDes"
              value={previewData.summary.total_bumdes}
              icon={FiHome}
              color="bg-slate-700"
              description="Total data BUMDes dalam sistem"
            />
            
            <StatCard
              title="Akan Diupdate"
              value={previewData.summary.will_update}
              icon={FiRefreshCw}
              color="bg-blue-600"
              description="BUMDes yang memerlukan sinkronisasi kode desa"
            />
            
            <StatCard
              title="Sudah Tersinkron"
              value={previewData.summary.already_synced}
              icon={FiCheck}
              color="bg-green-600"
              description="BUMDes dengan kode desa yang sudah valid"
            />
            
            <StatCard
              title="Tidak Cocok"
              value={previewData.summary.no_match}
              icon={FiAlertCircle}
              color="bg-orange-600"
              description="BUMDes yang tidak ditemukan padanannya di tabel desa"
            />
          </div>
        )}

        {/* Sync Results */}
        {syncStatus && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <FiCheck className="text-green-600 text-2xl" />
              <div>
                <h3 className="text-green-800 font-bold text-lg">Sinkronisasi Berhasil!</h3>
                <p className="text-green-700">{syncStatus.message}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-green-200">
                <div className="text-2xl font-bold text-green-700">{syncStatus.summary.updated}</div>
                <div className="text-sm text-green-600">Data Diupdate</div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-green-200">
                <div className="text-2xl font-bold text-green-700">{syncStatus.summary.already_synced}</div>
                <div className="text-sm text-green-600">Sudah Tersinkron</div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-green-200">
                <div className="text-2xl font-bold text-green-700">{syncStatus.summary.no_match}</div>
                <div className="text-sm text-green-600">Tidak Cocok</div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Toggle */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiEye className="text-gray-600 text-xl" />
              <h2 className="text-xl font-bold text-gray-900">Detail Preview Sinkronisasi</h2>
            </div>
            
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
            >
              <FiEye className="text-sm" />
              {showPreview ? 'Sembunyikan' : 'Tampilkan'} Detail
            </button>
          </div>
        </div>

        {/* Preview Details */}
        {showPreview && previewData && (
          <div className="space-y-6">
            {/* BUMDes yang akan diupdate */}
            {previewData.preview.will_update.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <FiRefreshCw className="text-blue-600 text-xl" />
                  <h3 className="text-xl font-bold text-gray-900">
                    BUMDes yang Akan Diupdate ({previewData.preview.will_update.length})
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Nama BUMDes</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Desa Sekarang</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Desa Baru</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Kecamatan</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Kode Desa Baru</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview.will_update.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{item.bumdes_name}</td>
                          <td className="py-3 px-4 text-gray-600">{item.current_desa}</td>
                          <td className="py-3 px-4 text-green-600 font-medium">{item.new_desa}</td>
                          <td className="py-3 px-4 text-gray-600">{item.new_kecamatan}</td>
                          <td className="py-3 px-4 font-mono text-blue-600">{item.new_village_code}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BUMDes yang tidak cocok */}
            {previewData.preview.no_match.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <FiAlertCircle className="text-orange-600 text-xl" />
                  <h3 className="text-xl font-bold text-gray-900">
                    BUMDes Tidak Ditemukan Padanan ({previewData.preview.no_match.length})
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Nama BUMDes</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Desa</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Kecamatan</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Search Key</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview.no_match.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{item.bumdes_name}</td>
                          <td className="py-3 px-4 text-gray-600">{item.current_desa}</td>
                          <td className="py-3 px-4 text-gray-600">{item.current_kecamatan}</td>
                          <td className="py-3 px-4 font-mono text-orange-600">{item.search_key}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BUMDes yang sudah tersinkron */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <FiCheck className="text-green-600 text-xl" />
                <h3 className="text-xl font-bold text-gray-900">
                  BUMDes Sudah Tersinkron ({previewData.preview.already_synced.length})
                </h3>
              </div>
              
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Nama BUMDes</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Desa</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Kecamatan</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Kode Desa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview.already_synced.slice(0, 50).map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{item.bumdes_name}</td>
                        <td className="py-3 px-4 text-gray-600">{item.desa}</td>
                        <td className="py-3 px-4 text-gray-600">{item.kecamatan}</td>
                        <td className="py-3 px-4 font-mono text-green-600">{item.current_code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {previewData.preview.already_synced.length > 50 && (
                <div className="mt-4 text-center text-gray-500 text-sm">
                  Menampilkan 50 dari {previewData.preview.already_synced.length} data. 
                  Semua data sudah memiliki kode desa yang valid.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mt-8">
          <div className="flex items-start gap-3">
            <FiInfo className="text-blue-600 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-blue-800 font-semibold mb-2">Informasi Sinkronisasi</h3>
              <div className="text-blue-700 space-y-2 text-sm">
                <p>• Sinkronisasi akan mencocokkan nama BUMDes dengan data resmi dari tabel desa berdasarkan kecamatan dan nama desa.</p>
                <p>• BUMDes yang sudah memiliki kode desa valid (panjang lebih dari 8 karakter) akan dilewati.</p>
                <p>• Sistem akan menggunakan format pencarian: "KECAMATAN-NAMA_DESA" (huruf kapital).</p>
                <p>• Data yang tidak cocok perlu ditinjau dan diperbarui secara manual.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VillageSyncDashboard;