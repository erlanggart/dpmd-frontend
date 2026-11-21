/**
 * Kepingan tampilan yang dipakai bersama seluruh tab Asta Desa.
 *
 * Dikumpulkan di satu berkas supaya enam tab tidak masing-masing menemukan
 * ulang bentuk kartu, keadaan kosong, dan keadaan galatnya sendiri — perbedaan
 * kecil antar tab itulah yang membuat sebuah halaman terasa ditambal, bukan
 * dirancang.
 */

import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { angka, persen } from './warna';

const EASE = [0.22, 1, 0.36, 1];
const BAYANGAN = 'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.10)]';

/**
 * Angka count-up. Pertama kali terlihat beranimasi dari 0; pembaruan berikutnya
 * dari angka yang sedang tampil (data diperbarui otomatis tiap menit).
 */
export const AngkaBergerak = ({ nilai, className = '' }) => {
  const ref = useRef(null);
  const terlihat = useInView(ref, { once: true });
  const kurangiGerak = useReducedMotion();
  const tampilRef = useRef(0);
  const [tampil, setTampil] = useState(0);
  useEffect(() => {
    const tujuan = Number(nilai) || 0;
    if (!terlihat) return undefined;
    if (kurangiGerak) {
      tampilRef.current = tujuan;
      setTampil(tujuan);
      return undefined;
    }
    const kendali = animate(tampilRef.current, tujuan, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (v) => {
        tampilRef.current = v;
        setTampil(v);
      }
    });
    return () => kendali.stop();
  }, [nilai, terlihat, kurangiGerak]);
  return (
    <span ref={ref} className={className}>
      {angka(Math.round(tampil))}
    </span>
  );
};

const BlokKerangka = ({ className = '' }) => {
  const kurangiGerak = useReducedMotion();
  return (
    <div className={`relative overflow-hidden rounded-[20px] bg-slate-100 ${className}`}>
      {!kurangiGerak && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.4, ease: 'linear', repeat: Infinity }}
        />
      )}
    </div>
  );
};

/** Kerangka pemuatan satu tab: deret kartu angka dan dua panel. */
export const Kerangka = ({ pesan }) => (
  <div className="space-y-4">
    {pesan && (
      <div
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white px-4 py-3"
      >
        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-sky-500" />
        <p className="text-sm text-slate-600">{pesan}</p>
      </div>
    )}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <BlokKerangka key={i} className="h-28" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <BlokKerangka className="h-80 xl:col-span-2" />
      <BlokKerangka className="h-80" />
    </div>
  </div>
);

/** Bingkai putih standar: judul, keterangan, isi. */
export const Panel = ({ judul, keterangan, aksi, children, className = '', padat = false }) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.45, ease: EASE }}
    className={`overflow-hidden rounded-[20px] border border-slate-200/70 bg-white ${BAYANGAN} ${className}`}
  >
    {(judul || aksi) && (
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pb-1 pt-5">
        <div className="min-w-0">
          {judul && <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{judul}</h2>}
          {keterangan && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{keterangan}</p>}
        </div>
        {aksi && <div className="flex flex-shrink-0 items-center gap-2">{aksi}</div>}
      </header>
    )}
    <div className={padat ? '' : 'p-4 sm:p-5'}>{children}</div>
  </motion.section>
);

/**
 * Kartu satu angka.
 *
 * Angkanya ditulis penuh, tidak diringkas. Halaman ini dipakai untuk melapor,
 * dan "7,8 rb keluarga" bukan angka yang bisa dimasukkan ke laporan.
 */
