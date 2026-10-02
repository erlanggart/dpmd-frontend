// Kesiapan kelembagaan: peran program, identitas legal, kelengkapan dokumen.
import React, { useCallback, useMemo, useState } from 'react';
import { HandHeart, BadgeCheck, FolderCheck } from 'lucide-react';
import {
  DOKUMEN_INTI, berperan, adaIsi, jumlahLegalitas, kelasDokumen,
} from './bumdesFilter';
import { Kartu, Judul, Batang, PitaBertumpuk, Kosong } from './bumdesViz';
import BumdesDaftarModal from './BumdesDaftarModal';
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

/** Isi kolom apa adanya untuk ditampilkan di bawah nama desa, mis. jenis peran MBG. */
const isiKolom = (kolom) => (d) => (adaIsi(d[kolom]) ? String(d[kolom]).trim() : null);

const tanpaPeran = (d) =>
  !berperan(d.ketahanan_pangan) && !berperan(d.desa_wisata) && !berperan(d.peran_mbg);

const BumdesKesiapan = ({ data, filter, onFilter, onUbah }) => {
  // Klik batang membuka daftar desanya. Menyaring seluruh halaman jadi tombol
  // di dalam daftar itu, bukan efek samping klik — dulu klik langsung
  // menyaring, batangnya melompat ke 100% dan nama desanya tidak terlihat.
  const [daftar, setDaftar] = useState(null);
  const tutupDaftar = useCallback(() => setDaftar(null), []);

  const bukaDaftar = (judul, cocok, { rincian, saring } = {}) => setDaftar({
    judul,
    daftar: data.filter(cocok),
    rincian,
    onSaring: saring ? () => onFilter({ ...filter, ...saring }) : undefined,
  });

  const s = useMemo(() => {
    const total = data.length;
    if (!total) return null;

    const program = [
      { id: 'ketapang', label: 'Ketahanan pangan', kolom: 'ketahanan_pangan' },
      { id: 'wisata', label: 'Desa wisata', kolom: 'desa_wisata' },
      { id: 'mbg', label: 'Makan Bergizi Gratis', kolom: 'peran_mbg' },
    ].map((p) => ({ ...p, n: data.filter((d) => berperan(d[p.kolom])).length }));
    const jumlahTanpaPeran = data.filter(tanpaPeran).length;

    const legal = [
      { id: 'nib', label: 'NIB', kolom: 'nib' },
      { id: 'npwp', label: 'NPWP', kolom: 'npwp' },
      { id: 'lkpp', label: 'Terdaftar LKPP', kolom: 'lkpp' },
    ].map((l) => ({ ...l, n: data.filter((d) => adaIsi(d[l.kolom])).length }));
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
    return {
      total, program, tanpaPeran: jumlahTanpaPeran, legal, legalLengkap, legalKosong, dokumen, kelas,
    };
  }, [data]);

  if (!s) return <Kartu><Kosong /></Kartu>;

  const maksProgram = Math.max(1, ...s.program.map((p) => p.n), s.tanpaPeran);
  const maksLegal = Math.max(1, ...s.legal.map((l) => l.n));
  const maksDokumen = Math.max(1, ...s.dokumen.map((d) => d.n));

  const KELAS_DOKUMEN = [
    { id: 'lengkap', label: 'Lengkap 7 dokumen', n: s.kelas.lengkap, warna: RAMP[5] },
    { id: 'sebagian', label: 'Sebagian', n: s.kelas.sebagian, warna: RAMP[1] },
    { id: 'kosong', label: 'Belum ada', n: s.kelas.kosong, warna: '#f1f5f9' },
  ];
  const bukaKelasDokumen = (k) => bukaDaftar(
    k.id === 'lengkap' ? k.label : `Dokumen: ${k.label.toLowerCase()}`,
    (d) => kelasDokumen(d) === k.id,
    { saring: { dokumen: k.id } },
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Kartu>
          <Judul icon={HandHeart} warna={RAMP[2]}>Peran program pemerintah</Judul>
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
                judulHover={`${p.n} dari ${s.total} BUMDes berperan di ${p.label} — klik untuk lihat desanya`}
                aktifTersorot={filter.program === p.id}
                onKlik={() => bukaDaftar(p.label, (d) => berperan(d[p.kolom]), {
                  rincian: isiKolom(p.kolom), saring: { program: p.id },
                })}
              />
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <Batang
              label="Belum berperan"
              nilai={s.tanpaPeran}
              tampil={`${nf.format(s.tanpaPeran)} · ${persenDari(s.tanpaPeran, s.total)}%`}
              maks={maksProgram}
              warna={RAMP[0]}
              urutan={3}
              judulHover={`${s.tanpaPeran} BUMDes belum berperan di program mana pun — klik untuk lihat desanya`}
              aktifTersorot={filter.program === 'tanpa-peran'}
              onKlik={() => bukaDaftar('Belum berperan di program mana pun', tanpaPeran, {
                saring: { program: 'tanpa-peran' },
              })}
            />
          </div>
        </Kartu>

        <Kartu>
          <Judul icon={BadgeCheck} warna={RAMP[2]}>Identitas legal</Judul>
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
                judulHover={`${l.n} dari ${s.total} BUMDes sudah punya ${l.label} — klik untuk lihat desanya`}
                aktifTersorot={filter.legalitas === l.id}
                onKlik={() => bukaDaftar(`Sudah punya ${l.label}`, (d) => adaIsi(d[l.kolom]), {
                  rincian: isiKolom(l.kolom), saring: { legalitas: l.id },
                })}
              />
            ))}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => bukaDaftar('NIB, NPWP, dan LKPP lengkap', (d) => jumlahLegalitas(d) === 3, {
                saring: { legalitas: 'lengkap' },
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
              onClick={() => bukaDaftar('Belum punya NIB, NPWP, maupun LKPP', (d) => jumlahLegalitas(d) === 0, {
                saring: { legalitas: 'belum' },
              })}
              className="rounded-lg bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
            >
              <dt className="text-[11px] font-medium text-slate-500">Belum punya</dt>
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

      <Kartu>
        <Judul icon={FolderCheck} warna={RAMP[2]}>Kelengkapan dokumen</Judul>

        <PitaBertumpuk
          total={s.total}
          segmen={KELAS_DOKUMEN.map((k) => ({
            id: k.id,
            label: k.label,
            nilai: k.n,
            warna: k.warna,
            onKlik: () => bukaKelasDokumen(k),
          }))}
        />

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {KELAS_DOKUMEN.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => bukaKelasDokumen(k)}
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
              judulHover={`${d.n} dari ${s.total} BUMDes sudah mengunggah ${d.label} — klik untuk lihat desanya`}
              onKlik={() => bukaDaftar(`Sudah mengunggah ${d.label}`, (b) => !!b.dokumen?.[d.id])}
            />
          ))}
        </div>
      </Kartu>

      <BumdesDaftarModal buka={daftar} onClose={tutupDaftar} onUbah={onUbah} />
    </div>
  );
};

export default BumdesKesiapan;
