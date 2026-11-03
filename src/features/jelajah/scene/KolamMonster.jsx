import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CircleGeometry, MeshBasicMaterial, MeshStandardMaterial, Object3D } from "three";
import { IKAN, pancing } from "../pancing";
import { posisi } from "../jelajahStore";
import { useKolam } from "../kolamMonster";
import Gabung from "./Gabung";
import ModelIkan from "./ModelIkan";
import Papan from "./Papan";
import Tokoh from "./Tokoh";
import { AIR_KOLAM_Y, BANGKU_KOLAM, BIBIR_KOLAM_Y, PAPAN_JUARA_KOLAM, KOLAM_MONSTER as K, LOKET_KOLAM as L, PAGAR_KOLAM as P, TEBAL_DINDING_KOLAM as T, diAirKolam } from "./kolamMonsterData";
import { suasana } from "./suasana";

// Kolam Monster DPMD: kolam beton berbayar di sisi barat kantor. Dinding batu setinggi
// lutut, pagar besi, loket tiket & lomba, pemancing tetap kolam, dan ikan monster yang
// sesekali melompat. Dipasang di grup kawasan (y relatif tanah).

const MONSTER = IKAN.filter((i) => i.kolam);
const detik = () => performance.now() / 1000;
const BAHAN_LAMPU = new MeshStandardMaterial({ color: "#fff7e0", emissive: "#ffd28a", emissiveIntensity: 0 });
const BAHAN_AIR = new MeshStandardMaterial({ color: "#2c6b62", roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.88 });
const GEO_BAYANG = new CircleGeometry(0.5, 12).rotateX(-Math.PI / 2);
const BAHAN_BAYANG = new MeshBasicMaterial({ color: "#0b1f1c", transparent: true, opacity: 0.38, depthWrite: false });
const N_BAYANG = 7;

const CX = (K.x0 + K.x1) / 2;
const CZ = (K.z0 + K.z1) / 2;
const LX = K.x1 - K.x0;
const LZ = K.z1 - K.z0;

// pemancing tetap kolam (lawan lomba galatama), duduk di bangku menghadap air
const PEMANCING = [
	{ ...BANGKU_KOLAM[0], p: { baju: "#0f766e", celana: "#1e3a5f", kulit: "#c68d5e", rambut: "#141010" }, payung: "#ef4444" },
	{ ...BANGKU_KOLAM[1], p: { baju: "#db2777", celana: "#111827", kulit: "#e0b48a", rambut: "#20160f", perempuan: true, jilbab: "#be185d" }, payung: "#f59e0b" },
	{ ...BANGKU_KOLAM[2], p: { baju: "#f8fafc", celana: "#374151", kulit: "#b9824f", rambut: "#141010" }, payung: "#2563eb" },
	{ ...BANGKU_KOLAM[3], p: { baju: "#a16207", celana: "#3f3f46", kulit: "#a8703f", rambut: "#3b2a1a" }, payung: "#16a34a" },
	{ ...BANGKU_KOLAM[4], p: { baju: "#7c3aed", celana: "#164e63", kulit: "#d9ad85", rambut: "#141010", perempuan: true }, payung: "#0ea5e9" },
];
const PENJAGA = { seragam: "warga", kulit: "#c68d5e", baju: "#1f6b50", celana: "#111827", rambut: "#141010", motif: "jaket" };

