import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEditMode } from "../../context/EditModeContext";
import {
	LuMapPin,
	LuChevronRight,
	LuHouse,
	LuCrown,
	LuTent,
	LuHospital,
	LuUsers,
	LuBuilding,
	LuHeartHandshake,
	LuShield,
	LuShieldCheck,
	LuPower,
	LuPowerOff,
	LuTriangleAlert,
	LuPencil,
	LuFileText,
} from "react-icons/lu";
import { getJabatanList } from "../../constants/jabatanMapping";

// ── Helpers ────────────────────────────────────────────────────────────────
const TYPE_LABEL = {
	rt: "RT",
	rw: "RW",
	posyandu: "Posyandu",
	"karang-taruna": "Karang Taruna",
	lpm: "LPM",
	pkk: "PKK",
	satlinmas: "Satlinmas",
	"lembaga-lainnya": "Lembaga Lainnya",
};

const TYPE_ICON = {
	rt: { Icon: LuTent, bg: "bg-blue-500" },
	rw: { Icon: LuHouse, bg: "bg-indigo-500" },
	posyandu: { Icon: LuHospital, bg: "bg-purple-500" },
	"karang-taruna": { Icon: LuUsers, bg: "bg-purple-400" },
	lpm: { Icon: LuBuilding, bg: "bg-gray-500" },
	pkk: { Icon: LuHeartHandshake, bg: "bg-pink-500" },
	satlinmas: { Icon: LuShield, bg: "bg-green-500" },
	"lembaga-lainnya": { Icon: LuBuilding, bg: "bg-slate-500" },
};

