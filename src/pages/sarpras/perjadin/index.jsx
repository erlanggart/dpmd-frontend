import React, { useState } from 'react';
import Dashboard from './Dashboard';
import KegiatanList from './KegiatanList';
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Perjalanan Dinas</h1>
        <p className="mt-2 text-sm text-gray-600">
          Kelola dan pantau kegiatan perjalanan dinas
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('kegiatan')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
              activeTab === 'kegiatan'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Daftar Kegiatan
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-lg">
        {activeTab === 'dashboard' && (
          <div className="fade-in-up">
            <Dashboard onFilterClick={handleFilterClick} />
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
