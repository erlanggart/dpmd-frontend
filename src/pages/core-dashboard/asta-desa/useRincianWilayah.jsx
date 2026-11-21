import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** Nilai kolom kategori untuk "tidak terisi" (lihat buatPenilai di RincianWilayah). */
export const KOSONG = '__kosong__';

/**
 * Alamat halaman rincian per wilayah. Seluruh keadaannya ada di URL — titik
 * data (`p`), kecamatan/desa yang sedang dibuka, dan alamat kembali — supaya
 * tombol Kembali peramban bekerja per langkah dan tautannya bisa dibagikan.
 */
export const alamatRincian = (base, pemilih, filter = {}, kembali = '') => {
  const q = new URLSearchParams();
  q.set('p', JSON.stringify(pemilih));
  if (filter.kecamatan) q.set('kec', filter.kecamatan);
  if (filter.kecamatan && filter.desa) q.set('desa', filter.desa);
  if (kembali) q.set('kembali', kembali);
  return `${base.replace(/\/+$/, '')}/rincian?${q.toString()}`;
};

/**
 * `buka(pemilih)` membawa pemakai ke halaman rincian (bukan pop-up lagi),
 * dengan penyaring wilayah tab Demografi sebagai titik awal. `modal` tetap ada
 * (selalu null) supaya pemakai lama tidak perlu diubah.
 */
export const useRincianWilayah = (filter) => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const buka = useCallback(
    (pemilih) => navigate(alamatRincian(pathname, pemilih, filter || {}, search || '?tab=demografi')),
    [navigate, pathname, search, filter]
  );
  return { buka, modal: null };
};
