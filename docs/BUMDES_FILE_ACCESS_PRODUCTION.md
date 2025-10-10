# BUMDES File Access - Production Deployment Guide

## Masalah
File BUMDES tidak bisa diakses di production server karena jalur URL yang salah.

URL yang bermasalah:
```
https://dpmdbogorkab.id/api/bumdes/file/laporan_keuangan/LAPORAN%20KEUANGAN%202021.pdf
```

URL yang benar di production:
```
https://dpmdbogorkab.id/api/uploads/laporan_keuangan/LAPORAN%20KEUANGAN%202021.pdf
https://dpmdbogorkab.id/api/uploads/dokumen_badanhukum/namafile.pdf
```

## Solusi yang Diimplementasikan

### 1. Route File Serving yang Benar (✅ SUDAH DIPERBAIKI)

File: `routes/api.php`
- Route PRODUCTION: `/api/uploads/{folder}/{filename}` ← **JALUR YANG BENAR**
- Route alternatif: `/api/public/uploads/{folder}/{filename}`
- Route development: `/api/bumdes/file/{folder}/{filename}` (untuk backward compatibility)

### 2. URL Generation Updated (✅ SUDAH DIPERBAIKI)

File: `app/Http/Controllers/Api/BumdesController.php`
- Method `getStorageUrl()` sudah diupdate untuk production
- Production URL: `https://dpmdbogorkab.id/api/uploads/{folder}/{filename}`
- Development URL: `{app.url}/api/uploads/{folder}/{filename}`

### 2. Artisan Commands untuk Debugging

#### Command: `php artisan bumdes:debug-files [filename]`
File: `app/Console/Commands/DebugBumdesFiles.php`

Debugging struktur storage dan file tertentu:
```bash
# Debug struktur storage
php artisan bumdes:debug-files

# Debug file tertentu
php artisan bumdes:debug-files "LAPORAN KEUANGAN 2021.pdf"
```

#### Command: `php artisan bumdes:fix-storage`
File: `app/Console/Commands/FixBumdesStorage.php`

Memperbaiki setup storage untuk production:
```bash
php artisan bumdes:fix-storage
```

## Langkah Deployment ke Production

### 1. Upload dan Setup
```bash
# Upload semua file ke server
# Pastikan folder permissions benar

# Set permission storage (Linux/Unix)
chmod -R 755 storage/app/uploads
chmod -R 644 storage/app/uploads/*/*.pdf

# Jalankan artisan commands
php artisan bumdes:fix-storage
php artisan config:cache
php artisan route:cache
```

### 2. Test File Access
```bash
# Debug struktur
php artisan bumdes:debug-files

# Test file tertentu
php artisan bumdes:debug-files "LAPORAN KEUANGAN 2021.pdf"

# Cek logs
tail -f storage/logs/laravel.log
```

### 3. Test URLs
Test akses file melalui URL yang benar:
```
# Laporan Keuangan
https://dpmdbogorkab.id/api/uploads/laporan_keuangan/LAPORAN%20KEUANGAN%202021.pdf

# Dokumen Badan Hukum  
https://dpmdbogorkab.id/api/uploads/dokumen_badanhukum/namafile.pdf
```

## Troubleshooting

### File 404 Error
1. Cek file exists: `php artisan bumdes:debug-files "filename.pdf"`
2. Cek permission: `ls -la storage/app/uploads/*/`
3. Cek logs: `tail storage/logs/laravel.log`

### Permission Issues
```bash
# Fix permission untuk web server user
sudo chown -R www-data:www-data storage/app/uploads
chmod -R 755 storage/app/uploads
```

### Symbolic Link Issues
```bash
# Buat ulang symbolic link
php artisan storage:link
```

## Struktur File Production

```
/var/www/html/dpmdbogorkab/
├── storage/
│   └── app/
│       └── uploads/
│           ├── dokumen_badanhukum/
│           │   ├── file1.pdf
│           │   └── file2.pdf
│           └── laporan_keuangan/
│               ├── LAPORAN KEUANGAN 2021.pdf
│               └── LAPORAN KEUANGAN 2022.pdf
└── public/
    └── storage/ -> ../storage/app/public (symlink)
```

## URL Patterns yang Didukung

1. **PRIMARY (Production)**: `/api/uploads/{folder}/{filename}`
   - **JALUR YANG BENAR DI PRODUCTION**
   - Contoh: `https://dpmdbogorkab.id/api/uploads/laporan_keuangan/LAPORAN%20KEUANGAN%202021.pdf`
   - Contoh: `https://dpmdbogorkab.id/api/uploads/dokumen_badanhukum/namafile.pdf`

2. **Alternative**: `/api/public/uploads/{folder}/{filename}`
   - Backup route jika primary gagal

3. **Development/Legacy**: `/api/bumdes/file/{folder}/{filename}`
   - Untuk backward compatibility dan development

## Logging & Monitoring

Semua akses file akan dicatat di `storage/logs/laravel.log`:
```
[2025-10-10 10:30:00] local.INFO: BUMDES File Request {"folder":"laporan_keuangan","filename":"LAPORAN KEUANGAN 2021.pdf","url":"https://..."}
[2025-10-10 10:30:00] local.INFO: Checking storage path {"path":"/var/www/.../storage/app/uploads/laporan_keuangan/LAPORAN KEUANGAN 2021.pdf","exists":true}
[2025-10-10 10:30:00] local.INFO: Serving file from storage {"mime":"application/pdf","size":263697}
```

## Notes untuk Server Admin

1. **Web Server Config**: Pastikan PHP dapat mengakses folder storage
2. **File Upload**: File harus disimpan di `storage/app/uploads/`
3. **Backup**: Backup folder uploads secara teratur
4. **Performance**: File serving cache 1 jam (max-age=3600)
5. **Security**: Hanya folder yang diizinkan yang bisa diakses