function Bangunan() {
	// tiang pagar tiap ±2 m di tiga sisi (sisi timur terbuka ke halaman kantor)
	const tiang = [];
	for (let z = P.z0; z <= P.z1 + 0.01; z += (P.z1 - P.z0) / 9) tiang.push([P.x0, z]);
	for (let x = P.x0 + (P.x1 - P.x0) / 7; x <= P.x1 + 0.01; x += (P.x1 - P.x0) / 7) {
		tiang.push([x, P.z0]);
		tiang.push([x, P.z1]);
	}
	const ruas = [
		[P.x0, (P.z0 + P.z1) / 2, 0.06, P.z1 - P.z0],
		[(P.x0 + P.x1) / 2, P.z0, P.x1 - P.x0, 0.06],
		[(P.x0 + P.x1) / 2, P.z1, P.x1 - P.x0, 0.06],
	];
	const dinding = [
		[CX, K.z0 - T / 2, LX + T * 2, T],
		[CX, K.z1 + T / 2, LX + T * 2, T],
		[K.x0 - T / 2, CZ, T, LZ],
		[K.x1 + T / 2, CZ, T, LZ],
	];
	const lantaiX0 = P.x0;
	const lantaiX1 = K.x1 + 2.8;
	return (
		<Gabung>
			{/* lantai paving */}
			<mesh position={[(lantaiX0 + lantaiX1) / 2, 0.015, (P.z0 + P.z1) / 2]}>
				<boxGeometry args={[lantaiX1 - lantaiX0, 0.05, P.z1 - P.z0]} />
				<meshStandardMaterial color="#b9b3a5" roughness={0.95} />
			</mesh>
			{/* dasar kolam (gelap, terlihat samar dari balik air) */}
			<mesh position={[CX, 0.06, CZ]}>
				<boxGeometry args={[LX, 0.04, LZ]} />
				<meshStandardMaterial color="#12302b" roughness={1} />
			</mesh>
			{/* dinding batu & bibir beton */}
			{dinding.map(([x, z, lx, lz], i) => (
				<group key={i}>
					<mesh position={[x, BIBIR_KOLAM_Y / 2 - 0.02, z]}>
						<boxGeometry args={[lx, BIBIR_KOLAM_Y - 0.04, lz]} />
						<meshStandardMaterial color="#7d776c" roughness={0.95} flatShading />
					</mesh>
					<mesh position={[x, BIBIR_KOLAM_Y - 0.02, z]}>
						<boxGeometry args={[lx + 0.08, 0.06, lz + 0.08]} />
						<meshStandardMaterial color="#cfc8b8" roughness={0.9} />
					</mesh>
				</group>
			))}
			{/* pagar besi hijau */}
			{tiang.map(([x, z], i) => (
				<mesh key={i} position={[x, P.tinggi / 2, z]}>
					<boxGeometry args={[0.07, P.tinggi, 0.07]} />
					<meshStandardMaterial color="#24483f" metalness={0.4} roughness={0.5} />
				</mesh>
			))}
			{ruas.map(([x, z, lx, lz], i) =>
				[0.42, P.tinggi - 0.04].map((y) => (
					<mesh key={`${i}:${y}`} position={[x, y, z]}>
						<boxGeometry args={[lx, 0.05, lz]} />
						<meshStandardMaterial color="#2f5d50" metalness={0.4} roughness={0.5} />
					</mesh>
				)),
			)}
			{/* loket: dinding belakang & samping, meja depan menghadap kantor, atap */}
			<group position={[L.x, 0, L.z]}>
				<mesh position={[-L.lx / 2 + 0.06, L.tinggi / 2, 0]}>
					<boxGeometry args={[0.12, L.tinggi, L.lz]} />
					<meshStandardMaterial color="#f1e7d0" />
				</mesh>
				{[-1, 1].map((s) => (
					<mesh key={s} position={[0, L.tinggi / 2, s * (L.lz / 2 - 0.06)]}>
						<boxGeometry args={[L.lx, L.tinggi, 0.12]} />
						<meshStandardMaterial color="#f1e7d0" />
					</mesh>
				))}
				<mesh position={[L.lx / 2 - 0.12, 0.52, 0]}>
					<boxGeometry args={[0.24, 1.04, L.lz - 0.12]} />
					<meshStandardMaterial color="#1f6b50" />
				</mesh>
				<mesh position={[L.lx / 2 - 0.05, 1.07, 0]}>
					<boxGeometry args={[0.45, 0.06, L.lz + 0.05]} />
					<meshStandardMaterial color="#8a5a35" />
				</mesh>
				<mesh position={[0.25, L.tinggi + 0.06, 0]}>
					<boxGeometry args={[L.lx + 1.2, 0.12, L.lz + 0.6]} />
					<meshStandardMaterial color="#b45309" />
				</mesh>
				{/* tiang papan nama */}
				{[-1, 1].map((s) => (
					<mesh key={s} position={[0.5, L.tinggi + 0.45, s * 1.1]}>
						<boxGeometry args={[0.08, 0.7, 0.08]} />
						<meshStandardMaterial color="#3b2a1a" />
					</mesh>
				))}
			</group>
			{/* bangku & payung pemancing tetap */}
			{PEMANCING.map((m, i) => (
				<group key={i} position={[m.x, 0, m.z]} rotation-y={m.rot}>
					<mesh position={[0, 0.22, -0.05]}>
						<boxGeometry args={[0.42, 0.44, 0.36]} />
						<meshStandardMaterial color="#4b5563" />
					</mesh>
					<mesh position={[0.45, 0.2, 0.15]}>
						<boxGeometry args={[0.36, 0.4, 0.3]} />
						<meshStandardMaterial color="#e5e7eb" />
					</mesh>
					<mesh position={[-0.35, 1.1, -0.35]}>
						<cylinderGeometry args={[0.025, 0.025, 2.2, 6]} />
						<meshStandardMaterial color="#d1d5db" metalness={0.5} />
					</mesh>
				</group>
			))}
			{/* papan juara: kaki */}
			{[-0.75, 0.75].map((dz) => (
				<mesh key={dz} position={[PAPAN_JUARA_KOLAM.x, 0.7, PAPAN_JUARA_KOLAM.z + dz]}>
					<boxGeometry args={[0.08, 1.4, 0.08]} />
					<meshStandardMaterial color="#3b2a1a" />
				</mesh>
			))}
		</Gabung>
	);
}

