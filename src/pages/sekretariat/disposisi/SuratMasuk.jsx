import React, { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../../api';

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
      }
    } catch (error) {
      console.error('Error submitting surat masuk:', error);
      Swal.fire('Error', 'Gagal mengirim surat masuk. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surat-masuk-container">
      <div className="form-card">
        <div className="form-header">
          <h3>
            <i className="fas fa-envelope-open-text"></i>
            Input Surat Masuk
          </h3>
          <p>Lengkapi form di bawah untuk menginput surat masuk yang akan dikirim ke Kepala Dinas</p>
        </div>

        <form onSubmit={handleSubmit} className="surat-masuk-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="asal_surat">
                <i className="fas fa-building"></i>
                Asal Surat *
              </label>
              <input
                type="text"
                id="asal_surat"
                name="asal_surat"
                value={formData.asal_surat}
                onChange={handleInputChange}
                placeholder="Contoh: Kementerian Dalam Negeri"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="nomor_surat">
                <i className="fas fa-hashtag"></i>
                Nomor Surat *
              </label>
              <input
                type="text"
                id="nomor_surat"
                name="nomor_surat"
                value={formData.nomor_surat}
                onChange={handleInputChange}
                placeholder="Contoh: 001/KEMENDAGRI/2025"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="perihal_surat">
              <i className="fas fa-file-text"></i>
              Perihal Surat *
            </label>
            <input
              type="text"
              id="perihal_surat"
              name="perihal_surat"
              value={formData.perihal_surat}
              onChange={handleInputChange}
              placeholder="Contoh: Undangan Rapat Koordinasi Daerah"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tanggal_diterima">
              <i className="fas fa-calendar-alt"></i>
              Tanggal Surat Diterima *
            </label>
            <input
              type="date"
              id="tanggal_diterima"
              name="tanggal_diterima"
              value={formData.tanggal_diterima}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="ringkasan_isi">
              <i className="fas fa-align-left"></i>
              Ringkasan Isi Surat *
            </label>
            <textarea
              id="ringkasan_isi"
              name="ringkasan_isi"
              value={formData.ringkasan_isi}
              onChange={handleInputChange}
              placeholder="Tuliskan ringkasan singkat isi surat..."
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="file_surat">
              <i className="fas fa-upload"></i>
              Upload File Surat (PDF) *
            </label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                id="file_surat"
                name="file_surat"
                onChange={handleFileChange}
                accept=".pdf"
                required
              />
              <div className="file-upload-info">
                <small>
                  <i className="fas fa-info-circle"></i>
                  Format: PDF | Maksimal: 10MB
                </small>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
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
              }}
              disabled={loading}
            >
              <i className="fas fa-times"></i>
              Reset Form
            </button>
            
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Mengirim...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Kirim ke Kepala Dinas
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuratMasuk;