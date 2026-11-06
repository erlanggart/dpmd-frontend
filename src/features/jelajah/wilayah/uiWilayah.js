import { useSyncExternalStore } from "react";

/* Keadaan UI dunia kecamatan yang dihitung di dalam loop 3D (tombol aksi terdekat). */
export const uiWilayah = { dekat: null, depan: null };
// posisi pemain (dibaca warga & hewan untuk menoleh / kabur), ditulis tiap frame
export const pemainWilayah = { x: 0, z: 0, rot: 0 };
const pendengar = new Set();
let versi = 0;

/** dekat: tombol aksi; depan: indeks petak di depan tokoh (untuk info tumbuh) */
export function aturDekat(dekat, depan = null) {
	if (uiWilayah.dekat === dekat && uiWilayah.depan === depan) return;
	uiWilayah.dekat = dekat;
	uiWilayah.depan = depan;
	versi++;
	pendengar.forEach((f) => f());
}

export const useUiWilayah = () => useSyncExternalStore((f) => (pendengar.add(f), () => pendengar.delete(f)), () => versi);
