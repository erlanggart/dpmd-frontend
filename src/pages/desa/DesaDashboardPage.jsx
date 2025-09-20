// src/pages/desa/DesaDashboardPage.jsx
import React from "react";
import { Link } from "react-router-dom";
// Anda bisa mengimpor komponen-komponen modul di sini
// import AparaturDesaWidget from '../../components/widgets/AparaturDesaWidget';
// import KeuanganWidget from '../../components/widgets/KeuanganWidget';

const DesaDashboardPage = () => {
	return (
		<div className="space-y-8">
			<div>
				<h2 className="text-2xl font-bold text-gray-800 mb-4">
					Pemerintahan Desa
				</h2>
				<div className="p-6 bg-white rounded-lg shadow">
					<p>Ringkasan data aparatur desa Anda akan tampil di sini.</p>
					{/* <AparaturDesaWidget /> */}
					<Link
						to="/desa/aparatur"
						className="text-primary hover:underline mt-4 inline-block"
					>
						Kelola Aparatur Desa →
					</Link>
				</div>
			</div>

			<div>
				<h2 className="text-2xl font-bold text-gray-800 mb-4">
					Keuangan & Kekayaan Desa
				</h2>
				<div className="p-6 bg-white rounded-lg shadow">
					<p>Ringkasan data keuangan Anda akan tampil di sini.</p>
					{/* <KeuanganWidget /> */}
					<Link
						to="/desa/keuangan"
						className="text-primary hover:underline mt-4 inline-block"
					>
						Kelola Keuangan Desa →
					</Link>
				</div>
			</div>

			{/* Tambahkan blok untuk modul Sarpras dan PMD di sini */}
		</div>
	);
};

export default DesaDashboardPage;
