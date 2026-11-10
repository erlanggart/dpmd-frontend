import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LuFileText, LuRadar } from 'react-icons/lu';
import api from '../../../api';
import Swal from 'sweetalert2';
import BankeuPerubahanProposalPage from './BankeuPerubahanProposalPage';
import BankeuPerubahanTrackingTab from './BankeuPerubahanTrackingTab';

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

// Dipakai tertanam di tab "Bankeu Perubahan" pada DesaBankeuPage (TA 2026).
const DesaBankeuPerubahanPage = ({ tahun = 2026 }) => {
  const [activeTab, setActiveTab] = useState('pengajuan');
  const [trackingUpdates, setTrackingUpdates] = useState(0);
  const revisionPopupOpen = useRef(false);

  const seenKey = `bankeuPerubahanTrackingSeen_${tahun}`;
  const revisionPopupKey = `bankeuPerubahanRevisionPopup_${tahun}`;

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
        <div class="rounded-xl border border-amber-200 bg-white p-3 text-left shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-bold leading-snug text-slate-900">${escapeHtml(proposal.judul_proposal)}</p>
              ${kegiatan ? `<p class="mt-1 text-xs text-slate-500">${escapeHtml(kegiatan)}</p>` : ''}
            </div>
            <span class="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">
              ${escapeHtml(revisionSource(proposal))}
            </span>
          </div>
          ${note ? `
            <div class="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-900">
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
    let active = true;
    const fetchUpdates = async () => {
      try {
        const res = await api.get('/desa/bankeu-perubahan/proposals', { params: { tahun } });
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
  }, [tahun, activeTab, seenKey, markTrackingSeen, showRevisionPopup]);

  const tabs = [
    { id: 'pengajuan', label: 'Pengajuan', icon: LuFileText, desc: 'Kelola proposal perubahan' },
    { id: 'tracking', label: 'Tracking', icon: LuRadar, desc: 'Pantau status verifikasi' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex h-14 items-center gap-3 overflow-x-auto rounded-xl border border-slate-200 bg-white px-3 sm:px-4">
        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'tracking') markTrackingSeen();
              }}
              className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.id === 'tracking' && trackingUpdates > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                  {trackingUpdates > 9 ? '9+' : trackingUpdates}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'pengajuan' && <BankeuPerubahanProposalPage tahun={tahun} />}
      {activeTab === 'tracking' && <BankeuPerubahanTrackingTab tahun={tahun} />}
    </div>
  );
};

export default DesaBankeuPerubahanPage;
