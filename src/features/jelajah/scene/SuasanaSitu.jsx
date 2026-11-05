import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
	AdditiveBlending,
	BufferGeometry,
	Color,
	ConeGeometry,
	CylinderGeometry,
	DoubleSide,
	Float32BufferAttribute,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	RingGeometry,
	SphereGeometry,
} from "three";
import { BAHAN_WARNA, gabung, warnai } from "./geometri";
import { AIR_Y, DERMAGA, SITU, dermagaDi, diSitu, jarakKeTepi, keDuniaDermaga } from "./situ";
import { suasana } from "./suasana";

// Suasana Situ Pemda: gradasi air dangkal di tepi, rumpun mendong yang bergoyang, keluarga
// bebek, kawanan kuntul, dan riak hujan. Semua instanced (satu panggilan gambar per jenis)
// supaya ringan di HP. Tinggi relatif halaman, sama seperti SituPemda.jsx.

const bantu = new Object3D();
const warnaBantu = new Color();

function acakDari(benih) {
	let s = benih;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// goyang angin lewat shader: tiap instance punya fase dari posisinya, ujung bergerak paling jauh
const WAKTU = { value: 0 };
function pasangGoyang(bahan, rumus) {
	bahan.onBeforeCompile = (s) => {
		s.uniforms.uWaktu = WAKTU;
		s.vertexShader = `uniform float uWaktu;\n${s.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>\n${rumus}`);
	};
	// tanpa kunci ini three memakai teks fungsi di atas, yang sama untuk semua rumus: program tertukar
	bahan.customProgramCacheKey = () => rumus;
	return bahan;
}

// ---------- air dangkal: pita tepi dari keruh di bibir situ sampai bening ke tengah ----------
const LEBAR_DANGKAL = 7;
function geometriDangkal() {
	const n = SITU.length;
	const luas = SITU.reduce((a, [x, z], i) => a + x * SITU[(i + 1) % n][1] - SITU[(i + 1) % n][0] * z, 0);
	// normal ke dalam situ per titik, rata-rata dua sisi yang bertemu
	const posisi = [];
	const warna = [];
	const indeks = [];
	const w = new Color("#7d8f55");
	for (let i = 0; i < n; i++) {
		const [ax, az] = SITU[(i + n - 1) % n];
		const [x, z] = SITU[i];
		const [bx, bz] = SITU[(i + 1) % n];
		let nx = -(bz - az);
		let nz = bx - ax;
		const p = (Math.hypot(nx, nz) || 1) * (luas > 0 ? -1 : 1);
		nx /= p;
		nz /= p;
		posisi.push(x, 0, z, x - nx * LEBAR_DANGKAL, 0, z - nz * LEBAR_DANGKAL);
		warna.push(w.r, w.g, w.b, 0.55, w.r, w.g, w.b, 0);
		const j = (i + 1) % n;
		indeks.push(i * 2, i * 2 + 1, j * 2, j * 2, i * 2 + 1, j * 2 + 1);
	}
	const g = new BufferGeometry();
	g.setAttribute("position", new Float32BufferAttribute(posisi, 3));
	g.setAttribute("color", new Float32BufferAttribute(warna, 4));
	g.setIndex(indeks);
	return g;
}
const BAHAN_DANGKAL = new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: DoubleSide });

function AirDangkal() {
	const geo = useMemo(geometriDangkal, []);
	useEffect(() => () => geo.dispose(), [geo]);
	useFrame(() => {
		BAHAN_DANGKAL.color.setScalar((1 - suasana.malam * 0.95) * (1 - suasana.hujan * 0.25));
	});
	return <mesh geometry={geo} material={BAHAN_DANGKAL} position-y={AIR_Y + 0.012} renderOrder={1} />;
}

