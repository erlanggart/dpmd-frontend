// Satu baris penyaring di atas seluruh isi halaman Statistik BUMDes.
//
// Aturannya: penyaring TIDAK boleh tinggal di dalam kartu grafik mana pun.
// Satu baris di atas, dan semua yang di bawahnya — kartu angka, grafik, tabel —
// membaca irisan yang sama. Itu satu-satunya cara angkanya tidak saling
// bertentangan di layar yang sama.
//
// Kelas Tailwind ditulis utuh, tidak dirangkai dari variabel: kelas dinamis
// tidak ikut ter-scan saat build dan diam-diam hilang di produksi.
import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import {
  FILTER_AWAL, KELAS_OMSET, URUTAN_BADAN_HUKUM, URUTAN_PERINGKAT,
  BADAN_HUKUM_LAINNYA, PERINGKAT_KOSONG,
  adaFilterAktif, jumlahFilterAktif, peringkatResmi, tahapBadanHukum,
} from './bumdesFilter';

const nf = new Intl.NumberFormat('id-ID');

const Pilihan = ({ label, value, onChange, options }) => (
  <label className="flex min-w-0 flex-col gap-1">
    <span className="text-[11px] font-medium text-slate-500">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </label>
);

/** Keping penanda filter yang sedang menyala, bisa dilepas satu per satu. */
const Keping = ({ children, onHapus }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 py-1 pl-3 pr-1.5 text-[11px] font-medium text-white">
    {children}
    <button
      type="button"
      onClick={onHapus}
      aria-label={`Hapus filter ${children}`}
      className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-white/20"
    >
      <X className="h-3 w-3" />
    </button>
  </span>
);

