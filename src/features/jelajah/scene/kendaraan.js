import { MOBIL, MOTOR } from "./layout";
import { PERAHU } from "./situ";

// Status mobil & motor di parkiran, dan perahu dayung di dermaga Situ Pemda, yang bisa
// dikemudikan pengunjung. Objek ini
// mutable: Pemain menggerakkannya, Parkiran membacanya tiap frame untuk menggambar.
// Kendaraan menghadap +z lokal; mobil setir kanan (pintu sopir di sisi -x lokal).

const awal = () => [
	...MOBIL.map((m, i) => ({ id: `mobil:${i}`, jenis: "mobil", warna: m.warna, x: m.x, z: m.z, rot: 0, laju: 0, setir: 0, pintu: 0, roda: 0, miring: 0 })),
	...MOTOR.map((m, i) => ({ id: `motor:${i}`, jenis: "motor", warna: m.warna, x: m.x, z: m.z, rot: 0, laju: 0, setir: 0, pintu: 0, roda: 0, miring: 0.12 })),
	...PERAHU.map((p, i) => ({ id: `perahu:${i}`, jenis: "perahu", warna: WARNA_PERAHU[i % WARNA_PERAHU.length], x: p.x, z: p.z, rot: p.rot, laju: 0, setir: 0, pintu: 0, roda: 0, miring: 0 })),
];
const WARNA_PERAHU = ["#2f6f9f", "#c0392b", "#2e8b57", "#d4a017"];

// Kursi tiap kendaraan (lokal; kursi 0 = pengemudi). Mobil setir kanan berempat,
// motor berboncengan, perahu: pendayung di belakang, penumpang di haluan.
export const KURSI = {
	mobil: [
		[-0.4, 0.1],
		[0.4, 0.1],
		[-0.4, -0.95],
		[0.4, -0.95],
	],
	motor: [
		[0, -0.12],
		[0, -0.62],
	],
	perahu: [
		[0, -0.55],
		[0, 0.75],
	],
};
export const kursiDunia = (k, i) => keDunia(k, ...KURSI[k.jenis][i]);
// Tempat berdiri untuk naik ke kursi i: di samping pintunya (mobil) / sisi kiri (motor).
export function titikNaikKursi(k, i) {
	const [x, z] = KURSI[k.jenis][i];
	if (k.jenis === "mobil") return keDunia(k, x < 0 ? -1.3 : 1.3, z + 0.25);
	return keDunia(k, -0.7, z);
}

export const KENDARAAN = awal();

export function resetKendaraan() {
	const baru = awal();
	baru.forEach((k, i) => Object.assign(KENDARAAN[i], k));
}

export const kendaraanDariId = (id) => KENDARAAN.find((k) => k.id === id);

// Titik lokal → dunia untuk kendaraan k.
export function keDunia(k, lx, lz) {
	const s = Math.sin(k.rot);
	const c = Math.cos(k.rot);
	return { x: k.x + lx * c + lz * s, z: k.z - lx * s + lz * c };
}

// Tempat berdiri di samping pintu sopir (mobil) / sisi kiri motor.
export const titikNaik = (k) => titikNaikKursi(k, 0);

// Badan kendaraan didekati dengan beberapa lingkaran sepanjang sumbunya.
export function lingkaran(k) {
	const offset = k.jenis === "mobil" ? [-1.35, 0, 1.35] : k.jenis === "perahu" ? [-1.15, 0, 1.15] : [-0.45, 0.45];
	const r = k.jenis === "mobil" ? 0.95 : k.jenis === "perahu" ? 0.62 : 0.3;
	return offset.map((o) => ({ ...keDunia(k, 0, o), r }));
}

// Apakah lingkaran (x, z, r) menabrak kendaraan lain (selain `kecuali`)?
export function tabrakKendaraan(x, z, r, kecuali = null) {
	for (const k of KENDARAAN) {
		if (k === kecuali) continue;
		for (const c of lingkaran(k)) if ((c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + r) ** 2) return true;
	}
	return false;
}
