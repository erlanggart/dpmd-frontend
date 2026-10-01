import React, { useEffect, useMemo, useState } from "react";
import { FaExchangeAlt, FaTimes, FaSpinner, FaInfoCircle } from "react-icons/fa";
import Swal from "sweetalert2";
import { getKecamatans, getDesasByKecamatan } from "../../../services/api";
import { getPengurusTransferTargets, transferPengurus } from "../../../services/pengurus";
import { getJabatanOptions } from "../../../constants/jabatanMapping";

// pengurusable_type (nama tabel) → kunci JABATAN_MAPPING
const JABATAN_KEY = {
	rws: "rw",
	rts: "rt",
	posyandus: "posyandu",
	karang_tarunas: "karang-taruna",
	lpms: "lpm",
	pkks: "pkk",
	satlinmas: "satlinmas",
	"lembaga-lainnya": "lembaga-lainnya",
};

const inputClass =
	"w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white disabled:bg-gray-100";

/**
 * Modal pindah pengurus ke lembaga lain.
 * - Akun desa / staf DPMD: pilihan lembaga hanya di desa pengurus itu.
 * - Superadmin: boleh memilih kecamatan & desa lain.
 */
export default function TransferPengurusModal({ isOpen, onClose, pengurus, desaInfo, canCrossDesa, onTransferred }) {
	const [kecamatanList, setKecamatanList] = useState([]);
	const [desaList, setDesaList] = useState([]);
	const [kecamatanId, setKecamatanId] = useState("");
	const [targetDesaId, setTargetDesaId] = useState("");
	const [targets, setTargets] = useState([]);
	const [loadingTargets, setLoadingTargets] = useState(false);
	const [search, setSearch] = useState("");
	const [targetKey, setTargetKey] = useState("");
	const [jabatan, setJabatan] = useState("");
	const [saving, setSaving] = useState(false);

	// Reset setiap kali modal dibuka
	useEffect(() => {
		if (!isOpen || !pengurus) return;
		setTargetDesaId(String(pengurus.desa_id));
		setKecamatanId(desaInfo?.kecamatan_id ? String(desaInfo.kecamatan_id) : "");
		setTargetKey("");
		setSearch("");
		setJabatan(pengurus.jabatan || "");
	}, [isOpen, pengurus, desaInfo]);

	useEffect(() => {
		if (!isOpen || !canCrossDesa) return;
		getKecamatans()
			.then((res) => setKecamatanList(res?.data?.data || []))
			.catch(() => setKecamatanList([]));
	}, [isOpen, canCrossDesa]);

	useEffect(() => {
		if (!isOpen || !canCrossDesa || !kecamatanId) {
			setDesaList([]);
			return;
		}
		getDesasByKecamatan(kecamatanId)
			.then((res) => setDesaList(res?.data?.data || []))
			.catch(() => setDesaList([]));
	}, [isOpen, canCrossDesa, kecamatanId]);

	useEffect(() => {
		if (!isOpen || !targetDesaId) {
			setTargets([]);
			return;
		}
		let active = true;
		setLoadingTargets(true);
		setTargetKey("");
		getPengurusTransferTargets(targetDesaId)
			.then((res) => active && setTargets(res?.data?.data || []))
			.catch(() => active && setTargets([]))
			.finally(() => active && setLoadingTargets(false));
		return () => {
			active = false;
		};
	}, [isOpen, targetDesaId]);

	const availableTargets = useMemo(() => {
		const keyword = search.trim().toLowerCase();
		return targets.filter(
			(t) =>
				!(t.type === pengurus?.pengurusable_type && t.id === pengurus?.pengurusable_id) &&
				(!keyword || `${t.jenis} ${t.label}`.toLowerCase().includes(keyword))
		);
	}, [targets, search, pengurus]);

	const groupedTargets = useMemo(() => {
		const groups = {};
		availableTargets.forEach((t) => {
			(groups[t.jenis] = groups[t.jenis] || []).push(t);
		});
		return groups;
	}, [availableTargets]);

	const selectedTarget = targets.find((t) => `${t.type}|${t.id}` === targetKey) || null;

	const jabatanOptions = useMemo(() => {
		if (!selectedTarget) return [];
		const opts = getJabatanOptions(JABATAN_KEY[selectedTarget.type]).map((o) => o.value);
		return opts;
	}, [selectedTarget]);

	// Samakan jabatan saat lembaga tujuan berganti: pertahankan bila masih
	// berlaku di jenis lembaga tujuan, kosongkan bila tidak (mis. KETUA RT → RW).
	useEffect(() => {
		if (!selectedTarget || !pengurus) return;
		const current = (pengurus.jabatan || "").toUpperCase();
		setJabatan(jabatanOptions.includes(current) ? current : "");
	}, [selectedTarget, jabatanOptions, pengurus]);

	const isCrossDesa = targetDesaId && pengurus && String(targetDesaId) !== String(pengurus.desa_id);

	const submit = async (force = false) => {
		if (!selectedTarget) {
			Swal.fire({ icon: "warning", title: "Pilih lembaga tujuan" });
			return;
		}
		if (!jabatan) {
			Swal.fire({ icon: "warning", title: "Pilih jabatan di lembaga tujuan" });
			return;
		}

		if (!force) {
			const confirm = await Swal.fire({
				title: "Pindahkan Pengurus?",
				html: `<p class="text-sm"><b>${pengurus.nama_lengkap}</b> akan dipindahkan ke <b>${selectedTarget.jenis} ${selectedTarget.label}</b> sebagai <b>${jabatan}</b>.</p>`,
				icon: "question",
				showCancelButton: true,
				confirmButtonText: "Ya, pindahkan",
				cancelButtonText: "Batal",
				confirmButtonColor: "#4f46e5",
			});
			if (!confirm.isConfirmed) return;
		}

		setSaving(true);
		try {
			const res = await transferPengurus(pengurus.id, {
				target_type: selectedTarget.type,
				target_id: selectedTarget.id,
				jabatan,
				force,
			});
			await Swal.fire({
				icon: "success",
				title: "Berhasil",
				text: res?.data?.message || "Pengurus berhasil dipindahkan",
				timer: 2000,
				showConfirmButton: false,
			});
			onTransferred?.(res?.data?.data);
		} catch (error) {
			const data = error?.response?.data;
			if (error?.response?.status === 409 && data?.code === "JABATAN_TERISI") {
				setSaving(false);
				const again = await Swal.fire({
					icon: "warning",
					title: "Jabatan Sudah Terisi",
					html: `<p class="text-sm">${data.message}</p><p class="text-sm mt-2">Tetap pindahkan? Nonaktifkan salah satu pengurus setelahnya bila perlu.</p>`,
					showCancelButton: true,
					confirmButtonText: "Tetap pindahkan",
					cancelButtonText: "Batal",
					confirmButtonColor: "#d97706",
				});
				if (again.isConfirmed) await submit(true);
				return;
			}
			Swal.fire({ icon: "error", title: "Gagal", text: data?.message || "Gagal memindahkan pengurus" });
		} finally {
			setSaving(false);
		}
	};

	if (!isOpen || !pengurus) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
			<div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
				<div className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
					<div className="flex items-center gap-3">
						<FaExchangeAlt className="w-5 h-5" />
						<div>
							<h2 className="text-lg font-bold">Pindahkan Pengurus</h2>
							<p className="text-xs text-indigo-100">{pengurus.nama_lengkap} — {pengurus.jabatan}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={saving}
						className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50"
					>
						<FaTimes />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-5 space-y-4">
					{canCrossDesa ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1">Kecamatan Tujuan</label>
								<select
									className={inputClass}
									value={kecamatanId}
									onChange={(e) => {
										setKecamatanId(e.target.value);
										setTargetDesaId("");
									}}
								>
									<option value="">Pilih kecamatan</option>
									{kecamatanList.map((k) => (
										<option key={k.id} value={String(k.id)}>{k.nama}</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm font-semibold text-gray-800 mb-1">Desa Tujuan</label>
								<select
									className={inputClass}
									value={targetDesaId}
									onChange={(e) => setTargetDesaId(e.target.value)}
									disabled={!kecamatanId}
								>
									<option value="">Pilih desa</option>
									{desaList.map((d) => (
										<option key={d.id} value={String(d.id)}>{d.nama}</option>
									))}
								</select>
							</div>
						</div>
					) : (
						<div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
							<FaInfoCircle className="mt-0.5 flex-shrink-0" />
							<span>
								Pengurus hanya dapat dipindahkan ke lembaga di desa yang sama
								{desaInfo?.nama ? ` (${desaInfo.nama})` : ""}.
							</span>
						</div>
					)}

					<div>
						<label className="block text-sm font-semibold text-gray-800 mb-1">Lembaga Tujuan</label>
						<input
							type="search"
							className={`${inputClass} mb-2`}
							placeholder="Cari RT, RW, Posyandu..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							disabled={!targetDesaId}
						/>
						<select
							className={inputClass}
							value={targetKey}
							onChange={(e) => setTargetKey(e.target.value)}
							disabled={!targetDesaId || loadingTargets}
							size={8}
						>
							{loadingTargets && <option disabled>Memuat...</option>}
							{!loadingTargets && availableTargets.length === 0 && (
								<option disabled>{targetDesaId ? "Tidak ada lembaga tujuan" : "Pilih desa terlebih dahulu"}</option>
							)}
							{!loadingTargets &&
								Object.entries(groupedTargets).map(([jenis, items]) => (
									<optgroup key={jenis} label={jenis}>
										{items.map((t) => (
											<option key={`${t.type}|${t.id}`} value={`${t.type}|${t.id}`}>
												{t.label}
												{t.status_kelembagaan !== "aktif" ? " (nonaktif)" : ""}
											</option>
										))}
									</optgroup>
								))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-semibold text-gray-800 mb-1">Jabatan di Lembaga Tujuan</label>
						<select
							className={inputClass}
							value={jabatan}
							onChange={(e) => setJabatan(e.target.value)}
							disabled={!selectedTarget}
						>
							<option value="">Pilih jabatan</option>
							{jabatanOptions.map((j) => (
								<option key={j} value={j}>{j}</option>
							))}
						</select>
					</div>

					<ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
						{!canCrossDesa && <li>Status verifikasi akan kembali menjadi <b>Belum Verifikasi</b>.</li>}
						{isCrossDesa && <li>SK Pengangkatan dari desa asal akan dilepas karena tidak berlaku di desa tujuan.</li>}
					</ul>
				</div>

				<div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
					<button
						type="button"
						onClick={onClose}
						disabled={saving}
						className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
					>
						Batal
					</button>
					<button
						type="button"
						onClick={() => submit(false)}
						disabled={saving || !selectedTarget || !jabatan}
						className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{saving ? <FaSpinner className="animate-spin" /> : <FaExchangeAlt />}
						Pindahkan
					</button>
				</div>
			</div>
		</div>
	);
}
