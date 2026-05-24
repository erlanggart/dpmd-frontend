import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import {
  LuUpload, LuEye, LuClock, LuCheck, LuX, LuRefreshCw,
  LuSend, LuTrash2, LuInfo, LuDownload, LuPencil, LuTriangleAlert, LuPlus, LuCoins
} from 'react-icons/lu';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;
const MAX_ANGGARAN = 1_500_000_000;

// Format rupiah display
const formatRupiah = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
};

const StatusBadge = ({ status, label }) => {
  const styles = {
    draft:    'bg-gray-100 text-gray-700 border-gray-300',
    pending:  'bg-amber-100 text-amber-700 border-amber-300',
    in_review:'bg-blue-100 text-blue-700 border-blue-300',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    verified: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    rejected: 'bg-red-100 text-red-700 border-red-300',
    revision: 'bg-orange-100 text-orange-700 border-orange-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${styles[status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
      {label || status}
    </span>
  );
};

const KATEGORI_LABELS = {
  wajib: 'Wajib',
  pilihan_infrastruktur: 'Pilihan Infrastruktur',
  pilihan_non_infrastruktur: 'Pilihan Non-Infrastruktur',
};
const KATEGORI_COLORS = {
  wajib: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700', badge: 'bg-red-100 text-red-700 border-red-300' },
  pilihan_infrastruktur: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700 border-orange-300' },
  pilihan_non_infrastruktur: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700 border-blue-300' },
};

