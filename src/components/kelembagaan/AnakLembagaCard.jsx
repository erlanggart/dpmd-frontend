import React, { useState } from "react";
import {
	LuHouse,
	LuPlus,
	LuSave,
	LuX,
	LuUserCheck,
	LuUserX,
	LuFileText,
	LuInfo,
	LuUsers,
	LuCheck,
} from "react-icons/lu";
import { showWarningAlert } from "../../utils/sweetAlert";
import RTItemContent from "./RTItemContent";
import { useAuth } from "../../context/AuthContext";
import { useEditMode } from "../../context/EditModeContext";

const AnakLembagaCard = ({
	list = [],
	label = "Daftar Anak Lembaga",
	onClickItem,
	onAddRT,
	rwId,
}) => {
	const [isAddingRT, setIsAddingRT] = useState(false);
	const [nomorRT, setNomorRT] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const { user } = useAuth();
	const { isEditMode } = useEditMode();

	// Check user role
	const isSuperAdmin = user?.role === "superadmin";
	const isAdminBidang = user?.role === "pemberdayaan_masyarakat" || user?.role === "pmd";
	const isUserDesa = user?.role === "desa";

	// Determine if add button should show
	const showAddButton = (isSuperAdmin || isAdminBidang) || (isUserDesa && isEditMode);

	const handleAddRT = async () => {
		if (!nomorRT.trim()) {
			showWarningAlert("Perhatian!", "Nomor RT harus diisi");
			return;
		}

		setIsLoading(true);
		try {
			await onAddRT(nomorRT.trim());
			setNomorRT("");
			setIsAddingRT(false);
		} catch (error) {
			console.error("Error adding RT:", error);
			// Error sudah ditangani di handleAddRT parent function
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
			{/* Header dengan gradient accent */}
			<div className="h-1.5 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-t-2xl"></div>

			<div className="p-6">
				{/* Enhanced Header Section */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center space-x-4">
						{/* Animated icon dengan pulse effect */}
						<div className="relative">
							<div className="w-14 h-14 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
								<LuHouse className="w-7 h-7" />
							</div>
							{/* Pulse animation ring */}
							<div className="absolute inset-0 rounded-2xl bg-emerald-400 opacity-25 animate-pulse"></div>
						</div>
						<div>
							<h3 className="text-2xl font-bold text-gray-800 mb-1">{label}</h3>
							<div className="flex items-center space-x-2 text-sm">
								<span className="text-gray-500">Total:</span>
								<span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-semibold">
									{list.length} {list.length === 1 ? "RT" : "RT"}
								</span>
							</div>
						</div>
					</div>

					{rwId && showAddButton && (
						<div className="flex items-center space-x-3">
							<button
								onClick={() => setIsAddingRT(true)}
								className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
							>
								<LuPlus className="w-5 h-5" />
								<span className="font-semibold">Tambah RT</span>
							</button>
						</div>
					)}
				</div>

				{/* Add RT Modal */}
				{isAddingRT && (
					<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
						<div 
							className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-auto transform transition-all max-h-[90vh] overflow-y-auto"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Modal Header */}
							<div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 p-6 rounded-t-2xl">
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-3">
										<div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
											<LuPlus className="w-6 h-6 text-white" />
										</div>
										<h3 className="text-xl font-bold text-white">Pembentukan RT Baru</h3>
									</div>
									<button
										onClick={() => {
											setIsAddingRT(false);
											setNomorRT("");
										}}
										className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
									>
										<LuX className="w-6 h-6" />
									</button>
								</div>
							</div>

							{/* Informasi Pembentukan RT */}
							<div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100">
								<div className="flex items-start space-x-3 mb-4">
									<div className="p-2 bg-blue-500 rounded-lg flex-shrink-0">
										<LuFileText className="w-5 h-5 text-white" />
									</div>
									<div className="flex-1">
										<h4 className="font-semibold text-blue-900 mb-2">
											Tata Cara Pembentukan Rukun Tetangga
										</h4>
									</div>
								</div>
								
								{/* Tata Cara Pembentukan */}
								<div className="space-y-3 mb-4">
									<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
										<div className="flex items-start space-x-3">
											<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
												1
											</div>
											<p className="text-sm text-gray-700 leading-relaxed">
												Pembentukan RT dapat berasal <strong>pembentukan RT baru</strong>, <strong>pemekaran</strong> dari 1 (satu) RT menjadi 2 (dua) RT atau lebih dan <strong>penggabungan</strong> dari beberapa RT atau bagian RT yang bersandingan.
											</p>
										</div>
									</div>
									
									<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
										<div className="flex items-start space-x-3">
											<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
												2
											</div>
											<p className="text-sm text-gray-700 leading-relaxed">
												Pembentukan RT dapat berasal dari <strong>prakarsa masyarakat</strong> setelah mendapatkan pertimbangan dari Kepala Desa/Lurah.
											</p>
										</div>
									</div>
									
									<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
										<div className="flex items-start space-x-3">
											<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
												3
											</div>
											<p className="text-sm text-gray-700 leading-relaxed">
												Setiap RT paling sedikit terdiri dari <strong>50 KK untuk desa</strong> dan <strong>75 KK untuk kelurahan</strong>.
											</p>
										</div>
									</div>
									
									<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
										<div className="flex items-start space-x-3">
											<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
												4
											</div>
											<p className="text-sm text-gray-700 leading-relaxed">
												Pembentukan RT dapat dilaksanakan apabila dihadiri oleh paling sedikit <strong>2/3 (dua per tiga)</strong> dari jumlah Kepala Keluarga.
											</p>
										</div>
									</div>
									
									<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
										<div className="flex items-start space-x-3">
											<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
												5
											</div>
											<p className="text-sm text-gray-700 leading-relaxed">
												Pembentukan RT dinyatakan sah apabila disetujui sekurang-kurangnya <strong>1/2 (satu per dua) ditambah 1 (satu)</strong> dari jumlah yang hadir dalam musyawarah tersebut.
											</p>
										</div>
									</div>
								</div>
								
								{/* Prosedur Pembentukan */}
								<div className="mt-5 pt-4 border-t border-blue-200">
									<h5 className="font-semibold text-blue-900 mb-3 flex items-center">
										<LuUsers className="w-5 h-5 mr-2" />
										Prosedur Pembentukan
									</h5>
									<div className="space-y-3">
										<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
											<div className="flex items-start space-x-3">
												<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
													1
												</div>
												<p className="text-sm text-gray-700 leading-relaxed">
													Pembentukan RT dilakukan melalui <strong>musyawarah</strong> oleh para Kepala Keluarga atau yang mewakili, pengurus RT dan tokoh masyarakat serta dihadiri oleh <strong>Ketua RW setempat</strong>.
												</p>
											</div>
										</div>
										
										<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
											<div className="flex items-start space-x-3">
												<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
													2
												</div>
												<p className="text-sm text-gray-700 leading-relaxed">
													Hasil musyawarah dituangkan dalam <strong>berita acara</strong> dan disampaikan kepada Kepala Desa/Lurah untuk mendapat penetapan.
												</p>
											</div>
										</div>
										
										<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
											<div className="flex items-start space-x-3">
												<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
													3
												</div>
												<p className="text-sm text-gray-700 leading-relaxed">
													Pembentukan RT di Desa ditetapkan dengan <strong>Peraturan Desa</strong>.
												</p>
											</div>
										</div>
										<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
											<div className="flex items-start space-x-3">
												<div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
													4
												</div>
												<p className="text-sm text-gray-700 leading-relaxed">
													Pembentukan RT di Kelurahan ditetapkan dengan <strong>Keputusan Camat</strong>.
												</p>
											</div>
										</div>
									</div>
								</div>
								
								<div className="mt-4 flex items-start space-x-2 bg-blue-100 rounded-lg p-3">
								<LuInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
								<div>

								<p className="text-md font-semibold">
									Sesuai Dengan Peraturan Bupati Bogor Nomor 31 Tahun 2012
								</p>
								<p className="text-xs text-blue-800">
									Tentang Tata Cara Pembentukan, Pengangkatan, dan Pemberhentian Pengurus Lembaga Pemberdayaan Masyarakat Desa/Kelurahan (LPMD/LPMK), Rukun Warga (RW), dan Rukun Tetangga (RT)
								</p>
								</div>
							</div>
							</div>

							{/* Modal Body */}
							<div className="p-6 space-y-5">
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">
										Nomor RT <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										placeholder="Contoh: 001, 002, 003"
										value={nomorRT}
										onChange={(e) => setNomorRT(e.target.value)}
										onKeyPress={(e) => {
											if (e.key === 'Enter' && nomorRT.trim() && !isLoading) {
												handleAddRT();
											}
										}}
										className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
										disabled={isLoading}
										autoFocus
									/>
									<p className="mt-2 text-xs text-gray-500">
										Masukkan nomor RT dengan format yang konsisten
									</p>
								</div>
							</div>

							{/* Modal Footer */}
							<div className="px-6 pb-6 flex items-center gap-3">
								<button
									onClick={() => {
										setIsAddingRT(false);
										setNomorRT("");
									}}
									className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors duration-200"
									disabled={isLoading}
								>
									Batal
								</button>
								<button
									onClick={handleAddRT}
									disabled={isLoading || !nomorRT.trim()}
									className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
								>
									<LuSave className="w-5 h-5" />
									<span>{isLoading ? "Menyimpan..." : "Simpan"}</span>
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Enhanced Content */}
				{list.length === 0 ? (
					<div className="text-center py-16">
						{/* Animated empty state */}
						<div className="relative mx-auto mb-6 w-32 h-32">
							{/* Background circles for depth */}
							<div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full opacity-50"></div>
							<div className="absolute inset-2 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full opacity-30"></div>
							<div className="absolute inset-4 bg-gradient-to-br from-emerald-100 to-green-200 rounded-full flex items-center justify-center">
								<LuHouse className="w-12 h-12 text-gray-400" />
							</div>
							{/* Floating dots animation */}
							<div className="absolute top-0 right-0 w-3 h-3 bg-blue-300 rounded-full animate-bounce"></div>
							<div
								className="absolute bottom-0 left-0 w-2 h-2 bg-green-300 rounded-full animate-bounce"
								style={{ animationDelay: "0.5s" }}
							></div>
						</div>

						<h4 className="text-xl font-bold text-gray-700 mb-3">
							{rwId ? "Belum ada RT" : "Belum ada anak lembaga"}
						</h4>
						<p className="text-gray-500 mb-6 max-w-md mx-auto">
							{rwId
								? "Mulai dengan menambahkan RT pertama untuk RW ini. Setiap RT akan memiliki struktur pengurus sendiri."
								: "Tidak ada data anak lembaga yang tersedia saat ini."}
						</p>

						{rwId && showAddButton && (
							<button
								onClick={() => setIsAddingRT(true)}
								className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
							>
								<LuPlus className="w-5 h-5" />
								<span className="font-semibold">Tambah RT Pertama</span>
							</button>
						)}
					</div>
				) : (
					<div className="space-y-4">
						{/* Enhanced RT List */}
						<div className="grid gap-4">
							{list.map((it, index) => (
								<div
									key={it.id}
									className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
									style={{
										animationDelay: `${index * 100}ms`,
									}}
								>
									{/* Gradient border effect on hover */}
									<div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"></div>

									{onClickItem ? (
										<button
											onClick={() => onClickItem(it)}
											className="w-full p-5 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-2xl"
										>
											<RTItemContent item={it} />
										</button>
									) : (
										<div className="p-5">
											<RTItemContent item={it} />
										</div>
									)}

									{/* Bottom border accent */}
									<div
										className={`h-1 bg-gradient-to-r ${
											it.ketua_nama
												? "from-green-400 to-emerald-500"
												: "from-yellow-400 to-amber-500"
										} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
									></div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default AnakLembagaCard;
