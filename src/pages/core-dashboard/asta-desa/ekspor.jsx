/**
 * Tombol unduh Excel/PDF untuk tab Demografi dan Data Sensus.
 *
 * Keadaannya datang dari `usePengekspor`; yang di sini hanya penampakannya.
 * Pemisahan ini bukan selera: aturan react-refresh menolak satu berkas yang
 * mengekspor komponen sekaligus fungsi biasa, dan pemuatan-ulang-panas mati
 * untuk seluruh berkas begitu dilanggar.
 */

import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

const NADA = {
  proses: { kelas: 'border-slate-200 bg-slate-50 text-slate-600', Ikon: Loader2, putar: true },
  sukses: { kelas: 'border-emerald-200 bg-emerald-50 text-emerald-800', Ikon: CheckCircle2 },
  tunggu: { kelas: 'border-amber-200 bg-amber-50 text-amber-900', Ikon: Clock },
  galat: { kelas: 'border-rose-200 bg-rose-50 text-rose-900', Ikon: AlertTriangle }
};

const kelasTombol = (utama) =>
  `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
    utama
      ? 'bg-slate-900 text-white hover:bg-slate-800'
      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`;

/**
 * Dua tombol unduh beserta baris keadaannya.
 *
 * `alasanNonaktif` wajib diisi setiap kali tombolnya mati. Tombol mati tanpa
 * alasan yang terbaca adalah cara tercepat membuat orang menyimpulkan
 * fiturnya rusak — dan di halaman ini sebab yang paling sering adalah
 * penyusunan di server yang belum selesai, yang memang akan selesai sendiri.
 */
export const TombolEkspor = ({
  pengekspor,
  onExcel,
  onPdf,
  nonaktif = false,
  alasanNonaktif = null,
  keterangan = null
}) => {
  const { sibuk, pesan, tertunda, jalankan, paksaUlang, cobaLagi } = pengekspor;
  const mati = nonaktif || Boolean(sibuk);
  const nada = pesan ? NADA[pesan.nada] : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => jalankan('excel', onExcel)}
          disabled={mati}
          title={nonaktif ? alasanNonaktif || undefined : 'Unduh sebagai Excel (.xlsx)'}
          className={kelasTombol(true)}
        >
          {sibuk === 'excel' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-3.5 w-3.5" />
          )}
          Excel
        </button>
        <button
          type="button"
          onClick={() => jalankan('pdf', onPdf)}
          disabled={mati}
          title={nonaktif ? alasanNonaktif || undefined : 'Unduh sebagai PDF'}
          className={kelasTombol(false)}
        >
          {sibuk === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          PDF
        </button>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
          <Download className="h-3 w-3" />
          {keterangan || 'Ekspor data yang sedang tampil'}
        </span>
      </div>

      {nonaktif && alasanNonaktif && (
        <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
          <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          {alasanNonaktif}
        </p>
      )}

      {pesan && nada && (
        <div className={`flex flex-wrap items-start gap-2 rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${nada.kelas}`}>
          <nada.Ikon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${nada.putar ? 'animate-spin' : ''}`} />
          <span className="min-w-0 flex-1">{pesan.teks}</span>
          {pesan.nada === 'tunggu' && tertunda && (
            <span className="flex flex-shrink-0 gap-1.5">
              <button
                type="button"
                onClick={cobaLagi}
                disabled={Boolean(sibuk)}
                className="rounded-md bg-amber-900/10 px-2 py-1 font-semibold text-amber-900 transition-colors hover:bg-amber-900/15 disabled:opacity-45"
              >
                Coba lagi
              </button>
              <button
                type="button"
                onClick={paksaUlang}
                disabled={Boolean(sibuk)}
                className="rounded-md px-2 py-1 font-semibold text-amber-900 underline underline-offset-2 transition-colors hover:bg-amber-900/10 disabled:opacity-45"
              >
                Ekspor potret ini
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
