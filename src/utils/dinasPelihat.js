// Dinas PELIHAT (BPKAD & Inspektorat): akun dinas terkait yang hanya boleh
// melihat & mengunduh modul Bantuan Keuangan Perubahan — tanpa satupun fungsi
// verifikasi atau edit.
//
// Identitas dinas ikut di payload login maupun /auth/profile (lihat
// attachDinasInfo di backend), jadi cek ini aman dipakai di layout, penjaga
// rute, maupun halaman. Daftarnya harus sama dengan KODE_DINAS_PELIHAT di
// backend (src/middlewares/auth.js).
export const KODE_DINAS_PELIHAT = ['BPKAD', 'INSPEKTORAT'];

const kodeDinas = (user) =>
  String(user?.dinas?.kode_dinas || user?.dinas?.singkatan || '').trim().toUpperCase();

export const isDinasPelihat = (user) => KODE_DINAS_PELIHAT.includes(kodeDinas(user));

// Label dinas untuk judul halaman, mis. "BPKAD" atau "Inspektorat Daerah".
export const namaDinasPelihat = (user) =>
  user?.dinas?.singkatan || user?.dinas?.nama_dinas || 'Dinas Pelihat';

export default isDinasPelihat;
