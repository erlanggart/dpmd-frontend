import { useMemo } from "react";
import { DoubleSide } from "three";
import Gabung from "../scene/Gabung";
import Papan from "../scene/Papan";
import { BATAS_DUNIA, SAWAH, TATA } from "../scene/kebunDesaData";
import Banyak from "./banyak";

/*
 * Pemandangan khas di utara dunia kecamatan, sesuai usahanya: padang gembala,
 * lanskap wisata (curug, danau, kebun teh, gunung), kawasan bengkel & pabrik,
 * dan tebing tambang. Bertani & ikan digambar `Sawah` di LingkunganDesa.
 * Bagian yang padat dipisah pagar: pemain tidak bisa masuk ke sana.
 */

const acak = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lahan = (fn, n) => Array.from({ length: n }, (_, i) => fn(i));

/** pagar pembatas di utara saat `BATAS_DUNIA.z1` diperpendek */
function PagarBatas() {
	const z = BATAS_DUNIA.z1 + 0.6;
	const tiang = useMemo(() => lahan((i) => [-66 + i * 3, 0.55, z, 1], 45), [z]);
	return (
		<group>
			<Banyak titik={tiang}><boxGeometry args={[0.12, 1.1, 0.12]} /><meshStandardMaterial color="#8b5e34" /></Banyak>
			{[0.45, 0.9].map((y) => <mesh key={y} position={[0, y, z]}><boxGeometry args={[134, 0.06, 0.06]} /><meshStandardMaterial color="#a8834a" /></mesh>)}
		</group>
	);
}

function PadangTernak() {
	const z0 = SAWAH.z0;
	const kambing = useMemo(() => lahan((i) => [-54 + acak(i) * 108, 0.5, z0 + 2 + acak(i * 3) * 34, 1, acak(i * 7) * 6], 18), [z0]);
	const jerami = useMemo(() => lahan((i) => [-50 + acak(i * 5) * 100, 0.55, z0 + acak(i * 9) * 36, 1, acak(i) * 6], 12), [z0]);
	const pagar = useMemo(() => lahan((i) => [-60 + (i % 40) * 3, 0.5, z0 - 3 + Math.floor(i / 40) * 40, 1], 80), [z0]);
	return (
		<group>
			<mesh rotation-x={-Math.PI / 2} position={[0, 0.01, z0 + 18]} receiveShadow><planeGeometry args={[124, 44]} /><meshStandardMaterial color="#7fae45" roughness={1} /></mesh>
			<Banyak titik={kambing} warna={["#f8fafc", "#e7e5e4", "#a8a29e", "#57534e"]}><boxGeometry args={[0.5, 0.5, 1]} /><meshStandardMaterial roughness={0.9} /></Banyak>
			<Banyak titik={kambing.map(([x, , z, , r]) => [x + Math.sin(r) * 0.6, 0.72, z + Math.cos(r) * 0.6, 1, r])} warna={["#f8fafc", "#e7e5e4", "#a8a29e", "#57534e"]}><boxGeometry args={[0.32, 0.32, 0.42]} /><meshStandardMaterial roughness={0.9} /></Banyak>
			<Banyak titik={jerami}><cylinderGeometry args={[0.55, 0.55, 1.1, 10]} /><meshStandardMaterial color="#d6b56a" roughness={1} /></Banyak>
			<Banyak titik={pagar}><boxGeometry args={[0.1, 1, 0.1]} /><meshStandardMaterial color="#8b5e34" /></Banyak>
		</group>
	);
}

