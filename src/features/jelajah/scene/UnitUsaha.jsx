import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, MeshStandardMaterial } from "three";
import { UKURAN_PETAK } from "./kebunDesaData";
import { risikoGali } from "../kebun";

/*
 * Unit usaha selain bertani, sebesar satu petak: kolam ikan, kandang kambing,
 * pos wisata, meja produksi, dan galian. Tiap unit menggambarkan tahap
 * liar → gembur (siap diisi) → tanam (berjalan) → siap → layu.
 */

const U = UKURAN_PETAK;
const acak = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const bahan = (color, o = {}) => new MeshStandardMaterial({ color, roughness: 0.9, ...o });
const B = {
	bata: bahan("#a8a29e"), semen: bahan("#78716c"), tanah: bahan("#7c5a35"), lumut: bahan("#5f7f3a", { roughness: 0.6 }), keruh: bahan("#6b6f3a", { roughness: 0.4 }),
	kayu: bahan("#8b5e34"), kayuTua: bahan("#5b3a1f"), bambu: bahan("#c9a95a"), atap: bahan("#7c2d12"), jerami: bahan("#d6b56a"), rumput: bahan("#5f8f34"), semak: bahan("#3f7d2a", { flatShading: true }),
	batu: bahan("#8b8b83", { flatShading: true }), batuTua: bahan("#57534e", { flatShading: true }), gelap: bahan("#1c1917"), putih: bahan("#f8fafc"), kardus: bahan("#b08a5a"),
	susu: bahan("#fefce8"), kain: bahan("#ef4444"), besi: bahan("#94a3b8", { metalness: 0.5, roughness: 0.4 }),
};

// ---------------------------------------------------------------- kolam

function Ikan({ warna, i, n, besar, siap }) {
	const ref = useRef([]);
	const data = useMemo(() => Array.from({ length: n }, (_, j) => ({ r: 0.35 + acak(i * 9 + j) * 0.95, f: acak(j * 3 + i) * 6.28, v: 0.5 + acak(j + i) * 0.7 })), [n, i]);
	const b = useMemo(() => (Array.isArray(warna) ? warna : [warna]).map((c) => bahan(c, { roughness: 0.5 })), [warna]);
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		data.forEach((d, j) => {
			const g = ref.current[j];
			if (!g) return;
			const a = t * d.v + d.f;
			const loncat = siap ? Math.max(0, Math.sin(t * 1.6 + d.f * 3) - 0.86) * 4.2 : 0;
			g.position.set(Math.cos(a) * d.r, 0.34 + loncat, Math.sin(a) * d.r);
			g.rotation.y = -a;
		});
	});
	return data.map((d, j) => (
		<group key={j} ref={(r) => (ref.current[j] = r)} scale={besar}>
			<mesh material={b[j % b.length]} scale={[1, 0.8, 2]}><sphereGeometry args={[0.07, 7, 5]} /></mesh>
			<mesh material={b[j % b.length]} position-x={0.15} rotation-z={-Math.PI / 2}><coneGeometry args={[0.05, 0.1, 4]} /></mesh>
		</group>
	));
}

function Kolam({ k, p, i }) {
	const air = useMemo(() => bahan("#4f8fa6", { roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.75 }), []);
	air.opacity = 0.5 + Math.min(1, p.air) * 0.35;
	const ada = p.tahap === "tanam" || p.tahap === "siap";
	const siap = p.tahap === "siap";
	const warna = k.nama === "Ikan hias" ? ["#f97316", "#fde047", "#ef4444", "#f8fafc"] : k.buah;
	const n = 3 + Math.round(p.tumbuh * 5);
	return (
		<group>
			<mesh material={B.tanah} position-y={0.02}><boxGeometry args={[U, 0.04, U]} /></mesh>
			{[[0, U / 2], [0, -U / 2], [U / 2, 0], [-U / 2, 0]].map(([x, z]) => (
				<mesh key={`${x},${z}`} material={B.bata} position={[x, 0.24, z]} castShadow receiveShadow><boxGeometry args={[x ? 0.26 : U + 0.26, 0.48, z ? 0.26 : U + 0.26]} /></mesh>
			))}
			{p.tahap === "liar" && <mesh material={B.lumut} position-y={0.3} rotation-x={-Math.PI / 2}><planeGeometry args={[U - 0.2, U - 0.2]} /></mesh>}
			{p.tahap === "liar" && Array.from({ length: 7 }, (_, j) => <mesh key={j} material={B.semak} position={[(acak(i + j) - 0.5) * 2.6, 0.5, (acak(i * 3 + j) - 0.5) * 2.6]}><coneGeometry args={[0.09, 0.6, 4]} /></mesh>)}
			{p.tahap === "gembur" && <mesh material={B.semen} position-y={0.06} rotation-x={-Math.PI / 2}><planeGeometry args={[U - 0.2, U - 0.2]} /></mesh>}
			{ada && <mesh material={air} position-y={0.34} rotation-x={-Math.PI / 2}><planeGeometry args={[U - 0.2, U - 0.2]} /></mesh>}
			{ada && <Ikan warna={warna} i={i} n={n} besar={0.8 + p.tumbuh * 1.3} siap={siap} />}
			{p.tahap === "layu" && <mesh material={B.keruh} position-y={0.3} rotation-x={-Math.PI / 2}><planeGeometry args={[U - 0.2, U - 0.2]} /></mesh>}
		</group>
	);
}

