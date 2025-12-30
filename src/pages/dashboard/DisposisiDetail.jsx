import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiMail, 
  FiUser, 
  FiCalendar, 
  FiClock, 
  FiFileText,
  FiSend,
  FiEye,
  FiX,
  FiCheck,
  FiDownload,
  FiAlertCircle,
  FiActivity,
  FiLayers,
  FiInbox,
  FiZap,
  FiMessageSquare
} from 'react-icons/fi';
import api from '../../api';
import { toast } from 'react-hot-toast';

export default function DisposisiDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [disposisi, setDisposisi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTeruskanModal, setShowTeruskanModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [users, setUsers] = useState([]);
  const [formTeruskan, setFormTeruskan] = useState({
    ke_user_id: '',
    catatan: '',
    instruksi: 'biasa'
  });
  const [submitting, setSubmitting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDisposisi();
    fetchAvailableUsers();
  }, [id]);

  const fetchDisposisi = async () => {
    try {
      const response = await api.get(`/disposisi/${id}`);
      console.log('📋 Disposisi Response:', response.data.data);
      console.log('📧 Surat Masuk:', response.data.data?.surat_masuk);
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
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      await api.put(`/disposisi/${id}/baca`);
      toast.success('Disposisi ditandai sudah dibaca');
      fetchDisposisi();
    } catch (error) {
      toast.error('Gagal menandai disposisi');
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      await api.put(`/disposisi/${id}/status`, { status });
      toast.success(`Status diubah menjadi ${status}`);
      fetchDisposisi();
    } catch (error) {
      toast.error('Gagal mengubah status');
    }
  };

  const handleTeruskan = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const currentLevel = disposisi.level_disposisi;
      await api.post('/disposisi', {
        surat_id: disposisi.surat_id,
        ke_user_id: formTeruskan.ke_user_id,
        catatan: formTeruskan.catatan,
        instruksi: formTeruskan.instruksi,
        level_disposisi: currentLevel + 1
      });

      await api.put(`/disposisi/${id}/status`, { status: 'teruskan' });

      toast.success('Disposisi berhasil diteruskan');
      setShowTeruskanModal(false);
      fetchDisposisi();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Gagal meneruskan disposisi';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: FiInbox, label: 'Pending' },
      dibaca: { bg: 'bg-blue-100', text: 'text-blue-700', icon: FiEye, label: 'Dibaca' },
      proses: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: FiActivity, label: 'Diproses' },
      selesai: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: FiCheck, label: 'Selesai' },
      teruskan: { bg: 'bg-purple-100', text: 'text-purple-700', icon: FiSend, label: 'Diteruskan' }
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: FiInbox, label: status };
  };

  const getInstruksiBadge = (instruksi) => {
    const badges = {
      segera: { bg: 'bg-red-100', text: 'text-red-700', icon: FiZap },
      penting: { bg: 'bg-orange-100', text: 'text-orange-700', icon: FiAlertCircle },
      biasa: { bg: 'bg-gray-100', text: 'text-gray-700', icon: FiMail },
      koordinasi: { bg: 'bg-blue-100', text: 'text-blue-700', icon: FiLayers },
      teliti_lapor: { bg: 'bg-purple-100', text: 'text-purple-700', icon: FiFileText },
      edarkan: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: FiSend },
      simpan: { bg: 'bg-teal-100', text: 'text-teal-700', icon: FiInbox }
    };
    return badges[instruksi] || badges.biasa;
  };

  const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Memuat detail disposisi...</p>
        </div>
      </div>
    );
  }

  if (!disposisi) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="text-red-500 text-4xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Disposisi Tidak Ditemukan</h3>
          <p className="text-gray-600 mb-6">Data disposisi yang Anda cari tidak tersedia.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <FiArrowLeft className="inline mr-2" />
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const isRecipient = disposisi.ke_user_id.toString() === user.id.toString();
  const statusInfo = getStatusBadge(disposisi.status);
  const instruksiInfo = getInstruksiBadge(disposisi.instruksi);
  const StatusIcon = statusInfo.icon;
  const InstruksiIcon = instruksiInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium hidden sm:inline">Kembali</span>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Detail Disposisi</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className={`${statusInfo.bg} rounded-xl p-4 border-2 border-transparent hover:border-current transition-all transform hover:scale-105`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 ${statusInfo.text} bg-white rounded-lg`}>
                <StatusIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Status</p>
                <p className={`text-sm font-bold ${statusInfo.text}`}>{statusInfo.label}</p>
              </div>
            </div>
          </div>

          <div className={`${instruksiInfo.bg} rounded-xl p-4 border-2 border-transparent hover:border-current transition-all transform hover:scale-105`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 ${instruksiInfo.text} bg-white rounded-lg`}>
                <InstruksiIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Instruksi</p>
                <p className={`text-sm font-bold ${instruksiInfo.text} capitalize`}>
                  {disposisi.instruksi.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-4 border-2 border-transparent hover:border-blue-300 transition-all transform hover:scale-105">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white text-blue-600 rounded-lg">
                <FiLayers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Level</p>
                <p className="text-sm font-bold text-blue-700">Level {disposisi.level_disposisi}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informasi Surat Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                    <FiFileText className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Informasi Surat</h2>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nomor Surat</label>
                    <p className="text-base font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {disposisi.surat_masuk?.nomor_surat}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Jenis</label>
                    <p className="text-base font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg capitalize">
                      {disposisi.surat_masuk?.jenis_surat}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Perihal</label>
                  <p className="text-base text-gray-900 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                    {disposisi.surat_masuk?.perihal}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pengirim</label>
                    <p className="text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {disposisi.surat_masuk?.pengirim}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tanggal Surat</label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg flex items-center gap-2">
                      <FiCalendar className="text-gray-400" />
                      {formatTanggal(disposisi.surat_masuk?.tanggal_surat)}
                    </p>
                  </div>
                </div>

                {disposisi.surat_masuk?.file_path && (
                  <div className="pt-4 border-t border-gray-200">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
                      File Lampiran
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001';
                          const filePath = disposisi.surat_masuk.file_path.startsWith('/') ? disposisi.surat_masuk.file_path : `/${disposisi.surat_masuk.file_path}`;
                          setPdfUrl(`${baseUrl}${filePath}`);
                          setShowPdfModal(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 font-medium shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                      >
                        <FiEye className="w-4 h-4" />
                        Lihat PDF
                      </button>
                      <a
                        href={`${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001'}${disposisi.surat_masuk.file_path.startsWith('/') ? disposisi.surat_masuk.file_path : '/' + disposisi.surat_masuk.file_path}`}
                        download
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 font-medium shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                      >
                        <FiDownload className="w-4 h-4" />
                        Download
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Informasi Disposisi Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                    <FiMail className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Informasi Disposisi</h2>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-600 text-white rounded-lg">
                        <FiUser className="w-5 h-5" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                          Dari
                        </label>
                        <p className="font-bold text-gray-900">{disposisi.dari_user?.name}</p>
                        <p className="text-sm text-gray-600 mt-1 capitalize">{disposisi.dari_user?.role?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-600 text-white rounded-lg">
                        <FiUser className="w-5 h-5" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                          Kepada
                        </label>
                        <p className="font-bold text-gray-900">{disposisi.ke_user?.name}</p>
                        <p className="text-sm text-gray-600 mt-1 capitalize">{disposisi.ke_user?.role?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {disposisi.catatan && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                      <FiMessageSquare className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide block mb-2">
                          Catatan
                        </label>
                        <p className="text-gray-900">{disposisi.catatan}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-gray-200">
                  <div className="flex items-start gap-2">
                    <FiCalendar className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block">Dikirim</label>
                      <p className="text-sm text-gray-900 font-medium">{formatTanggal(disposisi.tanggal_disposisi)}</p>
                    </div>
                  </div>
                  {disposisi.tanggal_dibaca && (
                    <div className="flex items-start gap-2">
                      <FiEye className="w-4 h-4 text-blue-500 mt-1" />
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block">Dibaca</label>
                        <p className="text-sm text-gray-900 font-medium">{formatTanggal(disposisi.tanggal_dibaca)}</p>
                      </div>
                    </div>
                  )}
                  {disposisi.tanggal_selesai && (
                    <div className="flex items-start gap-2">
                      <FiCheck className="w-4 h-4 text-green-500 mt-1" />
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block">Selesai</label>
                        <p className="text-sm text-gray-900 font-medium">{formatTanggal(disposisi.tanggal_selesai)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Riwayat Disposisi */}
            {disposisi.surat_masuk?.disposisi && disposisi.surat_masuk.disposisi.length > 1 && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                      <FiClock className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Riwayat Disposisi</h2>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    {disposisi.surat_masuk.disposisi.map((item, index) => {
                      const itemStatusInfo = getStatusBadge(item.status);
                      const ItemStatusIcon = itemStatusInfo.icon;
                      
                      return (
                        <div key={item.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md ${
                              item.status === 'selesai' ? 'bg-gradient-to-br from-emerald-500 to-green-500' :
                              item.status === 'proses' ? 'bg-gradient-to-br from-blue-500 to-indigo-500' :
                              'bg-gradient-to-br from-gray-400 to-gray-500'
                            }`}>
                              {item.level_disposisi}
                            </div>
                            {index < disposisi.surat_masuk.disposisi.length - 1 && (
                              <div className="w-0.5 h-full bg-gradient-to-b from-gray-300 to-transparent my-2"></div>
                            )}
                          </div>
                          
                          <div className="flex-1 pb-6">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-bold text-gray-900 mb-1">{item.dari_user?.name}</p>
                                  <p className="text-sm text-gray-600 capitalize">{item.dari_user?.role?.replace(/_/g, ' ')}</p>
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${itemStatusInfo.bg} ${itemStatusInfo.text}`}>
                                  <ItemStatusIcon className="w-3.5 h-3.5" />
                                  <span className="text-xs font-bold">{itemStatusInfo.label}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                                <FiArrowLeft className="rotate-180 text-gray-400" />
                                <span className="font-medium">{item.ke_user?.name}</span>
                                <span className="text-gray-500 text-xs">({item.ke_user?.role?.replace(/_/g, ' ')})</span>
                              </div>

                              {item.catatan && (
                                <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200 mb-2">
                                  {item.catatan}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                                <FiCalendar className="w-3 h-3" />
                                {formatTanggal(item.tanggal_disposisi)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden sticky top-24 hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                    <FiZap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Panel Aksi</h3>
                </div>
              </div>

              <div className="p-6">
                {isRecipient ? (
                  <div className="space-y-3">
                    {disposisi.status === 'pending' && (
                      <button
                        onClick={handleMarkAsRead}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 font-medium shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                      >
                        <FiMail className="w-5 h-5" />
                        Tandai Dibaca
                      </button>
                    )}

                    {(disposisi.status === 'dibaca' || disposisi.status === 'proses') && (
                      <>
                        {disposisi.status === 'dibaca' && (
                          <button
                            onClick={() => handleUpdateStatus('proses')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                          >
                            <FiActivity className="w-5 h-5" />
                            Mulai Proses
                          </button>
                        )}

                        {(user.role === 'kepala_dinas' || 
                          user.role === 'sekretaris_dinas' || 
                          user.role === 'kepala_bidang' ||
                          user.role === 'ketua_tim') && (
                          <button
                            onClick={() => setShowTeruskanModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-medium shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                          >
                            <FiSend className="w-5 h-5" />
                            Teruskan
                          </button>
                        )}

                        <button
                          onClick={() => handleUpdateStatus('selesai')}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 font-medium shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                        >
                          <FiCheck className="w-5 h-5" />
                          Tandai Selesai
                        </button>
                      </>
                    )}

                    {disposisi.status === 'selesai' && (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FiCheck className="w-8 h-8 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Disposisi Selesai</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FiAlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">Anda tidak memiliki akses untuk mengubah disposisi ini</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Teruskan - Redesigned */}
      {showTeruskanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                    <FiSend className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Teruskan Disposisi</h2>
                </div>
                <button
                  onClick={() => setShowTeruskanModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleTeruskan} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Teruskan Kepada <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTeruskan.ke_user_id}
                  onChange={(e) => setFormTeruskan({ ...formTeruskan, ke_user_id: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-gray-900 font-medium"
                >
                  <option value="">-- Pilih Penerima --</option>
                  {users.filter(u => u.id.toString() !== user.id.toString()).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} - {u.role?.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Instruksi
                </label>
                <select
                  value={formTeruskan.instruksi}
                  onChange={(e) => setFormTeruskan({ ...formTeruskan, instruksi: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-gray-900 font-medium"
                >
                  <option value="biasa">Biasa</option>
                  <option value="penting">Penting</option>
                  <option value="segera">Segera</option>
                  <option value="koordinasi">Koordinasi</option>
                  <option value="teliti_lapor">Teliti & Laporkan</option>
                  <option value="edarkan">Edarkan</option>
                  <option value="simpan">Simpan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={formTeruskan.catatan}
                  onChange={(e) => setFormTeruskan({ ...formTeruskan, catatan: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none text-gray-900"
                  placeholder="Tambahkan catatan untuk disposisi ini..."
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowTeruskanModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <FiSend />
                      Kirim
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal PDF Viewer - Enhanced */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <FiFileText className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Preview Surat</h3>
              </div>
              <button
                onClick={() => {
                  setShowPdfModal(false);
                  setPdfUrl('');
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-100">
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading PDF...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
