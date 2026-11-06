import { useSyncExternalStore } from "react";
import { PETAK_KEBUN } from "./scene/kebunDesaData";
import { ambilKoleksi, bayarKoin, tambahKoin } from "./pancing";
import { nadaKombo, suara } from "./suaraPancing";
import { tenaga, ubahTenaga } from "./tenaga";
import { tambahTas } from "./belanja";
import { BEKAL_WARUNG } from "./toko";
import { hariIni, tambahXp } from "./progres";
import { pengaliBumdes, periksaPencapaian, pesananHariIni, selesaikanPesanan } from "./bangunWilayah";
import { catatRekor, infoGame, tambahXpGame } from "./rekorWilayah";
import { KOMODITAS, aturUsaha, peningkatanUsaha, usahaKini } from "./usahaWilayah";

export { KOMODITAS };

/*
 * Mesin usaha kecamatan (nama "kebun" dari game pertamanya, Bertani): keadaan
 * petak, cuaca, wadah, bawaan, benih, alat dari warung, dan pesanan pembeli.
 * Kata, gangguan, dan barangnya datang dari usahaWilayah.js.
 *
 * Tiap kecamatan punya kebun sendiri (petak, bawaan, pesanan, wadah). Tingkat,
 * alat, stok pupuk & benih, dan koin ikut pemain.
 *
 * Lingkar permainan: cangkul → tanam → rawat (siram, basmi ulat, usir burung
 * pipit) → panen (kualitas ★ dari perawatan, kombo bila beruntun) → jual ke
 * pengepul → belanja alat/benih/makanan di warung → kebun makin kuat.
 * Tanaman tumbuh nyata (detik–menit). Saat pemain pergi (maks 10 menit) yang
 * cukup terawat terus tumbuh, dan tidak ada yang layu atau terganggu.
 */

export const peningkatanKebun = () => peningkatanUsaha(usahaKini());

// Barang di Warung Bu Imas. jenis: makan (isi tenaga), habis (stok), alat (sekali beli, permanen)
export const BARANG_WARUNG = [
	...BEKAL_WARUNG.map((b) => ({ ...b, id: b.id.slice(5), jenis: "makan" })),
	{ id: "pupuk", jenis: "habis", nama: "Pupuk kompos (3 karung)", ikon: "🟫", harga: 15, isi: 3, teks: "Dipakai otomatis saat menanam: tumbuh 40% lebih cepat & kualitas naik." },
	{ id: "gembor", jenis: "alat", nama: "Gembor jumbo", ikon: "🪣", harga: 60, teks: "Muat 6 siraman lebih banyak." },
	{ id: "caping", jenis: "alat", nama: "Caping anyaman", ikon: "👒", harga: 35, teks: "Tidak cepat lelah di bawah terik: tenaga 35% lebih awet." },
	{ id: "orangan", jenis: "alat", nama: "Orang-orangan sawah", ikon: "🧍", harga: 70, teks: "Burung pipit 70% lebih jarang datang." },
	{ id: "cangkul", jenis: "alat", nama: "Cangkul baja", ikon: "⛏️", harga: 90, teks: "Semua pekerjaan 35% lebih cepat." },
	{ id: "penyiram", jenis: "alat", nama: "Penyiram bambu otomatis", ikon: "💦", harga: 160, teks: "Menyemprot semua petak tiap 30 detik." },
	{ id: "asisten", jenis: "alat", nama: "Asisten BUMDes", ikon: "🧑‍🔧", harga: 300, teks: "Merawat semua tempat usaha dan mengatasi gangguan, jadi tidak ada yang mati walau Anda sibuk." },
];
export const BARANG_PER_ID = Object.fromEntries(BARANG_WARUNG.map((b) => [b.id, b]));
/** Barang warung dengan nama & keterangan sesuai usaha kecamatan ini. */
export const barangUsaha = (b) => ({ ...b, ...usahaKini().barang[b.id] });

/** Benih komoditas lain (selain komoditas kecamatan yang gratis), sebungkus 4. */
export const hargaBenih = (kom) => Math.round(KOMODITAS[kom].harga * KOMODITAS[kom].hasil * 1.5);

export const LAMA_AKSI = { cangkul: 0.6, tanam: 0.5, siram: 0.6, usir: 0.45, panen: 0.5, timba: 0.8, bersih: 0.6, gali: 0.7 };
const TENAGA_AKSI = { cangkul: 1.25, bersih: 1.25, tanam: 0.3, siram: 0.5, usir: 0.3, panen: 0.5, timba: 0.75, gali: 0.75 };

const KUNCI = "jelajah:kebun:v2";
const KUNCI_LAMA = "jelajah:kebun:v1";
const petakBaru = () => ({ tahap: "liar", tumbuh: 0, air: 0, hama: false, burung: false, emas: false, kering: 0, mutu: 1, pupuk: false, subur: false, k: null, dalam: 0, urat: 0 });

function pesananBaru(komoditas) {
	const k = KOMODITAS[komoditas] || KOMODITAS.padi;
	const jumlah = k.hasil * (3 + Math.floor(Math.random() * 3));
	return { komoditas, jumlah, bonus: Math.round(jumlah * k.harga * 0.8) + 20 };
}

