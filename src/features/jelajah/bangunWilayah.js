import { useSyncExternalStore } from "react";
import { bayarKoin, tambahKoin } from "./pancing";
import { catat as catatMisi, hariIni, tambahXp } from "./progres";
import { semuaBintang, tingkatSemuaGame } from "./rekorWilayah";
import { suara } from "./suaraPancing";
import { ubahTenaga } from "./tenaga";
import { POTENSI } from "./potensiWilayah";
import { KOMODITAS, USAHA } from "./usahaWilayah";

/*
 * Lapisan "Bangun Kabupaten": BUMDes tiap kecamatan (kas pasif, bonus harga jual),
 * pesanan antar-kecamatan harian, gelar, dan pencapaian. Berkas ini sengaja tidak
 * mengimpor kebun.js atau apa pun dari wilayah/ dan scene/ supaya tetap di chunk
 * utama (kebun.js punya setInterval tingkat modul). Tersimpan di perangkat.
 */

export const TINGKAT_BUMDES = [
	{ nama: "Belum ada", biaya: 0, bintang: 0, kas: 0, bonus: 0 },
	{ nama: "Tumbuh", biaya: 300, bintang: 1, kas: 30, bonus: 0.05, teks: "Kios BUMDes berdiri" },
	{ nama: "Berkembang", biaya: 900, bintang: 2, kas: 80, bonus: 0.10, teks: "Lapak bertambah, jalan kampung diterangi lampu" },
	{ nama: "Maju", biaya: 2200, bintang: 3, kas: 160, bonus: 0.15, teks: "Kantor dua lantai dengan panel surya" },
	{ nama: "Mandiri", biaya: 5000, bintang: 3, kas: 300, bonus: 0.20, teks: "Tugu desa mandiri & kembang api tiap malam" },
]; // kas = koin per jam, bonus = tambahan harga jual
export const KAS_MAKS_JAM = 12;
export const BONUS_KUNJUNGAN = 50;

export const GELAR = [
	{ poin: 0, nama: "Warga" },
	{ poin: 15, nama: "Kader Desa" },
	{ poin: 50, nama: "Pendamping Desa" },
	{ poin: 120, nama: "Penggerak Kecamatan" },
	{ poin: 300, nama: "Duta Kabupaten" },
	{ poin: 700, nama: "Legenda Bogor" },
];

export const PENCAPAIAN = [
	{ id: "kunjung5", ikon: "🧭", teks: "Kunjungi 5 kecamatan", koin: 100, uji: (r) => r.dikunjungi >= 5 },
	{ id: "kunjung15", ikon: "🗺️", teks: "Kunjungi 15 kecamatan", koin: 400, uji: (r) => r.dikunjungi >= 15 },
	{ id: "kunjung40", ikon: "🏞️", teks: "Kunjungi 40 kecamatan", koin: 2000, uji: (r) => r.dikunjungi >= 40 },
	{ id: "enamUsaha", ikon: "🎯", teks: "Coba keenam jenis usaha", koin: 500, uji: (r) => r.jenisUsaha >= 6 },
	{ id: "bintang10", ikon: "⭐", teks: "Kumpulkan 10 bintang", koin: 150, uji: (r) => r.bintang >= 10 },
	{ id: "bintang40", ikon: "🌟", teks: "Kumpulkan 40 bintang", koin: 800, uji: (r) => r.bintang >= 40 },
	{ id: "bintang120", ikon: "👑", teks: "Kumpulkan 120 bintang", koin: 5000, uji: (r) => r.bintang >= 120 },
	{ id: "bumdes1", ikon: "🏛️", teks: "Dirikan BUMDes pertama", koin: 100, uji: (r) => r.bumdes >= 1 },
	{ id: "bumdes10", ikon: "🏘️", teks: "Dirikan 10 BUMDes", koin: 800, uji: (r) => r.bumdes >= 10 },
	{ id: "mandiri1", ikon: "🎆", teks: "Satu BUMDes Mandiri", koin: 500, uji: (r) => r.mandiri >= 1 },
	{ id: "mandiri5", ikon: "🎇", teks: "Lima BUMDes Mandiri", koin: 2500, uji: (r) => r.mandiri >= 5 },
	{ id: "mandiri40", ikon: "🏆", teks: "Semua BUMDes Mandiri", koin: 15000, uji: (r) => r.mandiri >= 40 },
	{ id: "pesanan1", ikon: "📦", teks: "Penuhi pesanan kabupaten pertama", koin: 100, uji: (r) => r.pesanan >= 1 },
	{ id: "pesanan10", ikon: "🚚", teks: "Penuhi 10 pesanan kabupaten", koin: 500, uji: (r) => r.pesanan >= 10 },
	{ id: "pesanan50", ikon: "🚛", teks: "Penuhi 50 pesanan kabupaten", koin: 2000, uji: (r) => r.pesanan >= 50 },
];

