# Akun Testing Sistem Disposisi Persuratan

## Akun yang Tersedia

### 1. Staff Sekretariat (Input Surat Masuk)
- **Email**: `staff.sekretariat@dpmd.com`
- **Password**: `password`
- **Role**: `staff`
- **Akses**: Input surat masuk yang akan direview Kepala Dinas
- **Dashboard**: `/dashboard/disposisi-persuratan`

### 2. Kepala Dinas (Review & Disposisi)
- **Email**: `kepala.dinas@dpmd.com`
- **Password**: `password`
- **Role**: `kepala_dinas`
- **Akses**: Review surat masuk dan membuat disposisi
- **Dashboard**: `/dashboard/disposisi/kepala-dinas`

### 3. Sekretaris Dinas (Kelola Disposisi)
- **Email**: `sekretaris.dinas@dpmd.com`
- **Password**: `password`
- **Role**: `sekretaris_dinas`
- **Akses**: Kelola dan teruskan disposisi ke bidang
- **Dashboard**: `/dashboard/disposisi/sekretaris-dinas`

### 4. Kepala Bidang Pemerintahan
- **Email**: `kepala.pemerintahan@dpmd.com`
- **Password**: `password`
- **Role**: `kepala_bidang_pemerintahan`
- **Akses**: Terima dan laporkan disposisi bidang pemerintahan
- **Dashboard**: `/dashboard/disposisi/kepala-bidang`

### 5. Kepala Bidang Kesejahteraan Rakyat
- **Email**: `kepala.kesra@dpmd.com`
- **Password**: `password`
- **Role**: `kepala_bidang_kesra`
- **Akses**: Terima dan laporkan disposisi bidang kesra
- **Dashboard**: `/dashboard/disposisi/kepala-bidang`

### 6. Kepala Bidang Ekonomi
- **Email**: `kepala.ekonomi@dpmd.com`
- **Password**: `password`
- **Role**: `kepala_bidang_ekonomi`
- **Akses**: Terima dan laporkan disposisi bidang ekonomi
- **Dashboard**: `/dashboard/disposisi/kepala-bidang`

### 7. Kepala Bidang Fisik dan Prasarana
- **Email**: `kepala.fisik@dpmd.com`
- **Password**: `password`
- **Role**: `kepala_bidang_fisik`
- **Akses**: Terima dan laporkan disposisi bidang fisik
- **Dashboard**: `/dashboard/disposisi/kepala-bidang`

## Alur Testing Sistem Disposisi

### 1. Input Surat Masuk
- Login sebagai **Staff Sekretariat** (`staff.sekretariat@dpmd.com`)
- Masuk ke menu "Disposisi Persuratan"
- Input data surat masuk baru

### 2. Review dan Disposisi oleh Kepala Dinas
- Login sebagai **Kepala Dinas** (`kepala.dinas@dpmd.com`)
- Masuk ke menu "Disposisi - Kepala Dinas"
- Review surat masuk dari staff
- Buat disposisi ke Sekretaris Dinas atau langsung ke Bidang

### 3. Kelola Disposisi oleh Sekretaris Dinas
- Login sebagai **Sekretaris Dinas** (`sekretaris.dinas@dpmd.com`)
- Masuk ke menu "Disposisi - Sekretaris"
- Terima disposisi dari Kepala Dinas
- Teruskan ke bidang terkait atau tandai selesai

### 4. Penyelesaian oleh Kepala Bidang
- Login sebagai salah satu **Kepala Bidang**
- Masuk ke menu "Disposisi - Bid. [Nama Bidang]"
- Terima disposisi dari Kepala/Sekretaris Dinas
- Buat laporan penyelesaian disposisi

## Catatan Penting

### Role Mapping
- Role `sekretariat` (admin sekretariat) otomatis dimapping ke `staff` untuk sistem disposisi
- Setiap role memiliki dashboard dan akses yang terpisah
- Route protection mencegah akses unauthorized

### Development Tools
- **RoleSwitcher**: Tersedia di bottom-right untuk testing (hanya development mode)
- Bisa switch role tanpa logout/login ulang
- Memudahkan testing workflow disposisi

### Password Default
- Semua akun menggunakan password: `password`
- Dapat diubah melalui sistem manajemen user

### Auto Redirect
- Sistem otomatis redirect user ke dashboard sesuai role
- Jika akses tidak sesuai, redirect ke `/dashboard`

## Testing Workflow

1. **Login Staff** → Input surat masuk
2. **Login Kepala Dinas** → Review & buat disposisi  
3. **Login Sekretaris** → Kelola & teruskan disposisi
4. **Login Kepala Bidang** → Terima & buat laporan

Semua akun siap digunakan untuk testing sistem disposisi persuratan!