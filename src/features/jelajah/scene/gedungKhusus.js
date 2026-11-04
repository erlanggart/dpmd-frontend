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
// Massa mal setinggi 24 m memenuhi lahan. Aula di tengahnya bisa dimasuki di keempat lantai
// (tiap 6 m), dengan atrium terbuka berpagar kaca & air mancur di dasar, eskalator bertumpuk
// (bisa dinaiki berjalan), dan lift:
//   Lt 1 — pintu utama, supermarket, kedai kopi, meja informasi, deretan toko;
//   Lt 2 — butik & toko fesyen;
//   Lt 3 — food court (pesan makan) & zona permainan;
//   Lt 4 — bioskop: loket, konter popcorn, studio.
// Tinggi pemain di dalam mal ditentukan tinggiMal(); penghalang & titik interaksi bertanda
// lantaiMal hanya berlaku di lantainya (lihat malAktif).
export const LAHAN_CCM = LAHAN_KHUSUS.ccm;
export const TINGGI_LANTAI_MAL = 6;
export const JUMLAH_LANTAI_MAL = 4;
export const TINGGI_CCM = TINGGI_LANTAI_MAL * JUMLAH_LANTAI_MAL;
// Tanah halaman (sama dengan TANAH di layout.js = −FONDASI); berkas ini tak boleh mengimpor layout.js.
const DASAR = -0.6;
export const yLantaiMal = (n) => n * TINGGI_LANTAI_MAL; // relatif halaman
export const lantaiMalDariY = (y) => Math.max(0, Math.min(JUMLAH_LANTAI_MAL - 1, Math.round((y - DASAR) / TINGGI_LANTAI_MAL)));
// lantai mal tempat pemain berada saat ini (diisi Pemain tiap frame)
export const malAktif = { lantai: 0 };

export const AULA_CCM = kotak(-1795, -1720, -600, -556, { pintu: { x0: -1761, x1: -1754, z: -600 } });
export const VOID_CCM = kotak(-1770, -1754, -590, -570);
// lubang eskalator: naik dari z0 (bawah) ke z1 (atas) untuk tiap lantai
export const ESKALATOR_CCM = kotak(-1752, -1746, -582, -572);
export const LIFT_CCM = kotak(-1723.5, -1720, -576, -570);
export const TITIK_LIFT = { x: -1725.2, z: -573 };
export const AIR_MANCUR = { x: -1762, z: -580, r: 2.4 };
export const dalamLahanCcm = (x, z) => dalam(LAHAN_CCM, x, z);
export const dalamAulaCcm = (x, z) => dalam(AULA_CCM, x, z);

// Tinggi pijakan di dalam lahan mal untuk langkah dari ketinggian yLama (dunia), atau null bila
// tak bisa dipijak (rongga atrium/eskalator di lantai atas, atau beda tinggi terlalu jauh).
export function tinggiMal(yLama, x, z) {
	const E = ESKALATOR_CCM;
	if (x > E.x0 && x < E.x1 && z > E.z0 - 0.01 && z < E.z1 + 0.01) {
		const u = Math.max(0, Math.min(1, (z - E.z0) / (E.z1 - E.z0)));
		let terbaik = null;
		for (let n = 0; n < JUMLAH_LANTAI_MAL - 1; n++) {
			const y = DASAR + yLantaiMal(n) + u * TINGGI_LANTAI_MAL;
			if (Math.abs(y - yLama) < 0.7 && (terbaik === null || Math.abs(y - yLama) < Math.abs(terbaik - yLama))) terbaik = y;
		}
		return terbaik;
	}
	const n = lantaiMalDariY(yLama);
	const y = DASAR + yLantaiMal(n);
	if (Math.abs(y - yLama) > 0.7) return null;
	if (n > 0 && dalam(VOID_CCM, x, z)) return null;
	return y;
}

