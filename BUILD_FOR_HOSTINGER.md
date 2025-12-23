# Panduan Build Frontend untuk Hostinger

## 📋 Pre-requisites

- Node.js v18+
- npm
- Akses ke Hostinger cPanel/File Manager
- Domain: dpmdbogorkab.id sudah pointing ke Hostinger

## 🔧 Konfigurasi Sebelum Build

### Step 1: Update environment variables

```bash
cd dpmd-frontend

# Buat/edit .env.production
cat > .env.production << 'EOF'
VITE_API_BASE_URL=https://api.dpmdbogorkab.id/api
VITE_VAPID_PUBLIC_KEY=BCEEJBfb05GAzlnpuzfPJszt054iCSOhqPVkmAMyTcUGZ8VrNluqShCQ2PVmwcMU0WuXJC35P5_XCXJNaQczX-U
EOF
```

### Step 2: Update manifest.json (jika perlu)

```bash
# Edit public/manifest.json
# Pastikan start_url dan scope sudah benar:
{
  "start_url": "/",
  "scope": "/"
}
```

### Step 3: Verify Service Worker path

```bash
# Check public/sw.js
# Pastikan API_BASE_URL hardcoded atau ambil dari config:
const API_BASE_URL = 'https://api.dpmdbogorkab.id';
```

## 🏗️ Build Process

### Step 1: Install dependencies

```bash
npm install
```

### Step 2: Run build

```bash
npm run build
```

Build akan create folder `dist/` dengan struktur:
```
dist/
  ├── index.html
  ├── manifest.json
  ├── sw.js
  ├── robots.txt
  ├── assets/
  │   ├── index-[hash].js
  │   ├── index-[hash].css
  │   └── ...
  └── peraturan/
```

### Step 3: Verify build

```bash
# Check file size
Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum

# Preview locally (optional)
npm run preview
# Buka http://localhost:4173
```

## 📤 Upload ke Hostinger

### Option 1: Via File Manager (Recommended for first time)

1. Login ke Hostinger cPanel
2. Buka File Manager
3. Navigate ke `public_html/` folder
4. **Backup existing files** (jika ada):
   - Select all → Download as ZIP
   - Rename folder jadi `public_html_backup_YYYYMMDD`

5. Upload files:
   - Zip folder `dist/` jadi `dist.zip`
   - Upload `dist.zip` ke `public_html/`
   - Extract zip di `public_html/`
   - Move semua file dari `public_html/dist/` ke `public_html/`
   - Delete folder `dist/` dan `dist.zip`

6. Verify structure di Hostinger:
```
public_html/
  ├── index.html
  ├── manifest.json
  ├── sw.js
  ├── .htaccess  # PENTING!
  ├── assets/
  └── peraturan/
```

### Option 2: Via FTP

```bash
# Install WinSCP atau FileZilla

# FTP credentials dari Hostinger:
Host: ftp.dpmdbogorkab.id (atau IP)
Username: [dari Hostinger]
Password: [dari Hostinger]
Port: 21

# Upload:
1. Connect ke FTP
2. Navigate ke public_html/
3. Backup existing files
4. Upload semua file dari dist/ ke public_html/
```

### Option 3: Via Git Deploy (Advanced)

```bash
# Setup git deployment di Hostinger:
# 1. Enable SSH Access di Hostinger
# 2. Setup git repository di public_html
# 3. Create post-receive hook untuk auto-build

# Ini butuh SSH access, skip jika tidak tersedia
```

## 🔧 Konfigurasi .htaccess (PENTING!)

Create/update `.htaccess` di `public_html/`:

```apache
# dpmd-frontend/.htaccess untuk Hostinger
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Redirect HTTP to HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
  
  # SPA routing - redirect all to index.html
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Cache control
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/json "access plus 0 seconds"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css
  AddOutputFilterByType DEFLATE application/javascript application/json
</IfModule>

# Service Worker headers
<FilesMatch "sw\.js$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires 0
  Header set Service-Worker-Allowed "/"
</FilesMatch>

# Manifest headers
<FilesMatch "manifest\.json$">
  Header set Content-Type "application/manifest+json"
</FilesMatch>
```

**Upload .htaccess ini ke Hostinger!**

## ✅ Post-Upload Checklist

### 1. Test Basic Access

```bash
# Buka browser
https://dpmdbogorkab.id

# Expected: Landing page muncul
```

### 2. Test API Connection

```bash
# Open browser console (F12)
# Navigate ke halaman login
# Check Network tab:
# - Request ke https://api.dpmdbogorkab.id/api/... should work
# - No CORS errors
```

### 3. Test Service Worker

```bash
# Browser console:
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs))

# Expected: Service Worker registered
# Check Application tab → Service Workers
# Status should be "activated and running"
```

