// Kesiapan kelembagaan: peran di program pemerintah, identitas legal, dan
// kelengkapan berkas. Tiga hal yang paling sering ditanyakan ke dinas dan
// paling sulit dijawab kalau harus membuka satu per satu.
//
// Peran program, jenis identitas legal, dan jenis dokumen adalah kategori TANPA
// urutan, jadi seluruh batangnya satu warna. Hanya ringkasan kelengkapan
// (lengkap / sebagian / belum ada) yang berurut, dan itu memakai tangga slate.
import React, { useMemo } from 'react';
import { HandHeart, BadgeCheck, FolderCheck } from 'lucide-react';
import {
  DOKUMEN_INTI, berperan, adaIsi, jumlahLegalitas, kelasDokumen, jumlahDokumen,
} from './bumdesFilter';
import { Kartu, Judul, Batang, Kosong } from './bumdesViz';
import { RAMP, WARNA_TUNGGAL, nf, persenDari } from './bumdesFormat';

const LABEL_DOKUMEN = {
  perdes: 'Perdes pendirian',
  anggaran_dasar: 'Anggaran Dasar',
  anggaran_rumah_tangga: 'Anggaran Rumah Tangga',
  program_kerja: 'Program Kerja',
  sk_bum_desa: 'SK BUM Desa',
  profil: 'Profil BUM Desa',
  berita_acara: 'Berita Acara',
};

