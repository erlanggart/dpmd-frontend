import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
	BufferGeometry,
	CanvasTexture,
	Color,
	ConeGeometry,
	CylinderGeometry,
	DoubleSide,
	Float32BufferAttribute,
	MeshStandardMaterial,
	Object3D,
	Path,
	Shape,
	ShapeGeometry,
	RepeatWrapping,
	ShapeUtils,
	SphereGeometry,
	SRGBColorSpace,
	Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { warnai } from "./geometri";
import { JALAN_TAMPIL, POHON_TAMPIL as POHON_KAWASAN, pasangan, tinggiGedung } from "./kawasanBantu";
import { AIR, AREA, GEDUNG, JENIS_AREA, JENIS_GEDUNG, JENIS_JALAN, LABEL as LABEL_DATA, SUNGAI } from "./kawasanData";
import { LABEL_SITU } from "./situ";
import { LABEL_KHUSUS } from "./gedungKhusus";
import SituPemda from "./SituPemda.jsx";
import KolamMonster from "./KolamMonster.jsx";
import { suasana } from "./suasana";

// Kawasan Kompleks Perkantoran Pemda Kabupaten Bogor di sekeliling kantor DPMD, dari
// data OpenStreetMap (kawasanData.js): Kantor Bupati, Setda, DPRD, dinas-dinas, alun-alun,
// Stadion Persikabo, Masjid Baitul Faizin, dan Situ Pemda tepat di belakang kantor.
// Semua benda statis dan dipanggang menjadi beberapa geometri berwarna-per-titik;
// gedung dibagi per petak 200 m supaya yang jauh tidak digambar.
// Semua y di sini relatif terhadap halaman (komponen ini dipasang di grup y = TANAH).

const PETAK = 200;
const JARAK_GAMBAR = 380;
const JARAK_LABEL = [170, 300]; // gedung, area
const LABEL = [...LABEL_DATA, ...LABEL_SITU, ...LABEL_KHUSUS];

const IDX = Object.fromEntries(JENIS_GEDUNG.map((j, i) => [j, i]));
const WARNA_RUMAH = ["#efe6d2", "#f2e3c6", "#e8d8c3", "#f4efe6", "#dfe7e0", "#f0dcd0", "#e6e0cf", "#f6e7b8"];
const ATAP_RUMAH = ["#a4553f", "#8e4a37", "#b4643f", "#6b6e72", "#7a3f2e", "#9b5a3c"];
const WARNA_KANTOR = ["#f1ede4", "#ece6d8", "#efe9dc", "#e9e4d6", "#f3efe8"];
const ATAP_KANTOR = ["#4f6f4f", "#8d4f3c", "#5a5f66", "#6d7f5a"];

const acak = (i, k = 0) => {
	const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
	return x - Math.floor(x);
};
const pilih = (daftar, i, k) => daftar[Math.floor(acak(i, k) * daftar.length)];

// ---------- penyusun geometri ----------

