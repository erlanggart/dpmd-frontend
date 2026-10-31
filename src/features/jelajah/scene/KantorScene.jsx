import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import Fasad from "./Fasad";
import Gedung, { GrupLantai } from "./Gedung";
import Lingkungan from "./Lingkungan";
import Pegawai from "./Pegawai";
import Pemain from "./Pemain";
import PemainLain from "./PemainLain";
import Petugas from "./Petugas";

// Seluruh adegan 3D. Berkas ini (beserta three.js) hanya dimuat saat pengunjung
// membuka /jelajah, jadi landing page biasa tidak ikut menanggung bobotnya.
export default function KantorScene({ statistik, dikunjungi, jeda, penghuni, penampilan }) {
	// Dinding per lantai yang bisa dipudarkan saat menghalangi kamera.
	const daftarDinding = useRef({ 0: [], 1: [] });

	return (
		<Canvas
			dpr={[1, 1.5]}
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
			<hemisphereLight args={["#ffffff", "#a8a49b", 1.15]} />
			<directionalLight position={[12, 25, 10]} intensity={1.5} color="#fff3dc" />

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
