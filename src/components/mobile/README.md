# Custom Dialog Components - Mobile First Design

Komponen custom dialog untuk menggantikan `alert()` dan `confirm()` default browser dengan design mobile-first style GoJek.

## 📦 Components

### 1. ConfirmDialog
Dialog konfirmasi untuk menggantikan `window.confirm()`

**Props:**
- `isOpen` - Boolean untuk show/hide dialog
- `onClose` - Callback saat dialog ditutup
- `onConfirm` - Callback saat tombol konfirmasi diklik
- `title` - Judul dialog (default: "Konfirmasi")
- `message` - Pesan konfirmasi (default: "Apakah Anda yakin?")
- `confirmText` - Text tombol konfirmasi (default: "OK")
- `cancelText` - Text tombol batal (default: "Batal")
- `type` - Tipe dialog: `'warning'`, `'danger'`, `'success'`, `'info'` (default: 'warning')
- `showCancel` - Show/hide tombol cancel (default: true)

### 2. AlertDialog
Dialog alert untuk menggantikan `window.alert()`

**Props:**
- `isOpen` - Boolean untuk show/hide dialog
- `onClose` - Callback saat dialog ditutup
- `title` - Judul dialog (default: "Pemberitahuan")
- `message` - Pesan alert
- `buttonText` - Text tombol OK (default: "OK")
- `type` - Tipe dialog: `'info'`, `'success'`, `'warning'`, `'error'` (default: 'info')

## 🎯 Hooks

### useConfirm()
Custom hook untuk confirmation dialog dengan Promise-based API

**Returns:**
- `confirmDialog` - Component untuk di-render
- `showConfirm(options)` - Function untuk show dialog (returns Promise<boolean>)
- `isConfirmOpen` - Boolean status dialog

**Usage:**
```jsx
import { useConfirm } from '../../hooks/useConfirm';

const MyComponent = () => {
  const { confirmDialog, showConfirm } = useConfirm();

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: 'Hapus Data',
      message: 'Apakah Anda yakin ingin menghapus data ini?',
      type: 'danger',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal'
    });

    if (confirmed) {
      // Lakukan delete
      console.log('Data dihapus');
    }
  };

  return (
    <>
      <button onClick={handleDelete}>Hapus</button>
      {confirmDialog}
    </>
  );
};
```

### useAlert()
Custom hook untuk alert dialog

**Returns:**
- `alertDialog` - Component untuk di-render
- `showAlert(options)` - Function untuk show dialog
- `isAlertOpen` - Boolean status dialog

**Usage:**
```jsx
import { useAlert } from '../../hooks/useAlert';

const MyComponent = () => {
  const { alertDialog, showAlert } = useAlert();

  const handleSuccess = () => {
    showAlert({
      title: 'Berhasil!',
      message: 'Data berhasil disimpan',
      type: 'success',
      buttonText: 'OK'
    });
  };

  return (
    <>
      <button onClick={handleSuccess}>Save</button>
      {alertDialog}
    </>
  );
};
```

## 🎨 Design Features

### Visual
- ✅ Rounded corners (3xl) untuk modern look
- ✅ Gradient backgrounds sesuai tipe
- ✅ Icon besar dengan background colorful
- ✅ Shadow & depth untuk dimensi
- ✅ Smooth animations (fade in + scale in)
- ✅ Backdrop blur effect

### UX
- ✅ Click backdrop untuk close
- ✅ Active scale untuk button feedback
- ✅ Close button (X) di pojok kanan
- ✅ Promise-based API untuk async flow
- ✅ Keyboard accessible

### Mobile First
- ✅ Touch-friendly button size
- ✅ Responsive max-width
- ✅ Centered modal layout
- ✅ Proper z-index (50)

## 📋 Type Colors

### Confirm Dialog
| Type | Icon | Background | Use Case |
|------|------|------------|----------|
| `warning` | ⚠️ AlertCircle | Yellow-Orange | Default konfirmasi |
| `danger` | ❌ XCircle | Red | Hapus data, aksi berbahaya |
| `success` | ✅ CheckCircle | Green | Konfirmasi positif |
| `info` | ℹ️ Info | Blue | Informasi umum |

### Alert Dialog
| Type | Icon | Background | Use Case |
|------|------|------------|----------|
| `info` | ℹ️ Info | Blue | Informasi umum |
| `success` | ✅ CheckCircle | Green | Berhasil |
| `warning` | ⚠️ AlertCircle | Yellow-Orange | Peringatan |
| `error` | ❌ XCircle | Red | Error |

## 🔄 Migration dari Browser Default

### Before (Old Way)
```jsx
// ❌ Browser default - jelek
const handleLogout = () => {
  if (window.confirm("Yakin ingin keluar?")) {
    logout();
  }
};

alert("Data berhasil disimpan!");
```

### After (New Way)
```jsx
// ✅ Custom dialog - cantik & mobile friendly
const { confirmDialog, showConfirm } = useConfirm();
const { alertDialog, showAlert } = useAlert();

const handleLogout = async () => {
  const confirmed = await showConfirm({
    title: 'Keluar dari Aplikasi',
    message: 'Apakah Anda yakin ingin keluar?',
    type: 'warning',
    confirmText: 'Ya, Keluar',
    cancelText: 'Batal'
  });

  if (confirmed) {
    logout();
  }
};

showAlert({
  title: 'Berhasil!',
  message: 'Data berhasil disimpan',
  type: 'success'
});

return (
  <>
    {/* your component */}
    {confirmDialog}
    {alertDialog}
  </>
);
```

## 📁 File Structure
```
src/
├── components/mobile/
│   ├── ConfirmDialog.jsx      # Confirmation dialog component
│   └── AlertDialog.jsx         # Alert dialog component
├── hooks/
│   ├── useConfirm.js          # Hook untuk confirm dialog
│   └── useAlert.js            # Hook untuk alert dialog
└── pages/
    └── **/Layout.jsx          # Sudah menggunakan useConfirm()
```

## ✅ Files Already Updated

Dialog sudah diimplementasikan di:
- ✅ [KepalaDinasLayout.jsx](../pages/kepala-dinas/KepalaDinasLayout.jsx)
- ✅ [SekretarisDinasLayout.jsx](../pages/sekretaris-dinas/SekretarisDinasLayout.jsx)
- ✅ [KepalaBidangLayout.jsx](../pages/kepala-bidang/KepalaBidangLayout.jsx)
- ✅ [PegawaiLayout.jsx](../pages/pegawai/PegawaiLayout.jsx)

Semua logout confirmation sudah menggunakan custom ConfirmDialog!

## 🚀 Next Steps

Replace `alert()` calls dengan `useAlert()` di:
- [ ] Disposisi pages (`src/pages/sekretariat/disposisi/*.jsx`)
- [ ] BUMDes dashboard (`src/pages/sarpras/Bumdes-app/*.jsx`)
- [ ] File upload components (`src/components/EnhancedFileInput.jsx`)
- [ ] Form submission callbacks

---

**DPMD Kabupaten Bogor © 2025**
