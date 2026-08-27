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
import DesaPageHeader from "../../../components/desa/DesaPageHeader";

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
		// 1. Identitas
		namabumdesa: "", desa: "", kecamatan: "", kode_desa: "",
		TahunPendirian: "", AlamatBumdesa: "", TelfonBumdes: "", Alamatemail: "",
		status: "aktif", keterangan_tidak_aktif: "",

		// 2. Dasar hukum & legalitas
		NomorPerdes: "", produk_hukum_perdes_id: "", produk_hukum_sk_bumdes_id: "",
		NIB: "", LKPP: "", NPWP: "", badanhukum: "",

		// 3. Kepengurusan
		NamaPenasihat: "", JenisKelaminPenasihat: "", HPPenasihat: "",
		NamaPengawas: "", JenisKelaminPengawas: "", HPPengawas: "",
		NamaDirektur: "", JenisKelaminDirektur: "", HPDirektur: "",
		NamaSekretaris: "", JenisKelaminSekretaris: "", HPSekretaris: "",
		NamaBendahara: "", JenisKelaminBendahara: "", HPBendahara: "",
		NamaStafLainnya: "", JenisKelaminStafLainnya: "", HPStafLainnya: "",

		// 4. Tenaga kerja & bidang usaha
		TotalTenagaKerja: "",
		JenisUsaha: "", JenisUsahaUtama: "", JenisUsahaLainnya: "", JenisUsaha2021: "",

		// 5. Ketahanan pangan
		JenisUsahaKetahananPangan: "", KeteranganUsahaKetahananPangan: "",
		VolumeKetahananPangan: "", AnggaranModalKetahananPangan: "",

		// 6. Permodalan & aset
		PenyertaanModal2019: "", PenyertaanModal2020: "", PenyertaanModal2021: "",
		PenyertaanModal2022: "", PenyertaanModal2023: "", PenyertaanModal2024: "",
		PenganggaranPenyertaanModal2025: "", PenyertaanModalTPKK: "",
		TotalRealisasiPenyertaanModal20192025: "", JumlahModalAwal: "",
		SumberLain: "", JenisAset: "", NilaiAset: "",

		// 7. Omset & laba
		Omset2023: "", Laba2023: "",
		Omset2024Sem1: "", Laba2024Sem1: "",
		Omset2024: "", Laba2024: "",
		Omset2025: "", Laba2025: "",

		// 8. Kontribusi PADes
		KontribusiTerhadapPADes2021: "", KontribusiTerhadapPADes2022: "",
		KontribusiTerhadapPADes2023: "", KontribusiTerhadapPADes2024: "",
		KontribusiTerhadapPADes2025: "",

		// 9. Kemitraan
		KerjasamaPihakKetiga: "", "TahunMulai_TahunBerakhir": "",
		KontribusiKemitraanPADes2024: "", KontribusiKemitraanPADes2025: "",

		// 10. Peran dalam program pemerintah
		Ketapang2024: "", Ketapang2025: "", DesaWisata: "", DesaWisataStatus: "",
		PeranMBG: "", MekanismeKerjaSamaMBG: "", JumlahSPPG: "", TahunKerjaSamaMBG: "",

		// 11. Bantuan
		BantuanKementrian: "", BantuanLaptopShopee: "", BantuanLainnya: "",

		// 12. Tambahan
		ECommerce: "", LinkSK: "", LinkLapKeuangan2021: "",
		LinkSKKepengurusan2021: "", CatatanTambahan: "",
	});

	// State untuk file uploads - Perdes dan SK sudah terintegrasi dengan Produk Hukum Desa
	const [fileUploads, setFileUploads] = useState({
		LaporanKeuangan2021: null,
		LaporanKeuangan2022: null,
		LaporanKeuangan2023: null,
		LaporanKeuangan2024: null,
		ProfilBUMDesa: null,
		BeritaAcara: null,
		AnggaranDasar: null,
		AnggaranRumahTangga: null,
		ProgramKerja: null,
	});

	// Fetch BUMDES data dan produk hukum options untuk desa ini
	useEffect(() => {
		const initializeData = async () => {
			try {
				setLoading(true);
				console.log('Initializing BUMDes page, user:', user?.desa?.nama);
				
				// Fetch both data in parallel
				await Promise.all([
					fetchBumdesData(),
					fetchProdukHukumOptions()
				]);
			} catch (error) {
				console.error('Error initializing BUMDes page:', error);
			} finally {
				setLoading(false);
			}
		};

		initializeData();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const fetchBumdesData = async () => {
		try {
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
		}
	};

	const fetchProdukHukumOptions = async () => {
		try {
			console.log('Fetching produk hukum options for BUMDES...');
			const result = await BumdesDesaService.getProdukHukumForBumdes();
			
			console.log('Produk Hukum API Response:', result);
			
			if (result.success && result.data) {
				console.log('Setting produk hukum options:', {
					perdes: result.data.perdes?.length || 0,
					sk: result.data.sk?.length || 0,
					sk_bumdes: result.data.sk_bumdes?.length || 0
				});
				
				setProdukHukumOptions({
					perdes: result.data.perdes || [],
					sk: result.data.sk || result.data.sk_bumdes || []
				});
			} else {
				console.warn('No produk hukum data received');
				setProdukHukumOptions({ perdes: [], sk: [] });
			}
		} catch (error) {
			console.error("Error fetching produk hukum options:", error);
			
			// Show user-friendly notification
			Swal.fire({
				icon: 'warning',
				title: 'Perhatian',
				text: 'Gagal memuat data Produk Hukum. Pastikan Anda sudah mengupload Perdes dan SK di menu Produk Hukum.',
				confirmButtonColor: '#3b82f6',
			});
			
			setProdukHukumOptions({ perdes: [], sk: [] });
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
				setSaving(false);
				return;
			}

			let result;
			
			if (bumdesData) {
				// === UPDATE EXISTING DATA ===
				// STEP 1: Update data tanpa file
				result = await BumdesDesaService.updateBumdes(bumdesData.id, formData);
				
				// STEP 2: Upload files satu per satu jika ada
				const fileFields = Object.keys(fileUploads).filter(key => fileUploads[key] !== null);
				
				if (fileFields.length > 0) {
					for (const fieldName of fileFields) {
						try {
							const fileData = new FormData();
							fileData.append('file', fileUploads[fieldName]);
							fileData.append('bumdes_id', bumdesData.id);
							fileData.append('field_name', fieldName);

							await api.post('/desa/bumdes/upload-file', fileData, {
								headers: { 'Content-Type': 'multipart/form-data' }
							});
						} catch (fileError) {
							console.error(`Failed to upload ${fieldName}:`, fileError);
							// Continue dengan file lain meskipun ada yang gagal
						}
					}
				}
			} else {
				// === CREATE NEW DATA ===
				// STEP 1: Submit data TANPA file dulu
				result = await BumdesDesaService.createBumdes(formData);
				const bumdesId = result.data?.id;

				// STEP 2: Upload files satu per satu jika ada
				const fileFields = Object.keys(fileUploads).filter(key => fileUploads[key] !== null);
				
				if (fileFields.length > 0 && bumdesId) {
					for (const fieldName of fileFields) {
						try {
							const fileData = new FormData();
							fileData.append('file', fileUploads[fieldName]);
							fileData.append('bumdes_id', bumdesId);
							fileData.append('field_name', fieldName);

							await api.post('/desa/bumdes/upload-file', fileData, {
								headers: { 'Content-Type': 'multipart/form-data' }
							});
						} catch (fileError) {
							console.error(`Failed to upload ${fieldName}:`, fileError);
							// Continue dengan file lain meskipun ada yang gagal
						}
					}
				}
			}

			if (result.success) {
				setBumdesData(result.data);
				setIsEditing(false);
				
				// Reset file uploads state
				setFileUploads({
					LaporanKeuangan2021: null,
					LaporanKeuangan2022: null,
					LaporanKeuangan2023: null,
					LaporanKeuangan2024: null,
					ProfilBUMDesa: null,
					BeritaAcara: null,
					AnggaranDasar: null,
					AnggaranRumahTangga: null,
					ProgramKerja: null,
				});
				
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
			
			// Tampilkan error validasi jika ada
			let errorMessage = "Gagal menyimpan data BUMDES";
			if (error.response?.data?.errors) {
				const errors = error.response.data.errors;
				const errorList = Object.entries(errors)
					.map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
					.join('\n');
				errorMessage = `Validasi gagal:\n\n${errorList}`;
			} else if (error.response?.data?.message) {
				errorMessage = error.response.data.message;
			} else if (error.message) {
				errorMessage = error.message;
			}
			
			Swal.fire("Error", errorMessage, "error");
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
		<div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
			<div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
				<div className="rounded-lg bg-slate-100 p-2 text-slate-700">
					{icon}
				</div>
				<h3 className="text-base font-semibold text-slate-900">{title}</h3>
			</div>
			{children}
		</div>
	);

	const fieldClass = (disabled) =>
		`w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 ${
			disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : "bg-white"
		}`;

	const renderInput = (label, field, type = "text", placeholder = "", required = false, readOnly = false) => (
		<div>
			<label className="mb-1.5 block text-sm font-medium text-slate-700">
				{label} {required && <span className="text-rose-500">*</span>}
				{readOnly && <span className="ml-2 text-xs text-slate-400">(Otomatis dari akun desa)</span>}
			</label>
			<input
				type={type}
				value={formData[field] || ""}
				onChange={(e) => handleInputChange(field, e.target.value)}
				placeholder={placeholder}
				disabled={!isEditing || readOnly}
				readOnly={readOnly}
				className={fieldClass(!isEditing || readOnly)}
			/>
		</div>
	);

	const renderTextarea = (label, field, placeholder = "", rows = 3) => (
		<div>
			<label className="mb-1.5 block text-sm font-medium text-slate-700">
				{label}
			</label>
			<textarea
				value={formData[field] || ""}
				onChange={(e) => handleInputChange(field, e.target.value)}
				placeholder={placeholder}
				rows={rows}
				disabled={!isEditing}
				className={fieldClass(!isEditing)}
			/>
		</div>
	);

	// Tampilan baca-saja untuk kolom yang diisi DPMD, bukan desa.
	const renderBaca = (label, field) => (
		<div>
			<label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
			<div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
				{formData[field] || <span className="text-slate-400">Belum ada data</span>}
			</div>
		</div>
	);

	const renderSelect = (label, field, options, placeholder = "Pilih opsi", showInfo = false) => (
		<div>
			<label className="mb-1.5 block text-sm font-medium text-slate-700">
				{label}
				{showInfo && (
					<span className="ml-2 text-xs text-slate-400">(Terintegrasi dengan Produk Hukum)</span>
				)}
			</label>
			<select
				value={formData[field] || ""}
				onChange={(e) => handleInputChange(field, e.target.value)}
				disabled={!isEditing}
				className={fieldClass(!isEditing)}
			>
				<option value="">{placeholder}</option>
				{Array.isArray(options) && options.length > 0 ? (
					options.map((option) => (
						<option key={option.id || option.value} value={option.id || option.value}>
							{option.nomor ? `${option.nomor} - ${option.judul} (${option.tahun})` : (option.label || option)}
						</option>
					))
				) : (
					<option key="no-data" disabled>Tidak ada data tersedia</option>
				)}
			</select>
			{formData[field] && options.length > 0 && (
				<div className="mt-2 p-3 bg-slate-50 rounded-lg">
					{(() => {
						const selected = options.find(opt => opt.id === formData[field]);
						return selected ? (
							<div className="text-sm text-slate-800">
								<div className="font-medium">{selected.judul}</div>
								<div className="text-slate-600 mt-1">
									{selected.singkatan_jenis || selected.jenis} {selected.nomor} Tahun {selected.tahun}
								</div>
								{selected.tanggal_penetapan && (
									<div className="text-slate-600">
										Ditetapkan: {new Date(selected.tanggal_penetapan).toLocaleDateString('id-ID')}
									</div>
								)}
							</div>
						) : null;
					})()}
				</div>
			)}
		</div>
	);

	if (loading) {
		return (
			<div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900"></div>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			<DesaPageHeader
				icon={FiShoppingBag}
				eyebrow="Data Desa"
				title="Data BUMDes"
				description={`${user?.desa?.nama || "Desa"}${user?.desa?.kecamatan?.nama ? `, Kecamatan ${user.desa.kecamatan.nama}` : ""} — identitas, legalitas, permodalan, dan kondisi usaha BUMDes.`}
				actions={
					<>
						<span
							className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
								bumdesData
									? "bg-emerald-50 text-emerald-700 ring-emerald-100"
									: "bg-amber-50 text-amber-700 ring-amber-100"
							}`}
						>
							{bumdesData ? (
								<FiCheckCircle className="h-3.5 w-3.5" />
							) : (
								<FiAlertCircle className="h-3.5 w-3.5" />
							)}
							{bumdesData ? "Data tersimpan" : "Belum ada data"}
						</span>

						{!isEditing ? (
							<>
								<button
									onClick={() => setIsEditing(true)}
									className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
								>
									<FiEdit3 className="h-4 w-4" />
									{bumdesData ? "Edit Data" : "Input Data"}
								</button>

								{bumdesData && (
									<button
										onClick={handleDelete}
										className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:border-rose-200 hover:bg-rose-50"
									>
										<FiTrash2 className="h-4 w-4" />
										Hapus
									</button>
								)}
							</>
						) : (
							<>
								<button
									onClick={handleSave}
									disabled={saving}
									className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
								>
									{saving ? (
										<FiRefreshCw className="h-4 w-4 animate-spin" />
									) : (
										<FiSave className="h-4 w-4" />
									)}
									{saving ? "Menyimpan..." : "Simpan"}
								</button>

								<button
									onClick={() => {
										setIsEditing(false);
										setFormData(bumdesData || {});
									}}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
								>
									Batal
								</button>
							</>
						)}
					</>
				}
			/>

			{/* Form Sections */}
			<div className="space-y-5">
				{/* 1. Identitas BUMDes */}
				{renderFormSection("1. Identitas BUMDes", <FiShoppingBag className="text-slate-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{renderInput("Nama BUMDes", "namabumdesa", "text", "Masukkan nama BUMDes", true)}
						{renderInput("Nama Desa", "desa", "text", "", false, true)}
						{renderInput("Kecamatan", "kecamatan", "text", "", false, true)}
						{renderInput("Kode Desa", "kode_desa", "text", "", false, true)}
						{renderInput("Tahun Pendirian", "TahunPendirian", "number", "Contoh: 2020")}
						{renderSelect("Status BUMDes", "status", [
							{ value: "aktif", label: "Aktif" },
							{ value: "tidak_aktif", label: "Tidak Aktif" }
						], "Pilih status BUMDes")}
						{formData.status === "tidak_aktif" && (
							<div className="md:col-span-2">
								{renderTextarea("Keterangan Tidak Aktif", "keterangan_tidak_aktif", "Jelaskan alasan tidak aktif")}
							</div>
						)}
						{renderInput("No. HP BUMDes", "TelfonBumdes", "tel", "Contoh: 08123456789")}
						<div className="md:col-span-2">
							{renderTextarea("Alamat BUMDes", "AlamatBumdesa", "Masukkan alamat lengkap BUMDes")}
						</div>
						{renderInput("Email BUMDes", "Alamatemail", "email", "contoh@email.com")}
					</div>
				))}

				{/* 2. Dasar Hukum Pendirian */}
				{renderFormSection("2. Dasar Hukum Pendirian", <FiFileText className="text-slate-600" />, (
					<div className="space-y-6">
						<div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
							<div className="flex items-center gap-2 mb-2">
								<FiFileText className="text-slate-600" />
								<span className="text-sm font-medium text-slate-800">
									Dokumen Hukum Terintegrasi
								</span>
							</div>
							<p className="text-sm text-slate-700">
								Pilih dokumen PERDES dan SK BUMDES yang sudah diupload melalui menu Produk Hukum. 
								Jika dokumen belum tersedia, silakan upload terlebih dahulu di menu Produk Hukum.
							</p>
						</div>

						<div className="grid grid-cols-1 gap-6">
							{/* Info jika tidak ada data */}
							{(!produkHukumOptions.perdes || produkHukumOptions.perdes.length === 0) && 
							 (!produkHukumOptions.sk || produkHukumOptions.sk.length === 0) && (
								<div className="col-span-1 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
									<div className="flex items-start gap-3">
										<FiAlertCircle className="text-yellow-600 mt-1" />
										<div className="flex-1">
											<h4 className="text-sm font-medium text-yellow-800 mb-1">
												Belum Ada Produk Hukum
											</h4>
											<p className="text-xs text-yellow-700">
												Anda belum mengupload Peraturan Desa (PERDES) atau SK BUMDES. 
												Silakan upload terlebih dahulu melalui menu <strong>Produk Hukum</strong>.
											</p>
										</div>
									</div>
								</div>
							)}
							
							{renderSelect(
								"Peraturan Desa (PERDES) BUMDES",
								"produk_hukum_perdes_id",
								produkHukumOptions.perdes || [],
								produkHukumOptions.perdes?.length > 0 
									? "Pilih PERDES BUMDES yang sudah diupload" 
									: "Belum ada PERDES - Upload di menu Produk Hukum",
								true
							)}
							
							{renderSelect(
								"Surat Keputusan (SK) BUMDES",
								"produk_hukum_sk_bumdes_id",
								produkHukumOptions.sk || [],
								produkHukumOptions.sk?.length > 0 
									? "Pilih SK BUMDES yang sudah diupload" 
									: "Belum ada SK - Upload di menu Produk Hukum",
								true
							)}
						</div>

						{/* Fallback manual input jika diperlukan */}
						<div className="border-t pt-4">
							<details className="group">
								<summary className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-slate-800">
									<span className="transform group-open:rotate-90 transition-transform">▶</span>
									Input Manual (Jika dokumen belum diupload)
								</summary>
								<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
									{renderInput("Nomor Perdes", "NomorPerdes", "text", "Contoh: 05 Tahun 2024")}
								</div>
							</details>
						</div>
					</div>
				))}

				{/* 2b. Legalitas */}
				{renderFormSection("2b. Legalitas", <FiFileText className="text-slate-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{renderInput("NIB (Nomor Induk Berusaha)", "NIB", "text", "Masukkan NIB")}
						{renderInput("LKPP (Lembaga Kebijakan Pengadaan)", "LKPP", "text", "Masukkan LKPP")}
						{renderInput("NPWP", "NPWP", "text", "Masukkan NPWP")}
						{renderSelect("Status Badan Hukum", "badanhukum", [
							{ value: "Terbit Sertifikat Badan Hukum", label: "Terbit Sertifikat Badan Hukum" },
							{ value: "Nama Terverifikasi", label: "Nama Terverifikasi" },
							{ value: "Perbaikan Dokumen", label: "Perbaikan Dokumen" },
							{ value: "Belum Melakukan Proses", label: "Belum Melakukan Proses" }
						], "Pilih status badan hukum")}
					</div>
				))}

				{/* 3. Kepengurusan/Organisasi */}
				{renderFormSection("3. Kepengurusan/Organisasi", <FiUsers className="text-slate-600" />, (
					<div className="space-y-6">
						{/* Penasihat */}
						<div className="border-b pb-4">
							<h4 className="font-semibold text-slate-700 mb-3">Penasihat</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{renderInput("Nama Penasihat", "NamaPenasihat", "text", "Masukkan nama penasihat")}
								{renderSelect("Jenis Kelamin", "JenisKelaminPenasihat", [
									{ value: "Laki-laki", label: "Laki-laki" },
									{ value: "Perempuan", label: "Perempuan" }
								], "Pilih jenis kelamin")}
								{renderInput("No HP Penasihat", "HPPenasihat", "text", "Contoh: 08123456789")}
							</div>
						</div>

						{/* Pengawas */}
						<div className="border-b pb-4">
							<h4 className="font-semibold text-slate-700 mb-3">Pengawas</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{renderInput("Nama Pengawas", "NamaPengawas", "text", "Masukkan nama pengawas")}
								{renderSelect("Jenis Kelamin", "JenisKelaminPengawas", [
									{ value: "Laki-laki", label: "Laki-laki" },
									{ value: "Perempuan", label: "Perempuan" }
								], "Pilih jenis kelamin")}
								{renderInput("No HP Pengawas", "HPPengawas", "text", "Contoh: 08123456789")}
							</div>
						</div>

						{/* Direktur */}
						<div className="border-b pb-4">
							<h4 className="font-semibold text-slate-700 mb-3">Direktur</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{renderInput("Nama Direktur", "NamaDirektur", "text", "Masukkan nama direktur")}
								{renderSelect("Jenis Kelamin", "JenisKelaminDirektur", [
									{ value: "Laki-laki", label: "Laki-laki" },
									{ value: "Perempuan", label: "Perempuan" }
								], "Pilih jenis kelamin")}
								{renderInput("No HP Direktur", "HPDirektur", "text", "Contoh: 08123456789")}
							</div>
						</div>

						{/* Sekretaris */}
						<div className="border-b pb-4">
							<h4 className="font-semibold text-slate-700 mb-3">Sekretaris</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{renderInput("Nama Sekretaris", "NamaSekretaris", "text", "Masukkan nama sekretaris")}
								{renderSelect("Jenis Kelamin", "JenisKelaminSekretaris", [
									{ value: "Laki-laki", label: "Laki-laki" },
									{ value: "Perempuan", label: "Perempuan" }
								], "Pilih jenis kelamin")}
								{renderInput("No HP Sekretaris", "HPSekretaris", "text", "Contoh: 08123456789")}
							</div>
						</div>

						{/* Bendahara */}
						<div>
							<h4 className="font-semibold text-slate-700 mb-3">Bendahara</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{renderInput("Nama Bendahara", "NamaBendahara", "text", "Masukkan nama bendahara")}
								{renderSelect("Jenis Kelamin", "JenisKelaminBendahara", [
									{ value: "Laki-laki", label: "Laki-laki" },
									{ value: "Perempuan", label: "Perempuan" }
								], "Pilih jenis kelamin")}
								{renderInput("No HP Bendahara", "HPBendahara", "text", "Contoh: 08123456789")}
							</div>
						</div>

						<div>
							<h4 className="font-semibold text-slate-700 mb-3">Staf Lainnya</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{renderInput("Nama Staf Lainnya", "NamaStafLainnya", "text", "Masukkan nama staf")}
								{renderSelect("Jenis Kelamin", "JenisKelaminStafLainnya", [
									{ value: "Laki-laki", label: "Laki-laki" },
									{ value: "Perempuan", label: "Perempuan" }
								])}
								{renderInput("No HP Staf Lainnya", "HPStafLainnya", "text", "Contoh: 08123456789")}
							</div>
						</div>
					</div>
				))}

				{/* 4. Sumber Daya Manusia */}
				{renderFormSection("4. Sumber Daya Manusia", <FiUsers className="text-slate-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{renderInput("Total Tenaga Kerja", "TotalTenagaKerja", "number", "Jumlah total pekerja")}
					</div>
				))}

				{/* 5. Bidang Usaha */}
				{renderFormSection("5. Bidang Usaha", <FiShoppingBag className="text-slate-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{renderInput("Kategori Usaha", "JenisUsaha", "text", "Contoh: Perdagangan dan Jasa Umum")}
						{renderInput("Jenis Usaha Utama", "JenisUsahaUtama", "text", "Usaha yang paling utama dijalankan")}
						{renderInput("Jenis Usaha Lainnya", "JenisUsahaLainnya", "text", "Usaha lain di luar usaha utama")}
					</div>
				))}

				{/* 6. Permodalan dan Aset */}
				{renderFormSection("6. Permodalan dan Aset", <FiDollarSign className="text-slate-600" />, (
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<h4 className="md:col-span-3 font-semibold text-slate-700">Penyertaan Modal Desa</h4>
							{renderInput("Penyertaan Modal 2019 (Rp)", "PenyertaanModal2019", "number", "0")}
							{renderInput("Penyertaan Modal 2020 (Rp)", "PenyertaanModal2020", "number", "0")}
							{renderInput("Penyertaan Modal 2021 (Rp)", "PenyertaanModal2021", "number", "0")}
							{renderInput("Penyertaan Modal 2022 (Rp)", "PenyertaanModal2022", "number", "0")}
							{renderInput("Penyertaan Modal 2023 (Rp)", "PenyertaanModal2023", "number", "0")}
							{renderInput("Penyertaan Modal 2024 (Rp)", "PenyertaanModal2024", "number", "0")}
							{renderInput("Penganggaran Penyertaan Modal 2025 (Rp)", "PenganggaranPenyertaanModal2025", "number", "0")}
							{renderInput("Penyertaan Modal TPKK/Kelompok (Rp)", "PenyertaanModalTPKK", "number", "0")}
							{renderInput("Total Realisasi 2019-2025 (Rp)", "TotalRealisasiPenyertaanModal20192025", "number", "0")}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
							<h4 className="md:col-span-2 font-semibold text-slate-700">Modal Lain dan Aset</h4>
							{renderInput("Jumlah Modal Awal (Rp)", "JumlahModalAwal", "number", "0")}
							{renderInput("Modal dari Sumber Lain (Rp)", "SumberLain", "number", "0")}
							{renderInput("Jenis Aset", "JenisAset", "text", "Contoh: Tanah, bangunan, kendaraan")}
							{renderInput("Nilai Aset (Rp)", "NilaiAset", "number", "0")}
						</div>
					</div>
				))}

				{/* 7. Omset dan Laba */}
				{renderFormSection("7. Omset dan Laba", <FiDollarSign className="text-slate-600" />, (
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<h4 className="md:col-span-2 font-semibold text-slate-700">Tahun 2023</h4>
							{renderInput("Omset 2023 (Rp)", "Omset2023", "number", "0")}
							{renderInput("Laba 2023 (Rp)", "Laba2023", "number", "0")}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
							<h4 className="md:col-span-2 font-semibold text-slate-700">Tahun 2024</h4>
							{renderInput("Omset 2024 Semester 1 (Rp)", "Omset2024Sem1", "number", "0")}
							{renderInput("Laba 2024 Semester 1 (Rp)", "Laba2024Sem1", "number", "0")}
							{renderInput("Omset 2024 Setahun (Rp)", "Omset2024", "number", "0")}
							{renderInput("Laba 2024 Setahun (Rp)", "Laba2024", "number", "0")}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
							<h4 className="md:col-span-2 font-semibold text-slate-700">Tahun 2025</h4>
							{renderInput("Omset 2025 (Rp)", "Omset2025", "number", "0")}
							{renderInput("Laba 2025 (Rp)", "Laba2025", "number", "0")}
						</div>
					</div>
				))}

				{/* 8. Usaha Ketahanan Pangan */}
				{renderFormSection("8. Usaha Ketahanan Pangan", <FiShoppingBag className="text-slate-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{renderInput("Jenis Usaha Ketahanan Pangan", "JenisUsahaKetahananPangan", "text", "Contoh: Peternakan, Pertanian")}
						{renderInput("Volume Ketahanan Pangan", "VolumeKetahananPangan", "text", "Contoh: 1000 ekor")}
						<div className="md:col-span-2">
							{renderTextarea("Keterangan Usaha Ketahanan Pangan", "KeteranganUsahaKetahananPangan", "Rincian usaha ketahanan pangan yang dijalankan", 2)}
						</div>
						{renderInput("Anggaran Penyertaan Modal Ketahanan Pangan (Rp)", "AnggaranModalKetahananPangan", "number", "0")}
					</div>
				))}

				{/* 9. Kontribusi terhadap PADes */}
				{renderFormSection("9. Kontribusi terhadap Pendapatan Asli Desa", <FiDollarSign className="text-slate-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{renderInput("Kontribusi PADes 2021 (Rp)", "KontribusiTerhadapPADes2021", "number", "0")}
						{renderInput("Kontribusi PADes 2022 (Rp)", "KontribusiTerhadapPADes2022", "number", "0")}
						{renderInput("Kontribusi PADes 2023 (Rp)", "KontribusiTerhadapPADes2023", "number", "0")}
						{renderInput("Kontribusi PADes 2024 (Rp)", "KontribusiTerhadapPADes2024", "number", "0")}
						{renderInput("Kontribusi PADes 2025 (Rp)", "KontribusiTerhadapPADes2025", "number", "0")}
					</div>
				))}

				{/* 10. Kemitraan dan Kerja Sama */}
				{renderFormSection("10. Kemitraan dan Kerja Sama", <FiUsers className="text-slate-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="md:col-span-2">
							{renderTextarea("Mitra / Kerja Sama Pihak Ketiga", "KerjasamaPihakKetiga", "Contoh: PT Solusi Limbah Abadi", 2)}
						</div>
						{renderInput("Tahun Mulai - Tahun Berakhir", "TahunMulai_TahunBerakhir", "text", "Contoh: 2022-2025")}
						<div className="hidden md:block" />
						{renderInput("Kontribusi Kemitraan ke PADes 2024 (Rp)", "KontribusiKemitraanPADes2024", "number", "0")}
						{renderInput("Kontribusi Kemitraan ke PADes 2025 (Rp)", "KontribusiKemitraanPADes2025", "number", "0")}
					</div>
				))}

				{/* 11. Peran dalam Program Pemerintah */}
				{renderFormSection("11. Peran dalam Program Pemerintah", <FiMapPin className="text-slate-600" />, (
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<h4 className="md:col-span-2 font-semibold text-slate-700">Ketahanan Pangan</h4>
							{renderSelect("Peran Ketahanan Pangan 2024", "Ketapang2024", [
								{ value: "Pengelola", label: "Pengelola" },
								{ value: "Distribusi", label: "Distribusi" },
								{ value: "Pemasaran", label: "Pemasaran" },
								{ value: "Tidak ada peran", label: "Tidak ada peran" }
							])}
							{renderSelect("Peran Ketahanan Pangan 2025", "Ketapang2025", [
								{ value: "Pengelola", label: "Pengelola" },
								{ value: "Distribusi", label: "Distribusi" },
								{ value: "Pemasaran", label: "Pemasaran" },
								{ value: "Tidak ada peran", label: "Tidak ada peran" }
							])}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
							<h4 className="md:col-span-2 font-semibold text-slate-700">Desa Wisata</h4>
							{renderSelect("Termasuk Desa Wisata", "DesaWisataStatus", [
								{ value: "Ya", label: "Ya" },
								{ value: "Tidak", label: "Tidak" }
							])}
							{renderInput("Peran pada Desa Wisata", "DesaWisata", "text", "Contoh: Pengelola Utama")}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
							<h4 className="md:col-span-2 font-semibold text-slate-700">Makan Bergizi Gratis (MBG)</h4>
							{renderInput("Peran dalam MBG", "PeranMBG", "text", "Contoh: Pemasok Bahan Baku")}
							{renderInput("Mekanisme Kerja Sama", "MekanismeKerjaSamaMBG", "text", "Contoh: Langsung dengan SPPG/Yayasan")}
							{renderInput("Jumlah SPPG", "JumlahSPPG", "number", "0")}
							{renderInput("Tahun Kerja Sama", "TahunKerjaSamaMBG", "text", "Contoh: 2025")}
						</div>
					</div>
				))}

				{/* 12. Bantuan yang Diterima */}
				{renderFormSection("12. Bantuan yang Diterima", <FiDollarSign className="text-slate-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{renderInput("Bantuan Pengembangan Kemendesa", "BantuanKementrian", "text", "Contoh: Tahap 1")}
						{renderInput("Bantuan Laptop Shopee", "BantuanLaptopShopee", "text", "Contoh: Tahap 2")}
						<div className="md:col-span-2">
							{renderTextarea("Bantuan Lainnya", "BantuanLainnya", "Bantuan lain di luar dua program di atas", 2)}
						</div>
					</div>
				))}

				{/* 13. Informasi Tambahan */}
				{renderFormSection("13. Informasi Tambahan", <FiFileText className="text-slate-600" />, (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{renderInput("E-Commerce", "ECommerce", "text", "Contoh: Shopee, Tokopedia")}
						{renderInput("Tautan SK", "LinkSK", "text", "Tautan dokumen SK")}
						{renderInput("Tautan Laporan Keuangan 2021", "LinkLapKeuangan2021", "text", "Tautan dokumen")}
						{renderInput("Tautan SK Kepengurusan 2021", "LinkSKKepengurusan2021", "text", "Tautan dokumen")}
						<div className="md:col-span-2">
							{renderTextarea("Catatan Tambahan", "CatatanTambahan", "Catatan lain tentang BUMDes ini", 3)}
						</div>
					</div>
				))}

				{/* 14. Penilaian dan Pembinaan DPMD — hanya bisa dibaca.
				    Nilainya ditetapkan bidang SPKED, jadi desa melihat hasilnya
				    tapi tidak bisa mengubahnya dari sini. */}
				{renderFormSection("14. Penilaian dan Pembinaan DPMD", <FiEye className="text-slate-600" />, (
					<div className="space-y-4">
						<p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
							Bagian ini diisi oleh Bidang SPKED DPMD dan tidak dapat diubah dari halaman desa.
							Hubungi Bidang SPKED bila ada data yang perlu diperbaiki.
						</p>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<h4 className="md:col-span-3 font-semibold text-slate-700">Pemeringkatan</h4>
							{renderBaca("Pemeringkatan 2024", "Pemeringkatan2024")}
							{renderBaca("Pemeringkatan 2024 (Semester 1)", "Pemeringkatan2024Sem1")}
							{renderBaca("Pemeringkatan 2026 (dari penilaian 2025)", "Pemeringkatan2026")}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
							<h4 className="md:col-span-3 font-semibold text-slate-700">Riwayat Status Badan Hukum</h4>
							{renderBaca("Status 2026", "StatusBadanHukum2026")}
							{renderBaca("Status 2025", "StatusBadanHukum2025")}
							{renderBaca("Status 2024", "StatusBadanHukum2024")}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
							<h4 className="md:col-span-3 font-semibold text-slate-700">Pembinaan dan Desk</h4>
							{renderBaca("Pembinaan 2024", "Pembinaan2024")}
							{renderBaca("Desk Pendataan 2025", "DeskPendataan2025")}
							{renderBaca("Kehadiran Desk 2026", "KehadiranDesk2026")}
						</div>
					</div>
				))}
			</div>

			{/* 15. Upload Dokumen */}
			{renderFormSection("15. Upload Dokumen", <FiFileText className="text-slate-600" />, (
				<div className="space-y-6">
					{/* Laporan Keuangan Files */}
					<div className="border-b pb-4">
						<h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
							<FiFileText className="text-slate-600" />
							Laporan Keuangan
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{['2021', '2022', '2023', '2024'].map(year => (
								<div key={year} className="space-y-2">
									<label className="block text-sm font-medium text-slate-700">
										Laporan Keuangan {year}
									</label>
									<input
										type="file"
										accept=".pdf,.doc,.docx"
										onChange={(e) => {
											const file = e.target.files[0];
											if (file) {
												if (file.size > 5 * 1024 * 1024) {
													Swal.fire('Error', 'Ukuran file maksimal 5MB', 'error');
													e.target.value = '';
													return;
												}
												setFileUploads(prev => ({
													...prev,
													[`LaporanKeuangan${year}`]: file
												}));
											}
										}}
										className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
									/>
									{fileUploads[`LaporanKeuangan${year}`] && (
										<p className="text-xs text-slate-600 flex items-center gap-1">
											<FiFileText /> {fileUploads[`LaporanKeuangan${year}`].name}
										</p>
									)}
									{formData[`LaporanKeuangan${year}`] && !fileUploads[`LaporanKeuangan${year}`] && (
										<p className="text-xs text-slate-600 flex items-center gap-1">
											<FiFileText /> File tersimpan: {formData[`LaporanKeuangan${year}`].split('/').pop()}
										</p>
									)}
								</div>
							))}
						</div>
					</div>

				{/* Dokumen Badan Hukum */}
				<div>
					<h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
						<FiFileText className="text-slate-600" />
						Dokumen Badan Hukum BUMDes
					</h4>
					<p className="text-sm text-slate-600 mb-3">
						<strong>Catatan:</strong> Perdes dan SK BUMDes sudah terintegrasi dengan fitur Produk Hukum Desa. 
						Silakan upload file-file dokumen BUMDes lainnya di bawah ini.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[
							{ key: 'ProfilBUMDesa', label: 'Profil BUMDes' },
							{ key: 'BeritaAcara', label: 'Berita Acara' },
							{ key: 'AnggaranDasar', label: 'Anggaran Dasar' },
							{ key: 'AnggaranRumahTangga', label: 'Anggaran Rumah Tangga' },
							{ key: 'ProgramKerja', label: 'Program Kerja' }
						].map(doc => (
								<div key={doc.key} className="space-y-2">
									<label className="block text-sm font-medium text-slate-700">
										{doc.label}
									</label>
									<input
										type="file"
										accept=".pdf,.doc,.docx"
										onChange={(e) => {
											const file = e.target.files[0];
											if (file) {
												if (file.size > 5 * 1024 * 1024) {
													Swal.fire('Error', 'Ukuran file maksimal 5MB', 'error');
													e.target.value = '';
													return;
												}
												setFileUploads(prev => ({
													...prev,
													[doc.key]: file
												}));
											}
										}}
										className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
									/>
									{fileUploads[doc.key] && (
										<p className="text-xs text-slate-600 flex items-center gap-1">
											<FiFileText /> {fileUploads[doc.key].name}
										</p>
									)}
									{formData[doc.key] && !fileUploads[doc.key] && (
										<p className="text-xs text-slate-600 flex items-center gap-1">
											<FiFileText /> File tersimpan: {formData[doc.key].split('/').pop()}
										</p>
									)}
								</div>
							))}
						</div>
					</div>

					{/* File Upload Info */}
					<div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
						<p className="flex items-center gap-2 text-sm text-amber-800">
							<FiAlertCircle className="flex-shrink-0" />
							Format file yang didukung: PDF, DOC, DOCX. Ukuran maksimal: 5MB per file
						</p>
					</div>
				</div>
			))}

			{/* Footer Info */}
			<div className="rounded-xl border border-slate-200 bg-white p-5">
				<div className="flex items-start gap-3">
					<FiAlertCircle className="mt-0.5 flex-shrink-0 text-slate-400" />
					<div className="text-sm text-slate-600">
						<p className="mb-1.5 font-semibold text-slate-900">Catatan Penting</p>
						<ul className="list-inside list-disc space-y-1 leading-6">
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
