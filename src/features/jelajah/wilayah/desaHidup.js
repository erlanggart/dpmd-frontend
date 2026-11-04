import { useSyncExternalStore } from "react";
import { efekTeks, jumlahPetakAktif, kebun, pendengarCatat, tumbuhSaatPergi } from "../kebun";
import { usahaKini } from "../usahaWilayah";
import { tambahKoin } from "../pancing";
import { suara } from "../suaraPancing";
import { setTenaga, ubahTenaga } from "../tenaga";
import { hariIni, tambahXp } from "../progres";
import { JALAN_NS, PETAK_KEBUN, SUMUR_KEBUN, TITIK_PENGEPUL, TITIK_WARUNG } from "../scene/kebunDesaData";
import { posWarga } from "./wargaDesa";
import { pemainWilayah } from "./uiWilayah";

/*
 * Desa yang hidup: jam siang–malam, acara desa acak (lomba panen, tengkulak
 * kota, serangan wereng, ayam lepas), misi cerita berantai dari Abah Karta lalu
 * misi harian, dan tidur di saung sampai pagi. Semua kejadian bertani masuk
 * lewat `catat()` di kebun.js.
 */

const KUNCI = "jelajah:desa:v1";
const baca = () => { try { return JSON.parse(localStorage.getItem(KUNCI)) || {}; } catch { return {}; } };
const awal = baca();

// ------------------------------------------------------------------ misi

/** misi cerita berantai (sekali jalan), lalu misi harian */
export const RANTAI = [
	{ jenis: "obrol", syarat: (d) => d.id === "karta", target: 1, teks: "Sapa Abah Karta di saung", hadiah: { koin: 10 } },
	{ jenis: "cangkul", target: 3, teks: (u) => `${u.siapkan.tombol} 3 ${u.unit}`, hadiah: { koin: 15, pupuk: 1 } },
	{ jenis: "tanam", target: 3, teks: (u) => `${u.isi.kata} di 3 ${u.unit}`, hadiah: { koin: 10 } },
	{ jenis: "timba", target: 1, teks: (u) => `${u.sumber.tombol} di ${u.sumber.tempat}`, hadiah: { koin: 8 } },
	{ jenis: "siram", target: 3, teks: (u) => `${u.rawat.kata} 3 kali`, hadiah: { koin: 15 } },
	{ jenis: "usir", target: 2, teks: () => "Atasi gangguan 2 kali", hadiah: { koin: 20 } },
	{ jenis: "panen", target: 3, teks: (u) => `${u.panen.kata} 3 ${u.unit}`, hadiah: { koin: 25 } },
	{ jenis: "jual", target: 1, teks: (u) => `Jual ${u.panen.hasil} ke Pak Sobari`, hadiah: { koin: 30 } },
	{ jenis: "beli", target: 1, teks: "Belanja di Warung Bu Imas", hadiah: { koin: 10, pupuk: 2 } },
	{ jenis: "demam", target: 1, teks: (u) => `Capai kombo x5: ${u.demam}`, hadiah: { koin: 35 } },
	{ jenis: "panen", syarat: (d) => d.bintang === 3, target: 4, teks: (u) => `${u.panen.kata} ★★★ sebanyak 4 kali`, hadiah: { koin: 45 } },
	{ jenis: "panen", syarat: (d) => d.kombo >= 3, target: 1, teks: () => "Capai kombo x3", hadiah: { koin: 50 } },
	{ jenis: "jual", syarat: (d) => d.pesanan, target: 1, teks: "Penuhi pesanan Pak Sobari", hadiah: { koin: 60 } },
	{ jenis: "acara", target: 1, teks: "Selesaikan satu acara desa", hadiah: { koin: 60 } },
	{ jenis: "lomba", target: 1, teks: (u) => `Menangkan ${u.lomba.judul} 🏆`, hadiah: { koin: 120 } },
];
const POOL_HARIAN = [
	{ id: "panen8", jenis: "panen", target: 8, teks: (u) => `${u.panen.kata} 8 ${u.unit}`, hadiah: { koin: 40 } },
	{ id: "siram10", jenis: "siram", target: 10, teks: (u) => `${u.rawat.kata} 10 kali`, hadiah: { koin: 30 } },
	{ id: "usir5", jenis: "usir", target: 5, teks: () => "Atasi gangguan 5 kali", hadiah: { koin: 35 } },
	{ id: "koin150", jenis: "jual", nilai: (d) => d.total, target: 150, teks: "Jual hasil senilai 🪙 150", hadiah: { koin: 45 } },
	{ id: "sempurna5", jenis: "demam", target: 2, teks: (u) => `Masuk ${u.demam} 2 kali`, hadiah: { koin: 40 } },
	{ id: "ayam3", jenis: "ayam", target: 3, teks: "Tangkap 3 ayam lepas", hadiah: { koin: 35 } },
	{ id: "bintang5", jenis: "panen", syarat: (d) => d.bintang === 3, target: 5, teks: (u) => `${u.panen.kata} ★★★ 5 kali`, hadiah: { koin: 50 } },
	{ id: "acara1", jenis: "acara", target: 1, teks: "Selesaikan 1 acara desa", hadiah: { koin: 50 } },
];
const HARIAN_PER_ID = Object.fromEntries(POOL_HARIAN.map((m) => [m.id, m]));

