import { useState, useEffect } from 'react';
import { 
  LuSearch, LuEye, LuCircleCheck, LuCircleX, 
  LuRefreshCw, LuClock, LuFileText, LuTriangleAlert,
  LuChevronDown, LuChevronUp, LuMapPin, LuX, LuPackage, LuDollarSign
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
      filtered = filtered.filter(p => p.dinas_status === statusFilter);
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
            rejected: 0,
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
            rejected: 0,
            revision: 0,
            total: 0
          }
        };
      }
      
      grouped[kecamatanId].desas[desaId].proposals.push(proposal);
      grouped[kecamatanId].desas[desaId].stats.total++;
      grouped[kecamatanId].stats.total++;
      
      const status = proposal.dinas_status || 'pending';
      if (grouped[kecamatanId].desas[desaId].stats[status] !== undefined) {
        grouped[kecamatanId].desas[desaId].stats[status]++;
      }
      if (grouped[kecamatanId].stats[status] !== undefined) {
        grouped[kecamatanId].stats[status]++;
      }
    });

    // Convert desas object to sorted array
    Object.values(grouped).forEach(kecamatan => {
      kecamatan.desas = Object.values(kecamatan.desas).sort((a, b) => a.nama.localeCompare(b.nama));
    });

    return Object.values(grouped).sort((a, b) => a.nama.localeCompare(b.nama));
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
      // Direct approve without modal
      handleSubmitAction(proposal, action, '');
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
                      navigate('/dinas/konfigurasi/dinas');
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
                    navigate('/dinas/konfigurasi/dinas');
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
                  navigate('/dinas/konfigurasi/dinas');
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                <LuRefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{statistics.in_review || 0}</p>
                <p className="text-xs text-gray-500">Direview</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                <LuCircleCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{statistics.approved || 0}</p>
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
              <option value="rejected">Ditolak</option>
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
                  {kecamatan.desas.map((desa) => (
                    <div key={desa.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      {/* Desa Header */}
                      <div 
                        className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-colors"
                        onClick={() => toggleDesa(desa.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-100 rounded">
                              <LuMapPin className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800">Desa {desa.nama}</h4>
                              <p className="text-xs text-gray-600">
                                {desa.stats.total} Proposal
                                {desa.stats.pending > 0 && ` • ${desa.stats.pending} Menunggu`}
                                {desa.stats.approved > 0 && ` • ${desa.stats.approved} Disetujui`}
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
                                  <tr key={proposal.id} className="hover:bg-gray-50/50 transition-colors">
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
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                  proposal.jenis_kegiatan === 'infrastruktur' 
                                                    ? 'bg-blue-100 text-blue-700' 
                                                    : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                  {proposal.jenis_kegiatan === 'infrastruktur' ? 'Infrastruktur' : 'Non-Infrastruktur'}
                                                </span>
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
                                      {getStatusBadge(proposal.dinas_status)}
                                      {/* Show alert if returned from Kecamatan */}
                                      {proposal.verified_at && !proposal.submitted_to_kecamatan && proposal.catatan_verifikasi && (
                                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                          <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                                            <LuTriangleAlert className="w-3 h-3" />
                                            Dikembalikan dari Kecamatan:
                                          </p>
                                          <p className="text-xs text-amber-700 italic">{proposal.catatan_verifikasi}</p>
                                        </div>
                                      )}
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
                                      {(!proposal.dinas_status || proposal.dinas_status === 'pending' || proposal.dinas_status === 'in_review' || proposal.dinas_status === 'rejected' || proposal.dinas_status === 'revision') && (
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
                          {desa.proposals.map((proposal) => (
                            <div key={proposal.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
                              {/* Header */}
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg shadow-sm flex-shrink-0">
                                  <LuFileText className="w-4 h-4 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm leading-tight">{proposal.judul_proposal}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-400">ID: {proposal.id}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      proposal.jenis_kegiatan === 'infrastruktur' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-purple-100 text-purple-700'
                                    }`}>
                                      {proposal.jenis_kegiatan === 'infrastruktur' ? 'Infrastruktur' : 'Non-Infrastruktur'}
                                    </span>
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
                              
                              {/* Alert if returned */}
                              {proposal.verified_at && !proposal.submitted_to_kecamatan && proposal.catatan_verifikasi && (
                                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                  <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                                    <LuTriangleAlert className="w-3 h-3" />
                                    Dikembalikan dari Kecamatan:
                                  </p>
                                  <p className="text-xs text-amber-700 italic">{proposal.catatan_verifikasi}</p>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => handleViewProposal(proposal)}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-200 hover:border-blue-400 rounded-lg transition-all shadow-sm hover:shadow text-xs font-semibold"
                                >
                                  <LuEye className="w-4 h-4" />
                                  <span>Detail Proposal</span>
                                </button>

                                {(!proposal.dinas_status || proposal.dinas_status === 'pending' || proposal.dinas_status === 'in_review' || proposal.dinas_status === 'rejected' || proposal.dinas_status === 'revision') && (
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
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal - Responsive */}
      {actionModal.show && actionModal.action === 'reject' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg flex-shrink-0">
                  <LuCircleX className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">Tolak Proposal (Revisi)</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Konfirmasi penolakan</p>
                </div>
              </div>
              <button
                onClick={() => setActionModal({ show: false, proposal: null, action: null })}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {actionModal.proposal && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 line-clamp-2">
                  {actionModal.proposal.judul_proposal}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {actionModal.proposal.nama_desa}, {actionModal.proposal.nama_kecamatan}
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder="Jelaskan alasan penolakan dan perbaikan yang diperlukan..."
              />
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setActionModal({ show: false, proposal: null, action: null })}
                disabled={submitting}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleSubmitAction(actionModal.proposal, 'reject', catatan)}
                disabled={submitting || !catatan.trim()}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Memproses...' : 'Tolak'}
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
    </div>
  );
};

export default DinasVerificationPage;
