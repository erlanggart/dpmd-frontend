import { dengarMati, siapkan, suaraMati } from "./suaraPancing";

// Musik di Situ Pemda, mengikuti jalannya memancing:
// - sendu: selama naik perahu & menunggu sambaran — digubah langsung oleh WebAudio
//   (pad A minor yang pelan, bas, dan melodi pentatonis bergema), tanpa berkas;
// - laga: sejak strike sampai ikan terangkat — backsound "Ajojing" / "Mancing Mania"
//   (dari backsound voting SIMPASKOR; Mancing Mania untuk ikan Epik ke atas), diulang;
// - riang: lagu "selamat" yang ceria (C mayor, cepat) selama kartu hasil tangkapan tampil.
// Sendu diredam selama laga atau riang berbunyi.

const LAGU_LAGA = { ajojing: "/audio/jelajah/ajojing.mp3", mania: "/audio/jelajah/mancing-mania.mp3" };
let laga = null;

export function putarLaga(kelas) {
	hentikanLaga();
	if (suaraMati.nilai) return false;
	try {
		laga = new Audio(kelas >= 2 ? LAGU_LAGA.mania : LAGU_LAGA.ajojing);
		laga.volume = 0.7;
		laga.loop = true;
		laga.play()?.catch?.(() => (laga = null));
		return true;
	} catch {
		laga = null;
		return false;
	}
}

export function hentikanLaga() {
	if (!laga) return;
	const a = laga;
	laga = null;
	// diturunkan pelan supaya tidak terpotong kasar
	const t0 = performance.now();
	const v0 = a.volume;
	const turun = setInterval(() => {
		const f = (performance.now() - t0) / 500;
		if (f >= 1) {
			clearInterval(turun);
			a.pause();
		} else a.volume = v0 * (1 - f);
	}, 40);
}

const sedangRiang = () => riang.aktif;
const sedangLaga = () => !!laga;

// ---------- musik sendu generatif ----------

const BPM = 66;
const KETUK = 60 / BPM;
// A minor: Am – F – C – G – Am – Em – F – E (frekuensi nada akor, oktaf 3–4)
const nada = (n) => 440 * Math.pow(2, (n - 69) / 12); // nomor MIDI → Hz
const AKOR = [
	[57, 60, 64],
	[53, 57, 60],
	[48, 55, 64],
	[55, 59, 62],
	[57, 60, 64],
	[52, 55, 59],
	[53, 57, 60],
	[52, 56, 59],
];
const PENTATONIS = [69, 72, 74, 76, 79, 81, 84]; // A C D E G A C

const sendu = { aktif: false, master: null, gemaMasuk: null, waktuAkor: 0, akor: 0, ketuk: 0, nadaMelodi: 3, timer: null };

function bangun(ctx) {
	if (sendu.master) return;
	const master = ctx.createGain();
	master.gain.value = 0;
	master.connect(ctx.destination);
	// gema: delay dengan umpan balik, sedikit diredam di nada tinggi
	const delay = ctx.createDelay(2);
	delay.delayTime.value = KETUK * 0.75;
	const umpan = ctx.createGain();
	umpan.gain.value = 0.38;
	const redam = ctx.createBiquadFilter();
	redam.type = "lowpass";
	redam.frequency.value = 2400;
	delay.connect(redam).connect(umpan).connect(delay);
	const gema = ctx.createGain();
	gema.gain.value = 0.55;
	delay.connect(gema).connect(master);
	sendu.master = master;
	sendu.gemaMasuk = delay;
}

function pad(ctx, frek, mulai, lama, vol) {
	const f = ctx.createBiquadFilter();
	f.type = "lowpass";
	f.frequency.value = 850;
	const g = ctx.createGain();
	g.gain.setValueAtTime(0.0001, mulai);
	g.gain.linearRampToValueAtTime(vol, mulai + 1.4);
	g.gain.setValueAtTime(vol, mulai + lama - 0.4);
	g.gain.linearRampToValueAtTime(0.0001, mulai + lama + 1.2);
	f.connect(g).connect(sendu.master);
	for (const geser of [-6, 5]) {
		const o = ctx.createOscillator();
		o.type = "triangle";
		o.frequency.value = frek;
		o.detune.value = geser;
		o.connect(f);
		o.start(mulai);
		o.stop(mulai + lama + 1.3);
	}
}

