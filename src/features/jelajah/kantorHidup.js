import { useSyncExternalStore } from "react";
import { catat, hariIni, tambahXp } from "./progres";
import { tambahKoin } from "./pancing";
import { suara } from "./suaraPancing";
import { ubahTenaga } from "./tenaga";
import { AREA_PER_ID, RUANGAN } from "./kantorConfig";
import { posisi } from "./jelajahStore";
import { TITIK_ETALASE_PASAR } from "./scene/pasarBumdesData";
import { BATAS_LOMBA, GERBANG_JETSKI, MEDALI_JETSKI, RADIUS_GERBANG, TENDA_BAZAR, TITIK_PANITIA } from "./scene/acaraData";
import { airDekat, tambahMilik } from "./scene/kendaraan";
import { idUnit, milikSaya } from "./garasi";
import { cariModel } from "./scene/modelKendaraan";

/*
 * Kantor yang hidup: misi cerita Kang Ujang, antrean + urusan bidang yang dimainkan,
 * dan acara harian kawasan (bazar desa / lomba jetski bergantian tiap hari). Logika
 * murni tanpa three.js; digambar AcaraKawasan.jsx dan HudKantor.jsx.
 */

const KUNCI = "jelajah:kantor:v1";
const baca = () => { try { return JSON.parse(localStorage.getItem(KUNCI)) || {}; } catch { return {}; } };
const awal = baca();

const hariBaru = () => ({ tanggal: hariIni(), urusan: 0, stempel: [], undian: false, medali: null });

export const kantor = {
	misi: awal.misi || { i: 0, n: 0 },
	tiket: null, // { nomor, area, judul, uraian, fase: "tunggu" | "dipanggil", batas, total, terungkap, salah }
	dipanggil: 23, // nomor yang sedang dipanggil di papan antrean
	kombo: awal.kombo || 0,
	perayaan: null, // { judul, isi, id }
	lomba: null, // { id, gerbang, mulai, buat }
	hari: awal.hari || hariBaru(),
	rekor: awal.rekor ?? null, // waktu lomba terbaik (detik)
};

let versi = 0;
const pendengar = new Set();
const beriTahu = () => { versi++; pendengar.forEach((f) => f()); };
export const useKantor = () => useSyncExternalStore((f) => (pendengar.add(f), () => pendengar.delete(f)), () => versi);

function simpan() {
	try { localStorage.setItem(KUNCI, JSON.stringify({ misi: kantor.misi, kombo: kantor.kombo, hari: kantor.hari, rekor: kantor.rekor })); } catch { /* mode privat */ }
}
function segarkanHari() {
	if (kantor.hari.tanggal !== hariIni()) kantor.hari = hariBaru();
}

// ------------------------------------------------------------------ acara harian

/** hari genap sejak epoch = bazar, ganjil = lomba jetski */
export const acaraUntuk = (tanggal) => (Math.floor(Date.parse(`${tanggal}T00:00:00Z`) / 864e5) % 2 === 0 ? "bazar" : "jetski");
let cacheAcara = { t: -Infinity, v: "bazar" };
/** dipanggil tiap frame: hasilnya dicache, dihitung ulang paling sering sekali per 60 dtk */
export function acaraKini() {
	const n = Date.now();
	if (n - cacheAcara.t > 60000) {
		segarkanHari();
		cacheAcara = { t: n, v: acaraUntuk(hariIni()) };
	}
	return cacheAcara.v;
}

// ------------------------------------------------------------------ perayaan

// Beberapa perayaan beruntun tampil bergiliran; antrean dibatasi supaya tak menumpuk.
const antreanRayakan = [];
export function rayakanKantor(judul, isi) {
	if (kantor.perayaan) {
		if (antreanRayakan.length < 3) antreanRayakan.push([judul, isi]);
		return;
	}
	kantor.perayaan = { judul, isi, id: performance.now() };
	suara("jaya");
	beriTahu();
	setTimeout(() => {
		kantor.perayaan = null;
		beriTahu();
		const berikut = antreanRayakan.shift();
		if (berikut) rayakanKantor(...berikut);
	}, 3300);
}

// ------------------------------------------------------------------ misi cerita

