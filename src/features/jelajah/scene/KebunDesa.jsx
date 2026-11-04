import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, DoubleSide, MeshStandardMaterial, Object3D } from "three";
import { KOMODITAS, animasiKebun, bersihkanEfek, bintangMutu, jumlahPetakAktif, kebun, punyaAlat, tumbuhkan, useKebun } from "../kebun";
import { adaModelUnit, usahaKini } from "../usahaWilayah";
import UnitUsaha from "./UnitUsaha";
import { bahanAngin } from "../wilayah/angin";
import { pemainWilayah } from "../wilayah/uiWilayah";
import { desa, detakDesa, sasaranKini, useDesa } from "../wilayah/desaHidup";
import { bahanBangunan, teksturTanah } from "../wilayah/tekstur";
import Gabung from "./Gabung";
import Papan from "./Papan";
import {
	GERBANG_KEBUN, GUDANG_KEBUN, HIASAN_KEBUN, JALUR_KEBUN, KEBUN, ORANG_ORANGAN, PAPAN_KEBUN, PENGEPUL_KEBUN, PENYIRAM, PETAK_KEBUN, PIKAP, SAUNG_KEBUN, SUMUR_KEBUN, TRUK, UKURAN_PETAK,
} from "./kebunDesaData";

// Kebun Desa: ladang tempat pemain bertani dengan tokohnya sendiri.

const U = UKURAN_PETAK;
const kering = new Color("#9a7448");
const basah = new Color("#3f2a17");
const B = {
	rumput: new MeshStandardMaterial({ color: "#5f8f34", roughness: 1 }),
	gulma: bahanAngin({ color: "#7a9a32", roughness: 1 }, { kuat: 0.1, tinggi: 0.42 }),
	gulmaTua: bahanAngin({ color: "#56802a", roughness: 1 }, { kuat: 0.1, tinggi: 0.42 }),
	batu: new MeshStandardMaterial({ color: "#8b8b83", roughness: 1, flatShading: true }),
	alur: new MeshStandardMaterial({ color: "#4a3420", roughness: 1 }),
	pematang: new MeshStandardMaterial({ color: "#6b8f3a", roughness: 1 }),
	batang: new MeshStandardMaterial({ color: "#6b4a2b", roughness: 1 }),
	daun: bahanAngin({ color: "#3f7d2a", roughness: 0.9, flatShading: true }, { kuat: 0.08, tinggi: 1.9 }),
	daunMuda: bahanAngin({ color: "#6fae3c", roughness: 0.9, flatShading: true }, { kuat: 0.1, tinggi: 1.1 }),
	pot: new MeshStandardMaterial({ color: "#b45f3c", roughness: 0.9 }),
	hama: new MeshStandardMaterial({ color: "#84cc16", roughness: 0.6 }),
	pipit: new MeshStandardMaterial({ color: "#8a5a35", roughness: 0.9 }),
	pipitKepala: new MeshStandardMaterial({ color: "#5b3a22", roughness: 0.9 }),
	paruh: new MeshStandardMaterial({ color: "#1f2937" }),
	bintang: new MeshStandardMaterial({ color: "#fcd34d", emissive: "#f59e0b", emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.3 }),
	emas: new MeshStandardMaterial({ color: "#fde68a", emissive: "#fbbf24", emissiveIntensity: 1.1, transparent: true, opacity: 0.35, depthWrite: false }),
	airSawah: new MeshStandardMaterial({ color: "#6d9aa3", roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.7 }),
	bambu: new MeshStandardMaterial({ color: "#c9a95a", roughness: 0.9 }),
	kabut: new MeshStandardMaterial({ color: "#e0f2fe", transparent: true, opacity: 0.45, depthWrite: false }),
};
const PENANDA = { air: "#38bdf8", hama: "#ef4444", burung: "#f97316", panen: "#facc15", layu: "#a8a29e" };
// rupa gangguan pertama tiap usaha; gangguan kedua memakai burung kecuali usaha tanpa hewan
const BAHAN_GANGGU = {
	bertani: B.hama,
	ikan: new MeshStandardMaterial({ color: "#f1f5f9", roughness: 0.9 }),
	ternak: new MeshStandardMaterial({ color: "#a16207", roughness: 0.8 }),
	wisata: new MeshStandardMaterial({ color: "#64748b", roughness: 0.7 }),
	produksi: new MeshStandardMaterial({ color: "#f97316", emissive: "#ea580c", emissiveIntensity: 0.8 }),
	tambang: new MeshStandardMaterial({ color: "#78716c", roughness: 1, flatShading: true }),
};
const tanpaHewan = (u) => u.id === "produksi" || u.id === "tambang";
const WARNA_TANAH = { bertani: "#6c9a3c", ikan: "#6c9a3c", ternak: "#7fa34a", wisata: "#6fa84a", produksi: "#a8a29e", tambang: "#a8947a" };
// tempat mengisi ulang wadah selain sumur: warna muatan & bentuknya
const SUMBER = { ikan: ["#c2a26b", "karung"], ternak: ["#a3b34a", "karung"], wisata: ["#2563eb", "kotak"], produksi: ["#b08a5a", "kotak"], tambang: ["#475569", "drum"] };

const kosong = new Object3D();
const acak = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const HIJAU_MUDA = new Color("#8fd35a"), HIJAU = new Color("#4b9a2c"), KUNING = new Color("#cfa53e");
const MALAI_HIJAU = new Color("#b5c75a"), MALAI_EMAS = new Color("#e3b94b");

