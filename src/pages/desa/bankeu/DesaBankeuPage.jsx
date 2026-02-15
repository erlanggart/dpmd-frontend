import React, { useState } from 'react';
import { LuDollarSign, LuFileText, LuRadar, LuArrowLeft } from 'react-icons/lu';
import BankeuProposalPage from './BankeuProposalPage';
import BankeuTrackingTab from './BankeuTrackingTab';

const DesaBankeuPage = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [activeTab, setActiveTab] = useState('pengajuan');

  // Year Selection Screen
  if (!selectedYear) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex h-20 w-20 bg-gradient-to-br from-blue-500 to-green-600 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-blue-500/30">
              <LuDollarSign className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-700 to-green-600 bg-clip-text text-transparent mb-3">
              Bantuan Keuangan Desa
            </h1>
            <p className="text-gray-600 text-lg">
              Pilih tahun anggaran untuk mengelola proposal
            </p>
          </div>

          {/* Year Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* TA 2026 */}
            <button
              onClick={() => setSelectedYear(2026)}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-gray-200 hover:border-blue-400 p-8 transition-all duration-300 text-center overflow-hidden hover:-translate-y-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="h-16 w-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/25">
                  <span className="text-3xl">📋</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">TA 2026</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Proposal Bantuan Keuangan<br/>Tahun Anggaran 2026
                </p>
              </div>
            </button>

            {/* TA 2027 */}
            <button
              onClick={() => setSelectedYear(2027)}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-gray-200 hover:border-green-400 p-8 transition-all duration-300 text-center overflow-hidden hover:-translate-y-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="h-16 w-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-green-500/25">
                  <span className="text-3xl">📝</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">TA 2027</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Proposal Bantuan Keuangan<br/>Tahun Anggaran 2027
                </p>
              </div>
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <LuDollarSign className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Informasi Penting</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Setiap tahun anggaran memiliki proposal yang terpisah</li>
                    <li>• Pastikan memilih tahun yang sesuai dengan periode pengajuan</li>
                    <li>• Data proposal tidak akan tercampur antar tahun anggaran</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show tabs after year selection
  const tabs = [
    { id: 'pengajuan', label: 'Pengajuan', icon: LuFileText, desc: 'Kelola proposal & surat' },
    { id: 'tracking', label: 'Tracking', icon: LuRadar, desc: 'Pantau status verifikasi' },
  ];

  return (
    <div className="relative">
      {/* Tab Header bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 h-14">
            {/* Back button */}
            <button
              onClick={() => { setSelectedYear(null); setActiveTab('pengajuan'); }}
              className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium mr-2"
            >
              <LuArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">TA {selectedYear}</span>
            </button>

            <div className="h-6 w-px bg-gray-300" />

            {/* Tabs */}
            <div className="flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'pengajuan' ? (
        <BankeuProposalPage tahun={selectedYear} />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <BankeuTrackingTab tahun={selectedYear} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DesaBankeuPage;
