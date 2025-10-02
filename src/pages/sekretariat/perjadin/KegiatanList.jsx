import React, { useState, useEffect } from 'react';
import { FiList, FiPlus, FiFileText, FiEdit, FiTrash2, FiEye, FiSearch, FiFilter } from 'react-icons/fi';
import api from '../../../api';
import Swal from 'sweetalert2';
import KegiatanForm from './KegiatanForm';

const KegiatanList = ({ initialDateFilter, initialBidangFilter, onAddNew, refreshTrigger }) => {
  const [kegiatanList, setKegiatanList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingKegiatan, setEditingKegiatan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBidang, setSelectedBidang] = useState('');
  const [bidangList, setBidangList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchKegiatan();
    fetchBidang();
  }, [currentPage, searchTerm, selectedBidang]);

  useEffect(() => {
    if (initialDateFilter || initialBidangFilter) {
      setSelectedBidang(initialBidangFilter || '');
      fetchKegiatan();
    }
  }, [initialDateFilter, initialBidangFilter]);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchKegiatan();
    }
  }, [refreshTrigger]);

  const fetchKegiatan = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: limit,
        search: searchTerm,
        bidang: selectedBidang,
      };

      console.log('🔄 KegiatanList: Fetching kegiatan data with params:', params);
      const response = await api.get('/perjadin/kegiatan', { params });
      
      if (response.data.success) {
        console.log('✅ KegiatanList: Data received:', response.data.data);
        setKegiatanList(response.data.data || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalRecords(response.data.totalRecords || 0);
      }
    } catch (error) {
      console.error('❌ KegiatanList: Error fetching data:', error);
      // Set empty data instead of showing error for first time users
      setKegiatanList([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchBidang = async () => {
    try {
      const response = await api.get('/master/bidang');
      if (response.data.success) {
        setBidangList(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching bidang:', error);
    }
  };

  const handleEdit = (kegiatan) => {
    setEditingKegiatan(kegiatan);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Konfirmasi Hapus',
      text: 'Apakah Anda yakin ingin menghapus kegiatan ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/perjadin/kegiatan/${id}`);
        Swal.fire('Berhasil!', 'Kegiatan berhasil dihapus.', 'success');
        fetchKegiatan();
      } catch (error) {
        console.error('Error deleting kegiatan:', error);
        Swal.fire('Error!', 'Gagal menghapus kegiatan.', 'error');
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get('/perjadin/kegiatan/export', {
        responseType: 'blob',
        params: {
          search: searchTerm,
          bidang: selectedBidang,
        }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kegiatan-perjadin-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      Swal.fire('Berhasil!', 'Data berhasil diekspor ke Excel.', 'success');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      Swal.fire('Error!', 'Gagal mengekspor data ke Excel.', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatPersonil = (personilBidangList) => {
    if (!personilBidangList || personilBidangList.length === 0) return '-';
    
    console.log('🔍 KegiatanList: Formatting personil data:', personilBidangList);
    
    return personilBidangList.map(pb => {
      let personilNames = '';
      
      // Handle different data structures from backend
      if (pb.personil_list && Array.isArray(pb.personil_list)) {
        // Format: { nama_bidang: "...", personil_list: [{nama_personil: "..."}, ...] }
        personilNames = pb.personil_list.map(p => p.nama_personil || p.nama || p).join(', ');
      } else if (pb.personil && Array.isArray(pb.personil)) {
        // Format: { nama_bidang: "...", personil: ["nama1", "nama2", ...] }
        personilNames = pb.personil.filter(p => p && p.trim()).join(', ');
      } else if (pb.personil && typeof pb.personil === 'string') {
        // Format: { nama_bidang: "...", personil: "nama1,nama2" }
        personilNames = pb.personil;
      }
      
      return `${pb.nama_bidang || pb.bidang || 'Unknown'}: ${personilNames || 'Tidak ada personil'}`;
    }).join(' | ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-700 mx-auto"></div>
          <p className="text-slate-600 font-medium">Memuat data kegiatan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header Section */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-2xl">
          <FiList className="text-3xl text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
            Manajemen Kegiatan
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Kelola dan pantau semua kegiatan perjalanan dinas dengan mudah dan efisien
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 mx-auto rounded-full mt-4"></div>
        </div>
      </div>

      {/* Enhanced Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button 
          onClick={() => onAddNew ? onAddNew() : setShowForm(true)} 
          className="group flex items-center gap-3 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
        >
          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-all duration-300">
            <FiPlus className="text-lg" />
          </div>
          <span>Tambah Kegiatan Baru</span>
        </button>
        <button 
          onClick={handleExportExcel} 
          className="group flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
        >
          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-all duration-300">
            <FiFileText className="text-lg" />
          </div>
          <span>Export ke Excel</span>
        </button>
      </div>

      {/* Enhanced Form Container */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full max-h-[95vh] overflow-auto">
            <KegiatanForm
              kegiatan={editingKegiatan}
              onClose={() => {setShowForm(false); setEditingKegiatan(null);}}
              onSuccess={() => {setShowForm(false); setEditingKegiatan(null); fetchKegiatan();}}
            />
          </div>
        </div>
      )}

      {/* Enhanced Main Content Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Daftar Kegiatan</h3>
                <p className="text-slate-300 text-sm">Perjalanan Dinas Terdaftar</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{totalRecords}</div>
              <div className="text-slate-300 text-sm">Total Kegiatan</div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                <FiSearch className="inline w-4 h-4 mr-2" />
                Pencarian
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama kegiatan, lokasi, atau nomor SP..."
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>

            {/* Bidang Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                <FiFilter className="inline w-4 h-4 mr-2" />
                Filter Bidang
              </label>
              <select
                value={selectedBidang}
                onChange={(e) => setSelectedBidang(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="">Semua Bidang</option>
                {bidangList.map(bidang => (
                  <option key={bidang.id_bidang} value={bidang.id_bidang}>
                    {bidang.nama_bidang}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Enhanced Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">No</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Nomor SP</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Nama Kegiatan</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Tanggal</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Lokasi</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Personil</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {kegiatanList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto">
                        <FiList className="w-8 h-8 text-slate-500" />
                      </div>
                      <div>
                        <h6 className="text-lg font-bold text-slate-800">Belum Ada Kegiatan</h6>
                        <p className="text-slate-600 text-sm mt-1">Mulai dengan menambahkan kegiatan perjalanan dinas baru</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                kegiatanList.map((kegiatan, index) => (
                  <tr key={kegiatan.id_perjadin} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                      {(currentPage - 1) * limit + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                      {kegiatan.nomor_sp || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {kegiatan.nama_kegiatan}
                        </p>
                        {kegiatan.keterangan && (
                          <p className="text-xs text-slate-600 mt-1 truncate">
                            {kegiatan.keterangan}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="space-y-1">
                        <div className="font-medium">{formatDate(kegiatan.tanggal_mulai)}</div>
                        {kegiatan.tanggal_selesai && kegiatan.tanggal_selesai !== kegiatan.tanggal_mulai && (
                          <div className="text-xs text-slate-500">s/d {formatDate(kegiatan.tanggal_selesai)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="max-w-xs truncate" title={kegiatan.lokasi}>
                        {kegiatan.lokasi || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="max-w-xs truncate" title={formatPersonil(kegiatan.personil_bidang_list)}>
                        {formatPersonil(kegiatan.personil_bidang_list)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(kegiatan)}
                          className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors duration-200"
                          title="Edit"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(kegiatan.id_perjadin)}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors duration-200"
                          title="Hapus"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Menampilkan</span>
                <span className="font-bold text-slate-800">
                  {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalRecords)}
                </span>
                <span>dari</span>
                <span className="font-bold text-slate-800">{totalRecords}</span>
                <span>data</span>
              </div>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      currentPage === page
                        ? 'bg-slate-700 text-white shadow-lg'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
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
  );
};

export default KegiatanList;