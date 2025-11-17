// src/components/landingpage/KegiatanCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiActivity, FiCalendar, FiArrowRight } from 'react-icons/fi';

const KegiatanCard = ({ title, description, icon, slug, year, image }) => {
  return (
    <Link 
      to={`/kegiatan/${slug}`}
      className="group bg-white rounded-xl shadow-md hover:shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700">
        {image ? (
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-6xl opacity-30">
              {icon || <FiActivity />}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        
        {/* Year Badge */}
        {year && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center space-x-1.5">
            <FiCalendar className="text-blue-600 text-sm" />
            <span className="text-sm font-bold text-blue-600">{year}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
          {title}
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
          {description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500 font-medium">Lihat Detail</span>
          <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
            <span className="mr-1">Selengkapnya</span>
            <FiArrowRight className="text-lg" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default KegiatanCard;
