// Potongan visual bersama halaman Statistik BUMDes.
// Warna, format angka, dan gerak ada di bumdesFormat.js.
//
// Tiga hal yang membedakannya dari batang biasa:
//  1. Batang tumbuh saat kartunya masuk layar, berjenjang menurut urutan —
//     bukan saat komponennya dipasang, yang berarti selesai sebelum dilihat.
//  2. Setiap tanda punya petunjuk melayang yang mengikuti kursor DAN muncul
//     saat difokus lewat papan ketik. Nilainya tebal, namanya sekunder.
//  3. Sasaran tunjuk lebih lebar dari batangnya, dan yang sedang ditunjuk
//     terangkat sedikit sehingga jelas mana yang sedang dibaca.
import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  WARNA_TUNGGAL, WARNA_AKTIF, WARNA_TIDAK_AKTIF, nf, EASE, useTampil, kurangiGerak,
} from './bumdesFormat';

/* --------------------------------------------------------------- petunjuk -- */

const KartuPetunjuk = ({ x, y, judul, baris }) => createPortal(
  <div
    role="tooltip"
    className="pointer-events-none fixed z-[70] max-w-[16rem] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl bg-slate-900 px-3 py-2 shadow-xl shadow-slate-900/25 ring-1 ring-white/10"
    style={{ left: x, top: y }}
  >
    <p className="truncate text-[11px] font-medium text-slate-400">{judul}</p>
    <div className="mt-1 space-y-0.5">
      {baris.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-0.5 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: b.warna || WARNA_TUNGGAL }}
          />
          <span className="text-sm font-semibold tabular-nums text-white">{b.teks}</span>
        </div>
      ))}
    </div>
  </div>,
  document.body
);

/**
 * Petunjuk melayang untuk satu tanda. Dijepit ke tepi layar supaya tidak
 * terpotong di sisi kanan-kiri, dan ditempatkan dari kotak elemennya saat
 * dipicu papan ketik (fokus tidak punya koordinat kursor).
 */
const usePetunjuk = () => {
  const [isi, setIsi] = useState(null);

  const jepit = (px) => {
    const lebar = typeof window === 'undefined' ? 1024 : window.innerWidth;
    return Math.min(Math.max(px, 96), lebar - 96);
  };

  const arahkan = useCallback((e, data) => {
    setIsi({ x: jepit(e.clientX), y: e.clientY, ...data });
  }, []);

  const dariElemen = useCallback((el, data) => {
    if (!el) return;
    const k = el.getBoundingClientRect();
    setIsi({ x: jepit(k.left + k.width / 2), y: k.top + 4, ...data });
  }, []);

  const sembunyi = useCallback(() => setIsi(null), []);

  return { arahkan, dariElemen, sembunyi, simpul: isi ? <KartuPetunjuk {...isi} /> : null };
};

/* --------------------------------------------------------------- potongan -- */

/**
 * Kartu yang naik pelan saat masuk layar. Halaman ini panjang; tanpa itu
 * seluruh isinya sudah selesai bergerak jauh sebelum sampai ke mata.
 */
