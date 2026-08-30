import API_CONFIG from '../../../config/api';
// Warna, format angka, dan gerak untuk halaman Statistik BUMDes.
//
// Dipisah dari komponennya karena satu berkas yang mengekspor komponen DAN
// konstanta mematikan fast refresh saat pengembangan.
//
// WARNA. Satu hue slate, terang -> gelap. Seluruh data berkategori di halaman
// ini BERURUT (belum proses..terbit sertifikat, Perintis..Maju, kelas omset,
// aktif vs tidak aktif), jadi tangga ordinal satu hue — bukan palet
// kategorikal. Divalidasi sebagai ordinal: lightness menurun rata, jarak antar
// langkah >= 0.06, dan langkah paling terang (#94a3b8) mencapai 2,56:1 terhadap
// permukaan putih, di atas lantai 2:1.
//
// Karena langkah paling terang TIDAK mencapai 3:1, setiap batang wajib
// berlabel angka yang terbaca tanpa hover, dan tabel direktori di bawah
// halaman berfungsi sebagai padanan tabelnya.
//
// Kategori yang TIDAK berurut (nama kecamatan, jenis dokumen, jenis program)
// memakai SATU warna untuk semua batang. Mewarnai batang makin gelap makin
// besar pada kategori tanpa urutan hanya mengulang panjang batang dengan hue.
import { useEffect, useRef, useState } from 'react';

/** Tangga ordinal slate, terang -> gelap. */
export const RAMP = ['#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'];

/** Warna tunggal untuk kategori tanpa urutan. */
export const WARNA_TUNGGAL = '#334155';

/** Dua langkah untuk pasangan berurut aktif / tidak aktif. */
export const WARNA_AKTIF = '#0f172a';
export const WARNA_TIDAK_AKTIF = '#94a3b8';

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
