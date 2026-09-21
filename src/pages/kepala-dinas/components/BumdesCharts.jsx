// Grafik kelembagaan: badan hukum, pemeringkatan, sebaran kecamatan.
// Dihitung dari daftar yang sedang disaring. Batang bisa diklik untuk menyaring.
import React, { useMemo, useState } from 'react';
import { ScrollText, Award, MapPin } from 'lucide-react';
import {
  URUTAN_BADAN_HUKUM, URUTAN_PERINGKAT, BADAN_HUKUM_LAINNYA, PERINGKAT_KOSONG,
  isAktif, peringkatResmi, tahapBadanHukum,
} from './bumdesFilter';
import { Kartu, Judul, Batang, Peta, PitaBertumpuk, Kosong } from './bumdesViz';
import { RAMP, RAMP_AKSEN, WARNA_AKTIF, WARNA_TIDAK_AKTIF, nf, persenDari } from './bumdesFormat';

// Sebagai kisi, seluruh kecamatan muat tanpa kotak gulir — jadi bawaannya
// tampil semua. Tombol ringkas tetap ada untuk layar sempit, tempat 39 sel
// berarti dua puluh baris.
const BATAS_RINGKAS = 12;

const BumdesCharts = ({ data, filter, onFilter }) => {
  const [ringkas, setRingkas] = useState(false);

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

  const maksPeringkat = Math.max(1, ...s.peringkat.map((p) => p.n));
  const tidakAktifTotal = s.total - s.aktifTotal;
  const tampilKecamatan = ringkas ? s.kecamatan.slice(0, BATAS_RINGKAS) : s.kecamatan;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Tahapan badan hukum adalah BAGIAN DARI SATU keseluruhan — seluruh
            BUM Desa terbagi habis ke lima tahap. Bentuk yang tepat untuk itu pita
            bertumpuk, bukan lima batang sejajar yang justru menyembunyikan bahwa
            jumlahnya genap seratus persen. */}
        <Kartu>
          <Judul
            icon={ScrollText}
            warna={RAMP[2]}
            catatan={`${nf.format(s.total)} BUMDes terbagi habis ke lima tahap`}
          >
            Badan hukum
          </Judul>

          <PitaBertumpuk
            total={s.total}
            tinggi={18}
            segmen={s.badanHukum.map((b, i) => ({
              id: b.label,
              label: b.label,
              nilai: b.n,
              warna: RAMP[i + 1],
              onKlik: () => onFilter({
                ...filter,
                badanHukum: filter.badanHukum === b.label ? 'semua' : b.label,
              }),
            }))}
          />

          <ul className="mt-4 space-y-2">
            {s.badanHukum.map((b, i) => (
              <li key={b.label}>
                <button
                  type="button"
                  onClick={() => onFilter({
                    ...filter,
                    badanHukum: filter.badanHukum === b.label ? 'semua' : b.label,
                  })}
                  className={`-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-slate-50 ${
                    filter.badanHukum === b.label ? 'bg-slate-50' : ''
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]"
                    style={{ backgroundColor: RAMP[i + 1] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{b.label}</span>
                  <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                    {nf.format(b.n)}
                  </span>
                  <span className="w-9 flex-shrink-0 text-right text-xs tabular-nums text-slate-400">
                    {persenDari(b.n, s.total)}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Kartu>

        <Kartu>
          <Judul icon={Award} warna={RAMP_AKSEN[2]}>Kelas BUMDes</Judul>
          <div className="space-y-3">
            {s.peringkat.map((p, i) => (
              <Batang
                key={p.label}
                label={p.label}
                nilai={p.n}
                tampil={`${nf.format(p.n)} · ${persenDari(p.n, s.peringkatTerdata || s.total)}%`}
                maks={maksPeringkat}
                warna={p.label === PERINGKAT_KOSONG ? RAMP_AKSEN[0] : RAMP_AKSEN[i + 1]}
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
          warna={RAMP[2]}
          catatan={`Kepekatan sel menyatakan jumlah BUMDes. ${nf.format(s.aktifTotal)} aktif, ${nf.format(
            tidakAktifTotal,
          )} tidak aktif — rinciannya muncul saat sel disentuh.`}
        >
          Sebaran per kecamatan
        </Judul>

        {/* Kisi, bukan daftar batang: tiga puluh sembilan kecamatan sebagai
            batang menuntut kotak gulir sendiri, dan membandingkan dua wilayah
            yang berjauhan di daftar jadi mustahil tanpa menggulir bolak-balik. */}
        <Peta
          ramp={RAMP}
          terpilih={filter.kecamatan !== 'semua' ? filter.kecamatan : null}
          onKlik={(label) => onFilter({
            ...filter,
            kecamatan: filter.kecamatan === label ? 'semua' : label,
          })}
          sel={tampilKecamatan.map((k) => ({
            label: k.label,
            nilai: k.aktif + k.tidakAktif,
            rincian: [
              { warna: WARNA_AKTIF, teks: `${nf.format(k.aktif)} aktif` },
              { warna: WARNA_TIDAK_AKTIF, teks: `${nf.format(k.tidakAktif)} tidak aktif` },
            ],
          }))}
        />

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
