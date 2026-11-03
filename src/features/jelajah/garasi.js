import { useSyncExternalStore } from "react";
import { bayarKoin } from "./pancing";
import { catat, tambahXp } from "./progres";
import { posisi } from "./jelajahStore";
import { KENDARAAN, tabrakKendaraan, tambahMilik } from "./scene/kendaraan";
import { MODEL_PER_JENIS, SLOT_MILIK, cariModel, idMilik } from "./scene/modelKendaraan";
import { SERAH_MOBIL, SERAH_MOTOR } from "./scene/showroomData";
import { TANAH, tabrakKendaraanStatis, tinggiTanah } from "./scene/layout";
import { diKawasan } from "./scene/kawasanBantu";

// Garasi tamu: mobil & motor yang dibeli di showroom (koin), warnanya, dan pemanggilan ke
// dekat pemain. Disimpan di perangkat. Tiap model punya satu unit per tamu; id unitnya
// "jenis:N" dengan slot acak per perangkat (lihat modelKendaraan.js) supaya dua tamu yang
// membeli model sama jarang bertabrakan id di jelajah bersama.

const KUNCI = "jelajah-garasi-v1";
const baca = () => {
	try {
		const d = JSON.parse(localStorage.getItem(KUNCI));
		if (d && typeof d === "object" && Array.isArray(d.punya)) return { punya: d.punya.filter((p) => cariModel(p.jenis, p.model)), slot: Number.isInteger(d.slot) ? d.slot : acakSlot() };
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return { punya: [], slot: acakSlot() };
};
function acakSlot() {
	return Math.floor(Math.random() * SLOT_MILIK);
}
let st = baca();
const pendengar = new Set();
function simpan() {
	try {
		localStorage.setItem(KUNCI, JSON.stringify(st));
	} catch {
		/* abaikan */
	}
	st = { ...st };
	pendengar.forEach((f) => f());
}
export const useGarasi = () =>
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => st,
	);
export const milikSaya = (jenis, model) => st.punya.find((p) => p.jenis === jenis && p.model === model) || null;
export const idUnit = (jenis, model) => idMilik(jenis, model, st.slot);

// Beli model (warna pilihan). Mengembalikan pesan galat atau null.
export function beliKendaraan(jenis, modelId, warna) {
	const m = cariModel(jenis, modelId);
	if (!m) return "Model tidak dikenal";
	if (milikSaya(jenis, modelId)) return "Kamu sudah punya model ini";
	if (!bayarKoin(m.harga)) return `Koin belum cukup — ${m.nama} 🪙 ${m.harga.toLocaleString("id-ID")}`;
	st.punya = [...st.punya, { jenis, model: modelId, warna: m.warna.includes(warna) ? warna : m.warna[0], beli: Date.now() }];
	simpan();
	catat("kendaraan");
	tambahXp(Math.round(m.harga / 25));
	// diserahkan di halaman showroom
	const serah = jenis === "mobil" ? SERAH_MOBIL : SERAH_MOTOR;
	tambahMilik(idUnit(jenis, modelId), milikSaya(jenis, modelId).warna, serah.x, serah.z, serah.rot);
	return null;
}

// Cat ulang (gratis di showroom).
export function catUlang(jenis, modelId, warna) {
	const p = milikSaya(jenis, modelId);
	if (!p) return;
	p.warna = warna;
	simpan();
	const k = KENDARAAN.find((v) => v.id === idUnit(jenis, modelId));
	if (k) {
		k.warna = warna;
		tambahMilik(k.id, warna, k.x, k.z, k.rot);
	}
}

// Panggil kendaraan milik ke dekat pemain (di luar gedung, lantai dasar). Mengembalikan
// pesan galat atau null.
export function panggilKendaraan(jenis, modelId) {
	const p = milikSaya(jenis, modelId);
	if (!p) return "Belum punya kendaraan ini";
	if (posisi.lantai !== 0) return "Panggil kendaraan dari luar gedung";
	const id = idUnit(jenis, modelId);
	const k = KENDARAAN.find((v) => v.id === id);
	if (k && posisi.kend === k) return "Kendaraan ini sedang kamu kendarai";
	const r = jenis === "mobil" ? 1.3 : 0.5;
	const arah = posisi.rot ?? 0;
	// coba beberapa titik di samping & depan pemain
	for (const jarak of [3, 4.5, 6]) {
		for (const sudut of [Math.PI / 2, -Math.PI / 2, 0, Math.PI, Math.PI / 4, -Math.PI / 4]) {
			const x = posisi.x + Math.sin(arah + sudut) * jarak;
			const z = posisi.z + Math.cos(arah + sudut) * jarak;
			if (!diKawasan(x, z) || Math.abs(tinggiTanah(x, z) - TANAH) > 0.3) continue;
			if (tabrakKendaraanStatis(x, z, r) || tabrakKendaraan(x, z, r, k)) continue;
			tambahMilik(id, p.warna, x, z, arah);
			return null;
		}
	}
	return "Tidak ada tempat lapang di dekatmu — coba di jalan atau halaman terbuka";
}

export const daftarMilik = () => st.punya.map((p) => ({ ...p, m: cariModel(p.jenis, p.model) }));
export const MODEL = MODEL_PER_JENIS;
