import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, MeshStandardMaterial, PointsMaterial } from "three";
import Gabung from "../scene/Gabung";
import Papan from "../scene/Papan";
import { BALAI_BUMDES, BALE_WARUNG, JALAN_NS, WARUNG } from "../scene/kebunDesaData";
import { bangunKec, useBangun } from "../bangunWilayah";
import { malam } from "./desaHidup";

/*
 * Balai BUMDes di kavling 9x9 kecamatan, tumbuh bersama tingkat BUMDes (0-4):
 * kavling kosong, kios, lapak & lampu jalan, kantor dua lantai bertenaga surya,
 * lalu tugu desa dan kembang api tiap malam. Teks hanya pada papan yang menempel
 * di dinding atau bertiang, tidak ada label melayang. Sumbu lokal: +z = depan (jalan).
 */

// atap limas persegi panjang: putar kerucut 4 sisi 45 derajat, lalu skala di grup luar
const LIMAS_R = 3;
const SETENGAH = LIMAS_R / Math.SQRT2;
function AtapLimas({ y, lebar, dalam, tinggi, warna = "#9a3b22" }) {
	return (
		<group position-y={y} scale={[lebar / 2 / SETENGAH, 1, dalam / 2 / SETENGAH]}>
			<mesh rotation-y={Math.PI / 4}>
				<coneGeometry args={[LIMAS_R, tinggi, 4]} />
				<meshStandardMaterial color={warna} flatShading />
			</mesh>
		</group>
	);
}

function Kavling() {
	return (
		<>
			<mesh position-y={0.03}><boxGeometry args={[5.6, 0.06, 7]} /><meshStandardMaterial color="#8b6b45" /></mesh>
			{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
				<mesh key={`${sx}${sz}`} position={[sx * 2.8, 0.3, sz * 3.5]}><boxGeometry args={[0.15, 0.6, 0.15]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
			)))}
			{[-1, 1].map((s) => (
				<group key={s}>
					<mesh position={[0, 0.38, s * 3.5]}><boxGeometry args={[5.6, 0.08, 0.06]} /><meshStandardMaterial color="#a8834a" /></mesh>
					<mesh position={[s * 2.8, 0.38, 0]}><boxGeometry args={[0.06, 0.08, 7]} /><meshStandardMaterial color="#a8834a" /></mesh>
				</group>
			))}
			{[-1.4, 1.4].map((x) => <mesh key={x} position={[x, 0.8, 3.9]}><boxGeometry args={[0.1, 1.6, 0.1]} /><meshStandardMaterial color="#6b4a2b" /></mesh>)}
		</>
	);
}

function Kios({ lv }) {
	const lantai2 = lv >= 3;
	return (
		<>
			{/* halaman */}
			<mesh position-y={0.03}><boxGeometry args={[5.6, 0.06, 7]} /><meshStandardMaterial color="#b8ab8c" /></mesh>
			{lv >= 3 && <mesh position={[0, 0.07, 2.9]}><boxGeometry args={[4.6, 0.04, 2.2]} /><meshStandardMaterial color="#9ca3af" /></mesh>}
			{/* badan kios */}
			<mesh position={[0, 1.4, -0.5]}><boxGeometry args={[5.2, 2.8, 4.4]} /><meshStandardMaterial color="#f3e7c9" /></mesh>
			<mesh position={[0, 0.12, -0.5]}><boxGeometry args={[5.3, 0.24, 4.5]} /><meshStandardMaterial color="#a8a29e" /></mesh>
			{lantai2 && <mesh position={[0, 3.9, -0.5]}><boxGeometry args={[4.2, 2.2, 3.6]} /><meshStandardMaterial color="#efe0b8" /></mesh>}
			{lantai2 && <mesh position={[0, 2.82, -0.5]}><boxGeometry args={[5.4, 0.12, 4.6]} /><meshStandardMaterial color="#78716c" /></mesh>}
			{lantai2 && [-1.2, 1.2].map((x) => (
				<mesh key={x} position={[x, 4.0, 1.32]}><boxGeometry args={[0.9, 0.9, 0.05]} /><meshStandardMaterial color="#7dd3fc" metalness={0.3} roughness={0.2} /></mesh>
			))}
			{lantai2
				? <AtapLimas y={5 + 0.6} lebar={5} dalam={4.4} tinggi={1.2} />
				: <AtapLimas y={2.8 + 0.65} lebar={6.2} dalam={5.4} tinggi={1.3} />}
			{/* pintu & jendela */}
			<mesh position={[0, 1.0, 1.74]}><boxGeometry args={[1.1, 2, 0.1]} /><meshStandardMaterial color="#78350f" /></mesh>
			{[-1.8, 1.8].map((x) => (
				<group key={x} position={[x, 1.6, 1.72]}>
					<mesh><boxGeometry args={[1.1, 1.1, 0.06]} /><meshStandardMaterial color="#78350f" /></mesh>
					<mesh position-z={0.03}><boxGeometry args={[0.9, 0.9, 0.05]} /><meshStandardMaterial color="#7dd3fc" metalness={0.3} roughness={0.2} /></mesh>
				</group>
			))}
			{/* tiang bendera merah-putih di sudut depan */}
			<group position={[3.9, 0, 1.6]}>
				<mesh position-y={2.75}><cylinderGeometry args={[0.04, 0.05, 5.5, 6]} /><meshStandardMaterial color="#d4d4d8" metalness={0.5} /></mesh>
				<mesh position={[0.5, 5.25, 0]}><boxGeometry args={[0.95, 0.26, 0.02]} /><meshStandardMaterial color="#dc2626" /></mesh>
				<mesh position={[0.5, 4.99, 0]}><boxGeometry args={[0.95, 0.26, 0.02]} /><meshStandardMaterial color="#f8fafc" /></mesh>
			</group>
			{lv >= 2 && [-1, 1].map((s) => <Lapak key={s} x={s * 2.9} z={3.0} warna={s < 0 ? "#dc2626" : "#16a34a"} />)}
			{lantai2 && <PanelSurya />}
			{lv >= 4 && <Tugu />}
		</>
	);
}

