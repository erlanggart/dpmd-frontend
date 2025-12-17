# Laporan Desa - Core Dashboard

## 📋 Deskripsi
Fitur **Laporan Desa** menampilkan data laporan dari seluruh desa di Kabupaten Bogor. Data diambil dari API eksternal DPMD Bogor.

## 🚀 Cara Akses
1. Login ke sistem
2. Navigasi ke **Core Dashboard**
3. Klik menu **"Laporan Desa"**

## 🔑 API Configuration

### Base URL
```
https://dpmd.bogorkab.go.id/laporan_kab_bogor/api
```

### Authentikasi
API menggunakan **API Key** yang dikirim via header:
```
X-API-KEY: your-api-key-here
```

### Setup Environment Variable
Tambahkan ke file `.env`:
```bash
VITE_LAPORAN_API_KEY="your-api-key-here"
```

## 📡 Endpoint yang Digunakan

### 1. GET /api/laporan
Mengambil list laporan dengan filter dan pagination.

**Query Parameters:**
- `page` - Nomor halaman (default: 1)
- `per_page` - Jumlah data per halaman (default: 20)
- `id_kelurahan` - Filter berdasarkan ID kelurahan
- `id_jenis_laporan` - Filter berdasarkan ID jenis laporan
- `tahun_kegiatan` - Filter berdasarkan tahun kegiatan
- `status_laporan` - Filter berdasarkan status (Terverifikasi, Belum Terverifikasi, Ditolak)
- `transparansi_laporan` - Filter berdasarkan transparansi (Terbuka, Tertutup)
- `q` - Pencarian bebas di judul & uraian laporan

**Response:**
```json
{
  "status": true,
  "message": "OK",
  "data": [
    {
      "id_laporan": "667",
      "judul_laporan": "Laporan RPJMDes Perubahan Desa Pingku",
      "uraian_laporan": "RPJMDes Perubahan Desa Pingku Tahun 2020 - 2028",
      "tahun_kegiatan": "2026",
      "status_laporan": "Terverifikasi",
      "nama_kelurahan": "Pingku",
      "jenis_laporan": "RPJMDes",
      "nama_bidang": "Bid. Pemerintahan Desa",
      "files": [
        {
          "id_file_laporan": 800,
          "nama_file": "1763458724...Pingku.pdf",
          "url": "https://dpmd.bogorkab.go.id/laporan_kab_bogor/uploads/laporan/1763458724...Pingku.pdf"
        }
      ]
    }
  ],
  "pagination": {
    "total": 598,
    "per_page": 20,
    "current_page": 1,
    "last_page": 30
  }
}
```

### 2. GET /api/jenis-laporan
Mengambil master data jenis laporan untuk dropdown filter.

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id_jenis_laporan": "21",
      "nama_jenis_laporan": "RPJMDes"
    },
    {
      "id_jenis_laporan": "22",
      "nama_jenis_laporan": "RKPDes"
    }
  ]
}
```

### 3. GET /api/kelurahan
Mengambil master data kelurahan/desa untuk dropdown filter.

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id_kelurahan": "339",
      "nama_kelurahan": "Pingku",
      "nama_kecamatan": "Ciampea"
    }
  ]
}
```

### 4. GET /api/laporan/{id}
Mengambil detail lengkap satu laporan berdasarkan `id_laporan`.

**Request:**
```bash
GET https://dpmd.bogorkab.go.id/laporan_kab_bogor/api/laporan/667
X-API-KEY: SECRET-KEY
```

**Response:**
```json
{
  "status": true,
  "message": "OK",
  "data": {
    "id_laporan": "667",
    "judul_laporan": "Laporan RPJMDes Perubahan Desa Pingku",
    "uraian_laporan": "RPJMDes Perubahan Desa Pingku Tahun 2020 - 2028",
    "tahun_kegiatan": "2026",
    "status_laporan": "Terverifikasi",
    "transparansi_laporan": "Terbuka",
    "nama_kelurahan": "Pingku",
    "nama_kecamatan": "Ciampea",
    "jenis_laporan": "RPJMDes",
    "nama_bidang": "Bid. Pemerintahan Desa",
    "created_at": "2024-12-01 10:30:00",
    "files": [
      {
        "id_file_laporan": 800,
        "nama_file": "1763458724_RPJMDes_Pingku.pdf",
        "url": "https://dpmd.bogorkab.go.id/laporan_kab_bogor/uploads/laporan/1763458724_RPJMDes_Pingku.pdf"
      }
    ]
  }
}
```

## ✨ Fitur

### Filter & Pencarian
- **Pencarian teks bebas** di judul dan uraian laporan
- **Filter jenis laporan** (RPJMDes, RKPDes, dll)
- **Filter desa/kelurahan** dengan nama kecamatan
- **Filter tahun kegiatan** (2020-2025)
- **Filter status verifikasi** (Terverifikasi, Belum Terverifikasi, Ditolak)
- **Filter transparansi** (Terbuka, Tertutup)

### Detail Laporan
- **Modal popup** untuk detail lengkap laporan
- Tampil dengan klik tombol **"Lihat Detail"**
- Info lengkap: Judul, uraian, desa, kecamatan, tahun, jenis laporan, bidang
- **Tanggal upload** laporan
- **Status & transparansi** dengan badge warna
- **Semua file lampiran** dengan link download
- **Responsive** untuk semua ukuran layar

### Pagination
- Navigasi halaman sebelumnya/selanjutnya
- Pilihan jumlah data per halaman (10, 20, 50, 100)
- Info total data dan halaman saat ini

### Display
- **Card layout** yang responsive
- **Badge status** dengan warna berbeda
- **Info lengkap**: Desa, tahun, jenis laporan, bidang
- **File lampiran** dengan link download langsung
- **Loading state** saat fetch data
- **Smooth animations** pada modal

## 🎨 UI Components
- Clean & modern design dengan Tailwind CSS
- Responsive layout (mobile, tablet, desktop)
- Icons dari `react-icons/fi` (Feather Icons)
- Toast notifications untuk feedback

## 📁 File Location
```
/src/pages/kepala-dinas/LaporanDesa.jsx
```

## 🔗 Route
```
/core-dashboard/laporan-desa
```

## 🛠️ Tech Stack
- React 18
- Axios (HTTP client)
- React Router v6
- Tailwind CSS
- React Hot Toast

## 📝 Notes
- API Key default: `SECRET-KEY` (untuk development)
- Ganti dengan production API key saat deploy
- Data bersifat **read-only** (tidak ada create/update/delete)
- File lampiran di-host di server eksternal DPMD

## 🔒 Security
- API Key disimpan di environment variable (tidak di-commit ke Git)
- HTTPS untuk production
- CORS handled by API server

## 📚 Dokumentasi API Lengkap
https://dpmd.bogorkab.go.id/laporan_kab_bogor/docs/api-laporan
