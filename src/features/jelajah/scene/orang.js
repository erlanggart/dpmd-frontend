import {
	BoxGeometry,
	CapsuleGeometry,
	Color,
	ConeGeometry,
	CylinderGeometry,
	Float32BufferAttribute,
	MeshStandardMaterial,
	LatheGeometry,
	SphereGeometry,
	TorusGeometry,
	Vector2,
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

// profil badan dari pinggang (y 0) sampai pangkal leher (y 0.63): [jari-jari, tinggi]
const PROFIL_BADAN = [[0.176, 0], [0.184, 0.08], [0.194, 0.2], [0.205, 0.32], [0.208, 0.42], [0.2, 0.5], [0.172, 0.56], [0.12, 0.6], [0.05, 0.63], [0.001, 0.635]].map(([r, y]) => new Vector2(r, y));

// Bagian badan atas (dari pinggang ke leher), di koordinat berdiri. `u` = geser
// vertikal (duduk = -0.4).
function badanAtas(p, u) {
	const { baju, gelap, detail } = seragam(p);
	const daftar = [
		bentuk(new LatheGeometry(PROFIL_BADAN, 22), baju, [0, 0.91 + u, 0], [0, 0, 0], [1, 1, 0.61]),
		bentuk(new CapsuleGeometry(0.082, 0.33, 6, 14), baju, [0, 1.43 + u, 0], [0, 0, Math.PI / 2], [1, 1, 0.72]),
		bentuk(new CylinderGeometry(0.052, 0.06, 0.12, 14), p.kulit, [0, 1.55 + u, 0]),
		bentuk(new CylinderGeometry(0.183, 0.183, 0.05, 20), "#1c1c1c", [0, 0.93 + u, 0], [0, 0, 0], [1, 1, 0.62]),
		// panggul membulat menyambung ke paha
		!p.rok && bentuk(new SphereGeometry(0.182, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), seragam(p).celana, [0, 0.925 + u, 0], [0, 0, 0], [1, 0.42, 0.62]),
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
	daftar.push(...motifBaju(p, u));
	return daftar;
}

// Detail baju dari lemari gaya (lemari.js): motif di atas badan berwarna p.baju.
function motifBaju(p, u) {
	const d = [];
	const depan = 0.124;
	switch (p.motif) {
		case "merahputih":
			// separuh bawah putih
			d.push(bentuk(new CylinderGeometry(0.208, 0.181, 0.28, 12), "#f8fafc", [0, 1.05 + u, 0], [0, 0, 0], [1, 1, 0.64]));
			break;
		case "jersey":
			d.push(
				bentuk(new BoxGeometry(0.02, 0.5, 0.2), "#f8fafc", [0.2, 1.2 + u, 0]),
				bentuk(new BoxGeometry(0.02, 0.5, 0.2), "#f8fafc", [-0.2, 1.2 + u, 0]),
				bentuk(new BoxGeometry(0.05, 0.06, 0.012), "#facc15", [-0.085, 1.34 + u, depan]),
				bentuk(new BoxGeometry(0.09, 0.03, 0.012), "#f8fafc", [0, 1.46 + u, depan - 0.01]),
				// nomor punggung "10"
				bentuk(new BoxGeometry(0.025, 0.14, 0.012), "#f8fafc", [0.05, 1.27 + u, -depan]),
				bentuk(new TorusGeometry(0.04, 0.012, 4, 10), "#f8fafc", [-0.04, 1.27 + u, -depan], [0, 0, 0], [0.8, 1.6, 1]),
			);
			break;
		case "hoodie":
			d.push(
				bentuk(new SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), p.baju, [0, 1.47 + u, -0.1], [-1.2, 0, 0], [1, 1, 0.8]),
				bentuk(new BoxGeometry(0.24, 0.1, 0.012), gelapkan(p.baju, 0.75), [0, 1.03 + u, depan - 0.005]),
				bentuk(new BoxGeometry(0.008, 0.12, 0.008), "#e5e7eb", [0.035, 1.39 + u, depan]),
				bentuk(new BoxGeometry(0.008, 0.12, 0.008), "#e5e7eb", [-0.035, 1.39 + u, depan]),
			);
			break;
		case "batik":
			// belah ketupat parang berselang-seling per baris
			for (let r = 0; r < 6; r++) {
				for (let c = 0; c < 4; c++) {
					const x = -0.12 + c * 0.08 + (r % 2 ? 0.04 : 0);
					if (x > 0.15) continue;
					for (const z of [depan, -depan]) d.push(bentuk(new BoxGeometry(0.035, 0.035, 0.008), "#f2c46d", [x, 0.99 + r * 0.09 + u, z], [0, 0, Math.PI / 4]));
				}
			}
			break;
		case "jaket":
			d.push(
				bentuk(new BoxGeometry(0.08, 0.46, 0.012), "#e5e7eb", [0, 1.2 + u, depan]),
				bentuk(new BoxGeometry(0.006, 0.46, 0.014), "#a3a3a3", [0.045, 1.2 + u, depan + 0.002]),
				bentuk(new BoxGeometry(0.1, 0.06, 0.03), gelapkan(p.baju, 0.7), [0.07, 1.47 + u, 0.1], [0, 0, 0.5]),
				bentuk(new BoxGeometry(0.1, 0.06, 0.03), gelapkan(p.baju, 0.7), [-0.07, 1.47 + u, 0.1], [0, 0, -0.5]),
			);
			break;
		case "grafis": {
			// sablon dada: bidang warna + lingkaran motif + garis bawah; sablon besar di punggung
			const { cetak = "#facc15", aksen = "#f8fafc" } = p.motifWarna || {};
			d.push(
				bentuk(new BoxGeometry(0.17, 0.15, 0.01), cetak, [0, 1.29 + u, depan]),
				bentuk(new CylinderGeometry(0.045, 0.045, 0.012, 12), aksen, [0, 1.3 + u, depan + 0.006], [Math.PI / 2, 0, 0]),
				bentuk(new BoxGeometry(0.012, 0.11, 0.014), cetak, [0, 1.3 + u, depan + 0.012], [0, 0, 0.35]),
				bentuk(new BoxGeometry(0.13, 0.015, 0.012), aksen, [0, 1.195 + u, depan + 0.002]),
				bentuk(new BoxGeometry(0.22, 0.2, 0.01), cetak, [0, 1.27 + u, -depan]),
			);
			break;
		}
		case "garis": {
			const { aksen = "#1e3a8a" } = p.motifWarna || {};
			for (let r = 0; r < 6; r++) d.push(bentuk(new CylinderGeometry(0.209 - r * 0.004, 0.207 - r * 0.004, 0.028, 12, 1, true), aksen, [0, 0.99 + r * 0.075 + u, 0], [0, 0, 0], [1, 1, 0.64]));
			break;
		}
		case "flanel": {
			// kotak-kotak: pita tegak & mendatar gelap, depan & belakang
			const { aksen = "#1f2937" } = p.motifWarna || {};
			for (const z of [depan, -depan]) {
				for (const x of [-0.12, -0.04, 0.04, 0.12]) d.push(bentuk(new BoxGeometry(0.025, 0.5, 0.006), aksen, [x, 1.19 + u, z]));
				for (let r = 0; r < 5; r++) d.push(bentuk(new BoxGeometry(0.3, 0.022, 0.008), aksen, [0, 0.99 + r * 0.1 + u, z]));
			}
			d.push(bentuk(new BoxGeometry(0.012, 0.42, 0.012), gelapkan(p.baju, 0.6), [0, 1.18 + u, depan + 0.004]));
			break;
		}
		case "varsity": {
			const { aksen = "#f8fafc", cetak = "#facc15" } = p.motifWarna || {};
			d.push(
				bentuk(new CylinderGeometry(0.183, 0.18, 0.06, 12), aksen, [0, 0.96 + u, 0], [0, 0, 0], [1, 1, 0.66]),
				bentuk(new CylinderGeometry(0.184, 0.182, 0.015, 12), p.baju, [0, 0.965 + u, 0], [0, 0, 0], [1, 1, 0.67]),
				bentuk(new TorusGeometry(0.075, 0.016, 4, 14), aksen, [0, 1.5 + u, 0.01], [Math.PI / 2, 0, 0], [1, 1, 0.8]),
				// huruf "B" di dada kiri: tiang + dua lengkung
				bentuk(new BoxGeometry(0.018, 0.1, 0.012), cetak, [-0.115, 1.33 + u, depan]),
				bentuk(new TorusGeometry(0.025, 0.009, 4, 10, Math.PI), cetak, [-0.106, 1.355 + u, depan], [0, 0, -Math.PI / 2]),
				bentuk(new TorusGeometry(0.027, 0.009, 4, 10, Math.PI), cetak, [-0.106, 1.305 + u, depan], [0, 0, -Math.PI / 2]),
				...[1.36, 1.26, 1.16, 1.06].map((y) => bentuk(new SphereGeometry(0.01, 6, 4), aksen, [0.01, y + u, depan + 0.004])),
			);
			break;
		}
		case "bomber": {
			const { aksen = "#f97316" } = p.motifWarna || {};
			d.push(
				bentuk(new TorusGeometry(0.08, 0.02, 4, 14), aksen, [0, 1.5 + u, 0.01], [Math.PI / 2, 0, 0], [1, 1, 0.8]),
				bentuk(new CylinderGeometry(0.183, 0.18, 0.07, 12), gelapkan(p.baju, 0.7), [0, 0.97 + u, 0], [0, 0, 0], [1, 1, 0.66]),
				bentuk(new BoxGeometry(0.008, 0.46, 0.016), "#d4d4d8", [0, 1.2 + u, depan + 0.003]),
				bentuk(new BoxGeometry(0.07, 0.05, 0.012), gelapkan(p.baju, 0.75), [-0.11, 1.08 + u, depan], [0, 0, 0.25]),
				bentuk(new BoxGeometry(0.07, 0.05, 0.012), gelapkan(p.baju, 0.75), [0.11, 1.08 + u, depan], [0, 0, -0.25]),
			);
			break;
		}
		case "tropis": {
			// daun & bunga bertebaran
			const { aksen = "#4ade80", cetak = "#f472b6" } = p.motifWarna || {};
			const titik = [[-0.12, 1.36], [0.06, 1.4], [0.13, 1.24], [-0.05, 1.22], [-0.13, 1.08], [0.08, 1.06], [0.0, 1.32], [-0.08, 1.15]];
			for (const z of [depan, -depan])
				titik.forEach(([x, y], i) =>
					d.push(i % 3 === 2 ? bentuk(new SphereGeometry(0.022, 6, 4), cetak, [x, y + u, z], [0, 0, 0], [1, 1, 0.3]) : bentuk(new BoxGeometry(0.05, 0.022, 0.006), aksen, [x, y + u, z], [0, 0, (i * 1.3) % 3])),
				);
			d.push(bentuk(new BoxGeometry(0.1, 0.05, 0.02), p.baju, [0.06, 1.47 + u, 0.1], [0, 0, 0.6]), bentuk(new BoxGeometry(0.1, 0.05, 0.02), p.baju, [-0.06, 1.47 + u, 0.1], [0, 0, -0.6]));
			break;
		}
		case "kujang": {
			// Batik Bogor: kujang emas berderet + pinggiran
			const { aksen = "#fbbf24" } = p.motifWarna || {};
			for (const z of [depan, -depan]) {
				for (let r = 0; r < 4; r++)
					[-0.11, -0.035, 0.04, 0.115].forEach((x, c) => {
						const y = 1.02 + r * 0.11 + (c % 2 ? 0.03 : 0);
						d.push(bentuk(new BoxGeometry(0.014, 0.06, 0.006), aksen, [x, y + u, z], [0, 0, 0.25]), bentuk(new SphereGeometry(0.012, 6, 4), aksen, [x - 0.012, y + 0.03 + u, z], [0, 0, 0], [1, 1, 0.4]));
					});
				d.push(bentuk(new BoxGeometry(0.3, 0.02, 0.006), aksen, [0, 0.96 + u, z]));
			}
			break;
		}
		case "koko": {
			const { aksen = "#ca8a04" } = p.motifWarna || {};
			d.push(
				bentuk(new TorusGeometry(0.06, 0.012, 4, 14), aksen, [0, 1.52 + u, 0.01], [Math.PI / 2, 0, 0], [1, 1, 0.8]),
				bentuk(new BoxGeometry(0.05, 0.22, 0.01), aksen, [0, 1.38 + u, depan]),
				...[1.44, 1.38, 1.32].map((y) => bentuk(new SphereGeometry(0.009, 6, 4), "#f8fafc", [0, y + u, depan + 0.006])),
				bentuk(new BoxGeometry(0.08, 0.008, 0.008), aksen, [0.085, 1.27 + u, depan]),
			);
			break;
		}
		case "polo": {
			const { aksen = "#f8fafc" } = p.motifWarna || {};
			d.push(
				bentuk(new BoxGeometry(0.1, 0.05, 0.03), gelapkan(p.baju, 0.85), [0.065, 1.49 + u, 0.095], [0, 0, 0.55]),
				bentuk(new BoxGeometry(0.1, 0.05, 0.03), gelapkan(p.baju, 0.85), [-0.065, 1.49 + u, 0.095], [0, 0, -0.55]),
				bentuk(new BoxGeometry(0.03, 0.12, 0.01), gelapkan(p.baju, 0.85), [0, 1.42 + u, depan]),
				bentuk(new SphereGeometry(0.008, 6, 4), aksen, [0, 1.44 + u, depan + 0.006]),
				bentuk(new SphereGeometry(0.008, 6, 4), aksen, [0, 1.4 + u, depan + 0.006]),
				bentuk(new BoxGeometry(0.03, 0.025, 0.008), aksen, [-0.09, 1.34 + u, depan]),
			);
			break;
		}
		case "jas":
			d.push(
				bentuk(new BoxGeometry(0.08, 0.28, 0.012), "#f8fafc", [0, 1.33 + u, depan]),
				bentuk(new BoxGeometry(0.035, 0.025, 0.02), "#111827", [0.022, 1.45 + u, depan + 0.005], [0, 0, 0.4]),
				bentuk(new BoxGeometry(0.035, 0.025, 0.02), "#111827", [-0.022, 1.45 + u, depan + 0.005], [0, 0, -0.4]),
				bentuk(new SphereGeometry(0.012, 6, 4), "#7c2d12", [0, 1.15 + u, depan + 0.004]),
				bentuk(new SphereGeometry(0.012, 6, 4), "#7c2d12", [0, 1.05 + u, depan + 0.004]),
			);
			break;
		default:
	}
	return d;
}

// Topi dari lemari gaya, di koordinat kepala (pusat tengkorak ±0.135).
function topiGaya(t) {
	const w = t.warna;
	switch (t.id) {
		case "cap":
			return [
				bentuk(new SphereGeometry(0.123, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), w, [0, 0.165, -0.005]),
				bentuk(new BoxGeometry(0.17, 0.012, 0.13), gelapkan(w, 0.8), [0, 0.172, 0.13]),
				bentuk(new SphereGeometry(0.014, 6, 4), gelapkan(w, 0.8), [0, 0.29, -0.005]),
			];
		case "peci":
			return [bentuk(new CylinderGeometry(0.117, 0.12, 0.09, 16), w, [0, 0.235, -0.005], [0, 0, 0], [1, 1, 0.85])];
		case "kupluk":
			return [
				bentuk(new SphereGeometry(0.126, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), w, [0, 0.15, -0.005]),
				bentuk(new CylinderGeometry(0.128, 0.128, 0.05, 14), gelapkan(w, 0.8), [0, 0.165, -0.005]),
				bentuk(new SphereGeometry(0.036, 8, 6), "#f8fafc", [0, 0.29, -0.005]),
			];
		case "bucket":
			return [bentuk(new CylinderGeometry(0.11, 0.122, 0.1, 14), w, [0, 0.24, -0.005]), bentuk(new CylinderGeometry(0.19, 0.19, 0.012, 16), w, [0, 0.19, -0.005])];
		case "koboi":
			return [
				bentuk(new CylinderGeometry(0.09, 0.115, 0.13, 14), w, [0, 0.27, -0.005], [0, 0, 0], [1, 1, 0.85]),
				bentuk(new CylinderGeometry(0.116, 0.116, 0.025, 14), "#1c1917", [0, 0.22, -0.005], [0, 0, 0], [1, 1, 0.85]),
				bentuk(new CylinderGeometry(0.26, 0.26, 0.015, 18), w, [0, 0.205, -0.005]),
			];
		case "caping":
			return [bentuk(new ConeGeometry(0.3, 0.16, 18, 1, true), w, [0, 0.27, -0.005]), bentuk(new TorusGeometry(0.3, 0.008, 4, 20), gelapkan(w, 0.75), [0, 0.19, -0.005], [Math.PI / 2, 0, 0])];
		case "blangkon":
			return [
				bentuk(new CylinderGeometry(0.12, 0.122, 0.085, 16), w, [0, 0.215, -0.005], [0, 0, 0], [1, 1, 0.92]),
				bentuk(new SphereGeometry(0.045, 8, 6), gelapkan(w, 0.85), [0, 0.18, -0.12], [0, 0, 0], [1.2, 0.9, 1]),
				bentuk(new BoxGeometry(0.2, 0.012, 0.012), "#fbbf24", [0, 0.19, 0.105]),
			];
		case "bandana":
			return [
				bentuk(new CylinderGeometry(0.121, 0.123, 0.05, 16, 1, true), w, [0, 0.2, -0.005]),
				bentuk(new SphereGeometry(0.11, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), w, [0, 0.2, -0.005]),
				bentuk(new BoxGeometry(0.03, 0.08, 0.02), gelapkan(w, 0.8), [0.03, 0.17, -0.13], [0.3, 0, 0.4]),
				bentuk(new BoxGeometry(0.03, 0.08, 0.02), gelapkan(w, 0.8), [-0.03, 0.17, -0.13], [0.3, 0, -0.4]),
			];
		case "beret":
			return [bentuk(new SphereGeometry(0.14, 14, 8), w, [0.02, 0.25, -0.01], [0, 0, -0.15], [1, 0.4, 1]), bentuk(new CylinderGeometry(0.008, 0.008, 0.03, 6), gelapkan(w, 0.7), [0.03, 0.31, -0.01])];
		case "helm":
			return [
				bentuk(new SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), w, [0, 0.17, -0.005], [0, 0, 0], [1, 1.05, 1.08]),
				bentuk(new CylinderGeometry(0.15, 0.15, 0.012, 16), w, [0, 0.175, 0.015], [0, 0, 0], [1, 1, 1.15]),
				bentuk(new BoxGeometry(0.02, 0.03, 0.26), gelapkan(w, 0.85), [0, 0.3, -0.005]),
			];
		case "mahkota":
			return [
				bentuk(new CylinderGeometry(0.118, 0.12, 0.07, 14, 1, true), w, [0, 0.245, -0.005]),
				...[0, 1, 2, 3, 4, 5].map((i) => bentuk(new ConeGeometry(0.025, 0.08, 6), w, [Math.sin((i * Math.PI) / 3) * 0.115, 0.315, Math.cos((i * Math.PI) / 3) * 0.115 - 0.005])),
				bentuk(new SphereGeometry(0.018, 6, 4), "#dc2626", [0, 0.245, 0.118]),
			];
		default:
			return [];
	}
}

// Sepatu satu kaki, pangkal di telapak (y = dasar sepatu + 0.04).
function geometriSepatu(p, [x, y, z]) {
	const s = p.sepatu;
	if (!s)
		return [
			bentuk(new CapsuleGeometry(0.056, 0.13, 4, 12), "#1a1a1a", [x, y + 0.002, z + 0.01], [Math.PI / 2, 0, 0], [1.05, 1, 0.72]),
			bentuk(new BoxGeometry(0.118, 0.022, 0.25), "#0b0b0b", [x, y - 0.034, z + 0.01]),
		];
	if (s.id === "boots") return [bentuk(new BoxGeometry(0.13, 0.2, 0.25), s.warna, [x, y + 0.06, z]), bentuk(new BoxGeometry(0.135, 0.03, 0.26), s.sol, [x, y - 0.03, z])];
	if (s.id === "hightop")
		return [
			bentuk(new BoxGeometry(0.125, 0.15, 0.25), s.warna, [x, y + 0.04, z]),
			bentuk(new BoxGeometry(0.13, 0.035, 0.26), s.sol, [x, y - 0.028, z]),
			bentuk(new BoxGeometry(0.128, 0.04, 0.07), s.sol, [x, y - 0.005, z + 0.1]),
			bentuk(new CylinderGeometry(0.025, 0.025, 0.006, 10), "#f8fafc", [x + 0.064, y + 0.07, z - 0.06], [0, 0, Math.PI / 2]),
		];
	if (s.id === "pantofel")
		return [
			bentuk(new BoxGeometry(0.115, 0.065, 0.26), s.warna, [x, y + 0.005, z]),
			bentuk(new BoxGeometry(0.12, 0.02, 0.265), s.sol, [x, y - 0.03, z]),
			bentuk(new BoxGeometry(0.06, 0.012, 0.02), "#3f3f46", [x, y + 0.04, z + 0.06]),
		];
	if (s.id === "slipon")
		return [
			bentuk(new BoxGeometry(0.12, 0.065, 0.25), s.warna, [x, y + 0.005, z]),
			bentuk(new BoxGeometry(0.126, 0.03, 0.26), s.sol, [x, y - 0.028, z]),
			...[-0.08, -0.02, 0.04, 0.1].map((dz, i) => bentuk(new BoxGeometry(0.122, 0.067, 0.025), i % 2 ? s.warna : "#18181b", [x, y + 0.006, z + dz])),
		];
	if (s.id === "sandal")
		return [
			bentuk(new BoxGeometry(0.1, 0.05, 0.22), p.kulit, [x, y + 0.005, z]),
			bentuk(new BoxGeometry(0.115, 0.018, 0.25), s.sol, [x, y - 0.03, z]),
			bentuk(new BoxGeometry(0.105, 0.012, 0.02), s.warna, [x, y + 0.03, z + 0.05]),
		];
	return [
		bentuk(new BoxGeometry(0.12, 0.07, 0.25), s.warna, [x, y + 0.005, z]),
		bentuk(new BoxGeometry(0.126, 0.03, 0.26), s.sol, [x, y - 0.028, z]),
		bentuk(new BoxGeometry(0.05, 0.008, 0.08), "#f8fafc", [x, y + 0.042, z + 0.05]),
	];
}