/** Kisah Kang Ujang, perangkat desa baru yang minta ditemani mengurus keperluan desanya. */
export const RANTAI_KANTOR = [
	{ jenis: "sapa", syarat: (d) => d.id === "lobi", teks: "Sapa resepsionis di lobi", tujuan: "lobi", koin: 20, kabar: "Kang Ujang, perangkat desa baru, minta ditemani mengurus keperluan desanya." },
	{ jenis: "antrean", teks: "Ambil nomor antrean di resepsionis", tujuan: "lobi", koin: 20, kabar: "Pantau nomor Anda di papan antrean dinding lobi." },
	{ jenis: "urusan", teks: "Selesaikan 1 urusan di ruang bidang yang tepat", tujuan: "lobi", koin: 60, kabar: "Berkas pertama beres. Kang Ujang masih punya titipan." },
	{ jenis: "sapa", syarat: (d) => d.id === "pemdes", teks: "Tanyakan data aparatur desa ke Bidang Pemdes", tujuan: "pemdes", koin: 40 },
	{ jenis: "sapa", syarat: (d) => d.id === "kkd", teks: "Cek penyaluran Dana Desa ke Bidang KKD", tujuan: "kkd", koin: 40 },
	{ jenis: "sapa", syarat: (d) => d.id === "spked", teks: "Tanyakan BUM Desa ke Bidang SPKED", tujuan: "spked", koin: 40, kabar: "Kata petugas, produk BUM Desa bisa dilihat di Pasar BUMDes." },
	{ jenis: "etalase", teks: "Lihat produk BUM Desa di Pasar BUMDes", tujuan: { x: TITIK_ETALASE_PASAR.x, z: TITIK_ETALASE_PASAR.z, lantai: 0 }, koin: 60 },
	{ jenis: "urusan", syarat: (d) => d.kombo >= 3, teks: "Capai kombo urusan x3 tanpa salah ruang", tujuan: "lobi", koin: 120 },
	{ jenis: "acara", teks: "Ikut acara hari ini di kawasan", tujuan: "acara", koin: 150 },
	{ jenis: "sapa", syarat: (d) => d.id === "lobi", teks: "Kabari resepsionis bahwa urusan Kang Ujang beres", tujuan: "lobi", koin: 300, kabar: "Tamat! Kang Ujang pulang dengan berkas lengkap. Urusan dan acara harian tetap menanti." },
].map((m) => ({ target: 1, ...m }));

/** langkah cerita yang sedang berjalan, null bila tamat */
export const misiKantorKini = () => RANTAI_KANTOR[kantor.misi.i] || null;

/** catat kejadian kantor (sapa, antrean, urusan, etalase, acara) untuk misi cerita */
export function catatKantor(jenis, d = {}) {
	const m = misiKantorKini();
	if (!m || m.jenis !== jenis || (m.syarat && !m.syarat(d))) return;
	kantor.misi.n += 1;
	if (kantor.misi.n >= m.target) {
		tambahKoin(m.koin);
		tambahXp(Math.round(m.koin / 2));
		rayakanKantor(`✅ ${m.teks}`, `🪙 +${m.koin}${m.kabar ? ` · ${m.kabar}` : ""}`);
		kantor.misi = { i: kantor.misi.i + 1, n: 0 };
	}
	simpan();
	beriTahu();
}

// ------------------------------------------------------------------ antrean & urusan

export const formatNomor = (n) => `A-${String(n).padStart(3, "0")}`;

let detak = null;
let hitung = 0;
function berhentiDetak() {
	if (detak) clearInterval(detak);
	detak = null;
}
function tik() {
	const t = kantor.tiket;
	if (!t) return berhentiDetak();
	if (t.fase === "tunggu") {
		if (++hitung % 3 === 0) kantor.dipanggil += 1;
		if (kantor.dipanggil >= t.nomor) {
			t.fase = "dipanggil";
			t.batas = Date.now() + t.total;
			suara("koin");
			ubahTenaga(0, { teks: `🔔 Nomor ${formatNomor(t.nomor)} dipanggil! Serahkan berkas ke bidang yang tepat`, jenis: "info" });
		}
	} else if (Date.now() > t.batas) {
		kantor.tiket = null;
		kantor.kombo = 0;
		simpan();
		berhentiDetak();
		ubahTenaga(0, { teks: `⌛ Nomor ${formatNomor(t.nomor)} terlewat. Ambil nomor baru di resepsionis`, jenis: "buruk" });
	}
	beriTahu();
}

