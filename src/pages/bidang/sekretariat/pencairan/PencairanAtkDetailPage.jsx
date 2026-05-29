import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, Eye, Edit2, Printer, Package,
  Calendar, Building2, Users, FileText, CheckCircle2,
  Loader2, AlertCircle, Send, XCircle, Clock, FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../api';
import DocumentPreviewModal from '../../../../components/pencairan/preview/DocumentPreviewModal';
import { TEMPLATE_REGISTRY } from '../../../../components/pencairan/preview/templateRegistry';
import { generatePdf } from '../../../../utils/generatePdf';

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

// hasTemplate: true berarti template HTML sudah dibuat & bisa di-preview
const DOKUMEN_LIST = [
  { key: 'pesanan',          label: 'Surat Pesanan',         desc: 'Pesanan barang ke penyedia',                        icon: FileText, color: 'blue',   hasTemplate: true  },
  { key: 'faktur',           label: 'Faktur',                desc: 'Faktur penagihan dari penyedia',                    icon: FileText, color: 'cyan',   hasTemplate: true  },
  { key: 'kwitansi',         label: 'Kwitansi',              desc: 'Tanda terima pembayaran',                           icon: FileText, color: 'green',  hasTemplate: true  },
  { key: 'ba_pemeriksaan',   label: 'BA Pemeriksaan',        desc: 'Berita Acara Pemeriksaan (Peng 2)',                 icon: FileText, color: 'amber',  hasTemplate: true  },
  { key: 'lamp_pemeriksaan', label: 'Lampiran Pemeriksaan',  desc: 'Detail barang yang diperiksa',                      icon: FileText, color: 'amber',  hasTemplate: true  },
  { key: 'bast',             label: 'BAST',                  desc: 'Berita Acara Serah Terima Pekerjaan',               icon: FileText, color: 'purple', hasTemplate: true  },
  { key: 'lampiran_bast',    label: 'Lampiran BAST',         desc: 'Detail serah terima barang',                        icon: FileText, color: 'purple', hasTemplate: true  },
  { key: 'basthp',           label: 'BASTHP',                desc: 'BA Serah Terima Hasil Pekerjaan (Peng 3)',          icon: FileText, color: 'pink',   hasTemplate: true  },
  { key: 'bend35',           label: 'Bend 35',               desc: 'Perintah Penerimaan/Pengeluaran',                   icon: FileText, color: 'orange', hasTemplate: true  },
  { key: 'bend29',           label: 'Bend 29',               desc: 'Bukti Barang dari Gudang',                          icon: FileText, color: 'orange', hasTemplate: true  },
];

const LS_REVIEW_KEY = (pencairanId) => `pencairan_reviewed_docs_${pencairanId}`;

const colorMap = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-200/50',
  cyan: 'from-cyan-500 to-cyan-600 shadow-cyan-200/50',
  green: 'from-green-500 to-emerald-600 shadow-green-200/50',
  amber: 'from-amber-500 to-orange-500 shadow-amber-200/50',
  purple: 'from-purple-500 to-pink-500 shadow-purple-200/50',
  pink: 'from-pink-500 to-rose-500 shadow-pink-200/50',
  orange: 'from-orange-500 to-red-500 shadow-orange-200/50',
};

