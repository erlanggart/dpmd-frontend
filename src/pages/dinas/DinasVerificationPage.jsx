import { useState, useEffect } from 'react';
import { 
  LuSearch, LuEye, LuCircleCheck, LuCircleX, 
  LuRefreshCw, LuClock, LuFileText, LuTriangleAlert,
  LuChevronDown, LuChevronUp, LuMapPin, LuX, LuPackage, LuDollarSign,
  LuMessageCircle, LuHistory, LuDownload
} from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../api';

const DinasVerificationPage = ({ tahun = 2027 }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [proposals, setProposals] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [dinasInfo, setDinasInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jenisFilter, setJenisFilter] = useState('all');
  const tahunAnggaran = tahun; // Use prop instead of internal state
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [expandedDesa, setExpandedDesa] = useState({});
  const [actionModal, setActionModal] = useState({ show: false, proposal: null, action: null });
  const [proposalModal, setProposalModal] = useState({ show: false, proposal: null });
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [catatanModal, setCatatanModal] = useState({ show: false, proposal: null });
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Handle refresh data
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const [proposalsRes, statsRes] = await Promise.all([
        api.get('/dinas/bankeu/proposals', { params: { tahun: tahunAnggaran } }),
        api.get('/dinas/bankeu/statistics', { params: { tahun: tahunAnggaran } })
      ]);

      if (proposalsRes.data.success) {
        setProposals(proposalsRes.data.data);
        setDinasInfo(proposalsRes.data.dinas_info);
      }

      if (statsRes.data.success) {
        setStatistics(statsRes.data.data);
      }

      Swal.fire({
        icon: 'success',
        title: 'Data Diperbarui',
        text: 'Data berhasil dimuat ulang',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal memuat ulang data'
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tahunAnggaran]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [proposalsRes, statsRes] = await Promise.all([
        api.get('/dinas/bankeu/proposals', { params: { tahun: tahunAnggaran } }),
        api.get('/dinas/bankeu/statistics', { params: { tahun: tahunAnggaran } })
      ]);

      if (proposalsRes.data.success) {
        setProposals(proposalsRes.data.data);
        setDinasInfo(proposalsRes.data.dinas_info);
        
        // Close all kecamatan by default
        const kecamatanIds = [...new Set(proposalsRes.data.data.map(p => p.kecamatan_id))];
        const initialExpanded = {};
        kecamatanIds.forEach(id => {
          initialExpanded[id] = false;
        });
        setExpandedKecamatan(initialExpanded);
      }

      if (statsRes.data.success) {
        setStatistics(statsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group proposals by kecamatan and desa
  const groupByKecamatanAndDesa = () => {
    // Filter proposals first
    let filtered = [...proposals];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.judul_proposal?.toLowerCase().includes(query) ||
        p.nama_desa?.toLowerCase().includes(query) ||
        p.nama_kecamatan?.toLowerCase().includes(query) ||
        p.kegiatan_list?.some(k => k.nama_kegiatan?.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'revision') {
        // Revisi includes both 'revision' and 'rejected'
        filtered = filtered.filter(p => p.dinas_status === 'revision' || p.dinas_status === 'rejected');
      } else {
        filtered = filtered.filter(p => p.dinas_status === statusFilter);
      }
    }

    if (jenisFilter !== 'all') {
      filtered = filtered.filter(p => 
        p.kegiatan_list?.some(k => k.jenis_kegiatan === jenisFilter)
      );
    }

    // Group by kecamatan -> desa
    const grouped = {};
    filtered.forEach(proposal => {
      const kecamatanId = proposal.kecamatan_id;
      const kecamatanName = proposal.nama_kecamatan;
      const desaId = proposal.desa_id;
      const desaName = proposal.nama_desa;
      
      if (!grouped[kecamatanId]) {
        grouped[kecamatanId] = {
          id: kecamatanId,
          nama: kecamatanName,
          desas: {},
          stats: {
            pending: 0,
            in_review: 0,
            approved: 0,
            revision: 0,
            total: 0
          }
        };
      }
      
      if (!grouped[kecamatanId].desas[desaId]) {
        grouped[kecamatanId].desas[desaId] = {
          id: desaId,
          nama: desaName,
          proposals: [],
          stats: {
            pending: 0,
            in_review: 0,
            approved: 0,
            revision: 0,
            total: 0
          }
        };
      }
      
      grouped[kecamatanId].desas[desaId].proposals.push(proposal);
      grouped[kecamatanId].desas[desaId].stats.total++;
      grouped[kecamatanId].stats.total++;
      
      const status = proposal.dinas_status || 'pending';
      // Merge rejected into revision
      const mappedStatus = status === 'rejected' ? 'revision' : status;
      if (grouped[kecamatanId].desas[desaId].stats[mappedStatus] !== undefined) {
        grouped[kecamatanId].desas[desaId].stats[mappedStatus]++;
      }
      if (grouped[kecamatanId].stats[mappedStatus] !== undefined) {
        grouped[kecamatanId].stats[mappedStatus]++;
      }
    });

    // Convert desas object to sorted array
    Object.values(grouped).forEach(kecamatan => {
      kecamatan.desas = Object.values(kecamatan.desas).sort((a, b) => a.nama.localeCompare(b.nama));
    });

    return Object.values(grouped).sort((a, b) => a.nama.localeCompare(b.nama));
  };

  // Determine desa row color based on overall proposal status
  const getDesaColor = (stats) => {
    if (stats.total === 0) return { bg: 'bg-gradient-to-r from-gray-50 to-gray-100', hover: 'hover:from-gray-100 hover:to-gray-200', border: 'border-gray-200', icon: 'bg-gray-100', iconText: 'text-gray-500' };
    if (stats.revision > 0) return { bg: 'bg-gradient-to-r from-red-50 to-orange-50', hover: 'hover:from-red-100 hover:to-orange-100', border: 'border-red-200', icon: 'bg-red-100', iconText: 'text-red-600' };
    if (stats.approved === stats.total) return { bg: 'bg-gradient-to-r from-green-50 to-emerald-50', hover: 'hover:from-green-100 hover:to-emerald-100', border: 'border-green-200', icon: 'bg-green-100', iconText: 'text-green-600' };
    return { bg: 'bg-gradient-to-r from-yellow-50 to-amber-50', hover: 'hover:from-yellow-100 hover:to-amber-100', border: 'border-yellow-200', icon: 'bg-amber-100', iconText: 'text-amber-600' };
  };

  // Open catatan modal and fetch history
  const openCatatanModal = async (proposal) => {
    setCatatanModal({ show: true, proposal });
    setHistoryLoading(true);
    try {
      const res = await api.get(`/dinas/bankeu/proposals/${proposal.id}/history`);
      if (res.data.success) {
        setVerificationHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setVerificationHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Determine individual proposal row color
  const getProposalRowColor = (status) => {
    if (status === 'approved') return 'bg-green-50/60 hover:bg-green-100/60';
    if (status === 'rejected' || status === 'revision') return 'bg-red-50/60 hover:bg-red-100/60';
    if (status === 'in_review') return 'bg-blue-50/40 hover:bg-blue-100/40';
    return 'bg-yellow-50/40 hover:bg-yellow-100/40'; // pending
  };

  const toggleKecamatan = (kecamatanId) => {
    setExpandedKecamatan(prev => ({
      ...prev,
      [kecamatanId]: !prev[kecamatanId]
    }));
  };

  const toggleDesa = (desaId) => {
    setExpandedDesa(prev => ({
      ...prev,
      [desaId]: !prev[desaId]
    }));
  };

  const handleAction = (proposal, action) => {
    if (action === 'approve') {
      // Confirmation popup before approve
      Swal.fire({
        icon: 'question',
        title: 'Setujui Proposal?',
        html: `
          <p class="text-gray-700 mb-2">Apakah Anda yakin ingin menyetujui proposal ini?</p>
          <div class="p-3 bg-gray-50 rounded-lg text-left mt-3">
            <p class="text-sm font-semibold text-gray-800">${proposal.judul_proposal}</p>
            <p class="text-xs text-gray-500 mt-1">${proposal.nama_desa}, ${proposal.nama_kecamatan}</p>
          </div>
          <p class="text-xs text-gray-500 mt-3">Proposal yang disetujui akan diteruskan ke Kecamatan untuk diverifikasi.</p>
        `,
        showCancelButton: true,
        confirmButtonText: 'Ya, Setujui',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#6b7280',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          handleSubmitAction(proposal, action, '');
        }
      });
    } else {
      // Show modal for reject (need catatan)
      setActionModal({ show: true, proposal, action });
      setCatatan('');
    }
  };

  const handleSubmitAction = async (proposal, action, catatanText) => {
    if (!proposal) return;
    
    try {
      // VALIDASI: Cek profil verifikator + TTD untuk approve (hanya untuk verifikator_dinas)
      if (action === 'approve') {
        setSubmitting(true);

        // Try to check verifikator profile, but skip if user is dinas_terkait (403 error)
        try {
          const checkRes = await api.get('/verifikator/profile');

          if (checkRes.data.success && checkRes.data.data) {
            const profile = checkRes.data.data;
            const missing = [];
            
            if (!profile.nama || !profile.jabatan) {
              missing.push('Data Diri (Nama & Jabatan)');
            }
            if (!profile.ttd_path) {
              missing.push('Tanda Tangan Digital');
            }

            if (missing.length > 0) {
              setSubmitting(false);
              
              Swal.fire({
                icon: 'warning',
                title: 'Data Belum Lengkap',
                html: `
                  <p class="text-gray-700 mb-3">Sebelum menyetujui proposal, Anda harus melengkapi:</p>
                  <ul class="text-left list-disc list-inside text-red-600 mb-4">
                    ${missing.map(item => `<li>${item}</li>`).join('')}
                  </ul>
                  <p class="text-sm text-gray-600">
                    Silakan ke menu <strong>Profil Saya</strong> untuk melengkapi data.
                  </p>
                `,
                confirmButtonText: 'Ke Halaman Profil',
                confirmButtonColor: '#3085d6',
                showCancelButton: true,
                cancelButtonText: 'Tutup'
              }).then((result) => {
                if (result.isConfirmed) {
                  navigate('/dinas/profil');
                }
              });
              return;
            }
          }
        } catch (profileError) {
          // If 403 Forbidden, user is dinas_terkait (not verifikator_dinas)
          // Check dinas_config instead
          if (profileError.response?.status === 403) {
            try {
              const dinasConfigRes = await api.get(`/dinas/${user.dinas_id}/config`);
              if (dinasConfigRes.data.success && dinasConfigRes.data.data) {
                const dinasConfig = dinasConfigRes.data.data;
                const missing = [];
                
                if (!dinasConfig.nama_pic || !dinasConfig.jabatan_pic) {
                  missing.push('Data Diri PIC (Nama & Jabatan)');
                }
                if (!dinasConfig.ttd_path) {
                  missing.push('Tanda Tangan Digital PIC');
                }

                if (missing.length > 0) {
                  setSubmitting(false);
                  
                  Swal.fire({
                    icon: 'warning',
                    title: 'Konfigurasi Dinas Belum Lengkap',
                    html: `
                      <p class="text-gray-700 mb-3">Sebelum menyetujui proposal, Anda harus melengkapi:</p>
                      <ul class="text-left list-disc list-inside text-red-600 mb-4">
                        ${missing.map(item => `<li>${item}</li>`).join('')}
                      </ul>
                      <p class="text-sm text-gray-600">
                        Silakan ke menu <strong>Konfigurasi</strong> → <strong>Dinas</strong> untuk melengkapi data PIC.
                      </p>
                    `,
                    confirmButtonText: 'Ke Halaman Konfigurasi',
                    confirmButtonColor: '#3085d6',
                    showCancelButton: true,
                    cancelButtonText: 'Tutup'
                  }).then((result) => {
                    if (result.isConfirmed) {
                      navigate('/dinas/konfigurasi');
                    }
                  });
                  return;
                }
              } else {
                // No config found, require setup
                setSubmitting(false);
                
                Swal.fire({
                  icon: 'warning',
                  title: 'Konfigurasi Dinas Belum Diisi',
                  html: `
                    <p class="text-gray-700 mb-3">Data PIC Dinas belum dikonfigurasi.</p>
                    <p class="text-sm text-gray-600">
                      Silakan ke menu <strong>Konfigurasi</strong> → <strong>Dinas</strong> untuk mengisi data PIC.
                    </p>
                  `,
                  confirmButtonText: 'Ke Halaman Konfigurasi',
                  confirmButtonColor: '#3085d6',
                  showCancelButton: true,
                  cancelButtonText: 'Tutup'
                }).then((result) => {
                  if (result.isConfirmed) {
                    navigate('/dinas/konfigurasi');
                  }
                });
                return;
              }
            } catch (configError) {
              console.error('Error checking dinas config:', configError);
              // No config found at all
              setSubmitting(false);
              
              Swal.fire({
                icon: 'warning',
                title: 'Konfigurasi Dinas Belum Diisi',
                html: `
                  <p class="text-gray-700 mb-3">Data PIC Dinas belum dikonfigurasi.</p>
                  <p class="text-sm text-gray-600">
                    Silakan ke menu <strong>Konfigurasi</strong> → <strong>Dinas</strong> untuk mengisi data PIC.
                  </p>
                `,
                confirmButtonText: 'Ke Halaman Konfigurasi',
                confirmButtonColor: '#3085d6',
                showCancelButton: true,
                cancelButtonText: 'Tutup'
              }).then((result) => {
                if (result.isConfirmed) {
                  navigate('/dinas/konfigurasi');
                }
              });
              return;
            }
          } else {
            console.error('Error checking verifikator profile:', profileError);
          }
          // Continue with approval - dinas_terkait can approve directly after validation
        }
      }

      setSubmitting(true);
      const actionValue = action === 'approve' ? 'approved' : 'revision';
      
      await api.post(`/dinas/bankeu/proposals/${proposal.id}/questionnaire/submit`, {
        action: actionValue,
        answers: [], // Empty answers, dinas only provides signature
        catatan_umum: catatanText
      });

      // Refresh data
      await fetchData();
      
      if (action === 'reject') {
        setActionModal({ show: false, proposal: null, action: null });
        setCatatan('');
      }
      
      // Toast notification
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: actionValue === 'approved' ? 'success' : 'warning',
        title: actionValue === 'approved' ? 'Proposal disetujui' : 'Proposal ditandai untuk revisi',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error('Error submitting action:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: error.response?.data?.message || 'Terjadi kesalahan saat memproses aksi',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewProposal = (proposal) => {
    setProposalModal({ show: true, proposal });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu', icon: LuClock },
      in_review: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sedang Direview', icon: LuRefreshCw },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Disetujui', icon: LuCircleCheck },
      rejected: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Perlu Revisi', icon: LuRefreshCw },
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
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  const kecamatanGroups = groupByKecamatanAndDesa();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 sm:p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Verifikasi Proposal Bankeu</h1>
            <p className="text-amber-100 mt-1 text-sm sm:text-base">
              {dinasInfo ? `${dinasInfo.nama} (${dinasInfo.singkatan})` : 'Dinas Terkait'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm transition-all ${
              refreshing ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <LuRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Memuat...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards - Responsive */}
      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Menunggu */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 sm:p-5 border border-amber-100/60 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/20 rounded-full -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-amber-600/80 mb-1">Menunggu</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-700">{statistics.pending || 0}</p>
              </div>
              <div className="p-2.5 sm:p-3 bg-amber-100/80 rounded-xl shadow-sm">
                <LuClock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Direview */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-5 border border-blue-100/60 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/20 rounded-full -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-600/80 mb-1">Direview</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-700">{statistics.in_review || 0}</p>
              </div>
              <div className="p-2.5 sm:p-3 bg-blue-100/80 rounded-xl shadow-sm">
                <LuRefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Disetujui */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 sm:p-5 border border-emerald-100/60 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200/20 rounded-full -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-emerald-600/80 mb-1">Disetujui</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{statistics.approved || 0}</p>
              </div>
              <div className="p-2.5 sm:p-3 bg-emerald-100/80 rounded-xl shadow-sm">
                <LuCircleCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Revisi */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 sm:p-5 border border-orange-100/60 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200/20 rounded-full -translate-y-6 translate-x-6 group-hover:scale-125 transition-transform duration-500" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-orange-600/80 mb-1">Revisi</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-orange-700">{Number(statistics.rejected || 0) + Number(statistics.revision || 0)}</p>
              </div>
              <div className="p-2.5 sm:p-3 bg-orange-100/80 rounded-xl shadow-sm">
                <LuRefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

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
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Filter Row - Stack on mobile, row on tablet+ */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="in_review">Sedang Direview</option>
              <option value="approved">Disetujui</option>
              <option value="revision">Perlu Revisi</option>
            </select>

            {/* Jenis Filter */}
            <select
              value={jenisFilter}
              onChange={(e) => setJenisFilter(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">Semua Jenis</option>
              <option value="infrastruktur">Infrastruktur</option>
              <option value="non_infrastruktur">Non-Infrastruktur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grouped by Kecamatan */}
      {kecamatanGroups.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
          <LuTriangleAlert className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">Tidak ada proposal ditemukan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {kecamatanGroups.map((kecamatan) => (
            <div key={kecamatan.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Kecamatan Header */}
              <div 
                className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 cursor-pointer hover:from-amber-100 hover:to-orange-100 transition-colors"
                onClick={() => toggleKecamatan(kecamatan.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <LuMapPin className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Kecamatan {kecamatan.nama}</h3>
                      <p className="text-sm text-gray-600">
                        {kecamatan.stats.total} Proposal
                        {kecamatan.stats.pending > 0 && ` • ${kecamatan.stats.pending} Menunggu`}
                        {kecamatan.stats.in_review > 0 && ` • ${kecamatan.stats.in_review} Review`}
                        {kecamatan.stats.approved > 0 && ` • ${kecamatan.stats.approved} Disetujui`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Mini stats badges */}
                    <div className="hidden md:flex items-center gap-2">
                      {kecamatan.stats.pending > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          {kecamatan.stats.pending} Menunggu
                        </span>
                      )}
                      {kecamatan.stats.in_review > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {kecamatan.stats.in_review} Review
                        </span>
                      )}
                      {kecamatan.stats.approved > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          {kecamatan.stats.approved} Disetujui
                        </span>
                      )}
                    </div>
                    {expandedKecamatan[kecamatan.id] ? (
                      <LuChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <LuChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Proposals List by Desa */}
              {expandedKecamatan[kecamatan.id] && (
                <div className="bg-gray-50 p-4 space-y-3">
                  {kecamatan.desas.map((desa) => {
                    const desaColor = getDesaColor(desa.stats);
                    return (
                    <div key={desa.id} className={`bg-white rounded-lg border ${desaColor.border} overflow-hidden`}>
                      {/* Desa Header - Color coded by status */}
                      <div 
                        className={`${desaColor.bg} ${desaColor.hover} p-3 cursor-pointer transition-colors`}
                        onClick={() => toggleDesa(desa.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 ${desaColor.icon} rounded`}>
                              <LuMapPin className={`w-4 h-4 ${desaColor.iconText}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800">Desa {desa.nama}</h4>
                              <p className="text-xs text-gray-600">
                                {desa.stats.total} Proposal
                                {desa.stats.pending > 0 && ` • ${desa.stats.pending} Menunggu`}
                                {desa.stats.approved > 0 && ` • ${desa.stats.approved} Disetujui`}
                                {desa.stats.revision > 0 && ` • ${desa.stats.revision} Revisi`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Mini stats badges */}
                            <div className="hidden md:flex items-center gap-1.5">
                              {desa.stats.pending > 0 && (
                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                  {desa.stats.pending}
                                </span>
                              )}
                              {desa.stats.in_review > 0 && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  {desa.stats.in_review}
                                </span>
                              )}
                              {desa.stats.approved > 0 && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  {desa.stats.approved}
                                </span>
                              )}
                              {desa.stats.revision > 0 && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                  {desa.stats.revision}
                                </span>
                              )}
                            </div>
                            {expandedDesa[desa.id] ? (
                              <LuChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <LuChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Desa Proposals - Responsive Table/Cards */}
                      {expandedDesa[desa.id] && (
                        <div>
                          {/* Desktop Table - Hidden on mobile */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Proposal</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {desa.proposals.map((proposal) => (
                                  <tr key={proposal.id} className={`${getProposalRowColor(proposal.dinas_status)} transition-colors`}>
                                    <td className="px-4 py-4">
                                      <div className="space-y-3">
                                        {/* Header - Judul & Badge Jenis */}
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-start gap-3">
                                            <div className="p-2 bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg shadow-sm">
                                              <LuFileText className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div>
                                              <p className="font-semibold text-gray-900 text-sm leading-tight">{proposal.judul_proposal}</p>
                                              <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-400">ID: {proposal.id}</span>
                                                {proposal.kegiatan_list?.map((kegiatan) => (
                                                  <span key={kegiatan.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    kegiatan.jenis_kegiatan === 'infrastruktur' 
                                                      ? 'bg-blue-100 text-blue-700' 
                                                      : 'bg-purple-100 text-purple-700'
                                                  }`}>
                                                    {kegiatan.jenis_kegiatan === 'infrastruktur' ? 'Infrastruktur' : 'Non-Infrastruktur'}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Info Cards - Volume, Lokasi, Anggaran */}
                                        <div className="grid grid-cols-3 gap-2">
                                          <div className="flex items-center gap-2 p-2.5 bg-blue-50/80 rounded-xl border border-blue-100">
                                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                              <LuPackage className="w-3.5 h-3.5 text-blue-600" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Volume</p>
                                              <p className="text-xs font-semibold text-blue-900 truncate">{proposal.volume || '-'}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 p-2.5 bg-red-50/80 rounded-xl border border-red-100">
                                            <div className="p-1.5 bg-red-100 rounded-lg">
                                              <LuMapPin className="w-3.5 h-3.5 text-red-600" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-[10px] text-red-500 font-medium uppercase tracking-wide">Lokasi</p>
                                              <p className="text-xs font-semibold text-red-900 truncate">{proposal.lokasi || '-'}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 p-2.5 bg-green-50/80 rounded-xl border border-green-100">
                                            <div className="p-1.5 bg-green-100 rounded-lg">
                                              <LuDollarSign className="w-3.5 h-3.5 text-green-600" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-[10px] text-green-500 font-medium uppercase tracking-wide">Anggaran</p>
                                              <p className="text-xs font-semibold text-green-900 truncate">{formatCurrency(proposal.anggaran_usulan)}</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 align-middle">
                                      <div className="flex flex-col items-start gap-2">
                                        {getStatusBadge(proposal.dinas_status)}
                                        {/* Button: Catatan */}
                                        {proposal.dinas_catatan || (proposal.verified_at && !proposal.submitted_to_kecamatan && proposal.catatan_verifikasi) ? (
                                          <button
                                            onClick={() => openCatatanModal(proposal)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 rounded-lg transition-all mt-1"
                                          >
                                            <LuMessageCircle className="w-3.5 h-3.5" />
                                            Catatan
                                          </button>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                      <div className="flex items-center justify-center gap-2">
                                        {/* Lihat Proposal */}
                                        <button
                                          onClick={() => handleViewProposal(proposal)}
                                          className="group flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-200 hover:border-blue-400 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-xs font-semibold"
                                        >
                                          <LuEye className="w-4 h-4 transition-transform group-hover:scale-110" />
                                          <span>Detail</span>
                                        </button>

                                      {/* Approve & Reject */}
                                      {(!proposal.dinas_status || proposal.dinas_status === 'pending' || proposal.dinas_status === 'in_review') && (
                                        <>
                                          <button
                                            onClick={() => handleAction(proposal, 'approve')}
                                            disabled={submitting}
                                            className="group flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-green-500 text-green-600 hover:text-white border-2 border-green-200 hover:border-green-500 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-green-600 text-xs font-semibold"
                                          >
                                            <LuCircleCheck className="w-4 h-4 transition-transform group-hover:scale-110" />
                                            <span>Setujui</span>
                                          </button>

                                          <button
                                            onClick={() => handleAction(proposal, 'reject')}
                                            disabled={submitting}
                                            className="group flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-red-500 text-red-600 hover:text-white border-2 border-red-200 hover:border-red-500 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-red-600 text-xs font-semibold"
                                          >
                                            <LuCircleX className="w-4 h-4 transition-transform group-hover:scale-110" />
                                            <span>Revisi</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Mobile Card View - Visible only on mobile */}
                        <div className="md:hidden space-y-3 p-3">
                          {desa.proposals.map((proposal) => {
                            const mobileRowColor = proposal.dinas_status === 'approved' ? 'border-green-200 bg-green-50/40' : (proposal.dinas_status === 'rejected' || proposal.dinas_status === 'revision') ? 'border-red-200 bg-red-50/40' : 'border-yellow-200 bg-yellow-50/40';
                            return (
                            <div key={proposal.id} className={`rounded-xl ${mobileRowColor} p-4 space-y-3 shadow-sm`}>
                              {/* Header */}
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg shadow-sm flex-shrink-0">
                                  <LuFileText className="w-4 h-4 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm leading-tight">{proposal.judul_proposal}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-400">ID: {proposal.id}</span>
                                    {proposal.kegiatan_list?.map((kegiatan) => (
                                      <span key={kegiatan.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        kegiatan.jenis_kegiatan === 'infrastruktur' 
                                          ? 'bg-blue-100 text-blue-700' 
                                          : 'bg-purple-100 text-purple-700'
                                      }`}>
                                        {kegiatan.jenis_kegiatan === 'infrastruktur' ? 'Infrastruktur' : 'Non-Infrastruktur'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                                  
                              {/* Info Cards - Volume, Lokasi, Anggaran */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="flex items-center gap-1.5 p-2 bg-blue-50/80 rounded-xl border border-blue-100">
                                  <div className="p-1 bg-blue-100 rounded-md">
                                    <LuPackage className="w-3 h-3 text-blue-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-blue-500 font-medium uppercase">Volume</p>
                                    <p className="text-xs font-semibold text-blue-900 truncate">{proposal.volume || '-'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 p-2 bg-red-50/80 rounded-xl border border-red-100">
                                  <div className="p-1 bg-red-100 rounded-md">
                                    <LuMapPin className="w-3 h-3 text-red-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-red-500 font-medium uppercase">Lokasi</p>
                                    <p className="text-xs font-semibold text-red-900 truncate">{proposal.lokasi || '-'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 p-2 bg-green-50/80 rounded-xl border border-green-100">
                                  <div className="p-1 bg-green-100 rounded-md">
                                    <LuDollarSign className="w-3 h-3 text-green-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-green-500 font-medium uppercase">Anggaran</p>
                                    <p className="text-xs font-semibold text-green-900 truncate">{formatCurrency(proposal.anggaran_usulan)}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Status */}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div>
                                  {getStatusBadge(proposal.dinas_status)}
                                </div>
                              </div>
                              
                              {/* Button: Catatan */}
                              {proposal.dinas_catatan || (proposal.verified_at && !proposal.submitted_to_kecamatan && proposal.catatan_verifikasi) ? (
                                <button
                                  onClick={() => openCatatanModal(proposal)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 rounded-lg transition-all"
                                >
                                  <LuMessageCircle className="w-3.5 h-3.5" />
                                  Catatan
                                </button>
                              ) : null}

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => handleViewProposal(proposal)}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-200 hover:border-blue-400 rounded-lg transition-all shadow-sm hover:shadow text-xs font-semibold"
                                >
                                  <LuEye className="w-4 h-4" />
                                  <span>Detail Proposal</span>
                                </button>

                                {(!proposal.dinas_status || proposal.dinas_status === 'pending' || proposal.dinas_status === 'in_review') && (
                                  <>
                                    <button
                                      onClick={() => handleAction(proposal, 'approve')}
                                      disabled={submitting}
                                      className="flex items-center gap-1.5 px-3 py-2.5 bg-white hover:bg-green-500 text-green-600 hover:text-white border-2 border-green-200 hover:border-green-500 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-green-600"
                                    >
                                      <LuCircleCheck className="w-4 h-4" />
                                      <span className="text-xs font-semibold">Setujui</span>
                                    </button>

                                    <button
                                      onClick={() => handleAction(proposal, 'reject')}
                                      disabled={submitting}
                                      className="flex items-center gap-1.5 px-3 py-2.5 bg-white hover:bg-red-500 text-red-600 hover:text-white border-2 border-red-200 hover:border-red-500 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-red-600"
                                    >
                                      <LuCircleX className="w-4 h-4" />
                                      <span className="text-xs font-semibold">Revisi</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal - Modern Design */}
      {actionModal.show && actionModal.action === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setActionModal({ show: false, proposal: null, action: null })}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 px-5 sm:px-6 py-4 sm:py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <LuCircleX className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">Revisi Proposal</h3>
                    <p className="text-xs sm:text-sm text-red-100 mt-0.5">Berikan catatan perbaikan</p>
                  </div>
                </div>
                <button
                  onClick={() => setActionModal({ show: false, proposal: null, action: null })}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <LuX className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Proposal Info Card */}
              {actionModal.proposal && (
                <div className="flex items-start gap-3 p-3.5 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100">
                  <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                    <LuFileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                      {actionModal.proposal.judul_proposal}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <LuMapPin className="w-3 h-3" />
                        {actionModal.proposal.nama_desa}, {actionModal.proposal.nama_kecamatan}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Catatan Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <LuMessageCircle className="w-4 h-4 text-red-500" />
                  Catatan Revisi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows="4"
                  className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none transition-all placeholder:text-gray-400"
                  placeholder="Jelaskan hal yang perlu diperbaiki oleh desa..."
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  {catatan.trim().length > 0 
                    ? `${catatan.trim().length} karakter`
                    : 'Wajib diisi sebelum mengirim revisi'
                  }
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 sm:px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setActionModal({ show: false, proposal: null, action: null })}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-100 border-2 border-gray-200 hover:border-gray-300 rounded-xl transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleSubmitAction(actionModal.proposal, 'reject', catatan)}
                disabled={submitting || !catatan.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <LuCircleX className="w-4 h-4" />
                    Kirim Revisi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Viewer Modal - Responsive */}
      {proposalModal.show && proposalModal.proposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <LuFileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-lg font-bold text-gray-800 line-clamp-2">
                    {proposalModal.proposal.judul_proposal}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {proposalModal.proposal.nama_desa}, {proposalModal.proposal.nama_kecamatan}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProposalModal({ show: false, proposal: null })}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`${import.meta.env.VITE_IMAGE_BASE_URL || 'http://127.0.0.1:3001'}/storage/uploads/bankeu/${proposalModal.proposal.file_proposal}`}
                className="w-full h-full border-0"
                title="Proposal Document"
              />
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-0">
              <a
                href={`${import.meta.env.VITE_IMAGE_BASE_URL || 'http://127.0.0.1:3001'}/storage/uploads/bankeu/${proposalModal.proposal.file_proposal}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm sm:text-base"
              >
                <LuEye className="w-4 h-4" />
                Buka di Tab Baru
              </a>
              <button
                onClick={() => setProposalModal({ show: false, proposal: null })}
                className="px-4 sm:px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors text-sm sm:text-base"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Catatan & History Modal */}
      {catatanModal.show && catatanModal.proposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setCatatanModal({ show: false, proposal: null })}
          />
          
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 sm:px-6 py-4 sm:py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <LuHistory className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">Riwayat Verifikasi</h3>
                    <p className="text-xs sm:text-sm text-orange-100 mt-0.5">Catatan & histori proposal</p>
                  </div>
                </div>
                <button
                  onClick={() => setCatatanModal({ show: false, proposal: null })}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <LuX className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Proposal Info + Detail Button */}
              <div className="flex items-start gap-3 p-3.5 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100">
                <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                  <LuFileText className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                    {catatanModal.proposal.judul_proposal}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <LuMapPin className="w-3 h-3" />
                      {catatanModal.proposal.nama_desa}, {catatanModal.proposal.nama_kecamatan}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleViewProposal(catatanModal.proposal);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg transition-all"
                  >
                    <LuEye className="w-3.5 h-3.5" />
                    Lihat File Proposal
                  </button>
                </div>
              </div>

              {/* Catatan Terakhir (Latest) */}
              {catatanModal.proposal.dinas_catatan && (catatanModal.proposal.dinas_status === 'rejected' || catatanModal.proposal.dinas_status === 'revision') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <p className="text-sm font-semibold text-gray-700">Catatan Revisi Terakhir</p>
                  </div>
                  <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-800 leading-relaxed whitespace-pre-wrap">{catatanModal.proposal.dinas_catatan}</p>
                  </div>
                </div>
              )}

              {/* Catatan Kecamatan */}
              {catatanModal.proposal.verified_at && !catatanModal.proposal.submitted_to_kecamatan && catatanModal.proposal.catatan_verifikasi && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <p className="text-sm font-semibold text-gray-700">Dikembalikan dari Kecamatan</p>
                  </div>
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">{catatanModal.proposal.catatan_verifikasi}</p>
                  </div>
                </div>
              )}

              {/* History Timeline */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <LuHistory className="w-4 h-4 text-gray-500" />
                  <p className="text-sm font-semibold text-gray-700">Riwayat Verifikasi</p>
                </div>
                
                {historyLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">Memuat riwayat...</span>
                  </div>
                ) : verificationHistory.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-sm text-gray-400">Belum ada riwayat verifikasi</p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-0">
                    {/* Timeline line */}
                    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200" />
                    
                    {verificationHistory.map((item, idx) => {
                      const isApprove = item.action === 'approve';
                      const isReject = item.action === 'reject';
                      const dotColor = isApprove ? 'bg-green-500' : isReject ? 'bg-red-500' : 'bg-orange-500';
                      const bgColor = isApprove ? 'bg-green-50 border-green-200' : isReject ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
                      const actionLabel = isApprove ? 'Disetujui' : isReject ? 'Ditolak' : 'Revisi';
                      const actionTextColor = isApprove ? 'text-green-700' : isReject ? 'text-red-700' : 'text-orange-700';
                      
                      return (
                        <div key={item.id} className="relative pb-4">
                          {/* Dot */}
                          <div className={`absolute -left-6 top-1.5 w-[14px] h-[14px] rounded-full border-2 border-white ${dotColor} shadow-sm z-10`} />
                          
                          <div className={`p-3 rounded-xl border ${bgColor}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-bold ${actionTextColor} uppercase tracking-wide`}>{actionLabel}</span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">
                              oleh <span className="font-semibold">{item.user_name}</span>
                              <span className="text-gray-400"> ({item.user_role})</span>
                            </p>
                            {(item.new_value?.catatan_umum || item.new_value?.catatan) && (
                              <div className="mt-2 p-2.5 bg-white/70 rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{item.new_value?.catatan_umum || item.new_value?.catatan}</p>
                              </div>
                            )}
                            {item.new_value?.file_proposal && (
                              <a
                                href={`${import.meta.env.VITE_IMAGE_BASE_URL || 'http://127.0.0.1:3001'}/storage/uploads/bankeu/resolve/${item.new_value.file_proposal}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
                              >
                                <LuDownload className="w-3 h-3" />
                                File Proposal Saat Verifikasi
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 py-4 bg-gray-50/80 border-t border-gray-100">
              <button
                onClick={() => setCatatanModal({ show: false, proposal: null })}
                className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-100 border-2 border-gray-200 hover:border-gray-300 rounded-xl transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DinasVerificationPage;