function Curug() {
	return (
		<group position={[TATA.sisi * 12, 0, BATAS_DUNIA.z1 + 34]}>
			<Gabung bayangan>
				{[[-30, 22, 30], [0, 34, 24], [30, 24, 34], [-58, 16, 26], [58, 18, 26]].map(([x, t, r], i) => (
					<mesh key={i} position={[x, t / 2 - 1, 8]} scale={[1, 1, 0.8]}><dodecahedronGeometry args={[r, 0]} /><meshStandardMaterial color={i % 2 ? "#6b7280" : "#78716c"} flatShading /></mesh>
				))}
			</Gabung>
			<mesh position={[0, 15, -13]}><planeGeometry args={[9, 30]} /><meshStandardMaterial color="#e0f2fe" transparent opacity={0.92} side={DoubleSide} /></mesh>
			<mesh position={[0, 0.08, -17]} rotation-x={-Math.PI / 2}><circleGeometry args={[15, 28]} /><meshStandardMaterial color="#38bdf8" roughness={0.08} metalness={0.25} /></mesh>
			<mesh position={[0, 0.14, -14.5]} rotation-x={-Math.PI / 2}><circleGeometry args={[4.5, 20]} /><meshStandardMaterial color="#f0f9ff" transparent opacity={0.7} /></mesh>
		</group>
	);
}

function Danau() {
	const z = BATAS_DUNIA.z1 + 36;
	const perahu = useMemo(() => lahan((i) => [-36 + i * 15 + acak(i) * 5, 0.32, z - 16 + acak(i * 3) * 22, 1, acak(i * 5) * 6], 6), [z]);
	return (
		<group>
			<mesh position={[0, 0.06, z]} rotation-x={-Math.PI / 2} scale={[1.7, 1, 1]}><circleGeometry args={[34, 40]} /><meshStandardMaterial color="#0ea5e9" roughness={0.06} metalness={0.3} /></mesh>
			<Banyak titik={perahu}><boxGeometry args={[1.3, 0.4, 3.2]} /><meshStandardMaterial color="#b45309" /></Banyak>
			<Gabung bayangan>
				<mesh position={[0, 0.5, BATAS_DUNIA.z1 + 3.4]}><boxGeometry args={[3, 0.2, 7]} /><meshStandardMaterial color="#8b5e34" /></mesh>
			</Gabung>
		</group>
	);
}

function KebunTeh() {
	const z0 = BATAS_DUNIA.z1 + 3;
	const rumpun = useMemo(() => {
		const t = [];
		for (let r = 0; r < 22; r++) for (let c = 0; c < 72; c++) {
			t.push([-68 + c * 1.9 + Math.sin(r * 0.6) * 1.2, 0.1 + r * 0.54, z0 + r * 2.6, 1 + acak(r * 72 + c) * 0.2, 0, 0.55]);
		}
		return t;
	}, [z0]);
	return (
		<group>
			{/* lereng kebun teh yang menanjak */}
			<mesh position={[0, 5, z0 + 26]} rotation-x={-Math.atan2(0.75, 3.6)}><boxGeometry args={[140, 0.6, 60]} /><meshStandardMaterial color="#5e8f33" roughness={1} /></mesh>
			<Banyak titik={rumpun} bayangan={false} warna={["#3f8f35", "#4ca03b", "#357a2c"]}><sphereGeometry args={[1, 7, 5]} /><meshStandardMaterial roughness={0.9} flatShading /></Banyak>
		</group>
	);
}

function Gunung() {
	const z = BATAS_DUNIA.z1 + 44;
	const pinus = useMemo(() => lahan((i) => [-62 + acak(i) * 124, 3.3, BATAS_DUNIA.z1 + 4 + acak(i * 3) * 16, 1 + acak(i * 7) * 0.5], 50), []);
	const tenda = useMemo(() => lahan((i) => [-30 + i * 14, 0.8, BATAS_DUNIA.z1 + 6, 1, 0.7], 5), []);
	return (
		<group>
			<mesh position={[TATA.sisi * 8, 34, z]}><coneGeometry args={[66, 72, 11]} /><meshStandardMaterial color="#4f7a33" flatShading roughness={1} /></mesh>
			<mesh position={[TATA.sisi * 8, 60, z]}><coneGeometry args={[24, 22, 11]} /><meshStandardMaterial color="#78716c" flatShading roughness={1} /></mesh>
			<Banyak titik={pinus} warna={["#285e20", "#2f6b26", "#356f24"]}><coneGeometry args={[1.5, 6.5, 7]} /><meshStandardMaterial roughness={0.9} flatShading /></Banyak>
			<Banyak titik={tenda} warna={["#ef4444", "#f59e0b", "#3b82f6"]}><coneGeometry args={[1.3, 1.6, 4]} /><meshStandardMaterial roughness={0.8} /></Banyak>
		</group>
	);
}

