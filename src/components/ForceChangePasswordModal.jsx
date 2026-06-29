import React, { useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { ShieldAlert, Lock, Eye, EyeOff, Loader2, LogOut, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const DEFAULT_PASSWORD = 'password';
const MIN_LENGTH = 8;

/**
 * Popup WAJIB ganti password — tampil saat user masih memakai password default.
 * Tidak bisa ditutup; user harus mengganti password untuk melanjutkan.
 * Dirender global (App) sehingga muncul untuk SEMUA role yang login.
 */
const ForceChangePasswordModal = () => {
  const { user, updateUser, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const open = Boolean(user && user.must_change_password);

  const validate = () => {
    if (newPassword.length < MIN_LENGTH) return `Password baru minimal ${MIN_LENGTH} karakter.`;
    if (newPassword === DEFAULT_PASSWORD) return "Password tidak boleh sama dengan password default 'password'.";
    if (newPassword !== confirm) return 'Konfirmasi password tidak sama.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/auth/change-default-password', { newPassword });
      if (res.data?.success) {
        updateUser({ must_change_password: false });
        toast.success('Password berhasil diganti. Selamat beraktivitas!', { icon: '🔒', duration: 4000 });
        setNewPassword('');
        setConfirm('');
      } else {
        setError(res.data?.message || 'Gagal mengganti password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengganti password. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex flex-col items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 px-6 pb-5 pt-6 text-center text-white">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold">Ganti Password Wajib</h2>
              <p className="text-sm text-white/90">
                Akun Anda masih memakai password default. Demi keamanan, ganti password dulu untuk melanjutkan.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password Baru</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                    placeholder={`Minimal ${MIN_LENGTH} karakter`}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-10 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                    placeholder="Ulangi password baru"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-2.5 font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> Simpan & Lanjutkan</>}
              </button>

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" /> Keluar
              </button>
            </form>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
};

export default ForceChangePasswordModal;
