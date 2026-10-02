import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Link2, Loader2, Lock, RefreshCw, Unlock } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { buatTautanTunggal, getTautanTunggal, tautanUnggah, ubahTautanTunggal } from "../../../api/videoDesaApi";
import { salinTautanUnggah } from "./videoDesaUtils";

/**
 * Tautan tunggal Video Desa. Satu tautan untuk semua desa, berisi card semua
 * kegiatan video dari seluruh bidang. Dikelola Bidang Sekretariat; bidang lain
 * hanya bisa melihat dan menyalinnya.
 */
const PanelTautan = () => {
	const [memuat, setMemuat] = useState(true);
	const [t, setT] = useState(null);
	const [sibuk, setSibuk] = useState(false);

	const muat = useCallback(async () => {
		try {
			const r = await getTautanTunggal();
			setT(r.data.data);
		} catch {
			setT(null);
		} finally {
			setMemuat(false);
		}
	}, []);

	useEffect(() => {
		muat();
	}, [muat]);

	const jalankan = async (fn, pesan) => {
		setSibuk(true);
		try {
			const r = await fn();
			setT(r.data.data);
			if (pesan) toast.success(pesan);
			return r.data.data;
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memperbarui tautan.");
			return null;
		} finally {
			setSibuk(false);
		}
	};

	const buat = async () => {
		const d = await jalankan(buatTautanTunggal, "Tautan Video Desa dibuat.");
		if (d?.token) salinTautanUnggah(d.token);
	};

	const ganti = async () => {
		const k = await Swal.fire({
			title: "Ganti tautan?",
			text: "Tautan lama langsung berhenti bekerja. Desa harus menerima tautan yang baru. Pakai ini bila tautan tersebar ke pihak yang tidak semestinya.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Ganti tautan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#e11d48",
		});
		if (!k.isConfirmed) return;
		const d = await jalankan(buatTautanTunggal, "Tautan diganti. Bagikan tautan baru ke desa.");
		if (d?.token) salinTautanUnggah(d.token);
	};

	if (memuat) {
		return <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />;
	}
	if (!t) return null;

	const terbuka = t.ada && t.status === "dibuka";

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-sm font-semibold text-slate-900">Tautan Video Desa</p>
						{t.ada && (
							<span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${terbuka ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
								{terbuka ? "Menerima video" : "Ditutup"}
							</span>
						)}
					</div>
					<p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
						Satu tautan untuk semua desa. Isinya card semua kegiatan video yang dibuka, dari semua bidang. Desa tidak perlu
						login. Video diperiksa keamanannya oleh sistem, lalu diverifikasi bidang pemilik kegiatan.
						{!t.boleh_kelola && " Tautan ini dikelola Bidang Sekretariat."}
					</p>
					{t.ada ? (
						<p className="mt-2 truncate rounded-md bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-700">{tautanUnggah(t.token)}</p>
					) : (
						<p className="mt-2 text-xs font-medium text-amber-700">
							{t.boleh_kelola ? "Tautan belum dibuat." : "Tautan belum dibuat oleh Bidang Sekretariat."}
						</p>
					)}
				</div>

				<div className="flex flex-shrink-0 flex-wrap gap-2">
					{t.ada && (
						<>
							<button onClick={() => salinTautanUnggah(t.token)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800">
								<Link2 className="h-4 w-4" /> Salin tautan
							</button>
							<button onClick={() => window.open(tautanUnggah(t.token), "_blank")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
								<ExternalLink className="h-4 w-4" /> Lihat sebagai desa
							</button>
						</>
					)}
					{t.boleh_kelola && !t.ada && (
						<button disabled={sibuk} onClick={buat} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300">
							{sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Buat tautan
						</button>
					)}
					{t.boleh_kelola && t.ada && (
						<>
							<button
								disabled={sibuk}
								onClick={() => jalankan(() => ubahTautanTunggal(terbuka ? "ditutup" : "dibuka"), terbuka ? "Tautan ditutup." : "Tautan dibuka.")}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
							>
								{terbuka ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />} {terbuka ? "Tutup" : "Buka"}
							</button>
							<button disabled={sibuk} onClick={ganti} className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">
								<RefreshCw className="h-4 w-4" /> Ganti tautan
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default PanelTautan;