// Kumpulan segitiga berwarna (tak berindeks). `arah` 1/-1 memaksa segitiga menghadap ke
// atas/bawah, untuk permukaan tanah/atap yang urutan titiknya tak menentu.
class Wadah {
	constructor() {
		this.pos = [];
		this.warna = [];
		this.ekstra = [];
		this.c = new Color();
	}
	segitiga(a, b, c, w, arah = 0) {
		if (arah) {
			const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
			if (ny * arah < 0) [b, c] = [c, b];
		}
		this.pos.push(...a, ...b, ...c);
		this.c.set(w);
		for (let i = 0; i < 3; i++) this.warna.push(this.c.r, this.c.g, this.c.b);
	}
	segiempat(a, b, c, d, w, arah) {
		this.segitiga(a, b, c, w, arah);
		this.segitiga(a, c, d, w, arah);
	}
	// Poligon datar [[x, z], ...] pada ketinggian y.
	poligon(p, y, w) {
		const kontur = p.map(([x, z]) => new Vector2(x, z));
		for (const [a, b, c] of ShapeUtils.triangulateShape(kontur, [])) this.segitiga([p[a][0], y, p[a][1]], [p[b][0], y, p[b][1]], [p[c][0], y, p[c][1]], w, 1);
	}
	// Pita selebar `lebar` mengikuti garis p pada ketinggian y, plus bundaran di ujung
	// supaya sambungan antarjalan tidak berlubang.
	pita(p, lebar, y, w, ujung = true) {
		const h = lebar / 2;
		const kiri = [];
		const kanan = [];
		for (let i = 0; i < p.length; i++) {
			const a = p[Math.max(0, i - 1)];
			const b = p[Math.min(p.length - 1, i + 1)];
			let dx = b[0] - a[0];
			let dz = b[1] - a[1];
			const pj = Math.hypot(dx, dz) || 1;
			dx /= pj;
			dz /= pj;
			// panjang sambungan (miter) dibatasi supaya tikungan tajam tidak meruncing jauh
			let s = 1;
			if (i > 0 && i < p.length - 1) {
				const ax = p[i][0] - p[i - 1][0];
				const az = p[i][1] - p[i - 1][1];
				const al = Math.hypot(ax, az) || 1;
				const cos = (ax / al) * dx + (az / al) * dz;
				s = Math.min(2, 1 / Math.max(0.3, cos));
			}
			kiri.push([p[i][0] - dz * h * s, y, p[i][1] + dx * h * s]);
			kanan.push([p[i][0] + dz * h * s, y, p[i][1] - dx * h * s]);
		}
		for (let i = 0; i < p.length - 1; i++) this.segiempat(kiri[i], kanan[i], kanan[i + 1], kiri[i + 1], w, 1);
		if (ujung) for (const q of [p[0], p[p.length - 1]]) this.bundar(q, h, y, w);
	}
	bundar([x, z], r, y, w, n = 10) {
		for (let i = 0; i < n; i++) {
			const a0 = (i / n) * Math.PI * 2;
			const a1 = ((i + 1) / n) * Math.PI * 2;
			this.segitiga([x, y, z], [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], w, 1);
		}
	}
	geometri(atributNyala) {
		if (!this.pos.length && !this.ekstra.length) return null;
		const g = new BufferGeometry();
		g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
		g.setAttribute("color", new Float32BufferAttribute(this.warna, 3));
		if (atributNyala) g.setAttribute("nyala", new Float32BufferAttribute(atributNyala, 1));
		g.computeVertexNormals();
		if (!this.ekstra.length) return g;
		const hasil = mergeGeometries([g, ...this.ekstra]);
		g.dispose();
		this.ekstra.forEach((e) => e.dispose());
		return hasil;
	}
}

// ---------- gedung ----------

const luasBertanda = (p) => p.reduce((s, [x1, z1], i) => s + x1 * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * z1, 0) / 2;

