import React, { useState, useEffect } from 'react';
import { LuCircleCheck, LuCircleX, LuSave, LuInfo } from 'react-icons/lu';
import api from '../api';
import Swal from 'sweetalert2';

/**
 * Component untuk Form Quisioner Verifikasi 13 Item (Berita Acara)
 * Digunakan oleh Dinas dan Tim Verifikasi Kecamatan
 */
const BankeuQuestionnaireForm = ({ 
  proposalId, 
  verifierType, 
  verifierId,
  readOnly = false,
  onSaveSuccess 
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    item_1: 'ok',
    item_2: 'ok',
    item_3: 'ok',
    item_4: 'ok',
    item_5: 'ok',
    item_6: 'ok',
    item_7: 'ok',
    item_8: 'ok',
    item_9: 'ok',
    item_10: 'ok',
    item_11: 'ok',
    item_12: 'ok',
    item_13: 'ok',
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

      const response = await api.get(`/bankeu/questionnaire/${proposalId}`, { params });
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setFormData({
          item_1: data.item_1 || 'ok',
          item_2: data.item_2 || 'ok',
          item_3: data.item_3 || 'ok',
          item_4: data.item_4 || 'ok',
          item_5: data.item_5 || 'ok',
          item_6: data.item_6 || 'ok',
          item_7: data.item_7 || 'ok',
          item_8: data.item_8 || 'ok',
          item_9: data.item_9 || 'ok',
          item_10: data.item_10 || 'ok',
          item_11: data.item_11 || 'ok',
          item_12: data.item_12 || 'ok',
          item_13: data.item_13 || 'ok',
          catatan: data.catatan || ''
        });
      }
    } catch (error) {
      console.error('Error fetching questionnaire:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (itemKey, value) => {
    setFormData(prev => ({ ...prev, [itemKey]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        verifier_type: verifierType,
        verifier_id: verifierId,
        ...formData
      };

      const response = await api.post(`/bankeu/questionnaire/${proposalId}`, payload);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Quisioner berhasil disimpan',
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat quisioner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <LuCircleCheck className="w-5 h-5 text-green-600" />
          Quisioner Verifikasi Kelengkapan Dokumen
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Checklist 13 item untuk Berita Acara Verifikasi
        </p>
      </div>

      <div className="p-6 space-y-4">
        {checklistItems.map((item, index) => (
          <div key={item.key} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium mb-1">{item.label}</p>
                    {item.ket && (
                      <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-md">
                        {item.ket}
                      </span>
                    )}
                  </div>
                  
                  {!readOnly && (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name={item.key}
                          value="ok"
                          checked={formData[item.key] === 'ok'}
                          onChange={() => handleItemChange(item.key, 'ok')}
                          className="w-4 h-4 text-green-600 focus:ring-green-500"
                        />
                        <span className="flex items-center gap-1 text-sm font-medium text-green-700 group-hover:text-green-800">
                          <LuCircleCheck className="w-4 h-4" />
                          Lengkap
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name={item.key}
                          value="not_ok"
                          checked={formData[item.key] === 'not_ok'}
                          onChange={() => handleItemChange(item.key, 'not_ok')}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                        <span className="flex items-center gap-1 text-sm font-medium text-red-700 group-hover:text-red-800">
                          <LuCircleX className="w-4 h-4" />
                          Tidak Lengkap
                        </span>
                      </label>
                    </div>
                  )}

                  {readOnly && (
                    <div className="flex-shrink-0">
                      {formData[item.key] === 'ok' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <LuCircleCheck className="w-4 h-4" />
                          Lengkap
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          <LuCircleX className="w-4 h-4" />
                          Tidak Lengkap
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Info */}
        {!readOnly && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <LuInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Quisioner ini akan digunakan untuk mengisi Berita Acara Verifikasi. 
              Pastikan semua item sudah diverifikasi sebelum menyimpan.
            </p>
          </div>
        )}
      </div>

      {/* Save Button */}
      {!readOnly && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LuSave className="w-5 h-5" />
            {saving ? 'Menyimpan...' : 'Simpan Quisioner'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BankeuQuestionnaireForm;
