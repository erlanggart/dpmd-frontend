// Siapa yang wajib/boleh presensi lewat aplikasi.
//
// Nilai status_kepegawaian datang dalam dua bentuk: login & /auth/profile
// mengirim "Tenaga Alih Daya" (spasi), sedangkan /pegawai/:id mengirim nama
// enum Prisma "Tenaga_Alih_Daya" (garis bawah). Halaman Profil dulu menyimpan
// bentuk kedua ke sesi setelah pegawai menyunting datanya — dan sejak itu menu
// Presensi hilang karena perbandingannya hanya mengenal bentuk pertama.
// Semua pemeriksaan wajib lewat sini supaya kedua bentuk dianggap sama.

export const STATUS_PRESENSI = ["PPPK Paruh Waktu", "Tenaga Alih Daya", "Tenaga Keamanan", "Tenaga Kebersihan"];

export const normalisasiStatus = (status) => (status ? String(status).replace(/_/g, " ").trim() : null);

export const bisaPresensi = (status) => STATUS_PRESENSI.includes(normalisasiStatus(status));
