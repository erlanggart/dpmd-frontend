// Kolam Monster DPMD — kolam pemancingan berbayar di sisi barat kantor (lahan kosong
// antara taman kantor dan Situ Pemda). Koordinat adegan dalam meter, y relatif tanah
// halaman. Modul ini sengaja tanpa impor: layout.js memakainya untuk tabrakan.

// Permukaan air (kotak). Pagar mengelilingi tiga sisi; sisi timur (menghadap kantor)
// terbuka dan berloket.
export const KOLAM_MONSTER = { x0: -54, x1: -28, z0: -16, z1: 6 };
const K = KOLAM_MONSTER;
// Kolam beton yang ditinggikan: bibir dinding batu setinggi lutut, air di atas tanah.
export const AIR_KOLAM_Y = 0.4;
export const BIBIR_KOLAM_Y = 0.56;
export const TEBAL_DINDING_KOLAM = 0.35;
// jarak pagar dari tepi air — ruang berdiri para pemancing
export const RUANG_TEPI_KOLAM = 1.8;
export const PAGAR_KOLAM = { x0: K.x0 - RUANG_TEPI_KOLAM, x1: K.x1, z0: K.z0 - RUANG_TEPI_KOLAM, z1: K.z1 + RUANG_TEPI_KOLAM, tinggi: 1.05 };
// kios loket di sisi timur; pembeli berdiri di sisi kantor
export const LOKET_KOLAM = { x: -26.2, z: -5, lx: 1.5, lz: 2.4, tinggi: 2.5 };
export const TITIK_LOKET_KOLAM = { x: -24.95, z: -5 };

export const diAirKolam = (x, z, tepi = 0) => x > K.x0 + tepi && x < K.x1 - tepi && z > K.z0 + tepi && z < K.z1 - tepi;

// "Kedalaman" = jarak ke tepi terdekat (makin ke tengah makin dalam).
export const jarakKeTepiKolam = (x, z) => (diAirKolam(x, z) ? Math.min(x - K.x0, K.x1 - x, z - K.z0, K.z1 - z) : 0);

// Titik memancing di tepi kolam: berdiri di darat ≤ 2,5 m dari air, menghadap air.
// Mengembalikan { x, z, rot } (arah hadap: sin(rot)·x, cos(rot)·z), atau null.
export function titikTepiKolam(x, z) {
	if (diAirKolam(x, z)) return null;
	const qx = Math.min(K.x1, Math.max(K.x0, x));
	const qz = Math.min(K.z1, Math.max(K.z0, z));
	const jarak = Math.hypot(x - qx, z - qz);
	if (jarak > 2.5 || jarak < 0.05) return null;
	return { x, z, rot: Math.atan2(qx - x, qz - z) };
}

// bangku pemancing tetap kolam (lawan lomba), menghadap air
export const BANGKU_KOLAM = [
	{ x: K.x0 - 0.95, z: -10, rot: Math.PI / 2 },
	{ x: K.x0 - 0.95, z: 1, rot: Math.PI / 2 },
	{ x: -46, z: K.z0 - 0.95, rot: 0 },
	{ x: -36, z: K.z0 - 0.95, rot: 0 },
	{ x: -42, z: K.z1 + 0.95, rot: Math.PI },
];
// bangku pancing untuk tamu di keempat sisi (bisa diduduki; dari bangku bisa langsung
// memancing). Dihindarkan dari bangku pemancing tetap & kios loket.
export const BANGKU_TAMU_KOLAM = (() => {
	const hasil = [];
	const jauhDari = (x, z) => BANGKU_KOLAM.every((b) => Math.hypot(b.x - x, b.z - z) > 1.4) && !(x > LOKET_KOLAM.x - 2 && Math.abs(z - LOKET_KOLAM.z) < LOKET_KOLAM.lz / 2 + 1);
	const tambah = (x, z, rot) => jauhDari(x, z) && hasil.push({ x, z, rot });
	for (let x = K.x0 + 1.4; x <= K.x1 - 1.2; x += 2.3) {
		tambah(x, K.z0 - 0.95, 0);
		tambah(x, K.z1 + 0.95, Math.PI);
	}
	for (let z = K.z0 + 1.5; z <= K.z1 - 1.4; z += 2.3) {
		tambah(K.x0 - 0.95, z, Math.PI / 2);
		tambah(K.x1 + 0.95, z, -Math.PI / 2);
	}
	return hasil;
})();

// papan juara di halaman depan loket
export const PAPAN_JUARA_KOLAM = { x: -25.4, z: 2.6 };

// Penghalang untuk tabrakan & pencarian jalur (lantai 0): air, kios, ruas pagar.
export const PENGHALANG_KOLAM = [
	{ x0: K.x0 - TEBAL_DINDING_KOLAM, x1: K.x1 + TEBAL_DINDING_KOLAM, z0: K.z0 - TEBAL_DINDING_KOLAM, z1: K.z1 + TEBAL_DINDING_KOLAM },
	{ x0: LOKET_KOLAM.x - LOKET_KOLAM.lx / 2, x1: LOKET_KOLAM.x + LOKET_KOLAM.lx / 2, z0: LOKET_KOLAM.z - LOKET_KOLAM.lz / 2, z1: LOKET_KOLAM.z + LOKET_KOLAM.lz / 2 },
	{ x0: PAGAR_KOLAM.x0 - 0.1, x1: PAGAR_KOLAM.x0 + 0.1, z0: PAGAR_KOLAM.z0, z1: PAGAR_KOLAM.z1 }, // barat
	{ x0: PAGAR_KOLAM.x0, x1: PAGAR_KOLAM.x1, z0: PAGAR_KOLAM.z0 - 0.1, z1: PAGAR_KOLAM.z0 + 0.1 }, // utara
	{ x0: PAGAR_KOLAM.x0, x1: PAGAR_KOLAM.x1, z0: PAGAR_KOLAM.z1 - 0.1, z1: PAGAR_KOLAM.z1 + 0.1 }, // selatan
	...BANGKU_KOLAM.map((b) => ({ x0: b.x - 0.35, x1: b.x + 0.35, z0: b.z - 0.35, z1: b.z + 0.35 })),
	{ x0: PAPAN_JUARA_KOLAM.x - 0.15, x1: PAPAN_JUARA_KOLAM.x + 0.15, z0: PAPAN_JUARA_KOLAM.z - 0.9, z1: PAPAN_JUARA_KOLAM.z + 0.9 },
];
