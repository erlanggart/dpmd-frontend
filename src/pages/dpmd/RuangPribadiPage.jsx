import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, ChevronLeft, ChevronRight, CircleAlert, Circle, CheckCircle2, FileText, ListChecks } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import RuangPribadi from '../../components/tugas/RuangPribadi';

/*
 * Ruang Pribadi Sekretaris Dinas, tata letaknya meniru dasbor Pendamping di Aksara:
 * sapaan + kartu ringkasan, lalu dua kolom — kartu Ruang pribadi (Todo/Catatan)
 * sebagai isi utama di kiri dan agenda pengingat 7 hari menempel di kanan.
 */

const hariIni = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const objekTanggal = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const geserHari = (iso, n) => { const t = objekTanggal(iso); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const formatPenuh = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatPendek = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const formatHari = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' });

// masuk bertahap: wadah mengatur jeda, tiap anak naik sambil memudar masuk
const wadah = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const anak = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// kartu miring 3D mengikuti pointer mouse (sentuhan/pena tidak memicu)
function Kartu3D({ children, className }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 25 });
  const sy = useSpring(y, { stiffness: 300, damping: 25 });
  const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-8, 8]);
  const gerak = (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const lepas = () => { x.set(0); y.set(0); };
  return (
    <motion.div onPointerMove={gerak} onPointerLeave={lepas} style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }} className={className}>
      {children}
    </motion.div>
  );
}

function KartuStatistik({ judul, nilai, keterangan, ikon: Ikon, nada = 'text-purple-600 bg-purple-50' }) {
  return (
    <Kartu3D className="h-full min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md sm:rounded-2xl sm:px-5 sm:py-4">
      <div className="flex items-start gap-3 sm:justify-between" style={{ transformStyle: 'preserve-3d' }}>
        <div className="min-w-0 space-y-0.5 sm:space-y-1">
          <motion.p key={nilai} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-3xl">{nilai ?? '–'}</motion.p>
          <p className="truncate text-[11px] font-medium text-slate-500 sm:text-[13px]">{judul}</p>
          <p className="hidden text-xs text-slate-400 sm:block">{keterangan}</p>
        </div>
        <motion.span style={{ translateZ: 24 }} className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:flex ${nada}`}><Ikon className="h-5 w-5" /></motion.span>
      </div>
    </Kartu3D>
  );
}

function AgendaPengingat({ tugas }) {
  const kini = hariIni();
  const [awal, setAwal] = useState(kini);
  const [pilih, setPilih] = useState(kini);
  const akhir = geserHari(awal, 6);
  const terpilih = pilih >= awal && pilih <= akhir ? pilih : awal;
  const padaHari = (iso) => (tugas || []).filter((t) => t.tanggal_pengingat === iso);
  const loncat = (arah) => {
    if (arah === 0) { setAwal(kini); setPilih(kini); return; }
    setAwal((a) => geserHari(a, arah * 7));
  };
  const daftar = padaHari(terpilih).sort((a, b) => Number(a.selesai) - Number(b.selesai));
  const jumlahLewat = (tugas || []).filter((t) => !t.selesai && t.tanggal_pengingat && t.tanggal_pengingat < kini).length;

  return (
    <section aria-labelledby="judul-agenda" className="min-w-0 lg:sticky lg:top-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 id="judul-agenda" className="text-base font-semibold tracking-tight text-slate-900">Agenda pengingat</h2>
          <p className="mt-1 text-xs text-slate-500">{formatPendek.format(objekTanggal(awal))} – {formatPendek.format(objekTanggal(akhir))}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Tujuh hari sebelumnya" onClick={() => loncat(-1)} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => loncat(0)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Hari ini</button>
          <button type="button" aria-label="Tujuh hari berikutnya" onClick={() => loncat(1)} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1" role="group" aria-label="Pilih tanggal agenda">
        {Array.from({ length: 7 }, (_, i) => geserHari(awal, i)).map((iso) => {
          const tgl = objekTanggal(iso);
          const ada = padaHari(iso).some((t) => !t.selesai);
          const dipilih = iso === terpilih;
          const hari = iso === kini;
          return (
            <motion.button key={iso} type="button" aria-pressed={dipilih} onClick={() => setPilih(iso)} whileHover={{ y: -2 }} whileTap={{ scale: 0.94 }}
              aria-label={`${formatPenuh.format(tgl)}${hari ? ', hari ini' : ''}${ada ? ', ada pengingat' : ''}`}
              className={`relative flex min-w-0 flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors ${dipilih ? 'border-purple-600 text-white' : hari ? 'border-purple-300 bg-white text-purple-700' : 'border-transparent bg-white text-slate-800 hover:border-slate-200 hover:bg-slate-50'}`}>
              {dipilih && <motion.span layoutId="agenda-pil" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-xl bg-purple-600" />}
              <span className={`relative z-10 text-[10px] font-medium ${dipilih ? 'text-white/80' : 'text-slate-500'}`}>{formatHari.format(tgl)}</span>
              <span className="relative z-10 text-sm font-semibold tabular-nums">{tgl.getUTCDate()}</span>
              <span className={`relative z-10 h-1 w-1 rounded-full ${ada ? (dipilih ? 'bg-white' : 'bg-purple-600') : 'bg-transparent'}`} aria-hidden="true" />
            </motion.button>
          );
        })}
      </div>

      <div aria-live="polite" className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-semibold text-slate-900">{formatPenuh.format(objekTanggal(terpilih))}</h3>
        {jumlahLewat > 0 && <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600">{jumlahLewat} tugas lewat tanggal</p>}
        <AnimatePresence mode="wait" initial={false}>
        <motion.div key={terpilih} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
        {tugas === null ? (
          <div className="mt-3 h-14 animate-pulse rounded-md bg-slate-100" aria-busy="true" aria-label="Memuat agenda" />
        ) : daftar.length ? (
          <ul className="mt-2 divide-y divide-slate-100">
            {daftar.map((t) => {
              const lewat = !t.selesai && t.tanggal_pengingat < kini;
              return (
                <li key={t.id} className="flex min-h-[56px] items-center gap-3 py-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.selesai ? 'bg-slate-100 text-slate-400' : 'bg-purple-50 text-purple-600'}`}>
                    {t.selesai ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                  </span>
                  <span className={`min-w-0 flex-1 line-clamp-2 break-words text-sm font-medium ${t.selesai ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.judul}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.selesai ? 'bg-emerald-50 text-emerald-700' : lewat ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-700'}`}>
                    {t.selesai ? 'Selesai' : lewat ? 'Lewat' : 'Belum'}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-4 text-sm text-slate-500">Tidak ada pengingat pada tanggal ini.</p>
        )}
        </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

const RuangPribadiPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState({ tugas: null, catatan: null });
  const kini = hariIni();
  const aktif = data.tugas?.filter((t) => !t.selesai);
  const nama = (user?.name || '').split(' ')[0] || 'Anda';

  return (
    <MotionConfig reducedMotion="user">
    <motion.div variants={wadah} initial="hidden" animate="show" className="mx-auto w-full max-w-[1760px] space-y-7 px-4 py-6 pb-28 sm:space-y-8 sm:px-6 lg:px-8 lg:pb-10">
      <section>
        <motion.div variants={anak} className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">Halo, {nama}</h1>
            <p className="mt-1 text-sm text-slate-500">{formatPenuh.format(objekTanggal(kini))}</p>
          </div>
          <button type="button" onClick={() => navigate('/dpmd/dashboard')} className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 sm:h-11 sm:w-auto sm:px-4" aria-label="Kembali ke dashboard">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
          </button>
        </motion.div>
        <motion.div variants={anak} className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
          <KartuStatistik judul="Hari ini" nilai={aktif?.filter((t) => t.tanggal_pengingat === kini).length} keterangan="Pengingat jatuh hari ini" ikon={CalendarCheck} />
          <KartuStatistik judul="Lewat tanggal" nilai={aktif?.filter((t) => t.tanggal_pengingat && t.tanggal_pengingat < kini).length} keterangan="Belum dikerjakan" ikon={CircleAlert} nada="text-red-600 bg-red-50" />
          <KartuStatistik judul="Belum selesai" nilai={aktif?.length} keterangan="Semua tugas aktif" ikon={ListChecks} />
          <KartuStatistik judul="Catatan" nilai={data.catatan?.length} keterangan="Tersimpan di akun Anda" ikon={FileText} />
        </motion.div>
      </section>

      <motion.div variants={anak} className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_25rem] 2xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="min-w-0">
          <RuangPribadi halaman onData={setData} />
        </div>
        <AgendaPengingat tugas={data.tugas} />
      </motion.div>
    </motion.div>
    </MotionConfig>
  );
};

export default RuangPribadiPage;
