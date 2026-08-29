// Grafik kelembagaan: proses badan hukum, kelas pemeringkatan, sebaran wilayah.
//
// Ketiganya dihitung dari daftar yang sedang disaring — bukan dari ringkasan
// terpisah di server. Sebelumnya grafik memakai agregat /dashboard sementara
// tabel memakai daftar, jadi keduanya bisa menampilkan angka berbeda untuk hal
// yang sama. Sekarang hanya ada satu sumber.
//
// Batang bisa diklik untuk memasang filter yang bersangkutan; itu jalan
// tercepat dari "39 kecamatan" ke "Jonggol saja" tanpa membuka menu.
import React, { useMemo } from 'react';
import { ScrollText, Award, MapPin } from 'lucide-react';
import {
  URUTAN_BADAN_HUKUM, URUTAN_PERINGKAT, BADAN_HUKUM_LAINNYA, PERINGKAT_KOSONG,
  isAktif, peringkatResmi, tahapBadanHukum,
} from './bumdesFilter';
import { Kartu, Judul, Batang, BatangTumpuk, Legenda, Kosong } from './bumdesViz';
import { RAMP, WARNA_AKTIF, WARNA_TIDAK_AKTIF, nf, persenDari } from './bumdesFormat';

const BumdesCharts = ({ data, filter, onFilter }) => {
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
      badanHukumTotal: badanHukum.reduce((t, b) => t + b.n, 0),
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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Proses badan hukum — urutan tangga dari paling jauh ke paling selesai */}
        <Kartu>
          <Judul
            icon={ScrollText}
            catatan="Tahapan pendaftaran badan hukum ke Kemenkumham, diurutkan dari yang paling jauh sampai yang sudah terbit sertifikat. Klik satu tahap untuk menyaring seluruh halaman."
          >
            Perjalanan badan hukum
          </Judul>
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
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Setiap BUMDes masuk tepat satu tahap; jumlah keempatnya {nf.format(s.badanHukumTotal)},
            sama dengan {nf.format(s.total)} BUMDes yang sedang ditampilkan.
          </p>
        </Kartu>

        {/* Pemeringkatan resmi */}
        <Kartu>
          <Judul
            icon={Award}
            catatan="Penilaian resmi 2024 — satu-satunya penilaian yang lengkap untuk seluruh BUMDes. Penilaian 2026 masih berjalan dan belum mencakup semuanya."
          >
            Kelas menurut penilaian resmi
          </Judul>
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
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Persentase dihitung terhadap {nf.format(s.peringkatTerdata)} BUMDes yang sudah dinilai
            pada penilaian 2024. Kolom “Kelas” di direktori memakai penilaian yang sama.
          </p>
        </Kartu>
      </div>

      {/* Sebaran wilayah */}
      <Kartu>
        <Judul
          icon={MapPin}
          catatan="Diurutkan dari kecamatan dengan BUMDes terbanyak. Klik satu baris untuk menyaring seluruh halaman ke kecamatan itu."
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

        <div className="max-h-[30rem] space-y-0.5 overflow-y-auto pr-1">
          {s.kecamatan.map((k, i) => (
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

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          {nf.format(s.kecamatan.length)} kecamatan dalam tampilan ini. Panjang batang sebanding
          dengan kecamatan terbanyak, bukan dengan seluruh kabupaten.
        </p>
      </Kartu>
    </div>
  );
};

export default BumdesCharts;
