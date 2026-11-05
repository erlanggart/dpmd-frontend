import { useState } from "react";
import { BARANG_PER_ID, bayar, belanja, keluarkanSatu, makan, rekapKeranjang, totalKeranjang, useBelanja } from "../belanja";
import { useKoleksi } from "../pancing";
import { PELINDUNG, useMilikHujan, useStatusHujan } from "../pelindungHujan";
import { TENAGA_MAKS, useTenaga } from "../tenaga";

const angka = (n) => n.toLocaleString("id-ID");

function Saldo() {
	const { poin: koin } = useKoleksi();
	const tenaga = useTenaga();
	return (
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
	);
}

const Kabar = ({ kabar }) =>
	kabar && <p className={`mb-3 rounded-xl px-3 py-2 text-sm font-semibold ${kabar.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{kabar.teks}</p>;

// Meja kasir: isi keranjang dihitung, barang bisa dikembalikan satu per satu, lalu dibayar
// pakai koin. Setelah lunas, belanjaan pindah ke tas.
export function PanelKasir({ onSelesai }) {
	useBelanja();
	const { poin: koin } = useKoleksi();
	const [kabar, setKabar] = useState(null);
	const rekap = Object.entries(rekapKeranjang());
	const total = totalKeranjang();

	return (
		<div>
			<Saldo />
			<Kabar kabar={kabar} />
			{rekap.length ? (
				<ul className="space-y-2">
					{rekap.map(([id, n]) => {
						const b = BARANG_PER_ID[id];
						return (
							<li key={id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
								<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">{b.ikon}</span>
								<div className="min-w-0 flex-1">
									<p className="font-bold text-slate-900">
										{b.nama} <span className="text-slate-500">× {n}</span>
									</p>
									<p className="text-xs text-slate-500">
										🪙 {b.harga} / buah · <b className="text-slate-700">🪙 {angka(b.harga * n)}</b>
									</p>
								</div>
								<button
									onClick={() => keluarkanSatu(id)}
									className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
								>
									Kembalikan 1
								</button>
							</li>
						);
					})}
				</ul>
			) : (
				<p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">
					{belanja.bawaKeranjang ? "Keranjang masih kosong. Ambil barang dari rak dulu." : "Ambil keranjang di dekat pintu, lalu pilih barang di rak."}
				</p>
			)}
			<div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
				<span className="text-sm font-semibold text-slate-300">Total</span>
				<span className={`text-2xl font-black tabular-nums ${total > koin ? "text-rose-300" : ""}`}>🪙 {angka(total)}</span>
			</div>
			<button
				onClick={() => {
					const gagal = bayar();
					if (gagal) setKabar({ ok: false, teks: gagal });
					else onSelesai?.();
				}}
				disabled={!total}
				className="mt-3 w-full rounded-2xl bg-red-600 py-3 text-base font-black text-white shadow hover:bg-red-500 disabled:bg-slate-300 disabled:text-slate-500"
			>
				Bayar sekarang
			</button>
			<p className="mt-3 text-center text-xs text-slate-500">Koin didapat dari memancing di Situ Pemda — makin langka ikannya, makin banyak koinnya.</p>
		</div>
	);
}

// Tas: belanjaan yang sudah dibayar, dimakan/diminum kapan saja untuk mengisi tenaga,
// serta payung & jas hujan yang sudah dibeli (dipakai otomatis, tidak habis).
export function PanelTas() {
	useBelanja();
	const [kabar, setKabar] = useState(null);
	const isi = Object.entries(belanja.tas).filter(([id, n]) => n > 0 && BARANG_PER_ID[id]);
	const milikHujan = useMilikHujan();
	const dipakai = useStatusHujan();
	const pelindung = Object.values(PELINDUNG).filter((p) => milikHujan[p.id]);

	return (
		<div>
			<Saldo />
			<Kabar kabar={kabar} />
			{pelindung.length > 0 && (
				<ul className="mb-2 space-y-2">
					{pelindung.map((p) => (
						<li key={p.id} className="flex items-center gap-3 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-100">
							<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">{p.ikon}</span>
							<div className="min-w-0 flex-1">
								<p className="font-bold text-slate-900">{p.nama}</p>
								<p className="text-xs text-slate-500">{dipakai === p.id ? <b className="text-sky-700">Sedang dipakai</b> : "Dipakai otomatis saat hujan"}</p>
							</div>
						</li>
					))}
				</ul>
			)}
			{isi.length ? (
				<ul className="space-y-2">
					{isi.map(([id, n]) => {
						const b = BARANG_PER_ID[id];
						return (
							<li key={id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
								<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">{b.ikon}</span>
								<div className="min-w-0 flex-1">
									<p className="font-bold text-slate-900">
										{b.nama} <span className="text-slate-500">× {n}</span>
									</p>
									<p className="truncate text-xs text-slate-500">
										{b.ket} · <b className="text-emerald-700">+{b.tenaga} tenaga</b>
									</p>
								</div>
								<button
									onClick={() => {
										const gagal = makan(id);
										setKabar(gagal ? { ok: false, teks: gagal } : { ok: true, teks: `${b.ikon} ${b.nama} habis dinikmati. Tenaga +${b.tenaga}!` });
									}}
									className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white shadow hover:bg-emerald-500"
								>
									{b.olah ? "Masak & makan" : b.bentuk === "botol" || b.bentuk === "kaleng" ? "Minum" : "Makan"}
								</button>
							</li>
						);
					})}
				</ul>
			) : (
				<p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">{pelindung.length ? "Belum ada makanan di tas." : "Tas masih kosong."} Belanja di Alfamart atau Koperasi Desa Merah Putih seberang kantor pakai koin hasil memancing.</p>
			)}
		</div>
	);
}
