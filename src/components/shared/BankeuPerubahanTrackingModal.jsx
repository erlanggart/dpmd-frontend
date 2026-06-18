import {
  LuX, LuRoute, LuHouse, LuBuilding2, LuShield,
  LuCircleCheck, LuCircleX, LuRefreshCw, LuClock,
} from 'react-icons/lu';

/**
 * Modal "Lacak Status" Bankeu Perubahan — stepper horizontal modern (mengikuti
 * design tracking Bankeu Reguler) untuk alur Desa → Kecamatan → DPMD. Read-only,
 * self-contained: seluruh data diambil dari objek `proposal` yang sudah dimuat
 * halaman (tidak ada fetch tambahan).
 *
 * Props:
 *  - proposal: objek proposal (dari endpoint daftar DPMD/Kecamatan)
 *  - onClose: () => void
 */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
const fmtShort = (d) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : null;

// Skema warna node sesuai state (selaras dengan stepper Bankeu Reguler).
const NODE_STYLE = {
  done:     { circle: 'bg-emerald-500 text-white', Icon: LuCircleCheck },
  rejected: { circle: 'bg-rose-500 text-white',    Icon: LuCircleX },
  revision: { circle: 'bg-orange-500 text-white',  Icon: LuRefreshCw },
  active:   { circle: 'bg-blue-500 text-white animate-pulse', Icon: null }, // pakai icon tahap
  pending:  { circle: 'bg-slate-200 text-slate-500', Icon: null },          // pakai icon tahap
};

