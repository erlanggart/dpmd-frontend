import { useNavigate } from "react-router-dom";
import { LuTriangleAlert, LuHouse, LuArrowLeft } from "react-icons/lu";

export default function NotFound() {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
			<div className="max-w-2xl w-full">
				{/* Error Card */}
				<div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
					{/* Icon */}
					<div className="mb-8 flex justify-center">
						<div className="relative">
							{/* Animated circles */}
							<div className="absolute inset-0 animate-ping">
								<div className="w-32 h-32 rounded-full bg-blue-200 opacity-20"></div>
							</div>
							<div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-8 shadow-lg">
								<LuTriangleAlert className="w-16 h-16 text-white" />
							</div>
						</div>
					</div>

					{/* Error Code */}
					<div className="mb-6">
						<h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
							404
						</h1>
						<div className="h-1 w-24 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto rounded-full"></div>
					</div>

					{/* Title & Description */}
					<h2 className="text-3xl font-bold text-gray-800 mb-4">
						Halaman Tidak Ditemukan
					</h2>
					<p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
						Maaf, halaman yang Anda cari tidak dapat ditemukan. Halaman mungkin
						telah dipindahkan atau tidak pernah ada.
					</p>

					{/* Suggestions */}
					<div className="bg-blue-50 rounded-2xl p-6 mb-8 text-left">
						<h3 className="font-semibold text-gray-800 mb-3 flex items-center">
							<span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
							Kemungkinan penyebab:
						</h3>
						<ul className="space-y-2 text-gray-600 text-sm">
							<li className="flex items-start">
								<span className="text-blue-600 mr-2">•</span>
								<span>URL yang Anda masukkan salah atau tidak lengkap</span>
							</li>
							<li className="flex items-start">
								<span className="text-blue-600 mr-2">•</span>
								<span>Link yang Anda klik sudah kadaluarsa atau rusak</span>
							</li>
							<li className="flex items-start">
								<span className="text-blue-600 mr-2">•</span>
								<span>Halaman telah dipindahkan atau dihapus</span>
							</li>
						</ul>
					</div>

					{/* Action Buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<button
							onClick={() => navigate(-1)}
							className="group px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm hover:shadow"
						>
							<LuArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
							<span>Kembali</span>
						</button>
						<button
							onClick={() => navigate("/")}
							className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
						>
							<LuHouse className="w-5 h-5" />
							<span>Ke Halaman Utama</span>
						</button>
					</div>
				</div>

				{/* Footer */}
				<div className="text-center mt-8 text-gray-500 text-sm">
					<p>
						Butuh bantuan?{" "}
						<a
							href="mailto:support@dpmd.com"
							className="text-blue-600 hover:text-blue-700 underline"
						>
							Hubungi Support
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
