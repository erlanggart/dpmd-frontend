import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Canvas as FabricCanvas, Rect, IText, PencilBrush } from 'fabric';
import {
  LuType, LuPen, LuMousePointer2,
  LuTrash2, LuSave, LuLoader,
  LuZoomIn, LuZoomOut, LuMaximize2,
} from 'react-icons/lu';

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.2;
const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

// Query versi pada worker: memaksa browser mengambil ulang file `.mjs` dari server.
// Cache lama bisa menyimpan worker dengan MIME salah ("application/octet-stream")
// dari sebelum nginx diperbaiki — URL dengan query baru = cache-key baru = fetch
// segar (kini "text/javascript"). Naikkan angka ini bila isu MIME terulang.
pdfjsLib.GlobalWorkerOptions.workerSrc = `${pdfWorkerUrl}?v=mjs2`;

const COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#000000'];
const TOOLS = [
  { key: 'select', label: 'Pilih', icon: LuMousePointer2 },
  { key: 'text', label: 'Teks', icon: LuType },
  { key: 'draw', label: 'Gambar', icon: LuPen },
];

/**
 * Editor/viewer anotasi PDF berbasis pdfjs (render) + fabric (overlay).
 *
 * Mode SCROLL menerus: semua halaman dirender bertumpuk vertikal (tanpa navigasi
 * per-halaman) agar lebih cepat & mudah ditelusuri. Tiap halaman punya canvas PDF
 * + overlay fabric sendiri. Anotasi disimpan sebagai koordinat RELATIF (0..1,
 * origin kiri-atas) per halaman, sehingga aman untuk PDF hasil scan & konsisten
 * dengan flatten pdf-lib di backend.
 *
 * Props:
 *  - fileUrl: string         URL PDF
 *  - initialAnnotation: { pages: [{page, items, note}] } | null
 *  - readOnly: bool          true = hanya lihat (Desa/DPMD)
 *  - onDirtyChange: (bool)   notifikasi ada perubahan belum tersimpan
 *  - getAnnotationRef: ref   diisi fungsi () => annotationData untuk diambil parent
 *  - onSaveDraft: (data) => Promise  simpan draft (opsional, tombol Simpan)
 */