// Stat cell
const StatCell = ({ label, icon: Icon, children, onClick, className = "flex-1" }) => (
	<div
		className={`flex flex-col gap-0.5 px-3 py-2.5 min-w-0 ${className} ${onClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""}`}
		onClick={onClick}
	>
		<span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
			{Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
			{label}
		</span>
		<div className="text-sm font-semibold text-gray-800 truncate">{children}</div>
	</div>
);

// ── Component ───────────────────────────────────────────────────────────────
const ProfilCard = ({
	profil,
	type,
	onEdit,
	rtCount,
	rtList = [],
	pengurusCount,
	onToggleStatus,
	onToggleVerification,
	onAjukanUlang,
	produkHukumList = [],
	onUpdatePenduduk,
}) => {
	const { isSuperAdmin, isAdminBidangPMD, isUserDesa, isKecamatan } = useAuth();
	const { isEditMode } = useEditMode();
	const navigate = useNavigate();

	const isAdmin = isSuperAdmin() || isAdminBidangPMD();
	const getProdukHukumUrl = (id) =>
		isAdmin ? `/pemdes/produk-hukum/${id}` : `/desa/produk-hukum/${id}`;

	const showEditButton =
		onEdit &&
		(isSuperAdmin() ||
			isAdminBidangPMD() ||
			(isUserDesa() && isEditMode && profil?.status_verifikasi !== "verified"));

	const title = useMemo(() => {
		if (type === "rt") return `RT ${profil?.nomor ?? "-"}`;
		if (type === "rw") return `RW ${profil?.nomor ?? "-"}`;
		return profil?.nama || profil?.nama_lembaga || "-";
	}, [type, profil]);

	const { Icon: TypeIcon, bg: iconBg } = TYPE_ICON[type] || { Icon: LuBuilding, bg: "bg-gray-500" };
	const typeLabel = TYPE_LABEL[type] || type;

	// Status badge classes
	const isAktif = profil?.status_kelembagaan === "aktif" || !profil?.status_kelembagaan;
	const statusCls = isAktif
		? "bg-green-50 text-green-700 border-green-200"
		: "bg-red-50 text-red-700 border-red-200";
	const statusDotCls = isAktif ? "bg-green-500" : "bg-red-500";
	const statusText = isAktif ? "Aktif" : "Tidak Aktif";

	// Verification badge classes
	const vStatus = profil?.status_verifikasi;
	const vCls =
		vStatus === "verified"
			? "bg-green-50 text-green-700 border-green-200"
			: vStatus === "ditolak"
				? "bg-red-50 text-red-700 border-red-200"
				: "bg-amber-50 text-amber-700 border-amber-200";
	const vDotCls =
		vStatus === "verified"
			? "bg-green-500"
			: vStatus === "ditolak"
				? "bg-red-500"
				: "bg-amber-400";
	const vText =
		vStatus === "verified"
			? "Terverifikasi"
			: vStatus === "ditolak"
				? "Verifikasi Ditolak"
				: "Menunggu Verifikasi";

	// Location string
	const desaNama = profil?.desas?.nama || profil?.desa?.nama;
	const kecNama = profil?.desas?.kecamatans?.nama || profil?.desa?.kecamatans?.nama;
	const locationParts = [desaNama, kecNama ? `Kec. ${kecNama}` : null].filter(Boolean);
	const locationStr = locationParts.join(" · ");

	// SK Pembentukan
	const sk = produkHukumList.find((ph) => ph.id === profil?.produk_hukum_id);
	const skPenonaktifan = produkHukumList.find((ph) => ph.id === profil?.produk_hukum_penonaktifan_id);

	// Total jabatan
	const totalJabatan = getJabatanList(type).length;

	// Data penduduk — dua nilai terpisah (jiwa & KK)
	const { jumlahJiwa, jumlahKK } = useMemo(() => {
		if (type === "rt") {
			return {
				jumlahJiwa: profil?.jumlah_jiwa ?? null,
				jumlahKK: profil?.jumlah_kk ?? null,
			};
		}
		if (type === "rw" && rtList.length > 0) {
			const j = rtList.reduce((s, r) => s + (r.jumlah_jiwa || 0), 0);
			const k = rtList.reduce((s, r) => s + (r.jumlah_kk || 0), 0);
			return { jumlahJiwa: j || null, jumlahKK: k || null };
		}
		return { jumlahJiwa: null, jumlahKK: null };
	}, [type, profil, rtList]);

	// Show/hide sections
	const showDataPenduduk = type === "rt" || type === "rw";
	const canEditPenduduk =
		type === "rt" &&
		!!onUpdatePenduduk &&
		(isSuperAdmin() || isAdminBidangPMD() || (isUserDesa() && isEditMode));
	const showRwInduk = type === "rt" && profil?.rw;
	const showJumlahRT = type === "rw";

	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
			{/* ── Header ── */}
			<div className="px-4 pt-4 pb-3">
				<div className="flex items-start justify-between gap-3">
					{/* Left: icon + title + badges */}
					<div className="flex items-start gap-3 min-w-0">
						{/* Icon */}
						<div className={`w-16 h-16 rounded-xl ${iconBg} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
							<TypeIcon className="w-10 h-10" />
						</div>

						{/* Title area */}
						<div className="min-w-0">
							{/* Title row */}
							<div className="flex items-center flex-wrap gap-x-2 gap-y-1">
								<h2 className="text-lg font-bold text-gray-900 leading-tight">{title}</h2>

								{/* RW induk for RT */}
								{showRwInduk && (
									<span className="text-sm text-gray-400 font-medium">
										/ RW {profil.rw.nomor}
									</span>
								)}

								{/* Type pill */}
								<span className="text-[11px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded font-semibold">
									{typeLabel}
								</span>

								{/* Status */}
								<span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusCls}`}>
									<span className={`w-1.5 h-1.5 rounded-full ${statusDotCls}`} />
									{statusText}
								</span>

								{/* Verification */}
								{vStatus && (
									<span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${vCls}`}>
										<span className={`w-1.5 h-1.5 rounded-full ${vDotCls}`} />
										{vText}
									</span>
								)}
							</div>

							{/* Alamat — baris pertama */}
							<p className="text-xs mt-1 flex items-center gap-1">
								<LuMapPin className="w-3 h-3 flex-shrink-0 text-gray-400" />
								{profil?.alamat ? (
									<span className="text-gray-500 truncate">{profil.alamat}</span>
								) : (
									<span className="text-gray-400 italic">Alamat belum diatur</span>
								)}
							</p>

							{/* Desa / Kecamatan — baris kedua */}
							{locationStr && (
								<p className="text-xs text-gray-400 mt-0.5 ml-4">
									{locationStr}
								</p>
							)}
						</div>
					</div>

					{/* Right: action buttons */}
					<div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
						{showEditButton && (
							<button
								onClick={onEdit}
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							>
								<LuPencil className="w-3.5 h-3.5" />
								Edit Data
							</button>
						)}

						{/* Verifikasi button — kecamatan, admin PMD, superadmin */}
						{(isAdminBidangPMD() || isSuperAdmin() || isKecamatan?.()) && onToggleVerification && (
							<button
								onClick={() => onToggleVerification(profil?.id, profil?.status_verifikasi)}
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
							>
								<LuShieldCheck className="w-3.5 h-3.5" />
								{vStatus === "verified" ? "Batalkan Verifikasi" : "Verifikasi Lembaga"}
							</button>
						)}

						{/* Ajukan ulang — desa when ditolak */}
						{isUserDesa() && vStatus === "ditolak" && onAjukanUlang && (
							<button
								onClick={() => onAjukanUlang(profil?.id)}
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
							>
								<LuShieldCheck className="w-3.5 h-3.5" />
								Ajukan Ulang
							</button>
						)}
					</div>
				</div>
			</div>

			{/* ── Stats Bar ── */}
			<div className="border-t border-gray-100 flex w-full divide-x divide-gray-100">
				

				{/* RW INDUK — for RT */}
				{showRwInduk && (
					<StatCell label="RW Induk" icon={LuHouse}>
						<span className="text-indigo-600">RW {profil.rw.nomor}</span>
					</StatCell>
				)}

				{/* JUMLAH RT — for RW */}
				{showJumlahRT && (
					<StatCell label="Jumlah RT" icon={LuHouse}>
						{rtCount > 0 ? (
							<span>{rtCount} RT</span>
						) : (
							<span className="text-gray-400 font-normal text-xs">Belum ada</span>
						)}
					</StatCell>
				)}

				{/* PENGURUS */}
				<StatCell label="Pengurus" icon={LuUsers}>
					{totalJabatan > 0 ? (
						<span>
							{pengurusCount ?? 0}
							<span className="text-gray-400 font-normal">/{totalJabatan} terisi</span>
						</span>
					) : pengurusCount > 0 ? (
						<span>{pengurusCount} orang</span>
					) : (
						<span className="text-gray-400 font-normal text-xs">Belum ada</span>
					)}
				</StatCell>

				{/* SK LEMBAGA — lebih lebar */}
				<StatCell
					label="SK Lembaga"
					icon={LuFileText}
					className="flex-[2]"
					onClick={sk ? () => navigate(getProdukHukumUrl(profil.produk_hukum_id)) : undefined}
				>
					{sk ? (
						<span className="text-blue-600 truncate flex items-center gap-1">
							No. {sk.nomor}/{sk.tahun}
							<LuChevronRight className="w-3 h-3 flex-shrink-0" />
						</span>
					) : (
						<span className="text-gray-400 font-normal text-xs">Belum terhubung</span>
					)}
				</StatCell>

				{/* DATA PENDUDUK — dua kolom terpisah di paling kanan, hanya RT & RW */}
				{showDataPenduduk && (
					<>
						{/* Jiwa */}
						<div
							className={`flex-1 flex flex-col gap-0.5 px-3 py-2.5 min-w-0 bg-sky-50/60 ${canEditPenduduk ? "cursor-pointer hover:bg-sky-100/70 transition-colors" : ""}`}
							onClick={canEditPenduduk ? onUpdatePenduduk : undefined}
							title={canEditPenduduk ? "Klik untuk memperbarui data penduduk" : undefined}
						>
							<span className="flex items-center gap-1 text-[10px] font-semibold text-sky-500 uppercase tracking-wide whitespace-nowrap">
								<LuUsers className="w-3 h-3 flex-shrink-0" />
								Jumlah Jiwa
								{canEditPenduduk && <LuPencil className="w-2.5 h-2.5 text-sky-400 ml-0.5" />}
							</span>
							<div className="text-sm font-bold text-sky-700">
								{jumlahJiwa != null ? (
									jumlahJiwa.toLocaleString("id-ID")
								) : (
									<span className="text-sky-300 font-normal text-xs">—</span>
								)}
							</div>
						</div>

						{/* KK */}
						<div
							className={`flex-1 flex flex-col gap-0.5 px-3 py-2.5 min-w-0 bg-amber-50/60 ${canEditPenduduk ? "cursor-pointer hover:bg-amber-100/70 transition-colors" : ""}`}
							onClick={canEditPenduduk ? onUpdatePenduduk : undefined}
							title={canEditPenduduk ? "Klik untuk memperbarui data penduduk" : undefined}
						>
							<span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500 uppercase tracking-wide whitespace-nowrap">
								<LuHouse className="w-3 h-3 flex-shrink-0" />
								Jumlah KK
								{canEditPenduduk && <LuPencil className="w-2.5 h-2.5 text-amber-400 ml-0.5" />}
							</span>
							<div className="text-sm font-bold text-amber-700">
								{jumlahKK != null ? (
									jumlahKK.toLocaleString("id-ID")
								) : (
									<span className="text-amber-300 font-normal text-xs">—</span>
								)}
							</div>
						</div>
					</>
				)}
			</div>

			{/* ── Extra sections ── */}
			{/* SK Penonaktifan */}
			{profil?.status_kelembagaan === "nonaktif" && skPenonaktifan && (
				<div className="mx-4 my-3 p-3 rounded-lg bg-red-50 border border-red-100">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<LuPowerOff className="w-4 h-4 text-red-500 flex-shrink-0" />
							<div>
								<p className="text-xs font-semibold text-red-700">SK Penonaktifan</p>
								<p className="text-xs text-red-600 mt-0.5">
									No. {skPenonaktifan.nomor} Tahun {skPenonaktifan.tahun} — {skPenonaktifan.judul}
								</p>
							</div>
						</div>
						<button
							onClick={() => navigate(getProdukHukumUrl(profil.produk_hukum_penonaktifan_id))}
							className="p-1 text-red-400 hover:text-red-600 transition-colors"
						>
							<LuChevronRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			)}

			{/* Catatan Verifikasi */}
			{profil?.catatan_verifikasi && vStatus !== "verified" && (
				<div className="mx-4 my-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
					<div className="flex items-start gap-2">
						<LuTriangleAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
						<div className="min-w-0">
							<p className="text-xs font-semibold text-amber-800">Catatan Verifikasi</p>
							<p className="text-xs text-amber-700 mt-0.5 leading-relaxed whitespace-pre-line">
								{profil.catatan_verifikasi}
							</p>
							{profil?.verifikator_nama && (
								<p className="text-[11px] text-amber-500 mt-1">
									Oleh: {profil.verifikator_nama}
									{profil?.verified_at &&
										` — ${new Date(profil.verified_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
								</p>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Admin Controls */}
			{(isUserDesa() || isAdminBidangPMD() || isSuperAdmin()) && onToggleStatus && (
				<div className="px-4 pb-3 pt-1 flex items-center gap-2 border-t border-gray-50">
					<button
						onClick={() => onToggleStatus(profil?.id, profil?.status_kelembagaan)}
						className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
							isAktif
								? "text-red-600 bg-red-50 border-red-200 hover:bg-red-100"
								: "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
						}`}
					>
						{isAktif ? (
							<><LuPowerOff className="w-3.5 h-3.5" /> Nonaktifkan Lembaga</>
						) : (
							<><LuPower className="w-3.5 h-3.5" /> Aktifkan Lembaga</>
						)}
					</button>
				</div>
			)}
		</div>
	);
};

export default ProfilCard;
