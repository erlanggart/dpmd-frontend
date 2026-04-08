import React, { useCallback, useEffect, useState } from "react";
import api from "../../api";
import Swal from "sweetalert2";
import {
	MapContainer,
	Marker,
	Popup,
	TileLayer,
	useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
	FiAlertCircle,
	FiBarChart2,
	FiCamera,
	FiCheckCircle,
	FiEdit,
	FiGlobe,
	FiHome,
	FiImage,
	FiInstagram,
	FiLayers,
	FiMail,
	FiMap,
	FiMapPin,
	FiNavigation,
	FiPhone,
	FiSave,
	FiUploadCloud,
	FiUsers,
	FiX,
	FiYoutube,
} from "react-icons/fi";
import { z, ZodError } from "zod";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		"https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
	iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
	shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL;
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;

const KLASIFIKASI_OPTIONS = [
	"Desa Tradisional",
	"Desa Swadaya",
	"Desa Swakarya",
	"Desa Swasembada",
];

const STATUS_OPTIONS = [
	"Desa Tertinggal",
	"Desa Berkembang",
	"Desa Maju",
	"Desa Mandiri",
];

const TIPOLOGI_OPTIONS = [
	"Kehutanan",
	"Perikanan",
	"Perindustrian/Jasa",
	"Perkebunan",
	"Perladangan",
	"Persawahan",
	"Pertambangan",
	"Pesisir/Nelayan",
	"Peternakan",
	"Tidak Terdefinisi",
];

const EDITABLE_FIELDS = [
	"klasifikasi_desa",
	"status_desa",
	"tipologi_desa",
	"jumlah_penduduk",
	"sejarah_desa",
	"demografi",
	"potensi_desa",
	"no_telp",
	"email",
	"instagram_url",
	"youtube_url",
	"luas_wilayah",
	"alamat_kantor",
	"radius_ke_kecamatan",
	"latitude",
	"longitude",
];

const COMPLETION_FIELDS = [
	{ key: "klasifikasi_desa", label: "Klasifikasi desa" },
	{ key: "status_desa", label: "Status desa / IDM" },
	{ key: "tipologi_desa", label: "Tipologi desa" },
	{ key: "jumlah_penduduk", label: "Jumlah penduduk" },
	{ key: "sejarah_desa", label: "Sejarah desa" },
	{ key: "demografi", label: "Demografi" },
	{ key: "potensi_desa", label: "Potensi desa" },
	{ key: "no_telp", label: "Nomor telepon" },
	{ key: "email", label: "Email desa" },
	{ key: "luas_wilayah", label: "Luas wilayah" },
	{ key: "alamat_kantor", label: "Alamat kantor" },
	{ key: "latitude", label: "Latitude" },
	{ key: "longitude", label: "Longitude" },
	{ key: "foto_kantor_desa_path", label: "Foto kantor desa" },
];

const profilSchema = z.object({
	jumlah_penduduk: z
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
	youtube_url: z
		.string()
		.url("URL YouTube tidak valid.")
		.optional()
		.nullable(),
	luas_wilayah: z.string().max(255).optional().nullable(),
	alamat_kantor: z.string().optional().nullable(),
	radius_ke_kecamatan: z.string().max(255).optional().nullable(),
	latitude: z.number().optional().nullable(),
	longitude: z.number().optional().nullable(),
	klasifikasi_desa: z.string().optional().nullable(),
	status_desa: z.string().optional().nullable(),
	tipologi_desa: z.string().optional().nullable(),
});

const INPUT_CLASS =
	"w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";

const ERROR_INPUT_CLASS =
	"border-rose-300 focus:border-rose-400 focus:ring-rose-100";

const SECTION_CLASS =
	"rounded-lg border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.55)] backdrop-blur-sm";

const isFilled = (value) => {
	if (value === null || value === undefined) {
		return false;
	}

	if (typeof value === "string") {
		return value.trim() !== "";
	}

	return true;
};

const formatNumber = (value) => new Intl.NumberFormat("id-ID").format(Number(value || 0));

const safeText = (value, fallback = "Belum diisi") =>
	isFilled(value) ? String(value) : fallback;

const formatDateLabel = (value) => {
	if (!value) {
		return "Belum pernah diperbarui";
	}

	return new Date(value).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
};

const getProfileImageUrl = (path) => {
	if (!path) {
		return null;
	}

	if (/^https?:\/\//i.test(path)) {
		return path;
	}

	const baseUrl = (IMAGE_BASE_URL || BACKEND_URL || "").replace(/\/$/, "");
	const normalizedPath = String(path).replace(/^\/+/, "");

	return baseUrl ? `${baseUrl}/uploads/${normalizedPath}` : null;
};