// ---------- mendong: rumpun di tepi air, jauh dari dermaga supaya jalur perahu & pandangan bebas ----------
const MAKS_BULUH = 1100;
const dekatDermaga = (x, z) => DERMAGA.some((d) => Math.hypot(d.x - x, d.z - z) < 26);
function tataBuluh() {
	const r = acakDari(7);
	const n = SITU.length;
	const luas = SITU.reduce((a, [x, z], i) => a + x * SITU[(i + 1) % n][1] - SITU[(i + 1) % n][0] * z, 0);
	const hasil = [];
	for (let i = 0; i < n && hasil.length < MAKS_BULUH; i++) {
		const [ax, az] = SITU[i];
		const [bx, bz] = SITU[(i + 1) % n];
		const pj = Math.hypot(bx - ax, bz - az);
		if (!pj) continue;
		const ke = luas > 0 ? 1 : -1;
		const nx = (-(bz - az) / pj) * ke;
		const nz = ((bx - ax) / pj) * ke;
		for (let t = 0; t < pj; t += 1.5) {
			const px = ax + ((bx - ax) * t) / pj;
			const pz = az + ((bz - az) * t) / pj;
			// rumpun, bukan pagar rata: hanya sebagian tepi yang ditumbuhi
			if (Math.sin(px * 0.09 + 1.3) + Math.sin(pz * 0.13 + 0.4) + r() * 0.5 < 0.75) continue;
			for (let k = 0; k < 7; k++) {
				const dalam = 0.25 + r() * r() * 3.4;
				const x = px + nx * dalam + (r() - 0.5) * 1.5;
				const z = pz + nz * dalam + (r() - 0.5) * 1.5;
				if (!diSitu(x, z) || dekatDermaga(x, z) || dermagaDi(x, z, -2)) continue;
				hasil.push({ x, z, h: 0.9 + r() * 1.15, rot: r() * Math.PI, mx: (r() - 0.5) * 0.2, mz: (r() - 0.5) * 0.2, c: r() });
			}
		}
	}
	return hasil.slice(0, MAKS_BULUH);
}
const RUMUS_GOYANG = "float goyang = sin(uWaktu * 1.4 + instanceMatrix[3].x * 0.6 + instanceMatrix[3].z * 0.4) * 0.11 + sin(uWaktu * 3.1 + instanceMatrix[3].x) * 0.03; transformed.x += goyang * position.y * position.y;";
const BAHAN_BULUH = pasangGoyang(new MeshStandardMaterial({ roughness: 0.85, flatShading: true }), RUMUS_GOYANG);
const BAHAN_BONGGOL = pasangGoyang(new MeshStandardMaterial({ color: "#5b3a1e", roughness: 0.95 }), RUMUS_GOYANG);
// batang setinggi 1 satuan (titik asal di permukaan air); bonggol dibentuk dengan skala y yang sama
const GEO_BULUH = new ConeGeometry(0.05, 1, 3).translate(0, 0.5, 0);
const GEO_BONGGOL = new CylinderGeometry(0.042, 0.042, 0.14, 5).translate(0, 0.84, 0);
const HIJAU_BULUH = [new Color("#5f8a3a"), new Color("#7a9c45"), new Color("#a3a856")];

function Mendong() {
	const daftar = useMemo(tataBuluh, []);
	const bonggol = useMemo(() => daftar.filter((_, i) => i % 5 === 0), [daftar]);
	const batang = useRef();
	const kepala = useRef();
	useLayoutEffect(() => {
		const pasang = (m, d, berwarna) => {
			d.forEach((b, i) => {
				bantu.position.set(b.x, 0, b.z);
				bantu.rotation.set(b.mx, b.rot, b.mz);
				bantu.scale.set(1, b.h, 1);
				bantu.updateMatrix();
				m.setMatrixAt(i, bantu.matrix);
				if (berwarna) m.setColorAt(i, warnaBantu.copy(HIJAU_BULUH[Math.floor(b.c * HIJAU_BULUH.length)]));
			});
			m.instanceMatrix.needsUpdate = true;
			if (m.instanceColor) m.instanceColor.needsUpdate = true;
			m.computeBoundingSphere();
		};
		pasang(batang.current, daftar, true);
		pasang(kepala.current, bonggol, false);
	}, [daftar, bonggol]);
	return (
		<group position-y={AIR_Y}>
			<instancedMesh ref={batang} args={[GEO_BULUH, BAHAN_BULUH, daftar.length]} frustumCulled={false} />
			<instancedMesh ref={kepala} args={[GEO_BONGGOL, BAHAN_BONGGOL, bonggol.length]} frustumCulled={false} />
		</group>
	);
}

