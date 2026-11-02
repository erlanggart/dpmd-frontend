import { PEMBUKA, durasiFilm } from "./film";
import { derauPutih, siapkan, suaraMati } from "./suaraPancing";

// Suara di studio bioskop CCM (Lt 4), disintesis WebAudio:
// - dengung proyektor & riuh penonton sebelum film mulai (riuh mereda saat film berjalan);
// - bip pita hitung mundur;
// - musik latar film sesuai zamannya: "kuno" gamelan slendro (Tarumanagara), "kerajaan" pelog
//   + kendang (Pajajaran), "kolonial" wals piano (Buitenzorg), "modern" pop optimis (Tegar
//   Beriman) — diredam saat narator berbicara;
// - tepuk tangan saat film tamat.
// aturSuaraBioskop() dipanggil tiap frame oleh layar bioskop (MalCcm.jsx).

const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
let s = null;

function bangun(ctx) {
	const master = ctx.createGain();
	master.gain.value = 0;
	master.connect(ctx.destination);
	const musik = ctx.createGain();
	musik.gain.value = 0;
	musik.connect(master);
	// dengung proyektor: 50 Hz + derau kipas
	const dengung = ctx.createOscillator();
	dengung.frequency.value = 50;
	const dg = ctx.createGain();
	dg.gain.value = 0;
	dengung.connect(dg).connect(master);
	dengung.start();
	const kipas = ctx.createBufferSource();
	kipas.buffer = derauPutih();
	kipas.loop = true;
	const kf = ctx.createBiquadFilter();
	kf.type = "bandpass";
	kf.frequency.value = 420;
	kf.Q.value = 1.5;
	const kg = ctx.createGain();
	kg.gain.value = 0;
	kipas.connect(kf).connect(kg).connect(master);
	kipas.start();
	// riuh penonton
	const riuh = ctx.createBufferSource();
	riuh.buffer = derauPutih();
	riuh.loop = true;
	const rf = ctx.createBiquadFilter();
	rf.type = "bandpass";
	rf.frequency.value = 700;
	rf.Q.value = 1.2;
	const rg = ctx.createGain();
	rg.gain.value = 0;
	riuh.connect(rf).connect(rg).connect(master);
	riuh.start(0, 0.3);
	return { master, musik, dg, kg, rg, waktu: 0, langkah: 0, gaya: null, bipLalu: -1, filmLalu: null };
}

function nada(ctx, ke, t, f, lama, vol, tipe = "sine", serang = 0.005) {
	const o = ctx.createOscillator();
	o.type = tipe;
	o.frequency.value = f;
	const g = ctx.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(vol, t + serang);
	g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
	o.connect(g).connect(ke);
	o.start(t);
	o.stop(t + lama + 0.05);
}
function derau(ctx, ke, t, lama, vol, tipe, f, q = 1) {
	const src = ctx.createBufferSource();
	src.buffer = derauPutih();
	const fl = ctx.createBiquadFilter();
	fl.type = tipe;
	fl.frequency.value = f;
	fl.Q.value = q;
	const g = ctx.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
	g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
	src.connect(fl).connect(g).connect(ke);
	src.start(t, Math.random() * 0.8);
	src.stop(t + lama + 0.05);
}
// bilah logam gamelan: dasar + parsial tak harmonis
function bilah(ctx, ke, t, f, vol, lama = 1.6) {
	nada(ctx, ke, t, f, lama, vol, "sine", 0.002);
	nada(ctx, ke, t, f * 2.76, lama * 0.4, vol * 0.25, "sine", 0.002);
	nada(ctx, ke, t, f * 5.4, lama * 0.15, vol * 0.1, "sine", 0.002);
}
function gong(ctx, ke, t, vol) {
	nada(ctx, ke, t, 65, 4, vol, "sine", 0.02);
	nada(ctx, ke, t, 65 * 1.48, 3, vol * 0.4, "sine", 0.02);
	nada(ctx, ke, t, 130.5, 2.5, vol * 0.3, "sine", 0.02);
}
function kendang(ctx, ke, t, vol, tinggi = false) {
	const o = ctx.createOscillator();
	o.frequency.setValueAtTime(tinggi ? 320 : 150, t);
	o.frequency.exponentialRampToValueAtTime(tinggi ? 220 : 80, t + 0.12);
	const g = ctx.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
	o.connect(g).connect(ke);
	o.start(t);
	o.stop(t + 0.25);
}

// slendro (5 nada hampir setara) & pelog (perkiraan) dalam Hz
const SLENDRO = [294, 337, 390, 450, 516, 588, 674];
const PELOG = [294, 315, 350, 415, 440, 588, 630];
const MELODI_KUNO = [2, 3, 4, 3, 2, 1, 0, 1, 2, 4, 5, 4, 3, 2, 1, 2];
const MELODI_KERAJAAN = [0, 2, 3, 4, 3, 2, 0, 1, 2, 4, 5, 6, 5, 4, 2, 3];
const AKOR_WALS = [
	[60, 64, 67],
	[57, 60, 64],
	[62, 65, 69],
	[55, 59, 62],
];
const AKOR_POP = [
	[60, 64, 67],
	[55, 59, 62],
	[57, 60, 64],
	[53, 57, 60],
];

