import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './WelcomeDashboard.css';
import {
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Layers,
  RefreshCw,
  Compass,
  PanelLeft,
} from 'lucide-react';

const GREETINGS = [
  { until: 11, text: 'Selamat pagi', Icon: Sunrise },
  { until: 15, text: 'Selamat siang', Icon: Sun },
  { until: 18, text: 'Selamat sore', Icon: Sunset },
  { until: 24, text: 'Selamat malam', Icon: Moon },
];

const HIGHLIGHTS = [
  {
    no: '01',
    Icon: Layers,
    title: 'Semua data, satu pintu',
    description:
      'Kelembagaan, profil desa, keuangan desa, BUMDes, sampai aparatur. Nggak perlu buka aplikasi satu per satu.',
  },
  {
    no: '02',
    Icon: RefreshCw,
    title: 'Angkanya ikut yang terbaru',
    description:
      'Ditarik langsung dari data yang diinput desa dan kecamatan, jadi yang kamu lihat ya kondisi terkini.',
  },
  {
    no: '03',
    Icon: Compass,
    title: 'Siap dipakai ambil keputusan',
    description:
      'Baca tren, bandingkan antar wilayah, siapkan bahan rapat. Semua tanpa rekap manual lagi.',
  },
];

const WelcomeDashboard = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting =
    GREETINGS.find((item) => currentTime.getHours() < item.until) ||
    GREETINGS[GREETINGS.length - 1];
  const GreetingIcon = greeting.Icon;

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const roleLabel = user?.role?.replace(/_/g, ' ') || 'Pengguna';

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-12 pt-20 sm:px-6 lg:px-10 lg:pb-16 lg:pt-12">
      <div className="mx-auto w-full max-w-5xl space-y-6 sm:space-y-8">
        {/* Panel utama */}
        <section className="welcome-hero welcome-rise rounded-2xl px-6 py-8 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/10 sm:rounded-3xl sm:px-9 sm:py-11">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="welcome-ping absolute inline-flex h-full w-full rounded-full bg-white" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
              Core Dashboard DPMD
            </span>
          </div>

          <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-400 sm:text-base">
                <GreetingIcon className="h-4 w-4 shrink-0" />
                {greeting.text}
                {user?.nama ? ',' : ''}
              </p>
              <h1 className="mt-2 break-words text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {user?.nama || 'Selamat datang'}
              </h1>
              <p className="mt-4 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium capitalize tracking-wide text-slate-300">
                {roleLabel}
              </p>
            </div>

            {/* Jam & tanggal */}
            <div className="shrink-0 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0 lg:text-right">
              <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-white sm:text-5xl">
                {formattedTime}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-brand-400 sm:text-sm sm:tracking-[0.12em]">
                {formattedDate}
              </p>
            </div>
          </div>
        </section>

        {/* Penjelasan singkat */}
        <section className="welcome-rise welcome-delay-1">
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-1 rounded-full bg-slate-900" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700">
              Sekilas
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Jadi, Core Dashboard itu apa?
          </h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
            Anggap aja ini ruang kontrolnya DPMD. Semua data dari tiap bidang dikumpulin
            di satu layar, sudah dirapikan jadi angka dan grafik yang gampang dibaca.
            Tinggal lihat, nggak perlu ngolah dari nol.
          </p>

          <div className="mt-7 grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-3">
            {HIGHLIGHTS.map(({ no, Icon, title, description }, index) => (
              <article
                key={no}
                tabIndex={0}
                className={`welcome-row welcome-rise group relative p-5 outline-none transition-colors duration-200 hover:bg-slate-50 focus-visible:bg-slate-50 sm:p-6 ${
                  index > 0
                    ? 'border-t border-slate-200 sm:border-l sm:border-t-0'
                    : ''
                } ${
                  index === 0
                    ? 'welcome-delay-2'
                    : index === 1
                    ? 'welcome-delay-3'
                    : 'welcome-delay-4'
                }`}
              >
                <span className="welcome-row-mark absolute inset-x-0 top-0 h-0.5" />
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="font-mono text-xs tabular-nums text-slate-300">
                    {no}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Petunjuk mulai + footer */}
        <footer className="welcome-rise welcome-delay-4 flex flex-col gap-5 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600 sm:items-center">
            <PanelLeft className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 sm:mt-0" />
            <span>
              Mau mulai dari mana? Pilih modulnya lewat{' '}
              <span className="font-medium text-slate-900">menu di samping kiri</span>.
            </span>
          </p>
          <p className="text-xs leading-relaxed text-slate-400 sm:text-right">
            <span className="font-medium text-slate-500">
              Dinas Pemberdayaan Masyarakat dan Desa
            </span>
            <span className="hidden sm:inline"> · </span>
            <br className="sm:hidden" />
            Monitoring &amp; Evaluasi © {currentTime.getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default WelcomeDashboard;
