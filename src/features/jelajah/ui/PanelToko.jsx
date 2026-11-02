import { useState } from "react";
import { useKoleksi } from "../pancing";
import { TENAGA_MAKS, useTenaga } from "../tenaga";
import { BARANG, beli } from "../toko";

const angka = (n) => n.toLocaleString("id-ID");

// Isi panel belanja minimarket: saldo koin, tenaga sekarang, dan barang yang langsung
// dimakan/diminum saat dibeli.
export default function PanelToko() {
	const { poin: koin } = useKoleksi();
	const tenaga = useTenaga();
	const [kabar, setKabar] = useState(null);

	return (
		<div>
			<div className="mb-4 grid grid-cols-2 gap-2">
				<div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
					<p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Koin Anda</p>
					<p className="text-xl font-black tabular-nums text-amber-900">🪙 {angka(koin)}</p>
				</div>
				<div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
					<p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Tenaga</p>
					<p className="text-xl font-black tabular-nums text-emerald-900">
						❤ {tenaga}
						<span className="text-sm font-semibold text-emerald-700">/{TENAGA_MAKS}</span>
					</p>
				</div>
			</div>
			{kabar && <p className={`mb-3 rounded-xl px-3 py-2 text-sm font-semibold ${kabar.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{kabar.teks}</p>}
			<ul className="space-y-2">
				{BARANG.map((b) => {
					const kurang = koin < b.harga;
					return (
						<li key={b.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
							<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">{b.ikon}</span>
							<div className="min-w-0 flex-1">
								<p className="font-bold text-slate-900">{b.nama}</p>
								<p className="truncate text-xs text-slate-500">
									{b.ket} · <b className="text-emerald-700">+{b.tenaga} tenaga</b>
								</p>
							</div>
							<button
								onClick={() => {
									const gagal = beli(b.id);
									setKabar(gagal ? { ok: false, teks: gagal } : { ok: true, teks: `${b.ikon} ${b.nama} habis dinikmati. Tenaga +${b.tenaga}!` });
								}}
								disabled={kurang}
								className="shrink-0 rounded-xl bg-red-600 px-3 py-2 text-sm font-black text-white shadow hover:bg-red-500 disabled:bg-slate-300 disabled:text-slate-500"
							>
								🪙 {b.harga}
							</button>
						</li>
					);
				})}
			</ul>
			<p className="mt-4 text-center text-xs text-slate-500">Koin didapat dari memancing di Situ Pemda — makin langka ikannya, makin banyak koinnya.</p>
		</div>
	);
}
