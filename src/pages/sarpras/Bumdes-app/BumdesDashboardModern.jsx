import React, { useState, useEffect, useRef } from 'react';
import { useBumdesData, useBumdesFilter } from '../../../hooks/useBumdesData';
import { useBumdesStatistics } from '../../../hooks/useBumdesStatistics';
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
  FiTarget,
  FiFolder,
  FiFile,
  FiLink,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import BumdesEditDashboard from './BumdesEditDashboard';
import jsPDF from 'jspdf';
import API_CONFIG from '../../../config/api';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Simplified CSS for better performance
const notificationStyles = `
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes simple-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
  
  .animate-simple-spin {
    animation: simple-spin 1s linear infinite;
  }
  
  .simple-shadow {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  .simple-hover {
    transition: all 0.2s ease;
  }
  
  .simple-hover:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 12px -1px rgba(0, 0, 0, 0.15);
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

// Simplified Statistics Card - elegant and lightweight
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
    <div className="cursor-pointer group" onClick={onClick}>
      <div className={`${color} rounded-2xl ${cardSizes[size]} simple-shadow simple-hover border border-white/10`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`${accentColor} p-3 rounded-xl`}>
            <Icon className={`${size === 'large' ? 'text-3xl' : size === 'compact' ? 'text-xl' : 'text-2xl'} text-white`} />
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-white/90 text-sm font-medium bg-white/10 px-2 py-1 rounded-lg">
              <FiTrendingUp className="text-xs" />
              <span>{trend}</span>
            </div>
          )}
        </div>
        
        <div className={textColor}>
          <div className={`${valueSizes[size]} font-bold mb-2 text-white`}>
            {value?.toLocaleString?.() || value}
          </div>
          <div className="text-white/90 text-sm font-semibold mb-1">
            {title}
          </div>
          {subtitle && (
            <div className="text-white/70 text-xs">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simplified BumdesCard - clean and elegant
const BumdesCard = ({ bumdes, onClick }) => {
  const isNotUploaded = bumdes.upload_status === 'not_uploaded';
  
  return (
    <div 
      className={`rounded-2xl p-6 simple-shadow simple-hover cursor-pointer border ${
        isNotUploaded 
          ? 'bg-orange-50 border-orange-200' 
          : 'bg-white border-gray-200'
      }`}
      onClick={() => onClick(bumdes)}
    >
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            {/* BUMDes Name with enhanced typography */}
            <h3 className={`text-xl font-black mb-3 group-hover:text-slate-900 transition-all duration-300 ${
              isNotUploaded ? 'text-slate-700' : 'text-slate-800'
            } drop-shadow-sm`}>
              {bumdes.namabumdesa}
            </h3>
            
            {/* Location with icon */}
            <div className="flex items-center gap-3 text-slate-600 text-sm mb-3 font-medium">
              <div className={`p-2 rounded-xl ${
                isNotUploaded ? 'bg-orange-200' : 'bg-blue-200'
              }`}>
                <FiMapPin className="text-sm" />
              </div>
              <span>{bumdes.desa}, {bumdes.kecamatan}</span>
            </div>
            
            {/* Kode Desa */}
            {bumdes.kode_desa && (
              <div className="text-xs text-slate-500 mb-3 font-mono bg-slate-100 px-2 py-1 rounded-lg inline-block">
                Kode: {bumdes.kode_desa}
              </div>
            )}
            
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
              isNotUploaded 
                ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white' 
                : bumdes.status === 'aktif' 
                  ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white' 
                  : 'bg-gradient-to-r from-red-400 to-pink-500 text-white'
            }`}>
              <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse"></div>
              {isNotUploaded ? 'Belum Upload' : bumdes.status?.toUpperCase()}
            </div>
          </div>
          
          {/* Right side info */}
          <div className="text-right">
            <div className="text-sm text-slate-500 mb-2 font-medium">
              {isNotUploaded ? 'Status' : 'Tahun Pendirian'}
            </div>
            <div className={`text-2xl font-black ${
              isNotUploaded ? 'text-orange-600' : 'text-slate-800'
            } drop-shadow-sm`}>
              {isNotUploaded ? '📋' : (bumdes.TahunPendirian || '❓')}
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Info Grid */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className={`p-4 rounded-2xl ${
          isNotUploaded ? 'bg-orange-100' : 'bg-blue-100'
        } group-hover:shadow-lg transition-all duration-300`}>
          <div className="flex items-center gap-2 mb-2">
            <FiDollarSign className={`text-lg ${
              isNotUploaded ? 'text-orange-600' : 'text-blue-600'
            }`} />
            <div className="text-xs text-slate-600 font-bold uppercase tracking-wide">Jenis Usaha</div>
          </div>
          <div className={`font-bold text-sm ${
            isNotUploaded ? 'text-orange-700' : 'text-slate-800'
          } line-clamp-2`}>
            {isNotUploaded ? 'Belum diisi' : (bumdes.JenisUsaha || 'Belum diisi')}
          </div>
        </div>
        
        <div className={`p-4 rounded-2xl ${
          isNotUploaded ? 'bg-orange-100' : 'bg-emerald-100'
        } group-hover:shadow-lg transition-all duration-300`}>
          <div className="flex items-center gap-2 mb-2">
            <FiUsers className={`text-lg ${
              isNotUploaded ? 'text-orange-600' : 'text-emerald-600'
            }`} />
            <div className="text-xs text-slate-600 font-bold uppercase tracking-wide">Tenaga Kerja</div>
          </div>
          <div className={`font-bold text-sm ${
            isNotUploaded ? 'text-orange-700' : 'text-slate-800'
          }`}>
            {isNotUploaded ? 'Belum diisi' : `${bumdes.TotalTenagaKerja || 0} orang`}
          </div>
        </div>
      </div>
      
      {/* Enhanced Footer */}
      <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            isNotUploaded ? 'bg-orange-400' : 'bg-green-400'
          }`}></div>
          <div className="text-sm text-slate-600 font-medium">
            {isNotUploaded ? 'Data belum tersedia' : 'Klik untuk detail lengkap'}
          </div>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
          isNotUploaded 
            ? 'bg-orange-200 group-hover:bg-orange-300' 
            : 'bg-indigo-200 group-hover:bg-indigo-300'
        } shadow-sm`}>
          <FiBarChart2 className={`text-lg ${
            isNotUploaded ? 'text-orange-700' : 'text-indigo-700'
          }`} />
          <span className={`text-sm font-bold ${
            isNotUploaded ? 'text-orange-700' : 'text-indigo-700'
          }`}>
            Detail
          </span>
        </div>
      </div>
    </div>
  );
};

