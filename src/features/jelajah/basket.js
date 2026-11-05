import { useSyncExternalStore } from "react";
import { kendali, posisi } from "./jelajahStore";
import { aturKaitBasket, idSocket, kirimBasket, kirimLomba, modeBersama, pemainLain, pesanSistem } from "./multipemain";
import { tambahKoin } from "./pancing";
import { TANAH } from "./scene/layout";
import { LAPANGAN, RING_BASKET } from "./scene/tamanWargaData";
import { suara } from "./suaraPancing";
import { ubahTenaga } from "./tenaga";

// Basket di lapangan Taman Warga. Pemain tetap berjalan lewat Pemain.jsx; modul ini memegang bola,
// lawan, dan skor. Koordinat adegan; y relatif tanah halaman (sama dengan TamanWarga).
// - Sendiri: 1 lawan 1 melawan warga, semua aturan dihitung di sini. Pemain menyerang RIM[0].
// - Lomba antar-tamu (basket.online): aturan & hasil di server (jelajahBasket.js), tanpa NPC, sampai
//   3 lawan 3. Di sini hanya memutar lintasan dari server dan menggerakkan badan sendiri.

export const LAMA_LAGA = 90;
export const SKOR_MENANG = 11;
export const KOIN = { dua: 10, tiga: 20, perfect: 5, menang: 50 };
export const KOIN_LOMBA = { menang: 200, mvp: 100 };
export const JARAK_TIGA = 6;
export const JARAK_DEKAT = 1.8;
// Setelah gol bola tetap di bawah ring; selama ini hanya tim yang kebobolan boleh mengambilnya.
const LAMA_HAK = 5;
// bilah tembakan: isi 0..1 dalam LAMA_BIDIK detik; lepas di dalam zona = PERFECT
export const LAMA_BIDIK = 0.85;
export const ZONA = { dari: 0.7, sampai: 0.88 };
export const ISI_MAKS = 1.35;
export const WARNA_TIM = ["#dc2626", "#1d4ed8"];
export const NAMA_TIM = ["Merah", "Biru"];
const G = 9.8;
const R_BOLA = 0.12;
export const LANTAI = 0.07 + R_BOLA;
const TINGGI_RIM = 3.05;
const TINGGI_LEPAS = 2.35;
const LAJU_LAWAN = { jaga: 4.6, kejar: 6.2, bola: 5.4, giring: 4.3 };
const TANDING = new Set(["mulai", "main", "skor"]);

export const RIM = RING_BASKET.map((r) => ({ x: r.x, z: r.z + 0.5 * r.arah, y: TINGGI_RIM, papanZ: r.z + 0.18 * r.arah, arah: r.arah }));

const jepit = (v, a, b) => Math.max(a, Math.min(b, v));
const acak = (a, b) => a + Math.random() * (b - a);

// --- rumus peluang & lintasan; sama dengan dpmd-fahri-express/src/socket/jelajahBasket.js ---
export const kontesDari = (jarak) => jepit(1 - jarak / 1.6, 0, 1);
export const perfectDari = (isi) => isi >= ZONA.dari && isi <= ZONA.sampai;
export function peluangPemain(isi, jarak, kontes) {
	if (perfectDari(isi)) return jepit(0.97 - Math.max(0, jarak - 6) * 0.045, 0.6, 0.97) * (1 - kontes * 0.3);
	const mutu = 1 - Math.min(1, Math.abs(isi - 0.79) / 0.55);
	return (0.1 + 0.5 * mutu) * jepit(1.1 - jarak * 0.075, 0.25, 1) * (1 - kontes * 0.6);
}
export const peluangDekat = (kontes) => 0.92 * (1 - kontes * 0.5);
export const peluangLawan = (jarak, kontes) => jepit(0.62 - jarak * 0.05, 0.18, 0.58) * (1 - kontes * 0.7);

// Lintasan parabola dari p ke t tepat dalam T detik.
export function lintasan(p, t, T) {
	return { vx: (t.x - p.x) / T, vy: (t.y - p.y + 0.5 * G * T * T) / T, vz: (t.z - p.z) / T };
}
const keTitik = ([x, y, z]) => ({ x, y, z });
const kecepatanTiba = (a, b, T) => {
	const v = lintasan(keTitik(a), keTitik(b), T);
	return { vx: v.vx, vy: v.vy - G * T, vz: v.vz };
};

// Rangkaian titik & lama tiap ruas: swish, bibir ring lalu masuk, pantul papan, dunk, atau meleset.
export function rencanaTembakan(p, rim, o) {
	const d = Math.hypot(rim.x - p.x, rim.z - p.z);
	const asal = [p.x, TINGGI_LEPAS, p.z];
	const pusat = [rim.x, rim.y, rim.z];
	const T = 0.85 + d * 0.045;
	const kePemain = Math.atan2(p.x - rim.x, p.z - rim.z);
	const tepi = (r, a) => {
		const t = [rim.x + Math.sin(a) * r, rim.y, rim.z + Math.cos(a) * r];
		if ((t[2] - rim.papanZ) * rim.arah < 0.15) t[2] = rim.papanZ + rim.arah * 0.15;
		return t;
	};
	const papan = (x, y) => [x, y, rim.papanZ + rim.arah * (R_BOLA + 0.03)];
	if (o.dunk) return { titik: [[p.x, 2.75, p.z], [rim.x, rim.y + 0.18, rim.z], pusat], T: [0.24, 0.07], gaya: "dunk", pantul: null };
	if (o.masuk) {
		const tembusPapan = papan(rim.x + (p.x - rim.x) * 0.18, rim.y + 0.42);
		if (o.dekat) return { titik: [asal, tembusPapan, pusat], T: [0.42, 0.2], gaya: "papan", pantul: null };
		const r = Math.random();
		if (!o.perfect && r < 0.35) return { titik: [asal, tepi(0.21, kePemain + acak(-0.7, 0.7)), pusat], T: [T, 0.34], gaya: "bibir", pantul: null };
		if (!o.perfect && r < 0.55 && d < 5) return { titik: [asal, tembusPapan, pusat], T: [T * 0.92, 0.22], gaya: "papan", pantul: null };
		return { titik: [asal, pusat], T: [T], gaya: "swish", pantul: null };
	}
	if (o.jauh) {
		const akhir = tepi(acak(0.6, 1.2), kePemain + acak(-0.6, 0.6));
		const v = kecepatanTiba(asal, akhir, T);
		return { titik: [asal, akhir], T: [T], gaya: "angin", pantul: [v.vx, v.vy, v.vz] };
	}
	if (d > 3 && Math.random() < 0.3) {
		const akhir = papan(rim.x + acak(-0.6, 0.6), rim.y + acak(0.2, 0.55));
		const v = kecepatanTiba(asal, akhir, T);
		return { titik: [asal, akhir], T: [T], gaya: "papan", pantul: [v.vx * 0.7, v.vy * 0.8, -v.vz * 0.6] };
	}
	const akhir = tepi(acak(0.25, 0.33), kePemain + acak(-1.5, 1.5));
	const v = kecepatanTiba(asal, akhir, T);
	const nx = akhir[0] - rim.x;
	const nz = akhir[2] - rim.z;
	const n = Math.hypot(nx, nz) || 1;
	const laju = acak(1.6, 3);
	return { titik: [asal, akhir], T: [T], gaya: "ring", pantul: [(nx / n) * laju, Math.abs(v.vy) * 0.45, (nz / n) * laju] };
}

// --- gerak bola di tangan: titik dalam rangka tokoh (x samping, y tinggi, z depan). Tangan Tokoh
// mengejar titik ini lewat IK, jadi telapak benar-benar menyentuh bola. ---