function Lapak({ x, z, warna }) {
	return (
		<group position={[x, 0, z]}>
			{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
				<mesh key={`${sx}${sz}`} position={[sx * 0.8, 0.95, sz * 0.6]}><boxGeometry args={[0.06, 1.9, 0.06]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
			)))}
			<mesh position={[0, 1.95, 0]} rotation-x={0.12}><boxGeometry args={[1.9, 0.07, 1.5]} /><meshStandardMaterial color={warna} /></mesh>
			<mesh position={[0, 0.5, 0]}><boxGeometry args={[1.5, 0.08, 0.9]} /><meshStandardMaterial color="#a8834a" /></mesh>
			<mesh position={[0, 0.25, 0]}><boxGeometry args={[1.4, 0.5, 0.8]} /><meshStandardMaterial color="#8b5e34" /></mesh>
			{[-0.45, 0, 0.45].map((dx, i) => (
				<mesh key={dx} position={[dx, 0.66, 0]}><boxGeometry args={[0.3, 0.24, 0.3]} /><meshStandardMaterial color={["#facc15", "#fb923c", "#a3e635"][i]} /></mesh>
			))}
		</group>
	);
}

function PanelSurya() {
	return (
		<>
			{[-0.95, 0.95].map((x) => (
				<mesh key={x} position={[x, 5.62, 0.6]} rotation-x={0.5}>
					<boxGeometry args={[1.5, 0.06, 1.0]} />
					<meshStandardMaterial color="#1e3a8a" metalness={0.6} roughness={0.25} />
				</mesh>
			))}
		</>
	);
}

function Tugu() {
	return (
		<group position={[-3.7, 0, 0.4]}>
			<mesh position-y={0.2}><boxGeometry args={[1.1, 0.4, 1.1]} /><meshStandardMaterial color="#a8a29e" /></mesh>
			<mesh position-y={1.9}><cylinderGeometry args={[0.16, 0.3, 3.0, 4]} /><meshStandardMaterial color="#f3e7c9" /></mesh>
			<mesh position-y={3.65}><coneGeometry args={[0.2, 0.5, 4]} /><meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={0.7} /></mesh>
		</group>
	);
}

// lampu di tepi jalan kampung; bohlam menyala mengikuti malam
const TITIK_LAMPU = [-66, -54, -42, -30];
function JalanTerang({ lv }) {
	const bohlam = useMemo(() => new MeshStandardMaterial({ color: "#fef3c7", emissive: "#fde68a", emissiveIntensity: 0.05 }), []);
	useEffect(() => () => bohlam.dispose(), [bohlam]);
	useFrame(() => { bohlam.emissiveIntensity = 0.05 + malam() * 2.2; });
	const titik = TITIK_LAMPU.flatMap((z) => [-1, 1].map((s) => ({ z, s })))
		.filter(({ z, s }) => !(s > 0 && z >= WARUNG.z0 - 1 && z <= BALE_WARUNG.z1 + 1));
	return (
		<Gabung bayangan key={lv}>
			{titik.map(({ z, s }) => (
				<group key={`${z}${s}`} position={[JALAN_NS.x + s * 3.5, 0, z]}>
					<mesh position-y={1.9}><cylinderGeometry args={[0.06, 0.09, 3.8, 6]} /><meshStandardMaterial color="#44403c" /></mesh>
					<mesh position={[-s * 0.35, 3.8, 0]}><boxGeometry args={[0.7, 0.07, 0.07]} /><meshStandardMaterial color="#44403c" /></mesh>
					<mesh position={[-s * 0.7, 3.7, 0]} material={bohlam}><sphereGeometry args={[0.17, 8, 6]} /></mesh>
				</group>
			))}
		</Gabung>
	);
}