// Atap limas di atas tapak segi empat (rumah & kantor kecil), dengan teritis.
function atapLimas(w, p, y, warna) {
	const cx = (p[0][0] + p[1][0] + p[2][0] + p[3][0]) / 4;
	const cz = (p[0][1] + p[1][1] + p[2][1] + p[3][1]) / 4;
	const e0 = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]);
	const e1 = Math.hypot(p[2][0] - p[1][0], p[2][1] - p[1][1]);
	const [a, b] = e0 >= e1 ? [p[0], p[1]] : [p[1], p[2]];
	const ux = (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
	const uz = (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
	const vx = -uz;
	const vz = ux;
	let pu = 0;
	let pv = 0;
	for (const [x, z] of p) {
		pu = Math.max(pu, Math.abs((x - cx) * ux + (z - cz) * uz));
		pv = Math.max(pv, Math.abs((x - cx) * vx + (z - cz) * vz));
	}
	const o = 0.45;
	const A = pu + o;
	const B = pv + o;
	const t = Math.min(B * 0.6, 3.2);
	const titik = (u, v, h) => [cx + ux * u + vx * v, y + h, cz + uz * u + vz * v];
	const r = Math.max(0, A - B);
	const [k1, k2, k3, k4] = [titik(A, B, 0), titik(-A, B, 0), titik(-A, -B, 0), titik(A, -B, 0)];
	const [r1, r2] = [titik(r, 0, t), titik(-r, 0, t)];
	const gelap = new Color(warna).multiplyScalar(0.82).getStyle();
	w.segiempat(k1, k2, r2, r1, warna, 1);
	w.segiempat(k3, k4, r1, r2, warna, 1);
	w.segitiga(k4, k1, r1, gelap, 1);
	w.segitiga(k2, k3, r2, gelap, 1);
	// sisi bawah teritis (agar tidak tembus pandang dari bawah)
	w.segiempat(k1, k4, k3, k2, "#d9d2c3", -1);
}

function susunGedung() {
	const petak = new Map();
	const ambil = (cx, cz) => {
		const k = `${Math.floor(cx / PETAK)},${Math.floor(cz / PETAK)}`;
		if (!petak.has(k)) petak.set(k, { badan: new Wadah(), kaca: new Wadah(), nyala: [] });
		return petak.get(k);
	};

	GEDUNG.forEach(([jenis, lantai, f], i) => {
		let p = pasangan(f);
		// urutan titik dibuat searah jarum jam (luas bertanda < 0) → normal dinding ke luar
		if (luasBertanda(p) > 0) p = p.reverse();
		const cx = p.reduce((s, q) => s + q[0], 0) / p.length;
		const cz = p.reduce((s, q) => s + q[1], 0) / p.length;
		const { badan, kaca, nyala } = ambil(cx, cz);
		const rumah = jenis === IDX.rumah;
		const H = tinggiGedung(jenis, lantai);
		const perLantai = H / lantai;

		if (jenis === IDX.atap) {
			// atap peneduh di atas tiang (SPBU, selasar)
			badan.poligon(p, 4.6, "#e5e7eb");
			for (const [x, z] of p) {
				badan.segiempat([x - 0.15, 0, z], [x + 0.15, 0, z], [x + 0.15, 4.6, z], [x - 0.15, 4.6, z], "#9ca3af");
				badan.segiempat([x, 0, z - 0.15], [x, 0, z + 0.15], [x, 4.6, z + 0.15], [x, 4.6, z - 0.15], "#9ca3af");
			}
			return;
		}

		const dinding =
			jenis === IDX.rs ? "#f4f6f6" : jenis === IDX.gudang ? "#c9ccd0" : jenis === IDX.niaga ? "#f5f0e6" : rumah ? pilih(WARNA_RUMAH, i, 1) : pilih(WARNA_KANTOR, i, 1);
		const limas = p.length === 4 && (rumah || Math.abs(luasBertanda(p)) < 900);
		const tembok = limas ? H : H + 0.6; // atap datar dikelilingi parapet setinggi 0,6 m
		const alas = new Color(dinding).multiplyScalar(0.78).getStyle();

		for (let k = 0; k < p.length; k++) {
			const [ax, az] = p[k];
			const [bx, bz] = p[(k + 1) % p.length];
			// kaki gedung sedikit lebih gelap
			badan.segiempat([ax, 0, az], [bx, 0, bz], [bx, 0.5, bz], [ax, 0.5, az], alas);
			badan.segiempat([ax, 0.5, az], [bx, 0.5, bz], [bx, tembok, bz], [ax, tembok, az], dinding);
			if (!limas) badan.segiempat([bx, H, bz], [ax, H, az], [ax, tembok, az], [bx, tembok, bz], dinding);

			// jendela: panel kaca sedikit di depan dinding
			const pj = Math.hypot(bx - ax, bz - az);
			const lebarPanel = rumah ? 1.1 : 2.3;
			const jarak = rumah ? 3.2 : 2.7;
			const n = Math.floor((pj - 1.2) / jarak);
			if (n < 1 || jenis === IDX.gudang) continue;
			const ux = (bx - ax) / pj;
			const uz = (bz - az) / pj;
			// normal luar (titik searah jarum jam) = (-uz, ux)
			const nx = -uz * 0.04;
			const nz = ux * 0.04;
			const mulai = (pj - n * jarak) / 2 + (jarak - lebarPanel) / 2;
			for (let l = 0; l < lantai; l++) {
				const y0 = l * perLantai + (rumah ? 1.0 : 1.05);
				const y1 = y0 + (rumah ? 1.2 : 1.5);
				for (let m = 0; m < n; m++) {
					const d0 = mulai + m * jarak;
					const d1 = d0 + lebarPanel;
					const q0 = [ax + ux * d0 + nx, 0, az + uz * d0 + nz];
					const q1 = [ax + ux * d1 + nx, 0, az + uz * d1 + nz];
					kaca.segiempat([q0[0], y0, q0[2]], [q1[0], y0, q1[2]], [q1[0], y1, q1[2]], [q0[0], y1, q0[2]], rumah ? "#3b4654" : "#4f6378");
					const v = acak(i * 31 + k * 7 + l * 3 + m, 2) < (rumah ? 0.7 : 0.35) ? 0.6 + acak(i + m, 5) * 0.6 : 0;
					for (let s = 0; s < 6; s++) nyala.push(v);
				}
			}
		}

		if (limas) atapLimas(badan, p, H, rumah ? pilih(ATAP_RUMAH, i, 2) : pilih(ATAP_KANTOR, i, 2));
		else badan.poligon(p, H, jenis === IDX.masjid ? "#e9e4d6" : "#aaa397");

		if (jenis === IDX.masjid) {
			// kubah & menara
			const r = Math.min(7, Math.max(2.4, Math.sqrt(Math.abs(luasBertanda(p))) / 4.5));
			badan.ekstra.push(warnai(new CylinderGeometry(r * 0.92, r * 0.92, 1.2, 20), "#f1ede4", { p: [cx, H + 0.6, cz] }));
			badan.ekstra.push(warnai(new SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), "#2f7d63", { p: [cx, H + 1.2, cz] }));
			badan.ekstra.push(warnai(new ConeGeometry(0.25, 1.6, 8), "#d4af37", { p: [cx, H + 1.2 + r + 0.7, cz] }));
			const [mx, mz] = p[0];
			const t = H + r + 6;
			badan.ekstra.push(warnai(new CylinderGeometry(0.75, 0.95, t, 10), "#f3efe8", { p: [mx, t / 2, mz] }));
			badan.ekstra.push(warnai(new ConeGeometry(1.0, 2.6, 10), "#2f7d63", { p: [mx, t + 1.3, mz] }));
		}
	});

	return [...petak.values()].map(({ badan, kaca, nyala }) => ({ badan: badan.geometri(), kaca: kaca.geometri(nyala) }));
}

