// src/pages/dashboard/UserManagementPage.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
	LuUsers,
	LuUser,
	LuMail,
	LuCalendar,
	LuPlus,
	LuKey,
	LuTrash2,
	LuShield,
	LuSearch,
	LuFilter,
	LuChevronDown,
	LuBuilding2,
	LuMapPin,
	LuHouse,
	LuBriefcase,
	LuChevronLeft,
	LuChevronRight,
	LuDownload,
	LuFileSpreadsheet,
	LuEye,
	LuEyeOff,
	LuLock,
	LuPenLine,
	LuHash,
	LuEllipsisVertical,
	LuCake,
	LuBadgeCheck,
	LuCamera,
	LuSmartphone,
} from "react-icons/lu";
import * as XLSX from 'xlsx';
import api from "../../api";
import AddUserModal from "../../components/AddUserModal";
import ResetPasswordModal from "../../components/ResetPasswordModal";
import EditRoleModal from "../../components/EditRoleModal";
import EditBidangModal from "../../components/EditBidangModal";
import EditTanggalLahirModal from "../../components/EditTanggalLahirModal";
import EditJabatanModal from "../../components/EditJabatanModal";
import EditAvatarModal from "../../components/EditAvatarModal";
import RoleManagementModal from "../../components/RoleManagementModal";
import UserStatsCard from "../../components/UserStatsCard";
import OnlineUsersSidebar from "../../components/users/OnlineUsersSidebar";
import { getAvatarUrl } from "../../utils/avatarUtils";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

// ─── Role gradient & ring configs ────────────────────────────────
const ROLE_THEME = {
	superadmin:       { gradient: "from-rose-500 via-red-500 to-pink-600",   ring: "ring-rose-200",   bg: "bg-rose-500",   glow: "shadow-rose-200/60" },
	kepala_dinas:     { gradient: "from-blue-500 via-indigo-500 to-blue-700", ring: "ring-blue-200",   bg: "bg-blue-500",   glow: "shadow-blue-200/60" },
	sekretaris_dinas: { gradient: "from-indigo-500 via-purple-500 to-indigo-700", ring: "ring-indigo-200", bg: "bg-indigo-500", glow: "shadow-indigo-200/60" },
	kepala_bidang:    { gradient: "from-emerald-500 via-teal-500 to-green-600", ring: "ring-emerald-200", bg: "bg-emerald-500", glow: "shadow-emerald-200/60" },
	ketua_tim:        { gradient: "from-teal-500 via-cyan-500 to-teal-600", ring: "ring-teal-200",   bg: "bg-teal-500",   glow: "shadow-teal-200/60" },
	pegawai:          { gradient: "from-slate-500 via-gray-500 to-slate-600", ring: "ring-slate-200",  bg: "bg-slate-500",  glow: "shadow-slate-200/60" },
	desa:             { gradient: "from-emerald-500 via-green-500 to-lime-600", ring: "ring-green-200",  bg: "bg-green-500",  glow: "shadow-green-200/60" },
	kecamatan:        { gradient: "from-violet-500 via-purple-500 to-fuchsia-600", ring: "ring-violet-200", bg: "bg-violet-500", glow: "shadow-violet-200/60" },
	dinas_terkait:    { gradient: "from-amber-500 via-orange-500 to-yellow-600", ring: "ring-amber-200",  bg: "bg-amber-500",  glow: "shadow-amber-200/60" },
	verifikator_dinas:{ gradient: "from-orange-500 via-rose-500 to-pink-500", ring: "ring-orange-200", bg: "bg-orange-500", glow: "shadow-orange-200/60" },
};
const DEFAULT_THEME = { gradient: "from-gray-400 to-gray-600", ring: "ring-gray-200", bg: "bg-gray-500", glow: "shadow-gray-200/60" };

