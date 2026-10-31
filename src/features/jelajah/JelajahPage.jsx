import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
	FiArrowLeft,
	FiCheckCircle,
	FiGrid,
	FiHelpCircle,
	FiMap,
	FiMoon,
	FiSun,
	FiClock,
	FiMenu,
	FiMessageCircle,
	FiNavigation,
	FiX,
	FiArrowUp,
	FiMessageSquare,
	FiSend,
	FiSmile,
	FiUsers,
} from "react-icons/fi";
import api from "../../api";
import { penampilanAvatar } from "./avatar";
import { kendaraanDariId } from "./scene/kendaraan";
import { kirimEmote, kirimUcap, putusJelajah, sambungJelajah, sapaPemain, tutupSapaan, useMultipemain } from "./multipemain";
import { AREA_PER_ID, BENDA, HALAMAN, LOBI, RUANGAN, TITIK_MULAI, titikDepanPetugas } from "./kantorConfig";
import { kendali, posisi as posisiPemain, resetJelajah, useKeadaan } from "./jelajahStore";
import { suasana } from "./scene/suasana";
import { susunPenghuni } from "./penghuni";
import InfoPanel from "./ui/InfoPanel";
import Minimap from "./ui/Minimap";
import Joystick from "./ui/Joystick";
import LayarAwal from "./ui/LayarAwal";
import Denah2D from "./ui/Denah2D";
import ModalSelesai from "./ui/ModalSelesai";

const muatScene = () => import("./scene/KantorScene");
const KantorScene = lazy(muatScene);

const KUNCI_SIMPAN = "jelajah-dpmd-dikunjungi";
const BENDA_PER_ID = Object.fromEntries(BENDA.map((b) => [b.id, b]));
const NAMA_LANTAI = ["Lt. 1", "Lt. 2"];
const EMOTE = [
	["lambai", "👋", "Lambai"],
	["jempol", "👍", "Jempol"],
	["tepuk", "👏", "Tepuk tangan"],
	["tawa", "😂", "Tertawa"],
	["hati", "❤️", "Suka"],
];

function bacaDikunjungi() {
	try {
		const isi = JSON.parse(localStorage.getItem(KUNCI_SIMPAN) || "[]");
		return new Set(isi.filter((id) => RUANGAN.some((r) => r.id === id)));
	} catch {
		return new Set();
	}
}

function simpanDikunjungi(set) {
	try {
		localStorage.setItem(KUNCI_SIMPAN, JSON.stringify([...set]));
	} catch {
		// penyimpanan diblokir (mode privat): progres cukup bertahan selama halaman terbuka
	}
}

// three.js r163+ hanya mendukung WebGL 2.
function adaWebGL2() {
	try {
		return !!document.createElement("canvas").getContext("webgl2");
	} catch {
		return false;
	}
}

const cocokMedia = (q) => typeof window !== "undefined" && window.matchMedia?.(q).matches;

// Bila pembuatan konteks WebGL gagal di tengah jalan, pindah ke Denah 2D alih-alih layar kosong.
class PenjagaScene extends Component {
	state = { gagal: false };
	static getDerivedStateFromError() {
		return { gagal: true };
	}
	componentDidCatch(galat) {
		this.props.onGagal(galat);
	}
	render() {
		return this.state.gagal ? null : this.props.children;
	}
}

function Memuat() {
	return (
		<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[rgb(var(--color-primary))] text-white">
			<div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[rgb(var(--color-secondary))]" />
			<p className="text-sm text-white/80">Menyiapkan kantor…</p>
		</div>
	);
}

