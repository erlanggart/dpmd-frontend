import { LOBI, RUANGAN, TINGGI_LANTAI } from "../kantorConfig";

// Geometri turunan dari kantorConfig: dinding per lantai, pintu, tangga, perabot,
// penghuni kantor, penghalang tabrakan, dan pencarian jalur. Semua dalam meter.

export const TINGGI_DINDING = 2.4;
const TEBAL = 0.3;
const H = TINGGI_LANTAI;

// ---------- dinding ----------

// Satu garis dinding lurus, dipotong di setiap celah pintu [tengah, lebar].
// sumbu "x" = dinding membentang searah sumbu x pada z = tetap.
function garis(lantai, sumbu, tetap, dari, sampai, celah = []) {
	const potongan = [];
	let a = dari;
	for (const [c, w] of [...celah].sort((p, q) => p[0] - q[0])) {
		if (c - w / 2 > a) potongan.push([a, c - w / 2]);
		a = c + w / 2;
	}
	if (sampai > a) potongan.push([a, sampai]);
	return potongan.map(([p, q]) =>
		sumbu === "x"
			? { lantai, x: (p + q) / 2, z: tetap, lx: q - p, lz: TEBAL }
			: { lantai, x: tetap, z: (p + q) / 2, lx: TEBAL, lz: q - p },
	);
}

const luar = (l, pintuDepan) => [
	...garis(l, "z", -15, -13, 12),
	...garis(l, "z", 15, -13, 12),
	...garis(l, "x", -13, -15, 15),
	...garis(l, "x", 12, -15, 15, pintuDepan ? [[0, 4]] : []),
];

export const DINDING = [
	// ----- lantai 1 -----
	...luar(0, true),
	// deretan depan: KKD – lobi – SPKED. Lobi ruang terbesar (16 × 6 m) dan lebih
	// dalam dari KKD/SPKED; pintu kaca kiri/kanan di dinding belakangnya.
	...garis(0, "z", -8, 6, 12),
	...garis(0, "z", 8, 6, 12),
	...garis(0, "x", 6, -8, 8, [
		[-5, 2],
		[5, 2],
	]),
	...garis(0, "x", 7.3, -15, -8, [[-11.5, 1.6]]),
	...garis(0, "x", 7.3, 8, 15, [[11.5, 1.6]]),
	// toilet di ujung kanan lorong
	...garis(0, "z", 13.2, 1, 4.8, [[2.9, 1.1]]),
	...garis(0, "x", 4.8, 13.2, 15),
	// tembok tengah berpintu (sisi kirinya terbuka: tangga & jalan ke Pangrango)
	...garis(0, "x", 1, -3.9, 15, [[0.5, 2.4]]),
	// Ruang Rapat Pangrango (pintu menghadap depan)
	...garis(0, "x", 0, -15, -8.3, [[-13, 1.6]]),
	...garis(0, "z", -8.3, -6.6, 0),
	...garis(0, "x", -6.6, -15, -8.3),
	// Ruang Arsip (pintu di sisi kanan). Lebih ramping supaya jalan di sampingnya
	// (menuju mushola & kolam) lega.
	...garis(0, "z", -8, -6.4, -1.5),
	...garis(0, "z", -2.8, -6.4, -1.5, [[-4, 1.4]]),
	...garis(0, "x", -1.5, -8, -2.8),
	...garis(0, "x", -6.4, -8, -2.8),
	// Mushola (pintu menghadap depan) di sebelah kolam ikan koki; lorong ±3 m di
	// depannya, antara mushola dan Ruang Rapat Pangrango/Arsip.
	...garis(0, "z", -11.4, -13, -9.6),
	...garis(0, "z", -4.6, -13, -9.6),
	...garis(0, "x", -9.6, -11.4, -4.6, [[-8.3, 1.6]]),
	// Ruang Rapat Salak (pintu di sisi kiri) membentang sampai dinding kanan gedung
	...garis(0, "z", 2.8, -13, 1, [[-7, 1.6]]),

	// ----- lantai 2 -----
	...luar(1, false),
	...garis(1, "z", -8, 7.3, 12),
	// Prolap & Keuangan berimpit, hanya dipisah satu tembok
	...garis(1, "z", 4, 7.3, 12),
	...garis(1, "z", 12.8, 4.5, 12, [[5.75, 1.2]]),
	...garis(1, "x", 7.3, -15, -8, [[-11.5, 1.6]]),
	...garis(1, "x", 7.3, -8, 12.8, [
		[0, 1.6],
		[8.4, 1.6],
	]),
	// PMD berbentuk ㄱ: bagian atasnya membentang di belakang tangga depan sampai
	// dinding Ruang Rapat Halimun; kakinya di samping tangga depan (pintu depan).
	// Di belakangnya ada jalan ke dapur (pintu belakang PMD ke jalan itu).
	...garis(1, "x", -4, -7, 3.1, [[-3.7, 1.4]]),
	...garis(1, "x", -1, -7, -3.9),
	...garis(1, "z", -3.9, -1, 5),
	...garis(1, "z", 3.1, -4, 5),
	// dinding depan Sekretariat (pintu ke lorong antara PMD & Pemdes)
	...garis(1, "x", -6, -1.4, 6, [[4.6, 1.4]]),
	...garis(1, "x", 5, -3.9, 3.1, [[-0.9, 1.4]]),
	// Ruang Rapat Halimun (pintu menghadap Ruang Kepala Dinas) & Gudang Arsip di
	// depan dapur (pintunya di samping, dekat pintu dapur)
	// Halimun melebar sampai menempel tangga depan; Gudang Arsip di depan dapur
	...garis(1, "z", -7, -5.6, 4.5),
	...garis(1, "x", 4.5, -15, -7, [[-11.5, 1.6]]),
	...garis(1, "x", -5.6, -15, -7),
	...garis(1, "z", -9.5, -9.6, -5.6, [[-8.75, 1.2]]),
	// Dapur di pojok belakang, menempel Halimun; tangga belakang tepat di sampingnya
	...garis(1, "z", -4.6, -13, -9.6),
	...garis(1, "x", -9.6, -15, -4.6, [[-7.2, 1.2]]),
	// Sekretariat (dipendekkan; pintu di depan) & Pemdes (melebar sampai dinding
	// Sekretariat — satu dinding bersama — dan memanjang ke depan; pintu di depan)
	...garis(1, "z", -1.4, -13, -6),
	...garis(1, "z", 6, -13, 4.5),
	...garis(1, "x", 4.5, 6, 15, [[9, 1.4]]),
];

