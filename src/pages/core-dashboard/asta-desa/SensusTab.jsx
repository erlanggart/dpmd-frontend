/**
 * Tab Data Sensus — tabel keluarga terdata, plus panel detail satu keluarga.
 *
 * PENCARIAN & PAGINASI DIKERJAKAN DI SISI ASTA DESA, tidak di browser. Tabel
 * `sensuses` di sana berisi ribuan baris dan punya indeksnya sendiri; menarik
 * semuanya ke browser lalu menyaringnya dengan `filter()` berarti memindahkan
 * megabyte data pribadi ke perangkat pembaca untuk menampilkan 25 baris.
 *
 * NIK DAN NOMOR KK DISAMARKAN DI TABEL. Yang dibutuhkan saat memindai daftar
 * adalah "apakah ini orang yang saya cari", dan empat digit terakhir sudah
 * menjawabnya. Nomor utuhnya tetap ada di panel detail — satu klik jauhnya,
 * tetapi tidak terpampang di layar yang kebetulan sedang diproyeksikan.
 */

import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  SlidersHorizontal,
  UserRound,
  X
} from 'lucide-react';
import { Galat, Kosong, Lencana, Memuat, Panel } from './ui';
import { useAstaDesa } from './useAstaDesa';
import { angka, peringkatStatus, rapikanLabel, tanggalSingkat, warnaStatus } from './warna';

/** "3271012345670001" -> "3271 •••• •••• 0001" */
const samarkan = (nomor) => {
  const s = String(nomor || '').replace(/\s+/g, '');
  if (!s) return '—';
  if (s.length <= 8) return s;
  return `${s.slice(0, 4)} •••• •••• ${s.slice(-4)}`;
};

// Kolom yang sudah tampil di kepala panel detail, jangan diulang di daftar
// "seluruh kolom" di bawahnya.
const KOLOM_DIPAKAI_DI_KEPALA = new Set([
  'id',
  'kk_nama',
  'nama_kk',
  'kk_nik',
  'nik',
  'kk_no_kk',
  'no_kk',
  'kecamatan',
  'desa',
  'status',
  'nama_petugas',
  'tanggal_pendataan'
]);

/** Apakah nilai ini layak ditampilkan sebagai satu baris keterangan? */
const layakTampil = (nilai) =>
  nilai !== null && nilai !== undefined && nilai !== '' && typeof nilai !== 'object';

/**
 * Usia anggota keluarga.
 *
 * `sensus_anggotas` ASTA DESA hanya menyimpan `tanggal_lahir` — tidak ada kolom
 * umur — jadi usianya dihitung di sini. Tanpa ini kolom usia selalu bertuliskan
 * "—" padahal tanggal lahirnya ada.
 */
const usiaDari = (a) => {
  const langsung = a?.umur ?? a?.usia;
  if (langsung !== null && langsung !== undefined && langsung !== '') return langsung;

  const lahir = a?.tanggal_lahir || a?.tgl_lahir || a?.birth_date;
  if (!lahir) return null;
  const d = new Date(lahir);
  if (Number.isNaN(d.getTime())) return null;
  const tahun = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return tahun >= 0 && tahun < 130 ? tahun : null;
};

/**
 * Panel detail satu keluarga.
 *
 * Isinya dirender dari kunci apa pun yang dikirim ASTA DESA, bukan dari daftar
 * kolom yang kita tulis tangan. Tabel di sana punya ~100 kolom dan bertambah;
 * daftar tulis-tangan akan diam-diam menyembunyikan kolom baru, dan pembaca
 * tidak punya cara tahu ada yang hilang.
 */
