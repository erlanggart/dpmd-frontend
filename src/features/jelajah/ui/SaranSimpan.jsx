import { useState } from "react";
import { levelDari, useProgres } from "../progres";
import { kodeSaya } from "../simpanKode";

// Kemajuan tamu hanya ada di perangkat. Makin tinggi level makin besar ruginya bila hilang, jadi
// tawaran kode simpan muncul di beberapa tonggak level, sekali saja tiap tonggak.
const TONGGAK = [3, 6, 10, 15];
const KUNCI = "jelajah-saran-simpan-v1";

function tonggakTerakhir() {
	try {
		return Number(localStorage.getItem(KUNCI)) || 0;
	} catch {
		return 0;
	}
}

export default function SaranSimpan({ onBuka }) {
	const progres = useProgres();
	const [terakhir, setTerakhir] = useState(tonggakTerakhir);
	const lv = levelDari(progres.xp);
	const tonggak = TONGGAK.filter((t) => lv >= t).at(-1);
	if (!tonggak || tonggak <= terakhir || kodeSaya()) return null;

	const tandai = () => {
		setTerakhir(tonggak);
		try {
			localStorage.setItem(KUNCI, String(tonggak));
		} catch {
			/* penyimpanan diblokir: saran bisa muncul lagi saat dimuat ulang */
		}
	};

	return (
		<div role="status" className="pointer-events-auto absolute inset-x-3 bottom-[max(9.5rem,calc(env(safe-area-inset-bottom)+9.5rem))] z-30 mx-auto max-w-sm rounded-2xl bg-slate-950/85 p-3 text-white shadow-xl ring-1 ring-white/15 backdrop-blur sm:bottom-20">
			<p className="m-0 text-[13px] font-bold">⭐ Sudah Level {lv}! Amankan kemajuan Anda</p>
			<p className="m-0 mt-0.5 text-[12px] text-white/75">Kemajuan hanya tersimpan di perangkat ini. Buat kode simpan supaya tidak hilang saat ganti HP atau browser dibersihkan.</p>
			<div className="mt-2 flex justify-end gap-2">
				<button type="button" onClick={tandai} className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-bold hover:bg-white/20">Nanti saja</button>
				<button type="button" onClick={() => { tandai(); onBuka(); }} className="rounded-lg bg-amber-400 px-3 py-1.5 text-[12px] font-bold text-slate-900 hover:bg-amber-300">Buat kode simpan</button>
			</div>
		</div>
	);
}