// Daun pintu. Pintu kaca bergeser, pintu kayu berayun; keduanya terbuka sendiri
// saat ada orang mendekat dan tidak ikut tabrakan.
export const DAUN_PINTU = [
	{ lantai: 0, x: -5, z: 6, lebar: 2, jenis: "kaca" },
	{ lantai: 0, x: 5, z: 6, lebar: 2, jenis: "kaca" },
	{ lantai: 0, x: -11.5, z: 7.3, lebar: 1.6, jenis: "kayu" },
	{ lantai: 0, x: 11.5, z: 7.3, lebar: 1.6, jenis: "kayu" },
	{ lantai: 0, x: 13.2, z: 2.9, lebar: 1.1, jenis: "kayu", sumbu: "x" },
	{ lantai: 0, x: 0.5, z: 1, lebar: 2.4, jenis: "kayu" },
	{ lantai: 0, x: -13, z: 0, lebar: 1.6, jenis: "kayu" },
	{ lantai: 0, x: -2.8, z: -4, lebar: 1.4, jenis: "kayu", sumbu: "x" },
	{ lantai: 0, x: -8.3, z: -9.6, lebar: 1.6, jenis: "kayu" },
	{ lantai: 0, x: 2.8, z: -7, lebar: 1.6, jenis: "kayu", sumbu: "x" },
	{ lantai: 1, x: -11.5, z: 7.3, lebar: 1.6, jenis: "kayu" },
	{ lantai: 1, x: 0, z: 7.3, lebar: 1.6, jenis: "kayu" },
	{ lantai: 1, x: 8.4, z: 7.3, lebar: 1.6, jenis: "kayu" },
	{ lantai: 1, x: 12.8, z: 5.75, lebar: 1.2, jenis: "kayu", sumbu: "x" },
	{ lantai: 1, x: -0.9, z: 5, lebar: 1.4, jenis: "kayu" },
	{ lantai: 1, x: -3.7, z: -4, lebar: 1.4, jenis: "kayu" },
	{ lantai: 1, x: -9.5, z: -8.75, lebar: 1.2, jenis: "kayu", sumbu: "x" },
	{ lantai: 1, x: -11.5, z: 4.5, lebar: 1.6, jenis: "kayu" },
	{ lantai: 1, x: -7.2, z: -9.6, lebar: 1.2, jenis: "kayu" },
	{ lantai: 1, x: 4.6, z: -6, lebar: 1.4, jenis: "kayu" },
	{ lantai: 1, x: 9, z: 4.5, lebar: 1.4, jenis: "kayu" },
];

// ---------- tangga ----------
// Dua tangga putar balik (bentuk U), memanjang depan–belakang. Lajur kiri naik dari
// lantai 1 menuju bordes di ujung belakang; dari bordes, lajur kanan naik kembali
// ke depan dan tiba di lantai 2. Di lantai 2 seluruh tapak tangga menjadi lubang
// berpagar, kecuali mulut lajur kanan tempat pengunjung tiba.
export const TANGGA = [
	{ id: "depan", lajurNaik: [-6.8, -5.6], lajurTiba: [-5.4, -4.2], zDepan: 3.8, zPutar: 0.8, zBelakang: -0.5 },
	// tangga belakang: di lantai 1 tepat di kanan mushola, di lantai 2 di samping dapur
	{ id: "belakang", lajurNaik: [-4.3, -3.1], lajurTiba: [-2.9, -1.7], zDepan: -8.4, zPutar: -11.4, zBelakang: -12.7 },
];

export const rectTangga = (t) => ({ x0: t.lajurNaik[0], x1: t.lajurTiba[1], z0: t.zBelakang, z1: t.zDepan });

export function tanggaDi(x, z) {
	for (const t of TANGGA) {
		const r = rectTangga(t);
		if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return t;
	}
	return null;
}

// Tinggi pijakan di (x, z) pada tangga t; null di sela pagar antar-lajur.
export function tinggiTangga(t, x, z) {
	const panjang = t.zDepan - t.zPutar;
	if (z <= t.zPutar) return H / 2;
	if (x >= t.lajurNaik[0] && x <= t.lajurNaik[1]) return ((H / 2) * (t.zDepan - z)) / panjang;
	if (x >= t.lajurTiba[0] && x <= t.lajurTiba[1]) return H / 2 + ((H / 2) * (z - t.zPutar)) / panjang;
	return null;
}

