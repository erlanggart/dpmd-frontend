import React, { useEffect, useState } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import { LuUpload, LuEye, LuTrash2, LuRefreshCw, LuClipboardCheck, LuInfo, LuFileText } from 'react-icons/lu';
import DesaPageHeader from '../../../components/desa/DesaPageHeader';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const STATUS_STYLES = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  revision: 'bg-amber-50 text-amber-700 border-amber-200',
};
const STATUS_LABELS = {
  pending: 'Pending', verified: 'Disetujui', rejected: 'Ditolak', revision: 'Revisi'
};

const DesaBankeuPerubahanLpjPage = ({ tahun }) => {
  const [lpjList, setLpjList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [keterangan, setKeterangan] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/desa/bankeu-perubahan-lpj', { params: { tahun } });
      setLpjList(res.data?.data || []);
    } catch (err) {
      console.error('Fetch LPJ error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tahun]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      return Swal.fire('Validasi', 'Pilih minimal 1 file LPJ', 'warning');
    }
    setUploading(true);
    try {
      const fd = new FormData();
      selectedFiles.forEach(f => fd.append('files', f));
      fd.append('tahun', String(tahun));
      if (keterangan) fd.append('keterangan', keterangan);
      await api.post('/desa/bankeu-perubahan-lpj/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Swal.fire('Berhasil', `${selectedFiles.length} file LPJ terupload`, 'success');
      setSelectedFiles([]);
      setKeterangan('');
      setShowUpload(false);
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal upload LPJ', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus file LPJ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/desa/bankeu-perubahan-lpj/${id}`);
      Swal.fire('Berhasil', 'File LPJ dihapus', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal hapus', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <DesaPageHeader
          icon={LuClipboardCheck}
          eyebrow="Bantuan Keuangan"
          title={`LPJ Bankeu Perubahan TA ${tahun}`}
          description="Laporan pertanggungjawaban — unggah file PDF (maks 100 MB per file, maks 10 file per unggahan)."
          actions={
            <>
              <button
                onClick={fetchData}
                aria-label="Muat ulang"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <LuRefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <LuUpload className="h-4 w-4" /> Unggah LPJ
              </button>
            </>
          }
        />

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Memuat data...
          </div>
        ) : lpjList.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <LuInfo className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-900">Belum ada file LPJ</p>
            <p className="mt-1 text-sm text-slate-500">Klik tombol "Unggah LPJ" untuk menambah file.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lpjList.map(lpj => (
              <div key={lpj.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <LuFileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-slate-900">{lpj.nama_file}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[lpj.status] || 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                          {STATUS_LABELS[lpj.status] || lpj.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(lpj.created_at).toLocaleString('id-ID')}
                        </span>
                        {lpj.file_size && (
                          <span className="text-xs text-slate-500">
                            {(lpj.file_size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                      {lpj.keterangan && <p className="mt-1 text-xs text-slate-500">{lpj.keterangan}</p>}
                      {lpj.dpmd_catatan && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                          <strong>Catatan DPMD:</strong> {lpj.dpmd_catatan}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <a
                      href={`${imageBaseUrl}/storage/uploads/${lpj.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <LuEye className="w-3.5 h-3.5" /> Lihat
                    </a>
                    {lpj.status !== 'verified' && (
                      <button
                        onClick={() => handleDelete(lpj.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-200 hover:bg-rose-50"
                      >
                        <LuTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showUpload && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-base font-semibold text-slate-900">Unggah File LPJ</h3>
              </div>
              <form onSubmit={handleUpload} className="px-6 py-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">File LPJ (PDF) *</label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
                    className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <p className="mt-1 text-xs text-slate-500">{selectedFiles.length} file dipilih</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Keterangan</label>
                  <textarea
                    value={keterangan}
                    onChange={e => setKeterangan(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    placeholder="Keterangan singkat (opsional)"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowUpload(false); setSelectedFiles([]); setKeterangan(''); }}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >Batal</button>
                  <button
                    type="submit"
                    disabled={uploading || selectedFiles.length === 0}
                    className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >{uploading ? 'Mengunggah...' : 'Unggah'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesaBankeuPerubahanLpjPage;
