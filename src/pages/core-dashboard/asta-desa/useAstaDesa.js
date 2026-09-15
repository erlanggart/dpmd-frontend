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
 */
const muat = (jalur, params = {}, cara = 'cache') => {
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
  // Permintaan yang sedang berjalan tetap dibonceng, apa pun modenya selain
  // 'paksa': dua pemicu yang berdekatan (mis. pembaruan otomatis tepat saat
  // pengguna membuka tab) tidak perlu jadi dua panggilan.
  if (mode !== 'paksa' && berjalan.has(kunci)) return berjalan.get(kunci);

  const p = api
    .get(`/asta-desa${jalur}`, { params: mode === 'paksa' ? { ...params, force: 1 } : params })
    .then((res) => {
      const body = res.data;
      if (!body?.success) throw new Error(body?.message || 'Respons Asta Desa tidak valid');
      simpanan.set(kunci, { nilai: body, pada: Date.now() });
      berjalan.delete(kunci);
      return body;
    })
    .catch((err) => {
      berjalan.delete(kunci);
      // Pesan dari backend jauh lebih berguna daripada "Request failed with
      // status code 503" — di sanalah tertulis apa yang harus diisi di .env.
      const pesan = err.response?.data?.message || err.message || 'Gagal memuat data Asta Desa';
      const galat = new Error(pesan);
      galat.status = err.response?.status;
      throw galat;
    });

  berjalan.set(kunci, p);
  return p;
};

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
      }
      return muat(jalur, paramsRef.current, cara)
        .then((hasil) => {
          setBody(hasil);
          if (!diam) setMemuat(false);
          // Galat lama dibersihkan begitu ada jawaban yang berhasil, termasuk
          // pada pembaruan diam-diam: kalau tidak, pesan merah dari satu
          // kegagalan sesaat akan menetap padahal datanya sudah pulih.
          setGalat(null);
          return hasil;
        })
        .catch((e) => {
          // Kegagalan pembaruan otomatis TIDAK menghapus data yang sedang
          // tampil dan tidak memasang pesan galat. Jaringan yang berkedip
          // sesaat bukan alasan mengosongkan halaman yang sudah terisi; siklus
          // berikutnya akan mencoba lagi sendiri.
          if (diam) return;
          setGalat(e.message);
          setMemuat(false);
        });
    },
    [jalur]
  );

  useEffect(() => {
    if (!aktif) return;
    ambil('cache');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif, jalur, kunciParams]);

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
