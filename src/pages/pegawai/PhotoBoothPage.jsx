import React from "react";
import { Camera, Download, ImagePlus, RefreshCcw, Sparkles } from "lucide-react";
import api from "../../api";

const MODES = [
  { id: "single", label: "Single", frames: 1 },
  { id: "two", label: "2 Frame", frames: 2 },
  { id: "four", label: "4 Frame", frames: 4 },
  { id: "six", label: "6 Frame", frames: 6 },
  { id: "custom", label: "Custom", frames: 4 },
];

const FILTERS = [
  { id: "normal", label: "Normal", css: "none" },
  { id: "bw", label: "Black & White", css: "grayscale(1) contrast(1.05)" },
  { id: "vintage", label: "Vintage", css: "sepia(.45) saturate(.9) contrast(1.05)" },
  { id: "cinematic", label: "Cinematic", css: "contrast(1.18) saturate(1.25) brightness(.92)" },
  { id: "soft", label: "Soft Tone", css: "brightness(1.06) saturate(.88) contrast(.92)" },
  { id: "beauty", label: "Beauty", css: "brightness(1.1) saturate(1.05) blur(.2px)" },
  { id: "boost", label: "Color Boost", css: "saturate(1.55) contrast(1.08)" },
];

const COUNTDOWNS = [3, 5, 10];

function getMode(modeId) {
  return MODES.find((mode) => mode.id === modeId) || MODES[0];
}

