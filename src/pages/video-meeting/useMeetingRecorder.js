/**
 * useMeetingRecorder
 *
 * Rekam rapat/webinar SECARA LOKAL di device perekam (bukan di server).
 * Alur:
 *   1. User pilih lokasi/folder + nama file LEBIH DULU (File System Access API
 *      `showSaveFilePicker`) — persis seperti "save video ke device".
 *   2. Semua tile video (lokal + remote) dikomposit ke satu <canvas> grid, dan
 *      seluruh audio (mic lokal + audio peserta) dicampur via Web Audio API.
 *   3. MediaRecorder menulis potongan rekaman LANGSUNG ke file pilihan user
 *      (streaming ke disk → aman untuk rapat panjang, tidak menumpuk di memori).
 *
 * Fallback: bila browser tidak mendukung showSaveFilePicker (mis. Firefox /
 * konteks non-HTTPS), rekaman ditahan di memori lalu diunduh lewat dialog
 * unduhan browser saat berhenti — tetap tersimpan ke device.
 *
 * Catatan: setiap klien merekam sendiri; file hanya ada di device yang menekan
 * tombol Rekam. Tidak ada data rekaman yang dikirim ke server.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const CANVAS_W = 1280;
const CANVAS_H = 720;
const FPS = 24;

// Pilih kontainer/codec terbaik yang didukung browser. MP4 (Safari) diutamakan
// bila ada; selebihnya WebM (Chrome/Edge/Firefox).
function pickMimeType() {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  if (typeof MediaRecorder === 'undefined') return null;
  for (const t of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch { /* abaikan */ }
  }
  return '';
}

function extForMime(mime) {
  return mime && mime.startsWith('video/mp4') ? 'mp4' : 'webm';
}

// "cover": gambar video memenuhi sel tanpa distorsi (crop bagian berlebih).
function drawCover(ctx, video, dx, dy, dw, dh) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return false;
  const scale = Math.max(dw / vw, dh / vh);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
  return true;
}

/**
 * @param {object} opts
 * @param {() => Array<{ id: string, stream: MediaStream, label?: string }>} opts.getVideoSources
 *        Sumber video aktif (lokal + remote yang kameranya menyala). Dipanggil tiap frame.
 * @param {() => MediaStream[]} opts.getAudioStreams
 *        Stream yang punya track audio (mic lokal + audio peserta). Dipanggil sekali saat mulai + saat refresh.
 * @param {() => string} [opts.getTitle] judul untuk nama file default.
 */
