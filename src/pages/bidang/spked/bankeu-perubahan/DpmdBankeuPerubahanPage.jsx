import React, { useState } from 'react';
import { ArrowLeft, ClipboardCheck, FileText, Settings } from 'lucide-react';
import DpmdBankeuPerubahanVerificationPage from './DpmdBankeuPerubahanVerificationPage';
import DpmdBankeuPerubahanLpjMonitoringPage from './DpmdBankeuPerubahanLpjMonitoringPage';
import DpmdBankeuPerubahanSettingsPage from './DpmdBankeuPerubahanSettingsPage';

const DpmdBankeuPerubahanPage = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [activeTab, setActiveTab] = useState('verifikasi');

  if (!selectedYear) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex h-20 w-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-orange-500/30">
              <span className="text-3xl">🪙</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-3">
              Verifikasi Final Bankeu Perubahan
            </h1>
            <p className="text-gray-600 text-lg">DPMD/SPKED - Pilih tahun anggaran</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={() => setSelectedYear(2026)}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-gray-200 hover:border-orange-400 p-8 transition-all duration-300 text-center overflow-hidden hover:-translate-y-2"
            >
              <div className="relative">
                <div className="h-16 w-16 mx-auto bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">📋</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">TA 2026</h3>
                <p className="text-sm text-gray-600">Proposal Perubahan TA 2026</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'verifikasi', label: 'Verifikasi Proposal', icon: ClipboardCheck },
    { id: 'lpj', label: 'Monitoring LPJ', icon: FileText },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="relative">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center gap-3 h-14 overflow-x-auto">
            <button
              onClick={() => setSelectedYear(null)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-orange-600 transition-colors text-sm font-medium flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>TA {selectedYear}</span>
            </button>
            <div className="h-6 w-px bg-gray-300 flex-shrink-0" />
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-orange-50 text-orange-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {activeTab === 'verifikasi' && <DpmdBankeuPerubahanVerificationPage tahun={selectedYear} />}
      {activeTab === 'lpj' && <DpmdBankeuPerubahanLpjMonitoringPage />}
      {activeTab === 'settings' && <DpmdBankeuPerubahanSettingsPage />}
    </div>
  );
};

export default DpmdBankeuPerubahanPage;