// Kaca jendela menyala hangat di malam hari; `nyala` per panel (0 = gelap) supaya
// tidak semua jendela terang.
const BAHAN_KACA = new MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.3, emissive: "#ffd59a" });
const malamKaca = { value: 0 };
BAHAN_KACA.onBeforeCompile = (sh) => {
	sh.uniforms.malam = malamKaca;
	sh.vertexShader = `attribute float nyala;\nvarying float vNyala;\n${sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvNyala = nyala;")}`;
	sh.fragmentShader = `uniform float malam;\nvarying float vNyala;\n${sh.fragmentShader.replace(
		"vec3 totalEmissiveRadiance = emissive;",
		"vec3 totalEmissiveRadiance = emissive * vNyala * malam;",
	)}`;
};
BAHAN_KACA.customProgramCacheKey = () => "kaca-kawasan";
const BAHAN_GEDUNG = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });

function Gedung() {
	const petak = useMemo(susunGedung, []);
	const grup = useRef();
	const t = useRef(1);
	useEffect(() => () => petak.forEach((p) => [p.badan, p.kaca].forEach((g) => g?.dispose())), [petak]);

	useFrame(({ camera }, dt) => {
		malamKaca.value = suasana.malam;
		// petak yang jauh disembunyikan, diperiksa dua kali sedetik saja
		t.current += dt;
		if (t.current < 0.5) return;
		t.current = 0;
		for (const m of grup.current.children) {
			const b = m.geometry.boundingSphere;
			m.visible = camera.position.distanceTo(b.center) - b.radius < JARAK_GAMBAR;
		}
	});

	useLayoutEffect(() => {
		for (const m of grup.current.children) m.geometry.computeBoundingSphere();
	}, []);

	return (
		<group ref={grup}>
			{petak.flatMap((p, i) => [
				p.badan && <mesh key={`b${i}`} geometry={p.badan} material={BAHAN_GEDUNG} />,
				p.kaca && <mesh key={`k${i}`} geometry={p.kaca} material={BAHAN_KACA} />,
			])}
		</group>
	);
}

// ---------- tanah, situ, area, jalan ----------

const lapis = (urutan, ekstra = {}) =>
	new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -urutan, polygonOffsetUnits: -urutan * 2, ...ekstra });

