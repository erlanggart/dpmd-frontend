import { useEffect, useRef } from "react";
import { CHECKPOINT, balap, useBalap } from "../balap";
import { useProgres } from "../progres";

// HUD balapan motor: hitung mundur besar, stopwatch, gerbang cek, rekor, dan hasil finis.
export default function HudBalap() {
	useBalap();
	const { balap: rekor } = useProgres();
	const jam = useRef();
	const hitung = useRef();

	useEffect(() => {
		let id;
		const putar = () => {
			const kini = performance.now();
			if (jam.current && balap.fase === "jalan") jam.current.textContent = ((kini - balap.mulai) / 1000).toFixed(2);
			if (hitung.current && balap.fase === "hitung") {
				const s = Math.ceil((balap.hitungSampai - kini) / 1000);
				hitung.current.textContent = s > 0 ? String(s) : "GO!";
			}
			id = requestAnimationFrame(putar);
		};
		id = requestAnimationFrame(putar);
		return () => cancelAnimationFrame(id);
	}, []);

	if (!balap.fase && !balap.hasil) return null;
	return (
		<div className="pointer-events-none absolute inset-x-0 top-36 z-20 flex flex-col items-center gap-2 sm:top-32">
			{balap.fase === "hitung" && (
				<span ref={hitung} className="text-8xl font-black text-amber-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
					3
				</span>
			)}
			{balap.fase === "jalan" && (
				<div className="flex items-center gap-3 rounded-2xl bg-slate-950/75 px-4 py-2 text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
					<span className="text-2xl font-black tabular-nums">
						⏱ <span ref={jam}>0.00</span>
					</span>
					<span className="text-sm font-bold text-amber-300">
						🏁 {balap.cp}/{CHECKPOINT.length}
					</span>
					{rekor != null && <span className="text-xs text-slate-300">rekor {rekor.toFixed(2)}</span>}
				</div>
			)}
			{balap.hasil && (
				<div className="rounded-2xl bg-slate-950/80 px-5 py-3 text-center text-white shadow-xl ring-2 ring-amber-400">
					<p className="text-xs font-bold uppercase tracking-widest text-amber-300">{balap.hasil.rekor ? "Rekor baru!" : "Finis"}</p>
					<p className="text-3xl font-black tabular-nums">{balap.hasil.detik.toFixed(2)} dtk</p>
					<p className="text-sm text-amber-200">+🪙 {balap.hasil.koin} · +⭐ 60 XP</p>
				</div>
			)}
		</div>
	);
}