// u 0 = bola di lantai. Naik melambat, sejenak di telapak, lalu didorong turun makin cepat.
export function tinggiDribble(u, H) {
	if (u < 0.42) {
		const s = u / 0.42;
		return LANTAI + (H - LANTAI) * (1 - (1 - s) ** 2);
	}
	if (u < 0.58) return H;
	const s = (u - 0.58) / 0.42;
	return H - (H - LANTAI) * (0.35 * s + 0.65 * s * s);
}
export const gayaBaru = () => ({ u: 0.5, sisi: 1, sisiH: 1, H: 0.82, maju: 0, lokal: { x: 0.3, y: 0.82, z: 0.3, ty: 0.95, condong: 0.12, tekuk: 0 } });
export function majukanDribble(d, dt, laju, ditekan) {
	const f = 1 - Math.exp(-10 * dt);
	d.H += ((ditekan ? 0.62 : laju > 5 ? 0.92 : 0.82) - d.H) * f; // dijaga: menggiring rendah
	d.maju += (Math.min(0.24, laju * 0.04) - d.maju) * f; // berlari: bola didorong ke depan
	d.sisiH += (d.sisi - d.sisiH) * (1 - Math.exp(-16 * dt)); // pindah tangan melintas di depan badan
	const baru = d.u + dt / (0.52 - Math.min(0.12, laju * 0.02) - (ditekan ? 0.05 : 0));
	if (baru >= 1) suara("pantul");
	d.u = baru % 1;
	const l = d.lokal;
	l.x = d.sisiH * 0.3;
	l.y = tinggiDribble(d.u, d.H);
	l.z = 0.3 + d.maju;
	l.ty = Math.max(d.H + 0.02, l.y + 0.13);
	l.condong = 0.12 + (0.92 - d.H) * 0.55;
}
// Bola naik dari dada ke atas dahi selama membidik: puncaknya bertepatan dengan zona hijau.
export function bolaBidik(isi) {
	const s = Math.min(1, isi / 0.79);
	const h = s * s * (3 - 2 * s);
	const y = 1.22 + 0.72 * h;
	return { x: 0, y, z: 0.32 - 0.08 * h, ty: y + 0.13, condong: 0, tekuk: Math.max(0, 1 - s * 1.25) };
}
// Tiap titik bola berbentuk sama: Tokoh membaca semua kolomnya, nilai kosong merusak pose sendi.
const BOLA_LEPAS = { x: 0.04, y: 2.2, z: 0.3, ty: 2.33, condong: 0, tekuk: 0 };
const BOLA_OPER = { x: 0, y: 1.3, z: 0.46, ty: 1.43, condong: 0, tekuk: 0 };

export const basket = {
	aktif: false,
	jeda: false,
	fase: "mulai", // mulai | main | skor | selesai
	tunggu: 0,
	sisa: LAMA_LAGA,
	skor: { pemain: 0, lawan: 0 },
	koinLaga: 0,
	pemenang: null,
	pegang: "pemain", // pemain | lawan | kawan (lomba: satu tim) | null
	hak: null, // pemain | lawan: yang boleh mengambil bola di lantai sesudah gol
	bidik: false,
	isi: 0,
	gaya: gayaBaru(),
	bolaLokal: null, // titik bola bagi tangan pemain sendiri
	panas: false,
	isyaratPemain: null,
	hadap: null,
	bola: { x: 0, y: LANTAI, z: 0, vx: 0, vy: 0, vz: 0, mode: "pegang", putar: 0 },
	tembakan: null,
	lawan: { x: 0, z: 0, rot: 0, h: 0, vy: 0, gerak: { laju: 0, fase: 0, udara: false, isyarat: null, halus: true, bola: null } },
	gayaLawan: gayaBaru(),
	jaring: [0, 0], // waktu (performance.now) ayunan jaring tiap ring
	hujanKoin: null, // { i: indeks ring, mulai } untuk semburan koin
	kabar: null, // { id, teks, warna }
	online: null, // keadaan lomba di ruang ini dari server (juga untuk penonton), lihat terimaOnline
	ikutOnline: false,
	pidSaya: null,
	keluarId: null, // lomba yang sudah ditinggalkan: jangan ditarik masuk lagi
	hadiahId: null, // lomba yang hadiahnya sudah diberikan
	jam: 14, // waktu serang (detik)
	sasaranOper: null, // { x, z, pid } rekan yang akan menerima operan
};

// waktu & jeda aksi: disimpan terpisah dari state yang dibaca UI
const w = { hak: 0, kebal: 0, rebut: 0, rebutT: 0, kecoh: 0, kebut: 0, lajuPelan: 0, tembakT: 0, operT: 0, melepas: 0, transisi: 0, jedaBatal: 0, beruntun: 0, lawanRebut: 0, lawanRebutT: 0, lawanTembakT: 0, lawanGoyah: 0, lawanBidik: 0, lawanGiring: 0, ax: 0, az: 0, kabarId: 0 };
const TIMER = ["hak", "kebal", "rebut", "rebutT", "kecoh", "kebut", "lajuPelan", "tembakT", "operT", "melepas", "transisi", "jedaBatal", "lawanRebut", "lawanRebutT", "lawanTembakT", "lawanGoyah"];

const pendengar = new Set();
let versi = 0;
const beri = () => {
	versi++;
	pendengar.forEach((f) => f());
};
const dengar = (f) => (pendengar.add(f), () => pendengar.delete(f));
export function useBasket() {
	useSyncExternalStore(dengar, () => versi);
	return basket;
}
// Hanya render ulang bila nilai pilihan berubah; dipakai komponen besar seperti JelajahPage.
export const useBasketPilih = (pilih) => useSyncExternalStore(dengar, () => pilih(basket));

function kabar(teks, warna = "#ffffff") {
	basket.kabar = { id: ++w.kabarId, teks, warna };
	beri();
}

export const dalamLapangan = (x, z, m = 0.25) => x > LAPANGAN.x0 + m && x < LAPANGAN.x1 - m && z > LAPANGAN.z0 + m && z < LAPANGAN.z1 - m;
export const sedangTanding = () => !!basket.online && TANDING.has(basket.online.fase);
// Lapangan kosong: warga boleh berkeliaran & pemain boleh memulai laga.
export const lapanganBebas = () => !basket.aktif && !sedangTanding();
// Warna seragam: tim tamu ini selama lomba berlangsung, null bila tidak bertanding.
export const timDari = (sid) => (sedangTanding() ? (basket.online.peserta.find((p) => p.sid === sid && !p.keluar)?.tim ?? null) : null);
export const timSaya = () => timDari(idSocket());
export const seragamTim = (penampilan, tim) => (tim === null ? penampilan : { ...penampilan, seragam: "warga", jasHujan: false, baju: WARNA_TIM[tim], celana: "#111827" });

const muatGiliran = () => Object.assign(w, { hak: 0, kebal: 0, rebut: 0, rebutT: 0, kecoh: 0, kebut: 0, lajuPelan: 0, tembakT: 0, operT: 0, melepas: 0, transisi: 0, beruntun: 0 });

