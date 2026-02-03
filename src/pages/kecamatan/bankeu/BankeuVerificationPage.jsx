import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import Swal from "sweetalert2";
import {
  LuEye, LuCheck, LuX, LuRefreshCw, LuClock, LuFileText,
  LuChevronRight, LuDownload, LuInfo, LuArrowRight, LuSettings,
  LuSearch, LuCircleCheck, LuCircleX, LuTriangleAlert,
  LuChevronDown, LuChevronUp, LuMapPin, LuPackage
} from "react-icons/lu";
import KecamatanBankeuConfigTab from "../../../components/kecamatan/KecamatanBankeuConfigTab";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const BankeuVerificationPage = () => {
  const navigate = useNavigate();
  const [masterKegiatan, setMasterKegiatan] = useState([]);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [masterRes, proposalsRes, statsRes, desasRes, suratRes] = await Promise.all([
        api.get("/desa/bankeu/master-kegiatan"),
        api.get("/kecamatan/bankeu/proposals"),
        api.get("/kecamatan/bankeu/statistics"),
        api.get("/desas"),
        api.get("/kecamatan/bankeu/surat", { params: { tahun: 2026 } }).catch(() => ({ data: { data: [] } }))
      ]);

      // Handle master kegiatan - extract from nested structure
      const masterData = masterRes.data.data;
      const allKegiatan = [];
      
      if (masterData.infrastruktur && Array.isArray(masterData.infrastruktur)) {
        allKegiatan.push(...masterData.infrastruktur);
      }
      if (masterData.non_infrastruktur && Array.isArray(masterData.non_infrastruktur)) {
        allKegiatan.push(...masterData.non_infrastruktur);
      }
      
      setMasterKegiatan(allKegiatan);
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

  // Group data by desa
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
      
      // Count by status
      const pending = desaProposals.filter(p => p.status === 'pending').length;
      const verified = desaProposals.filter(p => p.status === 'verified').length;
      const rejected = desaProposals.filter(p => p.status === 'rejected').length;
      const revision = desaProposals.filter(p => p.status === 'revision').length;
      
      return {
        desa,
        proposals: desaProposals,
        totalProposals,
        pending,
        verified,
        rejected,
        revision
      };
    }).filter(group => group.proposals.length > 0); // Only show desa with proposals
  };

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
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('verifikasi')}
            className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-all duration-200 ${
              activeTab === 'verifikasi'
                ? 'border-violet-600 text-violet-600 bg-violet-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <LuFileText className="w-5 h-5" />
            <span>Verifikasi Proposal</span>
          </button>
          <button
            onClick={() => setActiveTab('konfigurasi')}
            className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-all duration-200 ${
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

          {/* Review Surat Desa Section */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Review Surat Pendukung Proposal</h2>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-lg text-sm font-semibold">
                {desaSuratList.filter(s => s.kecamatan_status === 'pending').length} Menunggu Review
              </span>
            </div>
            
            {/* Filter Surat by Status */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSuratStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    suratStatusFilter === status
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' && 'Semua'}
                  {status === 'pending' && `Pending (${desaSuratList.filter(s => s.kecamatan_status === 'pending').length})`}
                  {status === 'approved' && `Disetujui (${desaSuratList.filter(s => s.kecamatan_status === 'approved').length})`}
                  {status === 'rejected' && `Ditolak (${desaSuratList.filter(s => s.kecamatan_status === 'rejected').length})`}
                </button>
              ))}
            </div>

            {/* List Surat */}
            <div className="space-y-3">
              {desaSuratList
                .filter(surat => suratStatusFilter === 'all' || surat.kecamatan_status === suratStatusFilter)
                .map((surat) => (
                <div key={surat.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header - Clickable untuk expand/collapse */}
                  <button
                    onClick={() => setExpandedSuratDesa(prev => ({ ...prev, [surat.desa_id]: !prev[surat.desa_id] }))}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <LuMapPin className="w-5 h-5 text-violet-600" />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">{surat.nama_desa}</p>
                        <p className="text-sm text-gray-500">Tahun {surat.tahun}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {surat.kecamatan_status === 'pending' && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                          Menunggu Review
                        </span>
                      )}
                      {surat.kecamatan_status === 'approved' && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                          <LuCheck className="w-3 h-3" /> Disetujui
                        </span>
                      )}
                      {surat.kecamatan_status === 'rejected' && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold flex items-center gap-1">
                          <LuX className="w-3 h-3" /> Ditolak
                        </span>
                      )}
                      {expandedSuratDesa[surat.desa_id] ? <LuChevronUp className="w-5 h-5 text-gray-400" /> : <LuChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </button>

                  {/* Expandable Content */}
                  {expandedSuratDesa[surat.desa_id] && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Surat Pengantar */}
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <LuFileText className="w-4 h-4 text-blue-600" />
                            Surat Pengantar
                          </p>
                          {surat.surat_pengantar ? (
                            <a
                              href={`${imageBaseUrl}/storage/uploads/bankeu/${surat.surat_pengantar}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              <LuEye className="w-4 h-4" />
                              Lihat PDF
                            </a>
                          ) : (
                            <p className="text-sm text-gray-500">Belum diupload</p>
                          )}
                        </div>

                        {/* Surat Permohonan */}
                        <div className="bg-white p-4 rounded-lg border border-purple-200">
                          <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <LuFileText className="w-4 h-4 text-purple-600" />
                            Surat Permohonan
                          </p>
                          {surat.surat_permohonan ? (
                            <a
                              href={`${imageBaseUrl}/storage/uploads/bankeu/${surat.surat_permohonan}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                            >
                              <LuEye className="w-4 h-4" />
                              Lihat PDF
                            </a>
                          ) : (
                            <p className="text-sm text-gray-500">Belum diupload</p>
                          )}
                        </div>
                      </div>

                      {/* Review Info & Actions */}
                      {surat.kecamatan_status === 'pending' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApproveSurat(surat.id)}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <LuCheck className="w-5 h-5" />
                            Setujui Surat
                          </button>
                          <button
                            onClick={() => handleRejectSurat(surat.id)}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <LuX className="w-5 h-5" />
                            Tolak Surat
                          </button>
                        </div>
                      )}

                      {surat.kecamatan_status === 'approved' && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            <strong>Disetujui oleh:</strong> {surat.reviewer_name || 'Kecamatan'}
                            {surat.kecamatan_reviewed_at && (
                              <span className="ml-2">
                                pada {new Date(surat.kecamatan_reviewed_at).toLocaleString('id-ID')}
                              </span>
                            )}
                          </p>
                          {surat.kecamatan_catatan && (
                            <p className="text-sm text-gray-600 mt-2">
                              <strong>Catatan:</strong> {surat.kecamatan_catatan}
                            </p>
                          )}
                        </div>
                      )}

                      {surat.kecamatan_status === 'rejected' && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800 mb-2">
                            <strong>Ditolak oleh:</strong> {surat.reviewer_name || 'Kecamatan'}
                            {surat.kecamatan_reviewed_at && (
                              <span className="ml-2">
                                pada {new Date(surat.kecamatan_reviewed_at).toLocaleString('id-ID')}
                              </span>
                            )}
                          </p>
                          {surat.kecamatan_catatan && (
                            <div className="p-2 bg-white border border-red-200 rounded">
                              <p className="text-sm text-gray-700">
                                <strong>Alasan Penolakan:</strong> {surat.kecamatan_catatan}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {desaSuratList.filter(surat => suratStatusFilter === 'all' || surat.kecamatan_status === suratStatusFilter).length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <LuFileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada surat untuk ditampilkan</p>
                </div>
              )}
            </div>
          </div>

          {/* Filters - Responsive */}
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
            <div className="flex flex-col gap-3 sm:gap-4">
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

          {/* Grouped by Desa */}
          {desaGroups.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
              <LuTriangleAlert className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">Tidak ada proposal ditemukan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {desaGroups.map((group) => (
                <div key={group.desa.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Desa Header */}
                  <div 
                    className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 cursor-pointer hover:from-violet-100 hover:to-purple-100 transition-colors"
                    onClick={() => toggleDesa(group.desa.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 rounded-lg">
                          <LuMapPin className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">Desa {group.desa.nama}</h3>
                          <p className="text-sm text-gray-600">
                            {group.totalProposals} Proposal
                            {group.pending > 0 && ` • ${group.pending} Menunggu`}
                            {group.verified > 0 && ` • ${group.verified} Disetujui`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Mini stats badges */}
                        <div className="hidden md:flex items-center gap-2">
                          {group.pending > 0 && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                              {group.pending} Menunggu
                            </span>
                          )}
                          {group.verified > 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                              {group.verified} Disetujui
                            </span>
                          )}
                          {group.revision > 0 && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                              {group.revision} Revisi
                            </span>
                          )}
                        </div>
                        {expandedDesa[group.desa.id] ? (
                          <LuChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <LuChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desa Proposals - Responsive Table/Cards */}
                  {expandedDesa[group.desa.id] && (
                    <div>
                      {/* Desktop Table - Hidden on mobile */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Proposal</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Anggaran</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.proposals.map((proposal) => (
                              <tr key={proposal.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-start gap-2">
                                    <div className="p-1.5 bg-violet-100 rounded">
                                      <LuFileText className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1.5">{proposal.judul_proposal}</p>
                                        {proposal.kegiatan_list && proposal.kegiatan_list.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {proposal.kegiatan_list.map((kegiatan) => (
                                              <span 
                                                key={kegiatan.id}
                                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                  kegiatan.jenis_kegiatan === 'infrastruktur' 
                                                    ? 'bg-blue-100 text-blue-700' 
                                                    : 'bg-purple-100 text-purple-700'
                                                }`}
                                              >
                                                {kegiatan.nama_kegiatan.substring(0, 30)}...
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      {/* Detail kegiatan dari desa */}
                                      {(proposal.volume || proposal.lokasi) && (
                                        <div className="mt-1.5 space-y-0.5">
                                          {proposal.volume && (
                                            <div className="flex items-center gap-1">
                                              <LuPackage className="w-3 h-3 text-blue-600" />
                                              <p className="text-xs text-gray-600">Volume: {proposal.volume}</p>
                                            </div>
                                          )}
                                          {proposal.lokasi && (
                                            <div className="flex items-center gap-1">
                                              <LuMapPin className="w-3 h-3 text-red-600" />
                                              <p className="text-xs text-gray-600">Lokasi: {proposal.lokasi}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs text-gray-500">ID: {proposal.id.toString()}</p>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                          proposal.jenis_kegiatan === 'infrastruktur' 
                                            ? 'bg-blue-100 text-blue-700' 
                                            : 'bg-purple-100 text-purple-700'
                                        }`}>
                                          {proposal.jenis_kegiatan === 'infrastruktur' ? 'Infrastruktur' : 'Non-Infrastruktur'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-gray-800 text-sm">{formatCurrency(proposal.anggaran_usulan)}</p>
                                </td>
                                <td className="px-4 py-3">
                                  {getStatusBadge(proposal.status)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {/* Lihat Detail */}
                                    <button
                                      onClick={() => navigate(`/kecamatan/bankeu/verifikasi/${group.desa.id}`)}
                                      className="p-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-all hover:scale-105 shadow-sm"
                                      title="Lihat Detail"
                                    >
                                      <LuEye className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Mobile Card View - Visible only on mobile */}
                      <div className="md:hidden space-y-3 p-3">
                        {group.proposals.map((proposal) => (
                          <div key={proposal.id} className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
                            {/* Header */}
                            <div className="flex items-start gap-2">
                              <div className="p-1.5 bg-violet-100 rounded flex-shrink-0">
                                <LuFileText className="w-4 h-4 text-violet-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1.5">{proposal.judul_proposal}</p>
                                {proposal.kegiatan_list && proposal.kegiatan_list.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {proposal.kegiatan_list.map((kegiatan) => (
                                      <span 
                                        key={kegiatan.id}
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          kegiatan.jenis_kegiatan === 'infrastruktur' 
                                            ? 'bg-blue-100 text-blue-700' 
                                            : 'bg-purple-100 text-purple-700'
                                        }`}
                                      >
                                        {kegiatan.nama_kegiatan.substring(0, 30)}...
                                      </span>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Detail kegiatan dari desa */}
                                {(proposal.volume || proposal.lokasi) && (
                                  <div className="mt-1.5 space-y-0.5">
                                    {proposal.volume && (
                                      <div className="flex items-center gap-1">
                                        <LuPackage className="w-3 h-3 text-blue-600" />
                                        <p className="text-xs text-gray-600">Volume: {proposal.volume}</p>
                                      </div>
                                    )}
                                    {proposal.lokasi && (
                                      <div className="flex items-center gap-1">
                                        <LuMapPin className="w-3 h-3 text-red-600" />
                                        <p className="text-xs text-gray-600">Lokasi: {proposal.lokasi}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-gray-500">ID: {proposal.id.toString()}</p>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    proposal.jenis_kegiatan === 'infrastruktur' 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {proposal.jenis_kegiatan === 'infrastruktur' ? 'Infrastruktur' : 'Non-Infrastruktur'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Info */}
                            <div className="space-y-1.5 text-xs">
                              <div>
                                <span className="text-gray-500">Anggaran:</span>
                                <p className="text-gray-800 font-semibold mt-0.5">{formatCurrency(proposal.anggaran_usulan)}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Status:</span>
                                <div className="mt-1">
                                  {getStatusBadge(proposal.status)}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                              <button
                                onClick={() => navigate(`/kecamatan/bankeu/verifikasi/${group.desa.id}`)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors text-xs font-medium"
                              >
                                <LuEye className="w-3.5 h-3.5" />
                                <span>Lihat Detail</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'konfigurasi' && (
        <KecamatanBankeuConfigTab />
      )}
    </div>
  );
};

export default BankeuVerificationPage;
