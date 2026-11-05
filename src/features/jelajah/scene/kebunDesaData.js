// Dunia kecamatan (terpisah dari dunia kantor DPMD): kebun berpagar di tengah,
// kampung di selatan, hamparan sawah di utara & samping, lapangan di sisi lain.
// Koordinat meter, tanah = y 0. Arah hadap: rot = atan2(dx, dz) (rot 0 = +z).
//
// Tata letak dibangkitkan dari NAMA KECAMATAN (`terapkanTata`), jadi tiap
// kecamatan selalu punya bentuk ladang, gerbang, kampung, dan bentang sawah
// sendiri. Benda di bawah ini diubah di tempat, bukan diganti, supaya semua
// pengguna membaca tata yang aktif. Panggil `terapkanTata` sebelum dunia dipasang.

export const BATAS_DUNIA = { x0: -68, x1: 68, z0: -70, z1: 68 };
export const UKURAN_PETAK = 3.4;
const JARAK_PETAK = 4.9;

export const TATA = { kecamatan: "", pola: "kotak", sisi: 1, sisiLapangan: 1, warna: 0 };
export const KEBUN = { x0: -24, x1: 24, z0: -15, z1: 17 };
export const dalamKebun = (x, z, tepi = 0) => x > KEBUN.x0 - tepi && x < KEBUN.x1 + tepi && z > KEBUN.z0 - tepi && z < KEBUN.z1 + tepi;

// petak ladang; yang aktif bergantung tingkat (12 lalu 16)
export const PETAK_KEBUN = Array.from({ length: 16 }, (_, id) => ({ id, x: 0, z: 0 }));
export const LADANG = { x0: 0, x1: 0, z0: 0, z1: 0 }; // kotak pembungkus semua petak

// --- di dalam kebun ---
export const GERBANG_KEBUN = { x: 2, z: -15, lebar: 4 };
export const PAPAN_KEBUN = { x: -6, z: -15.3 };
export const SUMUR_KEBUN = { x: 8, z: -5, r: 0.75 };
export const PENGEPUL_KEBUN = { x: 12, z: -11.4, lx: 2.6, lz: 1.1 };
export const TITIK_PENGEPUL = { x: 12, z: -12.9 };
export const SAUNG_KEBUN = { x0: 11, x1: 17, z0: 2, z1: 8 };
export const GUDANG_KEBUN = { x0: 14, x1: 19, z0: 11, z1: 16 };
export const ORANG_ORANGAN = { x: -7, z: 0 };
export const PENYIRAM = [];
export const TITIK_SIUMAN = { x: 14, z: 0.4, rot: Math.PI }; // di samping saung
export const JALUR_KEBUN = []; // setapak tanah { x, z, lx, lz }
export const HIASAN_KEBUN = { kompos: { x: 0, z: 0 }, gerobak: { x: 0, z: 0 }, pisang: [] };

// --- jalan desa ---
export const JALAN_EW = { z: -21, lebar: 4.4, x0: -68, x1: 68 };
export const JALAN_NS = { x: 2, lebar: 4, z0: -70, z1: -15 };
export const GAPURA_DESA = { x: 2, z: -27 };
export const TIBA_KEBUN = { x: 2, z: -34, rot: 0 };
export const PIKAP = { x: 30, z: -17.2 };
export const TRUK = { x: 7.5, z: -17.3 };

// --- kampung ---
export const WARUNG = { x0: 6.2, x1: 13, z0: -37, z1: -30.5 };
export const MEJA_WARUNG = { x: 5.7, z: -33.75 };
export const TITIK_WARUNG = { x: 4.4, z: -33.75 };
export const BALE_WARUNG = { x0: 5.2, x1: 6.2, z0: -30, z1: -28 };
export const RUMAH = []; // [x, z, rot]; rot 0 = pintu menghadap +z
export const MUSHOLA = { x: -26, z: -47 };
export const POS_RONDA = { x: -4.6, z: -25.4 };
export const BALAI_BUMDES = { x: -30, z: -55, rot: Math.PI / 2 }; // kavling BUMDes menghadap jalan kampung
export const KANDANG_AYAM = { x: 28, z: -44 };
export const KOLAM_IKAN = { x: -40, z: -46, r: 4.2 };
export const LAPANGAN = { x0: 34, x1: 58, z0: -8, z1: 10 };
export const KELAPA = [];
export const BAMBU = [];

