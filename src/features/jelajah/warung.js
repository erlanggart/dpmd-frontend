import { useSyncExternalStore } from "react";
import { bayarKoin } from "./pancing";
import { TENAGA_MAKS, tenaga, ubahTenaga } from "./tenaga";
import { catat, tambahXp } from "./progres";

// Tempat makan: pesan & bayar di gerobak / konter, lalu duduk di kursi tempat itu — pesanan
// diantar ke meja dan dimakan pelan-pelan sampai habis. Satu pesanan aktif sekaligus.
// bentuk = wadah di meja: mangkuk | piring | nampan | gelas (lihat scene/MakananMeja.jsx).

export const WARUNG = {
	mie: {
		nama: "Mie Ayam Pak Kumis",
		ikon: "🍜",
		warna: "#ea580c",
		menu: [{ id: "mie", nama: "Mie Ayam", ikon: "🍜", harga: 40, tenaga: 45, bentuk: "mangkuk", ket: "Ayam kecap, sawi, pangsit" }],
	},
	pecel: {
		nama: "Pecel Ayam Bude",
		ikon: "🍗",
		warna: "#16a34a",
		menu: [
			{ id: "pecel-ayam", nama: "Pecel Ayam + Nasi", ikon: "🍗", harga: 45, tenaga: 52, bentuk: "piring", ket: "Ayam goreng, sambal terasi, lalapan" },
			{ id: "pecel-lele", nama: "Pecel Lele + Nasi", ikon: "🐟", harga: 40, tenaga: 46, bentuk: "piring", ket: "Lele garing, sambal bawang" },
			{ id: "tahu-tempe", nama: "Tahu Tempe Goreng", ikon: "🟫", harga: 15, tenaga: 16, bentuk: "piring", ket: "Teman nasi, murah meriah" },
			{ id: "es-jeruk", nama: "Es Jeruk", ikon: "🍊", harga: 12, tenaga: 10, bentuk: "gelas", ket: "Jeruk peras dingin" },
		],
	},
	mcd: {
		nama: "McD Tegar Beriman",
		ikon: "🍔",
		warna: "#dc2626",
		menu: [
			{ id: "mcd-panas", nama: "Paket Nasi Ayam", ikon: "🍗", harga: 60, tenaga: 65, bentuk: "nampan", ket: "Nasi, ayam goreng renyah, minuman" },
			{ id: "mcd-burger", nama: "Burger Keju Ganda", ikon: "🍔", harga: 55, tenaga: 58, bentuk: "nampan", ket: "Dua daging, keju leleh, acar" },
			{ id: "mcd-ayam", nama: "Ayam Goreng 2 Potong", ikon: "🍗", harga: 50, tenaga: 52, bentuk: "nampan", ket: "Renyah di luar, juicy di dalam" },
			{ id: "mcd-kentang", nama: "Kentang Goreng", ikon: "🍟", harga: 25, tenaga: 20, bentuk: "nampan", ket: "Asin gurih, ukuran besar" },
			{ id: "mcd-eskrim", nama: "Es Krim Sundae", ikon: "🍨", harga: 18, tenaga: 12, bentuk: "gelas", ket: "Vanila saus cokelat" },
			{ id: "mcd-soda", nama: "Minuman Soda", ikon: "🥤", harga: 15, tenaga: 10, bentuk: "gelas", ket: "Dingin bergelembung" },
		],
	},
	foodcourt: {
		nama: "Food Court CCM Lt 3",
		ikon: "🍛",
		warna: "#c2410c",
		menu: [
			{ id: "fc-nasgor", nama: "Nasi Goreng Spesial", ikon: "🍛", harga: 42, tenaga: 50, bentuk: "piring", ket: "Telur mata sapi, kerupuk, acar" },
			{ id: "fc-geprek", nama: "Ayam Geprek Sambal Bawang", ikon: "🍗", harga: 38, tenaga: 46, bentuk: "piring", ket: "Level pedas bisa diatur" },
			{ id: "fc-bakso", nama: "Bakso Urat Jumbo", ikon: "🍲", harga: 35, tenaga: 42, bentuk: "mangkuk", ket: "Kuah kaldu sapi, bihun" },
			{ id: "fc-esteh", nama: "Es Teh Manis Jumbo", ikon: "🧋", harga: 10, tenaga: 9, bentuk: "gelas", ket: "Segar dingin" },
			{ id: "fc-jus", nama: "Jus Alpukat", ikon: "🥑", harga: 20, tenaga: 15, bentuk: "gelas", ket: "Kental bersusu cokelat" },
		],
	},
	kopi: {
		nama: "Kedai Kopi CCM",
		ikon: "☕",
		warna: "#78350f",
		menu: [
			{ id: "kopi-susu", nama: "Es Kopi Susu Gula Aren", ikon: "🧋", harga: 28, tenaga: 22, bentuk: "gelas", ket: "Andalan kedai" },
			{ id: "teh-tarik", nama: "Teh Tarik", ikon: "🍵", harga: 22, tenaga: 18, bentuk: "gelas", ket: "Manis berbusa" },
			{ id: "roti-bakar", nama: "Roti Bakar Cokelat Keju", ikon: "🍞", harga: 30, tenaga: 28, bentuk: "piring", ket: "Hangat, lumer" },
			{ id: "croissant", nama: "Croissant Mentega", ikon: "🥐", harga: 26, tenaga: 22, bentuk: "piring", ket: "Renyah berlapis" },
		],
	},
};
const LAMA = { mangkuk: 9, piring: 10, nampan: 10, gelas: 6 };
export const lamaMakan = (item) => LAMA[item?.bentuk] || 9;
export const itemMenu = (warungId, itemId) => WARUNG[warungId]?.menu.find((m) => m.id === itemId) || null;

