# Dashboard Kepala Dinas - Components

Direktori ini berisi komponen-komponen modular untuk Dashboard Kepala Dinas yang sudah dipisahkan untuk meningkatkan maintainability dan reusability.

## Struktur Komponen

### 1. **DashboardHeader.jsx**
Header utama dashboard yang menampilkan judul dan deskripsi.

**Props:** Tidak ada (static component)

**Usage:**
```jsx
<DashboardHeader />
```

---

### 2. **SummaryCards.jsx**
Menampilkan kartu ringkasan untuk Total BUMDes dan Perjalanan Dinas dengan interaksi klik untuk filter view.

**Props:**
- `summary` (object): Data ringkasan dari API
- `activeModule` (string): Module yang sedang aktif ('overview', 'bumdes', 'perjadin')
- `onModuleChange` (function): Handler untuk mengubah module aktif

**Usage:**
```jsx
<SummaryCards
  summary={summary}
  activeModule={activeModule}
  onModuleChange={setActiveModule}
/>
```

---

### 3. **BackButton.jsx**
Tombol untuk kembali ke tampilan overview.

**Props:**
- `onClick` (function): Handler untuk klik tombol

**Usage:**
```jsx
<BackButton onClick={() => setActiveModule('overview')} />
```

---

### 4. **BumdesCharts.jsx**
Menampilkan chart untuk data BUMDes:
- Bar Chart: BUMDes per Kecamatan (Top 10)
- Pie Chart: Status BUMDes (Aktif/Non-Aktif)

**Props:**
- `bumdes` (object): Data BUMDes dari API

**Usage:**
```jsx
<BumdesCharts bumdes={bumdes} />
```

---

### 5. **PerjadinCharts.jsx**
Menampilkan Bar Chart untuk Perjalanan Dinas per Lokasi (Top 10).

**Props:**
- `perjalanan_dinas` (object): Data perjalanan dinas dari API

**Usage:**
```jsx
<PerjadinCharts perjalanan_dinas={perjalanan_dinas} />
```

---

### 6. **TrendChart.jsx**
Menampilkan Line Chart untuk trend 6 bulan terakhir (BUMDes dan Perjadin).

**Props:**
- `trends` (array): Data trend dari API

**Usage:**
```jsx
<TrendChart trends={trends} />
```

---

### 7. **BumdesStatsCards.jsx**
Menampilkan 4 kartu statistik BUMDes:
- Total Aset BUMDes
- Total Omzet 2024
- Tenaga Kerja
- Berbadan Hukum

**Props:**
- `bumdes` (object): Data BUMDes dari API

**Usage:**
```jsx
<BumdesStatsCards bumdes={bumdes} />
```

---

### 8. **PerjadinStatsCards.jsx**
Menampilkan 4 kartu statistik Perjalanan Dinas:
- Total Perjalanan Dinas
- Total Peserta
- Total Partisipasi
- Upcoming (30 Hari)

**Props:**
- `perjalanan_dinas` (object): Data perjalanan dinas dari API

**Usage:**
```jsx
<PerjadinStatsCards perjalanan_dinas={perjalanan_dinas} />
```

---

## Struktur Data API

### Summary
```javascript
{
  total_bumdes: number,
  total_perjalanan_dinas: number
}
```

### BUMDes
```javascript
{
  total: number,
  aktif: number,
  non_aktif: number,
  berbadan_hukum: number,
  by_kecamatan: [{kecamatan: string, total: number}],
  financials: {
    total_aset: number,
    total_omzet: number,
    total_laba: number,
    total_tenaga_kerja: number
  }
}
```

### Perjalanan Dinas
```javascript
{
  total: number,
  total_lokasi: number,
  total_peserta: number,
  total_partisipasi: number,
  upcoming_30days: number,
  by_lokasi: [{lokasi: string, total: number}]
}
```

### Trends
```javascript
[
  {
    month: string,
    bumdes_count: number,
    perjadin_count: number
  }
]
```

---

## Benefit Componentization

1. **Maintainability**: Setiap komponen memiliki tanggung jawab yang jelas dan terisolasi
2. **Reusability**: Komponen dapat digunakan kembali di halaman lain jika diperlukan
3. **Testing**: Lebih mudah untuk membuat unit test untuk setiap komponen
4. **Readability**: File utama dashboard menjadi lebih ringkas dan mudah dibaca (dari 570 lines menjadi ~145 lines)
5. **Collaboration**: Tim dapat bekerja pada komponen yang berbeda secara parallel
6. **Performance**: Memungkinkan untuk optimization dengan React.memo jika diperlukan

---

## Notes

- Semua komponen menggunakan Recharts untuk visualisasi data
- Styling menggunakan Tailwind CSS
- Icons dari lucide-react
- Komponen bersifat presentational (tidak melakukan data fetching sendiri)
- State management tetap berada di parent component (KepalaDinasDashboard.jsx)
