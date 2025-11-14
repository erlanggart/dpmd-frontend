# Route Grouping Pattern - Role-Based Access Control

## Overview
Dokumentasi pattern untuk mengelompokkan routes dengan role protection yang sama, menghindari duplikasi kode role checking di setiap route.

## ❌ Anti-Pattern (Before)

### Masalah: Duplikasi Role Protection
```jsx
// BAD: Mendefinisikan RoleProtectedRoute di setiap route
<Route
  path="/dashboard"
  element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
>
  <Route 
    path="laporan-desa" 
    element={
      <RoleProtectedRoute allowedRoles={["superadmin", "pmd"]}>
        <LaporanDesa />
      </RoleProtectedRoute>
    } 
  />
  
  <Route 
    path="kelembagaan" 
    element={
      <RoleProtectedRoute allowedRoles={["superadmin", "pmd"]}>
        <Kelembagaan />
      </RoleProtectedRoute>
    } 
  />
  
  <Route 
    path="kelembagaan/admin/:desaId" 
    element={
      <RoleProtectedRoute allowedRoles={["superadmin", "pmd"]}>
        <AdminKelembagaanDetailPage />
      </RoleProtectedRoute>
    } 
  />
</Route>
```

**Masalah:**
- 🔴 Duplikasi `allowedRoles` di setiap route
- 🔴 Sulit maintenance jika role berubah
- 🔴 Banyak boilerplate code
- 🔴 Mudah typo atau lupa update salah satu route
- 🔴 Tidak scalable untuk banyak routes

## ✅ Best Pattern (After)

### Solusi: Route Grouping dengan Outlet

```jsx
// GOOD: Group routes dengan role protection sekali
<Route
  path="/dashboard"
  element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
>
  {/* Public routes - no additional protection */}
  <Route index element={<DashboardPage />} />
  <Route path="hero-gallery" element={<HeroGalleryManagement />} />
  
  {/* Admin routes - Protected as a group */}
  <Route element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES} />}>
    <Route path="laporan-desa" element={<LaporanDesa />} />
    <Route path="kelembagaan" element={<Kelembagaan />} />
    <Route path="kelembagaan/admin/:desaId" element={<AdminKelembagaanDetailPage />} />
  </Route>
</Route>
```

**Keuntungan:**
- ✅ Define role protection **sekali** untuk semua child routes
- ✅ Easy to maintain - update di satu tempat
- ✅ Clean dan readable
- ✅ Scalable - mudah tambah routes baru
- ✅ Konsisten untuk semua routes dalam group

## Implementation Details

### 1. Update RoleProtectedRoute Component

Tambahkan support untuk `<Outlet />`:

```jsx
import { Outlet } from "react-router-dom";

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("expressToken");
  const { user } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user role is allowed
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Support both direct children and nested routes via Outlet
  return children || <Outlet />;
};
```

**Key Point:** `children || <Outlet />` memungkinkan component bekerja untuk:
- Direct children: `<RoleProtectedRoute><Component /></RoleProtectedRoute>`
- Nested routes: `<Route element={<RoleProtectedRoute />}><Route .../></Route>`

### 2. Define Role Constants

```jsx
// Role constants for better maintainability
const ROLES = {
  SUPERADMIN: "superadmin",
  PMD: "pemberdayaan_masyarakat",
  PMD_ALT: "pmd",
  DESA: "desa",
  KECAMATAN: "kecamatan",
};

// Role groups
const ADMIN_ROLES = [ROLES.SUPERADMIN, ROLES.PMD, ROLES.PMD_ALT];
const INTERNAL_ROLES = [...ADMIN_ROLES, ROLES.KECAMATAN];
const ALL_ROLES = Object.values(ROLES);
```

**Benefits:**
- Centralized role definitions
- Avoid typos
- Easy to refactor
- Self-documenting code

### 3. Route Structure Pattern

```jsx
<Route
  path="/dashboard"
  element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
>
  {/* Level 1: Public authenticated routes */}
  <Route index element={<DashboardPage />} />
  <Route path="public-feature" element={<PublicFeature />} />
  
  {/* Level 2: Admin-only routes (grouped) */}
  <Route element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES} />}>
    <Route path="admin-feature-1" element={<AdminFeature1 />} />
    <Route path="admin-feature-2" element={<AdminFeature2 />} />
    
    {/* Nested admin routes */}
    <Route path="admin-feature-2/:id" element={<AdminFeature2Detail />} />
  </Route>
  
  {/* Level 3: Superadmin-only routes (grouped) */}
  <Route element={<RoleProtectedRoute allowedRoles={[ROLES.SUPERADMIN]} />}>
    <Route path="superadmin-settings" element={<SuperadminSettings />} />
    <Route path="system-config" element={<SystemConfig />} />
  </Route>
</Route>
```

## Complete Example

### App.jsx
```jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Outlet,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Role definitions
const ROLES = {
  SUPERADMIN: "superadmin",
  PMD: "pemberdayaan_masyarakat",
  PMD_ALT: "pmd",
  DESA: "desa",
};

const ADMIN_ROLES = [ROLES.SUPERADMIN, ROLES.PMD, ROLES.PMD_ALT];

// Protection components
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("expressToken");
  const location = useLocation();
  
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("expressToken");
  const { user } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboard routes */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
        >
          {/* Public routes */}
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<Profile />} />
          
          {/* Admin PMD routes - Protected group */}
          <Route element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES} />}>
            <Route path="laporan-desa" element={<LaporanDesa />} />
            <Route path="kelembagaan" element={<Kelembagaan />} />
            <Route path="kelembagaan/admin/:desaId" element={<AdminKelembagaanDetailPage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}
```