function bacaSimpan() {
	const baca = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
	const baru = baca(KUNCI);
	if (baru) return baru;
	// simpanan lama: satu kebun untuk semua kecamatan, jadi milik kecamatan terakhir
	const lama = baca(KUNCI_LAMA);
	if (!lama) return { umum: {}, per: {} };
	const { kecamatan, komoditas, petak, gembor, bawa, pesanan, panenTotal, waktu, ...umum } = lama;
	return { umum, per: kecamatan ? { [kecamatan]: { komoditas, petak, gembor, bawa, pesanan, panenTotal, waktu } } : {} };
}

const awal = bacaSimpan();
const perKecamatan = awal.per || {};
const umumAwal = awal.umum || {};
export const kebun = {
	kecamatan: "Jasinga",
	komoditas: "padi",
	petak: PETAK_KEBUN.map(() => petakBaru()),
	gembor: 8,
	bawa: {},
	pesanan: null,
	benih: umumAwal.benih || {}, // benih komoditas lain yang dibeli { kom: n }
	pilih: null, // benih yang sedang dipegang (null = komoditas kecamatan)
	pupuk: umumAwal.pupuk || 0,
	alat: umumAwal.alat || [], // id alat warung yang sudah dimiliki
	obrol: umumAwal.obrol || {}, // { idWarga: "2026-11-03" } hadiah harian warga
	panenTotal: 0,
	animasi: null, // { jenis, petak, mulai, sampai }
	kombo: { n: 0, sampai: 0, skor: 0, demam: 0 },
	cuaca: { jenis: "cerah", sisa: 70 + Math.random() * 40, hujan: 0, pelangi: 0 },
	semprot: 0, // performance.now() sampai penyiram berhenti menyemprot
	jedaSemprot: 30,
	jedaAsisten: 0,
	efek: [], // teks melayang { id, x, y, z, teks, warna, besar, mulai }
	terbang: [], // kawanan pipit yang kabur { x, z, mulai }
	sembur: [], // ledakan butir saat panen { x, z, warna, n }
	getar: 0, // getaran kamera 0..1
	pengaliHarga: 1, // tengkulak kota: harga x2 selama acara
	terakhirTumbuh: Date.now(), // terakhir pemain benar-benar berada di kebun ini
	kabarMasuk: null, // kabar hasil selama ditinggal, ditampilkan saat dunia terpasang
};

export const punyaAlat = (id) => kebun.alat.includes(id);

// --- catatan kejadian (untuk misi & acara desa di wilayah/desaHidup.js) ---
export const pendengarCatat = new Set();
export function catat(jenis, data = {}) {
	pendengarCatat.forEach((f) => f(jenis, data));
}
// tingkat dibaca dari penyimpanan sekali, lalu disegarkan setiap kali menjual
let tingkatTersimpan = null;
export const tingkatKebun = () => (tingkatTersimpan ??= infoGame(usahaKini().id, kebun.kecamatan).tingkat);
export const jumlahPetakAktif = () => (tingkatKebun() >= 4 ? 16 : 12);
export const kapasitasGembor = () => (tingkatKebun() >= 2 ? 12 : 8) + (punyaAlat("gembor") ? 6 : 0);
export const lajuKerja = () => (punyaAlat("cangkul") ? 0.65 : 1);
export const benihDipegang = () => (kebun.pilih && kebun.benih[kebun.pilih] > 0 ? kebun.pilih : kebun.komoditas);
/** Nilai jual; ikut acara borongan & bonus pelanggan tetap (tingkat 7). */
export const hargaJual = (kom, n) => Math.round(n * KOMODITAS[kom].harga * kebun.pengaliHarga * (tingkatKebun() >= 7 ? 1.15 : 1) * pengaliBumdes(kebun.kecamatan));
export const bintangMutu = (m) => (m >= 0.8 ? 3 : m >= 0.5 ? 2 : 1);

// --- langganan: UI diberi tahu paling sering 6x sedetik ---
let versi = 0;
const pendengar = new Set();
let jadwal = null;
function beriTahu(segera = false) {
	if (segera) { versi++; pendengar.forEach((f) => f()); return; }
	if (jadwal) return;
	jadwal = setTimeout(() => { jadwal = null; versi++; pendengar.forEach((f) => f()); }, 160);
}
export const useKebun = () => useSyncExternalStore((f) => (pendengar.add(f), () => pendengar.delete(f)), () => versi);

let kotor = false;
let adaKebun = false; // baru ada kebun aktif setelah pemain masuk ke sebuah kecamatan
function catatKebunIni() {
	if (!adaKebun) return;
	perKecamatan[kebun.kecamatan] = {
		komoditas: kebun.komoditas, petak: kebun.petak, gembor: kebun.gembor, bawa: kebun.bawa,
		pesanan: kebun.pesanan, panenTotal: kebun.panenTotal, waktu: kebun.terakhirTumbuh,
	};
}
function simpan() {
	kotor = false;
	catatKebunIni();
	try {
		localStorage.setItem(KUNCI, JSON.stringify({
			umum: { benih: kebun.benih, pupuk: kebun.pupuk, alat: kebun.alat, obrol: kebun.obrol },
			per: perKecamatan,
		}));
	} catch { /* mode privat */ }
}
setInterval(() => kotor && simpan(), 3000);
const tandai = (segera = true) => { kotor = true; beriTahu(segera); };