export const Kartu = ({ children, className = '' }) => {
  const [ref, terlihat] = useTampil();

  return (
    <section
      ref={ref}
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03] transition-[opacity,transform,box-shadow] duration-500 hover:shadow-md hover:shadow-slate-900/[0.06] ${
        terlihat ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      } ${className}`}
      style={{ transitionTimingFunction: EASE }}
    >
      {children}
    </section>
  );
};

export const Judul = ({ icon: Icon, children, catatan, aksi }) => (
  <div className="mb-4 flex items-start justify-between gap-4">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <h3 className="text-sm font-semibold text-slate-900">{children}</h3>
      </div>
      {catatan && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{catatan}</p>}
    </div>
    {aksi}
  </div>
);

/* ---------------------------------------------------------------- batang -- */

/**
 * Batang horizontal berlabel. Tumbuh dari garis dasar kiri saat kartunya masuk
 * layar, dengan jeda berjenjang menurut urutan sehingga satu kartu terbaca
 * sebagai satu gerakan, bukan sepuluh gerakan acak.
 *
 * Ujung datanya membulat 4px, pangkalnya siku — bentuk itu yang menyatakan
 * "diukur dari sini".
 */
export const Batang = ({
  label, nilai, tampil, maks, warna = WARNA_TUNGGAL,
  keterangan, judulHover, urutan = 0, onKlik, aktifTersorot,
}) => {
  const [ref, terlihat] = useTampil();
  const [disorot, setDisorot] = useState(false);
  const { arahkan, dariElemen, sembunyi, simpul } = usePetunjuk();

  const persen = maks > 0 ? Math.max(nilai > 0 ? 1.5 : 0, (nilai / maks) * 100) : 0;
  const Bungkus = onKlik ? 'button' : 'div';
  const isi = { judul: label, baris: [{ warna, teks: judulHover || tampil }] };
  const jeda = Math.min(urutan, 10) * 45;

  return (
    <Bungkus
      ref={ref}
      type={onKlik ? 'button' : undefined}
      onClick={onKlik}
      onPointerMove={(e) => arahkan(e, isi)}
      onPointerLeave={() => { sembunyi(); setDisorot(false); }}
      onPointerEnter={() => setDisorot(true)}
      onFocus={(e) => { dariElemen(e.currentTarget, isi); setDisorot(true); }}
      onBlur={() => { sembunyi(); setDisorot(false); }}
      className={`group -mx-2 block w-full rounded-lg px-2 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 ${
        onKlik ? 'cursor-pointer' : ''
      } ${disorot || aktifTersorot ? 'bg-slate-50' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`truncate text-sm transition-colors ${
            disorot || aktifTersorot ? 'text-slate-900' : 'text-slate-700'
          }`}
        >
          {label}
        </span>
        <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-slate-900">
          {tampil}
        </span>
      </div>

      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-[4px] bg-slate-100">
        <div
          className="h-2.5 rounded-r-[4px] motion-safe:transition-[width,filter] motion-safe:duration-[900ms]"
          style={{
            width: `${terlihat ? persen : 0}%`,
            backgroundColor: warna,
            filter: disorot || aktifTersorot ? 'brightness(1.25)' : 'none',
            transitionTimingFunction: EASE,
            transitionDelay: `${jeda}ms`,
          }}
        />
      </div>

      {keterangan && <p className="mt-1 text-[11px] text-slate-500">{keterangan}</p>}
      {simpul}
    </Bungkus>
  );
};

/**
 * Batang bertumpuk dua langkah berurut (aktif / tidak aktif).
 * Ada jarak 2px berwarna permukaan antar potongan — pemisahnya celah, bukan
 * garis tepi.
 */
export const BatangTumpuk = ({ label, aktif, tidakAktif, maks, urutan = 0, onKlik }) => {
  const [ref, terlihat] = useTampil();
  const [disorot, setDisorot] = useState(false);
  const { arahkan, dariElemen, sembunyi, simpul } = usePetunjuk();

  const total = aktif + tidakAktif;
  const lebar = (n) => (maks > 0 && terlihat ? (n / maks) * 100 : 0);
  const Bungkus = onKlik ? 'button' : 'div';
  const jeda = Math.min(urutan, 14) * 30;
  const isi = {
    judul: label,
    baris: [
      { warna: WARNA_AKTIF, teks: `${nf.format(aktif)} aktif` },
      { warna: WARNA_TIDAK_AKTIF, teks: `${nf.format(tidakAktif)} tidak aktif` },
    ],
  };

  return (
    <Bungkus
      ref={ref}
      type={onKlik ? 'button' : undefined}
      onClick={onKlik}
      onPointerMove={(e) => arahkan(e, isi)}
      onPointerLeave={() => { sembunyi(); setDisorot(false); }}
      onPointerEnter={() => setDisorot(true)}
      onFocus={(e) => { dariElemen(e.currentTarget, isi); setDisorot(true); }}
      onBlur={() => { sembunyi(); setDisorot(false); }}
      className={`-mx-2 grid w-full grid-cols-[8.5rem_1fr_3.5rem] items-center gap-3 rounded-lg px-2 py-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 ${
        onKlik ? 'cursor-pointer' : ''
      } ${disorot ? 'bg-slate-50' : ''}`}
    >
      <span
        className={`truncate text-xs transition-colors ${
          disorot ? 'font-medium text-slate-900' : 'text-slate-600'
        }`}
      >
        {label}
      </span>
      <span className="flex h-2.5 w-full items-center gap-[2px]">
        <span
          className="h-2.5 rounded-l-[4px] motion-safe:transition-[width,filter] motion-safe:duration-[900ms]"
          style={{
            width: `${lebar(aktif)}%`,
            backgroundColor: WARNA_AKTIF,
            filter: disorot ? 'brightness(1.6)' : 'none',
            transitionTimingFunction: EASE,
            transitionDelay: `${jeda}ms`,
          }}
        />
        <span
          className="h-2.5 rounded-r-[4px] motion-safe:transition-[width,filter] motion-safe:duration-[900ms]"
          style={{
            width: `${lebar(tidakAktif)}%`,
            backgroundColor: WARNA_TIDAK_AKTIF,
            filter: disorot ? 'brightness(1.08)' : 'none',
            transitionTimingFunction: EASE,
            transitionDelay: `${jeda}ms`,
          }}
        />
      </span>
      <span className="text-right text-xs font-semibold tabular-nums text-slate-900">
        {nf.format(total)}
      </span>
      {simpul}
    </Bungkus>
  );
};

