// src/pages/superadmin/BidangNavigationPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
	FiLayers, FiTool, FiDollarSign, FiUsers, FiMapPin, 
	FiArrowRight, FiGrid, FiActivity, FiCheckCircle 
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
			features: ['Disposisi Surat', 'Perjalanan Dinas', 'Manajemen Pegawai', 'Activity Logs']
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
			features: ['BUMDes Management', 'Sarana Prasarana', 'Ekonomi Desa', 'Kewilayahan']
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
			features: ['Dana Desa', 'BHPRD', 'Bantuan Keuangan', 'Insentif DD']
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
			features: ['Kelembagaan Desa', 'Pemberdayaan Masyarakat', 'Program PMD', 'Monitoring']
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
			features: ['Administrasi Desa', 'Pemerintahan', 'Program Pemdes', 'Data Desa']
		}
	];

	const handleNavigate = (slug) => {
		navigate(`/bidang/${slug}`);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
			{/* Header */}
			<div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white shadow-2xl">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
					<div className="text-center">
						<div className="inline-flex h-20 w-20 bg-white/20 backdrop-blur-md rounded-2xl items-center justify-center mb-6 shadow-lg">
							<FiGrid className="h-10 w-10 text-white" />
						</div>
						<h1 className="text-4xl font-bold mb-3">Bidang & Program</h1>
						<p className="text-red-100 text-lg max-w-3xl mx-auto">
							Kelola semua bidang di DPMD Kabupaten Bogor. Pilih bidang untuk mengakses fitur dan program yang tersedia.
						</p>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				{/* Info Banner */}
				<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-10 border border-blue-100 shadow-lg">
					<div className="flex items-start gap-4">
						<div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
							<FiActivity className="h-6 w-6 text-blue-600" />
						</div>
						<div>
							<h3 className="text-lg font-bold text-gray-800 mb-2">Akses Penuh Superadmin</h3>
							<p className="text-gray-600 leading-relaxed">
								Sebagai superadmin, Anda memiliki akses penuh ke <strong>semua bidang</strong> dan dapat melihat serta mengelola 
								semua data, program, dan aktivitas di setiap bidang tanpa batasan.
							</p>
						</div>
					</div>
				</div>

				{/* Bidang Cards Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
					{bidangList.map((bidang) => {
						const Icon = bidang.icon;
						return (
							<div
								key={bidang.id}
								className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 ${bidang.borderColor} ${bidang.hoverColor} transition-all duration-300 overflow-hidden hover:-translate-y-1 cursor-pointer`}
								onClick={() => handleNavigate(bidang.slug)}
							>
								{/* Decorative Background */}
								<div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bidang.color} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`}></div>
								
								<div className="relative p-8">
									{/* Icon */}
									<div className={`inline-flex h-16 w-16 bg-gradient-to-br ${bidang.color} rounded-2xl items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
										<Icon className="h-8 w-8 text-white" />
									</div>

									{/* Title & Description */}
									<h3 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-red-600 transition-colors">
										{bidang.name}
									</h3>
									<p className="text-gray-600 leading-relaxed mb-6 min-h-[60px]">
										{bidang.description}
									</p>

									{/* Features List */}
									<div className="space-y-2 mb-6">
										{bidang.features.map((feature, idx) => (
											<div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
												<FiCheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
												<span>{feature}</span>
											</div>
										))}
									</div>

									{/* Action Button */}
									<button
										onClick={() => handleNavigate(bidang.slug)}
										className={`w-full bg-gradient-to-r ${bidang.color} text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group-hover:gap-4`}
									>
										<span>Akses Bidang</span>
										<FiArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
									</button>
								</div>

								{/* Hover Effect Border */}
								<div className="absolute inset-0 border-2 border-transparent group-hover:border-red-200 rounded-2xl transition-colors pointer-events-none"></div>
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
