import { BoxGeometry, Color, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, MeshStandardMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Geometri perabot berwarna-per-titik. Tiap jenis dipakai sebagai InstancedMesh,
// jadi puluhan meja/kursi/monitor cukup satu draw call per jenis per lantai.
// Konvensi: "pengguna" perabot menghadap +z lokal (kursi: punggung di -z).

export const BAHAN_PERABOT = new MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });

const warna = new Color();
function b(geom, w, pos = [0, 0, 0], rotY = 0) {
	let g = geom.index ? geom.toNonIndexed() : geom;
	g.deleteAttribute("uv");
	if (rotY) g.rotateY(rotY);
	g.translate(...pos);
	warna.set(w);
	const n = g.attributes.position.count;
	const arr = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) arr.set([warna.r, warna.g, warna.b], i * 3);
	g.setAttribute("color", new Float32BufferAttribute(arr, 3));
	return g;
}
const kotak = (lx, ly, lz, w, pos) => b(new BoxGeometry(lx, ly, lz), w, pos);
const tabung = (r1, r2, h, w, pos, seg = 12) => b(new CylinderGeometry(r1, r2, h, seg), w, pos);

const RESEP = {
	meja: () => [
		kotak(1.5, 0.04, 0.75, "#ebe6dc", [0, 0.72, 0]),
		kotak(0.04, 0.7, 0.7, "#8e959c", [0.72, 0.35, 0]),
		kotak(0.04, 0.7, 0.7, "#8e959c", [-0.72, 0.35, 0]),
		kotak(1.42, 0.38, 0.02, "#8e959c", [0, 0.45, 0.34]),
		kotak(0.4, 0.55, 0.6, "#c9cdd1", [0.5, 0.29, 0]),
	],
	sekat: () => [kotak(1.55, 0.46, 0.04, "#7f8fa3", [0, 0.98, 0]), kotak(1.58, 0.03, 0.06, "#4f5660", [0, 1.22, 0])],
	kursi: () => [
		kotak(0.46, 0.07, 0.46, "#2b2f36", [0, 0.46, 0]),
		kotak(0.44, 0.52, 0.06, "#2b2f36", [0, 0.78, -0.22]),
		tabung(0.025, 0.025, 0.38, "#5a5f66", [0, 0.24, 0], 8),
		kotak(0.52, 0.03, 0.08, "#33373d", [0, 0.04, 0]),
		kotak(0.08, 0.03, 0.52, "#33373d", [0, 0.04, 0]),
	],
	kursiEksekutif: () => [
		kotak(0.56, 0.1, 0.54, "#3b2a20", [0, 0.48, 0]),
		kotak(0.54, 0.75, 0.09, "#3b2a20", [0, 0.92, -0.25]),
		kotak(0.06, 0.2, 0.42, "#2a1d16", [0.3, 0.6, 0]),
		kotak(0.06, 0.2, 0.42, "#2a1d16", [-0.3, 0.6, 0]),
		tabung(0.03, 0.03, 0.38, "#9aa0a6", [0, 0.24, 0], 8),
		kotak(0.58, 0.03, 0.09, "#555a60", [0, 0.04, 0]),
		kotak(0.09, 0.03, 0.58, "#555a60", [0, 0.04, 0]),
	],
	// layar menghadap pengguna (-z lokal); keyboard di depannya
	monitor: () => [
		kotak(0.56, 0.33, 0.03, "#1c2026", [0, 1.04, 0]),
		kotak(0.51, 0.28, 0.006, "#5b8db8", [0, 1.045, -0.018]),
		kotak(0.05, 0.2, 0.04, "#2a2e34", [0, 0.84, 0.01]),
		kotak(0.22, 0.015, 0.16, "#2a2e34", [0, 0.745, 0]),
		kotak(0.42, 0.02, 0.14, "#d9dadc", [0, 0.75, -0.42]),
	],
	mejaLayanan: () => [
		kotak(2.2, 0.05, 0.8, "#efe9df", [0, 0.76, 0]),
		kotak(2.2, 0.72, 0.05, "#a8784e", [0, 0.37, 0.38]),
		kotak(0.05, 0.72, 0.75, "#8a6240", [1.07, 0.37, 0]),
		kotak(0.05, 0.72, 0.75, "#8a6240", [-1.07, 0.37, 0]),
	],
	mejaPimpinan: () => [
		kotak(2.4, 0.07, 1.0, "#5a3a24", [0, 0.76, 0]),
		kotak(2.4, 0.72, 0.06, "#4a2f1d", [0, 0.37, 0.47]),
		kotak(0.6, 0.72, 0.9, "#4a2f1d", [0.85, 0.37, 0]),
		kotak(0.6, 0.72, 0.9, "#4a2f1d", [-0.85, 0.37, 0]),
		kotak(0.5, 0.02, 0.35, "#1c2026", [0.6, 0.8, -0.1]),
		kotak(0.18, 0.12, 0.05, "#c9b27a", [-0.6, 0.86, 0.3]),
	],
	lemari: () => [
		kotak(0.9, 1.85, 0.45, "#d6d0c4", [0, 0.925, 0]),
		kotak(0.01, 1.75, 0.005, "#8f897f", [0, 0.925, 0.226]),
		kotak(0.02, 0.15, 0.02, "#6d6a64", [0.06, 1.0, 0.235]),
		kotak(0.02, 0.15, 0.02, "#6d6a64", [-0.06, 1.0, 0.235]),
	],
	rak: () => [
		kotak(1.0, 0.9, 0.35, "#8a6a4a", [0, 0.45, 0]),
		kotak(0.95, 0.02, 0.33, "#6d5238", [0, 0.3, 0]),
		kotak(0.95, 0.02, 0.33, "#6d5238", [0, 0.6, 0]),
		kotak(0.25, 0.06, 0.12, "#333", [-0.25, 0.34, 0.05]),
		kotak(0.25, 0.06, 0.12, "#7a3b1f", [0.2, 0.64, 0.05]),
	],
	tanaman: () => [
		tabung(0.22, 0.17, 0.42, "#efe9df", [0, 0.21, 0]),
		b(new IcosahedronGeometry(0.36, 0), "#3f8f5a", [0, 0.78, 0]),
		b(new IcosahedronGeometry(0.26, 0), "#56a86f", [0.1, 1.02, 0.05]),
	],
	sofa: () => [
		kotak(2.0, 0.42, 0.8, "#5d4636", [0, 0.21, 0]),
		kotak(1.86, 0.12, 0.66, "#8b6c52", [0, 0.48, 0.05]),
		kotak(2.0, 0.5, 0.2, "#5d4636", [0, 0.66, -0.3]),
		kotak(0.16, 0.3, 0.8, "#5d4636", [0.92, 0.55, 0]),
		kotak(0.16, 0.3, 0.8, "#5d4636", [-0.92, 0.55, 0]),
	],
	mejaKopi: () => [kotak(0.9, 0.05, 0.55, "#7a5636", [0, 0.42, 0]), kotak(0.8, 0.4, 0.45, "#5e4129", [0, 0.2, 0])],
	mejaKopiTamu: () => [
		kotak(1.0, 0.85, 0.55, "#8a6240", [0, 0.425, 0]),
		kotak(1.0, 0.04, 0.57, "#efe9df", [0, 0.87, 0]),
		kotak(0.28, 0.36, 0.3, "#2a2a2a", [-0.25, 1.07, 0]),
		tabung(0.04, 0.035, 0.1, "#ffffff", [0.1, 0.94, 0.1], 8),
		tabung(0.04, 0.035, 0.1, "#ffffff", [0.25, 0.94, 0.05], 8),
		tabung(0.08, 0.08, 0.2, "#c9c9c9", [0.25, 0.99, -0.12], 10),
	],
	dispenser: () => [
		kotak(0.36, 1.0, 0.36, "#f2f2f2", [0, 0.5, 0]),
		kotak(0.2, 0.12, 0.05, "#3a76b8", [0, 0.82, 0.18]),
		tabung(0.15, 0.15, 0.42, "#8fc3ea", [0, 1.21, 0], 14),
	],
	kios: () => [
		kotak(0.5, 1.1, 0.4, "#2b2f36", [0, 0.55, 0]),
		kotak(0.46, 0.65, 0.05, "#1c2026", [0, 1.35, 0.05]),
		kotak(0.42, 0.58, 0.01, "#3f7fbf", [0, 1.35, 0.08]),
	],
	wastafel: () => [
		kotak(0.8, 0.8, 0.5, "#e8e8e8", [0, 0.4, 0]),
		kotak(0.5, 0.06, 0.36, "#ffffff", [0, 0.83, 0.02]),
		kotak(0.04, 0.2, 0.04, "#b9bdc2", [0, 0.95, -0.15]),
		kotak(0.7, 0.8, 0.02, "#cfe3ee", [0, 1.55, -0.24]),
	],
	bilik: () => [
		kotak(1.9, 2.0, 0.05, "#7e8fa0", [0, 1.0, 0.68]),
		kotak(0.05, 2.0, 1.4, "#7e8fa0", [-0.93, 1.0, 0]),
		kotak(0.7, 1.9, 0.04, "#9aaabb", [0.4, 0.95, 0.7]),
	],
	mejaDapur: () => [
		kotak(3.3, 0.86, 0.6, "#cdb795", [0, 0.43, 0]),
		kotak(3.3, 0.04, 0.62, "#3c3c3c", [0, 0.88, 0]),
		kotak(0.5, 0.06, 0.4, "#c0c4c8", [-0.9, 0.91, 0]),
		tabung(0.09, 0.09, 0.22, "#d0d0d0", [0.4, 1.01, 0], 10),
		tabung(0.04, 0.035, 0.1, "#ffffff", [0.9, 0.95, 0.1], 8),
		kotak(3.3, 0.6, 0.35, "#cdb795", [0, 1.8, -0.12]),
	],
	kulkas: () => [kotak(0.68, 1.75, 0.66, "#e4e6e8", [0, 0.875, 0]), kotak(0.03, 0.35, 0.03, "#9a9ea2", [0.25, 1.2, 0.34])],
};

const cache = new Map();
export function geometriPerabot(jenis) {
	if (!cache.has(jenis)) cache.set(jenis, mergeGeometries(RESEP[jenis]()));
	return cache.get(jenis);
}
export const JENIS_PERABOT = Object.keys(RESEP);