// --- sawah ---
export const SAWAH = { uk: 11, z0: 27, baris: 4, kolom: 12, x0: -60.5 };
export const SALURAN = [{ x: -27, z0: -18.5, z1: 66, arah: "z" }, { z: 19.5, x0: -66, x1: 66, arah: "x" }];
export const RUTE_BAJAK = { x0: -52, x1: -16, z: 38 };
export const RUTE_TANDUR = { x0: 4, x1: 16, z: 28.2 };
export const TITIK_CANGKUL = { x: -44, z: -2, rot: 0.6 };

export const PENGHALANG_KEBUN = [];
export const PAGAR_KEBUN = []; // ruas pagar bambu yang bisa dipanjat
export const PENGHALANG_KAMERA = [];

// ---------------------------------------------------------------- pola ladang

// tiap pola menghasilkan 16 titik [u, v]; u menjauh dari sisi fasilitas, v ke utara
const J = JARAK_PETAK;
const POLA = {
	// kotak 4x4 biasa
	kotak: () => Array.from({ length: 16 }, (_, i) => [(i % 4) * J, Math.floor(i / 4) * J]),
	// dua blok dipisah jalan tengah
	duaBlok: () => Array.from({ length: 16 }, (_, i) => { const c = i % 4; return [c * J + (c >= 2 ? 2.6 : 0), Math.floor(i / 4) * J]; }),
	// sengked: tiap baris bergeser seperti terasering
	sengked: () => Array.from({ length: 16 }, (_, i) => { const r = Math.floor(i / 4); return [(i % 4) * J + r * 1.5, r * J]; }),
	// catur: baris berselang, rongga di antaranya
	catur: () => Array.from({ length: 16 }, (_, i) => { const r = Math.floor(i / 4); return [(i % 4) * 5.5 + (r % 2) * 2.75, r * J]; }),
	// bingkai: 16 petak mengelilingi halaman, sumur di tengahnya
	bingkai: () => {
		const t = [];
		for (let c = 0; c < 5; c++) t.push([c * J, 0]);
		for (let r = 1; r < 5; r++) t.push([4 * J, r * J]);
		for (let c = 3; c >= 0; c--) t.push([c * J, 4 * J]);
		for (let r = 3; r >= 1; r--) t.push([0, r * J]);
		return t;
	},
	// memanjang: dua baris panjang di utara kebun, fasilitas di selatan
	memanjang: () => Array.from({ length: 16 }, (_, i) => [(i % 8) * J, Math.floor(i / 8) * J]),
};
const NAMA_POLA = Object.keys(POLA);

// ---------------------------------------------------------------- pembantu

