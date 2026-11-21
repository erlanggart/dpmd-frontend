/**
 * Halaman rincian per wilayah untuk satu titik data di tab Demografi.
 *
 * Apa pun yang diklik — kartu angka, batang piramida, baris pendidikan, nilai
 * kolom sensus — dijabarkan per kecamatan, turun ke per desa, lalu ke daftar
 * nama warga di balik angkanya. Sumbernya muatan `/demografi/wilayah?ringan=1`
 * yang sama dengan kartu (dibaca langsung dari database ASTA DESA), diambil
 * dengan mode 'cache' sehingga berpindah wilayah tidak menyentuh server.
 *
 * MENGAPA HALAMAN, BUKAN POP-UP. Pop-up selebar 2xl memaksa tiga tingkat
 * (kecamatan -> desa -> nama) bergantian di kotak yang sama, sehingga pembaca
 * kehilangan daftar desa begitu membuka nama. Di halaman, daftar wilayah dan
 * daftar nama berdampingan, dan seluruh keadaan ada di URL: tombol Kembali
 * peramban naik satu tingkat, dan tautannya bisa dikirim ke rekan.
 *
 * `pemilih` (parameter `p`, JSON) adalah deskriptor biasa:
 *   { tipe: 'keluarga' }                              kepala keluarga / keluarga
 *   { tipe: 'anggota' }                               anggota tercatat
 *   { tipe: 'usia', kelompok: ['0–4', …], sisi }      sisi: 'L' | 'P' | undefined
 *   { tipe: 'sifat', dim, label }                     dim: jk|pendidikan|hubungan|disabilitas|pekerjaan
 *   { tipe: 'kolom', kunci, nilai }                   nilai: label mentah, atau KOSONG
 *   { tipe: 'angka', kunci }                          kolom sensus berjenis angka
 * ditambah { judul, sub } untuk kepala halaman.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Layers, MapPin, MousePointerClick, Search, TrendingDown, TrendingUp, Users } from 'lucide-react';
import PageHeader from '../../../components/statistik/PageHeader';
import { LEBAR_CORE } from '../lebarHalaman';
import { ambilSekali } from './useAstaDesa';
import { KOSONG } from './useRincianWilayah';
import DaftarNamaWarga from './DaftarNamaWarga';
import { Galat, Kerangka, Kosong, Panel } from './ui';
import { angka, persen } from './warna';

// Tipe yang punya daftar nama. 'kolom' = keluarga dengan nilai kolom sensus itu
// (dibaca langsung dari database ASTA DESA); 'angka' tidak, karena tiap nilai
// angka bukan kategori yang bisa diklik.
const TIPE_NAMA = ['keluarga', 'anggota', 'usia', 'sifat', 'kolom'];

const EASE = [0.22, 1, 0.36, 1];
const BAYANGAN = 'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.10)]';

const cocok = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

const bacaPemilih = (teks) => {
  try {
    const p = JSON.parse(teks || 'null');
    return p && typeof p === 'object' && typeof p.tipe === 'string' ? p : null;
  } catch {
    return null;
  }
};

/** Ubah deskriptor menjadi fungsi wilayah -> { nilai, penyebut } (null = tak terlacak). */
const buatPenilai = (pemilih, muatan) => {
  const ag = muatan.anggota || {};
  switch (pemilih.tipe) {
    case 'keluarga':
      return (w) => ({ nilai: w.total_keluarga, penyebut: null });
    case 'anggota':
      return (w) => (w.anggota ? { nilai: w.anggota.total, penyebut: null } : null);
    case 'usia': {
      const idx = (ag.kelompok_usia || [])
        .map((l, i) => ((pemilih.kelompok || []).some((k) => cocok(k, l)) ? i : -1))
        .filter((i) => i >= 0);
      const kol = pemilih.sisi === 'L' ? 0 : pemilih.sisi === 'P' ? 1 : 3;
      return (w) =>
        w.anggota
          ? { nilai: idx.reduce((a, i) => a + (w.anggota.usia[i]?.[kol] || 0), 0), penyebut: w.anggota.total }
          : null;
    }
    case 'sifat': {
      const i = (ag.label?.[pemilih.dim] || []).findIndex((l) => cocok(l, pemilih.label));
      if (i < 0) return null;
      return (w) => (w.anggota ? { nilai: w.anggota[pemilih.dim]?.[i] || 0, penyebut: w.anggota.total } : null);
    }
    case 'kolom': {
      const iKolom = (muatan.kolom || []).findIndex((k) => k.kunci === pemilih.kunci);
      if (iKolom < 0) return null;
      const def = muatan.kolom[iKolom];
      if (pemilih.nilai === KOSONG) {
        return (w) => {
          const sel = w.kolom?.[iKolom];
          return { nilai: w.total_keluarga - (sel?.t || 0), penyebut: w.total_keluarga };
        };
      }
      const j = (def.nilai || []).findIndex((l) => cocok(l, pemilih.nilai));
      if (j < 0) return null;
      const ganda = def.jenis === 'pilihan_ganda';
      return (w) => {
        const sel = w.kolom?.[iKolom];
        return { nilai: sel?.n?.[j] || 0, penyebut: ganda ? w.total_keluarga : sel?.t || 0 };
      };
    }
    default:
      return null;
  }
};

