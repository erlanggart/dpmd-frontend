// src/pages/dashboard/BeritaManagement.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import Swal from 'sweetalert2';
import { performFullLogout } from '../../utils/sessionPersistence';
import {
  FiCalendar,
  FiDownload,
  FiEdit2,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiFilter,
  FiImage,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUploadCloud,
  FiUser,
  FiX
} from 'react-icons/fi';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const STORAGE_BASE = API_CONFIG.BASE_URL.replace(/\/api$/, '');

const statusOptions = [
  { value: 'draft', label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'published', label: 'Published', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'archived', label: 'Archived', color: 'bg-rose-100 text-rose-700 border-rose-200' }
];

const kategoriOptions = [
  { value: 'umum', label: 'Umum' },
  { value: 'pengumuman', label: 'Pengumuman' },
  { value: 'bumdes', label: 'BUMDes' },
  { value: 'perjadin', label: 'Perjalanan Dinas' },
  { value: 'musdesus', label: 'Musdesus' }
];

const getFileUrl = (filePath) => {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const normalizedPath = String(filePath)
    .replace(/^\/+/, '')
    .replace(/^storage\/uploads\/berita\//, '')
    .replace(/^uploads\/berita\//, '');

  const encodedPath = normalizedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${STORAGE_BASE}/storage/uploads/berita/${encodedPath}`;
};

const UploadCard = ({ title, description, accept, file, currentUrl, currentLabel, previewUrl, icon: Icon, onDrop, onClear }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        {file && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            title="Kosongkan pilihan"
          >
            <FiX className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        {...getRootProps()}
        className={`flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
        }`}
      >
        <input {...getInputProps()} />
        {previewUrl ? (
          <img src={previewUrl} alt="Preview berita" className="max-h-44 rounded-xl object-cover shadow-sm" />
        ) : file ? (
          <div className="flex flex-col items-center gap-2">
            <FiFileText className="h-12 w-12 text-blue-600" />
            <p className="max-w-full truncate text-sm font-semibold text-slate-800">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : currentUrl ? (
          <div className="flex flex-col items-center gap-3">
            <FiFileText className="h-12 w-12 text-emerald-600" />
            <p className="text-sm font-semibold text-slate-800">{currentLabel}</p>
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 hover:bg-blue-50"
            >
              <FiExternalLink className="h-4 w-4" />
              Buka file
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FiUploadCloud className="h-12 w-12 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">
              {isDragActive ? 'Lepaskan file di sini' : 'Drag & drop atau klik untuk upload'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const BeritaManagement = () => {
  const [beritaList, setBeritaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentBerita, setCurrentBerita] = useState(null);
  const [formData, setFormData] = useState({
    judul: '',
    konten: '',
    ringkasan: '',
    kategori: 'umum',
    status: 'draft',
    penulis: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const stats = useMemo(() => {
    return {
      total: beritaList.length,
      published: beritaList.filter((item) => item.status === 'published').length,
      pdf: beritaList.filter((item) => item.dokumen_pdf).length
    };
  }, [beritaList]);

  const onImageDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setSelectedImage(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const onPdfDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setSelectedPdf(file);
  }, []);

  useEffect(() => {
    fetchBerita();
  }, [currentPage, filterStatus, searchTerm]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const fetchBerita = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('expressToken');

      if (!token) {
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

      const params = { page: currentPage, limit: 10 };
      if (filterStatus) params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get(`${API_CONFIG.BASE_URL}/berita/admin`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        setBeritaList(response.data.data);
        setTotalPages(response.data.pagination.last_page);
      }
    } catch (error) {
      console.error('Error fetching berita:', error);

      if (error.response?.status === 403) {
        Swal.fire({
          icon: 'error',
          title: 'Akses Ditolak',
          text: error.response?.data?.message || 'Hanya superadmin, kepala dinas, atau Sekretariat yang dapat mengelola berita.'
        });
      } else if (error.response?.status === 401) {
        Swal.fire({
          icon: 'error',
          title: 'Sesi Berakhir',
          text: 'Silakan login kembali.',
          confirmButtonText: 'Login'
        }).then(() => {
          performFullLogout().then(() => {
            window.location.href = '/';
          });
        });
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal memuat data berita' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    setSelectedImage(null);
    setSelectedPdf(null);
    setPreview(null);
    setEditMode(false);
    setCurrentBerita(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const hasPdf = selectedPdf || currentBerita?.dokumen_pdf;
    if (!formData.judul || (!formData.konten && !hasPdf)) {
      Swal.fire({
        icon: 'warning',
        title: 'Data belum lengkap',
        text: 'Judul wajib diisi. Konten boleh kosong jika berita memakai PDF.'
      });
      return;
    }

    setIsUploading(true);
    const token = localStorage.getItem('expressToken');
    const submitData = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        submitData.append(key, value);
      }
    });

    if (selectedImage) submitData.append('gambar', selectedImage);
    if (selectedPdf) submitData.append('dokumen_pdf', selectedPdf);

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };

      if (editMode && currentBerita) {
        await axios.put(`${API_CONFIG.BASE_URL}/berita/admin/${currentBerita.id_berita}`, submitData, config);
      } else {
        await axios.post(`${API_CONFIG.BASE_URL}/berita/admin`, submitData, config);
      }

      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: editMode ? 'Berita berhasil diupdate' : 'Berita berhasil dibuat',
        timer: 1500,
        showConfirmButton: false
      });

      resetForm();
      setShowForm(false);
      fetchBerita();
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
      judul: berita.judul || '',
      konten: berita.konten || '',
      ringkasan: berita.ringkasan || '',
      kategori: berita.kategori || 'umum',
      status: berita.status || 'draft',
      penulis: berita.penulis || ''
    });
    setSelectedImage(null);
    setSelectedPdf(null);
    setPreview(berita.gambar ? getFileUrl(berita.gambar) : null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus berita?',
      text: 'Data yang dihapus tidak dapat dikembalikan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem('expressToken');
      await axios.delete(`${API_CONFIG.BASE_URL}/berita/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Terhapus',
        text: 'Berita berhasil dihapus',
        timer: 1500,
        showConfirmButton: false
      });
      fetchBerita();
    } catch (error) {
      console.error('Error deleting berita:', error);
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus berita' });
    }
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
    return cleanText.length <= maxLength ? cleanText : `${cleanText.substring(0, maxLength)}...`;
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">Publikasi DPMD</p>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">Manajemen Berita</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Kelola artikel landing page, unggah gambar sampul, dan lampirkan PDF sebagai isi berita resmi.
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-bold text-slate-950 shadow-lg transition hover:bg-blue-50"
            >
              <FiPlus className="h-5 w-5" />
              Buat Berita
            </button>
          </div>
          <div className="grid border-t border-white/10 md:grid-cols-3">
            <div className="p-5">
              <p className="text-2xl font-black">{stats.total}</p>
              <p className="text-sm text-slate-400">Item di halaman ini</p>
            </div>
            <div className="border-t border-white/10 p-5 md:border-l md:border-t-0">
              <p className="text-2xl font-black">{stats.published}</p>
              <p className="text-sm text-slate-400">Published</p>
            </div>
            <div className="border-t border-white/10 p-5 md:border-l md:border-t-0">
              <p className="text-2xl font-black">{stats.pdf}</p>
              <p className="text-sm text-slate-400">Memiliki PDF</p>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4">
            <div className="mx-auto my-4 max-w-5xl overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{editMode ? 'Edit Berita' : 'Buat Berita Baru'}</h2>
                  <p className="text-sm text-slate-500">PDF dapat menjadi isi utama berita.</p>
                </div>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-6 p-5 lg:grid-cols-[360px_1fr]">
                <div className="space-y-4">
                  <UploadCard
                    title="Gambar Sampul"
                    description="JPG, PNG, WEBP"
                    accept={{ 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] }}
                    file={selectedImage}
                    currentUrl={!selectedImage && currentBerita?.gambar ? getFileUrl(currentBerita.gambar) : null}
                    currentLabel="Gambar saat ini"
                    previewUrl={preview}
                    icon={FiImage}
                    onDrop={onImageDrop}
                    onClear={() => {
                      setSelectedImage(null);
                      setPreview(null);
                    }}
                  />

                  <UploadCard
                    title="File PDF Berita"
                    description="Maksimal 15 MB"
                    accept={{ 'application/pdf': ['.pdf'] }}
                    file={selectedPdf}
                    currentUrl={!selectedPdf && currentBerita?.dokumen_pdf ? getFileUrl(currentBerita.dokumen_pdf) : null}
                    currentLabel="PDF saat ini"
                    icon={FiFileText}
                    onDrop={onPdfDrop}
                    onClear={() => setSelectedPdf(null)}
                  />
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Judul Berita *</label>
                    <input
                      type="text"
                      name="judul"
                      value={formData.judul}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      placeholder="Masukkan judul berita"
                      required
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">Kategori</label>
                      <select
                        name="kategori"
                        value={formData.kategori}
                        onChange={handleInputChange}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        {kategoriOptions.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        {statusOptions.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">Penulis</label>
                      <input
                        type="text"
                        name="penulis"
                        value={formData.penulis}
                        onChange={handleInputChange}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        placeholder="Nama penulis"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Ringkasan</label>
                    <textarea
                      name="ringkasan"
                      value={formData.ringkasan}
                      onChange={handleInputChange}
                      rows="3"
                      maxLength="500"
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      placeholder="Ringkasan singkat berita"
                    />
                    <p className="mt-1 text-xs text-slate-500">{formData.ringkasan.length}/500 karakter</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Konten Berita</label>
                    <textarea
                      name="konten"
                      value={formData.konten}
                      onChange={handleInputChange}
                      rows="9"
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      placeholder="Tulis konten di sini. Boleh dikosongkan jika menggunakan PDF."
                    />
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUploading ? 'Menyimpan...' : editMode ? 'Update Berita' : 'Buat Berita'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari judul berita..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="relative">
              <FiFilter className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(event) => {
                  setFilterStatus(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Semua Status</option>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="mt-4 text-slate-600">Memuat data...</p>
          </div>
        ) : beritaList.length > 0 ? (
          <div className="space-y-4">
            {beritaList.map((berita) => (
              <div key={berita.id_berita} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <div className="grid gap-5 p-4 md:grid-cols-[180px_1fr_auto] md:p-5">
                  <div className="h-44 overflow-hidden rounded-2xl bg-slate-100 md:h-36">
                    {berita.gambar ? (
                      <img
                        src={getFileUrl(berita.gambar)}
                        alt={berita.judul}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = '/placeholder-news.jpg';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FiImage className="h-12 w-12 text-slate-300" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusOptions.find((item) => item.value === berita.status)?.color || statusOptions[0].color}`}>
                        {statusOptions.find((item) => item.value === berita.status)?.label || berita.status}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {kategoriOptions.find((item) => item.value === berita.kategori)?.label || 'Umum'}
                      </span>
                      {berita.dokumen_pdf && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          <FiFileText className="h-3.5 w-3.5" />
                          PDF
                        </span>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-xl font-black leading-tight text-slate-900">{berita.judul}</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1"><FiCalendar />{formatDate(berita.tanggal_publish || berita.created_at)}</span>
                      {berita.penulis && <span className="inline-flex items-center gap-1"><FiUser />{berita.penulis}</span>}
                      <span className="inline-flex items-center gap-1"><FiEye />{berita.views || 0} views</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                      {berita.ringkasan || truncateText(berita.konten, 170)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:flex-col md:items-stretch">
                    {berita.status === 'published' && (
                      <a
                        href={`/berita/${berita.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-50"
                        title="Lihat berita"
                      >
                        <FiExternalLink className="h-5 w-5" />
                      </a>
                    )}
                    {berita.dokumen_pdf && (
                      <a
                        href={getFileUrl(berita.dokumen_pdf)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-700 transition hover:bg-amber-100"
                        title="Buka PDF"
                      >
                        <FiDownload className="h-5 w-5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleEdit(berita)}
                      className="inline-flex items-center justify-center rounded-xl bg-blue-600 p-3 text-white transition hover:bg-blue-700"
                      title="Edit"
                    >
                      <FiEdit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(berita.id_berita)}
                      className="inline-flex items-center justify-center rounded-xl bg-rose-600 p-3 text-white transition hover:bg-rose-700"
                      title="Hapus"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`h-10 w-10 rounded-xl font-bold transition ${
                      currentPage === index + 1 ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <FiFileText className="mx-auto mb-4 h-14 w-14 text-slate-300" />
            <p className="text-lg font-bold text-slate-800">Belum ada berita</p>
            <p className="mt-1 text-sm text-slate-500">Buat berita pertama untuk tampil di landing page.</p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
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
