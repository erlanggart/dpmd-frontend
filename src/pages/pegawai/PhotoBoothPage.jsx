import React from "react";
import {
  Camera,
  Printer,
  RefreshCcw,
  Sparkles,
  Check,
  Trash2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  QrCode,
  Smartphone,
  Plus,
  X,
  ZoomIn,
  ZoomOut,
  Move,
  Maximize2,
  Palette,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import api from "../../api";
import { API_ENDPOINTS } from "../../config/apiConfig";
import { TEMPLATES, getTemplate, composeTemplate, drawImageCover, MAIN_TITLE } from "../../utils/photoBoothTemplates";

const clamp1 = (v) => Math.max(-1, Math.min(1, v));
const DEFAULT_TF = { idx: 0, scale: 1, ox: 0, oy: 0 };

// preset warna latar (solid & gradien) untuk tools modern
const BG_PRESETS = [
  { id: "default", label: "Asli", value: null, swatch: "linear-gradient(135deg,#64748b,#1e293b)" },
  { id: "merah", label: "Merah", value: "#b01e2e", swatch: "#b01e2e" },
  { id: "navy", label: "Navy", value: "#0f2a4a", swatch: "#0f2a4a" },
  { id: "hitam", label: "Hitam", value: "#111111", swatch: "#111111" },
  { id: "putih", label: "Putih", value: "#f4f4f5", swatch: "#f4f4f5" },
  { id: "pink", label: "Pink", value: "#ec4899", swatch: "#ec4899" },
  { id: "ungu", label: "Ungu", value: "#7c3aed", swatch: "#7c3aed" },
  { id: "hijau", label: "Hijau", value: "#0e8a4a", swatch: "#0e8a4a" },
  { id: "emas", label: "Emas", value: [[0, "#fde68a"], [1, "#caa14a"]], swatch: "linear-gradient(135deg,#fde68a,#caa14a)" },
  { id: "senja", label: "Senja", value: [[0, "#f97316"], [0.5, "#db2777"], [1, "#7c3aed"]], swatch: "linear-gradient(135deg,#f97316,#db2777,#7c3aed)" },
  { id: "laut", label: "Laut", value: [[0, "#22d3ee"], [1, "#2563eb"]], swatch: "linear-gradient(135deg,#22d3ee,#2563eb)" },
  { id: "merahputih", label: "Merah-Putih", value: [[0, "#b01e2e"], [0.5, "#b01e2e"], [0.5, "#ffffff"], [1, "#ffffff"]], swatch: "linear-gradient(180deg,#b01e2e 50%,#ffffff 50%)" },
];

const sameBg = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const COUNTDOWNS = [3, 5, 10];

const STEPS = [
  { id: "capture", label: "Foto" },
  { id: "frame", label: "Pilih Bingkai" },
  { id: "arrange", label: "Susun Foto" },
  { id: "result", label: "Cetak & QR" },
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function todayLabel() {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function serverRoot() {
  const base = API_ENDPOINTS.EXPRESS_BASE || "";
  const root = base.replace(/\/api\/?$/, "");
  return root || window.location.origin;
}

/* ---------- thumbnail preview bingkai (pakai foto pool bila ada) --------- */
function TemplateThumb({ template, poolImages, active, onClick }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imgs = Array.from({ length: template.photos }, (_, i) =>
      poolImages.length ? poolImages[i % poolImages.length] : null
    );
    composeTemplate(template, imgs, { caption: MAIN_TITLE, date: template.defaultDate || todayLabel() }, canvas);
  }, [template, poolImages]);

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-2.5 transition ${
        active
          ? "border-cyan-300 bg-cyan-300/15 ring-2 ring-cyan-300"
          : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
      }`}
    >
      {template.id === "bogor-544" && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950">
          ★ TEMA UTAMA
        </span>
      )}
      <div className="flex h-44 w-full items-center justify-center overflow-hidden rounded-xl bg-black/30">
        <canvas ref={canvasRef} className="max-h-44 max-w-full rounded-lg object-contain shadow-lg" />
      </div>
      <div className="text-center">
        <p className="text-sm font-black text-white">
          {template.emoji} {template.name}
        </p>
        <p className="text-[11px] font-semibold text-white/50">{template.photos} foto</p>
      </div>
      {active && (
        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-cyan-300 text-slate-950">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

/* ------ editor 1 slot: geser (drag) + zoom in/out untuk foto terpilih ----- */
function SlotEditor({ img, transform, onChange }) {
  const ref = React.useRef(null);
  const drag = React.useRef(null);
  const W = 300;
  const H = 210;
  const tf = { scale: 1, ox: 0, oy: 0, ...transform };

  React.useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, W, H);
    if (img) drawImageCover(ctx, img, 0, 0, W, H, tf);
    // grid bantu
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 3, 0); ctx.lineTo(W / 3, H);
    ctx.moveTo((2 * W) / 3, 0); ctx.lineTo((2 * W) / 3, H);
    ctx.moveTo(0, H / 3); ctx.lineTo(W, H / 3);
    ctx.moveTo(0, (2 * H) / 3); ctx.lineTo(W, (2 * H) / 3);
    ctx.stroke();
  }, [img, transform]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDown = (e) => {
    if (!img) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: tf.ox, oy: tf.oy };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const dx = (e.clientX - drag.current.x) / W;
    const dy = (e.clientY - drag.current.y) / H;
    onChange({ ox: clamp1(drag.current.ox - dx * 2), oy: clamp1(drag.current.oy - dy * 2) });
  };
  const onUp = (e) => {
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const onWheel = (e) => {
    if (!img) return;
    const next = Math.max(1, Math.min(3, tf.scale + (e.deltaY < 0 ? 0.15 : -0.15)));
    onChange({ scale: Number(next.toFixed(2)) });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
        <Move className="h-4 w-4" /> Atur Posisi & Zoom
      </div>
      <canvas
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onWheel={onWheel}
        className="w-full cursor-grab touch-none rounded-xl active:cursor-grabbing"
        title="Seret untuk geser • scroll untuk zoom"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onChange({ scale: Math.max(1, Number((tf.scale - 0.2).toFixed(2))) })}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
          title="Perkecil"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <input
          type="range"
          min="100"
          max="300"
          value={Math.round(tf.scale * 100)}
          onChange={(e) => onChange({ scale: Number(e.target.value) / 100 })}
          className="flex-1 accent-cyan-300"
        />
        <button
          onClick={() => onChange({ scale: Math.min(3, Number((tf.scale + 0.2).toFixed(2))) })}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
          title="Perbesar"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => onChange({ scale: 1, ox: 0, oy: 0 })}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
          title="Reset"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function PhotoBoothPage() {
  const navigate = useNavigate();
  const videoRef = React.useRef(null);
  const captureCanvasRef = React.useRef(null);
  const composeCanvasRef = React.useRef(null);

  const [step, setStep] = React.useState("capture");
  const [stream, setStream] = React.useState(null);
  const [cameraError, setCameraError] = React.useState("");

  const [countdown, setCountdown] = React.useState(3);
  const [caption, setCaption] = React.useState("");
  const [dateText, setDateText] = React.useState(TEMPLATES[0].defaultDate || todayLabel());
  const [bg, setBg] = React.useState(null); // override warna latar (string | stops[] | null)

  const [pool, setPool] = React.useState([]);
  const [poolImages, setPoolImages] = React.useState([]);
  const [templateId, setTemplateId] = React.useState(TEMPLATES[0].id);
  const [assignment, setAssignment] = React.useState([]);
  const [activeSlot, setActiveSlot] = React.useState(0);

  const [counter, setCounter] = React.useState(null);
  const [flash, setFlash] = React.useState(false);
  const [isCapturing, setIsCapturing] = React.useState(false);

  const [finalImage, setFinalImage] = React.useState("");
  const [arrangePreview, setArrangePreview] = React.useState("");
  const [qrUrl, setQrUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  const template = getTemplate(templateId);

  /* ------------------------------ kamera --------------------------------- */
  React.useEffect(() => {
    let activeStream;
    const startCamera = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        setStream(activeStream);
        setCameraError("");
        if (videoRef.current) videoRef.current.srcObject = activeStream;
      } catch (error) {
        console.error("Camera error:", error);
        setCameraError("Tidak bisa mengakses kamera. Izinkan akses kamera lalu muat ulang halaman.");
      }
    };
    startCamera();
    return () => activeStream?.getTracks().forEach((t) => t.stop());
  }, []);

  React.useEffect(() => {
    if (step === "capture" && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [step, stream]);

  React.useEffect(() => {
    let alive = true;
    Promise.all(pool.map((src) => loadImage(src))).then((imgs) => {
      if (alive) setPoolImages(imgs);
    });
    return () => {
      alive = false;
    };
  }, [pool]);

  /* ------------------------------ utilitas ------------------------------- */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const playShutter = () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const audio = new Ctx();
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

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return null;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();
    playShutter();
    setFlash(true);
    setTimeout(() => setFlash(false), 160);
    return canvas.toDataURL("image/jpeg", 0.95);
  };

  const runCountdown = async () => {
    for (let v = countdown; v > 0; v -= 1) {
      setCounter(v);
      await wait(900);
    }
    setCounter(null);
  };

  /* --------------------------- STEP 1: FOTO ------------------------------ */
  const takePhoto = async () => {
    if (!stream || isCapturing) return;
    setIsCapturing(true);
    await runCountdown();
    const shot = captureFrame();
    if (shot) setPool((prev) => [...prev, shot]);
    await wait(300);
    setIsCapturing(false);
  };

  const removePhoto = (index) => setPool((prev) => prev.filter((_, i) => i !== index));

  /* --------------------- STEP 2/3: bingkai & susun ----------------------- */
  const autoAssign = (tpl, count) =>
    Array.from({ length: tpl.photos }, (_, i) => ({
      ...DEFAULT_TF,
      idx: count === 0 ? 0 : i % count,
    }));

  const applyTemplateDate = (tpl) => {
    if (tpl.defaultDate) setDateText(tpl.defaultDate);
  };

  const chooseTemplate = (id) => {
    const tpl = getTemplate(id);
    setTemplateId(id);
    setAssignment(autoAssign(tpl, pool.length));
    setActiveSlot(0);
    applyTemplateDate(tpl);
    setBg(null); // kembali ke warna latar asli bingkai
  };

  const goToFrame = () => {
    setAssignment(autoAssign(template, pool.length));
    setStep("frame");
  };

  // ganti foto pada sebuah slot (reset zoom/posisi)
  const placeInSlot = (poolIdx, slot, advance = true) => {
    setAssignment((prev) => {
      const next = [...prev];
      next[slot] = { ...DEFAULT_TF, idx: poolIdx };
      return next;
    });
    if (advance) setActiveSlot((s) => (s + 1) % template.photos);
  };

  // ubah zoom/posisi slot aktif
  const updateSlotTransform = (patch) => {
    setAssignment((prev) =>
      prev.map((a, i) => (i === activeSlot ? { ...DEFAULT_TF, ...a, ...patch } : a))
    );
  };

  // drag & drop
  const onDragStartPhoto = (e, idx) => {
    e.dataTransfer.setData("text/plain", String(idx));
    e.dataTransfer.effectAllowed = "copy";
  };
  const onDropSlot = (e, slot) => {
    e.preventDefault();
    const idx = Number(e.dataTransfer.getData("text/plain"));
    if (!Number.isNaN(idx) && pool[idx]) placeInSlot(idx, slot, false);
  };

  const buildSlotImages = () => assignment.map((a) => poolImages[a.idx] || poolImages[0] || null);
  const buildTransforms = () => assignment.map((a) => ({ scale: a.scale, ox: a.ox, oy: a.oy }));

  React.useEffect(() => {
    if (step !== "arrange" || poolImages.length === 0) return;
    const data = composeTemplate(
      template,
      buildSlotImages(),
      { caption: caption.trim() || MAIN_TITLE, date: dateText, transforms: buildTransforms(), bg },
      composeCanvasRef.current
    );
    setArrangePreview(data);
  }, [step, assignment, poolImages, templateId, caption, dateText, bg]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------------------- STEP 4: compose + simpan + QR -------------------- */
  const finalizeAndSave = async () => {
    setSaving(true);
    setSaveError("");
    setQrUrl("");
    try {
      const imgs = await Promise.all(assignment.map((a) => loadImage(pool[a.idx] || pool[0])));
      const data = composeTemplate(
        template,
        imgs,
        { caption: caption.trim() || MAIN_TITLE, date: dateText, transforms: buildTransforms(), bg },
        composeCanvasRef.current
      );
      setFinalImage(data);
      setStep("result");

      const res = await api.post("/photo-booth/save", {
        image: data,
        layout: template.id,
        filter: "none",
        title: caption.trim() || MAIN_TITLE,
      });
      const url = res?.data?.data?.url;
      if (url) {
        const absolute = `${serverRoot()}${url}`;
        const qr = await QRCode.toDataURL(absolute, { width: 360, margin: 1 });
        setQrUrl(qr);
      } else {
        setSaveError("Foto tersimpan, namun QR tidak tersedia. Silakan gunakan tombol Cetak.");
      }
    } catch (e) {
      console.error(e);
      setSaveError("Gagal menyimpan ke server. Anda tetap bisa mencetak fotonya.");
      setStep("result");
    } finally {
      setSaving(false);
    }
  };

  const printResult = () => {
    if (!finalImage) return;
    const win = window.open("", "_blank", "width=720,height=960");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Cetak Photo Booth DPMD</title>
      <style>@page{margin:8mm;}html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;}img{max-width:100%;max-height:100vh;object-fit:contain;}</style>
      </head><body><img src="${finalImage}" onload="setTimeout(function(){window.focus();window.print();},250)" /></body></html>`);
    win.document.close();
  };

  const restart = () => {
    setPool([]);
    setPoolImages([]);
    setAssignment([]);
    setFinalImage("");
    setArrangePreview("");
    setQrUrl("");
    setSaveError("");
    setActiveSlot(0);
    setBg(null);
    setStep("capture");
  };

  /* -------------------------------- UI ----------------------------------- */
  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(56,189,248,.25),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(217,70,239,.24),transparent_32%),linear-gradient(135deg,#020617,#0b1220_48%,#0f172a)]" />

      {/* kontrol melayang (pengganti header) */}
      <div className="fixed right-4 top-4 z-40 flex gap-2">
        {step !== "capture" && (
          <button
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-4 py-2 text-sm font-bold backdrop-blur transition hover:bg-white/20"
            title="Mulai ulang"
          >
            <RefreshCcw className="h-4 w-4" /> Ulang
          </button>
        )}
        <button
          onClick={() => navigate("/dpmd/dashboard")}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-slate-900/70 backdrop-blur transition hover:bg-rose-500/40"
          title="Keluar Photo Booth"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-3 py-5 sm:px-5">
        {/* ============================ STEP 1 ============================ */}
        {step === "capture" && (
          <main className="grid flex-1 gap-5 lg:grid-cols-[1.4fr_.6fr]">
            <section className="relative flex min-h-[520px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl">
              <div className="relative flex-1">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full min-h-[520px] w-full -scale-x-100 object-cover"
                />
                {!stream && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 px-6 text-center">
                    <Camera className="mb-4 h-14 w-14 text-cyan-200" />
                    <p className="text-lg font-black">Kamera belum aktif</p>
                    <p className="mt-1 text-sm text-white/60">{cameraError || "Menyalakan kamera..."}</p>
                  </div>
                )}
                {counter && (
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/30">
                    <div className="grid h-40 w-40 animate-pulse place-items-center rounded-full border border-white/30 bg-white/20 text-8xl font-black shadow-2xl backdrop-blur-md">
                      {counter}
                    </div>
                  </div>
                )}
                {flash && <div className="absolute inset-0 bg-white opacity-80" />}
              </div>

              <button
                onClick={takePhoto}
                disabled={!stream || isCapturing}
                className="m-3 flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 px-5 py-4 text-lg font-black text-slate-950 shadow-[0_18px_60px_rgba(34,211,238,.24)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Mengambil...
                  </>
                ) : (
                  <>
                    <Camera className="h-6 w-6" /> Ambil Foto
                  </>
                )}
              </button>
            </section>

            <aside className="flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-white/50">Hitung Mundur</p>
                <div className="grid grid-cols-3 gap-2">
                  {COUNTDOWNS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setCountdown(v)}
                      className={`rounded-2xl border px-3 py-2.5 text-sm font-bold transition ${
                        countdown === v
                          ? "border-fuchsia-300 bg-fuchsia-300 text-slate-950"
                          : "border-white/10 bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      {v} dtk
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-white/50">
                  Foto Diambil ({pool.length})
                </p>
                {pool.length === 0 ? (
                  <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-3 text-center text-sm text-white/45">
                    Ambil beberapa foto, lalu pilih bingkainya
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {pool.map((src, i) => (
                      <div key={i} className="group relative overflow-hidden rounded-xl border border-white/10">
                        <img src={src} alt={`Foto ${i + 1}`} className="aspect-square w-full object-cover" />
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-rose-500/90 text-white opacity-0 transition group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={goToFrame}
                disabled={pool.length === 0}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Lanjut: Pilih Bingkai <ArrowRight className="h-4 w-4" />
              </button>
            </aside>
          </main>
        )}

        {/* ============================ STEP 2 ============================ */}
        {step === "frame" && (
          <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-200" />
              <h2 className="text-lg font-black">Pilih Bingkai</h2>
              <span className="ml-auto text-sm text-white/55">{pool.length} foto siap dipakai</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {TEMPLATES.map((t) => (
                <TemplateThumb
                  key={t.id}
                  template={t}
                  poolImages={poolImages}
                  active={t.id === templateId}
                  onClick={() => chooseTemplate(t.id)}
                />
              ))}
            </div>
            <div className="mt-5 flex justify-between">
              <button
                onClick={() => setStep("capture")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold transition hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" /> Kembali Foto
              </button>
              <button
                onClick={() => {
                  setAssignment(autoAssign(template, pool.length));
                  setActiveSlot(0);
                  setStep("arrange");
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:scale-[1.01]"
              >
                Lanjut: Susun Foto <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* ============================ STEP 3 ============================ */}
        {step === "arrange" && (
          <main className="grid flex-1 gap-5 lg:grid-cols-[1fr_.8fr]">
            <section className="flex items-center justify-center rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              {arrangePreview ? (
                <img src={arrangePreview} alt="Preview bingkai" className="max-h-[680px] w-auto rounded-2xl object-contain shadow-2xl" />
              ) : (
                <Loader2 className="h-10 w-10 animate-spin text-white/50" />
              )}
            </section>

            <aside className="space-y-5 rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-white/50">Masukkan Foto ke Bingkai</p>
                <p className="mb-3 text-sm text-white/55">
                  <strong className="text-cyan-200">Seret</strong> foto ke kotak slot, atau ketuk slot lalu ketuk foto.
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {assignment.map((a, slot) => (
                    <button
                      key={slot}
                      onClick={() => setActiveSlot(slot)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDropSlot(e, slot)}
                      className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition ${
                        activeSlot === slot ? "border-cyan-300 ring-2 ring-cyan-300" : "border-white/15"
                      }`}
                    >
                      {pool[a.idx] ? (
                        <img src={pool[a.idx]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center bg-white/10 text-white/40">
                          <Plus className="h-5 w-5" />
                        </span>
                      )}
                      <span className="absolute bottom-0 right-0 bg-black/60 px-1 text-[10px] font-bold">
                        {slot + 1}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-white/50">Foto Tersedia</p>
                <div className="grid grid-cols-4 gap-2">
                  {pool.map((src, i) => (
                    <button
                      key={i}
                      draggable
                      onDragStart={(e) => onDragStartPhoto(e, i)}
                      onClick={() => placeInSlot(i, activeSlot)}
                      className="cursor-grab overflow-hidden rounded-lg border border-white/10 transition hover:ring-2 hover:ring-cyan-300 active:cursor-grabbing"
                    >
                      <img src={src} alt={`Foto ${i + 1}`} className="pointer-events-none aspect-square w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* editor zoom & posisi foto slot terpilih */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-white/50">
                  Slot {activeSlot + 1} — Atur Foto
                </p>
                <SlotEditor
                  img={poolImages[assignment[activeSlot]?.idx] || null}
                  transform={assignment[activeSlot]}
                  onChange={updateSlotTransform}
                />
              </div>

              {/* tool warna latar */}
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-white/50">
                  <Palette className="h-4 w-4" /> Warna Latar
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {BG_PRESETS.map((p) => {
                    const active = sameBg(bg, p.value);
                    return (
                      <button
                        key={p.id}
                        onClick={() => setBg(p.value)}
                        title={p.label}
                        style={{ background: p.swatch }}
                        className={`relative h-9 w-9 rounded-full border transition ${
                          active ? "border-white ring-2 ring-cyan-300" : "border-white/20 hover:border-white/50"
                        }`}
                      >
                        {p.value === null && (
                          <span className="absolute inset-0 grid place-items-center text-[9px] font-black text-white">
                            ASLI
                          </span>
                        )}
                        {active && p.value !== null && (
                          <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" strokeWidth={3} />
                        )}
                      </button>
                    );
                  })}
                  {/* color picker bebas */}
                  <label
                    className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-dashed border-white/40 transition hover:border-white/70"
                    title="Warna kustom"
                    style={typeof bg === "string" ? { background: bg } : undefined}
                  >
                    <Plus className="h-4 w-4 text-white/80" />
                    <input
                      type="color"
                      value={typeof bg === "string" ? bg : "#b01e2e"}
                      onChange={(e) => setBg(e.target.value)}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-white/50">
                    Judul <span className="font-medium normal-case tracking-normal text-white/40">(bisa diubah)</span>
                  </p>
                  <input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={MAIN_TITLE}
                    maxLength={40}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold outline-none placeholder:text-white/40 focus:border-cyan-300"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-white/50">Tanggal</p>
                  <input
                    value={dateText}
                    onChange={(e) => setDateText(e.target.value)}
                    maxLength={30}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold outline-none placeholder:text-white/40 focus:border-cyan-300"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-2">
                <button
                  onClick={() => setStep("frame")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold transition hover:bg-white/20"
                >
                  <ArrowLeft className="h-4 w-4" /> Bingkai
                </button>
                <button
                  onClick={finalizeAndSave}
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 to-fuchsia-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:scale-[1.01] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Selesai &amp; Buat QR
                </button>
              </div>
            </aside>
          </main>
        )}

        {/* ============================ STEP 4 ============================ */}
        {step === "result" && (
          <main className="grid flex-1 gap-5 lg:grid-cols-[1fr_.9fr]">
            <section className="flex items-center justify-center rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              {finalImage ? (
                <img src={finalImage} alt="Hasil photo booth" className="max-h-[680px] w-auto rounded-2xl object-contain shadow-2xl" />
              ) : (
                <Loader2 className="h-10 w-10 animate-spin text-white/50" />
              )}
            </section>

            <aside className="flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <div className="text-center">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-300/15 px-4 py-1.5 text-sm font-black text-cyan-200">
                  <Smartphone className="h-4 w-4" /> Scan untuk Download di HP
                </div>
                <div className="mx-auto mt-3 grid h-72 w-72 place-items-center rounded-3xl bg-white p-4 shadow-2xl">
                  {saving ? (
                    <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
                  ) : qrUrl ? (
                    <img src={qrUrl} alt="QR Code download foto" className="h-full w-full object-contain" />
                  ) : (
                    <div className="px-4 text-center text-sm font-semibold text-slate-500">
                      <QrCode className="mx-auto mb-2 h-10 w-10" />
                      QR tidak tersedia
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs font-semibold text-white/55">
                  Arahkan kamera HP ke QR untuk menyimpan fotonya, atau gunakan tombol Cetak.
                </p>
                {saveError && <p className="mt-2 text-xs font-semibold text-amber-300">{saveError}</p>}
              </div>

              <button
                onClick={printResult}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3.5 text-sm font-black text-slate-950 transition hover:scale-[1.02]"
              >
                <Printer className="h-4 w-4" /> Cetak
              </button>

              <button
                onClick={restart}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm font-black transition hover:bg-white/20"
              >
                <RefreshCcw className="h-4 w-4" /> Buat Foto Baru
              </button>
            </aside>
          </main>
        )}
      </div>

      <canvas ref={captureCanvasRef} className="hidden" />
      <canvas ref={composeCanvasRef} className="hidden" />
    </div>
  );
}
