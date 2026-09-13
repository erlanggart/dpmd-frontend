/**
 * Kepingan tampilan yang dipakai bersama seluruh tab Asta Desa.
 *
 * Dikumpulkan di satu berkas supaya enam tab tidak masing-masing menemukan
 * ulang bentuk kartu, keadaan kosong, dan keadaan galatnya sendiri — perbedaan
 * kecil antar tab itulah yang membuat sebuah halaman terasa ditambal, bukan
 * dirancang.
 */

import React from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { angka, persen } from './warna';

/** Bingkai putih standar: judul, keterangan, isi. */
export const Panel = ({ judul, keterangan, aksi, children, className = '', padat = false }) => (
  <section
    className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] ${className}`}
  >
    {(judul || aksi) && (
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          {judul && <h2 className="text-sm font-semibold tracking-tight text-slate-900">{judul}</h2>}
          {keterangan && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{keterangan}</p>}
        </div>
        {aksi && <div className="flex flex-shrink-0 items-center gap-2">{aksi}</div>}
      </header>
    )}
    <div className={padat ? '' : 'p-4 sm:p-5'}>{children}</div>
  </section>
);

/**
 * Kartu satu angka.
 *
 * Angkanya ditulis penuh, tidak diringkas. Halaman ini dipakai untuk melapor,
 * dan "7,8 rb keluarga" bukan angka yang bisa dimasukkan ke laporan.
 */
export const KartuAngka = ({ icon: Icon, label, nilai, satuan, keterangan, warna = '#2a78d6' }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
    <div className="flex items-start justify-between gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      {Icon && (
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${warna}14`, color: warna }}
        >
          <Icon className="h-4 w-4" />
        </span>
      )}
    </div>
    <p className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
      {typeof nilai === 'number' ? angka(nilai) : nilai ?? '—'}
      {satuan && <span className="ml-1 text-sm font-medium text-slate-400">{satuan}</span>}
    </p>
    {keterangan && <p className="mt-1 text-xs leading-relaxed text-slate-500">{keterangan}</p>}
  </div>
);

/**
 * Daftar batang mendatar.
 *
 * Bentuk ini dipilih untuk peringkat berlabel panjang (nama kecamatan, jenis
 * pekerjaan): batang tegak memaksa labelnya miring atau terpotong, dan label
 * miring adalah cara tercepat membuat tabel peringkat berhenti terbaca.
 * Angkanya ditulis di ujung tiap batang — identitas tidak pernah bersandar pada
 * warna saja.
 */
export const DaftarBatang = ({ baris, total, maks, warna = '#2a78d6', batas = 10, tampilkanPersen = true }) => {
  const tertinggi = maks || Math.max(1, ...baris.map((b) => b.total));
  const tampil = batas ? baris.slice(0, batas) : baris;

  if (!tampil.length) return <Kosong pesan="Belum ada data untuk ditampilkan." />;

  return (
    <ol className="space-y-2.5">
      {tampil.map((b, i) => (
        <li key={b.label ?? i}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-xs font-medium text-slate-700" title={b.label}>
              {b.label}
            </span>
            <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-slate-900">
              {angka(b.total)}
              {tampilkanPersen && total ? (
                <span className="ml-1.5 font-medium text-slate-400">{persen(b.total, total)}</span>
              ) : null}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(2, (b.total / tertinggi) * 100)}%`,
                backgroundColor: typeof warna === 'function' ? warna(b, i) : warna
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
};

export const Memuat = ({ pesan = 'Memuat data Asta Desa…', tinggi = 'py-16' }) => (
  <div className={`flex flex-col items-center justify-center ${tinggi} text-center`}>
    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
    <p className="mt-3 text-sm text-slate-500">{pesan}</p>
  </div>
);

export const Kosong = ({ pesan = 'Tidak ada data.', ikon: Ikon = Inbox }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Ikon className="h-7 w-7 text-slate-300" />
    <p className="mt-2.5 max-w-sm text-sm text-slate-500">{pesan}</p>
  </div>
);

/**
 * Keadaan galat.
 *
 * Pesannya ditampilkan apa adanya dari backend. Di sanalah tertulis hal yang
 * bisa ditindaklanjuti — "kredensial ditolak", "bukan super_admin", "tidak
 * merespons dalam batas waktu" — dan menggantinya dengan "terjadi kesalahan"
 * membuang satu-satunya petunjuk yang dipunya pembaca.
 */
export const Galat = ({ pesan, onUlang }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/60 px-6 py-12 text-center">
    <AlertTriangle className="h-7 w-7 text-amber-500" />
    <p className="mt-3 text-sm font-semibold text-slate-900">Data Asta Desa tidak bisa diambil</p>
    <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-600">{pesan}</p>
    {onUlang && (
      <button
        type="button"
        onClick={() => onUlang(true)}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Coba lagi
      </button>
    )}
  </div>
);

/** Lencana kecil berlabel — warna selalu berdampingan dengan teksnya. */
export const Lencana = ({ warna, anak, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
    {warna && (
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: warna }} />
    )}
    {children ?? anak}
  </span>
);

/** Legenda grafik — wajib ada begitu ada dua seri atau lebih. */
export const Legenda = ({ item }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
    {item.map((it) => (
      <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: it.warna }} />
        {it.label}
      </span>
    ))}
  </div>
);

/** Tooltip recharts dengan gaya yang sama di seluruh halaman. */
export const Tooltip1 = ({ active, payload, label, satuan = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/97 px-3 py-2 shadow-lg backdrop-blur">
      {label !== undefined && (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      )}
      <div className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <p key={p.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            <span className="text-slate-500">{p.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900">
              {angka(Math.abs(p.value))} {satuan}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
};
