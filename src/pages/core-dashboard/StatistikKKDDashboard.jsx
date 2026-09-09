// Statistik KKD (Kekayaan & Keuangan Desa) — dashboard gabungan.
// Menyatukan KELIMA sumber dana SIPANDA — ADD, BHPRD, DD, BANKEU, dan BP —
// dalam satu halaman untuk Core Dashboard. Setiap tab merender
// PenyaluranDashboard dalam mode `embedded` supaya judul dan tombol kembali
// miliknya tidak tampil dua kali.
//
// TABNYA MEMBAWA ANGKANYA SENDIRI. Halaman ini dibaca pimpinan yang butuh
// jawaban cepat, dan tab yang cuma bertuliskan nama dana memaksa mereka
// mengklik lima kali hanya untuk tahu lima angka. Karena useSipanda memakai
// cache satu modul, membaca datanya di sini TIDAK menambah satu pun panggilan
// jaringan — angkanya sudah ada, tinggal ditampilkan. Jadi sekali halaman
// terbuka, seluruh posisi penyaluran se-Kabupaten terbaca tanpa interaksi apa
// pun; tab hanya dipakai kalau ingin menggali salah satunya.
//
// Daftar tab di bawah harus tetap sepadan dengan sumber dana yang benar-benar
// dikembalikan SIPANDA. Per 2026 API-nya berisi: ADD, DD REGULER, BHPRD,
// BANKEU AKSELERASI PEDESAAN, dan BP. Nama pos BANKEU berganti antar tahun,
// jadi penyaringnya ada di BankeuDashboard, bukan di sini.
import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Building2, DollarSign, Landmark, Sprout, TrendingUp, Wallet } from 'lucide-react';
import PageHeader from '../../components/statistik/PageHeader';
import { useSipanda } from '../../hooks/useSipanda';

const AddDashboard = lazy(() => import('../bidang/kkd/add/AddDashboard'));
const BhprdDashboard = lazy(() => import('../bidang/kkd/BhprdDashboard'));
const DdDashboard = lazy(() => import('../bidang/kkd/dd/DdDashboard'));
const BankeuDashboard = lazy(() => import('../bidang/kkd/BankeuDashboard'));
const BpDashboard = lazy(() => import('../bidang/kkd/BpDashboard'));

const TABS = [
  {
    key: 'add',
    label: 'ADD',
    fullLabel: 'Alokasi Dana Desa',
    icon: DollarSign,
    Component: AddDashboard,
    cocok: (s) => s === 'ADD',
  },
  {
    key: 'bhprd',
    label: 'BHPRD',
    fullLabel: 'Bagi Hasil Pajak & Retribusi',
    icon: Landmark,
    Component: BhprdDashboard,
    cocok: (s) => s === 'BHPRD',
  },
  {
    key: 'dd',
    label: 'DD',
    fullLabel: 'Dana Desa',
    icon: TrendingUp,
    Component: DdDashboard,
    cocok: (s) => s.startsWith('DD'),
  },
  {
    key: 'bankeu',
    label: 'BANKEU',
    fullLabel: 'Bantuan Keuangan Desa',
    icon: Building2,
    Component: BankeuDashboard,
    cocok: (s) => s.startsWith('BANKEU'),
  },
  {
    key: 'bp',
    label: 'BP',
    fullLabel: 'Bantuan Provinsi',
    icon: Sprout,
    Component: BpDashboard,
    cocok: (s) => s === 'BP',
  },
];

// Rp dalam satuan yang enak dibaca sekilas. Pimpinan membaca "Rp 406,9 M",
// bukan dua belas digit — angka penuhnya tetap tersedia lewat title.
const fmtRp = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e12) return `Rp ${(v / 1e12).toFixed(2).replace('.', ',')} T`;
  if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1).replace('.', ',')} M`;
  if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(0)} Jt`;
  return `Rp ${Math.round(v).toLocaleString('id-ID')}`;
};
const fmtRpPenuh = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

const TabSpinner = () => (
  <div className="flex items-center justify-center py-32">
    <div className="text-center">
      <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
      <p className="text-sm text-slate-500">Memuat data…</p>
    </div>
  </div>
);

const StatistikKKDDashboard = () => {
  const [activeTab, setActiveTab] = useState('add');
  const current = TABS.find((t) => t.key === activeTab);

  // Panggilan yang sama dipakai tiap tab; cache modul useSipanda memastikan
  // hanya ada SATU permintaan jaringan untuk seluruh halaman.
  const { rows, loading } = useSipanda();

  // Ringkasan tiap sumber dana: pagu, yang sudah cair, dan porsinya.
  const ringkas = useMemo(() => {
    const hasil = {};
    TABS.forEach((t) => { hasil[t.key] = { pagu: 0, cair: 0, pct: 0 }; });
    rows.forEach((r) => {
      const nama = String(r.sumber_dana || '').toUpperCase();
      const tab = TABS.find((t) => t.cocok(nama));
      if (!tab) return;
      const nilai = parseFloat(r.anggaran || 0) || 0;
      hasil[tab.key].pagu += nilai;
      if (String(r.sudah_cair).toUpperCase() === 'Y') hasil[tab.key].cair += nilai;
    });
    Object.values(hasil).forEach((h) => {
      h.pct = h.pagu > 0 ? Math.round((h.cair / h.pagu) * 100) : 0;
    });
    return hasil;
  }, [rows]);

  const totalPagu = useMemo(
    () => Object.values(ringkas).reduce((s, h) => s + h.pagu, 0),
    [ringkas]
  );
  const totalCair = useMemo(
    () => Object.values(ringkas).reduce((s, h) => s + h.cair, 0),
    [ringkas]
  );
  const totalPct = totalPagu > 0 ? Math.round((totalCair / totalPagu) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-6">
      {/* Lebih lebar dari max-w-7xl: di layar besar, lima kartu dana dan tabel
          rekap per kecamatan sebelumnya terjepit di tengah sementara ruang di
          kiri-kanan menganggur. */}
      <div className="mx-auto max-w-[104rem] space-y-5">
        <PageHeader
          icon={Wallet}
          title="Statistik Keuangan Desa"
          subtitle="Seluruh sumber dana SIPANDA se-Kabupaten Bogor — ADD, BHPRD, Dana Desa, Bantuan Keuangan, dan Bantuan Provinsi. Langsung dari sumbernya."
        />

        {/* Total gabungan — satu kalimat jawaban untuk "berapa yang sudah
            tersalur tahun ini?", tanpa perlu membuka satu tab pun. */}
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-slate-500">
                Total tersalur, semua sumber dana
              </p>
              <div className="mt-2.5 flex flex-wrap items-end gap-x-4 gap-y-1">
                <span
                  className="text-[40px] font-extrabold leading-none tracking-tight text-slate-900 sm:text-[52px]"
                  title={fmtRpPenuh(totalCair)}
                >
                  {loading ? '—' : fmtRp(totalCair)}
                </span>
                <span className="pb-1.5 text-[15px] font-medium text-slate-400" title={fmtRpPenuh(totalPagu)}>
                  dari {loading ? '—' : fmtRp(totalPagu)} pagu
                </span>
              </div>
            </div>
            <div className="shrink-0 sm:text-right">
              <span className="text-[34px] font-extrabold leading-none tracking-tight text-emerald-600 sm:text-[40px]">
                {loading ? '—' : `${totalPct}%`}
              </span>
              <p className="mt-1.5 text-[14px] font-medium text-slate-500">sudah dicairkan</p>
            </div>
          </div>
          <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${totalPct}%` }}
            />
          </div>
        </div>

        {/* Kartu sumber dana. Sekaligus jadi tab: sudah membawa angkanya, jadi
            berguna dibaca walau tidak diklik. Grid, bukan baris yang digeser —
            bilah geser membuat dua dana terakhir tidak pernah terlihat. */}
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          role="tablist"
          aria-label="Sumber dana"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const r = ringkas[tab.key] || { pagu: 0, cair: 0, pct: 0 };
            const kosong = !loading && r.pagu === 0;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`group flex flex-col rounded-2xl border p-5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 ${
                  isActive
                    ? 'border-slate-900 bg-slate-900'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Baris judul: nama dana dan persentasenya berdampingan.
                    Persen ditaruh paling kanan karena itulah yang dipindai
                    mata saat membandingkan lima kartu sekaligus. */}
                <span className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className={`truncate text-[16px] font-bold tracking-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {tab.label}
                    </span>
                  </span>
                  {!loading && !kosong && (
                    <span className={`shrink-0 text-[17px] font-bold tabular-nums ${isActive ? 'text-white' : 'text-emerald-600'}`}>
                      {r.pct}%
                    </span>
                  )}
                </span>

                <span className={`mt-1 block truncate text-[13px] ${isActive ? 'text-slate-400' : 'text-slate-500'}`} title={tab.fullLabel}>
                  {tab.fullLabel}
                </span>

                <span className="mt-4 flex flex-wrap items-baseline gap-x-2">
                  <span
                    className={`text-[24px] font-extrabold leading-none tracking-tight tabular-nums ${
                      isActive ? 'text-white' : 'text-slate-900'
                    }`}
                    title={fmtRpPenuh(r.cair)}
                  >
                    {loading ? '—' : fmtRp(r.cair)}
                  </span>
                  {!loading && !kosong && (
                    <span className={`text-[13px] font-medium ${isActive ? 'text-slate-400' : 'text-slate-400'}`} title={fmtRpPenuh(r.pagu)}>
                      dari {fmtRp(r.pagu)}
                    </span>
                  )}
                </span>

                <span className={`mt-3.5 h-2 w-full overflow-hidden rounded-full ${isActive ? 'bg-white/15' : 'bg-slate-100'}`}>
                  <span
                    className={`block h-full rounded-full transition-all duration-700 ${
                      isActive ? 'bg-white' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${r.pct}%` }}
                  />
                </span>

                {/* Rp 0 di sini bukan kerusakan: BP memang belum dialokasikan
                    provinsi. Dikatakan apa adanya supaya tidak dikira galat.
                    Untuk dana yang normal, keterangannya tidak perlu — persen
                    dan bilahnya sudah bicara. */}
                {(loading || kosong) && (
                  <span className={`mt-3 text-[13px] font-medium ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                    {loading ? 'memuat…' : 'belum ada alokasi'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Isi tab */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <Suspense fallback={<TabSpinner />}>
            {current && <current.Component embedded />}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default StatistikKKDDashboard;
