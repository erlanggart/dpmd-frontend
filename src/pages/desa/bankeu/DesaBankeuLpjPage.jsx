import React, { useState, useEffect, useRef } from 'react';
import { LuUpload, LuFileText, LuTrash2, LuDownload, LuCircleCheck, LuCircleAlert, LuLoader, LuFile, LuMessageSquare, LuClock, LuCircleX, LuPencil, LuPlus, LuX } from 'react-icons/lu';
import Swal from 'sweetalert2';
import api from '../../../api';
import toast from 'react-hot-toast';
import ChatDrawer from '../../../components/shared/ChatDrawer';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 10;

const STATUS_CONFIG = {
  pending: { label: 'Menunggu Verifikasi', color: 'amber', icon: LuClock, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Disetujui', color: 'green', icon: LuCircleCheck, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700' },
  rejected: { label: 'Ditolak', color: 'red', icon: LuCircleX, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  revision: { label: 'Perlu Revisi', color: 'orange', icon: LuPencil, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
};

const DesaBankeuLpjPage = ({
  tahun = 2025,
  programName = 'Bantuan Keuangan',
  endpointBase = '/desa/bankeu-lpj',
  storageBase = '/storage/uploads/bankeu_lpj',
  referenceType = 'bankeu_lpj',
  chatTitle = 'Chat LPJ Bankeu',
}) => {
  const [lpjList, setLpjList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [keterangan, setKeterangan] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [chatLpjId, setChatLpjId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchLpj();
  }, [tahun]);

  const fetchLpj = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${endpointBase}?tahun=${tahun}`);
      if (response.data.success) {
        setLpjList(Array.isArray(response.data.data) ? response.data.data : response.data.data ? [response.data.data] : []);
      }
    } catch (error) {
      console.error('Error fetching LPJ:', error);
      toast.error('Gagal memuat data LPJ');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const errors = [];
    const validFiles = [];

    for (const file of files) {
      if (file.type !== 'application/pdf') {
        errors.push(`${file.name}: Bukan file PDF. Hanya file PDF yang diperbolehkan.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Ukuran ${(file.size / (1024 * 1024)).toFixed(1)} MB melebihi batas 100 MB. Silakan kompres file terlebih dahulu.`);
        continue;
      }
      if (file.size === 0) {
        errors.push(`${file.name}: File kosong (0 bytes). Pastikan file tidak rusak.`);
        continue;
      }
      validFiles.push(file);
    }

    if (selectedFiles.length + validFiles.length > MAX_FILES) {
      toast.error(`Maksimal ${MAX_FILES} file per upload. Saat ini sudah ada ${selectedFiles.length} file terpilih.`, { duration: 5000 });
      e.target.value = '';
      return;
    }

    if (errors.length > 0) {
      errors.forEach(err => toast.error(err, { duration: 6000, icon: '⚠️' }));
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }

    e.target.value = '';
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getUploadErrorMessage = (error) => {
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return 'Upload gagal: Waktu upload habis (timeout). File mungkin terlalu besar atau koneksi internet lambat. Silakan coba lagi.';
      }
      if (error.message?.includes('Network Error') || error.message?.includes('ERR_NETWORK')) {
        return 'Upload gagal: Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.';
      }
      return 'Upload gagal: Terjadi kesalahan koneksi. Periksa koneksi internet Anda dan coba lagi.';
    }

    const status = error.response.status;
    const serverMsg = error.response.data?.message;
    const errorCode = error.response.data?.error_code;

    if (status === 413 || errorCode === 'FILE_TOO_LARGE') {
      return 'Upload gagal: Ukuran file terlalu besar. Maksimal 100 MB per file. Silakan kompres file PDF terlebih dahulu.';
    }
    if (errorCode === 'INVALID_FILE_TYPE') {
      return 'Upload gagal: Format file tidak didukung. Hanya file PDF yang diperbolehkan.';
    }
    if (errorCode === 'TOO_MANY_FILES') {
      return 'Upload gagal: Terlalu banyak file. Maksimal 10 file per upload.';
    }
    if (status === 403) {
      return 'Upload gagal: Anda tidak memiliki akses untuk mengupload LPJ. Hubungi admin.';
    }
    if (status === 401) {
      return 'Upload gagal: Sesi login telah berakhir. Silakan login ulang.';
    }
    if (status >= 500) {
      return 'Upload gagal: Terjadi kesalahan pada server. Silakan coba lagi nanti atau hubungi admin.';
    }

    return serverMsg || 'Upload gagal: Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Pilih minimal satu file terlebih dahulu');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('files', file));
      formData.append('tahun_anggaran', tahun);
      formData.append('keterangan', keterangan);

      const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
      const timeoutMs = Math.max(60000, Math.ceil(totalSize / (50 * 1024)) * 1000); // min 60s, ~50KB/s

      const response = await api.post(`${endpointBase}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: timeoutMs,
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setSelectedFiles([]);
        setKeterangan('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchLpj();
      }
    } catch (error) {
      console.error('Error uploading LPJ:', error);
      const errorMsg = getUploadErrorMessage(error);
      toast.error(errorMsg, { duration: 8000, icon: '❌' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (lpj) => {
    if (!lpj?.id) return;

    const result = await Swal.fire({
      title: 'Hapus File LPJ?',
      html: `
        <div style="text-align:left; font-size:14px; color:#4B5563;">
          <p style="margin-bottom:8px;">File berikut akan dihapus secara permanen:</p>
          <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:12px; margin-bottom:8px;">
            <p style="font-weight:600; color:#991B1B;">📄 ${lpj.nama_file}</p>
          </div>
          <p style="color:#DC2626; font-size:13px;">⚠️ Tindakan ini tidak dapat dibatalkan.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: '🗑️ Ya, Hapus LPJ',
      cancelButtonText: 'Batal',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      setDeleting(lpj.id);
      const response = await api.delete(`${endpointBase}/${lpj.id}`);
      if (response.data.success) {
        toast.success('LPJ berhasil dihapus');
        fetchLpj();
      }
    } catch (error) {
      console.error('Error deleting LPJ:', error);
      toast.error(error.response?.data?.message || 'Gagal menghapus LPJ');
    } finally {
      setDeleting(null);
    }
  };

  const getFileUrl = (filePath) => {
    const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
    return `${baseUrl}${storageBase}/${filePath}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <LuLoader className="h-10 w-10 animate-spin text-slate-500 mx-auto" />
          <p className="mt-3 text-gray-500">Memuat data LPJ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl items-center justify-center mb-4 shadow-xl shadow-amber-500/30">
            <LuFileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 via-slate-700 to-slate-600 bg-clip-text text-transparent mb-2">
            LPJ {programName} {tahun}
          </h1>
          <p className="text-gray-500">
            Upload Laporan Pertanggungjawaban {programName} Tahun {tahun}
          </p>
        </div>

        {/* Uploaded Files List */}
        {lpjList.length > 0 ? (
          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <LuFileText className="h-5 w-5 text-slate-600" />
              File LPJ Terupload ({lpjList.length} file)
            </h3>
            {lpjList.map((lpj) => {
              const status = lpj.status || 'pending';
              const cfg = STATUS_CONFIG[status];
              const StatusIcon = cfg.icon;
              return (
                <div key={lpj.id} className={`bg-white rounded-2xl shadow-lg border p-5 ${
                  status === 'rejected' ? 'border-red-300' :
                  status === 'revision' ? 'border-orange-300' :
                  status === 'approved' ? 'border-slate-300' :
                  'border-amber-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 ${cfg.bg} rounded-xl flex items-center justify-center`}>
                        <StatusIcon className={`h-4 w-4 ${cfg.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 truncate text-sm">{lpj.nama_file}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(lpj.file_size)} • {formatDate(lpj.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>

                  {/* DPMD Catatan */}
                  {lpj.dpmd_catatan && ['rejected', 'revision'].includes(status) && (
                    <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-3 mb-3`}>
                      <div className="flex items-start gap-2">
                        <LuMessageSquare className={`h-4 w-4 ${cfg.text} mt-0.5 flex-shrink-0`} />
                        <div className="flex-1">
                          <p className={`text-xs font-semibold ${cfg.text} mb-0.5`}>Catatan DPMD:</p>
                          <p className={`text-xs ${cfg.text}`}>{lpj.dpmd_catatan}</p>
                        </div>
                        {status === 'revision' && (
                          <button
                            onClick={() => setChatLpjId(lpj.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-600 text-white rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors flex-shrink-0"
                          >
                            <LuMessageSquare className="h-3.5 w-3.5" />
                            Chat
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {lpj.keterangan && (
                    <p className="text-xs text-gray-500 mb-3"><span className="font-medium">Keterangan:</span> {lpj.keterangan}</p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={getFileUrl(lpj.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors text-xs font-medium shadow-sm"
                    >
                      <LuDownload className="h-3.5 w-3.5" />
                      Lihat / Download
                    </a>
                    <button
                      onClick={() => handleDelete(lpj)}
                      disabled={deleting === lpj.id || status === 'approved'}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        status === 'approved'
                          ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                      }`}
                      title={status === 'approved' ? 'LPJ yang sudah disetujui tidak dapat dihapus' : ''}
                    >
                      {deleting === lpj.id ? <LuLoader className="h-3.5 w-3.5 animate-spin" /> : <LuTrash2 className="h-3.5 w-3.5" />}
                      {deleting === lpj.id ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <LuCircleAlert className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800">Belum Ada LPJ</h3>
                <p className="text-sm text-amber-600">Silakan upload file LPJ di bawah ini</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <LuUpload className="h-5 w-5 text-slate-600" />
            Upload LPJ
          </h3>

          {/* File Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File LPJ <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(Bisa pilih beberapa file sekaligus)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                selectedFiles.length > 0
                  ? 'border-slate-400 bg-slate-50'
                  : 'border-gray-300 hover:border-slate-400 hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <LuPlus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="font-medium text-gray-600">Klik untuk memilih file</p>
              <p className="text-sm text-gray-400 mt-1">Format: PDF, Maks: 100 MB per file, Maks: {MAX_FILES} file</p>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-500">{selectedFiles.length} file dipilih ({formatFileSize(selectedFiles.reduce((s, f) => s + f.size, 0))} total)</p>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <LuFile className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeSelectedFile(idx); }} className="p-1 hover:bg-slate-100 rounded-lg">
                      <LuX className="h-4 w-4 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Keterangan */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keterangan <span className="text-gray-400">(opsional)</span>
            </label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan tambahan mengenai LPJ..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 resize-none text-sm"
            />
          </div>

          {/* Upload Progress */}
          {uploading && uploadProgress > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Mengupload...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-slate-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all ${
              selectedFiles.length === 0 || uploading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-lg shadow-slate-500/25 hover:shadow-xl'
            }`}
          >
            {uploading ? (
              <>
                <LuLoader className="h-5 w-5 animate-spin" />
                Mengupload... {uploadProgress > 0 ? `(${uploadProgress}%)` : ''}
              </>
            ) : (
              <>
                <LuUpload className="h-5 w-5" />
                Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File LPJ` : 'LPJ'}
              </>
            )}
          </button>

          {/* Info */}
          <div className="mt-4 bg-slate-50 border-l-4 border-slate-500 p-3 rounded-lg">
            <p className="text-xs text-slate-700">
              <strong>Informasi:</strong> File LPJ {programName} yang diupload akan diverifikasi oleh DPMD.
              Anda dapat mengupload beberapa file LPJ sekaligus (maks {MAX_FILES} file, 100 MB per file).
              Setelah upload, DPMD akan memverifikasi LPJ Anda.
            </p>
          </div>
        </div>
      </div>

      {/* Contextual Chat Drawer */}
      {chatLpjId && (
        <ChatDrawer
          referenceType={referenceType}
          referenceId={chatLpjId}
          targetUserId={lpjList.find(l => l.id === chatLpjId)?.dpmd_verified_by}
          floating={false}
          isOpen={!!chatLpjId}
          onClose={() => setChatLpjId(null)}
          title={chatTitle}
        />
      )}
    </div>
  );
};

export default DesaBankeuLpjPage;
