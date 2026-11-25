import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { persen, fmtPersen } from '../../utils/persen';
import { eksporExcel, eksporPdf } from '../../utils/eksporTabel';
import { useAstaDesa } from './asta-desa/useAstaDesa';
import { LEBAR_CORE } from './lebarHalaman';
import { KartuIndikator, PanelPerhatian, BarMini } from './ringkasan/ui';
import { rupiah, angka, fmtSkor, normNama } from './ringkasan/format';
import './WelcomeDashboard.css';
import {
  Sunrise,
  Sun,
  Sunset,
  Moon,
  RefreshCw,
  Wallet,
  Satellite,
  Store,
  UserCheck,
  MapPin,
  Scale,
  Gauge,
  Map as IkonPeta,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

const GREETINGS = [
  { until: 11, text: 'Selamat pagi', Icon: Sunrise },
  { until: 15, text: 'Selamat siang', Icon: Sun },
  { until: 18, text: 'Selamat sore', Icon: Sunset },
  { until: 24, text: 'Selamat malam', Icon: Moon },
];

const KETERANGAN_INDEKS = 'Rata-rata 4 indikator per desa: profil, kepala desa, BUM Desa aktif, Perdes';

const rasio = (n, d) => persen(n, d);
const pecah = (n, d) => `${angka(n)}/${angka(d)}`;

// Nilai urut per kolom; null selalu ditaruh di bawah.
const KOLOM = [
  { k: 'nama', label: 'Kecamatan', nilai: (r) => r.nama },
  { k: 'skor', label: 'Indeks', nilai: (r) => r.skor },
  { k: 'dana', label: 'Dana cair', nilai: (r) => (r.dana ? rasio(r.dana.cair, r.dana.pagu) : null) },
  { k: 'asta', label: 'Asta Desa', nilai: (r) => r.asta },
  { k: 'bumdes', label: 'BUM Desa aktif', nilai: (r) => rasio(r.bumdes_aktif, r.desa) },
  { k: 'kades', label: 'Kades', nilai: (r) => rasio(r.kades, r.desa) },
  { k: 'profil', label: 'Profil', nilai: (r) => rasio(r.profil_lengkap, r.desa) },
  { k: 'perdes', label: 'Perdes', nilai: (r) => rasio(r.desa_punya_perdes, r.desa) },
];

const WelcomeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [urut, setUrut] = useState({ k: 'skor', arah: 'asc' });
  const asta = useAstaDesa('/target-kk', { hari: 30 });

  // Jam tanpa detik: cukup tiap 30 detik, halaman ini berisi tabel besar.
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const res = await api.get('/core-dashboard/ringkasan');
      setData(res.data?.data || null);
    } catch (e) {
      setGalat(e?.response?.data?.message || 'Gagal memuat ringkasan.');
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  const greeting =
    GREETINGS.find((item) => currentTime.getHours() < item.until) ||
    GREETINGS[GREETINGS.length - 1];
  const GreetingIcon = greeting.Icon;

  const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const roleLabel = user?.role?.replace(/_/g, ' ') || 'Pengguna';

  const ringkasanAsta = asta.galat ? null : asta.data?.ringkasan;
  const perKecAsta = useMemo(() => {
    const peta = new Map();
    (asta.data?.per_kecamatan || []).forEach((k) => peta.set(normNama(k.kecamatan), k.persen));
    return peta;
  }, [asta.data?.per_kecamatan]);

  const baris = useMemo(
    () =>
      (data?.per_kecamatan || []).map((r) => ({
        ...r,
        asta: perKecAsta.get(normNama(r.nama)) ?? null,
      })),
    [data?.per_kecamatan, perKecAsta]
  );

  const barisUrut = useMemo(() => {
    const kol = KOLOM.find((c) => c.k === urut.k) || KOLOM[1];
    const arah = urut.arah === 'asc' ? 1 : -1;
    return [...baris].sort((a, b) => {
      const x = kol.nilai(a);
      const y = kol.nilai(b);
      if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1;
      if (y === null || y === undefined) return -1;
      if (typeof x === 'string') return arah * x.localeCompare(y, 'id');
      return arah * (x - y) || a.nama.localeCompare(b.nama, 'id');
    });
  }, [baris, urut]);

  const klikHeader = (k) =>
    setUrut((u) => (u.k === k ? { k, arah: u.arah === 'asc' ? 'desc' : 'asc' } : { k, arah: 'asc' }));

  const kolomEkspor = [
    { label: 'Kecamatan', nilai: (r) => r.nama },
    { label: 'Indeks', nilai: (r) => (r.skor === null ? '' : fmtSkor(r.skor)) },
    { label: 'Dana cair', nilai: (r) => (r.dana ? fmtPersen(rasio(r.dana.cair, r.dana.pagu)) : '') },
    { label: 'Asta Desa', nilai: (r) => (r.asta === null ? '' : fmtPersen(r.asta)) },
    { label: 'BUM Desa aktif', nilai: (r) => pecah(r.bumdes_aktif, r.desa) },
    { label: 'Kades', nilai: (r) => pecah(r.kades, r.desa) },
    { label: 'Profil lengkap', nilai: (r) => pecah(r.profil_lengkap, r.desa) },
    { label: 'Perdes', nilai: (r) => pecah(r.desa_punya_perdes, r.desa) },
  ];
  const ekspor = (fn) =>
    fn({
      kolom: kolomEkspor,
      baris: barisUrut,
      namaBerkas: 'peringkat-kecamatan',
      judul: 'Peringkat Kelengkapan Data per Kecamatan',
      namaSheet: 'Peringkat kecamatan',
    });

  const t = data?.total;
  const sipandaGagal = data?.sumber_gagal?.includes('sipanda');
  const diperbarui = data?.diperbarui
    ? new Date(data.diperbarui).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
      <div className={`mx-auto w-full space-y-5 ${LEBAR_CORE}`}>
        <section className="welcome-hero welcome-rise rounded-2xl px-6 py-6 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/10 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-400">
                <GreetingIcon className="h-4 w-4 shrink-0" />
                {greeting.text}
                {user?.nama ? ',' : ''}
              </p>
              <h1 className="mt-1 break-words text-2xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                {user?.nama || 'Selamat datang'}
              </h1>
              <p className="mt-3 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium capitalize tracking-wide text-slate-300">
                {roleLabel}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center lg:gap-6">
              <div className="lg:text-right">
                <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-white">{formattedTime}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-brand-400">{formattedDate}</p>
              </div>
              <div className="flex items-center gap-3 border-white/10 sm:border-l sm:pl-6">
                {diperbarui && <span className="text-xs text-slate-400">Data per {diperbarui}</span>}
                <button
                  type="button"
                  onClick={muat}
                  disabled={memuat}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${memuat ? 'animate-spin' : ''}`} aria-hidden="true" /> Muat ulang
                </button>
              </div>
            </div>
          </div>
        </section>

        {galat && !data && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-6 text-center">
            <p className="text-sm text-rose-700">{galat}</p>
            <button type="button" onClick={muat} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Coba lagi
            </button>
          </div>
        )}

        {memuat && !data && !galat && (
          <div className="space-y-4" aria-busy="true">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
              ))}
            </div>
            <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        )}

        {data && t && (
          <>
            {sipandaGagal && (
              <div role="status" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                Data penyaluran SIPANDA sedang tidak bisa diambil; indikator dana tidak ditampilkan.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {t.dana && (
                <KartuIndikator
                  ikon={Wallet}
                  label={`Dana desa cair TA ${data.tahun_dana}`}
                  nilai={fmtPersen(persen(t.dana.cair, t.dana.pagu))}
                  sub={`${rupiah(t.dana.cair)} dari ${rupiah(t.dana.pagu)}`}
                  rasio={persen(t.dana.cair, t.dana.pagu)}
                  ke="/core-dashboard/statistik-kkd"
                />
              )}
              {ringkasanAsta?.desa_bertarget > 0 && (
                <KartuIndikator
                  ikon={Satellite}
                  label="Capaian target KK Asta Desa"
                  nilai={fmtPersen(ringkasanAsta.persen)}
                  sub={`${angka(ringkasanAsta.terkumpul)} dari ${angka(ringkasanAsta.target)} target KK · ${angka(ringkasanAsta.desa_tembus)}/${angka(ringkasanAsta.desa_bertarget)} desa tembus`}
                  rasio={ringkasanAsta.persen}
                  ke="/core-dashboard/asta-desa"
                />
              )}
              <KartuIndikator
                ikon={Store}
                label="BUM Desa aktif"
                nilai={`${angka(t.bumdes_aktif)} dari ${angka(t.desa)} desa`}
                sub={`${angka(t.bumdes_berbadan_hukum)} berbadan hukum · ${angka(t.bumdes)} terdaftar`}
                rasio={rasio(t.bumdes_aktif, t.desa)}
                ke="/core-dashboard/statistik-bumdes"
              />
              <KartuIndikator
                ikon={UserCheck}
                label="Kepala desa tercatat"
                nilai={`${angka(t.kades)} dari ${angka(t.desa)} desa`}
                sub={`${angka(t.aparatur)} aparatur aktif`}
                rasio={rasio(t.kades, t.desa)}
                ke="/core-dashboard/statistik-aparatur-desa"
              />
              <KartuIndikator
                ikon={MapPin}
                label="Profil desa lengkap"
                nilai={`${angka(t.profil_lengkap)} dari ${angka(t.desa)} desa`}
                sub={`${angka(t.penduduk)} jiwa tercatat`}
                rasio={rasio(t.profil_lengkap, t.desa)}
                ke="/core-dashboard/statistik-profil-desa"
              />
              <KartuIndikator
                ikon={Scale}
                label="Desa punya Perdes"
                nilai={`${angka(t.desa_punya_perdes)} dari ${angka(t.desa)} desa`}
                sub={`${angka(t.produk_hukum)} produk hukum`}
                rasio={rasio(t.desa_punya_perdes, t.desa)}
                ke="/core-dashboard/statistik-produk-hukum"
              />
              <KartuIndikator
                ikon={Gauge}
                label="Indeks kelengkapan data"
                nilai={fmtSkor(t.skor)}
                sub={KETERANGAN_INDEKS}
                title={KETERANGAN_INDEKS}
                rasio={t.skor ?? undefined}
              />
              <KartuIndikator
                ikon={IkonPeta}
                label="Wilayah"
                nilai={`${angka(data.wilayah?.kecamatan)} kecamatan`}
                sub={`${angka(data.wilayah?.desa)} desa · ${angka(data.wilayah?.kelurahan)} kelurahan`}
                ke="/core-dashboard/rapor-wilayah"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <PanelPerhatian
                  perhatian={data.perhatian}
                  keRapor={(id) => `/core-dashboard/rapor-wilayah?desa=${id}`}
                />
              </div>
              <section className="rounded-2xl border border-slate-200 bg-white lg:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">Peringkat kecamatan</h2>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => ekspor(eksporExcel)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" /> Excel
                    </button>
                    <button type="button" onClick={() => ekspor(eksporPdf)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" /> PDF
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-500">
                        {KOLOM.map((c) => (
                          <th
                            key={c.k}
                            scope="col"
                            aria-sort={urut.k === c.k ? (urut.arah === 'asc' ? 'ascending' : 'descending') : 'none'}
                            className="px-3 py-2 font-semibold"
                          >
                            <button type="button" onClick={() => klikHeader(c.k)} className="uppercase tracking-wider hover:text-slate-900">
                              {c.label}
                              {urut.k === c.k ? (urut.arah === 'asc' ? ' ↑' : ' ↓') : ''}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {barisUrut.map((r) => (
                        <tr
                          key={r.id}
                          tabIndex={0}
                          onClick={() => navigate(`/core-dashboard/rapor-wilayah?kecamatan=${r.id}`)}
                          onKeyDown={(e) => e.key === 'Enter' && navigate(`/core-dashboard/rapor-wilayah?kecamatan=${r.id}`)}
                          className="cursor-pointer hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-100"
                        >
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{r.nama}</td>
                          <td className="px-3 py-2">
                            {r.skor === null ? (
                              '—'
                            ) : (
                              <div className="flex min-w-[88px] items-center gap-2">
                                <span className="w-9 tabular-nums">{fmtSkor(r.skor)}</span>
                                <div className="flex-1"><BarMini rasio={r.skor} className="h-1" /></div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{r.dana ? fmtPersen(rasio(r.dana.cair, r.dana.pagu)) : '—'}</td>
                          <td className="px-3 py-2 tabular-nums">{r.asta === null ? '—' : fmtPersen(r.asta)}</td>
                          <td className="px-3 py-2 tabular-nums">{pecah(r.bumdes_aktif, r.desa)}</td>
                          <td className="px-3 py-2 tabular-nums">{pecah(r.kades, r.desa)}</td>
                          <td className="px-3 py-2 tabular-nums">{pecah(r.profil_lengkap, r.desa)}</td>
                          <td className="px-3 py-2 tabular-nums">{pecah(r.desa_punya_perdes, r.desa)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <p className="text-xs text-slate-400">
              Sumber: basis data DPMD (langsung), SIPANDA TA {data.tahun_dana} (disimpan 5 menit), ASTA DESA.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default WelcomeDashboard;
