import React, { useState, useEffect } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import KegiatanForm from './KegiatanForm';

// Custom CSS for animations
const styles = `
  @keyframes fadeInUp {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInRight {
    0% {
      opacity: 0;
      transform: translateX(30px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out;
  }

  .animate-slide-in-right {
    animation: slideInRight 0.8s ease-out;
  }

  .gradient-dark-blue {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  }

  .gradient-darker-blue {
    background: linear-gradient(135deg, #0c1420 0%, #1e293b 50%, #475569 100%);
  }
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

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
      const response = await api.get('/perjadin/kegiatan', {
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
      const response = await api.get('/perjadin/bidang');
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
          await api.delete(`/perjadin/kegiatan/${id}`);
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
      const response = await fetch('http://localhost:8000/api/perjadin/kegiatan/export-excel', {
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
    <div className="animate-fade-in-up min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl mb-4">
            <i className="fas fa-list-alt text-2xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Manajemen Kegiatan Perjadin
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 mx-auto rounded-full"></div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          <button 
            onClick={() => {setShowForm(true); setEditingKegiatan(null);}} 
            className="flex items-center gap-2 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <i className="fas fa-plus-circle text-lg"></i>
            <span>Tambah Kegiatan</span>
          </button>
          <button 
            onClick={handleExportExcel} 
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <i className="fas fa-file-excel text-lg"></i>
            <span>Export ke Excel</span>
          </button>
        </div>

        {/* Form Container */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <KegiatanForm
                kegiatan={editingKegiatan}
                onClose={() => {setShowForm(false); setEditingKegiatan(null);}}
                onSuccess={() => {setShowForm(false); setEditingKegiatan(null); fetchKegiatan();}}
              />
            </div>
          </div>
        )}
        
        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-in-right">
          {/* Card Header */}
          <div className="gradient-darker-blue p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg border border-white/10">
                <i className="fas fa-table text-white"></i>
              </div>
              Daftar Kegiatan Perjalanan Dinas
            </h2>
          </div>

          {/* Filters */}
          <div className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search Input */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-search text-slate-600 mr-2"></i>
                  Pencarian
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Cari kegiatan, nomor SP, lokasi..."
                    value={search}
                    onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white shadow-sm transition-all duration-200"
                  />
                </div>
              </div>

              {/* Bidang Filter */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-filter text-slate-600 mr-2"></i>
                  Filter Bidang
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-building text-gray-400"></i>
                  </div>
                  <select
                    value={selectedBidang}
                    onChange={(e) => {setSelectedBidang(e.target.value); setCurrentPage(1);}}
                    className="block w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white shadow-sm transition-all duration-200 appearance-none"
                  >
                    <option value="">Semua Bidang</option>
                    {bidangs.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <i className="fas fa-chevron-down text-gray-400"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        
          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-slate-100 to-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">No</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Nama Kegiatan</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Nomor SP</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Lokasi</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Personil</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Keterangan</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
                        <span className="text-gray-600 font-medium">Memuat data...</span>
                      </div>
                    </td>
                  </tr>
                ) : kegiatan.length > 0 ? (
                  kegiatan.map((keg, index) => (
                    <tr key={keg.id_kegiatan} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {(currentPage - 1) * limit + index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{keg.nama_kegiatan}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {keg.nomor_sp}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <i className="fas fa-calendar-alt text-green-500 text-xs"></i>
                            <span className="font-medium">{new Date(keg.tanggal_mulai).toLocaleDateString('id-ID')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <i className="fas fa-calendar-check text-red-500 text-xs"></i>
                            <span>{new Date(keg.tanggal_selesai).toLocaleDateString('id-ID')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-map-marker-alt text-red-500"></i>
                          <span>{keg.lokasi}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="space-y-2">
                          {keg.details.map((detail, dIndex) => (
                            <div key={dIndex} className="bg-slate-50 p-2 rounded-lg">
                              <div className="font-semibold text-slate-700 text-xs mb-1 flex items-center gap-1">
                                <i className="fas fa-building text-slate-500"></i>
                                {detail.bidang.nama}
                              </div>
                              <div className="space-y-1">
                                {detail.personil && detail.personil.split(',').map((p, pIndex) => (
                                  <div key={pIndex} className="flex items-center gap-1">
                                    <i className="fas fa-user text-blue-500 text-xs"></i>
                                    <span className="text-xs">{p.trim()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="max-w-xs truncate" title={keg.keterangan}>
                          {keg.keterangan || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-2">
                          <button 
                            onClick={() => handleEdit(keg)} 
                            className="inline-flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200"
                            title="Edit Kegiatan"
                          >
                            <i className="fas fa-edit"></i>
                            <span>Edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(keg.id_kegiatan)} 
                            className="inline-flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200"
                            title="Hapus Kegiatan"
                          >
                            <i className="fas fa-trash-alt"></i>
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <i className="fas fa-inbox text-4xl text-gray-300"></i>
                        <span className="text-gray-600 font-medium">Tidak ada data kegiatan ditemukan</span>
                        <span className="text-gray-400 text-sm">Silakan tambah kegiatan baru atau ubah filter pencarian</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Menampilkan {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalRecords)} dari {totalRecords} data
                </div>
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        currentPage === page 
                          ? 'bg-slate-700 text-white shadow-md' 
                          : 'bg-white text-gray-600 hover:bg-slate-100 border border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KegiatanList;