const WARNA_AREA = { taman: "#7fae5c", lapangan: "#5f9e45", stadion: "#b8573f", plaza: "#d6cfc1", parkir: "#a9a7a1", lapanganKeras: "#4f8f8b" };
const WARNA_JALAN = { utama: "#4a4d52", sedang: "#4f5257", kecil: "#5c5f63", gang: "#8a8780", setapak: "#cdc5b5" };
// Tiap jenis jalan berlapis sendiri (bahan berpolygonOffset bertingkat) dan berselisih tinggi
// ±6 mm: dulu semuanya satu bahan berselisih 2 mm, sehingga di persimpangan antarjenis
// warnanya berebut kedalaman (berkedip) begitu dilihat dari agak jauh.
const Y_JALAN = { utama: 0.05, sedang: 0.044, kecil: 0.038, gang: 0.032, setapak: 0.026 };
const URUT_JALAN = ["setapak", "gang", "kecil", "sedang", "utama"];

function susunPermukaan() {
	const area = new Wadah();
	const atas = new Wadah(); // lapangan di dalam stadion/taman
	const jalan = Object.fromEntries(URUT_JALAN.map((j) => [j, new Wadah()]));
	const marka = new Wadah();
	const talud = new Wadah();

	for (const [j, f] of AREA) {
		const jenis = JENIS_AREA[j];
		const w = jenis === "lapangan" || jenis === "lapanganKeras" ? atas : area;
		w.poligon(pasangan(f), w === atas ? 0.018 : 0.01, WARNA_AREA[jenis]);
	}
	for (const [lebar, f] of SUNGAI) area.pita(pasangan(f), lebar, 0.012, "#3f7fa6");

	for (const [j, lebar, f] of JALAN_TAMPIL) {
		const jenis = JENIS_JALAN[j];
		const p = pasangan(f);
		jalan[jenis].pita(p, lebar, Y_JALAN[jenis], WARNA_JALAN[jenis]);
		// marka putus-putus di as jalan besar
		if (jenis === "utama" || jenis === "sedang") {
			let sisa = 0;
			for (let i = 0; i < p.length - 1; i++) {
				const [ax, az] = p[i];
				const [bx, bz] = p[i + 1];
				const pj = Math.hypot(bx - ax, bz - az);
				for (let d = sisa; d < pj - 2.5; d += 6) {
					const t0 = d / pj;
					const t1 = (d + 2.5) / pj;
					marka.pita(
						[
							[ax + (bx - ax) * t0, az + (bz - az) * t0],
							[ax + (bx - ax) * t1, az + (bz - az) * t1],
						],
						0.15,
						0.058,
						"#f1f1ec",
						false,
					);
				}
				sisa = Math.max(0, 6 - ((pj - sisa) % 6));
			}
		}
	}

	// Talud batu di sekeliling situ: dinding dari dasar air sampai sedikit di atas tanah,
	// plus bibir selebar 0,4 m.
	for (const f of AIR) {
		const p = pasangan(f);
		for (let k = 0; k < p.length; k++) {
			const [ax, az] = p[k];
			const [bx, bz] = p[(k + 1) % p.length];
			talud.segiempat([ax, -0.9, az], [bx, -0.9, bz], [bx, 0.1, bz], [ax, 0.1, az], "#8c877c");
		}
		talud.pita([...p, p[0]], 0.45, 0.1, "#a7a196", false);
	}

	return {
		area: area.geometri(),
		atas: atas.geometri(),
		...Object.fromEntries(URUT_JALAN.map((j) => ["jalan_" + j, jalan[j].geometri()])),
		marka: marka.geometri(),
		talud: talud.geometri(),
	};
}

// Tanah rumput seluas kawasan, berlubang tepat di situ supaya air bisa lebih rendah.
function geometriTanah() {
	const L = 2600;
	const s = new Shape([new Vector2(-L, L), new Vector2(L, L), new Vector2(L, -L), new Vector2(-L, -L)]);
	for (const f of AIR) s.holes.push(new Path(pasangan(f).map(([x, z]) => new Vector2(x, -z))));
	const g = new ShapeGeometry(s);
	g.rotateX(-Math.PI / 2);
	return g;
}

function geometriAir() {
	const daftar = AIR.map((f) => {
		const g = new ShapeGeometry(new Shape(pasangan(f).map(([x, z]) => new Vector2(x, -z))));
		g.rotateX(-Math.PI / 2);
		return g;
	});
	const g = mergeGeometries(daftar);
	daftar.forEach((d) => d.dispose());
	return g;
}

