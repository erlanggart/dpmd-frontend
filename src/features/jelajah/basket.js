import { useSyncExternalStore } from "react";
import { kendali, posisi } from "./jelajahStore";
import { tambahKoin } from "./pancing";
import { LAPANGAN, RING_BASKET } from "./scene/tamanWargaData";
import { suara } from "./suaraPancing";

// Basket satu lawan satu di lapangan Taman Warga. Pemain tetap berjalan lewat Pemain.jsx; modul ini
// memegang bola, lawan, dan skor. Koordinat adegan; y relatif tanah halaman (sama dengan TamanWarga).
// Pemain menyerang ring z kecil (RIM[0]), lawan menyerang ring z besar (RIM[1]).

export const LAMA_LAGA = 90;
export const SKOR_MENANG = 11;
export const KOIN = { dua: 10, tiga: 20, perfect: 5, menang: 50 };
export const JARAK_TIGA = 6;
// bilah tembakan: isi 0..1 dalam LAMA_BIDIK detik; lepas di dalam zona = PERFECT
export const LAMA_BIDIK = 0.85;
export const ZONA = { dari: 0.7, sampai: 0.88 };
export const ISI_MAKS = 1.35;
const G = 9.8;
const R_BOLA = 0.12;
export const LANTAI = 0.07 + R_BOLA;
const TINGGI_RIM = 3.05;
const TINGGI_LEPAS = 2.15;
const LAJU_LAWAN = { jaga: 4.6, kejar: 6.2, bola: 5.4, giring: 4.3 };

export const RIM = RING_BASKET.map((r) => ({ x: r.x, z: r.z + 0.5 * r.arah, y: TINGGI_RIM, papanZ: r.z + 0.18 * r.arah }));

const jepit = (v, a, b) => Math.max(a, Math.min(b, v));
const acak = (a, b) => a + Math.random() * (b - a);

// --- rumus peluang: dipisah supaya bisa diuji tanpa adegan ---
export const kontesDari = (jarak) => jepit(1 - jarak / 1.6, 0, 1);
export const perfectDari = (isi) => isi >= ZONA.dari && isi <= ZONA.sampai;
export function peluangPemain(isi, jarak, kontes) {
	if (perfectDari(isi)) return jepit(0.97 - Math.max(0, jarak - 6) * 0.045, 0.6, 0.97) * (1 - kontes * 0.3);
	const mutu = 1 - Math.min(1, Math.abs(isi - 0.79) / 0.55);
	return (0.1 + 0.5 * mutu) * jepit(1.1 - jarak * 0.075, 0.25, 1) * (1 - kontes * 0.6);
}
export const peluangLawan = (jarak, kontes) => jepit(0.62 - jarak * 0.05, 0.18, 0.58) * (1 - kontes * 0.7);

// Lintasan parabola dari p ke t tepat dalam T detik.
export function lintasan(p, t, T) {
	return { vx: (t.x - p.x) / T, vy: (t.y - p.y + 0.5 * G * T * T) / T, vz: (t.z - p.z) / T };
}

export const basket = {
	aktif: false,
	jeda: false,
	fase: "mulai", // mulai | main | skor | selesai
	tunggu: 0,
	sisa: LAMA_LAGA,
	skor: { pemain: 0, lawan: 0 },
	koinLaga: 0,
	pemenang: null,
	pegang: "pemain", // pemain | lawan | null
	bidik: false,
	isi: 0,
	sisi: 1, // tangan penggiring pemain: 1 kanan, -1 kiri
	dribbleU: 0,
	isyaratPemain: null,
	hadap: null,
	bola: { x: 0, y: LANTAI, z: 0, vx: 0, vy: 0, vz: 0, mode: "pegang", putar: 0 },
	tembakan: null,
	lawan: { x: 0, z: 0, rot: 0, h: 0, vy: 0, gerak: { laju: 0, fase: 0, udara: false, isyarat: null, dribbleU: 0, dribbleSisi: 1 } },
	jaring: [0, 0], // waktu (performance.now) ayunan jaring tiap ring
	hujanKoin: null, // { i: indeks ring, mulai } untuk semburan koin
	kabar: null, // { id, teks, warna }
};

