/**
 * Profil keluarga per kategori sensus.
 *
 * Tabel `sensuses` ASTA DESA punya ±104 kolom yang dikelompokkan lewat
 * awalannya (`spp_*` rumah & prasarana, `sosial_*` bantuan sosial, …). Backend
 * menemukan kolom-kolomnya sendiri dari data dan mengirim HANYA hitungan per
 * nilai — tidak ada identitas warga yang sampai ke sini. Karena itu komponen
 * ini tidak mengenal nama kolom satu pun: pertanyaan kuesioner baru di ASTA DESA
 * otomatis muncul sebagai kartu baru.
 *
 * Penyebut persentase sengaja berbeda per jenis kolom:
 *   - kategori      → keluarga yang MENJAWAB kolom itu (jumlah semua batang = 100%)
 *   - pilihan ganda → SELURUH keluarga, ditambah baris "Tidak ada/kosong",
 *                     karena satu keluarga bisa masuk beberapa batang sekaligus
 */

import React, { useMemo, useState } from 'react';
import { Hash, ListChecks, MapPin, Search, X } from 'lucide-react';
import { DaftarBatang, Kosong } from './ui';
import { SERI, TANGGA, angka, rapikanLabel } from './warna';

const WARNA_KATEGORI = [SERI[0], SERI[2], SERI[1], SERI[3], SERI[4], TANGGA[3], TANGGA[1]];

const formatAngka = (n) =>
  n === null || n === undefined ? '—' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });

/** Penyaring kecamatan → desa. Desa baru bisa dipilih setelah kecamatan. */
export const FilterWilayah = ({ wilayah, filter, onUbah, total }) => {
  const pilihKelas =
    'h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';
  const adaFilter = filter.kecamatan || filter.desa;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <MapPin className="h-3.5 w-3.5" /> Wilayah
      </span>
      <select
        value={filter.kecamatan || ''}
        onChange={(e) => onUbah({ kecamatan: e.target.value || undefined, desa: undefined })}
        className={`${pilihKelas} w-48`}
      >
        <option value="">Semua kecamatan</option>
        {(wilayah?.kecamatan || []).map((k) => (
          <option key={k.nama} value={k.nama}>
            {k.nama} ({angka(k.total)})
          </option>
        ))}
      </select>
      <select
        value={filter.desa || ''}
        onChange={(e) => onUbah({ ...filter, desa: e.target.value || undefined })}
        disabled={!filter.kecamatan}
        className={`${pilihKelas} w-48`}
        title={!filter.kecamatan ? 'Pilih kecamatan dulu' : undefined}
      >
        <option value="">{filter.kecamatan ? 'Semua desa' : 'Pilih kecamatan dulu'}</option>
        {(wilayah?.desa || []).map((d) => (
          <option key={d.nama} value={d.nama}>
            {d.nama} ({angka(d.total)})
          </option>
        ))}
      </select>
      {adaFilter && (
        <button
          type="button"
          onClick={() => onUbah({})}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-3.5 w-3.5" /> Reset
        </button>
      )}
      {total !== undefined && (
        <span className="ml-auto text-xs text-slate-500">
          <span className="font-semibold text-slate-900 tabular-nums">{angka(total)}</span> keluarga
          {adaFilter ? ` di ${filter.desa ? `Desa ${filter.desa}` : `Kec. ${filter.kecamatan}`}` : ' se-kabupaten'}
        </span>
      )}
    </div>
  );
};

const KartuKolom = ({ kolom, totalKeluarga, warna }) => {
  const persenTerisi = totalKeluarga ? Math.round((kolom.terisi / totalKeluarga) * 100) : 0;

  const baris = useMemo(() => {
    if (!kolom.nilai) return [];
    const isi = kolom.nilai.map((n) => ({ label: rapikanLabel(n.label), total: n.total }));
    if (kolom.jenis === 'pilihan_ganda' && totalKeluarga > kolom.terisi) {
      isi.push({ label: 'Tidak ada / kosong', total: totalKeluarga - kolom.terisi });
    }
    return isi;
  }, [kolom, totalKeluarga]);

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug text-slate-900">{kolom.label}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            {kolom.jenis === 'pilihan_ganda' ? (
              <>
                <ListChecks className="h-3 w-3" /> Pilihan ganda
              </>
            ) : kolom.jenis === 'angka' ? (
              <>
                <Hash className="h-3 w-3" /> Angka
              </>
            ) : (
              'Kategori'
            )}
            <span aria-hidden>·</span>
            <span className="font-mono">{kolom.kunci}</span>
          </p>
        </div>
        <span
          className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${
            persenTerisi >= 80 ? 'bg-emerald-50 text-emerald-700' : persenTerisi >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
          }`}
          title={`${angka(kolom.terisi)} dari ${angka(totalKeluarga)} keluarga mengisi kolom ini`}
        >
          terisi {persenTerisi}%
        </span>
      </header>

      {kolom.jenis === 'angka' ? (
        <dl className="grid grid-cols-2 gap-2">
          {[
            ['Rata-rata', kolom.statistik?.rata_rata],
            ['Median', kolom.statistik?.median],
            ['Terendah', kolom.statistik?.min],
            ['Tertinggi', kolom.statistik?.maks],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="text-[11px] text-slate-500">{l}</dt>
              <dd className="text-base font-semibold tabular-nums text-slate-900">{formatAngka(v)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <DaftarBatang
          baris={baris}
          total={kolom.jenis === 'pilihan_ganda' ? totalKeluarga : kolom.terisi}
          warna={(b) => (b.label === 'Tidak ada / kosong' ? '#cbd5e1' : warna)}
          batas={8}
        />
      )}
      {kolom.nilai && kolom.nilai.length > 8 && (
        <p className="mt-2 text-[11px] text-slate-400">+{kolom.nilai.length - 8} nilai lain dengan jumlah lebih kecil</p>
      )}
    </article>
  );
};

/** Grid kartu satu kategori + pencarian kolom. */
export const GridKategori = ({ kategori, totalKeluarga, indeksWarna = 0 }) => {
  const [cari, setCari] = useState('');
  const kolom = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return kategori.kolom;
    return kategori.kolom.filter((k) => k.label.toLowerCase().includes(q) || k.kunci.toLowerCase().includes(q));
  }, [kategori, cari]);
  const warna = WARNA_KATEGORI[indeksWarna % WARNA_KATEGORI.length];

  return (
    <div className="space-y-3">
      {kategori.kolom.length > 6 && (
        <label className="relative block max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder={`Cari di ${kategori.label}…`}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-slate-400"
          />
        </label>
      )}
      {!kolom.length ? (
        <Kosong pesan="Tidak ada kolom yang cocok." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {kolom.map((k) => (
            <KartuKolom key={k.kunci} kolom={k} totalKeluarga={totalKeluarga} warna={warna} />
          ))}
        </div>
      )}
    </div>
  );
};
