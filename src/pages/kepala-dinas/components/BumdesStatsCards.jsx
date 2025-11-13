// src/pages/kepala-dinas/components/BumdesStatsCards.jsx
import React from 'react';
import { Activity, TrendingUp, Users, FileText } from 'lucide-react';

const BumdesStatsCards = ({ bumdes }) => {
  const statsCards = [
    {
      title: 'Total Aset BUMDes',
      value: `Rp ${((bumdes?.financials?.total_aset || 0) / 1000000000).toFixed(2)}M`,
      subtitle: `${bumdes?.total || 0} BUMDes`,
      icon: <Activity className="w-6 h-6" style={{ color: '#1e3a8a' }} />,
      bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
      iconBg: 'bg-white/90'
    },
    {
      title: 'Total Omzet 2024',
      value: `Rp ${((bumdes?.financials?.total_omzet || 0) / 1000000000).toFixed(2)}M`,
      subtitle: `Laba: Rp ${((bumdes?.financials?.total_laba || 0) / 1000000000).toFixed(2)}M`,
      icon: <TrendingUp className="w-6 h-6" style={{ color: '#14532d' }} />,
      bgColor: 'bg-gradient-to-br from-green-500 to-green-600',
      iconBg: 'bg-white/90'
    },
    {
      title: 'Tenaga Kerja',
      value: bumdes?.financials?.total_tenaga_kerja || 0,
      subtitle: 'Total SDM BUMDes',
      icon: <Users className="w-6 h-6" style={{ color: '#312e81' }} />,
      bgColor: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      iconBg: 'bg-white/90'
    },
    {
      title: 'Berbadan Hukum',
      value: bumdes?.berbadan_hukum || 0,
      subtitle: `${bumdes?.total ? ((bumdes.berbadan_hukum / bumdes.total) * 100).toFixed(1) : 0}% dari total`,
      icon: <FileText className="w-6 h-6" style={{ color: '#134e4a' }} />,
      bgColor: 'bg-gradient-to-br from-teal-500 to-teal-600',
      iconBg: 'bg-white/90'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statsCards.map((card, index) => (
        <div key={index} className={`${card.bgColor} rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-white/90 text-sm font-medium mb-2">{card.title}</p>
              <p className="text-3xl font-bold mb-1">
                {typeof card.value === 'number' ? card.value.toLocaleString('id-ID') : card.value}
              </p>
              <p className="text-xs text-white/80">{card.subtitle}</p>
            </div>
            <div className={`p-3 ${card.iconBg} backdrop-blur-sm rounded-xl`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BumdesStatsCards;
