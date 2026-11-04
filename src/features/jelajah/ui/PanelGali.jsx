import { KOMODITAS, kebun, pengaliGali, perkiraanAngkut, risikoGali, useKebun } from "../kebun";

/*
 * Panel Gali Dalam (Tambang): menampilkan kedalaman, perkiraan hasil, dan risiko
 * runtuh, lalu pemain memilih terus menggali atau mengangkut sekarang.
 */

export default function PanelGali({ i, sentuh, onGali, onAngkut }) {
	useKebun();
	const p = kebun.petak[i];
	if (!p || p.tahap !== "siap") return null;
	const k = KOMODITAS[p.k] || KOMODITAS[kebun.komoditas];
	const pct = Math.round(risikoGali(p) * 100);
	const warna = pct < 20 ? "bg-emerald-400" : pct < 40 ? "bg-amber-400" : "bg-rose-500 animate-pulse";
	return (
		<div className="pointer-events-auto w-[min(24rem,92vw)] rounded-2xl bg-slate-950/90 p-3 text-white shadow-2xl ring-2 ring-amber-400">
			<div className="flex items-center justify-between">
				<span className="text-[14px] font-extrabold">⛏️ Kedalaman {p.dalam || 0}</span>
				<span className="text-[18px] font-black text-amber-300">x{pengaliGali(p).toFixed(1)}</span>
			</div>
			<p className="m-0 mt-1 text-[13px] font-semibold text-white/90">Bila diangkut: {perkiraanAngkut(p)} {k.satuan} {k.nama.toLowerCase()}</p>
			<div className="mt-2">
				<div className="mb-1 text-[12px] font-bold text-white/80">Risiko runtuh {pct}%</div>
				<div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
					<div className={`h-full rounded-full ${warna}`} style={{ width: `${pct}%` }} />
				</div>
			</div>
			<div className="mt-3 flex gap-2">
				<button type="button" onClick={onGali} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 text-[14px] font-extrabold text-white active:scale-95">
					⛏️ Gali lagi
					{!sentuh && <kbd className="rounded bg-black/30 px-1.5 text-[12px]">E</kbd>}
				</button>
				<button type="button" onClick={onAngkut} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-[14px] font-extrabold text-slate-950 active:scale-95">
					🧺 Angkut
					{!sentuh && <kbd className="rounded bg-black/15 px-1.5 text-[12px]">F</kbd>}
				</button>
			</div>
			<p className="m-0 mt-2 text-[11px] text-white/60">Runtuh: hasil galian ini hilang dan kombo putus.</p>
		</div>
	);
}
