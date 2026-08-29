// Aturan penyaringan bersama untuk halaman Statistik BUMDes.
//
// Satu berkas ini dipakai kartu ringkasan, seluruh grafik, DAN direktori di
// bawahnya. Sebelumnya penyaringan hanya ada di dalam direktori, sehingga
// grafik di atasnya tetap menampilkan 416 BUMDes walau tabelnya sudah
// menyaring satu kecamatan — angkanya saling bertentangan di layar yang sama.
//
// Semua normalisasi ada di sini karena datanya kotor: pemeringkatan ditulis
// "PERINTIS" di kolom 2024 tapi "Perintis" di kolom 2026, peran program diisi
// "tidakadaperan", "-", atau string kosong, dan kolom angka boleh null.

/** Nilai "kosong" versi manusia: null, string kosong, "-", "tidak ada peran". */
const KOSONG = new Set(['', '-', '–', 'tidakadaperan', 'tidak ada peran', 'tidak', 'none', 'n/a']);

export const adaIsi = (v) => {
  if (v === null || v === undefined) return false;
  return !KOSONG.has(String(v).trim().toLowerCase().replace(/\s+/g, ' '));
};

/** Peran program pemerintah: apakah BUMDes ini punya peran, apa pun bentuknya. */
export const berperan = (v) => adaIsi(v);

export const isAktif = (status) =>
  String(status ?? '').toLowerCase().replace(/[\s-]+/g, '_') === 'aktif';

/** "PERINTIS" dan "Perintis" adalah kelas yang sama. */
export const rapikanPeringkat = (v) => {
  const t = String(v ?? '').trim().toLowerCase();
  if (!t) return null;
  const cocok = URUTAN_PERINGKAT.find((p) => p.toLowerCase() === t);
  return cocok || null;
};

export const URUTAN_PERINGKAT = ['Perintis', 'Pemula', 'Berkembang', 'Maju'];

export const PERINGKAT_KOSONG = 'Belum dinilai';

/**
 * Kelas resmi satu BUMDes — SELALU dari penilaian 2024.
 *
 * Penilaian 2026 masih berjalan dan baru mencakup sebagian; 97 dari 416 BUMDes
 * punya kelas 2026 yang BERBEDA dari 2024. Kalau tabel menampilkan 2026
 * sementara grafik dan penyaring memakai 2024, menyaring "Maju" akan
 * memunculkan baris yang kolomnya tertulis "Berkembang". Satu tahun saja untuk
 * semua tempat; penilaian 2026 hanya muncul di panel detail, diberi label
 * tahunnya sendiri.
 */
export const peringkatResmi = (d) => rapikanPeringkat(d.pemeringkatan_2024) || PERINGKAT_KOSONG;

// Urut dari paling jauh ke paling selesai — dipakai sebagai tangga ordinal di
// grafik, jadi urutannya bermakna dan tidak boleh diacak.
export const URUTAN_BADAN_HUKUM = [
  'Belum Melakukan Proses',
  'Perbaikan Dokumen',
  'Nama Terverifikasi',
  'Terbit Sertifikat Badan Hukum',
];

export const BADAN_HUKUM_LAINNYA = 'Nilai lain / tidak dikenal';

/**
 * Tahap badan hukum satu BUMDes, SELALU jatuh ke salah satu ember.
 *
 * Sel kosong dihitung "Belum Melakukan Proses". Nilai di luar keempat tahap
 * resmi masuk ember "lainnya" alih-alih hilang diam-diam — dengan begitu
 * jumlah batang pada grafik dijamin sama dengan jumlah baris yang sedang
 * ditampilkan, berapa pun isi kolomnya kelak.
 */
export const tahapBadanHukum = (d) => {
  if (!adaIsi(d.badan_hukum)) return URUTAN_BADAN_HUKUM[0];
  const nilai = String(d.badan_hukum).trim();
  return URUTAN_BADAN_HUKUM.includes(nilai) ? nilai : BADAN_HUKUM_LAINNYA;
};

export const KELAS_OMSET = [
  { id: 'nol', label: 'Belum melaporkan omset', min: null, maks: null },
  { id: 'kecil', label: 'di bawah Rp 10 Jt', min: 0.0001, maks: 1e7 },
  { id: 'menengah', label: 'Rp 10–50 Jt', min: 1e7, maks: 5e7 },
  { id: 'besar', label: 'Rp 50–250 Jt', min: 5e7, maks: 2.5e8 },
  { id: 'sangat-besar', label: 'Rp 250 Jt – 1 M', min: 2.5e8, maks: 1e9 },
  { id: 'raksasa', label: 'di atas Rp 1 M', min: 1e9, maks: Infinity },
];

/** Omset tahun terbaru yang tersedia. 2025 kalau ada, kalau tidak 2024. */
export const omsetTerbaru = (d) =>
  d.omset_2025 !== null && d.omset_2025 !== undefined ? d.omset_2025 : d.omset_2024;

