import { DERMAGA, keDuniaDermaga } from "./situ";

// Data acara harian kawasan kantor (bazar desa & lomba jetski). Dipakai kantorHidup.js (logika),
// AcaraKawasan.jsx (gambar) dan Pemain.jsx (titik interaksi). Koordinat dunia (meter).

// Bazar Desa: empat tenda di halaman depan, pembeli berdiri di z 67.6 (titik), penjual di balik meja.
export const TENDA_BAZAR = [
	{ id: "bambu", nama: "Kerajinan Bambu", x: -3.5, warna: "#b45309", kalimat: "Anyaman bambu buatan perajin desa." },
	{ id: "kopi", nama: "Kopi & Hasil Kebun", x: 2, warna: "#166534", kalimat: "Kopi dan hasil kebun dari desa-desa Bogor." },
	{ id: "batik", nama: "Batik Desa", x: 7.5, warna: "#7c3aed", kalimat: "Kain batik karya kelompok usaha desa." },
	{ id: "olahan", nama: "Olahan Pangan", x: 13, warna: "#dc2626", kalimat: "Keripik dan camilan olahan BUM Desa." },
].map((t) => ({ ...t, z: 70, titik: { x: t.x, z: 67.6 } }));

// Meja tiap tenda menghalangi jalan pemain.
export const PENGHALANG_BAZAR = TENDA_BAZAR.map((t) => ({ x0: t.x - 1.9, x1: t.x + 1.9, z0: 68.6, z1: 69.6 }));

// Lomba Jetski: stand panitia di darat dekat Dermaga Utara (jetski sewa muncul di air terdekat).
export const TITIK_PANITIA = keDuniaDermaga(DERMAGA[0], -3.6, 9.4);

// Rute 432 m di Situ Pemda (sudah divalidasi perahuBebas). Gerbang pertama = garis start, terakhir = finis.
export const GERBANG_JETSKI = [[-100, -30], [-85, -85], [-30, -150], [10, -205], [-60, -190], [-75, -120], [-100, -45]].map(([x, z]) => ({ x, z }));
export const RADIUS_GERBANG = 9;
export const BATAS_LOMBA = 120; // detik, sejak melewati garis start

export const MEDALI_JETSKI = [
	{ id: "emas", ikon: "🥇", nama: "Emas", batas: 34, koin: 800 },
	{ id: "perak", ikon: "🥈", nama: "Perak", batas: 44, koin: 500 },
	{ id: "perunggu", ikon: "🥉", nama: "Perunggu", batas: 60, koin: 250 },
];
