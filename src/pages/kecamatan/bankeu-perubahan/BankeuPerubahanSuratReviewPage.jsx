import React, { useEffect, useState } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import { LuEye, LuCheck, LuX, LuRefreshCw, LuMessageSquare, LuInfo, LuMail } from 'react-icons/lu';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const STATUS_LABELS = { pending: 'Pending', approved: 'Disetujui', rejected: 'Ditolak', revision: 'Revisi' };
const STATUS_STYLES = {
  pending:  'bg-amber-100 text-amber-700 border-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  revision: 'bg-orange-100 text-orange-700 border-orange-300',
};

const BankeuPerubahanSuratReviewPage = ({ tahun }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/kecamatan/bankeu-perubahan/surat', { params: { tahun } });
      setList(res.data?.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tahun]);

  const openReview = (item, status) => {
    setReviewModal({ item, status, catatan: '' });
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    const { item, status, catatan } = reviewModal;
    if ((status === 'rejected' || status === 'revision') && !catatan.trim()) {
      return Swal.fire('Validasi', 'Catatan wajib diisi untuk tolak/revisi', 'warning');
    }
    try {
      await api.patch(`/kecamatan/bankeu-perubahan/surat/${item.id}/review`, { status, catatan });
      Swal.fire('Berhasil', 'Review tersimpan', 'success');
      setReviewModal(null);
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal review', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <LuMail className="w-5 h-5 text-orange-600" />
              Review Surat Bankeu Perubahan TA {tahun}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Review surat pengantar & permohonan dari desa</p>
          </div>
          <button onClick={fetchData} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg">
            <LuRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <LuInfo className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">Belum ada surat yang dikirim oleh desa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLES[item.kecamatan_review_status] || 'bg-gray-100 border-gray-300'}`}>
                        {STATUS_LABELS[item.kecamatan_review_status] || 'Pending'}
                      </span>
                      <span className="text-xs text-gray-500">Tahun: {item.tahun}</span>
                    </div>
                    <h3 className="font-bold text-gray-800">Desa {item.desa_nama}</h3>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Dikirim: {item.submitted_at ? new Date(item.submitted_at).toLocaleString('id-ID') : '-'}
                    </div>
                    {item.kecamatan_review_catatan && (
                      <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 mt-2 text-blue-800">
                        <strong>Catatan Anda:</strong> {item.kecamatan_review_catatan}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Surat Pengantar</div>
                    {item.surat_pengantar ? (
                      <a
                        href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/surat/${item.surat_pengantar}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <LuEye className="w-3.5 h-3.5" /> Lihat file
                      </a>
                    ) : <span className="text-sm text-gray-400">-</span>}
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Surat Permohonan</div>
                    {item.surat_permohonan ? (
                      <a
                        href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/surat/${item.surat_permohonan}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <LuEye className="w-3.5 h-3.5" /> Lihat file
                      </a>
                    ) : <span className="text-sm text-gray-400">-</span>}
                  </div>
                </div>

                {item.kecamatan_review_status === 'pending' && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={() => openReview(item, 'approved')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                      <LuCheck className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => openReview(item, 'revision')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg">
                      <LuMessageSquare className="w-3.5 h-3.5" /> Revisi
                    </button>
                    <button onClick={() => openReview(item, 'rejected')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg">
                      <LuX className="w-3.5 h-3.5" /> Tolak
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {reviewModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">
                  {reviewModal.status === 'approved' ? 'Setujui' : reviewModal.status === 'revision' ? 'Minta Revisi' : 'Tolak'} Surat
                </h3>
                <p className="text-xs text-gray-500 mt-1">Desa {reviewModal.item.desa_nama}</p>
              </div>
              <div className="px-6 py-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Catatan {reviewModal.status !== 'approved' && '*'}</label>
                <textarea
                  value={reviewModal.catatan}
                  onChange={e => setReviewModal({ ...reviewModal, catatan: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder={reviewModal.status === 'approved' ? 'Catatan (opsional)' : 'Tulis catatan untuk desa...'}
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                <button onClick={() => setReviewModal(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100">Batal</button>
                <button
                  onClick={submitReview}
                  className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm ${
                    reviewModal.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    reviewModal.status === 'revision' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-red-600 hover:bg-red-700'
                  }`}
                >Simpan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankeuPerubahanSuratReviewPage;
