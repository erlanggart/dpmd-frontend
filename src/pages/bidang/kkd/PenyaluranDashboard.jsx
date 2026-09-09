// Reusable penyaluran dashboard for KKD funds (ADD/DD/BHPRD/BANKEU/BP).
// Data is live from SIPANDA (see useSipanda); each page passes a config.
// Design mirrors KKDPage.jsx: clean white cards, thin borders, subtle accent.
import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, RotateCcw, Download, ChevronRight, MapPin, ArrowLeft,
  CheckCircle2, Clock, AlertTriangle, CircleDashed, X,
  TrendingUp, CalendarRange, Layers, Activity,
} from 'lucide-react';
import {
  Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useSipanda } from '../../../hooks/useSipanda';
import { useBidangPath } from '../../../hooks/useBidangPath';
import SelectBox from '../../../components/ui/SelectBox';
import { persen, fmtPersen } from '../../../utils/persen';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

// ─── Satu sistem warna untuk seluruh dana ────────────────────────────────────
//
// Prop `accent` dipertahankan supaya pemanggil tidak perlu diubah, tapi semua
// varian memakai tone yang sama — ADD/DD/BHPRD/BANKEU/BP tampil sebagai satu
// keluarga, bukan lima halaman berbeda warna.
//
// WARNANYA PUNYA ARTI, bukan hiasan. Tiga keadaan saja, dan halaman ini sudah
// memakainya di bagan tahap: HIJAU sudah cair/selesai, KUNING sedang berjalan,
// ABU belum mulai. Yang belum konsisten justru bilah realisasinya — dulu abu
// tua, sementara status "Dana Telah Dicairkan" di kartu sebelahnya hijau. Satu
// arti digambar dua warna di layar yang sama. Sekarang semuanya hijau.
//
// `bar` dan `hex` karena itu berarti SUDAH CAIR: bilah realisasi, titik
// legenda, tahap yang selesai, dan kurva kumulatif.
const BRAND_ACCENT = {
  hex: '#10b981',                  // kurva realisasi kumulatif (chart.js butuh hex)
  tile: 'bg-slate-900 text-white',
  kicker: 'text-brand-700',        // eyebrow identitas bidang, satu-satunya sisa merah
  bar: 'bg-emerald-500',
  chip: 'bg-slate-900 text-white',
  soft: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const ACCENTS = {
  emerald: BRAND_ACCENT,
  violet: BRAND_ACCENT,
  blue: BRAND_ACCENT,
  amber: BRAND_ACCENT,
  rose: BRAND_ACCENT,
};

// ─── Status → tone/icon (keyword based, matches SIPANDA `sts` values) ────────────
const statusTone = (s = '') => {
  const t = s.toLowerCase();
  if (t.includes('cair')) return { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60', dot: 'bg-emerald-500', Icon: CheckCircle2, hex: '#10b981' };
  if (t.includes('proses') || t.includes('sp2d') || t.includes('spp')) return { chip: 'bg-amber-50 text-amber-700 ring-amber-200/60', dot: 'bg-amber-500', Icon: Clock, hex: '#f59e0b' };
  if (t.includes('review')) return { chip: 'bg-blue-50 text-blue-700 ring-blue-200/60', dot: 'bg-blue-500', Icon: Clock, hex: '#3b82f6' };
  if (t.includes('kembali') || t.includes('tolak') || t.includes('batal')) return { chip: 'bg-rose-50 text-rose-700 ring-rose-200/60', dot: 'bg-rose-500', Icon: AlertTriangle, hex: '#f43f5e' };
  return { chip: 'bg-slate-100 text-slate-600 ring-slate-200/60', dot: 'bg-slate-400', Icon: CircleDashed, hex: '#94a3b8' };
};

const fmtInt = (n) => Number(n || 0).toLocaleString('id-ID');
const fmtRp = (n) =>
  n > 0
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', notation: 'compact', maximumFractionDigits: 2 }).format(n)
    : 'Rp 0';
const fmtRpFull = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => (d ? new Date(d.replace(' ', 'T')).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// (StatCell dihapus bersama strip empat kartu statistik yang memakainya.)

const ChartCard = ({ icon: Icon, title, subtitle, children }) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5">
    <div className="flex items-center gap-2.5 mb-4">
      <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-slate-900 leading-tight truncate">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-slate-500 leading-tight truncate" title={subtitle}>{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

export default function PenyaluranDashboard({
  sumberDana,        // e.g. 'ADD' — matched against row.sumber_dana
  // Sebagian sumber dana BERGANTI NAMA tiap tahun anggaran di SIPANDA. Bantuan
  // keuangan pernah tertulis "BANKEU INFRAS DESA"; di 2026 namanya
  // "BANKEU AKSELERASI PEDESAAN". Pencocokan persis membuat halamannya kosong
  // tanpa satu pun pesan galat begitu namanya berganti — kegagalan yang paling
  // sulit disadari, karena tampilannya tetap normal dan hanya angkanya nol.
  // Pemanggil yang namanya tidak stabil menyerahkan penyaringnya sendiri.
  cocokSumber,
  title,             // 'Alokasi Dana Desa'
  short,             // 'ADD'
  subtitle,
  accent = 'emerald',
  dimField = 'nm_tahap', // 'periode' for ADD (bulanan), 'nm_tahap' for tahap-based
  dimLabel = 'Tahap',    // shown in the selector ('Bulan' / 'Tahap')
  icon: HeaderIcon = MapPin,
  // Saat dirender di dalam tab Core Dashboard, judul & tombol kembali sudah
  // disediakan halaman induk — jangan digambar dua kali.
  embedded = false,
}) {
  const A = ACCENTS[accent] || ACCENTS.emerald;
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const { rows, loading, error, reload } = useSipanda();

  const [sel, setSel] = useState('Semua');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openKec, setOpenKec] = useState({});

  // Tabel rekap ada jauh di bawah lipatan layar. Tanpa ini, mengklik kartu
  // status terasa seperti tidak terjadi apa-apa: penyaringnya bekerja, tapi
  // hasilnya di luar pandangan. Halaman dibawa ke tabelnya begitu satu status
  // dipilih — dan TIDAK dibawa ke mana-mana saat penyaringnya dilepas, karena
  // saat itu pembaca justru sedang melihat kartunya.
  const tabelRef = useRef(null);

  const pilihStatus = (s) => {
    const lepas = statusFilter === s;
    setStatusFilter(lepas ? '' : s);
    if (lepas) return;
    // Ditunda satu putaran supaya tabelnya sudah tergambar ulang lebih dulu.
    requestAnimationFrame(() => {
      tabelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const fundRows = useMemo(
    () => rows.filter((r) => (cocokSumber ? cocokSumber(r.sumber_dana || '') : r.sumber_dana === sumberDana)),
    [rows, cocokSumber, sumberDana]
  );

  // Nama sumber dana APA ADANYA dari SIPANDA. Untuk pemanggil yang memakai
  // penyaring longgar, inilah satu-satunya cara pembaca tahu tahun ini dananya
  // tercatat sebagai apa — "BANKEU AKSELERASI PEDESAAN" atau nama lain.
  const namaSumberAsli = useMemo(
    () => [...new Set(fundRows.map((r) => r.sumber_dana).filter(Boolean))],
    [fundRows]
  );

  // Dimension options (periode/tahap) in chronological order via id_periode.
  const dims = useMemo(() => {
    const order = new Map();
    fundRows.forEach((r) => {
      const v = r[dimField] || '—';
      const o = parseInt(r.id_periode || '0', 10);
      if (!order.has(v) || o < order.get(v)) order.set(v, o);
    });
    return [...order.entries()].sort((a, b) => a[1] - b[1]).map((e) => e[0]);
  }, [fundRows, dimField]);

  // Normalized entries for the current dimension selection.
  const entries = useMemo(
    () =>
      fundRows
        .filter((r) => sel === 'Semua' || (r[dimField] || '—') === sel)
        .map((r) => ({
          kecamatan: r.kecamatan,
          desa: r.desa,
          id: r.id,
          dim: r[dimField] || '—',
          anggaran: parseFloat(r.anggaran || 0),
          cair: r.sudah_cair === 'Y',
          status: r.sts || 'Belum Mengajukan',
          tglCair: r.tanggal_pencairan,
          sp2d: r.sp2d,
        })),
    [fundRows, sel, dimField]
  );

  const statusOptions = useMemo(
    () => [...new Set(entries.map((e) => e.status))].sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (!q || e.desa?.toLowerCase().includes(q) || e.kecamatan?.toLowerCase().includes(q)) &&
        (!statusFilter || e.status === statusFilter)
    );
  }, [entries, search, statusFilter]);

  // Aggregate stats over current selection (before search/status filter).
  const stats = useMemo(() => {
    const cair = entries.filter((e) => e.cair);
    const total = entries.reduce((s, e) => s + e.anggaran, 0);
    const cairAmt = cair.reduce((s, e) => s + e.anggaran, 0);
    return {
      desa: new Set(entries.map((e) => `${e.kecamatan}|${e.desa}`)).size,
      kec: new Set(entries.map((e) => e.kecamatan)).size,
      total,
      cairAmt,
      belum: total - cairAmt,
      cairCount: cair.length,
      count: entries.length,
      pct: persen(cair.length, entries.length),
      // Porsi berdasarkan RUPIAH, bukan jumlah baris. Keduanya berbeda ketika
      // nilai tiap penyaluran tidak sama, dan yang ditanyakan pimpinan selalu
      // "berapa uangnya", bukan "berapa barisnya".
      pctAmt: persen(cairAmt, total),
    };
  }, [entries]);

  // (statusDist dihapus bersama grid kartu status yang memakainya — sebaran
  // status kini dibaca dari statusAll di grafik "Status Pencairan", yang sudah
  // bisa diklik untuk menyaring.)

  // ─────────────────────────────────────────────────────────────────────────────
  // INFOGRAPHIC AGGREGATES — module-wide (independent of the selector above).
  //
  // The data has two cadences, and each tells a different story:
  //  • ADD  → 12 monthly tranches, disbursed sequentially (a ramp toward 100%).
  //  • DD/BHPRD/BANKEU/BP → 2–4 tahap; a tahap is either done, running, or unopened.
  // Anggaran per tranche is (near) constant, so the meaningful metric is *pencairan*
  // progress, not raw anggaran — and kecamatan variation only exists on the active
  // tahap of staged funds, so we surface "kecamatan tertinggal" instead of a top-N.
  // ─────────────────────────────────────────────────────────────────────────────
  const isMonthly = dimField === 'periode';

  // Per-tranche (bulan/tahap) pencairan, chronological. phase drives all visuals.
  const dimBreakdown = useMemo(() => {
    const m = {};
    fundRows.forEach((r) => {
      const k = r[dimField] || '—';
      const amt = parseFloat(r.anggaran || 0);
      (m[k] ||= { total: 0, cair: 0, count: 0, cairCount: 0 });
      m[k].total += amt; m[k].count += 1;
      if (r.sudah_cair === 'Y') { m[k].cair += amt; m[k].cairCount += 1; }
    });
    return dims.map((d) => {
      const v = m[d] || { total: 0, cair: 0, count: 0, cairCount: 0 };
      const pctDesa = persen(v.cairCount, v.count);
      const phase = v.cairCount === 0 ? 'pending' : v.cairCount >= v.count ? 'done' : 'active';
      return { label: d, ...v, desaTotal: v.count, desaCair: v.cairCount, pctDesa, phase };
    });
  }, [fundRows, dims, dimField]);

  const moduleAgg = useMemo(() => {
    let total = 0, cair = 0, count = 0, cairCount = 0;
    fundRows.forEach((r) => {
      const amt = parseFloat(r.anggaran || 0);
      total += amt; count += 1;
      if (r.sudah_cair === 'Y') { cair += amt; cairCount += 1; }
    });
    const done = dimBreakdown.filter((d) => d.phase === 'done');
    const pending = dimBreakdown.filter((d) => d.phase === 'pending');
    const active = dimBreakdown.find((d) => d.phase === 'active');
    const lastDone = [...done].pop();
    return {
      total, cair, belum: total - cair, count, cairCount,
      desa: new Set(fundRows.map((r) => `${r.kecamatan}|${r.desa}`)).size,
      kec: new Set(fundRows.map((r) => r.kecamatan)).size,
      pctAmt: persen(cair, total),
      pctCount: persen(cairCount, count),
      totalDims: dimBreakdown.length,
      doneCount: done.length,
      pendingCount: pending.length,
      active, lastDone,
    };
  }, [fundRows, dimBreakdown]);
  const moduleTotal = moduleAgg.total;

  // Cumulative realisasi curve (%) — the monthly cadence story (ADD).
  const cumulative = useMemo(() => {
    let acc = 0;
    return dimBreakdown.map((d) => {
      acc += d.cair;
      return { label: d.label, cairCum: acc, pctCum: moduleTotal ? (acc / moduleTotal) * 100 : 0 };
    });
  }, [dimBreakdown, moduleTotal]);

  // Status pipeline over all penyaluran, ranked.
  const statusAll = useMemo(() => {
    const m = {};
    fundRows.forEach((r) => { const s = r.sts || 'Belum Mengajukan'; m[s] = (m[s] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [fundRows]);

  // Kecamatan tertinggal on the tranche that is actually in progress (staged funds).
  // Falls back to the last done tranche so there is always a meaningful spread.
  const laggingFocus = moduleAgg.active || moduleAgg.lastDone;
  const laggingKec = useMemo(() => {
    if (isMonthly || !laggingFocus) return [];
    const m = {};
    fundRows.forEach((r) => {
      if ((r[dimField] || '—') !== laggingFocus.label) return;
      (m[r.kecamatan] ||= { n: 0, c: 0 });
      m[r.kecamatan].n += 1;
      if (r.sudah_cair === 'Y') m[r.kecamatan].c += 1;
    });
    return Object.entries(m)
      .map(([kec, v]) => ({ kec, n: v.n, c: v.c, pct: persen(v.c, v.n) }))
      .sort((a, b) => a.pct - b.pct || b.n - a.n)
      .slice(0, 8);
  }, [fundRows, dimField, isMonthly, laggingFocus]);

  // Group filtered rows by kecamatan.
  const grouped = useMemo(() => {
    const m = {};
    filtered.forEach((e) => { (m[e.kecamatan] ||= []).push(e); });
    return Object.entries(m)
      .map(([kec, items]) => ({
        kec,
        items,
        desaCount: new Set(items.map((i) => i.desa)).size,
        total: items.reduce((s, i) => s + i.anggaran, 0),
        cairCount: items.filter((i) => i.cair).length,
      }))
      .sort((a, b) => a.kec.localeCompare(b.kec));
  }, [filtered]);

  const showDim = sel === 'Semua';

  const exportExcel = () => {
    if (!filtered.length) return toast.error('Tidak ada data untuk diekspor');
    const aoa = [
      [`LAPORAN PENYALURAN ${short} 2026 — SIPANDA Kab. Bogor`],
      [`Periode/Tahap: ${sel}`],
      [],
      ['No', 'Kecamatan', 'Desa', dimLabel, 'Status', 'Anggaran', 'Tgl Pencairan', 'No. SP2D'],
      ...filtered.map((e, i) => [i + 1, e.kecamatan, e.desa, e.dim, e.status, e.anggaran, e.tglCair || '', e.sp2d || '']),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 24 }, { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, short);
    XLSX.writeFile(wb, `${short}_${sel}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data diekspor ke Excel');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-slate-200 border-t-slate-900 mx-auto" />
          <p className="mt-3 text-sm text-slate-500">Memuat data dari SIPANDA…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
          <p className="mt-3 text-sm font-semibold text-slate-800">Gagal memuat data SIPANDA</p>
          <p className="mt-1 text-[12px] text-slate-500">{error}</p>
          <button onClick={() => reload(true)} className="mt-4 h-9 px-4 rounded-lg bg-slate-900 text-white text-[12.5px] font-semibold inline-flex items-center gap-2">
            <RotateCcw className="h-3.5 w-3.5" /> Coba lagi
          </button>
        </div>
      </div>
    );
  }

  // ── Chart config — only the cumulative realisasi curve is charted (monthly funds).
  // Everything else is rendered as native progress bars for clarity & consistency.
  const axisFont = { size: 11, weight: '500' };
  const baseTooltip = {
    backgroundColor: '#0f172a', padding: 10, cornerRadius: 8, displayColors: false,
    titleFont: { size: 12, weight: 'bold' }, bodyFont: { size: 12 },
  };
  const cumData = {
    labels: cumulative.map((c) => c.label),
    datasets: [{
      label: 'Realisasi kumulatif', data: cumulative.map((c) => c.pctCum),
      borderColor: A.hex, backgroundColor: `${A.hex}1f`, fill: true, tension: 0.35,
      borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: A.hex, pointBorderColor: '#fff', pointBorderWidth: 1.5,
    }],
  };
  const cumOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...baseTooltip,
        callbacks: {
          title: (items) => items[0].label,
          label: (c) => ` ${c.parsed.y.toFixed(1)}% dari total anggaran`,
          afterLabel: (c) => `Kumulatif cair: ${fmtRpFull(cumulative[c.dataIndex].cairCum)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: axisFont, color: '#64748b', maxRotation: 0, autoSkip: true } },
      y: { min: 0, max: 100, grid: { color: 'rgba(15,23,42,0.05)' }, ticks: { font: axisFont, color: '#64748b', stepSize: 25, callback: (v) => `${v}%` } },
    },
  };

  // Phase → visual language shared by every progress bar/pill.
  const PHASE = {
    // Angka persennya ikut hijau, bukan merah bata: "100%" yang ditulis merah
    // terbaca seperti peringatan, padahal artinya justru sudah beres.
    done:    { label: 'Selesai',  bar: A.bar,          text: 'text-emerald-600', Icon: CheckCircle2, dot: A.bar },
    active:  { label: 'Berjalan', bar: 'bg-amber-500', text: 'text-amber-600', Icon: Clock,       dot: 'bg-amber-500' },
    pending: { label: 'Belum',    bar: 'bg-slate-200', text: 'text-slate-400', Icon: CircleDashed, dot: 'bg-slate-300' },
  };

  return (
    <div className={`text-slate-900 ${embedded ? '' : 'min-h-screen bg-slate-50'}`}>
      {/* Header */}
      <div className="px-4 sm:px-6 pt-5 pb-5">
        {!embedded && (
        <button
          onClick={() => navigate(getPath('/bidang/kkd'))}
          className="mb-3 inline-flex items-center gap-1.5 h-8 pl-2 pr-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-[12px] font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard Bidang KKD
        </button>
        )}

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {!embedded && (
          <div className="flex items-start gap-3 sm:gap-4">
            <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl ring-1 flex items-center justify-center shrink-0 ${A.tile}`}>
              <HeaderIcon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`text-[10px] sm:text-[10.5px] font-bold tracking-[0.14em] uppercase ${A.kicker}`}>Bidang 04 · KKD</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-wide text-slate-500">{short} · 2026</span>
              </div>
              <h1 className="text-[22px] sm:text-[26px] lg:text-[28px] leading-[1.1] font-semibold tracking-tight">{title}</h1>
              <p className="mt-1.5 text-[12.5px] sm:text-[13.5px] text-slate-500 max-w-xl">{subtitle}</p>
            </div>
          </div>
          )}
          <div className="flex items-center gap-2 shrink-0 lg:ml-auto">
            <button onClick={() => reload(true)} className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[12.5px] font-semibold hover:bg-slate-50 flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sinkronkan</span>
            </button>
            <button onClick={exportExcel} className="h-9 px-3.5 rounded-lg bg-slate-900 text-white text-[12.5px] font-semibold hover:bg-slate-800 flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Tab tahap/bulan — seluruh angka, grafik, dan tabel di bawah
            mengikuti pilihan di sini. */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-[13px] font-semibold text-slate-500">
                {dimLabel}
              </span>
              {/* Hanya untuk sumber dana yang namanya berganti tiap tahun:
                  pembaca berhak tahu angka di bawah ini diambil dari pos
                  bernama apa di SIPANDA tahun ini. */}
              {cocokSumber && namaSumberAsli.length > 0 && (
                <span className="text-[12px] text-slate-400">
                  {namaSumberAsli.join(' · ')}
                </span>
              )}
            </span>
            {sel !== 'Semua' && (
              <button
                onClick={() => setSel('Semua')}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-slate-900"
              >
                <X className="h-3.5 w-3.5" /> Tampilkan semua
              </button>
            )}
          </div>
          <div
            role="tablist"
            aria-label={`Pilih ${dimLabel}`}
            className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          >
            {['Semua', ...dims].map((d) => {
              const active = sel === d;
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSel(d)}
                  className={`shrink-0 rounded-lg border px-3.5 py-2 text-[12.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {d === 'Semua' ? `Semua ${dimLabel}` : d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Strip empat kartu statistik dan bilah progres yang dulu ada di sini
            SENGAJA DIHAPUS. Isinya sama persis dengan hero di bawah selama
            pilihannya "Semua": pagu, nilai cair, dan persentase yang sama
            tergambar dua kali, lengkap dengan dua bilah progres berdampingan.
            Pembaca yang melihat satu angka muncul dua kali akan berhenti untuk
            memastikan keduanya memang sama — dan itu justru memperlambat, bukan
            memperjelas. Hero kini mengikuti pilihan bulan/tahap, jadi tidak ada
            informasi yang hilang. */}
      </div>

      {/* ── Infografik ─────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pb-2">
        {/* Judul bagian: satu baris, bukan kicker merah mungil di atas judul.
            Dua label bertumpuk untuk satu bagian membuat halaman terasa penuh
            padahal isinya cuma satu kalimat. */}
        <div className="flex items-baseline justify-between gap-3 mb-3.5">
          <h2 className="text-[17px] font-bold tracking-tight text-slate-900">
            {isMonthly ? `Progres Bulanan ${short}` : `Progres per Tahap ${short}`}
          </h2>
          <span className="hidden sm:inline text-[13px] text-slate-400">se-Kabupaten · 2026</span>
        </div>

        {/* Hero — realisasi anggaran (money, one honest number) + cadence-aware chips */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-3 sm:mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_auto] gap-5 lg:gap-6 items-center">
            {/* Angka utama MENGIKUTI pilihan bulan/tahap di atas. Dulu ia
                selalu se-tahun sementara strip di atasnya mengikuti pilihan,
                jadi memilih satu bulan mengubah satu blok tapi tidak yang lain
                — dua angka berbeda di layar yang sama tanpa penjelasan. */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-semibold text-slate-500">Realisasi Anggaran</span>
                {sel !== 'Semua' && (
                  <span className="text-[13px] font-semibold text-slate-900">· {sel}</span>
                )}
              </div>

              {/* Dua angka besar berdampingan: rupiah yang cair, dan porsinya.
                  Persen dibuat sebesar rupiahnya karena pertanyaan pertama
                  pimpinan hampir selalu "sudah berapa persen", bukan nominal. */}
              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-[34px] sm:text-[42px] font-extrabold tracking-tight text-slate-900 leading-none" title={fmtRpFull(stats.cairAmt)}>
                  {fmtRp(stats.cairAmt)}
                </span>
                <span className="text-[22px] sm:text-[26px] font-bold tracking-tight text-slate-400 leading-none">
                  {fmtPersen(stats.pctAmt)}
                </span>
              </div>

              <div className="mt-4 h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${A.bar} transition-all duration-700`} style={{ width: `${stats.pctAmt}%` }} />
              </div>

              {/* Dua keterangan saja. Baris panjang berisi cakupan desa,
                  kecamatan, dan jumlah penyaluran dihapus dari sini: angkanya
                  sudah ada di kartu Cakupan di sebelah, dan menumpuk enam
                  angka dalam satu baris kecil justru tidak terbaca. */}
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[13px]">
                <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                  <span className={`h-2.5 w-2.5 rounded-full ${A.bar}`} />
                  Cair {fmtRp(stats.cairAmt)}
                </span>
                <span className="inline-flex items-center gap-2 font-medium text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  Belum {fmtRp(stats.belum)}
                </span>
                <span className="text-slate-400">dari {fmtRp(stats.total)} pagu</span>
              </div>
            </div>
            {/* Tiga keterangan konteks. Dulu tiap kartu memuat kotak ikon
                berwarna, angka, label merah huruf besar 10px, DAN baris
                keterangan 10,5px — empat lapis untuk menyampaikan satu fakta.
                Sekarang dua lapis: angkanya, dan satu label yang menjelaskan
                angka itu apa. Keterangan ketiga digabung ke labelnya. */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {(isMonthly
                ? [
                    { Icon: CheckCircle2, label: 'Bulan tersalur penuh', value: `${moduleAgg.doneCount}/${moduleAgg.totalDims}` },
                    { Icon: CalendarRange, label: moduleAgg.pendingCount ? `Terakhir cair · ${moduleAgg.pendingCount} bulan menunggu` : 'Terakhir cair · lunas', value: moduleAgg.lastDone?.label || '—' },
                    { Icon: MapPin, label: `Desa · ${fmtInt(moduleAgg.kec)} kecamatan`, value: fmtInt(moduleAgg.desa) },
                  ]
                : [
                    { Icon: CheckCircle2, label: 'Tahap selesai penuh', value: `${moduleAgg.doneCount}/${moduleAgg.totalDims}` },
                    { Icon: Clock, label: moduleAgg.active ? `Tahap berjalan · ${fmtPersen(moduleAgg.active.pctDesa)} desa cair` : 'Tahap berjalan', value: moduleAgg.active ? moduleAgg.active.label : (moduleAgg.pendingCount ? 'Belum mulai' : 'Selesai') },
                    { Icon: MapPin, label: `Desa · ${fmtInt(moduleAgg.kec)} kecamatan`, value: fmtInt(moduleAgg.desa) },
                  ]
              ).map(({ Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 px-3.5 py-3.5 min-w-[108px]">
                  <div className="text-[21px] font-bold tracking-tight text-slate-900 leading-none truncate" title={String(value)}>
                    {value}
                  </div>
                  <div className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-slate-500">
                    <Icon className="h-3.5 w-3.5 mt-px shrink-0 text-slate-400" strokeWidth={2} />
                    <span className="line-clamp-2" title={label}>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {moduleTotal <= 0 ? (
          <ChartCard icon={CircleDashed} title={`Progres per ${dimLabel}`} subtitle="Belum ada anggaran tercatat">
            <div className="h-40 flex items-center justify-center text-center">
              <div>
                <CircleDashed className="h-9 w-9 text-slate-200 mx-auto mb-2" />
                <p className="text-[12.5px] text-slate-400">Belum ada nilai anggaran / pencairan<br />untuk {short} di SIPANDA.</p>
              </div>
            </div>
          </ChartCard>
        ) : (
          // items-start: tiap kartu setinggi isinya sendiri. Tanpa itu kedua
          // kartu dipaksa sama tinggi, dan untuk dana bertahap dua saja (DD,
          // BANKEU, BP) kartu kiri yang cuma berisi dua baris ikut merenggang
          // mengikuti delapan kartu status di kanan — kotak putih separuh
          // kosong yang terbaca seperti ada yang gagal dimuat.
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
            {/* Progres per tranche — the centerpiece; reads the same for 2 or 12 rows */}
            <ChartCard
              icon={isMonthly ? CalendarRange : Layers}
              title={`Progres Pencairan per ${dimLabel}`}
              subtitle={
                sel === 'Semua'
                  ? `Porsi desa yang sudah cair di tiap ${dimLabel.toLowerCase()} · ${moduleAgg.doneCount} selesai`
                  : `Semua ${dimLabel.toLowerCase()} ditampilkan sebagai pembanding · klik untuk berpindah`
              }
            >
              <div className="space-y-2 sm:space-y-2.5">
                {dimBreakdown.map((d) => {
                  const p = PHASE[d.phase];
                  const isSel = sel === d.label;
                  const dimmed = sel !== 'Semua' && !isSel;
                  return (
                    <button
                      type="button"
                      key={d.label}
                      onClick={() => setSel(isSel ? 'Semua' : d.label)}
                      className={`flex w-full items-center gap-2.5 sm:gap-3 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 ${
                        isSel ? 'bg-slate-50 ring-1 ring-slate-200' : ''
                      } ${dimmed ? 'opacity-45' : ''}`}
                    >
                      <div className="w-16 sm:w-24 shrink-0 flex items-center gap-1.5 min-w-0">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${p.dot}`} />
                        <span className={`text-[13px] truncate ${isSel ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`} title={d.label}>{d.label}</span>
                      </div>
                      <div className="flex-1 h-6 rounded-lg bg-slate-100 overflow-hidden min-w-0">
                        <div className={`h-full ${p.bar} transition-all duration-700`} style={{ width: `${d.pctDesa}%` }} />
                      </div>
                      <div className="w-[70px] sm:w-24 shrink-0 text-right" title={`${fmtInt(d.desaCair)}/${fmtInt(d.desaTotal)} desa cair`}>
                        <div className={`text-[12px] font-bold tabular-nums ${p.text}`}>{fmtPersen(d.pctDesa)}</div>
                        <div className="text-[11.5px] text-slate-400 leading-tight">{d.cair > 0 ? fmtRp(d.cair) : '—'}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ChartCard>

            {/* Status pencairan sebagai KARTU, bukan baris bilah tipis.
                Dua alasan, keduanya soal keterbacaan:

                1. LABELNYA HARUS UTUH. Sebagai baris, nama status dijepit
                   kolom selebar 176px dan dipotong: "Dikembalikan ke D…" dan
                   "Dikembalikan ke K…" tampil nyaris sama padahal yang satu
                   berhenti di desa dan yang satu di kecamatan — dua tindak
                   lanjut yang sama sekali berbeda. Di kartu, namanya boleh
                   turun ke baris kedua dan terbaca penuh.

                2. HARUS TERLIHAT BISA DIKLIK. Baris tipis tanpa batas tidak
                   mengundang disentuh; kartu berbingkai jelas mengundang, dan
                   area kliknya jauh lebih besar — penting di layar sentuh dan
                   untuk yang tidak terbiasa mengklik elemen kecil.

                Mengklik satu kartu menyaring tabel rekap di bawah. */}
            <ChartCard
              icon={Activity}
              title="Status Pencairan"
              subtitle={
                statusFilter
                  ? `Disaring: ${statusFilter}`
                  : `${fmtInt(fundRows.length)} penyaluran · klik kartu untuk menyaring`
              }
            >
              {statusFilter && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('')}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <X className="h-3.5 w-3.5" /> Tampilkan semua status
                </button>
              )}

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {statusAll.map(([s, n]) => {
                  const t = statusTone(s);
                  const pct = persen(n, fundRows.length);
                  const aktif = statusFilter === s;
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => pilihStatus(s)}
                      aria-pressed={aktif}
                      title={s}
                      className={`flex min-w-0 flex-col rounded-xl border p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 ${
                        aktif
                          ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <span
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: `${t.hex}1f`, color: t.hex }}
                        >
                          <t.Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </span>
                        {/* Tanpa truncate: nama status boleh turun ke baris
                            kedua. Inilah bedanya dengan versi baris. */}
                        <span className={`min-w-0 flex-1 text-[13px] leading-snug ${aktif ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {s}
                        </span>
                      </span>

                      <span className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-[24px] font-bold leading-none tabular-nums text-slate-900">
                          {fmtInt(n)}
                        </span>
                        <span className="text-[13px] font-medium text-slate-400">{fmtPersen(pct)}</span>
                      </span>

                      <span className="mt-2.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: t.hex }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </ChartCard>

            {/* Cadence differentiator (full width) */}
            {isMonthly ? (
              <div className="lg:col-span-2">
                <ChartCard icon={TrendingUp} title="Kurva Realisasi Kumulatif" subtitle="Akumulasi anggaran cair sepanjang tahun (% dari total pagu)">
                  <div className="h-60"><Line data={cumData} options={cumOpts} /></div>
                </ChartCard>
              </div>
            ) : laggingKec.length > 0 && (
              <div className="lg:col-span-2">
                <ChartCard
                  icon={MapPin}
                  title={`Kecamatan Perlu Perhatian — ${laggingFocus.label}`}
                  subtitle="Persentase desa yang sudah cair di tahap berjalan — terendah lebih dulu"
                >
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                    {laggingKec.map((k) => (
                      <div key={k.kec} className="flex items-center gap-2.5">
                        <span className="w-24 sm:w-32 shrink-0 text-[13px] font-medium text-slate-600 truncate" title={k.kec}>{k.kec}</span>
                        <div className="flex-1 h-3.5 rounded-full bg-slate-100 overflow-hidden min-w-0">
                          <div className={`h-full rounded-full ${k.pct >= 100 ? A.bar : k.pct > 0 ? 'bg-amber-500' : 'bg-rose-400'}`} style={{ width: `${Math.max(k.pct, 2)}%` }} />
                        </div>
                        <span className="w-12 shrink-0 text-right text-[13px] font-bold text-slate-700 tabular-nums">{fmtPersen(k.pct)}</span>
                        <span className="w-10 shrink-0 text-right text-[11.5px] text-slate-400">{k.c}/{k.n}</span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls — pencarian desa/kecamatan dan penyaring status. Grid kartu
          status yang dulu menyusul di sini sudah dihapus; penyaringan status
          kini dilakukan langsung dari grafik "Status Pencairan" di atas. */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari desa atau kecamatan…"
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-slate-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <SelectBox
            className="w-full sm:w-52"
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Semua Status"
            options={[
              { value: '', label: 'Semua Status' },
              ...statusOptions.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>
      </div>

      {/* Table grouped by kecamatan. scroll-mt menyisakan ruang di atas saat
          halaman melompat ke sini dari kartu status — tanpa itu, judulnya
          menempel persis di tepi atas layar dan terasa terpotong. */}
      <div ref={tabelRef} className="px-4 sm:px-6 pb-10 scroll-mt-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold text-slate-900">
              Rekap per Kecamatan
              {/* Status yang sedang disaring ditulis DI SINI juga. Setelah
                  halaman melompat turun, kartu yang tadi diklik sudah tidak
                  terlihat — tanpa penanda ini, tabel yang tiba-tiba menyusut
                  tidak punya penjelasan apa pun di dekatnya. */}
              {statusFilter && (
                <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[12.5px] font-semibold text-slate-700 align-middle">
                  {statusFilter}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => setStatusFilter('')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter(''); } }}
                    className="cursor-pointer text-slate-400 hover:text-slate-900"
                    aria-label="Hapus penyaring status"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                </span>
              )}
            </h2>
            <span className="text-[13px] text-slate-500">{grouped.length} kecamatan · {fmtInt(filtered.length)} baris</span>
          </div>

          {grouped.length === 0 ? (
            <div className="py-16 text-center">
              <CircleDashed className="h-10 w-10 text-slate-200 mx-auto mb-2" />
              <p className="text-[13px] text-slate-400">Tidak ada data untuk filter ini</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {grouped.map(({ kec, items, desaCount, total, cairCount }) => {
                const open = openKec[kec];
                return (
                  <div key={kec}>
                    <button
                      onClick={() => setOpenKec((p) => ({ ...p, [kec]: !p[kec] }))}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <ChevronRight className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-[14px] text-slate-900 flex-1 min-w-0 truncate">{kec}</span>
                      <span className="text-[13px] text-slate-500 hidden sm:inline">{desaCount} desa</span>
                      <span className={`text-[12px] font-bold px-2 h-5 inline-flex items-center rounded-full ring-1 ${A.soft}`}>{cairCount}/{items.length} cair</span>
                      <span className="text-[14px] font-bold text-slate-900 w-24 sm:w-28 text-right shrink-0" title={fmtRpFull(total)}>{fmtRp(total)}</span>
                    </button>

                    {open && (
                      <div className="overflow-x-auto bg-slate-50/50">
                        <table className="w-full text-[12.5px]">
                          <thead>
                            <tr className="text-brand-600 text-[11.5px] font-bold uppercase tracking-wide">
                              <th className="text-left font-bold px-4 py-2 w-8">#</th>
                              <th className="text-left font-bold px-2 py-2">Desa</th>
                              {showDim && <th className="text-left font-bold px-2 py-2">{dimLabel}</th>}
                              <th className="text-left font-bold px-2 py-2">Status</th>
                              <th className="text-left font-bold px-2 py-2 hidden md:table-cell">Pencairan</th>
                              <th className="text-right font-bold px-4 py-2">Anggaran</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {items.map((e, i) => {
                              const t = statusTone(e.status);
                              return (
                                <tr key={e.id || i} className="hover:bg-white">
                                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                                  <td className="px-2 py-2 font-medium text-slate-800">{e.desa}</td>
                                  {showDim && <td className="px-2 py-2 text-slate-500">{e.dim}</td>}
                                  <td className="px-2 py-2">
                                    <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[12px] font-semibold ring-1 ${t.chip}`}>
                                      <t.Icon className="h-3 w-3" /> {e.status}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-slate-500 hidden md:table-cell">{e.cair ? fmtDate(e.tglCair) : '—'}</td>
                                  <td className="px-4 py-2 text-right font-semibold text-slate-900" title={fmtRpFull(e.anggaran)}>{e.anggaran > 0 ? fmtRp(e.anggaran) : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-3 text-[12.5px] text-slate-400 text-center">
          Sumber data: SIPANDA Kabupaten Bogor · diperbarui otomatis
        </p>
      </div>
    </div>
  );
}
