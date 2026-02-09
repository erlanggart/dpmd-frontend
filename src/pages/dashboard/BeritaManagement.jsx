// src/pages/dashboard/BeritaManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import Swal from 'sweetalert2';
import { performFullLogout } from '../../utils/sessionPersistence';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiEye, 
  FiSearch,
  FiFilter,
  FiX,
  FiImage,
  FiCalendar,
  FiUser
} from 'react-icons/fi';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const BeritaManagement = () => {
  const [beritaList, setBeritaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentBerita, setCurrentBerita] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    judul: '',
    konten: '',
    ringkasan: '',
    status: 'draft',
    penulis: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
    { value: 'published', label: 'Published', color: 'bg-green-500' },
    { value: 'archived', label: 'Archived', color: 'bg-red-500' }
  ];

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1
  });

  useEffect(() => {
    fetchBerita();
  }, [currentPage, filterStatus, searchTerm]);

  const fetchBerita = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('expressToken');
      
      // Check if token exists
      if (!token) {
        console.error('No token found in localStorage');
        Swal.fire({
          icon: 'error',
          title: 'Tidak Terautentikasi',
          text: 'Silakan login terlebih dahulu',
          confirmButtonText: 'Login'
        }).then(() => {
          window.location.href = '/';
        });
        return;
      }

      console.log('🔑 Token being sent:', token.substring(0, 20) + '...');
      
      const params = {
        page: currentPage,
        limit: 10
      };

      if (filterStatus) params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/berita/admin`,
        {
          params,
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        setBeritaList(response.data.data);
        setTotalPages(response.data.pagination.last_page);
      }
    } catch (error) {
      console.error('Error fetching berita:', error);
      
      // Handle 403 Forbidden specifically
      if (error.response?.status === 403) {
        Swal.fire({
          icon: 'error',
          title: 'Akses Ditolak',
          text: error.response?.data?.message || 'Role Anda tidak memiliki akses ke fitur ini. Hanya superadmin dan kepala_dinas yang diizinkan.',
          footer: `Role Anda: ${error.response?.data?.debug?.userRole || 'Tidak diketahui'}`
        });
      } else if (error.response?.status === 401) {
        Swal.fire({
          icon: 'error',
          title: 'Sesi Berakhir',
          text: 'Token tidak valid atau telah expired. Silakan login kembali.',
          confirmButtonText: 'Login'
        }).then(() => {
          performFullLogout().then(() => {
            window.location.href = '/';
          });
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal memuat data berita'
        });
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.judul || !formData.konten) {
      Swal.fire({
        icon: 'warning',
        title: 'Oops...',
        text: 'Judul dan konten harus diisi!'
      });
      return;
    }

    setIsUploading(true);
    const token = localStorage.getItem('expressToken');
    const submitData = new FormData();

    Object.keys(formData).forEach(key => {
      if (formData[key]) {
        submitData.append(key, formData[key]);
      }
    });

    if (selectedFile) {
      submitData.append('gambar', selectedFile);
    }

    try {
      if (editMode && currentBerita) {
        await axios.put(
          `${API_CONFIG.BASE_URL}/berita/admin/${currentBerita.id_berita}`,
          submitData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Berita berhasil diupdate',
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        await axios.post(
          `${API_CONFIG.BASE_URL}/berita/admin`,
          submitData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Berita berhasil dibuat',
          timer: 1500,
          showConfirmButton: false
        });
      }

      resetForm();
      fetchBerita();
      setShowForm(false);
    } catch (error) {
      console.error('Error saving berita:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.message || 'Gagal menyimpan berita'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (berita) => {
    setEditMode(true);
    setCurrentBerita(berita);
    setFormData({
      judul: berita.judul,
      konten: berita.konten,
      ringkasan: berita.ringkasan || '',
      status: berita.status,
      penulis: berita.penulis || ''
    });
    
    if (berita.gambar) {
      setPreview(`${API_CONFIG.BASE_URL.replace(/\/api$/, '')}/storage/uploads/berita/${berita.gambar}`);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Berita?',
      text: 'Data yang dihapus tidak dapat dikembalikan!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('expressToken');
        await axios.delete(
          `${API_CONFIG.BASE_URL}/berita/admin/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: 'Berita berhasil dihapus',
          timer: 1500,
          showConfirmButton: false
        });

        fetchBerita();
      } catch (error) {
        console.error('Error deleting berita:', error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal menghapus berita'
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      judul: '',
      konten: '',
      ringkasan: '',
      kategori: 'umum',
      status: 'draft',
      penulis: ''
    });
    setSelectedFile(null);
    setPreview(null);
    setEditMode(false);
    setCurrentBerita(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    const cleanText = text.replace(/<[^>]*>/g, '');
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '...';
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">📰 Manajemen Berita</h1>
              <p className="text-gray-600 mt-1">Kelola berita dan informasi di landing page</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <FiPlus className="w-5 h-5" />
              Buat Berita Baru
            </button>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editMode ? '✏️ Edit Berita' : '➕ Buat Berita Baru'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Gambar Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Gambar Berita
                  </label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    {preview ? (
                      <div className="relative">
                        <img
                          src={preview}
                          alt="Preview"
                          className="max-h-64 mx-auto rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setPreview(null);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <FiImage className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-2">
                          {isDragActive
                            ? 'Lepaskan file di sini...'
                            : 'Drag & drop gambar atau klik untuk upload'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Format: JPG, PNG, WEBP (Max 2MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Judul */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Judul Berita *
                  </label>
                  <input
                    type="text"
                    name="judul"
                    value={formData.judul}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Masukkan judul berita"
                    required
                  />
                </div>

                {/* Ringkasan */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ringkasan (Optional)
                  </label>
                  <textarea
                    name="ringkasan"
                    value={formData.ringkasan}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ringkasan singkat berita (max 500 karakter)"
                    maxLength="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.ringkasan.length}/500 karakter
                  </p>
                </div>

                {/* Konten */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Konten Berita *
                  </label>
                  <textarea
                    name="konten"
                    value={formData.konten}
                    onChange={handleInputChange}
                    rows="10"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tulis konten berita di sini... (HTML supported)"
                    required
                  />
                </div>

                {/* Row: Status, Penulis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Penulis
                    </label>
                    <input
                      type="text"
                      name="penulis"
                      value={formData.penulis}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nama penulis"
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Menyimpan...' : editMode ? 'Update Berita' : 'Buat Berita'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari judul berita..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Status */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Status</option>
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Berita List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Memuat data...</p>
          </div>
        ) : beritaList.length > 0 ? (
          <div className="space-y-4">
            {beritaList.map((berita) => (
              <div
                key={berita.id_berita}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-6">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {berita.gambar ? (
                      <img
                        src={`${API_CONFIG.BASE_URL.replace(/\/api$/, '')}/storage/uploads/berita/${berita.gambar}`}
                        alt={berita.judul}
                        className="w-32 h-32 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = '/placeholder-news.jpg';
                        }}
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <FiImage className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                          {berita.judul}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${
                            statusOptions.find(s => s.value === berita.status)?.color || 'bg-gray-500'
                          }`}>
                            {statusOptions.find(s => s.value === berita.status)?.label}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiCalendar className="w-4 h-4" />
                            {formatDate(berita.tanggal_publish || berita.created_at)}
                          </span>
                          {berita.penulis && (
                            <span className="flex items-center gap-1">
                              <FiUser className="w-4 h-4" />
                              {berita.penulis}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FiEye className="w-4 h-4" />
                            {berita.views} views
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {berita.ringkasan || truncateText(berita.konten, 150)}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(berita)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FiEdit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(berita.id_berita)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                      currentPage === index + 1
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-blue-50 shadow-md'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <div className="text-gray-400 text-6xl mb-4">📰</div>
            <p className="text-gray-600 text-lg">Belum ada berita</p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Buat Berita Pertama
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeritaManagement;