export const PanelDetail = ({ id, onTutup }) => {
  const { data, memuat, galat, ambil } = useAstaDesa(`/sensus/${id}`, {}, { aktif: Boolean(id) });

  // Backend meratakan detail menjadi `{ sensus, anggotas, petugas }` — lihat
  // getSensusDetail di astadesa.controller.js untuk alasannya. Cadangan `?? data`
  // menjaga panel ini tetap terisi bila suatu saat backend mengirim bentuk rata.
  const sensus = data?.sensus ?? data ?? null;
  const petugas = data?.petugas ?? null;

  const anggota = useMemo(() => {
    const kandidat = data?.anggotas || sensus?.anggotas || sensus?.anggota || sensus?.sensus_anggotas;
    return Array.isArray(kandidat) ? kandidat : [];
  }, [data?.anggotas, sensus]);

  const kolomLain = useMemo(() => {
    if (!sensus) return [];
    return Object.entries(sensus)
      .filter(([k, v]) => !KOLOM_DIPAKAI_DI_KEPALA.has(k) && layakTampil(v))
      .map(([k, v]) => ({ kunci: k, nilai: v }));
  }, [sensus]);

  return (
    <div className="fixed inset-0 z-[600] flex justify-end">
      <button
        type="button"
        aria-label="Tutup detail"
        onClick={onTutup}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
      />
      <aside className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">Detail sensus</p>
            <h3 className="mt-0.5 truncate text-base font-semibold tracking-tight text-slate-900">
              {sensus?.kk_nama || sensus?.nama_kk || `Sensus #${id}`}
            </h3>
            {sensus && (
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {sensus.desa || '—'}, Kec. {sensus.kecamatan || '—'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onTutup}
            className="flex-shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {galat ? (
            <Galat pesan={galat} onUlang={ambil} />
          ) : memuat && !data ? (
            <Memuat pesan="Memuat detail keluarga…" />
          ) : !sensus ? (
            <Kosong pesan="Detail tidak ditemukan." />
          ) : (
            <div className="space-y-5">
              {/* Identitas — nomor utuh, hanya di sini. */}
              <dl className="grid grid-cols-2 gap-3">
                {[
                  ['NIK kepala keluarga', sensus.kk_nik || sensus.nik],
                  ['Nomor KK', sensus.kk_no_kk || sensus.no_kk],
                  ['Tahap verifikasi', rapikanLabel(sensus.status)],
                  // `nama_petugas` ada di baris sensus; objek `petugas` dipakai
                  // sebagai cadangan untuk baris yang kolom itunya kosong.
                  ['Petugas', sensus.nama_petugas || petugas?.name || petugas?.nama || '—'],
                  ['Tanggal pendataan', tanggalSingkat(sensus.tanggal_pendataan)],
                  ['Anggota keluarga', anggota.length ? `${anggota.length} orang` : '—']
                ].map(([label, nilai]) => (
                  <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
                    <dd className="mt-0.5 break-words text-sm font-medium text-slate-900">{nilai || '—'}</dd>
                  </div>
                ))}
              </dl>

              {anggota.length > 0 && (
                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Anggota keluarga
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[380px] text-left text-xs">
                      <thead className="bg-slate-50">
                        <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2">Nama</th>
                          <th className="px-3 py-2">L/P</th>
                          <th className="px-3 py-2 text-right">Usia</th>
                          <th className="px-3 py-2">Hubungan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {anggota.map((a, i) => (
                          <tr key={a.id ?? i}>
                            <td className="px-3 py-2 font-medium text-slate-900">{a.nama || '—'}</td>
                            <td className="px-3 py-2 text-slate-600">{a.jenis_kelamin || a.jk || '—'}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                              {usiaDari(a) ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {rapikanLabel(a.hubungan_kk || a.hubungan_keluarga || a.hubungan || a.shdk || '')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Seluruh kolom terisi ({kolomLain.length})
                </h4>
                <dl className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                  {kolomLain.map(({ kunci, nilai }) => (
                    <div key={kunci} className="flex items-start gap-3 px-3 py-2 odd:bg-slate-50/60">
                      <dt className="w-[46%] flex-shrink-0 text-xs text-slate-500">{rapikanLabel(kunci)}</dt>
                      <dd className="min-w-0 flex-1 break-words text-xs font-medium text-slate-900">
                        {typeof nilai === 'boolean' ? (nilai ? 'Ya' : 'Tidak') : String(nilai)}
                      </dd>
                    </div>
                  ))}
                </dl>
                {kolomLain.length === 0 && <Kosong pesan="Tidak ada kolom tambahan yang terisi." />}
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

const SensusTab = ({ ringkasan }) => {
  const [halaman, setHalaman] = useState(1);
  const [cari, setCari] = useState('');
  const [cariAktif, setCariAktif] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [status, setStatus] = useState('');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [terpilih, setTerpilih] = useState(null);

  const params = useMemo(
    () => ({
      page: halaman,
      per_page: 25,
      ...(cariAktif ? { search: cariAktif } : {}),
      ...(kecamatan ? { kecamatan } : {}),
      ...(status ? { status } : {}),
      ...(dari ? { dari } : {}),
      ...(sampai ? { sampai } : {})
    }),
    [halaman, cariAktif, kecamatan, status, dari, sampai]
  );

  const { data, meta, memuat, galat, ambil } = useAstaDesa('/sensus', params);

  const daftarKecamatan = useMemo(
    () => (ringkasan?.per_kecamatan || []).map((k) => k.kecamatan),
    [ringkasan]
  );
  const daftarStatus = useMemo(
    () =>
      (ringkasan?.per_status || [])
        .map((s) => s.status)
        .sort((a, b) => peringkatStatus(a) - peringkatStatus(b)),
    [ringkasan]
  );

  const adaPenyaring = cariAktif || kecamatan || status || dari || sampai;

  const gantiPenyaring = (setter) => (nilai) => {
    setter(nilai);
    // Pindah penyaring SELALU kembali ke halaman 1. Tanpa ini, pembaca yang
    // sedang di halaman 12 lalu memilih satu kecamatan akan melihat tabel
    // kosong dan menyimpulkan kecamatannya tidak punya data.
    setHalaman(1);
  };

  const kirimCari = (e) => {
    e.preventDefault();
    setCariAktif(cari.trim());
    setHalaman(1);
  };

  const total = meta?.total ?? 0;
  const halamanAkhir = meta?.last_page ?? 1;

  return (
    <div className="space-y-4">
      <Panel
        judul="Data keluarga terdata"
        keterangan={
          total
            ? `${angka(total)} baris cocok${adaPenyaring ? ' dengan penyaring saat ini' : ''} · halaman ${meta?.current_page ?? halaman} dari ${angka(halamanAkhir)}`
            : 'Cari berdasarkan nama, NIK, nomor KK, atau nama petugas.'
        }
        padat
      >
        {/* Penyaring: satu baris di atas tabel, tidak di dalam laci tersembunyi. */}
        <div className="space-y-2.5 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <form onSubmit={kirimCari} className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Nama KK, NIK, nomor KK, atau nama petugas…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition-colors placeholder:font-normal placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Cari
            </button>
            {adaPenyaring && (
              <button
                type="button"
                onClick={() => {
                  setCari('');
                  setCariAktif('');
                  setKecamatan('');
                  setStatus('');
                  setDari('');
                  setSampai('');
                  setHalaman(1);
                }}
                className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Bersihkan
              </button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:flex">
              <SlidersHorizontal className="h-3 w-3" />
              Saring
            </span>
            <select
              value={kecamatan}
              onChange={(e) => gantiPenyaring(setKecamatan)(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 sm:max-w-[190px]"
            >
              <option value="">Semua kecamatan</option>
              {daftarKecamatan.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => gantiPenyaring(setStatus)(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 sm:max-w-[190px]"
            >
              <option value="">Semua tahap</option>
              {daftarStatus.map((s) => (
                <option key={s} value={s}>
                  {rapikanLabel(s)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              Dari
              <input
                type="date"
                value={dari}
                onChange={(e) => gantiPenyaring(setDari)(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-400"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              s.d.
              <input
                type="date"
                value={sampai}
                onChange={(e) => gantiPenyaring(setSampai)(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-400"
              />
            </label>
          </div>
        </div>

        {galat ? (
          <div className="p-4 sm:p-5">
            <Galat pesan={galat} onUlang={ambil} />
          </div>
        ) : memuat && !data ? (
          <Memuat pesan="Memuat data sensus…" />
        ) : !data?.length ? (
          <Kosong
            pesan={
              adaPenyaring
                ? 'Tidak ada baris yang cocok dengan penyaring ini.'
                : 'Belum ada data sensus yang bisa ditampilkan.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5 sm:px-5">Kepala keluarga</th>
                    <th className="px-3 py-2.5">NIK</th>
                    <th className="px-3 py-2.5">Nomor KK</th>
                    <th className="px-3 py-2.5">Wilayah</th>
                    <th className="px-3 py-2.5">Tahap</th>
                    <th className="px-3 py-2.5">Petugas</th>
                    <th className="px-3 py-2.5">Didata</th>
                    <th className="px-4 py-2.5 text-center sm:px-5">Peta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setTerpilih(r.id)}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-2.5 sm:px-5">
                        <span className="flex items-center gap-2">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <UserRound className="h-3 w-3" />
                          </span>
                          <span className="font-semibold text-slate-900">{r.kk_nama || '—'}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-500">{samarkan(r.kk_nik)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-500">{samarkan(r.kk_no_kk)}</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {r.desa}
                        <span className="block text-[11px] text-slate-400">Kec. {r.kecamatan}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Lencana warna={warnaStatus(r.status)}>{rapikanLabel(r.status)}</Lencana>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{r.petugas || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{tanggalSingkat(r.tanggal)}</td>
                      <td className="px-4 py-2.5 text-center sm:px-5">
                        {r.lat !== null ? (
                          <MapPin className="mx-auto h-3.5 w-3.5 text-slate-400" title="Berkoordinat" />
                        ) : (
                          <span className="text-slate-300" title="Tanpa koordinat">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginasi */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
              <p className="text-[11px] text-slate-500">
                Menampilkan {angka(data.length)} dari {angka(total)} baris
                {memuat && <span className="ml-2 text-slate-400">memuat…</span>}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={halaman <= 1}
                  onClick={() => setHalaman((h) => Math.max(1, h - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Sebelumnya
                </button>
                <span className="px-2 text-[11px] font-semibold tabular-nums text-slate-700">
                  {meta?.current_page ?? halaman} / {angka(halamanAkhir)}
                </span>
                <button
                  type="button"
                  disabled={halaman >= halamanAkhir}
                  onClick={() => setHalaman((h) => h + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Berikutnya
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>

      {terpilih && <PanelDetail id={terpilih} onTutup={() => setTerpilih(null)} />}
    </div>
  );
};

export default SensusTab;
