# Integrasi Produk Hukum dengan BUMDES

## Deskripsi
Fitur ini mengintegrasikan data Produk Hukum Desa (Peraturan Desa dan SK Kades) dengan form BUMDES, sehingga user tidak perlu upload file Perdes dan SK BUMDes secara terpisah. User cukup memilih dari dropdown dokumen yang sudah diupload melalui menu Produk Hukum.

## Tanggal Implementasi
27 Oktober 2025

## Masalah yang Diperbaiki
**Issue**: User sudah mengupload Peraturan Desa (PERDES) melalui menu Produk Hukum, tetapi tidak muncul di dropdown PERDES pada form BUMDES.

**Root Cause**: 
1. Backend endpoint `/desa/bumdes/produk-hukum` memfilter dokumen hanya yang mengandung kata kunci "bumdes" di judul atau subjek
2. User upload Perdes dengan judul yang tidak mengandung kata kunci tersebut
3. Rendering dropdown di frontend tidak handle empty state dengan baik

## Solusi yang Diterapkan

### 1. Backend (`BumdesController.php`)

#### Method: `getProdukHukumForBumdes()`
**Perubahan**: Menghapus filter kata kunci "bumdes", menampilkan SEMUA Perdes dan SK Kades milik desa yang login.

```php
// SEBELUM: Filter dengan kata kunci
$produkHukum = ProdukHukum::where('desa_id', $user->desa_id)
    ->where(function($query) {
        $query->where('jenis', 'Peraturan Desa')
              ->where(function($subQuery) {
                  $subQuery->where('judul', 'like', '%bumdes%')
                           ->orWhere('judul', 'like', '%badan usaha milik desa%');
              });
    })
    // ...

// SESUDAH: Tampilkan semua Perdes dan SK Kades
$produkHukum = ProdukHukum::where('desa_id', $user->desa_id)
    ->whereIn('jenis', ['Peraturan Desa', 'Keputusan Kepala Desa'])
    ->select('id', 'judul', 'nomor', 'tahun', 'jenis', 'singkatan_jenis', 'tanggal_penetapan', 'file')
    ->orderBy('tanggal_penetapan', 'desc')
    ->get();
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "perdes": [
      {
        "id": "uuid",
        "judul": "Peraturan Desa tentang BUMDES",
        "nomor": "1/PERDES/2024",
        "tahun": "2024",
        "jenis": "Peraturan Desa",
        "singkatan_jenis": "PERDES",
        "tanggal_penetapan": "2024-01-15",
        "file": "path/to/file.pdf"
      }
    ],
    "sk_bumdes": [...],
    "sk": [...],
    "all": [...]
  },
  "message": "Data produk hukum berhasil diambil",
  "summary": {
    "total": 5,
    "perdes_count": 2,
    "sk_count": 3
  }
}
```

#### Validasi
Kedua method `storeDesaBumdes()` dan `updateDesaBumdes()` sudah memiliki validasi:
```php
'produk_hukum_perdes_id' => 'nullable|uuid|exists:produk_hukums,id',
'produk_hukum_sk_bumdes_id' => 'nullable|uuid|exists:produk_hukums,id',
```

### 2. Frontend (`BumdesDesaPage.jsx`)

#### State Management
```javascript
const [produkHukumOptions, setProdukHukumOptions] = useState({
  perdes: [],
  sk: []
});
```

#### Fetch Data dengan Error Handling
```javascript
const fetchProdukHukumOptions = async () => {
  try {
    console.log('Fetching produk hukum options for BUMDES...');
    const result = await BumdesDesaService.getProdukHukumForBumdes();
    
    if (result.success && result.data) {
      setProdukHukumOptions({
        perdes: result.data.perdes || [],
        sk: result.data.sk || result.data.sk_bumdes || []
      });
    } else {
      setProdukHukumOptions({ perdes: [], sk: [] });
    }
  } catch (error) {
    console.error("Error fetching produk hukum options:", error);
    
    Swal.fire({
      icon: 'warning',
      title: 'Perhatian',
      text: 'Gagal memuat data Produk Hukum. Pastikan Anda sudah mengupload Perdes dan SK di menu Produk Hukum.',
      confirmButtonColor: '#3b82f6',
    });
    
    setProdukHukumOptions({ perdes: [], sk: [] });
  }
};
```

