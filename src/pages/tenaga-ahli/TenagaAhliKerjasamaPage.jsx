// src/pages/tenaga-ahli/TenagaAhliKerjasamaPage.jsx
//
// Halaman Kerja Sama Desa untuk akun Tenaga Ahli.
//
// Komponen yang sama dipakai tab Kerja Sama Desa di Bidang SPKED, bukan salinan.
// Halaman itu memang sudah hanya memantau — rutenya pun hanya menyediakan GET
// (lihat kepala dpmdKerjasamaDesa.routes.js) — jadi tidak ada apa pun yang perlu
// dilucuti untuk akun ini, dan tidak ada prop "mode lihat" yang bisa kedaluwarsa.
import React, { lazy, Suspense } from 'react';
import { LuLoader } from 'react-icons/lu';

const KerjasamaMonitoringPage = lazy(
	() => import('../bidang/spked/kerjasama/KerjasamaMonitoringPage'),
);

const KICKER = 'text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400';

const TenagaAhliKerjasamaPage = () => (
	<div className="mx-auto w-full max-w-[1800px]">
		<header className="mb-5">
			<p className={KICKER}>Tenaga Ahli · Lihat &amp; Ekspor</p>
			<h1 className="mt-1 text-[22px] font-bold tracking-tight text-slate-900">Kerja Sama Desa</h1>
			<p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
				Pemantauan kerja sama desa se-Kabupaten Bogor. Tombol Excel dan PDF di panel Tabel Monitoring
				mengunduh seluruh hasil penyaringan, bukan hanya halaman yang sedang tampak.
			</p>
		</header>

		<Suspense
			fallback={
				<div className="flex items-center justify-center gap-2 py-24 text-slate-500">
					<LuLoader className="h-5 w-5 animate-spin" />
					<span className="text-sm font-medium">Memuat monitoring kerja sama desa…</span>
				</div>
			}
		>
			<KerjasamaMonitoringPage />
		</Suspense>
	</div>
);

export default TenagaAhliKerjasamaPage;
