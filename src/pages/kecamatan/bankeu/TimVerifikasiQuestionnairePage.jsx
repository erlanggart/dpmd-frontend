import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api";
import Swal from "sweetalert2";
import {
  LuSave, LuSend, LuArrowLeft, LuCheckCircle, LuXCircle, LuAlertCircle, LuFileText, LuUser
} from "react-icons/lu";

const QUESTIONS = [
  {
    id: 1,
    field: 'q1_proposal_ttd_stempel',
    text: 'Proposal telah ditandatangani oleh Kepala Desa dan diketahui oleh Camat'
  },
  {
    id: 2,
    field: 'q2_fotocopy_kelengkapan',
    text: 'Foto copy dokumen kelengkapan proposal'
  },
  {
    id: 3,
    field: 'q3_rab_format',
    text: 'RAB sesuai dengan format yang telah ditentukan'
  },
  {
    id: 4,
    field: 'q4_volume_realistis',
    text: 'Volume pekerjaan realistis dan dapat dipertanggungjawabkan'
  },
  {
    id: 5,
    field: 'q5_harga_satuan',
    text: 'Harga satuan sesuai dengan harga yang berlaku di daerah'
  },
  {
    id: 6,
    field: 'q6_lokasi_jelas',
    text: 'Lokasi kegiatan jelas dan tidak bermasalah'
  },
  {
    id: 7,
    field: 'q7_kegiatan_fisik',
    text: 'Kegiatan bersifat fisik infrastruktur atau pemberdayaan masyarakat'
  },
  {
    id: 8,
    field: 'q8_tidak_tumpang_tindih',
    text: 'Kegiatan tidak tumpang tindih dengan program lain'
  },
  {
    id: 9,
    field: 'q9_swakelola',
    text: 'Swakelola dilaksanakan oleh desa'
  },
  {
    id: 10,
    field: 'q10_partisipasi_masyarakat',
    text: 'Masyarakat ikut berpartisipasi (gotong royong)'
  },
  {
    id: 11,
    field: 'q11_dampak_luas',
    text: 'Dampak kegiatan dapat dirasakan oleh masyarakat luas'
  },
  {
    id: 12,
    field: 'q12_dukung_pencapaian',
    text: 'Kegiatan mendukung pencapaian tujuan pembangunan desa'
  },
  {
    id: 13,
    field: 'q13_rekomendasi',
    text: 'Proposal dapat direkomendasikan untuk dibiayai'
  }
];

