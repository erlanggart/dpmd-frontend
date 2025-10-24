import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import Swal from "sweetalert2";
import {
	FiSave,
	FiEdit3,
	FiTrash2,
	FiPlus,
	FiEye,
	FiShoppingBag,
	FiUsers,
	FiDollarSign,
	FiMapPin,
	FiCalendar,
	FiFileText,
	FiRefreshCw,
	FiCheckCircle,
	FiAlertCircle,
} from "react-icons/fi";
import api from "../../../api";
import BumdesDesaService from "../../../services/bumdesDesaService";

const BumdesDesaPage = () => {
	const { user } = useAuth();
	const [bumdesData, setBumdesData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [produkHukumOptions, setProdukHukumOptions] = useState({
		perdes: [],
		sk: []
	});
	const [formData, setFormData] = useState({
		// 1. Identitas BUMDes
		namabumdesa: "",
		desa: "",
		kecamatan: "",
		kode_desa: "",
		TahunPendirian: "",
		AlamatBumdes: "",
		NoHpBumdes: "",
		EmailBumdes: "",

		// 2. Dasar Hukum Pendirian
		NoPerdes: "",
		TanggalPerdes: "",
		NoSKKemenkumham: "",
		TanggalSKKemenkumham: "",
		produk_hukum_perdes_id: "",
		produk_hukum_sk_bumdes_id: "",

		// 3. Kepengurusan/Organisasi
		NamaPenasihat: "",
		NamaPengawas: "",
		NamaDirektur: "",
		NamaSekretaris: "",
		NamaBendahara: "",

		// 4. Sumber Daya Manusia
		TotalTenagaKerja: "",
		TenagaKerjaLaki: "",
		TenagaKerjaPerempuan: "",

		// 5. Bidang Usaha
		JenisUsaha: "",
		KelasUsaha: "",
		StatusUsaha: "",

		// 6. Modal dan Aset
		ModalAwal: "",
		ModalSekarang: "",
		Aset: "",
		KekayaanBersih: "",

		// 7. Omzet dan Keuntungan (3 tahun terakhir)
		Omzet2022: "",
		Omzet2023: "",
		Omzet2024: "",
		SHU2022: "",
		SHU2023: "",
		SHU2024: "",
		Laba2022: "",
		Laba2023: "",
		Laba2024: "",

		// 8. Potensi dan Program
		PotensiWisata: "",
		OVOP: "",
		Ketapang2025: "",
		DesaWisata: "",

		// 9. Kontribusi PADes
		KontribusiPADesRP: "",
		KontribusiPADesPersen: "",

		// 10. Peran dalam Program
		PeranOVOP: "",
		PeranKetapang2025: "",
		PeranDesaWisata: "",

		// 11. Bantuan
		BantuanKementrian: "",
		BantuanLaptopShopee: "",

		// 12. Laporan Keuangan
		LaporanKeuangan: "",

		// 13. Status Upload
		upload_status: "not_uploaded",
	});

	// Fetch BUMDES data dan produk hukum options untuk desa ini
	useEffect(() => {
		fetchBumdesData();
		fetchProdukHukumOptions();
	}, []);

	const fetchBumdesData = async () => {
		try {
			setLoading(true);
			const result = await BumdesDesaService.getBumdesData();
			
			if (result.success && result.data) {
				setBumdesData(result.data);
				setFormData(result.data);
			} else {
				// Jika belum ada data, set default data dengan info desa
				setFormData(prev => ({
					...prev,
					desa: user?.desa?.nama || "",
					kecamatan: user?.desa?.kecamatan?.nama || "",
					kode_desa: user?.desa?.kode || "",
				}));
			}
		} catch (error) {
			console.error("Error fetching BUMDES data:", error);
			
			// Set default data dengan info desa jika error
			setFormData(prev => ({
				...prev,
				desa: user?.desa?.nama || "",
				kecamatan: user?.desa?.kecamatan?.nama || "",
				kode_desa: user?.desa?.kode || "",
			}));
		} finally {
			setLoading(false);
		}
	};

	const fetchProdukHukumOptions = async () => {
		try {
			const result = await BumdesDesaService.getProdukHukumForBumdes();
			
			if (result.success && result.data) {
				setProdukHukumOptions(result.data);
			}
		} catch (error) {
			console.error("Error fetching produk hukum options:", error);
		}
	};

	const handleInputChange = (field, value) => {
		setFormData(prev => ({
			...prev,
			[field]: value
		}));
	};

	const handleSave = async () => {
		try {
			setSaving(true);

			// Validasi menggunakan service
			const validation = BumdesDesaService.validateBumdesData(formData);
			if (!validation.isValid) {
				Swal.fire("Error", validation.errors.join('\n'), "error");
				return;
			}

			let result;
			if (bumdesData) {
				result = await BumdesDesaService.updateBumdes(bumdesData.id, formData);
			} else {
				result = await BumdesDesaService.createBumdes(formData);
			}

			if (result.success) {
				setBumdesData(result.data);
				setIsEditing(false);
				
				Swal.fire({
					title: "Berhasil!",
					text: bumdesData ? "Data BUMDES berhasil diperbarui" : "Data BUMDES berhasil disimpan",
					icon: "success",
					confirmButtonText: "OK"
				});

				// Refresh data
				await fetchBumdesData();
			}
		} catch (error) {
			console.error("Error saving BUMDES data:", error);
			Swal.fire("Error", "Gagal menyimpan data BUMDES", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!bumdesData) return;

		const result = await Swal.fire({
			title: "Hapus Data BUMDES?",
			text: "Data yang dihapus tidak dapat dikembalikan!",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#3085d6",
			confirmButtonText: "Ya, Hapus!",
			cancelButtonText: "Batal"
		});

		if (result.isConfirmed) {
			try {
				setSaving(true);
				await BumdesDesaService.deleteBumdes(bumdesData.id);
				
				setBumdesData(null);
				setFormData({
					...formData,
					namabumdesa: "",
					upload_status: "not_uploaded"
				});
				setIsEditing(false);

				Swal.fire("Terhapus!", "Data BUMDES berhasil dihapus", "success");
			} catch (error) {
				console.error("Error deleting BUMDES data:", error);
				Swal.fire("Error", "Gagal menghapus data BUMDES", "error");
			} finally {
				setSaving(false);
			}
		}
	};

	const renderFormSection = (title, icon, children) => (
		<div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
			<div className="flex items-center gap-3 mb-6">
				<div className="p-2 bg-blue-100 rounded-lg">
					{icon}
				</div>
				<h3 className="text-lg font-semibold text-gray-800">{title}</h3>
			</div>
			{children}
		</div>
	);

	const renderInput = (label, field, type = "text", placeholder = "", required = false) => (
		<div>
			<label className="block text-sm font-medium text-gray-700 mb-2">
				{label} {required && <span className="text-red-500">*</span>}
			</label>
			<input
				type={type}
				value={formData[field] || ""}
				onChange={(e) => handleInputChange(field, e.target.value)}
				placeholder={placeholder}
				disabled={!isEditing}
				className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
					!isEditing ? "bg-gray-50 cursor-not-allowed" : ""
				}`}
			/>
		</div>
	);

	const renderTextarea = (label, field, placeholder = "", rows = 3) => (
		<div>
			<label className="block text-sm font-medium text-gray-700 mb-2">
				{label}
			</label>
			<textarea
				value={formData[field] || ""}
				onChange={(e) => handleInputChange(field, e.target.value)}
				placeholder={placeholder}
				rows={rows}
				disabled={!isEditing}
				className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
					!isEditing ? "bg-gray-50 cursor-not-allowed" : ""
				}`}
			/>
		</div>
	);

	const renderSelect = (label, field, options, placeholder = "Pilih opsi", showInfo = false) => (
		<div>
			<label className="block text-sm font-medium text-gray-700 mb-2">
				{label}
				{showInfo && (
					<span className="text-xs text-blue-600 ml-2">(Terintegrasi dengan Produk Hukum)</span>
				)}
			</label>
			<select
				value={formData[field] || ""}
				onChange={(e) => handleInputChange(field, e.target.value)}
				disabled={!isEditing}
				className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
					!isEditing ? "bg-gray-50 cursor-not-allowed" : ""
				}`}
			>
				<option value="">{placeholder}</option>
				{options.map((option) => (
					<option key={option.id} value={option.id}>
						{option.judul} ({option.nomor} - {new Date(option.tanggal).toLocaleDateString('id-ID')})
					</option>
				))}
			</select>
			{formData[field] && options.length > 0 && (
				<div className="mt-2 p-3 bg-blue-50 rounded-lg">
					{(() => {
						const selected = options.find(opt => opt.id === formData[field]);
						return selected ? (
							<div className="text-sm text-blue-800">
								<div className="font-medium">{selected.judul}</div>
								<div className="text-blue-600">
									{selected.nomor} • {new Date(selected.tanggal).toLocaleDateString('id-ID')} • {selected.jenis}
								</div>
								{selected.subjek && <div className="mt-1 text-blue-700">{selected.subjek}</div>}
							</div>
						) : null;
					})()}
				</div>
			)}
		</div>
	);

	if (loading) {
		return (
			<div className="p-6">
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-7xl mx-auto">
			{/* Header */}
			<div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-6 text-white">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="p-3 bg-white/20 rounded-xl">
							<FiShoppingBag className="text-2xl" />
						</div>
						<div>
							<h1 className="text-2xl font-bold">Data BUMDES Desa</h1>
							<p className="text-blue-100">
								{user?.desa?.nama}, Kecamatan {user?.desa?.kecamatan?.nama}
							</p>
						</div>
					</div>
					
					{/* Status Badge */}
					<div className="flex items-center gap-3">
						{bumdesData ? (
							<div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg">
								<FiCheckCircle className="text-green-300" />
								<span className="text-green-100 font-medium">Data Tersimpan</span>
							</div>
						) : (
							<div className="flex items-center gap-2 bg-orange-500/20 px-4 py-2 rounded-lg">
								<FiAlertCircle className="text-orange-300" />
								<span className="text-orange-100 font-medium">Belum Ada Data</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex items-center gap-4 mb-6">
				{!isEditing ? (
					<>
						<button
							onClick={() => setIsEditing(true)}
							className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
						>
							<FiEdit3 className="w-4 h-4" />
							{bumdesData ? "Edit Data" : "Input Data"}
						</button>
						
						{bumdesData && (
							<button
								onClick={handleDelete}
								className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
							>
								<FiTrash2 className="w-4 h-4" />
								Hapus Data
							</button>
						)}
					</>
				) : (
					<>
						<button
							onClick={handleSave}
							disabled={saving}
							className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
						>
							{saving ? (
								<FiRefreshCw className="w-4 h-4 animate-spin" />
							) : (
								<FiSave className="w-4 h-4" />
							)}
							{saving ? "Menyimpan..." : "Simpan"}
						</button>
						
						<button
							onClick={() => {
								setIsEditing(false);
								setFormData(bumdesData || {});
							}}
							className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
						>
							Batal
						</button>
					</>
				)}
			</div>

			{/* Form Sections */}
			<div className="space-y-6">
				{/* 1. Identitas BUMDes */}
				{renderFormSection("1. Identitas BUMDes", <FiShoppingBag className="text-blue-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{renderInput("Nama BUMDes", "namabumdesa", "text", "Masukkan nama BUMDes", true)}
						{renderInput("Nama Desa", "desa", "text", "", false)}
						{renderInput("Kecamatan", "kecamatan", "text", "", false)}
						{renderInput("Kode Desa", "kode_desa", "text", "", false)}
						{renderInput("Tahun Pendirian", "TahunPendirian", "number", "Contoh: 2020")}
						{renderInput("No. HP BUMDes", "NoHpBumdes", "tel", "Contoh: 08123456789")}
						<div className="md:col-span-2">
							{renderTextarea("Alamat BUMDes", "AlamatBumdes", "Masukkan alamat lengkap BUMDes")}
						</div>
						{renderInput("Email BUMDes", "EmailBumdes", "email", "contoh@email.com")}
					</div>
				))}

				{/* 2. Dasar Hukum Pendirian */}
				{renderFormSection("2. Dasar Hukum Pendirian", <FiFileText className="text-blue-600" />, (
					<div className="space-y-6">
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<div className="flex items-center gap-2 mb-2">
								<FiFileText className="text-blue-600" />
								<span className="text-sm font-medium text-blue-800">
									Dokumen Hukum Terintegrasi
								</span>
							</div>
							<p className="text-sm text-blue-700">
								Pilih dokumen PERDES dan SK BUMDES yang sudah diupload melalui menu Produk Hukum. 
								Jika dokumen belum tersedia, silakan upload terlebih dahulu di menu Produk Hukum.
							</p>
						</div>

						<div className="grid grid-cols-1 gap-6">
							{renderSelect(
								"Peraturan Desa (PERDES) BUMDES",
								"produk_hukum_perdes_id",
								produkHukumOptions.perdes || [],
								"Pilih PERDES BUMDES yang sudah diupload",
								true
							)}
							
							{renderSelect(
								"Surat Keputusan (SK) BUMDES",
								"produk_hukum_sk_bumdes_id",
								produkHukumOptions.sk || [],
								"Pilih SK BUMDES yang sudah diupload",
								true
							)}
						</div>

						{/* Fallback manual input jika diperlukan */}
						<div className="border-t pt-4">
							<details className="group">
								<summary className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-800">
									<span className="transform group-open:rotate-90 transition-transform">▶</span>
									Input Manual (Jika dokumen belum diupload)
								</summary>
								<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
									{renderInput("No. Perdes", "NoPerdes", "text", "Masukkan nomor Perdes")}
									{renderInput("Tanggal Perdes", "TanggalPerdes", "date")}
									{renderInput("No. SK Kemenkumham", "NoSKKemenkumham", "text", "Masukkan nomor SK")}
									{renderInput("Tanggal SK Kemenkumham", "TanggalSKKemenkumham", "date")}
								</div>
							</details>
						</div>
					</div>
				))}

				{/* 3. Kepengurusan/Organisasi */}
				{renderFormSection("3. Kepengurusan/Organisasi", <FiUsers className="text-blue-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{renderInput("Nama Penasihat", "NamaPenasihat", "text", "Masukkan nama penasihat")}
						{renderInput("Nama Pengawas", "NamaPengawas", "text", "Masukkan nama pengawas")}
						{renderInput("Nama Direktur", "NamaDirektur", "text", "Masukkan nama direktur")}
						{renderInput("Nama Sekretaris", "NamaSekretaris", "text", "Masukkan nama sekretaris")}
						{renderInput("Nama Bendahara", "NamaBendahara", "text", "Masukkan nama bendahara")}
					</div>
				))}

				{/* 4. Sumber Daya Manusia */}
				{renderFormSection("4. Sumber Daya Manusia", <FiUsers className="text-blue-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{renderInput("Total Tenaga Kerja", "TotalTenagaKerja", "number", "Jumlah total")}
						{renderInput("Tenaga Kerja Laki-laki", "TenagaKerjaLaki", "number", "Jumlah laki-laki")}
						{renderInput("Tenaga Kerja Perempuan", "TenagaKerjaPerempuan", "number", "Jumlah perempuan")}
					</div>
				))}

				{/* 5. Bidang Usaha */}
				{renderFormSection("5. Bidang Usaha", <FiShoppingBag className="text-blue-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{renderInput("Jenis Usaha", "JenisUsaha", "text", "Contoh: Perdagangan, Jasa")}
						{renderInput("Kelas Usaha", "KelasUsaha", "text", "Contoh: Mikro, Kecil")}
						{renderInput("Status Usaha", "StatusUsaha", "text", "Contoh: Aktif, Tidak Aktif")}
					</div>
				))}

				{/* 6. Modal dan Aset */}
				{renderFormSection("6. Modal dan Aset", <FiDollarSign className="text-blue-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{renderInput("Modal Awal (Rp)", "ModalAwal", "number", "Contoh: 50000000")}
						{renderInput("Modal Sekarang (Rp)", "ModalSekarang", "number", "Contoh: 75000000")}
						{renderInput("Total Aset (Rp)", "Aset", "number", "Contoh: 100000000")}
						{renderInput("Kekayaan Bersih (Rp)", "KekayaanBersih", "number", "Contoh: 80000000")}
					</div>
				))}

				{/* 7. Omzet dan Keuntungan (3 tahun terakhir) */}
				{renderFormSection("7. Omzet dan Keuntungan (3 Tahun Terakhir)", <FiDollarSign className="text-blue-600" />, (
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<h4 className="md:col-span-3 font-semibold text-gray-700">Omzet Tahunan</h4>
							{renderInput("Omzet 2022 (Rp)", "Omzet2022", "number", "Omzet tahun 2022")}
							{renderInput("Omzet 2023 (Rp)", "Omzet2023", "number", "Omzet tahun 2023")}
							{renderInput("Omzet 2024 (Rp)", "Omzet2024", "number", "Omzet tahun 2024")}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<h4 className="md:col-span-3 font-semibold text-gray-700">Sisa Hasil Usaha (SHU)</h4>
							{renderInput("SHU 2022 (Rp)", "SHU2022", "number", "SHU tahun 2022")}
							{renderInput("SHU 2023 (Rp)", "SHU2023", "number", "SHU tahun 2023")}
							{renderInput("SHU 2024 (Rp)", "SHU2024", "number", "SHU tahun 2024")}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<h4 className="md:col-span-3 font-semibold text-gray-700">Laba Bersih</h4>
							{renderInput("Laba 2022 (Rp)", "Laba2022", "number", "Laba tahun 2022")}
							{renderInput("Laba 2023 (Rp)", "Laba2023", "number", "Laba tahun 2023")}
							{renderInput("Laba 2024 (Rp)", "Laba2024", "number", "Laba tahun 2024")}
						</div>
					</div>
				))}

				{/* 8. Potensi dan Program */}
				{renderFormSection("8. Potensi dan Program", <FiMapPin className="text-blue-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{renderInput("Potensi Wisata", "PotensiWisata", "text", "Jelaskan potensi wisata")}
						{renderInput("OVOP (One Village One Product)", "OVOP", "text", "Produk unggulan desa")}
						{renderInput("Program Ketapang 2025", "Ketapang2025", "text", "Peran dalam program")}
						{renderInput("Program Desa Wisata", "DesaWisata", "text", "Peran dalam program")}
					</div>
				))}

				{/* 9. Kontribusi PADes */}
				{renderFormSection("9. Kontribusi terhadap Pendapatan Asli Desa", <FiDollarSign className="text-blue-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{renderInput("Kontribusi PADes (Rp)", "KontribusiPADesRP", "number", "Nominal kontribusi")}
						{renderInput("Kontribusi PADes (%)", "KontribusiPADesPersen", "number", "Persentase kontribusi")}
					</div>
				))}

				{/* 10. Peran dalam Program */}
				{renderFormSection("10. Peran dalam Program Kabupaten", <FiMapPin className="text-blue-600" />, (
					<div className="space-y-4">
						{renderTextarea("Peran dalam OVOP", "PeranOVOP", "Jelaskan peran dalam program OVOP")}
						{renderTextarea("Peran dalam Ketapang 2025", "PeranKetapang2025", "Jelaskan peran dalam program Ketapang 2025")}
						{renderTextarea("Peran dalam Desa Wisata", "PeranDesaWisata", "Jelaskan peran dalam program Desa Wisata")}
					</div>
				))}

				{/* 11. Bantuan */}
				{renderFormSection("11. Bantuan yang Diterima", <FiDollarSign className="text-blue-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{renderInput("Bantuan Kementerian", "BantuanKementrian", "text", "Jenis bantuan dari kementerian")}
						{renderInput("Bantuan Laptop Shopee", "BantuanLaptopShopee", "text", "Bantuan program laptop")}
					</div>
				))}

				{/* 12. Laporan Keuangan */}
				{renderFormSection("12. Laporan Keuangan", <FiFileText className="text-blue-600" />, (
					<div>
						{renderTextarea("Status Laporan Keuangan", "LaporanKeuangan", "Jelaskan kondisi laporan keuangan BUMDes", 4)}
					</div>
				))}
			</div>

			{/* Footer Info */}
			<div className="mt-8 p-4 bg-blue-50 rounded-lg">
				<div className="flex items-start gap-3">
					<FiAlertCircle className="text-blue-600 mt-1 flex-shrink-0" />
					<div className="text-sm text-blue-800">
						<p className="font-semibold mb-1">Catatan Penting:</p>
						<ul className="list-disc list-inside space-y-1">
							<li>Data yang diinput akan otomatis tersinkronisasi dengan sistem monitoring BUMDES Kabupaten</li>
							<li>Pastikan semua data yang diisi akurat dan sesuai dengan kondisi terkini</li>
							<li>Field yang bertanda (*) adalah wajib diisi</li>
							<li>Data keuangan sebaiknya diperbarui secara berkala</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
};

export default BumdesDesaPage;