// payung (kerucut berwarna) & joran pemancing tetap: digambar sendiri karena warnanya cerah
function Pemancing() {
	const pelampung = useRef([]);
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		pelampung.current.forEach((m, i) => m && (m.position.y = AIR_KOLAM_Y + 0.03 + Math.sin(t * 2 + i * 1.7) * 0.015));
	});
	return PEMANCING.map((m, i) => {
		const maju = 3.2 + (i % 2) * 0.8;
		return (
			<group key={i}>
				<group position={[m.x + Math.sin(m.rot) * 0.05, 0.02, m.z + Math.cos(m.rot) * 0.05]} rotation-y={m.rot}>
					<Tokoh penampilan={m.p} pose="duduk" aktivitas="menunggu" />
					<mesh position={[-0.35, 2.2, -0.35]} rotation-x={0.12}>
						<coneGeometry args={[1.15, 0.5, 10, 1, true]} />
						<meshStandardMaterial color={m.payung} side={2} roughness={0.8} />
					</mesh>
					{/* joran condong ke air */}
					<mesh position={[0.2, 1.25, 1.35]} rotation-x={1.05}>
						<cylinderGeometry args={[0.008, 0.02, 2.6, 5]} />
						<meshStandardMaterial color="#1f2937" />
					</mesh>
				</group>
				<mesh ref={(el) => (pelampung.current[i] = el)} position={[m.x + Math.sin(m.rot) * maju, AIR_KOLAM_Y, m.z + Math.cos(m.rot) * maju]}>
					<sphereGeometry args={[0.05, 8, 6]} />
					<meshStandardMaterial color="#f97316" />
				</mesh>
			</group>
		);
	});
}

function titikAcak(tepi) {
	for (let i = 0; i < 20; i++) {
		const x = K.x0 + tepi + Math.random() * (LX - tepi * 2);
		const z = K.z0 + tepi + Math.random() * (LZ - tepi * 2);
		if (diAirKolam(x, z, tepi)) return { x, z };
	}
	return { x: CX, z: CZ };
}