// ---------------------------------------------------------------- kandang

function Kambing({ s, rebah }) {
	const kepala = useRef();
	useFrame(({ clock }) => { if (kepala.current) kepala.current.rotation.x = 0.2 + Math.max(0, Math.sin(clock.elapsedTime * 1.3)) * 0.5; });
	return (
		<group scale={s} rotation-z={rebah ? 1.4 : 0} position-y={rebah ? 0.1 : 0}>
			<mesh material={B.putih} position-y={0.62} castShadow scale={[0.8, 0.85, 1.5]}><sphereGeometry args={[0.32, 9, 7]} /></mesh>
			<group ref={kepala} position={[0, 0.82, 0.52]}>
				<mesh material={B.putih} position-z={0.13} scale={[0.75, 0.8, 1.3]}><sphereGeometry args={[0.16, 8, 6]} /></mesh>
				{/* telinga panjang kambing PE */}
				{[-1, 1].map((d) => <mesh key={d} material={B.kardus} position={[d * 0.15, -0.14, 0.08]} rotation-z={d * 0.25}><boxGeometry args={[0.06, 0.32, 0.1]} /></mesh>)}
				{[-1, 1].map((d) => <mesh key={d} material={B.batuTua} position={[d * 0.06, 0.15, 0]} rotation-x={-0.6}><coneGeometry args={[0.025, 0.16, 4]} /></mesh>)}
			</group>
			{[[-0.17, 0.3], [0.17, 0.3], [-0.17, -0.3], [0.17, -0.3]].map(([x, z]) => <mesh key={`${x}${z}`} material={B.putih} position={[x, 0.2, z]}><boxGeometry args={[0.08, 0.42, 0.08]} /></mesh>)}
		</group>
	);
}

function Kandang({ p, i }) {
	const ada = p.tahap === "tanam" || p.tahap === "siap";
	const h = U / 2 - 0.1;
	return (
		<group>
			<mesh material={p.tahap === "liar" ? B.tanah : B.kayu} position-y={0.14} receiveShadow castShadow><boxGeometry args={[U, 0.28, U]} /></mesh>
			{[[-h, -h], [h, -h], [-h, h], [h, h]].map(([x, z]) => <mesh key={`${x}${z}`} material={B.bambu} position={[x, 1.2, z]}><cylinderGeometry args={[0.06, 0.07, 2.4, 6]} /></mesh>)}
			{[0.6, 0.95].map((y) => [[0, h], [0, -h], [h, 0]].map(([x, z]) => (
				<mesh key={`${y}${x}${z}`} material={B.bambu} position={[x, y, z]}><boxGeometry args={[x ? 0.05 : U, 0.05, z ? 0.05 : U]} /></mesh>
			)))}
			<mesh material={B.atap} position-y={2.55} rotation-x={0.14} castShadow><boxGeometry args={[U + 0.5, 0.08, U + 0.5]} /></mesh>
			{(p.tahap === "liar" || p.tahap === "layu") && Array.from({ length: 8 }, (_, j) => (
				<mesh key={j} material={B.jerami} position={[(acak(i + j) - 0.5) * 2.4, 0.34, (acak(i * 5 + j) - 0.5) * 2.4]} rotation-y={j}><boxGeometry args={[0.6, 0.08, 0.14]} /></mesh>
			))}
			{/* palungan: isi mengikuti banyaknya pakan */}
			<mesh material={B.kayuTua} position={[-h + 0.35, 0.42, 0]}><boxGeometry args={[0.5, 0.26, 2.2]} /></mesh>
			{ada && p.air > 0.05 && <mesh material={B.rumput} position={[-h + 0.35, 0.5 + p.air * 0.08, 0]} scale={[1, 0.3 + p.air * 0.7, 1]}><boxGeometry args={[0.4, 0.14, 2.05]} /></mesh>}
			{ada && <group position={[0.2, 0.28, 0]} rotation-y={-1.2}><Kambing s={0.7 + p.tumbuh * 0.5} /></group>}
			{p.tahap === "layu" && <group position={[0.2, 0.28, 0]}><Kambing s={0.8} rebah /></group>}
			{p.tahap === "siap" && (
				<group position={[0.9, 0.28, 1]}>
					<mesh material={B.besi} position-y={0.2}><cylinderGeometry args={[0.2, 0.16, 0.4, 10]} /></mesh>
					<mesh material={B.susu} position-y={0.4}><cylinderGeometry args={[0.18, 0.18, 0.02, 10]} /></mesh>
				</group>
			)}
		</group>
	);
}

