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

const muat = (jalur, params = {}, force = false) => {
  const kunci = `${jalur}?${new URLSearchParams(params).toString()}`;
  const ada = simpanan.get(kunci);
  if (!force && ada && Date.now() - ada.pada < TTL) return Promise.resolve(ada.nilai);
  if (!force && berjalan.has(kunci)) return berjalan.get(kunci);

  const p = api
    .get(`/asta-desa${jalur}`, { params: force ? { ...params, force: 1 } : params })
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
 * @param {object}  opsi    { aktif } — false menunda pengambilan sampai tabnya dibuka
 */
export const useAstaDesa = (jalur, params = {}, opsi = {}) => {
  const aktif = opsi.aktif !== false;
  const [body, setBody] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState(null);

  // Params diperbandingkan lewat bentuk JSON-nya, bukan identitas objek: kalau
  // tidak, objek literal baru tiap render akan memicu pengambilan tanpa henti.
  const kunciParams = JSON.stringify(params);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const ambil = useCallback(
    (force = false) => {
      setMemuat(true);
      setGalat(null);
      return muat(jalur, paramsRef.current, force)
        .then((hasil) => {
          setBody(hasil);
          setMemuat(false);
          return hasil;
        })
        .catch((e) => {
          setGalat(e.message);
          setMemuat(false);
        });
    },
    [jalur]
  );

  useEffect(() => {
    if (!aktif) return;
    ambil(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif, jalur, kunciParams]);

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
