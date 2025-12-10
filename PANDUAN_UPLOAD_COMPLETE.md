# 🚀 PANDUAN UPLOAD FINAL KE HOSTINGER - COMPLETE GUIDE

## 📋 CHECKLIST PRE-UPLOAD

✅ **Build sudah bersih** (timestamp 2:22 PM, no localhost)  
✅ **Backend VPS running** (PM2 online, api.dpmdbogorkab.id)  
✅ **File .htaccess sudah dibuat** (untuk React Router & caching)

---

## 📂 STEP 1: PERSIAPAN FILE

### File yang akan diupload dari folder `dist/`:

```
dist/
├── .htaccess ⭐ BARU! (untuk React Router)
├── index.html
├── assets/
│   ├── index-ChMoEpTd.js (906 KB)
│   ├── index-*.js (8 files)
│   ├── index-*.css
│   └── ... (all assets)
├── logo-kab.png
├── placeholder-news.jpg
├── user-default.svg
└── ... (all public files)
```

**⚠️ PENTING:** File `.htaccess` adalah yang PALING PENTING untuk React Router!

---

## 🗑️ STEP 2: HAPUS FILE LAMA DI HOSTINGER

### Via File Manager Hostinger:

1. **Login** ke Hostinger Panel
2. **File Manager** → Pilih domain `dpmdbogorkab.id`
3. **Masuk folder `public_html`**
4. **SELECT ALL** (Ctrl + A atau centang semua)
5. **DELETE** (klik tombol Delete/Hapus)
6. **Confirm** penghapusan
7. **Pastikan folder `public_html` KOSONG TOTAL**

---

## 📤 STEP 3: UPLOAD FILE BARU

### Upload via File Manager:

1. **Masuk ke folder `public_html`** (yang sudah kosong)
2. **Klik tombol "Upload Files"**
3. **Select ALL files** dari `c:\laragon\www\dpmd\dpmd-frontend\dist\*`
   - **PENTING:** Upload **ISI folder dist**, BUKAN folder dist-nya!
   - Pastikan file `.htaccess` ikut terupload (kadang tersembunyi)
4. **Wait** sampai upload selesai (progress bar 100%)
5. **Verify** di File Manager:
   - ✅ `index.html` ada di root `public_html`
   - ✅ `.htaccess` ada di root `public_html`
   - ✅ Folder `assets/` ada
   - ✅ File `logo-kab.png`, `user-default.svg`, dll ada

---

## ⚙️ STEP 4: SET PERMISSION FILES (JIKA PERLU)

### Permission yang benar:

- **Files** (`.htaccess`, `index.html`, `*.js`, `*.css`, dll): `644`
- **Folders** (`assets/`, dll): `755`

### Cara setting di Hostinger File Manager:

1. **Klik kanan** pada file/folder
2. **Change Permissions** atau **Permissions**
3. Set sesuai di atas
4. Klik **Save**

---

## 🧹 STEP 5: CLEAR BROWSER CACHE (WAJIB!)

### A. Clear Cache Lengkap

```
Tekan: Ctrl + Shift + Delete
Pilih: "All time" / "Sepanjang waktu"
Centang:
  ✅ Browsing history
  ✅ Cookies and site data  
  ✅ Cached images and files
  ✅ Hosted app data
Klik: Clear data
```

### B. Tutup & Buka Browser Baru

```
1. Tutup SEMUA tab browser
2. Exit browser (Alt + F4)
3. Buka browser baru
4. Akses: https://dpmdbogorkab.id
```

### C. Hard Refresh (3x)

```
Tekan: Ctrl + Shift + R
(ulangi 3 kali)
```

### D. Test di Incognito Mode

```
Tekan: Ctrl + Shift + N (Chrome)
Atau: Ctrl + Shift + P (Firefox)
Akses: https://dpmdbogorkab.id
```

---

## 🔍 STEP 6: VERIFIKASI DEPLOYMENT

### A. Cek File .htaccess Loaded

1. **Akses:** `https://dpmdbogorkab.id`
2. **Klik link/navigasi** (misalnya ke halaman Berita)
3. **URL berubah** tapi halaman TIDAK 404 → ✅ `.htaccess` bekerja!
4. **Jika 404** → ❌ `.htaccess` tidak aktif atau salah upload

### B. Cek API Connection

1. **F12** → Tab "Console"
2. **Refresh** halaman
3. **Harus TIDAK ADA error** `127.0.0.1:3001`
4. **F12** → Tab "Network"
5. **Filter "XHR" atau "Fetch"**
6. **Lihat request ke:**
   - ✅ **BENAR:** `https://api.dpmdbogorkab.id/api/public/hero-gallery`
   - ❌ **SALAH:** `http://127.0.0.1:3001/api/public/hero-gallery`

### C. Cek JavaScript File

1. **F12** → Tab "Network"
2. **Refresh** halaman
3. **Cari file:** `index-ChMoEpTd.js`
4. **Periksa:**
   - ✅ Size: **~906 KB** (906,828 bytes)
   - ✅ Status: **200** (bukan 304)
   - ✅ Type: **js**
   - ✅ From: **disk cache** atau **https://dpmdbogorkab.id**

### D. Cek CORS & Headers

```bash
# Via terminal (jika ada curl)
curl -I https://dpmdbogorkab.id

# Expected output:
HTTP/2 200
content-type: text/html
cache-control: no-cache, no-store, must-revalidate
access-control-allow-origin: https://api.dpmdbogorkab.id
```

