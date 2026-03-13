/**
 * Video Meeting Page
 * Main video conferencing room with WebRTC via mediasoup
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, 
  MessageSquare, Users, PhoneOff, Send, Copy, X, Loader2,
  Volume2, VolumeX
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import api from '../../api';

const API_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';

// Remote Video Component
const RemoteVideo = ({ participant, stream, isSpeakerMuted }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  
  // Debug: log stream state on each render
  useEffect(() => {
    console.log(`[RemoteVideo] ${participant.userName} (${participant.oduserId}):`, {
      stream: !!stream,
      tracks: stream?.getTracks().map(t => `${t.kind}:${t.enabled}`),
      hasVideo
    });
  });
  
  // Set video srcObject
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const videoTracks = stream.getVideoTracks();
      const newHasVideo = videoTracks.length > 0 && videoTracks[0].enabled;
      console.log(`[RemoteVideo] Setting video srcObject for ${participant.userName}, videoTracks:`, videoTracks.length, 'hasVideo:', newHasVideo);
      setHasVideo(newHasVideo);
    }
  }, [stream, participant.userName]);
  
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
      const videoTracks = stream.getVideoTracks();
      const newHasVideo = videoTracks.length > 0 && videoTracks[0].enabled;
      console.log(`[RemoteVideo] Track changed for ${participant.userName}, hasVideo:`, newHasVideo);
      setHasVideo(newHasVideo);
    };
    
    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);
    
    // Also check immediately in case track already exists
    handleTrackChange();
    
    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
    };
  }, [stream, participant.userName]);
  
  return (
    <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
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

const VideoMeetingPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [myPeerId, setMyPeerId] = useState(null);
  const [meetingSettings, setMeetingSettings] = useState(null);
  
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [endingMeeting, setEndingMeeting] = useState(false);
  
  // Refs
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const remoteVideosRef = useRef({});
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
  const producedRef = useRef(false); // Track if we've already produced

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
          if (peerIdStr === String(user.id)) {
            console.log('[Mediasoup] Skipping own producer:', producer.producerId);
            continue;
          }
          console.log(`[Mediasoup] Consuming producer ${producer.producerId} from peer ${peerIdStr}`);
          await consumeProducer(producer.producerId, peerIdStr, producer.kind);
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
          appData: { mediaType: 'video' }
        });
        producersRef.current.set('video', videoProducer);
        console.log('[Mediasoup] Video producer created:', videoProducer.id);
      }
    } catch (error) {
      console.error('[Mediasoup] Produce error:', error);
    }
  };
  
  // Consume a remote producer
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
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      
      // Reset participants before joining
      setParticipants([]);
      
      // Join the room with callback
      socketRef.current.emit('join-room', {
        roomId,
      }, async (response) => {
        console.log('Join room response:', response);
        
        if (response.error) {
          toast.error(response.error);
          return;
        }
        
        if (response.success) {
          setConnected(true);
          
          // Save our peer ID for filtering
          if (response.peerId) {
            setMyPeerId(response.peerId);
            console.log('My peer ID:', response.peerId);
          }
          
          // Save meeting settings (includes isHost)
          if (response.meetingSettings) {
            console.log('Meeting settings received:', response.meetingSettings);
            console.log('Am I the host?', response.meetingSettings.isHost);
            setMeetingSettings(response.meetingSettings);
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
      });
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
      if (peerIdStr === String(user.id)) return;
      
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
    });
    
    // Handle new producer from other peer
    socketRef.current.on('new-producer', async (data) => {
      console.log('[new-producer] Received:', data);
      const { producerId, peerId, kind, userName } = data;
      const peerIdStr = String(peerId);
      
      // Don't consume our own producers
      if (peerIdStr === String(user.id)) {
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
      console.log('Producer closed:', data);
      const { producerId, peerId } = data;
      
      // Remove track from stream
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
      setMessages((prev) => [...prev, message]);
      if (!chatOpen) {
        setUnreadCount((prev) => prev + 1);
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
      navigate('/sekretariat/video-meeting');
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
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    
    // Clear remote streams
    setRemoteStreams({});
    
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

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
        }
      }
      
      // Get camera again
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = stream.getVideoTracks()[0];
        
        if (localStream) {
          localStream.removeTrack(localStream.getVideoTracks()[0]);
          localStream.addTrack(newVideoTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        
        setIsScreenSharing(false);
      } catch (err) {
        console.error('Error switching back to camera:', err);
      }
    } else {
      // Start screen share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track
        if (localStream) {
          const oldVideoTrack = localStream.getVideoTracks()[0];
          if (oldVideoTrack) {
            oldVideoTrack.stop();
            localStream.removeTrack(oldVideoTrack);
          }
          localStream.addTrack(screenTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        
        // Handle screen share stop from browser
        screenTrack.onended = () => {
          toggleScreenShare();
        };
        
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
      userName: user.nama || user.username,
    });
    
    setNewMessage('');
  };

  const handleLeave = () => {
    cleanup();
    navigate('/sekretariat/video-meeting');
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
        navigate('/sekretariat/video-meeting');
      }
    });
  };

  const copyMeetingLink = () => {
    // Use /join/ for public shareable link (guests can join without login)
    const link = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link meeting disalin - dapat dibagikan ke siapapun');
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

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-semibold text-lg">
            {meeting?.title || 'Video Meeting'}
          </h1>
          <span className={`px-2 py-0.5 rounded-full text-xs ${connected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            {connected ? 'Terhubung' : 'Menghubungkan...'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-sm">Room: {roomId}</span>
          <button
            onClick={copyMeetingLink}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Salin link"
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
                  {(user.nama || user.username || 'U')[0].toUpperCase()}
                </div>
              </div>
            )}
            
            <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg">
              <span className="text-white text-sm">
                {user.nama || user.username} (Anda)
              </span>
              {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
              {isScreenSharing && <Monitor className="w-4 h-4 text-green-500" />}
            </div>
          </div>

          {/* Remote Videos */}
          {(() => {
            console.log('[VideoMeetingPage] Rendering remote videos:', {
              participants: participants.map(p => ({ id: p.oduserId, name: p.userName })),
              remoteStreamsKeys: Object.keys(remoteStreams),
              remoteStreamsDetail: Object.entries(remoteStreams).map(([k, v]) => ({ 
                peerId: k, 
                tracks: v?.getTracks().map(t => `${t.kind}:${t.enabled}`) 
              })),
              myPeerId,
              userId: user.id
            });
            return null;
          })()}
          {participants.filter(p => p.oduserId !== myPeerId && p.oduserId !== String(user.id)).map((participant) => {
            const stream = remoteStreams[participant.oduserId];
            console.log(`[VideoMeetingPage] Rendering participant ${participant.userName}:`, {
              oduserId: participant.oduserId,
              hasStream: !!stream,
              streamTracks: stream?.getTracks().map(t => `${t.kind}:${t.enabled}`)
            });
            return (
              <RemoteVideo
                key={participant.oduserId}
                participant={participant}
                stream={stream}
                isSpeakerMuted={isSpeakerMuted}
              />
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-4 flex items-center justify-center gap-2 border-t border-white/10">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
          } text-white`}
          title={isMuted ? 'Nyalakan Mikrofon' : 'Matikan Mikrofon'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
          } text-white`}
          title={isVideoOff ? 'Nyalakan Kamera' : 'Matikan Kamera'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isScreenSharing ? 'bg-green-500 hover:bg-green-600' : 'bg-white/10 hover:bg-white/20'
          } text-white`}
          title={isScreenSharing ? 'Hentikan Screen Share' : 'Screen Share'}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleSpeaker}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isSpeakerMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
          } text-white`}
          title={isSpeakerMuted ? 'Nyalakan Speaker' : 'Matikan Speaker'}
        >
          {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <button
          onClick={openChat}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white relative transition-colors"
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
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white relative transition-colors"
          title="Peserta"
        >
          <Users className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-xs flex items-center justify-center">
            {participants.filter(p => p.oduserId !== myPeerId && p.oduserId !== String(user.id)).length + 1}
          </span>
        </button>

        <button
          onClick={() => setLeaveDialogOpen(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white ml-4 transition-colors"
          title="Tinggalkan Meeting"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Sidebar */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-gray-800 shadow-2xl flex flex-col z-50">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-semibold">Chat</h2>
            <button
              onClick={() => setChatOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-white/40 text-center text-sm">Belum ada pesan</p>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex flex-col ${msg.oduserId === user.id ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-white/40 text-xs mb-1">{msg.userName}</span>
                  <div className={`px-4 py-2 rounded-xl max-w-[80%] ${
                    msg.oduserId === user.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white/10 text-white'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ketik pesan..."
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
        <div className="fixed inset-y-0 right-0 w-72 bg-gray-800 shadow-2xl flex flex-col z-50">
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
                <p className="text-white text-sm">{participant.userName}</p>
              </div>
            ))}
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
    </div>
  );
};

export default VideoMeetingPage;
