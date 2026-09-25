import React, { useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { ShieldAlert, Lock, Eye, EyeOff, Loader2, LogOut, CheckCircle2, User, Briefcase, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { JABATAN_BUMDES_OPTIONS, isOperatorBumdes } from '../constants/desaPermissions';

const DEFAULT_PASSWORD = 'password';
const MIN_LENGTH = 8;

// Nama bawaan sistem, bukan identitas orang. Sama dengan pola di
// backend/src/config/desaProfile.js — kalau salah satunya diubah, yang lain ikut.
const POLA_NAMA_BAWAAN = /^(admin\s+desa|operator)\b/i;

// Contoh bagian/jabatan untuk mempercepat pengisian; tetap boleh diketik bebas.
const JABATAN_SARAN = [
  'Operator',
  'Kesejahteraan',
  'Pemerintahan',
  'Pembangunan',
  'Pelayanan',
  'Keuangan',
  'Perencanaan',
  'Umum & Tata Usaha',
];

/**
 * Popup WAJIB ganti password — tampil saat user masih memakai password default.
 * Tidak bisa ditutup; user harus mengganti password untuk melanjutkan.
 * Dirender global (App) sehingga muncul untuk SEMUA role yang login.
 *
 * Untuk akun operator desa, layar ini sekaligus meminta IDENTITAS. Akun operator
 * kini bisa dibuat massal oleh staf bidang, sehingga lahir tanpa pemilik:
 * namanya sementara ("Operator Bantuan Keuangan Desa Caringin") dan tidak ada
 * nomor yang bisa dihubungi. Login pertama adalah satu-satunya saat orangnya
 * pasti ada di depan layar, jadi identitas diminta di sini — bukan di halaman
 * pengaturan yang bisa terus ditunda.
 */
const ForceChangePasswordModal = () => {
  const { user, updateUser, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const perluIdentitas = String(user?.role || '').toLowerCase() === 'desa';
  // Operator BUMDes memilih jabatannya di BUM Desa, bukan bagian di kantor desa.
  const operatorBumdes = isOperatorBumdes(user);

  // Nama bawaan sengaja TIDAK diisikan ke kotak: kalau diisikan, jalan termudah
  // bagi petugas adalah membiarkannya — dan justru nama itulah yang ingin diganti.
  const [identitas, setIdentitas] = useState(() => ({
    name: POLA_NAMA_BAWAAN.test(user?.name || '') ? '' : user?.name || '',
    // Jabatan bawaan generate massal ("Operator BUMDes") bukan jabatan di BUM
    // Desa — dikosongkan supaya operator BUMDes benar-benar memilih.
    jabatan_desa:
      isOperatorBumdes(user) && POLA_NAMA_BAWAAN.test(user?.jabatan_desa || '') ? '' : user?.jabatan_desa || '',
    no_hp: user?.no_hp || '',
  }));

  const open = Boolean(user && user.must_change_password);

  const validate = () => {
    if (perluIdentitas) {
      const nama = identitas.name.trim();
      if (nama.length < 3) return 'Nama petugas wajib diisi, minimal 3 karakter.';
      if (POLA_NAMA_BAWAAN.test(nama)) return 'Isi dengan nama asli petugas, bukan nama bawaan sistem.';
      if (!identitas.jabatan_desa.trim()) return 'Jabatan / bagian wajib diisi.';
      if (!/^[0-9+\s-]{9,20}$/.test(identitas.no_hp.trim())) return 'Nomor HP tidak valid. Contoh: 081234567890';
    }
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
      const payload = { newPassword };
      if (perluIdentitas) {
        payload.name = identitas.name.trim();
        payload.jabatan_desa = identitas.jabatan_desa.trim();
        payload.no_hp = identitas.no_hp.trim();
      }

      const res = await api.post('/auth/change-default-password', payload);
      if (res.data?.success) {
        // Identitas ikut disegarkan di sesi: sesi aplikasi ini tidak pernah
        // kedaluwarsa, jadi tanpa ini nama lama menempel sampai user keluar.
        updateUser({ must_change_password: false, ...(res.data.data || {}) });
        toast.success('Password berhasil diganti. Selamat beraktivitas!', { icon: '🔒', duration: 4000 });
        setNewPassword('');
        setConfirm('');
      } else {
        setError(res.data?.message || 'Gagal mengganti password.');
      }
    } catch (err) {
      // 409 = server bilang sandinya sudah bukan bawaan, jadi popup ini memang
      // tidak perlu muncul. Sesi di aplikasi ini tidak pernah kedaluwarsa, jadi
      // flag lama bisa ikut terbawa lama setelah sandinya diganti di tempat lain.
      // Tanpa penanganan ini user terkunci di popup yang menolak semua isian dan
      // satu-satunya jalan keluar adalah tombol Keluar.
      if (err.response?.status === 409) {
        updateUser({ must_change_password: false });
        toast.success('Password Anda sudah aman. Silakan lanjut beraktivitas.', { icon: '🔒', duration: 4000 });
        setNewPassword('');
        setConfirm('');
        return;
      }
      setError(err.response?.data?.message || 'Gagal mengganti password. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const ubahIdentitas = (kunci, nilai) => {
    setIdentitas((prev) => ({ ...prev, [kunci]: nilai }));
    setError(null);
  };

  const KELAS_INPUT =
    'w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500';

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
            className="relative my-auto max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex flex-col items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 px-6 pb-5 pt-6 text-center text-white">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold">
                {perluIdentitas ? 'Lengkapi Data & Ganti Password' : 'Ganti Password Wajib'}
              </h2>
              <p className="text-sm text-white/90">
                {perluIdentitas
                  ? 'Akun ini masih memakai password default dan belum punya identitas petugas. Lengkapi dulu untuk melanjutkan.'
                  : 'Akun Anda masih memakai password default. Demi keamanan, ganti password dulu untuk melanjutkan.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {perluIdentitas && (
                <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Identitas Petugas
                  </p>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Nama Petugas</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={identitas.name}
                        onChange={(e) => ubahIdentitas('name', e.target.value)}
                        placeholder="Nama asli, mis. Rahmat Ramadan"
                        className={KELAS_INPUT}
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {operatorBumdes ? 'Jabatan di BUM Desa' : 'Jabatan / Bagian'}
                    </label>
                    <div className="relative">
                      <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      {operatorBumdes ? (
                        <select
                          value={identitas.jabatan_desa}
                          onChange={(e) => ubahIdentitas('jabatan_desa', e.target.value)}
                          className={KELAS_INPUT}
                          required
                        >
                          <option value="">Pilih jabatan</option>
                          {/* Jabatan lama yang tidak ada di daftar tetap bisa dipertahankan. */}
                          {identitas.jabatan_desa && !JABATAN_BUMDES_OPTIONS.includes(identitas.jabatan_desa) && (
                            <option value={identitas.jabatan_desa}>{identitas.jabatan_desa}</option>
                          )}
                          {JABATAN_BUMDES_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                      <input
                        type="text"
                        list="saran-jabatan-operator"
                        value={identitas.jabatan_desa}
                        onChange={(e) => ubahIdentitas('jabatan_desa', e.target.value)}
                        placeholder="Mis. Kesejahteraan"
                        className={KELAS_INPUT}
                        required
                      />
                      )}
                      <datalist id="saran-jabatan-operator">
                        {[...JABATAN_SARAN, ...JABATAN_BUMDES_OPTIONS].map((opt) => (
                          <option key={opt} value={opt} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Nomor HP</label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={identitas.no_hp}
                        onChange={(e) => ubahIdentitas('no_hp', e.target.value)}
                        placeholder="081234567890"
                        className={KELAS_INPUT}
                        required
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-amber-800">
                      Dipakai DPMD untuk menghubungi Anda soal berkas desa.
                    </p>
                  </div>
                </div>
              )}

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
                    autoFocus={!perluIdentitas}
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
