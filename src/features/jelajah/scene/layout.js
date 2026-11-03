import { AREA_LAIN, LOBI, RUANGAN, TINGGI_LANTAI } from "../kantorConfig";
import { diKawasan, tabrakKawasan } from "./kawasanBantu";
import { KURSI_BIOSKOP_DASAR, KURSI_FC_DASAR, KURSI_KOPI_DASAR, KURSI_MCD_DASAR, SUPERMARKET_CCM, dalamLahanCcm, malAktif, tinggiMal, yLantaiMal } from "./gedungKhusus";
import { AIR_Y, DEK_Y, DERMAGA, KIOS_TOKO_PANCING, dermagaDi, diSitu, jarakKeTepi, keDuniaDermaga } from "./situ";
import { BANGKU_TAMU_KOLAM, PENGHALANG_KOLAM } from "./kolamMonsterData";
import { KURSI_PASAR_DASAR, KURSI_PASAR_NPC, PENGHALANG_PASAR } from "./pasarBumdesData";
import { PENGHALANG_SHOWROOM } from "./showroomData";

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
	// Ruang Rapat Pangrango (pintu menghadap lorong), dinding depannya segaris kaki
	// tangga depan supaya area di depan kolam ikan lapang
	...garis(0, "x", 3.8, -15, -8.3, [[-13, 1.6]]),
	...garis(0, "z", -8.3, -2.6, 3.8),
	...garis(0, "x", -2.6, -15, -8.3),
	// Ruang Arsip (pintu di sisi kanan), dinding depannya menempel ujung belakang
	// tangga depan.
	...garis(0, "z", -8, -6.4, -0.65),
	...garis(0, "z", -2.8, -6.4, -0.65, [[-4, 1.4]]),
	...garis(0, "x", -0.65, -8, -2.8),
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
	// Ruang Kepala Dinas: membentang ke belakang sampai dinding Halimun; pintunya di
	// samping kanan dekat pojok belakang, membuka ke lorong di depan Prolap.
	...garis(1, "z", -8.4, 3.8, 12, [[5.75, 1.2]]),
	// Prolap & Keuangan berimpit, hanya dipisah satu tembok
	...garis(1, "z", 4, 7.3, 12),
	...garis(1, "x", 7.3, -8.4, 8.5, [
		[0, 1.6],
		[7.25, 1.2],
	]),
	// Kolom kanan, dari depan ke belakang: Ruang Sekretaris Dinas (sampai garis
	// lorong; pintu di samping, di ujung lorong depan), toilet, lalu Pemdes.
	...garis(1, "z", 8.5, 3.8, 12, [[5.75, 1.2]]),
	...garis(1, "x", 3.8, 8.5, 15),
	...garis(1, "z", 10.25, 2, 3.8, [[2.75, 1.2]]),
	...garis(1, "x", 2, 8.5, 15),
	// PMD berbentuk ㄱ: bagian atasnya membentang di belakang tangga depan sampai
	// dinding Ruang Rapat Halimun; kakinya di samping tangga depan (pintu depan).
	// Di belakangnya ada jalan ke dapur (pintu belakang PMD ke jalan itu).
	...garis(1, "x", -4, -6.95, 3.1, [[-3.7, 1.4]]),
	...garis(1, "x", -1, -6.95, -4.05),
	...garis(1, "z", -4.05, -1, 3.8),
	...garis(1, "z", 3.1, -4, 3.8),
	// dinding depan Sekretariat (pintu ke lorong antara PMD & Pemdes)
	...garis(1, "x", -6, -1.4, 8.5, [[4.6, 1.4]]),
	...garis(1, "x", 3.8, -4.05, 3.1, [[-0.9, 1.4]]),
	// Ruang Rapat Halimun (pintu menghadap Ruang Kepala Dinas) & Gudang Arsip di
	// depan dapur (pintunya di samping, dekat pintu dapur)
	// Halimun melebar sampai menempel tangga depan, dinding depannya segaris bibir
	// tangga dan pintunya di dekat tangga; Gudang Arsip di depan dapur
	...garis(1, "z", -6.95, -5.6, 3.8),
	...garis(1, "x", 3.8, -15, -6.95, [[-7.75, 1.2]]),
	...garis(1, "x", -5.6, -15, -6.95),
	...garis(1, "z", -9.5, -9.6, -5.6, [[-8.75, 1.2]]),
	// Dapur di pojok belakang, menempel Halimun; tangga belakang tepat di sampingnya
	...garis(1, "z", -4.6, -13, -9.6),
	...garis(1, "x", -9.6, -15, -4.6, [[-7.2, 1.2]]),
	// Sekretariat (pintu di depan) & Pemdes menempel dengan satu dinding bersama;
	// pintu Pemdes di samping, ke lorong antara PMD & Pemdes
	...garis(1, "z", -1.4, -13, -6),
	...garis(1, "z", 8.5, -13, 2, [[0.25, 1.2]]),
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
	{ lantai: 0, x: -13, z: 3.8, lebar: 1.6, jenis: "kayu" },
	{ lantai: 0, x: -2.8, z: -4, lebar: 1.4, jenis: "kayu", sumbu: "x" },
	{ lantai: 0, x: -8.3, z: -9.6, lebar: 1.6, jenis: "kayu" },
	{ lantai: 0, x: 2.8, z: -7, lebar: 1.6, jenis: "kayu", sumbu: "x" },
	{ lantai: 1, x: -8.4, z: 5.75, lebar: 1.2, jenis: "kayu", sumbu: "x" },
	{ lantai: 1, x: 0, z: 7.3, lebar: 1.6, jenis: "kayu" },
	{ lantai: 1, x: 7.25, z: 7.3, lebar: 1.2, jenis: "kayu" },
	{ lantai: 1, x: 8.5, z: 5.75, lebar: 1.2, jenis: "kayu", sumbu: "x" },
	{ lantai: 1, x: 10.25, z: 2.75, lebar: 1.2, jenis: "kayu", sumbu: "x" },
	{ lantai: 1, x: -0.9, z: 3.8, lebar: 1.4, jenis: "kayu" },
	{ lantai: 1, x: -3.7, z: -4, lebar: 1.4, jenis: "kayu" },
	{ lantai: 1, x: -9.5, z: -8.75, lebar: 1.2, jenis: "kayu", sumbu: "x" },
	{ lantai: 1, x: -7.75, z: 3.8, lebar: 1.2, jenis: "kayu" },
	{ lantai: 1, x: -7.2, z: -9.6, lebar: 1.2, jenis: "kayu" },
	{ lantai: 1, x: 4.6, z: -6, lebar: 1.4, jenis: "kayu" },
	{ lantai: 1, x: 8.5, z: 0.25, lebar: 1.2, jenis: "kayu", sumbu: "x" },
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

