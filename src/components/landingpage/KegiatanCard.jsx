import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiCalendar } from 'react-icons/fi';

const KegiatanCard = ({ title, description, icon, slug, year, color = 'from-blue-500 to-indigo-600', lightColor = 'bg-blue-50 text-blue-700 border-blue-200' }) => {
  const linkPath = slug === 'bantuan-keuangan-infrastruktur-2025' 
    ? '/bantuan-keuangan' 
    : `/kegiatan/${slug}`;

  return (
    <Link 
      to={linkPath}
      className="group relative flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1"
    >
      {/* Top Gradient Stripe */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${color}`} />
      
      <div className="flex flex-col flex-1 p-7">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-5">
          {/* Icon */}
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${color} text-white text-xl shadow-lg`}>
            {icon}
          </div>
          
          {/* Arrow */}
          <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[rgb(var(--color-primary))] group-hover:text-white transition-all duration-300">
            <FiArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-3 leading-snug group-hover:text-[rgb(var(--color-primary))] transition-colors line-clamp-2">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-gray-500 text-sm leading-relaxed mb-6 line-clamp-3 flex-1">
          {description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-5 border-t border-gray-50">
          {year && (
            <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${lightColor}`}>
              <FiCalendar className="w-3 h-3" />
              <span>{year}</span>
            </div>
          )}
          <span className="text-sm font-medium text-gray-400 group-hover:text-[rgb(var(--color-secondary))] transition-colors">
            Lihat Detail
          </span>
        </div>
      </div>
    </Link>
  );
};

export default KegiatanCard;
