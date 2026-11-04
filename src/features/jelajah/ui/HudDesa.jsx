import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { desa, harianKini, misiKini, namaWaktu, sasaranKini, teksJam, useDesa } from "../wilayah/desaHidup";
import { pemainWilayah } from "../wilayah/uiWilayah";
import { usahaKini } from "../usahaWilayah";

/*
 * HUD "desa hidup": kartu misi dengan kompas ke tujuan, misi harian, spanduk
 * acara desa dengan hitung mundur, perayaan misi/acara, jam & waktu, dan layar
 * tidur.
 */

/** jarum kompas menunjuk tujuan relatif arah kamera, plus jarak */
function Kompas() {
	const panah = useRef();
	const jarak = useRef();
	useEffect(() => {
		let id;
		const f = () => {
			const t = sasaranKini();
			if (panah.current && jarak.current) {
				if (!t) { panah.current.style.opacity = "0"; jarak.current.textContent = ""; }
				else {
					const dx = t.x - pemainWilayah.x, dz = t.z - pemainWilayah.z;
					const yaw = pemainWilayah.yaw ?? Math.PI;
					const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
					const maju = dx * fx + dz * fz, kanan = dx * -fz + dz * fx;
					panah.current.style.opacity = "1";
					panah.current.style.transform = `rotate(${Math.atan2(kanan, maju)}rad)`;
					jarak.current.textContent = `${Math.round(Math.hypot(dx, dz))} m`;
				}
			}
			id = requestAnimationFrame(f);
		};
		f();
		return () => cancelAnimationFrame(id);
	}, []);
	return (
		<span className="flex shrink-0 flex-col items-center">
			<span ref={panah} className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-[15px] font-black text-slate-900 shadow">↑</span>
			<span ref={jarak} className="mt-0.5 text-[10px] font-bold tabular-nums text-amber-200" />
		</span>
	);
}

