// Efek suara memancing, disintesis dengan WebAudio (tanpa berkas audio): ayunan & lemparan
// joran, cebur pelampung, sambaran, klik gulungan, senar putus, dan fanfare saat dapat.

const KUNCI = "jelajah-suara-mati";
let ctx = null;
let bising = null;

export const suaraMati = { nilai: (() => {
	try {
		return localStorage.getItem(KUNCI) === "1";
	} catch {
		return false;
	}
})() };

const pendengarMati = new Set();
export const dengarMati = (fn) => (pendengarMati.add(fn), () => pendengarMati.delete(fn));

export function aturSuara(mati) {
	suaraMati.nilai = mati;
	pendengarMati.forEach((fn) => fn(mati));
	try {
		localStorage.setItem(KUNCI, mati ? "1" : "0");
	} catch {
		/* abaikan */
	}
}

// Satu detik derau putih bersama (dipakai suara sekitar: angin, lalu lintas, keramaian).
export const derauPutih = () => bising;

// AudioContext bersama (efek suara & musik sendu); null bila peramban tak mendukung.
export function siapkan() {
	if (typeof window === "undefined") return null;
	if (!ctx) {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return null;
		ctx = new AC();
		// satu detik derau putih dipakai ulang untuk cipratan, desir, dan putus
		bising = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const d = bising.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
	}
	if (ctx.state === "suspended") ctx.resume();
	return ctx;
}

function nada(frek, mulai, lama, { tipe = "sine", vol = 0.2, ke = null } = {}) {
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = tipe;
	o.frequency.setValueAtTime(frek, mulai);
	if (ke) o.frequency.exponentialRampToValueAtTime(ke, mulai + lama);
	g.gain.setValueAtTime(0.0001, mulai);
	g.gain.exponentialRampToValueAtTime(vol, mulai + 0.01);
	g.gain.exponentialRampToValueAtTime(0.0001, mulai + lama);
	o.connect(g).connect(ctx.destination);
	o.start(mulai);
	o.stop(mulai + lama + 0.05);
}

function derau(mulai, lama, { frek = 1200, q = 0.8, vol = 0.3, ke = null, tipe = "bandpass" } = {}) {
	const s = ctx.createBufferSource();
	s.buffer = bising;
	const f = ctx.createBiquadFilter();
	f.type = tipe;
	f.frequency.setValueAtTime(frek, mulai);
	if (ke) f.frequency.exponentialRampToValueAtTime(ke, mulai + lama);
	f.Q.value = q;
	const g = ctx.createGain();
	g.gain.setValueAtTime(0.0001, mulai);
	g.gain.exponentialRampToValueAtTime(vol, mulai + 0.015);
	g.gain.exponentialRampToValueAtTime(0.0001, mulai + lama);
	s.connect(f).connect(g).connect(ctx.destination);
	// derau panjang (guntur) diulang supaya tidak terpotong di ujung penyangga 1 detik
	s.loop = lama > 0.5;
	s.start(mulai, Math.random() * 0.5);
	s.stop(mulai + lama + 0.05);
}

