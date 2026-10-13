/**
 * Pengambil data Asta Desa.
 *
 * Sumbernya /api/asta-desa milik backend kita sendiri — bukan langsung ke
 * astadesa.rmlabs.id. Lihat backend/src/services/astadesa.service.js untuk
 * alasannya (token super_admin tidak boleh sampai ke browser).
 *
 * CACHE TINGKAT MODUL, seperti useSipanda. Halaman ini punya enam tab yang
 * sebagian memakai data yang sama; tanpa cache bersama, berpindah tab berarti
 * mengulang penyusuran puluhan halaman di sisi server. Dengan cache ini, pindah
 * tab terasa seketika dan tombol "muat ulang" tetap menjadi satu-satunya cara
 * memaksa data baru.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../api';

const TTL = 10 * 60 * 1000;

const simpanan = new Map(); // kunci -> { nilai, pada }
const berjalan = new Map(); // kunci -> Promise

/**
 * CADANGAN AWET — salinan jawaban terakhir yang berhasil, di localStorage.
 *
 * Pada 2026-10-13 halaman ini dibuka di tablet Kepala Dinas dan yang tampil
 * hanya "Request failed with status code 429": tidak ada satu angka pun,
 * padahal angka yang sama sudah pernah berhasil diambil di perangkat itu.
 * Angka beberapa jam lalu, yang ditandai jelas sebagai data tersimpan, jauh
 * lebih berguna bagi pimpinan daripada layar galat — terlebih di depan rapat.
 *
 * Hanya endpoint AGREGAT tingkat kabupaten (tanpa penyaring) yang disimpan:
 * ukurannya kecil dan tidak memuat data per orang. Baris sensus, titik rumah,
 * dan daftar akun TIDAK pernah ditulis ke penyimpanan perangkat. Kuncinya
 * memuat id pengguna, dan seluruhnya dibuang saat login/logout (lihat
 * clearApiResponseCache di utils/sessionPersistence.js).
 */
const AWET = new Set(['/status', '/ringkasan', '/demografi', '/demografi/kategori', '/layer', '/wilayah/kecamatan']);
const AWALAN_AWET = 'dpmd:asta-desa:v1:';
const UMUR_AWET = 3 * 24 * 60 * 60 * 1000;
const UKURAN_AWET_MAKS = 1_500_000;

const kunciAwet = (kunci) => {
  let pemilik = '';
  try {
    pemilik = JSON.parse(localStorage.getItem('user') || '{}')?.id ?? '';
  } catch {
    // localStorage bisa diblokir; kunci tanpa pemilik tetap dipakai.
  }
  return `${AWALAN_AWET}${pemilik}:${kunci}`;
};

const bolehAwet = (jalur, params) => AWET.has(jalur) && Object.keys(params || {}).length === 0;

const bacaAwet = (jalur, params, kunci) => {
  if (!bolehAwet(jalur, params)) return null;
  try {
    const isi = JSON.parse(localStorage.getItem(kunciAwet(kunci)) || 'null');
    if (!isi?.nilai || !isi.pada || Date.now() - isi.pada > UMUR_AWET) return null;
    return isi;
  } catch {
    return null;
  }
};

const tulisAwet = (jalur, params, kunci, nilai) => {
  if (!bolehAwet(jalur, params)) return;
  try {
    const teks = JSON.stringify({ nilai, pada: Date.now() });
    if (teks.length <= UKURAN_AWET_MAKS) localStorage.setItem(kunciAwet(kunci), teks);
  } catch {
    // Kuota penuh atau penyimpanan diblokir: cadangan hanyalah pelengkap.
  }
};

/**
 * Galat yang layak dicoba ulang beberapa detik kemudian: jaringan berkedip
 * (tanpa respons), gateway 502/504, atau 429 yang jedanya pendek. Timeout 30
 * detik sengaja tidak — mengulangnya berarti pembaca menunggu satu menit.
 */
