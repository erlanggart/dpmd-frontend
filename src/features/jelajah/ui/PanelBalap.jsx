import { TREK, mulaiBalap } from "../balap";
import { useProgres } from "../progres";

const formatWaktu = (d) => (d >= 60 ? `${Math.floor(d / 60)}:${(d % 60).toFixed(2).padStart(5, "0")}` : d.toFixed(2));

// Garis start balapan motor: pilih trek (sprint pendek atau sirkuit kawasan) lalu mulai.
export default function PanelBalap({ onMulai }) {
	const { rekor } = useProgres();
	return (
		<div className="space-y-3">
			{Object.values(TREK).map((t) => (
				<div key={t.id} className={`overflow-hidden rounded-2xl ring-1 ${t.id === "sirkuit" ? "bg-gradient-to-br from-slate-900 to-indigo-950 text-white ring-indigo-500" : "bg-slate-50 ring-slate-200"}`}>
					<div className="p-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-lg font-black">{t.id === "sirkuit" ? "🏁" : "🏍️"} {t.nama}</p>
								<p className={`text-xs ${t.id === "sirkuit" ? "text-indigo-200" : "text-slate-500"}`}>{t.ket}</p>
							</div>
							{t.id === "sirkuit" && <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">BARU</span>}
						</div>
						<div className="mt-3 grid grid-cols-3 gap-2 text-center">
							{[
								[`${(t.panjang / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`, "panjang"],
								[`${t.gerbang.length}`, "gerbang"],
								[rekor?.[t.id] != null ? formatWaktu(rekor[t.id]) : "—", "rekor Anda"],
							].map(([nilai, label]) => (
								<div key={label} className={`rounded-xl py-2 ${t.id === "sirkuit" ? "bg-white/10" : "bg-white ring-1 ring-slate-200"}`}>
									<p className="text-base font-black tabular-nums">{nilai}</p>
									<p className={`text-[10px] uppercase tracking-wider ${t.id === "sirkuit" ? "text-indigo-200" : "text-slate-400"}`}>{label}</p>
								</div>
							))}
						</div>
						<button
							onClick={() => {
								mulaiBalap(t.id);
								onMulai?.();
							}}
							className={`mt-3 w-full rounded-xl py-3 text-sm font-black shadow ${t.id === "sirkuit" ? "bg-amber-400 text-slate-950 hover:bg-amber-300" : "bg-rose-600 text-white hover:bg-rose-500"}`}
						>
							Mulai · hadiah 🪙 {t.hadiah[0]}–{t.hadiah[1]} · ⭐ {t.xp} XP
						</button>
					</div>
				</div>
			))}
			<p className="text-center text-xs text-slate-500">Ikuti panah kuning di atas kepala & cincin gerbang berikutnya. Turun dari motor = balapan batal.</p>
		</div>
	);
}