const tengah = ([a, b]) => (a + b) / 2;

// Titik naik (lantai 1), titik tiba (lantai 2), dan lintasan di bordes untuk rute.
export function ujungTangga(t) {
	const zb = (t.zPutar + t.zBelakang) / 2;
	return {
		bawah: { x: tengah(t.lajurNaik), z: t.zDepan + 0.6, lantai: 0 },
		atas: { x: tengah(t.lajurTiba), z: t.zDepan + 0.7, lantai: 1 },
		lintasan: [
			{ x: tengah(t.lajurNaik), z: zb },
			{ x: tengah(t.lajurTiba), z: zb },
		],
	};
}

// ---------- pembantu penempatan ----------

let biji = 1234;
const acak = () => ((biji = (biji * 16807) % 2147483647) - 1) / 2147483646;
const pilih = (daftar) => daftar[Math.floor(acak() * daftar.length)];

const KULIT = ["#e2b48c", "#d3a378", "#c08d63", "#b07a50", "#d9ad85"];
const RAMBUT = ["#15100c", "#21180f", "#2e2116", "#3a2a1c"];
const JILBAB = ["#d9c7a4", "#7b5a3a", "#5a4637", "#a8875c", "#2f4a3a", "#7d2f3d", "#3b4a6b", "#c9a77a"];
const BAJU_WARGA = ["#7a3b1f", "#2a4b6e", "#5c2d4a", "#3f6b3a", "#8a5a2b", "#1f5f6b"];

// Penampilan pegawai berseragam PDH khaki; sebagian perempuan berkerudung.
export function penampilanPNS(ekstra = {}) {
	const perempuan = acak() < 0.5;
	return {
		seragam: "pdh",
		perempuan,
		kulit: pilih(KULIT),
		rambut: pilih(RAMBUT),
		jilbab: perempuan && acak() < 0.85 ? pilih(JILBAB) : null,
		kacamata: acak() < 0.22,
		rok: perempuan && acak() < 0.5,
		...ekstra,
	};
}

export function penampilanWarga(ekstra = {}) {
	const perempuan = acak() < 0.45;
	return {
		seragam: "warga",
		perempuan,
		kulit: pilih(KULIT),
		rambut: pilih(RAMBUT),
		jilbab: perempuan && acak() < 0.8 ? pilih(JILBAB) : null,
		baju: pilih(BAJU_WARGA),
		celana: pilih(["#26292e", "#3a3530", "#1f2a3a"]),
		kacamata: acak() < 0.15,
		...ekstra,
	};
}

// Arah depan (sin, cos) untuk rotasi y.
const maju = (rot, d) => [Math.sin(rot) * d, Math.cos(rot) * d];

// ---------- perabot & penghuni ----------

export const PERABOT = []; // { jenis, x, z, rot, lantai }
// Slot tempat orang berada. `jenis` menentukan siapa yang cocok mengisinya (meja,
// rapat, kepalaRapat, ajudan, dapur, tamu, berdiri, jaga, bersih); `terisi` dan
// `penampilan` adalah isian bawaan bila data pegawai tidak tersedia.
export const PEGAWAI = []; // { x, z, rot, lantai, area, pose, aktivitas, jenis, terisi, penampilan }
const PADAT = []; // penghalang perabot: { lantai, x0, x1, z0, z1 }

const kotakPadat = (lantai, x, z, lx, lz) => PADAT.push({ lantai, x0: x - lx / 2, x1: x + lx / 2, z0: z - lz / 2, z1: z + lz / 2 });

// Satu kursi kerja lengkap: kursi, meja di depannya, monitor + keyboard, dan
// (bila terisi) pegawai yang sedang bekerja.
function kursiKerja(lantai, area, x, z, rot, terisi, aktivitas = "mengetik") {
	PERABOT.push({ jenis: "kursi", x, z, rot, lantai });
	const [mx, mz] = maju(rot, 0.65);
	PERABOT.push({ jenis: "meja", x: x + mx, z: z + mz, rot, lantai });
	const [nx, nz] = maju(rot, 0.88);
	PERABOT.push({ jenis: "monitor", x: x + nx, z: z + nz, rot, lantai });
	PEGAWAI.push({ x, z, rot, lantai, area, pose: "duduk", aktivitas, jenis: "meja", terisi, penampilan: penampilanPNS() });
}

// Klaster dua meja saling berhadapan dengan sekat di tengah (searah sumbu z).
function klaster(lantai, area, cx, cz, isi = 0.8) {
	kursiKerja(lantai, area, cx, cz + 1.05, Math.PI, acak() < isi);
	kursiKerja(lantai, area, cx, cz - 1.05, 0, acak() < isi);
	PERABOT.push({ jenis: "sekat", x: cx, z: cz, rot: 0, lantai });
	kotakPadat(lantai, cx, cz, 1.6, 2.7);
}

// Meja layanan petugas + dua kursi tamu.
function mejaLayanan(area) {
	const { x, z, arah } = area.npc;
	const rot = Math.atan2(arah[0], arah[1]);
	const [dx, dz] = arah;
	const l = area.lantai;
	PERABOT.push({ jenis: "mejaLayanan", x: x + dx * 1.2, z: z + dz * 1.2, rot, lantai: l });
	PERABOT.push({ jenis: "monitor", x: x + dx * 0.98, z: z + dz * 0.98, rot, lantai: l });
	for (const s of [-0.6, 0.6]) {
		PERABOT.push({ jenis: "kursi", x: x + dx * 2.1 - dz * s, z: z + dz * 2.1 + dx * s, rot: rot + Math.PI, lantai: l });
	}
	kotakPadat(l, x + dx * 1.2, z + dz * 1.2, Math.abs(dx) ? 0.8 : 2.2, Math.abs(dx) ? 2.2 : 0.8);
}

