import React, { useEffect, useState } from "react";
import api from "../../../api";
import {
  LuFileText, LuClock, LuCheck, LuX, LuRefreshCw,
  LuBuilding2, LuLandmark, LuShield, LuSend,
  LuChevronDown, LuChevronRight, LuMapPin,
  LuDollarSign, LuCircleAlert, LuLoader, LuMailOpen, LuWrench
} from "react-icons/lu";

// ========== HELPER: Format tanggal ==========
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ========== HELPER: Format Rupiah ==========
const formatRupiah = (val) => {
  if (!val) return '-';
  return `Rp ${Number(val).toLocaleString('id-ID')}`;
};

// ========== STEP STATUS CONFIG ==========
const stepConfig = {
  completed: { color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: LuCheck, label: 'Selesai' },
  active: { color: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', icon: LuClock, label: 'Sedang Diproses' },
  rejected: { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: LuX, label: 'Ditolak' },
  revision: { color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: LuRefreshCw, label: 'Perlu Revisi' },
  troubleshoot: { color: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', icon: LuWrench, label: 'Catatan' },
  waiting: { color: 'bg-gray-300', text: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: LuClock, label: 'Menunggu' },
};

// ========== Komponen: Step Indicator ==========
const StepIndicator = ({ step, isLast }) => {
  const cfg = stepConfig[step.status] || stepConfig.waiting;
  const Icon = cfg.icon;

  return (
    <div className="flex gap-3">
      {/* Vertical line + circle */}
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full ${cfg.color} flex items-center justify-center shadow-md ring-4 ring-white z-10`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-[40px] ${step.status === 'completed' ? 'bg-slate-300' : 'bg-gray-200'}`} />
        )}
      </div>
      {/* Content */}
      <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
        <div className={`rounded-xl p-3 ${cfg.bg} border ${cfg.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <step.icon className={`w-4 h-4 ${cfg.text}`} />
              <span className={`font-semibold text-sm ${cfg.text}`}>{step.label}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color} text-white`}>
              {cfg.label}
            </span>
          </div>
          {step.date && (
            <p className="text-xs text-gray-500 mt-1">{formatDate(step.date)}</p>
          )}
          {step.verifier && (
            <p className="text-xs text-gray-600 mt-0.5">Oleh: {step.verifier}</p>
          )}
          {step.catatan && (
            <div className="mt-2 text-xs bg-white/60 rounded-lg p-2 border border-gray-100">
              <span className="font-medium text-gray-700">Catatan:</span>{' '}
              <span className="text-gray-600">{step.catatan}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== Komponen: Proposal Tracking Card ==========
const ProposalTrackingCard = ({ proposal, index }) => {
  // Auto-expand if proposal needs revision
  const needsRevision = 
    proposal.dinas_status === 'revision' || 
    proposal.dinas_status === 'rejected' ||
    proposal.kecamatan_status === 'revision' || 
    proposal.kecamatan_status === 'rejected' ||
    proposal.status === 'revision' ||
    proposal.status === 'rejected';
  
  const [expanded, setExpanded] = useState(needsRevision);

  // Build steps berdasarkan flow: Desa → Dinas → Kecamatan → Diterima DPMD (selesai)
  const buildSteps = () => {
    const steps = [];

    // FIX 2026-03-11: Jika proposal sudah final (di DPMD), semua step sebelumnya otomatis completed
    const isFinal = proposal.submitted_to_dpmd === true || proposal.submitted_to_dpmd === 1 || 
                    proposal.dpmd_status === 'approved' || proposal.status === 'verified';

    // Step 1: Pengajuan Desa - proposal diajukan dan dikirim ke dinas
    // FIX: Jika sudah final, step 1 pasti completed meskipun submitted_to_dinas_at ter-reset
    const isSubmitted = !!proposal.submitted_to_dinas_at || isFinal;
    steps.push({
      label: '1. Pengajuan Desa',
      icon: LuSend,
      status: isSubmitted ? 'completed' : 'active',
      date: isSubmitted ? (proposal.submitted_to_dinas_at || proposal.created_at) : proposal.created_at,
      catatan: isSubmitted ? 'Proposal berhasil dikirim ke Dinas Terkait' : 'Menunggu dikirim ke Dinas Terkait',
    });

    // Step 2: Dinas Terkait - verifikasi teknis
    // FIX: Jika sudah final, dinas sudah pasti approved
    const dinasStatus = isFinal ? 'approved' : proposal.dinas_status;
    let dinasStepStatus = 'waiting';
    if (dinasStatus === 'approved') dinasStepStatus = 'completed';
    else if (dinasStatus === 'rejected') dinasStepStatus = 'rejected';
    else if (dinasStatus === 'revision') dinasStepStatus = 'revision';
    else if (isSubmitted && (dinasStatus === 'pending' || dinasStatus === 'in_review' || !dinasStatus)) dinasStepStatus = 'active';

    steps.push({
      label: '2. Verifikasi Dinas Terkait',
      icon: LuBuilding2,
      status: dinasStepStatus,
      date: proposal.dinas_verified_at,
      verifier: proposal.dinas_verified_by_name,
      catatan: proposal.dinas_catatan || (dinasStepStatus === 'active' ? 'Menunggu verifikasi dari Dinas Terkait' : null),
    });

    // Step 3: Kecamatan - verifikasi administrasi
    // FIX: Jika sudah final, kecamatan sudah pasti approved
    const kecStatus = isFinal ? 'approved' : proposal.kecamatan_status;
    let kecStepStatus = 'waiting';
    if (kecStatus === 'approved') kecStepStatus = 'completed';
    else if (kecStatus === 'rejected') kecStepStatus = 'rejected';
    else if (kecStatus === 'revision') kecStepStatus = 'revision';
    else if (dinasStatus === 'approved' && (kecStatus === 'pending' || kecStatus === 'in_review' || !kecStatus)) kecStepStatus = 'active';

    steps.push({
      label: '3. Verifikasi Kecamatan',
      icon: LuLandmark,
      status: kecStepStatus,
      date: proposal.kecamatan_verified_at,
      verifier: proposal.kecamatan_verified_by_name,
      catatan: proposal.kecamatan_catatan || (kecStepStatus === 'active' ? 'Menunggu verifikasi dari Kecamatan' : null),
    });

    // Step 4: Dikirim ke DPMD
    // Alur selesai ketika kecamatan sudah KLIK TOMBOL "Kirim ke DPMD" (submitted_to_dpmd = true)
    // Bukan hanya approve proposal saja
    const kecamatanApproved = kecStatus === 'approved';
    const isSubmittedToDpmd = proposal.submitted_to_dpmd === true || proposal.submitted_to_dpmd === 1;
    let dpmdStepStatus = 'waiting';
    
    if (isSubmittedToDpmd) {
      // Sudah dikirim ke DPMD = selesai
      dpmdStepStatus = 'completed';
    } else if (kecamatanApproved) {
      // Kecamatan sudah approve tapi belum kirim ke DPMD = active (menunggu dikirim)
      dpmdStepStatus = 'active';
    }

    steps.push({
      label: '4. Dikirim ke DPMD (Selesai)',
      icon: LuShield,
      status: dpmdStepStatus,
      date: isSubmittedToDpmd ? proposal.submitted_to_dpmd_at : null,
      verifier: null, // DPMD tidak ada verifier karena hanya menerima
      catatan: isSubmittedToDpmd 
        ? '✓ Alur proposal selesai - Proposal telah diterima DPMD untuk diproses lebih lanjut' 
        : (kecamatanApproved 
          ? 'Menunggu Kecamatan mengirim ke DPMD' 
          : 'Menunggu persetujuan Kecamatan'),
    });

    // Troubleshoot step (jika ada catatan troubleshoot dari DPMD)
    if (proposal.troubleshoot_catatan) {
      steps.push({
        label: '⚠️ Catatan DPMD',
        icon: LuWrench,
        status: 'troubleshoot',
        date: proposal.troubleshoot_at,
        verifier: proposal.troubleshoot_by_name,
        catatan: proposal.troubleshoot_catatan,
      });
    }

    return steps;
  };

  const steps = buildSteps();
  const currentStep = steps.findIndex(s => s.status === 'active' || s.status === 'rejected' || s.status === 'revision');
  // Alur selesai ketika kecamatan sudah kirim ke DPMD (submitted_to_dpmd = true)
  const isSubmittedToDpmd = proposal.submitted_to_dpmd === true || proposal.submitted_to_dpmd === 1;
  const isFinalApproved = isSubmittedToDpmd || proposal.status === 'verified';
  const isRejected = proposal.status === 'rejected' || proposal.status === 'revision';

  // Overall status badge
  const getOverallBadge = () => {
    // Alur selesai: Kecamatan sudah KIRIM ke DPMD (bukan hanya approve)
    if (isSubmittedToDpmd) return { text: '✓ Diterima DPMD', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    
    // Kecamatan approved tapi belum dikirim ke DPMD
    if (proposal.kecamatan_status === 'approved') return { text: 'Disetujui Kecamatan', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    
    // Troubleshoot dari DPMD
    if (proposal.troubleshoot_catatan && proposal.status === 'revision' && !proposal.submitted_to_dinas_at) return { text: 'Troubleshoot DPMD', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    
    // Status Kecamatan
    if (proposal.kecamatan_status === 'rejected') return { text: 'Ditolak Kecamatan', color: 'bg-red-100 text-red-800 border-red-300' };
    if (proposal.kecamatan_status === 'revision') return { text: 'Revisi Kecamatan', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    if (proposal.kecamatan_status === 'pending' || proposal.kecamatan_status === 'in_review') return { text: 'Di Kecamatan', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    
    // Status Dinas
    if (proposal.dinas_status === 'rejected') return { text: 'Ditolak Dinas', color: 'bg-red-100 text-red-800 border-red-300' };
    if (proposal.dinas_status === 'revision') return { text: 'Revisi Dinas', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    if (proposal.dinas_status === 'approved') return { text: 'Di Kecamatan', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    if (proposal.dinas_status === 'pending' || proposal.dinas_status === 'in_review') return { text: 'Di Dinas', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    
    // Belum dikirim
    if (proposal.submitted_to_dinas_at) return { text: 'Dikirim ke Dinas', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    return { text: 'Belum Dikirim', color: 'bg-gray-100 text-gray-700 border-gray-300' };
  };

  const badge = getOverallBadge();

  // Progress percentage - exclude troubleshoot step from calculation
  // Only count the main 4 steps (Pengajuan Desa, Verifikasi Dinas, Verifikasi Kecamatan, Dikirim ke DPMD)
  const mainSteps = steps.filter(s => s.status !== 'troubleshoot');
  const completedSteps = mainSteps.filter(s => s.status === 'completed').length;
  const progressPct = Math.round((completedSteps / mainSteps.length) * 100);

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md ${
      isFinalApproved ? 'border-slate-200' : isRejected ? 'border-red-200' : 'border-gray-200'
    }`}>
      {/* Card Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 md:p-5 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono text-gray-400">#{proposal.id}</span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                {badge.text}
              </span>
            </div>
            <h3 className="font-bold text-gray-800 text-sm md:text-base truncate">{proposal.judul_proposal}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
              {proposal.kegiatan_list?.map((k, i) => (
                <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  k.jenis_kegiatan === 'infrastruktur' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {k.nama_kegiatan}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
              {proposal.lokasi && (
                <span className="flex items-center gap-1"><LuMapPin className="w-3 h-3" />{proposal.lokasi}</span>
              )}
              {proposal.anggaran_usulan && (
                <span className="flex items-center gap-1"><LuDollarSign className="w-3 h-3" />{formatRupiah(proposal.anggaran_usulan)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mini progress circle */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none"
                    stroke={isFinalApproved ? '#10b981' : isRejected ? '#ef4444' : '#3b82f6'}
                    strokeWidth="3" strokeDasharray={`${progressPct} ${100 - progressPct}`}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                  {progressPct}%
                </span>
              </div>
            </div>
            {expanded ? <LuChevronDown className="w-5 h-5 text-gray-400" /> : <LuChevronRight className="w-5 h-5 text-gray-400" />}
          </div>
        </div>

        {/* Progress bar mobile */}
        <div className="mt-3 sm:hidden">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isFinalApproved ? 'bg-slate-500' : isRejected ? 'bg-red-500' : 'bg-slate-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">{progressPct}% selesai</p>
        </div>
      </button>

      {/* Expanded: Timeline */}
      {expanded && (
        <div className="px-4 md:px-5 pb-5 border-t border-gray-100 pt-4">
          <div className="ml-1">
            {steps.map((step, idx) => (
              <StepIndicator key={idx} step={step} isLast={idx === steps.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ========== Komponen: Surat Tracking Card ==========
const SuratTrackingCard = ({ surat, tahun }) => {
  if (!surat || (!surat.surat_pengantar && !surat.surat_permohonan)) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
        <LuMailOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Belum ada surat untuk TA {tahun}</p>
        <p className="text-xs text-gray-400 mt-1">Upload surat pengantar dan permohonan di tab Pengajuan</p>
      </div>
    );
  }

  const getKecamatanBadge = () => {
    const status = surat.kecamatan_status;
    if (status === 'approved') return { text: 'Disetujui Kecamatan', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: LuCheck };
    if (status === 'rejected') return { text: 'Ditolak Kecamatan', color: 'bg-red-100 text-red-800 border-red-300', icon: LuX };
    if (status === 'revision') return { text: 'Perlu Revisi', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: LuRefreshCw };
    if (surat.submitted_to_kecamatan) return { text: 'Dikirim ke Kecamatan', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: LuClock };
    return { text: 'Belum Dikirim', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: LuClock };
  };

  const kecBadge = getKecamatanBadge();
  const KecIcon = kecBadge.icon;

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-md">
              <LuFileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Surat Desa TA {tahun}</h3>
              <p className="text-[10px] text-gray-400">Pengantar & Permohonan</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${kecBadge.color}`}>
            <KecIcon className="w-3 h-3" />
            {kecBadge.text}
          </span>
        </div>

        {/* Surat items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Surat Pengantar */}
          <div className={`rounded-xl p-3 border ${surat.surat_pengantar ? 'bg-slate-50 border-slate-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {surat.surat_pengantar ? (
                <LuCheck className="w-4 h-4 text-slate-600" />
              ) : (
                <LuCircleAlert className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-xs font-semibold ${surat.surat_pengantar ? 'text-slate-700' : 'text-gray-500'}`}>
                Surat Pengantar
              </span>
            </div>
            <p className="text-[10px] text-gray-500 ml-6">
              {surat.surat_pengantar ? 'Sudah diupload' : 'Belum diupload'}
            </p>
          </div>

          {/* Surat Permohonan */}
          <div className={`rounded-xl p-3 border ${surat.surat_permohonan ? 'bg-slate-50 border-slate-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {surat.surat_permohonan ? (
                <LuCheck className="w-4 h-4 text-slate-600" />
              ) : (
                <LuCircleAlert className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-xs font-semibold ${surat.surat_permohonan ? 'text-slate-700' : 'text-gray-500'}`}>
                Surat Permohonan
              </span>
            </div>
            <p className="text-[10px] text-gray-500 ml-6">
              {surat.surat_permohonan ? 'Sudah diupload' : 'Belum diupload'}
            </p>
          </div>
        </div>

        {/* Timeline surat */}
        <div className="mt-4 space-y-2">
          {surat.submitted_at && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <LuSend className="w-3 h-3" />
              <span>Dikirim ke Kecamatan: {formatDate(surat.submitted_at)}</span>
            </div>
          )}
          {surat.kecamatan_reviewed_at && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <LuLandmark className="w-3 h-3" />
              <span>Direview oleh: {surat.reviewer_name || 'Kecamatan'} ({formatDate(surat.kecamatan_reviewed_at)})</span>
            </div>
          )}
          {surat.kecamatan_catatan && (
            <div className="text-xs bg-amber-50 rounded-lg p-2 border border-amber-200 mt-2">
              <span className="font-medium text-amber-700">Catatan Kecamatan:</span>{' '}
              <span className="text-amber-600">{surat.kecamatan_catatan}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== MAIN COMPONENT ==========
const BankeuTrackingTab = ({ tahun }) => {
  const [proposals, setProposals] = useState([]);
  const [desaSurat, setDesaSurat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchTrackingData();
  }, [tahun]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const [proposalsRes, suratRes] = await Promise.all([
        api.get("/desa/bankeu/proposals", { params: { tahun } }),
        api.get("/desa/bankeu/surat", { params: { tahun } }).catch(() => ({ data: { data: null } }))
      ]);
      setProposals(proposalsRes.data.data || []);
      setDesaSurat(suratRes.data.data || null);
    } catch (error) {
      console.error("Error fetching tracking data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered proposals
  const filteredProposals = proposals.filter(p => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'approved') return p.dpmd_status === 'approved' || p.status === 'verified';
    if (filterStatus === 'in_progress') return !p.dpmd_status || (p.dpmd_status === 'pending' || p.dpmd_status === 'in_review');
    if (filterStatus === 'rejected') return p.status === 'rejected' || p.status === 'revision' || p.dinas_status === 'rejected' || p.kecamatan_status === 'rejected' || p.dpmd_status === 'rejected';
    return true;
  });

  // Summary stats
  const stats = {
    total: proposals.length,
    approved: proposals.filter(p => p.dpmd_status === 'approved' || p.status === 'verified').length,
    inProgress: proposals.filter(p => p.submitted_to_dinas_at && !['verified', 'rejected'].includes(p.status) && p.dpmd_status !== 'approved').length,
    needsAction: proposals.filter(p => p.status === 'rejected' || p.status === 'revision').length,
    notSent: proposals.filter(p => !p.submitted_to_dinas_at).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LuLoader className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${filterStatus === 'all' ? 'border-slate-400 bg-slate-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Total Proposal</p>
        </button>
        <button onClick={() => setFilterStatus('approved')}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${filterStatus === 'approved' ? 'border-slate-400 bg-slate-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <p className="text-2xl font-bold text-slate-600">{stats.approved}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Disetujui</p>
        </button>
        <button onClick={() => setFilterStatus('in_progress')}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${filterStatus === 'in_progress' ? 'border-slate-400 bg-slate-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <p className="text-2xl font-bold text-slate-600">{stats.inProgress}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Dalam Proses</p>
        </button>
        <button onClick={() => setFilterStatus('rejected')}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${filterStatus === 'rejected' ? 'border-red-400 bg-red-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <p className="text-2xl font-bold text-red-600">{stats.needsAction}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Perlu Tindakan</p>
        </button>
      </div>

      {/* Surat Section */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <LuFileText className="w-4 h-4 text-orange-500" />
          Status Surat Desa
        </h2>
        <SuratTrackingCard surat={desaSurat} tahun={tahun} />
      </div>

      {/* Proposals Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <LuFileText className="w-4 h-4 text-slate-500" />
            Status Proposal ({filteredProposals.length})
          </h2>
          <button onClick={fetchTrackingData}
            className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1 font-medium">
            <LuRefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {filteredProposals.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
            <LuFileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {filterStatus === 'all' ? 'Belum ada proposal' : 'Tidak ada proposal dengan status ini'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProposals.map((proposal, idx) => (
              <ProposalTrackingCard key={proposal.id} proposal={proposal} index={idx} />
            ))}
          </div>
        )}
      </div>

      {/* Flow Legend */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-50 rounded-2xl p-4 border border-slate-200">
        <h3 className="text-xs font-bold text-slate-800 mb-3">Alur Verifikasi Proposal</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2 text-[10px]">
          {[
            { label: 'Desa', icon: '📋', color: 'bg-slate-500' },
            { label: 'Dinas Terkait', icon: '🏢', color: 'bg-slate-500' },
            { label: 'Kecamatan', icon: '🏛️', color: 'bg-slate-500' },
            { label: 'DPMD', icon: '🛡️', color: 'bg-slate-500' },
          ].map((item, i, arr) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-1 bg-white rounded-lg px-2.5 py-1.5 border border-gray-200 whitespace-nowrap shadow-sm">
                <span>{item.icon}</span>
                <span className="font-semibold text-gray-700">{item.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`w-6 h-0.5 ${item.color} rounded-full flex-shrink-0`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BankeuTrackingTab;
