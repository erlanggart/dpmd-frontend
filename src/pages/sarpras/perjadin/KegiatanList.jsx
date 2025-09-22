import React, { useState, useEffect } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import KegiatanForm from './KegiatanForm';
import './kegiatan.css';

const KegiatanList = ({ initialDateFilter, initialBidangFilter }) => {
  const [kegiatan, setKegiatan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [bidangs, setBidangs] = useState([]);
  const [selectedBidang, setSelectedBidang] = useState(initialBidangFilter || '');
  const [showForm, setShowForm] = useState(false);
  const [editingKegiatan, setEditingKegiatan] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dateFilter, setDateFilter] = useState(initialDateFilter || '');
  const limit = 5;

  const fetchKegiatan = async () => {
    setLoading(true);
    try {
      const response = await api.get('/kegiatan', {
        params: {
          page: currentPage,
          limit,
          search,
          id_bidang: selectedBidang,
          date_filter: dateFilter,
        },
      });
      setKegiatan(response.data.data);
      setTotalRecords(response.data.total);
      setLoading(false);
    } catch (error) {
      Swal.fire('Gagal!', 'Gagal memuat data kegiatan.', 'error');
      setLoading(false);
    }
  };

  const fetchBidangs = async () => {
    try {
      const response = await api.get('/bidang');
      setBidangs(response.data);
    } catch (error) {
      console.error('Failed to fetch bidangs', error);
    }
  };

  useEffect(() => {
    // Debug: cek apakah token tersedia
    const token = localStorage.getItem('authToken');
    console.log('Token tersedia:', token ? 'Ya' : 'Tidak');
    if (token) {
      console.log('Token length:', token.length);
    }
    
    fetchBidangs();
  }, []);

  useEffect(() => {
    fetchKegiatan();
  }, [currentPage, search, selectedBidang, dateFilter]);

  const handleEdit = (keg) => {
    setEditingKegiatan(keg);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/kegiatan/${id}`);
          Swal.fire('Terhapus!', 'Kegiatan berhasil dihapus.', 'success');
          fetchKegiatan();
        } catch (error) {
          Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus data.', 'error');
        }
      }
    });
  };

  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8000/api/kegiatan/export-excel', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'data-kegiatan.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      Swal.fire('Error', 'Gagal export data ke Excel', 'error');
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(totalRecords / limit);

  return (
    <div className="fade-in">
      <div className="action-buttons-container">
        <button onClick={() => {setShowForm(true); setEditingKegiatan(null);}} className="btn-primary">
          <i className="fas fa-plus-circle"></i> Tambah Kegiatan
        </button>
        <button onClick={handleExportExcel} className="btn-export-excel">
          <i className="fas fa-file-excel"></i> Export ke Excel
        </button>
      </div>

      <div id="form-container" className={`form-container ${showForm ? '' : 'hidden'}`}>
        <KegiatanForm
          kegiatan={editingKegiatan}
          onClose={() => {setShowForm(false); setEditingKegiatan(null);}}
          onSuccess={() => {setShowForm(false); setEditingKegiatan(null); fetchKegiatan();}}
        />
      </div>
      
      <hr className="section-divider" />
      
      <h3 className="list-heading">Daftar Kegiatan</h3>

      <div className="list-card">
        <div className="filter-controls">
          <div className="search-input-wrapper">
            <div className="input-icon">
              <i className="fas fa-search"></i>
            </div>
            <input
              type="text"
              placeholder="Cari..."
              value={search}
              onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}}
              className="search-input"
            />
          </div>
          <div className="filter-select-wrapper">
            <div className="input-icon">
              <i className="fas fa-filter"></i>
            </div>
            <select
              value={selectedBidang}
              onChange={(e) => {setSelectedBidang(e.target.value); setCurrentPage(1);}}
              className="filter-select"
            >
              <option value="">Semua Bidang</option>
              {bidangs.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
            </select>
          </div>
        </div>
        
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Kegiatan</th>
                <th>Nomor SP</th>
                <th>Tanggal Mulai</th>
                <th>Tanggal Selesai</th>
                <th>Lokasi</th>
                <th>Personil</th>
                <th>Keterangan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="empty-table-message">Memuat data...</td>
                </tr>
              ) : kegiatan.length > 0 ? (
                kegiatan.map((keg, index) => (
                  <tr key={keg.id_kegiatan}>
                    <td>{(currentPage - 1) * limit + index + 1}</td>
                    <td>{keg.nama_kegiatan}</td>
                    <td>{keg.nomor_sp}</td>
                    <td>{keg.tanggal_mulai}</td>
                    <td>{keg.tanggal_selesai}</td>
                    <td><i className="fas fa-map-marker-alt" style={{color: '#f87171'}}></i> {keg.lokasi}</td>
                    <td className="personil-cell">
                      {keg.details.map((detail, dIndex) => (
                        <div key={dIndex}>
                          <strong>{detail.bidang.nama}:</strong>
                          <ul>
                            {detail.personil && detail.personil.split(',').map((p, pIndex) => (
                              <li key={pIndex}>{p.trim()}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </td>
                    <td>{keg.keterangan}</td>
                    <td className="actions-cell">
                      <button onClick={() => handleEdit(keg)} className="btn-edit" title="Edit">
                        <i className="fas fa-edit"></i> Edit
                      </button>
                      <button onClick={() => handleDelete(keg.id_kegiatan)} className="btn-delete" title="Hapus">
                        <i className="fas fa-trash-alt"></i> Hapus
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-table-message">Tidak ada data kegiatan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-controls">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`pagination-button ${currentPage === page ? 'active' : ''}`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KegiatanList;