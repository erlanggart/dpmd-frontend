import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api';
import Swal from 'sweetalert2';
import SignatureCanvas from 'react-signature-canvas';
import { 
  LuUser, LuUserCheck, LuUsers, LuSave, LuTrash2, 
  LuCheck, LuX, LuRotateCcw, LuArrowLeft, LuPlus,
  LuClipboardList, LuPenTool, LuInfo
} from 'react-icons/lu';
import BankeuQuestionnaireForm from '../../../components/BankeuQuestionnaireForm';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001';

const KecamatanTimVerifikasiPage = () => {
  const { desaId } = useParams();
  const navigate = useNavigate();
  const [desa, setDesa] = useState(null);
  const [kecamatanId, setKecamatanId] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [timMembers, setTimMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('ketua');
  const [loading, setLoading] = useState(true);

  // State untuk form config
  const [configForm, setConfigForm] = useState({
    nama: '',
    nip: '',
    jabatan: ''
  });

  // Signature canvas ref
  const signatureRef = useRef(null);
  const [signatureData, setSignatureData] = useState(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    fetchData();
  }, [desaId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [desaRes, proposalsRes] = await Promise.all([
        api.get(`/desas/${desaId}`),
        api.get('/kecamatan/bankeu/proposals')
      ]);

      const desaData = desaRes.data.data;
      setDesa(desaData);
      setKecamatanId(desaData.kecamatan_id);

      // Filter proposals untuk desa ini
      const allProposals = proposalsRes.data.data;
      const desaProposals = allProposals.filter(p => parseInt(p.desa_id) === parseInt(desaId));
      setProposals(desaProposals);

      // Set proposal pertama sebagai default
      if (desaProposals.length > 0 && !selectedProposal) {
        setSelectedProposal(desaProposals[0]);
      }

      // Fetch tim members
      if (desaData.kecamatan_id) {
        await fetchTimMembers(desaData.kecamatan_id);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal memuat data'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTimMembers = async (kecId) => {
    try {
      const response = await api.get(`/kecamatan/${kecId}/bankeu/tim-config`);
      const members = response.data.data || [];
      
      // Ensure ketua dan sekretaris ada (fixed tabs)
      const hasKetua = members.find(m => m.posisi === 'ketua');
      const hasSekretaris = members.find(m => m.posisi === 'sekretaris');
      
      const allMembers = [
        hasKetua || { posisi: 'ketua', nama: '', nip: '', jabatan: '', ttd_path: null },
        hasSekretaris || { posisi: 'sekretaris', nama: '', nip: '', jabatan: '', ttd_path: null },
        ...members.filter(m => m.posisi.startsWith('anggota_'))
      ];
      
      setTimMembers(allMembers);
      
      // Load config untuk active tab
      const activeMember = allMembers.find(m => m.posisi === activeTab);
      if (activeMember) {
        loadMemberConfig(activeMember);
      }
    } catch (error) {
      console.error('Error fetching tim members:', error);
    }
  };

  const loadMemberConfig = (member) => {
    if (member) {
      setConfigForm({
        nama: member.nama || '',
        nip: member.nip || '',
        jabatan: member.jabatan || ''
      });
      
      if (member.ttd_path) {
        setSignatureData(`${imageBaseUrl}/storage/uploads/kecamatan_bankeu_ttd/${member.ttd_path}`);
        setHasSignature(true);
      } else {
        setSignatureData(null);
        setHasSignature(false);
      }
    }
  };

  const handleTabChange = async (posisi) => {
    setActiveTab(posisi);
    const member = timMembers.find(m => m.posisi === posisi);
    if (member) {
      loadMemberConfig(member);
    } else {
      // New member belum ada config
      setConfigForm({ nama: '', nip: '', jabatan: '' });
      setSignatureData(null);
      setHasSignature(false);
    }
  };

  const handleAddAnggota = async () => {
    // Count existing anggota
    const anggotaCount = timMembers.filter(m => m.posisi.startsWith('anggota_')).length;
    const nextNumber = anggotaCount + 1;
    const newPosisi = `anggota_${nextNumber}`;
    
    // Add to state
    const newMember = {
      posisi: newPosisi,
      nama: '',
      nip: '',
      jabatan: '',
      ttd_path: null
    };
    
    setTimMembers([...timMembers, newMember]);
    setActiveTab(newPosisi);
    loadMemberConfig(newMember);
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Anggota ${nextNumber} ditambahkan`,
      showConfirmButton: false,
      timer: 2000
    });
  };

  const handleDeleteAnggota = async (posisi) => {
    // Cannot delete ketua/sekretaris
    if (posisi === 'ketua' || posisi === 'sekretaris') {
      Swal.fire({
        icon: 'error',
        title: 'Tidak Bisa Dihapus',
        text: 'Ketua dan Sekretaris tidak bisa dihapus'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Hapus Anggota?',
      text: 'Data anggota ini akan dihapus permanen',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed && kecamatanId) {
      try {
        // Delete dari backend jika sudah ada di database
        const member = timMembers.find(m => m.posisi === posisi);
        if (member && member.id) {
          await api.delete(`/kecamatan/${kecamatanId}/bankeu/tim-config/${posisi}/ttd`);
        }
        
        // Remove dari state
        const updatedMembers = timMembers.filter(m => m.posisi !== posisi);
        setTimMembers(updatedMembers);
        
        // Switch ke ketua tab
        setActiveTab('ketua');
        const ketuaMember = updatedMembers.find(m => m.posisi === 'ketua');
        loadMemberConfig(ketuaMember);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Anggota dihapus',
          showConfirmButton: false,
          timer: 2000
        });
      } catch (error) {
        console.error('Error deleting anggota:', error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: error.response?.data?.message || 'Gagal menghapus anggota'
        });
      }
    }
  };

  const handleSaveConfig = async () => {
    if (!configForm.nama || !configForm.nip || !configForm.jabatan) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Belum Lengkap',
        text: 'Mohon lengkapi semua field'
      });
      return;
    }

    if (!kecamatanId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Kecamatan ID tidak ditemukan'
      });
      return;
    }

    try {
      await api.post(`/kecamatan/${kecamatanId}/bankeu/tim-config/${activeTab}`, configForm);
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Konfigurasi disimpan',
        showConfirmButton: false,
        timer: 2000
      });

      // Refresh tim members
      await fetchTimMembers(kecamatanId);
    } catch (error) {
      console.error('Error saving config:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.message || 'Gagal menyimpan konfigurasi'
      });
    }
  };

  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const handleSaveSignature = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      Swal.fire({
        icon: 'warning',
        title: 'Tanda Tangan Kosong',
        text: 'Mohon buat tanda tangan terlebih dahulu'
      });
      return;
    }

    if (!kecamatanId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Kecamatan ID tidak ditemukan'
      });
      return;
    }

    try {
      // Convert canvas to blob
      const dataUrl = signatureRef.current.toDataURL('image/png');
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Create FormData
      const formData = new FormData();
      formData.append('ttd', blob, `ttd_${activeTab}.png`);

      await api.post(
        `/kecamatan/${kecamatanId}/bankeu/tim-config/${activeTab}/upload-ttd`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Tanda tangan disimpan',
        showConfirmButton: false,
        timer: 2000
      });

      // Refresh
      await fetchTimMembers(kecamatanId);
    } catch (error) {
      console.error('Error saving signature:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.message || 'Gagal menyimpan tanda tangan'
      });
    }
  };

  const handleDeleteSignature = async () => {
    const result = await Swal.fire({
      title: 'Hapus Tanda Tangan?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed && kecamatanId) {
      try {
        await api.delete(`/kecamatan/${kecamatanId}/bankeu/tim-config/${activeTab}/ttd`);
        
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Tanda tangan dihapus',
          showConfirmButton: false,
          timer: 2000
        });

        await fetchTimMembers(kecamatanId);
      } catch (error) {
        console.error('Error deleting signature:', error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: error.response?.data?.message || 'Gagal menghapus tanda tangan'
        });
      }
    }
  };

  const getPosisiLabel = (posisi) => {
    if (posisi === 'ketua') return 'Ketua Tim Verifikasi';
    if (posisi === 'sekretaris') return 'Sekretaris Tim Verifikasi';
    const match = posisi.match(/anggota_(\d+)/);
    if (match) return `Anggota ${match[1]}`;
    return posisi;
  };

  const getPosisiIcon = (posisi) => {
    if (posisi === 'ketua') return LuUserCheck;
    if (posisi === 'sekretaris') return LuUser;
    return LuUsers;
  };

  const activeMember = timMembers.find(m => m.posisi === activeTab);
  const PosisiIcon = getPosisiIcon(activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate(`/kecamatan/bankeu/${desaId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-amber-600 mb-4 transition-colors"
          >
            <LuArrowLeft className="w-5 h-5" />
            <span className="font-medium">Kembali ke Verifikasi Proposal</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Tim Verifikasi Kecamatan
              </h1>
              <p className="text-gray-600 mt-1">
                Desa <span className="font-semibold text-amber-600">{desa?.nama}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6">
        {/* Proposal Selector */}
        {proposals.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Pilih Proposal untuk Diverifikasi:
            </label>
            <select
              value={selectedProposal?.id || ''}
              onChange={(e) => {
                const proposal = proposals.find(p => p.id === parseInt(e.target.value));
                setSelectedProposal(proposal);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              {proposals.map(proposal => (
                <option key={proposal.id} value={proposal.id}>
                  {proposal.judul_proposal} - Rp {proposal.anggaran_usulan?.toLocaleString('id-ID')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="bg-white rounded-t-xl shadow-sm border-x border-t border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2 overflow-x-auto flex-1">
              {timMembers.map((member) => {
                const Icon = getPosisiIcon(member.posisi);
                const isActive = activeTab === member.posisi;
                
                return (
                  <button
                    key={member.posisi}
                    onClick={() => handleTabChange(member.posisi)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{getPosisiLabel(member.posisi)}</span>
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={handleAddAnggota}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ml-4 whitespace-nowrap"
            >
              <LuPlus className="w-4 h-4" />
              <span>Tambah Anggota</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                  <PosisiIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {getPosisiLabel(activeTab)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Lengkapi konfigurasi, tanda tangan, dan quisioner
                  </p>
                </div>
              </div>
              
              {activeTab.startsWith('anggota_') && (
                <button
                  onClick={() => handleDeleteAnggota(activeTab)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <LuTrash2 className="w-4 h-4" />
                  <span>Hapus Anggota</span>
                </button>
              )}
            </div>

            {/* Section 1: Konfigurasi Data Diri */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <LuUser className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">1. Data Diri</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={configForm.nama}
                    onChange={(e) => setConfigForm({ ...configForm, nama: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nama lengkap"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    NIP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={configForm.nip}
                    onChange={(e) => setConfigForm({ ...configForm, nip: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="NIP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Jabatan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={configForm.jabatan}
                    onChange={(e) => setConfigForm({ ...configForm, jabatan: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jabatan"
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleSaveConfig}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
                >
                  <LuSave className="w-4 h-4" />
                  <span>Simpan Konfigurasi</span>
                </button>
              </div>
            </div>

            {/* Section 2: Tanda Tangan */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center gap-2 mb-4">
                <LuPenTool className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">2. Tanda Tangan</h3>
              </div>

              {hasSignature && signatureData ? (
                <div>
                  <div className="bg-white rounded-lg border-2 border-purple-300 p-4 mb-4">
                    <img 
                      src={signatureData} 
                      alt="Tanda Tangan" 
                      className="max-w-md mx-auto"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setHasSignature(false);
                        setSignatureData(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      <LuRotateCcw className="w-4 h-4" />
                      <span>Ganti Tanda Tangan</span>
                    </button>
                    <button
                      onClick={handleDeleteSignature}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <LuTrash2 className="w-4 h-4" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-white rounded-lg border-2 border-purple-300 mb-4">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: 'w-full h-64',
                        style: { border: 'none' }
                      }}
                      backgroundColor="white"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClearSignature}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <LuRotateCcw className="w-4 h-4" />
                      <span>Hapus</span>
                    </button>
                    <button
                      onClick={handleSaveSignature}
                      className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
                    >
                      <LuSave className="w-4 h-4" />
                      <span>Simpan Tanda Tangan</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Quisioner Verifikasi */}
            {selectedProposal && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <LuClipboardList className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-900">3. Quisioner Verifikasi</h3>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4 border-l-4 border-green-500">
                  <div className="flex items-start gap-2">
                    <LuInfo className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Proposal yang Diverifikasi:</p>
                      <p className="text-gray-700 mt-1">{selectedProposal.judul_proposal}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Anggaran: Rp {selectedProposal.anggaran_usulan?.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>

                <BankeuQuestionnaireForm
                  proposalId={selectedProposal.id}
                  verifierType="kecamatan_tim"
                  verifierId={`${kecamatanId}_${activeTab}`}
                  onSaveSuccess={() => {
                    Swal.fire({
                      toast: true,
                      position: 'top-end',
                      icon: 'success',
                      title: 'Quisioner berhasil disimpan',
                      showConfirmButton: false,
                      timer: 2000
                    });
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KecamatanTimVerifikasiPage;
