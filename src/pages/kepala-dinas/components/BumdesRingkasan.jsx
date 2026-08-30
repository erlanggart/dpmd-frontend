// Empat angka kepala halaman Statistik BUMDes, mengikuti irisan filter.
import React from 'react';
import { Building2, CheckCircle2, ScrollText, TrendingUp } from 'lucide-react';
import { EASE, nf, persenDari, useAngkaBergerak, useTampil, WARNA_AKTIF } from './bumdesFormat';

/**
 * Angka dan meterannya baru berjalan saat ubinnya masuk layar, dan berjalan
 * berbarengan: satu gerakan, bukan angka yang sudah selesai di atas meteran
 * yang baru mulai.
 */
const Ubin = ({ icon: Icon, label, nilai, dari, keterangan, tanpaMeteran, urutan = 0 }) => {
  const [ref, terlihat] = useTampil();
  const berjalan = useAngkaBergerak(terlihat ? nilai : 0);
  const persen = terlihat ? persenDari(nilai, dari) : 0;

  return (
    <div
      ref={ref}
      className={`group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03] transition-[opacity,transform,box-shadow,border-color] duration-500 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.07] ${
        terlihat ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      style={{ transitionTimingFunction: EASE, transitionDelay: `${urutan * 70}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-slate-900 group-hover:text-white">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {nf.format(berjalan)}
      </p>

      {!tanpaMeteran && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-1.5 rounded-full motion-safe:transition-[width] motion-safe:duration-[900ms]"
            style={{
              width: `${persen}%`,
              backgroundColor: WARNA_AKTIF,
              transitionTimingFunction: EASE,
              transitionDelay: `${urutan * 70}ms`,
            }}
          />
        </div>
      )}

      <p className="mt-2 text-xs text-slate-500">{keterangan}</p>
    </div>
  );
};

const BumdesRingkasan = ({ ringkasan, totalKeseluruhan }) => {
  const { total, aktif, berbadanHukum, beroperasi } = ringkasan;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Ubin
        icon={Building2}
        urutan={0}
        label="Ditampilkan"
        nilai={total}
        dari={totalKeseluruhan}
        tanpaMeteran={false}
        keterangan={
          total === totalKeseluruhan
            ? 'Seluruh Kabupaten Bogor'
            : `${persenDari(total, totalKeseluruhan)}% dari ${nf.format(totalKeseluruhan)}`
        }
      />
      <Ubin
        icon={CheckCircle2}
        urutan={1}
        label="Aktif"
        nilai={aktif}
        dari={total}
        keterangan={`${persenDari(aktif, total)}% dari yang ditampilkan`}
      />
      <Ubin
        icon={ScrollText}
        urutan={2}
        label="Berbadan hukum"
        nilai={berbadanHukum}
        dari={total}
        keterangan={`${persenDari(berbadanHukum, total)}% dari yang ditampilkan`}
      />
      <Ubin
        icon={TrendingUp}
        urutan={3}
        label="Beromset"
        nilai={beroperasi}
        dari={total}
        keterangan={`${persenDari(beroperasi, total)}% beromset di atas nol`}
      />
    </div>
  );
};

export default BumdesRingkasan;
