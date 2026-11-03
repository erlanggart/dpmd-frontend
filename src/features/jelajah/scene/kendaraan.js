import { useSyncExternalStore } from "react";
import { MOBIL, MOTOR } from "./layout";
import { PERAHU } from "./situ";
import { modelDariId } from "./modelKendaraan";

// Status mobil & motor di parkiran, dan perahu dayung di dermaga Situ Pemda, yang bisa
// dikemudikan pengunjung. Objek ini
// mutable: Pemain menggerakkannya, Parkiran membacanya tiap frame untuk menggambar.
// Kendaraan menghadap +z lokal; mobil setir kanan (pintu sopir di sisi -x lokal).

const awal = () => [
	...MOBIL.map((m, i) => ({ id: `mobil:${i}`, jenis: "mobil", warna: m.warna, x: m.x, z: m.z, rot: 0, laju: 0, setir: 0, pintu: 0, roda: 0, miring: 0 })),
	...MOTOR.map((m, i) => ({ id: `motor:${i}`, jenis: "motor", warna: m.warna, x: m.x, z: m.z, rot: 0, laju: 0, setir: 0, pintu: 0, roda: 0, miring: 0.12, h: 0, vy: 0 })),
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
const JUMLAH_AWAL = KENDARAAN.length;
const JUMLAH_AWAL_PERAHU = KENDARAAN.filter((k) => k.jenis === "perahu").length;

// Perahu tambahan: dimunculkan saat tamu memanggil perahu dan semua perahu sedang dipakai
// (praktis tak terbatas; id tetap "perahu:N" supaya bisa dikirim ke tamu lain).
const MAKS_PERAHU = 60;
let versiArmada = 0;
const pendengarArmada = new Set();
const kabarArmada = () => {
	versiArmada++;
	pendengarArmada.forEach((f) => f());
};
export const useArmada = () =>
	useSyncExternalStore(
		(f) => (pendengarArmada.add(f), () => pendengarArmada.delete(f)),
		() => versiArmada,
	);
// Nomor perahu panggilan diacak di antara nomor yang belum dipakai di perangkat ini. Dulu
// nomornya = jumlah perahu; begitu perahu panggilan tamu lain ikut tercatat, nomor itu bisa
// sudah dipakai — panggilan lalu "meminjam" perahu yang sedang dinaiki tamu lain dan
// menyeretnya ke sini, sehingga di layar tamu itu perahunya hilang.
function nomorBebas() {
	const terpakai = new Set(KENDARAAN.filter((k) => k.jenis === "perahu").map((k) => k.id));
	const bebas = [];
	for (let n = JUMLAH_AWAL_PERAHU; n < 100; n++) if (!terpakai.has(`perahu:${n}`)) bebas.push(n);
	return bebas.length ? bebas[Math.floor(Math.random() * bebas.length)] : null;
}

export function tambahPerahu(x, z, rot, id = null) {
	const banyak = KENDARAAN.filter((k) => k.jenis === "perahu").length;
	if (banyak >= MAKS_PERAHU) return null;
	if (id && KENDARAAN.some((v) => v.id === id)) return KENDARAAN.find((v) => v.id === id);
	const nomor = id ? +id.split(":")[1] : nomorBebas();
	if (nomor === null) return null;
	const k = { id: id || `perahu:${nomor}`, jenis: "perahu", warna: WARNA_PERAHU[nomor % WARNA_PERAHU.length], x, z, rot, laju: 0, setir: 0, pintu: 0, roda: 0, miring: 0 };
	KENDARAAN.push(k);
	kabarArmada();
	return k;
}

export function resetKendaraan() {
	const baru = awal();
	KENDARAAN.length = JUMLAH_AWAL;
	baru.forEach((k, i) => Object.assign(KENDARAAN[i], k));
	kabarArmada();
}

// Kendaraan milik tamu (dibeli di showroom): dibuat / dipindahkan ke (x, z). Modelnya
// tersandi di nomor id (lihat modelKendaraan.js).
export function tambahMilik(id, warna, x, z, rot) {
	const info = modelDariId(id);
	if (!info) return null;
	let k = KENDARAAN.find((v) => v.id === id);
	if (!k) {
		k = { id, jenis: info.jenis, model: info.model.id, milik: true, warna, x, z, rot, laju: 0, setir: 0, pintu: 0, roda: 0, miring: info.jenis === "motor" ? 0.12 : 0, h: 0, vy: 0 };
		KENDARAAN.push(k);
	} else Object.assign(k, { x, z, rot, laju: 0, setir: 0, warna: warna || k.warna });
	kabarArmada();
	return k;
}

// pos: bila diberikan & kendaraannya perahu tambahan / kendaraan milik yang belum ada di
// perangkat ini (dipanggil tamu lain), kendaraan itu dibuat di posisi tersebut.
export const kendaraanDariId = (id, pos) => {
	const ada = KENDARAAN.find((k) => k.id === id);
	if (ada || !pos) return ada;
	if (/^perahu:\d{1,2}$/.test(id)) return tambahPerahu(pos.x, pos.z, pos.rot ?? 0, id);
	const milik = modelDariId(id);
	return milik ? tambahMilik(id, milik.model.warna[0], pos.x, pos.z, pos.rot ?? 0) : undefined;
};

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
