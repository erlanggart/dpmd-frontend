import React, { useCallback, useEffect, useState, useMemo } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import {
  LuUpload, LuEye, LuCheck, LuX, LuRefreshCw, LuChevronDown, LuChevronRight,
  LuSend, LuTrash2, LuInfo, LuPencil, LuTriangleAlert, LuPlus, LuCoins, LuFileText,
  LuPackage, LuMapPin, LuDollarSign, LuHistory, LuPencilLine
} from 'react-icons/lu';
import BankeuRevisionHistoryModal from '../../../components/shared/BankeuRevisionHistoryModal';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;
const MAX_ANGGARAN = 1_500_000_000;

// Parse nilai anggaran ke integer rupiah dengan AMAN terhadap nilai desimal.
// Penting: kolom DB bertipe DECIMAL dikembalikan sebagai string "1111111.00".
// Memakai replace(/\D/g,'') akan membuang titik tapi menyisakan "00" → nilai ×100.
// Karena itu kita pakai Number() dulu (yang benar membaca desimal), baru fallback strip digit.
const parseAnggaran = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  let num = Number(val);
  if (!Number.isFinite(num)) num = parseInt(String(val).replace(/\D/g, ''), 10);
  return Number.isFinite(num) ? Math.round(num) : 0;
};

const formatRupiah = (val) => {
  if (val === null || val === undefined || val === '') return '';
  let num = Number(val);
  if (!Number.isFinite(num)) num = parseInt(String(val).replace(/\D/g, ''), 10);
  if (!Number.isFinite(num)) return '';
  return Math.round(num).toLocaleString('id-ID');
};

// Tema hitam-navy + aksen merah bata (brand). Bidang padat selalu slate-900;
// kategori dibedakan lewat kekuatan aksen brand-nya, bukan warna-warni.
// Aksen status (approved/revisi/ditolak) tetap berwarna sesuai maknanya.
const KATEGORI_META = {
  wajib: {
    label: 'Wajib',
    sublabel: 'Kegiatan WAJIB',
    iconBg: 'bg-slate-900',
    accent: 'text-brand-600',
    headerBg: 'bg-slate-50',
    headerHover: 'hover:bg-slate-100',
    badge: 'bg-slate-900 text-white border-slate-900',
    btnBg: 'bg-slate-900 hover:bg-slate-800',
    boxBg: 'bg-slate-50',
    boxBorder: 'border-slate-200',
  },
  pilihan_infrastruktur: {
    label: 'Pilihan Infrastruktur',
    sublabel: 'Kegiatan fisik/bangunan',
    iconBg: 'bg-slate-900',
    accent: 'text-brand-600',
    headerBg: 'bg-slate-50',
    headerHover: 'hover:bg-slate-100',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    btnBg: 'bg-slate-900 hover:bg-slate-800',
    boxBg: 'bg-slate-50',
    boxBorder: 'border-slate-200',
  },
  pilihan_non_infrastruktur: {
    label: 'Pilihan Non-Infrastruktur',
    sublabel: 'Program/pemberdayaan',
    iconBg: 'bg-slate-900',
    accent: 'text-brand-600',
    headerBg: 'bg-slate-50',
    headerHover: 'hover:bg-slate-100',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    btnBg: 'bg-slate-900 hover:bg-slate-800',
    boxBg: 'bg-slate-50',
    boxBorder: 'border-slate-200',
  },
};
const KATEGORI_KEYS = Object.keys(KATEGORI_META);

