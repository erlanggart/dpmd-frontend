import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidangPath } from '../../hooks/useBidangPath';
import {
  DollarSign, BarChart2, ChevronDown, ChevronUp, Calendar,
  Layers, CheckCircle2, Percent,
} from 'lucide-react';
import api from '../../api';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const fmtCompact = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} Jt`;
  return formatRupiah(n);
};

const persen = (num, denom) => {
  if (!denom || denom <= 0) return 0;
  return Math.round((num / denom) * 1000) / 10; // 1 decimal
};

function groupMasters(masters) {
  const programs = [];
  for (const m of masters) {
    let prog = programs.find(p => p.kode === m.kode_program);
    if (!prog) { prog = { kode: m.kode_program, nama: m.nama_program, kegiatan: [] }; programs.push(prog); }
    let keg = prog.kegiatan.find(k => k.kode === m.kode_kegiatan);
    if (!keg) { keg = { kode: m.kode_kegiatan, nama: m.nama_kegiatan, items: [] }; prog.kegiatan.push(keg); }
    keg.items.push(m);
  }
  programs.sort((a, b) => a.kode.localeCompare(b.kode));
  programs.forEach(p => {
    p.kegiatan.sort((a, b) => a.kode.localeCompare(b.kode));
    p.kegiatan.forEach(k => k.items.sort((a, b) => (a.urutan || 0) - (b.urutan || 0)));
  });
  return programs;
}

// ─── Stat card ────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = 'gray', icon: Icon }) => {
  const colors = {
    emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-700',
    blue:    'from-blue-50 to-blue-100/50 border-blue-200 text-blue-700',
    amber:   'from-amber-50 to-amber-100/50 border-amber-200 text-amber-700',
    purple:  'from-purple-50 to-purple-100/50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-3.5 ${colors[color]}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</span>
        {Icon && <Icon className="h-4 w-4 opacity-60" />}
      </div>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-[10.5px] opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
};

// ─── Progress Bar (untuk persentase realisasi) ────────────────────────
const ProgressBar = ({ percentage, color = 'emerald' }) => {
  const pct = Math.min(100, Math.max(0, percentage || 0));
  const colors = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };
  // Auto color based on percentage
  const autoColor = pct >= 80 ? 'emerald' : pct >= 40 ? 'amber' : 'rose';
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all ${colors[color] || colors[autoColor]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

// ─── Sub-kegiatan row ────────────────────────────────────────────────────────
const SubRow = ({ master, tahun, realisasi, onNavigateItem }) => {
  const pagu = master.pagu_list?.find(p => p.tahun === tahun);
  const nominalAnggaran = pagu?.total_items ?? 0;
  const realisasiNilai = realisasi || 0;
  const pctRealisasi = persen(realisasiNilai, nominalAnggaran);

  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      {/* Baris 1: kode + nama + badge bidang */}
      <div className="flex items-start gap-2 flex-wrap mb-2">
        <span className="font-mono text-[10.5px] text-gray-400 shrink-0 mt-0.5">{master.kode_sub_kegiatan}</span>
        <span className="text-sm font-medium text-gray-800 leading-snug flex-1">{master.nama_sub_kegiatan}</span>
        {master.bidang_unit && (
          <span className="text-[10.5px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full shrink-0">
            {master.bidang_unit.nama}
          </span>
        )}
      </div>

      {pagu ? (
        <>
          {/* Baris 2: nilai-nilai */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
            <div className="min-w-0">
              <div className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-400">Pagu Anggaran</div>
              <div className="text-[12.5px] font-bold text-emerald-700">{formatRupiah(pagu.pagu)}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-400">Nominal Anggaran</div>
              <div className={`text-[12.5px] font-bold ${nominalAnggaran > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                {nominalAnggaran > 0 ? formatRupiah(nominalAnggaran) : '—'}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-400">Realisasi</div>
              <div className={`text-[12.5px] font-bold ${realisasiNilai > 0 ? 'text-purple-700' : 'text-gray-400'}`}>
                {realisasiNilai > 0 ? formatRupiah(realisasiNilai) : '—'}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-400">% Realisasi</div>
              <div className="flex items-center gap-2">
                <div className={`text-[12.5px] font-bold ${
                  pctRealisasi >= 80 ? 'text-emerald-700' :
                  pctRealisasi >= 40 ? 'text-amber-700' :
                  pctRealisasi > 0 ? 'text-rose-700' : 'text-gray-400'
                }`}>
                  {nominalAnggaran > 0 ? `${pctRealisasi}%` : '—'}
                </div>
              </div>
              {nominalAnggaran > 0 && <div className="mt-1"><ProgressBar percentage={pctRealisasi} /></div>}
            </div>
          </div>

          {/* Baris 3: tombol detail */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => onNavigateItem(master.id, master.nama_sub_kegiatan)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors shrink-0"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Detail Sub Kegiatan</span>
              {pagu.item_count > 0 && (
                <span className="bg-emerald-200 text-emerald-800 rounded-full px-1.5 py-0 text-[10px] font-bold">
                  {pagu.item_count}
                </span>
              )}
            </button>
          </div>
        </>
      ) : (
        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
          Belum ada pagu
        </span>
      )}
    </div>
  );
};