// --- Lt 1 ---
// pusat x supermarket (toko berdenah sama dengan Alfamart; disusun di layout.js)
export const SUPERMARKET_CCM = { cx: -1734, z0: -565 };
export const KONTER_KOPI = kotak(-1724.2, -1723.2, -593, -585);
export const TITIK_PESAN_KOPI = { x: -1725.4, z: -589, lantaiMal: 0 };
export const MEJA_KOPI = [-1735.5, -1730.5].flatMap((x) => [-595, -590.5, -586].map((z) => kotak(x - 0.4, x + 0.4, z - 0.35, z + 0.35, { x, z })));
export const KURSI_KOPI_DASAR = MEJA_KOPI.flatMap((m) => [
	[m.x, m.z - 0.62, 0],
	[m.x, m.z + 0.62, Math.PI],
]);
export const INFO_CCM = kotak(-1781, -1776, -597.4, -596.4);

// --- Lt 2 ---
export const BUTIK_CCM = kotak(-1770, -1756, -565, -556, { tinggi: 4.4 });
export const KASIR_BUTIK = kotak(-1758.6, -1757.6, -563.4, -560.8);
export const TITIK_BUTIK = [
	{ x: -1759.4, z: -562.1, lantaiMal: 1 },
	{ x: -1765, z: -560.4, lantaiMal: 1 },
];
export const MANEKIN_CCM = [
	{ x: -1768.4, z: -563.6, rot: Math.PI, gaya: { t: 3, b: 4, c: 2, s: 2 } },
	{ x: -1762.6, z: -557.9, rot: Math.PI, gaya: { t: 8, b: 3, c: 4, s: 4 } },
];
// toko hias berpanggung pajangan (Lt 2): [teks, warna, kotak]
export const TOKO_LT2 = [
	["SEPATU & TAS", "#9a3412", kotak(-1795, -1781, -566, -556)],
	["KOSMETIK", "#be185d", kotak(-1740, -1726, -566, -556)],
	["JAM & KACAMATA", "#0e7490", kotak(-1795, -1781, -600, -590)],
];
export const BANGKU_LT2 = [
	kotak(-1764, -1760, -593.6, -593),
	kotak(-1764, -1760, -567, -566.4),
];

// --- Lt 3 ---
export const KIOS_FC = [
	["NASI GORENG", "#b91c1c", kotak(-1746, -1740.5, -559.5, -556)],
	["AYAM GEPREK", "#ea580c", kotak(-1740, -1734.5, -559.5, -556)],
	["BAKSO URAT", "#a16207", kotak(-1734, -1728.5, -559.5, -556)],
	["ES TEH & JUS", "#15803d", kotak(-1728, -1722.5, -559.5, -556)],
];
export const TITIK_PESAN_FC = { x: -1734.2, z: -561.3, lantaiMal: 2 };
export const MEJA_FC = [-1741, -1736, -1731, -1726].flatMap((x) => [-594.5, -589, -583.5, -578].map((z) => kotak(x - 0.45, x + 0.45, z - 0.4, z + 0.4, { x, z })));
export const KURSI_FC_DASAR = MEJA_FC.flatMap((m) => [
	[m.x, m.z - 0.65, 0],
	[m.x, m.z + 0.65, Math.PI],
]);
export const ZONA_MAIN = kotak(-1795, -1776, -598, -578);
export const MESIN_MAIN = [-1793, -1789.5, -1786, -1782.5, -1779].flatMap((x, i) => [-596.6, -579.4].map((z, j) => ({ x, z, rot: j ? Math.PI : 0, warna: ["#7c3aed", "#db2777", "#2563eb", "#16a34a", "#f59e0b"][(i + j) % 5] })));

