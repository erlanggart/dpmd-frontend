// src/pages/superadmin/server/suaraOps.js
//
// Efek suara panel Manajemen Server, disintesis lewat WebAudio (tanpa berkas
// suara). Satu AudioContext dipakai bersama semua tab. Browser hanya mengizinkan
// audio setelah gestur pengguna, jadi konteks dibuat di buka() yang dipanggil
// dari klik/tombol pertama; sebelum itu semua bunyi diam.

import { useSyncExternalStore } from "react";

const baca = (k, bawaan) => {
	try {
		const v = localStorage.getItem(k);
		return v === null ? bawaan : v === "1";
	} catch {
		return bawaan;
	}
};

let pengaturan = { suara: baca("ops-suara", true), detak: baca("ops-detak", true) };
const pendengar = new Set();
let ctx = null;
let master = null;

const siap = () => (pengaturan.suara && ctx ? ctx : null);

/** Satu nada pendek dengan selubung cepat; f2 = sapuan frekuensi. */
const nada = ({ f, f2, mulai = 0, dur = 0.1, tipe = "square", vol = 0.2 }) => {
	const t = ctx.currentTime + mulai;
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = tipe;
	o.frequency.setValueAtTime(f, t);
	if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
	g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	o.connect(g).connect(master);
	o.start(t);
	o.stop(t + dur + 0.03);
};

let tickTerakhir = 0;
let seranganTerakhir = 0;

export const suara = {
	/** Panggil dari gestur pengguna: membuat/membangunkan AudioContext. */
	buka: () => {
		if (!pengaturan.suara) return;
		try {
			if (!ctx) {
				ctx = new (window.AudioContext || window.webkitAudioContext)();
				master = ctx.createGain();
				master.gain.value = 0.6;
				// kompresor supaya alarm + bip bertumpuk tidak pecah
				master.connect(ctx.createDynamicsCompressor()).connect(ctx.destination);
			}
			if (ctx.state === "suspended") ctx.resume().catch(() => {});
		} catch {
			ctx = null;
		}
	},
	klik: () => siap() && nada({ f: 1800, f2: 1100, dur: 0.045, tipe: "triangle", vol: 0.12 }),
	/** "bip-bip" denyut live tiap sinkron; nada turun saat ada peringatan. */
	detak: (status) => {
		if (!siap() || !pengaturan.detak) return;
		const f = status === "sehat" ? 1046 : status === "waspada" ? 740 : 520;
		nada({ f, dur: 0.07, tipe: "sine", vol: 0.16 });
		nada({ f, mulai: 0.13, dur: 0.07, tipe: "sine", vol: 0.16 });
	},
	/** Gong dua nada saat peringatan baru muncul. */
	peringatan: () => {
		if (!siap()) return;
		[0, 0.36].forEach((m) => {
			nada({ f: 660, mulai: m, dur: 0.16, tipe: "triangle", vol: 0.28 });
			nada({ f: 880, mulai: m + 0.16, dur: 0.2, tipe: "triangle", vol: 0.28 });
		});
	},
	/** Sirene naik-turun ±2 detik untuk kondisi kritis / server mati. */
	alarm: () => {
		if (!siap()) return;
		for (let i = 0; i < 3; i += 1) {
			nada({ f: 650, f2: 1450, mulai: i * 0.7, dur: 0.35, tipe: "sawtooth", vol: 0.16 });
			nada({ f: 1450, f2: 650, mulai: i * 0.7 + 0.35, dur: 0.35, tipe: "sawtooth", vol: 0.16 });
		}
	},
	/** Arpeggio naik saat sistem kembali normal. */
	pulih: () => {
		if (!siap()) return;
		[523, 659, 784, 1046].forEach((f, i) => nada({ f, mulai: i * 0.09, dur: 0.16, tipe: "sine", vol: 0.22 }));
	},
	/** Bunyi tiap serangan masuk di peta: kritis bip tiga kali, tinggi dua, lainnya tik halus. */
	serangan: (sev) => {
		if (!siap()) return;
		const kini = Date.now();
		if (sev === "critical" || sev === "high") {
			if (kini - seranganTerakhir < 350) return;
			seranganTerakhir = kini;
			const n = sev === "critical" ? 3 : 2;
			for (let i = 0; i < n; i += 1) nada({ f: sev === "critical" ? 1320 : 880, mulai: i * 0.08, dur: 0.05, vol: 0.14 });
			return;
		}
		if (kini - tickTerakhir < 120) return;
		tickTerakhir = kini;
		nada({ f: 2400, f2: 1600, dur: 0.025, tipe: "sine", vol: 0.06 });
	},
	/** Sapuan naik (masuk layar penuh) / turun (keluar). */
	layar: (masuk) => siap() && nada({ f: masuk ? 220 : 1400, f2: masuk ? 1400 : 220, dur: 0.28, tipe: "triangle", vol: 0.18 }),
};

/** Ubah pengaturan suara ("suara" = semua bunyi, "detak" = bip live) dan simpan. */
export const aturSuara = (kunci, nilai) => {
	pengaturan = { ...pengaturan, [kunci]: nilai };
	try {
		localStorage.setItem(`ops-${kunci}`, nilai ? "1" : "0");
	} catch {
		/* penyimpanan diblokir: pengaturan tetap berlaku sampai muat ulang */
	}
	if (kunci === "suara" && nilai) suara.buka();
	pendengar.forEach((f) => f());
};

export const usePengaturanSuara = () =>
	useSyncExternalStore(
		(f) => {
			pendengar.add(f);
			return () => pendengar.delete(f);
		},
		() => pengaturan,
	);
