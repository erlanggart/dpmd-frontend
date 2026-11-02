import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiBookOpen, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import { kirimUcap } from "../multipemain";
import { IKAN, KELAS, joranKini, ketuk, lanjutPancing, pancing, tingkatJoran, useKoleksi, usePancing, zonaKini } from "../pancing";
import PanelJoran from "./PanelJoran";
import { aturSuara, suaraMati } from "../suaraPancing";
import AlbumIkan from "./AlbumIkan";
import IkonIkan from "./IkonIkan";

// HUD permainan memancing di atas kanvas 3D. Fase & pesan memicu render React;
// batang tenaga/tegangan/stamina diperbarui langsung ke DOM tiap frame.

const angka = (n) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
// kartu hasil tangkapan baru bisa ditutup setelah sekian detik (ketukan gulung sering terlanjur)
// (kartu muncul setelah ikan sampai di tangan pemancing)
const MUNCUL_KARTU = 1.1;
const JEDA_LANJUT = MUNCUL_KARTU + 0.8;
const WARNA_PESAN = {
	info: "bg-slate-900/70 text-white",
	baik: "bg-emerald-500/90 text-white",
	buruk: "bg-rose-600/90 text-white",
	besar: "bg-amber-400 text-slate-950 text-base sm:text-lg font-black tracking-wide",
};

function Batang({ label, kanan, refIsi, refJarum, latar, children }) {
	return (
		<div>
			<div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/80">
				<span>{label}</span>
				<span ref={kanan} className="tabular-nums" />
			</div>
			<div className="relative h-3.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/15" style={latar ? { background: latar } : undefined}>
				{refIsi && <div ref={refIsi} className="absolute inset-y-0 left-0 rounded-full" style={{ width: "0%" }} />}
				{children}
				{refJarum && <div ref={refJarum} className="absolute inset-y-[-3px] w-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" style={{ left: "0%" }} />}
			</div>
		</div>
	);
}