function petik(ctx, frek, mulai, vol) {
	const g = ctx.createGain();
	g.gain.setValueAtTime(0.0001, mulai);
	g.gain.exponentialRampToValueAtTime(vol, mulai + 0.02);
	g.gain.exponentialRampToValueAtTime(0.0001, mulai + 2.2);
	g.connect(sendu.master);
	g.connect(sendu.gemaMasuk);
	for (const [tipe, kali, v] of [
		["sine", 1, 1],
		["triangle", 2, 0.18],
	]) {
		const o = ctx.createOscillator();
		o.type = tipe;
		o.frequency.value = frek * kali;
		const gv = ctx.createGain();
		gv.gain.value = v;
		o.connect(gv).connect(g);
		o.start(mulai);
		o.stop(mulai + 2.3);
	}
}

// Menjadwalkan ketukan yang jatuh dalam 1,2 detik ke depan.
function jadwalkan() {
	const ctx = siapkan();
	if (!ctx || !sendu.master) return;
	const kini = ctx.currentTime;
	if (sendu.waktuAkor < kini) sendu.waktuAkor = kini + 0.1;
	while (sendu.waktuAkor < kini + 1.2) {
		const t = sendu.waktuAkor;
		const ketukDalamAkor = sendu.ketuk % 4;
		if (ketukDalamAkor === 0) {
			const akor = AKOR[sendu.akor % AKOR.length];
			akor.forEach((n) => pad(ctx, nada(n), t, KETUK * 4, 0.028));
			pad(ctx, nada(akor[0] - 12), t, KETUK * 4, 0.04);
			sendu.akor++;
		}
		// melodi berjalan pelan di tangga pentatonis, sesekali diam
		if (Math.random() < (ketukDalamAkor === 0 ? 0.85 : 0.5)) {
			sendu.nadaMelodi = Math.max(0, Math.min(PENTATONIS.length - 1, sendu.nadaMelodi + Math.round((Math.random() - 0.5) * 3)));
			petik(ctx, nada(PENTATONIS[sendu.nadaMelodi]), t + (Math.random() < 0.3 ? KETUK / 2 : 0), 0.05);
		}
		sendu.ketuk++;
		sendu.waktuAkor += KETUK;
	}
	// redam saat musik laga / riang berbunyi atau suara dimatikan
	const target = suaraMati.nilai || sedangLaga() || sedangRiang() ? 0.0001 : 0.6;
	sendu.master.gain.setTargetAtTime(target, kini, 0.6);
}

export function aturSendu(aktif) {
	if (aktif === sendu.aktif) return;
	sendu.aktif = aktif;
	if (aktif) {
		const ctx = siapkan();
		if (!ctx) return;
		bangun(ctx);
		sendu.waktuAkor = 0;
		clearInterval(sendu.timer);
		sendu.timer = setInterval(jadwalkan, 250);
		jadwalkan();
	} else {
		clearInterval(sendu.timer);
		sendu.timer = null;
		const ctx = siapkan();
		if (ctx && sendu.master) sendu.master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.5);
	}
}

// ---------- musik riang "selamat" generatif ----------
// C – G – Am – F (I–V–vi–IV) 132 BPM: bas berdentum, akor "oom-pah", arpeggio lonceng,
// dan hi-hat derau. Dimulai dengan fanfare singkat.

const BPM_RIANG = 132;
const SETENGAH = 60 / BPM_RIANG / 2; // per seperdelapan
const AKOR_RIANG = [
	[60, 64, 67],
	[55, 59, 62],
	[57, 60, 64],
	[53, 57, 60],
];
const riang = { aktif: false, master: null, waktu: 0, langkah: 0, timer: null, derau: null };

