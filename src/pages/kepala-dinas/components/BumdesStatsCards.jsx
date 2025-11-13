// src/pages/kepala-dinas/components/BumdesStatsCards.jsx
import React from 'react';
import { Activity, TrendingUp, Users, FileText } from 'lucide-react';

const BumdesStatsCards = ({ bumdes }) => {
  const statsCards = [
    {
      title: 'Total Aset BUMDes',
      value: `Rp ${((bumdes?.financials?.total_aset || 0) / 1000000000).toFixed(2)}M`,
      subtitle: `${bumdes?.total || 0} BUMDes`,
      icon: <Activity className="w-6 h-6 text-blue-600" />,
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Omzet 2024',
      value: `Rp ${((bumdes?.financials?.total_omzet || 0) / 1000000000).toFixed(2)}M`,
      subtitle: `Laba: Rp ${((bumdes?.financials?.total_laba || 0) / 1000000000).toFixed(2)}M`,
      icon: <TrendingUp className="w-6 h-6 text-green-600" />,
      bgColor: 'bg-green-50'
    },
    {
      title: 'Tenaga Kerja',
      value: bumdes?.financials?.total_tenaga_kerja || 0,
      subtitle: 'Total SDM BUMDes',
      icon: <Users className="w-6 h-6 text-indigo-600" />,
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Berbadan Hukum',
      value: bumdes?.berbadan_hukum || 0,
      subtitle: `${bumdes?.total ? ((bumdes.berbadan_hukum / bumdes.total) * 100).toFixed(1) : 0}% dari total`,
      icon: <FileText className="w-6 h-6 text-teal-600" />,
      bgColor: 'bg-teal-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statsCards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">{card.title}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {typeof card.value === 'number' ? card.value.toLocaleString('id-ID') : card.value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            </div>
            <div className={`p-3 ${card.bgColor} rounded-lg`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BumdesStatsCards;
