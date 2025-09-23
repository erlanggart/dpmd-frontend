import React, { useState } from 'react';
import Dashboard from './Dashboard';
import KegiatanList from './KegiatanList';
import Statistik from './Statistik';
import './kegiatan.css';

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
      </div>
    </div>
  );
};

export default PerjalananDinas;