---

## 🎯 EXPECTED RESULTS

### ✅ Yang HARUS ADA setelah upload sukses:

1. **Halaman loading dengan logo** Kabupaten Bogor
2. **Hero section** dengan slider gambar (dari API VPS)
3. **Stats section** menampilkan angka Kecamatan, Desa, Kelurahan
4. **TIDAK ADA error** di Console
5. **API requests** semua ke `api.dpmdbogorkab.id`
6. **React Router** berfungsi (klik link tidak 404)
7. **HTTPS aktif** (gembok hijau di browser)

### ❌ TROUBLESHOOTING jika masih error:

#### Error: "404 Not Found" saat klik link

**Penyebab:** File `.htaccess` tidak aktif  
**Solusi:**
```
1. Cek di File Manager: file .htaccess ada di root public_html
2. Cek permission: .htaccess harus 644
3. Hubungi support Hostinger: minta aktifkan mod_rewrite
4. Test dengan akses langsung: https://dpmdbogorkab.id/.htaccess
   (harus error 403, bukan 404)
```

#### Error: "Still showing localhost:3001"

**Penyebab:** Browser cache keras atau file salah  
**Solusi:**
```
1. Clear cache LENGKAP (Ctrl + Shift + Delete → All time)
2. Test di Incognito mode
3. Test di browser lain (Firefox, Edge, dll)
4. Cek file size di Network tab (harus ~906 KB)
5. Re-upload file jika size berbeda
```

#### Error: "CORS policy error"

**Penyebab:** Backend tidak set CORS dengan benar  
**Solusi:**
```
1. SSH ke VPS: ssh root@72.61.143.224
2. Edit CORS di backend:
   nano /var/www/dpmd-api/src/middlewares/corsMiddleware.js
3. Pastikan origin: ['https://dpmdbogorkab.id']
4. Restart PM2: pm2 restart dpmd-api
```

#### Error: "Mixed Content" (HTTPS → HTTP)

**Penyebab:** Ada request ke HTTP  
**Solusi:**
```
1. Pastikan semua URL di frontend pakai HTTPS
2. Cek file .htaccess ada redirect HTTP → HTTPS
3. Cek SSL certificate aktif di Hostinger
```

---

## 📊 MONITORING SETELAH DEPLOY

### A. Test dari berbagai device:

- ✅ Desktop Chrome
- ✅ Desktop Firefox
- ✅ Mobile Chrome
- ✅ Mobile Safari (iOS)

### B. Monitor Backend VPS:

```bash
# SSH ke VPS
ssh root@72.61.143.224

# Cek PM2 status
pm2 status

# Cek logs backend
pm2 logs dpmd-api --lines 50

# Cek resource usage
pm2 monit
```

### C. Monitor Frontend Performance:

1. **F12** → Tab "Network"
2. **Throttling:** Set to "Fast 3G" or "Slow 3G"
3. **Refresh** dan cek loading time
4. **Target:** First Contentful Paint < 2 detik

---

## 🆘 CONTACT DEVELOPER JIKA:

### Hubungi developer dengan screenshot:

1. **Console tab** (error messages)
2. **Network tab** (file `index-ChMoEpTd.js` size, status, dari mana)
3. **File Manager Hostinger** (folder `public_html` dan `assets/`)
4. **Browser Info** (Chrome/Firefox version, device, OS)

### Info yang perlu disiapkan:

- ✅ Sudah hapus file lama di Hostinger?
- ✅ Sudah upload file baru (termasuk .htaccess)?
- ✅ Sudah clear browser cache?
- ✅ Sudah test di Incognito mode?
- ✅ File size `index-ChMoEpTd.js` di Network tab?
- ✅ Backend VPS PM2 status?

---

## 🎉 DEPLOYMENT CHECKLIST FINAL

Sebelum menganggap deployment BERHASIL, pastikan:

- [ ] File `.htaccess` terupload ke `public_html/`
- [ ] File `index.html` terupload ke `public_html/`
- [ ] Folder `assets/` terupload dengan isi lengkap
- [ ] Permission files: 644, folders: 755
- [ ] Browser cache sudah di-clear sempurna
- [ ] Akses `https://dpmdbogorkab.id` tampil homepage
- [ ] Console TIDAK ADA error `localhost:3001`
- [ ] Network tab request ke `api.dpmdbogorkab.id`
- [ ] React Router berfungsi (klik link tidak 404)
- [ ] HTTPS aktif (SSL certificate)
- [ ] Test di Incognito mode: BERHASIL
- [ ] Test di device lain: BERHASIL
- [ ] Backend VPS PM2: ONLINE

---

## 📝 NOTES PENTING

1. **File .htaccess WAJIB ada!** Tanpa ini React Router tidak akan kerja
2. **Timestamp file harus 2:22 PM** untuk pastikan file yang benar
3. **Clear cache WAJIB** karena browser cache sangat keras
4. **Test di Incognito** untuk pastikan tidak ada cache issue
5. **Backend VPS harus online** sebelum test frontend

---

**Timestamp:** 2025-11-20 15:00:00  
**Build Version:** 2:22 PM Clean Build + .htaccess  
**Status:** READY TO DEPLOY ✅  
**Critical File:** `.htaccess` untuk React Router
