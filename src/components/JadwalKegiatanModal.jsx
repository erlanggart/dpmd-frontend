// src/components/JadwalKegiatanModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { LuX, LuCalendar, LuMapPin, LuClock, LuChevronDown, LuCheck, LuUsers, LuUser, LuPhone, LuBuilding2, LuTag, LuAlertCircle, LuStar } from 'react-icons/lu';

// ─── Multi-Select Bidang Dropdown ────────────────────────────────────────────
const BidangMultiSelect = ({ bidangList, selectedIds, onChange }) => {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	const toggle = (id) => {
		const numId = Number(id);
		if (selectedIds.includes(numId)) {
			onChange(selectedIds.filter(x => x !== numId));
		} else {
			onChange([...selectedIds, numId]);
		}
	};

	const selectedNames = bidangList
		.filter(b => selectedIds.includes(Number(b.id)))
		.map(b => b.nama);

	const BADGE_COLORS = [
		'bg-indigo-100 text-indigo-700 border-indigo-200',
		'bg-purple-100 text-purple-700 border-purple-200',
		'bg-teal-100 text-teal-700 border-teal-200',
		'bg-blue-100 text-blue-700 border-blue-200',
		'bg-violet-100 text-violet-700 border-violet-200',
	];

	return (
		<div ref={ref} className="relative">
			{/* Trigger */}
			<button
				type="button"
				onClick={() => setOpen(o => !o)}
				className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 border rounded-xl text-sm transition-all ${
					open ? 'border-indigo-400 ring-2 ring-indigo-100 bg-white' : 'border-gray-300 bg-white hover:border-indigo-300'
				}`}
			>
				<span className={selectedIds.length === 0 ? 'text-gray-400' : 'text-gray-700 font-medium'}>
					{selectedIds.length === 0
						? 'Semua Pegawai (pilih bidang...)'
						: `${selectedIds.length} bidang dipilih`}
				</span>
				<LuChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
			</button>

			{/* Selected badges */}
			{selectedNames.length > 0 && (
				<div className="flex flex-wrap gap-1.5 mt-2">
					{selectedNames.map((name, i) => (
						<span
							key={name}
							className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${BADGE_COLORS[i % BADGE_COLORS.length]}`}
						>
							{name}
							<button
								type="button"
								onClick={() => toggle(bidangList.find(b => b.nama === name)?.id)}
								className="hover:opacity-70 transition-opacity"
							>
								<LuX className="w-3 h-3" />
							</button>
						</span>
					))}
					{selectedNames.length > 1 && (
						<button
							type="button"
							onClick={() => onChange([])}
							className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
						>
							Hapus semua
						</button>
					)}
				</div>
			)}

			{/* Dropdown */}
			{open && (
				<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto">
					{/* Semua Pegawai option */}
					<button
						type="button"
						onClick={() => { onChange([]); setOpen(false); }}
						className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${selectedIds.length === 0 ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600'}`}
					>
						<div className={`w-4 h-4 rounded flex items-center justify-center border ${selectedIds.length === 0 ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
							{selectedIds.length === 0 && <LuCheck className="w-3 h-3 text-white" />}
						</div>
						<LuUsers className="w-4 h-4 text-gray-400" />
						Semua Pegawai
					</button>
					<div className="border-t border-gray-100" />
					{bidangList.map((bidang) => {
						const checked = selectedIds.includes(Number(bidang.id));
						return (
							<button
								key={bidang.id}
								type="button"
								onClick={() => toggle(bidang.id)}
								className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors ${checked ? 'bg-indigo-50/60 text-indigo-700 font-medium' : 'text-gray-700'}`}
							>
								<div className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${checked ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
									{checked && <LuCheck className="w-3 h-3 text-white" />}
								</div>
								<LuBuilding2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
								{bidang.nama}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, color = 'indigo' }) => {
	const colors = {
		indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
		teal: 'text-teal-600 bg-teal-50 border-teal-200',
		purple: 'text-purple-600 bg-purple-50 border-purple-200',
	};
	return (
		<div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider mb-3 w-fit ${colors[color]}`}>
			<Icon className="w-3.5 h-3.5" />
			{title}
		</div>
	);
};

// ─── Input Field ─────────────────────────────────────────────────────────────
const Field = ({ label, required, icon: Icon, children }) => (
	<div>
		<label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
			{Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
			{label}
			{required && <span className="text-red-500">*</span>}
		</label>
		{children}
	</div>
);

const inputCls = 'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition-all placeholder:text-gray-400';
const selectCls = 'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition-all cursor-pointer';

// ─── Main Modal ───────────────────────────────────────────────────────────────
const JadwalKegiatanModal = ({ 
	isOpen, 
	onClose, 
	onSubmit, 
	formData, 
	onChange, 
	onBidangChange,
	bidangList,
	isEdit = false 
}) => {
	if (!isOpen) return null;

	const KATEGORI_ICONS = {
		rapat: '🤝', pelatihan: '📚', monitoring: '🔍',
		kunjungan: '🚗', acara: '🎯', lainnya: '📋'
	};

	const PRIORITAS_CONFIG = {
		rendah: { label: 'Rendah', cls: 'border-green-200 text-green-700 bg-green-50' },
		sedang: { label: 'Sedang', cls: 'border-yellow-200 text-yellow-700 bg-yellow-50' },
		tinggi: { label: 'Tinggi', cls: 'border-orange-200 text-orange-700 bg-orange-50' },
		urgent: { label: 'Urgent', cls: 'border-red-200 text-red-700 bg-red-50' },
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

			{/* Modal */}
			<div className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] sm:max-h-[92vh] overflow-hidden">

				{/* ── Drag handle (mobile) */}
				<div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
					<div className="w-10 h-1 bg-gray-200 rounded-full" />
				</div>

				{/* ── Header */}
				<div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-6 py-5 flex-shrink-0">
					<div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)'}} />
					<div className="relative flex items-start justify-between gap-3">
						<div>
							<div className="flex items-center gap-2.5 mb-1">
								<div className="p-1.5 bg-white/20 rounded-lg">
									<LuCalendar className="w-5 h-5 text-white" />
								</div>
								<h2 className="text-lg font-bold text-white leading-tight">
									{isEdit ? 'Edit Jadwal Kegiatan' : 'Tambah Jadwal Kegiatan'}
								</h2>
							</div>
							<p className="text-white/60 text-xs ml-10">
								{isEdit ? 'Perbarui detail jadwal kegiatan' : 'Isi detail jadwal kegiatan baru'}
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="p-2 hover:bg-white/20 rounded-xl transition-all text-white flex-shrink-0"
						>
							<LuX className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* ── Scrollable body */}
				<div className="flex-1 overflow-y-auto">
					<form id="jadwal-form" onSubmit={onSubmit}>
						<div className="p-5 space-y-5">

							{/* ─ Section: Informasi Kegiatan ─ */}
							<div className="bg-gray-50/80 rounded-2xl p-4 space-y-4 border border-gray-100">
								<SectionHeader icon={LuCalendar} title="Informasi Kegiatan" color="indigo" />

								{/* Judul */}
								<Field label="Judul Kegiatan" required>
									<input
										type="text"
										name="judul"
										value={formData.judul}
										onChange={onChange}
										required
										className={inputCls}
										placeholder="Masukkan judul kegiatan"
									/>
								</Field>

								{/* Bidang Pelaksana */}
								<Field label="Bidang Pelaksana" icon={LuBuilding2}>
									<BidangMultiSelect
										bidangList={bidangList}
										selectedIds={formData.bidang_ids || []}
										onChange={onBidangChange}
									/>
									<p className="mt-1.5 text-xs text-gray-400">Pilih satu atau lebih bidang, atau kosongkan untuk semua pegawai</p>
								</Field>
							</div>

							{/* ─ Section: Waktu & Tempat ─ */}
							<div className="bg-gray-50/80 rounded-2xl p-4 space-y-4 border border-gray-100">
								<SectionHeader icon={LuClock} title="Waktu & Tempat" color="teal" />

								{/* Tanggal & Jam */}
								<div className="grid grid-cols-3 gap-3">
									<Field label="Tanggal Mulai" required>
										<input
											type="date"
											name="tanggal_mulai"
											value={formData.tanggal_mulai}
											onChange={onChange}
											required
											className={inputCls}
										/>
									</Field>
									<Field label="Jam" required icon={LuClock}>
										<input
											type="time"
											name="jam"
											value={formData.jam || '08:00'}
											onChange={onChange}
											required
											className={inputCls}
										/>
									</Field>
									<Field label="Tanggal Selesai" required>
										<input
											type="date"
											name="tanggal_selesai"
											value={formData.tanggal_selesai}
											onChange={onChange}
											required
											className={inputCls}
										/>
									</Field>
								</div>

								{/* Lokasi */}
								<Field label="Tempat Kegiatan" icon={LuMapPin}>
									<input
										type="text"
										name="lokasi"
										value={formData.lokasi}
										onChange={onChange}
										className={inputCls}
										placeholder="Lokasi / tempat kegiatan"
									/>
								</Field>
							</div>

							{/* ─ Section: Detail Kegiatan ─ */}
							<div className="bg-gray-50/80 rounded-2xl p-4 space-y-4 border border-gray-100">
								<SectionHeader icon={LuTag} title="Detail Kegiatan" color="purple" />

								{/* Kategori & Prioritas */}
								<div className="grid grid-cols-2 gap-3">
									<Field label="Kategori" icon={LuTag}>
										<div className="relative">
											<select
												name="kategori"
												value={formData.kategori}
												onChange={onChange}
												className={selectCls}
											>
												{Object.entries(KATEGORI_ICONS).map(([val, icon]) => (
													<option key={val} value={val}>{icon} {val.charAt(0).toUpperCase() + val.slice(1)}</option>
												))}
											</select>
										</div>
									</Field>
									<Field label="Prioritas" icon={LuStar}>
										<select
											name="prioritas"
											value={formData.prioritas}
											onChange={onChange}
											className={`${selectCls} ${PRIORITAS_CONFIG[formData.prioritas]?.cls || ''} font-semibold`}
										>
											{Object.entries(PRIORITAS_CONFIG).map(([val, cfg]) => (
												<option key={val} value={val}>{cfg.label}</option>
											))}
										</select>
									</Field>
								</div>

								{/* Asal Kegiatan */}
								<Field label="Asal Kegiatan" icon={LuAlertCircle}>
									<input
										type="text"
										name="asal_kegiatan"
										value={formData.asal_kegiatan}
										onChange={onChange}
										className={inputCls}
										placeholder="Contoh: SETDA, Kementerian DPMD"
									/>
								</Field>

								{/* PIC */}
								<div className="grid grid-cols-2 gap-3">
									<Field label="Nama PIC" icon={LuUser}>
										<input
											type="text"
											name="pic_name"
											value={formData.pic_name}
											onChange={onChange}
											className={inputCls}
											placeholder="Nama penanggung jawab"
										/>
									</Field>
									<Field label="Kontak PIC" icon={LuPhone}>
										<input
											type="text"
											name="pic_contact"
											value={formData.pic_contact}
											onChange={onChange}
											className={inputCls}
											placeholder="No. HP / Email"
										/>
									</Field>
								</div>
							</div>

						</div>
					</form>
				</div>

				{/* ── Footer */}
				<div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white flex gap-3">
					<button
						type="button"
						onClick={onClose}
						className="flex-1 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-all"
					>
						Batal
					</button>
					<button
						type="submit"
						form="jadwal-form"
						className="flex-2 px-7 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center gap-2"
					>
						<LuCalendar className="w-4 h-4" />
						{isEdit ? 'Simpan Perubahan' : 'Buat Jadwal'}
					</button>
				</div>

			</div>
		</div>
	);
};

export default JadwalKegiatanModal;