export default function GamePancing({ sentuh, bersama, onSelesai }) {
	usePancing();
	const { poin, koleksi } = useKoleksi();
	const [album, setAlbum] = useState(false);
	const [joran, setJoran] = useState(false);
	const [mati, setMati] = useState(suaraMati.nilai);
	const fase = pancing.fase;
	const pesan = pancing.pesan;
	const hasil = pancing.hasil;
	const ikan = pancing.ikan;

	const tenagaIsi = useRef();
	const tegangJarum = useRef();
	const gulungIsi = useRef();
	const lariTanda = useRef();
	const pulihTanda = useRef();
	const tegangTeks = useRef();
	const senarIsi = useRef();
	const senarTeks = useRef();
	const staminaIsi = useRef();
	const arahKiri = useRef();
	const arahKanan = useRef();
	const vinyet = useRef();
	const peringatan = useRef();

	// --- Spasi: ditahan = mengayun lemparan; tiap tekan-lepas = satu ketukan (sambar &
	// menggulung — ditahan terus tidak menggulung); setelah dapat = lanjut ---
	useEffect(() => {
		const abaikan = (e) => e.target.closest?.("input, textarea, [contenteditable]");
		const turun = (e) => {
			if (abaikan(e)) return;
			if (e.code === "Space") {
				e.preventDefault();
				if (pancing.fase === "dapat") {
					// ketukan menggulung yang terlanjur tidak boleh langsung menutup kartu hasil
					if (!e.repeat && pancing.t > JEDA_LANJUT) lanjutPancing();
					return;
				}
				if (!e.repeat) ketuk();
				pancing.tahan = true;
			}
		};
		const naik = (e) => {
			if (e.code === "Space") pancing.tahan = false;
		};
		const lepas = () => (pancing.tahan = false);
		window.addEventListener("keydown", turun);
		window.addEventListener("keyup", naik);
		window.addEventListener("blur", lepas);
		return () => {
			window.removeEventListener("keydown", turun);
			window.removeEventListener("keyup", naik);
			window.removeEventListener("blur", lepas);
			pancing.tahan = false;
		};
	}, []);

	// --- batang-batang tiap frame ---
	useEffect(() => {
		let id;
		const putar = () => {
			const p = pancing;
			if (tenagaIsi.current) {
				tenagaIsi.current.style.width = `${p.tenaga * 100}%`;
				tenagaIsi.current.style.background = p.tenaga > 0.93 ? "linear-gradient(90deg,#f59e0b,#fde047)" : "linear-gradient(90deg,#22c55e,#a3e635)";
			}
			if (p.fase === "tarik" && tegangJarum.current) {
				// jarum ikut bergetar mengikuti kepala ikan yang menggeleng
				const t = Math.max(0, Math.min(1.1, p.tegang + (p.geleng || 0)));
				const [zb, za] = zonaKini(p.ikan.kelas);
				tegangJarum.current.style.left = `calc(${(t / 1.1) * 100}% - 2px)`;
				tegangTeks.current.textContent = p.bahaya > 0 ? "BAHAYA!" : t < zb ? "Kendor" : t <= za ? "Pas" : t < 1 ? "Tegang" : "AKAN PUTUS";
				tegangTeks.current.style.color = p.bahaya > 0 || t >= 1 ? "#fb7185" : t < zb ? "#93c5fd" : t <= za ? "#86efac" : "#fcd34d";
				gulungIsi.current.style.width = `${Math.min(1, p.gulung) * 100}%`;
				gulungIsi.current.style.background = "linear-gradient(90deg,#14b8a6,#fbbf24)";
				lariTanda.current.style.display = p.lari > 0 ? "flex" : "none";
				pulihTanda.current.style.opacity = p.pulih ? 1 : 0;
				const panjang = joranKini().panjang - 3;
				const sisa = Math.max(0, Math.min(1, (panjang - p.jarak) / panjang));
				senarIsi.current.style.width = `${(1 - sisa) * 100}%`;
				senarIsi.current.style.background = p.jarak > panjang * 0.8 ? "#f43f5e" : "#38bdf8";
				senarTeks.current.textContent = `${p.jarak.toFixed(1)} m`;
				staminaIsi.current.style.width = `${(p.stamina / p.staminaMaks) * 100}%`;
				staminaIsi.current.style.background = KELAS[p.ikan.kelas].warna;
				// arah lari ikan & sisi yang harus ditahan
				const kiri = p.arahIkan < 0;
				arahKiri.current.style.opacity = kiri ? 1 : 0.25;
				arahKanan.current.style.opacity = kiri ? 0.25 : 1;
				const e = p.peristiwa;
				peringatan.current.style.display = e ? "flex" : "none";
				if (e) peringatan.current.textContent = e.jenis === "lompat" ? "🐟 MELOMPAT! BERHENTI MENGETUK!" : "⚡ SETRUM! BERHENTI MENGETUK!";
				const merah = p.amuk > 0 || p.bahaya > 0;
				vinyet.current.style.boxShadow = e?.jenis === "setrum" ? "inset 0 0 140px rgba(56,189,248,0.6)" : merah ? `inset 0 0 ${120 + Math.sin(performance.now() / 90) * 30}px rgba(239,68,68,0.55)` : "none";
			} else if (vinyet.current) vinyet.current.style.boxShadow = "none";
			id = requestAnimationFrame(putar);
		};
		id = requestAnimationFrame(putar);
		return () => cancelAnimationFrame(id);
	}, []);

	// Pamer tangkapan besar ke tamu lain lewat obrolan.
	useEffect(() => {
		if (fase === "dapat" && hasil && bersama && hasil.ikan.kelas >= 2) kirimUcap(`🎣 Dapat ${hasil.ikan.nama} ${angka(hasil.kg)} kg!`);
	}, [fase, hasil, bersama]);

	const tahan = {
		onPointerDown: (e) => {
			e.currentTarget.setPointerCapture?.(e.pointerId);
			ketuk();
			pancing.tahan = true;
		},
		onPointerUp: () => (pancing.tahan = false),
		onPointerCancel: () => (pancing.tahan = false),
		onContextMenu: (e) => e.preventDefault(),
	};
	const labelTombol = fase === "siap" ? "Tahan untuk melempar" : fase === "gigit" ? "TARIK!" : fase === "tarik" ? "KETUK berulang!" : "Gulung";
	const k = ikan ? KELAS[ikan.kelas] : null;
	const jumlahJenis = IKAN.filter((i) => koleksi[i.id]).length;

	return (
		<>
			<div ref={vinyet} className="pointer-events-none absolute inset-0 z-10 transition-shadow" />

			{/* kartu poin, album, suara */}
			<div className="pointer-events-auto absolute right-3 top-[4.5rem] z-20 flex items-center gap-1.5 rounded-2xl bg-slate-950/70 px-2 py-1.5 text-white shadow-lg ring-1 ring-white/10 backdrop-blur sm:top-20">
				<span className="px-1.5 text-xs font-bold tabular-nums" title="Koin — belanja di Alfamart">🪙 {angka(poin)}</span>
				<button onClick={() => setJoran(true)} className="rounded-xl bg-amber-400/90 px-2 py-1 text-xs font-black text-slate-950 hover:bg-amber-300" aria-label="Upgrade joran" title={joranKini().nama}>
					🎣 Lv {tingkatJoran() + 1}
				</button>
				<button onClick={() => setAlbum(true)} className="flex items-center gap-1 rounded-xl bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20" aria-label="Buka album ikan">
					<FiBookOpen /> {jumlahJenis}/{IKAN.length}
				</button>
				<button
					onClick={() => {
						aturSuara(!mati);
						setMati(!mati);
					}}
					className="rounded-xl bg-white/10 p-1.5 hover:bg-white/20"
					aria-label={mati ? "Nyalakan suara" : "Matikan suara"}
				>
					{mati ? <FiVolumeX /> : <FiVolume2 />}
				</button>
				<button onClick={onSelesai} className="rounded-xl bg-rose-500/80 p-1.5 hover:bg-rose-500" aria-label="Selesai memancing (E)">
					<FiX />
				</button>
			</div>

			{/* pesan */}
			<div className="pointer-events-none absolute inset-x-0 top-32 z-20 flex justify-center px-4 sm:top-28">
				<AnimatePresence mode="wait">
					{pesan && fase !== "dapat" && (
						<motion.p
							key={`${pesan.teks}${pesan.id ?? ""}`}
							initial={{ opacity: 0, y: -10, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: pesan.jenis === "besar" ? [1, 1.06, 1] : 1 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.25 }}
							className={`max-w-md rounded-2xl px-4 py-2 text-center text-xs font-semibold shadow-xl backdrop-blur sm:text-sm ${WARNA_PESAN[pesan.jenis] || WARNA_PESAN.info}`}
						>
							{pesan.teks}
						</motion.p>
					)}
				</AnimatePresence>
			</div>

			{/* panel bawah */}
			<div className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3 ${sentuh ? "bottom-40" : "bottom-24"}`}>
				{fase === "siap" && (
					<div className="w-72 rounded-2xl bg-slate-950/65 p-3 text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
						<Batang label="Tenaga lemparan" refIsi={tenagaIsi}>
							<div className="absolute inset-y-0 right-0 w-[7%] bg-amber-400/30" />
						</Batang>
						<p className="mt-2 text-center text-[11px] text-white/75">
							{sentuh ? "Tahan tombol 🎣 · analog ◀ ▶ membidik" : "Tahan SPASI, lepas di ujung kuning · A/D membidik"}
						</p>
					</div>
				)}
				{fase === "tunggu" && (
					<p className="rounded-full bg-slate-950/60 px-4 py-2 text-xs text-white/85 backdrop-blur">
						Pelampung mengapung… ketuk saat <b>tenggelam</b> · {sentuh ? "tombol" : "SPASI"} sekarang = gulung ulang
					</p>
				)}
				{fase === "tarik" && ikan && (
					<div className="w-[min(22rem,92vw)] space-y-2.5 rounded-2xl bg-slate-950/70 p-3 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur">
						<div className="flex items-center justify-between">
							<span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ background: `${k.warna}33`, color: k.warna }}>
								{ikan.kelas >= 3 ? "⚠ " : ""}
								{k.nama}
							</span>
							<span className="text-xs font-bold text-white/85">{ikan.kelas >= 3 ? "Sesuatu yang sangat besar…" : "Ikan menarik senar!"}</span>
						</div>
						<Batang
							label="Tegangan senar"
							kanan={tegangTeks}
							refJarum={tegangJarum}
							// zona hijau mengikuti kelas ikan: makin langka makin sempit
							latar={(() => {
								const [zb, za] = zonaKini(ikan.kelas).map((v) => (v / 1.1) * 100);
								return `linear-gradient(90deg,#1e3a8a 0%,#2563eb ${zb - 1}%,#16a34a ${zb}%,#22c55e ${za}%,#f59e0b ${za + 1}%,#ef4444 ${(1 / 1.1) * 100}%,#7f1d1d 100%)`;
							})()}
						/>
						<Batang label={sentuh ? "Laju gulung — ketuk 🎣 berulang" : "Laju gulung — ketuk SPASI berulang"} refIsi={gulungIsi}>
							<span ref={pulihTanda} className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase tracking-wider text-sky-200 opacity-0 transition-opacity">
								Ikan memulihkan tenaga — beri tekanan!
							</span>
						</Batang>
						<div className="grid grid-cols-2 gap-3">
							<Batang label="Senar" kanan={senarTeks} refIsi={senarIsi} />
							<Batang label="Tenaga ikan" refIsi={staminaIsi} />
						</div>
						<div className="flex items-center justify-between text-[11px] font-semibold">
							<span ref={arahKiri} className="text-lg">⬅</span>
							<span className="text-center text-white/75">Ikan lari ke panah terang — {sentuh ? "dorong analog" : "tahan A/D"} ke arah <b>sebaliknya</b></span>
							<span ref={arahKanan} className="text-lg">➡</span>
						</div>
						<div ref={lariTanda} className="hidden animate-pulse items-center justify-center rounded-xl bg-rose-500 py-1.5 text-sm font-black text-white">
							🏃 IKAN LARI! BERHENTI MENGETUK
						</div>
						<div ref={peringatan} className="hidden animate-pulse items-center justify-center rounded-xl bg-amber-400 py-1.5 text-sm font-black text-slate-950" />
					</div>
				)}
			</div>

			{/* tombol tahan untuk layar sentuh */}
			{sentuh && fase !== "dapat" && fase !== "gagal" && fase !== "lempar" && (
				<button
					{...tahan}
					className={`pointer-events-auto absolute bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3.5rem)] right-4 z-30 flex h-24 w-24 select-none flex-col items-center justify-center rounded-full text-white shadow-2xl ring-4 ring-white/70 active:scale-95 ${
						fase === "gigit" ? "animate-bounce bg-amber-500" : "bg-teal-600"
					}`}
					style={{ touchAction: "none" }}
					aria-label={labelTombol}
				>
					<span className="text-3xl">🎣</span>
					<span className="mt-0.5 px-2 text-center text-[10px] font-bold leading-tight">{labelTombol}</span>
				</button>
			)}

			{/* hasil tangkapan */}
			<AnimatePresence>
				{fase === "dapat" && hasil && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ delay: MUNCUL_KARTU, duration: 0.25 }}
						className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-slate-950/60 via-transparent to-transparent p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:items-center sm:justify-end sm:bg-gradient-to-l sm:pr-12"
					>
						<motion.div
							initial={{ y: 60, scale: 0.9 }}
							animate={{ y: 0, scale: 1 }}
							transition={{ delay: MUNCUL_KARTU, type: "spring", damping: 16 }}
							className="w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-2xl"
							style={{ boxShadow: `0 0 0 2px ${KELAS[hasil.ikan.kelas].warna}, 0 0 60px ${KELAS[hasil.ikan.kelas].warna}66` }}
						>
							<div className="relative px-5 pb-4 pt-5 text-center" style={{ background: `radial-gradient(circle at 50% 30%, ${KELAS[hasil.ikan.kelas].warna}55, transparent 70%)` }}>
								<span className="inline-block rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]" style={{ background: KELAS[hasil.ikan.kelas].warna, color: "#0b1220" }}>
									{KELAS[hasil.ikan.kelas].nama}
								</span>
								<div className="absolute right-4 top-4 flex flex-col items-end gap-1">
									{hasil.baru && <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-slate-950">JENIS BARU!</span>}
									{hasil.rekor && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">REKOR!</span>}
								</div>
								<motion.div initial={{ rotate: -8, scale: 0.6 }} animate={{ rotate: [0, -4, 4, 0], scale: 1 }} transition={{ delay: MUNCUL_KARTU + 0.2, duration: 0.8 }}>
									<IkonIkan ikan={hasil.ikan} className="mx-auto mt-3 h-24 w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]" />
								</motion.div>
								<p className="mt-2 text-2xl font-black">{hasil.ikan.nama}</p>
								<p className="text-xs italic text-slate-400">{hasil.ikan.latin}</p>
								<div className="mt-3 grid grid-cols-3 gap-2 text-center">
									<div className="rounded-xl bg-white/5 py-2">
										<p className="text-lg font-black tabular-nums">{angka(hasil.kg)}</p>
										<p className="text-[10px] uppercase tracking-wider text-slate-400">kg</p>
									</div>
									<div className="rounded-xl bg-white/5 py-2">
										<p className="text-lg font-black tabular-nums">{hasil.cm}</p>
										<p className="text-[10px] uppercase tracking-wider text-slate-400">cm</p>
									</div>
									<div className="rounded-xl bg-white/5 py-2">
										<p className="text-lg font-black tabular-nums text-amber-300">+{angka(hasil.poin)}</p>
										<p className="text-[10px] uppercase tracking-wider text-slate-400">koin</p>
									</div>
								</div>
								<p className="mt-3 text-xs leading-relaxed text-slate-300">{hasil.ikan.kisah}</p>
							</div>
							<div className="flex gap-2 border-t border-white/10 p-3">
								<button onClick={() => setAlbum(true)} className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/20">
									<FiBookOpen /> Album
								</button>
								<button onClick={() => pancing.t > JEDA_LANJUT && lanjutPancing()} className="flex-1 rounded-2xl bg-teal-500 py-3 text-sm font-black text-slate-950 hover:bg-teal-400">
									Lanjut memancing {sentuh ? "" : "(Spasi)"}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{album && <AlbumIkan onTutup={() => setAlbum(false)} />}
			{joran && <PanelJoran onTutup={() => setJoran(false)} />}
		</>
	);
}
