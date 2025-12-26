# Alur Disposisi Surat - DPMD Kabupaten Bogor

## Hirarki Disposisi

Alur disposisi surat di sistem DPMD mengikuti struktur organisasi berikut:

```
Sekretariat 
    ↓
Kepala Dinas
    ↓
Sekretaris Dinas
    ↓
Kepala Bidang
    ↓
Ketua Tim
    ↓
Pegawai
```

## Role dan Warna Tema

| Role | Warna Tema | Path Route | Status Layout |
|------|-----------|------------|---------------|
| Sekretariat | - | `/sekretariat` | ⏳ Pending |
| Kepala Dinas | Blue (blue-600) | `/kepala-dinas` | ✅ Complete |
| Sekretaris Dinas | Purple (purple-600) | `/sekretaris-dinas` | ✅ Complete |
| Kepala Bidang | Green (green-600) | `/kepala-bidang` | ✅ Complete |
| Ketua Tim | Teal (teal-600) | `/ketua-tim` | ✅ Complete |
| Pegawai | Orange (orange-600) | `/pegawai` | ✅ Complete |

## Fitur Layout Terkini (Updated: 26 Dec 2024)

Semua layout telah diupdate dengan fitur:

### 1. Fixed Header
- Avatar user
- Nama dan role
- Notification bell dengan unread badge
- Gradient sesuai warna tema role

### 2. Notification System
- Real-time notification panel
- Slide-down animation
- Mark as read functionality
- Navigation ke halaman terkait (disposisi/kegiatan)
- Unread count indicator

### 3. Bottom Navigation
- Core Dashboard (FiBarChart2)
- Jadwal Kegiatan (FiCalendar)
- Disposisi (FiMail)
- Menu (FiMenu)

### 4. Menu Modal
- Slide-up animation
- User profile info
- Quick access menu items
- Logout button

## Komponen Disposisi yang Diperlukan

### 1. DisposisiSurat Component
Halaman utama untuk melihat daftar disposisi masuk dan keluar.

**Fitur:**
- Daftar surat masuk (disposisi yang diterima)
- Daftar surat keluar (disposisi yang dikirim)
- Status tracking (pending, approved, completed)
- Filter dan search

### 2. DisposisiDetail Component
Halaman detail untuk melihat dan memproses disposisi.

**Fitur:**
- Informasi lengkap surat
- History disposisi
- Tombol aksi (approve, forward, reject)
- Catatan/instruksi
- Attachment viewer

### 3. DisposisiForm Component
Form untuk membuat disposisi baru atau forward disposisi.

**Fitur:**
- Pilih penerima (sesuai hirarki)
- Upload attachment
- Prioritas surat (urgent, normal, low)
- Batas waktu
- Instruksi khusus

## Alur Kerja Disposisi

### 1. Sekretariat (Entry Point)
- Menerima surat dari eksternal
- Input data surat ke sistem
- Disposisi pertama ke Kepala Dinas

### 2. Kepala Dinas
- Review surat masuk
- Tentukan tindak lanjut:
  - Forward ke Sekretaris Dinas (untuk koordinasi)
  - Forward ke Kepala Bidang langsung (urgent)
  - Reject/Archive
- Tambahkan instruksi

### 3. Sekretaris Dinas
- Koordinasi disposisi
- Forward ke Kepala Bidang terkait
- Monitor progress

### 4. Kepala Bidang
- Evaluasi disposisi sesuai bidang
- Forward ke Ketua Tim yang tepat
- Tambahkan instruksi teknis

### 5. Ketua Tim
- Distribusi tugas ke anggota tim
- Forward ke Pegawai
- Monitor pelaksanaan

### 6. Pegawai
- Eksekusi tugas
- Update progress
- Upload hasil/laporan
- Mark sebagai completed

## Notifikasi Real-time

Setiap perpindahan disposisi akan trigger notifikasi:

```javascript
{
  id: 1,
  title: 'Disposisi Baru',
  message: 'Anda mendapat disposisi baru dari [Pengirim]',
  time: 'x jam yang lalu',
  read: false,
  type: 'disposisi'
}
```

## Database Schema (Prisma)