## Pattern Variations

### Multiple Role Groups

```jsx
<Route path="/dashboard" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
  {/* Public routes */}
  <Route index element={<DashboardPage />} />
  
  {/* Admin routes */}
  <Route element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES} />}>
    <Route path="admin/*" element={<AdminSection />} />
  </Route>
  
  {/* Moderator routes */}
  <Route element={<RoleProtectedRoute allowedRoles={MODERATOR_ROLES} />}>
    <Route path="moderate/*" element={<ModeratorSection />} />
  </Route>
  
  {/* Superadmin routes */}
  <Route element={<RoleProtectedRoute allowedRoles={[ROLES.SUPERADMIN]} />}>
    <Route path="system/*" element={<SystemSection />} />
  </Route>
</Route>
```

### Nested Protection

```jsx
{/* All authenticated users */}
<Route path="/dashboard" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
  
  {/* Admin users only */}
  <Route element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES} />}>
    
    {/* Superadmin only within admin section */}
    <Route element={<RoleProtectedRoute allowedRoles={[ROLES.SUPERADMIN]} />}>
      <Route path="critical-settings" element={<CriticalSettings />} />
    </Route>
    
  </Route>
</Route>
```

## Migration Guide

### Step 1: Update RoleProtectedRoute
Add `Outlet` support:
```jsx
return children || <Outlet />;
```

### Step 2: Define Role Constants
```jsx
const ADMIN_ROLES = ["superadmin", "pemberdayaan_masyarakat", "pmd"];
```

### Step 3: Identify Route Groups
Group routes yang punya role sama:
```
❌ Before:
- laporan-desa → ["superadmin", "pmd"]
- kelembagaan → ["superadmin", "pmd"]  
- kelembagaan/admin/:id → ["superadmin", "pmd"]

✅ After:
- Group "Admin PMD" → ["superadmin", "pmd"]
  - laporan-desa
  - kelembagaan
  - kelembagaan/admin/:id
```

### Step 4: Refactor Routes
```jsx
// Old
<Route path="route1" element={<RoleProtectedRoute allowedRoles={X}><Component1 /></RoleProtectedRoute>} />
<Route path="route2" element={<RoleProtectedRoute allowedRoles={X}><Component2 /></RoleProtectedRoute>} />

// New
<Route element={<RoleProtectedRoute allowedRoles={X} />}>
  <Route path="route1" element={<Component1 />} />
  <Route path="route2" element={<Component2 />} />
</Route>
```

## Benefits Summary

| Aspect | Before (Individual) | After (Grouped) |
|--------|-------------------|-----------------|
| **Lines of code** | ~15 per route | ~5 per route |
| **Maintenance** | Update N files | Update 1 place |
| **Readability** | Cluttered | Clean & clear |
| **Scalability** | Hard to add routes | Easy to add routes |
| **Error-prone** | High (typos, forgot to update) | Low (single source) |
| **Testing** | Test each route | Test group once |

## Best Practices

### ✅ DO

1. **Use role constants**
   ```jsx
   const ADMIN_ROLES = [ROLES.SUPERADMIN, ROLES.PMD];
   ```

2. **Group by permission level**
   ```jsx
   <Route element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES} />}>
     {/* All admin routes here */}
   </Route>
   ```

3. **Clear comments**
   ```jsx
   {/* Admin PMD routes - requires superadmin or PMD role */}
   ```

4. **Consistent structure**
   ```jsx
   {/* Public */}
   {/* Admin */}
   {/* Superadmin */}
   ```

### ❌ DON'T

1. **Hardcode roles**
   ```jsx
   <RoleProtectedRoute allowedRoles={["superadmin", "pmd"]} /> // BAD
   ```

2. **Mix group and individual protection**
   ```jsx
   <Route element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES} />}>
     <Route path="a" element={<A />} />
     <Route path="b" element={<RoleProtectedRoute ...><B /></RoleProtectedRoute>} /> // BAD
   </Route>
   ```

3. **Deeply nested groups without reason**
   ```jsx
   <Route element={<RoleProtectedRoute ...}>
     <Route element={<RoleProtectedRoute ...}>
       <Route element={<RoleProtectedRoute ...}> // BAD - too deep
   ```

## Testing

```jsx
describe('Route Protection', () => {
  it('should protect admin routes group', () => {
    const user = { role: 'desa' };
    // Try to access /dashboard/kelembagaan
    // Expect: redirect to /dashboard
  });
  
  it('should allow admin to access all routes in group', () => {
    const user = { role: 'superadmin' };
    // Access /dashboard/laporan-desa
    // Access /dashboard/kelembagaan
    // Access /dashboard/kelembagaan/admin/1
    // Expect: all accessible
  });
});
```

## Summary

**Before:**
```jsx
🔴 Repeated: <RoleProtectedRoute allowedRoles={[...]}>
🔴 Maintenance: Update N places
🔴 Code: Verbose and cluttered
```

**After:**
```jsx
✅ Once: <Route element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES} />}>
✅ Maintenance: Update 1 place
✅ Code: Clean and DRY
```

---

**Result:** Cleaner, more maintainable, and scalable routing structure! 🚀