export function mulaiBasket() {
	const b = basket;
	if (b.online?.fase === "selesai") b.online = null;
	Object.assign(b, { aktif: true, ikutOnline: false, jeda: false, fase: "mulai", tunggu: 3, sisa: LAMA_LAGA, koinLaga: 0, pemenang: null, pegang: "pemain", hak: null, bidik: false, isi: 0, panas: false, isyaratPemain: null, hadap: null, tembakan: null, kabar: null, sasaranOper: null });
	b.skor = { pemain: 0, lawan: 0 };
	b.bola.mode = "pegang";
	b.gaya = gayaBaru();
	Object.assign(b.lawan, { x: RIM[0].x, z: 15.5, rot: 0, h: 0, vy: 0 });
	Object.assign(b.lawan.gerak, { laju: 0, fase: 0, udara: false, isyarat: null, bola: null });
	muatGiliran();
	Object.assign(w, { lawanRebut: 2, lawanRebutT: 0, lawanTembakT: 0, lawanGoyah: 0, lawanBidik: 0, lawanGiring: 0, jedaBatal: 0, ax: -58, az: 20.5 });
	// kamera dari sisi tribun seperti siaran: dari ujung lapangan papan ring menutupi layar
	kendali.teleport = { x: -58, z: 20.5, lantai: 0, rot: Math.PI, yaw: Math.PI / 2 };
	beri();
}

// Tombol di lapangan: ada tamu lain = daftar lomba antar-tamu; sendirian = langsung lawan warga.
export async function mulaiLapangan() {
	if (!modeBersama() || !pemainLain.size) return mulaiBasket();
	const r = await kirimLomba("basket:daftar", null);
	if (r.ok) {
		basket.pidSaya = r.pid;
		basket.keluarId = null;
	} else ubahTenaga(0, { teks: `🏀 ${r.alasan}`, jenis: "buruk" });
}
export const batalDaftarBasket = () => kirimBasket("basket:keluar");

export function tutupBasket() {
	const b = basket;
	if (b.ikutOnline) {
		if (b.online?.fase !== "selesai") {
			kirimBasket("basket:keluar");
			b.keluarId = b.online?.id;
		}
		b.ikutOnline = false;
	}
	b.aktif = false;
	b.bidik = false;
	b.bolaLokal = null;
	b.isyaratPemain = null;
	b.hadap = null;
	b.kabar = null;
	b.sasaranOper = null;
	beri();
}

// Pengali kecepatan jalan pemain selama laga (dibaca Pemain.jsx).
export function faktorLaju() {
	if (basket.bidik) return 0;
	if (w.lajuPelan > 0) return 0.4;
	if (w.kebut > 0) return 1.3;
	return basket.pegang === "pemain" ? 0.88 : 1;
}

const ringSaya = () => (basket.ikutOnline ? (basket.online?.saya?.tim ?? 0) : 0);

// Kamera laga, terkunci supaya pemain tidak perlu menggesernya. tan(fov 50 / 2) = 0,466.
// Layar lebar: siaran dari sisi tribun, seluruh lapangan masuk bingkai, jarak dihitung dari sisi
// terdekat (4,5 = majunya garis pinggir ke arah kamera). Layar tegak: dari samping 17 m tidak muat,
// jadi dari belakang arah serang dan mengikuti pemain. y relatif tanah halaman.
export function kameraBasket(aspek, x, z, ring = ringSaya()) {
	const cx = (LAPANGAN.x0 + LAPANGAN.x1) / 2;
	const cz = (LAPANGAN.z0 + LAPANGAN.z1) / 2;
	const lebar = aspek >= 1;
	const S = lebar ? 4.5 + 9 / (0.466 * aspek) : jepit(4 / (0.466 * aspek), 18, 30);
	const pitch = lebar ? 0.72 : 0.9;
	const yaw = lebar ? Math.PI / 2 : ring === 0 ? 0 : Math.PI;
	const lx = cx + (x - cx) * (lebar ? 0.1 : 0.7);
	// layar tegak: titik pandang maju ke arah serang, supaya ring sasaran tidak tertutup papan skor
	const lz = cz + (z - cz) * (lebar ? 0.15 : 0.5) + (lebar ? 0 : ring === 0 ? -2.5 : 2.5);
	return { x: lx + Math.sin(yaw) * S * Math.cos(pitch), y: 1 + S * Math.sin(pitch), z: lz + Math.cos(yaw) * S * Math.cos(pitch), lx, lz, yaw };
}

// E / tombol ditekan: membidik bila memegang bola (dekat ring langsung layup/dunk), merebut bila
// bola di tangan lawan.
export function tekanAksi() {
	const b = basket;
	if (b.fase !== "main" || b.jeda) return;
	if (b.pegang === "pemain") {
		const rim = RIM[ringSaya()];
		if (Math.hypot(rim.x - posisi.x, rim.z - posisi.z) < JARAK_DEKAT) {
			b.isi = 0.79;
			tembakPemain();
			beri();
			return;
		}
		b.bidik = true;
		b.isi = 0;
		w.transisi = 0.15;
		if (b.ikutOnline) kirimBasket("basket:bidik", { on: true });
		beri();
	} else if (b.pegang === "lawan") cobaRebut();
}

// E / tombol dilepas: bola dilepas.
export function lepasAksi() {
	if (!basket.bidik) return;
	basket.bidik = false;
	tembakPemain();
	beri();
}

// Spasi dengan bola = kecoh (ganti tangan & melesat). true = masukan dipakai, jangan meloncat.
export function kecohBasket() {
	const b = basket;
	if (b.fase !== "main" || b.pegang !== "pemain") return false;
	if (b.bidik || w.kecoh > 0) return true;
	b.gaya.sisi = -b.gaya.sisi;
	w.kecoh = 1.5;
	w.kebut = 0.45;
	w.kebal = Math.max(w.kebal, 0.8);
	if (b.ikutOnline) kirimBasket("basket:kecoh");
	else if (Math.hypot(b.lawan.x - posisi.x, b.lawan.z - posisi.z) < 1.8) {
		w.lawanGoyah = 0.7;
		kabar("Lawan terkecoh!", "#fde047");
	}
	return true;
}

// Q / tombol Oper: lomba saja, ke rekan yang paling searah dengan hadapan pemain.
export function operBola() {
	const b = basket;
	const ke = b.sasaranOper;
	if (!b.ikutOnline || b.fase !== "main" || b.pegang !== "pemain" || !ke) return;
	b.bidik = false;
	b.pegang = null;
	b.bolaLokal = BOLA_OPER;
	w.melepas = 0.3;
	w.operT = 0.3;
	w.transisi = 0.12;
	kirimBasket("basket:oper", { ke: ke.pid });
	beri();
}

function cobaRebut() {
	const b = basket;
	if (w.rebut > 0) return;
	w.rebut = 1.1;
	w.rebutT = 0.3;
	if (b.ikutOnline) {
		kirimBasket("basket:rebut");
		w.lajuPelan = 0.3;
		return;
	}
	const d = Math.hypot(b.lawan.x - posisi.x, b.lawan.z - posisi.z);
	if (d > 1.6) {
		w.lajuPelan = 0.25;
		return;
	}
	const peluang = (d < 1 ? 0.33 : 0.18) + (w.lawanBidik > 0 ? 0.2 : 0);
	if (w.kebal <= 0 && Math.random() < peluang) {
		pindahBola("pemain");
		w.kebal = 0.9;
		suara("pantul");
		kabar("Bola berhasil direbut!", "#4ade80");
	} else w.lajuPelan = 0.45; // gagal: tubuh terlanjur menjulur
}

function pindahBola(ke) {
	const b = basket;
	b.pegang = ke;
	b.hak = null;
	b.bola.mode = "pegang";
	b.tembakan = null;
	w.lawanBidik = 0;
	w.lawanGiring = 0;
	w.transisi = 0.2;
	(ke === "pemain" ? b.gaya : b.gayaLawan).u = 0.5;
	if (ke !== "pemain") b.bidik = false;
}

