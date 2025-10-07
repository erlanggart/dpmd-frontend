import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Modern Professional PDF Export with enhanced visual design
export const exportToPDF = (data, title = "Data Kegiatan Perjalanan Dinas") => {
  try {
    // Validate input data
    if (!data || !Array.isArray(data)) {
      throw new Error('Data tidak valid atau kosong');
    }
    
    if (data.length === 0) {
      throw new Error('Tidak ada data untuk diekspor');
    }
    
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for better table layout
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15; // Reduced margin for more space
    
    // Compact modern header background
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Accent stripe
    doc.setFillColor(59, 130, 246); // Blue-500
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    // Logo placeholder circle (smaller)
    doc.setFillColor(255, 255, 255);
    doc.circle(22, 16, 6, 'F');
    doc.setFillColor(59, 130, 246);
    doc.circle(22, 16, 4, 'F');
    
    // Main title with compact typography
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(title.toUpperCase(), pageWidth/2, 18, { align: 'center' });
    
    // Organization subtitle with compact spacing
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(203, 213, 225); // Slate-300
    doc.text('DINAS PEMBERDAYAAN MASYARAKAT DESA', pageWidth/2, 28, { align: 'center' });
    
    // Compact info section
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { 
      day: '2-digit',
      month: 'short', 
      year: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    // Compact info cards background
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.roundedRect(margin, 32, (pageWidth - 2*margin)/2 - 5, 10, 1, 1, 'F');
    doc.roundedRect(pageWidth/2 + 5, 32, (pageWidth - 2*margin)/2 - 5, 10, 1, 1, 'F');
    
    // Compact info text
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('TANGGAL CETAK', margin + 3, 36);
    doc.text('TOTAL DATA', pageWidth/2 + 8, 36);
    
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`${dateStr}, ${timeStr} WIB`, margin + 3, 40);
    doc.text(`${data.length} kegiatan`, pageWidth/2 + 8, 40);
    
    // Enhanced table data with modern formatting and safe property access
    const tableData = data.map((item, index) => {
      // Ensure item is an object
      const safeItem = item || {};
      
      return [
        index + 1,
        safeItem.nomor_sp || '-',
        safeItem.nama_kegiatan || '-',
        safeItem.lokasi || '-',
        (() => {
          try {
            return safeItem.tanggal_mulai ? new Date(safeItem.tanggal_mulai).toLocaleDateString('id-ID', {
              day: '2-digit', month: 'short', year: '2-digit'
            }) : '-';
          } catch {
            return '-';
          }
        })(),
        (() => {
          try {
            return safeItem.tanggal_selesai ? new Date(safeItem.tanggal_selesai).toLocaleDateString('id-ID', {
              day: '2-digit', month: 'short', year: '2-digit'
            }) : '-';
          } catch {
            return '-';
          }
        })(),
        safeItem.personil_list || '-',
        safeItem.bidang_list || '-'
      ];
    });
    
    // Modern table with enhanced visual styling
    autoTable(doc, {
      head: [['No', 'Nomor SP', 'Nama Kegiatan', 'Lokasi', 'Tgl Mulai', 'Tgl Selesai', 'Personil Terlibat', 'Bidang']],
      body: tableData,
      startY: 50,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },   // No
        1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },  // Nomor SP  
        2: { cellWidth: 55, halign: 'left' },    // Nama Kegiatan
        3: { cellWidth: 25, halign: 'left' },    // Lokasi
        4: { cellWidth: 15, halign: 'center' },  // Tgl Mulai
        5: { cellWidth: 15, halign: 'center' },  // Tgl Selesai
        6: { cellWidth: 45, halign: 'left' },    // Personil - Wider for names
        7: { cellWidth: 63, halign: 'left' }     // Bidang
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 3,
        valign: 'top',
        lineColor: [226, 232, 240], // Slate-200
        lineWidth: 0.5,
        textColor: [51, 65, 85], // Slate-700
        overflow: 'linebreak',
        cellWidth: 'wrap',
        lineHeight: 1.3,
        minCellWidth: 10
      },
      headStyles: {
        fillColor: [59, 130, 246], // Blue-500
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: 5
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate-50
      },
      rowStyles: {
        minCellHeight: 18
      },
      theme: 'grid',
      tableWidth: 'auto',
      showHead: 'everyPage',
      tableLineColor: [226, 232, 240], // Slate-200
      tableLineWidth: 0.5,
      didDrawPage: function (data) {
        // Modern footer design
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        
        // Compact footer background
        doc.setFillColor(248, 250, 252); // Slate-50
        doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');
        
        // Footer accent line
        doc.setFillColor(59, 130, 246); // Blue-500
        doc.rect(0, pageHeight - 18, pageWidth, 1.5, 'F');
        
        // Compact footer content
        doc.setTextColor(71, 85, 105); // Slate-600
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        
        // Left side - document info (compact)
        doc.text('Dokumen otomatis - Sistem DPMD', 15, pageHeight - 12);
        
        // Center - generation timestamp (compact)
        const currentDate = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
        const currentTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        doc.text(`${currentDate}, ${currentTime}`, pageWidth/2, pageHeight - 12, { align: 'center' });
        
        // Right side - page info (compact)
        doc.setFont(undefined, 'bold');
        doc.text(`Hal. ${data.pageNumber || 1}`, pageWidth - 15, pageHeight - 12, { align: 'right' });
        
        // Bottom copyright (compact)
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(`© ${new Date().getFullYear()} DPMD`, pageWidth/2, pageHeight - 6, { align: 'center' });
      }
    });
    
    // Generate filename with better timestamp format
    const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-').replace('T', '_');
    const filename = `DPMD_Kegiatan_Perjadin_${timestamp}.pdf`;
    doc.save(filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error('Gagal mengekspor ke PDF: ' + error.message);
  }
};