const normalizeProfileForSubmit = (source) => {
	const normalized = {};

	EDITABLE_FIELDS.forEach((field) => {
		let value = source[field];

		if (typeof value === "string") {
			value = value.trim();
		}

		if (["jumlah_penduduk", "latitude", "longitude"].includes(field)) {
			if (value === "" || value === null || value === undefined) {
				normalized[field] = null;
				return;
			}

			normalized[field] = Number(value);
			return;
		}

		normalized[field] = value === "" ? null : value;
	});

	return normalized;
};

const getCompletionStats = (profile, hasPhoto) => {
	const items = COMPLETION_FIELDS.map((item) => ({
		...item,
		filled:
			item.key === "foto_kantor_desa_path"
				? hasPhoto
				: isFilled(profile?.[item.key]),
	}));

	const filled = items.filter((item) => item.filled).length;
	const total = items.length;

	return {
		items,
		filled,
		total,
		percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
	};
};

const getProgressTone = (percentage) => {
	if (percentage >= 80) {
		return {
			badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
			bar: "from-emerald-400 via-teal-500 to-cyan-500",
		};
	}

	if (percentage >= 45) {
		return {
			badge: "bg-amber-100 text-amber-700 border-amber-200",
			bar: "from-amber-400 via-orange-500 to-rose-500",
		};
	}

	return {
		badge: "bg-slate-200 text-slate-700 border-slate-300",
		bar: "from-slate-300 via-slate-400 to-slate-500",
	};
};

const LocationMarker = ({ onPositionChange }) => {
	useMapEvents({
		click(event) {
			onPositionChange(event.latlng);
		},
	});

	return null;
};

const SectionCard = ({ icon, eyebrow, title, description, children, className = "" }) => {
	const IconComponent = icon;

	return (
		<section className={`${SECTION_CLASS} ${className}`.trim()}>
			<div className="mb-6 flex items-start gap-4">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
					{IconComponent ? <IconComponent className="h-5 w-5" /> : null}
				</div>
				<div>
					{eyebrow ? (
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
							{eyebrow}
						</p>
					) : null}
					<h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
						{title}
					</h3>
					{description ? (
						<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
							{description}
						</p>
					) : null}
				</div>
			</div>
			{children}
		</section>
	);
};

const MetricCard = ({ icon, label, value, hint, accentClass }) => {
	const IconComponent = icon;

	return (
		<div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
						{label}
					</p>
					<p className="mt-3 text-2xl font-black tracking-tight text-white">
						{value}
					</p>
					<p className="mt-2 text-xs leading-5 text-white/70">{hint}</p>
				</div>
				<div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accentClass}`}>
					{IconComponent ? <IconComponent className="h-5 w-5" /> : null}
				</div>
			</div>
		</div>
	);
};

const FieldGroup = ({ label, hint, error, children }) => (
	<label className="block">
		<div className="mb-2 flex items-center justify-between gap-3">
			<span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
				{label}
			</span>
			{hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
		</div>
		{children}
		{error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}
	</label>
);

const ProgressChecklist = ({ items }) => (
	<div className="space-y-3">
		{items.map((item) => (
			<div
				key={item.label}
				className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
					item.filled
						? "border-emerald-100 bg-emerald-50 text-emerald-700"
						: "border-slate-200 bg-slate-50 text-slate-500"
				}`}
			>
				{item.filled ? (
					<FiCheckCircle className="h-4 w-4 shrink-0" />
				) : (
					<FiAlertCircle className="h-4 w-4 shrink-0" />
				)}
				<span>{item.label}</span>
			</div>
		))}
	</div>
);

const LinkRow = ({ icon, label, value }) => {
	const IconComponent = icon;
	const hasValue = isFilled(value);

	return (
		<div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
			<div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
				{IconComponent ? <IconComponent className="h-4 w-4" /> : null}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
					{label}
				</p>
				{hasValue ? (
					<a
						href={value}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-1 block break-all font-medium text-slate-700 transition hover:text-emerald-600"
					>
						{value}
					</a>
				) : (
					<p className="mt-1 text-slate-400">Belum dihubungkan</p>
				)}
			</div>
		</div>
	);
};

