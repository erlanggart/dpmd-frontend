// src/components/mobile/ServiceGrid.jsx
import React from 'react';
import QuickActionCard from './QuickActionCard';

/**
 * ServiceGrid - Modern Clean Grid Layout
 * Grid container tanpa background (dibungkus di parent)
 */
const ServiceGrid = ({ services = [], columns = 3 }) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-6 sm:gap-8`}>
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
