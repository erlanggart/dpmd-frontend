// src/utils/asalServer.js
//
// Asal (origin) backend untuk hal-hal DI LUAR panggilan API biasa: berkas
// statis di /storage dan /uploads, serta koneksi socket.io.
//
// ─── Kenapa berkas ini ada ───────────────────────────────────────────────────
//
// `VITE_API_BASE_URL` bernilai "/api" — relatif, dan memang disengaja: nginx
// meneruskan /api, /storage, /uploads, dan /socket.io ke backend yang sama,
// jadi URL relatif selalu menempel ke origin halaman yang sedang dibuka.
//
// Membuang "/api" dari nilai itu menghasilkan STRING KOSONG. String kosong
// adalah jawaban yang benar — tapi ia juga falsy. Pola yang tersebar di banyak
// berkas ini:
//
//     import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001'
//
// karena itu selalu jatuh ke fallback. Bundel produksi benar-benar memuat
// `"/api".replace("/api","")||"http://localhost:3001"`, sehingga browser setiap
// pengunjung diarahkan ke localhost:3001 di komputernya sendiri: socket chat
// tidak pernah tersambung, dan setiap gambar gagal dimuat.
//
// Di komputer pengembang gejalanya tidak muncul, karena backend memang ada di
// localhost:3001. Bug ini hanya kelihatan setelah tayang.
//
// Fallback tetap dipertahankan untuk satu keadaan yang sah: variabelnya tidak
// diset sama sekali.

const nilaiEnv = import.meta.env.VITE_API_BASE_URL;

/**
 * Origin backend. String kosong berarti "origin yang sama dengan halaman ini",
 * dan itu nilai yang benar untuk dirangkai jadi URL relatif: `${ASAL}/storage/x`
 * menghasilkan `/storage/x`.
 */
export const ASAL_SERVER =
	nilaiEnv === undefined || nilaiEnv === null || nilaiEnv === ''
		? 'http://127.0.0.1:3001'
		: String(nilaiEnv).replace(/\/?api\/?$/, '');

/**
 * Argumen URL untuk `io()`.
 *
 * socket.io-client TIDAK boleh menerima string kosong: parser URL-nya hanya
 * memakai origin halaman bila argumennya `null`/`undefined`, sedangkan `''`
 * lolos pemeriksaan itu lalu dirangkai jadi "https://" tanpa host. Jadi origin
 * yang sama harus dikirim sebagai `undefined`, bukan `''`.
 */
export const asalSocket = () => ASAL_SERVER || undefined;

/**
 * URL berkas dari jalur yang disimpan server. Menerima jalur berawalan "/"
 * (mis. avatar: "/storage/avatars/x.jpg") maupun tanpa awalan (mis. lampiran
 * pesan: "storage/uploads/messaging/x.png"), keduanya menghasilkan satu garis
 * miring — bukan dua, dan bukan nol.
 */
export const urlServer = (jalur) => {
	if (!jalur) return null;
	return `${ASAL_SERVER}/${String(jalur).replace(/^\/+/, '')}`;
};
