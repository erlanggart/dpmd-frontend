import React, { useEffect, useState } from 'react';
import api from '../../../../api';
import Swal from 'sweetalert2';
import { Save, Calendar, Clock, RefreshCw, Settings as SettingsIcon, ToggleLeft, ToggleRight } from 'lucide-react';

const DAYS = [
  { id: 0, label: 'Min' },
  { id: 1, label: 'Sen' },
  { id: 2, label: 'Sel' },
  { id: 3, label: 'Rab' },
  { id: 4, label: 'Kam' },
  { id: 5, label: 'Jum' },
  { id: 6, label: 'Sab' },
];

const DpmdBankeuPerubahanSettingsPage = () => {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    enabled: true,
    schedule: { days: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '16:00' }
  });
  const [hasSchedule, setHasSchedule] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(null);

  const settingKey = `bankeu_perubahan_submission_desa_${tahun}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/app-settings/${settingKey}`);
      const data = res.data?.data;
      if (data) {
        setCurrentStatus(data.value);
        if (data.config) {
          setConfig({
            enabled: data.config.enabled !== false,
            schedule: data.config.schedule || { days: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '16:00' }
          });
          setHasSchedule(!!data.config.schedule);
        } else {
          // Default if no config
          setConfig({
            enabled: data.value === true,
            schedule: { days: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '16:00' }
          });
        }
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tahun]);

  const toggleDay = (dayId) => {
    setConfig(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(dayId)
          ? prev.schedule.days.filter(d => d !== dayId)
          : [...prev.schedule.days, dayId].sort()
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled: config.enabled,
        schedule: hasSchedule ? config.schedule : null
      };
      await api.put(`/app-settings/${settingKey}`, { value: payload });
      Swal.fire('Berhasil', 'Setting submission tersimpan', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal simpan setting', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOpen = async (open) => {
    const result = await Swal.fire({
      title: open ? 'Buka submission?' : 'Tutup submission?',
      text: open
        ? `Desa akan dapat mengajukan proposal Bankeu Perubahan TA ${tahun}`
        : `Desa tidak akan dapat mengajukan proposal Bankeu Perubahan TA ${tahun}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    setSaving(true);
    try {
      await api.put(`/app-settings/${settingKey}`, {
        value: { enabled: open, schedule: hasSchedule ? config.schedule : null }
      });
      Swal.fire('Berhasil', open ? 'Submission dibuka' : 'Submission ditutup', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-orange-600" />
                Pengaturan Submission Bankeu Perubahan
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Kontrol kapan desa dapat mengajukan proposal perubahan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={tahun}
                onChange={e => setTahun(parseInt(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="2026">TA 2026</option>
                <option value="2027">TA 2027</option>
              </select>
              <button onClick={fetchData} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            Memuat...
          </div>
        ) : (
          <>
            {/* Status & Quick Toggle */}
            <div className={`bg-white rounded-2xl shadow-sm border-2 p-5 mb-4 ${currentStatus ? 'border-emerald-200' : 'border-red-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Status Saat Ini:</div>
                  <div className={`text-2xl font-bold mt-1 ${currentStatus ? 'text-emerald-600' : 'text-red-600'}`}>
                    {currentStatus ? '✅ TERBUKA' : '🔒 TERTUTUP'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Setting key: <code>{settingKey}</code></div>
                </div>
                <button
                  onClick={() => handleToggleOpen(!currentStatus)}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50 ${
                    currentStatus ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {currentStatus ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                  {currentStatus ? 'Tutup Submission' : 'Buka Submission'}
                </button>
              </div>
            </div>

            {/* Detailed Config */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-5">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={e => setConfig({ ...config, enabled: e.target.checked })}
                    className="rounded text-orange-600"
                  />
                  <span className="text-sm font-semibold text-gray-700">Aktifkan submission untuk TA {tahun}</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSchedule}
                    onChange={e => setHasSchedule(e.target.checked)}
                    className="rounded text-orange-600"
                  />
                  <span className="text-sm font-semibold text-gray-700">Batasi berdasarkan jadwal (hari & jam)</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Jika tidak dicentang, submission akan terbuka 24/7 selama aktif
                </p>
              </div>

              {hasSchedule && config.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Hari Aktif
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS.map(d => (
                        <button
                          key={d.id}
                          onClick={() => toggleDay(d.id)}
                          className={`px-3 py-2 text-sm font-semibold rounded-xl border-2 transition-colors ${
                            config.schedule.days.includes(d.id)
                              ? 'bg-orange-50 border-orange-500 text-orange-700'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Jam Mulai
                      </label>
                      <input
                        type="time"
                        value={config.schedule.startTime}
                        onChange={e => setConfig({
                          ...config,
                          schedule: { ...config.schedule, startTime: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Jam Selesai
                      </label>
                      <input
                        type="time"
                        value={config.schedule.endTime}
                        onChange={e => setConfig({
                          ...config,
                          schedule: { ...config.schedule, endTime: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Setting'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DpmdBankeuPerubahanSettingsPage;
