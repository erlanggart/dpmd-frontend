import { useSyncExternalStore } from "react";
import { bayarKoin } from "./pancing";
import { catat, tambahXp } from "./progres";

// Lemari gaya tamu: topi, baju, celana, dan sepatu yang dibeli dengan koin lalu dipakai
// avatar (scene/orang.js menggambarnya). Indeks 0 tiap jenis = bawaan avatar / tanpa topi
// (gratis). Yang dimiliki & dipakai tersimpan di perangkat; yang dipakai ikut dikirim ke
// tamu lain saat jelajah bersama (sebagai indeks {t, b, c, s}).

export const GAYA = {
	t: {
		judul: "Topi",
		ikon: "🧢",
		isi: [
			{ id: null, nama: "Tanpa topi", ikon: "🚫", harga: 0 },
			{ id: "cap", nama: "Topi Baseball Biru", ikon: "🧢", harga: 60, warna: "#1d4ed8" },
			{ id: "cap", nama: "Snapback Merah", ikon: "🧢", harga: 90, warna: "#dc2626" },
			{ id: "peci", nama: "Peci Hitam", ikon: "🕌", harga: 50, warna: "#111827" },
			{ id: "kupluk", nama: "Kupluk Rajut Hijau", ikon: "🧶", harga: 80, warna: "#16a34a" },
			{ id: "bucket", nama: "Bucket Hat Krem", ikon: "👒", harga: 120, warna: "#d6c7a1" },
			{ id: "koboi", nama: "Topi Koboi", ikon: "🤠", harga: 250, warna: "#7c4a1e" },
			{ id: "mahkota", nama: "Mahkota Emas", ikon: "👑", harga: 1500, warna: "#facc15" },
		],
	},
	b: {
		judul: "Baju",
		ikon: "👕",
		isi: [
			{ id: null, nama: "Baju bawaan", ikon: "👕", harga: 0 },
			{ id: "merahputih", nama: "Kaos Merah Putih", ikon: "🇮🇩", harga: 80, warna: "#dc2626" },
			{ id: "jersey", nama: "Jersey Timnas", ikon: "⚽", harga: 300, warna: "#b91c1c" },
			{ id: "hoodie", nama: "Hoodie Hitam", ikon: "🧥", harga: 200, warna: "#1f2937" },
			{ id: "batik", nama: "Kemeja Batik Parang", ikon: "👔", harga: 250, warna: "#7c2d12" },
			{ id: "jaket", nama: "Jaket Kulit", ikon: "🧥", harga: 400, warna: "#3f2a1d" },
			{ id: "jas", nama: "Jas Emas Sultan", ikon: "🤵", harga: 2000, warna: "#ca8a04" },
		],
	},
	c: {
		judul: "Celana",
		ikon: "👖",
		isi: [
			{ id: null, nama: "Celana bawaan", ikon: "👖", harga: 0 },
			{ id: "jeans", nama: "Jeans Biru", ikon: "👖", harga: 80, warna: "#1e40af" },
			{ id: "cargo", nama: "Cargo Krem", ikon: "👖", harga: 120, warna: "#a8956b" },
			{ id: "training", nama: "Training Bergaris", ikon: "🏃", harga: 90, warna: "#111827" },
			{ id: "pendek", nama: "Celana Pendek", ikon: "🩳", harga: 60, warna: "#334155" },
			{ id: "putih", nama: "Celana Putih", ikon: "👖", harga: 150, warna: "#e5e7eb" },
		],
	},
	s: {
		judul: "Sepatu",
		ikon: "👟",
		isi: [
			{ id: null, nama: "Sepatu bawaan", ikon: "👞", harga: 0 },
			{ id: "sneakers", nama: "Sneakers Putih", ikon: "👟", harga: 100, warna: "#f8fafc", sol: "#e5e7eb" },
			{ id: "sneakers", nama: "Sneakers Merah", ikon: "👟", harga: 150, warna: "#dc2626", sol: "#f8fafc" },
			{ id: "boots", nama: "Boots Cokelat", ikon: "🥾", harga: 200, warna: "#78350f", sol: "#1c1917" },
			{ id: "sandal", nama: "Sandal Jepit", ikon: "🩴", harga: 30, warna: "#2563eb", sol: "#2563eb" },
			{ id: "emas", nama: "Sepatu Emas", ikon: "✨", harga: 1200, warna: "#facc15", sol: "#a16207" },
		],
	},
};
export const JENIS_GAYA = ["t", "b", "c", "s"];