const JEDA_ULANG_MS = [1500, 4000];
const layakUlang = (err, jedaDetik) => {
  if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_CANCELED') return false;
  const status = err?.response?.status;
  if (!err?.response) return true;
  if (status === 502 || status === 504) return true;
  return status === 429 && jedaDetik !== null && jedaDetik <= 8;
};

const bacaJeda = (err) => {
  const nilai = Number(err?.response?.headers?.['retry-after'] ?? err?.response?.data?.retry_after);
  return Number.isFinite(nilai) && nilai >= 0 ? nilai : null;
};

const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ubah galat axios menjadi pesan yang bisa dibaca orang. */
const rapikanGalat = (err) => {
  const status = err.response?.status;
  const jeda = bacaJeda(err);
  let pesan = err.response?.data?.message;
  if (!pesan || typeof pesan !== 'string') {
    if (status === 429) {
      pesan = `Server sedang membatasi permintaan.${jeda ? ` Coba lagi dalam ${Math.max(1, Math.ceil(jeda / 60))} menit.` : ''}`;
    } else if (!err.response) {
      pesan = err.code === 'ECONNABORTED' ? 'Server terlalu lama menjawab.' : 'Sambungan ke server terputus.';
    } else {
      pesan = err.message || 'Gagal memuat data Asta Desa';
    }
  }
  const galat = new Error(pesan);
  galat.status = status;
  galat.jedaDetik = jeda;
  // Badan respons ikut dibawa. Endpoint ekspor menolak dengan 409 beserta
  // `kode` dan `kesiapan` — angka-angka yang membuat penolakannya bisa
  // dijelaskan ke pembaca ("tertinggal 1.204 keluarga") alih-alih sekadar
  // "gagal mengekspor".
  galat.kode = err.response?.data?.kode || null;
  galat.kesiapan = err.response?.data?.kesiapan || null;
  return galat;
};

/** Satu permintaan dengan percobaan ulang singkat untuk galat sesaat. */
const mintaDenganUlang = async (jalur, params) => {
  for (let coba = 0; ; coba += 1) {
    try {
      return await api.get(`/asta-desa${jalur}`, { params });
    } catch (err) {
      const jeda = bacaJeda(err);
      if (coba >= JEDA_ULANG_MS.length || !layakUlang(err, jeda)) throw err;
      await tunggu(Math.max(JEDA_ULANG_MS[coba], (jeda || 0) * 1000));
    }
  }
};

/**
 * TIGA CARA MENGAMBIL, dan perbedaannya penting.
 *
 *   'cache' — pakai simpanan browser selama masih segar. Ini yang dipakai saat
 *             berpindah tab: tidak ada permintaan sama sekali.
 *   'segar' — LEWATI simpanan browser, tetapi JANGAN kirim force=1. Server
 *             menjawab dari cache-nya sendiri bila masih hangat. Inilah yang
 *             dipakai pembaruan otomatis: angka pokok di sana hanya bertahan
 *             satu menit, jadi hasilnya ikut segar, sementara penyusuran 21
 *             halaman yang mahal tetap dilayani dari cache 10 menit dan tidak
 *             diulang tiap kali.
 *   'paksa' — lewati keduanya dan suruh server menyusuri ulang dari awal.
 *             Hanya untuk tombol "Muat ulang" yang ditekan orang.
 *
 * Membedakan 'segar' dari 'paksa' itulah yang membuat pembaruan otomatis boleh
 * ada. Kalau keduanya disamakan, tiap pengunjung akan memicu penyusuran 18
 * detik ke ASTA DESA setiap menit.
 *
 * `bolehBasi`: bila semua percobaan gagal karena hal SESAAT (jaringan, 429,
 * 5xx), jawab dengan salinan terakhir yang berhasil — dari memori, atau dari
 * cadangan awet — beserta tanda `__basi`, alih-alih melempar galat. Dipakai
 * hook tampilan; TIDAK dipakai ekspor, yang seluruh gunanya adalah data
 * terbaru. Penolakan hak akses (401/403) tidak pernah ditutupi salinan lama.
 */
const muat = (jalur, params = {}, cara = 'cache', { bolehBasi = false } = {}) => {
  // Pemanggil lama masih mengirim boolean; true dulu berarti "paksa". Dan
  // beberapa tempat memasang `ambil` langsung sebagai onClick, sehingga yang
  // masuk ke sini adalah OBJEK EVENT, bukan mode. Apa pun yang tidak dikenali
  // dijatuhkan ke 'segar': menekan "coba lagi" memang harus menghasilkan
  // permintaan baru, tetapi tidak perlu menyuruh server menyusuri ulang 21
  // halaman hanya karena seseorang mengklik dua kali.
  const dikenal = ['cache', 'segar', 'paksa'];
  const mode =
    cara === true ? 'paksa' : cara === false || cara == null ? 'cache' : dikenal.includes(cara) ? cara : 'segar';
  const kunci = `${jalur}?${new URLSearchParams(params).toString()}`;
  const ada = simpanan.get(kunci);
  if (mode === 'cache' && ada && Date.now() - ada.pada < TTL) return Promise.resolve(ada.nilai);

  // Yang disimpan di `berjalan` selalu janji MENTAH (bisa gagal); jawaban basi
  // dirakit per pemanggil, karena ekspor dan tampilan memperlakukannya berbeda.
  const jawabBasi = (p) =>
    !bolehBasi
      ? p
      : p.catch((galat) => {
          const sesaat = galat.status === undefined || galat.status === 429 || galat.status >= 500;
          const lama = sesaat ? simpanan.get(kunci) || bacaAwet(jalur, params, kunci) : null;
          if (!lama) throw galat;
          return {
            ...lama.nilai,
            __basi: { pada: lama.pada, pesan: galat.message, status: galat.status, jedaDetik: galat.jedaDetik ?? null }
          };
        });

  // Permintaan yang sedang berjalan tetap dibonceng, apa pun modenya selain
  // 'paksa': dua pemicu yang berdekatan (mis. pembaruan otomatis tepat saat
  // pengguna membuka tab) tidak perlu jadi dua panggilan.
  if (mode !== 'paksa' && berjalan.has(kunci)) return jawabBasi(berjalan.get(kunci));

  const p = mintaDenganUlang(jalur, mode === 'paksa' ? { ...params, force: 1 } : params)
    .then((res) => {
      const body = res.data;
      if (!body?.success) throw new Error(body?.message || 'Respons Asta Desa tidak valid');
      simpanan.set(kunci, { nilai: body, pada: Date.now() });
      tulisAwet(jalur, params, kunci, body);
      berjalan.delete(kunci);
      return body;
    })
    .catch((err) => {
      berjalan.delete(kunci);
      // Pesan dari backend jauh lebih berguna daripada "Request failed with
      // status code 503" — di sanalah tertulis apa yang harus diisi di .env.
      throw err instanceof Error && !err.isAxiosError ? err : rapikanGalat(err);
    });

  berjalan.set(kunci, p);
  return jawabBasi(p);
};

/**
 * Salinan terakhir yang diketahui untuk satu endpoint, tanpa permintaan apa
 * pun. `segar` = masih di memori dan belum lewat TTL, artinya `muat` mode
 * 'cache' akan menjawabnya seketika tanpa ke server.
 */
const salinanTerakhir = (jalur, params) => {
  const kunci = `${jalur}?${new URLSearchParams(params).toString()}`;
  const diMemori = simpanan.get(kunci);
  if (diMemori) return { ...diMemori, segar: Date.now() - diMemori.pada < TTL };
  const awet = bacaAwet(jalur, params, kunci);
  return awet ? { ...awet, segar: false } : null;
};