// bayangan ikan raksasa di bawah permukaan & monster yang sesekali melompat
function IkanKolam() {
	const bayang = useRef();
	const lompat = useRef();
	const o = useMemo(() => new Object3D(), []);
	const ikan = useMemo(() => Array.from({ length: N_BAYANG }, () => ({ ...titikAcak(1), arah: Math.random() * 6.3, laju: 0.3 + Math.random() * 0.5, besar: 1.4 + Math.random() * 1.6 })), []);
	const lp = useRef({ aktif: false, jeda: 4, t: 0, dur: 1.3, x: 0, z: 0, arah: 0, jenis: 0 });
	const periksa = useRef({ t: 1, dekat: false });

	useLayoutEffect(() => {
		o.scale.set(0, 0, 0);
		o.updateMatrix();
		for (let i = 0; i < N_BAYANG; i++) bayang.current.setMatrixAt(i, o.matrix);
		bayang.current.instanceMatrix.needsUpdate = true;
	}, [o]);

	useFrame(({ clock }, dt) => {
		const t = clock.elapsedTime;
		const pk = periksa.current;
		pk.t += dt;
		if (pk.t > 0.5) {
			pk.t = 0;
			pk.dekat = posisi.lantai === 0 && Math.hypot(posisi.x - CX, posisi.z - CZ) < 70;
		}
		bayang.current.visible = pk.dekat;
		BAHAN_AIR.color.setRGB(0.17 + Math.sin(t * 0.6) * 0.012, 0.42 + Math.sin(t * 0.45) * 0.02, 0.38).multiplyScalar((1 - suasana.malam * 0.6) * (1 - suasana.hujan * 0.2));
		BAHAN_LAMPU.emissiveIntensity = suasana.malam * 2.2;
		if (!pk.dekat && !lp.current.aktif) return;
		ikan.forEach((f, i) => {
			f.arah += Math.sin(t * 0.3 + i * 5) * dt * 0.6;
			const nx = f.x + Math.sin(f.arah) * f.laju * dt;
			const nz = f.z + Math.cos(f.arah) * f.laju * dt;
			if (diAirKolam(nx, nz, 0.9)) {
				f.x = nx;
				f.z = nz;
			} else f.arah += Math.PI * 0.7;
			o.position.set(f.x, AIR_KOLAM_Y - 0.05, f.z);
			o.rotation.set(0, f.arah, 0);
			o.scale.set(f.besar * 0.3, 1, f.besar * (1 + Math.sin(t * 4 + i) * 0.05));
			o.updateMatrix();
			bayang.current.setMatrixAt(i, o.matrix);
		});
		bayang.current.instanceMatrix.needsUpdate = true;

		// monster melompat keluar air: cipratan besar di awal & akhir lompatan
		const l = lp.current;
		if (!l.aktif) {
			l.jeda -= dt;
			if (l.jeda <= 0 && pk.dekat) {
				l.jeda = 7 + Math.random() * 10;
				Object.assign(l, titikAcak(2.2), { aktif: true, t: 0, dur: 1.2 + Math.random() * 0.4, arah: Math.random() * 6.3, jenis: Math.floor(Math.random() * MONSTER.length) });
				pancingCiprat(l.x, l.z, 1.3);
			}
		}
		const m = lompat.current;
		m.visible = l.aktif;
		m.children.forEach((c, j) => (c.visible = j === l.jenis));
		if (l.aktif) {
			l.t += dt;
			const f = l.t / l.dur;
			const maju = (f - 0.5) * 2.4;
			m.position.set(l.x + Math.sin(l.arah) * maju, AIR_KOLAM_Y + Math.sin(f * Math.PI) * 1.5, l.z + Math.cos(l.arah) * maju);
			m.rotation.set(-(f - 0.5) * 2, l.arah, Math.sin(f * 9) * 0.25);
			if (f >= 1) {
				l.aktif = false;
				pancingCiprat(m.position.x, m.position.z, 1.6);
			}
		}
	});

	return (
		<>
			<instancedMesh ref={bayang} args={[GEO_BAYANG, BAHAN_BAYANG, N_BAYANG]} frustumCulled={false} />
			<group ref={lompat} visible={false}>
				{MONSTER.map((ik) => (
					<ModelIkan key={ik.id} ikan={ik} panjang={1.9} />
				))}
			</group>
		</>
	);
}

