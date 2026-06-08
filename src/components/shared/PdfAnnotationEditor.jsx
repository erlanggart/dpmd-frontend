import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Canvas as FabricCanvas, Rect, IText, PencilBrush } from 'fabric';
import {
  LuType, LuPen, LuMousePointer2,
  LuTrash2, LuChevronLeft, LuChevronRight, LuSave, LuLoader,
} from 'react-icons/lu';

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
 * Anotasi disimpan sebagai koordinat RELATIF (0..1, origin kiri-atas) per halaman,
 * sehingga aman untuk PDF hasil scan & konsisten dengan flatten pdf-lib di backend.
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
  const baseCanvasRef = useRef(null);
  const fabricElRef = useRef(null);
  const fabricRef = useRef(null);
  const pdfDocRef = useRef(null);
  const scaleRef = useRef(1);
  // { [pageNumber]: { items: [...], note: '' } }
  const annByPageRef = useRef({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [tool, setTool] = useState('select');
  const [color, setColor] = useState('#e53935');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const markDirty = useCallback(() => {
    setDirty(true);
    onDirtyChange?.(true);
  }, [onDirtyChange]);

  // ---- Serialisasi fabric -> item anotasi (koordinat relatif) ----
  const serializeCurrentPage = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const W = fc.getWidth();
    const H = fc.getHeight();
    const scale = scaleRef.current || 1;
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
          color: o.annColor || color,
        });
      } else if (t === 'text') {
        items.push({
          type: 'text',
          pos: [o.left / W, o.top / H],
          value: o.text || '',
          color: o.fill || color,
          size: (o.fontSize || 16) / scale,
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
        if (pts.length > 1) items.push({ type: 'ink', path: pts, color: o.annColor || color, width: o.strokeWidth || 2 });
      }
    });
    annByPageRef.current[pageNum] = { items, note };
  }, [pageNum, note, color]);

  // ---- Bangun annotation_data lengkap ----
  const buildAnnotationData = useCallback(() => {
    serializeCurrentPage();
    const pages = [];
    Object.entries(annByPageRef.current).forEach(([p, data]) => {
      const hasItems = data.items && data.items.length > 0;
      const hasNote = data.note && data.note.trim();
      if (hasItems || hasNote) {
        pages.push({ page: Number(p), items: data.items || [], note: data.note || '' });
      }
    });
    return { version: 1, pages };
  }, [serializeCurrentPage]);

  // ekspor fungsi ambil data ke parent
  useEffect(() => {
    if (getAnnotationRef) getAnnotationRef.current = buildAnnotationData;
  }, [getAnnotationRef, buildAnnotationData]);

  // ---- Deserialisasi item -> objek fabric ----
  const loadItemsToCanvas = useCallback((items) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const W = fc.getWidth();
    const H = fc.getHeight();
    const scale = scaleRef.current || 1;
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
          fontSize: (it.size || 12) * scale, fill: it.color || '#1e88e5',
          selectable: !readOnly, evented: !readOnly, editable: !readOnly,
        });
        txt.annType = 'text';
        fc.add(txt);
      } else if (it.type === 'ink' && Array.isArray(it.path)) {
        // gambar ulang sebagai polyline via path string
        const d = it.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0] * W} ${p[1] * H}`).join(' ');
        // gunakan Rect kosong? -> pakai fabric Path
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
  }, [readOnly]);

  // ---- Render satu halaman PDF + siapkan overlay fabric ----
  const renderPage = useCallback(async (num) => {
    const pdf = pdfDocRef.current;
    if (!pdf) return;
    const page = await pdf.getPage(num);
    const container = baseCanvasRef.current?.parentElement;
    const maxW = Math.min(container?.clientWidth || 800, 900);
    const base1 = page.getViewport({ scale: 1 });
    const scale = maxW / base1.width;
    scaleRef.current = scale;
    const viewport = page.getViewport({ scale });

    const baseCanvas = baseCanvasRef.current;
    const ctx = baseCanvas.getContext('2d');
    baseCanvas.width = viewport.width;
    baseCanvas.height = viewport.height;
    baseCanvas.style.width = `${viewport.width}px`;
    baseCanvas.style.height = `${viewport.height}px`;
    await page.render({ canvasContext: ctx, viewport }).promise;

    // (re)buat fabric canvas dgn dimensi sama
    if (fabricRef.current) {
      fabricRef.current.dispose();
      fabricRef.current = null;
    }
    const fc = new FabricCanvas(fabricElRef.current, {
      width: viewport.width,
      height: viewport.height,
      selection: !readOnly,
    });
    fabricRef.current = fc;
    // Fabric membungkus canvas overlay dalam <div.canvas-container> yang secara
    // default berada di aliran normal (muncul DI BAWAH canvas PDF), sehingga area
    // interaksi tidak pernah menumpuk di atas PDF dan anotasi tidak bisa digambar.
    // Paksa wrapper menumpuk tepat di atas canvas PDF.
    if (fc.wrapperEl) {
      fc.wrapperEl.style.position = 'absolute';
      fc.wrapperEl.style.top = '0';
      fc.wrapperEl.style.left = '0';
    }
    fc.freeDrawingBrush = new PencilBrush(fc);

    fc.on('path:created', (e) => {
      const p = e.path;
      p.annType = 'ink';
      p.annColor = color;
      p.selectable = !readOnly;
      markDirty();
    });
    fc.on('object:modified', markDirty);

    // muat anotasi halaman ini
    const pageData = annByPageRef.current[num];
    setNote(pageData?.note || '');
    if (pageData?.items?.length) loadItemsToCanvas(pageData.items);
  }, [readOnly, color, markDirty, loadItemsToCanvas]);

  // ---- Init: load dokumen PDF + anotasi awal ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    annByPageRef.current = {};
    (initialAnnotation?.pages || []).forEach((p) => {
      annByPageRef.current[p.page] = { items: p.items || [], note: p.note || '' };
    });
    (async () => {
      // Tanpa file name, URL berakhir di "/bankeu-perubahan/" → pasti gagal.
      // Tangani lebih awal dengan pesan jelas, jangan kirim request ngawur.
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
        setPageNum(1);
        await renderPage(1);
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (cancelled) return;
        // Bedakan penyebab agar bisa didiagnosa (tiap proposal bisa beda kasus):
        //  - MissingPDF / 404  → file tidak ada di server
        //  - status lain       → masalah server/akses
        //  - InvalidPDF        → file rusak / bukan PDF
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
        // Detail teknis tetap dicatat utk diagnosa lanjutan.
        console.error('[PdfAnnotationEditor] gagal memuat PDF:', fileUrl, err);
        setError(msg);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, initialAnnotation]);

  // ---- Pindah halaman ----
  const gotoPage = useCallback(async (target) => {
    if (target < 1 || target > numPages || target === pageNum) return;
    serializeCurrentPage();
    setPageNum(target);
    await renderPage(target);
  }, [numPages, pageNum, serializeCurrentPage, renderPage]);

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
    // Di mode anotasi (Teks/Highlight/Coret/Kotak), objek lama dibuat
    // non-interaktif (evented:false) agar tidak "menangkap" klik — sehingga
    // anotasi baru selalu bisa ditempatkan di mana saja, termasuk di atas
    // coretan yg bounding box-nya besar. Di mode Pilih, objek interaktif lagi.
    fc.forEachObject((o) => { o.selectable = isSelect; o.evented = isSelect; });
    if (!isSelect) fc.discardActiveObject();
    fc.requestRenderAll();
  }, [tool, color, readOnly, pageNum, loading]);

  // ---- Tambah teks dgn klik (mode "Teks") ----
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc || readOnly) return;
    const handler = (opt) => {
      if (tool !== 'text') return;
      // Fabric v7: getPointer() dihapus, gunakan getScenePoint().
      const p = fc.getScenePoint(opt.e);
      const PLACEHOLDER = 'Tulis catatan…';
      const txt = new IText(PLACEHOLDER, {
        left: p.x, top: p.y, fontSize: 18, fill: color,
        editable: true, fontFamily: 'Arial',
        backgroundColor: 'rgba(253, 224, 71, 0.35)',
      });
      txt.annType = 'text';
      // bersihkan bila placeholder dibiarkan / kosong, lalu balik ke mode Pilih
      txt.on('editing:exited', () => {
        const v = (txt.text || '').trim();
        if (!v || v === PLACEHOLDER) fc.remove(txt);
        fc.requestRenderAll();
        setTool('select');
      });
      fc.add(txt);
      fc.setActiveObject(txt);
      // aktifkan kursor & seleksi placeholder agar langsung tertimpa saat mengetik
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
  }, [tool, color, readOnly, markDirty, pageNum, loading]);

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const objs = fc.getActiveObjects();
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

  // simpan note ke ref saat berubah
  useEffect(() => {
    if (annByPageRef.current[pageNum]) annByPageRef.current[pageNum].note = note;
    else annByPageRef.current[pageNum] = { items: [], note };
  }, [note, pageNum]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-gray-200 bg-gray-50">
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
          {onSaveDraft && (
            <button type="button" onClick={handleSaveDraft} disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 ml-auto disabled:opacity-60">
              {saving ? <LuLoader className="w-3.5 h-3.5 animate-spin" /> : <LuSave className="w-3.5 h-3.5" />}
              Simpan Draft {dirty && !saving ? '•' : ''}
            </button>
          )}
        </div>
      )}

      {/* Viewer area */}
      <div className="flex-1 overflow-auto bg-gray-200 p-3">
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
        <div className="relative mx-auto shadow-lg bg-white" style={{ width: 'fit-content', display: loading || error ? 'none' : 'block' }}>
          <canvas ref={baseCanvasRef} className="block" />
          <canvas ref={fabricElRef} className="absolute top-0 left-0" />
        </div>
      </div>

      {/* Footer: navigasi halaman + catatan per halaman */}
      {!loading && !error && (
        <div className="border-t border-gray-200 bg-white">
          <div className="flex items-center justify-center gap-3 py-2">
            <button type="button" onClick={() => gotoPage(pageNum - 1)} disabled={pageNum <= 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><LuChevronLeft className="w-5 h-5" /></button>
            <span className="text-sm text-gray-600">Halaman {pageNum} / {numPages}</span>
            <button type="button" onClick={() => gotoPage(pageNum + 1)} disabled={pageNum >= numPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><LuChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="px-3 pb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Catatan halaman {pageNum}</label>
            <textarea value={note} onChange={(e) => { setNote(e.target.value); markDirty(); }}
              readOnly={readOnly} rows={2}
              placeholder={readOnly ? '(tidak ada catatan)' : 'Catatan revisi untuk halaman ini...'}
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-400 focus:outline-none read-only:bg-gray-50" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---- util ----
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
