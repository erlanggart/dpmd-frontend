// Status BUMDes sampai ke frontend dalam DUA ejaan, tergantung jalurnya:
//
//   - Lewat Prisma (`/api/bumdes`, `/api/desa/bumdes`)  -> "tidak_aktif"
//     Prisma memakai nama anggota enum, bukan nilai basis datanya.
//   - Lewat SQL mentah (Prolap `/api/prolap/output-bumdes`) -> "tidak aktif"
//     Query mentah mengembalikan nilai kolom apa adanya.
//
// Perbandingan langsung `status === 'tidak aktif'` karena itu selalu gagal pada
// data dari Prisma, dan penghitung "Tidak Aktif" di dashboard SPKED selalu
// menunjukkan 0. Semua perbandingan status harus lewat pembantu di sini.

/** Seragamkan ejaan apa pun jadi 'aktif' | 'tidak_aktif' | ''. */
export const normalkanStatus = (status) =>
  String(status ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

export const isAktif = (status) => normalkanStatus(status) === 'aktif';

export const isTidakAktif = (status) => normalkanStatus(status) === 'tidak_aktif';

/** Cocokkan nilai filter dengan status baris, tanpa peduli ejaannya. */
export const cocokStatus = (status, filter) =>
  !filter || filter === 'all' || normalkanStatus(status) === normalkanStatus(filter);

/** Label untuk ditampilkan ke pengguna. */
export const labelStatus = (status) => {
  const v = normalkanStatus(status);
  if (v === 'aktif') return 'Aktif';
  if (v === 'tidak_aktif') return 'Tidak Aktif';
  return '-';
};

/** Nilai yang dikirim ke API — sama dengan nama anggota enum di Prisma. */
export const NILAI_STATUS = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'tidak_aktif', label: 'Tidak Aktif' },
];