/** padi: 25 rumpun × 3 helai + malai yang merunduk saat bernas; bergoyang tertiup angin */
function Padi({ tumbuh, siap, i }) {
	const daun = useRef();
	const malai = useRef();
	const bahan = useMemo(() => ({
		daun: bahanAngin({ roughness: 0.85 }, { kuat: 0.16 }),
		malai: bahanAngin({ roughness: 0.75 }, { kuat: 0.12, tinggi: 0.3 }),
	}), []);
	useLayoutEffect(() => {
		const tinggi = 0.14 + tumbuh * 0.92;
		const bernas = Math.max(0, (tumbuh - 0.6) / 0.4);
		let n = 0;
		for (let r = 0; r < 36; r++) {
			const bx = ((r % 6) - 2.5) * 0.52 + (acak(i * 31 + r) - 0.5) * 0.08;
			const bz = (Math.floor(r / 6) - 2.5) * 0.52 + (acak(i * 17 + r * 3) - 0.5) * 0.08;
			for (let j = 0; j < 3; j++) {
				const a = j * 2.1 + r;
				const h = tinggi * (0.82 + j * 0.12);
				kosong.position.set(bx + Math.cos(a) * 0.03, h / 2, bz + Math.sin(a) * 0.03);
				kosong.rotation.set(Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2);
				kosong.scale.set(1, h, 1);
				kosong.updateMatrix();
				daun.current.setMatrixAt(n++, kosong.matrix);
			}
			// malai: muncul di puncak, makin berat makin merunduk
			const s = siap ? 1 : bernas;
			kosong.position.set(bx + 0.05 * s, tinggi * 0.9 - s * 0.04, bz + 0.03);
			kosong.rotation.set(0.25 + s * 0.45, (r * 1.3) % 6.28, 0);
			kosong.scale.set(s < 0.05 ? 0.0001 : 0.6 + s * 0.4, s < 0.05 ? 0.0001 : 0.7 + s * 0.5, s < 0.05 ? 0.0001 : 0.6 + s * 0.4);
			kosong.updateMatrix();
			malai.current.setMatrixAt(r, kosong.matrix);
		}
		daun.current.instanceMatrix.needsUpdate = true;
		malai.current.instanceMatrix.needsUpdate = true;
		bahan.daun.color.copy(HIJAU_MUDA).lerp(HIJAU, Math.min(1, tumbuh * 1.8));
		if (siap) bahan.daun.color.lerp(KUNING, 0.75);
		else if (bernas > 0) bahan.daun.color.lerp(KUNING, bernas * 0.25);
		bahan.malai.color.copy(MALAI_HIJAU).lerp(MALAI_EMAS, siap ? 1 : bernas * 0.5);
	}, [tumbuh, siap, bahan, i]);
	return (
		<group>
			<instancedMesh ref={daun} args={[null, null, 108]} material={bahan.daun} castShadow>
				<coneGeometry args={[0.065, 1, 4]} />
			</instancedMesh>
			<instancedMesh ref={malai} args={[null, null, 36]} material={bahan.malai}>
				<capsuleGeometry args={[0.035, 0.22, 2, 5]} />
			</instancedMesh>
		</group>
	);
}

/** pohon buah (manggis, jeruk, jambu): buah muncul menjelang panen */
function Pohon({ tumbuh, siap, warnaBuah }) {
	const s = 0.35 + tumbuh * 0.65;
	const buah = useMemo(() => new MeshStandardMaterial({ color: warnaBuah, roughness: 0.55 }), [warnaBuah]);
	const nBuah = siap ? 12 : tumbuh > 0.75 ? 5 : 0;
	return (
		<group scale={s}>
			<mesh material={B.batang} position-y={0.7} castShadow><cylinderGeometry args={[0.12, 0.2, 1.4, 7]} /></mesh>
			<mesh material={B.batang} position={[0.25, 1.25, 0]} rotation-z={-0.7}><cylinderGeometry args={[0.05, 0.07, 0.7, 5]} /></mesh>
			<mesh material={B.daun} position-y={1.8} castShadow><icosahedronGeometry args={[0.95, 1]} /></mesh>
			<mesh material={B.daunMuda} position={[0.5, 1.55, 0.3]} castShadow><icosahedronGeometry args={[0.55, 0]} /></mesh>
			<mesh material={B.daun} position={[-0.45, 1.5, -0.25]}><icosahedronGeometry args={[0.5, 0]} /></mesh>
			{Array.from({ length: nBuah }, (_, i) => {
				const a = (i / 12) * Math.PI * 2;
				return <mesh key={i} material={buah} position={[Math.cos(a) * 0.86, 1.35 + (i % 3) * 0.3, Math.sin(a) * 0.86]} scale={siap ? 1 : 0.6} castShadow><sphereGeometry args={[0.13, 8, 6]} /></mesh>;
			})}
		</group>
	);
}

function Pisang({ tumbuh, siap }) {
	const s = 0.35 + tumbuh * 0.65;
	return (
		<group scale={s}>
			<mesh material={B.batang} position-y={0.9} castShadow><cylinderGeometry args={[0.16, 0.22, 1.8, 7]} /></mesh>
			{[0, 1.3, 2.6, 3.9, 5.1].map((a) => (
				<mesh key={a} material={B.daunMuda} position={[Math.cos(a) * 0.5, 1.85, Math.sin(a) * 0.5]} rotation={[0.9 * Math.sin(a), a, 0.9 * Math.cos(a)]} castShadow>
					<boxGeometry args={[0.35, 0.03, 1.2]} />
				</mesh>
			))}
			{siap && (
				<group position={[0.28, 1.35, 0]}>
					{Array.from({ length: 8 }, (_, i) => (
						<mesh key={i} position={[(i % 2) * 0.06, -i * 0.07, (i % 3) * 0.06]} rotation-z={0.5}><capsuleGeometry args={[0.05, 0.22, 3, 6]} /><meshStandardMaterial color="#facc15" /></mesh>
					))}
				</group>
			)}
			{!siap && tumbuh > 0.7 && <mesh position={[0.3, 1.4, 0]}><sphereGeometry args={[0.12, 7, 5]} /><meshStandardMaterial color="#7f1d1d" /></mesh>}
		</group>
	);
}

function Ubi({ tumbuh, siap }) {
	const s = 0.4 + tumbuh * 0.6;
	return (
		<group>
			{Array.from({ length: 9 }, (_, i) => (
				<mesh key={i} material={i % 2 ? B.daun : B.daunMuda} position={[((i % 3) - 1) * 0.95, 0.22 * s, (Math.floor(i / 3) - 1) * 0.95]} scale={s} castShadow><icosahedronGeometry args={[0.36, 0]} /></mesh>
			))}
			{siap && [[-0.5, 0.4], [0.5, -0.3], [0, 0.7], [-0.7, -0.6]].map(([x, z]) => (
				<mesh key={x} position={[x, 0.08, z]} rotation-z={1.2}><capsuleGeometry args={[0.09, 0.22, 3, 6]} /><meshStandardMaterial color="#7c3aed" /></mesh>
			))}
		</group>
	);
}

function Hias({ tumbuh, siap }) {
	const WARNA = ["#ec4899", "#f97316", "#a855f7", "#facc15", "#ef4444", "#f8fafc"];
	return (
		<group>
			{Array.from({ length: 6 }, (_, i) => [((i % 3) - 1) * 0.95, (Math.floor(i / 2) % 2 ? 0.6 : -0.6)]).map(([x, z], i) => (
				<group key={i} position={[x, 0, z]}>
					<mesh material={B.pot} position-y={0.17}><cylinderGeometry args={[0.22, 0.16, 0.34, 8]} /></mesh>
					<mesh material={B.daunMuda} position-y={0.34 + tumbuh * 0.25} scale={0.4 + tumbuh * 0.6}><icosahedronGeometry args={[0.25, 0]} /></mesh>
					{(siap || tumbuh > 0.7) && [0, 1, 2].map((j) => (
						<mesh key={j} position={[Math.cos(j * 2.1) * 0.12, 0.62 + tumbuh * 0.2, Math.sin(j * 2.1) * 0.12]} scale={siap ? 1 : 0.6}><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color={WARNA[(i + j) % WARNA.length]} /></mesh>
					))}
				</group>
			))}
		</group>
	);
}

