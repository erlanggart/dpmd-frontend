// src/components/desa/ProfilDesa.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../../api";
import Swal from "sweetalert2";
import {
	MapContainer,
	TileLayer,
	Marker,
	Popup,
	useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
	FiPhone,
	FiMail,
	FiInstagram,
	FiYoutube,
	FiMapPin,
	FiEdit,
} from "react-icons/fi";

// At the top of your ProfilDesa.jsx file
import { z, ZodError } from "zod";

// Fix ikon default Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		"https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
	iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
	shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL;
const ImageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const profilSchema = z.object({
	jumlah_penduduk: z.coerce
		.number()
		.positive("Jumlah penduduk harus angka positif.")
		.optional()
		.nullable(),
	sejarah_desa: z.string().optional().nullable(),
	demografi: z.string().optional().nullable(),
	potensi_desa: z.string().optional().nullable(),
	no_telp: z
		.string()
		.max(20, "No. Telepon terlalu panjang.")
		.optional()
		.nullable(),
	email: z.string().email("Format email tidak valid.").optional().nullable(),
	instagram_url: z
		.string()
		.url("URL Instagram tidak valid.")
		.optional()
		.nullable(),
	youtube_url: z.string().url("URL YouTube tidak valid.").optional().nullable(),
	luas_wilayah: z.string().max(255).optional().nullable(),
	alamat_kantor: z.string().optional().nullable(),
	radius_ke_kecamatan: z.string().max(255).optional().nullable(),
	latitude: z.coerce.number().optional().nullable(),
	longitude: z.coerce.number().optional().nullable(),
	// We don't validate the IDs or file paths here
});

// Komponen kecil untuk mengambil koordinat saat peta diklik
const LocationMarker = ({ onPositionChange }) => {
	useMapEvents({
		click(e) {
			onPositionChange(e.latlng);
		},
	});
	return null;
};