const TimVerifikasiQuestionnairePage = () => {
  const { proposalId, timVerifikasiId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [timVerifikasi, setTimVerifikasi] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, [proposalId, timVerifikasiId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get proposal details
      const proposalRes = await api.get(`/desa/bankeu/proposals/${proposalId}`);
      setProposal(proposalRes.data.data);

      // Get tim verifikasi info
      const user = JSON.parse(localStorage.getItem("user"));
      const timRes = await api.get(`/kecamatan/bankeu/tim-verifikasi/${user.kecamatan_id}`);
      const tim = timRes.data.data.find(t => t.id === parseInt(timVerifikasiId));
      setTimVerifikasi(tim);

      // Try to get existing questionnaire
      try {
        const questionnaireRes = await api.get(
          `/kecamatan/bankeu/questionnaire/${proposalId}/${timVerifikasiId}`
        );
        
        if (questionnaireRes.data.success) {
          setFormData(questionnaireRes.data.data);
        }
      } catch (error) {
        // Questionnaire doesn't exist yet, that's okay
        if (error.response?.status !== 404) {
          console.error("Error fetching questionnaire:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal memuat data"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleKeteranganChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [`${field}_keterangan`]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await api.post(
        `/kecamatan/bankeu/questionnaire/${proposalId}/${timVerifikasiId}/save`,
        formData
      );

      Swal.fire({
        icon: "success",
        title: "Tersimpan",
        text: "Questionnaire berhasil disimpan sebagai draft",
        timer: 2000
      });
    } catch (error) {
      console.error("Error saving questionnaire:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal menyimpan questionnaire"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validate that all questions are answered
    const unanswered = QUESTIONS.filter(q => formData[q.field] === undefined || formData[q.field] === null);
    
    if (unanswered.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Data Belum Lengkap",
        html: `Mohon jawab semua pertanyaan sebelum submit.<br><br>Pertanyaan yang belum dijawab:<br>${unanswered.map(q => `- ${q.text}`).join('<br>')}`,
        confirmButtonText: "OK"
      });
      return;
    }

    const result = await Swal.fire({
      icon: "question",
      title: "Konfirmasi Submit",
      text: "Setelah disubmit, questionnaire tidak dapat diubah lagi. Lanjutkan?",
      showCancelButton: true,
      confirmButtonText: "Ya, Submit",
      cancelButtonText: "Batal",
      confirmButtonColor: "#8b5cf6"
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);

      await api.post(
        `/kecamatan/bankeu/questionnaire/${proposalId}/${timVerifikasiId}/submit`,
        formData
      );

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Questionnaire berhasil disubmit",
        timer: 2000
      });

      navigate(-1);
    } catch (error) {
      console.error("Error submitting questionnaire:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal submit questionnaire"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Memuat data...</div>
      </div>
    );
  }

  const isSubmitted = formData.status === 'submitted';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LuArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Questionnaire Verifikasi</h1>
            <p className="text-gray-600 mt-1">
              Formulir penilaian kelayakan proposal bankeu
            </p>
          </div>
          {isSubmitted && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
              <LuCheckCircle className="w-5 h-5" />
              <span className="font-semibold">Sudah Disubmit</span>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-violet-50 p-4 rounded-lg border border-violet-200">
            <div className="flex items-center gap-3">
              <LuFileText className="w-6 h-6 text-violet-600" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Proposal</div>
                <div className="font-semibold text-gray-900">{proposal?.desa?.nama}</div>
                <div className="text-xs text-gray-500">{proposal?.kegiatan?.nama_kegiatan}</div>
                
                {/* Judul yang dipilih desa */}
                <div className="text-sm font-semibold text-violet-700 mt-1">
                  {proposal?.nama_kegiatan_spesifik || proposal?.judul_proposal}
                </div>
                
                {/* Detail kegiatan dari desa */}
                {(proposal?.volume || proposal?.lokasi) && (
                  <div className="mt-2 pt-2 border-t border-violet-200 space-y-1">
                    {proposal?.volume && (
                      <div className="flex items-center gap-1 text-xs text-gray-700">
                        <LuPackage className="w-3 h-3 text-blue-600" />
                        <span>Volume: {proposal.volume}</span>
                      </div>
                    )}
                    {proposal?.lokasi && (
                      <div className="flex items-center gap-1 text-xs text-gray-700">
                        <LuMapPin className="w-3 h-3 text-red-600" />
                        <span>Lokasi: {proposal.lokasi}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <LuUser className="w-6 h-6 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">Verifikator</div>
                <div className="font-semibold text-gray-900">{timVerifikasi?.nama}</div>
                <div className="text-sm text-gray-600 capitalize">{timVerifikasi?.jabatan}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questionnaire Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Daftar Pertanyaan Verifikasi</h2>

        <div className="space-y-6">
          {QUESTIONS.map((question, index) => (
            <div key={question.id} className="border-b border-gray-200 pb-6 last:border-0">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                  <span className="text-violet-700 font-bold">{question.id}</span>
                </div>

                <div className="flex-1">
                  <h3 className="text-gray-900 font-medium mb-4">{question.text}</h3>

                  {/* Checkbox Options */}
                  <div className="flex gap-4 mb-4">
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      formData[question.field] === true
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'border-gray-300 hover:border-green-400'
                    } ${isSubmitted ? 'cursor-not-allowed opacity-60' : ''}`}>
                      <input
                        type="radio"
                        name={question.field}
                        checked={formData[question.field] === true}
                        onChange={() => !isSubmitted && handleCheckboxChange(question.field, true)}
                        disabled={isSubmitted}
                        className="hidden"
                      />
                      <LuCheckCircle className="w-5 h-5" />
                      <span className="font-medium">Ya / Sesuai</span>
                    </label>

                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      formData[question.field] === false
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'border-gray-300 hover:border-red-400'
                    } ${isSubmitted ? 'cursor-not-allowed opacity-60' : ''}`}>
                      <input
                        type="radio"
                        name={question.field}
                        checked={formData[question.field] === false}
                        onChange={() => !isSubmitted && handleCheckboxChange(question.field, false)}
                        disabled={isSubmitted}
                        className="hidden"
                      />
                      <LuXCircle className="w-5 h-5" />
                      <span className="font-medium">Tidak / Tidak Sesuai</span>
                    </label>
                  </div>

                  {/* Keterangan Field */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Keterangan (opsional)</label>
                    <textarea
                      value={formData[`${question.field}_keterangan`] || ''}
                      onChange={(e) => handleKeteranganChange(question.field, e.target.value)}
                      disabled={isSubmitted}
                      rows={2}
                      placeholder="Tambahkan catatan atau keterangan..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Recommendation */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Rekomendasi Akhir</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Rekomendasi <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.overall_recommendation === 'layak'
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'border-gray-300 hover:border-green-400'
                } ${isSubmitted ? 'cursor-not-allowed opacity-60' : ''}`}>
                  <input
                    type="radio"
                    name="overall_recommendation"
                    value="layak"
                    checked={formData.overall_recommendation === 'layak'}
                    onChange={(e) => !isSubmitted && setFormData(prev => ({ ...prev, overall_recommendation: e.target.value }))}
                    disabled={isSubmitted}
                    className="hidden"
                  />
                  <LuCheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Layak</span>
                </label>

                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.overall_recommendation === 'revisi'
                    ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                    : 'border-gray-300 hover:border-yellow-400'
                } ${isSubmitted ? 'cursor-not-allowed opacity-60' : ''}`}>
                  <input
                    type="radio"
                    name="overall_recommendation"
                    value="revisi"
                    checked={formData.overall_recommendation === 'revisi'}
                    onChange={(e) => !isSubmitted && setFormData(prev => ({ ...prev, overall_recommendation: e.target.value }))}
                    disabled={isSubmitted}
                    className="hidden"
                  />
                  <LuAlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Perlu Revisi</span>
                </label>

                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.overall_recommendation === 'tidak_layak'
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : 'border-gray-300 hover:border-red-400'
                } ${isSubmitted ? 'cursor-not-allowed opacity-60' : ''}`}>
                  <input
                    type="radio"
                    name="overall_recommendation"
                    value="tidak_layak"
                    checked={formData.overall_recommendation === 'tidak_layak'}
                    onChange={(e) => !isSubmitted && setFormData(prev => ({ ...prev, overall_recommendation: e.target.value }))}
                    disabled={isSubmitted}
                    className="hidden"
                  />
                  <LuXCircle className="w-5 h-5" />
                  <span className="font-semibold">Tidak Layak</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Rekomendasi
              </label>
              <textarea
                value={formData.overall_notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, overall_notes: e.target.value }))}
                disabled={isSubmitted}
                rows={4}
                placeholder="Tambahkan catatan atau rekomendasi tambahan..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isSubmitted && (
          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <LuSave className="w-5 h-5" />
              <span>Simpan Draft</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              <LuSend className="w-5 h-5" />
              <span>Submit Questionnaire</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimVerifikasiQuestionnairePage;
