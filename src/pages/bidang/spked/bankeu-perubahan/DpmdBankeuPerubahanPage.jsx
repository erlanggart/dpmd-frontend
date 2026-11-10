import React, { useState } from 'react';
import { ClipboardCheck, Settings } from 'lucide-react';
import DpmdBankeuPerubahanVerificationPage from './DpmdBankeuPerubahanVerificationPage';
import DpmdBankeuPerubahanSettingsPage from './DpmdBankeuPerubahanSettingsPage';

// Tertanam sebagai sub-tab "Bankeu Perubahan" di Bantuan Keuangan (SpkedPage).
const DpmdBankeuPerubahanPage = ({ tahun = 2026 }) => {
  const [activeTab, setActiveTab] = useState('verifikasi');

  const tabs = [
    { id: 'verifikasi', label: 'Verifikasi Proposal', icon: ClipboardCheck },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="relative bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center gap-2 h-14 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {activeTab === 'verifikasi' && <DpmdBankeuPerubahanVerificationPage tahun={tahun} />}
      {activeTab === 'settings' && <DpmdBankeuPerubahanSettingsPage />}
    </div>
  );
};

export default DpmdBankeuPerubahanPage;
