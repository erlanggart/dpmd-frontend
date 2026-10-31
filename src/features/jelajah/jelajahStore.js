import { useSyncExternalStore } from "react";
import { GEDUNG, TITIK_MULAI } from "./kantorConfig";

// Jembatan antara loop 3D (useFrame, ±60 kali per detik) dan UI React.
// Nilai yang berubah tiap frame dibaca langsung dari objek mutable di bawah;
// hanya perubahan yang jarang (area, lantai, sesuatu di dekat pemain) yang memicu
// render React.

// Masukan dari UI ke pemain: joystick (x kanan, y maju, -1..1), titik tujuan
// ketuk-untuk-jalan, dan permintaan pindah cepat.
// `lari` = tombol Lari (sakelar), `lariAnalog` = analog didorong penuh, `putar` = tombol putar
// kamera (-1 kiri, 1 kanan), `loncat` = minta meloncat, `aksi` = duduk/berdiri/naik/turun
// kendaraan (id dari `dekat`).
export const kendali = { arah: { x: 0, y: 0 }, lari: false, lariAnalog: false, putar: 0, loncat: false, aksi: null, target: null, teleport: null };

// Posisi pemain terkini (dibaca minimap, pintu otomatis, dan pegawai yang menoleh).
export const posisi = { x: TITIK_MULAI.x, y: 0, z: TITIK_MULAI.z, rot: TITIK_MULAI.rot, lantai: 0 };

// Pengunjung di luar gedung (halaman/teras): isi ruang-ruang di dalam tertutup dinding,
// jadi pegawai & petugas di sana tidak perlu digambar.
export const diLuarGedung = () => posisi.y < 0.9 && (posisi.x < GEDUNG.x0 || posisi.x > GEDUNG.x1 || posisi.z < GEDUNG.z0 || posisi.z > GEDUNG.z1);

// Posisi pegawai yang sedang berjalan, supaya pintu juga membuka untuk mereka.
export const posisiPejalan = [];

// `dekat`: id petugas/benda/kursi/kendaraan yang bisa dipakai saat ini.
// `mode`: "jalan", "duduk", "mobil", atau "motor".
let keadaan = { area: "luar", lantai: 0, dekat: null, minta: null, mode: "jalan" };
const pendengar = new Set();

export function setKeadaan(patch) {
	let berubah = false;
	for (const k in patch) if (keadaan[k] !== patch[k]) berubah = true;
	if (!berubah) return;
	keadaan = { ...keadaan, ...patch };
	pendengar.forEach((fn) => fn());
}

function langganan(fn) {
	pendengar.add(fn);
	return () => pendengar.delete(fn);
}

// Untuk dibaca di dalam useFrame tanpa memicu render ulang.
export const ambilKeadaan = () => keadaan;

export function useKeadaan() {
	return useSyncExternalStore(langganan, () => keadaan);
}

export function resetJelajah() {
	kendali.arah.x = 0;
	kendali.arah.y = 0;
	kendali.lari = false;
	kendali.lariAnalog = false;
	kendali.putar = 0;
	kendali.loncat = false;
	kendali.aksi = null;
	kendali.target = null;
	kendali.teleport = { ...TITIK_MULAI };
	keadaan = { area: "luar", lantai: 0, dekat: null, minta: null, mode: "jalan" };
	pendengar.forEach((fn) => fn());
}
