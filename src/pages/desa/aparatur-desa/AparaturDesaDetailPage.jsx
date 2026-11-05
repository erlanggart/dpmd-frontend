import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAparaturDesaById } from "../../../api/aparaturDesaApi";
import { 
	FaArrowLeft, 
	FaEdit, 
	FaUser, 
	FaBriefcase, 
	FaCalendarAlt,
	FaMapMarkerAlt,
	FaVenusMars,
	FaGraduationCap,
	FaPray,
	FaIdCard,
	FaFileAlt,
	FaCheckCircle,
	FaTimesCircle,
	FaClock,
	FaShieldAlt,
	FaFilePdf,
	FaFileImage,
	FaExternalLinkAlt,
	FaLink,
	FaWhatsapp
} from "react-icons/fa";

const getBaseHost = () => {
	const apiBase =
		import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
	return apiBase.replace(/\/?api\/?$/, "");
};

const fotoUrl = (person) => {
	if (person?.file_pas_foto) {
		return `${getBaseHost()}/uploads/aparatur_desa_files/${
			person.file_pas_foto
		}`;
	}
	return "/user-default.svg";
};

const fileUrl = (filename) =>
	filename ? `${getBaseHost()}/uploads/aparatur_desa_files/${filename}` : null;

const TombolLengkapi = ({ onClick, label = "Lengkapi", merah = false }) => (
	<button
		type="button"
		onClick={onClick}
		className={`mt-2 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-white ${merah ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"}`}
	>
		{label}
	</button>
);

const CHIP = "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold";

const CatatanDpmd = ({ children }) => (
	<div className="mt-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs text-rose-800 ring-1 ring-rose-200">
		<p className="font-semibold">Catatan DPMD</p>
		<p className="mt-0.5 whitespace-pre-line">{children}</p>
	</div>
);

// Keputusan Bidang Pemdes per item, supaya desa tahu mana yang perlu direvisi.
const PenandaVerifikasi = ({ keputusan, onPerbaiki }) => {
	if (keputusan === false) return null;
	if (keputusan?.status === "sesuai") return <span className={`${CHIP} bg-emerald-100 text-emerald-700`}>Terverifikasi</span>;
	if (keputusan?.status === "tidak_sesuai") {
		return (
			<div>
				<span className={`${CHIP} bg-rose-600 text-white`}>Perlu diperbaiki</span>
				{keputusan.catatan && <CatatanDpmd>{keputusan.catatan}</CatatanDpmd>}
				<div>
					<TombolLengkapi merah label="Perbaiki" onClick={onPerbaiki} />
				</div>
			</div>
		);
	}
	return <span className={`${CHIP} bg-slate-200 text-slate-600`}>Menunggu diperiksa</span>;
};

const InfoCard = ({ icon, label, value, color = "text-slate-600", onLengkapi }) => {
	const IconComp = icon;
	return (
		<div className="bg-slate-50 p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
			<div className="flex items-start gap-3">
				<div className={`mt-1 ${color}`}>
					<IconComp className="w-5 h-5" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
					<p className="text-sm font-semibold text-slate-900 break-words">{!value && onLengkapi ? "Belum diisi" : value || "-"}</p>
					{!value && onLengkapi && <TombolLengkapi onClick={onLengkapi} />}
				</div>
			</div>
		</div>
	);
};