// Peta normal riak air yang bisa diulang tanpa sambungan (jumlah gelombang sinus berfrekuensi
// bulat). Digeser pelan tiap frame sehingga pantulan matahari di situ berkilau.
function teksturRiak() {
	const n = 128;
	const c = document.createElement("canvas");
	c.width = c.height = n;
	const g = c.getContext("2d");
	const img = g.createImageData(n, n);
	const gel = [
		[1, 2, 0.6, 0.3],
		[3, -1, 0.35, 1.7],
		[-2, 3, 0.3, 2.9],
		[5, 4, 0.18, 0.8],
		[-6, 1, 0.14, 4.1],
	];
	for (let y = 0; y < n; y++) {
		for (let x = 0; x < n; x++) {
			let dx = 0;
			let dy = 0;
			for (const [fx, fy, a, f] of gel) {
				const k = Math.cos(((fx * x + fy * y) / n) * Math.PI * 2 + f) * a;
				dx += k * fx;
				dy += k * fy;
			}
			const i = (y * n + x) * 4;
			img.data[i] = 128 + Math.max(-127, Math.min(127, dx * 14));
			img.data[i + 1] = 128 + Math.max(-127, Math.min(127, dy * 14));
			img.data[i + 2] = 255;
			img.data[i + 3] = 255;
		}
	}
	g.putImageData(img, 0, 0);
	const t = new CanvasTexture(c);
	t.wrapS = t.wrapT = RepeatWrapping;
	t.repeat.set(0.14, 0.14);
	return t;
}

const BAHAN = {
	area: lapis(1),
	atas: lapis(2),
	...Object.fromEntries(URUT_JALAN.map((j, i) => ["jalan_" + j, lapis(3 + i, { roughness: 0.9 })])),
	marka: lapis(9),
	talud: new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: DoubleSide }),
};

function Permukaan() {
	const geo = useMemo(susunPermukaan, []);
	const tanah = useMemo(geometriTanah, []);
	const air = useMemo(geometriAir, []);
	const riak = useMemo(teksturRiak, []);
	const bahanAir = useRef();
	useEffect(
		() => () => {
			Object.values(geo).forEach((g) => g?.dispose());
			tanah.dispose();
			air.dispose();
			riak.dispose();
		},
		[geo, tanah, air, riak],
	);
	// riak halus: warna air bergeser pelan, lebih gelap saat malam
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		bahanAir.current.color.setRGB(0.24 + Math.sin(t * 0.7) * 0.015, 0.5 + Math.sin(t * 0.5) * 0.02, 0.62).multiplyScalar((1 - suasana.malam * 0.6) * (1 - suasana.hujan * 0.25));
		// riak bergeser pelan; saat hujan permukaan lebih bergolak
		riak.offset.set(t * 0.011, t * 0.0075);
		const kasar = 0.45 + suasana.hujan * 0.6;
		bahanAir.current.normalScale.set(kasar, kasar);
	});

	return (
		<group>
			<mesh geometry={tanah} position-y={-0.03}>
				<meshStandardMaterial color="#8faa66" roughness={1} />
			</mesh>
			<mesh geometry={air} position-y={-0.45}>
				<meshStandardMaterial ref={bahanAir} color="#3d7f9e" roughness={0.1} metalness={0.35} normalMap={riak} />
			</mesh>
			{Object.entries(geo).map(([k, g]) => g && <mesh key={k} geometry={g} material={BAHAN[k]} />)}
		</group>
	);
}

// ---------- pepohonan ----------

const HIJAU = ["#4c9a5b", "#3f8a4f", "#5aa05a", "#467f3e", "#5c9c4a", "#3d7a46"];