const BumdesFilterBar = ({ data, filter, onChange, jumlahHasil, tersemat = false }) => {
  const [terbuka, setTerbuka] = useState(false);

  // Setiap pilihan menyebut jumlahnya, dan jumlah itu dihitung dengan ember
  // yang SAMA dengan grafik di bawahnya. Kalau grafik bilang 325 tapi
  // menyaringnya menghasilkan jumlah lain, selisihnya kelihatan langsung di
  // daftar pilihan — tidak perlu ditebak.
  const opsiKecamatan = useMemo(() => {
    const hitung = new Map();
    data.forEach((d) => {
      const k = d.kecamatan || 'Tidak tercatat';
      hitung.set(k, (hitung.get(k) || 0) + 1);
    });
    return [{ value: 'semua', label: `Semua kecamatan (${nf.format(data.length)})` },
      ...[...hitung.keys()].sort((a, b) => a.localeCompare(b, 'id'))
        .map((k) => ({ value: k, label: `${k} (${nf.format(hitung.get(k))})` }))];
  }, [data]);

  const opsiBadanHukum = useMemo(() => {
    const hitung = new Map();
    data.forEach((d) => {
      const k = tahapBadanHukum(d);
      hitung.set(k, (hitung.get(k) || 0) + 1);
    });
    return [{ value: 'semua', label: `Semua status badan hukum (${nf.format(data.length)})` },
      ...[...URUTAN_BADAN_HUKUM, BADAN_HUKUM_LAINNYA]
        .filter((b) => hitung.get(b))
        .map((b) => ({ value: b, label: `${b} (${nf.format(hitung.get(b))})` }))];
  }, [data]);

  const opsiPeringkat = useMemo(() => {
    const hitung = new Map();
    data.forEach((d) => {
      const k = peringkatResmi(d);
      hitung.set(k, (hitung.get(k) || 0) + 1);
    });
    return [{ value: 'semua', label: `Semua kelas (${nf.format(data.length)})` },
      ...[...URUTAN_PERINGKAT, PERINGKAT_KOSONG]
        .filter((x) => hitung.get(x))
        .map((x) => ({ value: x, label: `${x} (${nf.format(hitung.get(x))})` }))];
  }, [data]);

  const ubah = (kunci) => (nilai) => onChange({ ...filter, [kunci]: nilai });
  const bersihkan = (kunci) => onChange({ ...filter, [kunci]: FILTER_AWAL[kunci] });
  const reset = () => onChange({ ...FILTER_AWAL });

  const menyala = adaFilterAktif(filter);
  const jumlahLanjutan = jumlahFilterAktif({
    ...filter, cari: FILTER_AWAL.cari, kecamatan: FILTER_AWAL.kecamatan, status: FILTER_AWAL.status,
  });

  const labelKeping = [
    filter.cari && { kunci: 'cari', teks: `“${filter.cari}”` },
    filter.kecamatan !== 'semua' && { kunci: 'kecamatan', teks: filter.kecamatan },
    filter.status !== 'semua' && {
      kunci: 'status', teks: filter.status === 'aktif' ? 'Aktif' : 'Tidak aktif',
    },
    filter.badanHukum !== 'semua' && { kunci: 'badanHukum', teks: filter.badanHukum },
    filter.peringkat !== 'semua' && { kunci: 'peringkat', teks: `Kelas ${filter.peringkat}` },
    filter.kelasOmset !== 'semua' && {
      kunci: 'kelasOmset',
      teks: KELAS_OMSET.find((k) => k.id === filter.kelasOmset)?.label || filter.kelasOmset,
    },
    filter.program !== 'semua' && {
      kunci: 'program',
      teks: {
        ketapang: 'Berperan di ketahanan pangan',
        wisata: 'Berperan di desa wisata',
        mbg: 'Berperan di MBG',
        'tanpa-peran': 'Tanpa peran program',
      }[filter.program],
    },
    filter.dokumen !== 'semua' && {
      kunci: 'dokumen',
      teks: { lengkap: 'Dokumen lengkap', sebagian: 'Dokumen sebagian', kosong: 'Belum ada dokumen' }[filter.dokumen],
    },
    filter.legalitas !== 'semua' && {
      kunci: 'legalitas',
      teks: {
        nib: 'Punya NIB', npwp: 'Punya NPWP', lkpp: 'Terdaftar LKPP',
        lengkap: 'NIB + NPWP + LKPP', belum: 'Belum punya identitas legal',
      }[filter.legalitas],
    },
  ].filter(Boolean);

  return (
    // Margin negatif dan `sticky` disetel untuk halaman penuh: bilahnya
    // melebar sampai tepi layar dan menempel di bawah kepala halaman. Saat
    // tersemat di dalam panel bidang, keduanya salah — margin negatifnya
    // menjorok keluar panel lalu terpotong `overflow-hidden`, dan `sticky`
    // menempel pada wadah yang salah.
    <div className={tersemat
      ? 'z-20 rounded-xl border border-slate-200 bg-white px-4 py-3'
      : 'sticky top-16 z-20 -mx-4 border-b lg:top-0 border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'}>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          {/* Pencarian */}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={filter.cari}
              onChange={(e) => ubah('cari')(e.target.value)}
              placeholder="Cari nama BUMDes, desa, kecamatan, atau direktur…"
              aria-label="Cari BUMDes"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:w-auto sm:grid-cols-2">
            <div className="w-full sm:w-52">
              <Pilihan label="Kecamatan" value={filter.kecamatan} onChange={ubah('kecamatan')} options={opsiKecamatan} />
            </div>
            <div className="w-full sm:w-40">
              <Pilihan
                label="Status"
                value={filter.status}
                onChange={ubah('status')}
                options={[
                  { value: 'semua', label: 'Semua status' },
                  { value: 'aktif', label: 'Aktif' },
                  { value: 'tidak_aktif', label: 'Tidak aktif' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTerbuka((v) => !v)}
              aria-expanded={terbuka}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              Filter lanjutan
              {jumlahLanjutan > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] font-semibold text-white">
                  {jumlahLanjutan}
                </span>
              )}
            </button>
            {menyala && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {terbuka && (
          <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Pilihan label="Status badan hukum" value={filter.badanHukum} onChange={ubah('badanHukum')} options={opsiBadanHukum} />
            <Pilihan label="Kelas pemeringkatan 2024" value={filter.peringkat} onChange={ubah('peringkat')} options={opsiPeringkat} />
            <Pilihan
              label="Skala omset"
              value={filter.kelasOmset}
              onChange={ubah('kelasOmset')}
              options={[{ value: 'semua', label: 'Semua skala' },
                ...KELAS_OMSET.map((k) => ({ value: k.id, label: k.label }))]}
            />
            <Pilihan
              label="Peran program pemerintah"
              value={filter.program}
              onChange={ubah('program')}
              options={[
                { value: 'semua', label: 'Semua' },
                { value: 'ketapang', label: 'Ketahanan pangan' },
                { value: 'wisata', label: 'Desa wisata' },
                { value: 'mbg', label: 'Makan Bergizi Gratis' },
                { value: 'tanpa-peran', label: 'Belum berperan di program mana pun' },
              ]}
            />
            <Pilihan
              label="Kelengkapan dokumen"
              value={filter.dokumen}
              onChange={ubah('dokumen')}
              options={[
                { value: 'semua', label: 'Semua' },
                { value: 'lengkap', label: 'Lengkap (7 dokumen)' },
                { value: 'sebagian', label: 'Sebagian' },
                { value: 'kosong', label: 'Belum ada sama sekali' },
              ]}
            />
            <Pilihan
              label="Identitas legal"
              value={filter.legalitas}
              onChange={ubah('legalitas')}
              options={[
                { value: 'semua', label: 'Semua' },
                { value: 'lengkap', label: 'NIB + NPWP + LKPP lengkap' },
                { value: 'nib', label: 'Punya NIB' },
                { value: 'npwp', label: 'Punya NPWP' },
                { value: 'lkpp', label: 'Terdaftar LKPP' },
                { value: 'belum', label: 'Belum punya satu pun' },
              ]}
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {labelKeping.map((k) => (
            <Keping key={k.kunci} onHapus={() => bersihkan(k.kunci)}>{k.teks}</Keping>
          ))}
          <p className="ml-auto text-xs text-slate-500">
            Menampilkan <span className="font-semibold text-slate-900">{nf.format(jumlahHasil)}</span>
            {' '}dari {nf.format(data.length)} BUMDes
          </p>
        </div>
      </div>
    </div>
  );
};

export default BumdesFilterBar;
