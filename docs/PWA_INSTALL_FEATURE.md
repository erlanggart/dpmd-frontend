# Fitur Install PWA

## Overview
Fitur install Progressive Web App (PWA) telah diintegrasikan ke seluruh aplikasi DPMD Kabupaten Bogor dengan deteksi platform otomatis dan panduan khusus untuk iOS.

## Komponen Utama

### InstallPWA Component
**Lokasi**: `src/components/InstallPWA.jsx`

**Fitur**:
- ✅ **Auto-install** untuk Desktop & Android (Chrome, Edge, Samsung Internet)
- ✅ **Panduan Manual** untuk iOS Safari (modal dengan step-by-step)
- ✅ **Deteksi Platform** otomatis (iOS vs Android/Desktop)
- ✅ **Deteksi Status Install** - button hidden jika sudah terinstall
- ✅ **Responsive Design** - compact mode untuk header, full width untuk sidebar

**Props**:
```jsx
<InstallPWA compact={false} />
```
- `compact`: Boolean - true untuk tampilan compact di header (default: false)

## Lokasi Integrasi

### 1. Landing Page
**File**: `src/pages/LandingPage.jsx`
- Desktop Navigation: Button compact di header
- Mobile Menu: Button full width di hamburger menu

### 2. Dashboard Layouts

#### DesaLayout
**File**: `src/layouts/DesaLayout.jsx`
- Sidebar: Button muncul saat sidebar terbuka

#### CoreDashboardLayout
**File**: `src/layouts/CoreDashboardLayout.jsx`
- Sidebar: Button muncul di atas logout button

#### MainLayout
**File**: `src/layouts/MainLayout.jsx`
- Sidebar: Button muncul saat sidebar tidak minimized

#### VPNDashboardLayout
**File**: `src/layouts/VPNDashboardLayout.jsx`
- Sidebar: Button muncul di atas footer

## Cara Kerja

### Desktop & Android (Chrome/Edge)
1. Browser mendeteksi PWA installable
2. Event `beforeinstallprompt` ditrigger
3. Button "Install Aplikasi" muncul
4. User klik → Install prompt native browser muncul
5. User accept → App terinstall ke home screen/desktop

### iOS Safari
1. User klik button "Panduan Install"
2. Modal tutorial muncul dengan 4 langkah:
   - Buka Safari
   - Tap icon Share (kotak + panah)
   - Pilih "Add to Home Screen"
   - Tap "Add"
3. User follow panduan manual
4. App icon muncul di iOS home screen

## Konfigurasi PWA

### Manifest
**File**: `public/manifest.json`
```json
{
  "name": "DPMD Kabupaten Bogor",
  "short_name": "DPMD",
  "display": "standalone",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker
**File**: `public/sw.js`
- Cache strategy: Cache-first dengan network fallback
- Cache name: `dpmd-cache-v1`
- Support push notifications

## Testing

### Desktop (Chrome/Edge)
1. Buka DevTools → Application → Manifest
2. Verifikasi manifest loaded
3. Klik "Install" di address bar atau button di app
4. App icon muncul di desktop

### Android (Chrome/Samsung Internet)
1. Buka aplikasi di browser
2. Button "Install Aplikasi" muncul
3. Klik → Accept prompt
4. App icon muncul di home screen

### iOS Safari
1. Buka aplikasi di Safari
2. Button "Panduan Install" muncul
3. Klik → Modal panduan terbuka
4. Follow 4 langkah manual
5. App icon muncul di home screen

## Troubleshooting

### Button tidak muncul di Desktop/Android
**Penyebab**:
- PWA sudah terinstall (cek standalone mode)
- Browser tidak support PWA (gunakan Chrome/Edge)
- HTTPS tidak aktif (PWA require HTTPS)

**Solusi**:
- Uninstall app dari device
- Gunakan browser yang support
- Deploy ke HTTPS domain

### Button tidak muncul di iOS
**Penyebab**:
- Bukan menggunakan Safari browser
- Sudah dalam standalone mode

**Solusi**:
- Buka di Safari
- Reload halaman

### Install gagal
**Penyebab**:
- Manifest.json tidak valid
- Service worker tidak registered
- Icons tidak ditemukan

**Solusi**:
- Cek console untuk error
- Verifikasi `public/manifest.json`
- Verifikasi icon files exist di `public/`

## Browser Support

| Browser | Desktop | Android | iOS |
|---------|---------|---------|-----|
| Chrome | ✅ Auto | ✅ Auto | ❌ |
| Edge | ✅ Auto | ✅ Auto | ❌ |
| Safari | ❌ | ❌ | ✅ Manual |
| Firefox | ⚠️ Limited | ⚠️ Limited | ❌ |
| Samsung Internet | - | ✅ Auto | - |

## Update History

**2025-12-17**: Initial implementation
- Created InstallPWA component with iOS detection
- Integrated to all layouts and landing page
- Added iOS manual guide modal
