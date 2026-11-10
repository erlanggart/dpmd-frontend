import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Camera, Loader2, Lock } from "lucide-react";
import { useCctvAlerts } from "../../../hooks/useCctvAlerts";
import { bolehBuka, useAksesCctv } from "../../../hooks/useAksesCctv";

/**
 * Cangkang halaman Smart CCTV: judul + <Outlet/>.
 *
 * Dipakai di dua induk rute (/dpmd/cctv dan /superadmin/cctv) sehingga seluruh
 * staf melihat tampilan yang sama; yang membedakan hanya layout di luarnya.
 *
 * Navigasi fitur (Live, Peringatan, Riwayat, …) kini menempel di SIDEBAR kiri
 * ala dashboard Laravel — di desktop tab bar atas sengaja dihapus. Pada layar
 * sempit (tanpa sidebar) tetap ada strip menu horizontal kompak di bawah judul.
 */

const TABS = [
	{ ke: "/cctv", label: "Live" },
	{ ke: "/cctv/peringatan", label: "Peringatan" },
	{ ke: "/cctv/riwayat", label: "Riwayat" },
	{ ke: "/cctv/kamera", label: "Kamera" },
	{ ke: "/cctv/wajah", label: "Wajah" },
	{ ke: "/cctv/playback", label: "Playback" },
	{ ke: "/cctv/analitik", label: "Analitik" },
	{ ke: "/cctv/akses", label: "Akses" },
];
const bagianDari = (ke) => ke.replace("/cctv", "").replace(/^\//, "");

const NAMA_IZIN = { lihat: "Lihat (live & playback)", peringatan: "Peringatan & riwayat", kamera: "Kelola kamera", wajah: "Data wajah" };

/** Pengganti halaman yang tidak diizinkan. */
const TanpaAkses = ({ akses }) => (
	<div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
		<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
			<Lock className="h-5 w-5" />
		</div>
		<h2 className="mt-4 text-base font-semibold text-slate-900">{akses?.izin?.length ? "Bagian ini belum dibuka untuk Anda" : "Anda belum diberi akses Smart CCTV"}</h2>
		<p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-500">
			Akses Smart CCTV diatur oleh superadmin per pengguna. Hubungi superadmin bila Anda memerlukan bagian ini.
		</p>
		{akses?.izin?.length > 0 && (
			<p className="mt-4 text-xs text-slate-500">
				Akses Anda saat ini: <span className="font-medium text-slate-700">{akses.izin.map((i) => NAMA_IZIN[i] || i).join(" · ")}</span>
			</p>
		)}
	</div>
);

const CctvShell = ({ dasar = "/dpmd" }) => {
	const { jumlahBelumDibaca, tersambung } = useCctvAlerts();
	const { akses, memuat } = useAksesCctv();
	const lokasi = useLocation();
	const bagian = lokasi.pathname.replace(new RegExp(`^${dasar}/cctv/?`), "").split("/")[0];
	const tabs = TABS.filter((t) => bolehBuka(akses, bagianDari(t.ke)));

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-[1920px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
				<div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
					<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
						<div className="flex min-w-0 items-start gap-3.5">
							<div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
								<Camera className="h-5 w-5" />
								<span className="absolute -bottom-0.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-brand-500" />
							</div>
							<div className="min-w-0">
								<p className="truncate text-xs font-semibold uppercase tracking-wide text-brand-600">
									Pengawasan Terpadu
								</p>
								<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Smart CCTV</h1>
								<p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
									Pantau kamera langsung, terima peringatan deteksi wajah & jatuh secara langsung, telusuri riwayat,
									dan kelola perangkat dalam satu tempat.
								</p>
							</div>
						</div>
						<div className="flex flex-shrink-0 items-center gap-2 self-start rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
							<span
								className={`h-2 w-2 rounded-full ${
									tersambung ? "bg-emerald-500" : "bg-amber-500"
								}`}
							/>
							<span className="text-xs font-medium text-slate-600">
								{tersambung ? "Peringatan langsung aktif" : "Menyambung…"}
							</span>
						</div>
					</div>

					{/* Layar sempit (tanpa sidebar): strip menu horizontal kompak. */}
					<nav className="mt-5 flex gap-1 overflow-x-auto border-t border-slate-100 pt-4 lg:hidden">
						{tabs.map((tab) => (
							<NavLink
								key={tab.ke}
								to={`${dasar}${tab.ke}`}
								end={tab.ke === "/cctv"}
								className={({ isActive }) =>
									`relative inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
										isActive
											? "bg-slate-900 text-white"
											: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
									}`
								}
							>
								{tab.label}
								{tab.ke === "/cctv/peringatan" && jumlahBelumDibaca > 0 && (
									<span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
										{jumlahBelumDibaca > 99 ? "99+" : jumlahBelumDibaca}
									</span>
								)}
							</NavLink>
						))}
					</nav>
				</div>

				{memuat ? (
					<div className="flex justify-center py-16 text-slate-400">
						<Loader2 className="h-6 w-6 animate-spin" />
					</div>
				) : bolehBuka(akses, bagian) ? (
					<Outlet />
				) : (
					<TanpaAkses akses={akses} />
				)}
			</div>
		</div>
	);
};

export default CctvShell;