ruangRapat(0, "pangrango", -10.5, -1.4, 1.8, true);
ruangRapat(0, "salak", 6.3, -11.0, -2.2, true);
ruangRapat(0, "salak", 11.5, -11.0, -2.2, false);

// Ruang Arsip: rak arsip berjajar dan satu meja petugas arsip di bagian depan.
for (const z of [-5.8, -4.8, -3.8, -2.8]) perabot("lemari", 0, -7.55, z, Math.PI / 2, [0.5, 0.95]);
for (const z of [-5.5, -4.5]) {
	perabot("lemari", 0, -5.6, z, Math.PI / 2, [0.5, 0.95]);
	perabot("lemari", 0, -5.1, z, -Math.PI / 2, [0.5, 0.95]);
}
kursiKerja(0, "arsip", -6.6, -1.5, Math.PI / 2, true);
kotakPadat(0, -5.95, -1.5, 0.8, 1.6);

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
klaster(1, "keuangan", 4.95, 9.6);
// PMD: deret meja di bagian belakang, satu klaster & meja layanan di kaki depan.
for (const x of [-6.0, -1.8, 1.6]) klaster(1, "pmd", x, -2.5);
klaster(1, "pmd", -2.85, 1.9);
// Sekretariat: klaster mengapit meja layanan.
for (const x of [-0.45, 4.6, 6.2]) klaster(1, "sekretariat", x, -9.4);
// Pemdes: dua deret meja.
for (const x of [9.7, 11.8, 13.9]) for (const z of [-9.0, -4.5]) klaster(1, "pemdes", x, z);
// Gudang Arsip lantai 2: lemari arsip berjajar.
for (const x of [-14.2, -13.2, -12.2, -11.2]) perabot("lemari", 1, x, -9.2, 0, [0.95, 0.5]);
for (const z of [-7.6, -6.6]) perabot("lemari", 1, -14.6, z, Math.PI / 2, [0.5, 0.95]);
perabot("lemari", 1, 14.6, 0.6, -Math.PI / 2, [0.5, 0.95]);
ruangRapat(1, "halimun", -11.0, -4.0, 1.4, true);

// Ruang Kepala Dinas (menghadap Prolap): meja pimpinan, lemari di belakang kursi,
// sofa tamu di sisi depan, ajudan berjaga dekat pintu.
perabot("mejaPimpinan", 1, -12.75, 8.3, Math.PI / 2, [1.0, 2.4]);
perabot("kursiEksekutif", 1, -13.6, 8.3, Math.PI / 2);
perabot("lemari", 1, -14.6, 6.6, Math.PI / 2, [0.5, 0.95]);
perabot("lemari", 1, -14.6, 10.0, Math.PI / 2, [0.5, 0.95]);
perabot("sofa", 1, -11.0, 11.4, Math.PI, [2.0, 0.85]);
perabot("mejaKopi", 1, -11.0, 10.4, 0, [0.9, 0.55]);
PEGAWAI.push({
	x: -9.4,
	z: 4.8,
	rot: -Math.PI / 2,
	lantai: 1,
	area: "kadis",
	pose: "diam",
	aktivitas: "berdiri",
	jenis: "ajudan",
	terisi: true,
	penampilan: penampilanPNS({ perempuan: false, jilbab: null, rok: false }),
});

