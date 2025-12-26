import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from "../../../../api";

const DashboardKepala = () => {
  const [suratMasuk, setSuratMasuk] = useState([]);
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [disposisiForm, setDisposisiForm] = useState({
    isi_disposisi: '',
    catatan_kepala: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSuratMasuk();
  }, []);

  const fetchSuratMasuk = async () => {
    setLoading(true);
    try {
      const response = await api.get('/disposisi/kepala-dinas/surat-masuk');
      setSuratMasuk(response.data.data || []);
    } catch (error) {
      console.error('Error fetching surat masuk:', error);
      Swal.fire('Error', 'Gagal memuat data surat masuk.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSurat = (surat) => {
    setSelectedSurat(surat);
    setDisposisiForm({
      isi_disposisi: surat.disposisi_kepala?.isi_disposisi || '',
      catatan_kepala: surat.disposisi_kepala?.catatan_kepala || ''
    });
  };

  const handleDisposisiChange = (e) => {
    const { name, value } = e.target;
    setDisposisiForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitDisposisi = async (e) => {
    e.preventDefault();
    
    if (!disposisiForm.isi_disposisi.trim()) {
      Swal.fire('Error', 'Isi disposisi tidak boleh kosong!', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(`/disposisi/kepala-dinas/${selectedSurat.id}/disposisi`, {
        isi_disposisi: disposisiForm.isi_disposisi,
        catatan_kepala: disposisiForm.catatan_kepala
      });

      if (response.data.success) {
        Swal.fire({
          title: 'Berhasil!',
          text: 'Disposisi berhasil dikirim ke Sekretaris Dinas.',
          icon: 'success',
          confirmButtonText: 'OK'
        });

        // Refresh data
        fetchSuratMasuk();
        setSelectedSurat(null);
        setDisposisiForm({
          isi_disposisi: '',
          catatan_kepala: ''
        });
      }
    } catch (error) {
      console.error('Error submitting disposisi:', error);
      Swal.fire('Error', 'Gagal mengirim disposisi. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSurat = (surat) => {
    if (surat.file_surat_url) {
      window.open(surat.file_surat_url, '_blank');
    } else {
      Swal.fire('Error', 'File surat tidak tersedia.', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending_kepala': { class: 'badge-warning', text: 'Menunggu Review' },
      'disposisi_kepala': { class: 'badge-info', text: 'Sudah Disposisi' },
      'pending_sekretaris': { class: 'badge-secondary', text: 'Di Sekretaris' },
      'disposisi_sekretaris': { class: 'badge-primary', text: 'Disposisi Selesai' },
      'selesai': { class: 'badge-success', text: 'Selesai' }
    };

    const config = statusConfig[status] || { class: 'badge-secondary', text: 'Unknown' };
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>Memuat data surat masuk...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-kepala-container">
      <div className="dashboard-header">
        <h3>
          <i className="fas fa-user-tie"></i>
          Dashboard Kepala Dinas
        </h3>
        <p>Review dan beri disposisi pada surat masuk yang diterima</p>
      </div>

      {!selectedSurat ? (
        <div className="surat-list-container">
          {suratMasuk.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-inbox"></i>
              <h4>Belum Ada Surat Masuk</h4>
              <p>Surat masuk yang perlu direview akan muncul di sini</p>
            </div>
          ) : (
            <div className="surat-grid">
              {suratMasuk.map((surat) => (
                <div key={surat.id} className="surat-card">
                  <div className="surat-card-header">
                    <div className="surat-info">
                      <h4>{surat.perihal_surat}</h4>
                      <p className="surat-asal">Dari: {surat.asal_surat}</p>
                    </div>
                    {getStatusBadge(surat.status)}
                  </div>

                  <div className="surat-details">
                    <div className="detail-item">
                      <i className="fas fa-hashtag"></i>
                      <span>No: {surat.nomor_surat}</span>
                    </div>
                    <div className="detail-item">
                      <i className="fas fa-calendar"></i>
                      <span>Diterima: {new Date(surat.tanggal_diterima).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="surat-ringkasan">
                    <p>{surat.ringkasan_isi}</p>
                  </div>

                  <div className="surat-actions">
                    <button
                      className="btn-outline"
                      onClick={() => handleDownloadSurat(surat)}
                    >
                      <i className="fas fa-download"></i>
                      Download
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => handleViewSurat(surat)}
                    >
                      <i className="fas fa-eye"></i>
                      Review & Disposisi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="disposisi-form-container">
          <div className="form-header">
            <button
              className="btn-back"
              onClick={() => setSelectedSurat(null)}
            >
              <i className="fas fa-arrow-left"></i>
              Kembali ke Daftar
            </button>
            <h4>Form Disposisi Kepala Dinas</h4>
          </div>

          <div className="surat-preview">
            <div className="preview-header">
              <h4>{selectedSurat.perihal_surat}</h4>
              {getStatusBadge(selectedSurat.status)}
            </div>
            <div className="preview-details">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Asal Surat:</label>
                  <span>{selectedSurat.asal_surat}</span>
                </div>
                <div className="detail-item">
                  <label>Nomor Surat:</label>
                  <span>{selectedSurat.nomor_surat}</span>
                </div>
                <div className="detail-item">
                  <label>Tanggal Diterima:</label>
                  <span>{new Date(selectedSurat.tanggal_diterima).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="detail-item full-width">
                  <label>Ringkasan Isi:</label>
                  <span>{selectedSurat.ringkasan_isi}</span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitDisposisi} className="disposisi-form">
            <div className="form-group">
              <label htmlFor="isi_disposisi">
                <i className="fas fa-clipboard-list"></i>
                Isi Disposisi untuk Sekretaris Dinas *
              </label>
              <textarea
                id="isi_disposisi"
                name="isi_disposisi"
                value={disposisiForm.isi_disposisi}
                onChange={handleDisposisiChange}
                placeholder="Tuliskan disposisi yang akan diberikan kepada Sekretaris Dinas..."
                rows="4"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="catatan_kepala">
                <i className="fas fa-sticky-note"></i>
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                id="catatan_kepala"
                name="catatan_kepala"
                value={disposisiForm.catatan_kepala}
                onChange={handleDisposisiChange}
                placeholder="Catatan atau instruksi tambahan..."
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSelectedSurat(null);
                  setDisposisiForm({
                    isi_disposisi: '',
                    catatan_kepala: ''
                  });
                }}
                disabled={submitting}
              >
                <i className="fas fa-times"></i>
                Batal
              </button>
              
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Mengirim...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    Kirim ke Sekretaris
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DashboardKepala;
