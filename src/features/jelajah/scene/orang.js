import {
	BoxGeometry,
	CapsuleGeometry,
	Color,
	CylinderGeometry,
	Float32BufferAttribute,
	MeshStandardMaterial,
	SphereGeometry,
	TorusGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Perakit tokoh manusia. Semua bagian tubuh digabung menjadi beberapa geometri
// berwarna-per-titik (vertex color) dengan satu material bersama, sehingga satu
// orang hanya 3–9 draw call walau detailnya banyak (kerah, saku, epolet, papan
// nama, lencana, kacamata, kerudung).

export const BAHAN_ORANG = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });

// Seragam: PDH khaki Pemda (PNS/PPPK), satpam (kemeja putih, celana & topi biru tua),
// petugas kebersihan (kaos toska, topi), dan kemeja putih tenaga alih daya.
// "warga" memakai warna baju/celana dari penampilannya sendiri.
const SERAGAM = {
	pdh: { baju: "#b09862", gelap: "#8f7a4c", celana: "#8d7550", detail: true },
	satpam: { baju: "#eceff3", gelap: "#1b2a4a", celana: "#1b2a4a", detail: true, topi: "#1b2a4a" },
	kebersihan: { baju: "#2a8c86", gelap: "#1f6a65", celana: "#2b3a42", topi: "#2a8c86" },
	kemeja: { baju: "#f2f2ee", gelap: "#cfcfca", celana: "#2a2a2e" },
};
const seragam = (p) => SERAGAM[p.seragam] || { baju: p.baju, gelap: gelapkan(p.baju, 0.75), celana: p.celana };

const warna = new Color();

function bentuk(geom, w, pos = [0, 0, 0], rot = [0, 0, 0], skala = [1, 1, 1]) {
	let g = geom.index ? geom.toNonIndexed() : geom;
	g.deleteAttribute("uv");
	g.scale(...skala);
	if (rot[0]) g.rotateX(rot[0]);
	if (rot[1]) g.rotateY(rot[1]);
	if (rot[2]) g.rotateZ(rot[2]);
	g.translate(...pos);
	warna.set(w);
	const n = g.attributes.position.count;
	const arr = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) arr.set([warna.r, warna.g, warna.b], i * 3);
	g.setAttribute("color", new Float32BufferAttribute(arr, 3));
	return g;
}

const gabung = (daftar) => mergeGeometries(daftar.filter(Boolean));
const gelapkan = (w, k) => "#" + new Color(w).multiplyScalar(k).getHexString();

// Bagian badan atas (dari pinggang ke leher), di koordinat berdiri. `u` = geser
// vertikal (duduk = -0.4).
function badanAtas(p, u) {
	const { baju, gelap, detail } = seragam(p);
	const daftar = [
		bentuk(new CylinderGeometry(0.205, 0.178, 0.56, 12), baju, [0, 1.19 + u, 0], [0, 0, 0], [1, 1, 0.62]),
		bentuk(new CapsuleGeometry(0.085, 0.33, 4, 8), baju, [0, 1.43 + u, 0], [0, 0, Math.PI / 2], [1, 1, 0.75]),
		bentuk(new CylinderGeometry(0.055, 0.06, 0.1, 8), p.kulit, [0, 1.55 + u, 0]),
		bentuk(new CylinderGeometry(0.182, 0.182, 0.05, 12), "#1c1c1c", [0, 0.93 + u, 0], [0, 0, 0], [1, 1, 0.64]),
		// kerah
		bentuk(new BoxGeometry(0.09, 0.045, 0.02), gelap, [0.05, 1.49 + u, 0.105], [0, 0, 0.45]),
		bentuk(new BoxGeometry(0.09, 0.045, 0.02), gelap, [-0.05, 1.49 + u, 0.105], [0, 0, -0.45]),
	];
	if (detail) {
		daftar.push(
			// saku dada, epolet, papan nama (kanan), lencana Korpri (kiri), gesper
			bentuk(new BoxGeometry(0.095, 0.11, 0.012), gelap, [0.085, 1.29 + u, 0.122]),
			bentuk(new BoxGeometry(0.095, 0.11, 0.012), gelap, [-0.085, 1.29 + u, 0.122]),
			bentuk(new BoxGeometry(0.065, 0.018, 0.15), gelap, [0.2, 1.515 + u, 0]),
			bentuk(new BoxGeometry(0.065, 0.018, 0.15), gelap, [-0.2, 1.515 + u, 0]),
			bentuk(new BoxGeometry(0.085, 0.022, 0.008), "#141414", [-0.085, 1.375 + u, 0.13]),
			bentuk(new CylinderGeometry(0.017, 0.017, 0.008, 8), "#d9c47a", [0.085, 1.4 + u, 0.13], [Math.PI / 2, 0, 0]),
			bentuk(new BoxGeometry(0.05, 0.035, 0.01), "#c9b26a", [0, 0.93 + u, 0.12]),
		);
	}
	if (p.jilbab) {
		// selendang kerudung menutup bahu
		daftar.push(bentuk(new CylinderGeometry(0.11, 0.27, 0.3, 14, 1, true), p.jilbab, [0, 1.48 + u, 0], [0, 0, 0], [1, 1, 0.85]));
	}
	return daftar;
}

function geometriKepala(p) {
	const daftar = [
		bentuk(new SphereGeometry(0.112, 14, 10), p.kulit, [0, 0.135, 0.005], [0, 0, 0], [0.93, 1.07, 1]),
		bentuk(new SphereGeometry(0.025, 6, 4), p.kulit, [0.105, 0.13, 0]),
		bentuk(new SphereGeometry(0.025, 6, 4), p.kulit, [-0.105, 0.13, 0]),
		bentuk(new SphereGeometry(0.014, 6, 4), "#151515", [0.038, 0.15, 0.098]),
		bentuk(new SphereGeometry(0.014, 6, 4), "#151515", [-0.038, 0.15, 0.098]),
		bentuk(new BoxGeometry(0.02, 0.03, 0.02), gelapkan(p.kulit, 0.92), [0, 0.125, 0.11]),
		bentuk(new BoxGeometry(0.04, 0.008, 0.006), "#8d4a3e", [0, 0.088, 0.103]),
	];
	if (p.jilbab) {
		daftar.push(bentuk(new SphereGeometry(0.127, 14, 10, Math.PI / 2 + 0.62, Math.PI * 2 - 1.24), p.jilbab, [0, 0.14, 0], [0, 0, 0], [0.95, 1.08, 1]));
	} else {
		daftar.push(
			bentuk(new BoxGeometry(0.035, 0.008, 0.008), p.rambut, [0.038, 0.178, 0.1]),
			bentuk(new BoxGeometry(0.035, 0.008, 0.008), p.rambut, [-0.038, 0.178, 0.1]),
			bentuk(new SphereGeometry(0.119, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), p.rambut, [0, 0.15, -0.008]),
		);
		if (p.perempuan) daftar.push(bentuk(new BoxGeometry(0.21, 0.26, 0.06), p.rambut, [0, 0.05, -0.08]));
	}
	const topi = seragam(p).topi;
	if (topi && !p.jilbab) {
		daftar.push(
			bentuk(new CylinderGeometry(0.118, 0.124, 0.075, 14), topi, [0, 0.235, -0.005]),
			bentuk(new BoxGeometry(0.2, 0.015, 0.12), topi, [0, 0.205, 0.11]),
		);
	}
	if (p.kacamata) {
		daftar.push(
			bentuk(new TorusGeometry(0.026, 0.004, 4, 12), "#1a1a1a", [0.038, 0.15, 0.106]),
			bentuk(new TorusGeometry(0.026, 0.004, 4, 12), "#1a1a1a", [-0.038, 0.15, 0.106]),
			bentuk(new BoxGeometry(0.025, 0.004, 0.004), "#1a1a1a", [0, 0.155, 0.108]),
		);
	}
	return gabung(daftar);
}

const bajuDari = (p) => seragam(p).baju;
const celanaDari = (p) => seragam(p).celana;

// Lengan atas (pangkal di bahu) dan lengan bawah + tangan (pangkal di siku).
const lenganAtas = (p) => bentuk(new CylinderGeometry(0.05, 0.045, 0.29, 8), bajuDari(p), [0, -0.145, 0]);
function lenganBawah(p, map, alat) {
	const daftar = [
		bentuk(new CylinderGeometry(0.045, 0.04, 0.25, 8), bajuDari(p), [0, -0.125, 0]),
		bentuk(new SphereGeometry(0.045, 8, 6), p.kulit, [0, -0.28, 0]),
	];
	if (map) daftar.push(bentuk(new BoxGeometry(0.24, 0.3, 0.025), "#2f6db0", [0, -0.3, 0.06]));
	// alat pel / sapu: gagang menjulur dari genggaman ke lantai
	if (alat) {
		daftar.push(bentuk(new CylinderGeometry(0.015, 0.015, 1.3, 6), "#c9c9c9", [0, -0.28 - 0.62, 0]));
		daftar.push(
			alat === "sapu"
				? bentuk(new BoxGeometry(0.34, 0.16, 0.1), "#b58b4c", [0, -0.28 - 1.3, 0])
				: bentuk(new BoxGeometry(0.38, 0.06, 0.16), "#e8e8e8", [0, -0.28 - 1.28, 0]),
		);
	}
	return gabung(daftar);
}

// Kaki (pangkal di pinggul) lengkap dengan sepatu. Bila memakai rok panjang,
// yang terlihat hanya betis bawah dan sepatu.
function geometriKaki(p) {
	const celana = celanaDari(p);
	return gabung([
		p.rok
			? bentuk(new BoxGeometry(0.11, 0.3, 0.12), gelapkan(p.kulit, 0.85), [0, -0.66, 0])
			: bentuk(new BoxGeometry(0.135, 0.8, 0.15), celana, [0, -0.4, 0]),
		bentuk(new BoxGeometry(0.12, 0.08, 0.25), "#141414", [0, -0.84, 0.04]),
	]);
}

// Lengan diputar di sekitar pangkalnya lalu dipindah ke posisi bahu/siku,
// untuk pose yang tidak dianimasikan (lengan menyatu dengan badan).
function lenganStatis(p, sisi, u, sudutAtas, sudutBawah, map = false) {
	const bahu = [sisi * 0.245, 1.43 + u, 0];
	const atas = lenganAtas(p).rotateX(sudutAtas).translate(...bahu);
	const siku = [bahu[0], bahu[1] - 0.29 * Math.cos(sudutAtas), bahu[2] - 0.29 * Math.sin(sudutAtas)];
	const bawah = lenganBawah(p, map).rotateX(sudutAtas + sudutBawah).translate(...siku);
	return [atas, bawah];
}

// pose: "jalan" (lengan & kaki terpisah untuk animasi), "diam" (berdiri, satu
// badan), "duduk" (kaki tertekuk, tangan di atas meja dipisah untuk animasi).
export function rakitOrang(p, pose) {
	const celana = celanaDari(p);
	if (pose === "duduk") {
		const u = -0.4;
		const kaki = [];
		for (const s of [-1, 1]) {
			kaki.push(
				bentuk(new BoxGeometry(0.14, 0.15, 0.44), celana, [s * 0.095, 0.5, 0.2]),
				bentuk(new BoxGeometry(0.13, 0.44, 0.14), p.rok ? gelapkan(p.kulit, 0.85) : celana, [s * 0.095, 0.26, 0.42]),
				bentuk(new BoxGeometry(0.12, 0.08, 0.25), "#141414", [s * 0.095, 0.04, 0.48]),
			);
		}
		if (p.rok) kaki.push(bentuk(new BoxGeometry(0.42, 0.12, 0.5), celana, [0, 0.53, 0.18]));
		const lenganAtasStatis = [-1, 1].map((s) => lenganAtas(p).rotateX(-0.55).translate(s * 0.245, 1.43 + u, 0));
		const siku = [1.43 + u - 0.29 * Math.cos(-0.55), -0.29 * Math.sin(-0.55)];
		const tangan = gabung([-1, 1].map((s) => lenganBawah(p).rotateX(-1.6).translate(s * 0.245, siku[0], siku[1])));
		return {
			badan: gabung([...badanAtas(p, u), ...kaki, ...lenganAtasStatis]),
			kepala: geometriKepala(p),
			kepalaY: 1.58 + u,
			tangan,
		};
	}
	if (pose === "diam") {
		const tangan = p.map ? [...lenganStatis(p, -1, 0, -0.15, -1.25, true), ...lenganStatis(p, 1, 0, 0.05, -0.1)] : [...lenganStatis(p, -1, 0, 0.05, -0.1), ...lenganStatis(p, 1, 0, 0.05, -0.1)];
		const kaki = [-1, 1].map((s) => geometriKaki(p).translate(s * 0.095, 0.9, 0));
		const rok = p.rok ? [bentuk(new CylinderGeometry(0.19, 0.27, 0.62, 12), celana, [0, 0.6, 0], [0, 0, 0], [1, 1, 0.78])] : [];
		return { badan: gabung([...badanAtas(p, 0), ...tangan, ...kaki, ...rok]), kepala: geometriKepala(p), kepalaY: 1.58 };
	}
	// jalan
	return {
		badan: gabung([...badanAtas(p, 0), ...(p.rok ? [bentuk(new CylinderGeometry(0.19, 0.27, 0.62, 12), celana, [0, 0.6, 0], [0, 0, 0], [1, 1, 0.78])] : [])]),
		kepala: geometriKepala(p),
		kepalaY: 1.58,
		lenganAtas: lenganAtas(p),
		lenganBawahKiri: lenganBawah(p, false),
		lenganBawahKanan: lenganBawah(p, p.map, p.alat),
		kaki: geometriKaki(p),
	};
}

export function buangOrang(g) {
	for (const v of Object.values(g)) v?.dispose?.();
}