export default function PdfAnnotationEditor({
  fileUrl,
  initialAnnotation = null,
  readOnly = false,
  onDirtyChange,
  getAnnotationRef,
  onSaveDraft,
}) {
  const pdfDocRef = useRef(null);
  const viewerRef = useRef(null);
  // Sumber kebenaran anotasi per-halaman: { [pageNumber]: { items: [...], note: '' } }
  const annByPageRef = useRef({});
  // Instance fabric yang hidup per halaman: Map<pageNumber, fabricCanvas>
  const fabricByPageRef = useRef(new Map());
  // Fabric terakhir yang aktif (untuk tombol Hapus global di toolbar)
  const activeFabricRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [tool, setTool] = useState('select');
  const [color, setColor] = useState('#e53935');
  const [zoom, setZoom] = useState(1); // 1 = fit lebar viewer, >1 = perbesar
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const markDirty = useCallback(() => {
    setDirty(true);
    onDirtyChange?.(true);
  }, [onDirtyChange]);

  // ---- Serialisasi semua halaman (baca fabric yang hidup) ----
  const serializeAllPages = useCallback(() => {
    fabricByPageRef.current.forEach((fc, p) => {
      const items = serializeFabricItems(fc, fc.__annScale || 1, color);
      const prev = annByPageRef.current[p] || {};
      annByPageRef.current[p] = { items, note: prev.note || '' };
    });
  }, [color]);

  // ---- Bangun annotation_data lengkap ----
  const buildAnnotationData = useCallback(() => {
    serializeAllPages();
    const pages = [];
    Object.entries(annByPageRef.current).forEach(([p, data]) => {
      const hasItems = data.items && data.items.length > 0;
      const hasNote = data.note && data.note.trim();
      if (hasItems || hasNote) {
        pages.push({ page: Number(p), items: data.items || [], note: data.note || '' });
      }
    });
    return { version: 1, pages };
  }, [serializeAllPages]);

  // ekspor fungsi ambil data ke parent
  useEffect(() => {
    if (getAnnotationRef) getAnnotationRef.current = buildAnnotationData;
  }, [getAnnotationRef, buildAnnotationData]);

  // ---- Init: load dokumen PDF + anotasi awal ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNumPages(0);
    annByPageRef.current = {};
    fabricByPageRef.current = new Map();
    activeFabricRef.current = null;
    (initialAnnotation?.pages || []).forEach((p) => {
      annByPageRef.current[p.page] = { items: p.items || [], note: p.note || '' };
    });
    (async () => {
      // Tanpa file name, URL berakhir di "/bankeu-perubahan/" → pasti gagal.
      if (!fileUrl || /\/$/.test(fileUrl)) {
        if (!cancelled) { setError('File proposal belum tersedia (file_proposal kosong).'); setLoading(false); }
        return;
      }
      try {
        const loadingTask = pdfjsLib.getDocument({ url: fileUrl, withCredentials: false });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const name = err?.name;
        let msg;
        if (name === 'MissingPDFException' || err?.status === 404) {
          msg = 'File PDF tidak ditemukan di server (404). File mungkin sudah terhapus atau belum terupload.';
        } else if (name === 'UnexpectedResponseException') {
          msg = `Server menolak permintaan file (status ${err?.status || '?'}).`;
        } else if (name === 'InvalidPDFException') {
          msg = 'File rusak atau bukan PDF yang valid.';
        } else {
          msg = 'Gagal memuat PDF. Periksa koneksi atau ketersediaan file.';
        }
        console.error('[PdfAnnotationEditor] gagal memuat PDF:', fileUrl, err);
        setError(msg);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      fabricByPageRef.current.forEach((fc) => { try { fc.dispose(); } catch { /* noop */ } });
      fabricByPageRef.current = new Map();
    };
  }, [fileUrl, initialAnnotation]);

  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z - ZOOM_STEP)), []);
  const zoomFit = useCallback(() => setZoom(1), []);

  const deleteSelected = useCallback(() => {
    const fc = activeFabricRef.current;
    if (!fc) return;
    const objs = fc.getActiveObjects();
    if (!objs.length) return;
    objs.forEach((o) => fc.remove(o));
    fc.discardActiveObject();
    fc.requestRenderAll();
    markDirty();
  }, [markDirty]);

  const handleSaveDraft = useCallback(async () => {
    if (!onSaveDraft) return;
    setSaving(true);
    try {
      const data = buildAnnotationData();
      await onSaveDraft(data);
      setDirty(false);
      onDirtyChange?.(false);
    } finally {
      setSaving(false);
    }
  }, [onSaveDraft, buildAnnotationData, onDirtyChange]);

  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-gray-200 bg-gray-50">
        {!readOnly && (
          <>
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.key} type="button" onClick={() => setTool(t.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${tool === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                  title={t.label}>
                  <Icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
            <div className="flex items-center gap-1 ml-1 pl-2 border-l border-gray-300">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-white'}`}
                  style={{ background: c }} title={c} />
              ))}
            </div>
            <button type="button" onClick={deleteSelected}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-red-600 hover:bg-red-50 border border-gray-200 ml-1">
              <LuTrash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Hapus</span>
            </button>
          </>
        )}

        {/* Grup kanan: simpan + info halaman + zoom */}
        <div className="ml-auto flex items-center gap-1.5">
          {!readOnly && onSaveDraft && (
            <button type="button" onClick={handleSaveDraft} disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
              {saving ? <LuLoader className="w-3.5 h-3.5 animate-spin" /> : <LuSave className="w-3.5 h-3.5" />}
              Simpan Draft {dirty && !saving ? '•' : ''}
            </button>
          )}
          {numPages > 0 && (
            <span className="hidden sm:inline text-xs text-gray-500 px-1">{numPages} halaman</span>
          )}
          <div className="flex items-center gap-0.5 pl-1.5 border-l border-gray-300">
            <button type="button" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} title="Perkecil"
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><LuZoomOut className="w-4 h-4" /></button>
            <button type="button" onClick={zoomFit} title="Pas lebar (reset)"
              className="min-w-[3rem] text-xs text-gray-600 tabular-nums hover:bg-gray-100 rounded-lg py-1">
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} title="Perbesar"
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><LuZoomIn className="w-4 h-4" /></button>
            <button type="button" onClick={zoomFit} title="Pas lebar (reset)"
              className="p-1.5 rounded-lg hover:bg-gray-100"><LuMaximize2 className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Viewer area: scroll menerus semua halaman */}
      <div ref={viewerRef} className="flex-1 overflow-auto bg-gray-200 p-3 text-center">
        {loading && (
          <div className="flex items-center justify-center h-40 text-gray-500 gap-2">
            <LuLoader className="w-5 h-5 animate-spin" /> Memuat PDF...
          </div>
        )}
        {error && (
          <div className="text-center py-8">
            <div className="text-red-600">{error}</div>
            {fileUrl && !/\/$/.test(fileUrl) && (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-2 text-xs text-blue-600 underline break-all">
                Coba buka file langsung
              </a>
            )}
          </div>
        )}
        {!loading && !error && pageNumbers.map((p) => (
          <PdfPage
            key={p}
            pdf={pdfDocRef.current}
            pageNum={p}
            zoom={zoom}
            tool={tool}
            color={color}
            readOnly={readOnly}
            viewerRef={viewerRef}
            annByPageRef={annByPageRef}
            fabricByPageRef={fabricByPageRef}
            activeFabricRef={activeFabricRef}
            markDirty={markDirty}
            setTool={setTool}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Satu halaman PDF + overlay fabric + catatan. Mandiri: render sendiri, daftar ke
 * fabricByPageRef agar parent bisa serialisasi seluruh halaman saat simpan.
 */
function PdfPage({
  pdf, pageNum, zoom, tool, color, readOnly,
  viewerRef, annByPageRef, fabricByPageRef, activeFabricRef, markDirty, setTool,
}) {
  const baseCanvasRef = useRef(null);
  const fabricElRef = useRef(null);
  const fabricRef = useRef(null);
  const scaleRef = useRef(1);
  const didRenderRef = useRef(false);
  const [renderTick, setRenderTick] = useState(0);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [renderErr, setRenderErr] = useState(null);
  const [note, setNote] = useState(annByPageRef.current[pageNum]?.note || '');

  // ---- Render halaman PDF + (re)buat overlay fabric ----
  const renderSelf = useCallback(async () => {
    const page = await pdf.getPage(pageNum);
    const base1 = page.getViewport({ scale: 1 });
    const viewer = viewerRef.current;
    const pad = 24; // padding p-3 kiri+kanan
    const availW = Math.max((viewer?.clientWidth || 800) - pad, 200);
    // Mode scroll: fit ke LEBAR viewer, lalu kali zoom. Tinggi mengikuti rasio
    // sehingga halaman tampil utuh dan ditelusuri dengan menggulir.
    const fitScale = availW / base1.width;
    const scale = fitScale * zoom;
    scaleRef.current = scale;
    const viewport = page.getViewport({ scale });

    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return;
    const ctx = baseCanvas.getContext('2d');
    baseCanvas.width = viewport.width;
    baseCanvas.height = viewport.height;
    baseCanvas.style.width = `${viewport.width}px`;
    baseCanvas.style.height = `${viewport.height}px`;
    setDims({ w: viewport.width, h: viewport.height });
    // Latar putih eksplisit + tangkap error: bila pdf.js gagal menggambar isi
    // halaman (mis. encoding gambar scan yang tak didukung), halaman tak lagi
    // "diam-diam kosong" — penyebabnya tercatat & ditandai agar bisa didiagnosa.
    setRenderErr(null);
    try {
      await page.render({ canvasContext: ctx, viewport, background: 'white' }).promise;
    } catch (err) {
      console.error(`[PdfAnnotationEditor] gagal render halaman ${pageNum}:`, err?.name || err, err);
      setRenderErr(err?.name || 'RenderError');
    }

    // dispose fabric lama bila ada
    if (fabricRef.current) {
      try { fabricRef.current.dispose(); } catch { /* noop */ }
      fabricRef.current = null;
    }
    const fc = new FabricCanvas(fabricElRef.current, {
      width: viewport.width,
      height: viewport.height,
      selection: !readOnly,
    });
    fc.__annScale = scale;
    fabricRef.current = fc;
    fabricByPageRef.current.set(pageNum, fc);

    // Fabric membungkus canvas overlay dalam <div.canvas-container>; paksa menumpuk
    // tepat di atas canvas PDF.
    if (fc.wrapperEl) {
      fc.wrapperEl.style.position = 'absolute';
      fc.wrapperEl.style.top = '0';
      fc.wrapperEl.style.left = '0';
    }
    fc.freeDrawingBrush = new PencilBrush(fc);

    const setActive = () => { activeFabricRef.current = fc; };
    fc.on('mouse:down', setActive);
    fc.on('selection:created', setActive);
    fc.on('selection:updated', setActive);
    fc.on('path:created', (e) => {
      const p = e.path;
      p.annType = 'ink';
      p.annColor = color;
      p.selectable = !readOnly;
      markDirty();
    });
    fc.on('object:modified', markDirty);

    // muat anotasi halaman ini
    const pageData = annByPageRef.current[pageNum];
    if (pageData?.items?.length) loadItemsToFabric(fc, pageData.items, scale, readOnly);

    setRenderTick((t) => t + 1);
  }, [pdf, pageNum, zoom, color, readOnly, viewerRef, annByPageRef, fabricByPageRef, activeFabricRef, markDirty]);

  // Render saat mount & saat zoom berubah. Sebelum re-render karena zoom,
  // serialisasi anotasi halaman ini agar tidak hilang.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (didRenderRef.current) {
        const fc = fabricRef.current;
        if (fc) {
          const items = serializeFabricItems(fc, fc.__annScale || 1, color);
          const prev = annByPageRef.current[pageNum] || {};
          annByPageRef.current[pageNum] = { items, note: prev.note || '' };
        }
      }
      if (!cancelled) await renderSelf();
      didRenderRef.current = true;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // cleanup saat unmount
  useEffect(() => {
    const pn = pageNum;
    const map = fabricByPageRef.current;
    return () => {
      const fc = fabricRef.current;
      if (fc) { try { fc.dispose(); } catch { /* noop */ } }
      if (map.get(pn) === fc) map.delete(pn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Terapkan mode tool ke fabric ----
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc || readOnly) return;
    const isSelect = tool === 'select';
    fc.isDrawingMode = tool === 'draw';
    if (tool === 'draw') {
      fc.freeDrawingBrush.color = color;
      fc.freeDrawingBrush.width = 2;
    }
    fc.selection = isSelect;
    fc.forEachObject((o) => { o.selectable = isSelect; o.evented = isSelect; });
    if (!isSelect) fc.discardActiveObject();
    fc.requestRenderAll();
  }, [tool, color, readOnly, renderTick]);

  // ---- Tambah teks dgn klik (mode "Teks") ----
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc || readOnly) return;
    const handler = (opt) => {
      if (tool !== 'text') return;
      const p = fc.getScenePoint(opt.e);
      const PLACEHOLDER = 'Tulis catatan…';
      const txt = new IText(PLACEHOLDER, {
        left: p.x, top: p.y, fontSize: 18, fill: color,
        editable: true, fontFamily: 'Arial',
        backgroundColor: 'rgba(253, 224, 71, 0.35)',
      });
      txt.annType = 'text';
      txt.on('editing:exited', () => {
        const v = (txt.text || '').trim();
        if (!v || v === PLACEHOLDER) fc.remove(txt);
        fc.requestRenderAll();
        setTool('select');
      });
      fc.add(txt);
      fc.setActiveObject(txt);
      activeFabricRef.current = fc;
      setTimeout(() => {
        txt.enterEditing();
        txt.selectAll();
        txt.hiddenTextarea?.focus();
        fc.requestRenderAll();
      }, 10);
      fc.requestRenderAll();
      markDirty();
    };
    fc.on('mouse:down', handler);
    return () => { fc.off('mouse:down', handler); };
  }, [tool, color, readOnly, markDirty, setTool, activeFabricRef, renderTick]);

  const onNoteChange = (e) => {
    const v = e.target.value;
    setNote(v);
    const prev = annByPageRef.current[pageNum] || { items: [] };
    annByPageRef.current[pageNum] = { ...prev, note: v };
    markDirty();
  };

  const showNote = !readOnly || (note && note.trim());

  return (
    <div className="mb-6">
      <div className="relative inline-block text-left shadow-lg bg-white align-top">
        <canvas ref={baseCanvasRef} className="block" />
        <canvas ref={fabricElRef} className="absolute top-0 left-0" />
        {renderErr && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium shadow">
            Halaman {pageNum} gagal dirender ({renderErr}) — isi mungkin tak tampil di sini
          </div>
        )}
      </div>
      {showNote && (
        <div className="mx-auto mt-1.5" style={{ width: dims.w ? `${dims.w}px` : '100%', maxWidth: '100%' }}>
          <label className="block text-[11px] font-medium text-gray-500 mb-0.5 text-left">
            Catatan halaman {pageNum}
          </label>
          <textarea value={note} onChange={onNoteChange}
            readOnly={readOnly} rows={2}
            placeholder={readOnly ? '(tidak ada catatan)' : 'Catatan revisi untuk halaman ini...'}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-400 focus:outline-none read-only:bg-gray-50" />
        </div>
      )}
    </div>
  );
}