const KUNCI = "jelajah-lemari-v1";
const bersih = (g) => Object.fromEntries(JENIS_GAYA.map((k) => [k, Number.isInteger(g?.[k]) && g[k] >= 0 && g[k] < GAYA[k].isi.length ? g[k] : 0]));

function baca() {
	try {
		const d = JSON.parse(localStorage.getItem(KUNCI));
		if (d && typeof d === "object") {
			const punya = Object.fromEntries(JENIS_GAYA.map((k) => [k, Array.isArray(d.punya?.[k]) ? d.punya[k].filter((i) => Number.isInteger(i)) : [0]]));
			return { punya, pakai: bersih(d.pakai) };
		}
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return { punya: { t: [0], b: [0], c: [0], s: [0] }, pakai: bersih(null) };
}

// coba: gaya yang sedang dicoba di bilik ruang coba (belum tentu dimiliki); null = tidak mencoba
export let lemari = { ...baca(), coba: null };
const pendengar = new Set();
function simpan() {
	try {
		localStorage.setItem(KUNCI, JSON.stringify({ punya: lemari.punya, pakai: lemari.pakai }));
	} catch {
		/* abaikan */
	}
	lemari = { ...lemari };
	pendengar.forEach((f) => f());
}
export const useLemari = () =>
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => lemari,
	);

export const punya = (k, i) => i === 0 || lemari.punya[k].includes(i);

// Beli (bila belum punya) lalu langsung dipakai. Mengembalikan pesan galat atau null.
export function pakaiGaya(k, i) {
	const item = GAYA[k]?.isi[i];
	if (!item) return "Barang tidak dikenal";
	if (!punya(k, i)) {
		if (!bayarKoin(item.harga)) return `Koin belum cukup (perlu 🪙 ${item.harga})`;
		lemari.punya = { ...lemari.punya, [k]: [...lemari.punya[k], i] };
		catat("gaya");
		tambahXp(Math.round(item.harga / 10));
	}
	lemari.pakai = { ...lemari.pakai, [k]: i };
	if (lemari.coba) lemari.coba = { ...lemari.coba, [k]: i };
	simpan();
	return null;
}

// Ruang coba: pakai sementara tanpa membeli; dilepas lagi saat keluar bilik.
export function cobaGaya(k, i) {
	if (!GAYA[k]?.isi[i]) return;
	lemari.coba = { ...(lemari.coba || lemari.pakai), [k]: i };
	simpan();
}
export function selesaiCoba() {
	if (!lemari.coba) return;
	lemari.coba = null;
	simpan();
}
// Gaya yang tampil di avatar: yang sedang dicoba, atau yang dipakai.
export const gayaTampil = (l = lemari) => l.coba || l.pakai;

// Penampilan avatar + gaya yang dipakai (dibaca orang.js).
export function kenakanGaya(penampilan, gaya) {
	if (!penampilan) return penampilan;
	const g = bersih(gaya);
	const hasil = { ...penampilan };
	const topi = GAYA.t.isi[g.t];
	if (topi.id) hasil.topiGaya = { id: topi.id, warna: topi.warna };
	const baju = GAYA.b.isi[g.b];
	if (baju.id) {
		hasil.seragam = "warga";
		hasil.baju = baju.warna;
		hasil.motif = baju.id;
	}
	const celana = GAYA.c.isi[g.c];
	if (celana.id) {
		hasil.celana = celana.warna;
		hasil.modelCelana = celana.id;
		hasil.rok = false;
	}
	const sepatu = GAYA.s.isi[g.s];
	if (sepatu.id) hasil.sepatu = { id: sepatu.id, warna: sepatu.warna, sol: sepatu.sol };
	return hasil;
}

export const bersihkanGaya = bersih;
