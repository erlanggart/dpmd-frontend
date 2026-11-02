import { useSyncExternalStore } from "react";
import { musikPancingAktif } from "./musikJelajah";
import { derauPutih, siapkan, suaraMati } from "./suaraPancing";

// Musik latar Jelajah, digubah langsung oleh WebAudio (tanpa berkas):
// - "berkendara": "Radio Jelajah" — pop riang 116 BPM (drum, bas, akor, melodi bertema)
//   selama naik mobil / motor;
// - "jalan": "Jalan Santai" — petikan gitar 88 BPM & siulan pelan saat berjalan di luar;
// - "mal": bossa lounge 104 BPM di dalam mal, McD, & toko.
// Diam saat musik memancing (sendu / laga / riang) berbunyi, saat suara dimatikan, atau saat
// musik latar dimatikan tamu; direndahkan saat ada orang berbicara (sintesis ucapan).

const KUNCI = "jelajah-musik-mati";
const pref = {
	mati: (() => {
		try {
			return localStorage.getItem(KUNCI) === "1";
		} catch {
			return false;
		}
	})(),
};
const pendengar = new Set();
export const useMusikMati = () =>
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => pref.mati,
	);
export function aturMusikLatar(mati) {
	pref.mati = mati;
	try {
		localStorage.setItem(KUNCI, mati ? "1" : "0");
	} catch {
		/* abaikan */
	}
	pendengar.forEach((f) => f());
}

const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// ---------- alat musik ----------

function amplop(ctx, tujuan, t, serang, lama, vol) {
	const g = ctx.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(vol, t + serang);
	g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
	g.connect(tujuan);
	return g;
}
function osc(ctx, tipe, f, t, lama, ke) {
	const o = ctx.createOscillator();
	o.type = tipe;
	o.frequency.setValueAtTime(f, t);
	o.connect(ke);
	o.start(t);
	o.stop(t + lama + 0.05);
	return o;
}
function saring(ctx, tipe, f, ke, q = 0.7) {
	const s = ctx.createBiquadFilter();
	s.type = tipe;
	s.frequency.value = f;
	s.Q.value = q;
	s.connect(ke);
	return s;
}
function derau(ctx, t, lama, vol, tipe, f, ke, q = 0.8) {
	const src = ctx.createBufferSource();
	src.buffer = derauPutih();
	const g = amplop(ctx, ke, t, 0.003, lama, vol);
	src.connect(saring(ctx, tipe, f, g, q));
	src.start(t, Math.random() * 0.8);
	src.stop(t + lama + 0.05);
}

const ALAT = {
	kick(ctx, ke, t, v) {
		const g = amplop(ctx, ke, t, 0.004, 0.32, v);
		const o = osc(ctx, "sine", 130, t, 0.32, g);
		o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
	},
	snare(ctx, ke, t, v) {
		derau(ctx, t, 0.16, v, "bandpass", 1900, ke, 0.6);
		osc(ctx, "triangle", 190, t, 0.09, amplop(ctx, ke, t, 0.002, 0.09, v * 0.6));
	},
	hat(ctx, ke, t, v, buka = false) {
		derau(ctx, t, buka ? 0.18 : 0.045, v, "highpass", 7500, ke);
	},
	sikat(ctx, ke, t, v) {
		derau(ctx, t, 0.09, v, "bandpass", 3200, ke, 0.5);
	},
	bas(ctx, ke, t, n, lama, v, tipe = "sawtooth") {
		const g = amplop(ctx, ke, t, 0.01, lama, v);
		osc(ctx, tipe, hz(n), t, lama, saring(ctx, "lowpass", 420, g, 1.2));
	},
	stab(ctx, ke, t, nada, lama, v) {
		const g = amplop(ctx, ke, t, 0.005, lama, v);
		const f = saring(ctx, "lowpass", 1700, g);
		nada.forEach((n) => osc(ctx, "square", hz(n), t, lama, f));
	},
	petik(ctx, ke, t, n, v) {
		const g = amplop(ctx, ke, t, 0.003, 0.9, v);
		osc(ctx, "triangle", hz(n), t, 0.9, saring(ctx, "lowpass", 2600, g));
		osc(ctx, "sine", hz(n + 12), t, 0.4, amplop(ctx, ke, t, 0.002, 0.4, v * 0.25));
	},
	epiano(ctx, ke, t, nada, lama, v) {
		nada.forEach((n) => {
			osc(ctx, "sine", hz(n), t, lama, amplop(ctx, ke, t, 0.006, lama, v));
			osc(ctx, "sine", hz(n) * 2.01, t, lama * 0.4, amplop(ctx, ke, t, 0.004, lama * 0.4, v * 0.18));
		});
	},
	lead(ctx, ke, t, n, lama, v) {
		const g = amplop(ctx, ke, t, 0.02, lama, v);
		const o = osc(ctx, "sawtooth", hz(n), t, lama, saring(ctx, "lowpass", 2400, g));
		const lfo = ctx.createOscillator();
		lfo.frequency.value = 5.5;
		const d = ctx.createGain();
		d.gain.value = 4;
		lfo.connect(d).connect(o.detune);
		lfo.start(t + 0.12);
		lfo.stop(t + lama + 0.05);
	},
	siul(ctx, ke, t, n, lama, v) {
		const g = amplop(ctx, ke, t, 0.05, lama, v);
		const o = osc(ctx, "sine", hz(n), t, lama, g);
		const lfo = ctx.createOscillator();
		lfo.frequency.value = 5;
		const d = ctx.createGain();
		d.gain.value = 9;
		lfo.connect(d).connect(o.detune);
		lfo.start(t);
		lfo.stop(t + lama + 0.05);
	},
};

