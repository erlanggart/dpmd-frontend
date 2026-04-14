import React, { useState, useEffect } from 'react';
import './disposisi.css';

const KepalaDinas = () => {
  const [daftarSurat, setDaftarSurat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [showDisposisiModal, setShowDisposisiModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [disposisiData, setDisposisiData] = useState({
    tujuan: [], // Multiple user IDs
    instruksi: [], // Multiple instructions
    batas_waktu: '',
    catatan: ''
  });

  useEffect(() => {
    fetchDaftarSurat();
    fetchAvailableUsers();
  }, []);

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/disposisi/available-users');
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

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
        body: JSON.stringify({
          surat_id: selectedSurat.id,
          ke_user_id: disposisiData.tujuan,
          instruksi: disposisiData.instruksi,
          catatan: disposisiData.catatan,
          level_disposisi: 1 // Kepala Dinas level
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Disposisi berhasil dibuat');
        setShowDisposisiModal(false);
        setSelectedSurat(null);
        setDisposisiData({
          tujuan: [],
          instruksi: [],
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
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tujuan Disposisi (Pilih satu atau lebih) <span className="text-red-500">*</span>
                </label>
                <div className="checklist-container border-2 border-gray-200 rounded-xl p-3 bg-gray-50 max-h-40 overflow-y-auto">
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors mb-1">
                      <input 
                        type="checkbox"
                        checked={disposisiData.tujuan.includes(u.id)}
                        onChange={(e) => {
                          const newTujuan = e.target.checked 
                            ? [...disposisiData.tujuan, u.id]
                            : disposisiData.tujuan.filter(id => id !== u.id);
                          setDisposisiData({...disposisiData, tujuan: newTujuan});
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium">{u.name} <span className="text-gray-400 capitalize">- {u.role?.replace(/_/g, ' ')}</span></span>
                    </label>
                  ))}
                  {users.length === 0 && <p className="text-xs text-gray-500 italic">Memuat daftar penerima...</p>}
                </div>
              </div>

              <div className="form-group mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Instruksi (Pilih satu atau lebih) <span className="text-red-500">*</span>
                </label>
                <div className="checklist-container border-2 border-gray-200 rounded-xl p-3 bg-gray-50 max-h-40 overflow-y-auto">
                  {['Segera laksanakan', 'Koordinasikan mslh ini', 'Analisa / Telaah', 'Monitor / Tindak lanjut', 'Siapkan bahan/surat', 'Mewakili / Menghadiri', 'Untuk diketahui/perhatian', 'Selesaikan ssi peraturannya'].map((ins) => (
                    <label key={ins} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors mb-1">
                      <input 
                        type="checkbox"
                        checked={disposisiData.instruksi.includes(ins)}
                        onChange={(e) => {
                          const newIns = e.target.checked 
                            ? [...disposisiData.instruksi, ins]
                            : disposisiData.instruksi.filter(i => i !== ins);
                          setDisposisiData({...disposisiData, instruksi: newIns});
                        }}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm font-medium">{ins}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Batas Waktu:</label>
                <input 
                  type="date"
                  value={disposisiData.batas_waktu}
                  onChange={(e) => setDisposisiData({...disposisiData, batas_waktu: e.target.value})}
                  className="form-control"
                />
              </div>

              <div className="form-group mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Catatan Tambahan (Opsional):</label>
                <textarea 
                  value={disposisiData.catatan}
                  onChange={(e) => setDisposisiData({...disposisiData, catatan: e.target.value})}
                  className="form-control"
                  rows="2"
                  placeholder="Catatan tambahan (opsional)..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-primary"
                onClick={handleDisposisi}
                disabled={disposisiData.tujuan.length === 0 || disposisiData.instruksi.length === 0}
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
