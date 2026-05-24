import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../../api';
import Swal from 'sweetalert2';
import { Eye, Check, X, RefreshCw, Filter, MessageSquare, Info } from 'lucide-react';

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

const DpmdBankeuPerubahanVerificationPage = ({ tahun }) => {
  const [proposals, setProposals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterKecamatan, setFilterKecamatan] = useState('all');
  const [verifyModal, setVerifyModal] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [proposalsRes, statsRes] = await Promise.all([
        api.get('/dpmd/bankeu-perubahan/proposals', { params: { tahun } }),
        api.get('/dpmd/bankeu-perubahan/statistics', { params: { tahun } }),
      ]);
      setProposals(proposalsRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch (err) {
      console.error('Fetch error:', err);
      Swal.fire('Gagal', 'Tidak dapat mengambil data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tahun]);

  const kecamatanOptions = useMemo(() => {
    const set = new Map();
    proposals.forEach(p => { if (p.desa_kecamatan_id) set.set(p.desa_kecamatan_id, p.kecamatan_nama); });
    return Array.from(set.entries()).map(([id, nama]) => ({ id, nama }));
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      if (filterStatus !== 'all' && p.dpmd_status !== filterStatus) return false;
      if (filterKecamatan !== 'all' && String(p.desa_kecamatan_id) !== String(filterKecamatan)) return false;
      return true;
    });
  }, [proposals, filterStatus, filterKecamatan]);

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
      await api.patch(`/dpmd/bankeu-perubahan/proposals/${proposal.id}/verify`, { status, catatan });
      Swal.fire('Berhasil', 'Verifikasi tersimpan', 'success');
      setVerifyModal(null);
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal verifikasi', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Statistik DPMD - Bankeu Perubahan TA {tahun}</h2>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Total Masuk" value={stats.total || 0} color="bg-gray-50 text-gray-700" />
            <StatCard label="Pending" value={stats.pending || 0} color="bg-amber-50 text-amber-700" />
            <StatCard label="Approved" value={stats.approved || 0} color="bg-emerald-50 text-emerald-700" />
            <StatCard label="Rejected" value={stats.rejected || 0} color="bg-red-50 text-red-700" />
            <StatCard label="Revision" value={stats.revision || 0} color="bg-orange-50 text-orange-700" />
          </div>
          {stats.total_anggaran && (
            <div className="mt-3 text-sm text-gray-600">
              Total Anggaran: <strong className="text-orange-700">Rp {Number(stats.total_anggaran).toLocaleString('id-ID')}</strong>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Filter className="w-4 h-4" /> Filter:
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="revision">Revision</option>
          </select>
          <select
            value={filterKecamatan}
            onChange={e => setFilterKecamatan(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Kecamatan</option>
            {kecamatanOptions.map(k => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-gray-500">
            Menampilkan {filteredProposals.length} dari {proposals.length} proposal
          </span>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            Memuat data...
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Info className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">Tidak ada proposal yang sesuai filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProposals.map(p => (
              <ProposalCard
                key={p.id}
                proposal={p}
                onApprove={() => openVerify(p, 'approved')}
                onReject={() => openVerify(p, 'rejected')}
                onRevision={() => openVerify(p, 'revision')}
              />
            ))}
          </div>
        )}
      </div>

      {verifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {verifyModal.status === 'approved' ? 'Setujui (Final)' : verifyModal.status === 'revision' ? 'Minta Revisi' : 'Tolak'} - DPMD
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
                placeholder={verifyModal.status === 'approved' ? 'Catatan (opsional)' : 'Tulis catatan untuk kecamatan...'}
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
              >Simpan</button>
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

const ProposalCard = ({ proposal, onApprove, onReject, onRevision }) => {
  const isPending = proposal.dpmd_status === 'pending';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${KATEGORI_BADGES[proposal.jenis_kegiatan] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
              {KATEGORI_LABELS[proposal.jenis_kegiatan] || proposal.jenis_kegiatan}
            </span>
            <StatusBadge status={proposal.dpmd_status} />
          </div>
          <h4 className="font-bold text-gray-800">{proposal.judul_proposal}</h4>
          <div className="text-xs text-gray-500 mt-0.5">
            Desa <strong>{proposal.desa_nama}</strong> | Kecamatan <strong>{proposal.kecamatan_nama}</strong>
          </div>
          {proposal.nama_kegiatan_spesifik && (
            <p className="text-sm text-gray-600 mt-1">{proposal.nama_kegiatan_spesifik}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs text-gray-600">
            {proposal.volume && <div><span className="font-semibold">Vol:</span> {proposal.volume}</div>}
            {proposal.lokasi && <div><span className="font-semibold">Lokasi:</span> {proposal.lokasi}</div>}
            {proposal.anggaran_usulan && (
              <div><span className="font-semibold">Anggaran:</span> Rp {Number(proposal.anggaran_usulan).toLocaleString('id-ID')}</div>
            )}
          </div>
          {proposal.kecamatan_catatan && (
            <div className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-800">
              <strong>Catatan Kecamatan:</strong> {proposal.kecamatan_catatan}
            </div>
          )}
          {proposal.dpmd_catatan && (
            <div className="mt-2 text-xs bg-purple-50 border border-purple-200 rounded p-2 text-purple-800">
              <strong>Catatan DPMD:</strong> {proposal.dpmd_catatan}
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
              <Eye className="w-3.5 h-3.5" /> File
            </a>
          )}
          {isPending && (
            <>
              <button onClick={onApprove} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={onRevision} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg">
                <MessageSquare className="w-3.5 h-3.5" /> Revisi
              </button>
              <button onClick={onReject} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg">
                <X className="w-3.5 h-3.5" /> Tolak
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DpmdBankeuPerubahanVerificationPage;
