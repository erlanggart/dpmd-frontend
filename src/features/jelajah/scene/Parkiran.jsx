import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { KENDARAAN } from "./kendaraan";
import { MOBIL, PAGAR_BATA, PARKIRAN, RUMAH_TETANGGA } from "./layout";
import { BoxGeometry, CylinderGeometry, MeshStandardMaterial } from "three";
import Gabung from "./Gabung";
import { BAHAN_WARNA, gabung, kotak, warnai } from "./geometri";
import { teksturPavingParkir } from "./tekstur";

// Halaman depan kantor: parkiran berpaving, mobil dan motor (bisa dikemudikan
// pengunjung), pagar bata di sisi kiri, dan rumah tetangga di sisi kanan.

// Kendaraan digabung per bagian yang bergerak bersama: badan (1 draw call), pintu
// sopir, setang, dan tiap roda — bukan satu mesh per potongan.
const BAHAN_KENDARAAN = new MeshStandardMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.45 });

// Roda: ban + "jari" agar putarannya terlihat; geometrinya dipakai bersama.
const geomRoda = (r, lebar) =>
	gabung([
		warnai(new CylinderGeometry(r, r, lebar, 14), "#141414", { r: [0, 0, Math.PI / 2] }),
		kotak([lebar + 0.01, r * 1.4, 0.06], "#8a8f96", [0, 0, 0]),
	]);
const RODA_MOBIL = geomRoda(0.33, 0.24);
const RODA_MOTOR = geomRoda(0.3, 0.12);

function Roda({ geom, akar }) {
	return <mesh ref={akar} geometry={geom} material={BAHAN_KENDARAAN} />;
}

// Mobil setir kanan: pintu sopir (sisi -x lokal) berengsel di tepi depannya dan
// terbuka saat pengunjung masuk/keluar; roda berputar, roda depan ikut membelok.
function Mobil({ k }) {
	const grup = useRef();
	const pintu = useRef();
	const roda = useRef([]);
	const geom = useMemo(
		() => ({
			badan: gabung([
				kotak([1.8, 0.62, 4], k.warna, [0, 0.62, 0]),
				// kabin kaca + atap
				kotak([1.6, 0.55, 2.2], "#1e262c", [0, 1.2, -0.25]),
				kotak([1.62, 0.08, 1.9], k.warna, [0, 1.5, -0.3]),
				// lampu depan & belakang
				...[-0.6, 0.6].map((lx) => kotak([0.38, 0.14, 0.03], "#fff8e0", [lx, 0.72, 2.01])),
				...[-0.65, 0.65].map((lx) => kotak([0.32, 0.12, 0.03], "#c81e1e", [lx, 0.75, -2.01])),
			]),
			// pintu sopir: engsel di tepi depan (z = 0.95), daun mengarah ke belakang
			pintu: gabung([
				kotak([0.06, 0.6, 1.1], k.warna, [-0.02, 0.62, -0.55]),
				kotak([0.05, 0.5, 1.0], "#26313a", [-0.02, 1.18, -0.55]),
				kotak([0.03, 0.04, 0.16], "#c9ccce", [-0.07, 0.8, -0.9]),
			]),
		}),
		[k.warna],
	);
	useEffect(() => () => Object.values(geom).forEach((g) => g.dispose()), [geom]);
	useFrame(() => {
		grup.current.position.set(k.x, 0, k.z);
		grup.current.rotation.y = k.rot;
		pintu.current.rotation.y = k.pintu * 1.15;
		roda.current.forEach((w, i) => {
			if (!w) return;
			w.rotation.order = "YXZ";
			w.rotation.x = k.roda;
			w.rotation.y = i < 2 ? -k.setir * 0.5 : 0;
		});
	});
	return (
		<group ref={grup}>
			<mesh geometry={geom.badan} material={BAHAN_KENDARAAN} />
			<group ref={pintu} position={[-0.92, 0, 0.95]}>
				<mesh geometry={geom.pintu} material={BAHAN_KENDARAAN} />
			</group>
			{[
				[-0.86, 1.3],
				[0.86, 1.3],
				[-0.86, -1.3],
				[0.86, -1.3],
			].map(([rx, rz], i) => (
				<group key={i} position={[rx, 0.33, rz]}>
					<Roda geom={RODA_MOBIL} akar={(w) => (roda.current[i] = w)} />
				</group>
			))}
		</group>
	);
}

