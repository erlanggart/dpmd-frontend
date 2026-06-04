import React, { useEffect, useState, useMemo, useRef } from 'react';
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

const formatRupiah = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
};

const KATEGORI_META = {
  wajib: {
    label: 'Wajib',
    sublabel: 'Kegiatan WAJIB',
    gradFrom: 'from-red-500',
    gradTo: 'to-rose-600',
    headerBg: 'from-red-50 via-rose-50 to-red-50',
    headerHover: 'hover:from-red-100 hover:via-rose-100 hover:to-red-100',
    badge: 'bg-red-100 text-red-700 border-red-300',
    btnGrad: 'from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700',
    boxBg: 'from-red-50 to-rose-50',
    boxBorder: 'border-red-300',
  },
  pilihan_infrastruktur: {
    label: 'Pilihan Infrastruktur',
    sublabel: 'Kegiatan fisik/bangunan',
    gradFrom: 'from-orange-500',
    gradTo: 'to-amber-600',
    headerBg: 'from-orange-50 via-amber-50 to-orange-50',
    headerHover: 'hover:from-orange-100 hover:via-amber-100 hover:to-orange-100',
    badge: 'bg-orange-100 text-orange-700 border-orange-300',
    btnGrad: 'from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700',
    boxBg: 'from-orange-50 to-amber-50',
    boxBorder: 'border-orange-300',
  },
  pilihan_non_infrastruktur: {
    label: 'Pilihan Non-Infrastruktur',
    sublabel: 'Program/pemberdayaan',
    gradFrom: 'from-blue-500',
    gradTo: 'to-indigo-600',
    headerBg: 'from-blue-50 via-indigo-50 to-blue-50',
    headerHover: 'hover:from-blue-100 hover:via-indigo-100 hover:to-blue-100',
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
    btnGrad: 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
    boxBg: 'from-blue-50 to-indigo-50',
    boxBorder: 'border-blue-300',
  },
};
const KATEGORI_KEYS = Object.keys(KATEGORI_META);

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

  useEffect(() => { fetchData(); }, [tahun]);

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

  // Get kegiatan IDs that already have a proposal (per kategori)
  const usedKegiatanIds = useMemo(() => {
    const used = { wajib: new Set(), pilihan_infrastruktur: new Set(), pilihan_non_infrastruktur: new Set() };
    proposals.forEach(p => {
      const kat = p.jenis_kegiatan;
      if (!used[kat]) return;
      (p.kegiatan_list || []).forEach(k => used[kat].add(k.id));
      if (p.kegiatan_id) used[kat].add(p.kegiatan_id);
    });
    return used;
  }, [proposals]);

  // Available kegiatan per kategori (not yet proposed)
  const availableKegiatan = useMemo(() => {
    const out = {};
    KATEGORI_KEYS.forEach(k => {
      out[k] = (masterKegiatan[k] || []).filter(item => !usedKegiatanIds[k].has(item.id));
    });
    return out;
  }, [masterKegiatan, usedKegiatanIds]);

  // Total anggaran (semua proposal)
  const getTotalExistingAnggaran = (excludeProposalId = null) => {
    return proposals.reduce((total, p) => {
      if (excludeProposalId && p.id === excludeProposalId) return total;
      return total + (Math.round(Number(p.anggaran_usulan) || 0));
    }, 0);
  };
  const isAnggaranOverLimit = (value, excludeProposalId = null) => {
    if (!value) return false;
    const newVal = parseInt(String(value).replace(/\D/g, ''), 10) || 0;
    return (getTotalExistingAnggaran(excludeProposalId) + newVal) > MAX_ANGGARAN;
  };
  const getRemainingAnggaran = (excludeProposalId = null) => MAX_ANGGARAN - getTotalExistingAnggaran(excludeProposalId);

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
    const anggaranNum = parseInt(String(form.anggaran_usulan).replace(/\D/g, ''), 10) || 0;
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
      judul_proposal: proposal.judul_proposal || '',
      nama_kegiatan_spesifik: proposal.nama_kegiatan_spesifik || '',
      volume: proposal.volume || '',
      lokasi: proposal.lokasi || '',
      deskripsi: proposal.deskripsi || '',
      anggaran_usulan: proposal.anggaran_usulan ? String(proposal.anggaran_usulan) : '',
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
    const anggaranNum = parseInt(String(editForm.anggaran_usulan).replace(/\D/g, ''), 10) || 0;
    if (editForm.anggaran_usulan && isAnggaranOverLimit(editForm.anggaran_usulan, editingProposal.id)) {
      const sisa = getRemainingAnggaran(editingProposal.id);
      return Swal.fire({
        icon: 'error',
        title: 'Total Anggaran Melebihi Batas',
        html: `Total anggaran seluruh proposal tidak boleh lebih dari <b>Rp 1.500.000.000</b> (1,5 Miliar).<br/>Sisa anggaran tersedia: <b>Rp ${formatRupiah(sisa)}</b>`,
      });
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
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
        tahun, proposal_ids: draftProposals.map(p => p.id),
      });
      Swal.fire('Berhasil', res.data?.message || 'Proposal terkirim', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengirim proposal', 'error');
    }
  };

  const handleResubmit = async () => {
    const revisiProposals = proposals.filter(p =>
      ['revision','rejected'].includes(p.kecamatan_status) ||
      ['revision','rejected'].includes(p.dpmd_status)
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
        tahun, proposal_ids: revisiProposals.map(p => p.id),
      });
      Swal.fire('Berhasil', res.data?.message || 'Proposal terkirim ulang', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal kirim ulang', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <LuCoins className="w-7 h-7 text-orange-600" />
                Bankeu Perubahan TA {tahun}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Alur verifikasi: Desa → Kecamatan → DPMD &nbsp;·&nbsp; 1 kegiatan = 1 proposal
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
            <StatCard label="Total" value={counts.total} color="bg-gray-50 text-gray-700" />
            <StatCard label="Draft" value={counts.draft} color="bg-amber-50 text-amber-700" />
            <StatCard label="Pending Kec" value={counts.pending} color="bg-blue-50 text-blue-700" />
            <StatCard label="Approved Kec" value={counts.approved_kec} color="bg-emerald-50 text-emerald-700" />
            <StatCard label="Approved DPMD" value={counts.dpmd_approved} color="bg-green-50 text-green-700" />
            <StatCard label="Revisi" value={counts.revision} color="bg-orange-50 text-orange-700" />
          </div>
        </div>

        {/* Sections per kategori */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
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
                className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${
                  isDropdownOpen ? 'relative z-30 overflow-visible' : 'overflow-hidden'
                }`}
              >
                {/* Section Header */}
                <button
                  onClick={() => setExpandedSection(s => ({ ...s, [kat]: !s[kat] }))}
                  className={`w-full px-6 py-5 flex items-center justify-between bg-gradient-to-r ${meta.headerBg} ${meta.headerHover} transition-all group`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 bg-gradient-to-br ${meta.gradFrom} ${meta.gradTo} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      {isExpanded ? <LuChevronDown className="w-5 h-5 text-white" /> : <LuChevronRight className="w-5 h-5 text-white" />}
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-gray-900">{meta.label}</h3>
                      <p className="text-sm text-gray-600">
                        {sectionProposals.length} dari {totalMaster} program · {meta.sublabel}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-white rounded-xl shadow-md border border-gray-100">
                    <span className={`text-2xl font-bold bg-gradient-to-r ${meta.gradFrom} ${meta.gradTo} bg-clip-text text-transparent`}>
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
                    <div className="p-4 bg-gray-50 space-y-2 border-b border-gray-200">
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
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-sm text-emerald-800">
                        <LuCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          Semua kegiatan di kategori <strong>{meta.label}</strong> sudah memiliki proposal.
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
                          className={`w-full px-6 py-4 bg-gradient-to-r ${meta.btnGrad} text-white rounded-xl flex items-center justify-center gap-3 font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.01]`}
                        >
                          {isFormOpen ? <LuX className="w-6 h-6" /> : <LuPlus className="w-6 h-6" />}
                          {isFormOpen ? 'Tutup Form' : `Tambah Proposal ${meta.label} Baru`}
                        </button>

                        {isFormOpen && (
                          <div className={`mt-4 p-4 sm:p-6 bg-white rounded-2xl border-2 ${meta.boxBorder} shadow-xl`}>
                            <div className="space-y-5">
                              {/* Step 1: Pilih Kegiatan */}
                              <div className={`dropdown-${kat} relative ${isDropdownOpen ? 'mb-80 sm:mb-96' : ''}`}>
                                <label className="flex items-center gap-3 text-base sm:text-lg font-bold text-gray-900 mb-3">
                                  <div className={`flex items-center justify-center w-8 h-8 bg-gradient-to-br ${meta.gradFrom} ${meta.gradTo} text-white rounded-full shadow-md`}>
                                    <span className="text-sm font-bold">1</span>
                                  </div>
                                  <span>Pilih Kegiatan</span>
                                </label>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setDropdownOpen(d => ({ ...d, [kat]: !d[kat] }))}
                                    className={`w-full pl-5 pr-12 py-4 bg-gradient-to-r ${meta.boxBg} border-2 ${meta.boxBorder} rounded-xl text-base font-semibold text-left shadow-sm focus:outline-none hover:opacity-90 transition-all`}
                                  >
                                    <span className={selectedKegiatanId[kat] ? 'text-gray-800' : 'text-gray-500'}>
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
                                    <LuChevronDown className={`w-6 h-6 text-gray-600 transition-transform duration-200 ${dropdownOpen[kat] ? 'rotate-180' : ''}`} />
                                  </div>

                                  {isDropdownOpen && (
                                    <div className={`absolute left-0 right-0 top-full mt-2 z-50 bg-white border-2 ${meta.boxBorder} rounded-xl shadow-2xl overflow-hidden`}>
                                      <div className="max-h-72 overflow-y-auto">
                                        {availableList.map((item, idx) => (
                                          <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedKegiatanId(s => ({ ...s, [kat]: item.id.toString() }));
                                              setDropdownOpen(d => ({ ...d, [kat]: false }));
                                              // Pre-fill judul dari nama_kegiatan jika belum diisi
                                              setAddForm(f => ({
                                                ...f,
                                                [kat]: { ...f[kat], judul_proposal: f[kat].judul_proposal || item.nama_kegiatan }
                                              }));
                                            }}
                                            className={`w-full px-5 py-3 text-left text-sm sm:text-base font-medium transition-colors leading-relaxed ${
                                              selectedKegiatanId[kat] === item.id.toString()
                                                ? 'bg-gray-100 text-gray-900 font-semibold'
                                                : 'text-gray-800 hover:bg-gray-50'
                                            } ${idx !== availableList.length - 1 ? 'border-b border-gray-200' : ''}`}
                                          >
                                            <span className="block">
                                              {item.urutan ? <strong className="mr-1">{item.urutan}.</strong> : null}
                                              {item.nama_kegiatan}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Step 2: Isi Detail */}
                              {selectedKegiatanId[kat] && (
                                <div className="pt-4 border-t-2 border-gray-100 space-y-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-full shadow-md">
                                      <span className="text-sm font-bold">2</span>
                                    </div>
                                    <h4 className="text-base sm:text-lg font-bold text-gray-900">Isi Detail Proposal</h4>
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
                                      className="px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
                                    >
                                      Batal
                                    </button>
                                    <button
                                      onClick={() => handleCreate(kat)}
                                      disabled={submitting}
                                      className={`flex-1 px-6 py-3 bg-gradient-to-r ${meta.btnGrad} text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <LuInfo className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">Belum ada master kegiatan</p>
            <p className="text-sm text-gray-400 mt-1">Hubungi DPMD untuk konfigurasi master kegiatan bankeu perubahan</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProposal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Edit Proposal #{editingProposal.id}</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold border rounded ${KATEGORI_META[editingProposal.jenis_kegiatan]?.badge}`}>
                  {KATEGORI_META[editingProposal.jenis_kegiatan]?.label}
                </span>
                {editingProposal.kegiatan_list?.[0] && (
                  <span className="ml-2">· {editingProposal.kegiatan_list[0].nama_kegiatan}</span>
                )}
              </div>

              <FormFields
                form={editForm}
                onChange={(field, value) => setEditForm(f => ({ ...f, [field]: value }))}
                isAnggaranOverLimit={(v) => isAnggaranOverLimit(v, editingProposal.id)}
                isEdit
                currentFile={editingProposal.file_proposal}
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 bg-gray-50">
              <button
                onClick={closeEditModal}
                type="button"
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleEdit}
                disabled={submitting}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
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

