import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidangPath } from '../../hooks/useBidangPath';
import { useAuth } from '../../context/AuthContext';
import {
  Users, Activity, Clock, HardDrive, UserCheck, Scale,
  Building2, ChevronRight, ArrowUpRight, BarChart3, GitMerge, RotateCcw,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import DaftarPegawaiBidang from '../../components/bidang/DaftarPegawaiBidang';
import AnggaranBidangSection from '../../components/bidang/AnggaranBidangSection';

// ─── Tone palette ──────────────────────────────────────────────────────────────
const TONES = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-200/60', dot: 'bg-indigo-500' },
  sky:    { bg: 'bg-sky-50',    text: 'text-sky-600',    ring: 'ring-sky-200/60',    dot: 'bg-sky-500' },
  emerald:{ bg: 'bg-emerald-50',text: 'text-emerald-600',ring: 'ring-emerald-200/60',dot: 'bg-emerald-500' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  ring: 'ring-amber-200/60',  dot: 'bg-amber-500' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-600',   ring: 'ring-rose-200/60',   dot: 'bg-rose-500' },
  slate:  { bg: 'bg-slate-100', text: 'text-slate-600',  ring: 'ring-slate-200/60',  dot: 'bg-slate-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-200/60', dot: 'bg-violet-500' },
};

const ACTION_TONES = {
  create:  { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60', label: 'Dibuat' },
  update:  { dot: 'bg-indigo-500',  chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60',   label: 'Diperbarui' },
  delete:  { dot: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-700 ring-rose-200/60',           label: 'Dihapus' },
  approve: { dot: 'bg-violet-500',  chip: 'bg-violet-50 text-violet-700 ring-violet-200/60',    label: 'Disetujui' },
  upload:  { dot: 'bg-sky-500',     chip: 'bg-sky-50 text-sky-700 ring-sky-200/60',             label: 'Upload' },
  download:{ dot: 'bg-slate-400',   chip: 'bg-slate-50 text-slate-600 ring-slate-200/60',       label: 'Download' },
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatRelative = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDate(dateStr);
};

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ kicker, title, right }) => (
  <div className="flex items-end justify-between gap-3 mb-3">
    <div className="min-w-0">
      <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-slate-400">{kicker}</div>
      <h2 className="mt-0.5 text-[15px] sm:text-[16px] font-extrabold tracking-tight text-slate-900">{title}</h2>
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);

// ─── Menu Card ────────────────────────────────────────────────────────────────
const BASE = 'group relative bg-white border border-slate-200/80 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),_0_24px_40px_-20px_rgba(15,23,42,0.18)] hover:border-slate-300 cursor-pointer overflow-hidden';

const MenuCard = ({ menu, onClick }) => {
  const t = TONES[menu.tone];
  const Icon = menu.icon;

  if (menu.big) {
    return (
      <div onClick={onClick} className={`${BASE} p-4 sm:p-5 sm:col-span-2 lg:col-span-2`}>
        <div className="absolute -top-12 -right-10 h-40 w-40 rounded-full bg-indigo-50/70 blur-2xl" />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl ${t.bg} ring-1 ${t.ring} flex items-center justify-center ${t.text} shrink-0`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-400">Modul Utama</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <h3 className="mt-1 text-[16px] sm:text-[18px] font-extrabold tracking-tight text-slate-900 leading-tight">{menu.title}</h3>
            <p className="mt-1.5 text-[12.5px] sm:text-[13px] leading-relaxed text-slate-500">{menu.desc}</p>
          </div>
        </div>
        <div className="relative mt-4 sm:mt-5 pt-4 border-t border-dashed border-slate-200 flex items-end justify-between">
          <div>
            <div className="text-[22px] sm:text-[26px] font-extrabold tracking-tight text-slate-900 leading-none">{menu.stat.value}</div>
            <div className="mt-1 text-[11px] text-slate-500">{menu.stat.label}</div>
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${t.text}`}>
            <span>Lihat semua</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    );
  }

  if (menu.wide) {
    return (
      <div onClick={onClick} className={`${BASE} p-4 sm:col-span-2 lg:col-span-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-start gap-3 sm:contents">
            <div className={`h-11 w-11 rounded-xl ${t.bg} ring-1 ${t.ring} flex items-center justify-center ${t.text} shrink-0`}>
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] sm:text-[14.5px] font-bold text-slate-900 leading-tight">{menu.title}</h3>
              <p className="text-[11.5px] sm:text-[12px] text-slate-500 mt-0.5">{menu.desc}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-5 pl-4 border-l border-slate-200">
            <div>
              <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-slate-400">Tipe</div>
              <div className="text-[12px] font-semibold text-slate-700 mt-0.5">{menu.stat.value}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-slate-400">Cakupan</div>
              <div className="text-[12px] font-semibold text-slate-700 mt-0.5">{menu.stat.label}</div>
            </div>
          </div>
          <button className="sm:ml-auto h-9 px-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-[12px] font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shrink-0">
            Buka <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="sm:hidden mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between gap-2">
          <span className="text-[11px] text-slate-500">{menu.stat.label}</span>
          <span className="text-[12px] font-semibold text-slate-700">{menu.stat.value}</span>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className={`${BASE} p-4`}>
      <div className="flex items-start justify-between">
        <div className={`h-11 w-11 rounded-xl ${t.bg} ring-1 ${t.ring} flex items-center justify-center ${t.text}`}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
      <h3 className="mt-3.5 text-[14px] font-bold text-slate-900 leading-tight">{menu.title}</h3>
      <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500 line-clamp-2">{menu.desc}</p>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline gap-1.5">
        <span className="text-[14px] font-bold text-slate-900">{menu.stat.value}</span>
        <span className="text-[10.5px] text-slate-500">{menu.stat.label}</span>
      </div>
    </div>
  );
};

// ─── Activity Timeline ────────────────────────────────────────────────────────
const ActivityTimeline = ({ logs, loading, onRefresh }) => {
  const [filter, setFilter] = useState('Semua');
  const filters = ['Semua', 'Kelembagaan', 'Hukum'];

  const grouped = useMemo(() => {
    const map = {};
    logs.forEach(log => {
      const key = formatDate(log.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(log);
    });
    return Object.entries(map);
  }, [logs]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 ring-1 ring-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-slate-900 leading-tight">Log Aktivitas</div>
            <div className="text-[10.5px] text-slate-500 mt-0.5">{logs.length} kejadian terbaru</div>
          </div>
        </div>
        <button onClick={onRefresh} className="h-7 w-7 rounded-md hover:bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
          <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-100">
        <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 h-7 rounded-md text-[11px] font-semibold transition-colors ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 max-h-[520px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10">
            <Activity className="h-10 w-10 text-slate-200 mx-auto mb-2" />
            <p className="text-[12px] text-slate-400">Belum ada aktivitas</p>
          </div>
        ) : (
          grouped.map(([date, items], gi) => (
            <div key={date} className={gi > 0 ? 'mt-4' : ''}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3 w-3 text-slate-400" />
                <span className="text-[10.5px] font-bold tracking-[0.12em] uppercase text-slate-400">{date}</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="relative pl-5">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-200" />
                {items.map(log => {
                  const t = ACTION_TONES[log.action] || ACTION_TONES.update;
                  return (
                    <div key={log.id} className="relative pb-3 last:pb-0">
                      <div className={`absolute -left-5 top-1.5 h-3 w-3 rounded-full ${t.dot} ring-4 ring-white shadow-sm`} />
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center h-4 px-1.5 rounded text-[9.5px] font-bold tracking-wide ring-1 ${t.chip}`}>{t.label}</span>
                        {log.module && (
                          <span className="text-[9.5px] font-mono text-slate-400 bg-slate-50 px-1 rounded">[{log.module}]</span>
                        )}
                      </div>
                      <div className="text-[12px] text-slate-800 leading-snug">{log.description}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-slate-500 flex-wrap">
                        <span className="font-medium">{log.userName}</span>
                        <span className="text-slate-300">·</span>
                        <span>{formatRelative(log.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <button className="w-full h-9 border-t border-slate-200/80 text-[11.5px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors">
        Lihat semua aktivitas <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PMDPage = () => {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const { user } = useAuth();
  const isBendahara = user?.role === 'bendahara' || user?.role === 'superadmin';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const menus = [
    {
      id: 'lkd', big: true, tone: 'indigo',
      title: 'Lembaga Kemasyarakatan Desa', short: 'LKD',
      desc: 'Kelola data RW, RT, Posyandu, Karang Taruna, LPM, PKK, dan Satlinmas seluruh desa.',
      icon: Building2,
      route: getPath('/bidang/pmd/kelembagaan'),
      stat: { value: '1.428', label: 'entitas terdaftar' },
    },
    {
      id: 'lainnya', tone: 'sky',
      title: 'Kelembagaan Lainnya', short: 'Lainnya',
      desc: 'Organisasi & kelembagaan lain di tingkat desa',
      icon: Users,
      route: getPath('/bidang/pmd/kelembagaan/lainnya'),
      stat: { value: '82', label: 'organisasi' },
    },
    {
      id: 'pengurus', tone: 'emerald',
      title: 'Pengurus Kelembagaan', short: 'Pengurus',
      desc: 'Data pengurus dan anggota kelembagaan desa',
      icon: UserCheck,
      route: getPath('/bidang/pmd/pengurus'),
      stat: { value: '12.640', label: 'pengurus aktif' },
    },
    {
      id: 'produk-hukum', tone: 'amber',
      title: 'Produk Hukum Desa', short: 'Produk Hukum',
      desc: 'Perdes, Perkades, dan Keputusan Kepala Desa',
      icon: Scale,
      route: getPath('/bidang/pmd/produk-hukum'),
      stat: { value: '346', label: 'dokumen' },
    },
    {
      id: 'posyandu', tone: 'rose',
      title: 'Perbandingan Posyandu', short: 'Posyandu',
      desc: 'Komparasi data Posyandu antara Gema dan ADD',
      icon: BarChart3,
      route: getPath('/bidang/pmd/kelembagaan/posyandu-comparison'),
      stat: { value: 'Analitik', label: 'lintas sumber' },
    },
    {
      id: 'rtrw', wide: true, tone: 'slate',
      title: 'Persandingan RT/RW', short: 'RT/RW',
      desc: 'Komparasi pengurus RT/RW, insentif ADD, dan BPJS secara menyeluruh',
      icon: GitMerge,
      route: getPath('/bidang/pmd/kelembagaan/rtrw-comparison'),
      stat: { value: 'Komparatif', label: 'RT · RW · ADD · BPJS' },
    },
    {
      id: 'drive', tone: 'sky',
      title: 'Drive Bidang', short: 'Drive',
      desc: 'Penyimpanan berkas internal bidang, bisa dibagikan ke bidang lain',
      icon: HardDrive,
      route: getPath('/bidang/pmd/drive'),
      stat: { value: '25 GB', label: 'kuota bidang' },
    },
  ];

  const fetchActivityLogs = useCallback(async () => {
    try {
      setActivityLoading(true);
      const res = await api.get('/bidang/5/activity-logs');
      if (res.data.success) setActivityLogs(res.data.data || []);
    } catch {
      toast.error('Gagal memuat log aktivitas');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bidang/5/dashboard');
      if (res.data.success) setData(res.data.data);
    } catch {
      toast.error('Gagal memuat data bidang');
    } finally {
      setLoading(false);
    }
  };

  const stats = data?.stats || {};

  const fmt = n => (n != null ? Number(n).toLocaleString('id-ID') : '—');
  const totalKelembagaan = (stats.total_rw || 0) + (stats.total_rt || 0)
    + (stats.total_posyandu || 0) + (stats.total_karang_taruna || 0)
    + (stats.total_lpm || 0) + (stats.total_pkk || 0) + (stats.total_satlinmas || 0);

  const statsStrip = [
    { label: 'Total RT',          value: fmt(stats.total_rt),   delta: `${fmt(stats.aktif_rt)} aktif`,  up: true  },
    { label: 'Total RW',          value: fmt(stats.total_rw),   delta: `${fmt(stats.aktif_rw)} aktif`,  up: true  },
    { label: 'Total Kelembagaan', value: totalKelembagaan > 0 ? totalKelembagaan.toLocaleString('id-ID') : '—', delta: 'RT · RW · Posyandu · LKD', up: true },
    { label: 'Pagu 2026',         value: 'Rp 4,13 M',           delta: 'Program 2.13.05',               up: true  },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-3 text-sm text-slate-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900">

      

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-6 pb-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-[0_1px_0_rgba(0,0,0,0.02),_0_8px_24px_-12px_rgba(79,70,229,0.35)] shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] sm:text-[10.5px] font-bold tracking-[0.14em] uppercase text-indigo-600">Bidang Kerja</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-wide text-slate-500">Bidang 05 · PMD</span>
              </div>
              <h1 className="text-[22px] sm:text-[26px] lg:text-[28px] leading-[1.1] font-extrabold tracking-tight text-slate-900">
                Bidang Pemberdayaan Masyarakat &amp; Desa
              </h1>
              <p className="mt-1.5 text-[12.5px] sm:text-[13.5px] text-slate-500 max-w-xl">
                Kelola kelembagaan desa, pengurus, produk hukum, dan komparasi data lintas sumber dari satu ruang kerja.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { fetchDashboard(); fetchActivityLogs(); }}
              className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[12.5px] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sinkronkan</span>
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200/80 rounded-xl overflow-hidden border border-slate-200/80">
          {statsStrip.map(s => (
            <div key={s.label} className="bg-white px-3 sm:px-4 py-3 sm:py-3.5">
              <div className="text-[10px] sm:text-[10.5px] font-bold tracking-[0.12em] uppercase text-slate-400">{s.label}</div>
              <div className="mt-1 text-[18px] sm:text-[20px] font-extrabold tracking-tight text-slate-900">{s.value}</div>
              <div className={`mt-0.5 text-[10.5px] sm:text-[11px] font-medium ${s.up ? 'text-emerald-600' : 'text-amber-600'}`}>{s.delta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pb-10">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left — main */}
          <div className="flex-1 min-w-0 space-y-7">

            {/* Menu Bento */}
            <section>
              <SectionHeader
                kicker="Modul Bidang"
                title="Akses & Kelola"
                right={
                  <button className="text-[11.5px] sm:text-[12px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1">
                    <span className="hidden sm:inline">Semua modul</span>
                    <span className="sm:hidden">Semua</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                }
              />

              {/* Mobile: 4-col icon tile grid */}
              <div className="sm:hidden bg-white border border-slate-200/80 rounded-2xl p-4 pb-5">
                <div className="grid grid-cols-4 gap-y-4 gap-x-1">
                  {menus.map(menu => {
                    const t = TONES[menu.tone];
                    const Icon = menu.icon;
                    return (
                      <button
                        key={menu.id}
                        onClick={() => navigate(menu.route)}
                        className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
                      >
                        <div className={`h-[52px] w-[52px] rounded-2xl ${t.bg} ring-1 ${t.ring} flex items-center justify-center ${t.text} shadow-[0_1px_0_rgba(15,23,42,0.04),_0_4px_12px_-6px_rgba(15,23,42,0.12)]`}>
                          <Icon className="h-6 w-6" strokeWidth={1.75} />
                        </div>
                        <span className="text-[10.5px] font-semibold text-slate-700 text-center leading-[1.2] line-clamp-2 px-0.5">{menu.short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tablet & Desktop: bento grid */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {menus.map(menu => (
                  <MenuCard key={menu.id} menu={menu} onClick={() => navigate(menu.route)} />
                ))}
              </div>
            </section>

            {/* Anggaran — hanya tampil untuk Bendahara */}
            {isBendahara && (
              <section>
                <SectionHeader kicker="Anggaran 2026" title="Program Kegiatan & Pagu" />
                <AnggaranBidangSection bidangId={5} />
              </section>
            )}

          </div>

          {/* Right sidebar */}
          <aside className="w-full lg:w-[340px] shrink-0 space-y-4">
            <DaftarPegawaiBidang bidangId={5} bidangName="Bidang PMD" />
            <ActivityTimeline
              logs={activityLogs}
              loading={activityLoading}
              onRefresh={fetchActivityLogs}
            />
          </aside>

        </div>
      </div>
    </div>
  );
};

export default PMDPage;
