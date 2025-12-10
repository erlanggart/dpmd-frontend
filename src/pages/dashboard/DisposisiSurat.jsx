import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiSend, FiClock, FiCheck, FiEye, FiPlus, FiUpload, FiX, FiFileText, FiCalendar } from 'react-icons/fi';
import api from '../../api';
import { toast } from 'react-hot-toast';

export default function DisposisiSurat() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get user first before using in state
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSecretariat = user.role === 'sekretariat' || user.role === 'superadmin';
  
  const [activeTab, setActiveTab] = useState(isSecretariat ? 'surat-masuk' : 'masuk');
  const [suratMasuk, setSuratMasuk] = useState([]);
  const [disposisiMasuk, setDisposisiMasuk] = useState([]);
  const [disposisiKeluar, setDisposisiKeluar] = useState([]);
  const [statistik, setStatistik] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInputModal, setShowInputModal] = useState(false);
  const [showKirimModal, setShowKirimModal] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [kepalaDinasList, setKepalaDinasList] = useState([]);
  const [formKirim, setFormKirim] = useState({
    kepala_dinas_user_id: '',
    catatan: '',
    instruksi: 'biasa'
  });
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
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  
  // Pagination states
  const [currentPageSuratMasuk, setCurrentPageSuratMasuk] = useState(1);
  const [currentPageDisposisiMasuk, setCurrentPageDisposisiMasuk] = useState(1);
  const [currentPageDisposisiKeluar, setCurrentPageDisposisiKeluar] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchData();
    // Reset pagination saat ganti tab
    setCurrentPageSuratMasuk(1);
    setCurrentPageDisposisiMasuk(1);
    setCurrentPageDisposisiKeluar(1);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'surat-masuk') {
        // Fetch surat masuk draft untuk sekretariat
        const suratRes = await api.get('/surat-masuk?status=draft');
        setSuratMasuk(suratRes.data.data || []);
      } else {
        // Fetch disposisi seperti biasa
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
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data');
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

  const fetchKepalaDinas = async () => {
    try {
      const response = await api.get('/users?role=kepala_dinas');
      setKepalaDinasList(response.data.data || []);
    } catch (error) {
      console.error('Error fetching kepala dinas:', error);
      toast.error('Gagal memuat daftar kepala dinas');
    }
  };

  const handleOpenKirimModal = (surat) => {
    setSelectedSurat(surat);
    setShowKirimModal(true);
    fetchKepalaDinas();
  };

  const handleKirimKeKepalaDinas = async (e) => {
    e.preventDefault();
    if (!formKirim.kepala_dinas_user_id) {
      toast.error('Pilih kepala dinas terlebih dahulu');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/surat-masuk/${selectedSurat.id}/kirim-kepala-dinas`, formKirim);
      toast.success('Surat berhasil dikirim ke Kepala Dinas');
      setShowKirimModal(false);
      setFormKirim({
        kepala_dinas_user_id: '',
        catatan: '',
        instruksi: 'biasa'
      });
      setSelectedSurat(null);
      fetchData(); // Refresh list
    } catch (error) {
      console.error('Error sending surat:', error);
      toast.error(error.response?.data?.message || 'Gagal mengirim surat');
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

  // Pagination helpers
  const getPaginatedData = (data, currentPage) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  // Get paginated data untuk setiap tab
  const paginatedSuratMasuk = getPaginatedData(suratMasuk, currentPageSuratMasuk);
  const paginatedDisposisiMasuk = getPaginatedData(disposisiMasuk, currentPageDisposisiMasuk);
  const paginatedDisposisiKeluar = getPaginatedData(disposisiKeluar, currentPageDisposisiKeluar);

  // Pagination component
  const Pagination = ({ currentPage, totalPages, onPageChange, totalItems }) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="mt-6">
        {/* Info showing entries */}
        <div className="text-center text-sm text-gray-600 mb-3">
          Menampilkan <span className="font-semibold text-gray-900">{startItem}</span> - <span className="font-semibold text-gray-900">{endItem}</span> dari <span className="font-semibold text-gray-900">{totalItems}</span> data
        </div>
        
        <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${ 
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
          }`}
        >
          Previous
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200"
            >
              1
            </button>
            {startPage > 2 && <span className="text-gray-400">...</span>}
          </>
        )}

        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentPage === page
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
          }`}
        >
          Next
        </button>
      </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-4 sm:mb-8">
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-8 text-white">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl">
                <FiFileText className="text-xl sm:text-3xl" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold">Manajemen Disposisi</h1>
                <p className="text-blue-100 mt-1 text-xs sm:text-base">Kelola surat masuk dan disposisi secara efisien</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Button - Only for Sekretariat */}
        {isSecretariat && (
          <div className="mb-4 sm:mb-6 flex justify-end">
            <button
              onClick={() => setShowInputModal(true)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-cyan-700 font-medium text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              <FiPlus className="text-lg sm:text-xl" />
              Input Surat Masuk
            </button>
          </div>
        )}  

        {/* Statistik Cards */}
        {statistik && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-white/90">Pending</p>
                  <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{statistik.masuk.pending}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl">
                  <FiClock className="text-xl sm:text-3xl" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-white/90">Dibaca</p>
                  <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{statistik.masuk.dibaca}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl">
                  <FiEye className="text-xl sm:text-3xl" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">Proses</p>
                  <p className="text-3xl font-bold mt-2">{statistik.masuk.proses}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <FiSend className="text-3xl" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-white/90">Selesai</p>
                  <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{statistik.masuk.selesai}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl">
                  <FiCheck className="text-xl sm:text-3xl" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-6 overflow-hidden">
          <div className="border-b-2 border-gray-100">
            <nav className="flex -mb-px">
              {/* Tab Surat Masuk - hanya untuk sekretariat */}
              {isSecretariat && (
                <button
                  onClick={() => setActiveTab('surat-masuk')}
                  className={`py-4 px-6 font-semibold text-sm border-b-3 transition-all duration-200 ${
                    activeTab === 'surat-masuk'
                      ? 'border-b-4 border-green-500 text-green-600 bg-green-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-lg" />
                    Surat Masuk
                    <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                      {suratMasuk.length}
                    </span>
                  </div>
                </button>
              )}
              
              <button
                onClick={() => setActiveTab('masuk')}
                className={`py-4 px-6 font-semibold text-sm border-b-3 transition-all duration-200 ${
                  activeTab === 'masuk'
                    ? 'border-b-4 border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiMail className="text-lg" />
                  Disposisi Masuk
                  {statistik && (
                    <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                      {statistik.masuk.total}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setActiveTab('keluar')}
                className={`py-4 px-6 font-semibold text-sm border-b-3 transition-all duration-200 ${
                  activeTab === 'keluar'
                    ? 'border-b-4 border-purple-500 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiSend className="text-lg" />
                  Disposisi Keluar
                  {statistik && (
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                      {statistik.keluar.total}
                    </span>
                  )}
                </div>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-6">
            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-3 sm:mt-4 text-sm sm:text-base">Memuat data...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Surat Masuk Tab */}
                {activeTab === 'surat-masuk' && suratMasuk.length === 0 && (
                  <div className="text-center py-12">
                    <FiFileText className="mx-auto text-gray-400 text-5xl mb-4" />
                    <p className="text-gray-500">Tidak ada surat masuk</p>
                  </div>
                )}

                {activeTab === 'surat-masuk' && paginatedSuratMasuk.map((surat) => (
                  <div
                    key={surat.id}
                    className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold shadow-sm ${
                            surat.jenis_surat === 'segera' 
                              ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
                              : surat.jenis_surat === 'rahasia'
                              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                              : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                          }`}>
                            {surat.jenis_surat}
                          </span>
                          <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-sm">
                            Draft
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2">{surat.perihal}</h3>
                        <p className="text-xs sm:text-sm text-gray-700 mb-1.5 sm:mb-2">
                          <span className="font-semibold text-blue-600">No. Surat:</span> {surat.nomor_surat}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3">
                          <span className="font-semibold text-purple-600">Dari:</span> {surat.pengirim}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                          <span className="flex items-center gap-1">
                            <FiCalendar className="text-blue-500 flex-shrink-0" />
                            <span className="font-medium">Tgl Surat:</span> {new Date(surat.tanggal_surat).toLocaleDateString('id-ID')}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiClock className="text-green-500 flex-shrink-0" />
                            <span className="font-medium">Diterima:</span> {new Date(surat.tanggal_terima).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:ml-4">
                        <button
                          onClick={() => handleOpenKirimModal(surat)}
                          className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
                          title="Kirim ke Kepala Dinas"
                        >
                          <FiSend size={20} />
                        </button>
                        {surat.file_path && (
                          <>
                            <button
                              onClick={() => {
                                // Cek apakah file_path sudah berupa full URL
                                let url;
                                let cleanPath = surat.file_path;
                                
                                // Fix path yang dimulai dengan .dpmdbogorkab.id
                                if (cleanPath.startsWith('.dpmdbogorkab.id')) {
                                  cleanPath = 'https://api' + cleanPath;
                                }
                                
                                if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
                                  url = cleanPath;
                                } else {
                                  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001';
                                  const filePath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
                                  url = `${baseUrl}${filePath}`;
                                }
                                console.log('Preview URL (Surat Masuk):', url);
                                setPdfUrl(url);
                                setShowPdfModal(true);
                              }}
                              className="p-2 sm:p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
                              title="Preview PDF"
                            >
                              <FiEye size={18} className="sm:w-5 sm:h-5" />
                            </button>
                            <a
                              href={(() => {
                                let cleanPath = surat.file_path;
                                if (cleanPath.startsWith('.dpmdbogorkab.id')) {
                                  cleanPath = 'https://api' + cleanPath;
                                }
                                return cleanPath.startsWith('http://') || cleanPath.startsWith('https://')
                                  ? cleanPath
                                  : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001'}${cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath}`;
                              })()}
                              target="_blank"
                              download
                              rel="noopener noreferrer"
                              className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg sm:rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
                              title="Download PDF"
                            >
                              <FiFileText size={18} className="sm:w-5 sm:h-5" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination Surat Masuk */}
                {activeTab === 'surat-masuk' && suratMasuk.length > 0 && (
                  <Pagination 
                    currentPage={currentPageSuratMasuk}
                    totalPages={getTotalPages(suratMasuk)}
                    totalItems={suratMasuk.length}
                    onPageChange={setCurrentPageSuratMasuk}
                  />
                )}

                {activeTab === 'masuk' && disposisiMasuk.length === 0 && (
                  <div className="text-center py-12 sm:py-16 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                      <FiMail className="text-white text-3xl sm:text-4xl" />
                    </div>
                    <p className="text-gray-600 font-medium text-base sm:text-lg">Tidak ada disposisi masuk</p>
                  </div>
                )}

                {activeTab === 'keluar' && disposisiKeluar.length === 0 && (
                  <div className="text-center py-12 sm:py-16 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                      <FiSend className="text-white text-3xl sm:text-4xl" />
                    </div>
                    <p className="text-gray-600 font-medium text-base sm:text-lg">Tidak ada disposisi keluar</p>
                  </div>
                )}

                {activeTab === 'masuk' && paginatedDisposisiMasuk.map((disposisi) => (
                  <div
                    key={disposisi.id}
                    className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold shadow-sm ${getStatusBadge(disposisi.status)}`}>
                            {disposisi.status}
                          </span>
                          <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold shadow-sm ${getInstruksiBadge(disposisi.instruksi)}`}>
                            {disposisi.instruksi}
                          </span>
                          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-gray-400 to-gray-600 text-white shadow-sm">
                            Level {disposisi.level_disposisi}
                          </span>
                        </div>

                        <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2">
                          {disposisi.surat?.perihal || 'Tanpa Perihal'}
                        </h3>

                        <p className="text-xs sm:text-sm text-gray-700 mb-1.5 sm:mb-2">
                          <span className="font-semibold text-blue-600">Nomor:</span> <span className="font-medium">{disposisi.surat?.nomor_surat}</span>
                        </p>

                        <p className="text-xs sm:text-sm text-gray-700 mb-2">
                          <span className="font-semibold text-purple-600">Dari:</span> <span className="font-medium">{disposisi.dari_user?.name}</span>
                          <span className="text-gray-400 mx-1 sm:mx-2">•</span>
                          <span className="text-gray-500 text-xs font-medium">{disposisi.dari_user?.role}</span>
                        </p>

                        {disposisi.catatan && (
                          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 p-2 sm:p-3 rounded-lg mt-2 sm:mt-3">
                            <p className="text-xs sm:text-sm text-gray-800">
                              <span className="font-bold text-blue-700">Catatan:</span> {disposisi.catatan}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 text-xs text-gray-600 bg-gray-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                          <FiClock className="text-blue-500 flex-shrink-0" />
                          <span className="font-medium">{formatTanggal(disposisi.tanggal_disposisi)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 sm:flex-col sm:ml-4">
                        {disposisi.surat?.file_path && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                let url;
                                let cleanPath = disposisi.surat.file_path;
                                
                                console.log('🔍 DEBUG DISPOSISI MASUK:');
                                console.log('  - Original file_path:', disposisi.surat.file_path);
                                console.log('  - VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
                                
                                if (cleanPath.startsWith('.dpmdbogorkab.id')) {
                                  console.log('  - Detected malformed path, fixing...');
                                  cleanPath = 'https://api' + cleanPath;
                                }
                                
                                if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
                                  url = cleanPath;
                                  console.log('  - Using full URL directly:', url);
                                } else {
                                  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001';
                                  const filePath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
                                  url = `${baseUrl}${filePath}`;
                                  console.log('  - Constructed URL:', url);
                                }
                                console.log('  ✅ Final URL:', url);
                                setPdfUrl(url);
                                setShowPdfModal(true);
                              }}
                              className="p-2 sm:p-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
                              title="Preview PDF"
                            >
                              <FiEye size={18} className="sm:w-5 sm:h-5" />
                            </button>
                            <a
                              href={`${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001'}${disposisi.surat.file_path.startsWith('/') ? disposisi.surat.file_path : '/' + disposisi.surat.file_path}`}
                              target="_blank"
                              download
                              rel="noopener noreferrer"
                              className="p-2 sm:p-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg sm:rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
                              title="Download File"
                            >
                              <FiFileText size={18} className="sm:w-5 sm:h-5" />
                            </a>
                          </div>
                        )}
                        
                        {disposisi.status === 'pending' && (
                          <button
                            onClick={() => handleBacaDisposisi(disposisi.id)}
                            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-cyan-600 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                          >
                            Tandai Dibaca
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            const basePath = location.pathname.includes('/kepala-dinas') 
                              ? '/kepala-dinas' 
                              : location.pathname.includes('/kepala-bidang')
                              ? '/kepala-bidang'
                              : location.pathname.includes('/sekretaris-dinas')
                              ? '/sekretaris-dinas'
                              : location.pathname.includes('/pegawai')
                              ? '/pegawai'
                              : '/dashboard';
                            navigate(`${basePath}/disposisi/${disposisi.id}`);
                          }}
                          className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg sm:rounded-xl hover:from-gray-700 hover:to-gray-800 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                        >
                          Detail
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination Disposisi Masuk */}
                {activeTab === 'masuk' && disposisiMasuk.length > 0 && (
                  <Pagination 
                    currentPage={currentPageDisposisiMasuk}
                    totalPages={getTotalPages(disposisiMasuk)}
                    totalItems={disposisiMasuk.length}
                    onPageChange={setCurrentPageDisposisiMasuk}
                  />
                )}

                {activeTab === 'keluar' && paginatedDisposisiKeluar.map((disposisi) => (
                  <div
                    key={disposisi.id}
                    className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getStatusBadge(disposisi.status)}`}>
                            {disposisi.status}
                          </span>
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getInstruksiBadge(disposisi.instruksi)}`}>
                            {disposisi.instruksi}
                          </span>
                        </div>

                        <h3 className="font-bold text-gray-900 text-lg mb-2">
                          {disposisi.surat?.perihal || 'Tanpa Perihal'}
                        </h3>

                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-semibold text-purple-600">Kepada:</span> <span className="font-medium">{disposisi.ke_user?.name}</span>
                          <span className="text-gray-400 mx-2">•</span>
                          <span className="text-gray-500 text-xs font-medium">{disposisi.ke_user?.role}</span>
                        </p>

                        {disposisi.catatan && (
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 p-3 rounded-lg mt-3">
                            <p className="text-sm text-gray-800">
                              <span className="font-bold text-purple-700">Catatan:</span> {disposisi.catatan}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                          <FiClock className="text-purple-500" />
                          <span className="font-medium">{formatTanggal(disposisi.tanggal_disposisi)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {disposisi.surat?.file_path && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                let url;
                                let cleanPath = disposisi.surat.file_path;
                                
                                if (cleanPath.startsWith('.dpmdbogorkab.id')) {
                                  cleanPath = 'https://api' + cleanPath;
                                }
                                
                                if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
                                  url = cleanPath;
                                } else {
                                  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001';
                                  const filePath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
                                  url = `${baseUrl}${filePath}`;
                                }
                                console.log('Preview URL (Disposisi Keluar):', url);
                                setPdfUrl(url);
                                setShowPdfModal(true);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Preview PDF"
                            >
                              <FiEye size={20} />
                            </button>
                            <a
                              href={`${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3001'}${disposisi.surat.file_path.startsWith('/') ? disposisi.surat.file_path : '/' + disposisi.surat.file_path}`}
                              target="_blank"
                              download
                              rel="noopener noreferrer"
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Download File"
                            >
                              <FiFileText size={20} />
                            </a>
                          </div>
                        )}
                        
                        <button
                          onClick={() => {
                            const basePath = location.pathname.includes('/kepala-dinas') 
                              ? '/kepala-dinas' 
                              : location.pathname.includes('/kepala-bidang')
                              ? '/kepala-bidang'
                              : location.pathname.includes('/sekretaris-dinas')
                              ? '/sekretaris-dinas'
                              : location.pathname.includes('/pegawai')
                              ? '/pegawai'
                              : '/dashboard';
                            navigate(`${basePath}/disposisi/${disposisi.id}`);
                          }}
                          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                        >
                          Detail
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination Disposisi Keluar */}
                {activeTab === 'keluar' && disposisiKeluar.length > 0 && (
                  <Pagination 
                    currentPage={currentPageDisposisiKeluar}
                    totalPages={getTotalPages(disposisiKeluar)}
                    totalItems={disposisiKeluar.length}
                    onPageChange={setCurrentPageDisposisiKeluar}
                  />
                )}
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

      {/* Modal Kirim ke Kepala Dinas */}
      {showKirimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <FiSend className="text-2xl" />
                  Kirim ke Kepala Dinas
                </h3>
                <button
                  onClick={() => {
                    setShowKirimModal(false);
                    setSelectedSurat(null);
                    setFormKirim({
                      kepala_dinas_user_id: '',
                      catatan: '',
                      instruksi: 'biasa'
                    });
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>
            <div className="p-6">

            {selectedSurat && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">{selectedSurat.perihal}</p>
                <p className="text-xs text-gray-500 mt-1">No: {selectedSurat.nomor_surat}</p>
              </div>
            )}

            <form onSubmit={handleKirimKeKepalaDinas} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kepala Dinas <span className="text-red-500">*</span>
                </label>
                <select
                  value={formKirim.kepala_dinas_user_id}
                  onChange={(e) => setFormKirim({...formKirim, kepala_dinas_user_id: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="">-- Pilih Kepala Dinas --</option>
                  {kepalaDinasList.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instruksi
                </label>
                <select
                  value={formKirim.instruksi}
                  onChange={(e) => setFormKirim({...formKirim, instruksi: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="biasa">Biasa</option>
                  <option value="segera">Segera</option>
                  <option value="sangat_segera">Sangat Segera</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={formKirim.catatan}
                  onChange={(e) => setFormKirim({...formKirim, catatan: e.target.value})}
                  rows="4"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  placeholder="Tambahkan catatan untuk kepala dinas..."
                />
              </div>

              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowKirimModal(false);
                    setSelectedSurat(null);
                    setFormKirim({
                      kepala_dinas_user_id: '',
                      catatan: '',
                      instruksi: 'biasa'
                    });
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <FiSend />
                  {submitting ? 'Mengirim...' : 'Kirim'}
                </button>
              </div>
            </form>
            </div>
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
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  type="application/pdf"
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
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
  );
}
