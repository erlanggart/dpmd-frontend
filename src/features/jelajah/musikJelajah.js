import { dengarMati, siapkan, suaraMati } from "./suaraPancing";

// Musik di Situ Pemda:
// - Jingle saat ikan tertangkap: backsound "Ajojing" & "Mancing Mania" (diambil dari
//   backsound voting SIMPASKOR). Mancing Mania untuk ikan Epik ke atas.
// - Musik sendu selama naik perahu & memancing: digubah langsung oleh WebAudio
//   (pad A minor yang pelan, bas, dan melodi pentatonis bergema) — tanpa berkas.

const JINGLE = { ajojing: "/audio/jelajah/ajojing.mp3", mania: "/audio/jelajah/mancing-mania.mp3" };
let jingle = null;
let redamSampai = 0; // musik sendu diredam selama jingle berbunyi

export function putarJingle(kelas) {
	if (suaraMati.nilai) return false;
	try {
		jingle?.pause();
		jingle = new Audio(kelas >= 2 ? JINGLE.mania : JINGLE.ajojing);
		jingle.volume = 0.75;
		jingle.addEventListener("loadedmetadata", () => (redamSampai = performance.now() + jingle.duration * 1000));
		redamSampai = performance.now() + 10000;
		jingle.addEventListener("ended", () => (redamSampai = 0));
		const janji = jingle.play();
		janji?.catch?.(() => (redamSampai = 0));
		return true;
	} catch {
		return false;
	}
}

export function hentikanJingle() {
	jingle?.pause();
	jingle = null;
	redamSampai = 0;
}

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
	// redam saat jingle tangkapan berbunyi atau suara dimatikan
	const target = suaraMati.nilai || performance.now() < redamSampai ? 0.0001 : 0.6;
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

dengarMati((mati) => {
	if (mati) hentikanJingle();
});
