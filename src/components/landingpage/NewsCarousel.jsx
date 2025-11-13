// src/components/landingpage/NewsCarousel.jsx
import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiEye, FiExternalLink } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const NewsCarousel = ({ beritaList }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const navigate = useNavigate();

  // Base URL untuk static files
  const STORAGE_BASE = import.meta.env.VITE_IMAGE_BASE_URL || 'http://127.0.0.1:3001';

  // Config untuk 3D carousel
  const VISIBLE_CARDS = 5; // Jumlah card yang visible (2 kiri, 1 tengah, 2 kanan)
  const CARD_WIDTH = 320;
  const CARD_HEIGHT = 420;
  const ROTATION_ANGLE = 35; // Sudut rotasi untuk card samping
  const DRAG_THRESHOLD = 100; // Minimum drag distance untuk trigger change (increased for smoother feel)
  const DRAG_MULTIPLIER = 1.5; // Sensitivity multiplier untuk drag offset
  const CONTAINER_WIDTH = CARD_WIDTH * 2.8; // Container width untuk 3 cards visible

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

  // Drag handlers
  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    setStartX(clientX);
    setCurrentX(clientX);
    setDragOffset(0);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    
    e.preventDefault(); // Prevent scrolling saat drag
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const rawDragDistance = clientX - startX;
    
    // Update drag offset for smooth visual feedback
    setDragOffset(rawDragDistance);
    setCurrentX(clientX);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    
    const finalDragDistance = currentX - startX;
    
    // Switch card based on final drag distance
    if (finalDragDistance > DRAG_THRESHOLD) {
      // Drag ke kanan - prev card
      setActiveIndex((prev) => (prev === 0 ? beritaList.length - 1 : prev - 1));
    } else if (finalDragDistance < -DRAG_THRESHOLD) {
      // Drag ke kiri - next card  
      setActiveIndex((prev) => (prev === beritaList.length - 1 ? 0 : prev + 1));
    }
    
    // Reset drag state with smooth animation
    setIsDragging(false);
    setDragOffset(0);
    setStartX(0);
    setCurrentX(0);
  };

  const handleCardClick = (index) => {
    if (isDragging) return; // Ignore click saat dragging
    
    if (index === activeIndex) {
      // Jika card yang aktif diklik lagi, buka halaman detail
      const berita = beritaList[index];
      navigate(`/berita/${berita.slug}`);
    } else {
      // Jika card lain diklik, jadikan aktif
      setActiveIndex(index);
    }
  };

  // Navigation functions
  const goToSlide = (index) => {
    setActiveIndex(index);
  };

  const nextSlide = () => {
    setActiveIndex((prev) => (prev === beritaList.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev === 0 ? beritaList.length - 1 : prev - 1));
  };

  // Helper function untuk mendapatkan index dengan circular wrapping
  const getCircularIndex = (index) => {
    const len = beritaList.length;
    return ((index % len) + len) % len;
  };

  // Function untuk get transform style tiap card dengan circular logic
  const getCardStyle = (index) => {
    const len = beritaList.length;
    let position = index - activeIndex;
    
    // Normalize position untuk circular carousel
    if (position > len / 2) {
      position -= len;
    } else if (position < -len / 2) {
      position += len;
    }
    
    const absPosition = Math.abs(position);
    
    // Hanya tampilkan cards dalam range
    if (absPosition > 2) {
      return {
        opacity: 0,
        pointerEvents: 'none',
        transform: 'translateX(-9999px)',
        display: 'none'
      };
    }

    // Calculate position and rotation
    let translateX = 0;
    let translateZ = 0;
    let rotateY = 0;
    let scale = 1;
    let opacity = 1;
    let zIndex = 10;

    // Add drag offset for smooth dragging effect
    const smoothDragOffset = Math.max(-150, Math.min(150, dragOffset * 0.8));
    const dragRotation = Math.max(-15, Math.min(15, smoothDragOffset / 15));

    if (position === 0) {
      // Card tengah (active) - ALWAYS CENTER
      translateX = 0 + smoothDragOffset;
      translateZ = 0;
      rotateY = dragRotation;
      scale = 1;
      opacity = 1;
      zIndex = 20;
    } else if (position === -1) {
      // Card kiri langsung
      translateX = -(CARD_WIDTH * 0.75) + smoothDragOffset;
      translateZ = -120;
      rotateY = ROTATION_ANGLE + (dragRotation * 0.5);
      scale = 0.88;
      opacity = 0.8;
      zIndex = 19;
    } else if (position === 1) {
      // Card kanan langsung
      translateX = (CARD_WIDTH * 0.75) + smoothDragOffset;
      translateZ = -120;
      rotateY = -ROTATION_ANGLE + (dragRotation * 0.5);
      scale = 0.88;
      opacity = 0.8;
      zIndex = 19;
    } else if (position === -2) {
      // Card kiri jauh
      translateX = -(CARD_WIDTH * 1.5) + smoothDragOffset;
      translateZ = -200;
      rotateY = ROTATION_ANGLE + 10;
      scale = 0.7;
      opacity = 0.4;
      zIndex = 18;
    } else if (position === 2) {
      // Card kanan jauh
      translateX = (CARD_WIDTH * 1.5) + smoothDragOffset;
      translateZ = -200;
      rotateY = -ROTATION_ANGLE - 10;
      scale = 0.7;
      opacity = 0.4;
      zIndex = 18;
    }

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex,
      transition: isDragging 
        ? 'none' 
        : 'transform 0.8s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.6s ease-out, z-index 0s',
      pointerEvents: 'auto',
      display: 'block',
      willChange: isDragging ? 'transform' : 'auto'
    };
  };

  if (!beritaList || beritaList.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Belum ada berita tersedia
      </div>
    );
  }

  return (
    <div className="relative py-12 w-full">
      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 group"
        aria-label="Previous"
      >
        <FiChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 group"
        aria-label="Next"
      >
        <FiChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Carousel Container - Always Centered */}
      <div 
        className="relative overflow-visible cursor-grab active:cursor-grabbing select-none mx-auto flex items-center justify-center"
        style={{ height: `${CARD_HEIGHT + 100}px`, maxWidth: '100%' }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* 3D Perspective Container */}
        <div className="flex items-center justify-center h-full w-full" style={{ perspective: '1500px', perspectiveOrigin: 'center center' }}>
          {/* Cards Container dengan preserve-3d - Centered */}
          <div className="relative h-full flex items-center justify-center" style={{ transformStyle: 'preserve-3d', width: 'fit-content', margin: '0 auto' }}>
            {beritaList.map((berita, index) => {
              const cardStyle = getCardStyle(index);
              const isActive = index === activeIndex;

              if (cardStyle.display === 'none') return null;

              return (
                <div
                  key={berita.id_berita}
                  onClick={() => handleCardClick(index)}
                  className="absolute cursor-pointer"
                  style={{
                    ...cardStyle,
                    width: `${CARD_WIDTH}px`,
                    height: `${CARD_HEIGHT}px`,
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl group">
                    {/* Background Image */}
                    <img
                      src={berita.gambar ? `${STORAGE_BASE}/storage/uploads/berita/${berita.gambar}` : '/placeholder-news.jpg'}
                      alt={berita.judul}
                      className="w-full h-full object-cover pointer-events-none"
                      draggable="false"
                      onError={(e) => {
                        e.target.src = '/placeholder-news.jpg';
                      }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                      {/* Kategori Badge */}
                      <div className="absolute top-4 right-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold bg-gradient-to-r ${getKategoriColor(berita.kategori)} shadow-lg backdrop-blur-sm border border-white/20`}>
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                          {getKategoriLabel(berita.kategori)}
                        </span>
                      </div>

                      {/* Views Badge */}
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                        <FiEye className="w-3.5 h-3.5 text-white" />
                        <span className="text-white text-xs font-semibold">{berita.views || 0}</span>
                      </div>

                      {/* Title */}
                      <h3 className={`font-bold text-white mb-2 line-clamp-2 transition-all duration-300 ${
                        isActive ? 'text-xl' : 'text-lg'
                      }`}>
                        {berita.judul}
                      </h3>

                      {/* Meta Info */}
                      <div className="flex items-center gap-3 text-white/90 text-xs mb-3">
                        <div className="flex items-center gap-1.5">
                          <FiCalendar className="w-3.5 h-3.5" />
                          <span>{formatDate(berita.tanggal_publish || berita.created_at)}</span>
                        </div>
                      </div>

                      {/* Ringkasan - Only show on active card */}
                      {isActive && (
                        <p className="text-white/80 text-sm leading-relaxed mb-3 line-clamp-2">
                          {berita.ringkasan}
                        </p>
                      )}

                      {/* Call to Action - Only on active card */}
                      {isActive && (
                        <button 
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl group text-sm"
                        >
                          <span>Baca Selengkapnya</span>
                          <FiExternalLink className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}

                      {/* Hint text for inactive cards */}
                      {!isActive && (
                        <div className="text-center py-2 text-white/60 text-xs font-medium">
                          Klik untuk melihat
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-3 mt-8">
        {beritaList.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === activeIndex
                ? 'w-10 h-3 bg-gradient-to-r from-blue-600 to-purple-600'
                : 'w-3 h-3 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Instructions */}
      <div className="text-center mt-6 text-gray-500 text-sm">
        <p>👆 Klik tahan dan geser untuk berpindah • Klik 2x pada card tengah untuk baca detail</p>
      </div>
    </div>
  );
};

export default NewsCarousel;
