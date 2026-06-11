/**
 * Virtual Background Processor
 * ----------------------------
 * Mengganti / mem-blur latar belakang video kamera secara real-time di sisi
 * browser memakai MediaPipe Selfie Segmentation. Tidak membebani server: hasil
 * diproses di canvas lalu di-`captureStream` menjadi MediaStreamTrack baru yang
 * dapat dipakai untuk preview lokal & `replaceTrack` pada producer mediasoup.
 *
 * Pemakaian:
 *   const proc = new VirtualBackgroundProcessor();
 *   await proc.start(rawCameraTrack, { type: 'image', image: HTMLImageElement });
 *   const outTrack = proc.getOutputTrack();   // pasang ke <video>/producer
 *   proc.setEffect({ type: 'blur' });          // ganti efek tanpa restart
 *   await proc.setInputTrack(newCameraTrack);  // saat ganti kamera
 *   proc.stop();                               // bersih-bersih
 */

// Muat library secara lazy agar bundle awal tidak membengkak; WASM/model diambil
// dari CDN jsDelivr (butuh internet di sisi klien — sama seperti hls.js dll).
// PENTING: versi CDN HARUS sama dengan paket npm yang terpasang. Bila tidak cocok,
// model bisa mengembalikan mask kosong → orang tidak terdeteksi → "full background".
const MP_VERSION = '0.1.1675465747';
const MP_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${MP_VERSION}`;

export class VirtualBackgroundProcessor {
  constructor() {
    this.segmenter = null;
    this.video = null;          // <video> tersembunyi sumber frame mentah
    this.canvas = null;         // canvas keluaran
    this.ctx = null;
    this.fgCanvas = null;       // canvas offscreen untuk siluet orang
    this.fgCtx = null;
    this.inputStream = null;    // MediaStream pembungkus track kamera mentah
    this.outputStream = null;   // hasil canvas.captureStream()
    this.effect = { type: 'none', image: null, blurAmount: 12 };
    this.running = false;
    this._rafId = null;
    this._loopBusy = false;
  }

  /** Apakah browser mendukung pipeline ini (canvas.captureStream). */
  static isSupported() {
    return typeof document !== 'undefined' &&
      typeof HTMLCanvasElement !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }

  async _ensureSegmenter() {
    if (this.segmenter) return;
    const mod = await import('@mediapipe/selfie_segmentation');
    // Paket ini UMD: tergantung bundler, kelasnya bisa di named export, default,
    // atau menempel ke global (window) sebagai efek samping import.
    const SelfieSegmentation =
      mod.SelfieSegmentation ||
      mod.default?.SelfieSegmentation ||
      (typeof mod.default === 'function' ? mod.default : null) ||
      globalThis.SelfieSegmentation;
    if (typeof SelfieSegmentation !== 'function') {
      throw new Error('Gagal memuat modul segmentasi latar');
    }
    this.segmenter = new SelfieSegmentation({ locateFile: (f) => `${MP_CDN}/${f}` });
    this.segmenter.setOptions({ modelSelection: 1, selfieMode: false });
    this.segmenter.onResults((r) => this._draw(r));
    await this.segmenter.initialize?.();
  }

  /**
   * Mulai pemrosesan.
   * @param {MediaStreamTrack} inputTrack track kamera mentah
   * @param {{type:'none'|'blur'|'image', image?:HTMLImageElement, blurAmount?:number}} effect
   * @returns {Promise<MediaStreamTrack>} track keluaran (sudah diproses)
   */
  async start(inputTrack, effect) {
    if (!VirtualBackgroundProcessor.isSupported()) {
      throw new Error('Browser tidak mendukung virtual background');
    }
    if (effect) this.effect = { ...this.effect, ...effect };

    await this._ensureSegmenter();

    // Elemen video tersembunyi untuk memutar track kamera mentah.
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    // Canvas offscreen untuk menyusun siluet orang (foreground) terpisah dari latar.
    this.fgCanvas = document.createElement('canvas');
    this.fgCtx = this.fgCanvas.getContext('2d');

    await this.setInputTrack(inputTrack);

    this.outputStream = this.canvas.captureStream(30);
    this.running = true;
    this._loop();

    return this.getOutputTrack();
  }

  /** Ganti track kamera sumber (mis. saat user memilih kamera lain). */
  async setInputTrack(inputTrack) {
    if (!inputTrack) return;
    const settings = inputTrack.getSettings?.() || {};
    this.canvas.width = settings.width || 640;
    this.canvas.height = settings.height || 480;
    if (this.fgCanvas) { this.fgCanvas.width = this.canvas.width; this.fgCanvas.height = this.canvas.height; }

    this.inputStream = new MediaStream([inputTrack]);
    this.video.srcObject = this.inputStream;
    try { await this.video.play(); } catch { /* gesture handled di tempat lain */ }
  }

  /** Ubah efek latar tanpa menghentikan pipeline. */
  setEffect(effect) {
    this.effect = { ...this.effect, ...effect };
  }

  getOutputTrack() {
    return this.outputStream ? this.outputStream.getVideoTracks()[0] : null;
  }

  async _loop() {
    if (!this.running) return;
    if (!this._loopBusy && this.video && this.video.readyState >= 2) {
      this._loopBusy = true;
      try {
        await this.segmenter.send({ image: this.video });
      } catch { /* lewati frame jika gagal */ }
      this._loopBusy = false;
    }
    this._rafId = requestAnimationFrame(() => this._loop());
  }

  /**
   * Komposit hasil segmentasi. Strategi: GAMBAR LATAR DULU memenuhi kanvas, lalu
   * tempelkan SILUET ORANG (foreground) di atasnya. Dengan begitu orang selalu jadi
   * subjek utama (seperti Zoom) — bukan latar yang menutupi orang.
   */
  _draw(results) {
    const ctx = this.ctx;
    const fg = this.fgCtx;
    const { width: w, height: h } = this.canvas;
    if (!ctx || !fg || !w || !h) return;

    // 1) Lapisan LATAR (penuh kanvas).
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    if (this.effect.type === 'image' && this.effect.image) {
      this._drawCover(ctx, this.effect.image, w, h);
    } else if (this.effect.type === 'blur') {
      ctx.filter = `blur(${this.effect.blurAmount || 12}px)`;
      ctx.drawImage(results.image, 0, 0, w, h);
      ctx.filter = 'none';
    } else {
      ctx.drawImage(results.image, 0, 0, w, h);
    }
    ctx.restore();

    // 2) Lapisan ORANG di kanvas offscreen: mask → ambil piksel orang dari frame.
    fg.save();
    fg.globalCompositeOperation = 'source-over';
    fg.clearRect(0, 0, w, h);
    fg.drawImage(results.segmentationMask, 0, 0, w, h);
    fg.globalCompositeOperation = 'source-in';
    fg.drawImage(results.image, 0, 0, w, h);
    fg.restore();

    // 3) Tempel siluet orang di atas latar.
    ctx.drawImage(this.fgCanvas, 0, 0, w, h);
  }

  /** Gambar gambar latar dengan mode "cover" (penuhi canvas, jaga rasio). */
  _drawCover(ctx, img, w, h) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  stop() {
    this.running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    try { this.outputStream?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { this.video?.pause(); } catch { /* noop */ }
    if (this.video) this.video.srcObject = null;
    try { this.segmenter?.close?.(); } catch { /* noop */ }
    this.segmenter = null;
    this.outputStream = null;
    this.inputStream = null;
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.fgCanvas = null;
    this.fgCtx = null;
  }
}

/** Muat File (dari input device) menjadi HTMLImageElement siap pakai. */
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