const GAYA = {
	kuno: { bpm: 72, ketuk(ctx, ke, t, i) {
		bilah(ctx, ke, t, SLENDRO[MELODI_KUNO[i % 16]], 0.05);
		if (i % 2 === 0) bilah(ctx, ke, t, SLENDRO[MELODI_KUNO[i % 16]] / 2, 0.035, 2.4);
		if (i % 16 === 0) gong(ctx, ke, t, 0.12);
	} },
	kerajaan: { bpm: 92, ketuk(ctx, ke, t, i) {
		bilah(ctx, ke, t, PELOG[MELODI_KERAJAAN[i % 16]], 0.045);
		if (i % 4 === 0) bilah(ctx, ke, t, PELOG[MELODI_KERAJAAN[i % 16]] / 2, 0.035, 2);
		if (i % 2 === 0) kendang(ctx, ke, t, 0.12);
		if (i % 4 === 3) kendang(ctx, ke, t, 0.08, true);
		if (i % 16 === 0) gong(ctx, ke, t, 0.1);
	} },
	kolonial: { bpm: 132, ketuk(ctx, ke, t, i) {
		const akor = AKOR_WALS[Math.floor(i / 6) % 4];
		if (i % 3 === 0) nada(ctx, ke, t, hz(akor[0] - 12), 1.1, 0.07, "triangle");
		else akor.forEach((n) => nada(ctx, ke, t, hz(n), 0.4, 0.025, "triangle"));
		if (i % 6 === 0) nada(ctx, ke, t, hz(akor[2] + 12), 1.4, 0.04, "sine", 0.02);
	} },
	modern: { bpm: 110, ketuk(ctx, ke, t, i) {
		const akor = AKOR_POP[Math.floor(i / 8) % 4];
		if (i % 4 === 0) {
			const o = ctx.createOscillator();
			o.frequency.setValueAtTime(120, t);
			o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
			const g = ctx.createGain();
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(0.18, t + 0.004);
			g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
			o.connect(g).connect(ke);
			o.start(t);
			o.stop(t + 0.35);
		}
		if (i % 4 === 2) derau(ctx, ke, t, 0.12, 0.06, "bandpass", 1800, 0.7);
		derau(ctx, ke, t, 0.04, 0.02, "highpass", 7000);
		if (i % 2 === 0) nada(ctx, ke, t, hz(akor[0] - 12), 0.3, 0.07, "sawtooth");
		if (i % 8 === 0) akor.forEach((n) => nada(ctx, ke, t, hz(n + 12), 1.6, 0.018, "sine", 0.1));
	} },
};

function tepukTangan(ctx, ke) {
	const t0 = ctx.currentTime;
	for (let i = 0; i < 70; i++) derau(ctx, ke, t0 + Math.random() * 3.2, 0.05, 0.05 + Math.random() * 0.06, "bandpass", 1200 + Math.random() * 1500, 1.5);
}

export function aturSuaraBioskop({ diStudio, film, t, jeda = false }) {
	const ctx = siapkan();
	if (!ctx || !derauPutih()) return;
	if (!s) {
		if (!diStudio) return;
		s = bangun(ctx);
	}
	const kini = ctx.currentTime;
	const mati = suaraMati.nilai;
	s.master.gain.setTargetAtTime(diStudio && !mati ? 1 : 0, kini, 0.4);
	if (!diStudio) {
		s.filmLalu = film;
		return;
	}
	const bicara = typeof window !== "undefined" && window.speechSynthesis?.speaking;
	s.dg.gain.setTargetAtTime(0.012, kini, 0.5);
	s.kg.gain.setTargetAtTime(0.006, kini, 0.5);
	s.rg.gain.setTargetAtTime(film ? 0.002 : 0.022, kini, 1.2);
	// film baru tamat (bukan dijeda) saat kita di studio: tepuk tangan
	if (s.filmLalu && !film && !jeda) tepukTangan(ctx, s.master);
	s.filmLalu = film;
	if (!film) {
		s.musik.gain.setTargetAtTime(0, kini, 0.5);
		s.gaya = null;
		return;
	}
	// bip pita hitung mundur
	if (t < PEMBUKA) {
		const detik = Math.floor(t / (PEMBUKA / 3));
		if (detik !== s.bipLalu) {
			s.bipLalu = detik;
			nada(ctx, s.master, kini + 0.01, 1000, 0.18, 0.06, "sine", 0.002);
		}
		s.musik.gain.setTargetAtTime(0, kini, 0.3);
		return;
	}
	s.bipLalu = -1;
	const gaya = GAYA[film.musik];
	if (s.gaya !== film.musik) {
		s.gaya = film.musik;
		s.waktu = kini + 0.1;
		s.langkah = 0;
	}
	const akhir = t > durasiFilm(film) - 9;
	s.musik.gain.setTargetAtTime(bicara ? 0.35 : akhir ? 1.2 : 0.8, kini, 0.4);
	const d = 60 / gaya.bpm / 2;
	if (s.waktu < kini) s.waktu = kini + 0.05;
	while (s.waktu < kini + 0.6) {
		gaya.ketuk(ctx, s.musik, s.waktu, s.langkah);
		s.langkah++;
		s.waktu += d;
	}
}
