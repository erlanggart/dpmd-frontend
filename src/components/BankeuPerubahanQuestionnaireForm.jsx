import React, { useState, useEffect } from 'react';
import { LuCircleCheck, LuSave, LuTriangleAlert } from 'react-icons/lu';
import api from '../api';
import Swal from 'sweetalert2';

/**
 * Form Quisioner Verifikasi Kelengkapan Dokumen — Bankeu Perubahan
 *
 * Mirror dari BankeuQuestionnaireForm tapi pakai endpoint perubahan.
 *
 * Checklist mengikuti format resmi (lihat tabel Berita Acara):
 * - Item 1–4: dokumen umum (berlaku untuk semua jenis kegiatan)
 * - Item 5–9: khusus INFRASTRUKTUR (kolom KET = "Infrastruktur")
 *
 * Sehingga:
 * - pilihan_infrastruktur: 9 item (1–9)
 * - lainnya (wajib, pilihan_non_infrastruktur): 4 item (1–4)
 *
 * Endpoint:
 * - GET  /bankeu-perubahan/questionnaire/{proposalId}?verifier_type=...&verifier_id=...
 * - POST /bankeu-perubahan/questionnaire/{proposalId}  body: {verifier_type, verifier_id, q1..q12, overall_notes}
 */
const BankeuPerubahanQuestionnaireForm = ({
  proposalId,
  verifierType,
  verifierId,
  jenisKegiatan = 'wajib',
  readOnly = false,
  onSaveSuccess,
  onLoad,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    item_1: false, item_2: false, item_3: false, item_4: false,
    item_5: false, item_6: false, item_7: false, item_8: false,
    item_9: false, item_10: false, item_11: false, item_12: false,
    catatan: '',
  });

  const isInfrastruktur = jenisKegiatan === 'pilihan_infrastruktur';

  const PROPOSAL_SUBITEMS = ['Latar Belakang', 'Maksud dan Tujuan', 'Bentuk Kegiatan', 'Jadwal Pelaksanaan'];
  const LAHAN_SUBITEMS = [
    'surat pernyataan dari Kepala Desa yang menyatakan bahwa lokasi kegiatan tidak dalam keadaan bermasalah apabila merupakan Aset Desa;',
    'surat izin/persetujuan pemanfaatan dari perorangan selaku pemilik lahan, yang menyatakan tidak keberatan lahannya akan dipergunakan untuk pembangunan infrastuktur desa dan tanpa persyaratan apa pun, yang disetujui oleh keluarga;',
    'persetujuan pemanfaatan barang milik Daerah/Negara dalam hal lahan yang akan dipergunakan untuk pembangunan infrastuktur desa merupakan milik/dikuasai Pemerintah Daerah/Pemerintah Provinsi, Pemerintah Pusat;',
    'persetujuan pemanfaatan/penggunaan dari Badan Usaha/Badan Hukum selaku pemilik lahan, yang menyatakan tidak keberatan lahannya akan dipergunakan untuk pembangunan infrastuktur desa dan tanpa persyaratan apa pun.',
    'Fotokopi bukti kepemilikan Aset Desa sesuai ketentuan perundang-undangan, dalam hal usulan kegiatan yang diusulkan berupa rehabilitasi kantor desa.',
  ];

  const checklistItems = isInfrastruktur ? [
    { key: 'item_1', label: 'Surat Pengantar dari Kepala Desa' },
    { key: 'item_2', label: 'Surat Permohonan Bantuan Keuangan Khusus Akselerasi Pembangunan Perdesaan' },
    { key: 'item_3', label: 'Proposal Bantuan Keuangan Khusus Akselerasi Pembangunan Perdesaan', subItems: PROPOSAL_SUBITEMS },
    { key: 'item_4', label: 'Rencana Penggunaan Bantuan Keuangan dan RAB' },
    { key: 'item_5', label: 'Foto lokasi rencana pelaksanaan kegiatan (0%)', infra: true },
    { key: 'item_6', label: 'Peta desa dan titik lokasi rencana kegiatan', infra: true },
    { key: 'item_7', label: 'Berita Acara Hasil Musyawarah Desa', infra: true },
    { key: 'item_8', label: 'SK Kepala Desa tentang Penetapan Tim Pelaksana Kegiatan (TPK)', infra: true },
    {
      key: 'item_9',
      label: 'Ketersediaan lahan dan kepastian status lahan :',
      infra: true,
      subItems: LAHAN_SUBITEMS,
    },
  ] : [
    { key: 'item_1', label: 'Surat Pengantar dari Kepala Desa' },
    { key: 'item_2', label: 'Surat Permohonan Bantuan Keuangan Khusus Akselerasi Pembangunan Perdesaan' },
    { key: 'item_3', label: 'Proposal Bantuan Keuangan Khusus Akselerasi Pembangunan Perdesaan', subItems: PROPOSAL_SUBITEMS },
    { key: 'item_4', label: 'Rencana Penggunaan Bantuan Keuangan dan RAB' },
  ];

  const requiredItems = checklistItems.filter(i => !i.optional);

  useEffect(() => {
    fetchQuestionnaire();
  }, [proposalId, verifierType, verifierId]);

  const fetchQuestionnaire = async () => {
    try {
      setLoading(true);
      const params = { verifier_type: verifierType, proposal_id: proposalId };
      if (verifierId) params.verifier_id = verifierId;

      const response = await api.get(`/bankeu-perubahan/questionnaire/${proposalId}`, { params });
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        const newFormData = { catatan: data.overall_notes || '' };
        checklistItems.forEach((item, idx) => {
          const qKey = `q${idx + 1}`;
          newFormData[item.key] = data[qKey] === true || data[qKey] === 1;
        });
        setFormData(prev => ({ ...prev, ...newFormData }));
        if (onLoad) onLoad(!!data.id);
      } else {
        if (onLoad) onLoad(false);
      }
    } catch (error) {
      console.error('Error fetching questionnaire:', error);
      if (onLoad) onLoad(false);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (itemKey) => {
    setFormData(prev => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const allRequiredChecked = () => requiredItems.every(i => formData[i.key] === true);
  const getUncheckedRequired = () => requiredItems.filter(i => formData[i.key] !== true);

  const handleSave = async () => {
    // Quisioner mencatat status Ada/Tidak Ada — tidak harus semua dicentang.
    // Jika ada yang belum tersedia, cukup konfirmasi (verifikator boleh tetap menyimpan).
    if (!allRequiredChecked()) {
      const unchecked = getUncheckedRequired();
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Sebagian Dokumen Belum Tersedia',
        html: `
          <div class="text-left">
            <p class="mb-3">Item berikut belum ditandai tersedia:</p>
            <ul class="list-disc pl-5 text-sm text-gray-600">
              ${unchecked.map(i => `<li>${i.label}</li>`).join('')}
            </ul>
            <p class="mt-4 text-sm text-gray-600">
              Quisioner tetap dapat disimpan. Jika dokumen penting tidak tersedia,
              pertimbangkan mengembalikan proposal ke desa untuk dilengkapi.
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Tetap Simpan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#ea580c',
      });
      if (!result.isConfirmed) return;
    }
    try {
      setSaving(true);
      const payload = {
        verifier_type: verifierType,
        verifier_id: verifierId,
        overall_notes: formData.catatan,
      };
      checklistItems.forEach((item, idx) => {
        payload[`q${idx + 1}`] = formData[item.key] || false;
      });

      const response = await api.post(`/bankeu-perubahan/questionnaire/${proposalId}`, payload);
      if (response.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Quisioner berhasil disimpan',
          timer: 2000, showConfirmButton: false,
        });
        if (onSaveSuccess) onSaveSuccess();
      }
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: error.response?.data?.message || 'Terjadi kesalahan saat menyimpan',
      });
    } finally {
      setSaving(false);
    }
  };

  const checkedRequiredCount = requiredItems.filter(i => formData[i.key] === true).length;
  const totalRequiredItems = requiredItems.length;
  const checkedCount = checklistItems.filter(i => formData[i.key] === true).length;
  const totalItems = checklistItems.length;
  const isComplete = checkedRequiredCount === totalRequiredItems;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Memuat quisioner...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <LuCircleCheck className="w-5 h-5 text-orange-600" />
              Quisioner Verifikasi Kelengkapan Dokumen
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {totalItems} item · {isInfrastruktur ? 'Pilihan Infrastruktur' : 'Wajib / Non-Infrastruktur'}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {checkedCount}/{totalItems}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-2">
        {checklistItems.map((item, index) => (
          <div
            key={item.key}
            className={`border rounded-lg p-3 transition-all ${
              formData[item.key] ? 'border-green-300 bg-green-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                formData[item.key] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {formData[item.key] ? '✓' : index + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${formData[item.key] ? 'text-green-800' : 'text-gray-800'}`}>
                      {item.label}
                    </p>
                    {item.infra && (
                      <span className="inline-block px-2 py-0.5 mt-1 bg-orange-50 text-orange-600 text-xs rounded font-medium">
                        Infrastruktur
                      </span>
                    )}
                    {item.subItems && item.subItems.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {item.subItems.map((sub, si) => (
                          <li key={si} className="flex items-start gap-1.5 text-xs text-gray-600 leading-relaxed">
                            <span className="flex-shrink-0 mt-0.5 text-gray-400">&#9633;</span>
                            <span>{sub}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.note && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.note}</p>
                    )}
                  </div>
                  {!readOnly && (
                    <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={formData[item.key]}
                        onChange={() => handleItemChange(item.key)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className={`text-xs font-semibold ${formData[item.key] ? 'text-green-700' : 'text-gray-500'}`}>
                        Tersedia
                      </span>
                    </label>
                  )}
                  {readOnly && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                      formData[item.key] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {formData[item.key] ? <><LuCircleCheck className="w-3 h-3" /> Tersedia</> : <><LuTriangleAlert className="w-3 h-3" /> Tidak</>}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Catatan Verifikasi</label>
          <textarea
            value={formData.catatan}
            onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
            rows={3}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50"
            placeholder="Catatan tambahan (opsional)"
          />
        </div>
      </div>

      {!readOnly && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-600">
            {isComplete
              ? '✓ Semua item tercentang tersedia'
              : `${checkedCount}/${totalItems} item ditandai tersedia · sisanya akan tercatat "Tidak Ada"`}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-sm"
          >
            <LuSave className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Quisioner'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BankeuPerubahanQuestionnaireForm;
