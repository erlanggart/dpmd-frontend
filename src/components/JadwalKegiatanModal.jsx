// src/components/JadwalKegiatanModal.jsx
import React from 'react';
import { LuX, LuCalendar, LuMapPin } from 'react-icons/lu';

const JadwalKegiatanModal = ({ 
	isOpen, 
	onClose, 
	onSubmit, 
	formData, 
	onChange, 
	bidangList,
	isEdit = false 
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
					<div className="flex justify-between items-center">
						<h2 className="text-2xl font-bold flex items-center gap-2">
							<LuCalendar className="w-6 h-6" />
							{isEdit ? 'Edit Jadwal Kegiatan' : 'Tambah Jadwal Kegiatan'}
						</h2>
						<button
							onClick={onClose}
							className="p-2 hover:bg-white/20 rounded-lg transition-all"
						>
							<LuX className="w-6 h-6" />
						</button>
					</div>
				</div>

				{/* Form */}
				<form onSubmit={onSubmit} className="p-6 space-y-4">
					{/* Judul */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Judul Kegiatan <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							name="judul"
							value={formData.judul}
							onChange={onChange}
							required
							className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							placeholder="Masukkan judul kegiatan"
						/>
					</div>

					{/* Bidang, Kategori, Prioritas */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
							Bidang Pelaksana <span className="text-red-500">*</span>
						</label>
						<select
							name="bidang_id"
							value={formData.bidang_id}
							onChange={onChange}
							required
							className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						>
							<option value="">-- Pilih Bidang yang Melaksanakan --</option>
							{bidangList.map((bidang) => (
								<option key={bidang.id} value={bidang.id}>
									{bidang.nama}
								</option>
							))}
						</select>
						<p className="mt-1 text-xs text-gray-500">Pilih bidang yang akan melaksanakan kegiatan ini</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Kategori
						</label>
						<select								name="kategori"
								value={formData.kategori}
								onChange={onChange}
								className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							>
								<option value="rapat">Rapat</option>
								<option value="pelatihan">Pelatihan</option>
								<option value="monitoring">Monitoring</option>
								<option value="kunjungan">Kunjungan</option>
								<option value="acara">Acara</option>
								<option value="lainnya">Lainnya</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Prioritas
							</label>
							<select
								name="prioritas"
								value={formData.prioritas}
								onChange={onChange}
								className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							>
								<option value="rendah">Rendah</option>
								<option value="sedang">Sedang</option>
								<option value="tinggi">Tinggi</option>
								<option value="urgent">Urgent</option>
							</select>
						</div>
					</div>

					{/* Tanggal Mulai & Selesai */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Tanggal Mulai <span className="text-red-500">*</span>
							</label>
							<input
								type="datetime-local"
								name="tanggal_mulai"
								value={formData.tanggal_mulai}
								onChange={onChange}
								required
								className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Tanggal Selesai <span className="text-red-500">*</span>
							</label>
							<input
								type="datetime-local"
								name="tanggal_selesai"
								value={formData.tanggal_selesai}
								onChange={onChange}
								required
								className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
						</div>
					</div>

					{/* Lokasi */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
							<LuMapPin className="w-4 h-4 text-red-500" />
							Tempat Kegiatan
						</label>
						<input
							type="text"
							name="lokasi"
							value={formData.lokasi}
							onChange={onChange}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							placeholder="Lokasi/tempat kegiatan"
						/>
					</div>

					{/* Asal Kegiatan */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Asal Kegiatan
						</label>
						<input
							type="text"
							name="asal_kegiatan"
							value={formData.asal_kegiatan}
							onChange={onChange}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							placeholder="Contoh: SETDA, Kementerian, DPMD"
						/>
					</div>

					{/* Actions */}
					<div className="flex gap-3 pt-4 border-t">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
						>
							Batal
						</button>
						<button
							type="submit"
							className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
						>
							{isEdit ? 'Update' : 'Simpan'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default JadwalKegiatanModal;
