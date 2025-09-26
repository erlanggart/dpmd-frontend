import React, { useState, useEffect } from 'react';
import './disposisi.css';

const KepalaBidang = () => {
  const [daftarDisposisi, setDaftarDisposisi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisposisi, setSelectedDisposisi] = useState(null);
  const [showLaporanModal, setShowLaporanModal] = useState(false);
  const [laporanData, setLaporanData] = useState({
    status: '',
    hasil: '',
    catatan: '',
    file_laporan: null
  });
  const [bidangInfo, setBidangInfo] = useState({
    nama: 'Kepala Bidang',
    bidang: ''
  });

  useEffect(() => {
    fetchBidangInfo();
    fetchDaftarDisposisi();
  }, []);

  const fetchBidangInfo = async () => {
    try {
      // API call untuk mendapatkan info bidang user yang login
      const response = await fetch('/api/disposisi/kepala-bidang/info');
      const result = await response.json();
      
      if (result.success) {
        setBidangInfo(result.data);
      }
    } catch (error) {
      console.error('Error fetching bidang info:', error);
    }
  };

  const fetchDaftarDisposisi = async () => {
    try {
      setLoading(true);
      // API call untuk mendapatkan disposisi yang ditujukan ke bidang tertentu
      const response = await fetch('/api/disposisi/kepala-bidang/disposisi-masuk');
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

  const handleSubmitLaporan = async () => {
    try {
      const formData = new FormData();
      formData.append('status', laporanData.status);
      formData.append('hasil', laporanData.hasil);
      formData.append('catatan', laporanData.catatan);
      if (laporanData.file_laporan) {
        formData.append('file_laporan', laporanData.file_laporan);
      }

      const response = await fetch(`/api/disposisi/kepala-bidang/${selectedDisposisi.id}/laporan`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Laporan berhasil dikirim');
        setShowLaporanModal(false);
        setSelectedDisposisi(null);
        setLaporanData({
          status: '',
          hasil: '',
          catatan: '',
          file_laporan: null
        });
        fetchDaftarDisposisi();
      }
    } catch (error) {
      console.error('Error submitting laporan:', error);
      alert('Gagal mengirim laporan');
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
      case 'reported': return 'reported';
      default: return 'pending';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Menunggu';
      case 'in_progress': return 'Dalam Proses';
      case 'completed': return 'Selesai';
      case 'reported': return 'Dilaporkan';
      default: return status;
    }
  };

  const getBidangName = (bidangCode) => {
    switch(bidangCode) {
      case 'kepala_bidang_pemerintahan': return 'Pemerintahan';
      case 'kepala_bidang_kesra': return 'Kesejahteraan Rakyat';
      case 'kepala_bidang_ekonomi': return 'Ekonomi';
      case 'kepala_bidang_fisik': return 'Fisik dan Prasarana';
      default: return bidangCode;
    }
  };

  const isOverdue = (batasWaktu) => {
    if (!batasWaktu) return false;
    return new Date(batasWaktu) < new Date();
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
    <div className="kepala-bidang-dashboard">
      <div className="dashboard-header">
        <h2>Dashboard {bidangInfo.nama}</h2>
        <p className="subtitle">Bidang {getBidangName(bidangInfo.bidang)} - Kelola dan Laporkan Disposisi</p>
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
        <div className="stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <h3>{daftarDisposisi.filter(s => isOverdue(s.batas_waktu) && s.status !== 'completed' && s.status !== 'reported').length}</h3>
            <p>Terlambat</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>{daftarDisposisi.filter(s => s.status === 'reported').length}</h3>
            <p>Sudah Dilaporkan</p>
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
            <button className="filter-btn">Terlambat</button>
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
                <th>Dari</th>
                <th>Instruksi</th>
                <th>Batas Waktu</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {daftarDisposisi.map((disposisi) => (
                <tr key={disposisi.id} className={`
                  ${disposisi.urgent ? 'urgent-row' : ''} 
                  ${isOverdue(disposisi.batas_waktu) && disposisi.status !== 'completed' && disposisi.status !== 'reported' ? 'overdue-row' : ''}
                `}>
                  <td>{disposisi.surat.nomor_surat}</td>
                  <td>{disposisi.surat.pengirim}</td>
                  <td>{disposisi.surat.perihal}</td>
                  <td>{disposisi.dari_sekretaris ? 'Sekretaris Dinas' : 'Kepala Dinas'}</td>
                  <td className="instruksi-cell">{disposisi.instruksi}</td>
                  <td className={isOverdue(disposisi.batas_waktu) && disposisi.status !== 'completed' && disposisi.status !== 'reported' ? 'overdue-date' : ''}>
                    {disposisi.batas_waktu ? formatTanggal(disposisi.batas_waktu) : '-'}
                    {isOverdue(disposisi.batas_waktu) && disposisi.status !== 'completed' && disposisi.status !== 'reported' && (
                      <span className="overdue-badge">Terlambat</span>
                    )}
                  </td>
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
                      {(disposisi.status === 'pending' || disposisi.status === 'in_progress') && (
                        <button 
                          className="btn-success"
                          onClick={() => {
                            setSelectedDisposisi(disposisi);
                            setShowLaporanModal(true);
                          }}
                          title="Buat Laporan"
                        >
                          📋
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

      {/* Modal Detail Disposisi */}
      {selectedDisposisi && !showLaporanModal && (
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
                  <h4>Instruksi Disposisi</h4>
                  <div className="detail-item">
                    <label>Dari:</label>
                    <span>{selectedDisposisi.dari_sekretaris ? 'Sekretaris Dinas' : 'Kepala Dinas'}</span>
                  </div>
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
                    <span className={isOverdue(selectedDisposisi.batas_waktu) && selectedDisposisi.status !== 'completed' && selectedDisposisi.status !== 'reported' ? 'overdue-text' : ''}>
                      {selectedDisposisi.batas_waktu ? formatTanggal(selectedDisposisi.batas_waktu) : 'Tidak ditentukan'}
                      {isOverdue(selectedDisposisi.batas_waktu) && selectedDisposisi.status !== 'completed' && selectedDisposisi.status !== 'reported' && (
                        <span className="overdue-badge ml-2">Terlambat</span>
                      )}
                    </span>
                  </div>
                  {selectedDisposisi.catatan && (
                    <div className="detail-item">
                      <label>Catatan:</label>
                      <div className="catatan-text">{selectedDisposisi.catatan}</div>
                    </div>
                  )}
                </div>

                {selectedDisposisi.laporan && (
                  <div className="detail-section">
                    <h4>Laporan Penyelesaian</h4>
                    <div className="detail-item">
                      <label>Status:</label>
                      <span className={`status-badge ${getStatusBadgeClass(selectedDisposisi.laporan.status)}`}>
                        {getStatusText(selectedDisposisi.laporan.status)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Tanggal Laporan:</label>
                      <span>{formatTanggal(selectedDisposisi.laporan.created_at)}</span>
                    </div>
                    <div className="detail-item full-width">
                      <label>Hasil:</label>
                      <div className="hasil-text">{selectedDisposisi.laporan.hasil}</div>
                    </div>
                    {selectedDisposisi.laporan.catatan && (
                      <div className="detail-item full-width">
                        <label>Catatan Laporan:</label>
                        <div className="catatan-text">{selectedDisposisi.laporan.catatan}</div>
                      </div>
                    )}
                    {selectedDisposisi.laporan.file_laporan && (
                      <div className="detail-item full-width">
                        <label>File Laporan:</label>
                        <a href={selectedDisposisi.laporan.file_laporan} target="_blank" rel="noopener noreferrer" className="file-link">
                          📄 Lihat File Laporan
                        </a>
                      </div>
                    )}
                  </div>
                )}

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
              {(selectedDisposisi.status === 'pending' || selectedDisposisi.status === 'in_progress') && (
                <button 
                  className="btn-primary"
                  onClick={() => setShowLaporanModal(true)}
                >
                  Buat Laporan
                </button>
              )}
              <button className="btn-secondary" onClick={() => setSelectedDisposisi(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Laporan */}
      {showLaporanModal && selectedDisposisi && (
        <div className="modal-overlay" onClick={() => setShowLaporanModal(false)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Buat Laporan - {selectedDisposisi.surat.nomor_surat}</h3>
              <button className="close-btn" onClick={() => setShowLaporanModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-section">
                <h4>Instruksi yang Diterima:</h4>
                <div className="original-instruction">
                  {selectedDisposisi.instruksi}
                </div>
              </div>

              <div className="form-group">
                <label>Status Penyelesaian:</label>
                <select 
                  value={laporanData.status}
                  onChange={(e) => setLaporanData({...laporanData, status: e.target.value})}
                  className="form-control"
                >
                  <option value="">Pilih Status</option>
                  <option value="completed">Selesai</option>
                  <option value="in_progress">Masih Dalam Proses</option>
                  <option value="need_more_time">Butuh Waktu Tambahan</option>
                  <option value="need_clarification">Butuh Klarifikasi</option>
                </select>
              </div>

              <div className="form-group">
                <label>Hasil/Tindakan yang Dilakukan:</label>
                <textarea 
                  value={laporanData.hasil}
                  onChange={(e) => setLaporanData({...laporanData, hasil: e.target.value})}
                  className="form-control"
                  rows="5"
                  placeholder="Jelaskan hasil atau tindakan yang telah dilakukan..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Catatan Tambahan:</label>
                <textarea 
                  value={laporanData.catatan}
                  onChange={(e) => setLaporanData({...laporanData, catatan: e.target.value})}
                  className="form-control"
                  rows="3"
                  placeholder="Catatan atau rekomendasi tambahan..."
                />
              </div>

              <div className="form-group">
                <label>File Laporan (Opsional):</label>
                <input 
                  type="file"
                  onChange={(e) => setLaporanData({...laporanData, file_laporan: e.target.files[0]})}
                  className="form-control"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <small className="form-text">Format yang didukung: PDF, DOC, DOCX, JPG, PNG</small>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-primary"
                onClick={handleSubmitLaporan}
                disabled={!laporanData.status || !laporanData.hasil}
              >
                Kirim Laporan
              </button>
              <button className="btn-secondary" onClick={() => setShowLaporanModal(false)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KepalaBidang;