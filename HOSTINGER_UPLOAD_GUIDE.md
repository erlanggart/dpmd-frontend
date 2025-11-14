# 📤 Panduan Upload Frontend ke Hostinger

## 📋 Informasi Setup

- **Frontend (Hostinger Shared Hosting)**: `protodpmd.vertinova.id` → `/public_html/prototype`
- **Backend (VPS)**: `protobackend.vertinova.id` → VPS IP: 72.61.140.193

---

## 🔧 STEP 1: Build Frontend

```bash
# Di local machine
cd c:\laragon\www\dpmd\dpmd-frontend

# Install dependencies (jika belum)
npm install

# Build untuk production
npm run build
```

Folder `dist/` akan dibuat dengan semua file production.

---

## 📤 STEP 2: Upload ke Hostinger

### Metode 1: File Manager (Recommended untuk Pemula)

1. **Login ke Hostinger cPanel/hPanel**
   - Login ke https://hpanel.hostinger.com
   - Pilih hosting Anda

2. **Buka File Manager**
   - Klik "File Manager" di menu

3. **Buat Folder `prototype`**
   - Masuk ke folder `public_html`
   - Klik "New Folder"
   - Nama: `prototype`
   - Klik Create

4. **Upload Files**
   - Masuk ke folder `public_html/prototype`
   - Klik "Upload"
   - Drag & drop semua isi folder `dist/` dari local
   - Atau klik "Select Files" dan pilih semua file di folder `dist/`
   - Tunggu upload selesai

5. **Verifikasi File**
   - Pastikan file `index.html` ada di `/public_html/prototype/`
   - Pastikan folder `assets/` ada

### Metode 2: FTP (Recommended untuk Update Cepat)

1. **Install FTP Client**
   - Download FileZilla: https://filezilla-project.org/

2. **Dapatkan FTP Credentials**
   - Login ke Hostinger hPanel
   - Klik "FTP Accounts"
   - Copy FTP Host, Username, Password

3. **Connect FTP**
   - Buka FileZilla
   - Host: `ftp.yourdomain.com` (dari Hostinger)
   - Username: `your_username`
   - Password: `your_password`
   - Port: 21
   - Klik "Quickconnect"

