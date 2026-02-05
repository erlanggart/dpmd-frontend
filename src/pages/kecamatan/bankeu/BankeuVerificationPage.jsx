import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import Swal from "sweetalert2";
import {
  LuEye, LuCheck, LuX, LuRefreshCw, LuClock, LuFileText,
  LuChevronRight, LuDownload, LuInfo, LuArrowRight, LuSettings,
  LuSearch, LuCircleCheck, LuCircleX, LuTriangleAlert,
  LuChevronDown, LuChevronUp, LuMapPin, LuPackage, LuDollarSign,
  LuSend, LuClipboardList, LuShield, LuCircleAlert
} from "react-icons/lu";
import KecamatanBankeuConfigTab from "../../../components/kecamatan/KecamatanBankeuConfigTab";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const BankeuVerificationPage = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [desas, setDesas] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [kecamatanInfo, setKecamatanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('verifikasi');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [expandedDesa, setExpandedDesa] = useState({});
  const [desaSuratList, setDesaSuratList] = useState([]);
  const [suratStatusFilter, setSuratStatusFilter] = useState('all');
  const [expandedSuratDesa, setExpandedSuratDesa] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [proposalsRes, statsRes, desasRes, suratRes] = await Promise.all([
        api.get("/kecamatan/bankeu/proposals"),
        api.get("/kecamatan/bankeu/statistics"),
        api.get("/desas"),
        api.get("/kecamatan/bankeu/surat", { params: { tahun: 2026 } }).catch(() => ({ data: { data: [] } }))
      ]);
      
      setProposals(proposalsRes.data.data);
      setStatistics(statsRes.data.data);
      
      const user = JSON.parse(localStorage.getItem("user"));
      const userKecamatanId = parseInt(user?.kecamatan_id);
      setKecamatanInfo({ nama: user?.kecamatan_name || 'Kecamatan' });
      
      const filteredDesas = desasRes.data.data.filter(d => {
        return parseInt(d.kecamatan_id) === userKecamatanId;
      });
      
      setDesas(filteredDesas);
      
      console.log('✅ Surat API Response:', suratRes.data);
      console.log('📄 Surat List:', suratRes.data.data);
      console.log('📊 Total Surat:', suratRes.data.data?.length || 0);
      
      // Debug: Log setiap surat
      if (suratRes.data.data && suratRes.data.data.length > 0) {
        suratRes.data.data.forEach((surat, index) => {
          console.log(`📋 Surat #${index + 1}:`, {
            id: surat.id,
            desa_id: surat.desa_id,
            nama_desa: surat.nama_desa,
            surat_pengantar: surat.surat_pengantar,
            surat_permohonan: surat.surat_permohonan,
            submitted_to_kecamatan: surat.submitted_to_kecamatan,
            kecamatan_status: surat.kecamatan_status
          });
        });
      } else {
        console.log('⚠️ Tidak ada surat ditemukan atau array kosong');
      }
      
      setDesaSuratList(suratRes.data.data || []);
      
      // Initialize all desa as collapsed
      const initialExpanded = {};
      filteredDesas.forEach(desa => {
        initialExpanded[desa.id] = false;
      });
      setExpandedDesa(initialExpanded);
      
      const initialExpandedSurat = {};
      (suratRes.data.data || []).forEach(surat => {
        initialExpandedSurat[surat.desa_id] = false;
      });
      setExpandedSuratDesa(initialExpandedSurat);
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal memuat data"
      });
    } finally {
      setLoading(false);
    }
  };

  // Group data by desa - proposals sebagai entitas utama, surat sebagai pelengkap
  const groupByDesa = () => {
    // Filter proposals first
    let filtered = [...proposals];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.judul_proposal?.toLowerCase().includes(query) ||
        p.nama_desa?.toLowerCase().includes(query) ||
        p.kegiatan_list?.some(k => k.nama_kegiatan?.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (jenisFilter !== 'all') {
      filtered = filtered.filter(p => 
        p.kegiatan_list?.some(k => k.jenis_kegiatan === jenisFilter)
      );
    }

    return desas.map(desa => {
      const desaIdNum = parseInt(desa.id);
      const desaProposals = filtered.filter(p => parseInt(p.desa_id) === desaIdNum);
      
      const totalProposals = desaProposals.length;
      
      // Count by kecamatan_status (yang lebih akurat untuk tracking kecamatan)
      const pending = desaProposals.filter(p => !p.kecamatan_status || p.kecamatan_status === 'pending').length;
      const verified = desaProposals.filter(p => p.kecamatan_status === 'verified').length;
      const rejected = desaProposals.filter(p => p.kecamatan_status === 'rejected').length;
      const revision = desaProposals.filter(p => p.kecamatan_status === 'revision').length;
      
      // Cari surat untuk desa ini (jika ada)
      const desaSurat = desaSuratList.find(s => parseInt(s.desa_id) === desaIdNum);
      
      // Total anggaran
      const totalAnggaran = desaProposals.reduce((sum, p) => sum + (parseFloat(p.anggaran_usulan) || 0), 0);

      // Cek apakah semua proposal sudah punya berita acara
      const hasBeritaAcara = desaProposals.every(p => p.berita_acara_kecamatan);
      
      // Cek apakah semua proposal sudah punya surat pengantar kecamatan
      const hasSuratPengantar = desaProposals.every(p => p.surat_pengantar_kecamatan);

      // Status tracking per desa
      const allReviewed = pending === 0 && totalProposals > 0;
      const allApproved = verified === totalProposals && totalProposals > 0;
      const readyForDPMD = allApproved && hasBeritaAcara && hasSuratPengantar;
      
      // Cek apakah sudah dikirim ke DPMD
      const alreadySentToDPMD = desaProposals.some(p => p.dpmd_status);
      
      return {
        desa,
        proposals: desaProposals,
        surat: desaSurat || null,
        totalProposals,
        totalAnggaran,
        pending,
        verified,
        rejected,
        revision,
        // Tracking status
        allReviewed,
        allApproved,
        hasBeritaAcara,
        hasSuratPengantar,
        readyForDPMD,
        alreadySentToDPMD
      };
    }).filter(group => group.proposals.length > 0);
  };

  // Hitung tracking status keseluruhan (tanpa filter search)
  const trackingStatus = useMemo(() => {
    // Untuk tracking, kita tidak pakai filter agar hitungan akurat
    const groups = desas.map(desa => {
      const desaIdNum = parseInt(desa.id);
      const desaProposals = proposals.filter(p => parseInt(p.desa_id) === desaIdNum);
      
      const totalProposals = desaProposals.length;
      const pending = desaProposals.filter(p => !p.kecamatan_status || p.kecamatan_status === 'pending').length;
      const verified = desaProposals.filter(p => p.kecamatan_status === 'verified').length;
      
      const desaSurat = desaSuratList.find(s => parseInt(s.desa_id) === desaIdNum);
      const totalAnggaran = desaProposals.reduce((sum, p) => sum + (parseFloat(p.anggaran_usulan) || 0), 0);
      const hasBeritaAcara = desaProposals.length > 0 && desaProposals.every(p => p.berita_acara_kecamatan);
      const hasSuratPengantar = desaProposals.length > 0 && desaProposals.every(p => p.surat_pengantar_kecamatan);
      const allReviewed = pending === 0 && totalProposals > 0;
      const allApproved = verified === totalProposals && totalProposals > 0;
      const readyForDPMD = allApproved && hasBeritaAcara && hasSuratPengantar;
      const alreadySentToDPMD = desaProposals.some(p => p.dpmd_status);
      
      return {
        desa,
        proposals: desaProposals,
        totalProposals,
        totalAnggaran,
        pending,
        verified,
        allReviewed,
        allApproved,
        hasBeritaAcara,
        hasSuratPengantar,
        readyForDPMD,
        alreadySentToDPMD
      };
    }).filter(group => group.proposals.length > 0);
    
    const totalDesa = groups.length;
    const desaReviewed = groups.filter(g => g.allReviewed).length;
    const desaApproved = groups.filter(g => g.allApproved).length;
    const desaWithBeritaAcara = groups.filter(g => g.hasBeritaAcara).length;
    const desaWithSuratPengantar = groups.filter(g => g.hasSuratPengantar).length;
    const desaReadyForDPMD = groups.filter(g => g.readyForDPMD).length;
    const desaSentToDPMD = groups.filter(g => g.alreadySentToDPMD).length;
    
    const allReadyForDPMD = totalDesa > 0 && desaReadyForDPMD === totalDesa;
    
    return {
      totalDesa,
      desaReviewed,
      desaApproved,
      desaWithBeritaAcara,
      desaWithSuratPengantar,
      desaReadyForDPMD,
      desaSentToDPMD,
      allReadyForDPMD,
      desaGroups: groups
    };
  }, [proposals, desas, desaSuratList]);

  const toggleDesa = (desaId) => {
    setExpandedDesa(prev => ({
      ...prev,
      [desaId]: !prev[desaId]
    }));
  };

  const handleReviewSurat = async (suratId, status, catatan = '') => {
    try {
      Swal.fire({
        title: status === 'approved' ? 'Menyetujui surat...' : 'Menolak surat...',
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await api.post(`/kecamatan/bankeu/surat/${suratId}/review`, {
        status,
        catatan
      });

      await fetchData();

      Swal.fire({
        icon: "success",
        title: status === 'approved' ? 'Surat Disetujui!' : 'Surat Ditolak',
        text: status === 'approved' 
          ? 'Surat berhasil disetujui' 
          : 'Surat berhasil ditolak dan dikembalikan ke desa',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error review surat:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal melakukan review surat"
      });
    }
  };

  const handleApproveSurat = (suratId) => {
    Swal.fire({
      title: 'Setujui Surat Desa?',
      text: 'Surat Pengantar dan Surat Permohonan akan disetujui',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Setujui',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        handleReviewSurat(suratId, 'approved');
      }
    });
  };

  const handleRejectSurat = (suratId) => {
    Swal.fire({
      title: 'Tolak Surat Desa?',
      html: `
        <div class="text-left mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Alasan Penolakan <span class="text-red-500">*</span></label>
          <textarea
            id="catatan-penolakan"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            rows="4"
            placeholder="Jelaskan alasan penolakan..."></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Tolak',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const catatan = document.getElementById('catatan-penolakan').value;
        if (!catatan || catatan.trim() === '') {
          Swal.showValidationMessage('Catatan penolakan wajib diisi');
          return false;
        }
        return catatan;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        handleReviewSurat(suratId, 'rejected', result.value);
      }
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu', icon: LuClock },
      verified: { bg: 'bg-green-100', text: 'text-green-800', label: 'Disetujui', icon: LuCircleCheck },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Ditolak', icon: LuCircleX },
      revision: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Perlu Revisi', icon: LuRefreshCw }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  const desaGroups = groupByDesa();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md border-b border-gray-200">
        <div className="flex gap-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('verifikasi')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-4 font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === 'verifikasi'
                ? 'border-violet-600 text-violet-600 bg-violet-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <LuFileText className="w-5 h-5" />
            <span>Verifikasi Proposal</span>
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-4 font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === 'tracking'
                ? 'border-violet-600 text-violet-600 bg-violet-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <LuClipboardList className="w-5 h-5" />
            <span>Tracking Status</span>
            {trackingStatus.totalDesa > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                trackingStatus.allReadyForDPMD 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {trackingStatus.desaReadyForDPMD}/{trackingStatus.totalDesa}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('konfigurasi')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-4 font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === 'konfigurasi'
                ? 'border-violet-600 text-violet-600 bg-violet-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <LuSettings className="w-5 h-5" />
            <span>Konfigurasi</span>
          </button>
        </div>
      </div>

      {activeTab === 'verifikasi' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Header - Responsive */}
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl p-4 sm:p-6 text-white">
            <h1 className="text-xl sm:text-2xl font-bold">Verifikasi Proposal Bankeu</h1>
            <p className="text-violet-100 mt-1 text-sm sm:text-base">
              {kecamatanInfo ? `Kecamatan ${kecamatanInfo.nama}` : 'Kecamatan'}
            </p>
          </div>

          {/* Statistics Cards - Responsive */}
          {statistics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                    <LuFileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-gray-800">{statistics.total_proposals || 0}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg">
                    <LuClock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-gray-800">{statistics.pending || 0}</p>
                    <p className="text-xs text-gray-500">Menunggu</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                    <LuCircleCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-gray-800">{statistics.verified || 0}</p>
                    <p className="text-xs text-gray-500">Disetujui</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg">
                    <LuCircleX className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-gray-800">{statistics.rejected || 0}</p>
                    <p className="text-xs text-gray-500">Ditolak</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
                    <LuRefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-gray-800">{statistics.revision || 0}</p>
                    <p className="text-xs text-gray-500">Revisi</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-indigo-100 rounded-lg">
                    <LuPackage className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-gray-800">{statistics.infrastruktur || 0}</p>
                    <p className="text-xs text-gray-500">Infrastruktur</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                    <LuPackage className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-gray-800">{statistics.non_infrastruktur || 0}</p>
                    <p className="text-xs text-gray-500">Non-Infrastruktur</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters - Collapsible */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Filter Header - Always visible */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <LuSearch className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                <span className="font-medium text-gray-700">Filter & Pencarian</span>
                {(searchQuery || statusFilter !== 'all' || jenisFilter !== 'all') && (
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                    Aktif
                  </span>
                )}
              </div>
              {showFilters ? (
                <LuChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <LuChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {/* Filter Content - Collapsible */}
            {showFilters && (
              <div className="p-3 sm:p-4 pt-0 border-t border-gray-100">
                <div className="flex flex-col gap-3 sm:gap-4 pt-3">
                  {/* Search */}
                  <div className="relative">
                    <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari proposal..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>

                  {/* Filter Row - Stack on mobile, row on tablet+ */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {/* Status Filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="all">Semua Status</option>
                      <option value="pending">Menunggu</option>
                      <option value="verified">Disetujui</option>
                      <option value="rejected">Ditolak</option>
                      <option value="revision">Perlu Revisi</option>
                    </select>

                    {/* Jenis Filter */}
                    <select
                      value={jenisFilter}
                      onChange={(e) => setJenisFilter(e.target.value)}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="all">Semua Jenis</option>
                      <option value="infrastruktur">Infrastruktur</option>
                      <option value="non_infrastruktur">Non-Infrastruktur</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Grouped by Desa */}
          {desaGroups.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
              <LuTriangleAlert className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">Tidak ada proposal ditemukan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {desaGroups.map((group) => (
                <div 
                  key={group.desa.id} 
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-violet-200 transition-all duration-200 group"
                  onClick={() => navigate(`/kecamatan/bankeu/verifikasi/${group.desa.id}`)}
                >
                  {/* Desa Header - Clickable to Detail */}
                  <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 group-hover:from-violet-100 group-hover:to-purple-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-violet-100 to-violet-200 rounded-xl shadow-sm group-hover:shadow transition-shadow">
                          <LuMapPin className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 group-hover:text-violet-700 transition-colors">Desa {group.desa.nama}</h3>
                          <p className="text-sm text-gray-600">
                            {group.totalProposals} Proposal • Rp {(group.totalAnggaran || 0).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Surat status badge - Display only */}
                        {group.surat ? (
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                            group.surat.kecamatan_status === 'approved' 
                              ? 'bg-green-100 text-green-700' 
                              : group.surat.kecamatan_status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            <LuFileText className="w-3.5 h-3.5" />
                            <span>Surat {group.surat.kecamatan_status === 'approved' ? '✓' : group.surat.kecamatan_status === 'rejected' ? '✗' : ''}</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium flex items-center gap-1.5">
                            <LuFileText className="w-3.5 h-3.5" />
                            <span>Belum Ada Surat</span>
                          </span>
                        )}
                        {/* Mini stats badges - Display only */}
                        <div className="hidden md:flex items-center gap-2">
                          {group.pending > 0 && (
                            <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold">
                              {group.pending} Menunggu
                            </span>
                          )}
                          {group.verified > 0 && (
                            <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                              {group.verified} Disetujui
                            </span>
                          )}
                          {group.revision > 0 && (
                            <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold">
                              {group.revision} Revisi
                            </span>
                          )}
                        </div>
                        {/* Arrow indicator */}
                        <LuChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tracking Status Tab */}
      {activeTab === 'tracking' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-4 sm:p-6 text-white">
            <h1 className="text-xl sm:text-2xl font-bold">Tracking Status Verifikasi</h1>
            <p className="text-indigo-100 mt-1 text-sm sm:text-base">
              Pantau progress verifikasi setiap desa sebelum mengirim ke DPMD
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <LuMapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{trackingStatus.totalDesa}</p>
                  <p className="text-xs text-gray-500">Total Desa</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <LuClipboardList className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{trackingStatus.desaReviewed}</p>
                  <p className="text-xs text-gray-500">Sudah Review</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <LuCircleCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{trackingStatus.desaApproved}</p>
                  <p className="text-xs text-gray-500">Semua Disetujui</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <LuFileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{trackingStatus.desaWithBeritaAcara}</p>
                  <p className="text-xs text-gray-500">Berita Acara</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <LuFileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{trackingStatus.desaWithSuratPengantar}</p>
                  <p className="text-xs text-gray-500">Surat Pengantar</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <LuSend className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{trackingStatus.desaReadyForDPMD}</p>
                  <p className="text-xs text-gray-500">Siap Kirim</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alert if not ready */}
          {!trackingStatus.allReadyForDPMD && trackingStatus.totalDesa > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <LuCircleAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">Belum Bisa Mengirim ke DPMD</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Semua desa harus sudah diverifikasi, memiliki berita acara, dan surat pengantar sebelum dapat mengirim ke DPMD.
                  Saat ini baru <strong>{trackingStatus.desaReadyForDPMD}</strong> dari <strong>{trackingStatus.totalDesa}</strong> desa yang siap.
                </p>
              </div>
            </div>
          )}

          {/* Ready Alert */}
          {trackingStatus.allReadyForDPMD && trackingStatus.totalDesa > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <LuCircleCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-800">Semua Desa Siap!</h3>
                <p className="text-sm text-emerald-700 mt-1">
                  Semua desa sudah diverifikasi dan memiliki dokumen lengkap. Anda dapat mengirim hasil verifikasi ke DPMD.
                </p>
              </div>
              <button
                onClick={() => {
                  Swal.fire({
                    title: 'Kirim Semua ke DPMD?',
                    html: `
                      <p class="text-gray-600">
                        Anda akan mengirim hasil verifikasi dari <strong>${trackingStatus.totalDesa} desa</strong> ke DPMD.
                      </p>
                    `,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#10b981',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Ya, Kirim ke DPMD',
                    cancelButtonText: 'Batal'
                  }).then(async (result) => {
                    if (result.isConfirmed) {
                      try {
                        // TODO: Implement batch submit to DPMD
                        Swal.fire({
                          icon: 'info',
                          title: 'Dalam Pengembangan',
                          text: 'Fitur ini sedang dalam pengembangan'
                        });
                      } catch (error) {
                        Swal.fire({
                          icon: 'error',
                          title: 'Gagal',
                          text: error.response?.data?.message || 'Gagal mengirim ke DPMD'
                        });
                      }
                    }
                  });
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
              >
                <LuSend className="w-4 h-4" />
                Kirim ke DPMD
              </button>
            </div>
          )}

          {/* Desa Tracking Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800">Status Per Desa</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Desa</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Proposal</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Review</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Berita Acara</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Surat Pengantar</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingStatus.desaGroups.map((group) => (
                    <tr key={group.desa.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <LuMapPin className="w-4 h-4 text-violet-500" />
                          <span className="font-medium text-gray-800">Desa {group.desa.nama}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-700">{group.totalProposals}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {group.allReviewed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <LuCircleCheck className="w-3 h-3" />
                            {group.verified}/{group.totalProposals}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            <LuClock className="w-3 h-3" />
                            {group.verified}/{group.totalProposals}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {group.hasBeritaAcara ? (
                          <LuCircleCheck className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <LuX className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {group.hasSuratPengantar ? (
                          <LuCircleCheck className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <LuX className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {group.alreadySentToDPMD ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            <LuSend className="w-3 h-3" />
                            Terkirim
                          </span>
                        ) : group.readyForDPMD ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                            <LuCircleCheck className="w-3 h-3" />
                            Siap
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            <LuClock className="w-3 h-3" />
                            Belum Siap
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/kecamatan/bankeu/verifikasi/${group.desa.id}`)}
                          className="px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'konfigurasi' && (
        <KecamatanBankeuConfigTab />
      )}
    </div>
  );
};

export default BankeuVerificationPage;
