import { AIR, BATAS_KAWASAN, GEDUNG, JALAN, JENIS_GEDUNG, KORIDOR, LEBAR_KORIDOR, POHON_KAWASAN, WILAYAH_INTI } from "./kawasanData";
import { PADAT_KHUSUS } from "./gedungKhusus";
import { DERMAGA, dermagaDi } from "./situ";

// Bantuan kawasan Pemda di sekitar kantor (lihat kawasanData.js): tinggi gedung dan
// tabrakan gedung, situ, dan pohon. Penghalang diindeks per sel grid supaya tiap
// langkah cukup memeriksa beberapa benda di sel tempat pemain berada.

export { BATAS_KAWASAN };

// Kawasan yang boleh dijelajahi = kompleks Pemda (WILAYAH_INTI) ∪ koridor ±LEBAR_KORIDOR m
// di kiri-kanan Jl. Tegar Beriman sampai McD & Cibinong City Mall. Dipetakan sekali ke sel
// 10 m supaya uji tiap langkah cukup satu baca larik.
const SEL_DUNIA = 10;
const PETA_DUNIA = (() => {
	const b = BATAS_KAWASAN;
	const nx = Math.ceil((b.x1 - b.x0) / SEL_DUNIA);
	const nz = Math.ceil((b.z1 - b.z0) / SEL_DUNIA);
	const peta = new Uint8Array(nx * nz);
	const w = WILAYAH_INTI;
	for (let i = 0; i < nx; i++) {
		for (let j = 0; j < nz; j++) {
			const x = b.x0 + (i + 0.5) * SEL_DUNIA;
			const z = b.z0 + (j + 0.5) * SEL_DUNIA;
			let ya = x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1;
			for (let r = 0; !ya && r < KORIDOR.length; r++) {
				const f = KORIDOR[r];
				for (let k = 0; k + 3 < f.length; k += 2) {
					if (jarakKeRuas(x, z, f[k], f[k + 1], f[k + 2], f[k + 3]) < LEBAR_KORIDOR) {
						ya = true;
						break;
					}
				}
			}
			peta[i * nz + j] = ya ? 1 : 0;
		}
	}
	return { peta, nx, nz };
})();
export function diKawasan(x, z) {
	const b = BATAS_KAWASAN;
	const i = Math.floor((x - b.x0) / SEL_DUNIA);
	const j = Math.floor((z - b.z0) / SEL_DUNIA);
	if (i < 0 || j < 0 || i >= PETA_DUNIA.nx || j >= PETA_DUNIA.nz) return false;
	return PETA_DUNIA.peta[i * PETA_DUNIA.nz + j] === 1;
}

// Jalan depan kantor digambar tangan (PagarDepan.jsx, x −60…60); ruas OSM Jl. KSR Dadi
// Kusmayadi baru mulai di x ≈ −110 (timur) dan x ≈ 68 (barat). Sambungan ini menutup celahnya.
const SAMBUNGAN_JALAN = [
	[0, 5.9, [-57, 35.6, -78, 36.4, -96, 38.8, -110.6, 43.1]],
	[0, 5.9, [57, 35.6, 67.9, 34.6]],
];
export const JALAN_TAMPIL = [...JALAN, ...SAMBUNGAN_JALAN];

function jarakKeRuas(px, pz, ax, az, bx, bz) {
	const dx = bx - ax;
	const dz = bz - az;
	const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
	return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}
const diJalan = (x, z) => {
	// jalan + trotoar depan kantor
	if (x > -62 && x < 62 && z > 29 && z < 42) return true;
	for (const [, lebar, f] of JALAN_TAMPIL) {
		for (let i = 0; i + 3 < f.length; i += 2) if (jarakKeRuas(x, z, f[i], f[i + 1], f[i + 2], f[i + 3]) < lebar / 2 + 1.2) return true;
	}
	return false;
};

// Pohon tidak ditanam di badan jalan, di jalan masuk & papan dermaga, maupun di deretan
// toko & warung seberang kantor.
export const POHON_TAMPIL = POHON_KAWASAN.filter(([x, z]) => DERMAGA.every((d) => Math.hypot(x - d.x, z - d.z) > 6.5) && !(x > -36 && x < 35 && z > 40 && z < 60) && !diJalan(x, z));

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
	daftarkan({ p, kotak: kotakDari(p), tinggi: 0, air: true });
}
for (const [x, z] of POHON_TAMPIL) daftarkan({ x, z, r: 0.4, kotak: [x, x, z, z] });
// gedung buatan tangan (McD, Cibinong City Mall) & perabot di dalamnya
for (const k of PADAT_KHUSUS) {
	daftarkan({
		p: [
			[k.x0, k.z0],
			[k.x1, k.z0],
			[k.x1, k.z1],
			[k.x0, k.z1],
		],
		kotak: [k.x0, k.x1, k.z0, k.z1],
		tinggi: k.tinggi || 0,
		tembus: !!k.tembus,
	});
}

const diSel = (x, z) => sel.get(kunci(Math.floor(x / SEL), Math.floor(z / SEL)));

// Lingkaran (x, z, r) menabrak gedung, situ, atau batang pohon kawasan?
// bolehAir: air (situ) tidak menghalangi — untuk tamu yang berenang.
export function tabrakKawasan(x, z, r, bolehAir = false) {
	const daftar = diSel(x, z);
	if (!daftar) return false;
	for (const b of daftar) {
		if (b.tembus) continue;
		if (b.p) {
			// di atas papan dermaga air tidak menghalangi (tepi dermaga tetap)
			if (b.air && (bolehAir || dermagaDi(x, z, r))) continue;
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
