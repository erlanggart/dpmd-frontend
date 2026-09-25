// Dinas PELIHAT (BPKAD & Inspektorat): akun dinas terkait yang hanya boleh
// melihat & mengunduh modul Bantuan Keuangan Perubahan — tanpa satupun fungsi
// verifikasi atau edit.
//
// Identitas dinas ikut di payload login maupun /auth/profile (lihat
// attachDinasInfo di backend), jadi cek ini aman dipakai di layout, penjaga
// rute, maupun halaman. Daftarnya harus sama dengan KODE_DINAS_PELIHAT di
// backend (src/middlewares/auth.js).
export const KODE_DINAS_PELIHAT = ['BPKAD', 'INSPEKTORAT'];

// Dinas yang boleh melihat SELURUH proposal Bankeu Perubahan (semua tahap) di
// halaman pelihat — tetap hanya lihat, unduh, filter & ekspor. Berbeda dengan
// KODE_DINAS_PELIHAT, menu dinas lainnya (mis. Verifikasi Bankeu) tetap ada.
// Harus sama dengan KODE_DINAS_LIHAT_SEMUA_PERUBAHAN di backend.
export const KODE_DINAS_LIHAT_SEMUA = ['DLH', 'DLHK'];

const kodeDinas = (user) =>
  String(user?.dinas?.kode_dinas || user?.dinas?.singkatan || '').trim().toUpperCase();

export const isDinasPelihat = (user) => KODE_DINAS_PELIHAT.includes(kodeDinas(user));

export const isDinasLihatSemuaPerubahan = (user) => KODE_DINAS_LIHAT_SEMUA.includes(kodeDinas(user));

// Boleh membuka halaman /dinas/pelihat/bankeu-perubahan?
export const canViewBankeuPerubahanPelihat = (user) =>
  isDinasPelihat(user) || isDinasLihatSemuaPerubahan(user);

// Label dinas untuk judul halaman, mis. "BPKAD" atau "Inspektorat Daerah".
export const namaDinasPelihat = (user) =>
  user?.dinas?.singkatan || user?.dinas?.nama_dinas || 'Dinas Pelihat';

export default isDinasPelihat;
