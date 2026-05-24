import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuCoins, LuArrowLeft, LuClipboardCheck, LuMail, LuUsers } from 'react-icons/lu';
import BankeuPerubahanVerificationPage from './BankeuPerubahanVerificationPage';
import BankeuPerubahanSuratReviewPage from './BankeuPerubahanSuratReviewPage';
import KecamatanPerubahanTimVerifikasiPage from './KecamatanPerubahanTimVerifikasiPage';

const KecamatanBankeuPerubahanPage = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [activeTab, setActiveTab] = useState('verifikasi');
  const navigate = useNavigate();

  if (!selectedYear) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex h-20 w-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-orange-500/30">
              <LuCoins className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-3">
              Verifikasi Bankeu Perubahan
            </h1>
            <p className="text-gray-600 text-lg">Pilih tahun anggaran untuk memulai verifikasi</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={() => setSelectedYear(2026)}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-gray-200 hover:border-orange-400 p-8 transition-all duration-300 text-center overflow-hidden hover:-translate-y-2"
            >
              <div className="relative">
                <div className="h-16 w-16 mx-auto bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-500/25">
                  <span className="text-3xl">📋</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">TA 2026</h3>
                <p className="text-sm text-gray-600 leading-relaxed">Verifikasi Proposal Perubahan<br/>Tahun Anggaran 2026</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'verifikasi', label: 'Verifikasi Proposal', icon: LuClipboardCheck },
    { id: 'surat', label: 'Review Surat', icon: LuMail },
    { id: 'tim', label: 'Tim Verifikasi & Config', icon: LuUsers },
  ];

  return (
    <div className="relative">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 h-14 overflow-x-auto">
            <button
              onClick={() => setSelectedYear(null)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-orange-600 transition-colors text-sm font-medium flex-shrink-0"
            >
              <LuArrowLeft className="w-4 h-4" />
              <span>TA {selectedYear}</span>
            </button>
            <div className="h-6 w-px bg-gray-300 flex-shrink-0" />
            <div className="flex items-center gap-1">
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
      </div>
      {activeTab === 'verifikasi' && <BankeuPerubahanVerificationPage tahun={selectedYear} />}
      {activeTab === 'surat' && <BankeuPerubahanSuratReviewPage tahun={selectedYear} />}
      {activeTab === 'tim' && <KecamatanPerubahanTimVerifikasiPage />}
    </div>
  );
};

export default KecamatanBankeuPerubahanPage;