const NarrativeRow = ({ icon, title, value, emptyText, accentClass }) => {
	const IconComponent = icon;
	const hasValue = isFilled(value);

	return (
		<div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
			<div className="flex items-center gap-3">
				<div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accentClass} text-white shadow-sm`}>
					{IconComponent ? <IconComponent className="h-4 w-4" /> : null}
				</div>
				<h4 className="text-sm font-bold text-slate-800">{title}</h4>
			</div>
			<div className="mt-3 rounded-lg border border-slate-100 bg-white p-4">
				<p className={`whitespace-pre-wrap text-sm leading-7 ${hasValue ? "text-slate-600" : "text-slate-400 italic"}`}>
					{hasValue ? value : emptyText}
				</p>
			</div>
		</div>
	);
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
			const response = await api.get("/profil-desa");
			setProfil(response.data);
			setInitialProfil(response.data);
		} catch (error) {
			console.error(error);
			Swal.fire("Error", "Gagal memuat profil desa.", "error");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchProfil();
	}, [fetchProfil]);

	useEffect(() => {
		return () => {
			if (fotoPreview && fotoPreview.startsWith("blob:")) {
				URL.revokeObjectURL(fotoPreview);
			}
		};
	}, [fotoPreview]);

	const handleChange = (event) => {
		const { name, value } = event.target;
		setProfil((previous) => ({ ...previous, [name]: value }));
	};

	const handleFileChange = (event) => {
		const file = event.target.files?.[0];

		if (!file) {
			return;
		}

		if (fotoPreview && fotoPreview.startsWith("blob:")) {
			URL.revokeObjectURL(fotoPreview);
		}

		setFoto(file);
		setFotoPreview(URL.createObjectURL(file));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setErrors({});

		const normalizedProfile = normalizeProfileForSubmit(profil);

		try {
			profilSchema.parse(normalizedProfile);
		} catch (error) {
			if (error instanceof ZodError) {
				const formattedErrors = {};

				error.errors.forEach((item) => {
					formattedErrors[item.path[0]] = item.message;
				});

				setErrors(formattedErrors);
				Swal.fire(
					"Input Tidak Valid",
					"Silakan periksa kembali data yang Anda masukkan.",
					"error"
				);
				return;
			}
		}

		const formData = new FormData();

		EDITABLE_FIELDS.forEach((field) => {
			const value = normalizedProfile[field];
			if (value !== null && value !== undefined) {
				formData.append(field, value);
			}
		});

		if (foto) {
			formData.append("foto_kantor_desa", foto);
		}

		try {
			await api.post("/profil-desa", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});

			Swal.fire("Berhasil!", "Profil desa telah diperbarui.", "success");
			setEditMode(false);
			setFoto(null);
			setFotoPreview(null);
			await fetchProfil();
		} catch (error) {
			console.error("API error:", error);
			Swal.fire(
				"Gagal!",
				`Terjadi kesalahan saat menyimpan: ${error.response?.data?.message || error.message}`,
				"error"
			);
		}
	};

	const handleCancel = () => {
		setProfil(initialProfil);
		setEditMode(false);
		setFoto(null);
		setFotoPreview(null);
		setErrors({});
	};

	if (loading) {
		return (
			<div className="relative overflow-hidden rounded-lg border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-8 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.45)]">
				<div className="flex min-h-[320px] flex-col items-center justify-center text-center">
					<div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-200/60">
						<FiHome className="h-8 w-8 animate-pulse" />
					</div>
					<h2 className="text-2xl font-black tracking-tight text-slate-900">
						Memuat profil desa
					</h2>
					<p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
						Sedang mengambil informasi identitas, lokasi, dan data publik desa.
					</p>
					<div className="mt-8 h-2 w-full max-w-xs overflow-hidden rounded-lg bg-slate-200">
						<div className="h-full w-1/2 animate-pulse rounded-lg bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
					</div>
				</div>
			</div>
		);
	}

	const latitude = isFilled(profil.latitude) ? Number(profil.latitude) : null;
	const longitude = isFilled(profil.longitude) ? Number(profil.longitude) : null;
	const hasCoordinates =
		latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude);
	const mapPosition = hasCoordinates
		? [latitude, longitude]
		: [-6.595018, 106.816635];
	const imageUrl = fotoPreview || getProfileImageUrl(profil.foto_kantor_desa_path);
	const villageLabel =
		profil.desa?.status_pemerintahan === "desa" ? "Desa" : "Kelurahan";
	const completion = getCompletionStats(profil, Boolean(imageUrl));
	const progressTone = getProgressTone(completion.percentage);
	const summaryChecklist = [
		{
			label: "Identitas dasar desa",
			filled:
				isFilled(profil.klasifikasi_desa) &&
				isFilled(profil.status_desa) &&
				isFilled(profil.tipologi_desa),
		},
		{
			label: "Kontak resmi desa",
			filled: isFilled(profil.no_telp) || isFilled(profil.email),
		},
		{
			label: "Cerita dan potensi desa",
			filled:
				isFilled(profil.sejarah_desa) &&
				isFilled(profil.demografi) &&
				isFilled(profil.potensi_desa),
		},
		{
			label: "Lokasi kantor desa",
			filled: isFilled(profil.alamat_kantor) && hasCoordinates,
		},
		{
			label: "Dokumentasi visual kantor",
			filled: Boolean(imageUrl),
		},
	];
	const narrativeItems = [
		{
			icon: FiHome,
			label: "Narasi desa",
			title: "Sejarah desa",
			description: "Cerita asal-usul, perjalanan, dan momen penting yang membentuk identitas desa.",
			value: profil.sejarah_desa,
			emptyText: "Belum ada sejarah desa yang dituliskan.",
			accentClass: "from-emerald-400 via-teal-500 to-cyan-500",
		},
		{
			icon: FiUsers,
			label: "Narasi desa",
			title: "Demografi",
			description: "Gambaran sosial dan penduduk desa yang memberi konteks terhadap kondisi lapangan.",
			value: profil.demografi,
			emptyText: "Belum ada data demografi yang dituliskan.",
			accentClass: "from-sky-400 via-blue-500 to-indigo-500",
		},
		{
			icon: FiGlobe,
			label: "Narasi desa",
			title: "Potensi desa",
			description: "Keunggulan utama, sumber daya, dan peluang pengembangan yang dimiliki desa.",
			value: profil.potensi_desa,
			emptyText: "Belum ada potensi desa yang dituliskan.",
			accentClass: "from-amber-400 via-orange-500 to-rose-500",
		},
	];

	return (
		<div className="relative overflow-hidden rounded-lg border border-slate-200/70 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-4 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.45)] sm:p-6 lg:p-8">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl" />
				<div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />
			</div>

			<div className="relative z-10 space-y-8">
				<section className="overflow-hidden rounded-lg bg-gradient-to-br from-emerald-950 via-teal-800 to-cyan-600 p-6 text-white shadow-[0_32px_90px_-40px_rgba(13,148,136,0.9)] sm:p-8">
						<div className="space-y-6">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div className="max-w-3xl">
									<div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/75 backdrop-blur-sm">
										<FiHome className="h-4 w-4" />
										Profil {villageLabel}
									</div>
									<h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
										{villageLabel} {profil.desa?.nama || "Tanpa Nama"}
									</h2>
									<p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
										{profil.desa?.kecamatan?.nama
											? `Kecamatan ${profil.desa.kecamatan.nama}`
											: "Kecamatan belum terdeteksi"}
										. Kelola identitas desa, narasi pembangunan, kanal komunikasi, dan lokasi kantor desa dari satu halaman yang rapi.
									</p>
								</div>

								<div className="flex flex-wrap items-center gap-3">
									{editMode ? (
										<>
											<span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-sm">
												<FiEdit className="h-4 w-4" />
												Mode edit aktif
											</span>
											<button
												type="button"
												onClick={handleCancel}
												className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
											>
												<FiX className="h-4 w-4" />
												Batalkan
											</button>
										</>
									) : (
										<button
											type="button"
											onClick={() => setEditMode(true)}
											className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/10 transition hover:bg-slate-100"
										>
											<FiEdit className="h-4 w-4" />
											Perbarui Profil
										</button>
									)}
								</div>
							</div>

							<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
								<MetricCard
									icon={FiBarChart2}
									label="Kelengkapan"
									value={`${completion.percentage}%`}
									hint={`${completion.filled} dari ${completion.total} elemen profil telah terisi`}
									accentClass="bg-white/10 text-white"
								/>
								<MetricCard
									icon={FiUsers}
									label="Penduduk"
									value={isFilled(profil.jumlah_penduduk) ? formatNumber(profil.jumlah_penduduk) : "-"}
									hint="Data jumlah penduduk yang tercatat pada profil desa"
									accentClass="bg-emerald-400/20 text-emerald-100"
								/>
								<MetricCard
									icon={FiLayers}
									label="Luas Wilayah"
									value={isFilled(profil.luas_wilayah) ? `${profil.luas_wilayah} km2` : "-"}
									hint="Luas wilayah administratif desa"
									accentClass="bg-cyan-400/20 text-cyan-100"
								/>
								<MetricCard
									icon={FiNavigation}
									label="Jarak Kecamatan"
									value={isFilled(profil.radius_ke_kecamatan) ? `${profil.radius_ke_kecamatan} km` : "-"}
									hint="Perkiraan jarak desa ke pusat kecamatan"
									accentClass="bg-amber-400/20 text-amber-100"
								/>
							</div>

							<div className="flex flex-wrap gap-2">
								<span className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85">
									{safeText(profil.klasifikasi_desa, "Klasifikasi belum diisi")}
								</span>
								<span className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85">
									{safeText(profil.status_desa, "Status desa belum diisi")}
								</span>
								<span className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85">
									{safeText(profil.tipologi_desa, "Tipologi belum diisi")}
								</span>
							</div>
						</div>

						
					
				</section>

				{editMode ? (
					<form className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]" onSubmit={handleSubmit}>
						<div className="space-y-6">
							<SectionCard
								icon={FiHome}
								eyebrow="Identitas"
								title="Informasi dasar desa"
								description="Atur identitas utama desa agar tampil konsisten pada dashboard dan halaman publik internal."
							>
								<div className="grid gap-5 md:grid-cols-2">
									<FieldGroup label="Klasifikasi desa" error={errors.klasifikasi_desa}>
										<select
											name="klasifikasi_desa"
											value={profil.klasifikasi_desa || ""}
											onChange={handleChange}
											className={`${INPUT_CLASS} ${errors.klasifikasi_desa ? ERROR_INPUT_CLASS : ""}`.trim()}
										>
											<option value="">Pilih klasifikasi desa</option>
											{KLASIFIKASI_OPTIONS.map((option) => (
												<option key={option} value={option}>
													{option}
												</option>
											))}
										</select>
									</FieldGroup>

									<FieldGroup label="Status desa / IDM" error={errors.status_desa}>
										<select
											name="status_desa"
											value={profil.status_desa || ""}
											onChange={handleChange}
											className={`${INPUT_CLASS} ${errors.status_desa ? ERROR_INPUT_CLASS : ""}`.trim()}
										>
											<option value="">Pilih status desa</option>
											{STATUS_OPTIONS.map((option) => (
												<option key={option} value={option}>
													{option}
												</option>
											))}
										</select>
									</FieldGroup>

									<div className="md:col-span-2">
										<FieldGroup label="Tipologi desa" error={errors.tipologi_desa}>
											<select
												name="tipologi_desa"
												value={profil.tipologi_desa || ""}
												onChange={handleChange}
												className={`${INPUT_CLASS} ${errors.tipologi_desa ? ERROR_INPUT_CLASS : ""}`.trim()}
											>
												<option value="">Pilih tipologi desa</option>
												{TIPOLOGI_OPTIONS.map((option) => (
													<option key={option} value={option}>
														{option}
													</option>
												))}
											</select>
										</FieldGroup>
									</div>

									<FieldGroup label="Jumlah penduduk" hint="jiwa" error={errors.jumlah_penduduk}>
										<input
											type="number"
											name="jumlah_penduduk"
											value={profil.jumlah_penduduk || ""}
											onChange={handleChange}
											className={`${INPUT_CLASS} ${errors.jumlah_penduduk ? ERROR_INPUT_CLASS : ""}`.trim()}
											placeholder="Masukkan jumlah penduduk"
										/>
									</FieldGroup>

									<div className="md:col-span-2">
										<FieldGroup
											label="Sejarah desa"
											hint="Ceritakan asal-usul atau perjalanan desa"
											error={errors.sejarah_desa}
										>
											<textarea
												name="sejarah_desa"
												value={profil.sejarah_desa || ""}
												onChange={handleChange}
												rows="6"
												className={`${INPUT_CLASS} min-h-[160px] resize-y ${errors.sejarah_desa ? ERROR_INPUT_CLASS : ""}`.trim()}
												placeholder="Tuliskan sejarah desa dengan bahasa yang jelas dan mudah dibaca"
											/>
										</FieldGroup>
									</div>
								</div>
							</SectionCard>

							<SectionCard
								icon={FiGlobe}
								eyebrow="Komunikasi"
								title="Kontak dan jejak digital"
								description="Pastikan kanal komunikasi resmi desa terpasang agar masyarakat mudah menjangkau informasi desa."
							>
								<div className="grid gap-5 md:grid-cols-2">
									<FieldGroup label="Nomor telepon kantor" error={errors.no_telp}>
										<input
											type="text"
											name="no_telp"
											value={profil.no_telp || ""}
											onChange={handleChange}
											className={`${INPUT_CLASS} ${errors.no_telp ? ERROR_INPUT_CLASS : ""}`.trim()}
											placeholder="Contoh: 0251-xxxxxxx"
										/>
									</FieldGroup>

									<FieldGroup label="Email desa" error={errors.email}>
										<input
											type="email"
											name="email"
											value={profil.email || ""}
											onChange={handleChange}
											className={`${INPUT_CLASS} ${errors.email ? ERROR_INPUT_CLASS : ""}`.trim()}
											placeholder="desa@example.go.id"
										/>
									</FieldGroup>

									<FieldGroup label="URL Instagram" error={errors.instagram_url}>
										<input
											type="url"
											name="instagram_url"
											value={profil.instagram_url || ""}
											onChange={handleChange}
											className={`${INPUT_CLASS} ${errors.instagram_url ? ERROR_INPUT_CLASS : ""}`.trim()}
											placeholder="https://instagram.com/..."
										/>
									</FieldGroup>

									<FieldGroup label="URL YouTube" error={errors.youtube_url}>
										<input
											type="url"
											name="youtube_url"
											value={profil.youtube_url || ""}
											onChange={handleChange}
											className={`${INPUT_CLASS} ${errors.youtube_url ? ERROR_INPUT_CLASS : ""}`.trim()}
											placeholder="https://youtube.com/..."
										/>
									</FieldGroup>
								</div>
							</SectionCard>

							<SectionCard
								icon={FiLayers}
								eyebrow="Wilayah"
								title="Wilayah, demografi, dan potensi"
								description="Gunakan bagian ini untuk memperkuat narasi desa secara administratif maupun ekonomi."
							>
								<div className="grid gap-5 md:grid-cols-2">
									<FieldGroup label="Luas wilayah" hint="km2" error={errors.luas_wilayah}>
										<input
											type="text"
											name="luas_wilayah"
											value={profil.luas_wilayah || ""}
											onChange={handleChange}
											className={`${INPUT_CLASS} ${errors.luas_wilayah ? ERROR_INPUT_CLASS : ""}`.trim()}
											placeholder="Contoh: 12.75"
										/>
									</FieldGroup>

									<FieldGroup label="Jarak ke kecamatan" hint="km" error={errors.radius_ke_kecamatan}>
										<input
											type="text"
											name="radius_ke_kecamatan"
											value={profil.radius_ke_kecamatan || ""}
											onChange={handleChange}
											className={`${INPUT_CLASS} ${errors.radius_ke_kecamatan ? ERROR_INPUT_CLASS : ""}`.trim()}
											placeholder="Contoh: 7.5"
										/>
									</FieldGroup>

									<div className="md:col-span-2">
										<FieldGroup label="Demografi" error={errors.demografi}>
											<textarea
												name="demografi"
												value={profil.demografi || ""}
												onChange={handleChange}
												rows="6"
												className={`${INPUT_CLASS} min-h-[160px] resize-y ${errors.demografi ? ERROR_INPUT_CLASS : ""}`.trim()}
												placeholder="Jelaskan komposisi penduduk, kelompok usia, pekerjaan, atau kondisi sosial yang relevan"
											/>
										</FieldGroup>
									</div>

									<div className="md:col-span-2">
										<FieldGroup label="Potensi desa" error={errors.potensi_desa}>
											<textarea
												name="potensi_desa"
												value={profil.potensi_desa || ""}
												onChange={handleChange}
												rows="6"
												className={`${INPUT_CLASS} min-h-[160px] resize-y ${errors.potensi_desa ? ERROR_INPUT_CLASS : ""}`.trim()}
												placeholder="Tuliskan potensi unggulan desa, sektor ekonomi, destinasi, atau peluang pengembangan"
											/>
										</FieldGroup>
									</div>
								</div>
							</SectionCard>

							<SectionCard
								icon={FiMap}
								eyebrow="Lokasi"
								title="Lokasi kantor desa dan dokumentasi visual"
								description="Klik peta untuk memilih titik lokasi kantor desa. Foto kantor membantu memperkuat tampilan profil secara visual."
							>
								<div className="grid gap-5 md:grid-cols-2">
									<div className="md:col-span-2">
										<FieldGroup label="Alamat kantor desa" error={errors.alamat_kantor}>
											<textarea
												name="alamat_kantor"
												value={profil.alamat_kantor || ""}
												onChange={handleChange}
												rows="4"
												className={`${INPUT_CLASS} min-h-[120px] resize-y ${errors.alamat_kantor ? ERROR_INPUT_CLASS : ""}`.trim()}
												placeholder="Tuliskan alamat lengkap kantor desa"
											/>
										</FieldGroup>
									</div>

									<FieldGroup label="Latitude" error={errors.latitude}>
										<input
											type="number"
											step="any"
											name="latitude"
											value={profil.latitude || ""}
											onChange={handleChange}
											className={`${INPUT_CLASS} ${errors.latitude ? ERROR_INPUT_CLASS : ""}`.trim()}
											placeholder="-6.595018"
										/>
									</FieldGroup>

									<FieldGroup label="Longitude" error={errors.longitude}>
										<input
											type="number"
											step="any"
											name="longitude"
											value={profil.longitude || ""}
											onChange={handleChange}
											className={`${INPUT_CLASS} ${errors.longitude ? ERROR_INPUT_CLASS : ""}`.trim()}
											placeholder="106.816635"
										/>
									</FieldGroup>

									<div className="md:col-span-2">
										<div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-inner">
											<div className="h-[360px] w-full">
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
													{hasCoordinates ? (
														<Marker position={mapPosition}>
															<Popup>{profil.desa?.nama || "Kantor Desa"}</Popup>
														</Marker>
													) : null}
													<LocationMarker
														onPositionChange={(latlng) => {
															setProfil((previous) => ({
																...previous,
																latitude: latlng.lat,
																longitude: latlng.lng,
															}));
														}}
													/>
												</MapContainer>
											</div>
											<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
												<span>Klik pada peta untuk mengubah titik lokasi kantor desa.</span>
												<span>
													{hasCoordinates
														? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
														: "Koordinat belum diisi"}
												</span>
											</div>
										</div>
									</div>
								</div>
							</SectionCard>
						</div>

						<aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
							<SectionCard
								icon={FiCamera}
								eyebrow="Visual"
								title="Foto kantor desa"
								description="Unggah foto yang bersih dan representatif agar profil desa terlihat lebih profesional."
							>
								<label className="block cursor-pointer overflow-hidden rounded-lg border border-dashed border-emerald-200 bg-emerald-50/70 p-4 transition hover:border-emerald-300 hover:bg-emerald-50">
									<input
										type="file"
										name="foto_kantor_desa"
										onChange={handleFileChange}
										className="hidden"
									/>
									<div className="flex flex-col items-center justify-center rounded-lg bg-white px-6 py-6 text-center shadow-sm">
										<div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
											<FiUploadCloud className="h-7 w-7" />
										</div>
										<p className="mt-4 text-sm font-semibold text-slate-700">
											Klik untuk memilih foto baru
										</p>
										<p className="mt-2 text-xs leading-5 text-slate-500">
											Gunakan foto landscape dengan pencahayaan baik untuk hasil tampilan terbaik.
										</p>
									</div>
								</label>

								<div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
									{imageUrl ? (
										<img
											src={imageUrl}
											alt="Preview kantor desa"
											className="h-56 w-full object-cover"
										/>
									) : (
										<div className="flex h-56 flex-col items-center justify-center px-6 text-center text-slate-400">
											<FiImage className="h-10 w-10" />
											<p className="mt-3 text-sm font-medium">Belum ada foto yang dipilih</p>
										</div>
									)}
								</div>
							</SectionCard>

							<SectionCard
								icon={FiBarChart2}
								eyebrow="Kelengkapan"
								title="Progress profil desa"
								description="Gunakan indikator ini untuk memastikan semua bagian utama profil sudah terisi."
							>
								<div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
									<div className="flex items-center justify-between gap-3">
										<p className="text-sm font-semibold text-slate-700">
											{completion.filled} dari {completion.total} elemen lengkap
										</p>
										<span className={`rounded-lg border px-3 py-1 text-xs font-semibold ${progressTone.badge}`}>
											{completion.percentage}%
										</span>
									</div>
									<div className="mt-4 h-3 overflow-hidden rounded-lg bg-white shadow-inner">
										<div
											className={`h-full rounded-lg bg-gradient-to-r ${progressTone.bar}`}
											style={{ width: `${Math.max(completion.percentage, completion.percentage > 0 ? 6 : 0)}%` }}
										/>
									</div>
								</div>

								<div className="mt-5">
									<ProgressChecklist items={summaryChecklist} />
								</div>
							</SectionCard>

							<div className={`${SECTION_CLASS} space-y-4`}>
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
										Aksi
									</p>
									<h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">
										Simpan perubahan profil
									</h3>
									<p className="mt-2 text-sm leading-6 text-slate-500">
										Pastikan informasi sudah diperiksa kembali sebelum disimpan ke sistem.
									</p>
								</div>

								<button
									type="submit"
									className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
								>
									<FiSave className="h-4 w-4" />
									Simpan Perubahan
								</button>

								<button
									type="button"
									onClick={handleCancel}
									className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
								>
									<FiX className="h-4 w-4" />
									Batal dan Kembali
								</button>
							</div>
						</aside>
					</form>
				) : (
					<div className="space-y-6">
						<div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
							<aside className="space-y-6 xl:sticky xl:top-6">
								<div className={SECTION_CLASS}>
									

									<div className="mt-5 space-y-4">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
												Status profil
											</p>
											<h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
												{completion.percentage}% lengkap
											</h3>
										</div>
										<div className="h-3 overflow-hidden rounded-lg bg-slate-100">
											<div
												className={`h-full rounded-lg bg-gradient-to-r ${progressTone.bar}`}
												style={{ width: `${Math.max(completion.percentage, completion.percentage > 0 ? 6 : 0)}%` }}
											/>
										</div>
										<div className="grid gap-2 text-sm text-slate-600">
											<div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
												<span>Penduduk</span>
												<span className="font-semibold text-slate-800">
													{isFilled(profil.jumlah_penduduk)
														? `${formatNumber(profil.jumlah_penduduk)} jiwa`
														: "Belum diisi"}
												</span>
											</div>
											<div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
												<span>Luas wilayah</span>
												<span className="font-semibold text-slate-800">
													{isFilled(profil.luas_wilayah)
														? `${profil.luas_wilayah} km²`
														: "Belum diisi"}
												</span>
											</div>
											<div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
												<span>Jarak ke kecamatan</span>
												<span className="font-semibold text-slate-800">
													{isFilled(profil.radius_ke_kecamatan)
														? `${profil.radius_ke_kecamatan} km`
														: "Belum diisi"}
												</span>
											</div>
										</div>

										<div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
											<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
												Terakhir diperbarui
											</p>
											<p className="mt-1 text-sm font-semibold text-slate-800">
												{formatDateLabel(profil.updated_at)}
											</p>
										</div>

										<div className="border-t border-slate-100 pt-4">
											<p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
												Checklist
											</p>
											<ProgressChecklist items={summaryChecklist} />
										</div>
									</div>
								</div>

								<SectionCard
									icon={FiMapPin}
									eyebrow="Kontak"
									title="Kontak dan media sosial"
									description="Informasi kontak dan kehadiran digital desa."
								>
									<div className="space-y-3">
										<div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
											<div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
												<FiMapPin className="h-4 w-4" />
											</div>
											<div>
												<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Alamat</p>
												<p className="mt-1 leading-6 text-slate-600">{safeText(profil.alamat_kantor)}</p>
											</div>
										</div>
										<div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
											<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
												<FiPhone className="h-4 w-4" />
											</div>
											<div>
												<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Telepon</p>
												<p className="mt-1 font-medium text-slate-700">{safeText(profil.no_telp)}</p>
											</div>
										</div>
										<div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
											<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
												<FiMail className="h-4 w-4" />
											</div>
											<div>
												<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Email</p>
												<p className="mt-1 break-all font-medium text-slate-700">{safeText(profil.email)}</p>
											</div>
										</div>
									</div>
									<div className="mt-4 border-t border-slate-100 pt-4">
										<p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Media sosial</p>
										<div className="space-y-3">
											<LinkRow icon={FiInstagram} label="Instagram" value={profil.instagram_url} />
											<LinkRow icon={FiYoutube} label="YouTube" value={profil.youtube_url} />
										</div>
									</div>
								</SectionCard>
							</aside>

							<div className="space-y-6">
								<div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
										{imageUrl ? (
											<img
												src={imageUrl}
												alt={`Kantor ${villageLabel} ${profil.desa?.nama || ""}`}
												className="h-56 w-full object-cover"
											/>
										) : (
											<div className="flex h-56 flex-col items-center justify-center px-6 text-center text-slate-400">
												<FiCamera className="h-10 w-10" />
												<p className="mt-3 text-sm font-medium">Belum ada foto kantor desa</p>
												<p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">
													Tambahkan foto agar profil desa lebih meyakinkan.
												</p>
											</div>
										)}
									</div>
								<SectionCard
									icon={FiLayers}
									eyebrow="Ringkasan"
									title="Identitas inti desa"
									description="Informasi utama yang muncul sebagai wajah resmi profil desa."
								>
									<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
										<div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-4">
											<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">
												Klasifikasi desa
											</p>
											<p className="mt-2 text-sm font-semibold text-slate-800">
												{safeText(profil.klasifikasi_desa)}
											</p>
										</div>
										<div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-4">
											<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-600">
												Status desa / IDM
											</p>
											<p className="mt-2 text-sm font-semibold text-slate-800">
												{safeText(profil.status_desa)}
											</p>
										</div>
										<div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-4">
											<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600">
												Tipologi desa
											</p>
											<p className="mt-2 text-sm font-semibold text-slate-800">
												{safeText(profil.tipologi_desa)}
											</p>
										</div>
									</div>

									<div className="mt-5 grid gap-3 sm:grid-cols-2">
										<div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4">
											<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Pemerintahan</p>
											<p className="mt-2 text-sm font-semibold text-slate-800">{villageLabel}</p>
										</div>
										<div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4">
											<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Kecamatan</p>
											<p className="mt-2 text-sm font-semibold text-slate-800">
												{profil.desa?.kecamatan?.nama || "Belum terdeteksi"}
											</p>
										</div>
										<div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4">
											<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Penduduk</p>
											<p className="mt-2 text-sm font-semibold text-slate-800">
												{isFilled(profil.jumlah_penduduk)
													? `${formatNumber(profil.jumlah_penduduk)} jiwa`
													: "Belum diisi"}
											</p>
										</div>
										<div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4">
											<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Koordinat</p>
											<p className="mt-2 text-sm font-semibold text-slate-800">
												{hasCoordinates
													? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
													: "Belum tersedia"}
											</p>
										</div>
									</div>
								</SectionCard>

								<SectionCard
									icon={FiHome}
									eyebrow="Narasi"
									title="Cerita dan gambaran desa"
									description="Sejarah, demografi, dan potensi desa ditampilkan per baris agar lebih ringkas."
								>
									<div className="space-y-4">
										{narrativeItems.map((item) => (
											<NarrativeRow
												key={item.title}
												icon={item.icon}
												title={item.title}
												value={item.value}
												emptyText={item.emptyText}
												accentClass={item.accentClass}
											/>
										))}
									</div>
								</SectionCard>

								<SectionCard
									icon={FiMap}
									eyebrow="Lokasi"
									title="Peta kantor desa"
									description="Titik lokasi kantor desa membantu memudahkan identifikasi dan validasi lapangan."
								>
									<div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
										<div className="h-[360px] w-full">
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
												{hasCoordinates ? (
													<Marker position={mapPosition}>
														<Popup>{profil.desa?.nama || "Kantor Desa"}</Popup>
													</Marker>
												) : null}
											</MapContainer>
										</div>
										<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
											<span>{safeText(profil.alamat_kantor, "Alamat kantor belum diisi")}</span>
											<span>
												{hasCoordinates
													? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
													: "Koordinat belum tersedia"}
											</span>
										</div>
									</div>
								</SectionCard>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default ProfilDesa;