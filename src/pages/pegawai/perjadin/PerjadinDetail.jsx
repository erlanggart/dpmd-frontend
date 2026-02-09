import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Calendar, MapPin, FileText, Users, Building2, Clock, CheckCircle } from 'lucide-react';
import perjadinService from '../../../services/perjadinService';
import PerjadinFormModal from '../../../components/perjadin/PerjadinFormModal';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

function PerjadinDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kegiatan, setKegiatan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchKegiatanDetail();
    }
  }, [id]);

  const fetchKegiatanDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await perjadinService.getKegiatanById(id);

      if (response.data.success) {
        setKegiatan(response.data.data);
      } else {
        throw new Error(response.data.message || 'Kegiatan tidak ditemukan');
      }
    } catch (err) {
      console.error('Error fetching kegiatan detail:', err);
      setError(err.response?.data?.message || err.message || 'Gagal memuat detail kegiatan');
      toast.error('Gagal memuat detail kegiatan');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Hapus Kegiatan?',
      html: `Yakin ingin menghapus kegiatan <strong>${kegiatan.nama_kegiatan}</strong>?<br><small>Data yang dihapus tidak dapat dikembalikan.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#gray',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const response = await perjadinService.deleteKegiatan(id);
        if (response.data.success) {
          toast.success('Kegiatan berhasil dihapus');
          navigate('/pegawai/perjadin');
        }
      } catch (error) {
        console.error('Error deleting kegiatan:', error);
        toast.error(error.response?.data?.message || 'Gagal menghapus kegiatan');
      }
    }
  };

  const handleEditSuccess = () => {
    fetchKegiatanDetail();
    setShowEditModal(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat detail kegiatan...</p>
        </div>
      </div>
    );
  }

  if (error || !kegiatan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-red-500" />
          </div>
          <p className="text-gray-700 font-medium mb-2">{error || 'Kegiatan tidak ditemukan'}</p>
          <Link
            to="/pegawai/perjadin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2C3E50] text-white rounded-lg hover:bg-[#34495e] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Dark Navy Theme */}
      <div className="bg-[#2C3E50]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/pegawai/perjadin"
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">{kegiatan.nama_kegiatan}</h1>
                <p className="text-gray-300 text-sm font-mono">{kegiatan.nomor_sp}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Aktif
              </span>
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Bidang</p>
                <p className="text-2xl font-bold text-gray-800">
                  {kegiatan.bidang?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Pegawai</p>
                <p className="text-2xl font-bold text-gray-800">
                  {kegiatan.bidang?.reduce((sum, b) => sum + (b.pegawai?.length || 0), 0) || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Durasi</p>
                <p className="text-2xl font-bold text-gray-800">
                  {Math.ceil((new Date(kegiatan.tanggal_selesai) - new Date(kegiatan.tanggal_mulai)) / (1000 * 60 * 60 * 24)) + 1} hari
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-amber-500">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <MapPin className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Lokasi</p>
                <p className="text-lg font-bold text-gray-800 truncate">
                  {kegiatan.lokasi}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2C3E50]" />
                Informasi Kegiatan
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Nama Kegiatan</label>
                  <p className="text-gray-800 font-medium">{kegiatan.nama_kegiatan}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Nomor SP</label>
                  <p className="text-gray-800 font-mono">{kegiatan.nomor_sp}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tempat Kegiatan</label>
                  <div className="flex items-center gap-2 text-gray-800">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{kegiatan.lokasi}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tanggal Pelaksanaan</label>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-800">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDateShort(kegiatan.tanggal_mulai)}</span>
                    </div>
                    <div className="text-xs text-gray-500 ml-6 my-1">sampai dengan</div>
                    <div className="flex items-center gap-2 text-sm text-gray-800">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDateShort(kegiatan.tanggal_selesai)}</span>
                    </div>
                  </div>
                </div>

                {kegiatan.keterangan && kegiatan.keterangan !== '-' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Keterangan</label>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{kegiatan.keterangan}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bidang Terkait */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#2C3E50]" />
                Bidang & Pegawai Terlibat
                <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  {kegiatan.bidang?.length || 0} bidang
                </span>
              </h2>

              {kegiatan.bidang && kegiatan.bidang.length > 0 ? (
                <div className="space-y-4">
                  {kegiatan.bidang.map((b, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-[#2C3E50] px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-1.5 rounded">
                            <Building2 className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{b.nama_bidang}</h3>
                            <p className="text-xs text-gray-300">
                              {b.pegawai?.length || 0} pegawai terlibat
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
                          {b.status || 'aktif'}
                        </span>
                      </div>

                      {/* Pegawai List */}
                      {b.pegawai && b.pegawai.length > 0 && (
                        <div className="p-4 bg-gray-50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {b.pegawai.map((p, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg"
                              >
                                <div className="bg-[#2C3E50] text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {p.nama?.charAt(0).toUpperCase() || 'P'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{p.nama}</p>
                                  <p className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    {p.status || 'aktif'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-medium">Tidak ada bidang terkait</p>
                  <p className="text-sm text-gray-400 mt-1">Belum ada bidang dan pegawai yang ditambahkan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <PerjadinFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
        editData={kegiatan}
      />
    </div>
  );
}

export default PerjadinDetail;
