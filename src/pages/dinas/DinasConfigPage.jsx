import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Swal from 'sweetalert2';
import SignatureCanvas from 'react-signature-canvas';
import { LuTrash2, LuSave, LuPenTool, LuUser, LuBriefcase, LuIdCard, LuRotateCcw, LuCheck, LuX } from 'react-icons/lu';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const DinasConfigPage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const dinasId = user.dinas_id;

  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState({
    nama_pic: '',
    nip_pic: '',
    jabatan_pic: ''
  });
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const sigCanvasRef = useRef(null);

  useEffect(() => {
    // Check if user has dinas_id
    if (!dinasId) {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Terbatas',
        text: 'Anda tidak memiliki akses ke halaman konfigurasi. Dinas belum ditentukan.',
        confirmButtonText: 'Kembali'
      }).then(() => {
        navigate('/dinas/dashboard'); // Redirect to dashboard instead of login
      });
      return;
    }
    fetchConfig();
  }, [dinasId]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dinas/${dinasId}/config`);
      
      if (response.data.success && response.data.data) {
        const configData = response.data.data;
        setConfig(configData);
        setFormData({
          nama_pic: configData.nama_pic || '',
          nip_pic: configData.nip_pic || '',
          jabatan_pic: configData.jabatan_pic || ''
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveConfig = async () => {
    try {
      // Validate required fields
      if (!formData.nama_pic || !formData.jabatan_pic) {
        Swal.fire({
          icon: 'warning',
          title: 'Data Tidak Lengkap',
          text: 'Nama PIC dan Jabatan wajib diisi'
        });
        return;
      }

      setLoading(true);

      // Save PIC info
      const response = await api.post(`/dinas/${dinasId}/config`, formData);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: response.data.message,
          timer: 2000,
          showConfirmButton: false
        });
        
        // Refresh from server untuk get semua data termasuk ttd_path
        await fetchConfig();
      }
    } catch (error) {
      console.error('Error saving config:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: error.response?.data?.message || 'Terjadi kesalahan saat menyimpan konfigurasi'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSignature = async () => {
    const sigCanvas = sigCanvasRef.current;
    if (!sigCanvas || sigCanvas.isEmpty()) {
      Swal.fire({
        icon: 'warning',
        title: 'Canvas Kosong',
        text: 'Silakan gambar tanda tangan terlebih dahulu'
      });
      return;
    }

    // Check if config exists
    if (!config) {
      Swal.fire({
        icon: 'warning',
        title: 'Simpan Data PIC Dahulu',
        text: 'Silakan simpan data PIC (Nama, NIP, Jabatan) sebelum menyimpan tanda tangan'
      });
      return;
    }

    try {
      setUploadingSignature(true);

      const dataUrl = sigCanvas.toDataURL();
      const blob = await fetch(dataUrl).then(res => res.blob());
      
      const formData = new FormData();
      formData.append('ttd', blob, 'signature.png');

      const response = await api.post(`/dinas/${dinasId}/config/upload-ttd`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Tanda tangan berhasil disimpan',
          timer: 2000,
          showConfirmButton: false
        });
        setShowSignaturePad(false);
        fetchConfig();
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: error.response?.data?.message || 'Terjadi kesalahan saat menyimpan tanda tangan'
      });
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleDeleteTtd = async () => {
    const result = await Swal.fire({
      title: 'Hapus Tanda Tangan?',
      text: 'Tanda tangan yang sudah dihapus tidak dapat dikembalikan',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);

      const response = await api.delete(`/dinas/${dinasId}/config/ttd`);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Tanda tangan berhasil dihapus',
          timer: 2000,
          showConfirmButton: false
        });
        setShowSignaturePad(false);
        fetchConfig();
      }
    } catch (error) {
      console.error('Error deleting TTD:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menghapus',
        text: error.response?.data?.message || 'Terjadi kesalahan saat menghapus tanda tangan'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 sm:p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-white/20 rounded-lg">
            <LuPenTool className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Konfigurasi Dinas</h1>
            <p className="text-amber-100 mt-1 text-sm sm:text-base">Pengaturan Tanda Tangan dan Penanggung Jawab Verifikasi Bankeu</p>
          </div>
        </div>
      </div>

      {/* PIC Info Form */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="p-2 bg-amber-100 rounded-lg">
            <LuUser className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Data Penanggung Jawab</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <LuUser className="inline w-4 h-4 mr-1" />
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nama_pic"
              value={formData.nama_pic}
              onChange={handleInputChange}
              placeholder="Contoh: Dr. Ahmad Sudrajat, M.Si"
              className="w-full px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <LuIdCard className="inline w-4 h-4 mr-1" />
              NIP
            </label>
            <input
              type="text"
              name="nip_pic"
              value={formData.nip_pic}
              onChange={handleInputChange}
              placeholder="Contoh: 197501012005011001"
              className="w-full px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <LuBriefcase className="inline w-4 h-4 mr-1" />
              Jabatan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="jabatan_pic"
              value={formData.jabatan_pic}
              onChange={handleInputChange}
              placeholder="Contoh: Kepala Bidang Pemberdayaan Masyarakat"
              className="w-full px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 sm:py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
          >
            <LuSave className="w-5 h-5" />
            {loading ? 'Menyimpan...' : 'Simpan Data PIC'}
          </button>
        </div>
      </div>

      {/* TTD Upload Section */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="p-2 bg-amber-100 rounded-lg">
            <LuPenTool className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Tanda Tangan Digital</h2>
        </div>

        <div className="space-y-4">
          {showSignaturePad ? (
            /* Signature Canvas */
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-2">Gambar Tanda Tangan:</p>
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  canvasProps={{
                    className: 'w-full h-48',
                    style: { touchAction: 'none' }
                  }}
                  backgroundColor="#FAFAFA"
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSaveSignature}
                  disabled={uploadingSignature}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                >
                  <LuCheck className="w-4 h-4" />
                  {uploadingSignature ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  onClick={() => sigCanvasRef.current?.clear()}
                  disabled={uploadingSignature}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                  title="Bersihkan Canvas"
                >
                  <LuTrash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSignaturePad(false)}
                  disabled={uploadingSignature}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                  title="Batal"
                >
                  <LuX className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Existing Signature Display */
            <div className="space-y-4">
              {config?.ttd_path ? (
                <div className="border border-gray-200 rounded-xl p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-600 mb-2">Tanda Tangan Tersimpan:</p>
                  <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-center">
                    <img 
                      src={`${imageBaseUrl}/storage/uploads/${config.ttd_path}`}
                      alt="TTD" 
                      className="max-h-32 object-contain"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setShowSignaturePad(true)}
                      disabled={loading}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                    >
                      <LuPenTool className="w-4 h-4" />
                      Gambar Ulang
                    </button>
                    <button
                      onClick={handleDeleteTtd}
                      disabled={loading}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                    >
                      <LuTrash2 className="w-4 h-4" />
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center">
                  <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-3">
                    <LuPenTool className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">Belum ada tanda tangan</p>
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    disabled={loading || !config}
                    className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 sm:px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mx-auto disabled:opacity-50 text-sm sm:text-base"
                  >
                    <LuPenTool className="w-4 h-4" />
                    Gambar Tanda Tangan
                  </button>
                  {!config && (
                    <p className="text-xs text-gray-500 mt-2">Simpan data PIC terlebih dahulu</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 sm:mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-amber-900">
            <strong>Catatan:</strong> Tanda tangan ini akan digunakan dalam Berita Acara Verifikasi Bankeu. 
            Pastikan tanda tangan yang digambar adalah tanda tangan yang sah dan jelas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DinasConfigPage;
