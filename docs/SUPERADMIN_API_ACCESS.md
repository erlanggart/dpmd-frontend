# Superadmin API Access Implementation

## Overview

Menambahkan hak akses superadmin ke semua endpoint API desa agar admin PMD bisa mengakses data kelembagaan dari semua desa tanpa restriction.

## Problem

Endpoint seperti `/api/desa/rw/{id}` memberikan 403 Forbidden karena:

1. Middleware hanya memberi akses ke role `desa`
2. Controller menggunakan `$user->desa_id` filter yang tidak ada untuk superadmin

## Solution Applied

### 1. ✅ Route Middleware Update

```php
// Before
Route::middleware(['auth:sanctum', 'role:desa'])->prefix('desa')->group(function () {

// After
Route::middleware(['auth:sanctum', 'role:desa|superadmin'])->prefix('desa')->group(function () {
```

### 2. ✅ Controller Pattern Updates

#### **Superadmin Access Pattern:**

```php
// Index methods - support desa_id parameter
$desaId = $user->role === 'superadmin' && $request->has('desa_id')
    ? $request->get('desa_id')
    : $user->desa_id;

// Show/Update/Destroy methods - remove desa_id restriction
if ($user->role === 'superadmin') {
    $item = Model::findOrFail($id);
} else {
    $item = Model::where('desa_id', $user->desa_id)->where('id', $id)->firstOrFail();
}
```

## Controllers Updated

### ✅ **RwController** - COMPLETED

-   **File**: `app/Http/Controllers/Api/Desa/RwController.php`
-   **Methods Updated**: `index`, `show`, `update`, `destroy`
-   **Features**:
    -   Index: Support `?desa_id` parameter for superadmin
    -   Show: Include desa relation for superadmin
    -   Update/Destroy: Remove desa_id restrictions

### ✅ **RtController** - COMPLETED

-   **File**: `app/Http/Controllers/Api/Desa/RtController.php`
-   **Methods Updated**: `index`, `show`, `update`, `destroy`
-   **Features**:
    -   Index: Support `?desa_id` parameter for superadmin
    -   Show: Include desa relation for superadmin
    -   Update/Destroy: Handle RW validation for superadmin

### ✅ **PosyanduController** - COMPLETED

-   **File**: `app/Http/Controllers/Api/Desa/PosyanduController.php`
-   **Methods Updated**: `index`, `show`, `update`, `destroy`
-   **Features**:
    -   Index: Support `?desa_id` parameter for superadmin
    -   Show: Include desa relation for superadmin
    -   Update/Destroy: Remove desa_id restrictions

## Controllers Need Similar Updates

### 🔄 **Remaining Controllers:**

-   `KarangTarunaController.php`
-   `LpmController.php`
-   `SatlinmasController.php`
-   `PkkController.php`
-   `PengurusController.php`
-   `AparaturDesaController.php`

### **Update Pattern for Remaining Controllers:**

#### **1. Index Method:**

```php
public function index(Request $request)
{
    $user = $request->user();

    // Handle superadmin access
    $desaId = $user->role === 'superadmin' && $request->has('desa_id')
        ? $request->get('desa_id')
        : $user->desa_id;

    if (!$desaId) {
        return response()->json(['success' => false, 'message' => 'Desa ID required'], 400);
    }

    $items = Model::where('desa_id', $desaId)->get();
    // ... rest of logic
}
```

#### **2. Show/Update/Destroy Methods:**

```php
public function show(Request $request, $id)
{
    $user = $request->user();

    if ($user->role === 'superadmin') {
        $item = Model::with(['desa'])->findOrFail($id);
    } else {
        $item = Model::where('desa_id', $user->desa_id)->where('id', $id)->firstOrFail();
    }

    return response()->json(['success' => true, 'data' => $item]);
}
```

## Frontend API Usage

### **For Admin Access:**

```javascript
// Get RW list for specific desa
const response = await api.get("/desa/rw", {
    params: { desa_id: desaId },
});

// Get specific RW detail (works with superadmin token)
const response = await api.get(`/desa/rw/${rwId}`);
```

### **For Desa User (unchanged):**

```javascript
// Works normally without desa_id parameter
const response = await api.get("/desa/rw");
```

## Testing

### **Endpoints to Test:**

```bash
# RW endpoints
GET /api/desa/rw?desa_id={desa_id}           # List with desa filter
GET /api/desa/rw/{rw_id}                     # Show specific RW

# RT endpoints
GET /api/desa/rt?desa_id={desa_id}           # List with desa filter
GET /api/desa/rt/{rt_id}                     # Show specific RT

# Posyandu endpoints
GET /api/desa/posyandu?desa_id={desa_id}     # List with desa filter
GET /api/desa/posyandu/{posyandu_id}         # Show specific Posyandu
```

### **Test with Superadmin Token:**

1. Login as superadmin
2. Use token in Authorization header
3. Test endpoints with various desa_id values
4. Verify no 403 Forbidden errors

## Benefits

### **1. Unified API Access:**

-   ✅ Superadmin can access all desa data
-   ✅ Desa users still restricted to their own data
-   ✅ Same endpoints for both user types

### **2. Frontend Compatibility:**

-   ✅ No need for separate admin endpoints
-   ✅ Existing desa components work with admin context
-   ✅ Clean parameter passing via query strings

### **3. Security:**

-   ✅ Role-based access control maintained
-   ✅ Proper validation for desa_id requirements
-   ✅ No unauthorized cross-desa access for desa users

## Next Steps

1. **Apply same pattern** to remaining controllers
2. **Test all endpoints** with superadmin access
3. **Update frontend API calls** to pass desa_id when needed
4. **Document API changes** for frontend developers

## Quick Fix Commands

To complete the implementation, apply the same superadmin access pattern to:

-   KarangTarunaController, LpmController, SatlinmasController, PkkController
-   Each needs index method to support `?desa_id` parameter
-   Each needs show/update/destroy to remove desa_id restriction for superadmin
