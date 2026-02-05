import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  MapPin, 
  Building2,
  Eye,
  Download,
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Folder,
  FolderOpen,
  FileCheck,
  Calendar,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Settings,
  Edit,
  Trash2,
  Plus,
  Save,
  X as XIcon
} from 'lucide-react';
import api from '../../../../api';
import Swal from 'sweetalert2';

const DpmdVerificationPage = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedKecamatan, setExpandedKecamatan] = useState([]);
  const [expandedDesa, setExpandedDesa] = useState([]);
  const [selectedKecamatan, setSelectedKecamatan] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeView, setActiveView] = useState('archive'); // archive, tracking, config
  const [masterKegiatan, setMasterKegiatan] = useState([]);
  const [dinas, setDinas] = useState([]);
  const [editingKegiatan, setEditingKegiatan] = useState(null);
  const [editingDinas, setEditingDinas] = useState(null);
  const [showKegiatanForm, setShowKegiatanForm] = useState(false);
  const [showDinasForm, setShowDinasForm] = useState(false);
  const [kegiatanExpanded, setKegiatanExpanded] = useState(false);
  const [dinasExpanded, setDinasExpanded] = useState(false);
  const imageBaseUrl = api.defaults.baseURL.replace('/api', '');

  useEffect(() => {
    fetchData();
    if (activeView === 'config') {
      fetchMasterKegiatan();
      fetchDinas();
    }
  }, [activeView]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [proposalsRes, statsRes] = await Promise.all([
        api.get('/dpmd/bankeu/proposals'),
        api.get('/dpmd/bankeu/statistics')
      ]);

      if (proposalsRes.data.success) {
        setProposals(proposalsRes.data.data || []);
      }

      if (statsRes.data.success) {
        setStatistics(statsRes.data.data || {});
      }
    } catch (error) {
      console.error('Error fetching DPMD data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.message || 'Gagal memuat data'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterKegiatan = async () => {
    try {
      const response = await api.get('/bankeu/master-kegiatan');
      if (response.data.success) {
        setMasterKegiatan(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching master kegiatan:', error);
    }
  };

  const fetchDinas = async () => {
    try {
      const response = await api.get('/master/dinas');
      if (response.data.success) {
        setDinas(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching dinas:', error);
    }
  };

  const handleSaveKegiatan = async (formData) => {
    try {
      if (editingKegiatan) {
        await api.put(`/bankeu/master-kegiatan/${editingKegiatan.id}`, formData);
        Swal.fire('Berhasil', 'Master kegiatan berhasil diupdate', 'success');
      } else {
        await api.post('/bankeu/master-kegiatan', formData);
        Swal.fire('Berhasil', 'Master kegiatan berhasil ditambahkan', 'success');
      }
      setShowKegiatanForm(false);
      setEditingKegiatan(null);
      fetchMasterKegiatan();
    } catch (error) {
      Swal.fire('Gagal', error.response?.data?.message || 'Gagal menyimpan data', 'error');
    }
  };

  const handleDeleteKegiatan = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Master Kegiatan?',
      text: 'Data yang dihapus tidak dapat dikembalikan',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/bankeu/master-kegiatan/${id}`);
        Swal.fire('Terhapus!', 'Master kegiatan berhasil dihapus', 'success');
        fetchMasterKegiatan();
      } catch (error) {
        Swal.fire('Gagal', error.response?.data?.message || 'Gagal menghapus data', 'error');
      }
    }
  };

  const handleSaveDinas = async (formData) => {
    try {
      if (editingDinas) {
        await api.put(`/master/dinas/${editingDinas.id}`, formData);
        Swal.fire('Berhasil', 'Dinas berhasil diupdate', 'success');
      } else {
        await api.post('/master/dinas', formData);
        Swal.fire('Berhasil', 'Dinas berhasil ditambahkan', 'success');
      }
      setShowDinasForm(false);
      setEditingDinas(null);
      fetchDinas();
    } catch (error) {
      Swal.fire('Gagal', error.response?.data?.message || 'Gagal menyimpan data', 'error');
    }
  };

  const handleDeleteDinas = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Dinas?',
      text: 'Data yang dihapus tidak dapat dikembalikan',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/master/dinas/${id}`);
        Swal.fire('Terhapus!', 'Dinas berhasil dihapus', 'success');
        fetchDinas();
      } catch (error) {
        Swal.fire('Gagal', error.response?.data?.message || 'Gagal menghapus data', 'error');
      }
    }
  };

  // Group proposals by kecamatan
  const groupedProposals = proposals.reduce((acc, proposal) => {
    const kecamatanName = proposal.desas?.kecamatans?.nama || 'Tidak Diketahui';
    if (!acc[kecamatanName]) {
      acc[kecamatanName] = [];
    }
    acc[kecamatanName].push(proposal);
    return acc;
  }, {});

  // Filter grouped proposals
  const filteredGrouped = Object.entries(groupedProposals).reduce((acc, [kecName, kecProposals]) => {
    // Filter by selected kecamatan
    if (selectedKecamatan !== 'all' && kecName !== selectedKecamatan) {
      return acc;
    }

    // Filter by search term
    let filtered = kecProposals;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = kecProposals.filter(p =>
        p.judul_proposal?.toLowerCase().includes(term) ||
        p.desas?.nama?.toLowerCase().includes(term)
      );
    }

    if (filtered.length > 0) {
      acc[kecName] = filtered;
    }
    return acc;
  }, {});

  const toggleKecamatan = (kecamatanName) => {
    setExpandedKecamatan(prev => 
      prev.includes(kecamatanName)
        ? prev.filter(k => k !== kecamatanName)
        : [...prev, kecamatanName]
    );
  };

  const toggleDesa = (desaKey) => {
    setExpandedDesa(prev => 
      prev.includes(desaKey)
        ? prev.filter(d => d !== desaKey)
        : [...prev, desaKey]
    );
  };

  const toggleAllKecamatan = () => {
    if (expandedKecamatan.length === Object.keys(filteredGrouped).length) {
      setExpandedKecamatan([]);
    } else {
      setExpandedKecamatan(Object.keys(filteredGrouped));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  const kecamatanList = Object.keys(groupedProposals).sort();

  return (
    <div className="bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/30">
      {/* Tab Navigation */}
      <div className="container mx-auto px-4 pt-6">
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6 inline-flex gap-2">
          <button
            onClick={() => setActiveView('archive')}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeView === 'archive'
                ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Arsip Proposal
            </div>
          </button>
          <button
            onClick={() => setActiveView('tracking')}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeView === 'tracking'
                ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Tracking Status
            </div>
          </button>
          <button
            onClick={() => setActiveView('config')}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeView === 'config'
                ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Konfigurasi
            </div>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="container mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Proposal Diterima</p>
                <p className="text-3xl font-bold text-gray-900">{proposals.length}</p>
                <p className="text-xs text-gray-500 mt-1">Dari {kecamatanList.length} Kecamatan</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Kecamatan Aktif</p>
                <p className="text-3xl font-bold text-green-600">{kecamatanList.length}</p>
                <p className="text-xs text-gray-500 mt-1">dari 39 kecamatan</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Desa Terlibat</p>
                <p className="text-3xl font-bold text-purple-600">
                  {[...new Set(proposals.map(p => p.desa_id))].length}
                </p>
                <p className="text-xs text-gray-500 mt-1">dari 416 desa</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Filter & Pencarian</span>
            </div>
            {showFilters ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>
          
          {showFilters && (
            <div className="p-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari proposal atau desa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedKecamatan}
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="all">Semua Kecamatan ({kecamatanList.length})</option>
                {kecamatanList.map(kec => (
                  <option key={kec} value={kec}>
                    {kec} ({groupedProposals[kec].length})
                  </option>
                ))}
              </select>
              </div>
            </div>

            {Object.keys(filteredGrouped).length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Menampilkan <span className="font-semibold">{Object.values(filteredGrouped).flat().length}</span> proposal
                dari <span className="font-semibold">{Object.keys(filteredGrouped).length}</span> kecamatan
              </p>
              <button
                onClick={toggleAllKecamatan}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {expandedKecamatan.length === Object.keys(filteredGrouped).length ? 'Tutup Semua' : 'Buka Semua'}
              </button>
              </div>
            )}
            </div>
          )}
        </div>

        {/* Content based on active view */}
        {activeView === 'archive' ? (
          <>
        {/* Grouped Proposals by Kecamatan */}
        {Object.keys(filteredGrouped).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Tidak ada proposal ditemukan</p>
            <p className="text-gray-400 text-sm mt-2">Coba ubah filter pencarian</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(filteredGrouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([kecamatanName, kecProposals]) => {
                const isExpanded = expandedKecamatan.includes(kecamatanName);
                
                return (
                  <div key={kecamatanName} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                    {/* Kecamatan Header */}
                    <button
                      onClick={() => toggleKecamatan(kecamatanName)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg shadow-md">
                          {isExpanded ? (
                            <FolderOpen className="h-6 w-6 text-white" />
                          ) : (
                            <Folder className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-lg text-gray-900">{kecamatanName}</h3>
                          <p className="text-sm text-gray-600">
                            {kecProposals.length} proposal dari {[...new Set(kecProposals.map(p => p.desa_id))].length} desa
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold text-sm">
                          {kecProposals.length} proposal
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Desa Badges List */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6">
                        {(() => {
                          // Group proposals by desa within this kecamatan
                          const desaGroups = kecProposals.reduce((acc, proposal) => {
                            const desaName = proposal.desas?.nama || 'Tidak Diketahui';
                            const desaId = proposal.desa_id;
                            if (!acc[desaName]) {
                              acc[desaName] = { proposals: [], desaId };
                            }
                            acc[desaName].proposals.push(proposal);
                            return acc;
                          }, {});

                          return (
                            <div className="space-y-4">
                              {/* Desa Badges Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {Object.entries(desaGroups)
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([desaName, { proposals: desaProposals, desaId }]) => {
                                    const desaKey = `${kecamatanName}-${desaId}`;
                                    const isDesaExpanded = expandedDesa.includes(desaKey);
                                    
                                    return (
                                      <button
                                        key={desaKey}
                                        onClick={() => toggleDesa(desaKey)}
                                        className={`group relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                                          isDesaExpanded
                                            ? 'bg-gradient-to-br from-blue-500 to-green-500 border-blue-500 shadow-lg'
                                            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                                        }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className={`p-2 rounded-lg ${
                                            isDesaExpanded ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-blue-100'
                                          }`}>
                                            <MapPin className={`h-4 w-4 ${
                                              isDesaExpanded ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'
                                            }`} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <h5 className={`font-semibold text-sm mb-1 truncate ${
                                              isDesaExpanded ? 'text-white' : 'text-gray-900'
                                            }`}>
                                              {desaName}
                                            </h5>
                                            <div className={`flex items-center gap-2 ${
                                              isDesaExpanded ? 'text-white/90' : 'text-gray-600'
                                            }`}>
                                              <FileText className="h-3 w-3" />
                                              <span className="text-xs font-medium">
                                                {desaProposals.length} proposal
                                              </span>
                                            </div>
                                          </div>
                                          {isDesaExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-white flex-shrink-0" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                              </div>

                              {/* Proposals for Expanded Desa */}
                              {Object.entries(desaGroups)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([desaName, { proposals: desaProposals, desaId }]) => {
                                  const desaKey = `${kecamatanName}-${desaId}`;
                                  const isDesaExpanded = expandedDesa.includes(desaKey);

                                  if (!isDesaExpanded) return null;

                                  return (
                                    <div key={`proposals-${desaKey}`} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                      {/* Desa Header */}
                                      <div className="bg-gradient-to-r from-blue-500 to-green-500 px-4 py-3">
                                        <div className="flex items-center justify-between text-white">
                                          <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            <h4 className="font-semibold">{desaName}</h4>
                                          </div>
                                          <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
                                            {desaProposals.length} proposal
                                          </span>
                                        </div>
                                      </div>

                                      {/* Proposals in this Desa */}
                                      <div>
                                        {desaProposals.map((proposal, idx) => (
                                          <div
                                            key={proposal.id.toString()}
                                            className={`p-6 bg-white ${idx !== desaProposals.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-blue-50/50 transition-colors`}
                                          >
                                            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                                              {/* Proposal Info */}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-3 mb-3">
                                                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0 mt-1">
                                                    <FileText className="h-5 w-5 text-blue-600" />
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 mb-2 leading-snug">
                                                      {proposal.judul_proposal}
                                                    </h4>
                                                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                                                      {proposal.dpmd_submitted_at && (
                                                        <div className="flex items-center gap-1">
                                                          <Calendar className="h-4 w-4 flex-shrink-0" />
                                                          <span>
                                                            {new Date(proposal.dpmd_submitted_at).toLocaleDateString('id-ID', {
                                                              day: 'numeric',
                                                              month: 'short',
                                                              year: 'numeric'
                                                            })}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>
                                                    
                                                    {proposal.bankeu_master_kegiatan && (
                                                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                                        {proposal.bankeu_master_kegiatan.dinas_terkait}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Document Buttons */}
                                              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-1 gap-2 xl:min-w-[220px]">
                                                {/* Proposal Desa */}
                                                {proposal.file_proposal && (
                                                  <a
                                                    href={`${imageBaseUrl}/storage/uploads/${proposal.file_proposal}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                                                  >
                                                    <FileText className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">Proposal Desa</span>
                                                  </a>
                                                )}

                                                {/* Surat Pengantar Desa */}
                                                {proposal.surat_pengantar_desa && (
                                                  <a
                                                    href={`${imageBaseUrl}/storage/uploads/bankeu/${proposal.surat_pengantar_desa}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                                                  >
                                                    <Download className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">Surat Pengantar</span>
                                                  </a>
                                                )}

                                                {/* Surat Permohonan Desa */}
                                                {proposal.surat_permohonan_desa && (
                                                  <a
                                                    href={`${imageBaseUrl}/storage/uploads/bankeu/${proposal.surat_permohonan_desa}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                                                  >
                                                    <Download className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">Surat Permohonan</span>
                                                  </a>
                                                )}

                                                {/* Surat Pengantar Kecamatan */}
                                                {proposal.surat_pengantar && (
                                                  <a
                                                    href={`${imageBaseUrl}/storage${proposal.surat_pengantar}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                                                  >
                                                    <Download className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">SP Kecamatan</span>
                                                  </a>
                                                )}

                                                {/* Berita Acara Kecamatan */}
                                                {proposal.berita_acara_path && (
                                                  <a
                                                    href={`${imageBaseUrl}/storage${proposal.berita_acara_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                                                  >
                                                    <FileCheck className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">Berita Acara</span>
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
        </> 
        ) : activeView === 'tracking' ? (
          /* Tracking Status View */
          <div className="space-y-4">
            {proposals.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Belum ada data tracking</p>
              </div>
            ) : (
              proposals.map((proposal) => (
                <div key={proposal.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Proposal Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-2">{proposal.judul_proposal}</h3>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="flex items-center gap-1 text-gray-600">
                            <MapPin className="h-4 w-4" />
                            {proposal.desas?.nama} - {proposal.desas?.kecamatans?.nama}
                          </span>
                          {proposal.bankeu_master_kegiatan && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              {proposal.bankeu_master_kegiatan.dinas_terkait}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="p-6">
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      
                      <div className="space-y-8">
                        {/* Step 1: Desa Submit */}
                        <div className="relative flex gap-4">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                            proposal.dinas_status !== null ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            <CheckCircle2 className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 pt-2">
                            <h4 className="font-semibold text-gray-900 mb-1">Desa Mengajukan Proposal</h4>
                            <p className="text-sm text-gray-600 mb-2">Proposal telah diajukan oleh desa</p>
                            {proposal.created_at && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {new Date(proposal.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Step 2: Dinas Review */}
                        <div className="relative flex gap-4">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                            proposal.dinas_status === 'approved' ? 'bg-green-500' :
                            proposal.dinas_status === 'rejected' ? 'bg-red-500' :
                            proposal.dinas_status === 'revision' ? 'bg-orange-500' :
                            proposal.dinas_status === 'pending' ? 'bg-blue-500 animate-pulse' :
                            'bg-gray-300'
                          }`}>
                            {proposal.dinas_status === 'approved' ? (
                              <CheckCircle2 className="h-6 w-6 text-white" />
                            ) : proposal.dinas_status === 'rejected' ? (
                              <XCircle className="h-6 w-6 text-white" />
                            ) : (
                              <Clock className="h-6 w-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1 pt-2">
                            <h4 className="font-semibold text-gray-900 mb-1">Dinas Verifikasi</h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {proposal.dinas_status === 'approved' ? 'Proposal disetujui oleh dinas' :
                               proposal.dinas_status === 'rejected' ? 'Proposal ditolak oleh dinas' :
                               proposal.dinas_status === 'revision' ? 'Proposal perlu direvisi' :
                               proposal.dinas_status === 'pending' ? 'Menunggu verifikasi dinas' :
                               'Belum sampai tahap dinas'}
                            </p>
                            {proposal.dinas_verified_at && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {new Date(proposal.dinas_verified_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Step 3: Kecamatan Process */}
                        <div className="relative flex gap-4">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                            proposal.surat_pengantar ? 'bg-green-500' :
                            proposal.dinas_status === 'approved' ? 'bg-blue-500 animate-pulse' :
                            'bg-gray-300'
                          }`}>
                            {proposal.surat_pengantar ? (
                              <CheckCircle2 className="h-6 w-6 text-white" />
                            ) : (
                              <Clock className="h-6 w-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1 pt-2">
                            <h4 className="font-semibold text-gray-900 mb-1">Kecamatan Membuat Surat Pengantar</h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {proposal.surat_pengantar ? 'Surat pengantar telah dibuat' :
                               proposal.dinas_status === 'approved' ? 'Menunggu kecamatan membuat surat pengantar' :
                               'Belum sampai tahap kecamatan'}
                            </p>
                            {proposal.surat_pengantar_created_at && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {new Date(proposal.surat_pengantar_created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Step 4: DPMD Receive */}
                        <div className="relative flex gap-4">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                            proposal.dpmd_status === 'pending' ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {proposal.dpmd_status === 'pending' ? (
                              <CheckCircle2 className="h-6 w-6 text-white" />
                            ) : (
                              <Clock className="h-6 w-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1 pt-2">
                            <h4 className="font-semibold text-gray-900 mb-1">DPMD Menerima Dokumen</h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {proposal.dpmd_status === 'pending' ? 'Dokumen telah diterima DPMD' : 'Menunggu pengiriman ke DPMD'}
                            </p>
                            {proposal.dpmd_submitted_at && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {new Date(proposal.dpmd_submitted_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Konfigurasi View */
          <div className="space-y-6">
            {/* Master Kegiatan Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-4 flex items-center justify-between cursor-pointer"
                onClick={() => setKegiatanExpanded(!kegiatanExpanded)}
              >
                <div className="flex items-center gap-3">
                  <ChevronDown className={`h-5 w-5 text-white transition-transform ${kegiatanExpanded ? 'rotate-180' : ''}`} />
                  <h2 className="text-lg font-bold text-white">Master Kegiatan / Program</h2>
                  <span className="px-2 py-1 bg-white/20 text-white text-sm rounded-full">{masterKegiatan.length}</span>
                </div>
                {kegiatanExpanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingKegiatan(null);
                      setShowKegiatanForm(!showKegiatanForm);
                    }}
                    className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-sm flex items-center gap-2"
                  >
                    {showKegiatanForm ? (
                      <><XIcon className="h-4 w-4" /> Tutup</>
                    ) : (
                      <><Plus className="h-4 w-4" /> Tambah Program</>
                    )}
                  </button>
                )}
              </div>

              {kegiatanExpanded && (
                <>
                  {showKegiatanForm && (
                    <div className="p-6 border-b border-gray-200 bg-gray-50">
                      <KegiatanForm 
                        data={editingKegiatan}
                        onSave={handleSaveKegiatan}
                        onCancel={() => {
                          setShowKegiatanForm(false);
                          setEditingKegiatan(null);
                        }}
                        dinasList={dinas}
                      />
                    </div>
                  )}

                  <div className="p-6">
                    {masterKegiatan.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Belum ada master kegiatan</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Jenis</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Program</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Dinas Terkait</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {masterKegiatan.map((item, idx) => (
                              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-700">{idx + 1}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    item.jenis_kegiatan === 'infrastruktur' 
                                      ? 'bg-orange-100 text-orange-700' 
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {item.jenis_kegiatan === 'infrastruktur' ? 'Infra' : 'Non-Infra'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.nama_kegiatan}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                    {item.dinas_terkait}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingKegiatan(item);
                                        setShowKegiatanForm(true);
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteKegiatan(item.id)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Dinas Management Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 px-6 py-4 flex items-center justify-between cursor-pointer"
                onClick={() => setDinasExpanded(!dinasExpanded)}
              >
                <div className="flex items-center gap-3">
                  <ChevronDown className={`h-5 w-5 text-white transition-transform ${dinasExpanded ? 'rotate-180' : ''}`} />
                  <div>
                    <h2 className="text-lg font-bold text-white">Management Dinas</h2>
                    <p className="text-sm text-white/80">Dinas yang terdaftar dalam sistem</p>
                  </div>
                  <span className="px-2 py-1 bg-white/20 text-white text-sm rounded-full">{dinas.length}</span>
                </div>
                {dinasExpanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDinas(null);
                      setShowDinasForm(!showDinasForm);
                    }}
                    className="px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors font-semibold text-sm flex items-center gap-2"
                  >
                    {showDinasForm ? (
                      <><XIcon className="h-4 w-4" /> Tutup</>
                    ) : (
                      <><Plus className="h-4 w-4" /> Tambah Dinas</>
                    )}
                  </button>
                )}
              </div>

              {dinasExpanded && (
                <>
                  {showDinasForm && (
                    <div className="p-6 border-b border-gray-200 bg-gray-50">
                      <DinasForm 
                        data={editingDinas}
                        onSave={handleSaveDinas}
                        onCancel={() => {
                          setShowDinasForm(false);
                          setEditingDinas(null);
                        }}
                      />
                    </div>
                  )}

                  <div className="p-6">
                    {dinas.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Belum ada data dinas</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Dinas</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Singkatan</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal Dibuat</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dinas.map((item, idx) => (
                              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-700">{idx + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-green-600" />
                                    <span className="text-sm text-gray-900 font-medium">{item.nama}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                                    {item.singkatan || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  }) : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingDinas(item);
                                        setShowDinasForm(true);
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDinas(item.id)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Hapus"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )
        }
      </div>
    </div>
  );
};

// Form Component for Master Kegiatan
const KegiatanForm = ({ data, onSave, onCancel, dinasList = [] }) => {
  const [formData, setFormData] = useState({
    nama_kegiatan: data?.nama_kegiatan || '',
    dinas_terkait: data?.dinas_terkait || '',
    jenis_kegiatan: data?.jenis_kegiatan || 'non_infrastruktur'
  });

  useEffect(() => {
    setFormData({
      nama_kegiatan: data?.nama_kegiatan || '',
      dinas_terkait: data?.dinas_terkait || '',
      jenis_kegiatan: data?.jenis_kegiatan || 'non_infrastruktur'
    });
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Jenis Kegiatan
        </label>
        <select
          value={formData.jenis_kegiatan}
          onChange={(e) => setFormData({ ...formData, jenis_kegiatan: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="infrastruktur">Infrastruktur</option>
          <option value="non_infrastruktur">Non Infrastruktur</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Nama Program/Kegiatan
        </label>
        <input
          type="text"
          value={formData.nama_kegiatan}
          onChange={(e) => setFormData({ ...formData, nama_kegiatan: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Dinas Terkait
        </label>
        <select
          value={formData.dinas_terkait}
          onChange={(e) => setFormData({ ...formData, dinas_terkait: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">-- Pilih Dinas --</option>
          {dinasList.map((d) => (
            <option key={d.id} value={d.singkatan}>
              {d.nama} ({d.singkatan})
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          {data ? 'Update' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
        >
          Batal
        </button>
      </div>
    </form>
  );
};

// Form Component for Dinas
const DinasForm = ({ data, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nama: data?.nama || '',
    singkatan: data?.singkatan || ''
  });

  useEffect(() => {
    setFormData({
      nama: data?.nama || '',
      singkatan: data?.singkatan || ''
    });
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Nama Dinas
        </label>
        <input
          type="text"
          value={formData.nama}
          onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Contoh: Dinas Kesehatan"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Singkatan
        </label>
        <input
          type="text"
          value={formData.singkatan}
          onChange={(e) => setFormData({ ...formData, singkatan: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Contoh: DINKES"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          {data ? 'Update' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
        >
          Batal
        </button>
      </div>
    </form>
  );
};

export default DpmdVerificationPage;
