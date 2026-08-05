import React, { useState, useEffect, useRef } from 'react';
import { LuUpload, LuFileText, LuTrash2, LuDownload, LuCircleCheck, LuCircleAlert, LuLoader, LuFile, LuMessageSquare, LuClock, LuCircleX, LuPencil, LuPlus, LuX } from 'react-icons/lu';
import Swal from 'sweetalert2';
import api from '../../../api';
import toast from 'react-hot-toast';
import ChatDrawer from '../../../components/shared/ChatDrawer';
import DesaPageHeader from '../../../components/desa/DesaPageHeader';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 10;

const STATUS_CONFIG = {
  pending: { label: 'Menunggu Verifikasi', color: 'amber', icon: LuClock, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Disetujui', color: 'green', icon: LuCircleCheck, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700' },
  rejected: { label: 'Ditolak', color: 'red', icon: LuCircleX, bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700' },
  revision: { label: 'Perlu Revisi', color: 'orange', icon: LuPencil, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
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
          <p className="mt-3 text-slate-500">Memuat data LPJ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        {/* Header */}
        <DesaPageHeader
          icon={LuFileText}
          eyebrow="Bantuan Keuangan"
          title={`LPJ ${programName} ${tahun}`}
          description={`Unggah Laporan Pertanggungjawaban ${programName} Tahun ${tahun}.`}
        />

        {/* Uploaded Files List */}
        {lpjList.length > 0 ? (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <LuFileText className="h-4 w-4 text-slate-400" />
              File LPJ terunggah ({lpjList.length} file)
            </h3>
            {lpjList.map((lpj) => {
              const status = lpj.status || 'pending';
              const cfg = STATUS_CONFIG[status];
              const StatusIcon = cfg.icon;
              return (
                <div key={lpj.id} className={`rounded-xl border bg-white p-5 ${
                  status === 'rejected' ? 'border-rose-200' :
                  status === 'revision' ? 'border-amber-200' :
                  status === 'approved' ? 'border-emerald-200' :
                  'border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 ${cfg.bg} rounded-xl flex items-center justify-center`}>
                        <StatusIcon className={`h-4 w-4 ${cfg.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 truncate text-sm">{lpj.nama_file}</p>
                        <p className="text-xs text-slate-500">
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
                            className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
                          >
                            <LuMessageSquare className="h-3.5 w-3.5" />
                            Chat
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {lpj.keterangan && (
                    <p className="text-xs text-slate-500 mb-3"><span className="font-medium">Keterangan:</span> {lpj.keterangan}</p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={getFileUrl(lpj.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
                    >
                      <LuDownload className="h-3.5 w-3.5" />
                      Lihat / Download
                    </a>
                    <button
                      onClick={() => handleDelete(lpj)}
                      disabled={deleting === lpj.id || status === 'approved'}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        status === 'approved'
                          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                          : 'border-slate-200 text-rose-600 hover:border-rose-200 hover:bg-rose-50'
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
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <LuCircleAlert className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-900">Belum ada LPJ</h3>
                <p className="text-sm text-amber-700">Silakan unggah file LPJ pada formulir di bawah.</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <LuUpload className="h-4 w-4 text-slate-400" />
            Unggah LPJ
          </h3>

          {/* File Input */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              File LPJ <span className="text-rose-500">*</span>
              <span className="ml-1 font-normal text-slate-400">(bisa pilih beberapa file sekaligus)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-xl border border-dashed p-6 text-center transition-colors ${
                selectedFiles.length > 0
                  ? 'border-slate-400 bg-slate-50'
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
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
              <LuPlus className="mx-auto mb-2 h-7 w-7 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Klik untuk memilih file</p>
              <p className="mt-1 text-xs text-slate-400">Format PDF · maks 100 MB per file · maks {MAX_FILES} file</p>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-slate-500">{selectedFiles.length} file dipilih ({formatFileSize(selectedFiles.reduce((s, f) => s + f.size, 0))} total)</p>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <LuFile className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeSelectedFile(idx); }} className="p-1 hover:bg-slate-100 rounded-lg">
                      <LuX className="h-4 w-4 text-slate-400 hover:text-rose-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Keterangan */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Keterangan <span className="text-slate-400">(opsional)</span>
            </label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan tambahan mengenai LPJ..."
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Upload Progress */}
          {uploading && uploadProgress > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Mengupload...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-slate-900 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-colors ${
              selectedFiles.length === 0 || uploading
                ? 'cursor-not-allowed bg-slate-300'
                : 'bg-slate-900 hover:bg-slate-800'
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
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs leading-5 text-slate-600">
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