// --- tembakan ---
// Bola sesaat menuju titik lepas (t < 0), lalu menyusuri tiap ruas parabola.
function mulaiTerbang(r, meta, tunda) {
	const b = basket;
	const ruas = r.T.map((T, i) => ({ T, a: r.titik[i], v: lintasan(keTitik(r.titik[i]), keTitik(r.titik[i + 1]), T) }));
	b.tembakan = { ...r, ...meta, ruas, i: 0, u: 0, t: -tunda };
	b.bola.mode = "terbang";
	b.pegang = null;
	w.melepas = 0;
}

function tembakPemain() {
	const b = basket;
	const dLawan = b.ikutOnline ? Infinity : Math.hypot(b.lawan.x - posisi.x, b.lawan.z - posisi.z);
	const rim = RIM[ringSaya()];
	const d = Math.hypot(rim.x - posisi.x, rim.z - posisi.z);
	const dekat = d < JARAK_DEKAT;
	const perfect = !dekat && perfectDari(b.isi);
	w.tembakT = 0.55;
	kendali.loncat = true;
	if (b.ikutOnline) {
		kirimBasket("basket:bidik", { on: false });
		kirimBasket("basket:tembak", { isi: b.isi, x: +posisi.x.toFixed(2), z: +posisi.z.toFixed(2) });
		b.pegang = null;
		b.bolaLokal = BOLA_LEPAS;
		w.melepas = 0.35;
		w.transisi = 0.1;
	} else {
		const kontes = kontesDari(dLawan);
		const masuk = Math.random() < Math.min(0.98, (dekat ? peluangDekat(kontes) : peluangPemain(b.isi, d, kontes)) * (w.beruntun >= 3 ? 1.1 : 1));
		const dunk = dekat && masuk && !!posisi.lari && dLawan > 1.2;
		const r = rencanaTembakan(posisi, rim, { masuk, perfect, dekat, dunk, jauh: !dekat && !perfect && b.isi < 0.35 });
		mulaiTerbang(r, { jenis: "tembak", oleh: "pemain", ring: 0, masuk, perfect, tiga: d > JARAK_TIGA, blok: !perfect && !dekat && dLawan < 1.2 && Math.random() < 0.25 }, 0.1);
		if (dLawan < 1.5) lompatLawan();
	}
	if (dekat) return;
	if (perfect) kabar("Rilis sempurna!", "#fde047");
	else kabar(b.isi < ZONA.dari ? "Terlalu cepat" : "Terlambat", "#fca5a5");
}

function tembakLawan() {
	const b = basket;
	const L = b.lawan;
	const rim = RIM[1];
	const d = Math.hypot(rim.x - L.x, rim.z - L.z);
	const dPemain = Math.hypot(posisi.x - L.x, posisi.z - L.z);
	const masuk = Math.random() < peluangLawan(d, kontesDari(dPemain));
	const r = rencanaTembakan(L, rim, { masuk, perfect: false, dekat: d < JARAK_DEKAT, dunk: false, jauh: false });
	mulaiTerbang(r, { jenis: "tembak", oleh: "lawan", ring: 1, masuk, perfect: false, tiga: d > JARAK_TIGA, blok: false }, 0.1);
	lompatLawan();
	w.lawanTembakT = 0.5;
	w.lawanRebut = 0.6;
}

function lompatLawan() {
	if (basket.lawan.h <= 0) basket.lawan.vy = 3.4;
}

function tepis() {
	const b = basket;
	const sudut = Math.random() * Math.PI * 2;
	Object.assign(b.bola, { vx: Math.sin(sudut) * 3, vy: -1, vz: Math.cos(sudut) * 3, mode: "bebas" });
	b.tembakan = null;
	suara("pantul");
}

function cetak(ts) {
	const b = basket;
	const poin = ts.tiga ? 3 : 2;
	if (ts.oleh === "pemain") {
		const koin = (ts.tiga ? KOIN.tiga : KOIN.dua) + (ts.perfect ? KOIN.perfect : 0);
		b.skor.pemain += poin;
		b.koinLaga += koin;
		tambahKoin(koin);
		suara("koin");
		b.hujanKoin = { i: ts.ring, mulai: performance.now() };
		w.beruntun += 1;
		b.panas = w.beruntun >= 3;
		const judul = ts.gaya === "dunk" ? "SLAM DUNK! " : ts.perfect ? "PERFECT! " : "MASUK! ";
		kabar(`${b.panas ? "🔥 " : ""}${judul}+${poin} · +${koin} 🪙`, ts.perfect || ts.gaya === "dunk" ? "#fde047" : "#ffffff");
	} else {
		b.skor.lawan += poin;
		kabar(`Lawan mencetak +${poin}`, "#fca5a5");
	}
	b.fase = "skor";
	b.tunggu = 1.5;
	w.lawanBidik = 0;
	beri();
}

function akhiri() {
	const b = basket;
	b.fase = "selesai";
	b.bidik = false;
	b.pemenang = b.skor.pemain > b.skor.lawan ? "pemain" : "lawan";
	if (b.pemenang === "pemain") {
		b.koinLaga += KOIN.menang;
		tambahKoin(KOIN.menang);
		suara("jaya");
	} else suara("peluit");
	beri();
}

// --- fisika bola bebas: gravitasi, papan, bibir ring, lantai, dan batas lapangan ---
function majukanBola(dt) {
	const o = basket.bola;
	o.vy -= G * dt;
	const zLama = o.z;
	o.x += o.vx * dt;
	o.y += o.vy * dt;
	o.z += o.vz * dt;
	for (const r of RIM) {
		const dulu = zLama - r.papanZ;
		const kini = o.z - r.papanZ;
		if (dulu * kini <= 0 && Math.abs(o.x - r.x) < 0.9 && o.y > 2.78 && o.y < 3.82) {
			o.z = zLama;
			o.vz *= -0.6;
			suara("pantul");
		}
		const dy = o.y - r.y;
		const rr = Math.hypot(o.x - r.x, o.z - r.z);
		if (Math.abs(dy) < 0.2 && rr > 1e-3) {
			const dx = (o.x - r.x) * (1 - 0.23 / rr);
			const dz = (o.z - r.z) * (1 - 0.23 / rr);
			const d = Math.hypot(dx, dy, dz);
			const vn = d > 1e-3 ? (o.vx * dx + o.vy * dy + o.vz * dz) / d : 0;
			if (d < R_BOLA + 0.022 && vn < 0) {
				o.vx -= (1.55 * vn * dx) / d;
				o.vy -= (1.55 * vn * dy) / d;
				o.vz -= (1.55 * vn * dz) / d;
				suara("ring");
			}
		}
	}
	if (o.y < LANTAI) {
		o.y = LANTAI;
		if (o.vy < -1.2) {
			if (o.vy < -2.5) suara("pantul");
			o.vy *= -0.72;
		} else o.vy = 0;
		const gesek = Math.exp(-1.2 * dt);
		o.vx *= gesek;
		o.vz *= gesek;
	}
	if (o.x < LAPANGAN.x0 + R_BOLA || o.x > LAPANGAN.x1 - R_BOLA) {
		o.x = jepit(o.x, LAPANGAN.x0 + R_BOLA, LAPANGAN.x1 - R_BOLA);
		o.vx *= -0.6;
	}
	if (o.z < LAPANGAN.z0 + R_BOLA || o.z > LAPANGAN.z1 - R_BOLA) {
		o.z = jepit(o.z, LAPANGAN.z0 + R_BOLA, LAPANGAN.z1 - R_BOLA);
		o.vz *= -0.6;
	}
}

