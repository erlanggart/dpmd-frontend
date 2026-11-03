import { CylinderGeometry, SphereGeometry } from "three";
import { gabung, kotak, warnai } from "./geometri";

// Katalog mobil & motor showroom Jelajah: tipe yang akrab di jalanan Indonesia (tanpa
// merek dagang). Tiap model: harga koin, pilihan warna, pengali laju & gas, ukuran roda,
// dan pembuat geometri badan (menghadap +z lokal, y = 0 di tanah).
//
// Kendaraan milik tamu memakai id "mobil:N" / "motor:N" dengan N = 40 + indeks model × 5
// + slot (0–4), sehingga tamu lain di jelajah bersama bisa menebak modelnya dari id saja
// (server hanya menerima id berpola jenis:angka 1–2 digit).

export const NOMOR_MILIK = 40;
export const SLOT_MILIK = 5;

const kaca = "#1e262c";
const lampu = (lx, y, z, w = 0.34) => kotak([w, 0.13, 0.03], "#fff8e0", [lx, y, z]);
const rem = (lx, y, z, w = 0.3) => kotak([w, 0.12, 0.03], "#c81e1e", [lx, y, z]);

// ---------- mobil ----------
// roda: [x, z]; pintu: tepi depan engsel sopir (sisi -x); plat: y depan & belakang.

function mobilKotak({ L, W, yBadan, tBadan, kabin, atap = true }) {
	return (w) => [
		kotak([W, tBadan, L], w, [0, yBadan, 0]),
		kotak([W - 0.2, kabin.t, kabin.p], kaca, [0, yBadan + tBadan / 2 + kabin.t / 2, kabin.z]),
		atap && kotak([W - 0.18, 0.08, kabin.p - 0.2], w, [0, yBadan + tBadan / 2 + kabin.t + 0.03, kabin.z]),
		...[-W / 2 + 0.3, W / 2 - 0.3].map((lx) => lampu(lx, yBadan + 0.08, L / 2 + 0.01)),
		...[-W / 2 + 0.28, W / 2 - 0.28].map((lx) => rem(lx, yBadan + 0.12, -L / 2 - 0.01)),
		kotak([W - 0.4, 0.12, 0.05], "#2a2a2a", [0, yBadan - tBadan / 2 + 0.08, L / 2 + 0.02]),
	];
}

export const MODEL_MOBIL = [
	{
		id: "hatch",
		nama: "Hatchback Kota",
		ikon: "🚗",
		ket: "Mobil murah irit (LCGC) — lincah di gang & macet Cibinong",
		harga: 3000,
		warna: ["#dc2626", "#f8fafc", "#facc15", "#2563eb", "#1f2937"],
		laju: 0.95,
		gas: 1.1,
		kursi: 4,
		L: 3.6,
		W: 1.66,
		roda: { r: 0.3, x: 0.78, z: 1.15 },
		pintu: { z: 0.75, p: 1.0 },
		bangun: (w) => mobilKotak({ L: 3.6, W: 1.66, yBadan: 0.58, tBadan: 0.56, kabin: { t: 0.55, p: 2.0, z: -0.3 } })(w),
	},
	{
		id: "mpv",
		nama: "MPV Keluarga 7 Penumpang",
		ikon: "🚙",
		ket: "Andalan mudik & arisan keluarga — kabin lega tiga baris",
		harga: 6000,
		warna: ["#e5e7eb", "#1f2937", "#7f1d1d", "#64748b", "#0f766e"],
		laju: 1.0,
		gas: 0.95,
		kursi: 4,
		L: 4.4,
		W: 1.76,
		roda: { r: 0.33, x: 0.84, z: 1.4 },
		pintu: { z: 1.05, p: 1.1 },
		bangun: (w) => [...mobilKotak({ L: 4.4, W: 1.76, yBadan: 0.64, tBadan: 0.62, kabin: { t: 0.66, p: 3.1, z: -0.35 } })(w), kotak([1.3, 0.04, 0.04], "#9ca3af", [0, 1.71, -0.35])],
	},
	{
		id: "suv",
		nama: "SUV Ladder-frame 4×4",
		ikon: "🛻",
		ket: "Gagah naik ke Puncak — tinggi, bertenaga, ban besar",
		harga: 12000,
		warna: ["#111827", "#f8fafc", "#78716c", "#1e3a8a", "#991b1b"],
		laju: 1.12,
		gas: 1.05,
		kursi: 4,
		L: 4.8,
		W: 1.86,
		roda: { r: 0.4, x: 0.88, z: 1.5 },
		pintu: { z: 1.1, p: 1.15 },
		bangun: (w) => [
			...mobilKotak({ L: 4.8, W: 1.86, yBadan: 0.82, tBadan: 0.66, kabin: { t: 0.7, p: 3.0, z: -0.45 } })(w),
			...[-0.75, 0.75].map((lx) => kotak([0.05, 0.05, 2.6], "#a1a1aa", [lx, 1.93, -0.45])),
			kotak([1.9, 0.12, 0.16], "#27272a", [0, 0.6, 2.42]),
			warnai(new CylinderGeometry(0.36, 0.36, 0.22, 14), "#18181b", { p: [0, 0.98, -2.5], r: [Math.PI / 2, 0, 0] }),
		],
	},
	{
		id: "pikap",
		nama: "Pikap Bak Niaga",
		ikon: "🛻",
		ket: "Angkut hasil panen BUMDes ke pasar — bak terbuka di belakang",
		harga: 5000,
		warna: ["#f8fafc", "#1d4ed8", "#15803d", "#a16207", "#111827"],
		laju: 0.92,
		gas: 0.9,
		kursi: 2,
		L: 4.6,
		W: 1.7,
		roda: { r: 0.33, x: 0.8, z: 1.45 },
		pintu: { z: 2.0, p: 0.95 },
		bangun: (w) => [
			kotak([1.7, 0.6, 1.6], w, [0, 0.7, 1.5]),
			kotak([1.5, 0.6, 1.3], kaca, [0, 1.3, 1.35]),
			kotak([1.52, 0.07, 1.25], w, [0, 1.63, 1.35]),
			kotak([1.7, 0.18, 3.0], "#3f3f46", [0, 0.55, -0.8]),
			...[-0.82, 0.82].map((lx) => kotak([0.06, 0.45, 3.0], w, [lx, 0.85, -0.8])),
			kotak([1.7, 0.45, 0.06], w, [0, 0.85, -2.28]),
			kotak([1.58, 0.36, 0.5], "#a16207", [0, 0.82, -1.6]),
			...[-0.55, 0.55].map((lx) => lampu(lx, 0.78, 2.31)),
			...[-0.7, 0.7].map((lx) => rem(lx, 0.85, -2.32, 0.2)),
		],
	},
	{
		id: "angkot",
		nama: "Angkot Hijau Bogor",
		ikon: "🚐",
		ket: "Ikon 'Kota Sejuta Angkot' — hijau berstrip, pintu samping terbuka",
		harga: 4000,
		warna: ["#16a34a", "#22c55e", "#0ea5e9", "#f59e0b"],
		laju: 0.88,
		gas: 0.9,
		kursi: 4,
		L: 4.2,
		W: 1.66,
		roda: { r: 0.3, x: 0.78, z: 1.35 },
		pintu: { z: 1.9, p: 0.8 },
		bangun: (w) => [
			kotak([1.66, 1.35, 4.2], w, [0, 1.12, 0]),
			kotak([1.5, 0.5, 0.05], kaca, [0, 1.45, 2.11]),
			...[-1, 1].map((s) => kotak([0.04, 0.4, 3.0], kaca, [s * 0.84, 1.5, -0.45])),
			...[-1, 1].map((s) => kotak([0.045, 0.1, 4.0], "#f8fafc", [s * 0.835, 1.0, 0])),
			kotak([0.05, 1.0, 0.9], "#111827", [0.836, 1.0, 0.6]),
			kotak([1.2, 0.18, 0.5], "#facc15", [0, 1.88, 1.6]),
			...[-0.55, 0.55].map((lx) => lampu(lx, 0.72, 2.11, 0.3)),
			...[-0.6, 0.6].map((lx) => rem(lx, 0.8, -2.11, 0.24)),
		],
	},
	{
		id: "ev",
		nama: "Mobil Listrik Mungil",
		ikon: "🔋",
		ket: "Senyap tanpa bensin, tarikan responsif — pas untuk dua orang",
		harga: 4500,
		warna: ["#a7f3d0", "#fbcfe8", "#f8fafc", "#bfdbfe", "#fde68a"],
		laju: 0.95,
		gas: 1.4,
		kursi: 2,
		L: 2.9,
		W: 1.5,
		roda: { r: 0.27, x: 0.7, z: 0.95 },
		pintu: { z: 0.55, p: 0.95 },
		bangun: (w) => [
			kotak([1.5, 0.55, 2.9], w, [0, 0.55, 0]),
			kotak([1.36, 0.75, 2.2], kaca, [0, 1.2, -0.15]),
			kotak([1.38, 0.07, 2.15], "#f8fafc", [0, 1.6, -0.15]),
			kotak([1.2, 0.05, 0.03], "#e0f2fe", [0, 0.7, 1.46]),
			...[-0.5, 0.5].map((lx) => rem(lx, 0.75, -1.46, 0.3)),
		],
	},
	{
		id: "jip",
		nama: "Jip Klasik Terbuka",
		ikon: "🚙",
		ket: "Gaya petualang tanpa atap, roll bar & ban serep di belakang",
		harga: 8000,
		warna: ["#4d5d2a", "#7f1d1d", "#d6c7a1", "#1e3a8a", "#f97316"],
		laju: 1.02,
		gas: 1.15,
		kursi: 4,
		L: 3.7,
		W: 1.7,
		roda: { r: 0.36, x: 0.8, z: 1.15 },
		pintu: { z: 0.6, p: 0.8 },
		bangun: (w) => [
			kotak([1.6, 0.55, 3.7], w, [0, 0.78, 0]),
			...[-1, 1].flatMap((s) => [kotak([0.25, 0.08, 1.0], w, [s * 0.8, 1.08, 1.15]), kotak([0.25, 0.08, 1.0], w, [s * 0.8, 1.08, -1.15])]),
			kotak([1.5, 0.45, 0.05], kaca, [0, 1.3, 0.95], 0),
			...[-0.7, 0.7].map((lx) => kotak([0.06, 0.75, 0.06], "#27272a", [lx, 1.42, -0.6])),
			kotak([1.46, 0.06, 0.06], "#27272a", [0, 1.8, -0.6]),
			kotak([1.4, 0.35, 0.6], "#3f3f46", [0, 1.15, -0.8]),
			warnai(new CylinderGeometry(0.33, 0.33, 0.2, 14), "#18181b", { p: [0, 1.0, -1.95], r: [Math.PI / 2, 0, 0] }),
			...[-0.55, 0.55].map((lx) => warnai(new CylinderGeometry(0.1, 0.1, 0.04, 12), "#fff8e0", { p: [lx, 0.95, 1.86], r: [Math.PI / 2, 0, 0] })),
			...[-0.6, 0.6].map((lx) => rem(lx, 0.85, -1.86, 0.2)),
		],
	},
];

