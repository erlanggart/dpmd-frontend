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
			// --- koleksi distro baru (selalu tambahkan di ujung: indeksnya tersimpan & dikirim) ---
			{ id: "cap", nama: "Trucker Hitam Distro", ikon: "🧢", harga: 110, warna: "#18181b" },
			{ id: "kupluk", nama: "Beanie Oranye", ikon: "🧶", harga: 90, warna: "#ea580c" },
			{ id: "caping", nama: "Caping Petani", ikon: "👒", harga: 70, warna: "#d4b26a" },
			{ id: "blangkon", nama: "Blangkon Sunda", ikon: "🎎", harga: 180, warna: "#5b3a1e" },
			{ id: "bandana", nama: "Bandana Merah", ikon: "🏴", harga: 65, warna: "#b91c1c" },
			{ id: "beret", nama: "Baret Seniman", ikon: "🎨", harga: 140, warna: "#7f1d1d" },
			{ id: "helm", nama: "Helm Proyek", ikon: "⛑️", harga: 160, warna: "#facc15" },
			{ id: "bucket", nama: "Bucket Hat Ungu", ikon: "👒", harga: 130, warna: "#7c3aed" },
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
			// --- koleksi distro baru (selalu tambahkan di ujung) ---
			{ id: "grafis", nama: "Kaos Distro Kujang", ikon: "🗡️", harga: 120, warna: "#111827", cetak: "#facc15", aksen: "#f8fafc" },
			{ id: "grafis", nama: "Kaos Oversize Sunset", ikon: "🌅", harga: 140, warna: "#f8fafc", cetak: "#f97316", aksen: "#db2777" },
			{ id: "garis", nama: "Kaos Garis Pelaut", ikon: "⚓", harga: 110, warna: "#f8fafc", aksen: "#1e3a8a" },
			{ id: "flanel", nama: "Kemeja Flanel Merah", ikon: "🟥", harga: 220, warna: "#b91c1c", aksen: "#1f2937" },
			{ id: "flanel", nama: "Kemeja Flanel Hijau", ikon: "🟩", harga: 220, warna: "#166534", aksen: "#0f172a" },
			{ id: "varsity", nama: "Jaket Varsity Bogor", ikon: "🏈", harga: 450, warna: "#14532d", aksen: "#f8fafc", cetak: "#facc15" },
			{ id: "bomber", nama: "Bomber Hijau Army", ikon: "🛩️", harga: 420, warna: "#3f6212", aksen: "#f97316" },
			{ id: "tropis", nama: "Kemeja Pantai Tropis", ikon: "🌺", harga: 260, warna: "#0e7490", aksen: "#4ade80", cetak: "#f472b6" },
			{ id: "kujang", nama: "Batik Kujang Bogor", ikon: "🪭", harga: 350, warna: "#1e3a8a", aksen: "#fbbf24" },
			{ id: "koko", nama: "Baju Koko Putih", ikon: "🕌", harga: 240, warna: "#f8fafc", aksen: "#ca8a04" },
			{ id: "polo", nama: "Polo Navy", ikon: "👕", harga: 160, warna: "#1e293b", aksen: "#f8fafc" },
			{ id: "hoodie", nama: "Hoodie Lilac", ikon: "🧥", harga: 230, warna: "#a78bfa" },
			{ id: "garis", nama: "Kaos Garis Neon", ikon: "🟨", harga: 130, warna: "#18181b", aksen: "#a3e635" },
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
			// --- koleksi distro baru (selalu tambahkan di ujung) ---
			{ id: "robek", nama: "Jeans Robek Hitam", ikon: "👖", harga: 160, warna: "#1f2937" },
			{ id: "robek", nama: "Jeans Robek Biru Muda", ikon: "👖", harga: 160, warna: "#60a5fa" },
			{ id: "jogger", nama: "Jogger Abu", ikon: "🏃", harga: 120, warna: "#6b7280" },
			{ id: "jogger", nama: "Jogger Army", ikon: "🏃", harga: 130, warna: "#4d5d2a" },
			{ id: "chino", nama: "Chino Krem", ikon: "👖", harga: 140, warna: "#d6c7a1" },
			{ id: "sarung", nama: "Sarung Kotak Hijau", ikon: "🧣", harga: 110, warna: "#166534" },
			{ id: "cargo", nama: "Cargo Hitam", ikon: "👖", harga: 140, warna: "#18181b" },
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
			// --- koleksi distro baru (selalu tambahkan di ujung) ---
			{ id: "hightop", nama: "High-top Hitam", ikon: "👟", harga: 180, warna: "#111827", sol: "#f8fafc" },
			{ id: "hightop", nama: "High-top Kuning", ikon: "👟", harga: 190, warna: "#facc15", sol: "#f8fafc" },
			{ id: "slipon", nama: "Slip-on Kotak-kotak", ikon: "🏁", harga: 150, warna: "#f8fafc", sol: "#18181b" },
			{ id: "pantofel", nama: "Pantofel Hitam", ikon: "👞", harga: 220, warna: "#0a0a0a", sol: "#27272a" },
			{ id: "sneakers", nama: "Sneakers Hijau Tosca", ikon: "👟", harga: 160, warna: "#14b8a6", sol: "#f8fafc" },
			{ id: "sandal", nama: "Sandal Gunung", ikon: "🩴", harga: 90, warna: "#334155", sol: "#78350f" },
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
		hasil.motifWarna = { aksen: baju.aksen, cetak: baju.cetak };
	}
	const celana = GAYA.c.isi[g.c];
	if (celana.id) {
		hasil.celana = celana.warna;
		hasil.modelCelana = celana.id;
		// sarung dipakai seperti rok panjang
		hasil.rok = celana.id === "sarung";
	}
	const sepatu = GAYA.s.isi[g.s];
	if (sepatu.id) hasil.sepatu = { id: sepatu.id, warna: sepatu.warna, sol: sepatu.sol };
	return hasil;
}

export const bersihkanGaya = bersih;
