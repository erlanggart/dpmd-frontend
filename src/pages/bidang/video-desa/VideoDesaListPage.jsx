import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clapperboard, Loader2, Plus, Square, Play, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { buatPermintaan, getDaftarPermintaan, hapusPermintaan, ubahPermintaan } from "../../../api/videoDesaApi";
import { BIDANG_DRIVE } from "../drive/driveUtils";
import PanelTautan from "./PanelTautan";
import PengaturanPermintaan from "./PengaturanPermintaan";
import { LABEL_ORIENTASI, formatUkuran, formatWaktu } from "./videoDesaUtils";

const Lencana = ({ p }) => (
	<span
		className={`inline-flex flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
			p.tertutup ? "border-slate-200 bg-slate-100 text-slate-500" : "border-emerald-200 bg-emerald-50 text-emerald-700"
		}`}
	>
		{p.tertutup ? "Ditutup" : "Tampil di tautan"}
	</span>
);

const Angka = ({ nilai, label, sorot }) => (
	<div>
		<p className={`text-lg font-semibold tabular-nums ${sorot ? "text-amber-600" : "text-slate-900"}`}>{nilai}</p>
		<p className="text-[11px] leading-tight text-slate-500">{label}</p>
	</div>
);

const VideoDesaListPage = ({ bidangId }) => {
	const navigate = useNavigate();
	const infoBidang = BIDANG_DRIVE[bidangId] || { nama: `Bidang ${bidangId}` };

	const [memuat, setMemuat] = useState(true);
	const [daftar, setDaftar] = useState([]);
	const [modalBuat, setModalBuat] = useState(false);

	const muat = useCallback(async () => {
		setMemuat(true);
		try {
			const r = await getDaftarPermintaan(bidangId);
			setDaftar(r.data.data || []);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memuat kegiatan video.");
		} finally {
			setMemuat(false);
		}
	}, [bidangId]);

	useEffect(() => {
		muat();
	}, [muat]);

	const simpanBaru = async (data) => {
		try {
			const r = await buatPermintaan(bidangId, data);
			toast.success("Kegiatan dibuat dan langsung tampil di tautan Video Desa.");
			navigate(`/video-desa/${r.data.data.id}`);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal membuat kegiatan video.");
			throw e;
		}
	};

	const alihStatus = async (p) => {
		const tutup = !p.tertutup;
		try {
			// Membuka kembali juga menghapus batas waktu yang sudah lewat — kalau
			// tidak, status "dibuka" tetap tertutup oleh tanggalnya sendiri.
			await ubahPermintaan(
				p.id,
				tutup ? { status: "ditutup" } : { status: "dibuka", ...(p.tutup_pada && new Date(p.tutup_pada) < new Date() ? { tutup_pada: null } : {}) }
			);
			toast.success(tutup ? "Kegiatan ditutup dan disembunyikan dari tautan." : "Kegiatan dibuka kembali.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal mengubah status.");
		}
	};

	const hapus = async (p) => {
		const k = await Swal.fire({
			title: "Hapus kegiatan video?",
			text: p.jumlah_video
				? `"${p.judul}" beserta ${p.jumlah_video} video (${formatUkuran(p.ukuran_total)}) akan dihapus permanen dari server.`
				: `"${p.judul}" akan dihapus dari tautan Video Desa.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#e11d48",
		});
		if (!k.isConfirmed) return;
		try {
			await hapusPermintaan(p.id);
			toast.success("Kegiatan video dihapus.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menghapus.");
		}
	};

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
				<div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
					<button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900">
						<ArrowLeft className="h-4 w-4" />
						Kembali
					</button>
					<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
						<div className="flex min-w-0 items-start gap-3.5">
							<div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
								<Clapperboard className="h-5 w-5" />
								<span className="absolute -bottom-0.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-brand-500" />
							</div>
							<div className="min-w-0">
								<p className="truncate text-xs font-semibold uppercase tracking-wide text-brand-600">{infoBidang.nama}</p>
								<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Video Desa</h1>
								<p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
									Buat kegiatan video untuk videotron dan media sosial DPMD. Setiap kegiatan tampil sebagai card di tautan Video Desa;
									tiap desa mengirim satu video per kegiatan, lalu bidang memverifikasinya.
								</p>
							</div>
						</div>
						<button
							onClick={() => setModalBuat(true)}
							className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
						>
							<Plus className="h-4 w-4" />
							Kegiatan baru
						</button>
					</div>
				</div>

				<PanelTautan />

				{memuat ? (
					<div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20">
						<Loader2 className="h-6 w-6 animate-spin text-slate-900" />
					</div>
				) : daftar.length === 0 ? (
					<div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
						<div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
							<Clapperboard className="h-6 w-6 text-slate-400" />
						</div>
						<p className="text-sm font-semibold text-slate-900">Belum ada kegiatan video</p>
						<p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
							Buat kegiatan pertama — mis. "Profil Potensi Desa" untuk videotron. Kegiatan langsung tampil di tautan Video Desa.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
						{daftar.map((p) => (
							<div
								key={p.id}
								onClick={() => navigate(`/video-desa/${p.id}`)}
								className="group flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
							>
								<div className="flex items-start justify-between gap-2">
									<p className="line-clamp-2 text-sm font-semibold text-slate-900">{p.judul}</p>
									<Lencana p={p} />
								</div>
								<p className="mt-1 text-xs text-slate-500">
									{LABEL_ORIENTASI[p.orientasi]}
									{p.tutup_pada ? ` · batas ${formatWaktu(p.tutup_pada)}` : ""}
								</p>

								<div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
									<Angka nilai={p.jumlah_desa} label="desa" />
									<Angka nilai={p.diproses} label="diperiksa sistem" />
									<Angka nilai={p.menunggu} label="perlu verifikasi" sorot={p.menunggu > 0} />
									<Angka nilai={p.disetujui} label="disetujui" />
								</div>

								<div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
									<button onClick={() => alihStatus(p)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
										{p.tertutup ? <Play className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
										{p.tertutup ? "Buka lagi" : "Tutup"}
									</button>
									{p.ukuran_total > 0 && <span className="text-[11px] text-slate-400">{formatUkuran(p.ukuran_total)} di server</span>}
									<button onClick={() => hapus(p)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50" aria-label="Hapus kegiatan">
										<Trash2 className="h-3.5 w-3.5" />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<PengaturanPermintaan buka={modalBuat} awal={null} onTutup={() => setModalBuat(false)} onSimpan={simpanBaru} />
		</div>
	);
};

export default VideoDesaListPage;
