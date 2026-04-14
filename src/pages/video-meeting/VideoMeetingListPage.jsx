/**
 * Video Meeting List Page
 * MAINTENANCE MODE: Fitur sedang dalam perbaikan
 * Untuk membuka kembali, comment bagian MAINTENANCE dan uncomment bagian ORIGINAL di bawah
 */

// ==================== MAINTENANCE MODE (ACTIVE) ====================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Lottie from 'lottie-react';
import tableTennisAnimation from '../../assets/table-tennis.json';

const VideoMeetingListPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-teal-50 px-4">
      <div className="text-center max-w-lg">
        <div className="mb-2">
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold tracking-wide">
            Maintenance Mode
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-3">
          Maaf, Kita Sedang Main
        </h1>
        <p className="text-gray-500 text-sm md:text-base mb-2">
          Fitur <strong>Video Meeting</strong> sedang dalam perbaikan untuk pengalaman yang lebih baik.
        </p>
        <p className="text-gray-400 text-xs md:text-sm mb-4">
          Silakan coba lagi nanti. Terima kasih atas kesabarannya!
        </p>

        <div className="w-72 md:w-96 mx-auto">
          <Lottie animationData={tableTennisAnimation} loop autoplay />
        </div>

        <button
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
      </div>
    </div>
  );
};

export default VideoMeetingListPage;
// ==================== END MAINTENANCE MODE ====================


// ==================== ORIGINAL CODE (UNCOMMENT TO RESTORE) ====================
/*
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Video, Plus, Play, Trash2, Copy, Clock, Users, Link2, X, 
  Calendar, Settings, Loader2, VideoOff 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';

const VideoMeetingListPage = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
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
          <button onClick={async () => { toast.dismiss(t.id); try { await api.delete(`/video-meetings/${meetingId}`); toast.success('Meeting berhasil dihapus'); fetchMeetings(); } catch (e) { toast.error('Gagal menghapus meeting'); } }} className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition">Hapus</button>
        </div>
      </div>
    ), { duration: 10000, position: 'top-center' });
  };

  const handleJoinMeeting = () => {
    if (!joinRoomId.trim()) {
      toast.error('Masukkan Room ID');
      return;
    }
    navigate(`/meet/${joinRoomId.trim()}`);
  };

  const copyMeetingLink = (roomId) => {
    const link = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link meeting disalin - dapat dibagikan ke siapapun');
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Video Meeting</h1>
          <p className="text-gray-500 text-sm">Kelola rapat online dan konferensi video</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setJoinDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Gabung Meeting
          </button>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Buat Meeting
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <VideoOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum ada meeting</h3>
          <p className="text-gray-500 mb-6">Buat meeting baru untuk memulai rapat online</p>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Buat Meeting Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((meeting) => (
            <div 
              key={meeting.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-800 truncate flex-1 mr-2">
                  {meeting.title}
                </h3>
                {getStatusBadge(meeting.status)}
              </div>
              
              {meeting.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {meeting.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Clock className="w-4 h-4" />
                {formatDateTime(meeting.scheduled_start)}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Users className="w-4 h-4" />
                Maks. {meeting.max_participants} peserta
              </div>

              <div className="text-xs text-gray-400 mb-4">
                Room ID: <span className="font-mono font-semibold">{meeting.room_id}</span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <button
                    onClick={() => copyMeetingLink(meeting.room_id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Salin link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMeeting(meeting.id)}
                    disabled={meeting.status === 'active'}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {meeting.status !== 'ended' && meeting.status !== 'cancelled' && (
                  <button
                    onClick={() => handleStartMeeting(meeting)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 transition-colors"
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
          ))}
        </div>
      )}

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

              <div className="grid grid-cols-2 gap-4">
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
                Room ID
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  placeholder="Masukkan Room ID"
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
    </div>
  );
};

export default VideoMeetingListPage;
*/
// ==================== END ORIGINAL CODE ====================