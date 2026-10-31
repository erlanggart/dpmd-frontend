import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D } from "three";
import { ANAK_TANGGA, FONDASI, PILAR, POHON, PONDASI, SEMAK, TANAH, TERAS, TIANG_BENDERA } from "./layout";
import { teksturPaving } from "./tekstur";
import Papan from "./Papan";
import PagarDepan from "./PagarDepan";
import Parkiran from "./Parkiran";

// Pohon digambar sebagai InstancedMesh (batang, daun, bak tanam, rumput dalam bak):
// puluhan pohon cukup empat draw call, penting untuk HP kelas menengah.
function Pepohonan() {
	const batang = useRef();
	const daun = useRef();
	const bak = useRef();
	const rumput = useRef();

	useLayoutEffect(() => {
		const o = new Object3D();
		const pasang = (ref, i) => {
			o.updateMatrix();
			ref.current.setMatrixAt(i, o.matrix);
		};
		POHON.forEach(([x, z, s], i) => {
			o.rotation.set(0, i * 1.7, 0);
			o.scale.set(s, s, s);
			o.position.set(x, 0.6 * s, z);
			pasang(batang, i);
			o.position.set(x, 1.9 * s, z);
			pasang(daun, i);
			o.scale.set(1, 1, 1);
			o.position.set(x, 0.17, z);
			pasang(bak, i);
			o.position.set(x, 0.3, z);
			pasang(rumput, i);
		});
		for (const r of [batang, daun, bak, rumput]) r.current.instanceMatrix.needsUpdate = true;
	}, []);

	return (
		<>
			<instancedMesh ref={batang} args={[null, null, POHON.length]}>
				<cylinderGeometry args={[0.14, 0.2, 1.2, 6]} />
				<meshStandardMaterial color="#7a5133" />
			</instancedMesh>
			<instancedMesh ref={daun} args={[null, null, POHON.length]}>
				<icosahedronGeometry args={[1.05, 0]} />
				<meshStandardMaterial color="#4c9a5b" flatShading />
			</instancedMesh>
			{/* bak tanam beton & rumput di dalamnya: halaman sudah berpaving */}
			<instancedMesh ref={bak} args={[null, null, POHON.length]}>
				<cylinderGeometry args={[0.85, 0.9, 0.34, 16]} />
				<meshStandardMaterial color="#b9b5ad" />
			</instancedMesh>
			<instancedMesh ref={rumput} args={[null, null, POHON.length]}>
				<cylinderGeometry args={[0.76, 0.76, 0.06, 16]} />
				<meshStandardMaterial color="#5f9a4e" />
			</instancedMesh>
		</>
	);
}

function Bendera() {
	const kain = useRef();
	useFrame(({ clock }) => {
		kain.current.rotation.y = Math.sin(clock.elapsedTime * 2.2) * 0.12;
	});
	return (
		<group position={[TIANG_BENDERA.x, 0, TIANG_BENDERA.z]}>
			<mesh position-y={0.15}>
				<cylinderGeometry args={[0.45, 0.5, 0.3, 12]} />
				<meshStandardMaterial color="#b9b5ad" />
			</mesh>
			<mesh position-y={3}>
				<cylinderGeometry args={[0.05, 0.06, 6, 8]} />
				<meshStandardMaterial color="#d1d5db" metalness={0.4} roughness={0.4} />
			</mesh>
			<group ref={kain} position={[0.05, 5.5, 0]}>
				<mesh position={[0.75, 0.25, 0]}>
					<planeGeometry args={[1.5, 0.5]} />
					<meshStandardMaterial color="#dc2626" side={2} />
				</mesh>
				<mesh position={[0.75, -0.25, 0]}>
					<planeGeometry args={[1.5, 0.5]} />
					<meshStandardMaterial color="#ffffff" side={2} />
				</mesh>
			</group>
		</group>
	);
}