// ---------- lagu ----------
// Tiap birama 8 seperdelapan. melodi: nomor MIDI per seperdelapan, null = diam,
// "-" = nada sebelumnya disambung.
const _ = null;
const L = "-";
const AKOR = {
	Am: [57, 60, 64], F: [53, 57, 60], C: [52, 55, 60], G: [55, 59, 62], Em: [52, 55, 59], D: [54, 57, 62],
	Cmaj7: [52, 55, 59, 60], Am7: [55, 57, 60, 64], Dm7: [53, 57, 60, 62], G7: [53, 55, 59, 62], Fmaj7: [52, 53, 57, 60], Em7: [50, 55, 59, 64],
};

const LAGU = {
	berkendara: {
		bpm: 116,
		vol: 0.42,
		akor: ["Am", "F", "C", "G", "Am", "F", "C", "G", "F", "G", "Em", "Am", "F", "G", "C", "C"],
		melodi: [
			[76, L, 74, 72, 74, L, 76, L], [77, L, 76, 74, 72, L, L, _], [72, L, 74, 76, 79, L, 76, L], [74, L, L, 72, 74, L, 71, _],
			[76, L, 74, 72, 74, L, 76, L], [77, L, 76, 74, 72, L, L, _], [72, L, 74, 76, 79, L, 81, L], [79, 76, 74, 72, 69, L, L, _],
			[81, L, 79, 77, 76, L, 77, L], [79, L, 77, 76, 74, L, 72, _], [76, L, 74, 72, 71, L, 72, L], [69, L, L, _, 72, L, 76, _],
			[77, L, 76, 77, 79, L, 81, L], [79, L, 77, 76, 74, L, L, _], [72, L, L, L, L, L, _, _], [_, _, _, _, _, _, _, _],
		],
		main(ctx, ke, t, b, i, d, akor, nadaMel, lamaMel) {
			const isi = b % 16 === 15;
			if (!isi && [0, 3, 4].includes(i)) ALAT.kick(ctx, ke, t, 0.5);
			if (i === 2 || i === 6) ALAT.snare(ctx, ke, t, 0.2);
			if (isi && i >= 4) ALAT.snare(ctx, ke, t, 0.12 + i * 0.02);
			ALAT.hat(ctx, ke, t, i % 2 ? 0.05 : 0.035, i === 7);
			ALAT.bas(ctx, ke, t, akor[0] - 12 + (i === 6 ? 7 : i % 2 ? 12 : 0), d * 0.9, 0.16);
			if (i % 2) ALAT.stab(ctx, ke, t, akor, d * 0.6, 0.035);
			if (nadaMel) ALAT.lead(ctx, ke, t, nadaMel, lamaMel, 0.055);
		},
	},
	jalan: {
		bpm: 88,
		vol: 0.32,
		akor: ["G", "D", "Em", "C", "G", "D", "C", "D", "Em", "C", "G", "D", "C", "D", "G", "G"],
		melodi: [
			[71, L, L, 74, L, L, 71, _], [69, L, L, 66, L, L, _, _], [67, L, 69, 71, L, L, 74, _], [72, L, L, L, 71, L, 69, _],
			[71, L, L, 74, L, L, 76, _], [74, L, L, 72, 71, L, _, _], [69, L, 71, 72, L, L, 74, _], [72, L, 71, _, 69, L, L, _],
			[], [], [], [],
			[71, L, L, 74, L, L, 76, _], [74, L, L, 72, 71, L, _, _], [69, L, 71, 72, L, L, 74, _], [67, L, L, L, L, L, _, _],
		],
		main(ctx, ke, t, b, i, d, akor, nadaMel, lamaMel) {
			// petikan gitar: akar – kuint – oktaf – ters bergantian
			const pola = [akor[0], akor[2], akor[0] + 12, akor[1] + 12, akor[2] + 12, akor[1] + 12, akor[0] + 12, akor[2]];
			ALAT.petik(ctx, ke, t, pola[i], 0.06);
			if (i === 0 || i === 4) ALAT.bas(ctx, ke, t, akor[0] - 12, d * 3.5, 0.11, "triangle");
			if (i % 2) ALAT.sikat(ctx, ke, t, 0.018);
			if (nadaMel) ALAT.siul(ctx, ke, t, nadaMel + 12, lamaMel, 0.03);
		},
	},
	mal: {
		bpm: 104,
		vol: 0.3,
		akor: ["Cmaj7", "Am7", "Dm7", "G7", "Cmaj7", "Am7", "Dm7", "G7", "Fmaj7", "Em7", "Dm7", "G7", "Fmaj7", "Em7", "Dm7", "G7"],
		melodi: [
			[_, _, 76, L, 74, L, 72, _], [_, _, _, _, 69, L, 72, _], [_, _, 77, L, 76, L, 74, _], [71, L, L, L, _, _, _, _],
			[_, _, 76, L, 79, L, 76, _], [_, _, 72, L, 69, L, _, _], [_, _, 74, L, 77, L, 81, _], [79, L, L, L, _, _, _, _],
			[_, _, 81, L, 79, L, 77, _], [76, L, L, _, 74, L, _, _], [_, _, 77, L, 76, L, 74, _], [72, L, L, L, 71, L, _, _],
			[_, _, 81, L, 79, L, 77, _], [76, L, 79, _, 76, L, _, _], [74, L, 77, L, 76, L, 74, _], [72, L, L, L, L, L, _, _],
		],
		main(ctx, ke, t, b, i, d, akor, nadaMel, lamaMel) {
			if ([0, 3, 6].includes(i)) ALAT.epiano(ctx, ke, t, akor, d * 2.2, 0.03);
			const bas = { 0: 0, 3: 7, 4: 0, 7: 7 }[i];
			if (bas !== undefined) ALAT.bas(ctx, ke, t, akor[0] - 12 + bas, d * 1.6, 0.13, "triangle");
			ALAT.sikat(ctx, ke, t, i % 2 ? 0.014 : 0.008);
			if (nadaMel) ALAT.epiano(ctx, ke, t, [nadaMel], lamaMel, 0.035);
		},
	},
};