// --- teks melayang di atas petak / pemain ---
let idEfek = 0;
export function efekTeks(x, z, teks, warna = "#fde047", besar = 1, y = 2.2) {
	kebun.efek.push({ id: ++idEfek, x, y, z, teks, warna, besar, mulai: performance.now() });
	if (kebun.efek.length > 14) kebun.efek.shift();
	beriTahu(true);
}
export function bersihkanEfek(kini = performance.now()) {
	const n = kebun.efek.length;
	kebun.efek = kebun.efek.filter((e) => kini - e.mulai < 1700);
	if (kebun.efek.length !== n) beriTahu();
}

// --- cuaca: cerah ↔ mendung → hujan (menyiram semua petak) → pelangi ---
function majukanCuaca(dt) {
	const c = kebun.cuaca;
	if (usahaKini().hujan.dalam) {
		Object.assign(c, { jenis: "cerah", hujan: 0 });
		return;
	}
	c.sisa -= dt;
	const target = c.jenis === "hujan" ? 1 : 0;
	c.hujan += (target - c.hujan) * Math.min(1, dt * 0.35);
	if (c.pelangi > 0) c.pelangi = Math.max(0, c.pelangi - dt);
	if (c.sisa > 0) return;
	if (c.jenis === "cerah") {
		Object.assign(c, { jenis: "mendung", sisa: 12 });
		ubahTenaga(0, { teks: "☁️ Langit mendung… sebentar lagi hujan", jenis: "info" });
	} else if (c.jenis === "mendung") {
		Object.assign(c, { jenis: "hujan", sisa: 28 + Math.random() * 18 });
		ubahTenaga(0, { teks: usahaKini().hujan.teks, jenis: "info" });
		suara("guntur");
	} else {
		Object.assign(c, { jenis: "cerah", sisa: 100 + Math.random() * 70, pelangi: 24 });
		ubahTenaga(0, { teks: "🌈 Hujan reda, ada pelangi!", jenis: "baik" });
	}
	beriTahu(true);
}

const lajuTumbuh = (t) => (t >= 3 ? 1.25 : 1);
function jadiSiap(p, t) {
	p.tahap = "siap";
	p.hama = false;
	p.emas = Math.random() < (t >= 5 ? 0.14 : 0.07) + (p.pupuk ? 0.04 : 0);
}

/** Pertumbuhan & gangguan; dipanggil tiap frame dari adegan kebun. */
export function tumbuhkan(dt) {
	kebun.terakhirTumbuh = Date.now();
	majukanCuaca(dt);
	const t = tingkatKebun();
	const hujan = kebun.cuaca.hujan > 0.4;
	const u = usahaKini();
	const h = u.hujan;
	const tahan = u.tahan || { laju: 1, batas: 40 };
	const laju = lajuTumbuh(t) * (hujan ? h.laju : 1);
	const kering = (1 / 50) * (t >= 6 ? 0.6 : 1) * tahan.laju;
	const pipit = (punyaAlat("orangan") ? 0.3 : 1) * 0.012 * (hujan ? h.gangguan2 : 1);
	let ubah = false;

	// penyiram otomatis
	if (punyaAlat("penyiram") && (kebun.jedaSemprot -= dt) <= 0) {
		kebun.jedaSemprot = 30;
		kebun.semprot = performance.now() + 2600;
		for (const p of kebun.petak) if (p.tahap === "tanam") { p.air = Math.min(1, p.air + 0.5); p.kering = 0; }
		suara("cebur");
		ubah = true;
	}

	// asisten: jedanya di bawah batas lapar, jadi yang dirawatnya tidak pernah sampai mati
	if (punyaAlat("asisten") && (kebun.jedaAsisten -= dt) <= 0) {
		kebun.jedaAsisten = 15;
		kebun.petak.forEach((p, i) => {
			const rawat = p.tahap === "tanam" && p.air < 0.6;
			if (!rawat && !p.hama && !p.burung) return;
			if (p.tahap === "tanam") Object.assign(p, { air: 1, kering: 0 });
			Object.assign(p, { hama: false, burung: false });
			efekTeks(PETAK_KEBUN[i].x, PETAK_KEBUN[i].z, "🧑‍🔧 Dirawat", "#86efac", 0.8, 2);
			ubah = true;
		});
	}

	for (const p of kebun.petak) {
		if (p.tahap === "siap") {
			// burung pipit juga menyerbu tanaman yang siap panen
			if (!p.burung && Math.random() < dt * pipit) { p.burung = true; ubah = true; }
			if (p.burung) p.mutu = Math.max(0, p.mutu - dt / 22);
			continue;
		}
		if (p.tahap !== "tanam") continue;
		const k = KOMODITAS[p.k] || KOMODITAS[kebun.komoditas];
		if (hujan && h.isi) p.air = Math.min(1, p.air + dt * h.isi);
		else if (!(hujan && h.hemat)) p.air = Math.max(0, p.air - dt * kering);
		if (p.tumbuh < 0.55) {
			if (!p.hama && Math.random() < dt * 0.005) { p.hama = true; ubah = true; }
		} else if (!p.burung && Math.random() < dt * pipit) { p.burung = true; ubah = true; }
		if (p.hama) p.mutu = Math.max(0, p.mutu - dt / 70);
		if (p.burung) { p.mutu = Math.max(0, p.mutu - dt / 35); p.tumbuh = Math.max(0.5, p.tumbuh - dt * 0.004); }
		if (p.air > 0.05) {
			p.kering = 0;
			const lama = p.tumbuh;
			const cepat = laju * (p.pupuk ? 1.4 : 1) * (p.hama ? 0.3 : 1);
			p.tumbuh = Math.min(1, p.tumbuh + (dt / k.tumbuh) * cepat);
			if (p.tumbuh >= 1) {
				jadiSiap(p, t);
				ubah = true;
			} else if (Math.floor(lama * 20) !== Math.floor(p.tumbuh * 20)) ubah = true;
		} else {
			p.mutu = Math.max(0, p.mutu - dt / 45);
			if ((p.kering += dt) > tahan.batas) {
				p.tahap = "layu";
				p.hama = false;
				p.burung = false;
				ubah = true;
			}
		}
	}
	if (ubah) tandai(false);
}

/**
 * Waktu tanpa pemain (pergi atau tidur): yang masih berair terus tumbuh, yang
 * kering hanya berhenti. Tidak ada yang layu atau terganggu, jadi meninggalkan
 * kebun tidak dihukum. Mengembalikan jumlah yang menjadi siap.
 */
export function tumbuhSaatPergi(detik) {
	const t = tingkatKebun();
	let siap = 0;
	for (const p of kebun.petak) {
		p.burung = false;
		if (p.tahap !== "tanam" || p.air <= 0.05) continue;
		const k = KOMODITAS[p.k] || KOMODITAS[kebun.komoditas];
		p.tumbuh = Math.min(1, p.tumbuh + (detik / k.tumbuh) * lajuTumbuh(t) * (p.pupuk ? 1.4 : 1) * (p.hama ? 0.3 : 1));
		if (p.tumbuh >= 1) { jadiSiap(p, t); siap += 1; }
	}
	tandai(false);
	return siap;
}

// --- Gali Dalam (Tambang): tiap galian menaikkan hasil sekaligus risiko runtuh ---
export const risikoGali = (p) => Math.min(0.85, (0.06 + 0.1 * (p.dalam || 0)) * (p.pupuk ? 0.75 : 1) * (demamAktif() ? 0.5 : 1));
export const pengaliGali = (p) => 1.45 ** (p.dalam || 0) * 1.5 ** (p.urat || 0);
const FAKTOR_MUTU = [1, 1.35, 1.8];
/** Perkiraan hasil bila diangkut sekarang, tanpa bonus kombo. */
export function perkiraanAngkut(p) {
	const k = KOMODITAS[p.k] || KOMODITAS[kebun.komoditas];
	return Math.max(1, Math.round(k.hasil * FAKTOR_MUTU[bintangMutu(p.mutu) - 1] * (p.emas ? 2.5 : 1) * pengaliGali(p)));
}

/** Aksi berikutnya untuk sebuah petak (untuk label tombol & HUD). */
export function aksiPetak(i) {
	const p = kebun.petak[i];
	if (!p) return null;
	const k = KOMODITAS[p.k] || KOMODITAS[kebun.komoditas];
	const u = usahaKini();
	const nama = k.nama.toLowerCase();
	switch (p.tahap) {
		case "liar": return { jenis: "cangkul", label: u.siapkan.label, tombol: u.siapkan.tombol };
		case "layu": return { jenis: "bersih", label: u.bersihkan.label, tombol: u.bersihkan.tombol };
		case "gembur": {
			const b = KOMODITAS[benihDipegang()];
			return { jenis: "tanam", label: `${u.isi.label(b.nama.toLowerCase())}${kebun.pupuk > 0 ? ` + ${u.pupuk.nama}` : ""}${p.subur ? " 🌱" : ""}`, tombol: u.isi.tombol };
		}
		case "tanam":
			if (p.burung) return { jenis: "usir", label: u.ganggu2.label, tombol: u.ganggu2.tombol, darurat: true };
			if (p.hama) return { jenis: "usir", label: u.ganggu1.label, tombol: u.ganggu1.tombol, darurat: true };
			if (p.air < 0.55) return kebun.gembor > 0
				? { jenis: "siram", label: u.rawat.label(nama, kebun.gembor), tombol: u.rawat.tombol }
				: { jenis: null, label: u.rawat.habis, tombol: null };
			return { jenis: null, label: `${k.nama} ${u.tumbuh} ${Math.round(p.tumbuh * 100)}% · ${"★".repeat(bintangMutu(p.mutu))}`, tombol: null };
		case "siap":
			if (p.burung) return { jenis: "usir", label: u.ganggu2.labelSiap, tombol: u.ganggu2.tombol, darurat: true };
				if (u.gali) return { jenis: "gali", label: `Gali lebih dalam · risiko ${Math.round(risikoGali(p) * 100)}%`, tombol: "Gali" };
			return { jenis: "panen", label: `${u.panen.label(nama)} ${"★".repeat(bintangMutu(p.mutu))}${p.emas ? " ✨ unggul" : ""}`, tombol: u.panen.tombol };
		default: return null;
	}
}