const TANAMAN = { padi: Padi, pohon: Pohon, pisang: Pisang, ubi: Ubi, hias: Hias };

/** tiga burung pipit yang mematuk-matuk */
function Pipit() {
	const ref = useRef();
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		ref.current?.children.forEach((b, j) => {
			b.position.y = 0.75 + Math.abs(Math.sin(t * 7 + j * 2)) * 0.12;
			b.rotation.x = Math.max(0, Math.sin(t * 9 + j)) * 0.7;
			b.rotation.y = j * 2.1 + Math.sin(t * 2 + j) * 0.6;
		});
	});
	return (
		<group ref={ref}>
			{[[-0.7, 0.4], [0.6, -0.5], [0.1, 0.8], [0.9, 0.6]].map(([x, z]) => (
				<group key={x} position={[x, 0.75, z]}>
					<mesh material={B.pipit} scale={[0.8, 0.75, 1.2]}><sphereGeometry args={[0.09, 7, 5]} /></mesh>
					<mesh material={B.pipitKepala} position={[0, 0.07, 0.09]}><sphereGeometry args={[0.055, 6, 5]} /></mesh>
					<mesh material={B.paruh} position={[0, 0.06, 0.15]} rotation-x={Math.PI / 2}><coneGeometry args={[0.018, 0.05, 4]} /></mesh>
					<mesh material={B.pipitKepala} position={[0, 0.02, -0.12]} rotation-x={-0.5}><boxGeometry args={[0.06, 0.015, 0.1]} /></mesh>
				</group>
			))}
		</group>
	);
}

function Petak({ i, p }) {
	const pk = PETAK_KEBUN[i];
	const k = KOMODITAS[p.k] || KOMODITAS[kebun.komoditas];
	const unit = adaModelUnit(k.model);
	const u = usahaKini();
	const Model = TANAMAN[k.model];
	const padi = k.model === "padi";
	const ditanam = p.tahap === "tanam" || p.tahap === "siap";
	const bahanTanah = useMemo(() => new MeshStandardMaterial({ roughness: 1, map: teksturTanah(1) }), []);
	bahanTanah.color.copy(kering).lerp(basah, ditanam ? Math.min(1, p.air * 1.2) : p.tahap === "gembur" ? 0.45 : 0);
	const bahanAir = useMemo(() => B.airSawah.clone(), []);
	bahanAir.opacity = 0.15 + Math.min(1, p.air) * 0.65;
	const penanda = useRef();
	const hama = useRef();
	const aura = useRef();
	const deretBintang = useRef();
	const tanda = p.burung ? "burung" : p.tahap === "siap" ? "panen" : p.tahap === "layu" ? "layu" : p.tahap === "tanam" ? (p.hama ? "hama" : p.air < 0.55 ? "air" : null) : null;
	const bintang = p.tahap === "siap" ? bintangMutu(p.mutu) : 0;
	useFrame(({ clock, camera }) => {
		const t = clock.elapsedTime + i;
		if (deretBintang.current) deretBintang.current.quaternion.copy(camera.quaternion);
		if (penanda.current) {
			const cepat = tanda === "burung" || tanda === "hama" ? 2.2 : 1;
			penanda.current.position.y = 2.7 + Math.sin(t * 3 * cepat) * 0.14;
			penanda.current.rotation.y = t * 1.5 * cepat;
		}
		if (hama.current) hama.current.children.forEach((c, j) => { c.position.y = 0.32 + Math.abs(Math.sin(t * 6 + j)) * 0.08; c.position.x += Math.sin(t * 2 + j) * 0.002; });
		if (aura.current) { aura.current.rotation.y = t; aura.current.scale.setScalar(1 + Math.sin(t * 4) * 0.08); }
	});
	return (
		<group position={[pk.x, 0, pk.z]}>
			{unit && <UnitUsaha k={k} p={p} i={i} />}
			{/* bedengan / petak sawah */}
			{!unit && <mesh material={p.tahap === "liar" ? B.rumput : bahanTanah} position-y={0.1} receiveShadow castShadow><boxGeometry args={[U, 0.2, U]} /></mesh>}
			{padi && p.tahap !== "liar" && [[0, U / 2], [0, -U / 2], [U / 2, 0], [-U / 2, 0]].map(([x, z]) => (
				<mesh key={`${x},${z}`} material={B.pematang} position={[x, 0.24, z]} receiveShadow><boxGeometry args={[x ? 0.24 : U + 0.24, 0.14, z ? 0.24 : U + 0.24]} /></mesh>
			))}
			{padi && ditanam && <mesh material={bahanAir} position-y={0.215} rotation-x={-Math.PI / 2}><planeGeometry args={[U - 0.1, U - 0.1]} /></mesh>}
			{!unit && p.tahap === "liar" && (
				<>
					{Array.from({ length: 14 }, (_, j) => (
						<mesh key={j} material={j % 3 ? B.gulma : B.gulmaTua} position={[(acak(i * 7 + j) - 0.5) * (U - 0.4), 0.36, (acak(i * 3 + j * 5) - 0.5) * (U - 0.4)]} scale={[1, 0.7 + acak(j + i) * 0.8, 1]}>
							<coneGeometry args={[0.14, 0.42, 4]} />
						</mesh>
					))}
					<mesh material={B.batu} position={[0.9, 0.26, -0.8]} scale={[1, 0.6, 0.8]}><dodecahedronGeometry args={[0.2, 0]} /></mesh>
					<mesh material={B.batu} position={[-1, 0.24, 0.9]} scale={[0.7, 0.5, 1]}><dodecahedronGeometry args={[0.16, 0]} /></mesh>
				</>
			)}
			{!unit && !padi && p.tahap !== "liar" && [-1.1, -0.37, 0.37, 1.1].map((dx) => (
				<mesh key={dx} material={B.alur} position={[dx, 0.21, 0]}><boxGeometry args={[0.22, 0.04, U - 0.3]} /></mesh>
			))}
			{!unit && ditanam && (
				<group position-y={0.2}><Model tumbuh={p.tumbuh} siap={p.tahap === "siap"} warnaBuah={k.buah} i={i} /></group>
			)}
			{!unit && p.tahap === "layu" && Array.from({ length: 7 }, (_, j) => (
				<mesh key={j} position={[((j % 3) - 1) * 0.9, 0.3, (j > 3 ? 0.6 : -0.6)]} rotation-z={0.9 + j * 0.1}><coneGeometry args={[0.08, 0.55, 4]} /><meshStandardMaterial color="#8b7d5b" /></mesh>
			))}
			{p.hama && p.tahap === "tanam" && (
				<group ref={hama}>
					{[[-0.6, 0.5], [0.7, -0.2], [0.1, 0.9], [-0.3, -0.8]].map(([x, z]) => <mesh key={x} material={BAHAN_GANGGU[u.id]} position={[x, 0.32, z]} scale={[1, 0.8, 1.6]}><sphereGeometry args={[0.09, 6, 5]} /></mesh>)}
				</group>
			)}
			{p.burung && !tanpaHewan(u) && <Pipit />}
			{p.burung && tanpaHewan(u) && <mesh position={[0.9, 0.5, 0.9]}><boxGeometry args={[0.55, 0.55, 0.55]} /><meshStandardMaterial color={u.id === "tambang" ? "#38bdf8" : "#dc2626"} /></mesh>}
			{bintang > 0 && (
				<group ref={deretBintang} position-y={2.05}>
					{Array.from({ length: bintang }, (_, j) => <mesh key={j} material={B.bintang} position-x={(j - (bintang - 1) / 2) * 0.42} rotation-y={j}><octahedronGeometry args={[0.15, 0]} /></mesh>)}
				</group>
			)}
			{p.emas && p.tahap === "siap" && (
				<mesh ref={aura} material={B.emas} position-y={0.9}><cylinderGeometry args={[1.9, 1.9, 1.8, 16, 1, true]} /></mesh>
			)}
			{tanda && tanda !== "panen" && (
				<mesh ref={penanda} position-y={2.7} rotation-x={Math.PI}>
					<coneGeometry args={[0.2, 0.42, 4]} />
					<meshStandardMaterial color={PENANDA[tanda]} emissive={PENANDA[tanda]} emissiveIntensity={0.6} />
				</mesh>
			)}
		</group>
	);
}

