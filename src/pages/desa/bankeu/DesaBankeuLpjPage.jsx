import React, { useState, useEffect, useRef } from 'react';
import { LuUpload, LuFileText, LuTrash2, LuDownload, LuCircleCheck, LuCircleAlert, LuLoader, LuFile, LuMessageSquare, LuClock, LuCircleX, LuPencil } from 'react-icons/lu';
import Swal from 'sweetalert2';
import api from '../../../api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: { label: 'Menunggu Verifikasi', color: 'amber', icon: LuClock, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Disetujui', color: 'green', icon: LuCircleCheck, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
  rejected: { label: 'Ditolak', color: 'red', icon: LuCircleX, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  revision: { label: 'Perlu Revisi', color: 'orange', icon: LuPencil, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
};

const DesaBankeuLpjPage = ({ tahun = 2025 }) => {
  const [lpjData, setLpjData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [keterangan, setKeterangan] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchLpj();
  }, [tahun]);

  const fetchLpj = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/desa/bankeu-lpj?tahun=${tahun}`);
      if (response.data.success) {
        setLpjData(response.data.data);
        if (response.data.data?.keterangan) {
          setKeterangan(response.data.data.keterangan);
        }
      }
    } catch (error) {
      console.error('Error fetching LPJ:', error);
      toast.error('Gagal memuat data LPJ');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Hanya file PDF yang diperbolehkan');
      e.target.value = '';
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      toast.error(
        `Ukuran file ${(file.size / (1024 * 1024)).toFixed(1)} MB melebihi batas maksimal 30 MB. Silakan kompres file PDF terlebih dahulu.`,
        { duration: 5000, icon: '📄' }
      );
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('tahun_anggaran', tahun);
      formData.append('keterangan', keterangan);

      const response = await api.post('/desa/bankeu-lpj/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchLpj();
      }
    } catch (error) {
      console.error('Error uploading LPJ:', error);
      toast.error(error.response?.data?.message || 'Gagal mengupload LPJ');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!lpjData?.id) return;

    const result = await Swal.fire({
      title: 'Hapus File LPJ?',
      html: `
        <div style="text-align:left; font-size:14px; color:#4B5563;">
          <p style="margin-bottom:8px;">File berikut akan dihapus secara permanen:</p>
          <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:12px; margin-bottom:8px;">
            <p style="font-weight:600; color:#991B1B;">📄 ${lpjData.nama_file}</p>
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
      setDeleting(true);
      const response = await api.delete(`/desa/bankeu-lpj/${lpjData.id}`);
      if (response.data.success) {
        toast.success('LPJ berhasil dihapus');
        setLpjData(null);
        setKeterangan('');
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Error deleting LPJ:', error);
      toast.error(error.response?.data?.message || 'Gagal menghapus LPJ');
    } finally {
      setDeleting(false);
    }
  };

  const getFileUrl = (filePath) => {
    const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
    return `${baseUrl}/storage/uploads/bankeu_lpj/${filePath}`;
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
          <LuLoader className="h-10 w-10 animate-spin text-blue-500 mx-auto" />
          <p className="mt-3 text-gray-500">Memuat data LPJ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl items-center justify-center mb-4 shadow-xl shadow-amber-500/30">
            <LuFileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 via-amber-700 to-orange-600 bg-clip-text text-transparent mb-2">
            LPJ Bantuan Keuangan {tahun}
          </h1>
          <p className="text-gray-500">
            Upload Laporan Pertanggungjawaban Bantuan Keuangan Tahun {tahun}
          </p>
        </div>

        {/* Status Card */}
        {lpjData ? (
          <div className={`bg-white rounded-2xl shadow-lg border p-6 mb-6 ${
            lpjData.status === 'rejected' ? 'border-red-300' :
            lpjData.status === 'revision' ? 'border-orange-300' :
            lpjData.status === 'approved' ? 'border-green-300' :
            'border-amber-200'
          }`}>
            {(() => {
              const status = lpjData.status || 'pending';
              const cfg = STATUS_CONFIG[status];
              const StatusIcon = cfg.icon;
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 ${cfg.bg} rounded-xl flex items-center justify-center`}>
                        <StatusIcon className={`h-5 w-5 ${cfg.text}`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${cfg.text}`}>LPJ Sudah Diupload</h3>
                        <p className={`text-sm ${cfg.text} opacity-75`}>File berhasil tersimpan di sistem</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                  </div>

                  {/* DPMD Catatan - Show if rejected or revision */}
                  {lpjData.dpmd_catatan && ['rejected', 'revision'].includes(status) && (
                    <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 mb-4`}>
                      <div className="flex items-start gap-2">
                        <LuMessageSquare className={`h-4 w-4 ${cfg.text} mt-0.5 flex-shrink-0`} />
                        <div>
                          <p className={`text-sm font-semibold ${cfg.text} mb-1`}>
                            Catatan dari DPMD:
                          </p>
                          <p className={`text-sm ${cfg.text}`}>{lpjData.dpmd_catatan}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* File info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <LuFile className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{lpjData.nama_file}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(lpjData.file_size)} • Diupload {formatDate(lpjData.created_at)}
                  </p>
                </div>
              </div>
              {lpjData.keterangan && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-sm text-gray-600"><span className="font-medium">Keterangan:</span> {lpjData.keterangan}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <a
                href={getFileUrl(lpjData.file_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
              >
                <LuDownload className="h-4 w-4" />
                Lihat / Download
              </a>
              <button
                onClick={handleDelete}
                disabled={deleting || lpjData.status === 'approved'}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  lpjData.status === 'approved'
                    ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                }`}
                title={lpjData.status === 'approved' ? 'LPJ yang sudah disetujui tidak dapat dihapus' : ''}
              >
                {deleting ? <LuLoader className="h-4 w-4 animate-spin" /> : <LuTrash2 className="h-4 w-4" />}
                {deleting ? 'Menghapus...' : 'Hapus LPJ'}
              </button>
            </div>
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
            <LuUpload className="h-5 w-5 text-blue-600" />
            {lpjData ? 'Upload Ulang LPJ' : 'Upload LPJ'}
          </h3>

          {/* File Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File LPJ <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div>
                  <LuFile className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                  <p className="font-medium text-blue-700">{selectedFile.name}</p>
                  <p className="text-sm text-blue-500 mt-1">{formatFileSize(selectedFile.size)}</p>
                  <p className="text-xs text-gray-400 mt-2">Klik untuk mengganti file</p>
                </div>
              ) : (
                <div>
                  <LuUpload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium text-gray-600">Klik untuk memilih file</p>
                  <p className="text-sm text-gray-400 mt-1">Format: PDF, Maks: 30MB</p>
                </div>
              )}
            </div>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-sm"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all ${
              !selectedFile || uploading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-xl'
            }`}
          >
            {uploading ? (
              <>
                <LuLoader className="h-5 w-5 animate-spin" />
                Mengupload...
              </>
            ) : (
              <>
                <LuUpload className="h-5 w-5" />
                {lpjData ? 'Upload Ulang LPJ' : 'Upload LPJ'}
              </>
            )}
          </button>

          {/* Info */}
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Informasi:</strong> File LPJ yang diupload akan diverifikasi oleh DPMD.
              {lpjData && lpjData.status === 'approved' && ' LPJ telah disetujui.'}
              {lpjData && ['rejected', 'revision'].includes(lpjData.status) && ' Silakan upload ulang sesuai catatan DPMD.'}
              {lpjData && lpjData.status === 'pending' && ' Menunggu verifikasi dari DPMD.'}
              {!lpjData && ' Setelah upload, DPMD akan memverifikasi LPJ Anda.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesaBankeuLpjPage;