// Meja rapat panjang (searah z) dengan kursi eksekutif di kedua sisi dan peserta.
export const MEJA_RAPAT = [];
function ruangRapat(lantai, area, cx, z0, z1, kepala) {
	MEJA_RAPAT.push({ lantai, x: cx, z: (z0 + z1) / 2, panjang: z1 - z0 });
	kotakPadat(lantai, cx, (z0 + z1) / 2, 1.9, z1 - z0 + 0.2);
	for (let z = z0 + 0.7; z < z1 - 0.3; z += 1.3) {
		for (const s of [-1, 1]) {
			const x = cx + s * 1.35;
			const rot = s < 0 ? Math.PI / 2 : -Math.PI / 2;
			PERABOT.push({ jenis: "kursiEksekutif", x, z, rot, lantai });
			PEGAWAI.push({ x, z, rot, lantai, area, pose: "duduk", aktivitas: "rapat", jenis: "rapat", terisi: acak() < 0.8, penampilan: penampilanPNS() });
		}
	}
	if (kepala) {
		const z = z1 + 0.75;
		PERABOT.push({ jenis: "kursiEksekutif", x: cx, z, rot: Math.PI, lantai });
		PEGAWAI.push({ x: cx, z, rot: Math.PI, lantai, area, pose: "duduk", aktivitas: "rapat", jenis: "kepalaRapat", terisi: true, penampilan: penampilanPNS({ kacamata: true }) });
	}
}

const perabot = (jenis, lantai, x, z, rot = 0, padat = null) => {
	PERABOT.push({ jenis, x, z, rot, lantai });
	if (padat) kotakPadat(lantai, x, z, ...padat);
};

for (const r of RUANGAN) mejaLayanan(r);

// --- lantai 1 ---
klaster(0, "kkd", -13.9, 9.6);
klaster(0, "kkd", -9.1, 9.6);
klaster(0, "spked", 9.1, 9.6);
klaster(0, "spked", 13.9, 9.6);

ruangRapat(0, "pangrango", -10.5, -5.5, -2.3, true);
ruangRapat(0, "salak", 6.3, -11.0, -2.2, true);
ruangRapat(0, "salak", 11.5, -11.0, -2.2, false);

// Ruang Arsip: rak arsip berjajar dan satu meja petugas arsip dekat pintu.
for (const z of [-5.8, -4.8, -3.8, -2.8]) perabot("lemari", 0, -7.55, z, Math.PI / 2, [0.5, 0.95]);
for (const z of [-5.5, -4.5]) {
	perabot("lemari", 0, -5.6, z, Math.PI / 2, [0.5, 0.95]);
	perabot("lemari", 0, -5.1, z, -Math.PI / 2, [0.5, 0.95]);
}
kursiKerja(0, "arsip", -4.2, -2.3, Math.PI / 2, true);
kotakPadat(0, -3.55, -2.3, 0.8, 1.6);

// Kolam ikan koki di pojok kiri belakang (tidak bisa dimasuki).
export const KOLAM = { x0: -15, x1: -11.4, z0: -13, z1: -9.6 };
kotakPadat(0, -13.2, -11.3, 3.6, 3.4);

// Mushola: sajadah berjajar dan rak sandal di dekat pintu.
export const SAJADAH = [];
for (let x = -10.8; x <= -5.3; x += 0.9) for (const z of [-12.2, -11.0]) SAJADAH.push({ x, z });
perabot("rak", 0, -5.3, -10.2, Math.PI, [1.0, 0.4]);

// --- lantai 2 ---
// deret meja Prolap agak ke belakang supaya lorong di depannya lega
klaster(1, "prolap", -6.3, 10.1);
klaster(1, "prolap", -2.7, 10.1);
klaster(1, "prolap", 2.7, 10.1);
klaster(1, "keuangan", 5.9, 9.6);
klaster(1, "keuangan", 11.0, 9.6);
// PMD: deret meja di bagian belakang, satu klaster & meja layanan di kaki depan.
for (const x of [-6.0, -1.8, 1.6]) klaster(1, "pmd", x, -2.5);
klaster(1, "pmd", -2.85, 2.7);
// Sekretariat: klaster mengapit meja layanan.
for (const x of [-0.45, 5.05]) klaster(1, "sekretariat", x, -9.4);
// Pemdes: dua deret meja.
for (const x of [8.0, 10.5, 13.0]) for (const z of [-9.0, -4.5]) klaster(1, "pemdes", x, z);
// Gudang Arsip lantai 2: lemari arsip berjajar.
for (const x of [-14.2, -13.2, -12.2, -11.2]) perabot("lemari", 1, x, -9.2, 0, [0.95, 0.5]);
for (const z of [-7.6, -6.6]) perabot("lemari", 1, -14.6, z, Math.PI / 2, [0.5, 0.95]);
perabot("lemari", 1, 14.6, 2.6, -Math.PI / 2, [0.5, 0.95]);
ruangRapat(1, "halimun", -11.0, -4.0, 1.4, true);

