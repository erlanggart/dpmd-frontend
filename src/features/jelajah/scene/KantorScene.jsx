import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Fasad from "./Fasad";
import Gedung, { GrupLantai } from "./Gedung";
import Lingkungan from "./Lingkungan";
import Pegawai from "./Pegawai";
import Pemain from "./Pemain";
import PemainLain from "./PemainLain";
import SiangMalam from "./SiangMalam";
import Petugas from "./Petugas";

const DPR_MAKS = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 1.5);

// Kualitas otomatis: tiap 2 detik FPS diukur; bila tersendat (HP lemah, banyak
// orang di layar) resolusi render diturunkan, bila lancar beberapa kali berturut
// dinaikkan lagi sampai batasnya. Gambar sedikit lebih lembut, gerak tetap mulus.
function KualitasOtomatis() {
	const setDpr = useThree((s) => s.setDpr);
	const ukur = useRef({ t: 0, n: 0, dpr: DPR_MAKS, lancar: 0, lewati: 2 });
	useFrame((_, dt) => {
		const u = ukur.current;
		u.t += dt;
		u.n++;
		if (u.t < 2) return;
		const fps = u.n / u.t;
		u.t = 0;
		u.n = 0;
		// beberapa detik pertama masih memuat tekstur & menyusun shader
		if (u.lewati > 0) return void u.lewati--;
		let baru = u.dpr;
		if (fps < 35) {
			baru = Math.max(0.6, u.dpr - 0.2);
			u.lancar = 0;
		} else if (fps > 55 && ++u.lancar >= 3) {
			baru = Math.min(DPR_MAKS, u.dpr + 0.1);
			u.lancar = 0;
		} else if (fps <= 55) u.lancar = 0;
		baru = Math.round(baru * 100) / 100;
		if (baru !== u.dpr) {
			u.dpr = baru;
			setDpr(baru);
		}
	});
	return null;
}

// Seluruh adegan 3D. Berkas ini (beserta three.js) hanya dimuat saat pengunjung
// membuka /jelajah, jadi landing page biasa tidak ikut menanggung bobotnya.
export default function KantorScene({ statistik, dikunjungi, jeda, penghuni, penampilan }) {
	// Dinding per lantai yang bisa dipudarkan saat menghalangi kamera.
	const daftarDinding = useRef({ 0: [], 1: [] });

	return (
		<Canvas
			dpr={DPR_MAKS}
			frameloop={jeda ? "never" : "always"}
			camera={{ fov: 50, near: 0.1, far: 170, position: [0, 8, 40] }}
			gl={{ antialias: true, powerPreference: "high-performance" }}
			style={{ touchAction: "none" }}
			onCreated={({ gl, scene }) => {
				// dev: statistik render untuk uji performa otomatis
				if (import.meta.env.DEV) Object.assign(window, { __gl: gl, __adegan: scene });
			}}
		>
			<color attach="background" args={["#cfe6f1"]} />
			<fog attach="fog" args={["#cfe6f1", 50, 120]} />
			<SiangMalam />

			<KualitasOtomatis />
			<Lingkungan daftarDinding={daftarDinding} />
			<Gedung daftarDinding={daftarDinding} statistik={statistik} />
			<Fasad statistik={statistik} />
			{[0, 1].map((l) => (
				<GrupLantai key={l} lantai={l} geser={false}>
					<Petugas dikunjungi={dikunjungi} lantai={l} dataPetugas={penghuni.petugas} />
					<Pegawai lantai={l} penghuni={penghuni} />
				</GrupLantai>
			))}
			<Pemain daftarDinding={daftarDinding} penghuni={penghuni} penampilan={penampilan} />
			<PemainLain />
		</Canvas>
	);
}