// ---------- riak: kumpulan cincin melebar lalu memudar (rintik hujan & jejak bebek) ----------
const N_RIAK = 64;
const riak = Array.from({ length: N_RIAK }, () => ({ x: 0, z: 0, r: 1, u: 1, lama: 1, kuat: 1 }));
let riakBerikut = 0;
function tambahRiak(x, z, r, lama, kuat) {
	Object.assign(riak[riakBerikut], { x, z, r, u: 0, lama, kuat });
	riakBerikut = (riakBerikut + 1) % N_RIAK;
}
const GEO_RIAK = new RingGeometry(0.86, 1, 28).rotateX(-Math.PI / 2);
const BAHAN_RIAK = new MeshBasicMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending });
const JARI_HUJAN = 17;

function Riak() {
	const inst = useRef();
	const sisa = useRef(0);
	useFrame(({ camera }, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		const m = inst.current;
		// rintik di air sekitar kamera; titik di luar situ dibuang saja
		sisa.current += suasana.hujan * 70 * dt;
		while (sisa.current >= 1) {
			sisa.current -= 1;
			const x = camera.position.x + (Math.random() - 0.5) * JARI_HUJAN * 2;
			const z = camera.position.z + (Math.random() - 0.5) * JARI_HUJAN * 2;
			if (diSitu(x, z) && !dermagaDi(x, z)) tambahRiak(x, z, 0.3 + Math.random() * 0.35, 0.65, 0.45);
		}
		const terang = 1 - suasana.malam * 0.75;
		for (let i = 0; i < N_RIAK; i++) {
			const q = riak[i];
			q.u = Math.min(1, q.u + dt / q.lama);
			const s = q.u >= 1 ? 0.0001 : q.r * (0.15 + q.u * 0.85);
			bantu.position.set(q.x, 0, q.z);
			bantu.rotation.set(0, 0, 0);
			bantu.scale.setScalar(s);
			bantu.updateMatrix();
			m.setMatrixAt(i, bantu.matrix);
			m.setColorAt(i, warnaBantu.setScalar((1 - q.u) * q.kuat * terang));
		}
		m.instanceMatrix.needsUpdate = true;
		m.instanceColor.needsUpdate = true;
	});
	return <instancedMesh ref={inst} args={[GEO_RIAK, BAHAN_RIAK, N_RIAK]} position-y={AIR_Y + 0.02} frustumCulled={false} renderOrder={2} />;
}

// ---------- bebek: seekor induk diikuti anak-anaknya berbaris, tiap dermaga satu keluarga ----------
const N_ANAK = 3;
const GEO_BEBEK = gabung([
	warnai(new SphereGeometry(0.16, 8, 6), "#ffffff", { s: [0.85, 0.72, 1.3], p: [0, 0.06, 0] }),
	warnai(new ConeGeometry(0.07, 0.17, 6), "#ffffff", { r: [-2, 0, 0], p: [0, 0.12, -0.22] }),
	warnai(new CylinderGeometry(0.042, 0.06, 0.17, 6), "#ffffff", { r: [0.25, 0, 0], p: [0, 0.2, 0.15] }),
	warnai(new SphereGeometry(0.068, 8, 6), "#ffffff", { p: [0, 0.3, 0.18] }),
	warnai(new ConeGeometry(0.028, 0.09, 5), "#e8912a", { r: [Math.PI / 2, 0, 0], p: [0, 0.29, 0.27] }),
]);
const WARNA_INDUK = new Color("#8a6a48");
const WARNA_ANAK = new Color("#e8d27a");
const KECEPATAN_BEBEK = 0.55;

