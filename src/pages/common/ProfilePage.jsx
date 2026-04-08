import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiUser, FiMail, FiShield, FiEdit2, FiX, FiCamera, FiArrowLeft,
  FiLogOut, FiLock, FiEye, FiEyeOff, FiPhone, FiMapPin, FiCalendar,
  FiBriefcase, FiBook, FiHash, FiChevronRight, FiCheck, FiAward, FiStar
} from 'react-icons/fi';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { getAvatarUrl } from '../../utils/avatarUtils';
import AvatarCropModal from '../../components/AvatarCropModal';

const STATUS_OPTIONS = [
  { value: '', label: '— Pilih —' },
  { value: 'PNS', label: 'PNS' },
  { value: 'PPPK', label: 'PPPK' },
  { value: 'PPPK_Paruh_Waktu', label: 'PPPK Paruh Waktu' },
  { value: 'Honorer', label: 'Honorer' },
  { value: 'THL', label: 'THL' },
  { value: 'Kontrak', label: 'Kontrak' },
  { value: 'Tenaga_Alih_Daya', label: 'Tenaga Alih Daya' },
];

const GENDER_OPTIONS = [
  { value: '', label: '— Pilih —' },
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
];

const PENDIDIKAN_OPTIONS = [
  { value: '', label: '— Pilih —' },
  { value: 'SD', label: 'SD' },
  { value: 'SMP', label: 'SMP' },
  { value: 'SMA', label: 'SMA/SMK' },
  { value: 'D3', label: 'D3' },
  { value: 'S1', label: 'S1' },
  { value: 'S2', label: 'S2' },
  { value: 'S3', label: 'S3' },
];

