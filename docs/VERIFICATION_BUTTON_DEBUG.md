# Verification Button Debug Guide

## Problem: Tombol verifikasi tidak muncul untuk superadmin/pemberdayaan_masyarakat

## Debug Steps Applied:

### 1. ✅ **Added Debug Logs**

- Console log untuk user object dan role checking
- Visual debug info untuk admin controls visibility
- Role consistency check between components

### 2. ✅ **Role Name Consistency**

Fixed role checking to match AdminKelembagaanDetailWrapper:

```jsx
// Before - inconsistent
const adminBidang = user?.role === "pemberdayaan_masyarakat";

// After - consistent with wrapper
const adminBidang = ["pemberdayaan_masyarakat", "pmd"].includes(user?.role);
```

### 3. ✅ **Added Visual Debug Indicators**

- Green indicator when verification control is visible
- Red indicator when verification control is hidden with reasons
- Debug info showing all role states

## How to Test:

### **1. Login as Superadmin or PMD**

- Use superadmin account or pemberdayaan_masyarakat account

### **2. Navigate to Kelembagaan Detail**

```
Path: Dashboard → Kelembagaan → [Select Desa] → [Click RW/Posyandu]
URL: /dashboard/kelembagaan/admin/{desaId}/{type}/{id}
```

### **3. Check Console and Visual Debug**

Open browser Developer Tools and look for:

**Console logs:**

```
ProfilCard Debug: {
  user: {...},
  userRole: "superadmin",
  adminDesa: false,
  isAdmin: true,
  adminBidang: false,
  showVerificationControl: true
}
```

**Visual indicators on page:**

- ✅ Green text: "✓ Verification control visible"
- ❌ Red box: "Verification control hidden - adminBidang: false, isAdmin: true"

### **4. Expected Results:**

**For superadmin:**

- `isAdmin: true`
- `adminBidang: false`
- `showVerificationControl: true` → Should show verification button

**For pemberdayaan_masyarakat:**

- `isAdmin: false`
- `adminBidang: true`
- `showVerificationControl: true` → Should show verification button

**For pmd:**

- `isAdmin: false`
- `adminBidang: true`
- `showVerificationControl: true` → Should show verification button

## Possible Issues to Check:

### **1. Role Name Mismatch**

Check if stored role in localStorage matches expected values:

- Open DevTools → Application → localStorage → look for "user"
- Check `role` field value

### **2. User Object Structure**

Verify user object has correct structure:

```json
{
	"id": 1,
	"name": "Admin",
	"role": "superadmin" // ← Check this value
	// ... other fields
}
```

### **3. AuthContext Issues**

- Check if `useAuth()` returns valid user object
- Verify token is present and valid

### **4. Component Hierarchy**

Since this is accessed via AdminKelembagaanDetailWrapper:

- Verify wrapper correctly passes user context
- Check if there's any context provider blocking

## Next Debug Steps:

If verification button still doesn't show:

1. **Check Network Tab**: API calls returning proper data
2. **Check Role Values**: Exact role strings in database vs frontend
3. **Check Conditional Logic**: All `&&` conditions in render
4. **Check CSS**: Button might be hidden by styles

## Clean Up:

After debugging, remove these debug elements:

- `console.log` in ProfilCard
- Yellow debug info box in admin controls
- Green/Red debug indicators for verification control
