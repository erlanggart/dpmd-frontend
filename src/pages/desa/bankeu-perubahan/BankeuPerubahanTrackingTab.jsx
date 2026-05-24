import React, { useEffect, useState } from 'react';
import api from '../../../api';
import { LuClock, LuCheck, LuX, LuRefreshCw, LuRadar, LuArrowRight, LuInfo } from 'react-icons/lu';

const STATUS_STYLES = {
  pending:   { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: 'Pending' },
  in_review: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: 'Dalam Review' },
  approved:  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: 'Disetujui' },
  rejected:  { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Ditolak' },
  revision:  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', label: 'Revisi' },
};

const StageBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
};

const BankeuPerubahanTrackingTab = ({ tahun }) => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/desa/bankeu-perubahan/proposals', { params: { tahun } });
      setProposals(res.data?.data || []);
    } catch (err) {
      console.error('Tracking fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tahun]);

  const submittedProposals = proposals.filter(p => p.submitted_to_kecamatan);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
        Memuat data tracking...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <LuRadar className="w-5 h-5 text-orange-600" />
              Tracking Proposal Perubahan TA {tahun}
            </h3>
            <p className="text-sm text-gray-500 mt-1">Pantau alur verifikasi Desa → Kecamatan → DPMD</p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg"
          >
            <LuRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {submittedProposals.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <LuInfo className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">Belum ada proposal yang dikirim</p>
          <p className="text-sm text-gray-400 mt-1">Kirim proposal ke Kecamatan dari tab Pengajuan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submittedProposals.map(p => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h4 className="font-bold text-gray-800">{p.judul_proposal}</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Dikirim: {new Date(p.submitted_at).toLocaleString('id-ID')}
              </p>

              {/* Flow visualization */}
              <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
                {/* Stage 1: Desa */}
                <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-emerald-700 uppercase">Desa</div>
                      <div className="text-sm font-bold text-emerald-800 mt-0.5">Terkirim</div>
                    </div>
                    <LuCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>

                <LuArrowRight className="hidden md:block w-5 h-5 text-gray-400 flex-shrink-0" />

                {/* Stage 2: Kecamatan */}
                <div className={`flex-1 border rounded-xl p-3 ${
                  p.kecamatan_status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                  ['rejected','revision'].includes(p.kecamatan_status) ? 'bg-red-50 border-red-200' :
                  'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-gray-700 uppercase">Kecamatan</div>
                      <StageBadge status={p.kecamatan_status} />
                    </div>
                  </div>
                  {p.kecamatan_verified_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(p.kecamatan_verified_at).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>

                <LuArrowRight className="hidden md:block w-5 h-5 text-gray-400 flex-shrink-0" />

                {/* Stage 3: DPMD */}
                <div className={`flex-1 border rounded-xl p-3 ${
                  !p.submitted_to_dpmd ? 'bg-gray-50 border-gray-200' :
                  p.dpmd_status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                  ['rejected','revision'].includes(p.dpmd_status) ? 'bg-red-50 border-red-200' :
                  'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-gray-700 uppercase">DPMD</div>
                      {p.submitted_to_dpmd ? (
                        <StageBadge status={p.dpmd_status} />
                      ) : (
                        <div className="text-sm text-gray-500 mt-0.5">Belum diterima</div>
                      )}
                    </div>
                  </div>
                  {p.dpmd_verified_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(p.dpmd_verified_at).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              </div>

              {/* Catatan */}
              {(p.kecamatan_catatan || p.dpmd_catatan) && (
                <div className="mt-3 space-y-1">
                  {p.kecamatan_catatan && (
                    <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-800">
                      <strong>Catatan Kecamatan:</strong> {p.kecamatan_catatan}
                    </div>
                  )}
                  {p.dpmd_catatan && (
                    <div className="text-xs bg-purple-50 border border-purple-200 rounded p-2 text-purple-800">
                      <strong>Catatan DPMD:</strong> {p.dpmd_catatan}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BankeuPerubahanTrackingTab;
