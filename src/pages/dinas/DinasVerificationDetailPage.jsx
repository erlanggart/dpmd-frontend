import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LuArrowLeft, LuFileText, LuSave, LuDownload, LuUser, LuMapPin,
  LuCalendar, LuDollarSign, LuClipboardList, LuCircleCheck, LuCircleX, LuPackage
} from 'react-icons/lu';
import api from '../../api';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const DinasVerificationDetailPage = () => {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  
  const [proposal, setProposal] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [answers, setAnswers] = useState({});
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [proposalId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [proposalRes, questionnaireRes] = await Promise.all([
        api.get(`/dinas/bankeu/proposals/${proposalId}`),
        api.get(`/dinas/bankeu/proposals/${proposalId}/questionnaire`)
      ]);

      if (proposalRes.data.success) {
        setProposal(proposalRes.data.data);
      }

      if (questionnaireRes.data.success) {
        setQuestionnaire(questionnaireRes.data.data);
        // Initialize answers from existing questionnaire
        if (questionnaireRes.data.data.existing_answers) {
          const existingAnswers = {};
          questionnaireRes.data.data.existing_answers.forEach(a => {
            existingAnswers[a.question_id] = {
              is_compliant: a.is_compliant,
              catatan: a.catatan || ''
            };
          });
          setAnswers(existingAnswers);
        }
        if (questionnaireRes.data.data.existing_catatan) {
          setCatatan(questionnaireRes.data.data.existing_catatan);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, field, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value
      }
    }));
  };

  const saveDraft = async () => {
    try {
      setSaving(true);
      const response = await api.post(`/dinas/bankeu/proposals/${proposalId}/questionnaire/save`, {
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          question_id: parseInt(questionId),
          is_compliant: answer.is_compliant,
          catatan: answer.catatan
        })),
        catatan_umum: catatan
      });

      if (response.data.success) {
        alert('Draft berhasil disimpan');
        // Optionally reload data
        fetchData();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Gagal menyimpan draft');
    } finally {
      setSaving(false);
    }
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
            
            {/* Detail kegiatan dari desa */}
            {(proposal.volume || proposal.lokasi) && (
              <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                <div className="text-sm font-semibold text-blue-800 mb-2">Detail Kegiatan:</div>
                <div className="space-y-1.5 text-sm text-blue-700">
                  {proposal.volume && (
                    <div className="flex items-center gap-2">
                      <LuPackage className="w-4 h-4" />
                      <span><span className="font-medium">Volume:</span> {proposal.volume}</span>
                    </div>
                  )}
                  {proposal.lokasi && (
                    <div className="flex items-center gap-2">
                      <LuMapPin className="w-4 h-4" />
                      <span><span className="font-medium">Lokasi:</span> {proposal.lokasi}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
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

      {/* Questionnaire */}
      {questionnaire && questionnaire.questions && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <LuClipboardList className="w-5 h-5 text-amber-500" />
            Kuesioner Verifikasi
          </h3>

          <div className="space-y-4">
            {questionnaire.questions.map((question, index) => (
              <div key={question.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <p className="text-gray-800 font-medium">{question.question_text}</p>
                </div>

                <div className="ml-10 space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`question_${question.id}`}
                        checked={answers[question.id]?.is_compliant === true}
                        onChange={() => handleAnswerChange(question.id, 'is_compliant', true)}
                        className="w-4 h-4 text-green-500 focus:ring-green-500"
                      />
                      <span className="flex items-center gap-1 text-green-600">
                        <LuCircleCheck className="w-4 h-4" />
                        Sesuai
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`question_${question.id}`}
                        checked={answers[question.id]?.is_compliant === false}
                        onChange={() => handleAnswerChange(question.id, 'is_compliant', false)}
                        className="w-4 h-4 text-red-500 focus:ring-red-500"
                      />
                      <span className="flex items-center gap-1 text-red-600">
                        <LuCircleX className="w-4 h-4" />
                        Tidak Sesuai
                      </span>
                    </label>
                  </div>

                  <input
                    type="text"
                    placeholder="Catatan (opsional)"
                    value={answers[question.id]?.catatan || ''}
                    onChange={(e) => handleAnswerChange(question.id, 'catatan', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* General Notes */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Umum Verifikasi
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={4}
              placeholder="Masukkan catatan umum untuk verifikasi ini..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Catatan:</span> Simpan kuesioner sebagai draft. 
            Untuk menyetujui/menolak proposal, gunakan tombol aksi di halaman daftar.
          </p>
          <button
            onClick={saveDraft}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <LuSave className="w-5 h-5" />
            {saving ? 'Menyimpan...' : 'Simpan Draft'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DinasVerificationDetailPage;