const sedangAksi = () => kebun.animasi && performance.now() < kebun.animasi.sampai;

/** Mulai aksi pada petak; perubahan keadaan terjadi di tengah animasi. */
export function mulaiAksiPetak(i, paksa = null) {
	if (sedangAksi()) return false;
	const a = paksa === "panen" ? (kebun.petak[i]?.tahap === "siap" && !kebun.petak[i].burung ? { jenis: "panen" } : null) : aksiPetak(i);
	if (!a?.jenis) return false;
	const lama = LAMA_AKSI[a.jenis] * 1000 * lajuKerja() * (demamAktif() ? 0.5 : 1);
	const kini = performance.now();
	kebun.animasi = { jenis: a.jenis, petak: i, mulai: kini, sampai: kini + lama };
	setTimeout(() => terapkan(i, a.jenis), lama * 0.6);
	setTimeout(() => beriTahu(true), lama + 30); // alat di tangan dilepas
	beriTahu(true);
	return true;
}

// Kombo: tiap panen memperpanjang waktu; kombo ke-5 menyalakan Demam.
export const JEDA_KOMBO = 4500;
export const LAMA_DEMAM = 9000;
export const KOMBO_DEMAM = 5;
export const demamAktif = () => performance.now() < kebun.kombo.demam;

/** Hadiah acak saat panen: makin panjang kombo makin sering; hasil unggul selalu dapat. */
function gulirRezeki(p, pk, n8) {
	if (!p.emas && Math.random() > 0.05 + n8 * 0.015) return;
	const r = Math.random();
	const tingkat = r < 0.06 ? 2 : r < 0.3 ? 1 : 0;
	const koin = tingkat === 2 ? 200 : Math.round(tingkat ? 45 + Math.random() * 40 : 15 + Math.random() * 15);
	tambahKoin(koin);
	if (tingkat >= 1) kebun.pupuk += 1;
	if (tingkat === 2) ubahTenaga(100);
	const teks = usahaKini().rezeki[tingkat];
	efekTeks(pk.x, pk.z, `${["🍀", "✨", "👑"][tingkat]} +${koin} 🪙`, ["#fde047", "#c4b5fd", "#fbbf24"][tingkat], 1.2 + tingkat * 0.35, 3.3);
	suara("koin");
	catat("rezeki", { tingkat, koin, teks });
}

function panenPetak(i) {
	const p = kebun.petak[i];
	const pk = PETAK_KEBUN[i];
	const k = KOMODITAS[p.k] || KOMODITAS[kebun.komoditas];
	const bintang = bintangMutu(p.mutu);
	const kini = performance.now();
	const kb = kebun.kombo;
	const lanjut = kini < kb.sampai || demamAktif();
	kb.n = lanjut ? kb.n + 1 : 1;
	kb.sampai = kini + JEDA_KOMBO;
	if (kb.n >= KOMBO_DEMAM) {
		if (demamAktif()) kb.demam = Math.min(kini + LAMA_DEMAM, kb.demam + 900);
		else { kb.demam = kini + LAMA_DEMAM; suara("jaya"); catat("demam"); }
	}
	const demam = demamAktif();
	const n8 = Math.min(8, kb.n);
	// skor panen beruntun: rekor kecamatan; harga tidak ikut, jadi adil antar komoditas
	kb.skor = (lanjut ? kb.skor : 0) + bintang * n8 * (demam ? 2 : 1) * (p.emas ? 1.5 : 1) * (1 + (p.dalam || 0) * 0.5);
	const { bintangBaru } = catatRekor(usahaKini().id, kebun.kecamatan, Math.round(kb.skor));
	if (bintangBaru) {
		ubahTenaga(0, { teks: `⭐ ${"★".repeat(bintangBaru)} untuk Kec. ${kebun.kecamatan}!`, jenis: "baik" });
		periksaPencapaian();
	}
	const n = Math.max(1, Math.round(k.hasil * FAKTOR_MUTU[bintang - 1] * (p.emas ? 2.5 : 1) * (1 + 0.15 * (n8 - 1)) * (demam ? 1.25 : 1) * pengaliGali(p)));
	kebun.bawa[p.k] = (kebun.bawa[p.k] || 0) + n;
	kebun.panenTotal += 1;
	efekTeks(pk.x, pk.z, `+${n} ${k.ikon}`, p.emas ? "#fde047" : "#ffffff", (p.emas ? 1.5 : 1.15) + n8 * 0.05);
	efekTeks(pk.x, pk.z, "★".repeat(bintang) + "☆".repeat(3 - bintang), "#facc15", 0.9, 1.6);
	nadaKombo(kb.n);
	if (p.emas) suara("jaya");
	kebun.getar = Math.min(1, 0.15 + n8 * 0.07 + (p.emas ? 0.3 : 0));
	kebun.sembur.push({ x: pk.x, z: pk.z, warna: k.buah || k.warna || "#fde047", n: 10 + n8 * 3 });
	tambahXp(2 + bintang);
	catat("panen", { bintang, kombo: kb.n, emas: p.emas, n, kom: p.k });
	if ((p.dalam || 0) >= 3) { efekTeks(pk.x, pk.z, `⛏️ Berani! x${pengaliGali(p).toFixed(1)}`, "#fbbf24", 1.4, 3.6); suara("jaya"); }
	gulirRezeki(p, pk, n8);
	if (k.ulang) Object.assign(p, { tahap: "tanam", tumbuh: 0.55, emas: false, burung: false, hama: false, mutu: 1, air: Math.min(p.air, 0.6), dalam: 0, urat: 0 });
	else Object.assign(p, petakBaru(), { tahap: "gembur" });
}