export function KartuMisi() {
	useDesa();
	const [buka, setBuka] = useState(false);
	const m = misiKini();
	const harian = harianKini();
	const sisaHarian = harian.filter((h) => !h.selesai).length;
	return (
		<div className="pointer-events-auto w-[11rem] rounded-2xl bg-slate-950/80 p-2.5 text-white shadow-lg ring-1 ring-amber-300/30 backdrop-blur sm:w-[16.5rem] sm:p-3">
			<div className="flex items-start gap-2">
				<div className="min-w-0 flex-1">
					<p className="m-0 text-[10.5px] font-bold uppercase tracking-wider text-amber-300">{m ? `📜 Misi ${desa.misi.i + 1}` : "⭐ Misi harian"}</p>
					{m ? (
						<>
							<p className="m-0 text-[12.5px] font-bold leading-snug sm:text-[13.5px]">{m.teks}</p>
							<div className="mt-1.5 flex items-center gap-2">
								<span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${(desa.misi.n / m.target) * 100}%` }} /></span>
								<span className="text-[11px] font-bold tabular-nums">{desa.misi.n}/{m.target}</span>
							</div>
							<p className="m-0 mt-1 hidden text-[11px] text-white/60 sm:block">Hadiah: 🪙 {m.hadiah.koin}{m.hadiah.pupuk ? ` · ${usahaKini().pupuk.ikon} ${m.hadiah.pupuk}` : ""}</p>
						</>
					) : (
						<p className="m-0 text-[12.5px] font-semibold">{sisaHarian ? `${sisaHarian} misi tersisa hari ini` : "Semua selesai! Datang lagi besok"}</p>
					)}
				</div>
				<Kompas />
			</div>
			<button type="button" onClick={() => setBuka((v) => !v)} className="mt-2 w-full rounded-lg bg-white/10 py-1 text-[11px] font-bold text-white/80 hover:bg-white/20">
				{buka ? "Tutup" : `Misi harian (${harian.length - sisaHarian}/${harian.length}) ${desa.piala ? `· 🏆 ${desa.piala}` : ""}`}
			</button>
			{buka && (
				<ul className="m-0 mt-2 list-none space-y-1.5 p-0">
					{harian.map((h) => (
						<li key={h.id} className={`rounded-lg px-2 py-1.5 text-[11.5px] ${h.selesai ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5"}`}>
							<div className="flex justify-between gap-2"><span>{h.selesai ? "✅ " : ""}{h.teks}</span><span className="shrink-0 font-bold">🪙 {h.hadiah.koin}</span></div>
							{!h.selesai && <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full bg-amber-400" style={{ width: `${(h.n / h.target) * 100}%` }} /></span>}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function JamDesa() {
	useDesa();
	const j = desa.jam;
	const ikon = j < 4.8 || j >= 19.2 ? "🌙" : j < 7 ? "🌅" : j >= 17.4 ? "🌇" : "☀️";
	return <span className="rounded-xl bg-slate-950/75 px-3 py-2 text-[13px] font-bold tabular-nums text-white shadow-lg backdrop-blur">{ikon} {teksJam()} <span className="hidden font-semibold text-white/60 sm:inline">· {namaWaktu()}</span></span>;
}

export function SpandukAcara() {
	useDesa();
	const [, detak] = useState(0);
	useEffect(() => { const t = setInterval(() => detak((n) => n + 1), 500); return () => clearInterval(t); }, []);
	const a = desa.acara;
	return (
		<AnimatePresence>
			{a && (
				<motion.div key={a.mulai} initial={{ y: -30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0 }}
					className="pointer-events-none w-[min(20rem,62vw)] rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-2 text-white shadow-2xl ring-2 ring-white/40">
					<div className="flex items-center gap-2">
						<span className="text-2xl">{a.ikon}</span>
						<div className="min-w-0 flex-1">
							<p className="m-0 truncate text-[13px] font-black">{a.judul}</p>
							<p className="m-0 truncate text-[11px] font-semibold text-white/90">{a.teks}</p>
						</div>
						<span className="rounded-lg bg-black/25 px-2 py-1 text-[13px] font-black tabular-nums">{Math.max(0, Math.ceil((a.sampai - performance.now()) / 1000))}s</span>
					</div>
					{a.target > 0 && (
						<div className="mt-1.5 flex items-center gap-2">
							<span className="h-2 flex-1 overflow-hidden rounded-full bg-black/25"><span className="block h-full rounded-full bg-yellow-300 transition-[width]" style={{ width: `${(a.n / a.target) * 100}%` }} /></span>
							<span className="text-[11px] font-black">{a.n}/{a.target}</span>
						</div>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	);
}

const KONFETI = ["🎉", "✨", "🌾", "🪙", "⭐", "🎊"];
export function Selebrasi() {
	useDesa();
	const s = desa.selebrasi;
	const butir = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ e: KONFETI[i % KONFETI.length], x: (Math.random() - 0.5) * 520, y: -120 - Math.random() * 220, r: (Math.random() - 0.5) * 720 })), [s?.id]); // eslint-disable-line react-hooks/exhaustive-deps
	return (
		<AnimatePresence>
			{s && (
				<motion.div key={s.id} className="pointer-events-none absolute inset-x-0 top-[34%] z-[64] flex justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
					<div className="relative">
						{butir.map((b, i) => (
							<motion.span key={i} className="absolute left-1/2 top-1/2 text-2xl" initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }} animate={{ x: b.x, y: b.y, opacity: 0, rotate: b.r }} transition={{ duration: 1.6, ease: "easeOut" }}>{b.e}</motion.span>
						))}
						<motion.div initial={{ scale: 0.6, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 16 }}
							className="max-w-md rounded-3xl bg-white px-6 py-4 text-center shadow-2xl ring-4 ring-amber-300">
							<p className="m-0 text-[17px] font-black text-slate-900">{s.judul}</p>
							{s.isi && <p className="m-0 mt-1 text-[15px] font-extrabold text-amber-600">{s.isi}</p>}
						</motion.div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

export function LayarTidur() {
	useDesa();
	return (
		<AnimatePresence>
			{desa.tidur > 0 && (
				<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
					className="pointer-events-none absolute inset-0 z-[66] flex items-center justify-center bg-slate-950">
					<p className="m-0 text-center text-2xl font-black text-white">😴 Zzz…<br /><span className="text-sm font-medium text-slate-400">Tidur di saung sampai pagi</span></p>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
