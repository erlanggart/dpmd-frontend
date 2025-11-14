# Troubleshooting: Produk Hukum Tidak Muncul di Dropdown BUMDES

## Masalah
Setelah upload Produk Hukum (Perdes/SK) di menu Produk Hukum, dokumen tidak muncul di dropdown saat input data BUMDES.

## Langkah-langkah Debugging

### 1. Verifikasi Data Produk Hukum di Database

Buka **phpMyAdmin** atau MySQL client, jalankan query:

```sql
-- Cek semua Produk Hukum yang ada
SELECT id, desa_id, jenis, nomor, tahun, judul, tanggal_penetapan, created_at
FROM produk_hukums
ORDER BY created_at DESC;

-- Cek Produk Hukum untuk desa tertentu (ganti dengan desa_id Anda)
SELECT id, desa_id, jenis, nomor, tahun, judul, tanggal_penetapan
FROM produk_hukums
WHERE desa_id = 1  -- Ganti dengan desa_id Anda
ORDER BY tanggal_penetapan DESC;
```

**Expected Result**: Harus ada data dengan:
- `desa_id` sesuai dengan ID desa yang login
- `jenis` = 'Peraturan Desa' atau 'Keputusan Kepala Desa'
- `nomor`, `tahun`, `judul` terisi

### 2. Cek User Login dan desa_id

```sql
-- Cek user yang sedang login
SELECT id, name, email, role, desa_id
FROM users
WHERE email = 'email@anda.com';  -- Ganti dengan email login Anda

-- Cek data desa
SELECT id, nama, kecamatan_id
FROM desas
WHERE id = 1;  -- Ganti dengan desa_id dari user
```

**Expected Result**: 
- User harus punya `role` = 'desa'
- User harus punya `desa_id` yang valid (tidak NULL)

### 3. Test API Endpoint di Browser Console

Buka halaman BUMDES, tekan **F12**, buka tab **Console**, jalankan:

```javascript
// Test 1: Cek token dan user info
console.log('Token:', localStorage.getItem('token'));

// Test 2: Fetch Produk Hukum
fetch('/api/desa/bumdes/produk-hukum', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Accept': 'application/json'
  }
})
.then(r => r.json())
.then(data => {
  console.log('=== PRODUK HUKUM RESPONSE ===');
  console.log('Success:', data.success);
  console.log('Total:', data.summary?.total || 0);
  console.log('Perdes count:', data.summary?.perdes_count || 0);
  console.log('SK count:', data.summary?.sk_count || 0);
  console.log('Debug Info:', data.debug);
  console.log('Full Response:', data);
  
  // List semua Perdes
  if (data.data?.perdes?.length > 0) {
    console.log('\n=== PERDES YANG TERSEDIA ===');
    data.data.perdes.forEach((p, i) => {
      console.log(`${i+1}. ${p.nomor} - ${p.judul} (${p.tahun})`);
    });
  } else {
    console.warn('⚠️ TIDAK ADA PERDES');
  }
  
  // List semua SK
  if (data.data?.sk?.length > 0) {
    console.log('\n=== SK YANG TERSEDIA ===');
    data.data.sk.forEach((s, i) => {
      console.log(`${i+1}. ${s.nomor} - ${s.judul} (${s.tahun})`);
    });
  } else {
    console.warn('⚠️ TIDAK ADA SK');
  }
})
.catch(err => {
  console.error('❌ ERROR:', err);
});
```

### 4. Cek Backend Log

Buka file: `storage/logs/laravel.log`

Cari log dengan pattern:
```
[timestamp] local.INFO: Fetching Produk Hukum for BUMDES
[timestamp] local.INFO: Produk Hukum Query Result
```

**Expected Log**:
```
[2025-10-27 ...] local.INFO: Fetching Produk Hukum for BUMDES 
{"desa_id":1,"user_id":5,"desa_nama":"Cilebut Barat"}

[2025-10-27 ...] local.INFO: Produk Hukum Query Result 
{"total_found":2,"desa_id_filter":1,"items":[...]}
```

### 5. Cek Network Tab di Browser

