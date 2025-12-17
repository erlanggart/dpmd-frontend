# Constants Directory

## Jabatan Mapping

File `jabatanMapping.js` berisi semua konstanta dan helper functions untuk manajemen jabatan kelembagaan.

### Struktur

```javascript
import { 
  getJabatanOptions,     // Untuk dropdown/select
  getJabatanList,        // Untuk mendapatkan array jabatan
  getDisplayJabatan,     // Untuk format display
  getJabatanColor,       // Untuk styling gradient
  isValidJabatan,        // Untuk validasi
} from './jabatanMapping';
```

### Penggunaan

#### Mendapatkan Options untuk Select/Dropdown
```javascript
const options = getJabatanOptions('rw');
// Returns: [{ value: 'Ketua RW', label: 'Ketua RW' }, ...]
```

#### Mendapatkan List Jabatan
```javascript
const jabatanList = getJabatanList('rt');
// Returns: ['Ketua RT', 'Sekretaris RT', ...]
```

#### Mendapatkan Warna Gradient untuk Styling
```javascript
const gradient = getJabatanColor('Ketua RW');
// Returns: 'from-yellow-400 to-orange-500'
```

#### Validasi Jabatan
```javascript
const isValid = isValidJabatan('rw', 'Ketua RW');
// Returns: true
```

### Tipe Kelembagaan yang Didukung

- `rw` - Rukun Warga
- `rt` - Rukun Tetangga
- `posyandu` - Pos Pelayanan Terpadu
- `satlinmas` - Satuan Perlindungan Masyarakat
- `lpm` - Lembaga Pemberdayaan Masyarakat
- `karang-taruna` - Karang Taruna
- `pkk` - Pemberdayaan Kesejahteraan Keluarga

### Menambah Jabatan Baru

Edit file `jabatanMapping.js` dan tambahkan jabatan di `JABATAN_MAPPING`:

```javascript
export const JABATAN_MAPPING = {
  rw: [
    "Ketua RW",
    "Sekretaris RW",
    // ... tambahkan jabatan baru di sini
  ],
  // ...
};
```

### Komponen yang Menggunakan

1. **PengurusForm.jsx** - Untuk dropdown pemilihan jabatan
2. **PengurusJabatanList.jsx** - Untuk menampilkan struktur organisasi
3. Dan komponen lain yang memerlukan data jabatan

### Keuntungan Centralized Management

✅ **Single Source of Truth** - Satu tempat untuk semua definisi jabatan  
✅ **Konsistensi** - Semua komponen menggunakan data yang sama  
✅ **Mudah Maintenance** - Update sekali, berlaku di semua komponen  
✅ **Type Safety** - Helper functions untuk validasi  
✅ **Reusability** - Dapat digunakan di komponen manapun  

### Best Practices

1. Selalu gunakan `getJabatanOptions()` untuk form select/dropdown
2. Gunakan `getJabatanList()` untuk iterasi atau mapping
3. Gunakan `isValidJabatan()` untuk validasi sebelum submit
4. Jangan hardcode jabatan di komponen, selalu import dari file ini
