# Catatan: Dashboard Statistik BUMDes (Core Dashboard)

Halaman: `/core-dashboard/statistik-bumdes`
Berkas: [`src/pages/kepala-dinas/StatistikBumdes.jsx`](../src/pages/kepala-dinas/StatistikBumdes.jsx)

Catatan ini merangkum **apa yang sudah dikerjakan**, **apa yang datanya ternyata
tidak mendukung**, dan **apa yang masih tersisa**. Ditulis 2026-08-27, setelah
impor 416 BUMDes masuk ke produksi.

---

## 1. Kerangka: DPMD adalah PEMBINA

Ini yang menentukan isi dashboard. Pembina tidak butuh "total omset kabupaten".
Yang dibutuhkan tiga hal:

1. **Siapa yang bermasalah** — daftar yang bisa ditindaklanjuti
2. **Masalahnya apa** — supaya program pembinaan tepat sasaran
3. **Berapa uang desa yang dipertaruhkan** — untuk memprioritaskan

Dashboard statistik biasa menjawab "berapa besar". Dashboard pembina menjawab
**"siapa yang harus saya datangi minggu ini"**.

---

## 2. Kondisi data sebenarnya (416 BUMDes, per 2026-08-27)

Semua angka di bawah hasil pemeriksaan langsung ke salinan data produksi.

### Datanya bolong, dan itu fakta paling penting

| | Jumlah | % |
|---|---|---|
| Melapor lengkap (aset + omset + laba) | 198 | 48% |
| Melapor sebagian | 99 | 24% |
| **Belum melapor apa pun** | **119** | **29%** |
| Beromset di atas nol | 232 | 56% |

> "Aktif" (390) hanya label administratif. Ukuran kegiatan usaha yang sebenarnya
> adalah **232 yang beromset di atas nol**.

### Kelengkapan per kolom keuangan

| Kolom | Terisi | Yang nilainya > 0 |
|---|---|---|
| NilaiAset | 207 | 104 |
| Omset2024 | 217 | 104 |
| Omset2025 | 220 | 220 |
| Laba2025 | 168 | 134 |
| KontribusiPADes2025 | 111 | 111 |
| PenganggaranPenyertaanModal2025 | 363 | 363 |
| Pemeringkatan2024 | **416** | — |

`Pemeringkatan2024` satu-satunya kolom penilaian yang **lengkap 416**.
`Pemeringkatan2026` baru 262 — masih berjalan, jangan dipakai sebagai angka utama.

### Ukuran sebenarnya

Nilai tengah omset **Rp 42 juta setahun ≈ Rp 3 juta sebulan**. Mayoritas mikro.

| Kelas omset 2025 | Jumlah |
|---|---|
| di bawah Rp 10 Jt | 64 |
| Rp 10–50 Jt | 53 |
| Rp 50–250 Jt | 63 |
| Rp 250 Jt – 1 M | 32 |
| di atas Rp 1 M | 8 |

**Selalu pakai nilai tengah, bukan rata-rata.** Rata-rata tertarik segelintir
BUMDes besar dan memberi kesan keliru.

---

## 3. Enam masalah ekonomi yang wajib dipantau pembina

Definisi persisnya sudah ditulis di
[`src/utils/bumdesDiagnosa.js`](../src/utils/bumdesDiagnosa.js) — **sudah diuji
cocok dengan hasil query SQL**, tapi belum dipakai komponen mana pun.

| Masalah | Jumlah | Modal dipertaruhkan | Tindakan |
|---|---|---|---|
| **Modal mengendap** — disuntik modal, **melapor** omset Rp 0 | 44 | Rp 8,53 M | Pembinaan usaha / evaluasi kelayakan |
| **Modal tanpa laporan** — disuntik modal, **tidak melapor** omset | 90 | Rp 14,09 M | Tagih laporan dulu, jangan dinilai |
| **Merugi** — laba negatif | 42 | Rp 8,23 M | Pendampingan pengelolaan |
| **Untung tapi tidak menyetor** ke PADes | 36 | Rp 5,57 M | Ingatkan kewajiban setor |
| **Omset turun** 2024 → 2025 | 19 dari 92 | Rp 3,62 M | Telusuri penyebab |
| **Aset menganggur** — aset >Rp 50 Jt, omset <20% nilai aset | 28 | Rp 7,57 M | Dorong pemanfaatan aset |
| **Tidak terpantau** — nihil angka keuangan | 119 | Rp 13,21 M | Tidak bisa dinilai sampai melapor |
| *Pembanding — sehat: beromset + untung + menyetor* | *98 (24%)* | | |