// panjang nada melodi (detik) dari tanda sambung "-" sesudahnya
function lamaNada(mel, i, d) {
	let n = 1;
	while (i + n < 8 && mel[i + n] === L) n++;
	return n * d * 0.95;
}

// ---------- pengatur ----------

const latar = { jenis: null, master: null, ke: null, waktu: 0, langkah: 0, timer: null };

function jadwalkan() {
	const ctx = siapkan();
	if (!ctx || !latar.ke || !derauPutih()) return;
	const lagu = LAGU[latar.jenis];
	const kini = ctx.currentTime;
	const bicara = typeof window !== "undefined" && window.speechSynthesis?.speaking;
	const target = !lagu || pref.mati || suaraMati.nilai || musikPancingAktif() ? 0.0001 : lagu.vol * (bicara ? 0.45 : 1);
	latar.master.gain.setTargetAtTime(target, kini, 0.5);
	if (!lagu || target < 0.001) {
		latar.waktu = 0;
		return;
	}
	const d = 60 / lagu.bpm / 2;
	if (latar.waktu < kini) latar.waktu = kini + 0.1;
	while (latar.waktu < kini + 1.0) {
		const b = Math.floor(latar.langkah / 8) % lagu.akor.length;
		const i = latar.langkah % 8;
		const mel = lagu.melodi[b] || [];
		const n = mel[i];
		lagu.main(ctx, latar.ke, latar.waktu, b, i, d, AKOR[lagu.akor[b]], typeof n === "number" ? n : null, typeof n === "number" ? lamaNada(mel, i, d) : 0);
		latar.langkah++;
		latar.waktu += d;
	}
}

// jenis: null | "jalan" | "berkendara" | "mal"
export function aturLatar(jenis) {
	const ctx = siapkan();
	if (!ctx) return;
	if (!latar.master) {
		latar.master = ctx.createGain();
		latar.master.gain.value = 0;
		latar.master.connect(ctx.destination);
	}
	if (jenis === latar.jenis) return;
	// lagu lama dipudarkan di bus-nya sendiri, lagu baru mulai dari awal birama
	if (latar.ke) {
		const lama = latar.ke;
		lama.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6);
		setTimeout(() => lama.disconnect(), 4000);
	}
	latar.jenis = jenis;
	latar.langkah = 0;
	latar.waktu = 0;
	latar.ke = ctx.createGain();
	latar.ke.gain.value = 1;
	latar.ke.connect(latar.master);
	if (!latar.timer) latar.timer = setInterval(jadwalkan, 250);
	jadwalkan();
}

export function hentikanLatar() {
	clearInterval(latar.timer);
	latar.timer = null;
	const ctx = siapkan();
	if (ctx && latar.master) latar.master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
	latar.jenis = null;
}
