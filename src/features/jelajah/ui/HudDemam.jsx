import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { JEDA_KOMBO, KOMBO_DEMAM, LAMA_DEMAM, demamAktif, kebun, useKebun } from "../kebun";
import { usahaKini } from "../usahaWilayah";

/*
 * Kombo panen & Demam: angka kombo yang meloncat, sisa waktu yang terus
 * menyusut supaya pemain terburu-buru, lalu layar emas saat Demam aktif.
 */

const SEBUTAN = ["", "", "Mantap!", "Hebat!", "Gila!"];

export default function HudDemam() {
	useKebun();
	const sisa = useRef();
	const [, detak] = useState(0);
	const kb = kebun.kombo;

	useEffect(() => {
		let id;
		let hidupTadi = false;
		const f = () => {
			const kini = performance.now();
			const demam = kini < kebun.kombo.demam;
			const hidup = demam || kini < kebun.kombo.sampai;
			if (sisa.current) {
				const u = demam ? (kebun.kombo.demam - kini) / LAMA_DEMAM : (kebun.kombo.sampai - kini) / JEDA_KOMBO;
				sisa.current.style.width = `${Math.max(0, Math.min(1, u)) * 100}%`;
			}
			if (hidup !== hidupTadi) { hidupTadi = hidup; detak((n) => n + 1); }
			id = requestAnimationFrame(f);
		};
		f();
		return () => cancelAnimationFrame(id);
	}, []);

	const demam = demamAktif();
	const tampil = kb.n >= 2 && (demam || performance.now() < kb.sampai);
	const kurang = KOMBO_DEMAM - kb.n;

	return (
		<>
			{demam && (
				<div className="pointer-events-none absolute inset-0 z-[5] animate-pulse" style={{ boxShadow: "inset 0 0 130px 34px rgba(251,191,36,.75)" }} />
			)}
			<AnimatePresence>
				{demam && (
					<motion.div key="demam" initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}
						className="pointer-events-none absolute inset-x-0 top-[22%] z-[6] text-center">
						<p className="m-0 text-[34px] font-black leading-none text-amber-300 sm:text-[52px]" style={{ textShadow: "0 3px 0 #92400e, 0 0 26px rgba(251,191,36,.9)" }}>🔥 {usahaKini().demam}</p>
						<p className="m-0 mt-1 text-[13px] font-extrabold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.8)] sm:text-[15px]">Lari menerjang: semua yang siap langsung terpanen!</p>
					</motion.div>
				)}
			</AnimatePresence>
			<AnimatePresence>
				{tampil && (
					<motion.div key={kb.n} initial={{ scale: 1.7, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 520, damping: 15 }}
						className={`pointer-events-none absolute right-3 top-[46%] w-28 rounded-2xl px-3 py-2 text-center text-white shadow-xl sm:right-4 ${demam ? "bg-gradient-to-b from-amber-400 to-red-600 ring-2 ring-yellow-200" : "bg-orange-500"}`}>
						<p className="m-0 text-[11px] font-black uppercase tracking-wider">{demam ? "Demam" : SEBUTAN[kb.n] || "Kombo"}</p>
						<p className="m-0 text-4xl font-black leading-none">x{kb.n}</p>
						<p className="m-0 text-[11px] font-bold tabular-nums">🔥 {Math.round(kb.skor)}</p>
						<span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-black/30"><span ref={sisa} className="block h-full rounded-full bg-yellow-200" /></span>
						{!demam && kurang > 0 && <p className="m-0 mt-1 text-[10px] font-bold text-white/90">{kurang} lagi: Demam!</p>}
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
