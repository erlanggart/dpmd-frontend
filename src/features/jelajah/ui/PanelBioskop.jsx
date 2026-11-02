import { HARGA_TIKET, beliTiket, bioskop, useBioskop } from "../bioskop";
import { FILM, durasiFilm } from "../film";
import { useKoleksi } from "../pancing";

// Loket bioskop CCM (Lt 4): pilih satu dari film sejarah Kabupaten Bogor, bayar tiket,
// lalu duduk di kursi studio mana saja.
export default function PanelBioskop({ onSelesai }) {
	useBioskop();
	const { poin: koin } = useKoleksi();
	const punya = bioskop.tiket;

	return (
		<div>
			<div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-300">Studio 1 · Lt 4</p>
					<p className="text-sm font-semibold">Film sejarah Kabupaten Bogor</p>
				</div>
				<span className="rounded-full bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-300">🪙 {koin.toLocaleString("id-ID")}</span>
			</div>
			<ul className="space-y-2.5">
				{FILM.map((f) => {
					const menit = Math.round(durasiFilm(f));
					const milik = punya === f.id;
					return (
						<li key={f.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-shadow hover:shadow-sm">
							<span className="flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-2xl text-white shadow-inner" style={{ background: `linear-gradient(160deg, ${f.warna}, #0f172a)` }}>
								{f.ikon}
							</span>
							<span className="min-w-0 flex-1">
								<span className="block text-sm font-bold text-slate-900">{f.judul}</span>
								<span className="block text-xs text-slate-500">{f.zaman}</span>
								<span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">⏱ ±{menit} detik · narasi bersuara</span>
							</span>
							<button
								disabled={(!!punya && !milik) || koin < HARGA_TIKET}
								onClick={() => {
									if (!milik) beliTiket(f.id);
									onSelesai?.();
								}}
								className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-bold shadow-sm transition disabled:opacity-40 ${milik ? "bg-emerald-500 text-white" : "bg-violet-600 text-white hover:bg-violet-700"}`}
							>
								{milik ? "Tiketmu ✓" : `🎟️ ${HARGA_TIKET}`}
							</button>
						</li>
					);
				})}
			</ul>
			<p className="mt-3 text-xs leading-relaxed text-slate-500">Setelah membeli tiket, masuk Studio 1 di sebelah loket lalu duduk. Film diputar dengan narasi bersuara; boleh ditinggal berdiri dan dilanjutkan kapan saja.</p>
		</div>
	);
}