/** Satu ayunan Gali Dalam: runtuh (hasil galian & kombo hilang) atau makin dalam. */
function galiPetak(i) {
	const p = kebun.petak[i];
	const pk = PETAK_KEBUN[i];
	if (p.tahap !== "siap") return;
	if (Math.random() < risikoGali(p)) {
		const hilang = perkiraanAngkut(p);
		const k = KOMODITAS[p.k] || KOMODITAS[kebun.komoditas];
		Object.assign(p, petakBaru(), { tahap: "layu", k: p.k });
		Object.assign(kebun.kombo, { n: 0, sampai: 0, skor: 0, demam: 0 });
		kebun.getar = 1;
		efekTeks(pk.x, pk.z, "💥 RUNTUH!", "#ef4444", 1.7, 2.6);
		ubahTenaga(-12, { teks: `💥 Galian runtuh! ${hilang} ${k.satuan} hilang`, jenis: "buruk" });
		suara("guntur");
		catat("runtuh");
		return;
	}
	p.dalam = (p.dalam || 0) + 1;
	kebun.getar = Math.min(1, 0.2 + p.dalam * 0.08);
	suara("hentak");
	if (Math.random() < 0.12) {
		p.urat = (p.urat || 0) + 1;
		efekTeks(pk.x, pk.z, "✨ Urat kaya! Hasil x1.5", "#fde047", 1.4, 3);
		suara("jaya");
	} else {
		efekTeks(pk.x, pk.z, `Kedalaman ${p.dalam} · x${pengaliGali(p).toFixed(1)}`, "#fbbf24", 1.1, 2.6);
	}
	tambahXp(1);
	catat("gali", { dalam: p.dalam });
}

/** Panen seketika saat pemain menerjang petak selama Demam. */
export function panenKilat(i) {
	const p = kebun.petak[i];
	if (!p || p.tahap !== "siap" || p.burung) return false;
	ubahTenaga(-TENAGA_AKSI.panen * 0.5);
	panenPetak(i);
	tandai();
	return true;
}

function terapkan(i, jenis) {
	const p = kebun.petak[i];
	const pk = PETAK_KEBUN[i];
	ubahTenaga(-(TENAGA_AKSI[jenis] || 0) * (punyaAlat("caping") ? 0.7 : 1) * (tingkatKebun() >= 8 ? 0.7 : 1));
	if (jenis === "cangkul" || jenis === "bersih") {
		// sesekali beruntung: mutu berikutnya naik
		const subur = Math.random() < 0.18;
		Object.assign(p, petakBaru(), { tahap: "gembur", subur });
		suara("hentak");
		if (subur) { efekTeks(pk.x, pk.z, "Beruntung! Mutu naik 🌱", "#86efac", 1, 2.1); suara("dapat"); }
		tambahXp(1);
		catat("cangkul");
	} else if (jenis === "tanam") {
		const kom = benihDipegang();
		if (kom !== kebun.komoditas) {
			kebun.benih[kom] -= 1;
			if (kebun.benih[kom] <= 0) { delete kebun.benih[kom]; kebun.pilih = null; }
		}
		const pupuk = kebun.pupuk > 0;
		if (pupuk) kebun.pupuk -= 1;
		const subur = p.subur;
		Object.assign(p, petakBaru(), { tahap: "tanam", air: 0.2, k: kom, mutu: 1 + (pupuk ? 0.15 : 0) + (subur ? 0.15 : 0), pupuk });
		suara("klik");
		catat("tanam", { kom });
		if (subur) efekTeks(pk.x, pk.z, "Mutu naik 🌱", "#86efac", 0.85, 1.9);
		if (pupuk) efekTeks(pk.x, pk.z, `+ ${usahaKini().pupuk.nama} ${usahaKini().pupuk.ikon}`, "#d6a36a", 0.85, 1.4);
	} else if (jenis === "siram") {
		p.air = 1;
		p.kering = 0;
		kebun.gembor = Math.max(0, kebun.gembor - 1);
		suara("cebur");
		catat("siram");
	} else if (jenis === "usir") {
		usirDariPetak(i, false);
	} else if (jenis === "gali") {
		galiPetak(i);
	} else if (jenis === "panen") {
		panenPetak(i);
	}
	tandai();
}