const BarisAngka = ({ w, iKolom, onTurun }) => {
  const sel = w.kolom?.[iKolom];
  const s = sel?.s || {};
  const f = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('id-ID', { maximumFractionDigits: 1 }));
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-3 text-[13px] font-medium text-slate-700">
        {onTurun ? (
          <button type="button" onClick={onTurun} className="inline-flex items-center gap-1 text-left hover:text-slate-950 hover:underline">
            {w.desa || w.kecamatan} <ChevronRight className="h-3 w-3 text-slate-400" />
          </button>
        ) : (
          w.desa || w.kecamatan
        )}
      </td>
      <td className="py-2.5 pr-3 text-right text-[13px] tabular-nums text-slate-500">{angka(sel?.t || 0)}</td>
      <td className="py-2.5 pr-3 text-right text-[13px] font-semibold tabular-nums text-slate-900">{f(s.rata_rata)}</td>
      <td className="py-2.5 pr-3 text-right text-[13px] tabular-nums text-slate-700">{f(s.median)}</td>
      <td className="py-2.5 text-right text-[13px] tabular-nums text-slate-500">
        {f(s.min)}–{f(s.maks)}
      </td>
    </tr>
  );
};

/** Satu baris wilayah: peringkat, nama, batang, angka. Seluruh baris adalah tombol. */
const BarisWilayah = ({ b, i, tertinggi, aktif, aksi, onKlik, judul }) => {
  const nama = b.w.desa || b.w.kecamatan;
  const lebar = b.nilai ? Math.max(2, (b.nilai / tertinggi) * 100) : 0;
  return (
    <li>
      <button
        type="button"
        onClick={onKlik || undefined}
        disabled={!onKlik}
        title={judul}
        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-default ${
          aktif ? 'bg-slate-900 text-white shadow-sm' : onKlik ? 'hover:bg-slate-50' : ''
        }`}
      >
        <span
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums ${
            aktif ? 'bg-white/15 text-white' : i < 3 ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {i + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className={`truncate text-[13px] font-medium ${aktif ? 'text-white' : 'text-slate-800'}`}>{nama}</span>
            <span className={`flex-shrink-0 text-[13px] font-semibold tabular-nums ${aktif ? 'text-white' : 'text-slate-900'}`}>
              {b.nilai === null ? '—' : angka(b.nilai)}
              {b.nilai !== null && b.penyebut ? (
                <span className={`ml-1.5 font-medium ${aktif ? 'text-white/60' : 'text-slate-400'}`}>{persen(b.nilai, b.penyebut)}</span>
              ) : null}
            </span>
          </span>
          <span className={`mt-1.5 block h-1.5 overflow-hidden rounded-full ${aktif ? 'bg-white/15' : 'bg-slate-100'}`}>
            <motion.span
              className={`block h-full rounded-full ${aktif ? 'bg-white' : 'bg-gradient-to-r from-sky-600 to-sky-400'}`}
              initial={{ width: 0 }}
              animate={{ width: `${lebar}%` }}
              transition={{ duration: 0.6, delay: Math.min(i, 12) * 0.025, ease: EASE }}
            />
          </span>
        </span>
        {aksi && <span className="flex-shrink-0">{aksi(aktif)}</span>}
      </button>
    </li>
  );
};

const PilihUrut = ({ urut, opsi, onUbah }) => (
  <div className="inline-flex rounded-xl bg-slate-100 p-1 text-[11px] font-semibold">
    {opsi.map(([k, l]) => (
      <button key={k} type="button" onClick={() => onUbah(k)} className="relative rounded-lg px-2.5 py-1">
        {urut === k && (
          <motion.span
            layoutId="rincian-urut"
            className="absolute inset-0 rounded-lg bg-white shadow-sm"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          />
        )}
        <span className={`relative ${urut === k ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{l}</span>
      </button>
    ))}
  </div>
);

