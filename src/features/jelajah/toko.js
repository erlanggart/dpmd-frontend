import { bayarKoin } from "./pancing";
import { TENAGA_MAKS, tenaga, ubahTenaga } from "./tenaga";

// Barang di minimarket depan kantor, dibayar dengan koin hasil memancing.
export const BARANG = [
	{ id: "air", nama: "Air Mineral", ikon: "💧", harga: 15, tenaga: 10, ket: "Segar, pelepas dahaga" },
	{ id: "esteh", nama: "Es Teh Manis", ikon: "🧋", harga: 25, tenaga: 15, ket: "Manis dingin, bikin semangat" },
	{ id: "roti", nama: "Roti Sobek", ikon: "🍞", harga: 35, tenaga: 22, ket: "Pengganjal perut" },
	{ id: "mie", nama: "Mi Instan Cup", ikon: "🍜", harga: 50, tenaga: 30, ket: "Diseduh di tempat" },
	{ id: "nasi", nama: "Nasi Bungkus", ikon: "🍱", harga: 90, tenaga: 50, ket: "Lauk ayam & sambal" },
	{ id: "energi", nama: "Minuman Energi", ikon: "⚡", harga: 140, tenaga: 75, ket: "Tenaga penuh untuk monster situ" },
];

// Beli lalu langsung dimakan/diminum. Mengembalikan alasan gagal, atau null bila berhasil.
export function beli(id) {
	const b = BARANG.find((x) => x.id === id);
	if (!b) return "Barang tidak ada";
	if (tenaga.nilai >= TENAGA_MAKS) return "Tenaga Anda sudah penuh";
	if (!bayarKoin(b.harga)) return "Koin belum cukup — memancing dulu di Situ Pemda!";
	ubahTenaga(b.tenaga, { teks: `${b.ikon} ${b.nama}: tenaga +${b.tenaga}`, jenis: "baik" });
	return null;
}
