# PWA Session Persistence

## Overview
Sistem ini memastikan user tetap login di PWA bahkan setelah:
- Menutup dan membuka kembali PWA
- Restart device
- Browser clear cache (dalam batas tertentu)
- Switch antar tabs

## Features

### 1. **Persistent Session Storage**
- **localStorage**: Primary storage untuk session
- **IndexedDB**: Backup storage yang lebih persistent
- Session otomatis di-sync antara kedua storage

### 2. **Long Session Duration**
- **Default**: 30 hari untuk session normal
- **Remember Me**: 90 hari untuk session dengan remember me
- Auto-extend session saat user aktif

### 3. **Activity Tracking**
- Deteksi user activity (click, scroll, keyboard, touch)
- Update timestamp setiap ada activity
- Perpanjang session otomatis untuk active users

### 4. **Multi-Tab Sync**
- Session di-sync real-time antar tabs
- Logout di satu tab = logout di semua tabs
- Login di satu tab = login di semua tabs

### 5. **Automatic Recovery**
- Restore session dari IndexedDB jika localStorage kosong
- Backup session setiap 5 menit
- Backup saat PWA ditutup
- Backup saat visibility change

## Configuration

### Session Expiry Settings
```javascript
// In AuthContext.jsx
const SESSION_CONFIG = {
  DEFAULT_EXPIRY: 30 * 24 * 60 * 60 * 1000,      // 30 days
  REMEMBER_ME_EXPIRY: 90 * 24 * 60 * 60 * 1000,  // 90 days
  ACTIVITY_CHECK_INTERVAL: 5 * 60 * 1000,        // 5 minutes
};
```

### Backup Schedule
```javascript
// In sessionPersistence.js
- Immediate: On login
- Periodic: Every 5 minutes
- Event-based: On visibility change, before unload
```

## Usage

### For Developers

#### 1. Login with Persistent Session
```javascript
const { login } = useAuth();

// Login with remember me (90 days)
login(userData, null, token, true);

// Login without remember me (30 days)
login(userData, null, token, false);
```

#### 2. Manual Activity Update
```javascript
const { updateActivity } = useAuth();

// Update activity manually if needed
updateActivity();
```

#### 3. Check Session Status
```javascript
const session = JSON.parse(localStorage.getItem('authSession'));
console.log('Session expires at:', new Date(session.expiresAt));
console.log('Last activity:', new Date(session.lastActivity));
console.log('Remember me:', session.rememberMe);
```

### For Users

#### PWA Behavior
1. **First Login**: Session dibuat dan disimpan
2. **Close PWA**: Session tetap tersimpan
3. **Open PWA Again**: Auto-login dengan session yang tersimpan
4. **After 30/90 Days**: Session expired, perlu login lagi
5. **Manual Logout**: Session dihapus dari semua storage

## Technical Details

### Storage Locations
1. **localStorage**:
   - `authSession`: Full session object with expiry
   - `user`: User data (legacy support)
   - `expressToken`: Auth token (legacy support)

2. **IndexedDB**:
   - Database: `DPMD_SessionDB`
   - ObjectStore: `sessions`
   - Key: `current`

### Session Object Structure
```javascript
{
  user: { /* user data */ },
  token: "jwt-token-here",
  expiresAt: 1735689600000,  // Timestamp
  lastActivity: 1735086800000, // Timestamp
  rememberMe: true,
  backedUpAt: 1735086800000  // IndexedDB only
}
```

### Activity Events Monitored
- `mousedown`
- `keydown`
- `scroll`
- `touchstart`
- `click`

### Auto-Logout Conditions
- Session expired (past expiresAt)
- Explicit logout by user
- Invalid/corrupted session data

## Troubleshooting

### Issue: User auto-logout saat buka PWA
**Solution**: 
1. Check session expiry: `localStorage.getItem('authSession')`
2. Pastikan timestamp belum expired
3. Check console untuk error IndexedDB

### Issue: Session tidak tersync antar tabs
**Solution**:
1. Clear browser cache
2. Hard reload (Ctrl+Shift+R)
3. Check browser console untuk storage events

### Issue: Session hilang setelah restart device
**Solution**:
1. Pastikan IndexedDB tidak di-block oleh browser
2. Check browser settings untuk "Clear data on exit"
3. Gunakan "Remember Me" untuk session lebih lama

## Security Considerations

1. **Token Storage**: JWT token disimpan di localStorage (standard practice untuk PWA)
2. **Expiry Enforcement**: Server harus validate token expiry
3. **HTTPS Only**: PWA hanya bekerja di HTTPS untuk security
4. **Sensitive Data**: Jangan simpan password atau data sensitif lain
5. **Token Refresh**: Implement refresh token untuk security lebih baik

## Best Practices

1. **Always Use HTTPS** di production
2. **Set Proper Token Expiry** di backend (match dengan frontend)
3. **Implement Refresh Token** untuk long-lived sessions
4. **Monitor Session Activity** untuk detect suspicious behavior
5. **Clear Session on Security Events** (password change, etc.)

## Future Enhancements

- [ ] Refresh token mechanism
- [ ] Biometric authentication for session restore
- [ ] Encrypted session storage
- [ ] Server-side session validation
- [ ] Session analytics and monitoring

## References

- [PWA Best Practices](https://web.dev/pwa/)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker Cookbook](https://serviceworke.rs/)
