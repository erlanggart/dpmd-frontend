import { Suspense, lazy, useMemo, useState } from "react";
import { GAYA, JENIS_GAYA, cobaGaya, kenakanGaya, pakaiGaya, punya, useLemari } from "../lemari";
import { useKoleksi } from "../pancing";

const angka = (n) => n.toLocaleString("id-ID");
const PratinjauAvatar = lazy(() => import("./PratinjauAvatar"));

// Panel gaya dalam tiga mode:
// - "toko"  : di Distro Gaya — beli pakai koin & langsung pakai;
// - "coba"  : di bilik ruang coba — pakai sementara gratis (dilepas saat keluar bilik),
//             lalu beli yang cocok;
// - "lemari": dari HUD di mana saja — hanya ganti dengan yang sudah dimiliki.
export default function PanelGaya({ mode = "lemari", dasar }) {
	const l = useLemari();
	const { poin: koin } = useKoleksi();
	const [jenis, setJenis] = useState("t");
	const [kabar, setKabar] = useState(null);
	const tampil = l.coba || l.pakai;
	// barang yang diketuk terakhir ikut tampil di pratinjau 3D (belum dibeli pun boleh)
	const [pilih, setPilih] = useState(null);
	const gayaPratinjau = pilih ? { ...tampil, [pilih.k]: pilih.i } : tampil;
	const kunci = JSON.stringify(gayaPratinjau);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const penampilan = useMemo(() => dasar && kenakanGaya(dasar, gayaPratinjau), [dasar, kunci]);

	const beli = (i, item) => {
		const baru = !punya(jenis, i);
		const gagal = pakaiGaya(jenis, i);
		setKabar(gagal ? { ok: false, teks: gagal } : { ok: true, teks: `${item.nama} ${baru ? "dibeli & " : ""}dipakai ✨` });
	};

	return (
		<div>
			<div className="mb-3 flex items-center justify-between rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
				<span className="text-xs font-bold uppercase tracking-wider text-amber-700">Koin Anda</span>
				<span className="text-lg font-black tabular-nums text-amber-900">🪙 {angka(koin)}</span>
			</div>
			{penampilan && (
				<div className="relative mb-3 h-52 overflow-hidden rounded-2xl bg-gradient-to-b from-violet-100 via-slate-50 to-slate-200 ring-1 ring-slate-200">
					<Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-slate-400">Memuat pratinjau…</div>}>
						<PratinjauAvatar penampilan={penampilan} />
					</Suspense>
					{pilih && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow">Pratinjau: {GAYA[pilih.k].isi[pilih.i].nama}</span>}
				</div>
			)}
			{mode === "coba" && <p className="mb-3 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">Ketuk pakaian untuk mencobanya (gratis). Tutup panel untuk melihat diri Anda; keluar bilik = pakaian coba dilepas.</p>}
			{mode === "lemari" && <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Koleksi baru dibeli di 👕 Distro Gaya (sebelah warung mie ayam, seberang kantor) — ada ruang cobanya.</p>}
			<div className="mb-3 grid grid-cols-4 gap-1.5">
				{JENIS_GAYA.map((k) => (
					<button
						key={k}
						onClick={() => {
							setJenis(k);
							setKabar(null);
						}}
						className={`rounded-xl px-2 py-2 text-xs font-bold ${jenis === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
					>
						<span className="block text-lg">{GAYA[k].ikon}</span>
						{GAYA[k].judul}
					</button>
				))}
			</div>
			{kabar && <p className={`mb-3 rounded-xl px-3 py-2 text-sm font-semibold ${kabar.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{kabar.teks}</p>}
			<ul className="space-y-2">
				{GAYA[jenis].isi.map((item, i) => {
					const dipakai = l.pakai[jenis] === i;
					const dicoba = mode === "coba" && tampil[jenis] === i && !dipakai;
					const milik = punya(jenis, i);
					const status = dipakai ? "Sedang dipakai" : dicoba ? "Sedang dicoba" : milik ? "Sudah dimiliki" : `🪙 ${angka(item.harga)}`;
					return (
						<li
							key={i}
							onClick={() => {
								setPilih({ k: jenis, i });
								if (mode === "coba") cobaGaya(jenis, i);
							}}
							className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${dipakai ? "bg-emerald-50 ring-emerald-300" : dicoba ? "bg-violet-50 ring-violet-300" : "bg-slate-50 ring-slate-200"} cursor-pointer ${pilih?.k === jenis && pilih.i === i && !dipakai && !dicoba ? "ring-2 ring-violet-400" : ""}`}
						>
							<span className="h-10 w-10 shrink-0 rounded-xl shadow-inner ring-1 ring-black/10" style={{ background: item.warna || "repeating-linear-gradient(45deg,#e2e8f0 0 6px,#f8fafc 6px 12px)" }} />
							<div className="min-w-0 flex-1">
								<p className="font-bold text-slate-900">{item.nama}</p>
								<p className="text-xs text-slate-500">{status}</p>
							</div>
							{!dipakai && (mode !== "lemari" || milik) && (mode !== "coba" || dicoba || milik) && (
								<button
									disabled={!milik && koin < item.harga}
									onClick={(e) => {
										e.stopPropagation();
										beli(i, item);
									}}
									className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white hover:bg-slate-700 disabled:bg-slate-300 disabled:text-slate-500"
								>
									{milik ? "Pakai" : `Beli 🪙${angka(item.harga)}`}
								</button>
							)}
						</li>
					);
				})}
			</ul>
			<p className="mt-3 text-center text-xs text-slate-500">Gaya Anda terlihat oleh tamu lain saat menjelajah bersama.</p>
		</div>
	);
}
