import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import {
  LuEye, LuCheck, LuX, LuRefreshCw, LuSend, LuInfo,
  LuClipboardCheck, LuMessageSquare, LuChevronDown, LuChevronRight
} from 'react-icons/lu';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const STATUS_LABELS = {
  pending: 'Pending', in_review: 'Review',
  approved: 'Disetujui', rejected: 'Ditolak', revision: 'Revisi'
};
const STATUS_STYLES = {
  pending:   'bg-amber-100 text-amber-700 border-amber-300',
  in_review: 'bg-blue-100 text-blue-700 border-blue-300',
  approved:  'bg-emerald-100 text-emerald-700 border-emerald-300',
  rejected:  'bg-red-100 text-red-700 border-red-300',
  revision:  'bg-orange-100 text-orange-700 border-orange-300',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
    {STATUS_LABELS[status] || status}
  </span>
);

const KATEGORI_LABELS = {
  wajib: 'Wajib',
  pilihan_infrastruktur: 'Pilihan Infrastruktur',
  pilihan_non_infrastruktur: 'Pilihan Non-Infrastruktur',
};
const KATEGORI_BADGES = {
  wajib: 'bg-red-100 text-red-700 border-red-300',
  pilihan_infrastruktur: 'bg-orange-100 text-orange-700 border-orange-300',
  pilihan_non_infrastruktur: 'bg-blue-100 text-blue-700 border-blue-300',
};

