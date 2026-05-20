import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidangPath } from '../../../../hooks/useBidangPath';
import {
  ArrowLeft, DollarSign, Search, BookOpen, FileText,
  ChevronDown, ChevronUp, X, Calendar, Building2, Layers,
  Tag, TrendingUp, Users, Settings2
} from 'lucide-react';
import api from '../../../../api';
import toast from 'react-hot-toast';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

// Warna per bidang_id
const BIDANG_COLOR = {
  2: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', bar: 'bg-purple-500' },
  3: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  4: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', bar: 'bg-green-500' },
  5: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', bar: 'bg-orange-500' },
  6: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', bar: 'bg-rose-500' },
};
const DEFAULT_COLOR = { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400', bar: 'bg-gray-400' };
const getBidangColor = (id) => BIDANG_COLOR[id] || DEFAULT_COLOR;

// Group masters: Program → Kegiatan → Sub Kegiatan (urutan sesuai kode)
function groupMasters(masters) {
  const programs = [];
  for (const m of masters) {
    let prog = programs.find(p => p.kode === m.kode_program);
    if (!prog) {
      prog = { kode: m.kode_program, nama: m.nama_program, kegiatan: [] };
      programs.push(prog);
    }
    let keg = prog.kegiatan.find(k => k.kode === m.kode_kegiatan);
    if (!keg) {
      keg = { kode: m.kode_kegiatan, nama: m.nama_kegiatan, items: [] };
      prog.kegiatan.push(keg);
    }
    keg.items.push(m);
  }
  programs.sort((a, b) => a.kode.localeCompare(b.kode));
  programs.forEach(p => {
    p.kegiatan.sort((a, b) => a.kode.localeCompare(b.kode));
    p.kegiatan.forEach(k => k.items.sort((a, b) => (a.urutan || 0) - (b.urutan || 0)));
  });
  return programs;
}

// ─── Sub-Kegiatan Row ────────────────────────────────────────────────────────
// Hanya tampil info + tombol Item RKA. "Kelola" dipindah ke level kegiatan.
const SubKegiatanRow = ({ master, tahun, onNavigateItem }) => {
  const pagu = master.pagu_list?.find(p => p.tahun === tahun);
  const color = getBidangColor(master.bidang_id);

  const bidangLabel = master.bidang_unit
    ? `${master.bidangs?.nama} – ${master.bidang_unit.nama}`
    : (master.bidangs?.nama || '—');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span className="font-mono text-xs text-gray-400 mt-0.5 shrink-0">{master.kode_sub_kegiatan}</span>
          <span className="text-sm font-medium text-gray-800 leading-snug">{master.nama_sub_kegiatan}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          {/* Bidang badge */}
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border font-medium ${color.bg} ${color.text} ${color.border}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
            {bidangLabel}
          </span>
          {/* Pagu info */}
          {pagu ? (
            <span className="text-xs text-gray-500">
              Pagu {tahun}: <span className="font-semibold text-gray-700">{formatRupiah(pagu.pagu)}</span>
              {pagu.item_count > 0 && <span className="ml-1 text-gray-400">· {pagu.item_count} item</span>}
            </span>
          ) : (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              Belum ada pagu {tahun}
            </span>
          )}
        </div>
      </div>

      {/* Tombol Item RKA (jika pagu ada) */}
      {pagu && (
        <button
          onClick={() => onNavigateItem(pagu.id, master.nama_sub_kegiatan)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Item RKA
        </button>
      )}
    </div>
  );
};

// ─── Kegiatan Section (collapsible) — "Kelola" ada di sini untuk superadmin ─
const KegiatanSection = ({ kegiatan, tahun, onNavigateItem, onKelola, isSuperadmin, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen ?? true);

  return (
    <div className="border-l-2 border-gray-200 ml-4">
      {/* Header kegiatan */}
      <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors">
        {/* Toggle collapse */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <span className="font-mono text-xs text-gray-400 shrink-0">{kegiatan.kode}</span>
          <span className="text-sm font-semibold text-gray-700 flex-1 min-w-0 truncate">{kegiatan.nama}</span>
          <span className="shrink-0 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {kegiatan.items.length} sub
          </span>
          {open
            ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
            : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
        </button>

        {/* Tombol Kelola (superadmin) — level kegiatan */}
        {isSuperadmin && (
          <button
            onClick={e => { e.stopPropagation(); onKelola(kegiatan); }}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Settings2 className="h-3 w-3" />
            Kelola
          </button>
        )}
      </div>

      {/* Sub-kegiatan list */}
      {open && (
        <div className="ml-4 border-l border-gray-100">
          {kegiatan.items.map(m => (
            <SubKegiatanRow
              key={m.id}
              master={m}
              tahun={tahun}
              onNavigateItem={onNavigateItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Program Section (collapsible) ──────────────────────────────────────────
const PROGRAM_BG = [
  'bg-purple-600', 'bg-blue-600', 'bg-green-600',
  'bg-orange-600', 'bg-rose-600', 'bg-teal-600',
];

const ProgramSection = ({ program, tahun, onNavigateItem, onKelola, isSuperadmin, idx }) => {
  const [open, setOpen] = useState(true);
  const totalSub = program.kegiatan.reduce((s, k) => s + k.items.length, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
      {/* Program header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className={`h-10 w-10 rounded-xl ${PROGRAM_BG[idx % PROGRAM_BG.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
          {idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-gray-400">{program.kode}</span>
            <span className="text-sm font-bold text-gray-800">{program.nama}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
            <span>{program.kegiatan.length} kegiatan</span>
            <span>·</span>
            <span>{totalSub} sub kegiatan</span>
          </div>
        </div>
        <div className="shrink-0">
          {open ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 py-2">
          {program.kegiatan.map((keg, ki) => (
            <KegiatanSection
              key={keg.kode}
              kegiatan={keg}
              tahun={tahun}
              onNavigateItem={onNavigateItem}
              onKelola={onKelola}
              isSuperadmin={isSuperadmin}
              defaultOpen={ki === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Bidang Sidebar ──────────────────────────────────────────────────────────
const BidangSidebar = ({ masters, tahun, isSuperadmin, onNavigateBidang }) => {
  const stats = useMemo(() => {
    const map = {};
    for (const m of masters) {
      const id = m.bidang_id;
      if (!map[id]) map[id] = { id, nama: m.bidangs?.nama || '—', total_pagu: 0, count: 0, pagu_count: 0 };
      const pagu = m.pagu_list?.find(p => p.tahun === tahun);
      if (pagu) { map[id].total_pagu += pagu.pagu; map[id].pagu_count++; }
      map[id].count++;
    }
    return Object.values(map).sort((a, b) => a.id - b.id);
  }, [masters, tahun]);

  const grandTotal = stats.reduce((s, b) => s + b.total_pagu, 0);

  return (
    <div className="w-full lg:w-72 shrink-0">
      <div className="sticky top-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rekap Per Bidang</h3>
          <span className="text-xs text-gray-400">{tahun}</span>
        </div>

        {stats.map(b => {
          const color = getBidangColor(b.id);
          const pct = grandTotal > 0 ? Math.round((b.total_pagu / grandTotal) * 100) : 0;

          return (
            <div
              key={b.id}
              className={`bg-white rounded-xl border ${color.border} shadow-sm overflow-hidden`}
            >
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${color.dot}`} />
                    <span className={`text-xs font-semibold ${color.text} leading-tight`}>{b.nama}</span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{b.count} sub</span>
                </div>
                <p className="mt-1.5 text-sm font-bold text-gray-800 ml-4">{formatRupiah(b.total_pagu)}</p>
                <p className="text-xs text-gray-400 ml-4 mt-0.5">
                  {b.pagu_count}/{b.count} sub sudah punya pagu
                </p>

                {/* Progress bar */}
                <div className="mt-2 ml-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color.bar} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-400 ml-4 mt-0.5">{pct}% dari total pagu</p>
              </div>

              {isSuperadmin && (
                <button
                  onClick={() => onNavigateBidang(b.id, null, b.nama)}
                  className={`w-full border-t ${color.border} px-4 py-1.5 text-xs font-medium ${color.text} ${color.bg} hover:opacity-80 transition-opacity text-left flex items-center gap-1.5`}
                >
                  <Settings2 className="h-3 w-3" />
                  Kelola program bidang ini
                </button>
              )}
            </div>
          );
        })}

        {/* Grand total */}
        {stats.length > 1 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <p className="text-xs text-emerald-600 font-medium">Total Semua Bidang</p>
            <p className="text-base font-bold text-emerald-800 mt-0.5">{formatRupiah(grandTotal)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const AnggaranPage = () => {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState(CURRENT_YEAR);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperadmin = user.role === 'superadmin';

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => { fetchMasters(); }, [tahun, debouncedSearch]);

  const fetchMasters = async () => {
    try {
      setLoading(true);
      const params = { tahun };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.get('/anggaran/master', { params });
      if (res.data.success) setMasters(res.data.data);
    } catch {
      toast.error('Gagal memuat data kegiatan');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateItem = (paguId, label) => {
    const params = new URLSearchParams({ pagu_id: paguId, label });
    navigate(`${getPath('/sekretariat/anggaran/item-rka')}?${params}`);
  };

  // Kelola dari level kegiatan → ProgramKegiatanPage dengan pre-fill kode_kegiatan
  const handleKelola = (kegiatan) => {
    const params = new URLSearchParams({ label: kegiatan.nama, q: kegiatan.kode });
    navigate(`${getPath('/sekretariat/anggaran/program-kegiatan')}?${params}`);
  };

  // Kelola dari sidebar bidang → ProgramKegiatanPage filter bidang
  const handleNavigateBidang = (bidangId, unitId, bidangNama) => {
    const params = new URLSearchParams({ bidang_id: bidangId, label: bidangNama || 'Bidang' });
    if (unitId) params.set('unit_id', unitId);
    navigate(`${getPath('/sekretariat/anggaran/program-kegiatan')}?${params}`);
  };

  const programs = groupMasters(masters);

  const totalPagu = masters.reduce((s, m) => {
    const p = m.pagu_list?.find(p => p.tahun === tahun);
    return s + (p?.pagu || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-emerald-100 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>

          <div className="flex items-start gap-4">
            <div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
              <DollarSign className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">Anggaran Program Kegiatan</h1>
              <p className="text-emerald-100 mt-0.5 text-sm">Semua program kegiatan DPMD Kab. Bogor</p>
            </div>
            <button
              onClick={() => navigate(getPath('/sekretariat/anggaran/sht'))}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl text-sm font-medium transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Referensi SHT
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <div className="bg-white/20 rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {masters.length} Sub Kegiatan
            </div>
            <div className="bg-white/20 rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {programs.length} Program
            </div>
            <div className="bg-white/20 rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Total Pagu {tahun}: {formatRupiah(totalPagu)}
            </div>
            {isSuperadmin && (
              <div className="bg-yellow-400/30 border border-yellow-300/50 rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Mode Superadmin
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari program, kegiatan, sub kegiatan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="relative sm:w-40">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={tahun}
              onChange={e => setTahun(Number(e.target.value))}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none bg-white"
            >
              {YEARS.map(y => <option key={y} value={y}>Tahun {y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Content: program tree + bidang sidebar */}
      <div className="px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Building2 className="h-14 w-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Tidak ada data kegiatan</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-emerald-600 text-sm hover:underline">
                Hapus pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* Program tree — full width on mobile, flex-1 on desktop */}
            <div className="flex-1 min-w-0 w-full space-y-4">
              {programs.map((prog, idx) => (
                <ProgramSection
                  key={prog.kode}
                  program={prog}
                  idx={idx}
                  tahun={tahun}
                  onNavigateItem={handleNavigateItem}
                  onKelola={handleKelola}
                  isSuperadmin={isSuperadmin}
                />
              ))}
            </div>

            {/* Bidang sidebar */}
            <BidangSidebar
              masters={masters}
              tahun={tahun}
              isSuperadmin={isSuperadmin}
              onNavigateBidang={handleNavigateBidang}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnggaranPage;
