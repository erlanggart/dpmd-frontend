import React, { useState, useEffect } from 'react';
import './disposisi.css';

const SekretarisDinas = () => {
  const [daftarDisposisi, setDaftarDisposisi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisposisi, setSelectedDisposisi] = useState(null);
  const [showDisposisiModal, setShowDisposisiModal] = useState(false);
  const [disposisiData, setDisposisiData] = useState({
    tujuan: '',
    instruksi: '',
    batas_waktu: '',
    catatan: ''
  });

  useEffect(() => {
    fetchDaftarDisposisi();
  }, []);

  const fetchDaftarDisposisi = async () => {
    try {
      setLoading(true);
      // API call untuk mendapatkan disposisi yang ditujukan ke Sekretaris Dinas
      const response = await fetch('/api/disposisi/sekretaris-dinas/disposisi-masuk');
      const result = await response.json();
      
      if (result.success) {
        setDaftarDisposisi(result.data);
      }
    } catch (error) {
      console.error('Error fetching disposisi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeruskanDisposisi = async () => {
    try {
      const response = await fetch(`/api/disposisi/sekretaris-dinas/${selectedDisposisi.id}/teruskan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(disposisiData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Disposisi berhasil diteruskan');
        setShowDisposisiModal(false);
        setSelectedDisposisi(null);
        setDisposisiData({
          tujuan: '',
          instruksi: '',
          batas_waktu: '',
          catatan: ''
        });
        fetchDaftarDisposisi();
      }
    } catch (error) {
      console.error('Error meneruskan disposisi:', error);
      alert('Gagal meneruskan disposisi');
    }
  };

  const handleSelesaiDisposisi = async (disposisiId) => {
    try {
      const response = await fetch(`/api/disposisi/sekretaris-dinas/${disposisiId}/selesai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Disposisi ditandai selesai');
        fetchDaftarDisposisi();
      }
    } catch (error) {
      console.error('Error menyelesaikan disposisi:', error);
      alert('Gagal menandai disposisi selesai');
    }
  };

  const formatTanggal = (tanggal) => {
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'pending': return 'pending';
      case 'in_progress': return 'in-progress';
      case 'completed': return 'completed';
      case 'forwarded': return 'forwarded';
      default: return 'pending';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Menunggu';
      case 'in_progress': return 'Dalam Proses';
      case 'completed': return 'Selesai';
      case 'forwarded': return 'Diteruskan';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Memuat data disposisi...</p>
      </div>
    );
  }

  return (
    <div className="sekretaris-dinas-dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Sekretaris Dinas</h2>
        <p className="subtitle">Kelola dan Teruskan Disposisi Surat</p>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📨</div>
          <div className="stat-info">
            <h3>{daftarDisposisi.filter(s => s.status === 'pending').length}</h3>
            <p>Disposisi Baru</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-info">
            <h3>{daftarDisposisi.filter(s => s.status === 'in_progress').length}</h3>
            <p>Dalam Proses</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📤</div>
          <div className="stat-info">
            <h3>{daftarDisposisi.filter(s => s.status === 'forwarded').length}</h3>
            <p>Diteruskan</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{daftarDisposisi.filter(s => s.status === 'completed').length}</h3>
            <p>Selesai</p>
          </div>
        </div>
      </div>

      <div className="surat-table-container">
        <div className="table-header">
          <h3>Daftar Disposisi Masuk</h3>
          <div className="filter-buttons">
            <button className="filter-btn active">Semua</button>
            <button className="filter-btn">Baru</button>
            <button className="filter-btn">Dalam Proses</button>
            <button className="filter-btn">Diteruskan</button>
            <button className="filter-btn">Selesai</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="surat-table">
            <thead>
              <tr>
                <th>No. Surat</th>
                <th>Pengirim Asal</th>
                <th>Perihal</th>
                <th>Dari Kepala Dinas</th>
                <th>Instruksi</th>
                <th>Batas Waktu</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {daftarDisposisi.map((disposisi) => (
                <tr key={disposisi.id} className={disposisi.urgent ? 'urgent-row' : ''}>
                  <td>{disposisi.surat.nomor_surat}</td>
                  <td>{disposisi.surat.pengirim}</td>
                  <td>{disposisi.surat.perihal}</td>
                  <td>{formatTanggal(disposisi.created_at)}</td>
                  <td className="instruksi-cell">{disposisi.instruksi}</td>
                  <td>{disposisi.batas_waktu ? formatTanggal(disposisi.batas_waktu) : '-'}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(disposisi.status)}`}>
                      {getStatusText(disposisi.status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-detail"
                        onClick={() => setSelectedDisposisi(disposisi)}
                        title="Lihat Detail"
                      >
                        👁️
                      </button>
                      {disposisi.status === 'pending' && (
                        <>
                          <button 
                            className="btn-disposisi"
                            onClick={() => {
                              setSelectedDisposisi(disposisi);
                              setShowDisposisiModal(true);
                            }}
                            title="Teruskan ke Bidang"
                          >
                            📤
                          </button>
                          <button 
                            className="btn-success"
                            onClick={() => handleSelesaiDisposisi(disposisi.id)}
                            title="Tandai Selesai"
                          >
                            ✅
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Disposisi */}
      {selectedDisposisi && !showDisposisiModal && (
        <div className="modal-overlay" onClick={() => setSelectedDisposisi(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detail Disposisi</h3>
              <button className="close-btn" onClick={() => setSelectedDisposisi(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-section">
                  <h4>Informasi Surat</h4>
                  <div className="detail-item">
                    <label>Nomor Surat:</label>
                    <span>{selectedDisposisi.surat.nomor_surat}</span>
                  </div>
                  <div className="detail-item">
                    <label>Pengirim:</label>
                    <span>{selectedDisposisi.surat.pengirim}</span>
                  </div>
                  <div className="detail-item">
                    <label>Perihal:</label>
                    <span>{selectedDisposisi.surat.perihal}</span>
                  </div>
                  <div className="detail-item">
                    <label>Tanggal Masuk:</label>  
                    <span>{formatTanggal(selectedDisposisi.surat.tanggal_masuk)}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label>Isi Surat:</label>
                    <div className="isi-surat">{selectedDisposisi.surat.isi_surat}</div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Instruksi dari Kepala Dinas</h4>
                  <div className="detail-item">
                    <label>Tanggal Disposisi:</label>
                    <span>{formatTanggal(selectedDisposisi.created_at)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Instruksi:</label>
                    <div className="instruksi-text">{selectedDisposisi.instruksi}</div>
                  </div>
                  <div className="detail-item">
                    <label>Batas Waktu:</label>
                    <span>{selectedDisposisi.batas_waktu ? formatTanggal(selectedDisposisi.batas_waktu) : 'Tidak ditentukan'}</span>
                  </div>
                  {selectedDisposisi.catatan && (
                    <div className="detail-item">
                      <label>Catatan:</label>
                      <div className="catatan-text">{selectedDisposisi.catatan}</div>
                    </div>
                  )}
                </div>

                {selectedDisposisi.surat.file_surat && (
                  <div className="detail-item full-width">
                    <label>File Surat:</label>
                    <a href={selectedDisposisi.surat.file_surat} target="_blank" rel="noopener noreferrer" className="file-link">
                      📄 Lihat File Surat
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {selectedDisposisi.status === 'pending' && (
                <>
                  <button 
                    className="btn-primary"
                    onClick={() => setShowDisposisiModal(true)}
                  >
                    Teruskan ke Bidang
                  </button>
                  <button 
                    className="btn-success"
                    onClick={() => {
                      handleSelesaiDisposisi(selectedDisposisi.id);
                      setSelectedDisposisi(null);
                    }}
                  >
                    Tandai Selesai
                  </button>
                </>
              )}
              <button className="btn-secondary" onClick={() => setSelectedDisposisi(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Teruskan Disposisi */}
      {showDisposisiModal && selectedDisposisi && (
        <div className="modal-overlay" onClick={() => setShowDisposisiModal(false)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Teruskan Disposisi - {selectedDisposisi.surat.nomor_surat}</h3>
              <button className="close-btn" onClick={() => setShowDisposisiModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-section">
                <h4>Instruksi dari Kepala Dinas:</h4>
                <div className="original-instruction">
                  {selectedDisposisi.instruksi}
                </div>
              </div>

              <div className="form-group">
                <label>Teruskan ke Bidang:</label>
                <select 
                  value={disposisiData.tujuan}
                  onChange={(e) => setDisposisiData({...disposisiData, tujuan: e.target.value})}
                  className="form-control"
                >
                  <option value="">Pilih Bidang</option>
                  <option value="kepala_bidang_pemerintahan">Kepala Bidang Pemerintahan</option>
                  <option value="kepala_bidang_kesra">Kepala Bidang Kesejahteraan Rakyat</option>
                  <option value="kepala_bidang_ekonomi">Kepala Bidang Ekonomi</option>
                  <option value="kepala_bidang_fisik">Kepala Bidang Fisik dan Prasarana</option>
                </select>
              </div>

              <div className="form-group">
                <label>Instruksi Tambahan:</label>
                <textarea 
                  value={disposisiData.instruksi}
                  onChange={(e) => setDisposisiData({...disposisiData, instruksi: e.target.value})}
                  className="form-control"
                  rows="4"
                  placeholder="Tambahkan instruksi khusus untuk bidang terkait..."
                />
              </div>

              <div className="form-group">
                <label>Batas Waktu:</label>
                <input 
                  type="date"
                  value={disposisiData.batas_waktu}
                  onChange={(e) => setDisposisiData({...disposisiData, batas_waktu: e.target.value})}
                  className="form-control"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>Catatan:</label>
                <textarea 
                  value={disposisiData.catatan}
                  onChange={(e) => setDisposisiData({...disposisiData, catatan: e.target.value})}
                  className="form-control"
                  rows="3"
                  placeholder="Catatan tambahan untuk bidang..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-primary"
                onClick={handleTeruskanDisposisi}
                disabled={!disposisiData.tujuan}
              >
                Teruskan Disposisi
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

export default SekretarisDinas;
