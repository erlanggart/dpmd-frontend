import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../../api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import {
  LuEye, LuCheck, LuX, LuRefreshCw, LuFilter, LuMessageSquare, LuInfo,
  LuChevronDown, LuChevronRight, LuSearch, LuPackage, LuMapPin, LuDollarSign,
  LuClipboardCheck, LuHistory, LuRoute, LuFolder, LuActivity, LuUsers,
  LuDownload, LuChartColumn, LuFileText, LuStamp, LuRotateCcw, LuWrench,
  LuPencil, LuSave,
} from 'react-icons/lu';
import BankeuRevisionHistoryModal from '../../../../components/shared/BankeuRevisionHistoryModal';
import BankeuPerubahanTrackingModal from '../../../../components/shared/BankeuPerubahanTrackingModal';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, RadialBarChart, RadialBar,
  LabelList, PolarAngleAxis,
} from 'recharts';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const STATUS_LABELS = {
  pending: 'Pending', in_review: 'Review',
  approved: 'Disetujui', rejected: 'Ditolak', revision: 'Revisi'
};
const STATUS_STYLES = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  in_review: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected:  'bg-rose-50 text-rose-700 border-rose-200',
  revision:  'bg-orange-50 text-orange-700 border-orange-200',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
    {STATUS_LABELS[status] || status}
  </span>
);

