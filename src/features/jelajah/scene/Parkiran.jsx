import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { KENDARAAN } from "./kendaraan";
import { MOBIL, PAGAR_BATA, PARKIRAN, RUMAH_TETANGGA } from "./layout";
import { teksturPavingParkir } from "./tekstur";

// Halaman depan kantor: parkiran berpaving, mobil dan motor (bisa dikemudikan
// pengunjung), pagar bata di sisi kiri, dan rumah tetangga di sisi kanan.

// Roda: silinder dengan "jari" agar putarannya terlihat.
function Roda({ r, lebar, akar }) {
	return (
		<group ref={akar}>
			<mesh rotation-z={Math.PI / 2}>
				<cylinderGeometry args={[r, r, lebar, 14]} />
				<meshStandardMaterial color="#141414" />
			</mesh>
			<mesh>
				<boxGeometry args={[lebar + 0.01, r * 1.4, 0.06]} />
				<meshStandardMaterial color="#8a8f96" metalness={0.5} roughness={0.4} />
			</mesh>
		</group>
	);
}

// Mobil setir kanan: pintu sopir (sisi -x lokal) berengsel di tepi depannya dan
// terbuka saat pengunjung masuk/keluar; roda berputar, roda depan ikut membelok.
function Mobil({ k }) {
	const grup = useRef();
	const pintu = useRef();
	const roda = useRef([]);
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
			<mesh position-y={0.62}>
				<boxGeometry args={[1.8, 0.62, 4]} />
				<meshStandardMaterial color={k.warna} metalness={0.3} roughness={0.45} />
			</mesh>
			{/* kabin kaca + atap */}
			<mesh position={[0, 1.2, -0.25]}>
				<boxGeometry args={[1.6, 0.55, 2.2]} />
				<meshStandardMaterial color="#1e262c" metalness={0.4} roughness={0.2} />
			</mesh>
			<mesh position={[0, 1.5, -0.3]}>
				<boxGeometry args={[1.62, 0.08, 1.9]} />
				<meshStandardMaterial color={k.warna} metalness={0.3} roughness={0.45} />
			</mesh>
			{/* pintu sopir: engsel di tepi depan (z = 0.95), daun mengarah ke belakang */}
			<group ref={pintu} position={[-0.92, 0, 0.95]}>
				<mesh position={[-0.02, 0.62, -0.55]}>
					<boxGeometry args={[0.06, 0.6, 1.1]} />
					<meshStandardMaterial color={k.warna} metalness={0.3} roughness={0.45} />
				</mesh>
				<mesh position={[-0.02, 1.18, -0.55]}>
					<boxGeometry args={[0.05, 0.5, 1.0]} />
					<meshStandardMaterial color="#26313a" metalness={0.4} roughness={0.2} />
				</mesh>
				<mesh position={[-0.07, 0.8, -0.9]}>
					<boxGeometry args={[0.03, 0.04, 0.16]} />
					<meshStandardMaterial color="#c9ccce" metalness={0.6} />
				</mesh>
			</group>
			{/* lampu depan & belakang */}
			{[-0.6, 0.6].map((lx) => (
				<mesh key={lx} position={[lx, 0.72, 2.01]}>
					<boxGeometry args={[0.38, 0.14, 0.03]} />
					<meshStandardMaterial color="#fff6d6" emissive="#fff1c2" emissiveIntensity={0.5} />
				</mesh>
			))}
			{[-0.65, 0.65].map((lx) => (
				<mesh key={`b${lx}`} position={[lx, 0.75, -2.01]}>
					<boxGeometry args={[0.32, 0.12, 0.03]} />
					<meshStandardMaterial color="#b91c1c" emissive="#7f1d1d" emissiveIntensity={0.4} />
				</mesh>
			))}
			{[
				[-0.86, 1.3],
				[0.86, 1.3],
				[-0.86, -1.3],
				[0.86, -1.3],
			].map(([rx, rz], i) => (
				<group key={i} position={[rx, 0.33, rz]}>
					<Roda r={0.33} lebar={0.24} akar={(w) => (roda.current[i] = w)} />
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
				<mesh position-y={0.62}>
					<boxGeometry args={[0.3, 0.42, 1.3]} />
					<meshStandardMaterial color={k.warna} />
				</mesh>
				<mesh position={[0, 0.88, -0.15]}>
					<boxGeometry args={[0.28, 0.1, 0.65]} />
					<meshStandardMaterial color="#1b1b1b" />
				</mesh>
				<group ref={stang} position={[0, 0, 0.6]}>
					<mesh position-y={1.05}>
						<boxGeometry args={[0.62, 0.05, 0.05]} />
						<meshStandardMaterial color="#2a2a2a" />
					</mesh>
					<mesh position={[0, 0.85, 0.05]} rotation-x={-0.3}>
						<boxGeometry args={[0.06, 0.45, 0.06]} />
						<meshStandardMaterial color="#9aa0a6" metalness={0.5} />
					</mesh>
					<mesh position={[0, 0.98, 0.14]}>
						<boxGeometry args={[0.16, 0.1, 0.04]} />
						<meshStandardMaterial color="#fff6d6" emissive="#fff1c2" emissiveIntensity={0.5} />
					</mesh>
				</group>
				{[0.62, -0.62].map((rz, i) => (
					<group key={rz} position={[0, 0.3, rz]}>
						<Roda r={0.3} lebar={0.12} akar={(w) => (roda.current[i] = w)} />
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
		return hasil;
	}, []);
	const p = PARKIRAN;
	const paving = useMemo(() => teksturPavingParkir([(p.x1 - p.x0) / 1.6, (p.z1 - p.z0) / 1.6]), [p]);

	return (
		<group>
			<mesh rotation-x={-Math.PI / 2} position={[(p.x0 + p.x1) / 2, 0.005, (p.z0 + p.z1) / 2]}>
				<planeGeometry args={[p.x1 - p.x0, p.z1 - p.z0]} />
				<meshStandardMaterial map={paving} />
			</mesh>
			{garis.map((gx) => (
				<mesh key={gx} rotation-x={-Math.PI / 2} position={[gx, 0.012, 18]}>
					<planeGeometry args={[0.1, 4.6]} />
					<meshBasicMaterial color="#f4efe4" />
				</mesh>
			))}
			{KENDARAAN.map((k) => (k.jenis === "mobil" ? <Mobil key={k.id} k={k} /> : <Motor key={k.id} k={k} />))}
			<PagarBata />
			<RumahTetangga />
		</group>
	);
}
