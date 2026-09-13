/**
 * Pengambil data Peta Sebaran.
 *
 * Tiga sumber tetap (titik, layer, daftar kecamatan) memakai `useAstaDesa` yang
 * sudah ada, supaya ikut cache tingkat modul dan tombol "muat ulang" di halaman
 * Asta Desa — peta ini tidak boleh punya cache sendiri yang diam-diam
 * menampilkan data berbeda dari tab di sebelahnya.
 *
 * Tiga sumber sesuai-permintaan (desa, batas wilayah, cuaca, detail satu
 * keluarga) memakai pengambil kecil di bawah. Keempatnya dipanggil sebagai
 * reaksi atas perbuatan pengguna — memilih kecamatan, mengklik peta — jadi
 * bentuk hook tidak cocok: yang dibutuhkan fungsi yang bisa ditunggu, bukan
 * state yang ikut siklus render.
 */

import { useMemo } from 'react';
import api from '../../../../api';
import { useAstaDesa } from '../useAstaDesa';

/**
 * Cache sesuai-permintaan, seumur tab.
 *
 * Batas wilayah dan detail keluarga tidak berubah selama satu kunjungan, dan
 * keduanya lazim diminta berulang: pengguna berpindah kecamatan lalu kembali,
 * atau mengklik titik yang sama dua kali. Tanpa cache ini, setiap klik ulang
 * membayar satu perjalanan jaringan untuk jawaban yang sudah ada di tangan.
 */
const simpanan = new Map();
const berjalan = new Map();

const sekali = (kunci, pembuat) => {
  if (simpanan.has(kunci)) return Promise.resolve(simpanan.get(kunci));
  if (berjalan.has(kunci)) return berjalan.get(kunci);

  const p = pembuat()
    .then((nilai) => {
      simpanan.set(kunci, nilai);
      berjalan.delete(kunci);
      return nilai;
    })
    .catch((err) => {
      berjalan.delete(kunci);
      throw err;
    });

  berjalan.set(kunci, p);
  return p;
};

/** Buang cache sesuai-permintaan — dipanggil bersama "muat ulang" halaman. */
export const bersihkanSimpananPeta = () => {
  simpanan.clear();
};

const isi = (res) => {
  const body = res?.data;
  if (!body?.success) throw new Error(body?.message || 'Respons Asta Desa tidak valid');
  return body.data ?? null;
};

/** Pesan galat yang bisa ditindaklanjuti — pesan backend lebih berguna. */
const pesanGalat = (err, cadangan) =>
  err?.response?.data?.message || err?.message || cadangan;

/** Daftar desa satu kecamatan. */
export const ambilDesa = (kecamatan) =>
  sekali(`desa:${kecamatan}`, () =>
    api
      .get('/asta-desa/wilayah/desa', { params: { kecamatan } })
      .then(isi)
      .then((d) => (Array.isArray(d) ? d : []))
      .catch((err) => {
        throw new Error(pesanGalat(err, 'Gagal memuat daftar desa'));
      })
  );

/**
 * Geometri batas satu wilayah, atau null bila memang tidak ada.
 *
 * 404 dari backend berarti "geometri wilayah itu tidak tersimpan di ASTA DESA" —
 * keadaan yang sah untuk sebagian desa, bukan kerusakan. Dijawab null supaya
 * pemanggilnya cukup melewatkan penyorotan, bukan memunculkan galat merah.
 */
export const ambilGeometriWilayah = (kecamatan, desa) =>
  sekali(`geo:${kecamatan}|${desa || ''}`, () =>
    api
      .get('/asta-desa/wilayah/geojson', { params: desa ? { kecamatan, desa } : { kecamatan } })
      .then(isi)
      .catch((err) => {
        if (err?.response?.status === 404) return null;
        throw new Error(pesanGalat(err, 'Gagal memuat batas wilayah'));
      })
  );

