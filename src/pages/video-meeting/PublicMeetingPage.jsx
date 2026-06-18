/**
 * Public Meeting Join Page
 * Allows anyone to join a meeting via shared link without login
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  MessageSquare, Users, PhoneOff, Send, Copy, X, Loader2,
  User, ArrowRight, Volume2, VolumeX, Hand, Settings, Signal,
  Clock, Sparkles, ShieldCheck, AlertTriangle, Disc, Square, Reply,
  Upload, Ban, Smile, Maximize, Minimize, Lock, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import useMeetingRecorder from './useMeetingRecorder';
import { VirtualBackgroundProcessor, loadImageFromFile } from './virtualBackground';

const API_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';
const GALLERY_PAGE_SIZE = 50;
const SIGNAL_ACK_TIMEOUT_MS = 12000;

const cleanRoomDisplayName = (value) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 80);

// Generate or get persistent guest ID
const getOrCreateGuestId = (roomId) => {
  const key = `guest_id_${roomId}`;
  let guestId = sessionStorage.getItem(key);
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, guestId);
  }
  return guestId;
};

const getMeetingClientId = (roomId) => {
  const key = `meeting_client_${roomId}`;
  let clientId = sessionStorage.getItem(key);
  if (!clientId) {
    clientId = globalThis.crypto?.randomUUID?.()
      || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, clientId);
  }
  return clientId;
};

// Remote Video Component
const RemoteVideo = ({ participant, stream, isSpeakerMuted, isActive, isHost, onHostMute, onHostUnmute }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const getHasVideo = useCallback((mediaStream) => {
    const track = mediaStream?.getVideoTracks?.()[0];
    return Boolean(track && track.enabled && !track.muted && track.readyState !== 'ended');
  }, []);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      setHasVideo(getHasVideo(stream));
    }
  }, [stream, getHasVideo]);
  
  // Separate audio element for reliable audio playback
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.muted = isSpeakerMuted;
      audioRef.current.play().catch(err => {
        console.warn(`[RemoteVideo] Audio autoplay blocked:`, err.message);
      });
    }
  }, [stream, isSpeakerMuted]);
  
  // Update muted state when isSpeakerMuted changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isSpeakerMuted;
    }
  }, [isSpeakerMuted]);
  
  useEffect(() => {
    if (!stream) return;
    
    const handleTrackChange = () => {
      setHasVideo(getHasVideo(stream));
    };
    const videoTracks = stream.getVideoTracks();
    
    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);
    videoTracks.forEach((track) => {
      track.addEventListener('mute', handleTrackChange);
      track.addEventListener('unmute', handleTrackChange);
      track.addEventListener('ended', handleTrackChange);
    });
    handleTrackChange();
    
    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
      videoTracks.forEach((track) => {
        track.removeEventListener('mute', handleTrackChange);
        track.removeEventListener('unmute', handleTrackChange);
        track.removeEventListener('ended', handleTrackChange);
      });
    };
  }, [stream, getHasVideo]);
  
  return (
    <div className={`relative w-full h-full min-h-0 bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center transition-all ${isActive ? 'ring-4 ring-emerald-400' : ''}`}>
      {isHost && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onHostMute?.(participant.oduserId, 'audio'); }}
            title="Mute mikrofon peserta"
            className="p-1.5 rounded-lg bg-black/55 hover:bg-amber-500/85 text-white"
          >
            <MicOff className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onHostUnmute?.(participant.oduserId, 'audio'); }}
            title="Unmute mikrofon peserta"
            className="p-1.5 rounded-lg bg-black/55 hover:bg-emerald-500/85 text-white"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${hasVideo ? 'block' : 'hidden'}`}
      />
      <audio ref={audioRef} autoPlay playsInline />
      {!hasVideo && (
        <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
          {(participant.userName || 'U')[0].toUpperCase()}
        </div>
      )}
      
      <div className="absolute bottom-1.5 left-1.5 max-w-[90%] bg-black/60 px-2 py-0.5 md:py-1 rounded-md md:rounded-lg">
        <span className="text-white text-xs md:text-sm truncate block">{participant.userName}</span>
      </div>
    </div>
  );
};

// Tampilan layar yang dibagikan (screen share) — object-contain, latar hitam.
// Selalu `muted`: suara layar diputar lewat <ScreenAudio> agar tidak dobel.
const ScreenShareView = ({ stream }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted className="w-full h-full object-contain bg-black" />;
};

// Pemutar suara screen share peserta lain (mis. audio tab YouTube). Dirender sekali
// per stream layar agar suara tidak dobel & tetap terdengar walau tile ada di filmstrip.
const ScreenAudio = ({ stream, muted }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream || null;
    ref.current.muted = muted;
    ref.current.play().catch(() => { /* autoplay diblokir → dibuka via tombol "Aktifkan Suara" */ });
  }, [stream, muted]);
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);
  return <audio ref={ref} autoPlay playsInline />;
};

// Keyframes & util animasi untuk layar lobby (di-inject sekali via <style>).
const LobbyStyles = () => (
  <style>{`
    @keyframes lobbyBlob {
      0%, 100% { transform: translate(0,0) scale(1); }
      33% { transform: translate(40px,-50px) scale(1.12); }
      66% { transform: translate(-30px,30px) scale(0.92); }
    }
    @keyframes lobbyFadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes lobbyGlowPulse {
      0%, 100% { opacity: .5; }
      50% { opacity: .9; }
    }
    @keyframes lobbyGridPan {
      from { background-position: 0 0; }
      to { background-position: 56px 56px; }
    }
    .lobby-blob { animation: lobbyBlob 18s ease-in-out infinite; will-change: transform; }
    .lobby-fade { opacity: 0; animation: lobbyFadeUp .7s cubic-bezier(.21,1.02,.73,1) forwards; }
    .lobby-glow { animation: lobbyGlowPulse 4s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .lobby-blob, .lobby-fade, .lobby-glow { animation: none !important; opacity: 1 !important; }
    }
  `}</style>
);

// Latar belakang aurora + grid halus, dipakai di semua layar pra-masuk room.
const LobbyShell = ({ children }) => (
  <div className="relative min-h-screen overflow-hidden bg-[#080b16] flex items-center justify-center p-4 sm:p-6">
    <LobbyStyles />
    {/* Grid halus */}
    <div
      className="absolute inset-0 opacity-[0.07]"
      style={{
        backgroundImage:
          'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        animation: 'lobbyGridPan 8s linear infinite',
      }}
    />
    {/* Orb gradien melayang */}
    <div className="lobby-blob absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-indigo-600/30 blur-[120px]" />
    <div className="lobby-blob absolute top-1/3 -right-24 w-[26rem] h-[26rem] rounded-full bg-violet-600/25 blur-[120px]" style={{ animationDelay: '-6s' }} />
    <div className="lobby-blob absolute -bottom-32 left-1/4 w-[24rem] h-[24rem] rounded-full bg-sky-500/20 blur-[120px]" style={{ animationDelay: '-12s' }} />
    {/* Vignette */}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080b16]" />
    <div className="relative z-10 w-full">{children}</div>
  </div>
);

const PublicMeetingPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  // Check if user is logged in
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const isLoggedIn = !!storedUser;
  
  // Generate persistent guest ID for this room
  const persistentGuestId = !isLoggedIn ? getOrCreateGuestId(roomId) : null;
  
  // Sesi lama hanya dipakai untuk mengingat nama, bukan untuk auto-join.
  const existingSession = sessionStorage.getItem(`meeting_${roomId}`);
  const sessionData = existingSession ? JSON.parse(existingSession) : null;
  const accountDisplayName = cleanRoomDisplayName(storedUser?.name || storedUser?.nama || storedUser?.username);
  const initialRoomDisplayName = cleanRoomDisplayName(sessionData?.displayName || sessionData?.guestName || accountDisplayName);
  
  // Pre-join state
  const [roomDisplayName, setRoomDisplayName] = useState(initialRoomDisplayName);
  const [roomNameDraft, setRoomNameDraft] = useState(initialRoomDisplayName);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [error, setError] = useState(null);
  
  // Meeting state
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [participants, setParticipants] = useState([]);
  const [myPeerId, setMyPeerId] = useState(persistentGuestId || storedUser?.id?.toString());
  const myPeerIdRef = useRef(persistentGuestId || storedUser?.id?.toString());
  const [meetingSettings, setMeetingSettings] = useState(null);

  // Webinar: hanya peserta "on stage" yang publish. Default true (rapat biasa).
  const [onStage, setOnStage] = useState(true);
  const onStageRef = useRef(true);
  const [myHandRaised, setMyHandRaised] = useState(false);
  const isWebinar = meetingSettings?.mode === 'webinar';

  // Pembicara aktif (disorot), kualitas jaringan, pilih kamera/mikrofon
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [netQuality, setNetQuality] = useState(null);
  const [devices, setDevices] = useState({ cams: [], mics: [] });
  const [selectedCam, setSelectedCam] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [galleryPage, setGalleryPage] = useState(0);

  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  
  // UI state
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null); // pesan yang sedang dibalas
  const chatInputRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  // Virtual background (efek latar)
  const [bgEffect, setBgEffect] = useState({ type: 'none', image: null, url: null });
  const [bgImages, setBgImages] = useState([]);
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const bgProcessorRef = useRef(null);
  const rawCamTrackRef = useRef(null);
  const isScreenSharingRef = useRef(false);

  // Reactions, waiting room, lock
  const [reactions, setReactions] = useState([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showHostAudioMenu, setShowHostAudioMenu] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [, setIsLocked] = useState(false);
  const REACTION_EMOJIS = ['👍', '👏', '❤️', '😂', '😮', '🎉', '🙏', '✋'];

  // Refs
  const localVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const socketRef = useRef(null);
  const meetingClientIdRef = useRef(getMeetingClientId(roomId));
  const mediaRecoveryRef = useRef(false);
  const localStreamRef = useRef(null); // Mirror of localStream state for use in callbacks
  const attachLocalVideo = useCallback((element) => {
    localVideoRef.current = element;
    const stream = localStreamRef.current;
    if (!element || !stream) return;
    element.srcObject = stream;
    const playPromise = element.play?.();
    if (playPromise?.catch) playPromise.catch(() => {});
  }, []);
  const producedRef = useRef(false); // Track if we've already produced
  
  // Mediasoup refs
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producersRef = useRef(new Map());
  const consumersRef = useRef(new Map());
  const rtpCapabilitiesRef = useRef(null);
  
  // Remote streams state
  const [remoteStreams, setRemoteStreams] = useState({});

  // Screen share (dual-producer ala Zoom)
  const [screenStreams, setScreenStreams] = useState({});
  const [screenSharerPeerId, setScreenSharerPeerId] = useState(null);
  const [screenSpotlightId, setScreenSpotlightId] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const screenSharerNameRef = useRef('');

  // Fullscreen, durasi, shortcut keyboard
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mainAreaRef = useRef(null);
  const [galleryAspect, setGalleryAspect] = useState(16 / 9);
  const [elapsed, setElapsed] = useState(0);
  const kbdActionsRef = useRef({});

  useEffect(() => {
    const area = mainAreaRef.current;
    if (!area || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setGalleryAspect(width / height);
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [joined]);

  // Buka kunci pemutaran audio remote (atasi blokir autoplay audio browser):
  // putar ulang semua <audio> pada interaksi pertama / via tombol "Aktifkan Suara".
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const unlockAudio = useCallback(() => {
    document.querySelectorAll('audio').forEach((el) => {
      const p = el.play();
      if (p && p.catch) p.catch(() => {});
    });
    setAudioUnlocked(true);
  }, []);
  useEffect(() => {
    if (audioUnlocked) return undefined;
    const handler = () => unlockAudio();
    window.addEventListener('pointerdown', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [audioUnlocked, unlockAudio]);

  // Get user info
  const user = isLoggedIn
    ? storedUser
    : { id: `guest_${Date.now()}`, name: roomDisplayName, nama: roomDisplayName, isGuest: true };

  const selfLabel = roomDisplayName || accountDisplayName || 'Saya';

  const gallery = useMemo(() => {
    const remoteTiles = participants
      .filter((p) => p.oduserId !== myPeerId)
      .map((p) => ({ key: p.oduserId, type: 'remote', participant: p }));
    const allTiles = [{ key: '__local__', type: 'local' }, ...remoteTiles];
    const totalPages = Math.max(1, Math.ceil(allTiles.length / GALLERY_PAGE_SIZE));
    const page = Math.min(galleryPage, totalPages - 1);
    const pageTiles = allTiles.slice(
      page * GALLERY_PAGE_SIZE,
      page * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE
    );
    const cols = Math.min(
      pageTiles.length,
      Math.max(1, Math.ceil(Math.sqrt((pageTiles.length * galleryAspect) / (16 / 9))))
    );
    const rows = Math.max(1, Math.ceil(pageTiles.length / cols));
    return { pageTiles, cols, rows, totalPages, page, participantCount: allTiles.length };
  }, [participants, myPeerId, galleryPage, galleryAspect]);

  useEffect(() => {
    if (galleryPage > gallery.totalPages - 1) {
      setGalleryPage(Math.max(0, gallery.totalPages - 1));
    }
  }, [galleryPage, gallery.totalPages]);

  // ── Rekam lokal: kumpulkan sumber video/audio terkini ke ref stabil
  // (anti stale-closure) agar peserta yang join saat merekam ikut terekam.
  const recorderDataRef = useRef({ video: [], audio: [] });
  useEffect(() => {
    const video = [];
    const audio = [];
    if (localStream) {
      if (!isVideoOff) {
        const vt = localStream.getVideoTracks();
        if (vt.length && vt[0].enabled !== false) {
          video.push({ id: 'local', stream: localStream, label: `${selfLabel} (Anda)` });
        }
      }
      if (localStream.getAudioTracks().length) audio.push(localStream);
    }
    participants.forEach((p) => {
      const s = remoteStreams[p.oduserId];
      if (!s) return;
      const vt = s.getVideoTracks();
      if (vt.length && vt[0].enabled !== false) {
        video.push({ id: String(p.oduserId), stream: s, label: p.userName });
      }
      if (s.getAudioTracks().length) audio.push(s);
    });
    recorderDataRef.current = { video, audio };
  }, [localStream, isVideoOff, remoteStreams, participants, selfLabel]);

  const getVideoSources = useCallback(() => recorderDataRef.current.video, []);
  const getAudioStreams = useCallback(() => recorderDataRef.current.audio, []);
  const getRecordingTitle = useCallback(() => meetingInfo?.title || 'Rekaman Rapat', [meetingInfo]);

  const recorder = useMeetingRecorder({ getVideoSources, getAudioStreams, getTitle: getRecordingTitle });

  useEffect(() => {
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error]);

  const handleToggleRecording = useCallback(async () => {
    if (recorder.isRecording) {
      recorder.stopRecording();
      toast('Rekaman dihentikan — menyimpan file…', { icon: '⏹️' });
      return;
    }
    try {
      const started = await recorder.startRecording();
      if (started) toast.success('Mulai merekam ke device Anda 🔴');
    } catch (e) {
      toast.error(e?.message || 'Gagal memulai rekaman');
    }
  }, [recorder]);

  const fmtElapsed = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Sync localStreamRef with localStream state (for use in socket callbacks)
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Produce local tracks when stream becomes available and transport is ready
  useEffect(() => {
    const produceIfReady = async () => {
      if (localStream && sendTransportRef.current && !producedRef.current) {
        console.log('[Mediasoup] Stream and transport ready, producing tracks');
        producedRef.current = true;
        await produceLocalTracks();
      }
    };
    produceIfReady();
  }, [localStream, connected]);

  // Sync video ref with stream when joined - retry until ref is available
  useEffect(() => {
    if (joined && localStream) {
      const setVideoSource = () => {
        if (localVideoRef.current) {
          console.log('Setting localVideoRef.srcObject');
          localVideoRef.current.srcObject = localStream;
          return true;
        }
        return false;
      };
      
      // Try immediately
      if (!setVideoSource()) {
        // If ref not ready, retry after render
        const interval = setInterval(() => {
          if (setVideoSource()) {
            clearInterval(interval);
          }
        }, 100);
        
        // Cleanup
        return () => clearInterval(interval);
      }
    }
  }, [joined, localStream]);

  // Fetch meeting info
  useEffect(() => {
    const fetchMeetingInfo = async () => {
      try {
        setLoadingInfo(true);
        const response = await fetch(`${API_URL}/api/video-meetings/public/${roomId}`);
        const data = await response.json();
        
        if (data.success) {
          setMeetingInfo(data.data);
        } else {
          setError(data.message || 'Meeting tidak ditemukan');
        }
      } catch (err) {
        console.error('Error fetching meeting info:', err);
        setError('Tidak dapat memuat informasi meeting');
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchMeetingInfo();
  }, [roomId]);

  // Preview camera before joining
  useEffect(() => {
    if (!joined) {
      initPreviewMedia();
    }
    
    return () => {
      // Only stop tracks if we're not in a meeting
      if (!joined && !joining && localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (showSettings) setRoomNameDraft(roomDisplayName);
  }, [showSettings, roomDisplayName]);

  const initPreviewMedia = async () => {
    try {
      console.log('Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log('Got media stream:', stream.getTracks().map(t => t.kind));
      rawCamTrackRef.current = stream.getVideoTracks()[0] || null;
      setLocalStream(stream);
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Error accessing media:', err);
      // Try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(audioStream);
        setIsVideoOff(true);
      } catch (audioErr) {
        console.error('Error accessing audio:', audioErr);
      }
    }
  };

  const recoverMeetingConnection = useCallback((message) => {
    if (mediaRecoveryRef.current) return;
    mediaRecoveryRef.current = true;
    setConnected(false);
    setConnectionStatus('reconnecting');
    toast.loading(message || 'Memulihkan koneksi meeting...', {
      id: 'public-meeting-connection-status',
    });

    consumersRef.current.forEach((peerConsumers) => {
      Object.values(peerConsumers).forEach((consumer) => consumer?.close());
    });
    consumersRef.current.clear();
    producersRef.current.forEach((producer) => producer?.close());
    producersRef.current.clear();
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    sendTransportRef.current = null;
    recvTransportRef.current = null;
    deviceRef.current = null;
    producedRef.current = false;
    setRemoteStreams({});
    setScreenStreams({});

    const socket = socketRef.current;
    if (!socket) {
      mediaRecoveryRef.current = false;
      return;
    }

    socket.disconnect();
    setTimeout(() => {
      if (socketRef.current === socket) socket.connect();
    }, 1000);
  }, []);

  // Helper: Create and setup mediasoup device
  const setupMediasoup = async (rtpCapabilities, existingProducers) => {
    try {
      consumersRef.current.forEach((peerConsumers) => {
        Object.values(peerConsumers).forEach((consumer) => consumer?.close());
      });
      consumersRef.current.clear();
      producersRef.current.forEach((producer) => producer?.close());
      producersRef.current.clear();
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();
      sendTransportRef.current = null;
      recvTransportRef.current = null;
      deviceRef.current = null;
      producedRef.current = false;
      setRemoteStreams({});
      setScreenStreams({});

      console.log('[Mediasoup] Setting up device with RTP capabilities');
      rtpCapabilitiesRef.current = rtpCapabilities;
      
      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;
      console.log('[Mediasoup] Device loaded successfully');
      
      await createSendTransport();
      await createRecvTransport();
      
      // Use ref to get current stream (state might be stale in callback)
      const stream = localStreamRef.current;
      if (stream) {
        console.log('[Mediasoup] Local stream available, producing tracks');
        await produceLocalTracks();
      } else {
        console.log('[Mediasoup] No local stream yet, will produce when available');
      }
      
      // Consume existing producers
      if (existingProducers && existingProducers.length > 0) {
        console.log('[Mediasoup] Consuming existing producers:', existingProducers.length, existingProducers);
        const selfId = isLoggedIn ? String(storedUser.id) : persistentGuestId;
        for (const producer of existingProducers) {
          const peerIdStr = String(producer.peerId);
          // Don't consume our own producers
          if (peerIdStr === selfId) {
            console.log('[Mediasoup] Skipping own producer:', producer.producerId);
            continue;
          }
          console.log(`[Mediasoup] Consuming producer ${producer.producerId} from peer ${peerIdStr}`);
          await consumeProducer(producer.producerId, peerIdStr, producer.kind, producer.appData?.mediaType || 'video');
        }
      }
    } catch (error) {
      console.error('[Mediasoup] Setup error:', error);
      recoverMeetingConnection('Setup media terganggu, mencoba kembali...');
    }
  };
  
  const createSendTransport = async () => {
    return new Promise((resolve, reject) => {
      socketRef.current.timeout(SIGNAL_ACK_TIMEOUT_MS).emit('create-transport', { direction: 'send' }, async (ackError, response) => {
        if (ackError) {
          reject(new Error('Timeout membuat koneksi upload'));
          return;
        }
        if (response.error) {
          console.error('[Mediasoup] Create send transport error:', response.error);
          reject(new Error(response.error));
          return;
        }
        
        const transport = deviceRef.current.createSendTransport(response.transport);
        
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          console.log('[Mediasoup] Send transport connecting...');
          socketRef.current.timeout(SIGNAL_ACK_TIMEOUT_MS).emit('connect-transport', {
            transportId: transport.id,
            dtlsParameters
          }, (ackError, res) => {
            if (ackError) {
              errback(new Error('Timeout menghubungkan transport upload'));
              return;
            }
            if (res.error) {
              console.error('[Mediasoup] Send transport connect error:', res.error);
              errback(new Error(res.error));
            } else {
              console.log('[Mediasoup] Send transport connected successfully');
              callback();
            }
          });
        });
        
        transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
          console.log('[Mediasoup] Producing:', kind);
          socketRef.current.timeout(SIGNAL_ACK_TIMEOUT_MS).emit('produce', {
            transportId: transport.id,
            kind,
            rtpParameters,
            appData
          }, (ackError, res) => {
            if (ackError) {
              errback(new Error(`Timeout mengirim ${kind}`));
              return;
            }
            if (res.error) errback(new Error(res.error));
            else callback({ id: res.id });
          });
        });
        
        // Monitor connection state
        transport.on('connectionstatechange', (state) => {
          console.log('[Mediasoup] Send transport connection state:', state);
          if (state === 'failed') {
            console.error('[Mediasoup] Send transport connection failed!');
            recoverMeetingConnection('Koneksi upload terganggu, memulihkan meeting...');
          }
        });
        
        sendTransportRef.current = transport;
        console.log('[Mediasoup] Send transport created');
        resolve(transport);
      });
    });
  };
  
  const createRecvTransport = async () => {
    return new Promise((resolve, reject) => {
      socketRef.current.timeout(SIGNAL_ACK_TIMEOUT_MS).emit('create-transport', { direction: 'recv' }, async (ackError, response) => {
        if (ackError) {
          reject(new Error('Timeout membuat koneksi penerimaan'));
          return;
        }
        if (response.error) {
          console.error('[Mediasoup] Create recv transport error:', response.error);
          reject(new Error(response.error));
          return;
        }
        
        const transport = deviceRef.current.createRecvTransport(response.transport);
        
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          console.log('[Mediasoup] Recv transport connecting...');
          socketRef.current.timeout(SIGNAL_ACK_TIMEOUT_MS).emit('connect-transport', {
            transportId: transport.id,
            dtlsParameters
          }, (ackError, res) => {
            if (ackError) {
              errback(new Error('Timeout menghubungkan transport penerimaan'));
              return;
            }
            if (res.error) {
              console.error('[Mediasoup] Recv transport connect error:', res.error);
              errback(new Error(res.error));
            } else {
              console.log('[Mediasoup] Recv transport connected successfully');
              callback();
            }
          });
        });
        
        // Monitor connection state
        transport.on('connectionstatechange', (state) => {
          console.log('[Mediasoup] Recv transport connection state:', state);
          if (state === 'failed') {
            console.error('[Mediasoup] Recv transport connection failed!');
            recoverMeetingConnection('Koneksi video terganggu, memulihkan meeting...');
          }
        });
        
        recvTransportRef.current = transport;
        console.log('[Mediasoup] Recv transport created');
        resolve(transport);
      });
    });
  };
  
  // Naik panggung (mulai publish) — saat host meng-"angkat" penonton.
  const goLive = async () => {
    onStageRef.current = true;
    setOnStage(true);
    producedRef.current = true;
    await produceLocalTracks();
  };
  // Turun panggung (berhenti publish).
  const stopLive = () => {
    ['audio', 'video'].forEach((k) => {
      const pr = producersRef.current.get(k);
      if (pr) {
        try { pr.close(); } catch { /* noop */ }
        socketRef.current?.emit('close-producer', { producerId: pr.id });
        producersRef.current.delete(k);
      }
    });
    producedRef.current = false;
    onStageRef.current = false;
    setOnStage(false);
  };
  const toggleRaiseHand = () => {
    const next = !myHandRaised;
    setMyHandRaised(next);
    socketRef.current?.emit('raise-hand', { raised: next }, () => {});
    toast(next ? 'Tangan diangkat ✋' : 'Tangan diturunkan', { icon: next ? '✋' : '👇' });
  };

  // ===== Pilih kamera/mikrofon (#6) =====
  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        cams: list.filter((d) => d.kind === 'videoinput'),
        mics: list.filter((d) => d.kind === 'audioinput'),
      });
    } catch { /* abaikan */ }
  }, []);
  useEffect(() => { if (localStream) refreshDevices(); }, [localStream, refreshDevices]);

  const applyDeviceSelection = async ({ camId, micId }) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    try {
      if (camId !== undefined) {
        const ns = await navigator.mediaDevices.getUserMedia({ video: camId ? { deviceId: { exact: camId } } : true });
        const nv = ns.getVideoTracks()[0];
        const ov = stream.getVideoTracks()[0];
        if (nv) {
          if (bgProcessorRef.current && bgEffect.type !== 'none') {
            const oldRaw = rawCamTrackRef.current;
            rawCamTrackRef.current = nv;
            await bgProcessorRef.current.setInputTrack(nv);
            if (oldRaw && oldRaw !== nv) oldRaw.stop();
          } else {
            if (ov) { ov.stop(); stream.removeTrack(ov); }
            stream.addTrack(nv);
            rawCamTrackRef.current = nv;
            const vp = producersRef.current.get('video');
            if (vp && !vp.closed) await vp.replaceTrack({ track: nv });
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          }
        }
        setSelectedCam(camId || '');
      }
      if (micId !== undefined) {
        const ns = await navigator.mediaDevices.getUserMedia({ audio: micId ? { deviceId: { exact: micId } } : true });
        const na = ns.getAudioTracks()[0];
        const oa = stream.getAudioTracks()[0];
        if (na) {
          if (oa) { oa.stop(); stream.removeTrack(oa); }
          stream.addTrack(na);
          const ap = producersRef.current.get('audio');
          if (ap && !ap.closed) await ap.replaceTrack({ track: na });
        }
        setSelectedMic(micId || '');
      }
      toast.success('Perangkat diperbarui');
    } catch (e) {
      console.error('[Devices] switch error:', e);
      toast.error('Gagal mengganti perangkat');
    }
  };

  // Paksa <video> self-view/preview menyegarkan track baru (cegah layar hitam saat
  // mengganti track pada referensi stream yang sama).
  const refreshLocalVideo = (stream) => {
    const v = localVideoRef.current || previewVideoRef.current;
    if (!v) return;
    try { v.srcObject = null; } catch { /* noop */ }
    v.srcObject = stream;
    const p = v.play?.();
    if (p && p.catch) p.catch(() => {});
  };

  // ===== Virtual background (efek latar) =====
  const applyBgEffect = useCallback(async (next) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setBgBusy(true);
    try {
      const producer = producersRef.current.get('video');
      if (!rawCamTrackRef.current) rawCamTrackRef.current = stream.getVideoTracks()[0] || null;
      let rawTrack = rawCamTrackRef.current;

      const ensureLiveRawTrack = async () => {
        const current = localStreamRef.current?.getVideoTracks()[0] || null;
        const looksLikeCanvas = rawTrack?.label?.toLowerCase?.().includes('canvas');
        const isBad =
          !rawTrack ||
          rawTrack.readyState === 'ended' ||
          rawTrack.muted ||
          looksLikeCanvas ||
          (bgProcessorRef.current && current && rawTrack === current);

        if (!isBad) return rawTrack;

        const ns = await navigator.mediaDevices.getUserMedia({
          video: selectedCam ? { deviceId: { exact: selectedCam } } : true,
        });
        rawTrack = ns.getVideoTracks()[0];
        rawCamTrackRef.current = rawTrack;
        return rawTrack;
      };

      if (next.type === 'none') {
        if (bgProcessorRef.current) { bgProcessorRef.current.stop(); bgProcessorRef.current = null; }
        rawTrack = await ensureLiveRawTrack();
        const cur = stream.getVideoTracks()[0];
        if (cur && cur !== rawTrack) stream.removeTrack(cur);
        if (!stream.getVideoTracks().includes(rawTrack)) stream.addTrack(rawTrack);
        if (producer && !producer.closed) await producer.replaceTrack({ track: rawTrack });
        refreshLocalVideo(stream);
        setBgEffect({ type: 'none', image: null, url: null });
        return;
      }
      if (!VirtualBackgroundProcessor.isSupported()) { toast.error('Browser tidak mendukung virtual background'); return; }
      rawTrack = await ensureLiveRawTrack();
      if (!rawTrack) { toast.error('Kamera tidak aktif'); return; }

      let processed;
      if (!bgProcessorRef.current) {
        bgProcessorRef.current = new VirtualBackgroundProcessor();
        processed = await bgProcessorRef.current.start(rawTrack, { type: next.type, image: next.image || null });
      } else {
        bgProcessorRef.current.setEffect({ type: next.type, image: next.image || null });
        processed = bgProcessorRef.current.getOutputTrack();
      }

      if (!processed || processed.readyState === 'ended') {
        throw new Error('Track virtual background tidak tersedia');
      }

      if (producer && !producer.closed && processed) await producer.replaceTrack({ track: processed });

      const cur = stream.getVideoTracks()[0];
      if (cur && cur !== processed) stream.removeTrack(cur);
      if (processed && !stream.getVideoTracks().includes(processed)) stream.addTrack(processed);
      refreshLocalVideo(stream);

      setBgEffect({ type: next.type, image: next.image || null, url: next.url || null });
    } catch (e) {
      console.error('[BG] apply error', e);
      toast.error('Gagal menerapkan latar virtual. Coba lagi.');
      if (bgProcessorRef.current) { try { bgProcessorRef.current.stop(); } catch { /* noop */ } bgProcessorRef.current = null; }
      const fallbackRaw = rawCamTrackRef.current;
      const streamNow = localStreamRef.current;
      if (streamNow && fallbackRaw && fallbackRaw.readyState !== 'ended') {
        const cur = streamNow.getVideoTracks()[0];
        if (cur && cur !== fallbackRaw) streamNow.removeTrack(cur);
        if (!streamNow.getVideoTracks().includes(fallbackRaw)) streamNow.addTrack(fallbackRaw);
        try {
          const producer = producersRef.current.get('video');
          if (producer && !producer.closed) await producer.replaceTrack({ track: fallbackRaw });
        } catch { /* preview tetap dipulihkan */ }
        refreshLocalVideo(streamNow);
      }
      setBgEffect({ type: 'none', image: null, url: null });
    } finally {
      setBgBusy(false);
    }
  }, [selectedCam]);

  const handleUploadBgImage = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('File harus berupa gambar'); return; }
    try {
      const { img, url } = await loadImageFromFile(file);
      setBgImages((prev) => [{ url, img }, ...prev].slice(0, 8));
      await applyBgEffect({ type: 'image', image: img, url });
    } catch {
      toast.error('Gagal memuat gambar');
    }
  }, [applyBgEffect]);

  const sendReaction = (emoji) => {
    socketRef.current?.emit('reaction', { emoji });
    setShowReactionPicker(false);
  };

  const hostMuteParticipant = (peerId, kind = 'audio') => {
    socketRef.current?.emit('host-mute-participant', { targetPeerId: peerId, kind }, (response) => {
      if (response?.error) toast.error(response.error);
      else toast.success(kind === 'video' ? 'Kamera peserta dimatikan' : 'Mikrofon peserta dimatikan');
    });
  };

  const hostUnmuteParticipant = (peerId, kind = 'audio') => {
    socketRef.current?.emit('host-unmute-participant', { targetPeerId: peerId, kind }, (response) => {
      if (response?.error) toast.error(response.error);
      else toast.success(kind === 'video' ? 'Kamera peserta dinyalakan' : 'Mikrofon peserta dinyalakan');
    });
  };

  const hostMuteAll = () => {
    socketRef.current?.emit('host-mute-all', {}, (response) => {
      if (response?.error) toast.error(response.error);
      else toast.success('Mikrofon semua peserta dimatikan');
    });
  };

  const hostUnmuteAll = () => {
    socketRef.current?.emit('host-unmute-all', {}, (response) => {
      if (response?.error) toast.error(response.error);
      else toast.success('Mikrofon semua peserta dinyalakan');
    });
  };

  // ===== Indikator kualitas jaringan (#8) =====
  useEffect(() => {
    if (!connected) return undefined;
    let prev = { lost: 0, sent: 0 };
    const id = setInterval(async () => {
      const t = sendTransportRef.current;
      if (!t) return;
      try {
        const stats = await t.getStats();
        let lost = 0, sent = 0, rtt = null;
        stats.forEach((r) => {
          if (r.type === 'outbound-rtp') sent += r.packetsSent || 0;
          if (r.type === 'remote-inbound-rtp') {
            lost += r.packetsLost || 0;
            if (r.roundTripTime != null) rtt = r.roundTripTime;
          }
          if (r.type === 'candidate-pair' && r.nominated && r.currentRoundTripTime != null) rtt = r.currentRoundTripTime;
        });
        const dSent = sent - prev.sent;
        const dLost = lost - prev.lost;
        prev = { lost, sent };
        const lossRate = dSent + dLost > 0 ? dLost / (dSent + dLost) : 0;
        let q = 'good';
        if (lossRate > 0.08 || (rtt != null && rtt > 0.4)) q = 'poor';
        else if (lossRate > 0.03 || (rtt != null && rtt > 0.2)) q = 'fair';
        setNetQuality(q);
      } catch { /* abaikan */ }
    }, 4000);
    return () => clearInterval(id);
  }, [connected]);

  const produceLocalTracks = async () => {
    // Mode webinar: penonton (bukan on-stage) tidak publish apa pun.
    if (!onStageRef.current) {
      console.log('[Webinar] Bukan di panggung — lewati publish (mode penonton).');
      return;
    }
    const stream = localStreamRef.current;
    if (!sendTransportRef.current || !stream) {
      console.log('[Mediasoup] Cannot produce - sendTransport or stream not ready', {
        sendTransport: !!sendTransportRef.current,
        stream: !!stream
      });
      return;
    }
    
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const audioProducer = await sendTransportRef.current.produce({
          track: audioTrack,
          appData: { mediaType: 'audio' }
        });
        producersRef.current.set('audio', audioProducer);
        console.log('[Mediasoup] Audio producer created:', audioProducer.id);
      }
      
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const videoProducer = await sendTransportRef.current.produce({
          track: videoTrack,
          // Simulcast: 3 lapis kualitas (adaptif & hemat untuk skala besar).
          encodings: [
            { rid: 'r0', maxBitrate: 150000, scaleResolutionDownBy: 4 },
            { rid: 'r1', maxBitrate: 500000, scaleResolutionDownBy: 2 },
            { rid: 'r2', maxBitrate: 1200000 },
          ],
          codecOptions: { videoGoogleStartBitrate: 1000 },
          appData: { mediaType: 'video' }
        });
        producersRef.current.set('video', videoProducer);
        console.log('[Mediasoup] Video producer created:', videoProducer.id);
      }
    } catch (error) {
      console.error('[Mediasoup] Produce error:', error);
      recoverMeetingConnection('Pengiriman kamera/mikrofon terganggu, memulihkan meeting...');
    }
  };
  
  const consumeProducer = async (producerId, peerId, kind, mediaType = 'video') => {
    // Ensure peerId is always a string for consistency
    const peerIdStr = String(peerId);
    // Layar = video ('screen') dan/atau audio tab/sistem ('screenAudio').
    const isScreen = mediaType === 'screen' || mediaType === 'screenAudio';
    const storeKey = isScreen ? `screen:${peerIdStr}` : peerIdStr;

    if (!recvTransportRef.current || !deviceRef.current) {
      console.warn('[Mediasoup] Cannot consume - transport not ready');
      return;
    }
    
    console.log(`[Mediasoup] consumeProducer called:`, { producerId, peerId: peerIdStr, kind });
    
    return new Promise((resolve, reject) => {
      socketRef.current.timeout(SIGNAL_ACK_TIMEOUT_MS).emit('consume', {
        transportId: recvTransportRef.current.id,
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities
      }, async (ackError, response) => {
        if (ackError) {
          reject(new Error('Timeout menerima media peserta'));
          return;
        }
        if (response.error) {
          console.error('[Mediasoup] Consume error:', response.error);
          reject(new Error(response.error));
          return;
        }
        
        try {
          const consumer = await recvTransportRef.current.consume({
            id: response.consumer.id,
            producerId: response.consumer.producerId,
            kind: response.consumer.kind,
            rtpParameters: response.consumer.rtpParameters
          });
          
          // Log consumer track state
          console.log(`[Mediasoup] Consumer created:`, {
            consumerId: consumer.id,
            kind: consumer.kind,
            trackId: consumer.track.id,
            trackKind: consumer.track.kind,
            trackEnabled: consumer.track.enabled,
            trackReadyState: consumer.track.readyState,
            trackMuted: consumer.track.muted
          });
          
          // Resume consumer
          socketRef.current.timeout(SIGNAL_ACK_TIMEOUT_MS).emit('resume-consumer', { consumerId: consumer.id }, (ackError, resumeRes) => {
            if (ackError) {
              console.warn('[Mediasoup] Resume consumer timeout:', consumer.id);
              return;
            }
            console.log('[Mediasoup] Consumer resumed:', consumer.id, 'response:', resumeRes);
          });
          
          // Monitor consumer track state changes
          consumer.track.onended = () => {
            console.log(`[Mediasoup] Consumer ${consumer.id} track ended`);
          };
          consumer.track.onmute = () => {
            console.log(`[Mediasoup] Consumer ${consumer.id} track muted`);
          };
          consumer.track.onunmute = () => {
            console.log(`[Mediasoup] Consumer ${consumer.id} track unmuted`);
          };
          
          // Store consumer (layar di bawah kunci `screen:<peerId>`)
          if (!consumersRef.current.has(storeKey)) {
            consumersRef.current.set(storeKey, {});
          }
          consumersRef.current.get(storeKey)[kind] = consumer;

          if (isScreen) {
            // Gabungkan track baru ke stream layar yang ada (video + audio tab).
            setScreenStreams(prev => {
              const next = { ...prev };
              const merged = new MediaStream();
              const existing = prev[peerIdStr];
              if (existing) existing.getTracks().forEach(t => merged.addTrack(t));
              merged.addTrack(consumer.track);
              next[peerIdStr] = merged;
              return next;
            });
            setScreenSharerPeerId(peerIdStr);
          } else {
            // Add track to remote stream - create NEW MediaStream to ensure React detects change
            setRemoteStreams(prev => {
              const newStreams = { ...prev };
              const existingStream = prev[peerIdStr];
              const newStream = new MediaStream();
              if (existingStream) {
                existingStream.getTracks().forEach(track => newStream.addTrack(track));
              }
              newStream.addTrack(consumer.track);
              newStreams[peerIdStr] = newStream;
              console.log(`[Mediasoup] Added ${kind} track to remoteStreams[${peerIdStr}], total tracks:`, newStream.getTracks().length);
              return newStreams;
            });
          }
          
          console.log(`[Mediasoup] Consuming ${kind} from peer ${peerIdStr}`);
          resolve(consumer);
        } catch (error) {
          console.error('[Mediasoup] Consumer creation error:', error);
          reject(error);
        }
      });
    });
  };

  const handleJoinMeeting = async () => {
    const cleanName = cleanRoomDisplayName(roomDisplayName);
    if (!cleanName) {
      toast.error('Silakan masukkan nama Anda');
      return;
    }
    setRoomDisplayName(cleanName);
    setRoomNameDraft(cleanName);

    setJoining(true);
    setConnectionStatus('connecting');
    
    try {
      // Get token from authSession or expressToken
      let token = localStorage.getItem('expressToken');
      if (!token) {
        // Fallback: try to get from authSession
        const authSession = localStorage.getItem('authSession');
        if (authSession) {
          try {
            const session = JSON.parse(authSession);
            token = session.token;
          } catch (e) {
            console.error('Error parsing authSession:', e);
          }
        }
      }
      
      // Connect to socket
      socketRef.current = io(API_URL, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        // Polling-only: LB/proxy di depan (TLS) belum meneruskan upgrade WebSocket,
        // sehingga 'websocket' selalu gagal & memunculkan error di console. Polling
        // sudah cukup untuk signaling (media tetap via WebRTC langsung). Kembalikan
        // ke ['polling','websocket'] bila WebSocket passthrough sudah diaktifkan.
        transports: (import.meta.env.VITE_SOCKET_TRANSPORTS || 'polling').split(',').map((t) => t.trim()),
        auth: {
          token: token || null,
          guestName: cleanName,
          displayName: cleanName,
          guestId: persistentGuestId, // Persistent guest ID for reconnection
          meetingClientId: meetingClientIdRef.current,
        }
      });

      let joinInFlight = false;
      let joinCompleted = false;
      let joinRetryTimer = null;

      const scheduleJoinRetry = (message) => {
        if (joinCompleted || joinRetryTimer) return;
        joinInFlight = false;
        setConnectionStatus('reconnecting');
        toast.loading(message || 'Menyiapkan ulang koneksi meeting...', {
          id: 'public-meeting-connection-status',
        });
        joinRetryTimer = setTimeout(() => {
          joinRetryTimer = null;
          doJoinRoom();
        }, 3000);
      };

      const handleJoinResponse = async (response) => {
        console.log('Join room response:', response);
        joinInFlight = false;

        if (response.error) {
          const isPwd = /password/i.test(response.error);
          if (!isPwd && !/not found|not active|dikunci/i.test(response.error)) {
            scheduleJoinRetry(response.error);
            return;
          }
          toast.error(isPwd ? 'Password meeting salah' : response.error, {
            id: 'public-meeting-connection-status',
          });
          setPasswordError(isPwd);
          setJoining(false);
          // Putuskan socket gagal agar tidak menumpuk saat mencoba lagi.
          try { socketRef.current?.disconnect(); } catch { /* noop */ }
          sessionStorage.removeItem(`meeting_${roomId}`);
          return;
        }

        // Waiting room: host belum menerima. Tampilkan layar menunggu.
        if (response.waiting) {
          setJoining(false);
          setWaitingRoom(true);
          return;
        }

        if (response.success) {
          if (joinCompleted) return;
          joinCompleted = true;
          if (joinRetryTimer) clearTimeout(joinRetryTimer);
          joinRetryTimer = null;
          const joinedName = cleanRoomDisplayName(response.displayName || response.userName || cleanName);
          setRoomDisplayName(joinedName);
          setRoomNameDraft(joinedName);
          setWaitingRoom(false);
          setConnected(true);
          setConnectionStatus('connected');
          mediaRecoveryRef.current = false;
          toast.dismiss('public-meeting-connection-status');
          setJoined(true);
          setJoining(false);

          // Simpan nama tampilan untuk kunjungan berikutnya, tanpa auto-join.
          sessionStorage.setItem(`meeting_${roomId}`, JSON.stringify({
            guestName: joinedName,
            displayName: joinedName,
            joinedAt: Date.now()
          }));

          // Save our peer ID for filtering
          if (response.peerId) {
            setMyPeerId(String(response.peerId));
            myPeerIdRef.current = String(response.peerId);
          }

          // Webinar: simpan settings + status panggung (onStage). Default true (rapat biasa).
          if (response.meetingSettings) {
            setMeetingSettings(response.meetingSettings);
            const stage = response.meetingSettings.onStage !== false;
            onStageRef.current = stage;
            setOnStage(stage);
            setIsLocked(response.meetingSettings.isLocked === true);
          }

          // Set existing peers from the room (excluding self)
          if (response.existingPeers && response.existingPeers.length > 0) {
            const myId = String(response.peerId || (isLoggedIn ? storedUser.id : persistentGuestId));
            const filteredPeers = response.existingPeers
              .filter(p => String(p.oduserId) !== myId)
              .map(p => ({
                oduserId: String(p.oduserId),
                userName: p.userName || 'Peserta'
              }));
            console.log('[existingPeers] Normalized peers:', filteredPeers);
            setParticipants(filteredPeers);
          }

          if (response.rtpCapabilities) {
            await setupMediasoup(response.rtpCapabilities, response.producers);
          }

          // Update video ref
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
          }

          toast.success('Berhasil bergabung ke meeting');
        }
      };

      const doJoinRoom = () => {
        if (joinInFlight || joinCompleted || !socketRef.current?.connected) return;
        joinInFlight = true;
        setParticipants([]);
        socketRef.current.timeout(SIGNAL_ACK_TIMEOUT_MS).emit(
          'join-room',
          {
            roomId,
            guestName: cleanName,
            displayName: cleanName,
            guestId: persistentGuestId,
            password: password || undefined,
          },
          (ackError, response) => {
            if (ackError) {
              scheduleJoinRetry('Server belum merespons, mencoba kembali...');
              return;
            }
            handleJoinResponse(response);
          },
        );
      };

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        doJoinRoom();
      });

      // Waiting room: host menerima / menolak.
      socketRef.current.on('admitted', () => {
        toast.success('Anda diterima masuk oleh host');
        doJoinRoom();
      });
      socketRef.current.on('join-rejected', () => {
        setWaitingRoom(false);
        toast.error('Permintaan bergabung ditolak oleh host');
        setTimeout(() => { cleanup(); navigate('/'); }, 1500);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnectionStatus('reconnecting');
        toast.loading('Koneksi terganggu, mencoba menyambungkan kembali...', {
          id: 'public-meeting-connection-status',
        });
      });

      socketRef.current.io.on('reconnect_attempt', () => {
        setConnectionStatus('reconnecting');
      });

      socketRef.current.on('peer-joined', (data) => {
        console.log('[peer-joined] Received:', data);
        const peerIdStr = String(data.peerId);
        
        // Ignore ourselves (shouldn't happen, but just in case)
        const selfId = isLoggedIn ? String(storedUser.id) : persistentGuestId;
        if (peerIdStr === selfId) return;
        
        setParticipants(prev => {
          // Avoid duplicates
          if (prev.some(p => p.oduserId === peerIdStr)) return prev;
          console.log('[peer-joined] Adding participant:', { oduserId: peerIdStr, userName: data.name });
          return [...prev, { oduserId: peerIdStr, userName: data.name }];
        });
        toast.success(`${data.name} bergabung`);
      });

      socketRef.current.on('participant-renamed', (data) => {
        const peerIdStr = String(data?.peerId || '');
        const nextName = cleanRoomDisplayName(data?.userName || data?.displayName);
        if (!peerIdStr || !nextName) return;
        setParticipants((prev) => prev.map((p) => (
          p.oduserId === peerIdStr ? { ...p, userName: nextName } : p
        )));
        if (peerIdStr === String(myPeerIdRef.current)) {
          setRoomDisplayName(nextName);
          setRoomNameDraft(nextName);
        }
      });

      socketRef.current.on('peer-left', (data) => {
        console.log('[peer-left] Received:', data);
        const peerIdStr = String(data.peerId);
        
        setParticipants(prev => prev.filter(p => p.oduserId !== peerIdStr));
        toast(`${data.userName} keluar`, { icon: '👋' });
        
        // Remove remote stream and consumers
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[peerIdStr];
          return newStreams;
        });
        
        if (consumersRef.current.has(peerIdStr)) {
          const peerConsumers = consumersRef.current.get(peerIdStr);
          Object.values(peerConsumers).forEach(consumer => consumer?.close());
          consumersRef.current.delete(peerIdStr);
        }

        // Bersihkan layar peserta yang keluar.
        const screenKey = `screen:${peerIdStr}`;
        if (consumersRef.current.has(screenKey)) {
          Object.values(consumersRef.current.get(screenKey)).forEach(c => c?.close());
          consumersRef.current.delete(screenKey);
        }
        setScreenStreams(prev => { if (!prev[peerIdStr]) return prev; const n = { ...prev }; delete n[peerIdStr]; return n; });
        setScreenSharerPeerId(prev => (prev === peerIdStr ? null : prev));
        setScreenSpotlightId(null);
      });
      
      // Handle new producer from other peer
      socketRef.current.on('new-producer', async (data) => {
        console.log('[new-producer] Received:', data);
        const { producerId, peerId, kind, userName, mediaType } = data;
        const peerIdStr = String(peerId);
        const selfId = isLoggedIn ? String(storedUser.id) : persistentGuestId;
        
        // Don't consume our own producers
        if (peerIdStr === selfId) {
          console.log('[new-producer] Ignoring own producer');
          return;
        }
        
        // Add participant if not already in list
        setParticipants((prev) => {
          if (prev.some(p => p.oduserId === peerIdStr)) return prev;
          console.log('[new-producer] Adding participant:', { oduserId: peerIdStr, userName });
          return [...prev, { oduserId: peerIdStr, userName: userName || 'Peserta' }];
        });
        
        // Wait for recv transport to be ready (might be race condition on initial load)
        if (!recvTransportRef.current) {
          console.log('[new-producer] Waiting for recv transport...');
          let retries = 0;
          while (!recvTransportRef.current && retries < 50) {
            await new Promise(r => setTimeout(r, 100));
            retries++;
          }
          if (!recvTransportRef.current) {
            console.error('[new-producer] Recv transport not ready after 5s, cannot consume');
            return;
          }
        }
        
        // Consume the new producer
        try {
          console.log(`[new-producer] Consuming ${kind} (${mediaType}) from peer ${peerIdStr}`);
          await consumeProducer(producerId, peerIdStr, kind, mediaType || 'video');
        } catch (error) {
          console.error('[new-producer] Error consuming:', error);
        }
      });
      
      // Handle producer closed
      socketRef.current.on('producer-closed', (data) => {
        const { producerId, peerId } = data;
        const peerIdStr = String(peerId);

        // Cek layar (screen share) dulu.
        const screenKey = `screen:${peerIdStr}`;
        const screenConsumers = consumersRef.current.get(screenKey);
        if (screenConsumers && Object.values(screenConsumers).some(c => c?.producerId === producerId)) {
          Object.values(screenConsumers).forEach(c => c?.close());
          consumersRef.current.delete(screenKey);
          setScreenStreams(prev => { const n = { ...prev }; delete n[peerIdStr]; return n; });
          setScreenSharerPeerId(prev => (prev === peerIdStr ? null : prev));
          setScreenSpotlightId(null);
          return;
        }

        if (consumersRef.current.has(peerIdStr)) {
          const peerConsumers = consumersRef.current.get(peerIdStr);
          Object.entries(peerConsumers).forEach(([kind, consumer]) => {
            if (consumer?.producerId === producerId) {
              consumer.close();
              delete peerConsumers[kind];
            }
          });
        }
      });

      socketRef.current.on('chat-message', (message) => {
        setMessages(prev => [...prev, message]);
        if (!chatOpen) {
          setUnreadCount(prev => prev + 1);
        }
      });

      // Pembicara dominan berubah → sorot tile-nya.
      socketRef.current.on('active-speaker', (data) => {
        if (data?.peerId != null) setActiveSpeaker(String(data.peerId));
      });

      // Server media terputus (worker mediasoup mati).
      socketRef.current.on('meeting-interrupted', (data) => {
        recoverMeetingConnection(data?.message || 'Server media terputus, memulihkan meeting...');
      });

      // Webinar: status panggung berubah (diangkat/diturunkan host)
      socketRef.current.on('stage-updated', async (data) => {
        const { peerId, onStage: nowOnStage } = data || {};
        const pid = String(peerId);
        setParticipants(prev => prev.map(p => (p.oduserId === pid ? { ...p, onStage: nowOnStage } : p)));
        if (pid === String(myPeerIdRef.current)) {
          if (nowOnStage) {
            setMyHandRaised(false);
            toast.success('Anda diangkat ke panggung — kamera & mic aktif');
            await goLive();
          } else {
            toast('Anda dipindah ke penonton', { icon: '🔇' });
            stopLive();
          }
        }
      });

      socketRef.current.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error(error.message || 'Terjadi kesalahan');
        setJoining(false);
      });

      socketRef.current.on('disconnect', (reason) => {
        setConnected(false);
        joinInFlight = false;
        joinCompleted = false;
        if (joinRetryTimer) clearTimeout(joinRetryTimer);
        joinRetryTimer = null;
        if (reason !== 'io client disconnect') {
          setConnectionStatus('reconnecting');
          toast.loading('Koneksi terputus, mencoba menyambungkan kembali...', {
            id: 'public-meeting-connection-status',
          });
        }
      });

      // Handle meeting ended by host
      socketRef.current.on('meeting-ended', (data) => {
        console.log('Meeting ended:', data);
        toast(`Meeting telah diakhiri oleh ${data.endedBy}`, { icon: '📢' });
        cleanup();
        // Clear session storage to prevent auto-rejoin
        sessionStorage.removeItem(`meeting_${roomId}`);
        sessionStorage.removeItem(`guest_id_${roomId}`);
        // Redirect to home or show ended message
        window.location.href = '/';
      });

      // ===== Reactions, lock, kontrol host =====
      socketRef.current.on('reaction', (data) => {
        const item = { id: data.id || `${Date.now()}-${Math.random()}`, emoji: data.emoji, userName: data.userName };
        setReactions((prev) => [...prev, item]);
        setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== item.id)), 4000);
      });

      socketRef.current.on('lock-updated', (data) => {
        setIsLocked(data?.locked === true);
      });

      socketRef.current.on('force-muted', (data) => {
        const kind = data?.kind || 'audio';
        if (kind === 'audio') {
          const track = localStreamRef.current?.getAudioTracks()[0];
          if (track && track.enabled) {
            track.enabled = false;
            setIsMuted(true);
            socketRef.current?.emit('media-state-change', { roomId, isMuted: true, isVideoOff });
          }
          toast(`Mikrofon Anda dimatikan oleh ${data?.by || 'host'}`, { icon: '🔇' });
        } else {
          const track = localStreamRef.current?.getVideoTracks()[0];
          if (track && track.enabled) {
            track.enabled = false;
            setIsVideoOff(true);
            socketRef.current?.emit('media-state-change', { roomId, isMuted, isVideoOff: true });
          }
          toast(`Kamera Anda dimatikan oleh ${data?.by || 'host'}`, { icon: '📷' });
        }
      });

      socketRef.current.on('force-unmuted', (data) => {
        const kind = data?.kind || 'audio';
        if (kind === 'audio') {
          const track = localStreamRef.current?.getAudioTracks()[0];
          if (track && !track.enabled) {
            track.enabled = true;
            setIsMuted(false);
            socketRef.current?.emit('media-state-change', { roomId, isMuted: false, isVideoOff });
          }
          toast(`Mikrofon Anda dinyalakan oleh ${data?.by || 'host'}`, { icon: '🎙️' });
        } else {
          const track = localStreamRef.current?.getVideoTracks()[0];
          if (track && !track.enabled) {
            track.enabled = true;
            setIsVideoOff(false);
            socketRef.current?.emit('media-state-change', { roomId, isMuted, isVideoOff: false });
          }
          toast(`Kamera Anda dinyalakan oleh ${data?.by || 'host'}`, { icon: '📷' });
        }
      });

      socketRef.current.on('removed-by-host', (data) => {
        toast.error(`Anda dikeluarkan dari meeting oleh ${data?.by || 'host'}`);
        cleanup();
        sessionStorage.removeItem(`meeting_${roomId}`);
        setTimeout(() => { window.location.href = '/'; }, 1200);
      });

    } catch (err) {
      console.error('Error joining meeting:', err);
      toast.error('Gagal bergabung ke meeting');
      setJoining(false);
    }
  };

  const cleanup = () => {
    // Close all consumers
    consumersRef.current.forEach((peerConsumers) => {
      Object.values(peerConsumers).forEach(consumer => consumer?.close());
    });
    consumersRef.current.clear();
    
    // Close all producers
    producersRef.current.forEach(producer => producer?.close());
    producersRef.current.clear();
    
    // Close transports
    if (sendTransportRef.current) {
      sendTransportRef.current.close();
      sendTransportRef.current = null;
    }
    if (recvTransportRef.current) {
      recvTransportRef.current.close();
      recvTransportRef.current = null;
    }
    
    deviceRef.current = null;

    if (bgProcessorRef.current) {
      try { bgProcessorRef.current.stop(); } catch { /* noop */ }
      bgProcessorRef.current = null;
    }
    if (rawCamTrackRef.current) {
      try { rawCamTrackRef.current.stop(); } catch { /* noop */ }
      rawCamTrackRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    if (localScreenStream) {
      localScreenStream.getTracks().forEach(track => track.stop());
    }

    setRemoteStreams({});
    setScreenStreams({});
    setScreenSharerPeerId(null);
    setScreenSpotlightId(null);
    setLocalScreenStream(null);
    
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId });
      socketRef.current.disconnect();
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const nextMuted = !audioTrack.enabled;
        setIsMuted(nextMuted);
        socketRef.current?.emit('media-state-change', {
          roomId,
          isMuted: nextMuted,
          isVideoOff,
        });
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const nextVideoOff = !videoTrack.enabled;
        setIsVideoOff(nextVideoOff);
        socketRef.current?.emit('media-state-change', {
          roomId,
          isMuted,
          isVideoOff: nextVideoOff,
        });
      }
    }
  };

  // Dual-producer ala Zoom: layar = producer terpisah, kamera tetap jalan.
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      try {
        const sp = producersRef.current.get('screen');
        if (sp) {
          try { sp.close(); } catch { /* noop */ }
          socketRef.current?.emit('close-producer', { producerId: sp.id });
          producersRef.current.delete('screen');
        }
        // Tutup juga producer audio layar (bila tadi berbagi suara).
        const sap = producersRef.current.get('screenAudio');
        if (sap) {
          try { sap.close(); } catch { /* noop */ }
          socketRef.current?.emit('close-producer', { producerId: sap.id });
          producersRef.current.delete('screenAudio');
        }
        if (localScreenStream) localScreenStream.getTracks().forEach(t => t.stop());
        setLocalScreenStream(null);
        setScreenSharerPeerId(prev => (prev === myPeerIdRef.current ? null : prev));
        setScreenSpotlightId(null);
        socketRef.current?.emit('screen-share-stopped');
        setIsScreenSharing(false);
        isScreenSharingRef.current = false;
      } catch (err) {
        console.error('Error stopping screen share:', err);
      }
    } else {
      try {
        // Minta audio sekalian → bisa berbagi suara tab (mis. video YouTube).
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        const screenAudioTrack = screenStream.getAudioTracks()[0];

        const screenProducer = await sendTransportRef.current.produce({
          track: screenTrack,
          encodings: [{ maxBitrate: 2500000 }],
          codecOptions: { videoGoogleStartBitrate: 1500 },
          appData: { mediaType: 'screen' },
        });
        producersRef.current.set('screen', screenProducer);

        // Producer audio layar TERPISAH bila pengguna mencentang "Bagikan audio".
        if (screenAudioTrack) {
          const screenAudioProducer = await sendTransportRef.current.produce({
            track: screenAudioTrack,
            codecOptions: {
              opusStereo: true,
              opusFec: true,
              opusDtx: false,
              opusMaxAverageBitrate: 128000,
            },
            appData: { mediaType: 'screenAudio' },
          });
          producersRef.current.set('screenAudio', screenAudioProducer);
        }

        // Simpan SELURUH stream (video + audio) agar berhenti = semua track stop;
        // elemen self-view tetap muted sehingga tidak ada echo lokal.
        setLocalScreenStream(screenStream);
        setScreenSharerPeerId(myPeerIdRef.current);
        screenSharerNameRef.current = `${roomDisplayName || accountDisplayName || 'Anda'} (Anda)`;
        isScreenSharingRef.current = true;

        screenTrack.onended = () => { toggleScreenShare(); };

        socketRef.current?.emit('screen-share-started');
        setIsScreenSharing(true);
        toast.success(
          screenAudioTrack
            ? 'Berbagi layar + suara aktif'
            : 'Berbagi layar aktif (centang "Bagikan audio" untuk ikut membagikan suara)'
        );
      } catch (err) {
        console.error('Error starting screen share:', err);
        if (err.name !== 'NotAllowedError') {
          toast.error('Gagal memulai screen share');
        }
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerMuted(prev => {
      const newValue = !prev;
      toast(newValue ? 'Speaker dimatikan' : 'Speaker dinyalakan', { icon: newValue ? '🔇' : '🔊' });
      return newValue;
    });
  };

  // ===== Fullscreen, durasi, shortcut keyboard =====
  const toggleFullscreen = useCallback(() => {
    const el = mainAreaRef.current;
    if (!el) return;
    if (!document.fullscreenElement) (el.requestFullscreen?.() || Promise.resolve()).catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  useEffect(() => {
    if (!connected) return undefined;
    const start = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [connected]);
  const fmtDuration = (s) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  };
  const canPublishNow = !(isWebinar && !onStage);
  kbdActionsRef.current = { toggleMute, toggleVideo, toggleScreenShare, toggleFullscreen, canPublish: canPublishNow };
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const a = kbdActionsRef.current;
      const k = e.key.toLowerCase();
      if (k === 'm' && a.canPublish) { e.preventDefault(); a.toggleMute?.(); }
      else if (k === 'v' && a.canPublish) { e.preventDefault(); a.toggleVideo?.(); }
      else if (k === 's' && a.canPublish) { e.preventDefault(); a.toggleScreenShare?.(); }
      else if (k === 'f') { e.preventDefault(); a.toggleFullscreen?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return;

    socketRef.current.emit('chat-message', {
      roomId,
      message: newMessage.trim(),
      userName: roomDisplayName || accountDisplayName || 'Peserta',
      replyTo: replyTo
        ? { id: replyTo.id, senderName: replyTo.senderName, message: replyTo.message }
        : null,
    });

    setNewMessage('');
    setReplyTo(null);
  };

  const saveRoomDisplayName = () => {
    const nextName = cleanRoomDisplayName(roomNameDraft);
    if (!nextName) {
      toast.error('Nama di room tidak boleh kosong');
      return;
    }

    const applyName = (name) => {
      setRoomDisplayName(name);
      setRoomNameDraft(name);
      const prev = JSON.parse(sessionStorage.getItem(`meeting_${roomId}`) || '{}');
      sessionStorage.setItem(`meeting_${roomId}`, JSON.stringify({
        ...prev,
        guestName: name,
        displayName: name,
        joinedAt: prev.joinedAt || Date.now(),
      }));
    };

    if (!socketRef.current?.connected) {
      applyName(nextName);
      return;
    }

    socketRef.current.emit('update-display-name', { displayName: nextName }, (response) => {
      if (response?.error) {
        toast.error(response.error);
        return;
      }
      applyName(cleanRoomDisplayName(response?.displayName || nextName));
      toast.success('Nama di room diperbarui');
    });
  };

  // Mulai membalas sebuah pesan (fokuskan input).
  const startReply = (msg) => {
    setReplyTo({
      id: msg.id,
      senderName: msg.senderName || msg.userName || 'Peserta',
      message: msg.message,
    });
    setTimeout(() => chatInputRef.current?.focus(), 0);
  };

  const handleLeave = () => {
    // Clear session so we don't auto-rejoin
    sessionStorage.removeItem(`meeting_${roomId}`);
    cleanup();
    navigate('/');
  };

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link meeting disalin');
  };

  const openChat = () => {
    setChatOpen(true);
    setUnreadCount(0);
  };

  // Loading state
  if (loadingInfo) {
    return (
      <LobbyShell>
        <div className="lobby-fade flex flex-col items-center justify-center gap-5 text-center">
          <div className="relative">
            <div className="lobby-glow absolute inset-0 rounded-full bg-indigo-500/40 blur-xl" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <Video className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Memuat informasi meeting…</span>
          </div>
        </div>
      </LobbyShell>
    );
  }

  // Error state
  if (error) {
    return (
      <LobbyShell>
        <div className="lobby-fade mx-auto w-full max-w-md text-center bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Tidak dapat membuka meeting</h2>
          <p className="text-sm text-white/60 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </LobbyShell>
    );
  }

  // Pre-join screen
  if (!joined) {
    const sched = meetingInfo?.scheduled_start ? new Date(meetingInfo.scheduled_start) : null;
    const schedStr = sched && !isNaN(sched.getTime())
      ? sched.toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      : null;
    const currentP = meetingInfo?.current_participants ?? 0;
    const maxP = meetingInfo?.max_participants;
    const canJoin = !joining && roomDisplayName.trim() && (!meetingInfo?.requires_password || password.trim());

    return (
      <LobbyShell>
        <div className="mx-auto w-full max-w-5xl">
          {/* Header */}
          <div className="lobby-fade text-center mb-7 sm:mb-9" style={{ animationDelay: '.05s' }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-medium text-indigo-200 mb-4 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              DPMD · Video Meeting
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-transparent mb-3 px-2">
              {meetingInfo?.title || 'Video Meeting'}
            </h1>
            {meetingInfo?.description && (
              <p className="text-white/55 max-w-xl mx-auto text-sm sm:text-base px-4">{meetingInfo.description}</p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-white/70">
                <span className="relative flex h-2 w-2">
                  <span className="lobby-glow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                {currentP > 0 ? `${currentP} sedang di ruangan` : 'Jadilah yang pertama bergabung'}
              </span>
              {schedStr && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-white/70">
                  <Clock className="w-3.5 h-3.5 text-indigo-300" /> {schedStr}
                </span>
              )}
              {maxP ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-white/70">
                  <Users className="w-3.5 h-3.5 text-violet-300" /> maks {maxP}
                </span>
              ) : null}
            </div>
          </div>

          {/* Card */}
          <div
            className="lobby-fade grid lg:grid-cols-[1.15fr_.85fr] gap-5 sm:gap-6 items-stretch"
            style={{ animationDelay: '.18s' }}
          >
            {/* Video Preview */}
            <div className="relative group">
              <div className="lobby-glow absolute -inset-px rounded-[1.75rem] bg-gradient-to-r from-indigo-500/40 via-violet-500/30 to-sky-500/40 blur-md" />
              <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-[1.6rem] overflow-hidden aspect-video border border-white/10 shadow-2xl">
                <video
                  ref={previewVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full transition-opacity duration-300 ${
                    bgEffect.type === 'image' ? 'object-contain' : 'object-cover scale-x-[-1]'
                  } ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                />

                {isVideoOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                      <User className="w-10 h-10 sm:w-12 sm:h-12 text-white/40" />
                    </div>
                    <span className="text-xs text-white/40">Kamera dimatikan</span>
                  </div>
                )}

                {/* Pill status preview */}
                <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-white/10 text-[11px] font-medium text-white/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 lobby-glow" />
                  Pratinjau
                </div>

                {/* Gradient bawah utk keterbacaan kontrol */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                {/* Kontrol preview */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  <button
                    onClick={toggleMute}
                    title={isMuted ? 'Nyalakan mikrofon' : 'Matikan mikrofon'}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 backdrop-blur-md border ${
                      isMuted
                        ? 'bg-red-500/90 border-red-400/50 text-white shadow-lg shadow-red-500/30'
                        : 'bg-white/15 border-white/20 hover:bg-white/25 text-white'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={toggleVideo}
                    title={isVideoOff ? 'Nyalakan kamera' : 'Matikan kamera'}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 backdrop-blur-md border ${
                      isVideoOff
                        ? 'bg-red-500/90 border-red-400/50 text-white shadow-lg shadow-red-500/30'
                        : 'bg-white/15 border-white/20 hover:bg-white/25 text-white'
                    }`}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Join Form */}
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-[1.6rem] border border-white/10 shadow-2xl p-6 sm:p-7 flex flex-col justify-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-1">Siap bergabung?</h2>
              <p className="text-sm text-white/50 mb-6">Periksa kamera & mikrofon Anda sebelum masuk.</p>

              {isLoggedIn && (
                <div className="mb-5 flex items-center gap-3 bg-white/[0.05] border border-white/10 rounded-xl p-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-indigo-500/25">
                    {(accountDisplayName || 'U')[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{accountDisplayName || 'Peserta'}</p>
                    <p className="text-white/45 text-sm capitalize">Masuk sebagai {storedUser?.role || 'pegawai'}</p>
                  </div>
                </div>
              )}

              <div className="mb-5">
                <label className="block text-sm font-medium text-white/70 mb-2">Nama di room</label>
                <input
                  type="text"
                  value={roomDisplayName}
                  onChange={(e) => {
                    setRoomDisplayName(e.target.value);
                    setRoomNameDraft(e.target.value);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canJoin) handleJoinMeeting(); }}
                  placeholder="Masukkan nama yang tampil di meeting"
                  autoFocus={!isLoggedIn}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {meetingInfo?.requires_password && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-300" /> Password Meeting
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && canJoin) handleJoinMeeting(); }}
                    placeholder="Masukkan password meeting"
                    className={`w-full px-4 py-3 bg-white/[0.05] border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all ${
                      passwordError
                        ? 'border-red-400/70 focus:border-red-400 focus:ring-red-500/20'
                        : 'border-white/15 focus:border-indigo-400/70 focus:ring-indigo-500/20'
                    }`}
                  />
                  {passwordError && (
                    <p className="mt-1.5 text-xs text-red-300">Password salah, coba lagi.</p>
                  )}
                </div>
              )}

              <button
                onClick={handleJoinMeeting}
                disabled={!canJoin}
                className="group/btn w-full relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-white overflow-hidden transition-all active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
              >
                <span className="absolute inset-0 bg-white/0 group-hover/btn:bg-white/10 transition-colors" />
                {joining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="relative">Bergabung…</span>
                  </>
                ) : (
                  <>
                    <span className="relative">Gabung Sekarang</span>
                    <ArrowRight className="w-5 h-5 relative transition-transform group-hover/btn:translate-x-1" />
                  </>
                )}
              </button>

              <div className="mt-5 flex items-center justify-between text-xs text-white/40">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70" /> Koneksi terenkripsi
                </span>
                <span className="font-mono">Room: {roomId}</span>
              </div>
            </div>
          </div>
        </div>
      </LobbyShell>
    );
  }

  // Main meeting view
  return (
    <div className="h-[100dvh] bg-gray-900 flex flex-col overflow-hidden">
      {connectionStatus === 'reconnecting' && (
        <div className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          Menyambungkan kembali ke meeting...
        </div>
      )}
      {/* Banner aktifkan suara: muncul sampai user berinteraksi (atasi blokir autoplay audio) */}
      {!audioUnlocked && (
        <button
          onClick={unlockAudio}
          className="fixed left-2 right-2 top-2 z-50 mx-auto flex w-fit max-w-[calc(100vw-1rem)] items-center justify-center gap-2 rounded-full bg-amber-500 px-3 py-2 text-center text-xs font-semibold text-white shadow-lg transition-colors hover:bg-amber-600 sm:left-1/2 sm:right-auto sm:top-3 sm:max-w-none sm:-translate-x-1/2 sm:px-4 sm:text-sm"
        >
          <Volume2 className="w-4 h-4" /> Klik untuk mengaktifkan suara peserta
        </button>
      )}
      {/* Header */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-1.5 border-b border-white/10 px-2 py-1.5 sm:flex-nowrap sm:gap-2 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <h1 className="text-white font-semibold text-base sm:text-lg truncate max-w-[40vw] sm:max-w-none">
            {meetingInfo?.title || 'Video Meeting'}
          </h1>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${connected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            {connected ? 'Terhubung' : '…'}
          </span>
          {connected && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/70 tabular-nums" title="Durasi meeting">
              <Clock className="w-3 h-3" /> {fmtDuration(elapsed)}
            </span>
          )}
        </div>

        <div className="order-2 flex w-full min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:order-none sm:w-auto sm:shrink-0 sm:gap-2">
          {netQuality && (
            <span title={`Kualitas jaringan: ${netQuality}`} className="flex items-center">
              <Signal className={`w-4 h-4 ${netQuality === 'good' ? 'text-green-400' : netQuality === 'fair' ? 'text-yellow-400' : 'text-red-400'}`} />
            </span>
          )}
          {/* Rekam lokal ke device (dipindah dari toolbar) */}
          {recorder.supported && (
            <button
              onClick={handleToggleRecording}
              className={`flex items-center gap-1.5 rounded-lg transition-colors ${
                recorder.isRecording
                  ? 'px-2.5 py-1.5 bg-red-600/90 hover:bg-red-700 text-white'
                  : 'p-2 text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={recorder.isRecording ? 'Hentikan & simpan rekaman' : 'Rekam rapat ke device'}
            >
              {recorder.isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs font-semibold tabular-nums">{fmtElapsed(recorder.elapsed)}</span>
                </>
              ) : (
                <Disc className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            title={isFullscreen ? 'Keluar layar penuh (F)' : 'Layar penuh (F)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { refreshDevices(); setShowSettings(true); }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            title="Pengaturan"
          >
            <Settings className="w-4 h-4" />
          </button>
          <span className="hidden md:inline text-white/60 text-sm">Room: {roomId}</span>
          <button
            onClick={copyMeetingLink}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            title="Salin link undangan"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pemutar suara screen share peserta lain (audio tab/sistem, mis. YouTube).
          Dirender sekali per stream layar agar tidak dobel & tetap terdengar. */}
      {Object.entries(screenStreams)
        .filter(([, s]) => s.getAudioTracks().length > 0)
        .map(([pid, s]) => (
          <ScreenAudio key={`screen-audio-${pid}`} stream={s} muted={isSpeakerMuted} />
        ))}

      {/* Video Grid */}
      <div ref={mainAreaRef} className="flex-1 p-2 sm:p-3 md:p-4 overflow-hidden flex flex-col min-h-0 bg-gray-900">
        {/* Tile self-view (dipakai di galeri & filmstrip; hanya 1 yang ter-mount) */}
        {(() => {
          const LocalTile = (
            <div className="relative bg-gray-800 rounded-xl overflow-hidden w-full h-full">
              <video
                ref={attachLocalVideo}
                autoPlay
                muted
                playsInline
                className={`w-full h-full ${
                  bgEffect.type === 'image' ? 'object-contain' : 'object-cover scale-x-[-1]'
                } ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 md:w-20 md:h-20 bg-gray-700 rounded-full flex items-center justify-center text-white text-lg md:text-2xl font-semibold">
                    {((roomDisplayName || accountDisplayName || 'P')[0] || 'P').toUpperCase()}
                  </div>
                </div>
              )}
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1.5 bg-black/60 px-2 py-0.5 md:py-1 rounded-md md:rounded-lg max-w-[90%]">
                <span className="text-white text-xs md:text-sm truncate">
                  {roomDisplayName || accountDisplayName || 'Peserta'} (Anda)
                </span>
                {isMuted && <MicOff className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                {isScreenSharing && <Monitor className="w-3.5 h-3.5 text-green-500 shrink-0" />}
              </div>
            </div>
          );

          const screenShareEntries = [
            ...(localScreenStream ? [{
              peerId: myPeerId,
              stream: localScreenStream,
              name: `${roomDisplayName || accountDisplayName || 'Anda'} (Anda)`,
            }] : []),
            ...Object.entries(screenStreams).map(([peerId, stream]) => ({
              peerId,
              stream,
              name: participants.find((p) => p.oduserId === peerId)?.userName || 'Peserta',
            })),
          ].filter((entry) => entry.peerId && entry.stream);
          const activeScreenEntry = screenShareEntries.find((entry) => entry.peerId === screenSharerPeerId) || screenShareEntries[0] || null;

          if (activeScreenEntry) {
            const s = activeScreenEntry.stream;
            const sharerName = activeScreenEntry.name || screenSharerNameRef.current || 'Peserta';
            const spotlightParticipant = participants.find((p) => p.oduserId === screenSpotlightId);
            const spotlightValid = Boolean(screenSpotlightId && spotlightParticipant);
            return (
              <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
                <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden bg-black group">
                  {spotlightValid ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <RemoteVideo
                        participant={spotlightParticipant}
                        stream={remoteStreams[screenSpotlightId]}
                        isSpeakerMuted={isSpeakerMuted}
                        isActive={activeSpeaker === screenSpotlightId}
                        isHost={meetingSettings?.isHost}
                        onHostMute={hostMuteParticipant}
                        onHostUnmute={hostUnmuteParticipant}
                      />
                    </div>
                  ) : s ? (
                    <ScreenShareView stream={s} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">Memuat layar…</div>
                  )}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-lg">
                    <Monitor className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-white text-xs md:text-sm truncate max-w-[60vw]">
                      {spotlightValid ? 'Fokus peserta' : `Layar dibagikan oleh ${sharerName}`}
                    </span>
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title={isFullscreen ? 'Keluar layar penuh (F)' : 'Layar penuh (F)'}
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
                <div className="shrink-0 flex flex-row lg:flex-col gap-2 lg:w-52 overflow-x-auto lg:overflow-y-auto lg:max-h-full pb-1 lg:pb-0">
                  {spotlightValid && s && (
                    <button
                      type="button"
                      onClick={() => setScreenSpotlightId(null)}
                      className="shrink-0 w-32 sm:w-40 lg:w-full aspect-video relative rounded-xl overflow-hidden bg-black ring-2 ring-transparent hover:ring-green-400 transition-shadow"
                      title="Kembali ke layar"
                    >
                      <ScreenShareView stream={s} />
                      <span className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                        <Monitor className="w-3 h-3 text-green-400" /> Layar
                      </span>
                    </button>
                  )}
                  {screenShareEntries
                    .filter((entry) => entry.peerId !== activeScreenEntry.peerId)
                    .map((entry) => (
                      <button
                        type="button"
                        key={`screen-${entry.peerId}`}
                        onClick={() => { setScreenSpotlightId(null); setScreenSharerPeerId(entry.peerId); }}
                        className="shrink-0 w-32 sm:w-40 lg:w-full aspect-video relative rounded-xl overflow-hidden bg-black ring-2 ring-transparent hover:ring-green-400 transition-shadow"
                        title={`Tampilkan layar ${entry.name}`}
                      >
                        <ScreenShareView stream={entry.stream} />
                        <span className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white max-w-[90%]">
                          <Monitor className="w-3 h-3 text-green-400 shrink-0" /> <span className="truncate">{entry.name}</span>
                        </span>
                      </button>
                    ))}
                  <div className="shrink-0 w-32 sm:w-40 lg:w-full aspect-video">{LocalTile}</div>
                  {participants.filter((p) => p.oduserId !== myPeerId && p.oduserId !== screenSpotlightId).map((participant) => (
                    <button
                      type="button"
                      key={participant.oduserId}
                      onClick={() => setScreenSpotlightId(participant.oduserId)}
                      className="shrink-0 w-32 sm:w-40 lg:w-full aspect-video rounded-xl overflow-hidden ring-2 ring-transparent hover:ring-white/40 transition-shadow"
                      title="Fokuskan ke tampilan utama"
                    >
                      <RemoteVideo
                        participant={participant}
                        stream={remoteStreams[participant.oduserId]}
                        isSpeakerMuted={isSpeakerMuted}
                        isActive={activeSpeaker === participant.oduserId}
                        isHost={meetingSettings?.isHost}
                        onHostMute={hostMuteParticipant}
                        onHostUnmute={hostUnmuteParticipant}
                      />
                    </button>
                  ))}
                </div>
              </div>
            );
          }

          const renderGalleryTile = (tile) => {
            if (tile.type === 'local') return LocalTile;
            return (
              <RemoteVideo
                participant={tile.participant}
                stream={remoteStreams[tile.participant.oduserId]}
                isSpeakerMuted={isSpeakerMuted}
                isActive={activeSpeaker === tile.participant.oduserId}
                isHost={meetingSettings?.isHost}
                onHostMute={hostMuteParticipant}
                onHostUnmute={hostUnmuteParticipant}
              />
            );
          };

          return (
            <>
              <div
                className={`flex-1 grid min-h-0 ${
                  gallery.pageTiles.length > 25 ? 'gap-1 md:gap-1.5' : 'gap-2 md:gap-3'
                }`}
                style={{
                  gridTemplateColumns: `repeat(${gallery.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gallery.rows}, minmax(0, 1fr))`,
                }}
              >
                {gallery.pageTiles.map((tile) => (
                  <div key={tile.key} className="min-h-0">
                    {renderGalleryTile(tile)}
                  </div>
                ))}
              </div>
              {gallery.totalPages > 1 && (
                <div className="shrink-0 flex items-center justify-center gap-2 pt-1.5 sm:gap-3 sm:pt-3">
                  <button
                    type="button"
                    onClick={() => setGalleryPage(Math.max(0, gallery.page - 1))}
                    disabled={gallery.page === 0}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Halaman sebelumnya"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="whitespace-nowrap text-xs text-white/70 tabular-nums sm:text-sm">
                    Halaman {gallery.page + 1} / {gallery.totalPages} · {gallery.participantCount} peserta
                  </span>
                  <button
                    type="button"
                    onClick={() => setGalleryPage(Math.min(gallery.totalPages - 1, gallery.page + 1))}
                    disabled={gallery.page >= gallery.totalPages - 1}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Halaman berikutnya"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center gap-2 border-t border-white/10 bg-gray-900/95 px-2 py-2 sm:px-4 sm:py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex w-max items-center gap-2 px-1">
        {isWebinar && !onStage ? (
          <button
            onClick={toggleRaiseHand}
            className={`flex items-center gap-2 px-5 h-12 rounded-full transition-colors text-white ${
              myHandRaised ? 'bg-amber-500 hover:bg-amber-600' : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Minta izin bicara"
          >
            <Hand className="w-5 h-5" /> {myHandRaised ? 'Turunkan Tangan' : 'Angkat Tangan'}
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
              } text-white`}
              title={isMuted ? 'Nyalakan mikrofon' : 'Matikan mikrofon'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
              } text-white`}
              title={isVideoOff ? 'Nyalakan kamera' : 'Matikan kamera'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                isScreenSharing ? 'bg-green-500 hover:bg-green-600' : 'bg-white/10 hover:bg-white/20'
              } text-white`}
              title={isScreenSharing ? 'Hentikan berbagi layar' : 'Bagikan layar'}
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </button>
          </>
        )}

        {/* Reactions (emoji) */}
        <div className="relative">
          <button
            onClick={() => setShowReactionPicker((v) => !v)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors text-white ${
              showReactionPicker ? 'bg-amber-500 hover:bg-amber-600' : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Kirim reaksi"
          >
            <Smile className="w-5 h-5" />
          </button>
          {showReactionPicker && (
            <div className="fixed bottom-20 left-2 right-2 z-50 mx-auto flex w-fit max-w-[calc(100vw-1rem)] gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-gray-800 p-2 shadow-xl sm:absolute sm:bottom-14 sm:left-1/2 sm:right-auto sm:max-w-none sm:-translate-x-1/2">
              {REACTION_EMOJIS.map((em) => (
                <button
                  key={em}
                  onClick={() => sendReaction(em)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg hover:bg-white/10 text-xl sm:text-2xl flex items-center justify-center transition-colors"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={toggleSpeaker}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
            isSpeakerMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
          } text-white`}
          title={isSpeakerMuted ? 'Nyalakan Speaker' : 'Matikan Speaker'}
        >
          {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {meetingSettings?.isHost && (
          <div className="relative">
            <button
              onClick={() => {
                setShowHostAudioMenu((v) => !v);
                setShowReactionPicker(false);
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors text-white ${
                showHostAudioMenu ? 'bg-amber-500 hover:bg-amber-600' : 'bg-white/10 hover:bg-white/20'
              }`}
              title="Kontrol mikrofon peserta"
            >
              <MicOff className="w-5 h-5" />
            </button>
            {showHostAudioMenu && (
              <div className="fixed bottom-20 left-1/2 z-50 min-w-48 -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-gray-800 shadow-xl sm:absolute sm:bottom-14">
                <button
                  onClick={() => { setShowHostAudioMenu(false); hostMuteAll(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-white hover:bg-white/10"
                >
                  <MicOff className="w-4 h-4 text-amber-300" />
                  Mute semua
                </button>
                <button
                  onClick={() => { setShowHostAudioMenu(false); hostUnmuteAll(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-white hover:bg-white/10"
                >
                  <Mic className="w-4 h-4 text-emerald-300" />
                  Unmute semua
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={openChat}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:h-12 sm:w-12"
          title="Buka chat"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setParticipantsOpen(true)}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:h-12 sm:w-12"
          title="Lihat peserta"
        >
          <Users className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-xs flex items-center justify-center">
            {participants.length}
          </span>
        </button>

          </div>
        </div>

        <button
          onClick={() => setLeaveDialogOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 sm:h-12 sm:w-12"
          title="Tinggalkan meeting"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Sidebar */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-full flex-col bg-gray-800 shadow-2xl sm:w-80">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-semibold">Chat</h2>
            <button onClick={() => setChatOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10" title="Tutup chat">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-white/40 text-center text-sm">Belum ada pesan</p>
            ) : (
              messages.map((msg, index) => {
                const ownFallbackId = isLoggedIn ? user?.id : persistentGuestId;
                const isOwn = msg.senderPeerId
                  ? String(msg.senderPeerId) === String(myPeerId)
                  : String(msg.senderId) === String(ownFallbackId);
                const senderName = msg.senderName || msg.userName || 'Peserta';
                return (
                  <div key={msg.id || index} className={`group flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <span className="text-white/45 text-xs mb-1 px-1 font-medium">
                      {isOwn ? 'Anda' : senderName}
                    </span>
                    <div className="flex items-end gap-1.5 max-w-[85%]">
                      {isOwn && (
                        <button
                          onClick={() => startReply(msg)}
                          title="Balas"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-white/40 hover:text-white shrink-0"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className={`px-3.5 py-2 rounded-2xl ${
                        isOwn ? 'bg-blue-500 text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'
                      }`}>
                        {msg.replyTo && (msg.replyTo.message || msg.replyTo.senderName) && (
                          <div className={`mb-1.5 px-2 py-1 rounded-lg border-l-2 text-xs ${
                            isOwn ? 'bg-white/15 border-white/50' : 'bg-black/20 border-blue-400'
                          }`}>
                            <span className="block font-semibold opacity-90 truncate">{msg.replyTo.senderName || 'Peserta'}</span>
                            <span className="block opacity-70 truncate">{msg.replyTo.message}</span>
                          </div>
                        )}
                        <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      {!isOwn && (
                        <button
                          onClick={() => startReply(msg)}
                          title="Balas"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-white/40 hover:text-white shrink-0"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
            {replyTo && (
              <div className="mb-2 flex items-center gap-2 bg-white/[0.06] border-l-2 border-blue-400 rounded-lg px-3 py-2">
                <Reply className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-blue-200 truncate">Membalas {replyTo.senderName}</span>
                  <span className="block text-xs text-white/50 truncate">{replyTo.message}</span>
                </div>
                <button onClick={() => setReplyTo(null)} title="Batal balas" className="p-1 text-white/40 hover:text-white shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={chatInputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                  if (e.key === 'Escape') setReplyTo(null);
                }}
                placeholder={replyTo ? `Balas ${replyTo.senderName}…` : 'Ketik pesan...'}
                className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-white placeholder-white/40 focus:border-blue-500 focus:outline-none sm:px-4"
              />
              <button onClick={sendMessage} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600" title="Kirim pesan">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Sidebar */}
      {participantsOpen && (
        <div className="fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-full flex-col bg-gray-800 shadow-2xl sm:w-80">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-semibold">Peserta ({participants.length})</h2>
            <button onClick={() => setParticipantsOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10" title="Tutup daftar peserta">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {participants.map((participant) => (
              <div key={participant.oduserId} className="p-4 flex items-center gap-3 border-b border-white/5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                  participant.oduserId === user.id ? 'bg-blue-500' : 'bg-gray-600'
                }`}>
                  {(participant.userName || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">
                    {participant.userName}
                    {participant.oduserId === user.id && ' (Anda)'}
                  </p>
                  {participant.isGuest && (
                    <p className="text-white/40 text-xs">Tamu</p>
                  )}
                </div>
                {meetingSettings?.isHost && String(participant.oduserId) !== String(myPeerId) && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => hostMuteParticipant(participant.oduserId, 'audio')}
                      title="Mute mikrofon peserta"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-amber-500/80"
                    >
                      <MicOff className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => hostUnmuteParticipant(participant.oduserId, 'audio')}
                      title="Unmute mikrofon peserta"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-emerald-500/80"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => hostMuteParticipant(participant.oduserId, 'video')}
                      title="Matikan kamera peserta"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-orange-500/80"
                    >
                      <VideoOff className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pengaturan (perangkat + efek latar) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowSettings(false)}>
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-gray-800 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white shadow-xl sm:max-h-[88dvh] sm:rounded-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="w-5 h-5" /> Pengaturan</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Nama Room</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roomNameDraft}
                    onChange={(e) => setRoomNameDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveRoomDisplayName(); }}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
                    placeholder="Nama yang tampil di meeting"
                  />
                  <button
                    type="button"
                    onClick={saveRoomDisplayName}
                    disabled={!cleanRoomDisplayName(roomNameDraft) || cleanRoomDisplayName(roomNameDraft) === roomDisplayName}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-lg text-sm font-medium"
                  >
                    Simpan
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10">
                <label className="block text-sm text-white/60 mb-1">Kamera</label>
                <select
                  value={selectedCam}
                  onChange={(e) => applyDeviceSelection({ camId: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Default</option>
                  {devices.cams.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Kamera ${i + 1}`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Mikrofon</label>
                <select
                  value={selectedMic}
                  onChange={(e) => applyDeviceSelection({ micId: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Default</option>
                  {devices.mics.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Mikrofon ${i + 1}`}</option>)}
                </select>
              </div>
              <p className="text-xs text-white/40">Jika nama perangkat kosong, izinkan akses kamera/mikrofon lalu buka menu ini lagi.</p>

              {meetingSettings?.isHost && (
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Kontrol Host</p>
                  <button
                    onClick={hostMuteAll}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-left"
                  >
                    <MicOff className="w-4 h-4 text-white/60 shrink-0" />
                    Matikan mikrofon semua peserta
                  </button>
                  <button
                    onClick={hostUnmuteAll}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-left"
                  >
                    <Mic className="w-4 h-4 text-white/60 shrink-0" />
                    Nyalakan mikrofon semua peserta
                  </button>
                </div>
              )}

              {/* Efek latar (virtual background) */}
              {!(isWebinar && !onStage) && (
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Efek Latar</p>
                  <button
                    onClick={() => { setShowSettings(false); setShowBgPanel(true); }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className={`w-4 h-4 ${bgEffect.type !== 'none' ? 'text-indigo-400' : 'text-white/60'}`} />
                      Virtual Background
                    </span>
                    <span className="text-xs text-white/50">
                      {bgEffect.type === 'none' ? 'Nonaktif' : bgEffect.type === 'blur' ? 'Blur' : 'Gambar'} ›
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {leaveDialogOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Tinggalkan Meeting?</h2>
            <p className="text-gray-600 mb-6">Anda yakin ingin meninggalkan meeting ini?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setLeaveDialogOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Batal
              </button>
              <button onClick={handleLeave} className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                Tinggalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel Virtual Background (efek latar) */}
      {showBgPanel && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowBgPanel(false)}>
          <div
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-gray-800 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white shadow-xl sm:max-h-[85dvh] sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" /> Efek Latar
              </h2>
              <button onClick={() => setShowBgPanel(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-white/50 mb-4">
              Ganti latar belakang kamera Anda. Diproses di perangkat Anda — butuh koneksi internet saat pertama kali dimuat.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              <button
                onClick={() => applyBgEffect({ type: 'none' })}
                disabled={bgBusy}
                className={`aspect-video rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 ${
                  bgEffect.type === 'none' ? 'border-indigo-400 bg-indigo-500/20' : 'border-white/15 bg-white/5 hover:bg-white/10'
                }`}
              >
                <Ban className="w-5 h-5 text-white/70" />
                <span className="text-[11px] text-white/70">Tanpa</span>
              </button>
              <button
                onClick={() => applyBgEffect({ type: 'blur' })}
                disabled={bgBusy}
                className={`aspect-video rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 ${
                  bgEffect.type === 'blur' ? 'border-indigo-400 bg-indigo-500/20' : 'border-white/15 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/40 to-white/10 blur-[2px]" />
                <span className="text-[11px] text-white/70">Blur</span>
              </button>
              <label
                className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                  bgBusy ? 'opacity-50 pointer-events-none' : 'border-white/25 bg-white/5 hover:bg-white/10'
                }`}
              >
                <Upload className="w-5 h-5 text-white/70" />
                <span className="text-[11px] text-white/70">Unggah</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadBgImage} />
              </label>
              {bgImages.map((bg, i) => (
                <div key={bg.url} className="relative group aspect-video">
                  <button
                    onClick={() => applyBgEffect({ type: 'image', image: bg.img, url: bg.url })}
                    disabled={bgBusy}
                    className={`w-full h-full rounded-xl border-2 overflow-hidden transition-colors disabled:opacity-50 ${
                      bgEffect.type === 'image' && bgEffect.url === bg.url ? 'border-indigo-400' : 'border-white/15 hover:border-white/40'
                    }`}
                  >
                    <img src={bg.url} alt={`Latar ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                  <button
                    onClick={() => {
                      setBgImages((prev) => prev.filter((x) => x.url !== bg.url));
                      if (bgEffect.url === bg.url) applyBgEffect({ type: 'none' });
                      URL.revokeObjectURL(bg.url);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            {bgBusy && (
              <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                <Loader2 className="w-4 h-4 animate-spin" /> Menerapkan efek…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay reactions (emoji melayang) */}
      {reactions.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
          {reactions.map((r) => (
            <div
              key={r.id}
              className="absolute bottom-24 flex flex-col items-center animate-[floatUp_4s_ease-out_forwards]"
              style={{ left: `${10 + (parseInt(r.id.slice(-2).replace(/\D/g, '') || '0', 10) % 80)}%` }}
            >
              <span className="text-4xl sm:text-5xl drop-shadow-lg">{r.emoji}</span>
              <span className="text-[11px] text-white/90 bg-black/40 px-2 py-0.5 rounded-full mt-1 max-w-[120px] truncate">{r.userName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Layar tunggu (waiting room) */}
      {waitingRoom && (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[70] p-6">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Loader2 className="w-9 h-9 text-blue-400 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Menunggu izin host</h2>
            <p className="text-white/60 text-sm mb-6">
              Anda berada di ruang tunggu. Mohon tunggu hingga host menerima Anda masuk ke meeting.
            </p>
            <button
              onClick={() => { cleanup(); navigate('/'); }}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm"
            >
              Batalkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMeetingPage;
