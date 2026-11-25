// Rapor Wilayah: semua data satu kecamatan atau satu desa dalam satu halaman.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText, Printer, Search, RefreshCw, FileSpreadsheet, Wallet, Store, UserCheck, MapPin,
  Scale, Gauge, CheckCircle2, AlertTriangle, ChevronRight,
} from 'lucide-react';
import api from '../../../api';
import PageHeader from '../../../components/statistik/PageHeader';
import { persen, fmtPersen } from '../../../utils/persen';
import { eksporExcel, eksporPdf } from '../../../utils/eksporTabel';
import { LEBAR_CORE } from '../lebarHalaman';
import { KartuIndikator, PanelPerhatian, BarMini } from '../ringkasan/ui';
import { rupiah, angka, fmtSkor, normNama } from '../ringkasan/format';

const tombolKecil =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30';
const kartuKelas = 'break-inside-avoid rounded-2xl border border-slate-200 bg-white p-4';

const Lencana = ({ children, nada = 'netral' }) => {
  const k = {
    netral: 'bg-slate-100 text-slate-700 ring-slate-200',
    baik: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    buruk: 'bg-rose-50 text-rose-700 ring-rose-200',
  }[nada];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${k}`}>{children}</span>;
};

const Baris = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <dt className="text-slate-500">{label}</dt>
    <dd className="text-right font-medium text-slate-900">{children ?? '—'}</dd>
  </div>
);

const Kartu = ({ judul, tautan, children }) => (
  <section className={kartuKelas}>
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-900">{judul}</h3>
      {tautan && (
        <Link to={tautan.ke} className="text-xs font-medium text-slate-600 underline underline-offset-2 print:hidden">
          {tautan.label}
        </Link>
      )}
    </div>
    {children}
  </section>
);

const Daftar = ({ items, labelKey, kosong = 'Tidak ada data.' }) =>
  items?.length ? (
    <ul className="mt-1 space-y-0.5 text-sm">
      {items.map((x) => (
        <li key={x[labelKey]} className="flex justify-between gap-3">
          <span className="text-slate-600">{x[labelKey] || '—'}</span>
          <span className="tabular-nums font-medium text-slate-900">{angka(x.jumlah)}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-slate-500">{kosong}</p>
  );

/* ----------------------------------------------------------- pencari -- */
const Pencari = ({ wilayah, onPilih }) => {
  const [q, setQ] = useState('');
  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState(0);

  const entri = useMemo(
    () =>
      wilayah.flatMap((k) => [
        { tipe: 'kecamatan', id: k.id, label: `Kecamatan ${k.nama}` },
        ...k.desa.map((d) => ({
          tipe: 'desa',
          id: d.id,
          label: `${d.jenis === 'kelurahan' ? 'Kelurahan' : 'Desa'} ${d.nama} — Kec. ${k.nama}`,
        })),
      ]),
    [wilayah]
  );
  const hasil = useMemo(() => {
    const kata = normNama(q);
    if (!kata) return [];
    return entri.filter((e) => e.label.toLowerCase().includes(kata)).slice(0, 20);
  }, [q, entri]);

  const pilih = (e) => {
    if (!e) return;
    setQ('');
    setBuka(false);
    onPilih(e);
  };
  const onKey = (ev) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setBuka(true);
      setAktif((a) => Math.min(a + 1, hasil.length - 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setAktif((a) => Math.max(a - 1, 0));
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      pilih(hasil[aktif]);
    } else if (ev.key === 'Escape') {
      setBuka(false);
    }
  };
  const tampil = buka && hasil.length > 0;

  return (
    <div className="relative max-w-xl print:hidden">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        type="text"
        role="combobox"
        aria-expanded={tampil}
        aria-controls="rapor-hasil"
        aria-label="Cari kecamatan atau desa"
        aria-activedescendant={tampil ? `rapor-opsi-${aktif}` : undefined}
        value={q}
        placeholder="Cari kecamatan atau desa…"
        onChange={(e) => {
          setQ(e.target.value);
          setAktif(0);
          setBuka(true);
        }}
        onKeyDown={onKey}
        onBlur={() => setBuka(false)}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/30"
      />
      {tampil && (
        <ul id="rapor-hasil" role="listbox" className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {hasil.map((e, i) => (
            <li
              key={`${e.tipe}-${e.id}`}
              id={`rapor-opsi-${i}`}
              role="option"
              aria-selected={i === aktif}
              // onMouseDown, bukan onClick: onBlur input menutup daftar lebih dulu.
              onMouseDown={() => pilih(e)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === aktif ? 'bg-slate-100' : ''}`}
            >
              {e.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ------------------------------------------------------ rapor kecamatan -- */
const RaporKecamatan = ({ rapor, ke }) => {
  const { kecamatan, total: t } = rapor;
  const [urut, setUrut] = useState('nama');
  const baris = useMemo(() => {
    const kol = {
      nama: (b) => b.nama,
      skor: (b) => b.skor,
      dana: (b) => (b.dana ? persen(b.dana.cair, b.dana.pagu) : null),
      penduduk: (b) => b.penduduk,
    }[urut];
    return [...rapor.desa].sort((a, b) => {
      const x = kol(a);
      const y = kol(b);
      if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1;
      if (y === null || y === undefined) return -1;
      return typeof x === 'string' ? x.localeCompare(y, 'id') : x - y;
    });
  }, [rapor.desa, urut]);

  const kolomEkspor = [
    { label: 'Desa', nilai: (b) => b.nama },
    { label: 'Jenis', nilai: (b) => b.jenis },
    { label: 'Penduduk', nilai: (b) => b.penduduk },
    { label: 'Kepala desa', nilai: (b) => b.kades },
    { label: 'Aparatur', nilai: (b) => b.aparatur },
    { label: 'BUM Desa', nilai: (b) => (b.bumdes ? `${b.bumdes.nama} (${b.bumdes.status === 'aktif' ? 'Aktif' : 'Tidak aktif'})` : '') },
    { label: 'Perdes', nilai: (b) => b.perdes },
    { label: 'Produk hukum', nilai: (b) => b.produk_hukum },
    { label: 'Dana cair', nilai: (b) => (b.dana ? fmtPersen(persen(b.dana.cair, b.dana.pagu)) : '') },
    { label: 'Profil', nilai: (b) => (b.profil_lengkap ? 'Lengkap' : 'Belum') },
    { label: 'Indeks', nilai: (b) => (b.skor === null ? '' : fmtSkor(b.skor)) },
  ];
  const ekspor = (fn) =>
    fn({
      kolom: kolomEkspor,
      baris,
      namaBerkas: `rapor-kecamatan-${normNama(kecamatan.nama).replace(/\s+/g, '-')}`,
      judul: `Rapor Kecamatan ${kecamatan.nama}`,
      subjudul: kecamatan.nama_camat ? `Camat: ${kecamatan.nama_camat}` : undefined,
      namaSheet: 'Rapor kecamatan',
    });

  const th = (k, label) => (
    <th scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
      {k ? (
        <button type="button" onClick={() => setUrut(k)} className="uppercase tracking-wider hover:text-slate-900">
          {label}{urut === k ? ' ↓' : ''}
        </button>
      ) : (
        label
      )}
    </th>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Kecamatan {kecamatan.nama}</h2>
        {kecamatan.nama_camat && <p className="text-sm text-slate-500">Camat: {kecamatan.nama_camat}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {t.dana && (
          <KartuIndikator ikon={Wallet} label={`Dana desa cair TA ${rapor.tahun_dana}`} nilai={fmtPersen(persen(t.dana.cair, t.dana.pagu))}
            sub={`${rupiah(t.dana.cair)} dari ${rupiah(t.dana.pagu)}`} rasio={persen(t.dana.cair, t.dana.pagu)} />
        )}
        <KartuIndikator ikon={Store} label="BUM Desa aktif" nilai={`${angka(t.bumdes_aktif)} dari ${angka(t.desa)} desa`}
          sub={`${angka(t.bumdes_berbadan_hukum)} berbadan hukum · ${angka(t.bumdes)} terdaftar`} rasio={persen(t.bumdes_aktif, t.desa)} />
        <KartuIndikator ikon={UserCheck} label="Kepala desa tercatat" nilai={`${angka(t.kades)} dari ${angka(t.desa)} desa`}
          sub={`${angka(t.aparatur)} aparatur aktif`} rasio={persen(t.kades, t.desa)} />
        <KartuIndikator ikon={MapPin} label="Profil desa lengkap" nilai={`${angka(t.profil_lengkap)} dari ${angka(t.desa)} desa`}
          sub={`${angka(t.penduduk)} jiwa tercatat`} rasio={persen(t.profil_lengkap, t.desa)} />
        <KartuIndikator ikon={Scale} label="Desa punya Perdes" nilai={`${angka(t.desa_punya_perdes)} dari ${angka(t.desa)} desa`}
          sub={`${angka(t.produk_hukum)} produk hukum`} rasio={persen(t.desa_punya_perdes, t.desa)} />
        <KartuIndikator ikon={Gauge} label="Indeks kelengkapan data" nilai={fmtSkor(t.skor)}
          sub="Rata-rata 4 indikator per desa: profil, kepala desa, BUM Desa aktif, Perdes" rasio={t.skor ?? undefined} />
      </div>

      <PanelPerhatian perhatian={rapor.perhatian} keRapor={(id) => ke({ desa: id })} />

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Desa dan kelurahan ({angka(baris.length)})</h3>
          <div className="flex gap-2 print:hidden">
            <button type="button" onClick={() => ekspor(eksporExcel)} className={tombolKecil}><FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" /> Excel</button>
            <button type="button" onClick={() => ekspor(eksporPdf)} className={tombolKecil}><FileText className="h-3.5 w-3.5" aria-hidden="true" /> PDF</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-500">
                {th('nama', 'Desa')}{th(null, 'Jenis')}{th('penduduk', 'Penduduk')}{th(null, 'Kepala desa')}{th(null, 'Aparatur')}
                {th(null, 'BUM Desa')}{th(null, 'Perdes')}{th(null, 'Produk hukum')}{th('dana', 'Dana cair')}{th(null, 'Profil')}{th('skor', 'Indeks')}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {baris.map((b) => (
                <tr
                  key={b.id}
                  tabIndex={0}
                  onClick={() => ke({ desa: b.id })}
                  onKeyDown={(e) => e.key === 'Enter' && ke({ desa: b.id })}
                  className="cursor-pointer hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-100"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{b.nama}</td>
                  <td className="px-3 py-2 capitalize">{b.jenis}</td>
                  <td className="px-3 py-2 tabular-nums">{b.penduduk === null ? '—' : angka(b.penduduk)}</td>
                  <td className="px-3 py-2">{b.kades || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{angka(b.aparatur)}</td>
                  <td className="px-3 py-2">
                    {b.bumdes ? (
                      <span className="flex items-center gap-1.5">
                        {b.bumdes.nama}
                        <Lencana nada={b.bumdes.status === 'aktif' ? 'baik' : 'buruk'}>{b.bumdes.status === 'aktif' ? 'Aktif' : 'Tidak aktif'}</Lencana>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{angka(b.perdes)}</td>
                  <td className="px-3 py-2 tabular-nums">{angka(b.produk_hukum)}</td>
                  <td className="px-3 py-2 tabular-nums">{b.dana ? fmtPersen(persen(b.dana.cair, b.dana.pagu)) : '—'}</td>
                  <td className="px-3 py-2"><Lencana nada={b.profil_lengkap ? 'baik' : 'buruk'}>{b.profil_lengkap ? 'Lengkap' : 'Belum'}</Lencana></td>
                  <td className="px-3 py-2 tabular-nums">{fmtSkor(b.skor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

/* ---------------------------------------------------------- rapor desa -- */
const RaporDesa = ({ rapor }) => {
  const { desa, kecamatan, profil, aparatur, bumdes, produk_hukum: ph, kelembagaan: kl, dana } = rapor;
  const sipandaGagal = rapor.sumber_gagal?.includes('sipanda');
  const tgl = (v) => (v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null);
  const persenDana = dana ? persen(dana.cair, dana.pagu) : 0;

  return (
    <div className="space-y-5">
      <nav aria-label="Remah roti" className="text-sm print:hidden">
        <Link to={`?kecamatan=${kecamatan.id}`} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
          Kec. {kecamatan.nama} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </nav>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-slate-900">{desa.nama}</h2>
          <Lencana>{desa.jenis === 'kelurahan' ? 'Kelurahan' : 'Desa'}</Lencana>
          {profil?.status_desa && <Lencana>{profil.status_desa}</Lencana>}
          {profil?.klasifikasi_desa && <Lencana>{profil.klasifikasi_desa}</Lencana>}
          {profil?.tipologi_desa && <Lencana>{profil.tipologi_desa}</Lencana>}
        </div>
        <p className="text-sm text-slate-500">Kecamatan {kecamatan.nama}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {rapor.perhatian?.length ? (
          rapor.perhatian.map((p) => (
            <span key={p.kunci} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {p.judul}
            </span>
          ))
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Semua indikator terpenuhi
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Kartu judul="Profil" tautan={{ ke: `/core-dashboard/statistik-profil-desa/${desa.id}`, label: 'Profil lengkap' }}>
          {profil ? (
            <dl className="divide-y divide-slate-100">
              <Baris label="Penduduk">{profil.jumlah_penduduk != null ? `${angka(profil.jumlah_penduduk)} jiwa` : null}</Baris>
              <Baris label="Luas wilayah">{profil.luas_wilayah}</Baris>
              <Baris label="Alamat kantor">{profil.alamat_kantor}</Baris>
              <Baris label="Telepon">{profil.no_telp}</Baris>
              <Baris label="Email">{profil.email}</Baris>
              <Baris label="Koordinat">
                {profil.latitude && profil.longitude ? (
                  <a href={`https://www.google.com/maps?q=${profil.latitude},${profil.longitude}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {profil.latitude}, {profil.longitude}
                  </a>
                ) : null}
              </Baris>
              <Baris label="Diperbarui">{tgl(profil.updated_at)}</Baris>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Profil belum diisi desa.</p>
          )}
        </Kartu>

        <Kartu judul="Pemerintahan desa">
          <dl className="divide-y divide-slate-100">
            <Baris label="Kepala desa">{desa.kades}</Baris>
            <Baris label="Aparatur aktif">{angka(aparatur.aktif)}</Baris>
            <Baris label="Laki-laki / Perempuan">
              {(() => {
                const j = (re) => aparatur.per_jenis_kelamin?.find((x) => re.test(x.jenis_kelamin || ''))?.jumlah || 0;
                return `${angka(j(/^l/i))} / ${angka(j(/^p/i))}`;
              })()}
            </Baris>
          </dl>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Jabatan</p>
          <Daftar items={aparatur.per_jabatan?.slice(0, 8)} labelKey="jabatan" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Pendidikan</p>
          <Daftar items={aparatur.per_pendidikan} labelKey="pendidikan" />
        </Kartu>

        <Kartu judul="BUM Desa">
          {bumdes ? (
            <dl className="divide-y divide-slate-100">
              <Baris label="Nama">{bumdes.nama}</Baris>
              <Baris label="Status">{bumdes.status === 'aktif' ? 'Aktif' : 'Tidak aktif'}</Baris>
              <Baris label="Badan hukum">{bumdes.badan_hukum ? 'Sudah' : 'Belum'}</Baris>
              <Baris label="Jenis usaha">{bumdes.jenis_usaha}</Baris>
              <Baris label="Tenaga kerja">{bumdes.tenaga_kerja != null ? angka(bumdes.tenaga_kerja) : null}</Baris>
              <Baris label="Nilai aset">{bumdes.nilai_aset != null ? rupiah(bumdes.nilai_aset) : null}</Baris>
              <Baris label={`Omset${bumdes.omset ? ` (${bumdes.omset.tahun})` : ''}`}>{bumdes.omset ? rupiah(bumdes.omset.nilai) : null}</Baris>
              <Baris label={`Laba${bumdes.laba ? ` (${bumdes.laba.tahun})` : ''}`}>{bumdes.laba ? rupiah(bumdes.laba.nilai) : null}</Baris>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Belum punya BUM Desa.</p>
          )}
        </Kartu>

        <Kartu judul={`Penyaluran dana TA ${rapor.tahun_dana}`}>
          {dana ? (
            <>
              <dl className="divide-y divide-slate-100">
                <Baris label="Pagu">{rupiah(dana.pagu)}</Baris>
                <Baris label="Cair">{rupiah(dana.cair)}</Baris>
                <Baris label="Persen cair">{fmtPersen(persenDana)}</Baris>
              </dl>
              <div className="mt-2"><BarMini rasio={persenDana} /></div>
              {dana.per_sumber?.length > 0 && (
                <table className="mt-3 w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500"><th className="py-1 font-semibold">Sumber</th><th className="py-1 text-right font-semibold">Pagu</th><th className="py-1 text-right font-semibold">Cair</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dana.per_sumber.map((s) => (
                      <tr key={s.sumber}>
                        <td className="py-1">{s.sumber}</td>
                        <td className="py-1 text-right tabular-nums">{rupiah(s.pagu)}</td>
                        <td className="py-1 text-right tabular-nums">{rupiah(s.cair)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">
              {sipandaGagal ? 'SIPANDA sedang tidak bisa diambil.' : 'Tidak ada data penyaluran untuk desa ini di SIPANDA.'}
            </p>
          )}
        </Kartu>

        <Kartu judul="Produk hukum" tautan={{ ke: `/core-dashboard/statistik-produk-hukum/${desa.id}`, label: 'Lihat semua' }}>
          <dl><Baris label="Total">{angka(ph.total)}</Baris></dl>
          <Daftar items={ph.per_jenis} labelKey="jenis" />
          {ph.terbaru?.length > 0 && (
            <>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Terbaru</p>
              <ul className="mt-1 space-y-1 text-sm">
                {ph.terbaru.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link to={`/core-dashboard/statistik-produk-hukum/${desa.id}`} className="text-slate-700 hover:underline">
                      {p.judul}
                    </Link>
                    <span className="block text-xs text-slate-500">{[p.jenis, p.nomor && `No. ${p.nomor}`, p.tahun].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Kartu>

        <Kartu judul="Kelembagaan & kerja sama">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              ['RW', kl.rw], ['RT', kl.rt], ['Posyandu', kl.posyandu], ['LPM', kl.lpm], ['PKK', kl.pkk],
              ['Karang Taruna', kl.karang_taruna], ['Satlinmas', kl.satlinmas], ['Lainnya', kl.lainnya], ['Kerja sama desa', rapor.kerjasama],
            ].map(([label, n]) => (
              <div key={label} className="rounded-lg bg-slate-50 px-1 py-2">
                <dd className="text-lg font-semibold tabular-nums text-slate-900">{angka(n)}</dd>
                <dt className="text-[11px] text-slate-500">{label}</dt>
              </div>
            ))}
          </dl>
        </Kartu>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ halaman -- */
const RaporWilayahPage = () => {
  const [params, setParams] = useSearchParams();
  const desaId = params.get('desa');
  const kecId = desaId ? null : params.get('kecamatan');
  const [wilayah, setWilayah] = useState([]);
  const [rapor, setRapor] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState(null); // { tidakAda, pesan }

  useEffect(() => {
    api.get('/core-dashboard/wilayah').then((r) => setWilayah(r.data?.data || [])).catch(() => setWilayah([]));
  }, []);

  const muat = useCallback(async () => {
    const jalur = desaId ? `/core-dashboard/rapor/desa/${desaId}` : kecId ? `/core-dashboard/rapor/kecamatan/${kecId}` : null;
    setGalat(null);
    setRapor(null);
    if (!jalur) return;
    setMemuat(true);
    try {
      const res = await api.get(jalur);
      setRapor(res.data?.data || null);
    } catch (e) {
      setGalat({ tidakAda: e?.response?.status === 404, pesan: e?.response?.data?.message || 'Gagal memuat rapor.' });
    } finally {
      setMemuat(false);
    }
  }, [desaId, kecId]);

  useEffect(() => {
    muat();
  }, [muat]);

  const ke = useCallback((p) => setParams(p), [setParams]);
  const kecamatanUrut = useMemo(() => [...wilayah].sort((a, b) => a.nama.localeCompare(b.nama, 'id')), [wilayah]);
  const adaRapor = Boolean(rapor);

  return (
    <div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
      <div className={`mx-auto w-full space-y-5 ${LEBAR_CORE}`}>
        <div className="print:hidden">
          <PageHeader
            icon={FileText}
            title="Rapor Wilayah"
            subtitle="Semua data satu kecamatan atau desa dalam satu halaman — profil, aparatur, BUM Desa, produk hukum, kelembagaan, dan penyaluran dana."
            actions={
              adaRapor && (
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/20 hover:bg-white/20">
                  <Printer className="h-4 w-4" aria-hidden="true" /> Cetak / PDF
                </button>
              )
            }
          />
        </div>

        <Pencari wilayah={wilayah} onPilih={(e) => ke(e.tipe === 'desa' ? { desa: e.id } : { kecamatan: e.id })} />

        {memuat && <div className="h-64 animate-pulse rounded-2xl bg-slate-200" aria-busy="true" />}

        {galat && (
          <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-700">{galat.tidakAda ? 'Wilayah tidak ditemukan' : galat.pesan}</p>
            <div className="mt-3 flex justify-center gap-2">
              {galat.tidakAda ? (
                <button type="button" onClick={() => setParams({})} className={tombolKecil}>Kembali ke pilihan</button>
              ) : (
                <button type="button" onClick={muat} className={tombolKecil}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Coba lagi</button>
              )}
            </div>
          </div>
        )}

        {!desaId && !kecId && (
          <section aria-label="Pilih kecamatan" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {kecamatanUrut.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => ke({ kecamatan: k.id })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-medium text-slate-800 hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30"
              >
                {k.nama}
                <span className="block text-xs font-normal text-slate-500">{angka(k.desa.length)} desa/kelurahan</span>
              </button>
            ))}
          </section>
        )}

        {rapor && (desaId ? <RaporDesa rapor={rapor} /> : <RaporKecamatan rapor={rapor} ke={ke} />)}
      </div>
    </div>
  );
};

export default RaporWilayahPage;
