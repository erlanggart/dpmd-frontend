import React, { useState } from 'react';
import { ArrowLeft, ClipboardCheck, FileText, Settings, Coins, ChevronRight } from 'lucide-react';
import DpmdBankeuPerubahanVerificationPage from './DpmdBankeuPerubahanVerificationPage';
import DpmdBankeuPerubahanLpjMonitoringPage from './DpmdBankeuPerubahanLpjMonitoringPage';
import DpmdBankeuPerubahanSettingsPage from './DpmdBankeuPerubahanSettingsPage';

const DpmdBankeuPerubahanPage = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [activeTab, setActiveTab] = useState('verifikasi');

  if (!selectedYear) {
    return (
      <div className="min-h-[60vh] bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="inline-flex h-16 w-16 bg-indigo-600 rounded-2xl items-center justify-center mb-5 shadow-lg shadow-indigo-600/20">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Verifikasi Final Bankeu Perubahan
            </h1>
            <p className="text-slate-500 mt-2">DPMD / SPKED · pilih tahun anggaran untuk mulai</p>
          </div>

          <button
            onClick={() => setSelectedYear(2026)}
            className="group w-full flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
          >
            <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center transition-colors group-hover:bg-indigo-100">
              <ClipboardCheck className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900">TA 2026</h3>
              <p className="text-sm text-slate-500">Proposal Perubahan Tahun Anggaran 2026</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 transition-all group-hover:text-indigo-500 group-hover:translate-x-0.5" />
          </button>
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
    <div className="relative bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center gap-2 h-14 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedYear(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>TA {selectedYear}</span>
            </button>
            <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
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
      {activeTab === 'verifikasi' && <DpmdBankeuPerubahanVerificationPage tahun={selectedYear} />}
      {activeTab === 'lpj' && <DpmdBankeuPerubahanLpjMonitoringPage />}
      {activeTab === 'settings' && <DpmdBankeuPerubahanSettingsPage />}
    </div>
  );
};

export default DpmdBankeuPerubahanPage;