// waktu & jeda aksi: disimpan terpisah dari state yang dibaca UI
const w = { kebal: 0, rebut: 0, rebutT: 0, kecoh: 0, kebut: 0, lajuPelan: 0, tembakT: 0, lawanRebut: 0, lawanRebutT: 0, lawanTembakT: 0, lawanGoyah: 0, lawanBidik: 0, lawanGiring: 0, ax: 0, az: 0, kabarId: 0 };

const pendengar = new Set();
let versi = 0;
const beri = () => {
	versi++;
	pendengar.forEach((f) => f());
};
export function useBasket() {
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => versi,
	);
	return basket;
}

function kabar(teks, warna = "#ffffff") {
	basket.kabar = { id: ++w.kabarId, teks, warna };
	beri();
}

export const dalamLapangan = (x, z, m = 0.25) => x > LAPANGAN.x0 + m && x < LAPANGAN.x1 - m && z > LAPANGAN.z0 + m && z < LAPANGAN.z1 - m;

export function mulaiBasket() {
	const b = basket;
	Object.assign(b, { aktif: true, jeda: false, fase: "mulai", tunggu: 3, sisa: LAMA_LAGA, koinLaga: 0, pemenang: null, pegang: "pemain", bidik: false, isi: 0, sisi: 1, dribbleU: 0, isyaratPemain: null, hadap: null, tembakan: null, kabar: null });
	b.skor = { pemain: 0, lawan: 0 };
	b.bola.mode = "pegang";
	Object.assign(b.lawan, { x: RIM[0].x, z: 15.5, rot: 0, h: 0, vy: 0 });
	Object.assign(b.lawan.gerak, { laju: 0, fase: 0, udara: false, isyarat: null, dribbleU: 0, dribbleSisi: 1 });
	Object.assign(w, { kebal: 0, rebut: 0, rebutT: 0, kecoh: 0, kebut: 0, lajuPelan: 0, tembakT: 0, lawanRebut: 2, lawanRebutT: 0, lawanTembakT: 0, lawanGoyah: 0, lawanBidik: 0, lawanGiring: 0, ax: -58, az: 20.5 });
	// kamera dari sisi tribun seperti siaran: dari ujung lapangan papan ring menutupi layar
	kendali.teleport = { x: -58, z: 20.5, lantai: 0, rot: Math.PI, yaw: Math.PI / 2 };
	beri();
}

export function tutupBasket() {
	basket.aktif = false;
	basket.bidik = false;
	basket.isyaratPemain = null;
	basket.hadap = null;
	basket.kabar = null;
	beri();
}

// Pengali kecepatan jalan pemain selama laga (dibaca Pemain.jsx).
export function faktorLaju() {
	if (basket.bidik) return 0;
	if (w.lajuPelan > 0) return 0.4;
	if (w.kebut > 0) return 1.3;
	return basket.pegang === "pemain" ? 0.88 : 1;
}