// --- Lt 4: bioskop ---
export const STUDIO = kotak(-1795, -1777, -588, -556, { tinggi: 5.6, pintu: { x: -1777, z0: -586.2, z1: -583.4 } });
export const LOKET = kotak(-1793, -1792, -597, -591);
export const TITIK_LOKET = { x: -1790.8, z: -594, lantaiMal: 3 };
export const POPCORN = kotak(-1745, -1737, -566, -565);
export const LAYAR = { x: -1786.5, y: yLantaiMal(3) + 3.3, z: STUDIO.z1 - 0.25, lebar: 14, tinggi: 5.4 };
export const BARIS_KURSI = Array.from({ length: 9 }, (_, i) => -581.6 + i * 1.6);
export const KOLOM_KURSI = Array.from({ length: 12 }, (_, i) => -1793 + i);
// [x, z, rot] — semua menghadap layar (+z)
export const KURSI_BIOSKOP_DASAR = BARIS_KURSI.flatMap((z) => KOLOM_KURSI.map((x) => [x, z, 0]));
export const dalamStudio = (x, z) => dalam(STUDIO, x, z) && malAktif.lantai === 3;

// Pengunjung yang berdiri melihat-lihat (Tokoh): [x, z, rot, lantaiMal]
export const PENGUNJUNG_CCM = [
	[-1748.5, -594, -2.2, 0],
	[-1742, -569.5, 3.0, 0],
	[-1777.5, -594.5, 1.6, 0],
	[-1787, -568.5, 3.1, 1],
	[-1733, -568.5, 3.1, 1],
	[-1771.5, -563.5, 2.2, 1],
	[-1790, -588, 0.4, 2],
	[-1784, -590, -0.6, 2],
	[-1766, -594, 0.5, 3],
	[-1741, -568.5, 3.1, 3],
];
// Jalur keliling atrium untuk pengunjung yang berjalan (tiap lantai sama)
export const JALUR_KELILING = [
	[-1773, -593],
	[-1744, -593],
	[-1744, -567],
	[-1773, -567],
];

// Di dalam gedung buatan tangan (kamera mendekat & menunduk seperti di dalam toko).
export const dalamGedungKhusus = (x, z) => dalamMcd(x, z) || dalamAulaCcm(x, z);

// ---------- penghalang ----------
// tinggi > 0: ikut menahan kamera (tinggiGedungDi). tembus: hanya untuk kamera, tidak menahan
// langkah. lantaiMal: hanya berlaku di lantai mal itu.
const L = LAHAN_CCM;
const A = AULA_CCM;
const V = VOID_CCM;
const E = ESKALATOR_CCM;
const tebal = 0.25;
const di = (n, daftar) => daftar.map((k) => ({ ...k, lantaiMal: n }));
const pagarVoid = (n) =>
	di(n, [kotak(V.x0 - 0.15, V.x1 + 0.15, V.z0 - 0.15, V.z0), kotak(V.x0 - 0.15, V.x1 + 0.15, V.z1, V.z1 + 0.15), kotak(V.x0 - 0.15, V.x0, V.z0, V.z1), kotak(V.x1, V.x1 + 0.15, V.z0, V.z1)]);
