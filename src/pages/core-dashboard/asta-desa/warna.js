/**
 * Warna dan pemformat angka untuk halaman Asta Desa.
 *
 * WARNANYA DIHITUNG, BUKAN DIPILIH DENGAN MATA. Rangkaian di bawah sudah diuji
 * terhadap lima pemeriksaan yang biasa membuat grafik gagal dibaca: rentang
 * kecerahan, ambang saturasi, keterpisahan bagi mata buta warna (deutan/protan/
 * tritan), keterpisahan bagi mata normal, dan kontras terhadap latar. Jangan
 * mengganti satu hex di sini "karena lebih enak dilihat" tanpa mengujinya ulang
 * — pasangan biru↔jingga di bawah terpisah ΔE 24,7 pada simulasi protanopia,
 * sedangkan pasangan yang tampak sama kontras bagi kita (mis. hijau↔jingga)
 * bisa jatuh di bawah 5 dan membuat piramida usia tak terbaca separuh pembaca.
 *
 * Pembagian tugasnya:
 *   SERI       — identitas (dua kelompok berbeda, mis. laki-laki vs perempuan)
 *   TANGGA     — urutan (tahap verifikasi: makin gelap makin jauh tahapnya)
 *   SEBARAN    — besaran menerus (jumlah sensus per kecamatan di peta)
 *   KEADAAN    — keadaan sistem (baik/awas/gawat), SELALU disertai label
 *
 * Merah bata brand DPMD sengaja TIDAK dipakai sebagai warna data. Di aplikasi
 * ini merah itu aksen identitas (kicker, sorot header); begitu ia jadi salah
 * satu batang grafik, pembaca kehilangan cara membedakan "ini brand" dari
 * "ini angka yang buruk".
 */

// Identitas — dipakai berurutan, tidak pernah diputar ulang.
export const SERI = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];

// Urutan tahap. Mulai dari langkah 250, bukan yang termuda: langkah yang lebih
// muda dari ini menghilang ke latar putih.
export const TANGGA = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#0d366b'];

// Besaran menerus untuk peta. Ujung termuda berarti "nyaris nol" dan memang
// boleh menyatu dengan latar.
export const SEBARAN = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#0d366b'];

export const KEADAAN = {
  baik: '#0ca30c',
  awas: '#fab219',
  gawat: '#d03b3b'
};

export const TINTA = {
  utama: '#0f172a',
  kedua: '#475569',
  redup: '#94a3b8',
  garis: '#e2e8f0'
};

/**
 * Tahap-tahap status sensus, dari "baru masuk" ke "tuntas".
 *
 * Daftar kuncinya dicocokkan dengan `includes`, bukan disamakan persis, karena
 * penamaan di ASTA DESA bisa berbunyi `pending_desa`, `diverifikasi_desa`, atau
 * "verifikasi desa" untuk tahap yang sama.
 */
const URUTAN_STATUS = [
  ['draft', 'baru', 'belum'],
  ['kirim', 'submit', 'diajukan', 'proses', 'pending'],
  ['desa'],
  ['kecamatan'],
  ['selesai', 'final', 'valid', 'verifikasi_selesai', 'terverifikasi', 'disetujui', 'approved']
];

/**
 * Nomor tahap sebuah status, atau -1 bila tidak dikenali.
 *
 * DICARI DARI TAHAP TERJAUH KE TERAWAL, dan itu bukan sekadar selera. Status
 * nyata di ASTA DESA adalah `pending_desa` dan `pending_kecamatan` — keduanya
 * memuat kata "pending", sehingga pencarian dari depan akan menjatuhkan keduanya
 * ke ember yang sama dan dua tahap berbeda tampil dengan warna serta urutan yang
 * identik. Kata yang lebih spesifik ("desa", "kecamatan") harus menang.
 *
 * Satu fungsi ini dipakai warna DAN pengurutan; sebelumnya keduanya menelusuri
 * arah yang berbeda, jadi batang yang berwarna tahap-3 bisa terurut sebagai
 * tahap-1.
 */
const indeksStatus = (status) => {
  const s = String(status || '').toLowerCase();
  for (let i = URUTAN_STATUS.length - 1; i >= 0; i -= 1) {
    if (URUTAN_STATUS[i].some((kata) => s.includes(kata))) return i;
  }
  return -1;
};

/** Warna satu status: makin gelap berarti tahapnya makin jauh. */
export const warnaStatus = (status) => {
  const i = indeksStatus(status);
  // Abu-abu untuk yang belum dikenali — terbaca sebagai "belum kami kenali",
  // bukan ikut mewarnai salah satu tahap.
  return i < 0 ? '#cbd5e1' : TANGGA[i];
};

/** Peringkat status untuk pengurutan (tahap awal lebih dulu, tak dikenal terakhir). */
export const peringkatStatus = (status) => {
  const i = indeksStatus(status);
  return i < 0 ? 99 : i;
};

/** Warna sebaran berdasarkan posisi nilai terhadap nilai tertinggi. */
export const warnaSebaran = (nilai, maks) => {
  if (!maks || nilai <= 0) return SEBARAN[0];
  const rasio = nilai / maks;
  const idx = Math.min(SEBARAN.length - 1, Math.floor(rasio * SEBARAN.length));
  return SEBARAN[idx];
};

// ── Format angka ─────────────────────────────────────────────────────────────

export const angka = (n) => Number(n ?? 0).toLocaleString('id-ID');

export const ringkas = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',')} jt`;
  if (v >= 1e4) return `${Math.round(v / 1e3)} rb`;
  return v.toLocaleString('id-ID');
};

export const persen = (bagian, total) => {
  if (!total) return '0%';
  const v = (Number(bagian) / Number(total)) * 100;
  return `${v >= 10 || v === 0 ? Math.round(v) : v.toFixed(1).replace('.', ',')}%`;
};

/** "diverifikasi_desa" -> "Diverifikasi desa" */
export const rapikanLabel = (teks) => {
  const s = String(teks ?? '').replace(/[_-]+/g, ' ').trim();
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const tanggalSingkat = (nilai) => {
  if (!nilai) return '—';
  const d = new Date(nilai);
  if (Number.isNaN(d.getTime())) return String(nilai);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
};

export const waktuSingkat = (nilai) => {
  if (!nilai) return '—';
  const d = new Date(nilai);
  if (Number.isNaN(d.getTime())) return String(nilai);
  return `${tanggalSingkat(nilai)}, ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Gaya sumbu recharts yang dipakai seragam: garis dan angka yang mundur ke
 * belakang supaya datanya yang menonjol, bukan rangkanya.
 *
 * Ditaruh di berkas ini, bukan di ui.jsx: berkas yang mengekspor komponen React
 * tidak boleh sekaligus mengekspor konstanta — Fast Refresh Vite akan berhenti
 * bekerja untuk seluruh berkas itu, dan setiap perubahan kecil memaksa halaman
 * memuat ulang penuh.
 */
export const GAYA_SUMBU = {
  tick: { fontSize: 11, fill: TINTA.kedua },
  stroke: TINTA.garis,
  tickLine: false,
  axisLine: false
};