function airLapang(x, z) {
	return diSitu(x, z) && !dermagaDi(x, z, -3) && jarakKeTepi(x, z) > 2.2;
}
// titik tujuan acak yang garis lurusnya tidak memotong darat/dermaga
function tujuanBaru(x, z) {
	for (let c = 0; c < 16; c++) {
		const sudut = Math.random() * Math.PI * 2;
		const jauh = 8 + Math.random() * 22;
		const tx = x + Math.sin(sudut) * jauh;
		const tz = z + Math.cos(sudut) * jauh;
		let aman = airLapang(tx, tz);
		for (let s = 1; aman && s < 6; s++) aman = airLapang(x + ((tx - x) * s) / 6, z + ((tz - z) * s) / 6);
		if (aman) return { x: tx, z: tz };
	}
	return null;
}
function keluargaBaru(d, i) {
	const a = keDuniaDermaga(d, 22, i % 2 ? -11 : 11);
	const x = airLapang(a.x, a.z) ? a.x : keDuniaDermaga(d, 24, 0).x;
	const z = airLapang(a.x, a.z) ? a.z : keDuniaDermaga(d, 24, 0).z;
	return {
		tujuan: null,
		rehat: 1 + Math.random() * 3,
		riakLagi: 0,
		ekor: Array.from({ length: N_ANAK + 1 }, (_, k) => ({ x: x - k * 0.5, z, rot: 0 })),
	};
}

function Bebek() {
	const keluarga = useMemo(() => DERMAGA.map(keluargaBaru), []);
	const inst = useRef();
	const n = DERMAGA.length * (N_ANAK + 1);
	useLayoutEffect(() => {
		for (let i = 0; i < n; i++) inst.current.setColorAt(i, i % (N_ANAK + 1) ? WARNA_ANAK : WARNA_INDUK);
		inst.current.instanceColor.needsUpdate = true;
	}, [n]);
	useFrame(({ clock }, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		const t = clock.elapsedTime;
		let i = 0;
		for (const f of keluarga) {
			const induk = f.ekor[0];
			let bergerak = false;
			if (!f.tujuan) {
				f.rehat -= dt;
				if (f.rehat <= 0) {
					f.tujuan = tujuanBaru(induk.x, induk.z);
					f.rehat = 2 + Math.random() * 6;
				}
			} else {
				const dx = f.tujuan.x - induk.x;
				const dz = f.tujuan.z - induk.z;
				const jarak = Math.hypot(dx, dz);
				if (jarak < 0.5) f.tujuan = null;
				else {
					bergerak = true;
					const ke = Math.atan2(dx, dz);
					induk.rot += Math.atan2(Math.sin(ke - induk.rot), Math.cos(ke - induk.rot)) * Math.min(1, dt * 1.6);
					induk.x += Math.sin(induk.rot) * KECEPATAN_BEBEK * dt;
					induk.z += Math.cos(induk.rot) * KECEPATAN_BEBEK * dt;
				}
			}
			f.riakLagi -= dt;
			if (bergerak && f.riakLagi <= 0) {
				f.riakLagi = 1.1;
				tambahRiak(induk.x, induk.z, 0.7, 1.6, 0.22);
			}
			f.ekor.forEach((e, k) => {
				if (k) {
					// anak mengejar yang di depannya, menjaga jarak
					const dp = f.ekor[k - 1];
					const dx = dp.x - e.x;
					const dz = dp.z - e.z;
					const jarak = Math.hypot(dx, dz);
					if (jarak > 0.48) {
						const langkah = Math.min(jarak - 0.42, KECEPATAN_BEBEK * 1.5 * dt);
						e.x += (dx / jarak) * langkah;
						e.z += (dz / jarak) * langkah;
						e.rot = Math.atan2(dx, dz);
					}
				}
				bantu.position.set(e.x, Math.sin(t * 2.2 + k * 1.3 + i) * 0.012, e.z);
				bantu.rotation.set(0, e.rot, Math.sin(t * 1.7 + k) * 0.05);
				bantu.scale.setScalar(k ? 0.58 : 1.05);
				bantu.updateMatrix();
				inst.current.setMatrixAt(i++, bantu.matrix);
			});
		}
		inst.current.instanceMatrix.needsUpdate = true;
	});
	return <instancedMesh ref={inst} args={[GEO_BEBEK, BAHAN_WARNA, n]} position-y={AIR_Y} frustumCulled={false} />;
}