/** kawasan pabrik & bengkel perajin */
function KawasanProduksi({ kecamatan, varian }) {
	const z = BATAS_DUNIA.z1 + 10;
	const besar = varian === "garmen";
	const gedung = useMemo(() => lahan((i) => ({ x: -54 + i * 27, l: 20 + acak(i) * 4, h: besar ? 9 + acak(i * 3) * 3 : 5 + acak(i * 3) * 2 }), 5), [besar]);
	return (
		<group>
			<Gabung bayangan>
				<mesh position={[0, 0.03, z + 12]}><boxGeometry args={[136, 0.06, 36]} /><meshStandardMaterial color="#a8a29e" roughness={1} /></mesh>
				{gedung.map((g, i) => (
					<group key={i} position={[g.x, 0, z + 12]}>
						<mesh position-y={g.h / 2}><boxGeometry args={[g.l, g.h, 18]} /><meshStandardMaterial color={i % 2 ? "#e2e8f0" : "#cbd5e1"} /></mesh>
						{/* atap gerigi */}
						{[-6, 0, 6].map((d) => <mesh key={d} position={[d, g.h + 1, 0]} rotation-z={0.5}><boxGeometry args={[6.4, 0.2, 18]} /><meshStandardMaterial color="#64748b" metalness={0.3} /></mesh>)}
						<mesh position={[0, 1.8, -9.02]}><boxGeometry args={[6, 3.6, 0.1]} /><meshStandardMaterial color="#475569" /></mesh>
						<mesh position={[0, g.h - 0.5, -9.03]}><boxGeometry args={[g.l, 0.5, 0.06]} /><meshStandardMaterial color={i % 2 ? "#2563eb" : "#0f766e"} /></mesh>
						{[-8, -5.4, 5.4, 8].flatMap((dx) => Array.from({ length: Math.floor((g.h - 2) / 2.4) }, (_, r) => (
							<mesh key={`${dx}${r}`} position={[dx, 2 + r * 2.4, -9.03]}><boxGeometry args={[1.7, 1.3, 0.06]} /><meshStandardMaterial color="#334155" metalness={0.4} roughness={0.3} /></mesh>
						)))}
						{[-3.4, 3.4].map((dx) => <mesh key={dx} position={[dx, 0.7, -10]}><boxGeometry args={[1.2, 1.4, 1.2]} /><meshStandardMaterial color="#b08a5a" /></mesh>)}
						{besar && i % 2 === 0 && <mesh position={[g.l / 2 - 2, g.h + 7, 5]}><cylinderGeometry args={[0.8, 1.1, 14, 10]} /><meshStandardMaterial color="#94a3b8" /></mesh>}
					</group>
				))}
			</Gabung>
			<Papan
				posisi={[gedung[2].x, gedung[2].h - 1.4, z + 2.9]}
				rotasi={Math.PI}
				lebar={11}
				tinggi={1.6}
				latar="#1e3a8a"
				aksen="#fde047"
				baris={[
					{ teks: besar ? "KAWASAN INDUSTRI" : "SENTRA PERAJIN", ukuran: 0.2, tebal: true, warna: "#fef9c3", y: 0.36 },
					{ teks: `Kecamatan ${kecamatan}`, ukuran: 0.13, warna: "#bfdbfe", y: 0.72 },
				]}
			/>
		</group>
	);
}