/**
 * Cuaca BMKG pada satu koordinat, atau null.
 *
 * Dibulatkan ke 3 desimal pada kunci cache agar sama dengan pembulatan di
 * backend: dua klik berjarak beberapa meter adalah satu jawaban yang sama, dan
 * tanpa penyelarasan ini cache sisi browser selalu luput sementara backend-nya
 * selalu kena.
 *
 * Galat cuaca TIDAK pernah dilemparkan. Kartu cuaca adalah pelengkap panel info;
 * BMKG yang sedang tidak bisa dihubungi tidak boleh menggagalkan pembacaan
 * atribut keluarga yang justru jadi alasan pengguna mengklik.
 */
export const ambilCuaca = (lat, lon) => {
  const kunci = `cuaca:${lat.toFixed(3)},${lon.toFixed(3)}`;
  return sekali(kunci, () =>
    api
      .get('/asta-desa/cuaca', { params: { lat, lon } })
      .then(isi)
      .catch(() => null)
  );
};

/**
 * Detail satu baris sensus (104 kolom) untuk panel info.
 *
 * Titik di peta hanya membawa sembilan kolom ringkas; sisa atribut yang
 * ditampilkan panel super admin — alamat, kondisi rumah, bantuan sosial, foto —
 * hanya ada di endpoint detail. Diambil SAAT DIKLIK, bukan dimuat di depan:
 * memuat 104 kolom untuk ribuan titik sekadar agar satu di antaranya bisa
 * dibaca adalah pemborosan yang terasa sebagai peta yang lama terbuka.
 */
export const ambilDetailSensus = (id) =>
  sekali(`sensus:${id}`, () =>
    api
      .get(`/asta-desa/sensus/${encodeURIComponent(id)}`)
      .then(isi)
      .catch((err) => {
        throw new Error(pesanGalat(err, 'Gagal memuat detail keluarga'));
      })
  );

/**
 * Tiga sumber tetap peta, dalam satu pemanggilan.
 *
 * `/sebaran` dipakai bersama tab Peta Sebaran yang ringkas — kalau pengguna
 * sudah membukanya, titiknya sudah ada di cache dan halaman ini langsung
 * tergambar tanpa menunggu penyusuran ulang di server.
 */
export const useDataPeta = () => {
  // `/sebaran-peta`, BUKAN `/sebaran`. Yang ini memakai koordinat `rumah_*` —
  // kolom yang digambar panel super admin — dan karenanya menyusuri endpoint
  // yang barisnya lebih berat. Tab Peta Sebaran yang ringkas tetap memakai
  // `/sebaran`; keduanya punya cache sendiri dan tidak saling menimpa.
  const sebaran = useAstaDesa('/sebaran-peta');
  const layer = useAstaDesa('/layer');
  const kecamatan = useAstaDesa('/wilayah/kecamatan');

  // SETIAP ARRAY DI BAWAH WAJIB DI-useMemo. `data?.titik || []` menghasilkan
  // array BARU pada tiap render selama data masih null, dan array baru itu
  // menjadi dependensi efek yang menggambar ulang titik serta menyusun daftar
  // layer — yang memanggil setState, yang memicu render berikutnya. Tanpa memo,
  // halaman ini masuk gelung render tanpa akhir, bukan sekadar lambat.
  const titik = useMemo(() => sebaran.data?.titik || [], [sebaran.data]);

  // Hanya layer aktif, urut `urutan` — tepat seperti kueri panel:
  // Layer::where('is_active', true)->orderBy('urutan')
  const daftarLayer = useMemo(
    () =>
      (layer.data || [])
        .filter((l) => l.is_active)
        .slice()
        .sort((a, b) => (a.urutan || 0) - (b.urutan || 0)),
    [layer.data]
  );

  const daftarKecamatan = useMemo(
    () => (Array.isArray(kecamatan.data) ? kecamatan.data : []),
    [kecamatan.data]
  );

  return {
    titik,
    rekapSebaran: sebaran.data || null,
    layer: daftarLayer,
    kecamatan: daftarKecamatan,
    memuat: sebaran.memuat || layer.memuat,
    galat: sebaran.galat || layer.galat,
    ambil: (paksa) => {
      bersihkanSimpananPeta();
      return Promise.all([sebaran.ambil(paksa), layer.ambil(paksa), kecamatan.ambil(paksa)]);
    }
  };
};
