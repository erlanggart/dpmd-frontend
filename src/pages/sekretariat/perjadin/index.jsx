import React, { useState, Suspense, lazy } from 'react';
import './kegiatan.css';

// Lazy load komponen untuk performa yang lebih baik
const Dashboard = lazy(() => import('./Dashboard'));
const KegiatanList = lazy(() => import('./KegiatanList'));
const Statistik = lazy(() => import('./Statistik'));

// Loading Fallback untuk tab perjadin
const PerjadinLoadingFallback = () => (
  <div className="perjadin-tab-loading">
    <div className="perjadin-tab-loading-content">
      <div className="perjadin-tab-spinner">
        <svg viewBox="0 0 24 24" className="perjadin-tab-spinner-svg">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="15.708" strokeDashoffset="15.708">
            <animate attributeName="stroke-dasharray" dur="1.5s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
            <animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
          </circle>
        </svg>
      </div>
      <p>Memuat komponen...</p>
    </div>
  </div>
);

const PerjalananDinas = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateFilter, setDateFilter] = useState('');
  const [bidangFilter, setBidangFilter] = useState('');

  const handleFilterClick = (date, bidang) => {
    setDateFilter(date);
    setBidangFilter(bidang);
    setActiveTab('kegiatan');
  };

  return (
    <div className="custom-container fade-in">
      {/* Navigation Tabs */}
      <div className="nav-buttons-container">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <i className="fas fa-chart-pie nav-icon"></i>
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('statistik')}
          className={`nav-button ${activeTab === 'statistik' ? 'active' : ''}`}
        >
          <i className="fas fa-chart-bar nav-icon"></i>
          Statistik
        </button>
        <button
          onClick={() => setActiveTab('kegiatan')}
          className={`nav-button ${activeTab === 'kegiatan' ? 'active' : ''}`}
        >
          <i className="fas fa-list nav-icon"></i>
          Daftar Kegiatan
        </button>
      </div>

      {/* Content */}
      <div className="base-card">
        <Suspense fallback={<PerjadinLoadingFallback />}>
          {activeTab === 'dashboard' && (
            <div className="fade-in-up">
              <Dashboard onFilterClick={handleFilterClick} />
            </div>
          )}
          {activeTab === 'statistik' && (
            <div className="fade-in-up">
              <Statistik />
            </div>
          )}
          {activeTab === 'kegiatan' && (
            <div className="fade-in-up">
              <KegiatanList 
                initialDateFilter={dateFilter}
                initialBidangFilter={bidangFilter}
              />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default PerjalananDinas;
