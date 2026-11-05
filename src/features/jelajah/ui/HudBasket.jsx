import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ISI_MAKS, KOIN, KOIN_LOMBA, NAMA_TIM, WARNA_TIM, ZONA, basket, batalDaftarBasket, lepasAksi, mulaiBasket, mulaiLapangan, operBola, sedangTanding, tekanAksi, tutupBasket, useBasket } from "../basket";
import { kendali } from "../jelajahStore";

// HUD laga basket: papan skor, hitung mundur, kabar, bilah bidik, petunjuk, dan modal hasil.
// Tombol HP (Tembak/Rebut + Kecoh/Blok + Oper) diekspor terpisah sebagai TombolBasket;
// ChipBasket mengumumkan pendaftaran & skor lomba kepada tamu yang tidak sedang bertanding.

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

// Hasil lomba antar-tamu: pemenang, skor, dan statistik tiap pemain seperti podium galatama.
function HasilLomba({ o }) {
	const urut = [...o.peserta].sort((a, b) => a.tim - b.tim || b.poin - a.poin);
	const judul = o.menang === -1 ? "Lomba dihentikan" : basket.pemenang === "pemain" ? "🏆 Tim Anda juara!" : `Tim ${NAMA_TIM[o.menang]} juara`;
	return (
		<div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4">
			<motion.section
				initial={{ scale: 0.85, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				role="dialog"
				aria-label="Hasil lomba basket"
				className="max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-3xl bg-slate-900 text-white shadow-2xl ring-2 ring-orange-400/70"
			>
				<div className="bg-gradient-to-b from-orange-500/30 to-transparent px-5 pb-2 pt-5 text-center">
					<p className="text-[11px] font-black uppercase tracking-[0.25em] text-orange-300">Lomba Basket selesai{o.wo ? " · menang WO" : ""}</p>
					<p className="mt-1 text-2xl font-black">{judul}</p>
					<p className="mt-1 text-4xl font-black tabular-nums">
						<span style={{ color: WARNA_TIM[0] }}>{o.skor[0]}</span> : <span style={{ color: "#60a5fa" }}>{o.skor[1]}</span>
					</p>
					<p className="mt-2 text-sm text-slate-300">🪙 {basket.koinLaga} koin didapat</p>
					{basket.pemenang === "pemain" && !o.wo && <p className="text-[11px] text-slate-400">Hadiah juara {KOIN_LOMBA.menang}{o.mvp === o.saya?.pid ? ` + MVP ${KOIN_LOMBA.mvp}` : ""} sudah termasuk</p>}
				</div>
				<table className="w-full border-t border-white/10 text-xs">
					<thead className="text-[10px] uppercase text-slate-400">
						<tr>
							<th scope="col" className="px-3 py-1.5 text-left font-bold">Pemain</th>
							<th scope="col" title="Poin" className="px-1 font-bold">PTS</th>
							<th scope="col" title="Rebound" className="px-1 font-bold">REB</th>
							<th scope="col" title="Asis" className="px-1 font-bold">AST</th>
							<th scope="col" title="Rebut bola" className="px-1 font-bold">STL</th>
							<th scope="col" title="Blok" className="px-1 pr-3 font-bold">BLK</th>
						</tr>
					</thead>
					<tbody className="tabular-nums">
						{urut.map((p) => (
							<tr key={p.pid} className={p.pid === o.saya?.pid ? "bg-orange-400/20 font-black" : ""}>
								<td className="max-w-[9rem] truncate px-3 py-1 text-left">
									<span aria-hidden className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: WARNA_TIM[p.tim] }} />
									{p.nama}
									{p.pid === o.mvp ? " ⭐" : ""}
								</td>
								<td className="text-center">{p.poin}</td>
								<td className="text-center">{p.reb}</td>
								<td className="text-center">{p.ast}</td>
								<td className="text-center">{p.stl}</td>
								<td className="pr-3 text-center">{p.blk}</td>
							</tr>
						))}
					</tbody>
				</table>
				<div className="flex gap-2 p-4">
					<button onClick={() => mulaiLapangan()} className="flex-1 rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white active:bg-orange-700">
						Tanding lagi
					</button>
					<button autoFocus onClick={() => tutupBasket()} className="flex-1 rounded-full bg-slate-700 px-4 py-2 text-sm font-bold text-white active:bg-slate-600">
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

	// klik kiri atau E: tahan = bidik, lepas = tembak, bola di lawan = rebut; klik kanan atau Q oper; Esc keluar
	useEffect(() => {
		// hanya mouse: jari yang lepas dari analog tidak boleh melepas tembakan di HP
		const mouseTurun = (e) => {
			if (e.pointerType !== "mouse" || e.target?.tagName !== "CANVAS") return;
			if (e.button === 0) tekanAksi();
			else if (e.button === 2) operBola();
		};
		const mouseNaik = (e) => {
			if (e.pointerType === "mouse" && e.button === 0) lepasAksi();
		};
		// klik kanan = oper, tanpa menu klik kanan peramban
		const tanpaMenu = (e) => {
			if (e.target?.tagName === "CANVAS") e.preventDefault();
		};
		const abaikan = (e) => e.target?.closest?.("input, textarea, [contenteditable]");
		const turun = (e) => {
			if (abaikan(e)) return;
			if (e.code === "KeyE" && !e.repeat) tekanAksi();
			else if (e.code === "KeyQ" && !e.repeat) operBola();
			else if (e.code === "Escape" && basket.fase !== "selesai") tutupBasket();
		};
		const naik = (e) => {
			if (e.code === "KeyE") lepasAksi();
		};
		window.addEventListener("keydown", turun);
		window.addEventListener("keyup", naik);
		window.addEventListener("blur", lepasAksi);
		window.addEventListener("pointerdown", mouseTurun);
		window.addEventListener("pointerup", mouseNaik);
		window.addEventListener("contextmenu", tanpaMenu);
		return () => {
			window.removeEventListener("pointerdown", mouseTurun);
			window.removeEventListener("pointerup", mouseNaik);
			window.removeEventListener("contextmenu", tanpaMenu);
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

	const lomba = b.ikutOnline ? b.online : null;
	if (b.fase === "selesai") return lomba ? <HasilLomba o={lomba} /> : <Hasil />;
	const detik = Math.ceil(b.sisa);
	const seri = b.sisa <= 0 && b.skor.pemain === b.skor.lawan;
	const adaKawan = lomba && lomba.peserta.some((p) => p.tim === lomba.saya?.tim && p.pid !== lomba.saya?.pid && !p.keluar);
	const petunjuk = b.pegang === "pemain" ? `Tahan klik kiri, lepas di zona hijau = tembak · dekat ring = layup/dunk${adaKawan ? " · klik kanan oper" : ""} · Spasi kecoh · Shift lari` : b.pegang === "lawan" ? "Klik kiri rebut bola · Spasi loncat blok" : b.pegang === "kawan" ? "Cari ruang kosong, rekan Anda memegang bola" : b.hak === "pemain" ? "Ambil bola di bawah ring Anda" : b.hak === "lawan" ? "Bola milik lawan, kembali bertahan" : "Kejar bolanya!";
	return (
		<>
			{/* HP: di kiri bawah bilah tenaga, supaya tidak menimpa peta bundar di kanan atas */}
			<div className={`pointer-events-auto absolute z-30 flex items-center gap-3 whitespace-nowrap rounded-full bg-slate-900/85 px-4 py-1.5 text-sm font-black text-white backdrop-blur ${sentuh ? "left-3 top-[5.5rem]" : "left-1/2 top-4 -translate-x-1/2"}`}>
				{lomba ? (
					<span className="tabular-nums">
						<span style={{ color: "#f87171" }}>Merah {lomba.skor[0]}</span> : <span style={{ color: "#60a5fa" }}>{lomba.skor[1]} Biru</span>
					</span>
				) : (
					<span className="tabular-nums">
						Anda {b.skor.pemain} : {b.skor.lawan} Lawan
					</span>
				)}
				<span className="text-xs font-bold text-amber-300">{seri ? "Perpanjangan" : menit(detik)}</span>
				{lomba && b.fase === "main" && lomba.pemegang && <span className={`text-xs font-bold tabular-nums ${b.jam <= 5 ? "text-rose-400" : "text-slate-300"}`}>⏱{Math.ceil(b.jam)}</span>}
				<button onClick={() => tutupBasket()} aria-label="Keluar dari laga" className="!min-h-0 !min-w-0 rounded-full px-1.5 text-xs leading-5 text-slate-300 active:bg-white/20">
					✕
				</button>
			</div>
			{b.fase === "mulai" && b.tunggu > 0 && <p className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-8xl font-black text-white [text-shadow:0_3px_12px_rgba(0,0,0,0.7)]">{Math.ceil(b.tunggu)}</p>}
			{lomba && b.fase === "mulai" && lomba.saya && <p className="pointer-events-none absolute left-1/2 top-[30%] z-30 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-sm font-black text-white" style={{ background: WARNA_TIM[lomba.saya.tim] }}>Anda di Tim {NAMA_TIM[lomba.saya.tim]}</p>}
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
			{!sentuh && b.fase === "main" && <p className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/55 px-3 py-1 text-xs text-white">{petunjuk}</p>}
		</>
	);
}

// Tamu yang tidak bertanding: pendaftaran dibuka, atau skor laga yang sedang berjalan.
export function ChipBasket() {
	const b = useBasket();
	const [, detik] = useState(0);
	useEffect(() => {
		const t = setInterval(() => detik((n) => n + 1), 1000);
		return () => clearInterval(t);
	}, []);
	const o = b.online;
	if (!o || b.aktif) return null;
	const kelas = "pointer-events-auto absolute left-3 top-[13.5rem] z-20 flex max-w-[16rem] items-center gap-2 rounded-2xl px-3 py-1 text-[11px] font-black text-white shadow-lg sm:left-4 sm:max-w-xs [@media(max-height:520px)]:top-[12rem]";
	if (o.fase === "daftar") {
		const sisa = Math.max(0, Math.ceil((o.sampai - performance.now()) / 1000));
		return (
			<div className={`${kelas} bg-gradient-to-r from-orange-500 to-red-500`}>
				<span>{o.saya ? `🏀 Lomba mulai ${menit(sisa)} · ${o.peserta.length}/6 terdaftar` : `🏀 Lomba basket dibuka! Daftar di lapangan Taman Warga · ${menit(sisa)} · ${o.peserta.length}/6`}</span>
				{o.saya && (
					<button onClick={batalDaftarBasket} className="!min-h-0 !min-w-0 rounded-full bg-white/20 px-2 py-0.5 active:bg-white/40">
						Batal
					</button>
				)}
			</div>
		);
	}
	if (!sedangTanding()) return null;
	return (
		<p className={`${kelas} !pointer-events-none bg-slate-900/75`}>
			🏀 Merah {o.skor[0]} : {o.skor[1]} Biru · {menit(Math.ceil(b.sisa))}
		</p>
	);
}

export function TombolBasket() {
	const b = useBasket();
	const pemain = b.pegang === "pemain";
	const lawan = b.pegang === "lawan";
	const utama = "flex h-16 w-16 select-none flex-col items-center justify-center rounded-full text-[11px] font-bold leading-tight text-white shadow-2xl ring-4 ring-white/70 active:scale-95";
	// menahan tombol Tembak tidak boleh memunculkan menu tekan-lama HP
	const tanpaMenu = (e) => e.preventDefault();
	const kecil = "flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/40 text-[10px] font-bold text-white shadow-lg ring-1 ring-white/30 backdrop-blur active:bg-slate-900/70";
	return (
		<>
			{pemain ? (
				<button style={{ background: "#ea580c", touchAction: "none" }} className={utama} aria-label="Tembak" onPointerDown={tekanAksi} onPointerUp={lepasAksi} onPointerCancel={lepasAksi} onPointerLeave={lepasAksi} onContextMenu={tanpaMenu}>
					<span aria-hidden className="text-lg leading-none">🏀</span>
					Tembak
				</button>
			) : lawan ? (
				<button style={{ background: "#dc2626", touchAction: "none" }} className={utama} aria-label="Rebut" onPointerDown={tekanAksi} onContextMenu={tanpaMenu}>
					<span aria-hidden className="text-lg leading-none">✋</span>
					Rebut
				</button>
			) : (
				<button disabled style={{ background: "#475569", touchAction: "none" }} className={`${utama} opacity-60`} aria-label={b.pegang === "kawan" ? "Bola di rekan" : "Kejar bola"}>
					{b.pegang === "kawan" ? "Rekan" : "Kejar"}
				</button>
			)}
			{pemain && b.sasaranOper && (
				<button style={{ touchAction: "none" }} onPointerDown={operBola} onContextMenu={tanpaMenu} aria-label="Oper bola" className="flex h-14 w-14 select-none flex-col items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold leading-tight text-white shadow-xl ring-2 ring-white/70 active:scale-95">
					<span aria-hidden className="text-base leading-none">🤾</span>
					Oper
				</button>
			)}
			<button onClick={() => (kendali.loncat = true)} aria-label={pemain ? "Kecoh" : "Blok"} className={kecil}>
				{pemain ? "Kecoh" : "Blok"}
			</button>
		</>
	);
}