// Ruang Sekretaris Dinas: meja pimpinan dekat jendela depan, dua kursi tamu,
// lemari arsip, sofa tamu di sisi belakang.
perabot("mejaPimpinan", 1, 11.75, 9.6, Math.PI, [2.4, 1.0]);
perabot("kursiEksekutif", 1, 11.75, 10.5, Math.PI);
perabot("kursi", 1, 11.25, 8.5, 0);
perabot("kursi", 1, 12.25, 8.5, 0);
perabot("lemari", 1, 14.6, 9.0, -Math.PI / 2, [0.5, 0.95]);
perabot("lemari", 1, 14.6, 10.2, -Math.PI / 2, [0.5, 0.95]);
perabot("sofa", 1, 12.0, 4.35, 0, [2.0, 0.85]);
perabot("mejaKopi", 1, 12.0, 5.35, 0, [0.9, 0.55]);
PEGAWAI.push({ x: 11.75, z: 10.5, rot: Math.PI, lantai: 1, area: "sekdis", pose: "duduk", aktivitas: "mengetik", jenis: "sekdis", terisi: true, penampilan: penampilanPNS() });

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
perabot("wastafel", 1, 12.5, 2.3, 0, [0.8, 0.5]);
perabot("bilik", 1, 14.0, 2.9, 0, [1.9, 1.4]);

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