```prisma
model Disposisi {
  id              Int       @id @default(autoincrement())
  nomor_surat     String    @unique
  perihal         String
  tanggal_surat   DateTime
  pengirim        String
  priority        String    @default("normal") // urgent, normal, low
  deadline        DateTime?
  
  // Relasi
  from_user_id    Int
  from_user       User      @relation("DisposisiFrom", fields: [from_user_id], references: [id])
  to_user_id      Int
  to_user         User      @relation("DisposisiTo", fields: [to_user_id], references: [id])
  
  // Status tracking
  status          String    @default("pending") // pending, approved, completed, rejected
  instruksi       String?
  catatan         String?
  
  // Attachments
  attachments     Json?     // Array of file paths
  
  // Timestamps
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  completed_at    DateTime?
  
  // History
  history         DisposisiHistory[]
}

model DisposisiHistory {
  id              Int       @id @default(autoincrement())
  disposisi_id    Int
  disposisi       Disposisi @relation(fields: [disposisi_id], references: [id])
  
  action          String    // forwarded, approved, rejected, completed
  from_user_id    Int
  from_user       User      @relation("HistoryFrom", fields: [from_user_id], references: [id])
  to_user_id      Int?
  to_user         User?     @relation("HistoryTo", fields: [to_user_id], references: [id])
  
  notes           String?
  created_at      DateTime  @default(now())
}
```

## API Endpoints

### GET /api/disposisi
Mendapatkan daftar disposisi untuk user yang login.

**Query Params:**
- `type`: 'inbox' | 'outbox'
- `status`: 'pending' | 'approved' | 'completed' | 'rejected'
- `search`: keyword
- `page`: pagination
- `limit`: items per page

### GET /api/disposisi/:id
Mendapatkan detail disposisi dan history.

### POST /api/disposisi
Membuat disposisi baru (dari Sekretariat).

**Body:**
```json
{
  "nomor_surat": "001/SK/XII/2024",
  "perihal": "Permohonan...",
  "tanggal_surat": "2024-12-26",
  "pengirim": "Dinas XYZ",
  "priority": "normal",
  "deadline": "2024-12-31",
  "to_user_id": 123,
  "instruksi": "Mohon ditindaklanjuti",
  "attachments": ["file1.pdf", "file2.pdf"]
}
```

### POST /api/disposisi/:id/forward
Forward disposisi ke user berikutnya.

**Body:**
```json
{
  "to_user_id": 456,
  "instruksi": "Instruksi untuk penerima",
  "priority": "urgent"
}
```

### PUT /api/disposisi/:id/status
Update status disposisi.

**Body:**
```json
{
  "status": "completed",
  "catatan": "Sudah selesai dikerjakan",
  "attachments": ["hasil_kerja.pdf"]
}
```

### GET /api/users/by-role/:role
Mendapatkan daftar user berdasarkan role (untuk dropdown forward).

## TODO List

### Backend
- [ ] Buat migration untuk tabel `disposisi` dan `disposisi_history`
- [ ] Buat controller `disposisi.controller.js`
- [ ] Buat route `/api/disposisi`
- [ ] Implement authorization (user hanya bisa akses disposisi mereka)
- [ ] Buat notification system untuk disposisi baru
- [ ] Setup file upload untuk attachments

### Frontend
- [ ] Buat component `DisposisiSurat.jsx` untuk semua role
- [ ] Buat component `DisposisiDetail.jsx`
- [ ] Buat component `DisposisiForm.jsx`
- [ ] Buat component `DisposisiHistory.jsx`
- [ ] Integrate dengan notification system
- [ ] Setup file upload UI
- [ ] Add loading states dan error handling

### Testing
- [ ] Test alur disposisi lengkap (Sekretariat -> Pegawai)
- [ ] Test notification real-time
- [ ] Test authorization per role
- [ ] Test file upload/download
- [ ] Test search dan filter

## Notes
- Setiap role hanya bisa forward ke role dibawahnya sesuai hirarki
- Kepala Dinas bisa langsung forward ke Kepala Bidang (skip Sekretaris Dinas) untuk urgent case
- System akan auto-create notification saat disposisi di-forward
- File attachments disimpan di `storage/disposisi/`
