// src/pages/kepala-dinas/components/SummaryCard.jsx
import React from 'react';

const SummaryCard = ({ card, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 ${
        isActive ? 'ring-4 ring-blue-400 ring-opacity-50' : ''
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
  );
};

export default SummaryCard;