// Pos satpam di samping gerbang: satu satpam duduk berjaga menghadap gerbang
// (meja & kursinya digambar bersama pos, di ketinggian halaman).
PEGAWAI.push({ x: 14.4, z: 26.2, rot: -Math.PI / 2, lantai: 0, area: "luar", pose: "duduk", aktivitas: "menunggu", jenis: "jaga", terisi: true, penampilan: penampilanPNS({ seragam: "satpam", perempuan: false, jilbab: null, rok: false }) });
// Satpam berjaga di depan pintu, di lobi, di gerbang, di parkiran, dan di lantai 2.
for (const [l, x, z, rot, area] of [
	[0, -2.9, 13.6, 0, "luar"],
	[0, 2.9, 13.6, 0, "luar"],
	[0, -2.9, 11.3, Math.PI, "lobi"],
	[0, 13.2, 23.9, -Math.PI / 2, "luar"],
	[0, 14.6, 21.5, -Math.PI / 2, "luar"],
	[1, -6.0, 6.4, Math.PI, "aula2"],
	[0, -13.5, 5.6, Math.PI / 2, "lorong1"],
]) {
	PEGAWAI.push({ x, z, rot, lantai: l, area, pose: "diam", aktivitas: "jaga", jenis: "jaga", terisi: z < 15 || x > 14, penampilan: penampilanPNS({ seragam: "satpam", perempuan: false, jilbab: null, rok: false }) });
}
// Petugas kebersihan mengepel di toilet & lorong, menyapu halaman.
for (const [l, x, z, rot, area, alat] of [
	[0, 14.1, 1.9, -Math.PI / 2, "toilet1", "pel"],
	[1, 11.4, 3.0, Math.PI / 2, "toilet2", "pel"],
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
			[7.5, 5.5],
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

// Gedung berdiri di atas pondasi semen: lantai gedung tetap y = 0, seluruh halaman
// FONDASI m lebih rendah. Satu-satunya jalan naik: anak tangga selebar teras di
// depan lobi, lalu teras berkanopi sampai pintu kaca.
export const FONDASI = 0.6;
export const TANAH = -FONDASI;
export const PONDASI = { x0: -15.4, x1: 15.4, z0: -13.4, z1: 12.4 };
export const TERAS = { x0: -4.6, x1: 4.6, z0: 12, z1: 15.2 };
export const ANAK_TANGGA = { n: 2, dalam: 0.45 }; // dua pijakan di depan teras, tiap naik 0,2 m

// Tinggi pijakan lantai 1 di (x, z): 0 di atas pondasi & teras, bertingkat di anak
// tangga, TANAH di halaman.
export function tinggiTanah(x, z) {
	if (dermagaDi(x, z)) return TANAH + DEK_Y;
	const p = PONDASI;
	if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) return 0;
	const t = TERAS;
	if (x >= t.x0 && x <= t.x1 && z >= t.z0) {
		if (z <= t.z1) return 0;
		const i = Math.ceil((z - t.z1) / ANAK_TANGGA.dalam);
		if (i <= ANAK_TANGGA.n) return (-FONDASI * i) / (ANAK_TANGGA.n + 1);
	}
	return TANAH;
}

export const PILAR = [
	{ x: -3.9, z: 14.75 },
	{ x: 3.9, z: 14.75 },
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
export const PAGAR_BATA = { x: -15.4, z0: 12.4, z1: 28, tinggi: 1.4 };
// Tetangga kanan (Badan Kesbangpol) dan seluruh kawasan Pemda di sekitarnya digambar
// dari data OpenStreetMap — lihat Kawasan.jsx.

// Pagar depan seperti kantor aslinya: dinding abu-abu berlis hijau dengan lubang
// tegak, tiang batu tiap ±3 m, gerbang geser di kanan (terbuka, daunnya tergeser
// ke kiri di balik pagar), pos satpam di samping gerbang, papan nama dinas di kiri.
// Di luar pagar: bak tanaman, trotoar berkanstin hitam-putih, lalu jalan aspal.
export const PAGAR_DEPAN = { z: 28, x0: -15.6, x1: 20.5, gerbang: [6, 12], tinggi: 1.6 };
export const PAGAR_KANAN = { x: 20.5, z0: 8, z1: 28 };
export const POS_SATPAM = { x: 14.4, z: 25.9, lx: 3.6, lz: 3.0, tinggi: 2.6 };
export const PAPAN_NAMA = { x: -7, z: 28.75 };
export const JALAN = { trotoar: 29.4, kanstin: 31.3, aspal0: 31.6, aspal1: 39.6 };
const TIANG_GERBANG = 0.35; // setengah lebar tiang batu di kedua sisi gerbang

// Deretan toko di seberang jalan depan kantor, muka menghadap jalan (−z), halaman parkir
// dari trotoar seberang sampai muka toko. Alfamart tepat di depan kantor, Koperasi Desa
// Merah Putih (sembako) di sebelah baratnya. Keduanya bisa dimasuki dengan denah yang sama:
// pintu kaca geser di tengah, tiga rak (tiap sisi satu jenis barang), kasir di kiri,
// kulkas / karung di dinding belakang, tumpukan keranjang di kanan pintu.
function susunToko(id, cx, rak, z0 = 47) {
	return {
		id,
		x0: cx - 6,
		x1: cx + 6,
		z0,
		z1: z0 + 9,
		tinggi: 4.4,
		pintu: { x0: cx - 1.1, x1: cx + 1.1, z: z0 },
		// rak: kiri = sisi −x, kanan = sisi +x (id barang di toko.js)
		rak: [-2.0, 1.0, 3.8].map((dx, i) => ({ x: cx + dx, z0: z0 + 2.6, z1: z0 + 7, kiri: rak[i][0], kanan: rak[i][1] })),
		mejaKasir: { x0: cx - 5.3, x1: cx - 4.4, z0: z0 + 1, z1: z0 + 3.6 },
		titikKasir: { x: cx - 3.75, z: z0 + 2.3 },
		keranjang: { x: cx + 2.6, z: z0 + 0.85 },
	};
}
export const TOKO = [
	susunToko("alfamart", 0, [
		["air", "esteh"],
		["roti", "mie"],
		["nasi", "energi"],
	]),
	susunToko("koperasi", 16, [
		["beras", "minyak"],
		["telur", "gula"],
		["tempe", "kopi"],
	]),
	// supermarket di aula Cibinong City Mall (lihat gedungKhusus.js)
	susunToko(
		"ccm",
		SUPERMARKET_CCM.cx,
		[
			["keripik", "cokelat"],
			["susu", "jus"],
			["apel", "eskrim"],
		],
		SUPERMARKET_CCM.z0,
	),
].map((t) => (t.id === "ccm" ? { ...t, lantaiMal: 0 } : t));
export const TOKO_PER_ID = Object.fromEntries(TOKO.map((t) => [t.id, t]));
// toko bertanda lantaiMal (supermarket CCM) hanya dikenali di lantai mal itu
export const tokoDi = (x, z) => TOKO.find((t) => x > t.x0 && x < t.x1 && z > t.z0 && z < t.z1 && (t.lantaiMal === undefined || t.lantaiMal === malAktif.lantai)) || null;

// Warung tenda mie ayam di sebelah timur Alfamart: gerobak (pesan di sini), dua meja
// panjang berbangku. Pesanan diantar ke meja begitu pembeli duduk.
export const WARUNG_MIE = { x0: -19.2, x1: -9.4, z0: 44.8, z1: 52.8, tinggi: 2.7 };
export const GEROBAK_MIE = { x: -11.2, z: 46.4, lx: 1.9, lz: 0.8 };
export const TITIK_PESAN_MIE = { x: -11.2, z: 45.35 };
export const MEJA_MIE = [48.6, 51.3].map((z) => ({ x0: -17.6, x1: -13.4, z0: z - 0.36, z1: z + 0.36, z }));
export const KURSI_WARUNG = MEJA_MIE.flatMap((m) =>
	[-16.9, -15.5, -14.1].flatMap((x) => [
		{ x, z: m.z - 0.62, rot: 0, lantai: 0, y: TANAH, meja: m.z },
		{ x, z: m.z + 0.62, rot: Math.PI, lantai: 0, y: TANAH, meja: m.z },
	]),
).map((k, i) => ({ ...k, warung: "mie", ...(i === 3 || i === 8 ? { npc: true } : {}) })); // dua bangku diisi pelanggan

// Warung tenda "Pecel Ayam Bude" di samping barat Koperasi Desa Merah Putih: denah sama
// dengan warung mie ayam (gerobak di sisi jalan, dua meja panjang berbangku).
export const WARUNG_PECEL = { x0: 23.6, x1: 32.6, z0: 44.8, z1: 52.8, tinggi: 2.7 };
export const GEROBAK_PECEL = { x: 25.5, z: 46.4, lx: 1.9, lz: 0.8 };
export const TITIK_PESAN_PECEL = { x: 25.5, z: 45.35 };
export const MEJA_PECEL = [48.6, 51.3].map((z) => ({ x0: 26.6, x1: 31.4, z0: z - 0.36, z1: z + 0.36, z }));
export const KURSI_PECEL = MEJA_PECEL.flatMap((m) =>
	[27.3, 29.0, 30.7].flatMap((x) => [
		{ x, z: m.z - 0.62, rot: 0, lantai: 0, y: TANAH, meja: m.z },
		{ x, z: m.z + 0.62, rot: Math.PI, lantai: 0, y: TANAH, meja: m.z },
	]),
).map((k, i) => ({ ...k, warung: "pecel", ...(i === 5 || i === 10 ? { npc: true } : {}) }));

// Kursi di McD, kedai kopi CCM, dan studio bioskop CCM.
// lantaiMal: kursi di lantai atas mal (y & tinggi meja ikut lantainya)
const kursiDari = (daftar, ekstra, lantaiMal) =>
	daftar.map(([x, z, rot]) => ({ x, z, rot, lantai: 0, y: TANAH + (lantaiMal ? yLantaiMal(lantaiMal) : 0), ...(lantaiMal ? { mejaY: yLantaiMal(lantaiMal) + 0.75, lantaiMal } : {}), ...ekstra }));
export const KURSI_MCD = kursiDari(KURSI_MCD_DASAR, { warung: "mcd" }).map((k, i) => ([1, 6, 11].includes(i) ? { ...k, npc: true } : k));
export const KURSI_KOPI = kursiDari(KURSI_KOPI_DASAR, { warung: "kopi" }).map((k, i) => ([2, 9].includes(i) ? { ...k, npc: true } : k));
export const KURSI_FC = kursiDari(KURSI_FC_DASAR, { warung: "foodcourt" }, 2).map((k, i) => (i % 5 === 1 ? { ...k, npc: true } : k));
export const KURSI_BIOSKOP = kursiDari(KURSI_BIOSKOP_DASAR, { bioskop: true }, 3);
// bangku pancing Kolam Monster (kolam: dari bangku bisa langsung memancing)
export const KURSI_KOLAM = BANGKU_TAMU_KOLAM.map((b) => ({ ...b, lantai: 0, y: TANAH, kolam: true }));
// food court Pasar BUMDes: kursi bersama semua lapak (grup "pasar" di warung.js)
export const KURSI_PASAR = kursiDari(KURSI_PASAR_DASAR, { warung: "pasar" }).map((k, i) => (KURSI_PASAR_NPC.has(i) ? { ...k, npc: true } : k));
export const KURSI_MAKAN = [...KURSI_WARUNG, ...KURSI_PECEL, ...KURSI_MCD, ...KURSI_KOPI, ...KURSI_FC, ...KURSI_PASAR];
// Toko aksesoris "Distro Gaya" di timur warung mie ayam: rak baju, manekin, kasir, dan dua
// bilik ruang coba bertirai di sisi timur (coba gratis, beli di dalam bilik atau kasir).
export const DISTRO = { x0: -32, x1: -21.6, z0: 47, z1: 55.5, tinggi: 3.8, pintu: { x0: -27.9, x1: -25.7, z: 47 } };
export const BILIK_COBA = [
	{ x0: -31.8, x1: -30.2, z0: 52.4, z1: 53.85 },
	{ x0: -31.8, x1: -30.2, z0: 54.0, z1: 55.3 },
];
export const MEJA_DISTRO = { x0: -23.6, x1: -22.7, z0: 50.4, z1: 53 };
export const TITIK_DISTRO = [
	{ x: -24.3, z: 51.7 }, // kasir
	{ x: -26.2, z: 54.0 }, // rak baju belakang
];
export const MANEKIN = [
	{ x: -30.1, z: 48.5, rot: Math.PI, gaya: { t: 6, b: 5, c: 1, s: 3 } },
	{ x: -23.3, z: 48.5, rot: Math.PI, gaya: { t: 1, b: 2, c: 3, s: 1 } },
	{ x: -26.8, z: 52.6, rot: Math.PI, gaya: { t: 7, b: 6, c: 5, s: 5 } },
];
export const dalamDistro = (x, z) => x > DISTRO.x0 && x < DISTRO.x1 && z > DISTRO.z0 && z < DISTRO.z1;
export const bilikDi = (x, z) => BILIK_COBA.findIndex((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);

export const HALAMAN_TOKO = { x0: DISTRO.x0 - 1, x1: WARUNG_PECEL.x1 + 1, z0: JALAN.aspal1 + 1.8, z1: 47 };

// Ruas pagar (tanpa bukaan gerbang) sebagai [x0, x1] di sepanjang z PAGAR_DEPAN.
export const RUAS_PAGAR_DEPAN = [
	[PAGAR_DEPAN.x0, PAGAR_DEPAN.gerbang[0] - TIANG_GERBANG],
	[PAGAR_DEPAN.gerbang[1] + TIANG_GERBANG, PAGAR_DEPAN.x1],
];

function acakBiji(seed) {
	let s = seed;
	return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export const POHON = (() => {
	const r = acakBiji(42);
	const hasil = [];
	// pohon peneduh di bak tanaman depan pagar & di seberang jalan
	for (const x of [-13.8, -3.6, 2.6, 17.5]) hasil.push([x, 29.0, 1.1 + r() * 0.3]);
	for (let x = -26; x <= 26; x += 7) {
		const pohon = [x + r() * 2, 43 + r() * 2, 0.9 + r() * 0.4];
		// halaman toko & warung dibiarkan lapang
		if (pohon[0] < -34 || pohon[0] > 25) hasil.push(pohon);
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
				// bak tanaman di kedua sisi teras & anak tangga (tepi pondasi tidak bisa dituruni)
				...[TERAS.x0 - 0.15, TERAS.x1 + 0.15].map((x) => ({ x0: x - 0.15, x1: x + 0.15, z0: TERAS.z0 + 0.4, z1: TERAS.z1 + ANAK_TANGGA.n * ANAK_TANGGA.dalam })),
				titik(TIANG_BENDERA.x, TIANG_BENDERA.z, 0.15),
				...SEMAK.map(([x, z]) => titik(x, z, 0.5)),
				{ x0: PAGAR_BATA.x - 0.2, x1: PAGAR_BATA.x + 0.2, z0: PAGAR_BATA.z0, z1: PAGAR_BATA.z1 },
				...RUAS_PAGAR_DEPAN.map(([x0, x1]) => ({ x0, x1, z0: PAGAR_DEPAN.z - 0.2, z1: PAGAR_DEPAN.z + 0.2 })),
				{ x0: PAGAR_KANAN.x - 0.2, x1: PAGAR_KANAN.x + 0.2, z0: PAGAR_KANAN.z0, z1: PAGAR_KANAN.z1 },
				...PAGAR_DEPAN.gerbang.map((x) => titik(x, PAGAR_DEPAN.z, TIANG_GERBANG)),
				// daun gerbang yang terbuka, tergeser di balik pagar kiri gerbang
				{ x0: PAGAR_DEPAN.gerbang[0] * 2 - PAGAR_DEPAN.gerbang[1] + 0.2, x1: PAGAR_DEPAN.gerbang[0] + 0.2, z0: PAGAR_DEPAN.z - 0.55, z1: PAGAR_DEPAN.z - 0.35 },
				dariKotak(POS_SATPAM),
				// toko: dinding berpintu, rak, kasir, kulkas, tumpukan keranjang
				...TOKO.flatMap((t) =>
					[
					{ x0: t.x0, x1: t.x1, z0: t.z1 - 0.2, z1: t.z1 },
					{ x0: t.x0, x1: t.x0 + 0.2, z0: t.z0, z1: t.z1 },
					{ x0: t.x1 - 0.2, x1: t.x1, z0: t.z0, z1: t.z1 },
					{ x0: t.x0, x1: t.pintu.x0, z0: t.z0 - 0.05, z1: t.z0 + 0.15 },
					{ x0: t.pintu.x1, x1: t.x1, z0: t.z0 - 0.05, z1: t.z0 + 0.15 },
					...t.rak.map((r) => ({ x0: r.x - 0.28, x1: r.x + 0.28, z0: r.z0, z1: r.z1 })),
					t.mejaKasir,
					{ x0: t.x0 + 1, x1: t.x1 - 1, z0: t.z1 - 0.95, z1: t.z1 },
					titik(t.keranjang.x, t.keranjang.z + 0.1, 0.3),
					].map((k) => (t.lantaiMal === undefined ? k : { ...k, lantaiMal: t.lantaiMal })),
				),
				// distro: dinding berpintu, sekat bilik coba, rak baju, kasir, manekin
				{ x0: DISTRO.x0, x1: DISTRO.x1, z0: DISTRO.z1 - 0.2, z1: DISTRO.z1 },
				{ x0: DISTRO.x0, x1: DISTRO.x0 + 0.2, z0: DISTRO.z0, z1: DISTRO.z1 },
				{ x0: DISTRO.x1 - 0.2, x1: DISTRO.x1, z0: DISTRO.z0, z1: DISTRO.z1 },
				{ x0: DISTRO.x0, x1: DISTRO.pintu.x0, z0: DISTRO.z0 - 0.05, z1: DISTRO.z0 + 0.15 },
				{ x0: DISTRO.pintu.x1, x1: DISTRO.x1, z0: DISTRO.z0 - 0.05, z1: DISTRO.z0 + 0.15 },
				...[52.3, 53.92].map((z) => ({ x0: DISTRO.x0, x1: -30.1, z0: z - 0.04, z1: z + 0.04 })),
				{ x0: -29.6, x1: -22.9, z0: 54.7, z1: DISTRO.z1 },
				MEJA_DISTRO,
				...MANEKIN.map((m) => titik(m.x, m.z, 0.3)),
				// kios Toko Pancing di pangkal tiap dermaga
				...KIOS_TOKO_PANCING.map((k) => titik(k.x, k.z, 0.85)),
				// warung mie ayam & pecel ayam: gerobak, meja, bangku, tiang tenda
				...[
					[WARUNG_MIE, GEROBAK_MIE, MEJA_MIE],
					[WARUNG_PECEL, GEROBAK_PECEL, MEJA_PECEL],
				].flatMap(([w, g, meja]) => [
					dariKotak(g),
					...meja,
					...meja.flatMap((m) => [-1, 1].map((s) => ({ x0: m.x0, x1: m.x1, z0: m.z + s * 0.62 - 0.14, z1: m.z + s * 0.62 + 0.14 }))),
					...[w.x0, w.x1].flatMap((x) => [w.z0, w.z1].map((z) => titik(x, z, 0.08))),
				]),
				titik(PAPAN_NAMA.x - 1.3, PAPAN_NAMA.z, 0.12),
				titik(PAPAN_NAMA.x + 1.3, PAPAN_NAMA.z, 0.12),
				...POHON.map(([x, z]) => titik(x, z, 0.5)),
				// Kolam Monster DPMD: air, kios loket, pagar tiga sisi
				...PENGHALANG_KOLAM,
				...PENGHALANG_PASAR,
				...PENGHALANG_SHOWROOM,
			]
		: []),
]);


// Penghalang khusus kendaraan: mobil/motor tidak boleh masuk lewat pintu lobi.
// (Mobil & motor sendiri dinamis — tabrakannya ada di kendaraan.js.)
export const PENGHALANG_KENDARAAN = [{ x0: TERAS.x0 - 0.3, x1: TERAS.x1 + 0.3, z0: 11.5, z1: TERAS.z1 + ANAK_TANGGA.n * ANAK_TANGGA.dalam + 0.2 }];

export function tabrakKendaraanStatis(x, z, r) {
	if (tabrak(x, z, 0, r)) return true;
	return PENGHALANG_KENDARAAN.some((k) => x > k.x0 - r && x < k.x1 + r && z > k.z0 - r && z < k.z1 + r);
}

export function tabrak(x, z, lantai = 0, r = 0.38, bolehAir = false) {
	if (lantai === 0 && !diKawasan(x, z)) return true;
	for (const k of PENGHALANG[lantai]) {
		if (k.lantaiMal !== undefined && k.lantaiMal !== malAktif.lantai) continue;
		if (x > k.x0 - r && x < k.x1 + r && z > k.z0 - r && z < k.z1 + r) return true;
	}
	return lantai === 0 && tabrakKawasan(x, z, r, bolehAir);
}

// ---------- berenang di Situ Pemda ----------
// Air situ boleh dimasuki dari tepi; badan tamu yang berenang mengapung di permukaan.
export const PERMUKAAN_SITU = TANAH + AIR_Y;
export const diAirSitu = (x, z) => diSitu(x, z) && !dermagaDi(x, z);
// Badan saat berenang: f 0 = mengapung tegak (kepala di atas air), 1 = gaya bebas mendatar.
export function aturBadanRenang(g, f) {
	g.rotation.x = 0.15 + 1.2 * f;
	g.position.y = -1.32 * (1 - f) - 0.15 * f;
}
// Langkah di halaman yang boleh keluar-masuk air situ (tanpa batas beda tinggi tepi/talud).
export function langkahRenang(x, z) {
	const air = diAirSitu(x, z);
	if (tabrak(x, z, 0, 0.38, air || jarakKeTepi(x, z) < 1.2)) return null;
	return air ? PERMUKAAN_SITU : tinggiTanah(x, z);
}

// Satu langkah dari ketinggian yLama ke (x, z). Ketinggian di tujuan ditentukan
// tangga (bila ada) atau lantai saat ini. Langkah yang membuat tinggi melompat
// (jatuh dari sisi tangga, menaiki tangga dari samping) ditolak → null.
export function langkah(yLama, x, z) {
	// di dalam lahan Cibinong City Mall: lantai mal & eskalator menentukan tingginya
	if (dalamLahanCcm(x, z)) {
		const y = tinggiMal(yLama, x, z);
		return y === null || tabrak(x, z, 0) ? null : y;
	}
	const t = tanggaDi(x, z);
	if (t) {
		const y = tinggiTangga(t, x, z);
		return y !== null && Math.abs(y - yLama) < 0.6 ? y : null;
	}
	const lantai = yLama > H / 2 ? 1 : 0;
	const y = lantai ? H : tinggiTanah(x, z);
	// anak tangga 0,2 m bisa dinaiki; tepi pondasi (0,6 m) tidak
	if (Math.abs(y - yLama) > 0.3) return null;
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
	// Grid A* hanya menutupi kantor & halamannya. Di kawasan luas sekitarnya pengunjung
	// berjalan lurus ke titik yang diketuk (berhenti bila terhalang).
	const g = GRID[0];
	const diGrid = (p) => p.x > g.x0 && p.x < g.x0 + g.nx * SEL && p.z > g.z0 && p.z < g.z0 + g.nz * SEL;
	if (dari.lantai === 0 && ke.lantai === 0 && !(diGrid(dari) && diGrid(ke))) return tabrak(ke.x, ke.z, 0) ? null : [{ x: ke.x, z: ke.z }];
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

// ---------- peti hadiah ----------
// Peti berisi koin di sudut ruang-ruang kantor dan beberapa titik di luar. Posisinya dicari
// otomatis: sudut ruang pertama yang tidak menabrak perabot/dinding, menghadap ke tengah ruang.
// emas = isi lebih banyak.
const RUANG_PETI = ["kkd", "spked", "pangrango", "salak", "arsip", "kolam", "prolap", "keuangan", "pmd", "sekretariat", "pemdes", "kadis", "halimun", "dapur"];
const PETI_EMAS = new Set(["kadis", "salak", "luar-dermaga"]);
const PETI_LUAR = [
	{ id: "luar-depan", x: -12.8, z: 21.6 },
	{ id: "luar-samping", x: 18, z: 14.5 },
	{ id: "luar-belakang", x: 1.5, z: -19 },
	{ id: "luar-toko", x: 34.6, z: 44.2 },
	// hadiah menjelajah sampai ujung koridor Jl. Tegar Beriman
	{ id: "luar-mcd", x: 909, z: -970 },
	{ id: "luar-ccm", x: -1741, z: -605 },
	{ id: "luar-dermaga", x: 0, z: 0, dermaga: true },
];

function sudutBebas(rect, lantai) {
	const m = 0.85;
	const cx = (rect.x0 + rect.x1) / 2;
	const cz = (rect.z0 + rect.z1) / 2;
	const calon = [
		[rect.x0 + m, rect.z0 + m],
		[rect.x1 - m, rect.z0 + m],
		[rect.x0 + m, rect.z1 - m],
		[rect.x1 - m, rect.z1 - m],
		[cx, rect.z0 + m],
		[cx, rect.z1 - m],
		[rect.x0 + m, cz],
		[rect.x1 - m, cz],
	];
	const ok = calon.find(([x, z]) => !tabrak(x, z, lantai, 0.5));
	return ok && { x: ok[0], z: ok[1], rot: Math.atan2(cx - ok[0], cz - ok[1]) };
}

function titikBebasDekat(x, z) {
	for (let r = 0; r < 4; r += 0.5) {
		for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
			const px = x + Math.cos(a) * r;
			const pz = z + Math.sin(a) * r;
			if (!tabrak(px, pz, 0, 0.5)) return { x: px, z: pz };
			if (r === 0) break;
		}
	}
	return null;
}

export const PETI_HADIAH = (() => {
	const hasil = [];
	const area = [...RUANGAN, ...AREA_LAIN];
	for (const id of RUANG_PETI) {
		const a = area.find((r) => r.id === id);
		const t = a && sudutBebas(a.rect, a.lantai);
		if (t) hasil.push({ id, nama: a.nama, lantai: a.lantai, ...t, y: a.lantai * H, emas: PETI_EMAS.has(id) });
	}
	for (const l of PETI_LUAR) {
		let { x, z } = l;
		if (l.dermaga) ({ x, z } = keDuniaDermaga(DERMAGA[0], 2.2, 1.1));
		const t = l.dermaga ? { x, z } : titikBebasDekat(x, z);
		if (t) hasil.push({ id: l.id, nama: "Halaman", lantai: 0, x: t.x, z: t.z, rot: Math.atan2(-t.x, -t.z), y: tinggiTanah(t.x, t.z), emas: PETI_EMAS.has(l.id) });
	}
	return hasil;
})();
