import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Image, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Link as LinkIcon, 
  GripVertical,
  Save,
  X,
  Upload,
  ExternalLink
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

const InformasiManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [informasiList, setInformasiList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    judul: '',
    deskripsi: '',
    link: '',
    urutan: 1,
    is_active: true,
    gambar: null
  });

  const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001';

  useEffect(() => {
    fetchInformasi();
  }, []);

  const fetchInformasi = async () => {
    try {
      setLoading(true);
      const response = await api.get('/informasi');
      if (response.data.success) {
        setInformasiList(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching informasi:', error);
      toast.error('Gagal memuat data informasi');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        judul: item.judul || '',
        deskripsi: item.deskripsi || '',
        link: item.link || '',
        urutan: item.urutan || 1,
        is_active: item.is_active ?? true,
        gambar: null
      });
      setPreviewImage(item.gambar ? `${API_BASE}/${item.gambar}` : null);
    } else {
      setEditingId(null);
      setFormData({
        judul: '',
        deskripsi: '',
        link: '',
        urutan: informasiList.length + 1,
        is_active: true,
        gambar: null
      });
      setPreviewImage(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      judul: '',
      deskripsi: '',
      link: '',
      urutan: 1,
      is_active: true,
      gambar: null
    });
    setPreviewImage(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Format file tidak didukung. Gunakan JPG, PNG, GIF, atau WEBP.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }

      setFormData({ ...formData, gambar: file });
      
      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.judul.trim()) {
      toast.error('Judul wajib diisi');
      return;
    }

    if (!editingId && !formData.gambar) {
      toast.error('Gambar wajib diupload');
      return;
    }

    try {
      setSubmitting(true);
      
      const data = new FormData();
      data.append('judul', formData.judul.trim());
      data.append('deskripsi', formData.deskripsi?.trim() || '');
      data.append('link', formData.link?.trim() || '');
      data.append('urutan', formData.urutan.toString());
      data.append('is_active', formData.is_active.toString());
      
      if (formData.gambar) {
        data.append('gambar', formData.gambar);
      }

      let response;
      if (editingId) {
        response = await api.put(`/informasi/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await api.post('/informasi', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (response.data.success) {
        toast.success(editingId ? 'Informasi berhasil diperbarui' : 'Informasi berhasil ditambahkan');
        handleCloseModal();
        fetchInformasi();
      }
    } catch (error) {
      console.error('Error submitting informasi:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan informasi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const response = await api.patch(`/informasi/${id}/toggle`);
      if (response.data.success) {
        toast.success(currentStatus ? 'Informasi dinonaktifkan' : 'Informasi diaktifkan');
        fetchInformasi();
      }
    } catch (error) {
      console.error('Error toggling informasi:', error);
      toast.error('Gagal mengubah status');
    }
  };

  const handleDelete = async (id, judul) => {
    if (!confirm(`Hapus informasi "${judul}"?`)) return;

    try {
      const response = await api.delete(`/informasi/${id}`);
      if (response.data.success) {
        toast.success('Informasi berhasil dihapus');
        fetchInformasi();
      }
    } catch (error) {
      console.error('Error deleting informasi:', error);
      toast.error('Gagal menghapus informasi');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button 
            onClick={() => navigate('/sekretariat')}
            className="mb-4 flex items-center gap-2 text-teal-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Kembali
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Image className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Kelola Informasi</h1>
                <p className="text-teal-100 mt-1">Banner informasi yang ditampilkan di dashboard pegawai</p>
              </div>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-white text-teal-700 px-4 py-2 rounded-xl font-semibold hover:bg-teal-50 transition-colors shadow-lg"
            >
              <Plus className="h-5 w-5" />
              Tambah Informasi
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {informasiList.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <Image className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum Ada Informasi</h3>
            <p className="text-gray-500 mb-6">Tambahkan banner informasi untuk ditampilkan di dashboard pegawai</p>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Tambah Informasi Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {informasiList.map((item) => (
              <div 
                key={item.id}
                className={`bg-white rounded-2xl shadow-lg border overflow-hidden transition-all hover:shadow-xl ${
                  item.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
                }`}
              >
                {/* Image Preview */}
                <div className="relative h-48 bg-gray-100">
                  {item.gambar ? (
                    <img 
                      src={`${API_BASE}/${item.gambar}`} 
                      alt={item.judul}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${
                    item.is_active 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-400 text-white'
                  }`}>
                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                  </div>

                  {/* Urutan Badge */}
                  <div className="absolute top-3 left-3 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {item.urutan}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 text-lg mb-2 line-clamp-2">{item.judul}</h3>
                  
                  {item.link && (
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-teal-600 hover:text-teal-800 flex items-center gap-1 mb-3"
                    >
                      <LinkIcon className="h-3 w-3" />
                      <span className="truncate">{item.link}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleToggleActive(item.id, item.is_active)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        item.is_active 
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                      title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {item.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.judul)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? 'Edit Informasi' : 'Tambah Informasi'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Judul */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Judul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Judul informasi"
                  required
                />
              </div>

              {/* Deskripsi / Detail Informasi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detail Informasi
                </label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Tulis detail informasi yang akan ditampilkan saat banner diklik..."
                />
                <p className="text-xs text-gray-500 mt-1">Deskripsi akan tampil saat user mengklik banner di dashboard</p>
              </div>

              {/* Gambar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gambar Banner {!editingId && <span className="text-red-500">*</span>}
                </label>
                
                {/* Preview */}
                {previewImage && (
                  <div className="mb-3 relative rounded-xl overflow-hidden border border-gray-200">
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImage(null);
                        setFormData({ ...formData, gambar: null });
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-teal-500 hover:text-teal-600 transition-colors"
                >
                  <Upload className="h-5 w-5" />
                  {previewImage ? 'Ganti Gambar' : 'Pilih Gambar'}
                </button>
                <p className="text-xs text-gray-500 mt-2">Format: JPG, PNG, GIF, WEBP. Maks 5MB. Ukuran rekomendasi: 1200x400px</p>
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link (Opsional)
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="https://contoh.com/halaman"
                />
                <p className="text-xs text-gray-500 mt-1">Jika diisi, banner akan bisa diklik menuju link tersebut</p>
              </div>

              {/* Urutan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urutan Tampil
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.urutan}
                  onChange={(e) => setFormData({ ...formData, urutan: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Informasi dengan urutan lebih kecil tampil lebih dulu</p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
                <span className="text-sm text-gray-700">Tampilkan di dashboard</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InformasiManagement;
