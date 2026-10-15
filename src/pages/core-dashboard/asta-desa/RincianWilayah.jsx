/**
 * Pop-up rincian per wilayah untuk satu titik data di tab Demografi.
 *
 * Apa pun yang diklik — kartu angka, batang piramida, baris pendidikan, nilai
 * kolom sensus — dijabarkan per kecamatan (bisa diturunkan ke per desa), dari
 * muatan `/demografi/wilayah` yang sama dengan bahan ekspor. Muatan itu
 * berukuran megabyte dan setiap permintaannya ikut menyusul baris baru ke
 * ASTA DESA, jadi diambil dengan mode 'cache': pop-up kedua dan seterusnya
 * dalam 10 menit tidak menyentuh server sama sekali.
 *
 * `pemilih` adalah deskriptor biasa, bukan fungsi, supaya pemanggil tidak
 * perlu tahu bentuk muatan wilayah:
 *   { tipe: 'keluarga' }                              kepala keluarga / keluarga
 *   { tipe: 'anggota' }                               anggota tercatat
 *   { tipe: 'usia', kelompok: ['0–4', …], sisi }      sisi: 'L' | 'P' | undefined
 *   { tipe: 'sifat', dim, label }                     dim: jk|pendidikan|hubungan|disabilitas|pekerjaan
 *   { tipe: 'kolom', kunci, nilai }                   nilai: label mentah, atau KOSONG
 *   { tipe: 'angka', kunci }                          kolom sensus berjenis angka
 * ditambah { judul, sub } untuk kepala pop-up.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronRight, Search, X } from 'lucide-react';
import { ambilSekali } from './useAstaDesa';
import { Galat, Kosong, Memuat } from './ui';
import { angka, persen } from './warna';

export const KOSONG = '__kosong__';

const cocok = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

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
        .map((l, i) => (pemilih.kelompok.some((k) => cocok(k, l)) ? i : -1))
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
      <td className="py-2 pr-3 text-xs font-medium text-slate-700">
        {onTurun ? (
          <button type="button" onClick={onTurun} className="inline-flex items-center gap-1 text-left hover:text-slate-950 hover:underline">
            {w.desa || w.kecamatan} <ChevronRight className="h-3 w-3 text-slate-400" />
          </button>
        ) : (
          w.desa || w.kecamatan
        )}
      </td>
      <td className="py-2 pr-3 text-right text-xs tabular-nums text-slate-500">{angka(sel?.t || 0)}</td>
      <td className="py-2 pr-3 text-right text-xs font-semibold tabular-nums text-slate-900">{f(s.rata_rata)}</td>
      <td className="py-2 pr-3 text-right text-xs tabular-nums text-slate-700">{f(s.median)}</td>
      <td className="py-2 text-right text-xs tabular-nums text-slate-500">
        {f(s.min)}–{f(s.maks)}
      </td>
    </tr>
  );
};

const ModalRincian = ({ pemilih, filter = {}, onTutup }) => {
  const [muatan, setMuatan] = useState(null);
  const [galat, setGalat] = useState(null);
  const [ulangKe, setUlangKe] = useState(0);
  // Kecamatan yang sedang diturunkan ke desa-desanya (null = daftar kecamatan).
  const [turun, setTurun] = useState(filter.kecamatan || null);
  const [urut, setUrut] = useState('jumlah');
  const [cari, setCari] = useState('');

  useEffect(() => {
    let hidup = true;
    setGalat(null);
    ambilSekali('/demografi/wilayah', { abaikan_kesegaran: 1 }, ulangKe ? 'segar' : 'cache')
      .then((b) => hidup && setMuatan(b.data))
      .catch((e) => hidup && setGalat(e.message || 'Gagal memuat rincian wilayah.'));
    return () => {
      hidup = false;
    };
  }, [ulangKe]);

  useEffect(() => {
    const tekan = (e) => e.key === 'Escape' && onTutup();
    window.addEventListener('keydown', tekan);
    const lama = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', tekan);
      document.body.style.overflow = lama;
    };
  }, [onTutup]);

  const isi = useMemo(() => {
    if (!muatan) return null;
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
    return { baris, totalNilai, adaPenyebut, totalPenyebut, takTerlacak: baris.length - terlacak.length };
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
  const bisaTurun = !turun;
  const tingkat = turun ? 'desa/kelurahan' : 'kecamatan';

  return createPortal(
    <div className="fixed inset-0 z-[600] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Tutup" onClick={onTutup} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{pemilih.judul}</p>
            <h2 className="mt-0.5 truncate text-base font-semibold text-slate-900">{pemilih.sub}</h2>
            {isi && !isi.angka && !isi.takDikenal && (
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-semibold tabular-nums text-slate-900">{angka(isi.totalNilai)}</span>
                {isi.adaPenyebut ? ` (${persen(isi.totalNilai, isi.totalPenyebut)})` : ''} di{' '}
                {turun ? `Kec. ${turun}` : 'seluruh kecamatan'} · per {tingkat}
              </p>
            )}
          </div>
          <button type="button" onClick={onTutup} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-2.5">
          {turun && !filter.kecamatan && (
            <button
              type="button"
              onClick={() => {
                setTurun(null);
                setCari('');
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Semua kecamatan
            </button>
          )}
          <label className="relative min-w-[10rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder={`Cari ${tingkat}…`}
              className="h-8 w-full rounded-lg border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-slate-400"
            />
          </label>
          {isi && !isi.angka && (
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
              {[
                ['jumlah', 'Jumlah'],
                ...(isi.adaPenyebut ? [['persen', 'Persen']] : []),
                ['nama', 'Nama']
              ].map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setUrut(k)}
                  className={`rounded-md px-2 py-1 ${urut === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {galat ? (
            <Galat pesan={galat} onUlang={() => setUlangKe((n) => n + 1)} />
          ) : !isi ? (
            <Memuat pesan="Memuat rincian per wilayah…" />
          ) : isi.takDikenal ? (
            <Kosong pesan="Rincian per wilayah untuk nilai ini belum tersedia." />
          ) : isi.angka ? (
            isi.iKolom < 0 ? (
              <Kosong pesan="Rincian per wilayah untuk kolom ini belum tersedia." />
            ) : (
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
                        onTurun={bisaTurun ? () => setTurun(w.kecamatan) : null}
                      />
                    ))}
                </tbody>
              </table>
            )
          ) : !barisTampil.length ? (
            <Kosong pesan={`Tidak ada ${tingkat} yang cocok.`} />
          ) : (
            <ol className="space-y-1">
              {isi.takTerlacak > 0 && (
                <li className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                  {isi.takTerlacak} {tingkat} belum punya rincian anggota yang terlacak — ditandai "—", bukan nol.
                </li>
              )}
              {barisTampil.map((b, i) => {
                const nama = b.w.desa || b.w.kecamatan;
                const sorot = filter.desa && b.w.desa && cocok(b.w.desa, filter.desa);
                const isiBaris = (
                  <>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 truncate text-xs font-medium text-slate-700">
                        <span className="w-5 flex-shrink-0 text-right text-[10.5px] tabular-nums text-slate-400">{i + 1}</span>
                        <span className="truncate">{nama}</span>
                        {bisaTurun && <ChevronRight className="h-3 w-3 flex-shrink-0 text-slate-300 group-hover:text-slate-500" />}
                      </span>
                      <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-slate-900">
                        {b.nilai === null ? '—' : angka(b.nilai)}
                        {b.nilai !== null && b.penyebut ? (
                          <span className="ml-1.5 font-medium text-slate-400">{persen(b.nilai, b.penyebut)}</span>
                        ) : null}
                      </span>
                    </div>
                    <div className="ml-7 mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-800/80 transition-[width] duration-500"
                        style={{ width: `${b.nilai ? Math.max(2, (b.nilai / tertinggi) * 100) : 0}%` }}
                      />
                    </div>
                  </>
                );
                return (
                  <li key={b.w.desa ? `${b.w.kecamatan}/${b.w.desa}` : b.w.kecamatan}>
                    {bisaTurun ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTurun(b.w.kecamatan);
                          setCari('');
                        }}
                        className="group block w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
                        title={`Lihat per desa di Kec. ${nama}`}
                      >
                        {isiBaris}
                      </button>
                    ) : (
                      <div className={`rounded-lg px-2 py-1.5 ${sorot ? 'bg-sky-50 ring-1 ring-sky-200' : ''}`}>{isiBaris}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {muatan?.kesiapan && !muatan.kesiapan.realtime && (
          <p className="flex-shrink-0 border-t border-slate-100 px-5 py-2 text-[11px] text-slate-400">
            Rincian ini dari potret terakhir di server — bisa tertinggal sedikit dari angka di halaman.
          </p>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ModalRincian;