const BumdesKesiapan = ({ data, filter, onFilter }) => {
  const s = useMemo(() => {
    const total = data.length;
    if (!total) return null;

    const program = [
      { id: 'ketapang', label: 'Ketahanan pangan', n: data.filter((d) => berperan(d.ketahanan_pangan)).length },
      { id: 'wisata', label: 'Desa wisata', n: data.filter((d) => berperan(d.desa_wisata)).length },
      { id: 'mbg', label: 'Makan Bergizi Gratis', n: data.filter((d) => berperan(d.peran_mbg)).length },
    ];
    const tanpaPeran = data.filter(
      (d) => !berperan(d.ketahanan_pangan) && !berperan(d.desa_wisata) && !berperan(d.peran_mbg)
    ).length;

    const legal = [
      { id: 'nib', label: 'NIB', n: data.filter((d) => adaIsi(d.nib)).length },
      { id: 'npwp', label: 'NPWP', n: data.filter((d) => adaIsi(d.npwp)).length },
      { id: 'lkpp', label: 'Terdaftar LKPP', n: data.filter((d) => adaIsi(d.lkpp)).length },
    ];
    const legalLengkap = data.filter((d) => jumlahLegalitas(d) === 3).length;
    const legalKosong = data.filter((d) => jumlahLegalitas(d) === 0).length;

    const dokumen = DOKUMEN_INTI.map((k) => ({
      id: k,
      label: LABEL_DOKUMEN[k],
      n: data.filter((d) => d.dokumen?.[k]).length,
    })).sort((a, b) => b.n - a.n);

    const kelas = {
      lengkap: data.filter((d) => kelasDokumen(d) === 'lengkap').length,
      sebagian: data.filter((d) => kelasDokumen(d) === 'sebagian').length,
      kosong: data.filter((d) => kelasDokumen(d) === 'kosong').length,
    };
    const rerataDokumen =
      data.reduce((t, d) => t + jumlahDokumen(d), 0) / total;

    return { total, program, tanpaPeran, legal, legalLengkap, legalKosong, dokumen, kelas, rerataDokumen };
  }, [data]);

  if (!s) return <Kartu><Kosong /></Kartu>;

  const maksProgram = Math.max(1, ...s.program.map((p) => p.n), s.tanpaPeran);
  const maksLegal = Math.max(1, ...s.legal.map((l) => l.n));
  const maksDokumen = Math.max(1, ...s.dokumen.map((d) => d.n));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Peran dalam program pemerintah */}
        <Kartu>
          <Judul
            icon={HandHeart}
            catatan="Berapa BUMDes yang benar-benar mengisi perannya, bukan sekadar tercatat sebagai sasaran program. Isian “tidak ada peran” dan sel kosong dihitung sebagai belum berperan."
          >
            Peran dalam program pemerintah
          </Judul>
          <div className="space-y-3.5">
            {s.program.map((p, i) => (
              <Batang
                key={p.id}
                label={p.label}
                nilai={p.n}
                tampil={`${nf.format(p.n)} · ${persenDari(p.n, s.total)}%`}
                maks={maksProgram}
                warna={WARNA_TUNGGAL}
                urutan={i}
                judulHover={`${p.n} dari ${s.total} BUMDes berperan di ${p.label}`}
                aktifTersorot={filter.program === p.id}
                onKlik={() => onFilter({
                  ...filter, program: filter.program === p.id ? 'semua' : p.id,
                })}
              />
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <Batang
              label="Belum berperan di program mana pun"
              nilai={s.tanpaPeran}
              tampil={`${nf.format(s.tanpaPeran)} · ${persenDari(s.tanpaPeran, s.total)}%`}
              maks={maksProgram}
              warna={RAMP[0]}
              urutan={3}
              judulHover={`${s.tanpaPeran} BUMDes belum berperan di program mana pun`}
              aktifTersorot={filter.program === 'tanpa-peran'}
              onKlik={() => onFilter({
                ...filter, program: filter.program === 'tanpa-peran' ? 'semua' : 'tanpa-peran',
              })}
            />
          </div>
        </Kartu>

        {/* Identitas legal */}
        <Kartu>
          <Judul
            icon={BadgeCheck}
            catatan="Tiga identitas yang menentukan apakah BUMDes bisa membuka rekening, ikut pengadaan, dan menerima bantuan."
          >
            Identitas legal usaha
          </Judul>
          <div className="space-y-3.5">
            {s.legal.map((l, i) => (
              <Batang
                key={l.id}
                label={l.label}
                nilai={l.n}
                tampil={`${nf.format(l.n)} · ${persenDari(l.n, s.total)}%`}
                maks={maksLegal}
                warna={WARNA_TUNGGAL}
                urutan={i}
                judulHover={`${l.n} dari ${s.total} BUMDes sudah punya ${l.label}`}
                aktifTersorot={filter.legalitas === l.id}
                onKlik={() => onFilter({
                  ...filter, legalitas: filter.legalitas === l.id ? 'semua' : l.id,
                })}
              />
            ))}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onFilter({
                ...filter, legalitas: filter.legalitas === 'lengkap' ? 'semua' : 'lengkap',
              })}
              className="rounded-lg bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
            >
              <dt className="text-[11px] font-medium text-slate-500">Ketiganya lengkap</dt>
              <dd className="mt-0.5 text-lg font-semibold text-slate-900">
                {nf.format(s.legalLengkap)}
                <span className="ml-1.5 text-xs font-normal text-slate-500">
                  ({persenDari(s.legalLengkap, s.total)}%)
                </span>
              </dd>
            </button>
            <button
              type="button"
              onClick={() => onFilter({
                ...filter, legalitas: filter.legalitas === 'belum' ? 'semua' : 'belum',
              })}
              className="rounded-lg bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
            >
              <dt className="text-[11px] font-medium text-slate-500">Belum punya satu pun</dt>
              <dd className="mt-0.5 text-lg font-semibold text-slate-900">
                {nf.format(s.legalKosong)}
                <span className="ml-1.5 text-xs font-normal text-slate-500">
                  ({persenDari(s.legalKosong, s.total)}%)
                </span>
              </dd>
            </button>
          </dl>
        </Kartu>
      </div>

      {/* Kelengkapan dokumen */}
      <Kartu>
        <Judul
          icon={FolderCheck}
          catatan={`Tujuh dokumen inti yang harus dipegang setiap BUM Desa. Rata-rata ${s.rerataDokumen.toFixed(1)} dari 7 dokumen sudah terunggah pada tampilan ini.`}
        >
          Kelengkapan dokumen kelembagaan
        </Judul>

        {/* Ringkasan berurut: lengkap -> sebagian -> belum ada */}
        <div
          className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[4px]"
          role="img"
          aria-label={`Lengkap ${s.kelas.lengkap}, sebagian ${s.kelas.sebagian}, belum ada ${s.kelas.kosong} dari ${s.total} BUMDes`}
        >
          <span
            className="h-3 motion-safe:transition-[width] motion-safe:duration-700"
            style={{
              width: `${persenDari(s.kelas.lengkap, s.total)}%`,
              backgroundColor: RAMP[5],
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          <span
            className="h-3 motion-safe:transition-[width] motion-safe:duration-700"
            style={{
              width: `${persenDari(s.kelas.sebagian, s.total)}%`,
              backgroundColor: RAMP[1],
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          <span
            className="h-3 bg-slate-100 motion-safe:transition-[width] motion-safe:duration-700"
            style={{
              width: `${persenDari(s.kelas.kosong, s.total)}%`,
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { id: 'lengkap', label: 'Lengkap 7 dokumen', n: s.kelas.lengkap },
            { id: 'sebagian', label: 'Sebagian saja', n: s.kelas.sebagian },
            { id: 'kosong', label: 'Belum ada sama sekali', n: s.kelas.kosong },
          ].map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => onFilter({
                ...filter, dokumen: filter.dokumen === k.id ? 'semua' : k.id,
              })}
              className="rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50"
            >
              <p className="text-[11px] text-slate-500">{k.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {nf.format(k.n)}
                <span className="ml-1.5 text-xs font-normal text-slate-500">
                  ({persenDari(k.n, s.total)}%)
                </span>
              </p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3.5 border-t border-slate-100 pt-5 sm:grid-cols-2">
          {s.dokumen.map((d, i) => (
            <Batang
              key={d.id}
              label={d.label}
              nilai={d.n}
              tampil={`${nf.format(d.n)} · ${persenDari(d.n, s.total)}%`}
              maks={maksDokumen}
              warna={WARNA_TUNGGAL}
              urutan={i}
              judulHover={`${d.n} dari ${s.total} BUMDes sudah mengunggah ${d.label}`}
            />
          ))}
        </div>
      </Kartu>
    </div>
  );
};

export default BumdesKesiapan;
