import { useState } from "react";
import { KOMODITAS, hargaJual, jualKePengepul, kebun, kirimPesananKab, useKebun } from "../kebun";
import { pengaliBumdes, pesananHariIni, teksPesanan, useBangun } from "../bangunWilayah";
import { usahaKini } from "../usahaWilayah";

/* Meja pembeli hasil usaha: jual semua bawaan, penuhi pesanan untuk bonus. */
export default function PanelPengepul({ onTutup }) {
	useKebun();
	useBangun();
	const [hasil, setHasil] = useState(null);
	const bawa = Object.entries(kebun.bawa).filter(([, n]) => n > 0);
	const ps = kebun.pesanan;
	const u = usahaKini();
	const pesananKab = pesananHariIni().filter((p) => !p.selesai && ((kebun.bawa[p.kom] || 0) > 0 || p.kom === kebun.komoditas));
	const bonusBumdes = Math.round((pengaliBumdes(kebun.kecamatan) - 1) * 100);

	if (hasil) {
		return (
			<div className="text-center">
				<p className="m-0 text-4xl">🪙</p>
				<p className="m-0 mt-1 text-2xl font-extrabold text-slate-900">+{hasil.total} koin</p>
				<ul className="m-0 mt-3 list-none space-y-1 p-0 text-[14px] text-slate-700">
					{hasil.rincian.map((r) => <li key={r.nama}>{r.ikon} {r.n} {r.satuan} {r.nama.toLowerCase()}: {r.koin} koin</li>)}
					{hasil.bonus > 0 && <li className="font-bold text-amber-700">Bonus pesanan: {hasil.bonus} koin</li>}
				</ul>
				{hasil.naik && (
					<div className="mt-3 rounded-xl bg-lime-100 p-3 text-left text-slate-900">
						<p className="m-0 font-extrabold">Naik ke tingkat {hasil.naik}!</p>
						{hasil.terbuka.map((p) => <p key={p.tingkat} className="m-0 text-[13px]">Terbuka: {p.teks}</p>)}
					</div>
				)}
				<button type="button" onClick={onTutup} className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800">{u.pembeli.kembali}</button>
			</div>
		);
	}

	return (
		<div>
			<div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-3">
				<span className="text-3xl">{u.pembeli.ikon}</span>
				<p className="m-0 text-[13px] leading-snug text-emerald-900"><b>Pak Sobari:</b> {bawa.length ? u.pembeli.ada : u.pembeli.kosong}</p>
			</div>
			<ul className="m-0 mt-3 list-none space-y-2 p-0">
				{bawa.length === 0 && <li className="rounded-xl bg-slate-100 p-3 text-[14px] text-slate-500">Belum ada {u.panen.hasil}.</li>}
				{bawa.map(([kom, n]) => {
					const k = KOMODITAS[kom];
					return (
						<li key={kom} className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2.5 text-[14px]">
							<span>{k.ikon} {n} {k.satuan} {k.nama.toLowerCase()}</span>
							<span className="font-bold text-slate-900">{hargaJual(kom, n)} koin</span>
						</li>
					);
				})}
			</ul>
			{ps && (
				<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
					<b>Pesanan:</b> {ps.jumlah} {KOMODITAS[ps.komoditas].satuan} {KOMODITAS[ps.komoditas].nama.toLowerCase()}, bonus {ps.bonus} koin.
					{(kebun.bawa[ps.komoditas] || 0) >= ps.jumlah ? " Bawaanmu cukup!" : ` Kurang ${ps.jumlah - (kebun.bawa[ps.komoditas] || 0)}.`}
				</div>
			)}
			{pesananKab.map((p) => {
				const punya = kebun.bawa[p.kom] || 0;
				return (
					<div key={p.id} className="mt-3 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-[13px] text-sky-900">
						<div className="min-w-0 flex-1">
							<p className="m-0 break-words font-semibold">📦 {teksPesanan(p)}</p>
							<p className="m-0 text-[12px]">Hadiah 🪙 {p.koin}</p>
						</div>
						<button type="button" disabled={punya < p.jumlah} onClick={() => kirimPesananKab(p.id)}
							className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-[13px] font-bold text-white hover:bg-sky-500 disabled:opacity-40">
							{punya < p.jumlah ? `Kurang ${p.jumlah - punya}` : "Kirim"}
						</button>
					</div>
				);
			})}
			{bonusBumdes > 0 && <p className="m-0 mt-3 text-[12px] font-semibold text-amber-800">🏛️ BUMDes menaikkan harga jual +{bonusBumdes}%</p>}
			<button type="button" disabled={!bawa.length} onClick={() => setHasil(jualKePengepul())}
				className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-[15px] font-extrabold text-slate-900 hover:bg-amber-400 disabled:opacity-40">
				Jual semua
			</button>
		</div>
	);
}
