// Lencana status dan kelas BUMDes.
//
// Dipisah supaya tabel direktori dan modal detail memakai lencana yang sama —
// warna dan kata yang berbeda untuk hal yang sama membuat pembaca mengira
// datanya berbeda.
//
// Ini lencana STATUS (ikon + kata), bukan warna seri grafik: maknanya dibawa
// tulisannya, warnanya hanya mempercepat pemindaian.
import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { PERINGKAT_KOSONG, isAktif, peringkatResmi } from './bumdesFilter';

const KELAS_PERINGKAT = {
  Maju: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Berkembang: 'bg-sky-50 text-sky-700 ring-sky-200',
  Pemula: 'bg-amber-50 text-amber-700 ring-amber-200',
  Perintis: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export const LencanaStatus = ({ status }) =>
  isAktif(status) ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle2 className="h-3 w-3" /> Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
      <XCircle className="h-3 w-3" /> Tidak Aktif
    </span>
  );

/**
 * Kelas resmi, selalu dari penilaian 2024 — sama dengan grafik dan penyaring.
 * Penilaian 2026 masih berjalan dan berbeda pada 97 BUMDes; menampilkannya di
 * sini akan membuat baris hasil filter "Maju" tertulis "Berkembang".
 */
export const LencanaPeringkat = ({ item }) => {
  const kunci = peringkatResmi(item);
  if (kunci === PERINGKAT_KOSONG) return <span className="text-xs text-slate-400">—</span>;
  const kelas = KELAS_PERINGKAT[kunci] || 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${kelas}`}>
      {kunci}
    </span>
  );
};
