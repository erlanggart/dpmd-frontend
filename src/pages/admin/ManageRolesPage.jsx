// src/pages/admin/ManageRolesPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiUsers, FiRefreshCw, FiSearch, FiEdit2, FiCheck, FiX, FiAlertCircle 
} from 'react-icons/fi';
import api from '../../api';
import toast from 'react-hot-toast';

const ManageRolesPage = () => {
  const [users, setUsers] = useState([]);
  const [bidangs, setBidangs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterBidang, setFilterBidang] = useState('');

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    role: '',
    bidang_id: ''
  });
  const [updating, setUpdating] = useState(false);

  // Role options
  const roleOptions = [
    { value: 'superadmin', label: 'Super Admin', color: 'red' },
    { value: 'admin', label: 'Admin', color: 'purple' },
    { value: 'kepala_dinas', label: 'Kepala Dinas', color: 'blue' },
    { value: 'sekretaris_dinas', label: 'Sekretaris Dinas', color: 'indigo' },
    { value: 'kabid_spked', label: 'Kepala Bidang SPKED', color: 'green' },
    { value: 'kabid_pmd', label: 'Kepala Bidang PMD', color: 'green' },
    { value: 'kabid_kkd', label: 'Kepala Bidang KKD', color: 'green' },
    { value: 'kabid_bmd', label: 'Kepala Bidang BMD', color: 'green' },
    { value: 'kabid_ti', label: 'Kepala Bidang TI', color: 'green' },
    { value: 'ketua_tim', label: 'Ketua Tim', color: 'teal' },
    { value: 'pegawai', label: 'Pegawai/Staff', color: 'gray' }
  ];

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load users and bidangs
      const [usersRes, bidangsRes] = await Promise.all([
        api.get('/users'),
        api.get('/bidangs')
      ]);

      setUsers(usersRes.data.data || []);
      setBidangs(bidangsRes.data.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role || '',
      bidang_id: user.bidang_id || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    // Validation
    if (!editForm.role) {
      toast.error('Role harus diisi');
      return;
    }

    // If role requires bidang, make sure bidang_id is filled
    const requiresBidang = ['kabid_spked', 'kabid_pmd', 'kabid_kkd', 'kabid_bmd', 'kabid_ti', 'ketua_tim', 'pegawai'].includes(editForm.role);
    if (requiresBidang && !editForm.bidang_id) {
      toast.error('Role ini memerlukan bidang');
      return;
    }

    try {
      setUpdating(true);
      
      await api.put(`/users/${selectedUser.id}`, {
        role: editForm.role,
        bidang_id: editForm.bidang_id || null
      });

      toast.success('Role berhasil diupdate');
      setShowEditModal(false);
      setSelectedUser(null);
      setEditForm({ role: '', bidang_id: '' });
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error.response?.data?.message || 'Gagal mengupdate role');
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const roleConfig = roleOptions.find(r => r.value === role);
    const color = roleConfig?.color || 'gray';
    
    const colors = {
      red: 'bg-red-100 text-red-700 border-red-300',
      purple: 'bg-purple-100 text-purple-700 border-purple-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      green: 'bg-green-100 text-green-700 border-green-300',
      teal: 'bg-teal-100 text-teal-700 border-teal-300',
      gray: 'bg-gray-100 text-gray-700 border-gray-300'
    };
    
    return colors[color];
  };

  const getRoleLabel = (role) => {
    const roleConfig = roleOptions.find(r => r.value === role);
    return roleConfig?.label || role;
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchSearch = !searchQuery || 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchRole = !filterRole || user.role === filterRole;
    const matchBidang = !filterBidang || user.bidang_id?.toString() === filterBidang;
    
    return matchSearch && matchRole && matchBidang;
  });

  // Calculate statistics
  const stats = {
    total: users.length,
    byRole: roleOptions.map(role => ({
      ...role,
      count: users.filter(u => u.role === role.value).length
    }))
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiUsers className="text-blue-600 text-2xl" />
                </div>
                Manajemen Role Pegawai
              </h1>
              <p className="text-gray-600 mt-2">
                Kelola role dan akses pegawai DPMD Kabupaten Bogor
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.byRole.filter(r => r.count > 0).map((stat) => (
              <div key={stat.value} className={`rounded-xl p-4 border-2 ${getRoleBadgeColor(stat.value)}`}>
                <div className="text-2xl font-bold">{stat.count}</div>
                <div className="text-xs mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau email..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>
            
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
            >
              <option value="">Semua Role</option>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <select
              value={filterBidang}
              onChange={(e) => setFilterBidang(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
            >
              <option value="">Semua Bidang</option>
              {bidangs.map((bidang) => (
                <option key={bidang.id} value={bidang.id}>
                  {bidang.nama_bidang}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Pegawai
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Bidang
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center text-gray-500">
                      <FiRefreshCw className="animate-spin h-10 w-10 mx-auto mb-3 text-blue-600" />
                      <div className="text-lg font-medium">Memuat data...</div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center text-gray-500">
                      <FiAlertCircle className="h-10 w-10 mx-auto mb-3 text-yellow-500" />
                      <div className="text-lg font-medium">Tidak ada data</div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border-2 ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {user.bidang?.nama_bidang || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditRole(user)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <FiEdit2 />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Edit Role Pegawai</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-4">
                <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {selectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{selectedUser.name}</div>
                  <div className="text-sm text-gray-600">{selectedUser.email}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  >
                    <option value="">Pilih Role</option>
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bidang
                  </label>
                  <select
                    value={editForm.bidang_id}
                    onChange={(e) => setEditForm({ ...editForm, bidang_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    disabled={['superadmin', 'admin', 'kepala_dinas', 'sekretaris_dinas'].includes(editForm.role)}
                  >
                    <option value="">Pilih Bidang</option>
                    {bidangs.map((bidang) => (
                      <option key={bidang.id} value={bidang.id}>
                        {bidang.nama_bidang}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Wajib diisi untuk Kepala Bidang, Ketua Tim, dan Pegawai
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={updating}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={updating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50"
              >
                {updating ? (
                  <span className="flex items-center justify-center gap-2">
                    <FiRefreshCw className="animate-spin" />
                    Menyimpan...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <FiCheck />
                    Simpan
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRolesPage;