export default function useMeetingRecorder({ getVideoSources, getAudioStreams, getTitle }) {
  const supported = typeof MediaRecorder !== 'undefined';
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0); // detik
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const rafRef = useRef(null);
  const canvasRef = useRef(null);
  const videoElsRef = useRef(new Map());      // streamId -> HTMLVideoElement (offscreen)
  const audioCtxRef = useRef(null);
  const audioDestRef = useRef(null);
  const audioSrcRef = useRef(new Map());      // streamId -> MediaStreamAudioSourceNode
  const writableRef = useRef(null);           // FileSystemWritableFileStream | null
  const chunksRef = useRef([]);               // fallback in-memory
  const fileMetaRef = useRef({ name: 'rekaman', mime: '' });
  const timerRef = useRef(null);

  // --- Komposit video: gambar grid semua sumber ke canvas tiap frame ---
  const getVideoElForStream = useCallback((id, stream) => {
    let el = videoElsRef.current.get(id);
    if (!el) {
      el = document.createElement('video');
      el.muted = true;
      el.playsInline = true;
      el.autoplay = true;
      el.srcObject = stream;
      const p = el.play();
      if (p && p.catch) p.catch(() => {});
      videoElsRef.current.set(id, el);
    } else if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    return el;
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111827'; // gray-900
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const sources = (getVideoSources?.() || []).filter((s) => s && s.stream);
    const seen = new Set();

    if (sources.length === 0) {
      // Tidak ada video aktif — tampilkan judul (rekaman audio tetap jalan).
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '600 36px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(getTitle?.() || 'Rekaman Rapat', CANVAS_W / 2, CANVAS_H / 2);
    } else {
      const n = sources.length;
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const gap = 8;
      const cellW = (CANVAS_W - gap * (cols + 1)) / cols;
      const cellH = (CANVAS_H - gap * (rows + 1)) / rows;

      sources.forEach((src, i) => {
        seen.add(src.id);
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = gap + c * (cellW + gap);
        const y = gap + r * (cellH + gap);

        ctx.fillStyle = '#1f2937'; // gray-800
        ctx.fillRect(x, y, cellW, cellH);

        const el = getVideoElForStream(src.id, src.stream);
        const drawn = drawCover(ctx, el, x, y, cellW, cellH);
        if (!drawn) {
          // Belum ada frame video — tampilkan inisial.
          const initial = (src.label || 'U').trim().charAt(0).toUpperCase();
          ctx.fillStyle = '#374151';
          const rad = Math.min(cellW, cellH) * 0.18;
          ctx.beginPath();
          ctx.arc(x + cellW / 2, y + cellH / 2, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `600 ${Math.round(rad)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(initial, x + cellW / 2, y + cellH / 2);
          ctx.textBaseline = 'alphabetic';
        }

        if (src.label) {
          const label = src.label.length > 32 ? `${src.label.slice(0, 31)}…` : src.label;
          ctx.font = '500 18px system-ui, sans-serif';
          ctx.textAlign = 'left';
          const padX = 8;
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(x + 6, y + cellH - 32, tw + padX * 2, 26);
          ctx.fillStyle = '#fff';
          ctx.fillText(label, x + 6 + padX, y + cellH - 14);
        }
      });
    }

    // Indikator REC + waktu di pojok.
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(28, 28, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('REC', 44, 34);

    // Bersihkan <video> offscreen untuk stream yang sudah tidak ada.
    for (const [id, el] of videoElsRef.current.entries()) {
      if (!seen.has(id)) {
        try { el.srcObject = null; } catch { /* ignore */ }
        videoElsRef.current.delete(id);
      }
    }
  }, [getVideoSources, getVideoElForStream, getTitle]);

  // --- Audio mixing: gabungkan semua stream audio ke satu tujuan ---
  const buildMixedAudioTrack = useCallback(() => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const audioCtx = new Ctx();
    audioCtxRef.current = audioCtx;
    const dest = audioCtx.createMediaStreamDestination();
    audioDestRef.current = dest;

    const streams = (getAudioStreams?.() || []).filter((s) => s && s.getAudioTracks().length);
    streams.forEach((stream) => {
      try {
        const node = audioCtx.createMediaStreamSource(stream);
        node.connect(dest);
        audioSrcRef.current.set(stream.id, node);
      } catch { /* stream tanpa audio valid — lewati */ }
    });
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return dest.stream.getAudioTracks()[0] || null;
  }, [getAudioStreams]);

  // Refresh sumber audio (mis. peserta baru bergabung) saat sedang merekam.
  const refreshAudioSources = useCallback(() => {
    const audioCtx = audioCtxRef.current;
    const dest = audioDestRef.current;
    if (!audioCtx || !dest) return;
    const streams = (getAudioStreams?.() || []).filter((s) => s && s.getAudioTracks().length);
    const liveIds = new Set(streams.map((s) => s.id));
    streams.forEach((stream) => {
      if (audioSrcRef.current.has(stream.id)) return;
      try {
        const node = audioCtx.createMediaStreamSource(stream);
        node.connect(dest);
        audioSrcRef.current.set(stream.id, node);
      } catch { /* ignore */ }
    });
    for (const [id, node] of audioSrcRef.current.entries()) {
      if (!liveIds.has(id)) {
        try { node.disconnect(); } catch { /* ignore */ }
        audioSrcRef.current.delete(id);
      }
    }
  }, [getAudioStreams]);

  const cleanup = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    for (const node of audioSrcRef.current.values()) {
      try { node.disconnect(); } catch { /* ignore */ }
    }
    audioSrcRef.current.clear();
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
    }
    audioDestRef.current = null;
    for (const el of videoElsRef.current.values()) {
      try { el.srcObject = null; } catch { /* ignore */ }
    }
    videoElsRef.current.clear();
    canvasRef.current = null;
    recorderRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (!supported) {
      const msg = 'Browser tidak mendukung perekaman (MediaRecorder).';
      setError(msg);
      throw new Error(msg);
    }

    const mime = pickMimeType();
    const ext = extForMime(mime);
    const title = (getTitle?.() || 'rekaman-rapat')
      .replace(/[^\wÀ-ɏ\- ]+/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'rekaman-rapat';
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const suggestedName = `${title}-${ts}.${ext}`;
    fileMetaRef.current = { name: suggestedName, mime };

    // 1) PILIH LOKASI/FOLDER LEBIH DULU (seperti save video ke device).
    writableRef.current = null;
    chunksRef.current = [];
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: ext === 'mp4' ? 'Video MP4' : 'Video WebM',
            accept: { [ext === 'mp4' ? 'video/mp4' : 'video/webm']: [`.${ext}`] },
          }],
        });
        writableRef.current = await handle.createWritable();
      } catch (e) {
        // User membatalkan dialog pemilihan folder → batal merekam.
        if (e?.name === 'AbortError') return false;
        // API ada tapi gagal (mis. permission) → pakai fallback unduhan.
        writableRef.current = null;
      }
    }

    // 2) Siapkan canvas komposit + audio campuran.
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvasRef.current = canvas;
    drawFrame();

    const canvasStream = canvas.captureStream(FPS);
    const tracks = [...canvasStream.getVideoTracks()];
    const audioTrack = buildMixedAudioTrack();
    if (audioTrack) tracks.push(audioTrack);
    const mixedStream = new MediaStream(tracks);

    // Loop menggambar frame.
    const loop = () => {
      drawFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // 3) Rekam → tulis langsung ke disk (atau tahan di memori utk fallback).
    let recorder;
    try {
      recorder = new MediaRecorder(mixedStream, mime ? { mimeType: mime } : undefined);
    } catch (e) {
      cleanup();
      const msg = 'Gagal memulai perekam: ' + (e?.message || e);
      setError(msg);
      throw new Error(msg);
    }
    recorderRef.current = recorder;

    recorder.ondataavailable = async (ev) => {
      if (!ev.data || ev.data.size === 0) return;
      if (writableRef.current) {
        try { await writableRef.current.write(ev.data); }
        catch (e) { console.error('[Recorder] gagal menulis ke file:', e); }
      } else {
        chunksRef.current.push(ev.data);
      }
    };

    recorder.onstop = async () => {
      try {
        if (writableRef.current) {
          await writableRef.current.close();
          writableRef.current = null;
        } else {
          // Fallback: unduh via blob.
          const blob = new Blob(chunksRef.current, { type: mime || 'video/webm' });
          chunksRef.current = [];
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileMetaRef.current.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
        }
      } catch (e) {
        console.error('[Recorder] gagal finalisasi file:', e);
        setError('Gagal menyimpan file rekaman: ' + (e?.message || e));
      } finally {
        cleanup();
        setIsRecording(false);
        setElapsed(0);
      }
    };

    recorder.start(1000); // potongan tiap 1 detik → streaming ke disk
    setIsRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
      refreshAudioSources(); // serap peserta baru ke campuran audio
    }, 1000);
    return true;
  }, [supported, getTitle, drawFrame, buildMixedAudioTrack, refreshAudioSources, cleanup]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch { /* ignore */ }
    }
  }, []);

  const toggleRecording = useCallback(async () => {
    if (isRecording) stopRecording();
    else await startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // Hentikan & bersihkan saat unmount (mis. keluar dari meeting).
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { /* ignore */ }
      }
      cleanup();
    };
  }, [cleanup]);

  return { supported, isRecording, elapsed, error, startRecording, stopRecording, toggleRecording };
}
