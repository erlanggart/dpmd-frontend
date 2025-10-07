# Sistem Role-Based Dashboard Disposisi Persuratan

## Overview
Sistem disposisi persuratan sekarang menggunakan role-based access control dengan dashboard terpisah untuk setiap role.

## Roles dan Access

### 1. Staff Sekretariat (`staff`)
- **Access**: Input surat masuk
- **Route**: `/dashboard/disposisi-persuratan`
- **Component**: `SuratMasuk.jsx`
- **Function**: Menginput surat masuk yang akan direview Kepala Dinas

### 2. Kepala Dinas (`kepala_dinas`)
- **Access**: Review dan disposisi surat
- **Route**: `/dashboard/disposisi/kepala-dinas`
- **Component**: `KepalaDinas.jsx`
- **Function**: 
  - Review surat masuk dari staff
  - Membuat disposisi ke Sekretaris Dinas atau langsung ke Bidang
  - Dashboard dengan statistik surat

### 3. Sekretaris Dinas (`sekretaris_dinas`)
- **Access**: Kelola disposisi dari Kepala Dinas
- **Route**: `/dashboard/disposisi/sekretaris-dinas`
- **Component**: `SekretarisDinas.jsx`
- **Function**:
  - Menerima disposisi dari Kepala Dinas
  - Meneruskan disposisi ke bidang terkait
  - Menandai disposisi selesai jika tidak perlu diteruskan

### 4. Kepala Bidang (`kepala_bidang_*`)
- **Access**: Terima dan laporkan disposisi
- **Route**: `/dashboard/disposisi/kepala-bidang`
- **Component**: `KepalaBidang.jsx`
- **Roles**: 
  - `kepala_bidang_pemerintahan`
  - `kepala_bidang_kesra`
  - `kepala_bidang_ekonomi`  
  - `kepala_bidang_fisik`
- **Function**:
  - Menerima disposisi dari Kepala Dinas/Sekretaris
  - Membuat laporan penyelesaian disposisi
  - Dashboard dengan tracking deadline dan status

## Komponen Utama

### Route Protection
- `RoleGuard.jsx`: Melindungi route berdasarkan role
- Redirect otomatis ke `/dashboard` jika tidak ada akses

### Role Management
- `roleUtils.js`: Utility functions untuk role management
- Functions:
  - `getUserRole()`: Mendapatkan role user
  - `getDisposisiMenuPath(role)`: Route sesuai role
  - `getDisposisiMenuLabel(role)`: Label menu sesuai role
  - `hasDisposisiAccess(role)`: Cek akses disposisi
  - `canAccessRole(userRole, requiredRole)`: Validasi akses

### Auto Redirect
Main component (`index.jsx`) otomatis redirect user ke dashboard sesuai role:
```javascript
switch (userData.role) {
  case 'kepala_dinas':
    navigate('/dashboard/disposisi/kepala-dinas');
    break;
  case 'sekretaris_dinas':
    navigate('/dashboard/disposisi/sekretaris-dinas');
    break;
  // dst...
}
```

## Menu Integration
- `UniversalDashboard.jsx`: Quick actions otomatis sesuai role
- `MainLayout.jsx`: Menu navigasi adaptif berdasarkan role

## Development Tools

### Role Switcher
- Komponen `RoleSwitcher.jsx` untuk testing (hanya muncul di development)
- Located di bottom-right corner
- Bisa switch role tanpa logout/login ulang

### Testing Roles
1. Buka aplikasi di development mode
2. Gunakan RoleSwitcher di bottom-right
3. Pilih role yang ingin ditest
4. Halaman akan reload dengan role baru

## API Endpoints (Backend Requirements)

### User Profile
```
GET /api/user/profile
Response: { role: 'kepala_dinas', name: 'User Name', ... }
```

### Kepala Dinas
```
GET /api/disposisi/kepala-dinas/surat-masuk
POST /api/disposisi/kepala-dinas/{id}/disposisi
```

### Sekretaris Dinas  
```
GET /api/disposisi/sekretaris-dinas/disposisi-masuk
POST /api/disposisi/sekretaris-dinas/{id}/teruskan
POST /api/disposisi/sekretaris-dinas/{id}/selesai
```

### Kepala Bidang
```
GET /api/disposisi/kepala-bidang/info
GET /api/disposisi/kepala-bidang/disposisi-masuk
POST /api/disposisi/kepala-bidang/{id}/laporan
```

## Styling
- Semua role menggunakan CSS yang sama: `disposisi.css`
- Modern design dengan statistik cards
- Responsive table dengan status badges
- Loading states dan modal dialogs

## Security Notes
- Route protection dengan RoleGuard
- Role validation di setiap component
- Automatic redirect untuk unauthorized access
- Token-based authentication tetap berlaku

## File Structure
```
src/
├── pages/sekretariat/disposisi/
│   ├── index.jsx (Main component dengan auto-redirect)
│   ├── SuratMasuk.jsx (Staff)
│   ├── KepalaDinas.jsx (Kepala Dinas)
│   ├── SekretarisDinas.jsx (Sekretaris Dinas)
│   ├── KepalaBidang.jsx (Kepala Bidang)
│   └── disposisi.css (Shared styling)
├── components/guards/
│   └── RoleGuard.jsx (Route protection)
├── utils/
│   └── roleUtils.js (Role utilities)
└── components/
    └── RoleSwitcher.jsx (Development tool)
```