const StatusPill = ({ status }) => {
  const map = {
    draft: { label: 'Draft', cls: 'bg-amber-400 text-amber-950' },
    finalized: { label: 'FINAL', cls: 'bg-emerald-400 text-emerald-950' },
    cancelled: { label: 'Dibatalkan', cls: 'bg-rose-400 text-rose-950' },
  };
  const c = map[status] || { label: status, cls: 'bg-gray-300 text-gray-800' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${c.cls} text-[10.5px] font-bold`}>
      <CheckCircle2 className="h-3 w-3" />
      {c.label}
    </span>
  );
};

// Helper badge status dokumen
const dokStatusBadge = (disabled, reviewed) => {
  if (disabled) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-gray-100 text-gray-500 shrink-0">
      <Clock className="h-2.5 w-2.5" />Tunggu Final
    </span>
  );
  if (reviewed) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
      <CheckCircle2 className="h-2.5 w-2.5" />Sudah Dicek
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-700 shrink-0">
      <AlertCircle className="h-2.5 w-2.5" />Belum Dicek
    </span>
  );
};

// List row — lebih kompak dari card
const DokumenRow = ({ dok, disabled, reviewed, isPdfLoading, onPreview, onDownload }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
    disabled ? 'opacity-60 border-gray-100 bg-gray-50/30' :
    reviewed ? 'border-emerald-200 bg-emerald-50/20' :
    'border-gray-100 bg-white hover:border-teal-200 hover:shadow-sm'
  }`}>
    {/* Icon */}
    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${colorMap[dok.color]} flex items-center justify-center shadow-sm shrink-0 relative`}>
      <dok.icon className="h-4 w-4 text-white" />
      {reviewed && (
        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
          <CheckCircle2 className="h-2 w-2 text-white" />
        </div>
      )}
    </div>
    {/* Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[13px] font-semibold text-gray-900 leading-tight">{dok.label}</span>
        {!dok.hasTemplate && (
          <span className="text-[8.5px] bg-gray-200 text-gray-600 px-1 py-0 rounded font-semibold">SEGERA</span>
        )}
        {dokStatusBadge(disabled, reviewed)}
      </div>
      <p className="text-[11px] text-gray-500 leading-snug truncate">{dok.desc}</p>
    </div>
    {/* Actions */}
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        disabled={disabled}
        onClick={() => onPreview(dok)}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-[11.5px] font-medium hover:bg-gray-200 transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Eye className="h-3.5 w-3.5" />Preview
      </button>
      <button
        disabled={disabled || !reviewed || isPdfLoading}
        onClick={() => onDownload(dok)}
        title={disabled ? 'Finalisasi dulu' : !reviewed ? 'Preview & cek dulu' : 'Download PDF'}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-[11.5px] font-semibold hover:bg-teal-700 transition disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 min-w-[70px] justify-center"
      >
        {isPdfLoading
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />...</>
          : <><Download className="h-3.5 w-3.5" />PDF</>}
      </button>
    </div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-2 text-[11.5px]">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className="text-gray-800 font-medium text-right">{value || '—'}</span>
  </div>
);

const PencairanAtkDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  // Track dokumen yang sudah dipreview & disetujui (per pencairan_id)
  const [reviewedDocs, setReviewedDocs] = useState(() => new Set());
  // Modal preview state
  const [previewIdx, setPreviewIdx] = useState(null);       // index ke DOKUMEN_LIST
  const [pdfLoading, setPdfLoading] = useState({});         // { [docKey]: true/false }

  // Load reviewed docs dari localStorage
  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(LS_REVIEW_KEY(id));
      if (raw) setReviewedDocs(new Set(JSON.parse(raw)));
    } catch { /* noop */ }
  }, [id]);

  // Persist reviewed docs ke localStorage
  useEffect(() => {
    if (!id) return;
    try {
      localStorage.setItem(LS_REVIEW_KEY(id), JSON.stringify([...reviewedDocs]));
    } catch { /* noop */ }
  }, [id, reviewedDocs]);

  const handleMarkReviewed = useCallback((docKey) => {
    setReviewedDocs(prev => {
      const next = new Set(prev);
      next.add(docKey);
      return next;
    });
    toast.success('Dokumen ditandai sudah dicek');
  }, []);

  const handlePreview = useCallback((dok) => {
    const idx = DOKUMEN_LIST.findIndex(d => d.key === dok.key);
    if (idx >= 0) setPreviewIdx(idx);
  }, []);

  const handleDownloadPdf = useCallback(async (dok) => {
    const entry = TEMPLATE_REGISTRY[dok.key];
    if (!entry?.component) {
      toast.error('Template dokumen belum tersedia');
      return;
    }
    setPdfLoading(prev => ({ ...prev, [dok.key]: true }));
    try {
      await generatePdf(entry.component, data, {
        orientation: entry.orientation || 'portrait',
        filename: `${dok.label} - ${data?.no_pesanan_b || data?.id}`,
      });
      toast.success(`${dok.label} berhasil diunduh`);
    } catch (err) {
      console.error(err);
      toast.error(`Gagal generate PDF: ${err.message}`);
    } finally {
      setPdfLoading(prev => ({ ...prev, [dok.key]: false }));
    }
  }, [data]);

  const handleDownloadExcel = useCallback(async () => {
    setExcelLoading(true);
    try {
      const res = await api.get(`/pencairan/${id}/excel`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const noDok = (data?.no_pesanan_b || `pencairan-${id}`).replace(/[/\\:*?"<>|]/g, '-');
      link.download = `File Pencairan ATK - ${noDok}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('File Excel berhasil diunduh');
    } catch (err) {
      console.error(err);
      toast.error('Gagal generate Excel');
    } finally {
      setExcelLoading(false);
    }
  }, [id, data]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/pencairan/${id}`);
      setData(res.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat detail pencairan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFinalize = async () => {
    if (!window.confirm('Setelah difinalisasi, pencairan tidak bisa diubah. Lanjutkan?')) return;
    setActionLoading(true);
    try {
      await api.post(`/pencairan/${id}/finalize`);
      toast.success('Pencairan berhasil difinalisasi');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal finalisasi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Batalkan pencairan ini?')) return;
    setActionLoading(true);
    try {
      await api.post(`/pencairan/${id}/cancel`);
      toast.success('Pencairan dibatalkan');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal membatalkan');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Pencairan tidak ditemukan</p>
          <button onClick={() => navigate(-1)} className="text-sm text-teal-700 hover:underline">
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  const d = data;
  const isDraft = d.status === 'draft';
  const isFinalized = d.status === 'finalized';
  const docsDisabled = !isFinalized;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-white to-emerald-50/30 p-4 sm:p-6">
      <div className="w-full">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-teal-700 mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-teal-200/30 mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10.5px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                  Pencairan {d.jenis_pencairan?.toUpperCase()} #{d.id}
                </span>
                <StatusPill status={d.status} />
              </div>
              <p className="font-mono text-lg font-bold">{d.no_pesanan_b || `#${d.id}`}</p>
              <p className="text-[13px] opacity-95 mt-2 leading-snug max-w-2xl">{d.uraian_kegiatan || '—'}</p>
              <div className="flex items-center gap-4 mt-3 text-[12px] opacity-90 flex-wrap">
                {d.tgl_pesanan && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(d.tgl_pesanan).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                )}
                {d.penyedia && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {d.penyedia.nama}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  {d.items?.length || 0} item
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] opacity-80 uppercase font-bold">Total Pencairan</p>
              <p className="text-3xl font-bold mt-1">{formatRupiah(d.total_nilai)}</p>
              {d.total_terbilang && <p className="text-[11px] opacity-90 mt-1 italic">{d.total_terbilang}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/20 flex-wrap">
            <button
              onClick={handleDownloadExcel}
              disabled={!isFinalized || excelLoading}
              title={!isFinalized ? 'Finalisasi pencairan dulu' : 'Download File Pencairan ATK (Excel siap print)'}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-teal-700 rounded-lg text-[13px] font-semibold hover:bg-teal-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {excelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {excelLoading ? 'Membuat Excel...' : 'Download Excel'}
            </button>
            {isDraft && (
              <>
                <button
                  onClick={() => navigate('edit', { relative: 'path' })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 text-white rounded-lg text-[13px] font-medium hover:bg-white/25 transition"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-400 text-emerald-950 rounded-lg text-[13px] font-bold hover:bg-emerald-300 transition disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Finalisasi
                </button>
              </>
            )}
            {!isFinalized && (
              <button
                onClick={handleCancel}
                disabled={actionLoading || d.status === 'cancelled'}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 text-white rounded-lg text-[13px] font-medium hover:bg-rose-500/30 transition disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Batalkan
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 text-white rounded-lg text-[13px] font-medium hover:bg-white/25 transition"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* ── Bento layout: kiri (items + dokumen) | kanan (info cards) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">

          {/* ── Kolom kiri ── */}
          <div className="space-y-5">

        {/* Items */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-600" />
              <h3 className="text-[13px] font-semibold text-gray-900">Detail Barang ({(d.items || []).length})</h3>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10.5px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left">No</th>
                <th className="px-4 py-2.5 text-left">Nama Barang</th>
                <th className="px-4 py-2.5 text-center">Qty</th>
                <th className="px-4 py-2.5 text-left">Satuan</th>
                <th className="px-4 py-2.5 text-right">Harga Satuan</th>
                <th className="px-4 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(d.items || []).map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-2 text-gray-800">{item.nama_barang}</td>
                  <td className="px-4 py-2 text-center text-gray-700">{Number(item.qty)}</td>
                  <td className="px-4 py-2 text-gray-600">{item.satuan}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatRupiah(item.harga_satuan)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-emerald-700">{formatRupiah(item.total)}</td>
                </tr>
              ))}
              <tr className="bg-teal-50">
                <td colSpan="5" className="px-4 py-2.5 text-right font-bold text-teal-800 uppercase text-[11px]">Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-lg text-teal-900">{formatRupiah(d.total_nilai)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Dokumen Generator */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-600" />
                Dokumen Pencairan ({DOKUMEN_LIST.length})
              </h3>
              <p className="text-[11.5px] text-gray-500 mt-0.5">
                {isFinalized
                  ? 'Preview setiap dokumen dulu untuk dicek, baru bisa download PDF'
                  : 'Dokumen baru tersedia setelah pencairan difinalisasi'}
              </p>
            </div>
            {!isFinalized ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10.5px] font-semibold">
                <AlertCircle className="h-3 w-3" />
                Belum final
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {reviewedDocs.size} / {DOKUMEN_LIST.length} sudah dicek
              </span>
            )}
          </div>

          {/* Review progress */}
          {isFinalized && reviewedDocs.size < DOKUMEN_LIST.length && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-[12px] text-blue-900">
                <p className="font-semibold">Cek dokumen satu-persatu sebelum generate PDF</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Klik <strong>Preview</strong> di tiap kartu dokumen, periksa isi & format, lalu klik tombol{' '}
                  <strong>"Tandai Sudah Dicek"</strong> di header preview. Tombol PDF akan aktif setelah dokumen dicek.
                </p>
              </div>
            </div>
          )}
          {isFinalized && reviewedDocs.size === DOKUMEN_LIST.length && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-[12px] text-emerald-900">
                <p className="font-semibold">Semua dokumen sudah dicek!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Anda bisa download PDF per dokumen atau "Download Semua (ZIP)" untuk paket lengkap.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {DOKUMEN_LIST.map(dok => (
              <DokumenRow
                key={dok.key}
                dok={dok}
                disabled={docsDisabled}
                reviewed={reviewedDocs.has(dok.key)}
                isPdfLoading={!!pdfLoading[dok.key]}
                onPreview={handlePreview}
                onDownload={handleDownloadPdf}
              />
            ))}
          </div>
        </div>
          </div>{/* end kolom kiri */}

          {/* ── Kolom kanan: info cards ── */}
          <div className="space-y-4">

            {/* Penyedia */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-blue-600" />
                <h3 className="text-[13px] font-semibold text-gray-900">Penyedia</h3>
              </div>
              {d.penyedia ? (
                <>
                  <p className="font-semibold text-gray-900 text-sm">{d.penyedia.nama}</p>
                  {d.penyedia.alamat && <p className="text-[11.5px] text-gray-600 mt-1.5 leading-snug">{d.penyedia.alamat}</p>}
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                    <InfoRow label={d.penyedia.jabatan_direktur || 'Direktur'} value={d.penyedia.nama_direktur} />
                    <InfoRow label="Rekening" value={d.penyedia.no_rekening} />
                    <InfoRow label="Bank" value={d.penyedia.nama_bank} />
                    {d.penyedia.npwp && <InfoRow label="NPWP" value={d.penyedia.npwp} />}
                  </div>
                </>
              ) : (
                <p className="text-[11.5px] text-gray-400 italic">Tidak ada data penyedia</p>
              )}
            </div>

            {/* Pejabat */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-purple-600" />
                <h3 className="text-[13px] font-semibold text-gray-900">Pejabat</h3>
              </div>
              <div className="space-y-2">
                {[
                  ['PPK', d.ppk],
                  ['KPA', d.kpa],
                  ['PPTK', d.pptk],
                  ['Bendahara', d.bendahara],
                  ['Pengurus Barang', d.pengurus_barang],
                  ['Atasan PB', d.atasan_pengurus_barang],
                ].map(([role, u]) => (
                  <InfoRow key={role} label={role} value={u?.name} />
                ))}
              </div>
            </div>

            {/* Tim Pemeriksa */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                <h3 className="text-[13px] font-semibold text-gray-900">Tim Pemeriksa</h3>
              </div>
              {(d.pemeriksa || []).length === 0 ? (
                <p className="text-[11.5px] text-gray-400 italic">Belum ditugaskan</p>
              ) : (
                <div className="space-y-2">
                  {d.pemeriksa.map((t, idx) => (
                    <div key={idx} className="text-[11.5px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                          t.peran === 'ketua' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>{t.peran === 'ketua' ? 'KETUA' : 'ANGGOTA'}</span>
                        <p className="font-semibold text-gray-800 leading-tight">{t.user?.name}</p>
                      </div>
                      {t.user?.nip && <p className="text-[10.5px] text-gray-500 font-mono mt-0.5 ml-1">NIP. {t.user.nip}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>{/* end kolom kanan */}

        </div>{/* end bento grid */}
      </div>{/* end w-full */}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={previewIdx !== null}
        onClose={() => setPreviewIdx(null)}
        docKey={previewIdx !== null ? DOKUMEN_LIST[previewIdx].key : null}
        docLabel={previewIdx !== null ? DOKUMEN_LIST[previewIdx].label : ''}
        pencairan={d}
        alreadyReviewed={previewIdx !== null && reviewedDocs.has(DOKUMEN_LIST[previewIdx].key)}
        onMarkReviewed={handleMarkReviewed}
        onPrev={() => setPreviewIdx(i => Math.max(0, i - 1))}
        onNext={() => setPreviewIdx(i => Math.min(DOKUMEN_LIST.length - 1, i + 1))}
        hasPrev={previewIdx !== null && previewIdx > 0}
        hasNext={previewIdx !== null && previewIdx < DOKUMEN_LIST.length - 1}
      />
    </div>
  );
};

export default PencairanAtkDetailPage;
