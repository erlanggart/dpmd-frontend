import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Printer, AlertCircle, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { TEMPLATE_REGISTRY } from './templateRegistry';
import { generatePdf } from '../../../utils/generatePdf';

const ComingSoonTemplate = ({ docKey, docLabel }) => (
  <div style={{
    background: '#fff', padding: '3cm 2cm', minHeight: '29.7cm', width: '21cm',
    textAlign: 'center', fontFamily: 'Times New Roman, serif',
  }}>
    <AlertCircle size={48} style={{ margin: '0 auto', color: '#f59e0b' }} />
    <h2 style={{ fontSize: '18pt', marginTop: '20pt' }}>{docLabel}</h2>
    <p style={{ color: '#6b7280', marginTop: '12pt' }}>
      Template <strong>{docKey}</strong> sedang disiapkan.
    </p>
    <p style={{ color: '#9ca3af', fontSize: '10pt', marginTop: '6pt' }}>
      Data sudah tersimpan di backend — preview tampilan akan tersedia setelah template selesai dibuat.
    </p>
  </div>
);

/**
 * DocumentPreviewModal — menampilkan template dokumen sebagai preview.
 * Tombol "Download PDF" menggunakan html2canvas + jsPDF secara langsung
 * dari konten yang terrender di modal (tanpa membuka window baru).
 */
const DocumentPreviewModal = ({
  open, onClose, docKey, docLabel, pencairan,
  onMarkReviewed, alreadyReviewed,
  onPrev, onNext, hasPrev, hasNext,
}) => {
  const printAreaRef = useRef(null);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, hasPrev, hasNext, onClose, onPrev, onNext]);

  // Reset progress saat dokumen berganti
  useEffect(() => {
    setPdfProgress(0);
    setPdfLoading(false);
  }, [docKey]);

  const handleDownloadPdf = useCallback(async () => {
    const entry = TEMPLATE_REGISTRY[docKey];
    if (!entry?.component) return;

    setPdfLoading(true);
    setPdfProgress(0);
    try {
      await generatePdf(entry.component, pencairan, {
        orientation: entry.orientation || 'portrait',
        filename: `${docLabel} - ${pencairan?.no_pesanan_b || pencairan?.id}`,
        onProgress: setPdfProgress,
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      alert(`Gagal generate PDF: ${err.message}`);
    } finally {
      setPdfLoading(false);
      setPdfProgress(0);
    }
  }, [docKey, docLabel, pencairan]);

  const handlePrint = useCallback(() => {
    // Native print — CSS @media print menyembunyikan chrome modal
    window.print();
  }, []);

  if (!open) return null;

  const entry = TEMPLATE_REGISTRY[docKey];
  const TemplateComp = entry?.component;
  const printOrientation = entry?.orientation === 'landscape' ? 'A4 landscape' : 'A4';

  const body = (
    <div className="doc-preview-overlay fixed inset-0 z-[9999] bg-gray-900/80 backdrop-blur-sm flex flex-col">
      {/* Header (non-printable) */}
      <div className="no-print bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition shrink-0">
            <X className="h-4 w-4 text-gray-600" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 truncate">Preview: {docLabel}</h2>
            <p className="text-[11px] text-gray-500 truncate">
              {pencairan?.no_pesanan_b || `#${pencairan?.id}`} — Periksa data lalu download PDF
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigasi antar dokumen */}
          {hasPrev && (
            <button onClick={onPrev} className="p-2 rounded-lg hover:bg-gray-100 transition" title="Dokumen sebelumnya (←)">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {hasNext && (
            <button onClick={onNext} className="p-2 rounded-lg hover:bg-gray-100 transition" title="Dokumen berikutnya (→)">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* Tandai Sudah Dicek */}
          {!alreadyReviewed ? (
            <button
              onClick={() => onMarkReviewed?.(docKey)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[12px] font-semibold hover:bg-emerald-700 transition"
            >
              <Check className="h-3.5 w-3.5" />
              Tandai Sudah Dicek
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[12px] font-semibold">
              <Check className="h-3.5 w-3.5" />
              Sudah Dicek
            </span>
          )}

          {/* Print */}
          <button
            onClick={handlePrint}
            disabled={!entry?.component}
            title="Cetak dokumen ini"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-[12px] font-semibold hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading || !entry?.component}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-[12px] font-semibold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] justify-center"
          >
            {pdfLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {pdfProgress > 0 ? `${pdfProgress}%` : 'Proses...'}
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar saat generating */}
      {pdfLoading && (
        <div className="no-print h-1 bg-gray-200">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${pdfProgress}%` }}
          />
        </div>
      )}

      {/* Body — scrollable preview area */}
      <div className="flex-1 overflow-auto py-6">
        <div ref={printAreaRef} className="printable-document mx-auto">
          {TemplateComp
            ? <TemplateComp pencairan={pencairan} />
            : <ComingSoonTemplate docKey={docKey} docLabel={docLabel} />}
        </div>
      </div>

      {/* Print-only styles (untuk Ctrl+P fallback) */}
      <style>{`
        @media print {
          @page { size: ${printOrientation}; margin: 0; }
          body * { visibility: hidden; }
          .doc-preview-overlay { position: static !important; background: white !important; backdrop-filter: none !important; }
          .doc-preview-overlay,
          .doc-preview-overlay * { visibility: visible; }
          .no-print { display: none !important; }
          .printable-document {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            margin: 0 !important;
          }
          .doc-sheet {
            box-shadow: none !important;
            margin: 0 !important;
          }
          .doc-sheet--portrait { width: 21cm !important; min-height: 29.7cm !important; }
          .doc-sheet--landscape { width: 29.7cm !important; min-height: 21cm !important; }
        }
      `}</style>
    </div>
  );

  return createPortal(body, document.body);
};

export default DocumentPreviewModal;
