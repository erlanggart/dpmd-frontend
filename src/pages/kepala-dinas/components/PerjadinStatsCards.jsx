// src/pages/kepala-dinas/components/PerjadinStatsCards.jsx
import React from 'react';
import { Briefcase, Users, Activity, Calendar } from 'lucide-react';

const PerjadinStatsCards = ({ perjalanan_dinas }) => {
  const statsCards = [
    {
      title: 'Perjalanan Dinas',
      value: perjalanan_dinas?.total || 0,
      subtitle: `${perjalanan_dinas?.total_lokasi || 0} Lokasi`,
      icon: <Briefcase className="w-6 h-6" style={{ color: '#7c2d12' }} />,
      bgColor: 'bg-gradient-to-br from-orange-500 to-orange-600',
      iconBg: 'bg-white/90'
    },
    {
      title: 'Total Bidang',
      value: perjalanan_dinas?.total_bidang || 0,
      subtitle: 'Bidang Terlibat',
      icon: <Users className="w-6 h-6" style={{ color: '#581c87' }} />,
      bgColor: 'bg-gradient-to-br from-purple-500 to-purple-600',
      iconBg: 'bg-white/90'
    },
    {
      title: 'Total Kegiatan Bidang',
      value: perjalanan_dinas?.total_kegiatan_bidang || 0,
      subtitle: 'Detail Kegiatan',
      icon: <Activity className="w-6 h-6" style={{ color: '#831843' }} />,
      bgColor: 'bg-gradient-to-br from-pink-500 to-pink-600',
      iconBg: 'bg-white/90'
    },
    {
      title: 'Upcoming (30 Hari)',
      value: perjalanan_dinas?.upcoming_30days || 0,
      subtitle: 'Jadwal Mendatang',
      icon: <Calendar className="w-6 h-6" style={{ color: '#78350f' }} />,
      bgColor: 'bg-gradient-to-br from-yellow-500 to-amber-600',
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
                {card.value.toLocaleString('id-ID')}
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

export default PerjadinStatsCards;