const StatusBadge = ({ status, label }) => {
  const styles = {
    draft:    'bg-slate-100 text-slate-700 border-slate-300',
    pending:  'bg-amber-100 text-amber-700 border-amber-300',
    in_review:'bg-slate-200 text-slate-800 border-slate-400',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    verified: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    rejected: 'bg-rose-100 text-rose-700 border-rose-300',
    revision: 'bg-amber-100 text-amber-700 border-amber-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${styles[status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
      {label || status}
    </span>
  );
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

  // Per-kategori UI state
  const [expandedSection, setExpandedSection] = useState({
    wajib: true, pilihan_infrastruktur: true, pilihan_non_infrastruktur: true
  });
  const [showAddForm, setShowAddForm] = useState({
    wajib: false, pilihan_infrastruktur: false, pilihan_non_infrastruktur: false
  });
  const [dropdownOpen, setDropdownOpen] = useState({
    wajib: false, pilihan_infrastruktur: false, pilihan_non_infrastruktur: false
  });
  const [selectedKegiatanId, setSelectedKegiatanId] = useState({
    wajib: '', pilihan_infrastruktur: '', pilihan_non_infrastruktur: ''
  });
  const [addForm, setAddForm] = useState({
    wajib: emptyForm(),
    pilihan_infrastruktur: emptyForm(),
    pilihan_non_infrastruktur: emptyForm(),
  });
  const [expandedProposalId, setExpandedProposalId] = useState(null);

  // Edit modal state
  const [editingProposal, setEditingProposal] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm());

  function emptyForm() {
    return {
      judul_proposal: '',
      nama_kegiatan_spesifik: '',
      volume: '',
      lokasi: '',
      deskripsi: '',
      anggaran_usulan: '',
      file: null,
    };
  }

  const fetchData = useCallback(async () => {
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
  }, [tahun]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      KATEGORI_KEYS.forEach(k => {
        if (dropdownOpen[k] && !e.target.closest(`.dropdown-${k}`)) {
          setDropdownOpen(d => ({ ...d, [k]: false }));
        }
      });
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Group proposals by kategori
  const proposalsByKategori = useMemo(() => {
    const groups = { wajib: [], pilihan_infrastruktur: [], pilihan_non_infrastruktur: [] };
    proposals.forEach(p => {
      if (groups[p.jenis_kegiatan]) groups[p.jenis_kegiatan].push(p);
    });
    return groups;
  }, [proposals]);

  // Berapa banyak proposal yang sudah memakai tiap kegiatan (per kategori).
  // Kegiatan TIDAK lagi "habis" setelah dipakai — satu jenis kegiatan boleh
  // diajukan beberapa kali (mis. Jalan Desa di titik lokasi berbeda). Hitungan
  // ini hanya dipakai sebagai penanda informatif di dropdown.
  const kegiatanUsageCount = useMemo(() => {
    const count = { wajib: {}, pilihan_infrastruktur: {}, pilihan_non_infrastruktur: {} };
    proposals.forEach(p => {
      const kat = p.jenis_kegiatan;
      if (!count[kat]) return;
      const ids = new Set();
      (p.kegiatan_list || []).forEach(k => ids.add(k.id));
      if (p.kegiatan_id) ids.add(p.kegiatan_id);
      ids.forEach(id => { count[kat][id] = (count[kat][id] || 0) + 1; });
    });
    return count;
  }, [proposals]);

  // Semua kegiatan master SELALU tersedia untuk dipilih (tidak difilter habis).
  const availableKegiatan = useMemo(() => {
    const out = {};
    KATEGORI_KEYS.forEach(k => { out[k] = masterKegiatan[k] || []; });
    return out;
  }, [masterKegiatan]);

  // Total anggaran (semua proposal)
  const getTotalExistingAnggaran = (excludeProposalId = null) => {
    return proposals.reduce((total, p) => {
      if (excludeProposalId && p.id === excludeProposalId) return total;
      return total + parseAnggaran(p.anggaran_usulan);
    }, 0);
  };
  const isAnggaranOverLimit = (value, excludeProposalId = null) => {
    if (!value) return false;
    const newVal = parseAnggaran(value);
    return (getTotalExistingAnggaran(excludeProposalId) + newVal) > MAX_ANGGARAN;
  };
  const getRemainingAnggaran = (excludeProposalId = null) => MAX_ANGGARAN - getTotalExistingAnggaran(excludeProposalId);

  const isRevision = (p) =>
    ['revision','rejected'].includes(p.status) ||
    ['revision','rejected'].includes(p.kecamatan_status) ||
    ['revision','rejected'].includes(p.dpmd_status);
  // Sudah upload ulang PDF setelah ronde revisi terakhir? (siap dikirim ulang)
  const hasReupload = (p) => Number(p.reupload_after_revision_count || 0) > 0;

  const counts = useMemo(() => ({
    total: proposals.length,
    // draft = belum dikirim DAN bukan proposal yang sedang direvisi
    draft: proposals.filter(p => !p.submitted_to_kecamatan && !isRevision(p)).length,
    revision: proposals.filter(isRevision).length,
    // hanya yang sudah upload ulang yang boleh dikirim ulang
    revisionReady: proposals.filter(p => isRevision(p) && hasReupload(p)).length,
    pending: proposals.filter(p => p.submitted_to_kecamatan && p.kecamatan_status === 'pending').length,
    approved_kec: proposals.filter(p => p.kecamatan_status === 'approved').length,
    dpmd_approved: proposals.filter(p => p.dpmd_status === 'approved').length,
  }), [proposals]);

  const revisionSummary = useMemo(() => {
    const items = proposals.filter(isRevision);
    return {
      items,
      kecamatan: items.filter(p => ['revision', 'rejected'].includes(p.kecamatan_status)).length,
      dpmd: items.filter(p => ['revision', 'rejected'].includes(p.dpmd_status)).length,
      sistem: items.filter(p =>
        ['revision', 'rejected'].includes(p.status) &&
        !['revision', 'rejected'].includes(p.kecamatan_status) &&
        !['revision', 'rejected'].includes(p.dpmd_status)
      ).length,
    };
  }, [proposals]);

  useEffect(() => {
    if (!expandedProposalId && revisionSummary.items.length > 0) {
      setExpandedProposalId(revisionSummary.items[0].id);
    }
  }, [expandedProposalId, revisionSummary.items]);

  const updateAddForm = (kat, field, value) => {
    setAddForm(f => ({ ...f, [kat]: { ...f[kat], [field]: value } }));
  };

  const resetAddState = (kat) => {
    setShowAddForm(s => ({ ...s, [kat]: false }));
    setSelectedKegiatanId(s => ({ ...s, [kat]: '' }));
    setDropdownOpen(d => ({ ...d, [kat]: false }));
    setAddForm(f => ({ ...f, [kat]: emptyForm() }));
  };

  const handleCreate = async (kat) => {
    const kegId = selectedKegiatanId[kat];
    const form = addForm[kat];

    if (!kegId) {
      return Swal.fire('Validasi', 'Pilih kegiatan terlebih dahulu', 'warning');
    }
    if (!form.judul_proposal.trim()) {
      return Swal.fire('Validasi', 'Judul proposal wajib diisi', 'warning');
    }
    if (!form.file) {
      return Swal.fire('Validasi', 'File proposal (PDF) wajib diupload', 'warning');
    }
    if (form.file.type !== 'application/pdf') {
      return Swal.fire('Validasi', 'File harus berformat PDF', 'warning');
    }
    if (form.file.size > 10 * 1024 * 1024) {
      return Swal.fire('Validasi', 'Ukuran file maksimal 10MB', 'warning');
    }
    const anggaranNum = parseAnggaran(form.anggaran_usulan);
    if (form.anggaran_usulan && isAnggaranOverLimit(form.anggaran_usulan)) {
      const sisa = getRemainingAnggaran();
      return Swal.fire({
        icon: 'error',
        title: 'Total Anggaran Melebihi Batas',
        html: `Total anggaran seluruh proposal tidak boleh lebih dari <b>Rp 1.500.000.000</b> (1,5 Miliar).<br/>Sisa anggaran tersedia: <b>Rp ${formatRupiah(sisa)}</b>`,
      });
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('jenis_kegiatan', kat);
      fd.append('kegiatan_ids', JSON.stringify([parseInt(kegId, 10)]));
      fd.append('judul_proposal', form.judul_proposal);
      fd.append('nama_kegiatan_spesifik', form.nama_kegiatan_spesifik || '');
      fd.append('volume', form.volume || '');
      fd.append('lokasi', form.lokasi || '');
      fd.append('deskripsi', form.deskripsi || '');
      if (form.anggaran_usulan) fd.append('anggaran_usulan', String(anggaranNum));
      fd.append('tahun_anggaran', String(tahun));
      fd.append('file', form.file);

      await api.post('/desa/bankeu-perubahan/proposals', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Swal.fire('Berhasil', 'Proposal berhasil diupload', 'success');
      resetAddState(kat);
      fetchData();
    } catch (err) {
      console.error('Submit error:', err);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan proposal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (proposal) => {
    setEditingProposal(proposal);
    setEditForm({
      judul_proposal: proposal.kegiatan_list?.[0]?.nama_kegiatan || proposal.judul_proposal || '',
      nama_kegiatan_spesifik: proposal.nama_kegiatan_spesifik || '',
      volume: proposal.volume || '',
      lokasi: proposal.lokasi || '',
      deskripsi: proposal.deskripsi || '',
      anggaran_usulan: proposal.anggaran_usulan ? String(parseAnggaran(proposal.anggaran_usulan)) : '',
      file: null,
    });
  };

  const closeEditModal = () => {
    setEditingProposal(null);
    setEditForm(emptyForm());
  };

  const handleEdit = async () => {
    if (!editingProposal) return;
    if (!editForm.judul_proposal.trim()) {
      return Swal.fire('Validasi', 'Judul proposal wajib diisi', 'warning');
    }
    const anggaranNum = parseAnggaran(editForm.anggaran_usulan);
    if (editForm.anggaran_usulan && isAnggaranOverLimit(editForm.anggaran_usulan, editingProposal.id)) {
      const sisa = getRemainingAnggaran(editingProposal.id);
      return Swal.fire({
        icon: 'error',
        title: 'Total Anggaran Melebihi Batas',
        html: `Total anggaran seluruh proposal tidak boleh lebih dari <b>Rp 1.500.000.000</b> (1,5 Miliar).<br/>Sisa anggaran tersedia: <b>Rp ${formatRupiah(sisa)}</b>`,
      });
    }

    // Proposal yang sedang direvisi (sudah pernah dikirim & dikembalikan) HARUS
    // lewat endpoint update revisi (PATCH /proposals/:id) — endpoint edit penuh
    // (PUT /edit) memblokir apa pun yang `submitted_to_kecamatan = TRUE`. Inilah
    // sebab desa tak bisa upload ulang PDF setelah dikirim/saat revisi.
    const editingInRevision = isRevision(editingProposal);
    const stillNeedsReupload = editingInRevision && !hasReupload(editingProposal);

    // Validasi file (berlaku kedua mode bila ada file dipilih).
    if (editForm.file) {
      if (editForm.file.type !== 'application/pdf') {
        return Swal.fire('Validasi', 'File harus berformat PDF', 'warning');
      }
      if (editForm.file.size > 10 * 1024 * 1024) {
        return Swal.fire('Validasi', 'Ukuran file maksimal 10MB', 'warning');
      }
    }
    // Saat revisi & belum upload ulang sama sekali, PDF perbaikan wajib agar
    // tercatat versi revisi baru (syarat tombol "Kirim Ulang Revisi" aktif).
    if (stillNeedsReupload && !editForm.file) {
      return Swal.fire('Upload PDF revisi', 'Silakan upload ulang PDF proposal hasil perbaikan sebelum menyimpan.', 'warning');
    }

    setSubmitting(true);
    try {
      const fd = new FormData();

      if (editingInRevision) {
        // PATCH /proposals/:id — update parsial + ganti file untuk proposal revisi.
        // Kegiatan/judul tidak berubah saat revisi (judul read-only di form).
        fd.append('nama_kegiatan_spesifik', editForm.nama_kegiatan_spesifik || '');
        fd.append('volume', editForm.volume || '');
        fd.append('lokasi', editForm.lokasi || '');
        fd.append('deskripsi', editForm.deskripsi || '');
        if (editForm.anggaran_usulan) fd.append('anggaran_usulan', String(anggaranNum));
        if (editForm.file) fd.append('file', editForm.file);

        await api.patch(`/desa/bankeu-perubahan/proposals/${editingProposal.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        Swal.fire('Berhasil', 'Revisi proposal tersimpan. Gunakan tombol "Kirim Ulang Revisi" untuk mengirim kembali ke Kecamatan.', 'success');
      } else {
        // PUT /proposals/:id/edit — edit penuh (hanya boleh sebelum dikirim).
        fd.append('jenis_kegiatan', editingProposal.jenis_kegiatan);
        const kegIds = (editingProposal.kegiatan_list || []).map(k => k.id);
        fd.append('kegiatan_ids', JSON.stringify(kegIds.length ? kegIds : [editingProposal.kegiatan_id].filter(Boolean)));
        fd.append('judul_proposal', editForm.judul_proposal);
        fd.append('nama_kegiatan_spesifik', editForm.nama_kegiatan_spesifik || '');
        fd.append('volume', editForm.volume || '');
        fd.append('lokasi', editForm.lokasi || '');
        fd.append('deskripsi', editForm.deskripsi || '');
        if (editForm.anggaran_usulan) fd.append('anggaran_usulan', String(anggaranNum));
        fd.append('tahun_anggaran', String(tahun));
        if (editForm.file) fd.append('file', editForm.file);

        await api.put(`/desa/bankeu-perubahan/proposals/${editingProposal.id}/edit`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        Swal.fire('Berhasil', 'Proposal berhasil diedit', 'success');
      }

      closeEditModal();
      fetchData();
    } catch (err) {
      console.error('Edit error:', err);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengedit proposal', 'error');
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
    // Hanya draft baru — proposal yang sedang direvisi WAJIB lewat "Kirim Ulang
    // Revisi" (yang mengharuskan upload ulang PDF), bukan jalur ini.
    const draftProposals = proposals.filter(p => !p.submitted_to_kecamatan && !isRevision(p));
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
        tahun, proposal_ids: draftProposals.map(p => p.id),
      });
      Swal.fire('Berhasil', res.data?.message || 'Proposal terkirim', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengirim proposal', 'error');
    }
  };

  const handleResubmit = async () => {
    const revisiProposals = proposals.filter(p => isRevision(p));
    if (revisiProposals.length === 0) {
      return Swal.fire('Info', 'Tidak ada proposal yang perlu dikirim ulang', 'info');
    }
    // Hanya proposal yang sudah diupload ulang PDF-nya yang boleh dikirim ulang
    const readyProposals = revisiProposals.filter(p => hasReupload(p));
    if (readyProposals.length === 0) {
      return Swal.fire(
        'Upload ulang dulu',
        'Perbaiki & upload ulang PDF proposal yang direvisi (tombol Edit pada proposal) sebelum mengirim ulang ke Kecamatan.',
        'warning'
      );
    }
    const skipped = revisiProposals.length - readyProposals.length;
    const result = await Swal.fire({
      title: `Kirim ulang ${readyProposals.length} proposal?`,
      text: skipped > 0
        ? `${skipped} proposal lain belum diupload ulang PDF-nya dan tidak ikut dikirim.`
        : 'Proposal yang sudah diperbaiki akan dikirim kembali ke Kecamatan',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      confirmButtonText: 'Ya, kirim ulang',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.post('/desa/bankeu-perubahan/resubmit', {
        tahun, proposal_ids: readyProposals.map(p => p.id),
      });
      Swal.fire('Berhasil', res.data?.message || 'Proposal terkirim ulang', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal kirim ulang', 'error');
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900">
                <LuCoins className="h-5 w-5 text-white" />
                <span className="absolute -bottom-0.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-brand-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Bantuan Keuangan
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  Bankeu Perubahan TA {tahun}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Alur verifikasi: Desa → Kecamatan → DPMD &nbsp;·&nbsp; 1 kegiatan boleh lebih dari 1 proposal (lokasi berbeda)
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              {counts.draft > 0 && (
                <button
                  onClick={handleSubmitToKecamatan}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <LuSend className="w-4 h-4" />
                  Kirim {counts.draft} ke Kecamatan
                </button>
              )}
              {counts.revision > 0 && (
                <button
                  onClick={handleResubmit}
                  disabled={counts.revisionReady === 0}
                  title={counts.revisionReady === 0
                    ? 'Upload ulang (perbaiki) PDF proposal yang direvisi terlebih dahulu'
                    : 'Kirim ulang proposal yang sudah diperbaiki'}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-600"
                >
                  <LuRefreshCw className="w-4 h-4" />
                  Kirim Ulang Revisi ({counts.revisionReady}/{counts.revision})
                </button>
              )}
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <LuRefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
            <StatCard label="Total" value={counts.total} color="bg-slate-100 text-slate-800" />
            <StatCard label="Draft" value={counts.draft} color="bg-slate-50 text-slate-700" />
            <StatCard label="Pending Kec" value={counts.pending} color="bg-slate-50 text-slate-700" />
            <StatCard label="Approved Kec" value={counts.approved_kec} color="bg-emerald-50 text-emerald-700" />
            <StatCard label="Approved DPMD" value={counts.dpmd_approved} color="bg-emerald-50 text-emerald-700" />
            <StatCard label="Revisi" value={counts.revision} color="bg-brand-50 text-brand-700" />
          </div>

          {counts.revision > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
                  <LuTriangleAlert className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-orange-950">
                    {counts.revision} proposal dikembalikan untuk diperbaiki
                  </h3>
                  <p className="mt-1 text-sm text-amber-800">
                    Buka proposal yang ditandai, baca catatan pemeriksa, upload ulang PDF, lalu gunakan tombol
                    <strong> Kirim Ulang Revisi</strong>.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                    {revisionSummary.kecamatan > 0 && <span className="rounded-full bg-white px-2.5 py-1 text-amber-800">Kecamatan: {revisionSummary.kecamatan}</span>}
                    {revisionSummary.dpmd > 0 && <span className="rounded-full bg-white px-2.5 py-1 text-slate-800">DPMD: {revisionSummary.dpmd}</span>}
                    {revisionSummary.sistem > 0 && <span className="rounded-full bg-white px-2.5 py-1 text-rose-800">Dikembalikan DPMD: {revisionSummary.sistem}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Total anggaran usulan seluruh proposal desa */}
          <div className="mt-3 rounded-xl bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2 text-white/90">
              <LuDollarSign className="w-5 h-5" />
              <span className="text-sm font-semibold">Total Anggaran Usulan</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-bold text-white">Rp {formatRupiah(getTotalExistingAnggaran())}</span>
              <span className="text-xs text-white/80">/ Rp {formatRupiah(MAX_ANGGARAN)} · sisa Rp {formatRupiah(getRemainingAnggaran())}</span>
            </div>
          </div>
        </div>

        {/* Sections per kategori */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            Memuat data...
          </div>
        ) : (
          KATEGORI_KEYS.map(kat => {
            const meta = KATEGORI_META[kat];
            const sectionProposals = proposalsByKategori[kat];
            const totalMaster = (masterKegiatan[kat] || []).length;
            const availableList = availableKegiatan[kat];
            const isExpanded = expandedSection[kat];
            const isFormOpen = showAddForm[kat];
            const isDropdownOpen = dropdownOpen[kat];

            return (
              <div
                key={kat}
                className={`bg-white rounded-xl border border-slate-200 ${
                  isDropdownOpen ? 'relative z-30 overflow-visible' : 'overflow-hidden'
                }`}
              >
                {/* Section Header */}
                <button
                  onClick={() => setExpandedSection(s => ({ ...s, [kat]: !s[kat] }))}
                  className={`w-full px-6 py-5 flex items-center justify-between ${meta.headerBg} ${meta.headerHover} transition-colors group`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${meta.iconBg} rounded-xl flex items-center justify-center transition-transform group-hover:scale-105`}>
                      {isExpanded ? <LuChevronDown className="w-5 h-5 text-white" /> : <LuChevronRight className="w-5 h-5 text-white" />}
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-slate-900">{meta.label}</h3>
                      <p className="text-sm text-slate-600">
                        {sectionProposals.length} dari {totalMaster} program · {meta.sublabel}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-white rounded-xl shadow-md border border-slate-100">
                    <span className={`text-2xl font-semibold tracking-tight ${meta.accent}`}>
                      {sectionProposals.length}/{totalMaster}
                    </span>
                  </div>
                </button>

                {/* Section Body */}
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? `max-h-[10000px] opacity-100 ${isDropdownOpen ? 'overflow-visible' : ''}`
                      : 'max-h-0 opacity-0 overflow-hidden'
                  }`}
                >
                  {/* Existing proposals list */}
                  {sectionProposals.length > 0 && (
                    <div className="p-4 bg-slate-50 space-y-2 border-b border-slate-200">
                      {sectionProposals.map(p => (
                        <ProposalCard
                          key={p.id}
                          proposal={p}
                          expanded={expandedProposalId === p.id}
                          onToggleExpand={() => setExpandedProposalId(expandedProposalId === p.id ? null : p.id)}
                          onEdit={() => openEditModal(p)}
                          onDelete={() => handleDelete(p.id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Add Proposal Button + Inline Form */}
                  <div className="p-6">
                    {availableList.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-sm text-slate-600">
                        <LuInfo className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          Belum ada master kegiatan di kategori <strong>{meta.label}</strong>. Hubungi DPMD untuk konfigurasi.
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            if (isFormOpen) {
                              resetAddState(kat);
                            } else {
                              setShowAddForm(s => ({ ...s, [kat]: true }));
                            }
                          }}
                          className={`w-full px-6 py-4 ${meta.btnBg} text-white rounded-xl flex items-center justify-center gap-3 font-semibold text-base transition-colors`}
                        >
                          {isFormOpen ? <LuX className="w-6 h-6" /> : <LuPlus className="w-6 h-6" />}
                          {isFormOpen ? 'Tutup Form' : `Tambah Proposal ${meta.label} Baru`}
                        </button>

                        {isFormOpen && (
                          <div className={`mt-4 p-4 sm:p-6 bg-white rounded-xl border ${meta.boxBorder}`}>
                            <div className="space-y-5">
                              {/* Step 1: Pilih Kegiatan */}
                              <div className={`dropdown-${kat} relative ${isDropdownOpen ? 'mb-80 sm:mb-96' : ''}`}>
                                <label className="flex items-center gap-3 text-base sm:text-lg font-bold text-slate-900 mb-3">
                                  <div className={`flex items-center justify-center w-8 h-8 ${meta.iconBg} text-white rounded-full`}>
                                    <span className="text-sm font-bold">1</span>
                                  </div>
                                  <span>Pilih Kegiatan</span>
                                </label>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setDropdownOpen(d => ({ ...d, [kat]: !d[kat] }))}
                                    className={`w-full pl-5 pr-12 py-4 ${meta.boxBg} border ${meta.boxBorder} rounded-xl text-base font-semibold text-left focus:outline-none focus:border-slate-900 hover:border-slate-300 transition-colors`}
                                  >
                                    <span className={selectedKegiatanId[kat] ? 'text-slate-800' : 'text-slate-500'}>
                                      {selectedKegiatanId[kat]
                                        ? (() => {
                                            const sel = (masterKegiatan[kat] || []).find(k => k.id.toString() === selectedKegiatanId[kat]);
                                            const name = sel?.nama_kegiatan || '';
                                            return name.length > 100 ? name.substring(0, 100) + '...' : name;
                                          })()
                                        : '-- Pilih Salah Satu Kegiatan --'
                                      }
                                    </span>
                                  </button>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <LuChevronDown className={`w-6 h-6 text-slate-600 transition-transform duration-200 ${dropdownOpen[kat] ? 'rotate-180' : ''}`} />
                                  </div>

                                  {isDropdownOpen && (
                                    <div className={`absolute left-0 right-0 top-full mt-2 z-50 bg-white border ${meta.boxBorder} rounded-xl shadow-2xl overflow-hidden`}>
                                      <div className="max-h-72 overflow-y-auto">
                                        {availableList.map((item, idx) => {
                                          const usedCount = kegiatanUsageCount[kat]?.[item.id] || 0;
                                          return (
                                          <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedKegiatanId(s => ({ ...s, [kat]: item.id.toString() }));
                                              setDropdownOpen(d => ({ ...d, [kat]: false }));
                                              // Judul proposal baku = nama kegiatan yang dipilih
                                              setAddForm(f => ({
                                                ...f,
                                                [kat]: { ...f[kat], judul_proposal: item.nama_kegiatan }
                                              }));
                                            }}
                                            className={`w-full px-5 py-3 text-left text-sm sm:text-base font-medium transition-colors leading-relaxed ${
                                              selectedKegiatanId[kat] === item.id.toString()
                                                ? 'bg-slate-100 text-slate-900 font-semibold'
                                                : 'text-slate-800 hover:bg-slate-50'
                                            } ${idx !== availableList.length - 1 ? 'border-b border-slate-200' : ''}`}
                                          >
                                            <span className="block">
                                              {item.urutan ? <strong className="mr-1">{item.urutan}.</strong> : null}
                                              {item.nama_kegiatan}
                                              {usedCount > 0 && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 align-middle">
                                                  sudah ada {usedCount} proposal
                                                </span>
                                              )}
                                            </span>
                                          </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Step 2: Isi Detail */}
                              {selectedKegiatanId[kat] && (
                                <div className="pt-4 border-t-2 border-slate-100 space-y-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center justify-center w-8 h-8 bg-slate-900 text-white rounded-full shadow-md">
                                      <span className="text-sm font-bold">2</span>
                                    </div>
                                    <h4 className="text-base sm:text-lg font-bold text-slate-900">Isi Detail Proposal</h4>
                                  </div>

                                  <FormFields
                                    form={addForm[kat]}
                                    onChange={(field, value) => updateAddForm(kat, field, value)}
                                    isAnggaranOverLimit={isAnggaranOverLimit}
                                  />

                                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button
                                      onClick={() => resetAddState(kat)}
                                      type="button"
                                      className="px-4 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50"
                                    >
                                      Batal
                                    </button>
                                    <button
                                      onClick={() => handleCreate(kat)}
                                      disabled={submitting}
                                      className={`flex-1 px-6 py-3 ${meta.btnBg} text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                                    >
                                      <LuUpload className="w-5 h-5" />
                                      {submitting ? 'Mengupload...' : 'Upload Proposal'}
                                    </button>
                                  </div>

                                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
                                    <LuTriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div>
                                      Pastikan data sudah benar sebelum dikirim. Setelah dikirim ke Kecamatan, proposal hanya dapat direvisi setelah dikembalikan oleh verifikator.
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {!loading && proposals.length === 0 && KATEGORI_KEYS.every(k => (masterKegiatan[k] || []).length === 0) && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <LuInfo className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">Belum ada master kegiatan</p>
            <p className="text-sm text-slate-400 mt-1">Hubungi DPMD untuk konfigurasi master kegiatan bankeu perubahan</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProposal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                {isRevision(editingProposal) ? 'Upload Ulang PDF Revisi' : 'Edit'} Proposal #{editingProposal.id}
              </h3>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-600">
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold border rounded ${KATEGORI_META[editingProposal.jenis_kegiatan]?.badge}`}>
                  {KATEGORI_META[editingProposal.jenis_kegiatan]?.label}
                </span>
                {editingProposal.kegiatan_list?.[0] && (
                  <span className="ml-2">· {editingProposal.kegiatan_list[0].nama_kegiatan}</span>
                )}
              </div>

              {isRevision(editingProposal) && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <LuTriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    Proposal ini dikembalikan untuk revisi.{' '}
                    {hasReupload(editingProposal)
                      ? 'Anda boleh memperbarui data/PDF lagi. '
                      : 'Silakan upload ulang PDF hasil perbaikan. '}
                    Setelah disimpan, kirim kembali lewat tombol <strong>Kirim Ulang Revisi</strong>.
                  </div>
                </div>
              )}

              <FormFields
                form={editForm}
                onChange={(field, value) => setEditForm(f => ({ ...f, [field]: value }))}
                isAnggaranOverLimit={(v) => isAnggaranOverLimit(v, editingProposal.id)}
                isEdit
                currentFile={editingProposal.file_proposal}
                requireFile={isRevision(editingProposal) && !hasReupload(editingProposal)}
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={closeEditModal}
                type="button"
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleEdit}
                disabled={submitting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const StatCard = ({ label, value, color }) => (
  <div className={`rounded-xl p-3 ${color}`}>
    <div className="text-xs font-semibold opacity-70">{label}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </div>
);

const FormFields = ({ form, onChange, isAnggaranOverLimit, isEdit = false, currentFile = null, requireFile = false }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Judul Proposal *</label>
      <input
        type="text"
        value={form.judul_proposal}
        readOnly
        disabled
        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-600 cursor-not-allowed focus:outline-none"
        placeholder="Otomatis dari kegiatan yang dipilih"
      />
      <p className="text-xs text-slate-400 mt-1">Judul mengikuti nama kegiatan yang dipilih (tidak dapat diubah).</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Kegiatan Spesifik</label>
        <input
          type="text"
          value={form.nama_kegiatan_spesifik}
          onChange={e => onChange('nama_kegiatan_spesifik', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Detail kegiatan"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Volume</label>
        <input
          type="text"
          value={form.volume}
          onChange={e => onChange('volume', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Contoh: 200m x 3m"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Lokasi</label>
        <input
          type="text"
          value={form.lokasi}
          onChange={e => onChange('lokasi', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Lokasi kegiatan"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">
          Anggaran Usulan (Rp) <span className="text-xs font-normal text-slate-400">max 1,5 M total</span>
        </label>
        <input
          type="text"
          value={formatRupiah(form.anggaran_usulan)}
          onChange={e => onChange('anggaran_usulan', e.target.value.replace(/\D/g, ''))}
          className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 ${
            isAnggaranOverLimit(form.anggaran_usulan)
              ? 'border-rose-500 focus:ring-rose-200 bg-rose-50 text-rose-700'
              : 'border-slate-300 focus:ring-amber-500'
          }`}
          placeholder="0"
        />
        {isAnggaranOverLimit(form.anggaran_usulan) && (
          <p className="text-xs font-semibold text-rose-600 mt-1">
            ⚠️ Total anggaran melebihi batas Rp 1,5 Miliar
          </p>
        )}
      </div>
    </div>

    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Deskripsi</label>
      <textarea
        value={form.deskripsi}
        onChange={e => onChange('deskripsi', e.target.value)}
        rows={3}
        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
        placeholder="Deskripsi singkat proposal perubahan"
      />
    </div>

    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">
        File Proposal (PDF){' '}
        {requireFile
          ? <span className="text-amber-600">* wajib upload PDF revisi</span>
          : (isEdit ? '(opsional - kosongkan untuk tidak ganti)' : '*')}
      </label>
      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={e => onChange('file', e.target.files[0] || null)}
        className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
      />
      {isEdit && currentFile && !form.file && (
        <p className="text-xs text-slate-500 mt-1">File saat ini: {currentFile}</p>
      )}
    </div>
  </div>
);

const ProposalCard = ({ proposal, expanded, onToggleExpand, onEdit, onDelete }) => {
  const submitted = !!proposal.submitted_to_kecamatan;
  const statusRevisi = ['revision','rejected'].includes(proposal.status);
  const kecRevisi = ['revision','rejected'].includes(proposal.kecamatan_status);
  const dpmdRevisi = ['revision','rejected'].includes(proposal.dpmd_status);
  const inRevisi = statusRevisi || kecRevisi || dpmdRevisi;
  // Masih perlu upload ulang PDF sebelum bisa dikirim ulang ke Kecamatan?
  const needsReupload = inRevisi && Number(proposal.reupload_after_revision_count || 0) === 0;
  const canEdit = !submitted || inRevisi;
  const canDelete = !submitted;
  const meta = KATEGORI_META[proposal.jenis_kegiatan] || KATEGORI_META.wajib;
  const firstKegiatan = proposal.kegiatan_list?.[0];
  const [showHistory, setShowHistory] = useState(false);
  const hasHistory = submitted || inRevisi || (proposal.current_version || 1) > 1;

  return (
    <div className={`rounded-xl border bg-white shadow-sm overflow-hidden ${
      inRevisi ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'
    }`}>
      <button
        onClick={onToggleExpand}
        className="w-full p-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {expanded
                ? <LuChevronDown className="w-4 h-4 text-slate-600 flex-shrink-0" />
                : <LuChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />}
              <p className="font-bold text-slate-900 text-base leading-tight truncate">{proposal.judul_proposal}</p>
            </div>
            {firstKegiatan && (
              <p className="text-xs text-slate-600 mt-1 ml-6 truncate">
                <span className="font-semibold">Kegiatan:</span> {firstKegiatan.nama_kegiatan}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-6">
              <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${meta.badge}`}>
                {meta.label}
              </span>
              {!submitted && (
                inRevisi
                  ? <StatusBadge
                      status={kecRevisi ? proposal.kecamatan_status : (dpmdRevisi ? proposal.dpmd_status : proposal.status)}
                      label={kecRevisi ? 'Revisi Kecamatan' : (dpmdRevisi ? 'Revisi DPMD' : 'Dikembalikan untuk Revisi')}
                    />
                  : <StatusBadge status="draft" label="Draft" />
              )}
              {submitted && (
                <>
                  <StatusBadge status={proposal.kecamatan_status} label={`Kec: ${proposal.kecamatan_status || 'pending'}`} />
                  {!!proposal.submitted_to_dpmd && (
                    <StatusBadge status={proposal.dpmd_status} label={`DPMD: ${proposal.dpmd_status || 'pending'}`} />
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {proposal.anggaran_usulan && (
              <span className="text-xs font-semibold text-slate-600">
                Rp {Number(proposal.anggaran_usulan).toLocaleString('id-ID')}
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 mb-3">
            {proposal.volume && (
              <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                <LuPackage className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900">Volume</p>
                  <p className="text-sm text-slate-800 break-words">{proposal.volume}</p>
                </div>
              </div>
            )}
            {proposal.lokasi && (
              <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                <LuMapPin className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900">Lokasi</p>
                  <p className="text-sm text-slate-800 break-words">{proposal.lokasi}</p>
                </div>
              </div>
            )}
            {proposal.anggaran_usulan && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                <LuDollarSign className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-900">Anggaran</p>
                  <p className="text-sm text-amber-800 font-medium">Rp {Number(proposal.anggaran_usulan).toLocaleString('id-ID')}</p>
                </div>
              </div>
            )}
          </div>

          {proposal.nama_kegiatan_spesifik && (
            <div className="mb-3 p-2 bg-slate-50 rounded-lg text-sm text-slate-700">
              <strong className="text-slate-900">Nama Spesifik:</strong> {proposal.nama_kegiatan_spesifik}
            </div>
          )}

          {statusRevisi && !kecRevisi && !dpmdRevisi && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
              <LuTriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
              <div>
                <strong>Proposal dikembalikan ke Desa untuk revisi.</strong>
                <p className="mt-0.5 text-xs text-rose-800">
                  Periksa catatan atau riwayat proposal, lalu upload ulang PDF sebelum dikirim kembali.
                </p>
                {proposal.troubleshoot_catatan && (
                  <p className="mt-2 rounded-lg bg-white/80 p-2 text-xs text-rose-900">
                    <strong>Catatan DPMD:</strong> {proposal.troubleshoot_catatan}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Hasil revisi Kecamatan — selalu tampil saat status revisi, walau
              kecamatan hanya memberi coretan/anotasi tanpa catatan teks. */}
          {kecRevisi && (
            <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2 text-amber-800 mb-3 flex items-start justify-between gap-2 flex-wrap">
              <span className="min-w-0">
                <strong>Hasil revisi Kecamatan:</strong>{' '}
                {proposal.kecamatan_catatan
                  ? proposal.kecamatan_catatan
                  : 'Lihat tanda/coretan langsung pada PDF beranotasi.'}
              </span>
              <button
                onClick={() => setShowHistory(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded shrink-0"
              >
                <LuPencilLine className="w-3 h-3" /> Lihat coretan revisi
              </button>
            </div>
          )}

          {/* Catatan kecamatan untuk status non-revisi (mis. disetujui dgn catatan) */}
          {!kecRevisi && proposal.kecamatan_catatan && (
            <div className="text-xs bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 mb-3">
              <strong>Catatan Kecamatan:</strong> {proposal.kecamatan_catatan}
            </div>
          )}

          {proposal.dpmd_catatan && (
            <div className="text-xs bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 mb-3">
              <strong>Catatan DPMD:</strong> {proposal.dpmd_catatan}
            </div>
          )}

          {needsReupload && (
            <div className="mb-2 text-xs bg-amber-50 border border-amber-200 rounded p-2 text-amber-800 flex items-center gap-1.5">
              <LuRefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
              Proposal direvisi. Perbaiki & <strong>upload ulang PDF</strong> (tombol Upload Ulang PDF) sebelum bisa dikirim ulang ke Kecamatan.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {/* "Lihat PDF" disembunyikan saat proposal sedang direvisi —
                gunakan "Lihat coretan revisi" untuk melihat PDF beranotasi. */}
            {proposal.file_proposal && !inRevisi && (
              <a
                href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/${proposal.file_proposal}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
              >
                <LuEye className="w-3.5 h-3.5" /> Lihat PDF
              </a>
            )}
            {canEdit && (
              <button
                onClick={onEdit}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-white text-xs font-semibold rounded-lg ${
                  needsReupload ? 'bg-amber-600 hover:bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {needsReupload
                  ? <><LuRefreshCw className="w-3.5 h-3.5" /> Upload Ulang PDF</>
                  : <><LuPencil className="w-3.5 h-3.5" /> Edit</>}
              </button>
            )}
            {hasHistory && (
              <button
                onClick={() => setShowHistory(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                <LuHistory className="w-3.5 h-3.5" /> Riwayat & Versi
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg"
              >
                <LuTrash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            )}
          </div>
        </div>
      )}

      {showHistory && (
        <BankeuRevisionHistoryModal
          apiBase="/desa/bankeu-perubahan"
          proposalId={proposal.id}
          proposalTitle={proposal.judul_proposal}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

export default BankeuPerubahanProposalPage;
