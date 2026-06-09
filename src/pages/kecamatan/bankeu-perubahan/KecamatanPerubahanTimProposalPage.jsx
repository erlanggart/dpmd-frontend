import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../api';
import Swal from 'sweetalert2';
import SignatureCanvas from 'react-signature-canvas';
import {
  LuUser, LuUserCheck, LuUsers, LuSave, LuTrash2, LuCheck, LuX, LuRotateCcw,
  LuArrowLeft, LuPlus, LuPenTool, LuInfo, LuBadgeCheck, LuFileText, LuShield,
  LuChevronDown, LuClock, LuClipboardList, LuDownload, LuEye
} from 'react-icons/lu';
import BankeuPerubahanQuestionnaireForm from '../../../components/BankeuPerubahanQuestionnaireForm';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001';
const ttdUrl = (file) => `${imageBaseUrl}/storage/uploads/signatures/${file}`;

/**
 * Tim Verifikasi per-proposal — Bankeu Perubahan
 * Mirror flow KecamatanTimVerifikasiPage (bankeu reguler), endpoint perubahan.
 * Ketua & Sekretaris dipakai bersama; Anggota berbeda tiap proposal.
 */
const KecamatanPerubahanTimProposalPage = () => {
  const { desaId } = useParams();
  const [searchParams] = useSearchParams();
  const proposalId = searchParams.get('proposalId');
  const tahun = parseInt(searchParams.get('tahun')) || 2026;
  const navigate = useNavigate();

  const [desa, setDesa] = useState(null);
  const [kecamatanId, setKecamatanId] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [timMembers, setTimMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('ketua');
  const [loading, setLoading] = useState(true);

  const [configForm, setConfigForm] = useState({ nama: '', nip: '', jabatan: '' });

  const signatureRef = useRef(null);
  const [signatureData, setSignatureData] = useState(null);
  const [hasSignature, setHasSignature] = useState(false);

  const [isDataDiriOpen, setIsDataDiriOpen] = useState(true);
  const [isTTDOpen, setIsTTDOpen] = useState(false);
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);

  const [previousAnggota, setPreviousAnggota] = useState([]);
  const [showAnggotaPicker, setShowAnggotaPicker] = useState(false);
  const [sourceTtdPath, setSourceTtdPath] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [desaId, proposalId]);
  useEffect(() => { setIsQuestionnaireOpen(false); }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [desaRes, proposalsRes] = await Promise.all([
        api.get(`/desas/${desaId}`),
        api.get('/kecamatan/bankeu-perubahan/proposals', { params: { tahun } }),
      ]);
      const desaData = desaRes.data.data;
      setDesa(desaData);
      setKecamatanId(desaData.kecamatan_id);

      const allProposals = proposalsRes.data?.data || [];
      const target = allProposals.find(p => String(p.id) === String(proposalId));
      setProposal(target || null);

      if (desaData.kecamatan_id) {
        await fetchPreviousAnggota(desaData.kecamatan_id);
        await fetchTimMembers(desaData.kecamatan_id);
      }
    } catch (error) {
      console.error('Error fetching tim data:', error);
      Swal.fire('Gagal', 'Gagal memuat data tim verifikasi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousAnggota = async (kecId) => {
    try {
      const res = await api.get(`/kecamatan/bankeu-perubahan/tim-config/${kecId}/anggota-list`);
      setPreviousAnggota(res.data?.data || []);
    } catch (err) {
      console.error('Error previous anggota:', err);
    }
  };

  const fetchTimMembers = async (kecId, targetPosisi = null, preserveSignature = false) => {
    try {
      const res = await api.get(`/kecamatan/bankeu-perubahan/tim-config/${kecId}`, { params: { proposalId } });
      const members = res.data?.data || [];
      const hasKetua = members.find(m => m.posisi === 'ketua');
      const hasSekretaris = members.find(m => m.posisi === 'sekretaris');
      const allMembers = [
        hasKetua || { posisi: 'ketua', nama: '', nip: '', jabatan: '', ttd_path: null, proposal_id: null },
        hasSekretaris || { posisi: 'sekretaris', nama: '', nip: '', jabatan: '', ttd_path: null, proposal_id: null },
        ...members.filter(m => m.posisi.startsWith('anggota_')),
      ];
      setTimMembers(allMembers);

      const posisiToLoad = targetPosisi || activeTab;
      const active = allMembers.find(m => m.posisi === posisiToLoad);
      if (active) loadMemberConfig(active, preserveSignature);
    } catch (error) {
      console.error('Error fetching tim members:', error);
    }
  };

  const loadMemberConfig = (member, preserveSignature = false) => {
    if (!member) return;
    setConfigForm({ nama: member.nama || '', nip: member.nip || '', jabatan: member.jabatan || '' });
    if (member.ttd_path) {
      setSignatureData(ttdUrl(member.ttd_path));
      setHasSignature(true);
    } else if (!preserveSignature) {
      setSignatureData(null);
      setHasSignature(false);
    }
  };

  const handleTabChange = (posisi) => {
    setActiveTab(posisi);
    setSourceTtdPath(null);
    const member = timMembers.find(m => m.posisi === posisi);
    if (member) {
      loadMemberConfig(member);
    } else {
      setConfigForm({ nama: '', nip: '', jabatan: '' });
      setSignatureData(null);
      setHasSignature(false);
    }
    setIsDataDiriOpen(true);
    setIsTTDOpen(false);
  };

  const [importing, setImporting] = useState(false);

  const handleImportFromReguler = async () => {
    const r = await Swal.fire({
      title: 'Impor Tim dari Bankeu Reguler?',
      html: 'Ketua &amp; Sekretaris (beserta tanda tangan) akan disalin dari Tim Verifikasi <b>Bankeu reguler</b> kecamatan ini. ' +
            'Anggota yang terdaftar di reguler juga ditambahkan ke proposal ini (yang belum ada).' +
            '<br/><br/><span style="color:#ea580c;font-weight:600">Data Ketua/Sekretaris yang sudah ada akan ditimpa.</span>',
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#ea580c', confirmButtonText: 'Ya, impor', cancelButtonText: 'Batal',
    });
    if (!r.isConfirmed) return;
    setImporting(true);
    try {
      const res = await api.post(`/kecamatan/bankeu-perubahan/tim-config/${kecamatanId}/import-from-reguler`, { proposalId });
      Swal.fire('Berhasil', res.data?.message || 'Tim disalin dari Bankeu reguler', 'success');
      await fetchTimMembers(kecamatanId, activeTab);
      fetchPreviousAnggota(kecamatanId);
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengimpor tim dari Bankeu reguler', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleAddAnggota = () => {
    if (previousAnggota.length > 0) { setShowAnggotaPicker(true); return; }
    addBlankAnggota();
  };

  const addBlankAnggota = () => {
    const count = timMembers.filter(m => m.posisi.startsWith('anggota_')).length;
    const newPosisi = `anggota_${count + 1}`;
    const newMember = { posisi: newPosisi, nama: '', nip: '', jabatan: '', ttd_path: null, proposal_id: proposalId };
    setTimMembers([...timMembers, newMember]);
    setActiveTab(newPosisi);
    loadMemberConfig(newMember);
    setIsDataDiriOpen(true);
    setShowAnggotaPicker(false);
    setSourceTtdPath(null);
  };

  const selectPreviousAnggota = async (anggota) => {
    const count = timMembers.filter(m => m.posisi.startsWith('anggota_')).length;
    const newPosisi = `anggota_${count + 1}`;
    setActiveTab(newPosisi);
    setConfigForm({ nama: anggota.nama, nip: anggota.nip || '', jabatan: anggota.jabatan || '' });
    setShowAnggotaPicker(false);
    setIsDataDiriOpen(true);

    if (anggota.ttd_path) {
      setSignatureData(ttdUrl(anggota.ttd_path));
      setHasSignature(true);
      setIsTTDOpen(true);
    } else {
      setSignatureData(null);
      setHasSignature(false);
    }

    try {
      await api.post(`/kecamatan/bankeu-perubahan/tim-config/${kecamatanId}/${newPosisi}`, {
        nama: anggota.nama,
        nip: anggota.nip || '',
        jabatan: anggota.jabatan || '',
        proposalId,
        ...(anggota.ttd_path ? { sourceTtdPath: anggota.ttd_path } : {}),
      });
      await fetchTimMembers(kecamatanId, newPosisi);
      fetchPreviousAnggota(kecamatanId);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Anggota ${count + 1} ditambahkan`, showConfirmButton: false, timer: 1800 });
    } catch (err) {
      setTimMembers(prev => [...prev, { posisi: newPosisi, nama: anggota.nama, nip: anggota.nip, jabatan: anggota.jabatan, ttd_path: anggota.ttd_path, proposal_id: proposalId }]);
      setSourceTtdPath(anggota.ttd_path || null);
    }
  };

  const handleDeleteAnggota = async (posisi) => {
    if (posisi === 'ketua' || posisi === 'sekretaris') {
      return Swal.fire('Tidak Bisa', 'Ketua dan Sekretaris tidak bisa dihapus', 'error');
    }
    const result = await Swal.fire({
      title: 'Hapus Anggota?', text: 'Data anggota ini akan dihapus untuk proposal ini', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      const member = timMembers.find(m => m.posisi === posisi);
      if (member && member.id) {
        await api.delete(`/kecamatan/bankeu-perubahan/tim-config/${kecamatanId}/${posisi}`, { params: { proposalId } });
      }
      setActiveTab('ketua');
      await fetchTimMembers(kecamatanId, 'ketua');
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Anggota dihapus', showConfirmButton: false, timer: 1800 });
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus anggota', 'error');
    }
  };

  const handleSaveConfig = async () => {
    if (!configForm.nama || !configForm.jabatan) {
      return Swal.fire('Belum Lengkap', 'Mohon lengkapi nama dan jabatan', 'warning');
    }
    const isAnggota = activeTab.startsWith('anggota_');
    try {
      await api.post(`/kecamatan/bankeu-perubahan/tim-config/${kecamatanId}/${activeTab}`, {
        ...configForm,
        ...(isAnggota ? { proposalId } : {}),
        ...(isAnggota && sourceTtdPath ? { sourceTtdPath } : {}),
      });
      if (sourceTtdPath) setSourceTtdPath(null);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Konfigurasi disimpan', showConfirmButton: false, timer: 1800 });
      await fetchTimMembers(kecamatanId, activeTab, true);
      fetchPreviousAnggota(kecamatanId);
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan konfigurasi', 'error');
    }
  };

  const handleSaveSignature = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      return Swal.fire('Kosong', 'Mohon buat tanda tangan terlebih dahulu', 'warning');
    }
    const isAnggota = activeTab.startsWith('anggota_');
    const activeMember = timMembers.find(m => m.posisi === activeTab);
    if (!activeMember?.nama) {
      return Swal.fire('Simpan Data Dulu', 'Simpan data diri anggota terlebih dahulu sebelum tanda tangan', 'warning');
    }
    try {
      const dataUrl = signatureRef.current.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append('file', blob, `ttd_${activeTab}.png`);
      if (isAnggota) fd.append('proposalId', proposalId);
      await api.post(`/kecamatan/bankeu-perubahan/tim-config/${kecamatanId}/${activeTab}/upload-ttd`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tanda tangan disimpan', showConfirmButton: false, timer: 1800 });
      await fetchTimMembers(kecamatanId, activeTab);
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan tanda tangan', 'error');
    }
  };

  const handleDeleteSignature = async () => {
    const result = await Swal.fire({
      title: 'Hapus Tanda Tangan?', icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#d33', confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    const isAnggota = activeTab.startsWith('anggota_');
    try {
      await api.delete(`/kecamatan/bankeu-perubahan/tim-config/${kecamatanId}/${activeTab}/ttd`, {
        params: isAnggota ? { proposalId } : {},
      });
      setSignatureData(null);
      setHasSignature(false);
      await fetchTimMembers(kecamatanId, activeTab);
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus tanda tangan', 'error');
    }
  };

  const getPosisiLabel = (posisi) => {
    if (posisi === 'ketua') return 'Ketua Tim Verifikasi';
    if (posisi === 'sekretaris') return 'Sekretaris Tim Verifikasi';
    const m = posisi.match(/anggota_(\d+)/);
    return m ? `Anggota ${m[1]}` : posisi;
  };
  const getPosisiIcon = (posisi) => posisi === 'ketua' ? LuUserCheck : posisi === 'sekretaris' ? LuUser : LuUsers;
  const getMemberStatus = (m) => {
    const hasData = !!(m.nama && m.jabatan);
    const hasTTD = !!m.ttd_path;
    const hasQuisioner = !!m.has_questionnaire;
    return { hasData, hasTTD, hasQuisioner, isComplete: hasData && hasTTD && hasQuisioner };
  };

  const activeMember = timMembers.find(m => m.posisi === activeTab);
  const PosisiIcon = getPosisiIcon(activeTab);
  const memberSaved = !!activeMember?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">Memuat tim verifikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/30 pb-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-2xl p-5 mb-6 shadow-lg">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors group mb-3">
            <LuArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Kembali ke Verifikasi</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <LuShield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Tim Verifikasi Proposal</h1>
                <p className="text-orange-100 text-sm flex items-center gap-2">
                  <LuFileText className="w-3.5 h-3.5" />
                  Desa <span className="font-semibold text-white">{desa?.nama}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleImportFromReguler}
              disabled={importing || !kecamatanId}
              title="Salin Ketua, Sekretaris, & anggota dari Tim Verifikasi Bankeu reguler"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/30 transition-colors disabled:opacity-50"
            >
              <LuDownload className="w-4 h-4" />
              {importing ? 'Mengimpor...' : 'Impor dari Bankeu Reguler'}
            </button>
          </div>

          {/* Status Overview */}
          {timMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {timMembers.map((member) => {
                const status = getMemberStatus(member);
                const posisiLabel = member.posisi.replace('_', ' ');
                let badgeClass, IconComponent;
                if (status.isComplete) {
                  badgeClass = 'bg-green-100/90 text-green-700';
                  IconComponent = LuBadgeCheck;
                } else if (status.hasData && status.hasTTD && !status.hasQuisioner) {
                  badgeClass = 'bg-yellow-100/90 text-yellow-700';
                  IconComponent = LuClock;
                } else if (status.hasData || status.hasTTD) {
                  badgeClass = 'bg-orange-100/90 text-orange-700';
                  IconComponent = LuInfo;
                } else {
                  badgeClass = 'bg-white/20 text-white/90';
                  IconComponent = null;
                }
                return (
                  <div
                    key={member.id || member.posisi}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${badgeClass}`}
                    title={
                      status.isComplete ? 'Semua lengkap (Data, TTD, Quisioner)'
                        : status.hasQuisioner ? 'Quisioner tersimpan, perlu data/TTD'
                        : !status.hasData ? 'Belum ada data'
                        : !status.hasTTD ? 'Belum ada tanda tangan'
                        : 'Belum isi quisioner'
                    }
                  >
                    {IconComponent ? <IconComponent className="w-3.5 h-3.5" /> : <div className="w-3 h-3 rounded-full border-2 border-current" />}
                    <span className="capitalize">{posisiLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Proposal info */}
        {proposal && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <LuFileText className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-800">Proposal yang Diverifikasi</label>
                <p className="text-base font-medium text-gray-700 mt-1">
                  {proposal.judul_proposal} — Rp {Number(proposal.anggaran_usulan || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 border-b border-orange-200">
                <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                  <LuUsers className="w-4 h-4 text-orange-600" /> Tim Verifikasi Kecamatan
                </h3>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-xs text-gray-500 font-medium mb-1 px-1">Tim Utama <span className="text-orange-600">(Semua Proposal)</span></p>
                {timMembers.filter(m => !m.posisi.startsWith('anggota_')).map(member => {
                  const Icon = getPosisiIcon(member.posisi);
                  const isActive = activeTab === member.posisi;
                  const status = getMemberStatus(member);
                  return (
                    <button key={member.posisi} onClick={() => handleTabChange(member.posisi)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left mb-2 ${isActive ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md' : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white'}`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-orange-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-orange-800'}`}>
                          {getPosisiLabel(member.posisi)}
                          {member.posisi === 'sekretaris' && <span className={`text-xs font-normal ml-1 ${isActive ? 'text-orange-200' : 'text-gray-400'}`}>(Opsional)</span>}
                        </p>
                        <p className={`text-xs truncate ${isActive ? 'text-orange-100' : 'text-orange-500'}`}>{member.nama || 'Belum diisi'}</p>
                      </div>
                      {status.isComplete && <LuBadgeCheck className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-green-500'}`} />}
                    </button>
                  );
                })}

                <p className="text-xs text-gray-500 font-medium mb-1 px-1 mt-3">Anggota <span className="text-orange-600">(Proposal Ini)</span></p>
                {timMembers.filter(m => m.posisi.startsWith('anggota_')).map(member => {
                  const Icon = getPosisiIcon(member.posisi);
                  const isActive = activeTab === member.posisi;
                  const status = getMemberStatus(member);
                  return (
                    <button key={member.posisi} onClick={() => handleTabChange(member.posisi)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left mb-2 ${isActive ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white'}`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-orange-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-orange-800'}`}>{getPosisiLabel(member.posisi)}</p>
                        <p className={`text-xs truncate ${isActive ? 'text-orange-100' : 'text-orange-500'}`}>{member.nama || 'Belum diisi'}</p>
                      </div>
                      {status.isComplete && <LuBadgeCheck className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-green-500'}`} />}
                    </button>
                  );
                })}

                <button onClick={handleAddAnggota}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition-colors border-2 border-dashed border-orange-300 mt-2">
                  <LuPlus className="w-5 h-5" /> <span className="font-medium">Tambah Anggota</span>
                </button>

                {/* Tombol Lihat Proposal */}
                {proposal && (
                  <div className="mt-4 pt-3 border-t border-orange-100">
                    <button
                      onClick={() => setShowProposalModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 font-bold text-sm shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <LuEye className="w-5 h-5" />
                      <span>Lihat Proposal</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-9 space-y-6">
            {/* Member header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                    <PosisiIcon className="w-7 h-7 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{getPosisiLabel(activeTab)}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Lengkapi data diri, tanda tangan, dan quisioner verifikasi</p>
                  </div>
                </div>
                {activeTab.startsWith('anggota_') && (
                  <button onClick={() => handleDeleteAnggota(activeTab)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-200">
                    <LuTrash2 className="w-4 h-4" /> <span className="font-medium">Hapus</span>
                  </button>
                )}
              </div>
            </div>

            {/* Data Diri */}
            <Section title="Data Diri" subtitle="Informasi identitas anggota tim" icon={LuUser} open={isDataDiriOpen} onToggle={() => setIsDataDiriOpen(o => !o)}
              badge={activeMember?.nama && activeMember?.jabatan ? 'Lengkap' : null}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormInput label="Nama Lengkap" required value={configForm.nama} onChange={v => setConfigForm({ ...configForm, nama: v })} placeholder="Masukkan nama lengkap" />
                <FormInput label="NIP" hint="(opsional)" value={configForm.nip} onChange={v => setConfigForm({ ...configForm, nip: v })} placeholder="Masukkan NIP" />
                <FormInput label="Jabatan" required value={configForm.jabatan} onChange={v => setConfigForm({ ...configForm, jabatan: v })} placeholder="cth: Kasi Pemerintahan" />
              </div>
              <div className="flex justify-end mt-5">
                <button onClick={handleSaveConfig} className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm">
                  <LuSave className="w-4 h-4" /> Simpan Data
                </button>
              </div>
            </Section>

            {/* Tanda Tangan */}
            <Section title="Tanda Tangan" subtitle="Gambar tanda tangan anggota tim" icon={LuPenTool} open={isTTDOpen} onToggle={() => setIsTTDOpen(o => !o)}
              badge={hasSignature ? 'Tersimpan' : null}>
              {!memberSaved ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-center gap-2">
                  <LuInfo className="w-4 h-4" /> Simpan data diri terlebih dahulu sebelum membuat tanda tangan.
                </div>
              ) : hasSignature ? (
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-2">Tanda Tangan Saat Ini</p>
                    <img src={signatureData} alt="Tanda tangan" className="h-28 border border-gray-200 rounded-lg p-2 bg-white" />
                  </div>
                  <button onClick={handleDeleteSignature} className="inline-flex items-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg">
                    <LuRotateCcw className="w-4 h-4" /> Gambar Ulang
                  </button>
                </div>
              ) : (
                <div className="max-w-md">
                  <div className="border-2 border-orange-300 rounded-xl p-3 bg-white">
                    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                      <SignatureCanvas ref={signatureRef} penColor="black" canvasProps={{ width: 500, height: 180, className: 'w-full h-44 bg-white' }} />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleSaveSignature} className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg">
                        <LuCheck className="w-4 h-4" /> Simpan
                      </button>
                      <button onClick={() => signatureRef.current?.clear()} className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg">
                        <LuRotateCcw className="w-4 h-4" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {/* Quisioner */}
            <Section title="Quisioner Verifikasi" subtitle="Checklist kelengkapan dokumen oleh anggota ini" icon={LuClipboardList} open={isQuestionnaireOpen} onToggle={() => setIsQuestionnaireOpen(o => !o)}
              badge={activeMember?.has_questionnaire ? 'Terisi' : null}>
              {!memberSaved ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-center gap-2">
                  <LuInfo className="w-4 h-4" /> Simpan data diri terlebih dahulu sebelum mengisi quisioner.
                </div>
              ) : (
                <BankeuPerubahanQuestionnaireForm
                  proposalId={proposal?.id}
                  verifierType="kecamatan_tim"
                  verifierId={`${kecamatanId}_${activeTab}`}
                  jenisKegiatan={proposal?.jenis_kegiatan}
                  onSaveSuccess={() => fetchTimMembers(kecamatanId, activeTab, true)}
                />
              )}
            </Section>
          </div>
        </div>
      </div>

      {/* Modal Lihat Proposal */}
      {showProposalModal && proposal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <LuFileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{proposal.judul_proposal}</h2>
                  <p className="text-sm text-blue-100">Rp {Number(proposal.anggaran_usulan || 0).toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {proposal.file_proposal && (
                  <a
                    href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/${proposal.file_proposal}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium text-sm transition-all"
                  >
                    <LuDownload className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                )}
                <button
                  onClick={() => setShowProposalModal(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
                >
                  <LuX className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100">
              {proposal.file_proposal ? (
                <iframe
                  src={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/${proposal.file_proposal}`}
                  className="w-full h-full border-0"
                  title="Proposal PDF Viewer"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <LuFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">File proposal tidak tersedia</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Anggota picker */}
      {showAnggotaPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Tambah Anggota</h3>
              <button onClick={() => setShowAnggotaPicker(false)} className="text-gray-400 hover:text-gray-600"><LuX className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              <button onClick={addBlankAnggota} className="w-full flex items-center gap-2 px-4 py-3 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 border-2 border-dashed border-orange-300 font-medium">
                <LuPlus className="w-5 h-5" /> Anggota Baru (kosong)
              </button>
              {previousAnggota.length > 0 && <p className="text-xs text-gray-500 font-medium pt-2">Atau pakai anggota sebelumnya:</p>}
              {previousAnggota.map((a, i) => (
                <button key={i} onClick={() => selectPreviousAnggota(a)} className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 text-left">
                  {a.ttd_path ? <img src={ttdUrl(a.ttd_path)} alt="ttd" className="w-12 h-12 object-contain border rounded bg-white flex-shrink-0" /> : <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 flex-shrink-0"><LuUser className="w-5 h-5" /></div>}
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{a.nama}</div>
                    <div className="text-xs text-gray-500 truncate">{a.jabatan}{a.nip ? ` · ${a.nip}` : ''}</div>
                    {a.ttd_path && <span className="text-[10px] text-emerald-600 font-semibold">+ tanda tangan</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Section = ({ title, subtitle, icon: Icon, open, onToggle, badge, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4 border-b border-orange-100 cursor-pointer hover:from-orange-100 hover:to-amber-100 transition-all" onClick={onToggle}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center"><Icon className="w-5 h-5 text-white" /></div>
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        {badge && (
          <div className="flex items-center gap-1.5 text-green-600 bg-green-100 px-3 py-1.5 rounded-full">
            <LuBadgeCheck className="w-4 h-4" /><span className="text-sm font-medium">{badge}</span>
          </div>
        )}
        <div className="ml-auto"><LuChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} /></div>
      </div>
    </div>
    {open && <div className="p-5">{children}</div>}
  </div>
);

const FormInput = ({ label, required, hint, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
      {hint && <span className="text-gray-400 text-xs font-normal ml-1">{hint}</span>}
    </label>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:bg-white transition-all" />
  </div>
);

export default KecamatanPerubahanTimProposalPage;