function geometriKepala(p) {
	const daftar = [
		bentuk(new SphereGeometry(0.112, 24, 18), p.kulit, [0, 0.135, 0.005], [0, 0, 0], [0.93, 1.07, 1]),
		// rahang & dagu sedikit menonjol
		bentuk(new SphereGeometry(0.07, 16, 10), p.kulit, [0, 0.085, 0.045], [0, 0, 0], [1.1, 0.8, 0.9]),
		bentuk(new SphereGeometry(0.026, 10, 8), p.kulit, [0.105, 0.13, 0], [0, 0, 0], [0.55, 1, 0.9]),
		bentuk(new SphereGeometry(0.026, 10, 8), p.kulit, [-0.105, 0.13, 0], [0, 0, 0], [0.55, 1, 0.9]),
		// mata: bola putih + pupil
		bentuk(new SphereGeometry(0.02, 12, 8), "#f8fafc", [0.038, 0.148, 0.092], [0, 0, 0], [1.15, 0.9, 0.6]),
		bentuk(new SphereGeometry(0.02, 12, 8), "#f8fafc", [-0.038, 0.148, 0.092], [0, 0, 0], [1.15, 0.9, 0.6]),
		bentuk(new SphereGeometry(0.0115, 10, 8), "#1b130d", [0.038, 0.148, 0.1035]),
		bentuk(new SphereGeometry(0.0115, 10, 8), "#1b130d", [-0.038, 0.148, 0.1035]),
		bentuk(new SphereGeometry(0.004, 6, 4), "#ffffff", [0.042, 0.153, 0.1135]),
		bentuk(new SphereGeometry(0.004, 6, 4), "#ffffff", [-0.034, 0.153, 0.1135]),
		// hidung & mulut tersenyum
		bentuk(new SphereGeometry(0.017, 10, 8), gelapkan(p.kulit, 0.93), [0, 0.123, 0.113], [0, 0, 0], [0.85, 1, 0.9]),
		bentuk(new TorusGeometry(0.02, 0.0045, 5, 12, Math.PI), "#8d4a3e", [0, 0.096, 0.104], [0, 0, Math.PI]),
		// pipi merona tipis
		bentuk(new SphereGeometry(0.018, 8, 6), "#e8a598", [0.062, 0.112, 0.085], [0, 0, 0], [1, 0.7, 0.4]),
		bentuk(new SphereGeometry(0.018, 8, 6), "#e8a598", [-0.062, 0.112, 0.085], [0, 0, 0], [1, 0.7, 0.4]),
	];
		if (p.jilbab) {
		daftar.push(bentuk(new SphereGeometry(0.127, 14, 10, Math.PI / 2 + 0.62, Math.PI * 2 - 1.24), p.jilbab, [0, 0.14, 0], [0, 0, 0], [0.95, 1.08, 1]));
	} else {
		daftar.push(
			// alis
			bentuk(new BoxGeometry(0.036, 0.009, 0.008), p.rambut, [0.039, 0.176, 0.1], [0, 0, -0.12]),
			bentuk(new BoxGeometry(0.036, 0.009, 0.008), p.rambut, [-0.039, 0.176, 0.1], [0, 0, 0.12]),
			// rambut: tempurung, poni, dan bagian belakang kepala
			bentuk(new SphereGeometry(0.12, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.47), p.rambut, [0, 0.148, -0.006], [0, 0, 0], [0.97, 1.05, 1.02]),
			bentuk(new SphereGeometry(0.07, 16, 8), p.rambut, [0.012, 0.205, 0.07], [0.2, 0, -0.15], [1.25, 0.42, 0.75]),
			bentuk(new SphereGeometry(0.11, 18, 10), p.rambut, [0, 0.12, -0.035], [0, 0, 0], [0.95, 0.9, 0.85]),
		);
		if (p.perempuan) daftar.push(bentuk(new CapsuleGeometry(0.1, 0.16, 6, 14), p.rambut, [0, 0.03, -0.07], [0, 0, 0], [1.06, 1, 0.5]));
	}
	if (p.topiGaya) daftar.push(...topiGaya(p.topiGaya));
	const topi = !p.topiGaya && seragam(p).topi;
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
const lenganAtas = (p) => bentuk(new CapsuleGeometry(0.051, 0.2, 5, 14), bajuDari(p), [0, -0.145, 0], [0, 0, 0], [1, 1, 0.95]);
function lenganBawah(p, map, alat) {
	const daftar = [
		bentuk(new CapsuleGeometry(0.045, 0.17, 5, 14), bajuDari(p), [0, -0.115, 0]),
		bentuk(new CylinderGeometry(0.03, 0.033, 0.05, 12), p.kulit, [0, -0.245, 0]),
		bentuk(new SphereGeometry(0.046, 14, 10), p.kulit, [0, -0.29, 0.004], [0, 0, 0], [0.78, 1.12, 0.6]),
		bentuk(new CapsuleGeometry(0.013, 0.03, 3, 8), p.kulit, [0, -0.275, 0.032], [0.6, 0, 0]),
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

// Kaki dibagi dua di lutut supaya bisa menekuk: paha (pangkal di pinggul) dan
// betis + sepatu (pangkal di lutut, 0.42 di bawah pinggul). Rok panjang menutup
// paha; yang terlihat betis bawah dan sepatu.
export const PANJANG_PAHA = 0.42;
function geometriPaha(p) {
	const celana = celanaDari(p);
	const m = p.modelCelana;
	const kain = p.rok ? gelapkan(p.kulit, 0.85) : celana;
	const d = [
		bentuk(new SphereGeometry(0.078, 16, 10), kain, [0, -0.02, 0]),
		bentuk(new CylinderGeometry(0.078, 0.063, 0.4, 16), m === "pendek" ? celana : kain, [0, -0.21, 0]),
	];
	if (m === "pendek") d.push(bentuk(new CylinderGeometry(0.06, 0.058, 0.12, 16), p.kulit, [0, -0.37, 0]));
	if (m === "training") d.push(bentuk(new BoxGeometry(0.162, 0.4, 0.02), "#f8fafc", [0, -0.21, 0]));
	if (m === "jogger") d.push(bentuk(new BoxGeometry(0.012, 0.4, 0.16), gelapkan(celana, 0.8), [0.072, -0.21, 0]));
	if (m === "cargo") for (const s of [-1, 1]) d.push(bentuk(new BoxGeometry(0.014, 0.12, 0.09), gelapkan(celana, 0.8), [s * 0.074, -0.3, 0]));
	if (m === "robek") d.push(bentuk(new BoxGeometry(0.06, 0.03, 0.02), "#e5e7eb", [-0.02, -0.26, 0.066]));
	return gabung(d);
}
function geometriBetis(p) {
	const celana = celanaDari(p);
	const m = p.modelCelana;
	const kain = p.rok ? gelapkan(p.kulit, 0.85) : m === "pendek" ? p.kulit : celana;
	const d = [
		bentuk(new SphereGeometry(0.064, 16, 10), kain, [0, 0, 0]),
		bentuk(new CylinderGeometry(0.063, 0.047, 0.38, 16), kain, [0, -0.19, 0]),
		// betis sedikit menggembung di belakang
		bentuk(new SphereGeometry(0.058, 14, 10), kain, [0, -0.12, -0.012], [0, 0, 0], [1, 1.6, 1]),
	];
	if (m === "training") d.push(bentuk(new BoxGeometry(0.135, 0.38, 0.02), "#f8fafc", [0, -0.19, 0]));
	if (m === "jogger") d.push(bentuk(new CylinderGeometry(0.054, 0.054, 0.06, 16), gelapkan(celana, 0.7), [0, -0.35, 0]), bentuk(new BoxGeometry(0.012, 0.36, 0.13), gelapkan(celana, 0.8), [0.06, -0.19, 0]));
	if (m === "chino") d.push(bentuk(new CylinderGeometry(0.052, 0.052, 0.04, 16), gelapkan(celana, 0.88), [0, -0.36, 0]));
	if (m === "robek") d.push(bentuk(new BoxGeometry(0.06, 0.03, 0.02), "#e5e7eb", [0.02, -0.08, 0.06]), bentuk(new BoxGeometry(0.05, 0.03, 0.02), p.kulit, [-0.01, 0, 0.064]));
	return gabung([...d, ...geometriSepatu(p, [0, -0.42, 0.04])]);
}
// kaki utuh (lurus) untuk pose yang tidak dianimasikan
const geometriKaki = (p) => gabung([geometriPaha(p), geometriBetis(p).translate(0, -PANJANG_PAHA, 0)]);

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
				geometriPaha(p).rotateX(-Math.PI / 2).translate(s * 0.095, 0.5, -0.02),
				geometriBetis(p).translate(s * 0.095, 0.46, 0.4),
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
		paha: geometriPaha(p),
		betis: geometriBetis(p),
	};
}

export function buangOrang(g) {
	for (const v of Object.values(g)) v?.dispose?.();
}
