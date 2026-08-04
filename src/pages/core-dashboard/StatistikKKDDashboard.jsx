// Statistik KKD (Kekayaan & Keuangan Desa) — dashboard gabungan.
// Menyatukan ADD, BHPRD, dan DD dalam satu halaman bertab untuk Core Dashboard.
// Setiap tab merender PenyaluranDashboard dalam mode `embedded` supaya judul
// dan tombol kembali miliknya tidak tampil dua kali.
import React, { useState, lazy, Suspense } from 'react';
import { DollarSign, Landmark, TrendingUp, Wallet } from 'lucide-react';
import PageHeader from '../../components/statistik/PageHeader';

const AddDashboard = lazy(() => import('../bidang/kkd/add/AddDashboard'));
const BhprdDashboard = lazy(() => import('../bidang/kkd/BhprdDashboard'));
const DdDashboard = lazy(() => import('../bidang/kkd/dd/DdDashboard'));

const TABS = [
  {
    key: 'add',
    label: 'ADD',
    fullLabel: 'Alokasi Dana Desa',
    desc: 'Disalurkan bulanan, Januari–Desember',
    icon: DollarSign,
    Component: AddDashboard,
  },
  {
    key: 'bhprd',
    label: 'BHPRD',
    fullLabel: 'Bagi Hasil Pajak & Retribusi Daerah',
    desc: 'Disalurkan per tahap',
    icon: Landmark,
    Component: BhprdDashboard,
  },
  {
    key: 'dd',
    label: 'DD',
    fullLabel: 'Dana Desa',
    desc: 'Bersumber APBN, per tahap',
    icon: TrendingUp,
    Component: DdDashboard,
  },
];

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

  return (
    <div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <PageHeader
          icon={Wallet}
          title="Statistik Keuangan Desa"
          subtitle="Penyaluran ADD, BHPRD, dan Dana Desa se-Kabupaten Bogor. Data langsung dari SIPANDA."
        />

        {/* Tab — bisa digeser di layar sempit */}
        <div
          className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          role="tablist"
          aria-label="Sumber dana"
        >
          <div className="flex min-w-max gap-2 sm:min-w-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`group flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 ${
                    isActive
                      ? 'border-slate-900 bg-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                      isActive ? 'bg-white/10 ring-1 ring-white/15' : 'bg-slate-100'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-600'}`}
                    />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-semibold ${
                        isActive ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`ml-1.5 hidden text-xs font-normal lg:inline ${
                          isActive ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        · {tab.fullLabel}
                      </span>
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-[11px] ${
                        isActive ? 'text-brand-400' : 'text-slate-400'
                      }`}
                    >
                      {tab.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
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
