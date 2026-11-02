import { useEffect, useState } from "react";
import { MISI_PER_ID, klaimMisi, levelDari, segarkanMisi, useProgres, xpUntukLevel } from "../progres";

const angka = (n) => n.toLocaleString("id-ID");

function sisaHari() {
	const kini = new Date();
	const besok = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate() + 1);
	const m = Math.max(0, Math.floor((besok - kini) / 60000));
	return `${Math.floor(m / 60)} j ${m % 60} m`;
}

// Level & XP tamu, tiga misi harian (berganti tengah malam), dan rekor balapan motor.
export default function PanelMisi() {
	const p = useProgres();
	const [, setDetak] = useState(0);
	useEffect(() => {
		segarkanMisi();
		const t = setInterval(() => setDetak((d) => d + 1), 30000);
		return () => clearInterval(t);
	}, []);
	const lv = levelDari(p.xp);
	const awal = xpUntukLevel(lv);
	const akhir = xpUntukLevel(lv + 1);
	const persen = ((p.xp - awal) / (akhir - awal)) * 100;

	return (
		<div>
			<div className="mb-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white shadow-lg">
				<div className="flex items-end justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-wider text-indigo-200">Level Anda</p>
						<p className="text-4xl font-black">⭐ {lv}</p>
					</div>
					<p className="text-right text-xs text-indigo-100">
						{angka(p.xp - awal)} / {angka(akhir - awal)} XP
						<br />
						menuju Level {lv + 1}
					</p>
				</div>
				<div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20">
					<div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${persen}%` }} />
				</div>
				{p.balap != null && <p className="mt-3 text-xs text-indigo-100">🏍️ Rekor balapan motor: <b className="text-white">{p.balap.toFixed(2)} dtk</b></p>}
			</div>
			<div className="mb-2 flex items-center justify-between">
				<p className="text-sm font-black text-slate-800">📋 Misi hari ini</p>
				<p className="text-xs text-slate-500">berganti dalam {sisaHari()}</p>
			</div>
			<ul className="space-y-2">
				{p.misi.map((m) => {
					const def = MISI_PER_ID[m.id];
					if (!def) return null;
					const selesai = m.n >= def.target;
					return (
						<li key={m.id} className={`rounded-2xl p-3 ring-1 ${m.diklaim ? "bg-slate-50 ring-slate-200 opacity-70" : selesai ? "bg-emerald-50 ring-emerald-300" : "bg-white ring-slate-200"}`}>
							<div className="flex items-center gap-3">
								<div className="min-w-0 flex-1">
									<p className="font-bold text-slate-900">{def.teks}</p>
									<p className="text-xs text-slate-500">
										Hadiah 🪙 {def.koin} · ⭐ {def.xp} XP
									</p>
									<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
										<div className={`h-full rounded-full ${selesai ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(100, (m.n / def.target) * 100)}%` }} />
									</div>
									<p className="mt-1 text-[11px] tabular-nums text-slate-500">
										{angka(Math.min(m.n, def.target))} / {angka(def.target)}
									</p>
								</div>
								{m.diklaim ? (
									<span className="shrink-0 text-xs font-bold text-slate-400">✓ Diklaim</span>
								) : (
									<button
										disabled={!selesai}
										onClick={() => klaimMisi(m.id)}
										className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400"
									>
										Klaim
									</button>
								)}
							</div>
						</li>
					);
				})}
			</ul>
			<p className="mt-3 text-center text-xs text-slate-500">XP juga didapat dari memancing, membuka peti, belanja, dan balapan motor.</p>
		</div>
	);
}
