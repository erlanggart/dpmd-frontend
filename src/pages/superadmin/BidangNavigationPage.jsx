// src/pages/superadmin/BidangNavigationPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
	FiLayers, FiTool, FiDollarSign, FiUsers, FiMapPin,
	FiArrowRight, FiGrid
} from 'react-icons/fi';

const BidangNavigationPage = () => {
	const navigate = useNavigate();

	const bidangList = [
		{
			id: 2,
			name: 'Sekretariat',
			slug: 'sekretariat',
			description: 'Administrasi, Disposisi Surat, Perjalanan Dinas, dan Manajemen Pegawai',
			icon: FiLayers,
			color: 'from-gray-600 to-slate-700',
			bgLight: 'bg-gray-50',
			borderColor: 'border-gray-200',
			hoverColor: 'hover:border-gray-400',
		},
		{
			id: 3,
			name: 'SPKED',
			slug: 'spked',
			description: 'Sarana Prasarana Kewilayahan dan Ekonomi Desa (BUMDes)',
			icon: FiTool,
			color: 'from-blue-600 to-cyan-700',
			bgLight: 'bg-blue-50',
			borderColor: 'border-blue-200',
			hoverColor: 'hover:border-blue-400',
		},
		{
			id: 4,
			name: 'KKD',
			slug: 'kkd',
			description: 'Kekayaan dan Keuangan Desa (Dana Desa, BHPRD, Bankeu)',
			icon: FiDollarSign,
			color: 'from-green-600 to-emerald-700',
			bgLight: 'bg-green-50',
			borderColor: 'border-green-200',
			hoverColor: 'hover:border-green-400',
		},
		{
			id: 5,
			name: 'PMD',
			slug: 'pmd',
			description: 'Pemberdayaan Masyarakat Desa dan Kelembagaan',
			icon: FiUsers,
			color: 'from-purple-600 to-violet-700',
			bgLight: 'bg-purple-50',
			borderColor: 'border-purple-200',
			hoverColor: 'hover:border-purple-400',
		},
		{
			id: 6,
			name: 'Pemdes',
			slug: 'pemdes',
			description: 'Pemerintahan Desa',
			icon: FiMapPin,
			color: 'from-orange-600 to-red-700',
			bgLight: 'bg-orange-50',
			borderColor: 'border-orange-200',
			hoverColor: 'hover:border-orange-400',
		}
	];

	const handleNavigate = (slug) => {
		navigate(`/superadmin/bidang/${slug}`);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
			{/* Header */}
			<header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
				<div className="px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="relative">
								<div className="absolute inset-0 bg-red-500 blur-md opacity-20 rounded-xl"></div>
								<div className="relative h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-sm border border-red-400">
									<FiGrid className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
								</div>
							</div>
							<div>
								<h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
									Bidang & Program
								</h1>
								<p className="text-xs sm:text-sm font-medium text-gray-500">DPMD Kabupaten Bogor</p>
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<div className="px-4 sm:px-6 lg:px-8 py-12">
				{/* Bidang Cards Grid — 5 sejajar */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
					{bidangList.map((bidang) => {
						const Icon = bidang.icon;
						return (
							<div
								key={bidang.id}
								className={`group relative bg-white rounded-2xl border ${bidang.borderColor} ${bidang.hoverColor} shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 cursor-pointer`}
								onClick={() => handleNavigate(bidang.slug)}
							>
								{/* Top accent bar */}
								<div className={`h-1.5 w-full bg-gradient-to-r ${bidang.color}`}></div>
								{/* Decorative glow */}
								<div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${bidang.color} opacity-5 rounded-full blur-2xl group-hover:opacity-15 transition-opacity`}></div>

								<div className="relative p-6 flex flex-col h-full">
									{/* Icon */}
									<div className={`inline-flex h-14 w-14 bg-gradient-to-br ${bidang.color} rounded-2xl items-center justify-center mb-5 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
										<Icon className="h-7 w-7 text-white" />
									</div>

									{/* Title & Description */}
									<h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-red-600 transition-colors">
										{bidang.name}
									</h3>
									<p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">
										{bidang.description}
									</p>

									{/* Action */}
									<div className="flex items-center gap-2 text-sm font-semibold text-gray-700 group-hover:text-red-600 transition-colors">
										<span>Akses Bidang</span>
										<FiArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Bottom Info */}
				<div className="mt-12 text-center">
					<div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 rounded-full text-gray-600">
						<FiLayers className="h-5 w-5" />
						<span className="font-medium">Total 5 Bidang Aktif</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default BidangNavigationPage;