function harianBaru() {
	const pool = [...POOL_HARIAN].sort(() => Math.random() - 0.5).slice(0, 3);
	return { hari: hariIni(), daftar: pool.map((m) => ({ id: m.id, n: 0, selesai: false })) };
}

export const desa = {
	jam: 6.6, // 0..24, tiap kunjungan dimulai pagi
	acara: null, // { jenis, judul, ikon, mulai, sampai, n, target, petak, berhasil }
	jedaAcara: 55,
	ayam: [], // ayam lepas { x, z, tertangkap }
	misi: { i: 0, n: 0 }, // misi cerita usaha yang sedang dimainkan
	harian: awal.harian?.hari === hariIni() ? awal.harian : harianBaru(),
	piala: awal.piala || 0,
	selebrasi: null, // { judul, isi, id }
	tidur: 0, // performance.now() saat mulai tidur (layar gelap)
};

// tiap jenis usaha punya rantai misinya sendiri; simpanan lama milik bertani
const misiPerUsaha = awal.misiUsaha || (awal.misi ? { bertani: awal.misi } : {});

let versi = 0;
const pendengar = new Set();
let jadwal = null;
function beriTahu(segera = false) {
	if (segera) { versi++; pendengar.forEach((f) => f()); return; }
	if (jadwal) return;
	jadwal = setTimeout(() => { jadwal = null; versi++; pendengar.forEach((f) => f()); }, 250);
}
export const useDesa = () => useSyncExternalStore((f) => (pendengar.add(f), () => pendengar.delete(f)), () => versi);
function simpan() {
	misiPerUsaha[usahaKini().id] = desa.misi;
	try { localStorage.setItem(KUNCI, JSON.stringify({ misiUsaha: misiPerUsaha, harian: desa.harian, piala: desa.piala })); } catch { /* mode privat */ }
}

function beriHadiah(h) {
	if (h.koin) tambahKoin(h.koin);
	if (h.pupuk) kebun.pupuk += h.pupuk;
	tambahXp(Math.round((h.koin || 10) / 2));
}
const teksHadiah = (h) => { const p = usahaKini().pupuk; return [h.koin && `🪙 +${h.koin}`, h.pupuk && `${p.ikon} +${h.pupuk} ${p.nama}`].filter(Boolean).join(" · "); };

// Satu aksi bisa memicu beberapa perayaan (pencapaian, gelar, kunjungan): tampil
// bergiliran. Antrean dibatasi supaya rezeki beruntun saat Demam tidak menumpuk.
const antreanRayakan = [];
export function rayakan(judul, isi) {
	if (desa.selebrasi) {
		if (antreanRayakan.length < 3) antreanRayakan.push([judul, isi]);
		return;
	}
	desa.selebrasi = { judul, isi, id: performance.now() };
	suara("jaya");
	beriTahu(true);
	setTimeout(() => {
		desa.selebrasi = null;
		beriTahu(true);
		const berikut = antreanRayakan.shift();
		if (berikut) rayakan(...berikut);
	}, 3300);
}

