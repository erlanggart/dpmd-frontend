import React, { useState } from 'react';
import { LuDollarSign, LuFileText, LuRadar, LuArrowLeft, LuArrowRight, LuClipboardCheck } from 'react-icons/lu';
import BankeuProposalPage from './BankeuProposalPage';
import BankeuTrackingTab from './BankeuTrackingTab';
import DesaBankeuLpjPage from './DesaBankeuLpjPage';
import DesaBankeuProposal2025Page from './DesaBankeuProposal2025Page';
import DesaPageHeader from '../../../components/desa/DesaPageHeader';

const DesaBankeuPage = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [activeTab, setActiveTab] = useState('pengajuan');
  // TA 2025 punya dua berkas yang berdiri sendiri: proposal dan LPJ.
  const [tab2025, setTab2025] = useState('proposal');

  // Year Selection Screen
  if (!selectedYear) {
    const years = [
      {
        tahun: 2025,
        icon: LuClipboardCheck,
        label: "Proposal & LPJ Bantuan Keuangan",
        desc: "Unggah proposal dan laporan pertanggungjawaban bantuan keuangan TA 2025.",
        badge: "Proposal & LPJ",
      },
      {
        tahun: 2026,
        icon: LuFileText,
        label: "Proposal Bantuan Keuangan",
        desc: "Pengajuan proposal dan pemantauan verifikasi TA 2026.",
        badge: "Proposal",
      },
      {
        tahun: 2027,
        icon: LuFileText,
        label: "Proposal Bantuan Keuangan",
        desc: "Pengajuan proposal dan pemantauan verifikasi TA 2027.",
        badge: "Proposal",
      },
    ];

    return (
      <div className="space-y-5">
        <DesaPageHeader
          icon={LuDollarSign}
          eyebrow="Bantuan Keuangan"
          title="Bantuan Keuangan Desa"
          description="Pilih tahun anggaran untuk mengelola proposal atau laporan pertanggungjawaban."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {years.map((year) => (
            <button
              key={year.tahun}
              onClick={() => setSelectedYear(year.tahun)}
              className="group rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <year.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {year.badge}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
                TA {year.tahun}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-700">{year.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{year.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                Buka
                <LuArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-semibold text-slate-900">Informasi Penting</h4>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-500">
            <li>• Setiap tahun anggaran memiliki proposal yang terpisah.</li>
            <li>• Pastikan memilih tahun yang sesuai dengan periode pengajuan.</li>
            <li>• Data proposal tidak akan tercampur antar tahun anggaran.</li>
          </ul>
        </div>
      </div>
    );
  }

  // TA 2025: proposal (unggah langsung ke DPMD) & LPJ, masing-masing satu tab
  if (selectedYear === 2025) {
    const tabs2025 = [
      { id: 'proposal', label: 'Proposal', icon: LuFileText },
      { id: 'lpj', label: 'LPJ', icon: LuClipboardCheck },
    ];

    return (
      <div className="space-y-5">
        <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 sm:px-4">
          <button
            onClick={() => { setSelectedYear(null); setTab2025('proposal'); }}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <LuArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">TA 2025</span>
          </button>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-1">
            {tabs2025.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTab2025(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                  tab2025 === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {tab2025 === 'proposal' ? (
          <DesaBankeuProposal2025Page tahun={2025} />
        ) : (
          <DesaBankeuLpjPage tahun={2025} />
        )}
      </div>
    );
  }

  // Show tabs after year selection (TA 2026, 2027)
  const tabs = [
    { id: 'pengajuan', label: 'Pengajuan', icon: LuFileText, desc: 'Kelola proposal & surat' },
    { id: 'tracking', label: 'Tracking', icon: LuRadar, desc: 'Pantau status verifikasi' },
  ];

  return (
    <div className="space-y-5">
      {/* Tab Header bar */}
      <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 sm:px-4">
        {/* Back button */}
        <button
          onClick={() => { setSelectedYear(null); setActiveTab('pengajuan'); }}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <LuArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">TA {selectedYear}</span>
        </button>

        <div className="h-5 w-px bg-slate-200" />

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'pengajuan' ? (
        <BankeuProposalPage tahun={selectedYear} />
      ) : (
        <BankeuTrackingTab tahun={selectedYear} />
      )}
    </div>
  );
};

export default DesaBankeuPage;