// E / tombol ditekan: membidik bila memegang bola, merebut bila bola di tangan lawan.
export function tekanAksi() {
	const b = basket;
	if (b.fase !== "main" || b.jeda) return;
	if (b.pegang === "pemain") {
		b.bidik = true;
		b.isi = 0;
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
	b.sisi = -b.sisi;
	w.kecoh = 1.5;
	w.kebut = 0.45;
	w.kebal = Math.max(w.kebal, 0.8);
	suara("pantul");
	if (Math.hypot(b.lawan.x - posisi.x, b.lawan.z - posisi.z) < 1.8) {
		w.lawanGoyah = 0.7;
		kabar("Lawan terkecoh!", "#fde047");
	}
	return true;
}

function cobaRebut() {
	const b = basket;
	if (w.rebut > 0) return;
	w.rebut = 1.1;
	w.rebutT = 0.3;
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
	b.bola.mode = "pegang";
	b.tembakan = null;
	w.lawanBidik = 0;
	w.lawanGiring = 0;
	if (ke !== "pemain") b.bidik = false;
}

// --- tembakan ---
function lepasBola(p, rim, masuk, jauhMeleset) {
	const b = basket;
	const d = Math.hypot(rim.x - p.x, rim.z - p.z);
	const T = 0.85 + d * 0.045;
	const asal = { x: p.x, y: TINGGI_LEPAS, z: p.z };
	let sasaran = { x: rim.x, y: rim.y, z: rim.z };
	if (!masuk) {
		// meleset: mengenai bibir ring, atau jauh tidak sampai (air ball) untuk tembakan buruk
		const sudut = jauhMeleset ? Math.atan2(p.x - rim.x, p.z - rim.z) + acak(-0.6, 0.6) : Math.random() * Math.PI * 2;
		const r = jauhMeleset ? acak(0.6, 1.2) : acak(0.27, 0.42);
		sasaran = { x: rim.x + Math.sin(sudut) * r, y: rim.y, z: rim.z + Math.cos(sudut) * r };
		const arahPapan = Math.sign(rim.z - rim.papanZ);
		if ((sasaran.z - rim.papanZ) * arahPapan < 0.13) sasaran.z = rim.papanZ + arahPapan * 0.13;
	}
	Object.assign(b.bola, asal, lintasan(asal, sasaran, T), { mode: "terbang" });
	b.pegang = null;
	return { T, t: 0, asal, jarak: d };
}

function tembakPemain() {
	const b = basket;
	const rim = RIM[0];
	const d = Math.hypot(rim.x - posisi.x, rim.z - posisi.z);
	const dLawan = Math.hypot(b.lawan.x - posisi.x, b.lawan.z - posisi.z);
	const perfect = perfectDari(b.isi);
	const masuk = Math.random() < peluangPemain(b.isi, d, kontesDari(dLawan));
	b.tembakan = { ...lepasBola(posisi, rim, masuk, !perfect && b.isi < 0.35), oleh: "pemain", i: 0, masuk, perfect, tiga: d > JARAK_TIGA, blok: !perfect && dLawan < 1.2 && Math.random() < 0.25 };
	w.tembakT = 0.5;
	kendali.loncat = true;
	if (dLawan < 1.5) lompatLawan();
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
	b.tembakan = { ...lepasBola(L, rim, masuk, false), oleh: "lawan", i: 1, masuk, perfect: false, tiga: d > JARAK_TIGA, blok: false };
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
	b.jaring[ts.i] = performance.now();
	suara("swish");
	if (ts.oleh === "pemain") {
		const koin = (ts.tiga ? KOIN.tiga : KOIN.dua) + (ts.perfect ? KOIN.perfect : 0);
		b.skor.pemain += poin;
		b.koinLaga += koin;
		tambahKoin(koin);
		suara("koin");
		b.hujanKoin = { i: ts.i, mulai: performance.now() };
		kabar(`${ts.perfect ? "PERFECT! " : "MASUK! "}+${poin} · +${koin} 🪙`, ts.perfect ? "#fde047" : "#ffffff");
	} else {
		b.skor.lawan += poin;
		kabar(`Lawan mencetak +${poin}`, "#fca5a5");
	}
	b.fase = "skor";
	b.tunggu = 1.5;
	b.tembakan = null;
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

// --- fisika bola bebas: gravitasi, papan, lantai, dan batas lapangan ---
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

function majukanTembakan(dt) {
	const b = basket;
	const ts = b.tembakan;
	const o = b.bola;
	ts.t += dt;
	// blok: lawan menepis tembakan biasa; pemain menepis bila meloncat tepat di depan bola
	if (ts.oleh === "pemain" && ts.blok && ts.t > 0.18) {
		tepis();
		kabar("Tembakan diblok!", "#fca5a5");
		return;
	}
	if (ts.oleh === "lawan" && ts.t < 0.35 && posisi.udara && Math.hypot(o.x - posisi.x, o.z - posisi.z) < 1.1) {
		tepis();
		kabar("BLOK! Bola ditepis!", "#4ade80");
		return;
	}
	if (ts.t < ts.T) {
		const t = ts.t;
		o.x = ts.asal.x + o.vx * t;
		o.y = ts.asal.y + o.vy * t - 0.5 * G * t * t;
		o.z = ts.asal.z + o.vz * t;
		return;
	}
	// tiba setinggi ring
	const rim = RIM[ts.i];
	const vyTiba = o.vy - G * ts.T;
	o.x = ts.asal.x + o.vx * ts.T;
	o.y = rim.y;
	o.z = ts.asal.z + o.vz * ts.T;
	o.mode = "bebas";
	if (ts.masuk) {
		o.vx *= 0.08;
		o.vz *= 0.08;
		o.vy = Math.max(vyTiba, -3.5);
		cetak(ts);
		return;
	}
	const nx = o.x - rim.x;
	const nz = o.z - rim.z;
	const r = Math.hypot(nx, nz) || 1;
	if (r < 0.5) {
		// membentur bibir ring lalu memantul ke luar
		suara("ring");
		const pantul = acak(1.6, 3);
		o.vx = (nx / r) * pantul;
		o.vz = (nz / r) * pantul;
		o.vy = Math.abs(vyTiba) * 0.45;
	} else o.vy = vyTiba;
	b.tembakan = null;
}

// --- lawan ---
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
		if (b.bola.mode === "bebas") laju = gerakLawan(b.bola.x, b.bola.z, LAJU_LAWAN.bola, dt);
		else if (b.tembakan) laju = gerakLawan(RIM[b.tembakan.i].x, RIM[b.tembakan.i].z + (b.tembakan.i ? -1.5 : 1.5), LAJU_LAWAN.jaga, dt);
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
	if (dP < 0.85 && dP <= dL) {
		pindahBola("pemain");
		w.kebal = 0.7;
		beri();
	} else if (dL < 0.75) {
		pindahBola("lawan");
		w.lawanRebut = 0.5;
		beri();
	}
}

// bola di tangan: memantul di samping penggiring, atau di atas kepala saat membidik
function bolaDiTangan(x, z, rot, sisi, bidik, u) {
	const o = basket.bola;
	const sx = Math.cos(rot);
	const sz = -Math.sin(rot);
	const dx = Math.sin(rot);
	const dz = Math.cos(rot);
	if (bidik) {
		o.x = x + dx * 0.14;
		o.y = 2.05;
		o.z = z + dz * 0.14;
		return;
	}
	o.x = x + sx * sisi * 0.32 + dx * 0.2;
	o.z = z + sz * sisi * 0.32 + dz * 0.2;
	o.y = LANTAI + (0.86 - LANTAI) * (1 - (2 * (u % 1) - 1) ** 2);
}

function dribble(u, dt, lajuNyata) {
	const baru = u + dt * (2.1 + Math.min(1.5, lajuNyata * 0.25));
	if (Math.floor(baru) !== Math.floor(u)) suara("pantul");
	return baru;
}

// Dipanggil MainBasket.jsx tiap frame selama laga.
export function majukanBasket(dtMentah) {
	const b = basket;
	if (!b.aktif || b.jeda) return;
	const dt = Math.min(dtMentah, 0.1); // batas sama dengan Pemain.jsx, supaya laju keduanya seimbang di HP
	// teleport, pingsan, atau naik kendaraan membawa pemain jauh dari lapangan: laga batal
	if (b.fase !== "selesai" && !dalamLapangan(posisi.x, posisi.z, -5)) {
		tutupBasket();
		return;
	}
	if (b.fase === "selesai") return;
	for (const k of ["kebal", "rebut", "rebutT", "kecoh", "kebut", "lajuPelan", "tembakT", "lawanRebut", "lawanRebutT", "lawanTembakT", "lawanGoyah"]) w[k] = Math.max(0, w[k] - dt);

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
				// yang kebobolan mendapat bola
				pindahBola(b.bola.z < 19 ? "lawan" : "pemain");
				w.kebal = 1.2;
				b.fase = "main";
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
		if (b.bola.mode === "terbang" && b.tembakan) majukanTembakan(dt);
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
	if (b.pegang === "pemain") {
		b.dribbleU = dribble(b.dribbleU, dt, lajuPemain);
		bolaDiTangan(posisi.x, posisi.z, posisi.rot, b.sisi, b.bidik, b.dribbleU);
	} else if (b.pegang === "lawan") {
		const g = b.lawan.gerak;
		g.dribbleU = dribble(g.dribbleU, dt, g.laju * 4);
		bolaDiTangan(b.lawan.x, b.lawan.z, b.lawan.rot, 1, w.lawanBidik > 0, g.dribbleU);
	}
	b.bola.putar += dt * (b.bola.mode === "terbang" ? 9 : b.bola.mode === "bebas" ? Math.hypot(b.bola.vx, b.bola.vz) * 3 : 0);

	const rim = RIM[0];
	b.hadap = b.bidik ? Math.atan2(rim.x - posisi.x, rim.z - posisi.z) : null;
	b.isyaratPemain = w.tembakT > 0 ? "tembak" : w.rebutT > 0 ? "rebut" : b.bidik ? "bidik" : b.pegang === "pemain" ? "dribble" : null;
	w.ax = posisi.x;
	w.az = posisi.z;
}
