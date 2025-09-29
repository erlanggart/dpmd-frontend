import React from 'react';
import { Link } from 'react-router-dom';
import { 
  DocumentArrowUpIcon, 
  ChartBarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const MusdesusHeroSection = () => {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-slate-50 border-b border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 max-w-7xl">
        <div className="text-center mb-8 sm:mb-12">
          {/* Trending Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-slate-700 text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-6 shadow-lg">
            <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">TRENDING NOW</span>
            <span className="sm:hidden">TRENDING</span>
            <ArrowTrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          
          {/* Hero Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-800 mb-4 sm:mb-6 leading-tight px-2">
            Koperasi Desa Merah Putih
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-6 sm:mb-8 max-w-4xl mx-auto leading-relaxed px-4">
            Implementasi program prioritas nasional untuk peningkatan tata kelola desa yang transparan, 
            akuntabel, dan partisipatif melalui digitalisasi hasil musyawarah
          </p>
          
          {/* Highlight Stats */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 lg:gap-8 mb-8 sm:mb-12 text-center">
            <div className="bg-white/70 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-6 py-3 sm:py-4 shadow-lg border border-white/20 min-w-[100px]">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">2025</div>
              <div className="text-xs sm:text-sm text-gray-600">Program Prioritas</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-6 py-3 sm:py-4 shadow-lg border border-white/20 min-w-[100px]">
              <div className="text-lg sm:text-2xl font-bold text-slate-600">Digital</div>
              <div className="text-xs sm:text-sm text-gray-600">Transformasi</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-6 py-3 sm:py-4 shadow-lg border border-white/20 min-w-[100px]">
              <div className="text-lg sm:text-2xl font-bold text-indigo-600">Terintegrasi</div>
              <div className="text-xs sm:text-sm text-gray-600">Sistem Pelaporan</div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-2xl mx-auto px-4">
          <Link
            to="/musdesus-upload"
            className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl text-base sm:text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 sm:gap-3"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-slate-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <DocumentArrowUpIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
            <span className="relative z-10">Upload Hasil Musdesus</span>
          </Link>
          
          <Link
            to="/musdesus-stats"
            className="group relative overflow-hidden bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl text-base sm:text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 sm:gap-3"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-400 to-blue-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
            <span className="relative z-10">Lihat Statistik & Data</span>
          </Link>
        </div>
        
        {/* Bottom Info */}
        <div className="text-center mt-8 sm:mt-12 px-4">
          <p className="text-gray-500 text-xs sm:text-sm">
            Bagian dari program digitalisasi desa Kabupaten Bogor • DPMD Kab. Bogor 2025
          </p>
        </div>
      </div>
    </div>
  );
};

export default MusdesusHeroSection;