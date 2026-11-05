import { Component, Suspense, lazy, memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
	FiArrowLeft,
	FiCheckCircle,
	FiGrid,
	FiSave,
	FiHelpCircle,
	FiMap,
	FiMoon,
	FiSun,
	FiCloud,
	FiCloudRain,
	FiMusic,
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
	FiTruck,
} from "react-icons/fi";
import api from "../../api";
import { penampilanAvatar } from "./avatar";
import { gayaTampil, kenakanGaya, useLemari } from "./lemari";
import PanelGaya from "./ui/PanelGaya";
import PanelMisi from "./ui/PanelMisi";
import PanelJoran from "./ui/PanelJoran";
import PanelKolam from "./ui/PanelKolam";
import PanelCapit from "./ui/PanelCapit";
import PanelAtm from "./ui/PanelAtm";
import { bayarKoin, useSedangTarik } from "./pancing";
import { ubahTenaga } from "./tenaga";
import HudLomba from "./ui/HudLomba";
import HudBasket, { TombolBasket } from "./ui/HudBasket";
import { basket, mulaiBasket, useBasket } from "./basket";
import { KartuKantor, PerayaanKantor } from "./ui/HudKantor";
import PanelAcara from "./ui/PanelAcara";
import { catatKantor, mulaiLomba, stempelBazar } from "./kantorHidup";
import { TENDA_BAZAR } from "./scene/acaraData";
import PanelEtalaseBumdes from "./ui/PanelEtalaseBumdes";
import PanelShowroom from "./ui/PanelShowroom";
import { modelDariId } from "./scene/modelKendaraan";
import PanelPeringkat from "./ui/PanelPeringkat";
import PanelSimpan from "./ui/PanelSimpan";
import SaranSimpan from "./ui/SaranSimpan";
import { tanda } from "./tandaJelajah";
import { kendaraanDariId } from "./scene/kendaraan";
import { kirimEmote, kirimGaya, kirimKlakson, kirimUcap, putusJelajah, sambungJelajah, sapaPemain, tutupSapaan, useMultipemain } from "./multipemain";
import { AREA_PER_ID, BENDA, HALAMAN, LOBI, RUANGAN, TITIK_MULAI, titikDepanPetugas } from "./kantorConfig";
import { kendali, posisi as posisiPemain, resetJelajah, useDiKawasan, useKeadaan } from "./jelajahStore";
import { suasana } from "./scene/suasana";
import { susunPenghuni } from "./penghuni";
import InfoPanel from "./ui/InfoPanel";
import Minimap from "./ui/Minimap";
import GamePancing from "./ui/GamePancing";
import BarTenaga, { MenuPemain } from "./ui/BarTenaga";
import TombolSuara from "./ui/TombolSuara";
import { useTutorial } from "./tutorial";
import AlbumIkan from "./ui/AlbumIkan";
import { PanelKasir, PanelTas } from "./ui/PanelKasir";
import { BARANG_PER_ID, ambilKeranjang, belanja, mulaiAmbil } from "./belanja";
import { INFO_TOKO } from "./toko";
import { WARUNG, pesan as pesanMakan } from "./warung";
import { TIBA_KHUSUS, TITIK_LIFT, yLantaiMal } from "./scene/gedungKhusus";
import PanelBioskop from "./ui/PanelBioskop";
import { aturMusikLatar, useMusikMati } from "./musikLatar";
import PanelWarung from "./ui/PanelWarung";
import { catat, misiSiapKlaim, tambahXp, useProgres } from "./progres";
import DaftarRoom from "./ui/DaftarRoom";
import { aturSendu } from "./musikJelajah";
import { klakson, suara } from "./suaraPancing";
import { FASILITAS_TOKO } from "./scene/layout";
import Joystick from "./ui/Joystick";
import LayarAwal from "./ui/LayarAwal";
import LayarMemuat from "./ui/LayarMemuat";
import Denah2D from "./ui/Denah2D";
import PetaKecamatan from "./ui/PetaKecamatan";
import { jumlahPerhatian } from "./bangunWilayah";
// dunia wilayah (kecamatan) dimuat terpisah dari dunia kantor
const DuniaWilayah = lazy(() => import("./wilayah/DuniaWilayah"));
import ModalSelesai from "./ui/ModalSelesai";

const muatScene = () => import("./scene/KantorScene");
// memo: halaman ini render ulang tiap 2 detik (timer obrolan) & tiap HUD berubah; tanpa memo
// seluruh pohon 3D ikut direkonsiliasi dan layar menyentak.
const KantorScene = memo(lazy(muatScene));

const KUNCI_SIMPAN = "jelajah-dpmd-dikunjungi";
const BENDA_PER_ID = Object.fromEntries(BENDA.map((b) => [b.id, b]));
const FASILITAS_PER_ID = Object.fromEntries(FASILITAS_TOKO.map((f) => [f.id, f]));
// kapan (ms) tiap fasilitas boleh dipakai lagi, mis. tong sampah
const jedaFasilitas = {};
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

// Tata letak HP dipakai layar sentuh dan juga jendela sempit, dan mengikuti putar layar & ubah ukuran.
const MEDIA_HP = "(pointer: coarse), (max-width: 767px)";
function langgananHp(f) {
	const m = window.matchMedia(MEDIA_HP);
	m.addEventListener("change", f);
	return () => m.removeEventListener("change", f);
}
const useLayarHp = () => useSyncExternalStore(langgananHp, () => cocokMedia(MEDIA_HP));

const KUNCI_PETA = "jelajah-peta-v1";
function bacaPeta() {
	try {
		return localStorage.getItem(KUNCI_PETA) !== "0";
	} catch {
		return true;
	}
}

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

