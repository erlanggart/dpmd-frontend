import { API_ENDPOINTS } from '../../../../config/apiConfig';

// Backend menyimpan path relatif (storage/uploads/arsip-barang/x.webp),
// disajikan lewat mount /storage — bukan di bawah /api.
const STORAGE_BASE = API_ENDPOINTS.EXPRESS_BASE.replace(/\/api\/?$/, '');

export const fotoUrl = (path) => (path ? `${STORAGE_BASE}/${path}` : null);

export const KONDISI = {
  baik: { label: 'Baik', chip: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  rusak_ringan: { label: 'Rusak Ringan', chip: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  rusak_berat: { label: 'Rusak Berat', chip: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' }
};

export const SUMBER_DANA = {
  apbd: 'APBD',
  apbn: 'APBN',
  hibah: 'Hibah',
  lainnya: 'Lainnya'
};

export const formatRupiah = (nilai) => {
  if (nilai === null || nilai === undefined || nilai === '') return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(nilai));
};

export const formatTanggal = (tanggal) => {
  if (!tanggal) return '-';
  const d = new Date(tanggal);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatWaktu = (tanggal) => {
  if (!tanggal) return '-';
  const d = new Date(tanggal);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

/**
 * Cetak label satuan sebagai PDF 70×40mm — ukuran stiker label barang yang umum.
 * QR memuat URL permanen; kode barang tetap dicetak sebagai teks agar barang
 * masih bisa diidentifikasi manual kalau QR rusak/terkelupas.
 */
export const cetakLabelPdf = async (label) => {
  const { default: jsPDF } = await import('jspdf');

  const LEBAR = 70;
  const TINGGI = 40;
  const doc = new jsPDF({ unit: 'mm', format: [LEBAR, TINGGI], orientation: 'landscape' });

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.roundedRect(1.5, 1.5, LEBAR - 3, TINGGI - 3, 1.5, 1.5);

  doc.addImage(label.qr_data_url, 'PNG', 3.5, 7.5, 25, 25);

  const xTeks = 31;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('DPMD KABUPATEN BOGOR', xTeks, 8);

  doc.setDrawColor(120);
  doc.setLineWidth(0.2);
  doc.line(xTeks, 9.5, LEBAR - 4, 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const nama = doc.splitTextToSize(label.nama || '-', LEBAR - xTeks - 5).slice(0, 2);
  doc.text(nama, xTeks, 13.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(label.kode_barang, xTeks, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(110);
  const lokasi = label.lokasi ? doc.splitTextToSize(label.lokasi, LEBAR - xTeks - 5).slice(0, 1) : null;
  if (lokasi) doc.text(lokasi, xTeks, 28);
  doc.text('Pindai QR untuk data barang', xTeks, 32.5);

  doc.save(`Label-${label.kode_barang}.pdf`);
};