export const KartuAngka = ({ icon: Icon, label, nilai, satuan, keterangan, warna = '#2a78d6', onClick }) => {
  // Dengan `onClick` kartu menjadi tombol (mis. membuka rincian per wilayah).
  const Wadah = onClick ? motion.button : 'div';
  const propsKlik = onClick
    ? {
        type: 'button',
        onClick,
        title: 'Klik untuk rincian per wilayah',
        whileHover: { y: -3 },
        whileTap: { scale: 0.98 }
      }
    : {};
  return (
    <Wadah
      {...propsKlik}
      className={`relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-4 text-left sm:p-5 ${BAYANGAN} ${
        onClick
          ? 'group w-full cursor-pointer transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_18px_40px_-16px_rgba(15,23,42,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400'
          : ''
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl"
        style={{ backgroundColor: `${warna}26` }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        {Icon && (
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: `linear-gradient(135deg, ${warna}2e, ${warna}0d)`, color: warna }}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="relative mt-2.5 text-[26px] font-semibold tracking-tight text-slate-900 tabular-nums">
        {typeof nilai === 'number' ? <AngkaBergerak nilai={nilai} /> : nilai ?? '—'}
        {satuan && <span className="ml-1 text-sm font-medium text-slate-400">{satuan}</span>}
      </p>
      {keterangan && <p className="relative mt-1 text-xs leading-relaxed text-slate-500">{keterangan}</p>}
      {onClick && (
        <p className="relative mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
          Lihat rincian
          <ArrowRight
            className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: warna }}
          />
        </p>
      )}
    </Wadah>
  );
};

/**
 * Daftar batang mendatar.
 *
 * Bentuk ini dipilih untuk peringkat berlabel panjang (nama kecamatan, jenis
 * pekerjaan): batang tegak memaksa labelnya miring atau terpotong, dan label
 * miring adalah cara tercepat membuat tabel peringkat berhenti terbaca.
 * Angkanya ditulis di ujung tiap batang — identitas tidak pernah bersandar pada
 * warna saja.
 */
// `onPilih(baris)` opsional: tiap baris menjadi tombol (rincian per wilayah).
export const DaftarBatang = ({ baris, total, maks, warna = '#2a78d6', batas = 10, tampilkanPersen = true, onPilih }) => {
  const tertinggi = maks || Math.max(1, ...baris.map((b) => b.total));
  const tampil = batas ? baris.slice(0, batas) : baris;
  const warnaBaris = (b, i) => (typeof warna === 'function' ? warna(b, i) : warna);

  if (!tampil.length) return <Kosong pesan="Belum ada data untuk ditampilkan." />;

  return (
    <ol className={onPilih ? 'space-y-1.5' : 'space-y-3'}>
      {tampil.map((b, i) => (
        <li key={b.label ?? i}>
          <BarisBatang onPilih={onPilih ? () => onPilih(b) : null}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] font-medium text-slate-700" title={b.label}>
              {b.label}
            </span>
            <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-slate-900">
              {angka(b.total)}
              {tampilkanPersen && total ? (
                <span className="ml-1.5 font-medium text-slate-400">{persen(b.total, total)}</span>
              ) : null}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${warnaBaris(b, i)}, ${warnaBaris(b, i)}b3)` }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, (b.total / tertinggi) * 100)}%` }}
              transition={{ duration: 0.7, delay: Math.min(i, 10) * 0.04, ease: EASE }}
            />
          </div>
          </BarisBatang>
        </li>
      ))}
    </ol>
  );
};

const BarisBatang = ({ onPilih, children }) =>
  onPilih ? (
    <button
      type="button"
      onClick={onPilih}
      title="Klik untuk rincian per wilayah"
      className="block w-full rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
    >
      {children}
    </button>
  ) : (
    children
  );

export const Memuat = ({ pesan = 'Memuat data Asta Desa…', tinggi = 'py-16' }) => (
  <div className={`flex flex-col items-center justify-center ${tinggi} text-center`}>
    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
    <p className="mt-3 text-sm text-slate-500">{pesan}</p>
  </div>
);

export const Kosong = ({ pesan = 'Tidak ada data.', ikon: Ikon = Inbox }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
      <Ikon className="h-6 w-6" />
    </span>
    <p className="mt-3 max-w-sm text-sm text-slate-500">{pesan}</p>
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
    <p className="mt-1 text-xs text-slate-400">Halaman ini mencoba lagi sendiri — tidak perlu dimuat ulang.</p>
    {onUlang && (
      <button
        type="button"
        // 'segar', bukan paksa: mencoba lagi cukup menanyai server ulang.
        // Paksa menyuruh server menyusuri ulang ratusan halaman ASTA DESA,
        // dan itu tidak membuat permintaan yang ditolak menjadi diterima.
        onClick={() => onUlang('segar')}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Coba lagi
      </button>
    )}
  </div>
);

/**
 * Pita "data tersimpan".
 *
 * Tampil saat angka di halaman berasal dari salinan terakhir yang berhasil,
 * bukan dari ambil yang baru — karena server sedang menolak, atau karena
 * pembaruannya masih berjalan. Angka lama tanpa keterangan itu menyesatkan;
 * angka lama dengan jamnya tetap bisa dipakai.
 */
export const PitaBasi = ({ basi }) => {
  if (!basi) return null;
  const jam = new Date(basi.pada).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
  const memperbarui = basi.memperbarui;
  return (
    <div
      role="status"
      className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 text-xs leading-relaxed ${
        memperbarui ? 'border-slate-200 bg-white text-slate-600' : 'border-amber-200 bg-amber-50/70 text-amber-900'
      }`}
    >
      {memperbarui ? (
        <Loader2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin text-slate-400" />
      ) : (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
      )}
      <p>
        {memperbarui ? (
          <>Menampilkan data tersimpan ({jam}) sambil memperbarui…</>
        ) : (
          <>
            <span className="font-semibold">Menampilkan data tersimpan ({jam}).</span>{' '}
            {basi.pesan ? `${basi.pesan} ` : ''}Halaman ini memperbarui sendiri begitu server kembali menjawab.
          </>
        )}
      </p>
    </div>
  );
};

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
// `warnaSeri` opsional: { namaSeri: warna } untuk seri berisian gradien.
export const Tooltip1 = ({ active, payload, label, satuan = '', warnaSeri }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-slate-900/90 px-3 py-2 text-white shadow-xl backdrop-blur">
      {label !== undefined && (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">{label}</p>
      )}
      <div className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <p key={p.name} className="flex items-center gap-2 text-xs">
            {/* Isian gradien (`url(#…)`) bukan warna CSS; jatuh ke warna bawaan baris. */}
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  [warnaSeri?.[p.name], p.color, p.fill, p.payload?.warna].find((w) => w && !String(w).startsWith('url(')) ||
                  '#94a3b8'
              }}
            />
            <span className="text-slate-300">{p.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-white">
              {angka(Math.abs(p.value))} {satuan}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
};
