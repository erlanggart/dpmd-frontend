import React, { useState, useEffect } from 'react';
import './disposisi.css';

const KepalaDinas = () => {
  const [daftarSurat, setDaftarSurat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [showDisposisiModal, setShowDisposisiModal] = useState(false);
  const [disposisiData, setDisposisiData] = useState({
    tujuan: '',
    instruksi: '',
    batas_waktu: '',
    catatan: ''
  });

  useEffect(() => {
    fetchDaftarSurat();
  }, []);

  const fetchDaftarSurat = async () => {
    try {
      setLoading(true);
      // API call untuk mendapatkan surat yang perlu direview oleh Kepala Dinas
      const response = await fetch('/api/disposisi/kepala-dinas/surat-masuk');
      const result = await response.json();
      
      if (result.success) {
        setDaftarSurat(result.data);
      }
    } catch (error) {
      console.error('Error fetching surat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisposisi = async () => {
    try {
      const response = await fetch(`/api/disposisi/kepala-dinas/${selectedSurat.id}/disposisi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(disposisiData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Disposisi berhasil dibuat');
        setShowDisposisiModal(false);
        setSelectedSurat(null);
        setDisposisiData({
          tujuan: '',
          instruksi: '',
          batas_waktu: '',
          catatan: ''
        });
        fetchDaftarSurat();
      }
    } catch (error) {
      console.error('Error creating disposisi:', error);
      alert('Gagal membuat disposisi');
    }
  };

  const formatTanggal = (tanggal) => {
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Memuat data surat...</p>
      </div>
    );
  }

  return (
    <div className="kepala-dinas-dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Kepala Dinas</h2>
        <p className="subtitle">Review dan Disposisi Surat Masuk</p>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📧</div>
          <div className="stat-info">
            <h3>{daftarSurat.filter(s => s.status === 'pending_review').length}</h3>
            <p>Menunggu Review</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{daftarSurat.filter(s => s.status === 'disposisi_created').length}</h3>
            <p>Sudah Didisposisi</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-info">
            <h3>{daftarSurat.filter(s => s.urgent === true).length}</h3>
            <p>Surat Urgent</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{daftarSurat.length}</h3>
            <p>Total Surat</p>
          </div>
        </div>
      </div>

      <div className="surat-table-container">
        <div className="table-header">
          <h3>Daftar Surat Masuk</h3>
          <div className="filter-buttons">
            <button className="filter-btn active">Semua</button>
            <button className="filter-btn">Menunggu Review</button>
            <button className="filter-btn">Urgent</button>
            <button className="filter-btn">Sudah Didisposisi</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="surat-table">
            <thead>
              <tr>
                <th>No. Surat</th>
                <th>Pengirim</th>
                <th>Perihal</th>
                <th>Tanggal</th>
                <th>Prioritas</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {daftarSurat.map((surat) => (
                <tr key={surat.id} className={surat.urgent ? 'urgent-row' : ''}>
                  <td>{surat.nomor_surat}</td>
                  <td>{surat.pengirim}</td>
                  <td>{surat.perihal}</td>
                  <td>{formatTanggal(surat.tanggal_masuk)}</td>
                  <td>
                    <span className={`priority-badge ${surat.urgent ? 'urgent' : 'normal'}`}>
                      {surat.urgent ? 'Urgent' : 'Normal'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${surat.status}`}>
                      {surat.status === 'pending_review' ? 'Menunggu Review' : 
                       surat.status === 'disposisi_created' ? 'Sudah Didisposisi' : surat.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-detail"
                        onClick={() => setSelectedSurat(surat)}
                        title="Lihat Detail"
                      >
                        👁️
                      </button>
                      {surat.status === 'pending_review' && (
                        <button 
                          className="btn-disposisi"
                          onClick={() => {
                            setSelectedSurat(surat);
                            setShowDisposisiModal(true);
                          }}
                          title="Buat Disposisi"
                        >
                          📝
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Surat */}
      {selectedSurat && !showDisposisiModal && (
        <div className="modal-overlay" onClick={() => setSelectedSurat(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detail Surat</h3>
              <button className="close-btn" onClick={() => setSelectedSurat(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Nomor Surat:</label>
                  <span>{selectedSurat.nomor_surat}</span>
                </div>
                <div className="detail-item">
                  <label>Pengirim:</label>
                  <span>{selectedSurat.pengirim}</span>
                </div>
                <div className="detail-item">
                  <label>Perihal:</label>
                  <span>{selectedSurat.perihal}</span>
                </div>
                <div className="detail-item">
                  <label>Tanggal Masuk:</label>  
                  <span>{formatTanggal(selectedSurat.tanggal_masuk)}</span>
                </div>
                <div className="detail-item">
                  <label>Prioritas:</label>
                  <span className={`priority-badge ${selectedSurat.urgent ? 'urgent' : 'normal'}`}>
                    {selectedSurat.urgent ? 'Urgent' : 'Normal'}
                  </span>
                </div>
                <div className="detail-item full-width">
                  <label>Isi Surat:</label>
                  <div className="isi-surat">{selectedSurat.isi_surat}</div>
                </div>
                {selectedSurat.file_surat && (
                  <div className="detail-item full-width">
                    <label>File Surat:</label>
                    <a href={selectedSurat.file_surat} target="_blank" rel="noopener noreferrer" className="file-link">
                      📄 Lihat File Surat
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {selectedSurat.status === 'pending_review' && (
                <button 
                  className="btn-primary"
                  onClick={() => setShowDisposisiModal(true)}
                >
                  Buat Disposisi
                </button>
              )}
              <button className="btn-secondary" onClick={() => setSelectedSurat(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Disposisi */}
      {showDisposisiModal && selectedSurat && (
        <div className="modal-overlay" onClick={() => setShowDisposisiModal(false)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Buat Disposisi - {selectedSurat.nomor_surat}</h3>
              <button className="close-btn" onClick={() => setShowDisposisiModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tujuan Disposisi:</label>
                <select 
                  value={disposisiData.tujuan}
                  onChange={(e) => setDisposisiData({...disposisiData, tujuan: e.target.value})}
                  className="form-control"
                >
                  <option value="">Pilih Tujuan</option>
                  <option value="sekretaris_dinas">Sekretaris Dinas</option>
                  <option value="kepala_bidang_pemerintahan">Kepala Bidang Pemerintahan</option>
                  <option value="kepala_bidang_kesra">Kepala Bidang Kesejahteraan Rakyat</option>
                  <option value="kepala_bidang_ekonomi">Kepala Bidang Ekonomi</option>
                  <option value="kepala_bidang_fisik">Kepala Bidang Fisik dan Prasarana</option>
                </select>
              </div>

              <div className="form-group">
                <label>Instruksi:</label>
                <textarea 
                  value={disposisiData.instruksi}
                  onChange={(e) => setDisposisiData({...disposisiData, instruksi: e.target.value})}
                  className="form-control"
                  rows="4"
                  placeholder="Berikan instruksi untuk surat ini..."
                />
              </div>

              <div className="form-group">
                <label>Batas Waktu:</label>
                <input 
                  type="date"
                  value={disposisiData.batas_waktu}
                  onChange={(e) => setDisposisiData({...disposisiData, batas_waktu: e.target.value})}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Catatan Tambahan:</label>
                <textarea 
                  value={disposisiData.catatan}
                  onChange={(e) => setDisposisiData({...disposisiData, catatan: e.target.value})}
                  className="form-control"
                  rows="3"
                  placeholder="Catatan tambahan (opsional)..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-primary"
                onClick={handleDisposisi}
                disabled={!disposisiData.tujuan || !disposisiData.instruksi}
              >
                Buat Disposisi
              </button>
              <button className="btn-secondary" onClick={() => setShowDisposisiModal(false)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KepalaDinas;