#### Improved `renderSelect()` Function
```javascript
const renderSelect = (label, field, options, placeholder = "Pilih opsi", showInfo = false) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
      {showInfo && (
        <span className="text-xs text-blue-600 ml-2">(Terintegrasi dengan Produk Hukum)</span>
      )}
    </label>
    <select
      value={formData[field] || ""}
      onChange={(e) => handleInputChange(field, e.target.value)}
      disabled={!isEditing}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
        !isEditing ? "bg-gray-50 cursor-not-allowed" : ""
      }`}
    >
      <option value="">{placeholder}</option>
      {Array.isArray(options) && options.length > 0 ? (
        options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.nomor} - {option.judul} ({option.tahun})
          </option>
        ))
      ) : (
        <option disabled>Tidak ada data tersedia</option>
      )}
    </select>
    {/* Selected item preview */}
    {formData[field] && options.length > 0 && (
      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
        {/* ... preview details ... */}
      </div>
    )}
  </div>
);
```

#### Empty State Warning
```jsx
{(!produkHukumOptions.perdes || produkHukumOptions.perdes.length === 0) && 
 (!produkHukumOptions.sk || produkHukumOptions.sk.length === 0) && (
  <div className="col-span-1 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <FiAlertCircle className="text-yellow-600 mt-1" />
      <div className="flex-1">
        <h4 className="text-sm font-medium text-yellow-800 mb-1">
          Belum Ada Produk Hukum
        </h4>
        <p className="text-xs text-yellow-700">
          Anda belum mengupload Peraturan Desa (PERDES) atau SK BUMDES. 
          Silakan upload terlebih dahulu melalui menu <strong>Produk Hukum</strong>.
        </p>
      </div>
    </div>
  </div>
)}
```

### 3. Service Layer (`bumdesDesaService.js`)

Method sudah tersedia:
```javascript
// Get produk hukum options for BUMDES
getProdukHukumForBumdes: async () => {
  try {
    const response = await api.get('/desa/bumdes/produk-hukum');
    return response.data;
  } catch (error) {
    console.error('Error fetching produk hukum options:', error);
    throw error;
  }
}
```

## Database Schema

### Tabel `bumdes`
Sudah memiliki foreign key columns (migration: `2025_10_24_054705_add_produk_hukum_foreign_keys_to_bumdes_table.php`):

```php
$table->foreignUuid('produk_hukum_perdes_id')
      ->nullable()
      ->constrained('produk_hukums')
      ->nullOnDelete()
      ->comment('Foreign key ke tabel produk_hukums untuk PERDES tentang BUMDES');

$table->foreignUuid('produk_hukum_sk_bumdes_id')
      ->nullable()
      ->constrained('produk_hukums')
      ->nullOnDelete()
      ->comment('Foreign key ke tabel produk_hukums untuk SK BUMDES');
```

### Model `Bumdes`
Sudah memiliki relationship methods:
```php
public function produkHukumPerdes()
{
    return $this->belongsTo(\App\Models\ProdukHukum::class, 'produk_hukum_perdes_id');
}

public function produkHukumSkBumdes()
{
    return $this->belongsTo(\App\Models\ProdukHukum::class, 'produk_hukum_sk_bumdes_id');
}
```

### Method `getDesaBumdes()`
Sudah eager load relationships:
```php
$bumdes = Bumdes::with(['produkHukumPerdes', 'produkHukumSkBumdes'])
                ->where('desa_id', $user->desa_id)
                ->first();