/** butir air / tanah / bulu / panen dari aksi pemain; aliran air dari gembor */
function EfekAksi() {
	const ref = useRef();
	const N = 110;
	const butir = useRef(Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, umur: 9, w: 0 })));
	const akhir = useRef(null);
	const ke = useRef(0);
	const WARNA = { siram: "#7dd3fc", panen: "#fde047", cangkul: "#6b4a2b", bersih: "#6b4a2b", usir: "#a16207", tanam: "#a3e635", gali: "#78716c" };
	const lempar = (b, x, y, z, vx, vy, vz, w) => Object.assign(b, { x, y, z, vx, vy, vz, umur: 0, w });
	useFrame((_, dtMentah) => {
		const dt = Math.min(0.05, dtMentah);
		const a = animasiKebun();
		const g = ref.current;
		// ledakan hasil panen
		while (kebun.sembur.length) {
			const s = kebun.sembur.pop();
			g.userData.warna = s.warna;
			for (let n = 0; n < s.n; n++) {
				lempar(butir.current[ke.current++ % N], s.x + (Math.random() - 0.5) * 2, 0.5, s.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3.4, 3.6 + Math.random() * 3, (Math.random() - 0.5) * 3.4, 1);
			}
		}
		if (a && a.petak != null) {
			const pk = PETAK_KEBUN[a.petak];
			const u = (performance.now() - a.mulai) / (a.sampai - a.mulai);
			if (a.jenis === "siram" && u > 0.15) {
				// pancuran dari mulut gembor ke tanah di depan
				const fx = Math.sin(pemainWilayah.rot), fz = Math.cos(pemainWilayah.rot);
				for (let n = 0; n < 2; n++) {
					const b = butir.current[ke.current++ % N];
					lempar(b, pemainWilayah.x + fx * 0.85 + (Math.random() - 0.5) * 0.1, 0.95, pemainWilayah.z + fz * 0.85, fx * 1.6 + (Math.random() - 0.5) * 0.5, 0.3, fz * 1.6 + (Math.random() - 0.5) * 0.5, 0);
				}
			} else if (akhir.current !== a.mulai && u > 0.55 && WARNA[a.jenis]) {
				akhir.current = a.mulai;
				for (let n = 0; n < 18; n++) {
					const b = butir.current[ke.current++ % N];
					const naik = a.jenis === "usir" ? 3.5 : a.jenis === "panen" ? 4 : 2.4;
					lempar(b, pk.x + (Math.random() - 0.5) * 1.8, 0.4, pk.z + (Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 2, naik + Math.random() * 1.5, (Math.random() - 0.5) * 2, a.jenis === "panen" ? 1 : 0);
				}
				g.userData.warna = WARNA[a.jenis];
			}
		}
		const kini = a?.jenis === "siram" ? WARNA.siram : g.userData.warna || WARNA.siram;
		butir.current.forEach((b, j) => {
			const m = g.children[j];
			b.umur += dt;
			if (b.umur > 1.1) { m.visible = false; return; }
			b.vy -= 9 * dt;
			b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
			if (b.y < 0.22) { b.y = 0.22; b.vy *= -0.2; b.vx *= 0.5; b.vz *= 0.5; }
			m.visible = true;
			m.position.set(b.x, b.y, b.z);
			m.scale.setScalar(1 - b.umur * 0.6);
			if (j === 0 || m.material.userData.w !== kini) { m.material.color.set(kini); m.material.userData.w = kini; }
		});
	});
	const bahan = useMemo(() => new MeshStandardMaterial({ color: "#7dd3fc", roughness: 0.3 }), []);
	return (
		<group ref={ref}>
			{butir.current.map((_, j) => <mesh key={j} visible={false} material={bahan}><sphereGeometry args={[0.075, 5, 4]} /></mesh>)}
		</group>
	);
}

/** kawanan pipit yang kabur terbang setelah diusir */
function PipitKabur() {
	const ref = useRef([]);
	useFrame(() => {
		const kini = performance.now();
		for (let e = 0; e < 6; e++) {
			const ev = kebun.terbang[kebun.terbang.length - 1 - e];
			for (let j = 0; j < 4; j++) {
				const m = ref.current[e * 4 + j];
				if (!m) continue;
				const u = ev ? (kini - ev.mulai) / 1600 : 2;
				m.visible = u < 1;
				if (!m.visible) continue;
				const a = j * 1.7 + e;
				m.position.set(ev.x + Math.cos(a) * (0.6 + u * 7), 0.8 + u * u * 9 + Math.sin(u * 30 + j) * 0.15, ev.z + Math.sin(a) * (0.6 + u * 7));
				m.rotation.y = -a;
				m.children[1].rotation.z = Math.sin(kini * 0.06 + j) * 0.9;
				m.children[2].rotation.z = -Math.sin(kini * 0.06 + j) * 0.9;
			}
		}
	});
	return Array.from({ length: 24 }, (_, i) => (
		<group key={i} ref={(r) => (ref.current[i] = r)} visible={false}>
			<mesh material={B.pipit} scale={[0.8, 0.7, 1.2]}><sphereGeometry args={[0.09, 6, 5]} /></mesh>
			<group><mesh material={B.pipitKepala} position-x={0.14}><boxGeometry args={[0.22, 0.015, 0.1]} /></mesh></group>
			<group><mesh material={B.pipitKepala} position-x={-0.14}><boxGeometry args={[0.22, 0.015, 0.1]} /></mesh></group>
		</group>
	));
}

