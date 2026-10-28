// src/pages/kecamatan/KecamatanOperatorPage.jsx
//
// Akun utama kecamatan mengelola akun operator untuk petugasnya: siapa
// mengurus apa. Setiap verifikasi lalu tercatat atas nama petugasnya, dan
// sandi akun utama tidak perlu dibagikan.

import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { Clock, Mail, Pencil, Phone, Plus, Power, UserCog, Users } from "lucide-react";
import api from "../../api";
import escapeHtml from "../../utils/escapeHtml";
import FormOperatorKecamatan from "../../components/kecamatan/FormOperatorKecamatan";
import { KartuKredensialOperator, ModalOperatorKecamatan } from "../../components/kecamatan/ModalOperatorKecamatan";
import { KECAMATAN_PERMISSIONS } from "../../constants/kecamatanPermissions";

const pesanError = (error, cadangan) => error?.response?.data?.message || error?.message || cadangan;

const labelFitur = (key) => KECAMATAN_PERMISSIONS.find((p) => p.key === key)?.label || key;

const waktuRelatif = (iso) => {
	if (!iso) return null;
	const menit = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
	if (Number.isNaN(menit)) return null;
	if (menit < 2) return "baru saja";
	if (menit < 60) return `${menit} menit lalu`;
	const jam = Math.floor(menit / 60);
	if (jam < 24) return `${jam} jam lalu`;
	const hari = Math.floor(jam / 24);
	if (hari === 1) return "kemarin";
	if (hari < 30) return `${hari} hari lalu`;
	return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const KecamatanOperatorPage = () => {
	const [meta, setMeta] = useState(null);
	const [akun, setAkun] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [galat, setGalat] = useState(null);

	const [modal, setModal] = useState(null); // { mode: "tambah" | "ubah", akun? } | { mode: "hasil", email, sandi }
	const [menyimpan, setMenyimpan] = useState(false);

	const muat = useCallback(async () => {
		try {
			const [metaRes, akunRes] = await Promise.all([
				api.get("/kecamatan-admin/meta"),
				api.get("/kecamatan-admin/users"),
			]);
			setMeta(metaRes.data?.data || null);
			setAkun(akunRes.data?.data || []);
			setGalat(null);
		} catch (error) {
			setGalat(pesanError(error, "Tidak dapat memuat akun operator."));
		} finally {
			setMemuat(false);
		}
	}, []);

	useEffect(() => {
		muat();
	}, [muat]);

	const simpan = async (payload) => {
		setMenyimpan(true);
		try {
			if (modal?.mode === "ubah") {
				await api.put(`/kecamatan-admin/users/${modal.akun.id}`, payload);
				toast.success("Akun operator diperbarui");
				setModal(null);
			} else {
				await api.post("/kecamatan-admin/users", payload);
				setModal({ mode: "hasil", email: payload.email.toLowerCase(), sandi: payload.password });
			}
			muat();
		} catch (error) {
			Swal.fire({ icon: "error", title: "Gagal menyimpan", text: pesanError(error, "Terjadi kesalahan.") });
		} finally {
			setMenyimpan(false);
		}
	};

	const alihAktif = async (u) => {
		const jadiAktif = !u.is_active;
		const ok = await Swal.fire({
			icon: "question",
			title: jadiAktif ? "Aktifkan akun ini?" : "Nonaktifkan akun ini?",
			html: jadiAktif
				? `<b>${escapeHtml(u.name)}</b> bisa login kembali.`
				: `<b>${escapeHtml(u.name)}</b> tidak bisa login dan semua aksesnya langsung tertutup.`,
			showCancelButton: true,
			confirmButtonText: jadiAktif ? "Aktifkan" : "Nonaktifkan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0f172a",
		});
		if (!ok.isConfirmed) return;
		try {
			await api.put(`/kecamatan-admin/users/${u.id}`, { is_active: jadiAktif });
			toast.success(jadiAktif ? "Akun diaktifkan" : "Akun dinonaktifkan");
			muat();
		} catch (error) {
			toast.error(pesanError(error, "Gagal mengubah status"));
		}
	};

	if (memuat) {
		return (
			<div className="space-y-4">
				<div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
				<div className="grid gap-3 md:grid-cols-2">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="h-40 animate-pulse rounded-2xl bg-white" />
					))}
				</div>
			</div>
		);
	}

	if (galat) {
		return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800">{galat}</div>;
	}

	return (
		<div className="space-y-5">
			<header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-slate-950 px-6 py-5 text-white">
				<div className="min-w-0">
					<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
						Kecamatan {meta?.kecamatan?.nama || ""}
					</p>
					<h1 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight">
						<UserCog className="h-5 w-5 text-slate-300" />
						Akun Operator
					</h1>
					<p className="mt-1 max-w-2xl text-[13px] text-slate-400">
						Buatkan akun untuk setiap petugas yang mengurus aplikasi, lalu pilih fitur yang boleh dibukanya.
						Setiap verifikasi tercatat atas nama petugasnya, dan sandi akun ini tidak perlu dibagikan.
					</p>
				</div>
				<div className="flex items-center gap-3">
					<div className="rounded-xl bg-white/[0.07] px-4 py-2 text-center ring-1 ring-white/10">
						<div className="text-xl font-bold tabular-nums">{meta?.operator_aktif ?? 0}</div>
						<div className="text-[10.5px] uppercase tracking-wider text-slate-400">Aktif</div>
					</div>
					<button
						type="button"
						onClick={() => setModal({ mode: "tambah" })}
						disabled={akun.length >= (meta?.batas_operator || 30)}
						className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
					>
						<Plus className="h-4 w-4" />
						Tambah Operator
					</button>
				</div>
			</header>

			{akun.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
					<Users className="mx-auto h-9 w-9 text-slate-300" />
					<p className="mt-3 font-semibold text-slate-800">Belum ada akun operator</p>
					<p className="mt-1 text-sm text-slate-500">Buat satu akun untuk setiap petugas yang memakai aplikasi ini.</p>
				</div>
			) : (
				<div className="grid gap-3 md:grid-cols-2">
					{akun.map((u) => {
						const terakhir = waktuRelatif(u.last_active_at);
						return (
							<article
								key={u.id}
								className={`flex flex-col rounded-2xl border p-4 ${
									u.is_active ? "border-slate-200 bg-white" : "border-dashed border-slate-300 bg-slate-50/70"
								}`}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<h3 className="truncate text-[15px] font-semibold text-slate-900">{u.name}</h3>
										<p className="text-[12px] text-slate-500">{u.jabatan || "Bagian belum diisi"}</p>
									</div>
									{!u.is_active && (
										<span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
											Nonaktif
										</span>
									)}
								</div>

								<div className="mt-3 space-y-1 text-[12.5px] text-slate-600">
									<p className="flex items-center gap-2 truncate">
										<Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
										{u.email}
									</p>
									{u.no_hp && (
										<p className="flex items-center gap-2">
											<Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
											{u.no_hp}
										</p>
									)}
									<p className="flex items-center gap-2 text-slate-500">
										<Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
										{terakhir ? `Aktif ${terakhir}` : "Belum pernah login"}
									</p>
								</div>

								<div className="mt-3 flex flex-wrap gap-1.5">
									{u.permissions.map((k) => (
										<span key={k} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-700">
											{labelFitur(k)}
										</span>
									))}
								</div>

								<div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
									<button
										type="button"
										onClick={() => setModal({ mode: "ubah", akun: u })}
										className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
									>
										<Pencil className="h-3.5 w-3.5" />
										Ubah
									</button>
									<button
										type="button"
										onClick={() => alihAktif(u)}
										className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
									>
										<Power className="h-3.5 w-3.5" />
										{u.is_active ? "Nonaktifkan" : "Aktifkan"}
									</button>
								</div>
							</article>
						);
					})}
				</div>
			)}

			{modal && (
				<ModalOperatorKecamatan
					judul={
						modal.mode === "hasil" ? "Akun operator dibuat" : modal.mode === "ubah" ? "Ubah akun operator" : "Tambah akun operator"
					}
					onTutup={modal.mode === "hasil" ? null : () => setModal(null)}
				>
					{modal.mode === "hasil" ? (
						<KartuKredensialOperator email={modal.email} sandi={modal.sandi} onSelesai={() => setModal(null)} />
					) : (
						<FormOperatorKecamatan
							key={modal.akun?.id || "baru"}
							nilaiAwal={modal.akun || null}
							modeUbah={modal.mode === "ubah"}
							onSimpan={simpan}
							onBatal={() => setModal(null)}
							menyimpan={menyimpan}
						/>
					)}
				</ModalOperatorKecamatan>
			)}
		</div>
	);
};

export default KecamatanOperatorPage;
