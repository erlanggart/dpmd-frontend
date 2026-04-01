import React, { useState, useEffect } from "react";
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
	LuChevronDown,
	LuChevronUp,
	LuSearch,
	LuLock,
	LuMapPin,
} from "react-icons/lu";
import { showWarningAlert } from "../../utils/sweetAlert";
import { getProdukHukums } from "../../services/api";
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
	const [alamatRT, setAlamatRT] = useState("");
	const [produkHukumId, setProdukHukumId] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showKetentuan, setShowKetentuan] = useState(false);
	const [produkHukumOptions, setProdukHukumOptions] = useState([]);
	const [loadingPh, setLoadingPh] = useState(false);
	const [phSearchTerm, setPhSearchTerm] = useState("");
	const [showPhDropdown, setShowPhDropdown] = useState(false);
	const { isSuperAdmin, isAdminBidangPMD, isUserDesa } = useAuth();
	const { isEditMode } = useEditMode();

	// Fetch produk hukum when modal opens
	useEffect(() => {
		if (!isAddingRT) return;
		let mounted = true;
		const fetchPh = async () => {
			setLoadingPh(true);
			try {
				const res = await getProdukHukums({
					all: true,
					jenis: "Peraturan Desa,Peraturan Kepala Desa",
					status_peraturan: "berlaku",
				});
				if (mounted) setProdukHukumOptions(res?.data?.data || []);
			} catch (err) {
				console.error("Error fetching produk hukum:", err);
			} finally {
				if (mounted) setLoadingPh(false);
			}
		};
		fetchPh();
		return () => { mounted = false; };
	}, [isAddingRT]);

	// Determine if add button should show
	// For admin (superadmin/admin bidang): always show
	// For desa: only show if edit mode is ON
	const showAddButton =
		isSuperAdmin() || isAdminBidangPMD() || (isUserDesa() && isEditMode);

	const handleAddRT = async () => {
		if (!produkHukumId) {
			showWarningAlert("Perhatian!", "Produk Hukum Lembaga wajib dipilih");
			return;
		}
		if (!nomorRT.trim()) {
			showWarningAlert("Perhatian!", "Nomor RT harus diisi");
			return;
		}
		if (!/^\d{3}$/.test(nomorRT.trim())) {
			showWarningAlert("Perhatian!", "Nomor RT harus 3 digit angka (contoh: 001)");
			return;
		}

		setIsLoading(true);
		try {
			await onAddRT({
				nomor: nomorRT.trim(),
				alamat: alamatRT.trim().toUpperCase(),
				produk_hukum_id: produkHukumId,
			});
			setNomorRT("");
			setAlamatRT("");
			setProdukHukumId("");
			setPhSearchTerm("");
			setShowPhDropdown(false);
			setShowKetentuan(false);
			setIsAddingRT(false);
		} catch (error) {
			console.error("Error adding RT:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const resetModal = () => {
		setIsAddingRT(false);
		setNomorRT("");
		setAlamatRT("");
		setProdukHukumId("");
		setPhSearchTerm("");
		setShowPhDropdown(false);
		setShowKetentuan(false);
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
										<h3 className="text-xl font-bold text-white">
											Pembentukan RT Baru
										</h3>
									</div>
									<button
										onClick={resetModal}
										className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
									>
										<LuX className="w-6 h-6" />
									</button>
								</div>
							</div>

							{/* Collapsible Ketentuan */}
							<div className="border-b border-blue-100">
								<button
									type="button"
									className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
									onClick={() => setShowKetentuan((v) => !v)}
								>
									<div className="flex items-center space-x-3">
										<div className="p-1.5 bg-blue-500 rounded-lg flex-shrink-0">
											<LuFileText className="w-4 h-4 text-white" />
										</div>
										<div className="text-left">
											<h4 className="font-semibold text-blue-900 text-sm">
												Tata Cara Pembentukan Rukun Tetangga
											</h4>
											<p className="text-xs text-blue-600">Perbup Bogor No. 31 Tahun 2012</p>
										</div>
									</div>
									{showKetentuan ? (
										<LuChevronUp className="w-5 h-5 text-blue-500" />
									) : (
										<LuChevronDown className="w-5 h-5 text-blue-500" />
									)}
								</button>

								{showKetentuan && (
									<div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 space-y-4">
										{/* Tata Cara Pembentukan */}
										<div className="space-y-2">
											{[
												<>Pembentukan RT dapat berasal <strong>pembentukan RT baru</strong>, <strong>pemekaran</strong> dari 1 (satu) RT menjadi 2 (dua) RT atau lebih dan <strong>penggabungan</strong> dari beberapa RT atau bagian RT yang bersandingan.</>,
												<>Pembentukan RT dapat berasal dari <strong>prakarsa masyarakat</strong> setelah mendapatkan pertimbangan dari Kepala Desa/Lurah.</>,
												<>Setiap RT paling sedikit terdiri dari <strong>50 KK untuk desa</strong> dan <strong>75 KK untuk kelurahan</strong>.</>,
												<>Pembentukan RT dapat dilaksanakan apabila dihadiri oleh paling sedikit <strong>2/3 (dua per tiga)</strong> dari jumlah Kepala Keluarga.</>,
												<>Pembentukan RT dinyatakan sah apabila disetujui sekurang-kurangnya <strong>1/2 (satu per dua) ditambah 1 (satu)</strong> dari jumlah yang hadir dalam musyawarah tersebut.</>,
											].map((text, i) => (
												<div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
													<div className="flex items-start space-x-2.5">
														<div className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
															{i + 1}
														</div>
														<p className="text-sm text-gray-700 leading-relaxed">{text}</p>
													</div>
												</div>
											))}
										</div>

										{/* Prosedur Pembentukan */}
										<div className="pt-3 border-t border-blue-200">
											<h5 className="font-semibold text-blue-900 mb-2 flex items-center text-sm">
												<LuUsers className="w-4 h-4 mr-1.5" />
												Prosedur Pembentukan
											</h5>
											<div className="space-y-2">
												{[
													<>Pembentukan RT dilakukan melalui <strong>musyawarah</strong> oleh para Kepala Keluarga atau yang mewakili, pengurus RT dan tokoh masyarakat serta dihadiri oleh <strong>Ketua RW setempat</strong>.</>,
													<>Hasil musyawarah dituangkan dalam <strong>berita acara</strong> dan disampaikan kepada Kepala Desa/Lurah untuk mendapat penetapan.</>,
													<>Pembentukan RT di Desa ditetapkan dengan <strong>Peraturan Desa</strong>.</>,
													<>Pembentukan RT di Kelurahan ditetapkan dengan <strong>Keputusan Camat</strong>.</>,
												].map((text, i) => (
													<div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
														<div className="flex items-start space-x-2.5">
															<div className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
																{i + 1}
															</div>
															<p className="text-sm text-gray-700 leading-relaxed">{text}</p>
														</div>
													</div>
												))}
											</div>
										</div>

										<div className="flex items-start space-x-2 bg-blue-100 rounded-lg p-3">
											<LuInfo className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
											<div>
												<p className="text-sm font-semibold text-blue-900">Peraturan Bupati Bogor Nomor 31 Tahun 2012</p>
												<p className="text-xs text-blue-700">Tentang Tata Cara Pembentukan, Pengangkatan, dan Pemberhentian Pengurus LPMD/LPMK, RW, dan RT</p>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Modal Body */}
							<div className="p-6 space-y-4">
								{/* Produk Hukum - Paling Atas */}
								<div>
									<label className="block text-sm font-medium mb-1 text-gray-700">
										Produk Hukum Lembaga <span className="text-red-500">*</span>
									</label>
									<p className="text-xs text-gray-500 mb-2">
										Pilih Perdes/Perkades yang masih berlaku sebagai dasar hukum pembentukan RT
									</p>
									<div className="relative">
										<button
											type="button"
											className={`w-full text-left border rounded-lg px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${produkHukumId ? "border-blue-300 bg-blue-50" : "border-gray-300 bg-white"} ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-blue-400"}`}
											onClick={() => !isLoading && setShowPhDropdown((v) => !v)}
											disabled={isLoading}
										>
											{produkHukumId ? (
												<div className="flex-1 min-w-0">
													<p className="font-medium text-blue-700 truncate">{produkHukumOptions.find((p) => p.id === produkHukumId)?.judul || "—"}</p>
													<p className="text-xs text-blue-500 mt-0.5">{(produkHukumOptions.find((p) => p.id === produkHukumId)?.jenis || "").replace(/_/g, " ")} — No. {produkHukumOptions.find((p) => p.id === produkHukumId)?.nomor}</p>
												</div>
											) : (
												<span className="text-gray-400">Pilih produk hukum...</span>
											)}
											<LuChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${showPhDropdown ? "rotate-180" : ""}`} />
										</button>
										{showPhDropdown && (
											<div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
												<div className="p-2 border-b border-gray-100">
													<div className="relative">
														<LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
														<input
															className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
															placeholder="Cari judul atau nomor..."
															value={phSearchTerm}
															onChange={(e) => setPhSearchTerm(e.target.value)}
															autoFocus
														/>
													</div>
												</div>
												<div className="max-h-48 overflow-y-auto">
													{loadingPh ? (
														<div className="p-3 text-center text-sm text-gray-500">
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto mb-1"></div>
															Memuat...
														</div>
													) : produkHukumOptions.filter((ph) =>
														!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
													).length === 0 ? (
														<div className="p-3 text-center text-sm text-gray-500">
															{phSearchTerm ? "Tidak ditemukan" : "Belum ada Perdes/Perkades berlaku"}
														</div>
													) : (
														produkHukumOptions
															.filter((ph) =>
																!phSearchTerm || (ph.judul || "").toLowerCase().includes(phSearchTerm.toLowerCase()) || (ph.nomor || "").toLowerCase().includes(phSearchTerm.toLowerCase())
															)
															.map((ph) => (
																<button
																	key={ph.id}
																	type="button"
																	className={`w-full text-left px-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-blue-50 transition-colors ${produkHukumId === ph.id ? "bg-blue-50" : ""}`}
																	onClick={() => {
																		setProdukHukumId(ph.id);
																		setShowPhDropdown(false);
																		setPhSearchTerm("");
																	}}
																>
																	<div className="flex items-center justify-between">
																		<div className="flex-1 min-w-0">
																			<p className={`text-sm font-medium truncate ${produkHukumId === ph.id ? "text-blue-700" : "text-gray-900"}`}>{ph.judul}</p>
																			<p className="text-xs text-gray-500">{(ph.jenis || "").replace(/_/g, " ")} — No. {ph.nomor}</p>
																		</div>
																		{produkHukumId === ph.id && <LuCheck className="w-4 h-4 text-blue-600 ml-2 flex-shrink-0" />}
																	</div>
																</button>
															))
													)}
												</div>
											</div>
										)}
									</div>
									{!produkHukumId && (
										<p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
											<LuLock className="w-3.5 h-3.5" />
											Pilih produk hukum terlebih dahulu untuk mengisi data di bawah
										</p>
									)}
								</div>

								{/* Nomor RT */}
								<div className={!produkHukumId ? "opacity-50 pointer-events-none" : ""}>
									<label className="block text-sm font-medium mb-1 text-gray-700">
										Nomor RT <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										placeholder="Contoh: 001"
										inputMode="numeric"
										maxLength={3}
										value={nomorRT}
										onChange={(e) => {
											const val = e.target.value.replace(/\D/g, "").slice(0, 3);
											setNomorRT(val);
										}}
										onKeyPress={(e) => {
											if (e.key === "Enter" && nomorRT.trim() && !isLoading && produkHukumId) {
												handleAddRT();
											}
										}}
										className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400 disabled:bg-gray-50"
										disabled={isLoading || !produkHukumId}
									/>
									<p className="mt-1 text-xs text-gray-500">
										Hanya 3 digit angka (contoh: 001, 012, 100)
									</p>
								</div>

								{/* Alamat */}
								<div className={!produkHukumId ? "opacity-50 pointer-events-none" : ""}>
									<label className="block text-sm font-medium mb-1 text-gray-700">
										Alamat Kelembagaan
									</label>
									<div className="relative">
										<div className="absolute top-2.5 left-0 pl-3 pointer-events-none">
											<LuMapPin className="w-5 h-5 text-gray-400" />
										</div>
										<textarea
											className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400 disabled:bg-gray-50 resize-none uppercase"
											rows={2}
											value={alamatRT}
											onChange={(e) => setAlamatRT(e.target.value.toUpperCase())}
											placeholder="Masukkan alamat sekretariat / lokasi RT"
											disabled={isLoading || !produkHukumId}
										/>
									</div>
								</div>
							</div>

							{/* Modal Footer */}
							<div className="px-6 pb-6 flex items-center gap-3">
								<button
									onClick={resetModal}
									className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors duration-200"
									disabled={isLoading}
								>
									Batal
								</button>
								<button
									onClick={handleAddRT}
									disabled={isLoading || !nomorRT.trim() || !produkHukumId}
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