/** pilar cahaya + panah memantul di atas tujuan misi / acara */
function PenandaMisi() {
	const grup = useRef();
	const panah = useRef();
	const tujuan = useRef(null);
	const jeda = useRef(0);
	useFrame(({ clock }, dt) => {
		if ((jeda.current -= dt) <= 0) { jeda.current = 0.25; tujuan.current = sasaranKini(); }
		const t = tujuan.current;
		const g = grup.current;
		const dekat = t && Math.hypot(t.x - pemainWilayah.x, t.z - pemainWilayah.z) < 3.2;
		g.visible = !!t && !dekat;
		if (!g.visible) return;
		g.position.x += (t.x - g.position.x) * Math.min(1, dt * 10);
		g.position.z += (t.z - g.position.z) * Math.min(1, dt * 10);
		panah.current.position.y = 3.4 + Math.sin(clock.elapsedTime * 4) * 0.25;
		panah.current.rotation.y = clock.elapsedTime * 2;
	});
	return (
		<group ref={grup} visible={false}>
			<mesh position-y={14}>
				<cylinderGeometry args={[0.32, 0.5, 28, 12, 1, true]} />
				<meshBasicMaterial color="#fde047" transparent opacity={0.22} depthWrite={false} blending={AdditiveBlending} side={DoubleSide} />
			</mesh>
			<mesh ref={panah} rotation-x={Math.PI}>
				<coneGeometry args={[0.32, 0.6, 4]} />
				<meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={0.9} />
			</mesh>
			<mesh rotation-x={-Math.PI / 2} position-y={0.06}>
				<ringGeometry args={[0.9, 1.15, 28]} />
				<meshBasicMaterial color="#fde047" transparent opacity={0.6} depthWrite={false} />
			</mesh>
		</group>
	);
}

/** truk tengkulak kota saat acara "tengkulak" */
function TrukTengkulak() {
	useDesa();
	if (desa.acara?.jenis !== "tengkulak") return null;
	return (
		<group position={[TRUK.x, 0, TRUK.z]}>
			<mesh position-y={0.85} castShadow><boxGeometry args={[4.6, 0.7, 1.9]} /><meshStandardMaterial color="#dc2626" metalness={0.3} roughness={0.5} /></mesh>
			<mesh position={[-0.6, 1.7, 0]} castShadow><boxGeometry args={[3.2, 1.1, 1.9]} /><meshStandardMaterial color="#f8fafc" /></mesh>
			<mesh position={[1.6, 1.45, 0]} castShadow><boxGeometry args={[1.3, 0.9, 1.8]} /><meshStandardMaterial color="#dc2626" metalness={0.3} roughness={0.5} /></mesh>
			<mesh position={[2.05, 1.55, 0]}><boxGeometry args={[0.5, 0.55, 1.82]} /><meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.2} /></mesh>
			{[[-1.5, 0.95], [-1.5, -0.95], [1.5, 0.95], [1.5, -0.95]].map(([x, z], i) => <mesh key={i} position={[x, 0.38, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.38, 0.38, 0.24, 12]} /><meshStandardMaterial color="#111827" /></mesh>)}
		</group>
	);
}

/** orang-orangan sawah (dibeli di warung): bergoyang, lengan berkibar */
function OrangOrangan() {
	const ref = useRef();
	useFrame(({ clock }) => { ref.current.rotation.z = Math.sin(clock.elapsedTime * 1.4) * 0.05; ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.15; });
	return (
		<group position={[ORANG_ORANGAN.x, 0, ORANG_ORANGAN.z]}>
			<mesh material={B.batang} position-y={1.1}><cylinderGeometry args={[0.05, 0.06, 2.2, 6]} /></mesh>
			<group ref={ref} position-y={1.6}>
				<mesh material={B.batang} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.04, 0.04, 1.8, 5]} /></mesh>
				<mesh position-y={-0.15}><boxGeometry args={[0.6, 0.7, 0.3]} /><meshStandardMaterial color="#b91c1c" roughness={1} /></mesh>
				{[-0.75, 0.75].map((x) => <mesh key={x} position={[x, -0.05, 0]}><boxGeometry args={[0.3, 0.25, 0.25]} /><meshStandardMaterial color="#b91c1c" roughness={1} /></mesh>)}
				{[-0.95, 0.95].map((x) => <mesh key={x} position={[x, -0.15, 0]} rotation-z={x > 0 ? -0.4 : 0.4}><coneGeometry args={[0.08, 0.35, 5]} /><meshStandardMaterial color="#e3c26a" /></mesh>)}
				<mesh position-y={0.42}><sphereGeometry args={[0.2, 10, 8]} /><meshStandardMaterial color="#e9d5a1" /></mesh>
				<mesh position-y={0.58}><coneGeometry args={[0.42, 0.22, 14, 1, true]} /><meshStandardMaterial color="#d6b56a" side={2} /></mesh>
				{[-0.07, 0.07].map((x) => <mesh key={x} position={[x, 0.45, 0.18]}><sphereGeometry args={[0.03, 5, 4]} /><meshStandardMaterial color="#111" /></mesh>)}
			</group>
		</group>
	);
}

/** penyiram bambu otomatis di sela petak; kabut air saat menyemprot */
function Penyiram() {
	useKebun();
	const kabut = useRef([]);
	useFrame(({ clock }) => {
		const nyala = performance.now() < kebun.semprot;
		kabut.current.forEach((m, i) => {
			if (!m) return;
			m.visible = nyala;
			m.rotation.y = clock.elapsedTime * 3 + i;
			m.scale.setScalar(0.8 + Math.sin(clock.elapsedTime * 8 + i) * 0.1);
		});
	});
	return PENYIRAM.map(([x, z], i) => (
		<group key={i} position={[x, 0, z]}>
			<mesh material={B.bambu} position-y={0.6}><cylinderGeometry args={[0.06, 0.06, 1.2, 6]} /></mesh>
			<mesh material={B.bambu} position-y={1.22}><cylinderGeometry args={[0.1, 0.08, 0.12, 8]} /></mesh>
			<mesh ref={(r) => (kabut.current[i] = r)} material={B.kabut} position-y={1.15} visible={false}>
				<coneGeometry args={[2.6, 1.1, 12, 1, true]} />
			</mesh>
		</group>
	));
}