function majukanTerbang(dt) {
	const b = basket;
	const ts = b.tembakan;
	const o = b.bola;
	ts.t += dt;
	// blok (laga sendiri; pada lomba diputuskan server): lawan menepis tembakan biasa; pemain
	// menepis bila meloncat tepat di depan bola
	if (ts.oleh === "pemain" && ts.blok && ts.t > 0.18) {
		tepis();
		w.beruntun = 0;
		b.panas = false;
		kabar("Tembakan diblok!", "#fca5a5");
		return;
	}
	if (ts.oleh === "lawan" && ts.t > 0 && ts.t < 0.35 && posisi.udara && Math.hypot(o.x - posisi.x, o.z - posisi.z) < 1.1) {
		tepis();
		kabar("BLOK! Bola ditepis!", "#4ade80");
		return;
	}
	if (ts.t < 0) {
		const a = ts.ruas[0].a;
		const f = 1 - Math.exp(-30 * dt);
		o.x += (a[0] - o.x) * f;
		o.y += (a[1] - o.y) * f;
		o.z += (a[2] - o.z) * f;
		return;
	}
	ts.u += ts.t - Math.max(0, ts.t - dt);
	while (ts.i < ts.ruas.length && ts.u >= ts.ruas[ts.i].T) {
		ts.u -= ts.ruas[ts.i].T;
		ts.i++;
		if (ts.i < ts.ruas.length) suara(ts.gaya === "papan" ? "pantul" : ts.gaya === "bibir" ? "ring" : "pantul");
	}
	if (ts.i < ts.ruas.length) {
		const { a, v } = ts.ruas[ts.i];
		o.x = a[0] + v.vx * ts.u;
		o.y = a[1] + v.vy * ts.u - 0.5 * G * ts.u * ts.u;
		o.z = a[2] + v.vz * ts.u;
		return;
	}
	selesaiTerbang(ts);
}

function selesaiTerbang(ts) {
	const b = basket;
	const o = b.bola;
	const akhir = ts.titik[ts.titik.length - 1];
	b.tembakan = null;
	Object.assign(o, { x: akhir[0], y: akhir[1], z: akhir[2], mode: "bebas" });
	if (ts.jenis === "oper") {
		const r = ts.ruas[ts.ruas.length - 1];
		Object.assign(o, { vx: r.v.vx, vy: r.v.vy - G * r.T, vz: r.v.vz });
		return;
	}
	if (ts.masuk) {
		// jaring meredam bola: jatuh pelan lurus ke bawah
		Object.assign(o, { vx: 0, vy: -2.2, vz: 0 });
		b.jaring[ts.ring] = performance.now();
		suara(ts.gaya === "dunk" ? "ring" : "swish");
		if (!b.online || !sedangTanding()) cetak(ts);
		return;
	}
	Object.assign(o, { vx: ts.pantul[0], vy: ts.pantul[1], vz: ts.pantul[2] });
	if (ts.gaya === "ring") suara("ring");
	else if (ts.gaya === "papan") suara("pantul");
	if (ts.oleh === "pemain") {
		w.beruntun = 0;
		b.panas = false;
	}
}

// --- lawan warga ---
function gerakLawan(tx, tz, laju, dt) {
	const L = basket.lawan;
	const dx = tx - L.x;
	const dz = tz - L.z;
	const d = Math.hypot(dx, dz);
	if (d < 0.05) return 0;
	const s = Math.min(d, laju * dt);
	const nx = jepit(L.x + (dx / d) * s, LAPANGAN.x0 + 0.4, LAPANGAN.x1 - 0.4);
	const nz = jepit(L.z + (dz / d) * s, LAPANGAN.z0 + 0.4, LAPANGAN.z1 - 0.4);
	L.x = nx;
	L.z = nz;
	return s / Math.max(dt, 1e-3);
}

function majukanLawan(dt) {
	const b = basket;
	const L = b.lawan;
	const g = L.gerak;
	const dPemain = Math.hypot(posisi.x - L.x, posisi.z - L.z);
	let laju = 0;
	let hadapX = posisi.x;
	let hadapZ = posisi.z;
	g.isyarat = w.lawanTembakT > 0 ? "tembak" : w.lawanRebutT > 0 ? "rebut" : null;

	if (w.lawanGoyah > 0) {
		// terkecoh: terhuyung sejenak
	} else if (b.pegang === "lawan") {
		const rim = RIM[1];
		const d = Math.hypot(rim.x - L.x, rim.z - L.z);
		hadapX = rim.x;
		hadapZ = rim.z;
		if (w.lawanBidik > 0) {
			g.isyarat = "bidik";
			w.lawanBidik -= dt;
			if (w.lawanBidik <= 0) tembakLawan();
		} else {
			g.isyarat = "dribble";
			w.lawanGiring += dt;
			// menyerong menjauhi pemain yang menghadang
			const hadang = dPemain < 1.8 && (posisi.z - L.z) * (rim.z - L.z) > 0;
			const samping = hadang ? (L.x > posisi.x ? 2.2 : -2.2) : Math.sin(w.lawanGiring * 1.3) * 1.2;
			laju = gerakLawan(rim.x + samping, Math.max(L.z + 2, rim.z - 1.5), LAJU_LAWAN.giring, dt);
			// makin lapang makin cepat menembak; tidak selalu dari titik yang sama
			const siap = d < 5.5 && Math.random() < (dPemain > 1.6 ? 1.5 : 0.6) * dt;
			if (d < 1.8 || siap || w.lawanGiring > 6) w.lawanBidik = 0.45;
		}
	} else if (b.pegang === "pemain") {
		// menjaga: berdiri di antara pemain dan ring yang diserangnya
		const rim = RIM[0];
		const dx = rim.x - posisi.x;
		const dz = rim.z - posisi.z;
		const d = Math.hypot(dx, dz) || 1;
		const tertinggal = (L.z - rim.z) > (posisi.z - rim.z) + 0.5;
		laju = gerakLawan(posisi.x + (dx / d) * 1, posisi.z + (dz / d) * 1, tertinggal ? LAJU_LAWAN.kejar : LAJU_LAWAN.jaga, dt);
		if (w.lawanRebut <= 0 && dPemain < 1.05 && w.kebal <= 0) {
			w.lawanRebut = acak(1.1, 1.8);
			w.lawanRebutT = 0.3;
			const diam = Math.hypot(posisi.x - w.ax, posisi.z - w.az) < 0.01;
			const peluang = b.bidik ? 0.42 : diam ? 0.4 : 0.25;
			if (Math.random() < peluang) {
				pindahBola("lawan");
				w.kebal = 0.9;
				suara("pantul");
				kabar("Bola direbut lawan!", "#fca5a5");
			}
		}
	} else {
		// bola lepas (atau sedang terbang): mengejar titik jatuhnya
		hadapX = b.bola.x;
		hadapZ = b.bola.z;
		// bola hak pemain sesudah gol: lawan mundur ke tengah, tidak menyerobot
		if (b.hak === "pemain") laju = gerakLawan(RIM[0].x, (RIM[0].z + RIM[1].z) / 2, LAJU_LAWAN.jaga, dt);
		else if (b.bola.mode === "bebas") laju = gerakLawan(b.bola.x, b.bola.z, LAJU_LAWAN.bola, dt);
		else if (b.tembakan) laju = gerakLawan(RIM[b.tembakan.ring].x, RIM[b.tembakan.ring].z + (b.tembakan.ring ? -1.5 : 1.5), LAJU_LAWAN.jaga, dt);
	}

	// badan tidak saling menembus: lawan yang terdesak menggeser dirinya
	const jarak = Math.hypot(L.x - posisi.x, L.z - posisi.z) || 1;
	if (jarak < 0.6) {
		L.x = jepit(posisi.x + ((L.x - posisi.x) / jarak) * 0.6, LAPANGAN.x0 + 0.4, LAPANGAN.x1 - 0.4);
		L.z = jepit(posisi.z + ((L.z - posisi.z) / jarak) * 0.6, LAPANGAN.z0 + 0.4, LAPANGAN.z1 - 0.4);
	}
	const beda = Math.atan2(hadapX - L.x, hadapZ - L.z) - L.rot;
	L.rot += Math.atan2(Math.sin(beda), Math.cos(beda)) * (1 - Math.exp(-10 * dt));
	g.laju += ((laju > 0.1 ? (laju > 4.8 ? 1 : 0.7) : 0) - g.laju) * (1 - Math.exp(-10 * dt));
	g.fase += dt * (laju > 4.8 ? 13 : 9) * (laju > 0.1 ? 1 : 0);
	if (L.vy !== 0 || L.h > 0) {
		L.h += L.vy * dt;
		L.vy -= G * dt;
		if (L.h <= 0) {
			L.h = 0;
			L.vy = 0;
		}
	}
	g.udara = L.h > 0.05;
}