/** Usir burung / basmi ulat di petak. `lari` = diusir dengan berlari menerjang. */
export function usirDariPetak(i, lari = true) {
	const p = kebun.petak[i];
	const pk = PETAK_KEBUN[i];
	if (!p || (!p.burung && !p.hama) || (lari && !p.burung)) return false;
	const burung = p.burung;
	if (burung) {
		p.burung = false;
		kebun.terbang.push({ x: pk.x, z: pk.z, mulai: performance.now() });
		if (kebun.terbang.length > 6) kebun.terbang.shift();
	}
	if (!lari) p.hama = false;
	suara(burung ? "colek" : "sentak");
	const u = usahaKini();
	efekTeks(pk.x, pk.z, burung ? (lari ? u.ganggu2.efekLari : u.ganggu2.efek) : u.ganggu1.efek, "#fca5a5", 0.9, 1.8);
	tambahXp(2);
	catat("usir", { burung, lari });
	tandai();
	return true;
}

export function timbaSumur() {
	if (sedangAksi()) return false;
	const kini = performance.now();
	const lama = LAMA_AKSI.timba * 1000 * lajuKerja();
	kebun.animasi = { jenis: "timba", petak: null, mulai: kini, sampai: kini + lama };
	setTimeout(() => {
		kebun.gembor = kapasitasGembor();
		ubahTenaga(-TENAGA_AKSI.timba);
		suara("cebur");
		catat("timba");
		const w = usahaKini().wadah;
		ubahTenaga(0, { teks: `${w.ikon} ${w.nama} terisi penuh (${kebun.gembor} ${w.isi})`, jenis: "info" });
		tandai();
	}, lama * 0.7);
	setTimeout(() => beriTahu(true), lama + 30);
	beriTahu(true);
	return true;
}

/** Jual semua bawaan ke pengepul. Mengembalikan ringkasan. */
export function jualKePengepul() {
	let koin = 0, bonus = 0;
	const rincian = [];
	for (const [kom, n] of Object.entries(kebun.bawa)) {
		if (!n) continue;
		const k = KOMODITAS[kom];
		if (!k) continue;
		if (kebun.pesanan?.komoditas === kom && n >= kebun.pesanan.jumlah) {
			bonus += kebun.pesanan.bonus;
			kebun.pesanan = null;
		}
		const h = hargaJual(kom, n);
		koin += h;
		rincian.push({ nama: k.nama, ikon: k.ikon, n, satuan: k.satuan, koin: h });
	}
	if (!koin) return null;
	const total = koin + bonus;
	tambahKoin(total);
	tambahXp(Math.round(total / 6));
	const sebelum = tingkatKebun();
	tambahXpGame(usahaKini().id, total);
	tingkatTersimpan = null;
	const sesudah = tingkatKebun();
	kebun.bawa = {};
	if (!kebun.pesanan) kebun.pesanan = pesananBaru(kebun.komoditas);
	suara("koin");
	if (sesudah > sebelum) kebun.gembor = kapasitasGembor();
	catat("jual", { total, pesanan: bonus > 0, naik: sesudah > sebelum ? sesudah : null });
	tandai();
	return { rincian, koin, bonus, total, naik: sesudah > sebelum ? sesudah : null, terbuka: peningkatanKebun().filter((p) => p.tingkat > sebelum && p.tingkat <= sesudah) };
}

/** Kirim pesanan kabupaten dari bawaan; mengembalikan true bila terkirim. */
export function kirimPesananKab(id) {
	const p = pesananHariIni().find((x) => x.id === id && !x.selesai);
	if (!p || (kebun.bawa[p.kom] || 0) < p.jumlah) return false;
	kebun.bawa[p.kom] -= p.jumlah;
	if (!kebun.bawa[p.kom]) delete kebun.bawa[p.kom];
	selesaikanPesanan(id);
	// nilainya ikut menaikkan tingkat usaha dan misi penjualan
	tambahXpGame(usahaKini().id, p.koin);
	tingkatTersimpan = null;
	catat("jual", { total: p.koin, pesanan: false, naik: null });
	tandai();
	return true;
}

/** Beli barang warung. Mengembalikan { ok, pesan }. */
export function beliDiWarung(id, bawa = false) {
	if (!BARANG_PER_ID[id]) return { ok: false, pesan: "Barang tidak ada" };
	const b = barangUsaha(BARANG_PER_ID[id]);
	if (b.jenis === "alat" && punyaAlat(id)) return { ok: false, pesan: "Sudah punya" };
	if (b.jenis === "makan" && !bawa && tenaga.nilai >= 99) return { ok: false, pesan: "Masih kenyang, tenaga penuh" };
	if (!bayarKoin(b.harga)) return { ok: false, pesan: `Koin kurang (perlu 🪙 ${b.harga})` };
	if (bawa) {
		tambahTas(`desa-${id}`);
		suara("klik");
		return { ok: true, pesan: `${b.ikon} ${b.nama} masuk tas 🎒` };
	}
	if (b.jenis === "makan") {
		ubahTenaga(b.tenaga, { teks: `${b.ikon} Nikmat! Tenaga +${b.tenaga}`, jenis: "baik" });
		suara("dapat");
	} else if (b.jenis === "habis") {
		kebun.pupuk += b.isi;
		suara("klik");
	} else {
		kebun.alat = [...kebun.alat, id];
		if (id === "gembor") kebun.gembor = kapasitasGembor();
		suara("jaya");
	}
	catat("beli", { id });
	tandai();
	return { ok: true, pesan: `${b.ikon} ${b.nama} dibeli` };
}

