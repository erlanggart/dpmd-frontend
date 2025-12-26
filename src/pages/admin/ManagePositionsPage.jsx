// src/pages/admin/ManagePositionsPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiUsers, FiRefreshCw, FiSearch, FiEdit2, FiClock, 
  FiBarChart2, FiAlertCircle, FiCheck, FiX 
} from 'react-icons/fi';
import api from '../../api';
import toast from 'react-hot-toast';

const ManagePositionsPage = () => {
  const [users, setUsers] = useState([]);
  const [positions, setPositions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState([]);
  const [updating, setUpdating] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [pagination.page, filterPosition, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load users, positions, and stats in parallel
      const [usersRes, positionsRes, statsRes] = await Promise.all([
        api.get('/positions/users', {
          params: {
            page: pagination.page,
            limit: pagination.limit,
            search: searchQuery || undefined,
            position_id: filterPosition || undefined
          }
        }),
        api.get('/positions'),
        api.get('/positions/stats')
      ]);

      setUsers(usersRes.data.data);
      setPagination(usersRes.data.pagination);
      setPositions(positionsRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPosition = (user) => {
    setSelectedUser(user);
    setSelectedPosition(user.position_id || '');
    setReason('');
    setShowEditModal(true);
  };

  const handleUpdatePosition = async () => {
    if (!selectedUser) return;

    try {
      setUpdating(true);
      
      await api.put(`/positions/users/${selectedUser.id}`, {
        position_id: selectedPosition || null,
        reason: reason || 'Perubahan posisi oleh admin'
      });

      toast.success('Posisi berhasil diupdate');
      setShowEditModal(false);
      setSelectedUser(null);
      setSelectedPosition('');
      setReason('');
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating position:', error);
      toast.error(error.response?.data?.message || 'Gagal mengupdate posisi');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewHistory = async (user) => {
    try {
      setSelectedUser(user);
      setShowHistoryModal(true);
      
      const res = await api.get(`/positions/users/${user.id}/history`);
      setHistory(res.data.data);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Gagal memuat riwayat');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    loadData();
  };

  const getPositionBadgeColor = (level) => {
    const colors = {
      1: 'bg-red-100 text-red-700 border-red-200',
      2: 'bg-blue-100 text-blue-700 border-blue-200',
      3: 'bg-purple-100 text-purple-700 border-purple-200',
      4: 'bg-green-100 text-green-700 border-green-200',
      5: 'bg-teal-100 text-teal-700 border-teal-200',
      6: 'bg-orange-100 text-orange-700 border-orange-200'
    };
    return colors[level] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FiUsers className="text-blue-600" />
                Manajemen Posisi Pegawai
              </h1>
              <p className="text-gray-600 mt-1">
                Kelola posisi/jabatan pegawai DPMD
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {stats.positions.map((pos) => (
                <div key={pos.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-800">{pos.user_count}</div>
                  <div className="text-xs text-gray-600 mt-1">{pos.name}</div>
                </div>
              ))}
              {stats.users_without_position > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-800">{stats.users_without_position}</div>
                  <div className="text-xs text-yellow-700 mt-1">Tanpa Posisi</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau email pegawai..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                value={filterPosition}
                onChange={(e) => {
                  setFilterPosition(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Posisi</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Cari
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pegawai
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posisi Saat Ini
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <FiRefreshCw className="animate-spin h-8 w-8 mx-auto mb-2" />
                      Memuat data...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <FiAlertCircle className="h-8 w-8 mx-auto mb-2" />
                      Tidak ada data pegawai
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.avatar ? (
                            <img
                              src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}${user.avatar}`}
                              alt={user.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {user.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">{user.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.position ? (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPositionBadgeColor(user.position.level)}`}>
                            {user.position.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            Belum Ada Posisi
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <FiCheck className="h-3 w-3" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <FiX className="h-3 w-3" />
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditPosition(user)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit Posisi"
                        >
                          <FiEdit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleViewHistory(user)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Lihat Riwayat"
                        >
                          <FiClock className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} pegawai
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-4 py-2 border border-gray-300 rounded-lg bg-white">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Position Modal */}
        {showEditModal && selectedUser && (
          <>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setShowEditModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Update Posisi Pegawai
                </h3>
                
                <div className="mb-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    {selectedUser.avatar ? (
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}${selectedUser.avatar}`}
                        alt={selectedUser.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {selectedUser.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{selectedUser.name}</div>
                      <div className="text-sm text-gray-600">{selectedUser.email}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posisi Baru <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Hapus Posisi --</option>
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name} (Level {pos.level})
                      </option>
                    ))}
                  </select>
                  {selectedUser.position && (
                    <div className="mt-2 text-sm text-gray-600">
                      Posisi saat ini: <span className="font-medium">{selectedUser.position.name}</span>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alasan Perubahan
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Contoh: Promosi, Mutasi, Rotasi, dll..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    disabled={updating}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleUpdatePosition}
                    disabled={updating}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updating && <FiRefreshCw className="animate-spin" />}
                    {updating ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* History Modal */}
        {showHistoryModal && selectedUser && (
          <>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setShowHistoryModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiClock />
                  Riwayat Perubahan Posisi
                </h3>
                
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">{selectedUser.name}</div>
                  <div className="text-sm text-gray-600">{selectedUser.email}</div>
                </div>

                {history.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <FiAlertCircle className="h-12 w-12 mx-auto mb-2" />
                    Belum ada riwayat perubahan posisi
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((item, index) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {index + 1}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {item.old_position && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                  {item.old_position.name}
                                </span>
                              )}
                              <span className="text-gray-400">→</span>
                              {item.new_position ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                  {item.new_position.name}
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  Posisi Dihapus
                                </span>
                              )}
                            </div>
                            {item.reason && (
                              <div className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">Alasan:</span> {item.reason}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              Diubah oleh: {item.changer.name} • {new Date(item.created_at).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ManagePositionsPage;
