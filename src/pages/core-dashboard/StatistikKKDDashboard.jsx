// Statistik KKD (Kekayaan & Keuangan Desa) - Unified Dashboard
// Combines ADD, BHPRD, DD into a single tabbed page for Core Dashboard
import React, { useState, lazy, Suspense } from 'react';
import { DollarSign, Landmark, TrendingUp } from 'lucide-react';

const AddDashboard = lazy(() => import('../bidang/kkd/add/AddDashboard'));
const BhprdDashboard = lazy(() => import('../bidang/kkd/BhprdDashboard'));
const DdDashboard = lazy(() => import('../bidang/kkd/dd/DdDashboard'));

const TABS = [
  {
    key: 'add',
    label: 'ADD',
    fullLabel: 'Alokasi Dana Desa',
    icon: DollarSign,
    gradient: 'from-blue-500 to-indigo-600',
    ring: 'ring-blue-400/30',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    Component: AddDashboard,
  },
  {
    key: 'bhprd',
    label: 'BHPRD',
    fullLabel: 'Bagi Hasil Pajak & Retribusi Daerah',
    icon: Landmark,
    gradient: 'from-pink-500 to-rose-600',
    ring: 'ring-pink-400/30',
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    Component: BhprdDashboard,
  },
  {
    key: 'dd',
    label: 'DD',
    fullLabel: 'Dana Desa',
    icon: TrendingUp,
    gradient: 'from-violet-500 to-purple-600',
    ring: 'ring-violet-400/30',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    Component: DdDashboard,
  },
];

const TabSpinner = () => (
  <div className="flex items-center justify-center py-32">
    <div className="text-center">
      <div className="w-10 h-10 mx-auto mb-3 rounded-full border-[3px] border-gray-200 border-t-indigo-500 animate-spin" />
      <p className="text-sm text-gray-400">Memuat data...</p>
    </div>
  </div>
);

const StatistikKKDDashboard = () => {
  const [activeTab, setActiveTab] = useState('add');

  const current = TABS.find(t => t.key === activeTab);

  return (
    <div className="min-h-screen">
      {/* Sticky Tab Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-200/60 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Statistik Keuangan Desa</h1>
              <p className="text-xs text-gray-500">Kekayaan & Keuangan Desa (KKD)</p>
            </div>
          </div>

          {/* Tab Buttons */}
          <div className="flex gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isActive
                      ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg shadow-${tab.key === 'add' ? 'blue' : tab.key === 'bhprd' ? 'pink' : 'violet'}-500/25 ring-2 ${tab.ring} scale-[1.02]`
                      : `${tab.bg} ${tab.text} hover:shadow-md hover:scale-[1.01] border border-transparent hover:border-gray-200`
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className={`hidden sm:inline text-xs font-normal ${isActive ? 'text-white/70' : 'opacity-60'}`}>
                    · {tab.fullLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<TabSpinner />}>
          {current && <current.Component />}
        </Suspense>
      </div>
    </div>
  );
};

export default StatistikKKDDashboard;
