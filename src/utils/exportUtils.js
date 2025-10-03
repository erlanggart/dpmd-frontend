import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// 🎨 Enhanced PDF Export with Modern Styling
export const exportToPDF = (data, title = "Data Kegiatan Perjalanan Dinas") => {
  try {
    const doc = new jsPDF();
    
    // 📋 Header Configuration
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    
    // 🎨 Modern Header Design
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // 🏢 Add Logo Area (placeholder)
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 17, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('DPMD', 25, 20, { align: 'center' });
    
    // 📄 Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(title, pageWidth/2, 20, { align: 'center' });
    
    // 📅 Date and Time
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Dicetak: ${dateStr}`, pageWidth/2, 28, { align: 'center' });
    
    // 📊 Prepare table data
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
    
    // 🎨 Enhanced Table Styling
    doc.autoTable({
      head: [['No', 'Nomor SP', 'Nama Kegiatan', 'Lokasi', 'Tgl Mulai', 'Tgl Selesai', 'Personil', 'Bidang']],
      body: tableData,
      startY: 45,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 6,
        font: 'helvetica',
        textColor: [51, 65, 85], // slate-600
        lineColor: [226, 232, 240], // slate-200
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 25 },
        2: { cellWidth: 45 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { halign: 'center', cellWidth: 20 },
        7: { cellWidth: 30 },
      },
      didDrawPage: function(data) {
        // 📄 Footer
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(
          `Halaman ${data.pageNumber}`,
          pageWidth - margin,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
        
        // 🏢 Organization footer
        doc.text(
          'Dinas Pemberdayaan Masyarakat dan Desa',
          margin,
          doc.internal.pageSize.height - 10
        );
      }
    });
    
    // 💾 Save with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    doc.save(`kegiatan-perjadin-${timestamp}.pdf`);
    
    return true;
  } catch (error) {
    console.error('❌ Error exporting PDF:', error);
    throw new Error('Gagal mengekspor ke PDF: ' + error.message);
  }
};\n\n// 📊 Enhanced Excel Export with Modern Formatting\nexport const exportToExcel = (data, title = \"Data Kegiatan Perjalanan Dinas\") => {\n  try {\n    // 📋 Prepare worksheet data\n    const wsData = [\n      // 📄 Header rows\n      [title],\n      [`Dicetak: ${new Date().toLocaleDateString('id-ID', { \n        weekday: 'long', \n        year: 'numeric', \n        month: 'long', \n        day: 'numeric',\n        hour: '2-digit',\n        minute: '2-digit'\n      })}`],\n      [''], // Empty row\n      // 📊 Table headers\n      ['No', 'Nomor SP', 'Nama Kegiatan', 'Lokasi', 'Tanggal Mulai', 'Tanggal Selesai', 'Jumlah Personil', 'Bidang Terlibat', 'Keterangan'],\n      // 📋 Data rows\n      ...data.map((item, index) => [\n        index + 1,\n        item.nomor_sp || '-',\n        item.nama_kegiatan || '-',\n        item.lokasi || '-',\n        new Date(item.tanggal_mulai).toLocaleDateString('id-ID'),\n        new Date(item.tanggal_selesai).toLocaleDateString('id-ID'),\n        item.personil_count || 0,\n        item.bidang_list || '-',\n        item.keterangan || '-'\n      ])\n    ];\n    \n    // 📊 Create workbook and worksheet\n    const wb = XLSX.utils.book_new();\n    const ws = XLSX.utils.aoa_to_sheet(wsData);\n    \n    // 🎨 Enhanced Styling\n    const range = XLSX.utils.decode_range(ws['!ref']);\n    \n    // 📏 Column widths\n    ws['!cols'] = [\n      { width: 5 },   // No\n      { width: 15 },  // Nomor SP\n      { width: 30 },  // Nama Kegiatan\n      { width: 20 },  // Lokasi\n      { width: 12 },  // Tanggal Mulai\n      { width: 12 },  // Tanggal Selesai\n      { width: 10 },  // Personil\n      { width: 20 },  // Bidang\n      { width: 25 }   // Keterangan\n    ];\n    \n    // 🎨 Cell styling\n    for (let R = range.s.r; R <= range.e.r; ++R) {\n      for (let C = range.s.c; C <= range.e.c; ++C) {\n        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });\n        if (!ws[cellAddress]) continue;\n        \n        // 📄 Style headers\n        if (R === 0) {\n          ws[cellAddress].s = {\n            font: { bold: true, sz: 16, color: { rgb: \"1E293B\" } },\n            alignment: { horizontal: \"center\" }\n          };\n        } else if (R === 1) {\n          ws[cellAddress].s = {\n            font: { sz: 10, color: { rgb: \"64748B\" } },\n            alignment: { horizontal: \"center\" }\n          };\n        } else if (R === 3) {\n          // 📊 Table headers\n          ws[cellAddress].s = {\n            font: { bold: true, color: { rgb: \"FFFFFF\" } },\n            fill: { fgColor: { rgb: \"1E293B\" } },\n            alignment: { horizontal: \"center\" },\n            border: {\n              top: { style: \"thin\", color: { rgb: \"E2E8F0\" } },\n              bottom: { style: \"thin\", color: { rgb: \"E2E8F0\" } },\n              left: { style: \"thin\", color: { rgb: \"E2E8F0\" } },\n              right: { style: \"thin\", color: { rgb: \"E2E8F0\" } }\n            }\n          };\n        } else if (R > 3) {\n          // 📋 Data rows\n          ws[cellAddress].s = {\n            border: {\n              top: { style: \"thin\", color: { rgb: \"E2E8F0\" } },\n              bottom: { style: \"thin\", color: { rgb: \"E2E8F0\" } },\n              left: { style: \"thin\", color: { rgb: \"E2E8F0\" } },\n              right: { style: \"thin\", color: { rgb: \"E2E8F0\" } }\n            },\n            fill: R % 2 === 0 ? { fgColor: { rgb: \"F8FAFC\" } } : undefined\n          };\n          \n          // 🔢 Center align numbers\n          if (C === 0 || C === 6) {\n            ws[cellAddress].s.alignment = { horizontal: \"center\" };\n          }\n        }\n      }\n    }\n    \n    // 📊 Add worksheet to workbook\n    XLSX.utils.book_append_sheet(wb, ws, \"Kegiatan Perjadin\");\n    \n    // 💾 Save with timestamp\n    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');\n    XLSX.writeFile(wb, `kegiatan-perjadin-${timestamp}.xlsx`);\n    \n    return true;\n  } catch (error) {\n    console.error('❌ Error exporting Excel:', error);\n    throw new Error('Gagal mengekspor ke Excel: ' + error.message);\n  }\n};\n\n// 📋 Format data for export\nexport const formatDataForExport = (rawData) => {\n  return rawData.map(item => ({\n    ...item,\n    personil_count: item.details ? item.details.reduce((sum, detail) => {\n      const personilArray = detail.personil ? detail.personil.split(', ').filter(p => p.trim()) : [];\n      return sum + personilArray.length;\n    }, 0) : 0,\n    bidang_list: item.details ? item.details.map(detail => detail.bidang_nama).join(', ') : '-'\n  }));\n};\n\n// 🎯 Export utilities with loading states\nexport const exportWithProgress = async (exportFunction, data, title) => {\n  try {\n    const result = await exportFunction(data, title);\n    return {\n      success: true,\n      message: 'Export berhasil! File telah diunduh.'\n    };\n  } catch (error) {\n    return {\n      success: false,\n      message: error.message || 'Terjadi kesalahan saat mengekspor data'\n    };\n  }\n};