// src/components/AddUserModal.jsx
import React, { useState, useEffect } from "react";
import {
	LuX,
	LuUser,
	LuMail,
	LuLock,
	LuUserPlus,
	LuBuilding,
	LuMapPin,
	LuEye,
	LuEyeOff,
} from "react-icons/lu";
import api from "../api";

const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
		role: "",
		entity_id: "",
	});
	const [entities, setEntities] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState({});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	// Reset form when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setFormData({
				name: "",
				email: "",
				password: "",
				confirmPassword: "",
				role: "",
				entity_id: "",
			});
			setErrors({});
			setEntities([]);
			setShowPassword(false);
			setShowConfirmPassword(false);
		}
	}, [isOpen]);

	// Fetch entities when role changes
	useEffect(() => {
		if (formData.role && needsEntity(formData.role)) {
			fetchEntities(formData.role);
		} else {
			setEntities([]);
			setFormData((prev) => ({ ...prev, entity_id: "" }));
		}
	}, [formData.role]);

	// Determine if role needs entity selection
	const needsEntity = (role) => {
		const entityRoles = ["kecamatan", "desa"];
		return entityRoles.includes(role);
	};

	// Get role groups for dropdown
	const getRoleGroups = () => {
		return [
			{
				label: "Super Administrator",
				roles: [{ value: "superadmin", label: "Super Administrator" }],
			},
			{
				label: "Pimpinan Dinas",
				roles: [
					{ value: "kepala_dinas", label: "Kepala Dinas" },
					{ value: "sekretaris_dinas", label: "Sekretaris Dinas" },
				],
			},
			{
				label: "Struktural",
				roles: [
					{ value: "kepala_bidang", label: "Kepala Bidang" },
					{ value: "ketua_tim", label: "Ketua Tim" },
				],
			},
			{
				label: "Bidang-Bidang DPMD",
				roles: [
					{ value: "sekretariat", label: "Sekretariat" },
					{ value: "pemerintahan_desa", label: "Pemerintahan Desa" },
					{ value: "sarana_prasarana", label: "Sarana Prasarana" },
					{ value: "kekayaan_keuangan", label: "Kekayaan Keuangan" },
					{
						value: "pemberdayaan_masyarakat",
						label: "Pemberdayaan Masyarakat",
					},
				],
			},
			{
				label: "Pegawai",
				roles: [
					{ value: "pegawai", label: "Pegawai/Staff" },
				],
			},
			{
				label: "Wilayah",
				roles: [
					{ value: "kecamatan", label: "Admin Kecamatan" },
					{ value: "desa", label: "Admin Desa" },
				],
			},
		];
	};

	// Fetch entities based on role
	const fetchEntities = async (role) => {
		try {
			const token = localStorage.getItem("authToken");
			let endpoint = "";

			if (role === "kecamatan") {
				endpoint = "/kecamatans";
			} else if (role === "desa") {
				endpoint = "/desas";
			}

			if (endpoint) {
				const response = await api.get(endpoint, {
					headers: { Authorization: `Bearer ${token}` },
				});
				setEntities(response.data.data || []);
			}
		} catch (error) {
			console.error("Error fetching entities:", error);
			setEntities([]);
		}
	};

	// Handle form input changes
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));

		// Clear error when user starts typing
		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: "" }));
		}
	};

	// Form validation
	const validateForm = () => {
		const newErrors = {};

		if (!formData.name.trim()) {
			newErrors.name = "Nama harus diisi";
		}

		if (!formData.email.trim()) {
			newErrors.email = "Email harus diisi";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = "Format email tidak valid";
		}

		if (!formData.password) {
			newErrors.password = "Password harus diisi";
		} else if (formData.password.length < 8) {
			newErrors.password = "Password minimal 8 karakter";
		}

		if (!formData.confirmPassword) {
			newErrors.confirmPassword = "Konfirmasi password harus diisi";
		} else if (formData.password !== formData.confirmPassword) {
			newErrors.confirmPassword = "Password tidak sama";
		}

		if (!formData.role) {
			newErrors.role = "Role harus dipilih";
		}

		if (needsEntity(formData.role) && !formData.entity_id) {
			newErrors.entity_id = "Entitas harus dipilih";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsLoading(true);

		try {
			const token = localStorage.getItem("authToken");
			const submitData = {
				name: formData.name,
				email: formData.email,
				password: formData.password,
				role: formData.role,
			};

			// Add entity_id only if needed
			if (needsEntity(formData.role) && formData.entity_id) {
				submitData.entity_id = formData.entity_id;
			}

			const response = await api.post("/users", submitData, {
				headers: { Authorization: `Bearer ${token}` },
			});

			// Call callback function
			onUserAdded(response.data.data);

			// Reset form
			setFormData({
				name: "",
				email: "",
				password: "",
				confirmPassword: "",
				role: "",
				entity_id: "",
			});

			// Close modal
			onClose();
		} catch (error) {
			console.error("Error creating user:", error);
			if (error.response?.data?.errors) {
				setErrors(error.response.data.errors);
			} else {
				setErrors({
					submit: error.response?.data?.message || "Gagal menambahkan user",
				});
			}
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	const roleGroups = getRoleGroups();

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
							<LuUserPlus className="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-900">
								Tambah User Baru
							</h3>
							<p className="text-sm text-gray-500">
								Isi form untuk menambahkan user
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
					>
						<LuX className="h-5 w-5 text-gray-500" />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					{/* Name Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							<LuUser className="inline h-4 w-4 mr-1" />
							Nama Lengkap
						</label>
						<input
							type="text"
							name="name"
							value={formData.name}
							onChange={handleInputChange}
							className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
								errors.name ? "border-red-500" : "border-gray-300"
							}`}
							placeholder="Masukkan nama lengkap"
						/>
						{errors.name && (
							<p className="text-red-500 text-sm mt-1">{errors.name}</p>
						)}
					</div>

					{/* Email Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							<LuMail className="inline h-4 w-4 mr-1" />
							Email
						</label>
						<input
							type="email"
							name="email"
							value={formData.email}
							onChange={handleInputChange}
							className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
								errors.email ? "border-red-500" : "border-gray-300"
							}`}
							placeholder="Masukkan alamat email"
						/>
						{errors.email && (
							<p className="text-red-500 text-sm mt-1">{errors.email}</p>
						)}
					</div>

					{/* Role Selection */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							<LuBuilding className="inline h-4 w-4 mr-1" />
							Role/Jabatan
						</label>
						<select
							name="role"
							value={formData.role}
							onChange={handleInputChange}
							className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
								errors.role ? "border-red-500" : "border-gray-300"
							}`}
						>
							<option value="">-- Pilih Role --</option>
							{roleGroups.map((group) => (
								<optgroup key={group.label} label={group.label}>
									{group.roles.map((role) => (
										<option key={role.value} value={role.value}>
											{role.label}
										</option>
									))}
								</optgroup>
							))}
						</select>
						{errors.role && (
							<p className="text-red-500 text-sm mt-1">{errors.role}</p>
						)}
					</div>

					{/* Entity Selection (for kecamatan/desa) */}
					{needsEntity(formData.role) && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{formData.role === "kecamatan"
									? "Pilih Kecamatan"
									: "Pilih Desa"}
							</label>
							<select
								name="entity_id"
								value={formData.entity_id}
								onChange={handleInputChange}
								className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
									errors.entity_id ? "border-red-500" : "border-gray-300"
								}`}
							>
								<option value="">
									-- Pilih{" "}
									{formData.role === "kecamatan" ? "Kecamatan" : "Desa"} --
								</option>
								{entities.map((entity) => (
									<option key={entity.id} value={entity.id}>
										{entity.nama}
									</option>
								))}
							</select>
							{errors.entity_id && (
								<p className="text-red-500 text-sm mt-1">{errors.entity_id}</p>
							)}
						</div>
					)}

					{/* Password Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							<LuLock className="inline h-4 w-4 mr-1" />
							Password
						</label>
						<div className="relative">
							<input
								type={showPassword ? "text" : "password"}
								name="password"
								value={formData.password}
								onChange={handleInputChange}
								className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
									errors.password ? "border-red-500" : "border-gray-300"
								}`}
								placeholder="Masukkan password (min. 8 karakter)"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
							>
								{showPassword ? (
									<LuEyeOff className="h-4 w-4" />
								) : (
									<LuEye className="h-4 w-4" />
								)}
							</button>
						</div>
						{errors.password && (
							<p className="text-red-500 text-sm mt-1">{errors.password}</p>
						)}
					</div>

					{/* Confirm Password Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							<LuLock className="inline h-4 w-4 mr-1" />
							Konfirmasi Password
						</label>
						<div className="relative">
							<input
								type={showConfirmPassword ? "text" : "password"}
								name="confirmPassword"
								value={formData.confirmPassword}
								onChange={handleInputChange}
								className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
									errors.confirmPassword ? "border-red-500" : "border-gray-300"
								}`}
								placeholder="Ulangi password"
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
							>
								{showConfirmPassword ? (
									<LuEyeOff className="h-4 w-4" />
								) : (
									<LuEye className="h-4 w-4" />
								)}
							</button>
						</div>
						{errors.confirmPassword && (
							<p className="text-red-500 text-sm mt-1">
								{errors.confirmPassword}
							</p>
						)}
					</div>

					{/* Submit Error */}
					{errors.submit && (
						<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
							<p className="text-red-600 text-sm">{errors.submit}</p>
						</div>
					)}

					{/* Form Actions */}
					<div className="flex gap-3 pt-4">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
						>
							{isLoading ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									Menyimpan...
								</>
							) : (
								<>
									<LuUserPlus className="h-4 w-4" />
									Tambah User
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default AddUserModal;
