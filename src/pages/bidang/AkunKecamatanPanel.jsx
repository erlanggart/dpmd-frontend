// src/pages/bidang/AkunKecamatanPanel.jsx
//
// Akun kecamatan, dilihat dari halaman Akun Operator bidang.
//
// Satu kecamatan = satu akun, dipakai bersama seluruh bidang. Karena itu panel
// ini sengaja tidak punya tombol tambah, ubah, atau nonaktifkan: yang boleh
// dilakukan staf bidang hanya melihat sandi yang berlaku dan menyetel ulang
// sandinya ke sandi default. Akun baru tetap dibuat superadmin, supaya satu
// kecamatan tidak berakhir dengan beberapa akun dari bidang yang berbeda.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import api from "../../api";
import escapeHtml from "../../utils/escapeHtml";
import {
	FiAlertCircle,
	FiCheck,
	FiClock,
	FiCopy,
	FiEye,
	FiEyeOff,
	FiInfo,
	FiKey,
	FiMapPin,
	FiRefreshCw,
	FiSearch,
	FiX,
} from "react-icons/fi";

const PEGAS = { type: "spring", stiffness: 420, damping: 32, mass: 0.8 };

// Sandi yang sedang diperlihatkan disembunyikan lagi sendiri: layar staf
// sering terlihat orang lain, dan sandi tidak perlu terpampang lebih lama dari
// waktu untuk membacakan atau menyalinnya.
const LAMA_TAMPIL_SANDI = 30000;

const KELAS_INPUT =
	"w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 transition-shadow placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5";

const pesanError = (error, cadangan) =>
	error?.response?.data?.message || error?.message || cadangan;

