import React, { useState, useEffect } from 'react';
import { LuCircleCheck, LuSave, LuInfo, LuTriangleAlert } from 'react-icons/lu';
import api from '../api';
import Swal from 'sweetalert2';

/**
 * Component untuk Form Quisioner Verifikasi 13 Item (Berita Acara)
 * Digunakan oleh Dinas dan Tim Verifikasi Kecamatan
 * 
 * Logika baru:
 * - Semua item harus dicentang (tersedia) untuk bisa simpan
 * - Jika ada item yang tidak tersedia, proposal harus dikembalikan ke desa
 */
const BankeuQuestionnaireForm = ({ 
  proposalId, 
  verifierType, 
  verifierId,
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
    item_13: false,
    catatan: ''
  });

  // 13 Item Checklist sesuai Berita Acara
  const checklistItems = [
    { key: 'item_1', label: 'Surat Pengantar dari Kepala Desa' },
    { key: 'item_2', label: 'Surat Permohonan Bantuan Keuangan Khusus Akselerasi Pembangunan Perdesaan' },
    { key: 'item_3', label: 'Proposal Bantuan Keuangan (Latar Belakang, Maksud dan Tujuan, Bentuk Kegiatan, Rencana Pelaksanaan)' },
    { key: 'item_4', label: 'Rencana Penggunaan Bantuan Keuangan dan RAB' },
    { key: 'item_5', label: 'Foto lokasi rencana pelaksanaan kegiatan (0%)', ket: 'Infrastruktur' },
    { key: 'item_6', label: 'Peta dan titik lokasi rencana kegiatan', ket: 'Infrastruktur' },
    { key: 'item_7', label: 'Berita Acara Hasil Musyawarah Desa' },
    { key: 'item_8', label: 'SK Kepala Desa tentang Penetapan Tim Pelaksana Kegiatan (TPK)' },
    { key: 'item_9', label: 'Ketersediaan lahan dan kepastian status lahan', ket: 'Infrastruktur' },
    { key: 'item_10', label: 'Tidak Duplikasi Anggaran' },
    { key: 'item_11', label: 'Kesesuaian antara lokasi dan usulan' },
    { key: 'item_12', label: 'Kesesuaian RAB dengan standar harga yang telah ditetapkan di desa' },
    { key: 'item_13', label: 'Kesesuaian dengan standar teknis konstruksi', ket: 'Infrastruktur' }
  ];

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
        // Map qX (boolean/tinyint) to item_X (boolean)
        setFormData({
          item_1: data.q1 === true || data.q1 === 1,
          item_2: data.q2 === true || data.q2 === 1,
          item_3: data.q3 === true || data.q3 === 1,
          item_4: data.q4 === true || data.q4 === 1,
          item_5: data.q5 === true || data.q5 === 1,
          item_6: data.q6 === true || data.q6 === 1,
          item_7: data.q7 === true || data.q7 === 1,
          item_8: data.q8 === true || data.q8 === 1,
          item_9: data.q9 === true || data.q9 === 1,
          item_10: data.q10 === true || data.q10 === 1,
          item_11: data.q11 === true || data.q11 === 1,
          item_12: data.q12 === true || data.q12 === 1,
          item_13: data.q13 === true || data.q13 === 1,
          catatan: data.overall_notes || ''
        });
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

  // Check if all items are checked
  const allItemsChecked = () => {
    return checklistItems.every(item => formData[item.key] === true);
  };

  // Get unchecked items
  const getUncheckedItems = () => {
    return checklistItems.filter(item => formData[item.key] !== true);
  };

  const handleSave = async () => {
    // Validate all items must be checked
    if (!allItemsChecked()) {
      const unchecked = getUncheckedItems();
      Swal.fire({
        icon: 'warning',
        title: 'Tidak Dapat Menyimpan',
        html: `
          <div class="text-left">
            <p class="mb-3">Semua item harus dicentang (tersedia) untuk menyimpan quisioner.</p>
            <p class="font-bold mb-2">Item yang belum dicentang:</p>
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

      // All items are true (checked)
      const payload = {
        verifier_type: verifierType,
        verifier_id: verifierId,
        q1: true,
        q2: true,
        q3: true,
        q4: true,
        q5: true,
        q6: true,
        q7: true,
        q8: true,
        q9: true,
        q10: true,
        q11: true,
        q12: true,
        q13: true,
        overall_notes: formData.catatan
      };

      const response = await api.post(`/bankeu/questionnaire/${proposalId}`, payload);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Quisioner berhasil disimpan. Semua dokumen terverifikasi lengkap.',
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

  // Count checked items
  const checkedCount = checklistItems.filter(item => formData[item.key] === true).length;
  const totalItems = checklistItems.length;
  const isComplete = checkedCount === totalItems;

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
              Checklist 13 item untuk Berita Acara Verifikasi
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
                    {item.ket && (
                      <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-md">
                        {item.ket}
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
              <p className="font-bold mb-1">Dokumen Belum Lengkap</p>
              <p>
                Masih ada {totalItems - checkedCount} item yang belum dicentang. 
                Semua dokumen harus tersedia untuk menyimpan quisioner. 
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
              <p className="font-bold mb-1">Semua Dokumen Terverifikasi</p>
              <p>
                Semua 13 item sudah dicentang. Anda dapat menyimpan quisioner ini.
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
