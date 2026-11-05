import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, BufferGeometry, CanvasTexture, CircleGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, MeshBasicMaterial, MeshStandardMaterial, Object3D, Path, PlaneGeometry, SRGBColorSpace, Shape, ShapeGeometry, SpriteMaterial } from "three";
import { IKAN_PER_ID, pancing } from "../pancing";
import { posisi } from "../jelajahStore";
import Gabung from "./Gabung";
import { KENDARAAN, useArmada } from "./kendaraan";
import ModelIkan from "./ModelIkan";
import Papan from "./Papan";
import { AIR_Y, BAGIAN_DERMAGA, DEK_Y, DERMAGA, diSitu, jarakKeTepi } from "./situ";
import { suasana } from "./suasana";
import HiasanDermaga from "./HiasanDermaga";
import { KapalTamu, Perahu } from "./ModelKapal";

// Situ Pemda yang hidup: dermaga spot mancing, perahu dayung, ikan berenang & melompat.
// Dipasang di grup halaman (y = TANAH); semua y relatif terhadap tanah.

const KAYU = ["#8a5a35", "#7b4f2e", "#946640"];
const BAHAN_LAMPU = new MeshStandardMaterial({ color: "#fff7e0", emissive: "#ffcf7a", emissiveIntensity: 0 });

function Dermaga({ d, daftarDinding }) {
	// Atap saung ikut didaftarkan sebagai penghalang pandang (seperti kanopi kantor):
	// saat memancing kamera ada di belakang pemancing, dan atap akan menutupinya.
	const atapRef = useRef();
	useEffect(() => {
		const m = atapRef.current;
		if (!daftarDinding || !m) return;
		m.userData.bahan = [m.material];
		const daftar = daftarDinding.current[0];
		daftar.push(m);
		return () => daftar.splice(daftar.indexOf(m), 1);
	}, [daftarDinding]);
	const [titian, panggung] = BAGIAN_DERMAGA;
	const papan = [];
	for (const b of BAGIAN_DERMAGA) {
		for (let s = b.s0 + 0.16, i = 0; s < b.s1; s += 0.32, i++) papan.push({ s, w: b.w, warna: KAYU[i % 3] });
	}
	// tiang penyangga sampai dasar situ
	const tiang = [];
	for (let s = 1; s <= titian.s1; s += 3) for (const w of [-titian.w + 0.1, titian.w - 0.1]) tiang.push([w, s]);
	for (const s of [panggung.s0 + 0.2, (panggung.s0 + panggung.s1) / 2, panggung.s1 - 0.15]) for (const w of [-panggung.w + 0.1, 0, panggung.w - 0.1]) tiang.push([w, s]);
	// pagar titian, dengan celah naik perahu di sisi tambatan
	const celah = new Set(d.perahu.map((w) => Math.sign(w)));
	const pagar = [];
	for (const sisi of [-1, 1]) {
		const ruas = celah.has(sisi) ? [[0.6, 5.2], [7.8, titian.s1 - 0.4]] : [[0.6, titian.s1 - 0.4]];
		for (const [a, b] of ruas) pagar.push({ w: sisi * (titian.w - 0.05), a, b });
	}
	const atap = (panggung.s0 + 0.6 + panggung.s0 + 3) / 2;

	return (
		<group position={[d.x, 0, d.z]} rotation-y={d.rot}>
			<Gabung>
				{papan.map((p, i) => (
					<mesh key={i} position={[0, DEK_Y - 0.035, p.s]}>
						<boxGeometry args={[p.w * 2, 0.07, 0.29]} />
						<meshStandardMaterial color={p.warna} roughness={0.9} />
					</mesh>
				))}
				{/* balok memanjang di bawah papan */}
				{[-1, 1].map((sisi) => (
					<mesh key={sisi} position={[sisi * (titian.w - 0.15), DEK_Y - 0.14, (titian.s0 + panggung.s1) / 2]}>
						<boxGeometry args={[0.16, 0.14, panggung.s1 - titian.s0]} />
						<meshStandardMaterial color="#5c3d24" />
					</mesh>
				))}
				{tiang.map(([w, s], i) => (
					<mesh key={i} position={[w, -0.75, s]}>
						<cylinderGeometry args={[0.09, 0.11, 1.75, 6]} />
						<meshStandardMaterial color="#5c3d24" />
					</mesh>
				))}
				{pagar.map((p, i) => (
					<group key={i}>
						<mesh position={[p.w, DEK_Y + 0.85, (p.a + p.b) / 2]}>
							<boxGeometry args={[0.07, 0.07, p.b - p.a]} />
							<meshStandardMaterial color="#6e4a2f" />
						</mesh>
						{Array.from({ length: Math.floor((p.b - p.a) / 1.5) + 1 }, (_, k) => (
							<mesh key={k} position={[p.w, DEK_Y + 0.42, p.a + Math.min(k * 1.5, p.b - p.a)]}>
								<boxGeometry args={[0.07, 0.86, 0.07]} />
								<meshStandardMaterial color="#6e4a2f" />
							</mesh>
						))}
					</group>
				))}
				{/* saung di separuh belakang panggung; bagian depan terbuka untuk melempar */}
				{[-1, 1].flatMap((sw) =>
					[panggung.s0 + 0.6, panggung.s0 + 3].map((s) => (
						<mesh key={`${sw}${s}`} position={[sw * (panggung.w - 0.3), DEK_Y + 1.35, s]}>
							<boxGeometry args={[0.14, 2.7, 0.14]} />
							<meshStandardMaterial color="#6e4a2f" />
						</mesh>
					)),
				)}
				{/* bangku */}
				{[-1, 1].map((sw) => (
					<group key={sw} position={[sw * (panggung.w - 0.7), DEK_Y, atap]}>
						<mesh position-y={0.42}>
							<boxGeometry args={[0.45, 0.06, 1.8]} />
							<meshStandardMaterial color="#8a5a35" />
						</mesh>
						{[-0.7, 0.7].map((z) => (
							<mesh key={z} position={[0, 0.2, z]}>
								<boxGeometry args={[0.4, 0.4, 0.07]} />
								<meshStandardMaterial color="#5c3d24" />
							</mesh>
						))}
					</group>
				))}
				{/* tiang lampu di dua sudut depan panggung */}
				{[-1, 1].map((sw) => (
					<mesh key={sw} position={[sw * (panggung.w - 0.15), DEK_Y + 1.2, panggung.s1 - 0.15]}>
						<cylinderGeometry args={[0.04, 0.05, 2.4, 6]} />
						<meshStandardMaterial color="#2d2d2d" metalness={0.4} />
					</mesh>
				))}
				{/* tiang papan nama di darat */}
				{[-1.25, 1.25].map((w) => (
					<mesh key={w} position={[w - 2.6, 0.95, -2.6]}>
						<boxGeometry args={[0.1, 1.9, 0.1]} />
						<meshStandardMaterial color="#5c3d24" />
					</mesh>
				))}
			</Gabung>
			<group position={[0, DEK_Y + 3.05, atap]} scale={[(panggung.w + 0.3) / Math.SQRT1_2, 1, 2.0 / Math.SQRT1_2]}>
				<mesh ref={atapRef} rotation-y={Math.PI / 4}>
					<coneGeometry args={[1, 1.2, 4]} />
					<meshStandardMaterial color="#7a3f2e" flatShading />
				</mesh>
			</group>
			{[-1, 1].map((sw) => (
				<mesh key={sw} position={[sw * (panggung.w - 0.15), DEK_Y + 2.5, panggung.s1 - 0.15]} material={BAHAN_LAMPU}>
					<sphereGeometry args={[0.16, 10, 8]} />
				</mesh>
			))}
			<Papan
				posisi={[-2.6, 1.55, -2.67]}
				rotasi={Math.PI}
				lebar={2.6}
				tinggi={0.95}
				latar="#f6efe0"
				aksen="#1f6b50"
				bingkai="#5c3d24"
				diterangi
				baris={[
					{ teks: "🎣 SPOT MANCING", ukuran: 0.3, tebal: true, warna: "#1f6b50", y: 0.36 },
					{ teks: d.nama, ukuran: 0.17, warna: "#3b2a1a", y: 0.62 },
					{ teks: "Perahu dayung gratis · Jaga kebersihan situ", ukuran: 0.11, warna: "#6b5b4a", y: 0.84 },
				]}
			/>
			<HiasanDermaga d={d} />
		</group>
	);
}