function Pohon() {
	const batang = useRef();
	const daun = useRef();
	useLayoutEffect(() => {
		const o = new Object3D();
		const c = new Color();
		POHON_KAWASAN.forEach(([x, z, s], i) => {
			o.rotation.set(0, i * 1.7, 0);
			o.scale.set(s, s, s);
			o.position.set(x, 0.7 * s, z);
			o.updateMatrix();
			batang.current.setMatrixAt(i, o.matrix);
			const pipih = 0.8 + acak(i, 9) * 0.45;
			o.scale.set(s * (1 + acak(i, 8) * 0.25), s * pipih, s * (1 + acak(i, 7) * 0.25));
			o.position.set(x, (1.4 + 1.0 * pipih) * s, z);
			o.updateMatrix();
			daun.current.setMatrixAt(i, o.matrix);
			daun.current.setColorAt(i, c.set(HIJAU[i % HIJAU.length]));
		});
		batang.current.instanceMatrix.needsUpdate = true;
		daun.current.instanceMatrix.needsUpdate = true;
		daun.current.instanceColor.needsUpdate = true;
		batang.current.computeBoundingSphere();
		daun.current.computeBoundingSphere();
	}, []);
	return (
		<>
			<instancedMesh ref={batang} args={[null, null, POHON_KAWASAN.length]}>
				{/* tanpa tutup & 5 sisi: ribuan batang, ujungnya tertutup tanah & daun */}
				<cylinderGeometry args={[0.16, 0.24, 1.4, 5, 1, true]} />
				<meshStandardMaterial color="#6e4a2f" />
			</instancedMesh>
			<instancedMesh ref={daun} args={[null, null, POHON_KAWASAN.length]}>
				<icosahedronGeometry args={[1.3, 0]} />
				<meshStandardMaterial color="#ffffff" flatShading />
			</instancedMesh>
		</>
	);
}

// ---------- papan nama melayang ----------

const kotakBulat = (g, x, y, w, h, r) => {
	g.beginPath();
	if (g.roundRect) g.roundRect(x, y, w, h, r);
	else g.rect(x, y, w, h);
	g.fill();
};

function teksturLabel(teks, area) {
	const c = document.createElement("canvas");
	const g = c.getContext("2d");
	const font = `700 46px "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif`;
	g.font = font;
	const lebar = Math.ceil(g.measureText(teks).width) + 64;
	c.width = lebar;
	c.height = 84;
	g.font = font;
	g.fillStyle = "rgba(255,255,255,0.93)";
	kotakBulat(g, 2, 2, lebar - 4, 70, 16);
	g.fillStyle = area ? "#2563eb" : "#0f766e";
	kotakBulat(g, 2, 2, 14, 70, [16, 0, 0, 16]);
	// ekor penunjuk ke bawah
	g.fillStyle = "rgba(255,255,255,0.93)";
	g.beginPath();
	g.moveTo(lebar / 2 - 10, 71);
	g.lineTo(lebar / 2 + 10, 71);
	g.lineTo(lebar / 2, 83);
	g.fill();
	g.fillStyle = "#1f2937";
	g.textBaseline = "middle";
	g.fillText(teks, 34, 38);
	const t = new CanvasTexture(c);
	t.colorSpace = SRGBColorSpace;
	t.anisotropy = 4;
	return { t, rasio: c.width / c.height };
}

function Label() {
	const daftar = useMemo(
		() =>
			LABEL.map(([teks, x, z, y, jenis]) => {
				const { t, rasio } = teksturLabel(teks, jenis === 1);
				return { teks, x, z, y, jenis, t, rasio };
			}),
		[],
	);
	useEffect(() => () => daftar.forEach((d) => d.t.dispose()), [daftar]);
	const sprite = useRef([]);
	const waktu = useRef(1);

	useFrame(({ camera }, dt) => {
		waktu.current += dt;
		if (waktu.current < 0.25) return;
		waktu.current = 0;
		daftar.forEach((d, i) => {
			const s = sprite.current[i];
			if (!s) return;
			const jarak = Math.hypot(camera.position.x - d.x, camera.position.z - d.z);
			// papan hanya untuk penunjuk arah dari kejauhan; dari dekat malah menutupi layar
			s.visible = jarak > 14 && jarak < JARAK_LABEL[d.jenis];
			// yang jauh sedikit diperbesar supaya tetap terbaca
			const tinggi = 1.5 * Math.min(2.6, Math.max(1, jarak / 35));
			s.scale.set(tinggi * d.rasio, tinggi, 1);
		});
	});

	return daftar.map((d, i) => (
		<sprite key={i} ref={(el) => (sprite.current[i] = el)} position={[d.x, d.y, d.z]} center={[0.5, 0]} visible={false}>
			<spriteMaterial map={d.t} depthWrite={false} transparent toneMapped={false} />
		</sprite>
	));
}

export default function Kawasan({ daftarDinding }) {
	return (
		<group name="kawasan">
			<Permukaan />
			<SituPemda daftarDinding={daftarDinding} />
			<KolamMonster />
			<Gedung />
			<Pohon />
			<Label />
		</group>
	);
}
