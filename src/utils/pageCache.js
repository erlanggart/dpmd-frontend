// src/utils/pageCache.js
// Cache data halaman selama sesi (in-memory, hilang saat refresh browser / logout).
// Tujuan: saat pindah tab lalu kembali, halaman yang sudah pernah dibuka bisa
// langsung menampilkan data terakhir tanpa spinner loading blocking — data tetap
// di-refresh diam-diam (silent revalidate) di latar belakang.

const store = new Map();

export const hasPageCache = (key) => store.has(key);

export const getPageCache = (key) => store.get(key);

export const setPageCache = (key, value) => {
	store.set(key, value);
};

// Hapus cache. Tanpa argumen = bersihkan semua (mis. saat logout).
export const clearPageCache = (key) => {
	if (key === undefined) store.clear();
	else store.delete(key);
};

export default { hasPageCache, getPageCache, setPageCache, clearPageCache };