export function beliBenih(kom) {
	if (!KOMODITAS[kom] || kom === kebun.komoditas) return { ok: false, pesan: "Benih ini gratis" };
	const h = hargaBenih(kom);
	if (!bayarKoin(h)) return { ok: false, pesan: `Koin kurang (perlu 🪙 ${h})` };
	kebun.benih[kom] = (kebun.benih[kom] || 0) + 4;
	kebun.pilih = kom;
	suara("klik");
	catat("beli", { id: "benih" });
	tandai();
	return { ok: true, pesan: `${KOMODITAS[kom].ikon} 4 ${usahaKini().isi.bibit} ${KOMODITAS[kom].nama.toLowerCase()} dibeli` };
}

/** Pilih benih yang dipegang (null = komoditas kecamatan). */
export function pilihBenih(kom) {
	kebun.pilih = kom && kom !== kebun.komoditas && kebun.benih[kom] > 0 ? kom : null;
	suara("klik");
	tandai();
}
export const daftarBenih = () => [kebun.komoditas, ...Object.keys(kebun.benih).filter((k) => kebun.benih[k] > 0 && k !== kebun.komoditas && KOMODITAS[k]?.game === usahaKini().id)];
/** Komoditas lain sejenis usaha ini yang benihnya bisa dibeli. */
export const benihDijual = () => Object.keys(KOMODITAS).filter((k) => k !== kebun.komoditas && KOMODITAS[k].game === usahaKini().id);

/** Hadiah harian dari warga (sekali sehari per warga). */
export function hadiahWarga(id, hadiah) {
	const hari = hariIni();
	if (kebun.obrol[id] === hari) return null;
	kebun.obrol = { ...kebun.obrol, [id]: hari };
	// benih hadiah hanya berguna di usaha sejenis; di usaha lain diganti stok pupuk
	if (hadiah.benih && KOMODITAS[hadiah.benih]?.game !== usahaKini().id) hadiah = { pupuk: 1 };
	if (hadiah.pupuk) kebun.pupuk += hadiah.pupuk;
	if (hadiah.benih) kebun.benih[hadiah.benih] = (kebun.benih[hadiah.benih] || 0) + 4;
	if (hadiah.koin) tambahKoin(hadiah.koin);
	if (hadiah.tenaga) ubahTenaga(hadiah.tenaga);
	suara("jaya");
	tandai();
	return hadiah;
}

/** Masuk ke kebun milik kecamatan ini; kebun kecamatan sebelumnya disimpan dulu. */
export function aturKebun({ kecamatan, komoditas, game }) {
	catatKebunIni();
	aturUsaha(game);
	tingkatTersimpan = null;
	const d = perKecamatan[kecamatan];
	adaKebun = true;
	kebun.kecamatan = kecamatan;
	kebun.komoditas = KOMODITAS[komoditas] ? komoditas : "padi";
	kebun.petak = PETAK_KEBUN.map((_, i) => ({ ...petakBaru(), ...(d?.petak?.[i] || {}) }));
	kebun.bawa = d?.bawa || {};
	kebun.pesanan = d?.pesanan?.komoditas && KOMODITAS[d.pesanan.komoditas] ? d.pesanan : pesananBaru(kebun.komoditas);
	kebun.panenTotal = d?.panenTotal || 0;
	kebun.gembor = Math.min(d?.gembor ?? 8, kapasitasGembor());
	kebun.pilih = null;
	kebun.animasi = null;
	kebun.kombo = { n: 0, sampai: 0, skor: 0, demam: 0 };
	kebun.efek = [];
	kebun.terbang = [];
	kebun.sembur = [];
	kebun.getar = 0;
	kebun.pengaliHarga = 1;
	const u = usahaKini();
	const siap = tumbuhSaatPergi(Math.min(600, Math.max(0, (Date.now() - (d?.waktu ?? Date.now())) / 1000)));
	if (siap) kebun.kabarMasuk = `Selama ditinggal, ${siap} ${u.unit} siap ${u.panen.kata.toLowerCase()}`;
	kebun.terakhirTumbuh = Date.now();
	tandai();
}

/** Keluar dari dunia kecamatan: keadaan kebun langsung disimpan. */
export function tinggalkanKebun() {
	simpan();
}

export const animasiKebun = () => (sedangAksi() ? kebun.animasi : null);
export const koinKini = () => ambilKoleksi().poin;
