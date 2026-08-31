import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../api';
import * as XLSX from 'xlsx';
import {
  LuArrowLeft, LuBuilding2, LuChevronDown, LuChevronRight, LuCircleCheck,
  LuCircleX, LuClock, LuDollarSign, LuDownload, LuEye, LuFileText, LuFilter,
  LuFolder, LuHistory, LuHouse, LuInfo, LuMapPin, LuPackage, LuRefreshCw,
  LuRoute, LuSearch, LuShield, LuStamp,
} from 'react-icons/lu';
import BankeuRevisionHistoryModal from '../../../components/shared/BankeuRevisionHistoryModal';
import BankeuPerubahanTrackingModal from '../../../components/shared/BankeuPerubahanTrackingModal';
import { useAuth } from '../../../context/AuthContext';
import { namaDinasPelihat } from '../../../utils/dinasPelihat';

/**
 * Bantuan Keuangan Perubahan — halaman dinas PELIHAT (BPKAD & Inspektorat).
 *
 * Isinya sama dengan halaman SPKED, tetapi perannya PELIHAT: tidak ada aksi
 * verifikasi, edit proposal, troubleshoot, maupun pengaturan di sini. Yang
 * tersedia hanya melihat data, membuka dokumen, dan mengunduh (berkas
 * proposal, Surat Pengantar, Berita Acara, serta rekap Excel).
 *
 * Halaman ini hanya memanggil endpoint read-only
 * `/dinas-pelihat/bankeu-perubahan/*`, jadi meski ada yang mencoba
 * mengakalinya lewat konsol, backend tetap tidak menyediakan jalur tulis.
 */

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

// BPKAD hanya menerima proposal yang keputusan DPMD-nya sudah final.
const STATUS_LABELS = { approved: 'Disetujui', rejected: 'Ditolak' };
const STATUS_STYLES = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
    {STATUS_LABELS[status] || status || '-'}
  </span>
);

