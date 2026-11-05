import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { bayarKoin, tambahKoin, useKoleksi } from "../pancing";
import { suara } from "../suaraPancing";

// Mesin capit di teras Alfamart: bayar koin, capit turun ±1,2 detik, hadiah diundi.
// Nilai harapan 15,6 koin per main, di bawah biayanya (20), jadi koin tidak bisa dicetak.

const BIAYA_CAPIT = 20;
const HADIAH_CAPIT = [
	{ p: 0.55, koin: 0, teks: "Yah, lepas lagi! 😅" },
	{ p: 0.3, koin: 15, teks: "Dapat boneka kecil! 🧸 +🪙 15" },
	{ p: 0.11, koin: 40, teks: "Dapat boneka besar! 🐻 +🪙 40" },
	{ p: 0.035, koin: 120, teks: "Wah, hadiah langka! 🎁 +🪙 120" },
	{ p: 0.005, koin: 500, teks: "JACKPOT! 🏆 +🪙 500" },
];
const LAMA_MS = 1200;

function undiCapit(acak = Math.random) {
	let r = acak();
	for (const h of HADIAH_CAPIT) {
		if (r < h.p) return h;
		r -= h.p;
	}
	return HADIAH_CAPIT[0];
}

const BONEKA = ["🧸", "🐰", "🐥", "🦆", "🐼", "🐸", "🦄"];

export default function PanelCapit() {
	const { poin } = useKoleksi();
	const [main, setMain] = useState(false);
	const [hasil, setHasil] = useState(null);
	const tertunda = useRef(null);
	const timer = useRef(0);

	const cairkan = () => {
		const h = tertunda.current;
		tertunda.current = null;
		if (!h) return;
		if (h.koin) {
			tambahKoin(h.koin);
			suara("koin");
		} else suara("lepas");
		return h;
	};
	// Panel ditutup di tengah animasi: hadiah yang sudah diundi tetap dicairkan.
	useEffect(
		() => () => {
			clearTimeout(timer.current);
			if (tertunda.current) tambahKoin(tertunda.current.koin);
		},
		[],
	);

	const mulai = () => {
		if (main || !bayarKoin(BIAYA_CAPIT)) return;
		tertunda.current = undiCapit();
		setHasil(null);
		setMain(true);
		timer.current = setTimeout(() => {
			setHasil(cairkan());
			setMain(false);
		}, LAMA_MS);
	};

	return (
		<div className="space-y-4">
			<div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-pink-500 to-fuchsia-700 p-4 text-white">
				<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-pink-100">Mesin Capit · Alfamart</p>
				<div className="relative mt-3 h-44 overflow-hidden rounded-2xl bg-sky-100/90 ring-4 ring-yellow-300">
					<motion.div
						className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center"
						animate={main ? { y: [0, 96, 96, 0] } : { y: 0 }}
						transition={main ? { duration: LAMA_MS / 1000, times: [0, 0.5, 0.6, 1], ease: "easeInOut" } : { duration: 0.2 }}
					>
						<div className="h-12 w-0.5 bg-slate-500" />
						<div className="h-5 w-9 rounded-b-full border-4 border-t-0 border-slate-600" />
					</motion.div>
					<div className="absolute inset-x-0 bottom-0 flex justify-around px-2 pb-1 text-3xl">
						{BONEKA.map((b) => (
							<span key={b}>{b}</span>
						))}
					</div>
				</div>
				<p className="mt-3 text-center text-sm font-bold" aria-live="polite">
					{main ? "Capit turun… 🤞" : hasil ? hasil.teks : "Bayar 🪙 20, lalu coba peruntunganmu!"}
				</p>
			</div>
			<div className="flex items-center justify-between text-xs">
				<span className="rounded-full bg-amber-100 px-3 py-1 font-bold tabular-nums text-amber-800">Saldo 🪙 {poin.toLocaleString("id-ID")}</span>
				<span className="text-slate-500">Hadiah 🪙 15 – 500</span>
			</div>
			<button
				onClick={mulai}
				disabled={main || poin < BIAYA_CAPIT}
				className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400"
			>
				{poin < BIAYA_CAPIT ? "Koin kurang — mancing dulu 🎣" : `Main · 🪙 ${BIAYA_CAPIT}`}
			</button>
		</div>
	);
}
