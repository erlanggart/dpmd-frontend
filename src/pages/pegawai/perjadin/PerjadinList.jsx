import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Eye, Edit, Trash2, ChevronLeft, ChevronRight, FileText, Users, MapPin, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import perjadinService from '../../../services/perjadinService';
import api from '../../../api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

function PerjadinList({ onAddNew, onEdit, initialBidangFilter = '', onBidangFilterChange }) {
  const navigate = useNavigate();
  const [kegiatans, setKegiatans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBidang, setFilterBidang] = useState(initialBidangFilter || '');
  const [bidangOptions, setBidangOptions] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const [filterTanggalMulai, setFilterTanggalMulai] = useState(getTodayDate());
  const [filterTanggalSelesai, setFilterTanggalSelesai] = useState(getTodayDate());
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchBidangOptions();
  }, []);

  // Update filter when initialBidangFilter changes
  useEffect(() => {
    const newFilter = initialBidangFilter || '';
    console.log('initialBidangFilter changed:', initialBidangFilter, 'newFilter:', newFilter, 'current filterBidang:', filterBidang);
    setFilterBidang(newFilter);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [initialBidangFilter]);

  // Debounce search only
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchKegiatans();
    }, search ? 500 : 0); // Only debounce if there's search text

    return () => clearTimeout(timeoutId);
  }, [search, filterBidang, filterTanggalMulai, filterTanggalSelesai, pagination.page]);

  const fetchBidangOptions = async () => {
    try {
      const response = await api.get('/bidang');
      if (response.data.success) {
        const options = response.data.data || [];
        console.log('Bidang options loaded:', options);
        setBidangOptions(options);
      }
    } catch (error) {
      console.error('Error fetching bidang:', error);
    }
  };

  const fetchKegiatans = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search
      };
      
      // Only add id_bidang if it has a valid value
      if (filterBidang && filterBidang !== '' && filterBidang !== 'undefined') {
        params.id_bidang = filterBidang;
      }
      
      // Add date filters (backend expects start_date and end_date)
      if (filterTanggalMulai) {
        params.start_date = filterTanggalMulai;
      }
      if (filterTanggalSelesai) {
        params.end_date = filterTanggalSelesai;
      }

      console.log('Fetching kegiatans with params:', params);
      const response = await perjadinService.getAllKegiatan(params);

      if (response.data.success) {
        setKegiatans(response.data.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error('Error fetching kegiatans:', error);
      toast.error('Gagal memuat data kegiatan');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (kegiatanId) => {
    try {
      // Fetch full detail for edit
      const response = await perjadinService.getKegiatanById(kegiatanId);
      if (response.data.success) {
        onEdit(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching kegiatan detail:', error);
      toast.error('Gagal memuat detail kegiatan');
    }
  };

  const handleDelete = async (kegiatan) => {
    const result = await Swal.fire({
      title: 'Hapus Kegiatan?',
      html: `Yakin ingin menghapus kegiatan <strong>${kegiatan.nama_kegiatan}</strong>?<br><small>Data yang dihapus tidak dapat dikembalikan.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#gray',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const response = await perjadinService.deleteKegiatan(kegiatan.id_kegiatan);
        if (response.data.success) {
          toast.success('Kegiatan berhasil dihapus');
          fetchKegiatans();
        }
      } catch (error) {
        console.error('Error deleting kegiatan:', error);
        toast.error(error.response?.data?.message || 'Gagal menghapus kegiatan');
      }
    }
  };

  const handleExport = async () => {
    try {
      toast.loading('Mengekspor data...');
      const params = {
        search: search
      };
      
      if (filterBidang && filterBidang !== '' && filterBidang !== 'undefined') {
        params.id_bidang = filterBidang;
      }
      
      if (filterTanggalMulai) {
        params.start_date = filterTanggalMulai;
      }
      
      if (filterTanggalSelesai) {
        params.end_date = filterTanggalSelesai;
      }

      const response = await perjadinService.exportKegiatan(params);

      if (response.data.success && response.data.data.length > 0) {
        // Convert to Excel
        const worksheet = XLSX.utils.json_to_sheet(response.data.data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Kegiatan Perjadin');

        // Generate filename
        const filename = `Kegiatan_Perjadin_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Download
        XLSX.writeFile(workbook, filename);
        toast.dismiss();
        toast.success(`${response.data.data.length} data berhasil diekspor`);
      } else {
        toast.dismiss();
        toast.error('Tidak ada data untuk diekspor');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.dismiss();
      toast.error('Gagal mengekspor data');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      {/* Header with Dark Navy Theme */}
      <div className="bg-[#2C3E50] px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white">Daftar Kegiatan</h2>
                <p className="text-gray-300 text-xs md:text-sm">
                  Total {pagination.total} kegiatan terdaftar
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 md:p-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          {/* Filter Header - Always Visible */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition rounded-t-xl"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Filter & Pencarian</h3>
                <p className="text-xs text-gray-500">
                  {isFilterOpen ? 'Klik untuk menutup' : 'Klik untuk membuka filter'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isFilterOpen && (
                <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full hidden sm:block">
                  Menampilkan kegiatan hari ini
                </div>
              )}
              {isFilterOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
          
          {/* Filter Content - Collapsible */}
          {isFilterOpen && (
            <div className="border-t border-gray-200 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Search */}
                <div className="md:col-span-12">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pencarian</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      placeholder="Cari nama kegiatan, nomor SP, atau lokasi..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Tanggal Mulai */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      value={filterTanggalMulai}
                      onChange={(e) => {
                        setFilterTanggalMulai(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Tanggal Selesai */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Selesai</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      value={filterTanggalSelesai}
                      onChange={(e) => {
                        setFilterTanggalSelesai(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Filter Bidang */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bidang</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={filterBidang}
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log('Filter changed to:', value);
                        setFilterBidang(value);
                        onBidangFilterChange && onBidangFilterChange(value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition"
                    >
                      <option value="">Semua Bidang</option>
                      {bidangOptions.map(b => (
                        <option key={b.id} value={String(b.id)}>{b.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="md:col-span-12 flex gap-3 justify-end pt-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSearch('');
                      setFilterBidang('');
                      setFilterTanggalMulai(getTodayDate());
                      setFilterTanggalSelesai(getTodayDate());
                      onBidangFilterChange && onBidangFilterChange('');
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition shadow-sm flex items-center gap-2 font-medium"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleExport}
                    className="px-4 py-2.5 bg-[#2C3E50] text-white rounded-lg hover:bg-[#34495e] transition shadow flex items-center gap-2 font-medium"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Excel</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-500">Memuat data kegiatan...</p>
              </div>
            </div>
          ) : kegiatans.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-600 font-medium">Tidak ada data kegiatan</p>
              <p className="text-gray-400 text-sm mt-1">Silakan tambah kegiatan baru atau ubah filter pencarian</p>
              {(search || filterBidang || filterTanggalMulai || filterTanggalSelesai) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setFilterBidang('');
                    setFilterTanggalMulai(getTodayDate());
                    setFilterTanggalSelesai(getTodayDate());
                    onBidangFilterChange && onBidangFilterChange('');
                    setIsFilterOpen(false);
                  }}
                  className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition"
                >
                  Reset & Tutup Filter
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-[#2C3E50] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Nomor SP</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Nama Kegiatan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tanggal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Lokasi</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Bidang & Pegawai</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kegiatans.map((kegiatan, index) => (
                      <tr key={kegiatan.id_kegiatan} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-4 text-sm text-gray-600">
                          <span className="bg-gray-100 px-2 py-1 rounded font-medium">
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className="font-mono text-blue-600 font-medium">
                            {kegiatan.nomor_sp}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-800 max-w-xs truncate">
                            {kegiatan.nama_kegiatan}
                          </div>
                          {kegiatan.keterangan && kegiatan.keterangan !== '-' && (
                            <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                              {kegiatan.keterangan}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{formatDate(kegiatan.tanggal_mulai)}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 ml-5">
                            s/d {formatDate(kegiatan.tanggal_selesai)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span className="truncate max-w-[150px]">{kegiatan.lokasi}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                              <FileText className="w-3 h-3" />
                              {kegiatan.jumlah_bidang} Bidang
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                              <Users className="w-3 h-3" />
                              {kegiatan.jumlah_pegawai} Pegawai
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => navigate(`/pegawai/perjadin/detail/${kegiatan.id_kegiatan}`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditClick(kegiatan.id_kegiatan)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(kegiatan)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {kegiatans.map((kegiatan, index) => (
                  <div key={kegiatan.id_kegiatan} className="p-3 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2">{kegiatan.nama_kegiatan}</p>
                        <p className="text-xs text-blue-600 font-mono mt-0.5">{kegiatan.nomor_sp}</p>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                        #{(pagination.page - 1) * pagination.limit + index + 1}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-2">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(kegiatan.tanggal_mulai)}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /><span className="truncate max-w-[140px]">{kegiatan.lokasi}</span></span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-full">
                          <FileText className="w-2.5 h-2.5" />{kegiatan.jumlah_bidang} Bidang
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 rounded-full">
                          <Users className="w-2.5 h-2.5" />{kegiatan.jumlah_pegawai} Pegawai
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => navigate(`/pegawai/perjadin/detail/${kegiatan.id_kegiatan}`)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Detail"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleEditClick(kegiatan.id_kegiatan)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(kegiatan)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                      Menampilkan <span className="font-semibold">{(pagination.page - 1) * pagination.limit + 1}</span> - <span className="font-semibold">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> dari <span className="font-semibold">{pagination.total}</span> data
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-medium transition ${
                                pagination.page === pageNum
                                  ? 'bg-[#2C3E50] text-white shadow'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PerjadinList;
