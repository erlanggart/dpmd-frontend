// Empat angka kepala halaman Statistik BUMDes.
//
// Keempatnya dihitung dari irisan yang sedang disaring, bukan dari seluruh 416,
// sehingga selalu sejalan dengan grafik dan tabel di bawahnya.
//
// Bukan grafik: satu angka tidak butuh sumbu. Meteran tipis di bawah angka
// hanya menyatakan porsinya terhadap jumlah yang sedang ditampilkan.
import React from 'react';
import { Building2, CheckCircle2, ScrollText, TrendingUp } from 'lucide-react';
import { nf, persenDari, useAngkaBergerak, WARNA_AKTIF } from './bumdesFormat';

const Ubin = ({ icon: Icon, label, nilai, dari, keterangan, tanpaMeteran }) => {
  const berjalan = useAngkaBergerak(nilai);
  const persen = persenDari(nilai, dari);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      {/* Angka pokok memakai angka proporsional, bukan tabular: lebar digit
          yang dipaksa sama membuat angka besar terlihat renggang. */}
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {nf.format(berjalan)}
      </p>

      {!tanpaMeteran && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-1.5 rounded-full motion-safe:transition-[width] motion-safe:duration-700"
            style={{
              width: `${persen}%`,
              backgroundColor: WARNA_AKTIF,
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
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
        label="BUMDes ditampilkan"
        nilai={total}
        dari={totalKeseluruhan}
        tanpaMeteran={false}
        keterangan={
          total === totalKeseluruhan
            ? 'Seluruh BUMDes se-Kabupaten Bogor'
            : `${persenDari(total, totalKeseluruhan)}% dari ${nf.format(totalKeseluruhan)} BUMDes`
        }
      />
      <Ubin
        icon={CheckCircle2}
        label="Berstatus aktif"
        nilai={aktif}
        dari={total}
        keterangan={`${persenDari(aktif, total)}% dari yang ditampilkan · status administratif`}
      />
      <Ubin
        icon={ScrollText}
        label="Terbit sertifikat badan hukum"
        nilai={berbadanHukum}
        dari={total}
        keterangan={`${persenDari(berbadanHukum, total)}% sudah berbadan hukum`}
      />
      <Ubin
        icon={TrendingUp}
        label="Melaporkan omset di atas nol"
        nilai={beroperasi}
        dari={total}
        keterangan={`${persenDari(beroperasi, total)}% — ukuran kegiatan usaha yang sebenarnya`}
      />
    </div>
  );
};

export default BumdesRingkasan;
