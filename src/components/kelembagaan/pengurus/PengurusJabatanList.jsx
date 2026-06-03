import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
	getPengurusByKelembagaan,
	getPengurusHistory,
} from "../../../services/pengurus";
import { useAuth } from "../../../context/AuthContext";
import { useEditMode } from "../../../context/EditModeContext";
import {
	LuUsers,
	LuPlus,
	LuHistory,
	LuEye,
	LuUser,
	LuPhone,
	LuCalendar,
	LuShieldCheck,
	LuShieldAlert,
	LuTriangleAlert,
} from "react-icons/lu";
import {
	getJabatanList,
	getDisplayJabatan,
} from "../../../constants/jabatanMapping";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const getPengurusRoutePath = (user, pengurusId) => {
	if (user?.role === "kecamatan") return `/kecamatan/pengurus/${pengurusId}`;
	const isSuperAdminRole = user?.role === "superadmin";
	const isAdminBidangRole =
		(user?.role === "kepala_bidang" || user?.role === "pegawai") && user?.bidang_id === 5;
	const isBendaharaRole = user?.role === "bendahara";
	if (isSuperAdminRole || isAdminBidangRole || isBendaharaRole)
		return `/bidang/pmd/pengurus/${pengurusId}`;
	return `/desa/pengurus/${pengurusId}`;
};

const getInitials = (name = "") =>
	name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((n) => n[0].toUpperCase())
		.join("");

const VerifikasiBadge = ({ status }) => {
	if (status === "verified")
		return (
			<span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
				<LuShieldCheck className="w-3 h-3" />
				Terverifikasi
			</span>
		);
	if (status === "ditolak")
		return (
			<span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
				<LuShieldAlert className="w-3 h-3" />
				Ditolak
			</span>
		);
	return (
		<span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
			<LuShieldAlert className="w-3 h-3" />
			Menunggu Verifikasi
		</span>
	);
};