const BankeuPerubahanProposalPage = ({ tahun }) => {
  const [proposals, setProposals] = useState([]);
  const [masterKegiatan, setMasterKegiatan] = useState({
    wajib: [],
    pilihan_infrastruktur: [],
    pilihan_non_infrastruktur: []
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);

  // Form state
  const [form, setForm] = useState({
    jenis_kegiatan: 'wajib',
    kegiatan_ids: [],
    judul_proposal: '',
    nama_kegiatan_spesifik: '',
    volume: '',
    lokasi: '',
    deskripsi: '',
    anggaran_usulan: '',
    file: null,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [proposalsRes, masterRes] = await Promise.all([
        api.get('/desa/bankeu-perubahan/proposals', { params: { tahun } }),
        api.get('/desa/bankeu-perubahan/master-kegiatan'),
      ]);
      setProposals(proposalsRes.data?.data || []);
      setMasterKegiatan(masterRes.data?.data || {
        wajib: [], pilihan_infrastruktur: [], pilihan_non_infrastruktur: []
      });
    } catch (err) {
      console.error('Error fetching bankeu perubahan:', err);
      Swal.fire('Gagal', 'Tidak dapat mengambil data proposal perubahan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tahun]);

  const resetForm = () => {
    setForm({
      jenis_kegiatan: 'wajib',
      kegiatan_ids: [],
      judul_proposal: '',
      nama_kegiatan_spesifik: '',
      volume: '',
      lokasi: '',
      deskripsi: '',
      anggaran_usulan: '',
      file: null,
    });
    setEditingProposal(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (proposal) => {
    setEditingProposal(proposal);
    setForm({
      jenis_kegiatan: proposal.jenis_kegiatan || 'wajib',
      kegiatan_ids: (proposal.kegiatan_list || []).map(k => k.id),
      judul_proposal: proposal.judul_proposal || '',
      nama_kegiatan_spesifik: proposal.nama_kegiatan_spesifik || '',
      volume: proposal.volume || '',
      lokasi: proposal.lokasi || '',
      deskripsi: proposal.deskripsi || '',
      anggaran_usulan: proposal.anggaran_usulan ? String(proposal.anggaran_usulan) : '',
      file: null,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const toggleKegiatan = (kegId) => {
    setForm(f => {
      const exists = f.kegiatan_ids.includes(kegId);
      return {
        ...f,
        kegiatan_ids: exists ? f.kegiatan_ids.filter(id => id !== kegId) : [...f.kegiatan_ids, kegId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.judul_proposal.trim()) {
      return Swal.fire('Validasi', 'Judul proposal wajib diisi', 'warning');
    }
    if (form.kegiatan_ids.length === 0) {
      return Swal.fire('Validasi', 'Pilih minimal 1 kegiatan', 'warning');
    }
    if (!editingProposal && !form.file) {
      return Swal.fire('Validasi', 'File proposal wajib diupload', 'warning');
    }
    const anggaranNum = parseInt(String(form.anggaran_usulan).replace(/\D/g, ''), 10);
    if (form.anggaran_usulan && anggaranNum > MAX_ANGGARAN) {
      return Swal.fire('Validasi', `Anggaran tidak boleh lebih dari Rp 1.500.000.000`, 'warning');
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('jenis_kegiatan', form.jenis_kegiatan);
      fd.append('kegiatan_ids', JSON.stringify(form.kegiatan_ids));
      fd.append('judul_proposal', form.judul_proposal);
      fd.append('nama_kegiatan_spesifik', form.nama_kegiatan_spesifik || '');
      fd.append('volume', form.volume || '');
      fd.append('lokasi', form.lokasi || '');
      fd.append('deskripsi', form.deskripsi || '');
      if (form.anggaran_usulan) fd.append('anggaran_usulan', String(anggaranNum));
      fd.append('tahun_anggaran', String(tahun));
      if (form.file) fd.append('file', form.file);

      if (editingProposal) {
        await api.put(`/desa/bankeu-perubahan/proposals/${editingProposal.id}/edit`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        Swal.fire('Berhasil', 'Proposal berhasil diedit', 'success');
      } else {
        await api.post('/desa/bankeu-perubahan/proposals', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        Swal.fire('Berhasil', 'Proposal berhasil diupload', 'success');
      }

      closeModal();
      fetchData();
    } catch (err) {
      console.error('Submit error:', err);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan proposal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus proposal?',
      text: 'Proposal yang dihapus tidak dapat dikembalikan',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/desa/bankeu-perubahan/proposals/${id}`);
      Swal.fire('Berhasil', 'Proposal dihapus', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus proposal', 'error');
    }
  };

  const handleSubmitToKecamatan = async () => {
    const draftProposals = proposals.filter(p => !p.submitted_to_kecamatan);
    if (draftProposals.length === 0) {
      return Swal.fire('Info', 'Tidak ada proposal yang perlu dikirim', 'info');
    }

    const result = await Swal.fire({
      title: `Kirim ${draftProposals.length} proposal ke Kecamatan?`,
      text: 'Setelah dikirim, proposal tidak dapat diedit penuh sampai dikembalikan untuk revisi',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      confirmButtonText: 'Ya, kirim',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await api.post('/desa/bankeu-perubahan/submit-to-kecamatan', {
        tahun: tahun,
        proposal_ids: draftProposals.map(p => p.id),
      });
      Swal.fire('Berhasil', res.data?.message || 'Proposal terkirim', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengirim proposal', 'error');
    }
  };

  const handleResubmit = async () => {
    const revisiProposals = proposals.filter(p =>
      ['revision', 'rejected'].includes(p.kecamatan_status) ||
      ['revision', 'rejected'].includes(p.dpmd_status)
    );
    if (revisiProposals.length === 0) {
      return Swal.fire('Info', 'Tidak ada proposal yang perlu dikirim ulang', 'info');
    }

    const result = await Swal.fire({
      title: `Kirim ulang ${revisiProposals.length} proposal?`,
      text: 'Proposal yang sudah direvisi akan dikirim kembali ke Kecamatan',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      confirmButtonText: 'Ya, kirim ulang',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await api.post('/desa/bankeu-perubahan/resubmit', {
        tahun: tahun,
        proposal_ids: revisiProposals.map(p => p.id),
      });
      Swal.fire('Berhasil', res.data?.message || 'Proposal terkirim ulang', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal kirim ulang', 'error');
    }
  };

  const counts = useMemo(() => ({
    total: proposals.length,
    draft: proposals.filter(p => !p.submitted_to_kecamatan).length,
    revision: proposals.filter(p =>
      ['revision','rejected'].includes(p.kecamatan_status) ||
      ['revision','rejected'].includes(p.dpmd_status)
    ).length,
    pending: proposals.filter(p => p.submitted_to_kecamatan && p.kecamatan_status === 'pending').length,
    approved_kec: proposals.filter(p => p.kecamatan_status === 'approved').length,
    dpmd_approved: proposals.filter(p => p.dpmd_status === 'approved').length,
  }), [proposals]);

  const currentKegiatanList = masterKegiatan[form.jenis_kegiatan] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <LuCoins className="w-7 h-7 text-orange-600" />
                Bankeu Perubahan TA {tahun}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Alur verifikasi: Desa → Kecamatan → DPMD
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
              >
                <LuPlus className="w-4 h-4" />
                Tambah Proposal
              </button>
              {counts.draft > 0 && (
                <button
                  onClick={handleSubmitToKecamatan}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                >
                  <LuSend className="w-4 h-4" />
                  Kirim {counts.draft} ke Kecamatan
                </button>
              )}
              {counts.revision > 0 && (
                <button
                  onClick={handleResubmit}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                >
                  <LuRefreshCw className="w-4 h-4" />
                  Kirim Ulang Revisi ({counts.revision})
                </button>
              )}
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                <LuRefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
            <StatCard label="Total" value={counts.total} color="bg-gray-50 text-gray-700" />
            <StatCard label="Draft" value={counts.draft} color="bg-amber-50 text-amber-700" />
            <StatCard label="Pending Kec" value={counts.pending} color="bg-blue-50 text-blue-700" />
            <StatCard label="Approved Kec" value={counts.approved_kec} color="bg-emerald-50 text-emerald-700" />
            <StatCard label="Approved DPMD" value={counts.dpmd_approved} color="bg-green-50 text-green-700" />
            <StatCard label="Revisi" value={counts.revision} color="bg-orange-50 text-orange-700" />
          </div>
        </div>

        {/* List proposals */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            Memuat data...
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <LuInfo className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">Belum ada proposal perubahan</p>
            <p className="text-sm text-gray-400 mt-1">Klik "Tambah Proposal" untuk membuat proposal baru</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map(p => (
              <ProposalCard
                key={p.id}
                proposal={p}
                onEdit={() => openEditModal(p)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Upload/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">
                {editingProposal ? `Edit Proposal #${editingProposal.id}` : 'Tambah Proposal Perubahan'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              {/* Kategori Kegiatan */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Kategori Kegiatan *</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {['wajib', 'pilihan_infrastruktur', 'pilihan_non_infrastruktur'].map(jk => {
                    const color = KATEGORI_COLORS[jk];
                    const isActive = form.jenis_kegiatan === jk;
                    return (
                      <button
                        key={jk}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, jenis_kegiatan: jk, kegiatan_ids: [] }))}
                        className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-colors text-left ${
                          isActive ? `${color.bg} ${color.border} ${color.text}` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-bold">{KATEGORI_LABELS[jk]}</div>
                        <div className="text-xs opacity-70 mt-0.5">
                          {jk === 'wajib' && '3 kegiatan WAJIB'}
                          {jk === 'pilihan_infrastruktur' && 'Kegiatan fisik/bangunan'}
                          {jk === 'pilihan_non_infrastruktur' && 'Program/pemberdayaan'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kegiatan (multi-select sesuai kategori) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Pilih Kegiatan * <span className="text-xs font-normal text-gray-400">(boleh lebih dari 1)</span>
                </label>
                <div className="border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
                  {currentKegiatanList.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">Tidak ada kegiatan di kategori ini</p>
                  ) : currentKegiatanList.map(k => (
                    <label key={k.id} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={form.kegiatan_ids.includes(k.id)}
                        onChange={() => toggleKegiatan(k.id)}
                        className="mt-1 text-orange-600 rounded"
                      />
                      <span className="flex-1 text-gray-700">
                        <span className="font-semibold text-orange-700">{k.urutan}.</span> {k.nama_kegiatan}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Judul */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Judul Proposal *</label>
                <input
                  type="text"
                  value={form.judul_proposal}
                  onChange={e => setForm({ ...form, judul_proposal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Contoh: Pembangunan Jalan Desa RT 02 RW 03"
                  maxLength={255}
                />
              </div>

              {/* Nama kegiatan spesifik */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Kegiatan Spesifik</label>
                  <input
                    type="text"
                    value={form.nama_kegiatan_spesifik}
                    onChange={e => setForm({ ...form, nama_kegiatan_spesifik: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Detail kegiatan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Volume</label>
                  <input
                    type="text"
                    value={form.volume}
                    onChange={e => setForm({ ...form, volume: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Contoh: 200m x 3m"
                  />
                </div>
              </div>

              {/* Lokasi & Anggaran */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={form.lokasi}
                    onChange={e => setForm({ ...form, lokasi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Lokasi kegiatan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Anggaran Usulan (Rp) <span className="text-xs font-normal text-gray-400">max 1,5 M</span>
                  </label>
                  <input
                    type="text"
                    value={formatRupiah(form.anggaran_usulan)}
                    onChange={e => setForm({ ...form, anggaran_usulan: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  value={form.deskripsi}
                  onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Deskripsi singkat proposal perubahan"
                />
              </div>

              {/* File */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  File Proposal (PDF) {editingProposal ? '(opsional - kosongkan untuk tidak ganti)' : '*'}
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={e => setForm({ ...form, file: e.target.files[0] || null })}
                  className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
                {editingProposal?.file_proposal && !form.file && (
                  <p className="text-xs text-gray-500 mt-1">File saat ini: {editingProposal.file_proposal}</p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
                <LuTriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  Pastikan data sudah benar sebelum dikirim ke Kecamatan. Setelah dikirim, proposal hanya dapat direvisi setelah dikembalikan oleh verifikator.
                </div>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 bg-gray-50">
              <button
                onClick={closeModal}
                type="button"
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : (editingProposal ? 'Simpan Perubahan' : 'Upload Proposal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }) => (
  <div className={`rounded-xl p-3 ${color}`}>
    <div className="text-xs font-semibold opacity-70">{label}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </div>
);

const ProposalCard = ({ proposal, onEdit, onDelete }) => {
  const submitted = proposal.submitted_to_kecamatan;
  const kecRevisi = ['revision', 'rejected'].includes(proposal.kecamatan_status);
  const dpmdRevisi = ['revision', 'rejected'].includes(proposal.dpmd_status);
  const canEdit = !submitted || kecRevisi || dpmdRevisi;
  const canDelete = !submitted;
  const kategoriColor = KATEGORI_COLORS[proposal.jenis_kegiatan] || KATEGORI_COLORS.wajib;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${kategoriColor.badge}`}>
              {KATEGORI_LABELS[proposal.jenis_kegiatan] || proposal.jenis_kegiatan}
            </span>
            {!submitted && <StatusBadge status="draft" label="Draft" />}
            {submitted && (
              <>
                <StatusBadge status={proposal.kecamatan_status} label={`Kec: ${proposal.kecamatan_status || 'pending'}`} />
                {proposal.submitted_to_dpmd && (
                  <StatusBadge status={proposal.dpmd_status} label={`DPMD: ${proposal.dpmd_status || 'pending'}`} />
                )}
              </>
            )}
          </div>
          <h3 className="font-bold text-gray-800 text-base md:text-lg">{proposal.judul_proposal}</h3>
          {proposal.nama_kegiatan_spesifik && (
            <p className="text-sm text-gray-600 mt-1">{proposal.nama_kegiatan_spesifik}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs text-gray-600">
            {proposal.volume && <div><span className="font-semibold">Vol:</span> {proposal.volume}</div>}
            {proposal.lokasi && <div><span className="font-semibold">Lokasi:</span> {proposal.lokasi}</div>}
            {proposal.anggaran_usulan && (
              <div className="col-span-2 md:col-span-2">
                <span className="font-semibold">Anggaran:</span> Rp {Number(proposal.anggaran_usulan).toLocaleString('id-ID')}
              </div>
            )}
          </div>
          {(proposal.kecamatan_catatan || proposal.dpmd_catatan) && (
            <div className="mt-3 space-y-1">
              {proposal.kecamatan_catatan && (
                <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-800">
                  <strong>Catatan Kecamatan:</strong> {proposal.kecamatan_catatan}
                </div>
              )}
              {proposal.dpmd_catatan && (
                <div className="text-xs bg-purple-50 border border-purple-200 rounded p-2 text-purple-800">
                  <strong>Catatan DPMD:</strong> {proposal.dpmd_catatan}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-row md:flex-col gap-2 flex-shrink-0">
          {proposal.file_proposal && (
            <a
              href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/${proposal.file_proposal}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
            >
              <LuEye className="w-3.5 h-3.5" /> Lihat
            </a>
          )}
          {canEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg"
            >
              <LuPencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg"
            >
              <LuTrash2 className="w-3.5 h-3.5" /> Hapus
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankeuPerubahanProposalPage;
