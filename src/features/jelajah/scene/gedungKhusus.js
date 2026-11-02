import { LAHAN_KHUSUS } from "./kawasanData";

// Gedung buatan tangan di koridor Jl. Tegar Beriman yang bisa dimasuki: McD (barat) dan
// Cibinong City Mall (timur). Lahannya (LAHAN_KHUSUS) dikosongkan oleh jelajah-kawasan.mjs.
// Koordinat adegan, semua kotak sejajar sumbu; +x barat, +z ≈ utara. Berkas ini sengaja
// tidak mengimpor layout.js (layout → kawasanBantu → berkas ini).

const kotak = (x0, x1, z0, z1, ekstra = {}) => ({ x0, x1, z0, z1, ...ekstra });
const dalam = (k, x, z) => x > k.x0 && x < k.x1 && z > k.z0 && z < k.z1;

// ---------- McD Tegar Beriman ----------
// Muka gedung menghadap jalan (+z). Masuk lewat pintu kaca, pesan di konter belakang,
// lalu duduk di meja — pesanan diantar di nampan.
export const LAHAN_MCD = LAHAN_KHUSUS.mcd;
export const MCD = kotak(871, 899, -992, -974, { tinggi: 5.2, pintu: { x0: 883.5, x1: 886.5, z: -974 } });
export const KONTER_MCD = kotak(876, 894, -989.2, -988.2);
export const TITIK_PESAN_MCD = { x: 885, z: -987.4 };
export const MEJA_MCD = [874.5, 878.5, 891.5, 895.5].flatMap((x) => [-984.5, -979.5].map((z) => kotak(x - 0.45, x + 0.45, z - 0.35, z + 0.35, { x, z })));
// [x, z, rot]; kursi menghadap mejanya
export const KURSI_MCD_DASAR = MEJA_MCD.flatMap((m) => [
	[m.x, m.z - 0.62, 0],
	[m.x, m.z + 0.62, Math.PI],
]);
export const KIOS_MCD = [
	{ x: 879.5, z: -975.3 },
	{ x: 890.5, z: -975.3 },
];
export const TIANG_MCD = { x: 917, z: -959 };
export const JENDELA_DRIVE = { x: 899, z: -985 };
export const PAPAN_DRIVE = { x: 905, z: -979 };
export const dalamMcd = (x, z) => dalam(MCD, x, z);

// ---------- Cibinong City Mall ----------
// Massa mal setinggi 20 m memenuhi lahan; yang bisa dimasuki adalah aula lantai dasar di
// tengah (pintu kaca menghadap Jl. Tegar Beriman di −z): supermarket, butik, kedai kopi,
// eskalator hias, air mancur, dan bioskop (loket + studio).
export const LAHAN_CCM = LAHAN_KHUSUS.ccm;
export const TINGGI_CCM = 20;
export const AULA_CCM = kotak(-1795, -1720, -600, -556, { tinggi: 7, pintu: { x0: -1761, x1: -1754, z: -600 } });
// pusat x supermarket (toko berdenah sama dengan Alfamart; disusun di layout.js)
export const SUPERMARKET_CCM = { cx: -1734, z0: -565 };
export const BUTIK_CCM = kotak(-1770, -1756, -565, -556, { tinggi: 4.4 });
export const KASIR_BUTIK = kotak(-1758.6, -1757.6, -563.4, -560.8);
export const TITIK_BUTIK = [
	{ x: -1759.4, z: -562.1 },
	{ x: -1765, z: -560.4 },
];
export const MANEKIN_CCM = [
	{ x: -1768.4, z: -563.6, rot: Math.PI, gaya: { t: 3, b: 4, c: 2, s: 2 } },
	{ x: -1762.6, z: -557.9, rot: Math.PI, gaya: { t: 8, b: 3, c: 4, s: 4 } },
];
export const ESKALATOR_CCM = kotak(-1750, -1744, -565, -556);
export const AIR_MANCUR = { x: -1757.5, z: -580, r: 2.4 };
// kedai kopi di dinding barat aula: konter, barista, dan meja-meja kecil
export const KONTER_KOPI = kotak(-1724.2, -1723.2, -593, -585);
export const TITIK_PESAN_KOPI = { x: -1725.4, z: -589 };
export const MEJA_KOPI = [-1735.5, -1730.5].flatMap((x) => [-595, -590.5, -586].map((z) => kotak(x - 0.4, x + 0.4, z - 0.35, z + 0.35, { x, z })));
export const KURSI_KOPI_DASAR = MEJA_KOPI.flatMap((m) => [
	[m.x, m.z - 0.62, 0],
	[m.x, m.z + 0.62, Math.PI],
]);
// bioskop: loket di aula, studio di pojok timur-belakang (pintu di dinding baratnya)
export const STUDIO = kotak(-1795, -1777, -588, -556, { tinggi: 6.5, pintu: { x: -1777, z0: -586.2, z1: -583.4 } });
export const LOKET = kotak(-1793, -1792, -597, -591);
export const TITIK_LOKET = { x: -1790.8, z: -594 };
export const LAYAR = { x: -1786.5, y: 3.7, z: STUDIO.z1 - 0.25, lebar: 14, tinggi: 6 };
export const BARIS_KURSI = Array.from({ length: 9 }, (_, i) => -581.6 + i * 1.6);
export const KOLOM_KURSI = Array.from({ length: 12 }, (_, i) => -1793 + i);
// [x, z, rot] — semua menghadap layar (+z)
export const KURSI_BIOSKOP_DASAR = BARIS_KURSI.flatMap((z) => KOLOM_KURSI.map((x) => [x, z, 0]));
export const dalamStudio = (x, z) => dalam(STUDIO, x, z);
export const dalamAulaCcm = (x, z) => dalam(AULA_CCM, x, z);

// Pengunjung mal & pelanggan yang berdiri (hiasan).
export const PENGUNJUNG_CCM = [
	[-1766, -590, 0.6],
	[-1748.5, -586, -2.2],
	[-1742, -576, 1.4],
	[-1771, -575, 2.8],
	[-1752, -571, -0.4],
	[-1780, -596, 1.0],
];

// Di dalam gedung buatan tangan (kamera mendekat & menunduk seperti di dalam toko).
export const dalamGedungKhusus = (x, z) => dalamMcd(x, z) || dalamAulaCcm(x, z);

// ---------- penghalang ----------
// tinggi > 0: ikut menahan kamera (tinggiGedungDi). tembus: hanya untuk kamera, tidak menahan
// langkah (rongga aula & gedung McD yang bisa dimasuki).
const L = LAHAN_CCM;
const A = AULA_CCM;
const tebal = 0.25;
export const PADAT_KHUSUS = [
	// McD: dinding berpintu, konter, meja, kios, tiang papan, papan drive-thru
	kotak(MCD.x0, MCD.x1, MCD.z1 - 6, MCD.z1, { tinggi: MCD.tinggi + 0.6, tembus: true }),
	kotak(MCD.x0, MCD.x1, MCD.z0, MCD.z1 - 6, { tinggi: MCD.tinggi + 0.6, tembus: true }),
	kotak(MCD.x0, MCD.x1, MCD.z0, MCD.z0 + tebal),
	kotak(MCD.x0, MCD.x0 + tebal, MCD.z0, MCD.z1),
	kotak(MCD.x1 - tebal, MCD.x1, MCD.z0, MCD.z1),
	kotak(MCD.x0, MCD.pintu.x0, MCD.z1 - tebal, MCD.z1),
	kotak(MCD.pintu.x1, MCD.x1, MCD.z1 - tebal, MCD.z1),
	KONTER_MCD,
	kotak(MCD.x0, MCD.x1, MCD.z0, KONTER_MCD.z0 - 0.9),
	...MEJA_MCD,
	...KIOS_MCD.map((k) => kotak(k.x - 0.3, k.x + 0.3, k.z - 0.2, k.z + 0.2)),
	kotak(TIANG_MCD.x - 0.45, TIANG_MCD.x + 0.45, TIANG_MCD.z - 0.45, TIANG_MCD.z + 0.45),
	kotak(PAPAN_DRIVE.x - 1, PAPAN_DRIVE.x + 1, PAPAN_DRIVE.z - 0.15, PAPAN_DRIVE.z + 0.15),
	// CCM: massa mal di kiri, kanan, & belakang aula; dinding muka berpintu
	kotak(L.x0, A.x0, L.z0, L.z1, { tinggi: TINGGI_CCM }),
	kotak(A.x1, L.x1, L.z0, L.z1, { tinggi: TINGGI_CCM }),
	kotak(A.x0, A.x1, A.z1, L.z1, { tinggi: TINGGI_CCM }),
	kotak(A.x0, A.x1, A.z0, A.z1, { tinggi: TINGGI_CCM, tembus: true }),
	kotak(A.x0, A.pintu.x0, A.z0, A.z0 + 0.3),
	kotak(A.pintu.x1, A.x1, A.z0, A.z0 + 0.3),
	// butik: sekat samping, rak baju belakang, kasir, manekin
	kotak(BUTIK_CCM.x0, BUTIK_CCM.x0 + 0.15, BUTIK_CCM.z0, BUTIK_CCM.z1),
	kotak(BUTIK_CCM.x1 - 0.15, BUTIK_CCM.x1, BUTIK_CCM.z0, BUTIK_CCM.z1),
	kotak(BUTIK_CCM.x0, BUTIK_CCM.x1, BUTIK_CCM.z1 - 1.1, BUTIK_CCM.z1),
	KASIR_BUTIK,
	...MANEKIN_CCM.map((m) => kotak(m.x - 0.3, m.x + 0.3, m.z - 0.3, m.z + 0.3)),
	ESKALATOR_CCM,
	kotak(AIR_MANCUR.x - AIR_MANCUR.r, AIR_MANCUR.x + AIR_MANCUR.r, AIR_MANCUR.z - AIR_MANCUR.r, AIR_MANCUR.z + AIR_MANCUR.r),
	// kedai kopi
	KONTER_KOPI,
	kotak(KONTER_KOPI.x1, A.x1, KONTER_KOPI.z0 - 1, KONTER_KOPI.z0 - 0.8),
	kotak(KONTER_KOPI.x1, A.x1, KONTER_KOPI.z1 + 0.8, KONTER_KOPI.z1 + 1),
	...MEJA_KOPI,
	// bioskop: loket, dinding studio berpintu, sandaran tiap baris kursi
	LOKET,
	kotak(STUDIO.x0, STUDIO.x1, STUDIO.z0, STUDIO.z0 + tebal),
	kotak(STUDIO.x1 - tebal, STUDIO.x1, STUDIO.z0, STUDIO.pintu.z0),
	kotak(STUDIO.x1 - tebal, STUDIO.x1, STUDIO.pintu.z1, STUDIO.z1),
	...BARIS_KURSI.map((z) => kotak(KOLOM_KURSI[0] - 0.45, KOLOM_KURSI[KOLOM_KURSI.length - 1] + 0.45, z - 0.5, z - 0.32)),
	kotak(STUDIO.x0, STUDIO.x1, STUDIO.z1 - 1.4, STUDIO.z1),
	...PENGUNJUNG_CCM.map(([x, z]) => kotak(x - 0.3, x + 0.3, z - 0.3, z + 0.3)),
];

// Papan nama melayang (penunjuk arah dari kejauhan): [teks, x, z, tinggi, jenis]
export const LABEL_KHUSUS = [
	["McD Tegar Beriman", (MCD.x0 + MCD.x1) / 2, (MCD.z0 + MCD.z1) / 2, MCD.tinggi + 3.5, 0],
	["Cibinong City Mall", (A.x0 + A.x1) / 2, (A.z0 + A.z1) / 2, TINGGI_CCM + 3, 0],
];

// Titik tiba "pindah cepat" (di depan pintu, menghadap gedung).
export const TIBA_KHUSUS = {
	mcd: { x: (MCD.pintu.x0 + MCD.pintu.x1) / 2, z: MCD.z1 + 5, lantai: 0, rot: Math.PI, yaw: 0 },
	ccm: { x: (A.pintu.x0 + A.pintu.x1) / 2, z: A.z0 - 7, lantai: 0, rot: 0, yaw: Math.PI },
};
