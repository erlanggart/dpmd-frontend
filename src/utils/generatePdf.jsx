/**
 * generatePdf — render template dokumen ke PDF via html2canvas + jsPDF.
 *
 * Strategi rendering yang reliable:
 * 1. Mount container di LUAR viewport kanan (fixed + translateX(100%))
 *    — browser tetap merender elemen ini sepenuhnya, berbeda dengan left:-9999px
 * 2. Tunggu document.fonts.ready + requestAnimationFrame sebelum capture
 * 3. Gunakan windowWidth exact A4 pixel agar html2canvas scale konsisten
 * 4. Scaling ke A4 mm berdasarkan aspect ratio canvas
 */

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DraftWatermarkContext } from '../components/pencairan/preview/DocumentSheet';

// A4 dimensions
const A4 = {
  portrait:  { pxW: 794,  pxH: 1123, mmW: 210, mmH: 297 },
  landscape: { pxW: 1123, pxH: 794,  mmW: 297, mmH: 210 },
};

/**
 * @param {React.ComponentType} TemplateComponent
 * @param {object}  pencairan    — data pencairan lengkap
 * @param {object}  options
 * @param {'portrait'|'landscape'} options.orientation
 * @param {string}  options.filename   — nama file tanpa .pdf
 * @param {(n:number)=>void} [options.onProgress]  — 0-100
 */
export async function generatePdf(TemplateComponent, pencairan, {
  orientation = 'portrait',
  filename = 'dokumen',
  onProgress,
} = {}) {
  const dim = A4[orientation] || A4.portrait;

  // ── 1. Buat container yang TERRENDER penuh (di luar viewport kanan) ──────
  const container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'top:0',
    // Posisi tepat di luar kanan viewport — browser tetap merender
    `left:${window.innerWidth + 50}px`,
    // Lebar exact A4 pixel agar .doc-sheet tidak reflow
    `width:${dim.pxW}px`,
    'background:white',
    'z-index:9999',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(container);

  let root = null;

  try {
    onProgress?.(8);

    // ── 2. Render React component ────────────────────────────────────────
    await new Promise((resolve, reject) => {
      try {
        root = createRoot(container);
        root.render(
          createElement(
            DraftWatermarkContext.Provider,
            { value: pencairan?.status === 'draft' },
            createElement(TemplateComponent, { pencairan }),
          ),
        );

        // Tunggu font load, lalu dua frame animasi + 400ms untuk layout stabil
        const waitAndResolve = () =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setTimeout(resolve, 400))
          );

        if (document.fonts?.ready) {
          document.fonts.ready.then(waitAndResolve).catch(waitAndResolve);
        } else {
          setTimeout(waitAndResolve, 500);
        }
      } catch (e) { reject(e); }
    });

    onProgress?.(30);

    // ── 3. Temukan .doc-sheet ────────────────────────────────────────────
    const docSheet = container.querySelector('.doc-sheet');
    if (!docSheet) throw new Error('Elemen .doc-sheet tidak ditemukan dalam template');

    // ── 4. Capture dengan html2canvas ────────────────────────────────────
    const canvas = await html2canvas(docSheet, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      // windowWidth memastikan layout dokumen pas A4
      windowWidth: dim.pxW,
      // Perbaiki URL relatif untuk gambar (logo, dll)
      onclone: (cloneDoc) => {
        cloneDoc.querySelectorAll('img').forEach((img) => {
          if (img.src && !img.src.startsWith('http')) {
            img.src = window.location.origin + img.getAttribute('src');
          }
        });
      },
    });

    onProgress?.(75);

    // ── 5. Hitung dimensi PDF ────────────────────────────────────────────
    // Scale: canvas.width / 2 px = dim.pxW px = dim.mmW mm
    // → 1 canvas px = dim.mmW / (dim.pxW * 2) mm
    const mmPerPx = dim.mmW / (canvas.width);           // mm per canvas px
    const imgW    = dim.mmW;                             // lebar A4 dalam mm
    const imgH    = canvas.height * mmPerPx;             // tinggi proporsional

    // ── 6. Buat PDF A4 ───────────────────────────────────────────────────
    const pdf = new jsPDF({
      orientation: orientation === 'landscape' ? 'l' : 'p',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (imgH <= dim.mmH + 5) {
      // Muat dalam 1 halaman (toleransi 5mm)
      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
    } else {
      // Multi-halaman: tiling secara vertikal
      const numPages = Math.ceil(imgH / dim.mmH);
      for (let p = 0; p < numPages; p++) {
        if (p > 0) pdf.addPage();
        // Geser gambar ke atas setiap halaman
        pdf.addImage(imgData, 'JPEG', 0, -(p * dim.mmH), imgW, imgH);
      }
    }

    onProgress?.(95);

    // ── 7. Download ───────────────────────────────────────────────────────
    const safe = filename.replace(/[/\\:*?"<>|]/g, '-');
    pdf.save(`${safe}.pdf`);
    onProgress?.(100);

  } finally {
    // Cleanup — defer agar React dapat unmount dengan bersih
    setTimeout(() => {
      try { root?.unmount(); } catch { /* noop */ }
      try { document.body.removeChild(container); } catch { /* noop */ }
    }, 100);
  }
}
