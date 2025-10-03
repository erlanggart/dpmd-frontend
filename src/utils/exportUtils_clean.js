import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Enhanced PDF Export
export const exportToPDF = (data, title = "Data Kegiatan Perjalanan Dinas") => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    
    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(title, pageWidth/2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID');
    doc.text(`Dicetak: ${dateStr}`, pageWidth/2, 28, { align: 'center' });
    
    // Table data
    const tableData = data.map((item, index) => [
      index + 1,
      item.nomor_sp || '-',
      item.nama_kegiatan || '-',
      item.lokasi || '-',
      new Date(item.tanggal_mulai).toLocaleDateString('id-ID'),
      new Date(item.tanggal_selesai).toLocaleDateString('id-ID'),
      item.personil_count || '0',
      item.bidang_list || '-'
    ]);
    
    doc.autoTable({
      head: [['No', 'Nomor SP', 'Nama Kegiatan', 'Lokasi', 'Tgl Mulai', 'Tgl Selesai', 'Personil', 'Bidang']],
      body: tableData,
      startY: 45,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 6
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    doc.save(`kegiatan-perjadin-${timestamp}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error('Gagal mengekspor ke PDF: ' + error.message);
  }
};

// Enhanced Excel Export
export const exportToExcel = (data, title = "Data Kegiatan Perjalanan Dinas") => {
  try {
    const wsData = [
      [title],
      [`Dicetak: ${new Date().toLocaleDateString('id-ID')}`],
      [''],
      ['No', 'Nomor SP', 'Nama Kegiatan', 'Lokasi', 'Tanggal Mulai', 'Tanggal Selesai', 'Jumlah Personil', 'Bidang Terlibat', 'Keterangan'],
      ...data.map((item, index) => [
        index + 1,
        item.nomor_sp || '-',
        item.nama_kegiatan || '-',
        item.lokasi || '-',
        new Date(item.tanggal_mulai).toLocaleDateString('id-ID'),
        new Date(item.tanggal_selesai).toLocaleDateString('id-ID'),
        item.personil_count || 0,
        item.bidang_list || '-',
        item.keterangan || '-'
      ])
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    ws['!cols'] = [
      { width: 5 },
      { width: 15 },
      { width: 30 },
      { width: 20 },
      { width: 12 },
      { width: 12 },
      { width: 10 },
      { width: 20 },
      { width: 25 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Kegiatan Perjadin");
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    XLSX.writeFile(wb, `kegiatan-perjadin-${timestamp}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Error exporting Excel:', error);
    throw new Error('Gagal mengekspor ke Excel: ' + error.message);
  }
};

// Format data for export
export const formatDataForExport = (rawData) => {
  return rawData.map(item => ({
    ...item,
    personil_count: item.details ? item.details.reduce((sum, detail) => {
      const personilArray = detail.personil ? detail.personil.split(', ').filter(p => p.trim()) : [];
      return sum + personilArray.length;
    }, 0) : 0,
    bidang_list: item.details ? item.details.map(detail => detail.bidang_nama || detail.bidang?.nama).filter(Boolean).join(', ') : '-'
  }));
};

// Export utilities with loading states
export const exportWithProgress = async (exportFunction, data, title) => {
  try {
    const result = await exportFunction(data, title);
    return {
      success: true,
      message: 'Export berhasil! File telah diunduh.'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Terjadi kesalahan saat mengekspor data'
    };
  }
};