function ambilBolaLepas() {
	const b = basket;
	const o = b.bola;
	if (o.mode !== "bebas" || o.y > 1.9) return;
	const dP = Math.hypot(o.x - posisi.x, o.z - posisi.z);
	const dL = Math.hypot(o.x - b.lawan.x, o.z - b.lawan.z);
	if (dP < 0.85 && b.hak !== "lawan" && (dP <= dL || b.hak === "pemain")) {
		pindahBola("pemain");
		w.kebal = 0.7;
		beri();
	} else if (dL < 0.75 && b.hak !== "pemain") {
		pindahBola("lawan");
		w.lawanRebut = 0.5;
		beri();
	}
}

// Bola menempel titik lokal tokoh. Saat berpindah pemegang atau pose, bola meluncur singkat, tidak melompat.
function tempelBola(x, h, z, rot, lok, dt) {
	const o = basket.bola;
	const tx = x + Math.cos(rot) * lok.x + Math.sin(rot) * lok.z;
	const ty = h + lok.y;
	const tz = z - Math.sin(rot) * lok.x + Math.cos(rot) * lok.z;
	if (w.transisi > 0) {
		const f = 1 - Math.exp(-24 * dt);
		o.x += (tx - o.x) * f;
		o.y += (ty - o.y) * f;
		o.z += (tz - o.z) * f;
	} else {
		o.x = tx;
		o.y = ty;
		o.z = tz;
	}
}

// --- lomba antar-tamu: keadaan dari server ---
const tubuh = new Map(); // sid → { x, y, z, rot, laju } tamu lain seperti tampak di layar
const animPeserta = new Map(); // pid → { gaya, isi, pose, poseT }
const animDari = (pid) => {
	if (!animPeserta.has(pid)) animPeserta.set(pid, { gaya: gayaBaru(), isi: 0, pose: null, poseT: 0 });
	return animPeserta.get(pid);
};
const namaPeserta = (pid) => basket.online?.peserta.find((p) => p.pid === pid)?.nama ?? "Tamu";
const tubuhPeserta = (p) => tubuh.get(p.sid) || pemainLain.get(p.sid)?.s || null;

function petakanPegang(o) {
	if (!o.pemegang) return null;
	if (o.pemegang === o.saya?.pid) return "pemain";
	const p = o.peserta.find((q) => q.pid === o.pemegang);
	return p?.tim === (o.saya?.tim ?? 0) ? "kawan" : "lawan";
}

function masukOnline(m, saya) {
	const b = basket;
	Object.assign(b, { aktif: true, ikutOnline: true, jeda: false, koinLaga: 0, pemenang: null, bidik: false, isi: 0, panas: false, isyaratPemain: null, hadap: null, tembakan: null, kabar: null, sasaranOper: null, gaya: gayaBaru() });
	muatGiliran();
	if (m.fase === "mulai" || !dalamLapangan(posisi.x, posisi.z, -5)) {
		w.jedaBatal = 1.5; // teleport baru berlaku di frame berikutnya
		kendali.teleport = { x: saya.awal.x, z: saya.awal.z, lantai: 0, rot: saya.awal.rot, yaw: Math.PI / 2 };
	}
}

function terapkanEv(ev, m) {
	const b = basket;
	const saya = b.online?.saya;
	const milikku = saya && ev.pid === saya.pid;
	const nama = () => (milikku ? "Anda" : namaPeserta(ev.pid));
	const kawan = () => m.peserta.find((p) => p.pid === ev.pid)?.tim === (saya?.tim ?? 0);
	if (ev.k === "main") {
		suara("peluit");
		kabar("MAIN! Rebut bolanya!", "#4ade80");
		b.bola.mode = "bebas";
		Object.assign(b.bola, m.bola);
	} else if (ev.k === "tembak") {
		if (!milikku) Object.assign(animDari(ev.pid), { pose: "tembak", poseT: 0.55 });
		mulaiTerbang(ev, { jenis: "tembak", oleh: ev.pid, ring: ev.tim, masuk: ev.masuk, perfect: ev.perfect }, milikku ? 0.04 : 0.1);
	} else if (ev.k === "oper") {
		if (!milikku) Object.assign(animDari(ev.pid), { pose: "oper", poseT: 0.3 });
		mulaiTerbang({ titik: ev.titik, T: ev.T, gaya: "oper", pantul: null }, { jenis: "oper", oleh: ev.pid, masuk: false }, 0.05);
	} else if (ev.k === "tepis") {
		b.tembakan = null;
		suara("pantul");
		kabar(`BLOK oleh ${nama()}!`, kawan() ? "#4ade80" : "#fca5a5");
	} else if (ev.k === "rebut" || ev.k === "curi") {
		suara("pantul");
		kabar(`${nama()} ${ev.k === "curi" ? "memotong operan" : "merebut bola"}!`, kawan() ? "#4ade80" : "#fca5a5");
	} else if (ev.k === "skor") {
		const koinkah = milikku && b.ikutOnline;
		const panas = m.peserta.find((p) => p.pid === ev.pid)?.panas;
		if (koinkah) {
			const koin = ev.poin === 3 ? KOIN.tiga : KOIN.dua;
			b.koinLaga += koin;
			tambahKoin(koin);
			suara("koin");
			b.hujanKoin = { i: ev.tim, mulai: performance.now() };
		}
		const judul = ev.gaya === "dunk" ? "SLAM DUNK" : ev.poin === 3 ? "TIGA ANGKA" : "MASUK";
		const bantu = ev.asisten ? ` · asis ${namaPeserta(ev.asisten)}` : "";
		kabar(`${panas ? "🔥 " : ""}${judul}! ${nama()} +${ev.poin}${bantu}`, kawan() ? "#fde047" : "#fca5a5");
	} else if (ev.k === "hangus") kabar("Waktu serang habis!", "#fca5a5");
	else if (ev.k === "lanjut" && m.hak === saya?.tim) kabar("Ambil bola di bawah ring Anda!", "#fde047");
	else if (ev.k === "selesai") suara(m.menang === saya?.tim ? "jaya" : "peluit");
	else if (ev.k === "ambil" && milikku) suara("pantul");
}