/**
 * Ambil satu endpoint SEKALI, di luar daur hidup komponen.
 *
 * Dipakai tombol ekspor. Muatan ekspor berukuran megabyte dan hanya dibutuhkan
 * pada detik tombolnya ditekan — memasangnya sebagai hook berarti setiap
 * pembaca yang membuka tab ikut mengunduhnya tanpa pernah meminta.
 *
 * Bawaannya 'segar': ekspor tidak boleh dilayani dari cache browser, sebab
 * seluruh gunanya adalah memastikan berkasnya berisi data terbaru. Server tetap
 * boleh menjawab dari cache-nya sendiri — di sanalah kesegaran diukur dan
 * dilaporkan lewat `kesiapan`.
 */
export const ambilSekali = (jalur, params = {}, cara = 'segar') => muat(jalur, params, cara);

/** Buang seluruh cache sisi browser (dipakai bersama tombol muat ulang). */
export const bersihkanSimpanan = () => simpanan.clear();

/**
 * Hook umum satu endpoint.
 * @param {string}  jalur   mis. '/ringkasan'
 * @param {object}  params  query
 * @param {object}  opsi    { aktif, segarkanTiapMs }
 *                          `aktif: false` menunda pengambilan sampai tabnya dibuka.
 *                          `segarkanTiapMs` menyalakan pembaruan otomatis.
 */
