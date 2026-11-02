import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TENAGA_LARI, TENAGA_MAKS, useKabarTenaga, useTenaga } from "../tenaga";

// Bar tenaga (nyawa) di pojok kiri atas, kabar singkat (tertabrak, makan, siuman), dan
// layar gelap saat pingsan.
export default function BarTenaga() {
	const nilai = useTenaga();
	const kabar = useKabarTenaga();
	const [tampilKabar, setTampilKabar] = useState(null);

	useEffect(() => {
		if (!kabar) return;
		setTampilKabar(kabar);
		const t = setTimeout(() => setTampilKabar(null), 3200);
		return () => clearTimeout(t);
	}, [kabar]);

	const persen = (nilai / TENAGA_MAKS) * 100;
	const warna = nilai < TENAGA_LARI ? "#ef4444" : nilai < 50 ? "#f59e0b" : "#22c55e";
	const pingsan = nilai <= 0;

	return (
		<>
			<div className="pointer-events-none absolute left-3 top-[4.25rem] z-20 w-40 rounded-xl bg-slate-950/60 px-2.5 py-1.5 text-white shadow-lg ring-1 ring-white/10 backdrop-blur sm:left-4 sm:top-[4.5rem] sm:w-48">
				<div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
					<span>❤ Tenaga</span>
					<span className="tabular-nums">{nilai}</span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-black/40">
					<div className={`h-full rounded-full transition-all duration-300 ${nilai < TENAGA_LARI ? "animate-pulse" : ""}`} style={{ width: `${persen}%`, background: warna }} />
				</div>
				{nilai < TENAGA_LARI && !pingsan && <p className="mt-1 text-[10px] font-semibold text-rose-200">Lemas — tak bisa berlari. Makan di Alfamart!</p>}
			</div>

			<AnimatePresence>
				{tampilKabar && (
					<motion.p
						key={tampilKabar.id}
						initial={{ opacity: 0, y: -8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						className={`pointer-events-none absolute inset-x-0 top-44 z-30 mx-auto w-fit max-w-sm rounded-2xl px-4 py-2 text-center text-sm font-bold shadow-xl ${
							tampilKabar.jenis === "buruk" ? "bg-rose-600 text-white" : tampilKabar.jenis === "baik" ? "bg-emerald-500 text-white" : "bg-slate-900/80 text-white"
						}`}
					>
						{tampilKabar.teks}
					</motion.p>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{pingsan && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80">
						<p className="text-center text-lg font-black text-white">
							😵 Pingsan…
							<br />
							<span className="text-sm font-medium text-slate-300">Tenaga habis. Sebentar lagi siuman di depan lobi.</span>
						</p>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
