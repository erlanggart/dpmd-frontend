# Pagination Feature - User Management

## Overview
Menambahkan pagination di halaman User Management untuk meningkatkan performa dan user experience saat menampilkan banyak user.

## Changes Made (Dec 28, 2025)

### 1. File: `src/pages/dashboard/UserManagementPage.jsx`

#### A. Import Icons
```javascript
// Tambah icons untuk pagination
import {
  // ... existing icons
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu";
```

#### B. State Management
```javascript
// Pagination state
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage] = useState(12); // 12 items per page (3x4 grid)
```

#### C. Pagination Logic
```javascript
// Calculate pagination
const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

// Reset to page 1 when filters change
useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, activeTab, filterBidang]);
```

#### D. UI Components

**Pagination Info:**
```jsx
<div className="mb-4 flex justify-between items-center text-sm text-gray-600">
  <div>
    Menampilkan <span>1</span> - <span>12</span> dari <span>98</span> user
  </div>
  <div>
    Halaman 1 dari 9
  </div>
</div>
```

**Pagination Controls:**
- Previous/Next buttons dengan icon
- Page numbers dengan ellipsis untuk banyak halaman
- Active page dengan style berbeda (indigo-600)
- Disabled state untuk first/last page

## Features

### 1. Smart Pagination
- Tampilkan 12 user per halaman (optimal untuk grid 3x4)
- Auto-reset ke page 1 saat filter/search berubah

### 2. Navigation
- **Previous/Next buttons**: Navigasi cepat antar halaman
- **Page numbers**: Jump langsung ke halaman tertentu
- **Ellipsis**: Hanya tampilkan page numbers yang relevan (first, last, current ±1)

### 3. Visual Feedback
- Active page dengan background indigo-600
- Hover effects pada semua buttons
- Disabled state untuk button yang tidak bisa diklik
- Smooth transitions

### 4. Info Display
- Tampilkan range user yang sedang ditampilkan
- Total user yang di-filter
- Current page / total pages

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ Menampilkan 1-12 dari 98 user    Halaman 1 dari 9      │
└─────────────────────────────────────────────────────────┘

┌──────┬──────┬──────┬──────┐
│ User │ User │ User │ User │  <- 3x4 Grid (12 items)
├──────┼──────┼──────┼──────┤
│ User │ User │ User │ User │
├──────┼──────┼──────┼──────┤
│ User │ User │ User │ User │
└──────┴──────┴──────┴──────┘

┌─────────────────────────────────────────────────────────┐
│    < [1] [2] ... [5] [6] [7] ... [8] [9] >             │
│    ↑  ↑   ↑     ↑   ↑   ↑     ↑   ↑  ↑                │
│   Prev First Ellipsis Active Current Last Next          │
└─────────────────────────────────────────────────────────┘
```

## Benefits

1. **Performance**: Hanya render 12 cards per page (lebih cepat)
2. **UX**: Lebih mudah browse dan cari user
3. **Responsive**: Pagination tetap terlihat bagus di mobile/desktop
4. **Accessible**: Clear visual feedback untuk navigation

## Configuration

Untuk mengubah jumlah items per page:
```javascript
const [itemsPerPage] = useState(12); // Change this number
```

Untuk mengubah grid layout, sesuaikan juga Tailwind classes:
```jsx
// 3 columns (12 items = 4 rows)
<div className="grid ... lg:grid-cols-3 ...">

// 4 columns (12 items = 3 rows)
<div className="grid ... lg:grid-cols-4 ...">
```

## Testing

### Test Cases:
1. ✅ Filter/search auto-reset ke page 1
2. ✅ Previous button disabled di page 1
3. ✅ Next button disabled di last page
4. ✅ Ellipsis muncul untuk banyak halaman (>5)
5. ✅ Page numbers clickable dan navigate dengan benar
6. ✅ Info display akurat (showing X-Y of Z)
7. ✅ Grid tetap rapi dengan pagination controls

### Browser Testing:
- Chrome ✅
- Firefox ✅
- Safari ✅
- Edge ✅
- Mobile (responsive) ✅

## Future Enhancements

1. **Items per page selector**: User bisa pilih 12/24/48 items
2. **Keyboard navigation**: Arrow keys untuk next/prev
3. **Deep linking**: URL with page parameter (?page=2)
4. **Animation**: Smooth fade in/out saat ganti page
5. **Loading skeleton**: Skeleton cards saat loading page baru