/**
 * "Benar-benar berusaha" = melaporkan omset di atas nol pada tahun terbaru yang
 * diisinya. Satu definisi untuk kartu ringkasan, grafik ekonomi, DAN penyaring
 * skala omset — kalau dibiarkan tiga rumus, ketiganya bisa menyebut angka
 * berbeda untuk kalimat yang sama.
 */
export const beroperasi = (d) => (omsetTerbaru(d) || 0) > 0;

export const kelasOmsetDari = (d) => {
  const v = omsetTerbaru(d);
  if (v === null || v === undefined || v <= 0) return 'nol';
  return KELAS_OMSET.find((k) => k.min !== null && v >= k.min && v < k.maks)?.id || 'nol';
};

export const DOKUMEN_INTI = [
  'perdes', 'anggaran_dasar', 'anggaran_rumah_tangga',
  'program_kerja', 'sk_bum_desa', 'profil', 'berita_acara',
];

/** Berapa dari 7 dokumen inti yang sudah terunggah. */
export const jumlahDokumen = (d) =>
  DOKUMEN_INTI.filter((k) => d.dokumen?.[k]).length;

export const kelasDokumen = (d) => {
  const n = jumlahDokumen(d);
  if (n === 0) return 'kosong';
  if (n >= DOKUMEN_INTI.length) return 'lengkap';
  return 'sebagian';
};

/** Tiga identitas legal yang dipantau dinas. */
export const jumlahLegalitas = (d) =>
  [d.nib, d.npwp, d.lkpp].filter(adaIsi).length;

/* ------------------------------------------------------------------ filter -- */

export const FILTER_AWAL = {
  cari: '',
  kecamatan: 'semua',
  status: 'semua',
  badanHukum: 'semua',
  peringkat: 'semua',
  kelasOmset: 'semua',
  program: 'semua',      // ketapang | wisata | mbg | tanpa-peran
  dokumen: 'semua',      // lengkap | sebagian | kosong
  legalitas: 'semua',    // nib | npwp | lkpp | lengkap | belum
};

export const adaFilterAktif = (f) =>
  Object.keys(FILTER_AWAL).some((k) => f[k] !== FILTER_AWAL[k]);

export const jumlahFilterAktif = (f) =>
  Object.keys(FILTER_AWAL).filter((k) => f[k] !== FILTER_AWAL[k]).length;

const cocokProgram = (d, pilihan) => {
  switch (pilihan) {
    case 'ketapang': return berperan(d.ketahanan_pangan);
    case 'wisata': return berperan(d.desa_wisata);
    case 'mbg': return berperan(d.peran_mbg);
    case 'tanpa-peran':
      return !berperan(d.ketahanan_pangan) && !berperan(d.desa_wisata) && !berperan(d.peran_mbg);
    default: return true;
  }
};

const cocokLegalitas = (d, pilihan) => {
  switch (pilihan) {
    case 'nib': return adaIsi(d.nib);
    case 'npwp': return adaIsi(d.npwp);
    case 'lkpp': return adaIsi(d.lkpp);
    case 'lengkap': return jumlahLegalitas(d) === 3;
    case 'belum': return jumlahLegalitas(d) === 0;
    default: return true;
  }
};

/**
 * Menyaring daftar BUMDes. Pencarian memakai semua kata: setiap kata harus
 * muncul di suatu tempat pada baris itu, jadi "jonggol maju" menemukan BUMDes
 * berkelas Maju di Jonggol tanpa peduli urutan ketikannya.
 */
export const terapkanFilter = (data, f) => {
  const kata = f.cari.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return data.filter((d) => {
    if (f.kecamatan !== 'semua' && d.kecamatan !== f.kecamatan) return false;
    if (f.status !== 'semua') {
      const aktif = isAktif(d.status);
      if (f.status === 'aktif' && !aktif) return false;
      if (f.status === 'tidak_aktif' && aktif) return false;
    }
    if (f.badanHukum !== 'semua' && tahapBadanHukum(d) !== f.badanHukum) return false;
    if (f.peringkat !== 'semua' && peringkatResmi(d) !== f.peringkat) return false;
    if (f.kelasOmset !== 'semua' && kelasOmsetDari(d) !== f.kelasOmset) return false;
    if (!cocokProgram(d, f.program)) return false;
    if (f.dokumen !== 'semua' && kelasDokumen(d) !== f.dokumen) return false;
    if (!cocokLegalitas(d, f.legalitas)) return false;

    if (!kata.length) return true;
    const teks = [
      d.nama, d.desa, d.kecamatan, d.direktur, d.jenis_usaha_utama,
      d.jenis_usaha, d.badan_hukum, d.pemeringkatan_2024, d.nomor_perdes,
    ].filter(Boolean).join(' ').toLowerCase();
    return kata.every((k) => teks.includes(k));
  });
};
