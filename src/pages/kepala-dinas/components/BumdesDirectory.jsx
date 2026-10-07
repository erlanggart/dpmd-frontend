// Direktori BUMDes untuk halaman Statistik BUMDes di Core Dashboard.
//
// Seluruh 416 baris diambil sekali dari /kepala-dinas/bumdes, lalu pencarian,
// penyaringan, pengurutan, dan halaman dikerjakan di sisi klien. Untuk jumlah
// sebesar ini itu jauh lebih enak dipakai daripada bolak-balik ke server:
// hasilnya muncul seketika saat mengetik.
//
// Kelas Tailwind ditulis utuh, tidak dirangkai dari variabel — kelas dinamis
// tidak ikut ter-scan saat build dan diam-diam hilang di produksi.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown, ArrowUp, ArrowDown, Inbox, ChevronLeft, ChevronRight,
} from 'lucide-react';

import { LencanaPeringkat, LencanaStatus } from './BumdesLencana';
import BumdesDetailModal from './BumdesDetailModal';
import TombolEkspor from '../../../components/shared/TombolEkspor';
import { nf, rupiahRingkas } from './bumdesFormat';
import { omsetTerbaru, tahapBadanHukum } from './bumdesFilter';

const PER_HALAMAN = 12;

/* ----------------------------------------------------------------- format -- */

const teks = (v) => (v === null || v === undefined || String(v).trim() === '' ? '—' : String(v));

/**
 * Jenis usaha untuk ditampilkan di tabel.
 *
 * Tiga kolom menyimpan hal yang mirip dan terisi tidak merata: `kategori_usaha`
 * (centang kategori di formulir baru), `jenis_usaha` (teks gabungan hasil impor
 * rekap lama), dan `jenis_usaha_utama` (satu kalimat bebas, mis. "Ternak ayam
 * petelur"). Dipakai yang paling rapi lebih dulu supaya kolomnya tidak kosong
 * untuk baris lama, dan usaha utama disebut terpisah karena ia bukan kategori
 * melainkan keterangan.
 */
const jenisUsahaTampil = (d) => {
	const kategori = Array.isArray(d.kategori_usaha) ? d.kategori_usaha.filter(Boolean) : [];
	if (kategori.length) return kategori.join(', ');
	if (d.jenis_usaha && String(d.jenis_usaha).trim()) return String(d.jenis_usaha).trim();
	if (d.jenis_usaha_utama && String(d.jenis_usaha_utama).trim()) return String(d.jenis_usaha_utama).trim();
	return '';
};

/* ------------------------------------------------------------------ utama -- */

/**
 * Kolom yang ikut terunduh.
 *
 * Bukan seluruh 149 kolom tabel bumdes, dan bukan pula hanya enam kolom yang
 * tampil di tabel. Yang dipilih adalah identitas (kecamatan/desa/nama), tahap
 * pembinaan (status, badan hukum, pemeringkatan), dan angka ekonomi — tiga hal
 * yang ditanyakan setiap kali data ini dibahas. Rincian seperti media sosial
 * atau daftar berkas tidak ada gunanya di dalam sel spreadsheet.
 *
 * Angka dikirim MENTAH, tanpa "Rp" dan tanpa pemendekan "1,2 M": di Excel kolom
 * ini dijumlahkan dan diurutkan, dan "Rp 1,2 M" adalah teks yang tidak bisa
 * dihitung. Pemformatan itu urusan layar, bukan urusan berkas ekspor.
 *
 * Omset dan laba memakai TAHUN TERBARU yang diisi tiap BUM Desa, sama seperti
 * tabel dan grafik di atasnya (omsetTerbaru di bumdesFilter.js). Karena tahunnya
 * bisa berbeda antar baris, tahunnya ikut jadi kolom sendiri — tanpa itu satu
 * kolom "Omset" diam-diam mencampur 2024 dan 2025.
 */
