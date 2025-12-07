import { useState, useEffect } from 'react';
import { FiMail, FiSend, FiClock, FiCheck, FiEye, FiPlus, FiUpload, FiX } from 'react-icons/fi';
import api from '../../api';
import { toast } from 'react-hot-toast';

export default function DisposisiSurat() {
  const [activeTab, setActiveTab] = useState('masuk');
  const [disposisiMasuk, setDisposisiMasuk] = useState([]);
  const [disposisiKeluar, setDisposisiKeluar] = useState([]);
  const [statistik, setStatistik] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInputModal, setShowInputModal] = useState(false);
  const [formData, setFormData] = useState({
    nomor_surat: '',
    tanggal_surat: '',
    tanggal_terima: '',
    pengirim: '',
    perihal: '',
    jenis_surat: 'biasa',
    keterangan: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSecretariat = user.role === 'sekretariat' || user.role === 'superadmin';

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, disposisiRes] = await Promise.all([
        api.get('/disposisi/statistik'),
        api.get(`/disposisi/${activeTab}`)
      ]);

      setStatistik(statsRes.data.data);
      
      if (activeTab === 'masuk') {
        setDisposisiMasuk(disposisiRes.data.data);
      } else {
        setDisposisiKeluar(disposisiRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching disposisi:', error);
      toast.error('Gagal memuat data disposisi');
    } finally {
      setLoading(false);
    }
  };

  const handleBacaDisposisi = async (id) => {
    try {
      await api.put(`/disposisi/${id}/baca`);
      toast.success('Disposisi ditandai sudah dibaca');
      fetchData();
    } catch (error) {
      toast.error('Gagal menandai disposisi');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Hanya file PDF, JPG, atau PNG yang diperbolehkan');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmitSurat = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Step 1: Create surat masuk
      const suratResponse = await api.post('/surat-masuk', formData);
      const suratId = suratResponse.data.data.id;

      // Step 2: Upload file if exists
      if (selectedFile) {
        const fileFormData = new FormData();
        fileFormData.append('file', selectedFile);

        await api.post(`/surat-masuk/${suratId}/upload`, fileFormData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      toast.success('Surat masuk berhasil ditambahkan');
      setShowInputModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error submitting surat:', error);
      toast.error(error.response?.data?.message || 'Gagal menambahkan surat masuk');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nomor_surat: '',
      tanggal_surat: '',
      tanggal_terima: '',
      pengirim: '',
      perihal: '',
      jenis_surat: 'biasa',
      keterangan: ''
    });
    setSelectedFile(null);
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

  const getInstruksiBadge = (instruksi) => {
    const badges = {
      segera: 'bg-red-100 text-red-800',
      penting: 'bg-orange-100 text-orange-800',
      biasa: 'bg-gray-100 text-gray-800',
      koordinasi: 'bg-blue-100 text-blue-800',
      teliti_lapor: 'bg-indigo-100 text-indigo-800',
      edarkan: 'bg-purple-100 text-purple-800',
      simpan: 'bg-green-100 text-green-800'
    };
    return badges[instruksi] || 'bg-gray-100 text-gray-800';
  };

  const formatTanggal = (tanggal) => {
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Disposisi Surat</h1>
            <p className="text-gray-600 mt-2">Kelola disposisi surat masuk dan keluar</p>
          </div>
          
          {/* Button Input Surat Masuk - Only for Sekretariat */}
          {isSecretariat && (
            <button
              onClick={() => setShowInputModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <FiPlus className="text-xl" />
              Input Surat Masuk
            </button>
          )}
        </div>

        {/* Statistik Cards */}
        {statistik && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{statistik.masuk.pending}</p>
                </div>
                <FiClock className="text-yellow-500 text-3xl" />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Dibaca</p>
                  <p className="text-2xl font-bold text-blue-900">{statistik.masuk.dibaca}</p>
                </div>
                <FiEye className="text-blue-500 text-3xl" />
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 font-medium">Proses</p>
                  <p className="text-2xl font-bold text-indigo-900">{statistik.masuk.proses}</p>
                </div>
                <FiSend className="text-indigo-500 text-3xl" />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Selesai</p>
                  <p className="text-2xl font-bold text-green-900">{statistik.masuk.selesai}</p>
                </div>
                <FiCheck className="text-green-500 text-3xl" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('masuk')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'masuk'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiMail />
                  Disposisi Masuk
                  {statistik && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {statistik.masuk.total}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setActiveTab('keluar')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'keluar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiSend />
                  Disposisi Keluar
                  {statistik && (
                    <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {statistik.keluar.total}
                    </span>
                  )}
                </div>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Memuat data...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTab === 'masuk' && disposisiMasuk.length === 0 && (
                  <div className="text-center py-12">
                    <FiMail className="mx-auto text-gray-400 text-5xl mb-4" />
                    <p className="text-gray-500">Tidak ada disposisi masuk</p>
                  </div>
                )}

                {activeTab === 'keluar' && disposisiKeluar.length === 0 && (
                  <div className="text-center py-12">
                    <FiSend className="mx-auto text-gray-400 text-5xl mb-4" />
                    <p className="text-gray-500">Tidak ada disposisi keluar</p>
                  </div>
                )}

                {activeTab === 'masuk' && disposisiMasuk.map((disposisi) => (
                  <div
                    key={disposisi.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(disposisi.status)}`}>
                            {disposisi.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getInstruksiBadge(disposisi.instruksi)}`}>
                            {disposisi.instruksi}
                          </span>
                          <span className="text-xs text-gray-500">
                            Level {disposisi.level_disposisi}
                          </span>
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-1">
                          {disposisi.surat?.perihal || 'Tanpa Perihal'}
                        </h3>

                        <p className="text-sm text-gray-600 mb-2">
                          Nomor: <span className="font-medium">{disposisi.surat?.nomor_surat}</span>
                        </p>

                        <p className="text-sm text-gray-600 mb-2">
                          Dari: <span className="font-medium">{disposisi.dari_user?.name}</span>
                          <span className="text-gray-400 mx-2">•</span>
                          <span className="text-gray-500">{disposisi.dari_user?.role}</span>
                        </p>

                        {disposisi.catatan && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">
                            <span className="font-medium">Catatan:</span> {disposisi.catatan}
                          </p>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                          {formatTanggal(disposisi.tanggal_disposisi)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {disposisi.status === 'pending' && (
                          <button
                            onClick={() => handleBacaDisposisi(disposisi.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                          >
                            Tandai Dibaca
                          </button>
                        )}
                        
                        <button
                          onClick={() => window.location.href = `/disposisi/${disposisi.id}`}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                        >
                          Detail
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {activeTab === 'keluar' && disposisiKeluar.map((disposisi) => (
                  <div
                    key={disposisi.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(disposisi.status)}`}>
                            {disposisi.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getInstruksiBadge(disposisi.instruksi)}`}>
                            {disposisi.instruksi}
                          </span>
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-1">
                          {disposisi.surat?.perihal || 'Tanpa Perihal'}
                        </h3>

                        <p className="text-sm text-gray-600 mb-2">
                          Kepada: <span className="font-medium">{disposisi.ke_user?.name}</span>
                          <span className="text-gray-400 mx-2">•</span>
                          <span className="text-gray-500">{disposisi.ke_user?.role}</span>
                        </p>

                        {disposisi.catatan && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">
                            <span className="font-medium">Catatan:</span> {disposisi.catatan}
                          </p>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                          {formatTanggal(disposisi.tanggal_disposisi)}
                        </p>
                      </div>

                      <button
                        onClick={() => window.location.href = `/disposisi/${disposisi.id}`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium ml-4"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Input Surat Masuk */}
      {showInputModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Input Surat Masuk</h2>
              <button
                onClick={() => {
                  setShowInputModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-2xl" />
              </button>
            </div>

            <form onSubmit={handleSubmitSurat} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Surat <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nomor_surat"
                  value={formData.nomor_surat}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contoh: 001/SK/2025"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Surat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="tanggal_surat"
                    value={formData.tanggal_surat}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Terima
                  </label>
                  <input
                    type="date"
                    name="tanggal_terima"
                    value={formData.tanggal_terima}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pengirim <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="pengirim"
                  value={formData.pengirim}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nama pengirim/instansi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perihal <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="perihal"
                  value={formData.perihal}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Perihal/subjek surat"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Surat
                </label>
                <select
                  name="jenis_surat"
                  value={formData.jenis_surat}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="biasa">Biasa</option>
                  <option value="penting">Penting</option>
                  <option value="segera">Segera</option>
                  <option value="rahasia">Rahasia</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keterangan
                </label>
                <textarea
                  name="keterangan"
                  value={formData.keterangan}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Keterangan tambahan (opsional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File (PDF/JPG/PNG, max 5MB)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FiUpload className="mx-auto text-4xl text-gray-400 mb-2" />
                    {selectedFile ? (
                      <p className="text-sm text-gray-700 font-medium">{selectedFile.name}</p>
                    ) : (
                      <p className="text-sm text-gray-500">Klik untuk upload file</p>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInputModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Surat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
