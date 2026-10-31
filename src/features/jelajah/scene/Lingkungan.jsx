import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D } from "three";
import { PILAR, POHON, SEMAK, TIANG_BENDERA } from "./layout";
import { teksturPaving, teksturPavingJalan } from "./tekstur";
import Papan from "./Papan";
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

	return (
		<group ref={grup}>
			{PILAR.map((p) => (
				<mesh key={p.x} position={[p.x, 1.25, p.z]}>
					<boxGeometry args={[0.45, 2.5, 0.45]} />
					<meshStandardMaterial color="#b6cf78" />
				</mesh>
			))}
			<mesh position={[0, 2.85, 13.15]}>
				<boxGeometry args={[7.6, 0.7, 1.6]} />
				<meshStandardMaterial color="#9fb766" />
			</mesh>
			<Papan
				posisi={[0, 2.85, 13.96]}
				lebar={7.5}
				tinggi={0.66}
				latar="#d6e5a3"
				baris={[{ teks: "DINAS PEMBERDAYAAN MASYARAKAT DAN DESA", ukuran: 0.34, tebal: true, warna: "#1d2a1a", y: 0.54 }]}
			/>
		</group>
	);
}

export default function Lingkungan({ daftarDinding }) {
	// Seluruh halaman berpaving blok; satu ubin tekstur = 1,6 m.
	const paving = useMemo(() => teksturPaving([180 / 1.6, 180 / 1.6]), []);
	const pavingJalan = useMemo(() => teksturPavingJalan([4 / 1.6, 25 / 1.6]), []);

	return (
		<group>
			<mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
				<planeGeometry args={[180, 180]} />
				<meshStandardMaterial map={paving} />
			</mesh>
			{/* jalur pejalan kaki berpaving terang dari gerbang menuju parkiran */}
			<mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 35.5]}>
				<planeGeometry args={[4, 25]} />
				<meshStandardMaterial map={pavingJalan} />
			</mesh>
			<Parkiran />
			{/* fondasi gedung */}
			<mesh position={[0, -0.05, -0.5]}>
				<boxGeometry args={[30.6, 0.1, 25.6]} />
				<meshStandardMaterial color="#bfb39b" />
			</mesh>
			{/* semak di depan gedung */}
			{SEMAK.map(([x, z]) => (
				<mesh key={x} position={[x, 0.35, z]}>
					<icosahedronGeometry args={[0.6, 0]} />
					<meshStandardMaterial color="#3f8a4f" flatShading />
				</mesh>
			))}
			<Pepohonan />
			<Bendera />
			<Kanopi daftarDinding={daftarDinding} />
		</group>
	);
}
