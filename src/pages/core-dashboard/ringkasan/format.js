// Helper format beranda ringkasan dan Rapor Wilayah.
// Data keuangan tidak boleh dibulatkan ke ribuan/jutaan; hanya sen yang dibuang.
export const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
export const angka = (n) => (Number(n) || 0).toLocaleString('id-ID');
// Skor satu desimal dengan koma; null tetap strip.
export const fmtSkor = (s) =>
  s === null || s === undefined ? '—' : Number(s).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const normNama = (s) => String(s || '').trim().toLowerCase();

export const warnaRasio = (r) => (r >= 80 ? 'bg-emerald-500' : r >= 50 ? 'bg-amber-500' : 'bg-rose-500');