### ⚠ Pemisahan yang WAJIB dijaga

**"Melapor omset Rp 0" dan "tidak melapor omset" tidak boleh digabung.**

Yang pertama terbukti mengendap (44 BUMDes). Yang kedua belum diketahui
(90 BUMDes) dan hanya boleh ditagih datanya. Menggabungkannya jadi
*"134 BUMDes menahan Rp 22,6 M"* adalah tuduhan yang tidak bisa
dipertanggungjawabkan untuk 90 desa di antaranya.

---

## 4. Yang SENGAJA tidak ditampilkan (beserta buktinya)

Jangan tambahkan ini nanti tanpa membaca alasannya dulu.

| Grafik | Kenapa tidak |
|---|---|
| **Tren omset 2023→2025** | Median 2023 = **Rp 0**, median 2024 = **Rp 0**, median 2025 = Rp 57,5 Jt. Lebih dari separuh pelapor menulis nol di dua tahun pertama. Lonjakan 2025 adalah **pelaporan yang membaik, bukan usaha yang tumbuh**. Grafiknya akan mengarang kisah sukses 7× lipat. |
| **Peringkat kecamatan menurut omset** | Jonggol tertinggi Rp 13,9 M, tapi **92% dari satu BUMDes** (Sukamaju Rp 12,88 M). Yang diranking pencilannya, bukan kecamatannya. |
| **Total penyertaan modal apa adanya** | Satu salah ketik di **Ligarmukti (Rp 1.000.256.888.018)** menyumbang **97%** dari total. Sudah ditangani otomatis lewat ambang 100× nilai tengah. |

Kalau nanti pelaporan sudah membaik dan median tahun-tahun sebelumnya tidak lagi
nol, tren omset baru layak digrafikkan.

---

## 5. Yang SUDAH jadi dan sudah live

| Bagian | Commit | Keterangan |
|---|---|---|
| Endpoint `GET /api/kepala-dinas/bumdes` | `56afd00` (backend) | 416 baris, 50 kolom, ~49 KB setelah gzip. Path berkas tidak dikirim, hanya penanda ada/tidak |
| `BumdesDirectory.jsx` | `0b1a9db` | Pencarian, 4 penyaring, kolom bisa diurutkan, panel detail |
| `BumdesEkonomi.jsx` | `9973519` | Gambaran ekonomi yang menyebut penyebut tiap angka |

### Kenapa endpoint sendiri, bukan `/api/bumdes`

Rute `/api/bumdes` **menolak `sekretaris_dinas`** yang justru punya akses Core
Dashboard, dan `getBumdesById` bahkan menolak `kepala_dinas`. Ketimpangan peran
itu **masih ada** di rute lama — jangan pakai `/api/bumdes` dari Core Dashboard.

### Susunan halaman sekarang

```
PageHeader
SummaryCard × 3        (total / aktif / non-aktif)
BumdesEkonomi          <- gambaran ekonomi
BumdesCharts           <- sebaran kecamatan + status
BumdesDirectory        <- pencarian + detail
```

---

## 6. Yang MASIH tersisa

### a. Panel monitoring pembina (belum dibuat)

Rencananya: kartu per masalah dari tabel bagian 3, **bisa diklik untuk menyaring
direktori di bawahnya**. Itu yang mengubah dashboard dari sekadar informatif jadi
bisa ditindaklanjuti.

Yang perlu dikerjakan:

1. Angkat state `sorotan` ke `StatistikBumdes.jsx`
2. Komponen kartu masalah memakai `rekapMasalah()` dari `bumdesDiagnosa.js`
3. `BumdesDirectory` menerima prop `sorotan`, menyaring dengan `diagnosa(d)`
4. Tampilkan label penyaring aktif + tombol lepas

`bumdesDiagnosa.js` sudah siap pakai dan sudah terverifikasi angkanya.

### b. Ekspor daftar tindak lanjut

Pembina butuh daftar yang bisa dibawa ke lapangan. Ekspor Excel per jenis
masalah (nama BUMDes, desa, kecamatan, kontak direktur, nilai modal).
Kontak direktur sudah ikut dikirim endpoint.

### c. Berkas yang sudah tidak dipakai

`src/pages/kepala-dinas/components/BumdesStatsCards.jsx` **sudah tidak dipakai**
sejak `9973519` tapi berkasnya masih ada, sengaja, supaya perubahan mudah
dibalik. Hapus kalau tampilan baru sudah mantap.

### d. Data pembinaan belum dipakai sama sekali