function terimaOnline(m) {
	const b = basket;
	if (!m) {
		const ikut = b.ikutOnline;
		b.online = null;
		if (ikut) tutupBasket();
		return beri();
	}
	if (m.fase === "sendiri") {
		b.online = null;
		if (m.pid && m.pid === b.pidSaya) {
			pesanSistem("🏀 Belum ada lawan yang mendaftar — Anda bermain lawan warga.");
			mulaiBasket();
		}
		return beri();
	}
	const saya = m.peserta.find((p) => p.sid === idSocket() && !p.keluar) || null;
	if (saya) b.pidSaya = saya.pid;
	const lamaId = b.online?.id;
	const o = { ...m, saya, sampai: performance.now() + m.sisa };
	if (m.fase === "daftar") {
		if (lamaId !== m.id && !saya) pesanSistem(`🏀 Lomba basket dibuka di Taman Warga — daftar di lapangan (${Math.ceil(m.sisa / 1000)} dtk lagi)`);
		if (b.ikutOnline) {
			b.ikutOnline = false;
			b.aktif = false;
		}
		b.online = o;
		return beri();
	}
	if (TANDING.has(m.fase)) {
		if (b.aktif && !b.ikutOnline) {
			pesanSistem("🏀 Lapangan dipakai lomba, laga latihan dihentikan.");
			tutupBasket();
		}
		if (saya && !b.ikutOnline && b.keluarId !== m.id) masukOnline(m, saya);
	}
	if (b.ikutOnline && !saya && m.fase !== "selesai") {
		b.ikutOnline = false;
		b.aktif = false;
	}
	const gantiPemegang = b.online?.pemegang !== m.pemegang;
	b.online = o;
	const t = saya?.tim ?? 0;
	b.fase = m.fase;
	b.skor = { pemain: m.skor[t], lawan: m.skor[1 - t] };
	b.jam = m.jam / 1000;
	b.hak = m.hak == null ? null : m.hak === t ? "pemain" : "lawan";
	if (m.fase === "mulai") b.tunggu = m.sisa / 1000;
	else b.sisa = m.sisa / 1000;
	b.panas = !!m.peserta.find((p) => p.pid === (m.pemegang ?? m.ev?.pid))?.panas;
	// bola menunggu di tengah selama hitung mundur
	if (m.fase === "mulai") Object.assign(b.bola, { x: -58, y: 1.1, z: 19, vx: 0, vy: 0, vz: 0, mode: "diam" });
	if (m.ev) terapkanEv(m.ev, m);
	if (m.pemegang) {
		b.tembakan = null;
		b.bola.mode = "pegang";
		if (gantiPemegang) {
			w.transisi = 0.2;
			w.melepas = 0;
			const baru = m.pemegang === saya?.pid ? b.gaya : animDari(m.pemegang).gaya;
			baru.u = 0.5;
			if (m.pemegang !== saya?.pid) animDari(m.pemegang).gaya.sisi = m.sisi;
		}
	} else if (m.bola && !b.tembakan) {
		// fisika klien sama dengan server: hanya disamakan bila sudah berbeda jauh
		const jauh = Math.hypot(m.bola.x - b.bola.x, m.bola.y - b.bola.y, m.bola.z - b.bola.z) > 1.2;
		if (b.bola.mode !== "bebas" || jauh) Object.assign(b.bola, m.bola, { mode: "bebas" });
	}
	if (m.pemegang && m.ev?.k === "kecoh" && m.pemegang !== saya?.pid) animDari(m.pemegang).gaya.sisi = m.sisi;
	if (m.fase === "selesai" && b.ikutOnline) {
		b.pemenang = m.menang === t ? "pemain" : "lawan";
		b.bidik = false;
		b.hadap = null;
		b.isyaratPemain = null;
		if (b.hadiahId !== m.id) {
			b.hadiahId = m.id;
			// menang tanpa lawan (WO) tidak berhadiah
			const hadiah = m.wo || m.menang !== t ? 0 : KOIN_LOMBA.menang + (m.mvp === saya?.pid ? KOIN_LOMBA.mvp : 0);
			if (hadiah) {
				b.koinLaga += hadiah;
				tambahKoin(hadiah);
			}
		}
	}
	beri();
}
aturKaitBasket(terimaOnline);

// Dipanggil Tamu (PemainLain) tiap frame: pose peserta lain mengikuti keadaan laga.
export function animasiTamu(sid, gr, t, dt) {
	const o = basket.online;
	const p = o && TANDING.has(o.fase) ? o.peserta.find((q) => q.sid === sid && !q.keluar) : null;
	gr.halus = !!p;
	if (!p) return;
	let u = tubuh.get(sid);
	if (!u) tubuh.set(sid, (u = { x: 0, y: 0, z: 0, rot: 0, laju: 0 }));
	Object.assign(u, { x: t.x, y: t.y, z: t.z, rot: t.rot, laju: t.laju });
	const a = animDari(p.pid);
	a.poseT = Math.max(0, a.poseT - dt);
	if (o.pemegang === p.pid) {
		if (o.bidik === p.pid) {
			a.isi += dt / LAMA_BIDIK;
			gr.isyarat = "bidik";
			gr.bola = bolaBidik(a.isi);
		} else {
			a.isi = 0;
			majukanDribble(a.gaya, dt, t.laju, false);
			gr.isyarat = "dribble";
			gr.bola = a.gaya.lokal;
		}
	} else {
		a.isi = 0;
		gr.isyarat = a.poseT > 0 ? a.pose : null;
		gr.bola = a.pose === "oper" ? BOLA_OPER : null;
	}
}

// Badan tidak saling menembus: langkah yang mendekat ke peserta lain ditahan (dibaca Pemain.jsx).
export function halangBadan(x, z, ax, az) {
	const o = basket.online;
	if (!basket.ikutOnline || !o) return false;
	for (const p of o.peserta) {
		if (p.sid === idSocket() || p.keluar || p.putus) continue;
		const u = tubuhPeserta(p);
		if (!u) continue;
		const baru = Math.hypot(u.x - x, u.z - z);
		if (baru < 0.55 && baru < Math.hypot(u.x - ax, u.z - az)) return true;
	}
	return false;
}

function pilihOper(o) {
	const b = basket;
	const hx = Math.sin(posisi.rot);
	const hz = Math.cos(posisi.rot);
	let terbaik = null;
	let nilai = -Infinity;
	for (const p of o.peserta) {
		if (p.tim !== o.saya.tim || p.pid === o.saya.pid || p.putus || p.keluar) continue;
		const u = tubuhPeserta(p);
		if (!u) continue;
		const d = Math.hypot(u.x - posisi.x, u.z - posisi.z) || 1;
		const n = ((u.x - posisi.x) * hx + (u.z - posisi.z) * hz) / d - d * 0.03;
		if (n > nilai) [terbaik, nilai] = [{ x: u.x, z: u.z, pid: p.pid }, n];
	}
	b.sasaranOper = terbaik;
}

