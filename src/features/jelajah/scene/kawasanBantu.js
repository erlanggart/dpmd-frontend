import { AIR, BATAS_KAWASAN, GEDUNG, JENIS_GEDUNG, POHON_KAWASAN } from "./kawasanData";

// Bantuan kawasan Pemda di sekitar kantor (lihat kawasanData.js): tinggi gedung dan
// tabrakan gedung, situ, dan pohon. Penghalang diindeks per sel grid supaya tiap
// langkah cukup memeriksa beberapa benda di sel tempat pemain berada.

export { BATAS_KAWASAN };

export const TINGGI_PER_LANTAI = { rumah: 3.2, kantor: 3.6 };
const ATAP = JENIS_GEDUNG.indexOf("atap");
const RUMAH = JENIS_GEDUNG.indexOf("rumah");

// Poligon datar [x0, z0, x1, z1, ...] → [[x, z], ...]
export const pasangan = (f) => {
	const p = [];
	for (let i = 0; i < f.length; i += 2) p.push([f[i], f[i + 1]]);
	return p;
};

export const tinggiGedung = (jenis, lantai) => lantai * (jenis === RUMAH ? TINGGI_PER_LANTAI.rumah : TINGGI_PER_LANTAI.kantor);

export function dalamPoligon(x, z, p) {
	let ya = false;
	for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
		const [xi, zi] = p[i];
		const [xj, zj] = p[j];
		if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ya = !ya;
	}
	return ya;
}

function dekatTepi(x, z, p, r) {
	for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
		const [ax, az] = p[j];
		const dx = p[i][0] - ax;
		const dz = p[i][1] - az;
		const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
		if ((x - ax - dx * t) ** 2 + (z - az - dz * t) ** 2 < r * r) return true;
	}
	return false;
}

// ---------- indeks penghalang ----------

const SEL = 16;
const MARGIN = 2; // ≥ jari-jari terbesar yang diperiksa (badan mobil 0,95 m)
const sel = new Map();
const kunci = (i, j) => i * 100000 + j;

function daftarkan(benda) {
	const [x0, x1, z0, z1] = benda.kotak;
	for (let i = Math.floor((x0 - MARGIN) / SEL); i <= Math.floor((x1 + MARGIN) / SEL); i++) {
		for (let j = Math.floor((z0 - MARGIN) / SEL); j <= Math.floor((z1 + MARGIN) / SEL); j++) {
			const k = kunci(i, j);
			if (!sel.has(k)) sel.set(k, []);
			sel.get(k).push(benda);
		}
	}
}

function kotakDari(p) {
	let x0 = Infinity;
	let x1 = -Infinity;
	let z0 = Infinity;
	let z1 = -Infinity;
	for (const [x, z] of p) {
		x0 = Math.min(x0, x);
		x1 = Math.max(x1, x);
		z0 = Math.min(z0, z);
		z1 = Math.max(z1, z);
	}
	return [x0, x1, z0, z1];
}

for (const [jenis, lantai, f] of GEDUNG) {
	// atap peneduh (SPBU dsb.) bisa dilewati di bawahnya
	if (jenis === ATAP) continue;
	const p = pasangan(f);
	daftarkan({ p, kotak: kotakDari(p), tinggi: tinggiGedung(jenis, lantai) + 1.5 });
}
for (const f of AIR) {
	const p = pasangan(f);
	daftarkan({ p, kotak: kotakDari(p), tinggi: 0 });
}
for (const [x, z] of POHON_KAWASAN) daftarkan({ x, z, r: 0.4, kotak: [x, x, z, z] });

const diSel = (x, z) => sel.get(kunci(Math.floor(x / SEL), Math.floor(z / SEL)));

// Lingkaran (x, z, r) menabrak gedung, situ, atau batang pohon kawasan?
export function tabrakKawasan(x, z, r) {
	const daftar = diSel(x, z);
	if (!daftar) return false;
	for (const b of daftar) {
		if (b.p) {
			const [x0, x1, z0, z1] = b.kotak;
			if (x < x0 - r || x > x1 + r || z < z0 - r || z > z1 + r) continue;
			if (dalamPoligon(x, z, b.p) || dekatTepi(x, z, b.p, r)) return true;
		} else if ((b.x - x) ** 2 + (b.z - z) ** 2 < (b.r + r) ** 2) return true;
	}
	return false;
}

// Tinggi gedung kawasan (termasuk atap) di titik (x, z), 0 bila di luar gedung.
// Dipakai kamera supaya tidak masuk ke badan gedung.
export function tinggiGedungDi(x, z) {
	const daftar = diSel(x, z);
	if (!daftar) return 0;
	for (const b of daftar) {
		if (!b.tinggi) continue;
		const [x0, x1, z0, z1] = b.kotak;
		if (x < x0 || x > x1 || z < z0 || z > z1) continue;
		if (dalamPoligon(x, z, b.p)) return b.tinggi;
	}
	return 0;
}