// ─── Kegiatan group (collapsible) ────────────────────────────────────────────
const KegiatanGroup = ({ kegiatan, tahun, realisasiByMaster, onNavigateItem, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const stats = kegiatan.items.reduce((acc, m) => {
    const p = m.pagu_list?.find(p => p.tahun === tahun);
    const r = realisasiByMaster[m.id] || 0;
    return {
      totalPagu:    acc.totalPagu    + (p?.pagu        || 0),
      totalAnggaran: acc.totalAnggaran + (p?.total_items || 0),
      totalRealisasi: acc.totalRealisasi + r,
    };
  }, { totalPagu: 0, totalAnggaran: 0, totalRealisasi: 0 });
  const pct = persen(stats.totalRealisasi, stats.totalAnggaran);

  return (
    <div className="border-l-2 border-gray-200 ml-4 mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-mono text-xs text-gray-400 shrink-0">{kegiatan.kode}</span>
          <span className="text-sm font-semibold text-gray-700 truncate">{kegiatan.nama}</span>
          <span className="shrink-0 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{kegiatan.items.length}</span>
        </div>
        {stats.totalPagu > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-emerald-700">{fmtCompact(stats.totalPagu)}</span>
            {stats.totalRealisasi > 0 && (
              <span className="text-[10.5px] text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full font-semibold">
                {pct}%
              </span>
            )}
          </div>
        )}
        {open ? <ChevronUp className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="ml-3 border-l border-gray-100">
          {kegiatan.items.map(m => (
            <SubRow key={m.id} master={m} tahun={tahun} realisasi={realisasiByMaster[m.id]} onNavigateItem={onNavigateItem} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Program group (collapsible) ─────────────────────────────────────────────
const ProgramGroup = ({ program, tahun, realisasiByMaster, onNavigateItem, idx }) => {
  const [open, setOpen] = useState(true);
  const stats = program.kegiatan.reduce((acc, keg) => {
    return keg.items.reduce((acc2, m) => {
      const p = m.pagu_list?.find(p => p.tahun === tahun);
      const r = realisasiByMaster[m.id] || 0;
      return {
        totalPagu:    acc2.totalPagu    + (p?.pagu        || 0),
        totalAnggaran: acc2.totalAnggaran + (p?.total_items || 0),
        totalRealisasi: acc2.totalRealisasi + r,
      };
    }, acc);
  }, { totalPagu: 0, totalAnggaran: 0, totalRealisasi: 0 });
  const pct = persen(stats.totalRealisasi, stats.totalAnggaran);
  const COLORS = ['bg-purple-600', 'bg-blue-600', 'bg-green-600', 'bg-orange-600', 'bg-rose-600', 'bg-teal-600'];

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className={`h-7 w-7 rounded-lg ${COLORS[idx % COLORS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs text-gray-400">{program.kode}</span>
            <span className="text-sm font-semibold text-gray-800">{program.nama}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {program.kegiatan.length} kegiatan · {program.kegiatan.reduce((s, k) => s + k.items.length, 0)} sub kegiatan
          </p>
        </div>
        {stats.totalPagu > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-emerald-700">{fmtCompact(stats.totalPagu)}</span>
            {stats.totalRealisasi > 0 && (
              <span className="text-[10.5px] text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full font-semibold">
                {pct}%
              </span>
            )}
          </div>
        )}
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="pb-2">
          {program.kegiatan.map((keg, ki) => (
            <KegiatanGroup
              key={keg.kode}
              kegiatan={keg}
              tahun={tahun}
              realisasiByMaster={realisasiByMaster}
              onNavigateItem={onNavigateItem}
              defaultOpen={ki === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AnggaranBidangSection = ({ bidangId }) => {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const [masters, setMasters] = useState([]);
  const [realisasiByMaster, setRealisasiByMaster] = useState({});
  const [loading, setLoading] = useState(false);
  const [tahun, setTahun] = useState(CURRENT_YEAR);
  const [sectionOpen, setSectionOpen] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [masterRes, pencairanRes] = await Promise.all([
          api.get('/anggaran/master', { params: { bidang_id: bidangId, tahun } }),
          // Realisasi = pencairan finalized only
          api.get('/pencairan', { params: { bidang_id: bidangId, tahun, status: 'finalized' } })
            .catch(() => ({ data: { data: [] } })), // if endpoint not available, default to empty
        ]);
        if (masterRes.data.success) setMasters(masterRes.data.data);
        const map = {};
        (pencairanRes.data?.data || []).forEach(p => {
          const key = p.master_kegiatan_id;
          map[key] = (map[key] || 0) + (Number(p.total_nilai) || 0);
        });
        setRealisasiByMaster(map);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetch();
  }, [bidangId, tahun]);

  const programs = useMemo(() => groupMasters(masters), [masters]);

  // ─── Totals untuk statistik atas ──────────────────────────────────────
  const totals = useMemo(() => {
    let totalPagu = 0;
    let totalAnggaran = 0;
    let totalRealisasi = 0;
    masters.forEach(m => {
      const p = m.pagu_list?.find(p => p.tahun === tahun);
      if (p) {
        totalPagu += Number(p.pagu) || 0;
        totalAnggaran += Number(p.total_items) || 0;
      }
      totalRealisasi += Number(realisasiByMaster[m.id]) || 0;
    });
    return { totalPagu, totalAnggaran, totalRealisasi, pct: persen(totalRealisasi, totalAnggaran) };
  }, [masters, realisasiByMaster, tahun]);

  const handleNavigateItem = (masterId, label) => {
    const params = new URLSearchParams({ master_id: masterId, label });
    navigate(`${getPath('/sekretariat/anggaran/detail-sub-kegiatan')}?${params}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <DollarSign className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Program Kegiatan & Anggaran</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Pagu, anggaran, dan realisasi tahun {tahun}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <select
              value={tahun}
              onChange={e => setTahun(Number(e.target.value))}
              className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => setSectionOpen(o => !o)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            {sectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {sectionOpen && (
        <>
          {/* Statistik atas */}
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-gray-100 bg-gradient-to-br from-gray-50/50 to-white">
            <StatCard
              label="Pagu"
              value={fmtCompact(totals.totalPagu)}
              sub={`Total alokasi ${tahun}`}
              color="emerald"
              icon={DollarSign}
            />
            <StatCard
              label="Anggaran"
              value={fmtCompact(totals.totalAnggaran)}
              sub={`${masters.length} sub kegiatan`}
              color="blue"
              icon={Layers}
            />
            <StatCard
              label="Realisasi"
              value={fmtCompact(totals.totalRealisasi)}
              sub={totals.totalRealisasi > 0 ? 'Pencairan finalized' : 'Belum ada'}
              color="purple"
              icon={CheckCircle2}
            />
            <StatCard
              label="% Realisasi"
              value={totals.totalAnggaran > 0 ? `${totals.pct}%` : '—'}
              sub={totals.totalAnggaran > 0 ? 'Dari nominal anggaran' : 'Belum ada anggaran'}
              color="amber"
              icon={Percent}
            />
          </div>

          {/* Konten */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : programs.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Belum ada data program kegiatan tahun {tahun}
            </div>
          ) : (
            <div>
              {programs.map((prog, idx) => (
                <ProgramGroup
                  key={prog.kode}
                  program={prog}
                  idx={idx}
                  tahun={tahun}
                  realisasiByMaster={realisasiByMaster}
                  onNavigateItem={handleNavigateItem}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnggaranBidangSection;
