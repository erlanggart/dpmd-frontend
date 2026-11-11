import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, ChevronLeft, ChevronRight, CircleAlert, Circle, CheckCircle2, FileText, ListChecks } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RuangPribadi from '../../components/tugas/RuangPribadi';

/*
 * Ruang Pribadi Sekretaris Dinas, tata letaknya meniru dasbor Pendamping di Aksara:
 * sapaan + kartu ringkasan, lalu dua kolom — agenda pengingat 7 hari di kiri dan
 * kartu Ruang pribadi (Todo/Catatan) yang menempel di kanan.
 */

const hariIni = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const objekTanggal = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const geserHari = (iso, n) => { const t = objekTanggal(iso); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const formatPenuh = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatPendek = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const formatHari = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' });

function KartuStatistik({ judul, nilai, keterangan, ikon: Ikon, nada = 'text-purple-600 bg-purple-50' }) {
  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-5">
      <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[13px] font-medium text-slate-500">{judul}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-3xl">{nilai ?? '–'}</p>
          <p className="text-xs text-slate-400">{keterangan}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${nada}`}><Ikon className="h-5 w-5" /></span>
      </div>
    </div>
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

  return (
    <section aria-labelledby="judul-agenda" className="min-w-0">
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

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label="Pilih tanggal agenda">
        {Array.from({ length: 7 }, (_, i) => geserHari(awal, i)).map((iso) => {
          const tgl = objekTanggal(iso);
          const ada = padaHari(iso).some((t) => !t.selesai);
          const dipilih = iso === terpilih;
          const hari = iso === kini;
          return (
            <button key={iso} type="button" aria-pressed={dipilih} onClick={() => setPilih(iso)}
              aria-label={`${formatPenuh.format(tgl)}${hari ? ', hari ini' : ''}${ada ? ', ada pengingat' : ''}`}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-lg border py-2.5 transition-colors sm:py-3 ${dipilih ? 'border-purple-600 bg-purple-600 text-white' : hari ? 'border-purple-300 bg-white text-purple-700' : 'border-transparent bg-white text-slate-800 hover:border-slate-200 hover:bg-slate-50'}`}>
              <span className={`text-xs font-medium ${dipilih ? 'text-white/80' : 'text-slate-500'}`}>{formatHari.format(tgl)}</span>
              <span className="text-sm font-semibold tabular-nums sm:text-base">{tgl.getUTCDate()}</span>
              <span className={`h-1 w-1 rounded-full ${ada ? (dipilih ? 'bg-white' : 'bg-purple-600') : 'bg-transparent'}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-semibold text-slate-900">{formatPenuh.format(objekTanggal(terpilih))}</h3>
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
                  <span className={`min-w-0 flex-1 truncate text-sm font-medium ${t.selesai ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.judul}</span>
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
    <div className="mx-auto w-full max-w-7xl space-y-7 px-4 py-6 pb-10 sm:space-y-8 sm:px-6 lg:px-8">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">Halo, {nama}</h1>
            <p className="mt-1 text-sm text-slate-500">{formatPenuh.format(objekTanggal(kini))}</p>
          </div>
          <button type="button" onClick={() => navigate('/dpmd/dashboard')} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KartuStatistik judul="Hari ini" nilai={aktif?.filter((t) => t.tanggal_pengingat === kini).length} keterangan="Pengingat jatuh hari ini" ikon={CalendarCheck} />
          <KartuStatistik judul="Lewat tanggal" nilai={aktif?.filter((t) => t.tanggal_pengingat && t.tanggal_pengingat < kini).length} keterangan="Belum dikerjakan" ikon={CircleAlert} nada="text-red-600 bg-red-50" />
          <KartuStatistik judul="Belum selesai" nilai={aktif?.length} keterangan="Semua tugas aktif" ikon={ListChecks} />
          <KartuStatistik judul="Catatan" nilai={data.catatan?.length} keterangan="Tersimpan di akun Anda" ikon={FileText} />
        </div>
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.9fr)] xl:items-start xl:gap-y-7">
        <AgendaPengingat tugas={data.tugas} />
        <aside className="min-w-0 xl:sticky xl:top-6 xl:col-start-2 xl:row-start-1">
          <RuangPribadi onData={setData} />
        </aside>
      </div>
    </div>
  );
};

export default RuangPribadiPage;
