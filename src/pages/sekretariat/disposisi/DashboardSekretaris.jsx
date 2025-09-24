import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../../../api';

const DashboardSekretaris = () => {
  const [suratDisposisi, setSuratDisposisi] = useState([]);
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [bidangList, setBidangList] = useState([]);
  const [disposisiForm, setDisposisiForm] = useState({
    isi_disposisi_sekretaris: '',
    catatan_sekretaris: '',
    bidang_tujuan: [] // Array untuk multiple bidang
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSuratDisposisi();
    fetchBidangList();
  }, []);

  const fetchSuratDisposisi = async () => {
    setLoading(true);
    try {
      const response = await api.get('/disposisi/sekretaris/surat-disposisi');
      setSuratDisposisi(response.data.data || []);
    } catch (error) {
      console.error('Error fetching surat disposisi:', error);
      Swal.fire('Error', 'Gagal memuat data surat disposisi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBidangList = async () => {
    try {
      const response = await api.get('/bidangs');
      setBidangList(response.data.data || []);
    } catch (error) {
      console.error('Error fetching bidang list:', error);
    }
  };

  const handleViewSurat = (surat) => {
    setSelectedSurat(surat);
    setDisposisiForm({
      isi_disposisi_sekretaris: surat.disposisi_sekretaris?.isi_disposisi_sekretaris || '',
      catatan_sekretaris: surat.disposisi_sekretaris?.catatan_sekretaris || '',
      bidang_tujuan: surat.disposisi_sekretaris?.bidang_tujuan || []
    });
  };

  const handleDisposisiChange = (e) => {
    const { name, value } = e.target;
    setDisposisiForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBidangChange = (bidangId) => {
    setDisposisiForm(prev => ({
      ...prev,
      bidang_tujuan: prev.bidang_tujuan.includes(bidangId)
        ? prev.bidang_tujuan.filter(id => id !== bidangId)
        : [...prev.bidang_tujuan, bidangId]
    }));
  };

  const handleSubmitDisposisi = async (e) => {
    e.preventDefault();
    
    if (!disposisiForm.isi_disposisi_sekretaris.trim()) {
      Swal.fire('Error', 'Isi disposisi tidak boleh kosong!', 'error');
      return;
    }

    if (disposisiForm.bidang_tujuan.length === 0) {
      Swal.fire('Error', 'Pilih minimal satu bidang tujuan!', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(`/disposisi/sekretaris/${selectedSurat.id}/disposisi`, {
        isi_disposisi_sekretaris: disposisiForm.isi_disposisi_sekretaris,
        catatan_sekretaris: disposisiForm.catatan_sekretaris,
        bidang_tujuan: disposisiForm.bidang_tujuan
      });

      if (response.data.success) {
        Swal.fire({
          title: 'Berhasil!',
          text: `Disposisi berhasil dikirim ke ${disposisiForm.bidang_tujuan.length} bidang.`,
          icon: 'success',
          confirmButtonText: 'OK'
        });

        // Refresh data
        fetchSuratDisposisi();
        setSelectedSurat(null);
        setDisposisiForm({
          isi_disposisi_sekretaris: '',
          catatan_sekretaris: '',
          bidang_tujuan: []
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
      'pending_kepala': { class: 'badge-warning', text: 'Menunggu Kepala' },
      'disposisi_kepala': { class: 'badge-info', text: 'Dari Kepala Dinas' },
      'pending_sekretaris': { class: 'badge-warning', text: 'Menunggu Review' },
      'disposisi_sekretaris': { class: 'badge-primary', text: 'Sudah Disposisi' },
      'selesai': { class: 'badge-success', text: 'Selesai' }
    };

    const config = statusConfig[status] || { class: 'badge-secondary', text: 'Unknown' };
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  const getBidangName = (bidangId) => {
    const bidang = bidangList.find(b => b.id === bidangId);
    return bidang ? bidang.nama_bidang : `Bidang ${bidangId}`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>Memuat data surat disposisi...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-sekretaris-container">
      <div className="dashboard-header">
        <h3>
          <i className="fas fa-user-cog"></i>
          Dashboard Sekretaris Dinas
        </h3>
        <p>Review disposisi dari Kepala Dinas dan teruskan ke bidang terkait</p>
      </div>

      {!selectedSurat ? (
        <div className="surat-list-container">
          {suratDisposisi.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-inbox"></i>
              <h4>Belum Ada Disposisi</h4>
              <p>Disposisi dari Kepala Dinas akan muncul di sini</p>
            </div>
          ) : (
            <div className="surat-grid">
              {suratDisposisi.map((surat) => (
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

                  {surat.disposisi_kepala && (
                    <div className="disposisi-kepala-preview">
                      <div className="disposisi-header">
                        <i className="fas fa-clipboard-list"></i>
                        <span>Disposisi Kepala Dinas:</span>
                      </div>
                      <p>{surat.disposisi_kepala.isi_disposisi}</p>
                      {surat.disposisi_kepala.catatan_kepala && (
                        <div className="catatan-kepala">
                          <small><strong>Catatan:</strong> {surat.disposisi_kepala.catatan_kepala}</small>
                        </div>
                      )}
                    </div>
                  )}

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
                      <i className="fas fa-share-square"></i>
                      Disposisi ke Bidang
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
            <h4>Form Disposisi Sekretaris Dinas</h4>
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

            {selectedSurat.disposisi_kepala && (
              <div className="disposisi-kepala-section">
                <h5>
                  <i className="fas fa-user-tie"></i>
                  Disposisi dari Kepala Dinas
                </h5>
                <div className="disposisi-content">
                  <p>{selectedSurat.disposisi_kepala.isi_disposisi}</p>
                  {selectedSurat.disposisi_kepala.catatan_kepala && (
                    <div className="catatan">
                      <strong>Catatan:</strong> {selectedSurat.disposisi_kepala.catatan_kepala}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitDisposisi} className="disposisi-form">
            <div className="form-group">
              <label htmlFor="isi_disposisi_sekretaris">
                <i className="fas fa-clipboard-list"></i>
                Isi Disposisi Sekretaris *
              </label>
              <textarea
                id="isi_disposisi_sekretaris"
                name="isi_disposisi_sekretaris"
                value={disposisiForm.isi_disposisi_sekretaris}
                onChange={handleDisposisiChange}
                placeholder="Tuliskan disposisi yang akan diberikan kepada bidang terkait..."
                rows="4"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="catatan_sekretaris">
                <i className="fas fa-sticky-note"></i>
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                id="catatan_sekretaris"
                name="catatan_sekretaris"
                value={disposisiForm.catatan_sekretaris}
                onChange={handleDisposisiChange}
                placeholder="Catatan atau instruksi tambahan..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>
                <i className="fas fa-building"></i>
                Pilih Bidang Tujuan *
              </label>
              <div className="bidang-checkbox-grid">
                {bidangList.map((bidang) => (
                  <div key={bidang.id} className="bidang-checkbox-item">
                    <input
                      type="checkbox"
                      id={`bidang-${bidang.id}`}
                      checked={disposisiForm.bidang_tujuan.includes(bidang.id)}
                      onChange={() => handleBidangChange(bidang.id)}
                    />
                    <label htmlFor={`bidang-${bidang.id}`}>
                      {bidang.nama_bidang}
                    </label>
                  </div>
                ))}
              </div>
              {disposisiForm.bidang_tujuan.length > 0 && (
                <div className="selected-bidang-info">
                  <small>
                    <i className="fas fa-check-circle"></i>
                    Dipilih: {disposisiForm.bidang_tujuan.length} bidang
                    ({disposisiForm.bidang_tujuan.map(id => getBidangName(id)).join(', ')})
                  </small>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSelectedSurat(null);
                  setDisposisiForm({
                    isi_disposisi_sekretaris: '',
                    catatan_sekretaris: '',
                    bidang_tujuan: []
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
                    Kirim ke {disposisiForm.bidang_tujuan.length} Bidang
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

export default DashboardSekretaris;