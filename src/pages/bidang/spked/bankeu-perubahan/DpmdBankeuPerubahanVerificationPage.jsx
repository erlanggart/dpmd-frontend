import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../../api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import {
  LuEye, LuCheck, LuX, LuRefreshCw, LuFilter, LuMessageSquare, LuInfo,
  LuChevronDown, LuChevronRight, LuSearch, LuPackage, LuMapPin, LuDollarSign,
  LuClipboardCheck, LuHistory, LuRoute, LuFolder, LuActivity, LuUsers,
  LuPower, LuDownload, LuChartColumn, LuToggleRight, LuToggleLeft, LuClock,
} from 'react-icons/lu';
import BankeuRevisionHistoryModal from '../../../../components/shared/BankeuRevisionHistoryModal';
import BankeuPerubahanTrackingModal from '../../../../components/shared/BankeuPerubahanTrackingModal';

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
  { key: 'control', icon: LuPower, label: 'Kontrol Pengajuan' },
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

// Tahap "saat ini" sebuah proposal di alur Desa→Kecamatan→DPMD
function currentStage(p) {
  const kec = p.kecamatan_status || 'pending';
  const dpmd = p.dpmd_status || 'pending';
  if (p.submitted_to_dpmd) {
    if (dpmd === 'approved') return { label: 'Disetujui DPMD', tone: 'emerald' };
    if (dpmd === 'rejected') return { label: 'Ditolak DPMD', tone: 'red' };
    if (dpmd === 'revision') return { label: 'Revisi DPMD', tone: 'orange' };
    return { label: 'Menunggu DPMD', tone: 'amber' };
  }
  if (p.submitted_to_kecamatan) {
    if (kec === 'approved') return { label: 'Disetujui Kec. (belum diteruskan)', tone: 'cyan' };
    if (kec === 'rejected') return { label: 'Ditolak Kecamatan', tone: 'red' };
    if (kec === 'revision') return { label: 'Revisi Kecamatan', tone: 'orange' };
    return { label: 'Menunggu Kecamatan', tone: 'amber' };
  }
  return { label: 'Draft di Desa', tone: 'gray' };
}
const TONE = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  red: 'bg-red-100 text-red-700 border-red-300',
  orange: 'bg-orange-100 text-orange-700 border-orange-300',
  amber: 'bg-amber-100 text-amber-700 border-amber-300',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  gray: 'bg-gray-100 text-gray-600 border-gray-300',
};

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
  const [expandedKategori, setExpandedKategori] = useState({});

  // Tracking lintas-tahap (semua proposal)
  const [trackingData, setTrackingData] = useState([]);
  const [loadingTracking, setLoadingTracking] = useState(true);
  const [trackSearch, setTrackSearch] = useState('');
  const [trackKecamatan, setTrackKecamatan] = useState('all');

  // Master desa/kecamatan (partisipasi)
  const [allDesa, setAllDesa] = useState([]);
  const [allKecamatan, setAllKecamatan] = useState([]);

  // Kontrol pengajuan
  const [submissionOpen, setSubmissionOpen] = useState(true);
  const [submissionConfig, setSubmissionConfig] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

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

  const fetchSubmission = async () => {
    setLoadingSettings(true);
    try {
      const res = await api.get(`/app-settings/bankeu_perubahan_submission_desa_${tahun}`)
        .catch(() => ({ data: { data: { value: true, config: null } } }));
      setSubmissionOpen(res.data?.data?.value ?? true);
      setSubmissionConfig(res.data?.data?.config || { enabled: res.data?.data?.value ?? true, schedule: null });
    } catch {
      setSubmissionOpen(true);
      setSubmissionConfig({ enabled: true, schedule: null });
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTracking();
    fetchDesaKecamatan();
    fetchSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun]);

  const refreshAll = () => { fetchData(); fetchTracking(); fetchSubmission(); };

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

  const groupedByKategori = useMemo(() => {
    const groups = { wajib: [], pilihan_infrastruktur: [], pilihan_non_infrastruktur: [] };
    filteredProposals.forEach(p => { if (groups[p.jenis_kegiatan]) groups[p.jenis_kegiatan].push(p); });
    return groups;
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
  const submitVerify = async () => {
    if (!verifyModal) return;
    const { proposal, status, catatan } = verifyModal;
    if ((status === 'rejected' || status === 'revision') && !catatan.trim()) {
      return Swal.fire('Validasi', 'Catatan wajib diisi untuk tolak/revisi', 'warning');
    }
    try {
      await api.patch(`/dpmd/bankeu-perubahan/proposals/${proposal.id}/verify`, { status, catatan });
      Swal.fire('Berhasil', 'Verifikasi tersimpan', 'success');
      setVerifyModal(null);
      refreshAll();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal verifikasi', 'error');
    }
  };

  // ---- Kontrol pengajuan ----
  const saveSubmission = async (enabled) => {
    setSavingSettings(true);
    try {
      const value = { enabled, schedule: submissionConfig?.schedule || null };
      const res = await api.put(`/app-settings/bankeu_perubahan_submission_desa_${tahun}`, { value });
      setSubmissionOpen(res.data?.data?.value ?? enabled);
      setSubmissionConfig(res.data?.data?.config || value);
      Swal.fire({ icon: 'success', title: enabled ? 'Pengajuan dibuka' : 'Pengajuan ditutup', timer: 1300, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan pengaturan', 'error');
    } finally {
      setSavingSettings(false);
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

  const toggleKategori = (kat) => setExpandedKategori(e => ({ ...e, [kat]: e[kat] === undefined ? false : !e[kat] }));
  const isKategoriExpanded = (kat) => expandedKategori[kat] !== false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
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
            groupedByKategori={groupedByKategori}
            isKategoriExpanded={isKategoriExpanded} toggleKategori={toggleKategori}
            openVerify={openVerify}
          />
        )}

        {activeTab === 'tracking' && (
          <TrackingTab
            loading={loadingTracking} data={trackingFiltered}
            search={trackSearch} setSearch={setTrackSearch}
            kecamatan={trackKecamatan} setKecamatan={setTrackKecamatan}
            kecamatanOptions={kecamatanOptions} total={trackingData.length}
          />
        )}

        {activeTab === 'partisipasi' && (
          <PartisipasiTab loading={loadingTracking} data={partisipasiData} />
        )}

        {activeTab === 'statistics' && (
          <StatisticsTab stats={stats} funnel={funnel} perKategori={perKategori} perKecamatan={perKecamatan} tahun={tahun} />
        )}

        {activeTab === 'control' && (
          <ControlTab loading={loadingSettings} saving={savingSettings} open={submissionOpen}
            config={submissionConfig} onSave={saveSubmission} tahun={tahun} />
        )}
      </div>

      {verifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {verifyModal.status === 'approved' ? 'Setujui (Final)' : verifyModal.status === 'revision' ? 'Minta Revisi' : 'Tolak'} - DPMD
              </h3>
              <p className="text-xs text-gray-500 mt-1">{verifyModal.proposal.judul_proposal}</p>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Catatan {verifyModal.status !== 'approved' && '*'}
              </label>
              <textarea
                value={verifyModal.catatan}
                onChange={e => setVerifyModal({ ...verifyModal, catatan: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={verifyModal.status === 'approved' ? 'Catatan (opsional)' : 'Tulis catatan untuk kecamatan...'}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setVerifyModal(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100">Batal</button>
              <button onClick={submitVerify}
                className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm ${
                  verifyModal.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  verifyModal.status === 'revision' ? 'bg-orange-600 hover:bg-orange-700' :
                  'bg-red-600 hover:bg-red-700'}`}
              >Simpan</button>
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
  filteredProposals, proposals, groupedByKategori, isKategoriExpanded, toggleKategori, openVerify,
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
      <div className="space-y-3">
        {KATEGORI_KEYS.map(kat => {
          const items = groupedByKategori[kat];
          if (items.length === 0) return null;
          const meta = KATEGORI_META[kat];
          const expanded = isKategoriExpanded(kat);
          const totalAnggaran = items.reduce((s, p) => s + (Number(p.anggaran_usulan) || 0), 0);
          return (
            <div key={kat} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <button onClick={() => toggleKategori(kat)}
                className={`w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r ${meta.headerBg} ${meta.headerHover} transition-colors`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${meta.gradFrom} ${meta.gradTo} rounded-xl flex items-center justify-center shadow-md`}>
                    {expanded ? <LuChevronDown className="w-5 h-5 text-white" /> : <LuChevronRight className="w-5 h-5 text-white" />}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900 text-base">{meta.label}</h3>
                    <p className="text-xs text-gray-600">{items.length} proposal · {rupiah(totalAnggaran)} · {meta.sublabel}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold px-3 py-1 rounded border ${meta.badge}`}>{items.length}</span>
              </button>
              {expanded && (
                <div className="divide-y divide-gray-100">
                  {items.map(p => (
                    <ProposalRow key={p.id} proposal={p}
                      onApprove={() => openVerify(p, 'approved')}
                      onReject={() => openVerify(p, 'rejected')}
                      onRevision={() => openVerify(p, 'revision')} />
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

const ProposalRow = ({ proposal, onApprove, onReject, onRevision }) => {
  const isPending = !proposal.dpmd_status || proposal.dpmd_status === 'pending';
  const [showHistory, setShowHistory] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const firstKegiatan = proposal.kegiatan_list?.[0];

  return (
    <div className="px-5 py-4">
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <StatusBadge status={proposal.dpmd_status || 'pending'} />
            <span className="text-xs text-gray-500">
              Desa <strong className="text-gray-800">{proposal.desa_nama}</strong> · Kec <strong className="text-gray-800">{proposal.kecamatan_nama}</strong>
            </span>
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
          {isPending && (
            <>
              <button onClick={onApprove} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                <LuCheck className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={onRevision} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg">
                <LuMessageSquare className="w-3.5 h-3.5" /> Revisi
              </button>
              <button onClick={onReject} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg">
                <LuX className="w-3.5 h-3.5" /> Tolak
              </button>
            </>
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

const TrackingTab = ({ loading, data, search, setSearch, kecamatan, setKecamatan, kecamatanOptions, total }) => {
  const [trackProposal, setTrackProposal] = useState(null);
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

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">Memuat tracking...</div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <LuInfo className="w-12 h-12 mx-auto text-gray-300 mb-3" /><p className="text-gray-600 font-medium">Tidak ada data.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 divide-y divide-gray-100">
          {data.map(p => {
            const stage = currentStage(p);
            return (
              <div key={p.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${TONE[stage.tone]}`}>{stage.label}</span>
                    <span className="text-xs text-gray-500">Kec <strong className="text-gray-800">{p.kecamatan_nama}</strong> · Desa <strong className="text-gray-800">{p.desa_nama}</strong></span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{p.judul_proposal}</p>
                </div>
                <StageDots proposal={p} />
                <button onClick={() => setTrackProposal(p)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg shrink-0">
                  <LuRoute className="w-3.5 h-3.5" /> Lacak
                </button>
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
const StatisticsTab = ({ stats, funnel, perKategori, perKecamatan, tahun }) => {
  const totalAnggaran = stats.total_anggaran || Object.values(perKategori).reduce((s, v) => s + v.anggaran, 0);
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4"><LuChartColumn className="w-5 h-5 text-cyan-600" /> Statistik Verifikasi DPMD - TA {tahun}</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Total Masuk DPMD" value={stats.total || 0} color="bg-gray-50 text-gray-700" />
          <StatCard label="Pending" value={stats.pending || 0} color="bg-amber-50 text-amber-700" />
          <StatCard label="Approved" value={stats.approved || 0} color="bg-emerald-50 text-emerald-700" />
          <StatCard label="Rejected" value={stats.rejected || 0} color="bg-red-50 text-red-700" />
          <StatCard label="Revision" value={stats.revision || 0} color="bg-orange-50 text-orange-700" />
        </div>
        <div className="mt-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 text-white/90"><LuDollarSign className="w-5 h-5" /><span className="text-sm font-semibold">Total Anggaran Usulan (masuk DPMD)</span></div>
          <div className="text-xl md:text-2xl font-bold text-white">{rupiah(totalAnggaran)}</div>
        </div>
      </div>

      {/* Funnel lintas-tahap */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Sebaran Tahap (semua proposal: {funnel.total})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Masih di Desa" value={funnel.desa} color="bg-slate-50 text-slate-700" />
          <StatCard label="Di Kecamatan" value={funnel.kecamatan} color="bg-amber-50 text-amber-700" />
          <StatCard label="Menunggu DPMD" value={funnel.dpmd} color="bg-blue-50 text-blue-700" />
          <StatCard label="Disetujui DPMD" value={funnel.selesai} color="bg-emerald-50 text-emerald-700" />
        </div>
      </div>

      {/* Per kategori */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Per Kategori Kegiatan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {KATEGORI_KEYS.map(k => {
            const meta = KATEGORI_META[k]; const v = perKategori[k] || { count: 0, anggaran: 0 };
            return (
              <div key={k} className={`rounded-xl border p-4 ${meta.badge}`}>
                <p className="text-xs font-bold">{meta.label}</p>
                <p className="text-2xl font-bold mt-1">{v.count}</p>
                <p className="text-xs mt-1 opacity-80">{rupiah(v.anggaran)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per kecamatan */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Per Kecamatan</h3>
        {perKecamatan.length === 0 ? (
          <p className="text-xs text-gray-400">Belum ada data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="py-2">Kecamatan</th><th className="py-2 text-right">Proposal</th><th className="py-2 text-right">Anggaran</th>
              </tr></thead>
              <tbody>
                {perKecamatan.map(r => (
                  <tr key={r.nama} className="border-b border-gray-50">
                    <td className="py-2 text-gray-800">{r.nama}</td>
                    <td className="py-2 text-right font-semibold text-gray-700">{r.count}</td>
                    <td className="py-2 text-right text-gray-600">{rupiah(r.anggaran)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================ KONTROL ============================
const ControlTab = ({ loading, saving, open, config, onSave, tahun }) => {
  const scheduled = config?.schedule ? true : false;
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-1"><LuPower className="w-5 h-5 text-rose-600" /> Kontrol Pengajuan Desa - TA {tahun}</h2>
        <p className="text-xs text-gray-500 mb-5">Buka/tutup kemampuan Desa mengajukan proposal Bankeu Perubahan. Berlaku untuk seluruh desa.</p>

        {loading ? (
          <div className="text-gray-500 text-sm">Memuat pengaturan...</div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center ${open ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {open ? <LuToggleRight className="w-7 h-7" /> : <LuToggleLeft className="w-7 h-7" />}
              </span>
              <div>
                <p className="font-bold text-gray-800">Status: {open ? 'TERBUKA' : 'DITUTUP'}</p>
                <p className="text-xs text-gray-500">{open ? 'Desa dapat mengajukan proposal sekarang.' : 'Pengajuan dari Desa sedang ditutup.'}</p>
                {scheduled && <p className="text-[11px] text-amber-600 mt-0.5 flex items-center gap-1"><LuClock className="w-3 h-3" /> Ada jadwal terpasang (atur via halaman jadwal bila perlu).</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={saving || open} onClick={() => onSave(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">Buka</button>
              <button disabled={saving || !open} onClick={() => onSave(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40">Tutup</button>
            </div>
          </div>
        )}

        <div className="mt-4 text-xs bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 flex gap-2">
          <LuInfo className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>Pengaturan ini menggunakan kunci <code className="font-mono">bankeu_perubahan_submission_desa_{tahun}</code> dan hanya dapat diubah oleh Bidang SPKED / Superadmin.</div>
        </div>
      </div>
    </div>
  );
};

export default DpmdBankeuPerubahanVerificationPage;
