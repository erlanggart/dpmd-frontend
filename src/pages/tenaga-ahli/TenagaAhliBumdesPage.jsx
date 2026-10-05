// src/pages/tenaga-ahli/TenagaAhliBumdesPage.jsx
//
// Halaman BUM Desa untuk akun Tenaga Ahli.
//
// Isinya BUKAN salinan: komponen StatistikBumdes yang sama dipakai Core Dashboard
// dan tab BUMDes di Bidang SPKED. Itu syarat yang diminta — yang dilihat Tenaga
// Ahli harus persis yang dilihat bidang, sampai ke sebaran dan grafiknya. Menyalin
// perhitungannya ke halaman tersendiri berarti membuat sumber kedua yang pasti
// akan menyimpang pada perubahan berikutnya.
//
// `tersemat` melepas bingkai halaman penuh dan kepala halaman bawaan komponen
// itu, karena kepala halamannya ditulis di sini supaya seragam dengan Ikhtisar.
//
// KENAPA LIHAT-SAJA. `bisaKelola` dibiarkan pada bawaannya (false), bukan diberi
// `bisaKelola={false}` yang eksplisit — keduanya sama hasilnya, tapi yang penting
// adalah TIDAK ADA jalan untuk menyalakannya dari sini. Tanpa prop itu komponennya
// tidak merender tombol Tambah, tidak merender Kelola Dokumen, dan tidak meneruskan
// `onUbah` ke direktori maupun panel kesiapan, sehingga barisnya tidak bisa
// diklik untuk disunting. Ekspor Excel/PDF tetap ada: ia ada di dalam direktori
// dan tidak mengubah apa pun.
import React, { lazy, Suspense } from 'react';
import { LuLoader } from 'react-icons/lu';

const StatistikBumdes = lazy(() => import('../kepala-dinas/StatistikBumdes'));

const KICKER = 'text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400';

const TenagaAhliBumdesPage = () => (
	<div className="mx-auto w-full max-w-[1800px]">
		<header className="mb-5">
			<p className={KICKER}>Tenaga Ahli · Lihat &amp; Ekspor</p>
			<h1 className="mt-1 text-[22px] font-bold tracking-tight text-slate-900">BUM Desa</h1>
			<p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
				Badan Usaha Milik Desa se-Kabupaten Bogor. Saring lalu unduh hasilnya sebagai Excel atau PDF
				dari panel Direktori di bagian bawah halaman.
			</p>
		</header>

		<Suspense
			fallback={
				<div className="flex items-center justify-center gap-2 py-24 text-slate-500">
					<LuLoader className="h-5 w-5 animate-spin" />
					<span className="text-sm font-medium">Memuat data BUM Desa…</span>
				</div>
			}
		>
			<StatistikBumdes tersemat />
		</Suspense>
	</div>
);

export default TenagaAhliBumdesPage;
