// Reusable penyaluran dashboard for KKD funds (ADD/DD/BHPRD/BANKEU/BP).
// Data is live from SIPANDA (see useSipanda); each page passes a config.
// Design mirrors KKDPage.jsx: clean white cards, thin borders, subtle accent.
import { useState, useMemo } from 'react';
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

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

// ─── Accent palette (literal Tailwind classes so JIT keeps them + a chart hex) ──
const ACCENTS = {
  emerald: { hex: '#10b981', tile: 'bg-emerald-50 text-emerald-600 ring-emerald-200/60', kicker: 'text-emerald-600', bar: 'bg-emerald-500', chip: 'bg-emerald-600 text-white', soft: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60' },
  violet:  { hex: '#8b5cf6', tile: 'bg-violet-50 text-violet-600 ring-violet-200/60',    kicker: 'text-violet-600',  bar: 'bg-violet-500',  chip: 'bg-violet-600 text-white',  soft: 'bg-violet-50 text-violet-700 ring-violet-200/60' },
  blue:    { hex: '#3b82f6', tile: 'bg-blue-50 text-blue-600 ring-blue-200/60',          kicker: 'text-blue-600',    bar: 'bg-blue-500',    chip: 'bg-blue-600 text-white',    soft: 'bg-blue-50 text-blue-700 ring-blue-200/60' },
  amber:   { hex: '#f59e0b', tile: 'bg-amber-50 text-amber-600 ring-amber-200/60',       kicker: 'text-amber-600',   bar: 'bg-amber-500',   chip: 'bg-amber-600 text-white',   soft: 'bg-amber-50 text-amber-700 ring-amber-200/60' },
  rose:    { hex: '#f43f5e', tile: 'bg-rose-50 text-rose-600 ring-rose-200/60',          kicker: 'text-rose-600',    bar: 'bg-rose-500',    chip: 'bg-rose-600 text-white',    soft: 'bg-rose-50 text-rose-700 ring-rose-200/60' },
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

const StatCell = ({ label, value, sub, subTone = 'text-slate-500' }) => (
  <div className="bg-white px-3 sm:px-4 py-3 sm:py-3.5">
    <div className="text-[10px] sm:text-[10.5px] font-bold tracking-[0.12em] uppercase text-slate-400">{label}</div>
    <div className="mt-1 text-[18px] sm:text-[20px] font-extrabold tracking-tight text-slate-900 truncate" title={typeof value === 'string' ? value : undefined}>{value}</div>
    {sub && <div className={`mt-0.5 text-[10.5px] sm:text-[11px] font-medium ${subTone}`}>{sub}</div>}
  </div>
);

const ChartCard = ({ icon: Icon, title, subtitle, children }) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5">
    <div className="flex items-center gap-2.5 mb-4">
      <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 leading-tight">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

export default function PenyaluranDashboard({
  sumberDana,        // e.g. 'ADD' — matched against row.sumber_dana
  title,             // 'Alokasi Dana Desa'
  short,             // 'ADD'
  subtitle,
  accent = 'emerald',
  dimField = 'nm_tahap', // 'periode' for ADD (bulanan), 'nm_tahap' for tahap-based
  dimLabel = 'Tahap',    // shown in the selector ('Bulan' / 'Tahap')
  icon: HeaderIcon = MapPin,
}) {
  const A = ACCENTS[accent] || ACCENTS.emerald;
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const { rows, loading, error, reload } = useSipanda();

  const [sel, setSel] = useState('Semua');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openKec, setOpenKec] = useState({});

  const fundRows = useMemo(
    () => rows.filter((r) => r.sumber_dana === sumberDana),
    [rows, sumberDana]
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
      cairCount: cair.length,
      count: entries.length,
      pct: entries.length ? Math.round((cair.length / entries.length) * 100) : 0,
    };
  }, [entries]);

  // Status distribution (for chips), over current selection.
  const statusDist = useMemo(() => {
    const m = {};
    entries.forEach((e) => { m[e.status] = (m[e.status] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [entries]);

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
      const pctDesa = v.count ? (v.cairCount / v.count) * 100 : 0;
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
      pctAmt: total ? (cair / total) * 100 : 0,
      pctCount: count ? (cairCount / count) * 100 : 0,
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
      .map(([kec, v]) => ({ kec, n: v.n, c: v.c, pct: v.n ? (v.c / v.n) * 100 : 0 }))
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
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-slate-500">Memuat data dari SIPANDA…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center px-4">
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
    done:    { label: 'Selesai',  bar: A.bar,          text: A.kicker,        Icon: CheckCircle2, dot: A.bar },
    active:  { label: 'Berjalan', bar: 'bg-amber-500', text: 'text-amber-600', Icon: Clock,       dot: 'bg-amber-500' },
    pending: { label: 'Belum',    bar: 'bg-slate-200', text: 'text-slate-400', Icon: CircleDashed, dot: 'bg-slate-300' },
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-5 pb-5">
        <button
          onClick={() => navigate(getPath('/bidang/kkd'))}
          className="mb-3 inline-flex items-center gap-1.5 h-8 pl-2 pr-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-[12px] font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard Bidang KKD
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
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
              <h1 className="text-[22px] sm:text-[26px] lg:text-[28px] leading-[1.1] font-extrabold tracking-tight">{title}</h1>
              <p className="mt-1.5 text-[12.5px] sm:text-[13.5px] text-slate-500 max-w-xl">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => reload(true)} className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[12.5px] font-semibold hover:bg-slate-50 flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sinkronkan</span>
            </button>
            <button onClick={exportExcel} className="h-9 px-3.5 rounded-lg bg-slate-900 text-white text-[12.5px] font-semibold hover:bg-slate-800 flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200/80 rounded-xl overflow-hidden border border-slate-200/80">
          <StatCell label="Total Desa" value={fmtInt(stats.desa)} sub={`${stats.kec} kecamatan`} />
          <StatCell label="Total Anggaran" value={fmtRp(stats.total)} sub={`${fmtInt(stats.count)} penyaluran`} />
          <StatCell label="Sudah Cair" value={`${stats.pct}%`} sub={`${fmtInt(stats.cairCount)} dari ${fmtInt(stats.count)}`} subTone="text-emerald-600" />
          <StatCell label="Nilai Cair" value={fmtRp(stats.cairAmt)} sub="sudah tersalur" subTone="text-emerald-600" />
        </div>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${A.bar}`} style={{ width: `${stats.pct}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">{stats.pct}% pencairan</span>
        </div>
      </div>

      {/* ── Infografik ─────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pb-2">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-slate-400">Ringkasan Realisasi</div>
            <h2 className="mt-0.5 text-[15px] sm:text-[16px] font-extrabold tracking-tight text-slate-900">
              {isMonthly ? `Progres Bulanan ${short}` : `Progres per Tahap ${short}`}
            </h2>
          </div>
          <span className="hidden sm:inline text-[11px] text-slate-400">se-Kabupaten · 2026</span>
        </div>

        {/* Hero — realisasi anggaran (money, one honest number) + cadence-aware chips */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-3 sm:mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_auto] gap-5 lg:gap-6 items-center">
            <div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-[10.5px] font-bold tracking-[0.12em] uppercase text-slate-400">Realisasi Anggaran</span>
                <span className={`text-[11px] font-bold ${A.kicker}`}>{Math.round(moduleAgg.pctAmt)}% tersalur</span>
              </div>
              <div className="mt-1.5 flex items-end gap-2 flex-wrap">
                <span className="text-[26px] sm:text-[30px] font-extrabold tracking-tight text-slate-900 leading-none" title={fmtRpFull(moduleAgg.cair)}>{fmtRp(moduleAgg.cair)}</span>
                <span className="text-[12.5px] font-medium text-slate-400 pb-0.5">dari {fmtRp(moduleAgg.total)} pagu</span>
              </div>
              <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full ${A.bar} transition-all duration-700`} style={{ width: `${moduleAgg.pctAmt}%` }} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                  <span className={`h-2.5 w-2.5 rounded-sm ${A.bar}`} /> Cair {fmtRp(moduleAgg.cair)}
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" /> Belum {fmtRp(moduleAgg.belum)}
                </span>
              </div>
            </div>
            {/* Cadence-aware context chips */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {(isMonthly
                ? [
                    { Icon: CheckCircle2, label: 'Bulan Tersalur', value: `${moduleAgg.doneCount}/${moduleAgg.totalDims}`, sub: 'bulan penuh cair', tone: A.tile },
                    { Icon: CalendarRange, label: 'Terakhir Cair', value: moduleAgg.lastDone?.label || '—', sub: moduleAgg.pendingCount ? `${moduleAgg.pendingCount} bulan menunggu` : 'lunas', tone: 'bg-amber-50 text-amber-600 ring-amber-200/60' },
                    { Icon: MapPin, label: 'Cakupan', value: fmtInt(moduleAgg.desa), sub: `${fmtInt(moduleAgg.kec)} kecamatan`, tone: 'bg-slate-100 text-slate-500 ring-slate-200/60' },
                  ]
                : [
                    { Icon: CheckCircle2, label: 'Tahap Selesai', value: `${moduleAgg.doneCount}/${moduleAgg.totalDims}`, sub: 'tahap penuh cair', tone: A.tile },
                    { Icon: Clock, label: 'Tahap Berjalan', value: moduleAgg.active ? moduleAgg.active.label : (moduleAgg.pendingCount ? 'Belum mulai' : 'Selesai'), sub: moduleAgg.active ? `${Math.round(moduleAgg.active.pctDesa)}% desa cair` : '—', tone: 'bg-amber-50 text-amber-600 ring-amber-200/60' },
                    { Icon: MapPin, label: 'Cakupan', value: fmtInt(moduleAgg.desa), sub: `${fmtInt(moduleAgg.kec)} kecamatan`, tone: 'bg-slate-100 text-slate-500 ring-slate-200/60' },
                  ]
              ).map(({ Icon, label, value, sub, tone }) => (
                <div key={label} className="rounded-xl border border-slate-200/70 px-3 py-3 min-w-[92px]">
                  <div className={`h-7 w-7 rounded-lg ring-1 flex items-center justify-center mb-2 ${tone}`}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </div>
                  <div className="text-[18px] font-extrabold tracking-tight text-slate-900 leading-none truncate" title={String(value)}>{value}</div>
                  <div className="mt-1 text-[10px] font-bold tracking-wide uppercase text-slate-400 truncate" title={label}>{label}</div>
                  <div className="text-[10.5px] text-slate-500 leading-tight truncate">{sub}</div>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Progres per tranche — the centerpiece; reads the same for 2 or 12 rows */}
            <ChartCard
              icon={isMonthly ? CalendarRange : Layers}
              title={`Progres Pencairan per ${dimLabel}`}
              subtitle={`Porsi desa yang sudah cair di tiap ${dimLabel.toLowerCase()} · ${moduleAgg.doneCount} selesai`}
            >
              <div className="space-y-2 sm:space-y-2.5">
                {dimBreakdown.map((d) => {
                  const p = PHASE[d.phase];
                  return (
                    <div key={d.label} className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-16 sm:w-24 shrink-0 flex items-center gap-1.5 min-w-0">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${p.dot}`} />
                        <span className="text-[11.5px] font-semibold text-slate-700 truncate" title={d.label}>{d.label}</span>
                      </div>
                      <div className="flex-1 h-6 rounded-lg bg-slate-100 overflow-hidden min-w-0">
                        <div className={`h-full ${p.bar} transition-all duration-700`} style={{ width: `${d.pctDesa}%` }} />
                      </div>
                      <div className="w-[70px] sm:w-24 shrink-0 text-right" title={`${fmtInt(d.desaCair)}/${fmtInt(d.desaTotal)} desa cair`}>
                        <div className={`text-[12px] font-bold tabular-nums ${p.text}`}>{Math.round(d.pctDesa)}%</div>
                        <div className="text-[10px] text-slate-400 leading-tight">{d.cair > 0 ? fmtRp(d.cair) : '—'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            {/* Status pipeline — ranked native bars (no more hard-to-read donut) */}
            <ChartCard icon={Activity} title="Status Pencairan" subtitle={`${fmtInt(fundRows.length)} penyaluran · ${statusAll.length} status`}>
              <div className="space-y-2.5">
                {statusAll.map(([s, n]) => {
                  const t = statusTone(s);
                  const pct = fundRows.length ? (n / fundRows.length) * 100 : 0;
                  return (
                    <div key={s} className="flex items-center gap-2.5">
                      <span className="w-28 sm:w-44 shrink-0 flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.hex }} />
                        <span className="text-[11px] font-medium text-slate-600 truncate" title={s}>{s}</span>
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden min-w-0">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1.5)}%`, backgroundColor: t.hex }} />
                      </div>
                      <span className="w-16 shrink-0 text-right text-[11px] font-bold text-slate-700 tabular-nums">
                        {fmtInt(n)}<span className="text-slate-400 font-medium"> · {Math.round(pct)}%</span>
                      </span>
                    </div>
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
                        <span className="w-24 sm:w-32 shrink-0 text-[11.5px] font-medium text-slate-600 truncate" title={k.kec}>{k.kec}</span>
                        <div className="flex-1 h-3.5 rounded-full bg-slate-100 overflow-hidden min-w-0">
                          <div className={`h-full rounded-full ${k.pct >= 100 ? A.bar : k.pct > 0 ? 'bg-amber-500' : 'bg-rose-400'}`} style={{ width: `${Math.max(k.pct, 2)}%` }} />
                        </div>
                        <span className="w-11 shrink-0 text-right text-[11px] font-bold text-slate-700 tabular-nums">{Math.round(k.pct)}%</span>
                        <span className="w-10 shrink-0 text-right text-[10px] text-slate-400">{k.c}/{k.n}</span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 sm:px-6 pt-4">
        {/* Dimension selector — dropdown */}
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-[10.5px] font-bold tracking-[0.12em] uppercase text-slate-400 shrink-0">{dimLabel}</span>
          <div className="relative">
            <select
              value={sel}
              onChange={(e) => setSel(e.target.value)}
              className={`h-9 pl-3 pr-9 rounded-lg text-[12.5px] font-semibold appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 ${sel === 'Semua' ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50' : A.chip}`}
            >
              <option value="Semua">Semua {dimLabel}</option>
              {dims.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronRight className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 rotate-90 ${sel === 'Semua' ? 'text-slate-400' : 'text-white/80'}`} />
          </div>
          {sel !== 'Semua' && (
            <button
              onClick={() => setSel('Semua')}
              className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-500 text-[12px] font-semibold hover:bg-slate-50 inline-flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>

        {/* Search + status */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-3">
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">Semua Status</option>
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Status distribution — full-width, evenly distributed segments */}
        {statusDist.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {statusDist.map(([s, n]) => {
              const t = statusTone(s);
              const active = statusFilter === s;
              const pct = stats.count ? Math.round((n / stats.count) * 100) : 0;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(active ? '' : s)}
                  className={`flex-1 basis-44 min-w-0 flex items-center gap-3 px-3.5 py-3 rounded-xl ring-1 transition-all text-left ${t.chip} ${active ? 'ring-2 ring-offset-1 shadow-sm' : 'hover:shadow-sm'}`}
                >
                  <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${t.chip}`}>
                    <t.Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] font-semibold truncate leading-tight" title={s}>{s}</div>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-[18px] font-extrabold leading-none tabular-nums">{fmtInt(n)}</span>
                      <span className="text-[10.5px] font-medium opacity-70">desa · {pct}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Table grouped by kecamatan */}
      <div className="px-4 sm:px-6 pb-10">
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-slate-900">Rekap per Kecamatan</h2>
            <span className="text-[11px] text-slate-500">{grouped.length} kecamatan · {fmtInt(filtered.length)} baris</span>
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
                      <span className="font-semibold text-[13.5px] text-slate-900 flex-1 min-w-0 truncate">{kec}</span>
                      <span className="text-[11px] text-slate-500 hidden sm:inline">{desaCount} desa</span>
                      <span className={`text-[10.5px] font-bold px-2 h-5 inline-flex items-center rounded-full ring-1 ${A.soft}`}>{cairCount}/{items.length} cair</span>
                      <span className="text-[12.5px] font-bold text-slate-900 w-24 sm:w-28 text-right shrink-0" title={fmtRpFull(total)}>{fmtRp(total)}</span>
                    </button>

                    {open && (
                      <div className="overflow-x-auto bg-slate-50/50">
                        <table className="w-full text-[12.5px]">
                          <thead>
                            <tr className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wide">
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
                                    <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10.5px] font-semibold ring-1 ${t.chip}`}>
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

        <p className="mt-3 text-[11px] text-slate-400 text-center">
          Sumber data: SIPANDA Kabupaten Bogor · diperbarui otomatis
        </p>
      </div>
    </div>
  );
}