```

## Workflow Penggunaan

### 1. Upload Produk Hukum (Prerequisite)
User harus terlebih dahulu mengupload dokumen melalui menu **Produk Hukum**:
- Navigate ke: Dashboard Desa → Produk Hukum
- Upload Peraturan Desa (PERDES) tentang BUMDES
- Upload SK Kades tentang BUMDES atau pembentukan BUMDES

### 2. Input Data BUMDES
1. Navigate ke: Dashboard Desa → BUMDES
2. Klik "Tambah Data" atau "Edit"
3. Di section "Dasar Hukum Pendirian":
   - Dropdown "Peraturan Desa (PERDES) BUMDES" akan menampilkan semua PERDES yang sudah diupload
   - Dropdown "Surat Keputusan (SK) BUMDES" akan menampilkan semua SK Kades yang sudah diupload
4. Pilih dokumen yang sesuai
5. (Optional) Jika dokumen belum diupload, bisa expand "Input Manual" untuk isi nomor dan tanggal secara manual

### 3. Data yang Tersimpan
Ketika submit form BUMDES:
- Field `produk_hukum_perdes_id` menyimpan UUID dari Produk Hukum yang dipilih
- Field `produk_hukum_sk_bumdes_id` menyimpan UUID dari SK yang dipilih
- Relationship `produkHukumPerdes` dan `produkHukumSkBumdes` otomatis ter-load saat fetch data

## Debugging

### Console Logs
Frontend sudah dilengkapi console logs untuk debugging:
```javascript
console.log('Fetching produk hukum options for BUMDES...');
console.log('Produk Hukum API Response:', result);
console.log('Setting produk hukum options:', {
  perdes: result.data.perdes?.length || 0,
  sk: result.data.sk?.length || 0,
  sk_bumdes: result.data.sk_bumdes?.length || 0
});
```

### Backend Logs
Backend menggunakan `Log::error()` untuk error handling:
```php
Log::error('Error getting produk hukum for BUMDES: ' . $e->getMessage());
```

### Common Issues

#### 1. Dropdown Kosong
**Symptoms**: Dropdown PERDES dan SK tidak menampilkan opsi apapun

**Possible Causes**:
- User belum upload Produk Hukum di menu Produk Hukum
- API endpoint error (check browser console)
- Network error

**Solutions**:
- Buka menu Produk Hukum dan upload dokumen terlebih dahulu
- Check browser console untuk error messages
- Check backend logs di `storage/logs/laravel.log`

#### 2. Produk Hukum tidak tersimpan
**Symptoms**: Setelah pilih dokumen dan save, ID tidak tersimpan di database

**Possible Causes**:
- Validation error
- Field tidak di-include dalam request payload

**Solutions**:
- Check browser network tab untuk melihat request payload
- Pastikan field `produk_hukum_perdes_id` dan `produk_hukum_sk_bumdes_id` ada dalam FormData
- Check backend validation errors

## Testing Checklist

- [ ] **Test 1**: Upload Perdes di menu Produk Hukum
- [ ] **Test 2**: Upload SK Kades di menu Produk Hukum
- [ ] **Test 3**: Buka form BUMDES, verifikasi dropdown PERDES menampilkan dokumen yang diupload
- [ ] **Test 4**: Buka form BUMDES, verifikasi dropdown SK menampilkan dokumen yang diupload
- [ ] **Test 5**: Pilih PERDES dari dropdown, klik Save, verifikasi data tersimpan di database
- [ ] **Test 6**: Pilih SK dari dropdown, klik Save, verifikasi data tersimpan di database
- [ ] **Test 7**: Edit data BUMDES yang sudah ada, verifikasi dropdown menampilkan selected value
- [ ] **Test 8**: Test dengan desa yang belum upload Produk Hukum, verifikasi warning message muncul
- [ ] **Test 9**: Test error handling jika API gagal, verifikasi Swal notification muncul
- [ ] **Test 10**: Verifikasi relationship data di endpoint GET `/desa/bumdes`

## Files Changed

### Backend
1. `app/Http/Controllers/Api/BumdesController.php`
   - Method: `getProdukHukumForBumdes()` - Line 1979-2033
   - Removed keyword filter, show all Perdes and SK Kades

### Frontend
1. `src/pages/desa/bumdes/BumdesDesaPage.jsx`
   - Method: `fetchProdukHukumOptions()` - Line 163-193
   - Method: `renderSelect()` - Line 338-380
   - UI: Empty state warning - Line 541-560
   - Added console logs for debugging
   - Improved error handling with Swal notification

### Service
1. `src/services/bumdesDesaService.js`
   - Method: `getProdukHukumForBumdes()` - Already implemented

## Migration Status
✅ Migration already exists: `2025_10_24_054705_add_produk_hukum_foreign_keys_to_bumdes_table.php`

## Deployment Notes

### Backend
- No migration required (already exists)
- No composer package installation required
- Clear cache if needed: `php artisan cache:clear`

### Frontend
- No npm package installation required
- Build for production: `npm run build`

## Related Documentation
- [API_ROUTING_SOLUTION.md](./API_ROUTING_SOLUTION.md) - API endpoint structure
- [BUMDES_OPTIMIZATION_README.md](./BUMDES_OPTIMIZATION_README.md) - BUMDES feature optimization

## Support
If you encounter issues with this integration:
1. Check browser console for error messages
2. Check backend logs at `storage/logs/laravel.log`
3. Verify Produk Hukum data exists for the desa
4. Test API endpoint directly: `GET /api/desa/bumdes/produk-hukum`
