/* eslint-disable react-refresh/only-export-components */
// Shared wrapper untuk semua template dokumen pencairan.
// Memberi styling kertas A4, kop surat, dan area print-safe.

import { forwardRef, createContext, useContext } from 'react';

// Context penanda dokumen masih draft → menampilkan watermark "DRAFT".
// Diisi oleh DocumentPreviewModal (preview/print) & generatePdf (unduh PDF).
export const DraftWatermarkContext = createContext(false);

/**
 * DocumentSheet — wrapper A4 dengan kop surat opsional.
 * @prop {boolean} withKop  - tampilkan kop surat (DINAS PEMBERDAYAAN MASYARAKAT DAN DESA)
 * @prop {string}  modelTag - tag pojok kanan atas (e.g., "Model : Peng 2", "Model : Bend 35")
 * @prop {string}  orientation - portrait | landscape
 * @prop {string}  kopLogoSrc - logo opsional untuk kop surat
 * @prop {React.ReactNode} children
 */
const DocumentSheet = forwardRef(({
  withKop = true,
  modelTag,
  orientation = 'portrait',
  kopLogoSrc,
  children,
  className = '',
  draft,
}, ref) => {
  const isLandscape = orientation === 'landscape';
  const draftCtx = useContext(DraftWatermarkContext);
  const showDraft = draft ?? draftCtx;
  return (
  <div
    ref={ref}
    className={`doc-sheet ${isLandscape ? 'doc-sheet--landscape' : 'doc-sheet--portrait'} bg-white text-black mx-auto shadow-md relative ${className}`}
    style={{
      width: isLandscape ? '29.7cm' : '21cm',
      minHeight: isLandscape ? '21cm' : '29.7cm',
      padding: '1.8cm 2.2cm',
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '11.5pt',
      lineHeight: 1.35,
      boxSizing: 'border-box',
    }}
  >
    {showDraft && (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          pointerEvents: 'none', zIndex: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span
          style={{
            transform: 'rotate(-32deg)',
            fontSize: isLandscape ? '150pt' : '120pt',
            fontWeight: 'bold',
            color: 'rgba(220,38,38,0.13)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            fontFamily: 'Arial, Helvetica, sans-serif',
            userSelect: 'none',
          }}
        >
          DRAFT
        </span>
      </div>
    )}

    {modelTag && (
      <div style={{ position: 'absolute', top: '0.6cm', right: '1.2cm', fontSize: '9.5pt' }}>
        {modelTag}
      </div>
    )}

    {withKop && (
      kopLogoSrc ? (
        /* Kop penuh: logo + alamat + double border — hanya Surat Pesanan */
        <div style={{ textAlign: 'center', borderBottom: '3px double #000', paddingBottom: '4pt', marginBottom: '10pt', position: 'relative' }}>
          <img
            src={kopLogoSrc}
            alt=""
            style={{ position: 'absolute', left: 0, top: '1pt', width: '1.65cm', height: '1.65cm', objectFit: 'contain' }}
          />
          <p style={{ fontWeight: 'bold', fontSize: '14pt', margin: 0 }}>PEMERINTAH KABUPATEN BOGOR</p>
          <p style={{ fontWeight: 'bold', fontSize: '14pt', margin: 0 }}>DINAS PEMBERDAYAAN MASYARAKAT DAN DESA</p>
          <p style={{ fontSize: '10pt', margin: '2pt 0 0 0' }}>
            Jln. KSR. Dadi Kusmayadi - Kelurahan Tengah Telp. (021) 8754102
          </p>
          <p style={{ fontSize: '10pt', margin: 0 }}>
            Fax : (021) 8754102 Cibinong - 16914
          </p>
        </div>
      ) : (
        /* Kop sederhana: kiri, tanpa logo & alamat — sesuai format Excel */
        <div style={{ marginBottom: '8pt' }}>
          <p style={{ fontWeight: 'bold', fontSize: '13pt', margin: 0 }}>PEMERINTAH KABUPATEN BOGOR</p>
          <p style={{ fontSize: '12pt', margin: 0 }}>DINAS PEMBERDAYAAN MASYARAKAT DAN DESA</p>
        </div>
      )
    )}

    {children}
  </div>
  );
});

DocumentSheet.displayName = 'DocumentSheet';

export default DocumentSheet;

// ─── Helpers untuk template (reusable) ────────────────────────────────────────

export const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
    .format(n || 0)
    .replace('Rp', 'Rp ');

export const formatTanggalIndonesia = (d) => {
  if (!d) return '..........................';
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const tahunDuaRibu = (d) => {
  if (!d) return 'Dua Ribu …';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  const tahun = dt.getFullYear();
  const TAHUN_MAP = {
    2024: 'Dua Ribu Dua Puluh Empat',
    2025: 'Dua Ribu Dua Puluh Lima',
    2026: 'Dua Ribu Dua Puluh Enam',
    2027: 'Dua Ribu Dua Puluh Tujuh',
    2028: 'Dua Ribu Dua Puluh Delapan',
    2029: 'Dua Ribu Dua Puluh Sembilan',
    2030: 'Dua Ribu Tiga Puluh',
  };
  return TAHUN_MAP[tahun] || `Dua Ribu ${tahun}`;
};

export const BULAN_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const splitTanggal = (d) => {
  if (!d) return { hari: '..........', tanggal: '..........', bulan: '...........', tahun: 'Dua Ribu …' };
  const dt = new Date(d);
  if (isNaN(dt)) return { hari: '..........', tanggal: '..........', bulan: '...........', tahun: 'Dua Ribu …' };
  const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  return {
    hari: HARI[dt.getDay()],
    tanggal: String(dt.getDate()).padStart(2, '0'),
    bulan: BULAN_INDO[dt.getMonth()],
    tahun: tahunDuaRibu(d),
  };
};

// ─── Inline styles util untuk tabel dokumen ───────────────────────────────────
export const tableStyles = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11pt',
  },
  thBordered: {
    border: '1px solid #000',
    padding: '4pt 6pt',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '10.5pt',
  },
  tdBordered: {
    border: '1px solid #000',
    padding: '4pt 6pt',
    verticalAlign: 'top',
  },
};

// ─── Signature block component ────────────────────────────────────────────────
export const SignatureBlock = ({ title, sub, name, nip, align = 'center', minWidth = '40%' }) => (
  <div style={{ textAlign: align, minWidth, display: 'inline-block', verticalAlign: 'top', padding: '0 8pt' }}>
    {title && <p style={{ margin: 0, fontSize: '11pt' }}>{title}</p>}
    {sub && <p style={{ margin: 0, fontSize: '10.5pt' }}>{sub}</p>}
    <div style={{ height: '60pt' }} />
    <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', fontSize: '11pt' }}>
      {name || '…………………………………………'}
    </p>
    {nip && <p style={{ margin: '2pt 0 0 0', fontSize: '10.5pt' }}>NIP. {nip}</p>}
  </div>
);
