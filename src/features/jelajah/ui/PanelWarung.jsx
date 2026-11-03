import { useKoleksi } from "../pancing";
import { TENAGA_MAKS, useTenaga } from "../tenaga";
import { WARUNG, itemMenu, pesan, useWarung, warung } from "../warung";

// Daftar menu tempat makan (pecel ayam, McD, kedai kopi): pilih satu, bayar dengan koin,
// lalu duduk di kursi tempat itu — pesanan diantar ke meja.
export default function PanelWarung({ id, onSelesai }) {
	useWarung();
	const { poin: koin } = useKoleksi();
	const tenaga = useTenaga();
	const w = WARUNG[id];
	if (!w) return null;
	const tertunda = warung.pesanan && itemMenu(warung.pesanan.warung, warung.pesanan.item);

	return (
		<div>
			<div className="mb-4 grid grid-cols-2 gap-2">
				<div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
					<p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Koin Anda</p>
					<p className="text-xl font-black tabular-nums text-amber-900">🪙 {koin.toLocaleString("id-ID")}</p>
				</div>
				<div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
					<p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Tenaga</p>
					<p className="text-xl font-black tabular-nums text-emerald-900">
						❤ {tenaga}
						<span className="text-sm font-semibold text-emerald-700">/{TENAGA_MAKS}</span>
					</p>
				</div>
			</div>
			{tertunda && (
				<p className="mb-3 rounded-xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
					{tertunda.ikon} {tertunda.nama} sudah dipesan di {WARUNG[warung.pesanan.warung].nama} — duduk di kursinya untuk menyantap.
				</p>
			)}
			{w.pemasok && (
				<div className="mb-3 rounded-2xl bg-emerald-50/70 p-3 ring-1 ring-emerald-100">
					<p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">🌾 Bahan dari BUM Desa Kab. Bogor</p>
					<ul className="mt-1 space-y-0.5 text-xs text-emerald-900/80">
						{w.pemasok.map((p) => (
							<li key={p}>• {p}</li>
						))}
					</ul>
				</div>
			)}
			<ul className="space-y-2">
				{w.menu.map((m) => {
					const kurang = koin < m.harga;
					return (
						<li key={m.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
							<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-2xl">{m.ikon}</span>
							<span className="min-w-0 flex-1">
								<span className="block text-sm font-bold text-slate-900">{m.nama}</span>
								<span className="block truncate text-xs text-slate-500">{m.ket}</span>
								<span className="mt-0.5 block text-xs font-semibold text-emerald-700">❤ +{m.tenaga} tenaga</span>
							</span>
							<button
								disabled={kurang || !!warung.pesanan}
								onClick={() => {
									pesan(id, m.id);
									onSelesai?.();
								}}
								className="shrink-0 rounded-xl px-3 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-40"
								style={{ background: w.warna }}
							>
								🪙 {m.harga}
							</button>
						</li>
					);
				})}
			</ul>
			<p className="mt-3 text-xs text-slate-500">Setelah memesan, duduk di {w.grup === "pasar" ? "meja mana pun di Pasar BUMDes" : `salah satu kursi ${w.nama}`} — pesanan diantar ke meja dan tenaga terisi saat habis disantap.</p>
		</div>
	);
}