const KATEGORI_META = {
  wajib: {
    label: 'Wajib', sublabel: 'Kegiatan WAJIB',
    gradFrom: 'from-rose-500', gradTo: 'to-rose-600',
    headerBg: 'from-rose-50 via-rose-50 to-rose-50',
    headerHover: 'hover:from-rose-100 hover:via-rose-100 hover:to-rose-100',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  pilihan_infrastruktur: {
    label: 'Pilihan Infrastruktur', sublabel: 'Kegiatan fisik/bangunan',
    gradFrom: 'from-orange-500', gradTo: 'to-amber-600',
    headerBg: 'from-orange-50 via-amber-50 to-orange-50',
    headerHover: 'hover:from-orange-100 hover:via-amber-100 hover:to-orange-100',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  pilihan_non_infrastruktur: {
    label: 'Pilihan Non-Infrastruktur', sublabel: 'Program/pemberdayaan',
    gradFrom: 'from-indigo-500', gradTo: 'to-indigo-600',
    headerBg: 'from-indigo-50 via-indigo-50 to-indigo-50',
    headerHover: 'hover:from-indigo-100 hover:via-indigo-100 hover:to-indigo-100',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
};
const KATEGORI_KEYS = Object.keys(KATEGORI_META);

const TABS = [
  { key: 'archive', icon: LuFolder, label: 'Arsip Proposal' },
  { key: 'tracking', icon: LuActivity, label: 'Tracking Status' },
  { key: 'partisipasi', icon: LuUsers, label: 'Partisipasi Desa' },
  { key: 'statistics', icon: LuChartColumn, label: 'Statistik Dashboard' },
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

// Tahap "saat ini" sebuah proposal di alur Desa→Kecamatan→DPMD
function currentStage(p) {
  const kec = p.kecamatan_status || 'pending';
  if (['revision', 'rejected'].includes(p.dpmd_status)) {
    return { key: 'revisi_dokumen_kec', label: 'Revisi BA/SP Kecamatan', tone: 'orange' };
  }
  // Kecamatan minta revisi / tolak: proposal dikembalikan ke desa (submitted_to_kecamatan=FALSE)
  // tetapi kecamatan_status tetap 'revision'/'rejected'. Ini harus dideteksi SEBELUM fallback
  // revisi_desa di bawah, karena alur revisi kecamatan juga menyetel status='revision'.
  if (!p.submitted_to_dpmd) {
    if (kec === 'revision') return { key: 'revisi_kec', label: 'Revisi Kecamatan', tone: 'orange' };
    if (kec === 'rejected') return { key: 'ditolak_kec', label: 'Ditolak Kecamatan', tone: 'red' };
  }
  // Revisi murni level desa (mis. hasil troubleshoot: kecamatan_status di-reset ke 'pending').
  if (['revision', 'rejected'].includes(p.status) && !p.submitted_to_kecamatan) {
    return { key: 'revisi_desa', label: 'Revisi di Desa', tone: 'red' };
  }
  // DPMD hanya MENERIMA proposal desa — tidak memverifikasi isi proposal.
  // Verifikasi SP & BA (dokumen kecamatan) bersifat internal kecamatan↔DPMD dan
  // tidak ditampilkan sebagai tahap tracking proposal, jadi begitu sampai di DPMD
  // statusnya cukup "Diterima DPMD".
  if (p.submitted_to_dpmd) {
    return { key: 'diterima_dpmd', label: 'Diterima DPMD', tone: 'emerald' };
  }
  if (p.submitted_to_kecamatan) {
    if (kec === 'approved') return { key: 'disetujui_kec', label: 'Disetujui Kec. (belum diteruskan)', tone: 'cyan' };
    if (kec === 'rejected') return { key: 'ditolak_kec', label: 'Ditolak Kecamatan', tone: 'red' };
    if (kec === 'revision') return { key: 'revisi_kec', label: 'Revisi Kecamatan', tone: 'orange' };
    return { key: 'menunggu_kec', label: 'Menunggu Kecamatan', tone: 'amber' };
  }
  return { key: 'draft', label: 'Draft di Desa', tone: 'gray' };
}
const TONE = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  gray: 'bg-slate-100 text-slate-600 border-slate-200',
};
// Titik berwarna untuk header grup (dipakai di Tracking — dikelompokkan per status).
const TONE_DOT = {
  emerald: 'bg-emerald-500', red: 'bg-rose-500', orange: 'bg-orange-500',
  amber: 'bg-amber-500', cyan: 'bg-cyan-500', gray: 'bg-slate-400',
};
// Urutan tahap mengikuti alur Desa → Kecamatan → DPMD (untuk pengelompokan Tracking).
const STAGE_ORDER = [
  { key: 'draft', label: 'Draft di Desa', tone: 'gray' },
  { key: 'revisi_desa', label: 'Revisi di Desa', tone: 'red' },
  { key: 'menunggu_kec', label: 'Menunggu Kecamatan', tone: 'amber' },
  { key: 'revisi_kec', label: 'Revisi Kecamatan', tone: 'orange' },
  { key: 'ditolak_kec', label: 'Ditolak Kecamatan', tone: 'red' },
  { key: 'disetujui_kec', label: 'Disetujui Kec. (belum diteruskan)', tone: 'cyan' },
  { key: 'revisi_dokumen_kec', label: 'Revisi BA/SP Kecamatan', tone: 'orange' },
  { key: 'diterima_dpmd', label: 'Diterima DPMD', tone: 'emerald' },
];

const DpmdBankeuPerubahanVerificationPage = ({ tahun }) => {
  const [activeTab, setActiveTab] = useState('archive');

  // Arsip + verifikasi (proposal yang sudah sampai DPMD)
  const [proposals, setProposals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterKecamatan, setFilterKecamatan] = useState('all');
  const [filterKategori, setFilterKategori] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyModal, setVerifyModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [expandedKec, setExpandedKec] = useState({});   // default: terbuka
  const [expandedDesa, setExpandedDesa] = useState({}); // default: tertutup

  // Tracking lintas-tahap (semua proposal)
  const [trackingData, setTrackingData] = useState([]);
  const [loadingTracking, setLoadingTracking] = useState(true);
  const [trackSearch, setTrackSearch] = useState('');
  const [trackKecamatan, setTrackKecamatan] = useState('all');
  const [trackKegiatan, setTrackKegiatan] = useState('all');

  // Master desa/kecamatan (partisipasi)
  const [allDesa, setAllDesa] = useState([]);
  const [allKecamatan, setAllKecamatan] = useState([]);

  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [proposalsRes, statsRes] = await Promise.all([
        api.get('/dpmd/bankeu-perubahan/proposals', { params: { tahun } }),
        api.get('/dpmd/bankeu-perubahan/statistics', { params: { tahun } }),
      ]);
      setProposals(proposalsRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch (err) {
      console.error('Fetch error:', err);
      Swal.fire('Gagal', 'Tidak dapat mengambil data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = async () => {
    setLoadingTracking(true);
    try {
      const res = await api.get('/dpmd/bankeu-perubahan/tracking', { params: { tahun } });
      setTrackingData(res.data?.data || []);
    } catch (err) {
      console.error('Tracking error:', err);
    } finally {
      setLoadingTracking(false);
    }
  };

  const fetchDesaKecamatan = async () => {
    try {
      const [desaRes, kecRes] = await Promise.all([api.get('/desas'), api.get('/kecamatans')]);
      setAllDesa(desaRes.data?.data || []);
      setAllKecamatan(kecRes.data?.data || []);
    } catch (err) {
      console.error('Desa/Kecamatan error:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTracking();
    fetchDesaKecamatan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun]);

  const refreshAll = () => { fetchData(); fetchTracking(); };

  // ---- Opsi kecamatan (gabungan dari master + proposal) ----
  const kecamatanOptions = useMemo(() => {
    const set = new Map();
    allKecamatan.forEach(k => set.set(Number(k.id), k.nama));
    proposals.forEach(p => { if (p.desa_kecamatan_id) set.set(Number(p.desa_kecamatan_id), p.kecamatan_nama); });
    return Array.from(set.entries()).map(([id, nama]) => ({ id, nama })).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [allKecamatan, proposals]);

  // ---- ARSIP: filter + grup kategori ----
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      if (filterStatus !== 'all' && p.dpmd_status !== filterStatus) return false;
      if (filterKecamatan !== 'all' && String(p.desa_kecamatan_id) !== String(filterKecamatan)) return false;
      if (filterKategori !== 'all' && p.jenis_kegiatan !== filterKategori) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inJudul = p.judul_proposal?.toLowerCase().includes(q);
        const inDesa = p.desa_nama?.toLowerCase().includes(q);
        const inKec = p.kecamatan_nama?.toLowerCase().includes(q);
        const inKegiatan = (p.kegiatan_list || []).some(k => k.nama_kegiatan?.toLowerCase().includes(q));
        if (!inJudul && !inDesa && !inKec && !inKegiatan) return false;
      }
      return true;
    });
  }, [proposals, filterStatus, filterKecamatan, filterKategori, searchQuery]);

  // Hierarki: Kecamatan → Desa → Proposal
  const groupedByKecamatan = useMemo(() => {
    const kecMap = new Map();
    filteredProposals.forEach(p => {
      const kecId = p.desa_kecamatan_id ?? `none-${p.kecamatan_nama || ''}`;
      const kecNama = p.kecamatan_nama || 'Tanpa Kecamatan';
      if (!kecMap.has(kecId)) kecMap.set(kecId, { kecId, kecNama, count: 0, anggaran: 0, desaMap: new Map() });
      const kec = kecMap.get(kecId);
      kec.count += 1;
      kec.anggaran += Number(p.anggaran_usulan) || 0;

      const desaId = p.desa_id ?? `none-${p.desa_nama || ''}`;
      const desaNama = p.desa_nama || 'Tanpa Desa';
      if (!kec.desaMap.has(desaId)) kec.desaMap.set(desaId, { desaId, desaNama, count: 0, anggaran: 0, items: [] });
      const desa = kec.desaMap.get(desaId);
      desa.count += 1;
      desa.anggaran += Number(p.anggaran_usulan) || 0;
      desa.items.push(p);
    });
    return Array.from(kecMap.values())
      .map(k => ({
        ...k,
        desas: Array.from(k.desaMap.values()).sort((a, b) => (a.desaNama || '').localeCompare(b.desaNama || '')),
      }))
      .sort((a, b) => (a.kecNama || '').localeCompare(b.kecNama || ''));
  }, [filteredProposals]);

  // ---- TRACKING: filter ----
  const trackingFiltered = useMemo(() => {
    return trackingData.filter(p => {
      if (trackKecamatan !== 'all' && String(p.desa_kecamatan_id) !== String(trackKecamatan)) return false;
      if (trackKegiatan !== 'all') {
        const matchesKegiatan = (p.kegiatan_list || []).some(k => String(k.id) === String(trackKegiatan)) ||
          String(p.kegiatan_id || '') === String(trackKegiatan);
        if (!matchesKegiatan) return false;
      }
      if (trackSearch.trim()) {
        const q = trackSearch.toLowerCase();
        const inKegiatan = (p.kegiatan_list || []).some(k => k.nama_kegiatan?.toLowerCase().includes(q));
        if (!(p.judul_proposal?.toLowerCase().includes(q) || p.desa_nama?.toLowerCase().includes(q) || p.kecamatan_nama?.toLowerCase().includes(q) || inKegiatan)) return false;
      }
      return true;
    });
  }, [trackingData, trackKecamatan, trackKegiatan, trackSearch]);

  // Opsi kegiatan + jumlah desa yang mengambil tiap kegiatan (untuk filter Tracking).
  // Satu desa dihitung sekali per kegiatan walau punya beberapa proposal.
  const trackingKegiatanOptions = useMemo(() => {
    const map = new Map(); // id -> { id, nama, desaSet }
    trackingData.forEach(p => {
      const kegs = (p.kegiatan_list || []).map(k => ({ id: String(k.id), nama: k.nama_kegiatan }));
      if (!kegs.length && p.kegiatan_id) kegs.push({ id: String(p.kegiatan_id), nama: p.kegiatan_nama });
      kegs.forEach(({ id, nama }) => {
        if (!id) return;
        if (!map.has(id)) map.set(id, { id, nama, desaSet: new Set() });
        if (p.desa_id != null) map.get(id).desaSet.add(Number(p.desa_id));
      });
    });
    return Array.from(map.values())
      .map(({ id, nama, desaSet }) => ({ id, nama, desaCount: desaSet.size }))
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id'));
  }, [trackingData]);

  // ---- PARTISIPASI: desa sudah/belum mengajukan ----
  const partisipasiData = useMemo(() => {
    const submittedDesaIds = new Set(trackingData.filter(p => p.submitted_to_kecamatan).map(p => Number(p.desa_id)));
    const kecNameById = new Map(allKecamatan.map(k => [Number(k.id), k.nama]));
    const byKec = {};
    allKecamatan.forEach(k => { byKec[k.nama] = { sudah: [], belum: [] }; });
    allDesa.forEach(d => {
      const kecName = kecNameById.get(Number(d.kecamatan_id)) || 'Tanpa Kecamatan';
      if (!byKec[kecName]) byKec[kecName] = { sudah: [], belum: [] };
      (submittedDesaIds.has(Number(d.id)) ? byKec[kecName].sudah : byKec[kecName].belum).push(d.nama);
    });
    let totalSudah = 0, totalBelum = 0;
    // Statistik per-kecamatan (untuk grafik & identifikasi kecamatan yang tertinggal).
    const kecStats = Object.entries(byKec).map(([nama, v]) => {
      const sudah = v.sudah.length, belum = v.belum.length, total = sudah + belum;
      totalSudah += sudah; totalBelum += belum;
      return { nama, sudah, belum, total, pct: total ? Math.round((sudah / total) * 100) : 0 };
    });
    const total = totalSudah + totalBelum;
    const pct = total ? Math.round((totalSudah / total) * 100) : 0;
    const kecTuntas = kecStats.filter(k => k.total > 0 && k.belum === 0).length;
    return { byKec, totalSudah, totalBelum, total, pct, kecStats, kecTuntas, totalKec: kecStats.length };
  }, [allDesa, allKecamatan, trackingData]);

  // ---- STATISTIK: funnel & breakdown lintas-tahap ----
  const funnel = useMemo(() => {
    const f = { total: trackingData.length, desa: 0, kecamatan: 0, dpmd: 0, selesai: 0 };
    trackingData.forEach(p => {
      // Revisi/penolakan kecamatan mengembalikan proposal ke desa (submitted_to_kecamatan=FALSE)
      // namun secara tahap masih milik Kecamatan — kenali via kecamatan_status agar tidak
      // salah dihitung sebagai "Masih di Desa".
      const kecReturned = !p.submitted_to_dpmd && ['revision', 'rejected'].includes(p.kecamatan_status);
      if (kecReturned) f.kecamatan += 1;
      else if (!p.submitted_to_kecamatan) f.desa += 1;
      else if (!p.submitted_to_dpmd) f.kecamatan += 1;
      else if (p.dpmd_status === 'approved') f.selesai += 1;
      else f.dpmd += 1;
    });
    return f;
  }, [trackingData]);

  const perKategori = useMemo(() => {
    const out = {};
    KATEGORI_KEYS.forEach(k => { out[k] = { count: 0, anggaran: 0 }; });
    trackingData.forEach(p => {
      if (!out[p.jenis_kegiatan]) return;
      out[p.jenis_kegiatan].count += 1;
      out[p.jenis_kegiatan].anggaran += Number(p.anggaran_usulan || 0);
    });
    return out;
  }, [trackingData]);

  const perKecamatan = useMemo(() => {
    const map = new Map();
    trackingData.forEach(p => {
      const nama = p.kecamatan_nama || '-';
      const cur = map.get(nama) || { count: 0, anggaran: 0 };
      cur.count += 1; cur.anggaran += Number(p.anggaran_usulan || 0);
      map.set(nama, cur);
    });
    return Array.from(map.entries()).map(([nama, v]) => ({ nama, ...v })).sort((a, b) => b.count - a.count);
  }, [trackingData]);

  // ---- STATISTIK: rekapitulasi anggaran per kegiatan (1 proposal = 1 kegiatan) ----
  const perKegiatan = useMemo(() => {
    const map = new Map(); // id -> { id, nama, kategori, desaSet, proposalCount, anggaran }
    trackingData.forEach(p => {
      const primary = (p.kegiatan_list && p.kegiatan_list[0])
        ? { id: String(p.kegiatan_list[0].id), nama: p.kegiatan_list[0].nama_kegiatan, kategori: p.kegiatan_list[0].kategori || p.jenis_kegiatan }
        : (p.kegiatan_id ? { id: String(p.kegiatan_id), nama: p.kegiatan_nama, kategori: p.jenis_kegiatan } : null);
      if (!primary || !primary.id) return;
      if (!map.has(primary.id)) {
        map.set(primary.id, { id: primary.id, nama: primary.nama || '-', kategori: primary.kategori, desaSet: new Set(), proposalCount: 0, anggaran: 0 });
      }
      const e = map.get(primary.id);
      e.proposalCount += 1;
      e.anggaran += Number(p.anggaran_usulan || 0);
      if (p.desa_id != null) e.desaSet.add(Number(p.desa_id));
    });
    return Array.from(map.values())
      .map(e => ({ id: e.id, nama: e.nama, kategori: e.kategori, desaCount: e.desaSet.size, proposalCount: e.proposalCount, anggaran: e.anggaran }))
      .sort((a, b) => b.anggaran - a.anggaran);
  }, [trackingData]);

  // ---- Verifikasi ----
  const openVerify = (proposal, status) => setVerifyModal({ proposal, status, catatan: '' });

  const openEditDetail = (proposal) => {
    setEditModal({
      proposal,
      saving: false,
      data: {
        anggaran_usulan: proposal.anggaran_usulan ?? '',
        volume: proposal.volume || '',
        lokasi: proposal.lokasi || '',
        nama_kegiatan_spesifik: proposal.nama_kegiatan_spesifik || '',
      },
    });
  };

  const updateEditField = (field, value) => {
    setEditModal(current => current
      ? { ...current, data: { ...current.data, [field]: value } }
      : current);
  };

  const submitEditDetail = async () => {
    if (!editModal || editModal.saving) return;

    const rawAnggaran = editModal.data.anggaran_usulan;
    const anggaran = rawAnggaran === '' ? '' : Number(rawAnggaran);
    if (anggaran !== '' && (!Number.isFinite(anggaran) || anggaran < 0 || anggaran > 1_500_000_000)) {
      return Swal.fire('Validasi', 'Anggaran harus antara Rp 0 sampai Rp 1.500.000.000', 'warning');
    }

    setEditModal(current => current ? { ...current, saving: true } : current);
    try {
      await api.patch(`/dpmd/bankeu-perubahan/proposals/${editModal.proposal.id}/edit-detail`, {
        ...editModal.data,
        anggaran_usulan: anggaran,
      });
      setEditModal(null);
      await Promise.all([fetchData(), fetchTracking()]);
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Detail proposal berhasil diperbarui',
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (err) {
      setEditModal(current => current ? { ...current, saving: false } : current);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan perubahan', 'error');
    }
  };

  // Batalkan verifikasi SP & BA (salah pencet) -> SP & BA kembali menunggu verifikasi DPMD
  const cancelApproval = async (proposal) => {
    const result = await Swal.fire({
      title: 'Batalkan verifikasi SP & BA?',
      html: `<p class="text-sm text-slate-600">Verifikasi Surat Pengantar &amp; Berita Acara untuk <strong>${proposal.judul_proposal}</strong> akan dibatalkan dan dokumen kembali menunggu verifikasi DPMD. Status proposal tetap <strong>Diterima DPMD</strong>.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      confirmButtonText: 'Ya, batalkan',
      cancelButtonText: 'Tidak',
    });
    if (!result.isConfirmed) return;
    try {
      await api.patch(`/dpmd/bankeu-perubahan/proposals/${proposal.id}/cancel-approval`);
      Swal.fire('Berhasil', 'Verifikasi SP & BA dibatalkan', 'success');
      refreshAll();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal membatalkan persetujuan', 'error');
    }
  };

  // Troubleshoot Revisi: paksa kembalikan proposal nyangkut/salah ke Desa (reset semua tahap)
  const troubleshootRevision = async (proposal) => {
    const stageLabel = currentStage(proposal).label;
    const result = await Swal.fire({
      title: '🔧 Troubleshoot Revisi',
      html: `<div class="text-left space-y-3">
        <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p class="text-sm font-semibold text-indigo-800">${proposal.judul_proposal}</p>
          <p class="text-sm text-indigo-700">Desa ${proposal.desa_nama || ''} · Kec. ${proposal.kecamatan_nama || ''}</p>
          <p class="text-sm text-indigo-600 mt-1">Posisi saat ini: <strong>${stageLabel}</strong></p>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p class="text-sm text-amber-800">⚠️ Proposal akan dikembalikan ke <strong>Desa</strong> untuk direvisi. Semua status verifikasi (Kecamatan & DPMD), Berita Acara, Surat Pengantar, dan Quisioner akan di-reset. Dokumen desa tetap dipertahankan.</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Alasan Troubleshoot <span class="text-rose-500">*</span></label>
          <textarea id="swal-ts-catatan" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:border-amber-500" rows="3" placeholder="Contoh: Salah ACC / proposal nyangkut, desa minta revisi ulang..."></textarea>
        </div>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: '🔧 Ya, Revisi Proposal',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const catatan = document.getElementById('swal-ts-catatan')?.value;
        if (!catatan || catatan.trim().length === 0) {
          Swal.showValidationMessage('Alasan troubleshoot wajib diisi');
          return false;
        }
        return catatan.trim();
      },
    });
    if (!result.isConfirmed || !result.value) return;
    try {
      Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const res = await api.patch(`/dpmd/bankeu-perubahan/proposals/${proposal.id}/troubleshoot-revision`, { catatan: result.value });
      refreshAll();
      Swal.fire({
        icon: 'success',
        title: 'Troubleshoot Berhasil',
        html: `<p class="text-sm">${res.data?.message || 'Proposal berhasil dikembalikan ke Desa'}</p>`,
        timer: 3500,
        showConfirmButton: true,
      });
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal melakukan troubleshoot revisi', 'error');
    }
  };

  const submitVerify = async () => {
    if (!verifyModal) return;
    const { proposal, status, catatan } = verifyModal;
    if (status === 'revision' && !catatan.trim()) {
      return Swal.fire('Validasi', 'Catatan revisi untuk kecamatan wajib diisi', 'warning');
    }
    try {
      await api.patch(`/dpmd/bankeu-perubahan/proposals/${proposal.id}/verify`, { status, catatan });
      Swal.fire(
        'Berhasil',
        status === 'approved'
          ? 'Surat Pengantar & Berita Acara disetujui DPMD'
          : 'Proposal dikembalikan ke Kecamatan untuk revisi SP & BA',
        'success'
      );
      setVerifyModal(null);
      refreshAll();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal verifikasi', 'error');
    }
  };

  // ---- Export Excel (lintas-tahap) ----
  const exportExcel = () => {
    if (!trackingData.length) {
      return Swal.fire({ icon: 'warning', title: 'Data kosong', text: 'Belum ada data untuk diexport.', timer: 2000, showConfirmButton: false });
    }
    setExporting(true);
    try {
      const rows = trackingData.map((p, i) => ({
        No: i + 1,
        Kecamatan: p.kecamatan_nama || '',
        Desa: p.desa_nama || '',
        Kategori: KATEGORI_META[p.jenis_kegiatan]?.label || p.jenis_kegiatan || '',
        Judul: p.judul_proposal || '',
        Kegiatan: p.kegiatan_nama || '',
        Volume: p.volume || '',
        Lokasi: p.lokasi || '',
        'Anggaran (Rp)': Number(p.anggaran_usulan || 0),
        'Tahap Saat Ini': currentStage(p).label,
        'Status Kecamatan': p.kecamatan_status || '',
        'Catatan Kecamatan': p.kecamatan_catatan || '',
        'Status DPMD': p.dpmd_status || '',
        'Catatan DPMD': p.dpmd_catatan || '',
        'Tgl Dibuat': fmtDate(p.created_at),
        'Tgl Kirim Kec': fmtDate(p.submitted_at),
        'Tgl Verif Kec': fmtDate(p.kecamatan_verified_at),
        'Tgl Kirim DPMD': fmtDate(p.submitted_to_dpmd_at),
        'Tgl Keputusan DPMD': fmtDate(p.dpmd_verified_at),
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Tracking Bankeu Perubahan');

      // Sheet rekap per kategori: Wajib, Pilihan Infrastruktur, Pilihan Non-Infrastruktur.
      // Tiap sheet berisi rekap per kegiatan (jumlah desa yang ambil + total anggaran).
      const sheetNames = {
        wajib: 'Kegiatan Wajib',
        pilihan_infrastruktur: 'Pilihan Infrastruktur',
        pilihan_non_infrastruktur: 'Pilihan Non-Infrastruktur',
      };
      KATEGORI_KEYS.forEach(kat => {
        // Rekap per kegiatan dalam kategori ini (1 proposal = 1 kegiatan).
        const kegMap = new Map(); // id -> { nama, desaSet, proposalCount, anggaran }
        trackingData.forEach(p => {
          const primary = (p.kegiatan_list && p.kegiatan_list[0])
            ? { id: String(p.kegiatan_list[0].id), nama: p.kegiatan_list[0].nama_kegiatan, kategori: p.kegiatan_list[0].kategori || p.jenis_kegiatan }
            : (p.kegiatan_id ? { id: String(p.kegiatan_id), nama: p.kegiatan_nama, kategori: p.jenis_kegiatan } : null);
          if (!primary || !primary.id || primary.kategori !== kat) return;
          if (!kegMap.has(primary.id)) kegMap.set(primary.id, { nama: primary.nama || '-', desaSet: new Set(), proposalCount: 0, anggaran: 0 });
          const e = kegMap.get(primary.id);
          e.proposalCount += 1;
          e.anggaran += Number(p.anggaran_usulan || 0);
          if (p.desa_id != null) e.desaSet.add(Number(p.desa_id));
        });
        const katRows = Array.from(kegMap.values())
          .sort((a, b) => b.anggaran - a.anggaran)
          .map((e, i) => ({
            No: i + 1,
            Kegiatan: e.nama,
            'Jumlah Desa': e.desaSet.size,
            'Jumlah Proposal': e.proposalCount,
            'Total Anggaran (Rp)': e.anggaran,
          }));
        // Baris TOTAL di akhir.
        if (katRows.length) {
          katRows.push({
            No: '',
            Kegiatan: 'TOTAL',
            'Jumlah Desa': '',
            'Jumlah Proposal': katRows.reduce((s, r) => s + r['Jumlah Proposal'], 0),
            'Total Anggaran (Rp)': katRows.reduce((s, r) => s + r['Total Anggaran (Rp)'], 0),
          });
        }
        const katWs = XLSX.utils.json_to_sheet(
          katRows.length ? katRows : [{ Kegiatan: 'Belum ada data pada kategori ini' }]
        );
        XLSX.utils.book_append_sheet(wb, katWs, sheetNames[kat]);
      });

      XLSX.writeFile(wb, `bankeu-perubahan-tracking-${tahun}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const toggleKec = (id) => setExpandedKec(e => ({ ...e, [id]: e[id] === undefined ? false : !e[id] }));
  const isKecExpanded = (id) => expandedKec[id] !== false;          // default terbuka
  const toggleDesa = (key) => setExpandedDesa(e => ({ ...e, [key]: !e[key] }));
  const isDesaExpanded = (key) => expandedDesa[key] === true;       // default tertutup

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="w-full mx-auto space-y-4">
        {/* Tab bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-wrap items-center gap-1.5">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
                <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={refreshAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
              <LuRefreshCw className="w-4 h-4" /> <span className="hidden md:inline">Refresh</span>
            </button>
            <button onClick={exportExcel} disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-60">
              <LuDownload className="w-4 h-4" /> <span className="hidden md:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {activeTab === 'archive' && (
          <ArchiveTab
            tahun={tahun} stats={stats} loading={loading}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterKategori={filterKategori} setFilterKategori={setFilterKategori}
            filterKecamatan={filterKecamatan} setFilterKecamatan={setFilterKecamatan}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            kecamatanOptions={kecamatanOptions}
            filteredProposals={filteredProposals} proposals={proposals}
            groupedByKecamatan={groupedByKecamatan}
            isKecExpanded={isKecExpanded} toggleKec={toggleKec}
            isDesaExpanded={isDesaExpanded} toggleDesa={toggleDesa}
            openVerify={openVerify} cancelApproval={cancelApproval}
            troubleshootRevision={troubleshootRevision} openEditDetail={openEditDetail}
          />
        )}

        {activeTab === 'tracking' && (
          <TrackingTab
            loading={loadingTracking} data={trackingFiltered}
            search={trackSearch} setSearch={setTrackSearch}
            kecamatan={trackKecamatan} setKecamatan={setTrackKecamatan}
            kegiatan={trackKegiatan} setKegiatan={setTrackKegiatan}
            kegiatanOptions={trackingKegiatanOptions}
            kecamatanOptions={kecamatanOptions} total={trackingData.length}
            onTroubleshoot={troubleshootRevision} onEdit={openEditDetail}
          />
        )}

        {activeTab === 'partisipasi' && (
          <PartisipasiTab loading={loadingTracking} data={partisipasiData} />
        )}

        {activeTab === 'statistics' && (
          <StatisticsTab stats={stats} funnel={funnel} perKategori={perKategori} perKecamatan={perKecamatan} perKegiatan={perKegiatan} partisipasi={partisipasiData} tahun={tahun} />
        )}
      </div>

      {editModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[calc(100vh-1.5rem)] overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 sm:px-6 py-4 border-b border-slate-200 rounded-t-2xl z-10">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <LuPencil className="w-5 h-5 text-indigo-600" /> Edit Detail Proposal
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Desa {editModal.proposal.desa_nama || '-'} · {editModal.proposal.judul_proposal}
              </p>
            </div>
            <div className="px-4 sm:px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Kegiatan Spesifik</label>
                <input
                  type="text"
                  maxLength={255}
                  value={editModal.data.nama_kegiatan_spesifik}
                  onChange={e => updateEditField('nama_kegiatan_spesifik', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  placeholder="Nama kegiatan spesifik"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Volume</label>
                <input
                  type="text"
                  maxLength={255}
                  value={editModal.data.volume}
                  onChange={e => updateEditField('volume', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  placeholder="Contoh: 1 paket"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Lokasi</label>
                <input
                  type="text"
                  maxLength={255}
                  value={editModal.data.lokasi}
                  onChange={e => updateEditField('lokasi', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  placeholder="Lokasi kegiatan"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Anggaran Usulan</label>
                <input
                  type="number"
                  min="0"
                  max="1500000000"
                  step="1"
                  value={editModal.data.anggaran_usulan}
                  onChange={e => updateEditField('anggaran_usulan', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  placeholder="Maksimal 1500000000"
                />
                <p className="text-xs text-slate-500 mt-1">Maksimal Rp 1.500.000.000 per proposal.</p>
              </div>
            </div>
            <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 rounded-b-2xl">
              <button
                onClick={() => setEditModal(null)}
                disabled={editModal.saving}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={submitEditDetail}
                disabled={editModal.saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-60"
              >
                {editModal.saving
                  ? <LuRefreshCw className="w-4 h-4 animate-spin" />
                  : <LuSave className="w-4 h-4" />}
                {editModal.saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {verifyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {verifyModal.status === 'approved' ? 'Setujui Dokumen Kecamatan (SP & BA)' : 'Revisi Dokumen Kecamatan (SP & BA)'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{verifyModal.proposal.judul_proposal}</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className={`flex items-start gap-2 text-xs rounded-xl p-3 border ${
                verifyModal.status === 'approved'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                <LuInfo className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  {verifyModal.status === 'approved'
                    ? 'DPMD memverifikasi Surat Pengantar & Berita Acara dari kecamatan (bukan menilai isi proposal desa). Pastikan kedua dokumen sudah sesuai sebelum menyetujui.'
                    : 'Proposal akan dikembalikan ke Kecamatan untuk men-generate ulang Surat Pengantar & Berita Acara. Status verifikasi kecamatan & proposal desa tetap dipertahankan.'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Catatan {verifyModal.status === 'revision' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  value={verifyModal.catatan}
                  onChange={e => setVerifyModal({ ...verifyModal, catatan: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  placeholder={verifyModal.status === 'approved' ? 'Catatan (opsional)' : 'Tulis bagian SP / BA yang perlu diperbaiki kecamatan...'}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setVerifyModal(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors">Batal</button>
              <button onClick={submitVerify}
                className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm transition-colors ${
                  verifyModal.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}
              >{verifyModal.status === 'approved' ? 'Setujui SP & BA' : 'Kirim Revisi ke Kecamatan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }) => (
  <div className={`rounded-xl border border-slate-100 p-3.5 ${color}`}>
    <div className="text-xs font-medium opacity-70">{label}</div>
    <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
  </div>
);

// ============================ ARSIP ============================
const ArchiveTab = ({
  tahun, stats, loading, filterStatus, setFilterStatus, filterKategori, setFilterKategori,
  filterKecamatan, setFilterKecamatan, searchQuery, setSearchQuery, kecamatanOptions,
  filteredProposals, proposals, groupedByKecamatan,
  isKecExpanded, toggleKec, isDesaExpanded, toggleDesa, openVerify, cancelApproval, troubleshootRevision,
  openEditDetail,
}) => (
  <div className="space-y-4">
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-3">
        <LuClipboardCheck className="w-5 h-5 text-indigo-600" /> Arsip Proposal Masuk DPMD · TA {tahun}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Masuk" value={stats.total || 0} color="bg-slate-50 text-slate-700" />
        <StatCard label="Pending" value={stats.pending || 0} color="bg-amber-50 text-amber-700" />
        <StatCard label="Disetujui" value={stats.approved || 0} color="bg-emerald-50 text-emerald-700" />
        <StatCard label="Ditolak" value={stats.rejected || 0} color="bg-rose-50 text-rose-700" />
        <StatCard label="Revisi" value={stats.revision || 0} color="bg-orange-50 text-orange-700" />
      </div>
    </div>

    {/* Filters */}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><LuFilter className="w-4 h-4" /> Filter:</div>
      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500">
        <option value="all">Semua Status</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="revision">Revision</option>
      </select>
      <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500">
        <option value="all">Semua Kategori</option>
        {KATEGORI_KEYS.map(k => <option key={k} value={k}>{KATEGORI_META[k].label}</option>)}
      </select>
      <select value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}
        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500">
        <option value="all">Semua Kecamatan</option>
        {kecamatanOptions.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
      </select>
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari judul / desa / kecamatan / kegiatan..."
          className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500" />
      </div>
      <span className="ml-auto text-xs text-slate-500">{filteredProposals.length} dari {proposals.length} proposal</span>
    </div>

    {loading ? (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">Memuat data...</div>
    ) : filteredProposals.length === 0 ? (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <LuInfo className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-600 font-medium">{proposals.length === 0 ? 'Belum ada proposal yang masuk ke DPMD' : 'Tidak ada proposal yang sesuai filter'}</p>
      </div>
    ) : (
      <div className="space-y-4">
        {groupedByKecamatan.map(kec => {
          const kecOpen = isKecExpanded(kec.kecId);
          return (
            <div key={kec.kecId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Header Kecamatan */}
              <button onClick={() => toggleKec(kec.kecId)}
                className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                    {kecOpen ? <LuChevronDown className="w-5 h-5 text-white" /> : <LuChevronRight className="w-5 h-5 text-white" />}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                      <LuMapPin className="w-4 h-4 text-indigo-600" /> Kec. {kec.kecNama}
                    </h3>
                    <p className="text-xs text-slate-500">{kec.desas.length} desa · {kec.count} proposal · {rupiah(kec.anggaran)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold px-3 py-1 rounded-lg border bg-indigo-50 text-indigo-700 border-indigo-200">{kec.count}</span>
              </button>

              {/* Daftar Desa (default tertutup) */}
              {kecOpen && (
                <div className="p-3 space-y-2 bg-slate-50/60">
                  {kec.desas.map(desa => {
                    const desaKey = `${kec.kecId}::${desa.desaId}`;
                    const desaOpen = isDesaExpanded(desaKey);
                    return (
                      <div key={desaKey} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <button onClick={() => toggleDesa(desaKey)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                              {desaOpen ? <LuChevronDown className="w-4 h-4 text-white" /> : <LuChevronRight className="w-4 h-4 text-white" />}
                            </div>
                            <div className="text-left min-w-0">
                              <h4 className="font-bold text-slate-800 text-sm truncate">Desa {desa.desaNama}</h4>
                              <p className="text-[11px] text-slate-500">{desa.count} proposal</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                              <LuDollarSign className="w-3.5 h-3.5" /> {rupiah(desa.anggaran)}
                            </span>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">{desa.count}</span>
                          </div>
                        </button>
                        {/* Total anggaran versi mobile */}
                        {desaOpen && (
                          <div className="divide-y divide-slate-100 border-t border-slate-100">
                            <div className="sm:hidden px-4 py-2 bg-amber-50 text-amber-800 text-xs font-bold flex items-center gap-1">
                              <LuDollarSign className="w-3.5 h-3.5" /> Total {rupiah(desa.anggaran)}
                            </div>
                            {desa.items.map(p => (
                              <ProposalRow key={p.id} proposal={p}
                                onApprove={() => openVerify(p, 'approved')}
                                onRevision={() => openVerify(p, 'revision')}
                                onCancelApproval={() => cancelApproval(p)}
                                onTroubleshoot={() => troubleshootRevision(p)}
                                onEdit={() => openEditDetail(p)} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const ProposalRow = ({ proposal, onApprove, onRevision, onCancelApproval, onTroubleshoot, onEdit }) => {
  const isPending = !proposal.dpmd_status || proposal.dpmd_status === 'pending';
  const isApproved = proposal.dpmd_status === 'approved';
  const [showHistory, setShowHistory] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const firstKegiatan = proposal.kegiatan_list?.[0];
  const baUrl = proposal.berita_acara_path
    ? `${imageBaseUrl}${proposal.berita_acara_path.startsWith('/') ? '' : '/'}${proposal.berita_acara_path}`
    : null;
  const spUrl = proposal.surat_pengantar_kecamatan_path
    ? `${imageBaseUrl}${proposal.surat_pengantar_kecamatan_path.startsWith('/') ? '' : '/'}${proposal.surat_pengantar_kecamatan_path}`
    : null;

  return (
    <div className="px-5 py-4">
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <StatusBadge status={proposal.dpmd_status || 'pending'} />
            {KATEGORI_META[proposal.jenis_kegiatan] && (
              <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${KATEGORI_META[proposal.jenis_kegiatan].badge}`}>
                {KATEGORI_META[proposal.jenis_kegiatan].label}
              </span>
            )}
          </div>
          <h4 className="font-bold text-slate-800 text-sm md:text-base leading-tight">{proposal.judul_proposal}</h4>
          {firstKegiatan && <p className="text-xs text-slate-600 mt-1"><span className="font-semibold">Kegiatan:</span> {firstKegiatan.nama_kegiatan}</p>}
          {proposal.nama_kegiatan_spesifik && <p className="text-sm text-slate-600 mt-0.5">{proposal.nama_kegiatan_spesifik}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
            {proposal.volume && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                <LuPackage className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" /><span className="truncate">Vol: <strong className="text-slate-700">{proposal.volume}</strong></span>
              </span>
            )}
            {proposal.lokasi && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                <LuMapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" /><span className="truncate">{proposal.lokasi}</span>
              </span>
            )}
            {proposal.anggaran_usulan && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-semibold">
                <LuDollarSign className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">Rp {Number(proposal.anggaran_usulan).toLocaleString('id-ID')}</span>
              </span>
            )}
          </div>
          {proposal.kecamatan_catatan && (
            <div className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-600"><strong className="text-slate-700">Catatan Kecamatan:</strong> {proposal.kecamatan_catatan}</div>
          )}
          {proposal.dpmd_catatan && (
            <div className="mt-2 text-xs bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-indigo-800"><strong>Catatan DPMD:</strong> {proposal.dpmd_catatan}</div>
          )}
          {proposal.troubleshoot_catatan && (
            <div className="mt-2 text-xs bg-rose-50 border border-rose-100 rounded-lg p-2 text-rose-700 flex items-start gap-1.5">
              <LuWrench className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Dikembalikan DPMD (Troubleshoot){proposal.troubleshoot_at ? ` · ${fmtDate(proposal.troubleshoot_at)}` : ''}:</strong> {proposal.troubleshoot_catatan}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0 md:max-w-[20rem] md:justify-end">
          {/* Utilitas & dokumen — netral agar tidak bersaing dengan aksi keputusan */}
          {proposal.file_proposal && (
            <a href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/${proposal.file_proposal}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
              <LuEye className="w-3.5 h-3.5" /> File
            </a>
          )}
          {baUrl && (
            <a href={baUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
              title="Lihat Berita Acara Verifikasi Kecamatan">
              <LuFileText className="w-3.5 h-3.5" /> BA
            </a>
          )}
          {spUrl && (
            <a href={spUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
              title="Lihat Surat Pengantar Kecamatan">
              <LuStamp className="w-3.5 h-3.5" /> SP
            </a>
          )}
          <button onClick={() => setShowTracking(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
            <LuRoute className="w-3.5 h-3.5" /> Lacak
          </button>
          <button onClick={() => setShowHistory(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
            <LuHistory className="w-3.5 h-3.5" /> Riwayat
          </button>
          <button onClick={onEdit}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
            <LuPencil className="w-3.5 h-3.5" /> Edit
          </button>

          {/* Aksi keputusan — diberi warna semantik & penekanan */}
          {isPending && (
            <>
              <button onClick={onApprove}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                title="Setujui Surat Pengantar & Berita Acara dari kecamatan">
                <LuCheck className="w-3.5 h-3.5" /> Setujui SP & BA
              </button>
              <button onClick={onRevision}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg transition-colors"
                title="Kembalikan ke kecamatan untuk revisi Surat Pengantar & Berita Acara">
                <LuRefreshCw className="w-3.5 h-3.5" /> Revisi BA/SP
              </button>
            </>
          )}
          {isApproved && (
            <button onClick={onCancelApproval}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg transition-colors"
              title="Batalkan verifikasi SP & BA (salah pencet) — dokumen kembali menunggu verifikasi DPMD">
              <LuRotateCcw className="w-3.5 h-3.5" /> Batalkan
            </button>
          )}
          {onTroubleshoot && (
            <button onClick={onTroubleshoot}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors"
              title="Troubleshoot: paksa kembalikan proposal ke Desa untuk direvisi (reset semua tahap)">
              <LuWrench className="w-3.5 h-3.5" /> Troubleshoot
            </button>
          )}
        </div>
      </div>

      {showHistory && (
        <BankeuRevisionHistoryModal apiBase="/dpmd/bankeu-perubahan" proposalId={proposal.id}
          proposalTitle={proposal.judul_proposal} onClose={() => setShowHistory(false)} />
      )}
      {showTracking && (
        <BankeuPerubahanTrackingModal proposal={proposal} onClose={() => setShowTracking(false)} />
      )}
    </div>
  );
};

// ============================ TRACKING ============================
const StageDots = ({ proposal }) => {
  const kec = proposal.kecamatan_status || 'pending';
  const dpmd = proposal.dpmd_status || 'pending';
  const stages = [
    { label: 'Dibuat', done: !!proposal.created_at },
    { label: 'Kirim Kec', done: !!proposal.submitted_to_kecamatan },
    { label: 'Verif Kec', done: kec !== 'pending', status: kec },
    { label: 'Kirim DPMD', done: !!proposal.submitted_to_dpmd },
    { label: 'Keputusan DPMD', done: dpmd !== 'pending', status: dpmd },
  ];
  const dotColor = (s) => {
    if (s.status === 'approved') return 'bg-emerald-500';
    if (s.status === 'rejected') return 'bg-rose-500';
    if (s.status === 'revision') return 'bg-orange-500';
    return s.done ? 'bg-emerald-500' : 'bg-slate-300';
  };
  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex flex-col items-center" title={s.label}>
            <span className={`w-3 h-3 rounded-full ${dotColor(s)}`} />
          </div>
          {i < stages.length - 1 && <span className={`w-4 h-0.5 ${stages[i + 1].done || s.status === 'approved' ? 'bg-emerald-200' : 'bg-slate-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};

const TrackingTab = ({
  loading, data, search, setSearch, kecamatan, setKecamatan, kecamatanOptions,
  kegiatan, setKegiatan, kegiatanOptions, total, onTroubleshoot, onEdit,
}) => {
  const [trackProposal, setTrackProposal] = useState(null);
  // Default: semua grup status TERTUTUP. openMap[key] === true berarti grup dibuka.
  const [openMap, setOpenMap] = useState({});
  const totalAnggaran = useMemo(
    () => data.reduce((s, p) => s + (Number(p.anggaran_usulan) || 0), 0),
    [data]
  );

  // Ringkasan kegiatan terpilih: berapa desa & proposal yang mengambil kegiatan ini
  // (mengikuti filter kecamatan/pencarian yang aktif, karena `data` sudah terfilter).
  const selectedKegiatanInfo = useMemo(() => {
    if (kegiatan === 'all') return null;
    const desaSet = new Set();
    let proposals = 0, anggaran = 0;
    data.forEach(p => {
      if (p.desa_id != null) desaSet.add(Number(p.desa_id));
      proposals += 1;
      anggaran += Number(p.anggaran_usulan) || 0;
    });
    const opt = kegiatanOptions.find(k => String(k.id) === String(kegiatan));
    return { nama: opt?.nama || 'Kegiatan', desaCount: desaSet.size, proposals, anggaran };
  }, [kegiatan, data, kegiatanOptions]);

  // Kelompokkan per status (tahap saat ini), diurutkan mengikuti alur Desa→Kec→DPMD.
  const grouped = useMemo(() => {
    const m = new Map();
    data.forEach(p => {
      const { key } = currentStage(p);
      if (!m.has(key)) m.set(key, { items: [], total: 0 });
      const g = m.get(key);
      g.items.push(p);
      g.total += Number(p.anggaran_usulan) || 0;
    });
    return m;
  }, [data]);

  const sections = STAGE_ORDER.filter(s => grouped.has(s.key));
  const toggle = (key) => setOpenMap(o => ({ ...o, [key]: !o[key] }));
  const expandAll = () => setOpenMap(Object.fromEntries(sections.map(s => [s.key, true])));
  const collapseAll = () => setOpenMap({});

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><LuActivity className="w-4 h-4 text-indigo-600" /> Tracking lintas-tahap</div>
        <select value={kecamatan} onChange={e => setKecamatan(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500">
          <option value="all">Semua Kecamatan</option>
          {kecamatanOptions.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <select value={kegiatan} onChange={e => setKegiatan(e.target.value)}
          className="max-w-sm px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500">
          <option value="all">Semua Kegiatan</option>
          {kegiatanOptions.map(k => (
            <option key={k.id} value={k.id}>{k.nama}{typeof k.desaCount === 'number' ? ` (${k.desaCount} desa)` : ''}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul / desa / kecamatan / kegiatan..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500" />
        </div>
        <span className="ml-auto text-xs text-slate-500">{data.length} dari {total} proposal</span>
      </div>

      {/* Ringkasan total anggaran usulan (mengikuti filter) */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-white/90">
          <LuDollarSign className="w-5 h-5" />
          <span className="text-sm font-semibold">Total Anggaran Usulan ({data.length} proposal)</span>
        </div>
        <div className="text-xl md:text-2xl font-bold text-white">{rupiah(totalAnggaran)}</div>
      </div>

      {/* Ringkasan kegiatan terpilih: berapa desa yang mengambil kegiatan ini */}
      {selectedKegiatanInfo && (
        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2 text-indigo-800 min-w-0">
            <LuUsers className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold truncate">Kegiatan: {selectedKegiatanInfo.nama}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-indigo-700 tabular-nums">{selectedKegiatanInfo.desaCount}</span>
            <span className="text-xs font-semibold text-indigo-600">desa mengambil</span>
          </div>
          <div className="flex items-center gap-4 ml-auto text-xs font-semibold text-indigo-700">
            <span>{selectedKegiatanInfo.proposals} proposal</span>
            <span className="hidden sm:inline">·</span>
            <span>{rupiah(selectedKegiatanInfo.anggaran)}</span>
          </div>
        </div>
      )}

      {/* Ikhtisar status: klik chip untuk buka/tutup grup terkait */}
      {!loading && data.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex flex-wrap items-center gap-2">
          {sections.map(s => {
            const g = grouped.get(s.key);
            return (
              <button key={s.key} onClick={() => toggle(s.key)} title={`${g.items.length} proposal · ${rupiah(g.total)}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-opacity ${TONE[s.tone]} ${!openMap[s.key] ? 'opacity-40' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${TONE_DOT[s.tone]}`} /> {s.label}
                <span className="ml-0.5 px-1.5 rounded-full bg-white/70">{g.items.length}</span>
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1">
            <button onClick={expandAll} className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Buka semua</button>
            <button onClick={collapseAll} className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Tutup semua</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">Memuat tracking...</div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <LuInfo className="w-12 h-12 mx-auto text-slate-300 mb-3" /><p className="text-slate-600 font-medium">Tidak ada data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map(s => {
            const g = grouped.get(s.key);
            const open = !!openMap[s.key];
            return (
              <div key={s.key} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header status */}
                <button onClick={() => toggle(s.key)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {open ? <LuChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <LuChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${TONE_DOT[s.tone]}`} />
                    <span className="font-bold text-slate-800 text-sm truncate">{s.label}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${TONE[s.tone]}`}>{g.items.length}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 flex-shrink-0">{rupiah(g.total)}</span>
                </button>
                {open && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {g.items.map(p => (
                      <div key={p.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-500">Kec <strong className="text-slate-800">{p.kecamatan_nama}</strong> · Desa <strong className="text-slate-800">{p.desa_nama}</strong></span>
                          <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">{p.judul_proposal}</p>
                          {(p.kegiatan_list || []).length > 0 && (
                            <p className="mt-0.5 text-xs text-indigo-700">
                              Kegiatan: {(p.kegiatan_list || []).map(k => k.nama_kegiatan).join(', ')}
                            </p>
                          )}
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-50 text-amber-800 text-xs font-semibold rounded">
                            <LuDollarSign className="w-3.5 h-3.5" /> {rupiah(p.anggaran_usulan)}
                          </span>
                          {p.troubleshoot_catatan && (
                            <div className="mt-1.5 text-xs bg-rose-50 border border-rose-200 rounded p-2 text-rose-800 flex items-start gap-1.5">
                              <LuWrench className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>
                                <strong>Dikembalikan DPMD (Troubleshoot){p.troubleshoot_at ? ` · ${fmtDate(p.troubleshoot_at)}` : ''}:</strong> {p.troubleshoot_catatan}
                              </span>
                            </div>
                          )}
                        </div>
                        <StageDots proposal={p} />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => onEdit(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                            <LuPencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button onClick={() => setTrackProposal(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                            <LuRoute className="w-3.5 h-3.5" /> Lacak
                          </button>
                          {onTroubleshoot && (
                            <button onClick={() => onTroubleshoot(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors"
                              title="Troubleshoot: paksa kembalikan proposal ini ke Desa untuk direvisi (reset semua tahap)">
                              <LuWrench className="w-3.5 h-3.5" /> Troubleshoot
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {trackProposal && <BankeuPerubahanTrackingModal proposal={trackProposal} onClose={() => setTrackProposal(null)} />}
    </div>
  );
};

// ============================ PARTISIPASI ============================
// Gauge radial persentase partisipasi (dipakai di tab Partisipasi & dashboard Statistik).
const ParticipationGauge = ({ sudah = 0, belum = 0, height = 200 }) => {
  const total = sudah + belum;
  const pct = total ? Math.round((sudah / total) * 100) : 0;
  const data = [{ name: 'Sudah', value: pct, fill: '#10b981' }];
  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={20} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-extrabold text-emerald-600 tabular-nums leading-none">{pct}%</span>
        <span className="text-[11px] text-slate-400 font-semibold mt-1">desa sudah</span>
      </div>
    </div>
  );
};

const KPI_ACCENT = {
  slate:   { bg: 'from-slate-50',   text: 'text-slate-700',   icon: 'text-slate-400',   bar: 'bg-slate-400' },
  emerald: { bg: 'from-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500', bar: 'bg-emerald-500' },
  rose:    { bg: 'from-rose-50',    text: 'text-rose-600',    icon: 'text-rose-400',    bar: 'bg-rose-400' },
  indigo:  { bg: 'from-indigo-50',  text: 'text-indigo-600',  icon: 'text-indigo-400',  bar: 'bg-indigo-500' },
};
const KpiTile = ({ label, value, sub, icon: Icon, accent = 'slate', pct }) => {
  const a = KPI_ACCENT[accent] || KPI_ACCENT.slate;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br ${a.bg} to-white p-4 flex flex-col`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${a.icon}`} />}
      </div>
      <div className={`text-3xl font-extrabold mt-1 tabular-nums ${a.text}`}>{value}</div>
      {typeof pct === 'number' && (
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
          <div className={`h-full ${a.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {sub && <span className="text-[10px] text-slate-400 mt-1.5">{sub}</span>}
    </div>
  );
};

const PartisipasiTab = ({ loading, data }) => {
  const [tab, setTab] = useState('belum');
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');

  if (loading) return <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">Memuat partisipasi...</div>;

  const { totalSudah = 0, totalBelum = 0, total = 0, pct = 0, kecTuntas = 0, totalKec = 0 } = data;
  const belumPct = total ? Math.round((totalBelum / total) * 100) : 0;

  // Urut kecamatan: yang paling banyak BELUM di atas (paling perlu perhatian).
  const kecBar = [...(data.kecStats || [])]
    .filter(k => k.total > 0)
    .sort((a, b) => b.belum - a.belum || b.total - a.total);

  const kecList = Object.entries(data.byKec)
    .map(([nama, v]) => ({ nama, sudah: v.sudah, belum: v.belum }))
    .filter(k => !search || k.nama.toLowerCase().includes(search.toLowerCase()) || k.sudah.some(d => d.toLowerCase().includes(search.toLowerCase())) || k.belum.some(d => d.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => tab === 'belum' ? b.belum.length - a.belum.length : b.sudah.length - a.sudah.length);

  return (
    <div className="space-y-4">
      {/* Ringkasan infografis: gauge % + KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Tingkat Partisipasi Desa" icon={LuUsers} iconColor="text-indigo-600"
          subtitle="Desa yang sudah mengajukan ke Kecamatan">
          <ParticipationGauge sudah={totalSudah} belum={totalBelum} height={210} />
          <div className="flex items-center justify-center gap-4 mt-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Sudah {totalSudah}</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Belum {totalBelum}</span>
          </div>
        </ChartCard>

        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          <KpiTile label="Total Desa" value={total} sub={`tersebar di ${totalKec} kecamatan`} icon={LuMapPin} accent="slate" />
          <KpiTile label="Sudah Mengajukan" value={totalSudah} sub={`${pct}% dari total desa`} icon={LuCheck} accent="emerald" pct={pct} />
          <KpiTile label="Belum Mengajukan" value={totalBelum} sub={`${belumPct}% masih perlu didorong`} icon={LuX} accent="rose" pct={belumPct} />
          <KpiTile label="Kecamatan Tuntas" value={kecTuntas} sub={`dari ${totalKec} kecamatan (100% desa)`} icon={LuClipboardCheck} accent="indigo" />
        </div>
      </div>

      {/* Per-kecamatan: sudah vs belum (stacked bar) */}
      <ChartCard title="Partisipasi per Kecamatan" icon={LuMapPin} iconColor="text-indigo-600"
        subtitle="Diurutkan dari yang paling banyak desa BELUM mengajukan">
        {kecBar.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">Belum ada data.</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, kecBar.length * 30)}>
            <BarChart data={kecBar} layout="vertical" margin={{ left: 0, right: 34, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <YAxis type="category" dataKey="nama" width={92} tick={{ fontSize: 11, fill: '#475569' }} interval={0} />
              <RTooltip cursor={{ fill: '#f8fafc' }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return <TipBox label={d.nama} rows={[
                  { name: 'Sudah', value: `${d.sudah} (${d.pct}%)`, color: '#10b981' },
                  { name: 'Belum', value: d.belum, color: '#fb7185' },
                  { name: 'Total desa', value: d.total },
                ]} />;
              }} />
              <Bar dataKey="sudah" stackId="a" fill="#10b981" barSize={16} radius={[6, 0, 0, 6]} />
              <Bar dataKey="belum" stackId="a" fill="#fda4af" barSize={16} radius={[0, 6, 6, 0]}>
                <LabelList dataKey="belum" position="right" formatter={(v) => (v > 0 ? v : '')} style={{ fontSize: 11, fontWeight: 700, fill: '#e11d48' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Drill-down: daftar desa per kecamatan */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setTab('belum')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'belum' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Belum Mengajukan ({totalBelum})</button>
          <button onClick={() => setTab('sudah')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'sudah' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Sudah Mengajukan ({totalSudah})</button>
          <div className="relative flex-1 min-w-[160px] max-w-xs ml-auto">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kecamatan / desa..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500" />
          </div>
        </div>
      </div>

      {kecList.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">Data desa/kecamatan belum tersedia.</div>
      ) : (
        <div className="space-y-2">
          {kecList.map(kec => {
            const items = tab === 'sudah' ? kec.sudah : kec.belum;
            const isOpen = expanded[kec.nama];
            const totalDesa = kec.sudah.length + kec.belum.length;
            const kpct = totalDesa ? Math.round((kec.sudah.length / totalDesa) * 100) : 0;
            return (
              <div key={kec.nama} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <button onClick={() => setExpanded(e => ({ ...e, [kec.nama]: !e[kec.nama] }))}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? <LuChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <LuChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                    <span className="font-semibold text-slate-800 text-sm truncate">{kec.nama}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:flex items-center gap-1.5">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${kpct}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums w-8 text-right">{kpct}%</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">{kec.sudah.length} sudah</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-semibold text-[11px]">{kec.belum.length} belum</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 pt-1 flex flex-wrap gap-1.5">
                    {items.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Tidak ada desa pada kategori ini.</span>
                    ) : items.map(d => (
                      <span key={d} className={`px-2 py-1 rounded-lg text-xs font-medium ${tab === 'sudah' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>{d}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================ STATISTIK ============================
const CHART_COLORS = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', revision: '#f97316' };
const KATEGORI_HEX = { wajib: '#ef4444', pilihan_infrastruktur: '#f97316', pilihan_non_infrastruktur: '#3b82f6' };

// Rupiah ringkas untuk label/axis chart (Rp 7,0 M · Rp 16 Jt · Rp 250 Rb)
const compactRupiah = (n) => {
  const v = Number(n || 0);
  if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1).replace('.', ',')} M`;
  if (v >= 1e6) return `Rp ${Math.round(v / 1e6)} Jt`;
  if (v >= 1e3) return `Rp ${Math.round(v / 1e3)} Rb`;
  return `Rp ${v}`;
};

const TipBox = ({ label, rows }) => (
  <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
    {label && <p className="font-bold text-slate-800 mb-1">{label}</p>}
    {rows.map((r, i) => (
      <p key={i} className="flex items-center gap-1.5 text-slate-600 leading-relaxed">
        {r.color && <span className="w-2 h-2 rounded-full inline-block" style={{ background: r.color }} />}
        <span>{r.name}:</span> <strong className="text-slate-800">{r.value}</strong>
      </p>
    ))}
  </div>
);

const ChartCard = ({ title, icon: Icon, iconColor, subtitle, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
    <div className="mb-4">
      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${iconColor || 'text-slate-500'}`} />} {title}
      </h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const KPI_META = [
  { key: 'total', label: 'Total Masuk', icon: LuFolder, ring: 'text-slate-500', bar: 'bg-slate-400', bg: 'from-slate-50' },
  { key: 'pending', label: 'Pending', icon: LuHistory, ring: 'text-amber-600', bar: 'bg-amber-500', bg: 'from-amber-50' },
  { key: 'approved', label: 'Disetujui', icon: LuCheck, ring: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'from-emerald-50' },
  { key: 'rejected', label: 'Ditolak', icon: LuX, ring: 'text-rose-600', bar: 'bg-rose-500', bg: 'from-rose-50' },
  { key: 'revision', label: 'Revisi', icon: LuMessageSquare, ring: 'text-orange-600', bar: 'bg-orange-500', bg: 'from-orange-50' },
];

const StatisticsTab = ({ stats, funnel, perKategori, perKecamatan, perKegiatan = [], partisipasi, tahun }) => {
  const totalAnggaran = stats.total_anggaran || Object.values(perKategori).reduce((s, v) => s + v.anggaran, 0);
  const totalMasuk = Number(stats.total) || 0;

  const statusData = [
    { name: 'Pending', value: Number(stats.pending) || 0, color: CHART_COLORS.pending },
    { name: 'Disetujui', value: Number(stats.approved) || 0, color: CHART_COLORS.approved },
    { name: 'Ditolak', value: Number(stats.rejected) || 0, color: CHART_COLORS.rejected },
    { name: 'Revisi', value: Number(stats.revision) || 0, color: CHART_COLORS.revision },
  ];
  const statusNonZero = statusData.filter(d => d.value > 0);

  const tahapData = [
    { name: 'Masih di Desa', value: funnel.desa || 0, color: '#94a3b8' },
    { name: 'Di Kecamatan', value: funnel.kecamatan || 0, color: '#f59e0b' },
    { name: 'Diterima DPMD', value: funnel.dpmd || 0, color: '#3b82f6' },
    { name: 'SP & BA Diverifikasi', value: funnel.selesai || 0, color: '#10b981' },
  ];

  const kategoriData = KATEGORI_KEYS.map(k => ({
    key: k,
    name: KATEGORI_META[k].label,
    count: perKategori[k]?.count || 0,
    anggaran: perKategori[k]?.anggaran || 0,
    fill: KATEGORI_HEX[k],
  }));
  const totalKategoriCount = kategoriData.reduce((s, d) => s + d.count, 0);
  const maxKategoriCount = Math.max(...kategoriData.map(d => d.count), 1);

  const kecSorted = [...perKecamatan].sort((a, b) => b.count - a.count);
  const kecTop = kecSorted.slice(0, 12);

  return (
    <div className="space-y-4">
      {/* Header + KPI */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          <LuChartColumn className="w-5 h-5 text-cyan-600" /> Statistik Verifikasi DPMD · TA {tahun}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {KPI_META.map(m => {
            const val = Number(stats[m.key]) || 0;
            const pct = totalMasuk ? Math.round((val / totalMasuk) * 100) : 0;
            const Icon = m.icon;
            return (
              <div key={m.key} className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br ${m.bg} to-white p-4`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{m.label}</span>
                  <Icon className={`w-4 h-4 ${m.ring}`} />
                </div>
                <div className="text-3xl font-extrabold text-slate-800 mt-2 tabular-nums">{val}</div>
                {m.key === 'total' ? (
                  <span className="text-[10px] text-slate-400 mt-2 inline-block">proposal masuk DPMD</span>
                ) : (
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${m.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 inline-block">{pct}% dari total</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-white/90"><LuDollarSign className="w-5 h-5" /><span className="text-sm font-semibold">Total Anggaran Usulan (masuk DPMD)</span></div>
          <div className="text-xl md:text-2xl font-bold text-white">{rupiah(totalAnggaran)}</div>
        </div>
      </div>

      {/* Partisipasi Desa — sinkron dgn tab Partisipasi (gauge % sudah/belum mengajukan) */}
      {partisipasi && partisipasi.total > 0 && (
        <ChartCard title="Partisipasi Desa — Pengajuan ke Kecamatan" icon={LuUsers} iconColor="text-indigo-600"
          subtitle={`${partisipasi.totalSudah} dari ${partisipasi.total} desa sudah mengajukan · ${partisipasi.pct}%`}>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-full sm:w-1/3 max-w-[220px]">
              <ParticipationGauge sudah={partisipasi.totalSudah} belum={partisipasi.totalBelum} height={190} />
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              <KpiTile label="Total Desa" value={partisipasi.total} sub={`${partisipasi.totalKec} kecamatan`} icon={LuMapPin} accent="slate" />
              <KpiTile label="Sudah" value={partisipasi.totalSudah} sub={`${partisipasi.pct}% dari total`} icon={LuCheck} accent="emerald" pct={partisipasi.pct} />
              <KpiTile label="Belum" value={partisipasi.totalBelum} sub={`${partisipasi.total ? Math.round((partisipasi.totalBelum / partisipasi.total) * 100) : 0}% perlu didorong`} icon={LuX} accent="rose" pct={partisipasi.total ? Math.round((partisipasi.totalBelum / partisipasi.total) * 100) : 0} />
              <KpiTile label="Kec. Tuntas" value={partisipasi.kecTuntas} sub={`dari ${partisipasi.totalKec} kecamatan`} icon={LuClipboardCheck} accent="indigo" />
            </div>
          </div>
        </ChartCard>
      )}

      {/* Donut status + Pipeline tahap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut: Keputusan DPMD */}
        <ChartCard title="Komposisi Keputusan DPMD" icon={LuClipboardCheck} iconColor="text-emerald-600"
          subtitle="Distribusi status verifikasi proposal yang masuk ke DPMD">
          {totalMasuk === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">Belum ada data.</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-1/2" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusNonZero} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={62} outerRadius={96} paddingAngle={3} cornerRadius={6} stroke="none">
                      {statusNonZero.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <RTooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const pct = totalMasuk ? Math.round((d.value / totalMasuk) * 100) : 0;
                      return <TipBox rows={[{ name: d.name, value: `${d.value} (${pct}%)`, color: d.color }]} />;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-extrabold text-slate-800 tabular-nums">{totalMasuk}</span>
                  <span className="text-[11px] text-slate-400 font-semibold">Total Proposal</span>
                </div>
              </div>
              <div className="flex-1 w-full space-y-2.5">
                {statusData.map(d => {
                  const pct = totalMasuk ? Math.round((d.value / totalMasuk) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-slate-600 flex-1">{d.name}</span>
                      <span className="text-sm font-bold text-slate-800 tabular-nums">{d.value}</span>
                      <span className="text-[10px] text-slate-400 w-9 text-right tabular-nums">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Pipeline: Sebaran Tahap */}
        <ChartCard title="Sebaran Tahap (Pipeline)" icon={LuActivity} iconColor="text-indigo-600"
          subtitle={`Semua proposal lintas-tahap: ${funnel.total || 0}`}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tahapData} layout="vertical" margin={{ left: 0, right: 28, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 11, fill: '#475569' }} />
              <RTooltip cursor={{ fill: '#f8fafc' }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                const pct = funnel.total ? Math.round((d.value / funnel.total) * 100) : 0;
                return <TipBox label={d.name} rows={[{ name: 'Jumlah', value: `${d.value} (${pct}%)`, color: d.color }]} />;
              }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={26}>
                {tahapData.map((d, i) => <Cell key={i} fill={d.color} />)}
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Radial kategori + ringkasan anggaran */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Proposal per Kategori Kegiatan" icon={LuPackage} iconColor="text-indigo-600"
          subtitle={`Total ${totalKategoriCount} proposal`}>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-1/2" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="32%" outerRadius="100%" data={kategoriData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, maxKategoriCount]} tick={false} />
                  <RadialBar background={{ fill: '#f1f5f9' }} dataKey="count" cornerRadius={8} />
                  <RTooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return <TipBox label={d.name} rows={[
                      { name: 'Proposal', value: d.count, color: d.fill },
                      { name: 'Anggaran', value: compactRupiah(d.anggaran) },
                    ]} />;
                  }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full space-y-2">
              {kategoriData.map(d => (
                <div key={d.key} className="rounded-xl border border-slate-100 p-3" style={{ background: `${d.fill}0d` }}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} /> {d.name}
                    </span>
                    <span className="text-lg font-extrabold tabular-nums" style={{ color: d.fill }}>{d.count}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{rupiah(d.anggaran)}</p>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Per kecamatan - horizontal bar (top 12) */}
        <ChartCard title="Top Kecamatan (Jumlah Proposal)" icon={LuMapPin} iconColor="text-indigo-600"
          subtitle={kecTop.length ? `Menampilkan ${kecTop.length} dari ${perKecamatan.length} kecamatan` : undefined}>
          {kecTop.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">Belum ada data.</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, kecTop.length * 30)}>
              <BarChart data={kecTop} layout="vertical" margin={{ left: 0, right: 30, top: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="kecGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="nama" width={92} tick={{ fontSize: 11, fill: '#475569' }} interval={0} />
                <RTooltip cursor={{ fill: '#f8fafc' }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return <TipBox label={d.nama} rows={[
                    { name: 'Proposal', value: d.count, color: '#f97316' },
                    { name: 'Anggaran', value: compactRupiah(d.anggaran) },
                  ]} />;
                }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="url(#kecGrad)" barSize={18}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Rekapitulasi anggaran per kegiatan (dikelompokkan per kategori) */}
      <ChartCard title="Rekapitulasi Anggaran per Kegiatan" icon={LuPackage} iconColor="text-indigo-600"
        subtitle="Jumlah desa yang mengambil & total anggaran per kegiatan">
        {perKegiatan.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada data.</p>
        ) : (
          <div className="space-y-5">
            {KATEGORI_KEYS.map(kat => {
              const items = perKegiatan.filter(k => k.kategori === kat);
              if (!items.length) return null;
              const subDesa = items.reduce((s, k) => s + k.desaCount, 0);
              const subProposal = items.reduce((s, k) => s + k.proposalCount, 0);
              const subAnggaran = items.reduce((s, k) => s + k.anggaran, 0);
              const hex = KATEGORI_HEX[kat];
              return (
                <div key={kat}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: hex }} />
                    <h4 className="text-sm font-bold text-slate-700">{KATEGORI_META[kat].label}</h4>
                    <span className="text-[11px] text-slate-400">{items.length} kegiatan</span>
                  </div>
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                          <th className="py-2 px-1 w-8">#</th>
                          <th className="py-2 px-1">Kegiatan</th>
                          <th className="py-2 px-1 text-right">Jml Desa</th>
                          <th className="py-2 px-1 text-right">Proposal</th>
                          <th className="py-2 px-1 text-right">Anggaran</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((r, i) => (
                          <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                            <td className="py-2 px-1 text-slate-400 tabular-nums">{i + 1}</td>
                            <td className="py-2 px-1 text-slate-800">{r.nama}</td>
                            <td className="py-2 px-1 text-right font-semibold text-slate-700 tabular-nums">{r.desaCount}</td>
                            <td className="py-2 px-1 text-right text-slate-600 tabular-nums">{r.proposalCount}</td>
                            <td className="py-2 px-1 text-right text-slate-600 tabular-nums">{rupiah(r.anggaran)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-200 font-bold" style={{ background: `${hex}0d` }}>
                          <td className="py-2 px-1" />
                          <td className="py-2 px-1 text-slate-800">Subtotal {KATEGORI_META[kat].label}</td>
                          <td className="py-2 px-1 text-right tabular-nums" style={{ color: hex }}>{subDesa}</td>
                          <td className="py-2 px-1 text-right tabular-nums" style={{ color: hex }}>{subProposal}</td>
                          <td className="py-2 px-1 text-right tabular-nums" style={{ color: hex }}>{rupiah(subAnggaran)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 text-white/90">
                <LuDollarSign className="w-5 h-5" />
                <span className="text-sm font-semibold">Total Anggaran Seluruh Kegiatan</span>
              </div>
              <div className="text-xl md:text-2xl font-bold text-white">{rupiah(perKegiatan.reduce((s, k) => s + k.anggaran, 0))}</div>
            </div>
          </div>
        )}
      </ChartCard>

      {/* Tabel detail per kecamatan */}
      <ChartCard title="Detail per Kecamatan" icon={LuChartColumn} iconColor="text-indigo-600">
        {perKecamatan.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada data.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="py-2 px-1">#</th>
                  <th className="py-2 px-1">Kecamatan</th>
                  <th className="py-2 px-1 text-right">Proposal</th>
                  <th className="py-2 px-1 text-right">Anggaran</th>
                </tr>
              </thead>
              <tbody>
                {kecSorted.map((r, i) => (
                  <tr key={r.nama} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-2 px-1 text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="py-2 px-1 text-slate-800">{r.nama}</td>
                    <td className="py-2 px-1 text-right font-semibold text-slate-700 tabular-nums">{r.count}</td>
                    <td className="py-2 px-1 text-right text-slate-600 tabular-nums">{rupiah(r.anggaran)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default DpmdBankeuPerubahanVerificationPage;
