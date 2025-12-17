import { useNavigate } from "react-router-dom";
import { LuShieldX, LuHouse, LuArrowLeft, LuLock } from "react-icons/lu";

export default function Forbidden() {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50 to-orange-50 flex items-center justify-center p-4">
			<div className="max-w-2xl w-full">
				{/* Error Card */}
				<div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
					{/* Icon */}
					<div className="mb-8 flex justify-center">
						<div className="relative">
							{/* Animated circles */}
							<div className="absolute inset-0 animate-ping">
								<div className="w-32 h-32 rounded-full bg-red-200 opacity-20"></div>
							</div>
							<div className="relative bg-gradient-to-br from-red-500 to-orange-600 rounded-full p-8 shadow-lg">
								<LuShieldX className="w-16 h-16 text-white" />
							</div>
						</div>
					</div>

					{/* Error Code */}
					<div className="mb-6">
						<h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 mb-2">
							403
						</h1>
						<div className="h-1 w-24 bg-gradient-to-r from-red-600 to-orange-600 mx-auto rounded-full"></div>
					</div>

					{/* Title & Description */}
					<h2 className="text-3xl font-bold text-gray-800 mb-4">
						Akses Ditolak
					</h2>
					<p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
						Maaf, Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi
						administrator jika Anda merasa ini adalah kesalahan.
					</p>

					
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
							className="group px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
						>
							<LuHouse className="w-5 h-5" />
							<span>Ke Halaman Utama</span>
						</button>
					</div>

					{/* Logout Option */}
					<div className="mt-6 pt-6 border-t border-gray-200">
						<p className="text-gray-600 text-sm mb-3">
							Mencoba login dengan akun lain?
						</p>
						<button
							onClick={() => {
								localStorage.clear();
								navigate("/login");
							}}
							className="text-red-600 hover:text-red-700 font-medium text-sm underline"
						>
							Logout dan Login Ulang
						</button>
					</div>
				</div>

				{/* Footer */}
				<div className="text-center mt-8 text-gray-500 text-sm">
					<p>
						Butuh bantuan?{" "}
						<a
							href="mailto:admin@dpmd.com"
							className="text-red-600 hover:text-red-700 underline"
						>
							Hubungi Administrator
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
