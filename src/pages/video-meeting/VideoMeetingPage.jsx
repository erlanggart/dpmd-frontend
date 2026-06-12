/**
 * Video Meeting Page
 * Main video conferencing room with WebRTC via mediasoup
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  MessageSquare, Users, PhoneOff, Send, Copy, X, Loader2,
  Volume2, VolumeX, Hand, ArrowUpCircle, ArrowDownCircle, Radio,
  Pin, PinOff, Settings, Signal, ChevronLeft, ChevronRight, Disc, Square, Reply,
  Sparkles, Upload, Ban,
  Smile, Lock, Unlock, UserX, Check, MicOff as MicOffIcon,
  Clock, Maximize, Minimize
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import api from '../../api';
import useMeetingRecorder from './useMeetingRecorder';
import { VirtualBackgroundProcessor, loadImageFromFile } from './virtualBackground';

const API_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';

// Remote Video Component
const RemoteVideo = ({
  participant,
  stream,
  isSpeakerMuted,
  isActive,
  isPinned,
  onTogglePin,
  isHost,
  onHostMute,
  onHostUnmute,
}) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const getHasVideo = useCallback((mediaStream) => {
    const track = mediaStream?.getVideoTracks?.()[0];
    return Boolean(track && track.enabled && !track.muted && track.readyState !== 'ended');
  }, []);

  // Set video srcObject
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const newHasVideo = getHasVideo(stream);
      console.log(`[RemoteVideo] Setting video srcObject for ${participant.userName}, hasVideo:`, newHasVideo);
      setHasVideo(newHasVideo);
    }
  }, [stream, participant.userName, getHasVideo]);
  
  // Separate audio element to ensure audio always plays
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.muted = isSpeakerMuted;
      // Try to play audio (may be blocked by browser autoplay policy)
      audioRef.current.play().catch(err => {
        console.warn(`[RemoteVideo] Audio autoplay blocked for ${participant.userName}:`, err.message);
      });
    }
  }, [stream, participant.userName, isSpeakerMuted]);
  
  // Update muted state when isSpeakerMuted changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isSpeakerMuted;
    }
  }, [isSpeakerMuted]);
  
  // Listen for track changes
  useEffect(() => {
    if (!stream) return;
    
    const handleTrackChange = () => {
      const newHasVideo = getHasVideo(stream);
      console.log(`[RemoteVideo] Track changed for ${participant.userName}, hasVideo:`, newHasVideo);
      setHasVideo(newHasVideo);
    };
    const videoTracks = stream.getVideoTracks();
    
    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);
    videoTracks.forEach((track) => {
      track.addEventListener('mute', handleTrackChange);
      track.addEventListener('unmute', handleTrackChange);
      track.addEventListener('ended', handleTrackChange);
    });
    
    // Also check immediately in case track already exists
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
  }, [stream, participant.userName, getHasVideo]);
  
  return (
    <div className={`relative w-full h-full min-h-0 bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center transition-all ${isActive ? 'ring-4 ring-emerald-400' : ''} ${isPinned ? 'ring-2 ring-blue-400' : ''}`}>
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {isHost && (
          <>
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
          </>
        )}
        {onTogglePin && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTogglePin(participant.oduserId); }}
            title={isPinned ? 'Lepas pin' : 'Pin (spotlight)'}
            className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white"
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        )}
      </div>
      {/* Always render video element but show/hide based on hasVideo */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted  // Video element muted - audio handled by separate audio element
        className={`w-full h-full object-cover ${hasVideo ? 'block' : 'hidden'}`}
      />
      
      {/* Separate audio element for reliable audio playback */}
      <audio ref={audioRef} autoPlay playsInline />
      
      {/* Avatar fallback when no video */}
      {!hasVideo && (
        <div className="w-12 h-12 md:w-20 md:h-20 bg-gray-700 rounded-full flex items-center justify-center text-white text-lg md:text-2xl font-semibold">
          {(participant.userName || 'U')[0].toUpperCase()}
        </div>
      )}

      <div className="absolute bottom-1.5 left-1.5 max-w-[90%] bg-black/60 px-2 py-0.5 md:py-1 rounded-md md:rounded-lg">
        <span className="text-white text-xs md:text-sm truncate block">{participant.userName}</span>
      </div>
    </div>
  );
};

// Tampilan layar yang dibagikan (screen share) — object-contain agar seluruh layar
// terlihat utuh, latar hitam seperti Zoom.
const ScreenShareView = ({ stream }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain bg-black"
    />
  );
};

const VideoMeetingPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Determine back path based on user role
  const getMeetingListPath = () => {
    if (user.role === 'superadmin') return '/superadmin/bidang/sekretariat/video-meeting';
    return '/dpmd/video-meeting';
  };
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [myPeerId, setMyPeerId] = useState(null);
  const myPeerIdRef = useRef(null);
  const [meetingSettings, setMeetingSettings] = useState(null);

  // Webinar: hanya peserta "on stage" yang publish. Default true (mode rapat biasa).
  const [onStage, setOnStage] = useState(true);
  const onStageRef = useRef(true);
  const [myHandRaised, setMyHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState({}); // { [peerId]: userName } — utk host
  const [broadcasting, setBroadcasting] = useState(false); // siaran HLS aktif (host)
  const isWebinar = meetingSettings?.mode === 'webinar';

  // Pembicara aktif (disorot otomatis), pin/spotlight, kualitas jaringan, pilih perangkat
  const [activeSpeaker, setActiveSpeaker] = useState(null); // peerId pembicara dominan
  const [pinnedId, setPinnedId] = useState(null); // peerId yang di-pin (spotlight)
  const [netQuality, setNetQuality] = useState(null); // 'good' | 'fair' | 'poor'
  const [devices, setDevices] = useState({ cams: [], mics: [] });
  const [selectedCam, setSelectedCam] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [recordBroadcast, setRecordBroadcast] = useState(false); // host: rekam saat siaran
  const [broadcastLayout, setBroadcastLayout] = useState('speaker'); // host: 'speaker' | 'gallery'

  // Galeri ala Zoom: halaman + jumlah tile per halaman (responsif) supaya layout tetap
  // rapih walau ratusan peserta. Self-view selalu ikut sebagai tile pertama tiap halaman.
  const [galleryPage, setGalleryPage] = useState(0);
  const [gallerySize, setGallerySize] = useState(25);
  useEffect(() => {
    const computeSize = () => {
      const w = window.innerWidth;
      if (w < 640) return 4;     // ponsel: 2×2
      if (w < 1024) return 9;    // tablet: 3×3
      if (w < 1536) return 16;   // laptop: 4×4
      return 25;                 // desktop besar: 5×5 (ala Zoom)
    };
    const onResize = () => setGallerySize(computeSize());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  // Virtual background (efek latar) — diproses di browser via MediaPipe.
  const [bgEffect, setBgEffect] = useState({ type: 'none', image: null, url: null });
  const [bgImages, setBgImages] = useState([]); // gambar latar dari device: {url, img}
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const bgProcessorRef = useRef(null);
  const rawCamTrackRef = useRef(null);       // track kamera mentah (sumber processor)
  const isScreenSharingRef = useRef(false);  // hindari stale closure di handler

  // UI state
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null); // pesan yang sedang dibalas
  const chatInputRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [endingMeeting, setEndingMeeting] = useState(false);

  // Reactions (emoji melayang), waiting room, & kunci meeting
  const [reactions, setReactions] = useState([]); // {id, emoji, userName}
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showHostAudioMenu, setShowHostAudioMenu] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState(false); // saya sedang menunggu di-admit
  const [waitingList, setWaitingList] = useState([]);     // host: daftar peserta menunggu
  const [isLocked, setIsLocked] = useState(false);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false); // meeting butuh password
  const [joinPassword, setJoinPassword] = useState('');
  const [joinPasswordError, setJoinPasswordError] = useState(false);
  const joinPasswordRef = useRef('');   // password yang dipakai saat join (untuk re-join)
  const doJoinRoomRef = useRef(null);   // agar modal bisa memicu join ulang
  const REACTION_EMOJIS = ['👍', '👏', '❤️', '😂', '😮', '🎉', '🙏', '✋'];

  // Refs
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const isEndingMeetingRef = useRef(false);
  const localStreamRef = useRef(null); // Mirror of localStream to avoid stale closures
  const initializedRef = useRef(false); // Prevent double initialization (React StrictMode)
  
  // Mediasoup refs
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producersRef = useRef(new Map()); // producerId -> producer
  const consumersRef = useRef(new Map()); // peerId -> { audio: consumer, video: consumer }
  const rtpCapabilitiesRef = useRef(null);
  
  // Remote streams state
  const [remoteStreams, setRemoteStreams] = useState({}); // peerId -> MediaStream

  // Screen share (dual-producer ala Zoom): kamera tetap jalan, layar = producer terpisah.
  const [screenStreams, setScreenStreams] = useState({});       // peerId -> MediaStream (layar)
  const [screenSharerPeerId, setScreenSharerPeerId] = useState(null); // siapa yang membagikan layar
  const [localScreenStream, setLocalScreenStream] = useState(null);   // layar yang SAYA bagikan
  const screenSharerNameRef = useRef('');
  const [screenSpotlightId, setScreenSpotlightId] = useState(null);   // saat share: peserta yang difokuskan di area utama

  // Fullscreen & durasi meeting
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mainAreaRef = useRef(null);
  const [elapsed, setElapsed] = useState(0); // detik sejak terhubung
  const kbdActionsRef = useRef({}); // aksi terbaru untuk shortcut keyboard (hindari stale closure)

  // Buka kunci pemutaran audio remote. Browser memblokir autoplay audio sampai
  // ada interaksi user; saat masuk halaman /meet via navigasi belum ada gesture,
  // sehingga suara peserta lain tak terdengar walau videonya tampil. Putar ulang
  // semua <audio> pada interaksi pertama (atau via tombol "Aktifkan Suara").
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
  const producedRef = useRef(false); // Track if we've already produced

  // ── Rekam lokal: kumpulkan sumber video/audio terkini ke satu ref stabil.
  // Pakai ref (bukan closure) agar loop perekam yang sedang berjalan selalu
  // membaca peserta TERBARU (peserta yang join saat merekam ikut terekam).
  const recorderDataRef = useRef({ video: [], audio: [] });
  useEffect(() => {
    const video = [];
    const audio = [];
    // Sumber lokal (self-view). Audio mic tetap disertakan walau kamera mati.
    if (localStream) {
      if (!isVideoOff) {
        const vt = localStream.getVideoTracks();
        if (vt.length && vt[0].enabled !== false) {
          video.push({ id: 'local', stream: localStream, label: `${user.nama || user.username || 'Saya'} (Anda)` });
        }
      }
      if (localStream.getAudioTracks().length) audio.push(localStream);
    }
    // Sumber peserta remote.
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
  }, [localStream, isVideoOff, remoteStreams, participants, user.nama, user.username]);

  const getVideoSources = useCallback(() => recorderDataRef.current.video, []);
  const getAudioStreams = useCallback(() => recorderDataRef.current.audio, []);
  const getRecordingTitle = useCallback(() => meeting?.title || 'Rekaman Rapat', [meeting]);

  const recorder = useMeetingRecorder({
    getVideoSources,
    getAudioStreams,
    getTitle: getRecordingTitle,
  });

  // Tampilkan galat perekaman ke user.
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

  // Sync video ref with stream - retry until ref is available
  useEffect(() => {
    if (localStream) {
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
  }, [localStream, connected, loading]);

  // Initialize meeting
  useEffect(() => {
    // Prevent double initialization (React StrictMode calls useEffect twice)
    // But allow re-init if socket was disconnected  
    if (initializedRef.current && socketRef.current?.connected) {
      console.log('[Meeting] Already initialized and connected, skipping duplicate mount');
      return;
    }
    initializedRef.current = true;
    
    const initMeeting = async () => {
      try {
        setLoading(true);
        
        // Fetch meeting info
        const response = await api.get(`/video-meetings/room/${roomId}`);
        if (!response.data.success) {
          setError('Meeting tidak ditemukan');
          return;
        }
        
        setMeeting(response.data.data);
        
        // Initialize media
        await initializeMedia();
        
        // Connect to socket
        connectSocket();
        
      } catch (err) {
        console.error('Error initializing meeting:', err);
        setError(err.response?.data?.message || err.message || 'Gagal memuat meeting');
      } finally {
        setLoading(false);
      }
    };

    initMeeting();

    return () => {
      // Don't reset initializedRef here - let it stay true to prevent 
      // React StrictMode double mount from creating duplicate connections
      cleanup();
    };
  }, [roomId]);

  const initializeMedia = async () => {
    try {
      console.log('Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log('Got media stream:', stream.getTracks().map(t => t.kind));

      rawCamTrackRef.current = stream.getVideoTracks()[0] || null;
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
      toast.error('Gagal mengakses kamera/mikrofon');
      
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
      console.log('[Mediasoup] RTP caps:', JSON.stringify(rtpCapabilities).substring(0, 200));
      rtpCapabilitiesRef.current = rtpCapabilities;
      
      // Create device
      console.log('[Mediasoup] Creating Device...');
      const device = new Device();
      console.log('[Mediasoup] Device created, loading router caps...');
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;
      console.log('[Mediasoup] Device loaded successfully, canProduce video:', device.canProduce('video'));
      
      // Create send transport
      console.log('[Mediasoup] Creating send transport...');
      await createSendTransport();
      console.log('[Mediasoup] Send transport created');
      
      // Create recv transport  
      console.log('[Mediasoup] Creating recv transport...');
      await createRecvTransport();
      console.log('[Mediasoup] Recv transport created');
      
      // Produce local tracks (use ref to get current stream)
      const stream = localStreamRef.current;
      console.log('[Mediasoup] localStreamRef.current:', stream ? 'available' : 'null');
      if (stream) {
        console.log('[Mediasoup] Local stream available, producing tracks');
        await produceLocalTracks();
      } else {
        console.log('[Mediasoup] No local stream yet, will produce when available');
      }
      
      // Consume existing producers
      if (existingProducers && existingProducers.length > 0) {
        console.log('[Mediasoup] Consuming existing producers:', existingProducers.length, existingProducers);
        for (const producer of existingProducers) {
          const peerIdStr = String(producer.peerId);
          // Don't consume our own producers
          if (peerIdStr === String(myPeerIdRef.current)) {
            console.log('[Mediasoup] Skipping own producer:', producer.producerId);
            continue;
          }
          console.log(`[Mediasoup] Consuming producer ${producer.producerId} from peer ${peerIdStr}`);
          await consumeProducer(producer.producerId, peerIdStr, producer.kind, producer.appData?.mediaType || 'video');
        }
      }
    } catch (error) {
      console.error('[Mediasoup] Setup error:', error);
      console.error('[Mediasoup] Setup error stack:', error.stack);
      toast.error('Gagal setup video conference: ' + error.message);
    }
  };
  
  // Create send transport for producing media
  const createSendTransport = async () => {
    console.log('[Mediasoup] createSendTransport called, socketRef:', socketRef.current ? 'connected' : 'null');
    return new Promise((resolve, reject) => {
      console.log('[Mediasoup] Emitting create-transport for send...');
      socketRef.current.emit('create-transport', { direction: 'send' }, async (response) => {
        console.log('[Mediasoup] create-transport response:', response);
        // Debug: Log ICE candidates to verify they contain public IP
        if (response.transport?.iceCandidates) {
          console.log('[Mediasoup] ICE Candidates from server:', JSON.stringify(response.transport.iceCandidates, null, 2));
        }
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
            if (res.error) {
              errback(new Error(res.error));
            } else {
              callback({ id: res.id });
            }
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
  
  // Create recv transport for consuming media
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
  
  // Produce local audio/video tracks
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
      // Produce audio
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const audioProducer = await sendTransportRef.current.produce({
          track: audioTrack,
          appData: { mediaType: 'audio' }
        });
        producersRef.current.set('audio', audioProducer);
        console.log('[Mediasoup] Audio producer created:', audioProducer.id);
      }
      
      // Produce video
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const videoProducer = await sendTransportRef.current.produce({
          track: videoTrack,
          // Simulcast: kirim 3 lapis kualitas. SFU bisa meneruskan lapis rendah ke
          // penonton/koneksi lemah → kapasitas naik & adaptif (skala besar).
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

  // Naik panggung (mulai publish) — dipakai saat host meng-"angkat" peserta.
  const goLive = async () => {
    onStageRef.current = true;
    setOnStage(true);
    producedRef.current = true;
    await produceLocalTracks();
  };

  // Turun panggung (berhenti publish) — tutup producer audio/video sendiri.
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

  // Kontrol webinar (emit ke server)
  const toggleRaiseHand = () => {
    const next = !myHandRaised;
    setMyHandRaised(next);
    socketRef.current?.emit('raise-hand', { raised: next }, () => {});
    toast(next ? 'Tangan diangkat ✋' : 'Tangan diturunkan', { icon: next ? '✋' : '👇' });
  };
  const promoteToStage = (peerId) => {
    socketRef.current?.emit('promote-to-stage', { targetPeerId: peerId }, (r) => {
      if (r?.error) toast.error(r.error);
    });
  };
  const demoteFromStage = (peerId) => {
    socketRef.current?.emit('demote-from-stage', { targetPeerId: peerId }, (r) => {
      if (r?.error) toast.error(r.error);
    });
  };

  // ===== Reactions & kontrol host =====
  const sendReaction = (emoji) => {
    socketRef.current?.emit('reaction', { emoji });
    setShowReactionPicker(false);
  };

  const hostMuteParticipant = (peerId, kind = 'audio') => {
    socketRef.current?.emit('host-mute-participant', { targetPeerId: peerId, kind }, (r) => {
      if (r?.error) toast.error(r.error); else toast.success(kind === 'video' ? 'Kamera peserta dimatikan' : 'Mikrofon peserta dimatikan');
    });
  };

  const hostUnmuteParticipant = (peerId, kind = 'audio') => {
    socketRef.current?.emit('host-unmute-participant', { targetPeerId: peerId, kind }, (r) => {
      if (r?.error) toast.error(r.error); else toast.success(kind === 'video' ? 'Kamera peserta dinyalakan' : 'Mikrofon peserta dinyalakan');
    });
  };

  const hostMuteAll = () => {
    socketRef.current?.emit('host-mute-all', {}, (r) => {
      if (r?.error) toast.error(r.error); else toast.success('Mikrofon semua peserta dimatikan');
    });
  };

  const hostUnmuteAll = () => {
    socketRef.current?.emit('host-unmute-all', {}, (r) => {
      if (r?.error) toast.error(r.error); else toast.success('Mikrofon semua peserta dinyalakan');
    });
  };

  const hostRemoveParticipant = (peerId, name) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-800">Keluarkan {name || 'peserta'} dari meeting?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Batal</button>
          <button
            onClick={() => { toast.dismiss(t.id); socketRef.current?.emit('host-remove-participant', { targetPeerId: peerId }, (r) => { if (r?.error) toast.error(r.error); }); }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg"
          >Keluarkan</button>
        </div>
      </div>
    ), { duration: 8000 });
  };

  const toggleLock = () => {
    const next = !isLocked;
    socketRef.current?.emit('toggle-lock', { locked: next }, (r) => {
      if (r?.error) toast.error(r.error);
    });
  };

  const admitParticipant = (peerId) => {
    socketRef.current?.emit('admit-participant', { targetPeerId: peerId }, (r) => { if (r?.error) toast.error(r.error); });
  };
  const rejectParticipant = (peerId) => {
    socketRef.current?.emit('reject-participant', { targetPeerId: peerId }, (r) => { if (r?.error) toast.error(r.error); });
  };
  const admitAll = () => {
    socketRef.current?.emit('admit-all', {}, (r) => { if (r?.error) toast.error(r.error); });
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

  // Ganti perangkat aktif: ambil track baru, ganti di localStream + producer mediasoup.
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
            // Efek latar aktif: ganti sumber processor saja; track keluaran (yang
            // dipublish) tetap, jadi tak perlu replaceTrack ke producer.
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

  // Paksa elemen <video> self-view menyegarkan tampilan. Saat track di dalam stream
  // diganti tapi REFERENSI stream-nya sama, sebagian browser tidak render ulang →
  // tampil hitam. Set null lalu set ulang + play() untuk memicu refresh.
  const refreshLocalVideo = (stream) => {
    const v = localVideoRef.current;
    if (!v) return;
    try { v.srcObject = null; } catch { /* noop */ }
    v.srcObject = stream;
    const p = v.play?.();
    if (p && p.catch) p.catch(() => {});
  };

  // ===== Virtual background (efek latar) =====
  // Terapkan efek: 'none' (kamera apa adanya), 'blur', atau 'image' (gambar device).
  const applyBgEffect = useCallback(async (next) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setBgBusy(true);
    try {
      const producer = producersRef.current.get('video');
      if (!rawCamTrackRef.current) {
        rawCamTrackRef.current = stream.getVideoTracks()[0] || null;
      }
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

      // Matikan efek → kembalikan kamera mentah.
      if (next.type === 'none') {
        if (bgProcessorRef.current) { bgProcessorRef.current.stop(); bgProcessorRef.current = null; }
        // Kamera mentah mungkin sudah mati → ambil ulang agar self-view tidak hitam.
        rawTrack = await ensureLiveRawTrack();
        const cur = stream.getVideoTracks()[0];
        if (cur && cur !== rawTrack) stream.removeTrack(cur);
        if (!stream.getVideoTracks().includes(rawTrack)) stream.addTrack(rawTrack);
        if (producer && !producer.closed) await producer.replaceTrack({ track: rawTrack });
        refreshLocalVideo(stream);
        setBgEffect({ type: 'none', image: null, url: null });
        return;
      }

      if (!VirtualBackgroundProcessor.isSupported()) {
        toast.error('Browser tidak mendukung virtual background');
        return;
      }
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

  // Unggah gambar latar dari device → simpan ke galeri & langsung pakai.
  const handleUploadBgImage = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset agar bisa pilih file sama lagi
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

  // ===== Request lapis simulcast (#3/#7): pin/active-speaker = lapis penuh,
  // lainnya lapis rendah saat peserta banyak (hemat bandwidth). =====
  const requestLayers = useCallback((sourcePeerId, spatialLayer) => {
    socketRef.current?.emit('set-preferred-layers', { sourcePeerId, spatialLayer }, () => {});
  }, []);
  useEffect(() => {
    if (!connected) return;
    const many = participants.length > 4;
    participants.forEach((p) => {
      const high = pinnedId
        ? p.oduserId === pinnedId
        : (!many ? true : (activeSpeaker ? p.oduserId === activeSpeaker : false));
      requestLayers(p.oduserId, high ? 2 : 0);
    });
  }, [pinnedId, activeSpeaker, participants, connected, requestLayers]);

  // ===== Galeri ala Zoom: susun & paginasi tile + daftar peer yang terlihat =====
  // Urutan stabil (hanya pin yang dipindah ke depan) supaya halaman tidak acak saat
  // pembicara berganti. `visibleRemoteIds` dipakai untuk menjeda video peserta di
  // luar halaman aktif → hemat bandwidth/CPU saat peserta sangat banyak.
  const gallery = useMemo(() => {
    const remoteTiles = participants
      .filter((p) => p.oduserId !== myPeerId && p.oduserId !== String(user.id))
      .map((p) => ({ key: p.oduserId, type: 'remote', participant: p }));

    const pinnedTile = pinnedId
      ? remoteTiles.find((t) => t.participant.oduserId === pinnedId) || null
      : null;
    // Mode speaker (ada yang di-pin) → 1 tile besar + filmstrip; selain itu galeri grid.
    const stripTiles = pinnedTile ? remoteTiles.filter((t) => t !== pinnedTile) : remoteTiles;

    // Self-view selalu tile pertama tiap halaman; sisanya slot untuk peserta lain.
    const perPage = Math.max(1, (pinnedTile ? Math.min(gallerySize, 8) : gallerySize) - 1);
    const totalPages = Math.max(1, Math.ceil(stripTiles.length / perPage));
    const page = Math.min(galleryPage, totalPages - 1);
    const pageRemotes = stripTiles.slice(page * perPage, page * perPage + perPage);
    const pageTiles = [{ key: '__local__', type: 'local' }, ...pageRemotes];

    // Grid kotak rapih: kolom ≈ akar dari jumlah tile pada halaman ini.
    const cols = Math.max(1, Math.ceil(Math.sqrt(pageTiles.length)));
    const rows = Math.max(1, Math.ceil(pageTiles.length / cols));

    // Video yang perlu aktif: peserta yang di-pin + yang ada di halaman saat ini.
    const visibleRemoteIds = new Set([
      ...(pinnedTile ? [pinnedTile.participant.oduserId] : []),
      ...pageRemotes.map((t) => t.participant.oduserId),
    ]);

    return { pinnedTile, stripTiles, pageTiles, cols, rows, totalPages, page, visibleRemoteIds };
  }, [participants, myPeerId, user.id, pinnedId, galleryPage, gallerySize]);

  // Jeda video consumer untuk peserta di luar halaman aktif; lanjutkan untuk yang
  // terlihat. Audio tetap jalan agar suara tetap terdengar meski tile tak tampak.
  const pausedVideoRef = useRef(new Set());
  useEffect(() => {
    if (!connected) return;
    // Saat berbagi layar: filmstrip menampilkan SEMUA peserta → jangan jeda video
    // siapa pun (resume semua yang sempat dijeda) agar tile tidak gelap.
    const screenActiveNow = Boolean(screenSharerPeerId);
    const visible = gallery.visibleRemoteIds;
    consumersRef.current.forEach((peerConsumers, peerId) => {
      // Layar (screen share) tidak pernah dijeda — selalu tampil di area utama.
      if (String(peerId).startsWith('screen:')) return;
      const vc = peerConsumers?.video;
      if (!vc) return;
      const paused = pausedVideoRef.current.has(peerId);
      if (screenActiveNow || visible.has(peerId)) {
        if (paused) {
          socketRef.current?.emit('resume-consumer', { consumerId: vc.id }, () => {});
          pausedVideoRef.current.delete(peerId);
        }
      } else if (!paused) {
        socketRef.current?.emit('pause-consumer', { consumerId: vc.id }, () => {});
        pausedVideoRef.current.add(peerId);
      }
    });
    // Bersihkan catatan untuk peer yang sudah keluar.
    pausedVideoRef.current.forEach((peerId) => {
      if (!consumersRef.current.has(peerId)) pausedVideoRef.current.delete(peerId);
    });
  }, [gallery.visibleRemoteIds, connected, remoteStreams, screenSharerPeerId]);

  // ===== Indikator kualitas jaringan (#8) via getStats transport kirim =====
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
          if (r.type === 'candidate-pair' && r.nominated && r.currentRoundTripTime != null) {
            rtt = r.currentRoundTripTime;
          }
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

  const togglePin = (peerId) => setPinnedId((cur) => (cur === peerId ? null : peerId));

  // Consume a remote producer
  const consumeProducer = async (producerId, peerId, kind, mediaType = 'video') => {
    // Ensure peerId is always a string for consistency
    const peerIdStr = String(peerId);
    const isScreen = mediaType === 'screen';
    // Kunci penyimpanan: layar disimpan terpisah (`screen:<peerId>`) agar tidak
    // menimpa kamera peserta — keduanya tampil bersamaan ala Zoom.
    const storeKey = isScreen ? `screen:${peerIdStr}` : peerIdStr;
    
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
          
          // Store consumer (layar di bawah kunci `screen:<peerId>`)
          if (!consumersRef.current.has(storeKey)) {
            consumersRef.current.set(storeKey, {});
          }
          consumersRef.current.get(storeKey)[kind] = consumer;

          // Layar dibagikan → simpan ke screenStreams & tandai pembagi layar.
          if (isScreen) {
            setScreenStreams(prev => ({ ...prev, [peerIdStr]: new MediaStream([consumer.track]) }));
            setScreenSharerPeerId(peerIdStr);
            const p = participants.find(pp => pp.oduserId === peerIdStr);
            screenSharerNameRef.current = p?.userName || 'Peserta';
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

  const connectSocket = () => {
    // Prevent duplicate socket connections
    if (socketRef.current?.connected) {
      console.log('[Socket] Already connected, skipping duplicate connection');
      return;
    }
    
    // Cleanup any existing socket before creating new one
    if (socketRef.current) {
      console.log('[Socket] Cleaning up existing socket before reconnect');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
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
    
    console.log('Connecting socket with token:', token ? 'present' : 'missing');
    console.log('Current user from localStorage:', user);
    
    socketRef.current = io(API_URL, {
      auth: { token },
      // Polling-only: LB/proxy di depan (TLS) belum meneruskan upgrade WebSocket,
      // sehingga 'websocket' selalu gagal & memunculkan error di console. Polling
      // sudah cukup untuk signaling (media tetap via WebRTC langsung). Kembalikan
      // ke ['polling','websocket'] bila WebSocket passthrough sudah diaktifkan.
      // Diatur via env VITE_SOCKET_TRANSPORTS (mis. "polling,websocket").
      transports: (import.meta.env.VITE_SOCKET_TRANSPORTS || 'polling').split(',').map((t) => t.trim()),
    });

    // Handler respons join — dipakai saat connect & saat di-admit dari waiting room.
    const handleJoinResponse = async (response) => {
      console.log('Join room response:', response);

      if (response.error) {
        // Meeting butuh password → tampilkan prompt (tidak ada lobby di halaman ini).
        if (/password/i.test(response.error)) {
          setJoinPasswordError(joinPasswordRef.current !== '');
          setPasswordPromptOpen(true);
          return;
        }
        toast.error(response.error);
        return;
      }

      // Waiting room: host belum menerima kita. Tampilkan layar menunggu.
      if (response.waiting) {
        setWaitingRoom(true);
        return;
      }

      if (response.success) {
        setWaitingRoom(false);
        setPasswordPromptOpen(false);
          setConnected(true);
          
          // Save our peer ID for filtering
          if (response.peerId) {
            setMyPeerId(response.peerId);
            myPeerIdRef.current = String(response.peerId);
            console.log('My peer ID:', response.peerId);
          }
          
          // Save meeting settings (includes isHost, mode, onStage)
          if (response.meetingSettings) {
            console.log('Meeting settings received:', response.meetingSettings);
            console.log('Am I the host?', response.meetingSettings.isHost);
            setMeetingSettings(response.meetingSettings);
            // Webinar: onStage menentukan apakah kita publish. Default true (rapat biasa).
            const stage = response.meetingSettings.onStage !== false;
            onStageRef.current = stage;
            setOnStage(stage);
            setIsLocked(response.meetingSettings.isLocked === true);
            if (response.meetingSettings.isHost && Array.isArray(response.meetingSettings.waiting)) {
              setWaitingList(response.meetingSettings.waiting);
            }
          }
          
          // Set existing peers from the room (excluding self)
          if (response.existingPeers && response.existingPeers.length > 0) {
            const myId = String(response.peerId || user.id);
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
            console.log('[Mediasoup] RTP capabilities received, calling setupMediasoup');
            try {
              await setupMediasoup(response.rtpCapabilities, response.producers);
              console.log('[Mediasoup] setupMediasoup completed successfully');
            } catch (err) {
              console.error('[Mediasoup] setupMediasoup error:', err);
            }
          } else {
            console.warn('[Mediasoup] No RTP capabilities in response!');
          }
          
          toast.success('Berhasil bergabung ke meeting');
        }
    };

    const doJoinRoom = () => {
      setParticipants([]);
      socketRef.current.emit('join-room', { roomId, password: joinPasswordRef.current || undefined }, handleJoinResponse);
    };
    doJoinRoomRef.current = doJoinRoom; // agar modal password bisa memicu join ulang

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      doJoinRoom();
    });

    // Waiting room: host menerima kita → ulangi join (kini lolos).
    socketRef.current.on('admitted', () => {
      toast.success('Anda diterima masuk oleh host');
      doJoinRoom();
    });

    // Waiting room: host menolak kita.
    socketRef.current.on('join-rejected', () => {
      setWaitingRoom(false);
      toast.error('Permintaan bergabung ditolak oleh host');
      setTimeout(() => navigate('/meet'), 1500);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.error('Error message:', error.message);
      
      // If token invalid/expired, redirect to login
      if (error.message.includes('Token invalid') || error.message.includes('expired')) {
        toast.error('Sesi telah berakhir. Silakan login ulang.');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      
      toast.error('Gagal terhubung ke server: ' + error.message);
    });

    socketRef.current.on('peer-joined', (data) => {
      console.log('[peer-joined] Received:', data);
      const peerIdStr = String(data.peerId);
      
      // Ignore if it's ourselves (shouldn't happen, but just in case)
      if (peerIdStr === String(myPeerIdRef.current)) return;
      
      setParticipants((prev) => {
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
      
      setParticipants((prev) => prev.filter((p) => p.oduserId !== peerIdStr));
      toast(`${data.userName} keluar`, { icon: '👋' });
      
      // Remove remote stream and consumers
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[peerIdStr];
        return newStreams;
      });
      
      // Close consumers for this peer
      if (consumersRef.current.has(peerIdStr)) {
        const peerConsumers = consumersRef.current.get(peerIdStr);
        Object.values(peerConsumers).forEach(consumer => consumer?.close());
        consumersRef.current.delete(peerIdStr);
      }

      // Bersihkan layar peserta yang keluar (bila sedang membagikan layar).
      const screenKey = `screen:${peerIdStr}`;
      if (consumersRef.current.has(screenKey)) {
        Object.values(consumersRef.current.get(screenKey)).forEach(c => c?.close());
        consumersRef.current.delete(screenKey);
      }
      setScreenStreams(prev => { if (!prev[peerIdStr]) return prev; const n = { ...prev }; delete n[peerIdStr]; return n; });
      setScreenSharerPeerId(prev => (prev === peerIdStr ? null : prev));
    });
    
    // Handle new producer from other peer
    socketRef.current.on('new-producer', async (data) => {
      console.log('[new-producer] Received:', data);
      const { producerId, peerId, kind, userName, mediaType } = data;
      const peerIdStr = String(peerId);
      
      // Don't consume our own producers
      if (peerIdStr === String(myPeerIdRef.current)) {
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
        console.log(`[new-producer] Consuming ${kind} (${mediaType}) from peer ${peerIdStr}`);
        await consumeProducer(producerId, peerIdStr, kind, mediaType || 'video');
      } catch (error) {
        console.error('[new-producer] Error consuming:', error);
      }
    });
    
    // Handle producer closed
    socketRef.current.on('producer-closed', (data) => {
      console.log('Producer closed:', data);
      const { producerId, peerId } = data;
      const peerIdStr = String(peerId);

      // Cek apakah producer yang ditutup adalah LAYAR (screen share).
      const screenKey = `screen:${peerIdStr}`;
      const screenConsumers = consumersRef.current.get(screenKey);
      if (screenConsumers && Object.values(screenConsumers).some(c => c?.producerId === producerId)) {
        Object.values(screenConsumers).forEach(c => c?.close());
        consumersRef.current.delete(screenKey);
        setScreenStreams(prev => { const n = { ...prev }; delete n[peerIdStr]; return n; });
        setScreenSharerPeerId(prev => (prev === peerIdStr ? null : prev));
        return;
      }

      // Producer kamera/mic biasa.
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
      setMessages((prev) => [...prev, message]);
      if (!chatOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    // Pembicara dominan berubah → sorot tile-nya (auto active-speaker).
    socketRef.current.on('active-speaker', (data) => {
      if (data?.peerId != null) setActiveSpeaker(String(data.peerId));
    });

    // Server media terputus (worker mediasoup mati) → beri tahu & arahkan keluar.
    socketRef.current.on('meeting-interrupted', (data) => {
      toast.error(data?.message || 'Server media terputus. Muat ulang halaman.');
    });

    // Webinar: tangan diangkat/diturunkan oleh peserta lain (untuk daftar host)
    socketRef.current.on('hand-updated', (data) => {
      const { peerId, userName, raised } = data || {};
      const pid = String(peerId);
      setRaisedHands((prev) => {
        const next = { ...prev };
        if (raised) next[pid] = userName || 'Peserta';
        else delete next[pid];
        return next;
      });
      if (raised && String(peerId) !== String(myPeerIdRef.current)) {
        toast(`${userName || 'Peserta'} mengangkat tangan ✋`, { icon: '✋' });
      }
    });

    // Webinar: status panggung berubah (diangkat/diturunkan host)
    socketRef.current.on('stage-updated', async (data) => {
      const { peerId, onStage: nowOnStage } = data || {};
      const pid = String(peerId);
      // Tandai di daftar peserta (untuk UI)
      setParticipants((prev) => prev.map((p) => (p.oduserId === pid ? { ...p, onStage: nowOnStage } : p)));
      // Bersihkan status tangan untuk peserta tsb
      setRaisedHands((prev) => { const n = { ...prev }; delete n[pid]; return n; });
      // Kalau yang diubah adalah DIRI SENDIRI → mulai/berhenti publish
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
      toast.error(error.message || 'Terjadi kesalahan koneksi');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    // Handle meeting ended by host
    socketRef.current.on('meeting-ended', (data) => {
      console.log('Meeting ended:', data);
      // Skip if we're the one ending the meeting (callback will handle it)
      if (isEndingMeetingRef.current) {
        console.log('Ignoring meeting-ended event - we are ending the meeting');
        return;
      }
      toast(`Meeting telah diakhiri oleh ${data.endedBy}`, { icon: '📢' });
      cleanup();
      navigate(getMeetingListPath());
    });

    // ===== Reactions, waiting room, lock, kontrol host =====
    // Emoji melayang dari peserta mana pun.
    socketRef.current.on('reaction', (data) => {
      const item = { id: data.id || `${Date.now()}-${Math.random()}`, emoji: data.emoji, userName: data.userName };
      setReactions((prev) => [...prev, item]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== item.id));
      }, 4000);
    });

    // Daftar tunggu berubah (host).
    socketRef.current.on('waiting-updated', (data) => {
      setWaitingList(Array.isArray(data?.waiting) ? data.waiting : []);
    });

    // Status kunci meeting berubah.
    socketRef.current.on('lock-updated', (data) => {
      setIsLocked(data?.locked === true);
      toast(data?.locked ? 'Meeting dikunci 🔒' : 'Meeting dibuka 🔓', { icon: data?.locked ? '🔒' : '🔓' });
    });

    // Host memaksa kita mute (mic/kamera).
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

    // Host mengeluarkan kita dari meeting.
    socketRef.current.on('removed-by-host', (data) => {
      toast.error(`Anda dikeluarkan dari meeting oleh ${data?.by || 'host'}`);
      cleanup();
      setTimeout(() => navigate(getMeetingListPath()), 1200);
    });
  };

  const cleanup = () => {
    console.log('[Cleanup] Starting cleanup...');
    
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
    
    // Clear device
    deviceRef.current = null;
    
    // Reset produced flag
    producedRef.current = false;
    
    // Hentikan virtual background processor + kamera mentahnya
    if (bgProcessorRef.current) {
      try { bgProcessorRef.current.stop(); } catch { /* noop */ }
      bgProcessorRef.current = null;
    }
    if (rawCamTrackRef.current) {
      try { rawCamTrackRef.current.stop(); } catch { /* noop */ }
      rawCamTrackRef.current = null;
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Stop layar yang sedang dibagikan
    if (localScreenStream) {
      localScreenStream.getTracks().forEach((track) => track.stop());
    }

    // Clear remote streams
    setRemoteStreams({});
    setScreenStreams({});
    setScreenSharerPeerId(null);
    setLocalScreenStream(null);
    
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    console.log('[Cleanup] Cleanup completed');
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        socketRef.current?.emit('media-state-change', {
          roomId,
          isMuted: !audioTrack.enabled,
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
        setIsVideoOff(!videoTrack.enabled);
        
        socketRef.current?.emit('media-state-change', {
          roomId,
          isMuted,
          isVideoOff: !videoTrack.enabled,
        });
      }
    }
  };

  // Dual-producer ala Zoom: layar = producer TERPISAH ('screen'). Kamera tetap
  // jalan, jadi video presenter tetap tampil di samping layar yang dibagikan.
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share — tutup producer layar, kamera tidak tersentuh.
      try {
        const sp = producersRef.current.get('screen');
        if (sp) {
          try { sp.close(); } catch { /* noop */ }
          socketRef.current?.emit('close-producer', { producerId: sp.id });
          producersRef.current.delete('screen');
        }
        if (localScreenStream) {
          localScreenStream.getTracks().forEach(t => t.stop());
        }
        setLocalScreenStream(null);
        setScreenSharerPeerId(prev => (prev === myPeerId ? null : prev));
        socketRef.current?.emit('screen-share-stopped');
        setIsScreenSharing(false);
        isScreenSharingRef.current = false;
      } catch (err) {
        console.error('Error stopping screen share:', err);
      }
    } else {
      // Start screen share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Produser BARU khusus layar (tidak mengganggu kamera/efek latar).
        const screenProducer = await sendTransportRef.current.produce({
          track: screenTrack,
          encodings: [{ maxBitrate: 2500000 }],
          codecOptions: { videoGoogleStartBitrate: 1500 },
          appData: { mediaType: 'screen' },
        });
        producersRef.current.set('screen', screenProducer);

        // Tampilkan layar sendiri sebagai tampilan utama.
        setLocalScreenStream(new MediaStream([screenTrack]));
        setScreenSharerPeerId(myPeerId);
        screenSharerNameRef.current = `${user.nama || user.username || 'Anda'} (Anda)`;
        isScreenSharingRef.current = true;

        // Hentikan dari toolbar browser ("Stop sharing") → tutup producer.
        screenTrack.onended = () => { toggleScreenShare(); };

        socketRef.current?.emit('screen-share-started');
        setIsScreenSharing(true);
        toast.success('Berbagi layar aktif');
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

  // ===== Fullscreen area video utama =====
  const toggleFullscreen = useCallback(() => {
    const el = mainAreaRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      (el.requestFullscreen?.() || Promise.resolve()).catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);
  // Sediakan aksi terbaru untuk shortcut keyboard (semua fungsi sudah terdefinisi di sini).
  kbdActionsRef.current = {
    toggleMute, toggleVideo, toggleScreenShare, toggleFullscreen,
    canPublish: !(isWebinar && !onStage),
  };
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  // Reset spotlight saat berbagi layar berhenti.
  useEffect(() => { if (!screenSharerPeerId) setScreenSpotlightId(null); }, [screenSharerPeerId]);

  // ===== Durasi meeting (mulai saat terhubung) =====
  useEffect(() => {
    if (!connected) return undefined;
    const start = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [connected]);
  const fmtDuration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  };

  // ===== Shortcut keyboard (M mic, V kamera, S layar, F fullscreen) =====
  useEffect(() => {
    const onKey = (e) => {
      // Abaikan saat mengetik di input/textarea/contenteditable.
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
      userName: user.nama || user.username,
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
    cleanup();
    navigate(getMeetingListPath());
  };

  const handleEndMeeting = () => {
    if (!socketRef.current) {
      console.error('Cannot end meeting: socket not connected');
      toast.error('Tidak dapat mengakhiri meeting: tidak terhubung');
      return;
    }
    
    console.log('Attempting to end meeting...');
    console.log('Socket connected:', socketRef.current.connected);
    console.log('Current roomId:', roomId);
    
    setEndingMeeting(true);
    isEndingMeetingRef.current = true; // Flag to ignore meeting-ended event
    
    // Set timeout in case callback never fires
    const timeoutId = setTimeout(() => {
      console.error('End meeting timeout - no response received');
      setEndingMeeting(false);
      isEndingMeetingRef.current = false;
      toast.error('Timeout mengakhiri meeting. Coba lagi.');
    }, 10000);
    
    socketRef.current.emit('end-meeting', {}, (response) => {
      clearTimeout(timeoutId);
      console.log('End meeting response:', response);
      setEndingMeeting(false);
      isEndingMeetingRef.current = false;
      if (response?.error) {
        toast.error(response.error);
        return;
      }
      
      if (response?.success) {
        toast.success('Meeting berhasil diakhiri');
        cleanup();
        navigate(getMeetingListPath());
      }
    });
  };

  const copyMeetingLink = () => {
    // Use /join/ for public shareable link (guests can join without login)
    const link = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link meeting disalin - dapat dibagikan ke siapapun');
  };

  // Webinar broadcast (HLS) — host
  const copyWatchLink = () => {
    const link = `${window.location.origin}/watch/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link tonton (penonton) disalin');
  };
  const toggleBroadcast = async () => {
    try {
      if (!broadcasting) {
        await api.post(`/video-meetings/${roomId}/broadcast/start`, { record: recordBroadcast, layout: broadcastLayout });
        setBroadcasting(true);
        toast.success(`Siaran webinar dimulai${broadcastLayout === 'gallery' ? ' (galeri)' : ''}${recordBroadcast ? ' · direkam' : ''} — penonton bisa menonton di /watch`);
      } else {
        await api.post(`/video-meetings/${roomId}/broadcast/stop`);
        setBroadcasting(false);
        toast('Siaran dihentikan', { icon: '⏹️' });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mengubah status siaran');
    }
  };

  const openChat = () => {
    setChatOpen(true);
    setUnreadCount(0);
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
        <p className="text-white">Memuat meeting...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="bg-red-500/20 text-red-400 px-6 py-4 rounded-xl max-w-md text-center">
          {error}
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Kembali
        </button>
      </div>
    );
  }

  // Hasil paginasi galeri (dihitung di useMemo `gallery`).
  const { pinnedTile, stripTiles, pageTiles, cols, rows, totalPages, page } = gallery;

  // Layout berbagi layar (ala Zoom): dukung beberapa layar aktif, satu dipilih
  // sebagai tampilan utama; layar lain muncul di filmstrip.
  const screenShareEntries = [
    ...(localScreenStream ? [{
      peerId: myPeerId,
      stream: localScreenStream,
      name: `${user.nama || user.username || 'Anda'} (Anda)`,
    }] : []),
    ...Object.entries(screenStreams).map(([peerId, stream]) => ({
      peerId,
      stream,
      name: participants.find((p) => p.oduserId === peerId)?.userName || 'Peserta',
    })),
  ].filter((entry) => entry.peerId && entry.stream);
  const activeScreenEntry = screenShareEntries.find((entry) => entry.peerId === screenSharerPeerId) || screenShareEntries[0] || null;
  const screenActive = Boolean(activeScreenEntry);
  const mainScreenStream = activeScreenEntry?.stream || null;
  const activeScreenPeerId = activeScreenEntry?.peerId || null;
  const sharerName = activeScreenEntry?.name || screenSharerNameRef.current || 'Peserta';
  // Spotlight saat share: peserta REMOTE yang dipilih tampil di area utama, layar pindah ke
  // filmstrip. (Self-view tidak di-spotlight agar tak bentrok dengan localVideoRef.)
  const spotlightValid = screenSpotlightId && participants.some((p) => p.oduserId === screenSpotlightId);
  const filmTiles = [
    { key: '__local__', type: 'local' },
    ...participants
      .filter((p) => p.oduserId !== myPeerId && p.oduserId !== String(user.id))
      .map((p) => ({ key: p.oduserId, type: 'remote', participant: p })),
  ];

  // Render satu tile (self-view atau peserta remote).
  const renderTile = (tile) => {
    if (tile.type === 'local') {
      return (
        <div className="relative w-full h-full min-h-0 bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${
              bgEffect.type === 'image' ? '' : 'scale-x-[-1]'
            } ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="w-12 h-12 md:w-20 md:h-20 bg-gray-700 rounded-full flex items-center justify-center text-white text-lg md:text-2xl font-semibold">
              {(user.nama || user.username || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 max-w-[90%] flex items-center gap-1.5 bg-black/60 px-2 py-0.5 md:py-1 rounded-md md:rounded-lg">
            <span className="text-white text-xs md:text-sm truncate">{user.nama || user.username} (Anda)</span>
            {isMuted && <MicOff className="w-3.5 h-3.5 text-red-500 shrink-0" />}
            {isScreenSharing && <Monitor className="w-3.5 h-3.5 text-green-500 shrink-0" />}
          </div>
        </div>
      );
    }
    return (
      <RemoteVideo
        participant={tile.participant}
        stream={remoteStreams[tile.participant.oduserId]}
        isSpeakerMuted={isSpeakerMuted}
        isActive={activeSpeaker === tile.participant.oduserId}
        isPinned={pinnedId === tile.participant.oduserId}
        onTogglePin={togglePin}
        isHost={meetingSettings?.isHost}
        onHostMute={hostMuteParticipant}
        onHostUnmute={hostUnmuteParticipant}
      />
    );
  };

  return (
    <div className="h-[100dvh] bg-gray-900 flex flex-col overflow-hidden">
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
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="text-white font-semibold text-base sm:text-lg truncate max-w-[40vw] sm:max-w-none">
            {meeting?.title || 'Video Meeting'}
          </h1>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${connected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            {connected ? 'Terhubung' : '…'}
          </span>
          {connected && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/70 tabular-nums" title="Durasi meeting">
              <Clock className="w-3 h-3" /> {fmtDuration(elapsed)}
            </span>
          )}
          {isWebinar && (
            <span className="hidden sm:inline shrink-0 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300">
              Webinar{!onStage ? ' · Penonton' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Indikator kualitas jaringan */}
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
          {/* Fullscreen area video */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title={isFullscreen ? 'Keluar layar penuh (F)' : 'Layar penuh (F)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          {/* Pengaturan (perangkat, efek latar, kontrol host) */}
          <button
            onClick={() => { refreshDevices(); setShowSettings(true); }}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Pengaturan"
          >
            <Settings className="w-4 h-4" />
          </button>
          {/* Host webinar: kontrol siaran HLS untuk penonton massal */}
          {isWebinar && meetingSettings?.isHost && (
            <>
              <select
                value={broadcastLayout}
                disabled={broadcasting}
                onChange={(e) => setBroadcastLayout(e.target.value)}
                title="Tata letak siaran: Pembicara aktif (1 sumber) atau Galeri (grid)"
                className="bg-white/10 text-white/80 text-xs rounded-lg px-2 py-1 border border-white/20 focus:outline-none disabled:opacity-50"
              >
                <option className="text-gray-900" value="speaker">Pembicara aktif</option>
                <option className="text-gray-900" value="gallery">Galeri</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-white/70 select-none" title="Rekam siaran ke file (MP4)">
                <input type="checkbox" checked={recordBroadcast} disabled={broadcasting} onChange={(e) => setRecordBroadcast(e.target.checked)} />
                Rekam
              </label>
              <button
                onClick={toggleBroadcast}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  broadcasting ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
                title="Siaran HLS untuk penonton (skala besar)"
              >
                {broadcasting ? '⏹️ Stop Siaran' : '🔴 Mulai Siaran'}
              </button>
              <button
                onClick={copyWatchLink}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Salin link tonton (penonton)"
              >
                <Radio className="w-4 h-4" />
              </button>
            </>
          )}
          <span className="hidden md:inline text-white/60 text-sm">Room: {roomId}</span>
          <button
            onClick={copyMeetingLink}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Salin link undangan"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div ref={mainAreaRef} className="flex-1 p-2 sm:p-3 md:p-4 overflow-hidden flex flex-col min-h-0 bg-gray-900">
        {screenActive ? (
          /* Mode berbagi layar (ala Zoom): tampilan utama + filmstrip peserta di samping.
             Klik peserta di filmstrip → fokuskan ke utama (layar pindah ke filmstrip). */
          <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
            <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden bg-black group">
              {spotlightValid ? (
                /* Spotlight peserta remote */
                <RemoteVideo
                  participant={participants.find((p) => p.oduserId === screenSpotlightId) || { oduserId: screenSpotlightId, userName: '' }}
                  stream={remoteStreams[screenSpotlightId]}
                  isSpeakerMuted={isSpeakerMuted}
                  isActive={activeSpeaker === screenSpotlightId}
                  isHost={meetingSettings?.isHost}
                  onHostMute={hostMuteParticipant}
                  onHostUnmute={hostUnmuteParticipant}
                />
              ) : mainScreenStream ? (
                <ScreenShareView stream={mainScreenStream} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">Memuat layar…</div>
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-lg">
                <Monitor className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-white text-xs md:text-sm truncate max-w-[50vw]">
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
              {/* Tile layar di filmstrip saat sedang fokus ke peserta → klik untuk kembali ke layar */}
              {spotlightValid && mainScreenStream && (
                <button
                  onClick={() => setScreenSpotlightId(null)}
                  className="shrink-0 w-32 sm:w-40 lg:w-full aspect-video relative rounded-xl overflow-hidden bg-black ring-2 ring-transparent hover:ring-green-400"
                  title="Kembali ke layar"
                >
                  <ScreenShareView stream={mainScreenStream} />
                  <span className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white"><Monitor className="w-3 h-3 text-green-400" /> Layar</span>
                </button>
              )}
              {screenShareEntries
                .filter((entry) => entry.peerId !== activeScreenPeerId)
                .map((entry) => (
                  <button
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
              {filmTiles.map((tile) => {
                if (tile.type === 'local') {
                  // Self-view: tidak bisa di-spotlight (hindari konflik ref kamera lokal).
                  return (
                    <div key={tile.key} className="shrink-0 w-32 sm:w-40 lg:w-full aspect-video">{renderTile(tile)}</div>
                  );
                }
                const pid = tile.participant.oduserId;
                const focused = spotlightValid && screenSpotlightId === pid;
                return (
                  <button
                    key={tile.key}
                    onClick={() => setScreenSpotlightId(focused ? null : pid)}
                    className={`shrink-0 w-32 sm:w-40 lg:w-full aspect-video rounded-xl overflow-hidden ring-2 transition-shadow ${focused ? 'ring-green-400' : 'ring-transparent hover:ring-white/40'}`}
                    title="Fokuskan ke tampilan utama"
                  >
                    {renderTile(tile)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : pinnedTile ? (
          /* Mode speaker: 1 tile besar (di-pin) + filmstrip halaman ini */
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0">{renderTile(pinnedTile)}</div>
            <div
              className="shrink-0 grid gap-2 md:gap-3 h-24 md:h-32"
              style={{ gridTemplateColumns: `repeat(${pageTiles.length}, minmax(0, 1fr))` }}
            >
              {pageTiles.map((tile) => (
                <div key={tile.key} className="min-h-0">{renderTile(tile)}</div>
              ))}
            </div>
          </div>
        ) : (
          /* Mode galeri: grid kotak seragam, dipaginasi agar tetap rapih */
          <div
            className="flex-1 grid gap-2 md:gap-3 min-h-0"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {pageTiles.map((tile) => (
              <div key={tile.key} className="min-h-0">{renderTile(tile)}</div>
            ))}
          </div>
        )}

        {/* Navigasi halaman (muncul saat peserta melebihi 1 halaman) */}
        {!screenActive && totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-center gap-3 pt-3">
            <button
              onClick={() => setGalleryPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Halaman sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-white/70 text-sm tabular-nums">
              Halaman {page + 1} / {totalPages} · {stripTiles.length + 1} peserta
            </span>
            <button
              onClick={() => setGalleryPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Halaman berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 px-1.5 sm:px-4 py-2.5 sm:py-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 border-t border-white/10">
        {isWebinar && !onStage ? (
          /* Penonton webinar: tidak publish — hanya tombol angkat tangan */
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
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
              } text-white`}
              title={isMuted ? 'Nyalakan Mikrofon' : 'Matikan Mikrofon'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
              } text-white`}
              title={isVideoOff ? 'Nyalakan Kamera' : 'Matikan Kamera'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                isScreenSharing ? 'bg-green-500 hover:bg-green-600' : 'bg-white/10 hover:bg-white/20'
              } text-white`}
              title={isScreenSharing ? 'Hentikan Screen Share' : 'Screen Share'}
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </button>
          </>
        )}

        <button
          onClick={toggleSpeaker}
          className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
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
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors text-white ${
                showHostAudioMenu ? 'bg-amber-500 hover:bg-amber-600' : 'bg-white/10 hover:bg-white/20'
              }`}
              title="Kontrol mikrofon peserta"
            >
              <MicOffIcon className="w-5 h-5" />
            </button>
            {showHostAudioMenu && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 min-w-48 overflow-hidden rounded-xl border border-white/10 bg-gray-800 shadow-xl">
                <button
                  onClick={() => { setShowHostAudioMenu(false); hostMuteAll(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-white hover:bg-white/10"
                >
                  <MicOffIcon className="w-4 h-4 text-amber-300" />
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

        {/* Reactions (emoji) — tersedia untuk semua peserta */}
        <div className="relative">
          <button
            onClick={() => setShowReactionPicker((v) => !v)}
            className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors text-white ${
              showReactionPicker ? 'bg-amber-500 hover:bg-amber-600' : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Kirim reaksi"
          >
            <Smile className="w-5 h-5" />
          </button>
          {showReactionPicker && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-gray-800 border border-white/10 rounded-2xl p-2 flex gap-1 shadow-xl z-10">
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
          onClick={openChat}
          className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white relative transition-colors"
          title="Chat"
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
          className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white relative transition-colors"
          title="Peserta"
        >
          <Users className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-xs flex items-center justify-center">
            {participants.filter(p => p.oduserId !== myPeerId && p.oduserId !== String(user.id)).length + 1}
          </span>
        </button>

        <button
          onClick={() => setLeaveDialogOpen(true)}
          className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white ml-1 sm:ml-4 transition-colors"
          title="Tinggalkan Meeting"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Sidebar */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-gray-800 shadow-2xl flex flex-col z-50">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-semibold">Chat</h2>
            <button
              onClick={() => setChatOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-white/40 text-center text-sm">Belum ada pesan</p>
            ) : (
              messages.map((msg, index) => {
                const isOwn = msg.senderPeerId
                  ? String(msg.senderPeerId) === String(myPeerId)
                  : String(msg.senderId) === String(user.id);
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
              <button
                onClick={sendMessage}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Sidebar */}
      {participantsOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-72 bg-gray-800 shadow-2xl flex flex-col z-50">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-semibold">Peserta ({participants.filter(p => p.oduserId !== myPeerId && p.oduserId !== String(user.id)).length + 1})</h2>
            <button
              onClick={() => setParticipantsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* Antrian angkat tangan (host) */}
            {meetingSettings?.isHost && Object.keys(raisedHands).length > 0 && (
              <div className="p-3 border-b border-white/10 bg-amber-500/10">
                <p className="text-amber-300 text-xs font-semibold mb-2 flex items-center gap-1">
                  <Hand className="w-4 h-4" /> Antrian Angkat Tangan ({Object.keys(raisedHands).length})
                </p>
                <div className="space-y-1.5">
                  {Object.entries(raisedHands).map(([pid, name]) => (
                    <div key={pid} className="flex items-center justify-between gap-2 text-white text-sm">
                      <span className="truncate">{name}</span>
                      {isWebinar && (
                        <button
                          onClick={() => promoteToStage(pid)}
                          title="Naikkan ke panggung"
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1 flex-shrink-0"
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" /> Panggung
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Ruang tunggu (host): peserta menunggu izin masuk */}
            {meetingSettings?.isHost && waitingList.length > 0 && (
              <div className="p-3 border-b border-white/10 bg-blue-500/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-blue-300 text-xs font-semibold flex items-center gap-1">
                    <Users className="w-4 h-4" /> Ruang Tunggu ({waitingList.length})
                  </p>
                  <button onClick={admitAll} className="text-[11px] px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">Terima semua</button>
                </div>
                <div className="space-y-1.5">
                  {waitingList.map((w) => (
                    <div key={w.peerId} className="flex items-center justify-between gap-2 text-white text-sm">
                      <span className="truncate flex-1">{w.userName}</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => admitParticipant(w.peerId)} title="Terima" className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => rejectParticipant(w.peerId)} title="Tolak" className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Local user */}
            <div className="p-4 flex items-center gap-3 border-b border-white/5">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {(user.nama || user.username || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm">{user.nama || user.username} (Anda)</p>
                <p className="text-white/40 text-xs">{meetingSettings?.isHost ? 'Host' : 'Peserta'}</p>
              </div>
            </div>
            
            {/* Remote participants */}
            {participants.filter(p => p.oduserId !== myPeerId && p.oduserId !== String(user.id)).map((participant) => (
              <div key={participant.oduserId} className="p-4 flex items-center gap-3 border-b border-white/5">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {(participant.userName || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{participant.userName}</p>
                  {isWebinar && (
                    <p className="text-xs text-white/40">{participant.onStage ? 'Panggung' : 'Penonton'}</p>
                  )}
                </div>
                {/* Badge tangan terangkat */}
                {raisedHands[participant.oduserId] && (
                  <span title="Mengangkat tangan" className="text-amber-400"><Hand className="w-4 h-4" /></span>
                )}
                {/* Kontrol host umum: mute & keluarkan peserta */}
                {meetingSettings?.isHost && (
                  <>
                    <button
                      onClick={() => hostMuteParticipant(participant.oduserId, 'audio')}
                      title="Matikan mikrofon peserta"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-amber-500/80 text-white"
                    >
                      <MicOffIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => hostUnmuteParticipant(participant.oduserId, 'audio')}
                      title="Nyalakan mikrofon peserta"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-emerald-500/80 text-white"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => hostMuteParticipant(participant.oduserId, 'video')}
                      title="Matikan kamera peserta"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-orange-500/80 text-white"
                    >
                      <VideoOff className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => hostRemoveParticipant(participant.oduserId, participant.userName)}
                      title="Keluarkan peserta"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/80 text-white"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </>
                )}
                {/* Kontrol host webinar: naik/turun panggung */}
                {isWebinar && meetingSettings?.isHost && (
                  participant.onStage ? (
                    <button
                      onClick={() => demoteFromStage(participant.oduserId)}
                      title="Turunkan dari panggung"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/80 text-white"
                    >
                      <ArrowDownCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => promoteToStage(participant.oduserId)}
                      title="Naikkan ke panggung"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-emerald-500/80 text-white"
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel Virtual Background (efek latar) */}
      {showBgPanel && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowBgPanel(false)}>
          <div
            className="bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg p-5 sm:p-6 text-white max-h-[85vh] overflow-y-auto"
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
              {/* Tanpa efek */}
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

              {/* Blur */}
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

              {/* Unggah gambar dari device */}
              <label
                className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                  bgBusy ? 'opacity-50 pointer-events-none' : 'border-white/25 bg-white/5 hover:bg-white/10'
                }`}
              >
                <Upload className="w-5 h-5 text-white/70" />
                <span className="text-[11px] text-white/70">Unggah</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadBgImage} />
              </label>

              {/* Galeri gambar dari device */}
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

      {/* Pengaturan (perangkat, efek latar, kontrol host) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6 text-white max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="w-5 h-5" /> Pengaturan</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-5">
              {/* Perangkat */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Perangkat</p>
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

              {/* Efek latar (virtual background) */}
              {!(isWebinar && !onStage) && (
                <div className="space-y-2 pt-1 border-t border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/40 pt-3">Efek Latar</p>
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

              {/* Kontrol host */}
              {meetingSettings?.isHost && (
                <div className="space-y-2 pt-1 border-t border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/40 pt-3">Kontrol Host</p>
                  <button
                    onClick={hostMuteAll}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-left"
                  >
                    <MicOffIcon className="w-4 h-4 text-white/60 shrink-0" />
                    Matikan mikrofon semua peserta
                  </button>
                  <button
                    onClick={hostUnmuteAll}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-left"
                  >
                    <Mic className="w-4 h-4 text-white/60 shrink-0" />
                    Nyalakan mikrofon semua peserta
                  </button>
                  <button
                    onClick={toggleLock}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-colors ${
                      isLocked ? 'bg-amber-500/20 hover:bg-amber-500/30' : 'bg-white/10 hover:bg-white/15'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-white/60" />}
                      Kunci meeting
                    </span>
                    <span className={`text-xs ${isLocked ? 'text-amber-300' : 'text-white/50'}`}>{isLocked ? 'Terkunci' : 'Terbuka'}</span>
                  </button>
                  <p className="text-xs text-white/40">Saat terkunci, peserta baru tidak bisa bergabung.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Dialog */}
      {leaveDialogOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            {/* If host is alone, show simplified "End Meeting" dialog */}
            {meetingSettings?.isHost && participants.filter(p => p.oduserId !== myPeerId && p.oduserId !== String(user.id)).length === 0 ? (
              <>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Akhiri Meeting?</h2>
                <p className="text-gray-600 mb-6">
                  Anda adalah satu-satunya peserta. Meeting akan diakhiri.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setLeaveDialogOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleEndMeeting}
                    disabled={endingMeeting}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {endingMeeting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mengakhiri...
                      </>
                    ) : (
                      'Akhiri Meeting'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {meetingSettings?.isHost ? 'Akhiri atau Tinggalkan Meeting?' : 'Tinggalkan Meeting?'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {meetingSettings?.isHost 
                    ? 'Sebagai host, Anda dapat mengakhiri meeting untuk semua peserta atau hanya meninggalkan meeting.'
                    : 'Anda yakin ingin meninggalkan meeting ini?'}
                </p>
                <div className="flex flex-col gap-3">
                  {meetingSettings?.isHost && (
                    <button
                      onClick={handleEndMeeting}
                      disabled={endingMeeting}
                      className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {endingMeeting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Mengakhiri...
                        </>
                      ) : (
                        'Akhiri Meeting untuk Semua'
                      )}
                    </button>
                  )}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setLeaveDialogOpen(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleLeave}
                      className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      {meetingSettings?.isHost ? 'Tinggalkan Saja' : 'Tinggalkan'}
                    </button>
                  </div>
                </div>
              </>
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

      {/* Layar tunggu (waiting room) — peserta menunggu izin host */}
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
              onClick={() => { cleanup(); navigate(getMeetingListPath()); }}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm"
            >
              Batalkan
            </button>
          </div>
        </div>
      )}

      {/* Prompt password meeting */}
      {passwordPromptOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[80] p-4">
          <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Password Diperlukan</h2>
            </div>
            <p className="text-sm text-white/50 mb-4">Meeting ini dilindungi password. Masukkan password untuk bergabung.</p>
            <input
              type="password"
              value={joinPassword}
              autoFocus
              onChange={(e) => { setJoinPassword(e.target.value); setJoinPasswordError(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && joinPassword.trim()) {
                  joinPasswordRef.current = joinPassword;
                  setPasswordPromptOpen(false);
                  doJoinRoomRef.current?.();
                }
              }}
              placeholder="Password meeting"
              className={`w-full px-4 py-2.5 bg-white/10 border rounded-lg text-white placeholder-white/30 focus:outline-none ${
                joinPasswordError ? 'border-red-400/70' : 'border-white/20 focus:border-blue-500'
              }`}
            />
            {joinPasswordError && <p className="mt-1.5 text-xs text-red-300">Password salah, coba lagi.</p>}
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setPasswordPromptOpen(false); cleanup(); navigate(getMeetingListPath()); }}
                className="px-4 py-2 text-white/70 hover:bg-white/10 rounded-lg transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (!joinPassword.trim()) return;
                  joinPasswordRef.current = joinPassword;
                  setPasswordPromptOpen(false);
                  doJoinRoomRef.current?.();
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Gabung
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoMeetingPage;
