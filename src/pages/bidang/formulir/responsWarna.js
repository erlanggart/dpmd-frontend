/**
 * Warna grafik halaman respons.
 *
 * Aturan yang dipakai di sini, dan alasannya:
 *
 * 1. Sebaran pilihan (pilihan ganda, dropdown, kotak centang) memakai SATU warna
 *    untuk semua batang. Yang dibandingkan besarannya, bukan identitasnya —
 *    memberi tiap opsi warna sendiri menyiratkan pengelompokan yang tidak ada,
 *    dan mewarnai batang makin gelap makin besar hanya mengulang panjang batang
 *    dengan saluran yang seharusnya bebas.
 *
 * 2. Skala 1–4 (bentuk SKM) memakai tangga divergen merah↔biru: dua kutub yang
 *    terbaca berlawanan. "Setuju" dan "tidak setuju" bukan sekadar dua kategori,
 *    jadi batang satu warna justru menyembunyikan yang paling ingin dilihat
 *    pembaca — condong ke mana jawabannya.
 *
 * 3. Skala selain 4 titik kembali ke batang satu warna. Tangga divergen 6 langkah
 *    sudah tidak lolos ambang keterbedaan, dan menambah langkah warna hanya
 *    membuat dua kelas bersebelahan mustahil dipisahkan.
 *
 * Palet pada (2) diuji dengan `scripts/validate_palette.js` (keluarga skill
 * dataviz) terhadap latar putih: pemisahan buta warna terburuk ΔE 13,6 (protan)
 * dan penglihatan normal ΔE 20,5 — keduanya lolos. Dua langkah tengahnya di
 * bawah kontras 3:1 terhadap latar, jadi angkanya WAJIB ikut tertulis (label
 * langsung + tampilan tabel), tidak boleh mengandalkan warna saja. Itu sebabnya
 * komponen skala selalu menyediakan tombol "Tabel".
 */

/** Satu warna untuk seluruh batang sebaran. */
export const WARNA_BATANG = "#0f172a";

/** Merah↔biru, dari "sangat tidak setuju" ke "sangat setuju". */
export const SKALA_DIVERGEN = ["#b93636", "#eb908f", "#6da7ec", "#1f66bd"];

/** Panjang skala yang boleh digambar divergen. */
export const bolehDivergen = (jumlahTitik) => jumlahTitik === SKALA_DIVERGEN.length;

/**
 * Teks putih atau gelap di atas satu warna isi — dipilih dari terangnya warna
 * supaya label di dalam segmen selalu terbaca.
 */
export const tintaDiAtas = (hex) => {
	const n = parseInt(hex.replace("#", ""), 16);
	const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	const terang = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return terang > 0.62 ? "#0f172a" : "#ffffff";
};

/** Hex → [r, g, b], dipakai jsPDF yang tidak menerima hex. */
export const keRgb = (hex) => {
	const n = parseInt(hex.replace("#", ""), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
