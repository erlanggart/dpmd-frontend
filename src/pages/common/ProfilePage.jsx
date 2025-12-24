import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiShield, FiEdit2, FiSave, FiX, FiCamera, FiArrowLeft } from 'react-icons/fi';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
  });
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || null);

  const roleLabels = {
    kepala_dinas: 'Kepala Dinas',
    sekretaris_dinas: 'Sekretaris Dinas',
    kepala_bidang: 'Kepala Bidang',
    pegawai: 'Pegawai',
    superadmin: 'Super Admin',
    admin: 'Admin',
    desa: 'Desa',
    sarpras: 'Sarpras'
  };

  const roleColors = {
    kepala_dinas: 'blue',
    sekretaris_dinas: 'purple',
    kepala_bidang: 'green',
    pegawai: 'orange',
    superadmin: 'red',
    admin: 'indigo',
    desa: 'teal',
    sarpras: 'pink'
  };

  const color = roleColors[user.role] || 'blue';

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nama tidak boleh kosong');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Email tidak valid');
      return;
    }

    setIsLoading(true);
    
    try {
      // Call API to update user profile
      const response = await api.put(`/users/${user.id}`, {
        name: formData.name.trim(),
        email: formData.email.trim()
      });

      if (response.data.success) {
        const updatedUser = {
          ...user,
          name: formData.name.trim(),
          email: formData.email.trim()
        };
        
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('userProfileUpdated'));
        
        setIsEditing(false);
        toast.success('Profil berhasil diperbarui!');
      } else {
        toast.error(response.data.message || 'Gagal memperbarui profil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Gagal memperbarui profil. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || '',
      email: user.email || ''
    });
    setIsEditing(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post(`/users/${user.id}/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const avatarPath = response.data.data.avatar;
        setAvatarUrl(avatarPath);
        
        const updatedUser = {
          ...user,
          avatar: avatarPath
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('userProfileUpdated'));
        
        toast.success('Foto profil berhasil diperbarui!');
      } else {
        toast.error(response.data.message || 'Gagal mengupload foto');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(error.response?.data?.message || 'Gagal mengupload foto. Silakan coba lagi.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`bg-gradient-to-r from-${color}-600 to-${color}-700 text-white px-4 py-6`}>
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <FiArrowLeft className="h-5 w-5" />
            <span>Kembali</span>
          </button>
          
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Profil Saya</h1>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
              >
                <FiEdit2 className="h-4 w-4" />
                <span className="text-sm font-medium">Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 -mt-8">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              {avatarUrl ? (
                <img 
                  src={avatarUrl.startsWith('http') ? avatarUrl : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '')}${avatarUrl}`}
                  alt={user.name}
                  className={`h-24 w-24 rounded-full object-cover shadow-lg border-4 border-${color}-200`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`h-24 w-24 bg-gradient-to-br from-${color}-500 to-${color}-700 rounded-full flex items-center justify-center shadow-lg ${avatarUrl ? 'hidden' : ''}`}
                style={{ display: avatarUrl ? 'none' : 'flex' }}
              >
                <span className="text-white font-bold text-3xl">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <label 
                htmlFor="avatar-upload"
                className={`absolute bottom-0 right-0 h-8 w-8 bg-${color}-600 rounded-full flex items-center justify-center shadow-md hover:bg-${color}-700 transition-all cursor-pointer ${isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploadingPhoto ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <FiCamera className="h-4 w-4 text-white" />
                )}
              </label>
              <input 
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto}
                className="hidden"
              />
            </div>
            
            {!isEditing && (
              <div className="text-center mt-4">
                <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
                <span className={`inline-block mt-2 px-3 py-1 bg-${color}-100 text-${color}-700 rounded-full text-sm font-medium`}>
                  {roleLabels[user.role] || user.role}
                </span>
              </div>
            )}
          </div>

          {/* Info Form */}
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiUser className="inline h-4 w-4 mr-1" />
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMail className="inline h-4 w-4 mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiShield className="inline h-4 w-4 mr-1" />
                  Role
                </label>
                <input
                  type="text"
                  value={roleLabels[user.role] || user.role}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiX className="h-5 w-5" />
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-${color}-500 to-${color}-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <FiSave className="h-5 w-5" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <FiUser className={`h-5 w-5 text-${color}-600 mt-0.5`} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Nama Lengkap</p>
                  <p className="font-semibold text-gray-800">{user.name || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <FiMail className={`h-5 w-5 text-${color}-600 mt-0.5`} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="font-semibold text-gray-800">{user.email || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <FiShield className={`h-5 w-5 text-${color}-600 mt-0.5`} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Role</p>
                  <p className="font-semibold text-gray-800">{roleLabels[user.role] || user.role}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">Informasi Akun</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">User ID</span>
              <span className="font-semibold text-gray-800">{user.id || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Status</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Aktif
              </span>
            </div>
            {user.desa_id && (
              <div className="flex justify-between py-2">
                <span className="text-gray-600">ID Desa</span>
                <span className="font-semibold text-gray-800">{user.desa_id}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
