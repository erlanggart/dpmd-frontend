import { useState } from "react";
import { BARANG_WARUNG, KOMODITAS, barangUsaha, beliBenih, beliDiWarung, benihDijual, hargaBenih, kebun, punyaAlat, useKebun } from "../kebun";
import { usahaKini } from "../usahaWilayah";
import { useKoleksi } from "../pancing";
import { useTenaga } from "../tenaga";

/* Warung Bu Imas: makanan pengisi tenaga, bahan, dan alat sesuai usaha kecamatan. */

export default function PanelWarungDesa() {
	useKebun();
	const tenaga = useTenaga();
	const koin = useKoleksi().poin;
	const [tab, setTab] = useState(tenaga < 50 ? "makan" : "tani");
	const u = usahaKini();
	const TAB = [{ id: "makan", nama: "🍱 Makan" }, { id: "tani", nama: u.tabIsi }, { id: "alat", nama: "🧰 Alat" }];
	const barang = BARANG_WARUNG.map(barangUsaha);
	const [pesan, setPesan] = useState(null);
	const lapor = (h) => setPesan({ ...h, id: Date.now() });

	const kartu = ({ kunci, ikon, nama, teks, harga, punya, onBeli, info }) => (
		<li key={kunci} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
			<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">{ikon}</span>
			<span className="min-w-0 flex-1">
				<span className="block text-[14px] font-bold text-slate-900">{nama}</span>
				{(teks || info) && <span className="block text-[12px] leading-snug text-slate-500">{info ? <b className="text-emerald-700">{info} </b> : null}{teks}</span>}
			</span>
			<button type="button" disabled={punya || koin < harga} onClick={onBeli}
				className="shrink-0 rounded-xl bg-amber-400 px-3 py-2 text-[13px] font-extrabold text-slate-900 hover:bg-amber-300 disabled:bg-slate-200 disabled:text-slate-500">
				{punya ? "Dimiliki" : `🪙 ${harga}`}
			</button>
		</li>
	);

	const benihLain = benihDijual();

	return (
		<div>
			<div className="mb-3 flex items-start gap-3 rounded-2xl bg-rose-50 p-3">
				<span className="text-3xl">🧕</span>
				<p className="m-0 text-[13px] leading-snug text-rose-900">
					<b>Bu Imas:</b> {tenaga < 30 ? "Aduh, pucat pisan! Makan dulu atuh, nanti pingsan." : `Mangga, silakan dipilih. Semuanya buat ${u.pekerja} rajin!`}
				</p>
			</div>
			<div className="mb-3 flex items-center justify-between text-[13px]">
				<span className="font-semibold text-slate-600">❤ Tenaga <b className="text-slate-900">{tenaga}</b>/100</span>
				<span className="rounded-lg bg-amber-100 px-2 py-1 font-extrabold text-amber-800">🪙 {koin}</span>
			</div>
			<div className="mb-3 flex gap-1.5 rounded-xl bg-slate-100 p-1">
				{TAB.map((t) => (
					<button key={t.id} type="button" onClick={() => setTab(t.id)}
						className={`flex-1 rounded-lg px-2 py-1.5 text-[12.5px] font-bold ${tab === t.id ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}>
						{t.nama}
					</button>
				))}
			</div>
			{pesan && (
				<p key={pesan.id} className={`m-0 mb-3 rounded-xl px-3 py-2 text-[13px] font-semibold ${pesan.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{pesan.pesan}</p>
			)}
			<ul className="m-0 list-none space-y-2 p-0">
				{tab === "makan" && barang.filter((b) => b.jenis === "makan").map((b) => kartu({
					kunci: b.id, ikon: b.ikon, nama: b.nama, info: `+${b.tenaga} tenaga`, harga: b.harga, onBeli: () => lapor(beliDiWarung(b.id)),
				}))}
				{tab === "tani" && (
					<>
						{barang.filter((b) => b.jenis === "habis").map((b) => kartu({
							kunci: b.id, ikon: b.ikon, nama: b.nama, teks: b.teks, info: kebun.pupuk ? `Stok ${kebun.pupuk}.` : null, harga: b.harga, onBeli: () => lapor(beliDiWarung(b.id)),
						}))}
						<li className="px-1 pt-2 text-[12px] font-bold uppercase tracking-wide text-slate-400">{benihLain.length ? `${u.katBenih} lain (isi 4) · ` : ""}{u.isi.bibit} {KOMODITAS[kebun.komoditas].nama.toLowerCase()} gratis</li>
						{benihLain.map((kom) => {
							const k = KOMODITAS[kom];
							return kartu({
								kunci: kom, ikon: k.ikon, nama: `${u.katBenih} ${k.nama.toLowerCase()}`,
								teks: `Hasil ${k.hasil} ${k.satuan} × 🪙 ${k.harga}${k.ulang ? " · berulang" : ""}`,
								info: kebun.benih[kom] ? `Punya ${kebun.benih[kom]}.` : null,
								harga: hargaBenih(kom), onBeli: () => lapor(beliBenih(kom)),
							});
						})}
					</>
				)}
				{tab === "alat" && barang.filter((b) => b.jenis === "alat").map((b) => kartu({
					kunci: b.id, ikon: b.ikon, nama: b.nama, teks: b.teks, harga: b.harga, punya: punyaAlat(b.id), onBeli: () => lapor(beliDiWarung(b.id)),
				}))}
			</ul>
			<p className="m-0 mt-3 text-center text-[11.5px] text-slate-400">Koin didapat dari menjual {u.panen.hasil} ke Pak Sobari.</p>
		</div>
	);
}
