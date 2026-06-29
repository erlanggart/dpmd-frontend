import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Clock3, Crown, Trophy, Users, X } from 'lucide-react';
import api from '../api';
import { getAvatarUrl } from '../utils/avatarUtils';

// Gaya per peringkat. pillarHeight = tinggi batang podium (juara 1 tertinggi).
const RANK_STYLE = {
  1: {
    label: 'Juara 1',
    medal: '🥇',
    pillar: 'from-amber-300 via-yellow-400 to-amber-500',
    accent: 'from-amber-200 via-yellow-300 to-orange-400',
    ring: 'ring-amber-300/80',
    glow: 'shadow-amber-400/40',
    metric: 'text-amber-300',
    pillarHeight: 'h-14 sm:h-16',
    avatar: 'h-20 w-20 sm:h-24 sm:w-24',
    enterDelay: 0.1,
  },
  2: {
    label: 'Juara 2',
    medal: '🥈',
    pillar: 'from-slate-200 via-slate-300 to-slate-400',
    accent: 'from-slate-200 via-slate-300 to-slate-400',
    ring: 'ring-slate-300/80',
    glow: 'shadow-slate-400/30',
    metric: 'text-slate-200',
    pillarHeight: 'h-10 sm:h-12',
    avatar: 'h-14 w-14 sm:h-16 sm:w-16',
    enterDelay: 0.25,
  },
  3: {
    label: 'Juara 3',
    medal: '🥉',
    pillar: 'from-orange-300 via-amber-600 to-orange-800',
    accent: 'from-orange-300 via-amber-500 to-orange-700',
    ring: 'ring-amber-600/70',
    glow: 'shadow-amber-700/30',
    metric: 'text-amber-400',
    pillarHeight: 'h-8 sm:h-9',
    avatar: 'h-14 w-14 sm:h-16 sm:w-16',
    enterDelay: 0.35,
  },
};

// Ambil daftar kategori dari payload (kompatibel data lama yang masih memakai `winners`).
const extractCategories = (data) => {
  if (data?.categories?.length) return data.categories;
  if (data?.winners?.length) return [{ key: 'overall', label: 'Absensi Terbaik', winners: data.winners }];
  return [];
};

