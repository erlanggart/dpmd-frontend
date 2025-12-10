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
  FiAlertCircle
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
      // Use new endpoint that filters users based on workflow hierarchy
      const response = await api.get('/disposisi/available-users');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching available users:', error);
      toast.error('Gagal memuat daftar user');
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

      // Update status disposisi saat ini menjadi 'teruskan'
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
      pending: 'bg-yellow-100 text-yellow-800',
      dibaca: 'bg-blue-100 text-blue-800',
      proses: 'bg-indigo-100 text-indigo-800',
      selesai: 'bg-green-100 text-green-800',
      teruskan: 'bg-purple-100 text-purple-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat detail disposisi...</p>
        </div>
      </div>
    );
  }

  if (!disposisi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="mx-auto text-red-500 text-5xl mb-4" />
          <p className="text-gray-600">Disposisi tidak ditemukan</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const isRecipient = disposisi.ke_user_id.toString() === user.id.toString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-3 sm:mb-4 transition-colors"
          >
            <FiArrowLeft size={18} className="sm:w-5 sm:h-5" />
            <span className="font-medium text-sm sm:text-base">Kembali</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl">
              <FiFileText size={24} className="sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold mb-1">Detail Disposisi</h1>
              <p className="text-white/80 text-xs sm:text-base">Informasi lengkap surat dan disposisi</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-6">
            {/* Info Surat */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-4 sm:px-6 py-3 sm:py-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <FiFileText className="text-lg sm:text-xl" />
                  Informasi Surat
                </h2>
              </div>
              <div className="p-3 sm:p-6">
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Nomor Surat</label>
                  <p className="text-sm sm:text-base text-gray-900 font-medium">{disposisi.surat?.nomor_surat}</p>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Perihal</label>
                  <p className="text-sm sm:text-base text-gray-900">{disposisi.surat?.perihal}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Pengirim</label>
                    <p className="text-sm sm:text-base text-gray-900">{disposisi.surat?.pengirim}</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Jenis Surat</label>
                    <p className="text-sm sm:text-base text-gray-900 capitalize">{disposisi.surat?.jenis_surat}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Tanggal Surat</label>
                    <p className="text-sm sm:text-base text-gray-900">{formatTanggal(disposisi.surat?.tanggal_surat)}</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Tanggal Terima</label>
                    <p className="text-sm sm:text-base text-gray-900">{formatTanggal(disposisi.surat?.tanggal_terima)}</p>
                  </div>
                </div>

                {disposisi.surat?.file_path && (
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500 block mb-2">File Lampiran</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001';
                          const filePath = disposisi.surat.file_path.startsWith('/') ? disposisi.surat.file_path : `/${disposisi.surat.file_path}`;
                          const url = `${baseUrl}${filePath}`;
                          console.log('PDF URL:', url);
                          setPdfUrl(url);
                          setShowPdfModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 text-sm font-medium shadow-lg hover:shadow-xl transition-all"
                      >
                        <FiEye className="text-base sm:text-lg" />
                        Lihat PDF
                      </button>
                      <a
                        href={`${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001'}${disposisi.surat.file_path.startsWith('/') ? disposisi.surat.file_path : '/' + disposisi.surat.file_path}`}
                        target="_blank"
                        download
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 text-sm font-medium shadow-lg hover:shadow-xl transition-all"
                      >
                        <FiDownload className="text-base sm:text-lg" />
                        Download File
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Disposisi */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 sm:px-6 py-3 sm:py-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <FiMail className="text-lg sm:text-xl" />
                  Informasi Disposisi
                </h2>
              </div>
              <div className="p-6">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(disposisi.status)}`}>
                    {disposisi.status}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 capitalize">
                    {disposisi.instruksi.replace('_', ' ')}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                    Level {disposisi.level_disposisi}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <FiUser className="text-blue-600" />
                      Dari
                    </label>
                    <p className="text-gray-900 font-medium">{disposisi.dari_user?.name}</p>
                    <p className="text-sm text-gray-500">{disposisi.dari_user?.role}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <FiUser className="text-green-600" />
                      Kepada
                    </label>
                    <p className="text-gray-900 font-medium">{disposisi.ke_user?.name}</p>
                    <p className="text-sm text-gray-500">{disposisi.ke_user?.role}</p>
                  </div>
                </div>

                {disposisi.catatan && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-2">Catatan</label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-900">{disposisi.catatan}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <FiCalendar className="text-gray-400" />
                      Dikirim
                    </label>
                    <p className="text-sm text-gray-900">{formatTanggal(disposisi.tanggal_disposisi)}</p>
                  </div>
                  {disposisi.tanggal_dibaca && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <FiClock className="text-blue-400" />
                        Dibaca
                      </label>
                      <p className="text-sm text-gray-900">{formatTanggal(disposisi.tanggal_dibaca)}</p>
                    </div>
                  )}
                  {disposisi.tanggal_selesai && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <FiCheck className="text-green-400" />
                        Selesai
                      </label>
                      <p className="text-sm text-gray-900">{formatTanggal(disposisi.tanggal_selesai)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* History Disposisi */}
            {disposisi.surat?.disposisi && disposisi.surat.disposisi.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiClock />
                    Riwayat Disposisi
                  </h2>
                </div>
                <div className="p-6">
                
                <div className="space-y-4">
                  {disposisi.surat.disposisi.map((item, index) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.status === 'selesai' ? 'bg-green-100 text-green-600' :
                          item.status === 'proses' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <span className="text-sm font-bold">{item.level_disposisi}</span>
                        </div>
                        {index < disposisi.surat.disposisi.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 my-1"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{item.dari_user?.name}</p>
                            <p className="text-sm text-gray-500">{item.dari_user?.role}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Kepada:</span> {item.ke_user?.name} ({item.ke_user?.role})
                        </p>
                        {item.catatan && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                            {item.catatan}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">{formatTanggal(item.tanggal_disposisi)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden lg:sticky lg:top-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 sm:px-6 py-3 sm:py-4">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <FiCheck className="text-base sm:text-lg" />
                  Panel Aksi
                </h3>
              </div>
              <div className="p-3 sm:p-6">
              
              {isRecipient && (
                <div className="space-y-2 sm:space-y-3">
                  {disposisi.status === 'pending' && (
                    <button
                      onClick={handleMarkAsRead}
                      className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-cyan-600 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      <FiMail className="text-base sm:text-lg" />
                      Tandai Dibaca
                    </button>
                  )}

                  {(disposisi.status === 'dibaca' || disposisi.status === 'proses') && (
                    <>
                      {disposisi.status === 'dibaca' && (
                        <button
                          onClick={() => handleUpdateStatus('proses')}
                          className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg sm:rounded-xl hover:from-indigo-600 hover:to-purple-600 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                        >
                          <FiClock className="text-base sm:text-lg" />
                          Tandai Diproses
                        </button>
                      )}

                      {/* Tombol Teruskan hanya untuk Kepala Dinas, Sekretaris Dinas, dan Kepala Bidang */}
                      {(user.role === 'kepala_dinas' || 
                        user.role === 'sekretaris_dinas' || 
                        user.role?.startsWith('kabid_')) && (
                        <button
                          onClick={() => setShowTeruskanModal(true)}
                          className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                        >
                          <FiSend className="text-base sm:text-lg" />
                          Teruskan
                        </button>
                      )}

                      <button
                        onClick={() => handleUpdateStatus('selesai')}
                        className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-emerald-600 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                      >
                        <FiCheck className="text-base sm:text-lg" />
                        Tandai Selesai
                      </button>
                    </>
                  )}
                </div>
              )}

              {!isRecipient && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Anda tidak memiliki akses untuk mengubah disposisi ini
                </p>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Modal Teruskan */}
      {showTeruskanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <FiSend className="text-2xl" />
                  Teruskan Disposisi
                </h2>
                <button
                  onClick={() => setShowTeruskanModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleTeruskan} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teruskan Kepada <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTeruskan.ke_user_id}
                  onChange={(e) => setFormTeruskan({ ...formTeruskan, ke_user_id: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                >
                  <option value="">-- Pilih Penerima --</option>
                  {users.filter(u => u.id.toString() !== user.id.toString()).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instruksi
                </label>
                <select
                  value={formTeruskan.instruksi}
                  onChange={(e) => setFormTeruskan({ ...formTeruskan, instruksi: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={formTeruskan.catatan}
                  onChange={(e) => setFormTeruskan({ ...formTeruskan, catatan: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                  placeholder="Tambahkan catatan untuk disposisi ini..."
                />
              </div>

              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setShowTeruskanModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:bg-gray-400 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <FiSend />
                  {submitting ? 'Mengirim...' : 'Kirim Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal PDF Viewer */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full h-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Preview Surat</h3>
              <button
                onClick={() => {
                  setShowPdfModal(false);
                  setPdfUrl('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-100">
              {pdfUrl ? (
                <object
                  data={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  type="application/pdf"
                  className="w-full h-full"
                >
                  <embed
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                    type="application/pdf"
                    className="w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <p className="text-gray-600 mb-4">Browser tidak support preview PDF inline.</p>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Buka PDF di Tab Baru
                    </a>
                  </div>
                </object>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Loading PDF...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