export const useAstaDesa = (jalur, params = {}, opsi = {}) => {
  const aktif = opsi.aktif !== false;
  const segarkanTiapMs = opsi.segarkanTiapMs || 0;
  const [body, setBody] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState(null);
  // { pada, pesan, status, jedaDetik } saat yang tampil adalah salinan lama
  // karena server sedang menolak; null saat datanya hasil ambil terbaru.
  const [basi, setBasi] = useState(null);
  const [jedaGalat, setJedaGalat] = useState(null);
  const [ulangKe, setUlangKe] = useState(0);

  // Params diperbandingkan lewat bentuk JSON-nya, bukan identitas objek: kalau
  // tidak, objek literal baru tiap render akan memicu pengambilan tanpa henti.
  const kunciParams = JSON.stringify(params);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const ambil = useCallback(
    (cara = 'cache', { diam = false } = {}) => {
      // `diam` dipakai pembaruan otomatis. Tanpa itu, tiap siklus akan
      // memasang keadaan "memuat" dan seluruh halaman berkedip kembali ke
      // kerangka pemuatan sekali semenit — pembaruan yang justru mengganggu
      // orang yang sedang membaca angkanya.
      if (!diam) {
        setMemuat(true);
        setGalat(null);
        setBasi(null);
      }
      return muat(jalur, paramsRef.current, cara, { bolehBasi: true })
        .then((hasil) => {
          setBody(hasil);
          if (!diam) setMemuat(false);
          // Galat lama dibersihkan begitu ada jawaban yang bisa ditampilkan,
          // termasuk pada pembaruan diam-diam: kalau tidak, pesan merah dari
          // satu kegagalan sesaat akan menetap padahal datanya sudah pulih.
          setGalat(null);
          setJedaGalat(null);
          setBasi(hasil?.__basi || null);
          if (!hasil?.__basi) setUlangKe(0);
          return hasil;
        })
        .catch((e) => {
          // Kegagalan pembaruan otomatis TIDAK menghapus data yang sedang
          // tampil dan tidak memasang pesan galat. Jaringan yang berkedip
          // sesaat bukan alasan mengosongkan halaman yang sudah terisi; siklus
          // berikutnya akan mencoba lagi sendiri.
          if (diam) {
            // Yang tampil salinan lama yang sedang diperbarui, dan pembaruannya
            // gagal: lepaskan tanda "memperbarui" supaya pemulihan otomatis di
            // bawah mengambil alih, dan pembaca tahu alasannya.
            setBasi((b) =>
              b?.memperbarui ? { pada: b.pada, pesan: e.message, status: e.status, jedaDetik: e.jedaDetik ?? null } : b
            );
            return;
          }
          setGalat(e.message);
          setJedaGalat(e.jedaDetik ?? null);
          setMemuat(false);
        });
    },
    [jalur]
  );

  useEffect(() => {
    if (!aktif) return;
    // Ada salinan lama (memori atau cadangan awet)? Tampilkan seketika sebagai
    // data tersimpan, lalu perbarui diam-diam — pembaca langsung melihat angka,
    // bukan kerangka pemuatan, dan tidak ada yang hilang bila server menolak.
    const lama = salinanTerakhir(jalur, paramsRef.current);
    if (lama && !lama.segar) {
      setBody(lama.nilai);
      setBasi({ pada: lama.pada, memperbarui: true });
      ambil('cache', { diam: true });
      return;
    }
    ambil('cache');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif, jalur, kunciParams]);

  /**
   * Pemulihan otomatis.
   *
   * Selama yang tampil adalah galat atau salinan lama, hook ini mencoba lagi
   * sendiri — pembaca tidak perlu tahu bahwa ada tombol "Coba lagi". Jedanya
   * mengikuti Retry-After dari server bila ada (dibatasi 2 menit supaya
   * pemulihan tidak tertunda terlalu lama), selain itu naik bertahap 10 → 20 →
   * 40 → 60 detik. Berhenti saat tab tidak terlihat.
   */
  useEffect(() => {
    if (!aktif || (!galat && !basi)) return undefined;
    if (basi?.memperbarui) return undefined;
    const jedaServer = basi?.jedaDetik ?? jedaGalat;
    const detik = Math.min(120, Math.max(5, jedaServer ?? Math.min(60, 10 * 2 ** ulangKe)));
    const t = setTimeout(() => {
      if (document.hidden) {
        setUlangKe((n) => n + 1);
        return;
      }
      ambil('segar', { diam: true }).finally(() => setUlangKe((n) => n + 1));
    }, detik * 1000);
    return () => clearTimeout(t);
  }, [aktif, galat, basi, jedaGalat, ulangKe, ambil]);

  /**
   * Pembaruan otomatis.
   *
   * Modenya 'segar', bukan 'paksa': simpanan browser dilewati supaya angkanya
   * benar-benar ditanya ulang, tetapi server tetap boleh menjawab dari
   * cache-nya sendiri. Angka pokok di sana berumur satu menit, jadi hasilnya
   * ikut segar tanpa memicu penyusuran 21 halaman setiap siklus.
   *
   * Berhenti saat tabnya tidak terlihat. Dasbor seperti ini sering ditinggal
   * terbuka berhari-hari di layar monitoring; tanpa penjagaan ini, tab yang
   * tidak dilihat siapa pun tetap memanggil server sepanjang malam. Begitu
   * kembali terlihat, sekali ambil langsung dijalankan supaya yang tampil
   * bukan angka basi dari sebelum tabnya ditinggalkan.
   */
  useEffect(() => {
    if (!aktif || !segarkanTiapMs) return undefined;

    let pewaktu = null;

    const mulai = () => {
      if (pewaktu) return;
      pewaktu = setInterval(() => ambil('segar', { diam: true }), segarkanTiapMs);
    };
    const berhenti = () => {
      if (!pewaktu) return;
      clearInterval(pewaktu);
      pewaktu = null;
    };

    const saatBerubah = () => {
      if (document.hidden) {
        berhenti();
      } else {
        ambil('segar', { diam: true });
        mulai();
      }
    };

    if (!document.hidden) mulai();
    document.addEventListener('visibilitychange', saatBerubah);

    return () => {
      berhenti();
      document.removeEventListener('visibilitychange', saatBerubah);
    };
  }, [aktif, segarkanTiapMs, ambil]);

  return {
    data: body?.data ?? null,
    meta: body?.meta ?? null,
    rekap: body?.rekap ?? null,
    memuat,
    galat,
    basi,
    ambil
  };
};

/** Kosongkan cache lalu muat ulang segar dari sumbernya. */
export const segarkanSemua = async () => {
  bersihkanSimpanan();
  try {
    await api.post('/asta-desa/segarkan');
  } catch {
    // Gagal membersihkan cache server bukan alasan menahan muat ulang: cache
    // sisi browser sudah dibuang, dan permintaan berikut membawa force=1.
  }
};
