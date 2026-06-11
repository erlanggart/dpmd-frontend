/**
 * Public Meeting Join Page
 * Allows anyone to join a meeting via shared link without login
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  MessageSquare, Users, PhoneOff, Send, Copy, X, Loader2,
  User, ArrowRight, Volume2, VolumeX, Hand, Settings, Signal,
  Clock, Sparkles, ShieldCheck, AlertTriangle, Disc, Square, Reply
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import useMeetingRecorder from './useMeetingRecorder';

const API_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';

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

// Remote Video Component
const RemoteVideo = ({ participant, stream, isSpeakerMuted, isActive }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const videoTracks = stream.getVideoTracks();
      setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);
    }
  }, [stream]);
  
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
      const videoTracks = stream.getVideoTracks();
      setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);
    };
    
    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);
    handleTrackChange();
    
    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
    };
  }, [stream]);
  
  return (
    <div className={`relative bg-gray-800 rounded-xl overflow-hidden aspect-video flex items-center justify-center transition-all ${isActive ? 'ring-4 ring-emerald-400' : ''}`}>
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
      
      <div className="absolute bottom-2 left-2 bg-black/60 px-3 py-1.5 rounded-lg">
        <span className="text-white text-sm">{participant.userName}</span>
      </div>
    </div>
  );
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
  
  // Check for existing session (for auto-rejoin on refresh)
  const existingSession = sessionStorage.getItem(`meeting_${roomId}`);
  const sessionData = existingSession ? JSON.parse(existingSession) : null;
  
  // Pre-join state
  const [guestName, setGuestName] = useState(sessionData?.guestName || '');
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [error, setError] = useState(null);
  const [autoJoining, setAutoJoining] = useState(!!sessionData);
  
  // Meeting state
  const [connected, setConnected] = useState(false);
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
  
  // Refs
  const localVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null); // Mirror of localStream state for use in callbacks
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
    : { id: `guest_${Date.now()}`, nama: guestName, isGuest: true };

  const selfLabel = isLoggedIn ? (storedUser?.nama || storedUser?.username || 'Saya') : (guestName || 'Tamu');

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

  // Auto-rejoin on refresh if session exists
  useEffect(() => {
    if (sessionData && meetingInfo && !joined && !joining) {
      console.log('Auto-rejoining from session:', sessionData);
      setAutoJoining(true);
      // Initialize media first, then join
      initPreviewMedia().then(() => {
        handleJoinMeeting();
      });
    }
  }, [meetingInfo, sessionData]);

  // Preview camera before joining
  useEffect(() => {
    if (!joined && !autoJoining) {
      initPreviewMedia();
    }
    
    return () => {
      // Only stop tracks if we're not in a meeting
      if (!joined && !joining && localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initPreviewMedia = async () => {
    try {
      console.log('Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log('Got media stream:', stream.getTracks().map(t => t.kind));
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

  // Helper: Create and setup mediasoup device
  const setupMediasoup = async (rtpCapabilities, existingProducers) => {
    try {
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
          await consumeProducer(producer.producerId, peerIdStr, producer.kind);
        }
      }
    } catch (error) {
      console.error('[Mediasoup] Setup error:', error);
      toast.error('Gagal setup video conference');
    }
  };
  
  const createSendTransport = async () => {
    return new Promise((resolve, reject) => {
      socketRef.current.emit('create-transport', { direction: 'send' }, async (response) => {
        if (response.error) {
          console.error('[Mediasoup] Create send transport error:', response.error);
          reject(new Error(response.error));
          return;
        }
        
        const transport = deviceRef.current.createSendTransport(response.transport);
        
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          console.log('[Mediasoup] Send transport connecting...');
          socketRef.current.emit('connect-transport', {
            transportId: transport.id,
            dtlsParameters
          }, (res) => {
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
          socketRef.current.emit('produce', {
            transportId: transport.id,
            kind,
            rtpParameters,
            appData
          }, (res) => {
            if (res.error) errback(new Error(res.error));
            else callback({ id: res.id });
          });
        });
        
        // Monitor connection state
        transport.on('connectionstatechange', (state) => {
          console.log('[Mediasoup] Send transport connection state:', state);
          if (state === 'failed') {
            console.error('[Mediasoup] Send transport connection failed!');
            toast.error('Koneksi upload gagal. Coba refresh halaman.');
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
      socketRef.current.emit('create-transport', { direction: 'recv' }, async (response) => {
        if (response.error) {
          console.error('[Mediasoup] Create recv transport error:', response.error);
          reject(new Error(response.error));
          return;
        }
        
        const transport = deviceRef.current.createRecvTransport(response.transport);
        
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          console.log('[Mediasoup] Recv transport connecting...');
          socketRef.current.emit('connect-transport', {
            transportId: transport.id,
            dtlsParameters
          }, (res) => {
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
            toast.error('Koneksi video gagal. Coba refresh halaman.');
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
    } catch (e) { /* abaikan */ }
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
          if (ov) { ov.stop(); stream.removeTrack(ov); }
          stream.addTrack(nv);
          const vp = producersRef.current.get('video');
          if (vp && !vp.closed) await vp.replaceTrack({ track: nv });
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
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
      } catch (e) { /* abaikan */ }
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
    }
  };
  
  const consumeProducer = async (producerId, peerId, kind) => {
    // Ensure peerId is always a string for consistency
    const peerIdStr = String(peerId);
    
    if (!recvTransportRef.current || !deviceRef.current) {
      console.warn('[Mediasoup] Cannot consume - transport not ready');
      return;
    }
    
    console.log(`[Mediasoup] consumeProducer called:`, { producerId, peerId: peerIdStr, kind });
    
    return new Promise((resolve, reject) => {
      socketRef.current.emit('consume', {
        transportId: recvTransportRef.current.id,
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities
      }, async (response) => {
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
          socketRef.current.emit('resume-consumer', { consumerId: consumer.id }, (resumeRes) => {
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
          
          // Store consumer
          if (!consumersRef.current.has(peerIdStr)) {
            consumersRef.current.set(peerIdStr, {});
          }
          consumersRef.current.get(peerIdStr)[kind] = consumer;
          
          // Add track to remote stream - create NEW MediaStream to ensure React detects change
          setRemoteStreams(prev => {
            const newStreams = { ...prev };
            
            // Create a new MediaStream with all existing tracks plus the new one
            const existingStream = prev[peerIdStr];
            const newStream = new MediaStream();
            
            // Copy existing tracks
            if (existingStream) {
              existingStream.getTracks().forEach(track => newStream.addTrack(track));
            }
            
            // Add new consumer track
            newStream.addTrack(consumer.track);
            newStreams[peerIdStr] = newStream;
            
            console.log(`[Mediasoup] Added ${kind} track to remoteStreams[${peerIdStr}], total tracks:`, newStream.getTracks().length);
            return newStreams;
          });
          
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
    if (!isLoggedIn && !guestName.trim()) {
      toast.error('Silakan masukkan nama Anda');
      return;
    }

    setJoining(true);
    
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
        // Polling-only: LB/proxy di depan (TLS) belum meneruskan upgrade WebSocket,
        // sehingga 'websocket' selalu gagal & memunculkan error di console. Polling
        // sudah cukup untuk signaling (media tetap via WebRTC langsung). Kembalikan
        // ke ['polling','websocket'] bila WebSocket passthrough sudah diaktifkan.
        transports: (import.meta.env.VITE_SOCKET_TRANSPORTS || 'polling').split(',').map((t) => t.trim()),
        auth: {
          token: token || null,
          guestName: !isLoggedIn ? guestName : null,
          guestId: persistentGuestId, // Persistent guest ID for reconnection
        }
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        
        // Reset participants before joining
        setParticipants([]);
        
        // Join the room with callback
        socketRef.current.emit('join-room', {
          roomId,
          guestName: !isLoggedIn ? guestName : null,
          guestId: persistentGuestId, // Persistent guest ID
        }, async (response) => {
          console.log('Join room response:', response);
          
          if (response.error) {
            toast.error(response.error);
            setJoining(false);
            setAutoJoining(false);
            // Clear invalid session
            sessionStorage.removeItem(`meeting_${roomId}`);
            return;
          }
          
          if (response.success) {
            setConnected(true);
            setJoined(true);
            setJoining(false);
            setAutoJoining(false);
            
            // Save session for auto-rejoin on refresh
            sessionStorage.setItem(`meeting_${roomId}`, JSON.stringify({
              guestName: !isLoggedIn ? guestName : null,
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
            }

            // Set existing peers from the room (excluding self)
            if (response.existingPeers && response.existingPeers.length > 0) {
              const myId = String(response.peerId || (isLoggedIn ? storedUser.id : persistentGuestId));
              const filteredPeers = response.existingPeers
                .filter(p => String(p.oduserId) !== myId)
                .map(p => ({
                  oduserId: String(p.oduserId),
                  userName: p.userName || 'User'
                }));
              console.log('[existingPeers] Normalized peers:', filteredPeers);
              setParticipants(filteredPeers);
            }
            
            // Setup mediasoup with RTP capabilities
            if (response.rtpCapabilities) {
              await setupMediasoup(response.rtpCapabilities, response.producers);
            }
            
            // Update video ref
            if (localVideoRef.current && localStream) {
              localVideoRef.current.srcObject = localStream;
            }
            
            toast.success('Berhasil bergabung ke meeting');
          }
        });
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        toast.error('Gagal terhubung ke server');
        setJoining(false);
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
      });
      
      // Handle new producer from other peer
      socketRef.current.on('new-producer', async (data) => {
        console.log('[new-producer] Received:', data);
        const { producerId, peerId, kind, userName } = data;
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
          return [...prev, { oduserId: peerIdStr, userName: userName || 'User' }];
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
          console.log(`[new-producer] Consuming ${kind} from peer ${peerIdStr}`);
          await consumeProducer(producerId, peerIdStr, kind);
        } catch (error) {
          console.error('[new-producer] Error consuming:', error);
        }
      });
      
      // Handle producer closed
      socketRef.current.on('producer-closed', (data) => {
        const { producerId, peerId } = data;
        if (consumersRef.current.has(peerId)) {
          const peerConsumers = consumersRef.current.get(peerId);
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
        toast.error(data?.message || 'Server media terputus. Muat ulang halaman.');
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

      socketRef.current.on('disconnect', () => {
        setConnected(false);
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
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    setRemoteStreams({});
    
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
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) videoTrack.stop();
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = stream.getVideoTracks()[0];
        
        if (localStream) {
          const oldTrack = localStream.getVideoTracks()[0];
          if (oldTrack) localStream.removeTrack(oldTrack);
          localStream.addTrack(newVideoTrack);
        }
        
        // Replace track in mediasoup producer so other participants see camera again
        const videoProducer = producersRef.current.get('video');
        if (videoProducer && !videoProducer.closed) {
          await videoProducer.replaceTrack({ track: newVideoTrack });
          console.log('[ScreenShare] Replaced producer track back to camera');
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        
        socketRef.current?.emit('screen-share-stopped');
        setIsScreenSharing(false);
      } catch (err) {
        console.error('Error switching back to camera:', err);
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        if (localStream) {
          const oldVideoTrack = localStream.getVideoTracks()[0];
          if (oldVideoTrack) {
            oldVideoTrack.stop();
            localStream.removeTrack(oldVideoTrack);
          }
          localStream.addTrack(screenTrack);
        }
        
        // Replace track in mediasoup producer so other participants see screen
        const videoProducer = producersRef.current.get('video');
        if (videoProducer && !videoProducer.closed) {
          await videoProducer.replaceTrack({ track: screenTrack });
          console.log('[ScreenShare] Replaced producer track to screen');
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        
        screenTrack.onended = () => toggleScreenShare();
        
        socketRef.current?.emit('screen-share-started');
        setIsScreenSharing(true);
        toast.success('Screen sharing aktif');
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

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return;

    socketRef.current.emit('chat-message', {
      roomId,
      message: newMessage.trim(),
      userName: isLoggedIn ? (user?.nama || user?.username || 'User') : (guestName || 'Guest'),
      replyTo: replyTo
        ? { id: replyTo.id, senderName: replyTo.senderName, message: replyTo.message }
        : null,
    });

    setNewMessage('');
    setReplyTo(null);
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

  // Auto-rejoining state
  if (autoJoining && !joined) {
    return (
      <LobbyShell>
        <div className="lobby-fade flex flex-col items-center justify-center gap-5 text-center">
          <div className="relative">
            <div className="lobby-glow absolute inset-0 rounded-full bg-emerald-500/40 blur-xl" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <span className="text-sm text-white/80">Menghubungkan kembali ke meeting…</span>
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
    const canJoin = !joining && (isLoggedIn || guestName.trim());

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
                  className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
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

              {!isLoggedIn && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-white/70 mb-2">Nama Anda</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && canJoin) handleJoinMeeting(); }}
                    placeholder="Masukkan nama Anda"
                    autoFocus
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              )}

              {isLoggedIn && (
                <div className="mb-5 flex items-center gap-3 bg-white/[0.05] border border-white/10 rounded-xl p-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-indigo-500/25">
                    {(storedUser?.nama || storedUser?.username || 'U')[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{storedUser?.nama || storedUser?.username || 'User'}</p>
                    <p className="text-white/45 text-sm capitalize">Masuk sebagai {storedUser?.role || 'pegawai'}</p>
                  </div>
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
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Banner aktifkan suara: muncul sampai user berinteraksi (atasi blokir autoplay audio) */}
      {!audioUnlocked && (
        <button
          onClick={unlockAudio}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold shadow-lg hover:bg-amber-600 transition-colors animate-pulse"
        >
          <Volume2 className="w-4 h-4" /> Klik untuk mengaktifkan suara peserta
        </button>
      )}
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-semibold text-lg">
            {meetingInfo?.title || 'Video Meeting'}
          </h1>
          <span className={`px-2 py-0.5 rounded-full text-xs ${connected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            {connected ? 'Terhubung' : 'Menghubungkan...'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {netQuality && (
            <span title={`Kualitas jaringan: ${netQuality}`} className="flex items-center">
              <Signal className={`w-4 h-4 ${netQuality === 'good' ? 'text-green-400' : netQuality === 'fair' ? 'text-yellow-400' : 'text-red-400'}`} />
            </span>
          )}
          <button
            onClick={() => { refreshDevices(); setShowSettings(true); }}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Pengaturan perangkat"
          >
            <Settings className="w-4 h-4" />
          </button>
          <span className="text-white/60 text-sm">Room: {roomId}</span>
          <button
            onClick={copyMeetingLink}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className={`grid gap-4 h-full ${
          participants.length > 1 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'max-w-4xl mx-auto'
        }`}>
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover scale-x-[-1] ${isVideoOff ? 'hidden' : ''}`}
            />
            
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                  {((isLoggedIn ? (user?.nama || user?.username || 'U') : guestName) || 'G')[0]?.toUpperCase() || 'G'}
                </div>
              </div>
            )}
            
            <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg">
              <span className="text-white text-sm">
                {isLoggedIn ? (user?.nama || user?.username || 'User') : (guestName || 'Guest')} (Anda)
              </span>
              {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
              {isScreenSharing && <Monitor className="w-4 h-4 text-green-500" />}
            </div>
          </div>

          {/* Remote Videos */}
          {participants.filter(p => p.oduserId !== myPeerId).map((participant) => (
            <RemoteVideo
              key={participant.oduserId}
              participant={participant}
              stream={remoteStreams[participant.oduserId]}
              isSpeakerMuted={isSpeakerMuted}
              isActive={activeSpeaker === participant.oduserId}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-4 flex items-center justify-center gap-2 border-t border-white/10">
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
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
              } text-white`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
              } text-white`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isScreenSharing ? 'bg-green-500 hover:bg-green-600' : 'bg-white/10 hover:bg-white/20'
              } text-white`}
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </button>
          </>
        )}

        <button
          onClick={toggleSpeaker}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isSpeakerMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
          } text-white`}
          title={isSpeakerMuted ? 'Nyalakan Speaker' : 'Matikan Speaker'}
        >
          {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Rekam lokal: simpan rekaman rapat ke device perekam (pilih folder dulu) */}
        {recorder.supported && (
          <button
            onClick={handleToggleRecording}
            className={`h-12 rounded-full flex items-center justify-center transition-colors text-white ${
              recorder.isRecording
                ? 'px-4 gap-2 bg-red-600 hover:bg-red-700'
                : 'w-12 bg-white/10 hover:bg-white/20'
            }`}
            title={recorder.isRecording ? 'Hentikan & simpan rekaman' : 'Rekam rapat ke device (pilih lokasi simpan)'}
          >
            {recorder.isRecording ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span className="text-sm font-semibold tabular-nums">{fmtElapsed(recorder.elapsed)}</span>
              </>
            ) : (
              <Disc className="w-5 h-5" />
            )}
          </button>
        )}

        <button
          onClick={openChat}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white relative transition-colors"
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
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white relative transition-colors"
        >
          <Users className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-xs flex items-center justify-center">
            {participants.length}
          </span>
        </button>

        <button
          onClick={() => setLeaveDialogOpen(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white ml-4 transition-colors"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Sidebar */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-gray-800 shadow-2xl flex flex-col z-50">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-semibold">Chat</h2>
            <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-white/40 text-center text-sm">Belum ada pesan</p>
            ) : (
              messages.map((msg, index) => {
                const isOwn = String(msg.senderId) === String(myPeerId);
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

          <div className="p-4 border-t border-white/10">
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
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
              />
              <button onClick={sendMessage} className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Sidebar */}
      {participantsOpen && (
        <div className="fixed inset-y-0 right-0 w-72 bg-gray-800 shadow-2xl flex flex-col z-50">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-semibold">Peserta ({participants.length})</h2>
            <button onClick={() => setParticipantsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
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
                <div>
                  <p className="text-white text-sm">
                    {participant.userName}
                    {participant.oduserId === user.id && ' (Anda)'}
                  </p>
                  {participant.isGuest && (
                    <p className="text-white/40 text-xs">Tamu</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave Dialog */}
      {/* Pengaturan Perangkat (kamera/mikrofon) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="w-5 h-5" /> Pengaturan Perangkat</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
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
    </div>
  );
};

export default PublicMeetingPage;