function getFilter(filterId) {
  return FILTERS.find((filter) => filter.id === filterId) || FILTERS[0];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export default function PhotoBoothPage() {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [stream, setStream] = React.useState(null);
  const [mode, setMode] = React.useState("single");
  const [filter, setFilter] = React.useState("normal");
  const [countdown, setCountdown] = React.useState(3);
  const [customFrames, setCustomFrames] = React.useState(4);
  const [shots, setShots] = React.useState([]);
  const [finalImage, setFinalImage] = React.useState("");
  const [counter, setCounter] = React.useState(null);
  const [flash, setFlash] = React.useState(false);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [gallery, setGallery] = React.useState([]);

  const selectedFilter = getFilter(filter);
  const frameCount = mode === "custom" ? Number(customFrames) : getMode(mode).frames;

  React.useEffect(() => {
    let activeStream;

    const startCamera = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setStream(activeStream);
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
      } catch (error) {
        console.error("Camera error:", error);
      }
    };

    startCamera();
    loadGallery();

    return () => {
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const loadGallery = async () => {
    try {
      const response = await api.get("/photo-booth/gallery");
      if (response.data?.success) {
        setGallery(response.data.data || []);
      }
    } catch (error) {
      setGallery([]);
    }
  };

  const playShutter = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, audio.currentTime);
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.12);
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const runCountdown = async () => {
    for (let value = countdown; value > 0; value -= 1) {
      setCounter(value);
      await wait(900);
    }
    setCounter(null);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.filter = selectedFilter.css;
    ctx.drawImage(video, 0, 0, width, height);
    ctx.filter = "none";

    playShutter();
    setFlash(true);
    setTimeout(() => setFlash(false), 180);

    return canvas.toDataURL("image/jpeg", 0.95);
  };

  const composeResult = async (items) => {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return "";

    const columns = items.length === 1 ? 1 : items.length === 2 ? 1 : 2;
    const rows = Math.ceil(items.length / columns);
    const cellWidth = 900;
    const cellHeight = 620;
    const gap = 26;
    const padding = 44;
    const footer = 108;

    canvas.width = columns * cellWidth + (columns - 1) * gap + padding * 2;
    canvas.height = rows * cellHeight + (rows - 1) * gap + padding * 2 + footer;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#eff6ff");
    gradient.addColorStop(0.45, "#ffffff");
    gradient.addColorStop(1, "#f5d0fe");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const images = await Promise.all(items.map((src) => loadImage(src)));
    images.forEach((image, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = padding + col * (cellWidth + gap);
      const y = padding + row * (cellHeight + gap);
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(15, 23, 42, .22)";
      ctx.shadowBlur = 24;
      ctx.fillRect(x, y, cellWidth, cellHeight);
      ctx.shadowBlur = 0;
      ctx.drawImage(image, x + 18, y + 18, cellWidth - 36, cellHeight - 36);
      ctx.restore();
    });

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 44px Arial";
    ctx.fillText("DPMD Kabupaten Bogor", padding, canvas.height - 54);
    ctx.fillStyle = "rgba(15,23,42,.58)";
    ctx.font = "500 26px Arial";
    ctx.fillText("Photo Booth Modern", padding, canvas.height - 20);
    const data = canvas.toDataURL("image/jpeg", 0.96);
    setFinalImage(data);
    saveResult(data);
    return data;
  };

  const saveResult = async (image) => {
    try {
      await api.post("/photo-booth/save", {
        image,
        layout: mode,
        filter,
        title: "Photo Booth DPMD",
      });
      loadGallery();
    } catch (error) {
      // Backend boleh belum aktif saat fitur ini dilanjutkan nanti.
    }
  };

  const handleCapture = async () => {
    if (!stream || isCapturing) return;
    setIsCapturing(true);
    setFinalImage("");
    const nextShots = [];

    for (let index = 0; index < frameCount; index += 1) {
      await runCountdown();
      const shot = captureFrame();
      if (shot) nextShots.push(shot);
      setShots([...nextShots]);
      await wait(350);
    }

    await composeResult(nextShots);
    setIsCapturing(false);
  };

  const resetSession = () => {
    setShots([]);
    setFinalImage("");
    setCounter(null);
  };

  const downloadResult = () => {
    if (!finalImage) return;
    const link = document.createElement("a");
    link.href = finalImage;
    link.download = `photo-booth-dpmd-${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,.28),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(217,70,239,.26),transparent_30%),linear-gradient(135deg,#020617,#111827_48%,#0f172a)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-4 py-5 lg:px-6">
        <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/10 px-5 py-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-200">DPMD Staff</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Photo Booth Modern</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={resetSession} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20">
              <RefreshCcw className="h-4 w-4" /> Reset
            </button>
            <button onClick={downloadResult} disabled={!finalImage} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40">
              <Download className="h-4 w-4" /> Download JPG
            </button>
          </div>
        </header>

        <main className="grid flex-1 gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
            <video ref={videoRef} autoPlay playsInline muted className="h-full min-h-[420px] w-full scale-x-[-1] object-cover" style={{ filter: selectedFilter.css }} />
            {!stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-center">
                <Camera className="mb-4 h-14 w-14 text-cyan-200" />
                <p className="text-lg font-black">Kamera belum aktif</p>
                <p className="mt-1 text-sm text-white/60">Izinkan akses kamera browser untuk memakai Photo Booth.</p>
              </div>
            )}
            {counter && (
              <div className="absolute inset-0 grid place-items-center bg-slate-950/30">
                <div className="grid h-36 w-36 place-items-center rounded-full border border-white/30 bg-white/20 text-7xl font-black shadow-2xl backdrop-blur-md">
                  {counter}
                </div>
              </div>
            )}
            {flash && <div className="absolute inset-0 animate-ping bg-white" />}
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-white/50">Mode Foto</p>
                <div className="grid grid-cols-2 gap-2">
                  {MODES.map((item) => (
                    <button key={item.id} onClick={() => setMode(item.id)} className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${mode === item.id ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/10 bg-white/10 text-white hover:bg-white/20"}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
                {mode === "custom" && (
                  <input type="number" min="1" max="9" value={customFrames} onChange={(event) => setCustomFrames(event.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none" />
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-white/50">Countdown</p>
                <div className="grid grid-cols-3 gap-2">
                  {COUNTDOWNS.map((value) => (
                    <button key={value} onClick={() => setCountdown(value)} className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${countdown === value ? "border-fuchsia-300 bg-fuchsia-300 text-slate-950" : "border-white/10 bg-white/10 text-white hover:bg-white/20"}`}>
                      {value} detik
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-white/50">Filter</p>
                <div className="grid grid-cols-2 gap-2">
                  {FILTERS.map((item) => (
                    <button key={item.id} onClick={() => setFilter(item.id)} className={`rounded-2xl border px-3 py-2.5 text-left text-xs font-bold transition ${filter === item.id ? "border-white bg-white text-slate-950" : "border-white/10 bg-white/10 text-white hover:bg-white/20"}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleCapture} disabled={!stream || isCapturing} className="flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 px-5 py-4 text-base font-black text-slate-950 shadow-[0_18px_60px_rgba(34,211,238,.24)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50">
                <Camera className="h-5 w-5" />
                {isCapturing ? "Mengambil Foto..." : `Ambil ${frameCount} Foto`}
              </button>
            </div>
          </aside>
        </main>

        <section className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-200" />
              <h2 className="text-lg font-black">Hasil Sesi</h2>
            </div>
            {finalImage ? (
              <img src={finalImage} alt="Hasil photo booth" className="max-h-[520px] w-full rounded-3xl object-contain" />
            ) : (
              <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-white/15 bg-white/5 text-center text-white/50">
                <div>
                  <ImagePlus className="mx-auto mb-3 h-10 w-10" />
                  <p className="font-bold">Hasil foto akan muncul di sini</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
            <h2 className="mb-4 text-lg font-black">Riwayat Terbaru</h2>
            <div className="grid grid-cols-2 gap-3">
              {gallery.slice(0, 6).map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                  <img src={item.url} alt={item.title} className="aspect-[4/3] w-full object-cover" />
                </a>
              ))}
              {gallery.length === 0 && shots.map((shot, index) => (
                <img key={index} src={shot} alt={`Foto ${index + 1}`} className="aspect-[4/3] rounded-2xl object-cover" />
              ))}
            </div>
          </div>
        </section>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