/** ambil nomor di resepsionis: keperluannya acak, bidang tujuannya harus ditebak pemain */
export function ambilAntrean() {
	if (kantor.tiket) return;
	const pilihan = RUANGAN.flatMap((r) => r.layanan.filter((l) => l.untuk.some((u) => u !== "Pegawai")).map((l) => ({ r, l })));
	const { r, l } = pilihan[Math.floor(Math.random() * pilihan.length)];
	kantor.tiket = {
		nomor: kantor.dipanggil + 3,
		area: r.id,
		judul: l.judul,
		uraian: l.uraian,
		fase: "tunggu",
		batas: 0,
		total: r.lantai === 1 ? 100000 : 75000,
		terungkap: false,
		salah: false,
	};
	hitung = 0;
	if (!detak) detak = setInterval(tik, 1000);
	catatKantor("antrean");
	beriTahu();
}

/** serahkan berkas di ruang bidang areaId; salah ruang memutus kombo tapi tiket tetap berlaku */
export function serahkanBerkas(areaId) {
	segarkanHari();
	const t = kantor.tiket;
	if (!t || t.fase !== "dipanggil") return;
	if (areaId !== t.area) {
		const a = AREA_PER_ID[t.area];
		t.salah = true;
		t.terungkap = true;
		kantor.kombo = 0;
		ubahTenaga(0, { teks: `Bukan di sini. Keperluan ini ditangani ${a.singkatan}, Lt. ${a.lantai + 1}`, jenis: "buruk" });
		simpan();
		beriTahu();
		return;
	}
	const sisa = Math.max(0, (t.batas - Date.now()) / t.total);
	const bonus = Math.round(40 * sisa);
	const pengali = 1 + 0.25 * Math.min(kantor.kombo, 4);
	kantor.kombo = t.salah ? 0 : kantor.kombo + 1;
	kantor.hari.urusan += 1;
	const koin = kantor.hari.urusan <= 10 ? Math.round((60 + bonus) * pengali) : 0;
	if (koin) tambahKoin(koin);
	tambahXp(20);
	catat("urusan");
	kantor.tiket = null;
	berhentiDetak();
	const nomor = formatNomor(t.nomor);
	rayakanKantor(`✅ Urusan ${nomor} selesai${kantor.kombo > 1 ? ` · kombo x${kantor.kombo}` : ""}`, koin ? `🪙 +${koin} · ⭐ +20 XP` : "⭐ +20 XP · koin harian sudah penuh");
	catatKantor("urusan", { kombo: kantor.kombo });
	simpan();
	beriTahu();
}

// ------------------------------------------------------------------ bazar desa

export const stempelSudah = (id) => kantor.hari.stempel.includes(id);

const HADIAH_UNDIAN = [[300, 50], [500, 30], [800, 15], [1500, 5]];
export function stempelBazar(id) {
	segarkanHari();
	const t = TENDA_BAZAR.find((x) => x.id === id);
	if (!t || stempelSudah(id)) return;
	kantor.hari.stempel.push(id);
	const k = 20 + Math.floor(Math.random() * 41);
	tambahKoin(k);
	suara("koin");
	const n = kantor.hari.stempel.length;
	ubahTenaga(0, { teks: `🎟️ Stempel ${t.nama} (${n}/${TENDA_BAZAR.length}) · 🪙 +${k} — ${t.kalimat}`, jenis: "baik" });
	if (n >= TENDA_BAZAR.length && !kantor.hari.undian) {
		kantor.hari.undian = true;
		let r = Math.random() * 100;
		const h = (HADIAH_UNDIAN.find(([, bobot]) => (r -= bobot) < 0) || HADIAH_UNDIAN[0])[0];
		tambahKoin(h);
		tambahXp(60);
		rayakanKantor("🎪 Kartu stempel penuh! Undian bazar", `🪙 +${h}`);
		catat("acaraKawasan");
		catatKantor("acara");
	}
	simpan();
	beriTahu();
}

// ------------------------------------------------------------------ lomba jetski

/** sewa jetski di air dekat pemain & buka lomba; mengembalikan id jetski (halaman mengisi kendali.aksi) */
export function mulaiLomba() {
	const air = airDekat(posisi.x, posisi.z) || { x: -90, z: 0, rot: Math.PI };
	const id = idUnit("perahu", "jetski");
	const warna = milikSaya("perahu", "jetski")?.warna ?? cariModel("perahu", "jetski").warna[0];
	// shortcut: jetski sewa tetap ada sampai halaman dimuat ulang (termasuk di layar tamu lain), hapus setelah lomba bila tamu mulai memanfaatkannya
	tambahMilik(id, warna, air.x, air.z, air.rot);
	kantor.lomba = { id, gerbang: 0, mulai: 0, buat: performance.now() };
	beriTahu();
	return id;
}