const ProfilDesa = () => {
	const [profil, setProfil] = useState({});
	const [initialProfil, setInitialProfil] = useState({});
	const [loading, setLoading] = useState(true);
	const [editMode, setEditMode] = useState(false);
	const [foto, setFoto] = useState(null);
	const [fotoPreview, setFotoPreview] = useState(null);
	const [errors, setErrors] = useState({});

	const fetchProfil = useCallback(async () => {
		try {
			setLoading(true);
			const res = await api.get("/profil-desa");
			setProfil(res.data);
			setInitialProfil(res.data);
		} catch (err) {
			console.error(err);
			Swal.fire("Error", "Gagal memuat profil desa.", "error");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchProfil();
	}, [fetchProfil]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setProfil((prev) => ({ ...prev, [name]: value }));
	};

	const handleFileChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			setFoto(file);
			setFotoPreview(URL.createObjectURL(file));
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		
		setErrors({}); // <-- Bersihkan error lama

		// --- BLOK VALIDASI ---
		try {
			console.log('Running validation...');
			profilSchema.parse(profil); // <-- Jalankan validasi
			console.log('Validation passed');
		} catch (error) {
			console.error('Validation failed:', error);
			if (error instanceof ZodError) {
				const formattedErrors = {};
				error.errors.forEach((err) => {
					formattedErrors[err.path[0]] = err.message;
				});

				setErrors(formattedErrors); // <-- Simpan error ke state
				Swal.fire(
					"Input Tidak Valid",
					"Silakan periksa kembali data yang Anda masukkan.",
					"error"
				);
				return; // <-- Hentikan submit jika validasi gagal
			}
		}
		// ----------------------

		const formData = new FormData();
		Object.keys(profil).forEach((key) => {
			if (profil[key] !== null && profil[key] !== undefined) {
				formData.append(key, profil[key]);
			}
		});

		if (foto) {
			formData.append("foto_kantor_desa", foto);
		}



		try {
			const response = await api.post("/profil-desa", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			Swal.fire("Berhasil!", "Profil desa telah diperbarui.", "success");
			setEditMode(false);
			fetchProfil();
		} catch (error) {
			console.error('API error:', error);
			console.error('API error response:', error.response);
			Swal.fire("Gagal!", `Terjadi kesalahan saat menyimpan: ${error.response?.data?.message || error.message}`, "error");
		}
		
		console.log('=== SUBMIT DEBUG END ===');
	};

	const handleCancel = () => {
		setProfil(initialProfil);
		setEditMode(false);
		setFoto(null);
		setFotoPreview(null);
	};

	if (loading)
		return <p className="text-center text-gray-500">Memuat profil desa...</p>;

	const mapPosition = [
		profil.latitude || -6.595018,
		profil.longitude || 106.816635,
	];

	return (
		<div className="bg-white border border-white p-6 rounded-2xl shadow-lg">
			<div className="flex justify-between items-center mb-6 border-b pb-4">
				<h2 className="text-2xl font-bold text-gray-800">Profil Desa</h2>
				{!editMode ? (
					<button
						onClick={() => setEditMode(true)}
						className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
					>
						<FiEdit /> Edit Profil
					</button>
				) : (
					<button
						onClick={handleCancel}
						className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
					>
						Batal
					</button>
				)}
			</div>

			{editMode ? (
				// --- FORM EDIT ---
				// Ganti blok <form>...</form> di dalam ProfilDesa.jsx dengan ini:

				<form onSubmit={handleSubmit} className="space-y-8">
					<div className="border-b border-gray-200 pb-6">
						<h3 className="text-lg font-semibold text-gray-800">
							Informasi Umum
						</h3>
						<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Klasifikasi Desa
								</label>
								<div
									className={`bg-slate-100 mt-1 px-4 py-2  rounded-md shadow-sm ${
										errors.klasifikasi_desa
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									<select
										name="klasifikasi_desa"
										value={profil.klasifikasi_desa || ""}
										onChange={handleChange}
										className={`block w-full `}
									>
										<option value="" disabled>
											Pilih Opsi
										</option>
										<option value="Desa Tradisional">Desa Tradisional</option>
										<option value="Desa Swadaya">Desa Swadaya</option>
										<option value="Desa Swakarya">Desa Swakarya</option>
										<option value="Desa Swasembada">Desa Swasembada</option>
									</select>
								</div>
								{errors.klasifikasi_desa && (
									<p className="mt-1 text-xs text-red-600">
										{errors.klasifikasi_desa}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Status Desa / IDM
								</label>
								<div
									className={`bg-slate-100 mt-1 px-4 py-2  rounded-md shadow-sm ${
										errors.status_desa
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									<select
										name="status_desa"
										value={profil.status_desa || ""}
										onChange={handleChange}
										className={`block w-full`}
									>
										<option value="" disabled>
											Pilih Opsi
										</option>
										<option value="Desa Tertinggal">Desa Tertinggal</option>
										<option value="Desa Berkembang">Desa Berkembang</option>
										<option value="Desa Maju">Desa Maju</option>
										<option value="Desa Mandiri">Desa Mandiri</option>
									</select>
								</div>

								{errors.status_desa && (
									<p className="mt-1 text-xs text-red-600">
										{errors.status_desa}
									</p>
								)}
							</div>
							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700">
									Tipologi Desa
								</label>
								<div
									className={`bg-slate-100 mt-1 px-4 py-2  rounded-md shadow-sm ${
										errors.tipologi_desa
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									<select
										name="tipologi_desa"
										value={profil.tipologi_desa || ""}
										onChange={handleChange}
										className={`block w-full`}
									>
										<option value="" disabled>
											Pilih Opsi
										</option>
										<option value="Kehutanan">Kehutanan</option>
										<option value="Perikanan">Perikanan</option>
										<option value="Perindustrian/Jasa">
											Perindustrian/Jasa
										</option>
										<option value="Perkebunan">Perkebunan</option>
										<option value="Perladangan">Perladangan</option>
										<option value="Persawahan">Persawahan</option>
										<option value="Pertambangan">Pertambangan</option>
										<option value="Pesisir/Nelayan">Pesisir/Nelayan</option>
										<option value="Peternakan">Peternakan</option>
										<option value="Tidak Terdefinisi">Tidak Terdefinisi</option>
									</select>
								</div>

								{errors.tipologi_desa && (
									<p className="mt-1 text-xs text-red-600">
										{errors.tipologi_desa}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Jumlah Penduduk
								</label>
								<div
									className={`mt-1 bg-slate-100 px-4 py-2 rounded-md border-gray-300 shadow-sm ${
										errors.jumlah_penduduk
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									<input
										type="number"
										name="jumlah_penduduk"
										value={profil.jumlah_penduduk || ""}
										onChange={handleChange}
										className={`block w-full `}
									/>
									{errors.jumlah_penduduk && (
										<p className="mt-1 text-xs text-red-600">
											{errors.jumlah_penduduk}
										</p>
									)}
								</div>
							</div>
						</div>
						<div className="mt-4">
							<label className="block text-sm font-medium text-gray-700">
								Sejarah Desa
							</label>
							<div
								className={`bg-slate-100 mt-1 px-4 py-2  rounded-md shadow-sm ${
									errors.sejarah_desa
										? "border-red-500"
										: " border-slate-300 border"
								}`}
							>
								<textarea
									name="sejarah_desa"
									value={profil.sejarah_desa || ""}
									onChange={handleChange}
									rows="5"
									className={`block w-full `}
								></textarea>
							</div>
							{errors.sejarah_desa && (
								<p className="mt-1 text-xs text-red-600">
									{errors.sejarah_desa}
								</p>
							)}
						</div>
					</div>

					{/* --- Bagian Kontak & Media Sosial --- */}
					<div className="border-b border-gray-200 pb-6">
						<h3 className="text-lg font-semibold text-gray-800">
							Kontak & Media Sosial
						</h3>
						<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700">
									No. Telepon Kantor
								</label>
								<div
									className={`bg-slate-100 mt-1 px-4 py-2 rounded-md shadow-sm ${
										errors.no_telp
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									<input
										type="text"
										name="no_telp"
										value={profil.no_telp || ""}
										onChange={handleChange}
										className={`block w-full `}
									/>
								</div>
								{errors.no_telp && (
									<p className="mt-1 text-xs text-red-600">{errors.no_telp}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Email Desa
								</label>
								<div
									className={`bg-slate-100 mt-1 px-4 py-2 rounded-md shadow-sm ${
										errors.email ? "border-red-500" : "border-slate-300 border"
									}`}
								>
									{" "}
									<input
										type="email"
										name="email"
										value={profil.email || ""}
										onChange={handleChange}
										className={`block w-full `}
									/>
								</div>

								{errors.email && (
									<p className="mt-1 text-xs text-red-600">{errors.email}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									URL Instagram
								</label>
								<div
									className={` bg-slate-100 mt-1 px-4 py-2 rounded-md shadow-sm ${
										errors.instagram_url
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									<input
										type="url"
										name="instagram_url"
										value={profil.instagram_url || ""}
										onChange={handleChange}
										className={` block w-full `}
										placeholder="https://instagram.com/..."
									/>
								</div>

								{errors.instagram_url && (
									<p className="mt-1 text-xs text-red-600">
										{errors.instagram_url}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									URL YouTube
								</label>
								<div
									className={`bg-slate-100 mt-1 px-4 py-2 rounded-md shadow-sm ${
										errors.youtube_url
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									<input
										type="url"
										name="youtube_url"
										value={profil.youtube_url || ""}
										onChange={handleChange}
										className={`block w-full`}
										placeholder="https://youtube.com/..."
									/>
								</div>

								{errors.youtube_url && (
									<p className="mt-1 text-xs text-red-600">
										{errors.youtube_url}
									</p>
								)}
							</div>
						</div>
					</div>

					{/* --- Bagian Data Wilayah & Potensi --- */}
					<div className="border-b border-gray-200 pb-6">
						<h3 className="text-lg font-semibold text-gray-800">
							Data Wilayah & Potensi
						</h3>
						<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Luas Wilayah (km²)
								</label>
								<div
									className={`bg-slate-100 mt-1 px-4 py-2 rounded-md shadow-sm ${
										errors.luas_wilayah
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									<input
										type="text"
										name="luas_wilayah"
										value={profil.luas_wilayah || ""}
										onChange={handleChange}
										className={`block w-full `}
									/>
								</div>

								{errors.luas_wilayah && (
									<p className="mt-1 text-xs text-red-600">
										{errors.luas_wilayah}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Jarak ke Kecamatan (km)
								</label>
								<div
									className={`bg-slate-100 mt-1 px-4 py-2 rounded-md shadow-sm ${
										errors.radius_ke_kecamatan
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									<input
										type="text"
										name="radius_ke_kecamatan"
										value={profil.radius_ke_kecamatan || ""}
										onChange={handleChange}
										className={`block w-full }`}
									/>
								</div>
								{errors.radius_ke_kecamatan && (
									<p className="mt-1 text-xs text-red-600">
										{errors.radius_ke_kecamatan}
									</p>
								)}
							</div>
						</div>
						<div className="mt-4">
							<label className="block text-sm font-medium text-gray-700">
								Demografi
							</label>
							<div
								className={`bg-slate-100 mt-1 px-4 py-2 rounded-md shadow-sm ${
									errors.demografi
										? "border-red-500"
										: "border-slate-300 border"
								}`}
							>
								<textarea
									name="demografi"
									value={profil.demografi || ""}
									onChange={handleChange}
									rows="5"
									className={`block w-full `}
								></textarea>
							</div>

							{errors.demografi && (
								<p className="mt-1 text-xs text-red-600">{errors.demografi}</p>
							)}
						</div>
						<div className="mt-4">
							<label className="block text-sm font-medium text-gray-700">
								Potensi Desa
							</label>
							<div
								className={` bg-slate-100 mt-1 px-4 py-2 rounded-md shadow-sm ${
									errors.potensi_desa
										? "border-red-500"
										: "border-slate-300 border"
								}`}
							>
								{" "}
								<textarea
									name="potensi_desa"
									value={profil.potensi_desa || ""}
									onChange={handleChange}
									rows="5"
									className={` block w-full `}
								></textarea>
							</div>

							{errors.potensi_desa && (
								<p className="mt-1 text-xs text-red-600">
									{errors.potensi_desa}
								</p>
							)}
						</div>
					</div>

					{/* --- Bagian Lokasi & Foto --- */}
					<div>
						<h3 className="text-lg font-semibold text-gray-800">
							Lokasi & Foto
						</h3>
						<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Alamat Kantor Desa
								</label>
								<div
									className={`bg-slate-100 mt-1 px-4 py-2 rounded-md shadow-sm ${
										errors.alamat_kantor
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									{" "}
									<textarea
										name="alamat_kantor"
										value={profil.alamat_kantor || ""}
										onChange={handleChange}
										rows="3"
										className={`block w-full `}
									></textarea>
								</div>

								{errors.alamat_kantor && (
									<p className="mt-1 text-xs text-red-600">
										{errors.alamat_kantor}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Ganti Foto Kantor Desa
								</label>
								<input
									type="file"
									name="foto_kantor_desa"
									onChange={handleFileChange}
									className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-gray-100 file:text-primary hover:file:bg-gray-200"
								/>
								{(fotoPreview ||
									(profil.foto_kantor_desa_path && BACKEND_URL)) && (
									<img
										src={
											fotoPreview ||
											`${ImageBaseUrl}/uploads/${profil.foto_kantor_desa_path}`
										}
										alt="Preview"
										className="mt-2 h-32 w-auto rounded-lg shadow-sm"
									/>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Latitude
								</label>
								<div
									className={`bg-slate-100 mt-1 px-4 py-2 rounded-md shadow-sm ${
										errors.latitude
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									{" "}
									<input
										type="number"
										step="any"
										name="latitude"
										value={profil.latitude || ""}
										onChange={handleChange}
										className={` block w-full `}
									/>
								</div>

								{errors.latitude && (
									<p className="mt-1 text-xs text-red-600">{errors.latitude}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Longitude
								</label>
								<div
									className={`bg-slate-100 mt-1 px-4 py-2 rounded-md shadow-sm ${
										errors.longitude
											? "border-red-500"
											: "border-slate-300 border"
									}`}
								>
									<input
										type="number"
										step="any"
										name="longitude"
										value={profil.longitude || ""}
										onChange={handleChange}
										className={`block w-full`}
									/>
								</div>

								{errors.longitude && (
									<p className="mt-1 text-xs text-red-600">
										{errors.longitude}
									</p>
								)}
							</div>
						</div>
						<div className="h-96 w-full mt-6 rounded-lg shadow overflow-hidden">
							<MapContainer
								center={mapPosition}
								zoom={15}
								scrollWheelZoom={false}
								style={{ height: "100%", width: "100%" }}
							>
								<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
								{profil.latitude && profil.longitude && (
									<Marker position={[profil.latitude, profil.longitude]} />
								)}
								<LocationMarker
									onPositionChange={(latlng) => {
										setProfil((prev) => ({
											...prev,
											latitude: latlng.lat,
											longitude: latlng.lng,
										}));
									}}
								/>
							</MapContainer>
							<p className="text-xs text-gray-500 mt-1">
								Klik pada peta untuk mengubah titik lokasi.
							</p>
						</div>
					</div>
					{/* --- Tombol Aksi --- */}
					<div className="flex justify-end gap-4 pt-4 border-t">
						<button
							type="button"
							onClick={handleCancel}
							className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
						>
							Batal
						</button>
						<button
							type="submit"
							className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
						>
							Simpan Perubahan
						</button>
					</div>
				</form>
			) : (
				// Ganti blok <div>...</div> setelah 'editMode ? (...) :' di dalam ProfilDesa.jsx dengan ini:

				<div className="space-y-8">
					{/* --- Bagian Foto & Informasi Utama --- */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						<div className="lg:col-span-1">
							{profil.foto_kantor_desa_path ? (
								<img
									src={`${ImageBaseUrl}/uploads/${profil.foto_kantor_desa_path}`}
									alt={`Kantor Desa ${profil.desa?.nama}`}
									className="w-full h-auto object-cover rounded-lg shadow-md"
								/>
							) : (
								<div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
									<p className="text-gray-500">Tidak ada foto</p>
								</div>
							)}
						</div>
						<div className="lg:col-span-2 bg-gray-50 p-6 rounded-lg">
							<h3 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">
								Informasi Umum
							</h3>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
								<div>
									<p className="text-gray-500">Klasifikasi</p>
									<p className="font-semibold text-gray-700">
										{profil.klasifikasi_desa || "-"}
									</p>
								</div>
								<div>
									<p className="text-gray-500">Status Desa/IDM</p>
									<p className="font-semibold text-gray-700">
										{profil.status_desa || "-"}
									</p>
								</div>
								<div>
									<p className="text-gray-500">Tipologi</p>
									<p className="font-semibold text-gray-700">
										{profil.tipologi_desa || "-"}
									</p>
								</div>
								<div>
									<p className="text-gray-500">Jumlah Penduduk</p>
									<p className="font-semibold text-gray-700">
										{profil.jumlah_penduduk
											? new Intl.NumberFormat("id-ID").format(
													profil.jumlah_penduduk
											  ) + " Jiwa"
											: "-"}
									</p>
								</div>
								<div>
									<p className="text-gray-500">Luas Wilayah</p>
									<p className="font-semibold text-gray-700">
										{profil.luas_wilayah ? profil.luas_wilayah + " km²" : "-"}
									</p>
								</div>
								<div>
									<p className="text-gray-500">Jarak ke Kecamatan</p>
									<p className="font-semibold text-gray-700">
										{profil.radius_ke_kecamatan
											? profil.radius_ke_kecamatan + " km"
											: "-"}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* --- Bagian Deskripsi: Sejarah, Demografi, Potensi --- */}
					<div className="space-y-6">
						<div>
							<h3 className="text-lg font-bold text-gray-700">Sejarah Desa</h3>
							<p className="mt-2 text-gray-600 whitespace-pre-wrap text-justify">
								{profil.sejarah_desa || "Belum ada data."}
							</p>
						</div>
						<div>
							<h3 className="text-lg font-bold text-gray-700">Demografi</h3>
							<p className="mt-2 text-gray-600 whitespace-pre-wrap text-justify">
								{profil.demografi || "Belum ada data."}
							</p>
						</div>
						<div>
							<h3 className="text-lg font-bold text-gray-700">Potensi Desa</h3>
							<p className="mt-2 text-gray-600 whitespace-pre-wrap text-justify">
								{profil.potensi_desa || "Belum ada data."}
							</p>
						</div>
					</div>

					{/* --- Bagian Lokasi & Kontak --- */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 border-t">
						<div className="lg:col-span-1 bg-gray-50 p-4 rounded-lg space-y-3">
							<h3 className="font-bold text-gray-700 border-b pb-2 mb-3">
								Lokasi & Kontak
							</h3>
							<div className="flex items-start gap-3 text-sm">
								<FiMapPin className="text-primary mt-1 flex-shrink-0" />
								<span className="text-gray-600">
									{profil.alamat_kantor || "-"}
								</span>
							</div>
							<div className="flex items-center gap-3 text-sm">
								<FiPhone className="text-primary flex-shrink-0" />
								<span className="text-gray-600">{profil.no_telp || "-"}</span>
							</div>
							<div className="flex items-center gap-3 text-sm">
								<FiMail className="text-primary flex-shrink-0" />
								<span className="text-gray-600">{profil.email || "-"}</span>
							</div>
							<div className="flex items-center gap-3 text-sm">
								<FiInstagram className="text-primary flex-shrink-0" />
								<a
									href={profil.instagram_url || "#"}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:underline break-all"
								>
									{profil.instagram_url || "-"}
								</a>
							</div>
							<div className="flex items-center gap-3 text-sm">
								<FiYoutube className="text-primary flex-shrink-0" />
								<a
									href={profil.youtube_url || "#"}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:underline break-all"
								>
									{profil.youtube_url || "-"}
								</a>
							</div>
						</div>

						<div className="lg:col-span-2 h-80 w-full rounded-lg shadow-md overflow-hidden">
							<MapContainer
								center={mapPosition}
								zoom={15}
								scrollWheelZoom={false}
								style={{ height: "100%", width: "100%" }}
							>
								<TileLayer
									attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
									url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
								/>
								{profil.latitude && profil.longitude && (
									<Marker position={mapPosition}>
										<Popup>{profil.desa?.nama || "Kantor Desa"}</Popup>
									</Marker>
								)}
							</MapContainer>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProfilDesa;