// Ruang Kepala Dinas: meja pimpinan, kursi, sofa tamu, lemari, ajudan.
perabot("mejaPimpinan", 1, -11.5, 10.6, Math.PI, [2.4, 1.0]);
perabot("kursiEksekutif", 1, -11.5, 11.45, Math.PI);
perabot("sofa", 1, -14.4, 9.3, Math.PI / 2, [0.85, 2.0]);
perabot("mejaKopi", 1, -13.2, 9.3, Math.PI / 2, [0.55, 0.9]);
perabot("lemari", 1, -8.6, 11.4, -Math.PI / 2, [0.5, 0.95]);
PEGAWAI.push({
	x: -9.6,
	z: 9.6,
	rot: -Math.PI / 2,
	lantai: 1,
	area: "kadis",
	pose: "diam",
	aktivitas: "berdiri",
	jenis: "ajudan",
	terisi: true,
	penampilan: penampilanPNS({ perempuan: false, jilbab: null, rok: false }),
});

// Dapur: meja dapur, kulkas, pegawai menyeduh minuman.
perabot("mejaDapur", 1, -7.05, -12.55, 0, [3.3, 0.6]);
perabot("kulkas", 1, -5.15, -11.0, -Math.PI / 2, [0.7, 0.7]);
// dapur membentang sepanjang dinding belakang sampai ujung kiri: meja dapur kedua & pantry
perabot("mejaDapur", 1, -12.2, -12.55, 0, [3.3, 0.6]);
perabot("lemari", 1, -14.6, -11.2, Math.PI / 2, [0.5, 0.95]);
perabot("dispenser", 1, -10.0, -12.6, 0, [0.45, 0.45]);
PEGAWAI.push({ x: -7.6, z: -11.7, rot: Math.PI, lantai: 1, area: "dapur", pose: "diam", aktivitas: "berdiri", jenis: "dapur", terisi: true, penampilan: penampilanPNS() });

// --- lobi ---
perabot("mejaResepsionis", 0, 0, 7.8, Math.PI, [4.8, 0.9]);
perabot("kursi", 0, 0, 6.6, 0);
perabot("sofa", 0, -7.55, 9.6, Math.PI / 2, [0.85, 2.0]);
perabot("sofa", 0, 7.55, 9.6, -Math.PI / 2, [0.85, 2.0]);
perabot("mejaKopi", 0, -6.5, 9.6, Math.PI / 2, [0.55, 0.9]);
perabot("mejaKopi", 0, 6.5, 9.6, Math.PI / 2, [0.55, 0.9]);
perabot("dispenser", 0, 7.6, 11.5, -Math.PI / 2, [0.45, 0.45]);
perabot("kios", 0, -7.6, 11.5, Math.PI / 2, [0.5, 0.6]);
perabot("tanaman", 0, -7.5, 6.55, 0, [0.6, 0.6]);
perabot("tanaman", 0, 7.5, 6.55, 0, [0.6, 0.6]);

// --- lorong lantai 1: bangku tunggu & pojok kopi tamu menempel tembok tengah ---
perabot("sofa", 0, 4.2, 1.6, 0, [2.0, 0.85]);
perabot("mejaKopiTamu", 0, 9.5, 1.45, 0, [1.0, 0.55]);

// Toilet: wastafel (lantai 1 & 2) dan bilik (lantai 2, ruangnya lebih panjang).
perabot("wastafel", 0, 14.6, 4.1, -Math.PI / 2, [0.5, 0.8]);
perabot("wastafel", 1, 14.6, 10.8, -Math.PI / 2, [0.5, 0.8]);
perabot("bilik", 1, 14.0, 8.0, 0, [1.9, 1.4]);

// Tanaman di lorong & ruang.
for (const [l, x, z] of [
	[0, -14.4, 1.6],
	[0, 12.6, 1.6],
	[0, -8.6, 6.75],
	[0, 8.6, 6.75],
	[1, -14.5, 11.5],
	[1, -5.1, -9.1],
]) {
	perabot("tanaman", l, x, z, 0, [0.6, 0.6]);
}

// Pengunjung (warga) di lobi: dua menunggu di sofa, satu di depan resepsionis.
PEGAWAI.push({ x: -7.45, z: 9.2, rot: Math.PI / 2, lantai: 0, area: "lobi", pose: "duduk", aktivitas: "menunggu", jenis: "tamu", terisi: true, penampilan: penampilanWarga() });
PEGAWAI.push({ x: 7.45, z: 10.0, rot: -Math.PI / 2, lantai: 0, area: "lobi", pose: "duduk", aktivitas: "menunggu", jenis: "tamu", terisi: true, penampilan: penampilanWarga() });
PEGAWAI.push({ x: 1.9, z: 9.6, rot: Math.PI, lantai: 0, area: "lobi", pose: "diam", aktivitas: "berdiri", jenis: "tamu", terisi: true, penampilan: penampilanWarga() });
// Dua pegawai berdiskusi membawa dokumen di area terbuka lantai 2, dekat tangga.
PEGAWAI.push({ x: 4.6, z: -3.4, rot: 0, lantai: 1, area: "aula2", pose: "diam", aktivitas: "diskusi", jenis: "berdiri", terisi: true, penampilan: penampilanPNS({ map: true }) });
PEGAWAI.push({ x: 4.6, z: -2.6, rot: Math.PI, lantai: 1, area: "aula2", pose: "diam", aktivitas: "diskusi", jenis: "berdiri", terisi: true, penampilan: penampilanPNS({ map: true }) });

