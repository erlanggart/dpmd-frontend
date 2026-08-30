// Grafik kelembagaan: badan hukum, pemeringkatan, sebaran kecamatan.
// Dihitung dari daftar yang sedang disaring. Batang bisa diklik untuk menyaring.
import React, { useMemo, useState } from 'react';
import { ScrollText, Award, MapPin } from 'lucide-react';
import {
  URUTAN_BADAN_HUKUM, URUTAN_PERINGKAT, BADAN_HUKUM_LAINNYA, PERINGKAT_KOSONG,
  isAktif, peringkatResmi, tahapBadanHukum,
} from './bumdesFilter';
import { Kartu, Judul, Batang, BatangTumpuk, Legenda, Kosong } from './bumdesViz';
import { RAMP, WARNA_AKTIF, WARNA_TIDAK_AKTIF, nf, persenDari } from './bumdesFormat';

// 39 kecamatan dalam satu kotak gulir menuntut menggulir dua arah sekaligus.
// Bawaannya sepuluh teratas, sisanya sejauh satu ketukan.
const BATAS_RINGKAS = 10;

const BumdesCharts = ({ data, filter, onFilter }) => {
  const [ringkas, setRingkas] = useState(true);

  const s = useMemo(() => {
    const total = data.length;

    const badanHukum = [...URUTAN_BADAN_HUKUM, BADAN_HUKUM_LAINNYA]
      .map((label) => ({ label, n: data.filter((d) => tahapBadanHukum(d) === label).length }))
      .filter((b) => b.n > 0 || b.label !== BADAN_HUKUM_LAINNYA);

    const peringkat = [...URUTAN_PERINGKAT, PERINGKAT_KOSONG]
      .map((label) => ({ label, n: data.filter((d) => peringkatResmi(d) === label).length }))
      .filter((p) => p.n > 0 || p.label !== PERINGKAT_KOSONG);

    const peta = new Map();
    for (const d of data) {
      const k = d.kecamatan || 'Tidak tercatat';
      const baris = peta.get(k) || { label: k, aktif: 0, tidakAktif: 0 };
      if (isAktif(d.status)) baris.aktif += 1; else baris.tidakAktif += 1;
      peta.set(k, baris);
    }
    const kecamatan = [...peta.values()]
      .sort((a, b) => (b.aktif + b.tidakAktif) - (a.aktif + a.tidakAktif) || a.label.localeCompare(b.label, 'id'));

    return {
      total,
      badanHukum,
      peringkat,
      peringkatTerdata: peringkat.filter((p) => p.label !== PERINGKAT_KOSONG).reduce((t, p) => t + p.n, 0),
      kecamatan,
      aktifTotal: data.filter((d) => isAktif(d.status)).length,
      maksKecamatan: Math.max(1, ...kecamatan.map((k) => k.aktif + k.tidakAktif)),
    };
  }, [data]);

  if (!s.total) {
    return (
      <Kartu>
        <Kosong />
      </Kartu>
    );
  }

  const maksBadanHukum = Math.max(1, ...s.badanHukum.map((b) => b.n));
  const maksPeringkat = Math.max(1, ...s.peringkat.map((p) => p.n));
  const tidakAktifTotal = s.total - s.aktifTotal;
  const tampilKecamatan = ringkas ? s.kecamatan.slice(0, BATAS_RINGKAS) : s.kecamatan;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Kartu>
          <Judul icon={ScrollText}>Badan hukum</Judul>
          <div className="space-y-3">
            {s.badanHukum.map((b, i) => (
              <Batang
                key={b.label}
                label={b.label}
                nilai={b.n}
                tampil={`${nf.format(b.n)} · ${persenDari(b.n, s.total)}%`}
                maks={maksBadanHukum}
                warna={RAMP[i + 2]}
                urutan={i}
                judulHover={`${b.n} BUMDes berstatus ${b.label}`}
                aktifTersorot={filter.badanHukum === b.label}
                onKlik={() => onFilter({
                  ...filter,
                  badanHukum: filter.badanHukum === b.label ? 'semua' : b.label,
                })}
              />
            ))}
          </div>
        </Kartu>

        <Kartu>
          <Judul icon={Award}>Kelas BUMDes</Judul>
          <div className="space-y-3">
            {s.peringkat.map((p, i) => (
              <Batang
                key={p.label}
                label={p.label}
                nilai={p.n}
                tampil={`${nf.format(p.n)} · ${persenDari(p.n, s.peringkatTerdata || s.total)}%`}
                maks={maksPeringkat}
                warna={p.label === PERINGKAT_KOSONG ? RAMP[0] : RAMP[i + 1]}
                urutan={i}
                judulHover={`${p.n} BUMDes berkelas ${p.label}`}
                aktifTersorot={filter.peringkat === p.label}
                onKlik={() => onFilter({
                  ...filter,
                  peringkat: filter.peringkat === p.label ? 'semua' : p.label,
                })}
              />
            ))}
          </div>
        </Kartu>
      </div>

      <Kartu>
        <Judul
          icon={MapPin}
          aksi={
            <div className="hidden flex-shrink-0 sm:block">
              <Legenda
                butir={[
                  { label: 'Aktif', warna: WARNA_AKTIF, nilai: s.aktifTotal },
                  { label: 'Tidak aktif', warna: WARNA_TIDAK_AKTIF, nilai: tidakAktifTotal },
                ]}
              />
            </div>
          }
        >
          Sebaran per kecamatan
        </Judul>

        <div className="mb-3 sm:hidden">
          <Legenda
            butir={[
              { label: 'Aktif', warna: WARNA_AKTIF, nilai: s.aktifTotal },
              { label: 'Tidak aktif', warna: WARNA_TIDAK_AKTIF, nilai: tidakAktifTotal },
            ]}
          />
        </div>

        <div className={ringkas ? 'space-y-0.5' : 'max-h-[30rem] space-y-0.5 overflow-y-auto pr-1'}>
          {tampilKecamatan.map((k, i) => (
            <BatangTumpuk
              key={k.label}
              label={k.label}
              aktif={k.aktif}
              tidakAktif={k.tidakAktif}
              maks={s.maksKecamatan}
              urutan={i}
              onKlik={() => onFilter({
                ...filter,
                kecamatan: filter.kecamatan === k.label ? 'semua' : k.label,
              })}
            />
          ))}
        </div>

        {s.kecamatan.length > BATAS_RINGKAS && (
          <button
            type="button"
            onClick={() => setRingkas((v) => !v)}
            className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            {ringkas
              ? `Tampilkan semua ${nf.format(s.kecamatan.length)} kecamatan`
              : `Tampilkan ${BATAS_RINGKAS} teratas saja`}
          </button>
        )}
      </Kartu>
    </div>
  );
};

export default BumdesCharts;
