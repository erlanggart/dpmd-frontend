import { derauPutih, siapkan, suaraMati } from "./suaraPancing";

// Suara sekitar yang membuat kawasan tidak sunyi, semuanya disintesis WebAudio (tanpa berkas):
// - angin: derau lewat penyaring rendah, berembus naik-turun (lebih kencang saat berkendara);
// - lalu lintas: deru rendah sesuai banyak & dekatnya kendaraan;
// - keramaian: riuh rendah orang mengobrol (aula mal, McD, warung);
// - mesin: suara mobil / motor yang sedang dikemudikan — putaran naik lalu turun tiap ganti
//   gigi, deru knalpot mengikuti injakan gas;
// - kendaraan lain: tiga mesin terdekat + desir saat melintas (makin dekat makin keras);
// - langkah kaki tamu (jalan / lari) sesuai permukaan: rumput, aspal/ubin, papan kayu, air;
// - burung berkicau (siang, di luar) dan jangkrik (malam, di luar).
// aturSuasanaSuara() dipanggil beberapa kali per detik oleh scene/SuasanaHidup.jsx.

let s = null;

function loopDerau(ctx, tipe, frek, q) {
	const src = ctx.createBufferSource();
	src.buffer = derauPutih();
	src.loop = true;
	const f = ctx.createBiquadFilter();
	f.type = tipe;
	f.frequency.value = frek;
	f.Q.value = q;
	const g = ctx.createGain();
	g.gain.value = 0;
	src.connect(f).connect(g).connect(ctx.destination);
	src.start(0, Math.random());
	return { src, f, g };
}

function bangun(ctx) {
	const angin = loopDerau(ctx, "lowpass", 520, 0.7);
	const lalin = loopDerau(ctx, "lowpass", 170, 0.9);
	// keramaian: dua pita suara manusia, diayun cepat seperti suku kata yang tumpang-tindih
	const ramai = loopDerau(ctx, "bandpass", 620, 1.3);
	const ramai2 = loopDerau(ctx, "bandpass", 1150, 1.8);
	const ayun = ctx.createOscillator();
	ayun.frequency.value = 6.5;
	const kedalaman = ctx.createGain();
	kedalaman.gain.value = 0;
	ayun.connect(kedalaman);
	kedalaman.connect(ramai.g.gain);
	kedalaman.connect(ramai2.g.gain);
	ayun.start();
	// mesin: gergaji + kotak setengah frekuensi, diredam, diberi getar (motor)
	const m1 = ctx.createOscillator();
	m1.type = "sawtooth";
	const m2 = ctx.createOscillator();
	m2.type = "square";
	const mf = ctx.createBiquadFilter();
	mf.type = "lowpass";
	mf.Q.value = 2;
	const mg = ctx.createGain();
	mg.gain.value = 0;
	const getar = ctx.createOscillator();
	getar.frequency.value = 28;
	const getarG = ctx.createGain();
	getarG.gain.value = 0;
	getar.connect(getarG).connect(mg.gain);
	m1.connect(mf);
	m2.connect(mf);
	mf.connect(mg).connect(ctx.destination);
	m1.start();
	m2.start();
	getar.start();
	// knalpot: derau pita sempit di sekitar harmonik mesin
	const knalpot = loopDerau(ctx, "bandpass", 160, 2.5);
	// kendaraan lain di sekitar: tiga "suara" yang dipakai bergantian untuk yang terdekat
	const lain = [0, 1, 2].map(() => {
		const o = ctx.createOscillator();
		o.type = "sawtooth";
		const f = ctx.createBiquadFilter();
		f.type = "lowpass";
		f.frequency.value = 300;
		const g = ctx.createGain();
		g.gain.value = 0;
		o.connect(f).connect(g).connect(ctx.destination);
		o.start();
		const desir = loopDerau(ctx, "bandpass", 900, 0.8);
		return { o, f, g, desir, jarakLalu: 99 };
	});
	return { angin, lalin, ramai, ramai2, kedalaman, ayun, mesin: { m1, m2, mf, mg, getar, getarG, knalpot }, lain, embus: 0.5, burungLagi: 0, jangkrikLagi: 0 };
}

