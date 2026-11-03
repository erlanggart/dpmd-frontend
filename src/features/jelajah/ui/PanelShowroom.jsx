import { useState } from "react";
import { useKoleksi } from "../pancing";
import { MODEL, beliKendaraan, catUlang, milikSaya, panggilKendaraan, useGarasi } from "../garasi";

// Showroom mobil / motor: pilih model & warna, beli dengan koin; yang sudah dimiliki bisa
// dicat ulang dan dipanggil. mode "garasi" = daftar kendaraan milik saja (dari menu).

const angka = (n) => n.toLocaleString("id-ID");
const KECEPATAN_MAKS = { mobil: 1.15, motor: 1.4 };

function Bilah({ label, nilai, warna }) {
	return (
		<div>
			<div className="flex justify-between text-[10px] text-slate-500">
				<span>{label}</span>
			</div>
			<div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
				<div className="h-full rounded-full" style={{ width: `${Math.max(8, Math.min(100, nilai * 100))}%`, background: warna }} />
			</div>
		</div>
	);
}

function Kartu({ jenis, m, onPesan }) {
	useGarasi();
	const { poin } = useKoleksi();
	const punya = milikSaya(jenis, m.id);
	const [warna, setWarna] = useState(punya?.warna || m.warna[0]);
	const kurang = poin < m.harga;
	return (
		<li className={`overflow-hidden rounded-3xl border bg-white ${punya ? "border-emerald-300" : "border-slate-200"}`}>
			<div className="flex items-center gap-3 p-3" style={{ background: `linear-gradient(135deg, ${warna}33, transparent)` }}>
				<span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-inner" style={{ background: `${warna}55` }}>
					{m.ikon}
				</span>
				<div className="min-w-0 flex-1">
					<p className="flex flex-wrap items-center gap-1.5 text-sm font-black text-slate-900">
						{m.nama}
						{punya && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">DIMILIKI</span>}
					</p>
					<p className="text-xs leading-snug text-slate-500">{m.ket}</p>
				</div>
			</div>
			<div className="space-y-3 px-3 pb-3">
				<div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
					<Bilah label="Kecepatan" nilai={m.laju / KECEPATAN_MAKS[jenis]} warna="#0ea5e9" />
					<Bilah label="Akselerasi" nilai={m.gas / 1.4} warna="#f59e0b" />
				</div>
				<div className="flex flex-wrap items-center gap-1.5">
					{m.warna.map((w) => (
						<button
							key={w}
							onClick={() => {
								setWarna(w);
								if (punya) catUlang(jenis, m.id, w);
							}}
							aria-label={`Warna ${w}`}
							className={`h-7 w-7 rounded-full ring-2 transition ${warna === w ? "scale-110 ring-slate-900" : "ring-slate-200"}`}
							style={{ background: w }}
						/>
					))}
					{jenis === "mobil" && <span className="ml-auto text-[11px] text-slate-500">👥 {m.kursi} kursi</span>}
				</div>
				{punya ? (
					<button onClick={() => onPesan(panggilKendaraan(jenis, m.id))} className="w-full rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-500">
						Panggil ke dekatku
					</button>
				) : (
					<button
						onClick={() => onPesan(beliKendaraan(jenis, m.id, warna) ?? `✅ ${m.nama} siap di halaman showroom!`)}
						disabled={kurang}
						className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
					>
						Beli · 🪙 {angka(m.harga)}
					</button>
				)}
			</div>
		</li>
	);
}

export default function PanelShowroom({ jenis, onTutup }) {
	const g = useGarasi();
	const { poin } = useKoleksi();
	const [pesan, setPesan] = useState(null);
	const garasi = jenis === "garasi";
	const daftar = garasi ? g.punya.map((p) => ({ jenis: p.jenis, m: MODEL[p.jenis].find((x) => x.id === p.model) })).filter((x) => x.m) : MODEL[jenis].map((m) => ({ jenis, m }));
	const tampilPesan = (teks) => {
		setPesan(teks);
		// panggilan berhasil → tutup panel supaya kendaraannya langsung terlihat
		if (teks === null) onTutup?.();
	};
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
				<span className="text-xs font-bold text-amber-700">Koin kamu</span>
				<span className="text-base font-black tabular-nums text-amber-900">🪙 {angka(poin)}</span>
			</div>
			{pesan && <p className={`rounded-2xl px-3 py-2 text-sm font-semibold ${pesan.startsWith("✅") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{pesan}</p>}
			{garasi && !daftar.length && <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">Garasi masih kosong. Beli mobil atau motor di Showroom (timur kantor, di balik gedung tetangga).</p>}
			<ul className="grid gap-3 sm:grid-cols-2">
				{daftar.map(({ jenis: j, m }) => (
					<Kartu key={`${j}:${m.id}`} jenis={j} m={m} onPesan={tampilPesan} />
				))}
			</ul>
			{!garasi && <p className="text-xs leading-relaxed text-slate-500">Kendaraan baru diserahkan di halaman depan showroom. Setelah dibeli, panggil kapan saja dari menu ☰ → Garasi saya. Warna bisa diganti gratis.</p>}
		</div>
	);
}
