import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Send, Check, Package, Building2, Users, Calendar,
  Hash, Plus, X, AlertCircle, Loader2, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../api';
import PegawaiSelect from '../../../../components/pencairan/PegawaiSelect';
import SkReferensiSelect from '../../../../components/pencairan/SkReferensiSelect';
import { confirmDialog } from '../../../../utils/confirmDialog';

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition";

// Daftar dokumen yang akan terbentuk setelah finalisasi (urut sesuai generator Excel).
const DOKUMEN_LIST = [
  'Surat Pesanan', 'Faktur', 'Kwitansi', 'BA Pemeriksaan', 'Lamp Pemeriksaan',
  'BAST', 'Lampiran BAST', 'BASTHP', 'Bend 35', 'Bend 29',
];

// Peta field tanggal → dokumen tempat tanggal itu muncul (berdasarkan generateAtkExcel.js).
const TANGGAL_FIELDS = [
  { key: 'pesanan', label: 'Surat Pesanan', docs: ['Surat Pesanan', 'BA Pemeriksaan'] },
  { key: 'surat_perintah_tugas', label: 'Surat Perintah Tugas', docs: ['BA Pemeriksaan'] },
  { key: 'ba_pemeriksaan', label: 'BA Pemeriksaan', docs: ['BA Pemeriksaan', 'Lamp Pemeriksaan'] },
  { key: 'bast', label: 'BAST', docs: ['BAST', 'Lampiran BAST'] },
  { key: 'basthp', label: 'BASTHP', docs: ['BASTHP'] },
  { key: 'faktur', label: 'Faktur', docs: ['Faktur'] },
  { key: 'kwitansi', label: 'Kwitansi', docs: ['Kwitansi'] },
];

// Peta field nomor surat → dokumen tempat nomor itu muncul.
const NOMOR_FIELDS = [
  { key: 'pesanan_b', label: 'No. Surat Pesanan', docs: ['Surat Pesanan', 'BA Pemeriksaan', 'BAST'] },
  { key: 'faktur', label: 'No. Faktur', docs: ['Faktur'] },
  { key: 'kwitansi', label: 'No. Kwitansi', docs: ['Kwitansi'] },
  { key: 'ba_pemeriksaan', label: 'No. BA Pemeriksaan', docs: ['BA Pemeriksaan', 'Lamp Pemeriksaan', 'BAST'] },
  { key: 'bast', label: 'No. BAST', docs: ['BAST', 'Lampiran BAST'] },
  { key: 'basthp', label: 'No. BASTHP', docs: ['BASTHP'] },
  { key: 'surat_perintah_tugas', label: 'No. Surat Perintah Tugas PPK', docs: ['BA Pemeriksaan'] },
  { key: 'bappbj', label: 'No. BAPPBJ', docs: [] },
  { key: 'lampiran_bat', label: 'No. Lampiran BAT', docs: [] },
];

// SK dasar yang statis per tahun — dikelola sebagai referensi tersimpan (SkReferensiSelect).
const SK_FIELDS = [
  { key: 'sk_bupati_kpa', jenis: 'bupati_kpa', label: 'SK Bupati (KPA)', docs: ['BASTHP'] },
  { key: 'sk_kadis_ppk', jenis: 'kadis_ppk', label: 'SK Kepala Dinas (PPK)', docs: ['BAST', 'BASTHP'] },
];

const getPenyediaPath = (pathname) => {
  const match = pathname.match(/^(.*\/pencairan)\/atk(?:\/.*)?$/);
  return match ? `${match[1]}/penyedia` : '/sekretariat/pencairan/penyedia';
};

const todayInputValue = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const defaultTanggal = () => {
  const today = todayInputValue();
  return {
    pesanan: today,
    surat_perintah_tugas: today,
    faktur: today,
    kwitansi: today,
    ba_pemeriksaan: today,
    bast: today,
    basthp: today,
  };
};

// Priority order untuk dropdown pejabat. Lower = appears first.
const ROLE_ORDER = {
  kepala_dinas:    1,
  sekretaris_dinas: 2,
  kepala_bidang:   3,
  ketua_tim:       4,
  pegawai:         5,
  bendahara:       5, // same tier sebagai pegawai, dibedakan via bidang
  superadmin:      6,
};

// localStorage key untuk auto-load pilihan pejabat dari pencairan sebelumnya
const LS_PEJABAT_KEY = 'pencairan_pejabat_defaults_v1';
const EMPTY_PEJABAT = {
  ppk_id: '', kpa_id: '', pptk_id: '',
  bendahara_pengeluaran_id: '',
  pengurus_barang_id: '', atasan_pengurus_barang_id: '',
  penerima_faktur_id: '',
};