function kicau(ctx, t, vol) {
	const n = 2 + Math.floor(Math.random() * 4);
	const dasar = 2600 + Math.random() * 2200;
	for (let i = 0; i < n; i++) {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		const mulai = t + i * (0.09 + Math.random() * 0.05);
		const lama = 0.06 + Math.random() * 0.06;
		o.frequency.setValueAtTime(dasar * (0.9 + Math.random() * 0.25), mulai);
		o.frequency.exponentialRampToValueAtTime(dasar * (1.25 + Math.random() * 0.4), mulai + lama);
		g.gain.setValueAtTime(0.0001, mulai);
		g.gain.exponentialRampToValueAtTime(vol, mulai + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, mulai + lama);
		o.connect(g).connect(ctx.destination);
		o.start(mulai);
		o.stop(mulai + lama + 0.02);
	}
}

function krik(ctx, t, vol) {
	const o = ctx.createOscillator();
	o.frequency.value = 4300 + Math.random() * 500;
	const g = ctx.createGain();
	g.gain.value = 0;
	o.connect(g).connect(ctx.destination);
	const n = 3 + Math.floor(Math.random() * 4);
	for (let i = 0; i < n; i++) {
		const m = t + i * 0.055;
		g.gain.setValueAtTime(0.0001, m);
		g.gain.linearRampToValueAtTime(vol, m + 0.012);
		g.gain.linearRampToValueAtTime(0.0001, m + 0.035);
	}
	o.start(t);
	o.stop(t + n * 0.055 + 0.05);
}

// angin, lalin, ramai, burung, jangkrik: 0..1; mesin: null | { jenis: "mobil"|"motor", laju }
export function aturSuasanaSuara({ angin = 0, lalin = 0, ramai = 0, burung = 0, jangkrik = 0, mesin = null }) {
	const ctx = siapkan();
	if (!ctx || !derauPutih()) return;
	if (!s) s = bangun(ctx);
	const t = ctx.currentTime;
	const mati = suaraMati.nilai ? 0 : 1;
	// embusan angin: bergeser acak pelan
	s.embus = Math.max(0.2, Math.min(1, s.embus + (Math.random() - 0.5) * 0.25));
	s.angin.g.gain.setTargetAtTime(mati * angin * (0.012 + 0.03 * s.embus), t, 0.8);
	s.angin.f.frequency.setTargetAtTime(300 + 700 * s.embus * Math.min(1.5, angin), t, 0.8);
	s.lalin.g.gain.setTargetAtTime(mati * lalin * 0.07, t, 0.5);
	const r = mati * ramai;
	s.ramai.g.gain.setTargetAtTime(r * 0.03, t, 0.6);
	s.ramai2.g.gain.setTargetAtTime(r * 0.012, t, 0.6);
	s.kedalaman.gain.setTargetAtTime(r * 0.018, t, 0.6);
	s.ayun.frequency.setTargetAtTime(5 + Math.random() * 3, t, 0.3);

	const m = s.mesin;
	if (mesin && mati) {
		const v = Math.abs(mesin.laju);
		const motor = mesin.jenis === "motor";
		// putaran mesin bergigi: tiap gigi putaran naik dari rendah ke tinggi lalu turun lagi
		const rentang = motor ? 3.6 : 3.2;
		const gigi = Math.min(5, Math.floor(v / rentang));
		const putaran = Math.min(1, (v - gigi * rentang) / rentang) * (gigi === 5 ? 0.6 : 1);
		const gas = Math.max(0, Math.min(1, mesin.gas ?? 0));
		const f = motor ? 58 + putaran * 95 + gigi * 6 + gas * 12 : 34 + putaran * 46 + gigi * 4 + gas * 6;
		m.m1.frequency.setTargetAtTime(f, t, 0.08);
		m.m2.frequency.setTargetAtTime(f * 0.5, t, 0.08);
		m.mf.frequency.setTargetAtTime(f * (motor ? 6 : 4.5) * (0.7 + gas * 0.6), t, 0.08);
		m.mg.gain.setTargetAtTime((motor ? 0.032 : 0.03) * (0.7 + gas * 0.5 + putaran * 0.3), t, 0.1);
		m.getarG.gain.setTargetAtTime(motor ? 0.014 : 0.005, t, 0.2);
		m.getar.frequency.setTargetAtTime(motor ? f * 0.45 : 15, t, 0.15);
		m.knalpot.f.frequency.setTargetAtTime(f * 2.2, t, 0.1);
		m.knalpot.g.gain.setTargetAtTime((motor ? 0.05 : 0.035) * (0.25 + gas * 0.75) * (0.5 + putaran * 0.5), t, 0.1);
	} else {
		m.mg.gain.setTargetAtTime(0, t, 0.25);
		m.getarG.gain.setTargetAtTime(0, t, 0.25);
		m.knalpot.g.gain.setTargetAtTime(0, t, 0.25);
	}

	const kini = performance.now();
	if (mati && burung > 0.05 && kini > s.burungLagi) {
		kicau(ctx, t + 0.05, 0.012 + 0.02 * burung * Math.random());
		s.burungLagi = kini + 2500 + Math.random() * 7000 / burung;
	}
	if (mati && jangkrik > 0.05 && kini > s.jangkrikLagi) {
		krik(ctx, t + 0.05, 0.006 + 0.01 * jangkrik);
		s.jangkrikLagi = kini + 400 + Math.random() * 1600;
	}
}