const FormFields = ({ form, onChange, isAnggaranOverLimit, isEdit = false, currentFile = null }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">Judul Proposal *</label>
      <input
        type="text"
        value={form.judul_proposal}
        onChange={e => onChange('judul_proposal', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        placeholder="Contoh: Pembangunan Jalan Desa RT 02 RW 03"
        maxLength={255}
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Kegiatan Spesifik</label>
        <input
          type="text"
          value={form.nama_kegiatan_spesifik}
          onChange={e => onChange('nama_kegiatan_spesifik', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Detail kegiatan"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Volume</label>
        <input
          type="text"
          value={form.volume}
          onChange={e => onChange('volume', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Contoh: 200m x 3m"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Lokasi</label>
        <input
          type="text"
          value={form.lokasi}
          onChange={e => onChange('lokasi', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Lokasi kegiatan"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Anggaran Usulan (Rp) <span className="text-xs font-normal text-gray-400">max 1,5 M total</span>
        </label>
        <input
          type="text"
          value={formatRupiah(form.anggaran_usulan)}
          onChange={e => onChange('anggaran_usulan', e.target.value.replace(/\D/g, ''))}
          className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 ${
            isAnggaranOverLimit(form.anggaran_usulan)
              ? 'border-red-500 focus:ring-red-200 bg-red-50 text-red-700'
              : 'border-gray-300 focus:ring-orange-500'
          }`}
          placeholder="0"
        />
        {isAnggaranOverLimit(form.anggaran_usulan) && (
          <p className="text-xs font-semibold text-red-600 mt-1">
            ⚠️ Total anggaran melebihi batas Rp 1,5 Miliar
          </p>
        )}
      </div>
    </div>

    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">Deskripsi</label>
      <textarea
        value={form.deskripsi}
        onChange={e => onChange('deskripsi', e.target.value)}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
        placeholder="Deskripsi singkat proposal perubahan"
      />
    </div>

    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        File Proposal (PDF) {isEdit ? '(opsional - kosongkan untuk tidak ganti)' : '*'}
      </label>
      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={e => onChange('file', e.target.files[0] || null)}
        className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
      />
      {isEdit && currentFile && !form.file && (
        <p className="text-xs text-gray-500 mt-1">File saat ini: {currentFile}</p>
      )}
    </div>
  </div>
);

const ProposalCard = ({ proposal, expanded, onToggleExpand, onEdit, onDelete, onView }) => {
  const submitted = proposal.submitted_to_kecamatan;
  const kecRevisi = ['revision','rejected'].includes(proposal.kecamatan_status);
  const dpmdRevisi = ['revision','rejected'].includes(proposal.dpmd_status);
  const canEdit = !submitted || kecRevisi || dpmdRevisi;
  const canDelete = !submitted;
  const meta = KATEGORI_META[proposal.jenis_kegiatan] || KATEGORI_META.wajib;
  const firstKegiatan = proposal.kegiatan_list?.[0];
  const [showHistory, setShowHistory] = useState(false);
  const hasHistory = submitted || (proposal.current_version || 1) > 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={onToggleExpand}
        className="w-full p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {expanded
                ? <LuChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
                : <LuChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />}
              <p className="font-bold text-gray-900 text-base leading-tight truncate">{proposal.judul_proposal}</p>
            </div>
            {firstKegiatan && (
              <p className="text-xs text-gray-600 mt-1 ml-6 truncate">
                <span className="font-semibold">Kegiatan:</span> {firstKegiatan.nama_kegiatan}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-6">
              <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${meta.badge}`}>
                {meta.label}
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
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {proposal.anggaran_usulan && (
              <span className="text-xs font-semibold text-emerald-600">
                Rp {Number(proposal.anggaran_usulan).toLocaleString('id-ID')}
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 mb-3">
            {proposal.volume && (
              <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                <LuPackage className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-900">Volume</p>
                  <p className="text-sm text-blue-800 break-words">{proposal.volume}</p>
                </div>
              </div>
            )}
            {proposal.lokasi && (
              <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                <LuMapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-900">Lokasi</p>
                  <p className="text-sm text-green-800 break-words">{proposal.lokasi}</p>
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
            <div className="mb-3 p-2 bg-gray-50 rounded-lg text-sm text-gray-700">
              <strong className="text-gray-900">Nama Spesifik:</strong> {proposal.nama_kegiatan_spesifik}
            </div>
          )}

          {(proposal.kecamatan_catatan || proposal.dpmd_catatan) && (
            <div className="space-y-1 mb-3">
              {proposal.kecamatan_catatan && (
                <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-800">
                  <strong>Catatan Kecamatan:</strong> {proposal.kecamatan_catatan}
                  {kecRevisi && (
                    <button
                      onClick={() => setShowHistory(true)}
                      className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold rounded"
                    >
                      <LuPencilLine className="w-3 h-3" /> Lihat coretan revisi
                    </button>
                  )}
                </div>
              )}
              {proposal.dpmd_catatan && (
                <div className="text-xs bg-purple-50 border border-purple-200 rounded p-2 text-purple-800">
                  <strong>Catatan DPMD:</strong> {proposal.dpmd_catatan}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {proposal.file_proposal && (
              <a
                href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/${proposal.file_proposal}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
              >
                <LuEye className="w-3.5 h-3.5" /> Lihat PDF
              </a>
            )}
            {canEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg"
              >
                <LuPencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {hasHistory && (
              <button
                onClick={() => setShowHistory(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
              >
                <LuHistory className="w-3.5 h-3.5" /> Riwayat & Versi
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg"
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