function TombolIkon({ label, aktif, onClick, children }) {
	return (
		<button
			onClick={onClick}
			aria-label={label}
			title={label}
			aria-pressed={aktif}
			className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-md ring-1 ring-black/5 backdrop-blur transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
				aktif ? "bg-[rgb(var(--color-primary))] text-white" : "bg-white/90 text-slate-700 hover:bg-white"
			}`}
		>
			{children}
		</button>
	);
}

function Lembar({ judul, onTutup, children }) {
	return (
		<div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onTutup}>
			<section
				role="dialog"
				aria-modal="true"
				aria-label={judul}
				onClick={(e) => e.stopPropagation()}
				className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
			>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-bold text-slate-900">{judul}</h2>
					<button
						autoFocus
						onClick={onTutup}
						aria-label="Tutup"
						className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
					>
						<FiX />
					</button>
				</div>
				{children}
			</section>
		</div>
	);
}

export default function JelajahPage() {
	const webglOk = useMemo(adaWebGL2, []);
	const sentuh = useMemo(() => cocokMedia("(pointer: coarse)"), []);
	const sarankan2D = useMemo(
		() => cocokMedia("(prefers-reduced-motion: reduce)") || (navigator.deviceMemory && navigator.deviceMemory <= 2),
		[],
	);

	const [mode, setMode] = useState("awal");
	const [panel, setPanel] = useState(null);
	const [menu, setMenu] = useState(null);
	const [peta, setPeta] = useState(!sentuh);
	const [dikunjungi, setDikunjungi] = useState(bacaDikunjungi);
	const [selesai, setSelesai] = useState(false);
	const [statistik, setStatistik] = useState(null);
	const [kilat, setKilat] = useState(0);
	const [kabarArea, setKabarArea] = useState(null);
	const [gagal3D, setGagal3D] = useState(false);
	const [pesan, setPesan] = useState(null);
	const [antrean, setAntrean] = useState(null);
	const [dataPegawai, setDataPegawai] = useState(null);
	// Pegawai DPMD sungguhan ditempatkan ke kursi, ruang rapat, pos jaga, dst.
	const penghuni = useMemo(() => susunPenghuni(dataPegawai), [dataPegawai]);
	const baruLengkap = useRef(false);
	const { area, lantai, dekat, minta, mode: modeMain } = useKeadaan();
	// Jelajah bersama tamu lain
	const [profil, setProfil] = useState(null);
	const penampilan = useMemo(() => (profil ? penampilanAvatar(profil) : undefined), [profil]);
	const { daftar: tamuLain, obrolan, sapaan, status: statusMp, galat: galatMp, ruang: ruangMp } = useMultipemain();
	const [ketik, setKetik] = useState(null);
	const [pilihEmote, setPilihEmote] = useState(false);
	const [kini, setKini] = useState(() => Date.now());
	// Di HP petunjuk awal hanya tampil sebentar supaya layar tetap lega.
	const [mulaiPada, setMulaiPada] = useState(0);
	// Suasana: ikuti jam WIB (null), atau dipaksa "siang"/"malam".
	const [modeSuasana, setModeSuasana] = useState(suasana.paksa);
	const gantiSuasana = () => {
		const urutan = [null, "siang", "malam"];
		const baru = urutan[(urutan.indexOf(modeSuasana) + 1) % urutan.length];
		suasana.paksa = baru;
		setModeSuasana(baru);
	};
	const [IkonSuasana, labelSuasana] = modeSuasana === "siang" ? [FiSun, "Siang"] : modeSuasana === "malam" ? [FiMoon, "Malam"] : [FiClock, "Ikuti jam"];

	// Hook untuk uji otomatis di browser — hanya ada di mode dev, tidak ikut ke build produksi.
	useEffect(() => {
		if (import.meta.env.DEV) window.__jelajah = { kendali, posisi: () => ({ ...posisiPemain, kend: posisiPemain.kend?.id ?? null }), kendaraan: (id) => kendaraanDariId(id) };
	}, []);

	useEffect(() => {
		resetJelajah();
		const judulLama = document.title;
		document.title = "Jelajah Kantor — DPMD Kabupaten Bogor";
		return () => {
			document.title = judulLama;
		};
	}, []);

	// Unduh chunk 3D di latar selagi pengunjung membaca layar pembuka.
	useEffect(() => {
		if (webglOk) muatScene().catch(() => {});
	}, [webglOk]);

	useEffect(() => {
		api
			.get("/public/stats")
			.then((r) => setStatistik(r.data?.data ?? null))
			.catch(() => setStatistik(null));
		// Tanpa data (API gagal), kantor tetap ramai dengan penghuni tanpa nama.
		api
			.get("/public/pegawai-kantor")
			.then((r) => setDataPegawai(Array.isArray(r.data?.data) ? r.data.data : null))
			.catch(() => setDataPegawai(null));
	}, []);

	// Tersambung ke tamu lain hanya selama menjelajah 3D.
	useEffect(() => {
		if (mode !== "3d" || profil?.mode !== "bersama") return;
		sambungJelajah(profil);
		return putusJelajah;
	}, [mode, profil]);

	// Pesan obrolan memudar setelah beberapa detik.
	useEffect(() => {
		if (mode !== "3d") return;
		const t = setInterval(() => setKini(Date.now()), 2000);
		return () => clearInterval(t);
	}, [mode]);

	useEffect(() => {
		if (!sapaan) return;
		const t = setTimeout(tutupSapaan, 6000);
		return () => clearTimeout(t);
	}, [sapaan]);

	const kirimChat = (e) => {
		e.preventDefault();
		kirimUcap(ketik);
		setKetik(null);
	};

	const bukaPanel = useCallback((id) => {
		if (id.startsWith("tamu:")) {
			sapaPemain(id.slice(5));
			return;
		}
		if (/^(kursi|mobil|motor):|^(berdiri|keluar)$/.test(id)) {
			kendali.aksi = id;
			return;
		}
		const benda = BENDA_PER_ID[id];
		if (benda) {
			if (benda.aksi.jenis === "pindah") setMenu("pindah");
			else setPesan(benda.aksi);
			return;
		}
		setMenu(null);
		setPanel(id);
		if (id === "lobi") return;
		setDikunjungi((lama) => {
			if (lama.has(id)) return lama;
			const baru = new Set(lama).add(id);
			simpanDikunjungi(baru);
			if (baru.size === RUANGAN.length) baruLengkap.current = true;
			return baru;
		});
	}, []);

	const tutupPanel = useCallback(() => {
		setPanel(null);
		if (baruLengkap.current) {
			baruLengkap.current = false;
			setSelesai(true);
		}
	}, []);

	const pindahCepat = useCallback(
		(id) => {
			if (mode !== "3d") {
				bukaPanel(id);
				return;
			}
			setPanel(null);
			setMenu(null);
			kendali.teleport = id === "luar" ? { ...TITIK_MULAI } : titikDepanPetugas(AREA_PER_ID[id]);
			setKilat((k) => k + 1);
		},
		[mode, bukaPanel],
	);

	// Pemain tiba di depan petugas yang tadi diklik → buka panelnya.
	useEffect(() => {
		if (minta) bukaPanel(minta.split(":")[0]);
	}, [minta, bukaPanel]);

	// Kartu nama ruang saat pengunjung memasuki area baru.
	useEffect(() => {
		if (mode !== "3d" || area === "tangga") return;
		setKabarArea(AREA_PER_ID[area]);
		const t = setTimeout(() => setKabarArea(null), 2400);
		return () => clearTimeout(t);
	}, [area, mode]);

	const jeda = !!panel || selesai || !!menu || !!pesan;
	useEffect(() => {
		if (!jeda) return;
		kendali.arah.x = 0;
		kendali.arah.y = 0;
		kendali.lariAnalog = false;
		kendali.putar = 0;
	}, [jeda]);

	useEffect(() => {
		const tekan = (e) => {
			if (e.repeat || e.target.closest?.("input, textarea, [contenteditable]")) return;
			if (e.key === "Escape") {
				if (pilihEmote) setPilihEmote(false);
				else if (selesai) setSelesai(false);
				else if (pesan) setPesan(null);
				else if (panel) tutupPanel();
				else if (menu) setMenu(null);
				return;
			}
			if (mode !== "3d" || panel || menu || selesai || pesan) return;
			if (e.code === "KeyE" && dekat) bukaPanel(dekat);
			if (e.code === "KeyM") setPeta((v) => !v);
			if (statusMp === "tersambung") {
				if (e.key === "Enter" || e.code === "KeyT") {
					e.preventDefault();
					setKetik("");
				}
				const em = EMOTE[Number(e.key) - 1];
				if (em && /^Digit[1-5]$/.test(e.code)) kirimEmote(em[0]);
			}
		};
		window.addEventListener("keydown", tekan);
		return () => window.removeEventListener("keydown", tekan);
	}, [mode, panel, menu, selesai, pesan, dekat, bukaPanel, tutupPanel, statusMp, pilihEmote]);

	const mulai3D = (profilBaru) => {
		if (profilBaru?.nama) setProfil(profilBaru);
		resetJelajah();
		setMulaiPada(Date.now());
		setKini(Date.now());
		setMode("3d");
	};

	const areaPanel = panel && AREA_PER_ID[panel];
	// Yang bisa diajak berinteraksi: petugas (punya npc) atau benda.
	const petugasDekat = dekat && AREA_PER_ID[dekat]?.npc ? AREA_PER_ID[dekat] : null;
	const bendaDekat = dekat ? BENDA_PER_ID[dekat] : null;
	// Aksi gerak pengunjung: duduk/berdiri, naik/turun mobil & motor.
	const tamuDekat = dekat?.startsWith("tamu:") ? tamuLain.find((t) => t.id === dekat.slice(5)) : null;
	const aksiGerak = !dekat
		? null
		: tamuDekat
			? [`Sapa ${tamuDekat.nama} 👋`, "Sapa", "#0284c7"]
		: dekat.startsWith("kursi:")
			? ["Duduk di sini", "Duduk", "#475569"]
			: dekat.startsWith("mobil:")
				? ["Buka pintu & masuk mobil", "Masuk", "#334155"]
				: dekat.startsWith("motor:")
					? ["Naik motor", "Naik", "#c4532d"]
					: dekat === "berdiri"
						? ["Berdiri", "Berdiri", "#475569"]
						: dekat === "keluar"
							? modeMain === "motor"
								? ["Turun dari motor", "Turun", "#c4532d"]
								: ["Buka pintu & keluar", "Keluar", "#334155"]
							: null;
	const sasaran = petugasDekat
		? { id: petugasDekat.id, label: `Bicara dengan ${penghuni.petugas[petugasDekat.id]?.nama ?? petugasDekat.petugas}`, tombol: "Tanya", warna: petugasDekat.warna }
		: bendaDekat
			? { id: bendaDekat.id, label: bendaDekat.label, tombol: "Pakai", warna: "#1f6b50" }
			: aksiGerak
				? { id: dekat, label: aksiGerak[0], tombol: aksiGerak[1], warna: aksiGerak[2] }
				: null;
	const berkendara = modeMain === "mobil" || modeMain === "motor";
	const ambilAntrean = () => setAntrean((n) => (n ?? 23) + 1);

	return (
		<>
			{mode === "awal" && (
				<LayarAwal
					webglOk={webglOk && !gagal3D}
					sentuh={sentuh}
					sarankan2D={sarankan2D}
					onMulai3D={mulai3D}
					onMulai2D={() => setMode("2d")}
				/>
			)}

			{mode === "2d" && (
				<Denah2D
					statistik={statistik}
					dikunjungi={dikunjungi}
					onBuka={bukaPanel}
					onCoba3D={webglOk && !gagal3D ? () => (profil ? mulai3D(profil) : setMode("awal")) : null}
					galat3D={gagal3D}
				/>
			)}

			{mode === "3d" && (
				<div className="fixed inset-0 select-none overflow-hidden bg-[#cfe6f1]">
					<PenjagaScene
						onGagal={(galat) => {
							setGagal3D(galat?.message || "galat tidak dikenal");
							setMode("2d");
						}}
					>
						<Suspense fallback={<Memuat />}>
							<KantorScene statistik={statistik} dikunjungi={dikunjungi} jeda={jeda} penghuni={penghuni} penampilan={penampilan} />
						</Suspense>
					</PenjagaScene>

					{/* --- HUD atas: di HP ringkas (kembali, lokasi, progres, menu) --- */}
					<div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 pb-3 pt-[max(2rem,env(safe-area-inset-top))] sm:px-4">
						<div className="pointer-events-auto flex min-w-0 items-center gap-2">
							<Link
								to="/"
								aria-label="Kembali ke beranda"
								className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-white/90 px-3 text-sm font-semibold text-slate-700 shadow-md ring-1 ring-black/5 backdrop-blur hover:bg-white"
							>
								<FiArrowLeft /> <span className="hidden sm:inline">Beranda</span>
							</Link>
							<div className="flex h-10 min-w-0 items-center rounded-xl bg-white/90 px-2.5 text-xs font-semibold text-slate-800 shadow-md ring-1 ring-black/5 backdrop-blur sm:px-3 sm:text-sm">
								<span className="mr-2 shrink-0 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] text-white sm:text-[11px]">{NAMA_LANTAI[lantai]}</span>
								<span className="truncate">{AREA_PER_ID[area]?.nama}</span>
							</div>
						</div>
						<div className="pointer-events-auto flex shrink-0 items-center gap-2">
							{profil?.mode === "bersama" && (
								<div
									className="flex h-10 items-center gap-1.5 rounded-xl bg-white/90 px-2.5 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-black/5 backdrop-blur sm:px-3"
									title={
										statusMp === "tersambung"
											? `${ruangMp ? `Kantor #${ruangMp} · ` : ""}${tamuLain.length + 1} tamu sedang menjelajah: ${[profil.nama, ...tamuLain.map((t) => t.nama)].join(", ")}`
											: galatMp || "Belum tersambung dengan tamu lain"
									}
								>
									<span className={`h-2 w-2 rounded-full ${statusMp === "tersambung" ? "bg-emerald-500" : "bg-slate-400"}`} />
									<FiUsers className="text-slate-600" />
									<span className="tabular-nums">{statusMp === "tersambung" ? tamuLain.length + 1 : "–"}</span>
									<span className="sr-only">tamu online</span>
								</div>
							)}
							<div
								className="flex h-10 items-center gap-1.5 rounded-xl bg-white/90 px-2.5 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-black/5 backdrop-blur sm:px-3"
								title="Ruang bidang yang sudah dikunjungi"
							>
								<FiCheckCircle className="text-emerald-600" />
								<span className="tabular-nums">
									{dikunjungi.size}/{RUANGAN.length}
								</span>
								<span className="sr-only">ruang dikunjungi</span>
							</div>
							<div className="hidden items-center gap-2 sm:flex">
								<TombolIkon label="Pindah cepat" aktif={menu === "pindah"} onClick={() => setMenu("pindah")}>
									<FiNavigation />
								</TombolIkon>
								<TombolIkon label={peta ? "Sembunyikan peta (M)" : "Tampilkan peta (M)"} aktif={peta} onClick={() => setPeta((v) => !v)}>
									<FiMap />
								</TombolIkon>
								<TombolIkon label={`Suasana: ${labelSuasana} (ketuk untuk ganti)`} aktif={modeSuasana !== null} onClick={gantiSuasana}>
									<IkonSuasana />
								</TombolIkon>
								<TombolIkon label="Denah 2D" onClick={() => setMode("2d")}>
									<FiGrid />
								</TombolIkon>
								<TombolIkon label="Cara bermain" aktif={menu === "bantuan"} onClick={() => setMenu("bantuan")}>
									<FiHelpCircle />
								</TombolIkon>
							</div>
							<div className="sm:hidden">
								<TombolIkon label="Menu" aktif={menu === "aksi"} onClick={() => setMenu("aksi")}>
									<FiMenu />
								</TombolIkon>
							</div>
						</div>
					</div>

					{peta && (
						<Minimap
							area={area}
							lantai={lantai}
							dikunjungi={dikunjungi}
							onPilih={pindahCepat}
							className="absolute right-3 top-[6.5rem] w-28 sm:bottom-4 sm:right-4 sm:top-auto sm:w-44"
						/>
					)}

					{/* kartu nama area */}
					<AnimatePresence>
						{kabarArea && (
							<motion.div
								key={kabarArea.id}
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className="pointer-events-none absolute inset-x-0 top-28 flex justify-center px-4 sm:top-24"
							>
								<div className="max-w-full rounded-2xl bg-slate-900/75 px-5 py-2.5 text-center text-white backdrop-blur">
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: kabarArea.warna || "#f3d48a" }}>
										{kabarArea.id === "luar" ? "Di luar" : `${kabarArea.id === "lobi" ? "Masuk · " : ""}${NAMA_LANTAI[lantai]}`}
									</p>
									<p className="truncate text-sm font-bold sm:text-lg">{kabarArea.nama}</p>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* ajakan bicara (desktop) / petunjuk */}
					{!jeda && (
						<div
							className={`pointer-events-none absolute inset-x-0 flex justify-center ${
								sentuh ? "top-[6.25rem] px-16" : "bottom-6 px-40"
							}`}
						>
							{sasaran ? (
								!sentuh && (
									<button
										onClick={() => bukaPanel(sasaran.id)}
										className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl ring-1 ring-black/5"
									>
										<kbd className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs text-white">E</kbd>
										{sasaran.label}
									</button>
								)
							) : (
								area === "luar" &&
								!berkendara &&
								(!sentuh || kini - mulaiPada < 12000) && (
									<p className="rounded-full bg-slate-900/55 px-3.5 py-1.5 text-center text-[11px] text-white backdrop-blur sm:px-4 sm:py-2 sm:text-sm">
										{sentuh ? "Geser analog atau ketuk lantai" : "Jalan dengan WASD, atau klik lantai"} untuk menuju pintu masuk
									</p>
								)
							)}
						</div>
					)}

					{berkendara && !jeda && !sentuh && (
						<p className="pointer-events-none absolute left-1/2 top-28 -translate-x-1/2 rounded-full bg-slate-900/65 px-4 py-2 text-center text-xs text-white backdrop-blur sm:top-24 sm:text-sm">
							W/S gas & mundur · A/D belok · Shift turbo · E {modeMain === "motor" ? "turun" : "keluar"}
						</p>
					)}

					{profil?.mode === "bersama" && statusMp === "terputus" && galatMp && !jeda && (
						<p className="pointer-events-none absolute inset-x-4 top-[9.5rem] mx-auto w-fit max-w-md rounded-2xl bg-amber-50/95 px-4 py-2 text-center text-xs font-semibold text-amber-900 shadow-lg ring-1 ring-amber-200 sm:top-36 sm:text-sm">
							{galatMp}
						</p>
					)}

					{/* --- jelajah bersama: obrolan, emote, sapaan --- */}
					{statusMp === "tersambung" && !jeda && (
						<>
							<div
								className={`pointer-events-none absolute left-3 flex flex-col gap-1 sm:left-4 ${
									sentuh ? (ketik !== null ? "top-[9.25rem] w-[calc(100%-1.5rem)]" : "top-[6.5rem] w-[calc(100%-9.5rem)]") : "bottom-20 w-80"
								}`}
								aria-live="polite"
							>
								{obrolan
									.filter((m) => ketik !== null || kini - m.waktu < 12000)
									.slice(ketik !== null ? -8 : -4)
									.map((m, i) => (
										<p
											key={`${m.waktu}-${i}`}
											className={`w-fit max-w-full rounded-xl px-3 py-1.5 text-xs leading-snug shadow backdrop-blur sm:text-sm ${
												m.sistem ? "bg-slate-900/45 italic text-white/85" : "bg-white/90 text-slate-800"
											}`}
										>
											{!m.sistem && <span className={`mr-1.5 font-bold ${m.sendiri ? "text-amber-600" : "text-sky-700"}`}>{m.nama}</span>}
											{m.teks}
										</p>
									))}
							</div>

							{ketik !== null && (
								<form
									onSubmit={kirimChat}
									className={`absolute left-3 right-3 z-20 flex gap-2 sm:left-4 sm:right-auto sm:w-96 ${
										sentuh ? "top-[5.75rem]" : "bottom-4"
									}`}
								>
									<input
										autoFocus
										value={ketik}
										onChange={(e) => setKetik(e.target.value.slice(0, 120))}
										onKeyDown={(e) => e.key === "Escape" && setKetik(null)}
										onBlur={() => !ketik && setKetik(null)}
										maxLength={120}
										placeholder="Tulis pesan untuk tamu lain…"
										aria-label="Pesan obrolan"
										className="min-w-0 flex-1 rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-lg outline-none ring-2 ring-sky-500"
									/>
									<button type="submit" aria-label="Kirim" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg">
										<FiSend />
									</button>
								</form>
							)}

							{!sentuh && ketik === null && (
								<div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-2xl bg-white/90 p-1.5 shadow-md ring-1 ring-black/5 backdrop-blur">
									<button
										onClick={() => setKetik("")}
										className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
										title="Ngobrol dengan tamu lain (Enter)"
									>
										<FiMessageSquare /> Chat <kbd className="rounded bg-slate-200 px-1 font-mono text-[10px]">Enter</kbd>
									</button>
									{EMOTE.map(([jenis, ikon, label], i) => (
										<button
											key={jenis}
											onClick={() => kirimEmote(jenis)}
											title={`${label} (${i + 1})`}
											aria-label={label}
											className="flex h-9 w-9 items-center justify-center rounded-xl text-lg hover:bg-slate-100"
										>
											{ikon}
										</button>
									))}
								</div>
							)}
						</>
					)}

					<AnimatePresence>
						{sapaan && (
							<motion.div
								key={sapaan.waktu}
								initial={{ opacity: 0, y: -12 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className="absolute inset-x-0 top-40 z-20 flex justify-center px-4 sm:top-36"
							>
								<div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 text-sm shadow-xl ring-1 ring-black/5">
									<span className="text-xl">👋</span>
									<span className="font-semibold text-slate-800">{sapaan.nama} menyapa Anda</span>
									<button
										onClick={() => {
											sapaPemain(sapaan.dari);
											tutupSapaan();
										}}
										className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white"
									>
										Balas sapa
									</button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* --- kontrol layar sentuh: analog di kiri (dorong penuh = lari); di kanan tombol
					     aksi bila ada, loncat, lalu chat & emote paling bawah. Kamera cukup digeser jari. --- */}
					{sentuh && !jeda && (
						<div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
							<div className="pointer-events-auto">
								<Joystick />
							</div>
							<div className="pointer-events-auto flex flex-col items-end gap-2.5">
								{sasaran && (
									<button
										onClick={() => bukaPanel(sasaran.id)}
										className="flex h-16 w-16 flex-col items-center justify-center rounded-full text-white shadow-2xl ring-4 ring-white/70"
										style={{ background: sasaran.warna }}
										aria-label={sasaran.label}
									>
										<FiMessageCircle className="h-5 w-5" />
										<span className="mt-0.5 text-[11px] font-bold leading-none">{sasaran.tombol}</span>
									</button>
								)}
								{modeMain === "jalan" && (
									<button
										onClick={() => (kendali.loncat = true)}
										aria-label="Loncat"
										className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/40 text-white shadow-lg ring-1 ring-white/30 backdrop-blur active:bg-slate-900/70"
									>
										<FiArrowUp className="h-5 w-5" />
									</button>
								)}
								{statusMp === "tersambung" && (
									<div className="relative flex gap-2">
										{pilihEmote && (
											<div className="absolute bottom-12 right-0 flex gap-1 rounded-2xl bg-white/95 p-1.5 shadow-xl">
												{EMOTE.map(([jenis, ikon, label]) => (
													<button
														key={jenis}
														aria-label={label}
														onClick={() => {
															kirimEmote(jenis);
															setPilihEmote(false);
														}}
														className="flex h-10 w-10 items-center justify-center rounded-xl text-xl active:bg-slate-100"
													>
														{ikon}
													</button>
												))}
											</div>
										)}
										<button
											onClick={() => setKetik("")}
											aria-label="Chat dengan tamu lain"
											className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/40 text-white shadow-lg ring-1 ring-white/30 backdrop-blur active:bg-slate-900/70"
										>
											<FiMessageSquare className="h-4 w-4" />
										</button>
										<button
											onClick={() => setPilihEmote((v) => !v)}
											aria-label="Emote"
											aria-expanded={pilihEmote}
											className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg ring-1 backdrop-blur ${
												pilihEmote ? "bg-amber-400 text-slate-900 ring-amber-200" : "bg-slate-900/40 text-white ring-white/30"
											}`}
										>
											<FiSmile className="h-4 w-4" />
										</button>
									</div>
								)}
							</div>
						</div>
					)}

					{kilat > 0 && (
						<motion.div
							key={kilat}
							initial={{ opacity: 1 }}
							animate={{ opacity: 0 }}
							transition={{ duration: 0.45 }}
							className="pointer-events-none absolute inset-0 bg-white"
						/>
					)}
				</div>
			)}

			{menu === "aksi" && (
				<Lembar judul="Menu" onTutup={() => setMenu(null)}>
					<div className="grid grid-cols-2 gap-3">
						{[
							[FiNavigation, "Pindah cepat", "Langsung ke ruang bidang", () => setMenu("pindah")],
							[
								FiMap,
								peta ? "Sembunyikan peta" : "Tampilkan peta",
								"Denah mini lantai ini",
								() => {
									setPeta((v) => !v);
									setMenu(null);
								},
							],
							[FiGrid, "Denah 2D", "Versi tanpa 3D", () => setMode("2d")],
							[IkonSuasana, `Suasana: ${labelSuasana}`, "Ketuk untuk ganti siang/malam", gantiSuasana],
							[FiHelpCircle, "Cara bermain", "Kontrol & tips", () => setMenu("bantuan")],
						].map(([Ikon, judul, ket, aksi]) => (
							<button
								key={judul}
								onClick={aksi}
								className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50 active:bg-slate-100"
							>
								<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--color-primary))] text-white">
									<Ikon className="h-5 w-5" />
								</span>
								<span className="text-sm font-semibold text-slate-900">{judul}</span>
								<span className="text-xs text-slate-500">{ket}</span>
							</button>
						))}
					</div>
				</Lembar>
			)}

			{menu === "pindah" && (
				<Lembar judul="Pindah cepat" onTutup={() => setMenu(null)}>
					<ul className="space-y-2">
						{[HALAMAN, LOBI, ...RUANGAN].map((a) => (
							<li key={a.id}>
								<button
									onClick={() => pindahCepat(a.id)}
									className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
								>
									<span className="h-3 w-3 shrink-0 rounded-full" style={{ background: a.warna || "#8fbf78" }} />
									<span className="min-w-0 flex-1">
										<span className="block text-sm font-semibold text-slate-900">{a.singkatan || a.nama}</span>
										{a.singkatan && (
											<span className="block truncate text-xs text-slate-500">
												{NAMA_LANTAI[a.lantai]} · {a.nama}
											</span>
										)}
									</span>
									{dikunjungi.has(a.id) && <FiCheckCircle className="text-emerald-600" aria-label="Sudah dikunjungi" />}
								</button>
							</li>
						))}
					</ul>
				</Lembar>
			)}

			{menu === "bantuan" && (
				<Lembar judul="Cara bermain" onTutup={() => setMenu(null)}>
					<ul className="space-y-2 text-sm text-slate-700">
						{(sentuh
							? [
									["Analog kiri", "berjalan; dorong sampai tepi untuk berlari"],
									["Tombol ⟲ ⟳", "memutar kamera"],
									["Seret layar", "memutar kamera"],
									["Ketuk lantai / petugas", "berjalan otomatis ke sana"],
									["Tombol aksi (kanan)", "bicara, pakai benda, duduk, masuk mobil, naik motor"],
									["Tombol Loncat", "meloncat"],
									["Di mobil/motor", "analog = gas & setir, tombol Turbo untuk ngebut"],
									["Tombol 💬 / 🙂", "ngobrol & kirim emote ke tamu lain; dekati tamu untuk menyapa"],
								]
							: [
									["W A S D / panah", "berjalan"],
									["Shift", "berlari"],
									["Seret mouse · roda", "memutar kamera · zoom"],
									["Klik lantai / petugas", "berjalan otomatis ke sana"],
									["E", "bicara · pakai benda · duduk · naik/turun kendaraan"],
									["Spasi", "loncat"],
									["Di mobil/motor", "W/S gas & mundur, A/D belok, Shift turbo"],
									["Enter / T", "ngobrol dengan tamu lain"],
									["1 – 5", "emote: lambai, jempol, tepuk, tawa, hati"],
									["M", "tampilkan/sembunyikan peta"],
									["Esc", "menutup panel"],
								]
						).map(([t, a]) => (
							<li key={t} className="flex items-baseline gap-3">
								<span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-800">{t}</span>
								<span>{a}</span>
							</li>
						))}
					</ul>
					<p className="mt-4 text-sm text-slate-500">
						Kunjungi ketujuh ruang bidang di lantai 1 dan 2, lalu bicaralah dengan petugasnya. Dekati pegawai untuk
						mendengar sapaannya. Penanda di atas kepala petugas berubah abu-abu setelah ruangnya dikunjungi.
					</p>
				</Lembar>
			)}

			{areaPanel && (
				<InfoPanel
					area={areaPanel}
					statistik={statistik}
					dikunjungi={dikunjungi}
					onTutup={tutupPanel}
					onPindah={pindahCepat}
					labelPindah={mode === "3d" ? "Antar ke sana" : "Lihat"}
					antrean={antrean}
					onAmbilAntrean={ambilAntrean}
					petugasData={penghuni.petugas[areaPanel.id]}
				/>
			)}

			{pesan && (
				<Lembar judul={pesan.judul} onTutup={() => setPesan(null)}>
					<div className="space-y-2 text-[15px] leading-relaxed text-slate-700">
						{(Array.isArray(pesan.teks) ? pesan.teks : [pesan.teks]).map((t) => (
							<p key={t}>{t}</p>
						))}
					</div>
				</Lembar>
			)}

			{selesai && <ModalSelesai onTutup={() => setSelesai(false)} />}
		</>
	);
}