// ---- util serialisasi/deserialisasi ----
function serializeFabricItems(fc, scale, fallbackColor) {
  const W = fc.getWidth();
  const H = fc.getHeight();
  const items = [];
  fc.getObjects().forEach((o) => {
    const t = o.annType;
    if (t === 'highlight' || t === 'rect' || t === 'strike') {
      items.push({
        type: t,
        rect: [
          o.left / W,
          o.top / H,
          (o.width * o.scaleX) / W,
          (o.height * o.scaleY) / H,
        ],
        color: o.annColor || fallbackColor,
      });
    } else if (t === 'text') {
      items.push({
        type: 'text',
        pos: [o.left / W, o.top / H],
        value: o.text || '',
        color: o.fill || fallbackColor,
        size: (o.fontSize || 16) / (scale || 1),
      });
    } else if (t === 'ink') {
      const pts = [];
      (o.path || []).forEach((cmd) => {
        const px = cmd[cmd.length - 2];
        const py = cmd[cmd.length - 1];
        if (typeof px === 'number' && typeof py === 'number') {
          const ax = (px - (o.pathOffset?.x || 0)) * o.scaleX + o.left;
          const ay = (py - (o.pathOffset?.y || 0)) * o.scaleY + o.top;
          pts.push([ax / W, ay / H]);
        }
      });
      if (pts.length > 1) items.push({ type: 'ink', path: pts, color: o.annColor || fallbackColor, width: o.strokeWidth || 2 });
    }
  });
  return items;
}