/** tebing tambang: kapur putih berundak, atau mulut terowongan emas di lereng gelap */
function TebingTambang({ varian }) {
	const z = BATAS_DUNIA.z1 + 8;
	const kapur = varian === "kapur";
	const warna = kapur ? ["#f5f5f4", "#d6d3d1", "#c4bfb6"] : ["#57534e", "#44403c", "#3f3f46"];
	// tiap undak dipecah jadi bongkah beda tinggi & kedalaman; garis gelap memisahkan undakan
	const bongkah = useMemo(() => {
		const b = [];
		for (let i = 0; i < 11; i++) for (let s = 0; s < 22; s++) {
			const n = i * 22 + s;
			const h = 2.9 + acak(n) * 0.9;
			b.push({ x: -74 + s * 7 + acak(n * 3) * 1.5, y: (i + 1) * 3.2 - h / 2, z: z + 9 + i * 6.5 + (acak(n * 5) - 0.5) * 1.2, lx: 7 + acak(n * 7) * 2, h, lz: 6.5, w: i % 2 ? Math.floor(acak(n * 11) * 2) + 1 : Math.floor(acak(n * 11) * 2) });
		}
		return b;
	}, [z]);
	const puing = useMemo(() => lahan((i) => { const t = Math.floor(acak(i) * 5); return [-62 + acak(i * 3) * 124, 0.3 + t * 3.2, z + 4.6 + t * 6.5, 0.4 + acak(i * 7) * 0.8, i]; }, 90), [z]);
	return (
		<group>
			<Gabung bayangan>
				<mesh position={[0, 0.03, z + 3]}><boxGeometry args={[136, 0.06, 14]} /><meshStandardMaterial color={kapur ? "#d6d3d1" : "#78716c"} roughness={1} /></mesh>
				{bongkah.map((u, i) => <mesh key={i} position={[u.x, u.y, u.z]}><boxGeometry args={[u.lx, u.h, u.lz]} /><meshStandardMaterial color={warna[u.w]} flatShading roughness={1} /></mesh>)}
				{Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[0, 3.25 + i * 3.2, z + 12.4 + i * 6.5]}><boxGeometry args={[150, 0.3, 0.5]} /><meshStandardMaterial color={kapur ? "#8b857b" : "#1c1917"} roughness={1} /></mesh>)}
				{!kapur && (
					<group position={[TATA.sisi * 10, 0, z + 2.8]}>
						{/* mulut terowongan & rel lori */}
						<mesh position-y={3.1}><boxGeometry args={[6.4, 6.2, 0.6]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
						<mesh position={[0, 2.4, -0.34]}><boxGeometry args={[4.4, 4.6, 0.1]} /><meshStandardMaterial color="#0c0a09" /></mesh>
						{[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 0.08, -5]}><boxGeometry args={[0.1, 0.1, 10]} /><meshStandardMaterial color="#64748b" metalness={0.5} /></mesh>)}
						<mesh position={[0, 0.8, -7]}><boxGeometry args={[1.8, 1, 2.6]} /><meshStandardMaterial color="#b45309" metalness={0.3} /></mesh>
					</group>
				)}
				{kapur && (
					<group position={[TATA.sisi * -18, 0, z + 1]}>
						{/* ekskavator & truk */}
						<mesh position-y={1.4}><boxGeometry args={[3.2, 1.8, 3.4]} /><meshStandardMaterial color="#eab308" /></mesh>
						<mesh position={[2.6, 2.8, 0]} rotation-z={-0.7}><boxGeometry args={[4.2, 0.4, 0.5]} /><meshStandardMaterial color="#ca8a04" /></mesh>
						<mesh position-y={0.42}><boxGeometry args={[4, 0.84, 3.8]} /><meshStandardMaterial color="#1f2937" /></mesh>
					</group>
				)}
			</Gabung>
			<Banyak titik={puing} warna={warna}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={1} flatShading /></Banyak>
		</group>
	);
}

export default function KhasUsaha({ game, varian, kecamatan }) {
	const pagar = BATAS_DUNIA.z1 < 60;
	return (
		<group>
			{pagar && <PagarBatas />}
			{game === "ternak" && <PadangTernak />}
			{varian === "curug" && <Curug />}
			{varian === "danau" && <Danau />}
			{varian === "teh" && <KebunTeh />}
			{varian === "gunung" && <Gunung />}
			{game === "produksi" && <KawasanProduksi kecamatan={kecamatan} varian={varian} />}
			{game === "tambang" && <TebingTambang varian={varian} />}
		</group>
	);
}
