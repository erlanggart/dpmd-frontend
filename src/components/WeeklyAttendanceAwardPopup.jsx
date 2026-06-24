import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Crown,
  PartyPopper,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import api from '../api';
import { getAvatarUrl } from '../utils/avatarUtils';

// Gaya per peringkat. Pillar = batang podium, height = tinggi podium (juara 1 tertinggi).
const RANK_STYLE = {
  1: {
    label: 'Juara 1',
    medal: '🥇',
    pillar: 'from-amber-300 via-yellow-400 to-amber-500',
    accent: 'from-amber-200 via-yellow-300 to-orange-400',
    ring: 'ring-amber-300/80',
    glow: 'shadow-amber-400/40',
    metric: 'text-amber-300',
    pillarHeight: 'h-36 sm:h-44',
    avatar: 'h-24 w-24 sm:h-28 sm:w-28',
    enterDelay: 0.15,
  },
  2: {
    label: 'Juara 2',
    medal: '🥈',
    pillar: 'from-slate-200 via-slate-300 to-slate-400',
    accent: 'from-slate-200 via-slate-300 to-slate-400',
    ring: 'ring-slate-300/80',
    glow: 'shadow-slate-400/30',
    metric: 'text-slate-200',
    pillarHeight: 'h-24 sm:h-32',
    avatar: 'h-16 w-16 sm:h-20 sm:w-20',
    enterDelay: 0.35,
  },
  3: {
    label: 'Juara 3',
    medal: '🥉',
    pillar: 'from-orange-300 via-amber-600 to-orange-800',
    accent: 'from-orange-300 via-amber-500 to-orange-700',
    ring: 'ring-amber-600/70',
    glow: 'shadow-amber-700/30',
    metric: 'text-amber-400',
    pillarHeight: 'h-16 sm:h-24',
    avatar: 'h-16 w-16 sm:h-20 sm:w-20',
    enterDelay: 0.5,
  },
};

