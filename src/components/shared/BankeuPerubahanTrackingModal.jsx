import {
  LuX, LuRoute, LuFilePlus, LuSend, LuStamp, LuClipboardCheck, LuCheck, LuClock,
} from 'react-icons/lu';

/**
 * Modal "Lacak Status" Bankeu Perubahan — timeline lengkap perjalanan proposal
 * dari Desa → Kecamatan → DPMD. Read-only, self-contained: seluruh data diambil
 * dari objek `proposal` yang sudah dimuat halaman (tidak ada fetch tambahan).
 *
 * Props:
 *  - proposal: objek proposal (dari endpoint daftar DPMD/Kecamatan)
 *  - onClose: () => void
 */
const STATUS_META = {
  pending:  { label: 'Menunggu', dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700 border-amber-300' },
  approved: { label: 'Disetujui', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  rejected: { label: 'Ditolak',  dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700 border-red-300' },
  revision: { label: 'Revisi',   dot: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-700 border-orange-300' },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

export default function BankeuPerubahanTrackingModal({ proposal, onClose }) {
  if (!proposal) return null;

  const kecStatus = proposal.kecamatan_status || 'pending';
  const dpmdStatus = proposal.dpmd_status || 'pending';
  const desaLabel = proposal.desa_nama ? `Desa ${proposal.desa_nama}` : 'Desa';
  const kecLabel = proposal.kecamatan_nama ? `Kec. ${proposal.kecamatan_nama}` : 'Kecamatan';

  const steps = [
    {
      key: 'created',
      title: 'Proposal dibuat',
      actor: desaLabel,
      icon: LuFilePlus,
      done: !!proposal.created_at,
      at: fmtDate(proposal.created_at),
    },
    {
      key: 'to_kec',
      title: 'Dikirim ke Kecamatan',
      actor: desaLabel,
      icon: LuSend,
      done: !!proposal.submitted_to_kecamatan,
      at: fmtDate(proposal.submitted_at),
    },
    {
      key: 'verif_kec',
      title: 'Verifikasi Kecamatan',
      actor: kecLabel,
      icon: LuStamp,
      done: kecStatus !== 'pending',
      status: kecStatus,
      at: fmtDate(proposal.kecamatan_verified_at),
      by: proposal.kecamatan_verified_by_name,
      catatan: proposal.kecamatan_catatan,
    },
    {
      key: 'to_dpmd',
      title: 'Diteruskan ke DPMD',
      actor: kecLabel,
      icon: LuSend,
      done: !!proposal.submitted_to_dpmd,
      at: fmtDate(proposal.submitted_to_dpmd_at),
    },
    {
      key: 'verif_dpmd',
      title: 'Keputusan DPMD',
      actor: 'DPMD',
      icon: LuClipboardCheck,
      done: dpmdStatus !== 'pending',
      status: dpmdStatus,
      at: fmtDate(proposal.dpmd_verified_at),
      by: proposal.dpmd_verified_by_name,
      catatan: proposal.dpmd_catatan,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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

        <div className="flex-1 overflow-auto p-5">
          <ol className="relative">
            {steps.map((s, idx) => {
              const isLast = idx === steps.length - 1;
              const meta = s.status ? STATUS_META[s.status] : null;
              const dotClass = meta ? meta.dot : (s.done ? 'bg-emerald-500' : 'bg-gray-300');
              const Icon = s.done ? (s.status ? s.icon : LuCheck) : LuClock;
              return (
                <li key={s.key} className="relative pl-10 pb-6 last:pb-0">
                  {/* Garis penghubung */}
                  {!isLast && (
                    <span className={`absolute left-[14px] top-7 bottom-0 w-0.5 ${s.done ? 'bg-emerald-200' : 'bg-gray-200'}`} />
                  )}
                  {/* Titik */}
                  <span className={`absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center text-white ${dotClass} shadow-sm`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>

                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`text-sm font-bold ${s.done ? 'text-gray-800' : 'text-gray-400'}`}>{s.title}</span>
                    {meta && (
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${meta.badge}`}>
                        {meta.label}
                      </span>
                    )}
                    {!s.done && !meta && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border bg-gray-100 text-gray-500 border-gray-300">
                        Belum
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{s.actor}</p>
                  {s.at ? (
                    <p className="text-[11px] text-gray-400">{s.at}{s.by ? ` · oleh ${s.by}` : ''}</p>
                  ) : (
                    s.done ? null : <p className="text-[11px] text-gray-300 italic">menunggu</p>
                  )}
                  {s.catatan && (
                    <div className="mt-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-700 whitespace-pre-wrap">
                      {s.catatan}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
