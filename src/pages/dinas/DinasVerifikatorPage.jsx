  import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { LuUsers, LuPlus, LuPencil, LuTrash2, LuKey, LuToggleLeft, LuToggleRight, LuMail, LuUser, LuIdCard, LuBriefcase, LuLock, LuMapPin, LuCheck, LuSquare, LuSearch } from 'react-icons/lu';

const DinasVerifikatorPage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const dinasId = user.dinas_id;
  
  // Only manager roles can access this page
  const allowedRoles = ['dinas_terkait', 'superadmin', 'kepala_dinas', 'sekretaris_dinas'];

  const [loading, setLoading] = useState(false);
  const [verifikators, setVerifikators] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAksesDesaModal, setShowAksesDesaModal] = useState(false);
  const [selectedVerifikator, setSelectedVerifikator] = useState(null);
  const [aksesDesa, setAksesDesa] = useState([]);
  const [availableDesas, setAvailableDesas] = useState([]);
  const [selectedDesas, setSelectedDesas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [kecamatans, setKecamatans] = useState([]);
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [showKecamatanDropdown, setShowKecamatanDropdown] = useState(false);
  const [kecamatanSearch, setKecamatanSearch] = useState('');
  const [formData, setFormData] = useState({
    nama: '',
    nip: '',
    jabatan: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    // Check role access
    if (!allowedRoles.includes(user.role)) {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: 'Anda tidak memiliki akses ke halaman ini.'
      }).then(() => {
        navigate('/dinas/dashboard');
      });
      return;
    }
    
    if (!dinasId) {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Terbatas',
        text: 'Anda tidak memiliki akses ke halaman ini.'
      });
      return;
    }
    fetchVerifikators();
  }, [dinasId, user.role]);

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
    const result = await Swal.fire({
      title: 'Buat Password Baru',
      html: `
        <p class="text-sm text-gray-600 mb-3">Masukkan password baru untuk <strong>${verifikator.nama}</strong></p>
        <input id="swal-new-password" type="text" class="swal2-input" placeholder="Masukkan password baru" style="font-size: 14px;">
        <p class="text-xs text-gray-400 mt-1">Minimal 6 karakter</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Simpan Password',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const password = document.getElementById('swal-new-password').value;
        if (!password || password.length < 6) {
          Swal.showValidationMessage('Password minimal 6 karakter');
          return false;
        }
        return password;
      }
    });

    if (result.isConfirmed && result.value) {
      try {
        const response = await api.post(`/dinas/${dinasId}/verifikator/${verifikator.id}/reset-password`, {
          new_password: result.value
        });
        const newPassword = response.data?.data?.newPassword || response.data?.newPassword;
        
        await Swal.fire({
          title: 'Password Baru Berhasil Dibuat',
          html: `
            <div class="text-left">
              <p class="mb-3">Password baru untuk <strong>${verifikator.nama}</strong>:</p>
              <div class="bg-gray-100 p-3 rounded-lg font-mono text-lg text-center select-all">
                ${newPassword}
              </div>
              <p class="text-sm text-gray-500 mt-3">⚠️ Simpan password ini! Password hanya ditampilkan sekali.</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Saya Sudah Menyimpan'
        });
      } catch (error) {
        console.error('Error creating new password:', error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: error.response?.data?.message || 'Gagal membuat password baru'
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

  // Akses Desa Functions
  const openAksesDesaModal = async (verifikator) => {
    setSelectedVerifikator(verifikator);
    setShowAksesDesaModal(true);
    setSelectedKecamatan('');
    setSelectedDesas([]);
    setSearchTerm('');
    setLoading(true);
    try {
      const [aksesResponse, availableResponse] = await Promise.all([
        api.get(`/dinas/verifikator/${verifikator.id}/akses-desa`),
        api.get(`/dinas/verifikator/${verifikator.id}/akses-desa/available`)
      ]);
      setAksesDesa(aksesResponse.data.data || []);
      setAvailableDesas(availableResponse.data.data || []);
      
      // Extract unique kecamatans from available desas
      const uniqueKecamatans = [...new Set(availableResponse.data.data.map(desa => desa.nama_kecamatan))]
        .sort();
      setKecamatans(uniqueKecamatans);
    } catch (error) {
      console.error('Error fetching akses desa:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal memuat data akses desa'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAksesDesa = async () => {
    if (selectedDesas.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Desa',
        text: 'Pilih minimal 1 desa untuk ditambahkan'
      });
      return;
    }

    try {
      setLoading(true);
      await api.post(`/dinas/verifikator/${selectedVerifikator.id}/akses-desa`, {
        desa_ids: selectedDesas
      });
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: `${selectedDesas.length} desa berhasil ditambahkan`,
        timer: 2000
      });
      setSelectedDesas([]);
      setSelectedKecamatan('');
      // Refresh data
      const [aksesResponse, availableResponse] = await Promise.all([
        api.get(`/dinas/verifikator/${selectedVerifikator.id}/akses-desa`),
        api.get(`/dinas/verifikator/${selectedVerifikator.id}/akses-desa/available`)
      ]);
      setAksesDesa(aksesResponse.data.data || []);
      setAvailableDesas(availableResponse.data.data || []);
      
      // Update kecamatans list
      const uniqueKecamatans = [...new Set(availableResponse.data.data.map(desa => desa.nama_kecamatan))]
        .sort();
      setKecamatans(uniqueKecamatans);
    } catch (error) {
      console.error('Error adding akses desa:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.response?.data?.message || 'Gagal menambahkan akses desa'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAksesDesa = async (aksesId, namaDesaRemove) => {
    const result = await Swal.fire({
      title: 'Hapus Akses?',
      text: `Hapus akses verifikator ke desa ${namaDesaRemove}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await api.delete(`/dinas/verifikator/${selectedVerifikator.id}/akses-desa/${aksesId}`);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Akses desa berhasil dihapus',
          timer: 2000
        });
        // Refresh data
        const [aksesResponse, availableResponse] = await Promise.all([
          api.get(`/dinas/verifikator/${selectedVerifikator.id}/akses-desa`),
          api.get(`/dinas/verifikator/${selectedVerifikator.id}/akses-desa/available`)
        ]);
        setAksesDesa(aksesResponse.data.data || []);
        setAvailableDesas(availableResponse.data.data || []);
        
        // Update kecamatans list
        const uniqueKecamatans = [...new Set(availableResponse.data.data.map(desa => desa.nama_kecamatan))]
          .sort();
        setKecamatans(uniqueKecamatans);
        setSelectedKecamatan('');
        setSelectedDesas([]);
      } catch (error) {
        console.error('Error removing akses desa:', error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal menghapus akses desa'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleDesaSelection = (desaId) => {
    setSelectedDesas(prev =>
      prev.includes(desaId)
        ? prev.filter(id => id !== desaId)
        : [...prev, desaId]
    );
  };

  const filteredAvailableDesas = availableDesas.filter(desa => {
    // Filter by selected kecamatan first
    if (selectedKecamatan && desa.nama_kecamatan !== selectedKecamatan) {
      return false;
    }
    // Then filter by search term
    if (searchTerm) {
      return desa.nama.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

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
                            onClick={() => openAksesDesaModal(verifikator)}
                            className="text-green-600 hover:text-green-900 p-1.5 hover:bg-green-50 rounded transition-colors"
                            title="Kelola Akses Desa"
                          >
                            <LuMapPin className="w-4 h-4" />
                          </button>
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
                            title="Buat Password Baru"
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
                        Untuk membuat password baru, gunakan tombol kunci di daftar verifikator.
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

        {/* Akses Desa Modal - Modern Redesign */}
        {showAksesDesaModal && selectedVerifikator && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-4 sm:px-6 py-4 sm:py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                      <LuMapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">Kelola Akses Wilayah</h2>
                      <p className="text-blue-100 text-xs sm:text-sm mt-0.5 flex items-center gap-1.5">
                        <LuUser className="w-3.5 h-3.5" />
                        {selectedVerifikator.nama}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAksesDesaModal(false);
                      setSelectedVerifikator(null);
                      setSelectedDesas([]);
                      setSearchTerm('');
                      setSelectedKecamatan('');
                    }}
                    className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-xl transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content area with responsive grid */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gradient-to-b from-gray-50 to-white">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  
                  {/* Left Panel - Desa dengan Akses */}
                  <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-3 sm:px-5 py-3 sm:py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg">
                            <LuCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <h3 className="font-semibold text-white text-sm sm:text-base">Desa dengan Akses</h3>
                        </div>
                        <span className="bg-white/30 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 rounded-full">
                          {aksesDesa.length}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-3 sm:p-4 max-h-[250px] sm:max-h-[400px] overflow-y-auto">
                      {aksesDesa.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                          <div className="bg-gray-100 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <LuMapPin className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 text-sm sm:text-base font-medium">Belum ada akses desa</p>
                          <p className="text-gray-400 text-xs sm:text-sm mt-1">Tambahkan desa dari panel sebelah</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {aksesDesa.map((akses, index) => (
                            <div
                              key={akses.id}
                              className="group flex items-center justify-between bg-gradient-to-r from-gray-50 to-white p-2.5 sm:p-3.5 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-200"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <div className="bg-emerald-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                                  <LuMapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-800 text-xs sm:text-sm truncate">{akses.nama_desa}</p>
                                  <p className="text-gray-500 text-[10px] sm:text-xs flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                                    Kec. {akses.nama_kecamatan}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveAksesDesa(akses.id, akses.nama_desa)}
                                className="opacity-50 sm:opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 p-1.5 sm:p-2 rounded-lg transition-all duration-200"
                                title="Hapus akses"
                              >
                                <LuTrash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Panel - Tambah Akses Desa */}
                  <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-3 sm:px-5 py-3 sm:py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg">
                            <LuPlus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <h3 className="font-semibold text-white text-sm sm:text-base">Tambah Akses</h3>
                        </div>
                        {selectedDesas.length > 0 && (
                          <span className="bg-white text-blue-600 text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 rounded-full animate-pulse">
                            {selectedDesas.length} dipilih
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-3 sm:p-4">
                      {/* Kecamatan Selector - Custom Dropdown */}
                      <div className="mb-3 sm:mb-4 relative">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                          Pilih Kecamatan <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowKecamatanDropdown(!showKecamatanDropdown)}
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r ${selectedKecamatan ? 'from-blue-50 to-indigo-50 border-blue-300' : 'from-gray-50 to-gray-100 border-gray-200'} border rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer hover:shadow-md flex items-center justify-between`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${selectedKecamatan ? 'bg-blue-100' : 'bg-gray-200'}`}>
                                <LuMapPin className={`w-3.5 h-3.5 ${selectedKecamatan ? 'text-blue-600' : 'text-gray-500'}`} />
                              </div>
                              <span className={selectedKecamatan ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                                {selectedKecamatan || '-- Pilih Kecamatan --'}
                              </span>
                            </div>
                            <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-200 ${showKecamatanDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {/* Dropdown Panel */}
                          {showKecamatanDropdown && (
                            <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn">
                              {/* Search Input */}
                              <div className="p-2 border-b border-gray-100 bg-gray-50">
                                <div className="relative">
                                  <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <input
                                    type="text"
                                    placeholder="Cari kecamatan..."
                                    value={kecamatanSearch}
                                    onChange={(e) => setKecamatanSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                  />
                                </div>
                              </div>
                              
                              {/* Kecamatan List */}
                              <div className="max-h-[200px] sm:max-h-[280px] overflow-y-auto">
                                {kecamatans
                                  .filter(kec => kec.toLowerCase().includes(kecamatanSearch.toLowerCase()))
                                  .map((kec, index) => (
                                    <button
                                      key={kec}
                                      type="button"
                                      onClick={() => {
                                        setSelectedKecamatan(kec);
                                        setSelectedDesas([]);
                                        setSearchTerm('');
                                        setShowKecamatanDropdown(false);
                                        setKecamatanSearch('');
                                      }}
                                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 transition-all duration-150 ${
                                        selectedKecamatan === kec
                                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                                          : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-gray-700'
                                      }`}
                                    >
                                      <div className={`p-1.5 rounded-lg ${selectedKecamatan === kec ? 'bg-white/20' : 'bg-gray-100'}`}>
                                        <LuMapPin className={`w-3.5 h-3.5 ${selectedKecamatan === kec ? 'text-white' : 'text-gray-500'}`} />
                                      </div>
                                      <span className="text-xs sm:text-sm font-medium flex-1 text-left">{kec}</span>
                                      {selectedKecamatan === kec && (
                                        <LuCheck className="w-4 h-4 text-white" />
                                      )}
                                    </button>
                                  ))}
                                {kecamatans.filter(kec => kec.toLowerCase().includes(kecamatanSearch.toLowerCase())).length === 0 && (
                                  <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                    Tidak ditemukan kecamatan
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Click outside to close dropdown */}
                      {showKecamatanDropdown && (
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => {
                            setShowKecamatanDropdown(false);
                            setKecamatanSearch('');
                          }}
                        />
                      )}

                      {/* Search Input */}
                      {selectedKecamatan && (
                        <div className="relative mb-3 sm:mb-4">
                          <LuSearch className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                          <input
                            type="text"
                            placeholder="Cari nama desa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                      )}

                      {/* Desa List */}
                      <div className="bg-gray-50 rounded-xl p-2 sm:p-3 max-h-[200px] sm:max-h-[260px] overflow-y-auto">
                        {!selectedKecamatan ? (
                          <div className="text-center py-8 sm:py-10">
                            <div className="bg-blue-100 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                              <LuMapPin className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />
                            </div>
                            <p className="text-gray-600 text-xs sm:text-sm font-medium">Pilih kecamatan terlebih dahulu</p>
                            <p className="text-gray-400 text-[10px] sm:text-xs mt-1">untuk melihat daftar desa</p>
                          </div>
                        ) : filteredAvailableDesas.length === 0 ? (
                          <div className="text-center py-8 sm:py-10">
                            <div className="bg-amber-100 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                              <LuCheck className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500" />
                            </div>
                            <p className="text-gray-600 text-xs sm:text-sm font-medium">
                              {searchTerm ? 'Tidak ditemukan' : 'Semua desa sudah memiliki akses'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 sm:space-y-2">
                            {filteredAvailableDesas.map((desa, index) => (
                              <div
                                key={desa.id}
                                onClick={() => toggleDesaSelection(Number(desa.id))}
                                className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl cursor-pointer transition-all duration-200 ${
                                  selectedDesas.includes(Number(desa.id))
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/25 scale-[1.02]'
                                    : 'bg-white hover:bg-gray-100 border border-gray-100'
                                }`}
                                style={{ animationDelay: `${index * 30}ms` }}
                              >
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                  selectedDesas.includes(Number(desa.id))
                                    ? 'bg-white'
                                    : 'border-2 border-gray-300'
                                }`}>
                                  {selectedDesas.includes(Number(desa.id)) && (
                                    <LuCheck className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium text-xs sm:text-sm truncate ${
                                    selectedDesas.includes(Number(desa.id)) ? 'text-white' : 'text-gray-800'
                                  }`}>{desa.nama}</p>
                                  <p className={`text-[10px] sm:text-xs ${
                                    selectedDesas.includes(Number(desa.id)) ? 'text-blue-100' : 'text-gray-500'
                                  }`}>Kec. {desa.nama_kecamatan}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Button */}
                      {selectedDesas.length > 0 && (
                        <button
                          onClick={handleAddAksesDesa}
                          disabled={loading}
                          className="w-full mt-3 sm:mt-4 px-4 py-2.5 sm:py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 font-semibold text-xs sm:text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Menambahkan...</span>
                            </>
                          ) : (
                            <>
                              <LuPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                              <span>Tambahkan {selectedDesas.length} Desa</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DinasVerifikatorPage;