function Lembar({ judul, onTutup, lebar = "sm:max-w-md", children }) {
	return (
		<div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onTutup}>
			<section
				role="dialog"
				aria-modal="true"
				aria-label={judul}
				onClick={(e) => e.stopPropagation()}
				className={`max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl ${lebar}`}
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
	const sentuh = useLayarHp();
	const sarankan2D = useMemo(
		() => cocokMedia("(prefers-reduced-motion: reduce)") || (navigator.deviceMemory && navigator.deviceMemory <= 2),
		[],
	);

	const [mode, setMode] = useState("awal");
	const [panel, setPanel] = useState(null);
	// dunia kecamatan yang sedang dikunjungi (dunia terpisah dari kantor DPMD)
	const [dunia, setDunia] = useState(null);
	// bingkai pertama kantor sudah tergambar
	const [siap3D, setSiap3D] = useState(false);
	const posisiKantor = useRef(null);
	const [menu, setMenu] = useState(null);
	// kas BUMDes & hasil panen yang menunggu, dihitung ulang tiap menu/dunia berganti
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const perhatian = useMemo(() => jumlahPerhatian(), [menu, dunia]);
	const misiSiap = misiSiapKlaim(useProgres());
	// peta juga pintu ke popup peta kecamatan, jadi tampil sejak awal di semua perangkat
	const [peta, setPeta] = useState(bacaPeta);
	useEffect(() => {
		try {
			localStorage.setItem(KUNCI_PETA, peta ? "1" : "0");
		} catch {
			/* penyimpanan diblokir: pilihan bertahan selama halaman terbuka */
		}
	}, [peta]);
	const [dikunjungi, setDikunjungi] = useState(bacaDikunjungi);
	const [selesai, setSelesai] = useState(false);
	const [statistik, setStatistik] = useState(null);
	const [kilat, setKilat] = useState(0);
	const [kabarArea, setKabarArea] = useState(null);
	const [gagal3D, setGagal3D] = useState(false);
	const [pesan, setPesan] = useState(null);
	const [dataPegawai, setDataPegawai] = useState(null);
	// Pegawai DPMD sungguhan ditempatkan ke kursi, ruang rapat, pos jaga, dst.
	const penghuni = useMemo(() => susunPenghuni(dataPegawai), [dataPegawai]);
	const baruLengkap = useRef(false);
	const { area, lantai, dekat, minta, mode: modeMain, lantaiMal } = useKeadaan();
	const mainBasket = useBasket().aktif;
	const sedangTarik = useSedangTarik();
	const musikMati = useMusikMati();
	const diKawasan = useDiKawasan(lantai);
	const [lihatRoom, setLihatRoom] = useState(false);
	// musik sendu selama naik perahu & memancing; jetski memakai musik berkendara
	useEffect(() => {
		aturSendu(mode === "3d" && ((modeMain === "perahu" && !posisiPemain.kend?.bermesin) || modeMain === "mancing"));
	}, [mode, modeMain]);

	// Klakson hanya untuk pengemudi mobil/motor; ikut terdengar oleh tamu lain di dekatnya.
	const klaksonTerakhir = useRef(0);
	const bunyikanKlakson = useCallback(() => {
		if (modeMain !== "mobil" && modeMain !== "motor") return;
		if (performance.now() - klaksonTerakhir.current < 250) return;
		klaksonTerakhir.current = performance.now();
		klakson(modeMain);
		kirimKlakson();
	}, [modeMain]);
	useEffect(() => () => aturSendu(false), []);
	useEffect(() => {
		tanda("layar-awal");
	}, []);
	useEffect(() => {
		if (modeMain === "mancing") tanda("mancing");
	}, [modeMain]);
	// Jelajah bersama tamu lain
	const [profil, setProfil] = useState(null);
	const gayaDipakai = gayaTampil(useLemari());
	const penampilanDasar = useMemo(() => (profil ? penampilanAvatar(profil) : undefined), [profil]);
	const penampilan = useMemo(() => (profil ? kenakanGaya(penampilanAvatar(profil), gayaDipakai) : undefined), [profil, gayaDipakai]);
	const { daftar: tamuLain, obrolan, sapaan, status: statusMp, galat: galatMp, ruang: ruangMp } = useMultipemain();
	// gaya baru langsung dikabarkan ke tamu lain
	useEffect(() => {
		if (statusMp === "tersambung") kirimGaya(gayaDipakai);
	}, [gayaDipakai, statusMp]);
	const [ketik, setKetik] = useState(null);
	const [pilihEmote, setPilihEmote] = useState(false);
	const [kini, setKini] = useState(() => Date.now());
	// Di HP petunjuk awal hanya tampil sebentar supaya layar tetap lega.
	// Suasana: ikuti jam WIB (null), atau dipaksa "siang"/"malam".
	const [modeSuasana, setModeSuasana] = useState(suasana.paksa);
	const gantiSuasana = () => {
		const urutan = [null, "siang", "malam"];
		const baru = urutan[(urutan.indexOf(modeSuasana) + 1) % urutan.length];
		suasana.paksa = baru;
		setModeSuasana(baru);
	};
	// Cuaca: otomatis (sesekali hujan), selalu cerah, atau hujan.
	const [modeCuaca, setModeCuaca] = useState(suasana.cuaca);
	const gantiCuaca = () => {
		const urutan = ["otomatis", "cerah", "hujan"];
		const baru = urutan[(urutan.indexOf(modeCuaca) + 1) % urutan.length];
		suasana.cuaca = baru;
		setModeCuaca(baru);
	};
	const labelCuaca = { otomatis: "Otomatis", cerah: "Cerah", hujan: "Hujan" }[modeCuaca];
	const [IkonSuasana, labelSuasana] = modeSuasana === "siang" ? [FiSun, "Siang"] : modeSuasana === "malam" ? [FiMoon, "Malam"] : [FiClock, "Ikuti jam"];

	// Hook untuk uji otomatis di browser — hanya ada di mode dev, tidak ikut ke build produksi.
	useEffect(() => {
		if (import.meta.env.DEV) window.__jelajah = { kendali, suasana, posisi: () => ({ ...posisiPemain, kend: posisiPemain.kend?.id ?? null }), kendaraan: (id) => kendaraanDariId(id) };
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

	// Tersambung ke tamu lain selama menjelajah 3D. Di dunia kecamatan sambungannya tetap,
	// hanya pindah ke ruang kecamatan itu (DuniaWilayah → pindahDunia).
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
			catat("sapa");
			return;
		}
		if (id.startsWith("keranjang:")) return ambilKeranjang(id.slice(10));
		if (id.startsWith("pesan:")) {
			// mie ayam cuma satu menu: langsung dipesan; tempat lain buka daftar menunya
			const w = WARUNG[id.slice(6)];
			if (w?.menu.length === 1) return pesanMakan(id.slice(6), w.menu[0].id);
			setMenu("warung:" + id.slice(6));
			return;
		}
		if (id === "bioskop:tiket" || id === "lift") {
			setMenu(id === "lift" ? "lift" : "bioskop");
			return;
		}
		if (id === "distro:butik") {
			setMenu("gaya:butik");
			return;
		}
		if (id === "pancing:toko") {
			setMenu("pancing");
			return;
		}
		if (id === "kapal:toko") {
			setMenu("showroom:perahu");
			return;
		}
		if (id === "showroom:mobil" || id === "showroom:motor") {
			setMenu(id);
			return;
		}
		if (id === "pasar:etalase") {
			catatKantor("etalase");
			setMenu("etalase");
			return;
		}
		if (id === "capit") {
			setMenu("capit");
			return;
		}
		if (id === "cendol") {
			// langsung dibeli: tanpa koin, tenaga tidak berubah dan pemain diberi tahu
			if (bayarKoin(15)) ubahTenaga(20, { teks: "Seger! Tenaga +20 🧊", jenis: "baik" });
			else ubahTenaga(0, { teks: "Koin kurang — mancing dulu yuk 🎣", jenis: "buruk" });
			return;
		}
		if (id.startsWith("fasilitas:")) {
			const f = FASILITAS_PER_ID[id.slice(10)];
			if (!f) return;
			if (f.buka) {
				setMenu(f.buka);
				return;
			}
			const kini = Date.now();
			if (kini < (jedaFasilitas[f.id] || 0)) {
				ubahTenaga(0, { teks: "Sudah bersih kok 🙂", jenis: "baik" });
				return;
			}
			if (f.koin && !bayarKoin(f.koin)) {
				ubahTenaga(0, { teks: "Koin kurang — mancing dulu yuk 🎣", jenis: "buruk" });
				return;
			}
			if (f.jeda) jedaFasilitas[f.id] = kini + f.jeda * 1000;
			if (f.koin) suara("koin");
			if (f.xp) tambahXp(f.xp);
			ubahTenaga(f.tenaga || 0, { teks: f.teks, jenis: "baik" });
			return;
		}
		if (id === "kolam:loket" || id === "kolam:tiket") {
			setMenu("kolam");
			return;
		}
		if (id === "distro:pilih" || id === "distro:coba") {
			setMenu(id === "distro:coba" ? "gaya:coba" : "gaya:toko");
			return;
		}
		if (id.startsWith("ambil:")) return mulaiAmbil(id.slice(6));
		if (id.startsWith("kasir:")) {
			setMenu("kasir");
			return;
		}
		if (id === "basket:main") return void mulaiBasket();
		if (/^(kursi|mobil|motor|perahu|mancing|peti):|^(berdiri|keluar|berhenti)$/.test(id)) {
			kendali.aksi = id;
			return;
		}
		if (id.startsWith("bazar:")) return void stempelBazar(id.slice(6));
		if (id === "lomba:panitia") return void setMenu("acara");
		const benda = BENDA_PER_ID[id];
		if (benda) {
			if (benda.aksi.jenis === "pindah") setMenu("pindah");
			else setPesan(benda.aksi);
			return;
		}
		setMenu(null);
		setPanel(id);
		catat("sapa");
		catatKantor("sapa", { id });
		if (id === "lobi") return;
		setDikunjungi((lama) => {
			if (lama.has(id)) return lama;
			queueMicrotask(() => catat("ruang"));
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
			kendali.teleport = id === "luar" ? { ...TITIK_MULAI } : TIBA_KHUSUS[id] ? { ...TIBA_KHUSUS[id] } : titikDepanPetugas(AREA_PER_ID[id]);
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
		basket.jeda = jeda;
	}, [jeda]);
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
			if (e.code === "KeyH") bunyikanKlakson();
			// terjun dari perahu (pendayung atau penumpang) ke air
			if (e.code === "KeyR" && (modeMain === "perahu" || modeMain === "penumpang")) kendali.aksi = "renang:terjun";
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
	}, [mode, panel, menu, selesai, pesan, dekat, bukaPanel, tutupPanel, statusMp, pilihEmote, bunyikanKlakson, modeMain]);

	const mulai3D = (profilBaru) => {
		if (profilBaru?.nama) setProfil(profilBaru);
		resetJelajah();
		setKini(Date.now());
		setMode("3d");
		tanda("mulai-3d");
	};
	// konteks WebGL yang tidak pulih: sama seperti kegagalan membuat adegan, turun ke Denah 2D
	const konteksHilang = useCallback(() => {
		setGagal3D("Grafis 3D terhenti");
		setMode("2d");
	}, []);

	const areaPanel = panel && AREA_PER_ID[panel];
	// Yang bisa diajak berinteraksi: petugas (punya npc) atau benda.
	const petugasDekat = dekat && AREA_PER_ID[dekat]?.npc ? AREA_PER_ID[dekat] : null;
	const bendaDekat = dekat ? BENDA_PER_ID[dekat] : null;
	const fasilitasDekat = dekat?.startsWith("fasilitas:") ? FASILITAS_PER_ID[dekat.slice(10)] : null;
	// Aksi gerak pengunjung: duduk/berdiri, naik/turun mobil & motor.
	const tamuDekat = dekat?.startsWith("tamu:") ? tamuLain.find((t) => t.id === dekat.slice(5)) : null;
	const aksiGerak = !dekat
		? null
		: tamuDekat
			? [`Sapa ${tamuDekat.nama} 👋`, "Sapa", "#0284c7"]
			: fasilitasDekat
				? [fasilitasDekat.label, fasilitasDekat.tombol, fasilitasDekat.warna]
		: dekat.startsWith("kursi:")
			? ["Duduk di sini", "Duduk", "#475569"]
			: dekat.includes("#")
				? dekat.startsWith("motor:")
					? ["Bonceng di belakang", "Bonceng", "#0369a1"]
					: dekat.startsWith("perahu:")
						? ["Ikut naik perahu", "Ikut", "#0e7490"]
						: ["Ikut naik sebagai penumpang", "Ikut", "#0369a1"]
			: dekat === "basket:main"
				? ["Main basket lawan warga 🏀", "Main", "#ea580c"]
			: dekat === "perahu:panggil"
				? ["Panggil perahu ke dermaga 🚣", "Panggil", "#0e7490"]
			: modelDariId(dekat.split("#")[0])
				? [`Naik ${modelDariId(dekat.split("#")[0]).model.nama} 🌊`, "Naik", modelDariId(dekat.split("#")[0]).model.jetski ? "#e11d48" : "#0e7490"]
			: dekat.startsWith("perahu:")
				? ["Naik perahu dayung 🚣", "Naik", "#0e7490"]
			: dekat === "mancing:perahu"
				? ["Memancing dari perahu 🎣", "Mancing", "#0f766e"]
			: dekat.startsWith("peti:")
				? ["Buka peti hadiah 🎁", "Buka", "#b45309"]
			: dekat === "distro:coba"
				? ["Ruang coba — coba pakaian 🪞", "Coba", "#7c3aed"]
			: dekat === "distro:pilih"
				? ["Belanja aksesoris & pakaian 👕", "Belanja", "#7c3aed"]
			: dekat === "pancing:toko"
				? ["Toko Pancing — joran & senar 🎣", "Buka", "#0f766e"]
			: dekat === "kapal:toko"
				? ["Toko Perahu ⚓", "Buka", "#0e7490"]
			: dekat === "pesan:mie"
				? [`Pesan mie ayam 🍜 · 🪙 ${WARUNG.mie.menu[0].harga}`, "Pesan", WARUNG.mie.warna]
			: dekat.startsWith("pesan:")
				? [`Lihat menu ${WARUNG[dekat.slice(6)].nama} ${WARUNG[dekat.slice(6)].ikon}`, "Menu", WARUNG[dekat.slice(6)].warna]
			: dekat === "bioskop:tiket"
				? ["Loket bioskop — pilih film sejarah 🎬", "Pilih", "#7c3aed"]
			: dekat === "lift"
				? ["Naik lift ke lantai lain 🛗", "Lift", "#0f172a"]
			: dekat === "distro:butik"
				? ["Belanja di Butik Mode 👗", "Belanja", "#db2777"]
			: dekat.startsWith("keranjang:")
				? ["Ambil keranjang belanja 🧺", "Ambil", "#d61f26"]
			: dekat.startsWith("ambil:")
				? [`Ambil ${BARANG_PER_ID[dekat.slice(6)]?.nama} · 🪙 ${BARANG_PER_ID[dekat.slice(6)]?.harga}`, "Ambil", "#d61f26"]
			: dekat.startsWith("kasir:")
				? ["Bayar di kasir 🧾", "Bayar", "#1d4ed8"]
			: dekat === "mancing:tepi"
				? ["Memancing di pinggir situ 🎣", "Mancing", "#0f766e"]
			: dekat === "showroom:mobil"
				? ["Sales showroom — beli mobil 🚗", "Lihat", "#1d4ed8"]
			: dekat === "showroom:motor"
				? ["Sales showroom — beli motor 🏍️", "Lihat", "#dc2626"]
			: dekat === "pasar:etalase"
				? ["Etalase produk asli BUM Desa 🛍️", "Lihat", "#16a34a"]
			: dekat.startsWith("bazar:")
				? [`Minta stempel ${TENDA_BAZAR.find((x) => x.id === dekat.slice(6))?.nama} 🎟️`, "Stempel", "#b45309"]
			: dekat === "lomba:panitia"
				? ["Daftar Lomba Jetski 🏁", "Daftar", "#e11d48"]
			: dekat === "capit"
				? ["Main mesin capit", "Capit", "#db2777"]
			: dekat === "cendol"
				? ["Beli es cendol 🪙 15 (+20 tenaga)", "Beli", "#0f766e"]
			: dekat === "kolam:loket"
				? ["Loket Kolam Monster — tiket & lomba 🦈", "Loket", "#0f766e"]
			: dekat === "kolam:tiket"
				? ["Kolam Monster berbayar — beli tiket 🪙 2.000", "Tiket", "#b45309"]
			: dekat === "mancing:kolam"
				? ["Memancing ikan monster 🦈", "Mancing", "#be123c"]
			: dekat.startsWith("mancing:")
				? ["Mulai memancing di sini 🎣", "Mancing", "#0f766e"]
			: dekat === "berhenti"
				? ["Selesai memancing", "Selesai", "#be123c"]
			: dekat.startsWith("mobil:")
				? ["Buka pintu & masuk mobil", "Masuk", "#334155"]
				: dekat.startsWith("motor:")
					? ["Naik motor", "Naik", "#c4532d"]
					: dekat === "berdiri"
						? ["Berdiri", "Berdiri", "#475569"]
						: dekat === "keluar"
							? modeMain === "motor"
								? ["Turun dari motor", "Turun", "#c4532d"]
								: modeMain === "perahu"
									? ["Naik ke dermaga", "Turun", "#0e7490"]
									: modeMain === "penumpang"
										? ["Turun dari kendaraan", "Turun", "#334155"]
										: ["Buka pintu & keluar", "Keluar", "#334155"]
							: null;
	// Panel adu tarik setinggi layar di pojok kiri bawah (lebar s.d. 20,25rem): chat desktop pindah ke kanannya.
	// HP: selama memancing layar diberikan ke permainan; saat adu tarik hanya panelnya yang tampil.
	const mancingHp = sentuh && modeMain === "mancing";
	const fokusTarik = mancingHp && sedangTarik;
	const kiriChat = !sentuh && modeMain === "mancing" && sedangTarik ? "left-3 sm:left-[21rem]" : "left-3 sm:left-4";
	// Saat memancing, tombol & tombol E dipegang HUD pancing sendiri.
	const sasaran = modeMain === "mancing"
		? null
		: petugasDekat
		? { id: petugasDekat.id, label: `Bicara dengan ${penghuni.petugas[petugasDekat.id]?.nama ?? petugasDekat.petugas}`, tombol: "Tanya", warna: petugasDekat.warna }
		: bendaDekat
			? { id: bendaDekat.id, label: bendaDekat.label, tombol: "Pakai", warna: "#1f6b50" }
			: aksiGerak
				? { id: dekat, label: aksiGerak[0], tombol: aksiGerak[1], warna: aksiGerak[2] }
				: null;
	const berkendara = ["mobil", "motor", "perahu", "penumpang"].includes(modeMain);
	const tipJalan = useTutorial("jalan", mode === "3d" && siap3D && !dunia && !jeda && area === "luar" && !berkendara && modeMain !== "mancing" && !sasaran);
	const tipKendara = useTutorial(`kendara:${modeMain}`, mode === "3d" && siap3D && !dunia && !jeda && berkendara);
	const petunjukKendara = {
		mobil: "W/S gas & mundur · A/D belok · Shift turbo · H klakson · E keluar",
		motor: "W/S gas & mundur · A/D belok · Shift turbo · Spasi lompat · H klakson · E turun",
		perahu: posisiPemain.kend?.bermesin ? "W/S gas · A/D belok · Shift turbo · berhenti lalu E mancing · R terjun berenang" : "W/S dayung · A/D belok · Shift dayung cepat · E mancing / naik ke dermaga · R terjun berenang",
		penumpang: "Anda penumpang — duduk manis · E turun",
	}[modeMain];

	return (
		<>
			{mode === "awal" && (
				<LayarAwal
					webglOk={webglOk && !gagal3D}
					sentuh={sentuh}
					sarankan2D={sarankan2D}
					onMulai3D={mulai3D}
					onMulai2D={() => {
						tanda("mulai-2d");
						setMode("2d");
					}}
					onKodeSimpan={() => setMenu("simpan")}
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

			{mode === "3d" && dunia && (
				<Suspense fallback={<LayarMemuat />}>
					<DuniaWilayah
						key={dunia.kecamatan}
						wilayah={dunia}
						penampilan={penampilan}
						sentuh={sentuh}
						onPindah={setDunia}
						onKonteksHilang={konteksHilang}
						onKeluar={() => {
							const k = posisiKantor.current;
							if (k) kendali.teleport = { x: k.x, y: k.y, z: k.z, lantai: k.lantai, rot: k.rot, yaw: k.rot + Math.PI };
							setDunia(null);
						}}
					/>
				</Suspense>
			)}

			{mode === "3d" && !dunia && (
				<div className="fixed inset-0 select-none overflow-hidden bg-[#cfe6f1]">
					<PenjagaScene
						onGagal={(galat) => {
							setGagal3D(galat?.message || "galat tidak dikenal");
							setMode("2d");
						}}
					>
						<Suspense fallback={null}>
							<KantorScene statistik={statistik} dikunjungi={dikunjungi} jeda={jeda} penghuni={penghuni} penampilan={penampilan} onSiap={setSiap3D} onKonteksHilang={konteksHilang} />
						</Suspense>
					</PenjagaScene>
					{/* jeda menghentikan loop render, penanda siap tak akan datang: jangan tutupi panelnya */}
					<LayarMemuat selesai={siap3D || jeda} />

					{/* --- HUD atas: di HP ringkas (kembali, lokasi, progres, menu) --- */}
					<div className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 pb-3 sm:px-4 ${fokusTarik ? "hidden" : ""} ${sentuh ? "pt-[max(0.75rem,env(safe-area-inset-top))]" : "pt-[max(2rem,env(safe-area-inset-top))]"}`}>
						<div className="pointer-events-auto flex min-w-0 items-center gap-2">
							<Link
								to="/"
								aria-label="Kembali ke beranda"
								className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-white/90 px-3 text-sm font-semibold text-slate-700 shadow-md ring-1 ring-black/5 backdrop-blur hover:bg-white"
							>
								<FiArrowLeft /> <span className="hidden sm:inline">Beranda</span>
							</Link>
							<div className="flex h-10 min-w-0 items-center rounded-xl bg-white/90 px-2.5 text-xs font-semibold text-slate-800 shadow-md ring-1 ring-black/5 backdrop-blur sm:px-3 sm:text-sm">
								<span className="mr-2 shrink-0 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] text-white sm:text-[11px]">{lantaiMal != null ? `Lt. ${lantaiMal + 1}` : NAMA_LANTAI[lantai]}</span>
								<span className="truncate">{lantaiMal != null ? "Cibinong City Mall" : area === "luar" && diKawasan ? "Kawasan Pemda Cibinong" : AREA_PER_ID[area]?.nama}</span>
							</div>
						</div>
						<div className="pointer-events-auto flex shrink-0 items-center gap-2">
							{profil?.mode === "bersama" && (
								<div className="relative">
								<button
									onClick={() => setLihatRoom((v) => !v)}
									aria-expanded={lihatRoom}
									className="flex h-10 items-center gap-1.5 rounded-xl bg-white/90 px-2.5 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-black/5 backdrop-blur hover:bg-white sm:px-3"
									title={
										statusMp === "tersambung"
											? `${ruangMp ? `Kantor #${ruangMp} · ` : ""}${tamuLain.length + 1} tamu sedang menjelajah: ${[profil.nama, ...tamuLain.map((t) => t.nama)].join(", ")}`
											: galatMp || "Belum tersambung dengan tamu lain"
									}
								>
									<span className={`h-2 w-2 rounded-full ${statusMp === "tersambung" ? "bg-emerald-500" : "bg-slate-400"}`} />
									<FiUsers className="text-slate-600" />
									<span className="tabular-nums">{statusMp === "tersambung" ? tamuLain.length + 1 : "–"}</span>
									<span className="sr-only">tamu online — ketuk untuk melihat siapa saja</span>
								</button>
								{lihatRoom && statusMp === "tersambung" && <DaftarRoom namaSaya={profil.nama} ruang={ruangMp} onTutup={() => setLihatRoom(false)} />}
								</div>
							)}
							<div
								className={`h-10 items-center gap-1.5 rounded-xl bg-white/90 px-2.5 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-black/5 backdrop-blur sm:px-3 ${sentuh ? "hidden" : "flex"}`}
								title="Ruang bidang yang sudah dikunjungi"
							>
								<FiCheckCircle className="text-emerald-600" />
								<span className="tabular-nums">
									{dikunjungi.size}/{RUANGAN.length}
								</span>
								<span className="sr-only">ruang dikunjungi</span>
							</div>
							<TombolSuara />
							<div className={`items-center gap-2 ${sentuh ? "hidden" : "hidden sm:flex"}`}>
								<TombolIkon label="Pindah cepat" aktif={menu === "pindah"} onClick={() => setMenu("pindah")}>
									<FiNavigation />
								</TombolIkon>
								<TombolIkon label="Garasi saya" aktif={menu === "garasi"} onClick={() => setMenu("garasi")}>
									<FiTruck />
								</TombolIkon>
								<TombolIkon label={peta ? "Sembunyikan peta (M)" : "Tampilkan peta (M)"} aktif={peta} onClick={() => setPeta((v) => !v)}>
									<FiMap />
								</TombolIkon>
								<TombolIkon label={`Suasana: ${labelSuasana} (ketuk untuk ganti)`} aktif={modeSuasana !== null} onClick={gantiSuasana}>
									<IkonSuasana />
								</TombolIkon>
								<TombolIkon label={`Cuaca: ${labelCuaca} (ketuk untuk ganti)`} aktif={modeCuaca !== "otomatis"} onClick={gantiCuaca}>
									{modeCuaca === "hujan" ? <FiCloudRain /> : modeCuaca === "cerah" ? <FiSun /> : <FiCloud />}
								</TombolIkon>
								<TombolIkon label="Denah 2D" onClick={() => setMode("2d")}>
									<FiGrid />
								</TombolIkon>
								<TombolIkon label="Cara bermain" aktif={menu === "bantuan"} onClick={() => setMenu("bantuan")}>
									<FiHelpCircle />
								</TombolIkon>
								<TombolIkon label="Kode simpan" aktif={menu === "simpan"} onClick={() => setMenu("simpan")}>
									<FiSave />
								</TombolIkon>
							</div>
							<div className={sentuh ? "relative" : "relative sm:hidden"}>
								<TombolIkon label="Menu" aktif={menu === "aksi"} onClick={() => setMenu("aksi")}>
									<FiMenu />
								</TombolIkon>
								{misiSiap + (peta ? 0 : perhatian) > 0 && <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">{misiSiap + (peta ? 0 : perhatian)}</span>}
							</div>
						</div>
					</div>

					{/* peta 40 kecamatan (potensi tiap wilayah & game-nya) selalu bisa dibuka, juga di HP saat minimap disembunyikan */}
					{!mancingHp && (
						<div className={sentuh ? "absolute right-3 top-[3.75rem] w-28" : "absolute bottom-4 right-4 w-40"}>
							{peta ? (
								<Minimap area={area} lantai={lantai} dikunjungi={dikunjungi} onPilih={pindahCepat} onPeta={() => setMenu("kecamatan")} onTutup={() => setPeta(false)} perhatian={perhatian} />
							) : (
								<button
									type="button"
									onClick={() => setPeta(true)}
									aria-label="Tampilkan peta"
									title="Tampilkan peta"
									className="relative ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/55 text-white shadow ring-1 ring-white/30 backdrop-blur"
								>
									<FiMap />
									{perhatian > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold leading-none text-white">{perhatian}</span>}
								</button>
							)}
						</div>
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
								modeMain !== "mancing" &&
								tipJalan && (
									<p className="rounded-full bg-slate-900/55 px-3.5 py-1.5 text-center text-[11px] text-white backdrop-blur sm:px-4 sm:py-2 sm:text-sm">
										{sentuh ? "Geser analog atau ketuk lantai" : "Jalan dengan WASD, atau klik lantai"} untuk menuju pintu masuk
									</p>
								)
							)}
						</div>
					)}

					{!jeda && !fokusTarik && <BarTenaga onTas={() => setMenu("tas")} onAlbum={modeMain === "mancing" ? null : () => setMenu("album")} onGaya={() => setMenu("gaya")} onMisi={() => setMenu("misi")} onPeringkat={() => setMenu("peringkat")} onPancing={modeMain === "mancing" ? null : () => setMenu("pancing")} ringkas={modeMain === "mancing"} sentuh={sentuh} />}
					{!jeda && <HudLomba mancing={modeMain === "mancing"} />}
					{!jeda && mainBasket && <HudBasket sentuh={sentuh} />}
					{!jeda && !mancingHp && !mainBasket && (
						<div className={sentuh ? "absolute right-3 top-[11.25rem] [@media(max-height:520px)]:right-[9rem] [@media(max-height:520px)]:top-[3.75rem]" : "absolute right-4 top-[4.5rem]"}>
							<KartuKantor onAntar={pindahCepat} />
						</div>
					)}
					<PerayaanKantor />
					{modeMain === "mancing" && !jeda && <GamePancing sentuh={sentuh} bersama={statusMp === "tersambung"} onSelesai={() => (kendali.aksi = "berhenti")} />}

					{tipKendara && !sentuh && (
						<p className="pointer-events-none absolute left-1/2 top-28 -translate-x-1/2 rounded-full bg-slate-900/65 px-4 py-2 text-center text-xs text-white backdrop-blur sm:top-24 sm:text-sm">
							{petunjukKendara}
						</p>
					)}

					{profil?.mode === "bersama" && statusMp === "terputus" && galatMp && !jeda && (
						<p className="pointer-events-none absolute inset-x-4 top-[9.5rem] mx-auto w-fit max-w-md rounded-2xl bg-amber-50/95 px-4 py-2 text-center text-xs font-semibold text-amber-900 shadow-lg ring-1 ring-amber-200 sm:top-36 sm:text-sm">
							{galatMp}
						</p>
					)}

					{/* --- jelajah bersama: obrolan, emote, sapaan --- */}
					{statusMp === "tersambung" && !jeda && !fokusTarik && (
						<>
							<div
								className={`pointer-events-none absolute flex flex-col gap-1 ${kiriChat} ${
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
									className={`absolute right-3 z-20 flex gap-2 sm:right-auto sm:w-96 ${kiriChat} ${
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
								<div className={`absolute bottom-4 flex items-center gap-1.5 rounded-2xl bg-white/90 p-1.5 shadow-md ring-1 ring-black/5 backdrop-blur ${kiriChat}`}>
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
								{mainBasket && <TombolBasket />}
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
								{(modeMain === "perahu" || modeMain === "penumpang") && (
									<button
										onClick={() => (kendali.aksi = "renang:terjun")}
										aria-label="Terjun berenang"
										className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/80 text-xl text-white shadow-lg ring-1 ring-white/40 backdrop-blur active:bg-sky-600"
									>
										🏊
									</button>
								)}
								{(modeMain === "mobil" || modeMain === "motor") && (
									<button
										onClick={bunyikanKlakson}
										aria-label="Klakson"
										className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/80 text-xl text-white shadow-lg ring-1 ring-white/40 backdrop-blur active:bg-amber-600"
									>
										📯
									</button>
								)}
								{modeMain === "jalan" && !mainBasket && (
									<button
										onClick={() => (kendali.jongkok = !kendali.jongkok)}
										aria-label="Jongkok"
										className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/40 text-xl text-white shadow-lg ring-1 ring-white/30 backdrop-blur active:bg-slate-900/70"
									>
										🧎
									</button>
								)}
								{(modeMain === "jalan" || modeMain === "motor") && !mainBasket && (
									<button
										onClick={() => (kendali.loncat = true)}
										aria-label="Loncat"
										className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/40 text-white shadow-lg ring-1 ring-white/30 backdrop-blur active:bg-slate-900/70"
									>
										<FiArrowUp className="h-5 w-5" />
									</button>
								)}
								{statusMp === "tersambung" && !fokusTarik && (
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

			{mode === "3d" && !menu && !panel && modeMain !== "mancing" && <SaranSimpan onBuka={() => setMenu("simpan")} />}

			{menu === "aksi" && (
				<Lembar judul="Menu" onTutup={() => setMenu(null)}>
					{modeMain !== "mancing" && <MenuPemain onPilih={setMenu} perhatian={perhatian} />}
					<div className="grid grid-cols-2 gap-3">
						{[
							[FiNavigation, "Pindah cepat", `${dikunjungi.size}/${RUANGAN.length} ruang bidang dikunjungi`, () => setMenu("pindah")],
							[FiTruck, "Garasi saya", "Panggil mobil & motor milikmu", () => setMenu("garasi")],
							[
								FiMap,
								peta ? "Sembunyikan peta" : "Tampilkan peta",
								"Denah lantai, atau Kabupaten Bogor saat di luar",
								() => {
									setPeta((v) => !v);
									setMenu(null);
								},
							],
							[FiGrid, "Denah 2D", "Versi tanpa 3D", () => setMode("2d")],
							[IkonSuasana, `Suasana: ${labelSuasana}`, "Ketuk untuk ganti siang/malam", gantiSuasana],
							[modeCuaca === "hujan" ? FiCloudRain : FiCloud, `Cuaca: ${labelCuaca}`, "Ketuk untuk ganti otomatis/cerah/hujan", gantiCuaca],
							[FiMusic, `Musik latar: ${musikMati ? "Mati" : "Nyala"}`, "Lagu saat berjalan, berkendara & di mal", () => aturMusikLatar(!musikMati)],
							[FiHelpCircle, "Cara bermain", "Kontrol & tips", () => setMenu("bantuan")],
							[FiSave, "Kode simpan", "Pindahkan kemajuan antarperangkat", () => setMenu("simpan")],
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
						{/* tempat di koridor Jl. Tegar Beriman (±1–1,8 km dari kantor) */}
						{[
							["mcd", "McD Tegar Beriman", "Makan burger & paket nasi ayam", "#dc2626"],
							["ccm", "Cibinong City Mall", "Supermarket, butik, kedai kopi & bioskop", "#0e7490"],
						].map(([id, nama, ket, warna]) => (
							<li key={id}>
								<button onClick={() => pindahCepat(id)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50">
									<span className="h-3 w-3 shrink-0 rounded-full" style={{ background: warna }} />
									<span className="min-w-0 flex-1">
										<span className="block text-sm font-semibold text-slate-900">{nama}</span>
										<span className="block truncate text-xs text-slate-500">Jl. Tegar Beriman · {ket}</span>
									</span>
								</button>
							</li>
						))}
					</ul>
				</Lembar>
			)}

			{menu === "kasir" && (
				<Lembar judul={`🧾 Kasir ${INFO_TOKO[belanja.toko]?.nama ?? "toko"}`} onTutup={() => setMenu(null)}>
					<PanelKasir onSelesai={() => setMenu(null)} />
				</Lembar>
			)}

			{menu === "album" && <AlbumIkan onTutup={() => setMenu(null)} />}
			{menu === "kecamatan" && (
				<Lembar judul="🗺️ Bangun Kabupaten" lebar="sm:max-w-3xl" onTutup={() => setMenu(null)}>
					<PetaKecamatan onMain={(p) => {
						// berangkat ke dunia kecamatan; posisi di kantor disimpan untuk kembali nanti
						posisiKantor.current = { x: posisiPemain.x, y: posisiPemain.y, z: posisiPemain.z, rot: posisiPemain.rot, lantai: posisiPemain.lantai };
						setMenu(null);
						setDunia(p);
					}} />
				</Lembar>
			)}
			{menu === "pancing" && <PanelJoran onTutup={() => setMenu(null)} />}
			{(menu === "showroom:mobil" || menu === "showroom:motor" || menu === "showroom:perahu" || menu === "garasi") && (
				<Lembar judul={menu === "garasi" ? "🚗 Garasi saya" : menu === "showroom:mobil" ? "🚗 Showroom Mobil" : menu === "showroom:perahu" ? "⚓ Toko Perahu" : "🏍️ Showroom Motor"} lebar="sm:max-w-3xl" onTutup={() => setMenu(null)}>
					<PanelShowroom jenis={menu === "garasi" ? "garasi" : menu.slice(9)} onTutup={() => setMenu(null)} />
				</Lembar>
			)}
			{menu === "etalase" && (
				<Lembar judul="🛍️ Etalase Pasar BUMDes" lebar="sm:max-w-2xl" onTutup={() => setMenu(null)}>
					<PanelEtalaseBumdes />
				</Lembar>
			)}
			{menu === "acara" && (
				<Lembar judul="🏁 Lomba Jetski" onTutup={() => setMenu(null)}>
					<PanelAcara
						onMulai={() => {
							setMenu(null);
							kendali.aksi = mulaiLomba();
						}}
					/>
				</Lembar>
			)}
			{menu === "capit" && (
				<Lembar judul="🕹️ Mesin Capit" onTutup={() => setMenu(null)}>
					<PanelCapit />
				</Lembar>
			)}
			{menu === "atm" && (
				<Lembar judul="🏧 ATM Desa" onTutup={() => setMenu(null)}>
					<PanelAtm />
				</Lembar>
			)}
			{menu === "kolam" && (
				<Lembar judul="🦈 Kolam Monster DPMD" onTutup={() => setMenu(null)}>
					<PanelKolam onTutup={() => setMenu(null)} />
				</Lembar>
			)}


			{menu === "peringkat" && (
				<Lembar judul="🏆 Papan Peringkat" onTutup={() => setMenu(null)}>
					<PanelPeringkat namaSaya={profil?.nama} />
				</Lembar>
			)}

			{menu === "misi" && (
				<Lembar judul="⭐ Level & Misi Harian" onTutup={() => setMenu(null)}>
					<PanelMisi />
				</Lembar>
			)}

			{menu?.startsWith("gaya") && (
				<Lembar
					lebar="sm:max-w-3xl"
					judul={menu === "gaya:coba" ? "🪞 Ruang Coba · Distro Gaya" : menu === "gaya:toko" ? "👕 Distro Gaya" : menu === "gaya:butik" ? "👗 Butik Mode · Cibinong City Mall" : "👕 Lemari Gaya"}
					onTutup={() => setMenu(null)}
				>
					<PanelGaya mode={menu === "gaya:coba" ? "coba" : menu === "gaya:toko" || menu === "gaya:butik" ? "toko" : "lemari"} dasar={penampilanDasar} />
				</Lembar>
			)}

			{menu === "bioskop" && (
				<Lembar judul="🎬 Loket Bioskop · Cibinong City Mall" onTutup={() => setMenu(null)}>
					<PanelBioskop onSelesai={() => setMenu(null)} />
				</Lembar>
			)}

			{menu === "lift" && (
				<Lembar judul="🛗 Lift · Cibinong City Mall" onTutup={() => setMenu(null)}>
					<div className="grid grid-cols-2 gap-2.5">
						{[
							["Lt 1", "Pintu utama · Supermarket · Kedai kopi"],
							["Lt 2", "Butik & fesyen"],
							["Lt 3", "Food court · Zona main"],
							["Lt 4", "Bioskop"],
						].map(([nama, isi], n) => (
							<button
								key={nama}
								disabled={lantaiMal === n}
								onClick={() => {
									kendali.teleport = { x: TITIK_LIFT.x, z: TITIK_LIFT.z, y: -0.6 + yLantaiMal(n), lantai: 0, rot: -Math.PI / 2, yaw: Math.PI / 2 };
									setMenu(null);
								}}
								className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-sm disabled:border-slate-900 disabled:bg-slate-900 disabled:text-white"
							>
								<span className="text-lg font-black">{nama}</span>
								<span className={`text-xs ${lantaiMal === n ? "text-slate-300" : "text-slate-500"}`}>{lantaiMal === n ? "Anda di sini" : isi}</span>
							</button>
						))}
					</div>
				</Lembar>
			)}

			{menu?.startsWith("warung:") && WARUNG[menu.slice(7)] && (
				<Lembar judul={`${WARUNG[menu.slice(7)].ikon} ${WARUNG[menu.slice(7)].nama}`} onTutup={() => setMenu(null)}>
					<PanelWarung id={menu.slice(7)} onSelesai={() => setMenu(null)} />
				</Lembar>
			)}

			{menu === "tas" && (
				<Lembar judul="🎒 Tas belanjaan" onTutup={() => setMenu(null)}>
					<PanelTas />
				</Lembar>
			)}

			{menu === "simpan" && (
				<Lembar judul="💾 Kode simpan" onTutup={() => setMenu(null)}>
					<PanelSimpan />
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
									["Tombol Loncat", "meloncat; saat menghadap pagar: memanjatnya"],
									["Tombol 🧎", "jongkok / berdiri; jalan jongkok pelan dan tanpa suara langkah"],
									["Di mobil/motor", "analog = gas & setir, tombol Turbo untuk ngebut, 📯 klakson"],
									["Mobil berempat", "dekati mobil/motor/perahu yang dikemudikan tamu lain untuk ikut naik"],
									["Situ Pemda", "naik perahu di dermaga; di panggung dermaga atau dari perahu tekan Mancing"],
									["Toko Perahu", "kios biru di tiap dermaga, seberang Toko Pancing: beli kano, sampan, speedboat, jetski; panggil dari ☰ → Garasi saya"],
									["Urusan kantor", "ambil nomor di resepsionis, tebak bidang yang tepat, serahkan berkas sebelum waktunya habis"],
									["Acara harian", "bazar atau lomba jetski bergantian tiap hari; lihat kartu misi di kanan atas"],
									["Memancing", "tahan 🎣 lalu lepas untuk melempar; saat adu tarik KETUK 🎣 berulang untuk menggulung, berhenti saat ikan lari"],
									["AUTO & kamera", "🤖 AUTO memancing sendiri (joran Kapal Samudra / Perak Maestro / Garuda Sakti, koin 75%); 🎥 ganti sudut: Standar, Dekat, Atas, Sinematik"],
									["Kolam Monster", "kolam berbayar di barat kantor: tiket 🪙 2.000 / 10 menit, isinya ikan Monster & Legenda; daftar Lomba Galatama di loket"],
									["Pasar BUMDes", "food court di utara Kolam Monster: pesan di lapak, duduk di meja mana pun; ada live music"],
									["Showroom", "timur kantor: beli mobil & motor di meja sales; panggil dari menu ☰ → Garasi saya"],
									["Tenaga ❤", "berkurang seiring waktu, berlari, dan tertabrak; belanja di Alfamart: ambil keranjang, pilih barang di rak, bayar di kasir, lalu makan dari 🎒 Tas"],
									["Tombol 💬 / 🙂", "ngobrol & kirim emote ke tamu lain; dekati tamu untuk menyapa"],
								]
							: [
									["W A S D / panah", "berjalan"],
									["Shift", "berlari"],
									["Seret mouse · roda", "memutar kamera · zoom"],
									["Klik lantai / petugas", "berjalan otomatis ke sana"],
									["E", "bicara · pakai benda · duduk · naik/turun kendaraan"],
									["Spasi", "loncat; saat menghadap pagar: memanjatnya"],
									["C", "jongkok / berdiri; jalan jongkok pelan dan tanpa suara langkah"],
									["Di mobil/motor", "W/S gas & mundur, A/D belok, Shift turbo, H klakson"],
									["Mobil berempat", "E di dekat kendaraan yang dikemudikan tamu lain = ikut naik"],
									["Situ Pemda", "E di dermaga: naik perahu · E di panggung / perahu: memancing"],
									["Toko Perahu", "E di kios biru dermaga (seberang Toko Pancing): beli perahu bermesin & jetski; panggil dari ☰ → Garasi saya"],
									["Urusan kantor", "E di resepsionis = ambil nomor, tebak bidang yang tepat, lalu E di ruangnya = serahkan berkas sebelum waktunya habis"],
									["Acara harian", "bazar atau lomba jetski bergantian tiap hari; lihat kartu misi di kanan atas"],
									["Memancing", "tahan Spasi lalu lepas = lempar; KETUK Spasi berulang = gulung (jangan ditahan), arahkan mouse (atau A/D) melawan arah ikan, F = Tarikan Sakti saat meteran ⚡ penuh"],
									["AUTO & kamera", "O = AUTO memancing (joran Kapal Samudra / Perak Maestro / Garuda Sakti, koin 75%) · C = ganti sudut kamera: Standar, Dekat, Atas, Sinematik"],
									["Kolam Monster", "kolam berbayar di barat kantor: E di loket = tiket 🪙 2.000 / 10 menit & Lomba Galatama (juara = ikan terberat)"],
									["Pasar BUMDes", "food court produk BUM Desa di utara Kolam Monster: E di lapak = pesan menu, duduk di meja mana pun; ada live music"],
									["Showroom", "timur kantor: E di meja sales = beli mobil / motor; panggil kendaraanmu dari tombol 🚚 Garasi"],
									["Tenaga ❤", "habis = pingsan; masuk Alfamart seberang kantor: E ambil keranjang & barang di rak, bayar di kasir pakai koin, makan dari 🎒 Tas"],
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
