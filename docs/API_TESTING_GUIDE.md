# API Superadmin Access - Testing Guide

## 🎯 **Problem Fixed**

### **Error yang ditemukan:**

```
GET http://dpmd.test/api/desa/rt
Status: 400 Bad Request
Response: {"success":false,"message":"Desa ID required"}
```

### **Root Cause:**

1. **Frontend**: `KelembagaanDetailPage` (desa component) menggunakan `services/kelembagaan.js`
2. **Services**: Memanggil `/desa/rt` tanpa parameter `desa_id` untuk superadmin
3. **Backend**: Controller memerlukan `desa_id` parameter untuk superadmin

## ✅ **Solution Applied**

### **1. Frontend Services Update**

File: `src/services/kelembagaan.js`

**Before:**

```javascript
export const listRt = () => api.get("/desa/rt");
export const listRw = () => api.get("/desa/rw");
export const listPosyandu = () => api.get("/desa/posyandu");
```

**After:**

```javascript
// Auto-detect admin context and add desa_id parameter
export const listRt = () => {
	const adminUser = getAdminContext();
	if (adminUser) {
		const desaId = getDesaIdFromParams();
		return api.get("/desa/rt", { params: desaId ? { desa_id: desaId } : {} });
	}
	return api.get("/desa/rt");
};
```

### **2. Backend Controllers Update**

Updated controllers: `RwController`, `RtController`, `PosyanduController`, `KarangTarunaController`

**Pattern Applied:**

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
    return response()->json(['success' => true, 'data' => $items]);
}
```

## 🧪 **How to Test**

### **1. Login as Superadmin**

```
URL: http://localhost:5173/login
Credentials: superadmin account
```

### **2. Navigate to Admin Kelembagaan**

```
Flow: Dashboard → Kelembagaan → [Select Desa] → [Select RW/RT]
URL Pattern: /dashboard/kelembagaan/admin/{desaId}/{type}/{id}
```

### **3. Expected Behavior**

- ✅ **No more 400 errors** on kelembagaan detail pages
- ✅ **Auto desa_id parameter** sent from frontend
- ✅ **Admin can view/edit** all desa kelembagaan data
- ✅ **Desa users unchanged** - no impact on existing functionality

### **4. Test URLs**

```bash
# Admin Overview (uses admin endpoints - should work)
/dashboard/kelembagaan/admin/1

# Admin Detail (uses desa endpoints with auto desa_id - NOW FIXED)
/dashboard/kelembagaan/admin/1/rw/108ca687-0b64-4ff2-a431-da59005d1ee6

# Expected API Calls:
GET /api/desa/rw?desa_id=1        # Auto-added parameter
GET /api/desa/rt?desa_id=1        # Auto-added parameter
GET /api/desa/rw/108ca687...      # Works for superadmin
```

## 📊 **Technical Details**

### **Smart Context Detection:**

```javascript
// Auto-detect admin context from localStorage user data
const getAdminContext = () => {
	const userData = localStorage.getItem("user");
	const user = JSON.parse(userData);
	return ["superadmin", "pemberdayaan_masyarakat", "pmd"].includes(user.role);
};

// Auto-extract desa_id from URL params
const getDesaIdFromParams = () => {
	const path = window.location.pathname;
	const match = path.match(/\/kelembagaan\/admin\/([^\/]+)/);
	return match ? match[1] : null;
};
```

### **Backward Compatibility:**

- ✅ **Desa users**: No changes, works normally without desa_id parameter
- ✅ **Admin users**: Auto-detection, no manual parameter passing needed
- ✅ **Mixed usage**: Same services work for both contexts

## 🎉 **Status: READY FOR TESTING**

Both frontend and backend servers are running:

- **Frontend**: http://localhost:5173
- **Backend**: http://dpmd.test (via Laragon)

**Test the complete admin kelembagaan navigation flow now!**
