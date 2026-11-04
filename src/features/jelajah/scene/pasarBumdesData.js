// Food court "Pasar BUMDes" di utara Kolam Monster (lahan kosong antara kolam dan Situ
// Pemda). Enam lapak berbahan produk BUM Desa se-Kabupaten Bogor (menunya di warung.js),
// meja makan bersama di bawah pergola berlampu gantung, dan panggung live music.
// Koordinat adegan (meter), y relatif tanah. Tanpa impor: layout.js memakainya untuk tabrakan.

export const PASAR = { x0: -50, x1: -28, z0: -36, z1: -21 };

// lapak menghadap selatan (+z); pembeli berdiri di titik pesan di depan meja saji
const LEBAR_LAPAK = 3.0;
export const LAPAK_PASAR = ["pasar-kopi", "pasar-telur", "pasar-ikan", "pasar-kebun", "pasar-tempe", "pasar-sate"].map((id, i) => {
	const x = -47.6 + i * 3.5;
	return { id, x, z: -34.8, lx: LEBAR_LAPAK, lz: 1.8, titik: { x, z: -33.0 } };
});

// panggung live music di sisi barat, menghadap timur
export const PANGGUNG_PASAR = { x0: -49.8, x1: -46.6, z0: -30.2, z1: -24.2, tinggi: 0.45 };

// meja panjang (1,6 × 0,75 m) dengan empat kursi
export const MEJA_PASAR = [];
for (const z of [-29.4, -26.0, -22.7]) for (const x of [-43.4, -39.4, -35.4, -31.4]) MEJA_PASAR.push({ x, z, lx: 1.6, lz: 0.75 });
// [x, z, rot]; rot 0 = menghadap +z
export const KURSI_PASAR_DASAR = MEJA_PASAR.flatMap((m) =>
	[-0.45, 0.45].flatMap((dx) => [
		[m.x + dx, m.z - 0.62, 0],
		[m.x + dx, m.z + 0.62, Math.PI],
	]),
);
// kursi yang diisi pengunjung (bukan tamu)
export const KURSI_PASAR_NPC = new Set([1, 6, 8, 11, 14, 19, 22, 27, 30, 33, 38, 44]);

// pergola kayu di atas area makan
export const PERGOLA_PASAR = { x0: -45.2, x1: -29.6, z0: -31.2, z1: -21.4, tinggi: 3.1 };

// gerbang di sisi timur (menghadap kantor) & papan etalase produk asli Pasar BUMDes
export const GERBANG_PASAR = { x: -28, z0: -30.5, z1: -25.5 };
export const ETALASE_PASAR = { x: -27.0, z: -23.2 };
export const TITIK_ETALASE_PASAR = { x: -26.1, z: -23.2 };

export const dalamPasar = (x, z, tepi = 0) => x > PASAR.x0 - tepi && x < PASAR.x1 + tepi && z > PASAR.z0 - tepi && z < PASAR.z1 + tepi;

const kotak = (x, z, lx, lz) => ({ x0: x - lx / 2, x1: x + lx / 2, z0: z - lz / 2, z1: z + lz / 2 });
export const PENGHALANG_PASAR = [
	...LAPAK_PASAR.map((l) => kotak(l.x, l.z, l.lx, l.lz)),
	{ x0: PANGGUNG_PASAR.x0, x1: PANGGUNG_PASAR.x1, z0: PANGGUNG_PASAR.z0, z1: PANGGUNG_PASAR.z1 },
	...MEJA_PASAR.map((m) => kotak(m.x, m.z, m.lx, m.lz)),
	// tiang gerbang & papan etalase
	kotak(GERBANG_PASAR.x, GERBANG_PASAR.z0, 0.35, 0.35),
	kotak(GERBANG_PASAR.x, GERBANG_PASAR.z1, 0.35, 0.35),
	kotak(ETALASE_PASAR.x, ETALASE_PASAR.z, 0.3, 2.0),
];
