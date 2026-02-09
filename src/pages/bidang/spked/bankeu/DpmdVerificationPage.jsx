import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  MapPin, 
  Building2,
  Building,
  Eye,
  Download,
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCheck,
  Calendar,
  Activity,
  Clock,
  CheckCircle2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Edit,
  Trash2,
  Plus,
  Save,
  X as XIcon,
  BarChart3,
  TrendingUp,
  Users,
  UserPlus,
  UserCheck,
  Shield,
  Key,
  Mail,
  BadgeCheck,
  Briefcase,
  FileSpreadsheet,
  PieChart,
  AlertCircle,
  Filter,
  Power,
  Lock,
  Unlock,
  Sparkles,
  Layers,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, 
  AreaChart, Area,
  LineChart, Line
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import api from '../../../../api';
import Swal from 'sweetalert2';

const DpmdVerificationPage = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [allDesa, setAllDesa] = useState([]);
  const [allKecamatan, setAllKecamatan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedKecamatan, setExpandedKecamatan] = useState([]);
  const [expandedDesa, setExpandedDesa] = useState([]);
  const [selectedKecamatan, setSelectedKecamatan] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeView, setActiveView] = useState('archive'); // archive, tracking, statistics, config
  const [masterKegiatan, setMasterKegiatan] = useState([]);
  const [dinas, setDinas] = useState([]);
  const [editingKegiatan, setEditingKegiatan] = useState(null);
  const [editingDinas, setEditingDinas] = useState(null);
  const [showKegiatanForm, setShowKegiatanForm] = useState(false);
  const [showDinasForm, setShowDinasForm] = useState(false);
  const [kegiatanExpanded, setKegiatanExpanded] = useState(false);
  const [dinasExpanded, setDinasExpanded] = useState(false);
  // Tracking view states
  const [trackingSearchTerm, setTrackingSearchTerm] = useState('');
  const [trackingSelectedKecamatan, setTrackingSelectedKecamatan] = useState('all');
  const [trackingStatusFilter, setTrackingStatusFilter] = useState('all'); // all, di_dinas, di_kecamatan, di_dpmd
  const [trackingDinasFilter, setTrackingDinasFilter] = useState('all'); // filter by specific dinas when di_dinas
  const [expandedTrackingDesa, setExpandedTrackingDesa] = useState([]);
  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);
  // Modal states for statistics detail
  const [showKecamatanModal, setShowKecamatanModal] = useState(false);
  const [showDesaBelumModal, setShowDesaBelumModal] = useState(false);
  // Submission control states
  const [submissionSettings, setSubmissionSettings] = useState({
    bankeu_submission_desa: true,
    bankeu_submission_kecamatan: true
  });
  // Config tab states
  const [configSubTab, setConfigSubTab] = useState('kegiatan'); // 'kegiatan', 'dinas'
  const [expandedDinasId, setExpandedDinasId] = useState(null);
  const [dinasVerifikators, setDinasVerifikators] = useState({});
  const [showVerifikatorForm, setShowVerifikatorForm] = useState(false);
  const [editingVerifikator, setEditingVerifikator] = useState(null);
  const [loadingVerifikator, setLoadingVerifikator] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL || 'http://127.0.0.1:3001';

  // Handle refresh data without full loading screen
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
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

      // Also refresh desas/kecamatan if on tracking/statistics view
      if (activeView === 'statistics' || activeView === 'tracking') {
        await fetchAllDesaKecamatan();
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
    if (activeView === 'config') {
      fetchMasterKegiatan();
      fetchDinas();
    }
    if (activeView === 'statistics' || activeView === 'tracking') {
      fetchAllDesaKecamatan();
    }
    if (activeView === 'control') {
      fetchSubmissionSettings();
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

  const fetchAllDesaKecamatan = async () => {
    try {
      const [desaRes, kecamatanRes] = await Promise.all([
        api.get('/desas'),
        api.get('/kecamatans')
      ]);
      if (desaRes.data.success) {
        setAllDesa(desaRes.data.data || []);
      }
      if (kecamatanRes.data.success) {
        setAllKecamatan(kecamatanRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching desa/kecamatan:', error);
    }
  };

  const fetchSubmissionSettings = async () => {
    try {
      setLoadingSettings(true);
      const [desaRes, kecamatanRes] = await Promise.all([
        api.get('/app-settings/bankeu_submission_desa').catch(() => ({ data: { data: { value: true } } })),
        api.get('/app-settings/bankeu_submission_kecamatan').catch(() => ({ data: { data: { value: true } } }))
      ]);
      setSubmissionSettings({
        bankeu_submission_desa: desaRes.data?.data?.value ?? true,
        bankeu_submission_kecamatan: kecamatanRes.data?.data?.value ?? true
      });
    } catch (error) {
      console.error('Error fetching submission settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const updateSubmissionSetting = async (key, value) => {
    try {
      setLoadingSettings(true);
      const res = await api.put(`/app-settings/${key}`, { value });
      if (res.data.success) {
        setSubmissionSettings(prev => ({ ...prev, [key]: value }));
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: `Pengaturan ${key === 'bankeu_submission_desa' ? 'Desa' : 'Kecamatan'} berhasil ${value ? 'dibuka' : 'ditutup'}`,
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error updating submission setting:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.message || 'Gagal mengupdate pengaturan'
      });
    } finally {
      setLoadingSettings(false);
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

  // Verifikator functions
  const fetchVerifikatorForDinas = async (dinasId) => {
    try {
      setLoadingVerifikator(true);
      const response = await api.get(`/dinas/${dinasId}/verifikator`);
      if (response.data.success) {
        setDinasVerifikators(prev => ({
          ...prev,
          [dinasId]: response.data.data || []
        }));
      }
    } catch (error) {
      console.error('Error fetching verifikator:', error);
      // If 404 or error, set empty array
      setDinasVerifikators(prev => ({
        ...prev,
        [dinasId]: []
      }));
    } finally {
      setLoadingVerifikator(false);
    }
  };

  const handleExpandDinas = async (dinasId) => {
    if (expandedDinasId === dinasId) {
      setExpandedDinasId(null);
    } else {
      setExpandedDinasId(dinasId);
      if (!dinasVerifikators[dinasId]) {
        await fetchVerifikatorForDinas(dinasId);
      }
    }
  };

  const handleSaveVerifikator = async (dinasId, formData) => {
    try {
      if (editingVerifikator) {
        await api.put(`/dinas/${dinasId}/verifikator/${editingVerifikator.id}`, formData);
        Swal.fire('Berhasil', 'Verifikator berhasil diupdate', 'success');
      } else {
        await api.post(`/dinas/${dinasId}/verifikator`, formData);
        Swal.fire('Berhasil', 'Verifikator berhasil ditambahkan', 'success');
      }
      setShowVerifikatorForm(false);
      setEditingVerifikator(null);
      fetchVerifikatorForDinas(dinasId);
    } catch (error) {
      Swal.fire('Gagal', error.response?.data?.message || 'Gagal menyimpan verifikator', 'error');
    }
  };

  const handleDeleteVerifikator = async (dinasId, verifikatorId) => {
    const result = await Swal.fire({
      title: 'Hapus Verifikator?',
      text: 'Akun verifikator akan dihapus dan tidak dapat dikembalikan',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/dinas/${dinasId}/verifikator/${verifikatorId}`);
        Swal.fire('Terhapus!', 'Verifikator berhasil dihapus', 'success');
        fetchVerifikatorForDinas(dinasId);
      } catch (error) {
        Swal.fire('Gagal', error.response?.data?.message || 'Gagal menghapus verifikator', 'error');
      }
    }
  };

  const handleToggleVerifikatorStatus = async (dinasId, verifikatorId) => {
    try {
      await api.patch(`/dinas/${dinasId}/verifikator/${verifikatorId}/toggle-status`);
      fetchVerifikatorForDinas(dinasId);
    } catch (error) {
      Swal.fire('Gagal', error.response?.data?.message || 'Gagal mengubah status', 'error');
    }
  };

  const handleResetPassword = async (dinasId, verifikatorId, nama) => {
    const result = await Swal.fire({
      title: 'Buat Password Baru?',
      html: `Password baru akan dibuat untuk <strong>${nama}</strong>.<br/>Password baru akan ditampilkan setelah dibuat.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Buat Password Baru',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const response = await api.post(`/dinas/${dinasId}/verifikator/${verifikatorId}/reset-password`);
        const newPassword = response.data?.data?.newPassword || response.data?.newPassword;
        
        await Swal.fire({
          title: 'Password Baru Berhasil Dibuat',
          html: `
            <div class="text-left">
              <p class="mb-3">Password baru untuk <strong>${nama}</strong>:</p>
              <div class="bg-gray-100 p-3 rounded-lg font-mono text-lg text-center select-all">
                ${newPassword}
              </div>
              <p class="text-sm text-gray-500 mt-3">⚠️ Simpan password ini! Password hanya ditampilkan sekali.</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Saya Sudah Menyimpan'
        });
      } catch (error) {
        Swal.fire('Gagal', error.response?.data?.message || 'Gagal membuat password baru', 'error');
      }
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

  // Delete single proposal (DPMD troubleshooting)
  const handleDeleteProposal = async (proposalId, proposalTitle) => {
    const result = await Swal.fire({
      title: 'Hapus Proposal?',
      html: `<div class="text-left">
        <p class="mb-2">Proposal <strong>"${proposalTitle}"</strong> akan dihapus beserta semua berkas terkait.</p>
        <p class="text-sm text-red-600 font-medium">⚠️ Tindakan ini tidak dapat dibatalkan!</p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus Proposal',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await api.delete(`/dpmd/bankeu/proposals/${proposalId}`);
        await fetchData();
        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: res.data?.message || 'Proposal berhasil dihapus',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire('Gagal', error.response?.data?.message || 'Gagal menghapus proposal', 'error');
      }
    }
  };

  // Delete all proposals from a desa (DPMD bulk delete)
  const handleDeleteDesaProposals = async (desaId, desaName, proposalCount) => {
    const result = await Swal.fire({
      title: 'Hapus Semua Proposal Desa?',
      html: `<div class="text-left">
        <p class="mb-2">Semua <strong>${proposalCount} proposal</strong> dari <strong>Desa ${desaName}</strong> akan dihapus beserta berkas-berkasnya.</p>
        <p class="text-sm text-red-600 font-medium">⚠️ Tindakan ini tidak dapat dibatalkan!</p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Ya, Hapus ${proposalCount} Proposal`,
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await api.delete(`/dpmd/bankeu/desa/${desaId}/proposals`);
        await fetchData();
        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: res.data?.message || 'Semua proposal desa berhasil dihapus',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire('Gagal', error.response?.data?.message || 'Gagal menghapus proposal desa', 'error');
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

  // Group proposals by desa for tracking view
  const groupedByDesa = useMemo(() => {
    const grouped = {};
    proposals.forEach(proposal => {
      const desaId = proposal.desa_id;
      const desaName = proposal.desas?.nama || 'Tidak Diketahui';
      const kecamatanName = proposal.desas?.kecamatans?.nama || 'Tidak Diketahui';
      const key = `${kecamatanName}-${desaId}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          desaId,
          desaName,
          kecamatanName,
          proposals: []
        };
      }
      grouped[key].proposals.push(proposal);
    });
    return grouped;
  }, [proposals]);

  // Helper function to determine proposal stage
  const getProposalStage = (proposal) => {
    if (proposal.dpmd_status === 'pending') return 'di_dpmd';
    if (proposal.dinas_status === 'approved' && proposal.surat_pengantar) return 'di_dpmd';
    if (proposal.dinas_status === 'approved') return 'di_kecamatan';
    return 'di_dinas';
  };

  // Get unique dinas list from proposals
  const availableDinasList = useMemo(() => {
    const dinasSet = new Set();
    proposals.forEach(p => {
      const dinasName = p.bankeu_master_kegiatan?.dinas_terkait;
      if (dinasName) dinasSet.add(dinasName);
    });
    return [...dinasSet].sort();
  }, [proposals]);

  // Filter grouped by desa for tracking view
  const filteredTrackingDesa = useMemo(() => {
    return Object.entries(groupedByDesa).reduce((acc, [key, data]) => {
      // Filter by kecamatan
      if (trackingSelectedKecamatan !== 'all' && data.kecamatanName !== trackingSelectedKecamatan) {
        return acc;
      }
      // Filter by search
      if (trackingSearchTerm) {
        const term = trackingSearchTerm.toLowerCase();
        if (!data.desaName.toLowerCase().includes(term) && 
            !data.kecamatanName.toLowerCase().includes(term)) {
          return acc;
        }
      }
      // Filter by status - filter the proposals within each desa
      if (trackingStatusFilter !== 'all') {
        const filteredProposals = data.proposals.filter(p => {
          const stage = getProposalStage(p);
          if (stage !== trackingStatusFilter) return false;
          // If filtering by dinas and status is di_dinas, also filter by specific dinas
          if (trackingStatusFilter === 'di_dinas' && trackingDinasFilter !== 'all') {
            return p.bankeu_master_kegiatan?.dinas_terkait === trackingDinasFilter;
          }
          return true;
        });
        if (filteredProposals.length === 0) return acc;
        acc[key] = { ...data, proposals: filteredProposals };
        return acc;
      }
      acc[key] = data;
      return acc;
    }, {});
  }, [groupedByDesa, trackingSelectedKecamatan, trackingSearchTerm, trackingStatusFilter, trackingDinasFilter]);

  // Statistics calculations
  const statsData = useMemo(() => {
    const desaWithProposals = [...new Set(proposals.map(p => p.desa_id))];
    const totalDesa = allDesa.length || 416;
    const totalKecamatan = allKecamatan.length || 40;
    
    // Calculate total anggaran - use anggaran_usulan field
    const totalAnggaran = proposals.reduce((sum, p) => sum + (Number(p.anggaran_usulan) || Number(p.anggaran) || 0), 0);
    
    // Per kecamatan statistics
    const perKecamatan = {};
    proposals.forEach(p => {
      const kecName = p.desas?.kecamatans?.nama || 'Tidak Diketahui';
      if (!perKecamatan[kecName]) {
        perKecamatan[kecName] = {
          nama: kecName,
          jumlahProposal: 0,
          jumlahDesa: new Set(),
          totalAnggaran: 0
        };
      }
      perKecamatan[kecName].jumlahProposal++;
      perKecamatan[kecName].jumlahDesa.add(p.desa_id);
      perKecamatan[kecName].totalAnggaran += Number(p.anggaran_usulan) || Number(p.anggaran) || 0;
    });

    // Status breakdown - use dpmd_status for DPMD verification page
    const statusBreakdown = {
      pending: proposals.filter(p => !p.dpmd_status || p.dpmd_status === 'pending').length,
      approved: proposals.filter(p => p.dpmd_status === 'approved').length,
      rejected: proposals.filter(p => p.dpmd_status === 'rejected').length,
      revision: proposals.filter(p => p.dpmd_status === 'revision').length,
    };

    // Per desa statistics  
    const perDesa = {};
    proposals.forEach(p => {
      const desaId = p.desa_id;
      const desaName = p.desas?.nama || 'Tidak Diketahui';
      const kecName = p.desas?.kecamatans?.nama || 'Tidak Diketahui';
      if (!perDesa[desaId]) {
        perDesa[desaId] = {
          desaId,
          desaName,
          kecamatanName: kecName,
          jumlahProposal: 0,
          totalAnggaran: 0,
          proposals: []
        };
      }
      perDesa[desaId].jumlahProposal++;
      perDesa[desaId].totalAnggaran += Number(p.anggaran_usulan) || Number(p.anggaran) || 0;
      perDesa[desaId].proposals.push(p);
    });

    // Desa yang belum mengajukan - compare with string/number conversion
    const desaIdsWithProposals = desaWithProposals.map(id => String(id));
    const desaTidakMengajukan = allDesa.filter(d => !desaIdsWithProposals.includes(String(d.id)));

    return {
      totalProposal: proposals.length,
      totalDesaMengajukan: desaWithProposals.length,
      totalDesaTidakMengajukan: totalDesa - desaWithProposals.length,
      totalKecamatanAktif: Object.keys(perKecamatan).length,
      totalKecamatan,
      totalDesa,
      totalAnggaran,
      perKecamatan: Object.values(perKecamatan).map(k => ({
        ...k,
        jumlahDesa: k.jumlahDesa.size
      })).sort((a, b) => b.jumlahProposal - a.jumlahProposal),
      perDesa: Object.values(perDesa).sort((a, b) => b.totalAnggaran - a.totalAnggaran),
      statusBreakdown,
      desaTidakMengajukan
    };
  }, [proposals, allDesa, allKecamatan]);

  // Chart data
  const chartData = useMemo(() => {
    // Bar chart - per kecamatan
    const barData = statsData.perKecamatan.slice(0, 15).map(k => ({
      name: k.nama.length > 12 ? k.nama.substring(0, 12) + '...' : k.nama,
      fullName: k.nama,
      proposal: k.jumlahProposal,
      desa: k.jumlahDesa,
      anggaran: k.totalAnggaran / 1000000 // Convert to millions
    }));

    // Pie chart - status breakdown
    const pieData = [
      { name: 'Disetujui Dinas', value: statsData.statusBreakdown.approved, color: '#22c55e' },
      { name: 'Menunggu', value: statsData.statusBreakdown.pending, color: '#3b82f6' },
      { name: 'Perlu Revisi', value: statsData.statusBreakdown.revision, color: '#f59e0b' },
      { name: 'Ditolak', value: statsData.statusBreakdown.rejected, color: '#ef4444' },
    ].filter(d => d.value > 0);

    // Desa participation pie
    const desaParticipation = [
      { name: 'Sudah Mengajukan', value: statsData.totalDesaMengajukan, color: '#22c55e' },
      { name: 'Belum Mengajukan', value: statsData.totalDesaTidakMengajukan, color: '#e5e7eb' },
    ];

    return { barData, pieData, desaParticipation };
  }, [statsData]);

  // Export to Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Sort proposals by kecamatan then desa
    const sortedProposals = [...proposals].sort((a, b) => {
      const kecA = a.desas?.kecamatans?.nama || '';
      const kecB = b.desas?.kecamatans?.nama || '';
      if (kecA !== kecB) return kecA.localeCompare(kecB);
      const desaA = a.desas?.nama || '';
      const desaB = b.desas?.nama || '';
      return desaA.localeCompare(desaB);
    });

    // Create single sheet with all data
    const data = [
      ['DATA PROPOSAL BANKEU - DPMD KABUPATEN BOGOR'],
      [`Tanggal Export: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
      [''],
      ['No', 'Kecamatan', 'Desa', 'Program/Dinas', 'Judul Kegiatan', 'Nama Kegiatan Spesifik', 'Lokasi', 'Volume', 'Anggaran (Rp)'],
      ...sortedProposals.map((p, i) => [
        i + 1,
        p.desas?.kecamatans?.nama || '-',
        p.desas?.nama || '-',
        p.bankeu_master_kegiatan?.nama_kegiatan || p.bankeu_master_kegiatan?.dinas_terkait || '-',
        p.judul_proposal || '-',
        p.nama_kegiatan_spesifik || '-',
        p.lokasi || '-',
        p.volume || '-',
        p.anggaran_usulan || p.anggaran || 0
      ])
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    sheet['!cols'] = [
      { wch: 5 },   // No
      { wch: 20 },  // Kecamatan
      { wch: 20 },  // Desa
      { wch: 25 },  // Program
      { wch: 40 },  // Judul Kegiatan
      { wch: 35 },  // Nama Kegiatan Spesifik
      { wch: 30 },  // Lokasi
      { wch: 20 },  // Volume
      { wch: 18 },  // Anggaran
    ];
    
    XLSX.utils.book_append_sheet(workbook, sheet, 'Data Proposal Bankeu');

    // Download
    const fileName = `Data_Bankeu_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    Swal.fire({
      icon: 'success',
      title: 'Export Berhasil',
      text: `File ${fileName} berhasil didownload`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Export to JSON
  const exportToJson = () => {
    const sortedProposals = [...proposals].sort((a, b) => {
      const kecA = a.desas?.kecamatans?.nama || '';
      const kecB = b.desas?.kecamatans?.nama || '';
      if (kecA !== kecB) return kecA.localeCompare(kecB);
      const desaA = a.desas?.nama || '';
      const desaB = b.desas?.nama || '';
      return desaA.localeCompare(desaB);
    });

    const jsonData = {
      title: 'DATA PROPOSAL BANKEU - DPMD KABUPATEN BOGOR',
      exportDate: new Date().toISOString(),
      totalProposal: sortedProposals.length,
      data: sortedProposals.map((p, i) => ({
        no: i + 1,
        kecamatan: p.desas?.kecamatans?.nama || '-',
        desa: p.desas?.nama || '-',
        program: p.bankeu_master_kegiatan?.nama_kegiatan || p.bankeu_master_kegiatan?.dinas_terkait || '-',
        judul_kegiatan: p.judul_proposal || '-',
        nama_kegiatan: p.nama_kegiatan_spesifik || '-',
        lokasi: p.lokasi || '-',
        volume: p.volume || '-',
        anggaran: p.anggaran_usulan || p.anggaran || 0
      }))
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `Data_Bankeu_${new Date().toISOString().split('T')[0]}.json`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Swal.fire({
      icon: 'success',
      title: 'Export Berhasil',
      text: `File ${fileName} berhasil didownload`,
      timer: 2000,
      showConfirmButton: false
    });
  };

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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-2 inline-flex gap-2 flex-wrap">
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
            onClick={() => setActiveView('statistics')}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeView === 'statistics'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistik Dashboard
            </div>
          </button>
          <button
            onClick={() => setActiveView('control')}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeView === 'control'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Power className="h-4 w-4" />
              Kontrol Pengajuan
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
        
        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-gray-200 font-semibold text-sm transition-all hover:bg-gray-50 hover:shadow-md ${
            refreshing ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw className={`h-4 w-4 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-gray-700">{refreshing ? 'Memuat...' : 'Refresh Data'}</span>
        </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-4 pb-6">
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
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
                                              {desaProposals.length} proposal
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteDesaProposals(desaId, desaName, desaProposals.length);
                                              }}
                                              className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg transition-colors"
                                              title="Hapus semua proposal desa ini"
                                            >
                                              <Trash2 className="h-3.5 w-3.5 text-white" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Proposals in this Desa */}
                                      <div>
                                        {desaProposals.map((proposal, idx) => (
                                          <div
                                            key={proposal.id.toString()}
                                            className={`p-6 bg-white ${idx !== desaProposals.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-blue-50/50 transition-colors`}
                                          >
                                            {/* Proposal Info and Documents in One Container */}
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

                                              {/* Document Buttons - Single Row with 3 Sections */}
                                              <div className="flex flex-wrap items-center gap-2 w-full mt-3 pt-3 border-t border-gray-100">
                                                {/* Section Label - Dokumen Desa */}
                                                <div className="flex items-center gap-1.5">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Dokumen Desa:</span>
                                                </div>
                                                
                                                {/* Proposal Desa */}
                                                {proposal.file_proposal && (
                                                  <a
                                                    href={`${imageBaseUrl}/storage/uploads/bankeu/${proposal.file_proposal}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg transition-all text-xs font-medium shadow-sm hover:shadow border border-blue-200 hover:border-blue-600"
                                                  >
                                                    <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                                                    <span>Proposal</span>
                                                  </a>
                                                )}
                                                
                                                {/* Surat Pengantar Desa */}
                                                {proposal.surat_pengantar_desa && (
                                                  <a
                                                    href={`${imageBaseUrl}/storage/uploads/bankeu/${proposal.surat_pengantar_desa}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-600 text-green-700 hover:text-white rounded-lg transition-all text-xs font-medium shadow-sm hover:shadow border border-green-200 hover:border-green-600"
                                                  >
                                                    <Download className="h-3.5 w-3.5 flex-shrink-0" />
                                                    <span>Surat Pengantar</span>
                                                  </a>
                                                )}
                                                
                                                {/* Surat Permohonan Desa */}
                                                {proposal.surat_permohonan_desa && (
                                                  <a
                                                    href={`${imageBaseUrl}/storage/uploads/bankeu/${proposal.surat_permohonan_desa}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white rounded-lg transition-all text-xs font-medium shadow-sm hover:shadow border border-teal-200 hover:border-teal-600"
                                                  >
                                                    <Download className="h-3.5 w-3.5 flex-shrink-0" />
                                                    <span>Surat Permohonan</span>
                                                  </a>
                                                )}

                                                {/* Section Label - Dokumen Kecamatan */}
                                                {(proposal.surat_pengantar || proposal.berita_acara_path) && (
                                                  <div className="flex items-center gap-1.5 ml-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                                                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Dokumen Kecamatan:</span>
                                                  </div>
                                                )}
                                                
                                                {/* Surat Pengantar Kecamatan */}
                                                {proposal.surat_pengantar && (
                                                  <a
                                                    href={`${imageBaseUrl}/storage${proposal.surat_pengantar}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded-lg transition-all text-xs font-medium shadow-sm hover:shadow border border-purple-200 hover:border-purple-600"
                                                  >
                                                    <Download className="h-3.5 w-3.5 flex-shrink-0" />
                                                    <span>Surat Pengantar</span>
                                                  </a>
                                                )}
                                                
                                                {/* Berita Acara Kecamatan */}
                                                {proposal.berita_acara_path && (
                                                  <a
                                                    href={`${imageBaseUrl}/storage${proposal.berita_acara_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white rounded-lg transition-all text-xs font-medium shadow-sm hover:shadow border border-orange-200 hover:border-orange-600"
                                                  >
                                                    <FileCheck className="h-3.5 w-3.5 flex-shrink-0" />
                                                    <span>Berita Acara</span>
                                                  </a>
                                                )}

                                                {/* Delete Button */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteProposal(proposal.id, proposal.judul_proposal);
                                                  }}
                                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white rounded-lg transition-all text-xs font-medium shadow-sm hover:shadow border border-red-200 hover:border-red-600 ml-auto"
                                                  title="Hapus proposal ini"
                                                >
                                                  <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                                                  <span>Hapus</span>
                                                </button>
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
          /* Tracking Status View - Per Desa */
          <div className="space-y-6">
            {/* Search and Filter for Tracking */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-gray-600" />
                <span className="font-semibold text-gray-900">Filter Tracking</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari desa atau kecamatan..."
                    value={trackingSearchTerm}
                    onChange={(e) => setTrackingSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={trackingSelectedKecamatan}
                    onChange={(e) => setTrackingSelectedKecamatan(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    <option value="all">Semua Kecamatan</option>
                    {[...new Set(proposals.map(p => p.desas?.kecamatans?.nama))].filter(Boolean).sort().map(kec => (
                      <option key={kec} value={kec}>{kec}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={trackingStatusFilter}
                    onChange={(e) => {
                      setTrackingStatusFilter(e.target.value);
                      if (e.target.value !== 'di_dinas') setTrackingDinasFilter('all');
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    <option value="all">Semua Status</option>
                    <option value="di_dinas">🏢 Di Dinas Terkait</option>
                    <option value="di_kecamatan">🏛️ Di Kecamatan</option>
                    <option value="di_dpmd">✅ Di DPMD</option>
                  </select>
                </div>
                {trackingStatusFilter === 'di_dinas' && (
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={trackingDinasFilter}
                      onChange={(e) => setTrackingDinasFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 appearance-none bg-violet-50"
                    >
                      <option value="all">Semua Dinas</option>
                      {availableDinasList.map(dinasName => (
                        <option key={dinasName} value={dinasName}>{dinasName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <p className="text-sm text-gray-500">
                  Menampilkan <span className="font-semibold text-blue-600">{Object.keys(filteredTrackingDesa).length}</span> desa
                  {trackingStatusFilter !== 'all' && (
                    <span className="ml-1">
                      ({Object.values(filteredTrackingDesa).reduce((sum, d) => sum + d.proposals.length, 0)} proposal)
                    </span>
                  )}
                </p>
                {(trackingStatusFilter !== 'all' || trackingDinasFilter !== 'all' || trackingSelectedKecamatan !== 'all' || trackingSearchTerm) && (
                  <button
                    onClick={() => {
                      setTrackingStatusFilter('all');
                      setTrackingDinasFilter('all');
                      setTrackingSelectedKecamatan('all');
                      setTrackingSearchTerm('');
                    }}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <XIcon className="h-4 w-4" />
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {Object.keys(filteredTrackingDesa).length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Tidak ada desa ditemukan</p>
                <p className="text-gray-400 text-sm mt-2">Coba ubah filter pencarian</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(filteredTrackingDesa)
                  .sort(([, a], [, b]) => a.kecamatanName.localeCompare(b.kecamatanName) || a.desaName.localeCompare(b.desaName))
                  .map(([key, data]) => {
                    const isExpanded = expandedTrackingDesa.includes(key);
                    const totalProposals = data.proposals.length;
                    const approvedCount = data.proposals.filter(p => p.dinas_status === 'approved').length;
                    const pendingCount = data.proposals.filter(p => !p.dinas_status || p.dinas_status === 'pending').length;
                    const dpmdReceivedCount = data.proposals.filter(p => p.dpmd_status === 'pending').length;

                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                      >
                        {/* Desa Header */}
                        <button
                          onClick={() => setExpandedTrackingDesa(prev => 
                            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                          )}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg shadow-md">
                              <MapPin className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-left">
                              <h3 className="font-bold text-lg text-gray-900">{data.desaName}</h3>
                              <p className="text-sm text-gray-500">{data.kecamatanName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {/* Status Summary Pills */}
                            <div className="hidden sm:flex items-center gap-2">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                {totalProposals} Proposal
                              </span>
                              {approvedCount > 0 && (
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                  {approvedCount} Disetujui
                                </span>
                              )}
                              {dpmdReceivedCount > 0 && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                  {dpmdReceivedCount} di DPMD
                                </span>
                              )}
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Content - Proposals Timeline */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="border-t border-gray-200"
                            >
                              <div className="p-6 space-y-6">
                                {data.proposals.map((proposal, idx) => (
                                  <div key={proposal.id} className={`${idx > 0 ? 'pt-6 border-t border-gray-100' : ''}`}>
                                    {/* Proposal Title */}
                                    <div className="flex items-start gap-3 mb-4">
                                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-gray-900">{proposal.judul_proposal}</h4>
                                        {proposal.bankeu_master_kegiatan && (
                                          <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                            {proposal.bankeu_master_kegiatan.dinas_terkait}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Compact Timeline */}
                                    <div className="flex flex-wrap items-center gap-2 ml-11">
                                      {/* Step 1: Desa Submit */}
                                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                        true ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Desa Submit
                                      </div>
                                      <div className="w-4 h-0.5 bg-gray-300"></div>
                                      
                                      {/* Step 2: Dinas */}
                                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                        proposal.dinas_status === 'approved' ? 'bg-green-100 text-green-700' :
                                        proposal.dinas_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                        proposal.dinas_status === 'revision' ? 'bg-orange-100 text-orange-700' :
                                        proposal.dinas_status === 'pending' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                        'bg-gray-100 text-gray-500'
                                      }`}>
                                        {proposal.dinas_status === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                                         proposal.dinas_status === 'rejected' ? <XCircle className="h-3.5 w-3.5" /> :
                                         <Clock className="h-3.5 w-3.5" />}
                                        Dinas {proposal.dinas_status === 'approved' ? '✓' : 
                                               proposal.dinas_status === 'rejected' ? '✗' : 
                                               proposal.dinas_status === 'revision' ? '↻' : '...'}
                                      </div>
                                      <div className="w-4 h-0.5 bg-gray-300"></div>
                                      
                                      {/* Step 3: Kecamatan */}
                                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                        proposal.surat_pengantar ? 'bg-green-100 text-green-700' :
                                        proposal.dinas_status === 'approved' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                        'bg-gray-100 text-gray-500'
                                      }`}>
                                        {proposal.surat_pengantar ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                        Kecamatan {proposal.surat_pengantar ? '✓' : '...'}
                                      </div>
                                      <div className="w-4 h-0.5 bg-gray-300"></div>
                                      
                                      {/* Step 4: DPMD */}
                                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                        proposal.dpmd_status === 'pending' ? 'bg-green-100 text-green-700' :
                                        proposal.surat_pengantar ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                        'bg-gray-100 text-gray-500'
                                      }`}>
                                        {proposal.dpmd_status === 'pending' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                        DPMD {proposal.dpmd_status === 'pending' ? '✓' : '...'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : activeView === 'statistics' ? (
          /* Statistics Dashboard View - Modern Design */
          <div className="relative min-h-screen">
            {/* Subtle Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-slate-200/30 to-blue-200/30 rounded-full blur-3xl"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-slate-200/30 to-indigo-200/30 rounded-full blur-3xl"
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  opacity: [0.4, 0.2, 0.4]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-8">
              {/* Header with Export Button */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
              >
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    📊 Statistik Dashboard Bankeu
                  </h2>
                  <p className="text-slate-500 mt-1">Analisis data proposal secara real-time</p>
                </div>

                {/* Export Dropdown Button */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="relative px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Data
                    <motion.span
                      animate={{ rotate: showExportMenu ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.span>
                  </motion.button>

                  <AnimatePresence>
                    {showExportMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
                      >
                        <div className="p-1.5">
                          <button
                            onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 rounded-lg transition-all"
                          >
                            <div className="p-1.5 bg-green-100 rounded-lg">
                              <FileSpreadsheet className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 text-sm">Excel (.xlsx)</p>
                              <p className="text-xs text-slate-500">Format spreadsheet</p>
                            </div>
                          </button>
                          <button
                            onClick={() => { exportToJson(); setShowExportMenu(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 rounded-lg transition-all"
                          >
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 text-sm">JSON (.json)</p>
                              <p className="text-xs text-slate-500">Format data terstruktur</p>
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { 
                    label: 'Total Proposal', 
                    value: statsData.totalProposal, 
                    sub: `Dari ${statsData.totalKecamatanAktif} kecamatan aktif`,
                    icon: FileText,
                    bgColor: 'bg-blue-600',
                    lightBg: 'bg-blue-500/20'
                  },
                  { 
                    label: 'Desa Mengajukan', 
                    value: statsData.totalDesaMengajukan, 
                    sub: `${((statsData.totalDesaMengajukan / statsData.totalDesa) * 100).toFixed(1)}% dari ${statsData.totalDesa} desa`,
                    icon: MapPin,
                    bgColor: 'bg-emerald-600',
                    lightBg: 'bg-emerald-500/20'
                  },
                  { 
                    label: 'Belum Mengajukan', 
                    value: statsData.totalDesaTidakMengajukan, 
                    sub: `${((statsData.totalDesaTidakMengajukan / statsData.totalDesa) * 100).toFixed(1)}% belum berpartisipasi`,
                    icon: AlertCircle,
                    bgColor: 'bg-amber-600',
                    lightBg: 'bg-amber-500/20'
                  },
                  { 
                    label: 'Total Anggaran', 
                    value: `Rp ${statsData.totalAnggaran.toLocaleString('id-ID')}`, 
                    isText: true,
                    sub: 'Total seluruh proposal',
                    icon: TrendingUp,
                    bgColor: 'bg-slate-700',
                    lightBg: 'bg-slate-500/20'
                  },
                ].map((card, index) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -3 }}
                    className={`relative overflow-hidden rounded-2xl ${card.bgColor} p-5 text-white shadow-lg cursor-pointer`}
                  >
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                    
                    <div className="relative z-10 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white/80 text-sm font-medium mb-1">{card.label}</p>
                        <p className={`${card.isText ? 'text-lg' : 'text-3xl'} font-bold`}>
                          {card.value}
                        </p>
                        <p className="text-white/70 text-xs mt-2">{card.sub}</p>
                      </div>
                      <div className={`p-2.5 ${card.lightBg} rounded-xl`}>
                        <card.icon className="h-6 w-6" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Data Tables - Combined Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Per Kecamatan Detailed Stats */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200"
                >
                  <div 
                    className="bg-blue-600 px-5 py-4 cursor-pointer hover:bg-blue-500 transition-colors"
                    onClick={() => setShowKecamatanModal(true)}
                  >
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Statistik Lengkap per Kecamatan
                      <span className="ml-auto text-xs opacity-75 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Klik untuk detail
                      </span>
                    </h3>
                    <p className="text-white/80 text-xs mt-1">Proposal, desa mengajukan, dan desa belum mengajukan</p>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-slate-50 z-10">
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kecamatan</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Proposal</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                            <span className="text-emerald-600">Mengajukan</span>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                            <span className="text-amber-600">Belum</span>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Partisipasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statsData.perKecamatan.map((k) => {
                          const totalDesaInKecamatan = k.jumlahDesa + (k.desaBelumMengajukan?.length || 0);
                          const participationRate = totalDesaInKecamatan > 0 
                            ? ((k.jumlahDesa / totalDesaInKecamatan) * 100).toFixed(0) 
                            : 0;
                          return (
                            <tr key={k.nama} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{k.nama}</td>
                              <td className="px-4 py-2.5 text-sm text-right">
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                  {k.jumlahProposal}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-sm text-right">
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                  {k.jumlahDesa}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-sm text-right">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  (k.desaBelumMengajukan?.length || 0) > 0 
                                    ? 'bg-amber-100 text-amber-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {k.desaBelumMengajukan?.length || 0}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-sm text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${
                                        participationRate >= 80 ? 'bg-emerald-500' :
                                        participationRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${participationRate}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-semibold ${
                                    participationRate >= 80 ? 'text-emerald-600' :
                                    participationRate >= 50 ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                    {participationRate}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 sticky bottom-0">
                        <tr className="font-semibold">
                          <td className="px-4 py-3 text-sm text-slate-800">Total</td>
                          <td className="px-4 py-3 text-sm text-right text-blue-700">
                            {statsData.perKecamatan.reduce((sum, k) => sum + k.jumlahProposal, 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-emerald-700">
                            {statsData.totalDesaMengajukan}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-amber-700">
                            {statsData.totalDesaTidakMengajukan}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-700">
                            {((statsData.totalDesaMengajukan / statsData.totalDesa) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </motion.div>

                {/* Status Verifikasi Timeline - Horizontal Flow */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200"
                >
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <FileCheck className="h-4 w-4" />
                      Alur Verifikasi Proposal
                    </h3>
                    <p className="text-white/80 text-xs mt-1">Tahapan verifikasi proposal bankeu</p>
                  </div>
                  <div className="p-6">
                    {/* Timeline Flow */}
                    <div className="relative">
                      {/* Connecting Line */}
                      <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-purple-200 to-emerald-200 rounded-full hidden md:block" />
                      
                      {/* Timeline Steps */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { 
                            step: 1, 
                            label: 'Pengajuan', 
                            desc: 'Desa submit proposal',
                            count: statsData.totalProposal,
                            color: 'blue',
                            icon: FileText
                          },
                          { 
                            step: 2, 
                            label: 'Dinas Terkait', 
                            desc: 'Review dinas terkait',
                            count: proposals.filter(p => p.dinas_status === 'approved').length,
                            color: 'violet',
                            icon: Building
                          },
                          { 
                            step: 3, 
                            label: 'Kecamatan', 
                            desc: 'Review kecamatan',
                            count: proposals.filter(p => p.kecamatan_status === 'approved').length,
                            color: 'purple',
                            icon: Building2
                          },
                          { 
                            step: 4, 
                            label: 'DPMD', 
                            desc: 'Selesai / Diterima',
                            count: proposals.filter(p => p.submitted_to_dpmd).length,
                            color: 'emerald',
                            icon: CheckCircle
                          },
                        ].map((item, index) => {
                          const ItemIcon = item.icon;
                          return (
                            <div key={item.step} className="relative flex flex-col items-center text-center">
                              {/* Step Circle */}
                              <div className={`relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-${item.color}-400 to-${item.color}-600 flex items-center justify-center shadow-lg border-4 border-white`}>
                                <ItemIcon className="h-6 w-6 text-white" />
                              </div>
                              
                              {/* Step Number Badge */}
                              <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-${item.color}-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow`}>
                                {item.step}
                              </div>
                              
                              {/* Label & Count */}
                              <div className="mt-3">
                                <p className={`font-bold text-${item.color}-700`}>{item.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                                <div className={`mt-2 px-3 py-1 rounded-full bg-${item.color}-100 text-${item.color}-700 font-bold text-lg`}>
                                  {item.count}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Top Desa by Anggaran - Full Width */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200"
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Top 10 Desa (Anggaran Tertinggi)
                  </h3>
                  <p className="text-white/80 text-xs mt-1">Desa dengan alokasi anggaran proposal terbesar</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">No</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Desa</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kecamatan</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Proposal</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Anggaran</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statsData.perDesa.slice(0, 10).map((d, i) => (
                          <tr key={d.desaId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                i < 3 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{d.desaName}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{d.kecamatanName}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                {d.jumlahProposal}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-slate-800">
                              Rp {d.totalAnggaran.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              </motion.div>

              {/* Desa Belum Mengajukan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200"
              >
                <div 
                  className="bg-amber-500 px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-amber-400 transition-colors"
                  onClick={() => setShowDesaBelumModal(true)}
                >
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Desa Belum Mengajukan
                    <span className="text-xs opacity-75">(Klik untuk lihat lengkap)</span>
                  </h3>
                  <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-semibold">
                    {statsData.desaTidakMengajukan.length} desa
                  </span>
                </div>
                {statsData.desaTidakMengajukan.length > 0 ? (
                  <div className="p-5 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {statsData.desaTidakMengajukan.slice(0, 48).map((d) => (
                        <div 
                          key={d.id} 
                          className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs hover:bg-amber-100 transition-colors"
                        >
                          <p className="font-medium text-slate-800 truncate">{d.nama}</p>
                          <p className="text-amber-600 truncate text-[10px] mt-0.5">{d.kecamatans?.nama || '-'}</p>
                        </div>
                      ))}
                    </div>
                    {statsData.desaTidakMengajukan.length > 48 && (
                      <p className="text-center text-sm text-slate-500 mt-4 py-2 bg-slate-50 rounded-lg">
                        Dan <span className="font-semibold text-amber-600">{statsData.desaTidakMengajukan.length - 48}</span> desa lainnya... (Export untuk data lengkap)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-lg font-semibold text-slate-700">Luar Biasa!</p>
                    <p className="text-slate-500">Semua desa sudah mengajukan proposal!</p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        ) : activeView === 'control' ? (
          /* Kontrol Pengajuan View */
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-orange-500 px-6 py-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Power className="h-6 w-6" />
                  Kontrol Laju Pengajuan
                </h2>
                <p className="text-white/80 text-sm mt-1">
                  Mengontrol apakah desa dan kecamatan dapat mengajukan/meneruskan proposal
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Info Box */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-amber-800">Informasi Penting</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Fitur ini berguna untuk mengatur penerimaan proposal secara bertahap agar tidak menumpuk.
                        Menutup pengajuan akan mencegah desa/kecamatan mengirim proposal baru ke tahap selanjutnya.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Toggle Controls */}
                <div className="space-y-4">
                  {/* Desa Control */}
                  <div className={`p-5 rounded-xl border-2 transition-all ${
                    submissionSettings.bankeu_submission_desa 
                      ? 'bg-emerald-50 border-emerald-300' 
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          submissionSettings.bankeu_submission_desa ? 'bg-emerald-500' : 'bg-red-500'
                        }`}>
                          {submissionSettings.bankeu_submission_desa ? (
                            <Unlock className="h-6 w-6 text-white" />
                          ) : (
                            <Lock className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">Pengajuan Desa → Dinas Terkait</h3>
                          <p className="text-sm text-slate-600 mt-0.5">
                            {submissionSettings.bankeu_submission_desa 
                              ? 'Desa dapat mengirim proposal ke Dinas Terkait'
                              : 'Desa TIDAK dapat mengirim proposal ke Dinas Terkait'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateSubmissionSetting('bankeu_submission_desa', !submissionSettings.bankeu_submission_desa)}
                        disabled={loadingSettings}
                        className={`relative w-16 h-8 rounded-full transition-colors duration-300 focus:outline-none focus:ring-4 ${
                          submissionSettings.bankeu_submission_desa 
                            ? 'bg-emerald-500 focus:ring-emerald-200' 
                            : 'bg-red-500 focus:ring-red-200'
                        } ${loadingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                          submissionSettings.bankeu_submission_desa ? 'translate-x-8' : ''
                        }`} />
                      </button>
                    </div>
                    <div className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
                      submissionSettings.bankeu_submission_desa 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      Status: {submissionSettings.bankeu_submission_desa ? '✅ DIBUKA' : '🚫 DITUTUP'}
                    </div>
                  </div>

                  {/* Kecamatan Control */}
                  <div className={`p-5 rounded-xl border-2 transition-all ${
                    submissionSettings.bankeu_submission_kecamatan 
                      ? 'bg-emerald-50 border-emerald-300' 
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          submissionSettings.bankeu_submission_kecamatan ? 'bg-emerald-500' : 'bg-red-500'
                        }`}>
                          {submissionSettings.bankeu_submission_kecamatan ? (
                            <Unlock className="h-6 w-6 text-white" />
                          ) : (
                            <Lock className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">Pengajuan Kecamatan → DPMD</h3>
                          <p className="text-sm text-slate-600 mt-0.5">
                            {submissionSettings.bankeu_submission_kecamatan 
                              ? 'Kecamatan dapat meneruskan proposal ke DPMD'
                              : 'Kecamatan TIDAK dapat meneruskan proposal ke DPMD'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateSubmissionSetting('bankeu_submission_kecamatan', !submissionSettings.bankeu_submission_kecamatan)}
                        disabled={loadingSettings}
                        className={`relative w-16 h-8 rounded-full transition-colors duration-300 focus:outline-none focus:ring-4 ${
                          submissionSettings.bankeu_submission_kecamatan 
                            ? 'bg-emerald-500 focus:ring-emerald-200' 
                            : 'bg-red-500 focus:ring-red-200'
                        } ${loadingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                          submissionSettings.bankeu_submission_kecamatan ? 'translate-x-8' : ''
                        }`} />
                      </button>
                    </div>
                    <div className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
                      submissionSettings.bankeu_submission_kecamatan 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      Status: {submissionSettings.bankeu_submission_kecamatan ? '✅ DIBUKA' : '🚫 DITUTUP'}
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="bg-slate-100 rounded-xl p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-800 mb-2">Catatan:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Pengaturan ini <strong>tidak berlaku</strong> untuk Dinas (Dinas tetap dapat memverifikasi)</li>
                    <li>Perubahan berlaku secara langsung setelah toggle diubah</li>
                    <li>Desa/Kecamatan akan melihat pesan bahwa pengajuan ditutup oleh DPMD</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Konfigurasi View - Modern Redesign */
          <div className="space-y-6">
            {/* Config Header with Sub-tabs */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl shadow-xl p-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Pusat Konfigurasi</h2>
                  <p className="text-white/80 text-sm">Kelola master data program, dinas, dan verifikator</p>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfigSubTab('kegiatan')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
                    configSubTab === 'kegiatan'
                      ? 'bg-white text-indigo-600 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <Layers className="h-5 w-5" />
                  Master Kegiatan
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    configSubTab === 'kegiatan' ? 'bg-indigo-100 text-indigo-700' : 'bg-white/20'
                  }`}>{masterKegiatan.length}</span>
                </button>
                <button
                  onClick={() => setConfigSubTab('dinas')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
                    configSubTab === 'dinas'
                      ? 'bg-white text-purple-600 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                  Dinas & Verifikator
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    configSubTab === 'dinas' ? 'bg-purple-100 text-purple-700' : 'bg-white/20'
                  }`}>{dinas.length}</span>
                </button>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {configSubTab === 'kegiatan' && (
                <motion.div
                  key="kegiatan"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {/* Add Program Button */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-800">Daftar Program Kegiatan</h3>
                    </div>
                    <button
                      onClick={() => {
                        setEditingKegiatan(null);
                        setShowKegiatanForm(!showKegiatanForm);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        showKegiatanForm
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                      }`}
                    >
                      {showKegiatanForm ? (
                        <><XIcon className="h-4 w-4" /> Tutup Form</>
                      ) : (
                        <><Plus className="h-4 w-4" /> Tambah Program</>
                      )}
                    </button>
                  </div>

                  {/* Kegiatan Form */}
                  <AnimatePresence>
                    {showKegiatanForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl border-2 border-dashed border-blue-200 p-6"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold text-gray-800">{editingKegiatan ? 'Edit Program' : 'Tambah Program Baru'}</h4>
                        </div>
                        <KegiatanForm 
                          data={editingKegiatan}
                          onSave={handleSaveKegiatan}
                          onCancel={() => {
                            setShowKegiatanForm(false);
                            setEditingKegiatan(null);
                          }}
                          dinasList={dinas}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Kegiatan Cards Grid */}
                  {masterKegiatan.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                      <Layers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">Belum ada program kegiatan</p>
                      <p className="text-gray-400 text-sm mt-1">Klik tombol "Tambah Program" untuk menambahkan</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {masterKegiatan.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden"
                        >
                          {/* Card Header */}
                          <div className={`px-4 py-3 ${
                            item.jenis_kegiatan === 'infrastruktur' 
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500' 
                              : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-1 bg-white/20 text-white text-xs rounded-full font-medium">
                                {item.jenis_kegiatan === 'infrastruktur' ? '🏗️ Infrastruktur' : '📋 Non-Infrastruktur'}
                              </span>
                              <span className="text-white/80 text-xs">#{idx + 1}</span>
                            </div>
                          </div>
                          
                          {/* Card Body */}
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 line-clamp-2 min-h-[48px]">
                              {item.nama_kegiatan}
                            </h4>
                            <div className="flex items-center gap-2 mb-4">
                              <Building2 className="h-4 w-4 text-purple-500" />
                              <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                {item.dinas_terkait}
                              </span>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                              <button
                                onClick={() => {
                                  setEditingKegiatan(item);
                                  setShowKegiatanForm(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteKegiatan(item.id)}
                                className="flex items-center justify-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {configSubTab === 'dinas' && (
                <motion.div
                  key="dinas"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Add Dinas Button */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-800">Daftar Dinas & Verifikator</h3>
                    </div>
                    <button
                      onClick={() => {
                        setEditingDinas(null);
                        setShowDinasForm(!showDinasForm);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        showDinasForm
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                      }`}
                    >
                      {showDinasForm ? (
                        <><XIcon className="h-4 w-4" /> Tutup Form</>
                      ) : (
                        <><Plus className="h-4 w-4" /> Tambah Dinas</>
                      )}
                    </button>
                  </div>

                  {/* Dinas Form */}
                  <AnimatePresence>
                    {showDinasForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-dashed border-purple-200 p-6"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <Building2 className="h-5 w-5 text-purple-600" />
                          <h4 className="font-semibold text-gray-800">{editingDinas ? 'Edit Dinas' : 'Tambah Dinas Baru'}</h4>
                        </div>
                        <DinasForm 
                          data={editingDinas}
                          onSave={handleSaveDinas}
                          onCancel={() => {
                            setShowDinasForm(false);
                            setEditingDinas(null);
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Dinas Cards */}
                  {dinas.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                      <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">Belum ada data dinas</p>
                      <p className="text-gray-400 text-sm mt-1">Klik tombol "Tambah Dinas" untuk menambahkan</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dinas.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                        >
                          {/* Dinas Header - Clickable to expand */}
                          <div 
                            onClick={() => handleExpandDinas(item.id)}
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${
                                expandedDinasId === item.id 
                                  ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                                  : 'bg-gradient-to-br from-gray-100 to-gray-200'
                              }`}>
                                <Building2 className={`h-6 w-6 ${
                                  expandedDinasId === item.id ? 'text-white' : 'text-gray-600'
                                }`} />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900">{item.nama}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                    {item.singkatan || '-'}
                                  </span>
                                  {item.kode_dinas && (
                                    <span className="text-xs text-gray-500">Kode: {item.kode_dinas}</span>
                                  )}
                                  {/* Account status indicator */}
                                  {item.user_account ? (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      Akun Aktif
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Belum Ada Akun
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">
                                  {dinasVerifikators[item.id] !== undefined ? dinasVerifikators[item.id].length : (item.verifikator_count || 0)} Verifikator
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDinas(item);
                                    setShowDinasForm(true);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit Dinas"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDinas(item.id);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Hapus Dinas"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${
                                expandedDinasId === item.id ? 'rotate-180' : ''
                              }`} />
                            </div>
                          </div>

                          {/* Expanded Section - Verifikator */}
                          <AnimatePresence>
                            {expandedDinasId === item.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white"
                              >
                                <div className="p-5">
                                  {/* Verifikator Header */}
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                      <Shield className="h-5 w-5 text-purple-600" />
                                      <h4 className="font-semibold text-gray-800">Daftar Verifikator</h4>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setEditingVerifikator(null);
                                        setShowVerifikatorForm(!showVerifikatorForm);
                                      }}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                                        showVerifikatorForm
                                          ? 'bg-gray-200 text-gray-700'
                                          : 'bg-purple-600 text-white hover:bg-purple-700'
                                      }`}
                                    >
                                      {showVerifikatorForm ? (
                                        <><XIcon className="h-4 w-4" /> Tutup</>
                                      ) : (
                                        <><UserPlus className="h-4 w-4" /> Tambah Verifikator</>
                                      )}
                                    </button>
                                  </div>

                                  {/* Verifikator Form */}
                                  <AnimatePresence>
                                    {showVerifikatorForm && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200"
                                      >
                                        <VerifikatorForm
                                          data={editingVerifikator}
                                          onSave={(formData) => handleSaveVerifikator(item.id, formData)}
                                          onCancel={() => {
                                            setShowVerifikatorForm(false);
                                            setEditingVerifikator(null);
                                          }}
                                        />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {/* Verifikator List */}
                                  {loadingVerifikator ? (
                                    <div className="text-center py-8">
                                      <RefreshCw className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-2" />
                                      <p className="text-gray-500 text-sm">Memuat data verifikator...</p>
                                    </div>
                                  ) : !dinasVerifikators[item.id] || dinasVerifikators[item.id].length === 0 ? (
                                    <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
                                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                      <p className="text-gray-500">Belum ada verifikator untuk dinas ini</p>
                                      <p className="text-gray-400 text-sm mt-1">Klik "Tambah Verifikator" untuk menambahkan</p>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {dinasVerifikators[item.id].map((verifikator) => (
                                        <div
                                          key={verifikator.id}
                                          className={`p-4 rounded-xl border-2 transition-all ${
                                            verifikator.is_active 
                                              ? 'bg-white border-green-200' 
                                              : 'bg-gray-50 border-gray-200 opacity-60'
                                          }`}
                                        >
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                              <div className={`p-2 rounded-full ${
                                                verifikator.is_active ? 'bg-green-100' : 'bg-gray-200'
                                              }`}>
                                                <UserCheck className={`h-5 w-5 ${
                                                  verifikator.is_active ? 'text-green-600' : 'text-gray-500'
                                                }`} />
                                              </div>
                                              <div>
                                                <h5 className="font-semibold text-gray-900">{verifikator.nama}</h5>
                                                <p className="text-sm text-gray-600">{verifikator.jabatan}</p>
                                                {verifikator.nip && (
                                                  <p className="text-xs text-gray-500 mt-1">NIP: {verifikator.nip}</p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                              <button
                                                onClick={() => handleToggleVerifikatorStatus(item.id, verifikator.id)}
                                                className={`p-1.5 rounded-lg transition-colors ${
                                                  verifikator.is_active 
                                                    ? 'text-green-600 hover:bg-green-50' 
                                                    : 'text-gray-400 hover:bg-gray-100'
                                                }`}
                                                title={verifikator.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                              >
                                                {verifikator.is_active ? (
                                                  <ToggleRight className="h-5 w-5" />
                                                ) : (
                                                  <ToggleLeft className="h-5 w-5" />
                                                )}
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setEditingVerifikator(verifikator);
                                                  setShowVerifikatorForm(true);
                                                }}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit"
                                              >
                                                <Edit className="h-4 w-4" />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteVerifikator(item.id, verifikator.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          {/* Login Credentials Section */}
                                          <div className="mt-3 pt-3 border-t border-gray-100">
                                            <div className="bg-gray-50 rounded-lg p-3">
                                              <div className="flex items-center gap-2 mb-2">
                                                <Key className="h-4 w-4 text-amber-600" />
                                                <span className="text-xs font-semibold text-gray-700">Akun Login</span>
                                              </div>
                                              <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                  <span className="text-xs text-gray-600">Email:</span>
                                                  <span className="text-xs font-mono text-gray-800 bg-white px-1.5 py-0.5 rounded">{verifikator.email}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Lock className="h-3.5 w-3.5 text-gray-400" />
                                                  <span className="text-xs text-gray-600">Password:</span>
                                                  <span className="text-xs text-gray-500 italic">••••••••</span>
                                                  <button
                                                    onClick={() => handleResetPassword(item.id, verifikator.id, verifikator.nama)}
                                                    className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
                                                    title="Buat Password Baru"
                                                  >
                                                    <RefreshCw className="h-3 w-3" />
                                                    Buat Baru
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Status Badge */}
                                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                              verifikator.is_active 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-gray-200 text-gray-600'
                                            }`}>
                                              {verifikator.is_active ? '✅ Aktif' : '⏸️ Nonaktif'}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                              {verifikator.created_at && new Date(verifikator.created_at).toLocaleDateString('id-ID')}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
        }
      </div>

      {/* Modal Statistik per Kecamatan */}
      <AnimatePresence>
        {showKecamatanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowKecamatanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <Building2 className="h-6 w-6" />
                    Statistik Lengkap per Kecamatan
                  </h2>
                  <button 
                    onClick={() => setShowKecamatanModal(false)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <XIcon className="h-5 w-5 text-white" />
                  </button>
                </div>
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-white/70 text-xs">Total Kecamatan</p>
                    <p className="text-white text-xl font-bold">{statsData.perKecamatan.length}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-white/70 text-xs">Total Proposal</p>
                    <p className="text-white text-xl font-bold">{statsData.totalProposal}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-white/70 text-xs">Desa Mengajukan</p>
                    <p className="text-white text-xl font-bold">{statsData.totalDesaMengajukan}/{statsData.totalDesa}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-white/70 text-xs">Total Anggaran</p>
                    <p className="text-white text-lg font-bold">Rp {statsData.totalAnggaran.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-y-auto max-h-[55vh]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">No</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Kecamatan</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Jumlah Proposal</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Desa Mengajukan</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total Anggaran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData.perKecamatan.map((k, i) => (
                      <tr key={k.nama} className="border-b border-slate-100 hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            i < 3 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="font-semibold text-slate-800">{k.nama}</span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                            {k.jumlahProposal}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700">
                            {k.jumlahDesa} desa
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-slate-800">
                          Rp {k.totalAnggaran.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowKecamatanModal(false)}
                  className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-semibold"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Desa Belum Mengajukan */}
      <AnimatePresence>
        {showDesaBelumModal && (
          <DesaBelumMengajukanModal 
            statsData={statsData}
            onClose={() => setShowDesaBelumModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Modal Component for Desa Belum Mengajukan with Kecamatan Filter
const DesaBelumMengajukanModal = ({ statsData, onClose }) => {
  const [selectedKecamatan, setSelectedKecamatan] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Group by kecamatan
  const groupedByKecamatan = useMemo(() => {
    const grouped = {};
    statsData.desaTidakMengajukan.forEach(d => {
      const kecName = d.kecamatans?.nama || 'Tidak Diketahui';
      if (!grouped[kecName]) grouped[kecName] = [];
      grouped[kecName].push(d);
    });
    return grouped;
  }, [statsData.desaTidakMengajukan]);

  const kecamatanList = useMemo(() => {
    return Object.keys(groupedByKecamatan).sort();
  }, [groupedByKecamatan]);

  // Filter data based on selected kecamatan and search
  const filteredData = useMemo(() => {
    let result = { ...groupedByKecamatan };
    
    // Filter by kecamatan
    if (selectedKecamatan !== 'all') {
      result = { [selectedKecamatan]: groupedByKecamatan[selectedKecamatan] || [] };
    }
    
    // Filter by search term
    if (searchTerm) {
      const filtered = {};
      Object.entries(result).forEach(([kecName, desaList]) => {
        const matchedDesa = desaList.filter(d => 
          d.nama.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (matchedDesa.length > 0) {
          filtered[kecName] = matchedDesa;
        }
      });
      result = filtered;
    }
    
    return result;
  }, [groupedByKecamatan, selectedKecamatan, searchTerm]);

  const totalFilteredDesa = useMemo(() => {
    return Object.values(filteredData).reduce((sum, arr) => sum + arr.length, 0);
  }, [filteredData]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <AlertCircle className="h-6 w-6" />
              Daftar Lengkap Desa Belum Mengajukan
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <XIcon className="h-5 w-5 text-white" />
            </button>
          </div>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-white/70 text-xs">Total Desa Belum Mengajukan</p>
              <p className="text-white text-2xl font-bold">{statsData.desaTidakMengajukan.length}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-white/70 text-xs">Tersebar di</p>
              <p className="text-white text-2xl font-bold">{kecamatanList.length} Kecamatan</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-white/70 text-xs">Partisipasi</p>
              <p className="text-white text-2xl font-bold">{(((statsData.totalDesa - statsData.desaTidakMengajukan.length) / statsData.totalDesa) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama desa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={selectedKecamatan}
              onChange={e => setSelectedKecamatan(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-white appearance-none"
            >
              <option value="all">Semua Kecamatan ({statsData.desaTidakMengajukan.length})</option>
              {kecamatanList.map(kec => (
                <option key={kec} value={kec}>
                  {kec} ({groupedByKecamatan[kec]?.length || 0} desa)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[50vh] p-6">
          {Object.keys(filteredData).length === 0 ? (
            <div className="text-center py-10">
              <AlertCircle className="h-12 w-12 text-amber-300 mx-auto mb-3" />
              <p className="text-slate-500">Tidak ada desa yang cocok dengan pencarian</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(filteredData).sort().map(kecName => (
                <div key={kecName} className="border border-amber-200 rounded-xl overflow-hidden">
                  <div className="bg-amber-100 px-4 py-2 flex items-center justify-between">
                    <span className="font-semibold text-amber-800 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {kecName}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-xs font-semibold">
                      {filteredData[kecName].length} desa
                    </span>
                  </div>
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {filteredData[kecName].map(d => (
                      <div 
                        key={d.id}
                        className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-sm text-slate-700 hover:bg-amber-100 transition-colors"
                      >
                        {d.nama}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-amber-50 border-t border-amber-200 flex justify-between items-center">
          <p className="text-sm text-amber-700">
            Menampilkan <span className="font-semibold">{totalFilteredDesa}</span> dari <span className="font-semibold">{statsData.desaTidakMengajukan.length}</span> desa
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </motion.div>
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
    singkatan: data?.singkatan || '',
    kode_dinas: data?.kode_dinas || ''
  });
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showEditEmail, setShowEditEmail] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  useEffect(() => {
    setFormData({
      nama: data?.nama || '',
      singkatan: data?.singkatan || '',
      kode_dinas: data?.kode_dinas || ''
    });
    setShowCreateAccount(false);
    setShowEditEmail(false);
    setShowResetPassword(false);
    setAccountEmail('');
    setAccountPassword('');
    setEditEmailValue('');
    setResetPasswordValue('');
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleResetPassword = async () => {
    if (!data?.id || !resetPasswordValue.trim()) {
      Swal.fire('Error', 'Password baru harus diisi', 'error');
      return;
    }

    if (resetPasswordValue.trim().length < 6) {
      Swal.fire('Error', 'Password minimal 6 karakter', 'error');
      return;
    }

    setIsResetting(true);
    try {
      await api.post(`/master/dinas/${data.id}/reset-password`, {
        password: resetPasswordValue.trim()
      });
      
      await Swal.fire({
        title: 'Password Berhasil Diubah',
        html: `Password untuk akun <strong>${data.user_account?.email}</strong> berhasil diubah.`,
        icon: 'success',
        confirmButtonText: 'OK'
      });
      
      setShowResetPassword(false);
      setResetPasswordValue('');
    } catch (error) {
      Swal.fire('Gagal', error.response?.data?.message || 'Gagal mengubah password', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!data?.id || !accountEmail.trim()) {
      Swal.fire('Error', 'Email harus diisi', 'error');
      return;
    }

    if (!accountPassword.trim() || accountPassword.trim().length < 6) {
      Swal.fire('Error', 'Password harus minimal 6 karakter', 'error');
      return;
    }

    setIsCreatingAccount(true);
    try {
      await api.post(`/master/dinas/${data.id}/create-account`, {
        email: accountEmail.trim(),
        password: accountPassword.trim()
      });
      
      await Swal.fire({
        title: 'Akun Berhasil Dibuat',
        html: `Akun untuk <strong>${accountEmail.trim()}</strong> berhasil dibuat.`,
        icon: 'success',
        confirmButtonText: 'OK'
      });
      
      setShowCreateAccount(false);
      setAccountEmail('');
      setAccountPassword('');
      // Trigger refresh
      onCancel();
    } catch (error) {
      Swal.fire('Gagal', error.response?.data?.message || 'Gagal membuat akun', 'error');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!data?.id || !editEmailValue.trim()) {
      Swal.fire('Error', 'Email harus diisi', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'Ubah Email Akun?',
      html: `Email akun akan diubah dari <strong>${data.user_account?.email}</strong> menjadi <strong>${editEmailValue.trim()}</strong>.<br/><br/>Kredensial login akan berubah.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Ubah Email',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setIsUpdatingEmail(true);
      try {
        await api.put(`/master/dinas/${data.id}/update-account`, {
          email: editEmailValue.trim()
        });
        
        await Swal.fire({
          title: 'Email Berhasil Diubah',
          html: `Email akun berhasil diubah menjadi <strong>${editEmailValue.trim()}</strong>`,
          icon: 'success',
          confirmButtonText: 'OK'
        });
        
        setShowEditEmail(false);
        setEditEmailValue('');
        // Trigger refresh
        onCancel();
      } catch (error) {
        Swal.fire('Gagal', error.response?.data?.message || 'Gagal mengubah email', 'error');
      } finally {
        setIsUpdatingEmail(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Kode Dinas
          </label>
          <input
            type="text"
            value={formData.kode_dinas}
            onChange={(e) => setFormData({ ...formData, kode_dinas: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
            placeholder="Contoh: DINKES"
          />
          <p className="text-xs text-gray-500 mt-1">Kode unik untuk identifikasi dinas (otomatis uppercase, spasi diganti _)</p>
        </div>
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

      {/* Akun Login Section - Only for editing existing dinas */}
      {data && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Key className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-gray-700">Akun Login Dinas</span>
          </div>
          
          {data.user_account ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                {showEditEmail ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Email Baru:</span>
                    </div>
                    <input
                      type="email"
                      value={editEmailValue}
                      onChange={(e) => setEditEmailValue(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder={data.user_account.email}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUpdateEmail}
                        disabled={isUpdatingEmail}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUpdatingEmail ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Simpan Email
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditEmail(false);
                          setEditEmailValue('');
                        }}
                        className="px-3 py-2 text-sm text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-mono text-gray-800 bg-white px-2 py-1 rounded">{data.user_account.email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditEmail(true);
                        setEditEmailValue(data.user_account.email);
                      }}
                      className="ml-2 flex items-center gap-1 px-2 py-1 text-xs text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Password:</span>
                  <span className="text-sm text-gray-500 italic">••••••••</span>
                  {!showResetPassword && (
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors"
                    >
                      <Edit className="h-3 w-3" />
                      Ubah Password
                    </button>
                  )}
                </div>
                {showResetPassword && (
                  <div className="space-y-2 mt-2 p-3 bg-amber-50 rounded-lg">
                    <input
                      type="password"
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Password baru (min. 6 karakter)"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={isResetting}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isResetting ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Simpan Password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowResetPassword(false);
                          setResetPasswordValue('');
                        }}
                        className="px-3 py-2 text-sm text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    data.user_account.is_active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {data.user_account.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-700 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Belum ada akun login</span>
              </div>
              
              {showCreateAccount ? (
                <div className="space-y-3 mt-3">
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Email untuk login dinas"
                  />
                  <input
                    type="password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Password (min. 6 karakter)"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateAccount}
                      disabled={isCreatingAccount}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isCreatingAccount ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      Buat Akun
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateAccount(false);
                        setAccountEmail('');
                        setAccountPassword('');
                      }}
                      className="px-3 py-2 text-sm text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateAccount(true)}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Buat Akun Login
                </button>
              )}
            </div>
          )}
        </div>
      )}

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

// Form Component for Verifikator
const VerifikatorForm = ({ data, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nama: data?.nama || '',
    nip: data?.nip || '',
    jabatan: data?.jabatan || '',
    email: data?.email || '',
    password: ''
  });

  useEffect(() => {
    setFormData({
      nama: data?.nama || '',
      nip: data?.nip || '',
      jabatan: data?.jabatan || '',
      email: data?.email || '',
      password: ''
    });
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Don't send empty password for updates
    const submitData = { ...formData };
    if (data && !submitData.password) {
      delete submitData.password;
    }
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.nama}
            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Nama lengkap verifikator"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            NIP
          </label>
          <input
            type="text"
            value={formData.nip}
            onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Nomor Induk Pegawai"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Jabatan <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.jabatan}
            onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Contoh: Kepala Bidang"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="email@dinas.go.id"
            required
          />
          {data && <p className="text-xs text-gray-500 mt-1">⚠️ Mengubah email akan mengubah kredensial login</p>}
        </div>

        {!data && (
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Password untuk login"
              required={!data}
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          {data ? 'Update Verifikator' : 'Tambah Verifikator'}
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
