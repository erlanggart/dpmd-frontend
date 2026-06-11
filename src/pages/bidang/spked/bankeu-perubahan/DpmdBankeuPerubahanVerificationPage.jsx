import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../../api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import {
  LuEye, LuCheck, LuX, LuRefreshCw, LuFilter, LuMessageSquare, LuInfo,
  LuChevronDown, LuChevronRight, LuSearch, LuPackage, LuMapPin, LuDollarSign,
  LuClipboardCheck, LuHistory, LuRoute, LuFolder, LuActivity, LuUsers,
  LuDownload, LuChartColumn, LuFileText, LuStamp, LuRotateCcw, LuWrench,
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
  pending:   'bg-amber-100 text-amber-700 border-amber-300',
  in_review: 'bg-blue-100 text-blue-700 border-blue-300',
  approved:  'bg-emerald-100 text-emerald-700 border-emerald-300',
  rejected:  'bg-red-100 text-red-700 border-red-300',
  revision:  'bg-orange-100 text-orange-700 border-orange-300',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
    {STATUS_LABELS[status] || status}
  </span>
);

const KATEGORI_META = {
  wajib: {
    label: 'Wajib', sublabel: 'Kegiatan WAJIB',
    gradFrom: 'from-red-500', gradTo: 'to-rose-600',
    headerBg: 'from-red-50 via-rose-50 to-red-50',
    headerHover: 'hover:from-red-100 hover:via-rose-100 hover:to-red-100',
    badge: 'bg-red-100 text-red-700 border-red-300',
  },
  pilihan_infrastruktur: {
    label: 'Pilihan Infrastruktur', sublabel: 'Kegiatan fisik/bangunan',
    gradFrom: 'from-orange-500', gradTo: 'to-amber-600',
    headerBg: 'from-orange-50 via-amber-50 to-orange-50',
    headerHover: 'hover:from-orange-100 hover:via-amber-100 hover:to-orange-100',
    badge: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  pilihan_non_infrastruktur: {
    label: 'Pilihan Non-Infrastruktur', sublabel: 'Program/pemberdayaan',
    gradFrom: 'from-blue-500', gradTo: 'to-indigo-600',
    headerBg: 'from-blue-50 via-indigo-50 to-blue-50',
    headerHover: 'hover:from-blue-100 hover:via-indigo-100 hover:to-blue-100',
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
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
  const dpmd = p.dpmd_status || 'pending';
  if (p.submitted_to_dpmd) {
    if (dpmd === 'approved') return { key: 'disetujui_dpmd', label: 'Disetujui DPMD', tone: 'emerald' };
    if (dpmd === 'rejected') return { key: 'ditolak_dpmd', label: 'Ditolak DPMD', tone: 'red' };
    if (dpmd === 'revision') return { key: 'revisi_dpmd', label: 'Revisi DPMD', tone: 'orange' };
    return { key: 'menunggu_dpmd', label: 'Menunggu DPMD', tone: 'amber' };
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
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  red: 'bg-red-100 text-red-700 border-red-300',
  orange: 'bg-orange-100 text-orange-700 border-orange-300',
  amber: 'bg-amber-100 text-amber-700 border-amber-300',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  gray: 'bg-gray-100 text-gray-600 border-gray-300',
};
// Titik berwarna untuk header grup (dipakai di Tracking — dikelompokkan per status).
const TONE_DOT = {
  emerald: 'bg-emerald-500', red: 'bg-red-500', orange: 'bg-orange-500',
  amber: 'bg-amber-500', cyan: 'bg-cyan-500', gray: 'bg-gray-400',
};
// Urutan tahap mengikuti alur Desa → Kecamatan → DPMD (untuk pengelompokan Tracking).
const STAGE_ORDER = [
  { key: 'draft', label: 'Draft di Desa', tone: 'gray' },
  { key: 'menunggu_kec', label: 'Menunggu Kecamatan', tone: 'amber' },
  { key: 'revisi_kec', label: 'Revisi Kecamatan', tone: 'orange' },
  { key: 'ditolak_kec', label: 'Ditolak Kecamatan', tone: 'red' },
  { key: 'disetujui_kec', label: 'Disetujui Kec. (belum diteruskan)', tone: 'cyan' },
  { key: 'menunggu_dpmd', label: 'Menunggu DPMD', tone: 'amber' },
  { key: 'revisi_dpmd', label: 'Revisi DPMD', tone: 'orange' },
  { key: 'ditolak_dpmd', label: 'Ditolak DPMD', tone: 'red' },
  { key: 'disetujui_dpmd', label: 'Disetujui DPMD', tone: 'emerald' },
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
  const [expandedKec, setExpandedKec] = useState({});   // default: terbuka
  const [expandedDesa, setExpandedDesa] = useState({}); // default: tertutup

  // Tracking lintas-tahap (semua proposal)
  const [trackingData, setTrackingData] = useState([]);
  const [loadingTracking, setLoadingTracking] = useState(true);
  const [trackSearch, setTrackSearch] = useState('');
  const [trackKecamatan, setTrackKecamatan] = useState('all');

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
      if (trackSearch.trim()) {
        const q = trackSearch.toLowerCase();
        if (!(p.judul_proposal?.toLowerCase().includes(q) || p.desa_nama?.toLowerCase().includes(q) || p.kecamatan_nama?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [trackingData, trackKecamatan, trackSearch]);

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
    Object.values(byKec).forEach(v => { totalSudah += v.sudah.length; totalBelum += v.belum.length; });
    return { byKec, totalSudah, totalBelum };
  }, [allDesa, allKecamatan, trackingData]);

  // ---- STATISTIK: funnel & breakdown lintas-tahap ----
  const funnel = useMemo(() => {
    const f = { total: trackingData.length, desa: 0, kecamatan: 0, dpmd: 0, selesai: 0 };
    trackingData.forEach(p => {
      if (!p.submitted_to_kecamatan) f.desa += 1;
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

  // ---- Verifikasi ----
  const openVerify = (proposal, status) => setVerifyModal({ proposal, status, catatan: '' });

  // Batalkan persetujuan DPMD (salah pencet) -> kembali ke "Menunggu DPMD"
  const cancelApproval = async (proposal) => {
    const result = await Swal.fire({
      title: 'Batalkan persetujuan?',
      html: `<p class="text-sm text-gray-600">Keputusan DPMD untuk <strong>${proposal.judul_proposal}</strong> akan dibatalkan dan proposal kembali ke status <strong>Menunggu DPMD</strong>.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      confirmButtonText: 'Ya, batalkan',
      cancelButtonText: 'Tidak',
    });
    if (!result.isConfirmed) return;
    try {
      await api.patch(`/dpmd/bankeu-perubahan/proposals/${proposal.id}/cancel-approval`);
      Swal.fire('Berhasil', 'Persetujuan DPMD dibatalkan', 'success');
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
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-sm font-semibold text-blue-800">${proposal.judul_proposal}</p>
          <p class="text-sm text-blue-700">Desa ${proposal.desa_nama || ''} · Kec. ${proposal.kecamatan_nama || ''}</p>
          <p class="text-sm text-blue-600 mt-1">Posisi saat ini: <strong>${stageLabel}</strong></p>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p class="text-sm text-amber-800">⚠️ Proposal akan dikembalikan ke <strong>Desa</strong> untuk direvisi. Semua status verifikasi (Kecamatan & DPMD), Berita Acara, Surat Pengantar, dan Quisioner akan di-reset. Dokumen desa tetap dipertahankan.</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Alasan Troubleshoot <span class="text-red-500">*</span></label>
          <textarea id="swal-ts-catatan" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500" rows="3" placeholder="Contoh: Salah ACC / proposal nyangkut, desa minta revisi ulang..."></textarea>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="w-full mx-auto space-y-4">
        {/* Tab bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 flex flex-wrap items-center gap-1.5">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={refreshAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
              <LuRefreshCw className="w-4 h-4" /> <span className="hidden md:inline">Refresh</span>
            </button>
            <button onClick={exportExcel} disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60">
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
            troubleshootRevision={troubleshootRevision}
          />
        )}

        {activeTab === 'tracking' && (
          <TrackingTab
            loading={loadingTracking} data={trackingFiltered}
            search={trackSearch} setSearch={setTrackSearch}
            kecamatan={trackKecamatan} setKecamatan={setTrackKecamatan}
            kecamatanOptions={kecamatanOptions} total={trackingData.length}
            onTroubleshoot={troubleshootRevision}
          />
        )}

        {activeTab === 'partisipasi' && (
          <PartisipasiTab loading={loadingTracking} data={partisipasiData} />
        )}

        {activeTab === 'statistics' && (
          <StatisticsTab stats={stats} funnel={funnel} perKategori={perKategori} perKecamatan={perKecamatan} tahun={tahun} />
        )}
      </div>

      {verifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {verifyModal.status === 'approved' ? 'Setujui Dokumen Kecamatan (SP & BA)' : 'Revisi Dokumen Kecamatan (SP & BA)'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{verifyModal.proposal.judul_proposal}</p>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Catatan {verifyModal.status === 'revision' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={verifyModal.catatan}
                  onChange={e => setVerifyModal({ ...verifyModal, catatan: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder={verifyModal.status === 'approved' ? 'Catatan (opsional)' : 'Tulis bagian SP / BA yang perlu diperbaiki kecamatan...'}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setVerifyModal(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100">Batal</button>
              <button onClick={submitVerify}
                className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm ${
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
  <div className={`rounded-xl p-3 ${color}`}>
    <div className="text-xs font-semibold opacity-70">{label}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </div>
);

// ============================ ARSIP ============================
const ArchiveTab = ({
  tahun, stats, loading, filterStatus, setFilterStatus, filterKategori, setFilterKategori,
  filterKecamatan, setFilterKecamatan, searchQuery, setSearchQuery, kecamatanOptions,
  filteredProposals, proposals, groupedByKecamatan,
  isKecExpanded, toggleKec, isDesaExpanded, toggleDesa, openVerify, cancelApproval, troubleshootRevision,
}) => (
  <div className="space-y-4">
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
      <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-3">
        <LuClipboardCheck className="w-5 h-5 text-orange-600" /> Arsip Proposal Masuk DPMD - TA {tahun}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Masuk" value={stats.total || 0} color="bg-gray-50 text-gray-700" />
        <StatCard label="Pending" value={stats.pending || 0} color="bg-amber-50 text-amber-700" />
        <StatCard label="Approved" value={stats.approved || 0} color="bg-emerald-50 text-emerald-700" />
        <StatCard label="Rejected" value={stats.rejected || 0} color="bg-red-50 text-red-700" />
        <StatCard label="Revision" value={stats.revision || 0} color="bg-orange-50 text-orange-700" />
      </div>
    </div>

    {/* Filters */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700"><LuFilter className="w-4 h-4" /> Filter:</div>
      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
        <option value="all">Semua Status</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="revision">Revision</option>
      </select>
      <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
        <option value="all">Semua Kategori</option>
        {KATEGORI_KEYS.map(k => <option key={k} value={k}>{KATEGORI_META[k].label}</option>)}
      </select>
      <select value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
        <option value="all">Semua Kecamatan</option>
        {kecamatanOptions.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
      </select>
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari judul / desa / kecamatan / kegiatan..."
          className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>
      <span className="ml-auto text-xs text-gray-500">{filteredProposals.length} dari {proposals.length} proposal</span>
    </div>

    {loading ? (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">Memuat data...</div>
    ) : filteredProposals.length === 0 ? (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
        <LuInfo className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium">{proposals.length === 0 ? 'Belum ada proposal yang masuk ke DPMD' : 'Tidak ada proposal yang sesuai filter'}</p>
      </div>
    ) : (
      <div className="space-y-4">
        {groupedByKecamatan.map(kec => {
          const kecOpen = isKecExpanded(kec.kecId);
          return (
            <div key={kec.kecId} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Header Kecamatan */}
              <button onClick={() => toggleKec(kec.kecId)}
                className="w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 hover:from-orange-100 hover:via-amber-100 hover:to-orange-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                    {kecOpen ? <LuChevronDown className="w-5 h-5 text-white" /> : <LuChevronRight className="w-5 h-5 text-white" />}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                      <LuMapPin className="w-4 h-4 text-orange-600" /> Kec. {kec.kecNama}
                    </h3>
                    <p className="text-xs text-gray-600">{kec.desas.length} desa · {kec.count} proposal · {rupiah(kec.anggaran)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold px-3 py-1 rounded border bg-orange-100 text-orange-700 border-orange-300">{kec.count}</span>
              </button>

              {/* Daftar Desa (default tertutup) */}
              {kecOpen && (
                <div className="p-3 space-y-2 bg-gray-50/60">
                  {kec.desas.map(desa => {
                    const desaKey = `${kec.kecId}::${desa.desaId}`;
                    const desaOpen = isDesaExpanded(desaKey);
                    return (
                      <div key={desaKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <button onClick={() => toggleDesa(desaKey)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                              {desaOpen ? <LuChevronDown className="w-4 h-4 text-white" /> : <LuChevronRight className="w-4 h-4 text-white" />}
                            </div>
                            <div className="text-left min-w-0">
                              <h4 className="font-bold text-gray-800 text-sm truncate">Desa {desa.desaNama}</h4>
                              <p className="text-[11px] text-gray-500">{desa.count} proposal</p>
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
                          <div className="divide-y divide-gray-100 border-t border-gray-100">
                            <div className="sm:hidden px-4 py-2 bg-amber-50 text-amber-800 text-xs font-bold flex items-center gap-1">
                              <LuDollarSign className="w-3.5 h-3.5" /> Total {rupiah(desa.anggaran)}
                            </div>
                            {desa.items.map(p => (
                              <ProposalRow key={p.id} proposal={p}
                                onApprove={() => openVerify(p, 'approved')}
                                onRevision={() => openVerify(p, 'revision')}
                                onCancelApproval={() => cancelApproval(p)}
                                onTroubleshoot={() => troubleshootRevision(p)} />
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

const ProposalRow = ({ proposal, onApprove, onRevision, onCancelApproval, onTroubleshoot }) => {
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
          <h4 className="font-bold text-gray-800 text-sm md:text-base leading-tight">{proposal.judul_proposal}</h4>
          {firstKegiatan && <p className="text-xs text-gray-600 mt-1"><span className="font-semibold">Kegiatan:</span> {firstKegiatan.nama_kegiatan}</p>}
          {proposal.nama_kegiatan_spesifik && <p className="text-sm text-gray-600 mt-0.5">{proposal.nama_kegiatan_spesifik}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-2 text-xs">
            {proposal.volume && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded text-blue-800">
                <LuPackage className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate"><strong>Vol:</strong> {proposal.volume}</span>
              </div>
            )}
            {proposal.lokasi && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded text-green-800">
                <LuMapPin className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate"><strong>Lokasi:</strong> {proposal.lokasi}</span>
              </div>
            )}
            {proposal.anggaran_usulan && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded text-amber-800">
                <LuDollarSign className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate"><strong>Rp</strong> {Number(proposal.anggaran_usulan).toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>
          {proposal.kecamatan_catatan && (
            <div className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-800"><strong>Catatan Kecamatan:</strong> {proposal.kecamatan_catatan}</div>
          )}
          {proposal.dpmd_catatan && (
            <div className="mt-2 text-xs bg-purple-50 border border-purple-200 rounded p-2 text-purple-800"><strong>Catatan DPMD:</strong> {proposal.dpmd_catatan}</div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 flex-shrink-0">
          {proposal.file_proposal && (
            <a href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/${proposal.file_proposal}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg">
              <LuEye className="w-3.5 h-3.5" /> File
            </a>
          )}
          <button onClick={() => setShowTracking(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg">
            <LuRoute className="w-3.5 h-3.5" /> Lacak
          </button>
          <button onClick={() => setShowHistory(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg">
            <LuHistory className="w-3.5 h-3.5" /> Riwayat
          </button>
          {(baUrl || spUrl) && (
            <span className="inline-flex items-center gap-1.5 pl-1 pr-0.5 text-[11px] font-semibold text-purple-700">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Dok. Kecamatan:
            </span>
          )}
          {baUrl && (
            <a href={baUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold rounded-lg"
              title="Lihat Berita Acara Verifikasi Kecamatan">
              <LuFileText className="w-3.5 h-3.5" /> Lihat BA
            </a>
          )}
          {spUrl && (
            <a href={spUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg"
              title="Lihat Surat Pengantar Kecamatan">
              <LuStamp className="w-3.5 h-3.5" /> Lihat SP
            </a>
          )}
          {isPending && (
            <>
              <button onClick={onApprove}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg"
                title="Setujui Surat Pengantar & Berita Acara dari kecamatan">
                <LuCheck className="w-3.5 h-3.5" /> Setujui SP & BA
              </button>
              <button onClick={onRevision}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg"
                title="Kembalikan ke kecamatan untuk revisi Surat Pengantar & Berita Acara">
                <LuRefreshCw className="w-3.5 h-3.5" /> Revisi BA/SP
              </button>
            </>
          )}
          {isApproved && (
            <button onClick={onCancelApproval}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg"
              title="Batalkan persetujuan (salah pencet) — proposal kembali ke Menunggu DPMD">
              <LuRotateCcw className="w-3.5 h-3.5" /> Batalkan
            </button>
          )}
          {onTroubleshoot && (
            <button onClick={onTroubleshoot}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold rounded-lg"
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
    if (s.status === 'rejected') return 'bg-red-500';
    if (s.status === 'revision') return 'bg-orange-500';
    return s.done ? 'bg-emerald-500' : 'bg-gray-300';
  };
  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex flex-col items-center" title={s.label}>
            <span className={`w-3 h-3 rounded-full ${dotColor(s)}`} />
          </div>
          {i < stages.length - 1 && <span className={`w-4 h-0.5 ${stages[i + 1].done || s.status === 'approved' ? 'bg-emerald-200' : 'bg-gray-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};

const TrackingTab = ({ loading, data, search, setSearch, kecamatan, setKecamatan, kecamatanOptions, total, onTroubleshoot }) => {
  const [trackProposal, setTrackProposal] = useState(null);
  // Default: semua grup status TERTUTUP. openMap[key] === true berarti grup dibuka.
  const [openMap, setOpenMap] = useState({});
  const totalAnggaran = useMemo(
    () => data.reduce((s, p) => s + (Number(p.anggaran_usulan) || 0), 0),
    [data]
  );

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700"><LuActivity className="w-4 h-4 text-violet-600" /> Tracking lintas-tahap</div>
        <select value={kecamatan} onChange={e => setKecamatan(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="all">Semua Kecamatan</option>
          {kecamatanOptions.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul / desa / kecamatan..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <span className="ml-auto text-xs text-gray-500">{data.length} dari {total} proposal</span>
      </div>

      {/* Ringkasan total anggaran usulan (mengikuti filter) */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 text-white/90">
          <LuDollarSign className="w-5 h-5" />
          <span className="text-sm font-semibold">Total Anggaran Usulan ({data.length} proposal)</span>
        </div>
        <div className="text-xl md:text-2xl font-bold text-white">{rupiah(totalAnggaran)}</div>
      </div>

      {/* Ikhtisar status: klik chip untuk buka/tutup grup terkait */}
      {!loading && data.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 flex flex-wrap items-center gap-2">
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
            <button onClick={expandAll} className="px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Buka semua</button>
            <button onClick={collapseAll} className="px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Tutup semua</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">Memuat tracking...</div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <LuInfo className="w-12 h-12 mx-auto text-gray-300 mb-3" /><p className="text-gray-600 font-medium">Tidak ada data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map(s => {
            const g = grouped.get(s.key);
            const open = !!openMap[s.key];
            return (
              <div key={s.key} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header status */}
                <button onClick={() => toggle(s.key)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {open ? <LuChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <LuChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${TONE_DOT[s.tone]}`} />
                    <span className="font-bold text-gray-800 text-sm truncate">{s.label}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${TONE[s.tone]}`}>{g.items.length}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-600 flex-shrink-0">{rupiah(g.total)}</span>
                </button>
                {open && (
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {g.items.map(p => (
                      <div key={p.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-gray-500">Kec <strong className="text-gray-800">{p.kecamatan_nama}</strong> · Desa <strong className="text-gray-800">{p.desa_nama}</strong></span>
                          <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{p.judul_proposal}</p>
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-50 text-amber-800 text-xs font-semibold rounded">
                            <LuDollarSign className="w-3.5 h-3.5" /> {rupiah(p.anggaran_usulan)}
                          </span>
                        </div>
                        <StageDots proposal={p} />
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setTrackProposal(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg">
                            <LuRoute className="w-3.5 h-3.5" /> Lacak
                          </button>
                          {onTroubleshoot && (
                            <button onClick={() => onTroubleshoot(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg"
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
const PartisipasiTab = ({ loading, data }) => {
  const [tab, setTab] = useState('belum');
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');

  if (loading) return <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">Memuat partisipasi...</div>;

  const kecList = Object.entries(data.byKec)
    .map(([nama, v]) => ({ nama, sudah: v.sudah, belum: v.belum }))
    .filter(k => !search || k.nama.toLowerCase().includes(search.toLowerCase()) || k.sudah.some(d => d.toLowerCase().includes(search.toLowerCase())) || k.belum.some(d => d.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => tab === 'belum' ? b.belum.length - a.belum.length : b.sudah.length - a.sudah.length);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700"><LuUsers className="w-4 h-4 text-fuchsia-600" /> Partisipasi Desa (sudah mengajukan ke Kecamatan)</div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-emerald-600 font-semibold">Sudah: {data.totalSudah}</span>
            <span className="text-xs text-gray-500 font-semibold">Belum: {data.totalBelum}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => setTab('belum')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'belum' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>Belum Mengajukan</button>
          <button onClick={() => setTab('sudah')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'sudah' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Sudah Mengajukan</button>
          <div className="relative flex-1 min-w-[160px] max-w-xs ml-auto">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kecamatan / desa..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500" />
          </div>
        </div>
      </div>

      {kecList.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">Data desa/kecamatan belum tersedia.</div>
      ) : (
        <div className="space-y-2">
          {kecList.map(kec => {
            const items = tab === 'sudah' ? kec.sudah : kec.belum;
            const isOpen = expanded[kec.nama];
            return (
              <div key={kec.nama} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button onClick={() => setExpanded(e => ({ ...e, [kec.nama]: !e[kec.nama] }))}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    {isOpen ? <LuChevronDown className="w-4 h-4 text-gray-400" /> : <LuChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="font-semibold text-gray-800 text-sm">{kec.nama}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{kec.sudah.length} sudah</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">{kec.belum.length} belum</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 pt-1 flex flex-wrap gap-1.5">
                    {items.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">Tidak ada desa pada kategori ini.</span>
                    ) : items.map(d => (
                      <span key={d} className={`px-2 py-1 rounded-lg text-xs font-medium ${tab === 'sudah' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>{d}</span>
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
  <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
    {label && <p className="font-bold text-gray-800 mb-1">{label}</p>}
    {rows.map((r, i) => (
      <p key={i} className="flex items-center gap-1.5 text-gray-600 leading-relaxed">
        {r.color && <span className="w-2 h-2 rounded-full inline-block" style={{ background: r.color }} />}
        <span>{r.name}:</span> <strong className="text-gray-800">{r.value}</strong>
      </p>
    ))}
  </div>
);

const ChartCard = ({ title, icon: Icon, iconColor, subtitle, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
    <div className="mb-4">
      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${iconColor || 'text-gray-500'}`} />} {title}
      </h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const KPI_META = [
  { key: 'total', label: 'Total Masuk', icon: LuFolder, ring: 'text-gray-500', bar: 'bg-gray-400', bg: 'from-gray-50' },
  { key: 'pending', label: 'Pending', icon: LuHistory, ring: 'text-amber-600', bar: 'bg-amber-500', bg: 'from-amber-50' },
  { key: 'approved', label: 'Disetujui', icon: LuCheck, ring: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'from-emerald-50' },
  { key: 'rejected', label: 'Ditolak', icon: LuX, ring: 'text-red-600', bar: 'bg-red-500', bg: 'from-red-50' },
  { key: 'revision', label: 'Revisi', icon: LuMessageSquare, ring: 'text-orange-600', bar: 'bg-orange-500', bg: 'from-orange-50' },
];

const StatisticsTab = ({ stats, funnel, perKategori, perKecamatan, tahun }) => {
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
    { name: 'Menunggu DPMD', value: funnel.dpmd || 0, color: '#3b82f6' },
    { name: 'Disetujui DPMD', value: funnel.selesai || 0, color: '#10b981' },
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
          <LuChartColumn className="w-5 h-5 text-cyan-600" /> Statistik Verifikasi DPMD · TA {tahun}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {KPI_META.map(m => {
            const val = Number(stats[m.key]) || 0;
            const pct = totalMasuk ? Math.round((val / totalMasuk) * 100) : 0;
            const Icon = m.icon;
            return (
              <div key={m.key} className={`relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br ${m.bg} to-white p-4`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">{m.label}</span>
                  <Icon className={`w-4 h-4 ${m.ring}`} />
                </div>
                <div className="text-3xl font-extrabold text-gray-800 mt-2 tabular-nums">{val}</div>
                {m.key === 'total' ? (
                  <span className="text-[10px] text-gray-400 mt-2 inline-block">proposal masuk DPMD</span>
                ) : (
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${m.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 inline-block">{pct}% dari total</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 text-white/90"><LuDollarSign className="w-5 h-5" /><span className="text-sm font-semibold">Total Anggaran Usulan (masuk DPMD)</span></div>
          <div className="text-xl md:text-2xl font-bold text-white">{rupiah(totalAnggaran)}</div>
        </div>
      </div>

      {/* Donut status + Pipeline tahap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut: Keputusan DPMD */}
        <ChartCard title="Komposisi Keputusan DPMD" icon={LuClipboardCheck} iconColor="text-emerald-600"
          subtitle="Distribusi status verifikasi proposal yang masuk ke DPMD">
          {totalMasuk === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">Belum ada data.</div>
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
                  <span className="text-3xl font-extrabold text-gray-800 tabular-nums">{totalMasuk}</span>
                  <span className="text-[11px] text-gray-400 font-semibold">Total Proposal</span>
                </div>
              </div>
              <div className="flex-1 w-full space-y-2.5">
                {statusData.map(d => {
                  const pct = totalMasuk ? Math.round((d.value / totalMasuk) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                      <span className="text-sm font-bold text-gray-800 tabular-nums">{d.value}</span>
                      <span className="text-[10px] text-gray-400 w-9 text-right tabular-nums">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Pipeline: Sebaran Tahap */}
        <ChartCard title="Sebaran Tahap (Pipeline)" icon={LuActivity} iconColor="text-violet-600"
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
        <ChartCard title="Proposal per Kategori Kegiatan" icon={LuPackage} iconColor="text-orange-600"
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
                <div key={d.key} className="rounded-xl border border-gray-100 p-3" style={{ background: `${d.fill}0d` }}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} /> {d.name}
                    </span>
                    <span className="text-lg font-extrabold tabular-nums" style={{ color: d.fill }}>{d.count}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{rupiah(d.anggaran)}</p>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Per kecamatan - horizontal bar (top 12) */}
        <ChartCard title="Top Kecamatan (Jumlah Proposal)" icon={LuMapPin} iconColor="text-rose-600"
          subtitle={kecTop.length ? `Menampilkan ${kecTop.length} dari ${perKecamatan.length} kecamatan` : undefined}>
          {kecTop.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">Belum ada data.</div>
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

      {/* Tabel detail per kecamatan */}
      <ChartCard title="Detail per Kecamatan" icon={LuChartColumn} iconColor="text-cyan-600">
        {perKecamatan.length === 0 ? (
          <p className="text-xs text-gray-400">Belum ada data.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-1">#</th>
                  <th className="py-2 px-1">Kecamatan</th>
                  <th className="py-2 px-1 text-right">Proposal</th>
                  <th className="py-2 px-1 text-right">Anggaran</th>
                </tr>
              </thead>
              <tbody>
                {kecSorted.map((r, i) => (
                  <tr key={r.nama} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="py-2 px-1 text-gray-400 tabular-nums">{i + 1}</td>
                    <td className="py-2 px-1 text-gray-800">{r.nama}</td>
                    <td className="py-2 px-1 text-right font-semibold text-gray-700 tabular-nums">{r.count}</td>
                    <td className="py-2 px-1 text-right text-gray-600 tabular-nums">{rupiah(r.anggaran)}</td>
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
