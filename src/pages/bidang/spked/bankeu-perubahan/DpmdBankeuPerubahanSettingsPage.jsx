import React, { useEffect, useState } from 'react';
import api from '../../../../api';
import Swal from 'sweetalert2';
import { Save, Calendar, Clock, RefreshCw, Settings as SettingsIcon, Lock, Unlock } from 'lucide-react';

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

  const inputCls = 'px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-shadow';

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 flex-shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Pengaturan Submission
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Kontrol kapan desa dapat mengajukan proposal perubahan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={tahun}
                onChange={e => setTahun(parseInt(e.target.value))}
                className={inputCls}
              >
                <option value="2026">TA 2026</option>
                <option value="2027">TA 2027</option>
              </select>
              <button
                onClick={fetchData}
                title="Muat ulang"
                className="inline-flex items-center justify-center w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
            Memuat…
          </div>
        ) : (
          <>
            {/* Status & Quick Toggle */}
            <div className={`bg-white rounded-2xl border shadow-sm p-5 ${currentStatus ? 'border-emerald-200' : 'border-rose-200'}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${currentStatus ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    {currentStatus
                      ? <Unlock className="w-6 h-6 text-emerald-600" />
                      : <Lock className="w-6 h-6 text-rose-600" />}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Status saat ini</div>
                    <div className={`text-xl font-bold leading-tight ${currentStatus ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {currentStatus ? 'Terbuka' : 'Tertutup'}
                    </div>
                    <code className="text-[11px] text-slate-400">{settingKey}</code>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleOpen(!currentStatus)}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50 ${
                    currentStatus ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {currentStatus ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  {currentStatus ? 'Tutup Submission' : 'Buka Submission'}
                </button>
              </div>
            </div>

            {/* Detailed Config */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
              <h3 className="text-sm font-bold text-slate-700">Konfigurasi Detail</h3>

              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={e => setConfig({ ...config, enabled: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Aktifkan submission untuk TA {tahun}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Saklar utama yang mengizinkan desa mengajukan proposal.</span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={hasSchedule}
                  onChange={e => setHasSchedule(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Batasi berdasarkan jadwal (hari & jam)</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Jika tidak dicentang, submission terbuka 24/7 selama aktif.</span>
                </span>
              </label>

              {hasSchedule && config.enabled && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" /> Hari Aktif
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS.map(d => {
                        const on = config.schedule.days.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            onClick={() => toggleDay(d.id)}
                            className={`w-12 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                              on
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" /> Jam Mulai
                      </label>
                      <input
                        type="time"
                        value={config.schedule.startTime}
                        onChange={e => setConfig({
                          ...config,
                          schedule: { ...config.schedule, startTime: e.target.value }
                        })}
                        className={`w-full ${inputCls}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" /> Jam Selesai
                      </label>
                      <input
                        type="time"
                        value={config.schedule.endTime}
                        onChange={e => setConfig({
                          ...config,
                          schedule: { ...config.schedule, endTime: e.target.value }
                        })}
                        className={`w-full ${inputCls}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Menyimpan…' : 'Simpan Setting'}
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
