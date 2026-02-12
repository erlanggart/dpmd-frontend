import React, { useState } from 'react';
import Swal from 'sweetalert2';
import api from "../../../../api";

const SuratMasuk = () => {
  const [formData, setFormData] = useState({
    asal_surat: '',
    nomor_surat: '',
    perihal_surat: '',
    tanggal_diterima: '',
    ringkasan_isi: '',
    file_surat: null
  });
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (PDF only)
      if (file.type !== 'application/pdf') {
        Swal.fire('Error', 'Hanya file PDF yang diperbolehkan!', 'error');
        e.target.value = '';
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire('Error', 'Ukuran file maksimal 10MB!', 'error');
        e.target.value = '';
        return;
      }

      setFormData(prev => ({
        ...prev,
        file_surat: file
      }));
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.asal_surat || !formData.nomor_surat || !formData.perihal_surat || 
        !formData.tanggal_diterima || !formData.ringkasan_isi || !formData.file_surat) {
      Swal.fire('Error', 'Mohon lengkapi semua field yang diperlukan!', 'error');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('asal_surat', formData.asal_surat);
      submitData.append('nomor_surat', formData.nomor_surat);
      submitData.append('perihal_surat', formData.perihal_surat);
      submitData.append('tanggal_diterima', formData.tanggal_diterima);
      submitData.append('ringkasan_isi', formData.ringkasan_isi);
      submitData.append('file_surat', formData.file_surat);

      const response = await api.post('/disposisi/surat-masuk', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        Swal.fire({
          title: 'Berhasil!',
          text: 'Surat masuk berhasil diinput dan dikirim ke Kepala Dinas.',
          icon: 'success',
          confirmButtonText: 'OK'
        });

        // Reset form
        setFormData({
          asal_surat: '',
          nomor_surat: '',
          perihal_surat: '',
          tanggal_diterima: '',
          ringkasan_isi: '',
          file_surat: null
        });
        
        // Reset file input
        document.getElementById('file_surat').value = '';
        setFileName('');
      }
    } catch (error) {
      console.error('Error submitting surat masuk:', error);
      
      // Tampilkan pesan error dari server jika ada
      const serverMessage = error.response?.data?.message;
      
      if (serverMessage && serverMessage.toLowerCase().includes('nomor surat')) {
        // Error spesifik: nomor surat sudah ada
        Swal.fire({
          icon: 'warning',
          title: 'Nomor Surat Sudah Ada',
          text: serverMessage,
          confirmButtonText: 'OK'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: serverMessage || 'Gagal mengirim surat masuk. Silakan coba lagi.',
          confirmButtonText: 'OK'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl mb-8 overflow-hidden border border-blue-100">
          <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 px-8 py-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-full p-3">
                <i className="fas fa-envelope-open-text text-3xl text-white"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Input Surat Masuk</h1>
                <p className="text-blue-100 mt-1">Lengkapi form untuk menginput surat masuk</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Asal Surat & Nomor Surat */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                    <i className="fas fa-building text-orange-500"></i>
                    <span>Asal Surat *</span>
                  </label>
                  <input
                    type="text"
                    name="asal_surat"
                    value={formData.asal_surat}
                    onChange={handleInputChange}
                    placeholder="Contoh: Kementerian Dalam Negeri"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none hover:border-blue-300"
                    required
                  />
                </div>

                <div className="group">
                  <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                    <i className="fas fa-hashtag text-orange-500"></i>
                    <span>Nomor Surat *</span>
                  </label>
                  <input
                    type="text"
                    name="nomor_surat"
                    value={formData.nomor_surat}
                    onChange={handleInputChange}
                    placeholder="Contoh: 001/KEMENDAGRI/2025"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none hover:border-blue-300"
                    required
                  />
                </div>
              </div>

              {/* Perihal Surat */}
              <div className="group">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                  <i className="fas fa-file-alt text-orange-500"></i>
                  <span>Perihal Surat *</span>
                </label>
                <input
                  type="text"
                  name="perihal_surat"
                  value={formData.perihal_surat}
                  onChange={handleInputChange}
                  placeholder="Contoh: Undangan Rapat Koordinasi Daerah"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none hover:border-blue-300"
                  required
                />
              </div>

              {/* Tanggal Diterima */}
              <div className="group">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                  <i className="fas fa-calendar-alt text-orange-500"></i>
                  <span>Tanggal Surat Diterima *</span>
                </label>
                <input
                  type="date"
                  name="tanggal_diterima"
                  value={formData.tanggal_diterima}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none hover:border-blue-300"
                  required
                />
              </div>

              {/* Ringkasan Isi */}
              <div className="group">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                  <i className="fas fa-align-left text-orange-500"></i>
                  <span>Ringkasan Isi Surat *</span>
                </label>
                <textarea
                  name="ringkasan_isi"
                  value={formData.ringkasan_isi}
                  onChange={handleInputChange}
                  placeholder="Tuliskan ringkasan singkat isi surat..."
                  rows="4"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none hover:border-blue-300 resize-vertical"
                  required
                />
              </div>

              {/* Upload File */}
              <div className="group">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                  <i className="fas fa-cloud-upload-alt text-orange-500"></i>
                  <span>Upload File Surat (PDF) *</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="file_surat"
                    name="file_surat"
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="hidden"
                    required
                  />
                  <label
                    htmlFor="file_surat"
                    className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 bg-gradient-to-br from-gray-50 to-gray-100"
                  >
                    <div className="text-center">
                      <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                      <p className="text-sm font-medium text-gray-700">
                        {fileName ? (
                          <span className="text-blue-600">
                            <i className="fas fa-file-pdf mr-2"></i>
                            {fileName}
                          </span>
                        ) : (
                          'Klik untuk upload file PDF'
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Format: PDF • Maksimal: 10MB
                      </p>
                    </div>
                  </label>
                </div>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2">
                  <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                  <p className="text-xs text-blue-700">
                    Pastikan file yang diupload dalam format PDF dengan ukuran maksimal 10MB
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-2 border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      asal_surat: '',
                      nomor_surat: '',
                      perihal_surat: '',
                      tanggal_diterima: '',
                      ringkasan_isi: '',
                      file_surat: null
                    });
                    document.getElementById('file_surat').value = '';
                    setFileName('');
                  }}
                  disabled={loading}
                  className="flex-1 px-6 py-3.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-red-400 hover:text-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
                >
                  <i className="fas fa-redo-alt"></i>
                  <span>Reset Form</span>
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      <span>Kirim ke Kepala Dinas</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            <i className="fas fa-shield-alt text-blue-600 mr-2"></i>
            Surat akan otomatis dikirim ke Kepala Dinas untuk disposisi lebih lanjut
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuratMasuk;