/** Angka acak yang selalu sama untuk teks yang sama (FNV-1a + mulberry32). */
function acakDari(teks) {
	let h = 2166136261;
	for (let i = 0; i < teks.length; i++) { h ^= teks.charCodeAt(i); h = Math.imul(h, 16777619); }
	return () => {
		h = (h + 0x6d2b79f5) | 0;
		let t = Math.imul(h ^ (h >>> 15), 1 | h);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const kotak = (x, z, lx, lz) => ({ x0: x - lx / 2, x1: x + lx / 2, z0: z - lz / 2, z1: z + lz / 2 });
const tiang = (x, z, r = 0.12) => ({ x0: x - r, x1: x + r, z0: z - r, z1: z + r });
const tindih = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
const kotakRumah = ([x, z, rot]) => (Math.abs(Math.sin(rot)) > 0.5 ? kotak(x, z, 4.8, 6) : kotak(x, z, 6, 4.8));
const isi = (daftar, baru) => { daftar.length = 0; daftar.push(...baru); };
const pusat = (b) => ({ x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 });

/** Tempat pertama dari pembangkit `calon` yang tidak menindih `terpakai`, lalu dicatat. */
function taruh(calon, terpakai, jarak, cadangan) {
	for (let i = 0; i < 400; i++) {
		const b = calon();
		if (b && terpakai.every((o) => !tindih(b, o, jarak))) { terpakai.push(b); return b; }
	}
	terpakai.push(cadangan);
	return cadangan;
}

// ---------------------------------------------------------------- pembangkit tata

/**
 * Terapkan tata kecamatan ini ke semua benda ekspor di berkas ini. `utaraTertutup`:
 * pemandangan di utara padat (tebing, pabrik, lanskap wisata), pemain dibatasi pagar.
 */
export function terapkanTata(kecamatan, utaraTertutup = false) {
	if (TATA.kecamatan === kecamatan) return TATA;
	const r = acakDari(String(kecamatan));
	const antara = (a, b) => a + r() * (b - a);
	const pilih = (a) => a[Math.floor(r() * a.length)];

	const pola = pilih(NAMA_POLA);
	const sisi = r() < 0.5 ? 1 : -1; // 1 = ladang di barat, fasilitas di timur
	const sisiLapangan = r() < 0.5 ? 1 : -1; // 1 = lapangan di timur, sawah samping di barat
	Object.assign(TATA, { kecamatan, pola, sisi, sisiLapangan, warna: Math.floor(r() * 12) });

	// pagar kebun
	Object.assign(KEBUN, { x0: -Math.round(antara(24, 27)), x1: Math.round(antara(24, 27)), z0: -15, z1: Math.round(antara(15, 19)) });

	// ladang
	const titik = POLA[pola]();
	const lebar = Math.max(...titik.map((t) => t[0]));
	const dalam = Math.max(...titik.map((t) => t[1]));
	const panjang = pola === "memanjang";
	const mulaiZ = panjang ? KEBUN.z1 - 2.6 - dalam : Math.max(-7.3, (KEBUN.z1 - 9.3) / 2 - dalam / 2);
	// memanjang ditaruh di tengah; lainnya menempel ke sisinya
	const mulaiX = sisi * (panjang ? lebar / 2 : pola === "bingkai" ? 2 : 0.35);
	titik.forEach(([u, v], i) => Object.assign(PETAK_KEBUN[i], { x: mulaiX - sisi * u, z: mulaiZ + v }));
	const h = UKURAN_PETAK / 2;
	Object.assign(LADANG, {
		x0: Math.min(...PETAK_KEBUN.map((p) => p.x)) - h, x1: Math.max(...PETAK_KEBUN.map((p) => p.x)) + h,
		z0: Math.min(...PETAK_KEBUN.map((p) => p.z)) - h, z1: Math.max(...PETAK_KEBUN.map((p) => p.z)) + h,
	});

	// gerbang, jalan kampung, gapura
	const gx = pilih([-13, -9, -5, 2, 6, 10, 14]);
	Object.assign(GERBANG_KEBUN, { x: gx, z: KEBUN.z0 });
	Object.assign(PAPAN_KEBUN, { x: gx + (gx > 0 ? -8 : 8), z: KEBUN.z0 - 0.3 });
	JALAN_NS.x = gx;
	JALAN_NS.z1 = KEBUN.z0;
	GAPURA_DESA.x = gx;
	TIBA_KEBUN.x = gx;
	const sisiPikap = gx > 0 ? -1 : 1;
	PIKAP.x = sisiPikap * 30;
	TRUK.x = gx + 5.5 * sisiPikap;

	// fasilitas di dalam pagar, di bagian yang tidak terpakai ladang
	const terpakai = [{ ...LADANG }, kotak(gx, KEBUN.z0 + 4, 5, 8)]; // jalan masuk gerbang tetap lapang
	const fx0 = KEBUN.x0 + 1.5, fx1 = KEBUN.x1 - 1.5, fz0 = KEBUN.z0 + 1.5, fz1 = KEBUN.z1 - 1.5;
	const coba = (lx, lz) => () => kotak(antara(fx0 + lx / 2, fx1 - lx / 2), antara(fz0 + lz / 2, fz1 - lz / 2), lx, lz);

	// meja pengepul di tepi selatan: pemain berdiri di antara meja dan pagar
	const zMeja = KEBUN.z0 + 3.6;
	const meja = taruh(() => kotak(antara(fx0 + 3.4, fx1 - 3.4), zMeja, 6.2, 1.8), terpakai, 0.8, kotak(gx + (gx > 0 ? -9 : 9), zMeja, 6.2, 1.8));
	const px = pusat(meja).x - 0.4;
	Object.assign(PENGEPUL_KEBUN, { x: px, z: zMeja });
	Object.assign(TITIK_PENGEPUL, { x: px, z: zMeja - 1.5 });
	terpakai.push(kotak(px, zMeja - 1.6, 3.4, 2)); // tempat berdiri

	// saung + tempat siuman di selatannya
	const saung = taruh(coba(6.4, 8.8), terpakai, 0.8, kotak(sisi * 15, 3, 6.4, 8.8));
	const sx = pusat(saung).x;
	Object.assign(SAUNG_KEBUN, { x0: sx - 3, x1: sx + 3, z0: saung.z1 - 6.2, z1: saung.z1 - 0.2 });
	Object.assign(TITIK_SIUMAN, { x: sx, z: SAUNG_KEBUN.z0 - 1.6 });

	// gudang alat; pintunya ke selatan
	const gudang = taruh(coba(5, 7), terpakai, 0.8, kotak(sisi * 8, 3, 5, 7));
	Object.assign(GUDANG_KEBUN, { x0: gudang.x0, x1: gudang.x1, z0: gudang.z1 - 5, z1: gudang.z1 });

	// sumur: di tengah halaman bila ladangnya berbingkai
	if (pola === "bingkai") {
		Object.assign(SUMUR_KEBUN, pusat(LADANG));
	} else {
		Object.assign(SUMUR_KEBUN, pusat(taruh(coba(2.6, 2.6), terpakai, 1, kotak(sx, SAUNG_KEBUN.z0 - 4, 2.6, 2.6))));
	}

	// setapak dari gerbang ke sumur
	const zJalur = KEBUN.z0 + 5.4;
	isi(JALUR_KEBUN, [
		{ x: gx, z: KEBUN.z0 + 3, lx: 2.4, lz: 6 },
		{ x: (gx + SUMUR_KEBUN.x) / 2, z: zJalur, lx: Math.abs(SUMUR_KEBUN.x - gx) + 1.8, lz: 1.8 },
		{ x: SUMUR_KEBUN.x, z: (zJalur + SUMUR_KEBUN.z) / 2, lx: 1.8, lz: Math.abs(SUMUR_KEBUN.z - zJalur) + 1 },
	]);

	// hiasan & alat beli: di celah yang kosong
	const kosong = (x, z, lx, lz) => terpakai.every((o) => !tindih(kotak(x, z, lx, lz), o, 0.3));
	const kecil = (lx, lz) => pusat(taruh(coba(lx, lz), terpakai, 0.5, kotak(KEBUN.x1 - 3, 0, lx, lz)));
	HIASAN_KEBUN.kompos = kecil(3.4, 2.6);
	HIASAN_KEBUN.gerobak = kecil(2, 2.4);
	isi(HIASAN_KEBUN.pisang, [[KEBUN.x0 + 2, KEBUN.z0 + 3], [KEBUN.x1 - 2, KEBUN.z0 + 2.5], [KEBUN.x0 + 2, KEBUN.z1 - 2], [KEBUN.x1 - 2.5, KEBUN.z1 - 2]].filter(([x, z]) => kosong(x, z, 2, 2)));
	// tiang berdiri di celah antar petak, bukan di tengah petak
	const celahPetak = (x, z) => {
		for (let d = 0; d < 8; d += 0.35) for (let a = 0; a < 6.28; a += 0.8) {
			const tx = x + Math.cos(a) * d, tz = z + Math.sin(a) * d;
			if (PETAK_KEBUN.every((p) => Math.abs(p.x - tx) > h + 0.2 || Math.abs(p.z - tz) > h + 0.2) && Math.hypot(tx - SUMUR_KEBUN.x, tz - SUMUR_KEBUN.z) > 2) return [tx, tz];
		}
		return [x, z];
	};
	const tengah = pusat(LADANG);
	const [ox, oz] = celahPetak(tengah.x, tengah.z);
	Object.assign(ORANG_ORANGAN, { x: ox, z: oz });
	const lx4 = (LADANG.x1 - LADANG.x0) / 4, lz4 = (LADANG.z1 - LADANG.z0) / 4;
	isi(PENYIRAM, [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => celahPetak(tengah.x + a * lx4, tengah.z + b * lz4)));

	// --- kampung ---
	const zWarung = pilih([-37, -41, -45, -49]);
	Object.assign(WARUNG, { x0: gx + 4.2, x1: gx + 11, z0: zWarung, z1: zWarung + 6.5 });
	const cz = zWarung + 3.25;
	Object.assign(MEJA_WARUNG, { x: gx + 3.7, z: cz });
	Object.assign(TITIK_WARUNG, { x: gx + 2.4, z: cz });
	Object.assign(BALE_WARUNG, { x0: gx + 3.2, x1: gx + 4.2, z0: zWarung + 7, z1: zWarung + 9 });
	Object.assign(POS_RONDA, { x: gx - 6.6, z: -25.4 });
	TIBA_KEBUN.z = Math.max(-36, zWarung + 3);

	const kampung = [
		kotak(0, JALAN_EW.z, 140, 6.5), // jalan timur-barat + bahu
		kotak(gx, -45, 7, 60), // jalan kampung + bahu
		{ x0: WARUNG.x0 - 2.6, x1: WARUNG.x1 + 0.5, z0: WARUNG.z0, z1: BALE_WARUNG.z1 },
		kotak(POS_RONDA.x, POS_RONDA.z, 3.2, 2.6),
		kotak(GAPURA_DESA.x, GAPURA_DESA.z, 8, 1.6),
	];
	const dalamKampung = (b) => b.x0 >= -64 && b.x1 <= 64 && b.z0 >= -67 && b.z1 <= -25.5;
	const sebar = (lx, lz, jauh0, jauh1, z0, z1) => () => {
		const s = r() < 0.5 ? -1 : 1;
		const b = kotak(gx + s * antara(jauh0, jauh1), antara(z0, z1), lx, lz);
		return dalamKampung(b) ? b : null;
	};
	Object.assign(MUSHOLA, pusat(taruh(sebar(7.8, 12, 14, 44, -60, -36), kampung, 1.2, kotak(gx - 22, -47, 7.8, 12))));
	MUSHOLA.z -= 1.6; // halaman depan ke utara
	Object.assign(KANDANG_AYAM, pusat(taruh(sebar(9, 8, 14, 50, -60, -32), kampung, 1, kotak(gx + 26, -44, 9, 8))));
	Object.assign(KOLAM_IKAN, pusat(taruh(sebar(9.6, 9.6, 18, 56, -60, -34), kampung, 1, kotak(gx - 42, -46, 9.6, 9.6))));

	const rumah = [];
	const cobaRumah = (x, z, rot) => {
		const b = kotakRumah([x, z, rot]);
		if (dalamKampung(b) && kampung.every((o) => !tindih(b, o, 1.5))) { kampung.push(b); rumah.push([x, z, rot]); }
	};
	// berjajar menghadap jalan kampung, lalu menghadap jalan desa, sisanya menyebar
	const langkahNS = pilih([10.5, 12.5, 14]);
	for (let z = -36 - r() * 3; z > -66; z -= langkahNS) {
		if (r() < 0.8) cobaRumah(gx - 8.5 - r() * 3, z, Math.PI / 2);
		if (r() < 0.8) cobaRumah(gx + 8.5 + r() * 3, z, -Math.PI / 2);
	}
	const langkahEW = pilih([13, 16, 19]);
	for (let x = -60 + r() * 6; x < 60; x += langkahEW) if (r() < 0.8) cobaRumah(x, -30 - r() * 1.5, 0);
	const tambahan = pilih([8, 24, 40]);
	for (let i = 0; i < tambahan && rumah.length < 18; i++) cobaRumah(antara(-60, 60), antara(-64, -40), pilih([0, Math.PI / 2, -Math.PI / 2]));
	isi(RUMAH, rumah);

	// lapangan di satu sisi, sawah samping di sisi lain
	const lz0 = Math.round(antara(-11, -4));
	Object.assign(LAPANGAN, sisiLapangan > 0
		? { x0: KEBUN.x1 + 9, x1: KEBUN.x1 + 33, z0: lz0, z1: lz0 + 18 }
		: { x0: KEBUN.x0 - 33, x1: KEBUN.x0 - 9, z0: lz0, z1: lz0 + 18 });
	Object.assign(TITIK_CANGKUL, { x: -sisiLapangan * 44, z: -2, rot: sisiLapangan * 0.6 });

	// sawah utara & saluran
	const uk = pilih([9.6, 11, 12.6]);
	const zSawah = KEBUN.z1 + 4.6 + uk / 2;
	Object.assign(SAWAH, { uk, z0: zSawah, kolom: Math.floor(121 / uk) + 1, baris: Math.floor((66 - zSawah) / uk) + 1 });
	SALURAN[0].x = sisiLapangan > 0 ? KEBUN.x0 - 3 : KEBUN.x1 + 3;
	SALURAN[1].z = KEBUN.z1 + 2.5;
	const barat = r() < 0.5;
	Object.assign(RUTE_BAJAK, barat ? { x0: -52, x1: -16 } : { x0: 16, x1: 52 }, { z: zSawah + uk });
	Object.assign(RUTE_TANDUR, barat ? { x0: 4, x1: 16 } : { x0: -16, x1: -4 }, { z: zSawah + 1.2 });

	// kavling BUMDes menghadap jalan kampung; RNG sendiri supaya tata yang lain tidak bergeser
	const rb = acakDari(`${kecamatan}:balai`);
	const bebas = (k, jarak) => dalamKampung(k) && kampung.every((o) => !tindih(k, o, jarak));
	let kav = null;
	for (let i = 0; i < 400 && !kav; i++) {
		const k = kotak(gx + (rb() < 0.5 ? -1 : 1) * (11 + rb() * 14), -62 + rb() * 24, 9, 9);
		if (bebas(k, 1)) kav = k;
	}
	// kampung padat: telusuri kisi (tetap deterministik) sebelum menyerah pada tempat cadangan
	for (let jarak = 1; jarak >= 0 && !kav; jarak--) {
		for (let j = 9; j <= 40 && !kav; j += 1.5) for (let z = -62; z <= -38 && !kav; z += 2) for (const s of [-1, 1]) {
			const k = kotak(gx + s * j, z, 9, 9);
			if (bebas(k, jarak)) { kav = k; break; }
		}
	}
	kampung.push(kav || kotak(gx - 16, -50, 9, 9));
	const balai = pusat(kampung[kampung.length - 1]);
	Object.assign(BALAI_BUMDES, { x: balai.x, z: balai.z, rot: balai.x < gx ? Math.PI / 2 : -Math.PI / 2 });

	// pepohonan di sela kampung & tepi kebun
	const kelapa = [];
	for (let i = 0; i < 90 && kelapa.length < 15; i++) {
		const x = antara(-64, 64), z = r() < 0.75 ? antara(-66, -24) : antara(KEBUN.z0, KEBUN.z1);
		if (dalamKebun(x, z, 2) || (x > LAPANGAN.x0 - 1 && x < LAPANGAN.x1 + 1 && z > LAPANGAN.z0 - 1 && z < LAPANGAN.z1 + 1)) continue;
		if (kampung.some((o) => tindih(kotak(x, z, 1, 1), o, 0.5))) continue;
		kelapa.push([x, z]);
	}
	isi(KELAPA, kelapa);
	const bambu = [];
	for (let i = 0; i < 60 && bambu.length < 8; i++) {
		const s = Math.floor(r() * 3);
		const x = s === 0 ? -63 : s === 1 ? 63 : antara(-60, 60);
		const z = s === 2 ? -65 : antara(-64, 16);
		if (!kampung.some((o) => tindih(kotak(x, z, 3, 3), o, 0)) && !dalamKebun(x, z, 3)) bambu.push([x, z]);
	}
	isi(BAMBU, bambu);

	BATAS_DUNIA.z1 = utaraTertutup ? KEBUN.z1 + 5.5 : 68;

	susunPenghalang();
	return TATA;
}

function susunPenghalang() {
	const S = SAUNG_KEBUN;
	const G = GERBANG_KEBUN;
	const T = 0.12;
	const pagar = [
		{ x0: KEBUN.x0, x1: G.x - G.lebar / 2, z0: KEBUN.z0 - T, z1: KEBUN.z0 + T },
		{ x0: G.x + G.lebar / 2, x1: KEBUN.x1, z0: KEBUN.z0 - T, z1: KEBUN.z0 + T },
		{ x0: KEBUN.x0, x1: KEBUN.x1, z0: KEBUN.z1 - T, z1: KEBUN.z1 + T },
		{ x0: KEBUN.x0 - T, x1: KEBUN.x0 + T, z0: KEBUN.z0, z1: KEBUN.z1 },
		{ x0: KEBUN.x1 - T, x1: KEBUN.x1 + T, z0: KEBUN.z0, z1: KEBUN.z1 },
	];
	isi(PAGAR_KEBUN, pagar.map((k) => ({ ...k, tinggi: 1 })));
	isi(PENGHALANG_KEBUN, [
		...pagar,
		kotak(SUMUR_KEBUN.x, SUMUR_KEBUN.z, SUMUR_KEBUN.r * 2, SUMUR_KEBUN.r * 2),
		kotak(PENGEPUL_KEBUN.x, PENGEPUL_KEBUN.z, PENGEPUL_KEBUN.lx, PENGEPUL_KEBUN.lz),
		{ ...GUDANG_KEBUN },
		...[S.x0, S.x1].flatMap((x) => [S.z0, S.z1].map((z) => tiang(x, z))),
		tiang(PAPAN_KEBUN.x - 1.4, PAPAN_KEBUN.z),
		tiang(PAPAN_KEBUN.x + 1.4, PAPAN_KEBUN.z),
		tiang(PENGEPUL_KEBUN.x + 1.9, PENGEPUL_KEBUN.z - 0.26),
		tiang(PENGEPUL_KEBUN.x + 3.1, PENGEPUL_KEBUN.z - 0.26),
		kotak(PIKAP.x, PIKAP.z, 4.4, 1.8),
		// kampung
		{ x0: WARUNG.x0 - 0.6, x1: WARUNG.x1, z0: WARUNG.z0, z1: WARUNG.z1 },
		{ ...BALE_WARUNG },
		...RUMAH.map(kotakRumah),
		kotak(MUSHOLA.x, MUSHOLA.z, 7.4, 7.4),
		kotak(KANDANG_AYAM.x, KANDANG_AYAM.z, 3.2, 2.4),
		kotak(BALAI_BUMDES.x, BALAI_BUMDES.z, 7, 5.6), // kavling 5.6 x 7 dalam putaran 90 derajat
		kotak(KOLAM_IKAN.x, KOLAM_IKAN.z, KOLAM_IKAN.r * 1.7, KOLAM_IKAN.r * 1.7),
		tiang(GAPURA_DESA.x - 2.6, GAPURA_DESA.z, 0.3),
		tiang(GAPURA_DESA.x + 2.6, GAPURA_DESA.z, 0.3),
		...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => tiang(POS_RONDA.x + sx * 1.1, POS_RONDA.z + sz * 0.8)),
	]);
	// bangunan beratap yang tidak boleh ditembus kamera: kotak + tinggi atap (m)
	isi(PENGHALANG_KAMERA, [
		{ x0: WARUNG.x0 - 1.4, x1: WARUNG.x1 + 0.4, z0: WARUNG.z0 - 0.4, z1: WARUNG.z1 + 0.4, h: 3.6 },
		...RUMAH.map((b) => ({ ...kotakRumah(b), h: 4.8 })),
		{ ...kotak(MUSHOLA.x, MUSHOLA.z, 7.4, 7.4), h: 5.5 },
		{ ...GUDANG_KEBUN, h: 3.4 },
		{ x0: S.x0 - 0.6, x1: S.x1 + 0.6, z0: S.z0 - 0.6, z1: S.z1 + 0.6, h: 4, y0: 2.4 },
		{ x0: G.x - 2.6, x1: G.x + 2.6, z0: KEBUN.z0 - 0.3, z1: KEBUN.z0 + 0.3, h: 3.6, y0: 2.6 },
		{ x0: GAPURA_DESA.x - 3.2, x1: GAPURA_DESA.x + 3.2, z0: GAPURA_DESA.z - 0.5, z1: GAPURA_DESA.z + 0.5, h: 5.4, y0: 2.8 },
		{ ...kotak(POS_RONDA.x, POS_RONDA.z, 2.6, 2), h: 3 },
		{ ...kotak(SUMUR_KEBUN.x, SUMUR_KEBUN.z, 2.2, 2.2), h: 2.9, y0: 1.8 },
		{ x0: PAPAN_KEBUN.x - 1.7, x1: PAPAN_KEBUN.x + 1.7, z0: PAPAN_KEBUN.z - 0.35, z1: PAPAN_KEBUN.z + 0.35, h: 2.5, y0: 1.2 },
	]);
}

/** Petak di depan pemain (atau yang dipijak), dengan batas jumlah petak aktif. */
export function petakDepan(x, z, rot, aktif = 12) {
	const fx = x + Math.sin(rot) * 1.1;
	const fz = z + Math.cos(rot) * 1.1;
	const h = UKURAN_PETAK / 2 + 0.35;
	const cari = (px, pz) => PETAK_KEBUN.slice(0, aktif).find((p) => Math.abs(px - p.x) < h && Math.abs(pz - p.z) < h);
	return cari(fx, fz) || cari(x, z) || null;
}

/** Jenis permukaan di bawah kaki (untuk suara langkah). */
export function permukaanWilayah(x, z) {
	if (Math.abs(x - JALAN_NS.x) < JALAN_NS.lebar / 2 && z < JALAN_NS.z1) return "tanah";
	if (Math.abs(z - JALAN_EW.z) < JALAN_EW.lebar / 2) return "tanah";
	if (dalamKebun(x, z) && PETAK_KEBUN.some((p) => Math.abs(x - p.x) < UKURAN_PETAK / 2 && Math.abs(z - p.z) < UKURAN_PETAK / 2)) return "tanah";
	return "rumput";
}

// Titik abang payung (saat hujan): di bahu jalan kampung, seberang warung, menghadap jalan.
// Datang menyusuri bahu jalan dari −z; dari +z terhalang bangunan di sebagian kecamatan.
// Dibaca saat dipanggil karena tata letak berubah menurut kecamatan (terapkanTata).
// Objeknya tetap sama, supaya penanda `tiba` dari PedagangHujan terbaca oleh PemainWilayah.
const ABANG_DESA = { y: 0, datang: [0, -1], tempat: "jalan dekat warung" };
export function titikAbangDesa() {
	const sisi = Math.sign(TITIK_WARUNG.x - JALAN_NS.x) || 1;
	return Object.assign(ABANG_DESA, { x: JALAN_NS.x - sisi * (JALAN_NS.lebar / 2 + 1), z: TITIK_WARUNG.z + 1.5, rot: (Math.PI / 2) * sisi });
}

// isi awal supaya modul lain selalu mendapat data yang lengkap
terapkanTata("Jasinga");
