import { useEffect, useRef } from "react";
import { balap, trekKini, useBalap } from "../balap";
import { posisi } from "../jelajahStore";
import { useProgres } from "../progres";

const formatWaktu = (d) => (d >= 60 ? `${Math.floor(d / 60)}:${(d % 60).toFixed(2).padStart(5, "0")}` : d.toFixed(2));

// HUD balapan motor: hitung mundur besar, stopwatch, gerbang cek & jarak ke gerbang
// berikutnya (dengan panah arah relatif hadap pemain), rekor trek, dan hasil finis.
export default function HudBalap() {
	useBalap();
	const { rekor } = useProgres();
	const jam = useRef();
	const hitung = useRef();
	const jarak = useRef();
	const panah = useRef();
	const t = trekKini();

	useEffect(() => {
		let id;
		const putar = () => {
			const kini = performance.now();
			if (jam.current && balap.fase === "jalan") jam.current.textContent = formatWaktu((kini - balap.mulai) / 1000);
			if (hitung.current && balap.fase === "hitung") {
				const s = Math.ceil((balap.hitungSampai - kini) / 1000);
				hitung.current.textContent = s > 0 ? String(s) : "GO!";
			}
			const cp = balap.fase === "jalan" && trekKini().gerbang[balap.cp];
			if (cp && jarak.current) {
				const dx = cp.x - posisi.x;
				const dz = cp.z - posisi.z;
				jarak.current.textContent = `${Math.round(Math.hypot(dx, dz))} m`;
				// arah gerbang relatif hadap pemain (0 = lurus ke depan)
				const relatif = Math.atan2(dx, dz) - (posisi.rot ?? 0);
				panah.current.style.transform = `rotate(${-relatif}rad)`;
			}
			id = requestAnimationFrame(putar);
		};
		id = requestAnimationFrame(putar);
		return () => cancelAnimationFrame(id);
	}, []);

	if (!balap.fase && !balap.hasil) return null;
	const rekorTrek = rekor?.[t.id];
	return (
		<div className="pointer-events-none absolute inset-x-0 top-36 z-20 flex flex-col items-center gap-2 sm:top-32">
			{balap.fase === "hitung" && (
				<>
					<p className="rounded-full bg-slate-950/70 px-4 py-1 text-sm font-bold text-white">
						{t.nama} · {(t.panjang / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km · {t.gerbang.length} gerbang
					</p>
					<span ref={hitung} className="text-8xl font-black text-amber-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
						3
					</span>
				</>
			)}
			{balap.fase === "jalan" && (
				<div className="flex items-center gap-3 rounded-2xl bg-slate-950/75 px-4 py-2 text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
					<span className="text-2xl font-black tabular-nums">
						⏱ <span ref={jam}>0.00</span>
					</span>
					<span className="flex items-center gap-1.5 rounded-xl bg-amber-400/20 px-2 py-1 text-sm font-black text-amber-300">
						<span ref={panah} className="inline-block text-lg leading-none">
							⬆
						</span>
						<span ref={jarak} className="tabular-nums">
							–
						</span>
					</span>
					<span className="text-sm font-bold text-amber-300">
						🏁 {balap.cp}/{t.gerbang.length}
					</span>
					{rekorTrek != null && <span className="hidden text-xs text-slate-300 sm:inline">rekor {formatWaktu(rekorTrek)}</span>}
				</div>
			)}
			{balap.fase === "jalan" && (
				<div className="h-1.5 w-56 overflow-hidden rounded-full bg-slate-950/50">
					<div className="h-full bg-amber-400 transition-all" style={{ width: `${(balap.cp / t.gerbang.length) * 100}%` }} />
				</div>
			)}
			{balap.hasil && (
				<div className="rounded-2xl bg-slate-950/80 px-5 py-3 text-center text-white shadow-xl ring-2 ring-amber-400">
					<p className="text-xs font-bold uppercase tracking-widest text-amber-300">
						{balap.hasil.trek} · {balap.hasil.rekor ? "Rekor baru!" : "Finis"}
					</p>
					<p className="text-3xl font-black tabular-nums">{formatWaktu(balap.hasil.detik)} dtk</p>
					<p className="text-sm text-amber-200">
						+🪙 {balap.hasil.koin} · +⭐ {balap.hasil.xp} XP
					</p>
				</div>
			)}
		</div>
	);
}
