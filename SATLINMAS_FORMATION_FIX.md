# Satlinmas Formation Status Fix

## Perubahan yang telah dilakukan:

### ✅ **Backend Changes** - KelembagaanController.php

**Added `satlinmas_formed` status to API response:**

```php
// Add formation status for singleton kelembagaan
'karang_taruna_formed' => $karangTarunaCount > 0,
'lpm_formed' => $lpmCount > 0,
'satlinmas_formed' => $satlinmasCount > 0,  // ← NEW
'pkk_formed' => $pkkCount > 0,
```

**Updated API Response Documentation:**

```json
{
	"success": true,
	"data": {
		"rt": 5,
		"rw": 3,
		"posyandu": 2,
		"karang_taruna": 1,
		"lpm": 1,
		"satlinmas": 1,
		"pkk": 1,
		"karang_taruna_formed": true,
		"lpm_formed": true,
		"satlinmas_formed": true, // ← NEW
		"pkk_formed": true,
		"total": 14
	}
}
```

### ✅ **Frontend Changes** - KelembagaanDesaPage.jsx

**1. Added Import:**

```javascript
import { createSatlinmas } from "../../../services/kelembagaan";
```

**2. Updated State:**

```javascript
const [summary, setSummary] = useState({
	// ... existing fields
	satlinmas_formed: false, // ← NEW
	// ... rest of fields
});
```

**3. Added Formation Status Variable:**

```javascript
const satlinmasFormed = summary.satlinmas_formed;
```

**4. Updated handleOneClickForm:**

```javascript
if (type === "satlinmas") await createSatlinmas({});
```

**5. Updated Satlinmas Card:**

```jsx
<Card
	title="Satlinmas"
	subtitle={satlinmasFormed ? "Terbentuk" : "Belum terbentuk"} // ← NEW
	onClick={
		satlinmasFormed
			? () => navigate("/desa/kelembagaan/satlinmas/detail")
			: undefined
	}
	cta={!satlinmasFormed ? "Bentuk Kelembagaan" : undefined} // ← NEW
	onCta={
		!satlinmasFormed ? () => handleOneClickForm("satlinmas") : undefined // ← NEW
	}
/>
```

## Before vs After:

### ❌ **SEBELUM:**

```jsx
<Card
	title="Satlinmas"
	subtitle={`${summary.satlinmas} Satlinmas`} // Hanya menampilkan jumlah
	onClick={() => navigate("/desa/kelembagaan/satlinmas")}
/>
```

### ✅ **SETELAH:**

```jsx
<Card
	title="Satlinmas"
	subtitle={satlinmasFormed ? "Terbentuk" : "Belum terbentuk"} // Status pembentukan
	onClick={
		satlinmasFormed
			? () => navigate("/desa/kelembagaan/satlinmas/detail")
			: undefined
	}
	cta={!satlinmasFormed ? "Bentuk Kelembagaan" : undefined}
	onCta={!satlinmasFormed ? () => handleOneClickForm("satlinmas") : undefined}
/>
```

## Hasil:

🎯 **Konsistensi UI**: Sekarang Satlinmas memiliki behavior yang sama dengan Karang Taruna, LPM, dan PKK

📱 **User Experience**:

- Jika sudah terbentuk: Tampil "Terbentuk", bisa diklik untuk ke detail
- Jika belum terbentuk: Tampil "Belum terbentuk" + tombol "Bentuk Kelembagaan"

🚀 **Performance**: Tetap menggunakan 1 API call saja untuk semua data

## Testing:

- ✅ Satlinmas card shows "Belum terbentuk" when count = 0
- ✅ Satlinmas card shows "Terbentuk" when count > 0
- ✅ "Bentuk Kelembagaan" button appears when not formed
- ✅ Click navigation works when formed
- ✅ One-click formation works properly
