// src/components/mobile/ServiceGrid.jsx
import React from 'react';
import QuickActionCard from './QuickActionCard';

/**
 * ServiceGrid - GoJek Style Service Grid Layout
 * Grid container untuk menampilkan service cards
 */
const ServiceGrid = ({ services = [], columns = 4 }) => {
  const gridCols = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 sm:gap-6`}>
      {services.map((service, index) => (
        <QuickActionCard
          key={index}
          icon={service.icon}
          label={service.label}
          badge={service.badge}
          onClick={service.onClick}
          color={service.color}
          gradient={service.gradient}
        />
      ))}
    </div>
  );
};

export default ServiceGrid;
