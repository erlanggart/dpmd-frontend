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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../../../api';
import { ambilSekali, useAstaDesa } from '../useAstaDesa';

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
 * Kunci pencocokan nama wilayah — IDENTIK dengan `kunciWilayah` di backend,
 * yang menyalin `Wilayah::desaKey`/`kecamatanKey` ASTA DESA: "Ds. Nambo" (baris sensus) = "Nambo"
 * (berkas batas); "Tapos Satu" = "Tapos 1" = "Taposi".
 */
export const kunciWilayah = (s) =>
  String(s || '')
    .replace(/^\s*(ds\.|desa\s|kel\.|kelurahan\s|kec\.|kecamatan\s)\s*/i, '')
    .replace(/\s+satu\s*$/i, 'i')
    .replace(/\s+dua\s*$/i, 'ii')
    .replace(/\s*1\s*$/, 'i')
    .replace(/\s*2\s*$/, 'ii')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * Titik ternormalisasi dari `/sebaran-peta?kecamatan=` kembali ke bentuk objek
 * yang dipakai seluruh halaman. Urutan kolom = `KOLOM_TITIK` di backend:
 * [id, lat, lng, nomor desa, nomor petugas (-1 = kosong), kk_nama, nik, tanggal].
 */
const bukaTitik = (d, kecamatan) => {
  if (!Array.isArray(d?.titik)) return [];
  const desa = d.desa || [];
  const petugas = d.petugas || [];
  return d.titik.map(([id, lat, lng, iDesa, iPetugas, kkNama, nik, tanggal]) => ({
    id,
    lat,
    lng,
    kecamatan,
    desa: desa[iDesa],
    petugas: petugas[iPetugas] || undefined,
    kk_nama: kkNama || undefined,
    nik: nik || undefined,
    tanggal: tanggal || undefined
  }));
};

const TANPA_PILIHAN = [];

/**
 * Titik beberapa kecamatan sekaligus. Tiap kecamatan diminta sendiri-sendiri
 * (`/sebaran-peta?kecamatan=`) supaya tetap ter-cache per kecamatan di browser
 * dan di server, lalu digabung: menambah satu kecamatan tidak mengunduh ulang
 * yang sudah ada.
 */
const useTitikKecamatan = (daftar) => {
  const [hasil, setHasil] = useState({});
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState(null);
  const daftarRef = useRef(daftar);
  daftarRef.current = daftar;
  // Jawaban yang datang terlambat (pilihan sudah berubah) dibuang.
  const giliranRef = useRef(0);

  const ambil = useCallback((cara = 'cache', { diam = false } = {}) => {
    const sekarang = daftarRef.current;
    const giliran = ++giliranRef.current;
    if (!sekarang.length) {
      setHasil({});
      setMemuat(false);
      return Promise.resolve();
    }
    if (!diam) {
      setMemuat(true);
      setGalat(null);
    }
    return Promise.all(
      sekarang.map((k) => ambilSekali('/sebaran-peta', { kecamatan: k }, cara).then((b) => [k, b?.data ?? null]))
    )
      .then((baris) => {
        if (giliran !== giliranRef.current) return;
        setHasil(Object.fromEntries(baris));
        setGalat(null);
      })
      .catch((e) => {
        if (giliran === giliranRef.current && !diam) setGalat(e.message);
      })
      .finally(() => {
        if (giliran === giliranRef.current && !diam) setMemuat(false);
      });
  }, []);

  useEffect(() => {
    ambil('cache');
  }, [daftar, ambil]);

  // Balasan dicocokkan dengan nama yang diminta supaya sisa pilihan lama tidak
  // sempat tergambar.
  const titik = useMemo(
    () =>
      daftar.flatMap((k) => {
        const d = hasil[k];
        return d && kunciWilayah(d.kecamatan) === kunciWilayah(k) ? bukaTitik(d, k) : [];
      }),
    [hasil, daftar]
  );

  return { titik, memuat, galat, ambil };
};

/**
 * Sumber data peta, dimuat bertingkat seperti Peta Sebaran ASTA DESA.
 *
 * Dulu `/sebaran-peta` mengirim ±191 ribu titik se-kabupaten (±25 MB JSON) di
 * muka. Sekarang pembukaan halaman hanya mengambil rekap jumlah per kecamatan
 * dan desa (beberapa kilobyte) untuk choropleth; titik baru diminta untuk
 * kecamatan yang dibuka (`kecamatanTerpilih`, boleh lebih dari satu), ternormalisasi.
 */
export const useDataPeta = (kecamatanTerpilih = TANPA_PILIHAN) => {
  const ringkasan = useAstaDesa('/sebaran-peta');
  const rinci = useTitikKecamatan(kecamatanTerpilih);
  const layer = useAstaDesa('/layer');
  const kecamatan = useAstaDesa('/wilayah/kecamatan');

  // SETIAP ARRAY DI BAWAH WAJIB DI-useMemo. Array baru tiap render menjadi
  // dependensi efek yang menggambar ulang titik dan memanggil setState — gelung
  // render tanpa akhir, bukan sekadar lambat.

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
    titik: rinci.titik,
    // Rekap kelengkapan + `per_kecamatan` (bahan choropleth).
    rekapSebaran: ringkasan.data || null,
    layer: daftarLayer,
    kecamatan: daftarKecamatan,
    memuat: ringkasan.memuat || layer.memuat,
    memuatTitik: rinci.memuat,
    galat: ringkasan.galat || layer.galat || rinci.galat,
    ambil: (paksa) => {
      bersihkanSimpananPeta();
      return Promise.all([
        ringkasan.ambil(paksa),
        layer.ambil(paksa),
        kecamatan.ambil(paksa),
        rinci.ambil(paksa)
      ]);
    },

    /**
     * Hanya data sebaran, untuk menunggui penyusuran yang belum selesai.
     *
     * Mode 'segar' (bukan 'cache' yang berumur 10 menit) dan `diam: true`
     * supaya penanda di atas peta tidak berkedip tiap siklus. Layer dan daftar
     * kecamatan tidak ikut diambil ulang.
     */
    ambilSebaranDiam: () =>
      Promise.all([
        ringkasan.ambil('segar', { diam: true }),
        rinci.ambil('segar', { diam: true })
      ])
  };
};