// ---------- motor ----------
// roda: { r, depan, belakang }; badan + setang (setang dibuat terpisah di Parkiran).

export const MODEL_MOTOR = [
	{
		id: "matik",
		nama: "Matik Harian",
		ikon: "🛵",
		ket: "Skuter matik sejuta umat — irit, ringan, gampang dikendarai",
		harga: 1200,
		warna: ["#111827", "#dc2626", "#f8fafc", "#2563eb", "#ec4899"],
		laju: 1.0,
		gas: 1.05,
		roda: { r: 0.25, depan: 0.6, belakang: -0.58 },
		bangun: (w) => [
			kotak([0.34, 0.55, 0.3], w, [0, 0.62, 0.48]),
			kotak([0.3, 0.08, 0.6], "#27272a", [0, 0.38, 0.05]),
			kotak([0.34, 0.42, 0.65], w, [0, 0.58, -0.35]),
			kotak([0.3, 0.1, 0.62], "#1b1b1b", [0, 0.84, -0.3]),
		],
	},
	{
		id: "maxi",
		nama: "Maxi Skuter",
		ikon: "🛵",
		ket: "Skuter bongsor berbodi lebar, kaca depan tinggi, nyaman touring",
		harga: 3500,
		warna: ["#111827", "#f8fafc", "#475569", "#1e3a8a", "#b91c1c"],
		laju: 1.15,
		gas: 1.0,
		roda: { r: 0.3, depan: 0.7, belakang: -0.66 },
		bangun: (w) => [
			kotak([0.46, 0.6, 0.4], w, [0, 0.7, 0.55]),
			kotak([0.4, 0.35, 0.04], "#9ca3af", [0, 1.15, 0.62], 0),
			kotak([0.4, 0.12, 0.65], "#27272a", [0, 0.42, 0.05]),
			kotak([0.46, 0.5, 0.75], w, [0, 0.66, -0.4]),
			kotak([0.4, 0.12, 0.7], "#1b1b1b", [0, 0.96, -0.35]),
		],
	},
	{
		id: "bebek",
		nama: "Motor Bebek",
		ikon: "🏍️",
		ket: "Motor bebek bandel andalan ojek pangkalan — kopling otomatis",
		harga: 1000,
		warna: ["#1d4ed8", "#111827", "#dc2626", "#f8fafc"],
		laju: 1.05,
		gas: 1.0,
		roda: { r: 0.3, depan: 0.62, belakang: -0.62 },
		bangun: (w) => [
			kotak([0.18, 0.5, 0.25], w, [0, 0.75, 0.45]),
			kotak([0.1, 0.1, 0.7], "#3f3f46", [0, 0.52, 0.05]),
			kotak([0.3, 0.32, 0.6], w, [0, 0.62, -0.3]),
			kotak([0.28, 0.1, 0.62], "#1b1b1b", [0, 0.83, -0.25]),
		],
	},
	{
		id: "sport",
		nama: "Sport Fairing 250",
		ikon: "🏍️",
		ket: "Motor sport berfairing — paling kencang di kelasnya",
		harga: 6000,
		warna: ["#16a34a", "#dc2626", "#111827", "#f8fafc", "#2563eb"],
		laju: 1.35,
		gas: 1.25,
		roda: { r: 0.32, depan: 0.68, belakang: -0.68 },
		bangun: (w) => [
			kotak([0.42, 0.45, 0.65], w, [0, 0.72, 0.45]),
			kotak([0.32, 0.18, 0.05], "#334155", [0, 1.0, 0.72], 0),
			kotak([0.36, 0.3, 0.5], w, [0, 0.86, 0.0]),
			kotak([0.28, 0.09, 0.55], "#1b1b1b", [0, 0.92, -0.4]),
			kotak([0.3, 0.2, 0.45], w, [0, 0.9, -0.65]),
			kotak([0.1, 0.1, 0.5], "#a1a1aa", [0.16, 0.45, -0.45]),
		],
	},
	{
		id: "trail",
		nama: "Trail Petualang",
		ikon: "🏍️",
		ket: "Spakbor tinggi & suspensi panjang — cocok jalan berbatu desa",
		harga: 4000,
		warna: ["#16a34a", "#ea580c", "#dc2626", "#2563eb", "#facc15"],
		laju: 1.1,
		gas: 1.2,
		roda: { r: 0.36, depan: 0.72, belakang: -0.68 },
		bangun: (w) => [
			kotak([0.22, 0.06, 0.5], w, [0, 0.95, 0.72]),
			kotak([0.3, 0.3, 0.45], w, [0, 0.9, 0.2]),
			kotak([0.26, 0.08, 0.8], "#1b1b1b", [0, 1.02, -0.25]),
			kotak([0.22, 0.06, 0.5], w, [0, 0.98, -0.72]),
			kotak([0.12, 0.35, 0.3], "#3f3f46", [0, 0.6, 0.0]),
		],
	},
	{
		id: "retro",
		nama: "Skuter Retro",
		ikon: "🛵",
		ket: "Gaya klasik bodi membulat & lampu bulat — ganteng buat nongkrong",
		harga: 2500,
		warna: ["#a7f3d0", "#fde68a", "#fca5a5", "#f8fafc", "#93c5fd"],
		laju: 0.92,
		gas: 0.95,
		roda: { r: 0.24, depan: 0.6, belakang: -0.55 },
		bangun: (w) => [
			kotak([0.36, 0.6, 0.12], w, [0, 0.66, 0.5]),
			kotak([0.3, 0.07, 0.6], "#e7e5e4", [0, 0.36, 0.1]),
			warnai(new SphereGeometry(0.3, 12, 10), w, { p: [0, 0.6, -0.4], s: [1.1, 0.85, 1.4] }),
			kotak([0.28, 0.1, 0.55], "#78350f", [0, 0.86, -0.3]),
			warnai(new CylinderGeometry(0.08, 0.08, 0.05, 12), "#fff8e0", { p: [0, 1.02, 0.6], r: [Math.PI / 2, 0, 0] }),
		],
	},
	{
		id: "listrik",
		nama: "Motor Listrik",
		ikon: "⚡",
		ket: "Tanpa knalpot, isi daya di rumah — tarikan awal paling responsif",
		harga: 1800,
		warna: ["#f8fafc", "#111827", "#22d3ee", "#a3e635"],
		laju: 1.0,
		gas: 1.4,
		roda: { r: 0.26, depan: 0.6, belakang: -0.58 },
		bangun: (w) => [
			kotak([0.32, 0.5, 0.28], w, [0, 0.62, 0.48]),
			kotak([0.3, 0.1, 0.6], "#0f172a", [0, 0.38, 0.05]),
			kotak([0.32, 0.36, 0.62], w, [0, 0.58, -0.35]),
			kotak([0.33, 0.04, 0.5], "#22d3ee", [0, 0.6, -0.35]),
			kotak([0.28, 0.1, 0.6], "#1b1b1b", [0, 0.82, -0.3]),
		],
	},
];

export const MODEL_PER_JENIS = { mobil: MODEL_MOBIL, motor: MODEL_MOTOR };
export const cariModel = (jenis, id) => MODEL_PER_JENIS[jenis]?.find((m) => m.id === id) || null;

// id kendaraan milik → { jenis, model, slot } (atau null untuk kendaraan parkir biasa)
export function modelDariId(id) {
	const m = /^(mobil|motor):(\d{1,2})$/.exec(id || "");
	if (!m) return null;
	const n = +m[2] - NOMOR_MILIK;
	const daftar = MODEL_PER_JENIS[m[1]];
	if (n < 0 || !daftar) return null;
	const model = daftar[Math.floor(n / SLOT_MILIK)];
	return model ? { jenis: m[1], model, slot: n % SLOT_MILIK } : null;
}
export const idMilik = (jenis, modelId, slot) => `${jenis}:${NOMOR_MILIK + MODEL_PER_JENIS[jenis].findIndex((m) => m.id === modelId) * SLOT_MILIK + slot}`;

// Geometri badan model berwarna (dipakai kendaraan milik & pajangan showroom).
export const geomBadanModel = (model, warna) => gabung(model.bangun(warna));
