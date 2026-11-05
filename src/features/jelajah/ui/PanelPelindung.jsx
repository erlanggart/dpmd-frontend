import { useState } from "react";
import { useKoleksi } from "../pancing";
import { PELINDUNG, beliPelindung, useMilikHujan } from "../pelindungHujan";
import { TENAGA_MAKS, useTenaga } from "../tenaga";

// Etalase abang payung: beli payung lipat / jas hujan dengan koin. Sekali beli, dipakai
// otomatis saat hujan (lihat pelindungHujan.js).
export default function PanelPelindung() {
	const milik = useMilikHujan();
	const { poin: koin } = useKoleksi();
	const tenaga = useTenaga();
	const [gagal, setGagal] = useState("");

	return (
		<div>
			<p className="mb-3 rounded-2xl bg-sky-50 px-3 py-2.5 text-sm text-sky-900 ring-1 ring-sky-100">
				🧑 <span className="font-semibold">Abang:</span> Payung, payung! Jas hujan juga ada, Kak. Daripada kehujanan, tenaga habis.
			</p>
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
			<ul className="space-y-2">
				{Object.values(PELINDUNG).map((p) => {
					const punya = milik[p.id];
					return (
						<li key={p.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
							<span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-4xl">{p.ikon}</span>
							<span className="min-w-0 flex-1">
								<span className="block text-sm font-bold text-slate-900">{p.nama}</span>
								<span className="block text-xs font-semibold text-emerald-700">✓ {p.bisa}</span>
								{p.tidak && <span className="block text-xs text-slate-500">✕ {p.tidak}</span>}
							</span>
							<button
								disabled={punya || koin < p.harga}
								onClick={() => setGagal(beliPelindung(p.id).pesan || "")}
								className="shrink-0 rounded-xl bg-sky-700 px-3 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-40"
							>
								{punya ? "Dimiliki" : `🪙 ${p.harga}`}
							</button>
						</li>
					);
				})}
			</ul>
			{gagal && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{gagal}</p>}
			<p className="mt-3 text-xs text-slate-500">Disimpan di tas dan dipakai otomatis saat hujan. Sekali beli, tidak habis.</p>
		</div>
	);
}