function nadaRiang(ctx, frek, mulai, lama, { tipe = "triangle", vol = 0.1, tujuan } = {}) {
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = tipe;
	o.frequency.value = frek;
	g.gain.setValueAtTime(0.0001, mulai);
	g.gain.exponentialRampToValueAtTime(vol, mulai + 0.01);
	g.gain.exponentialRampToValueAtTime(0.0001, mulai + lama);
	o.connect(g).connect(tujuan || riang.master);
	o.start(mulai);
	o.stop(mulai + lama + 0.05);
}

function hihat(ctx, mulai, vol) {
	if (!riang.derau) {
		riang.derau = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
		const d = riang.derau.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
	}
	const s = ctx.createBufferSource();
	s.buffer = riang.derau;
	const f = ctx.createBiquadFilter();
	f.type = "highpass";
	f.frequency.value = 7000;
	const g = ctx.createGain();
	g.gain.setValueAtTime(vol, mulai);
	g.gain.exponentialRampToValueAtTime(0.0001, mulai + 0.06);
	s.connect(f).connect(g).connect(riang.master);
	s.start(mulai);
	s.stop(mulai + 0.08);
}

function jadwalRiang() {
	const ctx = siapkan();
	if (!ctx || !riang.master) return;
	const kini = ctx.currentTime;
	if (riang.waktu < kini) riang.waktu = kini + 0.05;
	while (riang.waktu < kini + 0.6) {
		const t = riang.waktu;
		const i = riang.langkah % 8; // 8 seperdelapan per akor (satu birama)
		const akor = AKOR_RIANG[Math.floor(riang.langkah / 8) % AKOR_RIANG.length];
		if (i === 0 || i === 4) nadaRiang(ctx, nada(akor[0] - 24), t, SETENGAH * 1.8, { tipe: "square", vol: 0.07 });
		if (i === 2 || i === 6) akor.forEach((n) => nadaRiang(ctx, nada(n), t, SETENGAH * 0.9, { vol: 0.05 }));
		// arpeggio lonceng naik-turun
		const pola = [0, 1, 2, 1, 2, 0, 1, 2];
		const naik = i >= 4 ? 12 : 0;
		nadaRiang(ctx, nada(akor[pola[i]] + 12 + naik), t, SETENGAH * 1.6, { tipe: "sine", vol: 0.06 });
		hihat(ctx, t, i % 2 ? 0.05 : 0.025);
		riang.langkah++;
		riang.waktu += SETENGAH;
	}
}

export function putarRiang() {
	if (riang.aktif || suaraMati.nilai) return;
	const ctx = siapkan();
	if (!ctx) return;
	if (!riang.master) {
		riang.master = ctx.createGain();
		riang.master.connect(ctx.destination);
	}
	riang.aktif = true;
	riang.master.gain.cancelScheduledValues(ctx.currentTime);
	riang.master.gain.setValueAtTime(0.9, ctx.currentTime);
	// fanfare pembuka: "ta-ta-ta-taaa"
	const t = ctx.currentTime + 0.05;
	[67, 67, 67, 72].forEach((n, k) => nadaRiang(ctx, nada(n), t + k * 0.13, k === 3 ? 0.7 : 0.12, { tipe: "square", vol: 0.07 }));
	[64, 67, 72].forEach((n) => nadaRiang(ctx, nada(n), t + 0.39, 0.8, { vol: 0.05 }));
	riang.langkah = 0;
	riang.waktu = t + 1.0;
	clearInterval(riang.timer);
	riang.timer = setInterval(jadwalRiang, 200);
}

export function hentikanRiang() {
	if (!riang.aktif) return;
	riang.aktif = false;
	clearInterval(riang.timer);
	riang.timer = null;
	const ctx = siapkan();
	if (ctx && riang.master) riang.master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
}

dengarMati((mati) => {
	if (mati) {
		hentikanLaga();
		hentikanRiang();
	}
});
