import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, Trash2, Edit3, Download, RefreshCw,
  Image, File, FolderOpen, AlertCircle, Check, X as XIcon,
  Plus, Search, Eye
} from 'lucide-react';
import api from '../../../../api';
import Swal from 'sweetalert2';

const KATEGORI_OPTIONS = [
  { value: 'cover', label: 'Cover', icon: Image, color: 'purple' },
  { value: 'desa', label: 'Desa', icon: FileText, color: 'blue' },
  { value: 'kecamatan', label: 'Kecamatan', icon: FolderOpen, color: 'green' },
];

const KATEGORI_COLORS = {
  cover: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  desa: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  kecamatan: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  lainnya: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' },
};

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(ext) {
  if (['.png', '.jpg', '.jpeg'].includes(ext)) return Image;
  return FileText;
}

const BankeuFormatSuratTab = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('all');
  const [previewFile, setPreviewFile] = useState(null);

  const [uploadForm, setUploadForm] = useState({
    file: null,
    kategori: 'desa',
    custom_name: '',
  });

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/contoh-proposal/admin/list');
      if (res.data.success) {
        setFiles(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching format files:', error);
      Swal.fire('Error', 'Gagal memuat daftar file format surat', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async () => {
    if (!uploadForm.file) {
      Swal.fire('Peringatan', 'Pilih file terlebih dahulu', 'warning');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('kategori', uploadForm.kategori);
      if (uploadForm.custom_name.trim()) {
        formData.append('custom_name', uploadForm.custom_name.trim());
      }
      if (replaceTarget) {
        formData.append('replace_file', replaceTarget.name);
      }
      const res = await api.post('/contoh-proposal/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        Swal.fire('Berhasil', res.data.message, 'success');
        setShowUploadModal(false);
        setReplaceTarget(null);
        setUploadForm({ file: null, kategori: 'desa', custom_name: '' });
        fetchFiles();
      }
    } catch (error) {
      console.error('Upload error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Gagal mengupload file', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file) => {
    const result = await Swal.fire({
      title: 'Hapus File?',
      html: `File <strong>${file.name}</strong> akan dihapus permanen.<br/>File ini tidak akan bisa didownload lagi oleh Desa.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.delete(`/contoh-proposal/admin/${encodeURIComponent(file.name)}`);
      if (res.data.success) {
        Swal.fire('Terhapus', res.data.message, 'success');
        fetchFiles();
      }
    } catch (error) {
      console.error('Delete error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Gagal menghapus file', 'error');
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim() || !renameTarget) return;
    try {
      const res = await api.put('/contoh-proposal/admin/rename', {
        old_name: renameTarget.name,
        new_name: renameValue.trim()
      });
      if (res.data.success) {
        Swal.fire('Berhasil', res.data.message, 'success');
        setRenameTarget(null);
        setRenameValue('');
        fetchFiles();
      }
    } catch (error) {
      console.error('Rename error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Gagal merename file', 'error');
    }
  };

  const handleReplace = (file) => {
    setReplaceTarget(file);
    setUploadForm({ file: null, kategori: file.category, custom_name: '' });
    setShowUploadModal(true);
  };

  const handleDownload = (file) => {
    const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
    window.open(`${baseUrl}/api/contoh-proposal/download/${encodeURIComponent(file.name)}`, '_blank');
  };

  const handlePreview = (file) => {
    if (['.png', '.jpg', '.jpeg'].includes(file.extension)) {
      const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
      setPreviewFile(`${baseUrl}/api/contoh-proposal/download/${encodeURIComponent(file.name)}`);
    }
  };

  const filteredFiles = files.filter(f => {
    const matchSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKategori = filterKategori === 'all' || f.category === filterKategori;
    return matchSearch && matchKategori;
  });

  const grouped = {
    cover: filteredFiles.filter(f => f.category === 'cover'),
    desa: filteredFiles.filter(f => f.category === 'desa'),
    kecamatan: filteredFiles.filter(f => f.category === 'kecamatan'),
    lainnya: filteredFiles.filter(f => f.category === 'lainnya'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Kelola Format Surat</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload dan kelola file format surat yang dapat didownload oleh Desa pada halaman Bankeu.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => {
              setReplaceTarget(null);
              setUploadForm({ file: null, kategori: 'desa', custom_name: '' });
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Upload File Baru
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFilterKategori('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterKategori === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Semua ({files.length})
          </button>
          {KATEGORI_OPTIONS.map(k => {
            const count = files.filter(f => f.category === k.value).length;
            return (
              <button
                key={k.value}
                onClick={() => setFilterKategori(k.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filterKategori === k.value ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {k.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* File List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-blue-500 mr-3" />
          <span className="text-gray-500">Memuat daftar file...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Belum ada file format surat</p>
          <p className="text-sm text-gray-400 mt-1">Upload file pertama untuk memulai</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([kategori, fileList]) => {
            if (fileList.length === 0) return null;
            const colors = KATEGORI_COLORS[kategori];
            const label = KATEGORI_OPTIONS.find(k => k.value === kategori)?.label || 'Lainnya';

            return (
              <motion.div
                key={kategori}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border ${colors.border} overflow-hidden`}
              >
                <div className={`px-4 py-3 ${colors.bg} flex items-center gap-2`}>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${colors.badge}`}>
                    {label}
                  </span>
                  <span className="text-xs text-gray-500">{fileList.length} file</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {fileList.map((file) => {
                    const IconComp = getFileIcon(file.extension);
                    const isImage = ['.png', '.jpg', '.jpeg'].includes(file.extension);
                    const isRenaming = renameTarget?.name === file.name;

                    return (
                      <div key={file.name} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                            <IconComp size={20} className={colors.text} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isRenaming ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRename();
                                    if (e.key === 'Escape') setRenameTarget(null);
                                  }}
                                  autoFocus
                                  className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <button onClick={handleRename} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Simpan">
                                  <Check size={16} />
                                </button>
                                <button onClick={() => setRenameTarget(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Batal">
                                  <XIcon size={16} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {formatFileSize(file.size)} &bull; {file.extension?.toUpperCase().replace('.', '')}
                                  {file.modified_at && (
                                    <> &bull; Diubah {new Date(file.modified_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                                  )}
                                </p>
                              </>
                            )}
                          </div>
                          {!isRenaming && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isImage && (
                                <button onClick={() => handlePreview(file)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Preview">
                                  <Eye size={16} />
                                </button>
                              )}
                              <button onClick={() => handleDownload(file)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download">
                                <Download size={16} />
                              </button>
                              <button
                                onClick={() => { setRenameTarget(file); setRenameValue(file.name); }}
                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Rename"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button onClick={() => handleReplace(file)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Ganti file">
                                <Upload size={16} />
                              </button>
                              <button onClick={() => handleDelete(file)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-1">Naming Convention</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700">
            <li>File Cover otomatis diberi prefix <code className="bg-amber-100 px-1 rounded">Cover_</code></li>
            <li>File Desa otomatis diberi prefix <code className="bg-amber-100 px-1 rounded">DESA - </code></li>
            <li>File Kecamatan otomatis diberi prefix <code className="bg-amber-100 px-1 rounded">KEC - </code></li>
            <li>File yang diupload akan langsung tersedia untuk didownload Desa di halaman Bankeu</li>
          </ul>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowUploadModal(false); setReplaceTarget(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {replaceTarget ? `Ganti File: ${replaceTarget.display_name}` : 'Upload File Baru'}
                </h3>
                <button onClick={() => { setShowUploadModal(false); setReplaceTarget(null); }} className="p-1 hover:bg-gray-100 rounded-lg">
                  <XIcon size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Kategori */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <div className="flex gap-2">
                    {KATEGORI_OPTIONS.map(k => {
                      const Icon = k.icon;
                      const isSelected = uploadForm.kategori === k.value;
                      return (
                        <button
                          key={k.value}
                          onClick={() => setUploadForm(prev => ({ ...prev, kategori: k.value }))}
                          disabled={!!replaceTarget}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          } ${replaceTarget ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <Icon size={16} />
                          {k.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama File <span className="text-gray-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={uploadForm.custom_name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, custom_name: e.target.value }))}
                    placeholder="Kosongkan untuk pakai nama file asli"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {uploadForm.custom_name && (
                    <p className="text-xs text-gray-400 mt-1">
                      Hasil: <span className="font-mono text-gray-600">
                        {uploadForm.kategori === 'cover' ? 'Cover_' : uploadForm.kategori === 'desa' ? 'DESA - ' : 'KEC - '}
                        {uploadForm.custom_name}
                        {uploadForm.file ? `.${uploadForm.file.name.split('.').pop()}` : ''}
                      </span>
                    </p>
                  )}
                </div>

                {/* File Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept=".docx,.doc,.pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                      onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files[0] || null }))}
                      className="hidden"
                      id="upload-file-input"
                    />
                    <label htmlFor="upload-file-input" className="cursor-pointer">
                      {uploadForm.file ? (
                        <div className="flex items-center justify-center gap-2">
                          <File size={20} className="text-blue-500" />
                          <span className="text-sm font-medium text-gray-900">{uploadForm.file.name}</span>
                          <span className="text-xs text-gray-500">({formatFileSize(uploadForm.file.size)})</span>
                        </div>
                      ) : (
                        <>
                          <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Klik untuk pilih file</p>
                          <p className="text-xs text-gray-400 mt-1">.docx, .doc, .pdf, .png, .jpg, .xlsx (maks 15MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
                <button
                  onClick={() => { setShowUploadModal(false); setReplaceTarget(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadForm.file || uploading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Mengupload...</>
                  ) : (
                    <><Upload size={14} /> {replaceTarget ? 'Ganti File' : 'Upload'}</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-3xl max-h-[80vh]"
            >
              <button
                onClick={() => setPreviewFile(null)}
                className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 z-10"
              >
                <XIcon size={20} />
              </button>
              <img
                src={previewFile}
                alt="Preview"
                className="rounded-lg shadow-2xl max-h-[80vh] object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BankeuFormatSuratTab;
