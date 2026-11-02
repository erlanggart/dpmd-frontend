import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D } from "three";
import { ANAK_TANGGA, FONDASI, GEROBAK_MIE, GEROBAK_PECEL, KURSI_PECEL, KURSI_WARUNG, MEJA_MIE, MEJA_PECEL, PILAR, POHON, PONDASI, SEMAK, TANAH, TERAS, TIANG_BENDERA, WARUNG_MIE, WARUNG_PECEL } from "./layout";
import { teksturPaving } from "./tekstur";
import Papan from "./Papan";
import Gabung from "./Gabung";
import JalanHidup from "./JalanHidup";
import Kawasan from "./Kawasan.jsx";
import Minimarket from "./Minimarket";
import WarungTenda from "./WarungTenda";
import MakananMeja from "./MakananMeja";
import McD from "./McD";
import MalCcm from "./MalCcm";
import Distro from "./Distro";
import Balap from "./Balap";
import PagarDepan from "./PagarDepan";
import Parkiran from "./Parkiran";

// Pohon digambar sebagai InstancedMesh (batang, daun, bak tanam, rumput dalam bak):
// puluhan pohon cukup empat draw call, penting untuk HP kelas menengah.
// Warung tenda di seberang kantor: mie ayam (timur Alfamart) & pecel ayam (barat Koperasi).
const TEMA_MIE = {
	tenda: ["#f97316", "#ea580c"],
	gerobak: "#1d4ed8",
	meja: "#9a6b3f",
	penjual: { seragam: "warga", perempuan: false, kulit: "#b9824f", rambut: "#141010", baju: "#f8fafc", celana: "#334155" },
	papanLatar: "#fef3c7",
	papanGerobak: [
		{ teks: "MIE AYAM", ukuran: 0.2, tebal: true, warna: "#b91c1c", y: 0.36 },
		{ teks: "Pak Kumis · Bakso · Pangsit", ukuran: 0.075, tebal: true, warna: "#1e3a8a", y: 0.78 },
	],
	spanduk: "#b91c1c",
	judul: "🍜 MIE AYAM PAK KUMIS · 🪙 40",
};
const TEMA_PECEL = {
	tenda: ["#2563eb", "#1d4ed8"],
	gerobak: "#f8fafc",
	meja: "#8b5a2b",
	wajan: true,
	penjual: { seragam: "warga", perempuan: true, jilbab: "#7e22ce", kulit: "#c68d5e", rambut: "#1a130d", baju: "#f59e0b", celana: "#3f3f46", rok: true },
	papanLatar: "#ffffff",
	papanGerobak: [
		{ teks: "PECEL AYAM", ukuran: 0.19, tebal: true, warna: "#15803d", y: 0.36 },
		{ teks: "Bude · Lele · Tahu Tempe", ukuran: 0.075, tebal: true, warna: "#b91c1c", y: 0.78 },
	],
	spanduk: "#15803d",
	judul: "🍗 PECEL AYAM BUDE",
	spandukSamping: [
		{ teks: "PECEL AYAM", ukuran: 0.5, tebal: true, warna: "#b91c1c", y: 0.2 },
		{ teks: "BUDE", ukuran: 0.42, tebal: true, warna: "#15803d", y: 0.43 },
		{ teks: "🍗 Ayam · 🐟 Lele · Tahu Tempe", ukuran: 0.2, tebal: true, warna: "#1e3a8a", y: 0.66 },
		{ teks: "Sambal Terasi Mantap! 🌶️", ukuran: 0.17, tebal: true, warna: "#c2410c", y: 0.85 },
	],
};

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

// Halaman kantor berpaving blok, dari belakang gedung sampai trotoar depan; di luar
// itu tanah kawasan (Kawasan.jsx).
const HALAMAN = { x0: -34, x1: 34, z0: -22, z1: 31.3 };

export default function Lingkungan({ daftarDinding }) {
	const h = HALAMAN;
	// satu ubin tekstur = 1,6 m
	const paving = useMemo(() => teksturPaving([(h.x1 - h.x0) / 1.6, (h.z1 - h.z0) / 1.6]), [h]);

	return (
		<group>
			{/* seluruh halaman satu pondasi lebih rendah dari lantai gedung */}
			<group position-y={TANAH}>
				<mesh rotation-x={-Math.PI / 2} position={[(h.x0 + h.x1) / 2, -0.01, (h.z0 + h.z1) / 2]}>
					<planeGeometry args={[h.x1 - h.x0, h.z1 - h.z0]} />
					<meshStandardMaterial map={paving} />
				</mesh>
				<Kawasan daftarDinding={daftarDinding} />
				<Parkiran />
				{/* benda statis dipanggang jadi beberapa draw call saja */}
				<Gabung>
					<PagarDepan />
					{/* semak di depan gedung */}
					{SEMAK.map(([x, z]) => (
						<mesh key={x} position={[x, 0.35, z]}>
							<icosahedronGeometry args={[0.6, 0]} />
							<meshStandardMaterial color="#3f8a4f" flatShading />
						</mesh>
					))}
				</Gabung>
				<Pepohonan />
				<Bendera />
				<JalanHidup />
				<Minimarket daftarDinding={daftarDinding} />
				<WarungTenda w={WARUNG_MIE} g={GEROBAK_MIE} meja={MEJA_MIE} kursi={KURSI_WARUNG} tema={TEMA_MIE} daftarDinding={daftarDinding} />
				<WarungTenda w={WARUNG_PECEL} g={GEROBAK_PECEL} meja={MEJA_PECEL} kursi={KURSI_PECEL} tema={TEMA_PECEL} daftarDinding={daftarDinding} />
				<MakananMeja />
				<McD daftarDinding={daftarDinding} />
				<MalCcm daftarDinding={daftarDinding} />
				<Distro daftarDinding={daftarDinding} />
				<Balap />
			</group>
			<Gabung>
				<PondasiTeras />
			</Gabung>
			<Kanopi daftarDinding={daftarDinding} />
		</group>
	);
}
