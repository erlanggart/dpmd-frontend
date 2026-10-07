// Ekspor BUM Desa: data lengkap (.xlsx) dan arsip berkas (.zip).
//
// Dua unduhan TERPISAH, bukan satu tombol "ekspor semua": spreadsheet tidak
// bisa memuat PDF, dan yang butuh angka tidak perlu ikut menunggu ratusan
// megabita berkas pindai. Berkasnya diunduh sebagai zip berisi berkas aslinya,
// ditata per kecamatan/desa/kelompok dokumen.
//
// Unduhannya TIDAK lewat axios/blob. Arsip berkas se-kabupaten bisa ratusan
// megabita, dan blob menahan seluruhnya di memori peramban sebelum satu byte
// pun sampai ke disk. Jadi polanya seperti halaman Backup: minta tiket berumur
// pendek lewat API biasa, lalu serahkan URL-nya ke peramban.
import React, { useCallback, useEffect, useState } from 'react';
import {
  Download, FileSpreadsheet, FileArchive, Loader2, X, AlertTriangle, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api';

const nf = new Intl.NumberFormat('id-ID');

/** Buka URL unduhan lewat iframe tersembunyi.
 *
 * Bukan window.location: mengganti location membuat SPA ini ikut berpindah
 * halaman kalau server sempat menjawab galat alih-alih berkas. */
const unduhLewatBingkai = (alamat) => {
  const bingkai = document.createElement('iframe');
  bingkai.style.display = 'none';
  bingkai.src = alamat;
  document.body.appendChild(bingkai);
  setTimeout(() => bingkai.remove(), 180000);
};

const Baris = ({ label, nilai, kecil }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <span className={kecil ? 'text-xs text-slate-500' : 'text-sm text-slate-600'}>{label}</span>
    <span className={`tabular-nums ${kecil ? 'text-xs font-medium text-slate-600' : 'text-sm font-semibold text-slate-900'}`}>
      {nilai}
    </span>
  </div>
);

/**
 * @param ids       id BUM Desa yang SEDANG tersaring di layar
 * @param total     jumlah BUM Desa se-wilayah (tanpa penyaring)
 * @param adaFilter apakah penyaring di atas halaman sedang aktif
 */
const BumdesEksporPanel = ({ ids = [], total = 0, adaFilter = false }) => {
  const [terbuka, setTerbuka] = useState(false);
  // 'semua' | 'filter' — dengan penyaring aktif, bawaannya mengikuti layar.
  // Mengekspor diam-diam seluruh kabupaten padahal layarnya tersaring adalah
  // cara paling halus membuat orang salah mengambil kesimpulan.
  const [lingkup, setLingkup] = useState('semua');
  const [ringkasan, setRingkasan] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(null); // 'data' | 'berkas' | null

  const tersaring = lingkup === 'filter';
  const paramIds = tersaring ? ids.join(',') : '';
  const jumlahBaris = tersaring ? ids.length : total;

  const ambilRingkasan = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const res = await api.get('/bumdes/ekspor/ringkasan', {
        params: paramIds ? { ids: paramIds } : {},
      });
      setRingkasan(res.data?.data || null);
    } catch (err) {
      setRingkasan(null);
      setGalat(err.response?.data?.message || 'Gagal membaca isi penyimpanan berkas BUM Desa');
    } finally {
      setMemuat(false);
    }
  }, [paramIds]);

  useEffect(() => {
    if (!terbuka) return;
    ambilRingkasan();
  }, [terbuka, ambilRingkasan]);

  const bukaPanel = () => {
    setLingkup(adaFilter ? 'filter' : 'semua');
    setTerbuka(true);
  };

  const unduh = async (jenis) => {
    if (sibuk) return;
    if (tersaring && !ids.length) {
      toast.error('Tidak ada BUM Desa yang cocok dengan penyaring saat ini.');
      return;
    }
    setSibuk(jenis);
    try {
      const res = await api.post('/bumdes/ekspor/tiket', {
        jenis,
        ...(paramIds ? { ids: paramIds } : {}),
      });
      const tiket = res.data?.data?.tiket;
      if (!tiket) throw new Error('Server tidak mengembalikan tiket unduhan.');

      // baseURL bisa relatif ('/api'), jadi dirangkai terhadap origin yang
      // sedang dibuka — tetap benar dari HP di jaringan lokal maupun setelah
      // pindah domain.
      const basis = (api.defaults.baseURL || '/api').replace(/\/$/, '');
      const alamat = new URL(
        `${basis}/bumdes/ekspor/unduh/${jenis}?tiket=${encodeURIComponent(tiket)}`,
        window.location.origin,
      ).toString();

      unduhLewatBingkai(alamat);
      toast.success(
        jenis === 'data'
          ? 'Unduhan Excel dimulai. Berkas muncul setelah selesai disiapkan server.'
          : 'Unduhan arsip berkas dimulai. Untuk ribuan berkas, server perlu beberapa menit.',
        { duration: 6000 },
      );
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Gagal memulai unduhan');
    } finally {
      setSibuk(null);
    }
  };

  const berkas = ringkasan?.berkas;

  return (
    <>
      <button
        type="button"
        onClick={bukaPanel}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        Ekspor Data &amp; Berkas
      </button>

      {terbuka && (
        /* z-[70]: panel pengelolaan BUM Desa memakai z-[60] dan bilah navigasi
           bawah PegawaiLayout memakai z-50. */
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Ekspor Data &amp; Berkas BUM Desa</h2>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  Data dan berkas diunduh terpisah: angka sebagai Excel, dokumen sebagai arsip ZIP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTerbuka(false)}
                aria-label="Tutup"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Cakupan */}
              <fieldset>
                <legend className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Yang diekspor
                </legend>
                <div className="mt-2 space-y-2">
                  {[
                    { nilai: 'semua', judul: `Seluruh BUM Desa (${nf.format(total)})`, ket: 'Semua baris, tanpa memperhatikan penyaring di layar.' },
                    {
                      nilai: 'filter',
                      judul: `Sesuai penyaring di layar (${nf.format(ids.length)})`,
                      ket: adaFilter ? 'Baris yang sedang tampil di direktori.' : 'Penyaring tidak aktif — isinya sama dengan pilihan di atas.',
                    },
                  ].map((o) => (
                    <label
                      key={o.nilai}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                        lingkup === o.nilai ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="lingkup-ekspor-bumdes"
                        value={o.nilai}
                        checked={lingkup === o.nilai}
                        onChange={() => setLingkup(o.nilai)}
                        className="mt-0.5 h-4 w-4 accent-slate-900"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{o.judul}</span>
                        <span className="block text-xs leading-5 text-slate-500">{o.ket}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Ringkasan isi */}
              <div className="mt-4 rounded-xl border border-slate-200 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Perkiraan isi unduhan
                </p>
                {memuat ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Menghitung berkas di server…
                  </p>
                ) : galat ? (
                  <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-rose-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {galat}
                  </p>
                ) : (
                  <div className="mt-1.5 divide-y divide-slate-100">
                    <Baris label="BUM Desa" nilai={nf.format(ringkasan?.jumlah_bumdes ?? jumlahBaris)} />
                    <Baris label="Jumlah berkas" nilai={nf.format(berkas?.jumlah ?? 0)} />
                    <Baris label="Ukuran arsip (sebelum kompresi)" nilai={berkas?.ukuran_teks || '0 B'} />
                    {(berkas?.per_kelompok || []).map((k) => (
                      <Baris key={k.kelompok} kecil label={k.kelompok} nilai={`${nf.format(k.jumlah)} · ${k.ukuran_teks}`} />
                    ))}
                    {berkas?.hilang > 0 && (
                      <p className="flex items-start gap-2 pt-2 text-xs leading-5 text-amber-700">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        {nf.format(berkas.hilang)} berkas tercatat di basis data tapi tidak ada di
                        penyimpanan. Daftarnya ikut di dalam ZIP sebagai BERKAS-HILANG.csv.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Tombol unduh */}
              <div className="mt-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => unduh('data')}
                  disabled={Boolean(sibuk) || jumlahBaris === 0}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:border-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    {sibuk === 'data' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">Ekspor Seluruh Data (Excel)</span>
                    <span className="block text-xs leading-5 text-slate-500">
                      Semua kolom tabel BUM Desa, ditambah lembar terpisah untuk permodalan, aset,
                      omset &amp; laba, PADes, kemitraan, program, LPJ, dan ketahanan pangan per tahun.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => unduh('berkas')}
                  disabled={Boolean(sibuk) || !berkas?.jumlah}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition-colors hover:border-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                    {sibuk === 'berkas' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      Ekspor Berkas (ZIP{berkas?.jumlah ? ` · ${nf.format(berkas.jumlah)} berkas` : ''})
                    </span>
                    <span className="block text-xs leading-5 text-slate-500">
                      Dokumen pendirian, LPJ, ketahanan pangan, bukti PADes, MoU, dan foto produk —
                      berkas aslinya, ditata per kecamatan, desa, lalu jenis dokumen.
                    </span>
                  </span>
                </button>
              </div>

              <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-400">
                <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                Unduhan ditulis langsung ke folder unduhan peramban. Jangan tutup tab sampai
                berkasnya muncul — untuk arsip besar, server perlu beberapa menit menyiapkannya.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BumdesEksporPanel;