// ---------------------------------------------------------------- penyimpanan

const KUNCI = "jelajah:bangun:v1";
function baca() {
	try {
		const d = JSON.parse(localStorage.getItem(KUNCI));
		if (d && typeof d === "object") {
			return {
				kec: d.kec && typeof d.kec === "object" ? d.kec : {},
				pesanan: d.pesanan && typeof d.pesanan === "object" ? { tanggal: d.pesanan.tanggal || "", selesai: Array.isArray(d.pesanan.selesai) ? d.pesanan.selesai : [] } : { tanggal: "", selesai: [] },
				totalPesanan: d.totalPesanan || 0,
				capai: Array.isArray(d.capai) ? d.capai : [],
			};
		}
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return { kec: {}, pesanan: { tanggal: "", selesai: [] }, totalPesanan: 0, capai: [] };
}
const data = baca();

let versi = 0;
const pendengar = new Set();
function simpan() {
	try {
		localStorage.setItem(KUNCI, JSON.stringify(data));
	} catch {
		/* mode privat */
	}
	versi++;
	pendengar.forEach((f) => f());
}
export const dengarBangun = (f) => (pendengar.add(f), () => pendengar.delete(f));
export const useBangun = () => useSyncExternalStore(dengarBangun, () => versi);

const entri = (nama) => (data.kec[nama] = data.kec[nama] || { lv: 0, kasDari: 0, datang: 0 });

// ---------------------------------------------------------------- perayaan

/** Pendengar tampilan (mis. selebrasi dunia kecamatan); bila kosong jadi toast biasa. */
export const pendengarRayakan = new Set();
function rayakan(judul, isi) {
	if (pendengarRayakan.size) pendengarRayakan.forEach((f) => f(judul, isi));
	else ubahTenaga(0, { teks: `${judul} ${isi}`, jenis: "baik" });
}

// ---------------------------------------------------------------- BUMDes

export function bangunKec(nama) {
	const e = data.kec[nama];
	const lv = e?.lv || 0;
	return { lv, tingkat: TINGKAT_BUMDES[lv], dikunjungi: !!e?.datang, berikut: TINGKAT_BUMDES[lv + 1] || null };
}

export const pengaliBumdes = (nama) => 1 + TINGKAT_BUMDES[data.kec[nama]?.lv || 0].bonus;

export function kasTersedia(nama) {
	const e = data.kec[nama];
	const lv = e?.lv || 0;
	if (!lv) return 0;
	return Math.floor(Math.min(KAS_MAKS_JAM, (Date.now() - (e.kasDari || 0)) / 3600000) * TINGKAT_BUMDES[lv].kas);
}

export function ambilKas(nama) {
	const n = kasTersedia(nama);
	if (n >= 1) {
		tambahKoin(n);
		data.kec[nama].kasDari = Date.now();
		suara("koin");
		simpan();
	}
	return n >= 1 ? n : 0;
}

export function ambilSemuaKas() {
	let total = 0;
	for (const nama of Object.keys(data.kec)) total += ambilKas(nama);
	if (total > 0) ubahTenaga(0, { teks: `💰 Kas BUMDes terkumpul: 🪙 +${total}`, jenis: "baik" });
	return total;
}

/** Catat kunjungan ke kecamatan; bonus hanya pada kunjungan pertama. */
export function catatKunjungan(nama) {
	const e = entri(nama);
	const pertama = !e.datang;
	e.datang = (e.datang || 0) + 1;
	let bonus = 0;
	if (pertama) {
		bonus = BONUS_KUNJUNGAN;
		tambahKoin(BONUS_KUNJUNGAN);
		tambahXp(20);
	}
	const kas = ambilKas(nama);
	catatMisi("wilayah");
	periksaPencapaian();
	simpan();
	return { pertama, bonus, kas };
}

export function syaratNaik(nama) {
	const { lv, berikut } = bangunKec(nama);
	if (lv >= TINGKAT_BUMDES.length - 1) return null;
	const bintangKini = semuaBintang()[nama] || 0;
	return { berikut, bintangKini, cukupBintang: bintangKini >= berikut.bintang };
}

export function naikBumdes(nama) {
	const s = syaratNaik(nama);
	if (!s) return { ok: false, pesan: "Sudah tingkat tertinggi" };
	if (!s.cukupBintang) return { ok: false, pesan: `Butuh ${"★".repeat(s.berikut.bintang)} di kecamatan ini` };
	const e = entri(nama);
	ambilKas(nama);
	if (!bayarKoin(s.berikut.biaya)) return { ok: false, pesan: `Koin kurang (perlu 🪙 ${s.berikut.biaya})` };
	e.lv += 1;
	e.kasDari = Date.now();
	suara("jaya");
	rayakan(`🏛️ BUMDes ${nama}: ${s.berikut.nama}!`, s.berikut.teks);
	periksaPencapaian();
	simpan();
	return { ok: true, pesan: `🏛️ BUMDes ${nama} naik ke ${s.berikut.nama}` };
}

// ---------------------------------------------------------------- pesanan kabupaten

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

const memoPesanan = { tanggal: "", daftar: [] };
function bangkitkanPesanan(tanggal) {
	if (memoPesanan.tanggal === tanggal) return memoPesanan.daftar;
	const r = acakDari(`kab:${tanggal}`);
	const perKom = {};
	for (const [nama, p] of Object.entries(POTENSI)) {
		if (!KOMODITAS[p.komoditas]) continue;
		(perKom[p.komoditas] = perKom[p.komoditas] || []).push(nama);
	}
	const kunci = Object.keys(perKom).sort();
	for (let i = kunci.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[kunci[i], kunci[j]] = [kunci[j], kunci[i]];
	}
	const terpakai = new Set();
	const daftar = [];
	for (const kom of kunci) {
		if (daftar.length >= 3) break;
		const k = KOMODITAS[kom];
		if (terpakai.has(k.game)) continue;
		terpakai.add(k.game);
		const jumlah = k.hasil * (3 + Math.floor(r() * 3));
		const calon = Object.keys(POTENSI).filter((n) => POTENSI[n].game !== k.game);
		const tujuan = calon[Math.floor(r() * calon.length)];
		daftar.push({ id: `${tanggal}:${kom}`, kom, jumlah, tujuan, sumber: perKom[kom], koin: Math.round(jumlah * k.harga * 2.5) + 60, xp: 30 });
	}
	memoPesanan.tanggal = tanggal;
	memoPesanan.daftar = daftar;
	return daftar;
}

/** Tiga pesanan hari ini (sama untuk semua pemain), dengan penanda `selesai` dari simpanan. */
export function pesananHariIni() {
	const tanggal = hariIni();
	const selesai = data.pesanan.tanggal === tanggal ? data.pesanan.selesai : [];
	return bangkitkanPesanan(tanggal).map((p) => ({ ...p, selesai: selesai.includes(p.id) }));
}

export function teksPesanan(p) {
	const k = KOMODITAS[p.kom];
	if (k.game === "wisata") return `Rombongan dari Kec. ${p.tujuan}: pandu ${p.jumlah} tamu (${k.nama.toLowerCase()})`;
	return `Kec. ${p.tujuan} memesan ${p.jumlah} ${k.satuan} ${k.nama.toLowerCase()}`;
}

export function selesaikanPesanan(id) {
	const p = pesananHariIni().find((x) => x.id === id);
	if (!p || p.selesai) return false;
	const tanggal = hariIni();
	if (data.pesanan.tanggal !== tanggal) data.pesanan = { tanggal, selesai: [] };
	data.pesanan.selesai.push(id);
	data.totalPesanan += 1;
	tambahKoin(p.koin);
	tambahXp(p.xp);
	catatMisi("pesananKab");
	suara("jaya");
	rayakan(`📦 Pesanan kabupaten terkirim ke Kec. ${p.tujuan}!`, `🪙 +${p.koin}`);
	periksaPencapaian();
	simpan();
	return true;
}

// ---------------------------------------------------------------- status kebun (tanpa mengubah apa pun)

/**
 * Perkiraan petak siap per kecamatan dari simpanan kebun. Rumus pertumbuhannya sama dengan
 * tumbuhSaatPergi di kebun.js (maks 10 menit tanpa pemain; yang berair terus tumbuh).
 */
export function statusSemuaKebun() {
	let per = {};
	try { per = JSON.parse(localStorage.getItem("jelajah:kebun:v2"))?.per || {}; } catch { /* abaikan */ }
	const tingkat = tingkatSemuaGame();
	const hasil = {};
	const kini = Date.now();
	for (const [nama, d] of Object.entries(per)) {
		const pot = POTENSI[nama];
		if (!pot || !d) continue;
		const t = tingkat[pot.game] || 1;
		const aktif = t >= 4 ? 16 : 12;
		const detik = Math.min(600, Math.max(0, (kini - (d.waktu ?? kini)) / 1000));
		let siap = 0;
		for (let i = 0; i < aktif; i++) {
			const p = d.petak?.[i];
			if (!p) continue;
			if (p.tahap === "siap") { siap += 1; continue; }
			if (p.tahap !== "tanam" || !(p.air > 0.05)) continue;
			const k = KOMODITAS[p.k] || KOMODITAS[d.komoditas];
			if (!k) continue;
			if ((p.tumbuh || 0) + (detik / k.tumbuh) * (t >= 3 ? 1.25 : 1) * (p.pupuk ? 1.4 : 1) * (p.hama ? 0.3 : 1) >= 1) siap += 1;
		}
		hasil[nama] = { siap, bawa: Object.values(d.bawa || {}).reduce((a, n) => a + (n || 0), 0) };
	}
	return hasil;
}

export function jumlahPerhatian() {
	const status = statusSemuaKebun();
	const nama = new Set([...Object.keys(data.kec), ...Object.keys(status)]);
	let n = 0;
	for (const k of nama) if (kasTersedia(k) >= 1 || (status[k]?.siap || 0) > 0) n += 1;
	return n;
}

// ---------------------------------------------------------------- ringkasan, gelar, pencapaian

export function gelarDari(poin) {
	let i = 0;
	GELAR.forEach((g, n) => { if (poin >= g.poin) i = n; });
	return GELAR[i];
}

export function ringkasBangun() {
	const bintangPer = semuaBintang();
	const dikunjungi = Object.keys(data.kec).filter((n) => data.kec[n].datang);
	const bintang = Object.values(bintangPer).reduce((a, b) => a + b, 0);
	const lv = Object.values(data.kec).map((e) => e.lv || 0);
	const levelTotal = lv.reduce((a, b) => a + b, 0);
	const pesanan = data.totalPesanan;
	const poin = dikunjungi.length * 2 + bintang * 3 + levelTotal * 5 + Math.min(pesanan, 100) * 2;
	const gelar = gelarDari(poin);
	const idx = GELAR.indexOf(gelar);
	const gelarBerikut = GELAR[idx + 1] || null;
	return {
		dikunjungi: dikunjungi.length,
		jenisUsaha: new Set(dikunjungi.map((n) => POTENSI[n]?.game).filter(Boolean)).size,
		bintang,
		bumdes: lv.filter((x) => x >= 1).length,
		mandiri: lv.filter((x) => x === 4).length,
		levelTotal,
		pesanan,
		poin,
		gelar,
		gelarBerikut,
		kemajuan: gelarBerikut ? Math.min(1, Math.max(0, (poin - gelar.poin) / (gelarBerikut.poin - gelar.poin))) : 1,
	};
}

export const skorBangun = () => {
	const r = ringkasBangun();
	return { pembangun: r.poin, bintangW: r.bintang };
};

export const daftarPencapaian = () => PENCAPAIAN.map((p) => ({ id: p.id, ikon: p.ikon, teks: p.teks, koin: p.koin, selesai: data.capai.includes(p.id) }));

let gelarTerakhir = GELAR.indexOf(ringkasBangun().gelar);

export function periksaPencapaian() {
	const r = ringkasBangun();
	let ubah = false;
	for (const p of PENCAPAIAN) {
		if (data.capai.includes(p.id) || !p.uji(r)) continue;
		data.capai.push(p.id);
		tambahKoin(p.koin);
		tambahXp(Math.round(p.koin / 4));
		rayakan(`${p.ikon} Pencapaian: ${p.teks}`, `🪙 +${p.koin}`);
		ubah = true;
	}
	const idx = GELAR.indexOf(r.gelar);
	if (idx > gelarTerakhir) rayakan(`🎖️ Gelar baru: ${r.gelar.nama}!`, "");
	gelarTerakhir = idx;
	if (ubah) simpan();
}

/** Kecamatan berikutnya yang layak dituju, selain tempat pemain berada. */
export function saranBerikut(kiniDi, status) {
	const nama = Object.keys(POTENSI).filter((n) => n !== kiniDi);
	// (1) kecamatan dengan petak siap terbanyak
	let terbaik = null;
	for (const n of nama) {
		const siap = status?.[n]?.siap || 0;
		if (siap > 0 && (!terbaik || siap > terbaik.siap)) terbaik = { n, siap };
	}
	if (terbaik) {
		const u = USAHA[POTENSI[terbaik.n].game];
		return { nama: terbaik.n, alasan: `${terbaik.siap} ${u.unit} siap ${u.panen.kata.toLowerCase()}` };
	}
	const sudah = (n) => !!data.kec[n]?.datang;
	// (2) penghasil pesanan kabupaten yang belum selesai
	for (const p of pesananHariIni()) {
		if (p.selesai) continue;
		const sumber = p.sumber.filter((n) => n !== kiniDi);
		const pilih = sumber.find((n) => !sudah(n)) || sumber[0];
		if (pilih) return { nama: pilih, alasan: `Penghasil pesanan kabupaten: ${KOMODITAS[p.kom].nama.toLowerCase()}` };
	}
	// (3) kecamatan yang belum pernah dikunjungi
	const dicoba = new Set(Object.keys(data.kec).filter(sudah).map((n) => POTENSI[n]?.game));
	const belum = nama.filter((n) => !sudah(n));
	const baru = belum.find((n) => !dicoba.has(POTENSI[n].game)) || belum[0];
	if (baru) return { nama: baru, alasan: `Belum pernah dikunjungi · bonus 🪙 ${BONUS_KUNJUNGAN}` };
	return null;
}
