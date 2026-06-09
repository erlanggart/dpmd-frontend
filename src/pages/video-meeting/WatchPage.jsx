/**
 * WatchPage — penonton webinar (view-only) via HLS.
 * Skala ribuan: hanya menonton stream HLS (idealnya lewat CDN), bukan WebRTC.
 * Polling status siaran; saat live, putar playlist .m3u8 dengan hls.js.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Hls from 'hls.js';
import { Loader2, Radio, Volume2 } from 'lucide-react';
import api from '../../api';

// Origin backend (untuk URL HLS). VITE_API_BASE_URL mis. https://dpmdbogorkab.id/api
const API_ORIGIN = import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3001';

export default function WatchPage() {
  const { roomId } = useParams();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [live, setLive] = useState(false);
  const [playlist, setPlaylist] = useState(null);
  const [needTap, setNeedTap] = useState(false); // autoplay diblokir → minta klik

  // Poll status siaran
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await api.get(`/video-meetings/${roomId}/broadcast/status`);
        if (stop) return;
        const d = res.data?.data;
        setLive(!!d?.live);
        setPlaylist(d?.playlist ? `${API_ORIGIN}${d.playlist}` : null);
      } catch {
        if (!stop) setLive(false);
      }
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => { stop = true; clearInterval(iv); };
  }, [roomId]);

  // Attach/detach HLS saat live berubah
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !live || !playlist) return undefined;

    const tryPlay = () => {
      const p = video.play();
      if (p && p.catch) p.catch(() => setNeedTap(true));
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(playlist);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          // playlist mungkin belum siap di awal; muat ulang
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        }
      });
      return () => { try { hls.destroy(); } catch { /* noop */ } hlsRef.current = null; };
    }
    // Safari / iOS: HLS native
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playlist;
      video.addEventListener('loadedmetadata', tryPlay);
      return () => { video.removeEventListener('loadedmetadata', tryPlay); };
    }
    return undefined;
  }, [live, playlist]);

  const handleTap = () => {
    setNeedTap(false);
    videoRef.current?.play().catch(() => setNeedTap(true));
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10">
        <Radio className={`w-5 h-5 ${live ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
        <span className="text-white font-semibold">Webinar</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${live ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300'}`}>
          {live ? 'LIVE' : 'Belum mulai'}
        </span>
        <span className="ml-auto text-white/40 text-xs">Room: {roomId}</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-3">
        {live ? (
          <div className="relative w-full max-w-5xl">
            <video
              ref={videoRef}
              className="w-full rounded-xl bg-black aspect-video"
              controls
              playsInline
            />
            {needTap && (
              <button
                onClick={handleTap}
                className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-white rounded-xl"
              >
                <Volume2 className="w-6 h-6" /> Ketuk untuk memutar
              </button>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p>Menunggu siaran dimulai oleh host…</p>
            <p className="text-xs text-gray-600 mt-1">Halaman akan otomatis memutar saat siaran live.</p>
          </div>
        )}
      </div>
    </div>
  );
}