// Baris satu pengurus
const PengurusRow = ({ pengurus, user }) => {
	const hasPhone = pengurus.telepon;
	const hasPhone2 = pengurus.no_hp || pengurus.telepon2;

	return (
		<div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
			{/* Avatar */}
			{pengurus.avatar ? (
				<img
					src={`${imageBaseUrl}/${pengurus.avatar}`}
					alt={pengurus.nama_lengkap}
					className="w-9 h-9 rounded-full object-cover flex-shrink-0"
				/>
			) : (
				<div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
					<span className="text-xs font-bold text-slate-600">
						{getInitials(pengurus.nama_lengkap)}
					</span>
				</div>
			)}

			{/* Info */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm font-semibold text-gray-900 truncate">
						{pengurus.nama_lengkap}
					</span>
					<VerifikasiBadge status={pengurus.status_verifikasi} />
				</div>
				{(hasPhone || hasPhone2) && (
					<div className="flex items-center gap-3 mt-0.5">
						{hasPhone && (
							<span className="flex items-center gap-1 text-xs text-gray-400">
								<LuPhone className="w-3 h-3" />
								{pengurus.telepon}
							</span>
						)}
						{hasPhone2 && (
							<span className="flex items-center gap-1 text-xs text-gray-400">
								<LuPhone className="w-3 h-3" />
								{hasPhone2}
							</span>
						)}
					</div>
				)}
			</div>

			{/* Detail button */}
			<Link
				to={getPengurusRoutePath(user, pengurus.id)}
				className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-gray-200 hover:border-indigo-200 transition-all flex-shrink-0"
				title="Lihat detail"
			>
				<LuEye className="w-3.5 h-3.5" />
				<span>Detail</span>
			</Link>
		</div>
	);
};

// Grup satu jabatan (header + semua pengurusnya)
const JabatanGroup = ({ jabatan, pengurusList, user, showAddButton, onAddPengurus }) => {
	const displayJabatan = getDisplayJabatan(jabatan);
	const isEmpty = pengurusList.length === 0;

	return (
		<div className="border-b border-gray-50 last:border-0">
			{/* Jabatan header */}
			<div className="flex items-center justify-between px-4 py-2 bg-gray-50/70">
				<span className="text-xs font-semibold text-gray-500 tracking-wide">
					{displayJabatan}
				</span>
				{showAddButton && (
					<button
						onClick={() => onAddPengurus?.(jabatan)}
						className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
					>
						<LuPlus className="w-3 h-3" />
						Tambah
					</button>
				)}
			</div>

			{/* Pengurus list atau placeholder kosong */}
			{isEmpty ? (
				<div className="flex items-center gap-3 px-4 py-2.5">
					<div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center flex-shrink-0">
						<LuUser className="w-3.5 h-3.5 text-gray-300" />
					</div>
					<p className="text-xs text-gray-400">Belum ada pengurus</p>
				</div>
			) : (
				pengurusList.map((pengurus) => (
					<PengurusRow key={pengurus.id} pengurus={pengurus} user={user} />
				))
			)}
		</div>
	);
};

// Baris pengurus jabatan tidak terpetakan
const UnmappedRow = ({ pengurus, user }) => (
	<div className="border-b border-gray-50 last:border-0">
		<div className="flex items-center justify-between px-4 py-2 bg-amber-50/60">
			<div className="flex items-center gap-1.5">
				<LuTriangleAlert className="w-3 h-3 text-amber-500" />
				<span className="text-xs font-semibold text-amber-600 tracking-wide">
					{pengurus.jabatan || "Jabatan tidak dikenal"}
				</span>
				<span className="text-[10px] text-amber-500 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
					Di luar struktur
				</span>
			</div>
		</div>
		<div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
			{pengurus.avatar ? (
				<img
					src={`${imageBaseUrl}/${pengurus.avatar}`}
					alt={pengurus.nama_lengkap}
					className="w-9 h-9 rounded-full object-cover flex-shrink-0"
				/>
			) : (
				<div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
					<span className="text-xs font-bold text-amber-600">
						{getInitials(pengurus.nama_lengkap)}
					</span>
				</div>
			)}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm font-semibold text-gray-900">{pengurus.nama_lengkap}</span>
					<VerifikasiBadge status={pengurus.status_verifikasi} />
				</div>
			</div>
			<Link
				to={getPengurusRoutePath(user, pengurus.id)}
				className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-gray-200 hover:border-indigo-200 transition-all flex-shrink-0"
			>
				<LuEye className="w-3.5 h-3.5" />
				<span>Detail</span>
			</Link>
		</div>
	</div>
);

const PengurusJabatanList = ({ kelembagaanType, kelembagaanId, onAddPengurus, desaId }) => {
	const { user, isSuperAdmin, isAdminBidangPMD, isUserDesa, isKecamatan } = useAuth();
	const { isEditMode } = useEditMode();

	const showAddButton = isSuperAdmin() || isAdminBidangPMD() || (isUserDesa() && isEditMode);

	const [activePengurus, setActivePengurus] = useState([]);
	const [historyPengurus, setHistoryPengurus] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showHistory, setShowHistory] = useState(false);

	const defaultJabatan = getJabatanList(kelembagaanType);

	const loadPengurus = useCallback(async () => {
		if (!kelembagaanId || !kelembagaanType) return;
		setLoading(true);
		try {
			const adminDesaId =
				isSuperAdmin() || isAdminBidangPMD() || isKecamatan?.() ? desaId : null;
			const [activeRes, historyRes] = await Promise.all([
				getPengurusByKelembagaan(kelembagaanType, kelembagaanId, adminDesaId),
				getPengurusHistory(kelembagaanType, kelembagaanId, adminDesaId),
			]);
			setActivePengurus(activeRes?.data?.data || []);
			setHistoryPengurus(historyRes?.data?.data || []);
		} catch (err) {
			console.error("Error loading pengurus:", err);
			setActivePengurus([]);
			setHistoryPengurus([]);
		} finally {
			setLoading(false);
		}
	}, [kelembagaanType, kelembagaanId, desaId]);

	useEffect(() => {
		loadPengurus();
	}, [loadPengurus]);

	// Mapping jabatan → semua pengurus (case-insensitive)
	const jabatanMap = {};
	defaultJabatan.forEach((jabatan) => {
		jabatanMap[jabatan] = activePengurus.filter(
			(p) => p.jabatan?.toUpperCase()?.trim() === jabatan.toUpperCase().trim(),
		);
	});

	const unmappedPengurus = activePengurus.filter(
		(p) =>
			!defaultJabatan.some(
				(j) => j.toUpperCase().trim() === p.jabatan?.toUpperCase()?.trim(),
			),
	);

	const filledCount = Object.values(jabatanMap).filter((list) => list.length > 0).length;
	const totalJabatan = defaultJabatan.length;

	if (loading) {
		return (
			<div className="bg-white rounded-xl border border-gray-200 shadow-sm">
				<div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
					<div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
					<div className="space-y-1.5">
						<div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
						<div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
					</div>
				</div>
				{[...Array(5)].map((_, i) => (
					<div key={i} className="border-b border-gray-50 last:border-0">
						<div className="h-8 bg-gray-50 px-4 flex items-center">
							<div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
						</div>
						<div className="flex items-center gap-3 px-4 py-2.5">
							<div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
							<div className="flex-1 space-y-1.5">
								<div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
								<div className="h-2.5 w-24 bg-gray-100 rounded animate-pulse" />
							</div>
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
						<LuUsers className="w-4 h-4 text-indigo-500" />
					</div>
					<div>
						<h3 className="text-sm font-semibold text-gray-800">Struktur Pengurus</h3>
						<p className="text-xs text-gray-500">
							{filledCount} dari {totalJabatan} jabatan terisi
						</p>
					</div>
				</div>

				{historyPengurus.length > 0 && (
					<button
						onClick={() => setShowHistory((v) => !v)}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
							showHistory
								? "bg-indigo-50 text-indigo-700 border-indigo-200"
								: "text-gray-500 border-gray-200 hover:bg-gray-50"
						}`}
					>
						{showHistory ? (
							<LuUsers className="w-3.5 h-3.5" />
						) : (
							<LuHistory className="w-3.5 h-3.5" />
						)}
						{showHistory ? "Aktif" : "Riwayat"}
					</button>
				)}
			</div>

			{/* Daftar jabatan — grouped */}
			{!showHistory && (
				<>
					{defaultJabatan.map((jabatan) => (
						<JabatanGroup
							key={jabatan}
							jabatan={jabatan}
							pengurusList={jabatanMap[jabatan] || []}
							user={user}
							showAddButton={showAddButton}
							onAddPengurus={onAddPengurus}
						/>
					))}

					{unmappedPengurus.map((p) => (
						<UnmappedRow key={p.id} pengurus={p} user={user} />
					))}
				</>
			)}

			{/* Riwayat */}
			{showHistory && (
				<div className="divide-y divide-gray-50">
					{historyPengurus.length === 0 ? (
						<div className="py-10 text-center text-sm text-gray-400">
							Tidak ada riwayat pengurus
						</div>
					) : (
						historyPengurus.map((pengurus) => (
							<div
								key={pengurus.id}
								className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
							>
								{pengurus.avatar ? (
									<img
										src={`${imageBaseUrl}/${pengurus.avatar}`}
										alt={pengurus.nama_lengkap}
										className="w-9 h-9 rounded-full object-cover opacity-70 flex-shrink-0"
									/>
								) : (
									<div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
										<span className="text-xs font-bold text-gray-500">
											{getInitials(pengurus.nama_lengkap)}
										</span>
									</div>
								)}

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="text-sm font-semibold text-gray-700">
											{pengurus.nama_lengkap}
										</span>
										<span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
											Selesai Menjabat
										</span>
									</div>
									<div className="flex items-center gap-3 mt-0.5">
										<span className="text-xs text-gray-500">
											{getDisplayJabatan(pengurus.jabatan) || pengurus.jabatan}
										</span>
										{pengurus.tanggal_mulai_jabatan && pengurus.tanggal_akhir_jabatan && (
											<span className="flex items-center gap-1 text-xs text-gray-400">
												<LuCalendar className="w-3 h-3" />
												{new Date(pengurus.tanggal_mulai_jabatan).getFullYear()} –{" "}
												{new Date(pengurus.tanggal_akhir_jabatan).getFullYear()}
											</span>
										)}
									</div>
								</div>

								<Link
									to={getPengurusRoutePath(user, pengurus.id)}
									className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-gray-200 hover:border-indigo-200 transition-all flex-shrink-0"
								>
									<LuEye className="w-3.5 h-3.5" />
									<span>Detail</span>
								</Link>
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
};

export default PengurusJabatanList;
