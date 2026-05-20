import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidangPath } from '../../hooks/useBidangPath';
import { DollarSign, FileText, ChevronDown, ChevronUp, Calendar, TrendingUp } from 'lucide-react';
import api from '../../api';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

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

// ─── Sub-kegiatan row ────────────────────────────────────────────────────────
const SubRow = ({ master, tahun, onNavigateItem }) => {
  const pagu = master.pagu_list?.find(p => p.tahun === tahun);
  const nominal = pagu?.total_items ?? 0;
  const selisih = pagu ? pagu.pagu - nominal : 0;

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

      {/* Baris 2: pagu | nominal | sisa | tombol */}
      {pagu ? (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Pagu */}
          <div className="min-w-0">
            <div className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-400">Pagu</div>
            <div className="text-[12.5px] font-bold text-emerald-700">{formatRupiah(pagu.pagu)}</div>
          </div>

          <div className="h-7 w-px bg-gray-200 shrink-0" />

          {/* Nominal RKA */}
          <div className="min-w-0">
            <div className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-400">Nominal RKA</div>
            <div className={`text-[12.5px] font-bold ${nominal > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
              {nominal > 0 ? formatRupiah(nominal) : '—'}
            </div>
          </div>

          {/* Sisa — hanya tampil jika ada nominal */}
          {nominal > 0 && (
            <>
              <div className="h-7 w-px bg-gray-200 shrink-0" />
              <div className="min-w-0">
                <div className="text-[9.5px] font-semibold uppercase tracking-wide text-gray-400">Sisa</div>
                <div className={`text-[12.5px] font-bold ${selisih < 0 ? 'text-rose-600' : selisih === 0 ? 'text-gray-500' : 'text-amber-600'}`}>
                  {formatRupiah(Math.abs(selisih))}
                  {selisih < 0 && <span className="text-[9px] ml-0.5">↑</span>}
                </div>
              </div>
            </>
          )}

          {/* Tombol Item RKA */}
          <button
            onClick={() => onNavigateItem(pagu.id, master.nama_sub_kegiatan)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors shrink-0"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Rencana Kerja dan Anggaran</span>
            {pagu.item_count > 0 && (
              <span className="bg-emerald-200 text-emerald-800 rounded-full px-1.5 py-0 text-[10px] font-bold">
                {pagu.item_count}
              </span>
            )}
          </button>
        </div>
      ) : (
        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
          Belum ada pagu
        </span>
      )}
    </div>
  );
};

// ─── Kegiatan group (collapsible) ────────────────────────────────────────────
const KegiatanGroup = ({ kegiatan, tahun, onNavigateItem, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const { totalPagu, totalNominal } = kegiatan.items.reduce((acc, m) => {
    const p = m.pagu_list?.find(p => p.tahun === tahun);
    return {
      totalPagu:    acc.totalPagu    + (p?.pagu        || 0),
      totalNominal: acc.totalNominal + (p?.total_items || 0),
    };
  }, { totalPagu: 0, totalNominal: 0 });

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
        {totalPagu > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-emerald-700">{formatRupiah(totalPagu)}</span>
            {totalNominal > 0 && (
              <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                {formatRupiah(totalNominal)}
              </span>
            )}
          </div>
        )}
        {open ? <ChevronUp className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="ml-3 border-l border-gray-100">
          {kegiatan.items.map(m => (
            <SubRow key={m.id} master={m} tahun={tahun} onNavigateItem={onNavigateItem} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Program group (collapsible) ─────────────────────────────────────────────
const ProgramGroup = ({ program, tahun, onNavigateItem, idx }) => {
  const [open, setOpen] = useState(true);
  const { totalPagu, totalNominal } = program.kegiatan.reduce((acc, keg) => {
    return keg.items.reduce((acc2, m) => {
      const p = m.pagu_list?.find(p => p.tahun === tahun);
      return {
        totalPagu:    acc2.totalPagu    + (p?.pagu        || 0),
        totalNominal: acc2.totalNominal + (p?.total_items || 0),
      };
    }, acc);
  }, { totalPagu: 0, totalNominal: 0 });

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
            {totalPagu > 0 && ` · ${formatRupiah(totalPagu)}`}
          </p>
        </div>
        {totalPagu > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-emerald-700">{formatRupiah(totalPagu)}</span>
            {totalNominal > 0 && (
              <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                {formatRupiah(totalNominal)}
              </span>
            )}
          </div>
        )}
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="pb-2">
          {program.kegiatan.map((keg, ki) => (
            <KegiatanGroup key={keg.kode} kegiatan={keg} tahun={tahun} onNavigateItem={onNavigateItem} defaultOpen={ki === 0} />
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
  const [loading, setLoading] = useState(false);
  const [tahun, setTahun] = useState(CURRENT_YEAR);
  const [sectionOpen, setSectionOpen] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/anggaran/master', { params: { bidang_id: bidangId, tahun } });
        if (res.data.success) setMasters(res.data.data);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetch();
  }, [bidangId, tahun]);

  const programs = groupMasters(masters);

  const totalPagu = masters.reduce((s, m) => {
    const p = m.pagu_list?.find(p => p.tahun === tahun);
    return s + (p?.pagu || 0);
  }, 0);

  const handleNavigateItem = (paguId, label) => {
    const params = new URLSearchParams({ pagu_id: paguId, label });
    navigate(`${getPath('/sekretariat/anggaran/item-rka')}?${params}`);
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
            <h3 className="font-bold text-gray-800 text-sm">Program Kegiatan Anggaran</h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
              <TrendingUp className="h-3 w-3" />
              <span>Total Pagu {tahun}: <span className="font-semibold text-emerald-700">{formatRupiah(totalPagu)}</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tahun selector */}
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

      {/* Content */}
      {sectionOpen && (
        loading ? (
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
              <ProgramGroup key={prog.kode} program={prog} idx={idx} tahun={tahun} onNavigateItem={handleNavigateItem} />
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default AnggaranBidangSection;
