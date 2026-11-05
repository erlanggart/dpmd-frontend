// Taman Warga: taman air mancur, lapangan basket, dan taman bermain di lahan kosong
// sebelah barat Kolam Monster. Koordinat adegan (meter), y relatif tanah halaman.
// Modul ini sengaja tanpa impor: layout.js memakainya untuk tabrakan & tempat duduk.

const kotak = (x, z, lx, lz) => ({ x0: x - lx / 2, x1: x + lx / 2, z0: z - lz / 2, z1: z + lz / 2 });
const titik = (x, z, r) => ({ x0: x - r, x1: x + r, z0: z - r, z1: z + r });

// ---------- A. Taman air mancur (di dalam jalan melingkar) ----------
// Rumput dibatasi agar tidak menimpa badan jalan OSM (x -42.5..-24.5, z 19.5..29 kosong).
export const RUMPUT_TAMAN = { x0: -41, x1: -27, z0: 20.5, z1: 28.5 };
export const AIR_MANCUR = { x: -34, z: 24.5, r: 3, rBibir: 3.25 };
// petak bunga [x, z, lx, lz, warna kelopak]
export const PETAK_BUNGA = [
	[AIR_MANCUR.x - 5.2, AIR_MANCUR.z - 2.7, 2.4, 1, "#ef4444"],
	[AIR_MANCUR.x + 5.2, AIR_MANCUR.z - 2.7, 2.4, 1, "#facc15"],
	[AIR_MANCUR.x - 5.2, AIR_MANCUR.z + 2.7, 2.4, 1, "#f472b6"],
	[AIR_MANCUR.x + 5.2, AIR_MANCUR.z + 2.7, 2.4, 1, "#fb923c"],
];
export const LAMPU_TAMAN = [
	{ x: AIR_MANCUR.x - 6.8, z: AIR_MANCUR.z },
	{ x: AIR_MANCUR.x + 6.8, z: AIR_MANCUR.z },
	{ x: AIR_MANCUR.x, z: AIR_MANCUR.z - 3.8 },
	{ x: AIR_MANCUR.x, z: AIR_MANCUR.z + 3.8 },
];
// rot = arah hadap orang yang duduk: (sin rot, cos rot)
export const BANGKU_TAMAN = [
	{ x: AIR_MANCUR.x - 4.3, z: AIR_MANCUR.z - 1.2, rot: Math.PI / 2 },
	{ x: AIR_MANCUR.x - 4.3, z: AIR_MANCUR.z + 1.2, rot: Math.PI / 2 },
	{ x: AIR_MANCUR.x + 4.3, z: AIR_MANCUR.z - 1.2, rot: -Math.PI / 2 },
	{ x: AIR_MANCUR.x + 4.3, z: AIR_MANCUR.z + 1.2, rot: -Math.PI / 2 },
	// taman bermain, menghadap ke ayunan
	{ x: -59.6, z: -1, rot: -Math.PI / 2 },
	{ x: -59.6, z: -8, rot: -Math.PI / 2 },
];
// papan nama berkaki di tepi utara rumput, menghadap ke selatan (arah kantor)
export const PAPAN_TAMAN = { x: -34, z: 29.1, lebar: 3, tinggi: 0.8, kaki: 1.2 };

// jalur jogging mengelilingi jalan melingkar (sudut dipotong supaya tetap di badan jalan)
const JC = { x: -33.5, z: 24, rx: 11.5, rz: 6.5, p: 2.5 };
export const JALUR_JOGGING = [
	[JC.x - JC.rx + JC.p, JC.z - JC.rz],
	[JC.x + JC.rx - JC.p, JC.z - JC.rz],
	[JC.x + JC.rx, JC.z - JC.rz + JC.p],
	[JC.x + JC.rx, JC.z + JC.rz - JC.p],
	[JC.x + JC.rx - JC.p, JC.z + JC.rz],
	[JC.x - JC.rx + JC.p, JC.z + JC.rz],
	[JC.x - JC.rx, JC.z + JC.rz - JC.p],
	[JC.x - JC.rx, JC.z - JC.rz + JC.p],
];
// jalan kaki antara taman air dan taman bermain, lewat sela lapangan basket & pagar kolam
export const JALUR_ANTAR_TAMAN = [[-45, 22], [-48.5, 17], [-48.5, 9.2], [-57.2, 9.2], [-57.2, -2], [-60.5, -2]];

// ---------- B. Lapangan basket ----------
export const LAPANGAN = { x0: -64, x1: -52, z0: 10.5, z1: 27.5 };
// ring di kedua ujung z; arah = ke mana papan menghadap (+1 ke +z)
export const RING_BASKET = [
	{ x: -58, z: 10.95, arah: 1 },
	{ x: -58, z: 27.05, arah: -1 },
];
export const TRIBUN = { x0: -51.6, x1: -50.2, z0: 13, z1: 25 };
export const PENONTON_TRIBUN = [14.5, 17.5, 20.5, 23.5].map((z) => ({ x: -51.3, z, rot: -Math.PI / 2 }));

// ---------- C. Taman bermain ----------
// Digeser dari rancangan awal (x -73..-58): tepi Situ Pemda di x ≈ -72 dan ada batu di x -70.5..-67.9.
export const TAMAN_BERMAIN = { x0: -67.5, x1: -58, z0: -16, z1: 6 };
export const AYUNAN = { x: -63.2, z: 2.5, lebar: 3.4, tinggi: 2.4, jarak: 0.55 };
export const PEROSOTAN = { x: -63.5, z: -3 };
export const JUNGKAT = { x: -62.5, z: -9.5, panjang: 3 };
export const SAUNG = { x: -62.5, z: -13.6, sisi: 3.4 };

// peneduh di sela taman: [x, z]
export const POHON_TAMAN = [[-44, 11.8], [-36, 11.2], [-28, 11.8], [-19.5, 19], [-66.5, 19], [-66, 26.5], [-48, 28]];
// pohon sedekat ini dari lapangan masuk jangkauan kamera basket (jarak bawaan 10 m) dan menutupi laga
export const pohonGanggu = (x, z) => Math.hypot(Math.max(LAPANGAN.x0 - x, 0, x - LAPANGAN.x1), Math.max(LAPANGAN.z0 - z, 0, z - LAPANGAN.z1)) < 12;

// ---------- penghalang tabrakan ----------
const kotakBangku = (b) => (Math.abs(Math.sin(b.rot)) > 0.5 ? kotak(b.x, b.z, 0.55, 1.5) : kotak(b.x, b.z, 1.5, 0.55));
export const PENGHALANG_TAMAN = [
	titik(AIR_MANCUR.x, AIR_MANCUR.z, AIR_MANCUR.rBibir),
	...BANGKU_TAMAN.map(kotakBangku),
	...LAMPU_TAMAN.map((l) => titik(l.x, l.z, 0.15)),
	titik(PAPAN_TAMAN.x - PAPAN_TAMAN.lebar / 2 + 0.2, PAPAN_TAMAN.z, 0.12),
	titik(PAPAN_TAMAN.x + PAPAN_TAMAN.lebar / 2 - 0.2, PAPAN_TAMAN.z, 0.12),
	...RING_BASKET.map((r) => titik(r.x, r.z, 0.15)),
	{ x0: TRIBUN.x0, x1: TRIBUN.x1, z0: TRIBUN.z0, z1: TRIBUN.z1 },
	// ayunan: empat kaki rangka
	...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => titik(AYUNAN.x + (sx * AYUNAN.lebar) / 2, AYUNAN.z + sz * 0.6, 0.12))),
	kotak(PEROSOTAN.x, PEROSOTAN.z - 1.2, 1.1, 4.2),
	kotak(JUNGKAT.x, JUNGKAT.z, 0.5, 0.6),
	...POHON_TAMAN.map(([x, z]) => titik(x, z, 0.4)),
	...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => titik(SAUNG.x + (sx * (SAUNG.sisi - 0.4)) / 2, SAUNG.z + (sz * (SAUNG.sisi - 0.4)) / 2, 0.15))),
];
