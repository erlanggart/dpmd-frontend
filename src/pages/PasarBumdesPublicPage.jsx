// src/pages/PasarBumdesPublicPage.jsx
//
// Pasar BUM Desa untuk umum — tanpa login, dibuka dari landing page.
//
// Sebelum ini katalog produk BUM Desa hanya bisa dilihat dari dalam aplikasi,
// jadi calon pembeli harus punya akun desa dulu untuk melihat barang yang dijual
// desa. Padahal seluruh isinya memang untuk umum: nama produk, harga, foto, dan
// nomor WhatsApp penjual.
//
// Katalognya BUKAN salinan: komponen yang sama dipakai akun desa dan SPKED,
// hanya dijalankan dengan `publik` sehingga memakai endpoint tanpa auth dan
// menyembunyikan tautan "kelola produk". Dengan begitu produk yang tampil di
// sini mustahil berbeda dari yang tampil di dalam aplikasi.
//
// Bingkai halamannya mengikuti halaman transparansi Bantuan Keuangan
// (BankeuPublicPage): bilah atas dengan tautan kembali ke beranda, lalu Footer
// landing page yang sama.
import React, { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import Footer from '../components/landingpage/Footer';

const KatalogProdukBumdesPage = lazy(() => import('./desa/bumdes/KatalogProdukBumdesPage'));

const PasarBumdesPublicPage = () => (
  <div className="min-h-screen bg-stone-50">
    <nav className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Beranda</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold leading-tight text-stone-900">Pasar BUM Desa</p>
            <p className="text-[10px] leading-tight text-stone-500">DPMD Kabupaten Bogor</p>
          </div>
          <img src="/logo-bogor.png" alt="Logo Kabupaten Bogor" className="h-9" />
        </div>
      </div>
    </nav>

    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-[1280px] items-start gap-3.5 px-4 py-6 sm:px-6">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
          <ShoppingBag className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Produk &amp; Wisata BUM Desa Kabupaten Bogor
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
            Etalase produk Badan Usaha Milik Desa se-Kabupaten Bogor. Tidak ada transaksi di
            halaman ini — tombol Pesan membuka WhatsApp langsung ke BUM Desa penjualnya.
          </p>
        </div>
      </div>
    </header>

    <main className="px-3 py-4 sm:px-6">
      <Suspense
        fallback={
          <div className="mx-auto flex max-w-[1280px] items-center justify-center gap-3 py-24 text-sm text-stone-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-emerald-700" />
            Memuat katalog…
          </div>
        }
      >
        <KatalogProdukBumdesPage publik />
      </Suspense>
    </main>

    <Footer />
  </div>
);

export default PasarBumdesPublicPage;