export const PADAT_KHUSUS = [
	// McD: dinding berpintu, konter, meja, kios, tiang papan, papan drive-thru
	kotak(MCD.x0, MCD.x1, MCD.z0, MCD.z1, { tinggi: MCD.tinggi + 0.6, tembus: true }),
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
	// CCM: massa mal di kiri, kanan, & belakang aula (semua lantai); rongga aula hanya untuk kamera
	kotak(L.x0, A.x0, L.z0, L.z1, { tinggi: TINGGI_CCM }),
	kotak(A.x1, L.x1, L.z0, L.z1, { tinggi: TINGGI_CCM }),
	kotak(A.x0, A.x1, A.z1, L.z1, { tinggi: TINGGI_CCM }),
	kotak(A.x0, A.x1, A.z0, A.z1, { tinggi: TINGGI_CCM, tembus: true }),
	// dinding muka: berpintu di Lt 1, kaca penuh di lantai atas
	...di(0, [kotak(A.x0, A.pintu.x0, A.z0, A.z0 + 0.3), kotak(A.pintu.x1, A.x1, A.z0, A.z0 + 0.3)]),
	...[1, 2, 3].flatMap((n) => di(n, [kotak(A.x0, A.x1, A.z0, A.z0 + 0.3)])),
	// dinding samping lubang eskalator (semua lantai) & lift
	kotak(E.x0 - 0.2, E.x0, E.z0, E.z1),
	kotak(E.x1, E.x1 + 0.2, E.z0, E.z1),
	LIFT_CCM,
	// pagar kaca atrium di lantai atas; air mancur di dasar
	...[1, 2, 3].flatMap(pagarVoid),
	...di(0, [kotak(AIR_MANCUR.x - AIR_MANCUR.r, AIR_MANCUR.x + AIR_MANCUR.r, AIR_MANCUR.z - AIR_MANCUR.r, AIR_MANCUR.z + AIR_MANCUR.r)]),
	// Lt 1: kedai kopi & meja informasi
	...di(0, [
		KONTER_KOPI,
		kotak(KONTER_KOPI.x1, A.x1, KONTER_KOPI.z0 - 1, KONTER_KOPI.z0 - 0.8),
		kotak(KONTER_KOPI.x1, A.x1, KONTER_KOPI.z1 + 0.8, KONTER_KOPI.z1 + 1),
		...MEJA_KOPI,
		INFO_CCM,
	]),
	// Lt 2: butik (sekat samping, rak baju belakang, kasir, manekin), toko hias, bangku
	...di(1, [
		kotak(BUTIK_CCM.x0, BUTIK_CCM.x0 + 0.15, BUTIK_CCM.z0, BUTIK_CCM.z1),
		kotak(BUTIK_CCM.x1 - 0.15, BUTIK_CCM.x1, BUTIK_CCM.z0, BUTIK_CCM.z1),
		kotak(BUTIK_CCM.x0, BUTIK_CCM.x1, BUTIK_CCM.z1 - 1.1, BUTIK_CCM.z1),
		KASIR_BUTIK,
		...MANEKIN_CCM.map((m) => kotak(m.x - 0.3, m.x + 0.3, m.z - 0.3, m.z + 0.3)),
		...TOKO_LT2.map(([, , k]) => kotak(k.x0, k.x1, k.z0 < -580 ? k.z0 : k.z1 - 1.2, k.z0 < -580 ? k.z0 + 1.2 : k.z1)),
		...BANGKU_LT2,
	]),
	// Lt 3: kios food court, meja, mesin permainan
	...di(2, [...KIOS_FC.map(([, , k]) => k), ...MEJA_FC, ...MESIN_MAIN.map((m) => kotak(m.x - 0.6, m.x + 0.6, m.z - 0.45, m.z + 0.45))]),
	// Lt 4: loket, konter popcorn, dinding studio berpintu, sandaran tiap baris kursi, panggung
	...di(3, [
		LOKET,
		POPCORN,
		kotak(STUDIO.x0, STUDIO.x1, STUDIO.z0, STUDIO.z0 + tebal),
		kotak(STUDIO.x1 - tebal, STUDIO.x1, STUDIO.z0, STUDIO.pintu.z0),
		kotak(STUDIO.x1 - tebal, STUDIO.x1, STUDIO.pintu.z1, STUDIO.z1),
		...BARIS_KURSI.map((z) => kotak(KOLOM_KURSI[0] - 0.45, KOLOM_KURSI[KOLOM_KURSI.length - 1] + 0.45, z - 0.5, z - 0.32)),
		kotak(STUDIO.x0, STUDIO.x1, STUDIO.z1 - 1.4, STUDIO.z1),
	]),
	...PENGUNJUNG_CCM.map(([x, z, , n]) => ({ ...kotak(x - 0.3, x + 0.3, z - 0.3, z + 0.3), lantaiMal: n })),
];

// Titik tiba "pindah cepat" (di depan pintu, menghadap gedung).
export const TIBA_KHUSUS = {
	mcd: { x: (MCD.pintu.x0 + MCD.pintu.x1) / 2, z: MCD.z1 + 5, lantai: 0, rot: Math.PI, yaw: 0 },
	ccm: { x: (A.pintu.x0 + A.pintu.x1) / 2, z: A.z0 - 7, lantai: 0, rot: 0, yaw: Math.PI },
};
