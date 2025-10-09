import React, { useState } from "react";
import {
	LuHouse,
	LuPlus,
	LuSave,
	LuX,
	LuUserCheck,
	LuUserX,
} from "react-icons/lu";
import { showWarningAlert } from "../../utils/sweetAlert";
import RTItemContent from "./RTItemContent";

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

					{rwId && (
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

				{/* Add RT Form */}
				{isAddingRT && (
					<div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
						<div className="flex items-center space-x-3 mb-3">
							<div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
								<LuPlus className="w-4 h-4" />
							</div>
							<h4 className="font-semibold text-gray-800">Tambah RT Baru</h4>
						</div>

						<div className="flex items-center gap-3">
							<div className="flex-1">
								<input
									type="text"
									placeholder="Nomor RT (contoh: 001)"
									value={nomorRT}
									onChange={(e) => setNomorRT(e.target.value)}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
									disabled={isLoading}
								/>
							</div>
							<button
								onClick={handleAddRT}
								disabled={isLoading || !nomorRT.trim()}
								className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
							>
								<LuSave className="w-4 h-4" />
								<span>{isLoading ? "..." : "Simpan"}</span>
							</button>
							<button
								onClick={() => {
									setIsAddingRT(false);
									setNomorRT("");
								}}
								className="flex items-center space-x-2 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
							>
								<LuX className="w-4 h-4" />
								<span>Batal</span>
							</button>
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

						{rwId && (
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
