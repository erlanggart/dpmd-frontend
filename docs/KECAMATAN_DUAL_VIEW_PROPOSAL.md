# Kecamatan - Dual View Proposal (File Mirroring)

**Tanggal**: 2 Februari 2026  
**Feature**: Mode Perbandingan File Proposal di Halaman Kecamatan

## 📋 Overview

Fitur ini memungkinkan **Kecamatan** untuk membandingkan file proposal yang **diupload ulang oleh Desa** dengan **file referensi asli yang disetujui oleh Dinas Terkait**.

## 🎯 Use Case

### Skenario:
1. **Desa** mengupload proposal → kirim ke **Dinas Terkait**
2. **Dinas Terkait** review → approve proposal
   - Sistem otomatis menyimpan copy file ke `storage/uploads/bankeu_reference/`
   - Field `dinas_reviewed_file` diisi dengan nama file
   - Field `dinas_reviewed_at` diisi dengan timestamp
3. **Dinas Terkait** atau **Kecamatan** meminta revisi → proposal kembali ke **Desa**
4. **Desa** upload ulang file proposal yang sudah direvisi
5. **Kecamatan** perlu review → bisa **bandingkan file lama vs baru**

## ✨ Fitur yang Ditambahkan

### 1. Badge Indicator "Ref. Dinas"
Muncul di proposal row ketika ada file referensi dari Dinas:
```jsx
{proposal.dinas_reviewed_file && (
  <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg">
    <LuShield className="w-3.5 h-3.5 text-purple-600" />
    <span className="text-xs font-semibold text-purple-700">Ref. Dinas</span>
  </div>
)}
```

### 2. Button "Bandingkan"
Button "Lihat" berubah jadi "Bandingkan" dengan styling gradient ketika ada 2 file:
```jsx
<button className="bg-gradient-to-r from-blue-600 to-indigo-600 ...">
  {proposal.dinas_reviewed_file ? 'Bandingkan' : 'Lihat'}
</button>
```

### 3. Enhanced Catatan Dinas
Catatan dari Dinas ditampilkan dengan styling yang lebih menonjol:
- Background gradient ketika ada file referensi
- Menampilkan status (Disetujui/Revisi/Ditolak)
- Info tambahan bahwa file referensi tersimpan

### 4. Dual View Modal
Modal PDF viewer dengan **2 tab**:

#### Tab 1: File Referensi (Disetujui Dinas)
- **Background**: Gradient blue-indigo
- **Icon**: `LuShield` (shield icon)
- **Info Banner**: 
  > 📋 File Referensi (Disetujui Dinas Terkait)  
  > Ini adalah file asli yang disetujui oleh Dinas pada [tanggal].  
  > File ini tidak akan berubah meskipun Desa mengupload file baru.

#### Tab 2: File Terbaru (Upload Ulang Desa)
- **Background**: Gradient amber-orange
- **Icon**: `LuFileText` (document icon)
- **Info Banner**:
  > 🔄 File Terbaru (Upload Ulang dari Desa)  
  > Ini adalah file yang baru saja diupload oleh Desa setelah mendapat revisi dari Dinas.  
  > Silakan bandingkan dengan file referensi untuk memastikan kesesuaian dan kelengkapan revisi.

### 5. Mode Perbandingan Badge
Di header modal, menampilkan badge "Mode Perbandingan" ketika dual view aktif.

## 🔧 Technical Details

### Data Flow
```javascript
const handleViewPdf = (proposal, kegiatanNama) => {
  const pdfData = { kegiatanName, status, anggaran };

  if (proposal.dinas_reviewed_file) {
    // Dual view mode
    pdfData.files = [
      {
        type: 'reference',
        label: 'File Referensi (Disetujui Dinas)',
        url: `${imageBaseUrl}/storage/uploads/bankeu_reference/${proposal.dinas_reviewed_file}`,
        reviewedAt: proposal.dinas_reviewed_at
      },
      {
        type: 'current',
        label: 'File Terbaru (Upload Desa)',
        url: `${imageBaseUrl}/storage/uploads/bankeu/${proposal.file_proposal}`,
        reviewedAt: null
      }
    ];
  } else {
    // Single view mode
    pdfData.url = `${imageBaseUrl}/storage/uploads/bankeu/${proposal.file_proposal}`;
  }
};
```

