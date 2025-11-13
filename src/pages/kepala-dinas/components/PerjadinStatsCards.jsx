// src/pages/kepala-dinas/components/PerjadinStatsCards.jsx
import React from 'react';
import { Briefcase, Users, Activity, Calendar } from 'lucide-react';

const PerjadinStatsCards = ({ perjalanan_dinas }) => {
  const statsCards = [
    {
      title: 'Perjalanan Dinas',
      value: perjalanan_dinas?.total || 0,
      subtitle: `${perjalanan_dinas?.total_lokasi || 0} Lokasi`,
      icon: <Briefcase className="w-6 h-6 text-orange-600" />,
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Total Bidang',
      value: perjalanan_dinas?.total_bidang || 0,
      subtitle: 'Bidang Terlibat',
      icon: <Users className="w-6 h-6 text-purple-600" />,
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Kegiatan Bidang',
      value: perjalanan_dinas?.total_kegiatan_bidang || 0,
      subtitle: 'Detail Kegiatan',
      icon: <Activity className="w-6 h-6 text-pink-600" />,
      bgColor: 'bg-pink-50'
    },
    {
      title: 'Upcoming (30 Hari)',
      value: perjalanan_dinas?.upcoming_30days || 0,
      subtitle: 'Jadwal Mendatang',
      icon: <Calendar className="w-6 h-6 text-yellow-600" />,
      bgColor: 'bg-yellow-50'
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
                {card.value.toLocaleString('id-ID')}
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

export default PerjadinStatsCards;
