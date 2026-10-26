// src/pages/core-dashboard/KerjasamaDesaPage.jsx
//
// Kerja Sama Desa di Core Dashboard — hanya membaca.
//
// Isinya komponen yang SAMA dengan tab Kerja Sama Desa di Bidang SPKED dan
// portal Tenaga Ahli, bukan salinan: ketiganya membaca /api/dpmd/kerjasama-desa
// yang memang hanya menyediakan GET. Yang ditambahkan di sini hanya bingkai
// halaman Core Dashboard.
import React, { lazy, Suspense } from 'react';
import { Handshake, Loader2 } from 'lucide-react';
import PageHeader from '../../components/statistik/PageHeader';
import { LEBAR_CORE } from './lebarHalaman';

const KerjasamaMonitoringPage = lazy(
	() => import('../bidang/spked/kerjasama/KerjasamaMonitoringPage'),
);

const KerjasamaDesaPage = () => (
	<div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
		<div className={`mx-auto space-y-5 ${LEBAR_CORE}`}>
			<PageHeader
				icon={Handshake}
				title="Kerja Sama Desa"
				subtitle="Kerja sama antardesa (KAD) dan kerja sama desa dengan pihak ketiga (KDPK) se-Kabupaten Bogor, beserta cakupan Perdes payungnya. Data diisi desa, dipantau Bidang SPKED."
			/>

			<Suspense
				fallback={
					<div className="flex items-center justify-center gap-2 py-24 text-slate-500">
						<Loader2 className="h-5 w-5 animate-spin" />
						<span className="text-sm font-medium">Memuat kerja sama desa…</span>
					</div>
				}
			>
				<KerjasamaMonitoringPage rapat />
			</Suspense>
		</div>
	</div>
);

export default KerjasamaDesaPage;