function loadItemsToFabric(fc, items, scale, readOnly) {
  const W = fc.getWidth();
  const H = fc.getHeight();
  (items || []).forEach((it) => {
    if (it.type === 'highlight' || it.type === 'rect' || it.type === 'strike') {
      const [x, y, w, h] = it.rect;
      const isHi = it.type === 'highlight';
      const rect = new Rect({
        left: x * W, top: y * H, width: w * W, height: h * H,
        fill: isHi ? hexA(it.color || '#fdd835', 0.35) : 'transparent',
        stroke: it.type === 'rect' ? (it.color || '#e53935') : (it.type === 'strike' ? (it.color || '#e53935') : 'transparent'),
        strokeWidth: it.type === 'rect' ? 1.5 : 0,
        selectable: !readOnly, evented: !readOnly,
      });
      rect.annType = it.type;
      rect.annColor = it.color;
      if (it.type === 'strike') decorateStrike(rect, it.color);
      fc.add(rect);
    } else if (it.type === 'text') {
      const txt = new IText(it.value || '', {
        left: it.pos[0] * W, top: it.pos[1] * H,
        fontSize: (it.size || 12) * (scale || 1), fill: it.color || '#1e88e5',
        selectable: !readOnly, evented: !readOnly, editable: !readOnly,
      });
      txt.annType = 'text';
      fc.add(txt);
    } else if (it.type === 'ink' && Array.isArray(it.path)) {
      const d = it.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0] * W} ${p[1] * H}`).join(' ');
      import('fabric').then(({ Path }) => {
        const pth = new Path(d, {
          stroke: it.color || '#e53935', strokeWidth: it.width || 2, fill: '',
          selectable: !readOnly, evented: !readOnly,
        });
        pth.annType = 'ink';
        pth.annColor = it.color;
        fc.add(pth);
        fc.requestRenderAll();
      });
    }
  });
  fc.requestRenderAll();
}

function hexA(hex, alpha) {
  const m = (hex || '').replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return `rgba(253,216,53,${alpha})`;
  const int = parseInt(m[1], 16);
  return `rgba(${(int >> 16) & 255},${(int >> 8) & 255},${int & 255},${alpha})`;
}

function decorateStrike(rect, color) {
  // tampilkan garis tengah merah agar mirip "coret"
  rect.set({ fill: hexA(color || '#e53935', 0.12) });
}
