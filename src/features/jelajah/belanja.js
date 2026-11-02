import { useSyncExternalStore } from "react";
import { bayarKoin } from "./pancing";
import { TENAGA_MAKS, tenaga, ubahTenaga } from "./tenaga";
import { BARANG } from "./toko";
import { catat, tambahXp } from "./progres";

// Belanja di minimarket: ambil keranjang di dekat pintu, ambil barang dari rak satu per
// satu ke keranjang, bayar di kasir pakai koin, lalu barangnya masuk tas dan bisa
// dimakan/diminum kapan saja untuk mengisi tenaga. Isi tas tersimpan di perangkat.

const KUNCI_TAS = "jelajah-tas-v1";
export const MAKS_KERANJANG = 12;
// lama gerak tangan mengambil barang dari rak sampai masuk keranjang (detik)
export const LAMA_AMBIL = 0.8;
export const BARANG_PER_ID = Object.fromEntries(BARANG.map((b) => [b.id, b]));

function bacaTas() {
	try {
		const t = JSON.parse(localStorage.getItem(KUNCI_TAS));
		if (t && typeof t === "object") return t;
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return {};
}

// keranjang: daftar id barang sesuai urutan diambil (untuk ditampilkan di keranjang 3D)
// toko: id toko asal keranjang (alfamart | koperasi)
export const belanja = { bawaKeranjang: false, toko: null, keranjang: [], tas: bacaTas(), ambil: null };

let versi = 0;
const pendengar = new Set();
function beritahu() {
	versi++;
	pendengar.forEach((fn) => fn());
}
export const useBelanja = () =>
	useSyncExternalStore(
		(fn) => (pendengar.add(fn), () => pendengar.delete(fn)),
		() => versi,
	);

function simpanTas() {
	try {
		localStorage.setItem(KUNCI_TAS, JSON.stringify(belanja.tas));
	} catch {
		/* abaikan */
	}
}

export const totalKeranjang = () => belanja.keranjang.reduce((s, id) => s + (BARANG_PER_ID[id]?.harga || 0), 0);
export const rekapKeranjang = () => {
	const r = {};
	for (const id of belanja.keranjang) r[id] = (r[id] || 0) + 1;
	return r;
};

export function ambilKeranjang(toko) {
	if (belanja.bawaKeranjang) return;
	belanja.bawaKeranjang = true;
	belanja.toko = toko || null;
	ubahTenaga(0, { teks: "🧺 Keranjang diambil. Pilih barang di rak!", jenis: "info" });
	beritahu();
}

// Mulai gerak tangan mengambil barang; barangnya masuk keranjang saat gerak selesai.
export function mulaiAmbil(id) {
	if (!belanja.bawaKeranjang) return ubahTenaga(0, { teks: "Ambil keranjang dulu di dekat pintu", jenis: "buruk" });
	if (belanja.keranjang.length >= MAKS_KERANJANG) return ubahTenaga(0, { teks: "Keranjang sudah penuh", jenis: "buruk" });
	if (belanja.ambil) return;
	belanja.ambil = { id, t: 0 };
}

export function selesaiAmbil() {
	const a = belanja.ambil;
	belanja.ambil = null;
	if (!a) return;
	belanja.keranjang.push(a.id);
	const b = BARANG_PER_ID[a.id];
	ubahTenaga(0, { teks: `${b.ikon} ${b.nama} masuk keranjang · total 🪙 ${totalKeranjang()}`, jenis: "info" });
	beritahu();
}

export function keluarkanSatu(id) {
	const i = belanja.keranjang.lastIndexOf(id);
	if (i >= 0) belanja.keranjang.splice(i, 1);
	beritahu();
}

// Bayar di kasir: koin dipotong, isi keranjang pindah ke tas.
export function bayar() {
	const total = totalKeranjang();
	if (!total) return "Keranjang masih kosong";
	if (!bayarKoin(total)) return "Koin belum cukup — kembalikan sebagian barang, atau memancing dulu di Situ Pemda";
	for (const id of belanja.keranjang) belanja.tas[id] = (belanja.tas[id] || 0) + 1;
	belanja.keranjang = [];
	simpanTas();
	ubahTenaga(0, { teks: `Lunas 🪙 ${total}. Belanjaan masuk tas 🎒`, jenis: "baik" });
	catat("belanja");
	tambahXp(Math.round(total / 5));
	beritahu();
	return null;
}

// Keluar toko: keranjang dikembalikan (hanya boleh bila sudah dibayar).
export function kembalikanKeranjang() {
	if (!belanja.bawaKeranjang) return;
	belanja.bawaKeranjang = false;
	belanja.toko = null;
	belanja.keranjang = [];
	belanja.ambil = null;
	beritahu();
}

export function makan(id) {
	const b = BARANG_PER_ID[id];
	if (!b || !belanja.tas[id]) return "Barang tidak ada di tas";
	if (tenaga.nilai >= TENAGA_MAKS) return "Tenaga Anda sudah penuh";
	belanja.tas[id] -= 1;
	if (!belanja.tas[id]) delete belanja.tas[id];
	simpanTas();
	ubahTenaga(b.tenaga, { teks: `${b.ikon} ${b.nama}: tenaga +${b.tenaga}`, jenis: "baik" });
	beritahu();
	return null;
}