1. Buka halaman BUMDES
2. Tekan **F12** → Tab **Network**
3. Klik tombol **Edit** di form BUMDES
4. Cari request ke: `bumdes/produk-hukum`
5. Klik request tersebut → Tab **Response**

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "perdes": [...],
    "sk": [...],
    "all": [...]
  },
  "summary": {
    "total": 2,
    "perdes_count": 1,
    "sk_count": 1
  },
  "debug": {
    "desa_id": 1,
    "desa_nama": "Cilebut Barat"
  }
}
```

## Kemungkinan Masalah dan Solusi

### Problem 1: `desa_id` NULL di tabel `produk_hukums`

**Symptoms**: 
- Query SQL mengembalikan 0 rows untuk desa_id tertentu
- Log menunjukkan `total_found: 0`

**Solution**:
```sql
-- Manual update desa_id (jika diperlukan)
UPDATE produk_hukums
SET desa_id = 1  -- Ganti dengan ID desa yang benar
WHERE id = 'uuid-produk-hukum-anda';
```

### Problem 2: User tidak punya `desa_id`

**Symptoms**:
- API response: "Akses tidak diizinkan"
- Log: `desa_id: null`

**Solution**:
```sql
-- Update user dengan desa_id yang benar
UPDATE users
SET desa_id = 1  -- Ganti dengan ID desa yang benar
WHERE id = 5;  -- ID user yang login
```

### Problem 3: Jenis Produk Hukum salah

**Symptoms**:
- Data ada di database tapi tidak muncul di dropdown
- `perdes_count: 0` padahal ada Perdes

**Check**:
```sql
-- Cek jenis yang tersimpan
SELECT DISTINCT jenis FROM produk_hukums;
```

**Valid Values**:
- `Peraturan Desa` (untuk PERDES)
- `Keputusan Kepala Desa` (untuk SK)
- `Peraturan Kepala Desa` (untuk PERKADES)

**Solution**: Jika jenis salah, update:
```sql
UPDATE produk_hukums
SET jenis = 'Peraturan Desa'
WHERE id = 'uuid-produk-hukum';
```

### Problem 4: Frontend tidak refresh data

**Symptoms**:
- Backend log menunjukkan data ditemukan
- Dropdown masih kosong

**Solution**:
1. **Hard refresh**: Ctrl + Shift + R (Windows) atau Cmd + Shift + R (Mac)
2. **Clear cache**: 
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
3. **Logout dan login kembali**

### Problem 5: Token expired atau invalid

**Symptoms**:
- API response: 401 Unauthorized
- Console error: "Unauthenticated"

**Solution**:
1. Logout dari aplikasi
2. Login kembali
3. Test API lagi

## Checklist Debugging

Gunakan checklist ini untuk systematic debugging:

- [ ] **Step 1**: Cek data Produk Hukum di database (SQL query)
  - [ ] Data ada di tabel `produk_hukums`
  - [ ] `desa_id` terisi dengan benar
  - [ ] `jenis` = 'Peraturan Desa' atau 'Keputusan Kepala Desa'

- [ ] **Step 2**: Cek user dan desa_id
  - [ ] User punya `role` = 'desa'
  - [ ] User punya `desa_id` yang valid

- [ ] **Step 3**: Test API di browser console
  - [ ] Token valid
  - [ ] Response success: true
  - [ ] `summary.total` > 0
  - [ ] `data.perdes` atau `data.sk` ada isinya

- [ ] **Step 4**: Cek backend log
  - [ ] Log "Fetching Produk Hukum" muncul
  - [ ] `total_found` > 0
  - [ ] Items array ada isinya

- [ ] **Step 5**: Cek Network tab
  - [ ] Request ke `/bumdes/produk-hukum` berhasil (200 OK)
  - [ ] Response contains data

- [ ] **Step 6**: Cek frontend console
  - [ ] Console log "Fetching produk hukum options..." muncul
  - [ ] Console log "Setting produk hukum options" muncul
  - [ ] Tidak ada error di console

## Quick Fix - Data Sudah Ada Tapi Tidak Muncul

Jika yakin data sudah benar di database, coba:

1. **Clear Browser Cache**:
   ```javascript
   // Jalankan di console
   localStorage.clear();
   sessionStorage.clear();
   location.reload(true);
   ```

2. **Force Re-fetch**:
   Buka file `BumdesDesaPage.jsx`, tambah dependency di useEffect:
   ```javascript
   useEffect(() => {
     if (user) {
       fetchData();
       fetchProdukHukumOptions();
     }
   }, [user]); // Akan re-fetch setiap kali user berubah
   ```

3. **Manual Test**:
   Buka halaman lain, lalu kembali ke halaman BUMDES

## Contact & Support

Jika masalah masih terjadi setelah semua langkah debugging:

1. Screenshot hasil query SQL
2. Screenshot backend log
3. Screenshot Network tab response
4. Screenshot console error (jika ada)
5. Kirim ke developer untuk analisa lebih lanjut

## Changelog

- **27 Oktober 2025**: Initial troubleshooting guide created
- Backend log enhanced dengan debug info
- API response ditambah field `debug` untuk troubleshooting
