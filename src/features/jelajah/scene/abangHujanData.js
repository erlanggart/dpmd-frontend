import { DERMAGA, KIOS_DERMAGA, keDuniaDermaga } from "./situ";

// Titik abang payung/jas hujan di kawasan kantor (muncul hanya saat hujan, lihat PedagangHujan.jsx).
// rot = arah hadap abang (0 = +z). Dermaga: di samping pangkal titian, menghadap titian.
// datang = arah asal abang berjalan masuk (bawaan +x): dermaga dari sisi darat supaya tidak
// melewati air; Dermaga Utara dari +z karena sisi daratnya terhalang bangunan.
// shortcut: tanpa tabrakan, tambah penghalang dinamis bila dikeluhkan
export const ABANG_HUJAN = [
	{ x: -3, z: 30.35, rot: 0, tempat: "trotoar depan kantor" },
	{ x: 2, z: 40.7, rot: Math.PI, tempat: "trotoar depan Alfamart" },
	...DERMAGA.map((d) => ({
		...keDuniaDermaga(d, KIOS_DERMAGA.s - 2.4, KIOS_DERMAGA.w),
		rot: Math.atan2(-d.nz, d.nx), // menghadap titian (arah −w)
		datang: d.id === "utara" ? [0, 1] : [-d.nx, -d.nz],
		tempat: d.nama,
	})),
];
