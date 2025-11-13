# 🚀 Quick Start: Upload Frontend ke Hostinger

## ✅ Prerequisites
- ✅ Frontend sudah di-build (`npm run build` completed)
- ✅ File `.env.production` sudah diupdate
- ✅ Folder `dist/` ready di `c:\laragon\www\dpmd\dpmd-frontend\dist\`
- ✅ File `.htaccess` ready di `c:\laragon\www\dpmd\dpmd-frontend\.htaccess`

---

## 📤 STEP 1: Upload Files via File Manager

### 1.1 Login ke Hostinger
1. Buka https://hpanel.hostinger.com
2. Login dengan akun Anda
3. Pilih hosting website Anda

### 1.2 Buka File Manager
1. Klik **"File Manager"** di menu
2. Navigate ke `/public_html`
3. Buat folder `prototype` (jika belum ada)
   - Klik **"New Folder"**
   - Nama: `prototype`
   - Klik **Create**

### 1.3 Upload Files
1. Masuk ke folder `/public_html/prototype/`
2. **DELETE semua file lama** (jika ada upload sebelumnya)
3. Klik **"Upload"**
4. **Drag & Drop** semua isi folder `c:\laragon\www\dpmd\dpmd-frontend\dist\` ke upload area
   - Atau klik **"Select Files"** dan pilih semua
5. Tunggu upload selesai (bisa beberapa menit)

### 1.4 Upload .htaccess
1. Pastikan masih di folder `/public_html/prototype/`
2. Klik **"Upload"**
3. Upload file `c:\laragon\www\dpmd\dpmd-frontend\.htaccess`

### 1.5 Verify Files
✅ Cek file-file ini ada di `/public_html/prototype/`:
- `index.html`
- `assets/` (folder)
- `.htaccess`

---

## 🌐 STEP 2: Setup Subdomain

### 2.1 Create Subdomain
1. Di Hostinger hPanel, klik **"Domains"** atau **"Subdomains"**
2. Klik **"Create Subdomain"** atau **"Add Subdomain"**
3. Isi form:
   - **Subdomain**: `protodpmd`
   - **Domain**: `vertinova.id`
   - **Full**: `protodpmd.vertinova.id`
   - **Document Root**: `/public_html/prototype`
4. Klik **Create** / **Add**

### 2.2 Tunggu Propagation
- Tunggu 5-10 menit
- DNS akan auto-configured

---

## 🔒 STEP 3: Enable SSL

### 3.1 Install SSL
1. Di Hostinger hPanel, klik **"SSL"**
2. Pilih domain **`protodpmd.vertinova.id`**
3. Klik **"Install SSL"** atau **"Manage"**
4. Pilih **"Free SSL"** (Let's Encrypt)
5. Klik **"Install"**
6. Tunggu 5-10 menit

### 3.2 Force HTTPS
File `.htaccess` yang sudah di-upload akan otomatis force HTTPS.

Jika perlu manual, tambahkan di `.htaccess`:
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## ✅ STEP 4: Test Website

### 4.1 Buka Browser
```
https://protodpmd.vertinova.id
```

### 4.2 Checklist
- [ ] Website loads (landing page muncul)
- [ ] Icon gembok SSL aktif
- [ ] Gambar/CSS/JS load dengan baik
- [ ] Navigation works (klik menu)
- [ ] No errors di console (F12 > Console)

### 4.3 Test API Connection
1. Buka browser console (F12)
2. Lihat tab Network
3. Refresh page
4. Cek request ke `protobackend.vertinova.id`
5. **Jika CORS error** → DNS backend belum pointing (lihat STEP 5)

---

## 🔧 STEP 5: Fix DNS Backend (Jika CORS Error)

**Jika ada CORS error atau "ERR_FAILED" saat fetch API:**

### Problem
DNS `protobackend.vertinova.id` belum pointing ke VPS `72.61.140.193`

### Solution
1. Login ke **Domain Provider** (tempat beli domain vertinova.id)
2. Cari **"DNS Management"** atau **"DNS Zone Editor"**
3. Tambah/Edit **A Record**:
   ```
   Type: A
   Name: protobackend
   Value: 72.61.140.193
   TTL: 3600
   ```
4. **Save changes**
5. Tunggu **5-30 menit** (DNS propagation)
6. **Verify**:
   ```
   nslookup protobackend.vertinova.id
   ```
   Harus return: `72.61.140.193`

### Install SSL Backend (Setelah DNS OK)
```bash
ssh root@72.61.140.193
certbot --nginx -d protobackend.vertinova.id
```

---

## 🐛 Troubleshooting

### Website Tidak Muncul / 404
```
✓ Cek document root subdomain: /public_html/prototype
✓ Cek file index.html ada
✓ Clear cache browser (Ctrl+Shift+R)
✓ Tunggu DNS propagation (5-10 menit)
```

### CORS Error
```
✓ Cek DNS backend: nslookup protobackend.vertinova.id
✓ Harus return: 72.61.140.193
✓ Install SSL backend: certbot --nginx -d protobackend.vertinova.id
✓ Restart PM2: ssh root@72.61.140.193 "pm2 restart dpmd-backend"
```

### CSS/JS Tidak Load
```
✓ Hard reload: Ctrl+Shift+R
✓ Cek .htaccess ada
✓ Cek permissions folder: 755
✓ Clear browser cache
```

### Refresh Halaman = 404
```
✓ Upload .htaccess dengan SPA routing rules
✓ Restart web server (biasanya auto)
```

---

## 📝 Post-Upload Checklist

### Frontend ✓
- [ ] Files uploaded ke `/public_html/prototype/`
- [ ] `.htaccess` uploaded
- [ ] Subdomain `protodpmd.vertinova.id` created
- [ ] Document root pointing ke `/public_html/prototype`
- [ ] SSL installed & active (HTTPS)
- [ ] Website accessible & loading

### Backend ✓
- [ ] DNS `protobackend.vertinova.id` pointing ke `72.61.140.193`
- [ ] SSL installed (HTTPS working)
- [ ] PM2 running: `pm2 status`
- [ ] Database connected
- [ ] Health check OK: `https://protobackend.vertinova.id/health`

### Testing ✓
- [ ] Login works
- [ ] Dashboard loads
- [ ] Data fetching works
- [ ] Upload file works
- [ ] No CORS errors
- [ ] No console errors

---

## 🎯 Quick Commands

### Check DNS
```bash
nslookup protodpmd.vertinova.id
nslookup protobackend.vertinova.id
```

### Test Backend
```bash
curl https://protobackend.vertinova.id/health
```

### Check PM2
```bash
ssh root@72.61.140.193
pm2 status
pm2 logs dpmd-backend
```

---

## 📞 Need Help?

**Common Issues:**
1. CORS Error → Fix DNS backend
2. 404 Error → Check document root & .htaccess
3. ERR_FAILED → DNS belum propagate, tunggu 5-30 menit
4. SSL Error → Re-install SSL di Hostinger panel

**Files Location:**
- Local build: `c:\laragon\www\dpmd\dpmd-frontend\dist\`
- Hostinger: `/public_html/prototype/`
- Backend VPS: `/root/public_html/dpmd-backend/`

---

**Created**: November 13, 2025  
**Status**: Ready to Upload ✅  
**ETA**: 10-15 minutes
