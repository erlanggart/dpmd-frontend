import React, { useState, useEffect } from 'react';
import { LuCircleCheck, LuSave, LuInfo, LuTriangleAlert } from 'react-icons/lu';
import api from '../api';
import Swal from 'sweetalert2';

/**
 * Component untuk Form Quisioner Verifikasi Berita Acara
 * Digunakan oleh Dinas dan Tim Verifikasi Kecamatan
 * 
 * Checklist berbeda berdasarkan jenis kegiatan:
 * - Infrastruktur: 12 item (item 5,7,8,9 opsional)
 * - Non-Infrastruktur: 5 item
 * 
 * Logika:
 * - Semua item wajib harus dicentang (tersedia) untuk bisa simpan
 * - Item opsional boleh tidak dicentang
 * - Jika ada item wajib yang tidak tersedia, proposal harus dikembalikan ke desa
 */
const BankeuQuestionnaireForm = ({ 
  proposalId, 
  verifierType, 
  verifierId,
  jenisKegiatan = 'infrastruktur',
  readOnly = false,
  onSaveSuccess,
  onLoad
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    item_1: false,
    item_2: false,
    item_3: false,
    item_4: false,
    item_5: false,
    item_6: false,
    item_7: false,
    item_8: false,
    item_9: false,
    item_10: false,
    item_11: false,
    item_12: false,
    catatan: ''
  });

  const isInfrastruktur = jenisKegiatan === 'infrastruktur';

  // Checklist items berbeda berdasarkan jenis kegiatan
  const checklistItems = isInfrastruktur ? [
    { key: 'item_1', label: 'Surat Pengantar dari Kepala Desa' },
    { key: 'item_2', label: 'Surat Permohonan Bantuan Keuangan' },
    { key: 'item_3', label: 'Proposal (Latar Belakang, Maksud dan Tujuan, Bentuk Kegiatan, Jadwal Pelaksanaan)' },
    { key: 'item_4', label: 'RPA dan RAB' },
    { key: 'item_5', label: 'Surat Pernyataan Kepala Desa (lokasi tidak dalam sengketa)', optional: true },
    { key: 'item_6', label: 'Bukti kepemilikan Aset Desa (untuk Rehab Kantor Desa)' },
    { key: 'item_7', label: 'Dokumen kesediaan peralihan hak hibah atas tanah', optional: true },
    { key: 'item_8', label: 'Dokumen pernyataan kesanggupan (tidak minta ganti rugi)', optional: true },
    { key: 'item_9', label: 'Persetujuan pemanfaatan barang milik Daerah/Negara', optional: true },
    { key: 'item_10', label: 'Foto lokasi rencana pelaksanaan kegiatan' },
    { key: 'item_11', label: 'Peta lokasi rencana kegiatan' },
    { key: 'item_12', label: 'Berita Acara Musyawarah Desa' },
  ] : [
    { key: 'item_1', label: 'Surat Pengantar dari Kepala Desa' },
    { key: 'item_2', label: 'Surat Permohonan Bantuan Keuangan Khusus Akselerasi Pembangunan Perdesaan' },
    { key: 'item_3', label: 'Proposal Bantuan Keuangan (Latar Belakang, Maksud dan Tujuan, Bentuk Kegiatan, Jadwal Pelaksanaan)' },
    { key: 'item_4', label: 'Rencana Anggaran Biaya' },
    { key: 'item_5', label: 'Tidak Duplikasi Anggaran' },
  ];

  // Items yang wajib (non-optional)
  const requiredItems = checklistItems.filter(item => !item.optional);
  const optionalItemKeys = checklistItems.filter(item => item.optional).map(item => item.key);

  useEffect(() => {
    fetchQuestionnaire();
  }, [proposalId, verifierType, verifierId]);

  const fetchQuestionnaire = async () => {
    try {
      setLoading(true);
      const params = { verifier_type: verifierType };
      if (verifierId) params.verifier_id = verifierId;
      params.proposal_id = proposalId;

      const response = await api.get(`/bankeu/questionnaire/${proposalId}`, { params });
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        // Map qX (boolean/tinyint) to item_X (boolean) - hanya untuk items yang ada di checklist
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

  // Check if all required (non-optional) items are checked
  const allItemsChecked = () => {
    return requiredItems.every(item => formData[item.key] === true);
  };

  // Get unchecked required items
  const getUncheckedItems = () => {
    return requiredItems.filter(item => formData[item.key] !== true);
  };

  const handleSave = async () => {
    // Validate all required items must be checked
    if (!allItemsChecked()) {
      const unchecked = getUncheckedItems();
      Swal.fire({
        icon: 'warning',
        title: 'Tidak Dapat Menyimpan',
        html: `
          <div class="text-left">
            <p class="mb-3">Semua item wajib harus dicentang (tersedia) untuk menyimpan quisioner.</p>
            <p class="font-bold mb-2">Item wajib yang belum dicentang:</p>
            <ul class="list-disc pl-5 text-sm text-gray-600">
              ${unchecked.map(item => `<li>${item.label}</li>`).join('')}
            </ul>
            <p class="mt-4 text-sm text-red-600">
              <strong>Jika dokumen tidak tersedia, silakan kembalikan proposal ke desa untuk dilengkapi.</strong>
            </p>
          </div>
        `,
        confirmButtonText: 'Mengerti',
        confirmButtonColor: '#3B82F6'
      });
      return;
    }

    try {
      setSaving(true);

      // Build payload - map item_X back to qX
      const payload = {
        verifier_type: verifierType,
        verifier_id: verifierId,
        overall_notes: formData.catatan
      };
      
      checklistItems.forEach((item, idx) => {
        payload[`q${idx + 1}`] = formData[item.key] || false;
      });

      const response = await api.post(`/bankeu/questionnaire/${proposalId}`, payload);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Quisioner berhasil disimpan. Semua dokumen wajib terverifikasi lengkap.',
          timer: 2000,
          showConfirmButton: false
        });
        
        if (onSaveSuccess) onSaveSuccess();
      }
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: error.response?.data?.message || 'Terjadi kesalahan saat menyimpan quisioner'
      });
    } finally {
      setSaving(false);
    }
  };

  // Count checked required items
  const checkedRequiredCount = requiredItems.filter(item => formData[item.key] === true).length;
  const totalRequiredItems = requiredItems.length;
  const checkedCount = checklistItems.filter(item => formData[item.key] === true).length;
  const totalItems = checklistItems.length;
  const isComplete = checkedRequiredCount === totalRequiredItems;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat quisioner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <LuCircleCheck className="w-5 h-5 text-violet-600" />
              Quisioner Verifikasi Kelengkapan Dokumen
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Checklist {totalItems} item untuk Berita Acara Verifikasi
              {isInfrastruktur && <span className="ml-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Infrastruktur</span>}
              {!isInfrastruktur && <span className="ml-2 inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Non-Infrastruktur</span>}
            </p>
          </div>
          
          {/* Progress indicator */}
          <div className={`px-4 py-2 rounded-full text-sm font-bold ${
            isComplete 
              ? 'bg-green-100 text-green-700' 
              : 'bg-amber-100 text-amber-700'
          }`}>
            {checkedCount}/{totalItems} Terverifikasi
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {checklistItems.map((item, index) => (
          <div 
            key={item.key} 
            className={`border rounded-lg p-4 transition-all duration-200 ${
              formData[item.key] 
                ? 'border-green-300 bg-green-50' 
                : 'border-gray-200 hover:border-violet-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                formData[item.key]
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {formData[item.key] ? '✓' : index + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className={`font-medium mb-1 ${
                      formData[item.key] ? 'text-green-800' : 'text-gray-800'
                    }`}>
                      {item.label}
                    </p>
                    {item.optional && (
                      <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-md font-medium">
                        Opsional
                      </span>
                    )}
                  </div>
                  
                  {!readOnly && (
                    <div className="flex-shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData[item.key]}
                          onChange={() => handleItemChange(item.key)}
                          className="w-5 h-5 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                        />
                        <span className={`text-sm font-semibold ${
                          formData[item.key] 
                            ? 'text-green-700' 
                            : 'text-gray-500'
                        }`}>
                          Tersedia
                        </span>
                      </label>
                    </div>
                  )}

                  {readOnly && (
                    <div className="flex-shrink-0">
                      {formData[item.key] ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <LuCircleCheck className="w-4 h-4" />
                          Tersedia
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          <LuTriangleAlert className="w-4 h-4" />
                          Tidak Tersedia
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Catatan */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Catatan Tambahan
          </label>
          <textarea
            value={formData.catatan}
            onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
            disabled={readOnly}
            rows={4}
            placeholder="Masukkan catatan tambahan jika diperlukan..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Warning jika belum lengkap */}
        {!readOnly && !isComplete && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <LuTriangleAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">Dokumen Wajib Belum Lengkap</p>
              <p>
                Masih ada {totalRequiredItems - checkedRequiredCount} item wajib yang belum dicentang. 
                Semua dokumen wajib harus tersedia untuk menyimpan quisioner. 
                Jika dokumen tidak tersedia, kembalikan proposal ke desa untuk dilengkapi.
              </p>
            </div>
          </div>
        )}

        {/* Info jika sudah lengkap */}
        {!readOnly && isComplete && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <LuCircleCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-bold mb-1">Semua Dokumen Wajib Terverifikasi</p>
              <p>
                Semua {totalRequiredItems} item wajib sudah dicentang. Anda dapat menyimpan quisioner ini.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      {!readOnly && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSave}
            disabled={saving || !isComplete}
            className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
              isComplete
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <LuSave className="w-5 h-5" />
            {saving ? 'Menyimpan...' : isComplete ? 'Simpan Quisioner' : 'Lengkapi Semua Item'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BankeuQuestionnaireForm;
