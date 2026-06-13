import React, { useState, useEffect, useCallback } from 'react';
import { LuCoins, LuFileText, LuRadar, LuArrowLeft, LuClipboardCheck } from 'react-icons/lu';
import api from '../../../api';
import BankeuPerubahanProposalPage from './BankeuPerubahanProposalPage';
import BankeuPerubahanTrackingTab from './BankeuPerubahanTrackingTab';
import DesaBankeuPerubahanLpjPage from './DesaBankeuPerubahanLpjPage';

// Timestamp update verifikasi terbaru pada sebuah proposal (0 jika belum ada)
const latestUpdateTime = (p) => {
  const times = [];
  if (['revision', 'rejected'].includes(p.status) && p.updated_at)
    times.push(new Date(p.updated_at).getTime());
  if (['approved', 'revision', 'rejected'].includes(p.kecamatan_status) && p.kecamatan_verified_at)
    times.push(new Date(p.kecamatan_verified_at).getTime());
  if (['approved', 'revision', 'rejected'].includes(p.dpmd_status) && p.dpmd_verified_at)
    times.push(new Date(p.dpmd_verified_at).getTime());
  return times.length ? Math.max(...times) : 0;
};

const DesaBankeuPerubahanPage = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [activeTab, setActiveTab] = useState('pengajuan');
  const [trackingUpdates, setTrackingUpdates] = useState(0);

  const seenKey = selectedYear ? `bankeuPerubahanTrackingSeen_${selectedYear}` : null;

  // Tandai semua update tracking sebagai sudah dibaca
  const markTrackingSeen = useCallback((proposals = null) => {
    if (!seenKey) return;
    const stored = Number(localStorage.getItem(seenKey) || 0);
    const maxTime = proposals
      ? Math.max(stored, 0, ...proposals.map(latestUpdateTime))
      : Math.max(stored, Date.now());
    localStorage.setItem(seenKey, String(maxTime));
    setTrackingUpdates(0);
  }, [seenKey]);

  // Poll proposal untuk menghitung jumlah update verifikasi yang belum dibaca
  useEffect(() => {
    if (!selectedYear) return;
    let active = true;
    const fetchUpdates = async () => {
      try {
        const res = await api.get('/desa/bankeu-perubahan/proposals', { params: { tahun: selectedYear } });
        if (!active) return;
        const proposals = res.data?.data || [];
        if (activeTab === 'tracking') {
          markTrackingSeen(proposals);
        } else {
          const lastSeen = Number(localStorage.getItem(seenKey) || 0);
          setTrackingUpdates(proposals.filter(p => latestUpdateTime(p) > lastSeen).length);
        }
      } catch {
        // abaikan error polling
      }
    };
    fetchUpdates();
    const id = setInterval(fetchUpdates, 30000);
    return () => { active = false; clearInterval(id); };
  }, [selectedYear, activeTab, seenKey, markTrackingSeen]);

  // Year selection screen (Phase 1 hanya TA 2026)
  if (!selectedYear) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex h-20 w-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-orange-500/30">
              <LuCoins className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-3">
              Bantuan Keuangan Perubahan
            </h1>
            <p className="text-gray-600 text-lg">
              Pilih tahun anggaran untuk mengelola proposal perubahan
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={() => setSelectedYear(2026)}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-gray-200 hover:border-orange-400 p-8 transition-all duration-300 text-center overflow-hidden hover:-translate-y-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/5 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="h-16 w-16 mx-auto bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-500/25">
                  <span className="text-3xl">📋</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">TA 2026</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Proposal Bantuan Keuangan Perubahan<br/>Tahun Anggaran 2026
                </p>
              </div>
            </button>
          </div>

          <div className="mt-12 max-w-3xl mx-auto">
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <LuCoins className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-900 mb-1">Informasi Bankeu Perubahan</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• Alur verifikasi: <strong>Desa → Kecamatan → DPMD</strong></li>
                    <li>• Proposal terpisah dari Bankeu reguler</li>
                    <li>• Maksimal anggaran per proposal: Rp 1.500.000.000</li>
                    <li>• Pastikan dokumen proposal sudah lengkap sebelum dikirim ke kecamatan</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'pengajuan', label: 'Pengajuan', icon: LuFileText, desc: 'Kelola proposal perubahan' },
    { id: 'tracking', label: 'Tracking', icon: LuRadar, desc: 'Pantau status verifikasi' },
    { id: 'lpj', label: 'LPJ', icon: LuClipboardCheck, desc: 'Laporan pertanggungjawaban' },
  ];

  return (
    <div className="relative">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 h-14">
            <button
              onClick={() => { setSelectedYear(null); setActiveTab('pengajuan'); }}
              className="flex items-center gap-1.5 text-gray-500 hover:text-orange-600 transition-colors text-sm font-medium mr-2"
            >
              <LuArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">TA {selectedYear}</span>
            </button>

            <div className="h-6 w-px bg-gray-300" />

            <div className="flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'tracking') markTrackingSeen();
                  }}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-orange-50 text-orange-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.id === 'tracking' && trackingUpdates > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                      {trackingUpdates > 9 ? '9+' : trackingUpdates}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'pengajuan' && <BankeuPerubahanProposalPage tahun={selectedYear} />}
      {activeTab === 'tracking' && (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
          <div className="mx-auto max-w-6xl">
            <BankeuPerubahanTrackingTab tahun={selectedYear} />
          </div>
        </div>
      )}
      {activeTab === 'lpj' && <DesaBankeuPerubahanLpjPage tahun={selectedYear} />}
    </div>
  );
};

export default DesaBankeuPerubahanPage;
