import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiBookOpen, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import { kirimUcap } from "../multipemain";
import { IKAN, KELAS, MODE_KAMERA, aturOtomatis, bolehOtomatis, gantiKamera, jamLapar, joranKini, ketuk, lanjutPancing, pancing, senarKini, tarikanSakti, useKoleksi, usePancing, zonaKini } from "../pancing";
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

// Pengukur tegangan setengah lingkaran: zona biru (kendor), hijau (pas), kuning (tegang),
// merah (putus). Jarum diputar langsung lewat atribut transform tiap frame.
function titikBusur(v) {
	const a = Math.PI - (Math.min(1.1, Math.max(0, v)) / 1.1) * Math.PI;
	return [100 + 78 * Math.cos(a), 96 - 78 * Math.sin(a)];
}
const busur = (v0, v1) => {
	const [x0, y0] = titikBusur(v0);
	const [x1, y1] = titikBusur(v1);
	return `M ${x0} ${y0} A 78 78 0 0 1 ${x1} ${y1}`;
};
function Pengukur({ zona, refJarum, refTeks }) {
	const [zb, za] = zona;
	return (
		<div className="relative mx-auto w-40 sm:w-48">
			<svg viewBox="0 0 200 108" className="w-full">
				<path d={busur(0, 1.1)} stroke="rgba(0,0,0,.45)" strokeWidth="20" fill="none" strokeLinecap="round" />
				<path d={busur(0, zb)} stroke="#3b82f6" strokeWidth="14" fill="none" strokeLinecap="round" />
				<path d={busur(zb, za)} stroke="#22c55e" strokeWidth="14" fill="none" />
				<path d={busur(za, 1)} stroke="#f59e0b" strokeWidth="14" fill="none" />
				<path d={busur(1, 1.1)} stroke="#ef4444" strokeWidth="14" fill="none" strokeLinecap="round" />
				<g ref={refJarum} transform="rotate(-90 100 96)">
					<line x1="100" y1="96" x2="100" y2="28" stroke="#fff" strokeWidth="4" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,.9))" }} />
				</g>
				<circle cx="100" cy="96" r="8" fill="#0f172a" stroke="#fff" strokeWidth="3" />
			</svg>
			<p ref={refTeks} className="absolute inset-x-0 top-[36%] text-center text-sm font-black sm:text-base" />
			<p className="mt-0.5 text-center text-[9px] font-bold uppercase tracking-widest text-white/55">Tegangan senar</p>
		</div>
	);
}

// Angka koin yang naik pelan dari 0 (kartu hasil).
function AngkaNaik({ nilai, tunda = 0 }) {
	const el = useRef();
	useEffect(() => {
		let id;
		const mulai = performance.now() + tunda * 1000;
		const putar = () => {
			const f = Math.min(1, Math.max(0, (performance.now() - mulai) / 900));
			if (el.current) el.current.textContent = `+${angka(Math.round(nilai * (1 - Math.pow(1 - f, 3))))}`;
			if (f < 1) id = requestAnimationFrame(putar);
		};
		id = requestAnimationFrame(putar);
		return () => cancelAnimationFrame(id);
	}, [nilai, tunda]);
	return <span ref={el}>+0</span>;
}

