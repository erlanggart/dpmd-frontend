import { MOBIL, MOTOR } from "./layout";

// Status mobil & motor di parkiran yang bisa dikemudikan pengunjung. Objek ini
// mutable: Pemain menggerakkannya, Parkiran membacanya tiap frame untuk menggambar.
// Kendaraan menghadap +z lokal; mobil setir kanan (pintu sopir di sisi -x lokal).

const awal = () => [
	...MOBIL.map((m, i) => ({ id: `mobil:${i}`, jenis: "mobil", warna: m.warna, x: m.x, z: m.z, rot: 0, laju: 0, setir: 0, pintu: 0, roda: 0, miring: 0 })),
	...MOTOR.map((m, i) => ({ id: `motor:${i}`, jenis: "motor", warna: m.warna, x: m.x, z: m.z, rot: 0, laju: 0, setir: 0, pintu: 0, roda: 0, miring: 0.12 })),
];

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
export const titikNaik = (k) => (k.jenis === "mobil" ? keDunia(k, -1.3, 0.35) : keDunia(k, -0.7, 0));

// Badan kendaraan didekati dengan beberapa lingkaran sepanjang sumbunya.
export function lingkaran(k) {
	const offset = k.jenis === "mobil" ? [-1.35, 0, 1.35] : [-0.45, 0.45];
	const r = k.jenis === "mobil" ? 0.95 : 0.3;
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