// Motor: miring dengan standar samping saat diparkir, tegak & menikung saat dikendarai.
function Motor({ k }) {
	const grup = useRef();
	const badan = useRef();
	const stang = useRef();
	const roda = useRef([]);
	const geom = useMemo(
		() => ({
			badan: gabung([kotak([0.3, 0.42, 1.3], k.warna, [0, 0.62, 0]), kotak([0.28, 0.1, 0.65], "#1b1b1b", [0, 0.88, -0.15])]),
			stang: gabung([
				kotak([0.62, 0.05, 0.05], "#2a2a2a", [0, 1.05, 0]),
				warnai(new BoxGeometry(0.06, 0.45, 0.06), "#9aa0a6", { p: [0, 0.85, 0.05], r: [-0.3, 0, 0] }),
				kotak([0.16, 0.1, 0.04], "#fff8e0", [0, 0.98, 0.14]),
			]),
		}),
		[k.warna],
	);
	useEffect(() => () => Object.values(geom).forEach((g) => g.dispose()), [geom]);
	useFrame(() => {
		grup.current.position.set(k.x, 0, k.z);
		grup.current.rotation.y = k.rot;
		badan.current.rotation.z = k.miring;
		stang.current.rotation.y = -k.setir * 0.5;
		roda.current.forEach((w) => w && (w.rotation.x = k.roda));
	});
	return (
		<group ref={grup}>
			<group ref={badan}>
				<mesh geometry={geom.badan} material={BAHAN_KENDARAAN} />
				<group ref={stang} position={[0, 0, 0.6]}>
					<mesh geometry={geom.stang} material={BAHAN_KENDARAAN} />
				</group>
				{[0.62, -0.62].map((rz, i) => (
					<group key={rz} position={[0, 0.3, rz]}>
						<Roda geom={RODA_MOTOR} akar={(w) => (roda.current[i] = w)} />
					</group>
				))}
			</group>
		</group>
	);
}

function PagarBata() {
	const { x, z0, z1, tinggi } = PAGAR_BATA;
	const panjang = z1 - z0;
	return (
		<group position={[x, 0, (z0 + z1) / 2]}>
			<mesh position-y={tinggi / 2}>
				<boxGeometry args={[0.35, tinggi, panjang]} />
				<meshStandardMaterial color="#b4604a" />
			</mesh>
			<mesh position-y={tinggi + 0.05}>
				<boxGeometry args={[0.45, 0.1, panjang]} />
				<meshStandardMaterial color="#8f4a37" />
			</mesh>
			{/* tiang tiap 3,4 m */}
			{Array.from({ length: Math.floor(panjang / 3.4) + 1 }, (_, i) => (
				<mesh key={i} position={[0, tinggi / 2 + 0.05, -panjang / 2 + i * 3.4]}>
					<boxGeometry args={[0.5, tinggi + 0.1, 0.5]} />
					<meshStandardMaterial color="#a35641" />
				</mesh>
			))}
		</group>
	);
}

function RumahTetangga() {
	const { x, z, lx, lz, tinggi } = RUMAH_TETANGGA;
	return (
		<group position={[x, 0, z]}>
			<mesh position-y={tinggi / 2}>
				<boxGeometry args={[lx, tinggi, lz]} />
				<meshStandardMaterial color="#efe6d2" />
			</mesh>
			{/* atap limas: kerucut 4 sisi diputar 45° lalu di-scale oleh induknya, jadi alasnya persegi panjang */}
			<group position-y={tinggi + 1.4} scale={[(lx / 2 + 0.5) / Math.SQRT1_2, 1, (lz / 2 + 0.5) / Math.SQRT1_2]}>
				<mesh rotation-y={Math.PI / 4}>
					<coneGeometry args={[1, 2.8, 4]} />
					<meshStandardMaterial color="#c9673f" flatShading />
				</mesh>
			</group>
			{[-2, 2].map((wz) => (
				<mesh key={wz} position={[-lx / 2 - 0.01, 2.6, wz]} rotation-y={-Math.PI / 2}>
					<planeGeometry args={[1.1, 1.4]} />
					<meshStandardMaterial color="#2a2f33" />
				</mesh>
			))}
		</group>
	);
}

export default function Parkiran() {
	// Garis putih pembatas petak parkir, di antara mobil-mobil.
	const garis = useMemo(() => {
		const xs = MOBIL.map((m) => m.x).sort((a, b) => a - b);
		const hasil = [];
		for (let i = 0; i < xs.length; i++) {
			hasil.push(xs[i] - 1.35);
			if (i === xs.length - 1 || xs[i + 1] - xs[i] > 3) hasil.push(xs[i] + 1.35);
		}
		return gabung(hasil.map((gx) => kotak([0.1, 0.01, 4.6], "#f4efe4", [gx, 0.012, 18])));
	}, []);
	const p = PARKIRAN;
	const paving = useMemo(() => teksturPavingParkir([(p.x1 - p.x0) / 1.6, (p.z1 - p.z0) / 1.6]), [p]);

	return (
		<group>
			<mesh rotation-x={-Math.PI / 2} position={[(p.x0 + p.x1) / 2, 0.005, (p.z0 + p.z1) / 2]}>
				<planeGeometry args={[p.x1 - p.x0, p.z1 - p.z0]} />
				<meshStandardMaterial map={paving} />
			</mesh>
			<mesh geometry={garis} material={BAHAN_WARNA} />
			{KENDARAAN.map((k) => (k.jenis === "mobil" ? <Mobil key={k.id} k={k} /> : <Motor key={k.id} k={k} />))}
			<Gabung>
				<PagarBata />
				<RumahTetangga />
			</Gabung>
		</group>
	);
}