// Satpam berjaga di depan pintu, di lobi, di gerbang, di parkiran, dan di lantai 2.
for (const [l, x, z, rot, area] of [
	[0, -3.5, 14.5, 0, "luar"],
	[0, 3.5, 14.5, 0, "luar"],
	[0, -2.9, 11.3, Math.PI, "lobi"],
	[0, 3.0, 28.5, -Math.PI / 2, "luar"],
	[0, 14.6, 21.5, -Math.PI / 2, "luar"],
	[1, -6.0, 6.4, Math.PI, "aula2"],
	[0, -13.5, 5.6, Math.PI / 2, "lorong1"],
]) {
	PEGAWAI.push({ x, z, rot, lantai: l, area, pose: "diam", aktivitas: "jaga", jenis: "jaga", terisi: z < 15 || x > 14, penampilan: penampilanPNS({ seragam: "satpam", perempuan: false, jilbab: null, rok: false }) });
}
// Petugas kebersihan mengepel di toilet & lorong, menyapu halaman.
for (const [l, x, z, rot, area, alat] of [
	[0, 14.1, 1.9, -Math.PI / 2, "toilet1", "pel"],
	[1, 13.6, 7.0, Math.PI, "toilet2", "pel"],
	[0, -2.0, 4.6, Math.PI / 2, "lorong1", "pel"],
	[1, -4.5, -5.0, Math.PI / 2, "aula2", "pel"],
	[0, -9.0, 24.5, 0.6, "luar", "sapu"],
	[0, 9.5, 25.0, -0.5, "luar", "sapu"],
	[0, -0.6, -9.8, Math.PI / 2, "belakang1", "pel"],
]) {
	PEGAWAI.push({ x, z, rot, lantai: l, area, pose: "jalan", aktivitas: "mengepel", jenis: "bersih", terisi: l === 0 && x > 13, penampilan: penampilanPNS({ seragam: "kebersihan", alat, map: false, rok: false }) });
}

for (const p of PEGAWAI) if (p.pose === "diam" && p.jenis !== "jaga") kotakPadat(p.lantai, p.x, p.z, 0.6, 0.6);

// Pegawai yang berjalan berkeliling. Titik-titiknya disambung lewat A* saat
// adegan dimuat, jadi mereka ikut menghindari meja dan dinding.
export const PEJALAN = [
	{
		lantai: 0,
		area: "lobi",
		jenis: "staf",
		titik: [
			[-5.0, 4.9],
			[-4.6, 10.9],
			[4.6, 10.9],
			[5.0, 4.9],
			[0.5, 3.0],
		],
		penampilan: penampilanPNS({ map: true }),
	},
	{
		lantai: 0,
		area: "lorong1",
		jenis: "staf",
		titik: [
			[-13.5, 4.8],
			[12.0, 4.8],
		],
		penampilan: penampilanPNS({ map: true }),
	},
	{
		lantai: 1,
		area: "aula2",
		jenis: "staf",
		titik: [
			[-4.5, 6.2],
			[4.5, 2.0],
			[4.5, -5.0],
			[-6.0, -5.0],
			[-8.3, -7.4],
			[4.5, -5.0],
			[10.0, 6.3],
			[1.2, 6.3],
		],
		penampilan: penampilanPNS({ map: true }),
	},
	// petugas kebersihan berkeliling membawa alat pel
	{
		lantai: 0,
		area: "belakang1",
		jenis: "bersih",
		titik: [
			[-1.1, -0.5],
			[2.3, -2.5],
			[2.3, -6.3],
			[-1.1, -6.3],
		],
		penampilan: penampilanPNS({ seragam: "kebersihan", alat: "pel", rok: false }),
	},
	// satpam berpatroli di halaman
	{
		lantai: 0,
		area: "luar",
		jenis: "jaga",
		titik: [
			[-12, 25],
			[12, 25],
			[12, 31],
			[-12, 31],
		],
		penampilan: penampilanPNS({ seragam: "satpam", perempuan: false, jilbab: null, rok: false }),
	},
];

// ---------- halaman depan ----------

export const PILAR = [
	{ x: -2.7, z: 13.6 },
	{ x: 2.7, z: 13.6 },
];
export const TIANG_BENDERA = { x: -11.5, z: 25.5 };
export const SEMAK = [-13, -10.5, -8, -5.5, 5.5, 8, 10.5, 13].map((x) => [x, 13]);

export const PARKIRAN = { x0: -15, x1: 15, z0: 12.3, z1: 23 };
export const MOBIL = [
	{ x: -12.6, warna: "#45484c" },
	{ x: -9.4, warna: "#2f6f6a" },
	{ x: -6.2, warna: "#ece4cf" },
	{ x: 6.2, warna: "#3a3d40" },
	{ x: 9.4, warna: "#5b5f64" },
].map((m) => ({ ...m, z: 18 }));
export const MOTOR = [10.9, 11.7, 12.5, 13.3, 14.1].map((x, i) => ({ x, z: 18, warna: i % 2 ? "#2b2b2e" : "#c4532d" }));
export const PAGAR_BATA = { x: -15.4, z0: 12.4, z1: 26, tinggi: 1.4 };
export const RUMAH_TETANGGA = { x: 27, z: 2, lx: 8, lz: 9, tinggi: 5 };