// Konfeti jatuh di belakang kartu hasil (lebih banyak untuk ikan langka).
const WARNA_KONFETI = ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#f8fafc"];
function Konfeti({ jumlah, tunda }) {
	const daftar = useRef(
		Array.from({ length: jumlah }, (_, i) => ({ x: Math.random() * 100, putar: Math.random() * 720 - 360, lama: 1.6 + Math.random() * 1.4, jeda: tunda + Math.random() * 0.6, warna: WARNA_KONFETI[i % WARNA_KONFETI.length], lebar: 6 + Math.random() * 6 })),
	).current;
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			{daftar.map((k, i) => (
				<motion.span
					key={i}
					className="absolute top-0 block rounded-sm"
					style={{ left: `${k.x}%`, width: k.lebar, height: k.lebar * 0.45, background: k.warna }}
					initial={{ y: -20, rotate: 0, opacity: 1 }}
					animate={{ y: 520, rotate: k.putar, opacity: [1, 1, 0] }}
					transition={{ duration: k.lama, delay: k.jeda, ease: "easeIn" }}
				/>
			))}
		</div>
	);
}

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
	// jam ikan lapar (diperiksa tiap detik)
	const [lapar, setLapar] = useState(jamLapar);
	useEffect(() => {
		const t = setInterval(() => setLapar(jamLapar()), 1000);
		return () => clearInterval(t);
	}, []);
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
	const jarumArah = useRef();
	const vinyet = useRef();
	const peringatan = useRef();
	const sentuhRef = useRef(sentuh);
	sentuhRef.current = sentuh;
	const kilatEl = useRef();
	const garisEl = useRef();
	const panelTarik = useRef();
	const kuasaIsi = useRef();
	const kuasaTeks = useRef();
	const tombolSakti = useRef();

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
			// O = AUTO (joran mahal), C = ganti sudut kamera
			if (e.code === "KeyO" && !e.repeat) aturOtomatis(!pancing.otomatis);
			if (e.code === "KeyC" && !e.repeat) gantiKamera();
			if (e.code === "KeyF" && pancing.fase === "tarik" && !e.repeat) {
				e.preventDefault();
				tarikanSakti();
			}
		};
		const naik = (e) => {
			if (e.code === "Space") pancing.tahan = false;
		};
		const lepas = () => (pancing.tahan = false);
		// mouse kiri/kanan dari tengah layar = arah joran saat adu tarik
		const gerakMouse = (e) => {
			if (e.pointerType !== "mouse") return;
			const x = (e.clientX / window.innerWidth - 0.5) / 0.3;
			pancing.arahMouse = Math.abs(x) < 0.08 ? 0 : Math.max(-1, Math.min(1, x));
		};
		window.addEventListener("pointermove", gerakMouse);
		window.addEventListener("keydown", turun);
		window.addEventListener("keyup", naik);
		window.addEventListener("blur", lepas);
		return () => {
			window.removeEventListener("keydown", turun);
			window.removeEventListener("keyup", naik);
			window.removeEventListener("blur", lepas);
			window.removeEventListener("pointermove", gerakMouse);
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
				tegangJarum.current.setAttribute("transform", `rotate(${-90 + (t / 1.1) * 180} 100 96)`);
				tegangTeks.current.textContent = p.bahaya > 0 ? "BAHAYA!" : t < zb ? "Kendor" : t <= za ? "Pas" : t < 1 ? "Tegang" : "AKAN PUTUS";
				tegangTeks.current.style.color = p.bahaya > 0 || t >= 1 ? "#fb7185" : t < zb ? "#93c5fd" : t <= za ? "#86efac" : "#fcd34d";
				gulungIsi.current.style.width = `${Math.min(1, p.gulung) * 100}%`;
				gulungIsi.current.style.background = "linear-gradient(90deg,#14b8a6,#fbbf24)";
				lariTanda.current.style.display = p.lari > 0 ? "flex" : "none";
				pulihTanda.current.style.opacity = p.pulih ? 1 : 0;
				const panjang = senarKini().panjang - 3;
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
				// jarum arah joran: hijau = melawan ikan, merah = searah ikan
				const ay = Math.max(-1, Math.min(1, p.ayun));
				jarumArah.current.style.left = `${50 + ay * 46}%`;
				jarumArah.current.style.background = Math.abs(ay) < 0.2 ? "#ffffff" : Math.sign(ay) === -p.arahIkan ? "#4ade80" : "#f43f5e";
				jarumArah.current.style.boxShadow = `0 0 8px ${jarumArah.current.style.background}`;
				const e = p.peristiwa;
				peringatan.current.style.display = e ? "flex" : "none";
				if (e) peringatan.current.textContent = e.jenis === "lompat" ? "🐟 MELOMPAT! BERHENTI MENGETUK!" : "⚡ SETRUM! BERHENTI MENGETUK!";
				const merah = p.amuk > 0 || p.bahaya > 0;
				const denyut = Math.sin(performance.now() / 90);
				vinyet.current.style.boxShadow =
					e?.jenis === "setrum" ? "inset 0 0 140px rgba(56,189,248,0.6)" : merah ? `inset 0 0 ${120 + denyut * 30}px rgba(239,68,68,0.55)` : p.habisi ? `inset 0 0 ${110 + denyut * 25}px rgba(245,158,11,0.45)` : "none";
				// meteran tarikan sakti
				const penuh = p.kuasa >= 1;
				kuasaIsi.current.style.width = `${p.kuasa * 100}%`;
				kuasaIsi.current.style.background = penuh ? "linear-gradient(90deg,#38bdf8,#e0f2fe,#38bdf8)" : "linear-gradient(90deg,#0ea5e9,#6366f1)";
				kuasaIsi.current.style.boxShadow = penuh ? `0 0 ${10 + denyut * 6}px #38bdf8` : "none";
				kuasaTeks.current.textContent = penuh ? (sentuhRef.current ? "SIAP! tekan ⚡" : "SIAP! tekan F") : `${Math.floor(p.kuasa * 100)}%`;
				kuasaTeks.current.style.color = penuh ? "#7dd3fc" : "";
				if (tombolSakti.current) {
					tombolSakti.current.style.opacity = penuh ? 1 : 0.4;
					tombolSakti.current.style.transform = penuh ? `scale(${1.05 + denyut * 0.05})` : "scale(0.9)";
				}
				// panel ikut terguncang saat ikan menyentak/mengamuk
				const g = p.getar * 7;
				panelTarik.current.style.transform = g > 0.3 ? `translate(${(Math.random() - 0.5) * g}px, ${(Math.random() - 0.5) * g}px)` : "";
			} else if (vinyet.current) vinyet.current.style.boxShadow = "none";
			// kilat layar & garis kecepatan (strike, tarikan sakti, ikan lari, dapat)
			if (kilatEl.current) {
				kilatEl.current.style.opacity = Math.min(0.65, p.kilat * 0.6);
				kilatEl.current.style.background = `radial-gradient(circle at 50% 45%, #ffffff 0%, ${p.warnaKilat} 45%, transparent 80%)`;
			}
			if (garisEl.current) {
				const kuat = Math.max(p.fase === "tarik" && p.lari > 0 ? 0.3 : 0, Math.min(0.8, p.dorong * 0.7));
				garisEl.current.style.opacity = kuat;
				if (kuat > 0) garisEl.current.style.transform = `rotate(${Math.random() * 6}deg) scale(${1 + p.dorong * 0.15})`;
			}
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
			<div ref={kilatEl} className="pointer-events-none absolute inset-0 z-10 opacity-0 mix-blend-screen" />
			<div
				ref={garisEl}
				className="pointer-events-none absolute -inset-[20%] z-10 opacity-0"
				style={{
					background: "repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg 2.6deg, rgba(255,255,255,0.55) 2.6deg 3deg)",
					WebkitMaskImage: "radial-gradient(circle at 50% 50%, transparent 32%, black 70%)",
					maskImage: "radial-gradient(circle at 50% 50%, transparent 32%, black 70%)",
				}}
			/>
			{/* teks besar momen penting: STRIKE!, TARIKAN SAKTI!, HABISI!, MONSTER! … */}
			<div className="pointer-events-none absolute inset-x-0 top-[30%] z-20 flex justify-center">
				<AnimatePresence>
					{pancing.sorak && (
						<motion.p
							key={pancing.sorak.id}
							initial={{ scale: 2.4, opacity: 0, rotate: -6 }}
							animate={{ scale: [2.4, 0.95, 1.05, 1], opacity: [0, 1, 1, 0], rotate: [-6, -3, -3, -3], y: [0, 0, 0, -30] }}
							transition={{ duration: 1.25, times: [0, 0.15, 0.7, 1] }}
							className="absolute whitespace-nowrap text-4xl font-black italic tracking-tight sm:text-6xl"
							style={{ color: pancing.sorak.warna, WebkitTextStroke: "2px #0f172a", textShadow: `0 0 24px ${pancing.sorak.warna}, 0 6px 0 #0f172a` }}
						>
							{pancing.sorak.teks}
						</motion.p>
					)}
				</AnimatePresence>
			</div>

			{/* kartu poin, album, suara */}
			<div className="pointer-events-auto absolute right-3 top-[6.75rem] z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-end gap-1.5 rounded-2xl bg-slate-950/70 px-2 py-1.5 text-white shadow-lg ring-1 ring-white/10 backdrop-blur sm:top-20">
				<span className="px-1.5 text-xs font-bold tabular-nums" title="Koin — belanja di Alfamart">🪙 {angka(poin)}</span>
				{pancing.combo >= 2 && (
					<span className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-2 py-1 text-xs font-black" title="Tangkapan beruntun: koin bertambah">
						🔥 ×{pancing.combo}
					</span>
				)}
				<button onClick={() => setJoran(true)} className="rounded-xl bg-amber-400/90 px-2 py-1 text-xs font-black text-slate-950 hover:bg-amber-300" aria-label="Toko pancing: joran & senar" title={`${joranKini().nama} · ${senarKini().nama}`}>
					🎣<span className="hidden sm:inline"> {joranKini().nama.replace("Joran ", "")}</span>
				</button>
				<button onClick={() => setAlbum(true)} className="flex items-center gap-1 rounded-xl bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20" aria-label="Buka album ikan">
					<FiBookOpen />
					<span className="hidden sm:inline">
						{jumlahJenis}/{IKAN.length}
					</span>
				</button>
				<button
					onClick={() => aturOtomatis(!pancing.otomatis)}
					className={`rounded-xl px-2 py-1 text-xs font-black transition ${pancing.otomatis ? "bg-violet-500 text-white shadow-[0_0_14px_rgba(139,92,246,0.8)]" : bolehOtomatis() ? "bg-white/10 hover:bg-white/20" : "bg-white/5 text-white/45"}`}
					aria-pressed={pancing.otomatis}
					title={bolehOtomatis() ? "Memancing otomatis (O) — koin hasil 75%" : "Butuh joran premium: Titanium Pro, Dasar Monster, atau Naga Emas"}
				>
					{bolehOtomatis() ? "🤖" : "🔒"} AUTO
				</button>
				<button onClick={gantiKamera} className="rounded-xl bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20" title={`Sudut kamera: ${MODE_KAMERA.find((k) => k.id === pancing.kamera)?.nama} (C)`} aria-label="Ganti sudut kamera">
					{MODE_KAMERA.find((k) => k.id === pancing.kamera)?.ikon}
					<span className="hidden lg:inline"> {MODE_KAMERA.find((k) => k.id === pancing.kamera)?.nama}</span>
				</button>
				<button
					onClick={() => {
						aturSuara(!mati);
						setMati(!mati);
					}}
					className="rounded-xl bg-white/10 p-1.5 hover:bg-white/20 max-[400px]:hidden"
					aria-label={mati ? "Nyalakan suara" : "Matikan suara"}
				>
					{mati ? <FiVolumeX /> : <FiVolume2 />}
				</button>
				<button onClick={onSelesai} className="rounded-xl bg-rose-500/80 p-1.5 hover:bg-rose-500" aria-label="Selesai memancing (E)">
					<FiX />
				</button>
			</div>

			{/* jam ikan lapar & pesan (satu tumpukan supaya tidak saling menutupi) */}
			<div className="pointer-events-none absolute inset-x-0 top-[9.5rem] z-20 flex flex-col items-center gap-1.5 px-4 sm:top-[7.25rem]">
				{lapar.aktif && (
					<motion.p
						animate={{ scale: [1, 1.04, 1] }}
						transition={{ duration: 1.6, repeat: Infinity }}
						className="rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 px-4 py-1 text-center text-[11px] font-black text-slate-950 shadow-lg ring-2 ring-amber-200 sm:text-xs"
					>
						🐟 JAM IKAN LAPAR · sambaran 2× · premium ↑ · {Math.floor(lapar.sisa / 60000)}:{String(Math.floor((lapar.sisa % 60000) / 1000)).padStart(2, "0")}
					</motion.p>
				)}
				<AnimatePresence mode="wait">
					{pesan && fase !== "dapat" && (
						<motion.p
							key={`${pesan.teks}${pesan.id ?? ""}`}
							initial={{ opacity: 0, y: -10, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: pesan.jenis === "besar" ? [1, 1.06, 1] : 1 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.25 }}
							className={`max-w-md rounded-2xl px-4 py-2 text-center text-xs font-semibold shadow-xl backdrop-blur sm:text-sm [@media(max-height:520px)]:max-w-sm [@media(max-height:520px)]:py-1.5 [@media(max-height:520px)]:text-xs ${WARNA_PESAN[pesan.jenis] || WARNA_PESAN.info}`}
						>
							{pesan.teks}
						</motion.p>
					)}
				</AnimatePresence>
			</div>

			{/* panel bawah */}
			<div className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3 [@media(max-height:520px)]:bottom-3 ${sentuh ? "bottom-40" : "bottom-24"}`}>
				{fase === "siap" && (
					<motion.div initial={{ y: 30, opacity: 0, scale: 0.92 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 22 }} className="w-72 rounded-2xl bg-slate-950/65 p-3 text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
						<Batang label="Tenaga lemparan" refIsi={tenagaIsi}>
							<div className="absolute inset-y-0 right-0 w-[7%] bg-amber-400/30" />
						</Batang>
						<p className="mt-2 text-center text-[11px] text-white/75">
							{sentuh ? "Tahan tombol 🎣 · analog ◀ ▶ membidik" : "Tahan SPASI, lepas di ujung kuning · A/D membidik"}
						</p>
					</motion.div>
				)}
				{fase === "tunggu" && (
					<motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-full bg-slate-950/60 px-4 py-2 text-xs text-white/85 backdrop-blur">
						Pelampung mengapung… ketuk saat <b>tenggelam</b> · {sentuh ? "analog" : "geser mouse"} = seret pelampung · tahan {sentuh ? "tombol" : "SPASI"} = gulung pelan-pelan
					</motion.p>
				)}
			</div>

			{/* panel tarik di pojok kiri bawah — tidak menutupi pemancing & ikannya di tengah layar */}
			{/* layar sentuh: di HP tegak di atas joystick, di tablet / HP mendatar di kanan joystick */}
			<div
				className={`pointer-events-none absolute left-3 z-20 sm:left-5 ${
					sentuh ? "bottom-[calc(max(1rem,env(safe-area-inset-bottom))+8.75rem)] sm:bottom-[calc(max(1rem,env(safe-area-inset-bottom))+0.5rem)] sm:left-[9.75rem] [@media(max-height:520px)]:bottom-2" : "bottom-6"
				}`}
			>
				{fase === "tarik" && ikan && (
					<motion.div initial={{ x: -120, opacity: 0, rotate: -4, scale: 0.85 }} animate={{ x: 0, opacity: 1, rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
					<div ref={panelTarik} className="w-[min(18rem,58vw)] origin-bottom-left [@media(max-width:639px)_and_(min-height:761px)]:scale-[0.85] [@media(max-width:639px)_and_(max-height:760px)]:scale-[0.76] [@media(min-width:640px)_and_(max-height:520px)]:scale-[0.62] space-y-2 rounded-2xl bg-slate-950/75 p-2.5 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur sm:w-[19rem] sm:space-y-2.5 sm:p-3">
						{/* ikan misterius: belum terlihat jenisnya, hanya kilau kelasnya */}
						<div className="flex items-center gap-3">
							<motion.span
								animate={{ boxShadow: [`0 0 0 0 ${k.warna}aa`, `0 0 0 10px ${k.warna}00`] }}
								transition={{ duration: 1.2, repeat: Infinity }}
								className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-black"
								style={{ background: `radial-gradient(circle, ${k.warna}66, ${k.warna}22)`, border: `2px solid ${k.warna}` }}
							>
								?
							</motion.span>
							<div className="min-w-0 flex-1">
								<p className="text-[10px] font-black uppercase tracking-widest" style={{ color: k.warna }}>
									{ikan.kelas >= 3 ? "⚠ " : ""}
									{k.nama} · {"★".repeat(ikan.kelas + 1)}
								</p>
								<p className="truncate text-sm font-bold text-white">{ikan.kelas >= 3 ? "Sesuatu yang SANGAT besar…" : ikan.kelas === 2 ? "Tarikannya kuat sekali!" : "Ikan menarik senar!"}</p>
								<div className="mt-1 h-2 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/15">
									<div ref={staminaIsi} className="h-full rounded-full" style={{ width: "100%" }} />
								</div>
							</div>
						</div>
						<Pengukur zona={zonaKini(ikan.kelas)} refJarum={tegangJarum} refTeks={tegangTeks} />
						<Batang label={sentuh ? "Laju gulung — ketuk 🎣 berulang" : "Laju gulung — ketuk SPASI berulang"} refIsi={gulungIsi}>
							<span ref={pulihTanda} className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-[8px] font-black uppercase leading-none tracking-wide text-sky-200 opacity-0 transition-opacity">
								Ikan pulih — beri tekanan!
							</span>
						</Batang>
						<div className="[@media(max-height:520px)]:hidden">
							<Batang label="Senar terulur" kanan={senarTeks} refIsi={senarIsi} />
						</div>
						<Batang label="⚡ Tarikan sakti" kanan={kuasaTeks} refIsi={kuasaIsi} />
						<div>
							<div className="flex items-center gap-2">
								<span ref={arahKiri} className="text-lg leading-none">⬅</span>
								{/* arah joran (mouse / A/D): jarum hijau = melawan ikan */}
								<div className="relative h-2 flex-1 rounded-full bg-white/10 ring-1 ring-white/10">
									<div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
									<div ref={jarumArah} className="absolute -top-1 h-4 w-2 -translate-x-1/2 rounded-full bg-white" style={{ left: "50%" }} />
								</div>
								<span ref={arahKanan} className="text-lg leading-none">➡</span>
							</div>
							<p className="mt-1 text-center text-[11px] font-semibold text-white/75 [@media(max-height:520px)]:hidden">
								Ikan lari ke panah terang — {sentuh ? "dorong analog" : "arahkan mouse"} ke arah <b>sebaliknya</b>
							</p>
						</div>
						<div ref={lariTanda} className="hidden animate-pulse items-center justify-center rounded-xl bg-rose-500 py-1.5 text-sm font-black text-white">
							🏃 IKAN LARI! BERHENTI MENGETUK
						</div>
						<div ref={peringatan} className="hidden animate-pulse items-center justify-center rounded-xl bg-amber-400 py-1.5 text-sm font-black text-slate-950" />
					</div>
					</motion.div>
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

			{sentuh && fase === "tarik" && (
				<button
					ref={tombolSakti}
					onPointerDown={(e) => {
						e.preventDefault();
						tarikanSakti();
					}}
					className="pointer-events-auto absolute bottom-[calc(max(1rem,env(safe-area-inset-bottom))+10rem)] right-8 z-30 flex h-16 w-16 select-none flex-col items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-2xl ring-4 ring-sky-200/70"
					style={{ touchAction: "none", opacity: 0.4 }}
					aria-label="Tarikan sakti"
				>
					<span className="text-2xl leading-none">⚡</span>
					<span className="text-[9px] font-black">SAKTI</span>
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
							<div className="relative overflow-hidden px-5 pb-4 pt-5 text-center" style={{ background: `radial-gradient(circle at 50% 30%, ${KELAS[hasil.ikan.kelas].warna}55, transparent 70%)` }}>
								{/* sinar berputar di belakang ikan */}
								<motion.div
									className="pointer-events-none absolute left-1/2 top-24 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 opacity-40"
									style={{ background: `repeating-conic-gradient(${KELAS[hasil.ikan.kelas].warna}55 0deg 10deg, transparent 10deg 24deg)` }}
									animate={{ rotate: 360 }}
									transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
								/>
								<Konfeti jumlah={18 + hasil.ikan.kelas * 14} tunda={MUNCUL_KARTU} />
								<span className="inline-block rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]" style={{ background: KELAS[hasil.ikan.kelas].warna, color: "#0b1220" }}>
									{KELAS[hasil.ikan.kelas].nama}
								</span>
								<div className="absolute right-4 top-4 flex flex-col items-end gap-1">
									{hasil.baru && <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-slate-950">JENIS BARU!</span>}
									{hasil.rekor && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">REKOR!</span>}
									{hasil.perfect && <span className="rounded-full bg-sky-400 px-2 py-0.5 text-[10px] font-black text-slate-950">⚡ PERFECT</span>}
									{hasil.combo >= 2 && <span className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-2 py-0.5 text-[10px] font-black">🔥 COMBO ×{hasil.combo}</span>}
									{hasil.lapar && <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black text-slate-950">🐟 JAM LAPAR</span>}
									{hasil.otomatis && <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-black">🤖 AUTO</span>}
									{hasil.lomba && (
										<span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-black text-slate-950">
											🏆 #{hasil.lomba.peringkat}
											{hasil.lomba.babonBaru ? " · BABON!" : ""}
										</span>
									)}
								</div>
								<motion.div initial={{ rotate: -8, scale: 0.6 }} animate={{ rotate: [0, -4, 4, 0], scale: 1 }} transition={{ delay: MUNCUL_KARTU + 0.2, duration: 0.8 }}>
									<IkonIkan ikan={hasil.ikan} className="mx-auto mt-3 h-24 w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]" />
								</motion.div>
								<p className="relative mt-2 text-2xl font-black">{hasil.ikan.nama}</p>
								<p className="relative text-xl tracking-widest">
									{[1, 2, 3].map((n) => (
										<motion.span
											key={n}
											initial={{ scale: 0, opacity: 0 }}
											animate={{ scale: 1, opacity: 1 }}
											transition={{ delay: MUNCUL_KARTU + 0.4 + n * 0.15, type: "spring" }}
											className={n <= hasil.bintang ? "text-amber-300" : "text-white/20"}
										>
											★
										</motion.span>
									))}
								</p>
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
										<p className="text-lg font-black tabular-nums text-amber-300">
											<AngkaNaik nilai={hasil.poin} tunda={MUNCUL_KARTU + 0.3} />
										</p>
										<p className="text-[10px] uppercase tracking-wider text-slate-400">koin{hasil.kolam ? " · harga kolam" : hasil.pengali > 1 ? ` · ×${hasil.pengali.toFixed(2).replace(/0$/, "")}` : ""}</p>
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