const KOLOM_EKSPOR = [
  { label: 'Kecamatan', nilai: (d) => d.kecamatan },
  { label: 'Desa', nilai: (d) => d.desa },
  { label: 'Nama BUMDes', nilai: (d) => d.nama },
  { label: 'Status', nilai: (d) => d.status },
  { label: 'Tahun Pendirian', nilai: (d) => d.tahun_pendirian },
  { label: 'Badan Hukum', nilai: (d) => tahapBadanHukum(d) },
  { label: 'Pemeringkatan', nilai: (d) => d.pemeringkatan },
  { label: 'NIB', nilai: (d) => d.nib },
  { label: 'NPWP', nilai: (d) => d.npwp },
  { label: 'Kategori Usaha', nilai: (d) => jenisUsahaTampil(d) },
  { label: 'Jenis Usaha Utama', nilai: (d) => d.jenis_usaha_utama || d.jenis_usaha },
  { label: 'Unit Usaha', nilai: (d) => (Array.isArray(d.unit_usaha) ? d.unit_usaha.join('; ') : null) },
  { label: 'Tenaga Kerja', nilai: (d) => d.tenaga_kerja },
  { label: 'Direktur', nilai: (d) => d.direktur },
  { label: 'Aset (Rp)', nilai: (d) => d.aset },
  { label: 'Omset (Rp)', nilai: (d) => omsetTerbaru(d) },
  { label: 'Tahun Omset', nilai: (d) => d.tahun_omset_terbaru },
  { label: 'Laba/SHU (Rp)', nilai: (d) => d.laba_terbaru ?? d.laba_2025 ?? d.laba_2024 },
  { label: 'Kontribusi PADes (Rp)', nilai: (d) => d.pades_terbaru ?? d.pades_2025 },
  { label: 'Penyertaan Modal (Rp)', nilai: (d) => d.total_penyertaan_modal },
  { label: 'Jumlah Produk', nilai: (d) => d.jumlah_produk },
];

const KOLOM_URUT = [
  { key: 'nama', label: 'Nama BUMDes', tipe: 'teks' },
  { key: 'kecamatan', label: 'Kecamatan', tipe: 'teks' },
  // Diminta bidang SPKED: "BUMDes-nya menampilkan jenis usaha". Nilainya
  // turunan (lihat jenisUsahaTampil), jadi dibaca lewat `nilai`, bukan d[key].
  { key: 'jenis_usaha', label: 'Jenis Usaha', tipe: 'teks', nilai: jenisUsahaTampil },
  { key: 'aset', label: 'Aset', tipe: 'angka' },
  { key: 'omset_2025', label: 'Omset 2025', tipe: 'angka' },
  { key: 'laba_2025', label: 'Laba 2025', tipe: 'angka' },
  { key: 'tenaga_kerja', label: 'Pekerja', tipe: 'angka' },
];

/**
 * Data yang masuk SUDAH tersaring oleh baris penyaring di atas halaman.
 * Direktori hanya mengurus pengurutan, halaman, dan panel detail — kalau ia
 * menyaring lagi sendiri, angkanya bisa berbeda dari grafik di atasnya.
 */