// ---------------------------------------------------------------- pos wisata

function Pengunjung({ n, i, warna }) {
	return Array.from({ length: n }, (_, j) => {
		const a = j * 1.26 + i;
		return (
			<group key={j} position={[Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05]}>
				<mesh position-y={0.55} castShadow><capsuleGeometry args={[0.14, 0.5, 3, 7]} /><meshStandardMaterial color={warna[j % warna.length]} /></mesh>
				<mesh position-y={1.08}><sphereGeometry args={[0.13, 8, 6]} /><meshStandardMaterial color="#e0b48a" /></mesh>
			</group>
		);
	});
}

function HiasanSpot({ varian }) {
	if (varian === "curug") {
		return (
			<group position={[0, 0, -1]}>
				<mesh material={B.batu} position-y={0.75} scale={[1.2, 1, 0.6]} castShadow><dodecahedronGeometry args={[0.85, 0]} /></mesh>
				<mesh position={[0, 0.75, 0.5]}><planeGeometry args={[0.55, 1.45]} /><meshStandardMaterial color="#bae6fd" transparent opacity={0.85} side={DoubleSide} /></mesh>
				<mesh position={[0, 0.07, 0.8]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.65, 16]} /><meshStandardMaterial color="#38bdf8" roughness={0.1} /></mesh>
			</group>
		);
	}
	if (varian === "danau") {
		return (
			<group position={[0, 0, -0.6]}>
				<mesh position-y={0.06} rotation-x={-Math.PI / 2}><circleGeometry args={[1, 18]} /><meshStandardMaterial color="#0ea5e9" roughness={0.1} metalness={0.2} /></mesh>
				<mesh material={B.kayu} position-y={0.18} scale={[0.5, 0.25, 1.3]}><sphereGeometry args={[0.5, 8, 6]} /></mesh>
			</group>
		);
	}
	if (varian === "teh") {
		return [-0.9, 0, 0.9].map((x) => <mesh key={x} material={B.semak} position={[x, 0.3, -0.9]} scale={[0.7, 0.6, 1.6]}><sphereGeometry args={[0.5, 8, 6]} /></mesh>);
	}
	return (
		<group position={[0, 0, -0.9]}>
			<mesh material={B.kain} position-y={0.45} rotation-y={Math.PI / 4}><coneGeometry args={[0.8, 0.9, 4]} /></mesh>
			<mesh material={B.batu} position={[1, 0.25, 0]}><dodecahedronGeometry args={[0.32, 0]} /></mesh>
		</group>
	);
}

