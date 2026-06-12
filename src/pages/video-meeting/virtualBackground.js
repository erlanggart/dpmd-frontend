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
    this.inputTrack = null;     // clone track khusus untuk processor
    this.outputStream = null;   // hasil canvas.captureStream()
    this.effect = { type: 'none', image: null, blurAmount: 12 };
    this.running = false;
    this._rafId = null;
    this._loopBusy = false;
    this._maskUsable = true;     // pengaman: bila mask kosong → tampilkan kamera apa adanya
    this._lastMask = null;       // mask segmentasi terbaru (di-cache dari onResults)
    this._personIsOpaque = true; // normal MediaPipe: orang putih/opaque, latar transparan
    this._frame = 0;
    this._sampleCanvas = null;
    this._sampleCtx = null;
    this._firstFrameReady = false;
    this._readyResolvers = [];
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
    // Cukup simpan mask terbaru; penggambaran dilakukan tiap frame di _loop agar
    // kamera selalu tampil (tidak hitam) walau segmentasi telat/gagal.
    this.segmenter.onResults((r) => {
      this._lastMask = r.segmentationMask || null;
      this._composite();
    });
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
    // WAJIB menempel di DOM (disembunyikan) agar browser benar-benar memutarnya &
    // menghasilkan frame untuk canvas. Video lepas-DOM kadang tidak naik readyState
    // → canvas tak pernah digambar → keluaran HITAM.
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('muted', '');
    this.video.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
    document.body.appendChild(this.video);

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    // Canvas offscreen untuk menyusun siluet orang (foreground) terpisah dari latar.
    this.fgCanvas = document.createElement('canvas');
    this.fgCtx = this.fgCanvas.getContext('2d');

    await this.setInputTrack(inputTrack);

    await this._waitForVideoFrame();
    this._composite();
    this._firstFrameReady = true;

    this.outputStream = this.canvas.captureStream(30);
    this.running = true;
    this._loop();
    await this.waitUntilReady();

    return this.getOutputTrack();
  }

  /** Ganti track kamera sumber (mis. saat user memilih kamera lain). */
  async setInputTrack(inputTrack) {
    if (!inputTrack) return;
    try { this.inputTrack?.stop(); } catch { /* noop */ }
    this.inputTrack = typeof inputTrack.clone === 'function' ? inputTrack.clone() : inputTrack;
    this.inputTrack.enabled = true;
    const settings = this.inputTrack.getSettings?.() || inputTrack.getSettings?.() || {};
    const setSize = (wd, ht) => {
      this.canvas.width = wd; this.canvas.height = ht;
      if (this.fgCanvas) { this.fgCanvas.width = wd; this.fgCanvas.height = ht; }
    };
    setSize(settings.width || 640, settings.height || 480);

    this.inputStream = new MediaStream([this.inputTrack]);
    this.video.srcObject = this.inputStream;
    try { await this.video.play(); } catch { /* gesture handled di tempat lain */ }
    // Tunggu metadata agar dimensi & frame tersedia (cegah canvas hitam di awal).
    await new Promise((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      if (this.video.readyState >= 2) finish();
      this.video.onloadedmetadata = finish;
      this.video.onloadeddata = finish;
      this.video.oncanplay = finish;
      setTimeout(finish, 1500); // jangan menggantung bila event tak datang
    });
    if (this.video.videoWidth && this.video.videoHeight) {
      setSize(this.video.videoWidth, this.video.videoHeight);
    }
    await this._waitForVideoFrame();
    this._resizeToVideo();
    this._firstFrameReady = false;
  }

  /** Ubah efek latar tanpa menghentikan pipeline. */
  setEffect(effect) {
    this.effect = { ...this.effect, ...effect };
  }

  getOutputTrack() {
    return this.outputStream ? this.outputStream.getVideoTracks()[0] : null;
  }

  waitUntilReady(timeout = 1800) {
    if (this._hasDrawableOutput()) return Promise.resolve(true);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._readyResolvers = this._readyResolvers.filter((fn) => fn !== done);
        resolve(this._hasDrawableOutput());
      }, timeout);
      const done = () => {
        clearTimeout(timer);
        resolve(true);
      };
      this._readyResolvers.push(done);
    });
  }

  _loop() {
    if (!this.running) return;
    const v = this.video;
    if (v && v.readyState >= 2) {
      // 1) Selalu gambar frame kamera LIVE tiap frame (anti-hitam, mulus).
      this._resizeToVideo();
      this._composite();
      this._firstFrameReady = true;
      // 2) Perbarui mask di latar (throttle: hanya kirim bila tak sedang proses).
      if (!this._loopBusy && this.segmenter) {
        this._loopBusy = true;
        Promise.resolve(this.segmenter.send({ image: v }))
          .catch(() => {})
          .finally(() => { this._loopBusy = false; });
      }
    }
    this._rafId = requestAnimationFrame(() => this._loop());
  }

  /**
   * Gambar 1 frame keluaran. Dipanggil TIAP frame dari _loop memakai video LIVE +
   * mask terbaru (`_lastMask`). Strategi: gambar LATAR dulu, lalu tempel SILUET ORANG
   * di atasnya. Bila mask belum ada / tak layak / efek none → gambar kamera apa adanya
   * (kamera tidak pernah hitam).
   */
  _composite() {
    const ctx = this.ctx;
    const fg = this.fgCtx;
    const v = this.video;
    const src = v;
    const { width: w, height: h } = this.canvas;
    if (!ctx || !fg || !v || !src || !w || !h) return;

    const mask = this._lastMask;
    if (mask) this._detectMaskUsability(mask);

    const imageEffectReady = this.effect.type !== 'image' || this._isImageReady(this.effect.image);

    // Tanpa efek → kamera apa adanya.
    if (this.effect.type === 'none') {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(src, 0, 0, w, h);
      ctx.restore();
      this._notifyReadyIfDrawable();
      return;
    }

    // 1) Lapisan LATAR (penuh kanvas). Untuk efek gambar, tampilkan background
    // langsung walau mask belum siap supaya tile tidak pernah blank hitam.
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    if (this.effect.type === 'image' && imageEffectReady) {
      this._drawCover(ctx, this.effect.image, w, h);
    } else if (this.effect.type === 'blur') {
      ctx.filter = `blur(${this.effect.blurAmount || 12}px)`;
      ctx.drawImage(src, 0, 0, w, h);
      ctx.filter = 'none';
    } else {
      ctx.drawImage(src, 0, 0, w, h);
    }
    ctx.restore();

    if (!mask || !this._maskUsable) {
      ctx.drawImage(src, 0, 0, w, h);
      this._notifyReadyIfDrawable();
      return;
    }

    // 2) Lapisan ORANG di kanvas offscreen: mask → ambil piksel orang dari frame live.
    fg.save();
    fg.globalCompositeOperation = 'source-over';
    fg.clearRect(0, 0, w, h);
    fg.drawImage(mask, 0, 0, w, h);
    fg.globalCompositeOperation = this._personIsOpaque ? 'source-in' : 'source-out';
    fg.drawImage(src, 0, 0, w, h);
    fg.restore();

    // 3) Tempel siluet orang di atas latar.
    ctx.drawImage(this.fgCanvas, 0, 0, w, h);
    this._notifyReadyIfDrawable();
  }

  _resizeToVideo() {
    if (!this.video || !this.canvas) return;
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    if (!vw || !vh) return;
    if (this.canvas.width === vw && this.canvas.height === vh) return;
    this.canvas.width = vw;
    this.canvas.height = vh;
    if (this.fgCanvas) {
      this.fgCanvas.width = vw;
      this.fgCanvas.height = vh;
    }
  }

  _hasDrawableOutput() {
    const c = this.canvas;
    const ctx = this.ctx;
    if (!c || !ctx || !c.width || !c.height) return false;
    try {
      const points = [
        [Math.floor(c.width * 0.5), Math.floor(c.height * 0.5)],
        [Math.floor(c.width * 0.25), Math.floor(c.height * 0.25)],
        [Math.floor(c.width * 0.75), Math.floor(c.height * 0.75)],
      ];
      return points.some(([x, y]) => {
        const p = ctx.getImageData(x, y, 1, 1).data;
        return p[3] > 0 && (p[0] > 4 || p[1] > 4 || p[2] > 4);
      });
    } catch {
      return true;
    }
  }

  _notifyReadyIfDrawable() {
    if (!this._readyResolvers.length || !this._hasDrawableOutput()) return;
    const resolvers = this._readyResolvers.splice(0);
    resolvers.forEach((resolve) => resolve());
  }

  /**
   * Tentukan orientasi & kelayakan mask. Disampel hemat pada kanvas 64×64.
   * - Orientasi: bandingkan alpha area TENGAH (biasanya orang) vs titik-titik TEPI
   *   atas/kiri/kanan (biasanya latar). Lebih andal untuk close-up dibanding sudut.
   * - Kelayakan: hitung porsi area "orang" yang dipilih; bila ~0 (mask kosong) →
   *   tandai tak layak agar dipakai pengaman tampilkan kamera apa adanya.
   */
  _detectMaskUsability(mask) {
    this._frame = (this._frame || 0) + 1;
    // Sering di awal (lock cepat), lalu cek berkala.
    if (this._frame > 5 && this._frame % 12 !== 1) return;
    try {
      const N = 64;
      if (!this._sampleCanvas) {
        this._sampleCanvas = document.createElement('canvas');
        this._sampleCanvas.width = N; this._sampleCanvas.height = N;
        this._sampleCtx = this._sampleCanvas.getContext('2d', { willReadFrequently: true });
      }
      const s = this._sampleCtx;
      s.clearRect(0, 0, N, N);
      s.drawImage(mask, 0, 0, N, N);
      const d = s.getImageData(0, 0, N, N).data;

      const alphaAt = (x, y) => d[((y * N + x) * 4) + 3];
      const avgBlock = (cx, cy, radius = 5) => {
        let sum = 0;
        let count = 0;
        for (let y = Math.max(0, cy - radius); y <= Math.min(N - 1, cy + radius); y++) {
          for (let x = Math.max(0, cx - radius); x <= Math.min(N - 1, cx + radius); x++) {
            sum += alphaAt(x, y);
            count++;
          }
        }
        return count ? sum / count : 0;
      };

      // Tengah biasanya orang, sedangkan sisi atas/kiri/kanan biasanya latar.
      const center = avgBlock(Math.floor(N / 2), Math.floor(N / 2), 8);
      const edgeSamples = [
        avgBlock(Math.floor(N / 2), 3, 3),
        avgBlock(3, Math.floor(N / 2), 3),
        avgBlock(N - 4, Math.floor(N / 2), 3),
      ];
      const edge = edgeSamples.reduce((a, b) => a + b, 0) / edgeSamples.length;
      if (Math.abs(center - edge) > 12) {
        this._personIsOpaque = center >= edge;
      }

      // Porsi piksel opaque (alpha>128) → tentukan kelayakan area orang.
      let opaque = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 128) opaque++;
      const opaqueFrac = opaque / (N * N);
      const personFrac = this._personIsOpaque ? opaqueFrac : (1 - opaqueFrac);
      // Layak bila ada area orang yang masuk akal dan mask tidak memenuhi layar.
      this._maskUsable = personFrac > 0.01 && personFrac < 0.98;
    } catch { /* abaikan → anggap layak agar tidak mematikan efek tanpa alasan */ this._maskUsable = true; }
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

  _isImageReady(img) {
    if (!img) return false;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    return iw > 0 && ih > 0 && (img.complete === undefined || img.complete);
  }

  _waitForVideoFrame(timeout = 1500) {
    const v = this.video;
    if (!v) return Promise.resolve();
    if (v.readyState >= 2 && v.videoWidth && v.videoHeight) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      let timer = null;
      const finish = () => {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        resolve();
      };

      if (typeof v.requestVideoFrameCallback === 'function') {
        try {
          v.requestVideoFrameCallback(() => finish());
        } catch {
          // Fall back to media events below.
        }
      }
      v.addEventListener('loadeddata', finish, { once: true });
      v.addEventListener('canplay', finish, { once: true });
      timer = setTimeout(finish, timeout);
    });
  }

  stop() {
    this.running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    try { this.outputStream?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { this.inputTrack?.stop(); } catch { /* noop */ }
    try { this.video?.pause(); } catch { /* noop */ }
    if (this.video) { this.video.srcObject = null; try { this.video.remove(); } catch { /* noop */ } }
    try { this.segmenter?.close?.(); } catch { /* noop */ }
    this.segmenter = null;
    this.outputStream = null;
    this.inputStream = null;
    this.inputTrack = null;
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.fgCanvas = null;
    this.fgCtx = null;
    this._sampleCanvas = null;
    this._sampleCtx = null;
    this._lastMask = null;
    this._firstFrameReady = false;
    this._readyResolvers.splice(0).forEach((resolve) => resolve(false));
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
