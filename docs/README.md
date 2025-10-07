# DPMD Frontend

Aplikasi frontend untuk sistem DPMD (Dinas Pemberdayaan Masyarakat dan Desa) yang dibangun menggunakan React + Vite.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🏗️ Tech Stack

- **React 18** - UI Library
- **Vite** - Build Tool & Dev Server
- **Tailwind CSS** - Styling Framework
- **React Router** - Navigation
- **Lucide React** - Icons
- **React Hook Form** - Form Management
- **Axios** - HTTP Client
- **SweetAlert2** - Notifications

## 📁 Project Structure

```
src/
├── components/          # Reusable components
├── pages/              # Page components
│   ├── desa/          # Desa module
│   ├── sekretariat/   # Sekretariat module
│   └── ...
├── services/          # API services
├── hooks/             # Custom hooks
├── utils/             # Utility functions
└── assets/            # Static assets
```

## 📚 Dokumentasi

Dokumentasi lengkap tersedia di folder [`docs/`](./docs/INDEX.md):

- 📖 **[INDEX.md](./docs/INDEX.md)** - Overview dokumentasi
- 🏛️ **Kelembagaan** - Dokumentasi modul kelembagaan
- 📊 **Statistik** - Dokumentasi fitur statistik
- 🔧 **Development** - Panduan pengembangan

## 🛠️ Development

### Prerequisites
- Node.js 16+ 
- npm atau yarn

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables
Buat file `.env` berdasarkan `.env.example`:
```bash
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME="DPMD System"
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

Lihat dokumentasi di [`docs/`](./docs/) untuk panduan pengembangan spesifik.

## 📄 License

Private project - All rights reserved.
