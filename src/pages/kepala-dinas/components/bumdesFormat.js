import API_CONFIG from '../../../config/api';
// Warna, format angka, dan gerak untuk halaman Statistik BUMDes.
//
// Dipisah dari komponennya karena satu berkas yang mengekspor komponen DAN
// konstanta mematikan fast refresh saat pengembangan.
//
// WARNA. Seluruh data berkategori di halaman ini BERURUT (belum proses..terbit
// sertifikat, Perintis..Maju, kelas omset, aktif vs tidak aktif), jadi yang
// dipakai tangga ORDINAL satu rona — bukan palet kategorikal yang berganti rona
// tiap batang.
//
// Sebelumnya tangganya slate, dan seluruh halaman jadi abu-abu tanpa satu pun
// titik warna. Ordinal tidak mengharuskan abu-abu; ia hanya mengharuskan SATU
// rona per konteks. Karena halaman ini memuat DUA konteks berurut sekaligus —
// tahapan badan hukum dan kelas BUM Desa — keduanya diberi ramp sendiri: biru
// untuk yang pertama, oranye untuk yang kedua.
//
// Keduanya divalidasi sebagai ordinal pada latar terang, dan hasilnya:
//   lightness monoton, jarak antar langkah >= 0.06, dan langkah paling terang
//   masih di atas lantai 2:1 terhadap permukaan (#86b6ef 2,06:1; #eda27b 2,1:1).
// Jangan menyisipkan langkah di tengah tanpa menjalankan ulang validatornya —
// dua langkah bersebelahan yang terlalu dekat membuat urutannya berhenti
// terbaca.
//
// Karena langkah paling terang TIDAK mencapai 3:1, setiap batang wajib
// berlabel angka yang terbaca tanpa hover, dan tabel direktori di bawah
// halaman berfungsi sebagai padanan tabelnya.
//
// Kategori yang TIDAK berurut (nama kecamatan, jenis dokumen, jenis program)
// memakai SATU warna untuk semua batang. Mewarnai batang makin gelap makin
// besar pada kategori tanpa urutan hanya mengulang panjang batang dengan hue.
import { useEffect, useRef, useState } from 'react';

/** Tangga ordinal biru, terang -> gelap. Konteks berurut utama. */
export const RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281', '#0a2650'];

/**
 * Tangga ordinal oranye untuk konteks berurut KEDUA di halaman yang sama
 * (kelas BUM Desa). Dua konteks berurut berdampingan tidak boleh memakai rona
 * yang sama — pembacanya akan mengira keduanya satu skala.
 */
export const RAMP_AKSEN = ['#eda27b', '#e87b45', '#d9591f', '#ad4419', '#7d3012', '#4f1e0b'];

/** Warna tunggal untuk kategori tanpa urutan. */
export const WARNA_TUNGGAL = '#2a78d6';

/** Dua langkah untuk pasangan berurut aktif / tidak aktif. */
export const WARNA_AKTIF = '#104281';
export const WARNA_TIDAK_AKTIF = '#86b6ef';

export const nf = new Intl.NumberFormat('id-ID');

export const rupiahRingkas = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `Rp ${(n / 1e12).toFixed(1).replace('.', ',')} T`;
  if (abs >= 1e9) return `Rp ${(n / 1e9).toFixed(1).replace('.', ',')} M`;
  if (abs >= 1e6) return `Rp ${Math.round(n / 1e6)} Jt`;
  if (abs >= 1e3) return `Rp ${Math.round(n / 1e3)} Rb`;
  return `Rp ${nf.format(n)}`;
};

export const persenDari = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

/* ------------------------------------------------------------------ gerak -- */

export const kurangiGerak = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Lengkung perlambatan tunggal halaman ini: cepat di awal, mendarat pelan. */
export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Menandai kapan sebuah elemen masuk layar, sekali saja.
 *
 * Grafik yang sudah selesai beranimasi sebelum digulir ke bawah sama saja
 * dengan grafik tanpa animasi. Batang baru tumbuh saat kartunya benar-benar
 * terlihat, dan tidak diulang saat digulir naik-turun.
 */
export const useTampil = () => {
  const ref = useRef(null);
  const [terlihat, setTerlihat] = useState(() => kurangiGerak());

  useEffect(() => {
    const el = ref.current;
    if (!el || terlihat) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setTerlihat(true); return undefined; }

    const pengamat = new IntersectionObserver(
      ([masuk]) => {
        if (masuk.isIntersecting) { setTerlihat(true); pengamat.disconnect(); }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    );
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, [terlihat]);

  return [ref, terlihat];
};

/**
 * Angka yang berjalan ke nilai barunya saat filter berubah.
 * Dipakai HANYA pada angka utama kartu ringkasan — angka berjalan di setiap
 * label batang akan jadi kebisingan, bukan informasi.
 */
export const useAngkaBergerak = (target, durasi = 550) => {
  const [nilai, setNilai] = useState(target);
  const dariRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (kurangiGerak()) { setNilai(target); dariRef.current = target; return undefined; }

    const dari = dariRef.current;
    if (dari === target) return undefined;

    const mulai = performance.now();
    const langkah = (kini) => {
      const t = Math.min(1, (kini - mulai) / durasi);
      const eased = 1 - Math.pow(1 - t, 3);
      setNilai(Math.round(dari + (target - dari) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(langkah);
      else dariRef.current = target;
    };
    rafRef.current = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durasi]);

  return nilai;
};

/** Rupiah penuh, untuk panel detail yang punya ruang. */
export const rupiah = (n) =>
  n === null || n === undefined || Number.isNaN(n) ? null : `Rp ${nf.format(Math.round(n))}`;

/** Nilai teks yang benar-benar berisi, atau null bila kosong/placeholder. */
export const teksAtauNull = (v) => {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === '' || t === '-' || t === '–' ? null : t;
};

/**
 * URL berkas dokumen BUMDes.
 *
 * Server mengirim folder + nama berkas, bukan URL utuh: BASE_URL di backend
 * menunjuk origin frontend sehingga URL rakitan server akan salah alamat.
 * Alamat penyimpanan yang benar sudah ada di API_CONFIG.STORAGE_URL.
 */
export const urlBerkas = (b) => {
  if (!b || !b.nama) return null;

  // `jalur` dipakai berkas yang TIDAK tinggal di bawah /uploads. Dokumen dari
  // modul Produk Hukum misalnya ada di storage/produk_hukum/, sementara
  // API_CONFIG.STORAGE_URL menunjuk ke /uploads — merangkainya dengan `folder`
  // menghasilkan /uploads/produk-hukum/... yang tidak pernah ada isinya.
  if (b.jalur) {
    const asal = String(API_CONFIG.STORAGE_URL || '').replace(/\/uploads\/?$/, '');
    return `${asal}${b.jalur}`;
  }

  return b.folder
    ? `${API_CONFIG.STORAGE_URL}/${b.folder}/${encodeURIComponent(b.nama)}`
    : null;
};
