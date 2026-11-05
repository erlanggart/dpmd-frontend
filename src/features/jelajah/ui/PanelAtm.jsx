import { useState } from "react";
import { tambahKoin, useKoleksi } from "../pancing";
import { suara } from "../suaraPancing";

// ATM di teras Alfamart: lihat saldo koin dan ambil bonus harian sekali per tanggal kalender.

const KUNCI = "jelajah-atm-v1";
const BONUS = 25;
const hariIni = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const bacaTanggal = () => {
	try {
		return localStorage.getItem(KUNCI);
	} catch {
		return null;
	}
};

export default function PanelAtm() {
	const { poin } = useKoleksi();
	const [terakhir, setTerakhir] = useState(bacaTanggal);
	const sudah = terakhir === hariIni();

	const ambil = () => {
		// dibaca ulang dari penyimpanan: dua panel/tab tidak bisa mengambil dua kali
		if (bacaTanggal() === hariIni()) return setTerakhir(hariIni());
		try {
			localStorage.setItem(KUNCI, hariIni());
		} catch {
			/* abaikan */
		}
		tambahKoin(BONUS);
		suara("koin");
		setTerakhir(hariIni());
	};

	return (
		<div className="space-y-4 text-center">
			<div className="rounded-2xl bg-slate-900 p-4 text-white">
				<p className="text-[11px] uppercase tracking-wider text-slate-400">Saldo koin</p>
				<p className="text-3xl font-black tabular-nums">🪙 {poin.toLocaleString("id-ID")}</p>
			</div>
			<button
				disabled={sudah}
				onClick={ambil}
				className="h-11 w-full rounded-xl bg-sky-600 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
			>
				{sudah ? "Bonus sudah diambil — bisa lagi besok" : `Ambil bonus harian 🪙 ${BONUS}`}
			</button>
		</div>
	);
}
