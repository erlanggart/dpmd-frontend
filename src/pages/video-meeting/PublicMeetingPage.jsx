/**
 * Public Meeting Join Page
 * Allows anyone to join a meeting via shared link without login
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, 
  MessageSquare, Users, PhoneOff, Send, Copy, X, Loader2,
  User, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';

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
const RemoteVideo = ({ participant, stream }) => {
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
      audioRef.current.play().catch(err => {
        console.warn(`[RemoteVideo] Audio autoplay blocked:`, err.message);
      });
    }
  }, [stream]);
  
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
    <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
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
  
  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // UI state
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
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

  // Get user info
  const user = isLoggedIn 
    ? storedUser 
    : { id: `guest_${Date.now()}`, nama: guestName, isGuest: true };

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
          reject(new Error(response.error));
          return;
        }
        
        const transport = deviceRef.current.createSendTransport(response.transport);
        
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketRef.current.emit('connect-transport', {
            transportId: transport.id,
            dtlsParameters
          }, (res) => {
            if (res.error) errback(new Error(res.error));
            else callback();
          });
        });
        
        transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
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
        
        sendTransportRef.current = transport;
        resolve(transport);
      });
    });
  };
  
  const createRecvTransport = async () => {
    return new Promise((resolve, reject) => {
      socketRef.current.emit('create-transport', { direction: 'recv' }, async (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        
        const transport = deviceRef.current.createRecvTransport(response.transport);
        
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketRef.current.emit('connect-transport', {
            transportId: transport.id,
            dtlsParameters
          }, (res) => {
            if (res.error) errback(new Error(res.error));
            else callback();
          });
        });
        
        recvTransportRef.current = transport;
        resolve(transport);
      });
    });
  };
  
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
          
          // Resume consumer
          socketRef.current.emit('resume-consumer', { consumerId: consumer.id }, () => {
            console.log('[Mediasoup] Consumer resumed:', consumer.id);
          });
          
          // Store consumer
          if (!consumersRef.current.has(peerIdStr)) {
            consumersRef.current.set(peerIdStr, {});
          }
          consumersRef.current.get(peerIdStr)[kind] = consumer;
          
          // Add track to remote stream
          setRemoteStreams(prev => {
            const newStreams = { ...prev };
            if (!newStreams[peerIdStr]) {
              newStreams[peerIdStr] = new MediaStream();
            }
            newStreams[peerIdStr].addTrack(consumer.track);
            console.log(`[Mediasoup] Added ${kind} track to remoteStreams[${peerIdStr}], total tracks:`, newStreams[peerIdStr].getTracks().length);
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
        transports: ['websocket'],
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
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        
        screenTrack.onended = () => toggleScreenShare();
        
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

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return;
    
    socketRef.current.emit('chat-message', {
      roomId,
      message: newMessage.trim(),
      userName: isLoggedIn ? (user?.nama || user?.username || 'User') : (guestName || 'Guest'),
    });
    
    setNewMessage('');
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
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
        <p className="text-white">Memuat informasi meeting...</p>
      </div>
    );
  }

  // Auto-rejoining state
  if (autoJoining && !joined) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
        <p className="text-white">Menghubungkan kembali ke meeting...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="bg-red-500/20 text-red-400 px-6 py-4 rounded-xl max-w-md text-center">
          {error}
        </div>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  // Pre-join screen
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {meetingInfo?.title || 'Video Meeting'}
            </h1>
            {meetingInfo?.description && (
              <p className="text-gray-400">{meetingInfo.description}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Video Preview */}
            <div className="bg-gray-800 rounded-2xl overflow-hidden aspect-video relative">
              <video
                ref={previewVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover scale-x-[-1] ${isVideoOff ? 'hidden' : ''}`}
              />
              
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
              )}

              {/* Preview controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <button
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
                  } text-white`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isVideoOff ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
                  } text-white`}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Join Form */}
            <div className="flex flex-col justify-center">
              <div className="bg-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Siap untuk bergabung?
                </h2>

                {!isLoggedIn && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Nama Anda
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Masukkan nama Anda"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {isLoggedIn && (
                  <div className="mb-6 flex items-center gap-3 bg-gray-700 rounded-lg p-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {(storedUser?.nama || storedUser?.username || 'U')[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{storedUser?.nama || storedUser?.username || 'User'}</p>
                      <p className="text-gray-400 text-sm">Masuk sebagai {storedUser?.role || 'pegawai'}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleJoinMeeting}
                  disabled={joining || (!isLoggedIn && !guestName.trim())}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Bergabung...
                    </>
                  ) : (
                    <>
                      Gabung Sekarang
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <p className="text-gray-500 text-sm text-center mt-4">
                  Room ID: <span className="font-mono text-gray-400">{roomId}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main meeting view
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
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
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-4 flex items-center justify-center gap-2 border-t border-white/10">
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
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-white/40 text-center text-sm">Belum ada pesan</p>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.oduserId === user.id ? 'items-end' : 'items-start'}`}>
                  <span className="text-white/40 text-xs mb-1">{msg.userName}</span>
                  <div className={`px-4 py-2 rounded-xl max-w-[80%] ${
                    msg.oduserId === user.id ? 'bg-blue-500 text-white' : 'bg-white/10 text-white'
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
