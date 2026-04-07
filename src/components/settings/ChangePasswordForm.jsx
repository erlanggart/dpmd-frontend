import { useState } from 'react';
import { FiLock, FiEye, FiEyeOff, FiCheck, FiAlertCircle } from 'react-icons/fi';
import api from '../../api';

function PasswordField({ label, name, showPassword, value, onChange, onToggle }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiLock className="text-gray-400" />
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          required
          className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          placeholder={`Masukkan ${label.toLowerCase()}`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordForm() {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setForm((prevForm) => ({ ...prevForm, [e.target.name]: e.target.value }));
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (form.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Password baru minimal 6 karakter' });
      setLoading(false);
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setMessage({ type: 'error', text: 'Konfirmasi password tidak cocok' });
      setLoading(false);
      return;
    }

    try {
      const res = await api.put('/settings/change-password', form);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Password berhasil diubah!' });
        setForm({ current_password: '', new_password: '', confirm_password: '' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Gagal mengubah password'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Ubah Password</h2>

      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <FiCheck className="text-lg flex-shrink-0" /> : <FiAlertCircle className="text-lg flex-shrink-0" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          name="current_password"
          label="Password Lama"
          showPassword={showPasswords.current}
          value={form.current_password}
          onChange={handleChange}
          onToggle={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
        />
        <PasswordField
          name="new_password"
          label="Password Baru"
          showPassword={showPasswords.new}
          value={form.new_password}
          onChange={handleChange}
          onToggle={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
        />
        <PasswordField
          name="confirm_password"
          label="Konfirmasi Password Baru"
          showPassword={showPasswords.confirm}
          value={form.confirm_password}
          onChange={handleChange}
          onToggle={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
        />

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Menyimpan...' : 'Ubah Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
