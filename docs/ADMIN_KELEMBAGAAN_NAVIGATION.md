# Admin Kelembagaan Navigation - Implementation Guide

## Overview

Implementasi sistem navigasi untuk admin PMD agar bisa mengakses detail kelembagaan desa dengan menggunakan komponen yang sama seperti user desa, tetapi dengan konteks admin.

## Changes Made

### 1. File Renaming

- **`KelembagaanDetailPage.jsx`** → **`PMDKelembagaanDetailPage.jsx`**
  - Location: `src/pages/PMD/`
  - Reason: Menghindari konflik nama dengan `KelembagaanDetailPage.jsx` yang ada di `src/pages/desa/kelembagaan/`

### 2. New Components Created

#### `AdminKelembagaanDetailPage.jsx`

- **Location**: `src/pages/PMD/AdminKelembagaanDetailPage.jsx`
- **Purpose**: Menampilkan list kelembagaan desa (RW, Posyandu, etc.) untuk admin PMD
- **Features**:
  - Grid layout untuk menampilkan semua kelembagaan
  - Role-based access control (superadmin, pemberdayaan_masyarakat, pmd)
  - Integration dengan kelembagaanApi untuk data fetching
  - Navigation ke detail kelembagaan spesifik

#### `AdminKelembagaanDetailWrapper.jsx`

- **Location**: `src/pages/PMD/AdminKelembagaanDetailWrapper.jsx`
- **Purpose**: Wrapper untuk memungkinkan admin mengakses `KelembagaanDetailPage` desa
- **Features**:
  - Role validation untuk admin access
  - Seamless integration dengan komponen desa yang sudah ada

### 3. Routing Updates

#### New Routes Added in `App.jsx`:

```jsx
// Admin Kelembagaan Detail with navigation to specific kelembagaan
<Route
    path="kelembagaan/admin/:desaId"
    element={<AdminKelembagaanDetailPage />}
/>

// Admin access to specific kelembagaan detail (RW, RT, etc.)
<Route
    path="kelembagaan/admin/:desaId/:type/:id"
    element={<AdminKelembagaanDetailWrapper />}
/>
```

### 4. Navigation Flow Updates

#### PMD Kelembagaan (`Kelembagaan.jsx`):

```jsx
// Before
const handleDesaClick = (desaId) => {
	navigate(`/dashboard/kelembagaan/detail/${desaId}`);
};

// After
const handleDesaClick = (desaId) => {
	navigate(`/dashboard/kelembagaan/admin/${desaId}`);
};
```

## Navigation Flow

### Admin PMD Navigation:

1. **PMD Dashboard** → **Kelembagaan**

   - Route: `/dashboard/kelembagaan`
   - Component: `Kelembagaan.jsx`

2. **Pilih Desa** → **Admin Kelembagaan Detail**

   - Route: `/dashboard/kelembagaan/admin/:desaId`
   - Component: `AdminKelembagaanDetailPage.jsx`
   - Shows: List of all kelembagaan (RW, Posyandu, KT, LPM, etc.)

3. **Klik RW/Kelembagaan** → **Detail Kelembagaan**
   - Route: `/dashboard/kelembagaan/admin/:desaId/:type/:id`
   - Component: `AdminKelembagaanDetailWrapper.jsx` → `KelembagaanDetailPage.jsx`
   - Shows: Same interface as desa user but with admin access

### Desa User Navigation (Unchanged):

1. **Desa Dashboard** → **Kelembagaan**

   - Route: `/desa/kelembagaan`

2. **Pilih Kelembagaan Type** → **List Kelembagaan**

   - Route: `/desa/kelembagaan/:type`

3. **Klik Detail** → **Detail Kelembagaan**
   - Route: `/desa/kelembagaan/:type/:id`

## Benefits

### 1. **Code Reusability**

- Admin menggunakan komponen `KelembagaanDetailPage` yang sama dengan user desa
- Tidak ada duplikasi logic atau UI components
- Consistent user experience

### 2. **Role-based Access Control**

- Admin bisa mengakses semua desa
- User desa hanya bisa mengakses kelembagaan mereka sendiri
- Proper permission validation di setiap level

### 3. **Scalable Architecture**

- Easy to add new kelembagaan types
- Consistent routing patterns
- Maintainable code structure

### 4. **Better UX**

- Admin bisa navigasi langsung dari list desa ke RW/RT specific
- Seamless transition between admin overview dan detail management
- Breadcrumb navigation yang konsisten

## API Integration

### Using kelembagaanApi.js:

```jsx
import { getDesaKelembagaanAll } from "../../api/kelembagaanApi";

// Fetch all kelembagaan data for a desa
const response = await getDesaKelembagaanAll(desaId);
```

### Data Structure:

```jsx
{
    desa: { /* desa info */ },
    kelembagaan: {
        rw: [/* array of RW */],
        posyandu: [/* array of posyandu */],
        karangTaruna: { /* single object */ },
        lpm: { /* single object */ },
        satlinmas: { /* single object */ },
        pkk: { /* single object */ }
    }
}
```

## Testing

### Admin Access Test:

1. Login sebagai admin PMD
2. Navigate to `/dashboard/kelembagaan`
3. Click pada salah satu desa
4. Verify redirect to `/dashboard/kelembagaan/admin/:desaId`
5. Click pada RW atau kelembagaan lain
6. Verify access to detail page dengan admin privileges

### Desa User Test:

1. Login sebagai user desa
2. Navigate to `/desa/kelembagaan`
3. Verify normal flow tetap berfungsi
4. Ensure admin routes tidak accessible

## Future Enhancements

### 1. **Enhanced Permissions**

- Fine-grained permissions per kelembagaan type
- Audit trail untuk admin actions
- Bulk operations untuk multiple kelembagaan

### 2. **Advanced Features**

- Export/Import kelembagaan data
- Bulk status updates
- Advanced filtering dan searching

### 3. **UI Improvements**

- Enhanced admin-specific UI elements
- Better visual distinction antara admin dan user mode
- Advanced dashboard widgets

## Files Modified

### Core Files:

- `src/App.jsx` - Added new routes dan imports
- `src/pages/PMD/Kelembagaan.jsx` - Updated navigation logic
- `src/pages/PMD/KelembagaanDetailPage.jsx` → `PMDKelembagaanDetailPage.jsx`

### New Files:

- `src/pages/PMD/AdminKelembagaanDetailPage.jsx`
- `src/pages/PMD/AdminKelembagaanDetailWrapper.jsx`
- `src/api/kelembagaanApi.js` (already created)

This implementation provides a robust, scalable solution for admin access to desa kelembagaan while maintaining code reusability and proper separation of concerns.
