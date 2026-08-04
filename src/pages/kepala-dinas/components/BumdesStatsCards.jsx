// src/pages/kepala-dinas/components/BumdesStatsCards.jsx
import React from 'react';
import { Activity, TrendingUp, Users, FileText } from 'lucide-react';

const BumdesStatsCards = ({ bumdes }) => {
  const statsCards = [
    {
      title: 'Total Aset BUMDes',
      value: `Rp ${((bumdes?.financials?.total_aset || 0) / 1000000000).toFixed(2)}M`,
      subtitle: `${bumdes?.total || 0} BUMDes`,
      Icon: Activity,
    },
    {
      title: 'Total Omzet 2024',
      value: `Rp ${((bumdes?.financials?.total_omzet || 0) / 1000000000).toFixed(2)}M`,
      subtitle: `Laba: Rp ${((bumdes?.financials?.total_laba || 0) / 1000000000).toFixed(2)}M`,
      Icon: TrendingUp,
    },
    {
      title: 'Tenaga Kerja',
      value: bumdes?.financials?.total_tenaga_kerja || 0,
      subtitle: 'Total SDM BUMDes',
      Icon: Users,
    },
    {
      title: 'Berbadan Hukum',
      value: bumdes?.berbadan_hukum || 0,
      subtitle: `${bumdes?.total ? ((bumdes.berbadan_hukum / bumdes.total) * 100).toFixed(1) : 0}% dari total`,
      Icon: FileText,
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map(({ title, value, subtitle, Icon }) => (
        <div
          key={title}
          className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-600">
              {title}
            </p>
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Icon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-900">
            {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
      ))}
    </div>
  );
};

export default BumdesStatsCards;