/** rak terbuka tempat mengisi wadah di usaha selain bertani (di posisi sumur) */
function TempatIsiUlang() {
	const [warna, bentuk] = SUMBER[usahaKini().id];
	const muatan = [[-0.42, -0.25], [0.42, -0.25], [0, 0.32]];
	return (
		<group position={[SUMUR_KEBUN.x, 0, SUMUR_KEBUN.z]}>
			<mesh position-y={0.06}><boxGeometry args={[1.9, 0.12, 1.7]} /><meshStandardMaterial color="#8b5e34" /></mesh>
			{[[-0.88, -0.78], [0.88, -0.78], [-0.88, 0.78], [0.88, 0.78]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 1.15, z]}><boxGeometry args={[0.09, 2.3, 0.09]} /><meshStandardMaterial color="#6b4a2b" /></mesh>)}
			<mesh position-y={2.5} rotation-y={Math.PI / 4}><coneGeometry args={[1.55, 0.6, 4]} /><meshStandardMaterial color="#7c4a2b" /></mesh>
			{muatan.map(([x, z], i) => (
				<mesh key={i} position={[x, bentuk === "karung" ? 0.42 : 0.44, z]} scale={bentuk === "karung" ? [1, 1.15, 0.85] : 1}>
					{bentuk === "karung" ? <sphereGeometry args={[0.34, 9, 7]} /> : bentuk === "drum" ? <cylinderGeometry args={[0.28, 0.28, 0.66, 12]} /> : <boxGeometry args={[0.56, 0.62, 0.5]} />}
					<meshStandardMaterial color={warna} roughness={0.9} />
				</mesh>
			))}
		</group>
	);
}

