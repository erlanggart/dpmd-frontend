import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LuCoins, LuFileText, LuRadar, LuArrowLeft, LuClipboardCheck } from 'react-icons/lu';
import api from '../../../api';
import Swal from 'sweetalert2';
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

const isRevisionProposal = (proposal) => (
  !proposal.submitted_to_kecamatan
  && (
    ['revision', 'rejected'].includes(proposal.status)
    || ['revision', 'rejected'].includes(proposal.kecamatan_status)
    || ['revision', 'rejected'].includes(proposal.dpmd_status)
  )
);

const revisionSource = (proposal) => (
  ['revision', 'rejected'].includes(proposal.dpmd_status)
  || ['revision', 'rejected'].includes(proposal.status)
    ? 'DPMD'
    : 'Kecamatan'
);

const revisionEventTime = (proposal) => {
  const candidates = [];
  if (['revision', 'rejected'].includes(proposal.status)) {
    candidates.push(proposal.troubleshoot_at || proposal.dpmd_verified_at || proposal.updated_at);
  }
  if (['revision', 'rejected'].includes(proposal.kecamatan_status)) {
    candidates.push(proposal.kecamatan_verified_at);
  }
  if (['revision', 'rejected'].includes(proposal.dpmd_status)) {
    candidates.push(proposal.dpmd_verified_at || proposal.troubleshoot_at);
  }
  const times = candidates
    .map((value) => new Date(value || 0).getTime())
    .filter(Number.isFinite);
  return times.length ? Math.max(...times) : 0;
};

const revisionSignature = (proposals) => proposals
  .map((proposal) => [
    proposal.id,
    proposal.status || '',
    proposal.kecamatan_status || '',
    proposal.dpmd_status || '',
    revisionEventTime(proposal),
  ].join(':'))
  .sort()
  .join('|');

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const DesaBankeuPerubahanPage = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [activeTab, setActiveTab] = useState('pengajuan');
  const [trackingUpdates, setTrackingUpdates] = useState(0);
  const revisionPopupOpen = useRef(false);

  const seenKey = selectedYear ? `bankeuPerubahanTrackingSeen_${selectedYear}` : null;
  const revisionPopupKey = selectedYear ? `bankeuPerubahanRevisionPopup_${selectedYear}` : null;

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

  const showRevisionPopup = useCallback(async (proposals) => {
    if (!revisionPopupKey || revisionPopupOpen.current) return;
    const revisionProposals = proposals.filter(isRevisionProposal);
    if (!revisionProposals.length) {
      localStorage.removeItem(revisionPopupKey);
      return;
    }

    const signature = revisionSignature(revisionProposals);
    if (localStorage.getItem(revisionPopupKey) === signature) return;

    revisionPopupOpen.current = true;
    const proposalItems = revisionProposals.map((proposal) => {
      const kegiatan = (proposal.kegiatan_list || [])
        .map((item) => item.nama_kegiatan)
        .filter(Boolean)
        .join(', ');
      const note = proposal.troubleshoot_catatan
        || proposal.dpmd_catatan
        || proposal.kecamatan_catatan;
      return `
        <div class="rounded-xl border border-orange-200 bg-white p-3 text-left shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-bold leading-snug text-slate-900">${escapeHtml(proposal.judul_proposal)}</p>
              ${kegiatan ? `<p class="mt-1 text-xs text-slate-500">${escapeHtml(kegiatan)}</p>` : ''}
            </div>
            <span class="shrink-0 rounded-full bg-orange-100 px-2 py-1 text-[11px] font-bold text-orange-700">
              ${escapeHtml(revisionSource(proposal))}
            </span>
          </div>
          ${note ? `
            <div class="mt-2 rounded-lg bg-orange-50 px-2.5 py-2 text-xs leading-relaxed text-orange-900">
              <strong>Catatan:</strong> ${escapeHtml(note)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Ada kegiatan yang perlu direvisi',
      html: `
        <div class="text-left">
          <p class="mb-3 text-sm leading-relaxed text-slate-600">
            ${revisionProposals.length} proposal dikembalikan untuk diperbaiki. Periksa catatan verifikator sebelum mengirim ulang.
          </p>
          <div class="max-h-72 space-y-2 overflow-y-auto pr-1">${proposalItems}</div>
        </div>
      `,
      width: 640,
      showDenyButton: true,
      confirmButtonText: 'Perbaiki Sekarang',
      denyButtonText: 'Lihat Tracking',
      confirmButtonColor: '#ea580c',
      denyButtonColor: '#334155',
      allowOutsideClick: false,
      customClass: {
        popup: 'rounded-3xl',
        confirmButton: 'rounded-xl px-5 py-2.5',
        denyButton: 'rounded-xl px-5 py-2.5',
      },
    });

    localStorage.setItem(revisionPopupKey, signature);
    revisionPopupOpen.current = false;

    if (result.isDenied) {
      setActiveTab('tracking');
      markTrackingSeen(proposals);
    } else if (result.isConfirmed) {
      setActiveTab('pengajuan');
    }
  }, [revisionPopupKey, markTrackingSeen]);

  // Poll proposal untuk menghitung jumlah update verifikasi yang belum dibaca
  useEffect(() => {
    if (!selectedYear) return;
    let active = true;
    const fetchUpdates = async () => {
      try {
        const res = await api.get('/desa/bankeu-perubahan/proposals', { params: { tahun: selectedYear } });
        if (!active) return;
        const proposals = res.data?.data || [];
        showRevisionPopup(proposals);
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
  }, [selectedYear, activeTab, seenKey, markTrackingSeen, showRevisionPopup]);

  // Year selection screen (Phase 1 hanya TA 2026)
  if (!selectedYear) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex h-20 w-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-slate-900/20">
              <LuCoins className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 via-slate-700 to-slate-600 bg-clip-text text-transparent mb-3">
              Bantuan Keuangan Perubahan
            </h1>
            <p className="text-gray-600 text-lg">
              Pilih tahun anggaran untuk mengelola proposal perubahan
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={() => setSelectedYear(2026)}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-slate-200 hover:border-slate-400 p-8 transition-all duration-300 text-center overflow-hidden hover:-translate-y-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-400/5 to-slate-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="h-16 w-16 mx-auto bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-slate-900/20">
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
            <div className="bg-white border border-slate-200 border-l-4 border-l-slate-700 p-4 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <LuCoins className="w-6 h-6 text-slate-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Informasi Bankeu Perubahan</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
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
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium mr-2"
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
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
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
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-slate-800 rounded-full" />
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
