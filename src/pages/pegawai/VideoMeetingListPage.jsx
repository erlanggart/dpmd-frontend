/**
 * Video Meeting List Page
 * List and create video meetings
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  VideoCall,
  Add,
  ContentCopy,
  Delete,
  PlayArrow,
  Schedule,
  Group,
  Settings
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { id } from 'date-fns/locale';
import videoMeetingService from '../../services/videoMeetingService';
import { toast } from 'react-toastify';

function VideoMeetingListPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_start: null,
    scheduled_end: null,
    max_participants: 50,
    is_recording_enabled: false,
    is_screen_share_enabled: true,
    is_chat_enabled: true,
    password: '',
    waiting_room_enabled: false
  });

  // Fetch meetings
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await videoMeetingService.getMeetings();
      if (response.success) {
        setMeetings(response.data);
      }
    } catch (error) {
      console.error('[Meetings] Error fetching:', error);
      toast.error('Gagal mengambil data meeting');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Handle create meeting
  const handleCreateMeeting = async () => {
    try {
      if (!form.title.trim()) {
        toast.error('Judul meeting harus diisi');
        return;
      }

      setCreating(true);
      const response = await videoMeetingService.createMeeting(form);
      
      if (response.success) {
        toast.success('Meeting berhasil dibuat');
        setCreateOpen(false);
        setForm({
          title: '',
          description: '',
          scheduled_start: null,
          scheduled_end: null,
          max_participants: 50,
          is_recording_enabled: false,
          is_screen_share_enabled: true,
          is_chat_enabled: true,
          password: '',
          waiting_room_enabled: false
        });
        fetchMeetings();

        // If instant meeting, redirect to room
        if (!form.scheduled_start) {
          navigate(`/meet/${response.data.room_id}`);
        }
      }
    } catch (error) {
      console.error('[Meetings] Error creating:', error);
      toast.error('Gagal membuat meeting');
    } finally {
      setCreating(false);
    }
  };

  // Handle start meeting
  const handleStartMeeting = async (meeting) => {
    try {
      if (meeting.status === 'scheduled') {
        await videoMeetingService.startMeeting(meeting.id);
      }
      navigate(`/meet/${meeting.room_id}`);
    } catch (error) {
      toast.error('Gagal memulai meeting');
    }
  };

  // Handle delete meeting
  const handleDeleteMeeting = (id) => {
    toast.info(
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Yakin ingin menghapus meeting ini?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={async () => { toast.dismiss(); try { await videoMeetingService.deleteMeeting(id); toast.success('Meeting berhasil dihapus'); fetchMeetings(); } catch (e) { toast.error('Gagal menghapus meeting'); } }} className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition">Hapus</button>
        </div>
      </div>,
      { autoClose: 10000 }
    );
  };

  // Copy meeting link
  const copyMeetingLink = (roomId) => {
    const link = `${window.location.origin}/meet/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link meeting disalin');
  };

  // Join meeting by room ID
  const [joinRoomId, setJoinRoomId] = useState('');
  const handleJoinMeeting = () => {
    if (joinRoomId.trim()) {
      navigate(`/meet/${joinRoomId.trim()}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'scheduled': return 'primary';
      case 'ended': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Sedang Berlangsung';
      case 'scheduled': return 'Terjadwal';
      case 'ended': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={id}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              <VideoCall sx={{ mr: 1, verticalAlign: 'middle' }} />
              Video Meeting
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Buat dan kelola video meeting untuk rapat internal atau koordinasi
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateOpen(true)}
            size="large"
          >
            Buat Meeting
          </Button>
        </Box>

        {/* Quick Join */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Bergabung ke Meeting
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Masukkan Room ID (contoh: abcd-efgh-ijkl)"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              sx={{ flex: 1, maxWidth: 400 }}
            />
            <Button
              variant="outlined"
              onClick={handleJoinMeeting}
              disabled={!joinRoomId.trim()}
            >
              Gabung
            </Button>
          </Box>
        </Paper>

        {/* Meetings List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : meetings.length === 0 ? (
          <Alert severity="info">
            Belum ada meeting. Klik "Buat Meeting" untuk memulai.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {meetings.map((meeting) => (
              <Grid item xs={12} md={6} lg={4} key={meeting.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                        {meeting.title}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={getStatusLabel(meeting.status)}
                        color={getStatusColor(meeting.status)}
                      />
                    </Box>

                    {meeting.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} noWrap>
                        {meeting.description}
                      </Typography>
                    )}

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Room ID: {meeting.room_id}
                    </Typography>

                    {meeting.scheduled_start && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Schedule fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(meeting.scheduled_start).toLocaleString('id-ID')}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Group fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        Max: {meeting.max_participants} peserta
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between' }}>
                    <Box>
                      <Tooltip title="Salin Link">
                        <IconButton size="small" onClick={() => copyMeetingLink(meeting.room_id)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {meeting.is_host && meeting.status !== 'ended' && (
                        <Tooltip title="Hapus">
                          <IconButton size="small" color="error" onClick={() => handleDeleteMeeting(meeting.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    {meeting.status !== 'ended' && meeting.status !== 'cancelled' && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PlayArrow />}
                        onClick={() => handleStartMeeting(meeting)}
                      >
                        {meeting.status === 'active' ? 'Gabung' : 'Mulai'}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Create Meeting Dialog */}
        <Dialog 
          open={createOpen} 
          onClose={() => setCreateOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Buat Meeting Baru</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Judul Meeting"
                fullWidth
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />

              <TextField
                label="Deskripsi"
                fullWidth
                multiline
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <Alert severity="info" sx={{ py: 0 }}>
                Kosongkan jadwal untuk memulai meeting sekarang (instant meeting)
              </Alert>

              <DateTimePicker
                label="Jadwal Mulai (Opsional)"
                value={form.scheduled_start}
                onChange={(date) => setForm({ ...form, scheduled_start: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />

              <DateTimePicker
                label="Jadwal Selesai (Opsional)"
                value={form.scheduled_end}
                onChange={(date) => setForm({ ...form, scheduled_end: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />

              <TextField
                label="Maksimal Peserta"
                type="number"
                fullWidth
                value={form.max_participants}
                onChange={(e) => setForm({ ...form, max_participants: parseInt(e.target.value) || 50 })}
              />

              <TextField
                label="Password (Opsional)"
                fullWidth
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                helperText="Kosongkan jika tidak perlu password"
              />

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.is_screen_share_enabled}
                      onChange={(e) => setForm({ ...form, is_screen_share_enabled: e.target.checked })}
                    />
                  }
                  label="Izinkan Screen Share"
                />
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.is_chat_enabled}
                      onChange={(e) => setForm({ ...form, is_chat_enabled: e.target.checked })}
                    />
                  }
                  label="Aktifkan Chat"
                />
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.is_recording_enabled}
                      onChange={(e) => setForm({ ...form, is_recording_enabled: e.target.checked })}
                    />
                  }
                  label="Izinkan Recording"
                />
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.waiting_room_enabled}
                      onChange={(e) => setForm({ ...form, waiting_room_enabled: e.target.checked })}
                    />
                  }
                  label="Aktifkan Waiting Room"
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button 
              variant="contained" 
              onClick={handleCreateMeeting}
              disabled={creating || !form.title.trim()}
            >
              {creating ? <CircularProgress size={24} /> : (form.scheduled_start ? 'Jadwalkan' : 'Mulai Sekarang')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}

export default VideoMeetingListPage;
