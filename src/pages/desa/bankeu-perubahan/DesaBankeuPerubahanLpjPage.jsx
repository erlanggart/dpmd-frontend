import React, { useEffect, useState } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import { LuUpload, LuEye, LuTrash2, LuRefreshCw, LuClipboardCheck, LuInfo, LuFileText } from 'react-icons/lu';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const STATUS_STYLES = {
  pending:  'bg-amber-100 text-amber-700 border-amber-300',
  verified: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  revision: 'bg-orange-100 text-orange-700 border-orange-300',
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <LuClipboardCheck className="w-6 h-6 text-orange-600" />
                LPJ Bankeu Perubahan TA {tahun}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Laporan Pertanggungjawaban — upload file PDF (max 100MB per file, max 10 file per upload)
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchData} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg">
                <LuRefreshCw className="w-4 h-4" />
              </button>
              <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl shadow-sm">
                <LuUpload className="w-4 h-4" /> Upload LPJ
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            Memuat data...
          </div>
        ) : lpjList.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <LuInfo className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">Belum ada file LPJ</p>
            <p className="text-sm text-gray-400 mt-1">Klik tombol "Upload LPJ" untuk menambah file</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lpjList.map(lpj => (
              <div key={lpj.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <LuFileText className="w-8 h-8 text-orange-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">{lpj.nama_file}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLES[lpj.status] || 'bg-gray-100 border-gray-300'}`}>
                          {STATUS_LABELS[lpj.status] || lpj.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(lpj.created_at).toLocaleString('id-ID')}
                        </span>
                        {lpj.file_size && (
                          <span className="text-xs text-gray-500">
                            {(lpj.file_size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                      {lpj.keterangan && <p className="text-xs text-gray-600 mt-1">{lpj.keterangan}</p>}
                      {lpj.dpmd_catatan && (
                        <div className="text-xs bg-purple-50 border border-purple-200 rounded p-1.5 mt-2 text-purple-800">
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
                    >
                      <LuEye className="w-3.5 h-3.5" /> Lihat
                    </a>
                    {lpj.status !== 'verified' && (
                      <button
                        onClick={() => handleDelete(lpj.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg"
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">Upload File LPJ</h3>
              </div>
              <form onSubmit={handleUpload} className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">File LPJ (PDF) *</label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
                    className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">{selectedFiles.length} file dipilih</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Keterangan</label>
                  <textarea
                    value={keterangan}
                    onChange={e => setKeterangan(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Keterangan singkat (opsional)"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowUpload(false); setSelectedFiles([]); setKeterangan(''); }}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
                  >Batal</button>
                  <button
                    type="submit"
                    disabled={uploading || selectedFiles.length === 0}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50"
                  >{uploading ? 'Mengupload...' : 'Upload'}</button>
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
