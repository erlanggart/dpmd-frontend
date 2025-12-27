# Setup Guide - DPMD Application

## 📋 Prerequisites

- Node.js v18+ atau v20+
- MySQL 8.0+
- Git
- npm atau yarn

## 🚀 Quick Start (Fresh Install)

### 1. Clone Repository

```bash
git clone https://github.com/erlanggart/dpmd-frontend.git
cd dpmd-frontend
```

### 2. Backend Setup

```bash
# Masuk ke folder backend
cd dpmd-fahri-express

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env dengan database credentials
nano .env  # atau text editor lain
```

**Edit `.env`:**
```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/dpmd"
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-here-change-this
JWT_EXPIRES_IN=7d
```

### 3. Database Setup

```bash
# Login ke MySQL
mysql -u root -p

# Buat database
CREATE DATABASE dpmd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 4. Run Migrations

```bash
# Di folder dpmd-fahri-express
npm run migrate

# Atau manual
node database-express/migrate.js
```

### 5. Run Seeders

```bash
# Run all seeders
npm run seed

# Atau manual per file
mysql -u root -p dpmd < database-express/seeders/001_seed_master_and_sample_data.sql
mysql -u root -p dpmd < database-express/seeders/002_seed_wilayah_kecamatan_desa.sql
mysql -u root -p dpmd < database-express/seeders/003_seed_bidang_pegawai.sql
```

### 6. Verify Installation

```bash
# Check database schema
node database-express/check-schema.js

# Check pegawai relation
node database-express/check-pegawai-relation.js
```

Expected output:
- 534 total users
- 98 pegawai records
- 8 bidangs
- 13 roles dalam enum

### 7. Start Backend Server

```bash
npm run dev
```

Backend akan berjalan di `http://localhost:3000`

### 8. Frontend Setup

```bash
# Buka terminal baru, kembali ke root folder
cd ../dpmd-frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env
nano .env
```

**Edit `.env`:**
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=DPMD Kabupaten Bogor
```

### 9. Start Frontend Server

```bash
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

### 10. Login ke Aplikasi

Buka browser dan akses `http://localhost:5173`

**Default Credentials:**
- Email: `superadmin@dpmd.go.id`
- Password: `password`

**⚠️ PENTING:** Ganti password default setelah login pertama kali!

## 🔧 Update Existing Installation

Jika teman Anda sudah punya database dan ingin update ke versi terbaru:

```bash
# 1. Backup database dulu!
mysqldump -u root -p dpmd > backup_dpmd_$(date +%Y%m%d_%H%M%S).sql

# 2. Pull latest code
git pull origin fahri

# 3. Update backend dependencies
cd dpmd-fahri-express
npm install

# 4. Run new migrations
npm run migrate

# 5. Update frontend dependencies
cd ../dpmd-frontend
npm install

# 6. Restart servers
# Backend
cd ../dpmd-fahri-express
npm run dev

# Frontend (terminal baru)
cd dpmd-frontend
npm run dev
```

## 📊 Database Structure Check

Setelah install, jalankan script check untuk verifikasi:

```bash
cd dpmd-fahri-express

# Check schema lengkap
node database-express/check-schema.js

# Check relasi pegawai
node database-express/check-pegawai-relation.js
```

Expected Results:

### check-schema.js
```
=== USERS TABLE STRUCTURE ===
16 columns (id, name, email, role, pegawai_id, bidang_id, etc)

=== USERS ROLE ENUM VALUES ===
13 roles (superadmin, kepala_dinas, sekretaris_dinas, ...)

=== ROLE DISTRIBUTION ===
- desa: 435
- pegawai: 93
- kepala_bidang: 2
- ketua_tim: 1
- kepala_dinas: 1
- sekretaris_dinas: 1

=== BIDANGS TABLE ===
8 bidangs (Sekretariat, Sarana Prasarana, ...)
```

### check-pegawai-relation.js
```
Total records in pegawai table: 98

Users with pegawai_id: 10 (ter-link ke tabel pegawai)
Users without pegawai_id but DPMD roles: 88 (pakai fallback bidang_id)

BIDANG DISTRIBUTION:
- Sekretariat: 17 pegawai
- Sarana Prasarana: 9 pegawai
- Kekayaan & Keuangan: 10 pegawai
- Pemberdayaan Masyarakat: 11 pegawai
- Pemerintahan Desa: 12 pegawai
- Tenaga Alih Daya: 22 pegawai
- Tenaga Keamanan: 8 pegawai
- Tenaga Kebersihan: 9 pegawai
```

## 🐛 Troubleshooting

### Backend tidak bisa connect ke database

```bash
# Check MySQL running
sudo systemctl status mysql  # Linux
# atau
brew services list  # Mac
# atau
services.msc  # Windows

# Check database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'dpmd';"
```

### Migration gagal

```bash
# Drop dan recreate database (DANGER! Data akan hilang)
mysql -u root -p -e "DROP DATABASE IF EXISTS dpmd; CREATE DATABASE dpmd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migration lagi
cd dpmd-fahri-express
npm run migrate
```

### Seeder gagal: Duplicate entry

```bash
# Clear table yang duplicate
mysql -u root -p dpmd -e "DELETE FROM users WHERE email LIKE '%@dpmd.go.id';"

# Run seeder lagi
npm run seed
```

### Frontend tidak bisa fetch data

1. Check backend running di port 3000
2. Check VITE_API_URL di `.env` frontend
3. Check CORS settings di backend
4. Check browser console untuk error

### Bidang tidak muncul di user card

```bash
# Check relasi pegawai
node database-express/check-pegawai-relation.js

# Expected: Controller sudah support fallback ke bidang_id
# Jika tetap tidak muncul, restart backend
```

## 🔐 Security Notes

### Production Deployment

1. **Ganti semua password default**
2. **Generate JWT secret baru:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. **Update .env.production:**
   ```env
   NODE_ENV=production
   JWT_SECRET=<generated-secret>
   DATABASE_URL=<production-db-url>
   ```
4. **Set NODE_ENV=production** di server
5. **Enable HTTPS** untuk production
6. **Setup proper CORS** di backend
7. **Enable rate limiting** di API endpoints

## 📚 Additional Documentation

- `BIDANG_SCHEMA_FIX.md` - Database schema explanation
- `PAGINATION_FEATURE.md` - Pagination implementation
- `MIGRATION_SEEDER_STATUS.md` - Migration & seeder status
- `database-express/README.md` - Database migration guide

## 🆘 Need Help?

Jika ada masalah saat setup:

1. Check logs di terminal (backend & frontend)
2. Check browser console untuk frontend errors
3. Check `logs/error.log` di backend
4. Jalankan check scripts untuk verifikasi database
5. Buat issue di GitHub dengan error message lengkap

## ✅ Checklist Setup Success

- [ ] Backend running tanpa error
- [ ] Frontend running tanpa error
- [ ] Bisa login dengan superadmin credentials
- [ ] User management page tampil dengan pagination
- [ ] Bidang tampil di setiap pegawai card
- [ ] Statistics cards menunjukkan data yang benar
- [ ] Bisa tambah user baru
- [ ] Bisa edit role dan bidang
- [ ] Bisa reset password
- [ ] Bisa hapus user

Jika semua checklist ✅, instalasi berhasil! 🎉