// Modern Excel Export with Enhanced Formatting
export const exportToExcel = (data, title = "Data Kegiatan Perjalanan Dinas") => {
  try {
    // Validate input data
    if (!data || !Array.isArray(data)) {
      throw new Error('Data tidak valid atau kosong');
    }
    
    if (data.length === 0) {
      throw new Error('Tidak ada data untuk diekspor');
    }
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    // Create modern worksheet data structure
    const wsData = [
      // Header section with professional styling
      [title.toUpperCase()],
      ['DINAS PEMBERDAYAAN MASYARAKAT DESA'],
      [''],
      [`📅 Tanggal Cetak: ${dateStr}, ${timeStr} WIB`],
      [`📊 Total Data: ${data.length} kegiatan perjalanan dinas`],
      [''],
      [''],
      // Table headers with enhanced naming
      ['No', 'Nomor SP', 'Nama Kegiatan', 'Lokasi Tujuan', 'Tanggal Mulai', 'Tanggal Selesai', 'Personil Terlibat', 'Bidang Terlibat', 'Status'],
      // Data rows with improved formatting and safe property access
      ...data.map((item, index) => {
        // Ensure item is an object
        const safeItem = item || {};
        
        return [
          index + 1,
          safeItem.nomor_sp || '-',
          safeItem.nama_kegiatan || '-',
          safeItem.lokasi || '-',
          (() => {
            try {
              return safeItem.tanggal_mulai ? new Date(safeItem.tanggal_mulai).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric'
              }) : '-';
            } catch {
              return '-';
            }
          })(),
          (() => {
            try {
              return safeItem.tanggal_selesai ? new Date(safeItem.tanggal_selesai).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric'
              }) : '-';
            } catch {
              return '-';
            }
          })(),
          safeItem.personil_list || '-',
          safeItem.bidang_list || '-',
          'Aktif'
        ];
      })
    ];
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Enhanced column widths for better readability
    ws['!cols'] = [
      { width: 6 },   // No
      { width: 18 },  // Nomor SP
      { width: 35 },  // Nama Kegiatan
      { width: 25 },  // Lokasi
      { width: 15 },  // Tanggal Mulai
      { width: 15 },  // Tanggal Selesai
      { width: 40 },  // Personil - Wider for names
      { width: 35 },  // Bidang
      { width: 12 }   // Status
    ];
    
    // Add worksheet to workbook with professional name
    XLSX.utils.book_append_sheet(wb, ws, "Data Kegiatan Perjadin");
    
    // Generate modern filename
    const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-').replace('T', '_');
    const filename = `DPMD_Kegiatan_Perjadin_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting Excel:', error);
    throw new Error('Gagal mengekspor ke Excel: ' + error.message);
  }
};

// Format data for export with safe property access
export const formatDataForExport = (rawData) => {
  // Validate input data
  if (!rawData || !Array.isArray(rawData)) {
    console.warn('formatDataForExport: Invalid or empty data provided');
    return [];
  }
  
  return rawData.map(item => {
    // Ensure item is an object
    const safeItem = item || {};
    
    return {
      ...safeItem,
      personil_count: (() => {
        try {
          if (!safeItem.details || !Array.isArray(safeItem.details)) {
            return 0;
          }
          return safeItem.details.reduce((sum, detail) => {
            if (!detail || typeof detail !== 'object') return sum;
            const personilArray = detail.personil ? 
              String(detail.personil).split(', ').filter(p => p && p.trim()) : [];
            return sum + personilArray.length;
          }, 0);
        } catch (error) {
          console.warn('Error calculating personil_count:', error);
          return 0;
        }
      })(),
      personil_list: (() => {
        try {
          if (!safeItem.details || !Array.isArray(safeItem.details)) {
            return '-';
          }
          const allPersonil = [];
          safeItem.details.forEach(detail => {
            if (detail && typeof detail === 'object' && detail.personil) {
              const personilArray = String(detail.personil).split(', ').filter(p => p && p.trim());
              allPersonil.push(...personilArray);
            }
          });
          return allPersonil.length > 0 ? allPersonil.join(', ') : '-';
        } catch (error) {
          console.warn('Error formatting personil_list:', error);
          return '-';
        }
      })(),
      bidang_list: (() => {
        try {
          if (!safeItem.details || !Array.isArray(safeItem.details)) {
            return '-';
          }
          const bidangNames = safeItem.details
            .map(detail => {
              if (!detail || typeof detail !== 'object') return null;
              return detail.bidang_nama || (detail.bidang && detail.bidang.nama) || null;
            })
            .filter(Boolean);
          return bidangNames.length > 0 ? bidangNames.join(', ') : '-';
        } catch (error) {
          console.warn('Error formatting bidang_list:', error);
          return '-';
        }
      })()
    };
  });
};

// Export utilities with loading states and progress tracking
export const exportWithProgress = async (exportFunction, data, title) => {
  try {
    const result = await exportFunction(data, title);
    
    // Handle different return types (legacy boolean and modern object)
    if (typeof result === 'object' && result.success) {
      return {
        success: true,
        message: `Export berhasil! File ${result.filename} telah diunduh.`,
        filename: result.filename
      };
    } else if (result === true) {
      return {
        success: true,
        message: 'Export berhasil! File telah diunduh.'
      };
    } else {
      throw new Error('Export gagal: hasil tidak valid');
    }
  } catch (error) {
    console.error('Export with progress error:', error);
    return {
      success: false,
      message: error.message || 'Terjadi kesalahan saat mengekspor data'
    };
  }
};