// pesanan: { warung, item } sudah dibayar & menunggu dimakan
// makan: { t, x, z, rot, mejaY, warung, item } sedang dimakan di meja
export const warung = { pesanan: null, makan: null };

let versi = 0;
const pendengar = new Set();
const beritahu = () => {
	versi++;
	pendengar.forEach((f) => f());
};
export const useWarung = () =>
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => versi,
	);

export function pesan(warungId, itemId) {
	const w = WARUNG[warungId];
	const item = itemMenu(warungId, itemId);
	if (!w || !item) return;
	if (warung.pesanan) {
		const lain = warung.pesanan.warung !== warungId;
		return ubahTenaga(0, {
			teks: lain ? `Pesanan di ${WARUNG[warung.pesanan.warung].nama} belum dimakan` : "Pesanan sudah dicatat — silakan duduk dulu",
			jenis: "info",
		});
	}
	if (!bayarKoin(item.harga)) return ubahTenaga(0, { teks: `Koin kurang (perlu 🪙 ${item.harga}). Memancing dulu di Situ Pemda!`, jenis: "buruk" });
	warung.pesanan = { warung: warungId, item: item.id };
	ubahTenaga(0, { teks: `${item.ikon} ${item.nama} dipesan! Silakan duduk, nanti diantar ke meja`, jenis: "baik" });
	beritahu();
}

// kursi: { x, z, rot, warung, mejaY } — hanya kursi tempat pesanan dibuat
export function mulaiMakan(kursi) {
	const p = warung.pesanan;
	if (!p || warung.makan || p.warung !== kursi.warung) return;
	const item = itemMenu(p.warung, p.item);
	warung.makan = { t: 0, x: kursi.x, z: kursi.z, rot: kursi.rot, mejaY: kursi.mejaY ?? 0.75, warung: p.warung, item };
	ubahTenaga(0, { teks: `${item.nama} datang! Selamat makan ${item.ikon}`, jenis: "info" });
	beritahu();
}

// dipanggil tiap frame selama duduk
export function tickMakan(dt) {
	const m = warung.makan;
	if (!m) return;
	m.t += dt;
	if (m.t < lamaMakan(m.item)) return;
	warung.makan = null;
	warung.pesanan = null;
	const tambah = Math.min(m.item.tenaga, TENAGA_MAKS - tenaga.nilai);
	ubahTenaga(m.item.tenaga, { teks: `${m.item.bentuk === "gelas" ? "Segar" : "Kenyang"}! Tenaga +${Math.max(0, Math.round(tambah))} 😋`, jenis: "baik" });
	catat(m.warung);
	catat("makan");
	tambahXp(Math.max(5, Math.round(m.item.harga / 4)));
	beritahu();
}

export function berhentiMakan() {
	if (!warung.makan) return;
	warung.makan = null;
	ubahTenaga(0, { teks: "Makanan belum habis — duduk lagi untuk melanjutkan", jenis: "info" });
	beritahu();
}