const teksMisi = (m) => (typeof m.teks === "function" ? m.teks(usahaKini()) : m.teks);
const misiMentah = () => RANTAI[desa.misi.i] || null;
export const misiKini = () => { const m = misiMentah(); return m && { ...m, teks: teksMisi(m) }; };

function majukanMisi(jenis, d) {
	const m = misiMentah();
	if (m && m.jenis === jenis && (!m.syarat || m.syarat(d))) {
		desa.misi.n += 1;
		if (desa.misi.n >= m.target) {
			beriHadiah(m.hadiah);
			rayakan(`✅ Misi selesai: ${teksMisi(m)}`, teksHadiah(m.hadiah));
			desa.misi = { i: desa.misi.i + 1, n: 0 };
			if (!misiMentah()) setTimeout(() => rayakan("🎉 Semua misi cerita tamat!", "Abah Karta bangga. Misi harian menanti setiap hari."), 3500);
		}
		simpan();
		beriTahu(true);
	}
	if (desa.harian.hari !== hariIni()) desa.harian = harianBaru();
	for (const h of desa.harian.daftar) {
		const def = HARIAN_PER_ID[h.id];
		if (h.selesai || def.jenis !== jenis || (def.syarat && !def.syarat(d))) continue;
		h.n = Math.min(def.target, h.n + (def.nilai ? def.nilai(d) : 1));
		if (h.n >= def.target) {
			h.selesai = true;
			beriHadiah(def.hadiah);
			rayakan(`⭐ Misi harian selesai: ${teksMisi(def)}`, teksHadiah(def.hadiah));
		}
		simpan();
		beriTahu(true);
	}
}
export const harianKini = () => desa.harian.daftar.map((h) => ({ ...h, ...HARIAN_PER_ID[h.id], teks: teksMisi(HARIAN_PER_ID[h.id]) }));

// ------------------------------------------------------------------ acara desa

const acaraDari = (u) => ({
	lomba: { judul: u.lomba.judul, ikon: "🏆", lama: 170, teks: u.lomba.teks },
	tengkulak: { judul: u.borong.judul, ikon: u.borong.ikon, lama: 90, teks: u.borong.teks },
	wereng: { judul: u.wabah.judul, ikon: u.wabah.ikon, lama: 45, teks: u.wabah.teks },
	ayam: { judul: "Ayam Mak Asih lepas!", ikon: "🐔", lama: 90, teks: "Kejar & tangkap ayam (E) di sekitar kampung" },
});

function mulaiAcara() {
	const ditanam = kebun.petak.filter((p) => p.tahap === "tanam" || p.tahap === "siap").length;
	const muda = kebun.petak.map((p, i) => (p.tahap === "tanam" && !p.hama ? i : -1)).filter((i) => i >= 0);
	const calon = ["ayam", "tengkulak"];
	if (ditanam >= 4) calon.push("lomba", "lomba");
	if (muda.length >= 2) calon.push("wereng");
	const jenis = calon[Math.floor(Math.random() * calon.length)];
	const A = acaraDari(usahaKini())[jenis];
	const kini = performance.now();
	desa.acara = { jenis, ...A, mulai: kini, sampai: kini + A.lama * 1000, n: 0, target: jenis === "lomba" ? 6 : jenis === "ayam" ? 5 : 0, petak: [] };
	if (jenis === "tengkulak") kebun.pengaliHarga = 2;
	if (jenis === "wereng") {
		desa.acara.petak = muda.sort(() => Math.random() - 0.5).slice(0, Math.min(4, muda.length));
		desa.acara.petak.forEach((i) => { kebun.petak[i].hama = true; });
		desa.acara.target = desa.acara.petak.length;
	}
	if (jenis === "ayam") {
		desa.ayam = Array.from({ length: 5 }, () => ({ x: JALAN_NS.x - 14 + Math.random() * 28, z: -27 + Math.random() * 9, tertangkap: false, tx: 0, tz: 0, kabur: 0, tunggu: 0 }));
		desa.ayam.forEach((a) => { a.tx = a.x; a.tz = a.z; });
	}
	suara("guntur");
	ubahTenaga(0, { teks: `${A.ikon} ${A.judul}: ${A.teks}`, jenis: "info" });
	beriTahu(true);
}