function acakBiji(seed) {
	let s = seed;
	return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export const POHON = (() => {
	const r = acakBiji(42);
	const hasil = [];
	for (let z = 26; z <= 44; z += 4.5) {
		for (const sisi of [-1, 1]) hasil.push([sisi * (10 + r() * 7), z + r() * 2, 0.8 + r() * 0.5]);
	}
	for (let z = -14; z <= 8; z += 5) {
		for (const sisi of [-1, 1]) hasil.push([sisi * (18 + r() * 4), z + r() * 2, 0.8 + r() * 0.5]);
	}
	for (let x = -14; x <= 14; x += 5) hasil.push([x + r() * 2, -16 - r() * 3, 0.8 + r() * 0.5]);
	return hasil;
})();

// ---------- penghalang tabrakan (kotak sejajar sumbu) per lantai ----------

const dariKotak = (b) => ({ x0: b.x - b.lx / 2, x1: b.x + b.lx / 2, z0: b.z - b.lz / 2, z1: b.z + b.lz / 2 });
const titik = (x, z, r) => ({ x0: x - r, x1: x + r, z0: z - r, z1: z + r });

const PETUGAS = [LOBI, ...RUANGAN];

export const PENGHALANG = [0, 1].map((l) => [
	...DINDING.filter((d) => d.lantai === l).map(dariKotak),
	...PADAT.filter((p) => p.lantai === l),
	...PETUGAS.filter((a) => a.lantai === l).map((a) => titik(a.npc.x, a.npc.z, 0.35)),
	...(l === 0
		? [
				...PILAR.map((p) => titik(p.x, p.z, 0.25)),
				titik(TIANG_BENDERA.x, TIANG_BENDERA.z, 0.15),
				...SEMAK.map(([x, z]) => titik(x, z, 0.5)),
				{ x0: PAGAR_BATA.x - 0.2, x1: PAGAR_BATA.x + 0.2, z0: PAGAR_BATA.z0, z1: PAGAR_BATA.z1 },
				dariKotak(RUMAH_TETANGGA),
				...POHON.map(([x, z]) => titik(x, z, 0.5)),
			]
		: []),
]);

export const BATAS_DUNIA = { x0: -34, x1: 34, z0: -22, z1: 48 };

// Penghalang khusus kendaraan: mobil/motor tidak boleh masuk lewat pintu lobi.
// (Mobil & motor sendiri dinamis — tabrakannya ada di kendaraan.js.)
export const PENGHALANG_KENDARAAN = [{ x0: -2.4, x1: 2.4, z0: 11.5, z1: 14.4 }];

export function tabrakKendaraanStatis(x, z, r) {
	if (tabrak(x, z, 0, r)) return true;
	return PENGHALANG_KENDARAAN.some((k) => x > k.x0 - r && x < k.x1 + r && z > k.z0 - r && z < k.z1 + r);
}

export function tabrak(x, z, lantai = 0, r = 0.38) {
	if (lantai === 0) {
		const b = BATAS_DUNIA;
		if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return true;
	}
	for (const k of PENGHALANG[lantai]) {
		if (x > k.x0 - r && x < k.x1 + r && z > k.z0 - r && z < k.z1 + r) return true;
	}
	return false;
}

// Satu langkah dari ketinggian yLama ke (x, z). Ketinggian di tujuan ditentukan
// tangga (bila ada) atau lantai saat ini. Langkah yang membuat tinggi melompat
// (jatuh dari sisi tangga, menaiki tangga dari samping) ditolak → null.
export function langkah(yLama, x, z) {
	const t = tanggaDi(x, z);
	if (t) {
		const y = tinggiTangga(t, x, z);
		return y !== null && Math.abs(y - yLama) < 0.6 ? y : null;
	}
	const lantai = yLama > H / 2 ? 1 : 0;
	const y = lantai * H;
	if (Math.abs(y - yLama) > 0.6) return null;
	return tabrak(x, z, lantai) ? null : y;
}

// ---------- pencarian jalur (A* di grid 0,5 m) ----------

const SEL = 0.5;
const GRID = [
	{ x0: -34, z0: -22, nx: 136, nz: 140 },
	{ x0: -15, z0: -13, nx: 60, nz: 50 },
];
const terhalang = [null, null];

function siapkanGrid(l) {
	if (terhalang[l]) return;
	const g = GRID[l];
	const arr = new Uint8Array(g.nx * g.nz);
	for (let j = 0; j < g.nz; j++) {
		for (let i = 0; i < g.nx; i++) {
			const x = g.x0 + (i + 0.5) * SEL;
			const z = g.z0 + (j + 0.5) * SEL;
			arr[j * g.nx + i] = tabrak(x, z, l, 0.42) || tanggaDi(x, z) ? 1 : 0;
		}
	}
	terhalang[l] = arr;
}

const keSel = (g, x, z) => [Math.floor((x - g.x0) / SEL), Math.floor((z - g.z0) / SEL)];

function selBebasTerdekat(ok, i, j) {
	if (ok(i, j)) return [i, j];
	for (let r = 1; r <= 3; r++) {
		for (let dj = -r; dj <= r; dj++) {
			for (let di = -r; di <= r; di++) if (ok(i + di, j + dj)) return [i + di, j + dj];
		}
	}
	return null;
}

function astar(l, dari, ke) {
	siapkanGrid(l);
	const g = GRID[l];
	const blok = terhalang[l];
	const ok = (i, j) => i >= 0 && j >= 0 && i < g.nx && j < g.nz && !blok[j * g.nx + i];
	const s = selBebasTerdekat(ok, ...keSel(g, dari.x, dari.z));
	const t = selBebasTerdekat(ok, ...keSel(g, ke.x, ke.z));
	if (!s || !t) return null;
	const [si, sj] = s;
	const [ti, tj] = t;
	const n = g.nx * g.nz;
	const gSkor = new Float32Array(n).fill(Infinity);
	const asal = new Int32Array(n).fill(-1);
	const tutup = new Uint8Array(n);
	const heap = [];
	const dorong = (idx, f) => {
		heap.push([f, idx]);
		let c = heap.length - 1;
		while (c > 0) {
			const p = (c - 1) >> 1;
			if (heap[p][0] <= heap[c][0]) break;
			[heap[p], heap[c]] = [heap[c], heap[p]];
			c = p;
		}
	};
	const ambil = () => {
		const atas = heap[0];
		const akhir = heap.pop();
		if (heap.length) {
			heap[0] = akhir;
			let c = 0;
			for (;;) {
				const a = 2 * c + 1;
				const b = a + 1;
				let m = c;
				if (a < heap.length && heap[a][0] < heap[m][0]) m = a;
				if (b < heap.length && heap[b][0] < heap[m][0]) m = b;
				if (m === c) break;
				[heap[m], heap[c]] = [heap[c], heap[m]];
				c = m;
			}
		}
		return atas[1];
	};
	const awal = sj * g.nx + si;
	const tujuan = tj * g.nx + ti;
	gSkor[awal] = 0;
	dorong(awal, Math.hypot(si - ti, sj - tj));
	while (heap.length) {
		const cur = ambil();
		if (cur === tujuan) break;
		if (tutup[cur]) continue;
		tutup[cur] = 1;
		const ci = cur % g.nx;
		const cj = (cur / g.nx) | 0;
		for (let dj = -1; dj <= 1; dj++) {
			for (let di = -1; di <= 1; di++) {
				if (!di && !dj) continue;
				const ni = ci + di;
				const nj = cj + dj;
				if (!ok(ni, nj)) continue;
				// Jangan memotong sudut dinding secara diagonal.
				if (di && dj && (!ok(ci + di, cj) || !ok(ci, cj + dj))) continue;
				const nb = nj * g.nx + ni;
				const skor = gSkor[cur] + (di && dj ? 1.4142 : 1);
				if (skor < gSkor[nb]) {
					gSkor[nb] = skor;
					asal[nb] = cur;
					dorong(nb, skor + Math.hypot(ni - ti, nj - tj));
				}
			}
		}
	}
	if (tujuan !== awal && asal[tujuan] < 0) return null;
	const jalur = [];
	for (let c = tujuan; c !== awal; c = asal[c]) {
		jalur.push({ x: g.x0 + ((c % g.nx) + 0.5) * SEL, z: g.z0 + (((c / g.nx) | 0) + 0.5) * SEL });
	}
	jalur.reverse();
	if (!tabrak(ke.x, ke.z, l) && !tanggaDi(ke.x, ke.z)) jalur.push({ x: ke.x, z: ke.z });
	return rapikan(l, dari, jalur);
}

// Buang titik antara selama garis lurusnya bebas halangan (string pulling).
function bebas(l, a, b) {
	const d = Math.hypot(b.x - a.x, b.z - a.z);
	const n = Math.ceil(d / 0.2);
	for (let k = 1; k < n; k++) {
		const x = a.x + ((b.x - a.x) * k) / n;
		const z = a.z + ((b.z - a.z) * k) / n;
		if (tabrak(x, z, l, 0.4) || tanggaDi(x, z)) return false;
	}
	return true;
}

function rapikan(l, dari, jalur) {
	const hasil = [];
	let titikIni = dari;
	let i = 0;
	while (i < jalur.length) {
		let j = jalur.length - 1;
		while (j > i && !bebas(l, titikIni, jalur[j])) j--;
		hasil.push(jalur[j]);
		titikIni = jalur[j];
		i = j + 1;
	}
	return hasil;
}

const panjangJalur = (awal, daftar) =>
	daftar.reduce((s, p, k) => s + Math.hypot(p.x - (k ? daftar[k - 1] : awal).x, p.z - (k ? daftar[k - 1] : awal).z), 0);

// Rute dari {x, z, lantai} ke {x, z, lantai}. Beda lantai → lewat tangga yang
// total jaraknya paling pendek. Mengembalikan daftar titik, atau null bila buntu.
export function cariJalur(dari, ke) {
	if (dari.lantai === ke.lantai) return astar(dari.lantai, dari, ke);
	let terbaik = null;
	for (const t of TANGGA) {
		const u = ujungTangga(t);
		const naik = dari.lantai === 0;
		const [masuk, keluar] = naik ? [u.bawah, u.atas] : [u.atas, u.bawah];
		const lintasan = naik ? u.lintasan : [...u.lintasan].reverse();
		const a = astar(dari.lantai, dari, masuk);
		const b = a && astar(ke.lantai, keluar, ke);
		if (!b) continue;
		const panjang = panjangJalur(dari, a) + panjangJalur(keluar, b);
		if (!terbaik || panjang < terbaik.panjang) terbaik = { panjang, titik: [...a, masuk, ...lintasan, keluar, ...b] };
	}
	return terbaik?.titik ?? null;
}
