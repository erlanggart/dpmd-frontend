import React from 'react';
import { motion } from 'framer-motion';

const ChartCard = ({ 
  title, 
  subtitle, 
  children, 
  height = "h-80",
  delay = 0 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        {subtitle && (
          <p className="text-gray-600 text-sm">{subtitle}</p>
        )}
      </div>

      {/* Chart Container */}
      <div className={`${height} relative`}>
        {children}
      </div>
    </motion.div>
  );
};

export default ChartCard;