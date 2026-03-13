import React, { useState } from 'react';
import { LuLock, LuEye, LuEyeOff, LuShieldCheck, LuCircleAlert } from 'react-icons/lu';
import api from '../../services/api';
import Swal from 'sweetalert2';

const KecamatanChangePasswordPage = () => {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = 'Password saat ini wajib diisi';
    if (!form.newPassword) errs.newPassword = 'Password baru wajib diisi';
    else if (form.newPassword.length < 6) errs.newPassword = 'Password baru minimal 6 karakter';
    if (!form.confirmPassword) errs.confirmPassword = 'Konfirmasi password wajib diisi';
    else if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Password tidak cocok';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setSubmitting(true);
      await api.put('/users/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Password berhasil diubah',
        timer: 2000,
        showConfirmButton: false,
      });

      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal mengubah password';
      Swal.fire({ icon: 'error', title: 'Gagal!', text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full pl-11 pr-12 py-3 rounded-xl border ${
      errors[field] ? 'border-red-300 bg-red-50/50' : 'border-gray-200 bg-gray-50/50'
    } focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-all text-sm`;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Ganti Password</h1>
        <p className="text-sm text-gray-500 mt-1">Ubah password akun Anda untuk keamanan</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <LuShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Keamanan Akun</h2>
              <p className="text-white/80 text-xs">Pastikan password baru Anda kuat dan mudah diingat</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password Saat Ini</label>
            <div className="relative">
              <LuLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                className={inputClass('currentPassword')}
                placeholder="Masukkan password saat ini"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showCurrent ? <LuEyeOff className="w-5 h-5" /> : <LuEye className="w-5 h-5" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <LuCircleAlert className="w-3.5 h-3.5" /> {errors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password Baru</label>
            <div className="relative">
              <LuLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showNew ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                className={inputClass('newPassword')}
                placeholder="Masukkan password baru (min. 6 karakter)"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showNew ? <LuEyeOff className="w-5 h-5" /> : <LuEye className="w-5 h-5" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <LuCircleAlert className="w-3.5 h-3.5" /> {errors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Konfirmasi Password Baru</label>
            <div className="relative">
              <LuLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className={inputClass('confirmPassword')}
                placeholder="Ulangi password baru"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirm ? <LuEyeOff className="w-5 h-5" /> : <LuEye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <LuCircleAlert className="w-3.5 h-3.5" /> {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Menyimpan...' : 'Ubah Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default KecamatanChangePasswordPage;
