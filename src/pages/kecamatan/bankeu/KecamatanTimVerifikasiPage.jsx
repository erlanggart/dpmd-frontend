import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../api';
import Swal from 'sweetalert2';
import SignatureCanvas from 'react-signature-canvas';
import { 
  LuUser, LuUserCheck, LuUsers, LuSave, LuTrash2, 
  LuCheck, LuX, LuRotateCcw, LuArrowLeft, LuPlus,
  LuClipboardList, LuPenTool, LuInfo, LuBadgeCheck,
  LuFileText, LuShield, LuChevronDown, LuBuilding2,
  LuFileCheck, LuDownload, LuLoader, LuClock, LuEye
} from 'react-icons/lu';
import BankeuQuestionnaireForm from '../../../components/BankeuQuestionnaireForm';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001';

const KecamatanTimVerifikasiPage = () => {
  const { desaId } = useParams();
  const [searchParams] = useSearchParams();
  const proposalIdFromUrl = searchParams.get('proposalId');
  const tahunAnggaran = parseInt(searchParams.get('tahun')) || 2027;
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

  // Collapsible sections state (default collapsed)
  const [isDataDiriOpen, setIsDataDiriOpen] = useState(false);
  const [isTTDOpen, setIsTTDOpen] = useState(false);
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false); // Collapsed by default
  const [isDinasVerifikatorOpen, setIsDinasVerifikatorOpen] = useState(false);

  // Tim validation and berita acara state
  const [timValidation, setTimValidation] = useState(null);

  // Keep questionnaire collapsed when switching tabs
  useEffect(() => {
    setIsQuestionnaireOpen(false);
  }, [activeTab]);
  const [isGeneratingBA, setIsGeneratingBA] = useState(false);
  const [beritaAcaraGenerated, setBeritaAcaraGenerated] = useState(false);
  const [isGeneratingSP, setIsGeneratingSP] = useState(false); // Surat Pengantar
  const [showProposalModal, setShowProposalModal] = useState(false); // Modal lihat proposal

  useEffect(() => {
    fetchData();
  }, [desaId, proposalIdFromUrl]);

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

      // Prioritas: gunakan proposalId dari URL query params jika ada
      let targetProposal = null;
      if (proposalIdFromUrl) {
        targetProposal = desaProposals.find(p => parseInt(p.id) === parseInt(proposalIdFromUrl));
      }
      
      // Fallback ke proposal pertama jika tidak ditemukan
      if (!targetProposal && desaProposals.length > 0) {
        targetProposal = desaProposals[0];
      }

      // Set proposal dan fetch tim members
      if (targetProposal) {
        setSelectedProposal(targetProposal);
        if (desaData.kecamatan_id) {
          await fetchTimMembers(desaData.kecamatan_id, targetProposal.id);
        }
      } else if (desaData.kecamatan_id && selectedProposal) {
        await fetchTimMembers(desaData.kecamatan_id, selectedProposal.id);
      } else if (desaData.kecamatan_id) {
        // No proposal, just fetch shared members (ketua/sekretaris)
        await fetchTimMembers(desaData.kecamatan_id, null);
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

  const fetchTimMembers = async (kecId, proposalId = null) => {
    try {
      // Build URL dengan proposalId untuk mendapatkan anggota per proposal
      let url = `/kecamatan/${kecId}/bankeu/tim-config`;
      if (proposalId) {
        url += `?proposalId=${proposalId}`;
      }
      
      const response = await api.get(url);
      const members = response.data.data || [];
      
      // Ensure ketua dan sekretaris ada (shared across all proposals)
      const hasKetua = members.find(m => m.posisi === 'ketua');
      const hasSekretaris = members.find(m => m.posisi === 'sekretaris');
      
      const allMembers = [
        hasKetua || { posisi: 'ketua', nama: '', nip: '', jabatan: '', ttd_path: null, proposal_id: null },
        hasSekretaris || { posisi: 'sekretaris', nama: '', nip: '', jabatan: '', ttd_path: null, proposal_id: null },
        ...members.filter(m => m.posisi.startsWith('anggota_'))
      ];
      
      setTimMembers(allMembers);
      
      // Load config untuk active tab
      const activeMember = allMembers.find(m => m.posisi === activeTab);
      if (activeMember) {
        loadMemberConfig(activeMember);
      }
      
      // Refresh proposal data to get latest dinas verification info
      if (proposalId && selectedProposal?.id === proposalId) {
        await refreshProposalData(proposalId);
      }
    } catch (error) {
      console.error('Error fetching tim members:', error);
    }
  };

  // Refresh single proposal data
  const refreshProposalData = async (proposalId) => {
    try {
      const response = await api.get("/kecamatan/bankeu/proposals");
      const allProposals = response.data.data;
      const desaIdNum = parseInt(desaId);
      const desaProposals = allProposals.filter(p => parseInt(p.desa_id) === desaIdNum);
      
      const updatedProposal = desaProposals.find(p => parseInt(p.id) === parseInt(proposalId));
      if (updatedProposal) {
        setSelectedProposal(updatedProposal);
      }
      
      setProposals(desaProposals);
    } catch (error) {
      console.error('Error refreshing proposal data:', error);
    }
  };

  // Validate tim completion untuk berita acara
  const validateTimCompletion = async (proposalId) => {
    if (!proposalId) return;
    try {
      const response = await api.get(`/berita-acara/validate/${desaId}/${proposalId}`);
      setTimValidation(response.data.data);
      
      // Check if berita acara already generated
      if (selectedProposal?.berita_acara_path) {
        setBeritaAcaraGenerated(true);
      }
    } catch (error) {
      console.error('Error validating tim:', error);
    }
  };

  // Effect to validate and re-fetch tim members when proposal changes
  useEffect(() => {
    if (selectedProposal?.id && kecamatanId) {
      // Re-fetch tim members with new proposalId to get proposal-specific anggota
      fetchTimMembers(kecamatanId, selectedProposal.id);
      validateTimCompletion(selectedProposal.id);
      setBeritaAcaraGenerated(!!selectedProposal.berita_acara_path);
      // Reset to ketua tab when proposal changes
      setActiveTab('ketua');
    }
  }, [selectedProposal?.id, kecamatanId]);

  // Generate berita acara
  const handleGenerateBeritaAcara = async () => {
    if (!selectedProposal || !timValidation?.valid) {
      Swal.fire({
        icon: 'warning',
        title: 'Belum Siap',
        text: 'Semua anggota tim harus melengkapi data, tanda tangan, dan quisioner terlebih dahulu'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Generate Berita Acara?',
      html: `
        <p class="text-gray-600 mb-3">Berita acara verifikasi akan dibuat untuk proposal:</p>
        <p class="font-semibold text-gray-800">${selectedProposal.judul_proposal}</p>
        <p class="text-sm text-gray-500 mt-2">Desa ${desa?.nama}</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Generate',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setIsGeneratingBA(true);
      try {
        const response = await api.post(`/berita-acara/generate/${desaId}`, {
          proposalId: selectedProposal.id,
          kegiatanId: selectedProposal.kegiatan_id
        });

        if (response.data.success) {
          setBeritaAcaraGenerated(true);
          
          // Update selected proposal with new berita acara path
          setSelectedProposal(prev => ({
            ...prev,
            berita_acara_path: response.data.data.file_path
          }));

          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            html: `
              <p>Berita Acara berhasil dibuat</p>
              <p class="text-sm text-gray-500 mt-2">Versi: ${response.data.data.version}</p>
            `,
            showConfirmButton: true,
            confirmButtonText: 'Lihat Berita Acara',
            showCancelButton: true,
            cancelButtonText: 'Tutup'
          }).then((result) => {
            if (result.isConfirmed && response.data.data.file_path) {
              window.open(`${imageBaseUrl}/storage/${response.data.data.file_path}`, '_blank');
            }
          });
        }
      } catch (error) {
        console.error('Error generating berita acara:', error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: error.response?.data?.message || 'Gagal membuat berita acara'
        });
      } finally {
        setIsGeneratingBA(false);
      }
    }
  };

  // View existing berita acara
  const handleViewBeritaAcara = () => {
    if (selectedProposal?.berita_acara_path) {
      window.open(`${imageBaseUrl}/storage/${selectedProposal.berita_acara_path}`, '_blank');
    }
  };

  // Generate Surat Pengantar
  const handleGenerateSuratPengantar = async () => {
    if (!selectedProposal) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Proposal',
        text: 'Silakan pilih proposal terlebih dahulu'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Generate Surat Pengantar?',
      html: `
        <p class="text-gray-600 mb-3">Surat pengantar akan dibuat untuk proposal:</p>
        <p class="font-semibold text-gray-800">${selectedProposal.judul_proposal}</p>
        <p class="text-sm text-gray-500 mt-2">Desa ${desa?.nama}</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Generate',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setIsGeneratingSP(true);
      try {
        const response = await api.post(`/berita-acara/surat-pengantar/${selectedProposal.id}`);

        if (response.data.success) {
          // Update selected proposal with surat pengantar path
          setSelectedProposal(prev => ({
            ...prev,
            surat_pengantar_kecamatan_path: response.data.data.pdf_path
          }));

          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            html: `<p>Surat Pengantar berhasil dibuat</p>`,
            showConfirmButton: true,
            confirmButtonText: 'Lihat Surat Pengantar',
            showCancelButton: true,
            cancelButtonText: 'Tutup'
          }).then((result) => {
            if (result.isConfirmed && response.data.data.pdf_path) {
              window.open(`${imageBaseUrl}/storage${response.data.data.pdf_path}`, '_blank');
            }
          });
        }
      } catch (error) {
        console.error('Error generating surat pengantar:', error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: error.response?.data?.message || 'Gagal membuat surat pengantar'
        });
      } finally {
        setIsGeneratingSP(false);
      }
    }
  };

  // View existing surat pengantar
  const handleViewSuratPengantar = () => {
    if (selectedProposal?.surat_pengantar_kecamatan_path) {
      window.open(`${imageBaseUrl}/storage${selectedProposal.surat_pengantar_kecamatan_path}`, '_blank');
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
        // ttd_path sudah termasuk folder, contoh: "kecamatan_bankeu_ttd/filename.png"
        setSignatureData(`${imageBaseUrl}/storage/uploads/${member.ttd_path}`);
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
    // Anggota harus ada proposal yang dipilih
    if (!selectedProposal) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Proposal',
        text: 'Silakan pilih proposal terlebih dahulu untuk menambah anggota tim'
      });
      return;
    }

    // Count existing anggota untuk proposal ini
    const anggotaCount = timMembers.filter(m => m.posisi.startsWith('anggota_')).length;
    const nextNumber = anggotaCount + 1;
    const newPosisi = `anggota_${nextNumber}`;
    
    // Add to state dengan proposal_id
    const newMember = {
      posisi: newPosisi,
      nama: '',
      nip: '',
      jabatan: '',
      ttd_path: null,
      proposal_id: selectedProposal.id
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

    if (!selectedProposal) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Proposal',
        text: 'Silakan pilih proposal terlebih dahulu'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Hapus Anggota?',
      text: 'Data anggota ini akan dihapus permanen untuk proposal ini',
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
          // Delete anggota (proposal-specific)
          await api.delete(`/kecamatan/${kecamatanId}/bankeu/tim-config/${posisi}?proposalId=${selectedProposal.id}`);
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

    // Untuk anggota, proposalId wajib
    const isAnggota = activeTab.startsWith('anggota_');
    if (isAnggota && !selectedProposal) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Proposal',
        text: 'Silakan pilih proposal terlebih dahulu untuk menyimpan data anggota'
      });
      return;
    }

    try {
      // Build request body dengan proposalId untuk anggota
      const requestBody = {
        ...configForm,
        ...(isAnggota && selectedProposal ? { proposalId: selectedProposal.id } : {})
      };

      await api.post(`/kecamatan/${kecamatanId}/bankeu/tim-config/${activeTab}`, requestBody);
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Konfigurasi disimpan',
        showConfirmButton: false,
        timer: 2000
      });

      // Refresh tim members dengan proposalId
      await fetchTimMembers(kecamatanId, selectedProposal?.id);
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

    // Untuk anggota, proposalId wajib
    const isAnggota = activeTab.startsWith('anggota_');
    if (isAnggota && !selectedProposal) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Proposal',
        text: 'Silakan pilih proposal terlebih dahulu untuk menyimpan tanda tangan anggota'
      });
      return;
    }

    try {
      // Convert canvas to blob
      const dataUrl = signatureRef.current.toDataURL('image/png');
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Create FormData dengan proposalId untuk anggota
      const formData = new FormData();
      formData.append('ttd', blob, `ttd_${activeTab}.png`);
      if (isAnggota && selectedProposal) {
        formData.append('proposalId', selectedProposal.id);
      }

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

      // Refresh dengan proposalId
      await fetchTimMembers(kecamatanId, selectedProposal?.id);
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
        // Untuk anggota, tambahkan proposalId
        const isAnggota = activeTab.startsWith('anggota_');
        let url = `/kecamatan/${kecamatanId}/bankeu/tim-config/${activeTab}/ttd`;
        if (isAnggota && selectedProposal) {
          url += `?proposalId=${selectedProposal.id}`;
        }

        await api.delete(url);
        
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Tanda tangan dihapus',
          showConfirmButton: false,
          timer: 2000
        });

        await fetchTimMembers(kecamatanId, selectedProposal?.id);
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

  // Check completion status untuk setiap member
  const getMemberStatus = (member) => {
    const hasData = member.nama && member.nip && member.jabatan;
    const hasTTD = !!member.ttd_path;
    const hasQuisioner = !!member.has_questionnaire; // from backend
    return { 
      hasData, 
      hasTTD, 
      hasQuisioner,
      isComplete: hasData && hasTTD && hasQuisioner 
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-violet-200 border-t-violet-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">Memuat data tim verifikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 pb-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-4">
        {/* Page Title Card */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 rounded-2xl p-5 mb-6 shadow-lg">
          {/* Back Button */}
          <button
            onClick={() => navigate(`/kecamatan/bankeu/verifikasi/${desaId}?tahun=${tahunAnggaran}`)}
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors group mb-3"
          >
            <LuArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Kembali ke Verifikasi</span>
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <LuShield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  Tim Verifikasi Proposal
                </h1>
                <p className="text-violet-100 text-sm flex items-center gap-2">
                  <LuFileText className="w-3.5 h-3.5" />
                  Desa <span className="font-semibold text-white">{desa?.nama}</span>
                </p>
              </div>
            </div>
            
            {/* Status Overview */}
            <div className="flex flex-wrap gap-2">
              {timMembers.map((member) => {
                const status = getMemberStatus(member);
                const posisiLabel = member.posisi.replace('_', ' ');
                
                // Determine badge color and icon based on completion
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
                      status.isComplete 
                        ? 'Semua lengkap (Data, TTD, Quisioner)' 
                        : status.hasQuisioner 
                        ? 'Quisioner tersimpan, perlu data/TTD'
                        : !status.hasData 
                        ? 'Belum ada data'
                        : !status.hasTTD
                        ? 'Belum ada tanda tangan'
                        : 'Belum isi quisioner'
                    }
                  >
                    {IconComponent ? (
                      <IconComponent className="w-3.5 h-3.5" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-current" />
                    )}
                    <span className="capitalize">{posisiLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Proposal Info - Read Only */}
        {selectedProposal && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <LuFileText className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-800">
                  Proposal yang Diverifikasi
                </label>
                <p className="text-base font-medium text-gray-700 mt-1">
                  {selectedProposal.judul_proposal} — Rp {selectedProposal.anggaran_usulan?.toLocaleString('id-ID')}
                </p>
              </div>
              <button
                onClick={() => setShowProposalModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-semibold text-sm shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <LuEye className="w-4 h-4" />
                <span>Lihat Proposal</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar - Tim Members */}
          <div className="lg:col-span-3 space-y-4">
            {/* Verifikator Dinas Card - Separate */}
            {selectedProposal && selectedProposal.dinas_verifikator_nama && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-50 to-teal-50 px-4 py-3 border-b border-cyan-200">
                  <h3 className="font-semibold text-cyan-800 flex items-center gap-2">
                    <LuBuilding2 className="w-4 h-4 text-cyan-600" />
                    Verifikator Dinas
                  </h3>
                </div>
                <div className="p-3">
                  <button
                    onClick={() => setActiveTab('dinas_verifikator')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left ${
                      activeTab === 'dinas_verifikator'
                        ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md'
                        : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      activeTab === 'dinas_verifikator' ? 'bg-white/20' : 'bg-white'
                    }`}>
                      <LuBuilding2 className={`w-5 h-5 ${activeTab === 'dinas_verifikator' ? 'text-white' : 'text-cyan-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${activeTab === 'dinas_verifikator' ? 'text-white' : 'text-cyan-800'}`}>
                        {selectedProposal.dinas_verifikator_nama}
                      </p>
                      <p className={`text-xs truncate ${activeTab === 'dinas_verifikator' ? 'text-cyan-100' : 'text-cyan-600'}`}>
                        {selectedProposal.dinas_verifikator_jabatan || 'Verifikator'}
                      </p>
                    </div>
                    <LuBadgeCheck className={`w-5 h-5 flex-shrink-0 ${activeTab === 'dinas_verifikator' ? 'text-white' : 'text-cyan-600'}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Tim Verifikasi Kecamatan Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3 border-b border-violet-200">
                <h3 className="font-semibold text-violet-800 flex items-center gap-2">
                  <LuUsers className="w-4 h-4 text-violet-600" />
                  Tim Verifikasi Kecamatan
                </h3>
              </div>
              
              <div className="p-3 space-y-2">
                {/* Shared Members (Ketua & Sekretaris) */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 font-medium mb-2 px-1">
                    Tim Utama <span className="text-violet-600">(Semua Proposal)</span>
                  </p>
                  {timMembers.filter(m => !m.posisi.startsWith('anggota_')).map((member) => {
                    const Icon = getPosisiIcon(member.posisi);
                    const isActive = activeTab === member.posisi;
                    const status = getMemberStatus(member);
                    
                    return (
                      <button
                        key={member.id || member.posisi}
                        onClick={() => handleTabChange(member.posisi)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left mb-2 ${
                          isActive
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                            : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isActive ? 'bg-white/20' : 'bg-white'
                        }`}>
                          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-violet-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-violet-800'}`}>
                            {getPosisiLabel(member.posisi)}
                          </p>
                          <p className={`text-xs truncate ${isActive ? 'text-violet-100' : 'text-violet-500'}`}>
                            {member.nama || 'Belum diisi'}
                          </p>
                        </div>
                        {status.isComplete && (
                          <LuBadgeCheck className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-green-500'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Proposal-Specific Members (Anggota) */}
                {selectedProposal && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2 px-1">
                      Anggota <span className="text-violet-600">(Proposal Ini)</span>
                    </p>
                    {timMembers.filter(m => m.posisi.startsWith('anggota_')).map((member) => {
                      const Icon = getPosisiIcon(member.posisi);
                      const isActive = activeTab === member.posisi;
                      const status = getMemberStatus(member);
                      
                      return (
                        <button
                          key={member.id || `${member.posisi}_${member.nama}`}
                          onClick={() => handleTabChange(member.posisi)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left mb-2 ${
                            isActive
                              ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md'
                              : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isActive ? 'bg-white/20' : 'bg-white'
                          }`}>
                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-violet-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-violet-800'}`}>
                              {getPosisiLabel(member.posisi)}
                            </p>
                            <p className={`text-xs truncate ${isActive ? 'text-violet-100' : 'text-violet-500'}`}>
                              {member.nama || 'Belum diisi'}
                            </p>
                          </div>
                          {status.isComplete && (
                            <LuBadgeCheck className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-green-500'}`} />
                          )}
                        </button>
                      );
                    })}
                    
                    {/* Add Member Button */}
                    <button
                      onClick={handleAddAnggota}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 text-violet-700 rounded-xl hover:bg-violet-100 transition-colors border-2 border-dashed border-violet-300 mt-2"
                    >
                      <LuPlus className="w-5 h-5" />
                      <span className="font-medium">Tambah Anggota</span>
                    </button>
                  </div>
                )}

                {!selectedProposal && (
                  <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                    <p className="text-xs text-violet-700 text-center">
                      Pilih proposal untuk mengelola anggota tim
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Show Dinas Verifikator Content when selected */}
            {activeTab === 'dinas_verifikator' && selectedProposal && selectedProposal.dinas_verifikator_nama ? (
              <>
                {/* Dinas Verifikator Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center">
                      <LuBuilding2 className="w-7 h-7 text-cyan-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Verifikator Dinas
                      </h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Data verifikator dari dinas yang memverifikasi proposal
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dinas Verifikator Detail */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-50 to-teal-50 px-5 py-4 border-b border-cyan-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                        <LuUser className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Data Verifikator</h3>
                        <p className="text-sm text-gray-500">Informasi lengkap verifikator dinas</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5 text-cyan-600 bg-cyan-100 px-3 py-1.5 rounded-full">
                        <LuBadgeCheck className="w-4 h-4" />
                        <span className="text-sm font-medium">Terverifikasi</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Data Verifikator */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-500 mb-1">Nama Verifikator</label>
                          <p className="text-gray-900 font-medium text-lg">{selectedProposal.dinas_verifikator_nama}</p>
                        </div>
                        {selectedProposal.dinas_verifikator_nip && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-500 mb-1">NIP</label>
                            <p className="text-gray-900">{selectedProposal.dinas_verifikator_nip}</p>
                          </div>
                        )}
                        {selectedProposal.dinas_verifikator_jabatan && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-500 mb-1">Jabatan</label>
                            <p className="text-gray-900">{selectedProposal.dinas_verifikator_jabatan}</p>
                          </div>
                        )}
                        {selectedProposal.dinas_verifikator_pangkat && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-500 mb-1">Pangkat/Golongan</label>
                            <p className="text-gray-900">{selectedProposal.dinas_verifikator_pangkat}</p>
                          </div>
                        )}
                        {selectedProposal.dinas_verified_at && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-500 mb-1">Tanggal Verifikasi</label>
                            <p className="text-gray-900">
                              {new Date(selectedProposal.dinas_verified_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tanda Tangan Verifikator */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-500 mb-2">Tanda Tangan</label>
                        {selectedProposal.dinas_verifikator_ttd ? (
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-4">
                            <img 
                              src={`${imageBaseUrl}/storage/${selectedProposal.dinas_verifikator_ttd?.startsWith('uploads/') ? '' : 'uploads/'}${selectedProposal.dinas_verifikator_ttd}`}
                              alt="Tanda Tangan Verifikator Dinas" 
                              className="max-w-xs mx-auto bg-white rounded-lg shadow-sm"
                            />
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center">
                            <p className="text-gray-500 text-sm">Tanda tangan belum tersedia</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
            <>
            {/* Member Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                    <PosisiIcon className="w-7 h-7 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {getPosisiLabel(activeTab)}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Lengkapi data diri, tanda tangan, dan quisioner verifikasi
                    </p>
                  </div>
                </div>
                
                {activeTab.startsWith('anggota_') && (
                  <button
                    onClick={() => handleDeleteAnggota(activeTab)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-200"
                  >
                    <LuTrash2 className="w-4 h-4" />
                    <span className="font-medium">Hapus</span>
                  </button>
                )}
              </div>
            </div>

            {/* Section 1: Data Diri */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 border-b border-blue-100 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all"
                onClick={() => setIsDataDiriOpen(!isDataDiriOpen)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <LuUser className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Data Diri</h3>
                    <p className="text-sm text-gray-500">Informasi identitas anggota tim</p>
                  </div>
                  {activeMember?.nama && activeMember?.nip && activeMember?.jabatan && (
                    <div className="flex items-center gap-1.5 text-green-600 bg-green-100 px-3 py-1.5 rounded-full">
                      <LuBadgeCheck className="w-4 h-4" />
                      <span className="text-sm font-medium">Lengkap</span>
                    </div>
                  )}
                  <div className="ml-auto">
                    <LuChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isDataDiriOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
              
              {isDataDiriOpen && (
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={configForm.nama}
                      onChange={(e) => setConfigForm({ ...configForm, nama: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder="Masukkan nama lengkap"
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
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder="Masukkan NIP"
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
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder="Masukkan jabatan"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={handleSaveConfig}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
                  >
                    <LuSave className="w-5 h-5" />
                    <span>Simpan Data</span>
                  </button>
                </div>
              </div>
              )}
            </div>

            {/* Section 2: Tanda Tangan */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-50 to-pink-50 px-5 py-4 border-b border-purple-100 cursor-pointer hover:from-purple-100 hover:to-pink-100 transition-all"
                onClick={() => setIsTTDOpen(!isTTDOpen)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <LuPenTool className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Tanda Tangan Digital</h3>
                    <p className="text-sm text-gray-500">Tanda tangan untuk berita acara</p>
                  </div>
                  {hasSignature && (
                    <div className="flex items-center gap-1.5 text-green-600 bg-green-100 px-3 py-1.5 rounded-full">
                      <LuBadgeCheck className="w-4 h-4" />
                      <span className="text-sm font-medium">Tersimpan</span>
                    </div>
                  )}
                  <div className="ml-auto">
                    <LuChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isTTDOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {isTTDOpen && (
              <div className="p-5">
                {hasSignature && signatureData ? (
                  <div>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-6 mb-4">
                      <img 
                        src={signatureData} 
                        alt="Tanda Tangan" 
                        className="max-w-sm mx-auto bg-white rounded-lg shadow-sm"
                      />
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => {
                          setHasSignature(false);
                          setSignatureData(null);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-violet-50 text-violet-700 rounded-xl hover:bg-violet-100 transition-colors border border-violet-200 font-medium"
                      >
                        <LuRotateCcw className="w-4 h-4" />
                        <span>Ganti TTD</span>
                      </button>
                      <button
                        onClick={handleDeleteSignature}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-200 font-medium"
                      >
                        <LuTrash2 className="w-4 h-4" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-white rounded-xl border-2 border-dashed border-purple-300 mb-4 overflow-hidden">
                      <SignatureCanvas
                        ref={signatureRef}
                        canvasProps={{
                          className: 'w-full h-48 md:h-56',
                          style: { border: 'none', touchAction: 'none' }
                        }}
                        backgroundColor="white"
                      />
                    </div>
                    <p className="text-center text-sm text-gray-500 mb-4">
                      Gunakan mouse atau sentuhan untuk menggambar tanda tangan
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={handleClearSignature}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors border border-gray-300 font-medium"
                      >
                        <LuRotateCcw className="w-4 h-4" />
                        <span>Reset</span>
                      </button>
                      <button
                        onClick={handleSaveSignature}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        <LuSave className="w-4 h-4" />
                        <span>Simpan Tanda Tangan</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Section 3: Quisioner Verifikasi */}
            {selectedProposal && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div 
                  className={`px-5 py-4 border-b cursor-pointer transition-all ${
                    activeMember?.has_questionnaire 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100 hover:from-green-100 hover:to-emerald-100'
                      : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100 hover:from-blue-100 hover:to-cyan-100'
                  }`}
                  onClick={() => setIsQuestionnaireOpen(!isQuestionnaireOpen)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      activeMember?.has_questionnaire ? 'bg-green-500' : 'bg-blue-500'
                    }`}>
                      <LuClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Quisioner Verifikasi</h3>
                      <p className="text-sm text-gray-500">Checklist kelengkapan dokumen proposal (13 item)</p>
                    </div>
                    {activeMember?.has_questionnaire ? (
                      <div className="flex items-center gap-1.5 text-green-600 bg-green-100 px-3 py-1.5 rounded-full">
                        <LuBadgeCheck className="w-4 h-4" />
                        <span className="text-sm font-semibold">Sudah Tersimpan</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-blue-600 bg-blue-100 px-3 py-1.5 rounded-full">
                        <LuClock className="w-4 h-4" />
                        <span className="text-sm font-semibold">Belum Diisi</span>
                      </div>
                    )}
                    <div className="ml-2">
                      <LuChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isQuestionnaireOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>

                {isQuestionnaireOpen && (
                <div className="p-5">
                  <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 mb-5 border border-violet-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <LuInfo className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{selectedProposal.judul_proposal}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Anggaran Usulan: <span className="font-semibold text-violet-700">Rp {selectedProposal.anggaran_usulan?.toLocaleString('id-ID')}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <BankeuQuestionnaireForm
                    proposalId={selectedProposal.id}
                    verifierType="kecamatan_tim"
                    verifierId={`${kecamatanId}_${activeTab}`}
                    onSaveSuccess={async () => {
                      setIsQuestionnaireOpen(false); // Close after save
                      
                      // Refresh tim members to update has_questionnaire flag in badges
                      if (kecamatanId && selectedProposal?.id) {
                        await fetchTimMembers(kecamatanId, selectedProposal.id);
                      }
                      
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
            )}
            </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Lihat Proposal */}
      {showProposalModal && selectedProposal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <LuFileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedProposal.judul_proposal}</h2>
                  <p className="text-sm text-blue-100">Rp {selectedProposal.anggaran_usulan?.toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${imageBaseUrl}/storage/uploads/bankeu/${selectedProposal.file_proposal}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium text-sm transition-all"
                >
                  <LuDownload className="w-4 h-4" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setShowProposalModal(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
                >
                  <LuX className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 bg-gray-100">
              {selectedProposal.file_proposal ? (
                <iframe
                  src={`${imageBaseUrl}/storage/uploads/bankeu/${selectedProposal.file_proposal}`}
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
    </div>
  );
};

export default KecamatanTimVerifikasiPage;
