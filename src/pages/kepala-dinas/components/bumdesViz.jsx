// Potongan visual bersama halaman Statistik BUMDes.
// Warna, format angka, dan gerak ada di bumdesFormat.js.
import React from 'react';
import {
  WARNA_TUNGGAL, WARNA_AKTIF, WARNA_TIDAK_AKTIF, nf,
} from './bumdesFormat';

/* --------------------------------------------------------------- potongan -- */

export const Kartu = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
    {children}
  </section>
);

export const Judul = ({ icon: Icon, children, catatan, aksi }) => (
  <div className="mb-4 flex items-start justify-between gap-4">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />}
        <h3 className="text-sm font-semibold text-slate-900">{children}</h3>
      </div>
      {catatan && <p className="mt-1 text-xs leading-relaxed text-slate-500">{catatan}</p>}
    </div>
    {aksi}
  </div>
);

/**
 * Batang horizontal berlabel. Lebarnya beranimasi saat filter berubah, dengan
 * jeda berjenjang menurut urutan sehingga terbaca sebagai satu gerakan, bukan
 * sepuluh gerakan acak.
 */
export const Batang = ({
  label, nilai, tampil, maks, warna = WARNA_TUNGGAL,
  keterangan, judulHover, urutan = 0, onKlik, aktifTersorot,
}) => {
  const persen = maks > 0 ? Math.max(nilai > 0 ? 1.5 : 0, (nilai / maks) * 100) : 0;
  const Bungkus = onKlik ? 'button' : 'div';

  return (
    <Bungkus
      type={onKlik ? 'button' : undefined}
      onClick={onKlik}
      title={judulHover}
      className={`group block w-full text-left transition-colors ${
        onKlik ? 'cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-slate-50' : ''
      } ${aktifTersorot ? 'bg-slate-50' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm text-slate-700">{label}</span>
        <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-slate-900">{tampil}</span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-[4px] bg-slate-100">
        <div
          className="h-2.5 rounded-[4px] motion-safe:transition-[width] motion-safe:duration-700"
          style={{
            width: `${persen}%`,
            backgroundColor: warna,
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            transitionDelay: `${Math.min(urutan, 8) * 25}ms`,
          }}
        />
      </div>
      {keterangan && <p className="mt-1 text-[11px] text-slate-500">{keterangan}</p>}
    </Bungkus>
  );
};

/**
 * Batang bertumpuk dua langkah berurut (aktif / tidak aktif).
 * Ada jarak 2px berwarna permukaan antar potongan — pemisahnya celah, bukan
 * garis tepi.
 */
export const BatangTumpuk = ({ label, aktif, tidakAktif, maks, urutan = 0, onKlik }) => {
  const total = aktif + tidakAktif;
  const lebar = (n) => (maks > 0 ? (n / maks) * 100 : 0);
  const Bungkus = onKlik ? 'button' : 'div';

  return (
    <Bungkus
      type={onKlik ? 'button' : undefined}
      onClick={onKlik}
      title={`${label}: ${total} BUMDes — ${aktif} aktif, ${tidakAktif} tidak aktif`}
      className={`grid w-full grid-cols-[8.5rem_1fr_3.5rem] items-center gap-3 rounded-lg py-1 text-left transition-colors ${
        onKlik ? 'cursor-pointer px-2 -mx-2 hover:bg-slate-50' : ''
      }`}
    >
      <span className="truncate text-xs text-slate-600">{label}</span>
      <span className="flex h-2.5 w-full items-center gap-[2px]">
        <span
          className="h-2.5 rounded-l-[4px] motion-safe:transition-[width] motion-safe:duration-700"
          style={{
            width: `${lebar(aktif)}%`,
            backgroundColor: WARNA_AKTIF,
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            transitionDelay: `${Math.min(urutan, 12) * 20}ms`,
          }}
        />
        <span
          className="h-2.5 rounded-r-[4px] motion-safe:transition-[width] motion-safe:duration-700"
          style={{
            width: `${lebar(tidakAktif)}%`,
            backgroundColor: WARNA_TIDAK_AKTIF,
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            transitionDelay: `${Math.min(urutan, 12) * 20}ms`,
          }}
        />
      </span>
      <span className="text-right text-xs font-semibold tabular-nums text-slate-900">
        {nf.format(total)}
      </span>
    </Bungkus>
  );
};

export const Legenda = ({ butir }) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
    {butir.map((b) => (
      <span key={b.label} className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]" style={{ backgroundColor: b.warna }} />
        <span className="text-xs text-slate-600">
          {b.label}
          {b.nilai !== undefined && (
            <span className="ml-1 font-semibold text-slate-900">{nf.format(b.nilai)}</span>
          )}
        </span>
      </span>
    ))}
  </div>
);

export const Kosong = ({ pesan = 'Tidak ada BUMDes yang cocok dengan filter ini.' }) => (
  <div className="flex flex-col items-center justify-center rounded-lg bg-slate-50 px-6 py-10 text-center">
    <p className="text-sm text-slate-500">{pesan}</p>
  </div>
);
