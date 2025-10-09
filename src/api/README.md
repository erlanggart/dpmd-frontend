# Kelembagaan API Layer

File ini menyediakan abstraksi untuk semua API calls terkait kelembagaan, mengikuti pola yang sama dengan `aparaturDesaApi.js`.

## Keuntungan Menggunakan API Layer

### 1. **Centralized API Management**

- Semua endpoint kelembagaan terpusat dalam satu file
- Mudah untuk tracking dan maintenance
- Consistency dalam penamaan dan struktur

### 2. **Better Error Handling**

- Error handling yang konsisten di seluruh aplikasi
- Centralized error processing
- Lebih mudah untuk debugging

### 3. **Code Reusability**

- Function dapat digunakan ulang di berbagai komponen
- Mengurangi duplikasi kode
- Single source of truth untuk API calls

### 4. **Type Safety & Documentation**

- JSDoc comments untuk setiap function
- Parameter validation yang lebih baik
- Easier untuk IDE autocomplete

### 5. **Environment Management**

- Base URL handling sudah tertangani oleh axios instance
- Authentication headers automatic
- Request/response interceptors

## Struktur API

### Admin/PMD Endpoints

- `getDesaDetail(desaId)` - Detail informasi desa
- `getDesaKelembagaanAll(desaId)` - Semua data kelembagaan untuk desa
- `getDesaRW(desaId)` - Data RW specific desa
- `getDesaPosyandu(desaId)` - Data Posyandu specific desa
- Dan seterusnya...

### Desa User Endpoints

- `getRWForDesa()` - RW data untuk user desa yang login
- `getPosyanduForDesa()` - Posyandu data untuk user desa yang login
- Dan seterusnya...

### General Endpoints

- `getKelembagaanSummary()` - Summary data kelembagaan
- `getKelembagaanByKecamatan(kecamatanId)` - Data per kecamatan

## Cara Penggunaan

### Before (Direct fetch)

```jsx
const response = await fetch(`/api/admin/desa/${desaId}/rw`, {
	headers: { Authorization: `Bearer ${token}` },
});
const data = await response.json();
```

### After (Using API layer)

```jsx
import { getDesaRW } from "../api/kelembagaanApi";

const response = await getDesaRW(desaId);
const data = response.data;
```

## Migration Guide

1. Import API functions dari kelembagaanApi.js
2. Replace manual fetch calls dengan API functions
3. Update error handling sesuai dengan axios response structure
4. Remove manual token handling (sudah automatic)

## Future Enhancements

- [ ] Add TypeScript interfaces
- [ ] Add request caching
- [ ] Add optimistic updates
- [ ] Add batch operations
- [ ] Add real-time updates dengan WebSocket
