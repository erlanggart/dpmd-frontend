import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ 
  title, 
  value, 
  icon: IconComponent, 
  trend, 
  trendValue, 
  gradient = 'from-blue-500 to-purple-600',
  delay = 0,
  onClick = null
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
      className={`relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg border border-gray-100 ${
        onClick ? 'cursor-pointer group' : ''
      }`}
      onClick={onClick}
    >
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-6 -translate-y-6">
        <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-5 rounded-full`}></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${gradient} rounded-xl text-white shadow-lg`}>
            <IconComponent className="w-6 h-6" />
          </div>
          
          {trend && (
            <div className={`flex items-center text-sm font-medium ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'up' && (
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {trend === 'down' && (
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {trendValue}
            </div>
          )}
        </div>
        
        {/* Value */}
        <div className="mb-2">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {value}
          </div>
          <div className="text-sm font-medium text-gray-600">
            {title}
          </div>
        </div>
        
        {/* Hover Effect Indicator */}
        {onClick && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:from-blue-500 group-hover:via-purple-500 group-hover:to-pink-500 transition-all duration-300"></div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;