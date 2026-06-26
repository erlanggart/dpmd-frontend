import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Edit2, Trash2, X, Save, AlertCircle,
  DollarSign, RefreshCw, Search, CheckCircle,
  ChevronRight, ChevronDown, ChevronUp, FileText, Minus, Layers,
  Package, Users, UserCheck, Calendar, Mic, Zap, Calculator,
} from 'lucide-react';
import api from '../../../../api';
import toast from 'react-hot-toast';

const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

const firstRekening = (val) => val ? val.split(',')[0].trim() || null : null;

// Parent prefix (remove last segment) — used for grouping
const rekeningParent = (kode) => {
  if (!kode) return null;
  const parts = kode.split('.');
  return parts.length > 1 ? parts.slice(0, -1).join('.') : kode;
};

// Bangun pohon hierarki rekening dari daftar item flat
function buildRekeningTree(items) {
  const root = { code: null, depth: -1, children: new Map(), items: [], total: 0, itemCount: 0 };
  for (const item of items) {
    const kode = (item.kode_rekening || '').trim();
    const parts = kode ? kode.split('.') : ['—'];
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const prefix = parts.slice(0, i + 1).join('.');
      if (!node.children.has(prefix)) {
        node.children.set(prefix, { code: prefix, depth: i, children: new Map(), items: [], total: 0, itemCount: 0 });
      }
      node = node.children.get(prefix);
      node.total += Number(item.total) || 0;
      node.itemCount += 1;
    }
    node.items.push(item);
  }
  return root;
}

const fmtCompact = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} Jt`;
  return formatRupiah(n);
};

// Tipe SHT yang tersedia untuk katalog item RKA
const SHT_TABS = [
  { type: 'SSH',  sub: 'Standar Satuan Harga' },
  { type: 'SBU',  sub: 'Standar Biaya Umum' },
  { type: 'ASB',  sub: 'Analisis Standar Belanja' },
  { type: 'HSPK', sub: 'Harga Satuan Pokok Kegiatan' },
];

const SHT_BADGE = {
  SSH:  'bg-blue-100 text-blue-700',
  SBU:  'bg-amber-100 text-amber-700',
  ASB:  'bg-emerald-100 text-emerald-700',
  HSPK: 'bg-rose-100 text-rose-700',
};
const shtBadge = (type) => SHT_BADGE[type] || 'bg-gray-100 text-gray-600';

const SATUAN_OPTIONS = [
  'Orang', 'OH', 'OJ', 'OK', 'OB', 'OBK',
  'Hari', 'Bulan', 'Tahun', 'Kali', 'Sesi', 'Jam',
  'Unit', 'Buah', 'Set', 'Paket', 'Lembar', 'Rim', 'Buku',
  'Porsi', 'Kg', 'Liter', 'M', 'M2', 'M3', 'Roll',
];

// ─── Fotokopi preset & helpers ───────────────────────────────────────────────
// Query awal untuk mencari item penggandaan/fotocopy dari katalog SSH.
const FOTOCOPY_SEARCH_DEFAULT = 'foto copy';
const isFotocopyItem = (it) => {
  const n = String(it?.nama_item || '').toLowerCase();
  return n.includes('fotocopy') || n.includes('fotokopi') || n.includes('penggandaan') || n.includes('foto copy');
};

// Parse input desimal yang ramah pengguna Indonesia: terima "1,5" maupun "1.5"
const parseDecimalInput = (raw) => {
  if (raw === '' || raw == null) return '';
  const v = String(raw).replace(',', '.');
  // izinkan hanya digit + maksimum satu titik, allow intermediate "1." while typing
  if (/^[0-9]*\.?[0-9]*$/.test(v)) return v;
  return null; // signal invalid → caller akan ignore
};

// ─── Package Templates ───────────────────────────────────────────────────────
// Setiap row punya formula(dims) → volume otomatis dari parameter global.
// Ubah angka peserta/panitia/hari → semua row yang pakai dimensi itu ikut.
const PAKET_TEMPLATES = {
  sosialisasi: {
    id: 'sosialisasi',
    label: 'Sosialisasi',
    desc: 'Paket sosialisasi standar (peserta + panitia + narasumber)',
    dims: [
      { key: 'peserta',    label: 'Peserta',    icon: Users,     default: 30 },
      { key: 'panitia',    label: 'Panitia',    icon: UserCheck, default: 5  },
      { key: 'narasumber', label: 'Narasumber', icon: Mic,       default: 2  },
      { key: 'hari',       label: 'Hari',       icon: Calendar,  default: 1  },
    ],
    rows: [
      { id: 'gedung_peserta',  label: 'Sewa Gedung Kegiatan',  shtType: 'SSH', formula: g => Math.max(1, g.hari - 1), formulaLabel: g => `${Math.max(1, g.hari - 1)} malam (${g.hari} hari − 1)`, grup: 'Sewa Tempat' },
      { id: 'harian_peserta',  label: 'Uang Harian Peserta',   shtType: 'SBU', formula: g => g.peserta * g.hari,    formulaLabel: g => `${g.peserta} peserta × ${g.hari} hari`,        grup: 'Uang Harian' },
      { id: 'harian_panitia',  label: 'Uang Harian Panitia',   shtType: 'SBU', formula: g => g.panitia * g.hari,    formulaLabel: g => `${g.panitia} panitia × ${g.hari} hari`,        grup: 'Uang Harian' },
      { id: 'transport_panitia',label:'Uang Transport Panitia',shtType: 'SBU', formula: g => g.panitia,             formulaLabel: g => `${g.panitia} panitia`,                         grup: 'Transport'   },
      { id: 'souvenir',        label: 'Souvenir / Kit Peserta',shtType: 'SSH', formula: g => g.peserta,             formulaLabel: g => `${g.peserta} peserta`,                         grup: 'Cetak'       },
      { id: 'honor_narsum',    label: 'Honorarium Narasumber', shtType: 'SBU', formula: g => g.narasumber * g.hari, formulaLabel: g => `${g.narasumber} narasumber × ${g.hari} hari`,  grup: 'Honorarium'  },
      { id: 'banner',          label: 'Banner Kegiatan',       shtType: 'SSH', formula: () => 1,                    formulaLabel: () => '1 buah (atur sendiri)',                       grup: 'Cetak'       },
    ],
  },
  pelatihan: {
    id: 'pelatihan',
    label: 'Pelatihan / Bimtek',
    desc: 'Paket pelatihan / bimbingan teknis (umumnya multi-hari)',
    dims: [
      { key: 'peserta',    label: 'Peserta',  icon: Users,     default: 25 },
      { key: 'panitia',    label: 'Panitia',  icon: UserCheck, default: 5  },
      { key: 'narasumber', label: 'Pengajar', icon: Mic,       default: 3  },
      { key: 'hari',       label: 'Hari',     icon: Calendar,  default: 3  },
    ],
    rows: [
      { id: 'gedung',          label: 'Sewa Ruang Pelatihan',  shtType: 'SSH', formula: g => Math.max(1, g.hari - 1), formulaLabel: g => `${Math.max(1, g.hari - 1)} malam (${g.hari} hari − 1)`, grup: 'Sewa Tempat' },
      { id: 'akomodasi',       label: 'Akomodasi Peserta',     shtType: 'SBU', formula: g => g.peserta * g.hari,    formulaLabel: g => `${g.peserta} peserta × ${g.hari} hari`,        grup: 'Akomodasi'   },
      { id: 'harian_peserta',  label: 'Uang Harian Peserta',   shtType: 'SBU', formula: g => g.peserta * g.hari,    formulaLabel: g => `${g.peserta} peserta × ${g.hari} hari`,        grup: 'Uang Harian' },
      { id: 'harian_panitia',  label: 'Uang Harian Panitia',   shtType: 'SBU', formula: g => g.panitia * g.hari,    formulaLabel: g => `${g.panitia} panitia × ${g.hari} hari`,        grup: 'Uang Harian' },
      { id: 'transport_panitia',label:'Uang Transport Panitia',shtType: 'SBU', formula: g => g.panitia,             formulaLabel: g => `${g.panitia} panitia`,                         grup: 'Transport'   },
      { id: 'modul',           label: 'Modul Pelatihan',       shtType: 'SSH', formula: g => g.peserta,             formulaLabel: g => `${g.peserta} eksemplar`,                       grup: 'Cetak'       },
      { id: 'sertifikat',      label: 'Sertifikat',            shtType: 'SSH', formula: g => g.peserta,             formulaLabel: g => `${g.peserta} lembar`,                          grup: 'Cetak'       },
      { id: 'honor_narsum',    label: 'Honorarium Pengajar',   shtType: 'SBU', formula: g => g.narasumber * g.hari, formulaLabel: g => `${g.narasumber} pengajar × ${g.hari} hari`,    grup: 'Honorarium'  },
      { id: 'banner',          label: 'Banner Kegiatan',       shtType: 'SSH', formula: () => 1,                    formulaLabel: () => '1 buah (atur sendiri)',                       grup: 'Cetak'       },
    ],
  },
};

// ─── Pinned items — localStorage ─────────────────────────────────────────────
const PINNED_KEY = 'anggaran_pinned_sht';
const getPinned  = () => { try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); } catch { return []; } };
const savePinned = (arr) => localStorage.setItem(PINNED_KEY, JSON.stringify(arr));
const pinKey     = (item) => `${item.uraian}|${item.kode_barang || ''}`;

// ─── Catalog Item Row ────────────────────────────────────────────────────────
const CatalogItem = ({ item, shtType, isSelected, isPinned, onSelect, onTogglePin }) => (
  <div className={`flex items-start gap-2 px-3 py-2.5 border-b border-gray-50 last:border-0 transition-colors group ${
    isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-gray-50'
  }`}>
    {/* Clickable content area */}
    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(item)}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
          shtBadge(shtType)
        }`}>{shtType}</span>
        {item.kode_barang && <span className="font-mono text-[10px] text-gray-400">{item.kode_barang}</span>}
        <span className="ml-auto text-[11px] font-bold text-emerald-700 shrink-0">{formatRupiah(item.harga_satuan)}</span>
      </div>
      <p className="text-xs font-medium text-gray-800 leading-snug mt-1">{item.uraian}</p>
      {item.spesifikasi && (
        <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{item.spesifikasi}</p>
      )}
      <p className="text-[10px] text-gray-400 mt-1">{item.satuan}</p>
      {isSelected && (
        <div className="mt-1 flex items-center gap-1 text-indigo-600 text-[10px] font-bold">
          <CheckCircle className="h-3 w-3" /> Terpilih
        </div>
      )}
    </div>
    {/* Star / pin button */}
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onTogglePin(item); }}
      title={isPinned ? 'Hapus dari simpanan' : 'Simpan item ini'}
      className={`shrink-0 mt-0.5 p-1 rounded-lg transition-all ${
        isPinned
          ? 'text-amber-400 hover:text-amber-600'
          : 'text-gray-200 hover:text-amber-400 opacity-0 group-hover:opacity-100'
      }`}
    >
      <span className="text-base leading-none select-none">★</span>
    </button>
  </div>
);

