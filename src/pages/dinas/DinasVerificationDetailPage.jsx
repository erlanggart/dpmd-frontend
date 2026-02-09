import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LuArrowLeft, LuFileText, LuDownload, LuUser, LuMapPin,
  LuCalendar, LuDollarSign, LuPackage, LuClipboardList
} from 'react-icons/lu';
import api from '../../api';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const DinasVerificationDetailPage = () => {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const dinasId = user.dinas_id;

  useEffect(() => {
    fetchData();
  }, [proposalId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const proposalRes = await api.get(`/dinas/bankeu/proposals/${proposalId}`);

      if (proposalRes.data.success) {
        setProposal(proposalRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">Proposal tidak ditemukan</p>
          <button
            onClick={() => navigate('/dinas/bankeu')}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
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

  if (!proposal) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Proposal tidak ditemukan</p>
        <button
          onClick={() => navigate('/dinas/bankeu')}
          className="mt-4 text-amber-600 hover:text-amber-700"
        >
          Kembali ke daftar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dinas/bankeu')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LuArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Detail Verifikasi</h1>
          <p className="text-gray-500">Proposal #{proposalId}</p>
        </div>
      </div>

      {/* Proposal Info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-amber-100 rounded-xl">
            <LuFileText className="w-8 h-8 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">{proposal.judul_proposal}</h2>
            {proposal.kegiatan_list && proposal.kegiatan_list.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {proposal.kegiatan_list.map((kegiatan) => (
                  <span 
                    key={kegiatan.id}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      kegiatan.jenis_kegiatan === 'infrastruktur' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {kegiatan.nama_kegiatan}
                  </span>
                ))}
              </div>
            )}
            {proposal.deskripsi && (
              <p className="text-gray-600 mt-2">{proposal.deskripsi}</p>
            )}
            
            {/* Info Grid - Volume, Lokasi, Anggaran */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              {proposal.volume && (
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                  <LuPackage className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Volume</p>
                    <p className="text-sm font-semibold text-blue-900">{proposal.volume}</p>
                  </div>
                </div>
              )}
              {proposal.lokasi && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg">
                  <LuMapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-red-600 font-medium">Lokasi</p>
                    <p className="text-sm font-semibold text-red-900">{proposal.lokasi}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg">
                <LuDollarSign className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-green-600 font-medium">Anggaran</p>
                  <p className="text-sm font-semibold text-green-900">{formatCurrency(proposal.anggaran_usulan)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <LuMapPin className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Desa/Kecamatan</p>
              <p className="font-medium text-gray-800">{proposal.desas?.nama}, {proposal.desas?.kecamatan?.nama}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <LuClipboardList className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Kegiatan ({proposal.kegiatan_list?.length || 0})</p>
              {proposal.kegiatan_list && proposal.kegiatan_list.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {proposal.kegiatan_list.map((kegiatan) => (
                    <span 
                      key={kegiatan.id}
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        kegiatan.jenis_kegiatan === 'infrastruktur' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {kegiatan.nama_kegiatan.substring(0, 20)}...
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <LuDollarSign className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Anggaran Usulan</p>
              <p className="font-medium text-gray-800">{formatCurrency(proposal.anggaran_usulan)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <LuCalendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Tanggal Pengajuan</p>
              <p className="font-medium text-gray-800">{formatDate(proposal.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Download Proposal */}
        {proposal.file_proposal && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <a
              href={`${imageBaseUrl.replace(/\/api$/, '')}/storage/uploads/bankeu/${proposal.file_proposal}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <LuDownload className="w-4 h-4" />
              Download Dokumen Proposal
            </a>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <LuFileText className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-amber-900 mb-2">Informasi Verifikasi</h3>
            <p className="text-amber-800 text-sm leading-relaxed">
              Sebagai Dinas Terkait, Anda hanya perlu memastikan <strong>Tanda Tangan Digital</strong> sudah tersimpan di halaman <strong>Konfigurasi Dinas</strong>.
              <br />
              Tanda tangan akan digunakan untuk Berita Acara Verifikasi bersama Tim Verifikasi Kecamatan.
            </p>
            <button
              onClick={() => navigate('/dinas/config')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
            >
              <LuFileText className="w-4 h-4" />
              Ke Halaman Konfigurasi
            </button>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <button
          onClick={() => navigate('/dinas/bankeu')}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <LuArrowLeft className="w-5 h-5" />
          Kembali ke Daftar Proposal
        </button>
      </div>
    </div>
  );
};

export default DinasVerificationDetailPage;
