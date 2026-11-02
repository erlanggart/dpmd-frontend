import { Color, CylinderGeometry, TorusGeometry } from "three";
import { gabung, kotak, warnai } from "./geometri";

// Model low-poly barang minimarket & keranjang belanja (geometri berwarna, sekali buat).
// Barang berdiri di y = 0, ukuran asli (±10–25 cm).

const gelap = (w, f = 0.7) => new Color(w).multiplyScalar(f).getStyle();

function bangunBarang(b) {
	const w = b.warna;
	switch (b.bentuk) {
		case "botol":
			return gabung([
				warnai(new CylinderGeometry(0.035, 0.035, 0.17, 8), w, { p: [0, 0.085, 0] }),
				warnai(new CylinderGeometry(0.036, 0.036, 0.06, 8), "#f8fafc", { p: [0, 0.09, 0] }),
				warnai(new CylinderGeometry(0.014, 0.03, 0.05, 8), w, { p: [0, 0.195, 0] }),
				warnai(new CylinderGeometry(0.015, 0.015, 0.02, 8), "#1d4ed8", { p: [0, 0.228, 0] }),
			]);
		case "kaleng":
			return gabung([
				warnai(new CylinderGeometry(0.033, 0.033, 0.13, 10), w, { p: [0, 0.065, 0] }),
				warnai(new CylinderGeometry(0.034, 0.034, 0.03, 10), "#111827", { p: [0, 0.07, 0] }),
				warnai(new CylinderGeometry(0.03, 0.033, 0.01, 10), "#d1d5db", { p: [0, 0.135, 0] }),
			]);
		case "cup":
			return gabung([
				warnai(new CylinderGeometry(0.06, 0.045, 0.1, 10), w, { p: [0, 0.05, 0] }),
				warnai(new CylinderGeometry(0.061, 0.061, 0.01, 10), "#f8fafc", { p: [0, 0.105, 0] }),
				warnai(new CylinderGeometry(0.062, 0.062, 0.025, 10), "#fde047", { p: [0, 0.06, 0] }),
			]);
		case "karung":
			// karung beras kecil bertali
			return gabung([
				warnai(new CylinderGeometry(0.075, 0.085, 0.2, 8), w, { p: [0, 0.1, 0], s: [1, 1, 0.7] }),
				warnai(new CylinderGeometry(0.04, 0.075, 0.05, 8), w, { p: [0, 0.225, 0], s: [1, 1, 0.7] }),
				warnai(new CylinderGeometry(0.042, 0.042, 0.015, 8), "#b91c1c", { p: [0, 0.215, 0], s: [1, 1, 0.7] }),
				kotak([0.1, 0.06, 0.004], "#16a34a", [0, 0.11, 0.06]),
			]);
		case "bungkus":
			return gabung([kotak([0.16, 0.06, 0.12], w, [0, 0.03, 0]), kotak([0.1, 0.004, 0.08], "#fef3c7", [0, 0.062, 0]), kotak([0.17, 0.008, 0.02], gelap(w), [0, 0.04, 0])]);
		default:
			// roti dalam plastik bermerek
			return gabung([kotak([0.12, 0.09, 0.2], w, [0, 0.045, 0]), kotak([0.122, 0.03, 0.08], "#f8fafc", [0, 0.06, 0.02]), kotak([0.06, 0.02, 0.03], "#dc2626", [0, 0.1, -0.08])]);
	}
}

const cache = new Map();
export function geometriBarang(b) {
	if (!cache.has(b.id)) cache.set(b.id, bangunBarang(b));
	return cache.get(b.id);
}

// Keranjang plastik merah berpegangan: dasar + 4 dinding tipis + dua pegangan.
export const GEO_KERANJANG = (() => {
	const W = 0.42;
	const D = 0.3;
	const H = 0.2;
	const t = 0.012;
	const merah = "#dc2626";
	const pegangan = [-1, 1].map((s) => warnai(new TorusGeometry(0.1, 0.008, 6, 12, Math.PI), "#991b1b", { p: [s * 0.06, H, 0], r: [0, Math.PI / 2, 0] }));
	return gabung([
		kotak([W, t, D], merah, [0, t / 2, 0]),
		kotak([W, H, t], merah, [0, H / 2, D / 2]),
		kotak([W, H, t], merah, [0, H / 2, -D / 2]),
		kotak([t, H, D], merah, [W / 2, H / 2, 0]),
		kotak([t, H, D], merah, [-W / 2, H / 2, 0]),
		kotak([W + 0.01, 0.025, D + 0.01], "#b91c1c", [0, H - 0.012, 0]),
		...pegangan,
	]);
})();