function selesaiAcara(berhasil) {
	const a = desa.acara;
	if (!a) return;
	kebun.pengaliHarga = 1;
	if (a.jenis === "ayam") desa.ayam = [];
	if (berhasil) {
		const h = { lomba: { koin: 120 }, wereng: { koin: 45 }, ayam: { koin: 30 }, tengkulak: null }[a.jenis];
		if (h) beriHadiah(h);
		if (a.jenis === "lomba") desa.piala += 1;
		rayakan(a.jenis === "lomba" ? usahaKini().lomba.juara : `${a.ikon} ${a.judul}: berhasil!`, h ? teksHadiah(h) + (a.jenis === "lomba" ? " · piala +1" : "") : "Hasil penjualanmu berlipat");
		majukanMisi("acara", {});
		if (a.jenis === "lomba") majukanMisi("lomba", {});
	} else if (a.jenis !== "tengkulak") {
		ubahTenaga(0, { teks: `${a.ikon} ${a.judul}: waktu habis. Coba lagi lain kali!`, jenis: "buruk" });
	} else {
		ubahTenaga(0, { teks: usahaKini().borong.pulang, jenis: "info" });
		majukanMisi("acara", {});
	}
	desa.acara = null;
	desa.jedaAcara = 110 + Math.random() * 90;
	simpan();
	beriTahu(true);
}

/** Masuk dunia kecamatan: pagi hari, misi usaha ini, tanpa sisa acara kecamatan lain. */
export function masukDesa() {
	desa.jam = 6.6;
	desa.acara = null;
	desa.ayam = [];
	desa.tidur = 0;
	desa.jedaAcara = 55;
	kebun.pengaliHarga = 1;
	desa.misi = misiPerUsaha[usahaKini().id] || { i: 0, n: 0 };
	beriTahu(true);
}

/** tangkap ayam lepas ke-k */
export function tangkapAyam(k) {
	const a = desa.ayam[k];
	if (!a || a.tertangkap) return false;
	a.tertangkap = true;
	tambahKoin(8);
	suara("dapat");
	efekTeks(a.x, a.z, "Hap! 🐔 +8 🪙", "#fde047", 1.1, 1.4);
	majukanMisi("ayam", {});
	if (desa.acara?.jenis === "ayam") {
		desa.acara.n += 1;
		if (desa.acara.n >= desa.acara.target) selesaiAcara(true);
	}
	beriTahu(true);
	return true;
}

// kejadian bertani → misi & acara
pendengarCatat.add((jenis, d) => {
	majukanMisi(jenis, d);
	if (jenis === "rezeki" && d.tingkat >= 1) rayakan(d.tingkat === 2 ? "👑 REZEKI LEGENDA!" : "✨ REZEKI LANGKA!", `${d.teks} · 🪙 +${d.koin}`);
	const a = desa.acara;
	if (a?.jenis === "lomba" && jenis === "panen") {
		a.n += 1;
		efekTeks(pemainWilayah.x, pemainWilayah.z, `🏆 ${a.n}/${a.target}`, "#facc15", 1.1, 3.4);
		if (a.n >= a.target) selesaiAcara(true);
		beriTahu(true);
	}
});

// ------------------------------------------------------------------ jam & detak

export const malamDari = (j) => (j >= 19.2 || j < 4.8 ? 1 : j > 17.4 ? (j - 17.4) / 1.8 : j < 6.6 ? (6.6 - j) / 1.8 : 0);
export const malam = () => malamDari(desa.jam);
export const teksJam = (j = desa.jam) => `${String(Math.floor(j)).padStart(2, "0")}:${String(Math.floor((j % 1) * 60)).padStart(2, "0")}`;
export const namaWaktu = (j = desa.jam) => (j < 4.8 || j >= 19.2 ? "Malam" : j < 10 ? "Pagi" : j < 15 ? "Siang" : j < 18 ? "Sore" : "Senja");

