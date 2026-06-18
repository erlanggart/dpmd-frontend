import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../api';
import {
  LuActivity, LuSearch, LuDollarSign, LuUsers, LuRoute,
  LuChevronDown, LuChevronRight, LuInfo, LuRefreshCw,
} from 'react-icons/lu';
import BankeuPerubahanTrackingModal from '../../../components/shared/BankeuPerubahanTrackingModal';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

// Tahap "saat ini" sebuah proposal di alur Desa→Kecamatan→DPMD.
// (Sinkron dengan logika tab Tracking SPKED.)
function currentStage(p) {
  const kec = p.kecamatan_status || 'pending';
  if (['revision', 'rejected'].includes(p.dpmd_status)) {
    return { key: 'revisi_dokumen_kec', label: 'Revisi BA/SP Kecamatan', tone: 'orange' };
  }
  if (!p.submitted_to_dpmd) {
    if (kec === 'revision') return { key: 'revisi_kec', label: 'Revisi Kecamatan', tone: 'orange' };
    if (kec === 'rejected') return { key: 'ditolak_kec', label: 'Ditolak Kecamatan', tone: 'red' };
  }
  if (['revision', 'rejected'].includes(p.status) && !p.submitted_to_kecamatan) {
    return { key: 'revisi_desa', label: 'Revisi di Desa', tone: 'red' };
  }
  if (p.submitted_to_dpmd) {
    return { key: 'diterima_dpmd', label: 'Diterima DPMD', tone: 'emerald' };
  }
  if (p.submitted_to_kecamatan) {
    if (kec === 'approved') return { key: 'disetujui_kec', label: 'Disetujui Kec. (belum diteruskan)', tone: 'cyan' };
    if (kec === 'rejected') return { key: 'ditolak_kec', label: 'Ditolak Kecamatan', tone: 'red' };
    if (kec === 'revision') return { key: 'revisi_kec', label: 'Revisi Kecamatan', tone: 'orange' };
    return { key: 'menunggu_kec', label: 'Menunggu Verifikasi Kecamatan', tone: 'amber' };
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
const TONE_DOT = {
  emerald: 'bg-emerald-500', red: 'bg-rose-500', orange: 'bg-orange-500',
  amber: 'bg-amber-500', cyan: 'bg-cyan-500', gray: 'bg-slate-400',
};
const STAGE_ORDER = [
  { key: 'draft', label: 'Draft di Desa', tone: 'gray' },
  { key: 'revisi_desa', label: 'Revisi di Desa', tone: 'red' },
  { key: 'menunggu_kec', label: 'Menunggu Verifikasi Kecamatan', tone: 'amber' },
  { key: 'revisi_kec', label: 'Revisi Kecamatan', tone: 'orange' },
  { key: 'ditolak_kec', label: 'Ditolak Kecamatan', tone: 'red' },
  { key: 'disetujui_kec', label: 'Disetujui Kec. (belum diteruskan)', tone: 'cyan' },
  { key: 'revisi_dokumen_kec', label: 'Revisi BA/SP Kecamatan', tone: 'orange' },
  { key: 'diterima_dpmd', label: 'Diterima DPMD', tone: 'emerald' },
];

// Mini-stepper titik berwarna Desa→Kec→DPMD (ikhtisar baris).
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

const KecamatanBankeuPerubahanTrackingPage = ({ tahun }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDesa, setFilterDesa] = useState('all');
  const [filterKegiatan, setFilterKegiatan] = useState('all');
  const [openMap, setOpenMap] = useState({});
  const [trackProposal, setTrackProposal] = useState(null);

  const fetchTracking = async () => {
    setLoading(true);
    try {
      const res = await api.get('/kecamatan/bankeu-perubahan/tracking', { params: { tahun } });
      setData(res.data?.data || []);
    } catch (err) {
      console.error('Tracking error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun]);

  // Opsi desa (dari data tracking).
  const desaOptions = useMemo(() => {
    const map = new Map();
    data.forEach(p => { if (p.desa_id != null) map.set(Number(p.desa_id), p.desa_nama); });
    return Array.from(map.entries()).map(([id, nama]) => ({ id, nama })).sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id'));
  }, [data]);

  // Opsi kegiatan + jumlah desa pengambil.
  const kegiatanOptions = useMemo(() => {
    const map = new Map();
    data.forEach(p => {
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
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter(p => {
      if (filterDesa !== 'all' && String(p.desa_id) !== String(filterDesa)) return false;
      if (filterKegiatan !== 'all') {
        const ok = (p.kegiatan_list || []).some(k => String(k.id) === String(filterKegiatan)) ||
          String(p.kegiatan_id || '') === String(filterKegiatan);
        if (!ok) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const inKegiatan = (p.kegiatan_list || []).some(k => k.nama_kegiatan?.toLowerCase().includes(q));
        if (!(p.judul_proposal?.toLowerCase().includes(q) || p.desa_nama?.toLowerCase().includes(q) || inKegiatan)) return false;
      }
      return true;
    });
  }, [data, filterDesa, filterKegiatan, search]);

  const totalAnggaran = useMemo(() => filtered.reduce((s, p) => s + (Number(p.anggaran_usulan) || 0), 0), [filtered]);

  const selectedKegiatanInfo = useMemo(() => {
    if (filterKegiatan === 'all') return null;
    const desaSet = new Set();
    let proposals = 0, anggaran = 0;
    filtered.forEach(p => {
      if (p.desa_id != null) desaSet.add(Number(p.desa_id));
      proposals += 1;
      anggaran += Number(p.anggaran_usulan) || 0;
    });
    const opt = kegiatanOptions.find(k => String(k.id) === String(filterKegiatan));
    return { nama: opt?.nama || 'Kegiatan', desaCount: desaSet.size, proposals, anggaran };
  }, [filterKegiatan, filtered, kegiatanOptions]);

  const grouped = useMemo(() => {
    const m = new Map();
    filtered.forEach(p => {
      const { key } = currentStage(p);
      if (!m.has(key)) m.set(key, { items: [], total: 0 });
      const g = m.get(key);
      g.items.push(p);
      g.total += Number(p.anggaran_usulan) || 0;
    });
    return m;
  }, [filtered]);

  const sections = STAGE_ORDER.filter(s => grouped.has(s.key));
  const toggle = (key) => setOpenMap(o => ({ ...o, [key]: !o[key] }));
  const expandAll = () => setOpenMap(Object.fromEntries(sections.map(s => [s.key, true])));
  const collapseAll = () => setOpenMap({});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 md:p-6">
      <div className="w-full space-y-3">
        {/* Filter bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <LuActivity className="w-4 h-4 text-indigo-600" /> Tracking Status TA {tahun}
          </div>
          <select value={filterDesa} onChange={e => setFilterDesa(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500">
            <option value="all">Semua Desa</option>
            {desaOptions.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
          <select value={filterKegiatan} onChange={e => setFilterKegiatan(e.target.value)}
            className="max-w-sm px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500">
            <option value="all">Semua Kegiatan</option>
            {kegiatanOptions.map(k => (
              <option key={k.id} value={k.id}>{k.nama}{typeof k.desaCount === 'number' ? ` (${k.desaCount} desa)` : ''}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul / desa / kegiatan..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500" />
          </div>
          <button onClick={fetchTracking}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg">
            <LuRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <span className="ml-auto text-xs text-slate-500">{filtered.length} dari {data.length} proposal</span>
        </div>

        {/* Total anggaran (mengikuti filter) */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-white/90">
            <LuDollarSign className="w-5 h-5" />
            <span className="text-sm font-semibold">Total Anggaran Usulan ({filtered.length} proposal)</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-white">{rupiah(totalAnggaran)}</div>
        </div>

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

        {/* Ikhtisar status: klik chip untuk buka/tutup grup */}
        {!loading && filtered.length > 0 && (
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
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <LuInfo className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">
              {data.length === 0 ? 'Belum ada proposal perubahan di kecamatan ini' : 'Tidak ada proposal yang sesuai filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map(s => {
              const g = grouped.get(s.key);
              const open = !!openMap[s.key];
              return (
                <div key={s.key} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
                            <span className="text-xs text-slate-500">Desa <strong className="text-slate-800">{p.desa_nama}</strong></span>
                            <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">{p.judul_proposal}</p>
                            {(p.kegiatan_list || []).length > 0 && (
                              <p className="mt-0.5 text-xs text-indigo-700">
                                Kegiatan: {(p.kegiatan_list || []).map(k => k.nama_kegiatan).join(', ')}
                              </p>
                            )}
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-50 text-amber-800 text-xs font-semibold rounded">
                              <LuDollarSign className="w-3.5 h-3.5" /> {rupiah(p.anggaran_usulan)}
                            </span>
                            {p.dpmd_catatan && (
                              <div className="mt-1.5 text-xs bg-purple-50 border border-purple-200 rounded p-2 text-purple-800">
                                <strong>Catatan DPMD{p.dpmd_verified_at ? ` · ${fmtDate(p.dpmd_verified_at)}` : ''}:</strong> {p.dpmd_catatan}
                              </div>
                            )}
                          </div>
                          <StageDots proposal={p} />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => setTrackProposal(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                              <LuRoute className="w-3.5 h-3.5" /> Lacak
                            </button>
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
      </div>

      {trackProposal && <BankeuPerubahanTrackingModal proposal={trackProposal} onClose={() => setTrackProposal(null)} />}
    </div>
  );
};

export default KecamatanBankeuPerubahanTrackingPage;
