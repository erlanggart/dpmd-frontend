import { BoxGeometry, CylinderGeometry, MeshStandardMaterial, SphereGeometry } from "three";
import { gabung, kotak, warnai } from "./geometri";

// Geometri kendaraan lalu lintas (dipakai jalan depan kantor & jalan-jalan kawasan).
export const WARNA_MOBIL = ["#e5e7eb", "#1f2937", "#9ca3af", "#b91c1c", "#1e3a8a", "#f5f5f4", "#334155"];
export const WARNA_MOTOR = ["#111827", "#b91c1c", "#1d4ed8", "#f5f5f4", "#047857", "#6b7280"];

// Geometri: badan diberi warna putih supaya warna per-instance yang menentukan catnya.
export const GEOM_MOBIL = gabung([
	kotak([1.8, 0.62, 4], "#ffffff", [0, 0.62, 0]),
	kotak([1.6, 0.55, 2.2], "#2a3138", [0, 1.2, -0.25]),
	kotak([1.62, 0.08, 1.9], "#ffffff", [0, 1.5, -0.3]),
	...[-0.6, 0.6].map((x) => kotak([0.38, 0.14, 0.03], "#fff8e0", [x, 0.72, 2.01])),
	...[-0.65, 0.65].map((x) => kotak([0.32, 0.12, 0.03], "#7f1d1d", [x, 0.75, -2.01])),
	...[
		[-0.86, 1.3],
		[0.86, 1.3],
		[-0.86, -1.3],
		[0.86, -1.3],
	].map(([x, z]) => warnai(new CylinderGeometry(0.33, 0.33, 0.24, 12), "#141414", { p: [x, 0.33, z], r: [0, 0, Math.PI / 2] })),
]);
export const GEOM_MOTOR = gabung([
	kotak([0.3, 0.42, 1.3], "#ffffff", [0, 0.62, 0]),
	kotak([0.28, 0.1, 0.65], "#1b1b1b", [0, 0.88, -0.15]),
	...[0.62, -0.62].map((z) => warnai(new CylinderGeometry(0.3, 0.3, 0.12, 12), "#141414", { p: [0, 0.3, z], r: [0, 0, Math.PI / 2] })),
]);
// Pengendara motor (tidak ikut diwarnai cat motor): badan, lengan ke setang, helm.
export const GEOM_PENGENDARA = gabung([
	kotak([0.42, 0.55, 0.28], "#374151", [0, 1.25, -0.12]),
	kotak([0.36, 0.14, 0.6], "#1f2937", [0, 0.98, 0.05]),
	warnai(new BoxGeometry(0.1, 0.1, 0.5), "#374151", { p: [-0.2, 1.3, 0.2], r: [0.5, 0, 0] }),
	warnai(new BoxGeometry(0.1, 0.1, 0.5), "#374151", { p: [0.2, 1.3, 0.2], r: [0.5, 0, 0] }),
	warnai(new SphereGeometry(0.17, 10, 8), "#e5e7eb", { p: [0, 1.68, -0.08] }),
]);
export const BAHAN_LALIN = new MeshStandardMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.45 });

// ---------- kendaraan besar (jalan-jalan kawasan) ----------
const roda = (x, z, r = 0.5, tebal = 0.35) => warnai(new CylinderGeometry(r, r, tebal, 14), "#141414", { p: [x, r, z], r: [0, 0, Math.PI / 2] });
const sepasang = (z, lebar, r) => [roda(-lebar / 2, z, r), roda(lebar / 2, z, r)];

// Bus kota: badan bercat (warna per instance), pita jendela gelap, kaca depan, empat roda.
export const GEOM_BUS = gabung([
	kotak([2.5, 2.7, 10.4], "#ffffff", [0, 1.75, 0]),
	kotak([2.52, 0.95, 9.4], "#1f2937", [0, 2.25, -0.3]),
	kotak([2.3, 1.2, 0.05], "#1f2937", [0, 2.2, 5.22]),
	kotak([2.52, 0.18, 10.42], "#facc15", [0, 1.15, 0]),
	kotak([2.4, 0.15, 10.2], "#e5e7eb", [0, 3.15, 0]),
	...[-0.8, 0.8].map((x) => kotak([0.4, 0.18, 0.03], "#fff8e0", [x, 0.85, 5.21])),
	...sepasang(3.4, 2.3, 0.55),
	...sepasang(-3.4, 2.3, 0.55),
]);

// Truk sampah DLH: kabin putih, bak hijau tertutup, pintu belakang & lampu kuning.
export const GEOM_TRUK_SAMPAH = gabung([
	kotak([2.3, 2.1, 2.1], "#f8fafc", [0, 1.55, 2.9]),
	kotak([2.1, 0.8, 0.05], "#1f2937", [0, 2.1, 3.96]),
	kotak([2.4, 2.5, 5.2], "#15803d", [0, 2.0, -1.0]),
	kotak([2.42, 0.25, 5.22], "#facc15", [0, 1.2, -1.0]),
	kotak([2.3, 2.3, 0.3], "#14532d", [0, 1.9, -3.65]),
	kotak([0.5, 0.15, 0.3], "#f59e0b", [0, 3.32, 2.9]),
	kotak([2.4, 0.3, 7.6], "#374151", [0, 0.75, 0]),
	...sepasang(2.8, 2.2, 0.5),
	...sepasang(-2.2, 2.2, 0.5),
]);

// Truk molen: kabin oranye, sasis, rangka & corong; drum diputar terpisah (GEOM_DRUM_MOLEN).
export const GEOM_MOLEN = gabung([
	kotak([2.3, 2.1, 2.0], "#ea580c", [0, 1.55, 3.0]),
	kotak([2.1, 0.8, 0.05], "#1f2937", [0, 2.1, 4.01]),
	kotak([2.3, 0.3, 7.8], "#374151", [0, 0.75, 0]),
	kotak([0.25, 1.2, 0.25], "#4b5563", [-0.8, 1.5, 1.6]),
	kotak([0.25, 1.2, 0.25], "#4b5563", [0.8, 1.5, 1.6]),
	kotak([0.25, 2.2, 0.25], "#4b5563", [0, 1.9, -3.4]),
	warnai(new CylinderGeometry(0.45, 0.2, 0.7, 10), "#9ca3af", { p: [0, 3.0, -3.6], r: [0.5, 0, 0] }),
	...sepasang(3.0, 2.2, 0.5),
	...sepasang(-1.8, 2.2, 0.5),
	...sepasang(-3.0, 2.2, 0.5),
]);
// drum molen: sumbu di +y (diputar & dimiringkan per frame), belang spiral oranye-putih
export const GEOM_DRUM_MOLEN = gabung([
	warnai(new CylinderGeometry(0.75, 1.15, 2.4, 16), "#f8fafc", { p: [0, 0.6, 0] }),
	warnai(new CylinderGeometry(1.15, 0.6, 1.6, 16), "#f8fafc", { p: [0, -1.4, 0] }),
	...[-1.6, -0.6, 0.4, 1.4].map((y) => warnai(new CylinderGeometry(1.0, 1.0, 0.18, 16), "#ea580c", { p: [0, y, 0], r: [0, 0, 0.35] })),
]);

// Tronton: kabin bercat (warna per instance), bak panjang berterpal, enam roda belakang.
export const GEOM_TRONTON = gabung([
	kotak([2.4, 2.3, 2.2], "#ffffff", [0, 1.7, 4.4]),
	kotak([2.2, 0.85, 0.05], "#1f2937", [0, 2.3, 5.51]),
	kotak([2.5, 0.35, 11], "#374151", [0, 0.85, -0.2]),
	kotak([2.5, 1.2, 8.2], "#78350f", [0, 1.6, -1.4]),
	kotak([2.52, 1.0, 8.1], "#1d4ed8", [0, 2.7, -1.4]),
	...[-0.85, 0.85].map((x) => kotak([0.4, 0.18, 0.03], "#fff8e0", [x, 1.0, 5.51])),
	...sepasang(4.3, 2.3, 0.55),
	...sepasang(-2.6, 2.3, 0.55),
	...sepasang(-3.9, 2.3, 0.55),
	...sepasang(-5.2, 2.3, 0.55),
]);
export const WARNA_BUS = ["#1d4ed8", "#b91c1c", "#15803d", "#f59e0b", "#7c3aed"];
export const WARNA_TRONTON = ["#dc2626", "#f8fafc", "#2563eb", "#facc15"];
