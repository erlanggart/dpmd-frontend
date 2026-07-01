import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { 
  FiArrowLeft, FiMail, FiUser, FiCalendar, FiClock, FiFileText,
  FiSend, FiEye, FiX, FiCheck, FiDownload, FiAlertCircle, FiActivity,
  FiLayers, FiInbox, FiZap, FiMessageSquare, FiChevronDown, FiChevronRight,
  FiUpload
} from 'react-icons/fi';
import api from '../../api';
import { toast } from 'react-hot-toast';
import { INSTRUKSI_OPTIONS, getInstruksiBadgeClass, getInstruksiLabel } from '../../constants/disposisiInstruksi';

const ROLE_LABELS = {
  sekretaris_dinas: 'Sekretaris Dinas',
  kepala_bidang: 'Kepala Bidang',
  ketua_tim: 'Ketua Tim',
  pegawai: 'Pegawai',
};

const ROLE_ORDER = ['sekretaris_dinas', 'kepala_bidang', 'ketua_tim', 'pegawai'];

export default function DisposisiDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setHideBottomNav } = useOutletContext() || {};
  const [disposisi, setDisposisi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTeruskanModal, setShowTeruskanModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('Dokumen');
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [formTeruskan, setFormTeruskan] = useState({ catatan: '', instruksi: ['laksanakan'] });
  const [submitting, setSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showInstruksiDropdown, setShowInstruksiDropdown] = useState(false);
  const [instruksiSearch, setInstruksiSearch] = useState('');
  const [uploadingDispositionSheet, setUploadingDispositionSheet] = useState(false);
  const instruksiDropdownRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canForward = ['kepala_dinas', 'sekretaris_dinas', 'kepala_bidang', 'ketua_tim'].includes(user.role);

  // Hide bottom nav on mobile for this detail page
  useEffect(() => {
    setHideBottomNav?.(true);
    return () => setHideBottomNav?.(false);
  }, [setHideBottomNav]);

  useEffect(() => {
    fetchDisposisi();
    if (canForward) fetchAvailableUsers();
  }, [id]);

  // Close instruksi dropdown on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (instruksiDropdownRef.current && !instruksiDropdownRef.current.contains(e.target)) {
        setShowInstruksiDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchDisposisi = async () => {
    try {
      const response = await api.get(`/disposisi/${id}`);
      setDisposisi(response.data.data);
    } catch (error) {
      console.error('Error fetching disposisi:', error);
      toast.error('Gagal memuat detail disposisi');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await api.get('/disposisi/available-users');
      setUsers(response.data.data || []);
      const groups = {};
      (response.data.data || []).forEach(u => { groups[u.role] = true; });
      setExpandedGroups(groups);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      await api.put(`/disposisi/${id}/baca`);
      toast.success('Disposisi ditandai sudah dibaca');
      fetchDisposisi();
    } catch {
      toast.error('Gagal menandai disposisi');
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      await api.put(`/disposisi/${id}/status`, { status });
      toast.success(`Status diubah menjadi ${status}`);
      fetchDisposisi();
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const handleOpenForwardModal = () => {
    if (user.role === 'sekretaris_dinas' && !disposisi?.surat_masuk?.file_disposisi_path) {
      toast.error('Upload kertas disposisi dulu sebelum surat diteruskan.');
      return;
    }
    setShowTeruskanModal(true);
  };

  const handleDispositionSheetUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploadingDispositionSheet) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      toast.error('Kertas disposisi harus berupa file PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10MB.');
      return;
    }

    setUploadingDispositionSheet(true);
    try {
      const formData = new FormData();
      formData.append('file_disposisi', file);
      await api.post(
        `/disposisi/surat-masuk/${disposisi.surat_masuk.id}/kertas-disposisi`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success('Kertas disposisi berhasil diupload.');
      await fetchDisposisi();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengupload kertas disposisi.');
    } finally {
      setUploadingDispositionSheet(false);
    }
  };

  const handleTeruskan = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      toast.error('Pilih minimal satu penerima');
      return;
    }
    setSubmitting(true);
    try {
      const currentLevel = disposisi.level_disposisi;
      await api.post('/disposisi', {
        surat_id: disposisi.surat_id,
        ke_user_ids: selectedUserIds,
        catatan: formTeruskan.catatan,
        instruksi: formTeruskan.instruksi.join(','),
        level_disposisi: currentLevel + 1
      });
      await api.put(`/disposisi/${id}/status`, { status: 'teruskan' });
      toast.success(`Disposisi diteruskan ke ${selectedUserIds.length} penerima`);
      setShowTeruskanModal(false);
      setSelectedUserIds([]);
      setFormTeruskan({ catatan: '', instruksi: ['laksanakan'] });
      fetchDisposisi();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal meneruskan disposisi');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUser = (userId) => {
    const uid = userId.toString();
    setSelectedUserIds(prev =>
      prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]
    );
  };

  const toggleGroup = (role) => {
    setExpandedGroups(prev => ({ ...prev, [role]: !prev[role] }));
  };

  const toggleSelectAllInGroup = (groupUsers) => {
    const ids = groupUsers.map(u => u.id.toString());
    const allSelected = ids.every(uid => selectedUserIds.includes(uid));
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(uid => !ids.includes(uid)));
    } else {
      setSelectedUserIds(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const groupedUsers = ROLE_ORDER
    .map(role => ({
      role,
      label: ROLE_LABELS[role] || role,
      users: users.filter(u => u.role === role && u.id.toString() !== user.id.toString())
    }))
    .filter(g => g.users.length > 0);

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', icon: FiInbox, label: 'Pending' },
      dibaca: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', icon: FiEye, label: 'Dibaca' },
      proses: { bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200', icon: FiActivity, label: 'Diproses' },
      selesai: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', icon: FiCheck, label: 'Selesai' },
      teruskan: { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-200', icon: FiSend, label: 'Diteruskan' },
      ditarik: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', icon: FiX, label: 'Ditarik' },
    };
    return badges[status] || { bg: 'bg-gray-50', text: 'text-gray-700', ring: 'ring-gray-200', icon: FiInbox, label: status };
  };

  const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatTanggalShort = (tanggal) => {
    if (!tanggal) return '-';
    return new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Memuat disposisi...</p>
        </div>
      </div>
    );
  }

  if (!disposisi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-sm p-8 max-w-sm border">
          <FiAlertCircle className="text-red-400 text-4xl mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Tidak Ditemukan</h3>
          <p className="text-gray-500 text-sm mb-4">Data disposisi tidak tersedia.</p>
          <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            <FiArrowLeft className="inline mr-1.5" /> Kembali
          </button>
        </div>
      </div>
    );
  }

  const isRecipient = disposisi.ke_user_id.toString() === user.id.toString();
  const statusInfo = getStatusBadge(disposisi.status);
  const StatusIcon = statusInfo.icon;
  const suratMasuk = disposisi.surat_masuk;
  const riwayat = suratMasuk?.disposisi || [];

  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001';
  const filePath = suratMasuk?.file_path ? (suratMasuk.file_path.startsWith('/') ? suratMasuk.file_path : `/${suratMasuk.file_path}`) : null;
  const dispositionFilePath = suratMasuk?.file_disposisi_path
    ? (suratMasuk.file_disposisi_path.startsWith('/') ? suratMasuk.file_disposisi_path : `/${suratMasuk.file_disposisi_path}`)
    : null;
  const documents = [
    { title: 'Surat Utama', description: 'Dokumen surat masuk resmi', path: filePath, tone: 'blue' },
    { title: 'Kertas Disposisi', description: 'Lembar pengantar dan arahan disposisi', path: dispositionFilePath, tone: 'violet' },
  ];

  const openDocument = (document) => {
    setPdfTitle(document.title);
    setPdfUrl(`${baseUrl}${document.path}`);
    setShowPdfModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-24 lg:pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center gap-3 py-2">
            <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 sm:w-auto sm:gap-2 sm:px-3">
              <FiArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Kembali</span>
            </button>
            <div className="flex-1 min-w-0">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Detail Disposisi</p>
              <h1 className="truncate text-sm font-bold leading-tight text-slate-900 sm:text-base">
                {suratMasuk?.perihal || 'Detail Disposisi'}
              </h1>
              <p className="truncate text-[11px] text-slate-500">{suratMasuk?.nomor_surat}</p>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold sm:text-xs ${statusInfo.bg} ${statusInfo.text} ring-1 ${statusInfo.ring}`}>
              <StatusIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {statusInfo.label}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
          {/* Main Content */}
          <div className="space-y-4 lg:col-span-8">
            {/* Quick Info Bar - Card style on mobile */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <div className="w-8 h-8 sm:w-7 sm:h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FiUser className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium leading-none">Dari</p>
                    <p className="text-xs font-bold text-gray-900 truncate">{disposisi.dari_user?.name}</p>
                  </div>
                </div>
                <div className="flex items-center text-gray-300 flex-shrink-0">
                  <FiChevronRight className="w-4 h-4" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <div className="w-8 h-8 sm:w-7 sm:h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FiUser className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium leading-none">Kepada</p>
                    <p className="text-xs font-bold text-gray-900 truncate">{disposisi.ke_user?.name}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2.5">
                  <FiLayers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-500" />
                  <span className="text-[10px] sm:text-xs font-bold text-indigo-700 sm:text-gray-700">L{disposisi.level_disposisi}</span>
                </div>
              </div>
            </div>

            {/* Instruksi & Catatan */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
                <h2 className="text-[13px] sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FiZap className="w-4 h-4 text-indigo-500" />
                  Instruksi Disposisi
                </h2>
              </div>
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {(Array.isArray(disposisi.instruksi) ? disposisi.instruksi : (disposisi.instruksi || '').split(',')).filter(Boolean).map((ins, i) => {
                    const badge = getInstruksiBadgeClass(ins.trim());
                    return (
                      <span key={i} className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold ${badge.bg} ${badge.text} ring-1 ring-current/10`}>
                        <FiFileText className="w-3 h-3" />
                        {getInstruksiLabel(ins.trim())}
                      </span>
                    );
                  })}
                </div>
                {disposisi.catatan && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
                    <p className="text-[11px] sm:text-xs font-bold text-amber-700 mb-1 flex items-center gap-1.5">
                      <FiMessageSquare className="w-3.5 h-3.5" /> Catatan
                    </p>
                    <p className="text-[13px] sm:text-sm text-gray-800 leading-relaxed">{disposisi.catatan}</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-4 text-[11px] sm:text-xs text-gray-500 pt-2">
                  <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" /> Dikirim: {formatTanggal(disposisi.tanggal_disposisi)}</span>
                  {disposisi.tanggal_dibaca && <span className="flex items-center gap-1"><FiEye className="w-3 h-3 text-blue-500" /> Dibaca: {formatTanggal(disposisi.tanggal_dibaca)}</span>}
                  {disposisi.tanggal_selesai && <span className="flex items-center gap-1"><FiCheck className="w-3 h-3 text-green-500" /> Selesai: {formatTanggal(disposisi.tanggal_selesai)}</span>}
                </div>
              </div>
            </div>

            {/* Informasi Surat */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
                <h2 className="text-[13px] sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FiFileText className="w-4 h-4 text-blue-500" />
                  Detail Surat Masuk
                </h2>
              </div>
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 text-sm">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Nomor Surat</p>
                    <p className="font-bold text-gray-900 text-[11px] sm:text-xs break-all">{suratMasuk?.nomor_surat || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Jenis</p>
                    <p className="font-medium text-gray-700 text-[11px] sm:text-xs capitalize">{suratMasuk?.jenis_surat || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Pengirim</p>
                    <p className="font-medium text-gray-700 text-[11px] sm:text-xs">{suratMasuk?.pengirim || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Tanggal Surat</p>
                    <p className="font-medium text-gray-700 text-[11px] sm:text-xs">{formatTanggalShort(suratMasuk?.tanggal_surat)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Perihal</p>
                  <p className="text-[13px] sm:text-sm text-gray-900 leading-relaxed">{suratMasuk?.perihal || '-'}</p>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Dokumen Terlampir</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {documents.map((document) => (
                      <div key={document.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            document.tone === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'
                          }`}>
                            <FiFileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">{document.title}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{document.description}</p>
                          </div>
                        </div>
                        {document.path ? (
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => openDocument(document)}
                              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white transition ${
                                document.tone === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-violet-600 hover:bg-violet-700'
                              }`}
                            >
                              <FiEye className="h-3.5 w-3.5" /> Preview
                            </button>
                            <a href={`${baseUrl}${document.path}`} download className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-100" title={`Download ${document.title}`}>
                              <FiDownload className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : document.title === 'Kertas Disposisi' && user.role === 'sekretaris_dinas' && isRecipient ? (
                          <label className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white transition ${
                            uploadingDispositionSheet
                              ? 'cursor-wait bg-violet-400'
                              : 'bg-violet-600 hover:bg-violet-700'
                          }`}>
                            <FiUpload className={`h-3.5 w-3.5 ${uploadingDispositionSheet ? 'animate-bounce' : ''}`} />
                            {uploadingDispositionSheet ? 'Mengupload...' : 'Upload Kertas Disposisi'}
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={handleDispositionSheetUpload}
                              disabled={uploadingDispositionSheet}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="mt-4 rounded-lg bg-white px-3 py-2 text-center text-[11px] font-medium text-slate-400">
                            Belum diupload oleh Sekretaris Dinas
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Riwayat Disposisi */}
            {riwayat.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
                  <h2 className="text-[13px] sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-orange-500" />
                    Riwayat Disposisi
                    <span className="ml-auto text-[10px] sm:text-xs font-medium text-gray-400">{riwayat.length} disposisi</span>
                  </h2>
                </div>
                <div className="p-3 sm:p-5">
                  <div className="relative">
                    <div className="absolute left-[14px] sm:left-[18px] top-5 bottom-5 w-0.5 bg-gray-200"></div>
                    <div className="space-y-0">
                      {riwayat.map((item, index) => {
                        const itemStatus = getStatusBadge(item.status);
                        const ItemIcon = itemStatus.icon;
                        const isCurrent = item.id?.toString() === id;
                        const instruksiList = (Array.isArray(item.instruksi) ? item.instruksi : (item.instruksi || '').split(',')).filter(Boolean);
                        
                        return (
                          <div key={item.id || index} className="relative flex gap-2.5 sm:gap-4 pb-3 sm:pb-5 last:pb-0">
                            <div className={`relative z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] sm:text-xs font-bold shadow-sm ${
                              item.status === 'selesai' ? 'bg-emerald-500' :
                              item.status === 'teruskan' ? 'bg-purple-500' :
                              item.status === 'proses' ? 'bg-blue-500' :
                              item.status === 'dibaca' ? 'bg-cyan-500' :
                              'bg-gray-400'
                            } ${isCurrent ? 'ring-2 ring-offset-1 sm:ring-offset-2 ring-blue-400' : ''}`}>
                              {item.level_disposisi}
                            </div>
                            
                            <div className={`flex-1 min-w-0 rounded-xl border p-3 sm:p-4 ${isCurrent ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50/50 border-gray-200'}`}>
                              <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <span className="text-[12px] sm:text-sm font-bold text-gray-900 truncate">{item.dari_user?.name || '-'}</span>
                                    <FiChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                    <span className="text-[12px] sm:text-sm font-semibold text-gray-700 truncate">{item.ke_user?.name || '-'}</span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 mt-0.5">
                                    {item.dari_user?.role?.replace(/_/g, ' ')} \u2192 {item.ke_user?.role?.replace(/_/g, ' ')}
                                  </p>
                                </div>
                                <div className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold flex-shrink-0 ${itemStatus.bg} ${itemStatus.text} ring-1 ${itemStatus.ring}`}>
                                  <ItemIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  {itemStatus.label}
                                </div>
                              </div>

                              {instruksiList.length > 0 && (
                                <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
                                  {instruksiList.map((ins, i) => {
                                    const badge = getInstruksiBadgeClass(ins.trim());
                                    return (
                                      <span key={i} className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                                        {getInstruksiLabel(ins.trim())}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {item.catatan && (
                                <div className="bg-white border border-gray-200 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 mb-1.5 sm:mb-2">
                                  <p className="text-[11px] sm:text-xs text-gray-700 leading-relaxed">
                                    <span className="font-bold text-gray-500">Catatan:</span> {item.catatan}
                                  </p>
                                </div>
                              )}

                              <p className="text-[9px] sm:text-[10px] text-gray-400 flex items-center gap-1 flex-wrap">
                                <FiCalendar className="w-2.5 h-2.5" />
                                {formatTanggal(item.tanggal_disposisi)}
                                {item.tanggal_selesai && (
                                  <span className="text-emerald-600 ml-2">\u2713 Selesai {formatTanggalShort(item.tanggal_selesai)}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions Sidebar - Desktop only */}
          <div className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FiZap className="w-4 h-4 text-emerald-500" /> Aksi
                </h3>
              </div>
              <div className="p-4">
                {isRecipient ? (
                  <div className="space-y-2.5">
                    {disposisi.status === 'pending' && (
                      <button onClick={handleMarkAsRead} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold transition shadow-sm">
                        <FiEye className="w-4 h-4" /> Tandai Dibaca
                      </button>
                    )}

                    {(disposisi.status === 'dibaca' || disposisi.status === 'proses') && (
                      <>
                        {disposisi.status === 'dibaca' && (
                          <button onClick={() => handleUpdateStatus('proses')} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-bold transition shadow-sm">
                            <FiActivity className="w-4 h-4" /> Mulai Proses
                          </button>
                        )}

                        {canForward && (
                          <button onClick={handleOpenForwardModal} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-bold transition shadow-sm">
                            <FiSend className="w-4 h-4" /> Teruskan
                          </button>
                        )}

                        <button onClick={() => handleUpdateStatus('selesai')} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-bold transition shadow-sm">
                          <FiCheck className="w-4 h-4" /> Tandai Selesai
                        </button>
                      </>
                    )}

                    {disposisi.status === 'selesai' && (
                      <div className="text-center py-6">
                        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <FiCheck className="w-7 h-7 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Disposisi telah selesai</p>
                      </div>
                    )}

                    {disposisi.status === 'teruskan' && (
                      <div className="text-center py-6">
                        <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <FiSend className="w-7 h-7 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Disposisi telah diteruskan</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FiMail className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Hanya penerima yang dapat mengubah status</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="bg-white/95 backdrop-blur-md border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {isRecipient ? (
            <div className="flex gap-2">
              {disposisi.status === 'pending' && (
                <button onClick={handleMarkAsRead} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold active:bg-blue-700 transition shadow-sm">
                  <FiEye className="w-4 h-4" /> Tandai Dibaca
                </button>
              )}

              {(disposisi.status === 'dibaca' || disposisi.status === 'proses') && (
                <>
                  {disposisi.status === 'dibaca' && (
                    <button onClick={() => handleUpdateStatus('proses')} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-indigo-600 text-white rounded-xl text-[12px] font-bold active:bg-indigo-700 transition shadow-sm">
                      <FiActivity className="w-3.5 h-3.5" /> Proses
                    </button>
                  )}
                  {canForward && (
                    <button onClick={handleOpenForwardModal} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-purple-600 text-white rounded-xl text-[12px] font-bold active:bg-purple-700 transition shadow-sm">
                      <FiSend className="w-3.5 h-3.5" /> Teruskan
                    </button>
                  )}
                  <button onClick={() => handleUpdateStatus('selesai')} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-emerald-600 text-white rounded-xl text-[12px] font-bold active:bg-emerald-700 transition shadow-sm">
                    <FiCheck className="w-3.5 h-3.5" /> Selesai
                  </button>
                </>
              )}

              {disposisi.status === 'selesai' && (
                <div className="flex-1 flex items-center justify-center gap-2 py-2 text-emerald-600">
                  <FiCheck className="w-4 h-4" />
                  <span className="text-[13px] font-bold">Disposisi Selesai</span>
                </div>
              )}

              {disposisi.status === 'teruskan' && (
                <div className="flex-1 flex items-center justify-center gap-2 py-2 text-purple-600">
                  <FiSend className="w-4 h-4" />
                  <span className="text-[13px] font-bold">Telah Diteruskan</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-1.5 text-gray-400">
              <FiMail className="w-4 h-4" />
              <span className="text-xs font-medium">Hanya penerima yang dapat mengubah status</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal Teruskan - Multi-select */}
      {showTeruskanModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[999] p-0 sm:p-4">
          <div className="bg-white w-full sm:rounded-2xl sm:max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden rounded-t-2xl">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 sm:px-5 py-3 sm:py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg"><FiSend className="w-4 h-4 sm:w-5 sm:h-5 text-white" /></div>
                  <div>
                    <h2 className="text-[15px] sm:text-base font-bold text-white">Teruskan Disposisi</h2>
                    <p className="text-[11px] sm:text-xs text-white/70">{selectedUserIds.length} penerima dipilih</p>
                  </div>
                </div>
                <button onClick={() => { setShowTeruskanModal(false); setSelectedUserIds([]); }} className="text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-lg transition">
                  <FiX size={22} />
                </button>
              </div>
            </div>

            <form onSubmit={handleTeruskan} className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Pilih Penerima <span className="text-red-500">*</span>
                  </label>
                  <div className="border rounded-xl overflow-hidden divide-y">
                    {groupedUsers.map(group => {
                      const isExpanded = expandedGroups[group.role] !== false;
                      const allSelectedInGroup = group.users.every(u => selectedUserIds.includes(u.id.toString()));
                      const selectedCount = group.users.filter(u => selectedUserIds.includes(u.id.toString())).length;

                      return (
                        <div key={group.role}>
                          <div className="flex items-center bg-gray-50 px-3 py-2.5 cursor-pointer hover:bg-gray-100 transition" onClick={() => toggleGroup(group.role)}>
                            <button type="button" className="mr-2 text-gray-400">
                              {isExpanded ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
                            </button>
                            <span className="text-xs font-bold text-gray-700 flex-1">{group.label}</span>
                            {selectedCount > 0 && (
                              <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full mr-2">{selectedCount}</span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleSelectAllInGroup(group.users); }}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition ${
                                allSelectedInGroup ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {allSelectedInGroup ? 'Hapus Semua' : 'Pilih Semua'}
                            </button>
                          </div>
                          
                          {isExpanded && (
                            <div className="divide-y divide-gray-100">
                              {group.users.map(u => {
                                const isSelected = selectedUserIds.includes(u.id.toString());
                                return (
                                  <label
                                    key={u.id}
                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition hover:bg-gray-50 ${isSelected ? 'bg-purple-50' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleUser(u.id)}
                                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                                      <p className="text-[11px] text-gray-500 truncate">
                                        {u.role === 'ketua_tim' && (u.pegawai?.sub_bidang || u.pegawai?.bidangs?.nama)
                                          ? `Ketua Tim ${u.pegawai.sub_bidang || u.pegawai.bidangs.nama}`
                                          : u.role === 'kepala_bidang' && u.pegawai?.bidangs?.nama
                                            ? u.pegawai.bidangs.nama
                                            : u.role?.replace(/_/g, ' ')
                                        }
                                      </p>
                                    </div>
                                    {isSelected && <FiCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {groupedUsers.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">Tidak ada penerima tersedia</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Instruksi {formTeruskan.instruksi.length > 0 && <span className="text-purple-600">({formTeruskan.instruksi.length} dipilih)</span>}
                  </label>
                  <div className="relative" ref={instruksiDropdownRef}>
                    <button
                      type="button"
                      onClick={() => { setShowInstruksiDropdown(!showInstruksiDropdown); setInstruksiSearch(''); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:bg-gray-50 transition"
                    >
                      <span className="flex items-center gap-1.5 flex-wrap">
                        {formTeruskan.instruksi.length === 0 ? (
                          <span className="text-gray-400 text-xs">Pilih instruksi...</span>
                        ) : (
                          formTeruskan.instruksi.map(ins => {
                            const badge = getInstruksiBadgeClass(ins);
                            return (
                              <span key={ins} className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                                {getInstruksiLabel(ins)}
                              </span>
                            );
                          })
                        )}
                      </span>
                      <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showInstruksiDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showInstruksiDropdown && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                          <input
                            type="text"
                            placeholder="Cari instruksi..."
                            value={instruksiSearch}
                            onChange={(e) => setInstruksiSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none"
                            autoFocus
                          />
                        </div>
                        <div className="overflow-y-auto max-h-48 p-1">
                          {INSTRUKSI_OPTIONS
                            .filter(opt => opt.label.toLowerCase().includes(instruksiSearch.toLowerCase()))
                            .map(opt => {
                              const badge = getInstruksiBadgeClass(opt.value);
                              const isActive = formTeruskan.instruksi.includes(opt.value);
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setFormTeruskan(prev => ({
                                      ...prev,
                                      instruksi: isActive
                                        ? prev.instruksi.filter(v => v !== opt.value)
                                        : [...prev.instruksi, opt.value]
                                    }));
                                  }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition ${isActive ? 'bg-purple-50 ring-1 ring-purple-200' : 'hover:bg-gray-50'}`}
                                >
                                  <input type="checkbox" checked={isActive} readOnly className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 pointer-events-none" />
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${badge.bg} ${badge.text}`}>
                                    {opt.label}
                                  </span>
                                  {isActive && <FiCheck className="w-4 h-4 text-purple-600 ml-auto flex-shrink-0" />}
                                </button>
                              );
                            })
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Catatan</label>
                  <textarea
                    value={formTeruskan.catatan}
                    onChange={(e) => setFormTeruskan({ ...formTeruskan, catatan: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    placeholder="Tambahkan catatan..."
                  />
                </div>
              </div>

              <div className="flex gap-2 sm:gap-2.5 px-4 sm:px-5 py-3 sm:py-4 border-t bg-gray-50 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button type="button" onClick={() => { setShowTeruskanModal(false); setSelectedUserIds([]); }} className="flex-1 px-4 py-3 sm:py-2.5 border-2 text-gray-700 rounded-xl text-[13px] sm:text-sm font-bold hover:bg-gray-100 active:bg-gray-200 transition" disabled={submitting}>
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedUserIds.length === 0}
                  className="flex-1 px-4 py-3 sm:py-2.5 bg-purple-600 text-white rounded-xl text-[13px] sm:text-sm font-bold hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Mengirim...</>
                  ) : (
                    <><FiSend className="w-4 h-4" /> Kirim ke {selectedUserIds.length} Penerima</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999] p-0 sm:p-4">
          <div className="bg-white w-full h-full sm:rounded-2xl sm:max-w-5xl sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 border-b flex-shrink-0">
              <h3 className="text-[13px] sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                <FiFileText className="w-4 h-4 text-blue-500" /> {pdfTitle}
              </h3>
              <button onClick={() => { setShowPdfModal(false); setPdfUrl(''); }} className="text-gray-400 hover:text-gray-600 p-2 sm:p-1.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition -mr-1">
                <FiX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-100">
              {pdfUrl ? (
                <iframe src={`${pdfUrl}#toolbar=0&navpanes=0`} className="w-full h-full" title="PDF" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
