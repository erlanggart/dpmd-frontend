import { useSyncExternalStore } from "react";
import { bayarKoin } from "./pancing";
import { TENAGA_MAKS, tenaga, ubahTenaga } from "./tenaga";
import { catat, tambahXp } from "./progres";

// Warung tenda mie ayam di seberang kantor: pesan & bayar di gerobak, lalu duduk di bangku
// warung — semangkuk mie ayam diantar ke meja dan dimakan pelan-pelan sampai habis.

export const HARGA_MIE = 40;
export const TENAGA_MIE = 45;
export const LAMA_MAKAN = 9;

// pesanan: sudah dibayar & menunggu dimakan; makan: { t, x, z, rot } mangkuk di meja
export const warung = { pesanan: false, makan: null };

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

export function pesanMie() {
	if (warung.pesanan) return ubahTenaga(0, { teks: "Pesanan sudah dicatat — silakan duduk di bangku warung", jenis: "info" });
	if (!bayarKoin(HARGA_MIE)) return ubahTenaga(0, { teks: `Koin kurang (perlu 🪙 ${HARGA_MIE}). Memancing dulu di Situ Pemda!`, jenis: "buruk" });
	warung.pesanan = true;
	ubahTenaga(0, { teks: "🍜 Mie ayam dipesan! Silakan duduk, nanti diantar ke meja", jenis: "baik" });
	beritahu();
}

export function mulaiMakan(kursi) {
	if (!warung.pesanan || warung.makan) return;
	warung.makan = { t: 0, x: kursi.x, z: kursi.z, rot: kursi.rot };
	ubahTenaga(0, { teks: "Mie ayam datang! Selamat makan 🍜", jenis: "info" });
	beritahu();
}

// dipanggil tiap frame selama duduk; true bila mangkuk sudah habis
export function tickMakan(dt) {
	const m = warung.makan;
	if (!m) return;
	m.t += dt;
	if (m.t < LAMA_MAKAN) return;
	warung.makan = null;
	warung.pesanan = false;
	const tambah = Math.min(TENAGA_MIE, TENAGA_MAKS - tenaga.nilai);
	ubahTenaga(TENAGA_MIE, { teks: `Kenyang! Tenaga +${Math.max(0, Math.round(tambah))} 😋`, jenis: "baik" });
	catat("mie");
	tambahXp(10);
	beritahu();
}

export function berhentiMakan() {
	if (!warung.makan) return;
	warung.makan = null;
	ubahTenaga(0, { teks: "Mie ayam belum habis — duduk lagi untuk melanjutkan", jenis: "info" });
	beritahu();
}
