import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../api';
import {
  LuBuilding2,
  LuCalendarDays,
  LuCheck,
  LuChevronDown,
  LuCircleAlert,
  LuClock3,
  LuCoins,
  LuFileText,
  LuFilter,
  LuInfo,
  LuLandmark,
  LuMapPin,
  LuRadar,
  LuRefreshCw,
  LuSearch,
  LuSend,
  LuTriangleAlert,
  LuX,
} from 'react-icons/lu';

const STATUS_META = {
  pending: {
    label: 'Menunggu',
    shortLabel: 'Menunggu',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    icon: LuClock3,
  },
  in_review: {
    label: 'Sedang diperiksa',
    shortLabel: 'Diperiksa',
    text: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
    icon: LuRadar,
  },
  approved: {
    label: 'Disetujui',
    shortLabel: 'Disetujui',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    icon: LuCheck,
  },
  rejected: {
    label: 'Ditolak',
    shortLabel: 'Ditolak',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    icon: LuX,
  },
  revision: {
    label: 'Perlu revisi',
    shortLabel: 'Revisi',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    icon: LuRefreshCw,
  },
  waiting: {
    label: 'Belum diterima',
    shortLabel: 'Belum masuk',
    text: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    dot: 'bg-slate-300',
    icon: LuClock3,
  },
};

const CATEGORY_LABELS = {
  wajib: 'Wajib',
  pilihan_infrastruktur: 'Infrastruktur',
  pilihan_non_infrastruktur: 'Non-Infrastruktur',
};

