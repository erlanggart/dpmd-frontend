// src/components/landingpage/NewsCard.jsx
import React, { useState } from 'react';
import { FiCalendar, FiUser, FiEye, FiArrowRight, FiRotateCw } from 'react-icons/fi';

const NewsCard = ({ berita }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Base URL untuk static files
  const STORAGE_BASE = import.meta.env.VITE_IMAGE_BASE_URL || 'http://127.0.0.1:3001';

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getKategoriColor = (kategori) => {
    const colors = {
      pengumuman: 'from-red-500 to-orange-500',
      bumdes: 'from-blue-500 to-cyan-500',
      perjadin: 'from-orange-500 to-amber-500',
      musdesus: 'from-purple-500 to-pink-500',
      umum: 'from-gray-500 to-slate-500'
    };
    return colors[kategori] || colors.umum;
  };

  const getKategoriLabel = (kategori) => {
    const labels = {
      pengumuman: 'Pengumuman',
      bumdes: 'BUMDes',
      perjadin: 'Perjalanan Dinas',
      musdesus: 'Musdesus',
      umum: 'Umum'
    };
    return labels[kategori] || 'Umum';
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    const cleanText = text.replace(/<[^>]*>/g, '');
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '...';
  };

  const imageUrl = berita.gambar 
    ? `${STORAGE_BASE}/storage/uploads/berita/${berita.gambar}`
    : '/placeholder-news.jpg';

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <>
      <div 
        className="h-[520px] cursor-pointer"
        onClick={handleCardClick}
        style={{ perspective: '1000px' }}
      >
        {/* Revolving Door Container */}
        <div 
          className="relative w-full h-full transition-all duration-1000 ease-in-out"
          style={{ 
            transformStyle: 'preserve-3d',
            transformOrigin: 'center',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            willChange: 'transform'
          }}
        >
          {/* ==================== FRONT SIDE ==================== */}
          <div 
            className="absolute inset-0"
            style={{ 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)'
            }}
          >
            <div className="h-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 hover:shadow-3xl transition-all duration-500 group">
              {/* Hero Image Section */}
              <div className="relative h-72 overflow-hidden">
                <img
                  src={imageUrl}
                  alt={berita.judul}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => {
                    e.target.src = '/placeholder-news.jpg';
                  }}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                
                {/* Kategori Badge - Top Right */}
                <div className="absolute top-5 right-5 z-10">
                  <span className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-xs font-bold bg-gradient-to-r ${getKategoriColor(berita.kategori)} shadow-xl transform transition-all duration-300 group-hover:scale-110 backdrop-blur-sm border border-white/20`}>
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    {getKategoriLabel(berita.kategori)}
                  </span>
                </div>

                {/* Views Badge - Top Left */}
                <div className="absolute top-5 left-5 flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/30 shadow-lg z-10">
                  <FiEye className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-bold">{berita.views || 0}</span>
                </div>

                {/* Title at Bottom of Image */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                  <h3 className="text-2xl font-bold text-white leading-tight line-clamp-2 drop-shadow-2xl">
                    {berita.judul}
                  </h3>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 space-y-4">
                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{formatDate(berita.tanggal_publish || berita.created_at)}</span>
                  </div>
                  {berita.penulis && (
                    <div className="flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">{berita.penulis}</span>
                    </div>
                  )}
                </div>

                {/* Ringkasan */}
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                  {berita.ringkasan || truncateText(berita.konten, 150)}
                </p>

                {/* Flip Button */}
                <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold text-sm bg-gradient-to-r from-blue-50 to-cyan-50 py-3.5 rounded-xl hover:from-blue-100 hover:to-cyan-100 transition-all duration-300 group-hover:shadow-md">
                  <FiRotateCw className="w-4 h-4 animate-spin-slow" />
                  <span>Klik untuk detail lengkap</span>
                  <FiArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* ==================== BACK SIDE ==================== */}
          <div 
            className="absolute inset-0"
            style={{ 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col">
              {/* Header Back */}
              <div className="flex items-center justify-between mb-4">
                <span className={`px-4 py-2 rounded-full text-white text-xs font-bold bg-white/20 backdrop-blur-md border border-white/30`}>
                  {getKategoriLabel(berita.kategori)}
                </span>
                <div className="flex items-center gap-2 text-white/80 text-xs bg-white/10 backdrop-blur-md px-3 py-2 rounded-full border border-white/20">
                  <FiEye className="w-3 h-3" />
                  <span className="font-semibold">{berita.views || 0} views</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-white mb-4 line-clamp-2 drop-shadow-lg">
                {berita.judul}
              </h3>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-white/90">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                  <FiCalendar className="w-3 h-3" />
                  <span className="font-medium">{formatDate(berita.tanggal_publish || berita.created_at)}</span>
                </div>
                {berita.penulis && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                    <FiUser className="w-3 h-3" />
                    <span className="font-medium">{berita.penulis}</span>
                  </div>
                )}
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div 
                  className="text-white/95 text-sm leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{ 
                    __html: berita.konten || berita.ringkasan || 'Tidak ada konten tersedia.' 
                  }}
                />
              </div>

              {/* Back Button */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center justify-center gap-2 text-white font-semibold text-sm bg-white/10 backdrop-blur-md hover:bg-white/20 py-3 rounded-xl transition-all duration-300 border border-white/20">
                  <FiRotateCw className="w-4 h-4 transform rotate-180" />
                  <span>Klik untuk kembali</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Styles for 3D Effect */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .animate-spin-slow {
            animation: spin-slow 3s linear infinite;
          }

          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }

          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 10px;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }
        `
      }} />
    </>
  );
};

export default NewsCard;
