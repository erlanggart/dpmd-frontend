import React, { useState, useEffect } from "react";
import { LuX, LuPenLine, LuSave, LuHash, LuBriefcase } from "react-icons/lu";
import api from "../api";
import Swal from "sweetalert2";

const STATUS_OPTIONS = [
	{ value: "PNS", label: "PNS" },
	{ value: "PPPK", label: "PPPK" },
	{ value: "PPPK_Paruh_Waktu", label: "PPPK Paruh Waktu" },
	{ value: "Honorer", label: "Honorer" },
	{ value: "THL", label: "THL" },
	{ value: "Kontrak", label: "Kontrak" },
	{ value: "Tenaga_Alih_Daya", label: "Tenaga Alih Daya" },
	{ value: "Tenaga_Keamanan", label: "Tenaga Keamanan" },
	{ value: "Tenaga_Kebersihan", label: "Tenaga Kebersihan" },
];

const EditJabatanModal = ({ isOpen, onClose, onUpdated, userData }) => {
	const [jabatan, setJabatan] = useState("");
	const [nip, setNip] = useState("");
	const [statusKepegawaian, setStatusKepegawaian] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (isOpen && userData) {
			setJabatan(userData.jabatan || "");
			setNip(userData.nip || "");
			setStatusKepegawaian(userData.status_kepegawaian || "");
		}
	}, [isOpen, userData]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		try {
			await api.put(`/users/${userData.id}`, {
				jabatan: jabatan.trim(),
				nip: nip.trim(),
				status_kepegawaian: statusKepegawaian || null,
			});

			Swal.fire({
				title: "Berhasil!",
				text: `Jabatan & NIP untuk ${userData.name} berhasil diupdate!`,
				icon: "success",
				timer: 2000,
				showConfirmButton: false,
			});

			onUpdated();
		} catch (error) {
			console.error("Error updating jabatan:", error);
			Swal.fire({
				title: "Gagal!",
				text: error.response?.data?.message || "Gagal mengupdate jabatan.",
				icon: "error",
				confirmButtonText: "OK",
			});
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
							<LuPenLine className="h-6 w-6 text-white" />
						</div>
						<div>
							<h3 className="text-xl font-bold text-gray-900">Edit Jabatan & Status</h3>
							<p className="text-sm text-gray-600">Ubah jabatan, NIP, dan status kepegawaian</p>
						</div>
					</div>
					<button
						onClick={onClose}
						disabled={loading}
						className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white/50 transition-colors disabled:opacity-50"
					>
						<LuX className="h-5 w-5 text-gray-500" />
					</button>
				</div>

				{/* Content */}
				<form onSubmit={handleSubmit} className="p-6">
					{/* User Info */}
					<div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
						<p className="text-sm text-gray-600 mb-1">Pegawai</p>
						<p className="font-bold text-gray-900 text-lg">{userData?.name}</p>
						<p className="text-sm text-gray-500">{userData?.email}</p>
					</div>

					{/* NIP */}
					<div className="mb-4">
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							<LuHash className="inline w-4 h-4 mr-1" />
							NIP
						</label>
						<input
							type="text"
							value={nip}
							onChange={(e) => setNip(e.target.value)}
							placeholder="Masukkan NIP"
							maxLength={20}
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-base"
							disabled={loading}
						/>
					</div>

					{/* Jabatan */}
					<div className="mb-4">
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							<LuPenLine className="inline w-4 h-4 mr-1" />
							Jabatan
						</label>
						<input
							type="text"
							value={jabatan}
							onChange={(e) => setJabatan(e.target.value)}
							placeholder="Masukkan jabatan"
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-base"
							disabled={loading}
						/>
					</div>

					{/* Status Kepegawaian */}
					<div className="mb-6">
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							<LuBriefcase className="inline w-4 h-4 mr-1" />
							Status Kepegawaian
						</label>
						<select
							value={statusKepegawaian}
							onChange={(e) => setStatusKepegawaian(e.target.value)}
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-base"
							disabled={loading}
						>
							<option value="">— Pilih Status —</option>
							{STATUS_OPTIONS.map((s) => (
								<option key={s.value} value={s.value}>{s.label}</option>
							))}
						</select>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={loading}
							className="flex-1 px-5 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={loading}
							className="flex-1 px-5 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/30 font-semibold flex items-center justify-center gap-2"
						>
							{loading ? (
								<>
									<div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
									Menyimpan...
								</>
							) : (
								<>
									<LuSave className="h-5 w-5" />
									Simpan
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EditJabatanModal;
