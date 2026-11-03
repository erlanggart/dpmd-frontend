import { useSyncExternalStore } from "react";
import { tambahKoin } from "./pancing";
import { suara } from "./suaraPancing";
import { ubahTenaga } from "./tenaga";

// Kemajuan tamu: XP & level (dari memancing, peti, belanja, makan, misi, bioskop) dan tiga misi
// harian yang berganti tiap hari (sama untuk semua tamu pada hari yang sama). Tersimpan di
// perangkat.

const KUNCI = "jelajah-progres-v1";

export const levelDari = (xp) => Math.floor(Math.sqrt(xp / 60)) + 1;
export const xpUntukLevel = (lv) => 60 * (lv - 1) ** 2;

// jenis = peristiwa yang dicatat lewat catat(jenis, n)
export const POOL_MISI = [
	{ id: "ikan3", teks: "Tangkap 3 ikan di Situ Pemda", jenis: "ikan", target: 3, koin: 40, xp: 40 },
	{ id: "langka", teks: "Tangkap 1 ikan Langka atau lebih tinggi", jenis: "ikanLangka", target: 1, koin: 90, xp: 80 },
	{ id: "kolam", teks: "Tangkap 1 ikan monster di Kolam Monster DPMD", jenis: "ikanKolam", target: 1, koin: 150, xp: 120 },
	{ id: "lomba", teks: "Ikut lomba galatama di Kolam Monster", jenis: "lomba", target: 1, koin: 200, xp: 150 },
	{ id: "peti2", teks: "Buka 2 peti hadiah", jenis: "peti", target: 2, koin: 50, xp: 50 },
	{ id: "mie", teks: "Makan semangkuk mie ayam", jenis: "mie", target: 1, koin: 30, xp: 30 },
	{ id: "belanja", teks: "Belanja di Alfamart, Koperasi, atau Supermarket CCM", jenis: "belanja", target: 1, koin: 30, xp: 30 },
	{ id: "pecel", teks: "Makan di Pecel Ayam Bude", jenis: "pecel", target: 1, koin: 30, xp: 30 },
	{ id: "mcd", teks: "Makan di McD Tegar Beriman", jenis: "mcd", target: 1, koin: 40, xp: 40 },
	{ id: "bioskop", teks: "Nonton film di bioskop Cibinong City Mall", jenis: "bioskop", target: 1, koin: 50, xp: 50 },
	{ id: "renang", teks: "Berenang 60 meter di Situ Pemda", jenis: "renang", target: 60, koin: 40, xp: 45 },
	{ id: "perahu", teks: "Mendayung perahu sejauh 150 meter", jenis: "perahu", target: 150, koin: 40, xp: 40 },
	{ id: "ruang", teks: "Kunjungi 3 ruang bidang", jenis: "ruang", target: 3, koin: 40, xp: 40 },
	{ id: "sapa", teks: "Sapa petugas atau tamu lain", jenis: "sapa", target: 1, koin: 20, xp: 20 },
	{ id: "gaya", teks: "Pakai gaya baru dari Distro Gaya", jenis: "gaya", target: 1, koin: 30, xp: 30 },
	{ id: "motor", teks: "Kendarai motor sejauh 500 meter", jenis: "motor", target: 500, koin: 35, xp: 35 },
];
export const MISI_PER_ID = Object.fromEntries(POOL_MISI.map((m) => [m.id, m]));

const hariIni = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// tiga misi berbeda, dipilih dari tanggal (semua tamu mendapat misi yang sama hari itu)
function misiUntuk(tanggal) {
	let h = 2166136261;
	for (const c of tanggal) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	const sisa = [...POOL_MISI];
	const hasil = [];
	for (let i = 0; i < 3; i++) {
		h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
		hasil.push(sisa.splice(h % sisa.length, 1)[0].id);
	}
	return hasil.map((id) => ({ id, n: 0, diklaim: false }));
}

function baca() {
	try {
		const d = JSON.parse(localStorage.getItem(KUNCI));
		if (d && typeof d === "object") {
			return { xp: d.xp || 0, tanggal: d.tanggal || "", misi: Array.isArray(d.misi) ? d.misi : [] };
		}
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return { xp: 0, tanggal: "", misi: [] };
}

export let progres = baca();
const pendengar = new Set();
function simpan() {
	try {
		localStorage.setItem(KUNCI, JSON.stringify(progres));
	} catch {
		/* abaikan */
	}
	progres = { ...progres };
	pendengar.forEach((f) => f());
}
export const dengarProgres = (f) => (pendengar.add(f), () => pendengar.delete(f));
export const useProgres = () =>
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => progres,
	);

// Misi diganti saat hari berganti.
export function segarkanMisi() {
	const t = hariIni();
	if (progres.tanggal === t && progres.misi.length === 3) return;
	progres.tanggal = t;
	progres.misi = misiUntuk(t);
	simpan();
}
segarkanMisi();

export function tambahXp(n) {
	if (!(n > 0)) return;
	const lama = levelDari(progres.xp);
	progres.xp = Math.round(progres.xp + n);
	const baru = levelDari(progres.xp);
	if (baru > lama) {
		suara("jaya");
		ubahTenaga(0, { teks: `⭐ Naik ke Level ${baru}!`, jenis: "baik" });
	}
	simpan();
}

// Catat kemajuan misi (mis. catat("ikan"), catat("renang", meter)).
export function catat(jenis, n = 1) {
	segarkanMisi();
	let ubah = false;
	for (const m of progres.misi) {
		const def = MISI_PER_ID[m.id];
		if (!def || def.jenis !== jenis || m.n >= def.target) continue;
		m.n = Math.min(def.target, m.n + n);
		ubah = true;
		if (m.n >= def.target) {
			suara("koin");
			ubahTenaga(0, { teks: `📋 Misi selesai: ${def.teks} — klaim hadiahnya!`, jenis: "baik" });
		}
	}
	if (ubah) simpan();
}

export function klaimMisi(id) {
	const m = progres.misi.find((x) => x.id === id);
	const def = MISI_PER_ID[id];
	if (!m || !def || m.diklaim || m.n < def.target) return;
	m.diklaim = true;
	tambahKoin(def.koin);
	tambahXp(def.xp);
	simpan();
}

export const misiSiapKlaim = (p = progres) => p.misi.filter((m) => !m.diklaim && m.n >= (MISI_PER_ID[m.id]?.target ?? Infinity)).length;

