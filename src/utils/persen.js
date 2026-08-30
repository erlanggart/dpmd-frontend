// src/utils/persen.js
//
// Persentase yang tidak berbohong di kedua ujungnya.
//
// Math.round membuat 415 dari 416 desa terbaca "100%" dan satu desa yang belum
// selesai terbaca "0%". Dua-duanya salah, dan justru pada angka yang paling
// diperiksa orang: dasbor ini dipakai untuk menagih yang belum selesai, jadi
// satu baris tersisa tidak boleh hilang di pembulatan.
//
// Aturannya: 100% hanya keluar kalau benar-benar seluruhnya, 0% hanya kalau
// benar-benar nol, dan sisanya ditampilkan apa adanya sampai satu desimal.

/**
 * Persentase `n` dari `total`, ditahan satu langkah sebelum ujung selama
 * belum benar-benar mencapainya.
 *
 * @returns {number} 0–100
 */
export const persen = (n, total) => {
	if (!total || total <= 0) return 0;
	if (n <= 0) return 0;
	if (n >= total) return 100;
	const p = (n / total) * 100;
	if (p > 99.9) return 99.9;
	if (p < 0.1) return 0.1;
	return p;
};

/**
 * Teks persen: tanpa desimal bila memang bulat, satu desimal bila tidak.
 * Pemisah desimalnya koma, mengikuti penulisan angka Indonesia.
 */
export const fmtPersen = (p) => {
	const n = Number(p) || 0;
	const bulat = Math.round(n);
	return (Math.abs(n - bulat) < 0.05 ? String(bulat) : n.toFixed(1).replace('.', ',')) + '%';
};

/** Jalan pintas: hitung sekaligus format. */
export const persenTeks = (n, total) => fmtPersen(persen(n, total));
