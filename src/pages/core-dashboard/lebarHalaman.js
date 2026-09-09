// Lebar isi halaman Core Dashboard.
//
// SATU ANGKA UNTUK SEMUA FITUR. Sebelumnya tiap halaman menentukan lebarnya
// sendiri — sebagian `max-w-7xl`, sebagian `max-w-5xl` — sehingga berpindah
// dari Statistik BUMDes ke Keuangan Desa terasa seperti berpindah aplikasi:
// isinya melompat melebar lalu menyempit lagi. Kesamaan lebar itu bukan
// kebetulan yang perlu dijaga manual; ditulis sekali di sini, dipakai semua.
//
// 104rem ≈ 1664px. Dipilih supaya tabel rekap per kecamatan dan deretan kartu
// statistik punya ruang di monitor lebar, tanpa membuat isinya membentang
// sampai tepi layar pada monitor ultrawide.
//
// Ditulis sebagai kelas Tailwind utuh, bukan potongan yang dirangkai
// (`max-w-[` + ukuran + `]`), karena pemindai Tailwind mencari kelas sebagai
// teks apa adanya — kelas yang dirangkai saat berjalan tidak akan pernah ikut
// dibuat.
export const LEBAR_CORE = 'max-w-[104rem]';

/**
 * Lebar kolom baca untuk teks mengalir — percakapan, paragraf penjelasan.
 *
 * Tidak semua isi pantas selebar tabel. Baris teks sepanjang 1664px membuat
 * mata kehilangan awal baris berikutnya, jadi yang dibaca sebagai kalimat
 * tetap dibatasi walau bingkai halamannya lebar.
 */
export const LEBAR_BACA = 'max-w-3xl';
