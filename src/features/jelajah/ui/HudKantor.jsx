import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { posisi } from "../jelajahStore";
import { RANTAI_KANTOR, acaraKini, formatNomor, kantor, misiKantorKini, sasaranKantor, useKantor } from "../kantorHidup";
import { GERBANG_JETSKI, TENDA_BAZAR } from "../scene/acaraData";
import PilMisi from "./PilMisi";

/*
 * HUD kantor: kartu misi cerita Kang Ujang + tiket antrean + acara harian dengan kompas
 * ke tujuan, dan kartu perayaan di tengah layar. Letaknya diatur halaman (JelajahPage).
 */

const menit = (ms) => {
	const d = Math.max(0, Math.ceil(ms / 1000));
	return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`;
};

/** jarum kompas menunjuk tujuan relatif arah kamera, plus jarak */
function Kompas() {
	const panah = useRef();
	const jarak = useRef();
	useEffect(() => {
		let id;
		const f = () => {
			const t = sasaranKantor();
			if (panah.current && jarak.current) {
				if (!t) { panah.current.style.opacity = "0"; jarak.current.textContent = ""; }
				else {
					const dx = t.x - posisi.x, dz = t.z - posisi.z;
					const yaw = posisi.yaw ?? Math.PI;
					const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
					const maju = dx * fx + dz * fz, kanan = dx * -fz + dz * fx;
					panah.current.style.opacity = "1";
					panah.current.style.transform = `rotate(${Math.atan2(kanan, maju)}rad)`;
					jarak.current.textContent = t.keTangga ? "ke tangga" : `${Math.round(Math.hypot(dx, dz))} m`;
				}
			}
			id = requestAnimationFrame(f);
		};
		f();
		return () => cancelAnimationFrame(id);
	}, []);
	return (
		<span className="flex shrink-0 items-center gap-1">
			<span ref={panah} className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[12px] font-black text-slate-900 shadow">↑</span>
			<span ref={jarak} className="text-[10px] font-bold tabular-nums text-amber-200" />
		</span>
	);
}

export function KartuKantor({ onAntar }) {
	useKantor();
	const [, detak] = useState(0);
	const hidup = !!(kantor.lomba || kantor.tiket);
	// hitung mundur tiket & waktu lomba bergerak tiap 200 ms
	useEffect(() => {
		if (!hidup) return;
		const t = setInterval(() => detak((n) => n + 1), 200);
		return () => clearInterval(t);
	}, [hidup]);

	const m = misiKantorKini();
	const t = kantor.tiket;
	const l = kantor.lomba;
	const acara = acaraKini();
	const stempel = kantor.hari.stempel.length;
	const tuntas = acara === "bazar" ? stempel >= TENDA_BAZAR.length : kantor.hari.medali === "emas";
	const tombolAntar = !tuntas && (
		<button type="button" onClick={() => onAntar(acara)} className="shrink-0 rounded-md bg-amber-400 px-2 py-0.5 text-[10.5px] font-bold text-slate-900 hover:bg-amber-300">Antar</button>
	);
	const judul = l
		? `Gerbang ${l.gerbang}/${GERBANG_JETSKI.length}`
		: t
			? `${formatNomor(t.nomor)}${t.fase === "tunggu" ? "" : ` · ${menit(t.batas - Date.now())}`}`
			: m?.teks ?? "Urusan & acara";

	return (
		<PilMisi judul={judul} kompas={<Kompas />} aktif={hidup}>
			<p className="m-0 text-[10.5px] font-bold uppercase tracking-wider text-amber-300">{m ? `📜 Misi ${kantor.misi.i + 1}/${RANTAI_KANTOR.length}` : "⭐ Urusan & acara harian"}</p>
			{m ? (
				<>
					<p className="m-0 text-[13px] font-bold leading-snug">{m.teks}</p>
					<div className="mt-1.5 flex items-center gap-2">
						<span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${(kantor.misi.n / m.target) * 100}%` }} /></span>
						<span className="text-[11px] font-bold tabular-nums">{kantor.misi.n}/{m.target}</span>
					</div>
					<p className="m-0 mt-1 text-[11px] text-white/60">Hadiah: 🪙 {m.koin}</p>
				</>
			) : (
				<p className="m-0 text-[12.5px] font-semibold">Cerita tamat. Selesaikan urusan dan ikut acara tiap hari.</p>
			)}
			<div className="mt-2 space-y-1.5 border-t border-white/10 pt-2 text-[11.5px]">
				{t && (
					<div className="rounded-lg bg-white/10 px-2 py-1.5">
						<p className="m-0 font-bold">🎫 {formatNomor(t.nomor)} · {t.judul}</p>
						<p className="m-0 mt-0.5 text-white/75">
							{t.fase === "tunggu" ? "Menunggu panggilan" : `Dipanggil · sisa ${menit(t.batas - Date.now())}`}
							{!t.terungkap && " · Cari bidang yang tepat"}
						</p>
					</div>
				)}
				{kantor.kombo > 0 && <p className="m-0 font-bold text-amber-300">🔥 Kombo urusan x{kantor.kombo}</p>}
				{l ? (
					<p className="m-0 font-bold tabular-nums">🏁 Gerbang {l.gerbang}/{GERBANG_JETSKI.length} · {l.mulai ? `${((performance.now() - l.mulai) / 1000).toFixed(1)} dtk` : "siap, lewati garis start"}</p>
				) : (
					<div className="flex items-center justify-between gap-2">
						<span className="min-w-0 font-semibold">
							{acara === "bazar" ? `🎪 Bazar Desa · stempel ${stempel}/${TENDA_BAZAR.length}` : `🏁 Lomba Jetski · rekor ${kantor.rekor != null ? `${kantor.rekor.toFixed(1)} dtk` : "belum ada"}`}
							{tuntas && " ✅"}
						</span>
						{tombolAntar}
					</div>
				)}
			</div>
		</PilMisi>
	);
}

const KONFETI = ["🎉", "✨", "📜", "🪙", "⭐", "🎊"];
export function PerayaanKantor() {
	useKantor();
	const s = kantor.perayaan;
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
