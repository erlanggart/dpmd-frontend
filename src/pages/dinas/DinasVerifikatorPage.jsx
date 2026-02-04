import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { LuUsers, LuPlus, LuPencil, LuTrash2, LuKey, LuToggleLeft, LuToggleRight, LuMail, LuUser, LuIdCard, LuBriefcase, LuLock } from 'react-icons/lu';

const DinasVerifikatorPage = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const dinasId = user.dinas_id;

  const [loading, setLoading] = useState(false);
  const [verifikators, setVerifikators] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVerifikator, setSelectedVerifikator] = useState(null);
  const [formData, setFormData] = useState({
    nama: '',
    nip: '',
    jabatan: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    if (!dinasId) {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Terbatas',
        text: 'Anda tidak memiliki akses ke halaman ini.'
      });
      return;
    }
    fetchVerifikators();
  }, [dinasId]);

  const fetchVerifikators = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dinas/${dinasId}/verifikator`);
      if (response.data.success) {
        setVerifikators(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching verifikators:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal mengambil data verifikator'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nama: '',
      nip: '',
      jabatan: '',
      email: '',
      password: ''
    });
  };

  const handleAddVerifikator = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.nama || !formData.jabatan || !formData.email || !formData.password) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Tidak Lengkap',
        text: 'Semua field wajib diisi kecuali NIP'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(`/dinas/${dinasId}/verifikator`, formData);
      
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Verifikator berhasil ditambahkan',
          timer: 2000
        });
        setShowAddModal(false);
        resetForm();
        fetchVerifikators();
      }
    } catch (error) {
      console.error('Error adding verifikator:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.message || 'Gagal menambahkan verifikator'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditVerifikator = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const { nama, nip, jabatan, email } = formData;
      const response = await api.put(`/dinas/${dinasId}/verifikator/${selectedVerifikator.id}`, {
        nama, nip, jabatan, email
      });
      
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Data verifikator berhasil diupdate',
          timer: 2000
        });
        setShowEditModal(false);
        setSelectedVerifikator(null);
        resetForm();
        fetchVerifikators();
      }
    } catch (error) {
      console.error('Error updating verifikator:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.message || 'Gagal mengupdate verifikator'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (verifikator) => {
    try {
      const response = await api.patch(`/dinas/${dinasId}/verifikator/${verifikator.id}/toggle-status`);
      
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: response.data.message,
          timer: 2000
        });
        fetchVerifikators();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal mengubah status verifikator'
      });
    }
  };

  const handleResetPassword = async (verifikator) => {
    const { value: newPassword } = await Swal.fire({
      title: 'Reset Password',
      text: `Reset password untuk ${verifikator.nama}?`,
      input: 'password',
      inputLabel: 'Password Baru',
      inputPlaceholder: 'Masukkan password baru (min. 6 karakter)',
      inputAttributes: {
        minlength: 6
      },
      showCancelButton: true,
      confirmButtonText: 'Reset',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444',
      inputValidator: (value) => {
        if (!value || value.length < 6) {
          return 'Password minimal 6 karakter!';
        }
      }
    });

    if (newPassword) {
      try {
        const response = await api.post(`/dinas/${dinasId}/verifikator/${verifikator.id}/reset-password`, {
          new_password: newPassword
        });
        
        if (response.data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: `Password untuk ${verifikator.nama} berhasil direset`,
            timer: 2000
          });
        }
      } catch (error) {
        console.error('Error resetting password:', error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal reset password'
        });
      }
    }
  };

  const handleDeleteVerifikator = async (verifikator) => {
    const result = await Swal.fire({
      title: 'Hapus Verifikator?',
      html: `Anda yakin ingin menghapus verifikator <strong>${verifikator.nama}</strong>?<br/>
             <small class="text-gray-500">Akun user juga akan terhapus.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      try {
        const response = await api.delete(`/dinas/${dinasId}/verifikator/${verifikator.id}`);
        
        if (response.data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Verifikator berhasil dihapus',
            timer: 2000
          });
          fetchVerifikators();
        }
      } catch (error) {
        console.error('Error deleting verifikator:', error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal menghapus verifikator'
        });
      }
    }
  };

  const openEditModal = (verifikator) => {
    setSelectedVerifikator(verifikator);
    setFormData({
      nama: verifikator.nama,
      nip: verifikator.nip || '',
      jabatan: verifikator.jabatan,
      email: verifikator.email,
      password: '' // Not editable in edit mode
    });
    setShowEditModal(true);
  };

  if (loading && verifikators.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <LuUsers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kelola Verifikator</h1>
                <p className="text-sm text-gray-600">Buat dan kelola akun verifikator untuk dinas</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <LuPlus className="w-5 h-5" />
              Tambah Verifikator
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <LuUsers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Tentang Verifikator</h3>
              <p className="text-sm text-blue-800">
                Verifikator adalah akun khusus yang dibuat oleh dinas untuk melakukan verifikasi proposal bankeu. 
                Verifikator dapat login menggunakan <strong>email dan password</strong> yang sudah didaftarkan, 
                lalu mengakses halaman verifikasi tanpa perlu akses penuh sebagai dinas.
              </p>
            </div>
          </div>
        </div>

        {/* Verifikator List */}
        {verifikators.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <LuUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum Ada Verifikator</h3>
            <p className="text-gray-500 mb-4">Mulai dengan menambahkan verifikator pertama</p>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <LuPlus className="w-4 h-4" />
              Tambah Verifikator
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jabatan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email (Login)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {verifikators.map((verifikator) => (
                    <tr key={verifikator.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <LuUser className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{verifikator.nama}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {verifikator.nip || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {verifikator.jabatan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <LuMail className="w-4 h-4" />
                          {verifikator.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(verifikator)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            verifikator.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {verifikator.is_active ? (
                            <>
                              <LuToggleRight className="w-4 h-4" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <LuToggleLeft className="w-4 h-4" />
                              Nonaktif
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(verifikator)}
                            className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <LuPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(verifikator)}
                            className="text-amber-600 hover:text-amber-900 p-1.5 hover:bg-amber-50 rounded transition-colors"
                            title="Reset Password"
                          >
                            <LuKey className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVerifikator(verifikator)}
                            className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded transition-colors"
                            title="Hapus"
                          >
                            <LuTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Tambah Verifikator Baru</h2>
                <form onSubmit={handleAddVerifikator}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <LuUser className="w-4 h-4 inline mr-1" />
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nama}
                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nama lengkap verifikator"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <LuIdCard className="w-4 h-4 inline mr-1" />
                        NIP (Opsional)
                      </label>
                      <input
                        type="text"
                        value={formData.nip}
                        onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="NIP verifikator"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <LuBriefcase className="w-4 h-4 inline mr-1" />
                        Jabatan <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.jabatan}
                        onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Jabatan verifikator"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <LuMail className="w-4 h-4 inline mr-1" />
                        Email (untuk Login) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="email@example.com"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email ini akan digunakan untuk login</p>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Password</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <LuLock className="w-4 h-4 inline mr-1" />
                          Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Minimal 6 karakter"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        resetForm();
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Verifikator</h2>
                <form onSubmit={handleEditVerifikator}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <LuUser className="w-4 h-4 inline mr-1" />
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={formData.nama}
                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <LuIdCard className="w-4 h-4 inline mr-1" />
                        NIP
                      </label>
                      <input
                        type="text"
                        value={formData.nip}
                        onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <LuBriefcase className="w-4 h-4 inline mr-1" />
                        Jabatan
                      </label>
                      <input
                        type="text"
                        value={formData.jabatan}
                        onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <LuMail className="w-4 h-4 inline mr-1" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600">
                        <LuLock className="w-3 h-3 inline mr-1" />
                        Untuk reset password, gunakan tombol "Reset Password" di daftar verifikator.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedVerifikator(null);
                        resetForm();
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DinasVerifikatorPage;