Ada 22 kolom pembinaan/pelatihan/permasalahan. Kondisinya:

| Kolom | Terisi | Catatan |
|---|---|---|
| `KehadiranDesk2026` | **416** | ✔️ 283, ❌ **133 tidak hadir** — daftar tindak lanjut langsung |
| `DeskPendataan2025` | 282 | P1–P4 (gelombang) |
| `PelatihanBUMDesa2024` | 256 | angkatan 1/2, **17 tercatat "TDK HADIR"** |
| `PelatihanPenasehatPengawas2024` | 205 | **7 tercatat "TDK HADIR"** |
| `Pembinaan2022` / `Pembinaan2023` | 209 / 207 | penanda "v" |
| `Pembinaan2024` | **0** | kosong total — jangan dipakai |
| `FGDBRIN2024`, `SosialisasiELearningUI`, `PermasalahanLainnya` | **0** | kosong total |
| `ProgressHasilPembinaan2024` | 1 | praktis kosong |

**Peluang paling jelas: 133 BUMDes tidak hadir Desk 2026.** Datanya lengkap
416/416, jadi bisa langsung jadi daftar tindak lanjut tanpa asumsi apa pun.

---

## 7. Keputusan desain (jangan diubah tanpa alasan)

### Warna

Satu hue **slate, terang → gelap**:
`#94a3b8` → `#64748b` → `#475569` → `#334155` → `#1e293b` → `#0f172a`

Seluruh datanya **berskala urut** (Perintis..Maju, kelas omset, corong
omset→laba→PADes), jadi **sekuensial**, bukan kategorikal. Ramp sudah
diverifikasi: monoton menurun, lolos pemisahan CVD.

**Langkah paling terang berkontras 2,56:1** — di atas lantai 2:1 untuk
sekuensial tapi di bawah 3:1. Konsekuensinya **setiap batang wajib berlabel
nilai yang terbaca tanpa hover**, dan tabel lengkapnya harus tersedia (sudah,
di direktori halaman yang sama). Jangan hapus label itu.

Merah bata (`--color-brand-*`) hanya untuk aksen teks, **tidak pernah** sebagai
bidang warna data. Amber hanya untuk peringatan mutu data, selalu dengan ikon +
label, tidak pernah warna saja.

### Aturan penyajian angka

1. **Setiap angka menyebut penyebutnya.** Kesalahan lama: kartu "Total Aset
   BUMDes" bersubjudul "416 BUMDes" padahal totalnya dari 207 pelapor.
2. **Nilai tengah, bukan rata-rata**, untuk semua besaran uang.
3. **Nilai janggal disebut terbuka**, tidak dibuang diam-diam. Ambangnya relatif
   (100× nilai tengah) supaya salah ketik baru ikut tertangkap sendiri.
4. **Modal 2019–2024 tidak boleh disandingkan langsung dengan omset setahun** —
   yang satu akumulasi enam tahun.

### Kelas Tailwind

Tulis utuh, jangan dirangkai dari variabel (`bg-${warna}-100`). Kelas dinamis
tidak ikut ter-scan saat build dan diam-diam hilang di produksi.

---

## 8. Cara memverifikasi ulang angkanya

Semua angka di catatan ini bisa dihitung ulang. Bangun DB uji dari dump
produksi, jalankan importer, lalu query.

```bash
# di dpmd-fahri-express
# 1. bangun DB uji dari dump + migrasi kolom
# 2. jalankan importer ke DB uji
cd scripts/bumdes-import
node import-bumdes.js --csv=<CSV> --env=<env-uji> --mode=gabung
```

Untuk mencocokkan diagnosa JS dengan SQL, impor `bumdesDiagnosa.js` sebagai
modul ES dan bandingkan `rekapMasalah(data)` dengan query padanannya. Terakhir
dijalankan: **ketujuh angka cocok persis**.

---

## 9. Sumber data yang perlu diingat

- Impor CSV: [`scripts/bumdes-import/README.md`](../../dpmd-fahri-express/scripts/bumdes-import/README.md) di repo backend
- Mode `gabung` aman diulang; sel kosong di CSV tidak menghapus data lama
- **16 anomali** masih menunggu perbaikan di sheet (Balekambang Rp 16.270 triliun,
  beberapa PADes ditulis "per bulan", modal awal ditulis sebagai kalimat).
  Kolomnya `NULL`, tidak ditebak.
- Kolom path dokumen tidak pernah disentuh importer — berkas diunggah manual
  lewat akun pegawai SPKED.