// kembang api: 120 titik, satu letusan tiap siklus 3,2 dtk, hanya saat malam
const SIKLUS = 3.2;
const WARNA_API = ["#fde047", "#f472b6", "#60a5fa", "#4ade80"];
function KembangApi() {
	const ref = useRef();
	const { geo, mat, arah } = useMemo(() => {
		const g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(new Float32Array(120 * 3), 3));
		const a = new Float32Array(120 * 3);
		for (let i = 0; i < 120; i++) {
			// arah acak seragam di bola
			const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
			const kuat = 0.55 + Math.random() * 0.45;
			a.set([s * Math.cos(th) * kuat, u * kuat, s * Math.sin(th) * kuat], i * 3);
		}
		const m = new PointsMaterial({ size: 0.5, color: WARNA_API[0], transparent: true, depthWrite: false, blending: AdditiveBlending });
		return { geo: g, mat: m, arah: a };
	}, []);
	useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
	const keadaan = useRef({ siklus: -1, x: 0, y: 20, z: 0 });
	useFrame(({ clock }) => {
		const p = ref.current;
		if (!p) return;
		const nyala = malam() > 0.5;
		p.visible = nyala;
		if (!nyala) return;
		const waktu = clock.elapsedTime;
		const siklus = Math.floor(waktu / SIKLUS);
		const k = keadaan.current;
		if (siklus !== k.siklus) {
			k.siklus = siklus;
			k.x = (Math.random() * 2 - 1) * 12;
			k.y = 16 + Math.random() * 8;
			k.z = (Math.random() * 2 - 1) * 12;
			mat.color = new Color(WARNA_API[Math.floor(Math.random() * WARNA_API.length)]);
		}
		const t = waktu - siklus * SIKLUS;
		const pos = geo.attributes.position.array;
		for (let i = 0; i < 120; i++) {
			pos[i * 3] = k.x + arah[i * 3] * t * 7;
			pos[i * 3 + 1] = k.y + arah[i * 3 + 1] * t * 7 - 2.5 * t * t;
			pos[i * 3 + 2] = k.z + arah[i * 3 + 2] * t * 7;
		}
		geo.attributes.position.needsUpdate = true;
		mat.opacity = Math.max(0, 1 - t / 2.2);
	});
	return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} visible={false} />;
}

export default function BumdesDesa({ kecamatan }) {
	useBangun();
	const { lv, tingkat } = bangunKec(kecamatan);
	const B = BALAI_BUMDES;
	return (
		<>
			<group position={[B.x, 0, B.z]} rotation-y={B.rot}>
				<Gabung bayangan key={lv}>
					{lv === 0 ? <Kavling /> : <Kios lv={lv} />}
				</Gabung>
				{lv === 0 ? (
					<Papan
						posisi={[0, 1.3, 3.9]}
						lebar={2.6}
						tinggi={0.8}
						latar="#78350f"
						aksen="#facc15"
						baris={[
							{ teks: "CALON BUMDES", ukuran: 0.2, tebal: true, warna: "#fde68a", y: 0.42 },
							{ teks: "Dirikan lewat Peta kecamatan", ukuran: 0.1, warna: "#f8fafc", y: 0.7 },
						]}
					/>
				) : (
					<Papan
						posisi={[0, 2.4, 1.73]}
						lebar={3}
						tinggi={0.6}
						latar="#14532d"
						aksen="#facc15"
						diterangi
						baris={[
							{ teks: `BUMDES ${String(kecamatan).toUpperCase()}`, ukuran: 0.17, tebal: true, warna: "#f8fafc", y: 0.4 },
							{ teks: tingkat.nama, ukuran: 0.1, warna: "#fde68a", y: 0.78 },
						]}
					/>
				)}
				{lv >= 4 && <KembangApi />}
			</group>
			{lv >= 2 && <JalanTerang lv={lv} />}
		</>
	);
}