function batalLomba(teks) {
	kantor.lomba = null;
	ubahTenaga(0, { teks, jenis: "buruk" });
	beriTahu();
}

function selesaiLomba(waktu) {
	const rekorBaru = kantor.rekor == null || waktu < kantor.rekor;
	if (rekorBaru) kantor.rekor = waktu;
	const medali = MEDALI_JETSKI.find((m) => m.batas >= waktu) || null;
	const urut = (m) => (m ? MEDALI_JETSKI.indexOf(m) : Infinity);
	const lama = MEDALI_JETSKI.find((m) => m.id === kantor.hari.medali) || null;
	let hadiah = 0;
	if (medali && urut(medali) < urut(lama)) {
		hadiah = medali.koin - (lama?.koin || 0);
		kantor.hari.medali = medali.id;
		tambahKoin(hadiah);
		tambahXp(40);
	}
	kantor.lomba = null;
	rayakanKantor(`${medali?.ikon || "🏁"} Finis ${waktu.toFixed(1)} dtk${rekorBaru ? " · rekor baru!" : ""}`, hadiah ? `🪙 +${hadiah}` : "Coba lagi untuk medali lebih tinggi");
	catat("acaraKawasan");
	catatKantor("acara");
	simpan();
	beriTahu();
}

/** dipanggil tiap frame selama lomba; k = kendaraan yang sedang dikendarai pemain */
export function majukanLomba(k) {
	const l = kantor.lomba;
	if (!l) return;
	const kini = performance.now();
	if (!k || k.id !== l.id) {
		if (kini - l.buat > 4000) batalLomba("🏁 Lomba batal: Anda turun dari jetski");
		return;
	}
	if (l.mulai > 0 && kini - l.mulai > BATAS_LOMBA * 1000) return batalLomba("⌛ Waktu lomba habis");
	const g = GERBANG_JETSKI[l.gerbang];
	if (Math.hypot(k.x - g.x, k.z - g.z) >= RADIUS_GERBANG) return;
	suara("koin");
	if (l.gerbang === 0) l.mulai = kini;
	l.gerbang += 1;
	if (l.gerbang >= GERBANG_JETSKI.length) return selesaiLomba((kini - l.mulai) / 1000);
	beriTahu();
}

// ------------------------------------------------------------------ penanda tujuan

// objek tunggal dipakai ulang: sasaranKantor() dibaca tiap frame oleh kompas
const sasaran = { x: 0, z: 0, lantai: 0, keTangga: false };
function titik(x, z, lantai) {
	const salah = lantai !== posisi.lantai;
	sasaran.x = salah ? -6.2 : x;
	sasaran.z = salah ? 3.8 : z;
	sasaran.lantai = lantai;
	sasaran.keTangga = salah;
	return sasaran;
}
function sasaranAcara() {
	if (acaraKini() === "bazar") {
		const t = TENDA_BAZAR.find((x) => !stempelSudah(x.id));
		return t ? titik(t.titik.x, t.titik.z, 0) : null;
	}
	return kantor.hari.medali !== "emas" ? titik(TITIK_PANITIA.x, TITIK_PANITIA.z, 0) : null;
}

/** titik tujuan yang sedang dikejar (lomba, tiket, atau misi cerita), null bila tak ada */
export function sasaranKantor() {
	const l = kantor.lomba;
	if (l) {
		const g = GERBANG_JETSKI[Math.min(l.gerbang, GERBANG_JETSKI.length - 1)];
		return titik(g.x, g.z, 0);
	}
	const t = kantor.tiket;
	if (t?.terungkap) {
		const a = AREA_PER_ID[t.area];
		return titik(a.npc.x, a.npc.z, a.lantai);
	}
	const m = misiKantorKini();
	if (t && m?.jenis === "urusan") return null;
	if (!m) return sasaranAcara();
	if (m.tujuan === "acara") return sasaranAcara();
	if (typeof m.tujuan === "string") {
		const a = AREA_PER_ID[m.tujuan];
		return titik(a.npc.x, a.npc.z, a.lantai);
	}
	return titik(m.tujuan.x, m.tujuan.z, m.tujuan.lantai);
}