// Enhanced Detail Modal Component with Complete Data
const BumdesDetailModal = ({ bumdes, isOpen, onClose, onEdit, onDelete, onOpenDocuments }) => {
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
                    ? 'bg-white text-slate-800' 
                    : bumdes.status === 'aktif' 
                      ? 'bg-slate-800 text-white' 
                      : 'bg-white text-slate-800'
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
                onClick={() => onOpenDocuments(bumdes.id, bumdes.namabumdesa)}
                className="bg-blue-500/80 hover:bg-blue-600/90 p-3 rounded-xl transition-colors duration-300 backdrop-blur-sm"
                title="Kelola Dokumen"
              >
                <FiFolder className="text-xl" />
              </button>

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
          <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiActivity className="text-blue-600" />
              2. Status BUMDes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Status Operasional</div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  bumdes.status === 'aktif' 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-white text-slate-800'
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
          <div className="bg-white rounded-2xl p-6 border border-white">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiFileText className="text-slate-800" />
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
          <div className="bg-white rounded-2xl p-6 border border-white">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiUsers className="text-slate-800" />
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
          <div className="bg-white rounded-2xl p-6 border border-white">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiUsers className="text-slate-800" />
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
          <div className="bg-white rounded-2xl p-6 border border-white">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiActivity className="text-slate-800" />
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
          <div className="bg-white rounded-2xl p-6 border border-white">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiDollarSign className="text-slate-800" />
              7. Permodalan dan Aset
            </h3>
            <div className="space-y-6">
              {/* Penyertaan Modal */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Penyertaan Modal</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2019</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.PenyertaanModal2019)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2020</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.PenyertaanModal2020)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2021</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.PenyertaanModal2021)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2022</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.PenyertaanModal2022)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2023</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.PenyertaanModal2023)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">2024</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.PenyertaanModal2024)}</div>
                  </div>
                </div>
              </div>

              {/* Aset */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Aset dan Sumber Modal Lain</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Sumber Lain</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.SumberLain)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Nilai Aset</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.NilaiAset)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 8. Kemitraan */}
          <div className="bg-white rounded-2xl p-6 border border-white">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiUsers className="text-slate-800" />
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
          <div className="bg-white rounded-2xl p-6 border border-white">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-slate-800" />
              9. Kontribusi PADes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Kontribusi 2021</div>
                <div className="font-medium text-slate-800">{formatCurrency(bumdes.KontribusiTerhadapPADes2021)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Kontribusi 2022</div>
                <div className="font-medium text-slate-800">{formatCurrency(bumdes.KontribusiTerhadapPADes2022)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Kontribusi 2023</div>
                <div className="font-medium text-slate-800">{formatCurrency(bumdes.KontribusiTerhadapPADes2023)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Kontribusi 2024</div>
                <div className="font-medium text-slate-800">{formatCurrency(bumdes.KontribusiTerhadapPADes2024)}</div>
              </div>
            </div>
          </div>

          {/* 10. Peran BUMDes */}
          <div className="bg-white rounded-2xl p-6 border border-white">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiHome className="text-slate-800" />
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
          <div className="bg-white rounded-2xl p-6 border border-white">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiDollarSign className="text-slate-800" />
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
          <div className="bg-white rounded-2xl p-6 border border-white">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FiBarChart2 className="text-slate-800" />
              12. Laporan Keuangan
            </h3>
            <div className="space-y-6">
              {/* Omset */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Omset</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Omset 2021</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.Omset2021)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Omset 2022</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.Omset2022)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Omset 2023</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.Omset2023)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Omset 2024</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.Omset2024)}</div>
                  </div>
                </div>
              </div>

              {/* Laba */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Laba</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Laba 2021</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.Laba2021)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Laba 2022</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.Laba2022)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Laba 2023</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.Laba2023)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Laba 2024</div>
                    <div className="font-medium text-slate-800">{formatCurrency(bumdes.Laba2024)}</div>
                  </div>
                </div>
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
    refreshData,
    deleteBumdesData 
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
  const [itemsPerPage, setItemsPerPage] = useState(4); // Changed to 4 cards per page
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
  
  // Document management states
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [selectedBumdesForDocs, setSelectedBumdesForDocs] = useState(null);
  const [documentFilters, setDocumentFilters] = useState({
    search: ''
  });
  const [availableKecamatan, setAvailableKecamatan] = useState([]);
  const [availableDesa, setAvailableDesa] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  
  // Document management functions
  const fetchAllDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const [dokumenResponse, laporanResponse] = await Promise.all([
        fetch(`${API_CONFIG.BASE_URL}/bumdes/dokumen-badan-hukum`),
        fetch(`${API_CONFIG.BASE_URL}/bumdes/laporan-keuangan`)
      ]);

      const dokumenResult = await dokumenResponse.json();
      const laporanResult = await laporanResponse.json();

      if (dokumenResult.status === 'success' && laporanResult.status === 'success') {
        const allDocs = [
          ...dokumenResult.data.map(doc => ({ ...doc, type: 'dokumen_badan_hukum' })),
          ...laporanResult.data.map(doc => ({ ...doc, type: 'laporan_keuangan' }))
        ];
        console.log('📄 Documents loaded:', allDocs.length);
        setDocuments(allDocs);
        
        // Extract unique kecamatan and desa for filters
        const kecamatanSet = new Set();
        const desaSet = new Set();
        
        bumdesData.forEach(bumdes => {
          if (bumdes.kecamatan) kecamatanSet.add(bumdes.kecamatan);
          if (bumdes.desa) {
            const desaInfo = parseDesaInfo(bumdes.desa);
            desaSet.add(desaInfo.namaDesa);
          }
        });
        
        setAvailableKecamatan([...kecamatanSet].sort());
        setAvailableDesa([...desaSet].sort());
      } else {
        showNotification('error', 'Gagal mengambil data dokumen');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      showNotification('error', 'Terjadi kesalahan saat mengambil data dokumen');
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Fetch documents when BUMDes data is loaded
  useEffect(() => {
    if (bumdesData.length > 0) {
      console.log('🔄 Fetching documents because BUMDes data is loaded:', bumdesData.length, 'records');
      fetchAllDocuments();
    }
  }, [bumdesData.length]);
  


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
      const result = await deleteBumdesData(deletingBumdes.id);
      
      if (result.success) {
        setShowDeleteConfirm(false);
        setDeletingBumdes(null);
        alert('Data BUMDes berhasil dihapus!');
        // Refresh statistics after successful delete
        refreshStatistics();
      } else {
        alert('Gagal menghapus data: ' + (result.message || 'Unknown error'));
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
    filteredData
  } = useBumdesFilter(bumdesData);

  // Get statistics from API with caching info
  const { 
    compatibleStatistics, 
    loading: statsLoading, 
    error: statsError,
    refreshStatistics,
    lastFetch: statsLastFetch,
    isStale: isStatsStale
  } = useBumdesStatistics();

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

  const handleOpenDocuments = (bumdesId, bumdesName) => {
    // Find the selected BUMDes data to get its location info
    const selectedBumdes = bumdesData.find(b => b.id === bumdesId);
    
    setSelectedBumdesForDocs({ 
      id: bumdesId, 
      name: bumdesName,
      bumdesData: selectedBumdes // Store the BUMDes data for filtering
    });
    setShowDocumentModal(true);
    
    // Reset search filter when opening modal
    setDocumentFilters({ 
      search: '' 
    });
    
    if (documents.length === 0) {
      fetchAllDocuments();
    }
  };

  const linkDocumentToBumdes = async (filename, bumdesId, documentType) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/bumdes/link-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          bumdes_id: bumdesId,
          document_type: documentType
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification('success', result.message);
        // Refresh documents to update matched data
        fetchAllDocuments();
      } else {
        showNotification('error', result.message || 'Gagal mengaitkan dokumen');
      }
    } catch (error) {
      console.error('Error linking document:', error);
      showNotification('error', 'Terjadi kesalahan saat mengaitkan dokumen');
    }
  };

  // Delete file function for dashboard
  const deleteDocumentFile = async (filename, documentType, bumdesId = null) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus file "${filename}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/bumdes/delete-file`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          folder: documentType,
          bumdes_id: bumdesId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification('success', result.message);
        // Refresh documents and BUMDes data
        fetchAllDocuments();
        if (selectedBumdesForDocs?.id) {
          // Refresh the specific BUMDes data if viewing from detail modal
          refreshData();
        }
      } else {
        showNotification('error', result.message || 'Gagal menghapus file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      showNotification('error', 'Terjadi kesalahan saat menghapus file');
    }
  };

  // Filter documents based on EXACT BUMDes ID only
  useEffect(() => {
    let filtered = documents;

    console.log('Filtering documents - total documents:', documents.length);
    
    // Show ONLY documents that belong to the selected BUMDes
    if (selectedBumdesForDocs && selectedBumdesForDocs.bumdesData) {
      const selectedBumdes = selectedBumdesForDocs.bumdesData;
      
      console.log('Selected BUMDes ID:', selectedBumdes.id);
      console.log('Selected BUMDes Name:', selectedBumdes.namabumdesa);
      
      filtered = documents.filter(doc => {
        // STRICT: Only show documents that EXACTLY belong to this BUMDes
        
        // Method 1: Document has bumdes_info with exact BUMDes ID match
        if (doc.bumdes_info && doc.bumdes_info.id === selectedBumdes.id) {
          console.log('✓ Exact BUMDes ID match:', doc.filename, '| BUMDes:', doc.bumdes_info.namabumdesa);
          return true;
        }
        
        // Method 2: Check matched_bumdes array for exact BUMDes ID match
        if (doc.matched_bumdes && Array.isArray(doc.matched_bumdes)) {
          const hasExactMatch = doc.matched_bumdes.some(match => match.id === selectedBumdes.id);
          if (hasExactMatch) {
            console.log('✓ Exact BUMDes ID match via matched_bumdes:', doc.filename);
            return true;
          }
        }
        
        // DO NOT show unlinked files - only show documents that belong to this BUMDes
        console.log('✗ Document does not belong to selected BUMDes:', doc.filename);
        return false;
      });
      
      console.log('Filtered documents for BUMDes ID', selectedBumdes.id, ':', filtered.length);
    } else {
      console.log('No BUMDes selected, showing no documents');
      filtered = []; // Show no documents if no BUMDes is selected
    }

    // Filter by search term (keeping search functionality)
    if (documentFilters.search) {
      const searchLower = documentFilters.search.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.filename.toLowerCase().includes(searchLower) ||
        doc.type.toLowerCase().includes(searchLower)
      );
      console.log('Filtered documents after search:', filtered.length);
    }

    console.log('Final filtered documents:', filtered.length);
    setFilteredDocuments(filtered);
  }, [documents, documentFilters.search, selectedBumdesForDocs, bumdesData]);

  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!initialData && bumdesData.length === 0) {
      refreshData();
    }
  }, [initialData, bumdesData.length, refreshData]);

  // Only show loading if we have no data at all
  if (loading && bumdesData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-12 border border-white/30">
            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center">
                <FiRefreshCw className="w-8 h-8 text-white animate-spin" />
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-slate-600/20 to-slate-800/20 rounded-full blur-xl animate-pulse"></div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Memuat Dashboard</h3>
            <p className="text-slate-600">Mengambil data BUMDes...</p>
          </div>
        </div>
      </div>
    );
  }

  // Only show full error screen if we have no data at all
  if (error && bumdesData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-12 border border-white/30">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
              <FiAlertCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {error || "Gagal memuat data dashboard. Silakan coba lagi."}
            </p>
            <button 
              onClick={refreshData}
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl"
            >
              <FiRefreshCw className="text-sm" />
              <span>Coba Lagi</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statistics = compatibleStatistics;

  // Show loading state if statistics are still loading
  if (statsLoading) {
    return (
      <div className="min-h-screen bg-white -m-2 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-12 h-12 border-3 border-slate-200 rounded-full mx-auto"></div>
            <div className="w-12 h-12 border-3 border-slate-800 border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="text-slate-600 font-medium">Memuat statistik...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error loading statistics
  if (statsError) {
    return (
      <div className="min-h-screen bg-white -m-2 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiAlertCircle className="text-red-500 text-2xl" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Error Memuat Statistik</h2>
          <p className="text-slate-600 text-sm mb-6">{statsError}</p>
          <button
            onClick={refreshStatistics}
            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200 flex items-center gap-2 mx-auto"
          >
            <FiRefreshCw className="text-sm" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 -m-2">
      {/* Simplified Header */}
      <div className="bg-slate-800 text-white">
        <div className="text-center py-12 px-4 lg:px-6">
          {/* Simple Logo */}
          <div className="inline-block mb-6">
            <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center simple-shadow">
              <FiHome className="text-white text-2xl" />
            </div>
          </div>
          
          {/* Simple Typography */}
          <div className="mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
              Dashboard BUMDes
            </h1>
            <p className="text-lg text-slate-300 mb-4">
              Sistem Monitoring BUMDes Kabupaten Bogor
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <div className={`w-2 h-2 rounded-full ${
                statsLoading ? 'bg-yellow-400' : 'bg-green-400'
              }`}></div>
              <span className="text-sm">
                {statsLoading ? 'Loading...' : 'Data Ready'}
              </span>
              {statsLastFetch && (
                <>
                  <span className="mx-2">•</span>
                  <span className="text-xs">
                    Updated: {new Date(statsLastFetch).toLocaleTimeString()}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Simple Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold simple-hover"
            >
              <FiDownload className="text-lg" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold simple-hover"
            >
              <FiDownload className="text-lg" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
        

      </div>

      <div className="px-4 lg:px-6 space-y-10 -mt-6 relative">
        {/* Simple Summary Banner */}
        <div className="bg-white rounded-2xl simple-shadow border border-gray-200">
          <div className="p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left flex-1">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                  <div className="p-2 bg-slate-800 rounded-lg">
                    <FiActivity className="text-white text-xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Dashboard Status
                  </h2>
                </div>
                <p className="text-slate-600 mb-3">
                  Monitoring data BUMDes untuk {statistics.totalDesaBogor} desa di Kabupaten Bogor
                </p>
                <div className="flex items-center justify-center lg:justify-start gap-2 text-slate-500">
                  <div className={`w-2 h-2 rounded-full ${
                    statsLoading ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm">
                    {statsLoading ? 'Loading...' : 'Data Ready'}
                  </span>
                  {statsLastFetch && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-xs">
                        Updated: {new Date(statsLastFetch).toLocaleTimeString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Simple Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-fit">
                <div className="bg-slate-800 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <FiTarget className="text-lg" />
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">Live</span>
                  </div>
                  <div className="text-2xl font-bold">{statistics.persentaseUpload}%</div>
                  <div className="text-sm text-slate-300">Coverage</div>
                </div>
                
                <div className="bg-emerald-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <FiUpload className="text-lg" />
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">Active</span>
                  </div>
                  <div className="text-2xl font-bold">{statistics.totalBumdesUploaded}</div>
                  <div className="text-sm text-emerald-200">Uploaded</div>
                </div>
                
                <div className="bg-indigo-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <FiMapPin className="text-lg" />
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">Total</span>
                  </div>
                  <div className="text-2xl font-bold">{statistics.totalKecamatan}</div>
                  <div className="text-sm text-indigo-200">Kecamatan</div>
                </div>
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
              color="bg-gradient-to-br from-slate-800 to-slate-900"
              textColor="text-white"
              accentColor="bg-blue-400/30"
              size="large"
            />
            
            <StatCard
              title="Data Belum Upload"
              value={statistics.totalBumdesBelumUpload}
              subtitle={`${statistics.persentaseBelumUpload}% desa belum mengupload data BUMDes`}
              icon={FiAlertCircle}
              trend={`${statistics.persentaseBelumUpload}%`}
              color="bg-gradient-to-br from-slate-800 to-slate-900"
              textColor="text-white"
              accentColor="bg-slate-400/30"
              size="large"
            />
          </div>

          {/* Status Badan Hukum Statistics */}
          <div className="bg-white rounded-2xl simple-shadow border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-slate-800 rounded-xl">
                <FiFileText className="text-white text-lg" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Status Badan Hukum BUMDes</h3>
                <p className="text-slate-600">Target: 100% Terbit Sertifikat ({statistics.percentageSertifikat}% tercapai)</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-800 mb-1">{statistics.terbitSertifikat}</div>
                <div className="text-sm text-green-600 font-medium">Terbit Sertifikat</div>
                <div className="text-xs text-green-500 mt-1">{statistics.percentageSertifikat}% dari target</div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-blue-800 mb-1">{statistics.namaTermerifikasi}</div>
                <div className="text-sm text-blue-600 font-medium">Nama Terverifikasi</div>
                <div className="text-xs text-blue-500 mt-1">Tahap verifikasi</div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-yellow-800 mb-1">{statistics.perbaikanDokumen}</div>
                <div className="text-sm text-yellow-600 font-medium">Perbaikan Dokumen</div>
                <div className="text-xs text-yellow-500 mt-1">Perlu perbaikan</div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-800 mb-1">{statistics.belumProses}</div>
                <div className="text-sm text-red-600 font-medium">Belum Proses</div>
                <div className="text-xs text-red-500 mt-1">Belum mulai</div>
              </div>
            </div>
            
            {/* Enhanced Progress Bar for Badan Hukum */}
            <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                    <FiCheck className="text-white text-lg" />
                  </div>
                  <span className="text-lg font-bold text-slate-800">Progress Sertifikat Badan Hukum</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-green-600">{statistics.percentageSertifikat}%</div>
                  <div className="text-xs text-slate-500">dari target 100%</div>
                </div>
              </div>
              
              {/* Multi-layer animated progress bar */}
              <div className="relative">
                <div className="w-full bg-slate-200 rounded-full h-6 overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                  <div 
                    className="relative h-6 bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 rounded-full transition-all duration-2000 ease-out shadow-lg"
                    style={{ width: `${Math.min(100, statistics.percentageSertifikat)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      {statistics.percentageSertifikat > 10 && (
                        <div className="text-white text-xs font-bold drop-shadow-lg">
                          {statistics.percentageSertifikat}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Progress markers */}
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Statistics - Normal Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-1">
            <StatCard
              title="BUMDes Aktif"
              value={filteredAndSearchedData.filter(b => b.status === 'aktif').length}
              subtitle="Sedang beroperasi"
              icon={FiActivity}
              color="bg-gradient-to-br from-slate-800 to-slate-900"
              textColor="text-white"
              accentColor="bg-blue-400/30"
            />
            
            <StatCard
              title="BUMDes Tidak Aktif"
              value={filteredAndSearchedData.filter(b => b.status === 'tidak aktif').length}
              subtitle="Tidak beroperasi"
              icon={FiPause}
              color="bg-gradient-to-br from-slate-800 to-slate-900"
              textColor="text-white"
              accentColor="bg-slate-400/30"
            />
            
            <StatCard
              title="Total Kecamatan"
              value={statistics.totalKecamatan}
              subtitle="Wilayah terwakili"
              icon={FiMapPin}
              color="bg-gradient-to-br from-slate-800 to-slate-900"
              textColor="text-white"
              accentColor="bg-slate-400/30"
            />

            

            <StatCard
              title="Tingkat Partisipasi"
              value={`${statistics.persentaseUpload}%`}
              subtitle="Desa berpartisipasi"
              icon={FiTrendingUp}
              trend={statistics.persentaseUpload > 50 ? 'Baik' : 'Perlu Ditingkatkan'}
              color="bg-gradient-to-br from-slate-800 to-slate-900"
              textColor="text-white"
              accentColor="bg-slate-400/30"
            />

            <StatCard
              title="Target Pencapaian"
              value={`${Math.min(100, Math.round((statistics.totalBumdesUploaded / statistics.totalDesaBogor) * 100))}%`}
              subtitle="Menuju 100% upload"
              icon={FiTarget}
              color="bg-gradient-to-br from-slate-800 to-slate-900"
              textColor="text-white"
              accentColor="bg-blue-400/30"
            />
          </div>

          {/* Progress Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Progress */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl">
                  <FiUpload className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Progress Upload Data</h3>
                  <p className="text-sm text-slate-600">Status pengumpulan data BUMDes</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-800 mb-1">
                    <span>Data Sudah Upload</span>
                    <span>{statistics.persentaseUpload}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-slate-800 to-slate-900 h-3 rounded-full transition-all duration-1000 ease-out"
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
                      className="bg-gradient-to-r from-slate-500 to-slate-600 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${statistics.persentaseBelumUpload}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Operational */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-slate-800 to-slate-900 to-indigo-600 rounded-xl">
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
                      className="bg-gradient-to-r from-slate-800 to-slate-900 h-3 rounded-full transition-all duration-1000 ease-out"
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
                      className="bg-gradient-to-r from-slate-500 to-gray-600 h-3 rounded-full transition-all duration-1000 ease-out"
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

      

        

   

       

        {/* Premium BUMDes List */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-blue-50 rounded-3xl shadow-2xl border border-white/50 backdrop-blur-xl">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full transform translate-x-32 -translate-y-32"></div>
          </div>
          
          <div className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl border border-white/20">
                  <FiBarChart2 className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-2xl lg:text-3xl font-black mb-1">Data BUMDes</h3>
                  <div className="flex items-center gap-4 text-blue-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">{filteredBumdesData.length} ditampilkan</span>
                    </div>
                    <div className="text-blue-300">•</div>
                    <div className="flex items-center gap-2">
                      <FiUsers className="text-sm" />
                      <span className="text-sm font-medium">{bumdesData.length} total data</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={showAllData ? handleShowPaginated : handleShowAll}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold simple-shadow text-white transition-colors duration-200"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  <div className="relative flex items-center gap-2">
                    <FiRefreshCw className="text-sm" />
                    <span>{showAllData ? 'Pagination Mode' : 'Show All Data'}</span>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Enhanced Search and Filter */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="relative md:col-span-2 lg:col-span-2 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiBarChart2 className="h-5 w-5 text-white/60 group-focus-within:text-white transition-colors duration-200" />
                </div>
                <input
                  type="text"
                  placeholder="Cari nama BUMDes, desa, atau kecamatan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/15 border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 hover:bg-white/20"
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
                
                {/* Enhanced Modern Pagination */}
                {!showAllData && totalPages > 1 && (
                  <div className="mt-8 space-y-4">
                    {/* Pagination Info */}
                    <div className="text-center text-sm text-slate-600">
                      Menampilkan <span className="font-semibold">{startIndex + 1}</span> - <span className="font-semibold">{Math.min(endIndex, filteredBumdesData.length)}</span> dari <span className="font-semibold">{filteredBumdesData.length}</span> BUMDes
                    </div>
                    
                    {/* Desktop Pagination */}
                    <div className="hidden md:flex justify-center">
                      <div className="flex items-center gap-2 bg-white rounded-2xl shadow-lg border border-slate-200 p-2">
                        {/* First Page */}
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          className="p-3 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Halaman Pertama"
                        >
                          <FiChevronsLeft className="w-4 h-4" />
                        </button>
                        
                        {/* Previous Page */}
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-3 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Halaman Sebelumnya"
                        >
                          <FiChevronLeft className="w-4 h-4" />
                        </button>
                        
                        {/* Page Numbers */}
                        <div className="flex items-center gap-1 mx-2">
                          {totalPages <= 7 ? (
                            // Show all pages if 7 or fewer
                            Array.from({ length: totalPages }, (_, i) => (
                              <button
                                key={i + 1}
                                onClick={() => handlePageChange(i + 1)}
                                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                                  currentPage === i + 1
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))
                          ) : (
                            // Show ellipsis logic for many pages
                            <>
                              {currentPage > 3 && (
                                <>
                                  <button
                                    onClick={() => handlePageChange(1)}
                                    className="px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                                  >
                                    1
                                  </button>
                                  {currentPage > 4 && (
                                    <span className="px-2 text-slate-400">...</span>
                                  )}
                                </>
                              )}
                              
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNumber;
                                if (currentPage <= 3) {
                                  pageNumber = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNumber = totalPages - 4 + i;
                                } else {
                                  pageNumber = currentPage - 2 + i;
                                }
                                
                                if (pageNumber < 1 || pageNumber > totalPages) return null;
                                
                                return (
                                  <button
                                    key={pageNumber}
                                    onClick={() => handlePageChange(pageNumber)}
                                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                                      currentPage === pageNumber
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                                        : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {pageNumber}
                                  </button>
                                );
                              })}
                              
                              {currentPage < totalPages - 2 && (
                                <>
                                  {currentPage < totalPages - 3 && (
                                    <span className="px-2 text-slate-400">...</span>
                                  )}
                                  <button
                                    onClick={() => handlePageChange(totalPages)}
                                    className="px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                                  >
                                    {totalPages}
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                        
                        {/* Next Page */}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="p-3 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Halaman Selanjutnya"
                        >
                          <FiChevronRight className="w-4 h-4" />
                        </button>
                        
                        {/* Last Page */}
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          disabled={currentPage === totalPages}
                          className="p-3 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Halaman Terakhir"
                        >
                          <FiChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Pagination */}
                    <div className="md:hidden flex justify-center">
                      <div className="flex items-center gap-3 bg-white rounded-2xl shadow-lg border border-slate-200 p-3">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <FiChevronLeft className="w-4 h-4" />
                          <span className="text-sm font-medium">Sebelumnya</span>
                        </button>
                        
                        <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg">
                          {currentPage} / {totalPages}
                        </div>
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <span className="text-sm font-medium">Selanjutnya</span>
                          <FiChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Items per page selector */}
                {!showAllData && (
                  <div className="flex justify-center items-center gap-3 mt-6">
                    <div className="flex items-center gap-3 bg-white rounded-2xl shadow-lg border border-slate-200 px-6 py-3">
                      <span className="text-sm font-medium text-slate-700">Tampilkan per halaman:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all"
                      >
                        <option value={4}>4 Cards</option>
                        <option value={8}>8 Cards</option>
                        <option value={12}>12 Cards</option>
                        <option value={16}>16 Cards</option>
                        <option value={24}>24 Cards</option>
                      </select>
                    </div>
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
        onOpenDocuments={handleOpenDocuments}
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

      {/* Document Management Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="h-full overflow-y-auto p-4">
            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl my-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Kelola Dokumen - {selectedBumdesForDocs?.name}
                    </h2>
                    <p className="text-blue-100 mt-1">
                      Kaitkan dokumen dengan BUMDes yang sesuai
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDocumentModal(false)}
                    className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <FiX className="text-2xl" />
                  </button>
                </div>
              </div>

              {/* Info dan Search */}
              <div className="p-6 border-b border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Location Info */}
                  <div className="md:col-span-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FiMapPin className="text-blue-600" />
                        <h4 className="text-sm font-medium text-blue-800">Menampilkan dokumen untuk:</h4>
                      </div>
                      {selectedBumdesForDocs?.bumdesData && (
                        <div className="text-sm text-blue-700">
                          <span className="font-medium">BUMDes:</span> {selectedBumdesForDocs.bumdesData.namabumdesa}
                          <br />
                          <span className="font-medium">Lokasi:</span> {selectedBumdesForDocs.bumdesData.kecamatan} - {parseDesaInfo(selectedBumdesForDocs.bumdesData.desa).namaDesa}
                          <p className="text-xs text-blue-600 mt-1">
                            Hanya menampilkan dokumen yang milik BUMDes ini
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cari Dokumen
                    </label>
                    <input
                      type="text"
                      value={documentFilters.search}
                      onChange={(e) => setDocumentFilters(prev => ({
                        ...prev,
                        search: e.target.value
                      }))}
                      placeholder="Cari nama file..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Document List */}
              <div className="p-6">
                {documentsLoading ? (
                  <div className="text-center py-12">
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-white/30 inline-block">
                      <div className="relative">
                        <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl flex items-center justify-center">
                          <FiRefreshCw className="w-6 h-6 text-white animate-spin" />
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-r from-slate-600/20 to-slate-800/20 rounded-full blur-lg animate-pulse"></div>
                      </div>
                      <p className="text-slate-600 font-medium">Memuat dokumen...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Dokumen Tersedia ({filteredDocuments.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {filteredDocuments.map((doc, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <FiFile className="text-blue-500 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {doc.filename}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {doc.type === 'dokumen_badan_hukum' ? 'Dokumen Badan Hukum' : 'Laporan Keuangan'}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {doc.file_size_formatted}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => window.open(doc.download_url, '_blank')}
                              className="flex-1 px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                            >
                              <FiEye className="inline mr-1" />
                              Lihat
                            </button>
                            <button
                              onClick={() => linkDocumentToBumdes(doc.filename, selectedBumdesForDocs.id, doc.type)}
                              className="flex-1 px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                            >
                              <FiLink className="inline mr-1" />
                              Kaitkan
                            </button>
                            <button
                              onClick={() => deleteDocumentFile(doc.filename, doc.type, selectedBumdesForDocs.id)}
                              className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                              title="Hapus file"
                            >
                              <FiTrash2 className="inline" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredDocuments.length === 0 && !documentsLoading && (
                      <div className="text-center py-12">
                        <FiFile className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Tidak ada dokumen
                        </h3>
                        <p className="text-gray-500">
                          {documentFilters.kecamatan || documentFilters.desa || documentFilters.search
                            ? 'Tidak ada dokumen yang sesuai dengan filter'
                            : 'Belum ada dokumen yang tersedia'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
              
              {/* Simple progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div className="h-full bg-white/50 w-full"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BumdesDashboardModern;