const WeeklyAttendanceAwardPopup = () => {
  const [award, setAward] = useState(null);
  const [show, setShow] = useState(false);

  const celebrate = useCallback(() => {
    const colors = ['#facc15', '#fbbf24', '#38bdf8', '#a78bfa', '#f472b6', '#ffffff'];
    // Ledakan utama di tengah layar.
    confetti({ particleCount: 150, spread: 100, startVelocity: 48, origin: { y: 0.5 }, colors, scalar: 1.1 });
    // Hujan confetti dari dua sisi selama ~2,5 detik (meriah ala ulang tahun).
    const end = Date.now() + 2500;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 62, startVelocity: 45, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 62, startVelocity: 45, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const openAward = useCallback((data) => {
    if (!data?.week_key || !data?.winners?.length) return;
    const dismissed = localStorage.getItem(`weekly_attendance_award_${data.week_key}`);
    if (dismissed) return;
    setAward(data);
    setShow(true);
    setTimeout(celebrate, 350);
  }, [celebrate]);

  useEffect(() => {
    const loadAward = async () => {
      try {
        const response = await api.get('/absensi/weekly-awards/latest');
        if (response.data?.success) openAward(response.data.data);
      } catch {
        // Penghargaan bukan fitur kritis; dashboard tetap berjalan jika API gagal.
      }
    };
    loadAward();
  }, [openAward]);

  useEffect(() => {
    const handler = (event) => {
      const payload = event.data?.payload;
      if (
        event.data?.type === 'PUSH_NOTIFICATION_RECEIVED'
        && payload?.type === 'weekly_attendance_award'
      ) {
        openAward({
          week_key: payload.week_key,
          winners: payload.winners,
          month_label: payload.month_label,
          period_start: payload.period_start,
          period_end: payload.period_end,
        });
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [openAward]);

  const dismiss = () => {
    if (award?.week_key) {
      localStorage.setItem(`weekly_attendance_award_${award.week_key}`, new Date().toISOString());
    }
    setShow(false);
  };

  // Urutkan pemenang menjadi tata letak podium: Juara 2 (kiri) - Juara 1 (tengah) - Juara 3 (kanan).
  const podium = useMemo(() => {
    const winners = award?.winners || [];
    const byRank = (rank) => winners.find((w) => w.rank === rank);
    const first = byRank(1) || winners[0];
    const second = byRank(2) || winners[1];
    const third = byRank(3) || winners[2];
    return [
      second && { winner: second, rank: 2 },
      first && { winner: first, rank: 1 },
      third && { winner: third, rank: 3 },
    ].filter(Boolean);
  }, [award]);

  if (!award) return null;

  return (
    <AnimatePresence>
      {show && (
        <Motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-md sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <Motion.div
            initial={{ opacity: 0, scale: 0.86, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', damping: 23, stiffness: 260 }}
            onClick={(event) => event.stopPropagation()}
            className="relative my-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 text-white shadow-2xl shadow-indigo-950/60"
          >
            {/* Cahaya latar */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.25),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.22),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.22),transparent_40%)]" />
            {/* Sapuan kilau */}
            <Motion.div
              className="pointer-events-none absolute -top-40 left-0 h-72 w-40 rotate-12 bg-white/10 blur-3xl"
              animate={{ x: [-180, 900] }}
              transition={{ duration: 5, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
            />
            {/* Bintang berkelip dekoratif */}
            {[
              { top: '12%', left: '8%', size: 16, delay: 0 },
              { top: '20%', right: '12%', size: 20, delay: 0.6 },
              { top: '38%', left: '14%', size: 14, delay: 1.1 },
              { top: '30%', right: '8%', size: 16, delay: 0.3 },
            ].map((s, i) => (
              <Motion.div
                key={i}
                className="pointer-events-none absolute text-amber-200/70"
                style={{ top: s.top, left: s.left, right: s.right }}
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8], rotate: [0, 25, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
              >
                <Star size={s.size} fill="currentColor" />
              </Motion.div>
            ))}

            <button
              type="button"
              onClick={dismiss}
              aria-label="Tutup penghargaan"
              className="absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-white/10 p-2 text-white/80 transition hover:rotate-90 hover:bg-white/20 hover:text-white"
            >
              <X size={19} />
            </button>

            <div className="relative z-10 px-4 pb-7 pt-7 sm:px-8 sm:pb-9 sm:pt-8">
              {/* Header */}
              <div className="mx-auto max-w-2xl text-center">
                <Motion.div
                  animate={{ y: [0, -7, 0], rotate: [-4, 4, -4] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30 sm:h-20 sm:w-20"
                >
                  <Trophy size={38} strokeWidth={2.4} />
                </Motion.div>
                <div className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
                  <Sparkles size={15} />
                  DPMD Weekly Appreciation
                  <Sparkles size={15} />
                </div>
                <h2 className="text-2xl font-black tracking-tight sm:text-4xl">
                  🏆 Absensi Terbaik!
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                  3 pegawai dengan absensi paling lengkap & datang paling awal periode
                  {' '}{award.month_label || 'bulan ini'}.
                </p>
                {award.period_start && award.period_end && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
                    <CalendarCheck2 size={14} className="text-sky-300" />
                    {award.period_start} s.d. {award.period_end}
                  </div>
                )}
              </div>

              {/* PODIUM */}
              <div className="mt-8 flex items-end justify-center gap-2 sm:gap-4">
                {podium.map(({ winner, rank }) => {
                  const style = RANK_STYLE[rank];
                  const isChampion = rank === 1;
                  return (
                    <Motion.div
                      key={`${winner.category_key}-${winner.user_id}`}
                      initial={{ opacity: 0, y: 120 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: style.enterDelay, type: 'spring', damping: 18, stiffness: 220 }}
                      className={`flex w-1/3 max-w-[200px] flex-col items-center ${isChampion ? 'z-10' : ''}`}
                    >
                      {/* Mahkota khusus juara 1 */}
                      {isChampion && (
                        <Motion.div
                          initial={{ opacity: 0, y: -20, rotate: -20 }}
                          animate={{ opacity: 1, y: [0, -6, 0], rotate: [-6, 6, -6] }}
                          transition={{
                            opacity: { delay: style.enterDelay + 0.3 },
                            y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                            rotate: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
                          }}
                          className="mb-1 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]"
                        >
                          <Crown size={30} fill="currentColor" strokeWidth={1.5} />
                        </Motion.div>
                      )}

                      {/* Avatar */}
                      <div className="relative">
                        {isChampion && (
                          <Motion.div
                            className="absolute -inset-2 rounded-full bg-amber-400/30 blur-md"
                            animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.85, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        )}
                        <div className={`relative ${style.avatar} rounded-full bg-gradient-to-br p-[3px] ${style.accent} shadow-lg ${style.glow} ring-2 ${style.ring}`}>
                          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-900">
                            <span className="text-xl font-black">{winner.name?.charAt(0) || '?'}</span>
                            {winner.avatar && (
                              <img
                                src={getAvatarUrl(winner.avatar)}
                                alt={winner.name}
                                className="absolute inset-0 h-full w-full object-cover"
                                onError={(event) => { event.currentTarget.style.display = 'none'; }}
                              />
                            )}
                          </div>
                        </div>
                        {/* Lencana medali */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-2xl drop-shadow sm:text-3xl">
                          {style.medal}
                        </div>
                      </div>

                      {/* Nama & kategori */}
                      <div className="mt-3 w-full text-center">
                        <h3 className={`line-clamp-2 font-extrabold leading-tight text-white ${isChampion ? 'text-base sm:text-lg' : 'text-sm'}`}>
                          {winner.name}
                        </h3>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">{winner.jabatan}</p>
                        <p className={`mt-1.5 text-xs font-black ${style.metric}`}>{winner.metric}</p>
                        {winner.average_arrival && winner.average_arrival !== '-' && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-300">
                            <Clock3 size={11} className="text-sky-300" />
                            datang {winner.average_arrival}
                          </p>
                        )}
                      </div>

                      {/* Batang podium */}
                      <Motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        transition={{ delay: style.enterDelay + 0.2, type: 'spring', damping: 20 }}
                        className={`relative mt-3 flex w-full ${style.pillarHeight} flex-col items-center justify-start rounded-t-xl bg-gradient-to-b ${style.pillar} shadow-2xl ${style.glow}`}
                      >
                        <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-xl bg-white/40" />
                        <span className={`mt-2 text-3xl font-black ${rank === 2 ? 'text-slate-700' : 'text-white/90'} drop-shadow sm:text-4xl`}>
                          {rank}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${rank === 2 ? 'text-slate-600' : 'text-white/80'}`}>
                          {style.label}
                        </span>
                        <div className="mt-auto mb-2 flex items-center gap-1 text-[10px] font-semibold">
                          <CheckCircle2 size={11} className={rank === 2 ? 'text-emerald-700' : 'text-emerald-200'} />
                          <span className={rank === 2 ? 'text-slate-700' : 'text-white/90'}>
                            {winner.attendance_days} hari
                          </span>
                        </div>
                      </Motion.div>
                    </Motion.div>
                  );
                })}
              </div>
              {/* Lantai podium */}
              <div className="mx-auto -mt-px h-2 w-full max-w-[640px] rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* Footer */}
              <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 sm:flex-row">
                <p className="text-center text-xs text-slate-300 sm:text-left sm:text-sm">
                  Terima kasih sudah menjadi inspirasi kedisiplinan bagi seluruh pegawai.
                </p>
                <button
                  type="button"
                  onClick={dismiss}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:scale-[1.03] sm:w-auto"
                >
                  <PartyPopper size={17} />
                  Selamat untuk Para Juara!
                </button>
              </div>
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
};

export default WeeklyAttendanceAwardPopup;