function Bangunan() {
	const S = SAUNG_KEBUN, G = GUDANG_KEBUN, P = PENGEPUL_KEBUN;
	const tiangPagar = [];
	for (let x = KEBUN.x0; x <= KEBUN.x1; x += 2) {
		if (Math.abs(x - GERBANG_KEBUN.x) > GERBANG_KEBUN.lebar / 2) tiangPagar.push([x, KEBUN.z0]);
		tiangPagar.push([x, KEBUN.z1]);
	}
	for (let z = KEBUN.z0 + 2; z < KEBUN.z1; z += 2) { tiangPagar.push([KEBUN.x0, z]); tiangPagar.push([KEBUN.x1, z]); }
	const bambu = "#c9a95a";
	const sisiSelatan = [[KEBUN.x0, GERBANG_KEBUN.x - GERBANG_KEBUN.lebar / 2], [GERBANG_KEBUN.x + GERBANG_KEBUN.lebar / 2, KEBUN.x1]];
	const bunga = ["#f472b6", "#facc15", "#f97316", "#f8fafc", "#a855f7"];
	const pusatS = { x: (S.x0 + S.x1) / 2, z: (S.z0 + S.z1) / 2 };
	const { kompos, gerobak, pisang } = HIASAN_KEBUN;
	return (
		<Gabung bayangan tekstur>
			{/* rumput kebun & jalan setapak tanah */}
			<mesh position={[(KEBUN.x0 + KEBUN.x1) / 2, 0.01, (KEBUN.z0 + KEBUN.z1) / 2]} rotation-x={-Math.PI / 2}>
				<planeGeometry args={[KEBUN.x1 - KEBUN.x0, KEBUN.z1 - KEBUN.z0]} />
				<meshStandardMaterial color={WARNA_TANAH[usahaKini().id]} roughness={1} />
			</mesh>
			{JALUR_KEBUN.map((j, i) => <mesh key={i} position={[j.x, 0.02, j.z]} rotation-x={-Math.PI / 2}><planeGeometry args={[j.lx, j.lz]} /><meshStandardMaterial color="#a98a59" roughness={1} /></mesh>)}
			{/* pagar bambu */}
			{tiangPagar.map(([x, z]) => (
				<mesh key={`${x},${z}`} position={[x, 0.5, z]}><cylinderGeometry args={[0.06, 0.07, 1, 6]} /><meshStandardMaterial color={bambu} /></mesh>
			))}
			{[0.35, 0.72].map((h) => (
				<group key={h}>
					{sisiSelatan.map(([a, b]) => <mesh key={a} position={[(a + b) / 2, h, KEBUN.z0]}><boxGeometry args={[b - a, 0.05, 0.05]} /><meshStandardMaterial color={bambu} /></mesh>)}
					<mesh position={[(KEBUN.x0 + KEBUN.x1) / 2, h, KEBUN.z1]}><boxGeometry args={[KEBUN.x1 - KEBUN.x0, 0.05, 0.05]} /><meshStandardMaterial color={bambu} /></mesh>
					{[KEBUN.x0, KEBUN.x1].map((x) => <mesh key={x} position={[x, h, (KEBUN.z0 + KEBUN.z1) / 2]}><boxGeometry args={[0.05, 0.05, KEBUN.z1 - KEBUN.z0]} /><meshStandardMaterial color={bambu} /></mesh>)}
				</group>
			))}
			{/* bunga di sepanjang pagar depan */}
			{Array.from({ length: Math.floor((KEBUN.x1 - KEBUN.x0 - 2) / 1.4) }, (_, i) => {
				const x = KEBUN.x0 + 1 + i * 1.4;
				if (Math.abs(x - GERBANG_KEBUN.x) < 2.6) return null;
				return (
					<group key={i} position={[x, 0, KEBUN.z0 + 0.7]}>
						<mesh position-y={0.18}><icosahedronGeometry args={[0.24, 0]} /><meshStandardMaterial color="#4d7c2a" flatShading /></mesh>
						<mesh position-y={0.42}><sphereGeometry args={[0.09, 6, 5]} /><meshStandardMaterial color={bunga[i % bunga.length]} /></mesh>
					</group>
				);
			})}
			{/* gapura bambu di gerbang */}
			{[-1, 1].map((s) => <mesh key={s} position={[GERBANG_KEBUN.x + s * (GERBANG_KEBUN.lebar / 2), 1.5, KEBUN.z0]}><cylinderGeometry args={[0.11, 0.12, 3, 7]} /><meshStandardMaterial color={bambu} /></mesh>)}
			<mesh position={[GERBANG_KEBUN.x, 3, KEBUN.z0]}><boxGeometry args={[GERBANG_KEBUN.lebar + 0.8, 0.16, 0.2]} /><meshStandardMaterial color={bambu} /></mesh>
			<mesh position={[GERBANG_KEBUN.x, 3.3, KEBUN.z0]} rotation-y={Math.PI / 4}><coneGeometry args={[0.35, 0.5, 4]} /><meshStandardMaterial color="#7c4a2b" /></mesh>
			{usahaKini().id !== "bertani" && <TempatIsiUlang />}
			{/* sumur batu dengan atap kecil & kerekan */}
			{usahaKini().id === "bertani" && <group position={[SUMUR_KEBUN.x, 0, SUMUR_KEBUN.z]}>
				<mesh position-y={0.42} material={bahanBangunan("batu", "#c7c5bf", 3, 1)}><cylinderGeometry args={[SUMUR_KEBUN.r, SUMUR_KEBUN.r + 0.06, 0.84, 20]} /></mesh>
				<mesh position-y={0.86}><torusGeometry args={[SUMUR_KEBUN.r - 0.04, 0.07, 5, 14]} /><meshStandardMaterial color="#78716c" roughness={1} /></mesh>
				{[-1, 1].map((s) => <mesh key={s} position={[s * 0.62, 1.3, 0]}><boxGeometry args={[0.09, 1.8, 0.09]} /><meshStandardMaterial color="#6b4a2b" /></mesh>)}
				<mesh position-y={2.25} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 1.4, 6]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
				<mesh position-y={2.25} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.14, 0.14, 0.12, 10]} /><meshStandardMaterial color="#57534e" /></mesh>
				<mesh position-y={2.6} rotation-y={Math.PI / 4}><coneGeometry args={[1.1, 0.65, 4]} /><meshStandardMaterial color="#7c4a2b" /></mesh>
				<mesh position={[0, 1.45, 0]}><cylinderGeometry args={[0.13, 0.1, 0.22, 8]} /><meshStandardMaterial color="#8b5e34" /></mesh>
				<mesh position={[0.95, 0.15, 0.5]}><cylinderGeometry args={[0.2, 0.16, 0.3, 10]} /><meshStandardMaterial color="#2563eb" /></mesh>
			</group>}
			{/* meja pengepul dengan keranjang hasil bumi & timbangan */}
			<group position={[P.x, 0, P.z]}>
				<mesh position-y={0.75}><boxGeometry args={[P.lx, 0.08, P.lz]} /><meshStandardMaterial color="#8b5e34" /></mesh>
				{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} position={[sx * (P.lx / 2 - 0.1), 0.37, sz * (P.lz / 2 - 0.1)]}><boxGeometry args={[0.08, 0.74, 0.08]} /><meshStandardMaterial color="#6b4a2b" /></mesh>))}
				{[-0.8, 0, 0.8].map((x, i) => (
					<group key={x} position={[x, 0.93, 0]}>
						<mesh><cylinderGeometry args={[0.28, 0.22, 0.28, 10]} /><meshStandardMaterial color={["#b45309", "#a16207", "#92400e"][i]} roughness={1} /></mesh>
						{[0, 1, 2, 3].map((j) => <mesh key={j} position={[Math.cos(j * 1.6) * 0.12, 0.16, Math.sin(j * 1.6) * 0.12]}><sphereGeometry args={[0.09, 6, 5]} /><meshStandardMaterial color={["#d9b44a", "#f59e0b", "#7c3aed"][i]} /></mesh>)}
					</group>
				))}
				<mesh position={[1.05, 1.0, -0.25]}><boxGeometry args={[0.32, 0.34, 0.28]} /><meshStandardMaterial color="#475569" metalness={0.4} /></mesh>
				{/* karung gabah di samping meja */}
				{[[-1.7, 0.2], [-1.7, -0.4], [-2.2, -0.1]].map(([x, z], i) => <mesh key={i} position={[x, 0.32, z]} scale={[1, 1.2, 0.8]}><sphereGeometry args={[0.3, 8, 6]} /><meshStandardMaterial color="#e7dcc0" roughness={1} /></mesh>)}
				{/* papan pesanan berdiri */}
				{[1.9, 3.1].map((x) => <mesh key={x} position={[x, 1.0, -0.26]}><boxGeometry args={[0.07, 2, 0.07]} /><meshStandardMaterial color="#6b4a2b" /></mesh>)}
			</group>
			{/* saung bambu: lantai bale panggung, atap ijuk dua lapis */}
			<group>
				{[S.x0, S.x1].flatMap((x) => [S.z0, S.z1].map((z) => <mesh key={`${x}${z}`} position={[x, 1.3, z]}><cylinderGeometry args={[0.1, 0.1, 2.6, 7]} /><meshStandardMaterial color={bambu} /></mesh>))}
				<mesh position={[(S.x0 + S.x1) / 2, 0.55, (S.z0 + S.z1) / 2]}><boxGeometry args={[S.x1 - S.x0, 0.12, S.z1 - S.z0]} /><meshStandardMaterial color="#a8834a" /></mesh>
				{[-1.5, 0, 1.5].map((dz) => <mesh key={dz} position={[(S.x0 + S.x1) / 2, 0.62, (S.z0 + S.z1) / 2 + dz]}><boxGeometry args={[S.x1 - S.x0 - 0.2, 0.02, 0.06]} /><meshStandardMaterial color="#8b6a35" /></mesh>)}
				<mesh position={[(S.x0 + S.x1) / 2, 3.15, (S.z0 + S.z1) / 2]} rotation-y={Math.PI / 4}><coneGeometry args={[4.7, 1.5, 4]} /><meshStandardMaterial map={bahanBangunan("ijuk", "#8a6a45", 8, 2).map} color="#8a6a45" roughness={1} /></mesh>
				<mesh position={[(S.x0 + S.x1) / 2, 3.75, (S.z0 + S.z1) / 2]} rotation-y={Math.PI / 4}><coneGeometry args={[2.2, 0.9, 4]} /><meshStandardMaterial map={bahanBangunan("ijuk", "#6b5236", 4, 1).map} color="#6b5236" roughness={1} /></mesh>
				{/* teko & gelas di atas bale */}
				<mesh position={[pusatS.x - 1, 0.75, pusatS.z - 1]}><sphereGeometry args={[0.15, 8, 6]} /><meshStandardMaterial color="#334155" /></mesh>
				{[0.35, 0.6].map((dx) => <mesh key={dx} position={[pusatS.x - 1 + dx, 0.68, pusatS.z - 0.9]}><cylinderGeometry args={[0.05, 0.04, 0.1, 8]} /><meshStandardMaterial color="#f1f5f9" /></mesh>)}
			</group>
			{/* gudang alat dengan rak alat & karung pupuk */}
			<group>
				<mesh position={[(G.x0 + G.x1) / 2, 1.25, (G.z0 + G.z1) / 2]} material={bahanBangunan("papan", "#b0742f", 2, 2.5)}><boxGeometry args={[G.x1 - G.x0, 2.5, G.z1 - G.z0]} /></mesh>
				{Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[G.x0 + 0.3 + i * 0.55, 1.25, G.z0 - 0.02]}><boxGeometry args={[0.05, 2.5, 0.03]} /><meshStandardMaterial color="#854d0e" /></mesh>)}
				<mesh position={[(G.x0 + G.x1) / 2, 2.85, (G.z0 + G.z1) / 2]} rotation-y={Math.PI / 4}><coneGeometry args={[3.9, 1.1, 4]} /><meshStandardMaterial map={bahanBangunan("genteng", "#a8461f", 8, 2).map} color="#a8461f" roughness={0.9} /></mesh>
				<mesh position={[(G.x0 + G.x1) / 2, 0.95, G.z0 - 0.04]}><boxGeometry args={[1.2, 1.9, 0.04]} /><meshStandardMaterial color="#422006" /></mesh>
				{[[G.x0 + 0.6, G.z0 - 0.5], [G.x0 + 1.2, G.z0 - 0.45], [G.x1 - 0.6, G.z0 - 0.5]].map(([x, z], i) => <mesh key={i} position={[x, 0.3, z]} scale={[1, 1.3, 0.8]}><sphereGeometry args={[0.28, 8, 6]} /><meshStandardMaterial color={i === 2 ? "#65a30d" : "#78350f"} roughness={1} /></mesh>)}
				<mesh position={[G.x1 - 1.4, 0.9, G.z0 - 0.15]} rotation-z={0.15}><boxGeometry args={[0.05, 1.8, 0.05]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
				<mesh position={[G.x1 - 1.35, 0.1, G.z0 - 0.2]}><boxGeometry args={[0.3, 0.2, 0.04]} /><meshStandardMaterial color="#9ca3af" metalness={0.5} /></mesh>
			</group>
			{/* tumpukan kompos & gerobak di sisi barat kebun */}
			<mesh position={[kompos.x, 0.35, kompos.z]} scale={[1.6, 0.7, 1.2]}><sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color="#4a3420" roughness={1} /></mesh>
			<group position={[gerobak.x, 0, gerobak.z]} rotation-y={0.5}>
				<mesh position-y={0.55}><boxGeometry args={[0.9, 0.35, 1.3]} /><meshStandardMaterial color="#64748b" metalness={0.3} /></mesh>
				<mesh position={[0, 0.25, 0.75]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.22, 0.22, 0.1, 10]} /><meshStandardMaterial color="#1f2937" /></mesh>
				{[-0.3, 0.3].map((x) => <mesh key={x} position={[x, 0.55, -0.95]} rotation-x={0.3}><cylinderGeometry args={[0.03, 0.03, 0.8, 5]} /><meshStandardMaterial color="#6b4a2b" /></mesh>)}
			</group>
			{/* rumpun pisang di pojok kebun */}
			{pisang.map(([x, z], i) => (
				<group key={i} position={[x, 0, z]}>
					<mesh position-y={1.2}><cylinderGeometry args={[0.15, 0.22, 2.4, 7]} /><meshStandardMaterial color="#7c8a3a" /></mesh>
					{[0, 1.2, 2.4, 3.6, 4.8].map((a) => <mesh key={a} position={[Math.cos(a) * 0.7, 2.4, Math.sin(a) * 0.7]} rotation={[0.8 * Math.sin(a), a, 0.8 * Math.cos(a)]}><boxGeometry args={[0.45, 0.03, 1.6]} /><meshStandardMaterial color={i % 2 ? "#4d8a2e" : "#5b9a34"} /></mesh>)}
				</group>
			))}
			{/* mobil pikap pengepul di luar pagar */}
			<group position={[PIKAP.x, 0, PIKAP.z]}>
				<mesh position-y={0.7}><boxGeometry args={[4.2, 0.5, 1.7]} /><meshStandardMaterial color="#1d4ed8" metalness={0.3} roughness={0.5} /></mesh>
				<mesh position={[1.35, 1.25, 0]}><boxGeometry args={[1.4, 0.7, 1.6]} /><meshStandardMaterial color="#1d4ed8" metalness={0.3} roughness={0.5} /></mesh>
				<mesh position={[1.75, 1.3, 0]}><boxGeometry args={[0.6, 0.45, 1.62]} /><meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.2} /></mesh>
				{[[-1.3, 0.85], [-1.3, -0.85], [1.3, 0.85], [1.3, -0.85]].map(([x, z], i) => <mesh key={i} position={[x, 0.35, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.35, 0.35, 0.22, 12]} /><meshStandardMaterial color="#111827" /></mesh>)}
				{[-1.5, -0.7, 0.1].map((x) => <mesh key={x} position={[x, 1.2, 0]} scale={[1, 1, 1.4]}><sphereGeometry args={[0.35, 8, 6]} /><meshStandardMaterial color="#e7dcc0" roughness={1} /></mesh>)}
			</group>
			{/* tiang papan nama */}
			{[-1.4, 1.4].map((dx) => <mesh key={dx} position={[PAPAN_KEBUN.x + dx, 1.1, PAPAN_KEBUN.z]}><boxGeometry args={[0.12, 2.2, 0.12]} /><meshStandardMaterial color="#6b4a2b" /></mesh>)}
		</Gabung>
	);
}