// ---------- perahu dayung ----------

// ---------- ikan berenang & melompat ----------

const N_BAYANG = 26;
const GEO_BAYANG = new CircleGeometry(0.5, 10).rotateX(-Math.PI / 2);
const BAHAN_BAYANG = new MeshBasicMaterial({ color: "#123040", transparent: true, opacity: 0.32, depthWrite: false });
const detik = () => performance.now() / 1000;
const LOMPAT = ["nila", "tawes", "mujair", "mas", "gurame"].map((id) => IKAN_PER_ID[id]);

function titikAcakDekat(x, z, r) {
	for (let i = 0; i < 20; i++) {
		const a = Math.random() * Math.PI * 2;
		const d = 6 + Math.random() * r;
		const q = { x: x + Math.cos(a) * d, z: z + Math.sin(a) * d };
		if (diSitu(q.x, q.z)) return q;
	}
	return null;
}

function IkanSitu() {
	const bayang = useRef();
	const ikan = useMemo(() => Array.from({ length: N_BAYANG }, (_, i) => ({ x: 0, z: 0, arah: Math.random() * 6.3, laju: 0.4 + Math.random() * 0.8, besar: i === 0 ? 4.2 : 0.5 + Math.random() * 0.7, aktif: false })), []);
	const lompat = useRef();
	const lp = useRef({ t: 0, dur: 1, jeda: 4, x: 0, z: 0, arah: 0, jenis: 0, aktif: false });
	const o = useMemo(() => new Object3D(), []);
	const periksa = useRef({ t: 1, dekat: false });

	useLayoutEffect(() => {
		o.scale.set(0, 0, 0);
		o.updateMatrix();
		for (let i = 0; i < N_BAYANG; i++) bayang.current.setMatrixAt(i, o.matrix);
		bayang.current.instanceMatrix.needsUpdate = true;
	}, [o]);

	useFrame(({ clock }, dt) => {
		const t = clock.elapsedTime;
		const px = posisi.x;
		const pz = posisi.z;
		// hanya dihidupkan bila pemain di sekitar situ (diperiksa dua kali sedetik)
		const pk = periksa.current;
		pk.t += dt;
		if (pk.t > 0.5) {
			pk.t = 0;
			pk.dekat = posisi.lantai === 0 && (diSitu(px, pz) || jarakKeTepi(px, pz) < 60);
		}
		const dekat = pk.dekat;
		bayang.current.visible = dekat;
		if (!dekat && !lp.current.aktif) return;
		ikan.forEach((f, i) => {
			const jauh = Math.hypot(f.x - px, f.z - pz);
			if (!f.aktif || jauh > 75) {
				const q = titikAcakDekat(px, pz, 55);
				f.aktif = !!q;
				if (q) Object.assign(f, q);
			}
			if (f.aktif) {
				f.arah += Math.sin(t * 0.4 + i * 7) * dt * 0.8;
				const nx = f.x + Math.sin(f.arah) * f.laju * dt;
				const nz = f.z + Math.cos(f.arah) * f.laju * dt;
				if (diSitu(nx, nz)) {
					f.x = nx;
					f.z = nz;
				} else f.arah += Math.PI * 0.8;
			}
			// bayangan raksasa (indeks 0) hanya sesekali lewat
			const tampak = f.aktif && (i !== 0 || Math.sin(t * 0.05) > 0.75);
			o.position.set(f.x, AIR_Y + 0.006, f.z);
			o.rotation.set(0, f.arah, 0);
			const s = tampak ? f.besar : 0;
			o.scale.set(s * 0.32, 1, s * (1 + Math.sin(t * 6 + i) * 0.05));
			o.updateMatrix();
			bayang.current.setMatrixAt(i, o.matrix);
		});
		bayang.current.instanceMatrix.needsUpdate = true;

		// ikan kecil melompat di dekat pemain
		const l = lp.current;
		if (!l.aktif) {
			l.jeda -= dt;
			if (l.jeda <= 0) {
				l.jeda = 5 + Math.random() * 9;
				const q = dekat && titikAcakDekat(px, pz, 25);
				if (q) {
					Object.assign(l, q, { aktif: true, t: 0, dur: 0.9 + Math.random() * 0.4, arah: Math.random() * 6.3, jenis: Math.floor(Math.random() * LOMPAT.length) });
					pancing.cipratan.push({ x: q.x, z: q.z, besar: 0.5, t0: detik() });
				}
			}
		}
		const m = lompat.current;
		m.visible = l.aktif;
		m.children.forEach((c, j) => (c.visible = j === l.jenis));
		if (l.aktif) {
			l.t += dt;
			const f = l.t / l.dur;
			const maju = (f - 0.5) * 1.6;
			m.position.set(l.x + Math.sin(l.arah) * maju, AIR_Y + Math.sin(f * Math.PI) * 0.9, l.z + Math.cos(l.arah) * maju);
			m.rotation.set(-(f - 0.5) * 2.2, l.arah, 0);
			if (f >= 1) {
				l.aktif = false;
				pancing.cipratan.push({ x: m.position.x, z: m.position.z, besar: 0.45, t0: detik() });
			}
		}
	});

	return (
		<>
			<instancedMesh ref={bayang} args={[GEO_BAYANG, BAHAN_BAYANG, N_BAYANG]} frustumCulled={false} />
			<group ref={lompat} visible={false}>
				{LOMPAT.map((ik) => (
					<ModelIkan key={ik.id} ikan={ik} panjang={0.35} />
				))}
			</group>
		</>
	);
}

export default function SituPemda({ daftarDinding }) {
	useArmada(); // perahu tambahan yang dipanggil tamu ikut tergambar
	const perahu = KENDARAAN.filter((k) => k.jenis === "perahu");
	useFrame(() => {
		BAHAN_LAMPU.emissiveIntensity = suasana.malam * 2.2;
	});
	return (
		<group>
			{DERMAGA.map((d) => (
				<Dermaga key={d.id} d={d} daftarDinding={daftarDinding} />
			))}
			{perahu.map((k, i) => (
				k.milik ? <KapalTamu key={k.id} k={k} i={i} /> : <Perahu key={k.id} k={k} i={i} />
			))}
			<IkanSitu />
		</group>
	);
}
