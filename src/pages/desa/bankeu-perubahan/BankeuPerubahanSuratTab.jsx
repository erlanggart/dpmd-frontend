import React, { useEffect, useState } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import { LuUpload, LuEye, LuTrash2, LuSend, LuCheck, LuRefreshCw, LuFileText, LuTriangleAlert } from 'react-icons/lu';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const BankeuPerubahanSuratTab = ({ tahun }) => {
  const [surat, setSurat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({ pengantar: false, permohonan: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/desa/bankeu-perubahan/surat', { params: { tahun } });
      setSurat(res.data?.data || null);
    } catch (err) {
      console.error('Fetch surat error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tahun]);

  const handleUpload = async (jenis, file) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [jenis]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('jenis', jenis);
      fd.append('tahun', String(tahun));
      await api.post('/desa/bankeu-perubahan/surat/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Swal.fire('Berhasil', `Surat ${jenis} terupload`, 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal upload surat', 'error');
    } finally {
      setUploading(prev => ({ ...prev, [jenis]: false }));
    }
  };

  const handleDelete = async (jenis) => {
    const result = await Swal.fire({
      title: `Hapus surat ${jenis}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/desa/bankeu-perubahan/surat/${jenis}`, { params: { tahun } });
      Swal.fire('Berhasil', 'Surat dihapus', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal hapus', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!surat?.surat_pengantar || !surat?.surat_permohonan) {
      return Swal.fire('Validasi', 'Upload kedua surat (pengantar & permohonan) terlebih dahulu', 'warning');
    }
    const result = await Swal.fire({
      title: 'Kirim surat ke Kecamatan?',
      text: 'Setelah dikirim, surat tidak dapat dihapus sampai dikembalikan untuk revisi',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      confirmButtonText: 'Ya, kirim',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      await api.post('/desa/bankeu-perubahan/surat/submit', { tahun });
      Swal.fire('Berhasil', 'Surat terkirim ke kecamatan', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal kirim', 'error');
    }
  };

  const submitted = surat?.submitted_to_kecamatan;
  const reviewStatus = surat?.kecamatan_review_status;
  const isReturned = ['rejected', 'revision'].includes(reviewStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <LuFileText className="w-6 h-6 text-orange-600" />
                Surat Pengantar & Permohonan TA {tahun}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                1 surat pengantar + 1 surat permohonan untuk seluruh proposal Bankeu Perubahan
              </p>
            </div>
            <button onClick={fetchData} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg">
              <LuRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {submitted && (
            <div className={`mt-4 rounded-xl p-3 border ${
              reviewStatus === 'approved' ? 'bg-emerald-50 border-emerald-200' :
              isReturned ? 'bg-red-50 border-red-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              <div className="text-sm font-semibold">
                Status: {reviewStatus === 'approved' ? '✅ Disetujui Kecamatan' :
                         reviewStatus === 'rejected' ? '❌ Ditolak' :
                         reviewStatus === 'revision' ? '🔄 Perlu Revisi' :
                         '⏳ Menunggu Review Kecamatan'}
              </div>
              {surat?.kecamatan_review_catatan && (
                <div className="text-xs mt-1 text-gray-700">
                  <strong>Catatan:</strong> {surat.kecamatan_review_catatan}
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            Memuat data...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SuratCard
              jenis="pengantar"
              filename={surat?.surat_pengantar}
              uploading={uploading.pengantar}
              disabled={submitted && !isReturned}
              onUpload={(file) => handleUpload('pengantar', file)}
              onDelete={() => handleDelete('pengantar')}
            />
            <SuratCard
              jenis="permohonan"
              filename={surat?.surat_permohonan}
              uploading={uploading.permohonan}
              disabled={submitted && !isReturned}
              onUpload={(file) => handleUpload('permohonan', file)}
              onDelete={() => handleDelete('permohonan')}
            />
          </div>
        )}

        {(!submitted || isReturned) && (
          <div className="mt-5">
            <button
              onClick={handleSubmit}
              disabled={!surat?.surat_pengantar || !surat?.surat_permohonan}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LuSend className="w-5 h-5" />
              Kirim Surat ke Kecamatan
            </button>
            {(!surat?.surat_pengantar || !surat?.surat_permohonan) && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <LuTriangleAlert className="w-3.5 h-3.5" />
                Upload kedua surat dulu sebelum dikirim
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SuratCard = ({ jenis, filename, uploading, disabled, onUpload, onDelete }) => {
  const label = jenis === 'pengantar' ? 'Surat Pengantar Proposal' : 'Surat Permohonan Proposal';
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h3 className="font-bold text-gray-800 capitalize">{label}</h3>
      <p className="text-xs text-gray-500 mt-1">Format: PDF, max 50MB</p>

      <div className="mt-4">
        {filename ? (
          <div className="border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <LuCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-emerald-800 truncate">{filename}</span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <a
                  href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/surat/${filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200"
                >
                  <LuEye className="w-3.5 h-3.5" />
                </a>
                {!disabled && (
                  <button
                    onClick={onDelete}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg border border-red-200"
                  >
                    <LuTrash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <label className="border-2 border-dashed border-gray-300 hover:border-orange-400 bg-gray-50 hover:bg-orange-50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors">
            <LuUpload className="w-8 h-8 text-gray-400" />
            <span className="mt-2 text-sm text-gray-600 font-semibold">
              {uploading ? 'Mengupload...' : 'Klik untuk upload'}
            </span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              disabled={uploading || disabled}
              onChange={e => onUpload(e.target.files?.[0])}
            />
          </label>
        )}
      </div>
    </div>
  );
};

export default BankeuPerubahanSuratTab;