// Kanopi ikut didaftarkan sebagai penghalang pandang: saat pengunjung baru masuk
// lobi, kamera masih di luar dan balok kanopi akan menutupi tokoh bila tidak dipudarkan.
function Kanopi({ daftarDinding }) {
	const grup = useRef();
	useEffect(() => {
		const mesh = [];
		grup.current.traverse((o) => {
			if (!o.isMesh) return;
			o.material.transparent = true;
			o.userData.bahan = [o.material];
			mesh.push(o);
		});
		// Satu bagian kanopi terkena sinar kamera → seluruh kanopi memudar bersama.
		mesh.forEach((m) => (m.userData.sekelompok = mesh));
		const daftar = daftarDinding.current[0];
		daftar.push(...mesh);
		return () => mesh.forEach((m) => daftar.splice(daftar.indexOf(m), 1));
	}, [daftarDinding]);

	// Atap datar menaungi seluruh teras; lis depannya bertuliskan nama dinas.
	const t = TERAS;
	const lebar = t.x1 - t.x0 - 0.4;
	const dalam = t.z1 - t.z0 - 0.1;
	return (
		<group ref={grup}>
			{PILAR.map((p) => (
				<mesh key={p.x} position={[p.x, 1.45, p.z]}>
					<boxGeometry args={[0.4, 2.9, 0.4]} />
					<meshStandardMaterial color="#b6cf78" />
				</mesh>
			))}
			<mesh position={[0, 3.0, t.z0 + dalam / 2]}>
				<boxGeometry args={[lebar, 0.22, dalam]} />
				<meshStandardMaterial color="#e9e6dd" />
			</mesh>
			<mesh position={[0, 3.0, t.z0 + dalam]}>
				<boxGeometry args={[lebar + 0.1, 0.62, 0.14]} />
				<meshStandardMaterial color="#9fb766" />
			</mesh>
			<Papan
				posisi={[0, 3.0, t.z0 + dalam + 0.08]}
				lebar={7.5}
				tinggi={0.52}
				latar="#d6e5a3"
				baris={[{ teks: "DINAS PEMBERDAYAAN MASYARAKAT DAN DESA", ukuran: 0.34, tebal: true, warna: "#1d2a1a", y: 0.54 }]}
			/>
		</group>
	);
}

// Pondasi semen di bawah gedung, teras depan lobi (lantai granit), dua anak tangga
// selebar teras, dan bak tanaman di kedua sisinya.
function PondasiTeras() {
	const p = PONDASI;
	const t = TERAS;
	const { n, dalam } = ANAK_TANGGA;
	const naik = FONDASI / (n + 1);
	const lebarTeras = t.x1 - t.x0;
	return (
		<group>
			<mesh position={[(p.x0 + p.x1) / 2, -FONDASI / 2 - 0.005, (p.z0 + p.z1) / 2]}>
				<boxGeometry args={[p.x1 - p.x0, FONDASI, p.z1 - p.z0]} />
				<meshStandardMaterial color="#a9a59c" />
			</mesh>
			{/* teras */}
			<mesh position={[0, -FONDASI / 2 - 0.005, (t.z0 + t.z1) / 2]}>
				<boxGeometry args={[lebarTeras, FONDASI, t.z1 - t.z0]} />
				<meshStandardMaterial color="#a9a59c" />
			</mesh>
			<mesh rotation-x={-Math.PI / 2} position={[0, 0.004, (p.z1 + t.z1) / 2]}>
				<planeGeometry args={[lebarTeras, t.z1 - p.z1]} />
				<meshStandardMaterial color="#d8d3c8" roughness={0.5} />
			</mesh>
			{/* anak tangga: pijakan ke-i turun naik × i */}
			{Array.from({ length: n }, (_, i) => {
				const atas = -naik * (i + 1);
				const tinggi = atas - TANAH;
				return (
					<mesh key={i} position={[0, TANAH + tinggi / 2 - 0.005, t.z1 + dalam * (i + 0.5)]}>
						<boxGeometry args={[lebarTeras, tinggi, dalam]} />
						<meshStandardMaterial color={i % 2 ? "#c4c0b6" : "#cfcac0"} />
					</mesh>
				);
			})}
			{/* bak tanaman di sisi teras */}
			{[t.x0 - 0.15, t.x1 + 0.15].map((x) => {
				const z0 = t.z0 + 0.4;
				const z1 = t.z1 + n * dalam;
				return (
					<group key={x}>
						<mesh position={[x, TANAH + 0.5, (z0 + z1) / 2]}>
							<boxGeometry args={[0.3, 1.0, z1 - z0]} />
							<meshStandardMaterial color="#8f8c84" />
						</mesh>
						{[0.25, 0.5, 0.75].map((f) => (
							<mesh key={f} position={[x, 0.62, z0 + (z1 - z0) * f]}>
								<icosahedronGeometry args={[0.28, 0]} />
								<meshStandardMaterial color="#3f8a4f" flatShading />
							</mesh>
						))}
					</group>
				);
			})}
		</group>
	);
}

export default function Lingkungan({ daftarDinding }) {
	// Seluruh halaman berpaving blok; satu ubin tekstur = 1,6 m.
	const paving = useMemo(() => teksturPaving([180 / 1.6, 180 / 1.6]), []);

	return (
		<group>
			{/* seluruh halaman satu pondasi lebih rendah dari lantai gedung */}
			<group position-y={TANAH}>
				<mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
					<planeGeometry args={[180, 180]} />
					<meshStandardMaterial map={paving} />
				</mesh>
				<Parkiran />
				<PagarDepan />
				{/* semak di depan gedung */}
				{SEMAK.map(([x, z]) => (
					<mesh key={x} position={[x, 0.35, z]}>
						<icosahedronGeometry args={[0.6, 0]} />
						<meshStandardMaterial color="#3f8a4f" flatShading />
					</mesh>
				))}
				<Pepohonan />
				<Bendera />
			</group>
			<PondasiTeras />
			<Kanopi daftarDinding={daftarDinding} />
		</group>
	);
}
