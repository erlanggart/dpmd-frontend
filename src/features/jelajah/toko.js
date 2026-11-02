// Toko di seberang kantor (denahnya di scene/layout.js → TOKO).
export const INFO_TOKO = {
	alfamart: { nama: "Alfamart", ikon: "🛒" },
	koperasi: { nama: "Koperasi Desa Merah Putih", ikon: "🇮🇩" },
};

// Barang di toko depan kantor, dibayar dengan koin hasil memancing (lihat belanja.js).
// bentuk & warna dipakai model 3D di rak, di tangan, dan di keranjang. olah = bahan
// sembako yang dimasak dulu sebelum dimakan (hanya beda label tombol di tas).
export const BARANG = [
	{ id: "air", nama: "Air Mineral", ikon: "💧", harga: 15, tenaga: 10, ket: "Segar, pelepas dahaga", bentuk: "botol", warna: "#7dd3fc" },
	{ id: "esteh", nama: "Es Teh Manis", ikon: "🧋", harga: 25, tenaga: 15, ket: "Manis dingin, bikin semangat", bentuk: "botol", warna: "#b45309" },
	{ id: "roti", nama: "Roti Sobek", ikon: "🍞", harga: 35, tenaga: 22, ket: "Pengganjal perut", bentuk: "kotak", warna: "#f59e0b" },
	{ id: "mie", nama: "Mi Instan Cup", ikon: "🍜", harga: 50, tenaga: 30, ket: "Diseduh di tempat", bentuk: "cup", warna: "#ef4444" },
	{ id: "nasi", nama: "Nasi Bungkus", ikon: "🍱", harga: 90, tenaga: 50, ket: "Lauk ayam & sambal", bentuk: "bungkus", warna: "#a16207" },
	{ id: "energi", nama: "Minuman Energi", ikon: "⚡", harga: 140, tenaga: 75, ket: "Tenaga penuh untuk monster situ", bentuk: "kaleng", warna: "#22c55e" },
	// sembako Koperasi Desa Merah Putih
	{ id: "beras", nama: "Beras 1 kg", ikon: "🍚", harga: 45, tenaga: 40, ket: "Ditanak jadi nasi hangat", bentuk: "karung", warna: "#f5f5f4", olah: true },
	{ id: "minyak", nama: "Minyak Goreng 1 L", ikon: "🫗", harga: 38, tenaga: 14, ket: "Buat menggoreng lauk", bentuk: "botol", warna: "#facc15", olah: true },
	{ id: "telur", nama: "Telur Ayam ½ kg", ikon: "🥚", harga: 30, tenaga: 22, ket: "Didadar atau direbus", bentuk: "kotak", warna: "#fcd9a8", olah: true },
	{ id: "gula", nama: "Gula Pasir 1 kg", ikon: "🧂", harga: 20, tenaga: 12, ket: "Teman teh & kopi", bentuk: "bungkus", warna: "#f8fafc", olah: true },
	{ id: "tempe", nama: "Tempe & Tahu", ikon: "🟫", harga: 18, tenaga: 16, ket: "Lauk murah bergizi", bentuk: "kotak", warna: "#d6b47a", olah: true },
	{ id: "kopi", nama: "Kopi Sachet", ikon: "☕", harga: 8, tenaga: 6, ket: "Penghilang kantuk", bentuk: "bungkus", warna: "#78350f", olah: true },
];