const BumdesDirectory = ({ data = [], adaFilter = false, onReset, onUbah, namaWilayah = 'Kabupaten Bogor' }) => {
  const [urut, setUrut] = useState({ key: 'nama', arah: 'asc' });
  const [halaman, setHalaman] = useState(1);
  const [dipilih, setDipilih] = useState(null);

  const hasil = useMemo(() => {
    const cocok = data;

    const kolom = KOLOM_URUT.find((k) => k.key === urut.key) || KOLOM_URUT[0];
    const arah = urut.arah === 'asc' ? 1 : -1;
    return [...cocok].sort((a, b) => {
      const va = kolom.nilai ? kolom.nilai(a) : a[kolom.key];
      const vb = kolom.nilai ? kolom.nilai(b) : b[kolom.key];
      if (kolom.tipe === 'angka') {
        // Nilai kosong selalu tenggelam ke bawah, pada kedua arah urutan.
        // Memakai -Infinity saja membuatnya justru naik ke atas saat menaik.
        const aKosong = va === null || va === undefined;
        const bKosong = vb === null || vb === undefined;
        if (aKosong && bKosong) return 0;
        if (aKosong) return 1;
        if (bKosong) return -1;
        if (va === vb) return 0;
        return va < vb ? -arah : arah;
      }
      return String(va ?? '').localeCompare(String(vb ?? ''), 'id') * arah;
    });
  }, [data, urut]);

  useEffect(() => { setHalaman(1); }, [data, urut]);

  const totalHalaman = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);
  const tampil = hasil.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  const ubahUrut = (key) =>
    setUrut((u) => (u.key === key ? { key, arah: u.arah === 'asc' ? 'desc' : 'asc' } : { key, arah: 'asc' }));

  const IkonUrut = ({ aktif, arah }) => {
    if (!aktif) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />;
    return arah === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-slate-700" />
      : <ArrowDown className="h-3.5 w-3.5 text-slate-700" />;
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      {/* Kepala: jumlah baris — penyaringnya ada di atas halaman, bukan di sini */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Direktori BUMDes</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Menampilkan <span className="font-semibold text-slate-800">{nf.format(hasil.length)}</span> BUMDes
            {adaFilter ? ' sesuai filter di atas' : ` se-${namaWilayah}`}. Klik satu baris untuk melihat rinciannya.
          </p>
        </div>

        {/* Yang diekspor adalah `hasil` — baris yang sedang tersaring dan
            terurut, bukan `data` mentah dan bukan pula satu halaman yang
            kebetulan terlihat. Orang mengunduh untuk menindaklanjuti apa yang
            baru saja disaringnya. */}
        <TombolEkspor
          kolom={KOLOM_EKSPOR}
          baris={hasil}
          namaBerkas="bumdes"
          judul="Data BUMDes"
          subjudul={`${nf.format(hasil.length)} BUM Desa${adaFilter ? ' (tersaring)' : ` se-${namaWilayah}`}`}
        />
      </div>

      {/* Kosong */}
      {hasil.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <Inbox className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Tidak ada BUMDes yang cocok</p>
          <p className="mt-1 text-sm text-slate-500">Longgarkan penyaring di bagian atas halaman.</p>
          {adaFilter && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Reset semua filter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tabel — layar sedang ke atas */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {KOLOM_URUT.map((k) => (
                    <th
                      key={k.key}
                      scope="col"
                      className={k.tipe === 'angka' ? 'px-4 py-2.5 text-right' : 'px-4 py-2.5'}
                    >
                      <button
                        type="button"
                        onClick={() => ubahUrut(k.key)}
                        className={
                          k.tipe === 'angka'
                            ? 'ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900'
                            : 'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900'
                        }
                      >
                        {k.label}
                        <IkonUrut aktif={urut.key === k.key} arah={urut.arah} />
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tampil.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setDipilih(d)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setDipilih(d); }}
                    className="cursor-pointer transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{d.nama}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{teks(d.desa)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{teks(d.kecamatan)}</td>
                    {/* Kategori usaha bisa panjang (satu BUM Desa boleh mencentang
                        banyak kategori). Dipotong dua baris di sel, utuh di tooltip
                        dan di modal detail. */}
                    <td className="max-w-[220px] px-4 py-3 text-slate-600">
                      <span className="line-clamp-2 text-[13px] leading-5" title={jenisUsahaTampil(d) || undefined}>
                        {teks(jenisUsahaTampil(d))}
                      </span>
                      {d.jenis_usaha_utama && (
                        <span className="mt-0.5 block truncate text-[11px] text-slate-400" title={d.jenis_usaha_utama}>
                          Utama: {d.jenis_usaha_utama}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{rupiahRingkas(d.aset)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{rupiahRingkas(d.omset_2025)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{rupiahRingkas(d.laba_2025)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {d.tenaga_kerja ? nf.format(d.tenaga_kerja) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <LencanaStatus status={d.status} />
                        <LencanaPeringkat item={d} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu — layar kecil */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {tampil.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setDipilih(d)}
                  className="w-full px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{d.nama}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {teks(d.desa)}, Kec. {teks(d.kecamatan)}
                      </p>
                      {jenisUsahaTampil(d) && (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                          <span className="font-semibold text-slate-600">Usaha:</span> {jenisUsahaTampil(d)}
                        </p>
                      )}
                    </div>
                    <LencanaStatus status={d.status} />
                  </div>
                  <dl className="mt-2.5 grid grid-cols-3 gap-2">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-400">Aset</dt>
                      <dd className="text-xs font-semibold tabular-nums text-slate-800">{rupiahRingkas(d.aset)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-400">Omset 24</dt>
                      <dd className="text-xs font-semibold tabular-nums text-slate-800">{rupiahRingkas(omsetTerbaru(d))}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-400">Pekerja</dt>
                      <dd className="text-xs font-semibold tabular-nums text-slate-800">
                        {d.tenaga_kerja ? nf.format(d.tenaga_kerja) : '—'}
                      </dd>
                    </div>
                  </dl>
                </button>
              </li>
            ))}
          </ul>

          {/* Halaman */}
          {totalHalaman > 1 && (
            <nav
              aria-label="Navigasi halaman"
              className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-xs text-slate-500">
                Halaman {halamanAman} dari {totalHalaman}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHalaman((h) => Math.max(1, h - 1))}
                  disabled={halamanAman === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
                  disabled={halamanAman === totalHalaman}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                >
                  Berikutnya <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}

      <BumdesDetailModal item={dipilih} onClose={() => setDipilih(null)} onUbah={onUbah} />
    </section>
  );
};

export default BumdesDirectory;