// Kendaraan lalu lintas terdekat: [{ jenis, laju, jarak }] (maks 3, terdekat dulu).
export function aturMesinLain(daftar) {
	if (!s) return;
	const ctx = siapkan();
	if (!ctx) return;
	const t = ctx.currentTime;
	const mati = suaraMati.nilai ? 0 : 1;
	s.lain.forEach((v, i) => {
		const k = daftar[i];
		if (!k || k.jarak > 45 || !mati) {
			v.g.gain.setTargetAtTime(0, t, 0.3);
			v.desir.g.gain.setTargetAtTime(0, t, 0.3);
			v.jarakLalu = 99;
			return;
		}
		const motor = k.jenis === "motor";
		const dekat = Math.max(0, 1 - k.jarak / 45) ** 2;
		// efek Doppler kasar: mendekat sedikit lebih tinggi, menjauh lebih rendah
		const mendekat = k.jarak < v.jarakLalu ? 1.06 : 0.94;
		v.jarakLalu = k.jarak;
		const f = (motor ? 70 + k.laju * 8 : 40 + k.laju * 4) * mendekat;
		v.o.frequency.setTargetAtTime(f, t, 0.15);
		v.f.frequency.setTargetAtTime(f * (motor ? 6 : 4), t, 0.15);
		v.g.gain.setTargetAtTime(dekat * (motor ? 0.03 : 0.025), t, 0.15);
		v.desir.f.frequency.setTargetAtTime(500 + k.laju * 60, t, 0.2);
		v.desir.g.gain.setTargetAtTime(dekat * k.laju * 0.004, t, 0.15);
	});
}

// Satu langkah kaki. permukaan: "rumput" | "keras" | "kayu" | "air".
export function langkahKaki(permukaan = "rumput", lari = false) {
	if (suaraMati.nilai) return;
	const ctx = siapkan();
	if (!ctx || !derauPutih()) return;
	const t = ctx.currentTime + 0.005;
	const keras = lari ? 1.5 : 1;
	const pukul = (tipe, frek, q, lama, vol) => {
		const src = ctx.createBufferSource();
		src.buffer = derauPutih();
		const f = ctx.createBiquadFilter();
		f.type = tipe;
		f.frequency.value = frek * (0.9 + Math.random() * 0.2);
		f.Q.value = q;
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(vol * keras, t + 0.006);
		g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
		src.connect(f).connect(g).connect(ctx.destination);
		src.start(t, Math.random() * 0.8);
		src.stop(t + lama + 0.02);
	};
	const dentum = (frek, lama, vol) => {
		const o = ctx.createOscillator();
		o.frequency.setValueAtTime(frek, t);
		o.frequency.exponentialRampToValueAtTime(frek * 0.55, t + lama);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(vol * keras, t + 0.005);
		g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
		o.connect(g).connect(ctx.destination);
		o.start(t);
		o.stop(t + lama + 0.02);
	};
	if (permukaan === "air") pukul("bandpass", 1100, 0.7, 0.28, 0.05);
	else if (permukaan === "kayu") {
		dentum(150, 0.09, 0.07);
		pukul("bandpass", 2200, 1.2, 0.05, 0.03);
	} else if (permukaan === "keras") {
		dentum(95, 0.06, 0.05);
		pukul("highpass", 3000, 0.7, lari ? 0.035 : 0.045, 0.035);
	} else {
		// rumput: gesekan lembut
		pukul("bandpass", 1600, 0.5, lari ? 0.09 : 0.12, 0.022);
		dentum(80, 0.05, 0.025);
	}
}

export function senyapkanSuasana() {
	if (!s) return;
	const ctx = siapkan();
	if (!ctx) return;
	const t = ctx.currentTime;
	for (const g of [s.angin.g, s.lalin.g, s.ramai.g, s.ramai2.g, s.kedalaman, s.mesin.mg, s.mesin.getarG, s.mesin.knalpot.g, ...s.lain.flatMap((v) => [v.g, v.desir.g])]) g.gain.setTargetAtTime(0, t, 0.3);
}