/* ------------------------------------------------------------------ pita -- */

/**
 * Pita bertumpuk satu baris untuk komposisi berurut (lengkap → sebagian →
 * belum). Celah 2px berwarna permukaan memisahkan potongan, dan tiap potongan
 * punya petunjuknya sendiri: pada pita setipis ini angka tidak muat di dalam.
 */
export const PitaBertumpuk = ({ segmen, total, tinggi = 14 }) => {
  const [ref, terlihat] = useTampil();
  const [aktif, setAktif] = useState(null);
  const { arahkan, dariElemen, sembunyi, simpul } = usePetunjuk();

  const persen = (n) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div
      ref={ref}
      className="flex w-full gap-[2px] overflow-hidden rounded-[4px]"
      style={{ height: tinggi }}
      role="img"
      aria-label={segmen.map((s) => `${s.label} ${nf.format(s.nilai)}`).join(', ')}
    >
      {segmen.map((s, i) => {
        const isi = {
          judul: s.label,
          baris: [{
            warna: s.warna,
            teks: `${nf.format(s.nilai)} · ${Math.round(persen(s.nilai))}%`,
          }],
        };
        return (
          <button
            key={s.id || s.label}
            type="button"
            tabIndex={s.nilai > 0 ? 0 : -1}
            onClick={s.onKlik}
            onPointerMove={(e) => { arahkan(e, isi); setAktif(i); }}
            onPointerLeave={() => { sembunyi(); setAktif(null); }}
            onFocus={(e) => { dariElemen(e.currentTarget, isi); setAktif(i); }}
            onBlur={() => { sembunyi(); setAktif(null); }}
            className={`h-full outline-none transition-[width,filter,opacity] duration-[900ms] focus-visible:ring-2 focus-visible:ring-slate-900 ${
              s.onKlik ? 'cursor-pointer' : 'cursor-default'
            } ${i === 0 ? 'rounded-l-[4px]' : ''} ${i === segmen.length - 1 ? 'rounded-r-[4px]' : ''}`}
            style={{
              width: `${terlihat ? persen(s.nilai) : 0}%`,
              backgroundColor: s.warna,
              filter: aktif === i ? 'brightness(1.3)' : 'none',
              opacity: aktif === null || aktif === i ? 1 : 0.55,
              transitionTimingFunction: EASE,
              transitionDelay: `${i * 90}ms`,
            }}
          />
        );
      })}
      {simpul}
    </div>
  );
};

/* ----------------------------------------------------------------- cincin -- */

const KELILING = 2 * Math.PI * 52;

/**
 * Cincin proporsi untuk SATU angka utama — bagian dari keseluruhan, bukan
 * perbandingan antar kategori (untuk itu batang selalu lebih terbaca).
 *
 * Busurnya menggambar dirinya sendiri saat masuk layar; angka di tengahnya
 * ikut berjalan, jadi gerakannya satu, bukan dua yang tak sinkron.
 */
export const Cincin = ({ nilai, total, warna = WARNA_AKTIF, label, tengah, bawah }) => {
  const [ref, terlihat] = useTampil();
  const persen = total > 0 ? (nilai / total) * 100 : 0;
  const isi = terlihat || kurangiGerak() ? persen : 0;

  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative">
        <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="12" />
          <circle
            cx="60" cy="60" r="52" fill="none"
            stroke={warna}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={KELILING}
            strokeDashoffset={KELILING - (KELILING * isi) / 100}
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-[1100ms]"
            style={{ transitionTimingFunction: EASE }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight text-slate-900">{tengah}</span>
          {bawah && <span className="mt-0.5 text-[11px] text-slate-500">{bawah}</span>}
        </div>
      </div>
      {label && <p className="mt-2 text-center text-xs text-slate-500">{label}</p>}
    </div>
  );
};

/* --------------------------------------------------------------- legenda -- */

export const Legenda = ({ butir }) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
    {butir.map((b) => (
      <span key={b.label} className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]"
          style={{ backgroundColor: b.warna }}
        />
        <span className="text-xs text-slate-600">
          {b.label}
          {b.nilai !== undefined && (
            <span className="ml-1 font-semibold tabular-nums text-slate-900">
              {nf.format(b.nilai)}
            </span>
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
