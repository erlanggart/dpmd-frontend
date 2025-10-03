import React, { useState, useEffect, useRef } from 'react';
import { useBumdesData, useBumdesFilter } from '../../../hooks/useBumdesData';
import { 
  FiHome, 
  FiBarChart2, 
  FiTrendingUp, 
  FiCalendar, 
  FiFileText, 
  FiActivity,
  FiUsers,
  FiDollarSign,
  FiMapPin,
  FiRefreshCw,
  FiEdit3,
  FiX,
  FiPhone,
  FiMail,
  FiDownload,
  FiTrash2,
  FiCheck,
  FiAlertCircle,
  FiUpload,
  FiPause,
  FiTarget
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import BumdesEditDashboard from './BumdesEditDashboard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// CSS-in-JS for animations
const notificationStyles = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes progress-bar {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
  }
  
  .animate-progress-bar {
    animation: progress-bar 4s linear forwards;
  }

  /* Custom scrollbar for dropdown */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Scrollbar for statistics area */
  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  
  .scrollbar-track-slate-100::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 8px;
  }
  
  .scrollbar-thumb-slate-300::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 8px;
  }
  
  .scrollbar-thumb-slate-300::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Mobile responsive tweaks */
  @media (max-width: 640px) {
    .stat-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    .stat-card-compact {
      padding: 1rem;
    }
    
    .stat-value-mobile {
      font-size: 1.5rem;
    }
  }

  /* Tablet responsive tweaks */
  @media (min-width: 641px) and (max-width: 1024px) {
    .stat-grid-tablet {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = notificationStyles;
  if (!document.head.querySelector('style[data-notification-styles]')) {
    styleSheet.setAttribute('data-notification-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}

// Custom Dropdown Component with Better Scroll
const CustomDropdown = ({ value, onChange, options, placeholder, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-left focus:outline-none focus:ring-2 focus:ring-white/50 flex items-center justify-between"
      >
        <span className={selectedOption ? 'text-white' : 'text-white/60'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg 
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-60 overflow-hidden">
          <div className="custom-scrollbar overflow-y-auto max-h-60 py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-slate-100 transition-colors duration-150 ${
                  value === option.value 
                    ? 'bg-slate-800 text-white hover:bg-slate-700' 
                    : 'text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function untuk memisahkan kode desa dan nama desa
const parseDesaInfo = (desaString) => {
  if (!desaString || typeof desaString !== 'string') {
    return { kodeDesa: '', namaDesa: desaString || '-' };
  }
  
  // Format: "3201112001-CIDOKOM" atau "CIDOKOM"
  if (desaString.includes('-')) {
    const parts = desaString.split('-');
    return {
      kodeDesa: parts[0].trim(),
      namaDesa: parts.slice(1).join('-').trim()
    };
  }
  
  // Jika tidak ada kode, kembalikan nama desa saja
  return { kodeDesa: '', namaDesa: desaString.trim() };
};

// Enhanced Statistics Card with better layout and responsiveness
const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  onClick, 
  color = "bg-slate-800", 
  textColor = "text-white",
  accentColor = "bg-white/20",
  size = "normal" // normal, large, compact
}) => {
  const cardSizes = {
    compact: "p-4",
    normal: "p-6",
    large: "p-8"
  };

  const valueSizes = {
    compact: "text-2xl",
    normal: "text-3xl",
    large: "text-4xl"
  };

  return (
    <div className="relative overflow-hidden cursor-pointer group" onClick={onClick}>
      <div className={`${color} rounded-2xl ${cardSizes[size]} shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 border border-white/10`}>
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
            <defs>
              <pattern id={`pattern-${title}`} width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1" fill="currentColor"/>
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill={`url(#pattern-${title})`} />
          </svg>
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent group-hover:from-white/10 transition-all duration-500"></div>
        
        <div className="relative">
          {/* Header with Icon and Trend */}
          <div className="flex items-center justify-between mb-4">
            <div className={`${accentColor} p-3 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`${size === 'large' ? 'text-3xl' : size === 'compact' ? 'text-xl' : 'text-2xl'} text-white drop-shadow-lg`} />
            </div>
            {trend && (
              <div className="flex items-center gap-1 text-white/90 text-sm font-medium bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
                <FiTrendingUp className="text-xs" />
                <span>{trend}</span>
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className={textColor}>
            <div className={`${valueSizes[size]} font-bold mb-2 text-white drop-shadow-lg group-hover:scale-105 transition-transform duration-300`}>
              {value}
            </div>
            <div className="text-white/90 text-sm font-semibold mb-1 tracking-wide">
              {title}
            </div>
            {subtitle && (
              <div className="text-white/70 text-xs leading-relaxed">
                {subtitle}
              </div>
            )}
          </div>

          {/* Hover indicator */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-white/0 via-white/50 to-white/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
        </div>
      </div>
    </div>
  );
};

// Enhanced BumdesCard with Detail Modal
const BumdesCard = ({ bumdes, onClick }) => {
  const isNotUploaded = bumdes.upload_status === 'not_uploaded';
  
  return (
    <div 
      className={`rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border group ${
        isNotUploaded 
          ? 'bg-gray-50 border-gray-300 opacity-75' 
          : 'bg-white border-gray-100'
      }`}
      onClick={() => onClick(bumdes)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className={`text-lg font-bold mb-2 group-hover:text-slate-800 transition-colors duration-300 ${
            isNotUploaded ? 'text-gray-600' : 'text-gray-800'
          }`}>
            {bumdes.namabumdesa}
          </h3>
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
            <FiMapPin className="text-xs" />
            <span>{bumdes.desa}, {bumdes.kecamatan}</span>
          </div>
          {bumdes.kode_desa && (
            <div className="text-xs text-gray-500 mb-2">
              Kode Desa: {bumdes.kode_desa}
            </div>
          )}
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
            isNotUploaded 
              ? 'bg-orange-100 text-orange-800' 
              : bumdes.status === 'aktif' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
          }`}>
            {isNotUploaded ? 'Belum Upload' : bumdes.status}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 mb-1">
            {isNotUploaded ? 'Status' : 'Tahun Pendirian'}
          </div>
          <div className={`text-lg font-bold ${isNotUploaded ? 'text-orange-600' : 'text-slate-800'}`}>
            {isNotUploaded ? 'Belum Diisi' : (bumdes.TahunPendirian || 'Belum diisi')}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500 mb-1">Jenis Usaha</div>
          <div className={`font-medium truncate ${isNotUploaded ? 'text-gray-500' : 'text-gray-800'}`}>
            {isNotUploaded ? 'Belum diisi' : (bumdes.JenisUsaha || 'Belum diisi')}
          </div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Tenaga Kerja</div>
          <div className={`font-medium ${isNotUploaded ? 'text-gray-500' : 'text-gray-800'}`}>
            {isNotUploaded ? 'Belum diisi' : (bumdes.TotalTenagaKerja || 0)} orang
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {isNotUploaded ? 'Data belum tersedia' : 'Klik untuk detail lengkap'}
        </div>
        <div className={`p-2 rounded-lg transition-colors duration-300 ${
          isNotUploaded 
            ? 'bg-gray-200 group-hover:bg-gray-300' 
            : 'bg-purple-100 group-hover:bg-purple-200'
        }`}>
          <FiBarChart2 className={`text-sm ${isNotUploaded ? 'text-gray-500' : 'text-slate-600'}`} />
        </div>
      </div>
    </div>
  );
};

// Enhanced Detail Modal Component with Complete Data
const BumdesDetailModal = ({ bumdes, isOpen, onClose, onEdit, onDelete }) => {
  if (!isOpen || !bumdes) return null;

  const isNotUploaded = bumdes.upload_status === 'not_uploaded';
  const desaInfo = parseDesaInfo(bumdes.desa);

  const formatCurrency = (value) => {
    if (!value || isNaN(value)) return 'Belum diisi';
    return `Rp ${parseInt(value).toLocaleString('id-ID')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className={`sticky top-0 text-white p-6 rounded-t-3xl ${
          isNotUploaded 
            ? 'bg-gradient-to-r from-orange-600 to-orange-700' 
            : 'bg-gradient-to-r from-slate-800 to-slate-900'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{bumdes.namabumdesa}</h2>
              <div className="flex items-center gap-4 text-white/80">
                <div className="flex items-center gap-2">
                  <FiMapPin className="text-sm" />
                  <span>{bumdes.desa}, {bumdes.kecamatan}</span>
                </div>
                {bumdes.kode_desa && (
                  <div className="bg-white/20 px-2 py-1 rounded text-xs">
                    Kode: {bumdes.kode_desa}
                  </div>
                )}
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isNotUploaded 
                    ? 'bg-orange-200 text-orange-800' 
                    : bumdes.status === 'aktif' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-red-500 text-white'
                }`}>
                  {isNotUploaded ? 'Belum Upload' : (bumdes.status || 'Belum diisi')}
                </div>
                {isNotUploaded && (
                  <div className="bg-white/30 px-3 py-1 rounded-full text-xs font-medium">
                    Data Tidak Tersedia
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isNotUploaded && (
                <>
                  <button
                    onClick={() => onEdit(bumdes)}
                    className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-colors duration-300 backdrop-blur-sm"
                    title="Edit Data"
                  >
                    <FiEdit3 className="text-xl" />
                  </button>
                  <button
                    onClick={() => onDelete(bumdes)}
                    className="bg-red-500/80 hover:bg-red-600/90 p-3 rounded-xl transition-colors duration-300 backdrop-blur-sm"
                    title="Hapus Data"
                  >
                    <FiTrash2 className="text-xl" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-colors duration-300 backdrop-blur-sm"
                title="Tutup"
              >
                <FiX className="text-xl" />
              </button>
            </div>
          </div>
        </div>

        {/* Content with 13 Sections */}
        <div className="p-6 space-y-6">
          {/* 1. Identitas BUMDes */}
          <div className={`rounded-2xl p-6 border ${
            isNotUploaded 
              ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100' 
              : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100'
          }`}>
            <h3 className={`text-lg font-bold text-slate-800 mb-4 flex items-center gap-2`}>
              <FiHome className={isNotUploaded ? 'text-orange-600' : 'text-blue-600'} />
              1. Identitas BUMDes
              {isNotUploaded && (
                <span className="text-sm text-orange-600 font-normal ml-2">(Data Belum Upload)</span>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Nama BUMDes</div>
                <div className="font-medium">{bumdes.namabumdesa || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Kode Desa</div>
                <div className="font-medium">{bumdes.kode_desa || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Nama Desa</div>
                <div className="font-medium">{bumdes.desa || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Kecamatan</div>
                <div className="font-medium">{bumdes.kecamatan || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Tahun Pendirian</div>
                <div className="font-medium">{bumdes.TahunPendirian || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Alamat BUMDes</div>
                <div className="font-medium">{bumdes.AlamatBumdesa || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Telepon</div>
                <div className="font-medium">{bumdes.TelfonBumdes || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Email</div>
                <div className="font-medium">{bumdes.Alamatemail || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Tenaga Kerja</div>
                <div className="font-medium">{bumdes.TotalTenagaKerja || '0'} orang</div>
              </div>
            </div>
          </div>

          {/* 2. Status BUMDes */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiActivity className="text-green-600" />
              2. Status BUMDes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Status Operasional</div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  bumdes.status === 'aktif' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {bumdes.status || 'Belum diisi'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Keterangan Tidak Aktif</div>
                <div className="font-medium">{bumdes.keterangan_tidak_aktif || 'Tidak ada'}</div>
              </div>
            </div>
          </div>

          {/* 3. Legalitas */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-6 border border-red-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiFileText className="text-red-600" />
              3. Legalitas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">NIB</div>
                <div className="font-medium">{bumdes.NIB || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">LKPP</div>
                <div className="font-medium">{bumdes.LKPP || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">NPWP</div>
                <div className="font-medium">{bumdes.NPWP || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Badan Hukum</div>
                <div className="font-medium">{bumdes.badanhukum || 'Belum diisi'}</div>
              </div>
            </div>
          </div>

          {/* 4. Profil Pengurus */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiUsers className="text-indigo-600" />
              4. Profil Pengurus
            </h3>
            <div className="space-y-4">
              {/* Penasihat */}
              <div className="bg-white/50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Penasihat</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Nama</div>
                    <div className="font-medium">{bumdes.NamaPenasihat || 'Belum diisi'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Jenis Kelamin</div>
                    <div className="font-medium">{bumdes.JenisKelaminPenasihat || 'Belum diisi'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">No. HP</div>
                    <div className="font-medium">{bumdes.HPPenasihat || 'Belum diisi'}</div>
                  </div>
                </div>
              </div>

              {/* Pengawas */}
              <div className="bg-white/50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Pengawas</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Nama</div>
                    <div className="font-medium">{bumdes.NamaPengawas || 'Belum diisi'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Jenis Kelamin</div>
                    <div className="font-medium">{bumdes.JenisKelaminPengawas || 'Belum diisi'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">No. HP</div>
                    <div className="font-medium">{bumdes.HPPengawas || 'Belum diisi'}</div>
                  </div>
                </div>
              </div>

              {/* Direktur */}
              <div className="bg-white/50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Direktur</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Nama</div>
                    <div className="font-medium">{bumdes.NamaDirektur || 'Belum diisi'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Jenis Kelamin</div>
                    <div className="font-medium">{bumdes.JenisKelaminDirektur || 'Belum diisi'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">No. HP</div>
                    <div className="font-medium">{bumdes.HPDirektur || 'Belum diisi'}</div>
                  </div>
                </div>
              </div>

              {/* Sekretaris */}
              <div className="bg-white/50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Sekretaris</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Nama</div>
                    <div className="font-medium">{bumdes.NamaSekretaris || 'Belum diisi'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Jenis Kelamin</div>
                    <div className="font-medium">{bumdes.JenisKelaminSekretaris || 'Belum diisi'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">No. HP</div>
                    <div className="font-medium">{bumdes.HPSekretaris || 'Belum diisi'}</div>
                  </div>
                </div>
              </div>

              {/* Bendahara */}
              <div className="bg-white/50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Bendahara</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Nama</div>
                    <div className="font-medium">{bumdes.NamaBendahara || 'Belum diisi'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Jenis Kelamin</div>
                    <div className="font-medium">{bumdes.JenisKelaminBendahara || 'Belum diisi'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">No. HP</div>
                    <div className="font-medium">{bumdes.HPBendahara || 'Belum diisi'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Profil Organisasi */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiUsers className="text-teal-600" />
              5. Profil Organisasi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Jumlah Tenaga Kerja</div>
                <div className="font-medium">{bumdes.TotalTenagaKerja || '0'} orang</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Struktur Organisasi</div>
                <div className="font-medium text-sm">
                  {[
                    bumdes.NamaPenasihat && 'Penasihat',
                    bumdes.NamaPengawas && 'Pengawas', 
                    bumdes.NamaDirektur && 'Direktur',
                    bumdes.NamaSekretaris && 'Sekretaris',
                    bumdes.NamaBendahara && 'Bendahara'
                  ].filter(Boolean).join(', ') || 'Belum lengkap'}
                </div>
              </div>
            </div>
          </div>

          {/* 6. Usaha BUMDes */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiActivity className="text-orange-600" />
              6. Usaha BUMDes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Jenis Usaha</div>
                <div className="font-medium">{bumdes.JenisUsaha || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Usaha Utama</div>
                <div className="font-medium">{bumdes.JenisUsahaUtama || 'Belum diisi'}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-500 mb-1">Usaha Lainnya</div>
              <div className="font-medium">{bumdes.JenisUsahaLainnya || 'Belum diisi'}</div>
            </div>
          </div>

          {/* 7. Permodalan dan Aset */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiDollarSign className="text-emerald-600" />
              7. Permodalan dan Aset
            </h3>
            <div className="space-y-6">
              {/* Penyertaan Modal */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Penyertaan Modal</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2019</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.PenyertaanModal2019)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2020</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.PenyertaanModal2020)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2021</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.PenyertaanModal2021)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2022</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.PenyertaanModal2022)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2023</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.PenyertaanModal2023)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2024</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.PenyertaanModal2024)}</div>
                  </div>
                </div>
              </div>

              {/* Aset */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Aset dan Sumber Modal Lain</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Sumber Lain</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.SumberLain)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Nilai Aset</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.NilaiAset)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 8. Kemitraan */}
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiUsers className="text-pink-600" />
              8. Kemitraan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Ketapang 2024</div>
                <div className="font-medium">{bumdes.Ketapang2024 || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Ketapang 2025</div>
                <div className="font-medium">{bumdes.Ketapang2025 || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Desa Wisata</div>
                <div className="font-medium">{bumdes.DesaWisata || 'Belum diisi'}</div>
              </div>
            </div>
          </div>

          {/* 9. Kontribusi PADes */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-violet-600" />
              9. Kontribusi PADes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Kontribusi 2021</div>
                <div className="font-medium text-violet-800">{formatCurrency(bumdes.KontribusiTerhadapPADes2021)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Kontribusi 2022</div>
                <div className="font-medium text-violet-800">{formatCurrency(bumdes.KontribusiTerhadapPADes2022)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Kontribusi 2023</div>
                <div className="font-medium text-violet-800">{formatCurrency(bumdes.KontribusiTerhadapPADes2023)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Kontribusi 2024</div>
                <div className="font-medium text-violet-800">{formatCurrency(bumdes.KontribusiTerhadapPADes2024)}</div>
              </div>
            </div>
          </div>

          {/* 10. Peran BUMDes */}
          <div className="bg-gradient-to-br from-lime-50 to-green-50 rounded-2xl p-6 border border-lime-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiHome className="text-lime-600" />
              10. Peran BUMDes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Peran Ketapang 2024</div>
                <div className="font-medium">{bumdes.Ketapang2024 || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Peran Ketapang 2025</div>
                <div className="font-medium">{bumdes.Ketapang2025 || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Peran Desa Wisata</div>
                <div className="font-medium">{bumdes.DesaWisata || 'Belum diisi'}</div>
              </div>
            </div>
          </div>

          {/* 11. Bantuan */}
          <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-6 border border-sky-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiDollarSign className="text-sky-600" />
              11. Bantuan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Bantuan Kementrian</div>
                <div className="font-medium">{bumdes.BantuanKementrian || 'Belum diisi'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Bantuan Laptop Shopee</div>
                <div className="font-medium">{bumdes.BantuanLaptopShopee || 'Belum diisi'}</div>
              </div>
            </div>
          </div>

          {/* 12. Laporan Keuangan */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiBarChart2 className="text-emerald-600" />
              12. Laporan Keuangan
            </h3>
            <div className="space-y-6">
              {/* Omset */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Omset</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Omset 2021</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.Omset2021)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Omset 2022</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.Omset2022)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Omset 2023</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.Omset2023)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Omset 2024</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.Omset2024)}</div>
                  </div>
                </div>
              </div>

              {/* Laba */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Laba</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Laba 2021</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.Laba2021)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Laba 2022</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.Laba2022)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Laba 2023</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.Laba2023)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Laba 2024</div>
                    <div className="font-medium text-emerald-800">{formatCurrency(bumdes.Laba2024)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 13. Dokumen Pendirian */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiFileText className="text-gray-600" />
              13. Dokumen Pendirian
            </h3>
            
            <div className="space-y-6">
              {/* Basic Document Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Nomor Perdes</div>
                  <div className="font-medium">{bumdes.NomorPerdes || 'Belum diisi'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Status Dokumen</div>
                  <div className="font-medium">
                    {bumdes.NomorPerdes ? 
                      <span className="text-green-600 flex items-center gap-1">
                        <FiCheck className="text-sm" />
                        Tersedia
                      </span> : 
                      <span className="text-red-600 flex items-center gap-1">
                        <FiAlertCircle className="text-sm" />
                        Belum lengkap
                      </span>
                    }
                  </div>
                </div>
              </div>

              {/* Document Management Section */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FiFileText className="text-blue-600" />
                  Kelola Dokumen PDF
                </h4>
                
                {/* Check if document exists */}
                {bumdes.dokumen_pendirian_url ? (
                  /* Document exists - show management options */
                  <div className="space-y-4">
                    {/* Document Preview Card */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                            <FiFileText className="text-white text-xl" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">Dokumen Pendirian</div>
                            <div className="text-sm text-gray-500">PDF • {bumdes.dokumen_file_size || 'Unknown size'}</div>
                            <div className="text-xs text-gray-400">
                              Upload: {bumdes.dokumen_upload_date ? new Date(bumdes.dokumen_upload_date).toLocaleDateString('id-ID') : 'Unknown'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {/* Preview Button */}
                          <button
                            onClick={() => window.open(bumdes.dokumen_pendirian_url, '_blank')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                            title="Buka/Preview PDF"
                          >
                            <FiFileText className="text-sm" />
                            Preview
                          </button>
                          
                          {/* Download Button */}
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = bumdes.dokumen_pendirian_url;
                              link.download = `Dokumen_Pendirian_${bumdes.namabumdesa}.pdf`;
                              link.click();
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                            title="Download PDF"
                          >
                            <FiDownload className="text-sm" />
                            Download
                          </button>
                          
                          {/* Replace Button */}
                          <button
                            onClick={() => {
                              // Trigger file input for replacement
                              const fileInput = document.createElement('input');
                              fileInput.type = 'file';
                              fileInput.accept = '.pdf';
                              fileInput.onchange = (e) => handleDocumentUpload(e.target.files[0], bumdes.id, 'replace');
                              fileInput.click();
                            }}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                            title="Ganti Dokumen"
                          >
                            <FiEdit3 className="text-sm" />
                            Ganti
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDocumentDelete(bumdes.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                            title="Hapus Dokumen"
                          >
                            <FiTrash2 className="text-sm" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* No document - show upload option */
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiUpload className="text-gray-400 text-2xl" />
                    </div>
                    <h4 className="font-medium text-gray-800 mb-2">Belum ada dokumen pendirian</h4>
                    <p className="text-gray-500 text-sm mb-4">Upload dokumen pendirian dalam format PDF</p>
                    
                    <button
                      onClick={() => {
                        // Trigger file input for upload
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = '.pdf';
                        fileInput.onchange = (e) => handleDocumentUpload(e.target.files[0], bumdes.id, 'upload');
                        fileInput.click();
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 mx-auto"
                    >
                      <FiUpload className="text-sm" />
                      Upload Dokumen PDF
                    </button>
                    
                    <div className="text-xs text-gray-400 mt-3">
                      Format: PDF • Maksimal: 10MB
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChartCard = ({ title, children, icon: Icon }) => (
  <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
    <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-xl">
          <Icon className="text-xl" />
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const BumdesDashboardModern = ({ initialData = null, onLogout = null }) => {
  const { 
    bumdesData, 
    loading, 
    error, 
    kecamatanList, 
    refreshData 
  } = useBumdesData(initialData);
  
  const [selectedBumdes, setSelectedBumdes] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kecamatanFilter, setKecamatanFilter] = useState('all');
  const [jenisUsahaFilter, setJenisUsahaFilter] = useState('all');
  const [uploadStatusFilter, setUploadStatusFilter] = useState('all'); // all, uploaded, not_uploaded
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [showAllData, setShowAllData] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // Show notification function
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 4000);
  };

  // Export functions
  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Header with logo area
      doc.setFillColor(17, 38, 66); // Navy blue header
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      // Header text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('LAPORAN DATA BADAN USAHA MILIK DESA (BUMDES)', pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text('KABUPATEN BOGOR', pageWidth / 2, 22, { align: 'center' });
      doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, pageWidth / 2, 29, { align: 'center' });
      
      // Filter information section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('FILTER YANG DITERAPKAN:', 15, 45);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const filterInfo = [];
      if (searchTerm) filterInfo.push(`Pencarian: "${searchTerm}"`);
      if (statusFilter !== 'all') filterInfo.push(`Status: ${statusFilter}`);
      if (kecamatanFilter !== 'all') filterInfo.push(`Kecamatan: ${kecamatanFilter}`);
      if (jenisUsahaFilter !== 'all') filterInfo.push(`Jenis Usaha: ${jenisUsahaFilter}`);
      
      const filterText = filterInfo.length > 0 ? filterInfo.join(' | ') : 'Semua Data (Tanpa Filter)';
      doc.text(filterText, 15, 51);
      
      // Statistics section
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('RINGKASAN STATISTIK', 15, 65);
      
      // Statistics boxes - Updated with new stats
      const stats = [
        { label: 'Dari Total 416 Desa', value: `${statistics.persentaseUpload}%` },
        { label: 'BUMDes Filtered', value: filteredAndSearchedData.length },
        { label: 'BUMDes Aktif', value: filteredAndSearchedData.filter(b => b.status === 'aktif').length },
        { label: 'BUMDes Nonaktif', value: filteredAndSearchedData.filter(b => b.status !== 'aktif').length },
        { label: 'Total Kecamatan', value: [...new Set(filteredAndSearchedData.map(b => b.kecamatan).filter(Boolean))].length }
      ];
      
      stats.forEach((stat, index) => {
        const x = 15 + (index * 55);
        doc.setFillColor(248, 250, 252);
        doc.rect(x, 70, 50, 20, 'F');
        doc.setDrawColor(17, 38, 66);
        doc.rect(x, 70, 50, 20, 'S');
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(stat.label, x + 25, 77, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(stat.value.toString(), x + 25, 85, { align: 'center' });
      });
      
      // Table data with separated village code and name
      const tableData = filteredAndSearchedData.slice(0, 50).map((bumdes, index) => {
        const desaInfo = parseDesaInfo(bumdes.desa);
        return [
          index + 1,
          bumdes.namabumdesa || '-',
          desaInfo.kodeDesa || '-',
          desaInfo.namaDesa || '-',
          bumdes.kecamatan || '-',
          bumdes.TahunPendirian || '-',
          bumdes.status || '-',
          bumdes.JenisUsaha || '-',
          parseInt(bumdes.TotalTenagaKerja) || 0
        ];
      });

      autoTable(doc, {
        head: [['No', 'Nama BUMDes', 'Kode Desa', 'Nama Desa', 'Kecamatan', 'Tahun', 'Status', 'Jenis Usaha', 'SDM']],
        body: tableData,
        startY: 100,
        styles: { 
          fontSize: 8, 
          cellPadding: 3,
          halign: 'center',
          valign: 'middle'
        },
        headStyles: { 
          fillColor: [17, 38, 66], 
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 15 }, // No
          1: { cellWidth: 50, halign: 'left' }, // Nama BUMDes
          2: { cellWidth: 25 }, // Kode Desa
          3: { cellWidth: 40, halign: 'left' }, // Nama Desa
          4: { cellWidth: 35, halign: 'left' }, // Kecamatan
          5: { cellWidth: 20 }, // Tahun
          6: { cellWidth: 25 }, // Status
          7: { cellWidth: 40, halign: 'left' }, // Jenis Usaha
          8: { cellWidth: 20 } // SDM
        },
        margin: { left: 15, right: 15 },
        tableLineWidth: 0.1,
        tableLineColor: [17, 38, 66]
      });

      // Footer
      const finalY = doc.lastAutoTable.finalY || 200;
      
      // Add note if data is truncated
      if (filteredAndSearchedData.length > 50) {
        doc.setFontSize(8);
        doc.setTextColor(220, 38, 127);
        doc.text(`*Menampilkan 50 dari ${filteredAndSearchedData.length} data BUMDes untuk optimasi tampilan`, 15, finalY + 15);
      }
      
      // Footer line
      doc.setDrawColor(17, 38, 66);
      doc.line(15, pageHeight - 25, pageWidth - 15, pageHeight - 25);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor', 15, pageHeight - 15);
      doc.text(`Halaman 1 - Digenerate pada ${new Date().toLocaleString('id-ID')}`, pageWidth - 15, pageHeight - 15, { align: 'right' });

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      doc.save(`laporan-bumdes-${timestamp}.pdf`);
      
      showNotification('success', 'File PDF berhasil diunduh!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showNotification('error', 'Gagal mengunduh PDF. Silakan coba lagi.');
    }
  };

  const exportToExcel = () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create statistics worksheet with enhanced formatting
      const currentDate = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Filter information
      const filterInfo = [];
      if (searchTerm) filterInfo.push(`Pencarian: "${searchTerm}"`);
      if (statusFilter !== 'all') filterInfo.push(`Status: ${statusFilter}`);
      if (kecamatanFilter !== 'all') filterInfo.push(`Kecamatan: ${kecamatanFilter}`);
      if (jenisUsahaFilter !== 'all') filterInfo.push(`Jenis Usaha: ${jenisUsahaFilter}`);
      
      const statsData = [
        ['LAPORAN DATA BADAN USAHA MILIK DESA (BUMDES)'],
        ['KABUPATEN BOGOR'],
        [''],
        ['Tanggal Export:', currentDate],
        [''],
        ['FILTER YANG DITERAPKAN:'],
        [filterInfo.length > 0 ? filterInfo.join(' | ') : 'Semua Data (Tanpa Filter)'],
        [''],
        ['RINGKASAN STATISTIK'],
        ['Total Desa di Kabupaten Bogor:', statistics.totalDesaBogor],
        ['BUMDes Sudah Upload:', `${statistics.totalBumdesUploaded} (${statistics.persentaseUpload}%)`],
        ['BUMDes Belum Upload:', `${statistics.totalBumdesBelumUpload} (${statistics.persentaseBelumUpload}%)`],
        ['Data Sesuai Filter:', filteredAndSearchedData.length],
        ['BUMDes Aktif (dari filter):', filteredAndSearchedData.filter(b => b.status === 'aktif').length],
        ['BUMDes Nonaktif (dari filter):', filteredAndSearchedData.filter(b => b.status !== 'aktif').length],
        ['Total Kecamatan Terwakili:', [...new Set(filteredAndSearchedData.map(b => b.kecamatan).filter(Boolean))].length],
        [''],
        ['BREAKDOWN STATUS OPERASIONAL:'],
        ...Object.entries(
          filteredAndSearchedData.reduce((acc, bumdes) => {
            const status = bumdes.status || 'Tidak Diketahui';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {})
        ).map(([status, count]) => [`${status}:`, count]),
        [''],
        ['BREAKDOWN PER KECAMATAN:'],
        ...Object.entries(
          filteredAndSearchedData.reduce((acc, bumdes) => {
            const kecamatan = bumdes.kecamatan || 'Tidak Diketahui';
            acc[kecamatan] = (acc[kecamatan] || 0) + 1;
            return acc;
          }, {})
        ).map(([kecamatan, count]) => [`${kecamatan}:`, count])
      ];

      // Create detail data worksheet with separated village code
      const detailHeaders = [
        'No', 'Nama BUMDes', 'Kode Desa', 'Nama Desa', 'Kecamatan', 'Alamat Lengkap', 
        'No. Telepon', 'Email', 'Tahun Pendirian', 'Status Operasional', 
        'Jenis Usaha', 'Tenaga Kerja', 'Nama Direktur', 'Badan Hukum',
        'Omset 2024 (Rp)', 'Laba 2024 (Rp)'
      ];

      const detailData = [detailHeaders];

      filteredAndSearchedData.forEach((bumdes, index) => {
        const desaInfo = parseDesaInfo(bumdes.desa);
        detailData.push([
          index + 1,
          bumdes.namabumdesa || '-',
          desaInfo.kodeDesa || '-',
          desaInfo.namaDesa || '-',
          bumdes.kecamatan || '-',
          bumdes.AlamatBumdesa || '-',
          bumdes.TelfonBumdes || '-',
          bumdes.Alamatemail || '-',
          bumdes.TahunPendirian || '-',
          bumdes.status || '-',
          bumdes.JenisUsaha || '-',
          parseInt(bumdes.TotalTenagaKerja) || 0,
          bumdes.NamaDirektur || '-',
          bumdes.badanhukum || '-',
          bumdes.Omset2024 ? parseInt(bumdes.Omset2024) : 0,
          bumdes.Laba2024 ? parseInt(bumdes.Laba2024) : 0
        ]);
      });

      // Create worksheets
      const wsStats = XLSX.utils.aoa_to_sheet(statsData);
      const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
      
      // Set column widths for statistics sheet
      wsStats['!cols'] = [
        { width: 25 },
        { width: 20 }
      ];
      
      // Enhanced styling for statistics sheet
      wsStats['!cols'] = [
        { width: 35 },  // Label column
        { width: 25 }   // Value column
      ];
      
      // Merge cells for main title
      wsStats['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Title row
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }  // Subtitle row
      ];

      // Set column widths for detail sheet with proper spacing
      wsDetail['!cols'] = [
        { width: 5 },   // No
        { width: 30 },  // Nama BUMDes
        { width: 15 },  // Kode Desa
        { width: 20 },  // Nama Desa
        { width: 20 },  // Kecamatan
        { width: 35 },  // Alamat
        { width: 15 },  // Telepon
        { width: 30 },  // Email
        { width: 12 },  // Tahun
        { width: 18 },  // Status
        { width: 25 },  // Jenis Usaha
        { width: 12 },  // Tenaga Kerja
        { width: 25 },  // Direktur
        { width: 18 },  // Badan Hukum
        { width: 18 },  // Omset
        { width: 18 }   // Laba
      ];

      // Apply formatting to detail sheet
      const detailRange = XLSX.utils.decode_range(wsDetail['!ref']);
      for (let row = 0; row <= detailRange.e.r; row++) {
        for (let col = 0; col <= detailRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!wsDetail[cellAddress]) continue;
          
          // Header row styling
          if (row === 0) {
            wsDetail[cellAddress].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "112642" } },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              }
            };
          } 
          // Data rows styling
          else {
            wsDetail[cellAddress].s = {
              alignment: { horizontal: col === 0 || col >= 11 ? "center" : "left", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "E5E7EB" } },
                bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                left: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
              }
            };
            
            // Alternate row colors
            if (row % 2 === 0) {
              wsDetail[cellAddress].s.fill = { fgColor: { rgb: "F8FAFC" } };
            }
          }
          
          // Currency formatting for Omset and Laba columns
          if ((col === 14 || col === 15) && row > 0 && typeof wsDetail[cellAddress].v === 'number') {
            wsDetail[cellAddress].z = '"Rp "#,##0';
          }
        }
      }
      
      // Freeze panes for header
      wsDetail['!freeze'] = { xSplit: 0, ySplit: 1 };
      
      // Add worksheets to workbook
      XLSX.utils.book_append_sheet(wb, wsStats, 'Ringkasan Statistik');
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Data Detail BUMDes');
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      XLSX.writeFile(wb, `laporan-bumdes-${timestamp}.xlsx`);
      
      showNotification('success', 'File Excel berhasil diunduh!');
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Gagal mengunduh Excel. Silakan coba lagi.');
    }
  };

  // Document management functions
  const handleDocumentUpload = async (file, bumdesId, action) => {
    if (!file) return;
    
    // Validate file
    if (file.type !== 'application/pdf') {
      showNotification('error', 'File harus berformat PDF!');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showNotification('error', 'Ukuran file maksimal 10MB!');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('dokumen_pendirian', file);
      formData.append('action', action);
      
      showNotification('info', 'Sedang mengupload dokumen...');
      
      const response = await fetch(`http://localhost:8000/api/bumdes/${bumdesId}/dokumen`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        showNotification('success', `Dokumen berhasil ${action === 'replace' ? 'diganti' : 'diupload'}!`);
        
        // Update selected bumdes data
        if (selectedBumdes && selectedBumdes.id === bumdesId) {
          setSelectedBumdes({
            ...selectedBumdes,
            dokumen_pendirian_url: result.dokumen_url,
            dokumen_file_size: result.file_size,
            dokumen_upload_date: result.upload_date
          });
        }
        
        // Refresh data
        refreshData();
      } else {
        const errorData = await response.json();
        showNotification('error', 'Gagal mengupload dokumen: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      showNotification('error', 'Terjadi kesalahan saat mengupload dokumen');
    }
  };

  const handleDocumentDelete = async (bumdesId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus dokumen pendirian ini?')) {
      return;
    }
    
    try {
      showNotification('info', 'Sedang menghapus dokumen...');
      
      const response = await fetch(`http://localhost:8000/api/bumdes/${bumdesId}/dokumen`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showNotification('success', 'Dokumen berhasil dihapus!');
        
        // Update selected bumdes data
        if (selectedBumdes && selectedBumdes.id === bumdesId) {
          setSelectedBumdes({
            ...selectedBumdes,
            dokumen_pendirian_url: null,
            dokumen_file_size: null,
            dokumen_upload_date: null
          });
        }
        
        // Refresh data
        refreshData();
      } else {
        const errorData = await response.json();
        showNotification('error', 'Gagal menghapus dokumen: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      showNotification('error', 'Terjadi kesalahan saat menghapus dokumen');
    }
  };

  // Generate virtual data for BUMDes yang belum upload
  const generateNotUploadedBumdes = () => {
    const TOTAL_DESA_BOGOR = 416;
    const uploadedDesaNames = new Set(bumdesData.map(b => `${b.kecamatan}-${b.desa}`));
    const notUploadedData = [];
    
    // Sample kecamatan dari data yang sudah ada
    const existingKecamatan = [...new Set(bumdesData.map(b => b.kecamatan).filter(Boolean))];
    
    // Generate data virtual untuk desa yang belum upload
    const currentUploaded = bumdesData.length;
    const notUploadedCount = TOTAL_DESA_BOGOR - currentUploaded;
    
    for (let i = 1; i <= notUploadedCount; i++) {
      const randomKecamatan = existingKecamatan[Math.floor(Math.random() * existingKecamatan.length)] || 'KECAMATAN_LAIN';
      const desaName = `DESA_BELUM_UPLOAD_${i}`;
      const kodeDesa = `32011${String(i).padStart(5, '0')}`;
      
      notUploadedData.push({
        id: `virtual_${i}`,
        kode_desa: kodeDesa,
        kecamatan: randomKecamatan,
        desa: desaName,
        namabumdesa: `BUMDes ${desaName}`,
        status: 'belum_upload',
        upload_status: 'not_uploaded',
        // Semua field lain akan kosong/null untuk ditampilkan sebagai "Belum diisi"
        keterangan_tidak_aktif: null,
        NIB: null,
        LKPP: null,
        NPWP: null,
        badanhukum: null,
        TahunPendirian: null,
        AlamatBumdesa: null,
        // ... semua field lainnya null
      });
    }
    
    return notUploadedData;
  };

  // Combine uploaded and not uploaded data based on filter
  const getAllBumdesData = () => {
    const uploadedData = bumdesData.map(b => ({ ...b, upload_status: 'uploaded' }));
    const notUploadedData = generateNotUploadedBumdes();
    
    if (uploadStatusFilter === 'uploaded') {
      return uploadedData;
    } else if (uploadStatusFilter === 'not_uploaded') {
      return notUploadedData;
    } else {
      return [...uploadedData, ...notUploadedData];
    }
  };

  // Filter and search functions
  const filteredBumdesData = getAllBumdesData().filter(bumdes => {
    const desaInfo = parseDesaInfo(bumdes.desa);
    const matchesSearch = bumdes.namabumdesa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bumdes.desa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         desaInfo.namaDesa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         desaInfo.kodeDesa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bumdes.kecamatan?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Untuk data yang belum upload, hanya filter berdasarkan upload status dan search
    if (bumdes.upload_status === 'not_uploaded') {
      return matchesSearch;
    }
    
    // Untuk data yang sudah upload, gunakan semua filter
    const matchesStatus = statusFilter === 'all' || bumdes.status === statusFilter;
    const matchesKecamatan = kecamatanFilter === 'all' || bumdes.kecamatan === kecamatanFilter;
    const matchesJenisUsaha = jenisUsahaFilter === 'all' || bumdes.JenisUsaha === jenisUsahaFilter;
    
    return matchesSearch && matchesStatus && matchesKecamatan && matchesJenisUsaha;
  });

  // Pagination
  const totalPages = Math.ceil(filteredBumdesData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = showAllData ? filteredBumdesData : filteredBumdesData.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleShowAll = () => {
    setShowAllData(true);
    setCurrentPage(1);
  };

  const handleShowPaginated = () => {
    setShowAllData(false);
    setCurrentPage(1);
  };
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBumdes, setEditingBumdes] = useState(null);
  const [showAllBumdes, setShowAllBumdes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBumdes, setDeletingBumdes] = useState(null);

  const handleBumdesClick = (bumdes) => {
    const isNotUploaded = bumdes.upload_status === 'not_uploaded';
    
    // Untuk data yang belum upload, tampilkan data kosong dengan format yang konsisten
    if (isNotUploaded) {
      setSelectedBumdes({
        ...bumdes,
        // Data yang sudah ada dari virtual data
        namabumdesa: bumdes.namabumdesa,
        desa: bumdes.desa,
        kecamatan: bumdes.kecamatan,
        kode_desa: bumdes.kode_desa,
        upload_status: 'not_uploaded',
        // Set semua field lainnya sebagai null atau nilai default
        TahunPendirian: null,
        status: null,
        JenisUsaha: null,
        TotalTenagaKerja: null,
        NilaiAset: null,
        VolumeUsaha: null,
        SisaHasilUsaha: null,
        TotalModal: null,
        ModalAwal: null,
        Keuntungan: null,
        Kerugian: null,
        created_at: null,
        updated_at: null
      });
    } else {
      // Untuk data yang sudah upload, gunakan data asli
      setSelectedBumdes(bumdes);
    }
    
    setShowDetailModal(true);
  };

  const handleEditClick = (bumdes) => {
    setEditingBumdes(bumdes);
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedBumdes(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingBumdes(null);
  };

  const handleDeleteClick = (bumdes) => {
    setDeletingBumdes(bumdes);
    setShowDetailModal(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBumdes) return;

    try {
      const response = await fetch(`http://localhost:8000/api/bumdes/${deletingBumdes.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Refresh data setelah berhasil delete
        refreshData();
        setShowDeleteConfirm(false);
        setDeletingBumdes(null);
        alert('Data BUMDes berhasil dihapus!');
      } else {
        const errorData = await response.json();
        alert('Gagal menghapus data: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting bumdes:', error);
      alert('Terjadi kesalahan saat menghapus data');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingBumdes(null);
  };
  
  const {
    filteredData,
    getStatistics
  } = useBumdesFilter(bumdesData);

  // Get unique jenis usaha list
  const jenisUsahaList = [...new Set(bumdesData.map(item => item.JenisUsaha).filter(Boolean))].sort();

  // Filter and search data
  const filteredAndSearchedData = bumdesData.filter(bumdes => {
    const desaInfo = parseDesaInfo(bumdes.desa);
    const matchesSearch = searchTerm === '' || 
      bumdes.namabumdesa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bumdes.desa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desaInfo.namaDesa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desaInfo.kodeDesa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bumdes.kecamatan?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || bumdes.status === statusFilter;
    const matchesKecamatan = kecamatanFilter === 'all' || bumdes.kecamatan === kecamatanFilter;
    const matchesJenisUsaha = jenisUsahaFilter === 'all' || bumdes.JenisUsaha === jenisUsahaFilter;
    
    return matchesSearch && matchesStatus && matchesKecamatan && matchesJenisUsaha;
  });

  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!initialData && bumdesData.length === 0) {
      refreshData();
    }
  }, [initialData, bumdesData.length, refreshData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20 text-center max-w-md">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-slate-200 rounded-full mx-auto"></div>
            <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FiActivity className="text-blue-600 text-2xl animate-pulse" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Memuat Dashboard</h3>
          <p className="text-slate-600">Mengambil data BUMDes terbaru...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-red-100 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-red-200 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FiFileText className="text-red-600 text-2xl" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-4">Gagal Memuat Data</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            onClick={refreshData}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            <FiRefreshCw className="text-lg" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const statistics = getStatistics();

  return (
    <div className="min-h-screen bg-gray-50 -m-2">
      {/* Enhanced Header */}
      <div className="text-center mb-12 px-4 lg:px-6">
        <div className="relative inline-block">
          <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl transform rotate-3">
            <FiHome className="text-white text-3xl transform -rotate-3" />
          </div>
          <div className="absolute -top-1 -right-1">
            <HiSparkles className="text-yellow-400 text-2xl animate-pulse" />
          </div>
        </div>
        
        <h1 className="text-5xl font-bold text-slate-800 mb-4">
          Dashboard BUMDes
        </h1>
        <p className="text-xl text-slate-600 font-medium">
          Ringkasan dan Statistik BUMDes Kabupaten Bogor
        </p>
        <div className="w-32 h-1 bg-slate-800 rounded-full mx-auto mt-6"></div>
        
        {/* Export Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-slate-800 text-white hover:bg-slate-700 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <FiDownload />
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <FiDownload />
            Export Excel
          </button>
        </div>
      </div>

      <div className="px-4 lg:px-6 space-y-8">
        {/* Quick Summary Banner */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-3xl p-6 lg:p-8 text-white shadow-2xl border border-white/10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">Dashboard Monitoring BUMDes</h2>
              <p className="text-slate-300 text-sm lg:text-base">
                Monitoring real-time data BUMDes untuk {statistics.totalDesaBogor} desa di Kabupaten Bogor
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center lg:justify-end gap-4">
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 min-w-[120px]">
                <div className="text-2xl font-bold text-emerald-400">{statistics.persentaseUpload}%</div>
                <div className="text-xs text-slate-300">Coverage</div>
              </div>
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 min-w-[120px]">
                <div className="text-2xl font-bold text-blue-400">{statistics.totalBumdesUploaded}</div>
                <div className="text-xs text-slate-300">Data Terkumpul</div>
              </div>
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 min-w-[120px]">
                <div className="text-2xl font-bold text-purple-400">{statistics.totalKecamatan}</div>
                <div className="text-xs text-slate-300">Kecamatan</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Dashboard - BASIS 416 DESA KABUPATEN BOGOR */}
        <div className="space-y-8">
          {/* Main Statistics - Large Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <StatCard
              title="Total Desa Kabupaten Bogor"
              value={statistics.totalDesaBogor}
              subtitle="Basis perhitungan BUMDes di seluruh wilayah"
              icon={FiHome}
              color="bg-gradient-to-br from-slate-800 to-slate-900"
              textColor="text-white"
              accentColor="bg-slate-400/30"
              size="large"
            />
            
            <StatCard
              title="Data Sudah Upload"
              value={statistics.totalBumdesUploaded}
              subtitle={`${statistics.persentaseUpload}% dari total desa telah mengupload data BUMDes`}
              icon={FiUpload}
              trend={`${statistics.persentaseUpload}%`}
              color="bg-gradient-to-br from-emerald-600 to-green-700"
              textColor="text-white"
              accentColor="bg-emerald-400/30"
              size="large"
            />
            
            <StatCard
              title="Data Belum Upload"
              value={statistics.totalBumdesBelumUpload}
              subtitle={`${statistics.persentaseBelumUpload}% desa belum mengupload data BUMDes`}
              icon={FiAlertCircle}
              trend={`${statistics.persentaseBelumUpload}%`}
              color="bg-gradient-to-br from-red-600 to-rose-700"
              textColor="text-white"
              accentColor="bg-red-400/30"
              size="large"
            />
          </div>

          {/* Secondary Statistics - Normal Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
            <StatCard
              title="BUMDes Aktif"
              value={filteredAndSearchedData.filter(b => b.status === 'aktif').length}
              subtitle="Sedang beroperasi"
              icon={FiActivity}
              color="bg-gradient-to-br from-blue-600 to-indigo-700"
              textColor="text-white"
              accentColor="bg-blue-400/30"
            />
            
            <StatCard
              title="BUMDes Tidak Aktif"
              value={filteredAndSearchedData.filter(b => b.status === 'tidak aktif').length}
              subtitle="Tidak beroperasi"
              icon={FiPause}
              color="bg-gradient-to-br from-amber-600 to-orange-600"
              textColor="text-white"
              accentColor="bg-amber-400/30"
            />
            
            <StatCard
              title="Total Kecamatan"
              value={statistics.totalKecamatan}
              subtitle="Wilayah terwakili"
              icon={FiMapPin}
              color="bg-gradient-to-br from-purple-600 to-violet-700"
              textColor="text-white"
              accentColor="bg-purple-400/30"
            />

            <StatCard
              title="Rata-rata per Kecamatan"
              value={Math.round(statistics.totalBumdesUploaded / statistics.totalKecamatan)}
              subtitle="BUMDes per kecamatan"
              icon={FiBarChart2}
              color="bg-gradient-to-br from-teal-600 to-cyan-700"
              textColor="text-white"
              accentColor="bg-teal-400/30"
            />

            <StatCard
              title="Tingkat Partisipasi"
              value={`${statistics.persentaseUpload}%`}
              subtitle="Desa berpartisipasi"
              icon={FiTrendingUp}
              trend={statistics.persentaseUpload > 50 ? 'Baik' : 'Perlu Ditingkatkan'}
              color="bg-gradient-to-br from-pink-600 to-rose-700"
              textColor="text-white"
              accentColor="bg-pink-400/30"
            />

            <StatCard
              title="Target Pencapaian"
              value={`${Math.min(100, Math.round((statistics.totalBumdesUploaded / statistics.totalDesaBogor) * 100))}%`}
              subtitle="Menuju 100% upload"
              icon={FiTarget}
              color="bg-gradient-to-br from-indigo-600 to-blue-700"
              textColor="text-white"
              accentColor="bg-indigo-400/30"
            />
          </div>

          {/* Progress Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Progress */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
                  <FiUpload className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Progress Upload Data</h3>
                  <p className="text-sm text-slate-600">Status pengumpulan data BUMDes</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                    <span>Data Sudah Upload</span>
                    <span>{statistics.persentaseUpload}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-green-600 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${statistics.persentaseUpload}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                    <span>Data Belum Upload</span>
                    <span>{statistics.persentaseBelumUpload}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-rose-600 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${statistics.persentaseBelumUpload}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Operational */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                  <FiActivity className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Status Operasional</h3>
                  <p className="text-sm text-slate-600">Kondisi BUMDes yang sudah upload</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                    <span>BUMDes Aktif</span>
                    <span>{filteredAndSearchedData.filter(b => b.status === 'aktif').length} unit</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${Math.round((filteredAndSearchedData.filter(b => b.status === 'aktif').length / statistics.totalBumdesUploaded) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                    <span>BUMDes Tidak Aktif</span>
                    <span>{filteredAndSearchedData.filter(b => b.status === 'tidak aktif').length} unit</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-orange-600 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${Math.round((filteredAndSearchedData.filter(b => b.status === 'tidak aktif').length / statistics.totalBumdesUploaded) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Status Upload Per Kecamatan */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
                <FiMapPin className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Monitoring BUMDes per Kecamatan</h3>
                <p className="text-gray-600 text-sm">Analisis sebaran dan status BUMDes di seluruh wilayah</p>
              </div>
            </div>
            
            {/* Summary Cards */}
            <div className="flex flex-wrap gap-2">
              <div className="bg-emerald-100 text-emerald-800 px-3 py-2 rounded-xl text-xs font-semibold">
                {statistics.kecamatanData.reduce((sum, k) => sum + k.uploaded, 0)} Total Upload
              </div>
              <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-xl text-xs font-semibold">
                {statistics.kecamatanData.reduce((sum, k) => sum + k.aktif, 0)} Aktif
              </div>
            </div>
          </div>
          
          {/* Responsive Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            {statistics.kecamatanData.map((kecamatan, index) => (
              <div 
                key={kecamatan.name} 
                className={`group relative bg-gradient-to-br ${
                  index % 5 === 0 ? 'from-blue-50 to-indigo-100 border-blue-200 hover:from-blue-100 hover:to-indigo-200' :
                  index % 5 === 1 ? 'from-green-50 to-emerald-100 border-green-200 hover:from-green-100 hover:to-emerald-200' :
                  index % 5 === 2 ? 'from-purple-50 to-violet-100 border-purple-200 hover:from-purple-100 hover:to-violet-200' :
                  index % 5 === 3 ? 'from-orange-50 to-amber-100 border-orange-200 hover:from-orange-100 hover:to-amber-200' :
                  'from-pink-50 to-rose-100 border-pink-200 hover:from-pink-100 hover:to-rose-200'
                } rounded-2xl p-4 border transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer`}
              >
                {/* Kecamatan Name */}
                <div className={`text-sm font-bold mb-3 ${
                  index % 5 === 0 ? 'text-blue-800' :
                  index % 5 === 1 ? 'text-green-800' :
                  index % 5 === 2 ? 'text-purple-800' :
                  index % 5 === 3 ? 'text-orange-800' :
                  'text-pink-800'
                } group-hover:scale-105 transition-transform duration-300`}>
                  {kecamatan.name}
                </div>
                
                {/* Statistics */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-xs text-gray-600 font-medium">Upload</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                      {kecamatan.uploaded}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-gray-600 font-medium">Aktif</span>
                    </div>
                    <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                      {kecamatan.aktif}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="text-xs text-gray-600 font-medium">Non-Aktif</span>
                    </div>
                    <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                      {kecamatan.nonAktif}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{Math.round((kecamatan.uploaded / (kecamatan.uploaded + kecamatan.aktif + kecamatan.nonAktif)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-1000 ease-out ${
                          index % 5 === 0 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                          index % 5 === 1 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                          index % 5 === 2 ? 'bg-gradient-to-r from-purple-400 to-violet-500' :
                          index % 5 === 3 ? 'bg-gradient-to-r from-orange-400 to-amber-500' :
                          'bg-gradient-to-r from-pink-400 to-rose-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, Math.round((kecamatan.uploaded / (kecamatan.uploaded + kecamatan.aktif + kecamatan.nonAktif)) * 100))}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Badan Hukum Statistics */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
              <FiFileText className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Statistik Badan Hukum</h3>
              <p className="text-gray-600 text-sm">Breakdown status badan hukum BUMDes</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(
              filteredAndSearchedData.reduce((acc, bumdes) => {
                const badanHukum = bumdes.badanhukum || 'Belum Diisi';
                acc[badanHukum] = (acc[badanHukum] || 0) + 1;
                return acc;
              }, {})
            ).map(([status, count], index) => (
              <div key={status} className={`bg-gradient-to-br ${
                index % 4 === 0 ? 'from-blue-50 to-indigo-100 border-blue-200' :
                index % 4 === 1 ? 'from-green-50 to-emerald-100 border-green-200' :
                index % 4 === 2 ? 'from-purple-50 to-violet-100 border-purple-200' :
                'from-orange-50 to-amber-100 border-orange-200'
              } rounded-2xl p-4 border`}>
                <div className={`text-sm font-medium mb-1 ${
                  index % 4 === 0 ? 'text-blue-600' :
                  index % 4 === 1 ? 'text-green-600' :
                  index % 4 === 2 ? 'text-purple-600' :
                  'text-orange-600'
                }`}>
                  {status}
                </div>
                <div className={`text-2xl font-bold ${
                  index % 4 === 0 ? 'text-blue-800' :
                  index % 4 === 1 ? 'text-green-800' :
                  index % 4 === 2 ? 'text-purple-800' :
                  'text-orange-800'
                }`}>
                  {count}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {((count / filteredAndSearchedData.length) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Status Chart */}
          <ChartCard title="Distribusi Status BUMDes" icon={FiBarChart2}>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-slate-700">Aktif</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{statistics.activeBumdes}</div>
                  <div className="text-sm text-green-600">
                    {statistics.totalBumdes > 0 ? Math.round((statistics.activeBumdes / statistics.totalBumdes) * 100) : 0}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="font-medium text-slate-700">Tidak Aktif</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{statistics.totalBumdes - statistics.activeBumdes}</div>
                  <div className="text-sm text-red-600">
                    {statistics.totalBumdes > 0 ? Math.round(((statistics.totalBumdes - statistics.activeBumdes) / statistics.totalBumdes) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </ChartCard>

          {/* Kecamatan Distribution */}
          <ChartCard title="Distribusi per Kecamatan" icon={FiMapPin}>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {kecamatanList.length > 0 ? kecamatanList.slice(0, 8).map((kecamatan, index) => {
                const bumdesCount = bumdesData.filter(b => b.kecamatan === kecamatan).length;
                const maxCount = Math.max(...kecamatanList.map(k => 
                  bumdesData.filter(b => b.kecamatan === k).length
                ), 1);
                const percentage = maxCount > 0 ? (bumdesCount / maxCount) * 100 : 0;
                
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {kecamatan}
                        </span>
                        <span className="text-sm text-slate-500 font-semibold">{bumdesCount} BUMDes</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-slate-600 to-slate-800 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-slate-500">
                  <FiMapPin className="mx-auto text-4xl mb-2 opacity-50" />
                  <p>Belum ada data distribusi kecamatan</p>
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Advanced Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Performing Kecamatan */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
                <FiTrendingUp className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Kecamatan Terbaik</h3>
                <p className="text-gray-600 text-sm">Berdasarkan jumlah upload</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {statistics.kecamatanData
                .sort((a, b) => b.uploaded - a.uploaded)
                .slice(0, 5)
                .map((kecamatan, index) => (
                  <div key={kecamatan.name} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-slate-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{kecamatan.name}</div>
                        <div className="text-xs text-green-600">{kecamatan.aktif} aktif</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-700">{kecamatan.uploaded}</div>
                      <div className="text-xs text-green-600">BUMDes</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Upload Rate Analysis */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                <FiUpload className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Analisis Upload</h3>
                <p className="text-gray-600 text-sm">Status dan target pencapaian</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="text-3xl font-bold text-blue-700 mb-1">{statistics.persentaseUpload}%</div>
                <div className="text-sm text-slate-600 mb-2">Coverage Saat Ini</div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${statistics.persentaseUpload}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="text-lg font-bold text-emerald-700">{statistics.totalBumdesUploaded}</div>
                  <div className="text-xs text-slate-600">Sudah Upload</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="text-lg font-bold text-red-700">{statistics.totalBumdesBelumUpload}</div>
                  <div className="text-xs text-slate-600">Belum Upload</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-600 mb-2">Target yang diperlukan untuk 100%:</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Kekurangan Data:</span>
                  <span className="text-lg font-bold text-slate-800">{statistics.totalBumdesBelumUpload} BUMDes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Summary */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl">
                <FiActivity className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Ringkasan Status</h3>
                <p className="text-gray-600 text-sm">Kondisi operasional BUMDes</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-700">BUMDes Aktif</span>
                  </div>
                  <span className="text-xl font-bold text-green-700">
                    {filteredAndSearchedData.filter(b => b.status === 'aktif').length}
                  </span>
                </div>
                <div className="text-xs text-green-600">
                  {Math.round((filteredAndSearchedData.filter(b => b.status === 'aktif').length / statistics.totalBumdesUploaded) * 100)}% dari yang upload
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-700">Tidak Aktif</span>
                  </div>
                  <span className="text-xl font-bold text-amber-700">
                    {filteredAndSearchedData.filter(b => b.status === 'tidak aktif').length}
                  </span>
                </div>
                <div className="text-xs text-amber-600">
                  Membutuhkan perhatian khusus
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-100 rounded-xl border border-slate-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-700 mb-1">
                    {Math.round(statistics.totalBumdesUploaded / statistics.totalKecamatan)}
                  </div>
                  <div className="text-xs text-slate-600">Rata-rata BUMDes per Kecamatan</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BUMDes List */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-slate-800 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <FiBarChart2 className="text-xl" />
                </div>
                <h3 className="text-xl font-bold">Daftar BUMDes</h3>
                <div className="text-white/80 text-sm">
                  ({filteredBumdesData.length} dari {bumdesData.length} total)
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={showAllData ? handleShowPaginated : handleShowAll}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {showAllData ? 'Tampilkan dengan Halaman' : 'Lihat Semua'}
                </button>
              </div>
            </div>
            
            {/* Search and Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="relative md:col-span-2 lg:col-span-2">
                <input
                  type="text"
                  placeholder="Cari nama BUMDes, desa, atau kecamatan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>

              <CustomDropdown
                value={uploadStatusFilter}
                onChange={setUploadStatusFilter}
                options={[
                  { value: 'all', label: 'Semua Data' },
                  { value: 'uploaded', label: 'Sudah Upload' },
                  { value: 'not_uploaded', label: 'Belum Upload' }
                ]}
                placeholder="Status Upload"
              />
              
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'Semua Status' },
                  { value: 'aktif', label: 'Aktif' },
                  { value: 'tidak aktif', label: 'Tidak Aktif' }
                ]}
                placeholder="Status Operasional"
              />
              
              <CustomDropdown
                value={kecamatanFilter}
                onChange={setKecamatanFilter}
                options={[
                  { value: 'all', label: 'Semua Kecamatan' },
                  ...kecamatanList.map(kecamatan => ({
                    value: kecamatan,
                    label: kecamatan
                  }))
                ]}
                placeholder="Pilih Kecamatan"
              />

              <CustomDropdown
                value={jenisUsahaFilter}
                onChange={setJenisUsahaFilter}
                options={[
                  { value: 'all', label: 'Semua Jenis Usaha' },
                  ...jenisUsahaList.map(jenisUsaha => ({
                    value: jenisUsaha,
                    label: jenisUsaha
                  }))
                ]}
                placeholder="Pilih Jenis Usaha"
              />
            </div>
          </div>
          
          <div className="p-6">
            {paginatedData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedData.map((bumdes, index) => (
                    <BumdesCard 
                      key={bumdes.id || index} 
                      bumdes={bumdes} 
                      onClick={handleBumdesClick}
                    />
                  ))}
                </div>
                
                {/* Pagination */}
                {!showAllData && totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg bg-slate-800 text-white disabled:bg-gray-300 disabled:text-gray-500 hover:bg-slate-700 transition-colors"
                      >
                        ←
                      </button>
                      
                      {[...Array(totalPages)].map((_, index) => {
                        const page = index + 1;
                        if (page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) {
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-2 rounded-lg transition-colors ${
                                currentPage === page
                                  ? 'bg-slate-800 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === currentPage - 3 || page === currentPage + 3) {
                          return <span key={page} className="px-2 text-gray-500">...</span>;
                        }
                        return null;
                      })}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg bg-slate-800 text-white disabled:bg-gray-300 disabled:text-gray-500 hover:bg-slate-700 transition-colors"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Items per page selector */}
                {!showAllData && (
                  <div className="flex justify-center items-center gap-2 mt-4 text-sm text-gray-600">
                    <span>Tampilkan per halaman:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded bg-white"
                    >
                      <option value={6}>6</option>
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FiBarChart2 className="mx-auto text-6xl mb-4 opacity-30" />
                <h3 className="text-xl font-semibold mb-2">Tidak ada data yang ditemukan</h3>
                <p>Coba ubah filter atau kata kunci pencarian Anda</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <BumdesDetailModal
        bumdes={selectedBumdes}
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {/* Edit Modal */}
      {showEditModal && editingBumdes && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="h-full overflow-y-auto">
            <BumdesEditDashboard 
              initialData={editingBumdes} 
              onLogout={handleCloseEditModal}
              onClose={handleCloseEditModal}
              onDelete={(deletedId) => {
                // Remove dari data lokal
                refreshData();
                handleCloseEditModal();
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingBumdes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <FiTrash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Konfirmasi Hapus Data
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Apakah Anda yakin ingin menghapus data BUMDes <span className="font-medium text-gray-900">"{deletingBumdes.namabumdesa}"</span>? 
                  Tindakan ini tidak dapat dibatalkan.
                </p>
                
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleCancelDelete}
                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-300"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors duration-300"
                  >
                    Hapus Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Notification Popup */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`relative overflow-hidden rounded-2xl shadow-2xl max-w-sm ${
            notification.type === 'success' 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : 'bg-gradient-to-r from-red-500 to-rose-600'
          }`}>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                <defs>
                  <pattern id="notification-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#notification-grid)" />
              </svg>
            </div>
            
            <div className="relative p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  {notification.type === 'success' ? (
                    <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                      <FiCheck className="text-white text-lg" />
                    </div>
                  ) : (
                    <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                      <FiAlertCircle className="text-white text-lg" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold text-sm mb-1">
                    {notification.type === 'success' ? 'Berhasil!' : 'Error!'}
                  </h4>
                  <p className="text-white/90 text-sm leading-relaxed">
                    {notification.message}
                  </p>
                </div>
                
                <button
                  onClick={() => setNotification({ show: false, type: '', message: '' })}
                  className="flex-shrink-0 p-1 text-white/70 hover:text-white transition-colors duration-200"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
              
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div 
                  className="h-full bg-white/50 animate-progress-bar"
                  style={{ 
                    animation: 'progress-bar 4s linear forwards',
                    transformOrigin: 'left'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BumdesDashboardModern;