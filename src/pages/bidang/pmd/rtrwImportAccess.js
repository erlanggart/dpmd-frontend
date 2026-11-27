// Harus sama dengan RTRW_IMPORT_ROLES di routes/kelembagaan.routes.js — kalau
// berbeda, tombol muncul untuk user yang nanti ditolak 403 oleh backend.
const IMPORT_ROLES = ["superadmin", "pemberdayaan_masyarakat", "pemerintahan_desa", "kepala_bidang", "kepala_dinas"];
// Dua nama di atas juga dipakai checkRole() sebagai pseudo-peran berbasis bidang
// (BIDANG_ROLE_MAP), jadi seluruh pegawai bidang tersebut lolos apa pun perannya
// — pegawai, ketua_tim, bendahara, kabid. 5 = Pemberdayaan Masyarakat (PM/PMD),
// 6 = Pemerintahan Desa.
const IMPORT_BIDANG_IDS = [5, 6];

export const canImportRtrw = (user) =>
  IMPORT_ROLES.includes(String(user?.role || "").trim().toLowerCase())
  || IMPORT_BIDANG_IDS.includes(Number(user?.bidang_id));
