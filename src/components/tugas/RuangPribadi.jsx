import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Bell, BellRing, CalendarPlus, Check, CheckCheck, ChevronDown, FileText, LoaderCircle, NotebookPen, Pencil, Pin, Plus, Search, Trash2, X } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion, useMotionValue, useTransform } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../api';
import confirmDialog from '../../utils/confirmDialog';

// tanggal hari ini menurut WIB, format YYYY-MM-DD (sama dengan format tanggal_pengingat)
const hariIni = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const geserHari = (iso, n) => { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const selisihHari = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5);
const seninDepan = (iso) => geserHari(iso, (8 - new Date(`${iso}T00:00:00Z`).getUTCDay()) % 7 || 7);
const normalisasi = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// chip tanggal satu baris: lewat (merah), hari ini, besok, atau tanggal pendek
const infoTanggal = (tgl) => {
  const h = hariIni();
  const d = selisihHari(h, tgl);
  if (d > 0) return { kelas: 'bg-red-50 text-red-600', teks: d === 1 ? 'Lewat kemarin' : `Lewat ${d} hari`, lewat: true };
  if (d === 0) return { kelas: 'bg-purple-50 text-purple-700', teks: 'Hari ini' };
  if (d === -1) return { kelas: 'bg-slate-100 text-slate-600', teks: 'Besok' };
  const beda = tgl.slice(0, 4) !== h.slice(0, 4);
  return { kelas: 'bg-slate-100 text-slate-600', bel: true, teks: new Date(`${tgl}T00:00:00Z`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', ...(beda && { year: 'numeric' }), timeZone: 'UTC' }) };
};
const urutTugas = (a, b) => (a.tanggal_pengingat || '9999').localeCompare(b.tanggal_pengingat || '9999') || b.created_at.localeCompare(a.created_at);
const urutCatatan = (a, b) => Number(b.disematkan) - Number(a.disematkan) || b.updated_at.localeCompare(a.updated_at);
const kode = (n) => JSON.stringify({ judul: (n.judul ?? '').trim(), isi: n.isi ?? '' });

const kelasInput = 'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20';
const kelasTombolGhost = 'inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-purple-600 hover:bg-purple-50';
const kelasTombolLuar = 'inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60';
const kelasIkonHover = 'sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100';

function Dialog({ terbuka, onTutup, judul, deskripsi, lebar = 'max-w-md', children }) {
  useEffect(() => {
    if (!terbuka) return undefined;
    const tekan = (e) => { if (e.key === 'Escape') onTutup(); };
    document.addEventListener('keydown', tekan);
    return () => document.removeEventListener('keydown', tekan);
  }, [terbuka, onTutup]);
  return (
    <AnimatePresence>
      {terbuka && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onTutup(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={judul}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`relative w-full ${lebar} max-h-[90svh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl`}
          >
            <button type="button" onClick={onTutup} aria-label="Tutup" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
            <h2 className="pr-8 text-lg font-semibold text-slate-900">{judul}</h2>
            {deskripsi && <p className="mt-1 text-sm text-slate-500">{deskripsi}</p>}
            <div className="mt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// kotak centang animasi: lingkaran terisi ungu + tanda centang yang "digambar"
function Centang({ aktif, label, onKlik }) {
  return (
    <motion.button type="button" onClick={onKlik} aria-label={label} whileTap={{ scale: 0.8 }} className="flex h-11 w-11 shrink-0 items-center justify-center">
      <motion.span
        initial={false}
        animate={{ backgroundColor: aktif ? '#9333ea' : '#ffffff', borderColor: aktif ? '#9333ea' : '#cbd5e1' }}
        className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <motion.path d="M5 12l4 4L19 7" initial={false} animate={{ pathLength: aktif ? 1 : 0, opacity: aktif ? 1 : 0 }} transition={{ duration: 0.25 }} />
        </svg>
      </motion.span>
    </motion.button>
  );
}

// ---------- Editor catatan (autosave + penanganan bentrok versi) ----------
function EditorCatatan({ catatan, muatUlang, onTersimpan, tutup, permintaanTutup }) {
  const [judul, setJudul] = useState(catatan?.judul ?? '');
  const [isi, setIsi] = useState(catatan?.isi ?? '');
  const [status, setStatus] = useState('siap'); // siap | menyimpan | tersimpan | gagal | konflik
  const idRef = useRef(catatan?.id ?? null);
  const versiRef = useRef(catatan?.versi ?? 0);
  const tersimpanRef = useRef(kode(catatan ?? { judul: '', isi: '' }));
  const antreanRef = useRef(null);
  const menulisRef = useRef(false);
  const konflikRef = useRef(false);
  const gagalRef = useRef(null);

  const simpanDraf = useCallback(async (nilaiAsli, ulangi = false) => {
    const nilai = { judul: (nilaiAsli.judul ?? '').trim(), isi: nilaiAsli.isi ?? '' };
    if (konflikRef.current) return;
    if (!idRef.current && !nilai.judul && !nilai.isi.trim()) return; // catatan kosong tidak dibuat
    if (kode(nilai) === tersimpanRef.current) { if (!menulisRef.current) setStatus('tersimpan'); return; }
    if (menulisRef.current) { antreanRef.current = nilai; return; } // sedang menyimpan: antre
    if (!ulangi && gagalRef.current === kode(nilai)) return;
    gagalRef.current = null;
    menulisRef.current = true;
    let berikutnya = nilai;
    try {
      while (berikutnya) {
        antreanRef.current = null;
        setStatus('menyimpan');
        const res = idRef.current
          ? await api.patch(`/catatan-pribadi/${idRef.current}`, { ...berikutnya, versi: versiRef.current })
          : await api.post('/catatan-pribadi', berikutnya);
        const data = res.data.data;
        idRef.current = data.id;
        versiRef.current = data.versi;
        tersimpanRef.current = kode(berikutnya);
        onTersimpan(data); // parent mengganti/menyisipkan catatan di daftar
        setStatus('tersimpan');
        const antrean = antreanRef.current;
        berikutnya = antrean && kode(antrean) !== tersimpanRef.current ? antrean : null;
      }
    } catch (err) {
      antreanRef.current = null;
      if (err?.response?.data?.code === 'CATATAN_KEDALUWARSA') { konflikRef.current = true; setStatus('konflik'); return; }
      gagalRef.current = kode(nilai);
      setStatus('gagal');
    } finally {
      menulisRef.current = false;
    }
  }, [onTersimpan]);

  // autosave 900 ms setelah berhenti mengetik
  useEffect(() => {
    const t = setTimeout(() => { simpanDraf({ judul, isi }); }, 900);
    return () => clearTimeout(t);
  }, [judul, isi, simpanDraf]);

  const simpanDanTutup = useCallback(async () => {
    if (konflikRef.current) throw new Error('konflik');
    const nilai = { judul: judul.trim(), isi };
    if (!idRef.current && !nilai.judul && !nilai.isi.trim()) { tutup(); toast.success('Catatan kosong tidak disimpan'); return; }
    await simpanDraf(nilai, true);
    let giliran = 0;
    while (menulisRef.current && giliran < 80) { await new Promise((r) => setTimeout(r, 50)); giliran += 1; }
    if (konflikRef.current || menulisRef.current || kode(nilai) !== tersimpanRef.current) throw new Error('belum tersimpan');
    tutup();
    toast.success('Catatan tersimpan');
  }, [judul, isi, simpanDraf, tutup]);

  const galatTutup = () => toast.error('Catatan belum dapat ditutup karena belum tersimpan. Periksa pesan di bawah form.');

  // permintaan tutup dari parent (X/Escape/overlay) selalu lewat simpanDanTutup
  useEffect(() => {
    if (permintaanTutup === 0) return;
    simpanDanTutup().catch(galatTutup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permintaanTutup]);

  const atasiKonflik = async (strategi) => {
    if (status !== 'konflik') return;
    setStatus('menyimpan');
    let terbaru;
    try {
      terbaru = (await muatUlang()).find((c) => c.id === idRef.current);
    } catch {
      setStatus('konflik');
      return;
    }
    if (!terbaru) {
      if (strategi === 'muat') {
        konflikRef.current = false;
        tutup();
        toast.error('Catatan sudah dihapus di perangkat lain.');
        return;
      }
      idRef.current = null;
      versiRef.current = 0;
      tersimpanRef.current = kode({ judul: '', isi: '' });
      konflikRef.current = false;
      setStatus('siap');
      simpanDraf({ judul, isi }, true);
      return;
    }
    idRef.current = terbaru.id;
    versiRef.current = terbaru.versi;
    tersimpanRef.current = kode(terbaru);
    konflikRef.current = false;
    if (strategi === 'muat') {
      setJudul(terbaru.judul ?? '');
      setIsi(terbaru.isi ?? '');
      setStatus('tersimpan');
    } else {
      setStatus('siap');
      simpanDraf({ judul, isi }, true);
    }
  };

  const teksStatus = { menyimpan: 'Menyimpan…', tersimpan: 'Tersimpan otomatis', gagal: 'Belum tersimpan', konflik: 'Perlu menyelaraskan versi', siap: 'Tersimpan setelah Anda berhenti mengetik' }[status];
  const ikonStatus = status === 'menyimpan' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : status === 'tersimpan' ? <Check className="h-3.5 w-3.5" /> : <NotebookPen className="h-3.5 w-3.5" />;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Judul (opsional)
        <input type="text" autoFocus maxLength={120} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Misalnya, catatan rapat" className={`${kelasInput} mt-1 font-normal`} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Isi catatan
        <textarea rows={8} maxLength={20000} value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="Mulai menulis…" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
        <span className="block text-right text-xs font-normal text-slate-400">{isi.length}/20.000</span>
      </label>
      <div className="space-y-2" aria-live={status === 'konflik' || status === 'gagal' ? 'assertive' : 'polite'}>
        <p role="status" className={`flex min-h-5 items-center gap-1.5 text-xs ${status === 'gagal' ? 'font-medium text-red-600' : status === 'konflik' ? 'font-medium text-amber-800' : 'text-slate-500'}`}>{ikonStatus}{teksStatus}</p>
        {status === 'gagal' && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs">
            <span className="text-slate-600">Teks Anda masih tersimpan di editor. Coba lagi saat siap.</span>
            <button type="button" className={kelasTombolLuar} onClick={() => simpanDraf({ judul, isi }, true)}>Coba simpan</button>
          </div>
        )}
        {status === 'konflik' && (
          <div role="alert" className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed">
            <p>Versi catatan di server berubah. Draf yang sedang Anda tulis tetap di editor.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={kelasTombolLuar} onClick={() => atasiKonflik('muat')}>Gunakan versi server</button>
              <button type="button" className={`${kelasTombolLuar} border-amber-400 text-amber-900 hover:bg-amber-100`} onClick={() => atasiKonflik('draf')}>Timpa server dengan draf saya</button>
            </div>
            <p className="text-slate-500">“Gunakan versi server” akan mengganti teks yang sedang Anda tulis. Pilih tombol lainnya untuk mempertahankan draf dan menyimpannya di atas versi server.</p>
          </div>
        )}
      </div>
      <button
        type="button"
        disabled={status === 'menyimpan' || status === 'konflik'}
        onClick={() => simpanDanTutup().catch(galatTutup)}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
      >
        {status === 'menyimpan' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Simpan & tutup
      </button>
    </div>
  );
}

// ---------- Baris tugas aktif: geser kanan = selesai, geser kiri = hapus ----------
const BarisTugas = forwardRef(function BarisTugas({ t, sedangSelesai, onCentang, onUbah, onHapus }, ref) {
  const x = useMotionValue(0);
  const opKanan = useTransform(x, [0, 96], [0, 1]);
  const opKiri = useTransform(x, [-96, 0], [1, 0]);
  const menggeser = useRef(false); // cegah ketukan terpicu setelah menggeser
  const info = t.tanggal_pengingat ? infoTanggal(t.tanggal_pengingat) : null;
  return (
    <motion.li ref={ref} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 48, scale: 0.95, transition: { duration: 0.25 } }} className="relative min-w-0 rounded-xl">
      <motion.div aria-hidden="true" style={{ opacity: opKanan }} className="absolute inset-0 flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white"><Check className="h-4 w-4" /> Selesai</motion.div>
      <motion.div aria-hidden="true" style={{ opacity: opKiri }} className="absolute inset-0 flex items-center justify-end gap-1.5 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white">Hapus <Trash2 className="h-4 w-4" /></motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        style={{ x }}
        onDragStart={() => { menggeser.current = true; }}
        onDragEnd={(_, i) => {
          if (i.offset.x > 96) onCentang(); else if (i.offset.x < -96) onHapus();
          setTimeout(() => { menggeser.current = false; }, 80);
        }}
        className="group relative flex items-start gap-1 rounded-xl border border-transparent bg-white px-1 transition-colors hover:border-slate-200 hover:shadow-sm"
      >
        <Centang aktif={sedangSelesai} label={`Tandai selesai: ${t.judul}`} onKlik={onCentang} />
        <button type="button" className="min-w-0 flex-1 py-2.5 text-left" onClick={() => { if (!menggeser.current) onUbah(); }}>
          <span className="line-clamp-2 break-words text-sm font-medium text-slate-900">{t.judul}</span>
          {info && (
            <span className={`mt-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${info.kelas}`}>
              {info.lewat && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" aria-hidden="true" />}
              {info.bel && <Bell className="h-3 w-3" aria-hidden="true" />}
              {info.teks}
            </span>
          )}
        </button>
        <button type="button" aria-label={`Ubah tugas: ${t.judul}`} onClick={onUbah} className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-purple-600 sm:flex ${kelasIkonHover}`}>
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" aria-label={`Hapus tugas: ${t.judul}`} onClick={onHapus} className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 sm:flex ${kelasIkonHover}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </motion.div>
    </motion.li>
  );
});

// ---------- Form tugas ----------
function FormTugas({ tugas, onSelesai, onBatal, onHapus }) {
  const [judul, setJudul] = useState(tugas?.judul ?? '');
  const [tanggal, setTanggal] = useState(tugas?.tanggal_pengingat ?? '');
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);

  const kirim = async (e) => {
    e.preventDefault();
    const j = judul.trim();
    if (!j) { setGalat('Nama tugas wajib diisi'); return; }
    setProses(true);
    try {
      const badan = { judul: j, tanggal_pengingat: tanggal || null }; // tanggal dikosongkan saat ubah → null
      const res = tugas ? await api.patch(`/tugas-pribadi/${tugas.id}`, badan) : await api.post('/tugas-pribadi', badan);
      toast.success(tugas ? 'Tugas diperbarui' : 'Tugas ditambahkan');
      onSelesai(res.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Tugas belum tersimpan. Coba lagi.');
      setProses(false);
    }
  };

  return (
    <form onSubmit={kirim} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Yang perlu dikerjakan
        <input type="text" autoFocus maxLength={160} value={judul} onChange={(e) => { setJudul(e.target.value); setGalat(''); }} placeholder="Contoh: Siapkan bahan rapat" className={`${kelasInput} mt-1 font-normal`} />
        {galat && <span className="mt-1 block text-xs font-normal text-red-600">{galat}</span>}
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Mulai diingatkan (opsional)
        <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={`${kelasInput} mt-1 font-normal text-slate-600`} />
        <span className="mt-1 block text-xs font-normal text-slate-500">Kosongkan agar diingatkan mulai sekarang. Pengingat berulang sampai tugas dicentang selesai.</span>
      </label>
      <div className="flex items-center justify-end gap-2 pt-2">
        {tugas && <button type="button" disabled={proses} onClick={onHapus} className="mr-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-4 w-4" /> Hapus tugas</button>}
        <button type="button" disabled={proses} onClick={onBatal} className={kelasTombolLuar}>Batal</button>
        <button type="submit" disabled={proses} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60">
          {proses && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {tugas ? 'Simpan tugas' : 'Tambah tugas'}
        </button>
      </div>
    </form>
  );
}

const RuangPribadi = ({ halaman = false, onData }) => {
  const [tugas, setTugas] = useState(null); // null = memuat
  const [catatan, setCatatan] = useState(null); // null = memuat
  const [gagal, setGagal] = useState(false);
  const [tabAktif, setTabAktif] = useState('tugas');
  const [dialogTugas, setDialogTugas] = useState(false);
  const [tugasEdit, setTugasEdit] = useState(null);
  const [dialogCatatan, setDialogCatatan] = useState(false);
  const [catatanEdit, setCatatanEdit] = useState(null);
  const [permintaanTutup, setPermintaanTutup] = useState(0);
  const [selesaiTerbuka, setSelesaiTerbuka] = useState(false);
  const [semuaCatatan, setSemuaCatatan] = useState(false);
  const [judulCepat, setJudulCepat] = useState('');
  const [menambah, setMenambah] = useState(false);
  const [menyelesaikan, setMenyelesaikan] = useState(() => new Set()); // id yang centangnya sudah tergambar, menunggu animasi
  const prosesRef = useRef(new Set()); // id yang sedang diproses (cegah klik ganda)
  const inputRef = useRef(null);
  const [tanggalCepat, setTanggalCepat] = useState(''); // preset tanggal tambah cepat ('' = tanpa tanggal)
  const [menuTanggal, setMenuTanggal] = useState(false);
  const [cariBuka, setCariBuka] = useState(false);
  const [cari, setCari] = useState('');
  const kotakCepatRef = useRef(null);

  // pintasan "n": fokus ke input tambah cepat di tab Todo
  useEffect(() => {
    const tekan = (e) => {
      if (e.key !== 'n' || e.ctrlKey || e.altKey || e.metaKey) return;
      const el = e.target;
      if (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      setTabAktif('tugas');
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    document.addEventListener('keydown', tekan);
    return () => document.removeEventListener('keydown', tekan);
  }, []);

  // menu preset tanggal: tutup saat klik di luar / Escape
  useEffect(() => {
    if (!menuTanggal) return undefined;
    const luar = (e) => { if (!kotakCepatRef.current?.contains(e.target)) setMenuTanggal(false); };
    const esc = (e) => { if (e.key === 'Escape') setMenuTanggal(false); };
    document.addEventListener('mousedown', luar);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', luar); document.removeEventListener('keydown', esc); };
  }, [menuTanggal]);

  const muat = useCallback(async () => {
    setGagal(false);
    try {
      const [t, c] = await Promise.all([api.get('/tugas-pribadi'), api.get('/catatan-pribadi')]);
      setTugas(t.data.data || []);
      setCatatan(c.data.data || []);
    } catch {
      setGagal(true);
    }
  }, []);

  useEffect(() => { muat(); }, [muat]);

  const muatUlang = useCallback(async () => {
    const res = await api.get('/catatan-pribadi');
    const data = res.data.data || [];
    setCatatan(data);
    return data;
  }, []);

  // halaman induk (ringkasan & agenda) ikut diperbarui setiap data berubah
  useEffect(() => {
    if (tugas && catatan) onData?.({ tugas, catatan });
  }, [tugas, catatan, onData]);

  const onTersimpan = useCallback((c) => setCatatan((d) => (d.some((x) => x.id === c.id) ? d.map((x) => (x.id === c.id ? c : x)) : [c, ...d])), []);

  const aktif = useMemo(() => (tugas || []).filter((t) => !t.selesai).sort(urutTugas), [tugas]);
  const selesai = useMemo(() => (tugas || []).filter((t) => t.selesai).sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [tugas]);
  const kataCari = normalisasi(cari);
  const cocok = (t) => !kataCari || normalisasi(t.judul).includes(kataCari);
  const aktifTampil = aktif.filter(cocok);
  const selesaiTampil = selesai.filter(cocok);
  const kelompok = (() => {
    const h = hariIni();
    return [
      { kunci: 'lewat', judul: 'Lewat tanggal', kelas: 'text-red-600', isi: aktifTampil.filter((t) => t.tanggal_pengingat && t.tanggal_pengingat < h) },
      { kunci: 'hari', judul: 'Hari ini', kelas: 'text-purple-700', isi: aktifTampil.filter((t) => t.tanggal_pengingat === h) },
      { kunci: 'nanti', judul: 'Akan datang', kelas: 'text-slate-500', isi: aktifTampil.filter((t) => t.tanggal_pengingat > h) },
      { kunci: 'tanpa', judul: 'Tanpa tanggal', kelas: 'text-slate-500', isi: aktifTampil.filter((t) => !t.tanggal_pengingat) },
    ].filter((g) => g.isi.length);
  })();
  const daftarCatatan = useMemo(() => [...(catatan || [])].sort(urutCatatan), [catatan]);

  const bukaEditTugas = (t) => { setTugasEdit(t); setDialogTugas(true); };
  const bukaTambahCatatan = () => { setCatatanEdit(null); setPermintaanTutup(0); setDialogCatatan(true); };
  const bukaEditCatatan = (c) => { setCatatanEdit(c); setPermintaanTutup(0); setDialogCatatan(true); };

  const tambahCepat = async (e) => {
    e.preventDefault();
    const j = judulCepat.trim();
    if (!j || menambah) return;
    setMenambah(true);
    try {
      const res = await api.post('/tugas-pribadi', { judul: j, tanggal_pengingat: tanggalCepat || null });
      setTugas((d) => [res.data.data, ...d]);
      setJudulCepat('');
      setTanggalCepat('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Tugas belum tersimpan. Coba lagi.');
    } finally {
      setMenambah(false);
      inputRef.current?.focus();
    }
  };

  // optimistis: centang tergambar dulu, lalu status diubah lokal dan disinkronkan ke server
  const centang = async (t) => {
    if (prosesRef.current.has(t.id)) return;
    prosesRef.current.add(t.id);
    const asli = t.selesai;
    const ubah = (nilai) => setTugas((d) => d.map((x) => (x.id === t.id ? { ...x, selesai: nilai } : x)));
    setMenyelesaikan((st) => new Set(st).add(t.id));
    await new Promise((r) => setTimeout(r, 380));
    setMenyelesaikan((st) => { const n = new Set(st); n.delete(t.id); return n; });
    ubah(!asli);
    try {
      const res = await api.patch(`/tugas-pribadi/${t.id}`, { selesai: !asli });
      setTugas((d) => d.map((x) => (x.id === t.id ? res.data.data : x)));
      if (!asli) {
        toast.custom((tt) => (
          <div className={`flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg transition-opacity ${tt.visible ? 'opacity-100' : 'opacity-0'}`}>
            Tugas selesai
            <button type="button" onClick={() => { toast.dismiss(tt.id); centang({ ...t, selesai: true }); }} className="rounded-md px-2 py-1 font-semibold text-purple-300 hover:bg-white/10">Batalkan</button>
          </div>
        ), { duration: 4000 });
      }
    } catch {
      ubah(asli);
      toast.error('Tugas belum tersimpan. Coba lagi.');
    } finally {
      prosesRef.current.delete(t.id);
    }
  };

  const hapus = async (jenis, item, url, setDaftar) => {
    if (!(await confirmDialog({ title: `Hapus ${jenis}?`, text: 'Item ini akan dihapus dari ruang pribadi Anda.', confirmText: 'Hapus', confirmColor: '#dc2626' }))) return false;
    try {
      await api.delete(`${url}/${item.id}`);
      setDaftar((d) => d.filter((x) => x.id !== item.id));
      return true;
    } catch {
      toast.error(`${jenis === 'tugas' ? 'Tugas' : 'Catatan'} belum dapat dihapus. Coba lagi.`);
      return false;
    }
  };

  const pin = async (c) => {
    try {
      const res = await api.patch(`/catatan-pribadi/${c.id}`, { disematkan: !c.disematkan, versi: c.versi });
      onTersimpan(res.data.data);
    } catch (err) {
      if (err?.response?.data?.code === 'CATATAN_KEDALUWARSA') {
        muatUlang().catch(() => {});
        toast.error('Catatan diperbarui di perangkat lain. Daftar catatan sudah dimuat ulang.');
      } else toast.error('Catatan belum dapat diperbarui. Coba lagi.');
    }
  };

  const tombolHapus = (jenis, item, url, setDaftar) => (
    <button type="button" aria-label={`Hapus ${jenis}`} onClick={() => hapus(jenis, item, url, setDaftar)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
      <Trash2 className="h-4 w-4" />
    </button>
  );

  const kosong = (Ikon, judul, teks, label, aksi) => (
    <div className="rounded-xl bg-slate-50 px-4 py-6 text-center">
      <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
        <Ikon className="h-6 w-6" />
      </motion.span>
      <p className="mt-3 text-sm font-medium text-slate-800">{judul}</p>
      <p className="mt-1 text-xs text-slate-500">{teks}</p>
      <button type="button" className={`${kelasTombolGhost} mt-2`} onClick={aksi}><Plus className="h-4 w-4" /> {label}</button>
    </div>
  );

  const panelTugas = (
    <>
      <form onSubmit={tambahCepat} className="mb-3 flex items-center gap-2">
        <div ref={kotakCepatRef} className="relative flex-1">
          <Plus className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            maxLength={160}
            value={judulCepat}
            onChange={(e) => setJudulCepat(e.target.value)}
            placeholder="Tambah tugas, tekan Enter…"
            aria-label="Tambah tugas"
            className={`${kelasInput} h-11 pl-10 pr-12`}
          />
          <button type="button" aria-label="Atur tanggal pengingat" aria-expanded={menuTanggal} onClick={() => setMenuTanggal((v) => !v)} className={`absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg hover:bg-purple-50 ${tanggalCepat ? 'text-purple-600' : 'text-slate-400'}`}>
            <CalendarPlus className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {menuTanggal && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }} className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                {[['Tanpa tanggal', ''], ['Hari ini', hariIni()], ['Besok', geserHari(hariIni(), 1)], ['Lusa', geserHari(hariIni(), 2)], ['Senin depan', seninDepan(hariIni())]].map(([nama, nilai]) => (
                  <button key={nama} type="button" onClick={() => { setTanggalCepat(nilai); setMenuTanggal(false); }} className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-purple-50 ${tanggalCepat === nilai ? 'font-semibold text-purple-700' : 'text-slate-700'}`}>{nama}</button>
                ))}
                <label className="block px-3 pb-2 pt-1 text-xs text-slate-500">
                  Pilih tanggal…
                  <input type="date" value={tanggalCepat} onChange={(e) => { setTanggalCepat(e.target.value); if (e.target.value) setMenuTanggal(false); }} className={`${kelasInput} mt-1 h-9`} />
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.button
          type="submit"
          aria-label="Tambah tugas"
          disabled={!judulCepat.trim() || menambah}
          whileTap={{ scale: 0.9 }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-md shadow-purple-500/30 hover:bg-purple-700 disabled:opacity-50 disabled:shadow-none"
        >
          {menambah ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
        </motion.button>
      </form>
      {tanggalCepat && (
        <span className="-mt-1 mb-3 inline-flex items-center gap-1 rounded-full bg-purple-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-purple-700">
          <Bell className="h-3 w-3" aria-hidden="true" /> {infoTanggal(tanggalCepat).teks}
          <button type="button" aria-label="Hapus tanggal pengingat" onClick={() => setTanggalCepat('')} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-purple-100"><X className="h-3 w-3" /></button>
        </span>
      )}
      <AnimatePresence initial={false}>
        {cariBuka && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: '100%', opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative mb-3 overflow-hidden">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input autoFocus type="text" value={cari} onChange={(e) => setCari(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setCari(''); setCariBuka(false); } }} placeholder="Cari tugas…" aria-label="Cari tugas" className={`${kelasInput} h-11 pl-10 pr-11`} />
            <button type="button" aria-label="Tutup pencarian" onClick={() => { setCari(''); setCariBuka(false); }} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="space-y-1">
        {aktifTampil.length ? (
          <div className="space-y-3">
            {kelompok.map((g) => (
              <section key={g.kunci} aria-label={g.judul}>
                <h4 className={`mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide ${g.kelas}`}>{g.judul} <span className="font-medium tabular-nums opacity-70">{g.isi.length}</span></h4>
                <ul className={`flex flex-col gap-1 ${halaman ? '2xl:grid 2xl:grid-cols-2 2xl:gap-x-6' : ''}`}>
                  <AnimatePresence initial={false} mode="popLayout">
                    {g.isi.map((t) => (
                      <BarisTugas
                        key={t.id}
                        t={t}
                        sedangSelesai={menyelesaikan.has(t.id)}
                        onCentang={() => centang(t)}
                        onUbah={() => bukaEditTugas(t)}
                        onHapus={() => hapus('tugas', t, '/tugas-pribadi', setTugas)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ))}
          </div>
        ) : kataCari ? (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Tidak ada tugas yang cocok dengan “{cari.trim()}”</p>
        ) : kosong(CheckCheck, 'Daftar Anda sudah lega.', 'Tambahkan tugas yang ingin Anda ingat.', 'Tambah tugas', () => inputRef.current?.focus())}
        {selesaiTampil.length > 0 && (
          <div className="border-t border-slate-100 pt-2">
            <button type="button" aria-expanded={selesaiTerbuka} className="flex min-h-11 w-full items-center gap-2 px-2 text-left text-xs font-medium text-slate-500 hover:text-slate-800" onClick={() => setSelesaiTerbuka((v) => !v)}>
              <Check className="h-4 w-4" /> Selesai ({selesaiTampil.length})
              <motion.span animate={{ rotate: selesaiTerbuka ? 180 : 0 }} className="ml-auto flex" aria-hidden="true"><ChevronDown className="h-4 w-4" /></motion.span>
            </button>
            <AnimatePresence initial={false}>
              {selesaiTerbuka && (
                <motion.ul key="selesai" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <AnimatePresence initial={false} mode="popLayout">
                    {selesaiTampil.map((t) => (
                      <motion.li key={t.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 48, transition: { duration: 0.25 } }} className="flex min-h-12 items-center gap-1 rounded-xl px-1">
                        <Centang aktif={!menyelesaikan.has(t.id)} label={`Batalkan selesai: ${t.judul}`} onKlik={() => centang(t)} />
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-400 line-through">{t.judul}</span>
                        {tombolHapus('tugas', t, '/tugas-pribadi', setTugas)}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );

  const panelCatatan = (
    <>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Bebas ditulis kapan saja</p>
        <button type="button" className={kelasTombolGhost} onClick={bukaTambahCatatan}><Plus className="h-4 w-4" /> Catatan</button>
      </div>
      {daftarCatatan.length ? (
        <div className={halaman ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2'}>
          <AnimatePresence initial={false} mode="popLayout">
          {(semuaCatatan || halaman ? daftarCatatan : daftarCatatan.slice(0, 6)).map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -2 }}
              className="group relative min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition-[border-color,box-shadow] hover:border-purple-200 hover:shadow-md"
            >
              <button type="button" onClick={() => bukaEditCatatan(c)} className="block min-h-14 w-full min-w-0 pr-16 text-left">
                <span className="block truncate text-sm font-medium text-slate-900">{c.judul.trim() || 'Catatan tanpa judul'}</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-500">{c.isi}</span>
              </button>
              <div className="absolute right-2 top-2 flex items-center gap-0.5">
                <button
                  type="button"
                  aria-pressed={c.disematkan}
                  aria-label={`${c.disematkan ? 'Lepas sematan' : 'Sematkan'} ${c.judul || 'catatan'}`}
                  onClick={() => pin(c)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg hover:bg-purple-50 ${c.disematkan ? 'text-purple-600' : `text-slate-400 ${kelasIkonHover}`}`}
                >
                  <Pin className="h-4 w-4" />
                </button>
                {tombolHapus('catatan', c, '/catatan-pribadi', setCatatan)}
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
          {!halaman && daftarCatatan.length > 6 && (
            <button type="button" className={`${kelasTombolGhost} justify-center sm:col-span-2`} onClick={() => setSemuaCatatan((v) => !v)}>
              {semuaCatatan ? 'Tampilkan lebih sedikit' : `Lihat semua ${daftarCatatan.length} catatan`}
            </button>
          )}
        </div>
      ) : kosong(FileText, 'Simpan ide di sini.', 'Catatan tetap pribadi dan tersedia lintas perangkat.', 'Tulis catatan', bukaTambahCatatan)}
    </>
  );

  let isi;
  if (gagal) {
    isi = (
      <div role="alert" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
        <span className="flex-1">Ruang pribadi belum termuat.</span>
        <button type="button" className={kelasTombolLuar} onClick={muat}>Coba lagi</button>
      </div>
    );
  } else if (tugas === null || catatan === null) {
    isi = (
      <div className="space-y-3 py-2" aria-busy="true" aria-label="Memuat tugas dan catatan">
        {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
      </div>
    );
  } else {
    isi = tabAktif === 'tugas' ? panelTugas : panelCatatan;
  }

  const kelasTab = (nama) => `relative flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-colors ${tabAktif === nama ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`;
  const pilTab = <motion.span layoutId="tab-pil-ruang" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-white shadow-sm" />;

  // cincin progres: tugas selesai / total tugas
  const total = tugas?.length ?? 0;
  const persen = total ? Math.round((selesai.length / total) * 100) : 0;

  return (
    <MotionConfig reducedMotion="user">
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30"><NotebookPen className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900">Ruang Pribadi</h3>
            <p className="mt-0.5 text-sm text-slate-500">Tugas dan catatan Anda.</p>
          </div>
          <div className="w-28 shrink-0 sm:w-40" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={selesai.length} aria-label={`${selesai.length} dari ${total} tugas selesai`}>
            <p className="mb-1 text-right text-xs tabular-nums text-slate-500" aria-hidden="true">{selesai.length} dari {total} selesai</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-600" initial={{ width: 0 }} animate={{ width: `${persen}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" className="grid h-11 flex-1 grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button type="button" role="tab" aria-selected={tabAktif === 'tugas'} className={kelasTab('tugas')} onClick={() => setTabAktif('tugas')}>
              {tabAktif === 'tugas' && pilTab}
              <span className="relative z-10 flex items-center gap-1">Todo <span className="ml-1 text-xs tabular-nums text-slate-500">{aktif.length}</span></span>
            </button>
            <button type="button" role="tab" aria-selected={tabAktif === 'catatan'} className={kelasTab('catatan')} onClick={() => setTabAktif('catatan')}>
              {tabAktif === 'catatan' && pilTab}
              <span className="relative z-10 flex items-center gap-1"><FileText className="h-4 w-4" /> Catatan <span className="ml-1 text-xs tabular-nums text-slate-500">{daftarCatatan.length}</span></span>
            </button>
          </div>
          {tabAktif === 'tugas' && aktif.length > 5 && (
            <button type="button" aria-label="Cari tugas" aria-pressed={cariBuka} onClick={() => { if (cariBuka) setCari(''); setCariBuka((v) => !v); }} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 hover:bg-purple-50 ${cariBuka ? 'text-purple-600' : 'text-slate-500'}`}>
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>
        <div>{isi}</div>
      </div>
      <div className="flex items-center gap-2 border-t border-slate-100 bg-purple-50/50 px-4 py-2.5 text-xs text-slate-500 sm:px-6">
        <BellRing className="h-3.5 w-3.5 shrink-0 text-purple-600" />
        Pengingat dikirim tiap 3 jam (07.00–19.00 WIB) sampai tugas dicentang selesai.
      </div>

      <Dialog terbuka={dialogTugas} onTutup={() => setDialogTugas(false)} judul={tugasEdit ? 'Ubah tugas' : 'Tugas baru'} deskripsi="Catatan pekerjaan pribadi Anda.">
        <FormTugas
          key={tugasEdit?.id ?? 'baru'}
          tugas={tugasEdit}
          onBatal={() => setDialogTugas(false)}
          onHapus={async () => { if (await hapus('tugas', tugasEdit, '/tugas-pribadi', setTugas)) setDialogTugas(false); }}
          onSelesai={(t) => {
            setTugas((d) => (d.some((x) => x.id === t.id) ? d.map((x) => (x.id === t.id ? t : x)) : [t, ...d]));
            setDialogTugas(false);
          }}
        />
      </Dialog>

      <Dialog
        terbuka={dialogCatatan}
        onTutup={() => setPermintaanTutup((n) => n + 1)}
        lebar="max-w-lg"
        judul={catatanEdit ? 'Ubah catatan' : 'Catatan baru'}
        deskripsi="Catat ide, rangkuman, atau hal lain untuk diri Anda. Perubahan tersimpan otomatis saat Anda berhenti mengetik."
      >
        <EditorCatatan
          key={catatanEdit?.id ?? 'baru'}
          catatan={catatanEdit}
          muatUlang={muatUlang}
          onTersimpan={onTersimpan}
          permintaanTutup={permintaanTutup}
          tutup={() => { setDialogCatatan(false); setCatatanEdit(null); }}
        />
      </Dialog>
    </div>
    </MotionConfig>
  );
};

export default RuangPribadi;