// cipratan digambar Pancingan.jsx (tinggi airnya mengikuti kolam)
const pancingCiprat = (x, z, besar) => pancing.cipratan.push({ x, z, besar, t0: detik() });

function PapanJuara() {
	const { rekor } = useKolam();
	const babon = rekor.babon ? `${rekor.babon.toLocaleString("id-ID")} kg` : "belum ada";
	return (
		<Papan
			posisi={[PAPAN_JUARA_KOLAM.x + 0.03, 1.45, PAPAN_JUARA_KOLAM.z]}
			rotasi={Math.PI / 2}
			lebar={1.7}
			tinggi={0.95}
			latar="#0f172a"
			aksen="#f59e0b"
			bingkai="#3b2a1a"
			diterangi
			baris={[
				{ teks: "🏆 PAPAN JUARA", ukuran: 0.15, tebal: true, warna: "#fbbf24", y: 0.24 },
				{ teks: `Babon terberatmu: ${babon}`, ukuran: 0.1, warna: "#e2e8f0", y: 0.48 },
				{ teks: `Lomba ${rekor.lomba} · Juara ${rekor.juara} · Podium ${rekor.podium}`, ukuran: 0.09, warna: "#94a3b8", y: 0.7 },
			]}
		/>
	);
}

export default function KolamMonster() {
	return (
		<group name="kolam-monster">
			<Bangunan />
			<mesh position={[CX, AIR_KOLAM_Y, CZ]} rotation-x={-Math.PI / 2} material={BAHAN_AIR} renderOrder={1}>
				<planeGeometry args={[LX, LZ]} />
			</mesh>
			<IkanKolam />
			<Pemancing />
			{/* penjaga loket menghadap halaman kantor */}
			<group position={[L.x - 0.15, 0.05, L.z]} rotation-y={Math.PI / 2}>
				<Tokoh penampilan={PENJAGA} pose="diam" asal={{ x: L.x - 0.15, z: L.z, rot: Math.PI / 2, lantai: 0 }} />
			</group>
			<Papan
				posisi={[L.x + 0.55, L.tinggi + 0.75, L.z]}
				rotasi={Math.PI / 2}
				lebar={2.8}
				tinggi={0.85}
				latar="#f6efe0"
				aksen="#b91c1c"
				bingkai="#3b2a1a"
				diterangi
				baris={[
					{ teks: "🦈 KOLAM MONSTER DPMD", ukuran: 0.24, tebal: true, warna: "#b91c1c", y: 0.36 },
					{ teks: "Tiket 🪙 500 / 10 menit · Lomba Galatama 🏆", ukuran: 0.12, warna: "#3b2a1a", y: 0.66 },
				]}
			/>
			{/* patung ikan raksasa di atas papan nama */}
			<group position={[L.x + 0.55, L.tinggi + 1.45, L.z]}>
				<ModelIkan ikan={MONSTER[1] || MONSTER[0]} panjang={2.2} />
			</group>
			<PapanJuara />
			{/* lampu sudut */}
			{[
				[P.x0 + 0.2, P.z0 + 0.2],
				[P.x0 + 0.2, P.z1 - 0.2],
				[K.x1 + 0.9, P.z0 + 0.2],
				[K.x1 + 0.9, P.z1 - 0.2],
			].map(([x, z], i) => (
				<group key={i} position={[x, 0, z]}>
					<mesh position-y={1.4}>
						<cylinderGeometry args={[0.05, 0.07, 2.8, 6]} />
						<meshStandardMaterial color="#1f2937" />
					</mesh>
					<mesh position-y={2.85} material={BAHAN_LAMPU}>
						<sphereGeometry args={[0.16, 10, 8]} />
					</mesh>
				</group>
			))}
		</group>
	);
}