function PosWisata({ k, p, i }) {
	const ada = p.tahap === "tanam" || p.tahap === "siap";
	const n = p.tahap === "siap" ? 5 : Math.floor(p.tumbuh * 4);
	return (
		<group>
			<mesh material={p.tahap === "liar" ? B.rumput : B.bata} position-y={0.04} receiveShadow><boxGeometry args={[U, 0.08, U]} /></mesh>
			{p.tahap === "liar" && Array.from({ length: 6 }, (_, j) => <mesh key={j} material={B.semak} position={[(acak(i + j) - 0.5) * 2.6, 0.35, (acak(i * 3 + j) - 0.5) * 2.6]}><icosahedronGeometry args={[0.36, 0]} /></mesh>)}
			{p.tahap !== "liar" && <HiasanSpot varian={k.varian} />}
			{p.tahap !== "liar" && (
				<group position={[1.35, 0, 1.35]}>
					<mesh material={B.kayu} position-y={0.65}><boxGeometry args={[0.08, 1.3, 0.08]} /></mesh>
					<mesh material={p.tahap === "layu" ? B.batuTua : B.putih} position-y={1.2} rotation-z={p.tahap === "layu" ? 0.4 : 0}><boxGeometry args={[0.72, 0.42, 0.05]} /></mesh>
				</group>
			)}
			{ada && <Pengunjung n={n} i={i} warna={["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#ec4899"]} />}
			{p.tahap === "siap" && (
				<group position={[-1.3, 0, 1.2]}>
					<mesh material={B.besi} position-y={1}><cylinderGeometry args={[0.025, 0.025, 2, 5]} /></mesh>
					<mesh material={B.kain} position={[0.22, 1.8, 0]}><boxGeometry args={[0.44, 0.28, 0.02]} /></mesh>
				</group>
			)}
		</group>
	);
}

// ---------------------------------------------------------------- meja produksi

const WARNA_KAOS = ["#3b82f6", "#f8fafc", "#ef4444", "#22c55e"];
function Barang({ varian, n, warna }) {
	return Array.from({ length: n }, (_, j) => {
		const x = (j % 3) * 0.62 - 0.62, z = Math.floor(j / 3) % 2 ? 0.34 : -0.34, y = 1.03 + Math.floor(j / 6) * 0.1;
		if (varian === "sandal") return <mesh key={j} position={[x, y, z]} scale={[1, 1, 2]}><boxGeometry args={[0.32, 0.06, 0.25]} /><meshStandardMaterial color={warna} /></mesh>;
		if (varian === "keripik") return <mesh key={j} position={[x, y + 0.08, z]}><boxGeometry args={[0.36, 0.22, 0.09]} /><meshStandardMaterial color={j % 2 ? "#eab308" : "#dc2626"} /></mesh>;
		return <mesh key={j} position={[x, y, z]}><boxGeometry args={[0.44, 0.09, 0.4]} /><meshStandardMaterial color={WARNA_KAOS[j % 4]} /></mesh>;
	});
}

function MejaProduksi({ k, p, i }) {
	const ada = p.tahap === "tanam" || p.tahap === "siap";
	const n = p.tahap === "siap" ? 12 : Math.ceil(p.tumbuh * 11);
	const h = 1.1;
	return (
		<group>
			<mesh material={B.semen} position-y={0.03} receiveShadow><boxGeometry args={[U, 0.06, U]} /></mesh>
			<mesh material={B.kayu} position-y={0.97} castShadow><boxGeometry args={[2.3, 0.08, 1.5]} /></mesh>
			{[[-h, -0.65], [h, -0.65], [-h, 0.65], [h, 0.65]].map(([x, z]) => <mesh key={`${x}${z}`} material={B.kayuTua} position={[x, 0.47, z]}><boxGeometry args={[0.09, 0.94, 0.09]} /></mesh>)}
			<mesh material={B.kayuTua} position={[0, 0.3, 1.25]}><cylinderGeometry args={[0.22, 0.22, 0.6, 9]} /></mesh>
			{p.tahap === "liar" && Array.from({ length: 5 }, (_, j) => <mesh key={j} material={B.kardus} position={[(acak(i + j) - 0.5) * 2, 1.14, (acak(i * 2 + j) - 0.5) * 1.1]} rotation-y={j}><boxGeometry args={[0.4, 0.3, 0.34]} /></mesh>)}
			{p.tahap === "layu" && Array.from({ length: 7 }, (_, j) => <mesh key={j} material={B.batuTua} position={[(acak(i + j) - 0.5) * 2, 1.05, (acak(i * 2 + j) - 0.5) * 1.1]} rotation-y={j}><boxGeometry args={[0.3, 0.06, 0.2]} /></mesh>)}
			{ada && k.varian === "garmen" && (
				<group position={[0, 1.02, -0.5]}>
					<mesh material={B.besi} position-y={0.18}><boxGeometry args={[0.7, 0.32, 0.3]} /></mesh>
					<mesh material={B.gelap} position={[0.25, 0.08, 0]}><boxGeometry args={[0.1, 0.14, 0.12]} /></mesh>
				</group>
			)}
			{ada && <Barang varian={k.varian} n={n} warna={k.buah} />}
			{p.tahap === "siap" && [[1.3, -1.1], [1.3, -0.5], [0.75, -1.1]].map(([x, z]) => <mesh key={`${x}${z}`} material={B.kardus} position={[x, 0.3, z]} castShadow><boxGeometry args={[0.5, 0.5, 0.5]} /></mesh>)}
		</group>
	);
}