// ---------- kuntul: kawanan burung putih memutar di atas air, pulang saat malam & hujan ----------
const N_KUNTUL = 6;
function geometriKuntul() {
	// sayap kiri, sayap kanan, badan memanjang (kepala +z); ekor di −z
	const p = [-0.75, 0, -0.02, 0, 0, 0.14, 0, 0, -0.14, 0.75, 0, -0.02, 0, 0, -0.14, 0, 0, 0.14, 0, 0.03, 0.4, 0.05, 0, -0.1, -0.05, 0, -0.1, 0, 0, -0.1, 0.09, 0, -0.34, -0.09, 0, -0.34];
	const g = new BufferGeometry();
	g.setAttribute("position", new Float32BufferAttribute(p, 3));
	g.computeVertexNormals();
	return g;
}
const GEO_KUNTUL = geometriKuntul();
const BAHAN_KUNTUL = pasangGoyang(
	new MeshStandardMaterial({ color: "#f8fafc", side: DoubleSide, roughness: 0.8 }),
	"transformed.y += abs(position.x) * sin(uWaktu * 5.5 + instanceMatrix[3].x * 0.9 + instanceMatrix[3].z * 0.7) * 0.42;",
);

function Kuntul() {
	const inst = useRef();
	const kawanan = useMemo(
		() => DERMAGA.map((d, i) => ({ pusat: keDuniaDermaga(d, 42, i % 2 ? 12 : -12), R: 30 + i * 6, y: 15 + i * 2, fase: i * 2.1, arah: i % 2 ? 1 : -1 })),
		[],
	);
	const n = DERMAGA.length * N_KUNTUL;
	useFrame(({ clock }) => {
		const m = inst.current;
		m.visible = suasana.malam < 0.5 && suasana.hujan < 0.35;
		if (!m.visible) return;
		const t = clock.elapsedTime;
		let i = 0;
		for (const f of kawanan) {
			for (let k = 0; k < N_KUNTUL; k++) {
				// formasi V longgar: tertinggal di sudut & melebar ke samping selang-seling
				const baris = Math.ceil(k / 2);
				const u = t * 0.1 * f.arah + f.fase - baris * 0.05 * f.arah;
				const R = f.R + (k % 2 ? 1 : -1) * baris * 1.4;
				bantu.position.set(f.pusat.x + Math.sin(u) * R, f.y + Math.sin(t * 0.3 + k) * 0.5, f.pusat.z + Math.cos(u) * R);
				bantu.rotation.set(0, u + (f.arah * Math.PI) / 2, -0.18 * f.arah);
				bantu.scale.setScalar(1);
				bantu.updateMatrix();
				m.setMatrixAt(i++, bantu.matrix);
			}
		}
		m.instanceMatrix.needsUpdate = true;
	});
	return <instancedMesh ref={inst} args={[GEO_KUNTUL, BAHAN_KUNTUL, n]} frustumCulled={false} />;
}

export default function SuasanaSitu() {
	useFrame(({ clock }) => {
		WAKTU.value = clock.elapsedTime;
	});
	return (
		<group name="suasana-situ">
			<AirDangkal />
			<Mendong />
			<Riak />
			<Bebek />
			<Kuntul />
		</group>
	);
}