export default function BankeuPerubahanTrackingModal({ proposal, onClose }) {
  if (!proposal) return null;

  const kecStatus = proposal.kecamatan_status || 'pending';
  const dpmdStatus = proposal.dpmd_status || 'pending';
  const submittedKec = !!proposal.submitted_to_kecamatan;
  const submittedDpmd = !!proposal.submitted_to_dpmd;

  const desaLabel = proposal.desa_nama ? `Desa ${proposal.desa_nama}` : 'Desa';
  const kecLabel = proposal.kecamatan_nama ? `Kec. ${proposal.kecamatan_nama}` : 'Kecamatan';

  // State tiap node stepper.
  const desaState = 'done';
  const kecState =
    kecStatus === 'approved' ? 'done' :
    kecStatus === 'rejected' ? 'rejected' :
    kecStatus === 'revision' ? 'revision' :
    submittedKec ? 'active' : 'pending';
  const dpmdState =
    dpmdStatus === 'rejected' ? 'rejected' :
    dpmdStatus === 'revision' ? 'revision' :
    submittedDpmd ? 'done' : 'pending';

  const nodes = [
    {
      key: 'desa', label: 'Desa', TahapIcon: LuHouse, state: desaState,
      date: fmtShort(proposal.submitted_at || proposal.created_at) || '-',
    },
    {
      key: 'kec', label: 'Kecamatan', TahapIcon: LuBuilding2, state: kecState,
      date: fmtShort(proposal.kecamatan_verified_at) || (submittedKec ? 'Menunggu' : '-'),
    },
    {
      key: 'dpmd', label: 'DPMD', TahapIcon: LuShield, state: dpmdState,
      date: fmtShort(proposal.dpmd_verified_at) || fmtShort(proposal.submitted_to_dpmd_at) || (submittedDpmd ? 'Selesai' : '-'),
    },
  ];

  // Garis penghubung: hijau bila tahap berikutnya sudah dijalani.
  const lineKec = submittedKec;     // Desa → Kecamatan
  const lineDpmd = submittedDpmd;   // Kecamatan → DPMD
  const lines = [lineKec, lineDpmd];

  // Posisi/keterangan ringkas saat ini.
  const posisi =
    dpmdState === 'rejected' ? { text: 'Ditolak DPMD', cls: 'bg-rose-100 text-rose-700 border-rose-300' } :
    dpmdState === 'revision' ? { text: 'Revisi BA/SP (DPMD)', cls: 'bg-orange-100 text-orange-700 border-orange-300' } :
    submittedDpmd ? { text: 'Diterima DPMD', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' } :
    kecState === 'rejected' ? { text: 'Ditolak Kecamatan', cls: 'bg-rose-100 text-rose-700 border-rose-300' } :
    kecState === 'revision' ? { text: 'Revisi Kecamatan', cls: 'bg-orange-100 text-orange-700 border-orange-300' } :
    kecStatus === 'approved' ? { text: 'Disetujui Kec. (belum diteruskan)', cls: 'bg-cyan-100 text-cyan-700 border-cyan-300' } :
    submittedKec ? { text: 'Menunggu Kecamatan', cls: 'bg-amber-100 text-amber-700 border-amber-300' } :
    { text: 'Draft di Desa', cls: 'bg-slate-100 text-slate-600 border-slate-300' };

  // Detail tiap tahap (tanggal lengkap, verifikator, catatan).
  const details = [
    { label: 'Proposal dibuat', actor: desaLabel, at: fmtDate(proposal.created_at) },
    { label: 'Dikirim ke Kecamatan', actor: desaLabel, at: fmtDate(proposal.submitted_at), pending: !submittedKec },
    {
      label: 'Verifikasi Kecamatan', actor: kecLabel,
      at: fmtDate(proposal.kecamatan_verified_at), by: proposal.kecamatan_verified_by_name,
      catatan: proposal.kecamatan_catatan, pending: kecStatus === 'pending',
    },
    { label: 'Diteruskan ke DPMD', actor: kecLabel, at: fmtDate(proposal.submitted_to_dpmd_at), pending: !submittedDpmd },
    {
      label: 'Keputusan DPMD', actor: 'DPMD',
      at: fmtDate(proposal.dpmd_verified_at), by: proposal.dpmd_verified_by_name,
      catatan: proposal.dpmd_catatan, pending: dpmdStatus === 'pending' && !submittedDpmd,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <LuRoute className="w-4 h-4 text-orange-600" /> Lacak Status Proposal
            </h3>
            {proposal.judul_proposal && <p className="text-xs text-gray-500 truncate">{proposal.judul_proposal}</p>}
            <p className="text-[11px] text-gray-400 mt-0.5">{desaLabel} · {kecLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><LuX className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Stepper horizontal modern */}
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="overflow-x-auto">
              <div className="flex items-start min-w-[300px]">
                {nodes.map((n, i) => {
                  const style = NODE_STYLE[n.state];
                  const Icon = style.Icon || n.TahapIcon;
                  return (
                    <div key={n.key} className="contents">
                      {/* Node */}
                      <div className="flex flex-col items-center z-10 w-16 shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${style.circle}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs mt-1.5 font-semibold text-gray-700">{n.label}</span>
                        <span className="text-[10px] text-gray-400">{n.date}</span>
                      </div>
                      {/* Garis penghubung */}
                      {i < nodes.length - 1 && (
                        <div className={`flex-1 h-1 mt-5 mx-1 rounded-full ${lines[i] ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${posisi.cls}`}>
                <LuClock className="w-3.5 h-3.5" /> {posisi.text}
              </span>
            </div>
          </div>

          {/* Detail per tahap */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Riwayat Tahapan</p>
            {details.map((d, i) => (
              <div key={i} className={`rounded-xl border p-3 ${d.pending ? 'border-gray-100 bg-gray-50/60' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${d.pending ? 'text-gray-400' : 'text-gray-800'}`}>{d.label}</span>
                  {d.at ? (
                    <span className="text-[11px] text-gray-400 shrink-0">{d.at}</span>
                  ) : (
                    <span className="text-[11px] text-gray-300 italic shrink-0">menunggu</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">{d.actor}{d.by ? ` · oleh ${d.by}` : ''}</p>
                {d.catatan && (
                  <div className="mt-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800 whitespace-pre-wrap">
                    {d.catatan}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
