// Komponen bersama beranda ringkasan dan Rapor Wilayah.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { eksporExcel } from '../../../utils/eksporTabel';

import { angka, warnaRasio } from './format';

export const BarMini = ({ rasio, className = 'h-1.5' }) => (
  <div className={`overflow-hidden rounded-full bg-slate-100 ${className}`}>
    <div
      className={`h-full rounded-full ${warnaRasio(rasio)}`}
      style={{ width: `${Math.min(100, Math.max(0, rasio))}%` }}
    />
  </div>
);

const NADA = { netral: 'text-slate-900', baik: 'text-emerald-700', waspada: 'text-amber-700' };

export const KartuIndikator = ({ ikon: Ikon, label, nilai, sub, rasio, ke, nada = 'netral', title }) => {
  const isi = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        {Ikon && <Ikon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${NADA[nada] || NADA.netral}`}>{nilai}</p>
      {rasio !== undefined && rasio !== null && (
        <div className="mt-2">
          <BarMini rasio={rasio} />
        </div>
      )}
      {sub && <p className="mt-2 text-xs leading-relaxed text-slate-500">{sub}</p>}
      {ke && <ArrowUpRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-slate-300 group-hover:text-slate-600" aria-hidden="true" />}
    </>
  );
  const kelas = 'relative break-inside-avoid rounded-2xl border border-slate-200 bg-white p-4';
  if (!ke) return <div className={kelas} title={title}>{isi}</div>;
  return (
    <Link
      to={ke}
      title={title}
      className={`group ${kelas} block transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30`}
    >
      {isi}
    </Link>
  );
};

const BATAS_CHIP = 24;

const ItemPerhatian = ({ item, keRapor }) => {
  const [buka, setBuka] = useState(false);
  const [semua, setSemua] = useState(false);
  const daftar = semua ? item.desa : item.desa.slice(0, BATAS_CHIP);
  const unduh = () =>
    eksporExcel({
      kolom: [
        { label: 'Kecamatan', nilai: (d) => d.kecamatan },
        { label: 'Desa', nilai: (d) => d.nama },
      ],
      baris: item.desa,
      namaBerkas: `perlu-perhatian-${item.kunci}`,
      namaSheet: 'Perlu perhatian',
    });
  return (
    <li>
      <button
        type="button"
        aria-expanded={buka}
        onClick={() => setBuka((b) => !b)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900/30"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900">{item.judul}</span>
          {item.keterangan && <span className="block text-xs text-slate-500">{item.keterangan}</span>}
        </span>
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-rose-700 ring-1 ring-rose-200">
          {angka(item.desa.length)}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${buka ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {buka && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {daftar.map((d) => (
              <Link
                key={d.id}
                to={keRapor(d.id)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30"
              >
                {d.nama} · Kec. {d.kecamatan}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
            {!semua && item.desa.length > BATAS_CHIP && (
              <button type="button" onClick={() => setSemua(true)} className="text-xs font-medium text-slate-700 underline underline-offset-2">
                Tampilkan semua ({angka(item.desa.length)})
              </button>
            )}
            <button
              type="button"
              onClick={unduh}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" /> Unduh Excel
            </button>
          </div>
        </div>
      )}
    </li>
  );
};

export const PanelPerhatian = ({ perhatian, keRapor, judul = 'Perlu perhatian' }) => {
  const ada = [...(perhatian || [])].filter((p) => p.desa?.length > 0).sort((a, b) => b.desa.length - a.desa.length);
  const beres = (perhatian || []).filter((p) => !p.desa?.length);
  return (
    <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">{judul}</h2>
      {ada.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-6 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Tidak ada yang perlu ditindak.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {ada.map((p) => (
            <ItemPerhatian key={p.kunci} item={p} keRapor={keRapor} />
          ))}
        </ul>
      )}
      {ada.length > 0 && beres.length > 0 && (
        <p className="flex items-start gap-2 border-t border-slate-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Sudah beres: {beres.map((p) => p.judul).join(', ')}</span>
        </p>
      )}
    </section>
  );
};