const waktuRelatif = (iso) => {
	if (!iso) return null;
	const selisih = Date.now() - new Date(iso).getTime();
	if (Number.isNaN(selisih)) return null;
	const menit = Math.floor(selisih / 60000);
	if (menit < 2) return "baru saja";
	if (menit < 60) return `${menit} menit lalu`;
	const jam = Math.floor(menit / 60);
	if (jam < 24) return `${jam} jam lalu`;
	const hari = Math.floor(jam / 24);
	if (hari === 1) return "kemarin";
	if (hari < 30) return `${hari} hari lalu`;
	return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const salin = async (teks, label) => {
	try {
		await navigator.clipboard.writeText(teks);
		toast.success(`${label} disalin`);
	} catch {
		toast.error(`Gagal menyalin ${label.toLowerCase()}`);
	}
};

const SARINGAN = [
	{ id: "semua", label: "Semua", cocok: () => true },
	{ id: "default", label: "Sandi default", cocok: (r) => r.akun?.sandi_default },
	{ id: "belum-login", label: "Belum pernah login", cocok: (r) => r.akun && !r.akun.last_active_at },
	{ id: "tanpa-akun", label: "Belum ada akun", cocok: (r) => !r.akun },
];

const KartuKecamatan = ({ baris, urutan, params, onBerubah }) => {
	const { kecamatan, akun, akun_lain: akunLain } = baris;
	const [sandi, setSandi] = useState(null); // { nilai, default } | { nilai: null }
	const [memuat, setMemuat] = useState(false);
	const [mereset, setMereset] = useState(false);

	useEffect(() => {
		if (!sandi) return undefined;
		const t = setTimeout(() => setSandi(null), LAMA_TAMPIL_SANDI);
		return () => clearTimeout(t);
	}, [sandi]);

	const lihatSandi = async () => {
		if (sandi) {
			setSandi(null);
			return;
		}
		setMemuat(true);
		try {
			const res = await api.get(`/bidang/akun-desa/kecamatan/${akun.id}/sandi`, { params });
			const d = res.data?.data || {};
			setSandi({ nilai: d.sandi || null, default: Boolean(d.sandi_default) });
		} catch (error) {
			toast.error(pesanError(error, "Gagal memuat sandi"));
		} finally {
			setMemuat(false);
		}
	};

	const resetSandi = async () => {
		const ok = await Swal.fire({
			icon: "warning",
			title: "Setel ulang sandi?",
			html:
				`<div style="text-align:left;font-size:14px">` +
				`<p style="margin:0 0 8px">Sandi akun <b>Kec. ${escapeHtml(kecamatan.nama)}</b> (${escapeHtml(akun.email)}) akan dikembalikan ke <b>sandi default</b>.</p>` +
				`<p style="margin:0 0 6px">Kecamatan wajib mengganti sandi saat login berikutnya.</p>` +
				`<p style="margin:0;color:#b45309;font-size:12.5px">Akun ini dipakai bersama seluruh bidang — kabari kecamatan setelah sandinya disetel ulang.</p>` +
				`</div>`,
			showCancelButton: true,
			confirmButtonText: "Setel ulang",
			cancelButtonText: "Batal",
			confirmButtonColor: "#b91c1c",
		});
		if (!ok.isConfirmed) return;

		setMereset(true);
		try {
			const res = await api.post(`/bidang/akun-desa/kecamatan/${akun.id}/reset-sandi`, {}, { params });
			setSandi({ nilai: res.data?.data?.sandi || null, default: true });
			toast.success("Sandi dikembalikan ke sandi default");
			onBerubah?.();
		} catch (error) {
			Swal.fire({ icon: "error", title: "Gagal menyetel ulang", text: pesanError(error, "Terjadi kesalahan.") });
		} finally {
			setMereset(false);
		}
	};

	const terakhirAktif = akun ? waktuRelatif(akun.last_active_at) : null;

	return (
		<motion.article
			layout="position"
			initial={{ opacity: 0, y: 16, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1, transition: { ...PEGAS, delay: Math.min(urutan, 12) * 0.035 } }}
			exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
			className={`flex flex-col rounded-2xl border p-4 ${
				!akun
					? "border-dashed border-slate-300 bg-slate-50/70"
					: akun.is_active
						? "border-slate-200/90 bg-white"
						: "border-dashed border-slate-300 bg-slate-50/70"
			}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2.5">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
						<FiMapPin className="h-[18px] w-[18px]" />
					</span>
					<div className="min-w-0">
						<h3 className="truncate text-[15px] font-semibold leading-tight text-slate-900">
							Kec. {kecamatan.nama}
						</h3>
						{akun ? (
							<span className="text-[12px] text-slate-500">{akun.name}</span>
						) : (
							<span className="text-[12px] text-slate-400">Belum ada akun</span>
						)}
					</div>
				</div>
				{akun && !akun.is_active && (
					<span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
						Nonaktif
					</span>
				)}
			</div>

			{akun ? (
				<>
					<div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
						<span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-600" title={akun.email}>
							{akun.email}
						</span>
						<button
							type="button"
							onClick={() => salin(akun.email, "Email")}
							title="Salin email"
							className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
						>
							<FiCopy className="h-3.5 w-3.5" />
						</button>
					</div>

					<AnimatePresence initial={false}>
						{sandi && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								transition={PEGAS}
								className="overflow-hidden"
							>
								{sandi.nilai ? (
									<div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
										<FiKey className="h-3.5 w-3.5 shrink-0 text-amber-600" />
										<code className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold text-amber-900">
											{sandi.nilai}
										</code>
										{sandi.default && (
											<span className="shrink-0 text-[10.5px] font-semibold text-amber-700">default</span>
										)}
										<button
											type="button"
											onClick={() => salin(sandi.nilai, "Sandi")}
											title="Salin sandi"
											className="shrink-0 rounded-md p-1 text-amber-600 hover:bg-amber-100 hover:text-amber-800"
										>
											<FiCopy className="h-3.5 w-3.5" />
										</button>
									</div>
								) : (
									<p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
										Sandi yang berlaku tidak tersimpan. Setel ulang bila kecamatan lupa sandinya.
									</p>
								)}
							</motion.div>
						)}
					</AnimatePresence>

					<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
						{akun.sandi_default ? (
							<span className="inline-flex items-center gap-1 font-semibold text-amber-700">
								<FiAlertCircle className="h-3 w-3" />
								Masih sandi default
							</span>
						) : (
							<span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
								<FiCheck className="h-3 w-3" />
								Sandi sudah diganti
							</span>
						)}
						<span
							className="inline-flex items-center gap-1 text-slate-500"
							title={akun.last_active_at ? new Date(akun.last_active_at).toLocaleString("id-ID") : undefined}
						>
							<FiClock className="h-3 w-3" />
							{terakhirAktif ? `Aktif ${terakhirAktif}` : "Belum pernah login"}
						</span>
					</div>

					{akunLain > 0 && (
						<p className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11.5px] text-rose-700">
							<FiAlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
							Ada {akunLain} akun kecamatan lain untuk wilayah ini. Seharusnya cukup satu — minta superadmin merapikannya.
						</p>
					)}

					<div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
						<button
							type="button"
							onClick={lihatSandi}
							disabled={memuat}
							className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
						>
							{sandi ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
							{memuat ? "Memuat…" : sandi ? "Sembunyikan" : "Lihat sandi"}
						</button>
						<button
							type="button"
							onClick={resetSandi}
							disabled={mereset}
							className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
						>
							<FiRefreshCw className={`h-3.5 w-3.5 ${mereset ? "animate-spin" : ""}`} />
							{mereset ? "Menyetel…" : "Reset sandi"}
						</button>
					</div>
				</>
			) : (
				<p className="mt-3 text-[12px] leading-relaxed text-slate-500">
					Kecamatan ini belum punya akun. Akun kecamatan dibuat oleh superadmin.
				</p>
			)}
		</motion.article>
	);
};

const AkunKecamatanPanel = ({ params }) => {
	const [baris, setBaris] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [galat, setGalat] = useState(null);
	const [cari, setCari] = useState("");
	const [saring, setSaring] = useState("semua");

	const muat = useCallback(async () => {
		try {
			const res = await api.get("/bidang/akun-desa/kecamatan", { params });
			setBaris(res.data?.data || []);
			setGalat(null);
		} catch (error) {
			setGalat(pesanError(error, "Tidak dapat memuat akun kecamatan."));
		} finally {
			setMemuat(false);
		}
	}, [params]);

	useEffect(() => {
		muat();
	}, [muat]);

	const jumlah = useMemo(() => {
		const hasil = {};
		SARINGAN.forEach((s) => {
			hasil[s.id] = baris.filter(s.cocok).length;
		});
		return hasil;
	}, [baris]);

	const tampil = useMemo(() => {
		const aturan = SARINGAN.find((s) => s.id === saring) || SARINGAN[0];
		const q = cari.trim().toLowerCase();
		return baris.filter(
			(r) =>
				aturan.cocok(r) &&
				(!q ||
					r.kecamatan.nama.toLowerCase().includes(q) ||
					r.akun?.email?.toLowerCase().includes(q) ||
					r.akun?.name?.toLowerCase().includes(q)),
		);
	}, [baris, saring, cari]);

	if (memuat) {
		return (
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
				))}
			</div>
		);
	}

	if (galat) {
		return (
			<div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
				<FiAlertCircle className="mx-auto h-7 w-7 text-amber-500" />
				<p className="mt-2 text-sm text-amber-800">{galat}</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-start gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-[12.5px] text-indigo-900">
				<FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
				<p>
					Satu kecamatan cukup <b>satu akun</b>, dipakai bersama seluruh bidang. Di sini Anda hanya bisa{" "}
					<b>melihat sandi</b> dan <b>menyetel ulang sandi</b>. Setelah disetel ulang, kecamatan wajib
					mengganti sandinya saat login. Setiap sandi yang dilihat atau disetel ulang tercatat di log aktivitas.
				</p>
			</div>

			<div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center">
				<div className="relative min-w-0 flex-1">
					<FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
					<input
						type="text"
						value={cari}
						onChange={(e) => setCari(e.target.value)}
						placeholder="Cari kecamatan, nama, atau email…"
						className={`${KELAS_INPUT} pl-9 ${cari ? "pr-9" : ""}`}
					/>
					{cari && (
						<button
							type="button"
							onClick={() => setCari("")}
							aria-label="Hapus pencarian"
							className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
						>
							<FiX className="h-3.5 w-3.5" />
						</button>
					)}
				</div>
				<div className="flex flex-wrap gap-1.5">
					{SARINGAN.map((s) => (
						<button
							key={s.id}
							type="button"
							onClick={() => setSaring(s.id)}
							className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
								saring === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
							}`}
						>
							{s.label}
							<span className={`tabular-nums ${saring === s.id ? "text-slate-300" : "text-slate-400"}`}>
								{jumlah[s.id] ?? 0}
							</span>
						</button>
					))}
				</div>
			</div>

			{tampil.length === 0 ? (
				<p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
					Tidak ada kecamatan yang cocok.
				</p>
			) : (
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					<AnimatePresence>
						{tampil.map((r, i) => (
							<KartuKecamatan key={r.kecamatan.id} baris={r} urutan={i} params={params} onBerubah={muat} />
						))}
					</AnimatePresence>
				</div>
			)}
		</div>
	);
};

export default AkunKecamatanPanel;
