import { useState } from "react";
import { FiX } from "react-icons/fi";
import { JORAN, beliJoran, tingkatJoran, useKoleksi } from "../pancing";

const angka = (n) => n.toLocaleString("id-ID");

// Toko joran: upgrade berurutan pakai koin. Tiap tingkat melebarkan zona aman tegangan,
// mempercepat gulungan, menguatkan & memanjangkan senar, serta menarik ikan langka.
export default function PanelJoran({ onTutup }) {
	const { poin: koin } = useKoleksi();
	const [kabar, setKabar] = useState(null);
	const kini = tingkatJoran();

	return (
		<div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onTutup}>
			<div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-slate-900 p-5 text-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
				<div className="mb-3 flex items-center justify-between">
					<div>
						<p className="text-lg font-black">🎣 Upgrade Joran</p>
						<p className="text-xs text-slate-400">Koin Anda: 🪙 {angka(koin)}</p>
					</div>
					<button onClick={onTutup} aria-label="Tutup" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
						<FiX />
					</button>
				</div>
				{kabar && <p className={`mb-3 rounded-xl px-3 py-2 text-sm font-semibold ${kabar.ok ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"}`}>{kabar.teks}</p>}
				<ul className="space-y-2">
					{JORAN.map((j, i) => {
						const punya = i <= kini;
						const berikut = i === kini + 1;
						return (
							<li key={j.nama} className={`rounded-2xl p-3 ring-1 ${i === kini ? "bg-amber-400/10 ring-amber-400/60" : "bg-white/5 ring-white/10"}`}>
								<div className="flex items-center gap-3">
									<span className="h-10 w-2 shrink-0 rounded-full" style={{ background: `linear-gradient(${j.ujung}, ${j.warna})` }} />
									<div className="min-w-0 flex-1">
										<p className="font-black">
											Lv {i + 1} · {j.nama} {i === kini && <span className="ml-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] text-slate-950">DIPAKAI</span>}
										</p>
										<p className="text-xs text-slate-400">{j.ket}</p>
										<p className="mt-1 text-[11px] text-slate-300">
											Zona aman +{Math.round(j.lebar * 100)}% · gulung ×{j.gulung} · senar ×{j.senar} · {j.panjang} m · hoki ×{j.hoki}
										</p>
									</div>
									{!punya && (
										<button
											disabled={!berikut || koin < j.harga}
											onClick={() => {
												const gagal = beliJoran(i);
												setKabar(gagal ? { ok: false, teks: gagal } : { ok: true, teks: `${j.nama} siap dipakai!` });
											}}
											className="shrink-0 rounded-xl bg-amber-400 px-3 py-2 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:bg-slate-700 disabled:text-slate-400"
										>
											🪙 {angka(j.harga)}
										</button>
									)}
								</div>
							</li>
						);
					})}
				</ul>
				<p className="mt-3 text-center text-[11px] text-slate-400">Upgrade berurutan. Koin dari memancing, peti hadiah di kantor, dan… keberuntungan.</p>
			</div>
		</div>
	);
}