const DaftarSorotan = ({ ikon: Ikon, judul, warna, baris, onPilih }) => (
  <div>
    <p className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${warna}`}>
      <Ikon className="h-3.5 w-3.5" /> {judul}
    </p>
    <ol className="space-y-0.5">
      {baris.map((b) => (
        <li key={b.w.desa ? `${b.w.kecamatan}/${b.w.desa}` : b.w.kecamatan}>
          <button
            type="button"
            onClick={onPilih ? () => onPilih(b) : undefined}
            disabled={!onPilih}
            className="flex w-full items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <span className="truncate text-slate-700">{b.w.desa || b.w.kecamatan}</span>
            <span className="flex-shrink-0 font-semibold tabular-nums text-slate-900">
              {b.penyebut ? persen(b.nilai, b.penyebut) : angka(b.nilai)}
              {b.penyebut ? <span className="ml-1.5 font-medium text-slate-400">{angka(b.nilai)}</span> : null}
            </span>
          </button>
        </li>
      ))}
    </ol>
  </div>
);

const HalamanRincian = () => {
  const [sp, setSp] = useSearchParams();
  const { pathname } = useLocation();
  const base = pathname.replace(/\/rincian\/?$/, '');

  const teksP = sp.get('p');
  const pemilih = useMemo(() => bacaPemilih(teksP), [teksP]);
  const turun = sp.get('kec') || null;
  const desaDipilih = turun ? sp.get('desa') || null : null;
  const urut = ['persen', 'nama'].includes(sp.get('urut')) ? sp.get('urut') : 'jumlah';
  // Hanya query string: alamat kembali tidak boleh membawa ke luar halaman Asta Desa.
  const kembaliMentah = sp.get('kembali') || '';
  const kembali = kembaliMentah.startsWith('?') ? kembaliMentah : '?tab=demografi';

  const [cari, setCari] = useState('');
  const [muatan, setMuatan] = useState(null);
  const [galat, setGalat] = useState(null);
  const [ulangKe, setUlangKe] = useState(0);
  const panelNama = useRef(null);

  const bisaNama = Boolean(pemilih && TIPE_NAMA.includes(pemilih.tipe));

  /** Ubah keadaan di URL. Turun/naik tingkat menambah riwayat; urutan tidak. */
  const ubah = (perubahan, { ganti = false } = {}) =>
    setSp(
      (lama) => {
        const n = new URLSearchParams(lama);
        Object.entries(perubahan).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
        return n;
      },
      { replace: ganti }
    );

  useEffect(() => {
    let hidup = true;
    setGalat(null);
    ambilSekali('/demografi/wilayah', { ringan: 1 }, ulangKe ? 'segar' : 'cache')
      .then((b) => hidup && setMuatan(b.data))
      .catch((e) => hidup && setGalat(e.message || 'Gagal memuat rincian wilayah.'));
    return () => {
      hidup = false;
    };
  }, [ulangKe]);

  // Pindah tingkat = daftar baru; kata kunci lama hanya akan menyembunyikannya.
  useEffect(() => setCari(''), [turun]);

  // Di layar sempit daftar nama ada di bawah daftar desa: bawa ke sana.
  useEffect(() => {
    if (desaDipilih && window.matchMedia?.('(max-width: 1023px)').matches) {
      panelNama.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [desaDipilih]);

  const isi = useMemo(() => {
    if (!muatan || !pemilih) return null;
    const wilayah = turun
      ? (muatan.per_desa || []).filter((w) => cocok(w.kecamatan, turun))
      : muatan.per_kecamatan || [];

    if (pemilih.tipe === 'angka') {
      const iKolom = (muatan.kolom || []).findIndex((k) => k.kunci === pemilih.kunci);
      return { angka: true, iKolom, wilayah };
    }

    const penilai = buatPenilai(pemilih, muatan);
    if (!penilai) return { takDikenal: true };

    const baris = wilayah.map((w) => ({ w, ...(penilai(w) || { nilai: null, penyebut: null }) }));
    const terlacak = baris.filter((b) => b.nilai !== null);
    const totalNilai = terlacak.reduce((a, b) => a + b.nilai, 0);
    const adaPenyebut = terlacak.some((b) => b.penyebut !== null);
    const totalPenyebut = terlacak.reduce((a, b) => a + (b.penyebut || 0), 0);

    // Sorotan: menurut persentase bila ada penyebutnya (wilayah besar tidak
    // selalu menang), selain itu menurut jumlah.
    const ukuran = (b) => (adaPenyebut ? b.nilai / b.penyebut : b.nilai);
    const peringkat = terlacak.filter((b) => !adaPenyebut || b.penyebut).sort((a, b) => ukuran(b) - ukuran(a));
    return {
      baris,
      totalNilai,
      adaPenyebut,
      totalPenyebut,
      jumlahWilayah: terlacak.length,
      takTerlacak: baris.length - terlacak.length,
      tertinggi: peringkat.slice(0, 5),
      terendah: peringkat.length > 5 ? peringkat.slice(-5).reverse() : []
    };
  }, [muatan, pemilih, turun]);

  const barisTampil = useMemo(() => {
    if (!isi?.baris) return [];
    const q = cari.trim().toLowerCase();
    const rasio = (b) => (b.penyebut ? b.nilai / b.penyebut : -1);
    return isi.baris
      .filter((b) => !q || (b.w.desa || b.w.kecamatan).toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.nilai === null) return 1;
        if (b.nilai === null) return -1;
        if (urut === 'persen' && isi.adaPenyebut) return rasio(b) - rasio(a);
        if (urut === 'nama') return (a.w.desa || a.w.kecamatan).localeCompare(b.w.desa || b.w.kecamatan, 'id');
        return b.nilai - a.nilai;
      });
  }, [isi, cari, urut]);

  const tertinggi = Math.max(1, ...barisTampil.map((b) => b.nilai || 0));
  const tingkat = turun ? 'desa/kelurahan' : 'kecamatan';
  const lingkup = turun ? `Kec. ${turun}` : 'Kabupaten Bogor';

  const pilih = (b) => {
    if (!turun) ubah({ kec: b.w.kecamatan, desa: null });
    else if (bisaNama && b.w.desa) ubah({ desa: b.w.desa });
  };
  const bisaDiklik = !turun || bisaNama;

  const adaAngka = isi && !isi.angka && !isi.takDikenal;
  const stats = adaAngka
    ? [
        { label: `Total · ${lingkup}`, value: angka(isi.totalNilai) },
        ...(isi.adaPenyebut ? [{ label: 'Persentase', value: persen(isi.totalNilai, isi.totalPenyebut) }] : []),
        { label: turun ? 'Desa/kelurahan' : 'Kecamatan', value: angka(isi.jumlahWilayah) },
        { label: `Rata-rata per ${turun ? 'desa' : 'kecamatan'}`, value: angka(Math.round(isi.totalNilai / Math.max(1, isi.jumlahWilayah))) }
      ]
    : [];

  const chip = (aktif) =>
    `inline-flex items-center rounded-lg px-2.5 py-1 font-semibold transition-colors ${
      aktif ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900'
    }`;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className={`mx-auto ${LEBAR_CORE} space-y-4`}>
          <PageHeader
            icon={Layers}
            title={pemilih?.sub || 'Rincian per wilayah'}
            subtitle={
              pemilih
                ? `${pemilih.judul || 'Demografi'} · dijabarkan per kecamatan, desa, sampai nama warga — dari data ASTA DESA.`
                : 'Tautan rincian ini tidak lengkap.'
            }
            stats={stats}
            actions={
              <Link
                to={`${base}${kembali}`}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Demografi
              </Link>
            }
          />

          {!pemilih ? (
            <Kosong pesan="Titik data yang diminta tidak dikenali. Buka lagi dari tab Demografi." />
          ) : galat ? (
            <Galat pesan={galat} onUlang={() => setUlangKe((n) => n + 1)} />
          ) : !isi ? (
            <Kerangka pesan="Memuat rincian per wilayah…" />
          ) : isi.takDikenal ? (
            <Kosong pesan="Rincian per wilayah untuk nilai ini belum tersedia." />
          ) : (
            <>
              {/* Jejak lingkup: tiap tingkat bisa diklik untuk naik kembali. */}
              <nav aria-label="Lingkup wilayah" className="flex flex-wrap items-center gap-1.5 text-xs">
                <MapPin className="mr-0.5 h-3.5 w-3.5 text-slate-400" />
                <button type="button" onClick={() => ubah({ kec: null, desa: null })} className={chip(!turun)}>
                  Kabupaten Bogor
                </button>
                {turun && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <button type="button" onClick={() => ubah({ desa: null })} className={chip(!desaDipilih)}>
                      Kec. {turun}
                    </button>
                  </>
                )}
                {desaDipilih && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <span className={chip(true)}>{desaDipilih}</span>
                  </>
                )}
              </nav>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <Panel
                  judul={turun ? `Per desa/kelurahan · Kec. ${turun}` : 'Per kecamatan'}
                  keterangan={
                    isi.angka
                      ? 'Statistik kolom angka per wilayah.'
                      : turun
                      ? bisaNama
                        ? 'Klik sebuah desa untuk melihat daftar nama di sampingnya.'
                        : 'Angka per desa/kelurahan.'
                      : 'Klik sebuah kecamatan untuk turun ke desa-desanya.'
                  }
                  aksi={
                    !isi.angka && (
                      <PilihUrut
                        urut={urut}
                        opsi={[['jumlah', 'Jumlah'], ...(isi.adaPenyebut ? [['persen', 'Persen']] : []), ['nama', 'Nama']]}
                        onUbah={(k) => ubah({ urut: k === 'jumlah' ? null : k }, { ganti: true })}
                      />
                    )
                  }
                >
                  <label className="relative mb-3 block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={cari}
                      onChange={(e) => setCari(e.target.value)}
                      placeholder={`Cari ${tingkat}…`}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                    />
                  </label>

                  {isi.angka ? (
                    isi.iKolom < 0 ? (
                      <Kosong pesan="Rincian per wilayah untuk kolom ini belum tersedia." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200 text-[10.5px] uppercase tracking-wide text-slate-400">
                              <th className="py-2 pr-3 text-left font-semibold">{tingkat}</th>
                              <th className="py-2 pr-3 text-right font-semibold">Terisi</th>
                              <th className="py-2 pr-3 text-right font-semibold">Rata-rata</th>
                              <th className="py-2 pr-3 text-right font-semibold">Median</th>
                              <th className="py-2 text-right font-semibold">Rentang</th>
                            </tr>
                          </thead>
                          <tbody>
                            {isi.wilayah
                              .filter((w) => !cari.trim() || (w.desa || w.kecamatan).toLowerCase().includes(cari.trim().toLowerCase()))
                              .map((w) => (
                                <BarisAngka
                                  key={w.desa ? `${w.kecamatan}/${w.desa}` : w.kecamatan}
                                  w={w}
                                  iKolom={isi.iKolom}
                                  onTurun={!turun ? () => ubah({ kec: w.kecamatan, desa: null }) : null}
                                />
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : !barisTampil.length ? (
                    <Kosong pesan={`Tidak ada ${tingkat} yang cocok.`} />
                  ) : (
                    <ol className="space-y-0.5">
                      {isi.takTerlacak > 0 && (
                        <li className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                          {isi.takTerlacak} {tingkat} belum punya rincian anggota yang terlacak — ditandai "—", bukan nol.
                        </li>
                      )}
                      {barisTampil.map((b, i) => (
                        <BarisWilayah
                          key={b.w.desa ? `${b.w.kecamatan}/${b.w.desa}` : b.w.kecamatan}
                          b={b}
                          i={i}
                          tertinggi={tertinggi}
                          aktif={Boolean(desaDipilih && b.w.desa && cocok(b.w.desa, desaDipilih))}
                          onKlik={bisaDiklik ? () => pilih(b) : null}
                          judul={!turun ? `Lihat per desa di Kec. ${b.w.kecamatan}` : bisaNama ? `Lihat daftar nama di ${b.w.desa}` : undefined}
                          aksi={
                            !turun
                              ? () => <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                              : bisaNama
                              ? (aktif) => (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
                                      aktif ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white'
                                    }`}
                                  >
                                    <Users className="h-3 w-3" /> Nama
                                  </span>
                                )
                              : null
                          }
                        />
                      ))}
                    </ol>
                  )}
                </Panel>

                <aside ref={panelNama} className="scroll-mt-4 lg:sticky lg:top-4 lg:self-start">
                  <AnimatePresence mode="wait" initial={false}>
                    {desaDipilih && bisaNama ? (
                      <motion.div
                        key={`nama-${desaDipilih}`}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        className={`flex h-[75vh] flex-col overflow-hidden rounded-[20px] border border-slate-200/70 bg-white lg:h-[calc(100vh-2rem)] ${BAYANGAN}`}
                      >
                        <DaftarNamaWarga
                          pemilih={pemilih}
                          kecamatan={turun}
                          desa={desaDipilih}
                          onKembali={() => ubah({ desa: null })}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="sorotan"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        className="space-y-4"
                      >
                        {adaAngka && isi.tertinggi.length > 0 && (
                          <Panel
                            judul="Sorotan"
                            keterangan={`${isi.adaPenyebut ? 'Persentase' : 'Jumlah'} tertinggi dan terendah per ${tingkat} · ${lingkup}`}
                          >
                            <div className="space-y-4">
                              <DaftarSorotan
                                ikon={TrendingUp}
                                judul="Tertinggi"
                                warna="text-emerald-600"
                                baris={isi.tertinggi}
                                onPilih={bisaDiklik ? pilih : null}
                              />
                              {isi.terendah.length > 0 && (
                                <DaftarSorotan
                                  ikon={TrendingDown}
                                  judul="Terendah"
                                  warna="text-rose-600"
                                  baris={isi.terendah}
                                  onPilih={bisaDiklik ? pilih : null}
                                />
                              )}
                            </div>
                          </Panel>
                        )}
                        <div className="flex items-start gap-3 rounded-[20px] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4">
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                            <MousePointerClick className="h-4 w-4" />
                          </span>
                          <p className="text-sm leading-relaxed text-slate-600">
                            {!turun
                              ? 'Pilih sebuah kecamatan untuk melihat rincian desa/kelurahannya.'
                              : bisaNama
                              ? 'Pilih sebuah desa untuk melihat siapa saja di balik angkanya. Daftar nama tampil di sini.'
                              : 'Angka ini berupa statistik kolom, jadi tidak punya daftar nama per orang.'}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </aside>
              </div>

              {muatan?.kesiapan && !muatan.kesiapan.realtime && (
                <p className="px-1 text-[11px] text-slate-400">
                  Rincian ini dari potret terakhir di server — bisa tertinggal sedikit dari angka di halaman.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </MotionConfig>
  );
};

export default HalamanRincian;