// Reusable display field
const InfoField = ({ icon: Icon, label, value, iconColor = 'text-gray-400' }) => (
  <div className="flex items-start gap-3 py-3">
    <div className={`w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 ${iconColor}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{value || <span className="text-gray-300 italic font-normal">Belum diisi</span>}</p>
    </div>
  </div>
);

// Reusable edit field
const EditField = ({ label, name, value, onChange, type = 'text', options, placeholder }) => (
  <div>
    <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{label}</label>
    {options ? (
      <select
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : type === 'textarea' ? (
      <textarea
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        rows={3}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none resize-none"
        placeholder={placeholder}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none"
        placeholder={placeholder}
      />
    )}
  </div>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [avatarUrl, setAvatarUrl] = useState(getAvatarUrl(user.avatar));
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [editingSection, setEditingSection] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [accountForm, setAccountForm] = useState({ name: user.name || '', email: user.email || '' });
  const [pegawaiData, setPegawaiData] = useState(null);
  const [pegawaiLoading, setPegawaiLoading] = useState(false);
  const [pegawaiForm, setPegawaiForm] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  const roleLabels = {
    kepala_dinas: 'Kepala Dinas', sekretaris_dinas: 'Sekretaris Dinas',
    kepala_bidang: 'Kepala Bidang', ketua_tim: 'Ketua Tim', pegawai: 'Pegawai',
    superadmin: 'Super Admin', desa: 'Desa', kecamatan: 'Kecamatan',
    dinas_terkait: 'Dinas Terkait', verifikator_dinas: 'Verifikator Dinas',
  };

  const roleGradients = {
    kepala_dinas: 'from-blue-600 via-blue-500 to-cyan-400',
    sekretaris_dinas: 'from-purple-600 via-purple-500 to-pink-400',
    kepala_bidang: 'from-emerald-600 via-emerald-500 to-teal-400',
    ketua_tim: 'from-amber-600 via-amber-500 to-yellow-400',
    pegawai: 'from-orange-600 via-orange-500 to-amber-400',
    superadmin: 'from-red-600 via-red-500 to-rose-400',
    desa: 'from-teal-600 via-teal-500 to-cyan-400',
    kecamatan: 'from-indigo-600 via-indigo-500 to-blue-400',
    dinas_terkait: 'from-pink-600 via-pink-500 to-rose-400',
    verifikator_dinas: 'from-violet-600 via-violet-500 to-purple-400',
  };

  const gradient = roleGradients[user.role] || 'from-gray-600 via-gray-500 to-gray-400';

  const initPegawaiForm = (data) => {
    setPegawaiForm({
      nip: data.nip || '',
      jabatan: data.jabatan || '',
      golongan: data.golongan || '',
      pangkat: data.pangkat || '',
      eselon: data.eselon || '',
      jenis_kelamin: data.jenis_kelamin || '',
      tempat_lahir: data.tempat_lahir || '',
      tanggal_lahir: data.tanggal_lahir ? new Date(data.tanggal_lahir).toISOString().split('T')[0] : '',
      pendidikan_terakhir: data.pendidikan_terakhir || '',
      status_kepegawaian: data.status_kepegawaian || '',
      no_hp: data.no_hp || '',
      alamat: data.alamat || '',
      tmt_jabatan: data.tmt_jabatan ? new Date(data.tmt_jabatan).toISOString().split('T')[0] : '',
      unit_kerja: data.unit_kerja || '',
    });
  };

  const fetchPegawaiData = async () => {
    if (!user.pegawai_id) return;
    setPegawaiLoading(true);
    try {
      const res = await api.get(`/pegawai/${user.pegawai_id}`);
      if (res.data.success) {
        setPegawaiData(res.data.data);
        initPegawaiForm(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching pegawai:', err);
    } finally {
      setPegawaiLoading(false);
    }
  };

  useEffect(() => { fetchPegawaiData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (d) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const statusLabel = (s) => s?.replace(/_/g, ' ') || null;

  const handleLogout = () => {
    localStorage.removeItem('expressToken');
    localStorage.removeItem('user');
    toast.success('Berhasil keluar');
    navigate('/');
  };

  const handleSaveAccount = async () => {
    if (!accountForm.name.trim()) return toast.error('Nama tidak boleh kosong');
    if (!accountForm.email.trim() || !accountForm.email.includes('@')) return toast.error('Email tidak valid');
    setIsLoading(true);
    try {
      const res = await api.put(`/users/${user.id}`, { name: accountForm.name.trim(), email: accountForm.email.trim() });
      if (res.data.success) {
        const updated = { ...user, name: accountForm.name.trim(), email: accountForm.email.trim() };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        window.dispatchEvent(new Event('userProfileUpdated'));
        setEditingSection(null);
        toast.success('Profil berhasil diperbarui!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePegawai = async () => {
    setIsLoading(true);
    try {
      const payload = { ...pegawaiForm };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      const res = await api.put(`/pegawai/${user.pegawai_id}`, payload);
      if (res.data.success) {
        setPegawaiData(res.data.data);
        initPegawaiForm(res.data.data);
        setEditingSection(null);
        toast.success('Data kepegawaian berhasil diperbarui!');
        const updated = { ...user, nip: pegawaiForm.nip, jabatan: pegawaiForm.jabatan, status_kepegawaian: pegawaiForm.status_kepegawaian, tanggal_lahir: pegawaiForm.tanggal_lahir, pangkat: pegawaiForm.pangkat, golongan: pegawaiForm.golongan };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        window.dispatchEvent(new Event('userProfileUpdated'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) return toast.error('Semua field harus diisi');
    if (passwordForm.newPassword.length < 6) return toast.error('Password minimal 6 karakter');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return toast.error('Konfirmasi tidak cocok');
    setPasswordLoading(true);
    try {
      const res = await api.put('/users/change-password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      if (res.data.success) {
        toast.success('Password berhasil diubah!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ─── Photo review & crop states ───
  const [showPhotoReview, setShowPhotoReview] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('File harus berupa gambar');
    if (file.size > 10 * 1024 * 1024) return toast.error('Maksimal 10MB');
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropDone = async (croppedFile) => {
    setShowCropModal(false);
    setIsUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('avatar', croppedFile);
      const res = await api.post(`/users/${user.id}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        setAvatarUrl(getAvatarUrl(res.data.data.avatar));
        const updated = { ...user, avatar: res.data.data.avatar };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        window.dispatchEvent(new Event('userProfileUpdated'));
        toast.success('Foto profil diperbarui!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal upload foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Pribadi', icon: FiUser },
    ...(user.pegawai_id ? [{ id: 'employment', label: 'Kepegawaian', icon: FiBriefcase }] : []),
    { id: 'account', label: 'Akun', icon: FiShield },
  ];

  const SaveCancelButtons = ({ onSave, onCancel }) => (
    <div className="flex gap-2">
      <button onClick={onCancel} className="px-3.5 py-2 text-sm font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all">Batal</button>
      <button onClick={onSave} disabled={isLoading} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50">
        {isLoading ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> : <FiCheck className="w-3.5 h-3.5" />}
        Simpan
      </button>
    </div>
  );

  const EditButton = ({ onClick }) => (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all">
      <FiEdit2 className="w-3.5 h-3.5" /> Edit
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className={`bg-gradient-to-r ${gradient} px-4 pt-6 pb-28`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />

          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                <FiArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Kembali</span>
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowPasswordModal(true)} className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl transition-all backdrop-blur-sm" title="Ubah Password">
                  <FiLock className="h-4 w-4 text-white" />
                </button>
                <button onClick={handleLogout} className="p-2.5 bg-red-500 rounded-xl backdrop-blur-sm shadow-md" title="Keluar">
                  <FiLogOut className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="max-w-2xl mx-auto px-4 -mt-20 relative z-10">
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => avatarUrl && setShowPhotoReview(true)}
                  className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg cursor-pointer hover:ring-blue-200 transition-all"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  ) : null}
                  <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center ${avatarUrl ? 'hidden' : ''}`} style={{ display: avatarUrl ? 'none' : 'flex' }}>
                    <span className="text-white font-bold text-3xl">{user.name?.charAt(0).toUpperCase() || 'U'}</span>
                  </div>
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto} className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-xl shadow-md border border-gray-100 flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50">
                  {isUploadingPhoto ? (
                    <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  ) : (
                    <FiCamera className="h-3.5 w-3.5 text-gray-500" />
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} disabled={isUploadingPhoto} className="hidden" />
              </div>

              <div className="flex-1 text-center sm:text-left min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{user.name}</h1>
                {pegawaiData?.jabatan && <p className="text-sm text-gray-500 mt-0.5">{pegawaiData.jabatan}</p>}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r ${gradient} text-white rounded-full text-xs font-semibold shadow-sm`}>
                    <FiShield className="w-3 h-3" />
                    {roleLabels[user.role] || user.role}
                  </span>
                  {pegawaiData?.status_kepegawaian && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                      <FiAward className="w-3 h-3" />
                      {statusLabel(pegawaiData.status_kepegawaian)}
                    </span>
                  )}
                </div>
                {pegawaiData?.nip && <p className="text-xs text-gray-400 mt-2 font-mono">NIP: {pegawaiData.nip}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setEditingSection(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-2xl mx-auto px-4 mt-4 pb-8">

        {/* PERSONAL TAB */}
        {activeTab === 'personal' && user.pegawai_id && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Data Pribadi</h3>
                <p className="text-xs text-gray-400 mt-0.5">Informasi personal pegawai</p>
              </div>
              {editingSection !== 'personal'
                ? <EditButton onClick={() => { setEditingSection('personal'); if (pegawaiData) initPegawaiForm(pegawaiData); }} />
                : <SaveCancelButtons onSave={handleSavePegawai} onCancel={() => { setEditingSection(null); if (pegawaiData) initPegawaiForm(pegawaiData); }} />
              }
            </div>
            <div className="p-6">
              {pegawaiLoading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" /></div>
              ) : editingSection === 'personal' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <EditField label="Jenis Kelamin" name="jenis_kelamin" value={pegawaiForm.jenis_kelamin} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} options={GENDER_OPTIONS} />
                  <EditField label="Tempat Lahir" name="tempat_lahir" value={pegawaiForm.tempat_lahir} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} placeholder="Kota / Kabupaten" />
                  <EditField label="Tanggal Lahir" name="tanggal_lahir" value={pegawaiForm.tanggal_lahir} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} type="date" />
                  <EditField label="Pendidikan Terakhir" name="pendidikan_terakhir" value={pegawaiForm.pendidikan_terakhir} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} options={PENDIDIKAN_OPTIONS} />
                  <EditField label="No. HP" name="no_hp" value={pegawaiForm.no_hp} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} placeholder="08xxxxxxxxxx" />
                  <div className="sm:col-span-2">
                    <EditField label="Alamat" name="alamat" value={pegawaiForm.alamat} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} type="textarea" placeholder="Alamat lengkap" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <div className="space-y-0 divide-y divide-gray-50">
                    <InfoField icon={FiUser} label="Jenis Kelamin" value={pegawaiData?.jenis_kelamin === 'L' ? 'Laki-laki' : pegawaiData?.jenis_kelamin === 'P' ? 'Perempuan' : null} iconColor="text-blue-500" />
                    <InfoField icon={FiMapPin} label="Tempat Lahir" value={pegawaiData?.tempat_lahir} iconColor="text-rose-400" />
                    <InfoField icon={FiCalendar} label="Tanggal Lahir" value={formatDate(pegawaiData?.tanggal_lahir)} iconColor="text-amber-500" />
                  </div>
                  <div className="space-y-0 divide-y divide-gray-50">
                    <InfoField icon={FiBook} label="Pendidikan Terakhir" value={pegawaiData?.pendidikan_terakhir} iconColor="text-purple-500" />
                    <InfoField icon={FiPhone} label="No. HP" value={pegawaiData?.no_hp} iconColor="text-green-500" />
                    <InfoField icon={FiMapPin} label="Alamat" value={pegawaiData?.alamat} iconColor="text-teal-500" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'personal' && !user.pegawai_id && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiUser className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Data pribadi tidak tersedia</p>
            <p className="text-xs text-gray-400 mt-1">Akun Anda belum terhubung dengan data pegawai</p>
          </div>
        )}

        {/* EMPLOYMENT TAB */}
        {activeTab === 'employment' && user.pegawai_id && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Data Kepegawaian</h3>
                <p className="text-xs text-gray-400 mt-0.5">Jabatan, pangkat, dan status</p>
              </div>
              {editingSection !== 'employment'
                ? <EditButton onClick={() => { setEditingSection('employment'); if (pegawaiData) initPegawaiForm(pegawaiData); }} />
                : <SaveCancelButtons onSave={handleSavePegawai} onCancel={() => { setEditingSection(null); if (pegawaiData) initPegawaiForm(pegawaiData); }} />
              }
            </div>
            <div className="p-6">
              {pegawaiLoading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" /></div>
              ) : editingSection === 'employment' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <EditField label="NIP" name="nip" value={pegawaiForm.nip} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} placeholder="Nomor Induk Pegawai" />
                  <EditField label="Jabatan" name="jabatan" value={pegawaiForm.jabatan} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} placeholder="Jabatan" />
                  <EditField label="Status Kepegawaian" name="status_kepegawaian" value={pegawaiForm.status_kepegawaian} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} options={STATUS_OPTIONS} />
                  <EditField label="Pangkat" name="pangkat" value={pegawaiForm.pangkat} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} placeholder="Pangkat" />
                  <EditField label="Golongan" name="golongan" value={pegawaiForm.golongan} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} placeholder="cth: IV/a" />
                  <EditField label="Eselon" name="eselon" value={pegawaiForm.eselon} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} placeholder="Eselon" />
                  <EditField label="Unit Kerja" name="unit_kerja" value={pegawaiForm.unit_kerja} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} placeholder="Unit kerja" />
                  <EditField label="TMT Jabatan" name="tmt_jabatan" value={pegawaiForm.tmt_jabatan} onChange={(n, v) => setPegawaiForm({ ...pegawaiForm, [n]: v })} type="date" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <div className="space-y-0 divide-y divide-gray-50">
                    <InfoField icon={FiHash} label="NIP" value={pegawaiData?.nip} iconColor="text-blue-500" />
                    <InfoField icon={FiBriefcase} label="Jabatan" value={pegawaiData?.jabatan} iconColor="text-orange-500" />
                    <InfoField icon={FiAward} label="Status Kepegawaian" value={statusLabel(pegawaiData?.status_kepegawaian)} iconColor="text-emerald-500" />
                    <InfoField icon={FiStar} label="Pangkat" value={pegawaiData?.pangkat} iconColor="text-amber-500" />
                  </div>
                  <div className="space-y-0 divide-y divide-gray-50">
                    <InfoField icon={FiShield} label="Golongan" value={pegawaiData?.golongan} iconColor="text-purple-500" />
                    <InfoField icon={FiShield} label="Eselon" value={pegawaiData?.eselon} iconColor="text-indigo-500" />
                    <InfoField icon={FiBriefcase} label="Unit Kerja" value={pegawaiData?.unit_kerja} iconColor="text-teal-500" />
                    <InfoField icon={FiCalendar} label="TMT Jabatan" value={formatDate(pegawaiData?.tmt_jabatan)} iconColor="text-rose-400" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Informasi Akun</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Nama, email, dan role</p>
                </div>
                {editingSection !== 'account'
                  ? <EditButton onClick={() => { setEditingSection('account'); setAccountForm({ name: user.name || '', email: user.email || '' }); }} />
                  : <SaveCancelButtons onSave={handleSaveAccount} onCancel={() => setEditingSection(null)} />
                }
              </div>
              <div className="p-6">
                {editingSection === 'account' ? (
                  <div className="space-y-4">
                    <EditField label="Nama Lengkap" name="name" value={accountForm.name} onChange={(n, v) => setAccountForm({ ...accountForm, [n]: v })} placeholder="Nama lengkap" />
                    <EditField label="Email" name="email" value={accountForm.email} onChange={(n, v) => setAccountForm({ ...accountForm, [n]: v })} type="email" placeholder="email@example.com" />
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Role</label>
                      <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400">{roleLabels[user.role] || user.role} <span className="text-[10px]">(tidak dapat diubah)</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0 divide-y divide-gray-50">
                    <InfoField icon={FiUser} label="Nama Lengkap" value={user.name} iconColor="text-blue-500" />
                    <InfoField icon={FiMail} label="Email" value={user.email} iconColor="text-rose-400" />
                    <InfoField icon={FiShield} label="Role" value={roleLabels[user.role] || user.role} iconColor="text-purple-500" />
                    {user.bidang_name && <InfoField icon={FiBriefcase} label="Bidang" value={user.bidang_name} iconColor="text-emerald-500" />}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Pengaturan</h3>
              </div>
              <div className="divide-y divide-gray-50">
                <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                      <FiLock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-800">Ubah Password</p>
                      <p className="text-xs text-gray-400">Ganti password akun Anda</p>
                    </div>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-gray-300" />
                </button>
                <button onClick={handleLogout} className="w-full flex items-center justify-between px-6 py-4 bg-red-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                      <FiLogOut className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-red-600">Keluar</p>
                      <p className="text-xs text-gray-400">Keluar dari sistem</p>
                    </div>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowPasswordModal(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Ubah Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <FiX className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'current', label: 'Password Saat Ini', field: 'currentPassword', placeholder: 'Masukkan password saat ini' },
                { key: 'new', label: 'Password Baru', field: 'newPassword', placeholder: 'Minimal 6 karakter' },
                { key: 'confirm', label: 'Konfirmasi Password', field: 'confirmPassword', placeholder: 'Ulangi password baru' },
              ].map(item => (
                <div key={item.key}>
                  <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{item.label}</label>
                  <div className="relative">
                    <input
                      type={showPw[item.key] ? 'text' : 'password'}
                      value={passwordForm[item.field]}
                      onChange={(e) => setPasswordForm({ ...passwordForm, [item.field]: e.target.value })}
                      className="w-full px-3 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none"
                      placeholder={item.placeholder}
                    />
                    <button type="button" onClick={() => setShowPw({ ...showPw, [item.key]: !showPw[item.key] })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw[item.key] ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1"><FiX className="w-3 h-3" /> Password tidak cocok</p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowPasswordModal(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">Batal</button>
              <button onClick={handleChangePassword} disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword} className="flex-1 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {passwordLoading ? 'Menyimpan...' : 'Ubah Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Review Modal */}
      <AnimatePresence>
        {showPhotoReview && avatarUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowPhotoReview(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-sm w-full"
            >
              <div className="text-center mb-4">
                <p className="text-white font-semibold">{user.name}</p>
                <p className="text-white/50 text-xs">Foto Profil</p>
              </div>
              <img
                src={avatarUrl}
                alt={user.name}
                className="w-full aspect-square object-cover rounded-3xl shadow-2xl"
              />
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowPhotoReview(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-full transition backdrop-blur-sm"
                >
                  <FiCamera className="w-4 h-4" />
                  Ganti Foto
                </button>
                <button
                  onClick={() => setShowPhotoReview(false)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-full transition backdrop-blur-sm"
                >
                  <FiX className="w-4 h-4" />
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crop Modal */}
      <AvatarCropModal
        isOpen={showCropModal}
        imageSrc={cropImageSrc}
        onClose={() => setShowCropModal(false)}
        onCropDone={handleCropDone}
      />
    </div>
  );
};

export default ProfilePage;
