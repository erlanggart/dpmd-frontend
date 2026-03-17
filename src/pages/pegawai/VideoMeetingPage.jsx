/**
 * Video Meeting Page
 * Main video conferencing interface
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Box, 
  Grid, 
  Paper, 
  IconButton, 
  Typography, 
  TextField,
  Button,
  Avatar,
  Tooltip,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  ScreenShare,
  StopScreenShare,
  CallEnd,
  Chat,
  People,
  Send,
  ContentCopy,
  Settings
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import useMediasoup from '../../hooks/useMediasoup';
import videoMeetingService from '../../services/videoMeetingService';
import { toast } from 'react-toastify';

function VideoMeetingPage() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const {
    isConnected,
    participants,
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isScreenSharing,
    chatMessages,
    error,
    meetingSettings,
    joinRoom,
    startProducing,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    leaveRoom
  } = useMediasoup();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  const localVideoRef = useRef(null);
  const chatEndRef = useRef(null);

  // Fetch meeting details
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        setLoading(true);
        const response = await videoMeetingService.getMeetingByRoomId(roomId);
        if (response.success) {
          setMeeting(response.data);
        }
      } catch (err) {
        console.error('[Meeting] Error fetching meeting:', err);
        toast.error('Meeting tidak ditemukan');
        navigate('/pegawai/video-meeting');
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      fetchMeeting();
    }
  }, [roomId, navigate]);

  // Join meeting
  const handleJoinMeeting = async () => {
    try {
      setLoading(true);
      const password = searchParams.get('password');
      
      await joinRoom(roomId, token, password);
      await startProducing(true, true);
      
      setHasJoined(true);
      toast.success('Berhasil bergabung ke meeting');
    } catch (err) {
      console.error('[Meeting] Error joining:', err);
      toast.error('Gagal bergabung ke meeting: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle leave meeting
  const handleLeaveMeeting = () => {
    leaveRoom();
    navigate('/pegawai/video-meeting');
    toast.info('Anda telah keluar dari meeting');
  };

  // Handle end meeting (host only)
  const handleEndMeeting = async () => {
    try {
      await videoMeetingService.endMeeting(meeting.id);
      leaveRoom();
      navigate('/pegawai/video-meeting');
      toast.success('Meeting berhasil diakhiri');
    } catch (err) {
      toast.error('Gagal mengakhiri meeting');
    }
  };

  // Handle send chat
  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChatMessage(chatInput.trim());
      setChatInput('');
    }
  };

  // Copy meeting link
  const copyMeetingLink = () => {
    const link = `${window.location.origin}/meet/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link meeting disalin');
  };

  if (loading && !hasJoined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Pre-join screen
  if (!hasJoined && meeting) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: '#1a1a2e',
        color: 'white'
      }}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center', bgcolor: '#16213e', color: 'white' }}>
          <Typography variant="h5" gutterBottom>
            {meeting.title}
          </Typography>
          <Typography variant="body2" color="grey.400" gutterBottom>
            {meeting.description}
          </Typography>
          
          <Box sx={{ my: 4 }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                maxWidth: 400,
                borderRadius: 8,
                background: '#000',
                transform: 'scaleX(-1)'
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
            <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
              <IconButton onClick={toggleMute} sx={{ bgcolor: isMuted ? 'error.main' : 'grey.700', color: 'white' }}>
                {isMuted ? <MicOff /> : <Mic />}
              </IconButton>
            </Tooltip>
            <Tooltip title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}>
              <IconButton onClick={toggleVideo} sx={{ bgcolor: isVideoOff ? 'error.main' : 'grey.700', color: 'white' }}>
                {isVideoOff ? <VideocamOff /> : <Videocam />}
              </IconButton>
            </Tooltip>
          </Box>

          <Button 
            variant="contained" 
            size="large" 
            onClick={handleJoinMeeting}
            disabled={loading}
            fullWidth
            sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#45a049' } }}
          >
            {loading ? <CircularProgress size={24} /> : 'Bergabung Sekarang'}
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: '#1a1a2e'
    }}>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          {error}
        </Alert>
      )}

      {/* Meeting Title Bar */}
      <Box sx={{ 
        p: 1, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: '#16213e',
        color: 'white'
      }}>
        <Typography variant="subtitle1">{meeting?.title}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="grey.400">
            Room: {roomId}
          </Typography>
          <Tooltip title="Copy Link">
            <IconButton size="small" onClick={copyMeetingLink} sx={{ color: 'white' }}>
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Video Grid */}
      <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Local Video */}
          <Grid item xs={12} md={participants.length > 0 ? 6 : 12} lg={participants.length > 2 ? 4 : 6}>
            <Paper sx={{ 
              height: '100%', 
              minHeight: 300,
              position: 'relative',
              overflow: 'hidden',
              bgcolor: '#0f0f23',
              borderRadius: 2
            }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)'
                }}
              />
              <Box sx={{ 
                position: 'absolute', 
                bottom: 10, 
                left: 10, 
                bgcolor: 'rgba(0,0,0,0.5)',
                px: 1,
                borderRadius: 1
              }}>
                <Typography variant="caption" color="white">
                  Anda {isMuted && '🔇'} {isVideoOff && '📷'}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Remote Videos */}
          {Array.from(remoteStreams).map(([peerId, stream]) => {
            const participant = participants.find(p => p.peerId === peerId);
            return (
              <Grid item xs={12} md={6} lg={4} key={peerId}>
                <Paper sx={{ 
                  height: '100%', 
                  minHeight: 300,
                  position: 'relative',
                  overflow: 'hidden',
                  bgcolor: '#0f0f23',
                  borderRadius: 2
                }}>
                  <RemoteVideo stream={stream} />
                  <Box sx={{ 
                    position: 'absolute', 
                    bottom: 10, 
                    left: 10, 
                    bgcolor: 'rgba(0,0,0,0.5)',
                    px: 1,
                    borderRadius: 1
                  }}>
                    <Typography variant="caption" color="white">
                      {participant?.name || peerId}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Control Bar */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: 2,
        bgcolor: '#16213e'
      }}>
        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
          <IconButton 
            onClick={toggleMute} 
            sx={{ 
              bgcolor: isMuted ? 'error.main' : 'grey.700', 
              color: 'white',
              '&:hover': { bgcolor: isMuted ? 'error.dark' : 'grey.600' }
            }}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </IconButton>
        </Tooltip>

        <Tooltip title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}>
          <IconButton 
            onClick={toggleVideo} 
            sx={{ 
              bgcolor: isVideoOff ? 'error.main' : 'grey.700', 
              color: 'white',
              '&:hover': { bgcolor: isVideoOff ? 'error.dark' : 'grey.600' }
            }}
          >
            {isVideoOff ? <VideocamOff /> : <Videocam />}
          </IconButton>
        </Tooltip>

        {meetingSettings?.isScreenShareEnabled && (
          <Tooltip title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}>
            <IconButton 
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              sx={{ 
                bgcolor: isScreenSharing ? 'primary.main' : 'grey.700', 
                color: 'white',
                '&:hover': { bgcolor: isScreenSharing ? 'primary.dark' : 'grey.600' }
              }}
            >
              {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
            </IconButton>
          </Tooltip>
        )}

        {meetingSettings?.isChatEnabled && (
          <Tooltip title="Chat">
            <IconButton 
              onClick={() => setChatOpen(!chatOpen)}
              sx={{ bgcolor: chatOpen ? 'primary.main' : 'grey.700', color: 'white' }}
            >
              <Badge badgeContent={chatMessages.length} color="error">
                <Chat />
              </Badge>
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Participants">
          <IconButton 
            onClick={() => setParticipantsOpen(!participantsOpen)}
            sx={{ bgcolor: participantsOpen ? 'primary.main' : 'grey.700', color: 'white' }}
          >
            <Badge badgeContent={participants.length + 1} color="primary">
              <People />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Leave Meeting">
          <IconButton 
            onClick={handleLeaveMeeting}
            sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
          >
            <CallEnd />
          </IconButton>
        </Tooltip>

        {meetingSettings?.isHost && (
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleEndMeeting}
            sx={{ ml: 2 }}
          >
            End Meeting
          </Button>
        )}
      </Box>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        PaperProps={{ sx: { width: 350, bgcolor: '#16213e', color: 'white' } }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="h6">Chat</Typography>
        </Box>
        
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {chatMessages.map((msg, idx) => (
            <Box key={idx} sx={{ mb: 2 }}>
              <Typography variant="caption" color="primary.light">
                {msg.senderName}
              </Typography>
              <Typography variant="body2">{msg.message}</Typography>
              <Typography variant="caption" color="grey.500">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </Typography>
            </Box>
          ))}
          <div ref={chatEndRef} />
        </Box>

        <Box component="form" onSubmit={handleSendChat} sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            InputProps={{
              endAdornment: (
                <IconButton type="submit" size="small">
                  <Send />
                </IconButton>
              ),
              sx: { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }
            }}
          />
        </Box>
      </Drawer>

      {/* Participants Drawer */}
      <Drawer
        anchor="right"
        open={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        PaperProps={{ sx: { width: 300, bgcolor: '#16213e', color: 'white' } }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="h6">Participants ({participants.length + 1})</Typography>
        </Box>
        
        <List>
          <ListItem>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {user?.name?.charAt(0) || 'Y'}
              </Avatar>
            </ListItemAvatar>
            <ListItemText 
              primary={`${user?.name || 'You'} (You)`}
              secondary={meetingSettings?.isHost ? 'Host' : 'Participant'}
              secondaryTypographyProps={{ color: 'grey.400' }}
            />
          </ListItem>
          <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
          
          {participants.map((p) => (
            <ListItem key={p.peerId}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  {p.name?.charAt(0) || '?'}
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={p.name}
                secondary="Participant"
                secondaryTypographyProps={{ color: 'grey.400' }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>
    </Box>
  );
}

// Remote video component
function RemoteVideo({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }}
    />
  );
}

export default VideoMeetingPage;