const AparaturDesaDetailPage = () => {
	const { id } = useParams();
	const nav = useNavigate();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				const res = await getAparaturDesaById(id);
				setData(res.data.data);
			} catch (err) {
				console.error("Error loading aparatur detail:", err);
				setError("Gagal memuat detail aparatur.");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id]);

	if (loading) return <p>Memuat...</p>;
	if (error) return <p className="text-rose-600">{error}</p>;
	if (!data) return <p>Data tidak ditemukan.</p>;

	const formatDate = (dateString) => {
		if (!dateString) return "-";
		const date = new Date(dateString);
		return date.toLocaleDateString("id-ID", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
	};

	const masaJabat = () => {
		if (!data?.tanggal_pengangkatan) return "-";
		const start = new Date(data.tanggal_pengangkatan);
		const end = data?.tanggal_pemberhentian
			? new Date(data.tanggal_pemberhentian)
			: new Date();
		const diffMs = Math.max(0, end - start);
		const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
		const months = Math.floor(
			(diffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30)
		);
		return `${years} th ${months} bln`;
	};

	const lengkapi = (kolom) => nav(`/desa/aparatur-desa/${id}/edit?lengkapi=${kolom}`);

	// Keputusan lama hanya menyimpan status ringkas, tanpa rincian per item.
	const keputusanItem = (kunci) => {
		const item = data.verifikasi_item?.[kunci];
		if (item) return item;
		if (data.status_verifikasi === "terverifikasi") return { status: "sesuai" };
		return data.status_verifikasi === "ditolak" && !Object.keys(data.verifikasi_item || {}).length ? false : null;
	};

	return (
		<div className="space-y-5">
			{/* Header Section */}
			
				<div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
					<div className="flex items-center justify-between gap-4">
						<div className="flex min-w-0 items-center gap-3.5">
							<button
								className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
								onClick={() => nav("/desa/aparatur-desa")}
							>
								<FaArrowLeft className="h-4 w-4" />
							</button>
							<div className="min-w-0">
								<p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
									Aparatur Desa
								</p>
								<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
									Detail Aparatur Desa
								</h1>
								<p className="mt-0.5 text-sm text-slate-500">Informasi lengkap aparatur pemerintahan desa.</p>
							</div>
						</div>
						<button
							className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
							onClick={() => nav(`/desa/aparatur-desa/${id}/edit`)}
						>
							<FaEdit className="h-4 w-4" />
							<span className="hidden sm:inline">Edit Data</span>
						</button>
					</div>
				</div>
			

			<div className="space-y-5">
				{/* Hasil pemeriksaan Bidang Pemdes. Keterangannya yang memberi tahu
				    desa apa yang perlu dibetulkan saat data ditolak. */}
				{data.status_verifikasi && (
					<div
						className={`rounded-xl border p-4 ${
							data.status_verifikasi === "ditolak"
								? "border-rose-200 bg-rose-50"
								: "border-emerald-200 bg-emerald-50"
						}`}
					>
						<p
							className={`text-sm font-semibold ${
								data.status_verifikasi === "ditolak" ? "text-rose-800" : "text-emerald-800"
							}`}
						>
							{data.status_verifikasi === "ditolak"
								? "Verifikasi ditolak Bidang Pemdes"
								: "Data terverifikasi Bidang Pemdes"}
						</p>
						{data.catatan_verifikasi && (
							<p className="mt-1 whitespace-pre-line text-sm text-slate-700">{data.catatan_verifikasi}</p>
						)}
					</div>
				)}

				{/* Profile Card */}
				<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
					<div className="border-b border-slate-100 bg-slate-50 p-6 sm:p-8">
						<div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
							<div className="relative">
								<img
									src={fotoUrl(data)}
									onError={(e) => (e.currentTarget.src = "/user-default.svg")}
									alt={data.nama_lengkap || "Foto"}
									className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-white shadow-lg"
								/>
								<div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-semibold shadow-md ${
									data.status === 'Aktif' 
										? 'bg-emerald-600 text-white'
										: 'bg-slate-500 text-white'
								}`}>
									{data.status === 'Aktif' ? (
										<div className="flex items-center gap-1">
											<FaCheckCircle className="w-3 h-3" />
											<span>Aktif</span>
										</div>
									) : (
										<div className="flex items-center gap-1">
											<FaTimesCircle className="w-3 h-3" />
											<span>Tidak Aktif</span>
										</div>
									)}
								</div>
							</div>
							<div className="flex-1">
								<h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
									{data.nama_lengkap || "-"}
								</h2>
								<div className="mb-3 flex items-center gap-2 text-brand-600">
									<FaBriefcase className="w-5 h-5" />
									<span className="text-lg font-semibold">{data.jabatan || "-"}</span>
								</div>
								<div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
									<div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg">
										<FaClock className="w-4 h-4 text-slate-400" />
										<span>Masa Jabatan: <strong className="text-slate-900">{masaJabat()}</strong></span>
									</div>
									{data.nipd && (
										<div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg">
											<FaIdCard className="w-4 h-4 text-slate-400" />
											<span>NIPD: <strong className="text-slate-900">{data.nipd}</strong></span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Informasi Pribadi */}
				<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
					<h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
						<FaUser className="text-brand-600" />
						Informasi Pribadi
					</h3>
					<div className="-mt-2 mb-4">
						<PenandaVerifikasi keputusan={keputusanItem("biodata")} onPerbaiki={() => lengkapi("nama_lengkap")} />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<InfoCard 
							icon={FaIdCard}
							label="NIK"
							value={data.nik}
							onLengkapi={() => lengkapi("nik")}
							color="text-slate-500"
						/>
						<InfoCard
							icon={FaWhatsapp}
							label="Nomor WhatsApp"
							value={data.whatsapp ? data.whatsapp.replace(/^62/, "0") : ""}
							onLengkapi={() => lengkapi("whatsapp")}
							color="text-emerald-600"
						/>
						<InfoCard
							icon={FaMapMarkerAlt}
							label="Tempat, Tanggal Lahir"
							value={`${data.tempat_lahir ?? "-"}, ${formatDate(data.tanggal_lahir)}`}
							color="text-slate-500"
						/>
						<InfoCard 
							icon={FaVenusMars}
							label="Jenis Kelamin"
							value={data.jenis_kelamin?.replace(/_/g, "-")}
							color="text-slate-500"
						/>
						<InfoCard 
							icon={FaGraduationCap}
							label="Pendidikan Terakhir"
							value={data.pendidikan_terakhir}
							onLengkapi={() => lengkapi("pendidikan_terakhir")}
							color="text-slate-500"
						/>
						<InfoCard 
							icon={FaPray}
							label="Agama"
							value={data.agama}
							onLengkapi={() => lengkapi("agama")}
							color="text-amber-500"
						/>
						<InfoCard
							icon={FaIdCard}
							label="NIPD"
							value={data.nipd || "Terbit setelah semua persyaratan lengkap dan diverifikasi DPMD"}
							color="text-slate-500"
						/>
					</div>
				</div>

				{/* Informasi Kepegawaian */}
				<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
					<h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
						<FaBriefcase className="text-brand-600" />
						Informasi Kepegawaian
					</h3>
					<div className="-mt-2 mb-4">
						<PenandaVerifikasi keputusan={keputusanItem("jabatan_sk")} onPerbaiki={() => lengkapi("jabatan")} />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<InfoCard 
							icon={FaCalendarAlt}
							label="Tanggal Pengangkatan"
							value={formatDate(data.tanggal_pengangkatan)}
							color="text-slate-600"
						/>
						<InfoCard 
							icon={FaFileAlt}
							label="Nomor SK Pengangkatan"
							value={data.nomor_sk_pengangkatan}
							onLengkapi={() => lengkapi("nomor_sk_pengangkatan")}
							color="text-slate-600"
						/>
						{!data.produk_hukum_id && (
							<InfoCard
								icon={FaLink}
								label="SK dari Produk Hukum Desa"
								value=""
								color="text-slate-600"
								onLengkapi={() => lengkapi("produk_hukum_id")}
							/>
						)}
						{data.tanggal_pemberhentian && (
							<InfoCard 
								icon={FaCalendarAlt}
								label="Tanggal Pemberhentian"
								value={formatDate(data.tanggal_pemberhentian)}
								color="text-rose-600"
							/>
						)}
						{data.nomor_sk_pemberhentian && (
							<InfoCard 
								icon={FaFileAlt}
								label="Nomor SK Pemberhentian"
								value={data.nomor_sk_pemberhentian}
								color="text-rose-600"
							/>
						)}
					</div>
				</div>

				{/* BPJS & Jaminan Sosial */}
				<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
					<h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
						<FaShieldAlt className="text-brand-600" />
						BPJS & Jaminan Sosial
					</h3>
					{(data.bpjs_kesehatan_nomor || data.bpjs_ketenagakerjaan_nomor) && (
						<div className="-mt-2 mb-4">
							<PenandaVerifikasi keputusan={keputusanItem("bpjs")} onPerbaiki={() => lengkapi("bpjs_kesehatan_nomor")} />
						</div>
					)}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<InfoCard 
							icon={FaShieldAlt}
							label="BPJS Kesehatan"
							value={data.bpjs_kesehatan_nomor}
							onLengkapi={() => lengkapi("bpjs_kesehatan_nomor")}
							color="text-slate-600"
						/>
						<InfoCard 
							icon={FaShieldAlt}
							label="BPJS Ketenagakerjaan"
							value={data.bpjs_ketenagakerjaan_nomor}
							onLengkapi={() => lengkapi("bpjs_ketenagakerjaan_nomor")}
							color="text-slate-600"
						/>
					</div>
				</div>

				{/* Produk Hukum & Keterangan */}
				{(() => {
					const ph = data.produk_hukums || data.produk_hukum || data.produkHukum;
					const phId = data.produk_hukum_id || ph?.id;
					const phTitle = ph?.judul || null;
					
					if (phId || data.keterangan) {
						return (
							<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
								<h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
									<FaFileAlt className="text-brand-600" />
									Dokumen & Catatan
								</h3>
								<div className="space-y-4">
									{phId && phTitle && (
										<div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
											<p className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
												<FaLink className="w-3 h-3" />
												Produk Hukum Terkait
											</p>
											<button
												type="button"
												className="text-slate-600 hover:text-slate-700 font-semibold flex items-center gap-2 group"
												onClick={() => nav(`/desa/produk-hukum/${phId}`)}
											>
												<span>{phTitle}</span>
												<FaExternalLinkAlt className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
											</button>
										</div>
									)}
									{data.keterangan && (
										<InfoCard 
											icon={FaFileAlt}
											label="Keterangan"
											value={data.keterangan}
											color="text-slate-600"
										/>
									)}
								</div>
							</div>
						);
					}
					return null;
				})()}

				{/* Lampiran Dokumen */}
				<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
					<h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
						<FaFilePdf className="text-brand-600" />
						Lampiran Dokumen
					</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{[
							{ key: "file_pas_foto", label: "Pas Foto", namaCatatan: "Pas foto", icon: FaUser, color: "blue" },
							{ key: "file_sk_terakhir", label: "SK Terakhir", namaCatatan: "SK terakhir", wajib: true, icon: FaFileAlt, color: "amber" },
							{ key: "file_ktp", label: "KTP", namaCatatan: "KTP", wajib: true, icon: FaIdCard, color: "blue" },
							{ key: "file_kk", label: "Kartu Keluarga", namaCatatan: "Kartu Keluarga", icon: FaFileAlt, color: "green" },
							{ key: "file_akta_kelahiran", label: "Akta Kelahiran", namaCatatan: "Akta kelahiran", icon: FaFileAlt, color: "purple" },
							{ key: "file_ijazah_terakhir", label: "Ijazah Terakhir", namaCatatan: "Ijazah terakhir", icon: FaGraduationCap, color: "amber" },
							{ key: "file_bpjs_kesehatan", label: "BPJS Kesehatan", namaCatatan: "Kartu BPJS Kesehatan", icon: FaShieldAlt, color: "emerald" },
							{ key: "file_bpjs_ketenagakerjaan", label: "BPJS Ketenagakerjaan", namaCatatan: "Kartu BPJS Ketenagakerjaan", icon: FaShieldAlt, color: "cyan" },
						].map(({ key, label, namaCatatan, wajib, icon, color }) => {
							const fname = data?.[key];
							const url = fileUrl(fname);
							const isPdf = fname?.toLowerCase().endsWith('.pdf');
							const FileIcon = isPdf ? FaFilePdf : FaFileImage;
							const DocIcon = icon;
							// Wajib tidaknya berkas lain bergantung jabatan dan dinilai server; tandanya ada di catatan DPMD.
							const wajibKosong = !url && (wajib || String(data?.catatan_verifikasi || "").includes(`${namaCatatan}: belum diunggah`));
							const merah = wajibKosong || keputusanItem(key)?.status === "tidak_sesuai";

							return (
								<div
									key={key}
									className={`relative p-4 rounded-lg border-2 transition-all ${
										merah
											? 'border-rose-400 bg-rose-50'
											: url
											? `border-${color}-200 bg-${color}-50 hover:shadow-md hover:border-${color}-300`
											: 'border-slate-200 bg-slate-50'
									}`}
								>
									<div className="flex items-start gap-3">
										<div className={`p-2 rounded-lg ${
											merah ? 'bg-rose-100' : url ? `bg-${color}-100` : 'bg-slate-200'
										}`}>
											<DocIcon className={`w-5 h-5 ${
												merah ? 'text-rose-600' : url ? `text-${color}-600` : 'text-slate-400'
											}`} />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-semibold text-slate-900 mb-1">
												{label}
											</p>
											{url ? (
												<>
												<a
													href={url}
													target="_blank"
													rel="noopener noreferrer"
													className={`inline-flex items-center gap-1.5 text-xs font-medium group ${merah ? 'text-rose-700 hover:text-rose-800' : `text-${color}-600 hover:text-${color}-700`}`}
												>
													<FileIcon className="w-3.5 h-3.5" />
													<span>Lihat Dokumen</span>
													<FaExternalLinkAlt className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
												</a>
												<div className="mt-2">
													<PenandaVerifikasi keputusan={keputusanItem(key)} onPerbaiki={() => lengkapi(key)} />
												</div>
												</>
											) : (
												<>
												<p className={`text-xs flex items-center gap-1 ${merah ? 'font-semibold text-rose-700' : 'text-slate-400'}`}>
													<FaTimesCircle className="w-3 h-3" />
													<span>Belum upload</span>
												</p>
												{wajibKosong && <CatatanDpmd>Berkas ini wajib. Data belum bisa dinyatakan valid sebelum berkasnya diunggah.</CatatanDpmd>}
												<TombolLengkapi merah={merah} onClick={() => lengkapi(key)} />
												</>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Status diatur DPMD */}
				<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
					Status aktif/nonaktif aparatur diatur oleh Bidang Pemerintahan Desa DPMD. Hubungi DPMD bila ada perangkat yang berhenti atau aktif kembali.
				</div>
			</div>
		</div>
	);
};

export default AparaturDesaDetailPage;