function majukanOnline(dt) {
	const b = basket;
	const o = b.online;
	if (b.aktif && w.jedaBatal <= 0 && !dalamLapangan(posisi.x, posisi.z, -5)) {
		tutupBasket(); // teleport atau naik kendaraan membawa pemain jauh dari lapangan: keluar lomba
		return;
	}
	for (const k of TIMER) w[k] = Math.max(0, w[k] - dt);
	const lajuPemain = Math.hypot(posisi.x - w.ax, posisi.z - w.az) / Math.max(dt, 1e-3);

	if (o.fase === "mulai") {
		const lama = Math.ceil(b.tunggu);
		b.tunggu = Math.max(0, b.tunggu - dt);
		if (Math.ceil(b.tunggu) !== lama) beri();
	} else if (o.fase === "main") {
		const lama = Math.ceil(b.sisa) * 100 + Math.ceil(b.jam);
		b.sisa = Math.max(0, b.sisa - dt);
		if (o.pemegang) b.jam = Math.max(0, b.jam - dt);
		if (Math.ceil(b.sisa) * 100 + Math.ceil(b.jam) !== lama) beri();
	}
	if (b.bidik) {
		b.isi += dt / LAMA_BIDIK;
		if (b.isi >= ISI_MAKS) lepasAksi();
	}
	b.pegang = w.melepas > 0 ? null : petakanPegang(o);
	if (b.pegang !== "pemain" && b.bidik) b.bidik = false;

	const h = (posisi.yTampil ?? posisi.y) - posisi.y;
	if (b.tembakan) majukanTerbang(dt);
	else if (w.melepas > 0) tempelBola(posisi.x, h, posisi.z, posisi.rot, b.bolaLokal || BOLA_LEPAS, dt);
	else if (b.bola.mode === "bebas") majukanBola(dt);
	else if (b.pegang === "pemain") {
		const dJaga = o.peserta.reduce((m, p) => (p.tim === o.saya.tim || p.keluar ? m : Math.min(m, Math.hypot((tubuhPeserta(p)?.x ?? 1e3) - posisi.x, (tubuhPeserta(p)?.z ?? 1e3) - posisi.z))), Infinity);
		if (b.bidik) b.bolaLokal = bolaBidik(b.isi);
		else {
			majukanDribble(b.gaya, dt, lajuPemain, dJaga < 1.8);
			b.bolaLokal = b.gaya.lokal;
		}
		tempelBola(posisi.x, h, posisi.z, posisi.rot, b.bolaLokal, dt);
	} else if (o.pemegang) {
		const p = o.peserta.find((q) => q.pid === o.pemegang);
		const u = p && tubuhPeserta(p);
		if (u) {
			const a = animDari(p.pid);
			tempelBola(u.x, Math.max(0, u.y - TANAH), u.z, u.rot, o.bidik === p.pid ? bolaBidik(a.isi) : a.gaya.lokal, dt);
		}
	}
	b.bola.putar += dt * (b.bola.mode === "terbang" ? 9 : b.bola.mode === "bebas" ? Math.hypot(b.bola.vx, b.bola.vz) * 3 : 6 * Math.min(1, lajuPemain * 0.2));

	if (b.aktif && o.saya) {
		const rim = RIM[o.saya.tim];
		b.hadap = b.bidik ? Math.atan2(rim.x - posisi.x, rim.z - posisi.z) : null;
		b.isyaratPemain = w.tembakT > 0 ? "tembak" : w.operT > 0 ? "oper" : w.rebutT > 0 ? "rebut" : b.bidik ? "bidik" : b.pegang === "pemain" ? "dribble" : null;
		if (b.isyaratPemain === "oper") b.bolaLokal = BOLA_OPER;
		if (b.pegang === "pemain") pilihOper(o);
		else b.sasaranOper = null;
	}
	w.ax = posisi.x;
	w.az = posisi.z;
}

// Dipanggil MainBasket.jsx tiap frame selama laga.
export function majukanBasket(dtMentah) {
	const b = basket;
	const dt = Math.min(dtMentah, 0.1); // batas sama dengan Pemain.jsx, supaya laju keduanya seimbang di HP
	if (sedangTanding()) {
		if (!b.jeda) majukanOnline(dt);
		return;
	}
	if (!b.aktif || b.jeda) return;
	// teleport, pingsan, atau naik kendaraan membawa pemain jauh dari lapangan: laga batal
	if (b.fase !== "selesai" && !dalamLapangan(posisi.x, posisi.z, -5)) {
		tutupBasket();
		return;
	}
	if (b.fase === "selesai") return;
	for (const k of TIMER) w[k] = Math.max(0, w[k] - dt);
	if (b.hak && w.hak <= 0) {
		b.hak = null; // tidak diambil: bola bebas supaya laga tidak bisa ditahan
		beri();
	}

	const lajuPemain = Math.hypot(posisi.x - w.ax, posisi.z - w.az) / Math.max(dt, 1e-3);

	if (b.fase === "mulai") {
		const lama = Math.ceil(b.tunggu);
		b.tunggu -= dt;
		if (b.tunggu <= 0) {
			b.fase = "main";
			suara("peluit");
			kabar("MAIN!", "#4ade80");
		} else if (Math.ceil(b.tunggu) !== lama) beri();
	} else if (b.fase === "skor") {
		b.tunggu -= dt;
		if (b.bola.mode === "bebas") majukanBola(dt);
		if (b.tunggu <= 0) {
			if (b.skor.pemain >= SKOR_MENANG || b.skor.lawan >= SKOR_MENANG || (b.sisa <= 0 && b.skor.pemain !== b.skor.lawan)) akhiri();
			else {
				// yang kebobolan mengambil bola sendiri di bawah ring yang dijaganya
				b.hak = b.bola.z < 19 ? "lawan" : "pemain";
				w.hak = LAMA_HAK;
				b.fase = "main";
				if (b.hak === "pemain") kabar("Ambil bola di bawah ring Anda!", "#fde047");
				beri();
			}
		}
	} else if (b.fase === "main") {
		const lama = Math.ceil(b.sisa);
		b.sisa = Math.max(0, b.sisa - dt);
		if (Math.ceil(b.sisa) !== lama) beri();
		// waktu habis & skor beda: selesai. Seri: bola terus berjalan, cetak angka berikutnya menang.
		if (b.sisa <= 0 && b.skor.pemain !== b.skor.lawan && !b.tembakan) {
			akhiri();
		}
		if (b.bidik) {
			b.isi += dt / LAMA_BIDIK;
			if (b.isi >= ISI_MAKS) lepasAksi();
		}
		if (b.bola.mode === "terbang" && b.tembakan) majukanTerbang(dt);
		else if (b.bola.mode === "bebas") {
			majukanBola(dt);
			ambilBolaLepas();
		}
		majukanLawan(dt);
	}

	if (b.fase === "mulai" || b.fase === "skor") {
		const g = b.lawan.gerak;
		g.laju += (0 - g.laju) * (1 - Math.exp(-10 * dt));
		g.isyarat = null;
		if (b.lawan.h > 0 || b.lawan.vy !== 0) {
			b.lawan.h = Math.max(0, b.lawan.h + b.lawan.vy * dt);
			b.lawan.vy = b.lawan.h > 0 ? b.lawan.vy - G * dt : 0;
			g.udara = b.lawan.h > 0.05;
		}
	}

	// bola & pose yang mengikutinya
	const dLawan = Math.hypot(b.lawan.x - posisi.x, b.lawan.z - posisi.z);
	if (b.pegang === "pemain") {
		if (b.bidik) b.bolaLokal = bolaBidik(b.isi);
		else {
			majukanDribble(b.gaya, dt, lajuPemain, dLawan < 1.8);
			b.bolaLokal = b.gaya.lokal;
		}
		tempelBola(posisi.x, (posisi.yTampil ?? posisi.y) - posisi.y, posisi.z, posisi.rot, b.bolaLokal, dt);
	} else if (b.pegang === "lawan") {
		const g = b.lawan.gerak;
		if (w.lawanBidik > 0) g.bola = bolaBidik(1 - w.lawanBidik / 0.45);
		else {
			majukanDribble(b.gayaLawan, dt, g.laju * 4, dLawan < 1.8);
			g.bola = b.gayaLawan.lokal;
		}
		tempelBola(b.lawan.x, b.lawan.h, b.lawan.z, b.lawan.rot, g.bola, dt);
	}
	b.bola.putar += dt * (b.bola.mode === "terbang" ? 9 : b.bola.mode === "bebas" ? Math.hypot(b.bola.vx, b.bola.vz) * 3 : 0);

	const rim = RIM[0];
	b.hadap = b.bidik ? Math.atan2(rim.x - posisi.x, rim.z - posisi.z) : null;
	b.isyaratPemain = w.tembakT > 0 ? "tembak" : w.rebutT > 0 ? "rebut" : b.bidik ? "bidik" : b.pegang === "pemain" ? "dribble" : null;
	w.ax = posisi.x;
	w.az = posisi.z;
}
