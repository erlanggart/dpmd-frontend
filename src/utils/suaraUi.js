// Efek suara antarmuka untuk seluruh aplikasi, disintesis lewat WebAudio (tanpa berkas suara).
//
// pasangSuaraGlobal() dipanggil sekali di main.jsx dan memasang:
//   - bunyi klik untuk semua tombol/tautan/dropdown/centang (satu pendengar di document),
//   - bunyi pop up: SweetAlert (nada mengikuti ikonnya), dialog/modal, confirm/alert bawaan,
// sedangkan toast react-hot-toast dibunyikan oleh komponen <SuaraToast /> (butuh hook store-nya).
// Bagian yang punya suara sendiri (mis. Manajemen Server) diberi atribut data-suara="mati".
// Pengguna bisa mematikan semuanya lewat <TombolSuara />; pilihan disimpan di localStorage.

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useToasterStore } from "react-hot-toast";

const KUNCI = "ui-suara";
let aktif = (() => {
	try {
		return localStorage.getItem(KUNCI) !== "0";
	} catch {
		return true;
	}
})();
const pendengar = new Set();
let ctx = null;
let master = null;

const konteks = () => {
	// <body data-suara="mati"> membisukan seluruh halaman (dipasang landing page), termasuk pop up & toast.
	if (!aktif || document.body?.dataset.suara === "mati") return null;
	// Sebelum ada gestur pengguna, browser menahan audio; nada yang dijadwalkan saat itu akan
	// menumpuk lalu berbunyi serentak pada klik pertama. Jadi diam saja sampai ada gestur.
	if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
	try {
		if (!ctx) {
			ctx = new (window.AudioContext || window.webkitAudioContext)();
			master = ctx.createGain();
			master.gain.value = 0.5;
			master.connect(ctx.destination);
		}
		if (ctx.state !== "running") {
			ctx.resume().catch(() => {});
			return null;
		}
		return ctx;
	} catch {
		return null;
	}
};

/** Nada pendek dengan selubung lembut; f2 = sapuan frekuensi (efek "pop"). */
const nada = (c, { f, f2, mulai = 0, dur = 0.08, vol = 0.18, tipe = "sine" }) => {
	const t = c.currentTime + mulai;
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = tipe;
	o.frequency.setValueAtTime(f, t);
	if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
	g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	o.connect(g).connect(master);
	o.start(t);
	o.stop(t + dur + 0.02);
};

// Bunyi pop up dibatasi supaya beberapa elemen yang muncul serentak tidak berdentang beruntun.
let popTerakhir = 0;
const main = (urutan, { pop = false } = {}) => () => {
	if (pop) {
		const kini = performance.now();
		if (kini - popTerakhir < 250) return;
		popTerakhir = kini;
	}
	const c = konteks();
	if (c) urutan.forEach((n) => nada(c, n));
};

export const suara = {
	/** Klik tombol: "tik" pendek bernada turun. */
	klik: main([{ f: 1100, f2: 700, dur: 0.045, vol: 0.12 }]),
	/** Pop up/panel muncul: "pop" naik. */
	buka: main([{ f: 420, f2: 880, dur: 0.09, vol: 0.14 }], { pop: true }),
	/** Aksi berhasil: dua nada naik. */
	sukses: main([
		{ f: 784, dur: 0.1, vol: 0.14 },
		{ f: 1047, mulai: 0.08, dur: 0.16, vol: 0.14 },
	], { pop: true }),
	/** Galat: dua nada turun yang lembut. */
	galat: main([
		{ f: 440, dur: 0.12, vol: 0.16, tipe: "triangle" },
		{ f: 330, mulai: 0.1, dur: 0.18, vol: 0.16, tipe: "triangle" },
	], { pop: true }),
	/** Konfirmasi/peringatan sebelum aksi berisiko. */
	tanya: main([
		{ f: 660, dur: 0.07, vol: 0.13 },
		{ f: 660, mulai: 0.11, dur: 0.07, vol: 0.13 },
	], { pop: true }),
};

export const aturSuara = (nilai) => {
	aktif = nilai;
	try {
		localStorage.setItem(KUNCI, nilai ? "1" : "0");
	} catch {
		/* mode privat: cukup di memori */
	}
	pendengar.forEach((fn) => fn());
	if (nilai) suara.sukses();
};

export const useSuaraAktif = () =>
	useSyncExternalStore(
		(fn) => {
			pendengar.add(fn);
			return () => pendengar.delete(fn);
		},
		() => aktif,
	);

const DIBISUKAN = '[data-suara="mati"]';
const PEMICU_KLIK = 'button:not(:disabled), a[href], select, summary, label[for], [role="button"], [role="tab"], [role="menuitem"], [role="option"], input[type="checkbox"], input[type="radio"], input[type="submit"], input[type="button"]';
const DIALOG = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], dialog';

/** Nada pop up SweetAlert mengikuti ikonnya. */
const suaraSwal = (popup) => {
	const k = popup.classList;
	if (k.contains("swal2-icon-success")) suara.sukses();
	else if (k.contains("swal2-icon-error")) suara.galat();
	else if (k.contains("swal2-icon-warning") || k.contains("swal2-icon-question")) suara.tanya();
	else suara.buka();
};

const periksaTambahan = (el) => {
	if (el.nodeType !== 1 || el.closest(DIBISUKAN)) return;
	if (el.classList.contains("swal2-container")) {
		const p = el.querySelector(".swal2-popup");
		if (p) suaraSwal(p);
		return;
	}
	// Modal kustom biasanya berakar elemen `fixed inset-0`; portal (anak langsung body) diperiksa isinya.
	const cocok = el.matches(DIALOG) || (el.classList.contains("fixed") && el.classList.contains("inset-0"))
		|| (el.parentElement === document.body && el.querySelector(DIALOG));
	if (cocok) suara.buka();
};

let terpasang = false;
export const pasangSuaraGlobal = () => {
	if (terpasang || typeof document === "undefined") return;
	terpasang = true;

	document.addEventListener("click", (e) => {
		const el = e.target instanceof Element ? e.target.closest(PEMICU_KLIK) : null;
		if (el && !el.closest(DIBISUKAN)) suara.klik();
	}, true);

	for (const [nama, bunyi] of [["confirm", suara.tanya], ["alert", suara.buka], ["prompt", suara.buka]]) {
		const asli = window[nama];
		if (typeof asli !== "function") continue;
		window[nama] = function (...a) {
			bunyi();
			return asli.apply(this, a);
		};
	}

	new MutationObserver((daftar) => {
		for (const m of daftar) for (const n of m.addedNodes) periksaTambahan(n);
	}).observe(document.body, { childList: true, subtree: true });
};

/** Bunyi untuk toast react-hot-toast; dipasang sekali di akar aplikasi. */
export function SuaraToast() {
	const { toasts } = useToasterStore();
	// id → tipe terakhir yang sudah dibunyikan; toast.promise memakai id sama dari loading ke success/error.
	const terlihat = useRef(new Map());
	useEffect(() => {
		for (const t of toasts) {
			if (!t.visible || terlihat.current.get(t.id) === t.type) continue;
			terlihat.current.set(t.id, t.type);
			if (t.type === "success") suara.sukses();
			else if (t.type === "error") suara.galat();
			else if (t.type !== "loading") suara.buka();
		}
		// Lupakan id yang sudah tidak ada supaya petanya tidak tumbuh tanpa batas.
		const ada = new Set(toasts.map((t) => t.id));
		for (const id of terlihat.current.keys()) if (!ada.has(id)) terlihat.current.delete(id);
	}, [toasts]);
	return null;
}
