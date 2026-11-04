// Showroom mobil & motor di timur kantor (lahan kosong di timur gedung tetangga), menghadap
// selatan ke jalan. Pajangan tiap model di atas panggung bundar, meja sales di dekat pintu,
// dan halaman serah terima di depannya. Tanpa impor berat: layout.js memakainya untuk tabrakan.

export const SHOWROOM_MOBIL = { x0: 52, x1: 66, z0: -22, z1: 8, tinggi: 5.2 };
export const SHOWROOM_MOTOR = { x0: 73, x1: 82, z0: -14, z1: 8, tinggi: 4.4 };
// halaman paving di depan keduanya (serah terima kendaraan baru)
export const HALAMAN_SHOWROOM = { x0: 50, x1: 84, z0: 8, z1: 24 };

// celah pintu kaca di dinding depan
const pintu = (s, lebar) => ({ x0: (s.x0 + s.x1) / 2 - lebar / 2, x1: (s.x0 + s.x1) / 2 + lebar / 2 });
export const PINTU_MOBIL = pintu(SHOWROOM_MOBIL, 4.2);
export const PINTU_MOTOR = pintu(SHOWROOM_MOTOR, 3.0);

// pajangan: tujuh mobil di dua lajur (menghadap +z), tujuh motor di dua lajur
export const PAJANGAN_MOBIL = [
	[55.6, -18.5], [62.4, -15.0], [55.6, -11.0], [62.4, -7.5], [55.6, -3.5], [62.4, 0.0], [55.6, 3.6],
].map(([x, z], i) => ({ x, z, i }));
export const PAJANGAN_MOTOR = [
	[75.6, -11.5], [79.6, -9.5], [75.6, -7.0], [79.6, -5.0], [75.6, -2.5], [79.6, -0.5], [75.6, 2.0],
].map(([x, z], i) => ({ x, z, i }));
export const R_PANGGUNG = { mobil: 2.7, motor: 1.15 };

// meja sales & titik bicara (tekan E)
export const MEJA_SALES_MOBIL = { x: 62.4, z: 5.4, lx: 2.2, lz: 0.8 };
export const MEJA_SALES_MOTOR = { x: 79.6, z: 4.6, lx: 1.6, lz: 0.7 };
export const TITIK_SALES_MOBIL = { x: 62.4, z: 6.5 };
export const TITIK_SALES_MOTOR = { x: 79.6, z: 5.6 };
// tempat kendaraan baru diserahkan
export const SERAH_MOBIL = { x: 59, z: 14, rot: Math.PI / 2 };
export const SERAH_MOTOR = { x: 77.5, z: 13, rot: Math.PI / 2 };

export const dalamShowroom = (x, z) => [SHOWROOM_MOBIL, SHOWROOM_MOTOR].some((s) => x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1);
export const lahanShowroom = (x, z, tepi = 0) =>
	[SHOWROOM_MOBIL, SHOWROOM_MOTOR, HALAMAN_SHOWROOM].some((s) => x > s.x0 - tepi && x < s.x1 + tepi && z > s.z0 - tepi && z < s.z1 + tepi);

const T = 0.12; // tebal dinding untuk tabrakan
function dinding(s, p) {
	return [
		{ x0: s.x0, x1: s.x1, z0: s.z0 - T, z1: s.z0 + T }, // belakang
		{ x0: s.x0 - T, x1: s.x0 + T, z0: s.z0, z1: s.z1 }, // barat
		{ x0: s.x1 - T, x1: s.x1 + T, z0: s.z0, z1: s.z1 }, // timur
		{ x0: s.x0, x1: p.x0, z0: s.z1 - T, z1: s.z1 + T }, // depan kiri pintu
		{ x0: p.x1, x1: s.x1, z0: s.z1 - T, z1: s.z1 + T }, // depan kanan pintu
	];
}
const bulat = (x, z, r) => ({ x0: x - r, x1: x + r, z0: z - r, z1: z + r });
const kotak = (m) => ({ x0: m.x - m.lx / 2, x1: m.x + m.lx / 2, z0: m.z - m.lz / 2, z1: m.z + m.lz / 2 });
export const PENGHALANG_SHOWROOM = [
	...dinding(SHOWROOM_MOBIL, PINTU_MOBIL),
	...dinding(SHOWROOM_MOTOR, PINTU_MOTOR),
	...PAJANGAN_MOBIL.map((p) => bulat(p.x, p.z, R_PANGGUNG.mobil * 0.85)),
	...PAJANGAN_MOTOR.map((p) => bulat(p.x, p.z, R_PANGGUNG.motor * 0.85)),
	kotak(MEJA_SALES_MOBIL),
	kotak(MEJA_SALES_MOTOR),
];