// ─── Catalog Panel (left panel) ──────────────────────────────────────────────
const CatalogPanel = ({ shtType, onShtTypeChange, onSelect, selectedItem }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [total, setTotal]     = useState(0);
  const [pinned, setPinned]   = useState(() => getPinned());
  const debounceRef           = useRef(null);

  const doSearch = useCallback(async (q, type) => {
    setLoading(true);
    try {
      const params = { limit: 80 };
      if (q) params.search = q;
      const r = await api.get(`/anggaran/sht/${type.toLowerCase()}`, { params });
      if (r.data.success) { setResults(r.data.data); setTotal(r.data.total ?? r.data.data.length); }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    setSearch('');
    setResults([]);
    setTotal(0);
    doSearch('', shtType);
  }, [shtType, doSearch]);

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q, shtType), 350);
  };

  const togglePin = (item) => {
    setPinned(prev => {
      const k = pinKey(item);
      const exists = prev.some(p => pinKey(p) === k);
      const next = exists
        ? prev.filter(p => pinKey(p) !== k)
        : [...prev, { ...item, jenis_sht: shtType }];
      savePinned(next);
      return next;
    });
  };

  const isPinned   = (item) => pinned.some(p => pinKey(p) === pinKey(item));
  const isSelected = (item) => selectedItem?.uraian === item.uraian && (selectedItem?.kode_barang || '') === (item.kode_barang || '');

  const pinnedForType = pinned.filter(p => p.jenis_sht === shtType);

  return (
    <div className="flex flex-col h-full">
      {/* SHT type tabs */}
      <div className="flex shrink-0 border-b border-gray-100">
        {SHT_TABS.map(({ type, sub }) => (
          <button key={type} type="button" onClick={() => onShtTypeChange(type)}
            className={`flex-1 py-2.5 px-4 text-xs font-bold transition-colors border-b-2 ${
              shtType === type
                ? 'border-indigo-500 text-indigo-700 bg-indigo-50/40'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}>
            <div>{type}</div>
            <div className={`text-[9.5px] font-normal mt-0.5 hidden sm:block ${shtType === type ? 'text-indigo-400' : 'text-gray-300'}`}>{sub}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 shrink-0 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text" value={search} onChange={handleSearch}
            placeholder={`Cari item ${shtType} — nama atau kode…`}
            className="w-full pl-8 pr-7 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(''); doSearch('', shtType); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400" />
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {!search && pinnedForType.length > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 sticky top-0 z-10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">★ Tersimpan</span>
                </div>
                {pinnedForType.map((item, i) => (
                  <CatalogItem key={`pin-${i}`} item={item} shtType={shtType}
                    isSelected={isSelected(item)} isPinned onSelect={onSelect} onTogglePin={togglePin} />
                ))}
                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 sticky top-7 z-10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Semua Item</span>
                </div>
              </div>
            )}

            {results.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs">
                {search ? `Tidak ada hasil untuk "${search}"` : 'Tidak ada data'}
              </div>
            ) : (
              results.map(item => (
                <CatalogItem key={item.id} item={item} shtType={shtType}
                  isSelected={isSelected(item)} isPinned={isPinned(item)} onSelect={onSelect} onTogglePin={togglePin} />
              ))
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-2 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">
          {pinnedForType.length > 0 && !search
            ? <span>★ {pinnedForType.length} tersimpan · hover item untuk pin</span>
            : 'Hover item lalu klik ★ untuk menyimpan'
          }
        </span>
        <span className="text-[11px] text-gray-400 font-medium">
          {search ? `${results.length} hasil` : `${results.length} dari ${total}`}
        </span>
      </div>
    </div>
  );
};

// ─── Item Modal ───────────────────────────────────────────────────────────────
const parseRekeningList = (val) =>
  val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];

const ItemModal = ({ isOpen, onClose, onSave, editData, loading, existingGroups }) => {
  const [shtType, setShtType]             = useState('SSH');
  const [shtSelected, setShtSelected]     = useState(null);
  const [selectedRekening, setSelectedRekening] = useState('');
  const [volume, setVolume]               = useState(1);
  const [extraKoef, setExtraKoef]         = useState([]);
  const [grup, setGrup]                   = useState('');
  const [keterangan, setKeterangan]       = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editData) {
      const type = editData.jenis_sht || 'SSH';
      setShtType(type);
      setShtSelected({
        uraian:        editData.nama_item,
        kode_barang:   editData.kode_sht || '',
        kode_rekening: editData.kode_rekening || '',
        harga_satuan:  editData.harga_satuan,
        satuan:        editData.satuan || 'Unit',
      });
      setSelectedRekening(editData.kode_rekening || '');
      const koefArr = editData.koefisien?.length
        ? editData.koefisien
        : [{ nilai: editData.volume ?? 1, satuan: editData.satuan || 'Unit' }];
      setVolume(Number(koefArr[0]?.nilai) || 1);
      setExtraKoef(koefArr.slice(1));
      setGrup(editData.grup || '');
      setKeterangan(editData.keterangan || '');
    } else {
      setShtType('SSH');
      setShtSelected(null);
      setSelectedRekening('');
      setVolume(1);
      setExtraKoef([]);
      setGrup('');
      setKeterangan('');
    }
  }, [editData, isOpen]);

  const handleShtTypeChange = (type) => { setShtType(type); setShtSelected(null); setSelectedRekening(''); };

  const handleSelectItem = (item) => {
    setShtSelected(item);
    setVolume(1);
    setExtraKoef([]);
    const list = parseRekeningList(item.kode_rekening);
    setSelectedRekening(list.length === 1 ? list[0] : '');
    if (!editData) {
      if (item.spesifikasi) setKeterangan(item.spesifikasi);
      if (item.kelompok)    setGrup(item.kelompok);
    }
  };

  const allKoef = [{ nilai: volume, satuan: shtSelected?.satuan || 'Unit' }, ...extraKoef];
  const computedVolume = allKoef.reduce((p, k) => p * (Number(k.nilai) || 0), 1);
  const computedSatuan = allKoef.map(k => k.satuan).filter(Boolean).join(' / ');
  const total = computedVolume * Number(shtSelected?.harga_satuan || 0);

  const addExtraKoef    = () => { if (extraKoef.length < 2) setExtraKoef(p => [...p, { nilai: 1, satuan: '' }]); };
  const removeExtraKoef = (i) => setExtraKoef(p => p.filter((_, idx) => idx !== i));
  const updateExtraKoef = (i, field, val) =>
    setExtraKoef(p => p.map((k, idx) => idx === i ? { ...k, [field]: val } : k));

  const rekeningList = parseRekeningList(shtSelected?.kode_rekening);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!shtSelected) return toast.error('Pilih item dari katalog terlebih dahulu');
    if (rekeningList.length > 1 && !selectedRekening)
      return toast.error('Pilih kode rekening untuk item ini');
    const rekening = selectedRekening || firstRekening(shtSelected.kode_rekening);
    onSave({
      nama_item:     shtSelected.uraian,
      kode_rekening: rekening,
      kode_sht:      shtSelected.kode_barang   || null,
      harga_satuan:  shtSelected.harga_satuan,
      satuan:        computedSatuan,
      volume:        computedVolume,
      koefisien:     allKoef,
      jenis_sht:     shtType,
      grup,
      keterangan,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">

        {/* Header */}
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">{editData ? 'Edit Item RKA' : 'Tambah Item RKA'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pilih dari katalog SSH / SBU — nama dan harga terkunci dari referensi</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body: two-panel */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Left: catalog */}
          <div className="w-[300px] sm:w-[360px] shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
            <CatalogPanel
              shtType={shtType}
              onShtTypeChange={handleShtTypeChange}
              onSelect={handleSelectItem}
              selectedItem={shtSelected}
            />
          </div>

          {/* Right: detail or empty state */}
          <form id="item-form" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            {!shtSelected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <ChevronRight className="h-8 w-8 text-gray-300 -ml-1" />
                </div>
                <div>
                  <p className="font-semibold text-gray-400">Pilih item dari katalog</p>
                  <p className="text-xs text-gray-300 mt-1">Gunakan panel kiri untuk memilih item SSH atau SBU</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Item header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        shtBadge(shtType)
                      }`}>{shtType}</span>
                      {shtSelected.kode_barang && (
                        <span className="font-mono text-[11px] text-gray-400">{shtSelected.kode_barang}</span>
                      )}
                    </div>
                    <p className="text-base font-bold text-gray-900 leading-snug">{shtSelected.uraian}</p>
                  </div>
                  <button type="button" onClick={() => setShtSelected(null)}
                    className="text-xs text-gray-400 hover:text-rose-600 flex items-center gap-1 shrink-0 transition-colors mt-1">
                    <X className="h-3 w-3" /> Ganti
                  </button>
                </div>

                {/* Satuan + Harga cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Satuan</p>
                    <p className="text-sm font-bold text-gray-800">{shtSelected.satuan}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">Harga Satuan</p>
                    <p className="text-sm font-bold text-emerald-700">{formatRupiah(shtSelected.harga_satuan)}</p>
                  </div>
                </div>

                {/* Kode Rekening picker — muncul jika item punya >1 rekening */}
                {rekeningList.length > 1 && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Kode Rekening
                      <span className="ml-1 font-normal normal-case tracking-normal text-rose-400">— wajib dipilih</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {rekeningList.map(rek => (
                        <button
                          key={rek}
                          type="button"
                          onClick={() => setSelectedRekening(rek)}
                          className={`text-left px-3 py-2 rounded-xl border text-xs font-mono transition-all ${
                            selectedRekening === rek
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-bold ring-1 ring-indigo-300'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/40'
                          }`}
                        >
                          {selectedRekening === rek && <span className="mr-1 text-indigo-500">✓</span>}
                          {rek}
                        </button>
                      ))}
                    </div>
                    {!selectedRekening && (
                      <p className="mt-1.5 text-[10.5px] text-rose-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" /> Pilih salah satu kode rekening di atas
                      </p>
                    )}
                  </div>
                )}

                {/* Kode rekening tunggal — tampilkan sebagai info */}
                {rekeningList.length === 1 && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Kode Rekening</p>
                    <p className="text-xs font-mono text-gray-700">{rekeningList[0]}</p>
                  </div>
                )}

                {/* Volume stepper */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Volume Kebutuhan
                    <span className="ml-1 text-gray-300 font-normal normal-case tracking-normal">— mendukung desimal, mis. 12,5 atau 12.5</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button type="button"
                        onClick={() => setVolume(v => String(Math.max(0, (Number(v) || 0) - 1)))}
                        className="px-3.5 py-2.5 text-gray-500 hover:bg-gray-100 transition-colors text-lg font-bold leading-none">
                        −
                      </button>
                      <input
                        type="text" inputMode="decimal" value={volume}
                        onChange={e => {
                          const v = parseDecimalInput(e.target.value);
                          if (v !== null) setVolume(v);
                        }}
                        className="w-24 text-center py-2.5 text-sm font-bold text-gray-800 border-x border-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400"
                      />
                      <button type="button"
                        onClick={() => setVolume(v => String((Number(v) || 0) + 1))}
                        className="px-3.5 py-2.5 text-gray-500 hover:bg-gray-100 transition-colors text-lg font-bold leading-none">
                        +
                      </button>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">× {shtSelected.satuan}</span>
                  </div>
                </div>

                {/* Grup */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    <Layers className="inline h-3 w-3 mr-1 -mt-0.5" />
                    Grup Item
                    <span className="ml-1 text-gray-300 font-normal normal-case tracking-normal">— opsional</span>
                  </label>
                  <input list="grup-list" value={grup} onChange={e => setGrup(e.target.value)}
                    placeholder="Cth: Honorarium, Konsumsi, ATK…"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
                  <datalist id="grup-list">
                    {existingGroups.map(g => <option key={g} value={g} />)}
                  </datalist>
                </div>

                {/* Extra koefisien */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Koefisien Tambahan
                    <span className="ml-1 text-gray-300 font-normal normal-case tracking-normal">— opsional, maks. 2</span>
                  </label>
                  {extraKoef.length === 0 ? (
                    <button type="button" onClick={addExtraKoef}
                      className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">
                      <Plus className="h-3.5 w-3.5" /> Tambah koefisien (Orang, Hari, dll)
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {extraKoef.map((k, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-400 shrink-0">×</span>
                          <input type="text" inputMode="decimal" value={k.nilai}
                            onChange={e => {
                              const v = parseDecimalInput(e.target.value);
                              if (v !== null) updateExtraKoef(i, 'nilai', v);
                            }}
                            className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                            placeholder="1" />
                          <input type="text" list="koef-satuan-opts" value={k.satuan}
                            onChange={e => updateExtraKoef(i, 'satuan', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                            placeholder="Orang, Hari, Bulan…" />
                          <button type="button" onClick={() => removeExtraKoef(i)}
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                            <Minus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {extraKoef.length < 2 && (
                        <button type="button" onClick={addExtraKoef}
                          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">
                          <Plus className="h-3.5 w-3.5" /> Tambah koefisien
                        </button>
                      )}
                      <datalist id="koef-satuan-opts">
                        {SATUAN_OPTIONS.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                  )}
                </div>

                {/* Keterangan */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Keterangan</label>
                  <input value={keterangan} onChange={e => setKeterangan(e.target.value)}
                    placeholder="Cth: 30 peserta × 2 hari kegiatan"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
                </div>

                {/* Subtotal */}
                {total > 0 && (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl px-4 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Subtotal Item</p>
                      {extraKoef.length > 0 && (
                        <p className="text-[11px] text-emerald-500 mt-0.5 font-mono">
                          {volume} × {extraKoef.map(k => `${k.nilai} ${k.satuan}`).join(' × ')} × {formatRupiah(shtSelected.harga_satuan)}
                        </p>
                      )}
                    </div>
                    <p className="text-xl font-bold text-emerald-800">{formatRupiah(total)}</p>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3.5 flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0 hidden sm:block">
            {shtSelected ? (
              <p className="text-xs text-gray-400 truncate">
                Akan ditambahkan: <span className="font-semibold text-gray-700">{shtSelected.uraian}</span>
              </p>
            ) : (
              <p className="text-xs text-gray-300">← Pilih item dari katalog di sebelah kiri</p>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors shrink-0">
            Batal
          </button>
          <button type="submit" form="item-form" disabled={loading || !shtSelected}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
            {loading
              ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              : <Save className="h-4 w-4" />}
            {editData ? 'Simpan Perubahan' : '✓ Tambahkan ke RKA'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Paket Modal ─────────────────────────────────────────────────────────────
const PaketModal = ({ isOpen, onClose, onSave, loading, existingGroups }) => {
  const [paketType, setPaketType]         = useState('sosialisasi');
  const [dims, setDims]                   = useState(() => {
    const d = {};
    PAKET_TEMPLATES.sosialisasi.dims.forEach(dim => { d[dim.key] = dim.default; });
    return d;
  });
  const [rowsState, setRowsState]         = useState({});
  const [activeRowId, setActiveRowId]     = useState(null);
  const [catalogShtType, setCatalogShtType] = useState('SSH');
  const [grupPaket, setGrupPaket]         = useState('');

  const template = PAKET_TEMPLATES[paketType];

  // Reset state when modal opens or paketType changes
  useEffect(() => {
    if (!isOpen) return;
    const d = {};
    template.dims.forEach(dim => { d[dim.key] = dim.default; });
    setDims(d);
    const r = {};
    template.rows.forEach(row => {
      r[row.id] = { enabled: true, sht: null, volumeOverride: null, keterangan: '' };
    });
    setRowsState(r);
    setActiveRowId(null);
    setCatalogShtType('SSH');
    setGrupPaket('');
  }, [isOpen, paketType, template]);

  // When active row changes, sync catalog SHT type to the row's preference
  useEffect(() => {
    if (!activeRowId) return;
    const row = template.rows.find(r => r.id === activeRowId);
    if (row) setCatalogShtType(row.shtType);
  }, [activeRowId, template]);

  const getVolume = (row) => {
    const st = rowsState[row.id];
    if (st?.volumeOverride != null && st.volumeOverride !== '') return Number(st.volumeOverride) || 0;
    return Number(row.formula(dims)) || 0;
  };

  const getSubtotal = (row) => {
    const st = rowsState[row.id];
    if (!st || !st.sht || !st.enabled) return 0;
    return getVolume(row) * Number(st.sht.harga_satuan || 0);
  };

  const totalPaket      = template.rows.reduce((s, row) => s + getSubtotal(row), 0);
  const readyCount      = template.rows.filter(row => rowsState[row.id]?.enabled && rowsState[row.id]?.sht).length;

  const handlePick = (rowId) => setActiveRowId(rowId);

  const handleSelectFromCatalog = (item) => {
    if (!activeRowId) return toast('Klik tombol "Pilih SHT" pada baris di kanan', { icon: '👆' });
    setRowsState(prev => ({
      ...prev,
      [activeRowId]: { ...prev[activeRowId], sht: { ...item, jenis_sht: catalogShtType } },
    }));
    // auto-advance to next row that has no SHT
    const idx = template.rows.findIndex(r => r.id === activeRowId);
    const next = template.rows.slice(idx + 1).find(r => !rowsState[r.id]?.sht);
    if (next) setActiveRowId(next.id);
  };

  const handleSubmit = () => {
    const items = template.rows
      .filter(row => rowsState[row.id]?.enabled && rowsState[row.id]?.sht)
      .map(row => {
        const st  = rowsState[row.id];
        const vol = getVolume(row);
        const satuan = st.sht.satuan || 'Unit';
        return {
          nama_item:     st.sht.uraian,
          kode_rekening: firstRekening(st.sht.kode_rekening),
          kode_sht:      st.sht.kode_barang   || null,
          harga_satuan:  st.sht.harga_satuan,
          satuan,
          volume:        vol,
          koefisien:     [{ nilai: vol, satuan }],
          jenis_sht:     st.sht.jenis_sht,
          grup:          grupPaket || '',
          keterangan:    st.keterangan || st.sht.spesifikasi || row.formulaLabel(dims),
        };
      });
    if (items.length === 0) return toast.error('Pilih SHT untuk minimal 1 item');
    onSave(items);
  };

  if (!isOpen) return null;

  const activeRow = template.rows.find(r => r.id === activeRowId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col">

        {/* Header */}
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-violet-100 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Tambah Paket Kegiatan</h2>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500" />
                Ubah parameter — semua item paket otomatis menyesuaikan
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body: 3-panel */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* LEFT: Config */}
          <div className="w-[240px] shrink-0 border-r border-gray-100 flex flex-col overflow-hidden bg-gray-50/30">
            {/* Type tabs */}
            <div className="px-3 pt-3 pb-2 border-b border-gray-100 shrink-0 bg-white">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Jenis Paket</label>
              <div className="space-y-1">
                {Object.values(PAKET_TEMPLATES).map(t => (
                  <button key={t.id} type="button" onClick={() => setPaketType(t.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                      paketType === t.id
                        ? 'bg-violet-600 text-white'
                        : 'text-gray-600 hover:bg-violet-50 hover:text-violet-700'
                    }`}>
                    <div>{t.label}</div>
                    <div className={`text-[10px] font-normal mt-0.5 ${paketType === t.id ? 'text-violet-100' : 'text-gray-400'}`}>
                      {t.rows.length} item · {t.dims.length} parameter
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dims */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Parameter</label>
                <p className="text-[10.5px] text-gray-400 mt-0.5">Ubah angka, semua item ikut</p>
              </div>
              {template.dims.map(dim => {
                const Icon = dim.icon;
                return (
                  <div key={dim.key}>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 mb-1">
                      <Icon className="h-3.5 w-3.5 text-violet-500" />
                      {dim.label}
                    </label>
                    <input type="number" min="0" value={dims[dim.key] ?? ''}
                      onChange={e => setDims(d => ({ ...d, [dim.key]: e.target.value === '' ? 0 : Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                  </div>
                );
              })}

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Nama Grup</label>
                <input list="paket-grup-list" value={grupPaket}
                  onChange={e => setGrupPaket(e.target.value)}
                  placeholder="cth: Sosialisasi ADD 2026"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                <p className="text-[10px] text-gray-400 mt-1">Semua komponen paket masuk grup ini</p>
              </div>
            </div>

            {/* Summary */}
            <div className="shrink-0 border-t border-violet-200 p-3 bg-gradient-to-br from-violet-100 to-indigo-50">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Subtotal Paket</span>
                <span className="text-[10px] text-violet-500 font-mono font-bold">{readyCount}/{template.rows.length}</span>
              </div>
              <p className="text-base font-bold text-violet-800 leading-tight">{formatRupiah(totalPaket)}</p>
            </div>
          </div>

          {/* MIDDLE: Catalog */}
          <div className="w-[320px] shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
            {!activeRowId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <ChevronRight className="h-7 w-7 text-gray-300 rotate-180" />
                </div>
                <div>
                  <p className="font-semibold text-gray-500 text-sm">Pilih baris dulu</p>
                  <p className="text-[11px] text-gray-400 mt-1 px-4">
                    Klik tombol <span className="font-bold text-violet-600">"Pilih SHT"</span> pada baris di kanan untuk mulai memilih item dari katalog
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-violet-200 bg-violet-50 shrink-0">
                  <p className="text-[9.5px] font-bold uppercase tracking-widest text-violet-500">Memilih untuk</p>
                  <p className="text-xs font-bold text-violet-900 truncate">{activeRow?.label}</p>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CatalogPanel
                    shtType={catalogShtType}
                    onShtTypeChange={setCatalogShtType}
                    onSelect={handleSelectFromCatalog}
                    selectedItem={rowsState[activeRowId]?.sht}
                  />
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Rows */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50/30">
            {template.rows.map(row => {
              const st       = rowsState[row.id] || {};
              const vol      = getVolume(row);
              const subtotal = getSubtotal(row);
              const isActive = activeRowId === row.id;
              const hasSht   = !!st.sht;
              const enabled  = st.enabled !== false;

              return (
                <div key={row.id} className={`border rounded-xl p-3 transition-all bg-white ${
                  isActive  ? 'border-violet-400 ring-2 ring-violet-100' :
                  hasSht    ? 'border-emerald-200' :
                              'border-gray-200'
                } ${!enabled ? 'opacity-50' : ''}`}>

                  {/* Header row */}
                  <div className="flex items-start gap-2 mb-2">
                    <input type="checkbox" checked={enabled}
                      onChange={e => setRowsState(p => ({ ...p, [row.id]: { ...p[row.id], enabled: e.target.checked } }))}
                      className="mt-1 h-4 w-4 rounded text-violet-600 focus:ring-violet-400 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 leading-tight">{row.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          row.shtBadge(shtType)
                        }`}>{row.shtType}</span>
                        <span className="text-gray-600 font-semibold">Vol: <span className="text-violet-700">{vol.toLocaleString('id-ID')}</span></span>
                        <span className="text-gray-300">·</span>
                        <span className="font-mono text-[10.5px] text-gray-400">{row.formulaLabel(dims)}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${subtotal > 0 ? 'text-emerald-700' : 'text-gray-300'}`}>
                        {subtotal > 0 ? formatRupiah(subtotal) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* SHT row + actions */}
                  {hasSht ? (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <p className="text-xs font-medium text-gray-700 truncate flex-1" title={st.sht.uraian}>{st.sht.uraian}</p>
                      <span className="text-[10.5px] text-gray-500 shrink-0 font-mono">{formatRupiah(st.sht.harga_satuan)} / {st.sht.satuan}</span>
                      <button type="button" onClick={() => handlePick(row.id)}
                        className="text-[11px] text-violet-600 hover:text-violet-800 font-bold shrink-0">
                        Ganti
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => handlePick(row.id)} disabled={!enabled}
                      className={`w-full text-xs font-bold py-2 px-3 rounded-lg transition-colors ${
                        isActive    ? 'bg-violet-600 text-white' :
                        !enabled    ? 'bg-gray-100 text-gray-300 cursor-not-allowed' :
                                      'bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700'
                      }`}>
                      + Pilih SHT dari Katalog
                    </button>
                  )}

                  {/* Volume override — only when SHT picked */}
                  {hasSht && (
                    <details className="mt-1.5 group">
                      <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 select-none list-none flex items-center gap-0.5">
                        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                        <span>Override volume manual</span>
                      </summary>
                      <div className="mt-1.5 flex items-center gap-1">
                        <input type="text" inputMode="decimal" value={st.volumeOverride ?? ''} placeholder={`auto ${vol}`}
                          onChange={e => {
                            const v = parseDecimalInput(e.target.value);
                            if (v !== null) setRowsState(p => ({ ...p, [row.id]: { ...p[row.id], volumeOverride: v === '' ? null : v } }));
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-violet-400 focus:outline-none" />
                        {st.volumeOverride != null && (
                          <button type="button" onClick={() => setRowsState(p => ({ ...p, [row.id]: { ...p[row.id], volumeOverride: null } }))}
                            title="Kembalikan ke otomatis"
                            className="p-1 text-gray-400 hover:text-rose-500 shrink-0">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}

            <datalist id="paket-grup-list">
              {existingGroups.map(g => <option key={g} value={g} />)}
            </datalist>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3.5 flex items-center gap-3 shrink-0">
          <p className="text-xs text-gray-500 flex-1 hidden sm:block">
            <span className="font-bold text-violet-700">{readyCount}</span> item siap ditambahkan
            <span className="mx-1.5 text-gray-300">·</span>
            Total <span className="font-bold text-emerald-700">{formatRupiah(totalPaket)}</span>
          </p>
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors shrink-0">
            Batal
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading || readyCount === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
            {loading
              ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              : <Save className="h-4 w-4" />}
            ✓ Tambahkan {readyCount > 0 ? `${readyCount} Item` : 'Paket'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Group Section (collapsible) ─────────────────────────────────────────────
const GroupSection = ({ groupName, isRekening, grupNames, items, isSuperadmin, onEdit, onDelete, startIdx }) => {
  const [open, setOpen] = useState(true);
  const total = items.reduce((s, i) => s + i.total, 0);

  return (
    <div>
      {/* Group header */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100 text-left">
        <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          {isRekening ? (
            <>
              <span className="font-mono text-xs font-bold text-indigo-700 block">{groupName}</span>
              {grupNames.length > 0 && (
                <span className="text-[10px] text-slate-400 block truncate">{grupNames.join(' · ')}</span>
              )}
            </>
          ) : (
            <span className="text-xs font-bold text-slate-700 block truncate">{groupName || 'Umum'}</span>
          )}
        </div>
        <span className="text-[10.5px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">{items.length} item</span>
        <span className="text-xs font-semibold text-emerald-700 shrink-0">{fmtCompact(total)}</span>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <>
          {/* Table header inside group */}
          <div className="hidden md:grid px-5 py-2 bg-white border-b border-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-300"
            style={{ gridTemplateColumns: '2.5rem 1fr 4.5rem 9rem 9rem 9rem 5rem' }}>
            <div>No</div><div>Uraian Item</div>
            <div className="text-center">Jenis</div>
            <div className="text-right">Vol. Satuan</div>
            <div className="text-right">Harga Satuan</div>
            <div className="text-right">Total</div>
            <div className="text-center">Aksi</div>
          </div>

          <div className="divide-y divide-slate-50">
            {items.map((item, idx) => {
              const hasKoef = item.koefisien?.length > 1;
              return (
                <div key={item.id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors group">

                  {/* Desktop */}
                  <div className="hidden md:grid items-start gap-3"
                    style={{ gridTemplateColumns: '2.5rem 1fr 4.5rem 9rem 9rem 9rem 5rem' }}>
                    <div className="text-sm font-mono text-slate-400 pt-0.5">
                      {String(startIdx + idx + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm leading-snug">{item.nama_item}</p>
                      {item.keterangan && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.keterangan}</p>
                      )}
                    </div>
                    <div className="flex justify-center pt-0.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        shtBadge(item.jenis_sht)
                      }`}>{item.jenis_sht}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-700">
                        {item.volume} <span className="text-slate-500 font-normal text-xs">{item.satuan}</span>
                      </p>
                      {hasKoef && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.koefisien.map(k => `${k.nilai} ${k.satuan}`).join(' × ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-slate-600">{formatRupiah(item.harga_satuan)}</div>
                    <div className="text-right font-bold text-emerald-700 text-sm">{formatRupiah(item.total)}</div>
                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isSuperadmin && (
                        <>
                          <button onClick={() => onEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => onDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-mono text-slate-400">#{startIdx + idx + 1}</span>
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            shtBadge(item.jenis_sht)
                          }`}>{item.jenis_sht}</span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm leading-snug">{item.nama_item}</p>
                        {item.keterangan && <p className="text-[11px] text-slate-500 mt-0.5">{item.keterangan}</p>}
                        {item.kode_rekening && (
                          <p className="text-[10px] font-mono text-slate-300 mt-0.5">
                            {firstRekening(item.kode_rekening)}
                          </p>
                        )}
                      </div>
                      {isSuperadmin && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => onEdit(item)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => onDelete(item)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{item.volume} {item.satuan} × {formatRupiah(item.harga_satuan)}</span>
                      <span className="font-bold text-emerald-700">{formatRupiah(item.total)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Group subtotal */}
          <div className="px-5 py-2.5 bg-slate-50/60 border-t border-slate-100 flex justify-end">
            <div className="text-xs text-slate-500">
              Subtotal <span className="font-bold text-slate-700 ml-2">{formatRupiah(total)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Item Detail Row (reusable untuk tree rekening) ─────────────────────────
const ItemDetailRow = ({ item, globalIdx, isSuperadmin, onEdit, onDelete, indentLeft = 20 }) => {
  const hasKoef = item.koefisien?.length > 1;
  return (
    <div className="hover:bg-slate-50/60 transition-colors group border-b border-slate-50 last:border-0">
      {/* Desktop */}
      <div className="hidden md:grid items-start gap-3 py-3"
        style={{ gridTemplateColumns: '2.5rem 1fr 4.5rem 9rem 9rem 9rem 5rem', paddingLeft: `${indentLeft}px`, paddingRight: '20px' }}>
        <div className="text-sm font-mono text-slate-400 pt-0.5">{String(globalIdx + 1).padStart(2, '0')}</div>
        <div>
          <p className="font-semibold text-slate-800 text-sm leading-snug">{item.nama_item}</p>
          {item.keterangan && <p className="text-[11px] text-slate-500 mt-0.5">{item.keterangan}</p>}
        </div>
        <div className="flex justify-center pt-0.5">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
            shtBadge(item.jenis_sht)
          }`}>{item.jenis_sht}</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-700">
            {item.volume} <span className="text-slate-500 font-normal text-xs">{item.satuan}</span>
          </p>
          {hasKoef && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              {item.koefisien.map(k => `${k.nilai} ${k.satuan}`).join(' × ')}
            </p>
          )}
        </div>
        <div className="text-right text-sm text-slate-600">{formatRupiah(item.harga_satuan)}</div>
        <div className="text-right font-bold text-emerald-700 text-sm">{formatRupiah(item.total)}</div>
        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isSuperadmin && (
            <>
              <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(item)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      {/* Mobile */}
      <div className="md:hidden px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[11px] font-mono text-slate-400">#{globalIdx + 1}</span>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                shtBadge(item.jenis_sht)
              }`}>{item.jenis_sht}</span>
            </div>
            <p className="font-semibold text-slate-800 text-sm leading-snug">{item.nama_item}</p>
            {item.keterangan && <p className="text-[11px] text-slate-500 mt-0.5">{item.keterangan}</p>}
          </div>
          {isSuperadmin && (
            <div className="flex gap-1 shrink-0">
              <button onClick={() => onEdit(item)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit2 className="h-4 w-4" /></button>
              <button onClick={() => onDelete(item)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-slate-500">{item.volume} {item.satuan} × {formatRupiah(item.harga_satuan)}</span>
          <span className="font-bold text-emerald-700">{formatRupiah(item.total)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Rekening Tree Node ───────────────────────────────────────────────────────
// Style berdasarkan kedalaman segmen: 0='5', 1='5.1', 2='5.1.02', dst.
const REKENING_DEPTH_STYLES = [
  { bg: 'bg-blue-400',  text: 'text-white',     countText: 'text-blue-100',   border: 'border-blue-500',  accText: 'text-emerald-100', size: 'text-[11.5px]', weight: 'font-black'    },
  { bg: 'bg-blue-300',  text: 'text-blue-950',  countText: 'text-blue-700',   border: 'border-blue-400',  accText: 'text-emerald-700', size: 'text-[11px]',   weight: 'font-bold'     },
  { bg: 'bg-blue-200',  text: 'text-blue-950',  countText: 'text-blue-600',   border: 'border-blue-300',  accText: 'text-emerald-700', size: 'text-[11px]',   weight: 'font-bold'     },
  { bg: 'bg-indigo-50', text: 'text-indigo-900',countText: 'text-indigo-400', border: 'border-indigo-100',accText: 'text-emerald-700', size: 'text-xs',       weight: 'font-bold'     },
  { bg: 'bg-slate-50',  text: 'text-slate-700', countText: 'text-slate-400',  border: 'border-slate-200', accText: 'text-emerald-700', size: 'text-xs',       weight: 'font-semibold' },
  { bg: 'bg-white',     text: 'text-slate-500', countText: 'text-slate-300',  border: 'border-slate-100', accText: 'text-emerald-700', size: 'text-[11px]',   weight: 'font-semibold' },
];
const INDENT_STEP = 16; // px per kedalaman

const RekeningTreeNode = ({ node, isSuperadmin, onEdit, onDelete, itemIndexMap }) => {
  const [open, setOpen] = useState(true);
  const depth = node.depth; // 0-indexed (0 = segmen pertama, mis. '5')
  const s = REKENING_DEPTH_STYLES[Math.min(depth, REKENING_DEPTH_STYLES.length - 1)];
  const headerIndent = 12 + depth * INDENT_STEP;
  const itemIndent   = headerIndent + INDENT_STEP + 4;
  const hasChildren  = node.children.size > 0;

  return (
    <div>
      {/* Header node */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 py-2 border-b ${s.border} ${s.bg} transition-colors text-left`}
        style={{ paddingLeft: `${headerIndent}px`, paddingRight: '16px' }}
      >
        {open
          ? <ChevronDown  className={`h-3 w-3 shrink-0 ${s.text} opacity-60`} />
          : <ChevronRight className={`h-3 w-3 shrink-0 ${s.text} opacity-60`} />}
        <span className={`font-mono ${s.size} ${s.weight} ${s.text} flex-1 min-w-0 truncate`}>
          {node.code}
        </span>
        <span className={`text-[10px] ${s.countText} mr-3 shrink-0`}>{node.itemCount} item</span>
        <span className={`text-[11.5px] font-bold ${s.accText} shrink-0`}>
          {fmtCompact(node.total)}
        </span>
      </button>

      {/* Konten: child nodes lalu item di node ini */}
      {open && (
        <div>
          {[...node.children.values()].map(child => (
            <RekeningTreeNode
              key={child.code}
              node={child}
              isSuperadmin={isSuperadmin}
              onEdit={onEdit}
              onDelete={onDelete}
              itemIndexMap={itemIndexMap}
            />
          ))}
          {/* Table header mini — hanya muncul jika node ini punya item langsung */}
          {node.items.length > 0 && (
            <div className="hidden md:grid py-1.5 border-b border-slate-50 text-[9.5px] font-bold uppercase tracking-widest text-slate-300"
              style={{ gridTemplateColumns: '2.5rem 1fr 4.5rem 9rem 9rem 9rem 5rem', paddingLeft: `${itemIndent}px`, paddingRight: '20px' }}>
              <div>No</div><div>Uraian Item</div>
              <div className="text-center">Jenis</div>
              <div className="text-right">Vol. Satuan</div>
              <div className="text-right">Harga Satuan</div>
              <div className="text-right">Total</div>
              <div />
            </div>
          )}
          {node.items.map(item => (
            <ItemDetailRow
              key={item.id}
              item={item}
              globalIdx={itemIndexMap[item.id] ?? 0}
              isSuperadmin={isSuperadmin}
              onEdit={onEdit}
              onDelete={onDelete}
              indentLeft={itemIndent}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Sesuaikan Sidebar — REFERENSI saja, tidak mengubah koefisien langsung ────
// Menampilkan saran volume baru untuk tiap item agar total anggaran = pagu.
// User klik "Buka untuk Edit" → ItemModal terbuka dengan volume yang sudah
// terisi sesuai saran, tapi user tetap harus konfirmasi & klik Save sendiri.
const SesuaikanSidebar = ({
  items, pagu, totalAnggaran,
  onOpenEditWithSuggestion, onAutoAddFotocopy, savingAuto,
}) => {
  const [fotocopySearch, setFotocopySearch] = useState(FOTOCOPY_SEARCH_DEFAULT);
  const [fotocopyItems, setFotocopyItems] = useState([]);
  const [fotocopyLoading, setFotocopyLoading] = useState(false);
  const [selectedFotocopyItem, setSelectedFotocopyItem] = useState(null);

  const selisih    = pagu - totalAnggaran;
  const absSelisih = Math.abs(selisih);
  const isPositive = selisih > 0;          // pagu masih sisa → perlu naikkan volume
  const isMatched  = absSelisih < 1;       // toleransi 1 rupiah dianggap sudah pas

  const existingFotocopy = items.find(isFotocopyItem);

  // Hitung saran volume untuk tiap item — masing-masing item dihitung independen
  // (asumsi: yang berubah hanya satu item ini, sisanya tetap)
  const suggestions = items
    .filter(it => Number(it.harga_satuan) > 0)
    .map(it => {
      const currentSubtotal  = Number(it.volume) * Number(it.harga_satuan);
      const otherTotal       = totalAnggaran - currentSubtotal;
      const neededSubtotal   = pagu - otherTotal;
      const suggestedVolume  = neededSubtotal / Number(it.harga_satuan);
      return {
        item: it,
        currentSubtotal,
        suggestedVolume,
        suggestedSubtotal: neededSubtotal,
        deltaVolume: suggestedVolume - Number(it.volume),
        possible: suggestedVolume > 0,
        isFotocopy: isFotocopyItem(it),
      };
    });

  // Urutkan: fotokopi existing dulu, lalu yang feasible (delta kecil) dulu
  suggestions.sort((a, b) => {
    if (a.isFotocopy && !b.isFotocopy) return -1;
    if (!a.isFotocopy && b.isFotocopy) return 1;
    if (a.possible && !b.possible) return -1;
    if (!a.possible && b.possible) return 1;
    return Math.abs(a.deltaVolume) - Math.abs(b.deltaVolume);
  });

  const showFotocopyCatalog = !existingFotocopy && !isMatched && isPositive;

  const doSearchFotocopy = useCallback(async (q) => {
    setFotocopyLoading(true);
    try {
      const res = await api.get('/anggaran/sht/ssh', {
        params: { search: q || FOTOCOPY_SEARCH_DEFAULT, limit: 30 },
      });
      const data = res.data.success ? res.data.data : [];
      setFotocopyItems(data);
      setSelectedFotocopyItem(prev => {
        if (prev && data.some(item => pinKey(item) === pinKey(prev))) return prev;
        return data[0] || null;
      });
    } catch {
      setFotocopyItems([]);
      setSelectedFotocopyItem(null);
    } finally {
      setFotocopyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showFotocopyCatalog) return undefined;
    const timer = setTimeout(() => doSearchFotocopy(fotocopySearch), 350);
    return () => clearTimeout(timer);
  }, [showFotocopyCatalog, fotocopySearch, doSearchFotocopy]);

  const selectedFotocopyPrice = Number(selectedFotocopyItem?.harga_satuan || 0);
  const fotocopySuggestion = showFotocopyCatalog && selectedFotocopyItem && selectedFotocopyPrice > 0
    ? { volume: selisih / selectedFotocopyPrice, subtotal: selisih }
    : null;

  return (
    <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col xl:sticky xl:top-16 xl:max-h-[calc(100vh-5rem)]">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Calculator className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Referensi Penyesuaian ke Pagu</h2>
              <p className="text-xs text-slate-500 mt-0.5">Saran volume baru — tidak mengubah data, hanya menunjukkan opsi</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pagu</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{formatRupiah(pagu)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Saat Ini</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{formatRupiah(totalAnggaran)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selisih</p>
              <p className={`text-sm font-bold mt-0.5 ${
                isMatched ? 'text-emerald-600' : isPositive ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {isMatched
                  ? '✓ Sesuai'
                  : isPositive
                    ? `+ ${formatRupiah(absSelisih)}`
                    : `− ${formatRupiah(absSelisih)}`}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isMatched
                  ? 'tidak perlu disesuaikan'
                  : isPositive
                    ? 'pagu masih sisa'
                    : 'melebihi pagu'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isMatched ? (
            <div className="text-center py-8">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
              <p className="font-semibold text-emerald-700">Total anggaran sudah sesuai dengan pagu</p>
              <p className="text-sm text-slate-500 mt-1">Tidak ada penyesuaian yang diperlukan</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-slate-700 mb-1">
                Item yang volumenya bisa diubah untuk menyamakan total dengan pagu:
              </p>
              <p className="text-[11px] text-slate-400 mb-3">
                Klik <strong>Buka untuk Edit</strong> pada item yang diinginkan — form edit akan terbuka dengan volume sudah terisi sesuai saran, lalu Anda klik Simpan sendiri.
              </p>

              {suggestions.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Belum ada item yang bisa dijadikan referensi penyesuaian.
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map(({ item, currentSubtotal, suggestedVolume, suggestedSubtotal, possible, deltaVolume, isFotocopy: fc }) => (
                    <div key={item.id} className={`border rounded-xl p-3 transition-colors ${
                      possible ? 'border-slate-200 bg-white hover:border-emerald-200' : 'border-slate-100 bg-slate-50/40 opacity-60'
                    }`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <p className="font-semibold text-slate-800 text-sm leading-snug">{item.nama_item}</p>
                            {fc && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Fotokopi</span>
                            )}
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              shtBadge(item.jenis_sht)
                            }`}>{item.jenis_sht}</span>
                          </div>
                          {item.grup && <p className="text-[11px] text-slate-500">Grup: {item.grup}</p>}
                        </div>
                        {possible && (
                          <button type="button"
                            onClick={() => onOpenEditWithSuggestion(item, suggestedVolume)}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-700 shrink-0 whitespace-nowrap transition-colors">
                            Buka untuk Edit
                          </button>
                        )}
                      </div>

                      {!possible ? (
                        <p className="text-[11px] text-rose-600 font-medium bg-rose-50 border border-rose-100 rounded-lg px-2 py-1.5">
                          ✗ Tidak bisa disesuaikan — selisih lebih besar dari subtotal item ini (volume jadi negatif)
                        </p>
                      ) : (
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] space-y-1">
                          <div className="flex justify-between text-slate-500">
                            <span>Saat ini:</span>
                            <span className="font-mono">
                              {Number(item.volume).toLocaleString('id-ID', { maximumFractionDigits: 4 })} {item.satuan} × {formatRupiah(item.harga_satuan)} = {formatRupiah(currentSubtotal)}
                            </span>
                          </div>
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>Saran:</span>
                            <span className="font-mono">
                              {suggestedVolume.toLocaleString('id-ID', { maximumFractionDigits: 4 })} {item.satuan} × {formatRupiah(item.harga_satuan)} = {formatRupiah(suggestedSubtotal)}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[10px]">
                            <span>Selisih volume:</span>
                            <span className="font-mono">
                              {deltaVolume > 0 ? '+ ' : '− '}
                              {Math.abs(deltaVolume).toLocaleString('id-ID', { maximumFractionDigits: 4 })} {item.satuan}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Fallback: tambah item fotokopi dari katalog SSH kalau belum ada */}
              {showFotocopyCatalog && (
                <div className="mt-4 border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-xl p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                      <Search className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900 text-sm">Alternatif: Item Fotokopi dari SSH</p>
                      <p className="text-[11px] text-amber-700/80 mt-0.5">
                        Pilih item "foto copy" dari katalog SSH, lalu volume dihitung dari selisih pagu.
                      </p>
                    </div>
                  </div>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500 pointer-events-none" />
                    <input
                      type="text"
                      value={fotocopySearch}
                      onChange={e => setFotocopySearch(e.target.value)}
                      placeholder="Cari item SSH, mis. foto copy A4"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto bg-white border border-amber-200 rounded-lg divide-y divide-amber-100 mb-2">
                    {fotocopyLoading ? (
                      <div className="flex items-center justify-center py-5">
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600" />
                      </div>
                    ) : fotocopyItems.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[11px] text-amber-700/70">
                        Tidak ada item SSH yang cocok.
                      </div>
                    ) : (
                      fotocopyItems.map((item, i) => {
                        const selected = selectedFotocopyItem && pinKey(item) === pinKey(selectedFotocopyItem);
                        return (
                          <button
                            key={`${pinKey(item)}-${i}`}
                            type="button"
                            onClick={() => setSelectedFotocopyItem(item)}
                            className={`w-full text-left px-3 py-2 transition-colors ${
                              selected ? 'bg-amber-100/70' : 'hover:bg-amber-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-800 leading-snug">{item.uraian}</p>
                                {item.spesifikasi && (
                                  <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{item.spesifikasi}</p>
                                )}
                                <p className="text-[10px] text-slate-400 mt-1">{item.satuan}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[11px] font-bold text-emerald-700">{formatRupiah(item.harga_satuan)}</p>
                                {selected && <p className="text-[9px] font-bold text-amber-700 mt-0.5">Terpilih</p>}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {fotocopySuggestion && (
                  <div className="bg-white border border-amber-200 rounded-lg p-2 text-[11px] mb-2">
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Saran:</span>
                      <span className="font-mono">
                        {fotocopySuggestion.volume.toLocaleString('id-ID', { maximumFractionDigits: 4 })} {selectedFotocopyItem.satuan || 'Lembar'} x {formatRupiah(selectedFotocopyPrice)} = {formatRupiah(fotocopySuggestion.subtotal)}
                      </span>
                    </div>
                  </div>
                  )}
                  <button type="button"
                    onClick={() => onAutoAddFotocopy(selectedFotocopyItem, fotocopySuggestion?.volume)}
                    disabled={savingAuto || !fotocopySuggestion}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors">
                    {savingAuto ? <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : <Plus className="h-3.5 w-3.5" />}
                    Tambah Item Fotokopi dari SSH
                  </button>
                </div>
              )}

              <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Sidebar ini hanya menampilkan referensi — tidak ada data yang diubah sampai Anda menyimpan secara eksplisit di form edit.
                </span>
              </div>
            </>
          )}
        </div>

    </aside>
  );
};

// ─── Halaman Utama ───────────────────────────────────────────────────────────
const ItemAnggaranPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paguId = searchParams.get('pagu_id');
  const label  = searchParams.get('label') || 'Item RKA';

  const [paguInfo, setPaguInfo]           = useState(null);
  const [items, setItems]                 = useState([]);
  const [totalAnggaran, setTotalAnggaran] = useState(0);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [modalOpen, setModalOpen]         = useState(false);
  const [paketOpen, setPaketOpen]         = useState(false);
  const [editData, setEditData]           = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [groupMode, setGroupMode]         = useState('grup'); // 'grup' | 'rekening'
  const [savingFotocopy, setSavingFotocopy] = useState(false);

  const user         = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperadmin = user.role === 'superadmin' || user.role === 'bendahara';

  const fetchItems = useCallback(async () => {
    if (!paguId) return;
    try {
      setLoading(true);
      const res = await api.get(`/anggaran/pagu/${paguId}/items`);
      if (res.data.success) {
        setItems(res.data.data);
        setTotalAnggaran(res.data.total_anggaran || 0);
        setPaguInfo(res.data.pagu);
      }
    } catch { toast.error('Gagal memuat data item RKA'); }
    finally { setLoading(false); }
  }, [paguId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Group items by grup name (mode 'grup')
  const groupedItems = useMemo(() => {
    if (groupMode !== 'grup') return [];
    const map = new Map();
    items.forEach(item => {
      const key = item.grup || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries()).map(([name, its]) => ({ name, items: its }));
  }, [items, groupMode]);

  // Pohon hierarki rekening — hanya dibangun saat mode 'rekening'
  const rekeningTree = useMemo(
    () => groupMode === 'rekening' ? buildRekeningTree(items) : null,
    [items, groupMode]
  );

  // Peta item.id → index global (urutan DFS) untuk penomoran item di tree
  const itemGlobalIndex = useMemo(() => {
    if (!rekeningTree) return {};
    const map = {};
    let idx = 0;
    function dfs(node) {
      node.children.forEach(child => dfs(child));
      node.items.forEach(item => { map[item.id] = idx++; });
    }
    dfs(rekeningTree);
    return map;
  }, [rekeningTree]);

  const existingGroups = useMemo(
    () => [...new Set(items.map(i => i.grup).filter(Boolean))],
    [items]
  );

  const handleSave = async (formData) => {
    try {
      setSaving(true);
      if (editData) {
        await api.put(`/anggaran/items/${editData.id}`, formData);
        toast.success('Item berhasil diupdate');
      } else {
        await api.post(`/anggaran/pagu/${paguId}/items`, formData);
        toast.success('Item berhasil ditambahkan');
      }
      setModalOpen(false); setEditData(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan item');
    } finally { setSaving(false); }
  };

  const handlePaketSave = async (paketItems) => {
    try {
      setSaving(true);
      let ok = 0;
      for (const item of paketItems) {
        await api.post(`/anggaran/pagu/${paguId}/items`, item);
        ok++;
      }
      toast.success(`${ok} item paket berhasil ditambahkan`);
      setPaketOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan paket');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/anggaran/items/${id}`);
      toast.success('Item berhasil dihapus');
      setDeleteConfirm(null); fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus item');
    }
  };

  // Buka ItemModal dengan volume sudah terisi sesuai saran dari SesuaikanSidebar.
  // Tidak menyimpan apa pun — user tetap harus klik Save di form edit.
  const handleOpenEditWithSuggestion = (item, suggestedVolume) => {
    const satuanAsli = item.satuan || 'Unit';
    setEditData({
      ...item,
      volume: suggestedVolume,
      koefisien: [{ nilai: suggestedVolume, satuan: satuanAsli }],
    });
    setModalOpen(true);
  };

  // Tambah item fotokopi dari katalog SSH sebagai item baru (BUKAN ubah koefisien existing).
  const handleAutoAddFotocopy = async (sshItem, suggestedVolume) => {
    if (!sshItem || !suggestedVolume) {
      toast.error('Pilih item fotokopi dari katalog SSH terlebih dahulu');
      return;
    }

    try {
      setSavingFotocopy(true);
      await api.post(`/anggaran/pagu/${paguId}/items`, {
        nama_item:    sshItem.uraian,
        kode_rekening: firstRekening(sshItem.kode_rekening),
        satuan:       sshItem.satuan || 'Lembar',
        volume:       suggestedVolume,
        harga_satuan: sshItem.harga_satuan,
        jenis_sht:    'SSH',
        kode_sht:     sshItem.kode_barang || null,
        keterangan:   sshItem.spesifikasi
          ? `${sshItem.spesifikasi} - Penyesuaian akhir agar total anggaran sama dengan pagu`
          : 'Penyesuaian akhir agar total anggaran sama dengan pagu',
        koefisien:    [{ nilai: suggestedVolume, satuan: sshItem.satuan || 'Lembar' }],
        grup:         sshItem.kelompok || 'Penggandaan',
      });
      toast.success('Item fotokopi dari SSH berhasil ditambahkan');
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan item fotokopi');
    } finally {
      setSavingFotocopy(false);
    }
  };

  const pagu    = paguInfo?.pagu || 0;
  const sisa    = pagu - totalAnggaran;
  const pctUsed = pagu > 0 ? Math.min(100, (totalAnggaran / pagu) * 100) : 0;
  const mk      = paguInfo?.master_kegiatan;
  const showSesuaikanSidebar = isSuperadmin && !loading && pagu > 0 && items.length > 0;

  // Running index across all groups for row numbering
  let runningIdx = 0;

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-20">

      {/* ── Breadcrumb ── */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="mx-auto px-4 sm:px-6">
          <div className="h-12 flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-slate-400">
            <button onClick={() => navigate(-1)} className="hover:text-slate-600 transition-colors p-1 -ml-1">
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-slate-300">·</span>
            <span className="text-indigo-500">Perencanaan RKA</span>
            {mk?.kode_sub_kegiatan && (
              <><ChevronRight className="h-3 w-3 text-slate-300" /><span className="font-mono text-slate-500">{mk.kode_sub_kegiatan}</span></>
            )}
            {paguInfo?.tahun && (
              <><ChevronRight className="h-3 w-3 text-slate-300" /><span>TA {paguInfo.tahun}</span></>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Title ── */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <DollarSign className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-snug">{mk?.nama_sub_kegiatan || label}</h1>
            <p className="text-sm text-slate-500 mt-0.5">Rancang dan input rincian item kegiatan beserta pagu yang dibutuhkan untuk sub-kegiatan ini.</p>
          </div>
        </div>

        {/* ── Info Strip ── */}
        {paguInfo && !loading && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 lg:grid-cols-4">
              <div className="p-4 border-b border-r border-slate-100 lg:border-b-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Program · <span className="font-mono">{mk?.kode_program}</span>
                </div>
                <p className="text-sm font-medium text-slate-700 leading-snug line-clamp-2">{mk?.nama_program}</p>
              </div>
              <div className="p-4 border-b border-slate-100 lg:border-b-0 lg:border-r">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Kegiatan · <span className="font-mono">{mk?.kode_kegiatan}</span>
                </div>
                <p className="text-sm font-medium text-slate-700 leading-snug line-clamp-2">{mk?.nama_kegiatan}</p>
              </div>
              <div className="p-4 border-r border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Pagu Sub-Kegiatan</div>
                <p className="text-lg font-bold text-emerald-600">{fmtCompact(pagu)}</p>
                <p className="text-[11px] text-slate-400">{formatRupiah(pagu)}</p>
              </div>
              <div className="p-4">
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${
                  pctUsed > 100 ? 'text-rose-600' : 'text-slate-400'
                }`}>
                  {pctUsed > 100 ? '⚠ Melebihi Pagu' : 'Dianggarkan'}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-lg font-bold ${pctUsed > 100 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {pctUsed.toFixed(1)}%
                  </span>
                  <span className="text-sm text-slate-500">{fmtCompact(totalAnggaran)}</span>
                </div>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${
                    pctUsed > 100 ? 'bg-rose-500' : pctUsed > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} style={{ width: `${Math.min(100, pctUsed)}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Banner: Total melebihi pagu (call-to-action) ── */}
        {!loading && pagu > 0 && totalAnggaran > pagu && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-rose-700 text-sm">
                Total anggaran melebihi pagu sebesar {formatRupiah(totalAnggaran - pagu)}
              </p>
              <p className="text-[11px] text-rose-600/80 mt-0.5">
                Kurangi item atau gunakan panel referensi penyesuaian di samping daftar item.
              </p>
            </div>
          </div>
        )}

        {/* ── Items Section ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rincian</div>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="font-bold text-slate-800">Daftar Item RKA</h2>
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{items.length} item</span>
                {groupMode === 'grup' && groupedItems.length > 1 && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Layers className="h-3 w-3" />{groupedItems.length} grup
                  </span>
                )}
                {groupMode === 'rekening' && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Layers className="h-3 w-3" />Hierarki Rekening
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />SSH · Standar Satuan Harga</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />SBU · Standar Biaya Umum</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />ASB · Analisis Standar Belanja</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />HSPK · Harga Satuan Pokok Kegiatan</span>
              </div>
              <button onClick={fetchItems} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw className="h-4 w-4" />
              </button>
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-xs font-semibold">
                <button onClick={() => setGroupMode('grup')}
                  className={`px-3 py-1.5 transition-colors ${groupMode === 'grup' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  Grup
                </button>
                <button onClick={() => setGroupMode('rekening')}
                  className={`px-3 py-1.5 transition-colors ${groupMode === 'rekening' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  Rekening
                </button>
              </div>
              {isSuperadmin && (
                <>
                  <button onClick={() => setPaketOpen(true)}
                    title="Tambah beberapa item sekaligus dari template paket (Sosialisasi, Pelatihan)"
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm">
                    <Package className="h-4 w-4" /> Tambah Paket
                  </button>
                  <button onClick={() => { setEditData(null); setModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                    <Plus className="h-4 w-4" /> Tambah Item
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-slate-500">Belum ada item RKA</p>
              <p className="text-sm mt-1">Tambahkan item belanja untuk sub-kegiatan ini</p>
              {isSuperadmin && (
                <button onClick={() => { setEditData(null); setModalOpen(true); }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
                  <Plus className="h-4 w-4" /> Tambah Item Pertama
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {groupMode === 'rekening' && rekeningTree ? (
                  [...rekeningTree.children.values()].map(node => (
                    <RekeningTreeNode
                      key={node.code}
                      node={node}
                      isSuperadmin={isSuperadmin}
                      onEdit={(item) => { setEditData(item); setModalOpen(true); }}
                      onDelete={(item) => setDeleteConfirm(item)}
                      itemIndexMap={itemGlobalIndex}
                    />
                  ))
                ) : (
                  groupedItems.map(({ name, items: gItems }) => {
                    const start = runningIdx;
                    runningIdx += gItems.length;
                    return (
                      <GroupSection
                        key={name}
                        groupName={name}
                        isRekening={false}
                        grupNames={[]}
                        items={gItems}
                        isSuperadmin={isSuperadmin}
                        startIdx={start}
                        onEdit={(item) => { setEditData(item); setModalOpen(true); }}
                        onDelete={(item) => setDeleteConfirm(item)}
                      />
                    );
                  })
                )}
              </div>

              {/* Total */}
              <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-5">
                <div className="flex items-end justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-indigo-400 inline-block" />
                    TOTAL ANGGARAN · Akumulasi {items.length} item
                    {groupMode === 'grup' && groupedItems.length > 1 && ` · ${groupedItems.length} grup`}
                    {groupMode === 'rekening' && rekeningTree && ` · ${rekeningTree.children.size} kelompok rekening`}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatRupiah(totalAnggaran)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">dari pagu {formatRupiah(pagu)}</p>
                  </div>
                </div>
                {pagu > 0 && totalAnggaran > pagu && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Total melebihi pagu sebesar {formatRupiah(totalAnggaran - pagu)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        {showSesuaikanSidebar && (
          <SesuaikanSidebar
            items={items}
            pagu={pagu}
            totalAnggaran={totalAnggaran}
            onOpenEditWithSuggestion={handleOpenEditWithSuggestion}
            onAutoAddFotocopy={handleAutoAddFotocopy}
            savingAuto={savingFotocopy}
          />
        )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 backdrop-blur-sm z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <div className="hidden sm:block">
            <div className="text-[9.5px] uppercase tracking-widest font-bold text-slate-400">Total Diajukan</div>
            <div className="text-sm font-bold text-slate-800">{formatRupiah(totalAnggaran)}</div>
          </div>
          <div className="hidden sm:block h-8 w-px bg-slate-200 shrink-0" />
          <div className="hidden sm:block">
            <div className="text-[9.5px] uppercase tracking-widest font-bold text-slate-400">Sisa Pagu</div>
            <div className={`text-sm font-bold ${sisa < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {sisa < 0 ? '↑ ' : ''}{formatRupiah(Math.abs(sisa))}
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => toast.success('Draft disimpan')}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
              Simpan Draft
            </button>
            <button onClick={() => toast('Fitur ajukan RKA segera hadir', { icon: '🚧' })}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
              <CheckCircle className="h-4 w-4" /> Ajukan RKA
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal Item ── */}
      <ItemModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null); }}
        onSave={handleSave}
        editData={editData}
        loading={saving}
        existingGroups={existingGroups}
      />

      {/* ── Modal Paket ── */}
      <PaketModal
        isOpen={paketOpen}
        onClose={() => setPaketOpen(false)}
        onSave={handlePaketSave}
        loading={saving}
        existingGroups={existingGroups}
      />

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Hapus Item RKA</h3>
                <p className="text-sm text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-1">Yakin ingin menghapus:</p>
            <p className="font-semibold text-slate-800 mb-6 leading-snug">{deleteConfirm.nama_item}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-colors">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemAnggaranPage;
