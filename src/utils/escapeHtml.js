// Escape teks sebelum disisipkan ke string HTML (mis. opsi `html` SweetAlert2,
// yang dirender lewat innerHTML). Kutip ikut di-escape supaya aman juga di
// dalam atribut seperti value="...". Wajib dipakai untuk isian yang diketik
// pengguna: tanpa ini satu nomor Perdes berisi <img onerror> sudah cukup untuk
// menjalankan skrip di sesi orang lain yang membukanya.
const PETA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (nilai) => String(nilai ?? '').replace(/[&<>"']/g, (c) => PETA[c]);

export default escapeHtml;
