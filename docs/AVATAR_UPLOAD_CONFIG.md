# Avatar Upload Configuration Documentation

## Perubahan yang telah dilakukan:

### 1. Backend Configuration (✅ SELESAI)

**File: `config/filesystems.php`**

-   Menambahkan disk `public_uploads` yang menyimpan file di `storage/app/uploads`
-   URL diakses melalui `/uploads` endpoint
-   Menambahkan symlink mapping: `public/uploads -> storage/app/uploads`

**File: `app/Http/Controllers/Api/Desa/PengurusController.php`**

-   Mengubah avatar upload dari disk `public` ke `public_uploads`
-   Semua file avatar sekarang disimpan di `storage/app/uploads/avatars/`

### 2. Frontend Configuration (✅ SELESAI)

**File: `src/components/kelembagaan/pengurus/PengurusForm.jsx`**

-   Mengubah semua referensi dari `/storage/` ke `/uploads/`
-   Avatar preview sekarang menggunakan `${imageBaseUrl}/uploads/${editData.avatar}`

**File: `src/components/kelembagaan/PengurusKelembagaan.jsx`**

-   Sudah menggunakan `/uploads/` path (tidak perlu diubah)

### 3. File Structure

```
dpmd-backend/
├── storage/app/uploads/
│   ├── avatars/               ← Avatar pengurus disimpan di sini
│   ├── aparatur_desa_files/
│   ├── hero-gallery/
│   ├── produk_hukum/
│   └── profil-desa/
└── public/uploads/            ← Symlink ke storage/app/uploads
```

### 4. URL Mapping

-   **File Storage Path**: `storage/app/uploads/avatars/filename.jpg`
-   **Public URL**: `http://dpmd.test/uploads/avatars/filename.jpg`
-   **Frontend Access**: `${VITE_IMAGE_BASE_URL}/uploads/avatars/filename.jpg`

### 5. Verification Checklist

-   ✅ Disk `public_uploads` terkonfigurasi di filesystems.php
-   ✅ Symlink `public/uploads -> storage/app/uploads` sudah dibuat
-   ✅ Folder `storage/app/uploads/avatars/` sudah dibuat
-   ✅ PengurusController menggunakan disk `public_uploads`
-   ✅ Frontend menggunakan `/uploads/` path untuk avatar
-   ✅ Environment variable `VITE_IMAGE_BASE_URL` sudah dikonfigurasi

### 6. Testing

Untuk menguji upload avatar:

1. Buka halaman form pengurus
2. Upload gambar avatar
3. File harus tersimpan di `storage/app/uploads/avatars/`
4. Preview harus menampilkan gambar dengan URL `http://dpmd.test/uploads/avatars/filename.jpg`

### 7. Production Notes

Untuk production, pastikan:

-   Web server dapat melayani symlink
-   Permissions folder uploads: 755
-   Permissions file avatars: 644
-   Backup strategy mencakup folder `storage/app/uploads`