const StepBadge = ({ num, label, done, active }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-all ${
    done ? 'bg-emerald-100 text-emerald-700' :
    active ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-200' :
    'bg-gray-100 text-gray-500'
  }`}>
    {done ? <Check className="h-3.5 w-3.5" /> : (
      <span className="h-4 w-4 rounded-full bg-white/30 flex items-center justify-center text-[10px]">{num}</span>
    )}
    {label}
  </div>
);

const SectionCard = ({ icon: Icon, title, desc, children, color = 'teal', className = '', bodyClassName = '' }) => {
  const colors = {
    teal: 'from-teal-500 to-emerald-600 shadow-teal-200/50',
    blue: 'from-blue-500 to-indigo-600 shadow-blue-200/50',
    purple: 'from-purple-500 to-pink-600 shadow-purple-200/50',
    amber: 'from-amber-500 to-orange-600 shadow-amber-200/50',
  };
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm ${className}`}>
      <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3 shrink-0">
        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-[15px]">{title}</h3>
          {desc && <p className="text-[11.5px] text-gray-500 mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </div>
  );
};

const Field = ({ label, required, hint, children }) => (
  <div>
    <label className="text-[11.5px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
      {label}
      {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-[10.5px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

const PencairanAtkFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const penyediaPath = useMemo(() => getPenyediaPath(location.pathname), [location.pathname]);

  // Context from query (when navigated from Detail Sub Kegiatan)
  const masterIdFromQuery = searchParams.get('master_id');
  const tahunFromQuery = searchParams.get('tahun');

  // ─── Loading & Reference Data ─────────────────────────────────────────
  const [loadingRef, setLoadingRef] = useState(true);
  const [saving, setSaving] = useState(false);
  const [master, setMaster] = useState(null);  // anggaran_master with pagu_list
  const [selectedTahun, setSelectedTahun] = useState(null);
  const [penyediaList, setPenyediaList] = useState([]);
  const [pegawaiList, setPegawaiList] = useState([]); // [{ user_id, name, nip, jabatan }]

  // Pemakaian qty item RKA oleh pencairan lain (draft+final), untuk hitung sisa.
  // { [rka_item_id]: qtyTerpakaiOlehPencairanLain }
  const [rkaUsage, setRkaUsage] = useState({});

  // ─── Form States ───────────────────────────────────────────────────────
  const [selectedItems, setSelectedItems] = useState({}); // { rkaItemId: { qty, harga_satuan } }
  const [penyediaId, setPenyediaId] = useState('');
  const [pejabat, setPejabat] = useState(EMPTY_PEJABAT);
  const [pemeriksa, setPemeriksa] = useState(['', '', '']);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  const [defaultsAppliedAt, setDefaultsAppliedAt] = useState(null);
  const [tanggal, setTanggal] = useState(defaultTanggal);
  const [nomor, setNomor] = useState({
    pesanan_a: '', pesanan_b: '', faktur: '', kwitansi: '',
    ba_pemeriksaan: '', bast: '', basthp: '', bappbj: '',
    lampiran_bat: '', surat_perintah_tugas: '',
    sk_bupati_kpa: '', sk_kadis_ppk: '',
  });
  const [uraian, setUraian] = useState('');

  // ─── Fetch references ──────────────────────────────────────────────────
  const fetchRefs = useCallback(async () => {
    setLoadingRef(true);
    try {
      const [penyediaRes, pegawaiRes] = await Promise.all([
        api.get('/penyedia', { params: { active: 'true' } }),
        api.get('/pegawai', { params: { include_users: 'true' } }),
      ]);
      setPenyediaList(penyediaRes.data.data || []);

      // Map pegawai → users (one user per pegawai for dropdown)
      // Keep role + bidang_id for sorting later
      const peg = (pegawaiRes.data.data || []).flatMap(p => {
        if (!Array.isArray(p.users) || p.users.length === 0) return [];
        return p.users.map(u => ({
          user_id: u.id,
          name: u.name || p.nama_pegawai,
          nip: p.nip || '',
          jabatan: p.jabatan || '',
          role: u.role || '',
          bidang_id: p.id_bidang ? Number(p.id_bidang) : null,
        }));
      });
      setPegawaiList(peg);
    } catch (e) {
      toast.error('Gagal memuat data referensi: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoadingRef(false);
    }
  }, []);

  useEffect(() => { fetchRefs(); }, [fetchRefs]);

  // ─── Fetch master kegiatan (for new: from query, for edit: from pencairan record) ───
  const fetchMaster = useCallback(async (masterId) => {
    if (!masterId) return;
    try {
      const res = await api.get(`/anggaran/master/${masterId}`);
      if (res.data.success) {
        const m = res.data.data;
        setMaster(m);
        if (!selectedTahun && m.pagu_list?.length > 0) {
          const tahun = tahunFromQuery
            ? parseInt(tahunFromQuery)
            : [...m.pagu_list].sort((a, b) => b.tahun - a.tahun)[0].tahun;
          setSelectedTahun(tahun);
        }
      }
    } catch {
      toast.error('Gagal memuat data sub kegiatan');
    }
  }, [selectedTahun, tahunFromQuery]);

  // ─── On mount: load existing pencairan (edit) OR master from query (new) ─────
  useEffect(() => {
    if (isEdit) {
      // Edit mode — fetch existing pencairan
      (async () => {
        try {
          const res = await api.get(`/pencairan/${id}`);
          if (!res.data.success) return;
          const p = res.data.data;
          setUraian(p.uraian_kegiatan || '');
          setPenyediaId(p.penyedia_id ? String(p.penyedia_id) : '');
          setPejabat({
            ppk_id: p.ppk_id ? String(p.ppk_id) : '',
            kpa_id: p.kpa_id ? String(p.kpa_id) : '',
            pptk_id: p.pptk_id ? String(p.pptk_id) : '',
            bendahara_pengeluaran_id: p.bendahara_pengeluaran_id ? String(p.bendahara_pengeluaran_id) : '',
            pengurus_barang_id: p.pengurus_barang_id ? String(p.pengurus_barang_id) : '',
            atasan_pengurus_barang_id: p.atasan_pengurus_barang_id ? String(p.atasan_pengurus_barang_id) : '',
            penerima_faktur_id: p.penerima_faktur_id ? String(p.penerima_faktur_id) : '',
          });
          setPemeriksa([
            ...(p.pemeriksa || []).map(m => String(m.user_id)),
            '', '', '',
          ].slice(0, 3));
          const today = todayInputValue();
          const dateOnly = (v) => v ? String(v).slice(0, 10) : today;
          setTanggal({
            pesanan: dateOnly(p.tgl_pesanan),
            surat_perintah_tugas: dateOnly(p.tgl_surat_perintah_tugas),
            faktur: dateOnly(p.tgl_faktur),
            kwitansi: dateOnly(p.tgl_kwitansi),
            ba_pemeriksaan: dateOnly(p.tgl_ba_pemeriksaan),
            bast: dateOnly(p.tgl_bast),
            basthp: dateOnly(p.tgl_basthp),
          });
          setNomor({
            pesanan_a: p.no_pesanan_a || '',
            pesanan_b: p.no_pesanan_b || '',
            faktur: p.no_faktur || '',
            kwitansi: p.no_kwitansi || '',
            ba_pemeriksaan: p.no_ba_pemeriksaan || '',
            bast: p.no_bast || '',
            basthp: p.no_basthp || '',
            bappbj: p.no_bappbj || '',
            lampiran_bat: p.no_lampiran_bat || '',
            surat_perintah_tugas: p.no_surat_perintah_tugas || '',
            sk_bupati_kpa: p.no_sk_bupati_kpa || '',
            sk_kadis_ppk: p.no_sk_kadis_ppk || '',
          });
          // Items
          const itemsMap = {};
          (p.items || []).forEach(it => {
            if (it.rka_item_id) {
              itemsMap[it.rka_item_id] = {
                qty: Number(it.qty),
                harga_satuan: Number(it.harga_satuan),
              };
            }
          });
          setSelectedItems(itemsMap);
          setSelectedTahun(p.tahun_anggaran);
          fetchMaster(p.master_kegiatan_id);
        } catch {
          toast.error('Gagal memuat pencairan');
          navigate(-1);
        }
      })();
    } else if (masterIdFromQuery) {
      // New mode — context from URL
      fetchMaster(masterIdFromQuery);
      if (master?.nama_sub_kegiatan) {
        setUraian(master.nama_sub_kegiatan);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, masterIdFromQuery, isEdit]);

  // Set default uraian once master is loaded (for new mode)
  useEffect(() => {
    if (!isEdit && master?.nama_sub_kegiatan && !uraian) {
      setUraian(master.nama_sub_kegiatan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master]);

  // ─── Derived ───────────────────────────────────────────────────────────
  const paguSelected = useMemo(() => {
    if (!master?.pagu_list || !selectedTahun) return null;
    return master.pagu_list.find(p => p.tahun === selectedTahun) || null;
  }, [master, selectedTahun]);

  const itemsAvailable = useMemo(() => paguSelected?.rka_items || [], [paguSelected]);

  // Ambil pemakaian qty item RKA untuk pagu terpilih (kecualikan pencairan yang
  // sedang diedit agar qty-nya sendiri tidak menghitung dirinya).
  useEffect(() => {
    if (!paguSelected?.id) { setRkaUsage({}); return; }
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/pencairan/rka-usage', {
          params: { pagu_id: paguSelected.id, ...(isEdit && id ? { exclude: id } : {}) },
        });
        if (alive) setRkaUsage(res.data?.data || {});
      } catch {
        if (alive) setRkaUsage({});
      }
    })();
    return () => { alive = false; };
  }, [paguSelected?.id, isEdit, id]);

  // Sisa qty per item = volume − qty terpakai pencairan lain. >= 0.
  const sisaQtyOf = useCallback((item) => {
    const volume = Number(item.volume) || 0;
    const used = Number(rkaUsage[item.id]) || 0;
    return Math.max(0, volume - used);
  }, [rkaUsage]);

  const totalRealisasi = useMemo(() => {
    return Object.entries(selectedItems).reduce((sum, [, val]) => {
      return sum + ((val.qty || 0) * (val.harga_satuan || 0));
    }, 0);
  }, [selectedItems]);

  const sisaPagu = paguSelected ? (Number(paguSelected.pagu) - totalRealisasi) : 0;

  // ─── Sorted pegawai untuk dropdown ─────────────────────────────────────
  // Urutan: kepala_dinas → sekretaris_dinas → kepala_bidang → ketua_tim →
  //         pegawai relevan bidang ini → pegawai bidang lain.
  // Dalam tier yang sama, pegawai bidang relevan tampil dulu.
  const sortedPegawai = useMemo(() => {
    const bidangId = master?.bidang_id ? Number(master.bidang_id) : null;
    return [...pegawaiList].sort((a, b) => {
      const aRole = ROLE_ORDER[a.role] ?? 99;
      const bRole = ROLE_ORDER[b.role] ?? 99;
      if (aRole !== bRole) return aRole - bRole;
      if (bidangId) {
        const aMatch = a.bidang_id === bidangId ? 0 : 1;
        const bMatch = b.bidang_id === bidangId ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }
      return a.name.localeCompare(b.name);
    });
  }, [pegawaiList, master?.bidang_id]);

  // Pegawai dikelompokkan untuk PegawaiSelect dropdown
  const groupedPegawai = useMemo(() => {
    const bidangId = master?.bidang_id ? Number(master.bidang_id) : null;
    const bidangNama = master?.bidangs?.nama || 'Bidang Terkait';
    const pimpinan = [];
    const bidangThis = [];
    const bidangOther = [];
    sortedPegawai.forEach(u => {
      if (u.role === 'kepala_dinas' || u.role === 'sekretaris_dinas') {
        pimpinan.push(u);
      } else if (bidangId && u.bidang_id === bidangId) {
        bidangThis.push(u);
      } else {
        bidangOther.push(u);
      }
    });
    return { pimpinan, bidangThis, bidangOther, bidangNama };
  }, [sortedPegawai, master?.bidang_id, master?.bidangs?.nama]);

  // ─── Auto-load pejabat defaults dari localStorage (mode new) ───────────
  useEffect(() => {
    if (isEdit) return;                 // Edit mode: data dari DB, jangan override
    if (loadingRef) return;             // Tunggu pegawaiList siap
    if (defaultsLoaded) return;         // Hanya sekali
    if (pegawaiList.length === 0) return;

    try {
      const raw = localStorage.getItem(LS_PEJABAT_KEY);
      if (!raw) { setDefaultsLoaded(true); return; }
      const saved = JSON.parse(raw);

      // Validasi user_id masih ada di pegawaiList
      const validUid = (uid) => {
        if (!uid) return '';
        const found = pegawaiList.some(u => String(u.user_id) === String(uid));
        return found ? String(uid) : '';
      };

      // Apply pejabat (only empty fields)
      let appliedCount = 0;
      setPejabat(prev => {
        const next = { ...prev };
        Object.keys(EMPTY_PEJABAT).forEach(k => {
          if (!next[k] && saved.pejabat?.[k]) {
            const v = validUid(saved.pejabat[k]);
            if (v) { next[k] = v; appliedCount += 1; }
          }
        });
        return next;
      });

      // Apply pemeriksa
      if (Array.isArray(saved.pemeriksa)) {
        setPemeriksa(prev => {
          const next = [...prev];
          saved.pemeriksa.forEach((uid, idx) => {
            if (idx < 3 && !next[idx]) {
              const v = validUid(uid);
              if (v) { next[idx] = v; appliedCount += 1; }
            }
          });
          return next;
        });
      }

      if (appliedCount > 0) setDefaultsAppliedAt(saved.savedAt || new Date().toISOString());
      setDefaultsLoaded(true);
    } catch {
      setDefaultsLoaded(true);
    }
  }, [isEdit, loadingRef, pegawaiList, defaultsLoaded]);

  // ─── Persist pejabat ke localStorage setiap kali berubah ───────────────
  useEffect(() => {
    if (loadingRef) return;
    if (!defaultsLoaded && !isEdit) return; // Wait until initial load finishes
    const hasSelection = Object.values(pejabat).some(Boolean) || pemeriksa.some(Boolean);
    if (!hasSelection) return;
    try {
      localStorage.setItem(LS_PEJABAT_KEY, JSON.stringify({
        pejabat,
        pemeriksa,
        savedAt: new Date().toISOString(),
      }));
    } catch { /* ignore quota errors */ }
  }, [pejabat, pemeriksa, loadingRef, defaultsLoaded, isEdit]);

  const handleResetDefaults = async () => {
    const ok = await confirmDialog({
      title: 'Hapus pilihan pejabat tersimpan?',
      text: 'Form pejabat & tim pemeriksa akan dikosongkan.',
      icon: 'warning',
      confirmText: 'Ya, Hapus',
      confirmColor: '#dc2626',
    });
    if (!ok) return;
    try { localStorage.removeItem(LS_PEJABAT_KEY); } catch { /* noop */ }
    setPejabat(EMPTY_PEJABAT);
    setPemeriksa(['', '', '']);
    setDefaultsAppliedAt(null);
    toast.success('Pilihan pejabat default dihapus');
  };

  const openPenyediaPage = useCallback(() => {
    window.open(penyediaPath, '_blank', 'noopener,noreferrer');
  }, [penyediaPath]);

  const toggleItem = (item) => {
    const sisa = sisaQtyOf(item);
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        if (sisa <= 0) {
          toast.error(`${item.nama_item} sudah habis dicairkan (sisa 0 ${item.satuan})`);
          return prev;
        }
        // Default qty = sisa rencana (maksimal yang boleh), tidak melebihi.
        const defaultQty = Math.min(Number(item.volume) || 1, sisa);
        next[item.id] = { qty: defaultQty, harga_satuan: Number(item.harga_satuan) || 0 };
      }
      return next;
    });
  };

  const updateField = (itemId, key, value) => {
    setSelectedItems(prev => {
      let v = Math.max(0, Number(value) || 0);
      // Batasi qty agar tidak melebihi sisa rencana item ini.
      if (key === 'qty') {
        const item = itemsAvailable.find(i => String(i.id) === String(itemId));
        if (item) v = Math.min(v, sisaQtyOf(item));
      }
      return { ...prev, [itemId]: { ...prev[itemId], [key]: v } };
    });
  };

  const removeItem = (itemId) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const selectedCount = Object.keys(selectedItems).length;

  // ─── Submit ────────────────────────────────────────────────────────────
  const buildPayload = () => {
    if (!master || !paguSelected) {
      toast.error('Sub kegiatan / pagu belum dipilih');
      return null;
    }
    if (selectedCount === 0) {
      toast.error('Minimal 1 item harus dipilih');
      return null;
    }
    if (!penyediaId) {
      toast.error('Pilih penyedia terlebih dahulu');
      return null;
    }

    const items = Object.entries(selectedItems).map(([rkaId, val], idx) => {
      const rka = itemsAvailable.find(i => String(i.id) === String(rkaId));
      return {
        rka_item_id: parseInt(rkaId),
        nama_barang: rka?.nama_item || '—',
        kode_rekening: rka?.kode_rekening || null,
        qty: val.qty,
        satuan: rka?.satuan || '',
        harga_satuan: val.harga_satuan,
        ppn: 0,
        status_pemeriksaan: 'baik',
        urutan: idx + 1,
      };
    });

    const pemeriksaArr = pemeriksa.filter(Boolean).map(uid => ({ user_id: parseInt(uid) }));

    return {
      jenis_pencairan: 'atk',
      master_kegiatan_id: master.id,
      pagu_id: paguSelected.id,
      tahun_anggaran: paguSelected.tahun,
      bidang_id: master.bidang_id,
      uraian_kegiatan: uraian,
      penyedia_id: penyediaId ? parseInt(penyediaId) : null,
      ...Object.fromEntries(
        Object.entries(pejabat).map(([k, v]) => [k, v ? parseInt(v) : null])
      ),
      tgl_pesanan: tanggal.pesanan || null,
      tgl_surat_perintah_tugas: tanggal.surat_perintah_tugas || null,
      tgl_faktur: tanggal.faktur || null,
      tgl_kwitansi: tanggal.kwitansi || null,
      tgl_ba_pemeriksaan: tanggal.ba_pemeriksaan || null,
      tgl_bast: tanggal.bast || null,
      tgl_basthp: tanggal.basthp || null,
      no_pesanan_a: null, // digabung menjadi satu nomor pada no_pesanan_b
      no_pesanan_b: nomor.pesanan_b || null,
      no_faktur: nomor.faktur || null,
      no_kwitansi: nomor.kwitansi || null,
      no_ba_pemeriksaan: nomor.ba_pemeriksaan || null,
      no_bast: nomor.bast || null,
      no_basthp: nomor.basthp || null,
      no_bappbj: nomor.bappbj || null,
      no_lampiran_bat: nomor.lampiran_bat || null,
      no_surat_perintah_tugas: nomor.surat_perintah_tugas || null,
      no_sk_bupati_kpa: nomor.sk_bupati_kpa || null,
      no_sk_kadis_ppk: nomor.sk_kadis_ppk || null,
      items,
      pemeriksa: pemeriksaArr,
    };
  };

  const handleSubmit = async (finalize = false) => {
    const payload = buildPayload();
    if (!payload) return;
    if (finalize) {
      const ok = await confirmDialog({
        title: 'Finalisasi pencairan?',
        text: 'Setelah difinalisasi, data TIDAK bisa diubah atau dihapus lagi. Jika hanya ingin menyimpan sementara, gunakan "Simpan Draft".',
        icon: 'warning',
        confirmText: 'Ya, Finalisasi',
        confirmColor: '#059669',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      let savedId;
      if (isEdit) {
        await api.put(`/pencairan/${id}`, payload);
        savedId = id;
      } else {
        const res = await api.post('/pencairan', payload);
        savedId = res.data.data.id;
      }
      if (finalize) {
        await api.post(`/pencairan/${savedId}/finalize`);
        toast.success('Pencairan berhasil difinalisasi');
      } else {
        toast.success(isEdit ? 'Draft berhasil diperbarui' : 'Draft berhasil disimpan');
      }
      // Navigate to detail page (relative path differs for new vs edit)
      // new: /atk/new → ../{id}   ; edit: /atk/{id}/edit → ..
      if (isEdit) {
        navigate('..', { relative: 'path' });
      } else {
        navigate(`../${savedId}`, { relative: 'path' });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan pencairan');
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading state ─────────────────────────────────────────────────────
  if (loadingRef) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!master) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Sub kegiatan tidak ditemukan</p>
          <p className="text-[12px] text-gray-500 mb-4">
            Pencairan harus dimulai dari halaman detail sub kegiatan
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-teal-700 hover:underline"
          >
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-white to-emerald-50/30">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="w-full px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition shrink-0">
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {isEdit ? 'Edit Pencairan ATK' : 'Buat Pencairan ATK'}
                </h1>
                <p className="text-[11px] text-gray-500 truncate">
                  {master.kode_sub_kegiatan} — {master.nama_sub_kegiatan}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-medium hover:border-gray-300 transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Simpan Draft
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={saving || selectedCount === 0 || !penyediaId}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg text-[13px] font-semibold shadow-md shadow-teal-200/50 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Finalisasi
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            <StepBadge num={1} label="Pilih Items" done={selectedCount > 0} active={selectedCount === 0} />
            <div className="h-px bg-gray-200 flex-1 min-w-[8px]"></div>
            <StepBadge num={2} label="Penyedia" done={!!penyediaId} active={selectedCount > 0 && !penyediaId} />
            <div className="h-px bg-gray-200 flex-1 min-w-[8px]"></div>
            <StepBadge num={3} label="Pejabat" done={!!pejabat.ppk_id} active={false} />
            <div className="h-px bg-gray-200 flex-1 min-w-[8px]"></div>
            <StepBadge num={4} label="Tanggal & Nomor" done={Object.values(tanggal).some(Boolean) || Object.values(nomor).some(Boolean)} active={false} />
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 py-6">
        <div className="lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
        {/* ─── KOLOM KIRI (lg): kotak Pilih Item, tinggi 1 layar & scroll sendiri ─── */}
        <div className="mb-5 lg:mb-0 lg:sticky lg:top-[124px] lg:h-[calc(100vh-140px)]">
        {/* STEP 1: ITEMS */}
        <SectionCard
          icon={Package}
          title="1. Pilih Item Realisasi"
          desc="Centang barang yang akan direalisasikan beserta jumlah dan harga"
          color="teal"
          className="lg:h-full lg:flex lg:flex-col"
          bodyClassName="lg:flex-1 lg:overflow-y-auto lg:min-h-0"
        >
          {paguSelected && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-[10px] uppercase font-semibold text-blue-700">Pagu {selectedTahun}</p>
                <p className="text-sm font-bold text-blue-900 mt-0.5">{formatRupiah(Number(paguSelected.pagu))}</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                <p className="text-[10px] uppercase font-semibold text-amber-700">Realisasi Sekarang</p>
                <p className="text-sm font-bold text-amber-900 mt-0.5">{formatRupiah(totalRealisasi)}</p>
              </div>
              <div className={`rounded-lg border p-3 ${sisaPagu >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-200'}`}>
                <p className={`text-[10px] uppercase font-semibold ${sisaPagu >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Sisa Pagu</p>
                <p className={`text-sm font-bold mt-0.5 ${sisaPagu >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>{formatRupiah(sisaPagu)}</p>
              </div>
            </div>
          )}

          {selectedCount > 0 && (
            <div className="mb-5">
              <p className="text-[11.5px] font-semibold text-gray-700 mb-2">
                Detail Realisasi ({selectedCount} item terpilih)
              </p>
              <div className="border border-teal-200 bg-teal-50/30 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-teal-100/60 text-[10.5px] uppercase tracking-wide text-teal-800 font-semibold">
                    <tr>
                      <th className="px-3 py-2 text-left">No</th>
                      <th className="px-3 py-2 text-left">Barang</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-left">Satuan</th>
                      <th className="px-3 py-2 text-right">Harga Satuan</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-teal-100">
                    {Object.entries(selectedItems).map(([rkaId, val], idx) => {
                      const item = itemsAvailable.find(i => String(i.id) === String(rkaId));
                      if (!item) return null;
                      return (
                        <tr key={rkaId} className="bg-white">
                          <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 text-gray-800">{item.nama_item}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="0" step="0.01" max={sisaQtyOf(item)}
                              value={val.qty}
                              onChange={e => updateField(rkaId, 'qty', e.target.value)}
                              className="w-20 px-2 py-1 text-sm text-center rounded-md border border-gray-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-200 outline-none"
                            />
                            <p className="text-[9.5px] text-gray-400 mt-0.5 text-center">maks {sisaQtyOf(item)}</p>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{item.satuan}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="0"
                              value={val.harga_satuan}
                              onChange={e => updateField(rkaId, 'harga_satuan', e.target.value)}
                              className="w-28 px-2 py-1 text-sm text-right rounded-md border border-gray-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-200 outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                            {formatRupiah(val.qty * val.harga_satuan)}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeItem(rkaId)}
                              className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-teal-100/60">
                      <td colSpan="5" className="px-3 py-2.5 text-right text-[12px] font-bold text-teal-900 uppercase">Total Realisasi</td>
                      <td className="px-3 py-2.5 text-right font-bold text-lg text-teal-900">{formatRupiah(totalRealisasi)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-[11.5px] font-semibold text-gray-700 mb-2">
            Item Tersedia di Sub Kegiatan ini ({itemsAvailable.length})
          </p>
          {itemsAvailable.length === 0 ? (
            <div className="border border-gray-200 rounded-xl p-6 text-center">
              <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-[13px] text-gray-500">Belum ada item RKA untuk tahun {selectedTahun}</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-[65vh] lg:max-h-none overflow-y-auto">
              {itemsAvailable.map(item => {
                const isSelected = !!selectedItems[item.id];
                const sisa = sisaQtyOf(item);
                const habis = sisa <= 0 && !isSelected;
                return (
                  <div
                    key={item.id}
                    onClick={() => { if (!habis) toggleItem(item); }}
                    className={`px-4 py-3 flex items-center gap-3 transition ${
                      habis ? 'opacity-60 cursor-not-allowed bg-gray-50/60' : 'cursor-pointer'
                    } ${isSelected ? 'bg-teal-50' : !habis ? 'hover:bg-gray-50' : ''}`}
                  >
                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                      isSelected ? 'bg-teal-600 border-teal-600' : habis ? 'border-gray-200 bg-gray-100' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{item.nama_item}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {Number(item.volume)} {item.satuan} × {formatRupiah(Number(item.harga_satuan))}
                      </p>
                      <p className={`text-[10.5px] mt-0.5 font-semibold ${
                        habis ? 'text-rose-600' : sisa < Number(item.volume) ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {habis
                          ? `Habis dicairkan (sisa 0 ${item.satuan})`
                          : `Sisa ${sisa} dari ${Number(item.volume)} ${item.satuan}`}
                      </p>
                    </div>
                    <span className="text-[11.5px] font-bold text-emerald-700">
                      {formatRupiah(Number(item.volume) * Number(item.harga_satuan))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Uraian kegiatan */}
          <div className="mt-5">
            <Field label="Uraian Kegiatan" hint="Akan muncul di dokumen Pesanan, Faktur, Kwitansi, dst.">
              <textarea
                value={uraian}
                onChange={e => setUraian(e.target.value)}
                rows="2"
                className={inputCls + ' resize-none'}
                placeholder="Belanja Alat/Bahan untuk Kegiatan Kantor - Alat Tulis Kantor …"
              />
            </Field>
          </div>
        </SectionCard>
        </div>
        {/* ─── KOLOM KANAN (lg): Penyedia, Pejabat, Tanggal & Nomor, ringkasan ─── */}
        <div className="space-y-5">
        {/* STEP 2: PENYEDIA */}
        <SectionCard
          icon={Building2}
          title="2. Penyedia / Pihak Ketiga"
          desc="Pilih perusahaan rekanan yang menyediakan barang"
          color="blue"
        >
          {penyediaList.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
              <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">Belum ada master penyedia</p>
              <button
                onClick={openPenyediaPage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Buat Penyedia
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label="Penyedia" required>
                    <select value={penyediaId} onChange={e => setPenyediaId(e.target.value)} className={inputCls}>
                      <option value="">— Pilih Penyedia —</option>
                      {penyediaList.map(p => (
                        <option key={p.id} value={p.id}>{p.nama}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <button
                  onClick={openPenyediaPage}
                  className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-medium hover:border-blue-300 hover:text-blue-700 transition flex items-center gap-1.5"
                  title="Buka master penyedia di tab baru"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Kelola
                </button>
              </div>

              {(() => {
                const selectedPenyedia = penyediaList.find(p => String(p.id) === String(penyediaId));
                if (!selectedPenyedia) return null;
                return (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-blue-700">Alamat</p>
                      <p className="text-[12.5px] text-blue-900 mt-0.5">{selectedPenyedia.alamat || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-blue-700">Direktur</p>
                      <p className="text-[12.5px] text-blue-900 mt-0.5 font-semibold">{selectedPenyedia.nama_direktur || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-blue-700">No Rekening</p>
                      <p className="text-[12.5px] text-blue-900 mt-0.5 font-mono">{selectedPenyedia.no_rekening || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-blue-700">Bank</p>
                      <p className="text-[12.5px] text-blue-900 mt-0.5">{selectedPenyedia.nama_bank || '—'}</p>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </SectionCard>

        {/* STEP 3: PEJABAT */}
        <SectionCard
          icon={Users}
          title="3. Pejabat & Tim"
          desc="Pilih pejabat yang akan tertera di dokumen-dokumen"
          color="purple"
        >
          {defaultsAppliedAt && !isEdit && (
            <div className="mb-4 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-1.5 text-purple-700 min-w-0">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <p className="text-[11.5px] truncate">
                  Pilihan pejabat dimuat dari pencairan sebelumnya{' '}
                  <span className="text-[10px] text-purple-500">
                    · disimpan {new Date(defaultsAppliedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold whitespace-nowrap shrink-0"
              >
                Reset
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'ppk_id', label: 'Pejabat Pembuat Komitmen (PPK)', req: true, hint: 'Tertera di Pesanan, BAST, BASTHP' },
              { key: 'kpa_id', label: 'Kuasa Pengguna Anggaran (KPA)', req: true, hint: 'Tertera di Kwitansi, BAPPBJ' },
              { key: 'pptk_id', label: 'Pejabat Pelaksana Teknis Kegiatan (PPTK)', req: true, hint: 'Tertera di Faktur, Kwitansi, BASTHP' },
              { key: 'bendahara_pengeluaran_id', label: 'Bendahara Pengeluaran Pembantu', req: true, hint: 'Tertera di Kwitansi' },
              { key: 'pengurus_barang_id', label: 'Pengurus Barang', req: true, hint: 'Tertera di BASTHP, Bend 29' },
              { key: 'atasan_pengurus_barang_id', label: 'Atasan Pengurus Barang', req: true, hint: 'Tertera di Bend 35' },
              { key: 'penerima_faktur_id', label: 'Penerima Faktur', req: false, hint: 'Tertera di Faktur' },
            ].map(f => (
              <Field key={f.key} label={f.label} required={f.req} hint={f.hint}>
                <PegawaiSelect
                  value={pejabat[f.key]}
                  onChange={v => setPejabat(p => ({ ...p, [f.key]: v }))}
                  groups={groupedPegawai}
                />
              </Field>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="mb-2">
              <p className="text-[13px] font-semibold text-gray-800">Tim Pemeriksa Hasil Pekerjaan</p>
              <p className="text-[11px] text-gray-500">3 orang (1 ketua + 2 anggota) — tertera di BA Pemeriksaan, Lamp Pemeriksaan, BASTHP, Peng.3</p>
            </div>
            <div className="space-y-2">
              {pemeriksa.map((uid, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded shrink-0 w-20 text-center">
                    {idx === 0 ? 'KETUA' : `ANGGOTA ${idx}`}
                  </span>
                  <PegawaiSelect
                    value={uid}
                    onChange={v => {
                      const next = [...pemeriksa];
                      next[idx] = v;
                      setPemeriksa(next);
                    }}
                    groups={groupedPegawai}
                    showNip
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* STEP 4: TANGGAL & NOMOR */}
        <SectionCard
          icon={Calendar}
          title="4. Tanggal & Nomor Surat"
          desc="Tanggal otomatis hari ini dan bisa disesuaikan sebelum finalisasi"
          color="amber"
        >
          {/* Daftar dokumen yang akan terbentuk */}
          <div className="mb-5 rounded-xl bg-amber-50/60 border border-amber-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-[12px] font-semibold text-amber-800">
                {DOKUMEN_LIST.length} dokumen yang akan terbentuk setelah finalisasi
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DOKUMEN_LIST.map((doc, i) => (
                <span
                  key={doc}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-amber-200 text-[11px] font-medium text-amber-900"
                >
                  <span className="text-[9.5px] font-bold text-amber-500">{i + 1}</span>
                  {doc}
                </span>
              ))}
            </div>
            <p className="text-[10.5px] text-amber-700/80 mt-2">
              Isian tanggal & nomor di bawah menandai muncul di dokumen mana saja.
            </p>
          </div>

          <div className="mb-5">
            <p className="text-[12px] font-semibold text-gray-700 mb-2.5">Tanggal Dokumen</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TANGGAL_FIELDS.map(({ key, label, docs }) => (
                <Field
                  key={key}
                  label={label}
                  hint={docs.length ? `Muncul di: ${docs.join(', ')}` : 'Belum dipakai di dokumen'}
                >
                  <input
                    type="date"
                    value={tanggal[key]}
                    onChange={e => setTanggal(t => ({ ...t, [key]: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              ))}
            </div>
          </div>

          <div className="pt-5 border-t border-gray-100">
            <p className="text-[12px] font-semibold text-gray-700 mb-2.5">Nomor Surat</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NOMOR_FIELDS.map(({ key, label, docs }) => (
                <Field
                  key={key}
                  label={label}
                  hint={docs.length ? `Muncul di: ${docs.join(', ')}` : 'Belum dipakai di dokumen'}
                >
                  <input
                    value={nomor[key]}
                    onChange={e => setNomor(n => ({ ...n, [key]: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              ))}
            </div>
          </div>

          {/* SK dasar (statis per tahun, dipilih dari referensi tersimpan) */}
          <div className="pt-5 border-t border-gray-100">
            <div className="mb-2.5">
              <p className="text-[12px] font-semibold text-gray-700">SK Dasar (per tahun)</p>
              <p className="text-[10.5px] text-gray-400">
                SK ini umumnya sama sepanjang tahun. Pilih dari daftar tersimpan, atau tambah bila belum ada.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SK_FIELDS.map(({ key, jenis, label, docs }) => (
                <Field
                  key={key}
                  label={label}
                  hint={docs.length ? `Muncul di: ${docs.join(', ')}` : 'Belum dipakai di dokumen'}
                >
                  <SkReferensiSelect
                    jenis={jenis}
                    value={nomor[key]}
                    onChange={v => setNomor(n => ({ ...n, [key]: v }))}
                    tahun={selectedTahun}
                  />
                </Field>
              ))}
            </div>
          </div>
        </SectionCard>

        <div className="bg-gradient-to-r from-teal-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-teal-200/30">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5" />
              <div>
                <p className="text-[13px] font-semibold">Setelah finalisasi, generate dokumen PDF tersedia di halaman detail</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  10 dokumen: Pesanan • Faktur • Kwitansi • BA Pemeriksaan • Lamp Pemeriksaan • BAST • Lampiran BAST • BASTHP • Bend 35 • Bend 29
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] opacity-80">Total Nilai</p>
              <p className="text-2xl font-bold">{formatRupiah(totalRealisasi)}</p>
            </div>
          </div>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default PencairanAtkFormPage;