### Database Fields
```prisma
model bankeu_proposals {
  dinas_reviewed_file    String?   @db.VarChar(255)  // File reference name
  dinas_reviewed_at      DateTime? @db.Timestamp(0)  // Review timestamp
}
```

### File Storage
- **Original Files**: `storage/uploads/bankeu/`
- **Reference Files**: `storage/uploads/bankeu_reference/`

## 🎨 UI Components

### Icons Used
- `LuShield` - File referensi dari Dinas
- `LuFileText` - File terbaru dari Desa
- `LuInfo` - Informasi tambahan
- `LuAlertCircle` - Peringatan/perhatian
- `LuEye` - Lihat/View

### Color Scheme
- **File Referensi**: Blue/Indigo (trust, official)
- **File Terbaru**: Amber/Orange (attention, new)
- **Badge Ref. Dinas**: Purple (authority)

## 📱 Responsive Design
- Mobile: Tab navigation stacked vertically
- Desktop: Tab navigation side-by-side
- Info banner: Responsive text size (text-xs sm:text-sm)

## ✅ Testing Checklist

- [ ] Proposal tanpa file referensi → button "Lihat" → modal single view
- [ ] Proposal dengan file referensi → badge "Ref. Dinas" muncul
- [ ] Button "Bandingkan" muncul dengan gradient styling
- [ ] Click "Bandingkan" → modal dual view dengan 2 tab
- [ ] Tab "File Referensi" → PDF correct, info banner blue
- [ ] Tab "File Terbaru" → PDF correct, info banner amber
- [ ] Switch tab → PDF iframe update correctly
- [ ] Catatan Dinas dengan file referensi → styling gradient blue-indigo
- [ ] Timestamp review ditampilkan dengan benar (id-ID locale)

## 🔄 Integration Points

### Backend (Already Implemented)
- `POST /api/dinas/bankeu/proposals/:id/questionnaire/submit` - Dinas verification
- File mirroring di `dinasVerification.controller.js`
- Copy file via `copyFileToReference()` di `fileHelper.js`

### Frontend Components
- `BankeuVerificationDetailPage.jsx` - Kecamatan verification page
- `handleViewPdf()` - PDF viewer logic
- `PdfViewerModal` - Dual view modal component

## 🐛 Known Issues

### File Path Duplication (Non-Blocking)
- File mirroring gagal jika `file_proposal` sudah mengandung `bankeu/` prefix
- Error: `bankeu/bankeu/filename.pdf` → "Source file not found"
- **Impact**: Fields `dinas_reviewed_file` dan `dinas_reviewed_at` akan NULL
- **Workaround**: File mirroring wrapped dalam try-catch, approval tetap jalan
- **Fix**: Perlu adjust `copyFileToReference()` untuk strip existing prefix

## 📝 Notes

- Fitur ini **hanya muncul** ketika Desa upload ulang proposal setelah Dinas approve
- Kecamatan bisa compare apakah perubahan yang diminta sudah sesuai
- File referensi **tidak pernah berubah** meskipun Desa upload berkali-kali
- Timestamp `dinas_reviewed_at` menunjukkan kapan Dinas approve proposal original

## 🚀 Future Enhancements

1. **Version History**: Track semua versi file yang diupload Desa
2. **Side-by-Side View**: Split screen 2 PDF dalam 1 viewport
3. **Diff Highlighting**: Auto-detect perubahan antara 2 file (jika text-based PDF)
4. **Download Both**: Button download kedua file sekaligus dalam ZIP
5. **Comment Annotations**: Kecamatan bisa kasih comment langsung di PDF
