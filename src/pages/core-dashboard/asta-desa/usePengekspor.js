/**
 * Kendali ekspor bersama tab Demografi dan Data Sensus.
 *
 * SATU TEMPAT, karena yang rumit bukan tombolnya melainkan apa yang terjadi
 * saat ditolak. Backend menolak melayani ekspor selama potret datanya belum
 * selaras dengan hitungan ASTA DESA saat ini (lihat `kesiapanSusur` di
 * astadesa.controller.js) dan membalas 409 beserta angka-angka alasannya.
 * Penolakan itu BUKAN galat — penyusunan ulang sudah dimulai di sisi server —
 * jadi yang harus muncul adalah dua jalan ke depan, bukan pesan merah:
 *
 *   "Coba lagi"            — tunggu penyusunan selesai, lalu ekspor data baru.
 *   "Ekspor potret ini"    — ambil yang ada sekarang, dan berkasnya menuliskan
 *                            sendiri bahwa ia diekspor tanpa menunggu.
 *
 * Tanpa jalan kedua, tombol ekspor bisa mati berkepanjangan tiap kali pendataan
 * di lapangan sedang ramai — dan orang yang hanya butuh angka kemarin untuk
 * rapat siang ini tidak punya pintu keluar.
 *
 * MENGAPA BUKAN PENJAJAKAN OTOMATIS. Penyusunan ulang memakan menit; menahan
 * tombol dalam keadaan "memuat" selama itu sambil memanggil server tiap lima
 * detik hanya memindahkan beban ke server tanpa mempercepat apa pun, dan
 * menyandera tab orang yang membukanya.
 */

import { useCallback, useState } from 'react';

/**
 * Kalimat setelah berkas turun.
 *
 * Yang dilaporkan BUKAN "berhasil", melainkan berapa baris terbaru yang ikut
 * disusul dari ASTA DESA. Itulah satu-satunya hal yang ingin diketahui orang
 * yang menekan tombol ini: apakah berkasnya memuat pendataan yang baru masuk,
 * atau potret setengah jam lalu. Angkanya juga tertulis di dalam berkasnya,
 * jadi yang di sini hanya memastikan ia terbaca sebelum berkasnya dibuka.
 */
const pesanBerhasil = (muatan, paksa) => {
  const k = muatan?.kesiapan?.keluarga || muatan?.kesiapan || {};
  if (paksa) {
    return 'Berkas diunduh sebagai potret apa adanya — kesegaran datanya tertulis di dalam berkas.';
  }
  const susulan = k.baris_susulan || 0;
  const inti = susulan
    ? `${susulan.toLocaleString('id-ID')} baris terbaru dari ASTA DESA ikut disusul.`
    : 'Tidak ada baris baru di ASTA DESA yang belum ikut.';
  return `Berkas diunduh. ${inti}`;
};

/**
 * Daur hidup satu klik ekspor.
 *
 * @param {(opsi: {paksa: boolean}) => Promise<object>} ambilMuatan
 *        Pengambil muatan ekspor. `paksa` meneruskan `abaikan_kesegaran=1`.
 */
export const usePengekspor = (ambilMuatan) => {
  // 'excel' | 'pdf' | null — bukan boolean, supaya yang berputar hanya tombol
  // yang benar-benar ditekan dan pembaca tahu berkas mana yang sedang disusun.
  const [sibuk, setSibuk] = useState(null);
  const [pesan, setPesan] = useState(null);
  // Penyusun berkas yang terakhir ditolak, supaya "Ekspor potret ini" tidak
  // perlu bertanya lagi format mana yang tadi diminta.
  const [tertunda, setTertunda] = useState(null);

  const bersihkan = useCallback(() => {
    setPesan(null);
    setTertunda(null);
  }, []);

  const jalankan = useCallback(
    async (jenis, buat, { paksa = false } = {}) => {
      setSibuk(jenis);
      setPesan({
        nada: 'proses',
        teks: paksa ? 'Menyusun berkas…' : 'Menarik baris terbaru dari ASTA DESA…'
      });
      try {
        const muatan = await ambilMuatan({ paksa });
        setPesan({ nada: 'proses', teks: 'Menyusun berkas…' });
        await buat(muatan);
        setTertunda(null);
        setPesan({ nada: 'sukses', teks: pesanBerhasil(muatan, paksa) });
      } catch (err) {
        if (err?.kode === 'belum_realtime') {
          setTertunda({ jenis, buat });
          setPesan({ nada: 'tunggu', teks: err.message, kesiapan: err.kesiapan || null });
        } else {
          setTertunda(null);
          setPesan({ nada: 'galat', teks: err?.message || 'Ekspor gagal.' });
        }
      } finally {
        setSibuk(null);
      }
    },
    [ambilMuatan]
  );

  /** Ulangi permintaan yang tadi ditolak — sekarang tanpa menunggu kesegaran. */
  const paksaUlang = useCallback(() => {
    if (tertunda) jalankan(tertunda.jenis, tertunda.buat, { paksa: true });
  }, [tertunda, jalankan]);

  /** Ulangi apa adanya; berhasil bila penyusunan di server sudah selesai. */
  const cobaLagi = useCallback(() => {
    if (tertunda) jalankan(tertunda.jenis, tertunda.buat);
  }, [tertunda, jalankan]);

  return { sibuk, pesan, tertunda: Boolean(tertunda), jalankan, paksaUlang, cobaLagi, bersihkan };
};
