# Layout Update Guide - 26 Desember 2025

## Perubahan yang Diterapkan

### 1. Import Statements
Tambahkan import baru:
```jsx
import { FiBell, FiCalendar, FiBarChart2 } from "react-icons/fi";
import { toast } from 'react-hot-toast';
```

### 2. State Management
Tambahkan state baru di component:
```jsx
const [showNotifications, setShowNotifications] = React.useState(false);
const [notifications, setNotifications] = React.useState([]);
const [unreadCount, setUnreadCount] = React.useState(0);
```

### 3. Notification Logic
Tambahkan useEffect untuk load notifications:
```jsx
React.useEffect(() => {
    const dummyNotifications = [
        {
            id: 1,
            title: 'Disposisi Baru',
            message: 'Anda memiliki disposisi surat baru yang perlu ditinjau',
            time: '10 menit lalu',
            read: false,
            type: 'disposisi'
        },
        {
            id: 2,
            title: 'Rapat Koordinasi',
            message: 'Rapat koordinasi akan dimulai besok pukul 09.00',
            time: '3 jam lalu',
            read: true,
            type: 'kegiatan'
        }
    ];
    setNotifications(dummyNotifications);
    setUnreadCount(dummyNotifications.filter(n => !n.read).length);
}, []);

const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }
};

const handleNotificationItemClick = (notification) => {
    if (notification.type === 'disposisi') {
        navigate('/[ROLE]/disposisi'); // sesuaikan dengan role
    } else if (notification.type === 'kegiatan') {
        navigate('/core-dashboard/kegiatan');
    }
    setShowNotifications(false);
};
```

### 4. Bottom Navigation Update
Ganti bottomNavItems:
```jsx
const bottomNavItems = [
    { path: "/core-dashboard/dashboard", label: "Core Dashboard", icon: FiBarChart2 },
    { path: "/core-dashboard/kegiatan", label: "Jadwal Kegiatan", icon: FiCalendar },
    { path: "/[ROLE]/disposisi", label: "Disposisi", icon: FiMail },
    { path: "/[ROLE]/menu", label: "Menu", icon: FiMenu, action: () => setShowMenu(true) },
];
```

### 5. Header dengan Notifikasi
Tambahkan header sebelum main content:
```jsx
{/* Header with Notification */}
<header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-[COLOR]-600 to-[COLOR]-700 text-white shadow-lg z-40">
    <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                {user.avatar ? (
                    <img 
                        src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001'}${user.avatar}`}
                        alt={user.name}
                        className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-md"
                    />
                ) : null}
                <div className={`h-10 w-10 bg-white/20 rounded-full flex items-center justify-center shadow-md ${user.avatar ? 'hidden' : ''}`}>
                    <FiUser className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-sm">{user.name || "[ROLE NAME]"}</h3>
                    <p className="text-xs text-[COLOR]-100">[ROLE NAME]</p>
                </div>
            </div>
            
            <button
                onClick={handleNotificationClick}
                className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
            >
                <FiBell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>
        </div>
    </div>
</header>

<main className="min-h-screen pt-16">
    <Outlet />
</main>
```

### 6. Notification Panel
Tambahkan setelah nav, sebelum menu modal:
```jsx
{/* Notification Panel */}
{showNotifications && (
    <>
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fadeIn"
            onClick={() => setShowNotifications(false)}
        ></div>
        <div className="fixed top-16 left-0 right-0 bg-white rounded-b-3xl shadow-2xl z-50 animate-slideDown max-h-96 overflow-hidden">
            <div className="max-w-lg mx-auto">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-800 text-lg">Notifikasi</h3>
                </div>
                <div className="overflow-y-auto max-h-80">
                    {notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <button
                                key={notification.id}
                                onClick={() => handleNotificationItemClick(notification)}
                                className={`w-full flex gap-3 p-4 border-b border-gray-100 hover:bg-[COLOR]-50 transition-colors text-left ${
                                    !notification.read ? 'bg-[COLOR]-50/50' : ''
                                }`}
                            >
                                {/* Notification content */}
                            </button>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <FiBell className="h-12 w-12 mb-2" />
                            <p className="text-sm">Tidak ada notifikasi</p>
                        </div>
                    )}
                </div>
                <div className="px-6 py-3 border-t border-gray-200">
                    <button
                        onClick={() => setShowNotifications(false)}
                        className="w-full py-2 text-gray-600 font-medium hover:text-gray-800 transition-colors text-sm"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    </>
)}
```

### 7. Update Menu Items
Ganti menu items dengan yang baru:
```jsx
<button onClick={() => { setShowMenu(false); navigate("/core-dashboard/dashboard"); }}>
    <FiBarChart2 /> Core Dashboard
</button>

<button onClick={() => { setShowMenu(false); navigate("/core-dashboard/kegiatan"); }}>
    <FiCalendar /> Jadwal Kegiatan
</button>

<button onClick={() => { setShowMenu(false); navigate("/[ROLE]/disposisi"); }}>
    <FiMail /> Disposisi Surat
</button>
```

### 8. Add Animation
Update styles:
```jsx
<style>{`
    @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    .animate-slideDown {
        animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
`}</style>
```

## Role-Specific Colors

- **Kepala Dinas**: `blue` (blue-600, blue-700, blue-100, etc.)
- **Sekretaris Dinas**: `purple` (purple-600, purple-700, purple-100, etc.)
- **Kepala Bidang**: `green` (green-600, green-700, green-100, etc.)
- **Pegawai**: `orange` (orange-600, orange-700, orange-100, etc.)

## Files to Update

1. ✅ `/pages/kepala-dinas/KepalaDinasLayout.jsx` - DONE
2. ✅ `/pages/sekretaris-dinas/SekretarisDinasLayout.jsx` - DONE
3. 🔄 `/pages/kepala-bidang/KepalaBidangLayout.jsx` - IN PROGRESS
4. ⏳ `/pages/pegawai/PegawaiLayout.jsx` - PENDING

## Testing Checklist

- [ ] Notification bell appears in header
- [ ] Unread count badge shows correctly
- [ ] Notification panel slides down when clicked
- [ ] Clicking notification navigates to correct page
- [ ] Bottom navigation has 3 new menu items
- [ ] Settings button is removed
- [ ] Header is fixed at top
- [ ] Content has proper padding-top for header
- [ ] All animations work smoothly
- [ ] Notification marks as read when opened

---
**Last Updated**: 26 Desember 2025