const BankeuPerubahanVerificationPage = ({ tahun }) => {
  const [proposals, setProposals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [verifyModal, setVerifyModal] = useState(null); // { proposal, status }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [proposalsRes, statsRes] = await Promise.all([
        api.get('/kecamatan/bankeu-perubahan/proposals', { params: { tahun } }),
        api.get('/kecamatan/bankeu-perubahan/statistics', { params: { tahun } }),
      ]);
      setProposals(proposalsRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch (err) {
      console.error('Error fetch:', err);
      Swal.fire('Gagal', 'Tidak dapat mengambil data proposal perubahan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tahun]);

  // Group by desa
  const groupedByDesa = useMemo(() => {
    const groups = {};
    proposals.forEach(p => {
      const key = p.desa_id;
      if (!groups[key]) groups[key] = { desa_id: p.desa_id, desa_nama: p.desa_nama, items: [] };
      groups[key].items.push(p);
    });
    return Object.values(groups);
  }, [proposals]);

  const openVerify = (proposal, status) => {
    setVerifyModal({ proposal, status, catatan: '' });
  };

  const submitVerify = async () => {
    if (!verifyModal) return;
    const { proposal, status, catatan } = verifyModal;
    if ((status === 'rejected' || status === 'revision') && !catatan.trim()) {
      return Swal.fire('Validasi', 'Catatan wajib diisi untuk tolak/revisi', 'warning');
    }
    try {
      await api.patch(`/kecamatan/bankeu-perubahan/proposals/${proposal.id}/verify`, {
        status, catatan
      });
      Swal.fire('Berhasil', 'Verifikasi tersimpan', 'success');
      setVerifyModal(null);
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal verifikasi', 'error');
    }
  };

  const cancelApproval = async (proposalId) => {
    const result = await Swal.fire({
      title: 'Batalkan persetujuan?',
      text: 'Status proposal akan kembali ke pending',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, batalkan',
      cancelButtonText: 'Tidak',
    });
    if (!result.isConfirmed) return;
    try {
      await api.patch(`/kecamatan/bankeu-perubahan/proposals/${proposalId}/cancel-approval`);
      Swal.fire('Berhasil', 'Persetujuan dibatalkan', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal membatalkan', 'error');
    }
  };

  const submitToDpmd = async (desaId, desaNama) => {
    const desaProposals = proposals.filter(p =>
      p.desa_id === desaId &&
      p.kecamatan_status === 'approved' &&
      !p.submitted_to_dpmd
    );
    if (desaProposals.length === 0) {
      return Swal.fire('Info', 'Tidak ada proposal yang siap dikirim ke DPMD', 'info');
    }
    const result = await Swal.fire({
      title: `Kirim ${desaProposals.length} proposal ke DPMD?`,
      text: `Dari Desa: ${desaNama}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      confirmButtonText: 'Ya, kirim',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      await api.post(`/kecamatan/bankeu-perubahan/desa/${desaId}/submit-to-dpmd`, { tahun });
      Swal.fire('Berhasil', 'Proposal terkirim ke DPMD', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengirim', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <LuClipboardCheck className="w-5 h-5 text-orange-600" />
              Verifikasi Bankeu Perubahan TA {tahun}
            </h2>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg"
            >
              <LuRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatCard label="Total" value={stats.total || 0} color="bg-gray-50 text-gray-700" />
            <StatCard label="Pending" value={stats.pending || 0} color="bg-amber-50 text-amber-700" />
            <StatCard label="Approved" value={stats.approved || 0} color="bg-emerald-50 text-emerald-700" />
            <StatCard label="Rejected" value={stats.rejected || 0} color="bg-red-50 text-red-700" />
            <StatCard label="Revision" value={stats.revision || 0} color="bg-orange-50 text-orange-700" />
            <StatCard label="Ke DPMD" value={stats.submitted_to_dpmd || 0} color="bg-purple-50 text-purple-700" />
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            Memuat data...
          </div>
        ) : groupedByDesa.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <LuInfo className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">Belum ada proposal perubahan dari desa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByDesa.map(group => {
              const isExpanded = expanded[group.desa_id] !== false;
              const approvedCount = group.items.filter(p => p.kecamatan_status === 'approved' && !p.submitted_to_dpmd).length;
              return (
                <div key={group.desa_id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [group.desa_id]: isExpanded ? false : true }))}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <LuChevronDown className="w-5 h-5 text-gray-400" /> : <LuChevronRight className="w-5 h-5 text-gray-400" />}
                      <div className="text-left">
                        <div className="font-bold text-gray-800">Desa {group.desa_nama}</div>
                        <div className="text-xs text-gray-500">{group.items.length} proposal perubahan</div>
                      </div>
                    </div>
                    {approvedCount > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); submitToDpmd(group.desa_id, group.desa_nama); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg"
                      >
                        <LuSend className="w-3.5 h-3.5" /> Kirim {approvedCount} ke DPMD
                      </button>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                      {group.items.map(p => (
                        <ProposalRow
                          key={p.id}
                          proposal={p}
                          onApprove={() => openVerify(p, 'approved')}
                          onReject={() => openVerify(p, 'rejected')}
                          onRevision={() => openVerify(p, 'revision')}
                          onCancel={() => cancelApproval(p.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verify modal */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {verifyModal.status === 'approved' ? 'Setujui' : verifyModal.status === 'revision' ? 'Minta Revisi' : 'Tolak'} Proposal
              </h3>
              <p className="text-xs text-gray-500 mt-1">{verifyModal.proposal.judul_proposal}</p>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Catatan {verifyModal.status !== 'approved' && '*'}
              </label>
              <textarea
                value={verifyModal.catatan}
                onChange={e => setVerifyModal({ ...verifyModal, catatan: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={verifyModal.status === 'approved' ? 'Catatan (opsional)' : 'Tulis catatan untuk desa...'}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setVerifyModal(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100"
              >Batal</button>
              <button
                onClick={submitVerify}
                className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm ${
                  verifyModal.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  verifyModal.status === 'revision' ? 'bg-orange-600 hover:bg-orange-700' :
                  'bg-red-600 hover:bg-red-700'
                }`}
              >Simpan Verifikasi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }) => (
  <div className={`rounded-xl p-3 ${color}`}>
    <div className="text-xs font-semibold opacity-70">{label}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </div>
);

const ProposalRow = ({ proposal, onApprove, onReject, onRevision, onCancel }) => {
  const submittedToDpmd = proposal.submitted_to_dpmd;
  const kecApproved = proposal.kecamatan_status === 'approved';
  const isPending = proposal.kecamatan_status === 'pending';

  return (
    <div className="px-5 py-4">
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${KATEGORI_BADGES[proposal.jenis_kegiatan] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
              {KATEGORI_LABELS[proposal.jenis_kegiatan] || proposal.jenis_kegiatan}
            </span>
            <StatusBadge status={proposal.kecamatan_status} />
            {submittedToDpmd && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border bg-purple-100 text-purple-700 border-purple-300">
                Dikirim ke DPMD: {STATUS_LABELS[proposal.dpmd_status] || proposal.dpmd_status}
              </span>
            )}
          </div>
          <h4 className="font-bold text-gray-800">{proposal.judul_proposal}</h4>
          {proposal.nama_kegiatan_spesifik && (
            <p className="text-sm text-gray-600 mt-0.5">{proposal.nama_kegiatan_spesifik}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs text-gray-600">
            {proposal.volume && <div><span className="font-semibold">Vol:</span> {proposal.volume}</div>}
            {proposal.lokasi && <div><span className="font-semibold">Lokasi:</span> {proposal.lokasi}</div>}
            {proposal.anggaran_usulan && (
              <div className="md:col-span-1">
                <span className="font-semibold">Anggaran:</span> Rp {Number(proposal.anggaran_usulan).toLocaleString('id-ID')}
              </div>
            )}
          </div>
          {proposal.kecamatan_catatan && (
            <div className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-800">
              <strong>Catatan Anda:</strong> {proposal.kecamatan_catatan}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 flex-shrink-0">
          {proposal.file_proposal && (
            <a
              href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/${proposal.file_proposal}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
            >
              <LuEye className="w-3.5 h-3.5" /> File
            </a>
          )}
          {!submittedToDpmd && isPending && (
            <>
              <button onClick={onApprove} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                <LuCheck className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={onRevision} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg">
                <LuMessageSquare className="w-3.5 h-3.5" /> Revisi
              </button>
              <button onClick={onReject} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg">
                <LuX className="w-3.5 h-3.5" /> Tolak
              </button>
            </>
          )}
          {!submittedToDpmd && kecApproved && (
            <button onClick={onCancel} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">
              <LuRefreshCw className="w-3.5 h-3.5" /> Batalkan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankeuPerubahanVerificationPage;
