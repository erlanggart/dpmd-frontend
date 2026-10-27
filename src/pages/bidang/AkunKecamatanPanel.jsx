// src/pages/bidang/AkunKecamatanPanel.jsx
//
// Akun kecamatan, dilihat dari halaman Akun Operator bidang.
//
// Dua jenis akun, dua aturan:
//   - Akun UTAMA: satu per kecamatan, dipakai bersama seluruh bidang. Staf
//     bidang hanya boleh melihat sandi dan menyetel ulang sandinya — tidak ada
//     tombol tambah, ubah, atau nonaktifkan. Akun baru dibuat superadmin.
//   - Akun OPERATOR kecamatan: petugas kecamatan per urusan. Staf bidang boleh
//     membuatkannya, tapi fiturnya dikunci server ke fitur bidang ini (mis. dari
//     tab Bankeu → Bantuan Keuangan + Bankeu Perubahan). Operator yang sudah ada
//     tapi belum memegang fitur ini bisa diberi akses tanpa akun baru.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import api from "../../api";
import escapeHtml from "../../utils/escapeHtml";
import {
	FiAlertCircle,
	FiCheck,
	FiChevronDown,
	FiClock,
	FiCopy,
	FiEye,
	FiEyeOff,
	FiInfo,
	FiKey,
	FiMapPin,
	FiPlus,
	FiRefreshCw,
	FiSearch,
	FiX,
} from "react-icons/fi";
import FormOperatorKecamatan from "../../components/kecamatan/FormOperatorKecamatan";
import { KartuKredensialOperator, ModalOperatorKecamatan } from "../../components/kecamatan/ModalOperatorKecamatan";
import { KECAMATAN_PERMISSIONS } from "../../constants/kecamatanPermissions";

const PEGAS = { type: "spring", stiffness: 420, damping: 32, mass: 0.8 };

// Sandi yang sedang diperlihatkan disembunyikan lagi sendiri: layar staf
// sering terlihat orang lain, dan sandi tidak perlu terpampang lebih lama dari
// waktu untuk membacakan atau menyalinnya.
const LAMA_TAMPIL_SANDI = 30000;

const KELAS_INPUT =
	"w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 transition-shadow placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5";

const pesanError = (error, cadangan) =>
	error?.response?.data?.message || error?.message || cadangan;

const labelFitur = (key) => KECAMATAN_PERMISSIONS.find((p) => p.key === key)?.label || key;

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

/** Operator yang memegang fitur bidang ini — yang bisa diurus dari sini. */
const operatorBidang = (r) => (r.operator || []).filter((o) => o.pegang_fitur_bidang);

/**
 * Lihat & setel ulang sandi satu akun (utama maupun operator). Sandi diambil
 * dari server hanya saat diminta, dan tersembunyi lagi setelah 30 detik.
 */
const KendaliSandi = ({ akun, kecamatan, params, onBerubah, operator = false }) => {
	const [sandi, setSandi] = useState(null);
	const [memuat, setMemuat] = useState(false);
	const [mereset, setMereset] = useState(false);

	useEffect(() => {
		if (!sandi) return undefined;
		const t = setTimeout(() => setSandi(null), LAMA_TAMPIL_SANDI);
		return () => clearTimeout(t);
	}, [sandi]);

	const lihat = async () => {
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

	const reset = async () => {
		const ok = await Swal.fire({
			icon: "warning",
			title: "Setel ulang sandi?",
			html:
				`<div style="text-align:left;font-size:14px">` +
				`<p style="margin:0 0 8px">Sandi akun ${operator ? "operator " : ""}<b>${escapeHtml(akun.name)}</b> — Kec. ${escapeHtml(kecamatan.nama)} (${escapeHtml(akun.email)}) akan dikembalikan ke <b>sandi default</b>.</p>` +
				`<p style="margin:0 0 6px">Pemiliknya wajib mengganti sandi saat login berikutnya.</p>` +
				(operator
					? ""
					: `<p style="margin:0;color:#b45309;font-size:12.5px">Akun utama dipakai bersama seluruh bidang — kabari kecamatan setelah sandinya disetel ulang.</p>`) +
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

	return (
		<>
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
								{sandi.default && <span className="shrink-0 text-[10.5px] font-semibold text-amber-700">default</span>}
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
								Sandi yang berlaku tidak tersimpan. Setel ulang bila pemiliknya lupa sandi.
							</p>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			<div className="mt-2 grid grid-cols-2 gap-2">
				<button
					type="button"
					onClick={lihat}
					disabled={memuat}
					className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
				>
					{sandi ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
					{memuat ? "Memuat…" : sandi ? "Sembunyikan" : "Lihat sandi"}
				</button>
				<button
					type="button"
					onClick={reset}
					disabled={mereset}
					className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
				>
					<FiRefreshCw className={`h-3.5 w-3.5 ${mereset ? "animate-spin" : ""}`} />
					{mereset ? "Menyetel…" : "Reset sandi"}
				</button>
			</div>
		</>
	);
};

const StatusAkun = ({ akun }) => {
	const terakhir = waktuRelatif(akun.last_active_at);
	return (
		<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
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
				{terakhir ? `Aktif ${terakhir}` : "Belum pernah login"}
			</span>
			{!akun.is_active && (
				<span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">Nonaktif</span>
			)}
		</div>
	);
};

const KartuKecamatan = ({ baris, urutan, params, fiturBidang, onTambah, onBerubah }) => {
	const { kecamatan, akun, akun_lain: akunLain } = baris;
	const milikBidang = operatorBidang(baris);
	const lainnya = (baris.operator || []).filter((o) => !o.pegang_fitur_bidang);
	const [lainTerbuka, setLainTerbuka] = useState(false);
	const [memberi, setMemberi] = useState(null);
	const punyaFitur = fiturBidang.length > 0;
	const namaFitur = fiturBidang.map(labelFitur).join(" & ");

	const beriAkses = async (o) => {
		const ok = await Swal.fire({
			icon: "question",
			title: "Beri akses?",
			html: `Operator <b>${escapeHtml(o.name)}</b> akan mendapat akses <b>${escapeHtml(namaFitur)}</b>. Fitur lain miliknya tidak berubah.`,
			showCancelButton: true,
			confirmButtonText: "Beri akses",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0f172a",
		});
		if (!ok.isConfirmed) return;
		setMemberi(o.id);
		try {
			await api.post(`/bidang/akun-desa/kecamatan/operator/${o.id}/beri-akses`, {}, { params });
			toast.success(`Akses ${namaFitur} diberikan`);
			onBerubah?.();
		} catch (error) {
			toast.error(pesanError(error, "Gagal memberi akses"));
		} finally {
			setMemberi(null);
		}
	};

	return (
		<motion.article
			layout="position"
			initial={{ opacity: 0, y: 16, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1, transition: { ...PEGAS, delay: Math.min(urutan, 12) * 0.035 } }}
			exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
			className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4"
		>
			<div className="flex items-center gap-2.5">
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
					<FiMapPin className="h-[18px] w-[18px]" />
				</span>
				<h3 className="min-w-0 truncate text-[15px] font-semibold leading-tight text-slate-900">Kec. {kecamatan.nama}</h3>
			</div>

			{/* ── Akun utama ── */}
			<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
				<p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Akun utama</p>
				{akun ? (
					<>
						<div className="mt-1 flex items-center gap-2">
							<span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-700" title={akun.email}>
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
						<StatusAkun akun={akun} />
						{akunLain > 0 && (
							<p className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11.5px] text-rose-700">
								<FiAlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
								Ada {akunLain} akun utama lain untuk wilayah ini. Seharusnya cukup satu — minta superadmin merapikannya.
							</p>
						)}
						<KendaliSandi akun={akun} kecamatan={kecamatan} params={params} onBerubah={onBerubah} />
					</>
				) : (
					<p className="mt-1 text-[12px] text-slate-500">Belum ada akun utama. Akun utama dibuat oleh superadmin.</p>
				)}
			</div>

			{/* ── Operator kecamatan ── */}
			{punyaFitur && (
				<div className="mt-3">
					<p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Operator {namaFitur}</p>
					{milikBidang.length === 0 ? (
						<p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[12px] text-amber-800">
							<FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
							Belum ada operator untuk fitur ini.
						</p>
					) : (
						<ul className="mt-1.5 space-y-2">
							{milikBidang.map((o) => (
								<li key={o.id} className="rounded-xl border border-slate-200 p-3">
									<p className="truncate text-[13px] font-semibold text-slate-800">
										{o.name}
										{o.jabatan && <span className="font-normal text-slate-400"> · {o.jabatan}</span>}
									</p>
									<p className="truncate text-[12px] text-slate-500">{o.email}</p>
									<StatusAkun akun={o} />
									<KendaliSandi akun={o} kecamatan={kecamatan} params={params} onBerubah={onBerubah} operator />
								</li>
							))}
						</ul>
					)}

					{lainnya.length > 0 && (
						<div className="mt-2">
							<button
								type="button"
								onClick={() => setLainTerbuka((v) => !v)}
								className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
							>
								<FiChevronDown className={`h-3.5 w-3.5 transition-transform ${lainTerbuka ? "rotate-180" : ""}`} />
								{lainnya.length} operator lain di kecamatan ini
							</button>
							{lainTerbuka && (
								<ul className="mt-1.5 space-y-1.5">
									{lainnya.map((o) => (
										<li key={o.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
											<div className="min-w-0 flex-1">
												<p className="truncate text-[12.5px] font-semibold text-slate-700">{o.name}</p>
												<p className="truncate text-[11px] text-slate-500">
													{o.permissions.map(labelFitur).join(", ") || "Tanpa fitur"}
												</p>
											</div>
											<button
												type="button"
												onClick={() => beriAkses(o)}
												disabled={memberi === o.id}
												className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
											>
												{memberi === o.id ? "…" : "Beri akses"}
											</button>
										</li>
									))}
								</ul>
							)}
						</div>
					)}

					<button
						type="button"
						onClick={() => onTambah(baris)}
						className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12.5px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
					>
						<FiPlus className="h-3.5 w-3.5" />
						Tambah operator {namaFitur}
					</button>
				</div>
			)}
		</motion.article>
	);
};

const AkunKecamatanPanel = ({ params, onRingkasan }) => {
	const [baris, setBaris] = useState([]);
	const [fiturBidang, setFiturBidang] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [galat, setGalat] = useState(null);
	const [cari, setCari] = useState("");
	const [saring, setSaring] = useState("semua");
	const [modal, setModal] = useState(null); // { kecamatan } | { hasil: { email, sandi } }
	const [menyimpan, setMenyimpan] = useState(false);

	const muat = useCallback(async () => {
		try {
			const res = await api.get("/bidang/akun-desa/kecamatan", { params });
			const data = res.data?.data || [];
			const fitur = res.data?.meta?.fitur_kecamatan || [];
			setBaris(data);
			setFiturBidang(fitur);
			// Untuk kepala halaman induk: jumlah operator urusan bidang ini & fiturnya.
			onRingkasan?.({ operator: data.reduce((n, r) => n + operatorBidang(r).length, 0), fitur });
			setGalat(null);
		} catch (error) {
			setGalat(pesanError(error, "Tidak dapat memuat akun kecamatan."));
		} finally {
			setMemuat(false);
		}
	}, [params, onRingkasan]);

	useEffect(() => {
		muat();
	}, [muat]);

	const punyaFitur = fiturBidang.length > 0;
	const namaFitur = fiturBidang.map(labelFitur).join(" & ");

	const saringan = useMemo(
		() => [
			{ id: "semua", label: "Semua", cocok: () => true },
			punyaFitur && { id: "tanpa-operator", label: "Belum ada operator", cocok: (r) => operatorBidang(r).length === 0 },
			{ id: "default", label: "Sandi default", cocok: (r) => r.akun?.sandi_default || operatorBidang(r).some((o) => o.sandi_default) },
			{ id: "tanpa-akun", label: "Belum ada akun utama", cocok: (r) => !r.akun },
		].filter(Boolean),
		[punyaFitur],
	);

	const jumlah = useMemo(() => {
		const hasil = {};
		saringan.forEach((s) => {
			hasil[s.id] = baris.filter(s.cocok).length;
		});
		return hasil;
	}, [baris, saringan]);

	const tampil = useMemo(() => {
		const aturan = saringan.find((s) => s.id === saring) || saringan[0];
		const q = cari.trim().toLowerCase();
		return baris.filter(
			(r) =>
				aturan.cocok(r) &&
				(!q ||
					r.kecamatan.nama.toLowerCase().includes(q) ||
					r.akun?.email?.toLowerCase().includes(q) ||
					(r.operator || []).some((o) => o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q))),
		);
	}, [baris, saring, saringan, cari]);

	const buatOperator = async (payload) => {
		setMenyimpan(true);
		try {
			await api.post(`/bidang/akun-desa/kecamatan/${modal.kecamatan.id}/operator`, payload, { params });
			setModal({ hasil: { email: payload.email.toLowerCase(), sandi: payload.password } });
			muat();
		} catch (error) {
			Swal.fire({ icon: "error", title: "Gagal membuat akun", text: pesanError(error, "Terjadi kesalahan.") });
		} finally {
			setMenyimpan(false);
		}
	};

	if (memuat) {
		return (
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
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
				<div className="space-y-1">
					<p>
						<b>Akun utama</b> cukup satu per kecamatan dan dipakai bersama seluruh bidang — di sini hanya bisa{" "}
						<b>dilihat sandinya</b> atau <b>disetel ulang</b>.
					</p>
					{punyaFitur ? (
						<p>
							<b>Operator kecamatan</b> adalah petugas per urusan. Operator yang Anda buat di sini hanya mendapat
							fitur <b>{namaFitur}</b> (ditambah Pesan). Kecamatan juga bisa membuat operatornya sendiri.
						</p>
					) : (
						<p>Fitur ini tidak ada di halaman kecamatan, jadi tidak perlu operator kecamatan.</p>
					)}
					<p className="text-indigo-700/80">Setiap sandi yang dilihat atau disetel ulang tercatat di log aktivitas.</p>
				</div>
			</div>

			<div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center">
				<div className="relative min-w-0 flex-1">
					<FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
					<input
						type="text"
						value={cari}
						onChange={(e) => setCari(e.target.value)}
						placeholder="Cari kecamatan, nama operator, atau email…"
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
					{saringan.map((s) => (
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
				<div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
					<AnimatePresence>
						{tampil.map((r, i) => (
							<KartuKecamatan
								key={r.kecamatan.id}
								baris={r}
								urutan={i}
								params={params}
								fiturBidang={fiturBidang}
								onTambah={(b) => setModal({ kecamatan: b.kecamatan })}
								onBerubah={muat}
							/>
						))}
					</AnimatePresence>
				</div>
			)}

			{modal && (
				<ModalOperatorKecamatan
					judul={modal.hasil ? "Akun operator dibuat" : `Tambah operator — Kec. ${modal.kecamatan.nama}`}
					keterangan={modal.hasil ? null : `Operator ini hanya bisa membuka ${namaFitur} dan Pesan di halaman kecamatan.`}
					onTutup={modal.hasil ? null : () => setModal(null)}
				>
					{modal.hasil ? (
						<KartuKredensialOperator email={modal.hasil.email} sandi={modal.hasil.sandi} onSelesai={() => setModal(null)} />
					) : (
						<FormOperatorKecamatan
							fiturTerkunci={[...fiturBidang, "pesan"]}
							onSimpan={buatOperator}
							onBatal={() => setModal(null)}
							menyimpan={menyimpan}
							labelSimpan="Buat akun operator"
						/>
					)}
				</ModalOperatorKecamatan>
			)}
		</div>
	);
};

export default AkunKecamatanPanel;