const WeeklyAttendanceAwardPopup = () => {
  const [award, setAward] = useState(null);
  const [show, setShow] = useState(false);
  const [categoryIndex, setCategoryIndex] = useState(0);

  const celebrate = useCallback(() => {
    const colors = ['#facc15', '#fbbf24', '#38bdf8', '#a78bfa', '#f472b6', '#ffffff'];
    confetti({ particleCount: 120, spread: 90, startVelocity: 45, origin: { y: 0.5 }, colors, scalar: 1 });
    const end = Date.now() + 2000;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 60, startVelocity: 42, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 60, startVelocity: 42, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const openAward = useCallback((data) => {
    const categories = extractCategories(data);
    if (!data?.week_key || !categories.length) return;
    const dismissed = localStorage.getItem(`weekly_attendance_award_${data.week_key}`);
    if (dismissed) return;
    setAward({ ...data, categories });
    setCategoryIndex(0);
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
          period_type: payload.period_type,
          categories: payload.categories,
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

  const categories = award?.categories || [];
  const current = categories[categoryIndex] || null;
  const isLast = categoryIndex >= categories.length - 1;
  const periodType = award?.period_type === 'monthly' ? 'monthly' : 'weekly';
  const periodWord = periodType === 'monthly' ? 'Bulanan' : 'Mingguan';

  const goNext = () => {
    if (categoryIndex < categories.length - 1) setCategoryIndex((i) => i + 1);
  };

  // Urutkan pemenang: Juara 2 (kiri) - Juara 1 (tengah) - Juara 3 (kanan).
  const podium = useMemo(() => {
    const winners = current?.winners || [];
    const byRank = (rank) => winners.find((w) => w.rank === rank);
    const first = byRank(1) || winners[0];
    const second = byRank(2) || winners[1];
    const third = byRank(3) || winners[2];
    return [
      second && { winner: second, rank: 2 },
      first && { winner: first, rank: 1 },
      third && { winner: third, rank: 3 },
    ].filter(Boolean);
  }, [current]);

  if (!award || !current) return null;

  return (
    <AnimatePresence>
      {show && (
        <Motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <Motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            onClick={(event) => event.stopPropagation()}
            className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 text-white shadow-2xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.22),transparent_55%)]" />

            <button
              type="button"
              onClick={dismiss}
              aria-label="Tutup penghargaan"
              className="absolute right-3 top-3 z-20 rounded-full bg-white/10 p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="relative z-10 px-5 pb-6 pt-7 text-center">
              {/* Header ringkas */}
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30">
                <Trophy size={26} strokeWidth={2.4} />
              </div>
              <h2 className="text-lg font-black tracking-tight sm:text-xl">
                🏆 Juara Absensi {periodWord}
              </h2>
              {award.period_start && award.period_end && (
                <p className="mt-1 text-xs text-slate-400">
                  {award.period_start} s.d. {award.period_end}
                </p>
              )}

              {/* Chip kategori aktif */}
              <Motion.div
                key={current.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-xs font-bold text-amber-200"
              >
                <Users size={13} />
                {current.label}
                {categories.length > 1 && (
                  <span className="text-[10px] font-semibold text-amber-100/70">
                    {categoryIndex + 1}/{categories.length}
                  </span>
                )}
              </Motion.div>

              {/* PODIUM */}
              {podium.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-8 text-sm text-slate-300">
                  Belum ada juara untuk kategori ini.
                </div>
              ) : (
                <div className="mt-5 flex items-end justify-center gap-2 sm:gap-3">
                  {podium.map(({ winner, rank }) => {
                    const style = RANK_STYLE[rank];
                    const isChampion = rank === 1;
                    return (
                      <Motion.div
                        key={`${winner.category_key}-${winner.user_id}`}
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: style.enterDelay, type: 'spring', damping: 18, stiffness: 220 }}
                        className={`flex w-1/3 max-w-[140px] flex-col items-center ${isChampion ? 'z-10' : ''}`}
                      >
                        {isChampion && (
                          <Crown size={22} className="mb-1 text-amber-300" fill="currentColor" strokeWidth={1.5} />
                        )}

                        {/* Avatar + medali */}
                        <div className="relative">
                          <div className={`relative ${style.avatar} rounded-full bg-gradient-to-br p-[3px] ${style.accent} shadow-lg ${style.glow} ring-2 ${style.ring}`}>
                            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-900">
                              <span className="text-lg font-black">{winner.name?.charAt(0) || '?'}</span>
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
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xl drop-shadow">
                            {style.medal}
                          </div>
                        </div>

                        {/* Nama + satu metrik yang jelas */}
                        <h3 className={`mt-2.5 line-clamp-1 w-full font-bold leading-tight text-white ${isChampion ? 'text-sm' : 'text-xs'}`}>
                          {winner.name}
                        </h3>
                        <p className="w-full truncate text-[10px] text-slate-400">{winner.jabatan}</p>
                        <p className={`mt-1 text-[11px] font-black ${style.metric}`}>{winner.metric}</p>
                        {winner.average_arrival && winner.average_arrival !== '-' && (
                          <p className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-300">
                            <Clock3 size={10} className="text-sky-300" />
                            datang {winner.average_arrival}
                          </p>
                        )}

                        {/* Batang podium ringkas (hanya angka peringkat) */}
                        <Motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          transition={{ delay: style.enterDelay + 0.15, type: 'spring', damping: 20 }}
                          className={`mt-2 flex w-full ${style.pillarHeight} items-center justify-center rounded-t-lg bg-gradient-to-b ${style.pillar} shadow-lg ${style.glow}`}
                        >
                          <span className={`text-2xl font-black drop-shadow ${rank === 2 ? 'text-slate-700' : 'text-white/90'}`}>
                            {rank}
                          </span>
                        </Motion.div>
                      </Motion.div>
                    );
                  })}
                </div>
              )}

              {/* Titik indikator kategori */}
              {categories.length > 1 && (
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  {categories.map((c, i) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategoryIndex(i)}
                      aria-label={c.label}
                      title={c.label}
                      className={`h-2 rounded-full transition-all ${i === categoryIndex ? 'w-5 bg-amber-300' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                    />
                  ))}
                </div>
              )}

              {/* Aksi */}
              <button
                type="button"
                onClick={isLast ? dismiss : goNext}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:scale-[1.02]"
              >
                {isLast ? 'Selesai 🎉' : 'Kategori berikutnya'}
              </button>
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
};

export default WeeklyAttendanceAwardPopup;