### 4. Test Push Notification

```bash
# Login ke aplikasi
# Navigate ke /settings atau tempat enable notification
# Click "Enable Notifications"
# Expected:
# - Browser permission prompt muncul
# - Setelah allow, subscription berhasil
# - Console log "Push notification enabled"
```

### 5. Test PWA Install

```bash
# Desktop browser:
# - Chrome: Address bar → Install icon (⊕)
# - Edge: Address bar → App available

# Mobile browser:
# - Safari iOS: Share → Add to Home Screen
# - Chrome Android: Menu → Install app
```

### 6. Test Routes

```bash
# Test beberapa routes:
https://dpmdbogorkab.id/login
https://dpmdbogorkab.id/admin/dashboard
https://dpmdbogorkab.id/desa/bumdes

# Expected: All routes work (no 404)
# If 404, check .htaccess configuration
```

## 🐛 Troubleshooting

### Issue: Blank page setelah upload

**Solution:**
```bash
# Check browser console
# Kemungkinan:
# 1. API URL salah → Check .env.production sebelum build
# 2. File path issue → Check vite.config.js base path
# 3. JS error → Check console untuk error details
```

### Issue: Service Worker not registering

**Solution:**
```bash
# 1. Pastikan HTTPS enabled
# 2. Check sw.js accessible: https://dpmdbogorkab.id/sw.js
# 3. Check .htaccess Service-Worker-Allowed header
# 4. Clear cache and hard reload (Ctrl+Shift+R)
```

### Issue: Push notification tidak work

**Solution:**
```bash
# 1. Check VAPID key di .env.production sama dengan backend
# 2. Check browser console untuk error
# 3. Verify subscription endpoint: 
#    Should POST to https://api.dpmdbogorkab.id/api/push-notification/subscribe
# 4. Check backend logs untuk error
```

### Issue: Routes return 404

**Solution:**
```bash
# 1. Check .htaccess ada di public_html/
# 2. Check .htaccess content (harus ada SPA routing)
# 3. Test mod_rewrite enabled:
#    Create test.php:
#    <?php phpinfo(); ?>
#    Search for "mod_rewrite"
```

### Issue: CORS errors

**Solution:**
```bash
# Backend harus allow origin dari Hostinger
# Check backend .env:
CORS_ORIGIN=https://dpmdbogorkab.id

# Check backend server.js:
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}))
```

## 📱 Testing Checklist

- [ ] Landing page loads: https://dpmdbogorkab.id
- [ ] Login works
- [ ] Dashboard loads
- [ ] API calls successful (check Network tab)
- [ ] Service Worker registered
- [ ] Push notification subscription works
- [ ] PWA install prompt muncul (desktop)
- [ ] All routes accessible (no 404)
- [ ] Images/assets load correctly
- [ ] Mobile responsive
- [ ] No console errors

## 🔄 Update Process (Setelah Initial Deploy)

### Quick Update (No dependency changes)

```bash
# Local machine
cd dpmd-frontend
npm run build

# Upload only changed files:
# - dist/index.html
# - dist/assets/* (new hashed files)
# - dist/sw.js (if changed)

# Delete old hashed files dari Hostinger
```

### Full Update (With dependency changes)

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Upload entire dist/ ke Hostinger
# 5. Clear cache di browser
```

## 📊 Performance Optimization

### 1. Enable Gzip compression di Hostinger

```apache
# Already in .htaccess
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE ...
</IfModule>
```

### 2. Enable browser caching

```apache
# Already in .htaccess
<IfModule mod_expires.c>
  ExpiresActive On
  ...
</IfModule>
```

### 3. Optimize images

```bash
# Before upload, compress images:
# Use tools like TinyPNG, ImageOptim
# Or install imagemin:
npm install -D vite-plugin-imagemin
```

### 4. Code splitting (Already configured in Vite)

```javascript
// vite.config.js already has:
build: {
  rollupOptions: {
    output: {
      manualChunks: {...}
    }
  }
}
```

## 🎯 Final Verification

Setelah deploy, test dari berbagai device:

1. **Desktop Browser** (Chrome, Firefox, Edge):
   - All features work
   - PWA install available
   - Push notifications work

2. **Mobile Browser** (Chrome Android, Safari iOS):
   - Responsive layout
   - PWA install works
   - Push notifications work (Android)
   - Note: iOS Safari limited push notification support

3. **PWA Mode** (After install):
   - Standalone mode works
   - Notifications display correctly
   - App icon on home screen
   - Splash screen shows

---

**Last Updated**: Build for Hostinger deployment
**Frontend Repo**: https://github.com/erlanggart/dpmd-frontend.git
**Production URL**: https://dpmdbogorkab.id
**API URL**: https://api.dpmdbogorkab.id