let jamTampil = -1;
/** dipanggil tiap frame dari dunia desa */
export function detakDesa(dt) {
	// 1 jam = 20 detik di siang hari, malam berjalan 2x lebih cepat
	desa.jam = (desa.jam + (dt / 20) * (malam() > 0.5 ? 2 : 1)) % 24;
	const menit = Math.floor(desa.jam * 6);
	if (menit !== jamTampil) { jamTampil = menit; beriTahu(); }

	const a = desa.acara;
	if (a) {
		if (a.jenis === "wereng") {
			const n = a.petak.filter((i) => !kebun.petak[i].hama).length;
			if (n !== a.n) { a.n = n; beriTahu(true); }
		}
		if (a.jenis === "wereng" && a.n >= a.target) selesaiAcara(true);
		else if (performance.now() > a.sampai) selesaiAcara(a.jenis === "tengkulak");
	} else if (!desa.tidur && (desa.jedaAcara -= dt) <= 0) mulaiAcara();
}

/** tidur di saung: lewati malam (tanaman tetap tumbuh), tenaga penuh */
export function tidurSampaiPagi() {
	if (desa.tidur) return;
	desa.tidur = performance.now();
	suara("klik");
	beriTahu(true);
	setTimeout(() => {
		const lewat = ((6.2 - desa.jam + 24) % 24) * 10; // detik permainan yang dilewati (malam 2x cepat)
		tumbuhSaatPergi(Math.min(240, lewat));
		desa.jam = 6.2;
		setTenaga(100);
		ubahTenaga(0, { teks: "☀️ Selamat pagi! Tenaga penuh. Pekerjaan berjalan semalaman.", jenis: "baik" });
		desa.tidur = 0;
		beriTahu(true);
	}, 1800);
}
export const bolehTidur = () => malam() > 0.4 || desa.jam >= 18;

// ------------------------------------------------------------------ penanda tujuan

const terdekat = (daftar) => {
	let hasil = null, jarak = Infinity;
	for (const t of daftar) {
		const d = Math.hypot(t.x - pemainWilayah.x, t.z - pemainWilayah.z);
		if (d < jarak) { jarak = d; hasil = t; }
	}
	return hasil;
};
const petakYang = (f) => terdekat(PETAK_KEBUN.filter((_, i) => i < jumlahPetakAktif() && f(kebun.petak[i])));

/** titik tujuan misi / acara yang sedang berjalan untuk penanda di dunia */
export function sasaranKini() {
	const a = desa.acara;
	if (a?.jenis === "ayam") return terdekat(desa.ayam.filter((x) => !x.tertangkap));
	if (a?.jenis === "wereng") return petakYang((p) => p.hama);
	if (a?.jenis === "tengkulak" && Object.values(kebun.bawa).some((n) => n > 0)) return TITIK_PENGEPUL;
	if (a?.jenis === "lomba") return petakYang((p) => p.tahap === "siap");
	const m = misiKini();
	const jenis = m?.jenis;
	if (!jenis) return null;
	if (jenis === "obrol") return posWarga.get("karta");
	if (jenis === "cangkul") return petakYang((p) => p.tahap === "liar" || p.tahap === "layu");
	if (jenis === "tanam") return petakYang((p) => p.tahap === "gembur") || petakYang((p) => p.tahap === "liar");
	if (jenis === "timba") return SUMUR_KEBUN;
	if (jenis === "siram") return kebun.gembor ? petakYang((p) => p.tahap === "tanam" && p.air < 0.55) : SUMUR_KEBUN;
	if (jenis === "usir") return petakYang((p) => p.burung || p.hama);
	if (jenis === "panen" || jenis === "demam") return petakYang((p) => p.tahap === "siap");
	if (jenis === "jual") return Object.values(kebun.bawa).some((n) => n > 0) ? TITIK_PENGEPUL : petakYang((p) => p.tahap === "siap");
	if (jenis === "beli") return TITIK_WARUNG;
	return null;
}

