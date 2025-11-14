// src/pages/kepala-dinas/components/SummaryCards.jsx
import React from 'react';
import { Users, Briefcase } from 'lucide-react';

const SummaryCards = ({ summary, activeModule, onModuleChange }) => {
  const summaryCards = [
    {
      id: 'bumdes',
      title: 'Total BUMDes',
      value: summary?.total_bumdes || 0,
      icon: <Users className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Klik untuk lihat detail BUMDes'
    },
    {
      id: 'perjadin',
      title: 'Perjalanan Dinas',
      value: summary?.total_perjalanan_dinas || 0,
      icon: <Briefcase className="w-8 h-8" />,
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Klik untuk lihat detail Perjalanan Dinas'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {summaryCards.map((card, index) => (
        <div
          key={index}
          onClick={() => onModuleChange(card.id)}
          className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 ${
            activeModule === card.id ? 'ring-4 ring-blue-400 ring-opacity-50' : ''
          }`}
        >
          <div className={`bg-gradient-to-r ${card.color} p-6`}>
            <div className="flex items-center justify-between">
              <div className="text-white">
                {card.icon}
              </div>
              <div className="text-right">
                <p className="text-white text-opacity-90 text-sm font-medium">
                  {card.title}
                </p>
                <p className="text-white text-4xl font-bold mt-1">
                  {card.value.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
            <p className="text-white text-opacity-75 text-xs mt-2">
              {card.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