const rupiah = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const formatDate = (value, withTime = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('id-ID', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' });
};

const isReturned = (proposal) => (
  ['revision', 'rejected'].includes(proposal.status)
  || ['revision', 'rejected'].includes(proposal.kecamatan_status)
  || ['revision', 'rejected'].includes(proposal.dpmd_status)
);

const needsVillageAction = (proposal) => isReturned(proposal) && !proposal.submitted_to_kecamatan;

const getCurrentState = (proposal) => {
  if (needsVillageAction(proposal)) {
    const rejected = proposal.status === 'rejected'
      || proposal.kecamatan_status === 'rejected'
      || proposal.dpmd_status === 'rejected';
    return {
      key: 'revision',
      label: rejected ? 'Ditolak, perlu diperbaiki' : 'Menunggu perbaikan Desa',
      description: 'Buka tab Pengajuan, perbaiki proposal, lalu kirim ulang ke Kecamatan.',
      source: ['revision', 'rejected'].includes(proposal.dpmd_status)
        || ['revision', 'rejected'].includes(proposal.status)
        ? 'DPMD'
        : 'Kecamatan',
    };
  }
  if (proposal.dpmd_status === 'approved') {
    return {
      key: 'approved',
      label: 'Selesai diverifikasi',
      description: 'Proposal telah disetujui DPMD.',
    };
  }
  if (proposal.submitted_to_dpmd) {
    return {
      key: proposal.dpmd_status || 'pending',
      label: proposal.dpmd_status === 'in_review' ? 'Sedang diperiksa DPMD' : 'Menunggu DPMD',
      description: 'Proposal telah diteruskan Kecamatan ke DPMD.',
    };
  }
  if (proposal.kecamatan_status === 'approved') {
    return {
      key: 'in_review',
      label: 'Lolos verifikasi Kecamatan',
      description: 'Menunggu proposal diteruskan ke DPMD.',
    };
  }
  return {
    key: proposal.kecamatan_status || 'pending',
    label: proposal.kecamatan_status === 'in_review'
      ? 'Sedang diperiksa Kecamatan'
      : 'Menunggu Kecamatan',
    description: 'Proposal telah terkirim dan masuk antrean verifikasi Kecamatan.',
  };
};

const StatusPill = ({ status, label }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${meta.bg} ${meta.border} ${meta.text}`}>
      <Icon className="h-3.5 w-3.5" />
      {label || meta.label}
    </span>
  );
};

const SummaryCard = ({ icon: Icon, label, value, detail, tone }) => {
  // Warna hanya dipakai pada angka sebagai penanda semantik; permukaan tetap netral.
  const valueTones = {
    slate: 'text-slate-900',
    blue: 'text-slate-900',
    orange: 'text-brand-600',
    emerald: 'text-emerald-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className={`mt-2 text-2xl font-semibold tracking-tight ${valueTones[tone] || 'text-slate-900'}`}>{value}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
        </div>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

const ProgressStage = ({ icon: Icon, title, status, date, last }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const StatusIcon = meta.icon;
  return (
    <div className="relative flex flex-1 gap-3 md:block">
      {!last && (
        <>
          <div className="absolute left-[17px] top-9 h-[calc(100%-18px)] w-px bg-slate-200 md:hidden" />
          <div className="absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-[18px] hidden h-px bg-slate-200 md:block" />
        </>
      )}
      <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-white ${meta.border} ${meta.text}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 pb-5 md:mt-3 md:pb-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">{title}</p>
        <div className={`mt-1 flex items-center gap-1.5 text-sm font-bold ${meta.text}`}>
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{meta.shortLabel}</span>
        </div>
        {date && <p className="mt-1 text-xs text-slate-400">{date}</p>}
      </div>
    </div>
  );
};

const ProposalTrackingCard = ({ proposal }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const current = getCurrentState(proposal);
  const currentMeta = STATUS_META[current.key] || STATUS_META.pending;
  const CurrentIcon = currentMeta.icon;
  const returned = needsVillageAction(proposal);
  const kegiatan = proposal.kegiatan_list || [];
  const kegiatanLabel = kegiatan.map((item) => item.nama_kegiatan).filter(Boolean).join(', ');
  const submittedDate = formatDate(proposal.submitted_at, true);

  const villageStatus = returned ? 'revision' : 'approved';
  const kecamatanStatus = proposal.kecamatan_status || 'pending';
  const dpmdVisible = proposal.submitted_to_dpmd
    || ['revision', 'rejected', 'approved', 'in_review'].includes(proposal.dpmd_status);
  const dpmdStatus = dpmdVisible ? (proposal.dpmd_status || 'pending') : 'waiting';

  const notes = [
    proposal.kecamatan_catatan && { source: 'Kecamatan', text: proposal.kecamatan_catatan, tone: 'blue' },
    proposal.dpmd_catatan && { source: 'DPMD', text: proposal.dpmd_catatan, tone: 'violet' },
    proposal.troubleshoot_catatan && { source: 'Pengembalian DPMD', text: proposal.troubleshoot_catatan, tone: 'red' },
  ].filter(Boolean);

  return (
    <article className={`overflow-hidden rounded-xl border bg-white transition-colors ${
      returned ? 'border-amber-200' : 'border-slate-200'
    }`}>
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={current.key} label={current.label} />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {CATEGORY_LABELS[proposal.jenis_kegiatan] || 'Kegiatan'}
              </span>
              {submittedDate && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <LuCalendarDays className="h-3.5 w-3.5" />
                  Dikirim {submittedDate}
                </span>
              )}
            </div>

            <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight text-slate-900 md:text-xl">
              {proposal.judul_proposal}
            </h3>
            {proposal.nama_kegiatan_spesifik && (
              <p className="mt-1 text-sm font-medium text-slate-600">{proposal.nama_kegiatan_spesifik}</p>
            )}
            {kegiatanLabel && (
              <p className="mt-2 flex items-start gap-2 text-sm text-slate-500">
                <LuFileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span className="line-clamp-2">{kegiatanLabel}</span>
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 lg:min-w-52 lg:text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Nilai Usulan</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
              {rupiah(proposal.anggaran_usulan)}
            </p>
          </div>
        </div>

        <div className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 ${currentMeta.bg} ${currentMeta.border}`}>
          <div className={`mt-0.5 rounded-xl bg-white/80 p-2 ${currentMeta.text}`}>
            <CurrentIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`font-semibold ${currentMeta.text}`}>{current.label}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{current.description}</p>
            {current.source && (
              <p className="mt-2 text-xs font-bold text-amber-700">Dikembalikan oleh {current.source}</p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:p-5">
          <div className="flex flex-col md:flex-row">
            <ProgressStage
              icon={LuBuilding2}
              title="Desa"
              status={villageStatus}
              date={returned ? 'Menunggu dikirim ulang' : formatDate(proposal.submitted_at)}
            />
            <ProgressStage
              icon={LuLandmark}
              title="Kecamatan"
              status={kecamatanStatus}
              date={formatDate(proposal.kecamatan_verified_at)}
            />
            <ProgressStage
              icon={LuRadar}
              title="DPMD"
              status={dpmdStatus}
              date={formatDate(proposal.dpmd_verified_at)}
              last
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            {proposal.lokasi && (
              <span className="inline-flex items-center gap-1.5">
                <LuMapPin className="h-3.5 w-3.5" />
                {proposal.lokasi}
              </span>
            )}
            {proposal.volume && (
              <span className="inline-flex items-center gap-1.5">
                <LuCoins className="h-3.5 w-3.5" />
                Volume {proposal.volume}
              </span>
            )}
          </div>

          {notes.length > 0 && (
            <button
              type="button"
              onClick={() => setDetailsOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <LuCircleAlert className="h-4 w-4" />
              {notes.length} catatan verifikasi
              <LuChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {detailsOpen && notes.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {notes.map((note) => {
              const tone = {
                blue: 'border-slate-100 bg-slate-50 text-slate-900',
                violet: 'border-slate-100 bg-slate-50 text-slate-900',
                red: 'border-rose-100 bg-rose-50 text-rose-900',
              }[note.tone];
              return (
                <div key={`${note.source}-${note.text}`} className={`rounded-2xl border p-4 ${tone}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{note.source}</p>
                  <p className="mt-1.5 text-sm leading-relaxed">{note.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
};

const BankeuPerubahanTrackingTab = ({ tahun }) => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kegiatanFilter, setKegiatanFilter] = useState('all');

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/desa/bankeu-perubahan/proposals', { params: { tahun } });
      setProposals(res.data?.data || []);
    } catch (err) {
      console.error('Tracking fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tahun]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submittedProposals = useMemo(() => proposals.filter((proposal) => (
    proposal.submitted_to_kecamatan || isReturned(proposal)
  )), [proposals]);

  const kegiatanOptions = useMemo(() => {
    const options = new Map();
    submittedProposals.forEach((proposal) => {
      (proposal.kegiatan_list || []).forEach((item) => {
        if (item.id && item.nama_kegiatan) options.set(String(item.id), item.nama_kegiatan);
      });
    });
    return [...options.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id'));
  }, [submittedProposals]);

  const summary = useMemo(() => ({
    total: submittedProposals.length,
    anggaran: submittedProposals.reduce((sum, proposal) => sum + (Number(proposal.anggaran_usulan) || 0), 0),
    review: submittedProposals.filter((proposal) => !needsVillageAction(proposal) && proposal.dpmd_status !== 'approved').length,
    revision: submittedProposals.filter(needsVillageAction).length,
    approved: submittedProposals.filter((proposal) => proposal.dpmd_status === 'approved').length,
  }), [submittedProposals]);

  const filteredProposals = useMemo(() => {
    const query = search.trim().toLowerCase();
    return submittedProposals
      .filter((proposal) => {
        const current = getCurrentState(proposal);
        if (statusFilter === 'revision' && !needsVillageAction(proposal)) return false;
        if (statusFilter === 'approved' && proposal.dpmd_status !== 'approved') return false;
        if (statusFilter === 'process' && (needsVillageAction(proposal) || proposal.dpmd_status === 'approved')) return false;
        if (kegiatanFilter !== 'all') {
          const matches = (proposal.kegiatan_list || [])
            .some((item) => String(item.id) === String(kegiatanFilter));
          if (!matches) return false;
        }
        if (!query) return true;
        const searchable = [
          proposal.judul_proposal,
          proposal.nama_kegiatan_spesifik,
          proposal.lokasi,
          current.label,
          ...(proposal.kegiatan_list || []).map((item) => item.nama_kegiatan),
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(query);
      })
      .sort((a, b) => {
        const priority = (proposal) => {
          if (needsVillageAction(proposal)) return 0;
          if (proposal.dpmd_status !== 'approved') return 1;
          return 2;
        };
        return priority(a) - priority(b)
          || new Date(b.updated_at || b.submitted_at || 0) - new Date(a.updated_at || a.submitted_at || 0);
      });
  }, [submittedProposals, search, statusFilter, kegiatanFilter]);

  const hasFilters = search || statusFilter !== 'all' || kegiatanFilter !== 'all';
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setKegiatanFilter('all');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
        <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <LuRadar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Tracking TA {tahun}
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Pantau proposal sampai tuntas
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                Status terbaru dari Desa, Kecamatan, hingga DPMD tersaji dalam satu tampilan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchData({ silent: true })}
            disabled={refreshing}
            className="inline-flex w-fit flex-shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <LuRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Memperbarui' : 'Perbarui data'}
          </button>
        </div>
      </section>

      {submittedProposals.length > 0 && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            icon={LuCoins}
            label="Total Usulan"
            value={summary.total}
            detail={rupiah(summary.anggaran)}
            tone="slate"
          />
          <SummaryCard
            icon={LuRadar}
            label="Dalam Proses"
            value={summary.review}
            detail="Sedang diverifikasi"
            tone="blue"
          />
          <SummaryCard
            icon={LuTriangleAlert}
            label="Perlu Tindakan"
            value={summary.revision}
            detail="Harus diperbaiki Desa"
            tone="orange"
          />
          <SummaryCard
            icon={LuCheck}
            label="Disetujui"
            value={summary.approved}
            detail="Selesai di DPMD"
            tone="emerald"
          />
        </section>
      )}

      {submittedProposals.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <LuSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari proposal, kegiatan, atau lokasi..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex">
              <div className="relative">
                <LuFilter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-semibold text-slate-600 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 xl:w-44"
                >
                  <option value="all">Semua status</option>
                  <option value="process">Dalam proses</option>
                  <option value="revision">Perlu tindakan</option>
                  <option value="approved">Disetujui</option>
                </select>
                <LuChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="relative">
                <select
                  value={kegiatanFilter}
                  onChange={(event) => setKegiatanFilter(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm font-semibold text-slate-600 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 xl:w-64"
                >
                  <option value="all">Semua kegiatan</option>
                  {kegiatanOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <LuChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <LuX className="h-4 w-4" />
                Reset
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between px-1 text-xs text-slate-400">
            <span>Menampilkan {filteredProposals.length} dari {submittedProposals.length} proposal</span>
            <span className="hidden sm:inline">Proposal yang perlu tindakan ditampilkan paling atas</span>
          </div>
        </section>
      )}

      {submittedProposals.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <LuSend className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Belum ada proposal yang dilacak</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            Proposal akan muncul di sini setelah dikirim ke Kecamatan dari tab Pengajuan.
          </p>
        </section>
      ) : filteredProposals.length === 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <LuInfo className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 font-semibold text-slate-800">Proposal tidak ditemukan</h2>
          <p className="mt-1 text-sm text-slate-500">Ubah kata pencarian atau filter yang digunakan.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Hapus filter
          </button>
        </section>
      ) : (
        <section className="space-y-4">
          {filteredProposals.map((proposal) => (
            <ProposalTrackingCard key={proposal.id} proposal={proposal} />
          ))}
        </section>
      )}
    </div>
  );
};

export default BankeuPerubahanTrackingTab;