export default function KebunDesa() {
	useKebun();
	const aktif = jumlahPetakAktif();
	useFrame((_, dt) => {
		tumbuhkan(Math.min(0.1, dt));
		detakDesa(Math.min(0.1, dt));
		bersihkanEfek();
	});
	const k = KOMODITAS[kebun.komoditas];
	const ps = kebun.pesanan;
	const kp = ps && KOMODITAS[ps.komoditas];
	const u = usahaKini();
	return (
		<group name="kebun-desa">
			<Bangunan />
			{kebun.petak.slice(0, aktif).map((p, i) => <Petak key={i} i={i} p={p} />)}
			<EfekAksi />
			{!tanpaHewan(u) && <PipitKabur />}
			<PenandaMisi />
			<TrukTengkulak />
			{u.id === "bertani" && punyaAlat("orangan") && <OrangOrangan />}
			{(u.id === "bertani" || u.id === "ikan") && punyaAlat("penyiram") && <Penyiram />}
			<Papan
				posisi={[PAPAN_KEBUN.x, 1.85, PAPAN_KEBUN.z - 0.08]}
				rotasi={Math.PI}
				lebar={3.2}
				tinggi={1.1}
				latar="#14532d"
				aksen="#facc15"
				baris={[
					{ teks: u.tempat.toUpperCase(), ukuran: 0.3, tebal: true, warna: "#fde68a", y: 0.38 },
					{ teks: `${u.kelompok} · ${k.nama} · Kec. ${kebun.kecamatan}`, ukuran: 0.11, warna: "#dcfce7", y: 0.76 },
				]}
			/>
			<Papan
				posisi={[PENGEPUL_KEBUN.x + 2.5, 1.75, PENGEPUL_KEBUN.z - 0.3]}
				rotasi={Math.PI}
				lebar={2.4}
				tinggi={1}
				latar="#7c2d12"
				aksen="#fde68a"
				baris={[
					{ teks: u.pembeli.papan, ukuran: 0.17, tebal: true, warna: "#fef3c7", y: 0.27 },
					{ teks: kp ? `Dicari: ${ps.jumlah} ${kp.satuan} ${kp.nama.toLowerCase()}` : `Terima semua ${u.panen.hasil}`, ukuran: 0.12, warna: "#fde68a", y: 0.56 },
					{ teks: kp ? `Bonus 🪙 ${ps.bonus}` : "", ukuran: 0.13, tebal: true, warna: "#fef08a", y: 0.8 },
				]}
			/>
		</group>
	);
}