const KATEGORI_META = {
  wajib: { label: 'Wajib', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  pilihan_infrastruktur: { label: 'Pilihan Infrastruktur', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  pilihan_non_infrastruktur: { label: 'Pilihan Non-Infrastruktur', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};
const KATEGORI_KEYS = Object.keys(KATEGORI_META);

const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const fmtShort = (d) => (d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : null);

const fileUrl = (path) =>
  path ? `${imageBaseUrl}${String(path).startsWith('/') ? '' : '/'}${path}` : null;

/* ───────────────────────── Komponen kecil ───────────────────────── */

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 truncate">{label}</p>
      <p className="text-lg font-bold text-slate-800 truncate">{value}</p>
    </div>
  </div>
);

// Stepper Desa → Kecamatan → DPMD (tampilan saja, tanpa aksi).
const NODE_STYLE = {
  done: { circle: 'bg-emerald-500 text-white', Icon: LuCircleCheck },
  rejected: { circle: 'bg-rose-500 text-white', Icon: LuCircleX },
  pending: { circle: 'bg-slate-200 text-slate-500', Icon: null },
};
const PerubahanStepper = ({ proposal: p }) => {
  const kecState = p.kecamatan_status === 'approved' ? 'done' : p.kecamatan_status === 'rejected' ? 'rejected' : 'pending';
  const dpmdState = p.dpmd_status === 'rejected' ? 'rejected' : p.dpmd_status === 'approved' ? 'done' : 'pending';
  const nodes = [
    { key: 'desa', label: 'Desa', TahapIcon: LuHouse, state: 'done', date: fmtShort(p.submitted_at || p.created_at) || '-' },
    { key: 'kec', label: 'Kec.', TahapIcon: LuBuilding2, state: kecState, date: fmtShort(p.kecamatan_verified_at) || '-' },
    { key: 'dpmd', label: 'DPMD', TahapIcon: LuShield, state: dpmdState, date: fmtShort(p.dpmd_verified_at) || fmtShort(p.submitted_to_dpmd_at) || '-' },
  ];
  return (
    <div className="relative overflow-x-auto">
      <div className="flex items-start min-w-[280px]">
        {nodes.map((n, i) => {
          const style = NODE_STYLE[n.state];
          const Icon = style.Icon || n.TahapIcon;
          return (
            <div key={n.key} className="contents">
              <div className="flex flex-col items-center z-10 w-16 shrink-0">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-sm ${style.circle}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[10px] sm:text-xs mt-1 font-medium text-slate-700">{n.label}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-500">{n.date}</span>
              </div>
              {i < nodes.length - 1 && (
                <div className="flex-1 h-1 mt-[18px] sm:mt-5 mx-1 rounded-full bg-emerald-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* Baris proposal — hanya tautan dokumen & modal informasi, tanpa tombol aksi. */
const ProposalRow = ({ proposal }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const firstKegiatan = proposal.kegiatan_list?.[0];
  const baUrl = fileUrl(proposal.berita_acara_path);
  const spUrl = fileUrl(proposal.surat_pengantar_kecamatan_path);

  return (
    <div className="px-5 py-4">
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <StatusBadge status={proposal.dpmd_status} />
            {KATEGORI_META[proposal.jenis_kegiatan] && (
              <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${KATEGORI_META[proposal.jenis_kegiatan].badge}`}>
                {KATEGORI_META[proposal.jenis_kegiatan].label}
              </span>
            )}
          </div>
          <h4 className="font-bold text-slate-800 text-sm md:text-base leading-tight">{proposal.judul_proposal}</h4>
          {firstKegiatan && (
            <p className="text-xs text-slate-600 mt-1"><span className="font-semibold">Kegiatan:</span> {firstKegiatan.nama_kegiatan}</p>
          )}
          {proposal.nama_kegiatan_spesifik && <p className="text-sm text-slate-600 mt-0.5">{proposal.nama_kegiatan_spesifik}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
            {proposal.volume && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                <LuPackage className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                <span className="truncate">Vol: <strong className="text-slate-700">{proposal.volume}</strong></span>
              </span>
            )}
            {proposal.lokasi && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                <LuMapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" /><span className="truncate">{proposal.lokasi}</span>
              </span>
            )}
            {proposal.anggaran_usulan && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-semibold">
                <LuDollarSign className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{rupiah(proposal.anggaran_usulan)}</span>
              </span>
            )}
            {proposal.dpmd_verified_at && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                <LuClock className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                <span className="truncate">Keputusan DPMD: {fmtDate(proposal.dpmd_verified_at)}</span>
              </span>
            )}
          </div>
          {proposal.kecamatan_catatan && (
            <div className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-600">
              <strong className="text-slate-700">Catatan Kecamatan:</strong> {proposal.kecamatan_catatan}
            </div>
          )}
          {proposal.dpmd_catatan && (
            <div className="mt-2 text-xs bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-indigo-800">
              <strong>Catatan DPMD:</strong> {proposal.dpmd_catatan}
            </div>
          )}
        </div>

        {/* Dokumen & informasi — semuanya lihat/unduh, tidak ada aksi ubah data */}
        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0 md:max-w-[20rem] md:justify-end">
          {proposal.file_proposal && (
            <a href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/${proposal.file_proposal}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
              title="Buka / unduh berkas proposal">
              <LuEye className="w-3.5 h-3.5" /> File
            </a>
          )}
          {baUrl && (
            <a href={baUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
              title="Buka / unduh Berita Acara Verifikasi Kecamatan">
              <LuFileText className="w-3.5 h-3.5" /> BA
            </a>
          )}
          {spUrl && (
            <a href={spUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
              title="Buka / unduh Surat Pengantar Kecamatan">
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
        </div>
      </div>

      {showHistory && (
        <BankeuRevisionHistoryModal apiBase="/dinas-pelihat/bankeu-perubahan" proposalId={proposal.id}
          proposalTitle={proposal.judul_proposal} onClose={() => setShowHistory(false)} />
      )}
      {showTracking && (
        <BankeuPerubahanTrackingModal proposal={proposal} onClose={() => setShowTracking(false)} />
      )}
    </div>
  );
};

/* ───────────────────────── Halaman utama ───────────────────────── */

const TABS = [
  { id: 'daftar', label: 'Daftar Proposal', icon: LuFolder },
  { id: 'tracking', label: 'Tracking Status', icon: LuRoute },
];

const DinasPelihatBankeuPerubahanPage = () => {
  const { user } = useAuth();
  const namaDinas = namaDinasPelihat(user);
  const [selectedYear, setSelectedYear] = useState(null);
  const [activeTab, setActiveTab] = useState('daftar');

  const [proposals, setProposals] = useState([]);
  const [tracking, setTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filter daftar proposal
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterKategori, setFilterKategori] = useState('all');
  const [filterKecamatan, setFilterKecamatan] = useState('all');
  const [expandedKec, setExpandedKec] = useState({});
  const [expandedDesa, setExpandedDesa] = useState({});

  // Filter tracking
  const [trackSearch, setTrackSearch] = useState('');
  const [trackKecamatan, setTrackKecamatan] = useState('all');
  const [trackProposal, setTrackProposal] = useState(null);
  const [expandedTrackDesa, setExpandedTrackDesa] = useState({});

  const loadData = async (tahun) => {
    setLoading(true);
    setError(null);
    try {
      const [proposalsRes, trackingRes] = await Promise.all([
        api.get('/dinas-pelihat/bankeu-perubahan/proposals', { params: { tahun } }),
        api.get('/dinas-pelihat/bankeu-perubahan/tracking', { params: { tahun } }),
      ]);
      setProposals(proposalsRes.data?.data || []);
      setTracking(trackingRes.data?.data || []);
    } catch (err) {
      console.error('Gagal memuat Bankeu Perubahan BPKAD:', err);
      setError(err.response?.data?.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYear) loadData(selectedYear);
  }, [selectedYear]);

  /* Ringkasan — dihitung dari data final yang diterima, tanpa endpoint tambahan. */
  const stats = useMemo(() => {
    let approved = 0, rejected = 0, anggaran = 0, anggaranApproved = 0;
    const desa = new Set();
    proposals.forEach(p => {
      if (p.dpmd_status === 'approved') { approved += 1; anggaranApproved += Number(p.anggaran_usulan || 0); }
      if (p.dpmd_status === 'rejected') rejected += 1;
      anggaran += Number(p.anggaran_usulan || 0);
      if (p.desa_id != null) desa.add(Number(p.desa_id));
    });
    return { total: proposals.length, approved, rejected, anggaran, anggaranApproved, desaCount: desa.size };
  }, [proposals]);

  const kecamatanOptions = useMemo(() => {
    const map = new Map();
    proposals.forEach(p => {
      if (p.desa_kecamatan_id != null) map.set(Number(p.desa_kecamatan_id), p.kecamatan_nama || '-');
    });
    return Array.from(map.entries())
      .map(([id, nama]) => ({ id, nama }))
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id'));
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return proposals.filter(p => {
      if (filterStatus !== 'all' && p.dpmd_status !== filterStatus) return false;
      if (filterKategori !== 'all' && p.jenis_kegiatan !== filterKategori) return false;
      if (filterKecamatan !== 'all' && String(p.desa_kecamatan_id) !== String(filterKecamatan)) return false;
      if (q) {
        const kegiatan = (p.kegiatan_list || []).map(k => k.nama_kegiatan).join(' ');
        const hay = `${p.judul_proposal || ''} ${p.desa_nama || ''} ${p.kecamatan_nama || ''} ${p.nama_kegiatan_spesifik || ''} ${kegiatan}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [proposals, searchQuery, filterStatus, filterKategori, filterKecamatan]);

  // Hierarki Kecamatan → Desa → Proposal (mengikuti tampilan SPKED).
  const groupedByKecamatan = useMemo(() => {
    const kecMap = new Map();
    filteredProposals.forEach(p => {
      const kecId = p.desa_kecamatan_id ?? `none-${p.kecamatan_nama || ''}`;
      if (!kecMap.has(kecId)) {
        kecMap.set(kecId, { kecId, kecNama: p.kecamatan_nama || 'Tanpa Kecamatan', count: 0, anggaran: 0, desaMap: new Map() });
      }
      const kec = kecMap.get(kecId);
      kec.count += 1;
      kec.anggaran += Number(p.anggaran_usulan || 0);

      const desaId = p.desa_id ?? `none-${p.desa_nama || ''}`;
      if (!kec.desaMap.has(desaId)) {
        kec.desaMap.set(desaId, { desaId, desaNama: p.desa_nama || 'Tanpa Desa', count: 0, anggaran: 0, items: [] });
      }
      const desa = kec.desaMap.get(desaId);
      desa.count += 1;
      desa.anggaran += Number(p.anggaran_usulan || 0);
      desa.items.push(p);
    });
    return Array.from(kecMap.values())
      .map(k => ({ ...k, desas: Array.from(k.desaMap.values()).sort((a, b) => (a.desaNama || '').localeCompare(b.desaNama || '', 'id')) }))
      .sort((a, b) => (a.kecNama || '').localeCompare(b.kecNama || '', 'id'));
  }, [filteredProposals]);

  /* Tracking — dikelompokkan per desa. */
  const trackingGroups = useMemo(() => {
    const q = trackSearch.trim().toLowerCase();
    const rows = tracking.filter(p => {
      if (trackKecamatan !== 'all' && String(p.desa_kecamatan_id) !== String(trackKecamatan)) return false;
      if (q) {
        const kegiatan = (p.kegiatan_list || []).map(k => k.nama_kegiatan).join(' ');
        const hay = `${p.judul_proposal || ''} ${p.desa_nama || ''} ${p.kecamatan_nama || ''} ${kegiatan}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const map = new Map();
    rows.forEach(p => {
      const id = p.desa_id ?? `none-${p.desa_nama || ''}`;
      if (!map.has(id)) {
        map.set(id, { key: String(id), desaNama: p.desa_nama || 'Tanpa Desa', kecamatanNama: p.kecamatan_nama || '-', proposals: [], anggaran: 0 });
      }
      const g = map.get(id);
      g.proposals.push(p);
      g.anggaran += Number(p.anggaran_usulan || 0);
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.kecamatanNama || '').localeCompare(b.kecamatanNama || '', 'id') ||
      (a.desaNama || '').localeCompare(b.desaNama || '', 'id'));
  }, [tracking, trackSearch, trackKecamatan]);

  /* Unduh rekap Excel — satu-satunya "aksi", dan sifatnya mengunduh. */
  const exportExcel = () => {
    if (!proposals.length) return;
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const appendSheet = (rows, name) => {
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Keterangan: 'Belum ada data' }]);
        XLSX.utils.book_append_sheet(wb, ws, String(name).substring(0, 31));
      };
      const primaryKegiatan = (p) => p.kegiatan_nama || p.kegiatan_list?.[0]?.nama_kegiatan || '';

      // Sheet 1 — rincian proposal final (mengikuti filter yang sedang aktif)
      appendSheet(filteredProposals.map((p, i) => ({
        No: i + 1,
        Kecamatan: p.kecamatan_nama || '',
        Desa: p.desa_nama || '',
        Kategori: KATEGORI_META[p.jenis_kegiatan]?.label || p.jenis_kegiatan || '',
        Judul: p.judul_proposal || '',
        Kegiatan: primaryKegiatan(p),
        'Kegiatan Spesifik': p.nama_kegiatan_spesifik || '',
        Volume: p.volume || '',
        Lokasi: p.lokasi || '',
        'Anggaran (Rp)': Number(p.anggaran_usulan || 0),
        'Status DPMD': STATUS_LABELS[p.dpmd_status] || p.dpmd_status || '',
        'Catatan DPMD': p.dpmd_catatan || '',
        'Tgl Keputusan DPMD': fmtDate(p.dpmd_verified_at),
      })), 'Proposal Final');

      // Sheet 2 — rekap anggaran per desa
      const perDesa = new Map();
      filteredProposals.forEach(p => {
        const key = p.desa_id ?? `none-${p.desa_nama || ''}`;
        if (!perDesa.has(key)) {
          perDesa.set(key, { kecamatan: p.kecamatan_nama || '', desa: p.desa_nama || '', count: 0, anggaran: 0, anggaranApproved: 0 });
        }
        const e = perDesa.get(key);
        e.count += 1;
        e.anggaran += Number(p.anggaran_usulan || 0);
        if (p.dpmd_status === 'approved') e.anggaranApproved += Number(p.anggaran_usulan || 0);
      });
      const rekapRows = Array.from(perDesa.values())
        .sort((a, b) => (a.kecamatan || '').localeCompare(b.kecamatan || '', 'id') || (a.desa || '').localeCompare(b.desa || '', 'id'))
        .map((d, i) => ({
          No: i + 1,
          Kecamatan: d.kecamatan,
          Desa: d.desa,
          'Jumlah Proposal': d.count,
          'Total Anggaran (Rp)': d.anggaran,
          'Anggaran Disetujui (Rp)': d.anggaranApproved,
        }));
      if (rekapRows.length) {
        rekapRows.push({
          No: '', Kecamatan: '', Desa: 'TOTAL',
          'Jumlah Proposal': rekapRows.reduce((s, r) => s + r['Jumlah Proposal'], 0),
          'Total Anggaran (Rp)': rekapRows.reduce((s, r) => s + r['Total Anggaran (Rp)'], 0),
          'Anggaran Disetujui (Rp)': rekapRows.reduce((s, r) => s + r['Anggaran Disetujui (Rp)'], 0),
        });
      }
      appendSheet(rekapRows, 'Rekap per Desa');

      XLSX.writeFile(wb, `bankeu-perubahan-${selectedYear}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const toggleKec = (id) => setExpandedKec(e => ({ ...e, [id]: e[id] === undefined ? false : !e[id] }));
  const isKecExpanded = (id) => expandedKec[id] !== false;   // default terbuka
  const toggleDesa = (key) => setExpandedDesa(e => ({ ...e, [key]: !e[key] }));

  /* ─── Layar pilih tahun ─── */
  if (!selectedYear) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="inline-flex h-16 w-16 bg-slate-800 rounded-2xl items-center justify-center mb-5 shadow-lg">
              <LuFolder className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Bantuan Keuangan Perubahan</h1>
            <p className="text-slate-500 mt-2">{namaDinas} · lihat &amp; unduh arsip proposal (hanya baca)</p>
          </div>
          <button onClick={() => setSelectedYear(2026)}
            className="group w-full flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-slate-400 hover:shadow-md">
            <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-slate-100 flex items-center justify-center transition-colors group-hover:bg-slate-200">
              <LuFolder className="w-6 h-6 text-slate-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900">TA 2026</h3>
              <p className="text-sm text-slate-500">Proposal Perubahan Tahun Anggaran 2026</p>
            </div>
            <LuChevronRight className="w-5 h-5 text-slate-300 transition-all group-hover:text-slate-500" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-slate-50 min-h-screen">
      {/* Header + tab */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center gap-2 h-14 overflow-x-auto scrollbar-hide">
            <button onClick={() => setSelectedYear(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0">
              <LuArrowLeft className="w-4 h-4" /><span>TA {selectedYear}</span>
            </button>
            <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    active ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
                  <tab.icon className="w-4 h-4" />{tab.label}
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => loadData(selectedYear)} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                <LuRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Muat ulang</span>
              </button>
              <button onClick={exportExcel} disabled={exporting || !proposals.length}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                <LuDownload className="w-4 h-4" /><span className="hidden md:inline">Unduh Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        {/* Penegasan peran BPKAD */}
        <div className="flex items-start gap-2 rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-sm text-slate-700">
          <LuEye className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Mode <strong>pelihat</strong>. {namaDinas} dapat melihat dan mengunduh proposal beserta dokumennya,
            namun tidak dapat memverifikasi maupun mengubah data apa pun. Yang ditampilkan hanya proposal
            yang keputusan DPMD-nya sudah final.
          </span>
        </div>

        {/* Ringkasan */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={LuFolder} label="Proposal Final" value={stats.total} tone="bg-slate-100 text-slate-600" />
          <StatCard icon={LuCircleCheck} label="Disetujui" value={stats.approved} tone="bg-emerald-50 text-emerald-600" />
          <StatCard icon={LuCircleX} label="Ditolak" value={stats.rejected} tone="bg-rose-50 text-rose-600" />
          <StatCard icon={LuHouse} label="Desa" value={stats.desaCount} tone="bg-indigo-50 text-indigo-600" />
          <StatCard icon={LuDollarSign} label="Anggaran Disetujui" value={rupiah(stats.anggaranApproved)} tone="bg-amber-50 text-amber-600" />
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <LuRefreshCw className="w-6 h-6 animate-spin mr-2" /> Memuat data…
          </div>
        ) : activeTab === 'daftar' ? (
          <>
            {/* Filter */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><LuFilter className="w-4 h-4" /> Filter:</div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="all">Semua Status</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="all">Semua Kategori</option>
                {KATEGORI_KEYS.map(k => <option key={k} value={k}>{KATEGORI_META[k].label}</option>)}
              </select>
              <select value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="all">Semua Kecamatan</option>
                {kecamatanOptions.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari judul / desa / kecamatan / kegiatan..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <span className="ml-auto text-xs text-slate-500">{filteredProposals.length} dari {proposals.length} proposal</span>
            </div>

            {filteredProposals.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <LuInfo className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">
                  {proposals.length === 0 ? 'Belum ada proposal yang final di DPMD' : 'Tidak ada proposal yang sesuai filter'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedByKecamatan.map(kec => {
                  const kecOpen = isKecExpanded(kec.kecId);
                  return (
                    <div key={kec.kecId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <button onClick={() => toggleKec(kec.kecId)}
                        className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                            {kecOpen ? <LuChevronDown className="w-5 h-5 text-white" /> : <LuChevronRight className="w-5 h-5 text-white" />}
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                              <LuMapPin className="w-4 h-4 text-slate-500" /> Kec. {kec.kecNama}
                            </h3>
                            <p className="text-xs text-slate-500">{kec.desas.length} desa · {kec.count} proposal · {rupiah(kec.anggaran)}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold px-3 py-1 rounded-lg border bg-slate-100 text-slate-700 border-slate-200">{kec.count}</span>
                      </button>

                      {kecOpen && (
                        <div className="p-3 space-y-2 bg-slate-50/60">
                          {kec.desas.map(desa => {
                            const desaKey = `${kec.kecId}::${desa.desaId}`;
                            const desaOpen = expandedDesa[desaKey] === true;
                            return (
                              <div key={desaKey} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <button onClick={() => toggleDesa(desaKey)}
                                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
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
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">{desa.count}</span>
                                  </div>
                                </button>
                                {desaOpen && (
                                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                                    <div className="sm:hidden px-4 py-2 bg-amber-50 text-amber-800 text-xs font-bold flex items-center gap-1">
                                      <LuDollarSign className="w-3.5 h-3.5" /> Total {rupiah(desa.anggaran)}
                                    </div>
                                    {desa.items.map(p => <ProposalRow key={p.id} proposal={p} />)}
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
          </>
        ) : (
          <>
            {/* Filter tracking */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><LuFilter className="w-4 h-4" /> Filter:</div>
              <select value={trackKecamatan} onChange={e => setTrackKecamatan(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="all">Semua Kecamatan</option>
                {kecamatanOptions.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={trackSearch} onChange={e => setTrackSearch(e.target.value)}
                  placeholder="Cari judul / desa / kecamatan / kegiatan..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <span className="ml-auto text-xs text-slate-500">{trackingGroups.length} desa</span>
            </div>

            {trackingGroups.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <LuInfo className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">Tidak ada data.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trackingGroups.map(group => {
                  const isOpen = expandedTrackDesa[group.key] === true;
                  return (
                    <div key={group.key} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <button onClick={() => setExpandedTrackDesa(e => ({ ...e, [group.key]: !e[group.key] }))}
                        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-3 bg-slate-800 rounded-xl flex-shrink-0">
                            <LuMapPin className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-left min-w-0">
                            <h3 className="font-bold text-base text-slate-900 truncate">{group.desaNama}</h3>
                            <p className="text-sm text-slate-500 truncate">{group.kecamatanNama}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="hidden sm:inline px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                            {group.proposals.length} proposal
                          </span>
                          <div className="hidden md:block text-right">
                            <p className="text-xs text-slate-500">Total Anggaran</p>
                            <p className="text-sm font-bold text-slate-800">{rupiah(group.anggaran)}</p>
                          </div>
                          {isOpen ? <LuChevronDown className="h-5 w-5 text-slate-400" /> : <LuChevronRight className="h-5 w-5 text-slate-400" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-slate-200 p-3 sm:p-6 space-y-5">
                          {group.proposals.map((p, idx) => (
                            <div key={p.id} className={idx > 0 ? 'pt-4 border-t border-slate-100' : ''}>
                              <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                                  <LuFileText className="h-5 w-5 text-slate-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm sm:text-base text-slate-900">{p.judul_proposal}</h4>
                                  {(p.kegiatan_list || []).length > 0 && (
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] sm:text-xs font-medium">
                                      {(p.kegiatan_list || []).map(k => k.nama_kegiatan).join(', ')}
                                    </span>
                                  )}
                                </div>
                                <StatusBadge status={p.dpmd_status} />
                              </div>
                              <div className="sm:ml-11 space-y-3">
                                <PerubahanStepper proposal={p} />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                  <div className="bg-slate-50 rounded-lg p-2">
                                    <p className="text-slate-500">Anggaran</p>
                                    <p className="font-semibold text-slate-800">{rupiah(p.anggaran_usulan)}</p>
                                  </div>
                                  <div className="bg-slate-50 rounded-lg p-2">
                                    <p className="text-slate-500">Kategori</p>
                                    <p className="font-semibold text-slate-800 truncate">{KATEGORI_META[p.jenis_kegiatan]?.label || '-'}</p>
                                  </div>
                                  <div className="bg-slate-50 rounded-lg p-2">
                                    <p className="text-slate-500">Volume</p>
                                    <p className="font-semibold text-slate-800 truncate">{p.volume || '-'}</p>
                                  </div>
                                  <div className="bg-slate-50 rounded-lg p-2">
                                    <p className="text-slate-500">Lokasi</p>
                                    <p className="font-semibold text-slate-800 truncate">{p.lokasi || '-'}</p>
                                  </div>
                                </div>
                                {(p.kecamatan_catatan || p.dpmd_catatan) && (
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                                    {p.dpmd_catatan && <p className="text-xs text-slate-600"><strong>DPMD:</strong> {p.dpmd_catatan}</p>}
                                    {p.kecamatan_catatan && <p className="text-xs text-slate-600"><strong>Kecamatan:</strong> {p.kecamatan_catatan}</p>}
                                  </div>
                                )}
                                <div className="flex justify-end">
                                  <button onClick={() => setTrackProposal(p)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                                    <LuRoute className="w-3.5 h-3.5" /> Lacak
                                  </button>
                                </div>
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
          </>
        )}
      </div>

      {trackProposal && <BankeuPerubahanTrackingModal proposal={trackProposal} onClose={() => setTrackProposal(null)} />}
    </div>
  );
};

export default DinasPelihatBankeuPerubahanPage;
