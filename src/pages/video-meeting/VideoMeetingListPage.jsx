/**
 * Video Meeting List Page
 * Aktif kembali setelah port RTC (mediasoup) dibuka oleh Diskominfo.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import {
  Video, Plus, Play, Trash2, Copy, Clock, Users, Link2, X,
  Loader2, Radio, Calendar, CheckCircle2, ClipboardList, Download,
  Sparkles, ArrowRight, ShieldCheck, MonitorUp, CalendarPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import movieLoadingAnimation from '../../assets/lottie/movie-loading.json';

const VideoMeetingListPage = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [creating, setCreating] = useState(false);
  const [attendance, setAttendance] = useState({ open: false, loading: false, data: null, title: '' });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mode: 'meeting', // 'meeting' (rapat) | 'webinar'
    scheduled_start: '',
    scheduled_end: '',
    max_participants: 50,
    is_recording_enabled: false,
    is_screen_share_enabled: true,
    is_chat_enabled: true,
    password: '',
    waiting_room_enabled: false,
  });

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/video-meetings');
      if (response.data.success) {
        setMeetings(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Gagal memuat daftar meeting');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleCreateMeeting = async () => {
    if (!formData.title.trim()) {
      toast.error('Judul meeting harus diisi');
      return;
    }

    try {
      setCreating(true);
      const response = await api.post('/video-meetings', {
        ...formData,
        scheduled_start: formData.scheduled_start || null,
        scheduled_end: formData.scheduled_end || null,
      });

      if (response.data.success) {
        toast.success('Meeting berhasil dibuat');
        setCreateDialogOpen(false);
        resetForm();
        fetchMeetings();
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error(error.response?.data?.message || 'Gagal membuat meeting');
    } finally {
      setCreating(false);
    }
  };

  const handleStartMeeting = async (meeting) => {
    try {
      if (meeting.status === 'scheduled') {
        await api.post(`/video-meetings/${meeting.id}/start`);
      }
      navigate(`/meet/${meeting.room_id}`);
    } catch (error) {
      console.error('Error starting meeting:', error);
      toast.error('Gagal memulai meeting');
    }
  };

  const handleDeleteMeeting = (meetingId) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-800">Yakin ingin menghapus meeting ini?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Batal</button>
          <button onClick={async () => { toast.dismiss(t.id); try { await api.delete(`/video-meetings/${meetingId}`); toast.success('Meeting berhasil dihapus'); fetchMeetings(); } catch { toast.error('Gagal menghapus meeting'); } }} className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition">Hapus</button>
        </div>
      </div>
    ), { duration: 10000, position: 'top-center' });
  };

  const extractRoomId = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      const parts = url.pathname.split('/').filter(Boolean);
      return parts.at(-1) || raw;
    } catch {
      return raw
        .replace(/^.*\/(join|meet)\//i, '')
        .replace(/[?#].*$/, '')
        .trim();
    }
  };

  const handleJoinMeeting = () => {
    const roomId = extractRoomId(joinRoomId);
    if (!roomId) {
      toast.error('Masukkan link atau Room ID meeting');
      return;
    }
    navigate(`/meet/${roomId}`);
  };

  const copyMeetingLink = (roomId) => {
    const link = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link meeting disalin - dapat dibagikan ke siapapun');
  };

  const openAttendance = async (meeting) => {
    setAttendance({ open: true, loading: true, data: null, title: meeting.title });
    try {
      const res = await api.get(`/video-meetings/${meeting.id}/attendance`);
      if (res.data.success) {
        setAttendance({ open: true, loading: false, data: res.data.data, title: meeting.title });
      } else {
        throw new Error();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat kehadiran');
      setAttendance({ open: false, loading: false, data: null, title: '' });
    }
  };

  const exportAttendanceCsv = () => {
    const rows = attendance.data?.attendance || [];
    if (!rows.length) return;
    const head = ['Nama', 'Tipe', 'Peran', 'Bergabung', 'Keluar', 'Durasi (menit)', 'Sesi'];
    const fmt = (d) => (d ? new Date(d).toLocaleString('id-ID') : '-');
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [head.join(',')];
    rows.forEach((r) => {
      lines.push([
        esc(r.name), esc(r.isGuest ? 'Tamu' : 'Pegawai'), esc(r.role),
        esc(fmt(r.firstJoin)), esc(r.stillIn ? 'Masih di ruangan' : fmt(r.lastLeft)),
        esc(r.durationMinutes), esc(r.sessions),
      ].join(','));
    });
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kehadiran-${(attendance.title || 'meeting').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      mode: 'meeting',
      scheduled_start: '',
      scheduled_end: '',
      max_participants: 50,
      is_recording_enabled: false,
      is_screen_share_enabled: true,
      is_chat_enabled: true,
      password: '',
      waiting_room_enabled: false,
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      scheduled: 'bg-blue-100 text-blue-700',
      ended: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    const labels = {
      active: 'Berlangsung',
      scheduled: 'Terjadwal',
      ended: 'Selesai',
      cancelled: 'Dibatalkan',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.scheduled}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Tidak terjadwal';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = useMemo(() => ({
    total: meetings.length,
    active: meetings.filter((m) => m.status === 'active').length,
    scheduled: meetings.filter((m) => m.status === 'scheduled').length,
  }), [meetings]);

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white border border-rose-100 items-center justify-center shadow-sm shrink-0 overflow-hidden">
            <Lottie
              animationData={movieLoadingAnimation}
              loop
              autoplay
              className="w-16 h-16 sm:w-[4.25rem] sm:h-[4.25rem]"
              aria-label="Logo Video Meeting"
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Video Meeting</h1>
            <p className="text-gray-500 text-xs sm:text-sm">Pusat rapat online DPMD</p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setJoinDialogOpen(true)}
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 active:scale-95 transition-all text-sm font-medium text-gray-700"
          >
            <Link2 className="w-4 h-4" />
            <span>Gabung Meeting</span>
          </button>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 active:scale-95 transition-all text-sm font-medium shadow-sm shadow-rose-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Meeting</span>
          </button>
        </div>
      </div>

      {/* Landing / quick access */}
      <section className="overflow-hidden rounded-lg bg-gray-950 text-white shadow-xl shadow-gray-900/10">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] min-h-[360px]">
          <div className="p-5 sm:p-8 lg:p-10 flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-xs font-semibold text-rose-100">
                <Sparkles className="w-3.5 h-3.5" />
                Video Meeting Terpadu
              </div>
              <div className="max-w-2xl">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-normal">
                  Mulai rapat, webinar, dan kolaborasi layar dari satu halaman.
                </h2>
                <p className="mt-4 text-sm sm:text-base text-white/65 max-w-xl">
                  Masuk lewat link undangan, buat ruang baru, atau lanjutkan meeting yang sudah terjadwal.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-[1fr_auto] gap-3 max-w-3xl">
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35" />
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleJoinMeeting(); }}
                  className="w-full h-12 pl-11 pr-4 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-300"
                  placeholder="Tempel link meeting atau Room ID"
                />
              </div>
              <button
                onClick={handleJoinMeeting}
                className="h-12 px-5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all text-sm font-semibold text-white flex items-center justify-center gap-2"
              >
                Gabung <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative bg-white/[0.03] border-t lg:border-t-0 lg:border-l border-white/10 p-5 sm:p-8 flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/10 border border-white/10 p-3">
                <Video className="w-5 h-5 text-rose-300 mb-3" />
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-[11px] text-white/50">Total room</p>
              </div>
              <div className="rounded-lg bg-white/10 border border-white/10 p-3">
                <Radio className="w-5 h-5 text-emerald-300 mb-3" />
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-[11px] text-white/50">Live</p>
              </div>
              <div className="rounded-lg bg-white/10 border border-white/10 p-3">
                <Calendar className="w-5 h-5 text-sky-300 mb-3" />
                <p className="text-2xl font-bold">{stats.scheduled}</p>
                <p className="text-[11px] text-white/50">Agenda</p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center">
              <div className="relative w-56 h-56 rounded-lg bg-white overflow-hidden border border-white/10 shadow-2xl">
                <Lottie
                  animationData={movieLoadingAnimation}
                  loop
                  autoplay
                  className="absolute inset-0 w-full h-full scale-125"
                  aria-label="Animasi Video Meeting"
                />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white/75">
                <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                Password
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white/75">
                <MonitorUp className="w-4 h-4 text-sky-300 shrink-0" />
                Share screen
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white/75">
                <CalendarPlus className="w-4 h-4 text-rose-300 shrink-0" />
                Attendance
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats ringkas */}
      {!loading && meetings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-gray-100 p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold text-gray-800 leading-none">{stats.total}</p>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">Total</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold text-gray-800 leading-none">{stats.active}</p>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">Berlangsung</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold text-gray-800 leading-none">{stats.scheduled}</p>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">Terjadwal</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-4" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-6" />
              <div className="h-9 bg-gray-100 rounded-lg w-full" />
            </div>
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-14 text-center">
          <div className="w-24 h-24 mx-auto mb-5 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center overflow-hidden">
            <Lottie
              animationData={movieLoadingAnimation}
              loop
              autoplay
              className="w-28 h-28"
              aria-label="Logo Video Meeting"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Belum ada meeting</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">Buat meeting baru untuk memulai rapat online atau konferensi video dengan tim Anda.</p>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 active:scale-95 transition-all shadow-sm shadow-rose-600/20 font-medium"
          >
            <Plus className="w-5 h-5" />
            Buat Meeting Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((meeting) => {
            const isWebinar = meeting.mode === 'webinar';
            const joinable = meeting.status !== 'ended' && meeting.status !== 'cancelled';
            return (
            <div
              key={meeting.id}
              className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-rose-100 transition-all hover:-translate-y-0.5 flex flex-col"
            >
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                    isWebinar ? 'bg-purple-50 text-purple-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {isWebinar ? <Radio className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                    {isWebinar ? 'Webinar' : 'Rapat'}
                  </span>
                </div>
                {getStatusBadge(meeting.status)}
              </div>

              <h3 className="font-semibold text-gray-800 text-base mb-1 line-clamp-1">
                {meeting.title}
              </h3>

              {meeting.description ? (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {meeting.description}
                </p>
              ) : <div className="mb-3" />}

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4 shrink-0 text-gray-400" />
                  <span className="truncate">{formatDateTime(meeting.scheduled_start)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="w-4 h-4 shrink-0 text-gray-400" />
                  Maks. {meeting.max_participants} peserta
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-gray-400" />
                  <span className="text-xs">Room ID:</span>
                  <span className="font-mono font-semibold text-gray-700 text-xs">{meeting.room_id}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-auto">
                <div className="flex gap-1">
                  <button
                    onClick={() => copyMeetingLink(meeting.room_id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Salin link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {meeting.is_host && (
                    <button
                      onClick={() => openAttendance(meeting)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Laporan kehadiran"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMeeting(meeting.id)}
                    disabled={meeting.status === 'active'}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {joinable && (
                  <button
                    onClick={() => handleStartMeeting(meeting)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 active:scale-95 transition-all"
                  >
                    {meeting.status === 'active' ? (
                      <>
                        <Video className="w-4 h-4" />
                        Gabung
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Mulai
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
      </div>

      {createDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Buat Meeting Baru</h2>
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul Meeting <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  placeholder="Masukkan judul meeting"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  placeholder="Deskripsi meeting (opsional)"
                />
              </div>

              {/* Mode: Rapat vs Webinar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mode: 'meeting' })}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      formData.mode === 'meeting'
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Rapat
                    <span className="block text-[11px] font-normal text-gray-400">Semua bisa bicara</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mode: 'webinar' })}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      formData.mode === 'webinar'
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Webinar
                    <span className="block text-[11px] font-normal text-gray-400">Pembicara di panggung, sisanya penonton</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_start}
                    onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Waktu Selesai
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_end}
                    onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maksimal Peserta
                </label>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 50 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password Meeting (Opsional)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  placeholder="Kosongkan jika tidak perlu password"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_screen_share_enabled}
                    onChange={(e) => setFormData({ ...formData, is_screen_share_enabled: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                  />
                  <span className="text-sm text-gray-700">Izinkan Screen Share</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_chat_enabled}
                    onChange={(e) => setFormData({ ...formData, is_chat_enabled: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                  />
                  <span className="text-sm text-gray-700">Aktifkan Chat</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_recording_enabled}
                    onChange={(e) => setFormData({ ...formData, is_recording_enabled: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                  />
                  <span className="text-sm text-gray-700">Izinkan Recording</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.waiting_room_enabled}
                    onChange={(e) => setFormData({ ...formData, waiting_room_enabled: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                  />
                  <span className="text-sm text-gray-700">Aktifkan Waiting Room</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreateMeeting}
                disabled={creating}
                className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  'Buat Meeting'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {joinDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Gabung Meeting</h2>
              <button
                onClick={() => setJoinDialogOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Meeting atau Room ID
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  placeholder="https://.../join/room-id atau room-id"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setJoinDialogOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleJoinMeeting}
                className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
              >
                <Video className="w-4 h-4" />
                Gabung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Laporan Kehadiran */}
      {attendance.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAttendance({ open: false, loading: false, data: null, title: '' })}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-600" /> Laporan Kehadiran
                </h2>
                <p className="text-xs text-gray-500 truncate">{attendance.title}</p>
              </div>
              <div className="flex items-center gap-2">
                {attendance.data?.attendance?.length > 0 && (
                  <button
                    onClick={exportAttendanceCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Ekspor CSV
                  </button>
                )}
                <button onClick={() => setAttendance({ open: false, loading: false, data: null, title: '' })} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {attendance.loading ? (
                <div className="flex justify-center items-center py-16"><Loader2 className="w-7 h-7 animate-spin text-indigo-600" /></div>
              ) : (attendance.data?.attendance?.length || 0) === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  Belum ada peserta yang tercatat.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="text-left font-medium px-4 py-2.5">Nama</th>
                      <th className="text-left font-medium px-3 py-2.5 hidden sm:table-cell">Bergabung</th>
                      <th className="text-left font-medium px-3 py-2.5 hidden sm:table-cell">Keluar</th>
                      <th className="text-right font-medium px-4 py-2.5">Durasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendance.data.attendance.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${r.isGuest ? 'bg-gray-400' : 'bg-indigo-500'}`}>
                              {(r.name || 'U')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">{r.name}{r.role === 'host' && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 align-middle">Host</span>}</p>
                              <p className="text-xs text-gray-400">{r.isGuest ? 'Tamu' : (r.email || 'Pegawai')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 hidden sm:table-cell whitespace-nowrap">{r.firstJoin ? new Date(r.firstJoin).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className="px-3 py-2.5 hidden sm:table-cell whitespace-nowrap">
                          {r.stillIn
                            ? <span className="inline-flex items-center gap-1 text-green-600 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Di ruangan</span>
                            : <span className="text-gray-600">{r.lastLeft ? new Date(r.lastLeft).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{r.durationMinutes} mnt</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {attendance.data && (
              <div className="px-5 py-3 border-t text-xs text-gray-500 flex justify-between">
                <span>Total peserta: <b className="text-gray-700">{attendance.data.total}</b></span>
                <span>Masih di ruangan: <b className="text-gray-700">{attendance.data.attendance.filter(r => r.stillIn).length}</b></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoMeetingListPage;
