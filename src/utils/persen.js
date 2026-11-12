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

/**
 * Persen untuk data keuangan: dua desimal, sisanya DIPOTONG (bukan dibulatkan)
 * sehingga tidak pernah tampak lebih besar dari aslinya. 100% hanya bila lunas.
 */
export const persenMentah = (n, total) => (total > 0 && n > 0 ? Math.min((n / total) * 100, 100) : 0);

export const fmtPersenRinci = (p) => {
	const n = Number(p) || 0;
	if (n >= 100) return '100%';
	if (n <= 0) return '0%';
	// +1e-9 menahan galat float (83,87 tersimpan 83,8699…); batas 9999 menjaga 99,99% tak jadi 100%
	const seperseratus = Math.min(Math.floor(n * 100 + 1e-9), 9999);
	if (seperseratus === 0) return '<0,01%';
	return (seperseratus / 100).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};
