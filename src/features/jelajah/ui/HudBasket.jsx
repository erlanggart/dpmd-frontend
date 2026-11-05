import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ISI_MAKS, KOIN, ZONA, basket, lepasAksi, mulaiBasket, tekanAksi, tutupBasket, useBasket } from "../basket";
import { kendali } from "../jelajahStore";

// HUD laga basket: papan skor, hitung mundur, kabar, bilah bidik, petunjuk, dan modal hasil.
// Tombol HP (Tembak/Rebut + Kecoh/Blok) diekspor terpisah sebagai TombolBasket.

const menit = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Hasil() {
	const menang = basket.pemenang === "pemain";
	return (
		<div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4">
			<motion.section
				initial={{ scale: 0.85, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				role="dialog"
				aria-label="Hasil laga basket"
				className="w-full max-w-xs overflow-hidden rounded-3xl bg-slate-900 text-center text-white shadow-2xl ring-2 ring-orange-400/70"
			>
				<div className="bg-gradient-to-b from-orange-500/30 to-transparent px-5 pb-3 pt-5">
					<p className="text-2xl font-black">{menang ? "🏆 Anda menang!" : "Anda kalah"}</p>
					<p className="mt-1 text-4xl font-black tabular-nums">
						{basket.skor.pemain} : {basket.skor.lawan}
					</p>
					<p className="mt-2 text-sm text-slate-300">🪙 {basket.koinLaga} koin didapat</p>
					{menang && <p className="text-[11px] text-slate-400">Bonus menang {KOIN.menang} koin sudah termasuk</p>}
				</div>
				<div className="flex gap-2 p-4 pt-1">
					<button onClick={() => mulaiBasket()} className="flex-1 rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white active:bg-orange-700">
						Main lagi
					</button>
					<button onClick={() => tutupBasket()} className="flex-1 rounded-full bg-slate-700 px-4 py-2 text-sm font-bold text-white active:bg-slate-600">
						Selesai
					</button>
				</div>
			</motion.section>
		</div>
	);
}

function BilahBidik({ sentuh }) {
	const jarum = useRef(null);
	useEffect(() => {
		let id;
		const ganti = () => {
			if (jarum.current) jarum.current.style.left = `${Math.min(100, (basket.isi / ISI_MAKS) * 100)}%`;
			id = requestAnimationFrame(ganti);
		};
		ganti();
		return () => cancelAnimationFrame(id);
	}, []);
	return (
		<div className={`pointer-events-none absolute left-1/2 z-30 h-3 w-56 -translate-x-1/2 overflow-hidden rounded-full bg-slate-900/85 ring-1 ring-white/40 ${sentuh ? "bottom-40" : "bottom-28"}`}>
			<div className="absolute inset-y-0 bg-emerald-500" style={{ left: `${(ZONA.dari / ISI_MAKS) * 100}%`, width: `${((ZONA.sampai - ZONA.dari) / ISI_MAKS) * 100}%` }} />
			<div ref={jarum} className="absolute inset-y-0 w-1 -translate-x-1/2 bg-white" />
		</div>
	);
}

export default function HudBasket({ sentuh }) {
	const b = useBasket();
	const [kabar, setKabar] = useState(null);
	const idKabar = b.kabar?.id;

	// keyboard: E tahan = bidik, lepas = tembak; Esc keluar
	useEffect(() => {
		const abaikan = (e) => e.target?.closest?.("input, textarea, [contenteditable]");
		const turun = (e) => {
			if (abaikan(e)) return;
			if (e.code === "KeyE" && !e.repeat) tekanAksi();
			else if (e.code === "Escape" && basket.fase !== "selesai") tutupBasket();
		};
		const naik = (e) => {
			if (e.code === "KeyE") lepasAksi();
		};
		window.addEventListener("keydown", turun);
		window.addEventListener("keyup", naik);
		window.addEventListener("blur", lepasAksi);
		return () => {
			window.removeEventListener("keydown", turun);
			window.removeEventListener("keyup", naik);
			window.removeEventListener("blur", lepasAksi);
		};
	}, []);

	// kabar hilang sendiri 1,4 dtk setelah muncul
	useEffect(() => {
		if (!idKabar) return setKabar(null);
		setKabar(basket.kabar);
		const t = setTimeout(() => setKabar(null), 1400);
		return () => clearTimeout(t);
	}, [idKabar]);

	if (b.fase === "selesai") return <Hasil />;
	const detik = Math.ceil(b.sisa);
	const seri = b.sisa <= 0 && b.skor.pemain === b.skor.lawan;
	return (
		<>
			{/* HP: di kiri bawah bilah tenaga, supaya tidak menimpa peta bundar di kanan atas */}
			<div className={`pointer-events-auto absolute z-30 flex items-center gap-3 whitespace-nowrap rounded-full bg-slate-900/85 px-4 py-1.5 text-sm font-black text-white backdrop-blur ${sentuh ? "left-3 top-[5.5rem]" : "left-1/2 top-4 -translate-x-1/2"}`}>
				<span className="tabular-nums">
					Anda {b.skor.pemain} : {b.skor.lawan} Lawan
				</span>
				<span className="text-xs font-bold text-amber-300">{seri ? "Perpanjangan" : menit(detik)}</span>
				<button onClick={() => tutupBasket()} aria-label="Keluar dari laga" className="!min-h-0 !min-w-0 rounded-full px-1.5 text-xs leading-5 text-slate-300 active:bg-white/20">
					✕
				</button>
			</div>
			{b.fase === "mulai" && b.tunggu > 0 && <p className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-8xl font-black text-white [text-shadow:0_3px_12px_rgba(0,0,0,0.7)]">{Math.ceil(b.tunggu)}</p>}
			<div className="pointer-events-none absolute inset-x-0 top-1/4 z-30 flex justify-center" role="status">
				<AnimatePresence>
					{kabar && (
						<motion.p key={kabar.id} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="px-4 text-center text-2xl font-black sm:text-3xl [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]" style={{ color: kabar.warna }}>
							{kabar.teks}
						</motion.p>
					)}
				</AnimatePresence>
			</div>
			{b.bidik && <BilahBidik sentuh={sentuh} />}
			{!sentuh && b.fase === "main" && (
				<p className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-900/55 px-3 py-1 text-xs text-white">
					{b.pegang === "pemain" ? "Tahan E lalu lepas di zona hijau = tembak · Spasi kecoh · Shift lari" : b.pegang === "lawan" ? "E rebut bola · Spasi loncat blok" : "Kejar bolanya!"}
				</p>
			)}
		</>
	);
}

export function TombolBasket() {
	const b = useBasket();
	const pemain = b.pegang === "pemain";
	const lawan = b.pegang === "lawan";
	const utama = "flex h-16 w-16 select-none flex-col items-center justify-center rounded-full text-[11px] font-bold text-white shadow-2xl ring-4 ring-white/70";
	return (
		<>
			{pemain ? (
				<button style={{ background: "#ea580c", touchAction: "none" }} className={utama} aria-label="Tembak" onPointerDown={tekanAksi} onPointerUp={lepasAksi} onPointerCancel={lepasAksi} onPointerLeave={lepasAksi}>
					Tembak
				</button>
			) : lawan ? (
				<button style={{ background: "#ea580c", touchAction: "none" }} className={utama} aria-label="Rebut" onPointerDown={tekanAksi}>
					Rebut
				</button>
			) : (
				<button disabled style={{ background: "#ea580c", touchAction: "none" }} className={`${utama} opacity-50`} aria-label="Kejar bola">
					Kejar
				</button>
			)}
			<button onClick={() => (kendali.loncat = true)} aria-label={pemain ? "Kecoh" : "Blok"} className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/40 text-[10px] font-bold text-white shadow-lg ring-1 ring-white/30 backdrop-blur active:bg-slate-900/70">
				{pemain ? "Kecoh" : "Blok"}
			</button>
		</>
	);
}
