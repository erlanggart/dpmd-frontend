import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import Swal from 'sweetalert2';
import SignatureCanvas from 'react-signature-canvas';
import { 
  LuUser, 
  LuSave, 
  LuTrash2, 
  LuPencil,
  LuIdCard,
  LuBriefcase,
  LuMail,
  LuBuilding2,
  LuRefreshCw,
  LuPenTool,
  LuRotateCcw,
  LuCheck,
  LuX
} from 'react-icons/lu';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const VerifikatorProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    nama: '',
    nip: '',
    jabatan: '',
    pangkat_golongan: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const sigCanvasRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/verifikator/profile');
      if (response.data.success) {
        const data = response.data.data;
        setProfile(data);
        setFormData({
          nama: data.nama || '',
          nip: data.nip || '',
          jabatan: data.jabatan || '',
          pangkat_golongan: data.pangkat_golongan || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.message || 'Gagal mengambil data profil'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!formData.nama || !formData.jabatan) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Tidak Lengkap',
        text: 'Nama dan jabatan wajib diisi'
      });
      return;
    }

    try {
      setSaving(true);
      const response = await api.put('/verifikator/profile', formData);
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Profil berhasil disimpan',
          timer: 2000
        });
        setIsEditing(false);
        fetchProfile();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.message || 'Gagal menyimpan profil'
      });
    } finally {
      setSaving(false);
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

    // Check if profile exists
    if (!profile) {
      Swal.fire({
        icon: 'warning',
        title: 'Simpan Data Profil Dahulu',
        text: 'Silakan simpan data profil (Nama, NIP, Jabatan, Pangkat/Golongan) sebelum menyimpan tanda tangan'
      });
      return;
    }

    try {
      setUploading(true);

      const dataUrl = sigCanvas.toDataURL();
      const blob = await fetch(dataUrl).then(res => res.blob());
      
      const formData = new FormData();
      formData.append('ttd', blob, 'signature.png');

      const response = await api.post('/verifikator/profile/upload-ttd', formData, {
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
        fetchProfile();
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: error.response?.data?.message || 'Terjadi kesalahan saat menyimpan tanda tangan'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTTD = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Tanda Tangan?',
      text: 'Tanda tangan akan dihapus permanen',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    try {
      setUploading(true);
      const response = await api.delete('/verifikator/profile/ttd');
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Tanda tangan berhasil dihapus',
          timer: 2000,
          showConfirmButton: false
        });
        fetchProfile();
      }
    } catch (error) {
      console.error('Error deleting TTD:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.message || 'Gagal menghapus tanda tangan'
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LuRefreshCw className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <LuUser className="text-amber-600" />
          Profil Verifikator
        </h1>
        <p className="text-gray-600 mt-1">
          Kelola data profil dan tanda tangan Anda untuk verifikasi proposal
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Data Pribadi</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <LuPencil className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsEditing(false);
                  // Reset form to original values
                  if (profile) {
                    setFormData({
                      nama: profile.nama || '',
                      nip: profile.nip || '',
                      jabatan: profile.jabatan || '',
                      pangkat_golongan: profile.pangkat_golongan || ''
                    });
                  }
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Batal
              </button>
            )}
          </div>

          {/* Dinas Info (read-only) */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-gray-600">
              <LuBuilding2 className="w-4 h-4" />
              <span className="text-sm font-medium">Dinas:</span>
              <span className="text-sm">{profile?.nama_dinas || '-'}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Nama */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <LuUser className="w-4 h-4" />
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nama"
                value={formData.nama}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  isEditing 
                    ? 'border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500' 
                    : 'border-gray-200 bg-gray-50'
                }`}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            {/* NIP */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <LuIdCard className="w-4 h-4" />
                NIP
              </label>
              <input
                type="text"
                name="nip"
                value={formData.nip}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  isEditing 
                    ? 'border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500' 
                    : 'border-gray-200 bg-gray-50'
                }`}
                placeholder="Masukkan NIP"
              />
            </div>

            {/* Jabatan */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <LuBriefcase className="w-4 h-4" />
                Jabatan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="jabatan"
                value={formData.jabatan}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  isEditing 
                    ? 'border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500' 
                    : 'border-gray-200 bg-gray-50'
                }`}
                placeholder="Masukkan jabatan"
              />
            </div>

            {/* Pangkat/Golongan */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <LuIdCard className="w-4 h-4" />
                Pangkat/Golongan
              </label>
              <input
                type="text"
                name="pangkat_golongan"
                value={formData.pangkat_golongan}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  isEditing 
                    ? 'border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500' 
                    : 'border-gray-200 bg-gray-50'
                }`}
                placeholder="Contoh: Penata Tk. I (III/d)"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <LuMail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah</p>
            </div>

            {/* Save Button */}
            {isEditing && (
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <LuRefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <LuSave className="w-5 h-5" />
                )}
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            )}
          </div>
        </div>

        {/* TTD Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LuPenTool className="text-amber-600" />
            Tanda Tangan Digital
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Gambar tanda tangan Anda yang akan digunakan pada dokumen hasil verifikasi proposal.
          </p>

          {showSignaturePad ? (
            /* Signature Canvas */
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-2">Gambar Tanda Tangan:</p>
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
                  disabled={uploading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LuCheck className="w-4 h-4" />
                  {uploading ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  onClick={() => sigCanvasRef.current?.clear()}
                  disabled={uploading}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                  title="Bersihkan Canvas"
                >
                  <LuRotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSignaturePad(false)}
                  disabled={uploading}
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
              {profile?.ttd_path ? (
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-2">Tanda Tangan Tersimpan:</p>
                  <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-center">
                    <img 
                      src={`${imageBaseUrl}/storage/${profile.ttd_path}`}
                      alt="TTD" 
                      className="max-h-32 object-contain"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setShowSignaturePad(true)}
                      disabled={uploading}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <LuPenTool className="w-4 h-4" />
                      Gambar Ulang
                    </button>
                    <button
                      onClick={handleDeleteTTD}
                      disabled={uploading}
                      className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center gap-2"
                    >
                      <LuTrash2 className="w-4 h-4" />
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                  <LuPenTool className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-500 mb-4">Belum ada tanda tangan</p>
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    disabled={uploading || !profile}
                    className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                  >
                    <LuPenTool className="w-4 h-4" />
                    Gambar Tanda Tangan
                  </button>
                  {!profile && (
                    <p className="text-xs text-red-500 mt-2">Simpan profil terlebih dahulu</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-800">
              <strong>Tips:</strong> Gambar tanda tangan langsung pada canvas menggunakan mouse atau touchpad. 
              Tanda tangan akan otomatis disertakan pada berita acara verifikasi.
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="font-medium text-blue-800 mb-2">ℹ️ Informasi</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Data profil Anda akan ditampilkan pada dokumen hasil verifikasi proposal</li>
          <li>Pastikan nama dan jabatan sesuai dengan data kepegawaian resmi</li>
          <li>Tanda tangan digital akan otomatis disertakan pada berita acara verifikasi</li>
        </ul>
      </div>
    </div>
  );
};

export default VerifikatorProfilePage;