// ---------------------------------------------------------------- galian

function Galian({ k, p, i }) {
	const ada = p.tahap === "tanam" || p.tahap === "siap";
	const bijih = useMemo(() => bahan(k.buah, { metalness: k.varian === "emas" ? 0.6 : 0, roughness: k.varian === "emas" ? 0.35 : 0.9, flatShading: true }), [k]);
	const tumpuk = p.tahap === "siap" ? Math.min(30, 12 + (p.dalam || 0) * 6) : Math.floor(p.tumbuh * 10);
	return (
		<group>
			<mesh material={B.tanah} position-y={0.03} receiveShadow><boxGeometry args={[U, 0.06, U]} /></mesh>
			{p.tahap === "liar" && <mesh material={B.batu} position-y={0.8} scale={[1.5, 1, 1.4]} castShadow><dodecahedronGeometry args={[0.95, 0]} /></mesh>}
			{p.tahap === "layu" && Array.from({ length: 8 }, (_, j) => <mesh key={j} material={B.batuTua} position={[(acak(i + j) - 0.5) * 2.4, 0.22, (acak(i * 3 + j) - 0.5) * 2.4]} scale={0.7 + acak(j) * 0.7}><dodecahedronGeometry args={[0.3, 0]} /></mesh>)}
			{(p.tahap === "gembur" || ada) && (
				<group>
					<mesh material={B.gelap} position-y={0.07} rotation-x={-Math.PI / 2}><circleGeometry args={[1.05, 16]} /></mesh>
					{Array.from({ length: 10 }, (_, j) => { const a = (j / 10) * 6.28; return <mesh key={j} material={B.batu} position={[Math.cos(a) * 1.25, 0.14, Math.sin(a) * 1.25]} scale={0.8 + acak(j + i) * 0.4}><dodecahedronGeometry args={[0.22, 0]} /></mesh>; })}
				</group>
			)}
			{ada && (
				<group>
					{[-1, 1].map((s) => <mesh key={s} material={B.kayuTua} position={[s * 1.05, 0.85, 0]}><boxGeometry args={[0.14, 1.7, 0.14]} /></mesh>)}
					<mesh material={B.kayuTua} position-y={1.72}><boxGeometry args={[2.4, 0.16, 0.16]} /></mesh>
					<mesh material={B.besi} position-y={1.1}><cylinderGeometry args={[0.012, 0.012, 1.2, 4]} /></mesh>
					<mesh material={B.besi} position-y={0.48}><cylinderGeometry args={[0.16, 0.12, 0.22, 8]} /></mesh>
					{Array.from({ length: tumpuk }, (_, j) => (
						<mesh key={j} material={bijih} position={[1.05 + (j % 3) * 0.2 - 0.2, 0.14 + Math.floor(j / 3) * 0.16, 1 + ((j * 7) % 3) * 0.2 - 0.2]} scale={0.7 + acak(j + i) * 0.5}><dodecahedronGeometry args={[0.15, 0]} /></mesh>
					))}
					{Array.from({ length: Math.min(6, p.dalam || 0) }, (_, j) => {
						const a = j * 1.05 + i;
						return <mesh key={j} material={B.gelap} position={[Math.cos(a) * 1.3, 0.08, Math.sin(a) * 1.3]} rotation-y={-a}><boxGeometry args={[0.7, 0.03, 0.09]} /></mesh>;
					})}
					{p.tahap === "siap" && (
						<mesh position={[-1.05, 1.82, 0]}>
							<sphereGeometry args={[0.1, 8, 6]} />
							<meshStandardMaterial color={risikoGali(p) >= 0.3 ? "#ef4444" : "#22c55e"} emissive={risikoGali(p) >= 0.3 ? "#ef4444" : "#22c55e"} emissiveIntensity={1.4} />
						</mesh>
					)}
				</group>
			)}
		</group>
	);
}

const MODEL = { kolam: Kolam, kandang: Kandang, spot: PosWisata, meja: MejaProduksi, galian: Galian };

export default function UnitUsaha({ k, p, i }) {
	const Model = MODEL[k.model];
	return <Model k={k} p={p} i={i} />;
}