// ─── UserCard ────────────────────────────────────────────────────
const UserCard = ({
	user, canManage, isSuperadmin, visiblePasswords, togglePasswordVisibility,
	onEditRole, onEditBidang, onEditTanggalLahir, onEditJabatan,
	onEditAvatar, onSetDevice, onResetPassword, onDeleteUser, getRoleInfo,
}) => {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);
	const theme = ROLE_THEME[user.role] || DEFAULT_THEME;
	const roleInfo = getRoleInfo(user.role);
	const avatarUrl = getAvatarUrl(user.avatar);

	// Close menu on outside click
	useEffect(() => {
		const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
		if (menuOpen) document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [menuOpen]);

	const InfoRow = ({ icon: Icon, children, mono }) => (
		<div className="flex items-center gap-2 min-w-0">
			<div className="flex-shrink-0 w-5 h-5 rounded-md bg-gray-50 flex items-center justify-center">
				<Icon className="h-3 w-3 text-gray-400" />
			</div>
			<span className={`text-[13px] text-gray-600 truncate ${mono ? 'font-mono tracking-tight' : ''}`}>
				{children}
			</span>
		</div>
	);

	return (
		<div className="group relative bg-white rounded-[20px] border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-gray-200/50">
			{/* Decorative gradient header */}
			<div className={`relative h-20 bg-gradient-to-br ${theme.gradient} overflow-hidden`}>
				{/* Mesh pattern overlay */}
				<div className="absolute inset-0 opacity-20" style={{
					backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)',
				}} />
				{/* Floating circles for depth */}
				<div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10 blur-sm" />
				<div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-black/5" />

				{/* Three-dot menu */}
				{canManage && (
					<div className="absolute top-2.5 right-2.5" ref={menuRef}>
						<button
							onClick={() => setMenuOpen(!menuOpen)}
							className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all"
						>
							<LuEllipsisVertical className="h-4 w-4 text-white" />
						</button>

						{menuOpen && (
							<div className="absolute right-0 top-10 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
								<div className="p-1.5">
									<button onClick={() => { onEditRole(user); setMenuOpen(false); }}
										className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors">
										<div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
											<LuShield className="h-4 w-4 text-blue-600" />
										</div>
										<span className="font-medium">Ubah Role</span>
									</button>
									<button onClick={() => { onEditBidang(user); setMenuOpen(false); }}
										className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-colors">
										<div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
											<LuBuilding2 className="h-4 w-4 text-purple-600" />
										</div>
										<span className="font-medium">Ubah Bidang</span>
									</button>
									<button onClick={() => { onEditTanggalLahir(user); setMenuOpen(false); }}
										className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 rounded-xl transition-colors">
										<div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
											<LuCake className="h-4 w-4 text-orange-600" />
										</div>
										<span className="font-medium">Tanggal Lahir</span>
									</button>
									<button onClick={() => { onEditJabatan(user); setMenuOpen(false); }}
										className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors">
										<div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
											<LuPenLine className="h-4 w-4 text-teal-600" />
										</div>
										<span className="font-medium">Jabatan & Status</span>
									</button>
									<div className="my-1.5 border-t border-gray-100" />
									{['PPPK_Paruh_Waktu','Tenaga_Alih_Daya','Tenaga_Keamanan','Tenaga_Kebersihan'].includes(user.status_kepegawaian) && (
										<button onClick={() => { onSetDevice(user); setMenuOpen(false); }}
											className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-700 rounded-xl transition-colors">
											<div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
												<LuSmartphone className="h-4 w-4 text-cyan-600" />
											</div>
											<span className="font-medium">Device Absensi</span>
										</button>
									)}
									<button onClick={() => { onResetPassword(user); setMenuOpen(false); }}
										className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors">
										<div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
											<LuKey className="h-4 w-4 text-amber-600" />
										</div>
										<span className="font-medium">Reset Password</span>
									</button>
									<button onClick={() => { onDeleteUser(user); setMenuOpen(false); }}
										className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
										<div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
											<LuTrash2 className="h-4 w-4 text-red-500" />
										</div>
										<span className="font-medium">Hapus User</span>
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Avatar — floats between header and body */}
			<div className="relative px-5 -mt-10">
				<div className={`relative w-[72px] h-[72px] rounded-2xl ring-[3px] ${theme.ring} ring-offset-2 ring-offset-white shadow-lg ${theme.glow} overflow-hidden`}>
					{avatarUrl ? (
						<img
							src={avatarUrl}
							alt={user.name}
							className="w-full h-full object-cover"
							onError={(e) => {
								e.target.style.display = 'none';
								e.target.nextElementSibling.style.display = 'flex';
							}}
						/>
					) : null}
					<div className={`w-full h-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center ${avatarUrl ? 'hidden' : ''}`}>
						<span className="text-white font-bold text-2xl drop-shadow-sm">
							{user.name?.charAt(0)?.toUpperCase() || "U"}
						</span>
					</div>
				</div>
				{/* Active dot */}
				{user.is_active && (
					<div className="absolute bottom-0 left-[68px] w-4 h-4 rounded-full bg-emerald-400 border-[2.5px] border-white shadow-sm" />
				)}
			</div>

			{/* Body */}
			<div className="px-5 pt-3 pb-4">
				{/* Name */}
				<h4 className="font-bold text-gray-900 text-[15px] leading-tight truncate mb-1.5">
					{user.name}
				</h4>

				{/* Badges row */}
				<div className="flex flex-wrap items-center gap-1.5 mb-3">
					<span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border ${roleInfo.color}`}>
						<LuBadgeCheck className="w-3 h-3" />
						{roleInfo.label}
					</span>
					{user.status_kepegawaian && (
						<span className="inline-flex items-center px-2 py-1 text-[11px] font-medium rounded-lg bg-gray-50 text-gray-600 border border-gray-100">
							{user.status_kepegawaian?.replace(/_/g, ' ')}
						</span>
					)}
				</div>

				{/* Info rows */}
				<div className="space-y-1.5">
					<InfoRow icon={LuMail}>{user.email}</InfoRow>

					{user.nip && <InfoRow icon={LuHash} mono>{user.nip}</InfoRow>}

					{user.jabatan && <InfoRow icon={LuBriefcase}>{user.jabatan}</InfoRow>}

					{user.bidang && <InfoRow icon={LuBuilding2}>{user.bidang.nama}</InfoRow>}

					{user.desa && <InfoRow icon={LuHouse}>{user.desa.nama}</InfoRow>}

					{user.kecamatan && <InfoRow icon={LuMapPin}>{user.kecamatan.nama}</InfoRow>}

					{user.dinas && <InfoRow icon={LuBuilding2}>{user.dinas.nama_dinas}</InfoRow>}

					{(user.tempat_lahir || user.tanggal_lahir) && (
						<InfoRow icon={LuCake}>
							{[
								user.tempat_lahir,
								user.tanggal_lahir ? new Date(user.tanggal_lahir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null
							].filter(Boolean).join(', ')}
						</InfoRow>
					)}

					{/* Password - only visible to superadmin, never shown for superadmin users */}
					{isSuperadmin && user.role !== 'superadmin' && (
						<div className="flex items-center gap-2 min-w-0">
							<div className="flex-shrink-0 w-5 h-5 rounded-md bg-gray-50 flex items-center justify-center">
								<LuLock className="h-3 w-3 text-gray-400" />
							</div>
							{user.plain_password ? (
								<div className="flex items-center gap-1 flex-1 min-w-0">
									<span className="text-[13px] font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-md truncate">
										{visiblePasswords[user.id] ? user.plain_password : '••••••••'}
									</span>
									<button
										onClick={() => togglePasswordVisibility(user.id)}
										className="flex-shrink-0 w-5 h-5 rounded-md hover:bg-gray-100 flex items-center justify-center transition-colors"
									>
										{visiblePasswords[user.id] ? <LuEyeOff className="h-3 w-3 text-gray-400" /> : <LuEye className="h-3 w-3 text-gray-400" />}
									</button>
								</div>
							) : (
								<span className="text-[13px] text-gray-400 italic">Tidak tersedia</span>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Bottom action bar — visible on hover */}
			{canManage && (
				<div className="px-4 pb-3 pt-0 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
					<div className="flex flex-wrap items-center justify-center gap-1.5 bg-gray-50/80 backdrop-blur-sm rounded-xl p-2">
						<button onClick={() => onEditRole(user)} title="Ubah Role"
							className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
							<LuShield className="h-3.5 w-3.5" />
							<span>Role</span>
						</button>
						<button onClick={() => onEditBidang(user)} title="Ubah Bidang"
							className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors">
							<LuBuilding2 className="h-3.5 w-3.5" />
							<span>Bidang</span>
						</button>
						<button onClick={() => onEditAvatar(user)} title="Ubah Foto Profil"
							className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 transition-colors">
							<LuCamera className="h-3.5 w-3.5" />
							<span>Foto</span>
						</button>
						<button onClick={() => onEditTanggalLahir(user)} title="Tanggal Lahir"
							className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors">
							<LuCake className="h-3.5 w-3.5" />
							<span>Tgl Lahir</span>
						</button>
						<button onClick={() => onEditJabatan(user)} title="Jabatan & Status"
							className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 transition-colors">
							<LuPenLine className="h-3.5 w-3.5" />
							<span>Jabatan</span>
						</button>
						{['PPPK_Paruh_Waktu','Tenaga_Alih_Daya','Tenaga_Keamanan','Tenaga_Kebersihan'].includes(user.status_kepegawaian) && (
							<button onClick={() => onSetDevice(user)} title="Device Absensi"
								className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-cyan-600 bg-cyan-50 hover:bg-cyan-100 transition-colors">
								<LuSmartphone className="h-3.5 w-3.5" />
								<span>Device</span>
							</button>
						)}
						<div className="w-px h-5 bg-gray-200" />
						<button onClick={() => onResetPassword(user)} title="Reset Password"
							className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors">
							<LuKey className="h-3.5 w-3.5" />
							<span>Reset</span>
						</button>
						<button onClick={() => onDeleteUser(user)} title="Hapus"
							className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
							<LuTrash2 className="h-3.5 w-3.5" />
							<span>Hapus</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

const UserManagementPage = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showRoleManagement, setShowRoleManagement] = useState(false);
	const [showResetModal, setShowResetModal] = useState(false);
	const [showRoleModal, setShowRoleModal] = useState(false);
	const [showBidangModal, setShowBidangModal] = useState(false);
	const [showTanggalLahirModal, setShowTanggalLahirModal] = useState(false);
	const [showJabatanModal, setShowJabatanModal] = useState(false);
	const [showAvatarModal, setShowAvatarModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [isResettingPassword, setIsResettingPassword] = useState(false);
	
	// Filters
	const [searchTerm, setSearchTerm] = useState("");
	const [filterBidang, setFilterBidang] = useState("all"); // Filter bidang untuk tab Pegawai DPMD
	const [filterDinas, setFilterDinas] = useState("all"); // Filter dinas untuk tab Dinas Terkait
	const [activeTab, setActiveTab] = useState("superadmin"); // Tab aktif
	const [bidangList, setBidangList] = useState([]); // List bidang untuk dropdown
	const [dinasList, setDinasList] = useState([]); // List dinas untuk dropdown

	// Pagination
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(12); // 12 items per page untuk grid 3 kolom

	// Password visibility state
	const [visiblePasswords, setVisiblePasswords] = useState({});

	const { user: currentUser } = useAuth();
	const canManage =
		currentUser?.role === "superadmin" ||
		currentUser?.role === "sekretaris_dinas" ||
		Number(currentUser?.bidang_id) === 2;

	// Tab configuration
	const tabs = [
		{ id: "superadmin", label: "Super Admin", role: "superadmin", icon: LuShield, color: "red" },
		{ 
			id: "pegawai", 
			label: "Pegawai DPMD", 
			roles: ["kepala_dinas", "sekretaris_dinas", "kepala_bidang", "ketua_tim", "pegawai"], 
			icon: LuBriefcase, 
			color: "blue" 
		},
		{ id: "desa", label: "Admin Desa", role: "desa", icon: LuHouse, color: "emerald" },
		{ id: "kecamatan", label: "Admin Kecamatan", role: "kecamatan", icon: LuMapPin, color: "violet" },
		{ id: "dinas_terkait", label: "Dinas Terkait", role: "dinas_terkait", icon: LuBuilding2, color: "amber" },
	];

	// Fetch users
	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const response = await api.get("/users", {
				params: {
					limit: 1000,
				},
			});
			setUsers(response.data.data || []);
		} catch (err) {
			setError("Gagal mengambil data user.");
			console.error("Error fetching users:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	// Fetch bidang list
	const fetchBidangList = useCallback(async () => {
		try {
			const response = await api.get("/bidang");
			setBidangList(response.data.data || []);
		} catch (err) {
			console.error("Error fetching bidang:", err);
		}
	}, []);

	// Fetch dinas list
	const fetchDinasList = useCallback(async () => {
		try {
			const response = await api.get("/master/dinas");
			setDinasList(response.data.data || []);
		} catch (err) {
			console.error("Error fetching dinas:", err);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
		fetchBidangList();
		fetchDinasList();
	}, [fetchUsers, fetchBidangList, fetchDinasList]);

	// Handle user added
	const handleUserAdded = () => {
		setShowAddModal(false);
		fetchUsers();
		Swal.fire({
			title: "Berhasil!",
			text: "User berhasil ditambahkan",
			icon: "success",
			timer: 2000,
			showConfirmButton: false,
		});
	};

	// Handle reset password
	const handleResetPassword = (user) => {
		setSelectedUser(user);
		setShowResetModal(true);
	};

	const handleConfirmResetPassword = async () => {
		if (!selectedUser) return;

		setIsResettingPassword(true);
		try {
			await api.put(`/users/${selectedUser.id}/reset-password`, {
				password: "password",
			});

			setShowResetModal(false);
			setSelectedUser(null);

			Swal.fire({
				title: "Berhasil!",
				text: `Password untuk ${selectedUser.name} berhasil direset!`,
				icon: "success",
				confirmButtonText: "OK",
				confirmButtonColor: "#10b981",
			});
		} catch (error) {
			console.error("Error resetting password:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal mereset password.",
				icon: "error",
				confirmButtonText: "OK",
				confirmButtonColor: "#ef4444",
			});
		} finally {
			setIsResettingPassword(false);
		}
	};

	// Handle edit role
	const handleEditRole = (user) => {
		setSelectedUser(user);
		setShowRoleModal(true);
	};

	const handleRoleUpdated = () => {
		setShowRoleModal(false);
		setSelectedUser(null);
		fetchUsers();
	};

	// Handle edit bidang
	const handleEditBidang = (user) => {
		setSelectedUser(user);
		setShowBidangModal(true);
	};

	// Handle edit tanggal lahir
	const handleEditTanggalLahir = (user) => {
		setSelectedUser(user);
		setShowTanggalLahirModal(true);
	};

	// Handle edit jabatan
	const handleEditJabatan = (user) => {
		setSelectedUser(user);
		setShowJabatanModal(true);
	};

	// Handle edit avatar
	const handleEditAvatar = (user) => {
		setSelectedUser(user);
		setShowAvatarModal(true);
	};

	const handleBidangUpdated = () => {
		setShowBidangModal(false);
		setSelectedUser(null);
		fetchUsers();
	};

	const handleTanggalLahirUpdated = () => {
		setShowTanggalLahirModal(false);
		setSelectedUser(null);
		fetchUsers();
	};

	const handleAvatarUpdated = () => {
		setShowAvatarModal(false);
		setSelectedUser(null);
		fetchUsers();
	};

	// Handle device management
	const handleSetDevice = async (user) => {
		const result = await Swal.fire({
			title: 'Device Absensi',
			html: `<p class="text-sm text-gray-600 mb-2">Pegawai: <strong>${user.name}</strong></p>` +
				(user.device_id ? `<p class="text-xs text-gray-400 mb-3">Device terdaftar: <code class="bg-gray-100 px-1 rounded">${user.device_id}</code></p>` : '<p class="text-xs text-red-500 mb-3">Belum ada device terdaftar</p>') +
				'<p class="text-xs text-gray-500">Masukkan Device ID dari HP pegawai. Device ID dapat dilihat di halaman Absensi pegawai.</p>',
			input: 'text',
			inputValue: user.device_id || '',
			inputPlaceholder: 'Paste Device ID dari pegawai...',
			showCancelButton: true,
			confirmButtonText: user.device_id ? 'Update Device' : 'Daftarkan Device',
			cancelButtonText: 'Batal',
			confirmButtonColor: '#06b6d4',
			showDenyButton: !!user.device_id,
			denyButtonText: 'Hapus Device',
			denyButtonColor: '#ef4444',
			inputValidator: (value) => {
				if (!value) return 'Device ID tidak boleh kosong';
			},
		});

		if (result.dismiss) return; // cancelled

		const deviceId = result.isDenied ? null : result.value;

		try {
			await api.put(`/absensi/admin/set-device/${user.id}`, {
				device_id: deviceId
			});
			Swal.fire({ icon: 'success', title: 'Berhasil', text: deviceId ? 'Device berhasil didaftarkan' : 'Device berhasil dihapus', timer: 2000, showConfirmButton: false });
			fetchUsers();
		} catch (err) {
			Swal.fire({ icon: 'error', title: 'Gagal', text: err.response?.data?.message || 'Gagal update device' });
		}
	};

	const handleJabatanUpdated = () => {
		setShowJabatanModal(false);
		setSelectedUser(null);
		fetchUsers();
	};

	// Handle toggle password visibility
	const togglePasswordVisibility = (userId) => {
		setVisiblePasswords(prev => ({
			...prev,
			[userId]: !prev[userId]
		}));
	};

	// Handle delete user
	const handleDeleteUser = async (user) => {
		const result = await Swal.fire({
			title: "Hapus User?",
			text: `Apakah Anda yakin ingin menghapus user ${user.name}?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#3085d6",
			confirmButtonText: "Ya, Hapus!",
			cancelButtonText: "Batal",
		});

		if (result.isConfirmed) {
			try {
				await api.delete(`/users/${user.id}`);
				Swal.fire("Terhapus!", "User berhasil dihapus.", "success");
				fetchUsers();
			} catch (err) {
				Swal.fire(
					"Error!",
					err.response?.data?.message || "Gagal menghapus user.",
					"error"
				);
			}
		}
	};

	// Get role info from schema
	const getRoleInfo = (role) => {
		const roleMap = {
			superadmin: { label: "Super Admin", color: "bg-red-100 text-red-700 border-red-200" },
			kepala_dinas: { label: "Kepala Dinas", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
			sekretaris_dinas: { label: "Sekretaris Dinas", color: "bg-blue-100 text-blue-700 border-blue-200" },
			kepala_bidang: { label: "Kepala Bidang", color: "bg-teal-100 text-teal-700 border-teal-200" },
			ketua_tim: { label: "Ketua Tim", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
			pegawai: { label: "Pegawai", color: "bg-gray-100 text-gray-700 border-gray-200" },
			desa: { label: "Admin Desa", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
			kecamatan: { label: "Admin Kecamatan", color: "bg-violet-100 text-violet-700 border-violet-200" },
			dinas_terkait: { label: "Dinas Terkait", color: "bg-amber-100 text-amber-700 border-amber-200" },
			verifikator_dinas: { label: "Verifikator Dinas", color: "bg-orange-100 text-orange-700 border-orange-200" },
		};
		return roleMap[role] || { label: role, color: "bg-gray-100 text-gray-700 border-gray-200" };
	};

	// Get icon for role
	const getRoleIcon = (role) => {
		if (role === "desa") return LuHouse;
		if (role === "kecamatan") return LuMapPin;
		if (["kepala_bidang", "ketua_tim", "pegawai", "sekretariat", "sarana_prasarana", "kekayaan_keuangan", "pemberdayaan_masyarakat", "pemerintahan_desa"].includes(role)) {
			return LuBriefcase;
		}
		return LuUser;
	};

	// Filter users
	const filteredUsers = useMemo(() => {
		return users.filter((user) => {
			// Filter berdasarkan tab aktif
			const activeTabConfig = tabs.find(t => t.id === activeTab);
			let matchTab = false;
			
			if (activeTabConfig.role) {
				matchTab = user.role === activeTabConfig.role;
			} else if (activeTabConfig.roles) {
				matchTab = activeTabConfig.roles.includes(user.role);
			}

			// Filter berdasarkan search
			const searchLower = searchTerm.toLowerCase();
			const matchSearch =
				user.name?.toLowerCase().includes(searchLower) ||
				user.email?.toLowerCase().includes(searchLower) ||
				user.desa?.nama?.toLowerCase().includes(searchLower) ||
				user.kecamatan?.nama?.toLowerCase().includes(searchLower) ||
				user.bidang?.nama?.toLowerCase().includes(searchLower);

			// Filter berdasarkan bidang (hanya untuk tab Pegawai DPMD)
			const matchBidang = 
				activeTab !== "pegawai" ||
				filterBidang === "all" ||
				user.bidang_id === parseInt(filterBidang);

			// Filter berdasarkan dinas (hanya untuk tab Dinas Terkait)
			const matchDinas = 
				activeTab !== "dinas_terkait" ||
				filterDinas === "all" ||
				user.dinas_id === parseInt(filterDinas);

			return matchTab && matchSearch && matchBidang && matchDinas;
		});
	}, [users, searchTerm, activeTab, filterBidang, filterDinas, tabs]);

	// Pagination calculations
	const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, activeTab, filterBidang, filterDinas]);

	// Export users to Excel
	const handleExportUsers = (exportType = 'current') => {
		let dataToExport = [];
		let sheetName = '';
		let fileName = '';

		const activeTabConfig = tabs.find(t => t.id === activeTab);
		const today = new Date().toISOString().split('T')[0];

		if (exportType === 'current') {
			// Export tab yang sedang aktif
			dataToExport = filteredUsers;
			sheetName = activeTabConfig?.label || 'Users';
			fileName = `User_${sheetName.replace(/\s+/g, '_')}_${today}.xlsx`;
		} else if (exportType === 'all') {
			// Export semua user ke multiple sheets
			const wb = XLSX.utils.book_new();

			tabs.forEach(tab => {
				const tabUsers = users.filter(user => {
					if (tab.role) return user.role === tab.role;
					if (tab.roles) return tab.roles.includes(user.role);
					return false;
				});

				if (tabUsers.length === 0) return;

				const isSuperadminUser = currentUser?.role === 'superadmin';
				const rows = tabUsers.map((user, idx) => ({
					'No': idx + 1,
					'Nama': user.name || '',
					'Email': user.email || '',
					...(isSuperadminUser ? { 'Password': user.role === 'superadmin' ? '-' : (user.plain_password || '-') } : {}),
					'Role': getRoleInfo(user.role).label,
					...(tab.id === 'pegawai' ? { 'Bidang': user.bidang?.nama || '-' } : {}),
					...(tab.id === 'desa' ? {
						'Desa': user.desa?.nama || '-',
						'Kecamatan': user.desa?.kecamatan?.nama || user.kecamatan?.nama || '-',
					} : {}),
					...(tab.id === 'kecamatan' ? { 'Kecamatan': user.kecamatan?.nama || '-' } : {}),
					...(tab.id === 'dinas_terkait' ? { 'Dinas': user.dinas?.nama_dinas || '-' } : {}),
					'Tanggal Dibuat': user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '-',
				}));

				const ws = XLSX.utils.json_to_sheet(rows);

				// Auto-width columns
				const colWidths = Object.keys(rows[0] || {}).map(key => ({
					wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2
				}));
				ws['!cols'] = colWidths;

				XLSX.utils.book_append_sheet(wb, ws, tab.label.substring(0, 31));
			});

			XLSX.writeFile(wb, `Semua_User_DPMD_${today}.xlsx`);
			Swal.fire({
				title: 'Berhasil!',
				text: 'Data semua user berhasil diekspor ke Excel',
				icon: 'success',
				timer: 2000,
				showConfirmButton: false,
			});
			return;
		}

		// Single sheet export
		const isSuperadminUser = currentUser?.role === 'superadmin';
		const rows = dataToExport.map((user, idx) => {
			const row = {
				'No': idx + 1,
				'Nama': user.name || '',
				'Email': user.email || '',
				...(isSuperadminUser ? { 'Password': user.role === 'superadmin' ? '-' : (user.plain_password || '-') } : {}),
				'Role': getRoleInfo(user.role).label,
			};

			// Kolom tambahan berdasarkan tab
			if (activeTab === 'pegawai') {
				row['Bidang'] = user.bidang?.nama || '-';
			} else if (activeTab === 'desa') {
				row['Desa'] = user.desa?.nama || '-';
				row['Kecamatan'] = user.desa?.kecamatan?.nama || user.kecamatan?.nama || '-';
			} else if (activeTab === 'kecamatan') {
				row['Kecamatan'] = user.kecamatan?.nama || '-';
			} else if (activeTab === 'dinas_terkait') {
				row['Dinas'] = user.dinas?.nama_dinas || '-';
			}

			row['Tanggal Dibuat'] = user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '-';
			return row;
		});

		const ws = XLSX.utils.json_to_sheet(rows);

		// Auto-width columns
		if (rows.length > 0) {
			const colWidths = Object.keys(rows[0]).map(key => ({
				wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2
			}));
			ws['!cols'] = colWidths;
		}

		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
		XLSX.writeFile(wb, fileName);

		Swal.fire({
			title: 'Berhasil!',
			text: `Data ${sheetName} berhasil diekspor ke Excel (${dataToExport.length} user)`,
			icon: 'success',
			timer: 2000,
			showConfirmButton: false,
		});
	};

	// State for export dropdown
	const [showExportMenu, setShowExportMenu] = useState(false);

	// Group by role for stats
	const statsByRole = useMemo(() => {
		const stats = {};
		users.forEach((user) => {
			stats[user.role] = (stats[user.role] || 0) + 1;
		});
		return stats;
	}, [users]);

	if (loading)
		return (
			<div className="flex justify-center items-center p-12">
				<div className="flex flex-col items-center gap-3">
					<div className="animate-spin rounded-full h-12 w-12 border-b-3 border-indigo-500"></div>
					<p className="text-gray-600 text-sm">Memuat data...</p>
				</div>
			</div>
		);

	if (error)
		return (
			<div className="p-6 text-center bg-red-50 border border-red-200 rounded-xl">
				<p className="text-red-600 font-medium">{error}</p>
			</div>
		);

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
			<div className="flex gap-6">
			{/* Main Content */}
			<div className="flex-1 min-w-0">
			{/* Header */}
			<div className="mb-6">
				<div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
					<div className="absolute inset-0 bg-black opacity-5"></div>
					<div className="relative z-10">
						<h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">
							<div className="h-10 w-10 md:h-12 md:w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
								<LuUsers className="w-6 h-6 md:w-7 md:h-7" />
							</div>
							Manajemen Pengguna
						</h1>
						<p className="text-white/90 text-base md:text-lg">
							Kelola semua pengguna sistem DPMD dalam satu halaman
						</p>
					</div>
				</div>
			</div>

			{/* Statistics */}
			<UserStatsCard />

			{/* Tabs untuk Role */}
			<div className="bg-white rounded-2xl shadow-lg p-4 mb-6 overflow-x-auto">
				<div className="flex gap-2 min-w-max">
					{tabs.map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						const count = tab.role 
							? statsByRole[tab.role] || 0
							: tab.roles?.reduce((sum, r) => sum + (statsByRole[r] || 0), 0) || 0;
						
						// Get button color class
						const getButtonClass = () => {
							if (!isActive) return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
							
							const colorMap = {
								red: 'bg-red-500 text-white shadow-lg',
								blue: 'bg-blue-500 text-white shadow-lg',
								indigo: 'bg-indigo-500 text-white shadow-lg',
								green: 'bg-green-500 text-white shadow-lg',
								teal: 'bg-teal-500 text-white shadow-lg',
								gray: 'bg-gray-500 text-white shadow-lg',
								purple: 'bg-purple-500 text-white shadow-lg',
								emerald: 'bg-emerald-500 text-white shadow-lg',
								violet: 'bg-violet-500 text-white shadow-lg',
							};
							return colorMap[tab.color] || 'bg-gray-500 text-white shadow-lg';
						};
						
						return (
							<button
								key={tab.id}
								onClick={() => {
									setActiveTab(tab.id);
									setSearchTerm('');
									setFilterBidang('all'); // Reset filter bidang
									setFilterDinas('all'); // Reset filter dinas
								}}
								className={`
									flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
									${getButtonClass()}
								`}
							>
								<Icon className="w-4 h-4" />
								<span>{tab.label}</span>
								<span className={`
									px-2 py-0.5 rounded-full text-xs font-bold
									${isActive ? 'bg-white/20' : 'bg-gray-200 text-gray-600'}
								`}>
									{count}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Filters & Actions */}
			<div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
				<div className={`grid grid-cols-1 gap-4 ${(activeTab === "pegawai" || activeTab === "dinas_terkait") ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
					{/* Search */}
					<div className={(activeTab === "pegawai" || activeTab === "dinas_terkait") ? "" : "md:col-span-1"}>
						<div className="relative">
							<LuSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<input
								type="text"
								placeholder="Cari nama, email, atau wilayah..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
							/>
						</div>
					</div>

					{/* Filter Bidang - Hanya muncul di tab Pegawai DPMD */}
					{activeTab === "pegawai" && (
						<div className="relative">
							<LuBuilding2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<select
								value={filterBidang}
								onChange={(e) => setFilterBidang(e.target.value)}
								className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white"
							>
								<option value="all">Semua Bidang</option>
								{bidangList.map((bidang) => (
									<option key={bidang.id} value={bidang.id}>
										{bidang.nama}
									</option>
								))}
							</select>
							<LuChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
						</div>
					)}

					{/* Filter Dinas - Hanya muncul di tab Dinas Terkait */}
					{activeTab === "dinas_terkait" && (
						<div className="relative">
							<LuBuilding2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<select
								value={filterDinas}
								onChange={(e) => setFilterDinas(e.target.value)}
								className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white"
							>
								<option value="all">Semua Dinas</option>
								{dinasList.map((dinas) => (
									<option key={dinas.id} value={dinas.id}>
										{dinas.nama_dinas}
									</option>
								))}
							</select>
							<LuChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
						</div>
					)}
				</div>

				{/* Add User & Export Buttons */}
				<div className="mt-4 flex justify-end gap-3">
					{/* Export Dropdown */}
					<div className="relative">
						<button
							onClick={() => setShowExportMenu(!showExportMenu)}
							className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
						>
							<LuDownload className="h-5 w-5" />
							<span className="font-semibold">Ekspor</span>
							<LuChevronDown className={`h-4 w-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
						</button>

						{showExportMenu && (
							<>
								<div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
								<div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
									<div className="p-3 bg-gray-50 border-b border-gray-200">
										<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ekspor Data User</p>
									</div>
									<div className="p-2">
										<button
											onClick={() => {
												handleExportUsers('current');
												setShowExportMenu(false);
											}}
											className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors"
										>
											<LuFileSpreadsheet className="h-5 w-5 text-emerald-600" />
											<div>
												<p className="font-medium">Ekspor Tab Aktif</p>
												<p className="text-xs text-gray-500">{tabs.find(t => t.id === activeTab)?.label} ({filteredUsers.length} user)</p>
											</div>
										</button>
										<button
											onClick={() => {
												handleExportUsers('all');
												setShowExportMenu(false);
											}}
											className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
										>
											<LuUsers className="h-5 w-5 text-indigo-600" />
											<div>
												<p className="font-medium">Ekspor Semua Kategori</p>
												<p className="text-xs text-gray-500">Semua user ({users.length} user, multi-sheet)</p>
											</div>
										</button>
									</div>
								</div>
							</>
						)}
					</div>

					{currentUser?.role === 'superadmin' && (
						<button
							onClick={() => setShowRoleManagement(true)}
							className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 shadow-sm hover:shadow"
						>
							<LuShield className="h-5 w-5" />
							<span className="font-semibold">Kelola Role</span>
						</button>
					)}

					<button
						onClick={() => setShowAddModal(true)}
						className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
					>
						<LuPlus className="h-5 w-5" />
						<span className="font-semibold">Tambah User</span>
					</button>
				</div>

				{/* Results Info */}
				<div className="mt-4 pt-4 border-t border-gray-200">
					<p className="text-sm text-gray-600">
						Menampilkan <span className="font-semibold text-gray-900">{filteredUsers.length}</span> dari{" "}
						<span className="font-semibold text-gray-900">{users.length}</span> user
					</p>
				</div>
			</div>

			{/* Users Grid */}
			{filteredUsers.length === 0 ? (
				<div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
					<div className="flex flex-col items-center gap-4">
						<div className="h-20 w-20 bg-gray-100 rounded-2xl flex items-center justify-center">
							<LuUsers className="h-10 w-10 text-gray-400" />
						</div>
						<div>
							<p className="text-gray-700 font-semibold text-lg mb-1">
								{searchTerm || filterBidang !== "all" || filterDinas !== "all"
									? "Tidak ada user yang sesuai"
									: "Belum ada user"}
							</p>
							<p className="text-sm text-gray-500">
								{searchTerm || filterBidang !== "all" || filterDinas !== "all"
									? "Coba ubah filter atau kata kunci pencarian"
									: 'Klik tombol "Tambah User" untuk menambahkan user baru'}
							</p>
						</div>
					</div>
				</div>
			) : (
				<>
					{/* Pagination Info */}
					<div className="mb-4 flex justify-between items-center text-sm text-gray-600">
						<div>
							Menampilkan <span className="font-semibold text-indigo-600">{startIndex + 1}</span> - <span className="font-semibold text-indigo-600">{Math.min(endIndex, filteredUsers.length)}</span> dari <span className="font-semibold text-indigo-600">{filteredUsers.length}</span> user
						</div>
						<div className="text-gray-500">
							Halaman {currentPage} dari {totalPages}
						</div>
					</div>

					{/* Users Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{paginatedUsers.map((user) => (
							<UserCard
								key={user.id}
								user={user}
								canManage={canManage}
								isSuperadmin={currentUser?.role === 'superadmin'}
								visiblePasswords={visiblePasswords}
								togglePasswordVisibility={togglePasswordVisibility}
								onEditRole={handleEditRole}
								onEditBidang={handleEditBidang}
								onEditTanggalLahir={handleEditTanggalLahir}
								onEditJabatan={handleEditJabatan}
								onEditAvatar={handleEditAvatar}
								onSetDevice={handleSetDevice}
								onResetPassword={handleResetPassword}
								onDeleteUser={handleDeleteUser}
								getRoleInfo={getRoleInfo}
							/>
						))}
				</div>

				{/* Pagination Controls */}
				{totalPages > 1 && (
					<div className="mt-8 flex justify-center items-center gap-2">
						<button
							onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
							disabled={currentPage === 1}
							className={`p-3 rounded-xl transition-all ${
								currentPage === 1
									? 'bg-gray-100 text-gray-400 cursor-not-allowed'
									: 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-md hover:shadow-lg'
							}`}
							title="Halaman Sebelumnya"
						>
							<LuChevronLeft className="h-5 w-5" />
						</button>

						{/* Page Numbers */}
						<div className="flex gap-2">
							{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
								// Show first page, last page, current page, and pages around current
								const showPage =
									page === 1 ||
									page === totalPages ||
									(page >= currentPage - 1 && page <= currentPage + 1);

								// Show ellipsis
								const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
								const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

								if (!showPage && !showEllipsisBefore && !showEllipsisAfter) {
									return null;
								}

								if (showEllipsisBefore || showEllipsisAfter) {
									return (
										<span key={page} className="px-3 py-2 text-gray-400">
											...
										</span>
									);
								}

								return (
									<button
										key={page}
										onClick={() => setCurrentPage(page)}
										className={`min-w-[44px] h-[44px] rounded-xl font-medium transition-all ${
											currentPage === page
												? 'bg-indigo-600 text-white shadow-lg scale-105'
												: 'bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 shadow-md'
										}`}
									>
										{page}
									</button>
								);
							})}
						</div>

						<button
							onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
							disabled={currentPage === totalPages}
							className={`p-3 rounded-xl transition-all ${
								currentPage === totalPages
									? 'bg-gray-100 text-gray-400 cursor-not-allowed'
									: 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-md hover:shadow-lg'
							}`}
							title="Halaman Berikutnya"
						>
							<LuChevronRight className="h-5 w-5" />
						</button>
					</div>
				)}
				</>
			)}

			{/* Modals */}
			{showAddModal && (
				<AddUserModal
					isOpen={showAddModal}
					onClose={() => setShowAddModal(false)}
					onUserAdded={handleUserAdded}
				/>
			)}

			{showRoleManagement && (
				<RoleManagementModal
					isOpen={showRoleManagement}
					onClose={() => setShowRoleManagement(false)}
				/>
			)}

			{showResetModal && selectedUser && (
				<ResetPasswordModal
					isOpen={showResetModal}
					onClose={() => {
						setShowResetModal(false);
						setSelectedUser(null);
					}}
					onConfirm={handleConfirmResetPassword}
					userName={selectedUser.name}
					isLoading={isResettingPassword}
				/>
			)}

			{showRoleModal && selectedUser && (
				<EditRoleModal
					isOpen={showRoleModal}
					onClose={() => {
						setShowRoleModal(false);
						setSelectedUser(null);
					}}
					onRoleUpdated={handleRoleUpdated}
					userData={selectedUser}
				/>
			)}

			{showBidangModal && selectedUser && (
				<EditBidangModal
					isOpen={showBidangModal}
					onClose={() => {
						setShowBidangModal(false);
						setSelectedUser(null);
					}}
					onBidangUpdated={handleBidangUpdated}
					userData={selectedUser}
				/>
			)}

			{showTanggalLahirModal && selectedUser && (
				<EditTanggalLahirModal
					isOpen={showTanggalLahirModal}
					onClose={() => {
						setShowTanggalLahirModal(false);
						setSelectedUser(null);
					}}
					onUpdated={handleTanggalLahirUpdated}
					userData={selectedUser}
				/>
			)}

			{showJabatanModal && selectedUser && (
				<EditJabatanModal
					isOpen={showJabatanModal}
					onClose={() => {
						setShowJabatanModal(false);
						setSelectedUser(null);
					}}
					onUpdated={handleJabatanUpdated}
					userData={selectedUser}
				/>
			)}

			{showAvatarModal && selectedUser && (
				<EditAvatarModal
					isOpen={showAvatarModal}
					onClose={() => {
						setShowAvatarModal(false);
						setSelectedUser(null);
					}}
					onUpdated={handleAvatarUpdated}
					userData={selectedUser}
				/>
			)}

			</div>
			{/* End Main Content */}

			{/* Online Users Sidebar */}
			{canManage && (
				<div className="hidden lg:block">
					<OnlineUsersSidebar />
				</div>
			)}
			</div>
		</div>
	);
};

export default UserManagementPage;
