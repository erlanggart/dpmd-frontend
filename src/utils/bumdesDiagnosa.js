// Diagnosa ekonomi BUMDes dari sudut pandang DPMD sebagai PEMBINA.
//
// Pembina tidak butuh tahu "total omset kabupaten". Yang dibutuhkan adalah:
// siapa yang bermasalah, masalahnya apa, dan berapa uang desa yang
// dipertaruhkan. Berkas ini memusatkan definisi tiap masalah supaya panel
// ringkasan dan direktori memakai aturan yang sama persis.
//
// PEMISAHAN YANG WAJIB DIJAGA: "melaporkan omset Rp 0" dan "tidak melaporkan
// omset" adalah dua hal berbeda. Yang pertama terbukti mengendap; yang kedua
// belum diketahui dan hanya boleh ditagih datanya. Menggabungkannya menjadi
// satu angka berarti menuduh 90 desa atas sesuatu yang belum tentu benar.

const ada = (v) => v !== null && v !== undefined;

/** Penyertaan modal di atas Rp 5 M dianggap salah ketik, bukan angka asli. */
const BATAS_MODAL_WAJAR = 5_000_000_000;

/** Aset dianggap menganggur bila omset setahun kurang dari seperlima nilainya. */
const AMBANG_ASET_MENGANGGUR = 50_000_000;
const RASIO_PERPUTARAN_MIN = 0.2;

/**
 * Daftar masalah, berurutan dari yang paling mendesak bagi pembina.
 * `uji` menerima satu baris BUMDes dan mengembalikan true bila kena.
 */
export const MASALAH = [
  {
    key: 'modal_mengendap',
    label: 'Modal mengendap',
    jelas: 'Sudah disuntik modal desa, tapi melaporkan omset Rp 0',
    tindakan: 'Perlu pembinaan usaha atau evaluasi kelayakan',
    nada: 'kritis',
    uji: (d) => modalWajar(d) > 0 && omsetDilaporkanNol(d),
  },
  {
    key: 'modal_tanpa_laporan',
    label: 'Modal tanpa laporan',
    jelas: 'Sudah disuntik modal desa, tapi belum melaporkan omset sama sekali',
    tindakan: 'Tagih laporan sebelum dinilai — statusnya belum diketahui',
    nada: 'serius',
    uji: (d) => modalWajar(d) > 0 && !ada(d.omset_2025) && !ada(d.omset_2024),
  },
  {
    key: 'merugi',
    label: 'Merugi',
    jelas: 'Laba tercatat negatif',
    tindakan: 'Perlu pendampingan pengelolaan usaha',
    nada: 'kritis',
    uji: (d) => (ada(d.laba_2025) && d.laba_2025 < 0) || (ada(d.laba_2024) && d.laba_2024 < 0),
  },
  {
    key: 'tidak_setor',
    label: 'Untung tapi tidak menyetor',
    jelas: 'Membukukan laba, tapi kontribusi ke PADes Rp 0',
    tindakan: 'Ingatkan kewajiban setor — itu tujuan utama BUMDes',
    nada: 'serius',
    uji: (d) => d.laba_2025 > 0 && (d.pades_2025 === 0 || !ada(d.pades_2025)),
  },
  {
    key: 'omset_turun',
    label: 'Omset turun',
    jelas: 'Omset 2025 lebih rendah dari 2024',
    tindakan: 'Telusuri penyebab penurunan',
    nada: 'perhatian',
    uji: (d) => d.omset_2024 > 0 && d.omset_2025 > 0 && d.omset_2025 < d.omset_2024,
  },
  {
    key: 'aset_menganggur',
    label: 'Aset menganggur',
    jelas: 'Punya aset besar, tapi omset kurang dari seperlima nilainya',
    tindakan: 'Dorong pemanfaatan aset yang sudah ada',
    nada: 'perhatian',
    uji: (d) =>
      d.aset > AMBANG_ASET_MENGANGGUR &&
      (d.omset_2025 ?? 0) < d.aset * RASIO_PERPUTARAN_MIN,
  },
  {
    key: 'tak_terpantau',
    label: 'Tidak terpantau',
    jelas: 'Tidak ada satu pun angka keuangan yang dilaporkan',
    tindakan: 'Tidak bisa dinilai sama sekali sampai melapor',
    nada: 'serius',
    uji: (d) =>
      !ada(d.omset_2025) && !ada(d.omset_2024) && !ada(d.aset) && !ada(d.laba_2025),
  },
];

/** Modal yang masuk akal saja; nilai ekstrem dianggap salah ketik. */
export const modalWajar = (d) => {
  const v = d.total_penyertaan_modal || 0;
  return v > 0 && v <= BATAS_MODAL_WAJAR ? v : 0;
};

/** Omset yang BENAR-BENAR dilaporkan nol, bukan sekadar kosong. */
const omsetDilaporkanNol = (d) =>
  (ada(d.omset_2025) && d.omset_2025 === 0) ||
  (!ada(d.omset_2025) && ada(d.omset_2024) && d.omset_2024 === 0);

/** BUMDes sehat: berjalan, untung, dan menyetor ke kas desa. */
export const sehat = (d) => d.omset_2025 > 0 && d.laba_2025 > 0 && d.pades_2025 > 0;

/** Daftar key masalah yang dikenai satu BUMDes. */
export const diagnosa = (d) => MASALAH.filter((m) => m.uji(d)).map((m) => m.key);

/**
 * Rekap untuk panel pembina: jumlah dan nilai modal yang dipertaruhkan
 * per jenis masalah.
 */
export const rekapMasalah = (data) =>
  MASALAH.map((m) => {
    const kena = data.filter(m.uji);
    return {
      ...m,
      jumlah: kena.length,
      modal: kena.reduce((t, d) => t + modalWajar(d), 0),
      persen: data.length ? Math.round((kena.length / data.length) * 100) : 0,
    };
  });