4. **Upload Files**
   - Di panel kiri (Local): Navigate ke `c:\laragon\www\dpmd\dpmd-frontend\dist\`
   - Di panel kanan (Remote): Navigate ke `/public_html/prototype/`
   - Select semua file di folder `dist/`
   - Drag ke panel kanan
   - Tunggu upload selesai

### Metode 3: SSH (Jika Hostinger support SSH)

```bash
# Upload menggunakan SCP
scp -r dist/* username@ftp.yourdomain.com:/public_html/prototype/

# Atau menggunakan rsync
rsync -avz --progress dist/ username@ftp.yourdomain.com:/public_html/prototype/
```

---

## 🌐 STEP 3: Setup Subdomain di Hostinger

1. **Login ke Hostinger hPanel**

2. **Klik "Domains" atau "Subdomains"**

3. **Create Subdomain**
   - Subdomain: `protodpmd`
   - Domain: `vertinova.id`
   - Full subdomain: `protodpmd.vertinova.id`
   - Document Root: `/public_html/prototype`
   - Klik Create

4. **Tunggu DNS Propagation** (5-30 menit)

5. **Test Akses**
   - Buka browser: `http://protodpmd.vertinova.id`
   - Seharusnya muncul aplikasi frontend

---

## 🔒 STEP 4: Setup SSL (HTTPS)

### Di Hostinger hPanel:

1. **Klik "SSL"**

2. **Pilih subdomain `protodpmd.vertinova.id`**

3. **Klik "Install SSL"** atau "Enable SSL"
   - Hostinger biasanya auto-install Let's Encrypt SSL
   - Tunggu beberapa menit

4. **Force HTTPS**
   - Buat file `.htaccess` di `/public_html/prototype/`
   - Atau edit yang sudah ada

### Isi `.htaccess` untuk Force HTTPS & SPA Routing:

```apache
# Force HTTPS
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
    
    # SPA Routing - Redirect all to index.html
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# Disable directory listing
Options -Indexes

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/font-woff "access plus 1 year"
    ExpiresByType application/font-woff2 "access plus 1 year"
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "no-referrer-when-downgrade"
</IfModule>

# Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
```

5. **Upload `.htaccess`**
   - Upload file `.htaccess` ke `/public_html/prototype/`

6. **Test HTTPS**
   - Buka: `https://protodpmd.vertinova.id`
   - Harus ada icon gembok

---

## ✅ STEP 5: Verifikasi

### Checklist Frontend ✓
- [ ] Website accessible: `https://protodpmd.vertinova.id`
- [ ] SSL aktif (icon gembok di browser)
- [ ] SPA routing works (refresh halaman tidak 404)
- [ ] Static assets loaded (gambar, CSS, JS)
- [ ] Console browser tidak ada error (F12 > Console)

### Test Koneksi ke Backend ✓
- [ ] Login berhasil
- [ ] Fetch data berhasil
- [ ] Upload file berhasil
- [ ] Tidak ada CORS error di console

---

## 🔄 Update Frontend (Future)

### Cara Update Frontend di Hostinger:

```bash
# 1. Build di local
cd c:\laragon\www\dpmd\dpmd-frontend
npm run build

# 2. Upload ke Hostinger
# Gunakan File Manager atau FTP
# Upload semua isi folder dist/ ke /public_html/prototype/
# Overwrite semua file lama

# 3. Clear cache browser (Ctrl+Shift+R)
```

### Update via FTP (FileZilla):

1. Connect FTP
2. Navigate ke `/public_html/prototype/`
3. **Delete semua file lama** (kecuali .htaccess)
4. Upload semua file baru dari `dist/`
5. Clear cache browser

---

## 🐛 Troubleshooting

### Website Tidak Muncul / 404
```
1. Cek document root subdomain di Hostinger
   - Harus: /public_html/prototype
   
2. Cek file index.html ada
   - Di File Manager: /public_html/prototype/index.html
   
3. Cek DNS propagation
   - https://dnschecker.org
   - Masukkan: protodpmd.vertinova.id
   
4. Clear cache browser (Ctrl+Shift+R)
```

### Refresh Halaman = 404
```
1. Buat/edit .htaccess di /public_html/prototype/
2. Tambahkan SPA routing rules (lihat STEP 4)
3. Test lagi
```

### CORS Error
```
1. Cek backend VPS CORS sudah allow:
   https://protodpmd.vertinova.id
   
2. Pastikan backend accessible:
   curl https://protobackend.vertinova.id/health
   
3. Cek apiConfig.js production URL benar:
   https://protobackend.vertinova.id/api
```

### SSL Tidak Aktif
```
1. Login Hostinger hPanel
2. Klik SSL
3. Pilih protodpmd.vertinova.id
4. Klik Install/Enable SSL
5. Tunggu 5-10 menit
6. Force HTTPS via .htaccess
```

### Gambar/CSS/JS Tidak Load
```
1. Cek browser console (F12)
2. Lihat error di Network tab
3. Pastikan semua file di folder assets/ ter-upload
4. Clear cache browser
5. Hard reload (Ctrl+Shift+R)
```

### File Upload Lambat via File Manager
```
1. Gunakan FTP (FileZilla) lebih cepat
2. Atau zip file dist/ dulu
3. Upload zip ke Hostinger
4. Extract di File Manager
```

---

## 📝 Quick Commands

### Build Frontend
```bash
cd c:\laragon\www\dpmd\dpmd-frontend
npm run build
```

### Create .htaccess
```bash
# Buat file .htaccess di folder dist/ sebelum upload
# Copy isi dari STEP 4 di atas
```

### Check DNS
```bash
# Windows PowerShell
nslookup protodpmd.vertinova.id

# Atau online:
# https://dnschecker.org
```

---

## 📞 File Locations

**Local Machine:**
- Build files: `c:\laragon\www\dpmd\dpmd-frontend\dist\`

**Hostinger Shared Hosting:**
- Document root: `/public_html/prototype/`
- .htaccess: `/public_html/prototype/.htaccess`

**Backend VPS:**
- API: `https://protobackend.vertinova.id/api`

---

## 🔒 Security Notes

- ✅ .htaccess untuk force HTTPS
- ✅ Disable directory listing
- ✅ Security headers
- ✅ .env backend tidak di-upload (hanya di VPS)

---

**Setup Type**: Hybrid (Frontend: Hostinger Shared Hosting, Backend: VPS)  
**Created**: November 13, 2025  
**Version**: 1.0.0