const RESEP = {
	ayun: (t) => derau(t, 0.35, { frek: 500, ke: 1800, vol: 0.08 }),
	lempar: (t) => {
		derau(t, 0.5, { frek: 2500, ke: 600, vol: 0.14 });
		for (let i = 0; i < 7; i++) nada(2200, t + i * 0.045, 0.02, { tipe: "square", vol: 0.03 });
	},
	cebur: (t) => {
		derau(t, 0.45, { frek: 900, ke: 250, vol: 0.35, tipe: "lowpass", q: 0.5 });
		nada(420, t, 0.18, { ke: 160, vol: 0.12 });
	},
	colek: (t) => nada(700, t, 0.08, { ke: 500, vol: 0.06 }),
	sambar: (t) => {
		nada(260, t, 0.25, { ke: 90, vol: 0.32 });
		derau(t, 0.35, { frek: 700, ke: 200, vol: 0.3, tipe: "lowpass" });
		nada(880, t + 0.02, 0.12, { tipe: "triangle", vol: 0.12 });
	},
	kail: (t) => {
		nada(1200, t, 0.06, { tipe: "square", vol: 0.06 });
		derau(t, 0.25, { frek: 600, vol: 0.2, tipe: "lowpass" });
	},
	klik: (t) => nada(1800 + Math.random() * 400, t, 0.015, { tipe: "square", vol: 0.025 }),
	gulung: (t) => {
		for (let i = 0; i < 6; i++) nada(1900, t + i * 0.04, 0.015, { tipe: "square", vol: 0.03 });
	},
	// gulungan berdesing saat ikan lari menarik senar keluar
	lari: (t) => {
		for (let i = 0; i < 16; i++) nada(2600 - i * 40, t + i * 0.035, 0.012, { tipe: "square", vol: 0.035 });
		derau(t, 0.6, { frek: 3000, ke: 1500, vol: 0.06, tipe: "bandpass", q: 3 });
	},
	sentak: (t) => {
		nada(140, t, 0.3, { tipe: "sawtooth", ke: 70, vol: 0.1 });
		derau(t, 0.3, { frek: 400, vol: 0.18, tipe: "lowpass" });
	},
	amuk: (t) => {
		nada(90, t, 0.9, { tipe: "sawtooth", ke: 45, vol: 0.2 });
		derau(t, 0.9, { frek: 300, ke: 120, vol: 0.35, tipe: "lowpass" });
	},
	lompat: (t) => {
		derau(t, 0.6, { frek: 1400, ke: 300, vol: 0.4, tipe: "lowpass" });
		nada(300, t + 0.5, 0.3, { ke: 120, vol: 0.12 });
	},
	setrum: (t) => {
		for (let i = 0; i < 10; i++) nada(90 + Math.random() * 60, t + i * 0.07, 0.06, { tipe: "square", vol: 0.08 });
		derau(t, 0.7, { frek: 4000, vol: 0.12, tipe: "highpass" });
	},
	putus: (t) => {
		nada(2400, t, 0.12, { tipe: "sawtooth", ke: 300, vol: 0.12 });
		derau(t, 0.18, { frek: 5000, vol: 0.2, tipe: "highpass" });
	},
	lepas: (t) => nada(330, t, 0.35, { ke: 180, vol: 0.1, tipe: "triangle" }),
	dapat: (t) => {
		[523, 659, 784, 1047].forEach((f, i) => nada(f, t + i * 0.09, 0.28, { tipe: "triangle", vol: 0.14 }));
		derau(t, 0.5, { frek: 900, ke: 250, vol: 0.25, tipe: "lowpass" });
	},
	guntur: (t) => {
		derau(t, 2.6, { frek: 160, ke: 60, vol: 0.55, tipe: "lowpass", q: 0.5 });
		derau(t + 0.25, 1.8, { frek: 90, ke: 40, vol: 0.45, tipe: "lowpass", q: 0.5 });
	},
	koin: (t) => {
		[988, 1319, 1568, 1976, 2637].forEach((f, i) => nada(f, t + i * 0.06, 0.22, { tipe: "square", vol: 0.05 }));
		[1319, 1976].forEach((f, i) => nada(f, t + 0.32 + i * 0.08, 0.3, { tipe: "triangle", vol: 0.08 }));
	},
	jaya: (t) => {
		[392, 523, 659, 784, 1047, 1319].forEach((f, i) => nada(f, t + i * 0.1, 0.5, { tipe: "triangle", vol: 0.15 }));
		[523, 659, 784].forEach((f) => nada(f, t + 0.7, 1.1, { tipe: "sine", vol: 0.1 }));
		derau(t, 0.8, { frek: 700, ke: 150, vol: 0.35, tipe: "lowpass" });
	},
};

// Desau hujan: derau putih berulang lewat penyaring pita, volume 0..1 mengikuti lebatnya.
let hujanSuara = null;
let volHujan = 0;
export function aturHujan(vol) {
	const v = suaraMati.nilai ? 0 : Math.max(0, Math.min(1, vol));
	if (Math.abs(v - volHujan) < 0.02 && (v > 0 || !hujanSuara)) return;
	volHujan = v;
	try {
		if (!siapkan()) return;
		if (!hujanSuara) {
			if (v <= 0) return;
			const src = ctx.createBufferSource();
			src.buffer = bising;
			src.loop = true;
			const f = ctx.createBiquadFilter();
			f.type = "bandpass";
			f.frequency.value = 1500;
			f.Q.value = 0.35;
			const g = ctx.createGain();
			g.gain.value = 0;
			src.connect(f).connect(g).connect(ctx.destination);
			src.start();
			hujanSuara = { src, g };
		}
		hujanSuara.g.gain.setTargetAtTime(v * 0.13, ctx.currentTime, 0.6);
	} catch {
		/* audio tidak tersedia */
	}
}

export function suara(nama) {
	if (suaraMati.nilai || !RESEP[nama]) return;
	try {
		if (!siapkan()) return;
		RESEP[nama](ctx.currentTime + 0.01);
	} catch {
		/* audio tidak tersedia */
	}
}

// Klakson kendaraan: mobil = dua nada "tiiin" yang tebal, motor = "tin" tipis & pendek.
// `vol` 0..1 untuk klakson tamu lain yang makin pelan bila makin jauh.
export function klakson(jenis = "mobil", vol = 1) {
	if (suaraMati.nilai || vol <= 0.02) return;
	try {
		if (!siapkan()) return;
		const t = ctx.currentTime + 0.01;
		const motor = jenis === "motor";
		const lama = motor ? 0.22 : 0.42;
		const f = ctx.createBiquadFilter();
		f.type = "lowpass";
		f.frequency.value = motor ? 3200 : 1800;
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.16 * vol, t + 0.015);
		g.gain.setValueAtTime(0.16 * vol, t + lama - 0.05);
		g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
		f.connect(g).connect(ctx.destination);
		for (const frek of motor ? [640, 805] : [415, 523]) {
			const o = ctx.createOscillator();
			o.type = motor ? "square" : "sawtooth";
			o.frequency.setValueAtTime(frek, t);
			o.connect(f);
			o.start(t);
			o.stop(t + lama + 0.05);
		}
	} catch {
		/* audio tidak tersedia */
	}
}
